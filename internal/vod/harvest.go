// Package vod turns live-session recordings into assets. Cloudflare records
// every live input (recording.mode=automatic); for record=true sessions,
// teardown calls Harvest instead of Destroy: each recording becomes a
// cloudflare-sourced asset row and only the live input is deleted.
//
// Harvest is deliberately idempotent (unique index on the CF video UID) —
// it can run from session DELETE, the reaper, and the CF webhook without
// duplicating assets, whichever fires first.
package vod

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"relay/internal/relay"
	"relay/internal/stream"
)

// Session carries the teardown context Harvest needs.
type Session struct {
	ID         string
	ProjectID  string
	CameraID   string // may be empty (push ingest)
	InputUID   string
	TTLSeconds int // recording retention; 0 = keep forever
}

// Harvest registers a session's recordings as assets, then deletes the live
// input. Returns how many assets were created.
func Harvest(ctx context.Context, pool *pgxpool.Pool, sp stream.Provider, s Session) (int, error) {
	if s.InputUID == "" {
		return 0, nil
	}
	videos, err := sp.ListRecordings(ctx, s.InputUID)
	if err != nil {
		// Don't delete the input if we couldn't enumerate its recordings —
		// the webhook's video.ready fallback can still register them later.
		return 0, fmt.Errorf("list recordings for input %s: %w", s.InputUID, err)
	}

	var expires *time.Time
	if s.TTLSeconds > 0 {
		t := time.Now().UTC().Add(time.Duration(s.TTLSeconds) * time.Second)
		expires = &t
	}

	created := 0
	for _, videoUID := range videos {
		name := "recording-" + shortID(s.ID)
		tag, err := pool.Exec(ctx, `
			INSERT INTO assets(id, project_id, camera_id, session_id, name, content_type, storage_key, source, status, expires_at)
			VALUES ($1, $2, NULLIF($3,'')::uuid, $4, $5, 'video/mp4', $6, 'cloudflare', 'pending', $7)
			ON CONFLICT DO NOTHING
		`, relay.NewUUID(), s.ProjectID, s.CameraID, s.ID, name, videoUID, expires)
		if err != nil {
			return created, fmt.Errorf("register recording %s: %w", videoUID, err)
		}
		created += int(tag.RowsAffected())
	}

	if err := sp.DeleteInput(ctx, s.InputUID); err != nil {
		log.Printf("vod: delete input %s after harvest: %v", s.InputUID, err)
	}
	if created > 0 {
		log.Printf("vod: harvested %d recording(s) from session %s", created, s.ID)
	}
	return created, nil
}

func shortID(id string) string {
	if len(id) > 8 {
		return id[:8]
	}
	return id
}
