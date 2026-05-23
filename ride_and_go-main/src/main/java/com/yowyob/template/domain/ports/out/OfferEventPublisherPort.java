package com.yowyob.template.domain.ports.out;

import com.yowyob.template.domain.model.Offer;
import reactor.core.publisher.Mono;

public interface OfferEventPublisherPort {
    Mono<Void> publishOfferCreatedEvent(Offer offer);
}
