// In-process sliding-window limiter for the public widget endpoints. Per-conversation limits
// alone can be dodged by opening a fresh conversation every message, so this also caps by IP.
// Single instance only (like presence.ts); put a proxy-level limit in front for multi-instance.
const hits = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) for (const [k, v] of hits) if (now - v[v.length - 1]! > windowMs) hits.delete(k);
  return false;
}
