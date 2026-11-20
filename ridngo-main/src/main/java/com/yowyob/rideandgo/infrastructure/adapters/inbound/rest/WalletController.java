package com.yowyob.rideandgo.infrastructure.adapters.inbound.rest;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.yowyob.rideandgo.domain.model.RechargeOrder;
import com.yowyob.rideandgo.domain.model.TransactionSummary;
import com.yowyob.rideandgo.domain.model.Wallet;
import com.yowyob.rideandgo.domain.ports.out.PaymentPort;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

/**
 * Controller REST pour la gestion du wallet chauffeur.
 *
 * Flux fonctionnel :
 *  1. GET /me         → récupère (ou crée) le wallet
 *  2. POST /me/recharge → initie la recharge via MYCOOLPAY, retourne redirectUrl
 *  3. POST /recharge-orders/{orderId}/refresh → confirme le paiement et crédite le wallet
 *  4. GET /me/transactions   → historique des transactions blockchain
 *  5. GET /me/recharge-orders → historique des recharges
 *  6. GET /me/can-operate?amount= → vérifie si opération possible
 */
@RestController
@RequestMapping("/api/v1/wallets")
@RequiredArgsConstructor
@Tag(name = "Payment-Wallet", description = "Driver balance and transaction management")
public class WalletController {

    private final PaymentPort paymentPort;

    // ─── Wallet ───────────────────────────────────────────────────────────────

    @GetMapping("/me")
    @Operation(
            summary = "Get My Wallet",
            description = "Récupère le solde du wallet du chauffeur connecté. Crée le wallet automatiquement s'il n'existe pas encore.")
    @PreAuthorize("hasAuthority('RIDE_AND_GO_DRIVER')")
    public Mono<Wallet> getMyWallet() {
        return getCurrentUserId()
                .flatMap(id -> paymentPort.getOrCreateWallet(id, "User_" + id.toString().substring(0, 5)));
    }

    // ─── Recharge ─────────────────────────────────────────────────────────────

    @PostMapping("/me/recharge")
    @Operation(
            summary = "Recharge My Wallet",
            description = "Démarre une recharge via le provider MYCOOLPAY (Mobile Money). "
                    + "Retourne une 'redirectUrl' à ouvrir côté client pour effectuer le paiement. "
                    + "Crée le wallet automatiquement si nécessaire.")
    @PreAuthorize("hasAuthority('RIDE_AND_GO_DRIVER')")
    public Mono<RechargeOrder> rechargeMyWallet(@RequestBody RechargeRequestDto request) {
        if (request == null || !Double.isFinite(request.amount()) || request.amount() <= 0
                || request.payerReference() == null || request.payerReference().isBlank()) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Montant strictement positif et référence payeur obligatoires"));
        }
        return getCurrentUserId()
                .flatMap(id -> paymentPort.getOrCreateWallet(id, "User_" + id.toString().substring(0, 5)))
                .flatMap(wallet -> paymentPort.rechargeWallet(
                        wallet.id(),
                        request.amount(),
                        request.payerReference()));
    }

    @PostMapping("/recharge-orders/{orderId}/refresh")
    @Operation(
            summary = "Refresh Recharge Order",
            description = "À appeler après le retour du provider MYCOOLPAY pour confirmer le paiement et créditer le wallet. "
                    + "Le statut passe à COMPLETED si le paiement est validé.")
    @PreAuthorize("hasAuthority('RIDE_AND_GO_DRIVER')")
    public Mono<RechargeOrder> refreshRecharge(@PathVariable String orderId) {
        return getCurrentUserId()
                .flatMap(id -> paymentPort.getOrCreateWallet(id, "User_" + id.toString().substring(0, 5)))
                .flatMap(wallet -> paymentPort.refreshRechargeOrder(orderId)
                        // walletId absent de la réponse Kernel : on ne bloque pas le paiement
                        .filter(order -> order.walletId() == null || wallet.id().toString().equals(order.walletId()))
                        .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN,
                                "Cet ordre de recharge ne concerne pas votre wallet"))));
    }

    @GetMapping("/me/recharge-orders")
    @Operation(
            summary = "Get Recharge History",
            description = "Retourne l'historique des ordres de recharge du chauffeur connecté.")
    @PreAuthorize("hasAuthority('RIDE_AND_GO_DRIVER')")
    public Flux<RechargeOrder> getMyRechargeOrders() {
        return getCurrentUserId()
                .flatMap(id -> paymentPort.getOrCreateWallet(id, "User_" + id.toString().substring(0, 5)))
                .flatMapMany(wallet -> paymentPort.getRechargeOrders(wallet.id()));
    }

    // ─── Transactions ─────────────────────────────────────────────────────────

    @GetMapping("/me/transactions")
    @Operation(
            summary = "Get Transaction History",
            description = "Retourne l'historique complet des transactions blockchain du wallet du chauffeur connecté. "
                    + "Inclut les débits (paiements de courses) et les crédits (recharges).")
    @PreAuthorize("hasAuthority('RIDE_AND_GO_DRIVER')")
    public Flux<TransactionSummary> getMyTransactions() {
        return getCurrentUserId()
                .flatMap(id -> paymentPort.getOrCreateWallet(id, "User_" + id.toString().substring(0, 5)))
                .flatMapMany(wallet -> paymentPort.getWalletTransactions(wallet.id()));
    }

    // ─── Can Operate ──────────────────────────────────────────────────────────

    @GetMapping("/me/can-operate")
    @Operation(
            summary = "Check If Wallet Can Operate",
            description = "Vérifie si le wallet du chauffeur connecté dispose d'un solde suffisant pour une opération du montant donné.")
    @PreAuthorize("hasAuthority('RIDE_AND_GO_DRIVER')")
    public Mono<CanOperateResponse> canOperate(@RequestParam double amount) {
        if (!Double.isFinite(amount) || amount < 0) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Montant invalide"));
        }
        return getCurrentUserId()
                .flatMap(id -> paymentPort.getOrCreateWallet(id, "User_" + id.toString().substring(0, 5)))
                .flatMap(wallet -> paymentPort.canOperate(wallet.id(), amount))
                .map(canOperate -> new CanOperateResponse(canOperate, amount));
    }

    // ─── DTOs ─────────────────────────────────────────────────────────────────

    /** Corps de la requête de recharge. */
    public record RechargeRequestDto(
            double amount,
            String payerReference) {
    }

    /** Réponse à can-operate. */
    public record CanOperateResponse(
            boolean canOperate,
            double amount) {
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Mono<UUID> getCurrentUserId() {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .map(auth -> UUID.fromString(auth.getName()));
    }
}