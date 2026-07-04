-- Runtime provider switching. The media plane stops being a process-level
-- env var: each project chooses its provider (dashboard setting), and each
-- session records which provider it was provisioned on so teardown always
-- talks to the right backend — switching providers with live sessions is
-- safe.

ALTER TABLE projects ADD COLUMN stream_provider TEXT NOT NULL DEFAULT 'cloudflare';

ALTER TABLE sessions ADD COLUMN provider TEXT NOT NULL DEFAULT 'cloudflare';
-- Backfill from the URL shape: only two providers exist and only CF serves
-- from cloudflarestream.com.
UPDATE sessions SET provider = 'selfhosted'
WHERE viewer_url IS NOT NULL AND viewer_url NOT LIKE '%cloudflarestream.com%';
