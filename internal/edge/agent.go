// Package edge implements the relay edge agent. It runs on a machine inside
// the customer's network, long-polls the control API for commands, and on
// "start" spawns ffmpeg to push the camera's RTSP feed to the data plane.
package edge

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"relay/internal/relay"
)

type Agent struct {
	APIURL     string
	EdgeToken  string // JWT signed by relay-api
	ConfigPath string

	client *http.Client
	config *Config
	ffmpeg *ffmpegManager
}

func (a *Agent) Run(ctx context.Context) error {
	if a.APIURL == "" {
		return errors.New("APIURL is required")
	}
	if a.EdgeToken == "" {
		return errors.New("EdgeToken (RELAY_EDGE_TOKEN) is required — provision with `relay-admin edge create`")
	}

	cfg, err := LoadConfig(a.ConfigPath)
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	a.config = cfg
	a.ffmpeg = newFfmpegManager()
	if a.client == nil {
		a.client = &http.Client{Timeout: 35 * time.Second}
	}
	defer a.ffmpeg.StopAll()

	log.Printf("relay-edge starting api=%s cameras=%d", a.APIURL, len(cfg.Cameras))

	backoff := time.Second
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		cmds, err := a.pollCommands(ctx)
		if err != nil {
			log.Printf("poll error: %v (retry in %s)", err, backoff)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
			if backoff < 30*time.Second {
				backoff *= 2
			}
			continue
		}
		backoff = time.Second

		for _, cmd := range cmds {
			a.dispatch(ctx, cmd)
		}
	}
}

func (a *Agent) pollCommands(ctx context.Context) ([]relay.Command, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", a.APIURL+"/v1/edges/commands", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+a.EdgeToken)
	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	var body struct {
		Commands []relay.Command `json:"commands"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}
	return body.Commands, nil
}

func (a *Agent) dispatch(_ context.Context, cmd relay.Command) {
	switch cmd.Type {
	case relay.CommandStart:
		rtsp := a.config.Cameras[cmd.CameraID]
		if rtsp == "" {
			log.Printf("start: no RTSP URL configured for camera %s (add it to cameras.json)", cmd.CameraID)
			return
		}
		pushURL, _ := cmd.Payload["push_url"].(string)
		if pushURL == "" {
			log.Printf("start: missing push_url in payload")
			return
		}
		if err := a.ffmpeg.Start(cmd.SessionID, rtsp, pushURL); err != nil {
			log.Printf("start: %v", err)
		}
	case relay.CommandStop:
		a.ffmpeg.Stop(cmd.SessionID)
		log.Printf("stop: session=%s", cmd.SessionID)
	default:
		log.Printf("unknown command type: %s", cmd.Type)
	}
}
