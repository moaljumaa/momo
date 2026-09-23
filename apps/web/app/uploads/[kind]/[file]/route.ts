import { readFile } from "fs/promises";
import path from "path";
import { publicUploadDir } from "@/lib/uploads";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };

// Serves uploaded logos and avatars. Only these two folders and only our own generated
// file names are reachable, so nothing else in the uploads volume can be read through here.
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; file: string }> }) {
  const { kind, file } = await params;
  if ((kind !== "logos" && kind !== "avatars") || !/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await readFile(path.join(publicUploadDir(kind), file));
    return new Response(data, {
      headers: {
        "Content-Type": TYPES[path.extname(file)]!,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
