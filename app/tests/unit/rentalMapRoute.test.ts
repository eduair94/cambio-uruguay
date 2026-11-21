// /api/rentals/mapa with its per-worker memo (spec P4): the REAL route file, transpiled and run in a
// VM with its IO stubbed, over a REAL createRentalMemo on a fake clock. What it pins:
// - a miss issues exactly one `map` and one `mapCount` aggregation, a hit none;
// - the lookup key is rentalMemoKey('map', …) with the excluded adverts and the service zones;
// - a point carries only the marker's fields (availability, key, lat, lng, distanceKm, price,
//   currency, neighborhood) and the availability is added when serving, never stored;
// - a failed or refused build stores nothing and answers 503 no-store, unless an entry under an
//   hour old exists, which is then served as `stale`;
// - x-rentals-memo / x-rentals-worker on every answer (the worker one on the 503 too).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as rentals from '../../utils/rentals'
import * as rentalAvailabilityShared from '../../utils/rentalAvailability'
import * as rentalDistance from '../../utils/rentalDistance'
import * as rentalPricePerM2 from '../../utils/rentalPricePerM2'
import * as cachedResponseHeader from '../../server/utils/cachedResponseHeader'
import * as rentalDirectoryOrder from '../../server/utils/rentalDirectoryOrder'
import * as rentalMemoModule from '../../server/utils/rentalMemo'
import type { RentalAvailabilitySummary } from '../../utils/rentalAvailability'

type Stage = Record<string, any>
const route = readFileSync(join(__dirname, '../../server/api/rentals/mapa.get.ts'), 'utf8')
const compiled = ts.transpileModule(route, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

const ALLOWED = new Set([
  'availability',
  'key',
  'lat',
  'lng',
  'distanceKm',
  'price',
  'currency',
  'neighborhood',
])

interface Pass {
  pipeline: Stage[]
  role: string
  allowDiskUse?: boolean
  maxTimeMS?: number
}

/** One row as the map pass's `$project` leaves it: marker fields plus sort keys. */
function row(key: string, extra: Record<string, unknown> = {}) {
  return {
    key,
    latitude: -34.9,
    longitude: -56.16,
    neighborhood: 'Pocitos',
    price: 20000,
    currency: 'UYU',
    priceUyu: 20000,
    freshAt: '2026-11-20',
    _rentalTier: 0,
    _rentalHour: 491_000,
    _rentalMix: 12345,
    ...extra,
  }
}

const DEFAULT_ROWS = [
  row('mvd-a', {
    matchingOffer: { price: 750, currency: 'USD', source: 'casasweb', listingId: 'cw1' },
  }),
  row('mvd-b', {
    matchingOffer: { price: 21000, currency: 'UYU', source: 'infocasas', listingId: 'ic2' },
  }),
  // No matchingOffer: the property's own (already derived) price and currency.
  row('mvd-c', { price: 900, currency: 'USD' }),
]

interface HarnessOptions {
  memo?: rentalMemoModule.RentalMemoOptions
}

/** A route instance over one real memo; `request()` answers like Nitro would, headers included. */
function harness(options: HarnessOptions = {}) {
  let clock = 1_000_000
  const memo = rentalMemoModule.createRentalMemo({
    now: () => clock,
    random: () => 0.5,
    // Deadlines never fire on their own here; nothing in these tests waits on the queue.
    schedule: () => () => {},
    log: () => {},
    ...options.memo,
  })
  const keys: string[] = []
  const tracked: rentalMemoModule.RentalMemo = {
    ...memo,
    get: (kind, key, build, opts) => {
      keys.push(key)
      return memo.get(kind, key, build, opts)
    },
  }
  const passes: Pass[] = []
  const state = {
    query: {} as Record<string, unknown>,
    rows: DEFAULT_ROWS as Array<Record<string, unknown>>,
    total: 7,
    located: 5,
    excluded: [] as string[],
    zones: [] as string[],
    byAdvertId: new Map<string, RentalAvailabilitySummary>(),
    fail: null as null | { role: string; error: unknown },
    metaReads: 0,
  }
  const dependencies: Record<string, unknown> = {
    '../../models/RentalListing': {
      RentalListingModel: {
        aggregate: (pipeline: Stage[]) => {
          const pass: Pass = { pipeline, role: '?' }
          passes.push(pass)
          const chain = {
            allowDiskUse: (enabled: boolean) => {
              pass.allowDiskUse = enabled
              return chain
            },
            option: (value: { maxTimeMS?: number; comment?: string }) => {
              pass.maxTimeMS = value.maxTimeMS
              pass.role = String(value.comment ?? '').replace(/^rentals:/, '')
              return chain
            },
            collation: async () => {
              if (state.fail?.role === pass.role) throw state.fail.error
              if (pass.role === 'mapCount') return [{ total: state.total }]
              if (pass.role === 'map')
                return [{ located: [{ n: state.located }], points: state.rows }]
              throw new Error(`unexpected role ${pass.role}`)
            },
          }
          return chain
        },
      },
    },
    '../../models/RentalMeta': {
      RentalMetaModel: {
        findOne: () => ({
          select: () => ({
            lean: async () => {
              state.metaReads++
              return { usdUyu: 40 }
            },
          }),
        }),
      },
    },
    '../../utils/db': { connectDb: async () => {} },
    '../../utils/rentalZoneServices': { loadRentalServiceZoneIds: async () => state.zones },
    '../../utils/rentalAvailability': {
      loadRentalAvailabilityIndex: async () => ({
        excludedAdvertIds: () => state.excluded,
        byAdvertId: state.byAdvertId,
      }),
    },
    '../../utils/cachedResponseHeader': cachedResponseHeader,
    '../../utils/rentalDirectoryOrder': rentalDirectoryOrder,
    '../../utils/rentalMemo': { ...rentalMemoModule, rentalMemo: tracked },
    '../../../utils/rentalAvailability': rentalAvailabilityShared,
    '../../../utils/rentalDistance': rentalDistance,
    '../../../utils/rentalPricePerM2': rentalPricePerM2,
    '../../../utils/rentals': rentals,
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
    getQuery: () => state.query,
    setResponseHeader: (event: any, name: string, value: string) => {
      event.headers[name] = value
    },
    createError: ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
      Object.assign(new Error(statusMessage), { statusCode }),
    console: { ...console, error: () => {}, info: () => {} },
  })

  async function request() {
    const headers: Record<string, string> = {}
    const event = {
      headers,
      context: {} as Record<string, unknown>,
      node: {
        res: {
          headersSent: false,
          writableEnded: false,
          setHeader: (name: string, value: string) => {
            headers[name] = value
          },
        },
      },
    }
    const before = passes.length
    try {
      const body = (await module.exports.default!(event)) as rentals.RentalMapResponse
      return { body, headers, event, error: null, passes: passes.slice(before) }
    } catch (error) {
      return { body: null, headers, event, error: error as any, passes: passes.slice(before) }
    }
  }

  return {
    memo,
    keys,
    passes,
    state,
    request,
    advance: (ms: number) => {
      clock += ms
    },
    /** Let a background refresh (started by a stale hit) run to its end. */
    settle: () => new Promise(resolve => setTimeout(resolve, 0)),
  }
}

const roles = (passes: Pass[]) => passes.map(pass => pass.role).sort()

// The pm2 instance id the worker header carries (rentalWorkerId reads it on every call).
const instance = process.env.NODE_APP_INSTANCE
beforeAll(() => {
  process.env.NODE_APP_INSTANCE = '1'
})
afterAll(() => {
  if (instance === undefined) delete process.env.NODE_APP_INSTANCE
  else process.env.NODE_APP_INSTANCE = instance
})

describe('the map memo', () => {
  it('a miss issues one map and one count aggregation; a hit issues none', async () => {
    const map = harness()
    const first = await map.request()
    expect(first.error).toBeNull()
    expect(roles(first.passes)).toEqual(['map', 'mapCount'])
    expect(first.headers['x-rentals-memo']).toBe('map=miss')
    expect(first.headers['x-rentals-worker']).toBe('1')
    expect(first.headers['cache-control']).toBe('public, max-age=30, s-maxage=60')
    expect(first.body).toMatchObject({ total: 7, located: 5, shown: 3, limit: 3000 })

    map.advance(60_000)
    const second = await map.request()
    expect(second.passes).toEqual([])
    expect(second.headers['x-rentals-memo']).toBe('map=hit')
    expect(second.headers['x-rentals-worker']).toBe('1')
    expect(second.body).toEqual(first.body)
    // The exchange rate is read only to build: a hit asks nothing of the database.
    expect(map.state.metaReads).toBe(1)
    // The request's own record, for the outer wrapper (P7 adds the facet lookup to it).
    expect(second.event.context.rentalsMemo).toEqual([{ kind: 'map', state: 'hit' }])
  })

  it('chains the role, the time bound and the disk the way the list does', async () => {
    const map = harness()
    const { passes } = await map.request()
    const byRole = Object.fromEntries(passes.map(pass => [pass.role, pass]))
    expect(byRole.map).toMatchObject({ allowDiskUse: true, maxTimeMS: 20_000 })
    expect(byRole.mapCount).toMatchObject({ allowDiskUse: false, maxTimeMS: 20_000 })
    expect(byRole.map!.pipeline.at(-1)).toHaveProperty('$facet.located', [{ $count: 'n' }])
    expect(byRole.mapCount!.pipeline.at(-1)).toEqual({ $count: 'total' })
  })

  it('looks up rentalMemoKey("map", …) with the excluded adverts and the service zones', async () => {
    const map = harness()
    map.state.query = { department: 'Montevideo', sort: 'precio', servicios: 'luz', page: '4' }
    map.state.excluded = ['rent:infocasas:2', 'rent:infocasas:1']
    map.state.zones = ['zone-b', 'zone-a']
    await map.request()
    const query = rentals.normalizeRentalQuery(map.state.query)
    expect(map.keys).toEqual([
      rentalMemoModule.rentalMemoKey('map', query, {
        zones: rentalMemoModule.hashIds(map.state.zones),
        excluded: rentalMemoModule.hashIds(map.state.excluded),
      }),
    ])
  })

  it('another list of excluded adverts is another entry', async () => {
    const map = harness()
    await map.request()
    map.state.excluded = ['rent:infocasas:ic2']
    const reported = await map.request()
    expect(roles(reported.passes)).toEqual(['map', 'mapCount'])
    expect(reported.headers['x-rentals-memo']).toBe('map=miss')
    // And the original list is still the first entry.
    map.state.excluded = []
    expect((await map.request()).headers['x-rentals-memo']).toBe('map=hit')
  })

  it('serves an entry past its soft TTL as stale and refreshes it once in the background', async () => {
    const map = harness()
    await map.request()
    map.advance(400_000)
    map.state.rows = [row('mvd-new')]
    const stale = await map.request()
    expect(stale.headers['x-rentals-memo']).toBe('map=stale')
    expect(stale.headers['x-rentals-worker']).toBe('1')
    expect(stale.body!.points.map(point => point.key)).toEqual(['mvd-a', 'mvd-b', 'mvd-c'])
    await map.settle()
    const passes = map.passes.length
    const fresh = await map.request()
    expect(fresh.headers['x-rentals-memo']).toBe('map=hit')
    expect(fresh.body!.points.map(point => point.key)).toEqual(['mvd-new'])
    expect(map.passes.length).toBe(passes)
  })
})

describe('the map points', () => {
  it('carry only the marker fields, with the offer Mongo chose', async () => {
    const map = harness()
    map.state.query = { sort: 'distancia', refLat: '-34.9', refLng: '-56.17', refLabel: 'Casa' }
    map.state.rows = DEFAULT_ROWS.map((point, i) => ({
      ...point,
      distanceKm: i === 2 ? null : i + 0.5,
      _rentalDistanceUnknown: i === 2,
    }))
    map.state.byAdvertId.set('rent:casasweb:cw1', {
      count: 2,
      lastReportedAt: '2026-11-19',
      status: 'unconfirmed',
    })
    const { body } = await map.request()
    for (const point of body!.points)
      for (const field of Object.keys(point)) expect(ALLOWED.has(field), field).toBe(true)
    expect(Object.keys(body!.points[0]!).sort()).toEqual([...ALLOWED].sort())
    expect(body!.points).toEqual([
      {
        availability: { count: 2, lastReportedAt: '2026-11-19', status: 'unconfirmed' },
        key: 'mvd-a',
        lat: -34.9,
        lng: -56.16,
        distanceKm: 0.5,
        price: 750,
        currency: 'USD',
        neighborhood: 'Pocitos',
      },
      {
        key: 'mvd-b',
        lat: -34.9,
        lng: -56.16,
        distanceKm: 1.5,
        price: 21000,
        currency: 'UYU',
        neighborhood: 'Pocitos',
      },
      {
        key: 'mvd-c',
        lat: -34.9,
        lng: -56.16,
        distanceKm: null,
        price: 900,
        currency: 'USD',
        neighborhood: 'Pocitos',
      },
    ])
  })

  it('has no distance without a reference point and drops the 0,0 of the feeds', async () => {
    const map = harness()
    map.state.rows = [
      ...DEFAULT_ROWS,
      row('null-island', { latitude: 0, longitude: 0 }),
      // A missing field (NaN), as the old mapper; the located filter already requires a number.
      row('no-latitude', { latitude: undefined }),
    ]
    const { body } = await map.request()
    expect(body!.points.map(point => point.key)).toEqual(['mvd-a', 'mvd-b', 'mvd-c'])
    expect(body!.shown).toBe(3)
    for (const point of body!.points) expect(point).not.toHaveProperty('distanceKm')
    expect(body!.points[2]).toMatchObject({ price: 900, currency: 'USD' })
  })

  it('adds availability when serving and never stores it', async () => {
    const map = harness()
    const query = rentals.normalizeRentalQuery({})
    const key = rentalMemoModule.rentalMemoKey('map', query, { zones: '', excluded: '' })
    const first = await map.request()
    // Without reports the stored, frozen array goes out as it is.
    expect(Object.isFrozen(first.body!.points)).toBe(true)
    expect(Object.isFrozen(first.body!.points[0])).toBe(true)
    for (const point of first.body!.points) expect(point).not.toHaveProperty('availability')

    const summary: RentalAvailabilitySummary = {
      count: 1,
      lastReportedAt: '2026-11-20',
      status: 'unconfirmed',
    }
    map.state.byAdvertId.set('rent:infocasas:ic2', summary)
    const second = await map.request()
    expect(second.headers['x-rentals-memo']).toBe('map=hit')
    expect(second.body!.points.map(point => point.availability)).toEqual([
      undefined,
      summary,
      undefined,
    ])
    const stored = map.memo.peek<{ points: rentals.RentalMapPoint[] }>('map', key)!.value
    for (const point of stored.points) expect(point).not.toHaveProperty('availability')
    expect(stored.points).toBe(first.body!.points)
  })

  it('weighs an entry as three times its JSON plus 1 KB', async () => {
    const map = harness({ memo: { entryOverheadBytes: 0 } })
    const { body } = await map.request()
    const key = rentalMemoModule.rentalMemoKey('map', rentals.normalizeRentalQuery({}), {
      zones: '',
      excluded: '',
    })
    const entry = map.memo.peek('map', key)!
    // The memo charges the reported weight plus twice its own id (`map <key>`).
    const id = `map ${key}`
    expect(entry.weight).toBe(3 * JSON.stringify(body!.points).length + 1024 + 2 * id.length)
  })
})

describe('the map when the database fails', () => {
  it('answers 503 no-store with the worker header and stores nothing', async () => {
    const map = harness()
    map.state.fail = { role: 'map', error: new Error('connection reset') }
    const failed = await map.request()
    expect(failed.error).toMatchObject({ statusCode: 503 })
    expect(failed.headers['cache-control']).toBe('no-store')
    expect(failed.headers['x-rentals-worker']).toBe('1')
    expect(failed.headers).not.toHaveProperty('x-rentals-memo')
    expect(map.memo.stats().map).toMatchObject({ entries: 0, failures: 1 })

    map.state.fail = null
    const retried = await map.request()
    expect(retried.error).toBeNull()
    expect(roles(retried.passes)).toEqual(['map', 'mapCount'])
    expect(retried.headers['x-rentals-memo']).toBe('map=miss')
  })

  it('answers 503 when the count pass fails, too', async () => {
    const map = harness()
    map.state.fail = { role: 'mapCount', error: Object.assign(new Error('slow'), { code: 50 }) }
    const failed = await map.request()
    expect(failed.error).toMatchObject({ statusCode: 503 })
    expect(map.memo.stats().map.entries).toBe(0)
  })

  it('answers 503 when the memo refuses the build and holds nothing', async () => {
    const map = harness({ memo: { concurrency: 0, maxQueuedRequests: 0 } })
    const refused = await map.request()
    expect(refused.error).toMatchObject({ statusCode: 503 })
    expect(refused.passes).toEqual([])
    expect(refused.headers['cache-control']).toBe('no-store')
    expect(refused.headers['x-rentals-worker']).toBe('1')
    expect(map.memo.stats().map.busy).toBe(1)
  })

  it('serves the entry under an hour old as stale when its rebuild fails', async () => {
    const map = harness()
    const first = await map.request()
    // Past the 15-minute serve bound: the caller waits for a rebuild, and that rebuild fails.
    map.advance(1_000_000)
    map.state.fail = { role: 'map', error: new Error('connection reset') }
    const fallback = await map.request()
    expect(fallback.error).toBeNull()
    expect(fallback.headers['x-rentals-memo']).toBe('map=stale')
    expect(fallback.headers['cache-control']).toBe('public, max-age=30, s-maxage=60')
    expect(fallback.body).toEqual(first.body)
  })
})
