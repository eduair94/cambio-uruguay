// Where the trends come from. Three independent readers, each one allowed to fail alone.
//
// Nothing here needs a key or a login:
//   - Google Trends publishes Uruguay's daily list as RSS, with its own traffic bucket
//     ("2000+") and up to three news items per term. We never compute a volume: the bucket is
//     Google's and is reproduced verbatim.
//   - Google News publishes a per-query RSS for the Uruguayan edition. It answers 302 to the
//     bare feed URL, so redirects must be followed — a plain fetch without `redirect: follow`
//     silently returns nothing.
//   - Reddit goes through the app's existing OAuth client (classes/reddit.ts), which returns an
//     empty list rather than throwing when credentials are missing.

import { fetchListing } from "../reddit";
import type { RedditPostRaw } from "../reddit";

/** One item of Google Trends' daily RSS, before classification. */
export interface RawTrend {
  term: string;
  approxTraffic: string;
  headlines: Array<{ title: string; source: string; url: string }>;
}

export interface RawNews {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

const UA = "cambio-uruguay.com trends bot (+https://cambio-uruguay.com)";

/** Fetch with an explicit per-request deadline. */
async function getText(url: string, timeoutMs = 20_000): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml, */*" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** Undo the XML entities an RSS feed can carry, and drop any CDATA wrapper. */
function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(block);
  return m ? decodeXml(m[1] ?? "") : "";
}

function allTags(block: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "g");
  for (;;) {
    const m = re.exec(block);
    if (!m) break;
    out.push(decodeXml(m[1] ?? ""));
  }
  return out;
}

function items(xml: string): string[] {
  return allBlocks(xml, "item");
}

function allBlocks(xml: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "g");
  for (;;) {
    const m = re.exec(xml);
    if (!m) break;
    out.push(m[1] ?? "");
  }
  return out;
}

/** Uruguay's daily search trends, straight from Google's RSS. */
export async function fetchGoogleTrends(): Promise<RawTrend[]> {
  const xml = await getText("https://trends.google.com/trending/rss?geo=UY");
  return items(xml)
    .map(block => {
      const titles = allTags(block, "ht:news_item_title");
      const sources = allTags(block, "ht:news_item_source");
      const urls = allTags(block, "ht:news_item_url");
      return {
        term: tag(block, "title"),
        approxTraffic: tag(block, "ht:approx_traffic"),
        headlines: titles
          .map((title, i) => ({ title, source: sources[i] ?? "", url: urls[i] ?? "" }))
          .filter(h => h.title && h.url),
      };
    })
    .filter(t => t.term);
}

/**
 * Uruguayan economy headlines.
 *
 * Two queries rather than one: the bare "economía" feed skews institutional, and the second query
 * is what surfaces the pocket-level stories. Duplicates are dropped by URL.
 */
export async function fetchEconomyNews(): Promise<RawNews[]> {
  const queries = ["uruguay economia", "uruguay precios OR salarios OR impuestos OR dolar"];
  const seen = new Set<string>();
  const out: RawNews[] = [];

  for (const q of queries) {
    const url =
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent(`${q} when:7d`) +
      "&hl=es-419&gl=UY&ceid=UY:es-419";
    const xml = await getText(url);
    for (const block of items(xml)) {
      const title = tag(block, "title");
      const link = tag(block, "link");
      if (!title || !link || seen.has(link)) continue;
      seen.add(link);
      out.push({
        title,
        source: tag(block, "source") || "Google News",
        url: link,
        publishedAt: tag(block, "pubDate"),
      });
    }
  }
  return out;
}

/** The Uruguayan subs worth reading for money talk, most active first. */
export const TREND_SUBS: readonly string[] = Object.freeze([
  "uruguay",
  "AskUruguayan",
  "monte_video",
  "Burises",
  "CharruaDevs",
]);

/**
 * Hot threads across the Uruguayan subs.
 *
 * One sub failing must not take the rest down — a private or renamed sub answers 403 and would
 * otherwise abort the whole run (r/Montevideo does exactly that, silently; see TREND_SUBS).
 */
export async function fetchRedditHot(limit = 25): Promise<RedditPostRaw[]> {
  const out: RedditPostRaw[] = [];
  for (const sub of TREND_SUBS) {
    try {
      const posts = await fetchListing(sub, "hot", { limit });
      for (const p of posts) out.push({ ...p, sub: p.sub || sub });
    } catch (err) {
      console.warn(`[trends] r/${sub} failed: ${(err as Error).message}`);
    }
  }
  return out;
}
