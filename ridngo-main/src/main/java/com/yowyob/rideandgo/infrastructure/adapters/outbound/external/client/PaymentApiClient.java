package com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;
import reactor.core.publisher.Mono;
import java.util.List;

/**
 * * Client HTTP vers le Kernel Core (payment-controller).
 * Base URL: https://kernel-core.yowyob.com/kernel-api
 * Headers injectés: X-Client-Id, X-Api-Key (kernelAuthFilter)
 * Authorization: Bearer (addBearerToken)
 *
 * Routes conformes à la spec YowYob Payment BFF.
 * Toutes les réponses Kernel sont enveloppées dans :
 * { success, data, message, errorCode, timestamp }
 */
@HttpExchange("")
public interface PaymentApiClient {

        // ─── Wallets ──────────────────────────────────────────────────────────────

        /**
         * POST /api/payments/wallets — créer un wallet.
         * Body: { organizationId (= ownerId), label }
         */
        @PostExchange("/api/payments/wallets")
        Mono<KernelResponse<WalletData>> createWallet(@RequestBody CreateWalletRequest request);

        /**
         * GET /api/payments/wallets/owner/{ownerId} — récupérer le wallet d'un owner.
         */
        /** Wallet personnel du porteur du token (seule façon de créer/lire le sien dans ce Kernel). */
        @PostExchange("/api/payments/wallets/mine")
        Mono<KernelResponse<WalletData>> createMyWallet(@RequestBody CreateWalletRequest request);

        @GetExchange("/api/payments/wallets/mine")
        Mono<KernelResponse<WalletData>> getMyWallet();

        @GetExchange("/api/payments/wallets/owner/{ownerId}")
        Mono<KernelResponse<WalletData>> getWalletByOwnerId(@PathVariable("ownerId") String ownerId);

        /**
         * GET /api/payments/wallets/{walletId} — récupérer un wallet par son ID.
         */
        @GetExchange("/api/payments/wallets/{walletId}")
        Mono<KernelResponse<WalletData>> getWalletById(@PathVariable("walletId") String walletId);

        // ─── Transactions ─────────────────────────────────────────────────────────

        /**
         * GET /api/payments/wallets/{walletId}/transactions — historique des
         * transactions
         */
        @GetExchange("/api/payments/wallets/{walletId}/transactions")
        Mono<KernelResponse<List<TransactionData>>> getTransactions(@PathVariable("walletId") String walletId);

        /**
         * GET /api/payments/wallets/{walletId}/can-operate?amount= — vérifier si
         * l'opération est possible.
         */
        @GetExchange("/api/payments/wallets/{walletId}/can-operate")
        Mono<KernelResponse<Boolean>> canOperate(
                        @PathVariable("walletId") String walletId,
                        @RequestParam("amount") double amount);

        // ─── Recharge ─────────────────────────────────────────────────────────────

        /**
         * POST /api/payments/wallets/{walletId}/recharge — démarrer une recharge via
         * provider (MYCOOLPAY).
         * Body: { amount, currency, clientId, provider, method, payerReference,
         * idempotencyKey }
         */
        @PostExchange("/api/payments/wallets/{walletId}/recharge")
        Mono<KernelResponse<RechargeOrderData>> rechargeWallet(
                        @PathVariable("walletId") String walletId,
                        @RequestBody RechargeRequest request);

        /**
         * GET /api/payments/wallets/{walletId}/recharge-orders — historique des
         * recharges.
         */
        @GetExchange("/api/payments/wallets/{walletId}/recharge-orders")
        Mono<KernelResponse<List<RechargeOrderData>>> getRechargeOrders(@PathVariable("walletId") String walletId);

        /**
         * GET /api/payments/wallets/recharge-orders/{orderId} — détail d'une recharge
         */
        @GetExchange("/api/payments/wallets/recharge-orders/{orderId}")
        Mono<KernelResponse<RechargeOrderData>> getRechargeOrder(@PathVariable("orderId") String orderId);

        /**
         * POST /api/payments/wallets/recharge-orders/{orderId}/refresh — confirmer
         * statut
         * provider et créditer wallet si succès.
         */
        /** Retrait étape 1 : le Kernel envoie un code au titulaire et renvoie un challengeToken. */
        @PostExchange("/api/payments/wallets/{walletId}/withdrawals/challenge")
        Mono<KernelResponse<WithdrawalChallengeData>> withdrawalChallenge(@PathVariable("walletId") String walletId,
                        @RequestBody WithdrawalChallengeRequest request);

        /** Retrait étape 2 : débit du wallet et envoi vers le Mobile Money (nom vérifié par l'opérateur). */
        @PostExchange("/api/payments/wallets/{walletId}/withdrawals")
        Mono<KernelResponse<TransactionData>> withdraw(@PathVariable("walletId") String walletId,
                        @RequestBody WithdrawalRequest request);

        record WithdrawalChallengeRequest(double amount, String phoneNumber) {
        }

        @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
        record WithdrawalChallengeData(String challengeToken, Integer expiresInSeconds) {
        }

        record WithdrawalRequest(double amount, String currency, String phoneNumber, String method,
                        String recipientName, String challengeToken, String code) {
        }

        @PostExchange("/api/payments/wallets/recharge-orders/{orderId}/refresh")
        Mono<KernelResponse<RechargeOrderData>> refreshRechargeOrder(@PathVariable("orderId") String orderId);

        // ─── Paiement (débit wallet) ───────────────────────────────────────────────

        /**
         * POST /api/payments/wallets/{walletId}/pay — débiter le wallet (transaction
         * blockchain).
         * Body: { organizationId, chainCode, transactionType, sourceService,
         * sourceReference,
         * payload, payloadHash, senderPublicKey, signature }
         */
        @PostExchange("/api/payments/wallets/{walletId}/pay")
        Mono<KernelResponse<TransactionData>> payFromWallet(
                        @PathVariable("walletId") String walletId,
                        @RequestBody PayRequest request);

        @PostExchange("/api/payments/wallets/{walletId}/pay/challenge")
        Mono<KernelResponse<WithdrawalChallengeData>> payChallenge(@PathVariable("walletId") String walletId,
                        @RequestBody PayChallengeRequest request);

        record PayChallengeRequest(double amount, String reference) {
        }

        /**
         * Format réel de /pay (testé : sans "amount" au premier niveau → "amount must be strictly positive").
         * Le TransactionRequest du swagger ne correspond pas à ce que le Kernel lit.
         */
        @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
        record PayRequest(double amount, String currency, String reference, String challengeToken, String code) {
        }

        // =========================================================================
        // Enveloppe générique Kernel
        // =========================================================================

        /**
         * Enveloppe standard de toutes les réponses Kernel Core.
         * { success, data, message, errorCode, timestamp }
         */
        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelResponse<T>(
                        boolean success,
                        T data,
                        String message,
                        String errorCode,
                        String timestamp) {
        }

        // =========================================================================
        // DTOs — Requêtes
        // =========================================================================

        /**
         * Requête de création de wallet.
         * 
         * organizationId = ownerId (UUID du chauffeur/passager).
         * label = libellé du wallet (ex. "Wallet_<prefix ownerId>").
         */
        @JsonIgnoreProperties(ignoreUnknown = true)
        record CreateWalletRequest(
                        String organizationId,
                        String label) {
        }

        @JsonInclude(JsonInclude.Include.NON_NULL)
        record RechargeRequest(
                        double amount,
                        String currency,
                        String clientId,
                        String provider,
                        String method,
                        String payerReference,
                        String idempotencyKey) {
                /** Constructeur de commodité : MYCOOLPAY / MOBILE_MONEY / XAF */
                public RechargeRequest(double amount, String payerReference, String clientId, String idempotencyKey) {
                        this(amount, "XAF", clientId, "MYCOOLPAY", "MOBILE_MONEY", payerReference, idempotencyKey);
                }
        }

        /**
         * Requête de paiement (débit wallet — transaction blockchain Kernel).
         * organizationId : ownerId du wallet (propriétaire)
         * chainCode : code de la chaîne (ex. "RIDNGO")
         * transactionType: type de transaction (ex. "RIDE_PAYMENT")
         * sourceService : service source (ex. "ridngo-backend")
         * sourceReference: référence externe (ex. rideId)
         * payload : payload JSON base64 ou stringifié
         * payloadHash : hash SHA-256 du payload
         * senderPublicKey: clé publique de l'émetteur
         * signature : signature de la transaction
         */
        @JsonInclude(JsonInclude.Include.NON_NULL)
        record PaymentRequest(
                        String organizationId,
                        String chainCode,
                        String transactionType,
                        String sourceService,
                        String sourceReference,
                        String payload,
                        String payloadHash,
                        String senderPublicKey,
                        String signature) {
        }

        // =========================================================================
        // DTOs — Réponses (champ "data" de l'enveloppe KernelResponse)
        // =========================================================================
        /**
         * Données d'un wallet Kernel.
         */
        @JsonIgnoreProperties(ignoreUnknown = true)
        record WalletData(
                        String id,
                        String ownerId,
                        String ownerName,
                        double balance,
                        String createdAt,
                        String updatedAt) {
        }

        /**
         * Données d'une transaction blockchain Kernel.
         */
        @JsonIgnoreProperties(ignoreUnknown = true)
        record TransactionData(
                        String id,
                        String organizationId,
                        String chainCode,
                        String transactionType,
                        String sourceService,
                        String sourceReference,
                        String payloadHash,
                        String senderFingerprint,
                        String transactionHash,
                        String status,
                        String blockId,
                        Integer blockHeight,
                        String createdAt,
                        String minedAt) {
        }

        /**
         * Données d'un ordre de recharge Kernel.
         */
        @JsonIgnoreProperties(ignoreUnknown = true)
        record RechargeOrderData(
                        String orderId,
                        String walletId,
                        String paymentOrderId,
                        String transactionId,
                        String status,
                        double amount,
                        String currency,
                        String redirectUrl,
                        String providerReference,
                        String createdAt,
                        String updatedAt) {
        }
}