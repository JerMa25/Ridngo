package com.yowyob.rideandgo.infrastructure.adapters.inbound.rest.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ReviewResponse {
    private UUID reviewId;
    private UUID rideId;
    private int rating;
    private String comment;
    private LocalDateTime createdAt;

    // Indique si l'avis a été soumis de façon anonyme
    private boolean anonymous;

    // Infos sur celui qui a laissé l'avis
    // Si anonymous=true : passengerName = "Anonyme", passengerPhoto = null
    private String passengerName;
    private String passengerPhoto;
}