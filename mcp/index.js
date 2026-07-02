#!/usr/bin/env node
// streamo-mcp: gives AI agents eyes.
//
// Exposes the Streamo/Relay video API as MCP tools — list cameras, start a
// live session, grab the current frame as an image the model can actually
// see, and fetch stored clips.
//
// Config (env):
//   RELAY_API_KEY  — required, an rk_live_… project key
//   RELAY_API_URL  — default https://api.streamo.in
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = (process.env.RELAY_API_URL ?? "https://api.streamo.in").replace(/\/$/, "");
const API_KEY = process.env.RELAY_API_KEY;
if (!API_KEY) {
  console.error("streamo-mcp: RELAY_API_KEY is required");
  process.exit(1);
}

async function api(path, init = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`relay ${res.status}: ${body || res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function jsonResult(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

const server = new McpServer({ name: "streamo", version: "0.1.0" });

server.tool(
  "list_cameras",
  "List every registered camera across all edges, with edge name and online status. Use the camera id with start_session to view one.",
  {},
  async () => {
    const { edges } = await api("/v1/edges");
    const cameras = [];
    for (const e of edges) {
      const { cameras: cams } = await api(`/v1/edges/${e.id}/cameras`);
      for (const c of cams) {
        cameras.push({
          camera_id: c.id,
          name: c.name,
          edge: e.name,
          edge_online: e.online,
        });
      }
    }
    return jsonResult({ cameras });
  },
);

server.tool(
  "start_session",
  "Start a live viewing session for a camera. Returns the session id (use with get_frame / stop_session) and a viewer_url a human can open. The camera's edge must be online. Streams cost money while running — stop_session when done.",
  {
    camera_id: z.string().describe("Camera UUID from list_cameras"),
    ttl_seconds: z.number().int().min(60).max(3600).optional()
      .describe("Auto-expire after this many seconds (default 600)"),
    record: z.boolean().optional()
      .describe("Keep the recording as a clip after the session ends"),
  },
  async ({ camera_id, ttl_seconds, record }) => {
    const session = await api("/v1/sessions", {
      method: "POST",
      body: JSON.stringify({ camera_id, ttl_seconds: ttl_seconds ?? 600, record: record ?? false }),
    });
    return jsonResult({
      session_id: session.id,
      status: session.status,
      viewer_url: session.viewer_url,
      viewer_page: `${API_URL}/viewer/?session=${session.id}&token=${session.viewer_token}`,
      expires_at: session.expires_at,
      note: "The stream takes ~20-60s to produce its first frames. get_frame will report 'not available yet' until then.",
    });
  },
);

server.tool(
  "get_frame",
  "Grab the current frame from a live session as a JPEG image you can see. Call start_session first; frames become available ~20-60s after the session starts.",
  {
    session_id: z.string().describe("Session UUID from start_session"),
    height: z.number().int().min(90).max(2160).optional()
      .describe("Frame height in pixels (default source resolution)"),
  },
  async ({ session_id, height }) => {
    const qs = height ? `?height=${height}` : "";
    const res = await fetch(`${API_URL}/v1/sessions/${session_id}/frame.jpg${qs}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return jsonResult({ error: `frame unavailable (${res.status}): ${body}` });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      content: [{ type: "image", data: buf.toString("base64"), mimeType: "image/jpeg" }],
    };
  },
);

server.tool(
  "stop_session",
  "End a live session immediately (stops the stream and billing).",
  { session_id: z.string().describe("Session UUID") },
  async ({ session_id }) => {
    await api(`/v1/sessions/${session_id}`, { method: "DELETE" });
    return jsonResult({ stopped: session_id });
  },
);

server.tool(
  "list_sessions",
  "List recent viewer sessions (latest 100), optionally filtered by status.",
  {
    status: z.enum(["pending", "live", "ended", "expired"]).optional(),
  },
  async ({ status }) => {
    const qs = status ? `?status=${status}` : "";
    return jsonResult(await api(`/v1/sessions${qs}`));
  },
);

server.tool(
  "list_clips",
  "List stored video clips (assets), optionally filtered by camera. Use get_clip for playback/download URLs.",
  {
    camera_id: z.string().optional().describe("Filter to one camera"),
    limit: z.number().int().min(1).max(200).optional(),
  },
  async ({ camera_id, limit }) => {
    const params = new URLSearchParams();
    if (camera_id) params.set("camera_id", camera_id);
    if (limit) params.set("limit", String(limit));
    const qs = params.size ? `?${params}` : "";
    return jsonResult(await api(`/v1/assets${qs}`));
  },
);

server.tool(
  "get_clip",
  "Get one stored clip's metadata plus fresh playback and download URLs.",
  { asset_id: z.string().describe("Asset UUID from list_clips") },
  async ({ asset_id }) => jsonResult(await api(`/v1/assets/${asset_id}`)),
);

const transport = new StdioServerTransport();
await server.connect(transport);
