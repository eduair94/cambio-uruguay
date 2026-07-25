import { describe, expect, it } from 'vitest'
import {
  bestChairOffer,
  emptyChairFilters,
  filterChairProducts,
  formatChairPrice,
  offersByPlatform,
  priceTrend,
  starIcons,
  type ChairCatalogOffer,
  type ChairCatalogProduct,
} from '../../utils/chairCatalog'

const offer = (overrides: Partial<ChairCatalogOffer>): ChairCatalogOffer => ({
  id: 'a',
  source: 'mercadolibre',
  sellerKey: 'ml:1',
  seller: 'Vendedor',
  channel: 'marketplace',
  title: 'Silla',
  url: 'https://example.com',
  price: 1000,
  currency: 'UYU',
  priceUyu: 1000,
  condition: 'new',
  available: true,
  freeShipping: null,
  location: null,
  image: null,
  observedAt: '2026-07-25T00:00:00.000Z',
  ...overrides,
})

const product = (overrides: Partial<ChairCatalogProduct>): ChairCatalogProduct => ({
  slug: 'chair',
  key: 'brand|model',
  name: 'Marca Modelo',
  brand: 'Marca',
  model: 'Modelo',
  category: 'ergonomic',
  stars: 4,
  ratingCount: 100,
  ratingSignals: [],
  confidence: 'medium',
  redditSlug: null,
  tier: null,
  price: {
    min: 1000,
    max: 2000,
    median: 1500,
    currency: 'UYU',
    samples: 2,
    bestNew: 1000,
    bestUsed: null,
  },
  offers: [offer({})],
  sellers: 1,
  specs: [],
  verdict: '',
  pros: [],
  cons: [],
  evidence: [],
  reviews: [],
  images: [],
  history: [],
  firstSeen: '2026-07-01',
  lastSeen: '2026-07-25',
  ...overrides,
})

describe('formatChairPrice', () => {
  it('marks the currency it is showing', () => {
    expect(formatChairPrice(4500)).toContain('4.500')
    expect(formatChairPrice(120, 'USD')).toBe('US$ 120')
  })
})

describe('starIcons', () => {
  it('renders half stars and an empty row when there is no rating', () => {
    expect(starIcons(4.5)).toEqual([
      'mdi-star',
      'mdi-star',
      'mdi-star',
      'mdi-star',
      'mdi-star-half-full',
    ])
    expect(starIcons(null).every(icon => icon === 'mdi-star-outline')).toBe(true)
  })
})

describe('bestChairOffer', () => {
  it('prefers an available offer over a cheaper sold-out one', () => {
    const chair = product({
      offers: [
        offer({ id: 'gone', priceUyu: 500, available: false }),
        offer({ id: 'live', priceUyu: 900 }),
      ],
    })
    expect(bestChairOffer(chair)?.id).toBe('live')
  })
})

describe('offersByPlatform', () => {
  it('groups the same chair by platform, stores first, cheapest first inside each', () => {
    const chair = product({
      offers: [
        offer({ id: 'ml-b', source: 'mercadolibre', priceUyu: 3000 }),
        offer({ id: 'ml-a', source: 'mercadolibre', sellerKey: 'ml:2', priceUyu: 2000 }),
        offer({ id: 'store', source: 'store', sellerKey: 'bertoni', priceUyu: 4000 }),
        offer({ id: 'fb', source: 'facebook', sellerKey: 'facebook', priceUyu: 1000 }),
      ],
    })
    const groups = offersByPlatform(chair)
    expect(groups.map(group => group.source)).toEqual(['store', 'mercadolibre', 'facebook'])
    expect(groups[1]!.offers.map(entry => entry.id)).toEqual(['ml-a', 'ml-b'])
  })
})

describe('filterChairProducts', () => {
  const catalog = [
    product({
      slug: 'ergo',
      name: 'Marca Ergo',
      category: 'ergonomic',
      stars: 4.5,
      offers: [offer({ priceUyu: 9000 })],
    }),
    product({
      slug: 'gamer',
      name: 'Otra Gamer',
      brand: 'Otra',
      category: 'gaming',
      stars: 3.2,
      offers: [offer({ priceUyu: 4000 })],
    }),
    product({
      slug: 'usada',
      name: 'Marca Usada',
      category: 'ergonomic',
      stars: null,
      ratingCount: 0,
      offers: [offer({ priceUyu: 2000, condition: 'used' })],
    }),
  ]

  it('filters on the cheapest offer, not the median', () => {
    const result = filterChairProducts(catalog, { ...emptyChairFilters(), maxPrice: 4000 })
    expect(result.map(item => item.slug).sort()).toEqual(['gamer', 'usada'])
  })

  it('filters by category, condition and text', () => {
    expect(
      filterChairProducts(catalog, { ...emptyChairFilters(), category: 'gaming' }).map(
        item => item.slug
      )
    ).toEqual(['gamer'])
    expect(
      filterChairProducts(catalog, { ...emptyChairFilters(), condition: 'used' }).map(
        item => item.slug
      )
    ).toEqual(['usada'])
    expect(
      filterChairProducts(catalog, { ...emptyChairFilters(), query: 'marca ergo' }).map(
        item => item.slug
      )
    ).toEqual(['ergo'])
  })

  it('sorts by price and by rating', () => {
    expect(
      filterChairProducts(catalog, { ...emptyChairFilters(), sort: 'price-asc' }).map(
        item => item.slug
      )
    ).toEqual(['usada', 'gamer', 'ergo'])
    expect(filterChairProducts(catalog, { ...emptyChairFilters(), sort: 'rating' })[0]!.slug).toBe(
      'ergo'
    )
  })

  it('never drops a chair that satisfies every filter', () => {
    expect(filterChairProducts(catalog, emptyChairFilters())).toHaveLength(catalog.length)
  })
})

describe('priceTrend', () => {
  it('reports the move between the first and last observation', () => {
    const chair = product({
      history: [
        { date: '2026-07-01', median: 1000, min: 900, offers: 2 },
        { date: '2026-07-25', median: 1200, min: 1100, offers: 2 },
      ],
    })
    expect(priceTrend(chair)).toBe(20)
    expect(priceTrend(product({ history: [] }))).toBeNull()
  })
})
