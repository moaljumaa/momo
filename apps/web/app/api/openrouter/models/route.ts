import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Thin proxy for OpenRouter's public model catalog — used by the Instructions page's model
// selector. Proxied (rather than fetched client-side) so we can attach the server's API key
// if one is set and cache the fairly-static list for a bit instead of hitting OpenRouter on
// every page load.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: process.env.OPENROUTER_API_KEY ? { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } : {},
    next: { revalidate: 3600 },
  });
  if (!res.ok) return NextResponse.json({ error: "Couldn't reach OpenRouter" }, { status: 502 });

  const { data } = (await res.json()) as {
    data: { id: string; name: string; context_length: number; pricing: { prompt: string; completion: string } }[];
  };

  const models = data
    .map((m) => ({
      id: m.id,
      name: m.name,
      contextLength: m.context_length,
      promptPrice: Number(m.pricing?.prompt ?? 0),
      completionPrice: Number(m.pricing?.completion ?? 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ models });
}
