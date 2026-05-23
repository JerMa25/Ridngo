package com.yowyob.template.domain.ports.in;

import com.yowyob.template.domain.model.Fare;
import reactor.core.publisher.Mono;

public interface PutFareInCacheUseCase {
    Mono<Boolean> putFareInCache(Fare fare);
}