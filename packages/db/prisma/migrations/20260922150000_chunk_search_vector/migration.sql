ALTER TABLE "Chunk" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED;

CREATE INDEX "Chunk_searchVector_idx" ON "Chunk" USING GIN ("searchVector");
