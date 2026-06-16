// Dollar / economy news for Uruguay (Google News RSS — El País, El Observador,
// Infobae, Ámbito...). Cached server-side; the TTL is the refresh "cron".
import { fetchNews } from '../utils/news'

export default defineCachedEventHandler(async () => fetchNews(12), {
  maxAge: 60 * 30, // refresh every 30 min
  staleMaxAge: 60 * 60 * 6, // serve stale up to 6h if upstream fails
  name: 'news-uy',
  getKey: () => 'dolar-uruguay',
})
