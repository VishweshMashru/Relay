package auth

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Middleware struct {
	Pool       *pgxpool.Pool
	JWTSecret  []byte
	AdminToken []byte
}

// Admin gates a route on a shared admin token. Used for the dashboard's
// onboarding endpoint — the Next.js dashboard is a trusted client that
// proxies signed-in user data with this token.
func (m *Middleware) Admin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if len(m.AdminToken) == 0 {
			unauthorized(w, "RELAY_ADMIN_TOKEN not configured")
			return
		}
		raw := extractBearer(r)
		if raw == "" {
			unauthorized(w, "missing bearer token")
			return
		}
		if subtle.ConstantTimeCompare([]byte(raw), m.AdminToken) != 1 {
			unauthorized(w, "invalid admin token")
			return
		}
		next(w, r)
	}
}

// APIKey resolves a Bearer "rk_live_..." to a project and attaches project_id
// to the request context. 401 on any failure.
func (m *Middleware) APIKey(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		raw := extractBearer(r)
		if raw == "" {
			unauthorized(w, "missing bearer token")
			return
		}
		prefix := ExtractPrefix(raw)
		if prefix == "" {
			unauthorized(w, "malformed api key")
			return
		}
		var projectID, storedHash string
		if err := m.Pool.QueryRow(r.Context(),
			`SELECT project_id::text, key_hash FROM api_keys WHERE key_prefix = $1`, prefix,
		).Scan(&projectID, &storedHash); err != nil {
			unauthorized(w, "invalid api key")
			return
		}
		if !VerifyAPIKey(raw, storedHash) {
			unauthorized(w, "invalid api key")
			return
		}
		// Fire-and-forget: update last_used_at. Never block the request on this.
		go func() {
			bg, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = m.Pool.Exec(bg, `UPDATE api_keys SET last_used_at = now() WHERE key_prefix = $1`, prefix)
		}()
		next(w, r.WithContext(WithProject(r.Context(), projectID)))
	}
}

// EdgeToken verifies a Bearer JWT and attaches project_id + edge_id to the
// context. One DB round trip per call: it checks the token's `ver` claim
// against edges.token_version (per-edge revocation) and stamps last_seen_at
// (edge online status for the dashboard) in the same UPDATE.
func (m *Middleware) EdgeToken(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		raw := extractBearer(r)
		if raw == "" {
			unauthorized(w, "missing bearer token")
			return
		}
		claims, err := VerifyEdgeToken(m.JWTSecret, raw)
		if err != nil {
			unauthorized(w, "invalid edge token")
			return
		}
		// ver 0 = token minted before versioning existed; honor it while the
		// edge is still on version 1 so deployed edges survive the migration.
		tag, err := m.Pool.Exec(r.Context(), `
			UPDATE edges SET last_seen_at = now()
			WHERE id = $1 AND project_id = $2
			  AND (token_version = $3 OR ($3 = 0 AND token_version = 1))
		`, claims.EdgeID, claims.ProjectID, claims.Version)
		if err != nil || tag.RowsAffected() == 0 {
			unauthorized(w, "edge token revoked")
			return
		}
		ctx := WithProject(r.Context(), claims.ProjectID)
		ctx = WithEdge(ctx, claims.EdgeID)
		next(w, r.WithContext(ctx))
	}
}

func extractBearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
}

func unauthorized(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
