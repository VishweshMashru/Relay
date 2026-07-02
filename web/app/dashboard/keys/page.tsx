import { PageHeader, EmptyState, Badge, Table } from "../_ui";
import { dashFetch, timeAgo, type KeyRow } from "@/lib/dashboard-data";
import { CreateKey, RevokeKey } from "./keys-client";

export const dynamic = "force-dynamic";

export default async function Keys() {
  const { keys } = await dashFetch<{ keys: KeyRow[] }>("/v1/keys");

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="API keys" subtitle="Bearer tokens your backend uses to call the Relay API." />
        <CreateKey />
      </div>

      {keys.length === 0 ? (
        <EmptyState
          title="No API keys yet"
          body="Your first key was created during onboarding. If you missed it, create a new one — the old value cannot be shown again."
        />
      ) : (
        <Table headers={["Key", "Label", "Last used", "Created", ""]}>
          {keys.map((k) => (
            <tr key={k.id}>
              <td className="px-4 py-3 font-mono text-xs">{k.prefix}…</td>
              <td className="px-4 py-3">
                {k.label === "dashboard" ? <Badge tone="neutral">dashboard</Badge> : k.label}
              </td>
              <td className="px-4 py-3 text-neutral-500">{timeAgo(k.last_used_at)}</td>
              <td className="px-4 py-3 text-neutral-500">{timeAgo(k.created_at)}</td>
              <td className="px-4 py-3 text-right">
                <RevokeKey id={k.id} prefix={k.prefix} />
              </td>
            </tr>
          ))}
        </Table>
      )}
      <p className="text-xs text-neutral-500">
        The <span className="font-mono">dashboard</span> key is what this dashboard itself uses to act on your
        project. Revoking it is safe — a new one is minted automatically on your next page load.
      </p>
    </div>
  );
}
