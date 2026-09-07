// Executes the actual map route against read-only Mongo $documents fixtures; never writes rows.
import mongoose from 'mongoose'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RentalMapResponse } from '../../utils/rentals'

const state = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  pipelines: [] as Array<Array<Record<string, any>>>,
  mapRows: [] as Array<Record<string, any>>,
  run: async (_pipeline: Array<Record<string, any>>, _collation: Record<string, unknown>) =>
    [] as Array<Record<string, any>>,
}))
vi.mock('../../server/models/RentalListing', () => ({
  RentalListingModel: {
    aggregate: (pipeline: Array<Record<string, any>>) => ({
      collation: async (collation: Record<string, unknown>) => {
        state.pipelines.push(pipeline)
        const rows = await state.run(pipeline, collation)
        if (pipeline.some(stage => stage.$sort)) state.mapRows = rows
        return rows
      },
    }),
  },
}))
vi.mock('../../server/models/RentalMeta', () => ({
  RentalMetaModel: { findOne: () => ({ select: () => ({ lean: async () => ({ usdUyu: 40 }) }) }) },
}))
vi.mock('../../server/utils/db', () => ({ connectDb: async () => {} }))
vi.mock('../../server/utils/rentalAvailability', () => ({
  loadRentalAvailabilityIndex: async () => ({ excludedAdvertIds: () => [], byAdvertId: new Map() }),
}))

const uri = process.env.RENTALS_TEST_MONGO_URI
describe.skipIf(!uri)('map projection and ordering in actual route (read-only Mongo)', () => {
  let client: mongoose.mongo.MongoClient
  let handler: (event: any) => Promise<RentalMapResponse>
  let fixtures: Array<Record<string, unknown>> = []
  const today = new Date().toISOString()
  const day = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString()
  const advert = (id: string, price: number, extra = {}) => ({
    source: 'infocasas',
    listingId: id,
    url: `https://www.infocasas.com.uy/fixture/${id}`,
    title: 'Alquiler mensual',
    price,
    priceUyu: price,
    currency: 'UYU',
    commonExpenses: 1000,
    commonExpensesCurrency: 'UYU',
    sellerType: 'inmobiliaria',
    lastSeen: today,
    firstSeen: today,
    publishedAt: today,
    details: { description: 'PRIVATE_RICH '.repeat(2000), images: ['PRIVATE_GALLERY'] },
    identity: { description: 'PRIVATE_IDENTITY '.repeat(2000) },
    ...extra,
  })
  const property = (
    key: string,
    price: number,
    area: number,
    age: number,
    offers = [advert(key, price)]
  ) => ({
    key,
    title: 'Vivienda de prueba',
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    latitude: -34.9,
    longitude: -56.17,
    bedrooms: 1,
    area,
    price,
    priceUyu: price,
    currency: 'UYU',
    freshAt: day(age),
    lastSeen: today,
    privateContact: 'PRIVATE_CONTACT',
    offers: offers.map(offer => ({ ...offer, publishedAt: day(age) })),
  })
  beforeAll(async () => {
    client = new mongoose.mongo.MongoClient(uri!, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 1,
    })
    await client.connect()
    state.run = (pipeline, collation) =>
      client
        .db()
        .aggregate([{ $documents: fixtures }, ...pipeline], { collation, maxTimeMS: 10000 })
        .toArray()
    vi.stubGlobal('defineEventHandler', (callback: unknown) => callback)
    vi.stubGlobal('getQuery', () => state.query)
    vi.stubGlobal('setResponseHeader', () => {})
    vi.stubGlobal('createError', (value: any) =>
      Object.assign(new Error(value.statusMessage), value)
    )
    handler = (await import('../../server/api/rentals/mapa.get')).default
  })
  afterAll(async () => {
    await client?.close()
    vi.unstubAllGlobals()
  })
  beforeEach(() => {
    state.pipelines = []
    state.mapRows = []
    state.query = {}
  })

  it.each([
    ['precio', ['a', 'd', 'c', 'b']],
    ['precio-desc', ['b', 'c', 'a', 'd']],
    ['metros', ['c', 'b', 'a', 'd']],
    ['recientes', ['c', 'a', 'd', 'b']],
    ['total', ['a', 'd', 'c', 'b']],
  ])('preserves %s sorting and ties after discarding rich/private fields', async (sort, keys) => {
    fixtures = [
      property('a', 10000, 40, 1),
      property('b', 20000, 80, 3),
      property('c', 15000, 80, 0),
      property('d', 10000, 40, 2),
    ]
    state.query = { sort }
    const result = await handler({})
    expect(result.points.map(point => point.key)).toEqual(keys)
    expect([result.total, result.located, result.shown]).toEqual([4, 4, 4])
    const stages = state.pipelines.find(pipeline => pipeline.some(stage => stage.$sort))!
    const projected = stages.findIndex(stage => stage.$project)
    expect(projected).toBeLessThan(stages.findIndex(stage => stage.$sort))
    expect(stages[projected].$project).toMatchObject({ key: 1, area: 1, priceUyu: 1, freshAt: 1 })
    expect(JSON.stringify(state.mapRows)).not.toContain('PRIVATE_')
    expect(JSON.stringify(fixtures).length / JSON.stringify(state.mapRows).length).toBeGreaterThan(
      20
    )
    expect(result.points[0]).not.toHaveProperty('priceUyu')
    expect(result.points[0]).not.toHaveProperty('freshAt')
  })

  it('keeps source, currency, owner and monthly costs on one advert before projection/sort', async () => {
    fixtures = [
      property('eligible', 20000, 40, 0, [
        advert('low-headline', 500, {
          priceUyu: 20000,
          currency: 'USD',
          sellerType: 'particular',
          commonExpenses: null,
        }),
        advert('selected', 750, {
          source: 'casasweb',
          url: 'https://casasweb.com/fixture-selected',
          priceUyu: 30000,
          currency: 'USD',
          sellerType: 'particular',
          ownerDirect: {
            declared: true,
            evidence: 'advert_text',
            sourceUrl: 'https://casasweb.com/fixture-selected',
            observedAt: today,
          },
          commonExpenses: 100,
          commonExpensesCurrency: 'USD',
        }),
        advert('agency', 625, {
          source: 'casasweb',
          priceUyu: 25000,
          currency: 'USD',
          commonExpenses: 0,
        }),
      ]),
      property('cheaper', 28000, 40, 0, [
        advert('cheaper', 700, {
          source: 'casasweb',
          url: 'https://casasweb.com/fixture-cheaper',
          ownerDirect: {
            declared: true,
            evidence: 'advert_text',
            sourceUrl: 'https://casasweb.com/fixture-cheaper',
            observedAt: today,
          },
          priceUyu: 28000,
          currency: 'USD',
          sellerType: 'particular',
        }),
      ]),
      property('different-adverts-cannot-combine', 10000, 40, 0, [
        advert('wrong-source', 250, { priceUyu: 10000, currency: 'USD', sellerType: 'particular' }),
        advert('wrong-owner', 700, { source: 'casasweb', priceUyu: 28000, currency: 'USD' }),
      ]),
    ]
    state.query = {
      source: 'casasweb',
      currency: 'USD',
      dueno: '1',
      monthlyMax: '35000',
      expensesMax: '4500',
      sort: 'precio',
    }
    const result = await handler({})
    expect(result.points.map(point => point.key)).toEqual(['cheaper', 'eligible'])
    expect(result.points[1]).toMatchObject({
      price: 750,
      currency: 'USD',
      url: 'https://casasweb.com/fixture-selected',
    })
    expect(state.mapRows.find(row => row.key === 'eligible')?.priceUyu).toBe(30000)
    expect(JSON.stringify(result)).not.toContain('PRIVATE_')
  })

  it('keeps own advertised conditions through the slim projection and chooses the same map price/link', async () => {
    const terms = { petsAllowed: true, furnished: true, parkingSpaces: 1, guarantees: ['anda'] }
    fixtures = [
      property('eligible', 18000, 40, 0, [
        advert('cheap', 18000),
        advert('selected', 22000, terms),
      ]),
      property('split', 15000, 40, 0, [
        advert('pets-only', 15000, { petsAllowed: true, guarantees: ['anda'] }),
        advert('furnished-only', 18000, { furnished: true, parkingSpaces: 1 }),
      ]),
    ]
    state.query = {
      pets: '1',
      furnished: '1',
      parking: '1',
      garantia: 'contaduria,anda',
      sort: 'precio',
    }
    const result = await handler({})
    expect([result.total, result.located, result.shown]).toEqual([1, 1, 1])
    expect(result.points[0]).toMatchObject({
      key: 'eligible',
      price: 22000,
      url: 'https://www.infocasas.com.uy/fixture/selected',
    })
    state.query.priceMax = '20000'
    expect((await handler({})).points).toEqual([])
  })

  it('shows the selected monthly-total advert and keeps homes with unknown expenses last', async () => {
    fixtures = [
      property('known', 18000, 40, 0, [
        advert('base-cheaper', 18000, { commonExpenses: 8000 }),
        advert('total-cheaper', 20000, { commonExpenses: 0 }),
      ]),
      property('unknown', 9000, 40, 0, [advert('unknown', 9000, { commonExpenses: null })]),
      property('next', 19000, 40, 0, [advert('next', 19000, { commonExpenses: 2000 })]),
    ]
    state.query = { sort: 'total' }
    const result = await handler({})
    expect(result.points.map(point => point.key)).toEqual(['known', 'next', 'unknown'])
    expect(result.points[0]).toMatchObject({
      price: 20000,
      url: 'https://www.infocasas.com.uy/fixture/total-cheaper',
    })
    expect(result.points).toHaveLength(3)
    expect(JSON.stringify(result)).not.toContain('_rentalMonthly')
  })
})
