package com.yowyob.rideandgo.infrastructure.adapters.outbound.persistence;

import com.yowyob.rideandgo.domain.model.ChatMessage;
import com.yowyob.rideandgo.domain.ports.out.ChatRepositoryPort;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.persistence.entity.ChatMessageEntity;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.persistence.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ChatR2dbcAdapter implements ChatRepositoryPort {

    private final ChatMessageRepository repository;

    @Override
    public Mono<ChatMessage> save(ChatMessage message) {
        ChatMessageEntity entity = ChatMessageEntity.builder()
                .id(message.getId())
                .rideId(message.getRideId())
                .senderId(message.getSenderId())
                .senderRole(message.getSenderRole())
                .content(message.getContent())
                .sentAt(message.getSentAt())
                .isNew(true)
                .build();
        return repository.save(entity).map(this::toDomain);
    }

    @Override
    public Flux<ChatMessage> findByRideId(UUID rideId) {
        return repository.findByRideIdOrderBySentAtAsc(rideId).map(this::toDomain);
    }

    @Override
    public Flux<ChatMessage> findByRideIdSince(UUID rideId, LocalDateTime since) {
        return repository.findByRideIdAndSentAtGreaterThanEqualOrderBySentAtAsc(rideId, since).map(this::toDomain);
    }

    private ChatMessage toDomain(ChatMessageEntity entity) {
        return ChatMessage.builder()
                .id(entity.getId())
                .rideId(entity.getRideId())
                .senderId(entity.getSenderId())
                .senderRole(entity.getSenderRole())
                .content(entity.getContent())
                .sentAt(entity.getSentAt())
                .build();
    }
}
