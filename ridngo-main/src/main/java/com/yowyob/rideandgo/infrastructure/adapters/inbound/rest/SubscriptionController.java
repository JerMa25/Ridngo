package com.yowyob.rideandgo.infrastructure.adapters.inbound.rest;

import com.yowyob.rideandgo.application.service.PlatformService;
import com.yowyob.rideandgo.domain.model.DriverSubscription;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.UUID;

/**
 * Packs chauffeur : un abonné ne paie plus de commission par course.
 * Paiement en 2 étapes comme la commission : code envoyé par le Kernel, puis confirmation.
 */
@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Driver-Subscriptions", description = "Monthly / yearly packs replacing per-ride commission")
public class SubscriptionController {

    private final PlatformService platformService;

    @GetMapping("/plans")
    @Operation(summary = "Available packs and current commission rate")
    public Mono<Map<String, Object>> plans() {
        return platformService.plans();
    }

    @GetMapping("/me")
    @Operation(summary = "My subscription status and history")
    @PreAuthorize("hasAuthority('RIDE_AND_GO_DRIVER')")
    public Mono<Map<String, Object>> mine() {
        return currentUserId().flatMap(platformService::status);
    }

    @PostMapping("/me/challenge")
    @Operation(summary = "1. Ask the Kernel for the payment code of a pack")
    @PreAuthorize("hasAuthority('RIDE_AND_GO_DRIVER')")
    public Mono<Map<String, Object>> challenge(@RequestBody PlanRequest body) {
        return currentUserId().flatMap(id -> platformService.startSubscription(id, body.plan()));
    }

    @PostMapping("/me")
    @Operation(summary = "2. Confirm the pack payment with the received code")
    @PreAuthorize("hasAuthority('RIDE_AND_GO_DRIVER')")
    public Mono<DriverSubscription> subscribe(@RequestBody ConfirmRequest body) {
        return currentUserId().flatMap(id -> platformService.confirmSubscription(
                id, body.plan(), body.reference(), body.challengeToken(), body.code()));
    }

    public record PlanRequest(String plan) {
    }

    public record ConfirmRequest(String plan, String reference, String challengeToken, String code) {
    }

    private Mono<UUID> currentUserId() {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .map(auth -> UUID.fromString(auth.getName()));
    }
}
