package com.yowyob.rideandgo.domain.model;

import lombok.Builder;

/**
 * Ordre de recharge de wallet via un provider externe (MYCOOLPAY).
 * orderId sert de référence pour appeler /refresh une fois le paiement effectué
 * côté provider.
 */
@Builder
public record RechargeOrder(
                String orderId,
                String walletId,
                double amount,
                String status,
                String redirectUrl) {
}