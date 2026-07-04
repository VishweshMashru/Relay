"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, PlayCircle, Trash2, X } from "lucide-react";
import Hls from "hls.js";

// Play/download need fresh signed URLs, so we fetch the single asset on
// demand rather than presigning the whole list.
export function ClipActions({ id, ready }: { id: string; ready: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [playback, setPlayback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchAsset() {
    const res = await fetch(`/api/dashboard/assets/${id}`);
    if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
    return res.json() as Promise<{ playback_url?: string; download_url?: string }>;
  }

  async function play() {
    setBusy("play");
    setError(null);
    try {
      const a = await fetchAsset();
      if (!a.playback_url) throw new Error("not ready yet — try again shortly");
      setPlayback(a.playback_url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    setBusy("dl");
    setError(null);
    try {
      const a = await fetchAsset();
      if (!a.download_url) throw new Error("download still being prepared — try again shortly");
      window.open(a.download_url, "_blank");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Delete this clip permanently?")) return;
    setBusy("rm");
    try {
      const res = await fetch(`/api/dashboard/assets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-3">
        <button
          onClick={play}
          disabled={!ready || busy !== null}
          className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50 disabled:opacity-40"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          {busy === "play" ? "loading…" : "play"}
        </button>
        <button
          onClick={download}
          disabled={!ready || busy !== null}
          className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50 disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          {busy === "dl" ? "…" : "download"}
        </button>
        <button
          onClick={remove}
          disabled={busy !== null}
          className="inline-flex items-center gap-1 text-xs text-red-500/80 hover:text-red-500 disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {busy === "rm" ? "…" : "delete"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {playback && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setPlayback(null)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setPlayback(null)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Recordings play HLS; uploaded clips are direct MP4s. */}
            <ClipVideo src={playback} />
          </div>
        </div>
      )}
    </div>
  );
}

function ClipVideo({ src }: { src: string }) {
  const isHLS = src.includes(".m3u8");
  if (!isHLS) {
    return <video src={src} controls autoPlay playsInline className="w-full rounded-lg bg-black" />;
  }
  return <HLSVideo src={src} />;
}

function HLSVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }
    const hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(video);
    return () => hls.destroy();
  }, [src]);
  return <video ref={ref} controls autoPlay playsInline className="w-full rounded-lg bg-black" />;
}
