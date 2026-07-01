package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"

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
func (s *Server) edgeCommands(w http.ResponseWriter, r *http.Request) {
	edgeID, ok := auth.EdgeFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no edge in context"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), longPollTimeout+5*time.Second)
	defer cancel()

	conn, err := s.pool.Acquire(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, "LISTEN "+channelForEdge(edgeID)); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	cmds, err := claimCommands(ctx, conn.Conn(), edgeID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if len(cmds) > 0 {
		writeJSON(w, http.StatusOK, map[string]any{"commands": cmds})
		return
	}

	waitCtx, waitCancel := context.WithTimeout(ctx, longPollTimeout)
	defer waitCancel()
	if _, err := conn.Conn().WaitForNotification(waitCtx); err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeJSON(w, http.StatusOK, map[string]any{"commands": []relay.Command{}})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	cmds, err = claimCommands(ctx, conn.Conn(), edgeID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"commands": cmds})
}

func claimCommands(ctx context.Context, conn *pgx.Conn, edgeID string) ([]relay.Command, error) {
	rows, err := conn.Query(ctx, `
		UPDATE commands
		SET delivered_at = now()
		WHERE id IN (
			SELECT id FROM commands
			WHERE edge_id = $1 AND delivered_at IS NULL
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

func channelForEdge(edgeUUID string) string {
	out := make([]byte, 0, len(edgeUUID)+5)
	out = append(out, "edge_"...)
	for i := 0; i < len(edgeUUID); i++ {
		if edgeUUID[i] != '-' {
			out = append(out, edgeUUID[i])
		}
	}
	return string(out)
}
