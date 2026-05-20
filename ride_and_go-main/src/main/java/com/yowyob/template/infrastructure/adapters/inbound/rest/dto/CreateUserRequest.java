package com.yowyob.template.infrastructure.adapters.inbound.rest.dto;

import com.yowyob.template.domain.model.enums.RoleType;
import lombok.Builder;
import lombok.Data;

@Data @Builder
public class CreateUserRequest {
    private String email;

    private String name;

    private String telephone;

    private String password;

    private RoleType type;
}