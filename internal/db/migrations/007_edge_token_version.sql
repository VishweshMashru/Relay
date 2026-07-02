-- Per-edge token revocation. Edge JWTs carry a `ver` claim checked against
-- this column on every authenticated edge call, so one leaked token can be
-- killed by bumping the version instead of rotating RELAY_JWT_SECRET (which
-- invalidates every edge at once).
ALTER TABLE edges ADD COLUMN token_version INT NOT NULL DEFAULT 1;
