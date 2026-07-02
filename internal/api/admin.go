package api

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5"

	"relay/internal/auth"
)

// adminOnboard is idempotent: creates a project + api_key + user_link for a
// fresh Clerk user, or returns the existing mapping for a returning user.
// The raw API key is only returned when we create it — never again after.
//
// Auth: admin token (RELAY_ADMIN_TOKEN). The Next.js dashboard proxies to
// this endpoint on first sign-up.
func (s *Server) adminOnboard(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ClerkUserID string `json:"clerk_user_id"`
		Email       string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if req.ClerkUserID == "" || req.Email == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "clerk_user_id and email are required"})
		return
	}

	ctx := r.Context()

	// Already onboarded?
	var existingProject string
	err := s.pool.QueryRow(ctx,
		`SELECT project_id::text FROM users WHERE clerk_user_id = $1`, req.ClerkUserID,
	).Scan(&existingProject)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"project_id": existingProject,
			"is_new":     false,
		})
		return
	}
	if err != pgx.ErrNoRows {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Fresh onboarding — do it in one transaction.
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var projectID string
	if err := tx.QueryRow(ctx,
		`INSERT INTO projects(name) VALUES ($1) RETURNING id::text`, "Personal — "+req.Email,
	).Scan(&projectID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	rawKey, prefix, hash, err := auth.GenerateAPIKey()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO api_keys(project_id, key_prefix, key_hash, label) VALUES ($1, $2, $3, 'default')`,
		projectID, prefix, hash,
	); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO users(clerk_user_id, email, project_id) VALUES ($1, $2, $3)`,
		req.ClerkUserID, req.Email, projectID,
	); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"project_id": projectID,
		"api_key":    rawKey,
		"is_new":     true,
	})
}

// adminUserKey mints (or re-mints) the dashboard's own API key for a Clerk
// user's project. The Next.js proxy calls this lazily and caches the raw key
// in Clerk privateMetadata — so every dashboard request runs under the user's
// project instead of a shared admin key. Re-minting replaces the previous
// dashboard key, so a stale cached key just triggers one more mint.
//
// Auth: admin token (RELAY_ADMIN_TOKEN).
func (s *Server) adminUserKey(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ClerkUserID string `json:"clerk_user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ClerkUserID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "clerk_user_id is required"})
		return
	}
	ctx := r.Context()

	var projectID string
	if err := s.pool.QueryRow(ctx,
		`SELECT project_id::text FROM users WHERE clerk_user_id = $1`, req.ClerkUserID,
	).Scan(&projectID); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not onboarded"})
		return
	}

	rawKey, prefix, hash, err := auth.GenerateAPIKey()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)
	// One dashboard key per project: replace, don't accumulate.
	if _, err := tx.Exec(ctx,
		`DELETE FROM api_keys WHERE project_id = $1 AND label = 'dashboard'`, projectID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO api_keys(project_id, key_prefix, key_hash, label) VALUES ($1, $2, $3, 'dashboard')`,
		projectID, prefix, hash); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if err := tx.Commit(ctx); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"project_id": projectID,
		"api_key":    rawKey,
	})
}
