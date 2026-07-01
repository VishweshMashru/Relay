-- Real auth + multi-tenant isolation.
--
-- Move from a single-column api_key_hash-on-projects to a proper api_keys
-- table (multiple keys per project, hashed at rest, indexable prefix).
-- Edges switch from a stored token_hash to stateless JWT — column stays for
-- forward compatibility but becomes optional.

CREATE TABLE api_keys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key_prefix    TEXT NOT NULL,      -- first 16 chars (e.g. "rk_live_abcd1234") for O(1) lookup + display
    key_hash      TEXT NOT NULL,      -- sha256 hex of the full raw key
    label         TEXT,
    last_used_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_prefix_idx  ON api_keys(key_prefix);
CREATE INDEX api_keys_project_idx ON api_keys(project_id);

ALTER TABLE projects DROP COLUMN api_key_hash;
ALTER TABLE edges    ALTER COLUMN token_hash DROP NOT NULL;
