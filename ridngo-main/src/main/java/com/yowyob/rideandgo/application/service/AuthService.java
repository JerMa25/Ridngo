package com.yowyob.rideandgo.application.service;

import com.yowyob.rideandgo.domain.model.enums.RoleType;
import com.yowyob.rideandgo.domain.ports.in.AuthUseCase;
import com.yowyob.rideandgo.domain.ports.out.AuthPort;
import com.yowyob.rideandgo.domain.ports.out.DriverRepositoryPort;
import com.yowyob.rideandgo.domain.ports.out.PaymentPort;
import com.yowyob.rideandgo.domain.ports.out.UserRepositoryPort;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService implements AuthUseCase {

    private final AuthPort authPort;
    private final PaymentPort paymentPort;
    private final DriverRepositoryPort driverRepositoryPort;
    private final UserRepositoryPort userRepositoryPort;

    @Override
    public Mono<AuthPort.AuthResponse> login(String principal, String password) {
        return authPort.login(principal, password).flatMap(this::withLocalRoles);
    }

    /** Ajoute les rôles connus en base (ex. chauffeur promu dont la session Kernel n'a pas encore le rôle). */
    private Mono<AuthPort.AuthResponse> withLocalRoles(AuthPort.AuthResponse res) {
        if (res.userId() == null) {
            return Mono.just(res);
        }
        return userRepositoryPort.findUserById(res.userId())
                .map(user -> {
                    java.util.LinkedHashSet<String> roles = new java.util.LinkedHashSet<>(
                            res.roles() == null ? List.of() : res.roles());
                    if (user.roles() != null) {
                        user.roles().stream().filter(r -> r.type() != null).forEach(r -> roles.add(r.type().name()));
                    }
                    return new AuthPort.AuthResponse(res.userId(), res.accessToken(), res.refreshToken(),
                            res.username(), List.copyOf(roles), res.permissions());
                })
                .defaultIfEmpty(res)
                .onErrorResume(e -> {
                    log.warn("Rôles locaux indisponibles pour {} : {}", res.userId(), e.getMessage());
                    return Mono.just(res);
                });
    }

    @Override
    public Mono<AuthPort.AuthResponse> confirmLoginMfa(String mfaToken, String code) {
        return authPort.confirmLoginMfa(mfaToken, code).flatMap(this::withLocalRoles);
    }

    @Override
    public Mono<Void> resendEmailVerification(String principal) {
        return authPort.resendEmailVerification(principal);
    }

    @Override
    public Mono<AuthPort.CaptchaChallenge> captcha() {
        return authPort.captcha();
    }

    @Override
    public Mono<AuthPort.AuthResponse> refreshToken(String refreshToken) {
        return authPort.refreshToken(refreshToken).flatMap(this::withLocalRoles);
    }

    @Override
    public Mono<AuthPort.AuthResponse> register(String username, String email, String password, String phone,
            String firstName, String lastName, List<RoleType> roles, FilePart photo,
            String captchaToken, String captchaAnswer) {

        return authPort.register(username, email, password, phone, firstName, lastName, roles, photo,
                captchaToken, captchaAnswer)
                .flatMap(response -> {
                    boolean isDriver = roles.contains(RoleType.RIDE_AND_GO_DRIVER);

                    if (isDriver) {
                        log.info("🚕 Driver registered, initializing profile for {}", response.userId());

                        // 1. On crée explicitement l'entrée dans la table 'drivers'
                        return driverRepositoryPort.createDriver(response.userId())
                                // 2. On crée le wallet
                                .flatMap(d -> {
                                    log.info("💳 Creating wallet for driver {}", response.userId());
                                    return paymentPort.createWallet(response.userId(), response.username());
                                })
                                .thenReturn(response)
                                .onErrorResume(e -> {
                                    log.error("⚠️ Driver initialization warning: {}", e.getMessage());
                                    // On ne bloque pas l'inscription si le wallet échoue (ex: déjà existant)
                                    return Mono.just(response);
                                });
                    }
                    return Mono.just(response);
                });
    }

    @Override
    public Mono<Void> resetPassword(String email) {
        return authPort.forgotPassword(email);
    }
}