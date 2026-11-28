-- db/changelog/changes/019-create-platform-settings-and-subscriptions.sql
-- Réglages de la plateforme modifiables par l'admin (une seule ligne, id = 1)
CREATE TABLE IF NOT EXISTS platform_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    commission_rate DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    monthly_price DOUBLE PRECISION NOT NULL DEFAULT 5000,
    yearly_price DOUBLE PRECISION NOT NULL DEFAULT 50000,
    subscriptions_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Abonnements chauffeur : pendant [starts_at, ends_at[ aucune commission n'est prélevée par course
CREATE TABLE IF NOT EXISTS driver_subscriptions (
    id UUID PRIMARY KEY,
    driver_id UUID NOT NULL,
    plan VARCHAR(20) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    payment_reference VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_subscriptions_driver ON driver_subscriptions(driver_id, ends_at);
