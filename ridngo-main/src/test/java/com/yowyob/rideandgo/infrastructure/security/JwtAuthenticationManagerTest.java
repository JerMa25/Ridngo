package com.yowyob.rideandgo.infrastructure.security;

import com.yowyob.rideandgo.domain.model.Role;
import com.yowyob.rideandgo.domain.model.User;
import com.yowyob.rideandgo.domain.model.enums.RoleType;
import com.yowyob.rideandgo.domain.ports.out.UserRepositoryPort;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtAuthenticationManagerTest {

    private final ReactiveJwtDecoder decoder = mock(ReactiveJwtDecoder.class);
    private final UserRepositoryPort users = mock(UserRepositoryPort.class);

    private static Authentication bearer(String token) {
        return new UsernamePasswordAuthenticationToken(token, token);
    }

    private static List<String> authorities(Authentication a) {
        return a.getAuthorities().stream().map(GrantedAuthority::getAuthority).sorted().toList();
    }

    @Test
    void forgedTokenIsRejected() {
        when(decoder.decode(any())).thenReturn(Mono.error(new BadJwtException("bad signature")));
        StepVerifier.create(new JwtAuthenticationManager(decoder, users, false).authenticate(bearer("a.b.c")))
                .verifyComplete();
    }

    @Test
    void staticTestTokensRejectedOutsideFakeMode() {
        StepVerifier.create(new JwtAuthenticationManager(decoder, users, false).authenticate(bearer("driver-1-token")))
                .verifyComplete();
    }

    @Test
    void staticTestTokensAcceptedInFakeMode() {
        StepVerifier.create(new JwtAuthenticationManager(decoder, users, true).authenticate(bearer("driver-1-token")))
                .assertNext(a -> assertEquals(List.of("RIDE_AND_GO_DRIVER"), authorities(a)))
                .verifyComplete();
    }

    @Test
    void rolesComeFromTokenAndLocalDatabase() {
        UUID id = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("t").header("alg", "RS256").subject(id.toString())
                .claim("permissions", List.of("ROLE_RIDE_AND_GO_PASSENGER#TENANT", "rides:read"))
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
        when(decoder.decode("t")).thenReturn(Mono.just(jwt));
        when(users.findUserById(id)).thenReturn(Mono.just(User.builder().id(id)
                .roles(Set.of(Role.builder().type(RoleType.RIDE_AND_GO_DRIVER).build())).build()));

        StepVerifier.create(new JwtAuthenticationManager(decoder, users, false).authenticate(bearer("t")))
                .assertNext(a -> {
                    assertEquals(id.toString(), a.getName());
                    assertEquals(List.of("RIDE_AND_GO_DRIVER", "RIDE_AND_GO_PASSENGER"), authorities(a));
                })
                .verifyComplete();
    }

    @Test
    void unknownUserDefaultsToPassenger() {
        UUID id = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("t").header("alg", "RS256").subject(id.toString())
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
        when(decoder.decode("t")).thenReturn(Mono.just(jwt));
        when(users.findUserById(id)).thenReturn(Mono.empty());

        StepVerifier.create(new JwtAuthenticationManager(decoder, users, false).authenticate(bearer("t")))
                .assertNext(a -> assertEquals(List.of("RIDE_AND_GO_PASSENGER"), authorities(a)))
                .verifyComplete();
    }

    @Test
    void normalizeRoleStripsPrefixAndScope() {
        assertEquals("RIDE_AND_GO_DRIVER", JwtAuthenticationManager.normalizeRole("ROLE_RIDE_AND_GO_DRIVER#TENANT"));
    }
}
