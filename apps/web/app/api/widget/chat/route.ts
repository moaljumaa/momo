import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { respond } from "@momo/core/respond";
import { originAllowed } from "@/lib/widget-origin";
import { extractClientIp, lookupGeoIp } from "@/lib/geo-ip";
import { publish } from "@/lib/conversation-events";

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
  const { conversationId, message, visitor } = (await req.json()) as {
    conversationId?: string;
    message: string;
    // Plain browser signals the widget reads client-side — no pre-chat identity form needed.
    visitor?: { language?: string; timezone?: string; referrer?: string; pageUrl?: string };
  };
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
  const isNewConversation = !conversation;

  let activeConversation = conversation;
  if (!activeConversation) {
    const ip = extractClientIp(req);
    const geo = await lookupGeoIp(ip);
    activeConversation = await prisma.conversation.create({
      data: {
        status: "AI",
        visitorIp: ip,
        visitorCountry: geo.country,
        visitorCity: geo.city,
        visitorUserAgent: req.headers.get("user-agent"),
        visitorLanguage: visitor?.language ?? null,
        visitorTimezone: visitor?.timezone ?? null,
        visitorReferrer: visitor?.referrer ?? null,
        visitorPageUrl: visitor?.pageUrl ?? null,
      },
    });
  }

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

  const visitorMessage = await prisma.message.create({
    data: { conversationId: activeConversation.id, role: "VISITOR", content: message },
  });
  publish({
    type: "message",
    conversationId: activeConversation.id,
    isNewConversation,
    message: {
      id: visitorMessage.id,
      role: "VISITOR",
      content: visitorMessage.content,
      confidence: null,
      createdAt: visitorMessage.createdAt.toISOString(),
      agent: null,
    },
  });

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
  publish({
    type: "message",
    conversationId: activeConversation.id,
    isNewConversation: false,
    message: {
      id: aiMessage.id,
      role: "AI",
      content: aiMessage.content,
      confidence: aiMessage.confidence,
      createdAt: aiMessage.createdAt.toISOString(),
      agent: null,
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
