package com.yowyob.template.domain.ports.out;

import com.yowyob.template.domain.model.Ride;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface RideRepositoryPort {
    Mono<Ride> save(Ride ride);

    Mono<Ride> findRideById(UUID id);
}