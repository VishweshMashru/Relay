package main

import (
	"context"
	"log"
	"os"

	"github.com/joho/godotenv"

	"relay/internal/api"
	"relay/internal/db"
	"relay/internal/stream"
)

func main() {
	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required (set in .env)")
	}
	accountID := os.Getenv("ACCOUNT_ID")
	apiToken := os.Getenv("API_TOKEN")
	if accountID == "" || apiToken == "" {
		log.Fatal("ACCOUNT_ID and API_TOKEN are required (set in .env)")
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, dsn)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("db migrate: %v", err)
	}

	streamClient := stream.New(accountID, apiToken)

	addr := os.Getenv("RELAY_API_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	if err := api.New(pool, streamClient).ListenAndServe(addr); err != nil {
		log.Fatalf("relay-api: %v", err)
	}
}
