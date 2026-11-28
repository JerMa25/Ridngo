package com.yowyob.rideandgo.infrastructure.adapters.inbound.rest;

import com.yowyob.rideandgo.application.service.AdminService;
import com.yowyob.rideandgo.application.service.PlatformService;
import com.yowyob.rideandgo.domain.model.Driver;
import com.yowyob.rideandgo.domain.model.DriverSubscription;
import com.yowyob.rideandgo.domain.model.PlatformSettings;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin-Backoffice", description = "Operations for platform administrators")
@PreAuthorize("hasAuthority('RIDE_AND_GO_ADMIN')") // Protection globale
public class AdminController {

    private final AdminService adminService;
    private final PlatformService platformService;

    @GetMapping("/overview")
    @Operation(summary = "Platform overview", description = "Key figures, rides of the last 7 days and current commission rate")
    public Mono<Map<String, Object>> overview() {
        return adminService.overview();
    }

    @GetMapping("/settings")
    @Operation(summary = "Get platform settings")
    public Mono<PlatformSettings> getSettings() {
        return platformService.getSettings();
    }

    @PutMapping("/settings")
    @Operation(summary = "Update platform settings", description = "Commission rate (0-0.5), subscription prices, subscriptions on/off")
    public Mono<PlatformSettings> updateSettings(@RequestBody PlatformSettings settings) {
        return platformService.updateSettings(settings);
    }

    @GetMapping("/users")
    @Operation(summary = "List users", description = "Search by name, email or phone")
    public Flux<Map<String, Object>> users(@RequestParam(required = false) String search) {
        return adminService.users(search);
    }

    @PostMapping("/users/{id}/message")
    @Operation(summary = "Send a support message", description = "Shows up in the user's notifications")
    public Mono<Void> messageUser(@PathVariable UUID id, @RequestBody MessageRequest body) {
        return adminService.messageUser(id, body.title(), body.message());
    }

    @GetMapping("/drivers")
    @Operation(summary = "List all drivers")
    public Flux<Map<String, Object>> drivers() {
        return adminService.drivers();
    }

    @PatchMapping("/drivers/{id}/suspend")
    @Operation(summary = "Suspend driver", description = "Driver can no longer apply until validated again")
    public Mono<Boolean> suspendDriver(@PathVariable UUID id) {
        return adminService.suspendDriver(id);
    }

    @GetMapping("/rides")
    @Operation(summary = "Latest rides")
    public Flux<Map<String, Object>> rides() {
        return adminService.rides();
    }

    @GetMapping("/offers")
    @Operation(summary = "Latest offers")
    public Flux<Map<String, Object>> offers() {
        return adminService.offers();
    }

    @GetMapping("/subscriptions")
    @Operation(summary = "Latest driver subscriptions")
    public Flux<DriverSubscription> subscriptions() {
        return platformService.recentSubscriptions(200);
    }

    public record MessageRequest(String title, String message) {
    }

    @GetMapping("/drivers/pending")
    @Operation(summary = "List pending drivers", description = "Get list of drivers waiting for validation")
    public Flux<Driver> getPendingDrivers() {
        return adminService.getPendingDrivers();
    }

    @PatchMapping("/drivers/{id}/validate")
    @Operation(summary = "Validate Driver", description = "Approve driver documents and enable access")
    public Mono<Driver> validateDriver(@PathVariable UUID id) {
        return adminService.validateDriver(id);
    }
}