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

import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
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
    private final String tenantId;
    private final ReactiveRedisTemplate<String, Object> redisTemplate;

    private static final String PENDING_ROLES_KEY_PREFIX = "pending-roles:";
    // Le lien de vérification email doit rester valable largement plus longtemps
    // que ça,
    // mais on borne quand même pour ne pas accumuler des clés orphelines
    // indéfiniment.
    private static final Duration PENDING_ROLES_TTL = Duration.ofDays(30);

    private static final com.fasterxml.jackson.databind.ObjectMapper SIGNUP_ERROR_MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    public Mono<AuthResponse> login(String principal, String password) {
        log.info("🌐 KERNEL AUTH : Login pour {}", principal);
        return doLoginFlow(principal, password)
                .flatMap(authResponse -> ensurePendingRoleAssigned(principal, password, authResponse));
    }

    /**
     * L'assignation de rôle échoue tant que l'email n'est pas vérifié (confirmé en
     * test réel).
     * Le rôle voulu à l'inscription est donc mémorisé dans Redis
     * (pending-roles:{username}),
     * et on tente de l'assigner ici, à chaque connexion réussie qui n'a pas encore
     * de rôle
     * RIDE_AND_GO_* — la première fois où ça marche est nécessairement la première
     * connexion
     * après vérification de l'email. Une fois assigné, on rejoue le login pour
     * renvoyer un
     * token à jour (celui qu'on vient d'obtenir a été émis AVANT l'assignation,
     * donc ne
     * contient pas encore le rôle).
     */
    private Mono<AuthResponse> ensurePendingRoleAssigned(String principal, String password, AuthResponse authResponse) {
        if (authResponse.roles() != null && !authResponse.roles().isEmpty()) {
            return Mono.just(authResponse); // déjà un rôle RIDE_AND_GO_* — rien à faire
        }

        String redisKey = PENDING_ROLES_KEY_PREFIX + authResponse.username();
        return redisTemplate.opsForValue().get(redisKey)
                .cast(List.class)
                .flatMap(pendingRoleNames -> {
                    @SuppressWarnings("unchecked")
                    List<String> roleNames = (List<String>) pendingRoleNames;
                    List<RoleType> roles = roleNames.stream()
                            .map(name -> {
                                try {
                                    return RoleType.valueOf(name);
                                } catch (Exception e) {
                                    return null;
                                }
                            })
                            .filter(java.util.Objects::nonNull)
                            .collect(Collectors.toList());

                    if (roles.isEmpty()) {
                        return Mono.just(authResponse);
                    }

                    log.info(
                            "🎯 Rôle(s) en attente trouvé(s) pour {} : {} — tentative d'assignation (email désormais vérifié).",
                            principal, roleNames);

                    return resolveRoleIds(roles)
                            .flatMap(roleIdByName -> reactor.core.publisher.Flux.fromIterable(roles)
                                    .flatMap(role -> {
                                        String kernelRoleId = roleIdByName.get(role.name());
                                        if (kernelRoleId == null) {
                                            log.error(
                                                    "❌ Rôle en attente '{}' toujours introuvable dans le catalogue Kernel.",
                                                    role.name());
                                            return Mono.empty();
                                        }
                                        return client.assignRole(authResponse.userId().toString(),
                                                new AuthApiClient.KernelAssignRoleRequest(kernelRoleId, "TENANT", null,
                                                        null));
                                    })
                                    .then())
                            .then(redisTemplate.opsForValue().delete(redisKey))
                            .then(Mono.defer(() -> {
                                log.info(
                                        "✅ Rôle(s) en attente assigné(s) pour {} — reconnexion pour rafraîchir le token.",
                                        principal);
                                return doLoginFlow(principal, password); // rejoue le login pour un token à jour
                            }))
                            .onErrorResume(e -> {
                                log.error("❌ Assignation du rôle en attente échouée pour {} : {}", principal,
                                        e.getMessage());
                                return Mono.just(authResponse); // on ne fait pas échouer le login pour autant
                            });
                })
                .switchIfEmpty(Mono.just(authResponse)); // rien en attente — compte sans rôle légitime (ex. créé hors
                                                         // app)
    }

    private Mono<AuthResponse> doLoginFlow(String principal, String password) {
        return client.discoverContexts(new AuthApiClient.KernelDiscoverContextsRequest(principal, password))
                .flatMap(discoverResponse -> {
                    if (discoverResponse == null || !discoverResponse.success() || discoverResponse.data() == null
                            || discoverResponse.data().contexts() == null
                            || discoverResponse.data().contexts().isEmpty()) {
                        return Mono.error(new AuthenticationFailedException(
                                "Aucun contexte (tenant) disponible pour cet utilisateur."));
                    }

                    // On ne prend JAMAIS le premier contexte au hasard : un compte peut appartenir
                    // à plusieurs tenants (ex. un tenant KSM personnel en plus du tenant RidnGo).
                    // On sélectionne explicitement celui qui correspond au tenant de l'application.
                    AuthApiClient.KernelLoginContext context = discoverResponse.data().contexts().stream()
                            .filter(c -> tenantId.equals(c.tenantId()))
                            .findFirst()
                            .orElse(null);

                    if (context == null) {
                        log.warn(
                                "⚠️ Aucun contexte pour le tenant RidnGo ({}) trouvé pour {} — contextes disponibles : {}",
                                tenantId, principal,
                                discoverResponse.data().contexts().stream()
                                        .map(AuthApiClient.KernelLoginContext::tenantId)
                                        .collect(Collectors.toList()));
                        return Mono.error(new AuthenticationFailedException(
                                "Ce compte n'a pas accès à l'espace RidnGo. Inscrivez-vous via l'application."));
                    }

                    return client.selectContext(new AuthApiClient.KernelSelectContextRequest(
                            discoverResponse.data().selectionToken(),
                            context.contextId()));
                })
                .doOnSuccess(selectResponse -> {
                    if (selectResponse != null && selectResponse.data() != null
                            && selectResponse.data().session() != null) {
                        String userId = selectResponse.data().session().id();
                        if (userId != null) {
                            cacheInvalidationPort.invalidateUserCache(UUID.fromString(userId)).subscribe();
                        }
                    }
                })
                .map(this::mapSelectResponseToDomain)
                .onErrorResume(WebClientResponseException.class, ex -> {
                    if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED || ex.getStatusCode() == HttpStatus.FORBIDDEN) {
                        return Mono.error(new AuthenticationFailedException(
                                "Identifiant, mot de passe incorrect, ou vérification requise."));
                    }
                    log.error("❌ Login flow failed: {} — {}", ex.getStatusCode(), ex.getResponseBodyAsString());
                    return Mono.error(new RuntimeException("Erreur d'authentification distante"));
                });
    }

    private AuthResponse mapSelectResponseToDomain(AuthApiClient.KernelSelectContextResponse res) {
        if (res == null || res.data() == null || res.data().session() == null) {
            throw new RuntimeException("Réponse de session Kernel invalide");
        }
        return mapSessionToDomain(res.data().session());
    }

    private AuthResponse mapSessionToDomain(AuthApiClient.KernelSession session) {
        UUID userId = (session.id() != null) ? UUID.fromString(session.id()) : UUID.randomUUID();

        String username = (session.username() != null) ? session.username()
                : (session.email() != null) ? session.email() : "unknown";

        // Le Kernel préfixe les rôles avec "ROLE_" et ajoute un suffixe "#SCOPE"
        // (ex. "ROLE_RIDE_AND_GO_DRIVER", "ROLE_RIDE_AND_GO_DRIVER#TENANT") — confirmé
        // sur un vrai JWT. On déduplique après normalisation (le rôle apparaît en
        // double,
        // scopé et non-scopé).
        List<String> filteredRoles = (session.authorities() != null)
                ? session.authorities().stream()
                        .map(RemoteAuthAdapter::normalizeRoleAuthority)
                        .filter(roleStr -> {
                            try {
                                RoleType.valueOf(roleStr);
                                return true;
                            } catch (Exception e) {
                                return false;
                            }
                        })
                        .distinct()
                        .collect(Collectors.toList())
                : Collections.emptyList();

        List<String> permissions = (session.authorities() != null)
                ? session.authorities()
                : Collections.emptyList();

        return new AuthResponse(userId, session.accessToken(), session.refreshToken(), username, filteredRoles,
                permissions);
    }

    /**
     * Retire le préfixe "ROLE_" et le suffixe "#SCOPE" (ex.
     * "ROLE_RIDE_AND_GO_DRIVER#TENANT" -&gt; "RIDE_AND_GO_DRIVER").
     */
    private static String normalizeRoleAuthority(String authority) {
        if (authority == null)
            return null;
        String normalized = authority;
        int hashIdx = normalized.indexOf('#');
        if (hashIdx >= 0) {
            normalized = normalized.substring(0, hashIdx);
        }
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring("ROLE_".length());
        }
        return normalized;
    }

    /**
     * Résout les RoleType applicatifs (ex. RIDE_AND_GO_DRIVER) vers leur UUID réel
     * dans le catalogue Kernel du tenant, en matchant sur le champ `code` (fallback
     * `name`).
     * Retourne une Map<RoleType.name(), kernelRoleId>. Un rôle non trouvé dans le
     * catalogue
     * est simplement absent de la map (log + skip côté appelant) — le catalogue
     * Kernel doit
     * être provisionné au préalable via POST /api/administration/roles.
     */
    private Mono<java.util.Map<String, String>> resolveRoleIds(List<RoleType> roles) {
        return client.getRoles()
                .map(envelope -> {
                    java.util.Map<String, String> result = new java.util.HashMap<>();
                    if (envelope == null || envelope.data() == null) {
                        return result;
                    }
                    for (RoleType role : roles) {
                        envelope.data().stream()
                                .filter(r -> role.name().equalsIgnoreCase(r.code())
                                        || role.name().equalsIgnoreCase(r.name()))
                                .findFirst()
                                .ifPresent(r -> result.put(role.name(), r.id()));
                    }
                    return result;
                })
                .onErrorResume(WebClientResponseException.class, ex -> {
                    log.error("❌ Impossible de récupérer le catalogue de rôles Kernel : {} — {}",
                            ex.getStatusCode(), ex.getResponseBodyAsString());
                    return Mono.just(java.util.Collections.emptyMap());
                });
    }

    /**
     * Inscription via Kernel Core :
     * 1. POST /api/auth/sign-up (JSON pur — pas de multipart)
     * 2. Si le Kernel retourne EMAIL_VERIFICATION_REQUIRED, on tente un login
     * immédiat pour récupérer les tokens (cas sans vérification stricte).
     * Note : la photo est uploadée séparément via POST /api/files après
     * inscription.
     */
    @Override
    public Mono<AuthResponse> register(String username, String email, String password, String phone,
            String firstName, String lastName, List<RoleType> roles, FilePart photo) {

        log.info("🌐 KERNEL AUTH : Sign-up pour {} (photo ignorée — upload séparé via /api/files)", email);

        AuthApiClient.KernelSignUpRequest signUpRequest = new AuthApiClient.KernelSignUpRequest(
                this.tenantId, username, email, password, firstName, lastName, phone);

        return client.signUp(signUpRequest)
                .flatMap(signUpResponse -> {
                    log.info("✅ Sign-up Kernel réponse status: {}", signUpResponse.status());

                    List<String> roleNames = roles.stream().map(Enum::name).collect(Collectors.toList());
                    String pendingKey = PENDING_ROLES_KEY_PREFIX + username;

                    // Mémorisation systématique du rôle voulu — l'assignation immédiate ci-dessous
                    // échoue tant que l'email n'est pas vérifié (confirmé en test réel) ; c'est ce
                    // qui permet à login() de la retenter automatiquement à la première connexion
                    // réussie, une fois l'email vérifié.
                    return redisTemplate.opsForValue().set(pendingKey, roleNames, PENDING_ROLES_TTL)
                            .then(Mono.defer(() -> continueRegisterAfterSignUp(username, email, password, phone,
                                    firstName, lastName, roles)));
                })
                .onErrorResume(WebClientResponseException.class, ex -> {
                    String body = ex.getResponseBodyAsString();
                    log.error("❌ Sign-up Failed (Kernel): {} — {}", ex.getStatusCode(), body);

                    String errorCode = null;
                    String kernelMessage = null;
                    try {
                        com.fasterxml.jackson.databind.JsonNode node = SIGNUP_ERROR_MAPPER.readTree(body);
                        errorCode = node.hasNonNull("errorCode") ? node.get("errorCode").asText() : null;
                        kernelMessage = node.hasNonNull("message") ? node.get("message").asText() : null;
                    } catch (Exception parseEx) {
                        log.warn("⚠️ Impossible de parser le corps d'erreur Kernel : {}", parseEx.getMessage());
                    }

                    boolean isDuplicate = ex.getStatusCode() == HttpStatus.CONFLICT
                            || (errorCode != null && errorCode.toUpperCase().contains("DUPLICATE"))
                            || (kernelMessage != null && (kernelMessage.toLowerCase().contains("already exists")
                                    || kernelMessage.toLowerCase().contains("existe déjà")));

                    if (isDuplicate) {
                        String upperCode = errorCode != null ? errorCode.toUpperCase() : "";
                        String friendly;
                        if (upperCode.contains("USERNAME")) {
                            friendly = "Ce nom d'utilisateur est déjà pris.";
                        } else if (upperCode.contains("PHONE")) {
                            friendly = "Ce numéro de téléphone est déjà utilisé par un autre compte.";
                        } else if (upperCode.contains("EMAIL")) {
                            friendly = "Cet email est déjà utilisé par un autre compte.";
                        } else {
                            friendly = kernelMessage != null ? kernelMessage
                                    : "Un compte existe déjà avec ces informations.";
                        }
                        return Mono.error(new UserAlreadyExistsException(friendly));
                    }

                    if (ex.getStatusCode().is4xxClientError()) {
                        String friendly = kernelMessage != null ? kernelMessage : "Données d'inscription invalides.";
                        return Mono.error(
                                new com.yowyob.rideandgo.domain.exception.InvalidRegistrationDataException(friendly));
                    }

                    return Mono.error(new RuntimeException("Erreur inscription : " + body));
                });
    }

    private Mono<AuthResponse> continueRegisterAfterSignUp(String username, String email, String password,
            String phone, String firstName, String lastName, List<RoleType> roles) {
        return
        // Après sign-up, on fait un discoverContexts pour récupérer le userId
        client.discoverContexts(new AuthApiClient.KernelDiscoverContextsRequest(username, password))
                .flatMap(discoverResponse -> {
                    if (discoverResponse == null || !discoverResponse.success() || discoverResponse.data() == null
                            || discoverResponse.data().contexts() == null
                            || discoverResponse.data().contexts().isEmpty()) {
                        // Le compte a bien été créé côté Kernel (sign-up a réussi) mais n'est pas
                        // encore
                        // exploitable — cas normal pour un compte fraîchement inscrit dont l'email
                        // n'est
                        // pas encore vérifié (ex. AUTH_YOWYOB_IDENTITY_REMINDER_SENT). On ne fait PAS
                        // échouer l'inscription pour autant : pas de userId à ce stade, donc pas
                        // d'assignation de rôle ni de sauvegarde locale possible ici — ce sera fait
                        // après vérification de l'email (TODO : brancher
                        // /auth/email-verification/confirm
                        // puis relancer discoverContexts + assignRole + save à ce moment-là).
                        log.warn("⚠️ Compte {} créé mais pas encore exploitable (email non vérifié ?) : {}",
                                email, discoverResponse != null ? discoverResponse.message() : "réponse vide");
                        return Mono.just(new AuthPort.AuthResponse(
                                null, null, null, username, Collections.emptyList(), Collections.emptyList()));
                    }

                    // Même précaution qu'au login : on sélectionne explicitement le contexte
                    // du tenant RidnGo, au cas où ce compte email existait déjà dans un autre
                    // tenant.
                    AuthApiClient.KernelLoginContext context = discoverResponse.data().contexts().stream()
                            .filter(c -> this.tenantId.equals(c.tenantId()))
                            .findFirst()
                            .orElse(discoverResponse.data().contexts().get(0));
                    String userIdStr = context.userId();
                    UUID userId = UUID.fromString(userIdStr);
                    String selectionToken = discoverResponse.data().selectionToken();

                    // Assigner les rôles dans le Kernel.
                    // roleId doit être l'UUID réel du rôle (catalogue GET
                    // /api/administration/roles),
                    // pas le nom en clair — confirmé par un vrai payload Kernel.
                    Mono<Void> assignRolesMono = resolveRoleIds(roles)
                            .flatMap(roleIdByName -> reactor.core.publisher.Flux.fromIterable(roles)
                                    .flatMap(role -> {
                                        String kernelRoleId = roleIdByName.get(role.name());
                                        if (kernelRoleId == null) {
                                            log.error("❌ Rôle '{}' introuvable dans le catalogue Kernel du tenant {} — "
                                                    + "il doit être créé via POST /api/administration/roles avant inscription.",
                                                    role.name(), this.tenantId);
                                            return Mono.empty();
                                        }
                                        return client.assignRole(
                                                userIdStr,
                                                new AuthApiClient.KernelAssignRoleRequest(kernelRoleId, "TENANT", null,
                                                        null));
                                    })
                                    .then());

                    return assignRolesMono
                            .onErrorResume(WebClientResponseException.class, ex -> {
                                log.error(
                                        "❌ Assignation de rôle échouée (PAS un échec de sign-up) pour user {} : {} — {}",
                                        userIdStr, ex.getStatusCode(), ex.getResponseBodyAsString());
                                // On n'interrompt pas l'inscription pour autant : le compte existe déjà côté
                                // Kernel.
                                return Mono.empty();
                            })
                            .then(Mono.defer(() -> {
                                // Sauvegarde locale avec les vraies informations
                                User localUser = User.builder()
                                        .id(userId)
                                        .name(username)
                                        .firstName(firstName)
                                        .lastName(lastName)
                                        .email(email)
                                        .telephone(phone)
                                        .roles(roles.stream()
                                                .map(roleType -> com.yowyob.rideandgo.domain.model.Role.builder()
                                                        .type(roleType).permissions(Collections.emptySet()).build())
                                                .collect(Collectors.toSet()))
                                        .directPermissions(Collections.emptySet())
                                        .build();

                                return userRepositoryPort.save(localUser)
                                        .doOnSuccess(
                                                u -> log.info("✅ User enregistré localement avec rôles: {}", u.id()))
                                        .then(Mono.defer(() -> {
                                            // Tenter le selectContext pour avoir les tokens
                                            return client
                                                    .selectContext(new AuthApiClient.KernelSelectContextRequest(
                                                            selectionToken, context.contextId()))
                                                    .map(this::mapSelectResponseToDomain)
                                                    .onErrorResume(WebClientResponseException.class, ex -> {
                                                        if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED
                                                                || ex.getStatusCode() == HttpStatus.FORBIDDEN) {
                                                            log.warn(
                                                                    "⚠️ Login impossible après sign-up (vérification email probable). Inscription réussie sans tokens.");
                                                            return Mono.just(new AuthPort.AuthResponse(
                                                                    userId, null, null, username,
                                                                    roles.stream().map(Enum::name)
                                                                            .collect(Collectors.toList()),
                                                                    Collections.emptyList()));
                                                        }
                                                        return Mono.error(ex);
                                                    });
                                        }));
                            }));
                }).onErrorResume(WebClientResponseException.class, ex ->

                {
                    String body = ex.getResponseBodyAsString();
                    log.error("❌ Échec après sign-up (discover-contexts/assignRole/select-context) : {} — {}",
                            ex.getStatusCode(),
                            body);

                    String errorCode = null;
                    String kernelMessage = null;
                    try {
                        com.fasterxml.jackson.databind.JsonNode node = SIGNUP_ERROR_MAPPER.readTree(body);
                        errorCode = node.hasNonNull("errorCode") ? node.get("errorCode").asText() : null;
                        kernelMessage = node.hasNonNull("message") ? node.get("message").asText() : null;
                    } catch (Exception parseEx) {
                        log.warn("⚠️ Impossible de parser le corps d'erreur Kernel : {}", parseEx.getMessage());
                    }

                    boolean isDuplicate = ex.getStatusCode() == HttpStatus.CONFLICT
                            || (errorCode != null && errorCode.toUpperCase().contains("DUPLICATE"))
                            || (kernelMessage != null && (kernelMessage.toLowerCase().contains("already exists")
                                    || kernelMessage.toLowerCase().contains("existe déjà")));

                    if (isDuplicate) {
                        String upperCode = errorCode != null ? errorCode.toUpperCase() : "";
                        String friendly;
                        if (upperCode.contains("USERNAME")) {
                            friendly = "Ce nom d'utilisateur est déjà pris.";
                        } else if (upperCode.contains("PHONE")) {
                            friendly = "Ce numéro de téléphone est déjà utilisé par un autre compte.";
                        } else if (upperCode.contains("EMAIL")) {
                            friendly = "Cet email est déjà utilisé par un autre compte.";
                        } else {
                            friendly = kernelMessage != null ? kernelMessage
                                    : "Un compte existe déjà avec ces informations.";
                        }
                        return Mono.error(new UserAlreadyExistsException(friendly));
                    }

                    // Toute autre erreur 4xx du Kernel (validation, champ manquant, format
                    // invalide...)
                    // devient une 400 exploitable par le front, au lieu d'une 500 générique.
                    if (ex.getStatusCode().is4xxClientError()) {
                        String friendly = kernelMessage != null ? kernelMessage : "Données d'inscription invalides.";
                        return Mono.error(
                                new com.yowyob.rideandgo.domain.exception.InvalidRegistrationDataException(friendly));
                    }

                    // Ici, c'est une vraie panne technique (5xx Kernel, réseau...) — 500 légitime.
                    return Mono.error(new RuntimeException("Erreur inscription : " + body));
                });
    }

    @Override
    public Mono<AuthResponse> refreshToken(String refreshToken) {
        log.info("🌐 KERNEL AUTH : Refresh token");
        // NOTE : POST /api/auth/refresh renvoie très probablement la même enveloppe
        // {success, data:{...session...}} que /auth/login (confirmé par un test réel de
        // /auth/login) — non re-vérifié en direct pour /refresh, à confirmer.
        return client.refresh(new AuthApiClient.KernelRefreshRequest(refreshToken))
                .mapNotNull(AuthApiClient.KernelRefreshEnvelope::data)
                .doOnSuccess(session -> {
                    if (session != null && session.id() != null) {
                        cacheInvalidationPort.invalidateUserCache(UUID.fromString(session.id())).subscribe();
                    }
                })
                .map(this::mapSessionToDomain)
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

    // (mapAuthResponseToDomain supprimé — remplacé par mapSessionToDomain,
    // réutilisé par
    // select-context et refresh, tous deux basés sur la même KernelSession)
}