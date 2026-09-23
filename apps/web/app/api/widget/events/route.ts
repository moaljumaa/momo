import { NextRequest } from "next/server";
import { prisma } from "@momo/db";
import { originAllowed } from "@/lib/widget-origin";
import { conversationEvents, publish, type ConversationEvent } from "@/lib/conversation-events";
import { sseResponse } from "@/lib/sse";
import { markConnected, markDisconnected, getPresence } from "@/lib/presence";

export const runtime = "nodejs";

// Public, unauthenticated (same trust model as /api/widget/chat): lets a visitor's widget
// hear about an agent's reply and typing status live, without polling. Doubles as the
// visitor's presence signal — the admin sidebar shows "online" for as long as this stream
// stays open, and "last seen" from the moment it closes.
export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) return new Response("conversationId is required", { status: 400 });

  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if (!settings.widgetEnabled) return new Response("widget disabled", { status: 403 });
  if (!originAllowed(req, settings.widgetAllowedDomains)) return new Response("origin not allowed", { status: 403 });

  return sseResponse(
    (send) => {
      const channel = `conversation:${conversationId}`;
      // Only forward events meant for the visitor: an agent's reply/typing, never the
      // visitor's own typing signal echoing back through the same per-conversation channel.
      const handler = (event: ConversationEvent) => {
        if (event.type === "typing" && event.source !== "agent") return;
        if (event.type === "presence") return;
        send(event);
      };
      conversationEvents.on(channel, handler);
      markConnected(conversationId);
      publish({ type: "presence", conversationId, ...getPresence(conversationId) });

      return () => {
        conversationEvents.off(channel, handler);
        markDisconnected(conversationId);
        publish({ type: "presence", conversationId, ...getPresence(conversationId) });
      };
    },
    { "Access-Control-Allow-Origin": "*" },
  );
}
