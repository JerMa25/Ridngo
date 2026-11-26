package com.yowyob.rideandgo.infrastructure.adapters.outbound.messaging;

import com.yowyob.rideandgo.domain.ports.out.SendNotificationPort;
import com.yowyob.rideandgo.infrastructure.adapters.inbound.rest.dto.SendNotificationRequest;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.NotificationApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Slf4j
@Primary
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "application.notification.mode", havingValue = "http", matchIfMissing = true)
public class HttpNotificationAdapter implements SendNotificationPort {

    private final NotificationApiClient notificationApiClient;
    private final org.springframework.core.env.Environment env;

    @Override
    public Mono<Boolean> sendNotification(SendNotificationRequest request) {
        log.info("📧 Sending HTTP Notification [Template: {}] to {}", request.templateId(), request.to());
        String[] text = message(request.templateId());
        String body = text[1] + details(request.data());
        String channel = request.notificationType() == null ? "EMAIL" : request.notificationType().name();

        return reactor.core.publisher.Flux.fromIterable(request.to() == null ? java.util.List.<String>of() : request.to())
                .flatMap(to -> notificationApiClient.deliver(new NotificationApiClient.Delivery(
                        to, channel, text[0], body, request.data(), "RIDNGO")))
                .then(Mono.just(true))
                .onErrorResume(e -> {
                    log.error("Failed to send notification via HTTP: {}", e.getMessage());
                    return Mono.just(false);
                });
    }

    /** Sujet + texte par événement (les ids viennent de application.notification.templates.*). */
    private String[] message(int templateId) {
        if (templateId == id("new-offer")) return new String[] { "Nouvelle course disponible", "Un passager cherche un chauffeur près de vous." };
        if (templateId == id("driver-applied")) return new String[] { "Un chauffeur a répondu", "Un chauffeur propose de prendre votre course." };
        if (templateId == id("driver-selected")) return new String[] { "Vous avez été choisi", "Le passager vous a choisi : acceptez la course dans Ride&Go." };
        if (templateId == id("ride-confirmed")) return new String[] { "Votre chauffeur arrive", "Votre course est confirmée, le chauffeur est en route." };
        if (templateId == id("ride-cancelled")) return new String[] { "Course annulée", "La course a été annulée." };
        if (templateId == id("admin-validation")) return new String[] { "Profil validé", "Votre profil chauffeur Ride&Go est validé." };
        return new String[] { "Ride&Go", "Vous avez une nouvelle notification Ride&Go." };
    }

    private int id(String key) {
        return env.getProperty("application.notification.templates." + key, Integer.class, -1);
    }

    private static String details(java.util.Map<String, String> data) {
        if (data == null || data.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("\n");
        data.forEach((k, v) -> { if (v != null && !v.isBlank()) sb.append("\n").append(k).append(" : ").append(v); });
        return sb.toString();
    }
}