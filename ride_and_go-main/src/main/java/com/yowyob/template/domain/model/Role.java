package com.yowyob.template.domain.model;

import com.yowyob.template.domain.model.enums.RoleType;
import lombok.Builder;

import java.util.UUID;

@Builder
public record Role(UUID id, RoleType type) {
}
