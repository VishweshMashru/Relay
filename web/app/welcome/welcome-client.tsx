"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, KeyRound, ArrowRight } from "lucide-react";

export function WelcomeClient({
  apiKey,
  projectId,
  email,
}: {
  apiKey: string;
  projectId: string;
  email: string;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="inline-flex self-start items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 px-3 py-1 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Account created for {email}
        </span>
        <h1 className="text-3xl font-medium tracking-tight">Save your API key</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          This is the only time we’ll show it. Paste it into your app’s config or a password
          manager. If you lose it, create a new one from the dashboard — the old one stops
          working the moment you revoke it.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <KeyRound className="w-4 h-4" />
          Your API key
        </div>
        <div
          onClick={() => setRevealed(true)}
          className="font-mono text-sm break-all rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-4 py-3 cursor-pointer select-all"
        >
          {revealed ? apiKey : `rk_live_${"•".repeat(32)}`}
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <button
            onClick={copy}
            className="h-10 px-4 rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 text-sm font-medium inline-flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
          {!revealed && (
            <button
              onClick={() => setRevealed(true)}
              className="h-10 px-4 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm font-medium"
            >
              Reveal
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 flex flex-col gap-3">
        <div className="text-sm text-neutral-500">Project ID</div>
        <div className="font-mono text-xs text-neutral-700 dark:text-neutral-300">{projectId}</div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">What now?</h2>
        <ol className="flex flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-400 list-decimal list-inside">
          <li>Store the key as <code className="font-mono text-xs bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded">RELAY_API_KEY</code> in your app’s env.</li>
          <li>Provision your first edge from the Edges page.</li>
          <li>Register a camera and try a session from your backend.</li>
        </ol>
        <Link
          href="/dashboard"
          className="mt-3 self-start h-11 px-5 rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 text-sm font-medium inline-flex items-center gap-1.5"
        >
          I saved my key — go to the dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
