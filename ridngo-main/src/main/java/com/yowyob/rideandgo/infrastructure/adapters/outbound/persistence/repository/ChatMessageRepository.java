package com.yowyob.rideandgo.infrastructure.adapters.outbound.persistence.repository;

import com.yowyob.rideandgo.infrastructure.adapters.outbound.persistence.entity.ChatMessageEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.util.UUID;

public interface ChatMessageRepository extends ReactiveCrudRepository<ChatMessageEntity, UUID> {
    Flux<ChatMessageEntity> findByRideIdOrderBySentAtAsc(UUID rideId);
    Flux<ChatMessageEntity> findByRideIdAndSentAtGreaterThanEqualOrderBySentAtAsc(UUID rideId, LocalDateTime sentAt);
}
