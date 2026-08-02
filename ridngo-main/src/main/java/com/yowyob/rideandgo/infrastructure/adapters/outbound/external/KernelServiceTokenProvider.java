package com.yowyob.rideandgo.infrastructure.adapters.outbound.external;

import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.AuthApiClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
 * IMPORTANT : nécessite un compte Kernel dédié (username/password), membre du
 * tenant
 * RidnGo avec un rôle disposant du droit d'administrer les rôles (ex. OWNER). À
 * créer
 * côté Kernel si ce n'est pas déjà fait, puis renseigner
 * APPLICATION_KERNEL_SERVICE_USERNAME / APPLICATION_KERNEL_SERVICE_PASSWORD.
 */
@Slf4j
@Component
public class KernelServiceTokenProvider {

    private final WebClient client;
    private final String tenantId;
    private final String serviceUsername;
    private final String servicePassword;
    private final boolean configured;

    private final Mono<String> cachedToken;

    public KernelServiceTokenProvider(
            WebClient.Builder builder,
            @Value("${application.auth.url}") String authUrl,
            @Value("${application.kernel.client-id}") String clientId,
            @Value("${application.kernel.api-key}") String apiKey,
            @Value("${application.kernel.tenant-id:}") String tenantId,
            @Value("${application.kernel.service-username:}") String serviceUsername,
            @Value("${application.kernel.service-password:}") String servicePassword) {
        this.tenantId = tenantId;
        this.serviceUsername = serviceUsername;
        this.servicePassword = servicePassword;
        this.configured = serviceUsername != null && !serviceUsername.isBlank()
                && servicePassword != null && !servicePassword.isBlank();

        this.client = builder.baseUrl(authUrl)
                .defaultHeader("X-Client-Id", clientId)
                .defaultHeader("X-Api-Key", apiKey)
                .build();

        // Cache 10 min : marge de sécurité sous la durée de vie réelle du accessToken
        // (~15 min doc Kernel).
        this.cachedToken = fetchServiceToken().cache(Duration.ofMinutes(10));

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

    private Mono<String> fetchServiceToken() {
        return client.post()
                .uri("/auth/discover-contexts")
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
                                "Le compte de service Kernel n'appartient pas au tenant RidnGo (" + tenantId + ")."));
                    }
                    return client.post()
                            .uri("/auth/select-context")
                            .bodyValue(new AuthApiClient.KernelSelectContextRequest(
                                    discover.data().selectionToken(), context.contextId()))
                            .retrieve()
                            .bodyToMono(AuthApiClient.KernelSelectContextResponse.class);
                })
                .flatMap(select -> {
                    if (select == null || select.data() == null || select.data().session() == null
                            || select.data().session().accessToken() == null) {
                        return Mono.error(new IllegalStateException("Session de service Kernel invalide."));
                    }
                    return Mono.just(select.data().session().accessToken());
                })
                .doOnError(e -> log.error("❌ Impossible d'obtenir un token de service Kernel : {}", e.getMessage()))
                .doOnSuccess(t -> log.info("✅ Token de service Kernel obtenu (compte {})", serviceUsername));
    }
}