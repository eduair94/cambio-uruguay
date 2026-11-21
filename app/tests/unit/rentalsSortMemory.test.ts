import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import mongoose from 'mongoose'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import * as rentals from '../../utils/rentals'
import * as rentalDirectoryParts from '../../utils/rentalDirectoryParts'
import * as rentalPricePerM2 from '../../utils/rentalPricePerM2'
import * as rentalDetail from '../../server/utils/rentalDetail'
import * as rentalDirectoryOrder from '../../server/utils/rentalDirectoryOrder'
import * as rentalGalleryPreview from '../../server/utils/rentalGalleryPreview'
import * as rentalMemoModule from '../../server/utils/rentalMemo'
import {
  createRentalDirectoryAggregate,
  createRentalDirectoryData,
  rentalDirectoryWindowOf,
  type RentalAggregateChain,
} from '../../server/utils/rentalDirectoryData'

const { rentalPublicPropertyProjection } = rentalDetail
const { RentalMemoBusyError, createRentalMemo } = rentalMemoModule

type Stage = Record<string, any>
const route = readFileSync(join(__dirname, '../../server/api/rentals/index.get.ts'), 'utf8')
const compiled = ts.transpileModule(route, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

/** One aggregation the route issued, with the options it chained before awaiting it. */
interface Pass {
  pipeline: Stage[]
  /** From the `comment` option: `win`, `cards`, `legacy`, `facet`, `dept` or `barrio`. */
  role: string
  allowDiskUse?: boolean
  maxTimeMS?: number
  /** Built for the coverage of the catalogue, in the background slot, not for this search. */
  coverage?: boolean
}

interface RouteOptions {
  /** The keys of the requested page, placed where the page sits in its window. Default: three. */
  keys?: string[]
  /** The count of the search the window pass answers. Default: the facet's `total`. */
  n?: number
  /** The window goes on after the page's keys (default: it ends with them, as a last page). */
  fullWindow?: boolean
  /** Keys the cards pass no longer returns (written out between the two passes). */
  missingCards?: string[]
  /** Make the passes of these roles fail with this error. */
  fail?: { role: string | string[]; error: unknown }
  /** Passes of these roles never answer. */
  hold?: string[]
  /** Run every pass for real (the localhost Mongo suite below) instead of the stubs. */
  execute?: (pipeline: Stage[], pass: Pass) => Promise<unknown[]>
  /** Collects the passes, also when the route throws. */
  record?: Pass[]
  /** Runs when a pass is awaited, before it answers (e.g. to move the clock between passes). */
  onPass?: (pass: Pass) => void
  /** Another memo (default: a fresh one per loaded route). */
  memo?: rentalMemoModule.RentalMemo
  /** Nitro's outer memo, as a small stand-in that stores whole answers by key. */
  outerMemo?: boolean
  /** The `memo` switch of `.data/flags/rentals.json`, read on every request (default: on). */
  memoFlag?: { on: boolean }
}

const DEFAULT_KEYS = ['qa-uno', 'qa-dos', 'qa-tres']
// Letters only: a fixture `key` with digits reads as a secret to the repository's scanner.
const filler = (i: number) =>
  `qa-relleno-${String.fromCharCode(97 + (Math.floor(i / 676) % 26))}${String.fromCharCode(97 + (Math.floor(i / 26) % 26))}${String.fromCharCode(97 + (i % 26))}`

/**
 * The route file itself, run in a VM with its IO stubbed, and the real memo module behind it
 * (server/utils/rentalDirectoryData.ts with an injected aggregate). One instance serves several
 * requests, so the memos it holds carry from one to the next as on a worker.
 */
function loadRoute(
  total = 240,
  neighborhoods: Array<{ _id: string; count: number }> = [],
  options: RouteOptions = {}
) {
  const passes: Pass[] = options.record ?? []
  let current: { query: Record<string, unknown> } = { query: {} }
  let coverageBuild = false
  const stubResult = (pass: Pass): unknown[] => {
    const { pipeline, role } = pass
    if (role === 'win') {
      // The requested page's keys sit where that page sits in its window; the rest is filler.
      const query = rentals.normalizeRentalQuery(current.query)
      const { w, offset, size } = rentalDirectoryWindowOf(query.page, query.perPage)
      const facet = pipeline.at(-1)?.$facet
      const tail: Stage[] = facet ? facet.keys : pipeline
      const skip = tail.find(stage => stage.$skip !== undefined)!.$skip as number
      const own = options.keys ?? DEFAULT_KEYS
      const keys =
        skip === w * size
          ? [
              ...Array.from({ length: offset }, (_, i) => filler(i)),
              ...own,
              ...(options.fullWindow
                ? Array.from({ length: size - offset - own.length }, (_, i) =>
                    filler(offset + own.length + i)
                  )
                : []),
            ]
          : Array.from({ length: size }, (_, i) => filler(i))
      const rows = keys.map(key => ({ key }))
      return facet ? [{ n: [{ n: options.n ?? total }], keys: rows }] : rows
    }
    if (role === 'cards') {
      const keys: string[] = pipeline[0]?.$match?.key?.$in ?? []
      // Mongo's own order is the page's order too; reversed here so the route has to reorder.
      return keys
        .filter(key => !options.missingCards?.includes(key))
        .reverse()
        .map(key => ({ key, offers: [] }))
    }
    if (role === 'legacy') return [{ key: 'qa-single-pass', offers: [] }]
    const facet = pipeline.find(stage => stage.$facet)?.$facet
    // The count, the portals, and the barrio counts when their filter is the search's own, are
    // branches of the facet pass.
    if (facet)
      return [
        {
          total: [{ total }],
          sources: [{ _id: 'infocasas', count: total }],
          ...(facet.neighborhoods ? { neighborhoods } : {}),
        },
      ]
    return pipeline.some(stage => stage.$group?._id === '$neighborhood') ? neighborhoods : []
  }
  const start = (pipeline: Stage[]): RentalAggregateChain => {
    const pass: Pass = { pipeline, role: '?', ...(coverageBuild ? { coverage: true } : {}) }
    passes.push(pass)
    const chain: RentalAggregateChain = {
      allowDiskUse: (enabled: boolean) => {
        pass.allowDiskUse = enabled
        return chain
      },
      option: value => {
        pass.maxTimeMS = value.maxTimeMS
        pass.role = String(value.comment ?? '').replace(/^rentals:/, '')
        return chain
      },
      collation: () => {
        options.onPass?.(pass)
        if (options.hold?.includes(pass.role)) return new Promise(() => {})
        if (options.fail && [options.fail.role].flat().includes(pass.role))
          return Promise.reject(options.fail.error)
        if (options.execute) return options.execute(pipeline, pass)
        return Promise.resolve(stubResult(pass))
      },
    }
    return chain
  }
  const memo =
    options.memo ??
    createRentalMemo({ now: () => Date.now(), log: () => {}, schedule: () => () => {} })
  // The coverage reads the default search's facet; when it is absent it builds it in the
  // background (`warm`). Those passes are marked, so each test counts its search's passes alone.
  const coverageAware: rentalMemoModule.RentalMemo = {
    ...memo,
    get: (kind, key, build, opts) =>
      memo.get(
        kind,
        key,
        opts?.priority === 'warm'
          ? () => {
              coverageBuild = true
              try {
                return build()
              } finally {
                coverageBuild = false
              }
            }
          : build,
        opts
      ),
  }
  const data = createRentalDirectoryData({
    aggregate: createRentalDirectoryAggregate(start as never),
    memo: coverageAware,
    now: () => Date.now(),
    io: {
      connect: async () => {},
      loadAvailability: async () =>
        ({ excludedAdvertIds: () => [], byAdvertId: new Map() }) as never,
      loadMeta: async () => ({ usdUyu: 40 }) as never,
      loadRentalServiceZoneIds: async () => [],
    },
  })
  const dependencies: Record<string, unknown> = {
    '../../models/RentalListing': {
      // The card carousels' photos: none here.
      RentalListingModel: { find: () => ({ lean: () => Promise.resolve([]) }) },
    },
    '../../utils/cachedResponseHeader': {
      setHeaderUnlessSent: (
        event: { headers: Record<string, string> },
        name: string,
        value: string
      ) => {
        event.headers[name] = value
        return true
      },
    },
    '../../utils/rentalDirectoryWarm': { rentalDirectoryCacheKey: () => 'default' },
    '../../utils/rentalDirectoryData': { rentalDirectoryData: data },
    '../../utils/rentalMemo': rentalMemoModule,
    '../../utils/rentalFlags': {
      rentalFlag: (name: string) => (name === 'memo' ? (options.memoFlag?.on ?? true) : true),
    },
    '../../utils/rentalDirectoryOrder': rentalDirectoryOrder,
    '../../utils/rentalDetail': rentalDetail,
    '../../utils/rentalGalleryPreview': rentalGalleryPreview,
    '../../utils/rentalAvailability': {
      annotateRentalAvailability: (property: unknown) => property,
    },
    '../../../utils/rentals': rentals,
    '../../../utils/rentalDirectoryParts': rentalDirectoryParts,
  }
  let cachedOptions: Record<string, any> = {}
  const module = { exports: {} as { default?: (event: unknown) => Promise<unknown> } }
  runInNewContext(compiled, {
    exports: module.exports,
    module,
    require: (id: string) => {
      if (!(id in dependencies)) throw new Error(`Unexpected route dependency: ${id}`)
      return dependencies[id]
    },
    defineEventHandler: (handler: unknown) => handler,
    // El directorio es un memo de Nitro desde 2026-09-22. Por defecto acá interesan los pipelines,
    // no esa caché; con `outerMemo` un sustituto mínimo guarda la respuesta entera por clave.
    defineCachedEventHandler: (
      handler: (event: unknown) => Promise<unknown>,
      opts: Record<string, any>
    ) => {
      cachedOptions = opts
      if (!options.outerMemo) return handler
      const stored = new Map<string, unknown>()
      return async (event: unknown) => {
        if (await opts.shouldBypassCache?.(event)) return handler(event)
        const key = opts.getKey(event)
        if (stored.has(key)) return stored.get(key)
        const value = await handler(event)
        stored.set(key, value)
        return value
      }
    },
    setResponseHeader: () => {},
    process,
    getQuery: (event: { query: Record<string, unknown> }) => event.query,
    createError: ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
      Object.assign(new Error(statusMessage), { statusCode }),
    console: {
      ...console,
      // The 503 tests make the route log its failure; the test reads the error instead.
      error: () => {},
    },
  })

  /** One request. */
  async function request(query: Record<string, unknown> = {}) {
    current = { query }
    const event = {
      query,
      context: {} as Record<string, unknown>,
      headers: {} as Record<string, string>,
    }
    const before = passes.length
    let answer: unknown
    try {
      answer = await module.exports.default!(event)
    } catch (error) {
      // What the wrapper set on its way out, for the 503 tests.
      throw Object.assign(error as object, { headers: event.headers })
    }
    const response = answer as rentals.RentalsResponse &
      Partial<rentalDirectoryParts.RentalsItemsResponse> &
      Partial<rentalDirectoryParts.RentalsFacetsResponse>
    const own = passes.slice(before).filter(pass => !pass.coverage)
    const of = (role: string) => own.filter(pass => pass.role === role)
    // The median is a branch of the facet pass (rentalMedianFacet), not a pass of its own.
    const facets = of('facet')[0]?.pipeline
    const median = facets?.find(stage => stage.$facet)!.$facet.median as Stage[]
    return {
      response,
      headers: event.headers,
      /** The window pass that ordered the page (the last one: a deep page reads window 0 first). */
      keys: of('win').at(-1)?.pipeline as Stage[],
      keysOptions: of('win').at(-1)!,
      /** The cards pass: the single-pass pipeline over the keys of the page. */
      items: of('cards')[0]?.pipeline as Stage[],
      itemsOptions: of('cards')[0],
      median,
      facets: facets as Stage[],
      count: own.length,
      roles: own.map(pass => pass.role),
      passes: own,
      pipelines: own.map(pass => pass.pipeline),
      coverageBuilds: passes.slice(before).filter(pass => pass.coverage).length,
    }
  }
  return { request, memo, passes, options: () => cachedOptions }
}

/** One request on a fresh worker. */
async function capture(
  query: Record<string, unknown> = {},
  total = 240,
  neighborhoods: Array<{ _id: string; count: number }> = [],
  options: RouteOptions = {}
) {
  return loadRoute(total, neighborhoods, options).request(query)
}

/** The route's answer when it fails: the error it throws, the passes and the headers. */
async function failure(query: Record<string, unknown>, options: RouteOptions) {
  const record: Pass[] = []
  try {
    await loadRoute(240, [], { ...options, record }).request(query)
  } catch (error) {
    const failed = error as Error & { statusCode?: number; headers: Record<string, string> }
    return { error: failed, roles: record.map(pass => pass.role), headers: failed.headers }
  }
  throw new Error('the route answered')
}

/** Where a pass sorts: a top-level `$sort`, or the `$facet` whose keys branch sorts. */
const sortAt = (pipeline: Stage[]) =>
  pipeline.findIndex(
    stage => stage.$sort || stage.$facet?.keys?.some((inner: Stage) => inner.$sort)
  )
/** The stages after the projection of a window pass: inside its `$facet` when it counts. */
const windowTail = (pipeline: Stage[]): Stage[] => pipeline.at(-1)?.$facet?.keys ?? pipeline

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('rental endpoint sort input', () => {
  it.each(['precio', 'precio-desc', 'metros', 'recientes', 'total', 'precio-m2', 'baja'])(
    'retains every %s sort key while removing private evidence before buffering',
    async sort => {
      const query = { sort, source: 'casasweb' }
      const { items, keys, median, keysOptions, itemsOptions } = await capture(query)
      // The window pass is the one that sorts the whole search: it may spill to disk. The cards
      // pass sorts the cards of one page.
      expect(keysOptions.allowDiskUse).toBe(true)
      expect(itemsOptions!.allowDiskUse).toBe(false)
      for (const pipeline of [keys, items, median]) {
        const projection = pipeline.findIndex(stage => stage.$project)
        expect(projection).toBeGreaterThanOrEqual(0)
        expect(projection).toBeLessThan(sortAt(pipeline))
      }
      // Nothing but the key and the sort keys enters the whole search's blocking sort.
      expect(keys.find(stage => stage.$project)!.$project).toEqual(
        rentalDirectoryOrder.rentalSortKeyProjection(rentals.normalizeRentalQuery(query))
      )
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

  it('takes the median in the facet pass instead of a pass of its own', async () => {
    // 2026-10-08: the separate pass ran after the other six and cost ~1,4 s of every uncached search.
    const { median } = await capture({ source: 'casasweb' })
    expect(median.at(-2)).toEqual({ $group: { _id: null, prices: { $push: '$priceUyu' } } })
  })

  // 2026-11-13 (CAMBIO-URUGUAY-BACKEND-12): every pass is a full scan of the inventory, and their
  // bursts starved other routes' 4 s queries on the shared mongod. Count, departments and barrios
  // ride the facet pass whenever they would select exactly the search's own properties.
  // 2026-11-20: the page is a slice of the search's 20-page window, then its cards read by key; the
  // coverage is the default search's facet (no pass of its own).
  it('reads the unfiltered directory twice on a fresh worker: its window, and one facet pass with every count', async () => {
    for (const query of [{}, { source: 'casasweb' }, { sort: 'precio', page: '3' }]) {
      const { roles, facets, items, response, coverageBuilds } = await capture(query)
      expect([...roles].sort()).toEqual(['cards', 'facet', 'win'])
      // The cards pass reads the page's documents by key, not the inventory.
      expect(items[0]!.$match.key).toEqual({ $in: DEFAULT_KEYS })
      const facet = facets.find(stage => stage.$facet)!.$facet
      expect(Object.keys(facet).sort()).toEqual(
        ['departments', 'median', 'neighborhoods', 'price', 'sources', 'total', 'types'].sort()
      )
      expect(facet.total).toEqual([{ $count: 'total' }])
      expect(facet.departments.at(-1)).toEqual({ $limit: 25 })
      expect(facet.neighborhoods.at(-1)).toEqual({ $limit: 5000 })
      expect(response.total).toBe(240)
      // The whole response keeps its shape: no `parts` marker.
      expect(response).not.toHaveProperty('parts')
      expect(Object.keys(response).sort()).toEqual(
        ['coverage', 'facets', 'items', 'medianUyu', 'meta', 'page', 'perPage', 'total'].sort()
      )
      // The default search's facet IS the coverage; another search on a fresh worker answers
      // without it and builds the default facet once, in the background.
      // (Neither the order nor the page is part of a facet's key: `sort=precio&page=3` IS it.)
      if (!('source' in query)) {
        expect(response.coverage?.properties).toBe(240)
        expect(coverageBuilds).toBe(0)
      } else {
        expect(response.coverage).toBeNull()
        expect(coverageBuilds).toBe(1)
      }
    }
  })

  it('never runs the old coverage pass, and reads the coverage from the stored default facet', async () => {
    const worker = loadRoute()
    await worker.request({})
    const { response, roles, coverageBuilds } = await worker.request({ source: 'casasweb' })
    expect([...roles].sort()).toEqual(['cards', 'facet', 'win'])
    expect(coverageBuilds).toBe(0)
    expect(response.coverage?.properties).toBe(240)
    // The old pass: a `$facet` with a `properties` count. None, on either request.
    expect(worker.passes.some(pass => pass.pipeline.at(-1)?.$facet?.properties)).toBe(false)
  })

  it('keeps a separate pass only for a facet that must ignore part of the search', async () => {
    // A department: the department facet still offers the other departments.
    const department = await capture({ department: 'Montevideo' })
    expect([...department.roles].sort()).toEqual(['cards', 'dept', 'facet', 'win'])
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
    expect([...barrio.roles].sort()).toEqual(['barrio', 'cards', 'dept', 'facet', 'win'])
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

  it('reads those counts from the wider searches once they are stored', async () => {
    // The directory's facet holds every department; Montevideo's holds its barrios.
    const worker = loadRoute()
    await worker.request({})
    await worker.request({ department: 'Montevideo' })
    const pocitos = await worker.request({
      department: 'Montevideo',
      neighborhood: 'Pocitos',
      sort: 'precio',
    })
    expect([...pocitos.roles].sort()).toEqual(['cards', 'facet', 'win'])
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
    const { items, keys, median } = await capture({
      sort: 'precio-m2',
      source: 'casasweb',
      page: '2',
    })
    for (const pipeline of [items, keys]) {
      const priced = pipeline.findLastIndex(stage => stage.$set?.priceUyu)
      const perM2 = pipeline.findIndex(stage => stage.$set?._rentalPricePerM2)
      const unknown = pipeline.findIndex(stage => stage.$set?._rentalPricePerM2Unknown)
      const projection = pipeline.findIndex(stage => stage.$project)
      expect(priced).toBeGreaterThan(0)
      expect(perM2).toBeGreaterThan(priced)
      expect(unknown).toBe(perM2 + 1)
      expect(projection).toBeGreaterThan(unknown)
      expect(sortAt(pipeline)).toBeGreaterThan(projection)
      expect(pipeline[perM2]!.$set._rentalPricePerM2).toEqual(
        rentalPricePerM2.rentalPricePerM2Expression()
      )
    }
    // Page 2 is a slice of window 0; the cards pass reads exactly the keys of that slice.
    expect(windowTail(keys)).toContainEqual({ $skip: 0 })
    expect(windowTail(keys)).toContainEqual({ $limit: 480 })
    expect(items.find(stage => stage.$skip !== undefined)).toEqual({ $skip: 0 })
    // Sorting alone must not move the rent median of the same search.
    expect(median).toEqual((await capture({ sort: 'precio', source: 'casasweb' })).median)
  })

  it('preserves the same base-rent median when only the presentation sort changes', async () => {
    const base = await capture({ sort: 'precio', pets: '1' })
    const monthly = await capture({ sort: 'total', pets: '1' })
    expect(monthly.median).toEqual(base.median)
  })

  it('computes distance before projecting and paging while excluding location evidence from the sort buffer', async () => {
    const { items, keys, median } = await capture({
      sort: 'distancia',
      refLat: '-34.9',
      refLng: '-56.17',
      page: '3',
      pets: '1',
    })
    for (const pipeline of [items, keys]) {
      const distance = pipeline.findIndex(stage => stage.$set?.distanceKm)
      const projection = pipeline.findIndex(stage => stage.$project)
      expect(distance).toBeGreaterThan(0)
      expect(distance).toBeLessThan(projection)
      expect(projection).toBeLessThan(sortAt(pipeline))
    }
    const sorts = [items, windowTail(keys)].map(pipeline => pipeline.find(stage => stage.$sort)!)
    for (const sort of sorts)
      expect(sort.$sort).toEqual({ _rentalDistanceUnknown: 1, distanceKm: 1, key: 1 })
    expect(items.find(stage => stage.$project)!.$project).toEqual({
      ...rentalPublicPropertyProjection,
      distanceKm: 1,
      _rentalDistanceUnknown: 1,
    })
    expect(keys.find(stage => stage.$project)!.$project).toEqual({
      _id: 0,
      key: 1,
      _rentalDistanceUnknown: 1,
      distanceKm: 1,
    })
    expect(items.at(-1)).toEqual({ $unset: ['_rentalDistanceUnknown'] })
    expect(median).toEqual((await capture({ pets: '1' })).median)
  })
})

describe('the page from its window, and the parts of the response', () => {
  it('orders a window of 20 pages and reads the cards of the page, in that order', async () => {
    const { keys, items, response } = await capture(
      { sort: 'precio', page: '5', perPage: '24' },
      240,
      [],
      { keys: ['qa-c', 'qa-a', 'qa-b'] }
    )
    // One `$facet`: the count of the search and the window's 480 keys, from one snapshot.
    expect(keys.at(-1)).toEqual({
      $facet: {
        n: [{ $count: 'n' }],
        keys: [
          { $sort: rentals.rentalMongoSort('precio') },
          { $skip: 0 },
          { $limit: 480 },
          { $project: { _id: 0, key: 1 } },
        ],
      },
    })
    expect(items[0]!.$match.key).toEqual({ $in: ['qa-c', 'qa-a', 'qa-b'] })
    expect(items.find(stage => stage.$limit !== undefined)).toEqual({ $limit: 3 })
    // The stub answers in reverse: the route puts the cards back in the window's order.
    expect(response.items.map(item => item.key)).toEqual(['qa-c', 'qa-a', 'qa-b'])
  })

  it('serves the next pages of a stored window with the cards pass alone', async () => {
    const worker = loadRoute(240, [], { fullWindow: true })
    await worker.request({ parts: 'items', page: '2' })
    for (const page of ['3', '4', '10']) {
      const { roles, headers } = await worker.request({ parts: 'items', page })
      expect(roles).toEqual(['cards'])
      expect(headers['x-rentals-memo']).toBe('win=hit')
    }
    // Page 21 is the next window, and past this search's ten pages: clamped by the stored count.
    expect((await worker.request({ parts: 'items', page: '21' })).roles).toEqual([])
    const longer = loadRoute(5_000, [], { fullWindow: true })
    await longer.request({ parts: 'items', page: '2' })
    expect((await longer.request({ parts: 'items', page: '21' })).roles).toEqual(['win', 'cards'])
  })

  it('drops a key whose card is gone instead of showing another card', async () => {
    const { response } = await capture({}, 240, [], { missingCards: ['qa-dos'] })
    expect(response.items.map(item => item.key)).toEqual(['qa-uno', 'qa-tres'])
  })

  it('derives the cards at the window pass instant, even when midnight falls between them', async () => {
    // `rentalPublicStages` keeps an offer as current from a cutoff computed from the clock. A
    // cards pass that rebuilt it after midnight UTC would drop an offer the window pass ordered by
    // (the cheaper of two, seen exactly on the old cutoff day) and show another price in its place.
    const cutoffOf = (pipeline: Stage[]) => {
      const set = pipeline.find(stage => stage.$set?.offers)!
      const conditions = set.$set.offers.$filter.cond.$and as Stage[]
      return conditions.find(condition => condition.$gte?.[0] === '$$offer.lastSeen')!.$gte[1]
    }
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T23:59:59.900Z'))
    const { keys, items } = await capture({ sort: 'precio', page: '2' }, 240, [], {
      onPass: pass => {
        if (pass.role === 'win') vi.setSystemTime(new Date('2026-11-21T00:00:00.400Z'))
      },
    })
    expect(cutoffOf(keys)).toBe('2026-11-10')
    expect(cutoffOf(items)).toBe(cutoffOf(keys))
  })

  it('issues no cards pass when the window has no key for the page', async () => {
    const { roles, response } = await capture({ page: '3' }, 240, [], { keys: [] })
    expect(roles).not.toContain('cards')
    expect(roles).not.toContain('legacy')
    expect(response.items).toEqual([])
  })

  it('answers a page past the end with no card and the count, and a crafted deep page with window 0 alone', async () => {
    const past = await capture({ page: '11', parts: 'items' })
    expect(past.roles).toEqual(['win'])
    expect(past.response).toEqual({ parts: 'items', items: [], total: 240, page: 11, perPage: 24 })
    // page=10000 is window 499: window 0 is read first and its count ends it there.
    const worker = loadRoute()
    const crafted = await worker.request({ page: '10000', parts: 'items' })
    expect(crafted.roles).toEqual(['win'])
    expect(windowTail(crafted.keys)).toContainEqual({ $skip: 0 })
    expect(crafted.response.items).toEqual([])
    expect(crafted.response.total).toBe(240)
    // The same request again issues nothing at all.
    expect((await worker.request({ page: '10000', parts: 'items' })).roles).toEqual([])
  })

  it('names every pass and bounds its time', async () => {
    const { passes } = await capture({ department: 'Montevideo', neighborhood: 'Pocitos' })
    const limits = Object.fromEntries(passes.map(pass => [pass.role, pass.maxTimeMS]))
    expect(limits).toEqual({
      win: 20_000,
      cards: 10_000,
      facet: 20_000,
      dept: 20_000,
      barrio: 20_000,
    })
  })

  it('parts=items reads the window and the cards only, and answers the cards and its count', async () => {
    const { roles, response, coverageBuilds } = await capture(
      { parts: 'items', department: 'Montevideo', neighborhood: 'Pocitos', page: '4' },
      240,
      [],
      { n: 77 }
    )
    expect(roles).toEqual(['win', 'cards'])
    expect(coverageBuilds).toBe(0)
    expect(response).toEqual({
      parts: 'items',
      items: DEFAULT_KEYS.map(key => expect.objectContaining({ key })),
      // The window's own count, never a facet's.
      total: 77,
      page: 4,
      perPage: 24,
    })
  })

  it('parts=items answers while a facet pass never does', async () => {
    const { roles, response } = await capture({ parts: 'items', page: '2' }, 240, [], {
      hold: ['facet', 'dept', 'barrio'],
    })
    expect(roles).toEqual(['win', 'cards'])
    expect(response.items).toHaveLength(3)
  })

  it("a whole answer's count is the window's, the same snapshot as its page", async () => {
    const { response } = await capture({}, 240, [], { n: 239 })
    expect(response.total).toBe(239)
  })

  it('parts=facets reads no page and answers the counts only', async () => {
    const unfiltered = await capture({ parts: 'facets', page: '4' })
    expect(unfiltered.roles).toEqual(['facet'])
    expect(unfiltered.coverageBuilds).toBe(0)
    expect(unfiltered.response).toEqual({
      parts: 'facets',
      total: 240,
      medianUyu: 0,
      facets: expect.objectContaining({ neighborhoods: [], departments: [] }),
    })
    // The barrio list of another department (the drawer): the department facet still runs apart
    // on a fresh worker...
    const department = await capture({ parts: 'facets', department: 'Canelones' }, 240, [
      { _id: 'Atlántida', count: 12 },
    ])
    expect([...department.roles].sort()).toEqual(['dept', 'facet'])
    expect(department.response.facets.neighborhoods).toEqual([{ value: 'Atlántida', count: 12 }])
    // ...and is read from the directory's facet once that one is stored.
    const worker = loadRoute()
    await worker.request({})
    const drawer = await worker.request({ parts: 'facets', department: 'Canelones' })
    expect(drawer.roles).toEqual(['facet'])
    expect(drawer.headers['x-rentals-memo']!.split(',').sort()).toEqual(['facet=hit', 'facet=miss'])
  })

  it('answers a timeout with the same 503 and no second pass', async () => {
    const timeout = Object.assign(new Error('operation exceeded time limit'), {
      code: 50,
      codeName: 'MaxTimeMSExpired',
    })
    for (const role of ['win', 'cards']) {
      const { error, roles } = await failure({}, { fail: { role, error: timeout } })
      expect(error.statusCode).toBe(503)
      expect(error.message).toBe('Rental search is temporarily unavailable')
      expect(roles).not.toContain('legacy')
    }
  })

  it('answers a refused build without a stored entry with a 503 that is never stored', async () => {
    const memo = createRentalMemo({ log: () => {}, schedule: () => () => {} })
    memo.get = async () => {
      throw new RentalMemoBusyError()
    }
    for (const parts of ['items', 'all']) {
      const { error, roles, headers } = await failure({ parts }, { memo })
      expect(error.statusCode).toBe(503)
      // Never a single pass on a saturated worker.
      expect(roles).toEqual([])
      expect(headers['cache-control']).toBe('no-store')
    }
  })

  it('falls back to the single pass once when the window or the cards pass fail otherwise', async () => {
    for (const role of ['win', 'cards']) {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { roles, response, passes } = await capture({ page: '2' }, 240, [], {
        fail: { role, error: new Error('cursor killed') },
      })
      expect(roles.filter(name => name === 'legacy')).toHaveLength(1)
      expect(response.items.map(item => item.key)).toEqual(['qa-single-pass'])
      expect(warn.mock.calls.map(args => args[0])).toEqual(['[api/rentals] fallback'])
      warn.mockRestore()
      // The fallback is today's pass unchanged: the full search, paged, may spill to disk.
      const legacy = passes.find(pass => pass.role === 'legacy')!
      expect(legacy.allowDiskUse).toBe(true)
      expect(legacy.pipeline.find(stage => stage.$skip !== undefined)).toEqual({ $skip: 24 })
      expect(legacy.pipeline.find(stage => stage.$project)!.$project).toMatchObject(
        rentalPublicPropertyProjection
      )
      // Without the window's count, the whole answer takes the facet's.
      expect(response.total).toBe(240)
    }
    // And a failed fallback is the same 503 as before.
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const legacyFails = await failure(
      {},
      { fail: { role: ['win', 'legacy'], error: new Error('down') } }
    )
    expect(legacyFails.error.statusCode).toBe(503)
    expect(legacyFails.roles.filter(name => name === 'legacy')).toHaveLength(1)
  })

  it('answers a failed facet pass with the 503 it always did', async () => {
    const { error } = await failure({}, { fail: { role: 'facet', error: new Error('down') } })
    expect(error.statusCode).toBe(503)
  })
})

describe('the outer memo and the memo headers', () => {
  it('keeps the outer memo for whole answers only, for a minute', () => {
    const { options } = loadRoute()
    const cached = options()
    expect(cached.maxAge).toBe(60)
    expect(cached.staleMaxAge).toBe(3600)
    expect(cached.swr).toBe(true)
    const bypass = (query: Record<string, unknown>) => cached.shouldBypassCache({ query })
    expect(bypass({})).toBe(false)
    expect(bypass({ department: 'Montevideo', page: '2' })).toBe(false)
    expect(bypass({ parts: 'items', page: '2' })).toBe(true)
    expect(bypass({ parts: 'facets', department: 'Canelones' })).toBe(true)
    expect(bypass({ availabilityRevision: '3' })).toBe(true)
  })

  it('keeps the outer memo for the parts too while the inner memo is switched off', () => {
    // `memo: off` makes the inner memo a pass-through that stores nothing: without the outer memo
    // every scroll page would cost its counted window pass (a full scan), with no admission control.
    const memoFlag = { on: false }
    const cached = loadRoute(240, [], { memoFlag }).options()
    const bypass = (query: Record<string, unknown>) => cached.shouldBypassCache({ query })
    expect(bypass({ parts: 'items', page: '2' })).toBe(false)
    expect(bypass({ parts: 'facets', department: 'Canelones' })).toBe(false)
    expect(bypass({})).toBe(false)
    expect(bypass({ availabilityRevision: '3' })).toBe(true)
    expect(bypass({ parts: 'items', availabilityRevision: '3' })).toBe(true)
    // (The outer key starts with the parts, so a slice never answers a whole request:
    // tests/unit/rentalDirectoryWarm.test.ts.) Switched back on, the parts are inner-memo slices again.
    memoFlag.on = true
    expect(bypass({ parts: 'items', page: '2' })).toBe(true)
    expect(bypass({ parts: 'facets', department: 'Canelones' })).toBe(true)
  })

  it('says which memo answered: a miss, a hit, a stale serve, the outer memo', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T12:00:00.000Z'))
    const worker = loadRoute(240, [], { outerMemo: true })
    const miss = await worker.request({ parts: 'items', page: '2' })
    expect(miss.headers['x-rentals-memo']).toBe('win=miss')
    const hit = await worker.request({ parts: 'items', page: '3' })
    expect(hit.headers['x-rentals-memo']).toBe('win=hit')
    vi.setSystemTime(new Date('2026-11-20T12:05:31.000Z'))
    const stale = await worker.request({ parts: 'items', page: '3' })
    expect(stale.headers['x-rentals-memo']).toBe('win=stale')
    // The stale answer refreshed the window in the background: fresh again. A page past the end
    // of its count is clamped by it, nothing else read.
    const past = await worker.request({ parts: 'items', page: '101' })
    expect(past.headers['x-rentals-memo']).toBe('win=hit')
    expect(past.roles).toEqual([])
    expect(past.response.items).toEqual([])
    // The facets.
    const facets = await worker.request({ parts: 'facets', department: 'Canelones' })
    expect(facets.headers['x-rentals-memo']!.split(',').sort()).toEqual(['dept=miss', 'facet=miss'])
    // A whole answer: its inner lookups when the handler ran, then the outer memo.
    const whole = await worker.request({ department: 'Maldonado' })
    expect(whole.headers['x-rentals-memo']?.split(',').sort()).toEqual([
      'dept=hit',
      'facet=miss',
      'win=miss',
    ])
    const again = await worker.request({ department: 'Maldonado' })
    expect(again.headers['x-rentals-memo']).toBe('outer=hit')
    expect(again.roles).toEqual([])
    for (const answer of [miss, hit, stale, facets, whole, again])
      expect(answer.headers['x-rentals-worker']).toBe(process.env.NODE_APP_INSTANCE ?? 'na')
    expect(whole.headers['cache-control']).toBe('public, max-age=30, s-maxage=300')
  })

  it('reads window 0 and then the deep window, both named in the header', async () => {
    const worker = loadRoute(20_000)
    const deep = await worker.request({ parts: 'items', page: '101' })
    expect(deep.roles).toEqual(['win', 'win', 'cards'])
    expect(deep.headers['x-rentals-memo']).toBe('win=miss,win=miss')
    expect((await worker.request({ parts: 'items', page: '101' })).headers['x-rentals-memo']).toBe(
      'win=hit,win=hit'
    )
  })

  it('names the worker and the failed lookup on a 503 too', async () => {
    const timeout = Object.assign(new Error('timeout'), { code: 50 })
    const { error, headers } = await failure(
      { parts: 'items' },
      { fail: { role: 'win', error: timeout } }
    )
    expect(error.statusCode).toBe(503)
    expect(headers['cache-control']).toBe('no-store')
    expect(headers['x-rentals-memo']).toBe('win=miss')
    expect(headers['x-rentals-worker']).toBe(process.env.NODE_APP_INSTANCE ?? 'na')
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
          // The stored headline price is the cheapest offer, as the harvest writes it: the median
          // of a search with no offer filter reads it.
          priceUyu: { $add: [10000, '$i'] },
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

  /** The route itself, every pass run against `source` (the fixture stages) on the localhost Mongo. */
  const route = async (
    source: Stage[],
    query: Record<string, unknown>,
    options: { singlePass?: boolean } = {}
  ) =>
    capture({ ...query, parts: 'items' }, 0, [], {
      // The window pass failing for a reason other than a timeout makes the route run today's
      // single pass: the oracle the window and the cards have to reproduce.
      ...(options.singlePass
        ? { fail: { role: 'win', error: new Error('single pass on purpose') } }
        : {}),
      execute: (pipeline, pass) =>
        client
          .db()
          .aggregate([...source, ...pipeline], {
            allowDiskUse: pass.allowDiskUse ?? false,
            collation: rentals.RENTAL_COLLATION,
            maxTimeMS: 30000,
          })
          .toArray(),
    })
  /** The page the route answers, and the one today's single pass answers for the same query. */
  const bothWays = async (source: Stage[], query: Record<string, unknown>) => {
    const twoPasses = await route(source, query)
    const singlePass = await route(source, query, { singlePass: true })
    // A window (window 0 first for a page past window 4), then the cards; a page past the end has
    // no key, so no cards pass.
    expect(twoPasses.roles[0]).toBe('win')
    expect(twoPasses.roles.filter(role => role !== 'win')).toEqual(
      twoPasses.response.items.length ? ['cards'] : []
    )
    expect(singlePass.roles).toEqual(['win', 'legacy'])
    return { rows: twoPasses.response.items, single: singlePass.response.items }
  }
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
    // The route's window + cards, checked against today's single pass on the same documents.
    const run = async (query: Record<string, string>) => {
      const { rows, single } = await bothWays([{ $documents: documents }], query)
      expect(rows).toEqual(single)
      return rows
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
    // Page 101 is window 5: window 0 counts the search, window 5 sorts it without counting.
    const query = { sort: 'precio', page: '101', perPage: '24' }
    const pipelines = await capture(query, 100_000)
    const counted = pipelines.passes.find(pass => pass.role === 'win')!.pipeline
    const single = await capture(query, 100_000, [], {
      fail: { role: 'win', error: new Error('single pass on purpose') },
    })
    const singlePass = single.passes.find(pass => pass.role === 'legacy')!.pipeline
    // Both window passes, the single pass it falls back to, and the median: each one sorts the
    // whole search and survives only because its projection comes first.
    for (const pipeline of [pipelines.keys, counted, singlePass, pipelines.median]) {
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
      const { rows, single } = await bothWays(fixtures(240), {
        sort,
        page: '5',
        perPage: '24',
        source: 'casasweb',
      })
      // The two passes answer exactly what the single pass answered.
      expect(rows).toEqual(single)
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
            row.matchingOffer?.source === 'casasweb' && row.priceUyu === row.matchingOffer.priceUyu
        )
      ).toBe(true)
      expect(JSON.stringify(rows)).not.toMatch(/PRIVATE-|identity|details/)
      expect(JSON.stringify(rows)).not.toContain('_rentalMonthly')
    }
  )

  it('serves the final distance page of 21,061 matching homes after the projected sort exceeds 100 MiB', async () => {
    const count = 21061
    const lastPage = Math.ceil(count / 12)
    const query = {
      department: 'Montevideo',
      types: 'apartamento,oficina',
      source: 'casasweb',
      priceMax: '45000',
      sort: 'distancia',
      refLat: '-34.88974',
      refLng: '-56.17683',
      perPage: '12',
      page: String(lastPage),
    }
    // Today's single pass, still the route's fallback: the one that needs the disk.
    const single = await capture(query, count, [], {
      fail: { role: 'win', error: new Error('single pass on purpose') },
    })
    const legacy = single.passes.find(pass => pass.role === 'legacy')!
    const items = legacy.pipeline
    const itemsOptions = legacy
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
    // And the route's windows serve that same last page (window 87: window 0 first, then its own,
    // then the cards); only the window passes may spill.
    const twoPasses = await route(fixtures(count, true), query)
    expect(twoPasses.roles).toEqual(['win', 'win', 'cards'])
    expect(twoPasses.passes[0]!.allowDiskUse).toBe(true)
    expect(twoPasses.keysOptions.allowDiskUse).toBe(true)
    expect(twoPasses.response.items.map(row => row.key)).toEqual(rows.map(row => row.key))
    expect(
      twoPasses.response.items.map(row => [row.priceUyu, row.distanceKm, row.matchingOffer?.source])
    ).toEqual(rows.map(row => [row.priceUyu, row.distanceKm, row.matchingOffer.source]))
  }, 60000)
})
