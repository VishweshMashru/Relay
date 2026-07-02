// Authenticated proxy: forwards dashboard requests to the Relay Go API using
// the signed-in user's OWN project key (resolved via Clerk privateMetadata,
// minted on demand) — so tenancy is enforced by the API itself and no key
// ever reaches the browser. Auth is enforced by Clerk middleware.
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { NotOnboardedError, relayFetchAs } from "@/lib/user-key";

async function forward(req: NextRequest, path: string[]) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.text();
  try {
    const res = await relayFetchAs(userId, `/v1/${path.join("/")}${req.nextUrl.search}`, {
      method: req.method,
      body,
    });
    const text = await res.text();
    return new NextResponse(text || null, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (e) {
    if (e instanceof NotOnboardedError) {
      return NextResponse.json({ error: "not onboarded", redirect: "/welcome" }, { status: 409 });
    }
    throw e;
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
