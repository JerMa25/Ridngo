package com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;
import reactor.core.publisher.Mono;

import java.util.Map;

/** notification-core du Kernel : un envoi = une "delivery" (l'ancien /api/v1/notifications/send renvoie 404). */
@HttpExchange("/api/notifications")
public interface NotificationApiClient {

    @PostExchange("/deliveries")
    Mono<Void> deliver(@RequestBody Delivery request);

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Delivery(String recipientAddress, String channel, String subject, String body,
            Map<String, String> variables, String application) {
    }
}
