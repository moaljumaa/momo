import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Manual logo upload for the onboarding wizard's Logo step, alongside the auto-detected
// candidates. Saved under public/ so it's served as a static file with no extra route —
// fine for a self-hosted, single-tenant deploy running `next start` off a persistent volume.
export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
};
const LOGO_DIR = path.join(process.cwd(), "public", "uploads", "logos");

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const ext = ACCEPTED[file.type];
  if (!ext) return NextResponse.json({ error: "use a PNG, JPG, WebP or SVG image" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "image is over 5 MB" }, { status: 400 });

  await mkdir(LOGO_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}${ext}`;
  await writeFile(path.join(LOGO_DIR, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/logos/${filename}` }, { status: 201 });
}
