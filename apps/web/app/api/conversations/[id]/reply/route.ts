import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { publish } from "@/lib/conversation-events";

// A human agent replying takes the conversation over from the AI: it's assigned to them
// (if nobody owns it yet) and flips to HUMAN, and they're added as a participant.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = (await req.json()) as { content?: string };
  if (!content?.trim()) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const message = await prisma.message.create({
    data: { conversationId: id, role: "AGENT", content: content.trim(), agentId: session.user.id },
    include: { agent: { select: { id: true, name: true } } },
  });

  await prisma.conversation.update({
    where: { id },
    data: {
      status: "HUMAN",
      assignee: conversation.assigneeId ? undefined : { connect: { id: session.user.id } },
      participants: { connect: { id: session.user.id } },
    },
  });

  publish({
    type: "message",
    conversationId: id,
    isNewConversation: false,
    message: {
      id: message.id,
      role: "AGENT",
      content: message.content,
      confidence: null,
      createdAt: message.createdAt.toISOString(),
      agent: message.agent,
    },
  });

  return NextResponse.json({ message });
}
