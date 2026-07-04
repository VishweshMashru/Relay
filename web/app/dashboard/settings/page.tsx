import { PageHeader } from "../_ui";
import { dashFetch, type Settings } from "@/lib/dashboard-data";
import { ProviderPicker } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await dashFetch<Settings>("/v1/settings");

  return (
    <div className="p-8 flex flex-col gap-6">
      <PageHeader
        title="Settings"
        subtitle="Runtime configuration for your project — changes apply immediately, no redeploys."
      />
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Stream provider</h2>
        <p className="text-sm text-neutral-500 max-w-2xl -mt-1">
          Which media plane carries your video. Pick per workload: pay-per-minute global delivery,
          or your own server at flat cost.
        </p>
        <ProviderPicker settings={settings} />
      </div>
    </div>
  );
}
