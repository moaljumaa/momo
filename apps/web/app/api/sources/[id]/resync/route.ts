import { NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { ingestQueue } from "@momo/core/queue";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.$executeRaw`DELETE FROM "Chunk" WHERE "sourceId" = ${id}`;
  await prisma.source.update({ where: { id }, data: { status: "PENDING", error: null } });
  await ingestQueue().add("ingest", { sourceId: id });
  return NextResponse.json({ ok: true });
}
