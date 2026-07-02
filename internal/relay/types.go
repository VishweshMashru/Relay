// Package relay holds the wire types shared between the control API and the
// edge agent. Anything that crosses the network in either direction lives here.
package relay

import "time"

type SessionStatus string

const (
	SessionPending SessionStatus = "pending"
	SessionLive    SessionStatus = "live"
	SessionEnded   SessionStatus = "ended"
	SessionExpired SessionStatus = "expired"
)

type Protocol string

const (
	ProtocolHLS    Protocol = "hls"
	ProtocolWebRTC Protocol = "webrtc"
)

// Edge is one installed agent instance. RTSP URLs and camera credentials
// never travel to the control plane — only the edge holds them.
type Edge struct {
	ID         string    `json:"id"`
	ProjectID  string    `json:"project_id"`
	Hostname   string    `json:"hostname"`
	LastSeenAt time.Time `json:"last_seen_at"`
}

// Camera is a named RTSP source the edge has registered. The cloud knows the
// name; the edge knows the URL.
type Camera struct {
	ID     string `json:"id"`
	EdgeID string `json:"edge_id"`
	Name   string `json:"name"`
}

type IngestType string

const (
	// IngestEdge: the edge agent opens the camera's RTSP feed on demand.
	IngestEdge IngestType = "edge"
	// IngestPush: the client pushes RTMPS directly to the returned push_url —
	// a drone controller, OBS, any encoder. No edge agent involved.
	IngestPush IngestType = "push"
)

// Session is one on-demand viewer session.
type Session struct {
	ID              string        `json:"id"`
	CameraID        string        `json:"camera_id,omitempty"` // empty for push-ingest sessions
	Ingest          IngestType    `json:"ingest"`
	Protocol        Protocol      `json:"protocol"`
	Record          bool          `json:"record,omitempty"`
	Status          SessionStatus `json:"status"`
	ViewerURL       string        `json:"viewer_url,omitempty"`
	ViewerToken     string        `json:"viewer_token,omitempty"` // returned once, at creation
	PushURL         string        `json:"push_url,omitempty"`     // returned once, push-ingest only
	StartedAt       time.Time     `json:"started_at"`
	LastHeartbeatAt time.Time     `json:"last_heartbeat_at"`
	ExpiresAt       time.Time     `json:"expires_at"`
}

type AssetStatus string

const (
	AssetPending AssetStatus = "pending"
	AssetReady   AssetStatus = "ready"
)

type AssetSource string

const (
	AssetSourceS3         AssetSource = "s3"         // uploaded clip; storage_key is the bucket key
	AssetSourceCloudflare AssetSource = "cloudflare" // live recording; storage_key is the CF video UID
)

// Asset is a stored video object — an uploaded clip or a harvested
// live-session recording. URLs are signed per-fetch and never persisted.
type Asset struct {
	ID          string            `json:"id"`
	CameraID    string            `json:"camera_id,omitempty"`
	SessionID   string            `json:"session_id,omitempty"`
	Name        string            `json:"name,omitempty"`
	Source      AssetSource       `json:"source"`
	ContentType string            `json:"content_type"`
	SizeBytes   int64             `json:"size_bytes,omitempty"`
	Status      AssetStatus       `json:"status"`
	Metadata    map[string]string `json:"metadata,omitempty"`
	ExpiresAt   *time.Time        `json:"expires_at,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`

	// Populated on create (upload) or fetch (playback/download).
	UploadURL   string `json:"upload_url,omitempty"`
	PlaybackURL string `json:"playback_url,omitempty"`
	DownloadURL string `json:"download_url,omitempty"`
}

// CreateAssetRequest is the customer-facing API for registering a clip
// upload. The response carries a presigned upload_url; the client PUTs the
// bytes there, then calls POST /v1/assets/{id}/complete.
type CreateAssetRequest struct {
	Name        string            `json:"name"`
	ContentType string            `json:"content_type"`
	CameraID    string            `json:"camera_id"`
	SessionID   string            `json:"session_id"`
	TTLSeconds  int               `json:"ttl_seconds"` // 0 = retain indefinitely
	Metadata    map[string]string `json:"metadata"`
}

type CommandType string

const (
	CommandStart CommandType = "start"
	CommandStop  CommandType = "stop"
)

// Command is what the control API hands back to an edge's long-poll. The edge
// dispatches by Type and uses Payload to find the upstream push target.
type Command struct {
	ID        string         `json:"id"`
	Type      CommandType    `json:"type"`
	SessionID string         `json:"session_id"`
	CameraID  string         `json:"camera_id"`
	Payload   map[string]any `json:"payload,omitempty"`
}

// CreateSessionRequest is the customer-facing API for starting a viewer
// session. camera_id is required for edge ingest; for push ingest pass
// ingest:"push" and optionally a name instead.
type CreateSessionRequest struct {
	CameraID   string     `json:"camera_id"`
	Ingest     IngestType `json:"ingest"`
	Name       string     `json:"name"`
	Protocol   Protocol   `json:"protocol"`
	TTLSeconds int        `json:"ttl_seconds"`
	// Record keeps the session's recording as an asset after teardown
	// instead of deleting it. RecordTTLSeconds sets the recording's
	// retention; 0 = keep forever.
	Record           bool `json:"record"`
	RecordTTLSeconds int  `json:"record_ttl_seconds"`
}
