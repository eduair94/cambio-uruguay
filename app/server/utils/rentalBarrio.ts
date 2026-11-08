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
import { rentalPlaceKey } from '../../utils/rentalBarrioName'
import { rentalListingIndexable, type RentalIndexAllowlist } from '../../utils/rentalIndexHygiene'
import { rentalSnippetStreet } from '../../utils/rentalPageSnippet'
import { rentalPhotos, rentalPropertyPath } from '../../utils/rentalPresentation'
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
import { loadRentalIndexAllowlist } from './rentalIndexAllowlist'
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
 * verdict (in Pocitos, the six cards of 2026-11-07 were Facebook adverts without gastos comunes,
 * all `noindex`; of the 24 most recent rows of the whole country captured on 2026-11-08, 5
 * passed), so the query reads ten times what it shows. Under the hint below the cost is the scan of
 * the barrio's own rows either way: the limit only bounds the top-k sort and what travels.
 */
const RENTAL_BARRIO_CANDIDATES = 80

/**
 * The `{department, neighborhood}` index, forced. The sort `{freshAt: -1, key: 1}` matches an
 * index of its own, and walking it while filtering by barrio is quick in Pocitos and a scan of the
 * whole collection in a barrio with fewer rows than RENTAL_BARRIO_CANDIDATES — a plan the plan
 * cache can hand from one barrio to the next, and a `maxTimeMS` that trips leaves the page
 * without cards. With the hint the query reads the barrio's rows and sorts them, as it did when
 * it sorted by `lastSeen` (which matches no index). Declared on both RentalListing schemas
 * (tests/appdb/schema_parity.test.ts); rentalBarrioServer.test.ts fails if the app's stops.
 */
export const RENTAL_BARRIO_LISTINGS_HINT = { department: 1, neighborhood: 1, priceUyu: 1 } as const

/**
 * What the cards and the ficha's verdict read. The adverts' descriptions are read because the
 * verdict reads them (room counts that contradict the ficha, the address-or-description rule) and
 * never leave this module; galleries, sellers and contact data are not read at all. `furnished`
 * and `parkingSpaces` come from the adverts because the public pipeline derives them from the
 * current ones (`rentalPublicStages`), overwriting what the property stores.
 */
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
      'firstSeen',
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
      'furnished',
      'parkingSpaces',
      'lastSeen',
      'details.description',
    ].map(field => [`offers.${field}`, 1])
  ),
}

const currency = (value: unknown): RentalCurrency | null =>
  value === 'UYU' || value === 'USD' ? value : null
const amount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/** `rentalPublicStages`: furnished if an advert says so and none says otherwise, and the reverse. */
function furnishedOf(offers: readonly RentalOffer[]): boolean | null {
  const said = new Set<unknown>(offers.map(offer => offer.furnished))
  if (said.has(true)) return said.has(false) ? null : true
  return said.has(false) ? false : null
}
/** `rentalPublicStages`: the most parking spaces any current advert declares. */
function parkingOf(offers: readonly RentalOffer[]): number | null {
  const counts = offers
    .map(offer => offer.parkingSpaces)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  return counts.length ? Math.max(...counts) : null
}
const advertId = (offer: RentalOffer) => `${offer.source}:${offer.listingId}`

/**
 * One card per flat: two rows with the same street and door, rent, bedrooms and bathrooms are the
 * same home published twice. Measured on the 72 Pocitos two-bedroom rows captured on 2026-11-08:
 * "Ellauri 1084" from El País and from Mercado Libre, and "Luis B. Cavia 2640" twice in Mercado
 * Libre — without this the first eight cards were six homes. Display only, never identity: two
 * units of one building at the same price lose a card, not a ficha. A street without a door
 * number names a whole block and folds nothing.
 */
function sameHomeKey(property: RentalPublicProperty, offer: RentalOffer): string | null {
  const street = rentalSnippetStreet(String(property.address ?? ''))
  if (!street) return null
  return [
    rentalPlaceKey(street),
    `${offer.currency}:${offer.price}`,
    property.bedrooms ?? '',
    property.bathrooms ?? '',
  ].join('|')
}

export interface RentalBarrioPickOptions {
  /** `loadRentalIndexAllowlist()`, as the ficha reads it; null means no verdict, as there. */
  allowlist?: RentalIndexAllowlist | null
  limit?: number
}

/**
 * The cards from the rows the query read, most recent first: only properties whose own ficha is
 * indexable — so the barrio page, an indexable landing page, links to fichas that can rank — each
 * priced by ONE current advert whose rent and gastos comunes add up, and one card per home.
 *
 * The verdict is the ficha's, on the same fields (`rentalPageQualityIssues`, then the index
 * hygiene of `rentalIndexHygiene.ts`), with three differences. Stricter: only the cover photos are
 * read, so a home whose photos are all in the gallery does not qualify, and without the exchange
 * rate neither do gastos comunes in dollars. Narrower: an advert shared by two properties makes
 * both `noindex` (`ambiguous_identity`), and that is checked among the rows read here, while the
 * ficha asks the whole collection — a query this page does not pay for on every render.
 */
export function pickRentalBarrioListings(
  rows: ReadonlyArray<Record<string, unknown>>,
  now = Date.now(),
  options: RentalBarrioPickOptions = {}
): RentalBarrioListing[] {
  const { allowlist = null, limit = RENTAL_BARRIO_LISTINGS } = options
  const cutoff = new Date(now - RENTAL_STALE_DAYS * 86_400_000).toISOString().slice(0, 10)
  const candidates = rows.flatMap(row => {
    if (typeof row.key !== 'string' || !row.key) return []
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
    return offers.length ? [{ row, key: row.key, offers }] : []
  })
  const owners = new Map<string, Set<string>>()
  for (const { key, offers } of candidates)
    for (const offer of offers)
      owners.set(advertId(offer), (owners.get(advertId(offer)) ?? new Set<string>()).add(key))
  const homes = new Set<string>()
  const out: RentalBarrioListing[] = []
  for (const { row, key, offers } of candidates) {
    if (out.length >= limit) break
    if (offers.some(offer => owners.get(advertId(offer))!.size > 1)) continue
    const property = {
      ...row,
      offers,
      furnished: furnishedOf(offers),
      parkingSpaces: parkingOf(offers),
    } as unknown as RentalPublicProperty
    try {
      if (rentalPageQualityIssues(property, 0).length) continue
    } catch {
      continue
    }
    const firstSeenAt = typeof row.firstSeen === 'string' ? row.firstSeen : null
    if (!rentalListingIndexable({ firstSeenAt, path: rentalPropertyPath(key) }, allowlist, now))
      continue
    // The ficha only offers adverts it can link to (`rentalSavedSafeUrl`); the card does the same.
    const priced = offers
      .filter(offer => rentalSavedSafeUrl(offer.url))
      .map(offer => ({ offer, total: totalMonthlyUyu(offer, 0) }))
      .filter((entry): entry is { offer: RentalOffer; total: number } => entry.total !== null)
      .sort((a, b) => a.offer.priceUyu - b.offer.priceUyu)[0]
    if (!priced) continue
    const { offer } = priced
    const home = sameHomeKey(property, offer)
    if (home !== null) {
      if (homes.has(home)) continue
      homes.add(home)
    }
    out.push({
      key,
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
  const [rows, allowlist] = await Promise.all([
    RentalListingModel.find(rentalBarrioListingsFilter(department, spellings, now))
      // "Recientes" as the directory means it: `freshAt` is the publication day (else the first
      // day we saw the advert). `lastSeen` is the day of the last read, the same for thousands of
      // rows, so the `key` tiebreak chose the cards — 'montevideo-apartamento-…' (Facebook) before
      // 'montevideo-pocitos-…'. `key` still breaks the remaining ties: one snapshot, one set of
      // cards.
      .sort({ freshAt: -1, key: 1 })
      .hint(RENTAL_BARRIO_LISTINGS_HINT)
      .limit(RENTAL_BARRIO_CANDIDATES)
      .select(LISTING_PROJECTION)
      .maxTimeMS(3000)
      .lean(),
    // The ficha's index hygiene, from the same memoized read (once an hour per process); it never
    // rejects, and without a fresh list nothing changes.
    loadRentalIndexAllowlist(),
  ])
  return pickRentalBarrioListings(rows as unknown as Array<Record<string, unknown>>, now, {
    allowlist,
  })
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
