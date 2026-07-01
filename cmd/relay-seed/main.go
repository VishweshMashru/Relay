// relay-seed inserts a dev project + edge + camera and prints their IDs so
// you can curl the API end-to-end. Safe to re-run — uses a fixed name and
// upserts. Not for production.
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"

	"relay/internal/db"
)

func main() {
	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, dsn)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	var projectID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO projects(name, api_key_hash)
		VALUES ('dev', 'dev-not-a-real-hash')
		ON CONFLICT DO NOTHING
		RETURNING id::text
	`).Scan(&projectID); err != nil {
		// already exists — fetch it
		if err := pool.QueryRow(ctx,
			`SELECT id::text FROM projects WHERE name = 'dev'`,
		).Scan(&projectID); err != nil {
			log.Fatalf("project: %v", err)
		}
	}

	var edgeID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO edges(project_id, name, hostname, token_hash)
		VALUES ($1, 'dev-edge', 'localhost', 'dev-not-a-real-hash')
		RETURNING id::text
	`, projectID).Scan(&edgeID); err != nil {
		// already exists — fetch
		if err := pool.QueryRow(ctx,
			`SELECT id::text FROM edges WHERE project_id = $1 AND name = 'dev-edge'`,
			projectID,
		).Scan(&edgeID); err != nil {
			log.Fatalf("edge: %v", err)
		}
	}

	var cameraID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO cameras(edge_id, name)
		VALUES ($1, 'front-door')
		RETURNING id::text
	`, edgeID).Scan(&cameraID); err != nil {
		if err := pool.QueryRow(ctx,
			`SELECT id::text FROM cameras WHERE edge_id = $1 AND name = 'front-door'`,
			edgeID,
		).Scan(&cameraID); err != nil {
			log.Fatalf("camera: %v", err)
		}
	}

	fmt.Printf("project_id = %s\n", projectID)
	fmt.Printf("edge_id    = %s\n", edgeID)
	fmt.Printf("camera_id  = %s\n", cameraID)
}
