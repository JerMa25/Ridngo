-- liquibase formatted sql
-- changeset yowyob:018-add-review-anonymous
-- comment: Ajoute la colonne "anonymous" attendue par le code applicatif mais jamais créée en base (schema drift)
ALTER TABLE
    ride_and_go.reviews
ADD
    COLUMN IF NOT EXISTS anonymous BOOLEAN NOT NULL DEFAULT FALSE;