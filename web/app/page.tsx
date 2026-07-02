import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import {
  Camera, Zap, Shield, Globe, Cpu, Radio, ArrowRight, Server, PlayCircle,
  Lock, Eye, KeyRound, Fingerprint, Cloud, Check, Film, Download, Database, Timer,
} from "lucide-react";

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Nav />
      <Hero />
      <Primitives />
      <Features />
      <HowItWorks />
      <CodeExample />
      <Security />
      <UseCases />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur bg-white/70 dark:bg-neutral-950/70 border-b border-neutral-200/60 dark:border-neutral-800/60">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-mono font-semibold text-lg">
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-white" />
          </span>
          streamo
        </Link>
        <div className="flex items-center gap-1 md:gap-3">
          <a href="#primitives" className="hidden md:inline text-sm px-3 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
            Product
          </a>
          <a href="#how" className="hidden md:inline text-sm px-3 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
            How it works
          </a>
          <a href="#pricing" className="hidden md:inline text-sm px-3 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
            Pricing
          </a>
          <a href="#faq" className="hidden md:inline text-sm px-3 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
            FAQ
          </a>
          <Link href="/showcase" className="text-sm px-3 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
            Showcase
          </Link>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-sm rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="text-sm rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 px-3 py-1.5 hover:opacity-90">
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="text-sm rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 px-3 py-1.5">
              Dashboard
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-neutral-950 text-neutral-100">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 75% 20%, rgba(16,185,129,0.14), transparent 65%), radial-gradient(ellipse 40% 40% at 10% 90%, rgba(16,185,129,0.06), transparent 60%)",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <div className="flex flex-col gap-7">
          <span className="inline-flex self-start items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Now in beta — free while we build with you
          </span>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.04]">
            The video layer
            <br />
            for your app.
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 max-w-xl leading-relaxed">
            Live-stream any camera — even behind NAT and firewalls — and store, fetch, and
            share clips. Two primitives, one API key. No RTMP servers, no ffmpeg, no
            presigned-URL plumbing.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <button className="h-12 px-6 rounded-md bg-emerald-500 text-neutral-950 text-base font-medium hover:bg-emerald-400 inline-flex items-center justify-center gap-1.5">
                  Get an API key
                  <ArrowRight className="w-4 h-4" />
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className="h-12 px-6 rounded-md bg-emerald-500 text-neutral-950 text-base font-medium hover:bg-emerald-400 inline-flex items-center justify-center gap-1.5">
                Open dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Show>
            <Link href="/showcase" className="h-12 px-6 rounded-md border border-neutral-700 text-base font-medium inline-flex items-center justify-center hover:bg-neutral-900">
              See it live
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-500">
            <TickerItem>Live HLS in two calls</TickerItem>
            <TickerItem>Clips with retention TTLs</TickerItem>
            <TickerItem>Outbound HTTPS only</TickerItem>
            <TickerItem>Signed playback</TickerItem>
          </div>
        </div>
        <HeroMock />
      </div>
    </section>
  );
}

function TickerItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1 h-1 rounded-full bg-emerald-500/70" />
      {children}
    </span>
  );
}

function HeroMock() {
  return (
    <div className="relative flex flex-col gap-4">
      {/* API call */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 backdrop-blur overflow-hidden shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800">
          <span className="text-[11px] font-mono text-neutral-400">POST /v1/sessions</span>
          <span className="text-[11px] font-mono text-emerald-400">200 OK · 312ms</span>
        </div>
        <pre className="p-4 text-[12.5px] leading-6 font-mono text-neutral-300 overflow-x-auto">
{`{
  "id": "0f6b…",
  "status": "pending",`}
          {"\n"}
          <span className="text-emerald-400">{`  "viewer_url": "https://…/manifest/video.m3u8",`}</span>
          {"\n"}
          <span className="text-emerald-400">{`  "viewer_token": "eyJhbGciOi…",`}</span>
          {`
  "expires_at": "…T14:32:09Z"
}`}
        </pre>
      </div>

      {/* Player */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden shadow-2xl shadow-black/40">
        <div className="aspect-video relative bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 flex items-center justify-center">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(16,185,129,0.15), transparent 70%)",
            }}
          />
          <PlayCircle className="w-12 h-12 text-neutral-600" />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded bg-black/60 px-2 py-0.5 text-[11px] font-mono text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
          <span className="absolute bottom-3 left-3 text-[11px] font-mono text-neutral-400">
            loading-dock · factory-a
          </span>
        </div>
      </div>

      {/* Clip row */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3 flex items-center gap-3">
        <span className="w-8 h-8 rounded-md bg-neutral-800 flex items-center justify-center shrink-0">
          <Film className="w-4 h-4 text-emerald-400" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-neutral-300 truncate">intrusion-2031.mp4 · 14s · ready</div>
          <div className="text-[11px] text-neutral-500">clip stored · expires in 30d</div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-400 border border-neutral-700 rounded px-2 py-1">
          <Download className="w-3 h-3" />
          download_url
        </span>
      </div>
    </div>
  );
}

function Primitives() {
  return (
    <section id="primitives" className="max-w-6xl mx-auto px-6 py-24">
      <div className="flex flex-col items-center text-center gap-4 mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">Primitives</span>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight max-w-2xl">
          Two primitives cover most of video.
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-xl mt-2">
          Live when someone needs to see it now. Clips when something happened and you need
          to keep it, show it, or send it. Same key, same project, same API.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col gap-5 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </span>
            <div>
              <div className="text-lg font-medium">Live sessions</div>
              <div className="text-xs text-neutral-500">on-demand streaming from private networks</div>
            </div>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Mint a session and the edge agent opens the camera's RTSP feed, pushes it to the
            global CDN, and hands your viewer a tokenized HLS URL. No agent? Push directly —
            a drone controller or OBS streams RTMPS to the returned URL, or WHIP for
            sub-second WebRTC. Streams stop when viewers leave; unwatched cameras cost nothing.
          </p>
          <div className="flex flex-col gap-1.5 font-mono text-xs text-neutral-600 dark:text-neutral-400">
            <EndpointRow method="POST" path="/v1/sessions" note="→ viewer_url · push_url · webrtc" />
            <EndpointRow method="GET" path="/v1/sessions/:id/frame.jpg" note="current frame — for AI agents" />
            <EndpointRow method="DELETE" path="/v1/sessions/:id" note="end early; heartbeats auto-reap" />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col gap-5 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </span>
            <div>
              <div className="text-lg font-medium">Clips</div>
              <div className="text-xs text-neutral-500">store, fetch, share, expire</div>
            </div>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Upload event clips straight from the edge to storage — bytes never transit our
            API. Fetch playback and download URLs on demand, link clips to cameras and
            sessions, and set a retention TTL so old footage deletes itself.
          </p>
          <div className="flex flex-col gap-1.5 font-mono text-xs text-neutral-600 dark:text-neutral-400">
            <EndpointRow method="POST" path="/v1/assets" note="→ presigned upload_url" />
            <EndpointRow method="GET" path="/v1/assets/:id" note="→ playback_url + download_url" />
            <EndpointRow method="GET" path="/v1/assets?camera_id=" note="list, filter, paginate" />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-500">
        <span className="text-xs font-mono uppercase tracking-widest">On the roadmap</span>
        <span className="inline-flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Record-from-live</span>
        <span className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> WebRTC for edge ingest</span>
        <span className="inline-flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> Event webhooks</span>
      </div>
    </section>
  );
}

function EndpointRow({ method, path, note }: { method: string; path: string; note: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-neutral-50 dark:bg-neutral-900 px-3 py-2 overflow-x-auto whitespace-nowrap">
      <span className={method === "GET" ? "text-sky-600 dark:text-sky-400" : method === "DELETE" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}>
        {method}
      </span>
      <span className="text-neutral-800 dark:text-neutral-200">{path}</span>
      <span className="text-neutral-400 dark:text-neutral-500">{note}</span>
    </div>
  );
}

function Features() {
  const features = [
    { icon: Shield, title: "No public IP required", body: "Your camera stays on its LAN. The edge agent connects out via HTTPS — nothing to expose, nothing to forward, nothing to firewall." },
    { icon: Zap, title: "On-demand, pay-per-minute", body: "Streams start when a viewer asks and stop the moment they leave. Idle cameras cost you nothing." },
    { icon: Camera, title: "Any camera, any DVR", body: "Hikvision, Dahua, Reolink, iPhone RTSP apps, drones, IP cams. If it speaks RTSP, the agent ingests it — H.265 included." },
    { icon: Globe, title: "Global edge delivery", body: "Viewers pull from Cloudflare's 300+ point CDN, not from your camera's uplink. One stream in, any number of viewers out." },
    { icon: Database, title: "Storage you control", body: "Clips live in S3-compatible storage with per-asset retention TTLs. Keep evidence forever, let routine footage expire." },
    { icon: Radio, title: "One binary, any platform", body: "Edge agent cross-compiles to Windows, Linux, macOS, ARM. One-line installer registers it as a service. It just works." },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col items-center text-center gap-4 mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">Why streamo</span>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight max-w-2xl">
          The stuff you'd rather not build yourself.
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-3 hover:border-emerald-500/50 transition-colors bg-white dark:bg-neutral-950">
              <span className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </span>
              <div className="font-medium">{f.title}</div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{f.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: Server,
      title: "Install the agent",
      body: "One command on any machine that can reach your camera on its LAN. Runs as a background service, outbound HTTPS only, self-heals on camera drops.",
      example: "curl -fsSL https://streamo.in/install.sh | sh",
    },
    {
      n: "02",
      icon: Camera,
      title: "Register cameras",
      body: "Register each camera via API or dashboard. RTSP URLs and passwords stay on the edge — they never travel to Streamo's cloud.",
      example: "POST /v1/edges/{id}/cameras",
    },
    {
      n: "03",
      icon: PlayCircle,
      title: "Stream & store",
      body: "Mint a live session, or push a clip to storage. Embed the returned URL — playback is tokenized and dies with the session.",
      example: "POST /v1/sessions → { viewer_url }",
    },
  ];
  return (
    <section id="how" className="max-w-6xl mx-auto px-6 py-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col items-center text-center gap-4 mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">How it works</span>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight max-w-2xl">
          Three steps from private camera to production video.
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-xl mt-2">
          No RTMP servers, no NAT holepunching, no CDN config. You call the API. We handle
          the rest.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.n} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-4 bg-white dark:bg-neutral-950">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-neutral-400">{s.n}</span>
                <span className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="font-medium text-lg">{s.title}</div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{s.body}</p>
              <code className="text-xs font-mono bg-neutral-100 dark:bg-neutral-900 rounded px-2.5 py-2 text-neutral-700 dark:text-neutral-300 overflow-x-auto whitespace-nowrap">
                {s.example}
              </code>
            </div>
          );
        })}
      </div>

      <div className="mt-14 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-8 md:p-12">
        <div className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-4">Architecture</div>
        <pre className="text-xs md:text-sm font-mono text-neutral-700 dark:text-neutral-300 leading-relaxed overflow-x-auto">
{`  CUSTOMER NETWORK                STREAMO CLOUD                  YOUR APP
  ────────────────                ─────────────                  ────────

  ┌────────┐  RTSP   ┌────────┐   HTTPS    ┌───────────┐  REST   ┌─────────┐
  │ Camera ├────────▶│ Edge   ├───────────▶│ Control   │◀────────┤ Backend │
  └────────┘  (LAN)  │ agent  │ (out only) │ plane     │  rk_…   └────┬────┘
                     └──┬──┬──┘            └───────────┘              │
                 live │     │ clips                              embeds URL
                RTMPS ▼     ▼ presigned PUT                           ▼
              ┌───────────┐ ┌──────────────┐   tokenized HLS   ┌─────────┐
              │ Global CDN│ │ Blob storage │──────────────────▶│ Viewer  │
              └───────────┘ │ (R2/S3, TTL) │   signed MP4      └─────────┘
                            └──────────────┘`}
        </pre>
        <p className="mt-4 text-xs text-neutral-500">
          Video never transits the control plane — live goes edge → CDN, clips go edge → storage.
        </p>
      </div>
    </section>
  );
}

function CodeExample() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="flex flex-col gap-5">
          <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">Developer experience</span>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight leading-tight">
            Ship video without becoming a video company.
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
            A clean REST API over the whole mess — RTMP pipelines, ffmpeg flags, NAT
            traversal, CDN config, signed URLs. Create a session, embed the URL, done.
          </p>
          <div className="flex flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Bullet>Project-scoped API keys, hashed at rest, revocable from the dashboard</Bullet>
            <Bullet>Per-session viewer tokens — a leaked link dies with the session</Bullet>
            <Bullet>Clip retention TTLs — footage expires itself</Bullet>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-950 shadow-2xl shadow-neutral-900/10">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-neutral-800 bg-neutral-900">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            <span className="ml-3 text-[11px] font-mono text-neutral-400">backend.ts</span>
          </div>
          <pre className="p-5 text-[13px] leading-6 font-mono text-neutral-200 overflow-x-auto">
            <Code />
          </pre>
        </div>
      </div>
    </section>
  );
}

function Code() {
  return (
    <>
      <span className="text-neutral-500">{`// Go live`}</span>{`\n`}
      <span className="text-purple-300">const</span> session = <span className="text-purple-300">await</span> streamo(<span className="text-orange-300">{'"/v1/sessions"'}</span>, {`{`}{`\n`}
      {`  `}camera_id: <span className="text-orange-300">{'"cam_5f92…"'}</span>, ttl_seconds: <span className="text-orange-300">600</span>,{`\n`}
      {`}`});{`\n`}
      <span className="text-neutral-500">{`// → embed session.viewer_url in your player`}</span>{`\n\n`}
      <span className="text-neutral-500">{`// Keep a clip`}</span>{`\n`}
      <span className="text-purple-300">const</span> clip = <span className="text-purple-300">await</span> streamo(<span className="text-orange-300">{'"/v1/assets"'}</span>, {`{`}{`\n`}
      {`  `}camera_id: <span className="text-orange-300">{'"cam_5f92…"'}</span>, ttl_seconds: <span className="text-orange-300">2592000</span>,{`\n`}
      {`}`});{`\n`}
      <span className="text-neutral-500">{`// → PUT the mp4 to clip.upload_url, then share`}</span>{`\n`}
      <span className="text-neutral-500">{`//   clip.playback_url / clip.download_url`}</span>{`\n`}
    </>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-start gap-2">
      <span className="w-1 h-1 mt-2 rounded-full bg-emerald-500 shrink-0" />
      {children}
    </span>
  );
}

function Security() {
  const items = [
    { icon: Shield, title: "No public IPs, ever", body: "Edge agent is outbound-only. Cameras never touch the internet." },
    { icon: Lock, title: "Credentials stay local", body: "RTSP passwords live on the edge agent in cameras.json. They're never sent to us." },
    { icon: KeyRound, title: "Tokenized playback", body: "Every viewer gets a per-session token, and stream URLs are signed. Sharing after expiry doesn't work." },
    { icon: Fingerprint, title: "Multi-tenant isolation", body: "Every query is scoped to your project. Cross-tenant access is architecturally impossible." },
    { icon: Eye, title: "Revocation that works", body: "Rotate any API key or any single edge's token from the dashboard — without touching the rest of your fleet." },
    { icon: Cloud, title: "Retention by design", body: "Live video isn't stored. Clips keep exactly as long as the TTL you set — then delete themselves." },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col items-center text-center gap-4 mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">Security</span>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight max-w-2xl">
          Built for cameras. Serious about privacy.
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mt-2">
          Every architectural choice here is one you'd make yourself if you were paranoid.
          Because you are handling video. Because your customers are.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.title} className="flex gap-4 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <span className="shrink-0 w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex flex-col gap-1">
                <div className="font-medium">{it.title}</div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{it.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function UseCases() {
  const cases = [
    { label: "AI CCTV & site intelligence", note: "live view + event clips" },
    { label: "Factory monitoring", note: "defect detection feeds" },
    { label: "Construction sites", note: "progress AI, PPE detection" },
    { label: "Retail analytics", note: "person-counting, queue AI" },
    { label: "Warehouse & logistics", note: "pallet tracking, safety" },
    { label: "Smart buildings", note: "occupancy, visitor logs" },
    { label: "Drone livestreams", note: "on-demand ops feeds" },
    { label: "Incident & evidence", note: "clips with retention" },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col items-center text-center gap-4 mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">Built for</span>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight max-w-2xl">
          Every app that turns a camera into signal.
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cases.map((c) => (
          <div key={c.label} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col gap-1">
            <span className="text-sm font-medium">{c.label}</span>
            <span className="text-xs text-neutral-500">{c.note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      cadence: "forever",
      tag: null,
      cta: "Start free",
      href: "#",
      features: [
        "100 viewer-minutes / month",
        "1 GB clip storage",
        "1 edge, unlimited cameras",
        "Community support",
      ],
    },
    {
      name: "Pay-as-you-go",
      price: "$0.005",
      cadence: "per viewer-minute",
      tag: "Most popular",
      cta: "Get an API key",
      href: "#",
      features: [
        "No monthly minimum",
        "Unlimited edges + cameras",
        "Clip storage at $0.02 / GB-month",
        "Signed playback + downloads",
        "Email support",
        "Volume discount at 100K+ min/mo",
      ],
    },
    {
      name: "Enterprise",
      price: "Custom",
      cadence: "let's talk",
      tag: null,
      cta: "Contact sales",
      href: "mailto:hello@streamo.in",
      features: [
        "Dedicated infra + SLA",
        "BYO storage bucket",
        "SSO, SCIM, audit logs",
        "BYO-cloud deployment",
        "Priority + phone support",
      ],
    },
  ];
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-6 py-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col items-center text-center gap-4 mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">Pricing</span>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight max-w-2xl">
          Simple, transparent, usage-based.
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mt-2">
          No seats, no per-camera fee, no monthly commit. Live is billed by watched minutes,
          clips by stored gigabytes. Idle infrastructure costs you nothing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-2xl border p-6 md:p-8 flex flex-col gap-6 bg-white dark:bg-neutral-950 ${
              t.tag
                ? "border-emerald-500/60 shadow-lg shadow-emerald-500/5"
                : "border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-medium">{t.name}</div>
                {t.tag && (
                  <span className="mt-2 inline-flex text-[11px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded px-2 py-0.5">
                    {t.tag}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-medium">{t.price}</span>
              <span className="text-sm text-neutral-500">{t.cadence}</span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <a
              href={t.href}
              className={`h-11 mt-auto inline-flex items-center justify-center rounded-md text-sm font-medium ${
                t.tag
                  ? "bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900"
                  : "border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              {t.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const qs = [
    {
      q: "Does it work with my existing Hikvision / Dahua / CP Plus DVR?",
      a: "Yes. If your DVR speaks RTSP (they all do), the edge agent handles the codec, timestamp and auth quirks each vendor introduces — including H.265 sources, which it transcodes on the fly. No firmware changes to the DVR.",
    },
    {
      q: "What's the streaming latency?",
      a: "5–15 seconds via HLS — enough for monitoring dashboards and \"show me the camera now\" flows. Push-ingest sessions can use protocol:\"webrtc\" (WHIP in, WHEP out) for sub-second latency; WebRTC for edge-agent ingest is on the roadmap.",
    },
    {
      q: "How do you handle privacy?",
      a: "RTSP credentials and camera IPs never leave the edge agent. Viewers authenticate with per-session tokens, playback URLs are signed and die with the session, and live video is never stored. Every query is scoped to your project — cross-tenant reads are architecturally impossible.",
    },
    {
      q: "Can I store and download clips?",
      a: "Yes — that's the assets API. Upload clips from the edge (or your backend), set a retention TTL per clip, and fetch signed playback or download URLs whenever you need them. Expired clips delete themselves, storage included.",
    },
    {
      q: "How do I integrate this into an existing app?",
      a: "It's a plain REST API with bearer keys: create a session, embed the returned URL in your <video> tag (hls.js or native Safari HLS). A reference player and a live demo are in the showcase.",
    },
    {
      q: "What happens if the camera or network blips mid-stream?",
      a: "The edge agent supervises every stream and reconnects with backoff automatically. If a viewer disappears without saying goodbye, heartbeat timeouts end the session server-side so nothing keeps running — or billing — in the background.",
    },
    {
      q: "Do you compete with my customer's DVR or camera vendor?",
      a: "No. Streamo is a layer above your customers' hardware. They keep their DVR. You add cloud access — and everything that comes with it.",
    },
  ];
  return (
    <section id="faq" className="max-w-4xl mx-auto px-6 py-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col items-center text-center gap-4 mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">FAQ</span>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight max-w-2xl">
          Questions worth answering.
        </h2>
      </div>
      <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 border-y border-neutral-200 dark:border-neutral-800">
        {qs.map((it) => (
          <details key={it.q} className="group py-5">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-medium pr-8">{it.q}</span>
              <span className="text-neutral-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
            </summary>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {it.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="relative overflow-hidden rounded-2xl bg-neutral-950 text-neutral-100 p-10 md:p-16 flex flex-col items-center text-center gap-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(16,185,129,0.15), transparent 65%)",
          }}
        />
        <h2 className="relative text-3xl md:text-4xl font-medium tracking-tight max-w-2xl">
          Start streaming a camera in fifteen minutes.
        </h2>
        <p className="relative text-neutral-400 max-w-xl">
          Free tier includes 100 viewer-minutes and a gigabyte of clips per month. No credit
          card. Pay only when you outgrow it.
        </p>
        <div className="relative flex flex-col sm:flex-row gap-3">
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button className="h-12 px-6 rounded-md bg-emerald-500 text-neutral-950 text-base font-medium hover:bg-emerald-400 inline-flex items-center gap-1.5">
                Get an API key
                <ArrowRight className="w-4 h-4" />
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="h-12 px-6 rounded-md bg-emerald-500 text-neutral-950 text-base font-medium hover:bg-emerald-400 inline-flex items-center gap-1.5">
              Open dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Show>
          <Link href="/showcase" className="h-12 px-6 rounded-md border border-neutral-700 text-base font-medium inline-flex items-center hover:bg-neutral-900">
            See the demo
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700" />
          <span className="font-mono font-semibold">streamo</span>
          <span>· the video layer for the physical world</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-neutral-500">
          <a href="#primitives" className="hover:text-neutral-900 dark:hover:text-neutral-50">Product</a>
          <a href="#how" className="hover:text-neutral-900 dark:hover:text-neutral-50">How it works</a>
          <a href="#pricing" className="hover:text-neutral-900 dark:hover:text-neutral-50">Pricing</a>
          <a href="#faq" className="hover:text-neutral-900 dark:hover:text-neutral-50">FAQ</a>
          <Link href="/showcase" className="hover:text-neutral-900 dark:hover:text-neutral-50">Showcase</Link>
          <a href="https://github.com/VishweshMashru/Relay" className="hover:text-neutral-900 dark:hover:text-neutral-50">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
