// Embeddings behind one function: swap EMBEDDING_MODEL (and provider below) without touching call sites.
// Dimensions must stay 1536 to match packages/db `Chunk.embedding vector(1536)`.

import { getOpenRouterApiKey } from "./settings";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings";

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await getOpenRouterApiKey()}`,
    },
    body: JSON.stringify({ model: process.env.EMBEDDING_MODEL, input: texts }),
  });
  if (!res.ok) {
    throw new Error(`embedding request failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
