import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { publish } from "@/lib/conversation-events";

// Fired by the admin reply box while an agent is typing; purely ephemeral (no DB write) —
// the widget clears the indicator itself after a short period of silence.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  publish({ type: "typing", conversationId: id, source: "agent", agentId: session.user.id, agentName: session.user.name });
  return NextResponse.json({ ok: true });
}
