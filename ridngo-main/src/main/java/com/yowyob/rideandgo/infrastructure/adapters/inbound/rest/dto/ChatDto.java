package com.yowyob.rideandgo.infrastructure.adapters.inbound.rest.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class ChatDto {

    public record SendMessageRequest(
            String content,
            String senderRole // "DRIVER" or "PASSENGER"
    ) {}

    public record ChatMessageResponse(
            UUID id,
            UUID rideId,
            UUID senderId,
            String senderRole,
            String content,
            LocalDateTime sentAt
    ) {}
}
