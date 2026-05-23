package com.yowyob.template.domain.ports.out;

import com.yowyob.template.infrastructure.adapters.inbound.rest.dto.FareRequest;
import com.yowyob.template.infrastructure.adapters.inbound.rest.dto.FareResponse;
import reactor.core.publisher.Mono;

public interface FareClientPort {
    Mono<FareResponse> caclculateFare(FareRequest request);
}
