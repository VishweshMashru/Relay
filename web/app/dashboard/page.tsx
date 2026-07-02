import { PageHeader, StatCard, EmptyState } from "./_ui";
import { dashFetch, type EdgeRow, type SessionRow } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const [{ edges }, { sessions }] = await Promise.all([
    dashFetch<{ edges: EdgeRow[] }>("/v1/edges"),
    dashFetch<{ sessions: SessionRow[] }>("/v1/sessions"),
  ]);

  const online = edges.filter((e) => e.online).length;
  const cameras = edges.reduce((n, e) => n + e.camera_count, 0);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sessionsToday = sessions.filter((s) => new Date(s.started_at) >= startOfToday).length;
  const liveNow = sessions.filter((s) => s.status === "live" || s.status === "pending").length;

  return (
    <div className="p-8">
      <PageHeader title="Overview" subtitle="At-a-glance view of your Relay account." />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
        <StatCard label="Edges online" value={`${online} / ${edges.length}`} />
        <StatCard label="Cameras" value={String(cameras)} />
        <StatCard label="Sessions today" value={String(sessionsToday)} />
        <StatCard label="Live now" value={String(liveNow)} hint={liveNow > 0 ? "streams running" : undefined} />
      </div>

      {edges.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="You haven't provisioned an edge yet"
            body="Install the relay-edge agent on the machine that lives on your camera's network. Once it phones home, this dashboard will show it here."
            cta={{ href: "/dashboard/edges", label: "Provision an edge →" }}
          />
        </div>
      )}
    </div>
  );
}
