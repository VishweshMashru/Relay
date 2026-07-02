package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"relay/internal/auth"
	"relay/internal/relay"
)

// viewerToken gates the viewer-facing session endpoints. Two credentials
// work: the per-session viewer token minted at createSession (Bearer or
// ?token= for players that can't set headers), or the project's own API key —
// so a customer's backend (or an AI agent) can inspect and stop sessions it
// created without holding every viewer token.
func (s *Server) viewerToken(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		raw := r.URL.Query().Get("token")
		if h := r.Header.Get("Authorization"); h != "" {
			raw = strings.TrimPrefix(h, "Bearer ")
		}
		if raw == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "viewer token or api key required"})
			return
		}
		if strings.HasPrefix(raw, auth.APIKeyPrefix) {
			if !s.apiKeyOwnsSession(r, raw, r.PathValue("id")) {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid api key or session"})
				return
			}
			next(w, r)
			return
		}
		if err := auth.VerifyViewerToken(s.mw.JWTSecret, raw, r.PathValue("id")); err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid viewer token"})
			return
		}
		next(w, r)
	}
}

// apiKeyOwnsSession verifies a raw API key and that the session belongs to
// the key's project.
func (s *Server) apiKeyOwnsSession(r *http.Request, rawKey, sessionID string) bool {
	prefix := auth.ExtractPrefix(rawKey)
	if prefix == "" {
		return false
	}
	var projectID, storedHash string
	if err := s.pool.QueryRow(r.Context(),
		`SELECT project_id::text, key_hash FROM api_keys WHERE key_prefix = $1`, prefix,
	).Scan(&projectID, &storedHash); err != nil {
		return false
	}
	if !auth.VerifyAPIKey(rawKey, storedHash) {
		return false
	}
	var one int
	return s.pool.QueryRow(r.Context(),
		`SELECT 1 FROM sessions WHERE id = $1 AND project_id = $2`, sessionID, projectID,
	).Scan(&one) == nil
}

// createSession is the customer-facing endpoint. Requires API key.
//
// Two ingest modes:
//   - edge (default): verifies the camera belongs to the caller's project,
//     provisions a CF Stream Live input, inserts session + start command in
//     one transaction, and pg_notifies the edge.
//   - push: no camera, no edge. Provisions the input and returns its RTMPS
//     push_url — a drone controller, OBS, or any encoder streams directly.
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
	if req.Ingest == "" {
		req.Ingest = relay.IngestEdge
	}
	if req.Ingest != relay.IngestEdge && req.Ingest != relay.IngestPush {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ingest must be \"edge\" or \"push\""})
		return
	}
	if req.Ingest == relay.IngestEdge && req.CameraID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "camera_id is required for edge ingest"})
		return
	}
	if req.TTLSeconds <= 0 || req.TTLSeconds > 3600 {
		req.TTLSeconds = 600
	}
	if req.Protocol == "" {
		req.Protocol = relay.ProtocolHLS
	}

	ctx := r.Context()

	// Edge ingest: verify the camera exists AND is owned by this project.
	var edgeID string
	if req.Ingest == relay.IngestEdge {
		if err := s.pool.QueryRow(ctx, `
			SELECT c.edge_id::text
			FROM cameras c
			JOIN edges e ON e.id = c.edge_id
			WHERE c.id = $1 AND e.project_id = $2
		`, req.CameraID, projectID).Scan(&edgeID); err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "camera not found"})
			return
		}
	}

	inputName := "relay-" + req.CameraID
	if req.Ingest == relay.IngestPush {
		inputName = "relay-push"
		if req.Name != "" {
			inputName = "relay-push-" + req.Name
		}
	}

	// Provision CF input outside the DB tx so we don't hold the tx over a
	// network call.
	input, err := s.stream.Provision(ctx, inputName)
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
		INSERT INTO sessions(project_id, camera_id, ingest, status, protocol, viewer_url, stream_input_uid, started_at, expires_at)
		VALUES ($1, NULLIF($2,'')::uuid, $3, 'pending', $4, $5, $6, $7, $8)
		RETURNING id::text, COALESCE(camera_id::text,''), ingest, status, protocol, COALESCE(viewer_url,''), started_at, expires_at
	`, projectID, req.CameraID, req.Ingest, req.Protocol, input.PlaybackURL, input.UID, now, expires).Scan(
		&sess.ID, &sess.CameraID, &sess.Ingest, &sess.Status, &sess.Protocol, &sess.ViewerURL, &sess.StartedAt, &sess.ExpiresAt,
	); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if req.Ingest == relay.IngestEdge {
		payload, _ := json.Marshal(map[string]string{"push_url": input.PushURL})
		var cmdID string
		if err := tx.QueryRow(ctx, `
			INSERT INTO commands(edge_id, type, session_id, camera_id, payload)
			VALUES ($1, 'start', $2, $3, $4) RETURNING id::text
		`, edgeID, sess.ID, req.CameraID, payload).Scan(&cmdID); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		if _, err := tx.Exec(ctx, "SELECT pg_notify($1, $2)", relay.CommandsChannel, edgeID); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	committed = true

	if req.Ingest == relay.IngestPush {
		// Returned once — the push URL embeds the stream key.
		sess.PushURL = input.PushURL
	}

	// Minted once, returned only here. The customer's backend passes it to
	// their viewer alongside the session id.
	sess.ViewerToken, err = auth.SignViewerToken(s.mw.JWTSecret, sess.ID, expires)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	// With a CF signing key configured, the manifest URL embeds a token that
	// dies with the session; the stored URL stays unsigned.
	sess.ViewerURL, err = s.stream.SignPlaybackURL(sess.ViewerURL, input.UID, expires)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

// getSession returns the playback URL to a token-holding viewer. Note the CF
// manifest itself is still unsigned — Cloudflare-level signed playback is the
// remaining follow-up (requires a Stream signing key on the account).
func (s *Server) getSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var sess relay.Session
	var streamUID string
	err := s.pool.QueryRow(r.Context(), `
		SELECT id::text, COALESCE(camera_id::text,''), ingest, status, protocol, COALESCE(viewer_url,''), COALESCE(stream_input_uid,''), started_at, COALESCE(last_heartbeat_at, started_at), expires_at
		FROM sessions WHERE id = $1
	`, id).Scan(
		&sess.ID, &sess.CameraID, &sess.Ingest, &sess.Status, &sess.Protocol, &sess.ViewerURL, &streamUID, &sess.StartedAt, &sess.LastHeartbeatAt, &sess.ExpiresAt,
	)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not found"})
		return
	}
	sess.ViewerURL, err = s.stream.SignPlaybackURL(sess.ViewerURL, streamUID, sess.ExpiresAt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
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
		RETURNING COALESCE(camera_id::text,''), COALESCE(stream_input_uid,'')
	`, id).Scan(&cameraID, &streamInputUID); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not active"})
		return
	}

	// Push-ingest sessions have no camera and no edge to command — destroying
	// the CF input below is what actually stops the stream.
	if cameraID != "" {
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
		if _, err := tx.Exec(ctx, "SELECT pg_notify($1, $2)", relay.CommandsChannel, edgeID); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
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
