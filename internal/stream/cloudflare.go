// Package stream wraps the Cloudflare Stream Live REST API. Provision() gives
// us an RTMPS push target for the edge and an HLS playback URL for the viewer;
// Destroy() cleans up when the session ends.
package stream

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const apiBase = "https://api.cloudflare.com/client/v4"

type Client struct {
	accountID string
	apiToken  string
	http      *http.Client
}

func New(accountID, apiToken string) *Client {
	return &Client{
		accountID: accountID,
		apiToken:  apiToken,
		http:      &http.Client{Timeout: 15 * time.Second},
	}
}

// LiveInput is what Provision returns. PushURL already includes the stream key
// so the edge can hand it straight to ffmpeg's output arg. PlaybackURL is the
// HLS manifest the viewer plays.
type LiveInput struct {
	UID         string
	PushURL     string
	PlaybackURL string
}

func (c *Client) Provision(ctx context.Context, name string) (*LiveInput, error) {
	// recording.mode MUST be "automatic" — without it CF Stream Live accepts
	// the RTMPS ingest (state goes to "connected") but never creates a video
	// object, and the HLS manifest URL returns 204 forever. Costs a
	// per-minute storage line on the account; deleteSession Destroys() the
	// input which also removes the recording.
	body, _ := json.Marshal(map[string]any{
		"meta":      map[string]string{"name": name},
		"recording": map[string]string{"mode": "automatic"},
	})

	req, err := http.NewRequestWithContext(ctx, "POST",
		fmt.Sprintf("%s/accounts/%s/stream/live_inputs", apiBase, c.accountID),
		bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		buf, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("cf stream provision: %d %s", resp.StatusCode, string(buf))
	}

	var out struct {
		Success bool `json:"success"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
		Result struct {
			UID   string `json:"uid"`
			RTMPS struct {
				URL       string `json:"url"`
				StreamKey string `json:"streamKey"`
			} `json:"rtmps"`
			// webRTC.url is the WHIP PUBLISH URL — contains a secret publish key.
			// Do NOT use for playback. webRTCPlayback.url is the WHEP PLAY URL
			// and contains the input UID — this is what we derive HLS from.
			WebRTCPlayback struct {
				URL string `json:"url"`
			} `json:"webRTCPlayback"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	if !out.Success {
		msg := "unknown"
		if len(out.Errors) > 0 {
			msg = out.Errors[0].Message
		}
		return nil, fmt.Errorf("cf stream provision: %s", msg)
	}

	return &LiveInput{
		UID:         out.Result.UID,
		PushURL:     out.Result.RTMPS.URL + out.Result.RTMPS.StreamKey,
		PlaybackURL: playbackURL(out.Result.WebRTCPlayback.URL, out.Result.UID),
	}, nil
}

func (c *Client) Destroy(ctx context.Context, uid string) error {
	if uid == "" {
		return nil
	}
	req, err := http.NewRequestWithContext(ctx, "DELETE",
		fmt.Sprintf("%s/accounts/%s/stream/live_inputs/%s", apiBase, c.accountID, uid), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiToken)
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 && resp.StatusCode != 404 {
		buf, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("cf stream destroy: %d %s", resp.StatusCode, string(buf))
	}
	return nil
}

// playbackURL derives the HLS live-playback URL from CF's webRTCPlayback URL.
// Format expected:
//   webRTCPlayback: https://customer-<code>.cloudflarestream.com/<INPUT_UID>/webRTC/play
//   HLS:            https://customer-<code>.cloudflarestream.com/<INPUT_UID>/manifest/video.m3u8
// We extract the customer subdomain from webRTCPlayback and rebuild using the
// canonical input UID from the API response, so we're not fragile if CF ever
// tweaks their URL structure.
func playbackURL(webRTCPlaybackURL, uid string) string {
	const marker = ".cloudflarestream.com"
	if idx := strings.Index(webRTCPlaybackURL, marker); idx > 0 {
		base := webRTCPlaybackURL[:idx+len(marker)]
		return fmt.Sprintf("%s/%s/manifest/video.m3u8", base, uid)
	}
	// Fallback: subdomain-neutral endpoint. Rarely needed.
	return fmt.Sprintf("https://videodelivery.net/%s/manifest/video.m3u8", uid)
}
