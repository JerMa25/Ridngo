package com.yowyob.rideandgo.domain.model;

import com.yowyob.rideandgo.domain.model.enums.OfferState;
import lombok.Builder;
import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

@Builder
public record Offer(
        UUID id,
        UUID passengerId,
        UUID selectedDriverId,
        String startPoint,
        Double startLat,
        Double startLon,
        String endPoint,
        Double endLat, // ✅ AJOUTÉ
        Double endLon, // ✅ AJOUTÉ
        double price,
        int numberOfPlaces,
        String passengerPhone,
        String departureTime,
        OfferState state,
        List<Bid> bids,
        Long version,
        LocalDateTime createdAt, // ✅ Ajouté pour la landing page
        String passengerName // ✅ Ajouté pour affichage dans la vue chauffeur
) {
    public Offer withBids(List<Bid> bids) {
        return new Offer(id, passengerId, selectedDriverId, startPoint, startLat, startLon,
                endPoint, endLat, endLon, price, numberOfPlaces, passengerPhone, departureTime, state, bids, version, createdAt, passengerName);
    }

    public Offer withState(OfferState state) {
        return new Offer(id, passengerId, selectedDriverId, startPoint, startLat, startLon,
                endPoint, endLat, endLon, price, numberOfPlaces, passengerPhone, departureTime, state, bids, version, createdAt, passengerName);
    }

    public Offer withDriverSelected(UUID driverId) {
        return new Offer(id, passengerId, driverId, startPoint, startLat, startLon,
                endPoint, endLat, endLon, price, numberOfPlaces, passengerPhone, departureTime, OfferState.DRIVER_SELECTED, bids,
                version, createdAt, passengerName);
    }

    public Offer withPassengerName(String name) {
        return new Offer(id, passengerId, selectedDriverId, startPoint, startLat, startLon,
                endPoint, endLat, endLon, price, numberOfPlaces, passengerPhone, departureTime, state, bids, version, createdAt, name);
    }

    public boolean hasDriverApplied(UUID driverId) {
        if (bids == null)
            return false;
        return bids.stream().anyMatch(b -> b.driverId().equals(driverId));
    }
}