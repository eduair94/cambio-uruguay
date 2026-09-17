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

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', (event: any, key: string) => event[key])
vi.stubGlobal('setResponseHeader', (_event: unknown, _name: string, _value: string) => {})
vi.stubGlobal('createError', (options: Record<string, unknown>) =>
  Object.assign(new Error(String(options.statusMessage)), options)
)

const indexHandler = (await import('../../server/api/stores/index.get')).default
const detailHandler = (await import('../../server/api/stores/[slug].get')).default

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
})
afterAll(() => vi.unstubAllGlobals())

describe('GET /api/stores', () => {
  it('returns every curated store, alphabetical, merging in whatever profile exists', async () => {
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
          age: { since: '2020-01-01', source: 'crt.sh', checkedAt: '2026-09-10T00:00:00.000Z' },
          trustpilot: {
            score: 3.1,
            reviews: 900,
            reviewsLast12m: 100,
            claimed: true,
            alerts: 0,
            url: 'x',
            checkedAt: '2026-09-10T00:00:00.000Z',
          },
          google: null,
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

    // A store with no written profile still appears, fully empty.
    const noProfile = result.stores.find((s: any) => s.key === 'bertoni')
    expect(noProfile).toMatchObject({
      trustpilot: null,
      google: null,
      redditMentions: null,
      catalogOffers: null,
      signals: 0,
      indexable: false,
    })
  })

  it('returns the empty shape, never throws, on a database failure', async () => {
    connectDb.mockRejectedValue(new Error('mongo down'))
    const result = await (indexHandler as any)({})
    expect(result).toEqual({ stores: [] })
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
})
