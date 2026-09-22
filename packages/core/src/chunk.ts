// Plain-text chunker: paragraph-aware, ~800 chars per chunk with slight overlap.
// Good enough for v0.1; swap for a token-aware splitter later if needed.

export function chunkText(text: string, targetSize = 800, overlap = 100): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= targetSize) {
      current = current ? `${current}\n\n${para}` : para;
      continue;
    }
    if (current) chunks.push(current);
    if (para.length <= targetSize) {
      current = para;
    } else {
      // paragraph itself too long, hard-split with overlap
      for (let i = 0; i < para.length; i += targetSize - overlap) {
        chunks.push(para.slice(i, i + targetSize));
      }
      current = "";
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
