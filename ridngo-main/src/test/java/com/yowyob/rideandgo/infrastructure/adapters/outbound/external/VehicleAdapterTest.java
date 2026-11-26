package com.yowyob.rideandgo.infrastructure.adapters.outbound.external;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class VehicleAdapterTest {

    private static String jwt(String payloadJson) {
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        return enc.encodeToString("{\"alg\":\"RS256\"}".getBytes(StandardCharsets.UTF_8)) + "."
                + enc.encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8)) + ".sig";
    }

    @Test
    void actorIdFromJwt_readsActorClaim() {
        assertEquals("a1b2", VehicleAdapter.actorIdFromJwt(jwt("{\"sub\":\"u1\",\"actorId\":\"a1b2\"}")));
    }

    @Test
    void resourceCode_isUniquePerPlate() {
        assertEquals("VOITURE-LT124RG", VehicleAdapter.resourceCode("lt-124 rg"));
        assertEquals(16, VehicleAdapter.resourceCode(null).length());
    }

    @Test
    void actorIdFromJwt_nullWhenMissingOrGarbage() {
        assertNull(VehicleAdapter.actorIdFromJwt(jwt("{\"sub\":\"u1\"}")));
        assertNull(VehicleAdapter.actorIdFromJwt("driver-1-token"));
        assertNull(VehicleAdapter.actorIdFromJwt(null));
    }
}
