import { describe, expect, it } from 'vitest'
import { BANKS_NEWS_FALLBACK } from '../../server/utils/banksNewsFallback'

// Unlike aduana's fallback (a faithful copy of a real baseline), banks news has no offline
// substitute worth fabricating — "what happened to Itaú this month" cannot be guessed. The
// contract is deliberately empty: the page's `v-if="newsItems.length"` already renders the tier
// list with no news cards when this is what /api/banks-news returns, so this test just pins the
// shape that makes that degrade gracefully rather than throw.
describe('banks news fallback', () => {
  it('is unavailable, with no items and no analysis', () => {
    expect(BANKS_NEWS_FALLBACK.unavailable).toBe(true)
    expect(BANKS_NEWS_FALLBACK.items).toEqual([])
    expect(BANKS_NEWS_FALLBACK.analysis).toBeNull()
  })
})
