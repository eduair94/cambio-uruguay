// What /api/rentals reads through the per-worker memo (server/utils/rentalDirectoryData.ts, P5).
//
// Every pass is recorded with its role (the `comment` of the aggregation), so each test says
// exactly which passes a request costs: a scroll page served from a stored window costs the cards
// pass alone, a crafted deep page costs one window-0 build per worker, a barrio search reads its
// department and barrio counts from wider facets that are already stored.
import { isDeepStrictEqual } from 'node:util'
import mongoose from 'mongoose'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as rentals from '../../utils/rentals'
import {
  RENTAL_DIRECTORY_MAX_TIME_MS,
  createRentalDirectoryAggregate,
  createRentalDirectoryData,
  rentalDirectoryWindowOf,
  widenRentalBarrio,
  widenRentalLocation,
  type RentalAggregateChain,
  type RentalDirectoryInputs,
  type RentalDirectoryIo,
  type RentalDirectoryMemoRecord,
} from '../../server/utils/rentalDirectoryData'
import {
  rentalDirectoryItemsPipeline,
  rentalDirectoryKeysPipeline,
} from '../../server/utils/rentalDirectoryOrder'
import {
  RentalMemoBusyError,
  createRentalMemo,
  rentalMemoKey,
  type RentalMemo,
} from '../../server/utils/rentalMemo'

type Stage = Record<string, any>

/** Letters only: a fixture `key` with digits reads as a secret to the repository's scanner. */
const letters = (i: number) =>
  [Math.floor(i / 676) % 26, Math.floor(i / 26) % 26, i % 26]
    .map(code => String.fromCharCode(97 + code))
    .join('')
const inventoryOf = (size: number) => Array.from({ length: size }, (_, i) => `qa-${letters(i)}`)

interface Pass {
  role: string
  pipeline: Stage[]
  allowDiskUse?: boolean
  maxTimeMS?: number
}

interface HarnessOptions {
  /** The search's properties, in its order. */
  inventory?: string[]
  /** Passes of these roles never answer. */
  hold?: string[]
  /** Passes of these roles fail with this error. */
  fail?: { role: string; error: unknown }
  memo?: RentalMemo
  random?: () => number
  /** Run every pass for real instead of the stubs. */
  execute?: (pipeline: Stage[], pass: Pass) => Promise<unknown[]>
}

const FACET_DEPARTMENTS = [
  { _id: 'Montevideo', count: 30 },
  { _id: 'Canelones', count: 12 },
]
const FACET_BARRIOS = [
  { _id: 'Pocitos', count: 9 },
  { _id: 'Cordón', count: 4 },
]

/** The stub answer of a pass, read from the pipeline the module built. */
function stubAnswer(pass: Pass, inventory: string[]): unknown[] {
  const { role, pipeline } = pass
  if (role === 'win') {
    const facet = pipeline.at(-1)?.$facet
    const tail: Stage[] = facet ? facet.keys : pipeline
    const skip = tail.find(stage => stage.$skip !== undefined)!.$skip as number
    const limit = tail.find(stage => stage.$limit !== undefined)!.$limit as number
    const keys = inventory.slice(skip, skip + limit).map(key => ({ key }))
    return facet ? [{ n: inventory.length ? [{ n: inventory.length }] : [], keys }] : keys
  }
  if (role === 'cards') {
    const keys: string[] = pipeline[0]!.$match.key.$in
    // Mongo's own order is the page's too; reversed so the module has to reorder.
    return [...keys].reverse().map(key => ({ key, offers: [] }))
  }
  if (role === 'legacy') return [{ key: 'qa-single-pass', offers: [] }]
  if (role === 'facet') {
    const facet = pipeline.at(-1)!.$facet
    return [
      {
        total: [{ total: inventory.length }],
        types: [{ _id: 'apartamento', count: inventory.length }],
        sources: [
          { _id: 'infocasas', count: 5 },
          { _id: 'casasweb', count: 2 },
        ],
        price: [{ max: 90_000 }],
        median: [{ median: 25_000.4 }],
        ...(facet.departments ? { departments: FACET_DEPARTMENTS } : {}),
        ...(facet.neighborhoods ? { neighborhoods: FACET_BARRIOS } : {}),
      },
    ]
  }
  if (role === 'dept') return [{ _id: 'Montevideo', count: 7 }]
  if (role === 'barrio') return [{ _id: 'Malvín', count: 3 }]
  throw new Error(`unexpected pass ${role}`)
}

function harness(options: HarnessOptions = {}) {
  let inventory = options.inventory ?? inventoryOf(250)
  const passes: Pass[] = []
  const start = (pipeline: Stage[]): RentalAggregateChain => {
    const pass: Pass = { role: '?', pipeline }
    passes.push(pass)
    const chain: RentalAggregateChain = {
      allowDiskUse: value => {
        pass.allowDiskUse = value
        return chain
      },
      option: value => {
        pass.maxTimeMS = value.maxTimeMS
        pass.role = value.comment.replace(/^rentals:/, '')
        return chain
      },
      collation: () => {
        if (options.hold?.includes(pass.role)) return new Promise(() => {})
        if (options.fail?.role === pass.role) return Promise.reject(options.fail.error)
        if (options.execute) return options.execute(pipeline, pass)
        return Promise.resolve(stubAnswer(pass, inventory))
      },
    }
    return chain
  }
  const memo =
    options.memo ??
    createRentalMemo({
      now: () => Date.now(),
      random: options.random ?? (() => 0.5),
      schedule: () => () => {},
      log: () => {},
    })
  const availability = { excludedAdvertIds: () => [], byAdvertId: new Map() }
  const io: RentalDirectoryIo = {
    connect: async () => {},
    loadAvailability: async () => availability as never,
    loadMeta: async () => ({ usdUyu: 40 }) as never,
    loadRentalServiceZoneIds: async () => ['Pocitos'],
  }
  const data = createRentalDirectoryData({
    aggregate: createRentalDirectoryAggregate(start as never),
    memo,
    now: () => Date.now(),
    io,
  })
  const inputs = (
    input: Record<string, unknown> = {},
    extra: Partial<RentalDirectoryInputs> = {}
  ): RentalDirectoryInputs => ({
    query: rentals.normalizeRentalQuery(input),
    usdUyu: 40,
    serviceZones: undefined,
    excluded: [],
    ...extra,
  })
  const roles = () => passes.map(pass => pass.role)
  return {
    data,
    memo,
    passes,
    roles,
    inputs,
    setInventory: (next: string[]) => {
      inventory = next
    },
    /** The roles issued by `run`, alone. */
    async issued<T>(run: () => Promise<T>) {
      const before = passes.length
      const result = await run()
      return { result, roles: passes.slice(before).map(pass => pass.role) }
    },
  }
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-20T12:00:00.000Z'))
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('the windows of the order', () => {
  it('maps a page to its window and its place in it', () => {
    expect(rentalDirectoryWindowOf(1, 24)).toEqual({ w: 0, offset: 0, size: 480 })
    expect(rentalDirectoryWindowOf(20, 24)).toEqual({ w: 0, offset: 456, size: 480 })
    expect(rentalDirectoryWindowOf(21, 24)).toEqual({ w: 1, offset: 0, size: 480 })
    expect(rentalDirectoryWindowOf(101, 6)).toEqual({ w: 5, offset: 0, size: 120 })
  })

  it('serves a page of an empty memo with exactly a window pass and a cards pass', async () => {
    const h = harness()
    const records: RentalDirectoryMemoRecord[] = []
    const page = await h.data.page(h.inputs({ page: '3' }), records)
    expect(h.roles()).toEqual(['win', 'cards'])
    const [win, cards] = h.passes
    // Window 0: the whole 480 keys and the count, in one pass that may spill to disk.
    const tail = win!.pipeline.at(-1)!.$facet
    expect(tail.n).toEqual([{ $count: 'n' }])
    expect(tail.keys.find((stage: Stage) => stage.$skip !== undefined)).toEqual({ $skip: 0 })
    expect(tail.keys.find((stage: Stage) => stage.$limit !== undefined)).toEqual({ $limit: 480 })
    expect(win!.allowDiskUse).toBe(true)
    expect(cards!.allowDiskUse).toBe(false)
    expect(win!.maxTimeMS).toBe(RENTAL_DIRECTORY_MAX_TIME_MS.win)
    expect(cards!.maxTimeMS).toBe(RENTAL_DIRECTORY_MAX_TIME_MS.cards)
    // The page is the third slice of 24, in the window's order.
    const expected = inventoryOf(250).slice(48, 72)
    expect(cards!.pipeline[0]!.$match.key).toEqual({ $in: expected })
    expect(page.items.map(item => item.key)).toEqual(expected)
    // The count of the very pass that ordered the page.
    expect(page.total).toBe(250)
    expect(records).toEqual([{ kind: 'win', state: 'miss' }])
  })

  it('serves every other page of the window from memory: the cards pass alone', async () => {
    const h = harness()
    await h.data.page(h.inputs({ page: '1' }), [])
    for (const page of ['2', '5', '10', '11']) {
      const records: RentalDirectoryMemoRecord[] = []
      const { roles, result } = await h.issued(() => h.data.page(h.inputs({ page }), records))
      expect(roles).toEqual(['cards'])
      expect(records).toEqual([{ kind: 'win', state: 'hit' }])
      // Page 11 is the last: 250 − 10 × 24.
      expect(result.items).toHaveLength(page === '11' ? 10 : 24)
      expect(result.total).toBe(250)
    }
    // Another order is another window.
    const { roles } = await h.issued(() => h.data.page(h.inputs({ sort: 'precio' }), []))
    expect(roles).toEqual(['win', 'cards'])
  })

  it('never calls a facet function for a page, even while a facet build never answers', async () => {
    // (Holding three passes would fill the memo's three build slots: that is the semaphore's
    // business, tests/unit/rentalMemo.test.ts.)
    const h = harness({ hold: ['facet'] })
    void h.data.facets(h.inputs({ department: 'Montevideo', neighborhood: 'Pocitos' }), [])
    await settle()
    const page = await h.data.page(
      h.inputs({ department: 'Montevideo', neighborhood: 'Pocitos', page: '2' }),
      []
    )
    expect(page.items).toHaveLength(24)
    expect(page.total).toBe(250)
    expect(h.roles().filter(role => role === 'win' || role === 'cards')).toEqual(['win', 'cards'])
  })

  it('clamps a page past the end of a stored count without running anything', async () => {
    const h = harness({ inventory: inventoryOf(50) })
    await h.data.page(h.inputs({}), [])
    for (const page of ['4', '30', '90', '500']) {
      const records: RentalDirectoryMemoRecord[] = []
      const { roles, result } = await h.issued(() => h.data.page(h.inputs({ page }), records))
      expect(roles, page).toEqual([])
      expect(result).toEqual({ items: [], total: 50 })
      expect(records).toEqual([{ kind: 'win', state: 'hit' }])
    }
    // The last page still has its cards.
    const last = await h.issued(() => h.data.page(h.inputs({ page: '3' }), []))
    expect(last.roles).toEqual(['cards'])
    expect(last.result.items).toHaveLength(2)
  })

  it('answers a crafted page=10000 with one window-0 build at most, however often it is asked', async () => {
    const h = harness()
    const first = await h.data.page(h.inputs({ page: '10000', parts: 'items' }), [])
    const second = await h.data.page(h.inputs({ page: '10000', parts: 'items' }), [])
    expect(h.roles()).toEqual(['win'])
    expect(h.passes[0]!.pipeline.at(-1)!.$facet.keys).toContainEqual({ $skip: 0 })
    expect(first).toEqual({ items: [], total: 250 })
    expect(second).toEqual({ items: [], total: 250 })
    // At the same instant too: the two share the one build.
    const other = harness()
    const both = await Promise.all([
      other.data.page(other.inputs({ page: '10000' }), []),
      other.data.page(other.inputs({ page: '10000' }), []),
    ])
    expect(other.roles()).toEqual(['win'])
    expect(both).toEqual([
      { items: [], total: 250 },
      { items: [], total: 250 },
    ])
  })

  it('reads window 0 first for a page past window 4, then builds its own window once', async () => {
    const inventory = inventoryOf(3000)
    const h = harness({ inventory })
    const records: RentalDirectoryMemoRecord[] = []
    const page = await h.data.page(h.inputs({ page: '101' }), records)
    expect(h.roles()).toEqual(['win', 'win', 'cards'])
    // Window 0 counts; window 5 does not, and starts at 5 × 480.
    expect(h.passes[0]!.pipeline.at(-1)!.$facet).toBeTruthy()
    expect(h.passes[1]!.pipeline.at(-1)).toEqual({ $project: { _id: 0, key: 1 } })
    expect(h.passes[1]!.pipeline).toContainEqual({ $skip: 2400 })
    expect(h.passes[1]!.pipeline).toContainEqual({ $limit: 480 })
    expect(page.items.map(item => item.key)).toEqual(inventory.slice(2400, 2424))
    expect(page.total).toBe(3000)
    expect(records).toEqual([
      { kind: 'win', state: 'miss' },
      { kind: 'win', state: 'miss' },
    ])
    // The deep window stores the count it was clamped by: window 0's. Its key is chained to its
    // predecessor's build time, 0 here because window 4 is not stored.
    const deepKey = `${rentalMemoKey('win', rentals.normalizeRentalQuery({}), {
      w: 5,
      zones: '',
      excluded: '',
    })}@0`
    expect(h.memo.peek<{ keys: string[]; n: number }>('win', deepKey)?.value.n).toBe(3000)
    // Its repeat, and the next page of the same window: the cards pass alone.
    for (const next of ['101', '102']) {
      const { roles } = await h.issued(() => h.data.page(h.inputs({ page: next }), []))
      expect(roles).toEqual(['cards'])
    }
    // With window 0 stored, another deep window builds only itself.
    const deeper = await h.issued(() => h.data.page(h.inputs({ page: '121' }), []))
    expect(deeper.roles).toEqual(['win', 'cards'])
  })

  it('never skips a property at a window boundary after a harvest and the warm-up', async () => {
    // 13:44 someone scrolls to page 21: window 1 of the default search is built.
    const old = inventoryOf(2000)
    const h = harness({ inventory: old })
    await h.data.page(h.inputs({ page: '21' }), [])
    // 13:47 the hourly harvest publishes 30 homes; in the default order they go on top.
    vi.setSystemTime(Date.now() + 3 * 60_000)
    const fresh = Array.from({ length: 30 }, (_, i) => `qa-nueva-${letters(i)}`)
    h.setInventory([...fresh, ...old])
    // 13:51 the warm-up forces window 0, and only window 0.
    vi.setSystemTime(Date.now() + 4 * 60_000)
    await h.data.warm({})
    // 13:52 a visitor scrolls pages 1 to 21.
    vi.setSystemTime(Date.now() + 60_000)
    const seen = new Set<string>()
    for (let page = 1; page <= 21; page++) {
      const answer = await h.data.page(h.inputs({ page: String(page) }), [])
      answer.items.forEach(item => seen.add(item.key))
    }
    // A repeat is fine (the feed drops it by key); a property never shown is not.
    const top = [...fresh, ...old].slice(0, 21 * 24)
    expect(top.filter(key => !seen.has(key))).toEqual([])
  })

  it('rebuilds a deep window after the window before it was rebuilt, not on its own clock', async () => {
    const h = harness({ inventory: inventoryOf(3000) })
    await h.data.page(h.inputs({ page: '101' }), [])
    await h.data.page(h.inputs({ page: '121' }), [])
    // Both windows soft-expired, still servable: page 101 is served stale and window 5 is rebuilt
    // in the background.
    vi.setSystemTime(Date.now() + 6 * 60_000)
    await h.data.page(h.inputs({ page: '101' }), [])
    for (let i = 0; i < 5; i++) await settle()
    // Window 6 was built from the window 5 that is gone: it is rebuilt before it answers.
    const records: RentalDirectoryMemoRecord[] = []
    const { roles } = await h.issued(() => h.data.page(h.inputs({ page: '121' }), records))
    expect(records).toEqual([
      { kind: 'win', state: 'hit' },
      { kind: 'win', state: 'miss' },
    ])
    expect(roles).toEqual(['win', 'cards'])
  })

  it('stores a window of 480 keys well under its cap, weighed by its keys', async () => {
    const h = harness({ inventory: inventoryOf(600) })
    await h.data.page(h.inputs({}), [])
    const stats = h.memo.stats().win
    expect(stats.entries).toBe(1)
    const keyBytes = 480 * (2 * 'qa-aaa'.length + 32)
    // 64 + the keys, plus the memo's own per-entry overhead (server/utils/rentalMemo.ts).
    expect(stats.bytes).toBeGreaterThanOrEqual(64 + keyBytes)
    expect(stats.bytes).toBeLessThan(64 + keyBytes + 1024)
  })

  it('answers a timeout or a refused build with the error, and any other failure with the single pass', async () => {
    const timeout = Object.assign(new Error('operation exceeded time limit'), {
      code: 50,
      codeName: 'MaxTimeMSExpired',
    })
    const timedOut = harness({ fail: { role: 'win', error: timeout } })
    await expect(timedOut.data.page(timedOut.inputs({}), [])).rejects.toBe(timeout)
    expect(timedOut.roles()).toEqual(['win'])

    const busyMemo = createRentalMemo({ now: () => Date.now(), log: () => {} })
    busyMemo.get = async () => {
      throw new RentalMemoBusyError()
    }
    const busy = harness({ memo: busyMemo })
    await expect(busy.data.page(busy.inputs({}), [])).rejects.toBeInstanceOf(RentalMemoBusyError)
    expect(busy.roles()).toEqual([])

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const broken = harness({ fail: { role: 'win', error: new Error('cursor killed') } })
    const page = await broken.data.page(broken.inputs({ page: '2' }), [])
    expect(broken.roles()).toEqual(['win', 'legacy'])
    expect(page).toEqual({ items: [{ key: 'qa-single-pass', offers: [] }], total: null })
    expect(warn.mock.calls.map(call => call[0])).toEqual(['[api/rentals] fallback'])
    // The fallback is the single pass unchanged: the page of the whole search, may spill to disk.
    const legacy = broken.passes.find(pass => pass.role === 'legacy')!
    expect(legacy.allowDiskUse).toBe(true)
    expect(legacy.pipeline).toContainEqual({ $skip: 24 })
    // Nothing failed is stored: the next request builds again.
    const again = await broken.issued(() => broken.data.page(broken.inputs({ page: '2' }), []))
    expect(again.roles).toEqual(['win', 'legacy'])
  })
})

describe('the facets', () => {
  it('reads one facet pass for the directory, departments and barrios folded in', async () => {
    const h = harness()
    const records: RentalDirectoryMemoRecord[] = []
    const counts = await h.data.facets(h.inputs({ sort: 'precio' }), records)
    expect(h.roles()).toEqual(['facet'])
    expect(counts).toEqual({
      total: 250,
      medianUyu: 25_000,
      facets: {
        departments: [
          { value: 'Montevideo', count: 30 },
          { value: 'Canelones', count: 12 },
        ],
        neighborhoods: [
          { value: 'Pocitos', count: 9 },
          { value: 'Cordón', count: 4 },
        ],
        types: [{ value: 'apartamento', count: 250 }],
        sources: [
          { value: 'infocasas', count: 5 },
          { value: 'casasweb', count: 2 },
        ],
        priceMaxUyu: 90_000,
      },
    })
    expect(records).toEqual([{ kind: 'facet', state: 'miss' }])
    // The order of the same search does not change its counts: one entry for every sort.
    const again = await h.issued(() => h.data.facets(h.inputs({ sort: 'metros' }), []))
    expect(again.roles).toEqual([])
  })

  it('reads Pocitos by price with one pass when the directory and Montevideo facets are stored', async () => {
    const h = harness()
    const directory = await h.data.facets(h.inputs({}), [])
    const montevideo = await h.data.facets(h.inputs({ department: 'Montevideo' }), [])
    // Montevideo already reads its departments from the directory's facet.
    expect(h.roles()).toEqual(['facet', 'facet'])
    expect(montevideo.facets.departments).toEqual(directory.facets.departments)
    const records: RentalDirectoryMemoRecord[] = []
    const { roles, result } = await h.issued(() =>
      h.data.facets(
        h.inputs({ department: 'Montevideo', neighborhood: 'Pocitos', sort: 'precio' }),
        records
      )
    )
    // Its own facet only: no `dept`, no `barrio` pass.
    expect(roles).toEqual(['facet'])
    expect(result.facets.departments).toEqual(directory.facets.departments)
    expect(result.facets.neighborhoods).toEqual(montevideo.facets.neighborhoods)
    expect([...records].sort((a, b) => a.state.localeCompare(b.state))).toEqual([
      { kind: 'facet', state: 'hit' },
      { kind: 'facet', state: 'hit' },
      { kind: 'facet', state: 'miss' },
    ])
  })

  it('without the wider facets, memoises the department and barrio passes under the wider search', async () => {
    const h = harness()
    const pocitos = await h.issued(() =>
      h.data.facets(h.inputs({ department: 'Montevideo', neighborhood: 'Pocitos' }), [])
    )
    expect([...pocitos.roles].sort()).toEqual(['barrio', 'dept', 'facet'])
    expect(pocitos.result.facets.departments).toEqual([{ value: 'Montevideo', count: 7 }])
    expect(pocitos.result.facets.neighborhoods).toEqual([{ value: 'Malvín', count: 3 }])
    // Cordón shares both: the same department counts, the same barrio counts of Montevideo.
    const cordon = await h.issued(() =>
      h.data.facets(h.inputs({ department: 'Montevideo', neighborhood: 'Cordón' }), [])
    )
    expect(cordon.roles).toEqual(['facet'])
    // And a department alone folds its barrios but reads its departments from the same entry.
    const montevideo = await h.issued(() =>
      h.data.facets(h.inputs({ department: 'Montevideo' }), [])
    )
    expect(montevideo.roles).toEqual(['facet'])
  })

  it('refreshes a stale wider facet in the background and serves it meanwhile', async () => {
    const h = harness()
    await h.data.facets(h.inputs({}), [])
    vi.setSystemTime(Date.now() + 301_000)
    const records: RentalDirectoryMemoRecord[] = []
    const counts = await h.data.facets(h.inputs({ department: 'Canelones' }), records)
    await settle()
    // Canelones' own facet, and the directory's refresh in the background: never a `dept` pass.
    expect(h.roles()).toEqual(['facet', 'facet', 'facet'])
    expect(counts.facets.departments).toEqual([
      { value: 'Montevideo', count: 30 },
      { value: 'Canelones', count: 12 },
    ])
    expect(records).toContainEqual({ kind: 'facet', state: 'stale' })
    // The refreshed entry is fresh again.
    const after = await h.issued(() => h.data.facets(h.inputs({ department: 'Canelones' }), []))
    expect(after.roles).toEqual([])
  })

  describe('the wider searches select exactly what the counts need', () => {
    const matrix: Array<Record<string, unknown>> = [
      { department: 'Montevideo' },
      { department: 'Montevideo', neighborhood: 'Pocitos' },
      { department: 'Montevideo', neighborhoods: 'Pocitos,Cordón' },
      { department: 'Montevideo', sinBarrios: 'Centro' },
      { department: 'Montevideo', neighborhood: 'Pocitos', sinBarrios: 'Centro' },
      { neighborhood: 'Pocitos' },
      { department: 'Maldonado', neighborhood: 'Punta del Este', pets: '1', priceMax: '40000' },
      { department: 'Canelones', bedrooms: '2', q: 'frente al mar', comodidades: 'piscina' },
      { department: 'Montevideo', monthlyMax: '30000', dueno: '1', currency: 'USD' },
      { department: 'Montevideo', dias: '7', bajo: '1', residencias: 'ocultar' },
      { department: 'Montevideo', sinPalabras: 'garaje', sinTipos: 'oficina', gc: '1' },
      { department: 'Montevideo', servicios: 'luz' },
      { department: 'Montevideo', neighborhood: 'Pocitos', availability: 'hide_any' },
      {
        department: 'Montevideo',
        neighborhood: 'Pocitos',
        sort: 'distancia',
        refLat: '-34.9',
        refLng: '-56.16',
      },
    ]
    it.each(matrix.map(input => [JSON.stringify(input), input]))('for %s', (_label, input) => {
      const query = rentals.normalizeRentalQuery(input as Record<string, unknown>)
      const zones = query.servicios?.length ? ['Pocitos', 'Cordón'] : undefined
      const own = rentals.buildRentalFilter(query, 10, 41.75, zones)
      const location = rentals.buildRentalFilter(widenRentalLocation(query), 10, 41.75, zones)
      const barrio = rentals.buildRentalFilter(widenRentalBarrio(query), 10, 41.75, zones)
      // `buildRentalFilter(widen(q)).filter` ≡ `buildRentalFilter(q).nonLocation`, and
      // `buildRentalFilter(widenBarrio(q)).filter` ≡ `buildRentalFilter(q).withoutNeighborhood`.
      expect(isDeepStrictEqual(location.filter, own.nonLocation)).toBe(true)
      expect(isDeepStrictEqual(barrio.filter, own.withoutNeighborhood)).toBe(true)
      // So the department (barrio) counts of the wider search's facet are the search's own.
      const excluded = ['rent:infocasas:ab']
      expect(rentals.rentalPublicStages(location.filter, 10, excluded)).toEqual(
        rentals.rentalPublicStages(own.nonLocation, 10, excluded)
      )
      expect(rentals.rentalPublicStages(barrio.filter, 10, excluded)).toEqual(
        rentals.rentalPublicStages(own.withoutNeighborhood, 10, excluded)
      )
      // And the wider searches fold what they are read for.
      expect(location.nonLocation).toEqual(location.filter)
      expect(barrio.withoutNeighborhood).toEqual(barrio.filter)
    })
  })
})

describe('the coverage of the catalogue', () => {
  it('is the default facet, and no coverage pass ever runs', async () => {
    const h = harness()
    // A fresh worker: nothing yet, and the default facet is built in the background slot.
    expect(h.data.coverage({ usdUyu: 40 })).toBeNull()
    await settle()
    expect(h.roles()).toEqual(['facet'])
    const builtAt = Date.now()
    const coverage = h.data.coverage({ usdUyu: 40 })
    expect(coverage).toEqual({
      computedAt: new Date(builtAt).toISOString(),
      properties: 250,
      sources: [
        { key: 'mercadolibre', properties: 0 },
        { key: 'infocasas', properties: 5 },
        { key: 'facebook', properties: 0 },
        { key: 'elpais', properties: 0 },
        { key: 'casasweb', properties: 2 },
        { key: 'tiktok', properties: 0 },
        { key: 'instagram', properties: 0 },
        { key: 'facebookreels', properties: 0 },
        { key: 'alquileresuy', properties: 0 },
      ],
    })
    // The default search's own request reads the same entry: no second pass.
    const own = await h.issued(() => h.data.facets(h.inputs({}), []))
    expect(own.roles).toEqual([])
    expect(own.result.total).toBe(coverage!.properties)
    // Nothing in this file ever issued the old pass: a `$facet` with a `properties` branch.
    expect(h.passes.every(pass => !pass.pipeline.at(-1)?.$facet?.properties)).toBe(true)
  })

  it('keeps the last value it computed while the default facet is gone, and rebuilds it at most once a minute', async () => {
    const h = harness()
    h.data.coverage({ usdUyu: 40 })
    await settle()
    const first = h.data.coverage({ usdUyu: 40 })
    expect(first?.properties).toBe(250)
    // Past the memo's 15-minute bound the entry is no longer served.
    vi.setSystemTime(Date.now() + 900_000)
    h.setInventory(inventoryOf(251))
    expect(h.data.coverage({ usdUyu: 40 })).toEqual(first)
    await settle()
    expect(h.roles()).toEqual(['facet', 'facet'])
    expect(h.data.coverage({ usdUyu: 40 })?.properties).toBe(251)
  })

  it('does not rebuild the absent default facet on every request', async () => {
    const h = harness({ hold: ['facet'] })
    for (let i = 0; i < 5; i++) expect(h.data.coverage({ usdUyu: 40 })).toBeNull()
    expect(h.roles()).toEqual(['facet'])
  })
})

describe('the keys of the memo', () => {
  it('change with the hidden adverts, for windows, facets, departments and barrios', async () => {
    const h = harness()
    const search = { department: 'Montevideo', neighborhood: 'Pocitos', availability: 'hide_any' }
    await h.data.page(h.inputs(search), [])
    await h.data.facets(h.inputs(search), [])
    expect([...h.roles()].sort()).toEqual(['barrio', 'cards', 'dept', 'facet', 'win'])
    // The same ids: nothing to rebuild.
    const same = await h.issued(async () => {
      await h.data.page(h.inputs(search), [])
      await h.data.facets(h.inputs(search), [])
    })
    expect(same.roles).toEqual(['cards'])
    // Someone reported an advert: every kind misses at once.
    const reported = h.inputs(search, { excluded: ['rent:infocasas:ab'] })
    const after = await h.issued(async () => {
      await h.data.page(reported, [])
      await h.data.facets(reported, [])
    })
    expect([...after.roles].sort()).toEqual(['barrio', 'cards', 'dept', 'facet', 'win'])
  })

  it('do not change at midnight UTC: nothing is rebuilt before answering', async () => {
    vi.setSystemTime(new Date('2026-11-20T23:59:50.000Z'))
    const h = harness()
    await h.data.page(h.inputs({ department: 'Montevideo' }), [])
    await h.data.facets(h.inputs({ department: 'Montevideo' }), [])
    vi.setSystemTime(new Date('2026-11-21T00:00:10.000Z'))
    const records: RentalDirectoryMemoRecord[] = []
    const { roles } = await h.issued(async () => {
      await h.data.page(h.inputs({ department: 'Montevideo', page: '2' }), records)
      await h.data.facets(h.inputs({ department: 'Montevideo' }), records)
    })
    expect(roles).toEqual(['cards'])
    expect(records.every(record => record.state === 'hit')).toBe(true)
  })

  it('rebuild an entry 15 minutes old before answering', async () => {
    const h = harness()
    await h.data.page(h.inputs({}), [])
    vi.setSystemTime(Date.now() + 900_000)
    const records: RentalDirectoryMemoRecord[] = []
    const { roles } = await h.issued(() => h.data.page(h.inputs({}), records))
    expect(roles).toEqual(['win', 'cards'])
    expect(records).toEqual([{ kind: 'win', state: 'miss' }])
  })

  it('let 100 entries built at one instant refresh spread over the jitter, one at a time', async () => {
    let seed = 7
    const random = () => {
      seed = (seed * 16_807) % 2_147_483_647
      return seed / 2_147_483_647
    }
    const tick = () => new Promise(resolve => setImmediate(resolve))
    let active = 0
    let maxActive = 0
    const startedAt: number[] = []
    const h = harness({
      random,
      execute: async (_pipeline, pass) => {
        const answer = stubAnswer(pass, inventoryOf(30))
        if (pass.role !== 'win') return answer
        active++
        maxActive = Math.max(maxActive, active)
        startedAt.push(Date.now())
        await tick()
        active--
        return answer
      },
    })
    const searches = Array.from({ length: 100 }, (_, i) =>
      h.inputs({ priceMax: String(20_000 + i) })
    )
    const t0 = Date.now()
    // Built one after the other, at one instant of the clock.
    for (const search of searches) await h.data.page(search, [])
    expect(startedAt).toHaveLength(100)
    startedAt.length = 0
    maxActive = 0
    const states = new Set<string>()
    for (let second = 260; second <= 340; second += 2) {
      vi.setSystemTime(t0 + second * 1000)
      for (const search of searches) {
        const records: RentalDirectoryMemoRecord[] = []
        await h.data.page(search, records)
        records.forEach(record => states.add(record.state))
      }
      // A released background slot starts the next refresh at once: this drains the queue.
      while (active > 0) await tick()
    }
    // Every entry refreshed once, in the background, never two windows at once...
    expect(startedAt).toHaveLength(100)
    expect(maxActive).toBe(1)
    expect(states).not.toContain('miss')
    // ...and not at the same instant: spread over the ±10 % of the 300 s TTL.
    const seconds = startedAt.map(at => Math.round((at - t0) / 1000))
    expect(Math.min(...seconds)).toBeGreaterThanOrEqual(270)
    expect(Math.max(...seconds)).toBeLessThanOrEqual(332)
    expect(new Set(seconds).size).toBeGreaterThanOrEqual(20)
  })
})

describe('the warm-up', () => {
  it('forces window 0 and the facet of a search in the background slot', async () => {
    const h = harness()
    await h.data.page(h.inputs({ department: 'Montevideo' }), [])
    await h.data.facets(h.inputs({ department: 'Montevideo' }), [])
    const before = h.passes.length
    await h.data.warm({ department: 'Montevideo' })
    // Rebuilt although fresh: the warm-up runs after the hourly harvest.
    expect(h.roles().slice(before).sort()).toEqual(['facet', 'win'])
    const warmed = h.passes.slice(before).find(pass => pass.role === 'win')!
    expect(warmed.allowDiskUse).toBe(true)
    expect(warmed.pipeline.at(-1)!.$facet.keys).toContainEqual({ $skip: 0 })
    // What a visitor asks next is served from the warmed entries.
    const next = await h.issued(async () => {
      await h.data.page(h.inputs({ department: 'Montevideo', page: '2' }), [])
      await h.data.facets(h.inputs({ department: 'Montevideo' }), [])
    })
    expect(next.roles).toEqual(['cards'])
  })

  it('reads the exchange rate and the hidden adverts as a request does', async () => {
    const h = harness()
    const loaded = await h.data.load(rentals.normalizeRentalQuery({ servicios: 'luz' }))
    expect(loaded.inputs.usdUyu).toBe(40)
    expect(loaded.inputs.excluded).toEqual([])
    expect(loaded.inputs.serviceZones).toEqual(['Pocitos'])
    const plain = await h.data.load(rentals.normalizeRentalQuery({}))
    expect(plain.inputs.serviceZones).toBeUndefined()
  })
})

// The windows against a real MongoDB, over synthetic `$documents` (no collection is created). Set
// RENTALS_TEST_MONGO_URI to a disposable localhost MongoDB ≥ 6 (CI sets none; production is 4.4).
const uri = process.env.RENTALS_TEST_MONGO_URI
describe.skipIf(!uri)('windows against the page pass on a real MongoDB (read-only)', () => {
  let client: mongoose.mongo.MongoClient
  const SIZE = 700
  beforeAll(async () => {
    if (!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\//.test(uri || ''))
      throw new Error('This check requires an isolated localhost Mongo URI')
    client = new mongoose.mongo.MongoClient(uri!, { serverSelectionTimeoutMS: 8_000 })
    await client.connect()
  })
  afterAll(async () => client?.close())

  const documents = () => {
    const today = new Date().toISOString().slice(0, 10)
    const base = Date.parse(`${today}T00:00:00Z`) / 1000
    return Array.from({ length: SIZE }, (_, i) => {
      const key = `montevideo-cordon-${letters(i)}`
      const price = 20_000 + (i % 37) * 500
      return {
        _id: mongoose.mongo.ObjectId.createFromTime(base - (i % 11) * 3_600 - i),
        key,
        title: 'Alquiler',
        propertyType: ['apartamento', 'casa', 'oficina'][i % 3],
        department: i % 4 === 3 ? 'Canelones' : 'Montevideo',
        neighborhood: i % 4 === 3 ? 'Atlántida' : 'Cordón',
        area: i % 9 === 0 ? null : 30 + (i % 50),
        latitude: -34.9 + (i % 13) * 0.002,
        longitude: -56.16 - (i % 7) * 0.003,
        lastSeen: today,
        firstSeen: today,
        freshAt: today,
        priceUyu: price,
        price,
        currency: 'UYU',
        sources: ['infocasas'],
        ...(i % 5 === 1 ? { priceDrop: { pct: (i % 4) + 1, at: today } } : {}),
        offers: [
          {
            source: 'infocasas',
            listingId: `infocasas:${letters(i)}`,
            url: `https://www.infocasas.com.uy/${letters(i)}`,
            title: 'Alquiler',
            price,
            priceUyu: price,
            currency: 'UYU',
            commonExpenses: i % 3 ? 2_000 : null,
            commonExpensesCurrency: 'UYU',
            lastSeen: today,
            firstSeen: today,
          },
        ],
      }
    })
  }

  it.each([
    'recientes',
    'baja',
    'precio',
    'precio-desc',
    'total',
    'precio-m2',
    'metros',
    'distancia',
  ])('sorted by %s, every page sliced from a window is the page pass', async sort => {
    const source = [{ $documents: documents() }]
    const run = (pipeline: Stage[], allowDiskUse = false) =>
      client
        .db()
        .aggregate([...source, ...pipeline], {
          allowDiskUse,
          collation: rentals.RENTAL_COLLATION,
          maxTimeMS: 30_000,
        })
        .toArray()
    const h = harness({ execute: (pipeline, pass) => run(pipeline, pass.allowDiskUse) })
    for (const filter of [{}, { department: 'Montevideo' }]) {
      const reference = sort === 'distancia' ? { refLat: '-34.9058', refLng: '-56.1913' } : {}
      const base = { ...filter, ...reference, sort, perPage: '6' }
      const query = rentals.normalizeRentalQuery(base)
      const days = rentals.RENTAL_STALE_DAYS
      const { filter: mongoFilter } = rentals.buildRentalFilter(query, days, 40)
      const publicStages = rentals.rentalPublicStages(mongoFilter, days, [])
      const offerStages = rentals.rentalOfferStages(query, 40)
      const [counted] = (await run([...publicStages, { $count: 'n' }])) as Array<{ n: number }>
      const n = counted!.n
      const lastPage = Math.ceil(n / 6)
      for (const page of [1, 2, 20, 21, 40, 100, 101, lastPage, lastPage + 1]) {
        const paged = { ...query, page }
        const answer = await h.data.page(h.inputs({ ...base, page: String(page) }), [])
        // The order: the keys pass of P3 for that one page.
        const keyRows = await run(
          rentalDirectoryKeysPipeline(paged, publicStages, offerStages, {
            skip: (page - 1) * 6,
            limit: 6,
          }),
          true
        )
        const label = `${JSON.stringify(filter)} page ${page}`
        expect(
          answer.items.map(item => item.key),
          label
        ).toEqual(keyRows.map(row => row.key))
        expect(answer.total, label).toBe(n)
        // The cards: the single pass's rows for that page.
        const single = await run(
          rentalDirectoryItemsPipeline(paged, publicStages, offerStages),
          true
        )
        expect(answer.items, label).toEqual(single)
      }
    }
  })
})
