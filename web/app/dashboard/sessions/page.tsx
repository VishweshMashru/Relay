import { PageHeader, EmptyState } from "../_ui";

export default function Sessions() {
  return (
    <div className="p-8 flex flex-col gap-6">
      <PageHeader title="Sessions" subtitle="Live and recent viewer sessions." />

      <EmptyState
        title="No sessions yet"
        body="Create one via POST /v1/sessions from your app, or use the Cameras page to test-view any camera."
      />
    </div>
  );
}
