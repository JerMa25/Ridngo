package com.yowyob.rideandgo.infrastructure.adapters.inbound.rest;

import com.yowyob.rideandgo.domain.model.ChatMessage;
import com.yowyob.rideandgo.domain.ports.in.ChatUseCase;
import com.yowyob.rideandgo.infrastructure.adapters.inbound.rest.dto.ChatDto;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Tag(name = "Chat", description = "Gestion des messages entre chauffeur et passager")
public class ChatController {

    private final ChatUseCase chatUseCase;

    @PostMapping("/{rideId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Envoyer un message de chat pour une course")
    public Mono<ChatDto.ChatMessageResponse> sendMessage(
            @PathVariable UUID rideId,
            @RequestBody ChatDto.SendMessageRequest request) {
        
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .map(auth -> UUID.fromString(auth.getName()))
                .flatMap(userId -> chatUseCase.sendMessage(rideId, userId, request.senderRole(), request.content()))
                .map(this::toResponse);
    }

    @GetMapping("/{rideId}/messages")
    @Operation(summary = "Récupérer les messages d'une course")
    public Flux<ChatDto.ChatMessageResponse> getMessages(
            @PathVariable UUID rideId,
            @RequestParam(required = false) String since) {
        
        if (since != null && !since.isBlank()) {
            LocalDateTime sinceDateTime = LocalDateTime.parse(since);
            return chatUseCase.getMessagesSince(rideId, sinceDateTime).map(this::toResponse);
        }
        
        return chatUseCase.getMessagesForRide(rideId).map(this::toResponse);
    }

    private ChatDto.ChatMessageResponse toResponse(ChatMessage message) {
        return new ChatDto.ChatMessageResponse(
                message.getId(),
                message.getRideId(),
                message.getSenderId(),
                message.getSenderRole(),
                message.getContent(),
                message.getSentAt()
        );
    }
}
