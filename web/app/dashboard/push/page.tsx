"use client";

// Zero-install trial: create a push session and stream to it from OBS or a
// phone RTMP app — no edge agent, no camera registration, no terminal.
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Copy, Radio, Square } from "lucide-react";
import { Player } from "@/components/player";
import { Badge, PageHeader, PrimaryButton } from "../_ui";

type PushSession = {
  id: string;
  viewer_url: string;
  push_url: string;
  provider: string;
  expires_at: string;
};

export default function PushTrial() {
  const router = useRouter();
  const [session, setSession] = useState<PushSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingest: "push", name: "dashboard-trial", ttl_seconds: 1800 }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setSession(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const heartbeat = useCallback(() => {
    if (!session) return;
    fetch(`/api/dashboard/sessions/${session.id}/heartbeat`, { method: "POST" }).catch(() => {});
  }, [session]);

  async function end() {
    if (!session) return;
    await fetch(`/api/dashboard/sessions/${session.id}`, { method: "DELETE" }).catch(() => {});
    setSession(null);
    router.refresh();
  }

  // OBS wants server and key separately; phone apps take the full URL.
  const lastSlash = session?.push_url.lastIndexOf("/") ?? -1;
  const obsServer = session && lastSlash > 0 ? session.push_url.slice(0, lastSlash) : "";
  const obsKey = session && lastSlash > 0 ? session.push_url.slice(lastSlash + 1) : "";

  return (
    <div className="p-8 flex flex-col gap-6 max-w-4xl">
      <Link
        href="/dashboard/sessions"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50 self-start"
      >
        <ChevronLeft className="w-4 h-4" />
        Sessions
      </Link>

      <PageHeader
        title="Push a stream"
        subtitle="Try streamo with no camera, agent, or terminal — stream from OBS or a phone app straight to a URL."
      />

      {!session ? (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col items-start gap-4 max-w-xl">
          <span className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </span>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            This creates a live session with a private ingest URL. Point any encoder at it —
            OBS, Larix or another phone RTMP app, a drone controller, ffmpeg — and watch it
            play back here. The session ends when you click End (or after 30 minutes).
          </p>
          <PrimaryButton onClick={start} disabled={busy}>
            {busy ? "Creating…" : "Create push stream"}
          </PrimaryButton>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CopyField label="Full URL — phone apps (Larix, RTMP Camera), ffmpeg" value={session.push_url} />
            <div className="flex flex-col gap-3">
              <CopyField label="OBS → Settings → Stream → Server" value={obsServer} />
              <CopyField label="OBS → Stream Key" value={obsKey} />
            </div>
          </div>

          <Player src={session.viewer_url} onHeartbeat={heartbeat} />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <Badge tone="neutral">{session.provider}</Badge>
              <span className="font-mono">{session.id}</span>
              <span>playback starts ~10–60s after your encoder connects</span>
            </div>
            <button
              onClick={end}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Square className="w-3 h-3" />
              End stream
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col gap-1.5">
      <span className="text-[11px] text-neutral-500">{label}</span>
      <div className="flex items-center gap-2">
        <code className="font-mono text-xs break-all flex-1 select-all">{value}</code>
        <button
          onClick={copy}
          className="shrink-0 h-7 px-2.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-[11px] font-medium inline-flex items-center gap-1"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
