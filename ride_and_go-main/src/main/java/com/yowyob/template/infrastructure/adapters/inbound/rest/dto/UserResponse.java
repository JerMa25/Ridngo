package com.yowyob.template.infrastructure.adapters.inbound.rest.dto;

import com.yowyob.template.domain.model.enums.RoleType;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data @Builder
public class UserResponse {
    private UUID id;

    private String name;

    private String email;

    private String telephone;

    RoleType role;
}
