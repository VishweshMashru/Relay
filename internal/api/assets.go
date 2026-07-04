package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"relay/internal/auth"
	"relay/internal/relay"
)

const (
	uploadURLExpiry   = time.Hour
	playbackURLExpiry = 15 * time.Minute
	downloadURLExpiry = 24 * time.Hour // long enough for a WhatsApp/email link to still work
)

// createAsset registers a clip and hands back a presigned upload URL. The
// client PUTs the bytes straight to storage (video never transits relay-api),
// then calls completeAsset to flip it ready. Upload is the only asset path
// that needs blob storage configured — cloudflare-sourced recordings work
// without it.
func (s *Server) createAsset(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return
	}
	if s.blobs == nil {
		writeJSON(w, http.StatusNotImplemented, map[string]string{
			"error": "uploads not configured (set RELAY_S3_ENDPOINT, RELAY_S3_BUCKET, RELAY_S3_ACCESS_KEY_ID, RELAY_S3_SECRET_ACCESS_KEY)",
		})
		return
	}

	var req relay.CreateAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if req.ContentType == "" {
		req.ContentType = "video/mp4"
	}
	if req.TTLSeconds < 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ttl_seconds must be >= 0"})
		return
	}

	ctx := r.Context()

	// Optional links must belong to the caller's project.
	if req.CameraID != "" {
		var one int
		if err := s.pool.QueryRow(ctx, `
			SELECT 1 FROM cameras c JOIN edges e ON e.id = c.edge_id
			WHERE c.id = $1 AND e.project_id = $2
		`, req.CameraID, projectID).Scan(&one); err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "camera not found"})
			return
		}
	}
	if req.SessionID != "" {
		var one int
		if err := s.pool.QueryRow(ctx, `
			SELECT 1 FROM sessions se
			JOIN cameras c ON c.id = se.camera_id
			JOIN edges e ON e.id = c.edge_id
			WHERE se.id = $1 AND e.project_id = $2
		`, req.SessionID, projectID).Scan(&one); err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not found"})
			return
		}
	}

	id := relay.NewUUID()
	key := "assets/" + projectID + "/" + id
	var expires *time.Time
	if req.TTLSeconds > 0 {
		t := time.Now().UTC().Add(time.Duration(req.TTLSeconds) * time.Second)
		expires = &t
	}
	var metadata []byte
	if len(req.Metadata) > 0 {
		metadata, _ = json.Marshal(req.Metadata)
	}

	uploadURL, err := s.blobs.PresignPut(ctx, key, req.ContentType, uploadURLExpiry)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "storage: " + err.Error()})
		return
	}

	var a relay.Asset
	if err := s.pool.QueryRow(ctx, `
		INSERT INTO assets(id, project_id, camera_id, session_id, name, content_type, storage_key, metadata, expires_at)
		VALUES ($1, $2, NULLIF($3,'')::uuid, NULLIF($4,'')::uuid, NULLIF($5,''), $6, $7, $8, $9)
		RETURNING id::text, COALESCE(camera_id::text,''), COALESCE(session_id::text,''), COALESCE(name,''), source, content_type, status, created_at
	`, id, projectID, req.CameraID, req.SessionID, req.Name, req.ContentType, key, metadata, expires).Scan(
		&a.ID, &a.CameraID, &a.SessionID, &a.Name, &a.Source, &a.ContentType, &a.Status, &a.CreatedAt,
	); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	a.Metadata = req.Metadata
	a.ExpiresAt = expires
	a.UploadURL = uploadURL
	writeJSON(w, http.StatusOK, a)
}

// completeAsset verifies the object landed in storage and flips the asset to
// ready. Size comes from storage, not the client. Only meaningful for
// uploaded (s3) assets — recordings complete themselves.
func (s *Server) completeAsset(w http.ResponseWriter, r *http.Request) {
	projectID, ok := s.projectFromKey(w, r)
	if !ok {
		return
	}
	id := r.PathValue("id")
	ctx := r.Context()

	var key, source string
	if err := s.pool.QueryRow(ctx,
		`SELECT storage_key, source FROM assets WHERE id = $1 AND project_id = $2`, id, projectID,
	).Scan(&key, &source); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "asset not found"})
		return
	}
	if source != string(relay.AssetSourceS3) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "recordings become ready automatically; complete applies to uploads only"})
		return
	}
	if s.blobs == nil {
		writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "uploads not configured"})
		return
	}

	size, exists, err := s.blobs.Stat(ctx, key)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "storage: " + err.Error()})
		return
	}
	if !exists {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "object not uploaded yet"})
		return
	}

	if _, err := s.pool.Exec(ctx, `
		UPDATE assets SET status = 'ready', size_bytes = $3
		WHERE id = $1 AND project_id = $2
	`, id, projectID, size); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	a, err := s.fetchAsset(r, projectID, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, a)
}

// getAsset returns metadata plus fresh presigned playback/download URLs.
func (s *Server) getAsset(w http.ResponseWriter, r *http.Request) {
	projectID, ok := s.projectFromKey(w, r)
	if !ok {
		return
	}
	a, err := s.fetchAsset(r, projectID, r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "asset not found"})
		return
	}
	writeJSON(w, http.StatusOK, a)
}

// listAssets is project-scoped with optional camera filter and keyset
// pagination (?before=<RFC3339>). URLs are not presigned in lists — fetch the
// asset for playable links.
func (s *Server) listAssets(w http.ResponseWriter, r *http.Request) {
	projectID, ok := s.projectFromKey(w, r)
	if !ok {
		return
	}
	limit := 50
	if q := r.URL.Query().Get("limit"); q != "" {
		fmt.Sscanf(q, "%d", &limit)
		if limit < 1 || limit > 200 {
			limit = 50
		}
	}
	before := time.Now().UTC().Add(time.Hour) // future sentinel: no cursor
	if q := r.URL.Query().Get("before"); q != "" {
		t, err := time.Parse(time.RFC3339, q)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "before must be RFC3339"})
			return
		}
		before = t
	}
	cameraID := r.URL.Query().Get("camera_id")

	rows, err := s.pool.Query(r.Context(), `
		SELECT id::text, COALESCE(camera_id::text,''), COALESCE(session_id::text,''), COALESCE(name,''),
		       source, content_type, COALESCE(size_bytes,0), status, COALESCE(metadata,'null'), expires_at, created_at
		FROM assets
		WHERE project_id = $1
		  AND ($2 = '' OR camera_id = NULLIF($2,'')::uuid)
		  AND created_at < $3
		ORDER BY created_at DESC
		LIMIT $4
	`, projectID, cameraID, before, limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	out := []relay.Asset{}
	for rows.Next() {
		var a relay.Asset
		var metadata []byte
		if err := rows.Scan(&a.ID, &a.CameraID, &a.SessionID, &a.Name, &a.Source, &a.ContentType,
			&a.SizeBytes, &a.Status, &metadata, &a.ExpiresAt, &a.CreatedAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		_ = json.Unmarshal(metadata, &a.Metadata)
		out = append(out, a)
	}
	writeJSON(w, http.StatusOK, map[string]any{"assets": out})
}

// deleteAsset removes the stored object and the row. Object delete happens
// first; if storage errors we keep the row so the reaper (or a retry) can
// finish the job instead of orphaning the object.
func (s *Server) deleteAsset(w http.ResponseWriter, r *http.Request) {
	projectID, ok := s.projectFromKey(w, r)
	if !ok {
		return
	}
	id := r.PathValue("id")
	ctx := r.Context()

	var key, source string
	if err := s.pool.QueryRow(ctx,
		`SELECT storage_key, source FROM assets WHERE id = $1 AND project_id = $2`, id, projectID,
	).Scan(&key, &source); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "asset not found"})
		return
	}
	if source == string(relay.AssetSourceCloudflare) {
		cf, ok := s.cloudflare()
		if !ok {
			writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "cloudflare provider not configured"})
			return
		}
		if err := cf.DeleteVideo(ctx, key); err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": "stream: " + err.Error()})
			return
		}
	} else {
		if s.blobs == nil {
			writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "uploads not configured"})
			return
		}
		if err := s.blobs.Delete(ctx, key); err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": "storage: " + err.Error()})
			return
		}
	}
	if _, err := s.pool.Exec(ctx,
		`DELETE FROM assets WHERE id = $1 AND project_id = $2`, id, projectID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// fetchAsset loads one asset and signs its playback/download URLs. S3 assets
// get presigned bucket URLs; cloudflare assets (live recordings) get Stream
// playback + MP4 download URLs, and lazily flip pending→ready as CF finishes
// processing the recording.
func (s *Server) fetchAsset(r *http.Request, projectID, id string) (*relay.Asset, error) {
	ctx := r.Context()
	var a relay.Asset
	var metadata []byte
	var key string
	if err := s.pool.QueryRow(ctx, `
		SELECT id::text, COALESCE(camera_id::text,''), COALESCE(session_id::text,''), COALESCE(name,''),
		       source, content_type, COALESCE(size_bytes,0), status, COALESCE(metadata,'null'), expires_at, created_at, storage_key
		FROM assets WHERE id = $1 AND project_id = $2
	`, id, projectID).Scan(&a.ID, &a.CameraID, &a.SessionID, &a.Name, &a.Source, &a.ContentType,
		&a.SizeBytes, &a.Status, &metadata, &a.ExpiresAt, &a.CreatedAt, &key); err != nil {
		return nil, err
	}
	_ = json.Unmarshal(metadata, &a.Metadata)

	if a.Source == relay.AssetSourceCloudflare {
		s.fetchCloudflareURLs(ctx, &a, key)
		return &a, nil
	}

	if a.Status == relay.AssetReady && s.blobs != nil {
		playback, err := s.blobs.PresignGet(ctx, key, playbackURLExpiry, "")
		if err != nil {
			log.Printf("assets: presign playback %s: %v", a.ID, err)
		} else {
			a.PlaybackURL = playback
		}
		download, err := s.blobs.PresignGet(ctx, key, downloadURLExpiry, downloadName(&a))
		if err != nil {
			log.Printf("assets: presign download %s: %v", a.ID, err)
		} else {
			a.DownloadURL = download
		}
	}
	return &a, nil
}

// fetchCloudflareURLs resolves playback/download for a recording asset,
// flipping it ready (with real size/duration) once CF finishes processing.
// Recording assets are inherently CF-backed regardless of the project's
// current live provider.
func (s *Server) fetchCloudflareURLs(ctx context.Context, a *relay.Asset, videoUID string) {
	cf, ok := s.cloudflare()
	if !ok {
		log.Printf("assets: %s is cloudflare-sourced but cloudflare is not configured", a.ID)
		return
	}
	video, err := cf.GetVideo(ctx, videoUID)
	if err != nil {
		log.Printf("assets: get video %s: %v", a.ID, err)
		return
	}
	if a.Status == relay.AssetPending && video.Ready {
		if _, err := s.pool.Exec(ctx, `
			UPDATE assets SET status = 'ready', size_bytes = $2,
			       metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('duration_seconds', $3::numeric)
			WHERE id = $1
		`, a.ID, video.SizeBytes, video.DurationSeconds); err != nil {
			log.Printf("assets: mark ready %s: %v", a.ID, err)
		} else {
			a.Status = relay.AssetReady
			a.SizeBytes = video.SizeBytes
		}
	}
	if !video.Ready {
		return
	}
	playback, err := cf.SignPlaybackURL(video.HLSURL, videoUID, time.Now().Add(playbackURLExpiry))
	if err != nil {
		log.Printf("assets: sign playback %s: %v", a.ID, err)
	} else {
		a.PlaybackURL = playback
	}
	// MP4 rendition builds asynchronously on first request; download_url
	// appears on a later fetch once it's ready.
	dl, err := cf.EnableDownload(ctx, videoUID)
	if err != nil {
		log.Printf("assets: enable download %s: %v", a.ID, err)
		return
	}
	if dl.Ready {
		download, err := cf.SignPlaybackURL(dl.URL, videoUID, time.Now().Add(downloadURLExpiry))
		if err != nil {
			log.Printf("assets: sign download %s: %v", a.ID, err)
		} else {
			a.DownloadURL = download
		}
	}
}

// projectFromKey resolves the caller's project. Asset reads/deletes work for
// both sources; only uploads additionally require blob storage.
func (s *Server) projectFromKey(w http.ResponseWriter, r *http.Request) (string, bool) {
	projectID, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no project in context"})
		return "", false
	}
	return projectID, true
}

func downloadName(a *relay.Asset) string {
	name := a.Name
	if name == "" {
		name = a.ID
	}
	ext := ".mp4"
	switch a.ContentType {
	case "video/webm":
		ext = ".webm"
	case "video/quicktime":
		ext = ".mov"
	case "image/jpeg":
		ext = ".jpg"
	case "image/png":
		ext = ".png"
	}
	return name + ext
}
