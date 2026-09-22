import { NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Source detail: for URL sources, groups chunks by the page they were crawled from so the
// sidebar can show "these are the pages we crawled" and, per page, what text we actually
// extracted — useful to debug a crawl that came back empty or wrong.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const source = await prisma.source.findUnique({
    where: { id },
    include: { chunks: { select: { content: true, label: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Chunks written before the per-page `label` column existed (or a source that hasn't
  // been re-synced since) have label = null. Group those separately under a reserved key
  // instead of silently mislabeling them as one of the real page URLs — the sheet uses
  // `hasLabels` to fall back to one combined view instead of showing every page as empty.
  const LEGACY = "__legacy__";
  const pages = new Map<string, string[]>();
  let hasLabels = false;
  for (const c of source.chunks) {
    const key = c.label ?? LEGACY;
    if (c.label) hasLabels = true;
    if (!pages.has(key)) pages.set(key, []);
    pages.get(key)!.push(c.content);
  }

  return NextResponse.json({
    source: {
      id: source.id,
      type: source.type,
      title: source.title,
      url: source.url,
      content: source.content,
      selectedUrls: source.selectedUrls,
      crawlProgress: source.crawlProgress,
      status: source.status,
      error: source.error,
      createdAt: source.createdAt,
    },
    hasLabels,
    pages: [...pages.entries()].map(([label, chunks]) => ({ label, content: chunks.join("\n\n") })),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, content } = body as { title?: string; content?: string };
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "title and content are required" }, { status: 400 });
  }

  const existing = await prisma.source.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.type === "URL") {
    return NextResponse.json({ error: "website sources are edited through re-sync, not directly" }, { status: 400 });
  }

  // Content changed — old chunks/embeddings no longer match, same as a re-sync.
  await prisma.$executeRaw`DELETE FROM "Chunk" WHERE "sourceId" = ${id}`;
  const source = await prisma.source.update({
    where: { id },
    data: { title, content, status: "PENDING", error: null },
  });
  const { ingestQueue } = await import("@momo/core/queue");
  await ingestQueue().add("ingest", { sourceId: id });

  return NextResponse.json({ source });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.source.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
