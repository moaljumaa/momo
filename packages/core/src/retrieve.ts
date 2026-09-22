import { embed } from "./embed";
import { hybridSearchChunks } from "@momo/db/chunks";

export type RetrievedChunk = { id: string; sourceId: string; content: string; score: number };

export async function retrieve(query: string, k = 6): Promise<RetrievedChunk[]> {
  const [vector] = await embed([query]);
  if (!vector) return [];
  return hybridSearchChunks(vector, query, k);
}
