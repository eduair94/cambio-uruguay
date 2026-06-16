// Shared news fetching: Google News RSS for Uruguay dollar/economy headlines.
// Used by /api/news (display) and /api/news-ai (AI summary + trend).

export interface NewsItem {
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
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tag = (block: string, name: string): string => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return decode(m?.[1] ?? '')
}

function parseFeed(xml: string): NewsItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const block = m[1] ?? ''
    const rawTitle = tag(block, 'title')
    const source = tag(block, 'source')
    const title =
      source && rawTitle.endsWith(` - ${source}`)
        ? rawTitle.slice(0, -(source.length + 3)).trim()
        : rawTitle
    return {
      title,
      link: tag(block, 'link'),
      source: source || 'Google News',
      pubDate: tag(block, 'pubDate'),
      snippet: tag(block, 'description').slice(0, 180),
    }
  })
}

export async function fetchNews(limit = 12): Promise<NewsItem[]> {
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
    if (r.status === 'fulfilled' && typeof r.value === 'string') all.push(...parseFeed(r.value))
  }

  const seen = new Set<string>()
  return all
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
    .slice(0, limit)
}
