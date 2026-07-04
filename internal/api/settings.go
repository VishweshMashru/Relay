package api

import (
	"encoding/json"
	"net/http"
	"sort"

	"relay/internal/auth"
)

// getSettings returns the project's runtime configuration plus what this
// deployment offers — the dashboard renders its provider switch from this,
// so operating the platform never requires env edits or redeploys.
func (s *Server) getSettings(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return
	}
	name, prov := s.projectProvider(r.Context(), projectID)
	available := make([]map[string]any, 0, len(s.providers))
	for provName, p := range s.providers {
		available = append(available, map[string]any{
			"name":                provName,
			"supports_recordings": p.SupportsRecordings(),
		})
	}
	sort.Slice(available, func(i, j int) bool {
		return available[i]["name"].(string) < available[j]["name"].(string)
	})
	writeJSON(w, http.StatusOK, map[string]any{
		"stream_provider":     name,
		"supports_recordings": prov.SupportsRecordings(),
		"available_providers": available,
	})
}

// updateSettings changes the project's stream provider. Takes effect on the
// next session; live sessions keep their recorded provider, so switching is
// always safe.
func (s *Server) updateSettings(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return
	}
	var req struct {
		StreamProvider string `json:"stream_provider"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if _, ok := s.providers[req.StreamProvider]; !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "provider not configured on this deployment"})
		return
	}
	if _, err := s.pool.Exec(r.Context(),
		`UPDATE projects SET stream_provider = $2 WHERE id = $1`, projectID, req.StreamProvider,
	); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	s.getSettings(w, r)
}

// getUsage gives the dashboard its cost signals: watched minutes and stored
// clip bytes. Approximation (heartbeat-derived), not a billing meter — yet.
func (s *Server) getUsage(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return
	}
	ctx := r.Context()
	var viewerMinutes float64
	if err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(sum(GREATEST(extract(epoch FROM COALESCE(last_heartbeat_at, started_at) - started_at), 0)) / 60, 0)
		FROM sessions
		WHERE project_id = $1 AND started_at > now() - interval '30 days'
	`, projectID).Scan(&viewerMinutes); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	var clipCount int
	var clipBytes int64
	if err := s.pool.QueryRow(ctx, `
		SELECT count(*), COALESCE(sum(size_bytes), 0) FROM assets WHERE project_id = $1
	`, projectID).Scan(&clipCount, &clipBytes); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"viewer_minutes_30d": int(viewerMinutes),
		"clip_count":         clipCount,
		"clip_bytes":         clipBytes,
	})
}
