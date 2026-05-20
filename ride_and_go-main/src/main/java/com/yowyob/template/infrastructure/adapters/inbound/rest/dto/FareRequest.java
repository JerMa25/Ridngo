package com.yowyob.template.infrastructure.adapters.inbound.rest.dto;

public record FareRequest(
        String startLocationName,
        String endLocationName,
        String departureTime) {}