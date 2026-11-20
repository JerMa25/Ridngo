package com.yowyob.rideandgo.infrastructure.security;

import com.yowyob.rideandgo.domain.model.enums.RoleType;
import com.yowyob.rideandgo.domain.ports.out.UserRepositoryPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Valide les JWT émis par le Kernel : signature RS256 (JWKS public), expiration et issuer.
 * Les rôles viennent des claims du token, sinon de la base locale.
 */
@Slf4j
@Component
public class JwtAuthenticationManager implements ReactiveAuthenticationManager {

    // Tokens de test Swagger, acceptés UNIQUEMENT en application.auth.mode=fake
    private static final Map<String, String> STATIC_TOKENS = Map.of(
            "client-token", "7f13909e-7170-4f91-872e-333333333333",
            "driver-1-token", "a1b2c3d4-e5f6-4a5b-8c9d-111111111111",
            "driver-2-token", "a1b2c3d4-e5f6-4a5b-8c9d-222222222222");

    private static final Set<String> KNOWN_ROLES = Arrays.stream(RoleType.values())
            .map(Enum::name).collect(Collectors.toSet());

    private final ReactiveJwtDecoder jwtDecoder;
    private final UserRepositoryPort userRepositoryPort;
    private final boolean fakeMode;

    @Autowired
    public JwtAuthenticationManager(
            @Value("${application.auth.jwks-uri}") String jwksUri,
            @Value("${application.auth.issuer:kernel-core}") String issuer,
            @Value("${application.auth.mode:remote}") String authMode,
            UserRepositoryPort userRepositoryPort) {
        NimbusReactiveJwtDecoder decoder = NimbusReactiveJwtDecoder.withJwkSetUri(jwksUri).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer));
        this.jwtDecoder = decoder;
        this.userRepositoryPort = userRepositoryPort;
        this.fakeMode = "fake".equalsIgnoreCase(authMode);
    }

    // Constructeur de test : décodeur injecté
    JwtAuthenticationManager(ReactiveJwtDecoder jwtDecoder, UserRepositoryPort userRepositoryPort, boolean fakeMode) {
        this.jwtDecoder = jwtDecoder;
        this.userRepositoryPort = userRepositoryPort;
        this.fakeMode = fakeMode;
    }

    @Override
    public Mono<Authentication> authenticate(Authentication authentication) {
        Object credentials = authentication.getCredentials();
        if (credentials == null || credentials.toString().isBlank()) {
            return Mono.empty();
        }
        String authToken = credentials.toString();

        if (STATIC_TOKENS.containsKey(authToken)) {
            if (!fakeMode) {
                return Mono.empty();
            }
            RoleType role = authToken.contains("driver") ? RoleType.RIDE_AND_GO_DRIVER : RoleType.RIDE_AND_GO_PASSENGER;
            return Mono.just(new UsernamePasswordAuthenticationToken(
                    STATIC_TOKENS.get(authToken), authToken, List.of(new SimpleGrantedAuthority(role.name()))));
        }

        return jwtDecoder.decode(authToken)
                .flatMap(jwt -> resolveRoles(jwt).map(roles -> (Authentication) new UsernamePasswordAuthenticationToken(
                        jwt.getSubject(), authToken,
                        roles.stream().map(SimpleGrantedAuthority::new).toList())))
                .onErrorResume(e -> {
                    log.warn("JWT rejeté : {}", e.getMessage());
                    return Mono.empty();
                });
    }

    private Mono<List<String>> resolveRoles(Jwt jwt) {
        List<String> fromToken = Stream.of("roles", "authorities", "permissions")
                .map(jwt::getClaim)
                .filter(Collection.class::isInstance)
                .flatMap(c -> ((Collection<?>) c).stream())
                .map(String::valueOf)
                .map(JwtAuthenticationManager::normalizeRole)
                .filter(KNOWN_ROLES::contains)
                .distinct()
                .toList();
        UUID userId;
        try {
            userId = UUID.fromString(jwt.getSubject());
        } catch (Exception e) {
            return Mono.just(fromToken.isEmpty() ? List.of(RoleType.RIDE_AND_GO_PASSENGER.name()) : fromToken);
        }
        // Union token + base locale : un chauffeur fraîchement promu garde un ancien token sans le rôle DRIVER.
        // shortcut: 1 requête DB par appel authentifié, passer par UserCachePort si la charge augmente
        return userRepositoryPort.findUserById(userId)
                .map(u -> u.roles() == null ? List.<String>of()
                        : u.roles().stream().filter(r -> r.type() != null).map(r -> r.type().name()).toList())
                .defaultIfEmpty(List.of())
                .map(fromDb -> {
                    List<String> all = Stream.concat(fromToken.stream(), fromDb.stream()).distinct().toList();
                    return all.isEmpty() ? List.of(RoleType.RIDE_AND_GO_PASSENGER.name()) : all;
                });
    }

    /** "ROLE_RIDE_AND_GO_DRIVER#TENANT" -> "RIDE_AND_GO_DRIVER" (même format que RemoteAuthAdapter). */
    static String normalizeRole(String authority) {
        String r = authority;
        int hash = r.indexOf('#');
        if (hash >= 0) r = r.substring(0, hash);
        return r.startsWith("ROLE_") ? r.substring(5) : r;
    }
}
