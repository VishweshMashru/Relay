"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Settings } from "@/lib/dashboard-data";

const PROVIDER_INFO: Record<string, { title: string; body: string; cost: string }> = {
  cloudflare: {
    title: "Cloudflare Stream",
    body: "Global CDN delivery, signed playback URLs, recordings (record:true). Best for many viewers, worldwide audiences, and keeping footage.",
    cost: "Usage-billed: ~$1 per 1,000 minutes watched, storage per recorded minute.",
  },
  selfhosted: {
    title: "Self-hosted (MediaMTX)",
    body: "Streams relay through your own server. Lower latency, no per-minute fees — but no recordings, no signed URLs, and every viewer pulls from your box.",
    cost: "Flat cost: your server + bandwidth. Best for heavy internal monitoring.",
  },
};

export function ProviderPicker({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [selected, setSelected] = useState(settings.stream_provider);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stream_provider: selected }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {settings.available_providers.map((p) => {
        const info = PROVIDER_INFO[p.name] ?? { title: p.name, body: "", cost: "" };
        const active = selected === p.name;
        return (
          <button
            key={p.name}
            onClick={() => setSelected(p.name)}
            className={`text-left rounded-xl border p-5 flex flex-col gap-2 transition-colors ${
              active
                ? "border-emerald-500/70 bg-emerald-50/40 dark:bg-emerald-950/20"
                : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{info.title}</span>
              <span className="flex items-center gap-2">
                {settings.stream_provider === p.name && (
                  <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400">current</span>
                )}
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    active ? "border-emerald-500 bg-emerald-500" : "border-neutral-300 dark:border-neutral-600"
                  }`}
                >
                  {active && <Check className="w-3 h-3 text-white" />}
                </span>
              </span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{info.body}</p>
            <p className="text-xs text-neutral-500">{info.cost}</p>
            {!p.supports_recordings && (
              <p className="text-xs text-amber-600 dark:text-amber-400">record:true sessions are rejected on this provider</p>
            )}
          </button>
        );
      })}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy || selected === settings.stream_provider}
          className="h-10 px-5 rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved — applies to new sessions</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
      <p className="text-xs text-neutral-500">
        Switching is safe with streams running: live sessions finish on the provider they started on;
        only new sessions use the new one.
      </p>
    </div>
  );
}
