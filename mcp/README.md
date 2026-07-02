# streamo-mcp

Give your AI agent eyes. This MCP server exposes the Streamo/Relay video API
as tools, so Claude (or any MCP client) can list your cameras, open a live
session, **look at the current frame**, and pull stored clips.

```
> what's happening at the loading dock right now?

⏺ list_cameras()
⏺ start_session(camera_id: "…loading-dock…")
⏺ get_frame(session_id: "…")   ← the model sees the JPEG
⏺ stop_session(session_id: "…")

There's a truck backed up to bay 2 with its door open; no people visible.
```

## Tools

| Tool | What it does |
|---|---|
| `list_cameras` | Every camera across your edges, with online status |
| `start_session` | Start a live session → session id + human viewer URL |
| `get_frame` | Current frame from a live session, returned as an image |
| `stop_session` | End the session (stops the stream and billing) |
| `list_sessions` | Recent sessions, filterable by status |
| `list_clips` / `get_clip` | Stored clips with playback + download URLs |

## Setup

```bash
cd mcp && npm install
```

Claude Code:

```bash
claude mcp add streamo \
  --env RELAY_API_KEY=rk_live_… \
  --env RELAY_API_URL=https://api.streamo.in \
  -- node /path/to/relay/mcp/index.js
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "streamo": {
      "command": "node",
      "args": ["/path/to/relay/mcp/index.js"],
      "env": {
        "RELAY_API_KEY": "rk_live_…",
        "RELAY_API_URL": "https://api.streamo.in"
      }
    }
  }
}
```

Notes:

- `get_frame` needs the stream to have produced its first frames — expect
  "not available yet" for the first ~20–60s after `start_session`.
- Sessions cost money while running; agents are told to `stop_session` when
  done, and the server-side TTL + reaper clean up anything they forget.
- The API key is a normal project key — the agent can only see this project's
  cameras. Mint a dedicated key for it from the dashboard so it's revocable.
