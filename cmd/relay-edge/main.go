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
