package main

import (
	"context"
	"errors"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"

	"relay/internal/edge"
)

func main() {
	_ = godotenv.Load()

	apiURL := envOr("RELAY_API_URL", "http://localhost:8080")
	edgeID := os.Getenv("RELAY_EDGE_ID")
	if edgeID == "" {
		log.Fatal("RELAY_EDGE_ID is required (grab it from relay-seed output; temp until auth)")
	}
	configPath := envOr("RELAY_CAMERAS_FILE", "cameras.json")

	agent := &edge.Agent{
		APIURL:     apiURL,
		EdgeToken:  os.Getenv("RELAY_EDGE_TOKEN"),
		EdgeID:     edgeID,
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
