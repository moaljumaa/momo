import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { originAllowed } from "@/lib/widget-origin";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

// Public, unauthenticated — the widget reads this from any embedding site.
export async function GET(req: NextRequest) {
  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  if (!settings.widgetEnabled) {
    return NextResponse.json({ error: "widget disabled" }, { status: 403, headers: cors });
  }
  if (!originAllowed(req, settings.widgetAllowedDomains)) {
    return NextResponse.json({ error: "origin not allowed" }, { status: 403, headers: cors });
  }

  return NextResponse.json(
    {
      config: {
        name: settings.name,
        widgetColor: settings.widgetColor,
        welcomeMessage: settings.welcomeMessage,
        placeholder: settings.placeholder,
        suggestedQuestions: settings.suggestedQuestions as string[],
        logoUrl: settings.logoUrl,
      },
    },
    { headers: cors },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: cors });
}
