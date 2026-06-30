-- liquibase formatted sql
-- changeset yowyob:017-add-anonymous-to-reviews
-- comment: Ajout de la colonne anonymous pour permettre aux passagers de soumettre un avis de facon anonyme
ALTER TABLE ride_and_go.reviews
ADD COLUMN IF NOT EXISTS anonymous BOOLEAN NOT NULL DEFAULT FALSE;
