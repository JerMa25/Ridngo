package com.yowyob.template.domain.model;

import java.util.UUID;

public record Fare(
        UUID id,
        UUID userId,
        String startPoint,
        String endPoint,
        int estimatedFare,
        int officialFare) {
}
