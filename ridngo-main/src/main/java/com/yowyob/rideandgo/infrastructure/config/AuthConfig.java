package com.yowyob.rideandgo.infrastructure.config;

import com.yowyob.rideandgo.domain.ports.out.AuthPort;
import com.yowyob.rideandgo.domain.ports.out.CacheInvalidationPort;
import com.yowyob.rideandgo.domain.ports.out.UserRepositoryPort;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.FakeAuthAdapter;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.RemoteAuthAdapter;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.AuthApiClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AuthConfig {
    private final UserRepositoryPort userRepositoryPort;

    public AuthConfig(UserRepositoryPort userRepositoryPort) {
        this.userRepositoryPort = userRepositoryPort;
    }

    @Bean
    @ConditionalOnProperty(name = "application.auth.mode", havingValue = "fake")
    public AuthPort fakeAuthPort() {
        return new FakeAuthAdapter();
    }

    @Bean
    @ConditionalOnProperty(name = "application.auth.mode", havingValue = "remote", matchIfMissing = true)
    public AuthPort remoteAuthPort(AuthApiClient authApiClient,
            UserRepositoryPort userRepositoryPort,
            CacheInvalidationPort cacheInvalidationPort,
            @org.springframework.beans.factory.annotation.Value("${application.kernel.tenant-id}") String tenantId,
            org.springframework.data.redis.core.ReactiveRedisTemplate<String, Object> redisTemplate,
            @org.springframework.beans.factory.annotation.Value("${application.vehicle.organization-id}") String organizationId) {
        return new RemoteAuthAdapter(authApiClient, userRepositoryPort, cacheInvalidationPort, tenantId, redisTemplate,
                organizationId);
    }

    @Bean
    @ConditionalOnProperty(name = "application.auth.mode", havingValue = "fake")
    public com.yowyob.rideandgo.domain.ports.out.ExternalUserPort fakeUserPort() {
        return new com.yowyob.rideandgo.infrastructure.adapters.outbound.external.FakeUserAdapter(userRepositoryPort);
    }

    @Bean
    @ConditionalOnProperty(name = "application.auth.mode", havingValue = "remote", matchIfMissing = true)
    public com.yowyob.rideandgo.domain.ports.out.ExternalUserPort remoteUserPort(AuthApiClient authApiClient,
            @org.springframework.beans.factory.annotation.Value("${application.kernel.tenant-id}") String tenantId,
            @org.springframework.beans.factory.annotation.Value("${application.vehicle.organization-id}") String organizationId,
            org.springframework.data.redis.core.ReactiveRedisTemplate<String, Object> redisTemplate) {
        return new com.yowyob.rideandgo.infrastructure.adapters.outbound.external.RemoteUserAdapter(authApiClient,
                tenantId, organizationId, redisTemplate);
    }
}