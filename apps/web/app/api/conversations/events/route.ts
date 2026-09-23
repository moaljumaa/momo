import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { conversationEvents, type ConversationEvent } from "@/lib/conversation-events";
import { sseResponse } from "@/lib/sse";

export const runtime = "nodejs";

// Live feed for the whole admin app: new visitor messages, AI replies, agent replies and
// typing indicators across every conversation. Drives the Conversations page's live list/
// thread updates and the app-wide "new message" toast + sound.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  return sseResponse((send) => {
    const handler = (event: ConversationEvent) => send(event);
    conversationEvents.on("admin", handler);
    return () => conversationEvents.off("admin", handler);
  });
}
