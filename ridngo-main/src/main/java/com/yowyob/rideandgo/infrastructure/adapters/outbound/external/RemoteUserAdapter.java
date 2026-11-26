package com.yowyob.rideandgo.infrastructure.adapters.outbound.external;

import com.yowyob.rideandgo.domain.exception.AuthenticationFailedException;
import com.yowyob.rideandgo.domain.model.User;
import com.yowyob.rideandgo.domain.ports.out.ExternalUserPort;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.AuthApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.Collections;
import java.util.UUID;
import com.yowyob.rideandgo.domain.model.Role;
import com.yowyob.rideandgo.domain.model.enums.RoleType;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@RequiredArgsConstructor
public class RemoteUserAdapter implements ExternalUserPort {

    private final AuthApiClient client;
    private final String tenantId;
    private final String organizationId;
    private final org.springframework.data.redis.core.ReactiveRedisTemplate<String, Object> redis;

    private static final String PHOTO_KEY_PREFIX = "profile-photo:";

    // ─── READ ──────────────────────────────────────────────────────────────────

    /**
     * Récupère tous les users du service — non supporté par le Kernel Core
     * sans endpoint de listing global. On retourne un flux vide.
     */
    @Override
    public Flux<User> fetchAllRemoteUsers() {
        log.warn("⚠️ fetchAllRemoteUsers : non supporté par Kernel Core, retour vide.");
        return Flux.empty();
    }

    @Override
    public Flux<User> fetchAllRemoteUsersByService(String serviceName) {
        log.warn("⚠️ fetchAllRemoteUsersByService('{}') : non supporté par Kernel Core, retour vide.", serviceName);
        return Flux.empty();
    }

    /**
     * Récupère un user par ID : tente GET /api/users/{id} (admin),
     * fallback sur GET /api/users/me (user connecté) si 403/404.
     */
    @Override
    public Mono<User> fetchRemoteUserById(UUID id) {
        return client.getUserById(id.toString())
                .mapNotNull(AuthApiClient.KernelUserDetailEnvelope::data)
                .map(this::mapToDomain)
                .onErrorResume(WebClientResponseException.class, ex -> {
                    if (ex.getStatusCode() == HttpStatus.FORBIDDEN
                            || ex.getStatusCode() == HttpStatus.NOT_FOUND) {
                        // /users/me renvoie l'appelant : valable seulement si on demande son propre profil
                        log.warn("⚠️ getUserById({}) interdit/introuvable, repli sur /users/me si c'est l'appelant", id);
                        return client.getMe().mapNotNull(AuthApiClient.KernelUserDetailEnvelope::data)
                                .map(this::mapToDomain)
                                .filter(me -> id.equals(me.id()));
                    }
                    log.error("❌ fetchRemoteUserById({}) : {} — {}", id, ex.getStatusCode(),
                            ex.getResponseBodyAsString());
                    return Mono.empty();
                })
                .onErrorResume(e -> {
                    log.error("❌ fetchRemoteUserById({}) erreur inattendue : {}", id, e.getMessage());
                    return Mono.empty();
                });
    }

    /**
     * Profil du user connecté via GET /api/users/me.
     * C'est le SEUL endpoint Kernel Core qui dérive firstName/lastName/profession
     * depuis l'Actor — GET /api/users/{id} ne le fait pas et renvoie ces champs à
     * null.
     * Le userId est ignoré ici : le Bearer token (propagé par WebClientConfig)
     * suffit
     * à identifier l'utilisateur côté Kernel.
     */
    @Override
    public Mono<User> fetchMyProfile(UUID userId) {
        return client.getMe()
                .mapNotNull(AuthApiClient.KernelUserDetailEnvelope::data)
                .map(this::mapToDomain)
                .onErrorResume(WebClientResponseException.class, ex -> {
                    if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                        return Mono.error(
                                new AuthenticationFailedException("Session expirée. Veuillez vous reconnecter."));
                    }
                    log.error("❌ fetchMyProfile({}) : {} — {}", userId, ex.getStatusCode(),
                            ex.getResponseBodyAsString());
                    return Mono.empty();
                });
    }

    // ─── WRITE ─────────────────────────────────────────────────────────────────

    /**
     * Assigne un rôle RBAC via Kernel Core.
     * POST /api/administration/users/{userId}/roles
     * Le scopeType est TENANT par défaut (pas d'organisation scoped pour Ridngo).
     */
    @Override
    public Mono<Void> addRole(UUID userId, String roleName) {
        log.info("🌍 Kernel : ADD ROLE '{}' pour user {}", roleName, userId);

        return client.getRoles()
                .flatMap(envelope -> {
                    AuthApiClient.KernelRoleDto kernelRole = (envelope != null && envelope.data() != null)
                            ? envelope.data().stream()
                                    .filter(r -> roleName.equalsIgnoreCase(r.code())
                                            || roleName.equalsIgnoreCase(r.name()))
                                    .findFirst()
                                    .orElse(null)
                            : null;

                    if (kernelRole == null) {
                        log.error("❌ Rôle '{}' introuvable dans le catalogue Kernel du tenant {} — "
                                + "à créer via POST /api/administration/roles.", roleName, tenantId);
                        return Mono.error(new RuntimeException(
                                "Le rôle '" + roleName + "' n'existe pas dans le catalogue Kernel de ce tenant."));
                    }

                    AuthApiClient.KernelAssignRoleRequest request = AuthApiClient.KernelAssignRoleRequest
                            .forRole(kernelRole, organizationId);

                    return client.assignRole(userId.toString(), organizationId, request);
                })
                // attribuer un rôle exige des droits d'admin : sans contexte utilisateur, addBearerToken()
                // utilise le compte de service (le token du chauffeur reçoit 403 ACCESS_DENIED)
                .contextWrite(org.springframework.security.core.context.ReactiveSecurityContextHolder.clearContext())
                .onErrorResume(WebClientResponseException.class, ex -> {
                    log.error("❌ addRole '{}' pour {} : {} — {}",
                            roleName, userId, ex.getStatusCode(), ex.getResponseBodyAsString());
                    return Mono.error(new RuntimeException("Impossible d'assigner le rôle à distance."));
                });
    }

    /**
     * Retire un rôle RBAC. Le Kernel Core exige l'assignmentId.
     * Ici on passe roleName comme assignmentId (workaround — à préciser
     * si le Kernel expose un endpoint de lookup des assignments).
     */
    @Override
    public Mono<Void> removeRole(UUID userId, String roleName) {
        log.info("🌍 Kernel : REMOVE ROLE '{}' pour user {}", roleName, userId);
        return client.removeRole(userId.toString(), roleName)
                .onErrorResume(WebClientResponseException.class, ex -> {
                    log.error("❌ removeRole '{}' pour {} : {} — {}",
                            roleName, userId, ex.getStatusCode(), ex.getResponseBodyAsString());
                    return Mono.error(new RuntimeException("Impossible de retirer le rôle à distance."));
                });
    }

    /**
     * Mise à jour de l'identité self-service.
     * PUT /api/actors/me/identity
     */
    @Override
    public Mono<String> uploadProfilePhoto(org.springframework.http.codec.multipart.FilePart photo) {
        String contentType = photo.headers().getContentType() == null ? "image/jpeg"
                : photo.headers().getContentType().toString();
        return org.springframework.core.io.buffer.DataBufferUtils.join(photo.content())
                .map(buf -> {
                    byte[] bytes = new byte[buf.readableByteCount()];
                    buf.read(bytes);
                    org.springframework.core.io.buffer.DataBufferUtils.release(buf);
                    return bytes;
                })
                .flatMap(bytes -> client.uploadFile(new org.springframework.core.io.ByteArrayResource(bytes) {
                    @Override
                    public String getFilename() {
                        return photo.filename();
                    }
                }, "PROFILE_PHOTO", true)
                        .mapNotNull(env -> env == null || env.data() == null ? null : env.data().id())
                        // Copie servie à <img> : le compte de service n'a pas forcément files:read sur le Kernel
                        // "type|base64" : une Map.of (classe finale) n'était pas relisible par le template Redis typé
                        .flatMap(fileId -> redis.opsForValue().set(PHOTO_KEY_PREFIX + fileId,
                                contentType + "|" + java.util.Base64.getEncoder().encodeToString(bytes)).thenReturn(fileId)))
                .switchIfEmpty(Mono.error(new IllegalStateException("Réponse Kernel invalide pour le dépôt de la photo.")))
                // l'avatar Kernel est un plus (visible dans les autres apps Yowyob) : son échec ne bloque pas RidnGo
                .flatMap(fileId -> client.updateAvatar(new AuthApiClient.KernelAvatarRequest(fileId))
                        .onErrorResume(e -> {
                            log.warn("⚠️ Avatar Kernel non mis à jour pour le fichier {} : {}", fileId, e.getMessage());
                            return Mono.empty();
                        })
                        .thenReturn(fileId))
                .onErrorMap(WebClientResponseException.class, ex -> {
                    log.error("❌ Dépôt photo Kernel : {} — {}", ex.getStatusCode(), ex.getResponseBodyAsString());
                    return new IllegalStateException("Le Kernel a refusé la photo (" + ex.getStatusCode() + ").");
                });
    }

    @Override
    public Mono<FileContent> fetchProfilePhoto(String fileId) {
        Mono<FileContent> fromKernel = client.fileContent(fileId)
                .map(res -> new FileContent(res.getBody(), res.getHeaders().getContentType() == null
                        ? "image/jpeg" : res.getHeaders().getContentType().toString()))
                .onErrorResume(WebClientResponseException.class, ex -> {
                    log.warn("⚠️ Photo {} illisible côté Kernel ({}) — ajouter files:read au compte de service.",
                            fileId, ex.getStatusCode());
                    return Mono.empty();
                });
        return redis.opsForValue().get(PHOTO_KEY_PREFIX + fileId)
                .ofType(String.class)
                .filter(v -> v.indexOf('|') > 0)
                .map(v -> new FileContent(java.util.Base64.getDecoder().decode(v.substring(v.indexOf('|') + 1)),
                        v.substring(0, v.indexOf('|'))))
                .onErrorResume(e -> Mono.empty())
                .switchIfEmpty(fromKernel);
    }

    @Override
    public Mono<User> updateProfile(UUID userId, String firstName, String lastName, String phone) {
        log.info("🌍 Kernel : UPDATE IDENTITY pour user {}", userId);
        return client.updateMyIdentity(new AuthApiClient.KernelUpdateIdentityRequest(firstName, lastName, phone))
                .mapNotNull(AuthApiClient.KernelUserDetailEnvelope::data)
                .map(this::mapToDomain)
                .onErrorResume(WebClientResponseException.class, ex -> {
                    if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                        return Mono.error(new AuthenticationFailedException("Session expirée ou non autorisée."));
                    }
                    log.error("❌ updateProfile pour {} : {}", userId, ex.getResponseBodyAsString());
                    return Mono.error(new RuntimeException("Erreur lors de la mise à jour du profil distant."));
                });
    }

    /**
     * Changement de mot de passe — non documenté dans Kernel Core.
     * No-op pour éviter tout blocage applicatif.
     */
    @Override
    public Mono<Void> changePassword(UUID userId, String currentPassword, String newPassword) {
        log.warn("⚠️ changePassword : non supporté par Kernel Core pour le moment.");
        return Mono.empty();
    }

    // ─── MAPPER ────────────────────────────────────────────────────────────────

    private User mapToDomain(AuthApiClient.KernelUserDetail dto) {
        // Même normalisation que côté login (RemoteAuthAdapter) : le Kernel préfixe
        // avec "ROLE_" et ajoute un suffixe "#SCOPE" sur les rôles.
        Set<Role> roles = dto.roles() != null ? dto.roles().stream()
                .map(RemoteUserAdapter::normalizeRoleAuthority)
                .filter(roleStr -> {
                    try {
                        RoleType.valueOf(roleStr);
                        return true;
                    } catch (IllegalArgumentException e) {
                        return false;
                    }
                })
                .map(roleStr -> Role.builder().type(RoleType.valueOf(roleStr)).build())
                .collect(Collectors.toSet()) : Collections.emptySet();

        String name = dto.username() != null ? dto.username()
                : (dto.email() != null ? dto.email() : "unknown");

        return User.builder()
                .id(UUID.fromString(dto.id()))
                .name(name)
                .firstName(dto.firstName())
                .lastName(dto.lastName())
                .email(dto.email())
                .telephone(dto.phoneNumber())
                .roles(roles)
                .directPermissions(Collections.emptySet())
                .build();
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
}