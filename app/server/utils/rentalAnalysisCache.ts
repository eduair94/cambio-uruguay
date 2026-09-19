import { rentalAnalysisFresh, type RentalAnalysisCatalogue } from '../../utils/rentalAnalysis'
import { RENTAL_STALE_DAYS } from '../../utils/rentals'

/**
 * The rental analysis runs on a WEEKLY snapshot of the whole rental catalogue, built by a scheduled
 * task and stored on disk. A reader's request never reads the catalogue from the database.
 *
 * It used to be the opposite: the snapshot was tied to the harvest's `generatedAt` (which the hourly
 * rental job changes every hour), expired after ten minutes and on every UTC midnight, and whichever
 * request found it expired re-read up to 100,000 properties under a lock — measured 1.7 s on the
 * page's first analysis call. The market these medians describe does not move by the hour, so the
 * snapshot is now rebuilt once a week (`rentals:analysis-weekly`), and between rebuilds it is only
 * READ: from this worker's memory, and from disk once per worker (a cheap `revision()` check every
 * ten minutes notices the other worker's new file).
 *
 * What stays live on purpose is community availability (`rentalAvailabilityIndex`, applied per
 * request by the caller): a reported advert stops counting within seconds, not on Monday.
 */

/** Bump when normalization/eligibility changes: old workers may overlap during a rolling deploy. */
export const RENTAL_ANALYSIS_CACHE_VERSION = 1
const DAY = 86_400_000
/**
 * The weekly task skips a snapshot younger than this. It only has to absorb both cluster workers
 * firing the same minute (and a same-day retry): anything longer would let a mid-week cold-start
 * build make Monday's run skip, and the analysis would age past a week.
 */
export const RENTAL_ANALYSIS_REBUILD_AFTER = 12 * 60 * 60_000
/** Two missed weekly runs: the snapshot is served as stale (503 with its date), never silently. */
export const RENTAL_ANALYSIS_MAX_AGE = 14 * DAY
/** How often a worker asks the disk whether another worker wrote a newer snapshot. */
export const RENTAL_ANALYSIS_RECHECK = 10 * 60_000
/** Without any snapshot yet (cold start while the bootstrap builds), look again sooner. */
export const RENTAL_ANALYSIS_EMPTY_RECHECK = 30_000
/** A rebuild with fewer rows than this share of the current snapshot is refused, not published. */
export const RENTAL_ANALYSIS_MIN_ROWS_RATIO = 0.6
export interface RentalAnalysisSnapshot {
  version: typeof RENTAL_ANALYSIS_CACHE_VERSION
  loadedAt: number
  cutoff: string
  value: RentalAnalysisCatalogue
}
export interface RentalAnalysisSharedCache {
  read(): Promise<RentalAnalysisSnapshot | null>
  write(snapshot: RentalAnalysisSnapshot): Promise<void>
  withLock<T>(work: () => Promise<T>): Promise<T>
  /** A cheap change marker (file mtime); `null` when there is nothing stored. */
  revision?(): Promise<number | null>
}
export class RentalAnalysisStaleError extends Error {
  readonly code = 'RENTAL_ANALYSIS_STALE'
  constructor(readonly generatedAt: string) {
    super('Rental analysis source metadata is stale')
    this.name = 'RentalAnalysisStaleError'
  }
}
export class RentalAnalysisUnavailableError extends Error {
  readonly code = 'RENTAL_ANALYSIS_UNAVAILABLE'
  constructor() {
    super('Rental analysis snapshot has not been built yet')
    this.name = 'RentalAnalysisUnavailableError'
  }
}
export const rentalAnalysisCutoff = (at: number) =>
  new Date(at - RENTAL_STALE_DAYS * 86_400_000).toISOString().slice(0, 10)
export function rentalAnalysisSourceDate(value: unknown, at: number): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || Date.parse(value) > at)
    throw new Error('Rental analysis source metadata unavailable')
  if (!rentalAnalysisFresh(value, new Date(at))) throw new RentalAnalysisStaleError(value)
  return value
}
export const rentalAnalysisSnapshotRevision = (snapshot: RentalAnalysisSnapshot) =>
  `${snapshot.version}:${snapshot.value.generatedAt}:${snapshot.cutoff}:${snapshot.loadedAt}`

export type RentalAnalysisRebuildResult =
  | { status: 'built'; rows: number; previousRows: number | null; generatedAt: string }
  /** The stored snapshot is younger than `RENTAL_ANALYSIS_REBUILD_AFTER`: nothing to do. */
  | { status: 'fresh'; builtAt: number }
  /** Refused: the new read has far fewer rows than the snapshot it would replace. */
  | { status: 'thin'; rows: number; previousRows: number }
  /** Another worker holds the lock and is building it right now. */
  | { status: 'busy' }

const sameVersion = (snapshot: RentalAnalysisSnapshot | null): snapshot is RentalAnalysisSnapshot =>
  !!snapshot &&
  snapshot.version === RENTAL_ANALYSIS_CACHE_VERSION &&
  Number.isFinite(snapshot.loadedAt)

/**
 * The weekly snapshot: `load()` for requests (read-only, never touches the catalogue), `rebuild()`
 * for the scheduled task, `ensure()` for the cold-start bootstrap.
 */
export function createRentalAnalysisSnapshotStore({
  readMeta,
  readCatalogue,
  shared,
  now = Date.now,
}: {
  readMeta: () => Promise<{ generatedAt?: unknown } | null>
  readCatalogue: (
    generatedAt: string,
    at: number,
    cutoff: string
  ) => Promise<RentalAnalysisCatalogue>
  shared?: RentalAnalysisSharedCache
  now?: () => number
}) {
  let cached: RentalAnalysisSnapshot | null = null
  let cachedRevision: number | null = null
  let checkedAt = Number.NEGATIVE_INFINITY
  let reading: Promise<void> | null = null

  const readStored = async () => {
    // Without a shared store (tests), memory is the only store.
    if (!shared) return
    const revision = shared.revision ? await shared.revision().catch(() => null) : null
    if (cached && revision !== null && revision === cachedRevision) return
    const snapshot = await shared.read().catch(() => null)
    // An unreadable or older-version file never replaces what this worker already serves.
    if (sameVersion(snapshot)) {
      cached = snapshot
      cachedRevision = revision
    }
  }

  async function load(): Promise<RentalAnalysisSnapshot> {
    const interval = cached ? RENTAL_ANALYSIS_RECHECK : RENTAL_ANALYSIS_EMPTY_RECHECK
    if (now() - checkedAt >= interval) {
      reading ??= readStored().finally(() => {
        reading = null
      })
      await reading
      checkedAt = now()
    }
    const snapshot = cached
    const at = now()
    // A future build time means the clock went backwards: refuse rather than guess its age.
    if (!sameVersion(snapshot) || snapshot.loadedAt > at) throw new RentalAnalysisUnavailableError()
    if (at - snapshot.loadedAt > RENTAL_ANALYSIS_MAX_AGE)
      throw new RentalAnalysisStaleError(snapshot.value.generatedAt)
    return snapshot
  }

  async function build(): Promise<RentalAnalysisRebuildResult> {
    const previous = shared ? await shared.read().catch(() => null) : cached
    const start = now()
    if (
      sameVersion(previous) &&
      previous.loadedAt <= start &&
      start - previous.loadedAt < RENTAL_ANALYSIS_REBUILD_AFTER
    )
      return { status: 'fresh', builtAt: previous.loadedAt }
    let generation = rentalAnalysisSourceDate((await readMeta())?.generatedAt, now())
    for (let attempt = 0; attempt < 2; attempt++) {
      const startedAt = now()
      rentalAnalysisSourceDate(generation, startedAt)
      const cutoff = rentalAnalysisCutoff(startedAt)
      const value = await readCatalogue(generation, startedAt, cutoff)
      const currentGeneration = rentalAnalysisSourceDate((await readMeta())?.generatedAt, now())
      // A harvest completed or UTC eligibility changed during the scan: never label a mixture as a
      // completed generation. Retry once, under the same lock.
      if (generation !== currentGeneration || cutoff !== rentalAnalysisCutoff(now())) {
        generation = currentGeneration
        continue
      }
      if (value.generatedAt !== generation)
        throw new Error('Rental analysis catalogue generation is inconsistent')
      const previousRows = sameVersion(previous) ? previous.value.listings.length : null
      const previousServable =
        sameVersion(previous) &&
        previous.loadedAt <= now() &&
        now() - previous.loadedAt <= RENTAL_ANALYSIS_MAX_AGE
      if (
        previousServable &&
        previousRows &&
        value.listings.length < previousRows * RENTAL_ANALYSIS_MIN_ROWS_RATIO
      )
        return { status: 'thin', rows: value.listings.length, previousRows }
      const snapshot: RentalAnalysisSnapshot = {
        version: RENTAL_ANALYSIS_CACHE_VERSION,
        loadedAt: now(),
        cutoff,
        value,
      }
      // This worker serves the new snapshot even if persisting it fails, but the failure is not
      // swallowed any more: the file IS the product now, and the task has to report it.
      cached = snapshot
      cachedRevision = null
      checkedAt = now()
      if (shared) await shared.write(snapshot)
      return { status: 'built', rows: value.listings.length, previousRows, generatedAt: generation }
    }
    throw new Error('Rental analysis source changed during its complete read')
  }

  async function rebuild(): Promise<RentalAnalysisRebuildResult> {
    if (!shared) return build()
    try {
      return await shared.withLock(build)
    } catch (error) {
      if (error instanceof Error && /already running/.test(error.message)) return { status: 'busy' }
      throw error
    }
  }

  /** Cold start: build only when there is no servable snapshot at all. */
  async function ensure(): Promise<RentalAnalysisRebuildResult | null> {
    try {
      await load()
      return null
    } catch {
      return rebuild()
    }
  }

  return { load, rebuild, ensure }
}

/** Small result cache only; callers must check current availability before every lookup. */
export function createRentalAnalysisResponseCache<T>({
  maxEntries = 16,
  ttl = 30_000,
  now = Date.now,
} = {}) {
  const entries = new Map<string, { until: number; value: T }>()
  return {
    get(key: string): T | undefined {
      const entry = entries.get(key)
      if (!entry) return undefined
      entries.delete(key)
      if (entry.until <= now()) return undefined
      entries.set(key, entry)
      return entry.value
    },
    set(key: string, value: T) {
      for (const [existing, entry] of entries) if (entry.until <= now()) entries.delete(existing)
      entries.delete(key)
      entries.set(key, { until: now() + ttl, value })
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value!)
    },
  }
}
