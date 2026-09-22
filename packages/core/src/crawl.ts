import * as cheerio from "cheerio";

// Static-HTML crawl only (no headless rendering — that's the cloud JS-rendering crawler).
// Same-origin only.

const MAX_DISCOVERED = 300;
const MAX_LEGACY_PAGES = 30;

export type CrawledPage = { url: string; title: string; text: string };

// Step 1 of add-website: find candidate pages without fetching their content, so the
// user can pick which ones to actually crawl. Sitemap AND same-origin homepage links —
// combined, not either/or, since a lot of real sites have a thin or stale sitemap that
// misses pages the nav links to (and vice versa). Sorted by path depth then
// alphabetically so it reads as a hierarchy.
export async function discoverUrls(startUrl: string): Promise<string[]> {
  const origin = new URL(startUrl).origin;
  const [fromSitemap, fromHomepage] = await Promise.all([
    discoverFromSitemap(origin),
    discoverFromHomepage(startUrl, origin),
  ]);
  const urls = [...fromSitemap, ...fromHomepage];
  const unique = [...new Set(urls)];
  unique.sort((a, b) => {
    const da = new URL(a).pathname.split("/").filter(Boolean).length;
    const db = new URL(b).pathname.split("/").filter(Boolean).length;
    return da !== db ? da - db : a.localeCompare(b);
  });
  return unique.slice(0, MAX_DISCOVERED);
}

const MAX_CHILD_SITEMAPS = 8;

async function discoverFromSitemap(origin: string): Promise<string[]> {
  try {
    const rootLocs = await fetchSitemapLocs(new URL("/sitemap.xml", origin).toString());
    if (rootLocs.length === 0) return [];

    // Many sites (WordPress/Yoast especially) serve a sitemap *index* at /sitemap.xml,
    // whose <loc> entries are themselves .xml sitemaps, not pages. Expand one level.
    const pageUrls = rootLocs.filter((u) => !u.endsWith(".xml"));
    const childSitemaps = rootLocs.filter((u) => u.endsWith(".xml") && !/error/i.test(u));
    // Prefer sitemaps without a locale suffix (pages-sitemap.xml over pages-sitemap-de.xml).
    childSitemaps.sort((a, b) => Number(/-[a-z]{2}\.xml$/i.test(a)) - Number(/-[a-z]{2}\.xml$/i.test(b)));

    for (const sm of childSitemaps.slice(0, MAX_CHILD_SITEMAPS)) {
      const childLocs = await fetchSitemapLocs(sm).catch(() => []);
      pageUrls.push(...childLocs.filter((u) => !u.endsWith(".xml")));
      if (pageUrls.length >= MAX_DISCOVERED) break;
    }

    return pageUrls.filter((u) => u.startsWith(origin));
  } catch {
    return [];
  }
}

async function fetchSitemapLocs(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("no sitemap");
  const xml = await res.text();
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]!);
}

async function discoverFromHomepage(startUrl: string, origin: string): Promise<string[]> {
  try {
    const res = await fetch(startUrl, { headers: { "user-agent": "momo-bot/0.1" } });
    if (!res.ok) throw new Error("fetch failed");
    const $ = cheerio.load(await res.text());
    const links = $("a[href]")
      .map((_, el) => $(el).attr("href"))
      .get()
      .map((href) => {
        try {
          return new URL(href!, origin).toString().split("#")[0]!;
        } catch {
          return null;
        }
      })
      .filter((u): u is string => !!u && u.startsWith(origin));
    return [startUrl, ...links];
  } catch {
    return [startUrl];
  }
}

// Step 2: fetch and extract the exact pages the user selected (max 10, enforced by the API).
// onProgress fires after each page so callers can persist/display live per-page status.
export async function crawlPages(
  urls: string[],
  onProgress?: (url: string, status: "done" | "failed") => void | Promise<void>,
): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];
  for (const url of urls) {
    const page = await fetchPage(url).catch(() => null);
    if (page && page.text.length > 0) pages.push(page);
    await onProgress?.(url, page && page.text.length > 0 ? "done" : "failed");
  }
  return pages;
}

// Legacy path: no selection made (e.g. old sources, or a resync of one predating the
// picker) — rediscover the sitemap and crawl up to MAX_LEGACY_PAGES automatically.
export async function crawlUrl(startUrl: string): Promise<CrawledPage[]> {
  const urls = await discoverUrls(startUrl);
  return crawlPages(urls.slice(0, MAX_LEGACY_PAGES));
}

async function fetchPage(url: string): Promise<CrawledPage> {
  const res = await fetch(url, { headers: { "user-agent": "momo-bot/0.1" } });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript").remove();
  const title = $("title").first().text().trim() || url;
  const text = $("body").text().replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n\n").trim();
  return { url, title, text };
}
