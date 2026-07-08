package com.yowyob.rideandgo.domain.ports.out;

import com.yowyob.rideandgo.domain.model.Offer;
import java.util.UUID;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface OfferRepositoryPort {
    Mono<Offer> save(Offer offer);
    Mono<Boolean> delete(Offer offer);
    Mono<Boolean> deleteBid(UUID offerId, UUID driverId);
    Mono<Boolean> exists(Offer offer);
    Mono<Offer> findById(UUID offerId);
    Flux<Offer> findAll(); 
    Flux<Offer> findLatestPending(int limit);
}