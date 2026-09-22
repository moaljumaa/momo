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

// Hybrid retrieval: combine pgvector similarity and Postgres full-text search via reciprocal
// rank fusion (RRF) so a query that's mostly exact keywords (an error code, a product name)
// isn't at the mercy of embedding similarity alone, and vice versa for paraphrased questions.
// `k` is RRF's damping constant — 60 is the standard default from the original paper.
export async function hybridSearchChunks(embedding: number[], query: string, limit = 8, poolSize = 30, k = 60) {
  const vector = `[${embedding.join(",")}]`;
  return prisma.$queryRaw<{ id: string; sourceId: string; content: string; score: number }[]>`
    WITH vector_ranked AS (
      SELECT id, "sourceId", content, row_number() OVER (ORDER BY embedding <=> ${vector}::vector) AS rank
      FROM "Chunk"
      ORDER BY embedding <=> ${vector}::vector
      LIMIT ${poolSize}
    ),
    text_ranked AS (
      SELECT id, "sourceId", content,
        row_number() OVER (ORDER BY ts_rank("searchVector", plainto_tsquery('english', ${query})) DESC) AS rank
      FROM "Chunk"
      WHERE "searchVector" @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank("searchVector", plainto_tsquery('english', ${query})) DESC
      LIMIT ${poolSize}
    ),
    combined AS (
      SELECT id, "sourceId", content, 1.0 / (${k} + rank) AS score FROM vector_ranked
      UNION ALL
      SELECT id, "sourceId", content, 1.0 / (${k} + rank) AS score FROM text_ranked
    )
    SELECT id, MIN("sourceId") AS "sourceId", MIN(content) AS content, SUM(score) AS score
    FROM combined
    GROUP BY id
    ORDER BY score DESC
    LIMIT ${limit}
  `;
}
