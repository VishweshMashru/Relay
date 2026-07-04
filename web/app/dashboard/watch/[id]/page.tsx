"use client";

// Live view for one camera. Creates a session on mount (through the
// authenticated dashboard proxy — no keys in the browser), heartbeats while
// watching, and ends the session on Stop/leave so nothing keeps billing.
import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Square } from "lucide-react";
import { Player } from "@/components/player";
import { Badge } from "../../_ui";

type Session = {
  id: string;
  viewer_url: string;
  provider: string;
  record: boolean;
  expires_at: string;
};

export default function Watch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "stopped" | "error">("starting");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // dev strict-mode double-mount guard
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ camera_id: id, ttl_seconds: 1800 }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
        setSession(await res.json());
        setStatus("ready");
      } catch (e) {
        setError((e as Error).message);
        setStatus("error");
      }
    })();
  }, [id]);

  const heartbeat = useCallback(() => {
    if (!session) return;
    fetch(`/api/dashboard/sessions/${session.id}/heartbeat`, { method: "POST" }).catch(() => {});
  }, [session]);

  const stop = useCallback(
    (navigate: boolean) => {
      if (session) {
        fetch(`/api/dashboard/sessions/${session.id}`, { method: "DELETE", keepalive: true }).catch(() => {});
      }
      setStatus("stopped");
      if (navigate) router.push("/dashboard/cameras");
    },
    [session, router],
  );

  return (
    <div className="p-8 flex flex-col gap-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/cameras"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Cameras
        </Link>
        {status === "ready" && (
          <button
            onClick={() => stop(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <Square className="w-3 h-3" />
            Stop session
          </button>
        )}
      </div>

      {status === "ready" && session ? (
        <>
          <Player src={session.viewer_url} onHeartbeat={heartbeat} onLeave={() => stop(false)} />
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <Badge tone="neutral">{session.provider}</Badge>
            <span className="font-mono">{session.id}</span>
            <span>ends when you leave, or at TTL</span>
          </div>
        </>
      ) : (
        <div className="w-full aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-lg flex items-center justify-center text-sm text-neutral-500">
          {status === "starting" && "starting session…"}
          {status === "stopped" && "session stopped"}
          {status === "error" && (error ?? "failed to start session")}
        </div>
      )}
    </div>
  );
}
