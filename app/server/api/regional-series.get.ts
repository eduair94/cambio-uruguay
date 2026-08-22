// Passthrough for `GET /regional/series`: which daily series exist and since when.
//
// The API-documentation page prints this inventory rather than a hand-written
// list, because a hand-written list of "we have data since 2011" is wrong the
// first time a publisher extends or truncates its own history.
import type { RegionalCountry } from '../../utils/regional'

export interface RegionalSeriesRow {
  key: string
  country: RegionalCountry
  market: string
  base: string
  quote: string
  days: number
  from: string
  to: string
}

export default defineCachedEventHandler(
  async () => {
    const base = useRuntimeConfig().apiBaseServer
    return $fetch<{ series: RegionalSeriesRow[] }>(`${base}/regional/series`, {
      timeout: 9000,
    }).catch(() => ({ series: [] as RegionalSeriesRow[] }))
  },
  {
    maxAge: 60 * 60,
    staleMaxAge: 60 * 60 * 12,
    name: 'regional-series',
    getKey: () => 'all',
  }
)
