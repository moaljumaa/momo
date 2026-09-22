import { embed } from "./embed";
import { searchChunks } from "@momo/db/chunks";

export type RetrievedChunk = { id: string; sourceId: string; content: string; distance: number };

export async function retrieve(query: string, k = 6): Promise<RetrievedChunk[]> {
  const [vector] = await embed([query]);
  if (!vector) return [];
  return searchChunks(vector, k);
}
