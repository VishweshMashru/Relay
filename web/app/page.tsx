import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

// Landing page. Editorial, not "developer website": warm paper, ink, a serif
// display voice, one readable column, prose instead of panels. Monospace
// appears exactly once — on actual code. Restraint is the design.

const ink = "text-[#211f1a]";
const soft = "text-[#6d675c]";
const line = "border-[#e4dfd3]";

export default function Landing() {
  return (
    <div className={`flex flex-1 flex-col bg-[#faf8f2] ${ink}`}>
      <Top />
      <main className="w-full max-w-[44rem] mx-auto px-6 flex-1">
        <Hero />
        <Code />
        <WhatItDoes />
        <HowItWorks />
        <Direction />
        <Principles />
        <Plans />
        <End />
      </main>
      <Bottom />
    </div>
  );
}

/* -------------------------------------------------------------------- top */

function Top() {
  return (
    <div className={`border-b ${line}`}>
      <div className="w-full max-w-[44rem] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl italic">
          streamo
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/showcase" className={`${soft} hover:${ink} hover:text-[#211f1a]`}>
            Demo
          </Link>
          <Link href="/download" className={`hidden sm:inline ${soft} hover:text-[#211f1a]`}>
            Download
          </Link>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className={`${soft} hover:text-[#211f1a]`}>Sign in</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="underline underline-offset-4 decoration-[#c9c2b2] hover:decoration-[#211f1a]">
              Dashboard
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="pt-20 md:pt-28 pb-14">
      <h1 className="font-serif text-4xl md:text-[3.4rem] leading-[1.12] tracking-tight">
        Watch any camera, from anywhere, without exposing it to the internet.
      </h1>
      <p className={`mt-7 text-[17px] leading-relaxed ${soft} max-w-[38rem]`}>
        Streamo is a video API for the physical world — factory CCTV, drones, robots, the
        camera on your desk. A small agent on the local network dials out; streams start
        when someone watches and stop when they leave; clips are kept exactly as long as
        you decide. Vision models, including AI agents, can look at any frame.
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-5">
        <Show when="signed-out">
          <SignUpButton mode="modal">
            <button className="bg-[#211f1a] text-[#faf8f2] px-6 py-3 text-sm rounded-full hover:bg-[#3a372f]">
              Get an API key
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link href="/dashboard" className="bg-[#211f1a] text-[#faf8f2] px-6 py-3 text-sm rounded-full hover:bg-[#3a372f]">
            Open the dashboard
          </Link>
        </Show>
        <Link href="/showcase" className="text-sm underline underline-offset-4 decoration-[#c9c2b2] hover:decoration-[#211f1a]">
          Watch a live camera first
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- code */

function Code() {
  return (
    <section className="pb-20">
      <div className={`border ${line} rounded-lg bg-white/60`}>
        <pre className="p-5 font-mono text-[13px] leading-6 overflow-x-auto text-[#3a372f]">
{`$ curl api.streamo.in/v1/sessions -X POST \\
    -H "Authorization: Bearer rk_live_••••" \\
    -d '{"camera_id": "730b91a9-…"}'

{ "viewer_url": "https://…/video.m3u8", "status": "pending" }`}
        </pre>
      </div>
      <p className={`mt-3 text-sm ${soft}`}>
        The first production stream took fifteen seconds from this request to playing video.
        That's the whole integration: one call, one URL, one <span className="font-mono text-[12px]">&lt;video&gt;</span> tag.
      </p>
    </section>
  );
}

/* ----------------------------------------------------------- what it does */

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-[1.8rem] leading-snug mb-6">{children}</h2>;
}

function WhatItDoes() {
  const items: [string, string][] = [
    [
      "Live sessions.",
      "Start a stream from any registered camera on demand. Idle cameras cost nothing; abandoned streams shut themselves down within thirty seconds.",
    ],
    [
      "Direct push.",
      "No agent needed for devices that can send video themselves — a drone controller or OBS streams to a URL the API hands you. Sub-second WebRTC is available on this path.",
    ],
    [
      "Clips.",
      "Keep the recording of any session, or upload clips from the edge, each with its own retention clock. Playback and download links are signed and expire.",
    ],
    [
      "Frames for machines.",
      "Any live session can be read one JPEG at a time — built for vision models and AI agents. An MCP server ships with the platform, so an assistant can list your cameras and look at one.",
    ],
  ];
  return (
    <section className="pb-20">
      <H2>What it does</H2>
      <div className="flex flex-col gap-6">
        {items.map(([lead, rest]) => (
          <p key={lead} className="text-[16px] leading-relaxed">
            <span className="font-medium">{lead}</span>{" "}
            <span className={soft}>{rest}</span>
          </p>
        ))}
        <p className={`text-[16px] leading-relaxed ${soft}`}>
          <span className="font-serif italic">In development —</span> detections: open,
          lightweight vision models for intrusion, protective equipment, fire and smoke,
          running against your streams and delivered as events.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ how it works */

function HowItWorks() {
  const steps: [string, string][] = [
    [
      "Install the agent",
      "One command on any machine that can reach the camera's network. It connects outward over HTTPS only — no port forwarding, no VPN, and the camera's credentials never leave that machine.",
    ],
    [
      "Register cameras",
      "Each camera gets an ID through the API or dashboard. The cloud knows its name; the address and password stay local.",
    ],
    [
      "Create a session",
      "Your backend asks for a stream, embeds the returned URL, and forgets about it. Video travels from the edge to the viewer through a media plane — Cloudflare's network, or a server you run, switchable in one setting.",
    ],
  ];
  return (
    <section className="pb-20">
      <H2>How it works</H2>
      <ol className="flex flex-col gap-8">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-5">
            <span className="font-serif italic text-xl text-[#a49d8d] pt-0.5 select-none">{i + 1}.</span>
            <div>
              <div className="font-medium mb-1">{title}</div>
              <p className={`text-[15.5px] leading-relaxed ${soft}`}>{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className={`mt-8 text-[15.5px] leading-relaxed ${soft}`}>
        Video never passes through the control plane. Streamo's servers coordinate; the
        pixels take the shortest sensible path.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------- direction */

function Direction() {
  const rows: [string, string][] = [
    ["Live streaming, clips, frames, direct push", "available now"],
    ["MCP server — AI agents that can look at a camera", "available now"],
    ["Bring your own media server", "available now"],
    ["Open vision models: intrusion, PPE, fire & smoke", "in development"],
    ["Detections API and event webhooks", "in development"],
    ["TypeScript and Python SDKs, documentation site", "in development"],
    ["Fleet views for drones and robots", "planned"],
    ["Home and small-business monitoring", "planned"],
    ["Training-data pipelines for physical AI", "planned"],
  ];
  return (
    <section className="pb-20">
      <H2>Where this is going</H2>
      <p className={`text-[16px] leading-relaxed ${soft} mb-8 max-w-[38rem]`}>
        Streamo is being built as a camera intelligence company: first move the video, then
        understand it, then ship complete products on top. Foreman, our factory-intelligence
        product, runs on this platform in production today — every layer has a real customer
        before it's offered to anyone else.
      </p>
      <div className={`border-t ${line}`}>
        {rows.map(([what, status]) => (
          <div key={what} className={`flex items-baseline justify-between gap-6 py-3 border-b ${line}`}>
            <span className="text-[15px]">{what}</span>
            <span className={`font-serif italic text-sm whitespace-nowrap ${status === "available now" ? "text-[#2e5e4e]" : soft}`}>
              {status}
            </span>
          </div>
        ))}
      </div>
      <p className={`mt-5 text-sm ${soft}`}>
        Building with drones or robots? Early design partners steer this list —{" "}
        <a href="mailto:hello@streamo.in" className="underline underline-offset-4 decoration-[#c9c2b2] hover:decoration-[#211f1a]">
          hello@streamo.in
        </a>
        .
      </p>
    </section>
  );
}

/* -------------------------------------------------------------- principles */

function Principles() {
  return (
    <section className="pb-20">
      <H2>Principles</H2>
      <div className={`flex flex-col gap-5 text-[15.5px] leading-relaxed ${soft}`}>
        <p>
          <span className={`font-medium ${ink}`}>Nothing is exposed.</span> The agent only
          dials out. There is no inbound port, no public address, nothing to scan.
        </p>
        <p>
          <span className={`font-medium ${ink}`}>Nothing outlives its use.</span> Streams
          end when viewers leave. Live video is never stored unless you ask; clips delete
          themselves when their time is up.
        </p>
        <p>
          <span className={`font-medium ${ink}`}>Nothing is irrevocable.</span> Every key,
          every viewer link, and every individual edge machine can be cut off on its own,
          immediately, from the dashboard.
        </p>
        <p>
          <span className={`font-medium ${ink}`}>Nothing is hidden.</span> The platform is
          open source, the roadmap is public, and what isn't finished is labeled that way.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ plans */

function Plans() {
  return (
    <section className="pb-20">
      <H2>Pricing</H2>
      <div className={`flex flex-col gap-5 text-[15.5px] leading-relaxed ${soft}`}>
        <p>
          <span className={`font-medium ${ink}`}>Free</span> to start: a hundred watched
          minutes and a gigabyte of clips each month, one edge, unlimited cameras. No card.
        </p>
        <p>
          <span className={`font-medium ${ink}`}>Then usage:</span> half a cent per watched
          minute and two cents per gigabyte-month of clips. No per-camera fees, no minimums —
          an unwatched camera costs nothing. Running your own media server makes streaming
          effectively flat-cost.
        </p>
        <p>
          <span className={`font-medium ${ink}`}>Enterprise</span> — dedicated
          infrastructure, SLAs, your own storage:{" "}
          <a href="mailto:hello@streamo.in" className="underline underline-offset-4 decoration-[#c9c2b2] hover:decoration-[#211f1a]">
            hello@streamo.in
          </a>
          .
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- end */

function End() {
  return (
    <section className={`border-t ${line} py-16 mb-8`}>
      <p className="font-serif text-2xl md:text-[1.9rem] leading-snug max-w-[34rem]">
        A camera on your desk can be live on the internet in the next fifteen minutes.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-5">
        <Show when="signed-out">
          <SignUpButton mode="modal">
            <button className="bg-[#211f1a] text-[#faf8f2] px-6 py-3 text-sm rounded-full hover:bg-[#3a372f]">
              Get an API key
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link href="/dashboard" className="bg-[#211f1a] text-[#faf8f2] px-6 py-3 text-sm rounded-full hover:bg-[#3a372f]">
            Open the dashboard
          </Link>
        </Show>
        <a
          href="https://github.com/VishweshMashru/Relay"
          className="text-sm underline underline-offset-4 decoration-[#c9c2b2] hover:decoration-[#211f1a]"
        >
          Read the source
        </a>
      </div>
    </section>
  );
}

function Bottom() {
  return (
    <footer className={`border-t ${line}`}>
      <div className={`w-full max-w-[44rem] mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm ${soft}`}>
        <span className="font-serif italic">streamo — camera intelligence</span>
        <div className="flex items-center gap-5">
          <Link href="/showcase" className="hover:text-[#211f1a]">Demo</Link>
          <Link href="/download" className="hover:text-[#211f1a]">Download</Link>
          <a href="https://github.com/VishweshMashru/Relay" className="hover:text-[#211f1a]">GitHub</a>
          <a href="mailto:hello@streamo.in" className="hover:text-[#211f1a]">Contact</a>
        </div>
      </div>
    </footer>
  );
}
