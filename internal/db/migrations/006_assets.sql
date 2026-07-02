-- Assets: the VOD domain. An asset is any stored video object — an
-- edge-uploaded clip today, a live-session recording later. Retention is
-- first-class: expires_at NULL means keep forever, otherwise the reaper
-- deletes blob + row after expiry.
CREATE TABLE assets (
    id            UUID PRIMARY KEY,
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    camera_id     UUID REFERENCES cameras(id) ON DELETE SET NULL,
    session_id    UUID REFERENCES sessions(id) ON DELETE SET NULL,
    name          TEXT,
    content_type  TEXT NOT NULL DEFAULT 'video/mp4',
    size_bytes    BIGINT,
    status        TEXT NOT NULL DEFAULT 'pending',   -- pending | ready
    storage_key   TEXT NOT NULL,
    metadata      JSONB,
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX assets_project_idx ON assets(project_id, created_at DESC);
CREATE INDEX assets_camera_idx ON assets(camera_id) WHERE camera_id IS NOT NULL;
CREATE INDEX assets_expiry_idx ON assets(expires_at) WHERE expires_at IS NOT NULL;
