package com.yowyob.rideandgo.infrastructure.adapters.outbound.persistence;

import com.yowyob.rideandgo.domain.model.DriverSubscription;
import com.yowyob.rideandgo.domain.model.PlatformSettings;
import com.yowyob.rideandgo.domain.ports.out.PlatformRepositoryPort;
import io.r2dbc.spi.Row;
import lombok.RequiredArgsConstructor;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PlatformR2dbcAdapter implements PlatformRepositoryPort {

    // Dates renvoyées en ISO pour le JSON des écrans admin
    private static final String ISO = "'YYYY-MM-DD\"T\"HH24:MI:SS'";

    private final DatabaseClient db;

    @Override
    public Mono<PlatformSettings> getSettings() {
        return db.sql("SELECT commission_rate, monthly_price, yearly_price, subscriptions_enabled, updated_at FROM platform_settings WHERE id = 1")
                .map((row, meta) -> PlatformSettings.builder()
                        .commissionRate(row.get("commission_rate", Double.class))
                        .monthlyPrice(row.get("monthly_price", Double.class))
                        .yearlyPrice(row.get("yearly_price", Double.class))
                        .subscriptionsEnabled(Boolean.TRUE.equals(row.get("subscriptions_enabled", Boolean.class)))
                        .updatedAt(row.get("updated_at", LocalDateTime.class))
                        .build())
                .one();
    }

    @Override
    public Mono<PlatformSettings> saveSettings(PlatformSettings s) {
        return db.sql("""
                INSERT INTO platform_settings (id, commission_rate, monthly_price, yearly_price, subscriptions_enabled, updated_at)
                VALUES (1, :rate, :monthly, :yearly, :enabled, NOW())
                ON CONFLICT (id) DO UPDATE SET commission_rate = :rate, monthly_price = :monthly,
                    yearly_price = :yearly, subscriptions_enabled = :enabled, updated_at = NOW()
                """)
                .bind("rate", s.commissionRate())
                .bind("monthly", s.monthlyPrice())
                .bind("yearly", s.yearlyPrice())
                .bind("enabled", s.subscriptionsEnabled())
                .then()
                .then(getSettings());
    }

    @Override
    public Mono<DriverSubscription> saveSubscription(DriverSubscription s) {
        return db.sql("""
                INSERT INTO driver_subscriptions (id, driver_id, plan, amount, starts_at, ends_at, payment_reference, created_at)
                VALUES (:id, :driverId, :plan, :amount, :startsAt, :endsAt, :ref, NOW())
                """)
                .bind("id", s.id())
                .bind("driverId", s.driverId())
                .bind("plan", s.plan())
                .bind("amount", s.amount())
                .bind("startsAt", s.startsAt())
                .bind("endsAt", s.endsAt())
                .bind("ref", s.paymentReference())
                .then()
                .thenReturn(s);
    }

    @Override
    public Mono<DriverSubscription> findLatestSubscription(UUID driverId) {
        return db.sql("SELECT * FROM driver_subscriptions WHERE driver_id = :driverId AND ends_at > NOW() ORDER BY ends_at DESC LIMIT 1")
                .bind("driverId", driverId)
                .map((row, meta) -> toSubscription(row))
                .one();
    }

    @Override
    public Flux<DriverSubscription> findSubscriptionsByDriver(UUID driverId) {
        return db.sql("SELECT * FROM driver_subscriptions WHERE driver_id = :driverId ORDER BY created_at DESC")
                .bind("driverId", driverId)
                .map((row, meta) -> toSubscription(row))
                .all();
    }

    @Override
    public Flux<DriverSubscription> findRecentSubscriptions(int limit) {
        return db.sql("SELECT * FROM driver_subscriptions ORDER BY created_at DESC LIMIT :limit")
                .bind("limit", limit)
                .map((row, meta) -> toSubscription(row))
                .all();
    }

    private static DriverSubscription toSubscription(Row row) {
        return DriverSubscription.builder()
                .id(row.get("id", UUID.class))
                .driverId(row.get("driver_id", UUID.class))
                .plan(row.get("plan", String.class))
                .amount(row.get("amount", Double.class))
                .startsAt(row.get("starts_at", LocalDateTime.class))
                .endsAt(row.get("ends_at", LocalDateTime.class))
                .paymentReference(row.get("payment_reference", String.class))
                .createdAt(row.get("created_at", LocalDateTime.class))
                .build();
    }

    @Override
    public Mono<Map<String, Object>> adminStats() {
        return db.sql("""
                SELECT
                  (SELECT COUNT(*) FROM users) AS "users",
                  (SELECT COUNT(*) FROM drivers) AS "drivers",
                  (SELECT COUNT(*) FROM drivers WHERE is_online) AS "driversOnline",
                  (SELECT COUNT(*) FROM drivers WHERE NOT is_profile_validated) AS "driversPending",
                  (SELECT COUNT(*) FROM offers) AS "offers",
                  (SELECT COUNT(*) FROM offers WHERE state IN ('PENDING', 'BID_RECEIVED', 'DRIVER_SELECTED')) AS "offersOpen",
                  (SELECT COUNT(*) FROM rides) AS "rides",
                  (SELECT COUNT(*) FROM rides WHERE state IN ('CREATED', 'ONGOING')) AS "ridesActive",
                  (SELECT COUNT(*) FROM rides WHERE state = 'COMPLETED') AS "ridesCompleted",
                  (SELECT COUNT(*) FROM rides WHERE state = 'CANCELLED') AS "ridesCancelled",
                  (SELECT COALESCE(SUM(o.price), 0)::float8 FROM rides r JOIN offers o ON o.id = r.offer_id WHERE r.state = 'COMPLETED') AS "volume",
                  (SELECT COUNT(DISTINCT driver_id) FROM driver_subscriptions WHERE NOW() >= starts_at AND NOW() < ends_at) AS "subscriptionsActive",
                  (SELECT COALESCE(SUM(amount), 0)::float8 FROM driver_subscriptions) AS "subscriptionsRevenue"
                """)
                .fetch().one();
    }

    @Override
    public Flux<Map<String, Object>> ridesPerDay() {
        return db.sql("""
                SELECT to_char(d, 'YYYY-MM-DD') AS "day", COUNT(r.id) AS "rides"
                FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, INTERVAL '1 day') d
                LEFT JOIN rides r ON r.created_at::date = d::date
                GROUP BY d ORDER BY d
                """)
                .fetch().all();
    }

    @Override
    public Flux<Map<String, Object>> recentRides(int limit) {
        return db.sql("""
                SELECT r.id, r.state::text AS "state", to_char(r.created_at, %s) AS "createdAt",
                       o.start_point AS "from", o.end_point AS "to", o.price::float8 AS "price",
                       pu.name AS "passenger", du.name AS "driver"
                FROM rides r
                LEFT JOIN offers o ON o.id = r.offer_id
                LEFT JOIN users pu ON pu.id = r.passenger_id
                LEFT JOIN users du ON du.id = r.driver_id
                ORDER BY r.created_at DESC LIMIT :limit
                """.formatted(ISO))
                .bind("limit", limit)
                .fetch().all();
    }

    @Override
    public Flux<Map<String, Object>> recentOffers(int limit) {
        return db.sql("""
                SELECT o.id, o.state::text AS "state", to_char(o.created_at, %s) AS "createdAt",
                       o.start_point AS "from", o.end_point AS "to", o.price::float8 AS "price", pu.name AS "passenger"
                FROM offers o
                LEFT JOIN users pu ON pu.id = o.passenger_id
                ORDER BY o.created_at DESC LIMIT :limit
                """.formatted(ISO))
                .bind("limit", limit)
                .fetch().all();
    }

    @Override
    public Flux<Map<String, Object>> users(String search, int limit) {
        String q = search == null ? "" : search.trim();
        return db.sql("""
                SELECT u.id, u.name, u.email_address AS "email", u.phone_number AS "phone", u.photo_uri AS "photoUri",
                       COALESCE(string_agg(ro.name, ','), '') AS "roles"
                FROM users u
                LEFT JOIN user_has_roles ur ON ur.user_id = u.id
                LEFT JOIN roles ro ON ro.id = ur.role_id
                WHERE :q = '' OR u.name ILIKE :like OR u.email_address ILIKE :like OR u.phone_number ILIKE :like
                GROUP BY u.id ORDER BY u.name LIMIT :limit
                """)
                .bind("q", q)
                .bind("like", "%" + q + "%")
                .bind("limit", limit)
                .fetch().all();
    }

    @Override
    public Flux<Map<String, Object>> drivers(int limit) {
        return db.sql("""
                SELECT d.id, u.name, u.email_address AS "email", u.phone_number AS "phone", u.photo_uri AS "photoUri",
                       d.is_online AS "online", d.is_profile_validated AS "validated", d.is_profile_completed AS "completed",
                       d.license_number AS "licenseNumber",
                       (SELECT COUNT(*) FROM rides r WHERE r.driver_id = d.id AND r.state = 'COMPLETED') AS "completedRides",
                       (SELECT to_char(MAX(s.ends_at), %s) FROM driver_subscriptions s WHERE s.driver_id = d.id AND s.ends_at > NOW()) AS "subscriptionEndsAt"
                FROM drivers d
                LEFT JOIN users u ON u.id = d.id
                ORDER BY d.is_profile_validated, u.name LIMIT :limit
                """.formatted(ISO))
                .bind("limit", limit)
                .fetch().all();
    }

    @Override
    public Mono<Boolean> setDriverValidated(UUID driverId, boolean validated) {
        return db.sql("UPDATE drivers SET is_profile_validated = :v WHERE id = :id")
                .bind("v", validated)
                .bind("id", driverId)
                .fetch().rowsUpdated()
                .map(n -> n > 0);
    }
}
