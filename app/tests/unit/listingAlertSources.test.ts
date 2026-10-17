import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  carAlertCandidate,
  matchListingAlertCandidates,
  motoAlertCandidate,
  readListingAlertInventory,
  saleAlertCandidate,
} from '../../server/utils/listingAlertSources'

const mocks = vi.hoisted(() => ({
  carFind: vi.fn(),
  carMeta: vi.fn(),
  motoFind: vi.fn(),
  motoMeta: vi.fn(),
  saleFind: vi.fn(),
  saleAggregate: vi.fn(),
  saleMeta: vi.fn(),
}))
/** Every query-builder method returns the same chain; `lean`/`option` resolve the rows. */
const { chain, metaModel } = vi.hoisted(() => {
  function chain(rows: unknown) {
    const c: Record<string, unknown> = {}
    for (const method of ['select', 'sort', 'limit', 'maxTimeMS', 'collation']) c[method] = () => c
    c.lean = async () => rows
    c.option = async () => rows
    return c
  }
  const metaModel = (lean: () => unknown) => ({
    findOne: () => ({ select: () => ({ lean }) }),
  })
  return { chain, metaModel }
})
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
vi.mock('../../server/models/CarCatalog', () => ({ CarCatalogModel: { find: mocks.carFind } }))
vi.mock('../../server/models/CarCatalogMeta', () => ({
  CarCatalogMetaModel: metaModel(mocks.carMeta),
}))
vi.mock('../../server/models/MotoCatalog', () => ({ MotoCatalogModel: { find: mocks.motoFind } }))
vi.mock('../../server/models/MotoCatalogMeta', () => ({
  MotoCatalogMetaModel: metaModel(mocks.motoMeta),
}))
vi.mock('../../server/models/PropertySaleCatalog', () => ({
  PropertySaleCatalogModel: { find: mocks.saleFind, aggregate: mocks.saleAggregate },
  PropertySaleCatalogMetaModel: metaModel(mocks.saleMeta),
}))

const now = Date.parse('2026-10-17T12:00:00Z')
const car = (key: string, price = 9000) => ({
  key,
  title: 'Citroën Xsara 1.6',
  price,
  currency: 'USD',
  year: 2011,
  km: 150000,
  department: 'Montevideo',
  picture: 'https://http2.mlstatic.com/a.jpg',
  lastSeen: '2026-10-17T10:00:00.000Z',
})

describe('listing alert candidates', () => {
  it('builds a car candidate that links to its own page', () => {
    expect(carAlertCandidate(car('ml-MLU123456'))).toMatchObject({
      id: 'car:ml-MLU123456',
      propertyKey: 'car:ml-MLU123456',
      url: '/autos-usados-uruguay/ml-MLU123456',
      price: { amount: 9000, currency: 'USD' },
      facts: ['2011', '150.000 km', 'Montevideo'],
    })
    expect(carAlertCandidate({ ...car('not a key') })).toBeNull()
    expect(carAlertCandidate({ ...car('ml-MLU123456'), price: 0 })).toBeNull()
  })
  it('links a moto to its original advert only on Mercado Libre Uruguay over https', () => {
    const row = {
      key: 'ml-MLU99',
      title: 'Honda Wave 110',
      price: 1500,
      currency: 'USD',
      year: 2022,
      displacement: 110,
      department: 'Canelones',
      marketSlug: 'honda-wave',
      fuel: 'nafta',
      picture: null,
    }
    expect(
      motoAlertCandidate({ ...row, permalink: 'https://moto.mercadolibre.com.uy/MLU-99-honda' })
    ).toMatchObject({
      id: 'moto:ml-MLU99',
      link: 'https://moto.mercadolibre.com.uy/MLU-99-honda',
      facts: ['2022', '110 cc', 'Canelones'],
    })
    expect(motoAlertCandidate({ ...row, permalink: 'http://evil.example/x' })?.link).toBeUndefined()
    expect(
      motoAlertCandidate({ ...row, permalink: 'https://mercadolibre.com.uy.evil.example/x' })?.link
    ).toBeUndefined()
  })
  it('builds a sale candidate with rooms, area and place', () => {
    expect(
      saleAlertCandidate({
        key: 'infocasas-1',
        title: 'Apartamento en Pocitos',
        price: { amount: 180000, currency: 'USD' },
        propertyType: 'apartamento',
        bedrooms: 2,
        areas: { built: 80 },
        neighborhood: 'Pocitos',
        department: 'Montevideo',
        image: null,
      })
    ).toMatchObject({
      id: 'sale:infocasas-1',
      url: '/venta-viviendas-uruguay/infocasas-1',
      facts: ['Apartamento', '2 dorm.', '80 m²', 'Pocitos, Montevideo'],
      neighborhood: 'Pocitos',
      bedrooms: 2,
    })
  })
})

describe('listing alert inventory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('reads every key with its price between two identical catalogue versions', async () => {
    mocks.carMeta.mockResolvedValue({ generatedAt: 'g1' })
    mocks.carFind.mockReturnValue(chain([car('ml-MLU100002'), car('ml-MLU100001', 8000)]))
    const inventory = await readListingAlertInventory('car-search')
    expect(inventory.ids).toEqual(['car:ml-MLU100001', 'car:ml-MLU100002'])
    expect(inventory.prices?.get('car:ml-MLU100001')).toEqual({ amount: 8000, currency: 'USD' })
    expect(inventory.algorithm).toBe('car-search-v1')
    expect(inventory.sourceVersion).toBe('g1')
  })
  it('keeps a car whose currency was deduced out of the price ledger', async () => {
    mocks.carMeta.mockResolvedValue({ generatedAt: 'g1' })
    mocks.carFind.mockReturnValue(
      chain([{ ...car('fb-1234567'), currencyInferred: true }, car('ml-MLU100001')])
    )
    const inventory = await readListingAlertInventory('car-search')
    expect(inventory.ids).toEqual(['car:fb-1234567', 'car:ml-MLU100001'])
    expect([...(inventory.prices?.keys() ?? [])]).toEqual(['car:ml-MLU100001'])
  })
  it('refuses a scan during which the catalogue was republished', async () => {
    mocks.carMeta.mockResolvedValueOnce({ generatedAt: 'g1' }).mockResolvedValueOnce({
      generatedAt: 'g2',
    })
    mocks.carFind.mockReturnValue(chain([car('ml-MLU100001')]))
    await expect(readListingAlertInventory('car-search')).rejects.toThrow(/changed/)
  })
  it('refuses an empty catalogue and a missing one', async () => {
    mocks.saleMeta.mockResolvedValue({ generatedAt: 'g1' })
    mocks.saleFind.mockReturnValue(chain([]))
    await expect(readListingAlertInventory('sale-search')).rejects.toThrow()
    mocks.motoMeta.mockResolvedValue(null)
    await expect(readListingAlertInventory('moto-search')).rejects.toThrow()
  })
})

describe('listing alert matching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('runs the directory filter restricted to the candidate keys', async () => {
    mocks.carMeta.mockResolvedValue({ generatedAt: 'g1', meta: { key: 'uy-cars', freshDays: 4 } })
    let filter: Record<string, unknown> = {}
    mocks.carFind.mockImplementation((query: Record<string, unknown>) => {
      filter = query
      return chain([car('ml-MLU100001')])
    })
    const found = await matchListingAlertCandidates(
      'car-search',
      { brand: 'citroen', yearMin: '2010' },
      ['car:ml-MLU100001', 'car:ml-MLU100002'],
      now
    )
    expect(found.map(row => row.id)).toEqual(['car:ml-MLU100001'])
    expect(filter).toMatchObject({
      brandSlug: 'citroen',
      year: { $gte: 2010 },
      key: { $in: ['ml-MLU100001', 'ml-MLU100002'] },
      lastSeen: { $gte: '2026-10-13T12:00:00.000Z' },
    })
  })
  it('matches sales through the directory pipeline with the candidate keys', async () => {
    mocks.saleMeta.mockResolvedValue({ generatedAt: 'g1', usdUyu: 40 })
    let stages: Array<Record<string, unknown>> = []
    mocks.saleAggregate.mockImplementation((pipeline: Array<Record<string, unknown>>) => {
      stages = pipeline
      return chain([
        {
          key: 'infocasas-1',
          title: 'Casa',
          price: { amount: 100000, currency: 'USD' },
          propertyType: 'casa',
          department: 'Canelones',
        },
      ])
    })
    const found = await matchListingAlertCandidates(
      'sale-search',
      { department: 'Canelones' },
      ['sale:infocasas-1'],
      now
    )
    expect(found.map(row => row.id)).toEqual(['sale:infocasas-1'])
    expect(JSON.stringify(stages)).toContain('"infocasas-1"')
    expect(JSON.stringify(stages)).toContain('Canelones')
  })
  it('ignores ids of other kinds and malformed keys without querying', async () => {
    expect(
      await matchListingAlertCandidates('car-search', {}, ['moto:ml-1', 'car:bad key'], now)
    ).toEqual([])
    expect(mocks.carFind).not.toHaveBeenCalled()
  })
})
