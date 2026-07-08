package com.yowyob.rideandgo.infrastructure.adapters.inbound.rest.dto;

import com.yowyob.rideandgo.domain.model.Bid;
import com.yowyob.rideandgo.domain.model.enums.OfferState;

import java.util.List;
import java.util.UUID;

public record OfferResponse(
        UUID id,
        UUID passengerId,
        String passengerName,
        UUID selectedDriverId,
        String startPoint,
        Double startLat, // ✅ AJOUTÉ
        Double startLon, // ✅ AJOUTÉ
        String endPoint,
        Double endLat, // ✅ Pour dessiner la ligne d'arrivée sur la map
        Double endLon, // ✅ 
        double price,
        int numberOfPlaces,
        String passengerPhone,
        String departureTime,
        OfferState state,
        List<Bid> bids 
) {}

