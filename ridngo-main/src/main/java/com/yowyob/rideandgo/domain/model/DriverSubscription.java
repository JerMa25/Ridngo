package com.yowyob.rideandgo.domain.model;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

/** Abonnement chauffeur : aucune commission par course entre startsAt et endsAt. */
@Builder
public record DriverSubscription(
        UUID id,
        UUID driverId,
        String plan,
        double amount,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        String paymentReference,
        LocalDateTime createdAt
) {
    public boolean isActiveAt(LocalDateTime when) {
        return !when.isBefore(startsAt) && when.isBefore(endsAt);
    }
}
