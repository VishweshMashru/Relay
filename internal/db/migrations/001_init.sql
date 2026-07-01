CREATE TABLE projects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    api_key_hash  TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE edges (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    hostname      TEXT,
    token_hash    TEXT NOT NULL,
    last_seen_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX edges_project_idx ON edges(project_id);

CREATE TABLE cameras (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edge_id     UUID NOT NULL REFERENCES edges(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cameras_edge_idx ON cameras(edge_id);

CREATE TABLE sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id           UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    status              TEXT NOT NULL DEFAULT 'pending',
    protocol            TEXT NOT NULL DEFAULT 'hls',
    viewer_url          TEXT,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_heartbeat_at   TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_camera_idx ON sessions(camera_id);
CREATE INDEX sessions_active_idx ON sessions(status) WHERE status IN ('pending','live');

CREATE TABLE commands (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edge_id       UUID NOT NULL REFERENCES edges(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,
    session_id    UUID,
    camera_id     UUID,
    payload       JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at  TIMESTAMPTZ
);
CREATE INDEX commands_undelivered_idx ON commands(edge_id, created_at) WHERE delivered_at IS NULL;
