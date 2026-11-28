package com.yowyob.rideandgo.application.service;

import com.yowyob.rideandgo.application.utils.Utils;
import com.yowyob.rideandgo.domain.model.Driver;
import com.yowyob.rideandgo.domain.model.Notification;
import com.yowyob.rideandgo.domain.ports.out.NotificationHistoryRepositoryPort;
import com.yowyob.rideandgo.domain.ports.out.PlatformRepositoryPort;
import com.yowyob.rideandgo.domain.ports.out.DriverRepositoryPort;
import com.yowyob.rideandgo.domain.ports.out.SendNotificationPort;
import com.yowyob.rideandgo.domain.ports.out.UserDeviceRepositoryPort;
import com.yowyob.rideandgo.infrastructure.adapters.inbound.rest.dto.NotificationType;
import com.yowyob.rideandgo.infrastructure.adapters.inbound.rest.dto.SendNotificationRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final DriverRepositoryPort driverRepositoryPort;
    private final SendNotificationPort sendNotificationPort;
    private final UserDeviceRepositoryPort userDeviceRepositoryPort;
    private final PlatformRepositoryPort platformRepositoryPort;
    private final NotificationHistoryRepositoryPort historyRepositoryPort;
    private final PlatformService platformService;

    // Injection de l'ID généré (à mettre à jour dans application.yml après exécution du script python)
    @Value("${application.notification.templates.admin-validation:7}")
    private int tmplAccountValidated;

    public Flux<Driver> getPendingDrivers() {
        return driverRepositoryPort.findAllPendingValidation();
    }

    public Mono<Driver> validateDriver(UUID driverId) {
        return driverRepositoryPort.validateProfile(driverId)
                .flatMap(driver -> {
                    log.info("👮 Admin validated driver {}", driverId);
                    
                    // Notification au chauffeur (Async)
                    notifyDriverValidation(driverId).subscribe();
                    
                    return Mono.just(driver);
                });
    }

    // ─── Supervision ─────────────────────────────────────────────────────────

    /** Chiffres clés + courses des 7 derniers jours + réglages en cours. */
    public Mono<Map<String, Object>> overview() {
        return Mono.zip(platformRepositoryPort.adminStats(),
                        platformRepositoryPort.ridesPerDay().collectList(),
                        platformService.getSettings())
                .map(t -> {
                    Map<String, Object> body = new LinkedHashMap<>(t.getT1());
                    body.put("ridesPerDay", t.getT2());
                    body.put("commissionRate", t.getT3().commissionRate());
                    return body;
                });
    }

    public Flux<Map<String, Object>> users(String search) {
        return platformRepositoryPort.users(search, 200);
    }

    public Flux<Map<String, Object>> drivers() {
        return platformRepositoryPort.drivers(500);
    }

    public Flux<Map<String, Object>> rides() {
        return platformRepositoryPort.recentRides(100);
    }

    public Flux<Map<String, Object>> offers() {
        return platformRepositoryPort.recentOffers(100);
    }

    /** Suspend un chauffeur : il ne peut plus postuler tant qu'il n'est pas revalidé. */
    public Mono<Boolean> suspendDriver(UUID driverId) {
        log.info("👮 Admin suspended driver {}", driverId);
        return platformRepositoryPort.setDriverValidated(driverId, false);
    }

    /** Assistance : message visible dans les notifications de l'utilisateur. */
    public Mono<Void> messageUser(UUID userId, String title, String message) {
        if (message == null || message.isBlank()) {
            return Mono.error(new IllegalArgumentException("Le message est vide."));
        }
        return historyRepositoryPort.save(Notification.builder()
                .id(Utils.generateUUID())
                .userId(userId)
                .title(title == null || title.isBlank() ? "Message de l'équipe Ride&Go" : title.trim())
                .message(message.trim())
                .type("INFO")
                .isRead(false)
                .dataJson("{}")
                .build());
    }

    private Mono<Void> notifyDriverValidation(UUID driverId) {
        return userDeviceRepositoryPort.findDeviceTokenByUserId(driverId)
                .flatMap(token -> sendNotificationPort.sendNotification(
                        SendNotificationRequest.builder()
                                .notificationType(NotificationType.PUSH) // On privilégie le Push pour l'instant
                                .templateId(tmplAccountValidated)
                                .to(List.of(token))
                                .data(Map.of(
                                    "message", "Votre compte chauffeur a été validé ! Vous pouvez passer en ligne."
                                ))
                                .build()
                ))
                .doOnError(e -> log.warn("Failed to notify driver validation: {}", e.getMessage()))
                .then();
    }
}