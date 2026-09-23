import { Worker } from "bullmq";
import { redisConnection, type IngestJob } from "@momo/core/queue";
import { crawlUrl, crawlPages } from "@momo/core/crawl";
import { chunkText } from "@momo/core/chunk";
import { cleanText, stripRepeatedLines } from "@momo/core/clean";
import { embed } from "@momo/core/embed";
import { prisma } from "@momo/db";
import { insertChunks } from "@momo/db/chunks";

console.log("momo worker up");

new Worker<IngestJob>(
  "ingest",
  async (job) => {
    const source = await prisma.source.findUniqueOrThrow({ where: { id: job.data.sourceId } });
    const selected = source.selectedUrls as string[] | null;
    await prisma.source.update({
      where: { id: source.id },
      data: {
        status: "PROCESSING",
        error: null,
        crawlProgress: selected?.map((url) => ({ url, status: "pending" })) ?? undefined,
      },
    });

    try {
      // Clear any chunks from a prior attempt first — a redelivered/retried job (e.g. a
      // stalled job after a worker restart) must not double up on top of a previous
      // partial or full run of this same source.
      await prisma.$executeRaw`DELETE FROM "Chunk" WHERE "sourceId" = ${source.id}`;

      const texts: { label: string; text: string }[] = [];

      if (source.type === "URL") {
        const progress = new Map<string, "pending" | "done" | "failed">(selected?.map((u) => [u, "pending"]));
        const pages =
          selected && selected.length > 0
            ? await crawlPages(selected, async (url, status) => {
                progress.set(url, status);
                await prisma.source.update({
                  where: { id: source.id },
                  data: { crawlProgress: [...progress].map(([u, s]) => ({ url: u, status: s })) },
                });
              })
            : await crawlUrl(source.url!);
        if (pages.length === 0) throw new Error("nothing crawlable at that URL");
        for (const p of pages) texts.push({ label: p.url, text: `${p.title}\n\n${p.text}` });
      } else {
        // FILE / QA / TEXT: content was captured as plain text at creation time
        texts.push({ label: source.title, text: source.content ?? "" });
      }

      const cleanedBodies = stripRepeatedLines(texts.map((t) => cleanText(t.text)));
      const allChunks = texts.flatMap((t, i) =>
        chunkText(cleanedBodies[i]!).map((content) => ({ label: t.label, content })),
      );
      if (allChunks.length === 0) throw new Error("no text extracted");

      // embed in batches to keep request bodies reasonable
      const batchSize = 64;
      for (let i = 0; i < allChunks.length; i += batchSize) {
        const batch = allChunks.slice(i, i + batchSize);
        const vectors = await embed(batch.map((c) => c.content));
        await insertChunks(
          source.id,
          batch.map((c, j) => ({
            content: c.content,
            embedding: vectors[j]!,
            label: source.type === "URL" ? c.label : undefined,
          })),
        );
      }

      await prisma.source.update({ where: { id: source.id }, data: { status: "READY" } });
    } catch (err) {
      await prisma.source.update({
        where: { id: source.id },
        data: { status: "FAILED", error: err instanceof Error ? err.message : String(err) },
      });
    }
  },
  { connection: redisConnection() },
);
