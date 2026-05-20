package com.yowyob.template.domain.ports.in;

import com.yowyob.template.domain.model.Offer;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface ResponseToOfferUseCase {
    Mono<Offer> responseToOffer(UUID offerId, UUID driverId);
}