import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Checks a pasted OpenRouter key against the real API before the onboarding wizard saves it,
// so a typo doesn't silently break the website-scan step that runs right after this one.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { apiKey } = (await req.json()) as { apiKey?: string };
  if (!apiKey?.trim()) return NextResponse.json({ ok: false, error: "Enter a key first" });

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey.trim()}` },
  });
  if (res.status === 401) return NextResponse.json({ ok: false, error: "That key was rejected by OpenRouter" });
  if (!res.ok) return NextResponse.json({ ok: false, error: "Couldn't reach OpenRouter — try again" });

  return NextResponse.json({ ok: true });
}
