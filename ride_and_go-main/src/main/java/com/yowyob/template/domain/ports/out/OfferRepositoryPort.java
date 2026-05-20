package com.yowyob.template.domain.ports.out;

import com.yowyob.template.domain.model.Offer;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface OfferRepositoryPort {
    Mono<Offer> save(Offer offer);

    Mono<Boolean> delete(Offer offer);

    Mono<Boolean> exists(Offer offer);

    Mono<Offer> findById(UUID offerId);
}