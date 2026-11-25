package com.yowyob.rideandgo.infrastructure.adapters.inbound.rest;

import com.yowyob.rideandgo.domain.model.enums.RoleType;
import com.yowyob.rideandgo.domain.ports.in.AuthUseCase;
import com.yowyob.rideandgo.domain.ports.out.AuthPort;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthController {

    private final AuthUseCase authUseCase;
    private final com.yowyob.rideandgo.infrastructure.adapters.outbound.external.KernelServiceTokenProvider serviceTokenProvider;

    @PostMapping("/login")
    public Mono<AuthPort.AuthResponse> login(@RequestBody LoginRequest request) {
        return authUseCase.login(request.principal(), request.password());
    }

    @PostMapping("/login/mfa")
    @Operation(summary = "Termine une connexion qui a répondu 202 CONFIRM_MFA")
    public Mono<AuthPort.AuthResponse> confirmLoginMfa(@RequestBody MfaConfirmRequest request) {
        return authUseCase.confirmLoginMfa(request.mfaToken(), request.code());
    }

    @PostMapping("/service-session")
    @Operation(summary = "Ops : connecte le compte de service Kernel (envoie le code MFA par email)")
    public Mono<java.util.Map<String, String>> startServiceSession(
            @RequestHeader(value = "X-Service-Password", required = false) String password) {
        return guard(password).then(serviceTokenProvider.startMfaSession()
                .onErrorResume(IllegalStateException.class, e -> Mono.just(e.getMessage())))
                .map(msg -> java.util.Map.of("message", msg));
    }

    @PostMapping("/service-session/mfa")
    @Operation(summary = "Ops : saisit le code MFA du compte de service, une fois")
    public Mono<java.util.Map<String, String>> confirmServiceSession(
            @RequestHeader(value = "X-Service-Password", required = false) String password,
            @RequestBody MfaCodeRequest request) {
        return guard(password).then(serviceTokenProvider.confirmMfa(request.code()))
                .onErrorMap(org.springframework.web.reactive.function.client.WebClientResponseException.class,
                        e -> new com.yowyob.rideandgo.domain.exception.AuthenticationFailedException(
                                "Code incorrect ou expiré (" + e.getStatusCode() + ")."))
                .map(msg -> java.util.Map.of("message", msg));
    }

    private Mono<Void> guard(String password) {
        return serviceTokenProvider.isServicePassword(password) ? Mono.empty()
                : Mono.error(new com.yowyob.rideandgo.domain.exception.AuthenticationFailedException(
                        "X-Service-Password invalide."));
    }

    @PostMapping("/email-verification/resend")
    @Operation(summary = "Renvoie le lien de vérification email (Kernel)")
    public Mono<Void> resendEmailVerification(@RequestBody ResendRequest request) {
        if (request == null || request.principal() == null || request.principal().isBlank()) {
            return Mono.error(new IllegalArgumentException("Identifiant requis."));
        }
        return authUseCase.resendEmailVerification(request.principal().trim());
    }

    @PostMapping("/captcha")
    @Operation(summary = "Défi anti-robot Kernel, exigé à l'inscription")
    public Mono<AuthPort.CaptchaChallenge> captcha() {
        return authUseCase.captcha();
    }

    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Inscription Multi-Rôles avec Photo")
    public Mono<AuthPort.AuthResponse> register(
            @RequestPart("data") RegisterDto dto, // ✅ Objet structuré
            @RequestPart(value = "file", required = false) FilePart photo) {

        // Le rôle ADMIN ne peut jamais être auto-attribué à l'inscription
        List<RoleType> requested = dto.roles() == null ? List.of()
                : dto.roles().stream().filter(r -> r != null && r != RoleType.RIDE_AND_GO_ADMIN).distinct().toList();
        List<RoleType> rolesToAssign = requested.isEmpty() ? List.of(RoleType.RIDE_AND_GO_PASSENGER) : requested;

        return UploadValidator.check(photo).then(Mono.defer(() -> authUseCase.register(
                dto.username(), dto.email(), dto.password(),
                dto.phone(), dto.firstName(), dto.lastName(),
                rolesToAssign, photo, dto.captchaToken(), dto.captchaAnswer())));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh Token")
    public Mono<AuthPort.AuthResponse> refresh(@RequestBody RefreshTokenDto request) {
        return authUseCase.refreshToken(request.refreshToken());
    }

    public record LoginRequest(String principal, String password) {
    }

    public record RefreshTokenDto(String refreshToken) {
    }

    public record MfaConfirmRequest(String mfaToken, String code) {
    }

    public record MfaCodeRequest(String code) {
    }

    public record ResendRequest(String principal) {
    }

    public record RegisterDto(
            String username,
            String password,
            String email,
            String phone,
            String firstName,
            String lastName,
            List<RoleType> roles,
            String captchaToken,
            String captchaAnswer) {
    }
}