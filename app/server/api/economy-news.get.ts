// Broad Uruguay economy headlines (inflation, jobs, companies, BCU, trade,
// fiscal) grouped by topic on the client. Cached server-side; the TTL is the
// refresh "cron". Sibling of `/api/news` (which is dollar-only).
import { fetchEconomyNews } from '../utils/economyNews'

export default defineCachedEventHandler(async () => fetchEconomyNews(6), {
  maxAge: 60 * 30, // refresh every 30 min
  staleMaxAge: 60 * 60 * 6, // serve stale up to 6h if upstream fails
  name: 'economy-news-uy',
  getKey: () => 'economia-uruguay',
})
