package com.yowyob.rideandgo.domain.ports.out;

import com.yowyob.rideandgo.domain.model.DriverSubscription;
import com.yowyob.rideandgo.domain.model.PlatformSettings;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.UUID;

/** Réglages, abonnements et requêtes de supervision de l'admin. */
public interface PlatformRepositoryPort {
    Mono<PlatformSettings> getSettings();
    Mono<PlatformSettings> saveSettings(PlatformSettings settings);

    Mono<DriverSubscription> saveSubscription(DriverSubscription subscription);
    /** Abonnement dont la fin est la plus lointaine (actif ou à venir), vide sinon. */
    Mono<DriverSubscription> findLatestSubscription(UUID driverId);
    Flux<DriverSubscription> findSubscriptionsByDriver(UUID driverId);
    Flux<DriverSubscription> findRecentSubscriptions(int limit);

    Mono<Map<String, Object>> adminStats();
    /** Courses créées par jour sur les 7 derniers jours. */
    Flux<Map<String, Object>> ridesPerDay();
    Flux<Map<String, Object>> recentRides(int limit);
    Flux<Map<String, Object>> recentOffers(int limit);
    Flux<Map<String, Object>> users(String search, int limit);
    Flux<Map<String, Object>> drivers(int limit);
    Mono<Boolean> setDriverValidated(UUID driverId, boolean validated);
}
