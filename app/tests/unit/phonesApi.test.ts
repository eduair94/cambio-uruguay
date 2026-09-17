import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'
import type { PhoneBandDoc, PhoneModelDoc, PhoneOfferDoc } from '../../utils/phones'

const connectDb = vi.fn()
const modelFindOneLean = vi.fn()
const modelFindLean = vi.fn()
const metaFindOneLean = vi.fn()

// Mirrors app/tests/unit/carsApi.test.ts's own `chain` helper: a Mongoose query chain reduced to the
// two links these routes actually call (`.select()` then `.lean()`), so a route can be tested without
// a real database.
const chain = (lean: () => unknown) => {
  const query: Record<string, unknown> = {}
  query.select = () => query
  query.lean = lean
  return query
}

vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/models/PhoneModel', () => ({
  PhoneModelModel: {
    find: () => chain(modelFindLean),
    findOne: () => chain(modelFindOneLean),
  },
}))
vi.mock('../../server/models/PhoneMeta', () => ({
  PhoneMetaModel: {
    findOne: () => chain(metaFindOneLean),
  },
}))

const { getRouterParam } = installNitroGlobals()
const headers: Array<[string, string]> = []
vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) => {
  headers.push([name, value])
})

// The routes compute "today" from the real clock (`new Date()`, same as
// app/server/api/equipar/[categoria].get.ts's own cutoff) rather than taking it as a parameter, so a
// fixture that needs to read as FRESH has to track the real day the suite happens to run on; a
// fixture that needs to read as STALE uses a date far enough in the past to never depend on it.
const TODAY = new Date().toISOString().slice(0, 10)
const LONG_AGO = '2000-01-01'

const hubHandler = (await import('../../server/api/phones/index.get')).default
const detailHandler = (await import('../../server/api/phones/[modelo].get')).default

const band = (overrides: Partial<PhoneBandDoc> = {}): PhoneBandDoc => ({
  min: 39_500,
  p25: 40_000,
  median: 41_000,
  p75: 42_000,
  n: 5,
  sellers: 3,
  ...overrides,
})

const offer = (priceUyu: number, overrides: Partial<PhoneOfferDoc> = {}): PhoneOfferDoc => ({
  seller: 'Zonatecno',
  sellerKey: 'zonatecno',
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

// `id`, not `key`: see app/tests/unit/phones.test.ts's own comment (gitleaks flags a committed
// `key: "<literal with digits>"`).
function phoneDoc(id: string, overrides: Partial<PhoneModelDoc> = {}): PhoneModelDoc {
  return {
    key: id,
    slug: id,
    brand: 'apple',
    brandLabel: 'Apple',
    family: 'iphone-17-pro',
    familyLabel: 'iPhone 17 Pro',
    storageGb: 256,
    name: 'Apple iPhone 17 Pro 256 GB',
    image: null,
    bands: { new: band() },
    offers: [offer(39_500)],
    newSellers: 2,
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

beforeEach(() => {
  vi.clearAllMocks()
  headers.length = 0
  connectDb.mockResolvedValue(undefined)
  metaFindOneLean.mockResolvedValue({ generatedAt: '2026-09-17T09:00:00.000Z', usdUyu: 40 })
  modelFindLean.mockResolvedValue([])
  modelFindOneLean.mockResolvedValue(null)
})

describe('GET /api/phones (hub)', () => {
  it('groups publishable models by brand and answers with a public cache header', async () => {
    modelFindLean.mockResolvedValue([
      phoneDoc('samsung-galaxy-s26-256gb', {
        brand: 'samsung',
        brandLabel: 'Samsung',
        family: 'galaxy-s26',
      }),
      phoneDoc('apple-iphone-17-pro-256gb'),
    ])
    const result = (await hubHandler({} as never)) as {
      generatedAt: string
      usdUyu: number
      brands: Array<{ brand: string; models: Array<{ slug: string }> }>
    }
    expect(result.generatedAt).toBe('2026-09-17T09:00:00.000Z')
    expect(result.usdUyu).toBe(40)
    // Apple sorts before Samsung in the fixed brand order, regardless of the array's own order.
    expect(result.brands.map(b => b.brand)).toEqual(['apple', 'samsung'])
    expect(headers).toContainEqual([
      'cache-control',
      'public, max-age=900, s-maxage=900, stale-while-revalidate=86400',
    ])
  })

  it('drops a model with no publishable NEW band from the hub', async () => {
    modelFindLean.mockResolvedValue([phoneDoc('a', { bands: {} })])
    const result = (await hubHandler({} as never)) as { brands: unknown[] }
    expect(result.brands).toEqual([])
  })

  it('a database failure answers the empty shape with no-store, overwriting the public header', async () => {
    modelFindLean.mockRejectedValue(new Error('down'))
    const result = (await hubHandler({} as never)) as {
      generatedAt: string
      usdUyu: number
      brands: unknown[]
    }
    expect(result).toEqual({ generatedAt: '', usdUyu: 0, brands: [] })
    expect(headers.at(-1)).toEqual(['cache-control', 'no-store'])
  })

  it('a connectDb failure is handled the same way', async () => {
    connectDb.mockRejectedValue(new Error('no db'))
    const result = (await hubHandler({} as never)) as { brands: unknown[] }
    expect(result.brands).toEqual([])
    expect(headers.at(-1)).toEqual(['cache-control', 'no-store'])
  })
})

describe('GET /api/phones/<modelo> (detail)', () => {
  it.each(['', 'a', 'UPPER-CASE', 'has spaces', 'semi;colon', '-leading-dash'])(
    'rejects a malformed slug (%s) with 404 before touching the database',
    async slug => {
      getRouterParam.mockReturnValue(slug)
      await expect(detailHandler({} as never)).rejects.toMatchObject({ statusCode: 404 })
      expect(connectDb).not.toHaveBeenCalled()
      expect(headers).toContainEqual(['cache-control', 'no-store'])
    }
  )

  it('404s a well-formed slug with no matching document', async () => {
    getRouterParam.mockReturnValue('apple-iphone-17-pro-256gb')
    modelFindOneLean.mockResolvedValue(null)
    await expect(detailHandler({} as never)).rejects.toMatchObject({ statusCode: 404 })
    expect(headers.at(-1)).toEqual(['cache-control', 'no-store'])
  })

  it('a database failure also 404s with no-store, never a cached false negative', async () => {
    getRouterParam.mockReturnValue('apple-iphone-17-pro-256gb')
    modelFindOneLean.mockRejectedValue(new Error('down'))
    await expect(detailHandler({} as never)).rejects.toMatchObject({ statusCode: 404 })
    expect(headers.at(-1)).toEqual(['cache-control', 'no-store'])
  })

  it('serves a publishable model with its band-derived offers trimmed and a public cache header', async () => {
    getRouterParam.mockReturnValue('apple-iphone-17-pro-256gb')
    modelFindOneLean.mockResolvedValue(
      phoneDoc('apple-iphone-17-pro-256gb', {
        offers: Array.from({ length: 40 }, (_, i) => offer(39_500 + i)),
      })
    )
    modelFindLean.mockResolvedValue([])
    const result = (await detailHandler({} as never)) as {
      model: { offers: unknown[] }
      stale: boolean
      publishable: boolean
    }
    expect(result.model.offers).toHaveLength(30)
    expect(result.stale).toBe(false)
    expect(result.publishable).toBe(true)
    expect(headers.at(-1)).toEqual([
      'cache-control',
      'public, max-age=900, s-maxage=900, stale-while-revalidate=86400',
    ])
  })

  it('still serves a model whose NEW condition is ambiguous, but reports it as unpublishable', async () => {
    getRouterParam.mockReturnValue('apple-iphone-17-pro-256gb')
    modelFindOneLean.mockResolvedValue(
      phoneDoc('apple-iphone-17-pro-256gb', { ambiguousConditions: ['new'] })
    )
    const result = (await detailHandler({} as never)) as { publishable: boolean }
    expect(result.publishable).toBe(false)
  })

  it('reports a model whose lastSeen has gone stale', async () => {
    getRouterParam.mockReturnValue('apple-iphone-17-pro-256gb')
    modelFindOneLean.mockResolvedValue(
      phoneDoc('apple-iphone-17-pro-256gb', { lastSeen: LONG_AGO })
    )
    const result = (await detailHandler({} as never)) as { stale: boolean; publishable: boolean }
    expect(result.stale).toBe(true)
    expect(result.publishable).toBe(false)
  })

  it('siblings never include the model itself, even if the sibling query happens to return it', async () => {
    getRouterParam.mockReturnValue('apple-iphone-17-pro-256gb')
    const self = phoneDoc('apple-iphone-17-pro-256gb')
    modelFindOneLean.mockResolvedValue(self)
    modelFindLean.mockResolvedValue([
      self,
      phoneDoc('apple-iphone-17-pro-512gb', { storageGb: 512 }),
    ])
    const result = (await detailHandler({} as never)) as { siblings: Array<{ slug: string }> }
    expect(result.siblings.map(s => s.slug)).toEqual(['apple-iphone-17-pro-512gb'])
  })
})
