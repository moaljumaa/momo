import { NextRequest, NextResponse } from "next/server";
import { prisma, ConversationStatus } from "@momo/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  const isValidStatus = (s: string): s is ConversationStatus => s in ConversationStatus;

  const conversations = await prisma.conversation.findMany({
    where: status && isValidStatus(status) ? { status } : undefined,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      contact: true,
      assignee: { select: { id: true, name: true, image: true } },
      labels: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({ conversations });
}
