// Passthrough for `GET /regional/history` on the public API.
//
// Adds nothing but the same-origin: the pages draw a series server-side and a
// crawler gets the numbers in the HTML. Integrators should call the public
// endpoint directly — it takes the same parameters and answers the same shape.
import type { RegionalHistoryPoint } from '../../utils/regional'

interface HistoryResponse {
  count: number
  from: string | null
  to: string | null
  points: RegionalHistoryPoint[]
}

export default defineCachedEventHandler(
  async event => {
    const base = useRuntimeConfig().apiBaseServer
    const query = getQuery(event)

    return $fetch<HistoryResponse>(`${base}/regional/history`, {
      query: {
        country: query.country,
        market: query.market,
        base: query.base,
        quote: query.quote,
        from: query.from,
        to: query.to,
        limit: query.limit,
      },
      timeout: 12000,
    }).catch(() => ({ count: 0, from: null, to: null, points: [] as RegionalHistoryPoint[] }))
  },
  {
    // A closed day never changes, and today's point only moves every 20 minutes.
    maxAge: 60 * 30,
    staleMaxAge: 60 * 60 * 12,
    name: 'regional-history',
    getKey: event => {
      const q = getQuery(event)
      return [q.country, q.market, q.base, q.quote, q.from, q.to, q.limit]
        .map(value => (value === undefined || value === null ? '' : String(value)))
        .join('|')
    },
  }
)
