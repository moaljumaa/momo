import * as cheerio from "cheerio";

export type Branding = {
  logoUrl: string | null;
  faviconUrl: string | null;
  // Other icons found on the homepage, for the user to pick from if logoUrl is wrong.
  logoCandidates: string[];
};

// Pulled from the homepage's <head> so the widget can carry the site's own mark. The
// "logo" is the site's own icon (favicon / apple-touch-icon) — never og:image, which is
// a social-share banner/screenshot, not a logo. Hotlinked, not downloaded — good enough
// for v0.1. The user confirms/changes this in the wizard before it's ever saved.
export async function fetchBranding(siteUrl: string): Promise<Branding> {
  try {
    const origin = new URL(siteUrl).origin;
    const res = await fetch(origin, { headers: { "user-agent": "momo-bot/0.1" } });
    if (!res.ok) throw new Error("fetch failed");
    const $ = cheerio.load(await res.text());

    const resolve = (href: string | undefined | null) => {
      if (!href) return null;
      try {
        return new URL(href, origin).toString();
      } catch {
        return null;
      }
    };

    // Every icon link in <head>, largest declared size first — apple-touch-icon and
    // large "icon"/sizes="192x192" links are much better logo material than the tiny
    // 16x16/32x32 tab favicon.
    const iconEls = $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"], link[rel="mask-icon"]').toArray();
    const sizeOf = (el: (typeof iconEls)[number]) => {
      const attr = $(el).attr("sizes") ?? "";
      const [w] = attr.split("x").map(Number);
      return Number.isFinite(w) ? (w as number) : 0;
    };
    const isApple = (el: (typeof iconEls)[number]) => ($(el).attr("rel") ?? "").includes("apple-touch-icon");

    const icons = iconEls
      .map((el) => resolve($(el).attr("href")))
      .filter((u): u is string => !!u);
    const ranked = iconEls
      .slice()
      .sort((a, b) => (Number(isApple(b)) - Number(isApple(a))) || (sizeOf(b) - sizeOf(a)))
      .map((el) => resolve($(el).attr("href")))
      .filter((u): u is string => !!u);

    const fallbackFavicon = new URL("/favicon.ico", origin).toString();
    const candidates = [...new Set([...ranked, ...icons, fallbackFavicon])];

    return {
      logoUrl: candidates[0] ?? null,
      faviconUrl: resolve($('link[rel="icon"], link[rel="shortcut icon"]').first().attr("href")) ?? fallbackFavicon,
      logoCandidates: candidates,
    };
  } catch {
    return { logoUrl: null, faviconUrl: null, logoCandidates: [] };
  }
}
