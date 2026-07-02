package api

import (
	"encoding/json"
	"net/http"
	"time"

	"relay/internal/auth"
)

// listKeys shows key metadata only — prefix, label, usage. Raw keys are
// hashed at rest and can never be shown again.
func (s *Server) listKeys(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return
	}
	rows, err := s.pool.Query(r.Context(), `
		SELECT id::text, key_prefix, COALESCE(label,''), last_used_at, created_at
		FROM api_keys WHERE project_id = $1 ORDER BY created_at
	`, projectID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, prefix, label string
		var lastUsed *time.Time
		var created time.Time
		if err := rows.Scan(&id, &prefix, &label, &lastUsed, &created); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		out = append(out, map[string]any{
			"id": id, "prefix": prefix, "label": label,
			"last_used_at": lastUsed, "created_at": created,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"keys": out})
}

// createKey mints an additional key for the project. Raw key returned once.
func (s *Server) createKey(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return
	}
	var req struct {
		Label string `json:"label"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if req.Label == "" {
		req.Label = "unnamed"
	}
	raw, prefix, hash, err := auth.GenerateAPIKey()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	var id string
	if err := s.pool.QueryRow(r.Context(), `
		INSERT INTO api_keys(project_id, key_prefix, key_hash, label)
		VALUES ($1, $2, $3, $4) RETURNING id::text
	`, projectID, prefix, hash, req.Label).Scan(&id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"id":      id,
		"prefix":  prefix,
		"label":   req.Label,
		"api_key": raw, // shown once
	})
}

// deleteKey revokes a key. Refuses to delete the project's last key —
// that would lock the project out of its own API.
func (s *Server) deleteKey(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return
	}
	id := r.PathValue("id")
	tag, err := s.pool.Exec(r.Context(), `
		DELETE FROM api_keys
		WHERE id = $1 AND project_id = $2
		  AND (SELECT count(*) FROM api_keys WHERE project_id = $2) > 1
	`, id, projectID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "key not found, or it is the project's last key"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
