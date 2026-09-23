import { EventEmitter } from "node:events";

// In-process pub/sub: this app runs as a single Node process (see CLAUDE.md dev workflow —
// no serverless/multi-instance deploy for this single-tenant repo), so a plain EventEmitter
// is enough to push live updates between the widget's public routes and the admin's
// Conversations page without adding Redis pub/sub or a websocket server.
export type ConversationEvent =
  | {
      type: "message";
      conversationId: string;
      isNewConversation: boolean;
      message: {
        id: string;
        role: "VISITOR" | "AI" | "AGENT";
        content: string;
        confidence: number | null;
        createdAt: string;
        agent: { id: string; name: string } | null;
      };
    }
  | { type: "typing"; conversationId: string; agentName: string };

const g = globalThis as unknown as { momoConversationEvents?: EventEmitter };
export const conversationEvents = g.momoConversationEvents ?? new EventEmitter().setMaxListeners(0);
if (process.env.NODE_ENV !== "production") g.momoConversationEvents = conversationEvents;

// Every event goes to the admin-wide "inbox" channel plus a per-conversation channel the
// widget subscribes to once it has a conversation id.
export function publish(event: ConversationEvent) {
  conversationEvents.emit("admin", event);
  conversationEvents.emit(`conversation:${event.conversationId}`, event);
}
