import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { respond } from "@momo/core/respond";
import { originAllowed } from "@/lib/widget-origin";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

// Public, unauthenticated — this is the widget's own endpoint, separate from the
// session-gated /api/chat used by the admin Playground. Guardrail identity here is
// per-conversation (same rate-limit window as Playground); a new widget session
// simply starts a fresh conversation, so abuse is capped per conversation.
export async function POST(req: NextRequest) {
  const { conversationId, message } = (await req.json()) as { conversationId?: string; message: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400, headers: cors });
  }

  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  if (!settings.widgetEnabled) {
    return NextResponse.json({ error: "widget disabled" }, { status: 403, headers: cors });
  }
  if (!originAllowed(req, settings.widgetAllowedDomains)) {
    return NextResponse.json({ error: "origin not allowed" }, { status: 403, headers: cors });
  }

  const conversation = conversationId
    ? await prisma.conversation.findUnique({ where: { id: conversationId } })
    : null;
  const activeConversation =
    conversation ?? (await prisma.conversation.create({ data: { status: "AI" } }));

  const windowStart = new Date(Date.now() - settings.rateLimitWindowSec * 1000);
  const recentVisitorMessages = await prisma.message.count({
    where: { conversationId: activeConversation.id, role: "VISITOR", createdAt: { gte: windowStart } },
  });
  if (recentVisitorMessages >= settings.rateLimitCount) {
    return NextResponse.json(
      {
        conversationId: activeConversation.id,
        message: { role: "AI", content: settings.rateLimitMessage, confidence: null },
        rateLimited: true,
      },
      { headers: cors },
    );
  }

  await prisma.message.create({ data: { conversationId: activeConversation.id, role: "VISITOR", content: message } });

  const result = await respond({
    question: message,
    systemPrompt: settings.systemPrompt,
    threshold: settings.threshold,
    model: settings.model,
  });

  if (result.handoff) {
    await prisma.conversation.update({ where: { id: activeConversation.id }, data: { status: "NEEDS_HUMAN" } });
    await prisma.ticket.upsert({
      where: { conversationId: activeConversation.id },
      update: {},
      create: { conversationId: activeConversation.id, status: "OPEN", priority: "NORMAL" },
    });
  }

  const aiMessage = await prisma.message.create({
    data: {
      conversationId: activeConversation.id,
      role: "AI",
      content: result.content,
      confidence: result.confidence,
      sources: result.sources,
    },
  });

  return NextResponse.json(
    {
      conversationId: activeConversation.id,
      message: { id: aiMessage.id, role: "AI", content: aiMessage.content, confidence: aiMessage.confidence },
      handoff: result.handoff,
    },
    { headers: cors },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: cors });
}
