package com.yowyob.rideandgo.domain.ports.out;

import com.yowyob.rideandgo.domain.model.ChatMessage;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

public interface ChatRepositoryPort {
    Mono<ChatMessage> save(ChatMessage message);
    Flux<ChatMessage> findByRideId(UUID rideId);
    Flux<ChatMessage> findByRideIdSince(UUID rideId, LocalDateTime since);
}
