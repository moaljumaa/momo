import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { ingestQueue } from "@momo/core/queue";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sources = await prisma.source.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });
  return NextResponse.json({ sources });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, title, url, content, selectedUrls } = body as {
    type: "URL" | "FILE" | "QA" | "TEXT";
    title: string;
    url?: string;
    content?: string;
    selectedUrls?: string[];
  };
  if (!type || !title) return NextResponse.json({ error: "type and title are required" }, { status: 400 });
  if (type === "URL" && !url) return NextResponse.json({ error: "url is required" }, { status: 400 });
  if (type !== "URL" && !content) return NextResponse.json({ error: "content is required" }, { status: 400 });

  if (type === "URL") {
    if (!selectedUrls || selectedUrls.length === 0) {
      return NextResponse.json({ error: "selectedUrls is required — pick at least one page" }, { status: 400 });
    }
    if (selectedUrls.length > 10) {
      return NextResponse.json({ error: "at most 10 pages can be crawled" }, { status: 400 });
    }
    const origin = new URL(url!).origin;
    if (selectedUrls.some((u) => !u.startsWith(origin))) {
      return NextResponse.json({ error: "selectedUrls must all be on the same site" }, { status: 400 });
    }
  }

  const source = await prisma.source.create({
    data: { type, title, url, content, selectedUrls: type === "URL" ? selectedUrls : undefined, status: "PENDING" },
  });
  await ingestQueue().add("ingest", { sourceId: source.id });
  return NextResponse.json({ source }, { status: 201 });
}
