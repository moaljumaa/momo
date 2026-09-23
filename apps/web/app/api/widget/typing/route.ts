import { NextRequest, NextResponse } from "next/server";
import { publish } from "@/lib/conversation-events";
import { touchLastSeen } from "@/lib/presence";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

// Public, unauthenticated — mirrors the admin's typing endpoint so the visitor's widget can
// tell the admin app "visitor is typing" live.
export async function POST(req: NextRequest) {
  const { conversationId } = (await req.json()) as { conversationId?: string };
  if (!conversationId) return NextResponse.json({ error: "conversationId is required" }, { status: 400, headers: cors });

  touchLastSeen(conversationId);
  publish({ type: "typing", conversationId, source: "visitor" });
  return NextResponse.json({ ok: true }, { headers: cors });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: cors });
}
