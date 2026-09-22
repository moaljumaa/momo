// Deterministic text-cleanup pass run after extraction (crawl/PDF/docx/etc), before chunking.
// No LLM here on purpose: rules are free, instant, and can't silently paraphrase or drop
// source content that's supposed to stay faithful.

const BULLET_CHARS = /[•●○◦‣▪▸►∙·]/g;

// Collapse whitespace, de-hyphenate words split across a line break, normalize bullets.
export function cleanText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/([a-zA-Z])-\n([a-zA-Z])/g, "$1$2") // de-hyphenate: "exam-\nple" -> "example"
    .replace(BULLET_CHARS, "-")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const MAX_HEADER_FOOTER_LINE_LENGTH = 80;

// Strip lines repeated near-verbatim across most "pages" of one source (running headers,
// footers, page numbers) — e.g. a crawled site's multi-page nav boilerplate, or a PDF's
// per-page footer. Each entry in `pages` is one page/chunk of the same source; a single-page
// source is left untouched since nothing can repeat.
export function stripRepeatedLines(pages: string[]): string[] {
  if (pages.length < 3) return pages;

  const counts = new Map<string, number>();
  const linesByPage = pages.map((p) => p.split("\n"));
  for (const lines of linesByPage) {
    const seen = new Set<string>();
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.length > MAX_HEADER_FOOTER_LINE_LENGTH || seen.has(line)) continue;
      seen.add(line);
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }

  const threshold = Math.ceil(pages.length * 0.6);
  const repeated = new Set([...counts.entries()].filter(([, n]) => n >= threshold).map(([line]) => line));
  if (repeated.size === 0) return pages;

  return linesByPage.map((lines) =>
    lines
      .filter((raw) => !repeated.has(raw.trim()))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}
