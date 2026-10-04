import {
  buildRentalBarrioPage,
  listRentalBarrios,
  RENTAL_BARRIO_MAX_AGE_DAYS,
  RENTAL_BARRIO_MIN_CELLS,
  rentalBarrioDirectoryPath,
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
