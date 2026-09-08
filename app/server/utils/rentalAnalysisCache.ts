import { rentalAnalysisFresh, type RentalAnalysisCatalogue } from '../../utils/rentalAnalysis'
import { RENTAL_STALE_DAYS } from '../../utils/rentals'

/** Bump when normalization/eligibility changes: old workers may overlap during a rolling deploy. */
export const RENTAL_ANALYSIS_CACHE_VERSION = 1
export const RENTAL_ANALYSIS_META_TTL = 60_000
export const RENTAL_ANALYSIS_SNAPSHOT_TTL = 10 * 60_000
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
}
export class RentalAnalysisStaleError extends Error {
  readonly code = 'RENTAL_ANALYSIS_STALE'
  constructor(readonly generatedAt: string) {
    super('Rental analysis source metadata is stale')
    this.name = 'RentalAnalysisStaleError'
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

function usable(snapshot: RentalAnalysisSnapshot | null, generatedAt: string, at: number) {
  if (
    !snapshot ||
    snapshot.version !== RENTAL_ANALYSIS_CACHE_VERSION ||
    snapshot.value.generatedAt !== generatedAt ||
    snapshot.cutoff !== rentalAnalysisCutoff(at) ||
    !Number.isFinite(snapshot.loadedAt) ||
    snapshot.loadedAt > at ||
    snapshot.loadedAt + RENTAL_ANALYSIS_SNAPSHOT_TTL <= at
  )
    return false
  try {
    rentalAnalysisSourceDate(snapshot.value.generatedAt, at)
    return true
  } catch {
    return false
  }
}

/** One normalized snapshot per worker, shared with other workers through a bounded private store. */
export function createRentalAnalysisCatalogueCache({
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
  let metadata: { generatedAt: string; until: number } | null = null
  let pending: Promise<RentalAnalysisSnapshot> | null = null
  const readSource = async () => {
    const raw = await readMeta()
    const at = now()
    const generatedAt = rentalAnalysisSourceDate(raw?.generatedAt, at)
    metadata = { generatedAt, until: at + RENTAL_ANALYSIS_META_TTL }
    return generatedAt
  }
  const fromDisk = async (generatedAt: string) => {
    const snapshot = await shared?.read().catch(() => null)
    return snapshot && usable(snapshot, generatedAt, now()) ? snapshot : null
  }
  const refresh = async () => {
    const generatedAt = await readSource()
    if (usable(cached, generatedAt, now())) return cached!
    // Do not retain a second normalized catalogue while streaming its replacement.
    cached = null
    const existing = await fromDisk(generatedAt)
    if (existing) return existing
    const rebuild = async () => {
      let generation = generatedAt
      for (let attempt = 0; attempt < 2; attempt++) {
        const sharedSnapshot = await fromDisk(generation)
        if (sharedSnapshot) return sharedSnapshot
        const startedAt = now()
        rentalAnalysisSourceDate(generation, startedAt)
        const cutoff = rentalAnalysisCutoff(startedAt)
        const value = await readCatalogue(generation, startedAt, cutoff)
        const currentGeneration = await readSource()
        // A harvest completed or UTC eligibility changed during the scan: never label a
        // mixture as a completed generation. Retry once, under the same shared lock.
        if (generation !== currentGeneration || cutoff !== rentalAnalysisCutoff(now())) {
          generation = currentGeneration
          continue
        }
        if (value.generatedAt !== generation)
          throw new Error('Rental analysis catalogue generation is inconsistent')
        const snapshot: RentalAnalysisSnapshot = {
          version: RENTAL_ANALYSIS_CACHE_VERSION,
          loadedAt: now(),
          cutoff,
          value,
        }
        // Persistence is an acceleration layer. An unwritable disk must not turn a
        // successfully validated complete read into an outage.
        await shared?.write(snapshot).catch(() => {})
        return snapshot
      }
      throw new Error('Rental analysis source changed during its complete read')
    }
    return shared ? shared.withLock(rebuild) : rebuild()
  }
  return async (): Promise<RentalAnalysisSnapshot> => {
    const at = now()
    if (metadata && metadata.until > at && usable(cached, metadata.generatedAt, at)) return cached!
    if (pending) return pending
    pending = refresh()
      .then(snapshot => {
        if (!usable(snapshot, snapshot.value.generatedAt, now()))
          throw new Error('Rental analysis snapshot expired during loading')
        cached = snapshot
        return snapshot
      })
      .finally(() => {
        pending = null
      })
    return pending
  }
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
