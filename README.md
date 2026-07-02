# relay

The video layer for devices on networks you don't control — streamo.in.

Live-stream any camera (or drone, or robot) on demand, even from behind NAT
and firewalls, and store/fetch/share clips. Video never transits the control
plane: live goes edge → Cloudflare Stream CDN, clips go edge → S3-compatible
storage with retention TTLs.

| | what it is | who runs it |
|-|-|-|
| `relay-api`   | control plane: sessions, edges, assets, keys, signed playback | us (hosted) |
| `relay-edge`  | LAN agent: outbound long-poll, opens RTSP on demand, supervised ffmpeg push | customer (their LAN) |
| `relay-admin` | bootstrap CLI (projects, keys, CF signing key) — not for prod | us (local) |
| `web/`        | landing + multi-tenant dashboard (Next.js + Clerk) | us (hosted) |
| `mcp/`        | MCP server — gives AI agents eyes on your cameras | customer |

## API surface

```
POST   /v1/sessions                     start a live session
                                          ingest:"edge" → agent opens the camera's RTSP
                                          ingest:"push" → returns a push_url (drone/OBS, no agent)
                                          protocol:"webrtc" (push only) → WHIP in, WHEP out, sub-second
GET    /v1/sessions/{id}                playback URL (viewer token or API key)
GET    /v1/sessions/{id}/frame.jpg      current frame as JPEG — for AI agents
DELETE /v1/sessions/{id}                end early; heartbeats + reaper handle the rest

POST   /v1/assets                       register a clip → presigned upload_url
POST   /v1/assets/{id}/complete         verify upload, flip ready
GET    /v1/assets/{id}                  playback_url + download_url (signed)
GET    /v1/assets                       list, filter by camera, paginate

POST   /v1/edges                        provision an edge → edge_token
POST   /v1/edges/{id}/rotate-token      revoke one edge's token
POST   /v1/edges/{id}/cameras           register a camera (RTSP URL stays on the LAN)
GET    /v1/keys · POST · DELETE         API key management
```

All customer endpoints take `Authorization: Bearer rk_live_…`, scoped to your
project. Viewers use per-session tokens; playback URLs are CF-signed when a
signing key is configured.

## Run locally

```bash
cp deploy/env.example .env   # fill in DATABASE_URL + Cloudflare Stream creds

# terminal 1 — control plane (migrations auto-apply)
go run ./cmd/relay-api

# terminal 2 — edge agent
RELAY_API_URL=http://localhost:8080 RELAY_EDGE_TOKEN=… go run ./cmd/relay-edge

# terminal 3 — dashboard
cd web && npm run dev
```

## Build & deploy

```bash
go build -o bin/relay-api  ./cmd/relay-api
go build -o bin/relay-edge ./cmd/relay-edge
```

- Edge binaries: tag `edge-v*` → GitHub Actions cross-compiles + publishes,
  one-line installers in `install/` (`streamo.in/install.sh`).
- API: Fly.io (`fly.toml`) or any VPS via `docker-compose.yml` + Caddy —
  see `deploy/VPS.md`.
- Signed playback: `relay-admin streamkey create` once, set the two env vars.

## Give an AI agent eyes

```bash
cd mcp && npm install
claude mcp add streamo --env RELAY_API_KEY=rk_live_… -- node $(pwd)/index.js
```

Then ask: *"what's on the loading dock camera right now?"* — the agent lists
cameras, starts a session, looks at the frame, and stops the session. See
`mcp/README.md`.
