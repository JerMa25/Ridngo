package com.yowyob.template.infrastructure.mappers;

import com.yowyob.template.domain.model.Role;
import com.yowyob.template.infrastructure.adapters.outbound.persistence.entity.RoleEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    Role toDomain(RoleEntity entity);

    RoleEntity toEntity(Role domain);
}
