import { PageHeader, EmptyState, Table } from "../_ui";
import { dashFetch, timeAgo, type CameraRow, type EdgeRow } from "@/lib/dashboard-data";
import { AddCamera } from "./cameras-client";

export const dynamic = "force-dynamic";

export default async function Cameras() {
  const { edges } = await dashFetch<{ edges: EdgeRow[] }>("/v1/edges");
  const perEdge = await Promise.all(
    edges.map(async (e) => {
      const { cameras } = await dashFetch<{ cameras: CameraRow[] }>(`/v1/edges/${e.id}/cameras`);
      return cameras.map((c) => ({ ...c, edgeName: e.name, edgeOnline: e.online }));
    }),
  );
  const cameras = perEdge.flat();

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Cameras" subtitle="RTSP sources registered to your edges." />
        <AddCamera edges={edges.map((e) => ({ id: e.id, name: e.name }))} />
      </div>

      {cameras.length === 0 ? (
        <EmptyState
          title={edges.length === 0 ? "Add an edge first" : "No cameras yet"}
          body="Register a camera against an edge. Only its ID and name are stored here — RTSP URLs stay on the edge in cameras.json."
          cta={edges.length === 0 ? { href: "/dashboard/edges", label: "Provision an edge →" } : undefined}
        />
      ) : (
        <Table headers={["Name", "Edge", "Camera ID", "Added"]}>
          {cameras.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3 text-neutral-500">{c.edgeName}</td>
              <td className="px-4 py-3 font-mono text-xs text-neutral-500">{c.id}</td>
              <td className="px-4 py-3 text-neutral-500">{timeAgo(c.created_at)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
