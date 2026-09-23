"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ConversationEvent } from "@/lib/conversation-events";
import { authClient } from "@/lib/auth-client";

// Mounted once for the whole authenticated app (not just the Conversations page) so an
// agent working in Playground still hears a new customer message come in. A short beep is
// synthesized with the Web Audio API — no audio asset needed — and only plays for messages
// from a visitor (not the agent's own replies or routine AI answers being echoed back).
function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 720;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {
    // best-effort — some browsers block audio before any user gesture on the page
  }
}

export function ConversationNotifications() {
  const router = useRouter();
  const seenNewConversation = useRef(new Set<string>());
  const session = authClient.useSession();
  const myUserIdRef = useRef<string | undefined>(session.data?.user?.id);
  myUserIdRef.current = session.data?.user?.id;

  useEffect(() => {
    const source = new EventSource("/api/conversations/events");

    source.onmessage = (e) => {
      const event = JSON.parse(e.data) as ConversationEvent;

      if (event.type === "conversation") {
        if (event.conversation.assignee?.id && event.conversation.assignee.id === myUserIdRef.current) {
          beep();
          toast("Conversation assigned to you", {
            action: {
              label: "Open",
              onClick: () => router.push(`/conversations?open=${event.conversationId}`),
            },
          });
        }
        return;
      }

      if (event.type !== "message" || event.message.role !== "VISITOR") return;

      const isFirstToast =
        event.isNewConversation && !seenNewConversation.current.has(event.conversationId);
      if (isFirstToast) seenNewConversation.current.add(event.conversationId);

      beep();
      toast(isFirstToast ? "New conversation" : "New message", {
        description: event.message.content.slice(0, 120),
        action: {
          label: "Open",
          onClick: () => router.push(`/conversations?open=${event.conversationId}`),
        },
      });
    };

    return () => source.close();
  }, [router]);

  return null;
}
