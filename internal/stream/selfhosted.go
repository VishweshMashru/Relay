package stream

import (
	"context"
	"errors"
	"strings"
	"time"

	"relay/internal/relay"
)

// SelfHosted implements Provider against a MediaMTX server you run yourself
// (RTMP/WHIP ingest, HLS/WHEP playback). Built for cost comparison against
// Cloudflare: no CDN, no signed URLs, no recordings — the path IS the secret,
// same model as an RTMP stream key. Select with RELAY_STREAM_PROVIDER=selfhosted.
type SelfHosted struct {
	rtmpBase   string // rtmp://host:1935
	hlsBase    string // https://host/hls   (proxied to mediamtx:8888)
	webrtcBase string // https://host/webrtc (proxied to mediamtx:8889)
}

func NewSelfHosted(rtmpBase, hlsBase, webrtcBase string) (*SelfHosted, error) {
	if rtmpBase == "" || hlsBase == "" {
		return nil, errors.New("selfhosted stream provider needs RELAY_STREAM_RTMP_URL and RELAY_STREAM_HLS_URL")
	}
	return &SelfHosted{
		rtmpBase:   strings.TrimSuffix(rtmpBase, "/"),
		hlsBase:    strings.TrimSuffix(hlsBase, "/"),
		webrtcBase: strings.TrimSuffix(webrtcBase, "/"),
	}, nil
}

// Provision invents an unguessable path — MediaMTX accepts publish/read on
// any path (paths: all_others), so no API call is needed. The path plays the
// role CF's input UID + stream key play together.
func (s *SelfHosted) Provision(_ context.Context, _ string) (*LiveInput, error) {
	path := "live/" + strings.ReplaceAll(relay.NewUUID(), "-", "")
	in := &LiveInput{
		UID:         path,
		PushURL:     s.rtmpBase + "/" + path,
		PlaybackURL: s.hlsBase + "/" + path + "/index.m3u8",
	}
	if s.webrtcBase != "" {
		in.WHIPURL = s.webrtcBase + "/" + path + "/whip"
		in.WHEPURL = s.webrtcBase + "/" + path + "/whep"
	}
	return in, nil
}

// Destroy is a no-op: the path exists only while a publisher pushes to it,
// and teardown already stops the publisher (edge stop command / encoder
// disconnect). Nothing is billed while idle.
func (s *SelfHosted) Destroy(_ context.Context, _ string) error     { return nil }
func (s *SelfHosted) DeleteInput(_ context.Context, _ string) error { return nil }

var errNoRecordings = errors.New("recordings are not supported by the selfhosted stream provider yet")

func (s *SelfHosted) SupportsRecordings() bool { return false }
func (s *SelfHosted) ListRecordings(_ context.Context, _ string) ([]string, error) {
	return nil, errNoRecordings
}
func (s *SelfHosted) GetVideo(_ context.Context, _ string) (*Video, error) {
	return nil, errNoRecordings
}
func (s *SelfHosted) EnableDownload(_ context.Context, _ string) (*Download, error) {
	return nil, errNoRecordings
}
func (s *SelfHosted) DeleteVideo(_ context.Context, _ string) error { return errNoRecordings }

// SignPlaybackURL is identity: unguessable paths stand in for signing.
func (s *SelfHosted) SignPlaybackURL(playbackURL, _ string, _ time.Time) (string, error) {
	return playbackURL, nil
}
