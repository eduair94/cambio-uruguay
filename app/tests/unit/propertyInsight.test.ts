import { describe, expect, it } from 'vitest'
import {
  buildPropertyInsight,
  propertyInsightVerdict,
  type PropertyInsightInput,
  type PropertyInsightListing,
} from '../../utils/propertyInsight'
import { propertySaleLivingArea, propertySalePricePerM2 } from '../../utils/propertySalePricePerM2'

let serial = 0
function home(overrides: Partial<PropertyInsightListing> = {}): PropertyInsightListing {
  serial += 1
  const price = overrides.price ?? 30_000
  return {
    key: `k${serial}`,
    path: `/alquileres/k${serial}`,
    title: `Apartamento ${serial}`,
    image: null,
    propertyType: 'apartamento',
    bedrooms: 2,
    bathrooms: 1,
    area: 60,
    price,
    shown: { amount: price, currency: 'UYU' },
    pricePerM2: price / 60,
    neighborhood: 'Pocitos',
    distanceKm: 0.5,
    ...overrides,
  }
}

const near = (prices: number[], overrides: Partial<PropertyInsightListing> = {}) =>
  prices.map(price => home({ price, pricePerM2: price / 60, ...overrides }))

function input(overrides: Partial<PropertyInsightInput> = {}): PropertyInsightInput {
  return {
    subject: home({ price: 30_000, pricePerM2: 500 }),
    peers: near([26_000, 28_000, 29_000, 31_000, 32_000, 33_000, 34_000, 36_000]),
    located: true,
    unit: 'UYU',
    ...overrides,
  }
}

describe('propertyInsightVerdict', () => {
  it('maps the gap to five bands', () => {
    expect(propertyInsightVerdict(-0.2)).toBe('muy-bajo')
    expect(propertyInsightVerdict(-0.08)).toBe('bajo')
    expect(propertyInsightVerdict(0.02)).toBe('justo')
    expect(propertyInsightVerdict(0.12)).toBe('alto')
    expect(propertyInsightVerdict(0.4)).toBe('muy-alto')
  })
})

describe('buildPropertyInsight — scope', () => {
  it('uses the smallest radius that gathers eight similar homes', () => {
    const insight = buildPropertyInsight(input())
    expect(insight.scope).toEqual({ kind: 'radius', radiusKm: 1 })
    expect(insight.comparables).toBe(8)
  })

  it('widens the radius when the nearest ring is thin', () => {
    const peers = [
      ...near([28_000, 29_000, 31_000], { distanceKm: 0.6 }),
      ...near([27_000, 30_500, 32_000, 33_000, 35_000], { distanceKm: 2.6 }),
    ]
    const insight = buildPropertyInsight(input({ peers }))
    expect(insight.scope).toEqual({ kind: 'radius', radiusKm: 3 })
    expect(insight.comparables).toBe(8)
  })

  it('falls back to the neighbourhood, without distances, when the advert has no own point', () => {
    const peers = [
      ...near([28_000, 29_000, 31_000, 32_000, 33_000], { distanceKm: null }),
      ...near([10_000, 11_000], { distanceKm: null, neighborhood: 'Malvín' }),
    ]
    const insight = buildPropertyInsight(input({ peers, located: false }))
    expect(insight.scope).toEqual({ kind: 'neighborhood', neighborhood: 'Pocitos' })
    expect(insight.comparables).toBe(5)
    expect(insight.picks.map(item => item.kind)).not.toContain('closest-similar')
  })

  it('never counts homes without a usable distance when the advert is located', () => {
    const peers = near([28_000, 29_000, 31_000, 32_000, 33_000, 34_000], { distanceKm: null })
    const insight = buildPropertyInsight(input({ peers }))
    expect(insight.comparables).toBe(0)
    expect(insight.position).toBeNull()
  })
})

describe('buildPropertyInsight — position and per m²', () => {
  it('places the price among the similar homes nearby', () => {
    const position = buildPropertyInsight(input()).position!
    expect(position.n).toBe(8)
    expect(position.median).toBe(31_500)
    expect(position.cheaperShare).toBeCloseTo(3 / 8)
    expect(position.verdict).toBe('justo')
  })

  it('gives no verdict below five comparables and ignores other types and itself', () => {
    const subject = home({ price: 30_000 })
    const peers = [
      subject,
      ...near([28_000, 29_000, 31_000, 32_000]),
      ...near([5_000, 6_000], { propertyType: 'casa' }),
    ]
    expect(buildPropertyInsight(input({ subject, peers })).position).toBeNull()
  })

  it('compares the price per m² against similar sizes only when it is credible', () => {
    const peers = [
      ...near([26_000, 28_000, 29_000, 31_000, 32_000, 33_000]),
      home({ price: 20_000, pricePerM2: null, bedrooms: 2 }),
    ]
    const insight = buildPropertyInsight(input({ peers }))
    expect(insight.perM2?.n).toBe(6)
    expect(insight.perM2?.subject).toBe(500)
    const blind = buildPropertyInsight(
      input({ subject: home({ price: 30_000, pricePerM2: null }) })
    )
    expect(blind.perM2).toBeNull()
    expect(blind.subjectPerM2).toBeNull()
  })
})

describe('buildPropertyInsight — picks', () => {
  it('offers the cheapest similar, the cheapest per m², a bigger one and one more bedroom', () => {
    const cheapest = home({ price: 24_000, pricePerM2: 400, distanceKm: 0.8 })
    const bigger = home({ price: 31_000, area: 90, pricePerM2: 344, bedrooms: 2 })
    const roomier = home({ price: 30_500, bedrooms: 3, area: 70, pricePerM2: 436 })
    const insight = buildPropertyInsight(
      input({ peers: [...input().peers, cheapest, bigger, roomier] })
    )
    const byKind = Object.fromEntries(insight.picks.map(item => [item.kind, item.listing.key]))
    expect(byKind['cheapest-similar']).toBe(cheapest.key)
    expect(byKind['cheapest-per-m2']).toBe(bigger.key)
    expect(byKind['more-bedrooms-same-money']).toBe(roomier.key)
    expect(new Set(Object.values(byKind)).size).toBe(insight.picks.length)
  })

  it('never offers something pricier than 105 % as "for the same money"', () => {
    const expensive = home({ price: 40_000, bedrooms: 4, area: 150, pricePerM2: 266 })
    const insight = buildPropertyInsight(input({ peers: [...input().peers, expensive] }))
    const kinds = insight.picks.filter(item => item.listing.key === expensive.key).map(i => i.kind)
    expect(kinds).not.toContain('bigger-same-money')
    expect(kinds).not.toContain('more-bedrooms-same-money')
  })

  it('finds the closest similar home within ±20 % of the price', () => {
    const closest = home({ price: 33_000, distanceKm: 0.05 })
    const cheapButFar = home({ price: 20_000, distanceKm: 0.04 })
    const insight = buildPropertyInsight(input({ peers: [...input().peers, closest, cheapButFar] }))
    expect(insight.picks.find(item => item.kind === 'closest-similar')?.listing.key).toBe(
      closest.key
    )
  })
})

describe('sale price per m²', () => {
  it('uses the built area, never the land', () => {
    expect(propertySaleLivingArea({ built: 90, total: 120, land: 600, reported: null })).toBe(90)
    expect(
      propertySaleLivingArea({ built: null, total: null, land: 600, reported: null })
    ).toBeNull()
    expect(propertySaleLivingArea({ built: null, total: null, land: null, reported: 70 })).toBe(70)
  })

  it('refuses impossible sizes and prices', () => {
    const base = { propertyType: 'apartamento', bedrooms: 2, area: 70, priceUsd: 140_000 }
    expect(propertySalePricePerM2(base)).toBe(2_000)
    expect(propertySalePricePerM2({ ...base, area: 600 })).toBeNull()
    expect(propertySalePricePerM2({ ...base, priceUsd: 7_000 })).toBeNull()
    expect(propertySalePricePerM2({ ...base, priceUsd: 2_000_000 })).toBeNull()
    expect(propertySalePricePerM2({ ...base, propertyType: 'terreno' })).toBeNull()
  })
})
