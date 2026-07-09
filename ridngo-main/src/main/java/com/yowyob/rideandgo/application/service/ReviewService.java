package com.yowyob.rideandgo.application.service;

import com.yowyob.rideandgo.application.utils.Utils;
import com.yowyob.rideandgo.domain.model.Review;
import com.yowyob.rideandgo.domain.model.User;
import com.yowyob.rideandgo.domain.model.enums.RideState;
import com.yowyob.rideandgo.domain.ports.out.DriverRepositoryPort;
import com.yowyob.rideandgo.domain.ports.out.ReviewRepositoryPort;
import com.yowyob.rideandgo.domain.ports.out.RideRepositoryPort;
import com.yowyob.rideandgo.domain.ports.out.UserRepositoryPort;
import com.yowyob.rideandgo.infrastructure.adapters.inbound.rest.dto.ReviewResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {
    private final ReviewRepositoryPort reviewRepository;
    private final RideRepositoryPort rideRepository;
    private final DriverRepositoryPort driverRepository;
    private final UserRepositoryPort userRepository;

    @Transactional
    public Mono<Review> submitReview(UUID rideId, UUID passengerId, int stars, String comment, boolean anonymous) {
        log.info("⭐ Process start: Submitting {} stars for ride {} (anonymous={})", stars, rideId, anonymous);

        return rideRepository.findRideById(rideId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Course introuvable")))
                .flatMap(ride -> {
                    // Validations métier
                    if (ride.state() != RideState.COMPLETED) {
                        return Mono.error(new IllegalStateException("Seule une course COMPLETED peut être notée."));
                    }
                    if (!ride.passengerId().equals(passengerId)) {
                        return Mono.error(new IllegalStateException("Accès refusé: vous n'êtes pas le passager de cette course."));
                    }

                    Review review = Review.builder()
                            .id(Utils.generateUUID())
                            .rideId(rideId)
                            .driverId(ride.driverId())
                            .passengerId(passengerId)
                            .rating(stars)
                            .comment(comment)
                            .anonymous(anonymous)
                            .build();

                    // 1. Sauvegarde l'avis 
                    // 2. Déclenche le recalcul immédiat
                    // 3. Retourne l'avis sauvegardé
                    return reviewRepository.save(review)
                            .doOnSuccess(saved -> log.info("✅ Review saved. Triggering driver stats update..."))
                            .flatMap(savedReview -> updateDriverStats(ride.driverId())
                                    .thenReturn(savedReview));
                });
    }

    private Mono<Void> updateDriverStats(UUID driverId) {
        return Mono.zip(
                reviewRepository.getAverageRatingForDriver(driverId),
                reviewRepository.countReviewsForDriver(driverId)
        ).flatMap(tuple -> {
            Double avg = tuple.getT1();
            Long count = tuple.getT2();
            
            log.info("📊 New Stats for driver {}: Avg={}, Count={}", driverId, avg, count);

            return driverRepository.findById(driverId)
                    .flatMap(driver -> {
                        var updatedDriver = driver.toBuilder()
                                .rating(avg != null ? avg : 0.0)
                                .totalReviewsCount(count != null ? count.intValue() : 0)
                                .build();
                        return driverRepository.save(updatedDriver);
                    });
        }).then();
    }

    public Flux<ReviewResponse> getReviewsForDriver(UUID driverId) {
        return reviewRepository.findAllByDriverId(driverId)
                .flatMap(review -> userRepository.findUserById(review.passengerId())
                        .map(user -> mapToResponse(review, user))
                        .defaultIfEmpty(mapToResponse(review, User.builder().firstName("Client").lastName("Anonyme").build()))
                );
    }

    private ReviewResponse mapToResponse(Review review, User passenger) {
        // Si l'évaluation est anonyme, on masque le nom et la photo du passager
        boolean isAnonymous = review.anonymous();
        return ReviewResponse.builder()
                .reviewId(review.id())
                .rideId(review.rideId())
                .rating(review.rating())
                .comment(review.comment())
                .createdAt(review.createdAt())
                .anonymous(isAnonymous)
                .passengerName(isAnonymous ? "Anonyme" : passenger.firstName() + " " + passenger.lastName())
                .passengerPhoto(isAnonymous ? null : passenger.photoUri())
                .build();
    }
}