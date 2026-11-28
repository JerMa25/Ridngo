package com.yowyob.rideandgo.application.service;

import com.yowyob.rideandgo.domain.model.DriverSubscription;
import com.yowyob.rideandgo.domain.model.PlatformSettings;
import com.yowyob.rideandgo.domain.model.Wallet;
import com.yowyob.rideandgo.domain.ports.out.PaymentPort;
import com.yowyob.rideandgo.domain.ports.out.PlatformRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PlatformServiceTest {

    private final UUID driver = UUID.randomUUID();
    private PlatformRepositoryPort repo;
    private PaymentPort payment;
    private PlatformService service;

    @BeforeEach
    void setUp() {
        repo = mock(PlatformRepositoryPort.class);
        payment = mock(PaymentPort.class);
        service = new PlatformService(repo, payment);
        when(repo.getSettings()).thenReturn(Mono.just(PlatformSettings.builder()
                .commissionRate(0.15).monthlyPrice(5000).yearlyPrice(50000).subscriptionsEnabled(true).build()));
    }

    private DriverSubscription sub(LocalDateTime start, LocalDateTime end) {
        return DriverSubscription.builder().id(UUID.randomUUID()).driverId(driver).plan("MONTHLY")
                .amount(5000).startsAt(start).endsAt(end).paymentReference("r").build();
    }

    @Test
    void commissionUsesAdminRateWithoutSubscription() {
        when(repo.findSubscriptionsByDriver(driver)).thenReturn(Flux.empty());
        StepVerifier.create(service.commissionFor(driver, 2000)).expectNext(300.0).verifyComplete();
    }

    @Test
    void noCommissionWhileSubscribed() {
        LocalDateTime now = LocalDateTime.now();
        when(repo.findSubscriptionsByDriver(driver)).thenReturn(Flux.just(sub(now.minusDays(1), now.plusDays(10))));
        StepVerifier.create(service.commissionFor(driver, 2000)).expectNext(0.0).verifyComplete();
    }

    @Test
    void expiredSubscriptionChargesCommissionAgain() {
        LocalDateTime now = LocalDateTime.now();
        when(repo.findSubscriptionsByDriver(driver)).thenReturn(Flux.just(sub(now.minusMonths(2), now.minusMonths(1))));
        StepVerifier.create(service.commissionFor(driver, 1000)).expectNext(150.0).verifyComplete();
    }

    @Test
    void renewalStartsWhenCurrentPeriodEnds() {
        LocalDateTime currentEnd = LocalDateTime.now().plusDays(5);
        UUID wallet = UUID.randomUUID();
        String ref = "RIDE-SUB-YEARLY-" + driver + "-1";
        when(payment.getWalletByOwnerId(driver)).thenReturn(Mono.just(new Wallet(wallet, driver, "d", 100000)));
        when(payment.processPayment(wallet, 50000, ref, "tok", "123")).thenReturn(Mono.empty());
        when(repo.findLatestSubscription(driver)).thenReturn(Mono.just(sub(LocalDateTime.now(), currentEnd)));
        when(repo.saveSubscription(any())).thenAnswer(inv -> Mono.just(inv.getArgument(0)));

        StepVerifier.create(service.confirmSubscription(driver, "YEARLY", ref, "tok", " 123 "))
                .assertNext(s -> {
                    assertThat(s.startsAt()).isEqualTo(currentEnd);
                    assertThat(s.endsAt()).isEqualTo(currentEnd.plusYears(1));
                    assertThat(s.amount()).isEqualTo(50000);
                })
                .verifyComplete();
    }

    @Test
    void rejectsReferenceOfAnotherDriver() {
        StepVerifier.create(service.confirmSubscription(driver, "MONTHLY",
                        "RIDE-SUB-MONTHLY-" + UUID.randomUUID() + "-1", "tok", "123"))
                .expectError(IllegalArgumentException.class).verify();
        verify(payment, never()).processPayment(any(), anyDouble(), any(), any(), any());
    }

    @Test
    void rejectsOutOfRangeCommission() {
        StepVerifier.create(service.updateSettings(PlatformSettings.builder()
                        .commissionRate(0.8).monthlyPrice(1).yearlyPrice(1).build()))
                .expectError(IllegalArgumentException.class).verify();
    }
}
