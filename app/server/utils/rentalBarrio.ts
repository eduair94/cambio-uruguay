import {
  buildRentalBarrioPage,
  listRentalBarrios,
  RENTAL_BARRIO_MAX_AGE_DAYS,
  RENTAL_BARRIO_MIN_CELLS,
  RENTAL_BARRIO_TYPES,
  rentalBarrioDirectoryPath,
  rentalBarrioPath,
  type RentalBarrioPage,
  type RentalBarrioSummary,
} from '../../utils/rentalBarrio'
import { canonicalRentalDepartment, RENTAL_STALE_DAYS } from '../../utils/rentals'
import { rentalZoneLabel } from '../../utils/rentalZones'
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
/** The public page: the raw spellings only steer the server's listings query. */
export interface RentalBarrioResponse extends Omit<RentalBarrioPage, 'spellings'> {
  listings: RentalBarrioListing[]
  directoryPath: string
}

const unaccent = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '')

/**
 * Every exact spelling the listings query accepts for this barrio. The snapshot buckets carry one
 * spelling each (the first advert of the cohort), while the property rows may be written in
 * another case or without the accent; the variants keep that recall with exact matches, which is
 * what lets Mongo use the `{department, neighborhood}` index. Every variant folds to the same
 * barrio name, so none of them can pull in another barrio.
 */
export function rentalBarrioNeighborhoodSpellings(spellings: readonly string[]): string[] {
  const out = new Set<string>()
  for (const raw of spellings) {
    const value = raw.trim().replace(/\s+/g, ' ')
    if (!value) continue
    for (const form of [
      raw,
      value,
      value.toLocaleUpperCase('es'),
      value.toLocaleLowerCase('es'),
      rentalZoneLabel([value]),
    ]) {
      out.add(form)
      out.add(unaccent(form))
    }
  }
  return [...out].sort()
}

/**
 * Without a collation on purpose: no index carries `RENTAL_COLLATION`, so the collated query was a
 * full scan plus an in-memory sort. The stale cutoff is `buildRentalFilter`'s, and only the two
 * types the market measures enter: a garage or an office is not a rent price for a home.
 */
export function rentalBarrioListingsFilter(
  department: string,
  spellings: readonly string[],
  now = Date.now()
): Record<string, unknown> {
  const cutoff = new Date(now - RENTAL_STALE_DAYS * 86_400_000).toISOString().slice(0, 10)
  return {
    department: canonicalRentalDepartment(department),
    neighborhood: { $in: rentalBarrioNeighborhoodSpellings(spellings) },
    propertyType: { $in: [...RENTAL_BARRIO_TYPES] },
    lastSeen: { $gte: cutoff },
  }
}

export async function latestRentalBarrioListings(
  department: string,
  spellings: readonly string[],
  now = Date.now()
): Promise<RentalBarrioListing[]> {
  if (!spellings.length) return []
  await connectDb()
  const rows = await RentalListingModel.find(rentalBarrioListingsFilter(department, spellings, now))
    // `key` breaks ties between adverts seen the same day: the same snapshot renders the same cards.
    .sort({ lastSeen: -1, key: 1 })
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
    listings?: (department: string, spellings: readonly string[]) => Promise<RentalBarrioListing[]>
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
  const { spellings, ...publicPage } = page
  const listings = await (deps.listings ?? latestRentalBarrioListings)(
    page.department,
    spellings
  ).catch(error => {
    // The page still renders without cards, but a failing query must leave a trace.
    console.warn('[rental-barrio] listings failed', error)
    return [] as RentalBarrioListing[]
  })
  return {
    ...publicPage,
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

/** The ficha's button: the page and the barrio's display name ("Pocitos", never "POCITOS"). */
export interface RentalBarrioPageLink {
  path: string
  label: string
}

/**
 * The indexable neighbourhood pages by path, as a promise that never rejects (null = unknown). The
 * ficha starts it before its own Mongo work so both run in parallel.
 */
export function startIndexableRentalBarrioLinks(
  barrios: () => Promise<RentalBarrioSummary[]> = loadIndexableRentalBarrios
): Promise<ReadonlyMap<string, RentalBarrioPageLink> | null> {
  try {
    return barrios()
      .then(
        list =>
          new Map(list.map(item => [item.path, { path: item.path, label: item.neighborhood }]))
      )
      .catch(() => null)
  } catch {
    return Promise.resolve(null)
  }
}

/**
 * The ficha's link to its neighbourhood page: only if that page is indexable (a link to a noindex
 * from ~9,600 fichas would be noise). Never throws and never takes longer than the timeout: a slow
 * or failing snapshot just means no link. The answer depends only on the snapshot, so an
 * edge-cached ficha stays as correct as the snapshot it was rendered from.
 */
export async function resolveIndexableBarrioLink(
  department: string | null | undefined,
  neighborhood: string | null | undefined,
  deps: {
    links?: Promise<ReadonlyMap<string, RentalBarrioPageLink> | null>
    barrios?: () => Promise<RentalBarrioSummary[]>
    timeoutMs?: number
  } = {}
): Promise<RentalBarrioPageLink | null> {
  if (!department || !neighborhood) return null
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const path = rentalBarrioPath(department, neighborhood)
    const timeout = new Promise<null>(resolve => {
      timer = setTimeout(() => resolve(null), deps.timeoutMs ?? RENTAL_BARRIO_LINK_TIMEOUT_MS)
    })
    const links = await Promise.race([
      deps.links ?? startIndexableRentalBarrioLinks(deps.barrios),
      timeout,
    ])
    return links?.get(path) ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
