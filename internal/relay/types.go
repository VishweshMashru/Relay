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

// Session is one on-demand viewer session.
type Session struct {
	ID              string        `json:"id"`
	CameraID        string        `json:"camera_id"`
	Protocol        Protocol      `json:"protocol"`
	Status          SessionStatus `json:"status"`
	ViewerURL       string        `json:"viewer_url,omitempty"`
	StartedAt       time.Time     `json:"started_at"`
	LastHeartbeatAt time.Time     `json:"last_heartbeat_at"`
	ExpiresAt       time.Time     `json:"expires_at"`
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

// CreateSessionRequest is the customer-facing API for starting a viewer session.
type CreateSessionRequest struct {
	CameraID     string   `json:"camera_id"`
	Protocol     Protocol `json:"protocol"`
	TTLSeconds   int      `json:"ttl_seconds"`
}
