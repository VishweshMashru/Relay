import { PageHeader, EmptyState, Badge, Table } from "../_ui";
import { dashFetch, timeAgo, type EdgeRow } from "@/lib/dashboard-data";
import { ProvisionEdge, RotateToken } from "./edges-client";

export const dynamic = "force-dynamic";

export default async function Edges() {
  const { edges } = await dashFetch<{ edges: EdgeRow[] }>("/v1/edges");

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Edges" subtitle="Machines running relay-edge inside your customers' networks." />
        <ProvisionEdge />
      </div>

      {edges.length === 0 ? (
        <EmptyState
          title="No edges provisioned"
          body="Provisioning gives you an edge_token — pass it as RELAY_EDGE_TOKEN when you start the agent on the target machine."
        />
      ) : (
        <Table headers={["Name", "Status", "Hostname", "Cameras", "Last seen", ""]}>
          {edges.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-3">
                <div className="font-medium">{e.name}</div>
                <div className="font-mono text-xs text-neutral-500">{e.id}</div>
              </td>
              <td className="px-4 py-3">
                {e.online ? <Badge tone="green">online</Badge> : <Badge tone="neutral">offline</Badge>}
              </td>
              <td className="px-4 py-3 text-neutral-500">{e.hostname || "—"}</td>
              <td className="px-4 py-3">{e.camera_count}</td>
              <td className="px-4 py-3 text-neutral-500">{timeAgo(e.last_seen_at)}</td>
              <td className="px-4 py-3 text-right">
                <RotateToken edgeId={e.id} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
