import { lookup } from "node:dns";
import { isIP } from "node:net";
import { Agent, fetch } from "undici";

// fetch() for user-supplied URLs (crawler, branding). Blocks requests to private, loopback
// and link-local addresses (SSRF, e.g. cloud metadata at 169.254.169.254). The check runs on
// the address the socket actually connects to, so DNS rebinding can't swap it after the fact,
// and every redirect hop is re-checked. See allowPrivate below.

const MAX_REDIRECTS = 5;
// Local and private URLs are allowed while developing (so you can point it at localhost) and
// blocked in production unless ALLOW_PRIVATE_URLS=true. ALLOW_PRIVATE_URLS=false forces the block.
const allowPrivate = () => {
  const v = process.env.ALLOW_PRIVATE_URLS;
  return v ? v === "true" : process.env.NODE_ENV !== "production";
};

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || /^fe[89ab]/.test(v);
  }
  const [a, b] = ip.split(".").map(Number) as [number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

const dispatcher = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      lookup(hostname, options, (err, address, family) => {
        if (err) return callback(err, address as never, family as never);
        const list = Array.isArray(address) ? address.map((a) => a.address) : [address as string];
        if (!allowPrivate() && list.some(isPrivateIp)) {
          return callback(new Error("that address is not allowed") as NodeJS.ErrnoException, "", 0);
        }
        callback(null, address as never, family as never);
      });
    },
  },
});

function assertAllowedUrl(raw: string): void {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("only http(s) URLs are allowed");
  // Hostnames are checked when the socket connects; IP literals never hit the DNS lookup.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !allowPrivate() && isPrivateIp(host)) throw new Error("that address is not allowed");
}

export async function safeFetch(url: string, init: { headers?: Record<string, string> } = {}): Promise<Response> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertAllowedUrl(current);
    const res = await fetch(current, {
      headers: init.headers,
      dispatcher,
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res as unknown as Response;
    current = new URL(location, current).toString();
  }
  throw new Error("too many redirects");
}

export function sameOrigin(candidate: string, origin: string): boolean {
  try {
    return new URL(candidate).origin === origin;
  } catch {
    return false;
  }
}
