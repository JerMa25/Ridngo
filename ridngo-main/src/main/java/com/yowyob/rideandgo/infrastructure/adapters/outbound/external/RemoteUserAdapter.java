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
                .map(this::mapToDomain)
                .onErrorResume(WebClientResponseException.class, ex -> {
                    if (ex.getStatusCode() == HttpStatus.FORBIDDEN
                            || ex.getStatusCode() == HttpStatus.NOT_FOUND) {
                        log.warn("⚠️ getUserById({}) interdit/introuvable, fallback sur /users/me", id);
                        return client.getMe().map(this::mapToDomain);
                    }
                    log.error("❌ fetchRemoteUserById({}) : {} — {}", id, ex.getStatusCode(), ex.getResponseBodyAsString());
                    return Mono.empty();
                })
                .onErrorResume(e -> {
                    log.error("❌ fetchRemoteUserById({}) erreur inattendue : {}", id, e.getMessage());
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

        // scopeType TENANT — aucun scopeId requis pour un rôle global
        AuthApiClient.KernelAssignRoleRequest request = new AuthApiClient.KernelAssignRoleRequest(
                roleName,     // roleId = nom du rôle (le Kernel le résoudra par name)
                "TENANT",
                null,
                "TENANT"
        );

        return client.assignRole(userId.toString(), request)
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
    public Mono<User> updateProfile(UUID userId, String firstName, String lastName, String phone) {
        log.info("🌍 Kernel : UPDATE IDENTITY pour user {}", userId);
        return client.updateMyIdentity(new AuthApiClient.KernelUpdateIdentityRequest(firstName, lastName, phone))
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
        Set<Role> roles = dto.roles() != null ? dto.roles().stream()
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
                .telephone(dto.phone())
                .roles(roles)
                .directPermissions(Collections.emptySet())
                .build();
    }
}