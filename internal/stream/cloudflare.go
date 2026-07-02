// Package stream wraps the Cloudflare Stream Live REST API. Provision() gives
// us an RTMPS push target for the edge and an HLS playback URL for the viewer;
// Destroy() cleans up when the session ends.
package stream

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const apiBase = "https://api.cloudflare.com/client/v4"

// Provider is the live-streaming seam. Cloudflare Stream is the only backend
// today; the interface exists so the control plane never depends on it
// directly and other media planes can slot in per-primitive.
type Provider interface {
	Provision(ctx context.Context, name string) (*LiveInput, error)
	// Destroy removes the live input AND its recordings — unrecorded teardown.
	Destroy(ctx context.Context, uid string) error
	// DeleteInput removes only the live input; recordings survive as videos.
	DeleteInput(ctx context.Context, uid string) error
	// ListRecordings returns the video UIDs recorded from a live input.
	ListRecordings(ctx context.Context, inputUID string) ([]string, error)
	GetVideo(ctx context.Context, videoUID string) (*Video, error)
	// EnableDownload asks the backend to prepare an MP4 for the video.
	// Idempotent; Ready is false until the rendition is built.
	EnableDownload(ctx context.Context, videoUID string) (*Download, error)
	DeleteVideo(ctx context.Context, videoUID string) error
	// SignPlaybackURL returns a viewer-safe playback URL. Backends without
	// signed playback return the URL unchanged.
	SignPlaybackURL(playbackURL, uid string, exp time.Time) (string, error)
}

// Video is a stored (or still-recording) VOD object.
type Video struct {
	UID             string
	Ready           bool
	HLSURL          string
	ThumbnailURL    string
	DurationSeconds float64
	SizeBytes       int64
}

// Download is the MP4 rendition of a video.
type Download struct {
	URL   string
	Ready bool
}

type Client struct {
	accountID string
	apiToken  string
	http      *http.Client
	signing   *SigningKey // nil = unsigned playback
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
// HLS manifest the viewer plays. WHIPURL/WHEPURL are the WebRTC pair for
// sub-second sessions: WHIP embeds a secret publish key (treat like PushURL),
// WHEP contains the input UID and signs like any playback URL.
type LiveInput struct {
	UID         string
	PushURL     string
	PlaybackURL string
	WHIPURL     string
	WHEPURL     string
}

func (c *Client) Provision(ctx context.Context, name string) (*LiveInput, error) {
	// recording.mode MUST be "automatic" — without it CF Stream Live accepts
	// the RTMPS ingest (state goes to "connected") but never creates a video
	// object, and the HLS manifest URL returns 204 forever. Costs a
	// per-minute storage line on the account; deleteSession Destroys() the
	// input which also removes the recording.
	recording := map[string]any{"mode": "automatic"}
	if c.signing != nil {
		// Playback (live + recordings) then requires the RS256 tokens minted
		// by SignPlaybackURL — a bare manifest URL stops working.
		recording["requireSignedURLs"] = true
	}
	body, _ := json.Marshal(map[string]any{
		"meta":      map[string]string{"name": name},
		"recording": recording,
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
			WebRTC struct {
				URL string `json:"url"`
			} `json:"webRTC"`
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
		WHIPURL:     out.Result.WebRTC.URL,
		WHEPURL:     out.Result.WebRTCPlayback.URL,
	}, nil
}

// Destroy deletes a Live Input AND any recording videos associated with it.
//
// CF Stream Live with recording.mode=automatic (which we require, otherwise
// no HLS manifest gets built) creates a persistent video object per session.
// Deleting the Live Input alone does NOT delete those videos — they linger
// as VOD assets, count against your storage quota, and keep the "Live"
// indicator lit in the CF dashboard while recording is finalizing. We must
// explicitly delete the videos too.
func (c *Client) Destroy(ctx context.Context, uid string) error {
	if uid == "" {
		return nil
	}
	// 1. List videos attached to this live input, delete each. Best-effort:
	//    if listing fails we still try to delete the input itself.
	if videos, err := c.ListRecordings(ctx, uid); err == nil {
		for _, v := range videos {
			_ = c.DeleteVideo(ctx, v)
		}
	}
	// 2. Delete the live input.
	return c.DeleteInput(ctx, uid)
}

// DeleteInput removes the live input only. Recordings made from it persist
// as regular Stream videos — this is the record-from-live teardown path.
func (c *Client) DeleteInput(ctx context.Context, uid string) error {
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
		return fmt.Errorf("cf stream delete input: %d %s", resp.StatusCode, string(buf))
	}
	return nil
}

// GetVideo fetches one video's status and playback details.
func (c *Client) GetVideo(ctx context.Context, videoUID string) (*Video, error) {
	req, err := http.NewRequestWithContext(ctx, "GET",
		fmt.Sprintf("%s/accounts/%s/stream/%s", apiBase, c.accountID, videoUID), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiToken)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		buf, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("cf get video: %d %s", resp.StatusCode, string(buf))
	}
	var out struct {
		Result struct {
			UID           string  `json:"uid"`
			ReadyToStream bool    `json:"readyToStream"`
			Duration      float64 `json:"duration"`
			Size          int64   `json:"size"`
			Thumbnail     string  `json:"thumbnail"`
			Playback      struct {
				HLS string `json:"hls"`
			} `json:"playback"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &Video{
		UID:             out.Result.UID,
		Ready:           out.Result.ReadyToStream,
		HLSURL:          out.Result.Playback.HLS,
		ThumbnailURL:    out.Result.Thumbnail,
		DurationSeconds: out.Result.Duration,
		SizeBytes:       out.Result.Size,
	}, nil
}

// EnableDownload creates (or reads back) the MP4 rendition for a video. CF
// builds it asynchronously; Ready flips once percentComplete hits 100.
func (c *Client) EnableDownload(ctx context.Context, videoUID string) (*Download, error) {
	do := func(method string) (*http.Response, error) {
		req, err := http.NewRequestWithContext(ctx, method,
			fmt.Sprintf("%s/accounts/%s/stream/%s/downloads", apiBase, c.accountID, videoUID), nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+c.apiToken)
		return c.http.Do(req)
	}
	resp, err := do("POST")
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		// Likely already created — read it back.
		resp.Body.Close()
		if resp, err = do("GET"); err != nil {
			return nil, err
		}
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		buf, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("cf enable download: %d %s", resp.StatusCode, string(buf))
	}
	var out struct {
		Result struct {
			Default struct {
				URL             string  `json:"url"`
				PercentComplete float64 `json:"percentComplete"`
			} `json:"default"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &Download{
		URL:   out.Result.Default.URL,
		Ready: out.Result.Default.PercentComplete >= 100,
	}, nil
}

// ListRecordings returns the video UIDs recorded from a live input.
func (c *Client) ListRecordings(ctx context.Context, inputUID string) ([]string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET",
		fmt.Sprintf("%s/accounts/%s/stream/live_inputs/%s/videos", apiBase, c.accountID, inputUID), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiToken)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("cf list videos: %d", resp.StatusCode)
	}
	var out struct {
		Result []struct {
			UID string `json:"uid"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	uids := make([]string, 0, len(out.Result))
	for _, v := range out.Result {
		uids = append(uids, v.UID)
	}
	return uids, nil
}

// DeleteVideo removes a stored video (a recording or any Stream VOD).
func (c *Client) DeleteVideo(ctx context.Context, videoUID string) error {
	req, err := http.NewRequestWithContext(ctx, "DELETE",
		fmt.Sprintf("%s/accounts/%s/stream/%s", apiBase, c.accountID, videoUID), nil)
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
		return fmt.Errorf("cf delete video: %d %s", resp.StatusCode, string(buf))
	}
	return nil
}

// CreateWebhook registers the account-wide Stream webhook (video.ready
// events) and returns the signing secret. Run once via
// `relay-admin webhook create <url>`; CF only keeps one webhook per account.
func (c *Client) CreateWebhook(ctx context.Context, notificationURL string) (secret string, err error) {
	body, _ := json.Marshal(map[string]string{"notificationUrl": notificationURL})
	req, err := http.NewRequestWithContext(ctx, "PUT",
		fmt.Sprintf("%s/accounts/%s/stream/webhook", apiBase, c.accountID),
		bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		buf, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("cf create webhook: %d %s", resp.StatusCode, string(buf))
	}
	var out struct {
		Result struct {
			Secret string `json:"secret"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	if out.Result.Secret == "" {
		return "", errors.New("cf create webhook: no secret in response")
	}
	return out.Result.Secret, nil
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
