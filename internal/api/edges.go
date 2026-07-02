package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"relay/internal/auth"
	"relay/internal/relay"
)

const longPollTimeout = 25 * time.Second

// provisionEdge is customer-facing. Given a project (via API key), creates a
// new edge row and returns its ID and a freshly-signed JWT. Customer's app
// should surface both to the end-user during ForemanConnect-style pairing.
func (s *Server) provisionEdge(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return
	}
	var req struct {
		Name     string `json:"name"`
		Hostname string `json:"hostname"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
		return
	}
	var edgeID string
	if err := s.pool.QueryRow(r.Context(), `
		INSERT INTO edges(project_id, name, hostname, token_hash) VALUES ($1, $2, NULLIF($3, ''), 'jwt')
		RETURNING id::text
	`, projectID, req.Name, req.Hostname).Scan(&edgeID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	tok, err := auth.SignEdgeToken(s.mw.JWTSecret, projectID, edgeID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"edge_id":    edgeID,
		"edge_token": tok,
	})
}

// createCamera is customer-facing. Adds a camera to an edge the caller owns.
// RTSP URLs are NOT sent here — only the camera's cloud identity + name.
func (s *Server) createCamera(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return
	}
	edgeID := r.PathValue("edge_id")
	if !ownsEdge(r.Context(), s, projectID, edgeID) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "edge not found"})
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
		return
	}
	var cameraID string
	if err := s.pool.QueryRow(r.Context(), `
		INSERT INTO cameras(edge_id, name) VALUES ($1, $2) RETURNING id::text
	`, edgeID, req.Name).Scan(&cameraID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"camera_id": cameraID,
		"edge_id":   edgeID,
		"name":      req.Name,
	})
}

func (s *Server) listCameras(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return
	}
	edgeID := r.PathValue("edge_id")
	if !ownsEdge(r.Context(), s, projectID, edgeID) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "edge not found"})
		return
	}
	rows, err := s.pool.Query(r.Context(),
		`SELECT id::text, name, created_at FROM cameras WHERE edge_id = $1 ORDER BY created_at`, edgeID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name string
		var created time.Time
		_ = rows.Scan(&id, &name, &created)
		out = append(out, map[string]any{"id": id, "name": name, "created_at": created})
	}
	writeJSON(w, http.StatusOK, map[string]any{"cameras": out})
}

// edgeCommands is the long-poll heart of the control plane. Auth middleware
// puts edge_id in the request context — no more query-param edge IDs.
// Waiting happens on an in-process dispatcher channel, not a pinned Postgres
// connection, so thousands of edges can hold polls concurrently.
func (s *Server) edgeCommands(w http.ResponseWriter, r *http.Request) {
	edgeID, ok := auth.EdgeFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no edge in context"})
		return
	}

	ctx := r.Context()

	// Subscribe before the first claim so a notify landing mid-claim isn't lost.
	wakeup, unsubscribe := s.dispatch.subscribe(edgeID)
	defer unsubscribe()

	cmds, err := claimCommands(ctx, s.pool, edgeID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if len(cmds) > 0 {
		writeJSON(w, http.StatusOK, map[string]any{"commands": cmds})
		return
	}

	timer := time.NewTimer(longPollTimeout)
	defer timer.Stop()
	select {
	case <-wakeup:
	case <-timer.C:
		writeJSON(w, http.StatusOK, map[string]any{"commands": []relay.Command{}})
		return
	case <-ctx.Done():
		return
	}

	cmds, err = claimCommands(ctx, s.pool, edgeID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"commands": cmds})
}

// ackCommands lets the edge confirm it executed commands. Claims only take a
// short lease (see claimCommands); a command that is never acked — response
// lost in flight, edge crashed mid-dispatch — is redelivered on a later poll.
func (s *Server) ackCommands(w http.ResponseWriter, r *http.Request) {
	edgeID, ok := auth.EdgeFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no edge in context"})
		return
	}
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ids is required"})
		return
	}
	if _, err := s.pool.Exec(r.Context(), `
		UPDATE commands SET acked_at = now()
		WHERE edge_id = $1 AND id = ANY($2::uuid[]) AND acked_at IS NULL
	`, edgeID, req.IDs); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// claimCommands hands out unacked commands under a 60s lease. If the edge
// never acks (lost response, crash), the lease lapses and the command is
// claimable again on a later poll — at-least-once instead of at-most-once.
// Commands older than an hour are considered stale and never redelivered;
// sessions cap at 3600s TTL so nothing meaningful outlives that.
func claimCommands(ctx context.Context, pool *pgxpool.Pool, edgeID string) ([]relay.Command, error) {
	rows, err := pool.Query(ctx, `
		UPDATE commands
		SET delivered_at = now(), lease_expires_at = now() + interval '60 seconds'
		WHERE id IN (
			SELECT id FROM commands
			WHERE edge_id = $1
			  AND acked_at IS NULL
			  AND (lease_expires_at IS NULL OR lease_expires_at < now())
			  AND created_at > now() - interval '1 hour'
			ORDER BY created_at
			FOR UPDATE SKIP LOCKED
			LIMIT 20
		)
		RETURNING id::text, type, COALESCE(session_id::text, ''), COALESCE(camera_id::text, ''), payload
	`, edgeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]relay.Command, 0)
	for rows.Next() {
		var c relay.Command
		var payload []byte
		if err := rows.Scan(&c.ID, &c.Type, &c.SessionID, &c.CameraID, &payload); err != nil {
			return nil, err
		}
		if len(payload) > 0 {
			_ = json.Unmarshal(payload, &c.Payload)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// ownsEdge verifies the given project owns the edge. Central to multi-tenant
// isolation — any handler that names an edge_id in the URL must check this.
func ownsEdge(ctx context.Context, s *Server, projectID, edgeID string) bool {
	var one int
	err := s.pool.QueryRow(ctx,
		`SELECT 1 FROM edges WHERE id = $1 AND project_id = $2`, edgeID, projectID,
	).Scan(&one)
	return err == nil
}

