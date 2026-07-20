import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import {
  ArrowRight,
  Check,
  CircleDot,
  Cloud,
  Database,
  Eye,
  KeyRound,
  LockKeyhole,
  Radio,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { Reveal } from "@/components/reveal";

const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#174d38] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#103d2c]";
const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cfcfc7] bg-white/50 px-5 text-sm font-semibold text-[#1e2c26] transition-colors hover:border-[#9fa59f] hover:bg-white";

export default function Landing() {
  return (
    <div className="streamo-landing flex min-h-full flex-1 flex-col bg-[#f4f3ee] text-[#1d2823] selection:bg-[#b8dccb]">
      <Nav />
      <main>
        <Hero />
        <ProofStrip />
        <HowItWorks />
        <Capabilities />
        <Security />
        <UseCases />
        <Pricing />
        <FAQ />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className={`relative flex h-7 w-7 items-center justify-center rounded-[9px] border ${
          inverse ? "border-white/25 bg-white/10" : "border-[#b8c0ba] bg-white/60"
        }`}
      >
        <span className={`h-2.5 w-2.5 rounded-full border ${inverse ? "border-[#9bd3b8]" : "border-[#28684d]"}`} />
        <span className={`absolute h-1 w-1 rounded-full ${inverse ? "bg-[#9bd3b8]" : "bg-[#28684d]"}`} />
      </span>
      <span className={`font-display text-lg font-semibold tracking-[-0.03em] ${inverse ? "text-white" : "text-[#15221c]"}`}>
        streamo
      </span>
    </span>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-[#dcdcd5]/90 bg-[#f4f3ee]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Streamo home">
          <Brand />
        </Link>
        <div className="hidden items-center gap-7 text-[13px] font-medium text-[#59625d] md:flex">
          <a href="#product" className="transition-colors hover:text-[#15221c]">
            Product
          </a>
          <a href="#security" className="transition-colors hover:text-[#15221c]">
            Security
          </a>
          <a href="#use-cases" className="transition-colors hover:text-[#15221c]">
            Use cases
          </a>
          <a href="#pricing" className="transition-colors hover:text-[#15221c]">
            Pricing
          </a>
          <Link href="/download" className="transition-colors hover:text-[#15221c]">
            Download
          </Link>
        </div>
        <div className="flex items-center gap-2.5">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="hidden h-9 px-3 text-sm font-medium text-[#4d5751] transition-colors hover:text-[#15221c] sm:block">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1b2a23] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#174d38]">
                Get an API key
                <ArrowRight size={14} />
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center rounded-lg bg-[#1b2a23] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#174d38]"
            >
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
    <header className="landing-wash relative overflow-hidden border-b border-[#deded7]">
      <div className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
        <div className="relative z-10 max-w-5xl">
          <Reveal>
            <div className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#416654]">
              <span className="h-px w-8 bg-[#5c8873]" />
              Video infrastructure for physical devices
            </div>
            <h1 className="font-display text-[3rem] font-semibold leading-[0.98] tracking-[-0.055em] text-[#122019] sm:text-[4.4rem] lg:text-[5.45rem]">
              Live video from cameras your network can’t reach.
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-9 grid max-w-4xl gap-8 border-t border-[#d5d8d1] pt-7 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-12">
              <div>
                <p className="max-w-2xl text-base leading-7 text-[#5b645f] sm:text-lg sm:leading-8">
                  Streamo turns RTSP cameras, drones, and robots into secure, on-demand streams and clips. One lightweight edge agent, one API, and no port forwarding.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#747b77]">
                  <span>RTSP · RTMPS · HLS · WebRTC</span>
                  <a
                    href="https://github.com/VishweshMashru/Relay"
                    className="border-b border-[#bcc2bd] pb-0.5 transition-colors hover:border-[#496b59] hover:text-[#244d38]"
                  >
                    Open source edge agent
                  </a>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 sm:justify-end">
                <Show when="signed-out">
                  <SignUpButton mode="modal">
                    <button className={primaryButton}>
                      Start with an API key <ArrowRight size={16} />
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Link href="/dashboard" className={primaryButton}>
                    Open dashboard <ArrowRight size={16} />
                  </Link>
                </Show>
                <a href="#how" className={secondaryButton}>
                  See how it works
                </a>
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal delay={180}>
          <div className="mt-16 flex items-center gap-4 border-t border-[#d5d8d1] pt-5 text-[11px] text-[#78807b] sm:mt-20">
            <span className="font-mono uppercase tracking-[0.12em] text-[#466a58]">A direct media path</span>
            <span className="h-px flex-1 bg-[#d5d8d1]" />
            <span className="hidden sm:block">camera → edge → media plane → viewer</span>
          </div>
        </Reveal>
      </div>
    </header>
  );
}

function ProofStrip() {
  const items = [
    ["Outbound only", "No VPN or port forwarding"],
    ["On demand", "Nothing runs while idle"],
    ["Your choice", "Cloud CDN or self-hosted"],
    ["Private by default", "Signed, expiring playback"],
  ];
  return (
    <section className="border-b border-[#deded7] bg-[#efeee8]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-8 lg:grid-cols-4">
        {items.map(([title, body], index) => (
          <div
            key={title}
            className={`py-6 ${index % 2 ? "pl-5" : "pr-5"} ${index > 0 ? "lg:border-l lg:border-[#d8d8d1] lg:pl-7" : ""}`}
          >
            <p className="text-xs font-semibold text-[#26372f]">{title}</p>
            <p className="mt-1 text-xs leading-5 text-[#747b77]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionIntro({
  label,
  title,
  body,
  inverse = false,
}: {
  label: string;
  title: string;
  body?: string;
  inverse?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${inverse ? "text-[#8bc1a6]" : "text-[#48715d]"}`}>
        {label}
      </p>
      <h2 className={`mt-4 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl ${inverse ? "text-white" : "text-[#15221c]"}`}>
        {title}
      </h2>
      {body && <p className={`mt-5 text-base leading-7 ${inverse ? "text-white/55" : "text-[#626a65]"}`}>{body}</p>}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Install beside the camera",
      body: "Run the edge agent on any Windows, Linux, or macOS machine that can reach the camera over the LAN. Camera credentials stay there.",
      meta: "One command · automatic updates",
    },
    {
      n: "02",
      title: "Create a session",
      body: "Your backend asks for a stream. Streamo provisions the media path and wakes the edge over its existing outbound HTTPS connection.",
      meta: "POST /v1/sessions",
    },
    {
      n: "03",
      title: "Embed the returned URL",
      body: "Play signed HLS in your application, request a JPEG frame for an agent, or keep the recording as a clip with an explicit retention period.",
      meta: "Viewer leaves · stream stops",
    },
  ];
  return (
    <section id="how" className="bg-[#f8f7f3] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
        <Reveal>
          <div className="lg:sticky lg:top-28">
            <SectionIntro
              label="How it works"
              title="A private route out, opened only when it’s needed."
              body="The control plane coordinates access. The video itself moves directly from your edge to the media plane, never through Streamo’s API servers."
            />
            <div className="mt-8 rounded-xl border border-[#d9dbd5] bg-[#f1f1ec] p-4 font-mono text-[11px] leading-5 text-[#5f6963]">
              <span className="text-[#28684d]">$</span> curl -fsSL streamo.in/install.sh | sh
            </div>
          </div>
        </Reveal>
        <div>
          {steps.map((step, index) => (
            <Reveal key={step.n} delay={index * 70}>
              <article className="grid gap-4 border-t border-[#d9d9d2] py-9 sm:grid-cols-[56px_1fr_auto] sm:gap-7 sm:py-11">
                <span className="font-mono text-xs text-[#668070]">{step.n}</span>
                <div>
                  <h3 className="font-display text-xl font-semibold tracking-[-0.025em] text-[#18251f] sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#626b66] sm:text-[15px]">{step.body}</p>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#87908a] sm:pt-1 sm:text-right">
                  {step.meta}
                </p>
              </article>
            </Reveal>
          ))}
          <div className="border-t border-[#d9d9d2]" />
        </div>
      </div>
    </section>
  );
}

function Capabilities() {
  const capabilities = [
    {
      icon: Radio,
      title: "Live sessions",
      body: "Open an RTSP camera only while someone is watching. Return tokenized HLS for the browser, with automatic teardown when heartbeats stop.",
      code: "POST /v1/sessions",
    },
    {
      icon: Cloud,
      title: "Push ingest",
      body: "Skip the edge entirely for drones, OBS, phones, or robots. Publish over RTMPS—or WHIP for sub-second WebRTC playback.",
      code: '{ "ingest": "push" }',
    },
    {
      icon: Database,
      title: "Clips and recordings",
      body: "Upload clips directly to S3-compatible storage or keep a live session recording. Retention belongs to each asset, not an account-wide policy.",
      code: "POST /v1/assets",
    },
    {
      icon: Eye,
      title: "Frames for AI",
      body: "Request the current frame as a JPEG. The included MCP server lets an agent find a camera, look once, and close the session when it is done.",
      code: "GET …/frame.jpg",
    },
  ];
  return (
    <section id="product" className="border-y border-[#26382f] bg-[#17231d] py-24 text-white sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <SectionIntro
              inverse
              label="The product"
              title="One API across live and stored video."
              body="Use only the pieces you need. Every endpoint is scoped to a project key, and every live session carries its own expiry."
            />
            <Link
              href="/showcase"
              className="inline-flex items-center gap-2 self-start border-b border-white/25 pb-1 text-sm font-medium text-white transition-colors hover:border-white lg:self-auto"
            >
              See the reference viewer <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
        <div className="mt-16 grid border-y border-white/10 md:grid-cols-2">
          {capabilities.map((item, index) => (
            <Reveal key={item.title} delay={(index % 2) * 70}>
              <article
                className={`min-h-full py-9 md:p-10 ${index % 2 === 0 ? "md:border-r md:border-white/10" : "md:pl-12"} ${index > 1 ? "border-t border-white/10" : index === 1 ? "border-t border-white/10 md:border-t-0" : ""}`}
              >
                <item.icon size={20} strokeWidth={1.6} className="text-[#8dc5a9]" />
                <h3 className="mt-8 font-display text-2xl font-semibold tracking-[-0.03em]">{item.title}</h3>
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/55">{item.body}</p>
                <code className="mt-7 inline-block rounded-md bg-black/20 px-2.5 py-1.5 font-mono text-[10px] text-[#9ac8b0]">
                  {item.code}
                </code>
              </article>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-white/40">
          <span className="inline-flex items-center gap-2"><Check size={13} className="text-[#83c6a3]" /> Cloudflare Stream</span>
          <span className="inline-flex items-center gap-2"><Check size={13} className="text-[#83c6a3]" /> Self-hosted MediaMTX</span>
          <span className="inline-flex items-center gap-2"><Check size={13} className="text-[#83c6a3]" /> S3-compatible storage</span>
          <span className="inline-flex items-center gap-2"><Check size={13} className="text-[#83c6a3]" /> Plain REST + bearer keys</span>
        </div>
      </div>
    </section>
  );
}

function Security() {
  const promises = [
    [LockKeyhole, "Credentials stay local", "RTSP URLs and passwords live on the edge machine. The cloud stores only the camera name and ID."],
    [TimerReset, "Sessions expire", "A hard TTL and viewer heartbeats ensure a stream cannot run—or bill—indefinitely."],
    [KeyRound, "Granular revocation", "Revoke a project API key or rotate one edge token without disturbing the rest of the fleet."],
    [ShieldCheck, "Playback is short-lived", "Viewer tokens and signed playback URLs expire with the session that created them."],
  ] as const;
  return (
    <section id="security" className="bg-[#f4f3ee] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-24">
        <Reveal>
          <div>
            <SectionIntro
              label="Security model"
              title="The safest stream is the one that isn’t running."
              body="Streamo is built around temporary access. Idle cameras stay private, live sessions are bounded, and stored video exists only when you explicitly keep it."
            />
            <div className="mt-10 overflow-hidden rounded-2xl border border-[#cbd0ca] bg-[#e8ebe5]">
              <div className="flex items-center gap-3 border-b border-[#cbd0ca] px-5 py-4 text-xs font-semibold text-[#304b3d]">
                <CircleDot size={14} /> Media path
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-7 text-center text-xs text-[#44534b]">
                <span>Camera</span><ArrowRight size={14} className="text-[#839089]" /><span>Edge agent</span><ArrowRight size={14} className="text-[#839089]" /><span>Media plane</span><ArrowRight size={14} className="text-[#839089]" /><span>Viewer</span>
              </div>
              <div className="border-t border-[#cbd0ca] bg-white/45 px-5 py-3 text-center text-[11px] text-[#66716a]">
                The control plane coordinates this path. It is not in it.
              </div>
            </div>
          </div>
        </Reveal>
        <div className="grid gap-8 sm:grid-cols-2">
          {promises.map(([Icon, title, body], index) => (
            <Reveal key={title} delay={(index % 2) * 70}>
              <article className="border-t border-[#ced1ca] pt-6">
                <Icon size={19} strokeWidth={1.6} className="text-[#346c50]" />
                <h3 className="mt-6 font-display text-lg font-semibold tracking-[-0.02em] text-[#19261f]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#68706c]">{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  const cases = [
    ["Factories & warehouses", "Open existing CCTV only for safety reviews, incident response, or operational tools."],
    ["Drones & robots", "Push live video directly from an encoder, with WebRTC when operators need lower latency."],
    ["Fleet & field devices", "Give every vehicle or remote device a consistent streaming and clip API."],
  ];
  return (
    <section id="use-cases" className="border-y border-[#deded7] bg-[#efeee8] py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#48715d]">Built for the physical world</p>
            <h2 className="font-display text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#15221c] sm:text-5xl">
              One video layer, across devices and industries.
            </h2>
          </div>
        </Reveal>
        <div className="mt-14 grid border-t border-[#ced0c9] md:grid-cols-3">
          {cases.map(([title, body], index) => (
            <Reveal key={title} delay={index * 60}>
              <article className={`py-8 md:min-h-[210px] md:px-8 ${index > 0 ? "border-t border-[#ced0c9] md:border-l md:border-t-0" : "md:pl-0"}`}>
                <span className="font-mono text-[10px] text-[#7b847e]">0{index + 1}</span>
                <h3 className="mt-8 font-display text-xl font-semibold tracking-[-0.025em] text-[#1d2b24]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#68706c]">{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const included = [
    "No per-camera fee",
    "Unlimited cameras on each edge",
    "Clips billed by stored GB",
    "Self-hosted media plane available",
  ];
  return (
    <section id="pricing" className="bg-[#f8f7f3] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="grid gap-10 rounded-[24px] border border-[#d4d6d0] bg-white/65 p-7 shadow-[0_20px_60px_rgba(33,48,40,0.06)] sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-14">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#48715d]">Simple usage pricing</p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.045em] text-[#15221c] sm:text-4xl">Pay for video that moves.</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-[#68706c]">An idle camera costs nothing. Start on the free tier, then pay for viewer minutes and clips as your usage grows.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Show when="signed-out">
                  <SignUpButton mode="modal"><button className={primaryButton}>Start free <ArrowRight size={16} /></button></SignUpButton>
                </Show>
                <a href="mailto:hello@streamo.in" className={secondaryButton}>Talk to us</a>
              </div>
            </div>
            <div className="grid gap-8 border-t border-[#d9dbd5] pt-8 sm:grid-cols-2 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
              <div>
                <p className="text-xs font-semibold text-[#6d756f]">Free</p>
                <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-[#18251f]">$0</p>
                <p className="mt-2 text-xs text-[#7c847f]">100 viewer-minutes / month</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6d756f]">Then</p>
                <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-[#18251f]">$0.005</p>
                <p className="mt-2 text-xs text-[#7c847f]">per viewer-minute</p>
              </div>
              <ul className="grid gap-3 border-t border-[#e0e1dc] pt-6 text-sm text-[#59635d] sm:col-span-2 sm:grid-cols-2">
                {included.map((item) => <li key={item} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-[#347052]" />{item}</li>)}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FAQ() {
  const questions = [
    ["Does it work with existing CCTV?", "Yes. Anything that exposes an RTSP feed can be registered. The edge agent transcodes sources such as H.265 into a browser-compatible stream when needed."],
    ["How much latency should I expect?", "HLS is typically 5–15 seconds. Push-ingest sessions can use WHIP and WHEP for sub-second WebRTC playback. WebRTC from RTSP edge cameras is not shipped yet."],
    ["What does Streamo store?", "Camera names and IDs, session metadata, and only the clips or recordings you explicitly keep. RTSP credentials remain on your edge machine."],
    ["Can I run the media plane myself?", "Yes. A project can use self-hosted MediaMTX instead of Cloudflare Stream. You trade global CDN delivery, recordings, and signed URLs for flat infrastructure cost."],
  ];
  return (
    <section className="bg-[#f8f7f3] pb-24 sm:pb-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.65fr_1.35fr] lg:gap-24">
        <Reveal><SectionIntro label="Questions" title="The practical details." /></Reveal>
        <Reveal delay={70}>
          <div className="border-t border-[#d4d6d0]">
            {questions.map(([question, answer]) => (
              <details key={question} className="group border-b border-[#d4d6d0] py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-sm font-semibold text-[#233129]">
                  {question}
                  <span className="text-xl font-light text-[#77817b] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-2xl pb-2 pt-4 text-sm leading-6 text-[#68706c]">{answer}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="border-t border-[#2b3c33] bg-[#17231d] py-20 text-white sm:py-24">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-10 px-5 sm:px-8 lg:flex-row lg:items-center">
        <Reveal>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8bc1a6]">Start with one camera</p>
            <h2 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl">From private RTSP feed to a secure viewer in minutes.</h2>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Show when="signed-out"><SignUpButton mode="modal"><button className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#b9e0cc] px-5 text-sm font-semibold text-[#123022] transition-colors hover:bg-white">Get an API key <ArrowRight size={16} /></button></SignUpButton></Show>
            <Show when="signed-in"><Link href="/dashboard" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#b9e0cc] px-5 text-sm font-semibold text-[#123022]">Open dashboard <ArrowRight size={16} /></Link></Show>
            <Link href="/download" className="inline-flex h-11 items-center rounded-lg border border-white/20 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10">Download the edge</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#111a15] text-white/55">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 py-9 sm:px-8 md:flex-row md:items-center">
        <div>
          <Brand inverse />
          <p className="mt-3 text-xs text-white/35">Video infrastructure for physical devices.</p>
        </div>
        <div className="flex flex-wrap gap-x-7 gap-y-3 text-xs">
          <a href="#product" className="hover:text-white">Product</a>
          <a href="#security" className="hover:text-white">Security</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <Link href="/showcase" className="hover:text-white">Demo</Link>
          <Link href="/download" className="hover:text-white">Download</Link>
          <a href="https://github.com/VishweshMashru/Relay" className="hover:text-white">GitHub</a>
          <a href="mailto:hello@streamo.in" className="hover:text-white">Contact</a>
        </div>
      </div>
    </footer>
  );
}
