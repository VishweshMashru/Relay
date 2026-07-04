// Server-only data helpers for dashboard pages. Each call runs as the
// signed-in user (their own project key) — see lib/user-key.ts.
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NotOnboardedError, relayFetchAs } from "./user-key";

export type EdgeRow = {
  id: string;
  name: string;
  hostname: string;
  last_seen_at: string | null;
  created_at: string;
  camera_count: number;
  online: boolean;
};

export type CameraRow = { id: string; name: string; created_at: string };

export type SessionRow = {
  id: string;
  camera_id: string;
  camera_name: string;
  edge_name: string;
  ingest: "edge" | "push";
  status: "pending" | "live" | "ended" | "expired";
  protocol: string;
  provider: string;
  started_at: string;
  last_heartbeat_at: string;
  expires_at: string;
};

export type AssetRow = {
  id: string;
  camera_id?: string;
  session_id?: string;
  name?: string;
  source: "s3" | "cloudflare";
  content_type: string;
  size_bytes: number;
  status: "pending" | "ready";
  expires_at: string | null;
  created_at: string;
  playback_url?: string;
  download_url?: string;
};

export type Settings = {
  stream_provider: string;
  supports_recordings: boolean;
  available_providers: { name: string; supports_recordings: boolean }[];
};

export type Usage = {
  viewer_minutes_30d: number;
  clip_count: number;
  clip_bytes: number;
};

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export type KeyRow = {
  id: string;
  prefix: string;
  label: string;
  last_used_at: string | null;
  created_at: string;
};

export async function dashFetch<T>(path: string): Promise<T> {
  const { userId } = await auth();
  if (!userId) redirect("/");
  let res: Response;
  try {
    res = await relayFetchAs(userId, path);
  } catch (e) {
    if (e instanceof NotOnboardedError) redirect("/welcome");
    throw e;
  }
  if (!res.ok) throw new Error(`relay ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const abs = Math.abs(s);
  let span: string;
  if (abs < 60) span = "";
  else if (abs < 3600) span = `${Math.floor(abs / 60)}m`;
  else if (abs < 86400) span = `${Math.floor(abs / 3600)}h`;
  else span = `${Math.floor(abs / 86400)}d`;
  if (!span) return s >= 0 ? "just now" : "in <1m";
  return s >= 0 ? `${span} ago` : `in ${span}`;
}
