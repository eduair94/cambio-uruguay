import {
  buildRentalBarrioPage,
  listRentalBarrios,
  RENTAL_BARRIO_MAX_AGE_DAYS,
  RENTAL_BARRIO_MIN_CELLS,
  rentalBarrioDirectoryPath,
  rentalBarrioPath,
  type RentalBarrioPage,
  type RentalBarrioSummary,
} from '../../utils/rentalBarrio'
import {
  buildRentalFilter,
  normalizeRentalQuery,
  RENTAL_COLLATION,
  RENTAL_STALE_DAYS,
} from '../../utils/rentals'
import { RentalListingModel } from '../models/RentalListing'
import { connectDb } from './db'
import { loadRentalZoneSnapshots } from './rentalZones'

export { rentalBarrioDirectoryPath }

export interface RentalBarrioListing {
  key: string
  title: string
  propertyType: string
  bedrooms: number | null
  price: number
  currency: 'UYU' | 'USD'
  area: number | null
}
export interface RentalBarrioResponse extends RentalBarrioPage {
  listings: RentalBarrioListing[]
  directoryPath: string
}

async function latestListings(
  department: string,
  neighborhood: string
): Promise<RentalBarrioListing[]> {
  await connectDb()
  const { filter } = buildRentalFilter(
    normalizeRentalQuery({ department, neighborhood }),
    RENTAL_STALE_DAYS
  )
  const rows = await RentalListingModel.find(filter)
    .collation(RENTAL_COLLATION)
    .sort({ lastSeen: -1 })
    .limit(6)
    .select({
      _id: 0,
      key: 1,
      title: 1,
      propertyType: 1,
      bedrooms: 1,
      price: 1,
      currency: 1,
      area: 1,
    })
    .maxTimeMS(3000)
    .lean()
  return (rows as unknown as Array<Record<string, unknown>>)
    .filter(row => typeof row.key === 'string' && typeof row.price === 'number')
    .map(row => ({
      key: row.key as string,
      title: String(row.title ?? ''),
      propertyType: String(row.propertyType ?? ''),
      bedrooms: typeof row.bedrooms === 'number' ? row.bedrooms : null,
      price: row.price as number,
      currency: row.currency === 'USD' ? ('USD' as const) : ('UYU' as const),
      area: typeof row.area === 'number' ? row.area : null,
    }))
}

export async function loadRentalBarrio(
  departmentSlug: string,
  barrioSlug: string,
  deps: {
    snapshots?: typeof loadRentalZoneSnapshots
    listings?: (department: string, neighborhood: string) => Promise<RentalBarrioListing[]>
    now?: () => number
  } = {}
): Promise<RentalBarrioResponse | null> {
  const snapshots = await (deps.snapshots ?? loadRentalZoneSnapshots)()
  const page = buildRentalBarrioPage(
    snapshots,
    departmentSlug,
    barrioSlug,
    (deps.now ?? Date.now)()
  )
  if (!page) return null
  const listings = await (deps.listings ?? latestListings)(
    page.department,
    page.neighborhood
  ).catch(() => [])
  return {
    ...page,
    listings,
    directoryPath: rentalBarrioDirectoryPath(page.department, page.neighborhood),
  }
}

export async function loadIndexableRentalBarrios(
  deps: { snapshots?: typeof loadRentalZoneSnapshots; now?: () => number } = {}
): Promise<RentalBarrioSummary[]> {
  const snapshots = await (deps.snapshots ?? loadRentalZoneSnapshots)()
  const generated = Date.parse(snapshots.market?.generatedAt ?? '')
  const now = (deps.now ?? Date.now)()
  if (!Number.isFinite(generated) || now - generated > RENTAL_BARRIO_MAX_AGE_DAYS * 86_400_000)
    return []
  return listRentalBarrios(snapshots).filter(
    item => item.publishableCells >= RENTAL_BARRIO_MIN_CELLS
  )
}

/** The rental ficha never waits longer than this for its neighbourhood link. */
export const RENTAL_BARRIO_LINK_TIMEOUT_MS = 1500

/**
 * The indexable neighbourhood paths, as a promise that never rejects (null = unknown). The ficha
 * starts it before its own Mongo work so both run in parallel.
 */
export function startIndexableRentalBarrioPaths(
  barrios: () => Promise<RentalBarrioSummary[]> = loadIndexableRentalBarrios
): Promise<ReadonlySet<string> | null> {
  try {
    return barrios()
      .then(list => new Set(list.map(item => item.path)))
      .catch(() => null)
  } catch {
    return Promise.resolve(null)
  }
}

/**
 * The ficha's link to its neighbourhood page: the path only if that page is indexable (a link to a
 * noindex from ~9,600 fichas would be noise). Never throws and never takes longer than the timeout:
 * a slow or failing snapshot just means no link. The answer depends only on the snapshot, so an
 * edge-cached ficha stays as correct as the snapshot it was rendered from.
 */
export async function resolveIndexableBarrioPath(
  department: string | null | undefined,
  neighborhood: string | null | undefined,
  deps: {
    paths?: Promise<ReadonlySet<string> | null>
    barrios?: () => Promise<RentalBarrioSummary[]>
    timeoutMs?: number
  } = {}
): Promise<string | null> {
  if (!department || !neighborhood) return null
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const path = rentalBarrioPath(department, neighborhood)
    const timeout = new Promise<null>(resolve => {
      timer = setTimeout(() => resolve(null), deps.timeoutMs ?? RENTAL_BARRIO_LINK_TIMEOUT_MS)
    })
    const paths = await Promise.race([
      deps.paths ?? startIndexableRentalBarrioPaths(deps.barrios),
      timeout,
    ])
    return paths?.has(path) ? path : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
