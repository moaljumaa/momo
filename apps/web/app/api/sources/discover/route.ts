import { NextRequest, NextResponse } from "next/server";
import { discoverUrls } from "@momo/core/crawl";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Step 1 of add-website: list candidate pages for the user to pick from, before
// anything is crawled or stored.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = (await req.json()) as { url?: string };
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  const urls = await discoverUrls(parsed.toString());
  return NextResponse.json({ urls });
}
