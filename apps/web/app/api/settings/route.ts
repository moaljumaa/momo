import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { encryptSecret } from "@momo/core/crypto";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getOrCreateSettings() {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { openrouterApiKey, ...settings } = await getOrCreateSettings();
  // Never send the raw key back to the client — only whether one is set.
  return NextResponse.json({ settings: { ...settings, openrouterApiKeySet: !!openrouterApiKey } });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = [
    "name",
    "systemPrompt",
    "tone",
    "threshold",
    "model",
    "widgetColor",
    "widgetPosition",
    "widgetEnabled",
    "widgetAllowedDomains",
    "rateLimitCount",
    "rateLimitWindowSec",
    "rateLimitMessage",
    "welcomeMessage",
    "placeholder",
    "suggestedQuestions",
    "logoUrl",
    "faviconUrl",
    "openrouterApiKey",
    "onboardingCompletedAt",
  ] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) data[key] = body[key];
  if (typeof data.openrouterApiKey === "string" && data.openrouterApiKey.trim()) {
    data.openrouterApiKey = encryptSecret(data.openrouterApiKey.trim());
  } else {
    delete data.openrouterApiKey; // never blank the stored key by accident
  }

  await getOrCreateSettings();
  const { openrouterApiKey, ...settings } = await prisma.settings.update({ where: { id: 1 }, data });
  return NextResponse.json({ settings: { ...settings, openrouterApiKeySet: !!openrouterApiKey } });
}
