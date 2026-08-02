package com.yowyob.rideandgo.application.service;

import com.yowyob.rideandgo.domain.model.ChatMessage;
import com.yowyob.rideandgo.domain.ports.in.ChatUseCase;
import com.yowyob.rideandgo.domain.ports.out.ChatRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService implements ChatUseCase {

    private final ChatRepositoryPort chatRepositoryPort;

    @Override
    public Mono<ChatMessage> sendMessage(UUID rideId, UUID senderId, String senderRole, String content) {
        ChatMessage message = ChatMessage.builder()
                .id(UUID.randomUUID())
                .rideId(rideId)
                .senderId(senderId)
                .senderRole(senderRole)
                .content(content)
                .sentAt(LocalDateTime.now())
                .build();
        return chatRepositoryPort.save(message);
    }

    @Override
    public Flux<ChatMessage> getMessagesForRide(UUID rideId) {
        return chatRepositoryPort.findByRideId(rideId);
    }

    @Override
    public Flux<ChatMessage> getMessagesSince(UUID rideId, LocalDateTime since) {
        return chatRepositoryPort.findByRideIdSince(rideId, since);
    }
}
