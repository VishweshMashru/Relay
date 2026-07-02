// Server-only. Resolves the signed-in user's own Relay API key so every
// dashboard call runs against their project — not a shared admin key.
//
// The key is minted by relay-api (POST /v1/admin/user-key, which replaces any
// previous "dashboard" key for the project) and cached in Clerk
// privateMetadata. privateMetadata never reaches the browser.
import { clerkClient } from "@clerk/nextjs/server";

const API_URL = process.env.RELAY_API_URL ?? "http://localhost:8080";
const METADATA_KEY = "relayDashboardKey";

export class NotOnboardedError extends Error {
  constructor() {
    super("user has no Relay project yet");
  }
}

export async function resolveUserKey(userId: string, opts?: { forceMint?: boolean }): Promise<string> {
  const clerk = await clerkClient();

  if (!opts?.forceMint) {
    const user = await clerk.users.getUser(userId);
    const cached = user.privateMetadata?.[METADATA_KEY];
    if (typeof cached === "string" && cached) return cached;
  }

  const adminToken = process.env.RELAY_ADMIN_TOKEN;
  if (!adminToken) throw new Error("RELAY_ADMIN_TOKEN not set on the dashboard");

  const res = await fetch(`${API_URL}/v1/admin/user-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ clerk_user_id: userId }),
    cache: "no-store",
  });
  if (res.status === 404) throw new NotOnboardedError();
  if (!res.ok) throw new Error(`mint dashboard key: ${res.status} ${await res.text()}`);

  const { api_key } = (await res.json()) as { api_key: string };
  await clerk.users.updateUserMetadata(userId, {
    privateMetadata: { [METADATA_KEY]: api_key },
  });
  return api_key;
}

// relayFetchAs calls relay-api as the given user, self-healing a stale cached
// key (e.g. the dashboard key was revoked server-side) with one re-mint.
export async function relayFetchAs(
  userId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const attempt = async (forceMint: boolean) => {
    const key = await resolveUserKey(userId, { forceMint });
    return fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });
  };
  const res = await attempt(false);
  if (res.status !== 401) return res;
  return attempt(true);
}
