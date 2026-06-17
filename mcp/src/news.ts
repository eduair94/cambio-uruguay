// Google News RSS parsing for Uruguay dollar/economy headlines.
// Pure parsing (parseFeed, mergeNews) is unit-tested; the network fetch lives
// in the API client. Mirrors app/server/utils/news.ts so the bot, the site, and
// this MCP server report the same headlines.

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
}

export const NEWS_FEEDS = [
  "https://news.google.com/rss/search?q=cotizaci%C3%B3n+d%C3%B3lar+Uruguay&hl=es-419&gl=UY&ceid=UY:es",
  "https://news.google.com/rss/search?q=econom%C3%ADa+Uruguay+d%C3%B3lar&hl=es-419&gl=UY&ceid=UY:es",
] as const;

const decode = (s: string): string =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tag = (block: string, name: string): string => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return decode(m?.[1] ?? "");
};

/** Parse a Google News RSS document into news items. */
export function parseFeed(xml: string): NewsItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const block = m[1] ?? "";
    const rawTitle = tag(block, "title");
    const source = tag(block, "source");
    const title = source && rawTitle.endsWith(` - ${source}`) ? rawTitle.slice(0, -(source.length + 3)).trim() : rawTitle;
    return {
      title,
      link: tag(block, "link"),
      source: source || "Google News",
      pubDate: tag(block, "pubDate"),
      snippet: tag(block, "description").slice(0, 180),
    };
  });
}

/** Merge feeds: drop blanks, de-duplicate by title, sort newest first, cap to limit. */
export function mergeNews(items: NewsItem[], limit = 12): NewsItem[] {
  const seen = new Set<string>();
  return items
    .filter((n) => n.title && n.link)
    .filter((n) => {
      const key = n.title
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúñ]/g, "")
        .slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, limit);
}
