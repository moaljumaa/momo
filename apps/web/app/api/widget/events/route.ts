import { NextRequest } from "next/server";
import { prisma } from "@momo/db";
import { originAllowed } from "@/lib/widget-origin";
import { conversationEvents, type ConversationEvent } from "@/lib/conversation-events";
import { sseResponse } from "@/lib/sse";

export const runtime = "nodejs";

// Public, unauthenticated (same trust model as /api/widget/chat): lets a visitor's widget
// hear about an agent's reply and typing status live, without polling.
export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) return new Response("conversationId is required", { status: 400 });

  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if (!settings.widgetEnabled) return new Response("widget disabled", { status: 403 });
  if (!originAllowed(req, settings.widgetAllowedDomains)) return new Response("origin not allowed", { status: 403 });

  return sseResponse(
    (send) => {
      const channel = `conversation:${conversationId}`;
      const handler = (event: ConversationEvent) => send(event);
      conversationEvents.on(channel, handler);
      return () => conversationEvents.off(channel, handler);
    },
    { "Access-Control-Allow-Origin": "*" },
  );
}
