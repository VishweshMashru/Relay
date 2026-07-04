import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

// Landing page. Design language: engineering document, not SaaS template.
// Numbered sections, rules instead of cards, monospace structure, one accent
// color used only for status. Copy states facts; adjectives are suspect.

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Nav />
      <Hero />
      <Capabilities />
      <Architecture />
      <Stack />
      <Roadmap />
      <Properties />
      <Pricing />
      <FAQ />
      <Closing />
      <Footer />
    </div>
  );
}

/* ---------------------------------------------------------------- chrome */

function Nav() {
  const links = [
    { href: "#capabilities", label: "Capabilities" },
    { href: "#architecture", label: "Architecture" },
    { href: "#roadmap", label: "Roadmap" },
    { href: "#pricing", label: "Pricing" },
  ];
  return (
    <nav className="sticky top-0 z-40 bg-white/90 dark:bg-neutral-950/90 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
        <Link href="/" className="font-mono font-semibold tracking-tight">
          streamo<span className="text-emerald-600">.</span>
        </Link>
        <div className="flex items-center gap-5 font-mono text-[13px]">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hidden md:inline text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
              {l.label}
            </a>
          ))}
          <Link href="/showcase" className="hidden sm:inline text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
            Demo
          </Link>
          <Link href="/download" className="hidden sm:inline text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
            Download
          </Link>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="border border-neutral-900 dark:border-neutral-100 px-3 py-1 hover:bg-neutral-900 hover:text-white dark:hover:bg-neutral-100 dark:hover:text-neutral-900">
                Get a key
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="border border-neutral-900 dark:border-neutral-100 px-3 py-1 hover:bg-neutral-900 hover:text-white dark:hover:bg-neutral-100 dark:hover:text-neutral-900">
              Dashboard
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}

function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4 border-t border-neutral-900 dark:border-neutral-100 pt-4 mb-10">
      <span className="font-mono text-sm text-neutral-400">{n}</span>
      <h2 className="text-xl md:text-2xl font-medium tracking-tight">{title}</h2>
    </div>
  );
}

function Status({ s }: { s: "live" | "building" | "planned" }) {
  const cls = {
    live: "text-emerald-600 dark:text-emerald-400",
    building: "text-amber-600 dark:text-amber-400",
    planned: "text-neutral-400",
  }[s];
  return <span className={`font-mono text-xs whitespace-nowrap ${cls}`}>[{s}]</span>;
}

/* ------------------------------------------------------------------ hero */

function Hero() {
  return (
    <header className="max-w-5xl mx-auto w-full px-6 pt-16 md:pt-24 pb-16">
      <p className="font-mono text-xs text-neutral-500 mb-6">
        STREAMO — CAMERA INTELLIGENCE · <span className="text-emerald-600 dark:text-emerald-400">API OPERATIONAL</span>
      </p>
      <h1 className="text-3xl md:text-5xl font-medium tracking-tight leading-tight max-w-3xl">
        Video infrastructure for cameras, drones, and robots — including the ones behind
        firewalls.
      </h1>
      <p className="mt-6 text-base md:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
        One API to stream a device on a network you don't control, keep the clips that
        matter, and hand single frames to a vision model. An agent on the LAN dials out;
        nothing is port-forwarded; streams exist only while someone is watching.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3 font-mono text-sm">
        <Show when="signed-out">
          <SignUpButton mode="modal">
            <button className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 hover:opacity-85">
              Get an API key →
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link href="/dashboard" className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 hover:opacity-85">
            Open dashboard →
          </Link>
        </Show>
        <Link href="/showcase" className="border border-neutral-300 dark:border-neutral-700 px-5 py-2.5 hover:border-neutral-900 dark:hover:border-neutral-100">
          Watch a live camera
        </Link>
        <a href="https://github.com/VishweshMashru/Relay" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 px-2">
          Source ↗
        </a>
      </div>

      <Terminal />
    </header>
  );
}

function Terminal() {
  return (
    <div className="mt-14 border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-500">
        <span>transcript — first stream, unedited</span>
        <span>2.4s elapsed</span>
      </div>
      <pre className="p-4 md:p-5 text-[12.5px] leading-6 font-mono overflow-x-auto bg-neutral-50 dark:bg-neutral-900/60 text-neutral-700 dark:text-neutral-300">
{`$ curl -s https://api.streamo.in/v1/sessions -X POST \\
    -H "Authorization: Bearer rk_live_••••" \\
    -d '{"camera_id": "730b91a9-4fd8-4f1d-846b-14a57e953112"}'
`}
        <span className="text-neutral-500">{`{
  "id": "5c6a196f-b59c-4dfb-8628-9d5dbaea6d70",
  "status": "pending",`}</span>
        {"\n"}
        <span className="text-emerald-700 dark:text-emerald-400">{`  "viewer_url": "https://customer-•••.cloudflarestream.com/…/video.m3u8",
  "viewer_token": "eyJhbGciOiJIUzI1NiIs…",`}</span>
        <span className="text-neutral-500">{`
  "expires_at": "2026-07-04T07:45:10Z"
}`}</span>
        {"\n\n"}
        <span className="text-neutral-400">{`# t+5s   edge agent opened the camera's RTSP feed
# t+15s  manifest live — video playing in the browser`}</span>
      </pre>
    </div>
  );
}

/* ---------------------------------------------------------- capabilities */

function Capabilities() {
  const rows = [
    {
      name: "Live sessions",
      api: "POST /v1/sessions",
      desc: "Start a stream from a registered camera on demand. The edge agent opens RTSP only while a session exists; idle cameras cost nothing. HLS playback, tokenized per viewer.",
      s: "live" as const,
    },
    {
      name: "Push ingest",
      api: 'POST /v1/sessions {"ingest":"push"}',
      desc: "No agent: the API returns an RTMPS URL and any encoder — a DJI controller, OBS, a robot — streams straight to it.",
      s: "live" as const,
    },
    {
      name: "Sub-second WebRTC",
      api: '{"protocol":"webrtc"}',
      desc: "WHIP in, WHEP out, for push sessions. Under one second glass-to-glass; suited to teleop-assist viewing.",
      s: "live" as const,
    },
    {
      name: "Clips",
      api: "POST /v1/assets",
      desc: "Store event clips with per-clip retention. Bytes go directly to storage over presigned URLs; playback and download URLs are signed on fetch.",
      s: "live" as const,
    },
    {
      name: "Record from live",
      api: '{"record": true}',
      desc: "A session's recording becomes a clip automatically at teardown, with its own retention clock.",
      s: "live" as const,
    },
    {
      name: "Frames",
      api: "GET /v1/sessions/:id/frame.jpg",
      desc: "The current frame as a JPEG. Built for vision models and agents that need to look, not watch. An MCP server ships in the repo.",
      s: "live" as const,
    },
    {
      name: "Detections",
      api: "webhooks + /v1/detections",
      desc: "Open, lightweight vision models — intrusion, PPE, fire and smoke — running against your streams, results delivered as events.",
      s: "building" as const,
    },
  ];
  return (
    <section id="capabilities" className="max-w-5xl mx-auto w-full px-6 py-14">
      <SectionHead n="01" title="Capabilities" />
      <div className="flex flex-col">
        {rows.map((r) => (
          <div key={r.name} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6 py-5 border-t border-neutral-200 dark:border-neutral-800 first:border-t-0">
            <div className="md:col-span-3 flex items-baseline justify-between md:block">
              <span className="font-medium">{r.name}</span>
              <span className="md:hidden"><Status s={r.s} /></span>
            </div>
            <div className="md:col-span-3 font-mono text-xs text-neutral-500 pt-0.5 break-all">{r.api}</div>
            <div className="md:col-span-5 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{r.desc}</div>
            <div className="hidden md:block md:col-span-1 text-right pt-0.5"><Status s={r.s} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- architecture */

function Architecture() {
  return (
    <section id="architecture" className="max-w-5xl mx-auto w-full px-6 py-14">
      <SectionHead n="02" title="Architecture" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <ol className="lg:col-span-4 flex flex-col gap-6 text-sm leading-relaxed">
          <li>
            <div className="font-mono text-xs text-neutral-400 mb-1">1 · install</div>
            <p className="text-neutral-600 dark:text-neutral-400">
              One command puts the edge agent on any machine that can reach the camera's LAN.
              It connects outbound over HTTPS only. RTSP credentials never leave that machine.
            </p>
            <code className="mt-2 block font-mono text-xs text-neutral-500">curl -fsSL streamo.in/install.sh | sh</code>
          </li>
          <li>
            <div className="font-mono text-xs text-neutral-400 mb-1">2 · register</div>
            <p className="text-neutral-600 dark:text-neutral-400">
              Cameras are registered by ID through the API or dashboard. The cloud stores a
              name; the URL and password stay on the edge.
            </p>
          </li>
          <li>
            <div className="font-mono text-xs text-neutral-400 mb-1">3 · stream</div>
            <p className="text-neutral-600 dark:text-neutral-400">
              Your backend creates a session; the agent pushes the feed; your frontend embeds
              the returned URL. When the viewer leaves, everything stops.
            </p>
          </li>
        </ol>
        <div className="lg:col-span-8 border border-neutral-200 dark:border-neutral-800 p-5 overflow-x-auto">
          <pre className="text-[11.5px] md:text-xs font-mono text-neutral-600 dark:text-neutral-400 leading-relaxed">
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
          <p className="mt-4 font-mono text-xs text-neutral-500">
            Video never transits the control plane.
          </p>
        </div>
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
      desc: "The video layer above. Live, clips, frames — from any device on any network. Everything in section 01 marked live is in production.",
    },
    {
      n: "L2",
      name: "Understand",
      s: "building" as const,
      desc: "Open-source, lightweight vision models trained for specific jobs — intrusion, PPE, fire and smoke — running at the edge, exposed through the same API. The MCP server (agents that can look at a camera) is the first shipped piece.",
    },
    {
      n: "L3",
      name: "Act",
      s: "live" as const,
      desc: "Products assembled from L1 + L2. Foreman turns factory CCTV into safety and operations intelligence, in production today. A monitoring dashboard and BYO-camera home security are planned on the same stack.",
    },
  ];
  return (
    <section className="max-w-5xl mx-auto w-full px-6 py-14">
      <SectionHead n="03" title="The stack" />
      <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl -mt-4 mb-10 leading-relaxed">
        Streamo is a camera intelligence company. The API is the bottom of a three-layer
        stack; each layer is a customer of the one below it, starting with our own products.
      </p>
      <div className="flex flex-col">
        {layers.map((l) => (
          <div key={l.n} className="grid grid-cols-12 gap-4 md:gap-6 py-5 border-t border-neutral-200 dark:border-neutral-800">
            <div className="col-span-2 md:col-span-1 font-mono text-sm text-neutral-400">{l.n}</div>
            <div className="col-span-6 md:col-span-2 font-medium">{l.name}</div>
            <div className="col-span-4 md:col-span-2 md:order-last text-right"><Status s={l.s} /></div>
            <div className="col-span-12 md:col-span-7 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{l.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- roadmap */

function Roadmap() {
  const tracks: { track: string; items: { label: string; s: "live" | "building" | "planned" }[] }[] = [
    {
      track: "AI & agents",
      items: [
        { label: "Frames API for vision models", s: "live" },
        { label: "MCP server — agents watch cameras", s: "live" },
        { label: "Open vision models (intrusion, PPE, fire)", s: "building" },
        { label: "Detections API + event webhooks", s: "building" },
        { label: "Training-data pipelines for physical AI", s: "planned" },
      ],
    },
    {
      track: "Drones",
      items: [
        { label: "Agentless push from DJI / any encoder", s: "live" },
        { label: "Sub-second WebRTC (WHIP/WHEP)", s: "live" },
        { label: "Drone-in-a-box patrol monitoring", s: "planned" },
        { label: "Mission clips & flight archives", s: "planned" },
      ],
    },
    {
      track: "Robotics",
      items: [
        { label: "Teleop-assist viewing (<1s)", s: "live" },
        { label: "Fleet observability dashboards", s: "building" },
        { label: "ROS 2 edge agent", s: "planned" },
        { label: "Incident clips → training datasets", s: "planned" },
      ],
    },
    {
      track: "Homes & sites",
      items: [
        { label: "Foreman — factory intelligence", s: "live" },
        { label: "Multi-camera monitoring dashboard", s: "building" },
        { label: "BYO-camera home & small-business security", s: "planned" },
        { label: "Mobile alerts with event clips", s: "planned" },
      ],
    },
    {
      track: "Platform",
      items: [
        { label: "REST API, dashboard, self-serve keys", s: "live" },
        { label: "Bring your own media server (MediaMTX)", s: "live" },
        { label: "TypeScript & Python SDKs", s: "building" },
        { label: "Docs site, OpenAPI spec", s: "building" },
        { label: "Usage metering & billing", s: "planned" },
      ],
    },
    {
      track: "Trust",
      items: [
        { label: "Per-session viewer tokens, signed playback", s: "live" },
        { label: "Per-edge credential revocation", s: "live" },
        { label: "Rate limiting, audit logs", s: "planned" },
        { label: "SOC 2 path", s: "planned" },
      ],
    },
  ];
  return (
    <section id="roadmap" className="max-w-5xl mx-auto w-full px-6 py-14">
      <SectionHead n="04" title="Roadmap" />
      <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl -mt-4 mb-10 leading-relaxed">
        Status is reported as-is: <Status s="live" /> is in production, <Status s="building" /> is
        being built now, <Status s="planned" /> is committed direction. Design partners in the
        drone and robotics tracks steer priority — <a className="underline underline-offset-2" href="mailto:hello@streamo.in">hello@streamo.in</a>.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
        {tracks.map((t) => (
          <div key={t.track} className="py-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">{t.track}</div>
            <ul className="flex flex-col gap-2">
              {t.items.map((it) => (
                <li key={it.label} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-neutral-700 dark:text-neutral-300">{it.label}</span>
                  <Status s={it.s} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- properties */

function Properties() {
  const props = [
    ["No inbound connectivity", "The edge agent only dials out over HTTPS. No port forwarding, no public IPs, no VPN."],
    ["Credentials stay on the LAN", "RTSP URLs and passwords live in a file on the edge machine. The cloud stores camera names and IDs."],
    ["Streams are ephemeral", "Sessions exist while watched. Heartbeats stop → the stream is torn down within 30 seconds, server-side."],
    ["Playback is tokenized", "Every viewer gets a per-session token; stream URLs are signed and expire with the session."],
    ["Revocation is granular", "Any API key, and any single edge's credential, can be revoked without touching the rest."],
    ["Retention is explicit", "Live video is not stored. Clips persist exactly as long as their TTL, then delete themselves."],
  ];
  return (
    <section className="max-w-5xl mx-auto w-full px-6 py-14">
      <SectionHead n="05" title="Design properties" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
        {props.map(([k, v]) => (
          <div key={k} className="py-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="font-medium text-sm mb-1">{k}</div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{v}</p>
          </div>
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
      lines: ["100 viewer-minutes / month", "1 GB clip storage", "1 edge, unlimited cameras", "Community support"],
      cta: "Start free",
    },
    {
      name: "Usage",
      price: "$0.005",
      unit: "per viewer-minute",
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
      lines: ["Dedicated infrastructure, SLA", "BYO storage and media servers", "SSO, audit logs", "Priority support"],
      cta: "hello@streamo.in",
    },
  ];
  return (
    <section id="pricing" className="max-w-5xl mx-auto w-full px-6 py-14">
      <SectionHead n="06" title="Pricing" />
      <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl -mt-4 mb-10 leading-relaxed">
        Billed on what moves: minutes watched and gigabytes stored. Idle infrastructure is
        free — an unwatched camera costs nothing.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 border-t border-neutral-200 dark:border-neutral-800">
        {tiers.map((t) => (
          <div key={t.name} className="py-6 md:px-6 first:md:pl-0 last:md:pr-0 md:border-l border-neutral-200 dark:border-neutral-800 first:md:border-l-0 flex flex-col gap-4 border-b md:border-b-0">
            <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">{t.name}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-medium">{t.price}</span>
              {t.unit && <span className="text-xs text-neutral-500 font-mono">{t.unit}</span>}
            </div>
            <ul className="flex flex-col gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
              {t.lines.map((l) => (
                <li key={l} className="flex items-start gap-2">
                  <span className="font-mono text-neutral-400">·</span>
                  {l}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              {t.name === "Enterprise" ? (
                <a href="mailto:hello@streamo.in" className="font-mono text-sm underline underline-offset-4 hover:text-emerald-600">
                  {t.cta} →
                </a>
              ) : (
                <Show when="signed-out">
                  <SignUpButton mode="modal">
                    <button className="font-mono text-sm underline underline-offset-4 hover:text-emerald-600">{t.cta} →</button>
                  </SignUpButton>
                </Show>
              )}
            </div>
          </div>
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
      "What does streamo store?",
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
    <section id="faq" className="max-w-5xl mx-auto w-full px-6 py-14">
      <SectionHead n="07" title="Questions" />
      <div className="flex flex-col border-b border-neutral-200 dark:border-neutral-800">
        {qs.map(([q, a]) => (
          <details key={q} className="group border-t border-neutral-200 dark:border-neutral-800 py-4">
            <summary className="flex items-baseline justify-between cursor-pointer list-none gap-6">
              <span className="text-sm font-medium">{q}</span>
              <span className="font-mono text-neutral-400 group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-3xl">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- closing */

function Closing() {
  return (
    <section className="max-w-5xl mx-auto w-full px-6 py-20">
      <div className="border-t border-neutral-900 dark:border-neutral-100 pt-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <p className="font-mono text-xs text-neutral-500 mb-3">GET STARTED</p>
          <p className="text-2xl md:text-3xl font-medium tracking-tight max-w-xl">
            A camera on your desk can be live on the internet in the next fifteen minutes.
          </p>
          <p className="mt-3 text-sm text-neutral-500">
            Free tier, no card. The edge agent installs with one command.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-sm shrink-0">
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 hover:opacity-85">
                Get an API key →
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 hover:opacity-85">
              Open dashboard →
            </Link>
          </Show>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs text-neutral-500">
        <span>
          streamo<span className="text-emerald-600">.</span> — camera intelligence
        </span>
        <div className="flex items-center gap-5">
          <a href="#capabilities" className="hover:text-neutral-900 dark:hover:text-neutral-100">Capabilities</a>
          <a href="#roadmap" className="hover:text-neutral-900 dark:hover:text-neutral-100">Roadmap</a>
          <Link href="/showcase" className="hover:text-neutral-900 dark:hover:text-neutral-100">Demo</Link>
          <Link href="/download" className="hover:text-neutral-900 dark:hover:text-neutral-100">Download</Link>
          <a href="https://github.com/VishweshMashru/Relay" className="hover:text-neutral-900 dark:hover:text-neutral-100">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
