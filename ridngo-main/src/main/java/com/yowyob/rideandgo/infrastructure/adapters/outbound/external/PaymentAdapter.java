package com.yowyob.rideandgo.infrastructure.adapters.outbound.external;

import com.yowyob.rideandgo.domain.exception.WalletNotFoundException;
import com.yowyob.rideandgo.domain.model.RechargeOrder;
import com.yowyob.rideandgo.domain.model.TransactionSummary;
import com.yowyob.rideandgo.domain.model.Wallet;
import com.yowyob.rideandgo.domain.ports.out.PaymentPort;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.PaymentApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

/**
 * Adaptateur vers le Kernel Core (payment-controller).
 * URL: https://kernel-core.yowyob.com/kernel-api
 *
 * Toutes les réponses Kernel sont encapsulées dans KernelResponse<T> ;
 * le champ "data" est extrait avant mapping vers les modèles de domaine.
 *
 * NB : partout où le Kernel attend "organizationId", on passe l'ownerId.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentAdapter implements PaymentPort {

        private final PaymentApiClient client;

        /** Identifiant client injecté dans les requêtes de recharge */
        @Value("${application.kernel.client-id}")
        private String kernelClientId;

        /** Taux de commission Ridngo (10% par défaut) */
        private static final double COMMISSION_RATE = 0.10;

        // ─── Wallet ───────────────────────────────────────────────────────────────

        @Override
        public Mono<Wallet> createWallet(UUID ownerId, String ownerName) {
                String label = "Wallet_" + ownerId.toString().substring(0, 5);
                log.info("💳 [Kernel] Création du wallet pour owner {} (label={})", ownerId, label);
                // Un wallet personnel se crée avec le token de son titulaire (/wallets/mine) ; créé "pour" un
                // autre id, le Kernel répond 403 WALLET_ACCESS_DENIED (vu en réel sur le tenant cad65f4e).
                return isCurrentUser(ownerId)
                                .flatMap(self -> self
                                                ? client.createMyWallet(new PaymentApiClient.CreateWalletRequest(null, label))
                                                : client.createWallet(new PaymentApiClient.CreateWalletRequest(
                                                                ownerId.toString(), label)))
                                .flatMap(resp -> {
                                        if (!resp.success() || resp.data() == null) {
                                                log.error("❌ Réponse Kernel invalide pour createWallet: {}",
                                                                resp.message());
                                                return Mono.error(new RuntimeException(
                                                                "Impossible de créer le portefeuille : "
                                                                                + resp.message()));
                                        }
                                        return Mono.just(mapWalletToDomain(resp.data()));
                                })
                                .onErrorResume(WebClientResponseException.class, ex -> {
                                        log.error("❌ Création wallet échouée pour {}: {} — {}",
                                                        ownerId, ex.getStatusCode(), ex.getResponseBodyAsString());
                                        return Mono.error(new RuntimeException(
                                                        "Impossible de créer le portefeuille Kernel."));
                                });
        }

        private Mono<Boolean> isCurrentUser(UUID ownerId) {
                return org.springframework.security.core.context.ReactiveSecurityContextHolder.getContext()
                                .map(ctx -> ctx.getAuthentication() != null
                                                && ownerId.toString().equals(ctx.getAuthentication().getName()))
                                .defaultIfEmpty(false);
        }

        @Override
        public Mono<Wallet> getWalletByOwnerId(UUID ownerId) {
                log.info("💳 [Kernel] Récupération wallet pour owner {}", ownerId);
                return isCurrentUser(ownerId)
                                .flatMap(self -> self ? client.getMyWallet()
                                                : client.getWalletByOwnerId(ownerId.toString()))
                                .flatMap(resp -> {
                                        if (!resp.success() || resp.data() == null) {
                                                log.warn("⚠️ Wallet introuvable pour owner {}: {}", ownerId,
                                                                resp.message());
                                                return Mono.error(new WalletNotFoundException(
                                                                "Votre portefeuille de paiement n'a pas été trouvé."));
                                        }
                                        return Mono.just(mapWalletToDomain(resp.data()));
                                })
                                .onErrorResume(WebClientResponseException.class, ex -> {
                                        log.error("❌ Wallet introuvable pour owner {}: {} — {}",
                                                        ownerId, ex.getStatusCode(), ex.getResponseBodyAsString());
                                        return Mono.error(new WalletNotFoundException(
                                                        "Votre portefeuille de paiement n'a pas été trouvé. Veuillez contacter le support."));
                                });
        }

        // ─── Paiement (débit wallet) ───────────────────────────────────────────────

        /**
         * Traite le paiement d'une course via le wallet.
         * L'endpoint /pay du Kernel attend une transaction blockchain signée.
         * On utilise ici des valeurs Ridngo fixes pour sourceService et chainCode.
         * La signature est simplifiée (à renforcer si le Kernel valide la crypto).
         */
        @Override
        public Mono<String> startPayment(UUID walletId, double amount, String reference) {
                log.info("🔐 [Kernel] Épreuve de paiement de {} XAF ({}) pour le wallet {}", amount, reference, walletId);
                return client.payChallenge(walletId.toString(), new PaymentApiClient.PayChallengeRequest(amount, reference))
                                .flatMap(resp -> resp.success() && resp.data() != null && resp.data().challengeToken() != null
                                                ? Mono.just(resp.data().challengeToken())
                                                : Mono.error(new IllegalStateException(resp.message() != null ? resp.message()
                                                                : "Le Kernel n'a pas pu préparer le paiement.")))
                                .onErrorMap(WebClientResponseException.class, ex -> {
                                        log.error("❌ Épreuve de paiement refusée : {} — {}", ex.getStatusCode(), ex.getResponseBodyAsString());
                                        return new IllegalStateException(kernelMessage(ex, "Paiement impossible pour le moment."));
                                });
        }

        @Override
        public Mono<Void> processPayment(UUID walletId, double offerPrice, String sourceRef, String challengeToken,
                        String code) {
                log.info("💸 [Kernel] Paiement de {} XAF depuis le wallet {}", offerPrice, walletId);

                return client.payFromWallet(
                                walletId.toString(),
                                new PaymentApiClient.PayRequest(offerPrice, "XAF", sourceRef, challengeToken, code))
                                .flatMap(resp -> {
                                        if (!resp.success() || resp.data() == null) {
                                                log.error("❌ Paiement Kernel rejeté pour wallet {}: {}", walletId,
                                                                resp.message());
                                                return Mono.error(new RuntimeException(
                                                                "Échec de la transaction de paiement : "
                                                                                + resp.message()));
                                        }
                                        log.info("✅ Paiement effectué — transaction {}", resp.data().id());
                                        return Mono.empty();
                                })
                                .onErrorResume(WebClientResponseException.class, ex -> {
                                        log.error("❌ Paiement échoué pour wallet {}: {} — {}",
                                                        walletId, ex.getStatusCode(), ex.getResponseBodyAsString());
                                        // IllegalStateException → 400 avec le motif Kernel (solde, code requis…) au lieu d'un 500
                                        return Mono.error(new IllegalStateException(
                                                        "Commission non prélevée : " + kernelMessage(ex, "vérifiez votre solde.")));
                                })
                                .then();
        }

        // ─── Recharge ─────────────────────────────────────────────────────────────

        @Override
        public Mono<RechargeOrder> rechargeWallet(UUID walletId, double amount, String payerReference, String method) {
                log.info("💰 [Kernel] Recharge de {} XAF pour wallet {} (payerRef={}, méthode={})", amount, walletId,
                                payerReference, method);
                String idempotencyKey = walletId + "_" + System.currentTimeMillis();

                return client.rechargeWallet(walletId.toString(),
                                new PaymentApiClient.RechargeRequest(amount, "XAF", kernelClientId,
                                                "CARD".equals(method) ? "STRIPE" : "MYCOOLPAY", method, payerReference,
                                                idempotencyKey))
                                .flatMap(resp -> {
                                        if (!resp.success() || resp.data() == null) {
                                                log.error("❌ Recharge Kernel rejetée pour wallet {}: {}", walletId,
                                                                resp.message());
                                                return Mono.error(new RuntimeException(
                                                                "Impossible de démarrer la recharge : "
                                                                                + resp.message()));
                                        }
                                        var o = resp.data();
                                        log.info("💰 [Kernel] Ordre de recharge {} : statut={} provider={} paymentOrder={} redirectUrl={}",
                                                        o.orderId(), o.status(), o.providerReference(), o.paymentOrderId(),
                                                        o.redirectUrl() == null ? "aucune" : o.redirectUrl().replaceAll("\\?.*", "?…"));
                                        return Mono.just(mapRechargeOrderToDomain(o));
                                })
                                .onErrorResume(WebClientResponseException.class, ex -> {
                                        log.error("❌ Recharge échouée pour wallet {}: {} — {}",
                                                        walletId, ex.getStatusCode(), ex.getResponseBodyAsString());
                                        return Mono.error(new RuntimeException(
                                                        "Impossible de démarrer la recharge Kernel."));
                                });
        }

        @Override
        public Mono<String> startWithdrawal(UUID walletId, double amount, String phoneNumber) {
                log.info("🏧 [Kernel] Demande de retrait de {} XAF du wallet {}", amount, walletId);
                return client.withdrawalChallenge(walletId.toString(),
                                new PaymentApiClient.WithdrawalChallengeRequest(amount, phoneNumber))
                                .flatMap(resp -> resp.success() && resp.data() != null && resp.data().challengeToken() != null
                                                ? Mono.just(resp.data().challengeToken())
                                                : Mono.error(new IllegalStateException(resp.message() != null ? resp.message()
                                                                : "Le Kernel n'a pas pu préparer le retrait.")))
                                .onErrorMap(WebClientResponseException.class, ex -> {
                                        log.error("❌ Préparation du retrait refusée : {} — {}", ex.getStatusCode(),
                                                        ex.getResponseBodyAsString());
                                        return new IllegalStateException(kernelMessage(ex, "Retrait impossible pour le moment."));
                                });
        }

        @Override
        public Mono<String> confirmWithdrawal(UUID walletId, double amount, String phoneNumber, String method,
                        String recipientName, String challengeToken, String code) {
                log.info("🏧 [Kernel] Confirmation du retrait de {} XAF du wallet {} ({})", amount, walletId, method);
                return client.withdraw(walletId.toString(), new PaymentApiClient.WithdrawalRequest(amount, "XAF",
                                phoneNumber, method, recipientName, challengeToken, code))
                                .flatMap(resp -> resp.success() && resp.data() != null
                                                ? Mono.just(resp.data().status() == null ? "SUBMITTED" : resp.data().status())
                                                : Mono.error(new IllegalStateException(resp.message() != null ? resp.message()
                                                                : "Le retrait a été refusé.")))
                                .onErrorMap(WebClientResponseException.class, ex -> {
                                        log.error("❌ Retrait refusé : {} — {}", ex.getStatusCode(), ex.getResponseBodyAsString());
                                        return new IllegalStateException(kernelMessage(ex, "Le retrait a été refusé."));
                                });
        }

        /** Message Kernel lisible (ex. solde insuffisant, nom du titulaire différent, code invalide). */
        private static String kernelMessage(WebClientResponseException ex, String fallback) {
                try {
                        String m = new com.fasterxml.jackson.databind.ObjectMapper().readTree(ex.getResponseBodyAsString())
                                        .path("message").asText("");
                        return m.isBlank() ? fallback : m;
                } catch (Exception e) {
                        return fallback;
                }
        }

        @Override
        public Mono<RechargeOrder> refreshRechargeOrder(String orderId) {
                log.info("🔄 [Kernel] Rafraîchissement de la recharge {}", orderId);
                return client.refreshRechargeOrder(orderId)
                                .flatMap(resp -> {
                                        if (!resp.success() || resp.data() == null) {
                                                log.error("❌ Refresh recharge Kernel rejeté pour {}: {}", orderId,
                                                                resp.message());
                                                return Mono.error(new RuntimeException(
                                                                "Impossible de rafraîchir le statut de la recharge : "
                                                                                + resp.message()));
                                        }
                                        var o = resp.data();
                                        log.info("💰 [Kernel] Ordre de recharge {} : statut={} provider={} paymentOrder={} redirectUrl={}",
                                                        o.orderId(), o.status(), o.providerReference(), o.paymentOrderId(),
                                                        o.redirectUrl() == null ? "aucune" : o.redirectUrl().replaceAll("\\?.*", "?…"));
                                        return Mono.just(mapRechargeOrderToDomain(o));
                                })
                                .onErrorResume(WebClientResponseException.class, ex -> {
                                        log.error("❌ Refresh recharge échoué pour {}: {} — {}",
                                                        orderId, ex.getStatusCode(), ex.getResponseBodyAsString());
                                        return Mono.error(new RuntimeException(
                                                        "Impossible de rafraîchir le statut de la recharge."));
                                });
        }

        // ─── Transactions & Can-Operate ────────────────────────────────────────────

        @Override
        public Flux<TransactionSummary> getWalletTransactions(UUID walletId) {
                log.info("📋 [Kernel] Historique des transactions pour wallet {}", walletId);
                return client.getTransactions(walletId.toString())
                                .flatMapMany(resp -> {
                                        if (!resp.success() || resp.data() == null) {
                                                log.warn("⚠️ Aucune transaction pour wallet {}: {}", walletId,
                                                                resp.message());
                                                return Flux.empty();
                                        }
                                        return Flux.fromIterable(resp.data())
                                                        .map(this::mapTransactionToDomain);
                                })
                                .onErrorResume(WebClientResponseException.class, ex -> {
                                        log.error("❌ Erreur transactions pour wallet {}: {} — {}",
                                                        walletId, ex.getStatusCode(), ex.getResponseBodyAsString());
                                        return Flux.empty();
                                });
        }

        @Override
        public Flux<RechargeOrder> getRechargeOrders(UUID walletId) {
                log.info("📋 [Kernel] Historique des recharges pour wallet {}", walletId);
                return client.getRechargeOrders(walletId.toString())
                                .flatMapMany(resp -> {
                                        if (!resp.success() || resp.data() == null) {
                                                log.warn("⚠️ Aucun ordre de recharge pour wallet {}: {}", walletId,
                                                                resp.message());
                                                return Flux.empty();
                                        }
                                        return Flux.fromIterable(resp.data())
                                                        .map(this::mapRechargeOrderToDomain);
                                })
                                .onErrorResume(WebClientResponseException.class, ex -> {
                                        log.error("❌ Erreur recharge-orders pour wallet {}: {} — {}",
                                                        walletId, ex.getStatusCode(), ex.getResponseBodyAsString());
                                        return Flux.empty();
                                });
        }

        @Override
        public Mono<Boolean> canOperate(UUID walletId, double amount) {
                log.info("🔍 [Kernel] Vérification can-operate pour wallet {} montant {}", walletId, amount);
                return client.canOperate(walletId.toString(), amount)
                                .flatMap(resp -> {
                                        if (!resp.success()) {
                                                return Mono.just(false);
                                        }
                                        return Mono.just(Boolean.TRUE.equals(resp.data()));
                                })
                                .onErrorResume(WebClientResponseException.class, ex -> {
                                        log.error("❌ Erreur can-operate pour wallet {}: {} — {}",
                                                        walletId, ex.getStatusCode(), ex.getResponseBodyAsString());
                                        return Mono.just(false);
                                });
        }

        // ─── Mappers ──────────────────────────────────────────────────────────────

        private Wallet mapWalletToDomain(PaymentApiClient.WalletData data) {
                return Wallet.builder()
                                .id(data.id() != null ? UUID.fromString(data.id()) : UUID.randomUUID())
                                .ownerId(data.ownerId() != null ? UUID.fromString(data.ownerId()) : UUID.randomUUID())
                                .ownerName(data.ownerName() != null ? data.ownerName() : "Inconnu")
                                .balance(data.balance())
                                .build();
        }

        private RechargeOrder mapRechargeOrderToDomain(PaymentApiClient.RechargeOrderData data) {
                return RechargeOrder.builder()
                                .orderId(data.orderId())
                                .walletId(data.walletId())
                                .amount(data.amount())
                                .status(data.status())
                                .redirectUrl(data.redirectUrl())
                                .build();
        }

        private TransactionSummary mapTransactionToDomain(PaymentApiClient.TransactionData data) {
                return TransactionSummary.builder()
                                .id(data.id())
                                .organizationId(data.organizationId())
                                .chainCode(data.chainCode())
                                .transactionType(data.transactionType())
                                .sourceService(data.sourceService())
                                .sourceReference(data.sourceReference())
                                .transactionHash(data.transactionHash())
                                .status(data.status())
                                .createdAt(data.createdAt())
                                .minedAt(data.minedAt())
                                .build();
        }
}