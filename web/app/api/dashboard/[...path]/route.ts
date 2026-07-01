// Authenticated proxy: forwards dashboard requests to the Relay Go API using
// the admin key. Every method the browser fetches goes through here so no
// API key ever reaches the client. Auth is enforced by Clerk middleware.
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.RELAY_API_URL ?? "http://localhost:8080";

async function forward(req: NextRequest, path: string[]) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const key = process.env.RELAY_ADMIN_KEY;
  if (!key) return NextResponse.json({ error: "RELAY_ADMIN_KEY not set on the dashboard" }, { status: 500 });

  const url = `${API_URL}/v1/${path.join("/")}${req.nextUrl.search}`;
  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.text();
  const res = await fetch(url, {
    method: req.method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body,
  });
  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
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
