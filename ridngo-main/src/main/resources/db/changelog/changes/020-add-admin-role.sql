-- db/changelog/changes/020-add-admin-role.sql
-- Rôle admin local : attribué aux emails listés dans application.admin.emails (ADMIN_EMAILS) à la connexion
INSERT INTO roles (name) VALUES ('RIDE_AND_GO_ADMIN') ON CONFLICT (name) DO NOTHING;
