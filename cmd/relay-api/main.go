package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"relay/internal/api"
	"relay/internal/db"
	"relay/internal/reaper"
	"relay/internal/storage"
	"relay/internal/stream"
)

func main() {
	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}
	accountID := os.Getenv("ACCOUNT_ID")
	apiToken := os.Getenv("API_TOKEN")
	if accountID == "" || apiToken == "" {
		log.Fatal("ACCOUNT_ID and API_TOKEN are required (Cloudflare Stream)")
	}
	jwtSecret := []byte(os.Getenv("RELAY_JWT_SECRET"))
	if len(jwtSecret) < 16 {
		log.Fatal("RELAY_JWT_SECRET must be at least 16 chars (dev: `openssl rand -hex 32`)")
	}
	adminToken := []byte(os.Getenv("RELAY_ADMIN_TOKEN"))
	if len(adminToken) < 16 {
		log.Fatal("RELAY_ADMIN_TOKEN must be at least 16 chars (dev: `openssl rand -hex 32`)")
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.Connect(ctx, dsn)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("db migrate: %v", err)
	}

	streamClient := stream.New(accountID, apiToken)

	// With a CF Stream signing key, live inputs require signed playback URLs
	// and viewers get manifest tokens that die with the session. Provision
	// one with `relay-admin streamkey create`.
	if keyID := os.Getenv("RELAY_CF_SIGNING_KEY_ID"); keyID != "" {
		signingKey, err := stream.NewSigningKey(keyID, os.Getenv("RELAY_CF_SIGNING_KEY_PEM"))
		if err != nil {
			log.Fatalf("stream signing key: %v", err)
		}
		streamClient = streamClient.WithSigningKey(signingKey)
		log.Print("signed playback enabled")
	} else {
		log.Print("signed playback disabled: RELAY_CF_SIGNING_KEY_ID not set")
	}

	// Blob storage backs the assets (VOD) domain. Optional: without it the
	// asset endpoints return 501 and everything else works.
	var blobs storage.Store
	if endpoint := os.Getenv("RELAY_S3_ENDPOINT"); endpoint != "" {
		s3, err := storage.NewS3(
			endpoint,
			os.Getenv("RELAY_S3_REGION"),
			os.Getenv("RELAY_S3_BUCKET"),
			os.Getenv("RELAY_S3_ACCESS_KEY_ID"),
			os.Getenv("RELAY_S3_SECRET_ACCESS_KEY"),
		)
		if err != nil {
			log.Fatalf("storage: %v", err)
		}
		blobs = s3
		log.Printf("assets enabled: s3-compatible storage at %s", endpoint)
	} else {
		log.Print("assets disabled: RELAY_S3_ENDPOINT not set")
	}

	// Session reaper runs in-process alongside the HTTP server.
	go reaper.New(pool, streamClient, blobs).Run(ctx)

	addr := os.Getenv("RELAY_API_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	webhookSecret := []byte(os.Getenv("RELAY_CF_WEBHOOK_SECRET"))
	if len(webhookSecret) == 0 {
		log.Print("cloudflare webhooks disabled: RELAY_CF_WEBHOOK_SECRET not set")
	}

	apiServer := api.New(pool, streamClient, blobs, jwtSecret, adminToken, webhookSecret)

	// One process-wide LISTEN connection fans command notifications out to
	// edge long-polls, instead of each poll pinning a pool connection.
	go apiServer.RunDispatcher(ctx)

	srv := &http.Server{
		Addr:    addr,
		Handler: apiServer.Handler(),
	}

	// Shut down on SIGTERM/SIGINT so deploys drain in-flight long-polls
	// instead of getting SIGKILLed after the grace period.
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		log.Println("relay-api: shutting down")
		_ = srv.Shutdown(shutdownCtx)
	}()

	log.Printf("relay-api listening on %s", addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("relay-api: %v", err)
	}
}
