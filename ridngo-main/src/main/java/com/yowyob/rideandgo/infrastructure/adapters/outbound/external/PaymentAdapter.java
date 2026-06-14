package com.yowyob.rideandgo.infrastructure.adapters.outbound.external;

import com.yowyob.rideandgo.domain.exception.WalletNotFoundException;
import com.yowyob.rideandgo.domain.model.Wallet;
import com.yowyob.rideandgo.domain.ports.out.PaymentPort;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.PaymentApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentAdapter implements PaymentPort {
    private final PaymentApiClient client;

    @Override
    public Mono<Wallet> createWallet(UUID ownerId, String ownerName) {
        log.info("💳 Creating wallet for driver {} ({})", ownerName, ownerId);
        return client.createWallet(new PaymentApiClient.CreateWalletRequest(ownerId.toString(), ownerName))
                .map(this::mapToDomain);
    }

    @Override
    public Mono<Wallet> getWalletByOwnerId(UUID ownerId) {
        return client.getWalletByOwnerId(ownerId.toString())
                .map(this::mapToDomain)
                .onErrorResume(WebClientResponseException.class, e -> {
                    log.error("❌ Failed to fetch wallet for owner {}: {} - {}", ownerId, e.getStatusCode(),
                            e.getResponseBodyAsString());
                            
                    // On considère que 404 ou 500 sur cette route signifie "Pas de Wallet"
                    return Mono.error(new WalletNotFoundException(
                            "Votre portefeuille de paiement n'a pas été trouvé. Veuillez contacter le support."));
                });
    }

    @Override
    public Mono<Void> processPayment(UUID walletId, double offerPrice) {
        log.info("💸 Creating Payment Transaction for offer price: {} on wallet {}", offerPrice, walletId);
        return client.createPaymentTransaction(new PaymentApiClient.PaymentTransactionRequest(
                walletId.toString(), offerPrice, "PAYMENT"))
                .onErrorResume(WebClientResponseException.class, e -> {
                    log.error("❌ Payment transaction failed for wallet {}: {}", walletId, e.getResponseBodyAsString());
                    return Mono.error(new RuntimeException("Échec de la transaction de paiement."));
                });
    }

    private Wallet mapToDomain(PaymentApiClient.WalletResponse res) {
        return Wallet.builder()
                .id(UUID.fromString(res.id()))
                .ownerId(UUID.fromString(res.ownerId()))
                .ownerName(res.ownerName())
                .balance(res.balance())
                .build();
    }
}