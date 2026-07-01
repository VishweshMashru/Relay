import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { WelcomeClient } from "./welcome-client";

// Server component: called after Clerk sign-up. Idempotently onboards the
// user (creates a Relay project + first API key) and reveals the key exactly
// once. If the user was already onboarded, redirects to /dashboard.
export default async function Welcome() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";

  const apiUrl = process.env.RELAY_API_URL ?? "http://localhost:8080";
  const adminToken = process.env.RELAY_ADMIN_TOKEN;
  if (!adminToken) {
    return (
      <div className="max-w-lg mx-auto p-10 text-sm text-red-500">
        Server not configured: RELAY_ADMIN_TOKEN missing.
      </div>
    );
  }

  const res = await fetch(`${apiUrl}/v1/admin/onboard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ clerk_user_id: userId, email }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    return (
      <div className="max-w-lg mx-auto p-10 text-sm text-red-500">
        Onboarding failed: {res.status} {body}
      </div>
    );
  }

  const data = (await res.json()) as {
    project_id: string;
    api_key?: string;
    is_new: boolean;
  };

  if (!data.is_new || !data.api_key) redirect("/dashboard");

  return <WelcomeClient apiKey={data.api_key} projectId={data.project_id} email={email} />;
}
