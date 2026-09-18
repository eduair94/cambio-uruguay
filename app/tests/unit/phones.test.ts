import { describe, expect, it } from 'vitest'
import {
  phoneHubCards,
  phoneHubGroups,
  phoneIsStale,
  phoneModelProjection,
  phoneMoney,
  phonePublishable,
  phoneSellerLabel,
  phoneSiblings,
  phoneUsd,
  type PhoneBandDoc,
  type PhoneHistoryPointDoc,
  type PhoneModelDoc,
  type PhoneOfferDoc,
} from '../../utils/phones'

const TODAY = '2026-09-17'

const band = (overrides: Partial<PhoneBandDoc> = {}): PhoneBandDoc => ({
  min: 40_000,
  p25: 41_000,
  median: 42_000,
  p75: 43_000,
  n: 5,
  sellers: 3,
  ...overrides,
})

const offer = (priceUyu: number, overrides: Partial<PhoneOfferDoc> = {}): PhoneOfferDoc => ({
  seller: 'Tienda',
  sellerKey: 'tienda',
  source: 'store',
  officialStore: true,
  title: 'Producto',
  url: 'https://example.com/producto',
  price: priceUyu,
  currency: 'UYU',
  priceUyu,
  listPrice: null,
  condition: 'new',
  esimOnly: false,
  observedAt: '2026-09-17T00:00:00.000Z',
  ...overrides,
})

// `id` (not `key`) on purpose: the gitleaks generic-api-key rule flags a committed `key: "<literal
// with digits>"` line, and every model key here has digits (storage figures). Passing the value
// through a variable/parameter — never a quoted literal next to the word `key` — keeps this file
// clean, the same convention tests/phones/fixtures/titles.ts and tests/phones/store.test.ts already
// use.
function phoneDoc(id: string, overrides: Partial<PhoneModelDoc> = {}): PhoneModelDoc {
  return {
    key: id,
    slug: id,
    brand: 'apple',
    brandLabel: 'Apple',
    family: 'iphone-17',
    familyLabel: 'iPhone 17',
    storageGb: 256,
    name: 'Apple iPhone 17 256 GB',
    image: null,
    bands: {},
    offers: [],
    newSellers: 0,
    esimOnlySeen: false,
    suspectDropped: 0,
    ambiguousDropped: 0,
    ambiguousConditions: [],
    observedAt: '2026-09-17T00:00:00.000Z',
    history: [],
    firstSeen: '2026-08-01',
    lastSeen: TODAY,
    ...overrides,
  }
}

describe('phoneIsStale', () => {
  it('exactly on the cutoff day counts as fresh (>=, not >)', () => {
    expect(phoneIsStale('2026-09-13', TODAY)).toBe(false)
  })
  it('one day older than the cutoff is stale', () => {
    expect(phoneIsStale('2026-09-12', TODAY)).toBe(true)
  })
  it('today itself is always fresh', () => {
    expect(phoneIsStale(TODAY, TODAY)).toBe(false)
  })
  it('honors a custom staleDays', () => {
    expect(phoneIsStale('2026-09-16', TODAY, 1)).toBe(false)
    expect(phoneIsStale('2026-09-15', TODAY, 1)).toBe(true)
  })
})

describe('phonePublishable', () => {
  it('requires a NEW band', () => {
    expect(phonePublishable(phoneDoc('a', { bands: {} }), TODAY)).toBe(false)
    expect(phonePublishable(phoneDoc('a', { bands: { new: band() } }), TODAY)).toBe(true)
  })
  it('a NEW band that is ambiguous is not publishable, even though it exists', () => {
    const model = phoneDoc('a', { bands: { new: band() }, ambiguousConditions: ['new'] })
    expect(phonePublishable(model, TODAY)).toBe(false)
  })
  it('an ambiguous USED condition does not block a fine NEW one', () => {
    const model = phoneDoc('a', { bands: { new: band() }, ambiguousConditions: ['used'] })
    expect(phonePublishable(model, TODAY)).toBe(true)
  })
  it('a stale lastSeen is not publishable even with a good band', () => {
    const model = phoneDoc('a', { bands: { new: band() }, lastSeen: '2026-09-01' })
    expect(phonePublishable(model, TODAY)).toBe(false)
  })
})

describe('phoneSellerLabel', () => {
  it('labels the shared ml:unknown bucket', () => {
    expect(phoneSellerLabel({ sellerKey: 'ml:unknown', seller: 'Juan Perez' })).toBe(
      'Vendedor sin identificar (Mercado Libre)'
    )
  })
  it('labels the bare "Mercado Libre" fallback name even if sellerKey looks real', () => {
    expect(phoneSellerLabel({ sellerKey: 'ml:n:some-store', seller: 'Mercado Libre' })).toBe(
      'Vendedor sin identificar (Mercado Libre)'
    )
  })
  it('keeps a real seller name untouched', () => {
    expect(phoneSellerLabel({ sellerKey: 'zonatecno', seller: 'Zonatecno' })).toBe('Zonatecno')
    expect(phoneSellerLabel({ sellerKey: 'ml:n:tienda-oficial', seller: 'Tienda Oficial' })).toBe(
      'Tienda Oficial'
    )
  })
})

describe('phoneHubCards', () => {
  it('reads the best-new price from the band and its currency from the cheapest new offer', () => {
    const model = phoneDoc('a', {
      bands: { new: band({ min: 39_500 }) },
      offers: [
        offer(41_000, { currency: 'USD', price: 999 }),
        offer(39_500, { currency: 'USD', price: 950 }),
      ],
      newSellers: 2,
    })
    const [card] = phoneHubCards([model])
    expect(card).toMatchObject({
      slug: 'a',
      name: model.name,
      brandLabel: 'Apple',
      familyLabel: 'iPhone 17',
      storageGb: 256,
      bestNewUyu: 39_500,
      bestNewOriginal: { price: 950, currency: 'USD' },
      newSellers: 2,
      lastSeen: TODAY,
    })
  })
  it('ignores non-new offers when picking the original-currency price', () => {
    const model = phoneDoc('a', {
      bands: { new: band({ min: 39_500 }) },
      offers: [offer(1_000, { condition: 'used', currency: 'USD', price: 20 }), offer(39_500)],
    })
    const [card] = phoneHubCards([model])
    expect(card!.bestNewOriginal).toEqual({ price: 39_500, currency: 'UYU' })
  })
  it('falls back to deriving the price from offers when there is no band', () => {
    const model = phoneDoc('a', { bands: {}, offers: [offer(12_000)] })
    const [card] = phoneHubCards([model])
    expect(card!.bestNewUyu).toBe(12_000)
    expect(card!.bestNewOriginal).toEqual({ price: 12_000, currency: 'UYU' })
  })
  it('a model with no new offer at all gets a zeroed placeholder, not a crash', () => {
    const model = phoneDoc('a', { bands: {}, offers: [] })
    const [card] = phoneHubCards([model])
    expect(card!.bestNewUyu).toBe(0)
  })
  it('preserves the order it is given (a pure mapper, not a sorter)', () => {
    const cards = phoneHubCards([phoneDoc('b'), phoneDoc('a')])
    expect(cards.map(c => c.slug)).toEqual(['b', 'a'])
  })
})

describe('phoneHubGroups', () => {
  const publishable = (id: string, overrides: Partial<PhoneModelDoc> = {}) =>
    phoneDoc(id, { bands: { new: band() }, ...overrides })

  it('orders brands Apple, Samsung, Motorola, Xiaomi, Honor, then everything else alphabetically', () => {
    const models = [
      publishable('honor-x', { brand: 'honor', brandLabel: 'Honor' }),
      publishable('tecno-x', { brand: 'tecno', brandLabel: 'Tecno' }),
      publishable('apple-x', { brand: 'apple', brandLabel: 'Apple' }),
      publishable('infinix-x', { brand: 'infinix', brandLabel: 'Infinix' }),
      publishable('xiaomi-x', { brand: 'xiaomi', brandLabel: 'Xiaomi' }),
      publishable('samsung-x', { brand: 'samsung', brandLabel: 'Samsung' }),
      publishable('motorola-x', { brand: 'motorola', brandLabel: 'Motorola' }),
    ]
    const groups = phoneHubGroups(models, TODAY)
    expect(groups.map(g => g.brand)).toEqual([
      'apple',
      'samsung',
      'motorola',
      'xiaomi',
      'honor',
      'infinix',
      'tecno',
    ])
  })

  it('within a brand, orders by family then storage ascending', () => {
    const models = [
      publishable('apple-iphone-17-512gb', { brand: 'apple', family: 'iphone-17', storageGb: 512 }),
      publishable('apple-iphone-16-256gb', { brand: 'apple', family: 'iphone-16', storageGb: 256 }),
      publishable('apple-iphone-17-256gb', { brand: 'apple', family: 'iphone-17', storageGb: 256 }),
    ]
    const [group] = phoneHubGroups(models, TODAY)
    expect(group!.models.map(m => m.slug)).toEqual([
      'apple-iphone-16-256gb',
      'apple-iphone-17-256gb',
      'apple-iphone-17-512gb',
    ])
  })

  it('drops models that are not publishable (no band, ambiguous, or stale)', () => {
    const models = [
      publishable('ok'),
      phoneDoc('no-band', { bands: {} }),
      publishable('ambiguous', { ambiguousConditions: ['new'] }),
      publishable('stale', { lastSeen: '2026-09-01' }),
    ]
    const groups = phoneHubGroups(models, TODAY)
    const slugs = groups.flatMap(g => g.models.map(m => m.slug))
    expect(slugs).toEqual(['ok'])
  })

  it('groups models of the same brand into one bucket, not one per model', () => {
    const models = [
      publishable('apple-a', { family: 'a' }),
      publishable('apple-b', { family: 'b' }),
    ]
    const groups = phoneHubGroups(models, TODAY)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.models).toHaveLength(2)
  })
})

describe('phoneSiblings', () => {
  // `id` sets `key` (see `phoneDoc`'s own comment) — every model below relies on that default rather
  // than repeating the id next to a literal `key:`, so the value never has to be quoted twice.
  const publishable = (id: string, overrides: Partial<PhoneModelDoc> = {}) =>
    phoneDoc(id, { bands: { new: band() }, ...overrides })
  const currentId = 'apple-iphone-17-pro-256gb'
  const current = { key: currentId, brand: 'apple', family: 'iphone-17-pro' }

  it('lists same-family variants (other storage) before other families of the same brand', () => {
    const siblingFamilyId = 'apple-iphone-17-512gb'
    const sameFamilyId = 'apple-iphone-17-pro-512gb'
    const models = [
      publishable(siblingFamilyId, { family: 'iphone-17', storageGb: 512 }),
      publishable(sameFamilyId, { family: 'iphone-17-pro', storageGb: 512 }),
    ]
    const result = phoneSiblings(models, current, TODAY)
    expect(result.map(m => m.slug)).toEqual([sameFamilyId, siblingFamilyId])
  })

  it('never includes the model itself', () => {
    const models = [publishable(currentId, { family: current.family })]
    expect(phoneSiblings(models, current, TODAY)).toEqual([])
  })

  it('excludes another brand entirely', () => {
    const otherBrandId = 'samsung-galaxy-s26-256gb'
    const models = [publishable(otherBrandId, { brand: 'samsung' })]
    expect(phoneSiblings(models, current, TODAY)).toEqual([])
  })

  it('drops a candidate that is not publishable', () => {
    const candidateId = 'apple-iphone-17-pro-512gb'
    const models = [phoneDoc(candidateId, { family: current.family, bands: {} })]
    expect(phoneSiblings(models, current, TODAY)).toEqual([])
  })

  it('caps at the given limit', () => {
    const models = Array.from({ length: 10 }, (_, i) =>
      publishable(`apple-iphone-17-pro-${i}gb`, { family: current.family, storageGb: i + 1 })
    )
    expect(phoneSiblings(models, current, TODAY, 8)).toHaveLength(8)
  })
})

describe('phoneModelProjection', () => {
  it('caps offers at 30', () => {
    const model = phoneDoc('a', { offers: Array.from({ length: 40 }, (_, i) => offer(1_000 + i)) })
    expect(phoneModelProjection(model).offers).toHaveLength(30)
  })
  it('keeps the most recent 180 history points (the tail), not the oldest', () => {
    const history: PhoneHistoryPointDoc[] = Array.from({ length: 400 }, (_, i) => ({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      newMin: 1_000 + i,
      newMedian: 1_100 + i,
      sellers: 1,
    }))
    const model = phoneDoc('a', { history })
    const result = phoneModelProjection(model)
    expect(result.history).toHaveLength(180)
    expect(result.history[0]).toEqual(history[400 - 180])
    expect(result.history[179]).toEqual(history[399])
  })
  it('leaves arrays under the caps untouched', () => {
    const model = phoneDoc('a', { offers: [offer(1_000)], history: [] })
    const result = phoneModelProjection(model)
    expect(result.offers).toHaveLength(1)
    expect(result.history).toEqual([])
  })
  it('does not mutate the input', () => {
    const model = phoneDoc('a', { offers: Array.from({ length: 40 }, (_, i) => offer(1_000 + i)) })
    phoneModelProjection(model)
    expect(model.offers).toHaveLength(40)
  })
})

describe('phoneMoney / phoneUsd', () => {
  it('formats whole UYU pesos with es-UY grouping', () => {
    expect(phoneMoney(39_500)).toBe('$39.500')
  })
  it('rounds a fractional peso', () => {
    expect(phoneMoney(39_500.6)).toBe('$39.501')
  })
  it("formats whole USD with the site's own grouping convention", () => {
    expect(phoneUsd(999)).toBe('US$999')
    expect(phoneUsd(1_299)).toBe('US$1.299')
  })
})
