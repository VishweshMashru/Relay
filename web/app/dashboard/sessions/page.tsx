import { PageHeader, EmptyState, Badge, Table } from "../_ui";
import { dashFetch, timeAgo, type SessionRow } from "@/lib/dashboard-data";
import { StopSession } from "./sessions-client";

export const dynamic = "force-dynamic";

function statusBadge(status: SessionRow["status"]) {
  switch (status) {
    case "live":
      return <Badge tone="green">live</Badge>;
    case "pending":
      return <Badge tone="amber">pending</Badge>;
    default:
      return <Badge tone="neutral">{status}</Badge>;
  }
}

export default async function Sessions() {
  const { sessions } = await dashFetch<{ sessions: SessionRow[] }>("/v1/sessions");

  return (
    <div className="p-8 flex flex-col gap-6">
      <PageHeader title="Sessions" subtitle="Live and recent viewer sessions (latest 100)." />

      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          body="Create one via POST /v1/sessions from your app — this page shows every viewer session against your cameras."
        />
      ) : (
        <Table headers={["Camera", "Edge", "Status", "Provider", "Started", "Last heartbeat", ""]}>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3">
                <div className="font-medium">{s.camera_name || "push ingest"}</div>
                <div className="font-mono text-xs text-neutral-500">{s.id}</div>
              </td>
              <td className="px-4 py-3 text-neutral-500">{s.edge_name || "—"}</td>
              <td className="px-4 py-3">{statusBadge(s.status)}</td>
              <td className="px-4 py-3 text-neutral-500">{s.provider}</td>
              <td className="px-4 py-3 text-neutral-500">{timeAgo(s.started_at)}</td>
              <td className="px-4 py-3 text-neutral-500">{timeAgo(s.last_heartbeat_at)}</td>
              <td className="px-4 py-3 text-right">
                {(s.status === "live" || s.status === "pending") && <StopSession id={s.id} />}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
