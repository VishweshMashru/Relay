"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Player } from "@/components/player";

// This is where a real customer app would call `POST /v1/sessions` from a
// server route and pass the returned viewer_url to the Player. For the
// scaffold we simulate the flow — swap in a real fetch when API keys are wired.
export default function Watch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<{ id: string; viewer_url: string; viewer_token: string } | null>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startSession() {
      try {
        const res = await fetch(`/api/showcase/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ camera_id: id }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`session ${res.status}: ${body || res.statusText}`);
        }
        const data = (await res.json()) as { id: string; viewer_url: string; viewer_token: string };
        if (!cancelled) {
          setSession(data);
          setStatus("ready");
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setStatus("error");
        }
      }
    }

    void startSession();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const heartbeat = useCallback(async () => {
    if (!session) return;
    await fetch(`/api/showcase/sessions/${session.id}/heartbeat?token=${session.viewer_token}`, {
      method: "POST",
    }).catch(() => {});
  }, [session]);

  const leave = useCallback(() => {
    if (!session) return;
    // sendBeacon can only POST, which the API doesn't route — keepalive lets
    // a real DELETE outlive the unloading page.
    fetch(`/api/showcase/sessions/${session.id}?token=${session.viewer_token}`, {
      method: "DELETE",
      keepalive: true,
    }).catch(() => {});
  }, [session]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-4">
      <Link
        href="/showcase"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
      >
        <ChevronLeft className="w-4 h-4" />
        All cameras
      </Link>

      <div>
        <h1 className="text-xl font-medium capitalize">{id.replace(/^demo-/, "").replace(/-/g, " ")}</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          {status === "starting" && "starting session…"}
          {status === "ready" && "live"}
          {status === "error" && (error ?? "failed to start session")}
        </p>
      </div>

      {status === "ready" && session ? (
        <Player src={session.viewer_url} onHeartbeat={heartbeat} onLeave={leave} />
      ) : (
        <div className="w-full aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-lg flex items-center justify-center text-sm text-neutral-500">
          {status === "starting" ? "connecting to Relay…" : (error ?? "no stream")}
        </div>
      )}
    </div>
  );
}
