import { PageHeader, EmptyState, PrimaryButton } from "../_ui";

export default function Keys() {
  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <PageHeader title="API keys" subtitle="Bearer tokens your backend uses to call the Relay API." />
        <PrimaryButton>Create key</PrimaryButton>
      </div>

      <EmptyState
        title="No API keys yet"
        body="Your first key was created during onboarding. If you missed it, create a new one — the old value cannot be shown again."
      />
    </div>
  );
}
