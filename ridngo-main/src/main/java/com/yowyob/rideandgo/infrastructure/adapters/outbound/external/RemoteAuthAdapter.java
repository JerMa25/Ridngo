package com.yowyob.rideandgo.infrastructure.adapters.outbound.external;

import com.yowyob.rideandgo.domain.exception.AuthenticationFailedException;
import com.yowyob.rideandgo.domain.exception.UserAlreadyExistsException;
import com.yowyob.rideandgo.domain.model.User;
import com.yowyob.rideandgo.domain.model.enums.RoleType;
import com.yowyob.rideandgo.domain.ports.out.AuthPort;
import com.yowyob.rideandgo.domain.ports.out.CacheInvalidationPort;
import com.yowyob.rideandgo.domain.ports.out.UserRepositoryPort;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.AuthApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RequiredArgsConstructor
public class RemoteAuthAdapter implements AuthPort {

    private final AuthApiClient client;
    private final UserRepositoryPort userRepositoryPort;
    private final CacheInvalidationPort cacheInvalidationPort;

    @Override
    public Mono<AuthResponse> login(String principal, String password) {
        log.info("🌐 KERNEL AUTH : Login pour {}", principal);
        return doLoginFlow(principal, password);
    }

    private Mono<AuthResponse> doLoginFlow(String principal, String password) {
        return client.discoverContexts(new AuthApiClient.KernelDiscoverContextsRequest(principal, password))
                .flatMap(discoverResponse -> {
                    if (discoverResponse == null || !discoverResponse.success() || discoverResponse.data() == null 
                            || discoverResponse.data().contexts() == null || discoverResponse.data().contexts().isEmpty()) {
                        return Mono.error(new AuthenticationFailedException("Aucun contexte (tenant) disponible pour cet utilisateur."));
                    }
                    AuthApiClient.KernelLoginContext context = discoverResponse.data().contexts().get(0);
                    return client.selectContext(new AuthApiClient.KernelSelectContextRequest(
                            discoverResponse.data().selectionToken(),
                            context.contextId()
                    ));
                })
                .doOnSuccess(selectResponse -> {
                    if (selectResponse != null && selectResponse.data() != null && selectResponse.data().session() != null) {
                        String userId = selectResponse.data().session().id();
                        if (userId != null) {
                            cacheInvalidationPort.invalidateUserCache(UUID.fromString(userId)).subscribe();
                        }
                    }
                })
                .map(this::mapSelectResponseToDomain)
                .onErrorResume(WebClientResponseException.class, ex -> {
                    if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                        return Mono.error(new AuthenticationFailedException("Identifiant ou mot de passe incorrect."));
                    }
                    log.error("❌ Login flow failed: {} — {}", ex.getStatusCode(), ex.getResponseBodyAsString());
                    return Mono.error(new RuntimeException("Erreur d'authentification distante"));
                });
    }

    private AuthResponse mapSelectResponseToDomain(AuthApiClient.KernelSelectContextResponse res) {
        if (res == null || res.data() == null || res.data().session() == null) {
            throw new RuntimeException("Réponse de session Kernel invalide");
        }
        AuthApiClient.KernelSession session = res.data().session();

        UUID userId = (session.id() != null) ? UUID.fromString(session.id()) : UUID.randomUUID();

        String username = (session.username() != null) ? session.username()
                : (session.email() != null) ? session.email() : "unknown";

        List<String> filteredRoles = (session.authorities() != null)
                ? session.authorities().stream()
                        .filter(roleStr -> {
                            try {
                                RoleType.valueOf(roleStr);
                                return true;
                            } catch (Exception e) {
                                return false;
                            }
                        })
                        .collect(Collectors.toList())
                : Collections.emptyList();

        List<String> permissions = (session.authorities() != null)
                ? session.authorities() : Collections.emptyList();

        return new AuthResponse(userId, session.accessToken(), session.refreshToken(), username, filteredRoles, permissions);
    }

    /**
     * Inscription via Kernel Core :
     * 1. POST /api/auth/sign-up (JSON pur — pas de multipart)
     * 2. Si le Kernel retourne EMAIL_VERIFICATION_REQUIRED, on tente un login
     *    immédiat pour récupérer les tokens (cas sans vérification stricte).
     * Note : la photo est uploadée séparément via POST /api/files après inscription.
     */
    @Override
    public Mono<AuthResponse> register(String username, String email, String password, String phone,
            String firstName, String lastName, List<RoleType> roles, FilePart photo) {

        log.info("🌐 KERNEL AUTH : Sign-up pour {} (photo ignorée — upload séparé via /api/files)", email);

        AuthApiClient.KernelSignUpRequest signUpRequest = new AuthApiClient.KernelSignUpRequest(
                email, password, firstName, lastName, phone);

        return client.signUp(signUpRequest)
                .flatMap(signUpResponse -> {
                    log.info("✅ Sign-up Kernel réponse status: {}", signUpResponse.status());

                    // Après sign-up, on effectue un login pour obtenir les tokens
                    return doLoginFlow(email, password)
                            .flatMap(authResponse -> {
                                // Persistance locale
                                if (authResponse.userId() != null) {
                                    User localUser = User.builder()
                                            .id(authResponse.userId())
                                            .name(authResponse.username() != null ? authResponse.username() : email)
                                            .firstName(firstName)
                                            .lastName(lastName)
                                            .email(email)
                                            .telephone(phone)
                                            .roles(Collections.emptySet())
                                            .directPermissions(Collections.emptySet())
                                            .build();
                                    return userRepositoryPort.save(localUser)
                                            .doOnSuccess(u -> log.info("✅ User synced locally: {}", u.id()))
                                            .thenReturn(authResponse);
                                }
                                return Mono.just(authResponse);
                            });
                })
                .onErrorResume(WebClientResponseException.class, ex -> {
                    log.error("❌ Sign-up Failed (Kernel): {} — {}", ex.getStatusCode(), ex.getResponseBodyAsString());
                    if (ex.getStatusCode() == HttpStatus.CONFLICT) {
                        return Mono.error(new UserAlreadyExistsException("L'utilisateur existe déjà."));
                    }
                    return Mono.error(new RuntimeException("Erreur inscription : " + ex.getResponseBodyAsString()));
                });
    }

    @Override
    public Mono<AuthResponse> refreshToken(String refreshToken) {
        log.info("🌐 KERNEL AUTH : Refresh token");
        return client.refresh(new AuthApiClient.KernelRefreshRequest(refreshToken))
                .doOnSuccess(response -> {
                    if (response != null && response.user() != null && response.user().id() != null) {
                        cacheInvalidationPort.invalidateUserCache(UUID.fromString(response.user().id())).subscribe();
                    }
                })
                .map(this::mapAuthResponseToDomain)
                .onErrorResume(WebClientResponseException.class, ex -> {
                    log.error("❌ Refresh failed: {}", ex.getStatusCode());
                    return Mono.error(new AuthenticationFailedException("Session expirée. Veuillez vous reconnecter."));
                });
    }

    @Override
    public Mono<Void> forgotPassword(String email) {
        // Non documenté dans le Kernel Core pour l'instant
        log.warn("⚠️ forgotPassword non implémenté pour Kernel Core — no-op");
        return Mono.empty();
    }

    // ── Mapper ─────────────────────────────────────────────────────────────────

    private AuthResponse mapAuthResponseToDomain(AuthApiClient.KernelAuthResponse res) {
        AuthApiClient.KernelUserDetail user = res.user();

        UUID userId = (user != null && user.id() != null)
                ? UUID.fromString(user.id()) : UUID.randomUUID();

        String username = (user != null && user.username() != null) ? user.username()
                : (user != null && user.email() != null) ? user.email() : "unknown";

        List<String> filteredRoles = (user != null && user.roles() != null)
                ? user.roles().stream()
                        .filter(roleStr -> {
                            try {
                                RoleType.valueOf(roleStr);
                                return true;
                            } catch (Exception e) {
                                return false;
                            }
                        })
                        .collect(Collectors.toList())
                : Collections.emptyList();

        List<String> permissions = (user != null && user.permissions() != null)
                ? user.permissions() : Collections.emptyList();

        return new AuthResponse(userId, res.accessToken(), res.refreshToken(), username, filteredRoles, permissions);
    }
}