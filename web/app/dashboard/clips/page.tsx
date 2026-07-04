import { PageHeader, EmptyState, Badge, Table } from "../_ui";
import { dashFetch, formatBytes, timeAgo, type AssetRow } from "@/lib/dashboard-data";
import { ClipActions } from "./clips-client";

export const dynamic = "force-dynamic";

export default async function Clips() {
  const { assets } = await dashFetch<{ assets: AssetRow[] }>("/v1/assets");

  return (
    <div className="p-8 flex flex-col gap-6">
      <PageHeader
        title="Clips"
        subtitle="Stored video: session recordings and uploaded clips, with retention you control."
      />

      {assets.length === 0 ? (
        <EmptyState
          title="No clips yet"
          body='Start a session with record:true to keep its recording, or upload clips via POST /v1/assets. Recordings appear here automatically when the session ends.'
        />
      ) : (
        <Table headers={["Clip", "Source", "Status", "Size", "Expires", "Created", ""]}>
          {assets.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3">
                <div className="font-medium">{a.name || a.id.slice(0, 8)}</div>
                <div className="font-mono text-xs text-neutral-500">{a.id}</div>
              </td>
              <td className="px-4 py-3">
                <Badge tone="neutral">{a.source === "cloudflare" ? "recording" : "upload"}</Badge>
              </td>
              <td className="px-4 py-3">
                {a.status === "ready" ? <Badge tone="green">ready</Badge> : <Badge tone="amber">processing</Badge>}
              </td>
              <td className="px-4 py-3 text-neutral-500">{a.size_bytes ? formatBytes(a.size_bytes) : "—"}</td>
              <td className="px-4 py-3 text-neutral-500">{a.expires_at ? timeAgo(a.expires_at) : "never"}</td>
              <td className="px-4 py-3 text-neutral-500">{timeAgo(a.created_at)}</td>
              <td className="px-4 py-3">
                <ClipActions id={a.id} ready={a.status === "ready"} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
