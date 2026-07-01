-- Dashboard users. Maps Clerk identities to Relay projects so the Next.js
-- dashboard can attach a signed-in user to their tenant.
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id  TEXT NOT NULL UNIQUE,
    email          TEXT NOT NULL,
    project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX users_project_idx ON users(project_id);
