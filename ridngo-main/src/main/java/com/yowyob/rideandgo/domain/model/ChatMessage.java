package com.yowyob.rideandgo.domain.model;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class ChatMessage {
    UUID id;
    UUID rideId;
    UUID senderId;
    String senderRole;
    String content;
    LocalDateTime sentAt;
}
