package com.yowyob.rideandgo.infrastructure.adapters.outbound.external;

import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.AuthApiClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * Fournit un token Bearer "de service" (compte technique admin/owner du tenant
 * RidnGo),
 * utilisé pour les appels Kernel qui nécessitent une autorisation mais qui ont
 * lieu en
 * dehors de toute session utilisateur authentifiée côté RidnGo — typiquement
 * POST /api/administration/users/{userId}/roles pendant l'inscription, où
 * l'utilisateur
 * qui vient de s'inscrire n'a pas encore de token.
 *
 * Utilise son propre WebClient (indépendant du bean AuthApiClient) pour éviter
 * toute
 * dépendance circulaire avec WebClientConfig, qui référence ce composant dans
 * son filtre
 * addBearerToken().
 *
 * MFA : les comptes business du Kernel ont tous le second facteur. Le code n'est
 * donc saisi qu'UNE fois (startMfaSession puis confirmMfa, exposés par
 * AuthController) ; la session est ensuite prolongée par le refreshToken Kernel,
 * conservé dans Redis, sans nouveau code tant qu'il reste valide.
 */
@Slf4j
@Component
public class KernelServiceTokenProvider {

    private static final String REFRESH_KEY = "kernel-service:refresh-token";
    private static final String MFA_KEY = "kernel-service:mfa-token";
    // La durée réelle est fixée par le Kernel ; cette borne évite seulement une clé orpheline.
    private static final Duration REFRESH_TTL = Duration.ofDays(30);
    private static final Duration MFA_TTL = Duration.ofMinutes(5);

    private final WebClient client;
    private final ReactiveRedisTemplate<String, Object> redis;
    private final String tenantId;
    private final String serviceUsername;
    private final String servicePassword;
    private final boolean configured;

    private volatile Mono<String> cachedToken;

    public KernelServiceTokenProvider(
            WebClient.Builder builder,
            ReactiveRedisTemplate<String, Object> redis,
            @Value("${application.auth.url}") String authUrl,
            @Value("${application.kernel.client-id}") String clientId,
            @Value("${application.kernel.api-key}") String apiKey,
            @Value("${application.kernel.tenant-id:}") String tenantId,
            @Value("${application.kernel.service-username:}") String serviceUsername,
            @Value("${application.kernel.service-password:}") String servicePassword) {
        this.redis = redis;
        this.tenantId = tenantId;
        this.serviceUsername = serviceUsername;
        this.servicePassword = servicePassword;
        this.configured = serviceUsername != null && !serviceUsername.isBlank()
                && servicePassword != null && !servicePassword.isBlank();

        WebClient.Builder b = builder.clone().baseUrl(authUrl)
                .defaultHeader("X-Client-Id", clientId)
                .defaultHeader("X-Api-Key", apiKey);
        if (tenantId != null && !tenantId.isBlank()) {
            b.defaultHeader("X-Tenant-Id", tenantId);
        }
        this.client = b.build();

        resetCache();

        if (!configured) {
            log.warn("⚠️ APPLICATION_KERNEL_SERVICE_USERNAME/PASSWORD non configurés — les appels "
                    + "d'administration Kernel (assignRole, getRoles...) échoueront pour toute requête "
                    + "anonyme (ex. inscription) tant qu'un compte de service n'est pas renseigné.");
        }
    }

    /**
     * Token Bearer du compte de service, mis en cache. Empty si le compte de
     * service n'est pas configuré.
     */
    public Mono<String> getServiceToken() {
        if (!configured) {
            return Mono.empty();
        }
        return cachedToken;
    }

    /** Vérifie le mot de passe du compte de service (garde des endpoints d'activation MFA). */
    public boolean isServicePassword(String candidate) {
        return configured && candidate != null && java.security.MessageDigest.isEqual(
                candidate.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                servicePassword.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    /** Lance une connexion du compte de service : si le Kernel exige le MFA, il envoie le code par email. */
    public Mono<String> startMfaSession() {
        return redis.delete(REFRESH_KEY).then(login())
                .map(t -> "Session de service active (pas de MFA demandé).")
                .doFinally(s -> resetCache());
    }

    /** Termine la connexion MFA avec le code reçu ; le refreshToken obtenu prolonge ensuite la session. */
    public Mono<String> confirmMfa(String code) {
        return redis.opsForValue().get(MFA_KEY).cast(String.class)
                .switchIfEmpty(Mono.error(new IllegalStateException(
                        "Aucune demande de code en cours (ou expirée) : relancez POST /api/v1/auth/service-session.")))
                .flatMap(mfaToken -> client.post()
                        .uri("/api/auth/login/mfa/confirm")
                        .bodyValue(new AuthApiClient.KernelConfirmMfaRequest(mfaToken, code.trim()))
                        .retrieve()
                        .bodyToMono(AuthApiClient.KernelRefreshEnvelope.class))
                .flatMap(this::storeSession)
                .flatMap(token -> redis.delete(MFA_KEY).thenReturn("Session de service active."))
                .doOnSuccess(t -> {
                    log.info("✅ MFA du compte de service {} confirmé — session prolongée par refresh", serviceUsername);
                    resetCache();
                });
    }

    private void resetCache() {
        // Les erreurs ne sont pas mises en cache : la prochaine requête retente aussitôt.
        this.cachedToken = fetchServiceToken().cache(
                t -> Duration.ofMinutes(10), e -> Duration.ZERO, () -> Duration.ZERO);
    }

    private Mono<String> fetchServiceToken() {
        return refreshFromStore()
                // un code déjà envoyé et non saisi : ne pas relancer le login (= un email de plus par requête)
                .switchIfEmpty(Mono.defer(() -> redis.hasKey(MFA_KEY).flatMap(pending -> pending
                        ? Mono.<String>error(new IllegalStateException("Session de service en attente du code MFA : "
                                + "POST /api/v1/auth/service-session/mfa {\"code\":\"...\"}."))
                        : login())))
                .doOnError(e -> log.error("❌ Impossible d'obtenir un token de service Kernel : {}", e.getMessage()))
                .doOnSuccess(t -> log.info("✅ Token de service Kernel obtenu (compte {})", serviceUsername));
    }

    /** Empty si aucun refreshToken n'est stocké ou s'il est refusé (on retombe alors sur le login). */
    private Mono<String> refreshFromStore() {
        return redis.opsForValue().get(REFRESH_KEY).cast(String.class)
                .flatMap(refresh -> client.post()
                        .uri("/api/auth/refresh")
                        .bodyValue(new AuthApiClient.KernelRefreshRequest(refresh))
                        .retrieve()
                        .bodyToMono(AuthApiClient.KernelRefreshEnvelope.class)
                        .flatMap(this::storeSession))
                // Seul un refus explicite du Kernel invalide la session ; une coupure réseau ne doit pas
                // relancer le login (= nouveau code MFA) : l'erreur remonte et la requête suivante retente.
                .onErrorResume(org.springframework.web.reactive.function.client.WebClientResponseException.class, e -> {
                    if (!e.getStatusCode().is4xxClientError()) {
                        return Mono.error(e);
                    }
                    log.warn("⚠️ Refresh du compte de service refusé ({}) — nouvelle connexion.", e.getStatusCode());
                    return redis.delete(REFRESH_KEY).then(Mono.empty());
                });
    }

    private Mono<String> storeSession(AuthApiClient.KernelRefreshEnvelope envelope) {
        AuthApiClient.KernelSession s = envelope == null ? null : envelope.data();
        if (s == null || s.accessToken() == null) {
            return Mono.error(new IllegalStateException("Session de service Kernel invalide."));
        }
        Mono<Boolean> save = s.refreshToken() == null ? Mono.just(true)
                : redis.opsForValue().set(REFRESH_KEY, s.refreshToken(), REFRESH_TTL);
        return save.thenReturn(s.accessToken());
    }

    private Mono<String> login() {
        return client.post()
                .uri("/api/auth/discover-contexts")
                .bodyValue(new AuthApiClient.KernelDiscoverContextsRequest(serviceUsername, servicePassword))
                .retrieve()
                .bodyToMono(AuthApiClient.KernelDiscoverContextsResponse.class)
                .flatMap(discover -> {
                    if (discover == null || !discover.success() || discover.data() == null
                            || discover.data().contexts() == null || discover.data().contexts().isEmpty()) {
                        return Mono.error(new IllegalStateException(
                                "Le compte de service Kernel n'a aucun contexte disponible."));
                    }
                    AuthApiClient.KernelLoginContext context = discover.data().contexts().stream()
                            .filter(c -> tenantId.equals(c.tenantId()))
                            .findFirst()
                            .orElse(null);
                    if (context == null) {
                        return Mono.error(new IllegalStateException(
                                "Le compte de service Kernel n'appartient pas au tenant RidnGo (" + tenantId
                                        + ") — tenants accessibles : " + discover.data().contexts().stream()
                                                .map(AuthApiClient.KernelLoginContext::tenantId).toList()));
                    }
                    return client.post()
                            .uri("/api/auth/select-context")
                            .bodyValue(new AuthApiClient.KernelSelectContextRequest(
                                    discover.data().selectionToken(), context.contextId()))
                            .retrieve()
                            .bodyToMono(AuthApiClient.KernelSelectContextResponse.class);
                })
                .flatMap(select -> {
                    if (select != null && select.data() != null && "CONFIRM_MFA".equals(select.data().nextStep())) {
                        return redis.opsForValue().set(MFA_KEY, select.data().mfaToken(), MFA_TTL)
                                .then(Mono.error(new IllegalStateException("Le compte de service " + serviceUsername
                                        + " a le MFA actif : un code vient d'être envoyé ("
                                        + select.data().channel() + "). Activez la session avec "
                                        + "POST /api/v1/auth/service-session/mfa {\"code\":\"...\"}.")));
                    }
                    if (select == null || select.data() == null || select.data().session() == null
                            || select.data().session().accessToken() == null) {
                        return Mono.error(new IllegalStateException("Session de service Kernel invalide."));
                    }
                    AuthApiClient.KernelSession s = select.data().session();
                    return storeSession(new AuthApiClient.KernelRefreshEnvelope(true, s, null, null));
                });
    }
}
