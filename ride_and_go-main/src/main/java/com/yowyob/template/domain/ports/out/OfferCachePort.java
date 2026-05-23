package com.yowyob.template.domain.ports.out;

import com.yowyob.template.domain.model.Offer;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface OfferCachePort {
    Mono<Boolean> saveInCache(Offer offer);

    Mono<Offer> findOfferById(UUID offerId);
}
