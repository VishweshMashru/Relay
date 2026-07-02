// relay-admin: local CLI for bootstrapping projects, edges, cameras, and API
// keys. Talks directly to Postgres — not for prod. When we grow a real
// dashboard, these operations move to authed HTTP endpoints.
//
// Usage:
//   relay-admin project create <name>
//   relay-admin project list
//   relay-admin apikey create <project_id> [<label>]
//   relay-admin edge create <project_id> <name>
//   relay-admin edge list [<project_id>]
//   relay-admin camera create <edge_id> <name>
//   relay-admin camera list <edge_id>
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"relay/internal/auth"
	"relay/internal/db"
	"relay/internal/stream"
)

func main() {
	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		die("DATABASE_URL is required (set in .env)")
	}
	secret := []byte(os.Getenv("RELAY_JWT_SECRET"))

	if len(os.Args) < 3 {
		usage()
		os.Exit(1)
	}
	resource, verb := os.Args[1], os.Args[2]
	rest := os.Args[3:]

	ctx := context.Background()
	pool, err := db.Connect(ctx, dsn)
	if err != nil {
		die("db connect: %v", err)
	}
	defer pool.Close()

	switch resource + " " + verb {
	case "project create":
		mustArgs(rest, 1, "project create <name>")
		projectCreate(ctx, pool, rest[0])
	case "project list":
		projectList(ctx, pool)
	case "apikey create":
		mustArgs(rest, 1, "apikey create <project_id> [<label>]")
		label := "default"
		if len(rest) >= 2 {
			label = rest[1]
		}
		apikeyCreate(ctx, pool, rest[0], label)
	case "edge create":
		if len(secret) < 16 {
			die("RELAY_JWT_SECRET must be at least 16 chars (dev: `openssl rand -hex 32`)")
		}
		mustArgs(rest, 2, "edge create <project_id> <name>")
		edgeCreate(ctx, pool, secret, rest[0], rest[1])
	case "edge list":
		var pid string
		if len(rest) >= 1 {
			pid = rest[0]
		}
		edgeList(ctx, pool, pid)
	case "camera create":
		mustArgs(rest, 2, "camera create <edge_id> <name>")
		cameraCreate(ctx, pool, rest[0], rest[1])
	case "camera list":
		mustArgs(rest, 1, "camera list <edge_id>")
		cameraList(ctx, pool, rest[0])
	case "streamkey create":
		streamkeyCreate(ctx)
	case "webhook create":
		mustArgs(rest, 1, "webhook create <notification_url>")
		webhookCreate(ctx, rest[0])
	default:
		usage()
		os.Exit(1)
	}
}

func projectCreate(ctx context.Context, pool *pgxpool.Pool, name string) {
	var pid string
	if err := pool.QueryRow(ctx,
		`INSERT INTO projects(name) VALUES ($1) RETURNING id::text`, name,
	).Scan(&pid); err != nil {
		die("insert project: %v", err)
	}
	raw, prefix, hash := mustGenAPIKey()
	if _, err := pool.Exec(ctx,
		`INSERT INTO api_keys(project_id, key_prefix, key_hash, label) VALUES ($1, $2, $3, 'default')`,
		pid, prefix, hash,
	); err != nil {
		die("insert api_key: %v", err)
	}
	fmt.Printf("project_id: %s\n", pid)
	fmt.Printf("api_key:    %s\n", raw)
	fmt.Println("(save the key — it will never be shown again)")
}

func projectList(ctx context.Context, pool *pgxpool.Pool) {
	rows, err := pool.Query(ctx, `SELECT id::text, name, created_at FROM projects ORDER BY created_at`)
	if err != nil {
		die("list: %v", err)
	}
	defer rows.Close()
	fmt.Printf("%-38s  %-30s  created\n", "id", "name")
	for rows.Next() {
		var id, name, created string
		_ = rows.Scan(&id, &name, &created)
		fmt.Printf("%-38s  %-30s  %s\n", id, name, created)
	}
}

func apikeyCreate(ctx context.Context, pool *pgxpool.Pool, projectID, label string) {
	raw, prefix, hash := mustGenAPIKey()
	if _, err := pool.Exec(ctx,
		`INSERT INTO api_keys(project_id, key_prefix, key_hash, label) VALUES ($1, $2, $3, $4)`,
		projectID, prefix, hash, label,
	); err != nil {
		die("insert api_key: %v", err)
	}
	fmt.Printf("api_key: %s\n", raw)
	fmt.Println("(save it — never shown again)")
}

func edgeCreate(ctx context.Context, pool *pgxpool.Pool, secret []byte, projectID, name string) {
	var edgeID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO edges(project_id, name, token_hash) VALUES ($1, $2, 'jwt') RETURNING id::text
	`, projectID, name).Scan(&edgeID); err != nil {
		die("insert edge: %v", err)
	}
	tok, err := auth.SignEdgeToken(secret, projectID, edgeID, 1)
	if err != nil {
		die("sign token: %v", err)
	}
	fmt.Printf("edge_id:    %s\n", edgeID)
	fmt.Printf("edge_token: %s\n", tok)
	fmt.Println("(save the token — pass it to the edge as RELAY_EDGE_TOKEN)")
}

func edgeList(ctx context.Context, pool *pgxpool.Pool, projectID string) {
	var (
		rows interface{ Next() bool; Scan(...any) error; Close() }
		err  error
	)
	if projectID == "" {
		rows, err = pool.Query(ctx,
			`SELECT id::text, project_id::text, name, COALESCE(hostname,''), created_at FROM edges ORDER BY created_at`)
	} else {
		rows, err = pool.Query(ctx,
			`SELECT id::text, project_id::text, name, COALESCE(hostname,''), created_at FROM edges WHERE project_id = $1 ORDER BY created_at`, projectID)
	}
	if err != nil {
		die("list: %v", err)
	}
	defer rows.Close()
	fmt.Printf("%-38s  %-38s  %-24s  hostname\n", "edge_id", "project_id", "name")
	for rows.Next() {
		var id, pid, name, hostname, created string
		_ = rows.Scan(&id, &pid, &name, &hostname, &created)
		fmt.Printf("%-38s  %-38s  %-24s  %s\n", id, pid, name, hostname)
	}
}

func cameraCreate(ctx context.Context, pool *pgxpool.Pool, edgeID, name string) {
	var cid string
	if err := pool.QueryRow(ctx,
		`INSERT INTO cameras(edge_id, name) VALUES ($1, $2) RETURNING id::text`,
		edgeID, name,
	).Scan(&cid); err != nil {
		die("insert camera: %v", err)
	}
	fmt.Printf("camera_id: %s\n", cid)
	fmt.Println("(add it to the edge's cameras.json alongside its RTSP URL)")
}

func cameraList(ctx context.Context, pool *pgxpool.Pool, edgeID string) {
	rows, err := pool.Query(ctx,
		`SELECT id::text, name, created_at FROM cameras WHERE edge_id = $1 ORDER BY created_at`, edgeID)
	if err != nil {
		die("list: %v", err)
	}
	defer rows.Close()
	fmt.Printf("%-38s  %-30s  created\n", "camera_id", "name")
	for rows.Next() {
		var id, name, created string
		_ = rows.Scan(&id, &name, &created)
		fmt.Printf("%-38s  %-30s  %s\n", id, name, created)
	}
}

// streamkeyCreate provisions a Cloudflare Stream signing key and prints the
// env vars relay-api needs for signed playback. Run once per account.
func streamkeyCreate(ctx context.Context) {
	accountID, apiToken := os.Getenv("ACCOUNT_ID"), os.Getenv("API_TOKEN")
	if accountID == "" || apiToken == "" {
		die("ACCOUNT_ID and API_TOKEN are required (Cloudflare Stream)")
	}
	id, pemB64, err := stream.New(accountID, apiToken).CreateSigningKey(ctx)
	if err != nil {
		die("create signing key: %v", err)
	}
	fmt.Println("Cloudflare Stream signing key created. Add to relay-api's environment:")
	fmt.Printf("RELAY_CF_SIGNING_KEY_ID=%s\n", id)
	fmt.Printf("RELAY_CF_SIGNING_KEY_PEM=%s\n", pemB64)
	fmt.Println("(the PEM is never shown again — store it now)")
}

// webhookCreate registers the account-wide Stream webhook (video-ready
// events) pointing at relay-api and prints the signing secret.
func webhookCreate(ctx context.Context, url string) {
	accountID, apiToken := os.Getenv("ACCOUNT_ID"), os.Getenv("API_TOKEN")
	if accountID == "" || apiToken == "" {
		die("ACCOUNT_ID and API_TOKEN are required (Cloudflare Stream)")
	}
	secret, err := stream.New(accountID, apiToken).CreateWebhook(ctx, url)
	if err != nil {
		die("create webhook: %v", err)
	}
	fmt.Println("Stream webhook registered. Add to relay-api's environment:")
	fmt.Printf("RELAY_CF_WEBHOOK_SECRET=%s\n", secret)
	fmt.Println()
	fmt.Println("For live input connected/disconnected events, also create a")
	fmt.Println("Notifications webhook destination in the CF dashboard pointing at")
	fmt.Println("the same URL, using the same value as the destination secret.")
}

func mustGenAPIKey() (raw, prefix, hash string) {
	raw, prefix, hash, err := auth.GenerateAPIKey()
	if err != nil {
		die("keygen: %v", err)
	}
	return
}

func mustArgs(args []string, n int, usageLine string) {
	if len(args) < n {
		die("usage: relay-admin %s", usageLine)
	}
}

func die(format string, a ...any) {
	log.Fatalf(format, a...)
}

func usage() {
	fmt.Fprintln(os.Stderr, `Usage:
  relay-admin project create <name>
  relay-admin project list
  relay-admin apikey  create <project_id> [<label>]
  relay-admin edge    create <project_id> <name>
  relay-admin edge    list   [<project_id>]
  relay-admin camera  create <edge_id> <name>
  relay-admin camera  list   <edge_id>
  relay-admin streamkey create   (needs ACCOUNT_ID + API_TOKEN)
  relay-admin webhook   create <notification_url>`)
}
