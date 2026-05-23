package com.yowyob.template.infrastructure.mappers;

import com.yowyob.template.domain.model.Ride;
import com.yowyob.template.infrastructure.adapters.inbound.rest.dto.RideResponse;
import com.yowyob.template.infrastructure.adapters.outbound.persistence.entity.RideEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RideMapper {
    Ride toDomain(RideEntity entity);

    RideEntity toEntity(Ride domain);

    RideResponse toResponse(Ride domain);
}
