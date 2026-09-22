import { Queue } from "bullmq";
import IORedis from "ioredis";

const g = globalThis as unknown as { momoRedis?: IORedis; momoIngestQueue?: Queue };

export function redisConnection() {
  if (!g.momoRedis) {
    g.momoRedis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
  }
  return g.momoRedis;
}

export type IngestJob = { sourceId: string };

export function ingestQueue() {
  if (!g.momoIngestQueue) {
    g.momoIngestQueue = new Queue<IngestJob>("ingest", { connection: redisConnection() });
  }
  return g.momoIngestQueue;
}
