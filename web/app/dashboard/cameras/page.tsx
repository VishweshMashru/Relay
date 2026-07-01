import { PageHeader, EmptyState, PrimaryButton } from "../_ui";

export default function Cameras() {
  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <PageHeader title="Cameras" subtitle="RTSP sources registered to your edges." />
        <PrimaryButton>Add camera</PrimaryButton>
      </div>

      <EmptyState
        title="No cameras yet"
        body="Add an edge first, then register a camera. Only its ID and name are stored here — RTSP URLs stay on the edge."
      />
    </div>
  );
}
