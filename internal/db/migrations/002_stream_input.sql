-- Remember the Cloudflare Stream Live input UID so we can Destroy() it when a
-- session ends. Nullable because rows written before this migration don't have it.
ALTER TABLE sessions ADD COLUMN stream_input_uid TEXT;
