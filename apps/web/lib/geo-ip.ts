import { isIP } from "node:net";

// Best-effort IP -> country/city lookup for the Conversations sidebar. Uses ip-api.com's
// free tier (no key, ~45 req/min) — good enough for a single-tenant instance's own traffic.
// Never throws: geo data is a nice-to-have, not something that should ever block a chat reply.
export async function lookupGeoIp(ip: string | null): Promise<{ country: string | null; city: string | null }> {
  // Off by default: this sends visitor IPs to a third party (ip-api.com, plain HTTP on the free
  // tier). Set GEOIP_LOOKUP=true to opt in.
  if (process.env.GEOIP_LOOKUP !== "true") return { country: null, city: null };
  if (!ip || isIP(ip) === 0 || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
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
  // Only meaningful behind a reverse proxy that sets/overwrites X-Forwarded-For; anything that
  // isn't a valid IP is dropped so it can't be stored or interpolated anywhere.
  const raw = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip")?.trim();
  return raw && isIP(raw) ? raw : null;
}
