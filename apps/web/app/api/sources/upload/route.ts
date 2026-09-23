import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@momo/db";
import { ingestQueue } from "@momo/core/queue";
import { ocrPdf } from "@momo/core/ocr";
import { UPLOADS_DIR } from "@/lib/uploads";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// FILE sources extract their text right here at upload time (like TEXT/QA), rather than in
// the worker, so a bad/unreadable file fails the request immediately with a clear reason
// instead of silently landing as a FAILED source later.
export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED = [".pdf", ".doc", ".docx", ".txt"];
// Self-hosted, single-tenant: originals live on local disk next to the app, not object
// storage — set UPLOADS_DIR to point at a mounted volume in production.
const UPLOAD_DIR = UPLOADS_DIR;

async function extractText(buffer: Buffer, ext: string): Promise<string> {
  if (ext === ".txt") return buffer.toString("utf8");
  if (ext === ".pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      return (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  }
  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  // .doc
  const { default: WordExtractor } = await import("word-extractor");
  const doc = await new WordExtractor().extract(buffer);
  return doc.getBody();
}

// pdf-parse throws typed exceptions with a real reason (password-protected, corrupt
// structure, etc.) — map the ones worth surfacing to a specific message instead of the
// generic fallback, which was hiding genuine bugs behind "make sure it isn't password
// protected" even when that wasn't the actual problem.
async function extractErrorMessage(err: unknown, ext: string): Promise<string> {
  if (ext === ".pdf") {
    const { PasswordException, InvalidPDFException } = await import("pdf-parse");
    if (err instanceof PasswordException) {
      return "that PDF is password-protected — remove the password and re-upload";
    }
    if (err instanceof InvalidPDFException) {
      return "that doesn't look like a valid PDF — try re-exporting or re-saving it and upload again";
    }
  }
  return "couldn't read that file — try re-saving/re-exporting it and upload again";
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ACCEPTED.includes(ext)) {
    return NextResponse.json({ error: "unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file is over 20 MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;
  try {
    text = (await extractText(buffer, ext)).trim();
  } catch (err) {
    // Log the real cause server-side (pdf-parse's own errors are stripped of useful detail
    // by the time a generic message reaches the user) so a "couldn't read that file" report
    // can actually be diagnosed instead of guessed at.
    console.error(`[sources/upload] extraction failed for "${file.name}" (${ext}):`, err);
    return NextResponse.json({ error: await extractErrorMessage(err, ext) }, { status: 400 });
  }

  let summary: string | undefined;

  // No selectable text — likely a scanned/image PDF. Fall back to a vision-model OCR pass
  // rather than rejecting outright; only reached for PDFs since .doc/.docx/.txt are never
  // image-based.
  if (!text && ext === ".pdf") {
    try {
      const ocr = await ocrPdf(buffer);
      text = ocr.pages.join("\n\n").trim();
      summary = ocr.summary || undefined;
    } catch (err) {
      console.error(`[sources/upload] OCR fallback failed for "${file.name}":`, err);
    }
  }

  if (!text) {
    return NextResponse.json(
      { error: ext === ".pdf" ? "no readable text found, even with OCR — is this page blank or unreadable?" : "no readable text found" },
      { status: 400 },
    );
  }

  const source = await prisma.source.create({
    data: { type: "FILE", title: file.name, content: text, summary, status: "PENDING" },
  });

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, `${source.id}${ext}`), buffer);
  } catch {
    // the extracted text is already saved — keeping the original is best-effort
  }

  await ingestQueue().add("ingest", { sourceId: source.id });
  return NextResponse.json({ source }, { status: 201 });
}
