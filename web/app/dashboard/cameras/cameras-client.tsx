"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "../_ui";
import { SecretOnce } from "@/components/secret-once";

export function AddCamera({ edges }: { edges: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [edgeId, setEdgeId] = useState(edges[0]?.id ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ camera_id: string } | null>(null);

  if (edges.length === 0) return null;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/edges/${edgeId}/cameras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setCreated(await res.json());
      setName("");
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
        <PrimaryButton onClick={() => setOpen(true)}>Add camera</PrimaryButton>
      ) : (
        <form onSubmit={add} className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
          <select
            value={edgeId}
            onChange={(e) => setEdgeId(e.target.value)}
            className="h-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm"
          >
            {edges.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Camera name (e.g. loading-dock)"
            required
            className="h-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm w-64"
          />
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add"}
          </PrimaryButton>
        </form>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {created && (
        <div className="w-full">
          <SecretOnce
            label="Camera ID"
            value={created.camera_id}
            hint={`Add it to the edge's cameras.json: { "${created.camera_id}": "rtsp://user:pass@camera-ip/..." } — the RTSP URL never leaves the LAN.`}
          />
        </div>
      )}
    </div>
  );
}
