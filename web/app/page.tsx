import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import {
  Camera, Zap, Shield, Globe, Cpu, Radio, ArrowRight, Server, PlayCircle,
  Lock, Eye, KeyRound, Fingerprint, Cloud, ShieldCheck, Check,
} from "lucide-react";

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <CodeExample />
      <Security />
      <UseCases />
      <Pricing />
      <FAQ />
      <SocialProof />
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
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-neutral-900 to-neutral-700 dark:from-neutral-100 dark:to-neutral-400 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-white dark:text-neutral-900" />
          </span>
          streamo
        </Link>
        <div className="flex items-center gap-1 md:gap-3">
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
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(34,197,94,0.08), transparent 60%)",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center gap-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 px-3 py-1 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Now in beta — sign up for early access
        </span>
        <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.05] max-w-4xl">
          Video infrastructure for apps that
          <br />
          <span className="bg-gradient-to-br from-neutral-900 via-neutral-500 to-neutral-900 dark:from-neutral-100 dark:via-neutral-400 dark:to-neutral-100 bg-clip-text text-transparent">
            watch the physical world.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
          Stream any camera, from anywhere, on demand — even from behind NAT, corporate
          firewalls, or a factory floor. One API call, one edge agent, pay only for what your
          users actually watch.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button className="h-12 px-6 rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 text-base font-medium hover:opacity-90 inline-flex items-center gap-1.5">
                Get an API key
                <ArrowRight className="w-4 h-4" />
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="h-12 px-6 rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 text-base font-medium inline-flex items-center gap-1.5">
              Open dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Show>
          <Link href="/showcase" className="h-12 px-6 rounded-md border border-neutral-300 dark:border-neutral-700 text-base font-medium inline-flex items-center hover:bg-neutral-50 dark:hover:bg-neutral-900">
            See it live
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-500">
          <Item>H.264 / H.265</Item>
          <Item>HLS + WebRTC</Item>
          <Item>Outbound HTTPS only</Item>
          <Item>No public IP required</Item>
          <Item>Per-minute pricing</Item>
        </div>
      </div>
    </section>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1 h-1 rounded-full bg-neutral-400" />
      {children}
    </span>
  );
}

function Features() {
  const features = [
    { icon: Shield, title: "No public IP required", body: "Your camera stays on its LAN. The edge agent connects out via HTTPS — nothing to expose, nothing to forward, nothing to firewall." },
    { icon: Zap, title: "On-demand, pay-per-minute", body: "Streams start when a viewer asks and stop the moment they leave. You never pay for cameras that nobody is watching." },
    { icon: Camera, title: "Any camera, any DVR", body: "Hikvision, Dahua, Reolink, iPhone RTSP apps, drones, medical devices, IP cams. If it speaks RTSP or RTMP, we ingest it." },
    { icon: Globe, title: "Global edge delivery", body: "Viewers connect through Cloudflare's 300+ point CDN. Sub-second WebRTC available for real-time use cases." },
    { icon: Cpu, title: "Built for AI + vision", body: "First-class metadata, event timestamps, and webhooks. Bring your detection models — we handle the plumbing." },
    { icon: Radio, title: "One binary, any platform", body: "Edge agent cross-compiles to Windows, Linux, macOS, ARM. Drop it on a mini-PC, a Synology, a factory PC. It just works." },
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
            <div key={f.title} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-3 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors bg-white dark:bg-neutral-950">
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
      body: "One command on any Windows, Linux or Mac machine that can reach your camera on its LAN. Runs as a background service, outbound HTTPS only.",
      example: "curl -fsSL https://streamo.in/install.sh | sh",
    },
    {
      n: "02",
      icon: Camera,
      title: "Register cameras",
      body: "Register each camera via our API. RTSP URLs and passwords stay on the edge — they never travel to Streamo's cloud.",
      example: "POST /v1/edges/{id}/cameras",
    },
    {
      n: "03",
      icon: PlayCircle,
      title: "Watch on demand",
      body: "Mint a viewer session with one API call. Stream starts the moment the viewer opens the page and stops when they close it.",
      example: "POST /v1/sessions → { viewer_url }",
    },
  ];
  return (
    <section id="how" className="max-w-6xl mx-auto px-6 py-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col items-center text-center gap-4 mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">How it works</span>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight max-w-2xl">
          Three steps from private camera to live viewer.
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-xl mt-2">
          No RTMP servers, no NAT holepunching, no CDN config. You handle the API. We handle
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
{`  CUSTOMER NETWORK                    STREAMO CLOUD             VIEWER
  ────────────────                    ─────────────             ──────

  ┌────────┐   RTSP    ┌──────────┐   HTTPS    ┌──────────┐
  │ Camera ├──────────▶│ Edge     ├───────────▶│ Control  │
  └────────┘  (LAN)    │ agent    │  (out only)│ plane    │
                       └────┬─────┘            └────┬─────┘
                            │                       │
                            │ RTMPS                 │ signed URL
                            ▼                       ▼
                       ┌──────────────────────────────────┐
                       │ Cloudflare Stream global CDN     │──▶ HLS
                       └──────────────────────────────────┘    /WebRTC`}
        </pre>
      </div>
    </section>
  );
}

function CodeExample() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="flex flex-col gap-5">
          <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">Two API calls</span>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight leading-tight">
            Ship live video without becoming a video company.
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
            No RTMP pipelines, no ffmpeg, no NAT-traversal, no CDN config, no signed URLs
            to hand-roll. Register a camera, mint a session, embed the URL.
          </p>
          <div className="flex flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Bullet>Auth-scoped API keys with per-project isolation</Bullet>
            <Bullet>Signed playback URLs with short TTL</Bullet>
            <Bullet>Node, Python, and Go SDKs</Bullet>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-950 shadow-2xl shadow-neutral-900/10">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-neutral-800 bg-neutral-900">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            <span className="ml-3 text-[11px] font-mono text-neutral-400">app.tsx</span>
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
      <span className="text-neutral-500">{`// 1. From your backend`}</span>{`\n`}
      <span className="text-purple-300">const</span> session ={" "}
      <span className="text-purple-300">await</span>{" "}
      <span className="text-blue-300">streamo</span>.<span className="text-blue-300">sessions</span>.<span className="text-emerald-300">create</span>({`{`}{`\n`}
      {`  `}cameraId: <span className="text-orange-300">{'"cam_5f92..."'}</span>,{`\n`}
      {`  `}ttlSeconds: <span className="text-orange-300">600</span>,{`\n`}
      {`}`});{`\n\n`}
      <span className="text-neutral-500">{`// 2. In your frontend`}</span>{`\n`}
      <span className="text-pink-300">{`<Player`}</span> <span className="text-blue-300">src</span>=<span className="text-orange-300">{`{session.viewerUrl}`}</span> <span className="text-pink-300">{`/>`}</span>{`\n`}
    </>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-1 h-1 rounded-full bg-emerald-500" />
      {children}
    </span>
  );
}

function Security() {
  const items = [
    { icon: Shield, title: "No public IPs, ever", body: "Edge agent is outbound-only. Cameras never touch the internet." },
    { icon: Lock, title: "Credentials stay local", body: "RTSP passwords live on the edge agent. They're never sent to us." },
    { icon: KeyRound, title: "Signed playback URLs", body: "Every viewer session gets a short-lived signed URL. Sharing after expiry doesn't work." },
    { icon: Cloud, title: "TLS everywhere", body: "Agent ↔ cloud, cloud ↔ viewer, edge ↔ Cloudflare — all encrypted in transit." },
    { icon: Fingerprint, title: "Multi-tenant isolation", body: "Every query is scoped to your project. Cross-tenant access is architecturally impossible." },
    { icon: Eye, title: "No storage by default", body: "Video isn't recorded unless you turn it on per-session. When you do, you control retention." },
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
    { label: "Factory monitoring", note: "with defect detection" },
    { label: "Retail analytics", note: "person-counting, queue AI" },
    { label: "Construction sites", note: "progress AI, PPE detection" },
    { label: "Warehouse & logistics", note: "pallet tracking, safety" },
    { label: "Smart buildings", note: "occupancy, visitor logs" },
    { label: "Fleet & dashcams", note: "incident review" },
    { label: "Drone livestreams", note: "on-demand ops feeds" },
    { label: "Body-worn cameras", note: "police, delivery, insurance" },
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
        "1 edge, unlimited cameras",
        "HLS playback",
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
        "HLS + WebRTC",
        "Recordings + signed downloads",
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
        "SSO, SCIM, audit logs",
        "HIPAA / SOC 2",
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
          Simple, transparent, per-minute.
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mt-2">
          No seats, no cameras-fee, no monthly commit. You pay only when someone is watching.
          Cloudflare Stream delivery cost is passed through at cost.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-2xl border p-6 md:p-8 flex flex-col gap-6 bg-white dark:bg-neutral-950 ${
              t.tag
                ? "border-neutral-900 dark:border-neutral-100 shadow-lg shadow-neutral-900/5"
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
      a: "Yes. If your DVR speaks RTSP (they all do), the edge agent handles the codec, timestamp and auth quirks each vendor introduces. No firmware changes to the DVR.",
    },
    {
      q: "What's the streaming latency?",
      a: "5–15 seconds via HLS by default — enough for monitoring dashboards. WebRTC gives you sub-second when latency matters — same API, different protocol.",
    },
    {
      q: "How do you handle privacy?",
      a: "RTSP credentials and camera IPs never leave the edge agent. Playback URLs are signed and short-lived. Video is not recorded unless you explicitly turn it on. Every query is scoped to your project — cross-tenant reads are architecturally impossible.",
    },
    {
      q: "Can I record and download later?",
      a: "Yes. Enable recording per-session or per-camera; retention is under your control. Signed MP4 download endpoints for compliance clips, incident review, or evidence.",
    },
    {
      q: "How do I integrate this into an existing app?",
      a: "Two API calls: create a session, embed the returned URL in your <video>. Node, Python and Go SDKs available. Full quickstart at docs.streamo.in.",
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

function SocialProof() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 border-t border-neutral-200 dark:border-neutral-800">
      <p className="text-center text-xs font-mono uppercase tracking-widest text-neutral-500">
        Building with early design partners
      </p>
    </section>
  );
}

function CTA() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="rounded-2xl bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 p-10 md:p-16 flex flex-col items-center text-center gap-6">
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight max-w-2xl">
          Start streaming a camera in fifteen minutes.
        </h2>
        <p className="text-neutral-400 dark:text-neutral-600 max-w-xl">
          Free tier includes 100 viewer-minutes per month. No credit card. Pay only when you
          outgrow it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button className="h-12 px-6 rounded-md bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50 text-base font-medium hover:opacity-90 inline-flex items-center gap-1.5">
                Get an API key
                <ArrowRight className="w-4 h-4" />
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="h-12 px-6 rounded-md bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50 text-base font-medium inline-flex items-center gap-1.5">
              Open dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Show>
          <Link href="/showcase" className="h-12 px-6 rounded-md border border-neutral-700 dark:border-neutral-400 text-base font-medium inline-flex items-center hover:bg-neutral-800 dark:hover:bg-neutral-200">
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
          <span className="w-5 h-5 rounded-md bg-neutral-900 dark:bg-neutral-100" />
          <span className="font-mono font-semibold">streamo</span>
          <span>· video infrastructure for the physical world</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-neutral-500">
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
