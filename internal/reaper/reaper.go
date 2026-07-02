// Package reaper is a background loop that expires stale sessions and
// destroys their Cloudflare Stream Live inputs.
//
// Without this, sessions leak: a viewer closes their tab, the pagehide
// DELETE never fires, and the session's CF Stream input sits allocated
// forever. Runs in-process next to the HTTP server, same shape as the
// heartbeat/assignment loops in Foreman.
package reaper

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"relay/internal/relay"
	"relay/internal/storage"
	"relay/internal/stream"
)

type Reaper struct {
	Pool         *pgxpool.Pool
	Stream       stream.Provider
	Blobs        storage.Store // nil disables asset retention sweeps
	Interval     time.Duration // how often to sweep
	StaleAfter   time.Duration // no-heartbeat threshold before we consider a live session dead
	StartupGrace time.Duration // extra slack for pending sessions that never heartbeated — CF manifest build + ffmpeg connect can take ~60s

	lastPrune time.Time
}

func New(pool *pgxpool.Pool, s stream.Provider, blobs storage.Store) *Reaper {
	return &Reaper{
		Pool:         pool,
		Stream:       s,
		Blobs:        blobs,
		Interval:     10 * time.Second,
		StaleAfter:   30 * time.Second,
		StartupGrace: 90 * time.Second,
	}
}

func (r *Reaper) Run(ctx context.Context) {
	log.Printf("reaper starting interval=%s stale_after=%s startup_grace=%s", r.Interval, r.StaleAfter, r.StartupGrace)
	ticker := time.NewTicker(r.Interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			n, err := r.sweep(ctx)
			if err != nil {
				log.Printf("reaper sweep: %v", err)
			} else if n > 0 {
				log.Printf("reaper expired %d session(s)", n)
			}
			r.sweepAssets(ctx)
			r.prune(ctx)
		}
	}
}

// sweepAssets deletes assets past their retention TTL — blob first, then row,
// so a storage failure leaves the row for the next sweep instead of orphaning
// the object.
func (r *Reaper) sweepAssets(ctx context.Context) {
	if r.Blobs == nil {
		return
	}
	rows, err := r.Pool.Query(ctx, `
		SELECT id::text, storage_key FROM assets
		WHERE expires_at IS NOT NULL AND expires_at < now()
		LIMIT 100
	`)
	if err != nil {
		log.Printf("reaper assets: %v", err)
		return
	}
	type expired struct{ id, key string }
	var toDelete []expired
	for rows.Next() {
		var e expired
		if err := rows.Scan(&e.id, &e.key); err != nil {
			rows.Close()
			log.Printf("reaper assets: %v", err)
			return
		}
		toDelete = append(toDelete, e)
	}
	rows.Close()

	for _, e := range toDelete {
		if err := r.Blobs.Delete(ctx, e.key); err != nil {
			log.Printf("reaper assets: delete blob %s: %v", e.id, err)
			continue
		}
		if _, err := r.Pool.Exec(ctx, `DELETE FROM assets WHERE id = $1`, e.id); err != nil {
			log.Printf("reaper assets: delete row %s: %v", e.id, err)
		}
	}
	if len(toDelete) > 0 {
		log.Printf("reaper expired %d asset(s)", len(toDelete))
	}
}

// prune keeps the commands and sessions tables from growing forever. Runs at
// most hourly. Commands are dead after the 1h redelivery window; ended
// sessions keep 30 days of history for debugging/billing.
func (r *Reaper) prune(ctx context.Context) {
	if time.Since(r.lastPrune) < time.Hour {
		return
	}
	r.lastPrune = time.Now()
	if tag, err := r.Pool.Exec(ctx,
		`DELETE FROM commands WHERE created_at < now() - interval '24 hours'`); err != nil {
		log.Printf("reaper prune commands: %v", err)
	} else if tag.RowsAffected() > 0 {
		log.Printf("reaper pruned %d command(s)", tag.RowsAffected())
	}
	if tag, err := r.Pool.Exec(ctx, `
		DELETE FROM sessions s
		WHERE s.status IN ('ended','expired')
		  AND s.created_at < now() - interval '30 days'
		  AND NOT EXISTS (SELECT 1 FROM assets a WHERE a.session_id = s.id)
	`); err != nil {
		log.Printf("reaper prune sessions: %v", err)
	} else if tag.RowsAffected() > 0 {
		log.Printf("reaper pruned %d session(s)", tag.RowsAffected())
	}
}

// sweep marks stale sessions expired, emits stop commands, notifies edges,
// and destroys the associated CF inputs. Returns how many sessions it reaped.
func (r *Reaper) sweep(ctx context.Context) (int, error) {
	// One statement finds+updates candidates and returns what we need to
	// clean up. Doing it as a single UPDATE ... RETURNING avoids a race
	// where two reaper instances would double-reap the same session.
	// Heartbeat staleness only applies to edge-ingest sessions: a push
	// session (drone, OBS) may legitimately stream with no browser viewer
	// attached, so it lives until its TTL or an explicit DELETE.
	rows, err := r.Pool.Query(ctx, `
		UPDATE sessions
		SET status = 'expired'
		WHERE status IN ('pending', 'live')
		  AND (
		    expires_at < now()
		    OR (ingest = 'edge' AND last_heartbeat_at IS NOT NULL AND last_heartbeat_at < now() - ($1 || ' seconds')::interval)
		    -- Never heartbeated: the viewer may still be waiting for CF to
		    -- build the first manifest, so allow the longer startup grace.
		    OR (ingest = 'edge' AND last_heartbeat_at IS NULL AND started_at < now() - ($2 || ' seconds')::interval)
		  )
		RETURNING id::text, COALESCE(camera_id::text, ''), COALESCE(stream_input_uid, '')
	`, int(r.StaleAfter.Seconds()), int(r.StartupGrace.Seconds()))
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	type expired struct {
		sessionID, cameraID, streamUID string
	}
	var toReap []expired
	for rows.Next() {
		var e expired
		if err := rows.Scan(&e.sessionID, &e.cameraID, &e.streamUID); err != nil {
			return 0, err
		}
		toReap = append(toReap, e)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}

	for _, e := range toReap {
		// Push-ingest sessions have no camera/edge; destroying the CF input
		// below is what stops them.
		if e.cameraID != "" {
			var edgeID string
			if err := r.Pool.QueryRow(ctx,
				`SELECT edge_id::text FROM cameras WHERE id = $1`, e.cameraID,
			).Scan(&edgeID); err != nil {
				log.Printf("reaper: fetch edge for session %s: %v", e.sessionID, err)
				continue
			}
			var cmdID string
			if err := r.Pool.QueryRow(ctx, `
				INSERT INTO commands(edge_id, type, session_id, camera_id)
				VALUES ($1, 'stop', $2, $3) RETURNING id::text
			`, edgeID, e.sessionID, e.cameraID).Scan(&cmdID); err != nil {
				log.Printf("reaper: insert stop for session %s: %v", e.sessionID, err)
				continue
			}
			if _, err := r.Pool.Exec(ctx,
				"SELECT pg_notify($1, $2)", relay.CommandsChannel, edgeID,
			); err != nil {
				log.Printf("reaper: notify edge %s: %v", edgeID, err)
			}
		}

		// Destroy the CF input in a detached context — a request context
		// canceling shouldn't leak billing.
		if e.streamUID != "" {
			bg, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			if err := r.Stream.Destroy(bg, e.streamUID); err != nil {
				log.Printf("reaper: destroy stream %s: %v", e.streamUID, err)
			}
			cancel()
		}
	}
	return len(toReap), nil
}
