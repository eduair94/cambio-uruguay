import { describe, expect, it } from 'vitest'
import {
  equiparCategoryProjection,
  type EquiparHistoryPoint,
  type EquiparItemDoc,
  type EquiparOffer,
  type EquiparProduct,
} from '../../utils/equipar'

const offer = (priceUyu: number): EquiparOffer => ({
  seller: 'Tienda',
  title: 'Producto',
  url: 'https://example.com/producto',
  price: priceUyu,
  currency: 'UYU',
  priceUyu,
  condition: 'new',
  source: 'store',
  observedAt: '2026-09-10T00:00:00.000Z',
})

const product = (offersCount: number): EquiparProduct => ({
  slug: 'producto',
  name: 'Producto',
  brand: 'Marca',
  model: 'Modelo',
  image: null,
  offers: Array.from({ length: offersCount }, (_, i) => offer(1000 + i)),
  bestPriceUyu: 1000,
  sellers: offersCount,
})

const historyPoints = (count: number): EquiparHistoryPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
    newMedian: 1000 + i,
    usedMedian: null,
  }))

function item(overrides: Partial<EquiparItemDoc> = {}): EquiparItemDoc {
  return {
    key: 'heladera:media',
    category: 'heladera',
    categoryLabel: 'Heladera',
    variant: 'media',
    variantLabel: 'Media',
    room: 'cocina',
    tier: 'S',
    rank: 0,
    variantRank: 1,
    image: null,
    regime: 'commodity',
    reason: 'porque sí',
    usedOk: true,
    quantity: 1,
    newBand: null,
    usedBand: null,
    usedSavingPct: null,
    products: [],
    offers: [],
    suspectDropped: 0,
    observedAt: null,
    firstSeen: '2026-01-01',
    lastSeen: '2026-01-01',
    ...overrides,
  }
}

describe('equiparCategoryProjection', () => {
  it('trims products to 12, each with at most 6 offers', () => {
    const products = Array.from({ length: 20 }, () => product(10))
    const [result] = equiparCategoryProjection([item({ products })])
    expect(result.products).toHaveLength(12)
    for (const p of result.products) {
      expect(p.offers).toHaveLength(6)
    }
  })

  it('trims item-level offers to 14', () => {
    const offers = Array.from({ length: 20 }, (_, i) => offer(1000 + i))
    const [result] = equiparCategoryProjection([item({ offers })])
    expect(result.offers).toHaveLength(14)
  })

  // The backend stores up to 8 new offers and then up to 6 used ones. A cap of 8 cut every used
  // offer off any variant priced new, and the page's "Usados" list was always empty.
  it('keeps the used offers that follow eight new ones', () => {
    const newOffers = Array.from({ length: 8 }, (_, i) => offer(20_000 + i))
    const usedOffers = Array.from({ length: 6 }, (_, i) => ({
      ...offer(5_000 + i),
      condition: 'used' as const,
      source: 'facebook' as const,
    }))
    const [result] = equiparCategoryProjection([item({ offers: [...newOffers, ...usedOffers] })])
    expect(result.offers.filter(o => o.condition === 'new')).toHaveLength(8)
    expect(result.offers.filter(o => o.condition === 'used')).toHaveLength(6)
  })

  it('keeps the most recent 180 history points (the tail), not the oldest', () => {
    const history = historyPoints(400)
    const [result] = equiparCategoryProjection([item({ history })])
    expect(result.history).toHaveLength(180)
    expect(result.history?.[0]).toEqual(history[400 - 180])
    expect(result.history?.[179]).toEqual(history[399])
  })

  it('leaves arrays under the caps untouched', () => {
    const products = [product(2)]
    const offers = [offer(500)]
    const history = historyPoints(5)
    const [result] = equiparCategoryProjection([item({ products, offers, history })])
    expect(result.products).toHaveLength(1)
    expect(result.products[0].offers).toHaveLength(2)
    expect(result.offers).toHaveLength(1)
    expect(result.history).toHaveLength(5)
  })

  it('defaults history to an empty array when the row has none', () => {
    const [result] = equiparCategoryProjection([item()])
    expect(result.history).toEqual([])
  })

  it('does not mutate the input items', () => {
    const products = Array.from({ length: 20 }, () => product(10))
    const offers = Array.from({ length: 15 }, (_, i) => offer(1000 + i))
    const history = historyPoints(400)
    const original = item({ products, offers, history })
    equiparCategoryProjection([original])
    expect(original.products).toHaveLength(20)
    expect(original.offers).toHaveLength(15)
    expect(original.history).toHaveLength(400)
  })
})
