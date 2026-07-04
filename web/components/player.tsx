"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

type PlayerProps = {
  /** HLS manifest URL returned by /v1/sessions. */
  src: string;
  /** Called every ~10s so relay-api extends the session TTL. */
  onHeartbeat?: () => void;
  /** Called when the tab is closing so the session can be stopped. */
  onLeave?: () => void;
};

export function Player({ src, onHeartbeat, onLeave }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  const [message, setMessage] = useState("connecting…");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Streams take time to warm up (CF can need 30-60s to publish the first
    // manifest; MediaMTX a few seconds) and hls.js reports the interim
    // 204/404/empty responses as FATAL errors. Tear down and retry for up to
    // ~2 minutes instead of dying during normal startup.
    let hls: Hls | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let disposed = false;

    function play() {
      if (disposed) return;
      hls = new Hls({
        liveDurationInfinity: true,
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 3000,
        levelLoadingMaxRetry: 8,
        fragLoadingMaxRetry: 8,
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus("playing");
        setMessage("live");
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) {
          if (data.details === "manifestLoadError") setMessage("waiting for the stream to start…");
          return;
        }
        hls?.destroy();
        if (attempts++ < 40) {
          setMessage(`waiting for the stream to start… (${attempts})`);
          retryTimer = setTimeout(play, 3000);
        } else {
          setStatus("error");
          setMessage(`${data.type}/${data.details}`);
        }
      });
      hls.loadSource(src);
      if (video) hls.attachMedia(video);
    }

    if (Hls.isSupported()) {
      play();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("playing", () => {
        setStatus("playing");
        setMessage("live");
      });
    } else {
      setStatus("error");
      setMessage("this browser doesn't support HLS");
    }

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      hls?.destroy();
    };
  }, [src]);

  useEffect(() => {
    if (!onHeartbeat) return;
    onHeartbeat();
    const id = setInterval(onHeartbeat, 10000);
    return () => clearInterval(id);
  }, [onHeartbeat]);

  useEffect(() => {
    if (!onLeave) return;
    const handler = () => onLeave();
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [onLeave]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video ref={videoRef} controls autoPlay muted playsInline className="w-full h-full" />
      <div className="absolute top-3 left-3 flex items-center gap-2 rounded-md bg-black/70 px-2 py-1 text-xs text-white">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === "playing" ? "bg-red-500 animate-pulse" : status === "error" ? "bg-red-700" : "bg-yellow-500"
          }`}
        />
        {message}
      </div>
    </div>
  );
}
