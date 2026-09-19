import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const connectDb = vi.fn()
const loadCarCatalogMeta = vi.fn()
const loadCarOpportunities = vi.fn()
const loadCarMarket = vi.fn()
const findOneLean = vi.fn()
const findLean = vi.fn()
const countDocuments = vi.fn()
const aggregate = vi.fn()
const chain = (lean: () => unknown) => {
  const query: Record<string, unknown> = {}
  for (const name of ['select', 'sort', 'skip', 'limit', 'maxTimeMS']) query[name] = () => query
  query.lean = lean
  return query
}
vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/utils/cars', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/utils/cars')>()),
  loadCarCatalogMeta,
  loadCarOpportunities,
  loadCarMarket,
}))
vi.mock('../../server/models/CarCatalog', () => ({
  CarCatalogModel: {
    findOne: () => chain(findOneLean),
    find: () => chain(findLean),
    countDocuments: () => ({ maxTimeMS: countDocuments }),
    aggregate: () => ({ option: aggregate }),
  },
}))
const { getRouterParam, getQuery } = installNitroGlobals()
vi.stubGlobal('setResponseHeader', vi.fn())

const listHandler = (await import('../../server/api/cars/index.get')).default
const fichaHandler = (await import('../../server/api/cars/ficha/[key].get')).default
const marketHandler = (await import('../../server/api/cars/market/[slug].get')).default
const opportunitiesHandler = (await import('../../server/api/car-opportunities.get')).default

const row = {
  key: 'ml-MLU700355317',
  brand: 'BYD',
  brandSlug: 'byd',
  model: 'F3',
  modelSlug: 'f3',
  marketSlug: 'byd-f3',
  title: 'Byd F3',
  year: 2017,
  km: null,
  price: 9500,
  currency: 'USD',
  priceUsd: 9500,
  priceConverted: false,
  permalink: 'https://auto.mercadolibre.com.uy/MLU-700355317-x-_JM',
  picture: 'https://tracker.example/x.jpg',
  firstSeen: '2026-09-16T00:00:00.000Z',
  lastSeen: '2026-09-16T00:00:00.000Z',
  flags: [],
  sellerId: 'SECRET',
  description: 'SECRET',
}

describe('publicCarRow', () => {
  it('carries the fuel economy, rebuilt, and drops a malformed one', async () => {
    const { publicCarRow } = await import('../../server/utils/cars')
    const economy = {
      litersPer100Km: 6.7,
      city: 7.7,
      highway: 5.9,
      combined: null,
      basis: 'advert',
      sellers: null,
      extra: 'SECRET',
    }
    expect(
      publicCarRow({ ...row, source: 'mercadolibre', fuelEconomy: economy })?.fuelEconomy
    ).toEqual({
      litersPer100Km: 6.7,
      city: 7.7,
      highway: 5.9,
      combined: null,
      basis: 'advert',
      sellers: null,
    })
    expect(
      publicCarRow({
        ...row,
        source: 'mercadolibre',
        fuelEconomy: { litersPer100Km: 6.7, basis: 'guess' },
      })?.fuelEconomy
    ).toBeNull()
    expect(publicCarRow({ ...row, source: 'mercadolibre' })?.fuelEconomy).toBeNull()
  })

  // MLU700552753: priced at the stated cash price, the portal's number kept aside. The first deploy
  // wrote it to the catalogue and this projection dropped it: the card never said "figura US$ 8.990".
  it('carries the listed number when the price is the stated cash price', async () => {
    const { publicCarRow } = await import('../../server/utils/cars')
    expect(
      publicCarRow({ ...row, source: 'mercadolibre', price: 12990, listedPrice: 8990 })?.listedPrice
    ).toBe(8990)
    expect(publicCarRow({ ...row, source: 'mercadolibre' })?.listedPrice).toBeNull()
    expect(
      publicCarRow({ ...row, source: 'mercadolibre', listedPrice: 'x' })?.listedPrice
    ).toBeNull()
  })

  it('keeps each source on its own permalink and picture hosts', async () => {
    const { publicCarRow } = await import('../../server/utils/cars')
    const facebook = publicCarRow({
      ...row,
      key: 'fb-1',
      source: 'facebook',
      permalink: 'https://www.facebook.com/marketplace/item/1268374875382121/',
      picture: 'https://scontent-yyz1-1.xx.fbcdn.net/v/x.jpg',
      currencyInferred: true,
      reference: { priceUsd: 5000, basis: 'year', updatedAt: '2026-09-17', extra: 'SECRET' },
    })
    expect(facebook).toMatchObject({
      source: 'facebook',
      sourceName: 'Facebook Marketplace',
      currencyInferred: true,
      reference: { priceUsd: 5000, basis: 'year', updatedAt: '2026-09-17' },
    })
    expect(facebook.picture).toBe('https://scontent-yyz1-1.xx.fbcdn.net/v/x.jpg')
    expect(JSON.stringify(facebook)).not.toContain('SECRET')
    expect(
      publicCarRow({
        ...row,
        source: 'facebook',
        permalink: 'https://auto.mercadolibre.com.uy/MLU-1',
      }).permalink
    ).toBe('')
    expect(
      publicCarRow({ ...row, source: 'clasiautos', picture: 'https://http2.mlstatic.com/x.jpg' })
        .picture
    ).toBeNull()
    const legacy = publicCarRow({ ...row, source: undefined })
    expect(legacy).toMatchObject({
      source: 'mercadolibre',
      sourceName: 'Mercado Libre',
      reference: null,
      currencyInferred: false,
    })
    expect(legacy.permalink).toBe('https://auto.mercadolibre.com.uy/MLU-700355317-x-_JM')
    expect(publicCarRow({ ...row, source: 'nope' }).source).toBe('mercadolibre')
  })
})

describe('used-car APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connectDb.mockResolvedValue(undefined)
    loadCarCatalogMeta.mockResolvedValue({
      key: 'uy-cars',
      freshDays: 4,
      generatedAt: 'g',
      usdUyu: 40,
      listings: 1,
      models: [],
      opportunities: 0,
      lastReadAt: null,
      lastFullReadAt: null,
      reportedTotal: null,
    })
    loadCarOpportunities.mockResolvedValue(null)
    loadCarMarket.mockResolvedValue(null)
    findOneLean.mockResolvedValue(row)
    findLean.mockResolvedValue([row])
    countDocuments.mockResolvedValue(1)
    aggregate.mockResolvedValue([])
    getQuery.mockReturnValue({})
  })

  it('lists adverts through the explicit projection', async () => {
    const page = (await listHandler({} as never)) as { items: Array<Record<string, unknown>> }
    expect(page.items).toHaveLength(1)
    expect(page.items[0]).not.toHaveProperty('sellerId')
    expect(page.items[0]).not.toHaveProperty('description')
    expect(page.items[0]!.picture).toBeNull()
  })
  it('answers 503 while the catalogue is being prepared', async () => {
    loadCarCatalogMeta.mockResolvedValue(null)
    await expect(listHandler({} as never)).rejects.toMatchObject({ statusCode: 503 })
  })
  it('404s an invalid or unknown advert key and 503s a database failure', async () => {
    getRouterParam.mockReturnValue('ml-MLU1; drop')
    await expect(fichaHandler({} as never)).rejects.toMatchObject({ statusCode: 404 })
    getRouterParam.mockReturnValue('ml-MLU700355317')
    findOneLean.mockResolvedValue(null)
    await expect(fichaHandler({} as never)).rejects.toMatchObject({ statusCode: 404 })
    findOneLean.mockRejectedValue(new Error('down'))
    await expect(fichaHandler({} as never)).rejects.toMatchObject({ statusCode: 503 })
  })
  it('serves an advert even when optional market data fails', async () => {
    getRouterParam.mockReturnValue('ml-MLU700355317')
    loadCarMarket.mockRejectedValue(new Error('slow'))
    const detail = (await fichaHandler({} as never)) as { car: { key: string }; cohort: unknown }
    expect(detail.car.key).toBe('ml-MLU700355317')
    expect(detail.cohort).toBeNull()
  })
  it('404s an unknown model page and marks thin models non-indexable', async () => {
    getRouterParam.mockReturnValue('byd-f3')
    await expect(marketHandler({} as never)).rejects.toMatchObject({ statusCode: 404 })
    loadCarMarket.mockResolvedValue({
      version: 1,
      slug: 'byd-f3',
      listings: 12,
      years: [],
      rows: [],
    })
    const market = (await marketHandler({} as never)) as { indexable: boolean }
    expect(market.indexable).toBe(false)
  })
  it('answers 503 for opportunities without a snapshot', async () => {
    await expect(opportunitiesHandler({} as never)).rejects.toMatchObject({ statusCode: 503 })
  })
})
