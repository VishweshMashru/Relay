// Package api implements the relay control API. Customers create viewer
// sessions here, and edge agents long-poll here for start/stop commands.
package api

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"relay/internal/auth"
	"relay/internal/storage"
	"relay/internal/stream"
	"relay/internal/webviewer"
)

type Server struct {
	pool          *pgxpool.Pool
	providers     map[string]stream.Provider // all configured media planes
	defaultProv   string                     // fallback when a project's choice isn't configured
	blobs         storage.Store              // nil disables asset uploads
	webhookSecret []byte                     // empty disables /v1/webhooks/cloudflare
	mw            *auth.Middleware
	mux           *http.ServeMux
	dispatch      *dispatcher
}

func New(pool *pgxpool.Pool, providers map[string]stream.Provider, defaultProvider string, blobs storage.Store, jwtSecret, adminToken, webhookSecret []byte) *Server {
	s := &Server{
		pool:          pool,
		providers:     providers,
		defaultProv:   defaultProvider,
		blobs:         blobs,
		webhookSecret: webhookSecret,
		mw:            &auth.Middleware{Pool: pool, JWTSecret: jwtSecret, AdminToken: adminToken},
		mux:           http.NewServeMux(),
		dispatch:      newDispatcher(pool),
	}
	s.routes()
	return s
}

// provider resolves a provider by name, falling back to the default when the
// named one isn't configured on this deployment (e.g. a session provisioned
// on a backend that has since been unconfigured).
func (s *Server) provider(name string) stream.Provider {
	if p, ok := s.providers[name]; ok {
		return p
	}
	return s.providers[s.defaultProv]
}

// cloudflare returns the CF provider if configured — some features
// (recording assets, Stream webhooks) are inherently CF-backed.
func (s *Server) cloudflare() (stream.Provider, bool) {
	p, ok := s.providers["cloudflare"]
	return p, ok
}

// projectProvider returns the project's chosen provider (dashboard setting)
// and its resolved name.
func (s *Server) projectProvider(ctx context.Context, projectID string) (string, stream.Provider) {
	var name string
	if err := s.pool.QueryRow(ctx,
		`SELECT stream_provider FROM projects WHERE id = $1`, projectID,
	).Scan(&name); err != nil || name == "" {
		name = s.defaultProv
	}
	if _, ok := s.providers[name]; !ok {
		name = s.defaultProv
	}
	return name, s.providers[name]
}

func (s *Server) Handler() http.Handler { return withCORS(limitBody(s.mux)) }

// RunDispatcher owns the single Postgres LISTEN connection that wakes edge
// long-polls. Blocks until ctx is cancelled; run it in a goroutine.
func (s *Server) RunDispatcher(ctx context.Context) { s.dispatch.run(ctx) }

func (s *Server) routes() {
	// Public
	s.mux.HandleFunc("GET /v1/health", s.health)

	// Cloudflare callbacks — authenticated by signature/secret, not bearer.
	s.mux.HandleFunc("POST /v1/webhooks/cloudflare", s.cfWebhook)

	// Viewer-facing — require the per-session viewer token minted at
	// createSession (Authorization: Bearer or ?token=).
	s.mux.HandleFunc("GET /v1/sessions/{id}", s.viewerToken(s.getSession))
	s.mux.HandleFunc("POST /v1/sessions/{id}/heartbeat", s.viewerToken(s.heartbeat))
	s.mux.HandleFunc("DELETE /v1/sessions/{id}", s.viewerToken(s.deleteSession))

	// Customer-facing — require API key
	s.mux.HandleFunc("POST /v1/sessions", s.mw.APIKey(s.createSession))
	s.mux.HandleFunc("GET /v1/sessions", s.mw.APIKey(s.listSessions))
	s.mux.HandleFunc("GET /v1/sessions/{id}/frame.jpg", s.mw.APIKey(s.sessionFrame))
	s.mux.HandleFunc("POST /v1/edges", s.mw.APIKey(s.provisionEdge))
	s.mux.HandleFunc("GET /v1/edges", s.mw.APIKey(s.listEdges))
	s.mux.HandleFunc("POST /v1/edges/{edge_id}/rotate-token", s.mw.APIKey(s.rotateEdgeToken))
	s.mux.HandleFunc("POST /v1/edges/{edge_id}/cameras", s.mw.APIKey(s.createCamera))
	s.mux.HandleFunc("GET /v1/edges/{edge_id}/cameras", s.mw.APIKey(s.listCameras))
	s.mux.HandleFunc("GET /v1/keys", s.mw.APIKey(s.listKeys))
	s.mux.HandleFunc("POST /v1/keys", s.mw.APIKey(s.createKey))
	s.mux.HandleFunc("DELETE /v1/keys/{id}", s.mw.APIKey(s.deleteKey))
	s.mux.HandleFunc("GET /v1/settings", s.mw.APIKey(s.getSettings))
	s.mux.HandleFunc("PUT /v1/settings", s.mw.APIKey(s.updateSettings))
	s.mux.HandleFunc("GET /v1/usage", s.mw.APIKey(s.getUsage))

	// Assets (VOD) — require API key; 501 until blob storage is configured.
	s.mux.HandleFunc("POST /v1/assets", s.mw.APIKey(s.createAsset))
	s.mux.HandleFunc("GET /v1/assets", s.mw.APIKey(s.listAssets))
	s.mux.HandleFunc("GET /v1/assets/{id}", s.mw.APIKey(s.getAsset))
	s.mux.HandleFunc("POST /v1/assets/{id}/complete", s.mw.APIKey(s.completeAsset))
	s.mux.HandleFunc("DELETE /v1/assets/{id}", s.mw.APIKey(s.deleteAsset))

	// Edge-facing — require signed edge JWT
	s.mux.HandleFunc("GET /v1/edges/commands", s.mw.EdgeToken(s.edgeCommands))
	s.mux.HandleFunc("POST /v1/edges/commands/ack", s.mw.EdgeToken(s.ackCommands))

	// Admin — require RELAY_ADMIN_TOKEN. Dashboard-only endpoints.
	s.mux.HandleFunc("POST /v1/admin/onboard", s.mw.Admin(s.adminOnboard))
	s.mux.HandleFunc("POST /v1/admin/user-key", s.mw.Admin(s.adminUserKey))

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

// limitBody caps request bodies at 1 MB. No endpoint takes a large payload;
// this stops a hostile client from OOMing the VM via an unbounded json.Decode.
func limitBody(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		next.ServeHTTP(w, r)
	})
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
