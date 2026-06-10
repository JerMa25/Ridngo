-- liquibase formatted sql
-- changeset yowyob:016-add-offer-number-of-places
-- comment: Ajout du nombre de places pour les offres de covoiturage

ALTER TABLE ride_and_go.offers
ADD COLUMN IF NOT EXISTS number_of_places INT NOT NULL DEFAULT 1;
