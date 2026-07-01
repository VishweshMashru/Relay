// Public proxy for the Showcase demo app. Uses a single "demo" API key
// scoped to a demo project owned by us. Rate-limited later.
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.RELAY_API_URL ?? "http://localhost:8080";

// For the scaffold we reuse RELAY_ADMIN_KEY; move to a separate
// RELAY_SHOWCASE_KEY as soon as we spin up a dedicated demo project.
const DEMO_KEY = process.env.RELAY_SHOWCASE_KEY ?? process.env.RELAY_ADMIN_KEY;

async function forward(req: NextRequest, path: string[]) {
  if (!DEMO_KEY) {
    return NextResponse.json(
      { error: "showcase not configured (set RELAY_SHOWCASE_KEY or RELAY_ADMIN_KEY)" },
      { status: 501 },
    );
  }
  const url = `${API_URL}/v1/${path.join("/")}${req.nextUrl.search}`;
  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.text();
  const res = await fetch(url, {
    method: req.method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEMO_KEY}` },
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
