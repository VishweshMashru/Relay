"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "../_ui";
import { SecretOnce } from "@/components/secret-once";

export function CreateKey() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ api_key: string; label: string } | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setCreated(await res.json());
      setLabel("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 items-end">
      {!open ? (
        <PrimaryButton onClick={() => setOpen(true)}>Create key</PrimaryButton>
      ) : (
        <form onSubmit={create} className="flex gap-2 items-center">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. production)"
            required
            className="h-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm w-56"
          />
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create"}
          </PrimaryButton>
        </form>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {created && (
        <div className="w-full">
          <SecretOnce
            label={`API key "${created.label}"`}
            value={created.api_key}
            hint="Store it as RELAY_API_KEY in your backend's env."
          />
        </div>
      )}
    </div>
  );
}

export function RevokeKey({ id, prefix }: { id: string; prefix: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke() {
    if (!confirm(`Revoke ${prefix}…? Anything still using it starts failing immediately.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={revoke}
        disabled={busy}
        className="text-xs text-red-500/80 hover:text-red-500 underline underline-offset-2 disabled:opacity-60"
      >
        {busy ? "revoking…" : "revoke"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
