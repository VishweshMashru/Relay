import { PageHeader, StatCard, EmptyState } from "./_ui";
import { dashFetch, formatBytes, type EdgeRow, type SessionRow, type Settings, type Usage } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const [{ edges }, { sessions }, usage, settings] = await Promise.all([
    dashFetch<{ edges: EdgeRow[] }>("/v1/edges"),
    dashFetch<{ sessions: SessionRow[] }>("/v1/sessions"),
    dashFetch<Usage>("/v1/usage"),
    dashFetch<Settings>("/v1/settings"),
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <StatCard
          label="Minutes watched (30d)"
          value={String(usage.viewer_minutes_30d)}
          hint={settings.stream_provider === "cloudflare" ? `≈ $${((usage.viewer_minutes_30d / 1000) * 1).toFixed(2)} CF delivery` : "self-hosted: flat cost"}
        />
        <StatCard label="Clips stored" value={String(usage.clip_count)} hint={formatBytes(usage.clip_bytes)} />
        <StatCard label="Stream provider" value={settings.stream_provider} hint="change in Settings" />
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
