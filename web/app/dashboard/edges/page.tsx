import { PageHeader, EmptyState, PrimaryButton } from "../_ui";

export default function Edges() {
  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <PageHeader title="Edges" subtitle="Machines running relay-edge inside your customers' networks." />
        <PrimaryButton>Provision edge</PrimaryButton>
      </div>

      <EmptyState
        title="No edges provisioned"
        body="Provisioning gives you an edge_token — pass it as RELAY_EDGE_TOKEN when you start the agent on the target machine."
      />
    </div>
  );
}
