package api

import (
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"relay/internal/auth"
)

var frameClient = &http.Client{Timeout: 10 * time.Second}

// sessionFrame returns a single current JPEG frame from a live session —
// the "give your AI eyes" endpoint. An agent or backend calls this with its
// API key instead of decoding HLS. The frame is Cloudflare Stream's live
// thumbnail, proxied so signed URLs never leave the server.
//
// GET /v1/sessions/{id}/frame.jpg?height=480 — API-key gated, project-scoped.
func (s *Server) sessionFrame(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return
	}
	id := r.PathValue("id")

	var viewerURL, streamUID, status string
	if err := s.pool.QueryRow(r.Context(), `
		SELECT COALESCE(viewer_url,''), COALESCE(stream_input_uid,''), status
		FROM sessions WHERE id = $1 AND project_id = $2
	`, id, projectID).Scan(&viewerURL, &streamUID, &status); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not found"})
		return
	}
	if viewerURL == "" || (status != "pending" && status != "live") {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "session is not live"})
		return
	}

	// Thumbnails live at <cf-host>/<uid>/thumbnails/thumbnail.jpg regardless
	// of playback protocol (HLS manifest or WHEP), so build from the host.
	const marker = ".cloudflarestream.com"
	idx := strings.Index(viewerURL, marker)
	if idx < 0 || streamUID == "" {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "no thumbnail source for this session"})
		return
	}
	thumbURL := viewerURL[:idx+len(marker)] + "/" + streamUID + "/thumbnails/thumbnail.jpg"
	if h := r.URL.Query().Get("height"); h != "" {
		if n, err := strconv.Atoi(h); err == nil && n > 0 && n <= 2160 {
			thumbURL += "?height=" + strconv.Itoa(n)
		}
	}

	// Same UID-segment token scheme as playback; no-op when signing is off.
	signed, err := s.stream.SignPlaybackURL(thumbURL, streamUID, time.Now().Add(5*time.Minute))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), "GET", signed, nil)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	resp, err := frameClient.Do(req)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "fetch frame: " + err.Error()})
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		// CF returns non-200 until the stream has produced its first frames.
		writeJSON(w, http.StatusConflict, map[string]string{"error": "frame not available yet (stream may still be starting)"})
		return
	}
	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, resp.Body)
}
