// Server-only. Never import this from a client component — it holds API keys.

const API_URL = process.env.RELAY_API_URL ?? "http://localhost:8080";

export type Project = { id: string; name: string; created_at: string };
export type Edge = { id: string; project_id: string; name: string; hostname: string };
export type Camera = { id: string; name: string; created_at: string };
export type Session = {
  id: string;
  camera_id: string;
  status: "pending" | "live" | "ended" | "expired";
  protocol: "hls" | "webrtc";
  viewer_url?: string;
  started_at: string;
  last_heartbeat_at: string;
  expires_at: string;
};

class RelayClient {
  constructor(private apiKey: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`relay ${res.status}: ${body || res.statusText}`);
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  provisionEdge(name: string, hostname?: string) {
    return this.request<{ edge_id: string; edge_token: string }>("/v1/edges", {
      method: "POST",
      body: JSON.stringify({ name, hostname }),
    });
  }

  createCamera(edgeId: string, name: string) {
    return this.request<Camera & { edge_id: string }>(`/v1/edges/${edgeId}/cameras`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  listCameras(edgeId: string) {
    return this.request<{ cameras: Camera[] }>(`/v1/edges/${edgeId}/cameras`);
  }

  createSession(cameraId: string, ttlSeconds = 600) {
    return this.request<Session>("/v1/sessions", {
      method: "POST",
      body: JSON.stringify({ camera_id: cameraId, ttl_seconds: ttlSeconds, protocol: "hls" }),
    });
  }

  getSession(id: string) {
    return this.request<Session>(`/v1/sessions/${id}`);
  }

  deleteSession(id: string) {
    return this.request<void>(`/v1/sessions/${id}`, { method: "DELETE" });
  }
}

// Bootstrap client — uses the admin API key. Used by the dashboard for
// account-level actions (creating a user's first project). Never expose the
// underlying key to the client.
export function adminClient() {
  const key = process.env.RELAY_ADMIN_KEY;
  if (!key) throw new Error("RELAY_ADMIN_KEY not set");
  return new RelayClient(key);
}

// User client — uses a specific project's API key. This is what most
// dashboard actions should use.
export function userClient(apiKey: string) {
  return new RelayClient(apiKey);
}
