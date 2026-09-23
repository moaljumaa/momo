// Best-effort IP -> country/city lookup for the Conversations sidebar. Uses ip-api.com's
// free tier (no key, ~45 req/min) — good enough for a single-tenant instance's own traffic.
// Never throws: geo data is a nice-to-have, not something that should ever block a chat reply.
export async function lookupGeoIp(ip: string | null): Promise<{ country: string | null; city: string | null }> {
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { country: null, city: null };
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return { country: null, city: null };
    const data = await res.json();
    if (data.status !== "success") return { country: null, city: null };
    return { country: data.country ?? null, city: data.city ?? null };
  } catch {
    return { country: null, city: null };
  }
}

// First public IP in X-Forwarded-For (or the direct connection as a last resort).
export function extractClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
