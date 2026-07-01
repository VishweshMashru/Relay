// Package api implements the relay control API. Customers create viewer
// sessions here, and edge agents long-poll here for start/stop commands.
package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"relay/internal/auth"
	"relay/internal/stream"
	"relay/internal/webviewer"
)

type Server struct {
	pool   *pgxpool.Pool
	stream *stream.Client
	mw     *auth.Middleware
	mux    *http.ServeMux
}

func New(pool *pgxpool.Pool, streamClient *stream.Client, jwtSecret, adminToken []byte) *Server {
	s := &Server{
		pool:   pool,
		stream: streamClient,
		mw:     &auth.Middleware{Pool: pool, JWTSecret: jwtSecret, AdminToken: adminToken},
		mux:    http.NewServeMux(),
	}
	s.routes()
	return s
}

func (s *Server) Handler() http.Handler { return withCORS(s.mux) }

func (s *Server) ListenAndServe(addr string) error {
	log.Printf("relay-api listening on %s", addr)
	return http.ListenAndServe(addr, withCORS(s.mux))
}

func (s *Server) routes() {
	// Public
	s.mux.HandleFunc("GET /v1/health", s.health)

	// Viewer-facing — public for now (session UUIDs are unguessable). Signed
	// playback URLs come in a later step.
	s.mux.HandleFunc("GET /v1/sessions/{id}", s.getSession)
	s.mux.HandleFunc("POST /v1/sessions/{id}/heartbeat", s.heartbeat)
	s.mux.HandleFunc("DELETE /v1/sessions/{id}", s.deleteSession)

	// Customer-facing — require API key
	s.mux.HandleFunc("POST /v1/sessions", s.mw.APIKey(s.createSession))
	s.mux.HandleFunc("POST /v1/edges", s.mw.APIKey(s.provisionEdge))
	s.mux.HandleFunc("POST /v1/edges/{edge_id}/cameras", s.mw.APIKey(s.createCamera))
	s.mux.HandleFunc("GET /v1/edges/{edge_id}/cameras", s.mw.APIKey(s.listCameras))

	// Edge-facing — require signed edge JWT
	s.mux.HandleFunc("GET /v1/edges/commands", s.mw.EdgeToken(s.edgeCommands))

	// Admin — require RELAY_ADMIN_TOKEN. Dashboard-only endpoints.
	s.mux.HandleFunc("POST /v1/admin/onboard", s.mw.Admin(s.adminOnboard))

	// Reference viewer, embedded via //go:embed. Same origin as the API,
	// so the browser doesn't need CORS for its own calls.
	s.mux.Handle("GET /viewer/", http.StripPrefix("/viewer", http.FileServer(http.FS(webviewer.FS()))))
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, code int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(body)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
