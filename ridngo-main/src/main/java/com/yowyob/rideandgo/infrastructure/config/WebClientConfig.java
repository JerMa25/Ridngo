package com.yowyob.rideandgo.infrastructure.config;

import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.AuthApiClient;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.FareCalculatorClient;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.NotificationApiClient;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.PaymentApiClient;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.SyndicateApiClient;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.VehicleApiClient;

import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import java.net.URI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.support.WebClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.KernelServiceTokenProvider;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
public class WebClientConfig {

    // Sans délai, une requête Kernel sans réponse bloquait la connexion indéfiniment (vu en test réel)
    // Connexions inactives fermées avant que le Kernel ne les coupe : réutiliser une connexion déjà
    // fermée côté Kernel ("connexion ré-initialisée") bloquait la requête jusqu'au délai d'attente.
    private final HttpClient httpClient = HttpClient.create(reactor.netty.resources.ConnectionProvider.builder("kernel")
                    .maxIdleTime(java.time.Duration.ofSeconds(20))
                    .maxLifeTime(java.time.Duration.ofMinutes(5))
                    .evictInBackground(java.time.Duration.ofSeconds(30))
                    .build())
            .wiretap(true)
            .option(io.netty.channel.ChannelOption.CONNECT_TIMEOUT_MILLIS, 10_000)
            // le Kernel répond parfois en 10 s+ sur /auth/discover-contexts
            .responseTimeout(java.time.Duration.ofSeconds(60));

    /** Mêmes délais pour tous les WebClient construits depuis le WebClient.Builder de Spring. */
    @Bean
    public org.springframework.boot.web.reactive.function.client.WebClientCustomizer kernelTimeouts() {
        return builder -> builder.clientConnector(new ReactorClientHttpConnector(httpClient));
    }

    // @Lazy : évite toute dépendance circulaire au démarrage
    // (KernelServiceTokenProvider
    // construit son propre WebClient interne, indépendant des beans définis ici,
    // mais
    // n'est résolu qu'au premier appel réel du filtre, pas à la construction du
    // contexte).
    @org.springframework.beans.factory.annotation.Autowired
    @Lazy
    private KernelServiceTokenProvider kernelServiceTokenProvider;

    @Value("${application.kernel.client-id}")
    private String kernelClientId;

    @Value("${application.kernel.api-key}")
    private String kernelApiKey;

    @Value("${application.kernel.tenant-id:}")
    private String kernelTenantId;

    @Value("${application.payment.currency:XAF}")
    private String paymentCurrency;

    /**
     * Contrairement à addBearerToken() (qui utilise le token de l'utilisateur
     * connecté, avec
     * repli sur le token de service seulement si personne n'est authentifié), ce
     * filtre utilise
     * TOUJOURS le compte de service — pour les opérations gérées au niveau de
     * l'organisation,
     * pas de l'utilisateur (ex. création de ressources/véhicules :
     * "resources:write" est une
     * permission scope AGENCY qu'aucun chauffeur/passager n'a, seul le compte admin
     * l'a).
     */
    private ExchangeFilterFunction alwaysServiceToken() {
        return ExchangeFilterFunction.ofRequestProcessor(request -> kernelServiceTokenProvider.getServiceToken()
                .map(token -> ClientRequest.from(request)
                        .headers(headers -> headers.setBearerAuth(token))
                        .build())
                .switchIfEmpty(Mono.just(request)));
    }

    @Bean
    public PaymentApiClient paymentApiClient(WebClient.Builder builder,
            @Value("${application.payment.url}") String url) {
        WebClient webClient = builder
                .baseUrl(url)
                .filter(kernelAuthFilter())
                .filter(addBearerToken())
                .filter(kernelSessionExpired())
                .build();
        WebClientAdapter adapter = WebClientAdapter.create(webClient);
        return HttpServiceProxyFactory.builderFor(adapter).build().createClient(PaymentApiClient.class);
    }

    @Bean
    public FareCalculatorClient fareCalculatorClient(WebClient.Builder builder,
            @Value("${application.fare.url}") String url,
            @Value("${application.fare.api-key}") String apiKey) {

        WebClient webClient = builder
                .baseUrl(url)
                .defaultHeader("Authorization", "ApiKey " + apiKey)
                .build();

        WebClientAdapter adapter = WebClientAdapter.create(webClient);
        return HttpServiceProxyFactory.builderFor(adapter).build().createClient(FareCalculatorClient.class);
    }

    @Bean
    public AuthApiClient authApiClient(WebClient.Builder builder,
            @Value("${application.auth.url}") String url) {

        WebClient webClient = builder
                .baseUrl(url)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .filter(kernelAuthFilter())
                .filter(addBearerToken())
                .filter(logRequest())
                .build();

        WebClientAdapter adapter = WebClientAdapter.create(webClient);
        HttpServiceProxyFactory factory = HttpServiceProxyFactory.builderFor(adapter).build();
        return factory.createClient(AuthApiClient.class);
    }

    /**
     * Un 401 du Kernel sur le wallet = session Kernel de l'utilisateur expirée ou révoquée (ex. reconnexion
     * dans un autre portail Yowyob). Remonté en 401 (et non 500) pour que le front rafraîchisse la session.
     */
    private ExchangeFilterFunction kernelSessionExpired() {
        return ExchangeFilterFunction.ofResponseProcessor(response -> response.statusCode().value() == 401
                ? response.releaseBody().then(Mono.error(new com.yowyob.rideandgo.domain.exception.AuthenticationFailedException(
                        "Votre session Yowyob a expiré : reconnectez-vous.")))
                : Mono.just(response));
    }

    private ExchangeFilterFunction logRequest() {
        return (request, next) -> {
            log.info("🚀 [WebClient Outbound] {} {}", request.method(), request.url());
            request.headers().forEach((name, values) -> values.forEach(value -> {
                String maskedValue = (name.equalsIgnoreCase("Authorization") || name.equalsIgnoreCase("X-Api-Key"))
                        ? "********"
                        : value;
                log.info("   🧩 Header: {}={}", name, maskedValue);
            }));
            return next.exchange(request);
        };
    }

    @Bean
    public NotificationApiClient notificationApiClient(WebClient.Builder builder,
            @Value("${application.notification.url}") String url,
            @Value("${application.vehicle.organization-id}") String organizationId) {
        // X-Service-Token retiré : le Kernel Core utilise X-Client-Id + X-Api-Key +
        // Bearer ; sans X-Organization-Id les deliveries sont refusées (ORGANIZATION_CONTEXT_REQUIRED)
        WebClient webClient = builder
                .baseUrl(url)
                .defaultHeader("X-Organization-Id", organizationId)
                .filter(kernelAuthFilter())
                .filter(addBearerToken())
                .build();

        WebClientAdapter adapter = WebClientAdapter.create(webClient);
        return HttpServiceProxyFactory.builderFor(adapter).build().createClient(NotificationApiClient.class);
    }

    @Bean
    public SyndicateApiClient syndicateApiClient(WebClient.Builder builder,
            @Value("${application.syndicate.url}") String url) {
        WebClient webClient = builder.baseUrl(url).filter(addBearerToken()).build();
        WebClientAdapter adapter = WebClientAdapter.create(webClient);
        return HttpServiceProxyFactory.builderFor(adapter).build().createClient(SyndicateApiClient.class);
    }

    @Bean
    public VehicleApiClient vehicleApiClient(WebClient.Builder builder,
            @Value("${application.vehicle.url}") String url,
            @Value("${application.vehicle.organization-id}") String organizationId) {
        WebClient webClient = builder
                .baseUrl(url)
                .filter(kernelAuthFilter())
                .filter(alwaysServiceToken())
                .defaultHeader("X-Organization-Id", organizationId)
                .build();
        WebClientAdapter adapter = WebClientAdapter.create(webClient);
        return HttpServiceProxyFactory.builderFor(adapter).build().createClient(VehicleApiClient.class);
    }

    /**
     * Injecte les credentials d'application cliente Kernel Core sur chaque requête
     * :
     * X-Client-Id + X-Api-Key (lus depuis application.kernel.client-id / api-key).
     */
    private ExchangeFilterFunction kernelAuthFilter() {
        return (request, next) -> {
            ClientRequest.Builder requestBuilder = ClientRequest.from(request)
                    .headers(headers -> {
                        headers.set("X-Client-Id", kernelClientId);
                        headers.set("X-Api-Key", kernelApiKey);
                        // X-Tenant-Id requis pour les endpoints tenant-scoped du Kernel Core
                        if (kernelTenantId != null && !kernelTenantId.isBlank()) {
                            headers.set("X-Tenant-Id", kernelTenantId);
                        }
                    });
            return next.exchange(requestBuilder.build());
        };
    }

    private ExchangeFilterFunction addBearerToken() {
        return (request, next) -> {
            URI url = request.url();
            String path = url.getPath();

            // Pas de Bearer token sur les routes publiques d'auth
            if (path.contains("/auth/login") || path.contains("/auth/sign-up") || path.contains("/auth/refresh")
                    || path.contains("/auth/discover-contexts") || path.contains("/auth/select-context")
                    || path.contains("/auth/captcha")) {
                return next.exchange(request);
            }

            return ReactiveSecurityContextHolder.getContext()
                    .map(ctx -> ctx.getAuthentication())
                    .flatMap(auth -> {
                        Object credentials = auth.getCredentials();
                        if (credentials instanceof String token) {
                            ClientRequest newRequest = ClientRequest.from(request)
                                    .headers(headers -> headers.setBearerAuth(token))
                                    .build();
                            return next.exchange(newRequest);
                        }
                        return next.exchange(request);
                    })
                    .switchIfEmpty(Mono.defer(() -> {
                        log.warn(
                                "⚠️ [WebClient] Pas de contexte de sécurité utilisateur pour {} — tentative avec le token de service.",
                                path);
                        return kernelServiceTokenProvider.getServiceToken()
                                .map(token -> ClientRequest.from(request)
                                        .headers(headers -> headers.setBearerAuth(token))
                                        .build())
                                .switchIfEmpty(Mono.just(request))
                                .flatMap(next::exchange);
                    }));
        };
    }
}