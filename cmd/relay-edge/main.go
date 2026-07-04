package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"os/signal"
	"sort"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"relay/internal/edge"
)

func main() {
	_ = godotenv.Load()

	// Subcommands manage local config; no arguments runs the agent.
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "camera":
			cameraCmd(os.Args[2:])
			return
		case "help", "-h", "--help":
			usage()
			return
		}
	}

	apiURL := envOr("RELAY_API_URL", "http://localhost:8080")
	token := os.Getenv("RELAY_EDGE_TOKEN")
	if token == "" {
		log.Fatal("RELAY_EDGE_TOKEN is required — provision with `relay-admin edge create <project_id> <name>`")
	}
	configPath := envOr("RELAY_CAMERAS_FILE", "cameras.json")

	agent := &edge.Agent{
		APIURL:     apiURL,
		EdgeToken:  token,
		ConfigPath: configPath,
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	if err := agent.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		log.Fatalf("relay-edge: %v", err)
	}
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// cameraCmd manages cameras.json so nobody has to hand-edit JSON on the edge
// box. The running agent re-reads the file on every start command, so changes
// apply without a restart. Credentials never leave this machine.
func cameraCmd(args []string) {
	path := edge.ResolveConfigPath()
	if len(args) == 0 {
		usage()
		os.Exit(1)
	}
	switch args[0] {
	case "add":
		if len(args) < 3 {
			fmt.Fprintln(os.Stderr, `usage: relay-edge camera add <camera-id> "rtsp://user:pass@host:554/path"`)
			os.Exit(1)
		}
		id, rtspURL := args[1], args[2]
		fmt.Printf("→ probing %s\n", maskCreds(rtspURL))
		if err := edge.ProbeRTSP(rtspURL, 5*time.Second); err != nil {
			fmt.Printf("⚠ probe failed: %v\n  (saving anyway — the camera may be offline right now)\n", err)
		} else {
			fmt.Println("✓ RTSP server answered")
		}
		cfg, err := edge.LoadConfig(path)
		if err != nil {
			fatal("read %s: %v", path, err)
		}
		cfg.Cameras[id] = rtspURL
		if err := edge.SaveConfig(path, cfg); err != nil {
			fatal("write %s: %v (root-owned file? try sudo)", path, err)
		}
		fmt.Printf("✓ saved to %s — the agent picks this up on the next start command\n", path)

	case "remove":
		if len(args) < 2 {
			fmt.Fprintln(os.Stderr, "usage: relay-edge camera remove <camera-id>")
			os.Exit(1)
		}
		cfg, err := edge.LoadConfig(path)
		if err != nil {
			fatal("read %s: %v", path, err)
		}
		if _, ok := cfg.Cameras[args[1]]; !ok {
			fatal("camera %s not found in %s", args[1], path)
		}
		delete(cfg.Cameras, args[1])
		if err := edge.SaveConfig(path, cfg); err != nil {
			fatal("write %s: %v (root-owned file? try sudo)", path, err)
		}
		fmt.Printf("✓ removed from %s\n", path)

	case "list":
		cfg, err := edge.LoadConfig(path)
		if err != nil {
			fatal("read %s: %v", path, err)
		}
		if len(cfg.Cameras) == 0 {
			fmt.Printf("no cameras in %s\n", path)
			return
		}
		ids := make([]string, 0, len(cfg.Cameras))
		for id := range cfg.Cameras {
			ids = append(ids, id)
		}
		sort.Strings(ids)
		fmt.Printf("cameras in %s:\n", path)
		for _, id := range ids {
			fmt.Printf("  %s  →  %s\n", id, maskCreds(cfg.Cameras[id]))
		}

	default:
		usage()
		os.Exit(1)
	}
}

// maskCreds hides the password in an RTSP URL for terminal output.
func maskCreds(rawURL string) string {
	at := -1
	for i, c := range rawURL {
		if c == '@' {
			at = i
			break
		}
	}
	if at < 0 {
		return rawURL
	}
	schemeEnd := 0
	if i := len("rtsp://"); len(rawURL) > i && rawURL[:i] == "rtsp://" {
		schemeEnd = i
	}
	return rawURL[:schemeEnd] + "•••@" + rawURL[at+1:]
}

func fatal(format string, a ...any) {
	fmt.Fprintf(os.Stderr, "✗ "+format+"\n", a...)
	os.Exit(1)
}

func usage() {
	fmt.Fprintln(os.Stderr, `relay-edge — streamo edge agent

Run the agent (default):
  RELAY_API_URL=… RELAY_EDGE_TOKEN=… relay-edge

Manage cameras (edits cameras.json locally; credentials never leave this machine):
  relay-edge camera add <camera-id> "rtsp://user:pass@host:554/path"
  relay-edge camera remove <camera-id>
  relay-edge camera list`)
}
