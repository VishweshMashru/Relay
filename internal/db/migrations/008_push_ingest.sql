-- Agentless push ingest. A session no longer requires a camera: with
-- ingest='push' the client (a drone controller, OBS, any RTMP encoder)
-- pushes straight to the returned URL — no edge agent involved.
--
-- Sessions also gain a direct project_id. Ownership used to be derived
-- via camera→edge→project, which breaks for camera-less sessions and made
-- every list query a three-way join.

ALTER TABLE sessions ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
UPDATE sessions s
SET project_id = e.project_id
FROM cameras c
JOIN edges e ON e.id = c.edge_id
WHERE c.id = s.camera_id;
ALTER TABLE sessions ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE sessions ALTER COLUMN camera_id DROP NOT NULL;
ALTER TABLE sessions ADD COLUMN ingest TEXT NOT NULL DEFAULT 'edge';

CREATE INDEX sessions_project_idx ON sessions(project_id, started_at DESC);
