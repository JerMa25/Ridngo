package com.yowyob.rideandgo.domain.ports.out;

import com.yowyob.rideandgo.domain.model.RechargeOrder;
import com.yowyob.rideandgo.domain.model.TransactionSummary;
import com.yowyob.rideandgo.domain.model.Wallet;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

public interface PaymentPort {
    Mono<Wallet> createWallet(UUID ownerId, String ownerName);

    Mono<Wallet> getWalletByOwnerId(UUID ownerId);

    Mono<Void> processPayment(UUID walletId, double amount);

    /** Démarre une recharge de wallet via le provider externe (MYCOOLPAY). */
    Mono<RechargeOrder> rechargeWallet(UUID walletId, double amount, String payerReference);

    /**
     * Rafraîchit le statut d'une recharge auprès du provider et crédite le wallet
     * si succès.
     */
    Mono<RechargeOrder> refreshRechargeOrder(String orderId);

    /**
     * Retourne l'historique des transactions blockchain d'un wallet.
     * GET /api/payments/wallets/{walletId}/transactions
     */
    Flux<TransactionSummary> getWalletTransactions(UUID walletId);

    /**
     * Retourne l'historique des ordres de recharge d'un wallet.
     * GET /api/payments/wallets/{walletId}/recharge-orders
     */
    Flux<RechargeOrder> getRechargeOrders(UUID walletId);

    /**
     * Vérifie si le wallet peut effectuer une opération du montant donné.
     * GET /api/payments/wallets/{walletId}/can-operate?amount=
     */
    Mono<Boolean> canOperate(UUID walletId, double amount);

    /**
     * Récupère le wallet, ou le crée s'il n'existe pas encore (RidnGo ne
     * provisionne pas automatiquement de wallet à l'inscription).
     */
    default Mono<Wallet> getOrCreateWallet(UUID ownerId, String ownerName) {
        return getWalletByOwnerId(ownerId)
                .onErrorResume(com.yowyob.rideandgo.domain.exception.WalletNotFoundException.class,
                        e -> createWallet(ownerId, ownerName));
    }
}
