package com.yowyob.template.infrastructure.adapters.inbound.rest.dto;

public record FareResponse (
        double estimatedFare,
        double officialFare,
        String startLocationName,
        String endLocationName,
        boolean cached) {}