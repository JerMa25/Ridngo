package com.yowyob.template.infrastructure.adapters.inbound.rest.dto;

import com.yowyob.template.domain.model.enums.OfferState;

import java.util.UUID;

public record CreateOfferRequest(
        UUID passengerId,
        String startPoint,
        String endPoint,
        double price,
        OfferState state
) {}
