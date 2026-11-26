-- liquibase formatted sql

-- changeset yowyob:000a-extensions
-- comment: uuid_generate_v4() utilisé par 000-initial-schema ; no-op si l'extension existe déjà (prod)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
