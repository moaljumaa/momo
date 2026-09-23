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
  | { type: "typing"; conversationId: string; source: "agent"; agentId: string; agentName: string }
  | { type: "typing"; conversationId: string; source: "visitor" }
  | { type: "presence"; conversationId: string; online: boolean; lastSeenAt: string | null }
  // Fired whenever a conversation's status/assignee/priority/labels change server-side —
  // an AI handoff, an agent reassigning it, resolving it, etc. — so every open admin session
  // reflects it live instead of needing a manual reload.
  | {
      type: "conversation";
      conversationId: string;
      conversation: {
        status: "AI" | "PENDING_HANDOFF" | "NEEDS_HUMAN" | "HUMAN" | "RESOLVED";
        priority: "LOW" | "NORMAL" | "HIGH" | null;
        assignee: { id: string; name: string; image: string | null } | null;
        labels: { id: string; name: string; color: string }[];
      };
    };

const g = globalThis as unknown as { momoConversationEvents?: EventEmitter };
export const conversationEvents = g.momoConversationEvents ?? new EventEmitter().setMaxListeners(0);
if (process.env.NODE_ENV !== "production") g.momoConversationEvents = conversationEvents;

// Every event goes to the admin-wide "inbox" channel plus a per-conversation channel the
// widget subscribes to once it has a conversation id.
export function publish(event: ConversationEvent) {
  conversationEvents.emit("admin", event);
  conversationEvents.emit(`conversation:${event.conversationId}`, event);
}
