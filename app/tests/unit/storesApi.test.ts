import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { find, findOne, connectDb, getRawCatalog } = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  connectDb: vi.fn(),
  getRawCatalog: vi.fn(),
}))

vi.mock('../../server/models/StoreProfile', () => ({
  StoreProfileModel: { find, findOne },
}))
vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/utils/bankos', () => ({ getRawCatalog }))

const setResponseHeaderCalls: Array<[string, string]> = []

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', (event: any, key: string) => event[key])
// Records every call (not just the last) so a test can assert an OVERRIDE happened — item 13 sets
// cache-control twice on the catch path (public first, then no-store) and both calls must be seen.
vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) => {
  setResponseHeaderCalls.push([name, value])
})
vi.stubGlobal('createError', (options: Record<string, unknown>) =>
  Object.assign(new Error(String(options.statusMessage)), options)
)

const indexHandler = (await import('../../server/api/stores/index.get')).default
const detailHandler = (await import('../../server/api/stores/[slug].get')).default

// The routes gate freshness against the real wall clock (`new Date()`), so fixtures anchor to it
// too, rather than a fixed calendar date that would drift stale as real time passes.
const freshAt = (daysAgo = 2): string => new Date(Date.now() - daysAgo * 86_400_000).toISOString()
const staleAt = (): string => new Date(Date.now() - 61 * 86_400_000).toISOString()

/** A lean-query chain that ends in `.lean()` resolving/rejecting with `result`. */
function chain(result: unknown, reject = false) {
  return {
    select: () => ({
      lean: () => (reject ? Promise.reject(result) : Promise.resolve(result)),
    }),
  }
}

beforeEach(() => {
  find.mockReset()
  findOne.mockReset()
  connectDb.mockReset().mockResolvedValue(undefined)
  getRawCatalog.mockReset()
  setResponseHeaderCalls.length = 0
})
afterAll(() => vi.unstubAllGlobals())

describe('GET /api/stores', () => {
  it('returns every curated store, alphabetical, merging in whatever profile exists', async () => {
    const updatedAt = freshAt(1)
    find.mockReturnValue(
      chain([
        {
          key: 'temu',
          name: 'Temu',
          domain: 'temu.com',
          kind: 'compra-exterior',
          rubros: ['general', 'moda'],
          aliases: ['Temu'],
          site: null,
          age: { since: '2020-01-01', source: 'crt.sh', checkedAt: freshAt() },
          trustpilot: {
            score: 3.1,
            reviews: 900,
            reviewsLast12m: 100,
            claimed: true,
            alerts: 0,
            url: 'x',
            checkedAt: freshAt(),
          },
          google: null,
          reddit: null,
          catalog: null,
          signals: 2,
          indexable: false,
          firstSeen: '2026-01-01',
          lastSeen: '2026-09-10',
          updatedAt,
        },
      ])
    )

    const result = await (indexHandler as any)({})
    expect(result.stores.length).toBeGreaterThan(40)

    // Alphabetical order (es).
    const names = result.stores.map((s: any) => s.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')))

    const temu = result.stores.find((s: any) => s.key === 'temu')
    expect(temu.trustpilot).toEqual({ score: 3.1, reviews: 900 })
    expect(temu.since).toBe('2020-01-01')
    expect(temu.redditMentions).toBeNull()
    expect(temu.catalogOffers).toBeNull()
    expect(temu.signals).toBe(2) // age + trustpilot, both fresh
    expect(temu.hasProfile).toBe(true)

    // The one written profile's own `updatedAt` becomes the hub-wide `reviewedAt`.
    expect(result.reviewedAt).toBe(new Date(updatedAt).toISOString())

    // A store with no written profile still appears, fully empty.
    const noProfile = result.stores.find((s: any) => s.key === 'bertoni')
    expect(noProfile).toMatchObject({
      trustpilot: null,
      google: null,
      redditMentions: null,
      catalogOffers: null,
      signals: 0,
      indexable: false,
      hasProfile: false,
    })
  })

  it('takes the newest updatedAt across every written profile as reviewedAt', async () => {
    const older = freshAt(10)
    const newer = freshAt(1)
    find.mockReturnValue(
      chain([
        {
          key: 'temu',
          name: 'Temu',
          domain: 'temu.com',
          kind: 'compra-exterior',
          rubros: ['general'],
          aliases: ['Temu'],
          site: null,
          age: null,
          trustpilot: null,
          google: null,
          reddit: null,
          catalog: null,
          signals: 0,
          indexable: false,
          firstSeen: '2026-01-01',
          lastSeen: '2026-09-10',
          updatedAt: newer,
        },
        {
          key: 'shein',
          name: 'Shein',
          domain: 'shein.com',
          kind: 'compra-exterior',
          rubros: ['moda'],
          aliases: ['Shein'],
          site: null,
          age: null,
          trustpilot: null,
          google: null,
          reddit: null,
          catalog: null,
          signals: 0,
          indexable: false,
          firstSeen: '2026-01-01',
          lastSeen: '2026-09-10',
          updatedAt: older,
        },
      ])
    )

    const result = await (indexHandler as any)({})
    expect(result.reviewedAt).toBe(new Date(newer).toISOString())
  })

  it('does not publish a stale Trustpilot/Google signal as if it were current (C1)', async () => {
    find.mockReturnValue(
      chain([
        {
          key: 'temu',
          name: 'Temu',
          domain: 'temu.com',
          kind: 'compra-exterior',
          rubros: ['general', 'moda'],
          aliases: ['Temu'],
          site: null,
          age: null,
          // 61 days old: must not surface on the hub as a current score.
          trustpilot: {
            score: 1.2,
            reviews: 900,
            reviewsLast12m: 0,
            claimed: false,
            alerts: 0,
            url: 'x',
            checkedAt: staleAt(),
          },
          // Fresh: must surface.
          google: { rating: 4.5, reviews: 20, address: null, url: 'x', checkedAt: freshAt() },
          reddit: null,
          catalog: null,
          signals: 2,
          indexable: false,
          firstSeen: '2026-01-01',
          lastSeen: '2026-09-10',
        },
      ])
    )

    const result = await (indexHandler as any)({})
    const temu = result.stores.find((s: any) => s.key === 'temu')
    expect(temu.trustpilot).toBeNull()
    expect(temu.google).toEqual({ rating: 4.5, reviews: 20 })
  })

  it('recomputes indexable from fresh signals instead of trusting the stored field (I2)', async () => {
    find.mockReturnValue(
      chain([
        {
          key: 'temu',
          name: 'Temu',
          domain: 'temu.com',
          kind: 'compra-exterior',
          rubros: ['general'],
          aliases: ['Temu'],
          // Stored `indexable: true`, but only ONE signal is actually fresh below the min of 3.
          site: null,
          age: { since: '2020-01-01', source: 'crt.sh', checkedAt: staleAt() },
          trustpilot: null,
          google: null,
          reddit: {
            mentions: 3,
            byYear: {},
            threads: [],
            tone: null,
            capped: false,
            checkedAt: freshAt(),
          },
          catalog: null,
          signals: 3,
          indexable: true,
          firstSeen: '2026-01-01',
          lastSeen: '2026-09-10',
        },
        {
          key: 'shein',
          name: 'Shein',
          domain: 'shein.com',
          kind: 'compra-exterior',
          rubros: ['moda'],
          aliases: ['Shein'],
          // Stored `indexable: false`, but THREE signals are actually fresh.
          site: {
            status: 'ok',
            finalHost: 'shein.com',
            https: true,
            platform: 'otra',
            phone: false,
            whatsapp: false,
            email: false,
            rut: null,
            address: null,
            policies: { returns: null, terms: null, privacy: null },
            payments: [],
            checkedAt: freshAt(),
          },
          age: { since: '2019-01-01', source: 'crt.sh', checkedAt: freshAt() },
          trustpilot: {
            score: 2,
            reviews: 50,
            reviewsLast12m: 5,
            claimed: false,
            alerts: 0,
            url: 'x',
            checkedAt: freshAt(),
          },
          google: null,
          reddit: null,
          catalog: null,
          signals: 0,
          indexable: false,
          firstSeen: '2026-01-01',
          lastSeen: '2026-09-10',
        },
      ])
    )

    const result = await (indexHandler as any)({})
    const temu = result.stores.find((s: any) => s.key === 'temu')
    const shein = result.stores.find((s: any) => s.key === 'shein')
    expect(temu.indexable).toBe(false) // only 1 fresh signal (reddit), despite the stored `true`
    expect(shein.indexable).toBe(true) // 3 fresh signals, despite the stored `false`
  })

  it('returns the empty shape, never throws, on a database failure', async () => {
    connectDb.mockRejectedValue(new Error('mongo down'))
    const result = await (indexHandler as any)({})
    expect(result).toEqual({ stores: [], reviewedAt: null })
  })

  it('overwrites the earlier public cache header with no-store on the catch path (item 13)', async () => {
    connectDb.mockRejectedValue(new Error('mongo down'))
    await (indexHandler as any)({})
    // The route sets a public, hour-long cache header BEFORE the try block for the real response;
    // left uncorrected on failure, a transient DB blip would get the empty fallback cached at an
    // edge for up to an hour. The LAST call must be the override.
    expect(setResponseHeaderCalls.length).toBeGreaterThanOrEqual(2)
    const [name, value] = setResponseHeaderCalls[setResponseHeaderCalls.length - 1]!
    expect(name).toBe('cache-control')
    expect(value).toBe('no-store')
  })

  it('marks a capped reddit count and never a raw 500 (item 2)', async () => {
    find.mockReturnValue(
      chain([
        {
          key: 'temu',
          name: 'Temu',
          domain: 'temu.com',
          kind: 'compra-exterior',
          rubros: ['general'],
          aliases: ['Temu'],
          site: null,
          age: null,
          trustpilot: null,
          google: null,
          reddit: {
            mentions: 500,
            byYear: {},
            threads: [],
            tone: null,
            capped: true,
            checkedAt: freshAt(),
          },
          catalog: null,
          signals: 1,
          indexable: false,
          firstSeen: '2026-01-01',
          lastSeen: '2026-09-10',
        },
      ])
    )
    const result = await (indexHandler as any)({})
    const temu = result.stores.find((s: any) => s.key === 'temu')
    expect(temu.redditMentions).toBe(500)
    expect(temu.redditMentionsCapped).toBe(true)
  })

  it('reports redditMentionsCapped as false when there is no fresh reddit count at all', async () => {
    find.mockReturnValue(chain([]))
    const result = await (indexHandler as any)({})
    const bertoni = result.stores.find((s: any) => s.key === 'bertoni')
    expect(bertoni.redditMentions).toBeNull()
    expect(bertoni.redditMentionsCapped).toBe(false)
  })
})

describe('GET /api/stores/<slug>', () => {
  it('rejects an unknown key with 404 before touching the database', async () => {
    await expect((detailHandler as any)({ slug: 'not-a-real-store' })).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(connectDb).not.toHaveBeenCalled()
    expect(findOne).not.toHaveBeenCalled()
  })

  it('rejects with 404 when the key is valid but no profile document exists yet', async () => {
    findOne.mockReturnValue(chain(null))
    await expect((detailHandler as any)({ slug: 'temu' })).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('returns the profile and the matching Bankos brand slug', async () => {
    const doc = {
      key: 'temu',
      name: 'Temu',
      domain: 'temu.com',
      kind: 'compra-exterior',
      rubros: ['general', 'moda'],
      aliases: ['Temu'],
      site: null,
      age: null,
      trustpilot: null,
      google: null,
      reddit: null,
      catalog: null,
      signals: 0,
      indexable: false,
      firstSeen: '2026-01-01',
      lastSeen: '2026-09-10',
    }
    findOne.mockReturnValue(chain(doc))
    getRawCatalog.mockResolvedValue({
      catalog: {
        data: {
          brands: { b1: { brandId: 'b1', name: 'Temu', categories: ['tecnologia'] } },
          bankBrands: {
            itau: { b1: { creditDescription: '10% off', debitDescription: null } },
            bbva: { b1: { creditDescription: '5% off', debitDescription: null } },
          },
          brandLocations: { b1: ['l1', 'l2', 'l3', 'l4'] },
        },
        baseSource: 'live',
        generatedAt: '2026-09-16T00:00:00.000Z',
      },
      source: 'live',
    })

    const result = await (detailHandler as any)({ slug: 'temu' })
    expect(result.profile).toEqual(doc)
    expect(result.bankosBrandSlug).toBe('temu')
    // Item 11: the same instant used to recompute signals/indexable is published as servedAt, so
    // the page never has to fall back to a client-side `new Date()` for freshness decisions.
    expect(typeof result.servedAt).toBe('string')
    expect(Number.isNaN(Date.parse(result.servedAt))).toBe(false)
  })

  it("matches the Bankos brand only by the store's own canonical name, never a generic alias (item 14)", async () => {
    // "Tienda Claro" carries the alias "Claro" for seller-name matching elsewhere; a Bankos brand
    // that happens to ALSO be named "Claro" is very likely a different company entirely, and the
    // old alias-matching behaviour would have cross-linked to it anyway.
    const doc = {
      key: 'tienda-claro',
      name: 'Tienda Claro',
      domain: 'tienda.claro.com.uy',
      kind: 'tienda-uy',
      rubros: ['celulares'],
      aliases: ['Tienda Claro', 'Claro'],
      site: null,
      age: null,
      trustpilot: null,
      google: null,
      reddit: null,
      catalog: null,
      signals: 0,
      indexable: false,
      firstSeen: '2026-01-01',
      lastSeen: '2026-09-10',
    }
    findOne.mockReturnValue(chain(doc))
    getRawCatalog.mockResolvedValue({
      catalog: {
        data: {
          brands: { b1: { brandId: 'b1', name: 'Claro', categories: ['moda'] } },
          bankBrands: { itau: { b1: { creditDescription: '10% off', debitDescription: null } } },
          brandLocations: { b1: ['l1', 'l2', 'l3', 'l4'] },
        },
        baseSource: 'live',
        generatedAt: '2026-09-16T00:00:00.000Z',
      },
      source: 'live',
    })

    const result = await (detailHandler as any)({ slug: 'tienda-claro' })
    expect(result.bankosBrandSlug).toBeNull()
  })

  it('degrades to a null brand slug, never a 500, when the Bankos loader fails', async () => {
    const doc = {
      key: 'temu',
      name: 'Temu',
      domain: 'temu.com',
      kind: 'compra-exterior',
      rubros: ['general'],
      aliases: ['Temu'],
      site: null,
      age: null,
      trustpilot: null,
      google: null,
      reddit: null,
      catalog: null,
      signals: 0,
      indexable: false,
      firstSeen: '2026-01-01',
      lastSeen: '2026-09-10',
    }
    findOne.mockReturnValue(chain(doc))
    getRawCatalog.mockRejectedValue(new Error('Bankos unavailable'))

    const result = await (detailHandler as any)({ slug: 'temu' })
    expect(result.profile).toEqual(doc)
    expect(result.bankosBrandSlug).toBeNull()
  })

  it('recomputes signals/indexable from what is actually fresh, not the stored snapshot (I2)', async () => {
    const doc = {
      key: 'temu',
      name: 'Temu',
      domain: 'temu.com',
      kind: 'compra-exterior',
      rubros: ['general'],
      aliases: ['Temu'],
      site: null,
      // Only Google is fresh; age is stale. Doc claims signals=5/indexable=true, both wrong.
      age: { since: '2020-01-01', source: 'crt.sh', checkedAt: staleAt() },
      trustpilot: null,
      google: { rating: 4.1, reviews: 30, address: null, url: 'x', checkedAt: freshAt() },
      reddit: null,
      catalog: null,
      signals: 5,
      indexable: true,
      firstSeen: '2026-01-01',
      lastSeen: '2026-09-10',
    }
    findOne.mockReturnValue(chain(doc))
    getRawCatalog.mockRejectedValue(new Error('Bankos unavailable'))

    const result = await (detailHandler as any)({ slug: 'temu' })
    expect(result.profile.signals).toBe(1)
    expect(result.profile.indexable).toBe(false)
    // The raw signal objects (with their own checkedAt) are still passed through untouched: the
    // detail page decides freshness per-field itself via storeSignalFresh/storeSignalSummary.
    expect(result.profile.age).toEqual(doc.age)
    expect(result.profile.google).toEqual(doc.google)
  })
})
