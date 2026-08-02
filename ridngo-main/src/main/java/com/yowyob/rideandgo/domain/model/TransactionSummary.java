package com.yowyob.rideandgo.domain.model;

import lombok.Builder;

/**
 * Résumé d'une transaction blockchain Kernel.
 * Retournée par GET /api/payments/wallets/{walletId}/transactions.
 */
@Builder
public record TransactionSummary(
                String id,
                String organizationId,
                String chainCode,
                String transactionType,
                String sourceService,
                String sourceReference,
                String transactionHash,
                String status,
                String createdAt,
                String minedAt) {
}
