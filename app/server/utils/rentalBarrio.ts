import {
  buildRentalBarrioPage,
  listRentalBarrios,
  RENTAL_BARRIO_LISTINGS,
  RENTAL_BARRIO_MAX_AGE_DAYS,
  RENTAL_BARRIO_MIN_CELLS,
  RENTAL_BARRIO_TYPES,
  rentalBarrioDirectoryPath,
  rentalBarrioPath,
  type RentalBarrioPage,
  type RentalBarrioSummary,
} from '../../utils/rentalBarrio'
import { rentalPhotos } from '../../utils/rentalPresentation'
import { rentalSavedSafeUrl } from '../../utils/rentalSaved'
import {
  canonicalRentalDepartment,
  RENTAL_STALE_DAYS,
  totalMonthlyUyu,
  type RentalCurrency,
  type RentalOffer,
  type RentalPublicProperty,
} from '../../utils/rentals'
import { rentalZoneLabel } from '../../utils/rentalZones'
import { RentalListingModel } from '../models/RentalListing'
import { connectDb } from './db'
import { rentalPageQualityIssues } from './rentalPage'
import { loadRentalZoneSnapshots } from './rentalZones'

export { RENTAL_BARRIO_LISTINGS, rentalBarrioDirectoryPath }

export interface RentalBarrioListing {
  key: string
  title: string
  propertyType: string
  bedrooms: number | null
  /** Rent of ONE advert, the one the card prices (never mixed with another advert's expenses). */
  price: number
  currency: RentalCurrency
  area: number | null
  /** The cover photo, that advert's first; null only for a row saved before photos were read. */
  image: string | null
  /** That advert's gastos comunes; 0 only when it publishes that there are none. */
  commonExpenses: number | null
  commonExpensesCurrency: RentalCurrency | null
  /** Rent + gastos comunes in pesos, from that same advert; null when they cannot be added. */
  totalUyu: number | null
}

/**
 * Rows read to fill the RENTAL_BARRIO_LISTINGS cards. Most recent adverts fail the ficha's own
 * quality gate (in Pocitos, the six cards of 2026-11-07 were Facebook adverts without gastos
 * comunes, all `noindex`), so the query reads five times what it shows and keeps the ones whose
 * ficha can be indexed.
 */
const RENTAL_BARRIO_CANDIDATES = 40

/** What the cards and the quality gate read — no descriptions, galleries or contact data. */
const LISTING_PROJECTION = {
  _id: 0,
  ...Object.fromEntries(
    [
      'key',
      'title',
      'propertyType',
      'department',
      'neighborhood',
      'address',
      'bedrooms',
      'bathrooms',
      'area',
      'parkingSpaces',
      'furnished',
    ].map(field => [field, 1])
  ),
  ...Object.fromEntries(
    [
      'source',
      'listingId',
      'url',
      'title',
      'image',
      'price',
      'currency',
      'priceUyu',
      'commonExpenses',
      'commonExpensesCurrency',
      'lastSeen',
    ].map(field => [`offers.${field}`, 1])
  ),
}

const currency = (value: unknown): RentalCurrency | null =>
  value === 'UYU' || value === 'USD' ? value : null
const amount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/**
 * The cards from the rows the query read, most recent first: only properties whose own ficha
 * passes its quality gate (`rentalPageQualityIssues`, the rule the sitemap applies) — so the
 * barrio page, an indexable landing page, links to fichas that can rank — and each card priced by
 * ONE current advert whose rent and gastos comunes add up. The gate runs on what was projected:
 * without the advert's description a dwelling with no street does not qualify, and without the
 * exchange rate neither do gastos comunes in dollars. Both make it stricter, never looser.
 */
export function pickRentalBarrioListings(
  rows: ReadonlyArray<Record<string, unknown>>,
  now = Date.now(),
  limit = RENTAL_BARRIO_LISTINGS
): RentalBarrioListing[] {
  const cutoff = new Date(now - RENTAL_STALE_DAYS * 86_400_000).toISOString().slice(0, 10)
  const out: RentalBarrioListing[] = []
  for (const row of rows) {
    if (out.length >= limit) break
    if (typeof row.key !== 'string' || !row.key) continue
    // The public pipeline's offer filter (`rentalPublicStages`): seen inside the stale window, with
    // a price. An advert that stopped appearing neither prices the card nor lends it a photo.
    const offers = (Array.isArray(row.offers) ? row.offers : [])
      .filter(
        (offer): offer is Record<string, unknown> => Boolean(offer) && typeof offer === 'object'
      )
      .filter(
        offer =>
          typeof offer.lastSeen === 'string' &&
          offer.lastSeen >= cutoff &&
          (amount(offer.priceUyu) ?? 0) > 0 &&
          (amount(offer.price) ?? 0) > 0 &&
          currency(offer.currency) !== null
      ) as unknown as RentalOffer[]
    const property = { ...row, offers } as unknown as RentalPublicProperty
    try {
      if (!offers.length || rentalPageQualityIssues(property, 0).length) continue
    } catch {
      continue
    }
    // The ficha only offers adverts it can link to (`rentalSavedSafeUrl`); the card does the same.
    const priced = offers
      .filter(offer => rentalSavedSafeUrl(offer.url))
      .map(offer => ({ offer, total: totalMonthlyUyu(offer, 0) }))
      .filter((entry): entry is { offer: RentalOffer; total: number } => entry.total !== null)
      .sort((a, b) => a.offer.priceUyu - b.offer.priceUyu)[0]
    if (!priced) continue
    const { offer } = priced
    out.push({
      key: row.key,
      title: String(row.title ?? ''),
      propertyType: String(row.propertyType ?? ''),
      bedrooms: typeof row.bedrooms === 'number' ? row.bedrooms : null,
      price: offer.price,
      currency: offer.currency,
      area: typeof row.area === 'number' ? row.area : null,
      image: rentalPhotos({ offers, matchingOffer: offer })[0]?.url ?? null,
      commonExpenses: amount(offer.commonExpenses),
      commonExpensesCurrency: currency(offer.commonExpensesCurrency),
      totalUyu: priced.total,
    })
  }
  return out
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
    // "Recientes" as the directory means it: `freshAt` is the publication day (else the first day
    // we saw the advert). `lastSeen` is the day of the last read, the same for thousands of rows,
    // so the `key` tiebreak chose the cards — 'montevideo-apartamento-…' (Facebook) before
    // 'montevideo-pocitos-…'. `key` still breaks the remaining ties: one snapshot, one set of
    // cards.
    .sort({ freshAt: -1, key: 1 })
    .limit(RENTAL_BARRIO_CANDIDATES)
    .select(LISTING_PROJECTION)
    .maxTimeMS(3000)
    .lean()
  return pickRentalBarrioListings(rows as unknown as Array<Record<string, unknown>>, now)
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
