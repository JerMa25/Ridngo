package com.yowyob.rideandgo.domain.ports.out;

import com.yowyob.rideandgo.domain.model.enums.RoleType;
import reactor.core.publisher.Mono;
import java.util.List;
import java.util.UUID;

public interface AuthPort {
    Mono<AuthResponse> login(String email, String password);

    Mono<Void> forgotPassword(String email);

    Mono<AuthResponse> refreshToken(String refreshToken);

    /** Termine une connexion qui a levé MfaRequiredException. */
    Mono<AuthResponse> confirmLoginMfa(String mfaToken, String code);

    Mono<CaptchaChallenge> captcha();

    Mono<Void> resendEmailVerification(String principal);

    Mono<AuthResponse> register(
            String username, String email, String password, String phone,
            String firstName, String lastName, List<RoleType> roles,
            org.springframework.http.codec.multipart.FilePart photo, // Ajouté
            String captchaToken, String captchaAnswer
    );

    record CaptchaChallenge(String captchaToken, String prompt) {
    }

    record AuthResponse(
            UUID userId, // Ajouté pour identifier l'utilisateur
            String accessToken,
            String refreshToken,
            String username,
            List<String> roles,
            List<String> permissions) {
    }
}