/**
 * What /api/rentals reads from `rentallistings`, through the per-worker memo (P5).
 *
 * Until 2026-11-20 every uncached request re-derived the whole public inventory for each part of
 * the answer: the order of its page, its facets, its department and barrio counts, the coverage.
 * Here each of those is a memo entry (server/utils/rentalMemo.ts), so:
 *
 * - **The order is kept per 20-page WINDOW** (`perPage × 20` keys, kind `win`), each with the count
 *   of the search from the same pass. A scroll page is a slice of a stored window plus a cards pass
 *   of 24 documents by key; only the first page of each window pays the whole-search pass.
 * - **The facets are kept per filter** (kind `facet`), and the department and barrio counts of a
 *   located search are taken from the facet of the same search without its location, when that one
 *   is stored: Pocitos reads Montevideo's barrio counts and the whole directory's department counts.
 * - **The coverage of the catalogue is the default search's facet**, so its own pass is gone.
 *
 * Every aggregation of the directory goes through ONE helper here, with its role in the `comment`
 * (mongod's slow-op log counts them by role) and its `maxTimeMS`. The cards themselves (prices,
 * photos) are read fresh on every request: only the order, the counts and the facets are memoised,
 * at most 15 minutes old while the database answers (server/utils/rentalMemo.ts), and keyed by the
 * hidden adverts and the service zones too, so a report shows on the next request.
 *
 * Pure apart from the default instance at the bottom: the aggregate, the memo, the clock and the
 * IO are injected.
 */
import type { PipelineStage } from 'mongoose'
import { RentalListingModel } from '../models/RentalListing'
import { RentalMetaModel } from '../models/RentalMeta'
import { connectDb } from './db'
import { loadRentalAvailabilityIndex, type RentalAvailabilityIndex } from './rentalAvailability'
import { rentalCoverageFromFacet } from './rentalCoverage'
import {
  orderByKeys,
  rentalDirectoryCardsPipeline,
  rentalDirectoryCardsStages,
  rentalDirectoryItemsPipeline,
  rentalDirectoryKeysPipeline,
} from './rentalDirectoryOrder'
import {
  hashIds,
  rentalMemo,
  rentalMemoKey,
  type RentalMemo,
  type RentalMemoBuild,
  type RentalMemoEntry,
  type RentalMemoKind,
  type RentalMemoState,
} from './rentalMemo'
import { loadRentalServiceZoneIds } from './rentalZoneServices'
import { rentalBarrioOptionPlausible } from '../../utils/rentalBarrioOption'
import {
  RENTAL_COLLATION,
  RENTAL_STALE_DAYS,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalMedianFacet,
  rentalOfferStages,
  rentalPublicStages,
  type RentalCoverage,
  type RentalFacetValue,
  type RentalMeta,
  type RentalProperty,
  type RentalQuery,
  type RentalsResponse,
} from '../../utils/rentals'

const STALE_DAYS = RENTAL_STALE_DAYS

/** Pages per window: a window holds `perPage × 20` keys (480 at the default 24). */
export const RENTAL_DIRECTORY_WINDOW_PAGES = 20
/**
 * Windows 0–4 (pages 1–100) carry their own count. A deeper window reads window 0 first and is
 * clamped by its count before anything else runs, so a crafted `page=10000` costs one window-0
 * build per worker and TTL, never a pass that skips 240,000 rows.
 */
const COUNTED_WINDOWS = 5

/**
 * The barrio selector shows up to 250 names, read from the 5,000 most published ones. The names it
 * drops (utils/rentalBarrioOption.ts) take places in whatever is read, and with ties broken
 * alphabetically a surface ("40 m2 40 m2") sorts before every barrio with as many adverts.
 * Measured on 2026-11-08 in Montevideo:
 *  - reading 250, the selector stopped at the barrios with 4 adverts;
 *  - reading 1,000, at those with 2: Casasweb's surfaces alone ("61 m2 61 m2", almost one per
 *    advert) made over 1,000 distinct names, so Retiro and Chacarita (1 advert each) stayed out.
 * Reading more costs little: the grouping runs over every advert anyway, and the reply is cut at
 * 250.
 */
const BARRIO_FACET_SIZE = 250
const BARRIO_FACET_READ = 5000

const DEPARTMENT_FACET_STAGES = [
  { $group: { _id: '$department', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 25 },
]

const NEIGHBORHOOD_FACET_STAGES = [
  { $match: { neighborhood: { $ne: '' } } },
  { $group: { _id: '$neighborhood', count: { $sum: 1 } } },
  { $sort: { count: -1, _id: 1 } },
  { $limit: BARRIO_FACET_READ },
]

/** A coverage built while the default facet was absent is not rebuilt more than once a minute. */
const COVERAGE_WARM_EVERY_MS = 60_000

// ── The one aggregation helper ──────────────────────────────────────────────────────────────────

export type RentalDirectoryRole = 'win' | 'cards' | 'legacy' | 'facet' | 'dept' | 'barrio'

export const RENTAL_DIRECTORY_MAX_TIME_MS: Readonly<Record<RentalDirectoryRole, number>> =
  Object.freeze({
    win: 20_000,
    cards: 10_000,
    legacy: 20_000,
    facet: 20_000,
    dept: 20_000,
    barrio: 20_000,
  })

/** The part of mongoose's `Aggregate` the helper chains. */
export interface RentalAggregateChain {
  allowDiskUse(value: boolean): RentalAggregateChain
  option(value: { maxTimeMS: number; comment: string }): RentalAggregateChain
  collation(value: typeof RENTAL_COLLATION): PromiseLike<unknown>
}

export type RentalDirectoryAggregate = <T>(
  role: RentalDirectoryRole,
  pipeline: PipelineStage[],
  allowDiskUse?: boolean
) => Promise<T[]>

/**
 * Disk use, then `{ maxTimeMS, comment: 'rentals:<role>' }`, then the collation: last, because it
 * is the case- and accent-insensitive comparison every pass needs (tests/unit/rentalsMap.test.ts
 * counts one per aggregate call) and the thenable the tests' stubs resolve.
 */
export function createRentalDirectoryAggregate(
  start: (pipeline: PipelineStage[]) => RentalAggregateChain
): RentalDirectoryAggregate {
  return <T>(role: RentalDirectoryRole, pipeline: PipelineStage[], allowDiskUse = false) =>
    Promise.resolve(
      start(pipeline)
        .allowDiskUse(allowDiskUse)
        .option({ maxTimeMS: RENTAL_DIRECTORY_MAX_TIME_MS[role], comment: `rentals:${role}` })
        .collation(RENTAL_COLLATION)
    ) as Promise<T[]>
}

// ── Pure helpers ────────────────────────────────────────────────────────────────────────────────

/** Window `w` of a page, and where the page starts inside it. */
export function rentalDirectoryWindowOf(page: number, perPage: number) {
  const w = Math.floor((page - 1) / RENTAL_DIRECTORY_WINDOW_PAGES)
  const offset = ((page - 1) % RENTAL_DIRECTORY_WINDOW_PAGES) * perPage
  return { w, offset, size: perPage * RENTAL_DIRECTORY_WINDOW_PAGES }
}

/**
 * The search without its location: its filter is the search's `nonLocation`
 * (`buildRentalFilter`), so its facet's department counts are the search's own.
 */
export function widenRentalLocation(query: RentalQuery): RentalQuery {
  return { ...widenRentalBarrio(query), department: '' }
}

/** The search without its barrio choice: its filter is the search's `withoutNeighborhood`. */
export function widenRentalBarrio(query: RentalQuery): RentalQuery {
  return { ...query, neighborhood: '', neighborhoods: [], excludeNeighborhoods: [] }
}

/**
 * `buildRentalFilter` returns shallow copies of one filter, so two variants that hold the same keys
 * with the same values select exactly the same properties.
 */
function sameRentalFilter(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(a)
  return (
    keys.length === Object.keys(b).length &&
    keys.every(key => Object.prototype.hasOwnProperty.call(b, key) && a[key] === b[key])
  )
}

/** Mongo's MaxTimeMSExpired, or the memo refusing to queue: answered 503, never a second pass. */
function isSaturated(error: unknown): boolean {
  const { code, codeName } = (error ?? {}) as { code?: unknown; codeName?: unknown }
  return code === 50 || codeName === 'MaxTimeMSExpired' || code === 'RENTAL_MEMO_BUSY'
}

const toFacet = (rows: ReadonlyArray<{ _id: unknown; count: number }> | undefined) =>
  (rows || [])
    .filter(row => row?._id)
    .map((row): RentalFacetValue => ({ value: String(row._id), count: row.count }))

// The barrio selector offers no surface, no country (the barrio pages' rule) and no street
// address ("Sarandí 888"): utils/rentalBarrioOption.ts. A URL that already filters by one still
// works.
const toBarrioFacet = (rows: ReadonlyArray<{ _id: unknown; count: number }> | undefined) =>
  toFacet(rows)
    .filter(row => rentalBarrioOptionPlausible(row.value))
    .slice(0, BARRIO_FACET_SIZE)

// ── Types ───────────────────────────────────────────────────────────────────────────────────────

/** What a request resolved outside the query string: it changes the answer, so it is in the keys. */
export interface RentalDirectoryInputs {
  query: RentalQuery
  usdUyu: number
  /** `undefined`: no service filter; `null`: the zone snapshot cannot evaluate it (nothing matches). */
  serviceZones?: readonly string[] | null
  /** The adverts the reader's availability filter hides. */
  excluded: readonly string[]
}

export interface RentalDirectoryLoaded {
  inputs: RentalDirectoryInputs
  meta: RentalMeta | null
  availability: RentalAvailabilityIndex
}

export interface RentalDirectoryIo {
  connect(): Promise<unknown>
  loadAvailability(): Promise<RentalAvailabilityIndex>
  loadMeta(): Promise<RentalMeta | null>
  loadRentalServiceZoneIds(
    selections: NonNullable<RentalQuery['servicios']>
  ): Promise<readonly string[] | null>
}

/** One memo lookup of a request, for the `x-rentals-memo` header. */
export interface RentalDirectoryMemoRecord {
  kind: RentalMemoKind
  state: RentalMemoState
}

/** A window of the order: its keys, and the count of the whole search from the same snapshot. */
export interface RentalDirectoryWindow {
  keys: readonly string[]
  n: number
}

/** The facet entry of one filter. `departments`/`neighborhoods` only when they fold into it. */
export interface RentalDirectoryFacetValue {
  total: number
  medianUyu: number
  types: readonly RentalFacetValue[]
  sources: readonly RentalFacetValue[]
  priceMaxUyu: number
  departments?: readonly RentalFacetValue[]
  neighborhoods?: readonly RentalFacetValue[]
}

export interface RentalDirectoryCounts {
  total: number
  medianUyu: number
  facets: RentalsResponse['facets']
}

export interface RentalDirectoryPage {
  /** The page's cards in the order, undecorated (no gallery, no availability note). */
  items: RentalProperty[]
  /** The count of the search, from the window's own pass; `null` only after the fallback. */
  total: number | null
}

export interface RentalDirectoryData {
  /** Connects and resolves what the answer depends on beyond the query string. */
  load(query: RentalQuery): Promise<RentalDirectoryLoaded>
  /** The page's cards and the count. Never calls a facet function. */
  page(
    inputs: RentalDirectoryInputs,
    records: RentalDirectoryMemoRecord[]
  ): Promise<RentalDirectoryPage>
  /** The facet counts, the departments and the barrios of the search. */
  facets(
    inputs: RentalDirectoryInputs,
    records: RentalDirectoryMemoRecord[]
  ): Promise<RentalDirectoryCounts>
  /** The catalogue, from the default facet entry; never a pass on the request path. */
  coverage(inputs: Pick<RentalDirectoryInputs, 'usdUyu'>): RentalCoverage | null
  /** Forced window 0 and facet of one search, in the background slot (the warm-up). */
  warm(input: Record<string, unknown>): Promise<void>
}

export interface RentalDirectoryDataOptions {
  aggregate: RentalDirectoryAggregate
  memo: RentalMemo
  /** The memo's clock, to tell a fresh entry from a stale one when it is only peeked. */
  now?: () => number
  io?: RentalDirectoryIo
}

/** One search: the filters and stages every pass of it shares, built once per request. */
interface Search {
  inputs: RentalDirectoryInputs
  query: RentalQuery
  nonLocation: Record<string, unknown>
  withoutNeighborhood: Record<string, unknown>
  excluded: readonly string[]
  publicStages: object[]
  offerStages: object[]
  priceStages: object[]
  foldDepartments: boolean
  foldNeighborhoods: boolean
  extra: { zones: string; excluded: string }
}

// ── The directory ───────────────────────────────────────────────────────────────────────────────

export function createRentalDirectoryData(
  options: RentalDirectoryDataOptions
): RentalDirectoryData {
  const { aggregate, memo } = options
  const now = options.now ?? Date.now
  const io = options.io ?? DEFAULT_IO
  let lastCoverage: RentalCoverage | null = null
  let coverageWarmAt = -Infinity

  function searchOf(inputs: RentalDirectoryInputs): Search {
    const { query, usdUyu, serviceZones, excluded } = inputs
    // The filter is `buildRentalFilter`'s, shared with /api/rentals/mapa: a map that shows
    // properties the list does not list is the contradiction this keeps out.
    const { filter, nonLocation, withoutNeighborhood } = buildRentalFilter(
      query,
      STALE_DAYS,
      usdUyu,
      serviceZones
    )
    return {
      inputs,
      query,
      nonLocation,
      withoutNeighborhood,
      excluded,
      publicStages: rentalPublicStages(filter, STALE_DAYS, excluded),
      offerStages: rentalOfferStages(query, usdUyu),
      // Sorting alone must not change the rental-price statistics for the same search.
      priceStages: rentalOfferStages({ ...query, sort: 'precio' }, usdUyu),
      // The departments and the barrios ride the facet pass whenever their filter is the search's
      // own (2026-11-13, CAMBIO-URUGUAY-BACKEND-12: every pass is a full scan of the inventory).
      foldDepartments: sameRentalFilter(nonLocation, filter),
      foldNeighborhoods: sameRentalFilter(withoutNeighborhood, filter),
      extra: { zones: hashIds(serviceZones ?? null), excluded: hashIds(excluded) },
    }
  }

  const plainWindowKey = (s: Search, w: number) =>
    rentalMemoKey('win', s.query, { w, zones: s.extra.zones, excluded: s.extra.excluded })
  /**
   * Window `w`'s key carries the build time of the window before it (0 when that one is not
   * stored), so a stored window is never older than its predecessor: rebuilding window w−1 (its
   * TTL, or the warm-up at :51 and :56) changes window w's key, and window w is rebuilt after it.
   * Two windows built minutes apart around a harvest would otherwise skip the properties the
   * harvest pushed across the boundary (pages 20 → 21). With a newer window w, a property added on
   * top becomes a repeat at the boundary, which the feed drops by key; it is never skipped.
   */
  const windowKeys = (s: Search, last: number): string[] => {
    const keys = [plainWindowKey(s, 0)]
    for (let w = 1; w <= last; w++) {
      const previous = memo.peek('win', keys[w - 1]!)
      keys.push(`${plainWindowKey(s, w)}@${previous?.builtAt ?? 0}`)
    }
    return keys
  }
  const windowKey = (s: Search, w: number) => windowKeys(s, w)[w]!
  const facetKey = (s: Search) => rentalMemoKey('facet', s.query, s.extra)

  const stateOf = (entry: RentalMemoEntry<unknown>): RentalMemoState =>
    now() < entry.softExpiresAt ? 'hit' : 'stale'

  async function lookup<T>(
    records: RentalDirectoryMemoRecord[],
    kind: RentalMemoKind,
    key: string,
    build: RentalMemoBuild<T>
  ): Promise<T> {
    try {
      const result = await memo.get<T>(kind, key, build)
      records.push({ kind, state: result.state })
      return result.value
    } catch (error) {
      records.push({ kind, state: 'miss' })
      throw error
    }
  }

  /**
   * Window `w`: the keys pass with `skip = w·W`, `limit = W`. Windows 0–4 count the search in the
   * same pass; a deeper one stores window 0's count (`n`), which it was clamped by.
   */
  const windowBuild =
    (s: Search, w: number, count: true | number): RentalMemoBuild<RentalDirectoryWindow> =>
    async () => {
      const { size } = rentalDirectoryWindowOf(1, s.query.perPage)
      const rows = await aggregate<Record<string, unknown>>(
        'win',
        rentalDirectoryKeysPipeline(s.query, s.publicStages, s.offerStages, {
          skip: w * size,
          limit: size,
          count: count === true,
        }),
        // A deep window retains every preceding public row in Mongo's top-k sort; even the keys
        // alone may spill on a wide search.
        true
      )
      const document = rows[0] as { n?: Array<{ n?: unknown }>; keys?: unknown[] } | undefined
      const keyRows = (count === true ? document?.keys : rows) ?? []
      const keys = Object.freeze(
        keyRows
          .map(row => (row as { key?: unknown } | null)?.key)
          .filter((key): key is string => typeof key === 'string')
      )
      const n = count === true ? Number(document?.n?.[0]?.n) || 0 : count
      const value: RentalDirectoryWindow = Object.freeze({ keys, n })
      return { value, weight: 64 + keys.reduce((sum, key) => sum + 2 * key.length + 32, 0) }
    }

  const facetBuild =
    (s: Search): RentalMemoBuild<RentalDirectoryFacetValue> =>
    async () => {
      const rows = await aggregate<Record<string, unknown>>('facet', [
        ...s.publicStages,
        {
          $facet: {
            total: [{ $count: 'total' }],
            ...(s.foldDepartments ? { departments: DEPARTMENT_FACET_STAGES } : {}),
            ...(s.foldNeighborhoods ? { neighborhoods: NEIGHBORHOOD_FACET_STAGES } : {}),
            types: [
              { $group: { _id: '$propertyType', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            sources: [
              { $unwind: '$sources' },
              { $group: { _id: '$sources', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            price: [...s.priceStages, { $group: { _id: null, max: { $max: '$priceUyu' } } }],
            // The median rides this same pass instead of a pass of its own (see rentalMedianFacet).
            median: rentalMedianFacet(s.priceStages),
          },
        },
      ] as PipelineStage[])
      type Rows = Array<{ _id: unknown; count: number }>
      const dimension = (rows[0] || {}) as Record<string, Rows | undefined>
      const total = Number((dimension.total?.[0] as { total?: unknown } | undefined)?.total) || 0
      // The median is what tells someone whether a price is normal for the filter they built.
      const median = Number((dimension.median?.[0] as { median?: unknown } | undefined)?.median)
      const value: RentalDirectoryFacetValue = Object.freeze({
        total,
        medianUyu: total > 0 && Number.isFinite(median) ? Math.round(median) : 0,
        types: Object.freeze(toFacet(dimension.types)),
        sources: Object.freeze(toFacet(dimension.sources)),
        priceMaxUyu: Number((dimension.price?.[0] as { max?: unknown } | undefined)?.max || 0),
        ...(s.foldDepartments
          ? { departments: Object.freeze(toFacet(dimension.departments)) }
          : {}),
        ...(s.foldNeighborhoods
          ? { neighborhoods: Object.freeze(toBarrioFacet(dimension.neighborhoods)) }
          : {}),
      })
      return { value, weight: 2 * JSON.stringify(value).length }
    }

  /** The department counts of the search: its own filter without the location. */
  const departmentBuild =
    (s: Search): RentalMemoBuild<readonly RentalFacetValue[]> =>
    async () => {
      const { nonLocation, excluded } = s
      const rows = await aggregate<{ _id: string; count: number }>('dept', [
        ...rentalPublicStages(nonLocation, STALE_DAYS, excluded),
        ...DEPARTMENT_FACET_STAGES,
      ] as PipelineStage[])
      const value = Object.freeze(toFacet(rows))
      return { value, weight: 2 * JSON.stringify(value).length }
    }

  /** Exclude the barrio's own selection, so selecting Pocitos does not hide Cordón. */
  const barrioBuild =
    (s: Search): RentalMemoBuild<readonly RentalFacetValue[]> =>
    async () => {
      const { withoutNeighborhood, excluded } = s
      const rows = await aggregate<{ _id: string; count: number }>('barrio', [
        ...rentalPublicStages(withoutNeighborhood, STALE_DAYS, excluded),
        ...NEIGHBORHOOD_FACET_STAGES,
      ] as PipelineStage[])
      const value = Object.freeze(toBarrioFacet(rows))
      return { value, weight: 2 * JSON.stringify(value).length }
    }

  /**
   * The departments (or barrios) of a located search. First the facet entry of the WIDER search
   * (without the location, or without the barrio), whose filter is exactly the one these counts
   * need: Pocitos reads them from the whole directory's and from Montevideo's facet. A stale one
   * is served and refreshed in the background. Only without it, the pass of its own, memoised
   * under the wider search, so every barrio of Montevideo shares one department entry.
   */
  async function subFacet(
    s: Search,
    kind: 'dept' | 'barrio',
    records: RentalDirectoryMemoRecord[]
  ): Promise<readonly RentalFacetValue[]> {
    const wide = kind === 'dept' ? widenRentalLocation(s.query) : widenRentalBarrio(s.query)
    const field = kind === 'dept' ? 'departments' : 'neighborhoods'
    const wideKey = rentalMemoKey('facet', wide, s.extra)
    const stored = memo.peek<RentalDirectoryFacetValue>('facet', wideKey)
    const counts = stored?.value[field]
    if (stored && counts) {
      const state = stateOf(stored)
      records.push({ kind: 'facet', state })
      if (state === 'stale')
        void memo
          .get('facet', wideKey, facetBuild(searchOf({ ...s.inputs, query: wide })), {
            priority: 'refresh',
          })
          .catch(() => {})
      return counts
    }
    return lookup(
      records,
      kind,
      rentalMemoKey(kind, wide, s.extra),
      kind === 'dept' ? departmentBuild(s) : barrioBuild(s)
    )
  }

  async function page(
    inputs: RentalDirectoryInputs,
    records: RentalDirectoryMemoRecord[]
  ): Promise<RentalDirectoryPage> {
    const s = searchOf(inputs)
    const { query } = s
    const { w, offset } = rentalDirectoryWindowOf(query.page, query.perPage)
    const beyond = (n: number) => query.page > Math.max(1, Math.ceil(n / query.perPage))
    try {
      // A page past the end of a count this worker already holds runs nothing.
      if (w >= 1) {
        const stored = windowKeys(s, COUNTED_WINDOWS - 1)
        for (const key of stored) {
          const entry = memo.peek<RentalDirectoryWindow>('win', key)
          if (!entry) continue
          if (beyond(entry.value.n)) {
            records.push({ kind: 'win', state: stateOf(entry) })
            return { items: [], total: entry.value.n }
          }
          break
        }
      }
      let window: RentalDirectoryWindow
      let n: number
      if (w >= COUNTED_WINDOWS) {
        // Window 0 first, and the clamp by its count before anything else runs.
        const first = await lookup(records, 'win', windowKey(s, 0), windowBuild(s, 0, true))
        n = first.n
        if (beyond(n)) return { items: [], total: n }
        window = await lookup(records, 'win', windowKey(s, w), windowBuild(s, w, n))
      } else {
        window = await lookup(records, 'win', windowKey(s, w), windowBuild(s, w, true))
        n = window.n
        if (beyond(n)) return { items: [], total: n }
      }
      const keys = window.keys.slice(offset, offset + query.perPage)
      if (!keys.length) return { items: [], total: n }
      const cards = await aggregate<RentalProperty>(
        'cards',
        rentalDirectoryCardsPipeline(
          query,
          rentalDirectoryCardsStages(s.publicStages, keys),
          s.offerStages,
          keys.length,
          rentalDirectoryItemsPipeline
        )
      )
      return { items: orderByKeys(cards, keys), total: n }
    } catch (error) {
      // A saturated database (or a full build queue) answers 503: a second pass would add to it.
      if (isSaturated(error)) throw error
      console.warn('[api/rentals] fallback', error)
      const items = await aggregate<RentalProperty>(
        'legacy',
        rentalDirectoryItemsPipeline(query, s.publicStages, s.offerStages),
        // The single pass sorts every public card: at this inventory size even the slim
        // projection can exceed 100 MiB, so it may spill to disk.
        true
      )
      return { items, total: null }
    }
  }

  async function facets(
    inputs: RentalDirectoryInputs,
    records: RentalDirectoryMemoRecord[]
  ): Promise<RentalDirectoryCounts> {
    const s = searchOf(inputs)
    const [own, departments, neighborhoods] = await Promise.all([
      lookup(records, 'facet', facetKey(s), facetBuild(s)),
      s.foldDepartments ? null : subFacet(s, 'dept', records),
      s.foldNeighborhoods ? null : subFacet(s, 'barrio', records),
    ])
    return {
      total: own.total,
      medianUyu: own.medianUyu,
      facets: {
        departments: [...(departments ?? own.departments ?? [])],
        neighborhoods: [...(neighborhoods ?? own.neighborhoods ?? [])],
        types: [...own.types],
        sources: [...own.sources],
        priceMaxUyu: own.priceMaxUyu,
      },
    }
  }

  /**
   * The default search's facet as the coverage. While it is absent (the first seconds of a fresh
   * worker) the last coverage this worker computed, or `null`, and that facet is built in the
   * background slot, at most once a minute.
   */
  function coverage(inputs: Pick<RentalDirectoryInputs, 'usdUyu'>): RentalCoverage | null {
    const defaults: RentalDirectoryInputs = {
      query: normalizeRentalQuery({}),
      usdUyu: inputs.usdUyu,
      serviceZones: undefined,
      // The default availability (`all`) never hides an advert.
      excluded: [],
    }
    const s = searchOf(defaults)
    const key = facetKey(s)
    const stored = memo.peek<RentalDirectoryFacetValue>('facet', key)
    if (stored) {
      lastCoverage = rentalCoverageFromFacet(stored.value, stored.builtAt)
      if (stateOf(stored) === 'stale')
        void memo.get('facet', key, facetBuild(s), { priority: 'refresh' }).catch(() => {})
      return lastCoverage
    }
    if (now() - coverageWarmAt >= COVERAGE_WARM_EVERY_MS) {
      coverageWarmAt = now()
      void memo
        .get('facet', key, facetBuild(s), { priority: 'warm' })
        .then(result => {
          lastCoverage = rentalCoverageFromFacet(result.value, result.builtAt)
        })
        .catch(() => {})
    }
    return lastCoverage
  }

  async function load(query: RentalQuery): Promise<RentalDirectoryLoaded> {
    const { connect, loadAvailability, loadMeta, loadRentalServiceZoneIds } = io
    await connect()
    const [availability, meta] = await Promise.all([loadAvailability(), loadMeta()])
    const serviceZones = query.servicios?.length
      ? await loadRentalServiceZoneIds(query.servicios)
      : undefined
    return {
      inputs: {
        query,
        usdUyu: Number(meta?.usdUyu) || 0,
        serviceZones,
        excluded: availability.excludedAdvertIds(query.availability),
      },
      meta,
      availability,
    }
  }

  async function warm(input: Record<string, unknown>): Promise<void> {
    const { inputs } = await load(normalizeRentalQuery(input))
    const s = searchOf(inputs)
    await Promise.all([
      memo.get('win', windowKey(s, 0), windowBuild(s, 0, true), { priority: 'warm', force: true }),
      memo.get('facet', facetKey(s), facetBuild(s), { priority: 'warm', force: true }),
    ])
  }

  return { load, page, facets, coverage, warm }
}

// ── The default instance ────────────────────────────────────────────────────────────────────────

const DEFAULT_IO: RentalDirectoryIo = {
  connect: connectDb,
  loadAvailability: loadRentalAvailabilityIndex,
  loadMeta: async () =>
    (await RentalMetaModel.findOne({ key: 'uy-rentals' })
      .select({ _id: 0, __v: 0 })
      .lean()) as RentalMeta | null,
  loadRentalServiceZoneIds,
}

/** The one place the directory reaches `rentallistings`. */
const aggregateRentals = createRentalDirectoryAggregate(
  pipeline => RentalListingModel.aggregate(pipeline) as unknown as RentalAggregateChain
)

export const rentalDirectoryData: RentalDirectoryData = createRentalDirectoryData({
  aggregate: aggregateRentals,
  memo: rentalMemo,
})
