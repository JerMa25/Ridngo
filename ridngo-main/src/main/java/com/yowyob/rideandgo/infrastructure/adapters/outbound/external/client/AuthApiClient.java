package com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.DeleteExchange;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;
import org.springframework.web.service.annotation.PutExchange;

import reactor.core.publisher.Mono;
import java.util.List;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Client HTTP vers le Kernel Core (auth, users, roles).
 * Base URL : https://kernel-core.yowyob.com/kernel-api
 * Headers injectés par kernelAuthFilter() : X-Client-Id + X-Api-Key
 * Headers injectés par addBearerToken() : Authorization: Bearer <token>
 */
@HttpExchange("/api")
public interface AuthApiClient {

        // ─── AUTH ─────────────────────────────────────────────────────────────────

        /** POST /api/auth/login — connexion dans le tenant par défaut */
        @PostExchange("/auth/login")
        Mono<KernelAuthResponse> login(@RequestBody KernelLoginRequest request);

        @PostExchange("/auth/discover-contexts")
        Mono<KernelDiscoverContextsResponse> discoverContexts(@RequestBody KernelDiscoverContextsRequest request);

        @PostExchange("/auth/select-context")
        Mono<KernelSelectContextResponse> selectContext(@RequestBody KernelSelectContextRequest request);

        /** POST /api/auth/sign-up — création de compte (JSON pur) */
        @PostExchange("/auth/sign-up")
        Mono<KernelSignUpResponse> signUp(@RequestBody KernelSignUpRequest request);

        /** POST /api/auth/login/mfa/confirm — data = même session à plat que /auth/login */
        @PostExchange("/auth/login/mfa/confirm")
        Mono<KernelRefreshEnvelope> confirmLoginMfa(@RequestBody KernelConfirmMfaRequest request);

        @PostExchange("/auth/email-verification/resend")
        Mono<Void> resendEmailVerification(@RequestBody KernelPrincipalRequest request);

        record KernelPrincipalRequest(String principal) {
        }

        /** POST /api/auth/captcha — défi anti-robot exigé par /auth/sign-up */
        @PostExchange("/auth/captcha")
        Mono<KernelCaptchaEnvelope> captcha();

        @PostExchange("/auth/captcha/verify")
        Mono<KernelCaptchaVerifyEnvelope> verifyCaptcha(@RequestBody KernelVerifyCaptchaRequest request);

        /** POST /api/auth/refresh — rotation du refreshToken */
        @PostExchange("/auth/refresh")
        Mono<KernelRefreshEnvelope> refresh(@RequestBody KernelRefreshRequest request);

        // ─── USERS ────────────────────────────────────────────────────────────────

        /** GET /api/users/me — profil du user connecté (nécessite Bearer) */
        @GetExchange("/users/me")
        Mono<KernelUserDetailEnvelope> getMe();

        /** GET /api/users/{id} — profil d'un user par ID (admin) */
        @GetExchange("/users/{id}")
        Mono<KernelUserDetailEnvelope> getUserById(@PathVariable String id);

        // ─── ROLES ────────────────────────────────────────────────────────────────

        /** POST /api/administration/users/{userId}/roles — assigner un rôle RBAC */
        @PostExchange("/administration/users/{userId}/roles")
        Mono<Void> assignRole(@PathVariable String userId,
                        // Kernel : "OrganizationDelegationForbiddenException - organizationId is required" sans cet en-tête
                        @org.springframework.web.bind.annotation.RequestHeader("X-Organization-Id") String organizationId,
                        @RequestBody KernelAssignRoleRequest request);

        /**
         * DELETE /api/administration/users/{userId}/roles/{assignmentId} — retirer un
         * rôle
         */
        @DeleteExchange("/administration/users/{userId}/roles/{assignmentId}")
        Mono<Void> removeRole(@PathVariable String userId, @PathVariable String assignmentId);

        /**
         * GET /api/administration/roles — catalogue des rôles du tenant (roleId réel,
         * requis pour assignRole)
         */
        @GetExchange("/administration/roles")
        Mono<KernelRolesEnvelope> getRoles();

        // ─── FILES (photo de profil) ──────────────────────────────────────────────

        /** POST /api/files (file-core) — dépôt multipart ; data.id sert d'avatarId. */
        @PostExchange("/files")
        Mono<KernelFileEnvelope> uploadFile(
                        @org.springframework.web.bind.annotation.RequestPart("file") org.springframework.core.io.Resource file,
                        @org.springframework.web.bind.annotation.RequestParam("documentType") String documentType,
                        @org.springframework.web.bind.annotation.RequestParam("public") boolean isPublic);

        @PutExchange("/users/me/avatar")
        Mono<Void> updateAvatar(@RequestBody KernelAvatarRequest request);

        @GetExchange("/files/{fileId}/content")
        Mono<org.springframework.http.ResponseEntity<byte[]>> fileContent(@PathVariable String fileId);

        record KernelAvatarRequest(String avatarId) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelStoredFile(String id, String contentType) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelFileEnvelope(boolean success, KernelStoredFile data, String message, String errorCode) {
        }

        // ─── ACTOR (profil self-service) ──────────────────────────────────────────

        /** PUT /api/actors/me/identity — mise à jour self-service des infos de base */
        @PutExchange("/actors/me/identity")
        Mono<KernelUserDetailEnvelope> updateMyIdentity(@RequestBody KernelUpdateIdentityRequest request);

        // =========================================================================
        // DTOs — Requêtes
        // =========================================================================

        record KernelLoginRequest(String principal, String password) {
        }

        @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
        /**
         * POST /api/auth/sign-up — schéma confirmé par le Swagger réel du Kernel.
         * Champs vus dans le schéma mais non utilisés ici (probablement optionnels,
         * réservés à
         * d'autres flows) : signUpSelectionToken, contextId (flow invitation/join),
         * socialProvider, externalSubject (flow OAuth), captchaVerificationToken,
         * accountType,
         * businessType, onboardingData.
         */
        record KernelSignUpRequest(
                        String tenantId,
                        String username,
                        String email,
                        String password,
                        String firstName,
                        String lastName,
                        String phoneNumber,
                        String captchaVerificationToken) {
        }

        record KernelRefreshRequest(String refreshToken) {
        }

        record KernelConfirmMfaRequest(String mfaToken, String code) {
        }

        record KernelVerifyCaptchaRequest(String captchaToken, String answer) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelCaptcha(String captchaToken, String prompt, Integer expiresInSeconds) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelCaptchaEnvelope(boolean success, KernelCaptcha data, String message, String errorCode) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelCaptchaVerification(String captchaVerificationToken) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelCaptchaVerifyEnvelope(boolean success, KernelCaptchaVerification data, String message,
                        String errorCode) {
        }

        /**
         * Format confirmé par un vrai payload fonctionnel pour un rôle TENANT :
         * {"roleId": "<uuid>", "scopeType": "TENANT"} — PAS de scopeId ni de scope pour
         * ce cas.
         * scopeId/scope restent utilisables (non-null) pour un scope ORGANIZATION, où
         * la doc
         * montre les deux renseignés — JsonInclude NON_NULL les omet automatiquement si
         * null.
         */
        @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
        record KernelAssignRoleRequest(
                        String roleId,
                        String scopeType,
                        String scopeId,
                        String scope) {

                /** Rôle ORGANIZATION (catalogue du tenant cad65f4e) : scopé sur l'organisation RidnGo. */
                public static KernelAssignRoleRequest forRole(KernelRoleDto role, String organizationId) {
                        return "ORGANIZATION".equalsIgnoreCase(role.scopeType())
                                        ? new KernelAssignRoleRequest(role.id(), "ORGANIZATION", organizationId,
                                                        "ORGANIZATION")
                                        : new KernelAssignRoleRequest(role.id(), "TENANT", null, null);
                }
        }

        /**
         * PUT /actors/me/identity — nom du champ aligné sur la convention Kernel
         * confirmée (phoneNumber),
         * par cohérence avec sign-up/login ; non re-vérifié spécifiquement sur cet
         * endpoint d'écriture.
         */
        record KernelUpdateIdentityRequest(
                        String firstName,
                        String lastName,
                        String phoneNumber) {
        }

        // =========================================================================
        // DTOs — Réponses
        // =========================================================================
        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelDiscoverContextsRequest(String principal, String password) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelLoginContext(String contextId, String tenantId, String userId, String actorId) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelDiscoverContextsData(String selectionToken, Integer expiresInSeconds,
                        List<KernelLoginContext> contexts) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelDiscoverContextsResponse(boolean success, KernelDiscoverContextsData data, String message,
                        String errorCode) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelSelectContextRequest(String selectionToken, String contextId) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelSession(
                        String id, String tenantId, String actorId, String username, String email,
                        String status, String accountType, Boolean emailVerified,
                        String accessToken, String refreshToken, String tokenType,
                        Integer expiresInSeconds, List<String> authorities) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        // nextStep/mfaToken/channel : réponse 202 "MFA required." (confirmé en réel sur select-context)
        record KernelSelectContextData(String selectedTenantId, String selectedOrganizationId, KernelSession session,
                        String nextStep, String mfaToken, String channel) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelSelectContextResponse(boolean success, KernelSelectContextData data, String message,
                        String errorCode) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelAuthResponse(
                        String accessToken,
                        String refreshToken,
                        KernelUserDetail user) {
        }

        /**
         * Enveloppe de POST /api/auth/refresh. Réutilise KernelSession, dont la forme
         * a été confirmée sur un vrai payload de POST /api/auth/login (id, username,
         * email,
         * accessToken, refreshToken, tokenType, expiresInSeconds, authorities, en clair
         * sous "data" — pas d'objet "user" imbriqué). À reconfirmer spécifiquement sur
         * /refresh.
         */
        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelRefreshEnvelope(boolean success, KernelSession data, String message, String errorCode) {
        }

        /**
         * La réponse sign-up peut retourner EMAIL_VERIFICATION_REQUIRED (201)
         * sans tokens. On capture les champs communs de manière flexible.
         */
        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelSignUpResponse(
                        String status, // ex: "EMAIL_VERIFICATION_REQUIRED"
                        String message,
                        KernelUserDetail user) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelUserDetail(
                        String id,
                        String email,
                        String firstName,
                        String lastName,
                        String username,
                        String phoneNumber, // clé JSON confirmée "phoneNumber" (login/sign-up réels), pas "phone"
                        List<String> roles,
                        List<String> permissions,
                        String businessActorId,
                        String businessActorStatus,
                        String actorId) {
        }

        /**
         * Enveloppe standard du Kernel Core
         * ({@code {success, data, message, errorCode, timestamp}}),
         * confirmée sur /auth/discover-contexts, /auth/login et /auth/select-context.
         * GET /users/me, GET /users/{id} et PUT /actors/me/identity suivent très
         * probablement
         * la même convention — sans cet unwrap, tous les champs de KernelUserDetail
         * sont null.
         */
        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelUserDetailEnvelope(boolean success, KernelUserDetail data, String message, String errorCode) {
        }

        /**
         * Rôle du catalogue Kernel — forme confirmée par un vrai payload GET
         * /api/administration/roles.
         * id est un UUID réel : c'est CE champ qu'il faut envoyer comme roleId dans
         * assignRole,
         * pas le nom/code en clair.
         */
        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelRoleDto(String id, String tenantId, String code, String name, String scopeType,
                        List<String> permissions) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelRolesEnvelope(boolean success, List<KernelRoleDto> data, String message, String errorCode) {
        }

        // ─── Compatibilité : alias pratiques pour les anciens champs mappés ────────

        /** DTO de mise à jour de profil (utilisé par RemoteUserAdapter) */
        record UpdateProfileDto(String firstName, String lastName, String phone) {
        }

        /** DTO de changement de mot de passe (non supporté nativement Kernel Core) */
        record ChangePasswordDto(String currentPassword, String newPassword) {
        }
}