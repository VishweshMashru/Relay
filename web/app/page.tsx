import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Reveal } from "@/components/reveal";
import { EyeOff, KeyRound, Lock, Timer, Trash2, Unplug } from "lucide-react";

// Landing page: camera intelligence platform. The design motif is the
// viewfinder — corner brackets, a REC dot, live detection boxes — rendered
// entirely in CSS. Space Grotesk is the display voice; mono is reserved for
// data. Dark, layered surfaces; emerald means "live".

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col bg-[#070808] text-neutral-300 selection:bg-emerald-400/25">
      <Nav />
      <Hero />
      <StatStrip />
      <HowItWorks />
      <Capabilities />
      <Stack />
      <Building />
      <Guarantees />
      <Pricing />
      <FAQ />
      <Closing />
      <Footer />
    </div>
  );
}

/* ---------------------------------------------------------------- shared */

function LensMark() {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-neutral-500">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
    </span>
  );
}

function Brackets({ className = "" }: { className?: string }) {
  const c = "absolute h-4 w-4 border-emerald-400/70";
  return (
    <span aria-hidden className={className}>
      <span className={`${c} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${c} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${c} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${c} bottom-0 right-0 border-b-2 border-r-2`} />
    </span>
  );
}

function SectionHead({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="mb-12 max-w-2xl">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-emerald-400/90">
        {eyebrow}
      </p>
      <h2 className="font-display text-3xl font-semibold tracking-tight text-neutral-50 md:text-4xl">
        {title}
      </h2>
      {lede && <p className="mt-4 text-[15px] leading-relaxed text-neutral-400">{lede}</p>}
    </div>
  );
}

function StatusChip({ s }: { s: "live" | "in development" | "planned" | "exploring" }) {
  const styles = {
    live: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    "in development": "border-amber-400/30 bg-amber-400/10 text-amber-300",
    planned: "border-white/10 bg-white/5 text-neutral-500",
    exploring: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  }[s];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${styles}`}
    >
      {s === "live" && <span className="h-1 w-1 rounded-full bg-emerald-400" />}
      {s}
    </span>
  );
}

const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-[0_0_28px_rgba(52,211,153,0.28)] transition-colors hover:bg-emerald-300";
const btnGhost =
  "inline-flex items-center justify-center rounded-md border border-white/15 px-5 py-2.5 text-sm text-neutral-200 transition-colors hover:border-white/40 hover:text-white";

/* ------------------------------------------------------------------- nav */

function Nav() {
  const links = [
    { href: "#how", label: "How it works" },
    { href: "#capabilities", label: "Capabilities" },
    { href: "#stack", label: "Platform" },
    { href: "#building", label: "What's next" },
    { href: "#pricing", label: "Pricing" },
  ];
  return (
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#070808]/85 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <LensMark />
          <span className="font-display text-[17px] font-semibold tracking-tight text-neutral-50">
            streamo
          </span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hidden rounded-md px-3 py-1.5 text-neutral-400 transition-colors hover:text-neutral-50 md:inline"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/download"
            className="hidden rounded-md px-3 py-1.5 text-neutral-400 transition-colors hover:text-neutral-50 sm:inline"
          >
            Download
          </Link>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-md px-3 py-1.5 text-neutral-400 transition-colors hover:text-neutral-50">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="ml-2 rounded-md bg-emerald-400 px-3.5 py-1.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-emerald-300">
                Get a key
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="ml-2 rounded-md bg-emerald-400 px-3.5 py-1.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
            >
              Dashboard
            </Link>
            <span className="ml-2 flex items-center">
              <UserButton />
            </span>
          </Show>
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero() {
  return (
    <header className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]"
        aria-hidden
      />
      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-6 pb-20 pt-16 md:pt-24 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <Reveal>
            <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 font-mono text-[11px] tracking-widest text-neutral-400">
              CAMERA INTELLIGENCE PLATFORM
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <span className="rec h-1.5 w-1.5 rounded-full bg-emerald-400" />
                API OPERATIONAL
              </span>
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.06] tracking-tight text-neutral-50 md:text-[3.4rem]">
              Turn any camera into something your software can{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                understand
              </span>
              .
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-400 md:text-lg">
              One API to stream any camera, drone, or robot — even behind firewalls and NAT. A
              small agent dials out from the local network; streams start when someone watches
              and stop when they leave; clips are kept exactly as long as you decide. Vision
              models and AI agents can look at any frame.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <button className={btnPrimary}>Get an API key →</button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className={btnPrimary}>
                  Open dashboard →
                </Link>
              </Show>
              <Link href="/showcase" className={btnGhost}>
                Watch a live camera
              </Link>
              <a
                href="https://github.com/VishweshMashru/Relay"
                className="px-2 text-sm text-neutral-500 transition-colors hover:text-neutral-100"
              >
                Source ↗
              </a>
            </div>
            <p className="mt-6 font-mono text-xs text-neutral-600">
              $ curl -fsSL streamo.in/install.sh | sh
              <span className="ml-3 text-neutral-700"># the whole edge install</span>
            </p>
          </Reveal>
        </div>
        <Reveal delay={200}>
          <SessionPanel />
        </Reveal>
      </div>
    </header>
  );
}

/* The hero visual is the product itself: the API exchange that starts a
   stream, reproduced from the first production session. No mockups. */
function SessionPanel() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 font-mono text-[11px] text-neutral-500">
          <span>first production stream — unedited</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="rec h-1.5 w-1.5 rounded-full bg-emerald-400" />
            api.streamo.in
          </span>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-6 text-neutral-400">
{`$ curl -s https://api.streamo.in/v1/sessions -X POST \\
    -H "Authorization: Bearer rk_live_••••" \\
    -d '{"camera_id": "730b91a9-4fd8-4f1d-846b-14a57e953112"}'
`}
          <span className="text-neutral-600">{`{
  "id": "5c6a196f-b59c-4dfb-8628-9d5dbaea6d70",
  "status": "pending",`}</span>
          <span className="text-emerald-300/90">{`
  "viewer_url": "https://customer-•••.cloudflarestream.com/…/video.m3u8",
  "viewer_token": "eyJhbGciOiJIUzI1NiIs…",`}</span>
          <span className="text-neutral-600">{`
  "expires_at": "2026-07-04T07:45:10Z"
}`}</span>
          {"\n\n"}
          <span className="text-neutral-600">{`# t+5s   edge agent opened the camera's RTSP feed
# t+15s  manifest live — video playing in the browser`}</span>
        </pre>
      </div>
      <p className="mt-3 text-center font-mono text-[11px] text-neutral-600">
        edge agent on the LAN · outbound HTTPS only · nothing port-forwarded
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- stat strip */

function StatStrip() {
  const stats = [
    ["<1s", "glass-to-glass over WebRTC"],
    ["0", "ports forwarded, ever"],
    ["$0", "for a camera nobody is watching"],
    ["1", "API key to stream, store, understand"],
  ];
  return (
    <section className="border-y border-white/5 bg-white/[0.015]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-6 md:grid-cols-4">
        {stats.map(([n, label], i) => (
          <Reveal key={label} delay={i * 60}>
            <div className="py-8 pr-6">
              <div className="font-display text-3xl font-semibold text-neutral-50 md:text-4xl">
                {n}
              </div>
              <div className="mt-1.5 text-sm text-neutral-500">{label}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ how it works */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Install the agent",
      body:
        "One command on any machine that can reach the camera's LAN. It connects outbound over HTTPS only — RTSP credentials never leave that machine.",
      code: "curl -fsSL streamo.in/install.sh | sh",
    },
    {
      n: "02",
      title: "Register cameras",
      body:
        "Cameras get an ID through the API or dashboard. The cloud stores a name; the RTSP URL and password stay on the edge.",
      code: "POST /v1/edges/{id}/cameras",
    },
    {
      n: "03",
      title: "Stream on demand",
      body:
        "Your backend creates a session; the agent opens the camera and pushes the feed; your frontend embeds the returned URL. Viewer leaves → everything stops.",
      code: "POST /v1/sessions",
    },
  ];
  return (
    <section id="how" className="mx-auto w-full max-w-6xl px-6 py-24">
      <Reveal>
        <SectionHead
          eyebrow="How it works"
          title="No port forwarding. No VPNs. No static IPs."
          lede="The agent on the local network dials out, so the camera is reachable without the network ever being open. Video moves edge → CDN; it never transits the control plane."
        />
      </Reveal>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 90}>
            <div className="group relative h-full rounded-xl border border-white/8 bg-white/[0.02] p-6 transition-colors hover:border-emerald-400/30">
              <div className="font-mono text-xs text-emerald-400/80">{s.n}</div>
              <h3 className="mt-3 font-display text-lg font-semibold text-neutral-50">
                {s.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">{s.body}</p>
              <code className="mt-4 block truncate rounded-md border border-white/5 bg-black/40 px-3 py-2 font-mono text-[11.5px] text-neutral-500">
                {s.code}
              </code>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={150}>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/8 bg-black/40">
          <div className="border-b border-white/5 px-5 py-2.5 font-mono text-[11px] text-neutral-600">
            architecture — video never transits the control plane
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[11.5px] leading-relaxed text-neutral-500 md:text-xs">
{`  CUSTOMER NETWORK                CONTROL PLANE                  YOUR APP
  ────────────────                ─────────────                  ────────

  ┌────────┐  RTSP   ┌────────┐   HTTPS    ┌───────────┐  REST   ┌─────────┐
  │ Camera ├────────▶│ Edge   ├───────────▶│ streamo   │◀────────┤ Backend │
  └────────┘  (LAN)  │ agent  │ (out only) │ API       │  rk_…   └────┬────┘
                     └──┬──┬──┘            └───────────┘              │
                 live │     │ clips                              embeds URL
                      ▼     ▼                                         ▼
              ┌───────────┐ ┌──────────────┐   tokenized HLS   ┌─────────┐
              │ Media     │ │ Blob storage │──────────────────▶│ Viewer  │
              │ plane     │ │ (TTL'd)      │   signed MP4      └─────────┘
              └───────────┘ └──────────────┘

  Media plane per project, switchable at runtime from the dashboard:
  Cloudflare Stream (global CDN, recordings, signed URLs) or a
  MediaMTX server you host (flat cost, lower latency).`}
          </pre>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------ capabilities */

function Capabilities() {
  const caps = [
    {
      name: "Live sessions",
      api: "POST /v1/sessions",
      desc: "Start a stream from a registered camera on demand. The edge opens RTSP only while a session exists; idle cameras cost nothing. Tokenized HLS playback per viewer.",
      s: "live" as const,
    },
    {
      name: "Push ingest",
      api: '{"ingest":"push"}',
      desc: "No agent: the API returns an RTMPS URL and any encoder — a DJI controller, OBS, a robot — streams straight to it.",
      s: "live" as const,
    },
    {
      name: "Sub-second WebRTC",
      api: '{"protocol":"webrtc"}',
      desc: "WHIP in, WHEP out for push sessions. Under one second glass-to-glass — suited to teleop-assist viewing.",
      s: "live" as const,
    },
    {
      name: "Clips with TTLs",
      api: "POST /v1/assets",
      desc: "Store event clips with per-clip retention. Bytes go directly to storage over presigned URLs; playback and download links are signed on fetch.",
      s: "live" as const,
    },
    {
      name: "Record from live",
      api: '{"record": true}',
      desc: "A session's recording becomes a clip automatically at teardown, with its own retention clock.",
      s: "live" as const,
    },
    {
      name: "Frames for AI",
      api: "GET …/frame.jpg",
      desc: "The current frame as a JPEG — for vision models and agents that need to look, not watch. An MCP server ships in the repo.",
      s: "live" as const,
    },
  ];
  return (
    <section id="capabilities" className="mx-auto w-full max-w-6xl px-6 py-24">
      <Reveal>
        <SectionHead
          eyebrow="Capabilities"
          title="Everything between the lens and your code."
          lede="Plain REST with bearer keys. Every capability below is in production."
        />
      </Reveal>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {caps.map((c, i) => (
          <Reveal key={c.name} delay={Math.min(i * 60, 240)}>
            <div className="group relative h-full rounded-xl border border-white/8 bg-white/[0.02] p-6 transition-colors hover:border-emerald-400/30">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-base font-semibold text-neutral-50">{c.name}</h3>
                <StatusChip s={c.s} />
              </div>
              <code className="mt-3 inline-block rounded-md border border-white/5 bg-black/40 px-2.5 py-1 font-mono text-[11px] text-emerald-300/80">
                {c.api}
              </code>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">{c.desc}</p>
            </div>
          </Reveal>
        ))}
        <Reveal delay={300}>
          <div className="relative h-full rounded-xl border border-amber-400/20 bg-amber-400/[0.03] p-6 sm:col-span-2 lg:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <h3 className="font-display text-base font-semibold text-neutral-50">
                  Detections
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  Open, lightweight vision models — intrusion, PPE, fire and smoke — running
                  against your streams, results delivered as events through webhooks and{" "}
                  <code className="font-mono text-[12px] text-amber-300/90">/v1/detections</code>.
                  This is the Understand layer arriving in the same API.
                </p>
              </div>
              <StatusChip s="in development" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ stack */

function Stack() {
  const layers = [
    {
      n: "L1",
      name: "See",
      s: "live" as const,
      desc: "The video layer. Live streams, clips, and frames from any device on any network — everything above, in production today.",
    },
    {
      n: "L2",
      name: "Understand",
      s: "in development" as const,
      desc: "Open, lightweight vision models trained for specific jobs — intrusion, PPE, fire and smoke — exposed through the same API. The MCP server, which lets AI agents look at a camera, is the first shipped piece.",
    },
    {
      n: "L3",
      name: "Act",
      s: "live" as const,
      desc: "Products assembled from the layers below. Foreman turns factory CCTV into safety and operations intelligence — in production today. Monitoring dashboards and BYO-camera security are planned on the same stack.",
    },
  ];
  return (
    <section id="stack" className="relative overflow-hidden border-y border-white/5 bg-white/[0.015]">
      <div
        className="pointer-events-none absolute -right-32 top-1/3 h-[380px] w-[520px] rounded-full bg-emerald-500/[0.06] blur-[120px]"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-6xl px-6 py-24">
        <Reveal>
          <SectionHead
            eyebrow="The platform"
            title="One company, three layers."
            lede="Streamo is a camera intelligence company. The API is the bottom of the stack, and each layer is a customer of the one below it — starting with our own products."
          />
        </Reveal>
        <div className="relative flex flex-col gap-4">
          <div
            className="absolute bottom-8 left-[27px] top-8 hidden w-px bg-gradient-to-b from-emerald-400/40 via-white/10 to-emerald-400/40 md:block"
            aria-hidden
          />
          {layers.map((l, i) => (
            <Reveal key={l.n} delay={i * 100}>
              <div
                className={`relative rounded-xl border border-white/8 bg-[#0a0c0c] p-6 transition-colors hover:border-emerald-400/30 md:p-7 ${
                  ["md:mr-40", "md:ml-20 md:mr-20", "md:ml-40"][i]
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="font-mono text-xs text-emerald-400/70">{l.n}</span>
                  <h3 className="font-display text-2xl font-semibold tracking-tight text-neutral-50">
                    {l.name}
                  </h3>
                  <StatusChip s={l.s} />
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-400">{l.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------- what we're building */

function Building() {
  const items: {
    name: string;
    s: "live" | "in development" | "planned" | "exploring";
    body: string;
  }[] = [
    {
      name: "Foreman — factory intelligence",
      s: "live",
      body: "Our own product, built on this exact API: factory CCTV in, safety and operations intelligence out. In production today.",
    },
    {
      name: "Open vision models",
      s: "in development",
      body: "Lightweight, job-specific, open-source: intrusion, protective equipment, fire and smoke, packages, falls, vehicles. Delivered as events through webhooks and /v1/detections.",
    },
    {
      name: "Drone operations",
      s: "in development",
      body: "AI on live drone feeds: stream from the controller with no agent, run detections mid-flight, archive mission clips. Drone-in-a-box patrol monitoring follows.",
    },
    {
      name: "Dashcam intelligence",
      s: "in development",
      body: "Fleet dashcams as streaming cameras: live view of any vehicle, incident clips on harsh events, retention you control instead of an SD card.",
    },
    {
      name: "Home & small-business security",
      s: "in development",
      body: "BYO-camera security on hardware people already own: person at the door, package left, smoke detected — an alert with the clip attached. No NVR.",
    },
    {
      name: "Site monitoring",
      s: "planned",
      body: "Construction and warehouses: progress timelapses, PPE compliance, after-hours intrusion. The Foreman architecture wearing different clothes.",
    },
    {
      name: "Robot fleet views",
      s: "planned",
      body: "One pane for every camera on every robot: teleop-assist under a second, incident capture, and training data flowing back to physical-AI labs.",
    },
    {
      name: "Video search",
      s: "exploring",
      body: "Ask your cameras questions — “every truck that entered after 8pm” — natural-language search across live streams and stored clips.",
    },
    {
      name: "Alarm verification",
      s: "exploring",
      body: "For monitoring centers: a sensor trips, we pull the frame, run the model, and attach visual confirmation before anyone dispatches a guard.",
    },
  ];
  return (
    <section id="building" className="mx-auto w-full max-w-6xl px-6 py-24">
      <Reveal>
        <SectionHead
          eyebrow="Now & next"
          title="What we're building."
          lede="Products going up on top of the platform — ours, and the directions we're headed. Statuses are real: live is in production, in development is being built now, planned is committed, exploring is us thinking out loud."
        />
      </Reveal>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c, i) => (
          <Reveal key={c.name} delay={Math.min((i % 3) * 70, 210)}>
            <div className="h-full rounded-xl border border-white/8 bg-white/[0.02] p-6 transition-colors hover:border-emerald-400/30">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-base font-semibold text-neutral-50">{c.name}</h3>
                <StatusChip s={c.s} />
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">{c.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={200}>
        <p className="mt-8 text-sm text-neutral-500">
          Design partners steer what ships next — especially in the drone and dashcam tracks.{" "}
          <a
            href="mailto:hello@streamo.in"
            className="text-neutral-300 underline underline-offset-4 transition-colors hover:text-emerald-300"
          >
            hello@streamo.in
          </a>
        </p>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------- guarantees */

function Guarantees() {
  const props = [
    {
      icon: Unplug,
      k: "No inbound connectivity",
      v: "The edge agent only dials out over HTTPS. No port forwarding, no public IPs, no VPN.",
    },
    {
      icon: KeyRound,
      k: "Credentials stay on the LAN",
      v: "RTSP URLs and passwords live in a file on the edge machine. The cloud stores camera names and IDs.",
    },
    {
      icon: Timer,
      k: "Streams are ephemeral",
      v: "Sessions exist while watched. Heartbeats stop → the stream is torn down within 30 seconds, server-side.",
    },
    {
      icon: Lock,
      k: "Playback is tokenized",
      v: "Every viewer gets a per-session token; stream URLs are signed and expire with the session.",
    },
    {
      icon: EyeOff,
      k: "Revocation is granular",
      v: "Any API key, and any single edge's credential, can be revoked without touching the rest.",
    },
    {
      icon: Trash2,
      k: "Retention is explicit",
      v: "Live video is not stored. Clips persist exactly as long as their TTL, then delete themselves.",
    },
  ];
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-24">
      <Reveal>
        <SectionHead
          eyebrow="Design guarantees"
          title="Cameras are sensitive. The defaults act like it."
        />
      </Reveal>
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {props.map((p, i) => (
          <Reveal key={p.k} delay={Math.min(i * 60, 240)}>
            <div className="flex gap-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/[0.03] text-emerald-300">
                <p.icon size={16} strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-sm font-medium text-neutral-100">{p.k}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{p.v}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- pricing */

function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      unit: "",
      hot: false,
      lines: ["100 viewer-minutes / month", "1 GB clip storage", "1 edge, unlimited cameras", "Community support"],
      cta: "Start free",
    },
    {
      name: "Usage",
      price: "$0.005",
      unit: "per viewer-minute",
      hot: true,
      lines: [
        "No minimum, no per-camera fee",
        "Clip storage $0.02 / GB-month",
        "Unlimited edges and cameras",
        "Self-hosted media plane option",
        "Email support",
      ],
      cta: "Get an API key",
    },
    {
      name: "Enterprise",
      price: "Custom",
      unit: "",
      hot: false,
      lines: ["Dedicated infrastructure, SLA", "BYO storage and media servers", "SSO, audit logs", "Priority support"],
      cta: "hello@streamo.in",
    },
  ];
  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-6 py-24">
      <Reveal>
        <SectionHead
          eyebrow="Pricing"
          title="Billed on what moves."
          lede="Minutes watched and gigabytes stored. Idle infrastructure is free — an unwatched camera costs nothing."
        />
      </Reveal>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {tiers.map((t, i) => (
          <Reveal key={t.name} delay={i * 90} className="flex">
            <div
              className={`flex flex-1 flex-col gap-5 rounded-xl border p-7 ${
                t.hot
                  ? "border-emerald-400/40 bg-emerald-400/[0.04] shadow-[0_0_40px_rgba(52,211,153,0.08)]"
                  : "border-white/8 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                  {t.name}
                </div>
                {t.hot && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                    pay as you go
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-semibold text-neutral-50">
                  {t.price}
                </span>
                {t.unit && <span className="font-mono text-xs text-neutral-500">{t.unit}</span>}
              </div>
              <ul className="flex flex-col gap-2 text-sm text-neutral-400">
                {t.lines.map((l) => (
                  <li key={l} className="flex items-start gap-2.5">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-emerald-400/60" />
                    {l}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-2">
                {t.name === "Enterprise" ? (
                  <a href="mailto:hello@streamo.in" className={`${btnGhost} w-full`}>
                    {t.cta}
                  </a>
                ) : (
                  <Show when="signed-out">
                    <SignUpButton mode="modal">
                      <button className={`${t.hot ? btnPrimary : btnGhost} w-full`}>
                        {t.cta} →
                      </button>
                    </SignUpButton>
                  </Show>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- faq */

function FAQ() {
  const qs = [
    [
      "Does it work with my existing Hikvision / Dahua / CP Plus DVR?",
      "Yes. Anything that speaks RTSP works. The edge agent handles per-vendor quirks and transcodes H.265 sources on the fly — no DVR firmware changes.",
    ],
    [
      "What's the latency?",
      "5–15 seconds over HLS. Push-ingest sessions can use WebRTC (WHIP in, WHEP out) for under one second. WebRTC for edge-agent ingest is on the roadmap.",
    ],
    [
      "What does Streamo store?",
      "Camera names and IDs, session metadata, and clips you explicitly keep — nothing else. Live video is never recorded unless a session sets record:true, and RTSP credentials never leave the edge machine.",
    ],
    [
      "Can I avoid per-minute fees?",
      "Yes. Point your project at a MediaMTX server you host — one dashboard setting, no code change. You trade the CDN, recordings, and signed URLs for flat cost; many monitoring workloads prefer that.",
    ],
    [
      "How do I integrate it?",
      "Plain REST with bearer keys. Create a session, put the returned URL in a <video> tag with hls.js. The dashboard's watch page and the open-source repo are working references.",
    ],
    [
      "What happens when the network blips?",
      "The edge agent supervises every stream and reconnects with backoff. If a viewer disappears, heartbeat timeout ends the session server-side; nothing runs — or bills — unattended.",
    ],
  ];
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-6 pb-24">
      <Reveal>
        <SectionHead eyebrow="FAQ" title="Questions" />
      </Reveal>
      <Reveal delay={80}>
        <div className="flex flex-col gap-3">
          {qs.map(([q, a]) => (
            <details
              key={q}
              className="group rounded-xl border border-white/8 bg-white/[0.02] px-5 py-4 transition-colors open:border-emerald-400/25 hover:border-white/20"
            >
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6">
                <span className="text-sm font-medium text-neutral-100">{q}</span>
                <span className="font-mono text-neutral-600 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">{a}</p>
            </details>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ---------------------------------------------------------------- closing */

function Closing() {
  return (
    <section className="relative overflow-hidden border-t border-white/5">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute -bottom-48 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[130px]"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-6xl px-6 py-28 text-center">
        <Reveal>
          <div className="relative mx-auto max-w-2xl px-8 py-6">
            <Brackets className="absolute inset-0 block" />
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-neutral-50 md:text-5xl">
              A camera on your desk can be live on the internet in the next fifteen minutes.
            </h2>
          </div>
          <p className="mx-auto mt-6 max-w-md text-sm text-neutral-500">
            Free tier, no card. The edge agent installs with one command.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <button className={btnPrimary}>Get an API key →</button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className={btnPrimary}>
                Open dashboard →
              </Link>
            </Show>
            <Link href="/showcase" className={btnGhost}>
              Watch a live camera
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 text-sm text-neutral-500 md:flex-row md:items-center">
        <span className="flex items-center gap-2.5">
          <LensMark />
          <span className="font-display font-semibold text-neutral-200">streamo</span>
          <span className="font-mono text-xs text-neutral-600">camera intelligence</span>
        </span>
        <div className="flex items-center gap-6 text-[13px]">
          <a href="#capabilities" className="transition-colors hover:text-neutral-100">
            Capabilities
          </a>
          <a href="#stack" className="transition-colors hover:text-neutral-100">
            Platform
          </a>
          <a href="#building" className="transition-colors hover:text-neutral-100">
            What&apos;s next
          </a>
          <Link href="/showcase" className="transition-colors hover:text-neutral-100">
            Demo
          </Link>
          <Link href="/download" className="transition-colors hover:text-neutral-100">
            Download
          </Link>
          <a
            href="https://github.com/VishweshMashru/Relay"
            className="transition-colors hover:text-neutral-100"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
