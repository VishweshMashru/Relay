"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "../_ui";
import { SecretOnce } from "@/components/secret-once";

export function ProvisionEdge() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<{ edge_id: string; edge_token: string } | null>(null);

  async function provision(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, hostname }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setToken(await res.json());
      setName("");
      setHostname("");
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
        <PrimaryButton onClick={() => setOpen(true)}>Provision edge</PrimaryButton>
      ) : (
        <form onSubmit={provision} className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Edge name (e.g. factory-a-office-pc)"
            required
            className="h-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm w-64"
          />
          <input
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder="Hostname (optional)"
            className="h-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm w-48"
          />
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Provisioning…" : "Create"}
          </PrimaryButton>
        </form>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {token && (
        <div className="w-full">
          <SecretOnce
            label={`Edge token for ${token.edge_id}`}
            value={token.edge_token}
            hint="Pass it to the agent as RELAY_EDGE_TOKEN — the installer asks for it."
          />
        </div>
      )}
    </div>
  );
}

export function RotateToken({ edgeId }: { edgeId: string }) {
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function rotate() {
    if (!confirm("Rotate this edge's token? The current token stops working immediately — the agent must be restarted with the new one.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/edges/${edgeId}/rotate-token`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const data = (await res.json()) as { edge_token: string };
      setToken(data.edge_token);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <button
        onClick={rotate}
        disabled={busy}
        className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50 underline underline-offset-2 disabled:opacity-60"
      >
        {busy ? "rotating…" : "rotate token"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {token && (
        <div className="w-96 max-w-full text-left">
          <SecretOnce label="New edge token" value={token} hint="Restart the agent with this as RELAY_EDGE_TOKEN." />
        </div>
      )}
    </div>
  );
}
