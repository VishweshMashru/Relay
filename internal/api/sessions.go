package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"relay/internal/auth"
	"relay/internal/relay"
)

// createSession is the customer-facing endpoint. Requires API key. Verifies
// the target camera belongs to the caller's project, provisions a CF Stream
// Live input, inserts session + start command in one transaction, and
// pg_notifies the edge.
func (s *Server) createSession(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return
	}

	var req relay.CreateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if req.CameraID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "camera_id is required"})
		return
	}
	if req.TTLSeconds <= 0 || req.TTLSeconds > 3600 {
		req.TTLSeconds = 600
	}
	if req.Protocol == "" {
		req.Protocol = relay.ProtocolHLS
	}

	ctx := r.Context()

	// Verify the camera exists AND is owned by this project (via edge).
	var edgeID string
	err := s.pool.QueryRow(ctx, `
		SELECT c.edge_id::text
		FROM cameras c
		JOIN edges e ON e.id = c.edge_id
		WHERE c.id = $1 AND e.project_id = $2
	`, req.CameraID, projectID).Scan(&edgeID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "camera not found"})
		return
	}

	// Provision CF input outside the DB tx so we don't hold the tx over a
	// network call.
	input, err := s.stream.Provision(ctx, "relay-"+req.CameraID)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "cloudflare stream: " + err.Error()})
		return
	}
	var committed bool
	defer func() {
		if !committed {
			bg, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			_ = s.stream.Destroy(bg, input.UID)
		}
	}()

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	now := time.Now().UTC()
	expires := now.Add(time.Duration(req.TTLSeconds) * time.Second)

	var sess relay.Session
	if err := tx.QueryRow(ctx, `
		INSERT INTO sessions(camera_id, status, protocol, viewer_url, stream_input_uid, started_at, expires_at)
		VALUES ($1, 'pending', $2, $3, $4, $5, $6)
		RETURNING id::text, camera_id::text, status, protocol, COALESCE(viewer_url,''), started_at, expires_at
	`, req.CameraID, req.Protocol, input.PlaybackURL, input.UID, now, expires).Scan(
		&sess.ID, &sess.CameraID, &sess.Status, &sess.Protocol, &sess.ViewerURL, &sess.StartedAt, &sess.ExpiresAt,
	); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	payload, _ := json.Marshal(map[string]string{"push_url": input.PushURL})
	var cmdID string
	if err := tx.QueryRow(ctx, `
		INSERT INTO commands(edge_id, type, session_id, camera_id, payload)
		VALUES ($1, 'start', $2, $3, $4) RETURNING id::text
	`, edgeID, sess.ID, req.CameraID, payload).Scan(&cmdID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if _, err := tx.Exec(ctx, "SELECT pg_notify($1, $2)", relay.EdgeChannel(edgeID), cmdID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if err := tx.Commit(ctx); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	committed = true
	writeJSON(w, http.StatusOK, sess)
}

// getSession is public — the viewer needs to fetch the playback URL. Session
// UUIDs are unguessable. Signed playback URLs will come with the auth follow-up.
func (s *Server) getSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var sess relay.Session
	err := s.pool.QueryRow(r.Context(), `
		SELECT id::text, camera_id::text, status, protocol, COALESCE(viewer_url,''), started_at, COALESCE(last_heartbeat_at, started_at), expires_at
		FROM sessions WHERE id = $1
	`, id).Scan(
		&sess.ID, &sess.CameraID, &sess.Status, &sess.Protocol, &sess.ViewerURL, &sess.StartedAt, &sess.LastHeartbeatAt, &sess.ExpiresAt,
	)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not found"})
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (s *Server) heartbeat(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	tag, err := s.pool.Exec(r.Context(), `
		UPDATE sessions SET last_heartbeat_at = now(),
			status = CASE WHEN status = 'pending' THEN 'live' ELSE status END
		WHERE id = $1 AND status IN ('pending','live') AND expires_at > now()
	`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not active"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) deleteSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	ctx := r.Context()

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var cameraID, streamInputUID string
	if err := tx.QueryRow(ctx, `
		UPDATE sessions SET status = 'ended'
		WHERE id = $1 AND status IN ('pending','live')
		RETURNING camera_id::text, COALESCE(stream_input_uid,'')
	`, id).Scan(&cameraID, &streamInputUID); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not active"})
		return
	}

	var edgeID string
	if err := tx.QueryRow(ctx,
		`SELECT edge_id::text FROM cameras WHERE id = $1`, cameraID,
	).Scan(&edgeID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	var cmdID string
	if err := tx.QueryRow(ctx, `
		INSERT INTO commands(edge_id, type, session_id, camera_id)
		VALUES ($1, 'stop', $2, $3) RETURNING id::text
	`, edgeID, id, cameraID).Scan(&cmdID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if _, err := tx.Exec(ctx, "SELECT pg_notify($1, $2)", relay.EdgeChannel(edgeID), cmdID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if err := tx.Commit(ctx); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if streamInputUID != "" {
		go func() {
			bg, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			_ = s.stream.Destroy(bg, streamInputUID)
		}()
	}

	w.WriteHeader(http.StatusNoContent)
}
