-- Record-from-live. Cloudflare records every live session anyway
-- (recording.mode=automatic is required for HLS); until now teardown
-- deleted the recording. record=true keeps it: teardown registers the
-- recording as a cloudflare-sourced asset instead.

ALTER TABLE sessions ADD COLUMN record BOOLEAN NOT NULL DEFAULT false;
-- Retention applied to the harvested recording; NULL = keep forever.
ALTER TABLE sessions ADD COLUMN record_ttl_seconds INT;

-- Assets now come from two backends: 's3' (uploaded clips; storage_key is
-- the bucket key) and 'cloudflare' (live recordings; storage_key is the CF
-- video UID).
ALTER TABLE assets ADD COLUMN source TEXT NOT NULL DEFAULT 's3';
-- Harvest can be attempted from multiple paths (teardown, reaper, webhook);
-- one asset row per CF video no matter who gets there first.
CREATE UNIQUE INDEX assets_cf_video_idx ON assets(storage_key) WHERE source = 'cloudflare';

-- Webhooks look sessions up by their live input.
CREATE INDEX sessions_input_uid_idx ON sessions(stream_input_uid) WHERE stream_input_uid IS NOT NULL;
