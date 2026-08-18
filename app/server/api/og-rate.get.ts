// Current best USD market pair for the OG image and the embeddable widget
// (cached 10 min so it never adds real cost to page SSR). Selection rules —
// including the off-market filter that stops one stale board from producing an
// impossible pair — live in the pure helper so they can be unit-tested.
import type { ExchangeRate } from '../../types/api'
import { bestUsdPair, type OgRatePair } from '../../utils/ogRate'

export default defineCachedEventHandler(
  async (): Promise<OgRatePair> => {
    const apiBase = useRuntimeConfig().public.apiBase as string
    const rates = await $fetch<ExchangeRate[]>('/', { baseURL: apiBase }).catch(
      () => [] as ExchangeRate[]
    )
    return bestUsdPair(rates)
  },
  { maxAge: 60 * 10, staleMaxAge: 60 * 60, name: 'og-rate', getKey: () => 'usd' }
)
