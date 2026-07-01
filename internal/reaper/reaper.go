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
	"relay/internal/stream"
)

type Reaper struct {
	Pool       *pgxpool.Pool
	Stream     *stream.Client
	Interval   time.Duration // how often to sweep
	StaleAfter time.Duration // no-heartbeat threshold before we consider a session dead
}

func New(pool *pgxpool.Pool, s *stream.Client) *Reaper {
	return &Reaper{
		Pool:       pool,
		Stream:     s,
		Interval:   10 * time.Second,
		StaleAfter: 30 * time.Second,
	}
}

func (r *Reaper) Run(ctx context.Context) {
	log.Printf("reaper starting interval=%s stale_after=%s", r.Interval, r.StaleAfter)
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
		}
	}
}

// sweep marks stale sessions expired, emits stop commands, notifies edges,
// and destroys the associated CF inputs. Returns how many sessions it reaped.
func (r *Reaper) sweep(ctx context.Context) (int, error) {
	// One statement finds+updates candidates and returns what we need to
	// clean up. Doing it as a single UPDATE ... RETURNING avoids a race
	// where two reaper instances would double-reap the same session.
	rows, err := r.Pool.Query(ctx, `
		UPDATE sessions
		SET status = 'expired'
		WHERE status IN ('pending', 'live')
		  AND (
		    expires_at < now()
		    OR (last_heartbeat_at IS NOT NULL AND last_heartbeat_at < now() - ($1 || ' seconds')::interval)
		    OR (last_heartbeat_at IS NULL AND started_at < now() - ($1 || ' seconds')::interval)
		  )
		RETURNING id::text, camera_id::text, COALESCE(stream_input_uid, '')
	`, int(r.StaleAfter.Seconds()))
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
		// Resolve which edge owns this camera so we can send a stop command.
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
			"SELECT pg_notify($1, $2)", relay.EdgeChannel(edgeID), cmdID,
		); err != nil {
			log.Printf("reaper: notify edge %s: %v", edgeID, err)
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
