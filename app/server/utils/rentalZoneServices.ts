import type { RentalServiceSelection, RentalZoneImpact } from '../../utils/rentalZoneTypes'
import {
  buildRentalZoneScores,
  attachRentalZoneUtilities,
  projectRentalZoneImpact,
  rentalServiceFilterOptions,
  rentalServiceZoneIds,
  rentalZoneUtilitiesMeta,
} from '../../utils/rentalZoneServices'
import { PropertyZoneSnapshotModel } from '../models/PropertyZoneSnapshot'
import { connectDb } from './db'
import { loadRentalZoneSnapshots } from './rentalZones'

const IMPACT_CACHE_MS = 300_000
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024
let impactCache: { value: RentalZoneImpact | null; until: number } | null = null
let impactPending: Promise<RentalZoneImpact | null> | null = null

/** The stored neighbourhood price analysis; one shared cache, no query variants. */
export async function loadRentalZoneImpactSnapshot(
  now = Date.now()
): Promise<RentalZoneImpact | null> {
  if (impactCache && impactCache.until > now) return impactCache.value
  if (impactPending) return impactPending
  impactPending = (async () => {
    await connectDb()
    const doc = await PropertyZoneSnapshotModel.findOne({ _id: 'impact' })
      .maxTimeMS(5000)
      .lean()
      .exec()
    const value =
      doc && Buffer.byteLength(JSON.stringify(doc), 'utf8') <= MAX_DOCUMENT_BYTES
        ? projectRentalZoneImpact(doc, now)
        : null
    impactCache = { value, until: now + IMPACT_CACHE_MS }
    return value
  })().finally(() => {
    impactPending = null
  })
  return impactPending
}

/**
 * Official areas that pass every requested service filter, or null when the snapshot or a requested
 * layer is unavailable: the directory then answers with no listings instead of ignoring the filter.
 */
export async function loadRentalServiceZoneIds(
  selections: readonly RentalServiceSelection[]
): Promise<string[] | null> {
  if (!selections.length) return []
  try {
    const snapshots = await loadRentalZoneSnapshots()
    return rentalServiceZoneIds(snapshots.context?.utilities ?? null, selections)
  } catch {
    return null
  }
}

export async function loadRentalServiceFilters() {
  const snapshots = await loadRentalZoneSnapshots()
  const utilities = snapshots.context?.utilities ?? null
  return {
    options: rentalServiceFilterOptions(utilities),
    meta: rentalZoneUtilitiesMeta(utilities),
  }
}

const ZONE = /^(?:mvd:(?:[1-9]|[1-5]\d|6[0-2])|ute:\d{1,6})$/
/** One official area's service layers, for the listing page. */
export async function loadRentalZoneServiceProfile(zone: unknown, department: unknown) {
  if (typeof zone !== 'string' || !ZONE.test(zone)) return null
  const snapshots = await loadRentalZoneSnapshots()
  const utilities = snapshots.context?.utilities ?? null
  if (!utilities) return null
  const name = utilities.names[zone]
  const locality = utilities.localities[zone]
  const scoped = zone.startsWith('mvd:') ? 'Montevideo' : locality?.department
  if (!name || !scoped || (typeof department === 'string' && department && department !== scoped))
    return null
  const code = zone.startsWith('mvd:') ? zone.slice(4) : null
  const profile = attachRentalZoneUtilities(
    utilities,
    { department: scoped, neighborhood: locality?.name || name },
    code
  )
  if (!profile) return null
  const crime = code ? snapshots.context?.crime?.byCode[code] : null
  return {
    zone,
    name,
    department: scoped,
    utilities: profile,
    meta: rentalZoneUtilitiesMeta(utilities),
    crime:
      crime && snapshots.context?.crime
        ? {
            total: crime.total,
            periodFrom: snapshots.context.crime.periodFrom,
            periodTo: snapshots.context.crime.periodTo,
          }
        : null,
  }
}

/** Every zone's position among the others, for the neighbourhood bars of the listing cards. */
export async function loadRentalZoneScores() {
  const snapshots = await loadRentalZoneSnapshots()
  return buildRentalZoneScores(snapshots.context?.utilities ?? null)
}
