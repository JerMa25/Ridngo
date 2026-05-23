package com.yowyob.template.domain.ports.out;

import com.yowyob.template.domain.model.Role;
import com.yowyob.template.domain.model.enums.RoleType;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface RoleRepositoryPort {
    Mono<Role> findRoleById(UUID roleId);

    Mono<Role> findByRoleName(RoleType type);
}
