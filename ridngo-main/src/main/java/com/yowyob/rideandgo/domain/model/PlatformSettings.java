package com.yowyob.rideandgo.domain.model;

import lombok.Builder;

import java.time.LocalDateTime;

/** Réglages de la plateforme, modifiables par l'admin. */
@Builder(toBuilder = true)
public record PlatformSettings(
        double commissionRate,
        double monthlyPrice,
        double yearlyPrice,
        boolean subscriptionsEnabled,
        LocalDateTime updatedAt
) {
}
