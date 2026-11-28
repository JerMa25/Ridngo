package com.yowyob.rideandgo.application.service;

import com.yowyob.rideandgo.domain.model.DriverSubscription;
import com.yowyob.rideandgo.domain.model.PlatformSettings;
import com.yowyob.rideandgo.domain.ports.out.PaymentPort;
import com.yowyob.rideandgo.domain.ports.out.PlatformRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Réglages de la plateforme (taux de commission, prix des packs) et abonnements chauffeur.
 * Un chauffeur abonné ne paie aucune commission par course pendant la période payée.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlatformService {

    public static final String MONTHLY = "MONTHLY";
    public static final String YEARLY = "YEARLY";

    private final PlatformRepositoryPort repository;
    private final PaymentPort paymentPort;

    // Valeur de repli si la table n'est pas encore migrée
    @Value("${application.payment.commission-rate:0.10}")
    private double defaultCommissionRate;

    public Mono<PlatformSettings> getSettings() {
        return repository.getSettings()
                .defaultIfEmpty(PlatformSettings.builder()
                        .commissionRate(defaultCommissionRate).monthlyPrice(5000).yearlyPrice(50000)
                        .subscriptionsEnabled(true).build());
    }

    public Mono<PlatformSettings> updateSettings(PlatformSettings s) {
        if (!(s.commissionRate() >= 0 && s.commissionRate() <= 0.5)) {
            return Mono.error(new IllegalArgumentException("Le taux de commission doit être compris entre 0 % et 50 %."));
        }
        if (!(s.monthlyPrice() > 0 && s.yearlyPrice() > 0)) {
            return Mono.error(new IllegalArgumentException("Les prix des abonnements doivent être strictement positifs."));
        }
        log.info("⚙️ Admin updated platform settings: {}", s);
        return repository.saveSettings(s);
    }

    /** Commission due sur une course : 0 si le chauffeur est abonné, sinon prix × taux courant. */
    public Mono<Double> commissionFor(UUID driverId, double price) {
        return isSubscribed(driverId)
                .flatMap(subscribed -> subscribed ? Mono.just(0.0)
                        : getSettings().map(s -> price * s.commissionRate()));
    }

    public Mono<Boolean> isSubscribed(UUID driverId) {
        LocalDateTime now = LocalDateTime.now();
        return repository.findSubscriptionsByDriver(driverId)
                .any(sub -> sub.isActiveAt(now));
    }

    // ─── Abonnements ─────────────────────────────────────────────────────────

    public Mono<Map<String, Object>> plans() {
        return getSettings().map(s -> {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("enabled", s.subscriptionsEnabled());
            body.put("commissionRate", s.commissionRate());
            body.put("plans", List.of(
                    Map.of("id", MONTHLY, "price", s.monthlyPrice(), "months", 1),
                    Map.of("id", YEARLY, "price", s.yearlyPrice(), "months", 12)));
            return body;
        });
    }

    /** État de l'abonnement du chauffeur : actif ou non, fin de période, historique. */
    public Mono<Map<String, Object>> status(UUID driverId) {
        LocalDateTime now = LocalDateTime.now();
        return repository.findSubscriptionsByDriver(driverId).collectList().map(subs -> {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("active", subs.stream().anyMatch(sub -> sub.isActiveAt(now)));
            body.put("endsAt", subs.stream().map(DriverSubscription::endsAt).filter(now::isBefore)
                    .max(LocalDateTime::compareTo).orElse(null));
            body.put("history", subs);
            return body;
        });
    }

    /** Étape 1 : le Kernel envoie un code au chauffeur pour autoriser le débit du pack. */
    public Mono<Map<String, Object>> startSubscription(UUID driverId, String plan) {
        return priceOf(plan).flatMap(price -> {
            String reference = "RIDE-SUB-" + plan + "-" + driverId + "-" + System.currentTimeMillis();
            return paymentPort.getWalletByOwnerId(driverId)
                    .switchIfEmpty(Mono.error(new IllegalStateException("Wallet introuvable : rechargez d'abord votre compte.")))
                    .flatMap(wallet -> wallet.balance() < price
                            ? Mono.<String>error(new IllegalStateException("Solde insuffisant pour ce pack (" + price + " F)."))
                            : paymentPort.startPayment(wallet.id(), price, reference))
                    .map(token -> Map.<String, Object>of("challengeToken", token, "reference", reference, "amount", price));
        });
    }

    /** Étape 2 : débit confirmé par le code, puis la période s'ajoute à la suite de l'abonnement en cours. */
    public Mono<DriverSubscription> confirmSubscription(UUID driverId, String plan, String reference,
            String challengeToken, String code) {
        if (reference == null || !reference.startsWith("RIDE-SUB-" + plan + "-" + driverId + "-")) {
            return Mono.error(new IllegalArgumentException("Référence de paiement invalide."));
        }
        if (challengeToken == null || code == null || code.isBlank()) {
            return Mono.error(new IllegalArgumentException("Code de confirmation requis."));
        }
        return priceOf(plan).flatMap(price -> paymentPort.getWalletByOwnerId(driverId)
                .flatMap(wallet -> paymentPort.processPayment(wallet.id(), price, reference, challengeToken, code.trim()))
                .then(repository.findLatestSubscription(driverId)
                        .map(DriverSubscription::endsAt)
                        .defaultIfEmpty(LocalDateTime.now()))
                .flatMap(from -> {
                    LocalDateTime start = from.isAfter(LocalDateTime.now()) ? from : LocalDateTime.now();
                    DriverSubscription sub = DriverSubscription.builder()
                            .id(UUID.randomUUID())
                            .driverId(driverId)
                            .plan(plan)
                            .amount(price)
                            .startsAt(start)
                            .endsAt(YEARLY.equals(plan) ? start.plusYears(1) : start.plusMonths(1))
                            .paymentReference(reference)
                            .createdAt(LocalDateTime.now())
                            .build();
                    log.info("⭐ Driver {} subscribed {} until {}", driverId, plan, sub.endsAt());
                    return repository.saveSubscription(sub);
                }));
    }

    private Mono<Double> priceOf(String plan) {
        if (!MONTHLY.equals(plan) && !YEARLY.equals(plan)) {
            return Mono.error(new IllegalArgumentException("Pack inconnu : " + plan));
        }
        return getSettings().flatMap(s -> s.subscriptionsEnabled()
                ? Mono.just(MONTHLY.equals(plan) ? s.monthlyPrice() : s.yearlyPrice())
                : Mono.error(new IllegalStateException("Les abonnements sont désactivés pour le moment.")));
    }

    public Flux<DriverSubscription> recentSubscriptions(int limit) {
        return repository.findRecentSubscriptions(limit);
    }
}
