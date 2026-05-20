package com.yowyob.template.domain.ports.out;

import com.yowyob.template.infrastructure.adapters.inbound.rest.dto.SendNotificationRequest;
import reactor.core.publisher.Mono;

public interface SendNotificationPort {
    Mono<Boolean> sendNotification(SendNotificationRequest request);
}
