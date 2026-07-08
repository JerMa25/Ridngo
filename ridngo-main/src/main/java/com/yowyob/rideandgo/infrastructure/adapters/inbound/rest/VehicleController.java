package com.yowyob.rideandgo.infrastructure.adapters.inbound.rest;

import com.yowyob.rideandgo.application.service.VehicleService;
import com.yowyob.rideandgo.domain.model.Vehicle;
import com.yowyob.rideandgo.infrastructure.adapters.inbound.rest.dto.BecomeDriverRequest;
import com.yowyob.rideandgo.infrastructure.adapters.inbound.rest.dto.UpdateVehicleDto;
import com.yowyob.rideandgo.domain.ports.out.DriverRepositoryPort;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/vehicles")
@RequiredArgsConstructor
@Tag(name = "Vehicle-Management", description = "Direct Vehicle Operations (External Service Proxy)")
@PreAuthorize("hasAuthority('RIDE_AND_GO_DRIVER')")
public class VehicleController {
    private final VehicleService vehicleService;
    private final DriverRepositoryPort driverRepositoryPort;

    // --- FULL CREATION (JSON + FILES) ---

    @GetMapping("/me")
    @Operation(summary = "Get My Vehicle", description = "Retrieve the vehicle associated with the current driver.")
    public Mono<Vehicle> getMyVehicle() {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .map(auth -> UUID.fromString(auth.getName()))
                .flatMap(driverId -> driverRepositoryPort.findById(driverId))
                .flatMap(driver -> {
                    if (driver.vehicleId() == null) {
                        return Mono.empty();
                    }
                    return vehicleService.getVehicleById(driver.vehicleId());
                });
    }

    // --- STANDARD CRUD ---

    @GetMapping("/{id}")
    public Mono<Vehicle> getById(@PathVariable UUID id) {
        return vehicleService.getVehicleById(id);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Patch Vehicle", description = "Update specific fields of a vehicle.")
    public Mono<Vehicle> patchVehicle(@PathVariable UUID id,
            @RequestBody UpdateVehicleDto dto) {
        // ⚠️ Vraie mise à jour partielle : on part du véhicule EXISTANT et on ne remplace
        // que les champs réellement présents dans le DTO. Avant ce correctif, tout champ
        // absent du formulaire (booléens notamment, primitifs donc jamais "null") était
        // écrasé par une valeur par défaut (false/0), ce qui effaçait silencieusement les
        // équipements et caractéristiques non renvoyés par le formulaire mobile.
        return vehicleService.getVehicleById(id)
                .flatMap(existing -> {
                    Vehicle merged = Vehicle.builder()
                            .id(existing.id())
                            .vehicleMakeId(dto.makeName() != null ? dto.makeName() : existing.vehicleMakeId())
                            .vehicleModelId(dto.modelName() != null ? dto.modelName() : existing.vehicleModelId())
                            .transmissionTypeId(dto.transmissionType() != null ? dto.transmissionType() : existing.transmissionTypeId())
                            .manufacturerId(dto.manufacturerName() != null ? dto.manufacturerName() : existing.manufacturerId())
                            .vehicleSizeId(dto.sizeName() != null ? dto.sizeName() : existing.vehicleSizeId())
                            .vehicleTypeId(dto.typeName() != null ? dto.typeName() : existing.vehicleTypeId())
                            .fuelTypeId(dto.fuelTypeName() != null ? dto.fuelTypeName() : existing.fuelTypeId())
                            .vehicleSerialNumber(dto.vehicleSerialNumber() != null ? dto.vehicleSerialNumber() : existing.vehicleSerialNumber())
                            .vehicleSerialPhoto(existing.vehicleSerialPhoto())
                            .registrationNumber(dto.registrationNumber() != null ? dto.registrationNumber() : existing.registrationNumber())
                            .registrationPhoto(existing.registrationPhoto())
                            .tankCapacity(dto.tankCapacity() != null ? dto.tankCapacity() : existing.tankCapacity())
                            .luggageMaxCapacity(dto.luggageMaxCapacity() != null ? dto.luggageMaxCapacity() : existing.luggageMaxCapacity())
                            .totalSeatNumber(dto.totalSeatNumber() != null ? dto.totalSeatNumber() : existing.totalSeatNumber())
                            .averageFuelConsumptionPerKm(dto.averageFuelConsumptionPerKm() != null ? dto.averageFuelConsumptionPerKm() : existing.averageFuelConsumptionPerKm())
                            .mileageAtStart(dto.mileageAtStart() != null ? dto.mileageAtStart() : existing.mileageAtStart())
                            .mileageSinceCommissioning(dto.mileageSinceCommissioning() != null ? dto.mileageSinceCommissioning() : existing.mileageSinceCommissioning())
                            .vehicleAgeAtStart(dto.vehicleAgeAtStart() != null ? dto.vehicleAgeAtStart() : existing.vehicleAgeAtStart())
                            .brand(dto.makeName() != null ? dto.makeName() : existing.brand())
                            .illustrationImages(existing.illustrationImages())
                            .airConditioned(dto.airConditioned() != null ? dto.airConditioned() : existing.airConditioned())
                            .comfortable(dto.comfortable() != null ? dto.comfortable() : existing.comfortable())
                            .soft(dto.soft() != null ? dto.soft() : existing.soft())
                            .screen(dto.screen() != null ? dto.screen() : existing.screen())
                            .wifi(dto.wifi() != null ? dto.wifi() : existing.wifi())
                            .tollCharge(dto.tollCharge() != null ? dto.tollCharge() : existing.tollCharge())
                            .carParking(dto.carParking() != null ? dto.carParking() : existing.carParking())
                            .alarm(dto.alarm() != null ? dto.alarm() : existing.alarm())
                            .stateTax(dto.stateTax() != null ? dto.stateTax() : existing.stateTax())
                            .driverAllowance(dto.driverAllowance() != null ? dto.driverAllowance() : existing.driverAllowance())
                            .pickupAndDrop(dto.pickupAndDrop() != null ? dto.pickupAndDrop() : existing.pickupAndDrop())
                            .internet(dto.internet() != null ? dto.internet() : existing.internet())
                            .petsAllow(dto.petsAllow() != null ? dto.petsAllow() : existing.petsAllow())
                            .build();

                    return vehicleService.patchVehicle(id, merged);
                });
    }

    // --- MEDIA MANAGEMENT ---

    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload Gallery Image")
    public Mono<String> uploadImage(@PathVariable UUID id, @RequestPart("file") FilePart file) {
        return vehicleService.addImage(id, file);
    }

    @GetMapping("/{id}/images")
    @Operation(summary = "Get Gallery Images")
    public Flux<String> getImages(@PathVariable UUID id) {
        return vehicleService.getImages(id);
    }

    // --- DOCUMENT UPDATES ---

    @PutMapping(value = "/{id}/documents/registration", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Update Registration Photo")
    public Mono<Vehicle> updateRegistrationDoc(@PathVariable UUID id, @RequestPart("file") FilePart file) {
        return vehicleService.createVehicleWithDocuments(
                Vehicle.builder().id(id).build(),
                file, null).flatMap(v -> vehicleService.getVehicleById(id));
    }

    @PutMapping(value = "/{id}/documents/serial", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Update Serial Number Photo")
    public Mono<Vehicle> updateSerialDoc(@PathVariable UUID id, @RequestPart("file") FilePart file) {
        return vehicleService.createVehicleWithDocuments(
                Vehicle.builder().id(id).build(),
                null, file).flatMap(v -> vehicleService.getVehicleById(id));
    }
}