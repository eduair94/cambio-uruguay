// Dollar / economy news for Uruguay, aggregated from Google News RSS
// (covers El País, El Observador, Infobae, Ámbito, etc. with attribution + link).
// Cached server-side so it refreshes periodically without hammering the source —
// the cache TTL is the "cron". (A pm2 cron is unnecessary with this approach.)

interface NewsItem {
  title: string
  link: string
  source: string
  pubDate: string
  snippet: string
}

const FEEDS = [
  'https://news.google.com/rss/search?q=cotizaci%C3%B3n+d%C3%B3lar+Uruguay&hl=es-419&gl=UY&ceid=UY:es',
  'https://news.google.com/rss/search?q=econom%C3%ADa+Uruguay+d%C3%B3lar&hl=es-419&gl=UY&ceid=UY:es',
]

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    // Decode entities FIRST so any entity-encoded markup (e.g. &lt;a&gt;) becomes
    // real tags, THEN strip all tags. Order matters — otherwise escaped HTML leaks
    // through as literal text.
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return m ? decode(m[1]) : ''
}

function parseFeed(xml: string): NewsItem[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  return items.map(m => {
    const block = m[1]
    const rawTitle = tag(block, 'title')
    const source = tag(block, 'source')
    // Google News titles end with " - Source"; strip it for a clean headline.
    const title =
      source && rawTitle.endsWith(` - ${source}`)
        ? rawTitle.slice(0, -(source.length + 3)).trim()
        : rawTitle
    const snippet = tag(block, 'description').slice(0, 180)
    return {
      title,
      link: tag(block, 'link'),
      source: source || 'Google News',
      pubDate: tag(block, 'pubDate'),
      snippet,
    }
  })
}

export default defineCachedEventHandler(
  async (): Promise<NewsItem[]> => {
    const results = await Promise.allSettled(
      FEEDS.map(url =>
        $fetch<string>(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
          },
          responseType: 'text',
        })
      )
    )

    const all: NewsItem[] = []
    for (const r of results) {
      if (r.status === 'fulfilled' && typeof r.value === 'string') {
        all.push(...parseFeed(r.value))
      }
    }

    // Dedupe by normalized title, keep the most recent, drop empties
    const seen = new Set<string>()
    const deduped = all
      .filter(n => n.title && n.link)
      .filter(n => {
        const key = n.title
          .toLowerCase()
          .replace(/[^a-z0-9áéíóúñ]/g, '')
          .slice(0, 60)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 12)

    return deduped
  },
  {
    maxAge: 60 * 30, // refresh every 30 min
    staleMaxAge: 60 * 60 * 6, // serve stale up to 6h if upstream fails
    name: 'news-uy',
    getKey: () => 'dolar-uruguay',
  }
)
