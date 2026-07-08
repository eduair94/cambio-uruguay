import { describe, it, expect } from 'vitest'
import { rankNearbyCasas } from '../../utils/nearbyCasas'
import { buildRatesByOrigin } from '../../utils/nearbyRates'
import type { CasaReputation } from '../../utils/casasDirectory'

const user = { lat: -34.9011, lng: -56.1645 } // central Montevideo

function makeCasa(overrides: Partial<CasaReputation> & { code: string }): CasaReputation {
  return {
    name: overrides.code,
    category: 'casa',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote: null,
    founded: null,
    services: [],
    strengths: [],
    weaknesses: [],
    press: [],
    sources: [],
    ...overrides,
  }
}

describe('rankNearbyCasas', () => {
  it('excludes bancos and fintechs even when closest and best-rated', () => {
    const branches = [
      { origin: 'casaA', lat: -34.9055, lng: -56.1922, id: 'a' }, // ~1.7 km
      { origin: 'brou', lat: -34.9012, lng: -56.1646, id: 'bank' }, // ~0 km
      { origin: 'prex', lat: -34.9013, lng: -56.1647, id: 'fin' }, // ~0 km
    ]
    const reputations = [
      makeCasa({ code: 'casaA' }),
      makeCasa({ code: 'brou', category: 'banco', googleRating: 4.8 }),
      makeCasa({ code: 'prex', category: 'fintech', googleRating: 4.9 }),
    ]
    const rates = buildRatesByOrigin([
      { origin: 'casaA', code: 'USD', buy: 40.0, sell: 41.0 },
      { origin: 'brou', code: 'USD', buy: 45.0, sell: 45.5 },
      { origin: 'prex', code: 'USD', buy: 46.0, sell: 46.5 },
    ])
    const out = rankNearbyCasas(branches, reputations, rates, user, 10, 'USD', 'buy')
    expect(out.map(o => o.branch.origin)).toEqual(['casaA'])
  })

  it('excludes an origin with no reputation entry at all (fail closed)', () => {
    const branches = [{ origin: 'unknownOrigin', lat: -34.9012, lng: -56.1646, id: 'u' }]
    const rates = buildRatesByOrigin([{ origin: 'unknownOrigin', code: 'USD', buy: 50, sell: 51 }])
    const out = rankNearbyCasas(branches, [], rates, user, 10, 'USD', 'buy')
    expect(out).toEqual([])
  })

  it('dedupes multiple branches of the same casa, keeping the nearest', () => {
    const branches = [
      { origin: 'casaA', lat: -34.9080, lng: -56.2100, id: 'far' }, // ~4.2 km
      { origin: 'casaA', lat: -34.9055, lng: -56.1922, id: 'near' }, // ~1.7 km
    ]
    const reputations = [makeCasa({ code: 'casaA' })]
    const rates = buildRatesByOrigin([{ origin: 'casaA', code: 'USD', buy: 40, sell: 41 }])
    const out = rankNearbyCasas(branches, reputations, rates, user, 10, 'USD', 'buy')
    expect(out).toHaveLength(1)
    expect(out[0].branch.id).toBe('near')
  })

  it('weighs rate (45%) above distance (35%): best-rate-but-farther beats closer-but-worse-rate', () => {
    const branches = [
      { origin: 'closeButCheap', lat: -34.9055, lng: -56.1922, id: 'close' }, // ~1.7 km
      { origin: 'farButBest', lat: -34.9080, lng: -56.2100, id: 'far' }, // ~4.2 km
    ]
    const reputations = [makeCasa({ code: 'closeButCheap' }), makeCasa({ code: 'farButBest' })]
    const rates = buildRatesByOrigin([
      { origin: 'closeButCheap', code: 'USD', buy: 39.0, sell: 40.0 },
      { origin: 'farButBest', code: 'USD', buy: 41.0, sell: 42.0 },
    ])
    const out = rankNearbyCasas(branches, reputations, rates, user, 10, 'USD', 'buy')
    expect(out.map(o => o.branch.origin)).toEqual(['farButBest', 'closeButCheap'])
  })

  it('breaks a distance+rate tie using googleRating', () => {
    const branches = [
      { origin: 'rated', lat: -34.9055, lng: -56.1922, id: 'r' },
      { origin: 'unrated', lat: -34.9055, lng: -56.1922, id: 'u' },
    ]
    const reputations = [
      makeCasa({ code: 'rated', googleRating: 4.8, googleReviewCount: 100 }),
      makeCasa({ code: 'unrated', googleRating: null, googleReviewCount: null }),
    ]
    const rates = buildRatesByOrigin([
      { origin: 'rated', code: 'USD', buy: 40, sell: 41 },
      { origin: 'unrated', code: 'USD', buy: 40, sell: 41 },
    ])
    const out = rankNearbyCasas(branches, reputations, rates, user, 10, 'USD', 'buy')
    expect(out.map(o => o.branch.origin)).toEqual(['rated', 'unrated'])
  })

  it('excludes branches with no rate for the chosen currency', () => {
    const branches = [{ origin: 'casaA', lat: -34.9055, lng: -56.1922, id: 'a' }]
    const reputations = [makeCasa({ code: 'casaA' })]
    const out = rankNearbyCasas(branches, reputations, {}, user, 10, 'USD', 'buy')
    expect(out).toEqual([])
  })

  it('excludes branches outside the radius', () => {
    const branches = [{ origin: 'casaA', lat: -34.8350, lng: -55.9500, id: 'far' }] // ~21 km
    const reputations = [makeCasa({ code: 'casaA' })]
    const rates = buildRatesByOrigin([{ origin: 'casaA', code: 'USD', buy: 40, sell: 41 }])
    const out = rankNearbyCasas(branches, reputations, rates, user, 10, 'USD', 'buy')
    expect(out).toEqual([])
  })

  it('empty branches yields empty result', () => {
    expect(rankNearbyCasas([], [], {}, user, 10, 'USD', 'buy')).toEqual([])
  })
})
