package com.yowyob.rideandgo.domain.ports.in;

import com.yowyob.rideandgo.domain.model.ChatMessage;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

public interface ChatUseCase {
    Mono<ChatMessage> sendMessage(UUID rideId, UUID senderId, String senderRole, String content);
    Flux<ChatMessage> getMessagesForRide(UUID rideId);
    Flux<ChatMessage> getMessagesSince(UUID rideId, LocalDateTime since);
}
