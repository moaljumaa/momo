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

type Conversation = NonNullable<Awaited<ReturnType<typeof prisma.conversation.findUnique>>>;

// Picks a random human to own an escalated conversation. Deliberately random, not
// round-robin/least-busy — there's no workload data to base a smarter pick on yet, and this
// is a single-tenant app so the team is small.
async function pickRandomAgent() {
  const agents = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "HUMAN_AGENT"] } } });
  if (agents.length === 0) return null;
  return agents[Math.floor(Math.random() * agents.length)];
}

// Finalizes a handoff once every required field has been collected: assigns a random human,
// links/creates a Contact from the collected email/name, and writes an agent-only summary.
async function finalizeHandoff(conversation: Conversation, reason: string, collectedFields: Record<string, string>) {
  const agent = await pickRandomAgent();

  // Field keys are slugified from whatever free-text label the admin chose (e.g. "Email
  // address" -> "email_address"), so match by shape/substring instead of an exact "email"/
  // "name" key — otherwise Contact linking silently breaks for any label that isn't literally
  // "Email" or "Name".
  let contactId = conversation.contactId;
  const emailEntry = Object.values(collectedFields).find((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()));
  const nameEntry = Object.entries(collectedFields).find(([key]) => /name/i.test(key))?.[1];
  const email = emailEntry?.trim();
  if (email) {
    const contact = await prisma.contact.upsert({
      where: { email },
      update: { name: nameEntry?.trim() || undefined },
      create: { email, name: nameEntry?.trim() || null },
    });
    contactId = contact.id;
  }

  const summaryLines = [`Visitor asked: "${reason}"`, "", "Collected info:"];
  for (const [key, value] of Object.entries(collectedFields)) summaryLines.push(`- ${key}: ${value}`);

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      status: "NEEDS_HUMAN",
      assigneeId: agent?.id ?? null,
      contactId,
      pendingFieldKey: null,
      handoffSummary: summaryLines.join("\n"),
    },
  });
  await prisma.ticket.upsert({
    where: { conversationId: conversation.id },
    update: {},
    create: { conversationId: conversation.id, status: "OPEN", priority: "NORMAL" },
  });
}

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

  // A human (or a human's own hand-back-to-AI action) owns this conversation now — the AI
  // stays out of it entirely. The visitor's message is saved and pushed live to the agent
  // above; no reply is generated here.
  if (activeConversation.status === "NEEDS_HUMAN" || activeConversation.status === "HUMAN") {
    return NextResponse.json({ conversationId: activeConversation.id, message: null, silent: true }, { headers: cors });
  }

  // Mid field-collection: this message is the answer to pendingFieldKey, not a new question.
  if (activeConversation.status === "PENDING_HANDOFF" && activeConversation.pendingFieldKey) {
    const collectedFields = { ...((activeConversation.collectedFields as Record<string, string> | null) ?? {}) };
    collectedFields[activeConversation.pendingFieldKey] = message.trim();

    const fields = await prisma.handoffField.findMany({ where: { required: true }, orderBy: { order: "asc" } });
    const nextField = fields.find((f) => !collectedFields[f.key]);

    let replyContent: string;
    if (nextField) {
      await prisma.conversation.update({
        where: { id: activeConversation.id },
        data: { collectedFields, pendingFieldKey: nextField.key },
      });
      replyContent = `Thanks. And your ${nextField.label.toLowerCase()}?`;
    } else {
      const reason = (activeConversation.handoffSummary?.match(/^Visitor asked: "(.*)"$/)?.[1]) || message;
      await finalizeHandoff(activeConversation, reason, collectedFields);
      replyContent = "Thanks — I've got everything I need. Connecting you with our team now.";
    }

    const aiMessage = await prisma.message.create({
      data: { conversationId: activeConversation.id, role: "AI", content: replyContent },
    });
    publish({
      type: "message",
      conversationId: activeConversation.id,
      isNewConversation: false,
      message: {
        id: aiMessage.id,
        role: "AI",
        content: aiMessage.content,
        confidence: null,
        createdAt: aiMessage.createdAt.toISOString(),
        agent: null,
      },
    });
    return NextResponse.json(
      { conversationId: activeConversation.id, message: { id: aiMessage.id, role: "AI", content: replyContent, confidence: null } },
      { headers: cors },
    );
  }

  const result = await respond({
    question: message,
    systemPrompt: settings.systemPrompt,
    threshold: settings.threshold,
    model: settings.model,
  });

  let replyContent = result.content;

  if (result.handoff) {
    const fields = await prisma.handoffField.findMany({ where: { required: true }, orderBy: { order: "asc" } });
    if (fields.length > 0) {
      // Don't hand off yet — collect the required fields first, one at a time.
      await prisma.conversation.update({
        where: { id: activeConversation.id },
        data: { status: "PENDING_HANDOFF", pendingFieldKey: fields[0].key, handoffSummary: `Visitor asked: "${message}"` },
      });
      replyContent = `I'm not sure about that — let me get you to our team. First, what's your ${fields[0].label.toLowerCase()}?`;
    } else {
      await finalizeHandoff(activeConversation, message, {});
    }
  }

  const aiMessage = await prisma.message.create({
    data: {
      conversationId: activeConversation.id,
      role: "AI",
      content: replyContent,
      confidence: result.handoff ? null : result.confidence,
      sources: result.handoff ? undefined : result.sources,
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
