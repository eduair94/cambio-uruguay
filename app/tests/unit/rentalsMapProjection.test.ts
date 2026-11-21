// Executes the actual map route against read-only Mongo $documents fixtures; never writes rows.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import mongoose from 'mongoose'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { rentalDistanceProjection } from '../../utils/rentalDistance'
import {
  RENTAL_SORTS,
  normalizeRentalQuery,
  rentalMatchingOffer,
  rentalMongoSort,
  type RentalMapResponse,
} from '../../utils/rentals'

const state = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  pipelines: [] as Array<Array<Record<string, any>>>,
  mapRows: [] as Array<Record<string, any>>,
  sortDiskUse: undefined as boolean | undefined,
  run: async (
    _pipeline: Array<Record<string, any>>,
    _collation: Record<string, unknown>,
    _options: { allowDiskUse?: boolean }
  ) => [] as Array<Record<string, any>>,
}))
vi.mock('../../server/models/RentalListing', () => ({
  RentalListingModel: {
    aggregate: (pipeline: Array<Record<string, any>>) => {
      const options: { allowDiskUse?: boolean } = {}
      const chain = {
        allowDiskUse: (enabled: boolean) => {
          options.allowDiskUse = enabled
          return chain
        },
        option: () => chain,
        collation: async (collation: Record<string, unknown>) => {
          state.pipelines.push(pipeline)
          const rows = await state.run(pipeline, collation, options)
          // The points pass: one `$facet` document, its `points` branch sorted and capped.
          if (pipeline.some(stage => stage.$facet)) {
            state.mapRows = rows[0]?.points ?? []
            state.sortDiskUse = options.allowDiskUse
          }
          return rows
        },
      }
      return chain
    },
  },
}))
// Every test here changes rows or fixtures under the same queries: no memo between them.
vi.mock('../../server/utils/rentalMemo', async original => {
  const memo = await original<typeof import('../../server/utils/rentalMemo')>()
  return { ...memo, rentalMemo: memo.createRentalMemo({ enabled: () => false }) }
})
vi.mock('../../server/models/RentalMeta', () => ({
  RentalMetaModel: { findOne: () => ({ select: () => ({ lean: async () => ({ usdUyu: 40 }) }) }) },
}))
vi.mock('../../server/utils/db', () => ({ connectDb: async () => {} }))
vi.mock('../../server/utils/rentalAvailability', () => ({
  loadRentalAvailabilityIndex: async () => ({ excludedAdvertIds: () => [], byAdvertId: new Map() }),
}))

// Mongo sorts a field the projection dropped as null, without an error: every row ties and the map
// silently falls to the next key. Until 2026-11-20 "baja" sorted the map on `priceDrop.pct`, which
// it never projected, and "precio-m2" on per-m² fields it never computed. No database needed.
describe('map sort keys survive the slim projection', () => {
  let handler: (event: any) => Promise<RentalMapResponse>
  beforeAll(async () => {
    state.run = async () => []
    vi.stubGlobal('defineEventHandler', (callback: unknown) => callback)
    vi.stubGlobal('getQuery', () => state.query)
    vi.stubGlobal('setResponseHeader', () => {})
    vi.stubGlobal('createError', (value: any) =>
      Object.assign(new Error(value.statusMessage), value)
    )
    handler = (await import('../../server/api/rentals/mapa.get')).default
  })
  afterAll(() => vi.unstubAllGlobals())

  // The points pass ends in ONE `$facet`: `located` counts every row of the search, `points`
  // sorts and caps them. The sort lives in that branch, after the slim `$project`.
  const sortedPass = async (query: Record<string, unknown>) => {
    state.pipelines = []
    state.query = query
    await handler({})
    const pipeline = state.pipelines.find(stages => stages.some(stage => stage.$facet))!
    const facetAt = pipeline.findIndex(stage => stage.$facet)
    const projectAt = pipeline.findLastIndex((stage, index) => index < facetAt && stage.$project)
    const facet = pipeline[facetAt]!.$facet as Record<string, Array<Record<string, any>>>
    return { pipeline, facetAt, projectAt, facet, sort: facet.points![0]!.$sort }
  }

  const sortQuery = (sort: string) =>
    sort === 'distancia' ? { sort, refLat: '-34.9', refLng: '-56.17' } : { sort }

  it.each(RENTAL_SORTS.map(option => option.value))(
    'computes or projects every %s sort key before the sort',
    async sort => {
      const query = sortQuery(sort)
      const { pipeline, facetAt, projectAt, sort: sortStage } = await sortedPass(query)
      expect(projectAt).toBeGreaterThanOrEqual(0)
      const keys = Object.keys(sortStage)
      expect(sortStage).toEqual(rentalMongoSort(normalizeRentalQuery(query).sort))
      const projection = pipeline[projectAt]!.$project as Record<string, unknown>
      const setIn = (stages: Array<Record<string, any>>) =>
        stages.flatMap(stage => Object.keys(stage.$set ?? stage.$addFields ?? {}))
      const setBefore = setIn(pipeline.slice(0, projectAt))
      const setAfter = setIn(pipeline.slice(projectAt + 1, facetAt))
      for (const key of keys) {
        const paths = key.split('.').map((_, i, parts) => parts.slice(0, i + 1).join('.'))
        const computed = typeof projection[key] === 'object' && projection[key] !== null
        // A stored field only has to be kept; a temporary `_rental*` one also has to be computed.
        const kept =
          computed ||
          (paths.some(path => projection[path] === 1) &&
            (!key.startsWith('_rental') || setBefore.includes(key)))
        expect(kept || setAfter.includes(key), `${sort}: ${key}`).toBe(true)
      }
    }
  )

  it('keeps the size of the drop for "baja" and computes per-m² on the chosen advert', async () => {
    const baja = await sortedPass({ sort: 'baja' })
    expect(baja.pipeline[baja.projectAt]!.$project['priceDrop.pct']).toBe(1)

    // An offer filter, so `rentalOfferStages` really chooses an advert: without one it returns no
    // stage, `chosen` is -1 and the order of the two steps would go unchecked.
    const perM2 = await sortedPass({ sort: 'precio-m2', pets: '1' })
    const computed = perM2.pipeline.findIndex(stage => stage.$set?._rentalPricePerM2)
    const chosen = perM2.pipeline.findLastIndex(stage => stage.$set?.priceUyu)
    expect(chosen).toBeGreaterThanOrEqual(0)
    expect(computed).toBeGreaterThan(chosen)
    expect(computed).toBeLessThan(perM2.projectAt)
  })

  it('computes the "más recientes" tier, hour and mix in the projection, not on whole documents', async () => {
    const { pipeline, projectAt } = await sortedPass({})
    const projection = pipeline[projectAt]!.$project
    expect(projection._rentalTier).toHaveProperty('$cond')
    expect(projection._rentalHour).toHaveProperty('$trunc')
    expect(projection._rentalMix).toEqual({ $toHashedIndexKey: '$key' })
    for (const field of ['_rentalTier', '_rentalHour', '_rentalMix'])
      expect(pipeline.slice(0, projectAt).some(stage => stage.$set?.[field])).toBe(false)
  })

  // A marker needs its key, its point, its price and its barrio; the offer Mongo chose gives the
  // price and the advert id the availability reports hang on. Bedrooms, area, the offer count and
  // the link were 47.7 % of the bytes and nothing on the page read them (spec P4).
  const MARKER_FIELDS = [
    'key',
    'latitude',
    'longitude',
    'neighborhood',
    'price',
    'currency',
    'matchingOffer.price',
    'matchingOffer.currency',
    'matchingOffer.source',
    'matchingOffer.listingId',
  ]

  it.each(RENTAL_SORTS.map(option => option.value))(
    'projects the marker fields, the distance and the %s sort keys, and nothing else',
    async sort => {
      for (const query of [
        sortQuery(sort),
        { ...sortQuery(sort), refLat: '-34.9', refLng: '-56.17' },
      ]) {
        const { pipeline, projectAt } = await sortedPass(query)
        const normalized = normalizeRentalQuery(query)
        const projection = pipeline[projectAt]!.$project as Record<string, unknown>
        expect(projection._id).toBe(0)
        expect(new Set(Object.keys(projection))).toEqual(
          new Set([
            '_id',
            ...MARKER_FIELDS,
            ...Object.keys(rentalDistanceProjection(normalized)),
            ...Object.keys(rentalMongoSort(normalized.sort)),
          ])
        )
        for (const field of MARKER_FIELDS) expect(projection[field], field).toBe(1)
      }
    }
  )

  it('counts the located homes and caps the points in the same pass', async () => {
    const { pipeline, facetAt, facet } = await sortedPass({ sort: 'precio' })
    // The `$facet` is the last stage: nothing runs on its one output document.
    expect(facetAt).toBe(pipeline.length - 1)
    expect(Object.keys(facet).sort()).toEqual(['located', 'points'])
    expect(facet.located).toEqual([{ $count: 'n' }])
    expect(facet.points).toHaveLength(2)
    const limit = facet.points![1]!.$limit as number
    // One `$facet` output is one document (16 MB): 3,000 marker rows with their sort keys were
    // 1.07 MB on production. Raising the cap past 5,000 needs this test raised, on purpose.
    expect(limit).toBeLessThanOrEqual(5000)
    state.pipelines = []
    expect((await handler({})).limit).toBe(limit)
  })

  it('never re-chooses the offer in JavaScript', () => {
    // The point's price is Mongo's `matchingOffer`, the offer the list card shows.
    const source = readFileSync(join(__dirname, '../../server/api/rentals/mapa.get.ts'), 'utf8')
    expect(source).not.toContain('rentalMatchingOffer')
  })
})

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
    state.run = (pipeline, collation, options) =>
      client
        .db()
        .aggregate([{ $documents: fixtures }, ...pipeline], {
          collation,
          maxTimeMS: 10000,
          allowDiskUse: options.allowDiskUse ?? false,
        })
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
    state.sortDiskUse = undefined
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
    expect(state.sortDiskUse).toBe(true)
    expect(result.points.map(point => point.key)).toEqual(keys)
    expect([result.total, result.located, result.shown]).toEqual([4, 4, 4])
    const stages = state.pipelines.find(pipeline => pipeline.some(stage => stage.$facet))!
    const projected = stages.findIndex(stage => stage.$project)
    expect(projected).toBeLessThan(stages.findIndex(stage => stage.$facet))
    expect(stages[projected].$project).toMatchObject({
      key: 1,
      latitude: 1,
      longitude: 1,
      'matchingOffer.price': 1,
    })
    expect(JSON.stringify(state.mapRows)).not.toContain('PRIVATE_')
    expect(JSON.stringify(fixtures).length / JSON.stringify(state.mapRows).length).toBeGreaterThan(
      20
    )
    for (const point of result.points)
      expect(Object.keys(point).sort()).toEqual(
        ['currency', 'key', 'lat', 'lng', 'neighborhood', 'price'].sort()
      )
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
    // The selected advert's price, not the cheaper `low-headline` one of another portal.
    expect(result.points[1]).toMatchObject({ price: 750, currency: 'USD' })
    expect(state.mapRows.find(row => row.key === 'eligible')?.priceUyu).toBe(30000)
    expect(JSON.stringify(result)).not.toContain('PRIVATE_')
  })

  it('keeps own advertised conditions through the slim projection and chooses the same map price', async () => {
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
    // The pets offer (22,000), not the cheaper `cheap` one (18,000) without pets.
    expect(result.points[0]).toMatchObject({ key: 'eligible', price: 22000 })
    state.query.priceMax = '20000'
    expect((await handler({})).points).toEqual([])
  })

  // The one filter where the map before 2026-11-20 and this one differ, on purpose: the old JS
  // mapper chose among offers projected WITHOUT `stayPriceSuspect`, so with "sinNoche" it still
  // pinned the per-night price. Mongo's `matchingOffer` sees the flag, as the list card does.
  it('with sinNoche pins the monthly advert, not a cheaper per-night one, as the list does', async () => {
    const offers = [
      advert('per-night', 2000, { stayPriceSuspect: true }),
      advert('monthly', 750, { priceUyu: 30000, currency: 'USD' }),
    ]
    fixtures = [property('home', 2000, 40, 0, offers)]
    state.query = { sinNoche: '1' }
    const result = await handler({})
    expect([result.total, result.located, result.shown]).toEqual([1, 1, 1])
    expect(result.points[0]).toMatchObject({ key: 'home', price: 750, currency: 'USD' })
    // The same advert the list's rule picks over the FULL offers (flag included).
    const listOffer = rentalMatchingOffer(offers as never, normalizeRentalQuery(state.query), 40)
    expect(listOffer).toMatchObject({ listingId: 'monthly' })
    expect(result.points[0]).toMatchObject({
      price: listOffer!.price,
      currency: listOffer!.currency,
    })
    // Without the filter the per-night advert is the cheapest and stays the headline.
    state.query = {}
    expect((await handler({})).points[0]).toMatchObject({ price: 2000, currency: 'UYU' })
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
    // The advert with the lower monthly total (20,000 + 0), not the lower rent (18,000 + 8,000).
    expect(result.points[0]).toMatchObject({ price: 20000 })
    expect(result.points).toHaveLength(3)
    expect(JSON.stringify(result)).not.toContain('_rentalMonthly')
  })

  it('orders map points from a chosen reference with the same filters and no leaked coordinate evidence', async () => {
    const home = (key: string, latitude: number, extra = {}) => ({
      ...property(key, 20000, 40, 0, [
        advert(key, 20000, {
          petsAllowed: true,
          identity: { version: 1, latitude, longitude: -56.17, description: 'PRIVATE_OWN_POINT' },
        }),
      ]),
      latitude,
      ...extra,
    })
    fixtures = [
      home('far', -34.8),
      home('near-b', -34.899),
      home('near-a', -34.899),
      home('unknown-point', -34.9, { offers: [advert('legacy', 20000, { petsAllowed: true })] }),
      home('unlocated', -34.9, { latitude: null }),
      home('office', -34.9, { propertyType: 'oficina' }),
    ]
    state.query = {
      sort: 'distancia',
      refLat: '-34.9',
      refLng: '-56.17',
      type: 'vivienda',
      pets: '1',
    }
    const result = await handler({})
    expect(result.points.map(point => point.key)).toEqual([
      'near-a',
      'near-b',
      'far',
      'unknown-point',
    ])
    expect([result.total, result.located, result.shown]).toEqual([5, 4, 4])
    expect(result.points[0]!.distanceKm).toBeCloseTo(0.111195, 5)
    expect(result.points[3]!.distanceKm).toBeNull()
    const pipeline = state.pipelines.find(rows => rows.some(stage => stage.$facet))!
    expect(pipeline.findIndex(stage => stage.$set?.distanceKm)).toBeLessThan(
      pipeline.findIndex(stage => stage.$project)
    )
    const points = pipeline.find(stage => stage.$facet)!.$facet.points as Array<Record<string, any>>
    expect(points.findIndex(stage => stage.$sort)).toBe(0)
    expect(points.findIndex(stage => stage.$limit)).toBe(1)
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|identity|_rentalDistance/)

    state.query.sort = 'precio'
    expect(
      (await handler({})).points.find(point => point.key === 'far')!.distanceKm
    ).toBeGreaterThan(10)
  })
})
