import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPresence } from "@/lib/presence";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      contact: true,
      assignee: { select: { id: true, name: true, image: true } },
      participants: { select: { id: true, name: true, image: true } },
      labels: true,
      ticket: true,
      messages: { orderBy: { createdAt: "asc" }, include: { agent: { select: { id: true, name: true } } } },
    },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Previous conversations from the same visitor: same contact if identified, else same IP.
  const previous = await prisma.conversation.findMany({
    where: {
      id: { not: id },
      OR: [
        conversation.contactId ? { contactId: conversation.contactId } : undefined,
        conversation.visitorIp ? { visitorIp: conversation.visitorIp } : undefined,
      ].filter(Boolean) as object[],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, createdAt: true, status: true },
  });

  return NextResponse.json({ conversation, previous, presence: getPresence(id) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as {
    status?: "AI" | "PENDING_HANDOFF" | "NEEDS_HUMAN" | "HUMAN" | "RESOLVED";
    priority?: "LOW" | "NORMAL" | "HIGH" | null;
    assigneeId?: string | null;
    labelIds?: string[];
  };

  const data: Record<string, unknown> = {};
  if ("status" in body) data.status = body.status;
  if ("priority" in body) data.priority = body.priority;
  if ("assigneeId" in body) {
    data.assignee = body.assigneeId ? { connect: { id: body.assigneeId } } : { disconnect: true };
  }
  if (body.labelIds) data.labels = { set: body.labelIds.map((labelId) => ({ id: labelId })) };

  const conversation = await prisma.conversation.update({
    where: { id },
    data,
    include: { assignee: { select: { id: true, name: true, image: true } }, labels: true },
  });

  return NextResponse.json({ conversation });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
