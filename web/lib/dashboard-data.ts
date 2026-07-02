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
  status: "pending" | "live" | "ended" | "expired";
  protocol: string;
  started_at: string;
  last_heartbeat_at: string;
  expires_at: string;
};

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
