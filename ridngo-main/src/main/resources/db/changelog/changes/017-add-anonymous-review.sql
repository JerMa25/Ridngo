-- liquibase formatted sql
-- changeset yowyob:017-add-anonymous-review
-- comment: Ajout du champ anonymous pour les avis envoyés de façon anonyme
ALTER TABLE ride_and_go.reviews
ADD COLUMN IF NOT EXISTS anonymous BOOLEAN NOT NULL DEFAULT FALSE;
