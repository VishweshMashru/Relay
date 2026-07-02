"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Shows a freshly-minted secret (API key, edge token) exactly once, with a
// copy button. Same pattern as the welcome page's key reveal.
export function SecretOnce({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-lg border border-emerald-300 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 flex flex-col gap-2">
      <div className="text-xs text-neutral-500">{label} — shown once, copy it now</div>
      <div className="flex items-center gap-2">
        <code className="font-mono text-xs break-all flex-1 select-all">{value}</code>
        <button
          onClick={copy}
          className="shrink-0 h-8 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 text-xs font-medium inline-flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {hint && <div className="text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}
