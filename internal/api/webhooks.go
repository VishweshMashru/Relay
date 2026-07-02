package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"relay/internal/vod"
)

// cfWebhook receives Cloudflare callbacks at POST /v1/webhooks/cloudflare.
// Two distinct producers land here, distinguished by their auth header:
//
//   - Stream video webhooks ("video is ready"): signed with an HMAC
//     Webhook-Signature header. Registered once via
//     `relay-admin webhook create <url>`.
//   - Notification webhooks (live input connected/disconnected): carry the
//     destination secret verbatim in cf-webhook-auth. Configured in the CF
//     dashboard under Notifications → Destinations, pointing at this URL
//     with RELAY_CF_WEBHOOK_SECRET as the secret.
//
// Both verify against RELAY_CF_WEBHOOK_SECRET. Parsing is deliberately
// tolerant: unrecognized payloads are logged and acked with 200 so CF doesn't
// retry-storm us while we learn a new shape.
func (s *Server) cfWebhook(w http.ResponseWriter, r *http.Request) {
	if len(s.webhookSecret) == 0 {
		writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "webhooks not configured (set RELAY_CF_WEBHOOK_SECRET)"})
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "read body"})
		return
	}

	switch {
	case r.Header.Get("Webhook-Signature") != "":
		if !verifyStreamSignature(r.Header.Get("Webhook-Signature"), body, s.webhookSecret) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "bad signature"})
			return
		}
		s.handleVideoWebhook(r, body)
	case r.Header.Get("cf-webhook-auth") != "":
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("cf-webhook-auth")), s.webhookSecret) != 1 {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "bad secret"})
			return
		}
		s.handleNotificationWebhook(r, body)
	default:
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no recognized auth header"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// verifyStreamSignature checks CF Stream's Webhook-Signature header:
// "time=<unix>,sig1=<hex hmac-sha256(secret, time + '.' + body)>",
// rejecting stale timestamps to block replays.
func verifyStreamSignature(header string, body, secret []byte) bool {
	var ts, sig string
	for _, part := range strings.Split(header, ",") {
		k, v, ok := strings.Cut(strings.TrimSpace(part), "=")
		if !ok {
			continue
		}
		switch k {
		case "time":
			ts = v
		case "sig1":
			sig = v
		}
	}
	if ts == "" || sig == "" {
		return false
	}
	unix, err := strconv.ParseInt(ts, 10, 64)
	if err != nil || time.Since(time.Unix(unix, 0)) > 5*time.Minute {
		return false
	}
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(ts))
	mac.Write([]byte("."))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(sig))
}

// handleVideoWebhook processes "video ready" events. Primary job: flip the
// matching recording asset to ready with real size/duration. Fallback: if
// no asset row exists yet (teardown harvest failed or hasn't run), register
// one for record=true sessions — the webhook is the safety net.
func (s *Server) handleVideoWebhook(r *http.Request, body []byte) {
	var v struct {
		UID           string  `json:"uid"`
		ReadyToStream bool    `json:"readyToStream"`
		Duration      float64 `json:"duration"`
		Size          int64   `json:"size"`
		LiveInput     string  `json:"liveInput"`
		Status        struct {
			State string `json:"state"`
		} `json:"status"`
	}
	if err := json.Unmarshal(body, &v); err != nil || v.UID == "" {
		log.Printf("webhook: unrecognized video payload: %.512s", string(body))
		return
	}
	if !v.ReadyToStream && v.Status.State != "ready" {
		return // progress events; only care about ready
	}
	ctx := r.Context()

	tag, err := s.pool.Exec(ctx, `
		UPDATE assets SET status = 'ready', size_bytes = $2,
		       metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('duration_seconds', $3::numeric)
		WHERE source = 'cloudflare' AND storage_key = $1 AND status = 'pending'
	`, v.UID, v.Size, v.Duration)
	if err != nil {
		log.Printf("webhook: mark asset ready %s: %v", v.UID, err)
		return
	}
	if tag.RowsAffected() > 0 {
		log.Printf("webhook: recording %s ready", v.UID)
		return
	}

	// No pending asset — maybe harvest never ran for this session. Register
	// the recording if its session wanted one.
	if v.LiveInput == "" {
		return
	}
	var sess vod.Session
	var ttl *int
	err = s.pool.QueryRow(ctx, `
		SELECT id::text, project_id::text, COALESCE(camera_id::text,''), record_ttl_seconds
		FROM sessions
		WHERE stream_input_uid = $1 AND record = true
		ORDER BY started_at DESC LIMIT 1
	`, v.LiveInput).Scan(&sess.ID, &sess.ProjectID, &sess.CameraID, &ttl)
	if err != nil {
		return // not a recorded session (or already destroyed) — nothing to do
	}
	sess.InputUID = v.LiveInput
	if ttl != nil {
		sess.TTLSeconds = *ttl
	}
	if _, err := vod.Harvest(ctx, s.pool, s.stream, sess); err != nil {
		log.Printf("webhook: fallback harvest for input %s: %v", v.LiveInput, err)
	}
}

// handleNotificationWebhook processes live input state changes delivered via
// CF Notifications. The exact payload schema varies by alert type, so
// extraction is defensive: find an input id and an event hint wherever they
// live, log anything we can't place.
func (s *Server) handleNotificationWebhook(r *http.Request, body []byte) {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		log.Printf("webhook: unrecognized notification payload: %.512s", string(body))
		return
	}
	inputID := findString(payload, "input_id", "liveInputId", "live_input_id", "input")
	event := strings.ToLower(findString(payload, "event_type", "eventType", "event", "alert_type", "text"))
	if inputID == "" {
		log.Printf("webhook: notification without input id: %.512s", string(body))
		return
	}
	ctx := r.Context()

	switch {
	case strings.Contains(event, "connect") && !strings.Contains(event, "disconnect"):
		// Video is actually flowing — more truthful than the first heartbeat.
		if tag, err := s.pool.Exec(ctx, `
			UPDATE sessions SET status = 'live'
			WHERE stream_input_uid = $1 AND status = 'pending'
		`, inputID); err != nil {
			log.Printf("webhook: mark live %s: %v", inputID, err)
		} else if tag.RowsAffected() > 0 {
			log.Printf("webhook: input %s connected → session live", inputID)
		}

	case strings.Contains(event, "disconnect"), strings.Contains(event, "errored"):
		// Push sessions have no edge supervisor to reconnect them: when the
		// encoder goes away, end the session instead of billing out the TTL.
		// Edge sessions are left alone — the agent's ffmpeg supervisor
		// reconnects on camera blips.
		var id, projectID, cameraID, streamUID string
		var record bool
		var ttl *int
		err := s.pool.QueryRow(ctx, `
			UPDATE sessions SET status = 'ended'
			WHERE stream_input_uid = $1 AND ingest = 'push' AND status IN ('pending','live')
			RETURNING id::text, project_id::text, COALESCE(camera_id::text,''), COALESCE(stream_input_uid,''), record, record_ttl_seconds
		`, inputID).Scan(&id, &projectID, &cameraID, &streamUID, &record, &ttl)
		if err != nil {
			return // edge session or already ended — nothing to do
		}
		log.Printf("webhook: input %s disconnected → push session %s ended", inputID, id)
		if record {
			sess := vod.Session{ID: id, ProjectID: projectID, CameraID: cameraID, InputUID: streamUID}
			if ttl != nil {
				sess.TTLSeconds = *ttl
			}
			if _, err := vod.Harvest(ctx, s.pool, s.stream, sess); err != nil {
				log.Printf("webhook: harvest session %s: %v", id, err)
			}
		} else if err := s.stream.Destroy(ctx, streamUID); err != nil {
			log.Printf("webhook: destroy input %s: %v", inputID, err)
		}

	default:
		log.Printf("webhook: unhandled notification event %q for input %s", event, inputID)
	}
}

// findString walks a decoded JSON object (including nested objects) for the
// first non-empty string under any of the given keys.
func findString(m map[string]any, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k].(string); ok && v != "" {
			return v
		}
	}
	for _, v := range m {
		if nested, ok := v.(map[string]any); ok {
			if s := findString(nested, keys...); s != "" {
				return s
			}
		}
	}
	return ""
}
