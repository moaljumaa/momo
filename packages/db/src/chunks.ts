import { prisma } from "./index";

// Prisma can't write an `Unsupported("vector(n)")` column, so chunk inserts and
// similarity search go through raw SQL. Keep both in one place.

export async function insertChunks(
  sourceId: string,
  rows: { content: string; embedding: number[]; label?: string }[],
) {
  for (const row of rows) {
    const vector = `[${row.embedding.join(",")}]`;
    await prisma.$executeRaw`
      INSERT INTO "Chunk" (id, "sourceId", content, label, embedding, "createdAt")
      VALUES (${crypto.randomUUID()}, ${sourceId}, ${row.content}, ${row.label ?? null}, ${vector}::vector, now())
    `;
  }
}

export async function searchChunks(embedding: number[], limit = 8) {
  const vector = `[${embedding.join(",")}]`;
  return prisma.$queryRaw<{ id: string; sourceId: string; content: string; distance: number }[]>`
    SELECT id, "sourceId", content, embedding <=> ${vector}::vector AS distance
    FROM "Chunk"
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${limit}
  `;
}
