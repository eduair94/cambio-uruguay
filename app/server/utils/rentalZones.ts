import {
  buildRentalZoneResponse,
  normalizeRentalZoneQuery,
  projectRentalZoneSnapshots,
  rentalZoneBoundaries,
  type RentalZoneSnapshots,
} from '../../utils/rentalZones'
import { PropertyZoneSnapshotModel } from '../models/PropertyZoneSnapshot'
import { connectDb } from './db'

export class RentalZonesError extends Error {
  constructor(public readonly statusCode: 400 | 503) {
    super(statusCode === 400 ? 'Invalid zone query' : 'Zone data temporarily unavailable')
  }
}
const CACHE_MS = 120_000
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024
const MAX_WAIT_MS = 8_000

// These exact two IDs are the only read path. Never accept a document ID from a query.
export const RENTAL_ZONE_SNAPSHOT_QUERY = { _id: { $in: ['market', 'context'] } }
export const RENTAL_ZONE_SNAPSHOT_PROJECTION = {
  _id: 1,
  version: 1,
  generatedAt: 1,
  rentalDataAsOf: 1,
  sampleMinimum: 1,
  'buckets.department': 1,
  'buckets.neighborhood': 1,
  'buckets.propertyType': 1,
  'buckets.bedrooms': 1,
  'buckets.prices': 1,
  'geometry.source': 1,
  'geometry.zones.officialCode': 1,
  'geometry.zones.name': 1,
  'geometry.zones.department': 1,
  'geometry.zones.geometry': 1,
  'crime.periodFrom': 1,
  'crime.periodTo': 1,
  'crime.includesAttempts': 1,
  'crime.countsByOfficialCode': 1,
  'crime.countsByDepartment': 1,
  'crime.source': 1,
  'services.dataAsOf': 1,
  'services.fetchedAt': 1,
  'services.countsByOfficialCode': 1,
} as const

async function readSnapshots(): Promise<unknown[]> {
  await connectDb()
  return PropertyZoneSnapshotModel.find(RENTAL_ZONE_SNAPSHOT_QUERY, RENTAL_ZONE_SNAPSHOT_PROJECTION)
    .maxTimeMS(5000)
    .limit(2)
    .lean()
    .exec()
}

/** One bounded, public-only cache; query variants do not create additional cache entries. */
export function createRentalZoneSnapshotLoader({
  read = readSnapshots,
  now = Date.now,
}: {
  read?: () => Promise<unknown[]>
  now?: () => number
} = {}) {
  let cache: { value: RentalZoneSnapshots; until: number } | null = null
  let pending: Promise<RentalZoneSnapshots> | null = null
  let failureUntil = 0
  const shared = () => {
    if (cache && cache.until > now()) return Promise.resolve(cache.value)
    if (failureUntil > now()) return Promise.reject(new RentalZonesError(503))
    if (pending) return pending
    pending = (async () => {
      const rows = await read()
      if (!Array.isArray(rows) || rows.length > 2) throw new RentalZonesError(503)
      let market: unknown = null,
        context: unknown = null
      for (const item of rows) {
        if (
          !item ||
          typeof item !== 'object' ||
          Array.isArray(item) ||
          Buffer.byteLength(JSON.stringify(item), 'utf8') > MAX_DOCUMENT_BYTES
        )
          throw new RentalZonesError(503)
        const id = (item as Record<string, unknown>)._id
        if (id === 'market' && market === null) market = item
        else if (id === 'context' && context === null) context = item
        else throw new RentalZonesError(503)
      }
      const value = projectRentalZoneSnapshots(market, context)
      cache = { value, until: now() + CACHE_MS }
      failureUntil = 0
      return value
    })().finally(() => {
      pending = null
    })
    return pending
  }
  return async (): Promise<RentalZoneSnapshots> => {
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        shared(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new RentalZonesError(503)), MAX_WAIT_MS)
        }),
      ])
    } catch {
      failureUntil = now() + 30_000
      // A read failure must not blank independent usable layers. Original source
      // dates remain intact, and the response projector applies expiry again.
      if (cache) {
        cache.until = failureUntil
        return cache.value
      }
      throw new RentalZonesError(503)
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }
}
export const loadRentalZoneSnapshots = createRentalZoneSnapshotLoader()

export async function loadRentalZones(input: Record<string, unknown>) {
  let filters
  try {
    filters = normalizeRentalZoneQuery(input)
  } catch {
    throw new RentalZonesError(400)
  }
  const snapshots = await loadRentalZoneSnapshots()
  return buildRentalZoneResponse(snapshots, filters)
}
export async function loadRentalZoneBoundaries(input: Record<string, unknown> = {}) {
  if (Object.keys(input).length) throw new RentalZonesError(400)
  const value = rentalZoneBoundaries(await loadRentalZoneSnapshots())
  if (!value) throw new RentalZonesError(503)
  return value
}
