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
    private final com.yowyob.rideandgo.application.service.RideService rideService;

    @PostMapping("/{rideId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Envoyer un message de chat pour une course")
    public Mono<ChatDto.ChatMessageResponse> sendMessage(
            @PathVariable UUID rideId,
            @RequestBody ChatDto.SendMessageRequest request) {
        
        if (request == null || request.content() == null || request.content().isBlank()) {
            return Mono.error(new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Message vide"));
        }
        return requireParticipant(rideId)
                .flatMap(userId -> chatUseCase.sendMessage(rideId, userId, request.senderRole(), request.content()))
                .map(this::toResponse);
    }

    @GetMapping("/{rideId}/messages")
    @Operation(summary = "Récupérer les messages d'une course")
    public Flux<ChatDto.ChatMessageResponse> getMessages(
            @PathVariable UUID rideId,
            @RequestParam(required = false) String since) {
        
        return requireParticipant(rideId).flatMapMany(userId -> {
            if (since != null && !since.isBlank()) {
                LocalDateTime sinceDateTime;
                try {
                    // accepte "2026-01-01T10:00:00" et les ISO avec fuseau/Z envoyés par JS (toISOString)
                    sinceDateTime = since.endsWith("Z") || since.matches(".*[+-]\\d{2}:\\d{2}$")
                            ? java.time.OffsetDateTime.parse(since).atZoneSameInstant(java.time.ZoneId.systemDefault()).toLocalDateTime()
                            : LocalDateTime.parse(since);
                } catch (java.time.format.DateTimeParseException e) {
                    return Flux.error(new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Paramètre since invalide"));
                }
                return chatUseCase.getMessagesSince(rideId, sinceDateTime);
            }
            return chatUseCase.getMessagesForRide(rideId);
        }).map(this::toResponse);
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

    /** Seuls le chauffeur et le passager de la course accèdent au chat. */
    private Mono<UUID> requireParticipant(UUID rideId) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> UUID.fromString(ctx.getAuthentication().getName()))
                .flatMap(userId -> rideService.getRideById(rideId)
                        .filter(ride -> userId.equals(ride.driverId()) || userId.equals(ride.passengerId()))
                        .map(ride -> userId)
                        .switchIfEmpty(Mono.error(new org.springframework.web.server.ResponseStatusException(
                                HttpStatus.FORBIDDEN, "Vous ne participez pas à cette course"))));
    }
}
