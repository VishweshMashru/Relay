import { PageHeader, StatCard, EmptyState } from "./_ui";
import Link from "next/link";

export default function Overview() {
  return (
    <div className="p-8">
      <PageHeader title="Overview" subtitle="At-a-glance view of your Relay account." />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
        <StatCard label="Minutes streamed (mo.)" value="—" hint="Not tracked yet" />
        <StatCard label="Sessions today" value="—" />
        <StatCard label="Edges online" value="0 / 0" />
        <StatCard label="Active cameras" value="0" />
      </div>

      <div className="mt-8">
        <EmptyState
          title="You haven't provisioned an edge yet"
          body="Install the relay-edge agent on the machine that lives on your camera's network. Once it phones home, this dashboard will show it here."
          cta={{ href: "/dashboard/edges", label: "Provision an edge →" }}
        />
      </div>
    </div>
  );
}
