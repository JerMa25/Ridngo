package com.yowyob.rideandgo.infrastructure.adapters.outbound.external;

import com.yowyob.rideandgo.domain.model.Vehicle;
import com.yowyob.rideandgo.domain.ports.out.VehicleRepositoryPort;
import com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client.VehicleApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Collections;
import java.util.UUID;

/**
 * Les véhicules sont désormais des "resources" génériques du Kernel Core
 * (module
 * administration/ressources), rattachées à l'organisation et l'agence fixes de
 * RidnGo.
 * Le Kernel ne connaît que les champs identitaires génériques (nom, catégorie,
 * numéro
 * de série, géoloc, adresse réseau) — tous les attributs métier spécifiques
 * véhicule
 * (climatisation, wifi, kilométrage, photos, capacités...) N'EXISTENT PAS côté
 * Kernel.
 * Ils sont donc conservés intégralement dans le cache Redis local, indexé par
 * l'ID de
 * la ressource Kernel (un seul identifiant pour les deux mondes).
 *
 * ATTENTION durabilité : si le cache Redis est vidé, ces attributs enrichis
 * sont perdus
 * (seuls les champs génériques survivent, récupérables via GET
 * /api/resources/{id}).
 * Acceptable pour la phase de test actuelle ; à migrer vers une table Postgres
 * dédiée
 * si une durabilité plus forte est nécessaire plus tard.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VehicleAdapter implements VehicleRepositoryPort {

        private static final String RESOURCE_CODE = "VOITURE";
        private static final String REDIS_KEY_PREFIX = "vehicle:";
        private static final Duration CACHE_TTL = Duration.ofDays(365); // pas d'expiration métier réelle, juste une
                                                                        // borne

        private final VehicleApiClient client;
        private final ReactiveRedisTemplate<String, Object> redisTemplate;

        @Value("${application.vehicle.organization-id}")
        private String organizationId;

        @Value("${application.vehicle.agency-id}")
        private String agencyId;

        @Override
        public Mono<Vehicle> createVehicle(Vehicle domain) {
                log.info("🚗 [Kernel Resource] Création véhicule (resource) : {}", domain.registrationNumber());

                VehicleApiClient.KernelResourceRequest request = toResourceRequest(domain, null);

                return client.createResource(request)
                                .mapNotNull(VehicleApiClient.KernelResourceEnvelope::data)
                                .switchIfEmpty(Mono.error(new IllegalStateException(
                                                "Réponse Kernel invalide lors de la création de la ressource véhicule.")))
                                .map(res -> mergeResourceIntoVehicle(res, domain))
                                .flatMap(vehicle -> cacheVehicle(vehicle).thenReturn(vehicle))
                                .doOnSuccess(v -> log.info("✅ Véhicule/ressource créé avec l'ID : {}", v.id()))
                                .doOnError(WebClientResponseException.class,
                                                e -> log.error("❌ Erreur Kernel resources (create) : {} — {}",
                                                                e.getStatusCode(), e.getResponseBodyAsString()));
        }

        @Override
        public Mono<Vehicle> getVehicleById(UUID vehicleId) {
                if (vehicleId == null) {
                        log.warn("⚠️ Tentative de récupération d'un véhicule avec un ID NULL");
                        return Mono.empty();
                }

                return getCachedVehicle(vehicleId)
                                .switchIfEmpty(Mono.defer(() -> {
                                        log.warn("⚠️ Véhicule {} absent du cache Redis — repli sur le Kernel (attributs enrichis perdus).",
                                                        vehicleId);
                                        return client.getResourceById(vehicleId.toString())
                                                        .mapNotNull(VehicleApiClient.KernelResourceEnvelope::data)
                                                        .map(res -> mergeResourceIntoVehicle(res,
                                                                        emptyVehicleTemplate(vehicleId)));
                                }))
                                .doOnError(e -> log.error("❌ Échec de récupération du véhicule {} : {}", vehicleId,
                                                e.getMessage()));
        }

        @Override
        public Mono<Vehicle> patchVehicle(UUID vehicleId, Vehicle partial) {
                log.info("🔧 [Kernel Resource] Mise à jour véhicule {}", vehicleId);

                return getCachedVehicle(vehicleId)
                                .switchIfEmpty(Mono.just(emptyVehicleTemplate(vehicleId)))
                                .map(existing -> mergePartial(existing, partial))
                                .flatMap(merged -> {
                                        VehicleApiClient.KernelResourceRequest request = toResourceRequest(merged,
                                                        vehicleId);
                                        return client.patchResource(vehicleId.toString(), request)
                                                        .mapNotNull(VehicleApiClient.KernelResourceEnvelope::data)
                                                        .map(res -> mergeResourceIntoVehicle(res, merged))
                                                        .flatMap(vehicle -> cacheVehicle(vehicle).thenReturn(vehicle));
                                });
        }

        // --- Documents / images : pas de champ correspondant côté Kernel resources.
        // Le front doit uploader le fichier ailleurs (ex. /api/files, non branché ici
        // faute de
        // contrat confirmé) et nous transmettre l'URL résultante — pour l'instant on se
        // contente
        // de journaliser et de renvoyer le véhicule tel quel, sans casser la chaîne
        // d'appel. ---

        @Override
        public Mono<Vehicle> uploadRegistrationDocument(UUID vehicleId, FilePart file) {
                log.warn("⚠️ uploadRegistrationDocument({}) : pas encore branché sur le Kernel (contrat /api/files non confirmé).",
                                vehicleId);
                return getCachedVehicle(vehicleId).switchIfEmpty(Mono.just(emptyVehicleTemplate(vehicleId)));
        }

        @Override
        public Mono<Vehicle> uploadSerialDocument(UUID vehicleId, FilePart file) {
                log.warn("⚠️ uploadSerialDocument({}) : pas encore branché sur le Kernel (contrat /api/files non confirmé).",
                                vehicleId);
                return getCachedVehicle(vehicleId).switchIfEmpty(Mono.just(emptyVehicleTemplate(vehicleId)));
        }

        @Override
        public Mono<String> uploadVehicleImage(UUID vehicleId, FilePart file) {
                log.warn("⚠️ uploadVehicleImage({}) : pas encore branché sur le Kernel (contrat /api/files non confirmé).",
                                vehicleId);
                return Mono.empty();
        }

        @Override
        public Flux<String> getVehicleImages(UUID vehicleId) {
                return getCachedVehicle(vehicleId)
                                .flatMapMany(v -> v.illustrationImages() != null
                                                ? Flux.fromIterable(v.illustrationImages())
                                                : Flux.empty());
        }

        @Override
        public Mono<Void> cacheVehicle(Vehicle vehicle) {
                return redisTemplate.opsForValue()
                                .set(REDIS_KEY_PREFIX + vehicle.id(), vehicle, CACHE_TTL)
                                .then();
        }

        // --- Helpers ---------------------------------------------------------------

        private Mono<Vehicle> getCachedVehicle(UUID vehicleId) {
                return redisTemplate.opsForValue().get(REDIS_KEY_PREFIX + vehicleId)
                                .cast(Vehicle.class)
                                .onErrorResume(e -> {
                                        log.warn("⚠️ Lecture cache véhicule {} impossible : {}", vehicleId,
                                                        e.getMessage());
                                        return Mono.empty();
                                });
        }

        /**
         * Construit le payload Kernel à partir du véhicule enrichi
         * (organizationId/agencyId/resourceCode fixes, injectés serveur).
         */
        private VehicleApiClient.KernelResourceRequest toResourceRequest(Vehicle v, UUID existingId) {
                String name = (v.brand() != null && !v.brand().isBlank()) ? v.brand() : v.vehicleMakeId();
                String category = v.vehicleModelId();
                String serialNumber = (v.vehicleSerialNumber() != null && !v.vehicleSerialNumber().isBlank())
                                ? v.vehicleSerialNumber()
                                : v.registrationNumber();

                return new VehicleApiClient.KernelResourceRequest(
                                organizationId,
                                agencyId,
                                RESOURCE_CODE,
                                name,
                                category,
                                serialNumber,
                                null, // latitude — pas de géoloc à la création d'un véhicule
                                null, // longitude
                                null, // ipAddress — uniquement pertinent si traceur GPS embarqué
                                null // macAddress
                );
        }

        /**
         * Fusionne les champs génériques renvoyés par le Kernel dans le véhicule
         * enrichi (source de vérité pour le reste).
         */
        private Vehicle mergeResourceIntoVehicle(VehicleApiClient.KernelResource res, Vehicle enriched) {
                UUID id = res.id() != null ? UUID.fromString(res.id()) : enriched.id();
                return new Vehicle(
                                id,
                                enriched.vehicleMakeId(),
                                enriched.vehicleModelId(),
                                enriched.transmissionTypeId(),
                                enriched.manufacturerId(),
                                enriched.vehicleSizeId(),
                                enriched.vehicleTypeId(),
                                enriched.fuelTypeId(),
                                enriched.vehicleSerialNumber(),
                                enriched.vehicleSerialPhoto(),
                                enriched.registrationNumber(),
                                enriched.registrationPhoto(),
                                enriched.tankCapacity(),
                                enriched.luggageMaxCapacity(),
                                enriched.totalSeatNumber(),
                                enriched.averageFuelConsumptionPerKm(),
                                enriched.mileageAtStart(),
                                enriched.mileageSinceCommissioning(),
                                enriched.vehicleAgeAtStart(),
                                res.name() != null ? res.name() : enriched.brand(),
                                enriched.illustrationImages(),
                                enriched.airConditioned(),
                                enriched.comfortable(),
                                enriched.soft(),
                                enriched.screen(),
                                enriched.wifi(),
                                enriched.tollCharge(),
                                enriched.carParking(),
                                enriched.alarm(),
                                enriched.stateTax(),
                                enriched.driverAllowance(),
                                enriched.pickupAndDrop(),
                                enriched.internet(),
                                enriched.petsAllow());
        }

        /**
         * Fusionne un patch partiel sur le véhicule existant (ne remplace que les
         * champs non-nuls/renseignés).
         */
        private Vehicle mergePartial(Vehicle existing, Vehicle partial) {
                return new Vehicle(
                                existing.id(),
                                orDefault(partial.vehicleMakeId(), existing.vehicleMakeId()),
                                orDefault(partial.vehicleModelId(), existing.vehicleModelId()),
                                orDefault(partial.transmissionTypeId(), existing.transmissionTypeId()),
                                orDefault(partial.manufacturerId(), existing.manufacturerId()),
                                orDefault(partial.vehicleSizeId(), existing.vehicleSizeId()),
                                orDefault(partial.vehicleTypeId(), existing.vehicleTypeId()),
                                orDefault(partial.fuelTypeId(), existing.fuelTypeId()),
                                orDefault(partial.vehicleSerialNumber(), existing.vehicleSerialNumber()),
                                orDefault(partial.vehicleSerialPhoto(), existing.vehicleSerialPhoto()),
                                orDefault(partial.registrationNumber(), existing.registrationNumber()),
                                orDefault(partial.registrationPhoto(), existing.registrationPhoto()),
                                partial.tankCapacity() > 0 ? partial.tankCapacity() : existing.tankCapacity(),
                                partial.luggageMaxCapacity() > 0 ? partial.luggageMaxCapacity()
                                                : existing.luggageMaxCapacity(),
                                partial.totalSeatNumber() > 0 ? partial.totalSeatNumber() : existing.totalSeatNumber(),
                                partial.averageFuelConsumptionPerKm() > 0 ? partial.averageFuelConsumptionPerKm()
                                                : existing.averageFuelConsumptionPerKm(),
                                partial.mileageAtStart() > 0 ? partial.mileageAtStart() : existing.mileageAtStart(),
                                partial.mileageSinceCommissioning() > 0 ? partial.mileageSinceCommissioning()
                                                : existing.mileageSinceCommissioning(),
                                partial.vehicleAgeAtStart() > 0 ? partial.vehicleAgeAtStart()
                                                : existing.vehicleAgeAtStart(),
                                orDefault(partial.brand(), existing.brand()),
                                (partial.illustrationImages() != null && !partial.illustrationImages().isEmpty())
                                                ? partial.illustrationImages()
                                                : existing.illustrationImages(),
                                partial.airConditioned(),
                                partial.comfortable(),
                                partial.soft(),
                                partial.screen(),
                                partial.wifi(),
                                partial.tollCharge(),
                                partial.carParking(),
                                partial.alarm(),
                                partial.stateTax(),
                                partial.driverAllowance(),
                                partial.pickupAndDrop(),
                                partial.internet(),
                                partial.petsAllow());
        }

        private String orDefault(String value, String fallback) {
                return (value != null && !value.isBlank()) ? value : fallback;
        }

        private Vehicle emptyVehicleTemplate(UUID id) {
                return Vehicle.builder().id(id).illustrationImages(Collections.emptyList()).build();
        }
}