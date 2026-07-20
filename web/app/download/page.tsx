import Link from "next/link";
import type { Metadata } from "next";
import { Apple, ArrowRight, Download, Radio, Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "Download relay-edge — streamo",
  description:
    "Install the streamo edge agent on the machine that lives on your camera's network. One command, runs as a service, outbound HTTPS only.",
};

const BINARIES = [
  { label: "Linux x86-64", file: "relay-edge-linux-amd64", note: "servers, mini-PCs, most VMs" },
  { label: "Linux ARM64", file: "relay-edge-linux-arm64", note: "Raspberry Pi 4/5, ARM boxes" },
  { label: "Windows x86-64", file: "relay-edge-windows-amd64.exe", note: "factory PCs, NVR machines" },
  { label: "macOS Apple Silicon", file: "relay-edge-darwin-arm64", note: "M-series Macs" },
];

export default function DownloadPage() {
  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 flex flex-col gap-12 w-full">
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2 font-mono font-semibold text-lg self-start">
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <Radio className="w-3.5 h-3.5 text-white" />
            </span>
            streamo
          </Link>
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight mt-4">Download the edge agent</h1>
          <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl">
            relay-edge runs on any machine that can reach your camera on its LAN. It connects
            out via HTTPS — no port forwarding, no public IP — and opens the camera’s RTSP
            feed only when a session asks for it. RTSP credentials never leave the machine.
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            One-line install <span className="text-xs font-normal text-neutral-500">(recommended)</span>
          </h2>
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-2 text-xs text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                Linux / macOS — installs the binary, ffmpeg, and a system service
              </div>
              <pre className="p-4 text-[13px] font-mono overflow-x-auto bg-neutral-950 text-neutral-200">
                {"curl -fsSL https://streamo.in/install.sh | RELAY_EDGE_TOKEN=<your-token> sh"}
              </pre>
            </div>
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-2 text-xs text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                Windows — PowerShell as Administrator
              </div>
              <pre className="p-4 text-[13px] font-mono overflow-x-auto bg-neutral-950 text-neutral-200">
                {"$env:RELAY_EDGE_TOKEN='<your-token>'; iwr https://streamo.in/install.ps1 -useb | iex"}
              </pre>
            </div>
          </div>
          <p className="text-sm text-neutral-500">
            Get your token by provisioning an edge in the{" "}
            <Link href="/dashboard/edges" className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-50">
              dashboard
            </Link>
            {" "}— it shows the exact command with the token filled in.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Direct binaries
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BINARIES.map((b) => (
              <a
                key={b.file}
                href={`/download/${b.file}`}
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between gap-3 hover:border-emerald-500/50 transition-colors group"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    {b.label.startsWith("macOS") && <Apple className="w-3.5 h-3.5" />}
                    {b.label}
                  </span>
                  <span className="text-xs text-neutral-500">{b.note}</span>
                  <span className="text-xs font-mono text-neutral-400 truncate">{b.file}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-500 shrink-0" />
              </a>
            ))}
          </div>
          <p className="text-sm text-neutral-500">
            Always the latest release. Verify with{" "}
            <a href="/download/SHA256SUMS" className="font-mono text-xs underline underline-offset-2">
              SHA256SUMS
            </a>
            . Manual setup needs <span className="font-mono text-xs">RELAY_EDGE_TOKEN</span> in the
            environment and ffmpeg on the PATH — the installer handles both for you.
          </p>
        </section>

        <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-3">
          <h2 className="text-base font-medium">After installing</h2>
          <ol className="flex flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-400 list-decimal list-inside">
            <li>The agent appears as <span className="text-emerald-600 dark:text-emerald-400">online</span> on the edges page within ~30 seconds.</li>
            <li>Register cameras from the dashboard, then map each camera ID to its RTSP URL in <span className="font-mono text-xs">cameras.json</span> on the machine.</li>
            <li>Create a session from your backend — the stream starts on demand.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
