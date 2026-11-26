package com.yowyob.rideandgo.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class OfferServicePhoneTest {

    @Test
    void internationalPhone() {
        assertEquals("+237678850788", OfferService.internationalPhone("678850788"));
        assertEquals("+237678850788", OfferService.internationalPhone("+237 678 85 07 88"));
        assertEquals("+237678850788", OfferService.internationalPhone("00237678850788"));
        assertEquals("+237678850788", OfferService.internationalPhone("237678850788"));
        assertNull(OfferService.internationalPhone(null));
        assertNull(OfferService.internationalPhone(" "));
    }
}
