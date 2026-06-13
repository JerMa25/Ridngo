package com.yowyob.rideandgo.infrastructure.adapters.inbound.rest.dto;

public record CreateOfferRequest(
        String startPoint,
        Double startLat,
        Double startLon,
        String endPoint,
        Double endLat, // ✅ AJOUTÉ
        Double endLon, // ✅ AJOUTÉ
        double price,
        int numberOfPlaces,
        String passengerPhone, 
        String departureTime 
) {}