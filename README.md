# relay

On-demand camera streaming for private networks. Drop a tiny agent on the LAN
where a camera lives, mint a viewer session via API, embed the signed playback
URL. The camera never has to be reachable from the internet.

The product is two binaries plus a viewer:

| | what it is | who runs it |
|-|-|-|
| `relay-api`  | control API: sessions, edges, command dispatch, signed playback URLs | us (hosted) |
| `relay-edge` | the agent: outbound long-poll, opens RTSP on demand, pushes to the data plane | customer (their LAN) |
| `viewer/`    | minimal HLS / WebRTC web player | customer's frontend |

## Status

Day 0 — scaffold only. `go run` works, nothing is wired yet.

## Run locally

```bash
# terminal 1
go run ./cmd/relay-api

# terminal 2
RELAY_API_URL=http://localhost:8080 go run ./cmd/relay-edge
```

## Build

```bash
go build -o bin/relay-api  ./cmd/relay-api
go build -o bin/relay-edge ./cmd/relay-edge
```

Cross-compile the edge agent for a Windows factory PC:

```bash
GOOS=windows GOARCH=amd64 go build -o bin/relay-edge.exe ./cmd/relay-edge
```
