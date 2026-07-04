"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StopSession({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function stop() {
    setBusy(true);
    try {
      await fetch(`/api/dashboard/sessions/${id}`, { method: "DELETE" });
    } finally {
      router.refresh();
    }
  }

  return (
    <button
      onClick={stop}
      disabled={busy}
      className="text-xs text-red-500/80 hover:text-red-500 underline underline-offset-2 disabled:opacity-60"
    >
      {busy ? "stopping…" : "stop"}
    </button>
  );
}
