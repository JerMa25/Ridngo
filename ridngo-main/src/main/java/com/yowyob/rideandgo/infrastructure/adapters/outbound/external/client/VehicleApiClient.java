package com.yowyob.rideandgo.infrastructure.adapters.outbound.external.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PatchExchange;
import org.springframework.web.service.annotation.PostExchange;
import reactor.core.publisher.Mono;

/**
 * Client pour le module générique "resources" du Kernel Core — c'est là que les
 * véhicules
 * RidnGo sont désormais gérés (plus d'API véhicule dédiée). Un véhicule = une
 * ressource
 * de code "VOITURE", rattachée à l'organisation et l'agence fixes de RidnGo
 * (voir
 * application.vehicle.organization-id / agency-id, injectées côté header
 * X-Organization-Id
 * et dans le corps par VehicleAdapter).
 *
 * Schéma confirmé par un test réel (POST /api/resources) :
 * {organizationId, agencyId, resourceCode, name, category, serialNumber,
 * latitude, longitude, ipAddress, macAddress}
 *
 * Le Kernel ne connaît QUE ces champs génériques — tous les attributs
 * spécifiques véhicule
 * (climatisation, wifi, kilométrage, photos...) n'existent pas côté Kernel et
 * sont donc
 * gérés uniquement par RidnGo (cache Redis, voir VehicleAdapter).
 */
@HttpExchange("/api")
public interface VehicleApiClient {

        @PostExchange("/resources")
        Mono<KernelResourceEnvelope> createResource(@RequestBody KernelResourceRequest request);

        @GetExchange("/resources/{id}")
        Mono<KernelResourceEnvelope> getResourceById(@PathVariable String id);

        @PatchExchange("/resources/{id}")
        Mono<KernelResourceEnvelope> patchResource(@PathVariable String id, @RequestBody KernelResourceRequest request);

        /** POST /api/resources/{id}/assignments — remet la ressource à son bénéficiaire (le chauffeur). */
        @PostExchange("/resources/{id}/assignments")
        Mono<KernelResourceEnvelope> assignResource(@PathVariable String id, @RequestBody KernelAssignRequest request);

        record KernelAssignRequest(String assigneeType, String assigneeId) {
        }

        @GetExchange("/resources")
        Mono<KernelResourceListEnvelope> listResources(
                        @org.springframework.web.bind.annotation.RequestParam("organizationId") String organizationId,
                        @org.springframework.web.bind.annotation.RequestParam("agencyId") String agencyId);

        @GetExchange("/resources/{id}/assignments")
        Mono<KernelAssignmentListEnvelope> getAssignments(@PathVariable String id);

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelResourceListEnvelope(boolean success, java.util.List<KernelResource> data, String message,
                        String errorCode) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelAssignment(String id, String assigneeType, String assigneeId, String unassignedAt) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelAssignmentListEnvelope(boolean success, java.util.List<KernelAssignment> data, String message,
                        String errorCode) {
        }

        /**
         * organizationId/agencyId/resourceCode sont injectés côté serveur (fixes pour
         * toute
         * l'app) — jamais fournis par le front. latitude/longitude/ipAddress/macAddress
         * sont
         * optionnels (pertinents seulement si le véhicule embarque un traceur GPS).
         */
        @JsonInclude(JsonInclude.Include.NON_NULL)
        record KernelResourceRequest(
                        String organizationId,
                        String agencyId,
                        String resourceCode,
                        String name,
                        String category,
                        String serialNumber,
                        Double latitude,
                        Double longitude,
                        String ipAddress,
                        String macAddress) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelResource(
                        String id,
                        String organizationId,
                        String agencyId,
                        String resourceCode,
                        String name,
                        String category,
                        String serialNumber,
                        Double latitude,
                        Double longitude,
                        String ipAddress,
                        String macAddress) {
        }

        /**
         * Enveloppe standard Kernel {success, data, message, errorCode} — confirmée sur
         * tous les autres modules.
         */
        @JsonIgnoreProperties(ignoreUnknown = true)
        record KernelResourceEnvelope(boolean success, KernelResource data, String message, String errorCode) {
        }
}