import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";
import { createCanvas } from "@napi-rs/canvas";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
// A plain vision-capable chat model is enough for OCR (no reasoning needed) and keeps this
// path cheap — gpt-4o-mini reads clean, on the order of $0.001/page. Separate from
// CHAT_MODEL/EMBEDDING_MODEL since the bot's configured chat model may not support images.
const visionModel = () => openrouter.chat(process.env.OCR_MODEL || "openai/gpt-4o-mini");

const MAX_OCR_PAGES = 20;
const RENDER_SCALE = 2; // ~144 DPI at standard page size — enough for the model to read text reliably

const ocrSchema = z.object({
  pages: z.array(z.string()).describe(
    "Extracted plain text for each page image, in the same order given, preserving paragraph breaks. " +
      "An unreadable/blank page gets an empty string, never invented text.",
  ),
  summary: z
    .string()
    .describe("2-3 sentence summary of what this document is, for quick reference in the sources list"),
});

export type OcrResult = z.infer<typeof ocrSchema>;

// Fallback for scanned/image PDFs where pdf-parse finds no selectable text: render each page
// to an image and have a vision model read it. Structured output (not free text) so the
// per-page split and the summary can both be saved cleanly, instead of re-parsing prose.
export async function ocrPdf(buffer: Buffer): Promise<OcrResult> {
  const images = await renderPdfPagesToPng(buffer);
  if (images.length === 0) return { pages: [], summary: "" };

  const { object } = await generateObject({
    model: visionModel(),
    schema: ocrSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Transcribe the text from each of these ${images.length} scanned document page(s), in order, then summarize the document.`,
          },
          ...images.map((png) => ({
            type: "file" as const,
            data: png,
            mediaType: "image/png",
          })),
        ],
      },
    ],
  });
  return object;
}

async function renderPdfPagesToPng(buffer: Buffer): Promise<Buffer[]> {
  // pdfjs-dist's legacy build targets Node directly (no DOM/worker needed). Point it at its
  // own bundled standard fonts so pages using base-14 fonts (Helvetica etc, not embedded in
  // the PDF) still render instead of silently coming out blank.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdfjs's Node font-data loader passes this straight to fs.readFile, not a URL parser —
  // must be a plain filesystem path with a trailing "/", not a file:// URL.
  const standardFontDataUrl = `${path.dirname(require.resolve("pdfjs-dist/package.json"))}/standard_fonts/`;
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), standardFontDataUrl });
  const doc = await loadingTask.promise;

  const pageCount = Math.min(doc.numPages, MAX_OCR_PAGES);
  const images: Buffer[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = createCanvas(viewport.width, viewport.height);
    await page.render({
      canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
    }).promise;
    images.push(canvas.toBuffer("image/png"));
  }
  await loadingTask.destroy();
  return images;
}
