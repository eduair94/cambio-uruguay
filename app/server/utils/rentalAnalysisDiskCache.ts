import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { rentalAnalysisFresh, type RentalAnalysisListing } from '../../utils/rentalAnalysis'
import { RENTAL_SOURCE_LABEL, type RentalSource } from '../../utils/rentals'
import { publicBusinessUrl } from '../../utils/propertyAdvertiser'
import {
  RENTAL_ANALYSIS_CACHE_VERSION,
  rentalAnalysisCutoff,
  rentalAnalysisSourceDate,
  type RentalAnalysisSharedCache,
  type RentalAnalysisSnapshot,
} from './rentalAnalysisCache'

export const RENTAL_ANALYSIS_CACHE_BYTES = 64 * 1024 * 1024
export const RENTAL_ANALYSIS_CACHE_ROWS = 200_000
const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
const text = (value: unknown, maximum: number, minimum = 0): value is string =>
  typeof value === 'string' && value.length >= minimum && value.length <= maximum
const optionalNumber = (value: unknown, min: number, max: number, integer = false) =>
  value === null ||
  (typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max &&
    (!integer || Number.isInteger(value)))

/** Explicitly discard unknown fields on both sides of disk, including future private additions. */
export function projectRentalAnalysisSnapshot(raw: unknown): RentalAnalysisSnapshot | null {
  const envelope = record(raw)
  const value = record(envelope?.value)
  if (
    envelope?.version !== RENTAL_ANALYSIS_CACHE_VERSION ||
    typeof envelope.loadedAt !== 'number' ||
    !Number.isFinite(envelope.loadedAt) ||
    !value ||
    !text(value.generatedAt, 40, 10) ||
    !Number.isSafeInteger(value.catalogueProperties) ||
    (value.catalogueProperties as number) < 0 ||
    (value.catalogueProperties as number) > 100_000 ||
    !Array.isArray(value.listings) ||
    value.listings.length > RENTAL_ANALYSIS_CACHE_ROWS
  )
    return null
  const at = new Date(envelope.loadedAt)
  try {
    if (envelope.cutoff !== rentalAnalysisCutoff(envelope.loadedAt)) return null
    rentalAnalysisSourceDate(value.generatedAt, envelope.loadedAt)
  } catch {
    return null
  }
  const listings: RentalAnalysisListing[] = []
  for (const item of value.listings) {
    const row = record(item)
    if (
      !row ||
      !text(row.source, 30) ||
      !Object.prototype.hasOwnProperty.call(RENTAL_SOURCE_LABEL, row.source)
    )
      return null
    const source = row.source as RentalSource
    const areas = row.areas === undefined ? undefined : record(row.areas)
    if (
      !text(row.propertyKey, 180, 1) ||
      !/^[\w-]+$/.test(row.propertyKey) ||
      !text(row.advertId, 240, 1) ||
      !row.advertId.startsWith(`rent:${source}:`) ||
      !text(row.title, 100, 1) ||
      !text(row.department, 100, 1) ||
      !text(row.neighborhood, 100) ||
      !text(row.url, 2000, 1) ||
      publicBusinessUrl(row.url, source) !== row.url ||
      !['apartamento', 'casa'].includes(String(row.type)) ||
      !['UYU', 'USD'].includes(String(row.currency)) ||
      typeof row.price !== 'number' ||
      !Number.isFinite(row.price) ||
      row.price <= 0 ||
      !optionalNumber(row.area, 20, 450) ||
      ![null, 'built', 'total'].includes(row.areaBasis as null | string) ||
      !optionalNumber(row.bedrooms, 0, 10, true) ||
      !optionalNumber(row.bathrooms, 1, 10, true) ||
      !optionalNumber(row.parkingSpaces, 0, 10, true) ||
      !optionalNumber(row.commonExpenses, 0, Number.MAX_SAFE_INTEGER) ||
      !text(row.lastSeen, 40, 10) ||
      !rentalAnalysisFresh(row.lastSeen, at) ||
      !(
        row.advertiserKey === null ||
        (text(row.advertiserKey, 300, 1) && row.advertiserKey.startsWith(`${source}:`))
      ) ||
      (row.areas !== undefined &&
        (!areas || !optionalNumber(areas.built, 20, 450) || !optionalNumber(areas.total, 20, 450)))
    )
      return null
    listings.push({
      propertyKey: row.propertyKey,
      advertId: row.advertId,
      title: row.title,
      url: row.url,
      source,
      department: row.department,
      neighborhood: row.neighborhood,
      type: row.type as RentalAnalysisListing['type'],
      currency: row.currency as RentalAnalysisListing['currency'],
      price: row.price,
      area: row.area as number | null,
      areaBasis: row.areaBasis as RentalAnalysisListing['areaBasis'],
      ...(areas
        ? { areas: { built: areas.built as number | null, total: areas.total as number | null } }
        : {}),
      bedrooms: row.bedrooms as number | null,
      bathrooms: row.bathrooms as number | null,
      parkingSpaces: row.parkingSpaces as number | null,
      commonExpenses: row.commonExpenses as number | null,
      lastSeen: row.lastSeen,
      advertiserKey: row.advertiserKey as string | null,
    })
  }
  return {
    version: RENTAL_ANALYSIS_CACHE_VERSION,
    loadedAt: envelope.loadedAt,
    cutoff: envelope.cutoff as string,
    value: {
      generatedAt: value.generatedAt,
      catalogueProperties: value.catalogueProperties as number,
      listings,
    },
  }
}

const code = (error: unknown) => (error as NodeJS.ErrnoException)?.code
const alive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return code(error) !== 'ESRCH'
  }
}
export function createRentalAnalysisDiskCache({
  directory = resolve(process.cwd(), '.data', 'rental-analysis'),
  maxBytes = RENTAL_ANALYSIS_CACHE_BYTES,
  waitMs = 25_000,
  abandonedMs = 60_000,
  pollMs = 100,
  now = Date.now,
  processAlive = alive,
}: {
  directory?: string
  maxBytes?: number
  waitMs?: number
  abandonedMs?: number
  pollMs?: number
  now?: () => number
  processAlive?: (pid: number) => boolean
} = {}): RentalAnalysisSharedCache {
  const base = resolve(directory)
  const filename = resolve(base, `catalogue-v${RENTAL_ANALYSIS_CACHE_VERSION}.json`)
  const lockfile = resolve(base, `catalogue-v${RENTAL_ANALYSIS_CACHE_VERSION}.lock`)
  const ensureDirectory = () => fs.mkdir(base, { recursive: true, mode: 0o700 })
  const removeOwnLock = async (token: string) => {
    try {
      const owner = JSON.parse(await fs.readFile(lockfile, 'utf8'))
      if (owner.token === token) await fs.unlink(lockfile)
    } catch {
      // A missing or replaced lock is not ours to remove.
    }
  }
  const removeAbandonedInvalidLock = async (contents: string) => {
    try {
      const before = await fs.stat(lockfile)
      if (now() - before.mtimeMs < abandonedMs) return
      // A process can die between exclusive creation and writing its lease. Only
      // remove an old invalid file if neither content nor file metadata changed.
      if ((await fs.readFile(lockfile, 'utf8')) !== contents) return
      const after = await fs.stat(lockfile)
      if (
        after.mtimeMs !== before.mtimeMs ||
        after.ino !== before.ino ||
        after.size !== before.size
      )
        return
      await fs.unlink(lockfile)
    } catch {
      // Another worker may already have recovered it.
    }
  }
  return {
    async read() {
      try {
        const handle = await fs.open(filename, 'r')
        try {
          const size = (await handle.stat()).size
          if (size > maxBytes || !size) return null
          const contents = await handle.readFile('utf8')
          if (Buffer.byteLength(contents) > maxBytes) return null
          return projectRentalAnalysisSnapshot(JSON.parse(contents))
        } finally {
          await handle.close()
        }
      } catch {
        return null
      }
    },
    async write(snapshot) {
      const safe = projectRentalAnalysisSnapshot(snapshot)
      if (!safe) throw new Error('Invalid rental analysis disk snapshot')
      const contents = JSON.stringify(safe)
      if (Buffer.byteLength(contents) > maxBytes)
        throw new Error('Rental analysis disk snapshot exceeds its byte budget')
      await ensureDirectory()
      const temporary = resolve(base, `.catalogue-${process.pid}-${randomUUID()}.tmp`)
      try {
        await fs.writeFile(temporary, contents, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
        await fs.rename(temporary, filename)
      } finally {
        await fs.unlink(temporary).catch(() => {})
      }
    },
    async withLock(work) {
      try {
        await ensureDirectory()
      } catch {
        return work()
      }
      const token = randomUUID()
      const startedAt = now()
      // Real elapsed time also bounds tests/clocks that jump backwards.
      const startedMonotonic = performance.now()
      for (;;) {
        try {
          const handle = await fs.open(lockfile, 'wx', 0o600)
          try {
            await handle.writeFile(JSON.stringify({ token, pid: process.pid, createdAt: now() }))
          } catch (error) {
            await handle.close()
            await fs.unlink(lockfile).catch(() => {})
            throw error
          }
          await handle.close()
          break
        } catch (error) {
          if (code(error) !== 'EEXIST') return work()
          try {
            const contents = await fs.readFile(lockfile, 'utf8')
            let owner: Record<string, unknown> | null = null
            try {
              owner = record(JSON.parse(contents))
            } catch {
              // Empty/partial content is possible if its worker died during creation.
            }
            const validLease =
              owner &&
              text(owner.token, 100, 1) &&
              Number.isSafeInteger(owner.pid) &&
              (owner.pid as number) > 0 &&
              typeof owner.createdAt === 'number' &&
              Number.isFinite(owner.createdAt)
            // A live owner is never evicted on a slow read. Dead-worker leases can be
            // reclaimed, but release still checks the token before touching the path.
            if (
              validLease &&
              now() - (owner!.createdAt as number) >= abandonedMs &&
              !processAlive(owner!.pid as number)
            )
              await removeOwnLock(owner!.token as string)
            else if (!validLease) await removeAbandonedInvalidLock(contents)
          } catch {
            // A just-created lock may not have its content yet; wait for its owner.
          }
          if (now() - startedAt >= waitMs || performance.now() - startedMonotonic >= waitMs)
            throw new Error('Rental analysis normalization is already running')
          await new Promise(resolve => setTimeout(resolve, pollMs))
        }
      }
      try {
        return await work()
      } finally {
        await removeOwnLock(token)
      }
    },
  }
}
