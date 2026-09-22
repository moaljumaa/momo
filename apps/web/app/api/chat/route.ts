import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { respond } from "@momo/core/respond";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Admin-authenticated for now (Playground testing). The widget gets its own
// public endpoint in the widget phase, with its own guardrail identity (IP/cookie).
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId, message } = (await req.json()) as { conversationId?: string; message: string };
  if (!message?.trim()) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const conversation = conversationId
    ? await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } })
    : await prisma.conversation.create({ data: { status: "AI" } });

  const windowStart = new Date(Date.now() - settings.rateLimitWindowSec * 1000);
  const recentVisitorMessages = await prisma.message.count({
    where: { conversationId: conversation.id, role: "VISITOR", createdAt: { gte: windowStart } },
  });
  if (recentVisitorMessages >= settings.rateLimitCount) {
    return NextResponse.json({
      conversationId: conversation.id,
      message: { role: "AI", content: settings.rateLimitMessage, confidence: null, sources: [] },
      rateLimited: true,
    });
  }

  await prisma.message.create({ data: { conversationId: conversation.id, role: "VISITOR", content: message } });

  const result = await respond({
    question: message,
    systemPrompt: settings.systemPrompt,
    threshold: settings.threshold,
    model: settings.model,
  });

  if (result.handoff) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { status: "NEEDS_HUMAN" } });
    await prisma.ticket.upsert({
      where: { conversationId: conversation.id },
      update: {},
      create: { conversationId: conversation.id, status: "OPEN", priority: "NORMAL" },
    });
  }

  const aiMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "AI",
      content: result.content,
      confidence: result.confidence,
      sources: result.sources,
    },
  });

  return NextResponse.json({
    conversationId: conversation.id,
    message: {
      id: aiMessage.id,
      role: "AI",
      content: aiMessage.content,
      confidence: aiMessage.confidence,
      sources: result.sources,
    },
    handoff: result.handoff,
  });
}
