import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Profile picture upload — same static-file approach as the logo upload, but open to any
// signed-in user since it only ever sets their own image (the client then calls updateUser).
export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};
const AVATAR_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const ext = ACCEPTED[file.type];
  if (!ext) return NextResponse.json({ error: "use a PNG, JPG or WebP image" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "image is over 2 MB" }, { status: 400 });

  await mkdir(AVATAR_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}${ext}`;
  await writeFile(path.join(AVATAR_DIR, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/avatars/${filename}` }, { status: 201 });
}
