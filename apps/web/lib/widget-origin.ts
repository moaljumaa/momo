// Shared domain-allowlist check for the two public widget routes.
// Empty allowlist = allow any origin (matches Chatbase's "off" state for Specific domains).
export function originAllowed(req: Request, allowedDomains: unknown): boolean {
  const patterns = Array.isArray(allowedDomains) ? (allowedDomains as string[]) : [];
  if (patterns.length === 0) return true;

  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser callers (curl, server-to-server) aren't spoofing a page origin

  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }

  return patterns.some((pattern) => {
    const cleaned = pattern.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!cleaned) return false;
    if (cleaned.startsWith("*.")) {
      const suffix = cleaned.slice(1); // ".example.com"
      return host.endsWith(suffix) && host !== suffix.slice(1);
    }
    return host === cleaned;
  });
}
