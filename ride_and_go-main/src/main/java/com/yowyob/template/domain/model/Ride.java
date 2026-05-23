package com.yowyob.template.domain.model;

import com.yowyob.template.domain.model.enums.RideState;
import lombok.Builder;

import java.util.UUID;

@Builder
public record Ride(
        UUID id,
        UUID offerId,
        UUID passengerId,
        UUID driverId,
        double distance,
        int duration,
        RideState state,
        int timeReal) {}
