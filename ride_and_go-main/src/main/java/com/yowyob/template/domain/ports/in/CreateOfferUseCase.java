package com.yowyob.template.domain.ports.in;

import com.yowyob.template.domain.model.Fare;
import com.yowyob.template.domain.model.Offer;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface CreateOfferUseCase {
    Mono<Offer> createOffer(Offer offer, UUID passengerId);
}