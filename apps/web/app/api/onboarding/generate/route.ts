import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { draftOnboarding } from "@momo/core/onboarding";
import { fetchBranding } from "@momo/core/branding";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Called once a Source reaches READY. Generates the wizard's editable draft — nothing
// is saved here, the wizard's approve step writes to /api/settings.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sourceId } = (await req.json()) as { sourceId?: string };
  if (!sourceId) return NextResponse.json({ error: "sourceId is required" }, { status: 400 });

  const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
  if (source.status !== "READY") {
    return NextResponse.json({ error: "source is not ready yet" }, { status: 409 });
  }

  const chunks = await prisma.chunk.findMany({
    where: { sourceId },
    select: { content: true },
    take: 40,
  });
  const sampleText = chunks.map((c) => c.content).join("\n\n");

  try {
    const [draft, branding] = await Promise.all([
      // One retry: generateObject occasionally gets a model response that fails the zod
      // schema (normal LLM non-determinism), and a plain retry clears it almost always.
      draftOnboarding({ siteUrl: source.url || source.title, sampleText }).catch(() =>
        draftOnboarding({ siteUrl: source.url || source.title, sampleText }),
      ),
      source.url
        ? fetchBranding(source.url)
        : Promise.resolve({ logoUrl: null, faviconUrl: null, logoCandidates: [] }),
    ]);
    return NextResponse.json({ draft: { ...draft, ...branding } });
  } catch (err) {
    console.error("onboarding generate failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed — try again" },
      { status: 502 },
    );
  }
}
