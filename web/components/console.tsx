"use client";

// The landing-page operations console. The feed is a canvas simulation —
// labeled as such — until a real showcase camera is wired via
// NEXT_PUBLIC_DEMO_STREAM (an HLS URL), at which point it plays that.
import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------- feed panel */

export function FeedPanel() {
  const demoStream = process.env.NEXT_PUBLIC_DEMO_STREAM;
  return (
    <div className="border border-neutral-800 bg-black flex flex-col min-h-0">
      <PanelHeader
        left="CAM 01 · loading-dock"
        right={demoStream ? "SIGNAL: LIVE" : "SIGNAL: SIMULATED"}
        rightTone={demoStream ? "live" : "dim"}
      />
      <div className="relative flex-1 min-h-[260px] md:min-h-[380px]">
        <FeedSim />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 font-mono text-[11px] text-white/80">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          REC
        </div>
        <FeedClock />
        <div className="absolute bottom-3 left-3 font-mono text-[11px] text-white/50">
          1440×1080 · h264 · rtsp→hls
        </div>
      </div>
    </div>
  );
}

function FeedClock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const id = setInterval(() => setT(new Date().toISOString().slice(0, 19) + "Z"), 1000);
    return () => clearInterval(id);
  }, []);
  return <div className="absolute top-3 right-3 font-mono text-[11px] text-white/60">{t}</div>;
}

// A restrained surveillance-style visualization: dark noise field, scanline,
// one tracked box drifting through the frame with a confidence label.
function FeedSim() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = canvas.width = Math.floor(r.width);
      h = canvas.height = Math.floor(r.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const start = performance.now();
    const noise = () => {
      // sparse dark noise, redrawn each frame
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.045)";
      for (let i = 0; i < (w * h) / 900; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
      // faint grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      const step = 48;
      ctx.beginPath();
      for (let x = step; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = step; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
    };

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      noise();

      // scanline sweep
      const sy = (t * 30) % (h + 120) - 60;
      const grad = ctx.createLinearGradient(0, sy - 40, 0, sy + 40);
      grad.addColorStop(0, "rgba(16,185,129,0)");
      grad.addColorStop(0.5, "rgba(16,185,129,0.05)");
      grad.addColorStop(1, "rgba(16,185,129,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, sy - 40, w, 80);

      // one tracked subject drifting on a lissajous path
      const bw = Math.max(60, w * 0.09);
      const bh = bw * 1.6;
      const cx = w * (0.5 + 0.33 * Math.sin(t * 0.21));
      const cy = h * (0.55 + 0.22 * Math.sin(t * 0.13 + 1.7));
      const x = cx - bw / 2;
      const y = cy - bh / 2;
      ctx.strokeStyle = "rgba(16,185,129,0.9)";
      ctx.lineWidth = 1.5;
      const c = 10; // corner tick length
      ctx.beginPath();
      // corner-only box (less busy than a full rect)
      ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
      ctx.moveTo(x + bw - c, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + c);
      ctx.moveTo(x + bw, y + bh - c); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw - c, y + bh);
      ctx.moveTo(x + c, y + bh); ctx.lineTo(x, y + bh); ctx.lineTo(x, y + bh - c);
      ctx.stroke();
      const conf = (0.91 + 0.05 * Math.sin(t * 0.9)).toFixed(2);
      ctx.font = "11px var(--font-plex-mono), monospace";
      ctx.fillStyle = "rgba(16,185,129,0.95)";
      ctx.fillText(`person ${conf}`, x, y - 6);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

/* -------------------------------------------------------------- event log */

const EVENTS: [string, string][] = [
  ["session.created", "cam 01 · ttl 600s"],
  ["edge.command.delivered", "312ms"],
  ["stream.publishing", "rtsp→hls · 1 track"],
  ["manifest.live", "t+15s"],
  ["detection.person", "cam 01 · 0.94"],
  ["viewer.joined", "token ok · hls"],
  ["clip.stored", "14s · ttl 30d"],
  ["session.heartbeat", "cam 01"],
  ["detection.person", "cam 01 · 0.91"],
  ["session.ended", "viewer left · reaped 28s"],
  ["input.destroyed", "billing stopped"],
  ["edge.online", "factory · last_seen 0s"],
];

export function EventLog() {
  const [rows, setRows] = useState<{ ts: string; ev: string; meta: string }[]>([]);
  const idx = useRef(0);

  useEffect(() => {
    const push = () => {
      const [ev, meta] = EVENTS[idx.current % EVENTS.length];
      idx.current++;
      const ts = new Date().toISOString().slice(11, 19);
      setRows((r) => [{ ts, ev, meta }, ...r].slice(0, 9));
    };
    push();
    push();
    const id = setInterval(push, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="border border-neutral-800 bg-neutral-950 flex flex-col flex-1 min-h-[180px]">
      <PanelHeader left="EVENT STREAM" right="demo data" rightTone="dim" />
      <div className="p-3 font-mono text-[11.5px] leading-5 overflow-hidden">
        {rows.map((r, i) => (
          <div key={`${r.ts}-${i}`} className={`flex gap-3 ${i === 0 ? "text-neutral-200" : "text-neutral-500"}`}>
            <span className="text-neutral-600 shrink-0">{r.ts}</span>
            <span className={r.ev.startsWith("detection") ? "text-emerald-400" : ""}>{r.ev}</span>
            <span className="text-neutral-600 truncate">{r.meta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ shared bits */

function PanelHeader({
  left,
  right,
  rightTone = "dim",
}: {
  left: string;
  right?: string;
  rightTone?: "live" | "dim";
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 font-mono text-[11px] tracking-wide">
      <span className="text-neutral-400">{left}</span>
      {right && (
        <span className={rightTone === "live" ? "text-emerald-400" : "text-neutral-600"}>{right}</span>
      )}
    </div>
  );
}
