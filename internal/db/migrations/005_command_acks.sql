-- Command delivery was at-most-once: delivered_at was stamped at claim time,
-- so a long-poll response lost in flight meant a lost start/stop. Claims now
-- take a short lease and the edge acks after dispatch; unacked commands are
-- redelivered once the lease lapses.
ALTER TABLE commands ADD COLUMN lease_expires_at TIMESTAMPTZ;
ALTER TABLE commands ADD COLUMN acked_at TIMESTAMPTZ;

-- Everything delivered before acks existed is treated as acked so old
-- commands aren't replayed at deploy time.
UPDATE commands SET acked_at = delivered_at WHERE delivered_at IS NOT NULL;

DROP INDEX commands_undelivered_idx;
CREATE INDEX commands_unacked_idx ON commands(edge_id, created_at) WHERE acked_at IS NULL;
