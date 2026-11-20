import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import mongoose from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as rentals from '../../utils/rentals'
import * as rentalBarrioOption from '../../utils/rentalBarrioOption'
import * as rentalDistance from '../../utils/rentalDistance'
import * as rentalPricePerM2 from '../../utils/rentalPricePerM2'
import { rentalPublicPropertyProjection } from '../../server/utils/rentalDetail'
import * as rentalGalleryPreview from '../../server/utils/rentalGalleryPreview'

type Stage = Record<string, any>
const route = readFileSync(join(__dirname, '../../server/api/rentals/index.get.ts'), 'utf8')
const compiled = ts.transpileModule(route, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

/** Execute the actual endpoint with IO stubs, retaining its exact Mongo pipelines. */
async function capture(
  query: Record<string, string> = {},
  total = 240,
  neighborhoods: Array<{ _id: string; count: number }> = []
) {
  const pipelines: Stage[][] = []
  const options: Array<{ allowDiskUse?: boolean }> = []
  const dependencies: Record<string, unknown> = {
    '../../models/RentalListing': {
      RentalListingModel: {
        aggregate: (pipeline: Stage[]) => {
          pipelines.push(pipeline)
          const execution: { allowDiskUse?: boolean } = {}
          options.push(execution)
          const chain = {
            allowDiskUse: (enabled: boolean) => {
              execution.allowDiskUse = enabled
              return chain
            },
            collation: () => {
              const facet = pipeline.find(stage => stage.$facet)?.$facet
              // The count, and the barrio counts when their filter is the search's own, are
              // branches of the facet pass.
              return Promise.resolve(
                facet
                  ? [{ total: [{ total }], ...(facet.neighborhoods ? { neighborhoods } : {}) }]
                  : pipeline.some(stage => stage.$group?._id === '$neighborhood')
                    ? neighborhoods
                    : []
              )
            },
          }
          return chain
        },
      },
    },
    '../../models/RentalMeta': {
      RentalMetaModel: {
        findOne: () => ({ select: () => ({ lean: async () => ({ usdUyu: 40 }) }) }),
      },
    },
    '../../utils/db': { connectDb: async () => {} },
    '../../utils/cachedResponseHeader': { setHeaderUnlessSent: () => true },
    '../../utils/rentalZoneServices': { loadRentalServiceZoneIds: async () => [] },
    '../../utils/rentalCoverage': { getRentalCoverage: async () => [] },
    '../../utils/rentalDirectoryWarm': { rentalDirectoryCacheKey: () => 'default' },
    '../../utils/rentalDetail': { rentalPublicPropertyProjection },
    '../../utils/rentalGalleryPreview': rentalGalleryPreview,
    '../../utils/rentalAvailability': {
      loadRentalAvailabilityIndex: async () => ({ excludedAdvertIds: () => [] }),
      annotateRentalAvailability: (property: unknown) => property,
    },
    '../../../utils/rentals': rentals,
    '../../../utils/rentalBarrioOption': rentalBarrioOption,
    '../../../utils/rentalDistance': rentalDistance,
    '../../../utils/rentalPricePerM2': rentalPricePerM2,
  }
  const module = { exports: {} as { default?: (event: unknown) => Promise<unknown> } }
  runInNewContext(compiled, {
    exports: module.exports,
    module,
    require: (id: string) => {
      if (!(id in dependencies)) throw new Error(`Unexpected route dependency: ${id}`)
      return dependencies[id]
    },
    defineEventHandler: (handler: unknown) => handler,
    // El directorio es un memo de Nitro desde 2026-09-22; acá interesan los pipelines, no la caché.
    defineCachedEventHandler: (handler: unknown) => handler,
    setResponseHeader: () => {},
    getQuery: () => query,
    createError: ({ statusMessage }: { statusMessage: string }) => new Error(statusMessage),
    console,
  })
  const response = (await module.exports.default!({})) as rentals.RentalsResponse
  // The median is a branch of the facet pass (rentalMedianFacet), not a seventh aggregation.
  const facets = pipelines.find(pipeline => pipeline.some(stage => stage.$facet))!
  const median = facets.find(stage => stage.$facet)!.$facet.median as Stage[]
  return {
    response,
    items: pipelines[0]!,
    median,
    facets,
    itemsOptions: options[0]!,
    count: pipelines.length,
    pipelines,
  }
}

describe('rental endpoint sort input', () => {
  it.each(['precio', 'precio-desc', 'metros', 'recientes', 'total', 'precio-m2', 'baja'])(
    'retains every %s sort key while removing private evidence before buffering',
    async sort => {
      const query = { sort, source: 'casasweb' }
      const { items, median, itemsOptions } = await capture(query)
      expect(itemsOptions.allowDiskUse).toBe(true)
      for (const pipeline of [items, median]) {
        const projection = pipeline.findIndex(stage => stage.$project)
        expect(projection).toBeGreaterThanOrEqual(0)
        expect(projection).toBeLessThan(pipeline.findIndex(stage => stage.$sort))
      }
      const projection = items.find(stage => stage.$project)!.$project
      // "Más recientes" sorts on fields computed in this same projection (the homes-first tier and
      // the hash of the key), so the blocking sort never sees the whole document.
      const recentSortFields = rentals.rentalRecentSortProjection(
        rentals.normalizeRentalQuery(query)
      )
      for (const key of Object.keys(rentals.rentalMongoSort(sort as rentals.RentalSort))) {
        // `priceDrop.pct` rides the public `priceDrop`.
        const projected = key === 'priceDrop.pct' ? 'priceDrop' : key
        expect(projection[projected]).toEqual(key in recentSortFields ? recentSortFields[key] : 1)
      }
      expect(projection).toEqual({
        ...rentalPublicPropertyProjection,
        ...recentSortFields,
        ...(sort === 'total'
          ? Object.fromEntries(rentals.RENTAL_TOTAL_SORT_FIELDS.map(field => [field, 1]))
          : {}),
        ...(sort === 'precio-m2'
          ? Object.fromEntries(
              rentalPricePerM2.RENTAL_PRICE_PER_M2_SORT_FIELDS.map(field => [field, 1])
            )
          : {}),
      })
      if (sort === 'total')
        expect(items.at(-1)).toEqual({ $unset: [...rentals.RENTAL_TOTAL_SORT_FIELDS] })
      if (sort === 'recientes' || sort === 'baja')
        expect(items.at(-1)).toEqual({ $unset: [...rentals.RENTAL_RECENT_SORT_FIELDS] })
      else
        expect(JSON.stringify(items)).not.toMatch(
          new RegExp(rentals.RENTAL_RECENT_SORT_FIELDS.join('|'))
        )
      if (sort === 'precio-m2')
        expect(items.at(-1)).toEqual({
          $unset: [...rentalPricePerM2.RENTAL_PRICE_PER_M2_SORT_FIELDS],
        })
      expect(median.find(stage => stage.$project)!.$project).toEqual({ _id: 0, priceUyu: 1 })
    }
  )

  it('takes the median in the facet pass instead of a seventh aggregation over the inventory', async () => {
    // 2026-10-08: the separate pass ran after the other six and cost ~1,4 s of every uncached search.
    const { median } = await capture({ source: 'casasweb' })
    expect(median.at(-2)).toEqual({ $group: { _id: null, prices: { $push: '$priceUyu' } } })
  })

  // 2026-11-13 (CAMBIO-URUGUAY-BACKEND-12): every pass is a full scan of the inventory, and their
  // bursts starved other routes' 4 s queries on the shared mongod. Count, departments and barrios
  // ride the facet pass whenever they would select exactly the search's own properties.
  it('reads the unfiltered directory twice: the page, and one facet pass with every count', async () => {
    for (const query of [{}, { source: 'casasweb' }, { sort: 'precio', page: '3' }]) {
      const { count, facets, response } = await capture(query)
      expect(count).toBe(2)
      const facet = facets.find(stage => stage.$facet)!.$facet
      expect(Object.keys(facet).sort()).toEqual(
        ['departments', 'median', 'neighborhoods', 'price', 'sources', 'total', 'types'].sort()
      )
      expect(facet.total).toEqual([{ $count: 'total' }])
      expect(facet.departments.at(-1)).toEqual({ $limit: 25 })
      expect(facet.neighborhoods.at(-1)).toEqual({ $limit: 5000 })
      expect(response.total).toBe(240)
    }
  })

  it('keeps a separate pass only for a facet that must ignore part of the search', async () => {
    // A department: the department facet still offers the other departments.
    const department = await capture({ department: 'Montevideo' })
    expect(department.count).toBe(3)
    const departments = department.pipelines.find(pipeline =>
      pipeline.some(stage => stage.$group?._id === '$department')
    )!
    expect(departments[0]!.$match).not.toHaveProperty('department')
    const departmentFacet = department.facets.find(stage => stage.$facet)!.$facet
    expect(departmentFacet).not.toHaveProperty('departments')
    expect(departmentFacet).toHaveProperty('neighborhoods')
    expect(department.facets[0]!.$match.department).toBe('Montevideo')

    // And a barrio: the barrio facet still offers the other barrios of that department.
    const barrio = await capture({ department: 'Montevideo', neighborhood: 'Pocitos' })
    expect(barrio.count).toBe(4)
    const barrios = barrio.pipelines.find(pipeline =>
      pipeline.some(stage => stage.$group?._id === '$neighborhood')
    )!
    expect(barrios[0]!.$match.department).toBe('Montevideo')
    expect(barrios[0]!.$match).not.toHaveProperty('neighborhood')
    const barrioFacet = barrio.facets.find(stage => stage.$facet)!.$facet
    expect(barrioFacet).not.toHaveProperty('neighborhoods')
    expect(barrioFacet.total).toEqual([{ $count: 'total' }])
    expect(barrio.response.total).toBe(240)
  })

  it('never offers a surface or a country as a barrio in the facet', async () => {
    // 2026-11-07: Casasweb's '40 m2 40 m2' (49), '60 m2 60 m2' (36), '10 m2' (26) and Maldonado's
    // '4 H' sat between the real Montevideo barrios of the selector.
    const { response } = await capture({ department: 'Montevideo' }, 240, [
      { _id: 'Pocitos', count: 900 },
      { _id: '40 m2 40 m2', count: 49 },
      { _id: '25 de Mayo', count: 12 },
      { _id: '10 m2', count: 26 },
      { _id: '4 H', count: 3 },
      { _id: 'Uruguay', count: 2 },
    ])
    expect(response.facets.neighborhoods).toEqual([
      { value: 'Pocitos', count: 900 },
      { value: '25 de Mayo', count: 12 },
    ])
  })

  it('reads 5,000 barrios and offers the first 250 that are neither surfaces nor addresses', async () => {
    // 2026-11-08: the cut ran before the filter, so dropped names took places in what was read.
    // Reading 1,000 still left out every Montevideo barrio with one advert (Retiro, Chacarita):
    // Casasweb's surfaces alone made over 1,000 distinct names.
    const junk = Array.from({ length: 60 }, (_, i) => ({ _id: `Calle ${100 + i}`, count: 500 - i }))
    const places = Array.from({ length: 260 }, (_, i) => ({
      _id: `Paraje ${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}`,
      count: 400 - i,
    }))
    const { response, facets } = await capture({ department: 'Montevideo' }, 240, [
      ...junk,
      ...places,
    ])
    // With no barrio chosen the barrio counts are a branch of the facet pass.
    const barrios = facets.find(stage => stage.$facet)!.$facet.neighborhoods as Stage[]
    expect(barrios.at(-1)).toEqual({ $limit: 5000 })
    expect(response.facets.neighborhoods).toEqual(
      places.slice(0, 250).map(row => ({ value: row._id, count: row.count }))
    )
  })

  it('never offers a street address as a barrio in the facet', async () => {
    // 2026-11-08: 68 of Maldonado's 205 options were Mercado Libre addresses ("Sarandí 888, Maldonado"
    // keeps the street where the barrio goes) and portal filler.
    const { response } = await capture({ department: 'Maldonado' }, 240, [
      { _id: 'Punta del Este', count: 2929 },
      { _id: 'ruta 39', count: 14 },
      { _id: 'Av. Leandro Gómez', count: 4 },
      { _id: 'Pda. 37 Mansa', count: 2 },
      { _id: 'Otras', count: 6 },
      { _id: 'Sarandí 888', count: 1 },
      { _id: '25 De Mayo Esquina Yerbal', count: 1 },
      { _id: 'Leandro Gomez', count: 1 },
      { _id: '18 De Julio', count: 1 },
    ])
    expect(response.facets.neighborhoods).toEqual([
      { value: 'Punta del Este', count: 2929 },
      { value: 'Leandro Gomez', count: 1 },
      { value: '18 De Julio', count: 1 },
    ])
  })

  it('prices per m² with the advert chosen by the filters, before projecting and paging', async () => {
    const { items, median } = await capture({ sort: 'precio-m2', source: 'casasweb', page: '2' })
    const priced = items.findLastIndex(stage => stage.$set?.priceUyu)
    const perM2 = items.findIndex(stage => stage.$set?._rentalPricePerM2)
    const unknown = items.findIndex(stage => stage.$set?._rentalPricePerM2Unknown)
    const projection = items.findIndex(stage => stage.$project)
    const page = items.findIndex(stage => stage.$skip !== undefined)
    expect(priced).toBeGreaterThan(0)
    expect(perM2).toBeGreaterThan(priced)
    expect(unknown).toBe(perM2 + 1)
    expect(projection).toBeGreaterThan(unknown)
    expect(page).toBeGreaterThan(projection)
    expect(items[perM2]!.$set._rentalPricePerM2).toEqual(
      rentalPricePerM2.rentalPricePerM2Expression()
    )
    // Sorting alone must not move the rent median of the same search.
    expect(median).toEqual((await capture({ sort: 'precio', source: 'casasweb' })).median)
  })

  it('preserves the same base-rent median when only the presentation sort changes', async () => {
    const base = await capture({ sort: 'precio', pets: '1' })
    const monthly = await capture({ sort: 'total', pets: '1' })
    expect(monthly.median).toEqual(base.median)
  })

  it('computes distance before projecting and paging while excluding location evidence from the sort buffer', async () => {
    const { items, median } = await capture({
      sort: 'distancia',
      refLat: '-34.9',
      refLng: '-56.17',
      page: '3',
      pets: '1',
    })
    const distance = items.findIndex(stage => stage.$set?.distanceKm)
    const projection = items.findIndex(stage => stage.$project)
    const sort = items.findIndex(stage => stage.$sort)
    const page = items.findIndex(stage => stage.$skip)
    expect(distance).toBeGreaterThan(0)
    expect(distance).toBeLessThan(projection)
    expect(projection).toBeLessThan(sort)
    expect(sort).toBeLessThan(page)
    expect(items[projection]!.$project).toEqual({
      ...rentalPublicPropertyProjection,
      distanceKm: 1,
      _rentalDistanceUnknown: 1,
    })
    expect(items[sort]!.$sort).toEqual({ _rentalDistanceUnknown: 1, distanceKm: 1, key: 1 })
    expect(items.at(-1)).toEqual({ $unset: ['_rentalDistanceUnknown'] })
    expect(median).toEqual((await capture({ pets: '1' })).median)
  })
})

// Deliberately exercise the 100MiB boundary only on a developer's isolated localhost Mongo.
// The source documents are generated by $documents/$unwind: no database writes or indexes.
const uri = process.env.RENTALS_SORT_TEST_MONGO_URI
describe.skipIf(!uri)('real Mongo rental sort memory regression', () => {
  let client: mongoose.mongo.MongoClient
  const date = new Date().toISOString()
  beforeAll(async () => {
    if (!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\//.test(uri || ''))
      throw new Error('Sort memory regression requires an isolated localhost Mongo URI')
    client = new mongoose.mongo.MongoClient(uri!)
    await client.connect()
  })
  afterAll(async () => client?.close())
  const fixtures = (count: number, largeInventory = false): Stage[] => {
    const latitude = largeInventory
      ? {
          $cond: [
            { $eq: [{ $mod: ['$i', 7] }, 0] },
            null,
            { $add: [-34.9, { $divide: [{ $mod: ['$i', 1000] }, 100000] }] },
          ],
        }
      : -34.9
    const title = largeInventory
      ? 'Published advert title '.repeat(100)
      : 'Alquiler mensual sintético'
    const offer = (source: string, offset: number) => ({
      source,
      listingId: { $concat: [source, ':', { $toString: '$i' }] },
      title,
      price: { $add: [10000, '$i', offset] },
      priceUyu: { $add: [10000, '$i', offset] },
      currency: 'UYU',
      lastSeen: date,
      firstSeen: date,
      commonExpenses: 100,
      commonExpensesCurrency: 'UYU',
      identity: { version: 1, description: '$seed', latitude, longitude: -56.17 },
      details: { description: '$seed', images: ['$seed'] },
    })
    return [
      { $documents: [{ seed: 'PRIVATE-'.repeat(largeInventory ? 50 : 40000) }] },
      { $set: { i: { $range: [0, count] } } },
      { $unwind: '$i' },
      {
        $project: {
          _id: 0,
          key: { $concat: ['qa-', { $toString: '$i' }] },
          title: 'Synthetic home',
          propertyType: largeInventory
            ? { $cond: [{ $eq: [{ $mod: ['$i', 2] }, 0] }, 'apartamento', 'oficina'] }
            : 'apartamento',
          department: 'Montevideo',
          neighborhood: 'Cordón',
          lastSeen: date,
          firstSeen: date,
          freshAt: date,
          area: { $add: [40, '$i'] },
          latitude,
          longitude: { $literal: -56.17 },
          offers: [offer('infocasas', 0), offer('casasweb', 2000)],
        },
      },
    ]
  }
  const execute = (count: number, pipeline: Stage[]) =>
    client
      .db()
      .aggregate([...fixtures(count), ...pipeline], {
        allowDiskUse: false,
        collation: rentals.RENTAL_COLLATION,
        maxTimeMS: 30000,
      })
      .toArray()

  /** Position of each key in `$toHashedIndexKey` order, computed by the server under test. */
  const hashRank = async (keys: string[]) => {
    const ordered = await client
      .db()
      .aggregate([
        { $documents: keys.map(key => ({ key })) },
        { $set: { mix: { $toHashedIndexKey: '$key' } } },
        { $sort: { mix: 1 } },
      ])
      .toArray()
    return new Map(ordered.map((row, index) => [String(row.key), index]))
  }

  // NOT COVERED BY CI, AND NEVER RUN ON PRODUCTION'S MONGO: this is the only test that checks the
  // real order of "más recientes", it is skipped without RENTALS_SORT_TEST_MONGO_URI (CI sets none),
  // and its fixtures come in through `$documents`, which needs MongoDB 5.1 or later — production runs
  // 4.4.21, where this test cannot run at all. The 4.4 behaviour was checked once, read-only, on
  // production on 2026-11-20 with the real route pipelines (out/verify2_A.js of that day's workflow:
  // nothing of an older day above a newer one, homes before the rest, deterministic, pages tile).
  it('orders "más recientes" by day, homes first, newest hour, then a fixed mix that is not the price', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    // The ObjectId is when we first saved the property: runs of today at 08:00, 15:00 and 20:00 UTC.
    const savedAt = (hour: number, second: number) =>
      mongoose.mongo.ObjectId.createFromTime(
        Date.parse(`${today}T00:00:00Z`) / 1000 + hour * 3600 + second
      )
    const property = (
      key: string,
      propertyType: string,
      price: number,
      day: string,
      _id: mongoose.mongo.ObjectId
    ) => ({
      _id,
      key,
      title: 'Vivienda de prueba',
      propertyType,
      department: 'Montevideo',
      neighborhood: 'Cordón',
      lastSeen: today,
      firstSeen: day,
      freshAt: day,
      offers: [
        {
          source: 'infocasas',
          listingId: key,
          url: `https://www.infocasas.com.uy/fixture/${key}`,
          title: 'Alquiler mensual',
          price,
          priceUyu: price,
          currency: 'UYU',
          lastSeen: today,
          firstSeen: day,
          publishedAt: day,
          details: { description: 'PRIVATE-' },
        },
      ],
    })
    // Inside each run the price RISES in insertion order: the artefact the ObjectId turned into the
    // order of the first page.
    const savedRun = (hour: number, homes: string[][]) =>
      homes.map(([key, type], i) =>
        property(key!, type!, 20000 + i * 10000, today, savedAt(hour, i))
      )
    const morningHomes = savedRun(8, [
      ['montevideo-cordon-ejemplo-uno', 'apartamento'],
      ['montevideo-cordon-ejemplo-dos', 'casa'],
      ['montevideo-cordon-ejemplo-tres', 'apartamento'],
    ])
    const afternoonHomes = savedRun(15, [
      ['montevideo-cordon-ejemplo-cuatro', 'apartamento'],
      ['montevideo-cordon-ejemplo-cinco', 'casa'],
      ['montevideo-cordon-ejemplo-seis', 'apartamento'],
    ])
    const todayHomes = [...morningHomes, ...afternoonHomes]
    // Saved after every home of today: the tier still puts them below the morning's homes.
    const todayOffices = ['montevideo-centro-oficina-uno', 'montevideo-centro-oficina-dos'].map(
      (key, i) => property(key, 'oficina', 15000, today, savedAt(20, i))
    )
    const yesterdayHomes = [
      'montevideo-pocitos-ayer-uno',
      'montevideo-pocitos-ayer-dos',
      'montevideo-pocitos-ayer-tres',
    ].map((key, i) => property(key, 'apartamento', 25000, yesterday, savedAt(-10, i)))
    const documents = [...todayHomes, ...todayOffices, ...yesterdayHomes]
    const run = async (query: Record<string, string>) => {
      const { items } = await capture(query)
      return client
        .db()
        .aggregate([{ $documents: documents }, ...items], {
          collation: rentals.RENTAL_COLLATION,
          maxTimeMS: 30000,
        })
        .toArray()
    }
    const inHashOrder = async (rows: Array<{ key: string }>) => {
      const rank = await hashRank(rows.map(row => row.key))
      return [...rows].sort((a, b) => rank.get(a.key)! - rank.get(b.key)!).map(row => row.key)
    }

    const rows = await run({ perPage: '48' })
    expect(rows.map(row => row.key)).toEqual([
      ...(await inHashOrder(afternoonHomes)),
      ...(await inHashOrder(morningHomes)),
      ...(await inHashOrder(todayOffices)),
      ...(await inHashOrder(yesterdayHomes)),
    ])
    // Not the insertion (= price) order inside a run.
    expect(rows.slice(0, 3).map(row => row.key)).not.toEqual(afternoonHomes.map(row => row.key))
    expect(JSON.stringify(rows)).not.toMatch(/_rental|PRIVATE-/)
    // Deterministic, and the pages tile the list.
    expect((await run({ perPage: '48' })).map(row => row.key)).toEqual(rows.map(row => row.key))
    const paged = [
      ...(await run({ perPage: '4', page: '1' })),
      ...(await run({ perPage: '4', page: '2' })),
      ...(await run({ perPage: '4', page: '3' })),
    ]
    expect(paged.map(row => row.key)).toEqual(rows.map(row => row.key))

    // With types chosen no chosen type outranks another: the 20:00 oficinas come first, by hour.
    const chosen = await run({ perPage: '48', types: 'apartamento,oficina' })
    const notCasa = (homes: typeof todayHomes) => homes.filter(row => row.propertyType !== 'casa')
    expect(chosen.map(row => row.key)).toEqual([
      ...(await inHashOrder(todayOffices)),
      ...(await inHashOrder(notCasa(afternoonHomes))),
      ...(await inHashOrder(notCasa(morningHomes))),
      ...(await inHashOrder(yesterdayHomes)),
    ])
  })

  it('reproduces Mongo error292 when the same endpoint projection is delayed until after sort', async () => {
    const pipelines = await capture({ sort: 'precio', page: '5', perPage: '24' })
    for (const pipeline of [pipelines.items, pipelines.median]) {
      const old = [
        ...pipeline.filter(stage => !stage.$project),
        pipeline.find(stage => stage.$project)!,
      ]
      await expect(execute(240, old)).rejects.toMatchObject({ code: 292 })
    }
  })

  it.each([239, 240])('keeps the exact %i-home median with no disk spill', async count => {
    for (const source of ['', 'casasweb']) {
      const { median } = await capture({ source }, count)
      const [row] = await execute(count, median)
      expect(Math.round(row!.median)).toBe(Math.round((source ? 12000 : 10000) + (count - 1) / 2))
    }
  })

  it.each(['precio', 'precio-desc', 'metros', 'recientes', 'total'])(
    'keeps %s deep pages and same-advert prices exact without sorting private text',
    async sort => {
      const { items } = await capture({ sort, page: '5', perPage: '24', source: 'casasweb' })
      const rows = await execute(240, items)
      const fields = Object.entries(rentals.rentalMongoSort(sort as rentals.RentalSort))
      // The hash of "más recientes" is Mongo's: read its order from the same server.
      const mix = await hashRank(Array.from({ length: 240 }, (_, i) => `qa-${i}`))
      const oracle = Array.from({ length: 240 }, (_, i) => ({
        key: `qa-${i}`,
        priceUyu: 12000 + i,
        area: 40 + i,
        freshAt: date,
        _rentalMonthlyUnknown: false,
        _rentalMonthlyTotal: 12100 + i,
        _rentalTier: 0,
        // The fixtures have no `_id`: the hour is null for all of them and ties.
        _rentalHour: null,
        _rentalMix: mix.get(`qa-${i}`)!,
      })).sort((a, b) => {
        for (const [key, direction] of fields) {
          const x = a[key as keyof typeof a],
            y = b[key as keyof typeof b]
          const difference =
            typeof x === 'number' && typeof y === 'number'
              ? x - y
              : String(x).localeCompare(String(y), 'es')
          if (difference) return difference * direction
        }
        return 0
      })
      expect(rows.map(row => row.key)).toEqual(oracle.slice(96, 120).map(row => row.key))
      expect(
        rows.every(
          row =>
            row.matchingOffer.source === 'casasweb' && row.priceUyu === row.matchingOffer.priceUyu
        )
      ).toBe(true)
      expect(JSON.stringify(rows)).not.toMatch(/PRIVATE-|identity|details/)
      expect(JSON.stringify(rows)).not.toContain('_rentalMonthly')
    }
  )

  it('serves the final distance page of 21,061 matching homes after the projected sort exceeds 100 MiB', async () => {
    const count = 21061
    const lastPage = Math.ceil(count / 12)
    const { items, itemsOptions } = await capture(
      {
        department: 'Montevideo',
        types: 'apartamento,oficina',
        source: 'casasweb',
        priceMax: '45000',
        sort: 'distancia',
        refLat: '-34.88974',
        refLng: '-56.17683',
        perPage: '12',
        page: String(lastPage),
      },
      count
    )
    const pipeline = [...fixtures(count, true), ...items]
    const executeLarge = (allowDiskUse: boolean) =>
      client
        .db()
        .aggregate(pipeline, {
          allowDiskUse,
          collation: rentals.RENTAL_COLLATION,
          maxTimeMS: 30000,
        })
        .toArray()
    // Reproduces the actual production failure even WITH the early public projection.
    await expect(executeLarge(false)).rejects.toMatchObject({ code: 292 })
    expect(itemsOptions.allowDiskUse).toBe(true)
    const rows = await executeLarge(itemsOptions.allowDiskUse!)
    const unknownKeys = Array.from({ length: count }, (_, i) => i)
      .filter(i => i % 7 === 0)
      .map(i => `qa-${i}`)
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
    const size = count - (lastPage - 1) * 12
    expect(rows.map(row => row.key)).toEqual(unknownKeys.slice(-size))
    expect(rows.every(row => row.distanceKm === null)).toBe(true)
    for (const row of rows) {
      const id = Number(row.key.slice(3))
      expect(row.priceUyu).toBe(12000 + id)
      expect(row.matchingOffer.source).toBe('casasweb')
      expect(row.matchingOffer.priceUyu).toBe(row.priceUyu)
    }
    expect(JSON.stringify(rows)).not.toMatch(/PRIVATE-|identity|details|_rentalDistance/)
  }, 30000)
})
