package com.yowyob.template.infrastructure.adapters.outbound.external.client;


import com.yowyob.template.infrastructure.adapters.inbound.rest.dto.FareRequest;
import com.yowyob.template.infrastructure.adapters.inbound.rest.dto.FareResponse;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;
import reactor.core.publisher.Mono;

@HttpExchange("/api/v2")
public interface FareCalculatorClient {
    @PostExchange("/fares/calculate")
    Mono<FareResponse> calculateFare(@RequestBody FareRequest request);
}
