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

    /** Paiement depuis le wallet : le Kernel exige le code MFA émis par startPayment (428 sinon). */
    Mono<Void> processPayment(UUID walletId, double amount, String reference, String challengeToken, String code);

    /** Émet l'épreuve MFA d'un paiement (le code part chez le titulaire) ; renvoie le challengeToken. */
    Mono<String> startPayment(UUID walletId, double amount, String reference);

    /** Démarre une recharge de wallet via le provider externe (MYCOOLPAY). */
    /** method : MOBILE_MONEY | ORANGE_MONEY | MTN_MOBILE_MONEY (MyCoolPay) ou CARD (Stripe). */
    Mono<RechargeOrder> rechargeWallet(UUID walletId, double amount, String payerReference, String method);

    /**
     * Rafraîchit le statut d'une recharge auprès du provider et crédite le wallet
     * si succès.
     */
    Mono<RechargeOrder> refreshRechargeOrder(String orderId);

    /** Retrait étape 1 : renvoie le challengeToken (le code part chez le titulaire). */
    Mono<String> startWithdrawal(UUID walletId, double amount, String phoneNumber);

    /** Retrait étape 2 : renvoie le statut de la transaction de débit. */
    Mono<String> confirmWithdrawal(UUID walletId, double amount, String phoneNumber, String method,
            String recipientName, String challengeToken, String code);

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
