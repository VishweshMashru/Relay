package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"

	"relay/internal/relay"
)

const longPollTimeout = 25 * time.Second

// edgeCommands is the heart of the control plane. Edge opens a GET; we either
// return immediately with any pending commands, or hang until a new command
// lands (signalled via LISTEN/NOTIFY) — whichever comes first. After 25s with
// nothing, we return an empty list so the edge re-opens the long-poll.
func (s *Server) edgeCommands(w http.ResponseWriter, r *http.Request) {
	// TODO: derive edge_id from auth header. Query param for now.
	edgeID := r.URL.Query().Get("edge_id")
	if edgeID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "edge_id is required (temp; will come from auth)"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), longPollTimeout+5*time.Second)
	defer cancel()

	// Pin one connection for the whole call so LISTEN persists.
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

	// First check: any already-pending commands?
	cmds, err := claimCommands(ctx, conn.Conn(), edgeID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if len(cmds) > 0 {
		writeJSON(w, http.StatusOK, map[string]any{"commands": cmds})
		return
	}

	// Otherwise wait for a notification or timeout.
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

// claimCommands atomically marks pending commands as delivered and returns
// them. FOR UPDATE SKIP LOCKED makes this safe against concurrent long-polls.
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

func (s *Server) registerEdge(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]string{"todo": "auth + provision edge token"})
}

// channelForEdge maps an edge UUID to a Postgres NOTIFY channel name. Strips
// hyphens so the channel can be used as an unquoted identifier.
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
