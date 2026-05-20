package com.yowyob.template.domain.ports.in;

import com.yowyob.template.domain.model.User;
import com.yowyob.template.domain.model.enums.RoleType;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface UserUseCases {
    Mono<User> saveUser(User user);

    Mono<User> getUserById(UUID userId);

    Mono<Boolean> deleteUserById(UUID userId);

    Flux<User> getAllUsers();

    Flux<User> getUsersByRole(RoleType role);
}