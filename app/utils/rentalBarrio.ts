// app/utils/rentalBarrio.ts
// Una página por barrio con lo que ya calcula `currency-property-zones` (snapshot `market`):
// renta, gastos comunes y total por tipo × dormitorios. Este módulo es puro: lo usan el endpoint,
// el sitemap y el hub, así que el gate de indexación vive en un solo lugar.
import { slugifyDepartment } from './departments'
import { slugifyText } from './longform'
import { rentalZoneLabel, rentalZoneName, type RentalZoneSnapshots } from './rentalZones'
import type {
  RentalZoneBedrooms,
  RentalZonePrices,
  RentalZonePropertyType,
} from './rentalZoneTypes'

export const RENTAL_BARRIO_MAX_AGE_DAYS = 7
export const RENTAL_BARRIO_MIN_CELLS = 2
export const RENTAL_BARRIO_BEDROOMS: readonly RentalZoneBedrooms[] = [
  'any',
  '0',
  '1',
  '2',
  '3',
  '4plus',
]
export const RENTAL_BARRIO_TYPES: readonly RentalZonePropertyType[] = ['apartamento', 'casa']
const SIMILAR_LIMIT = 6
const LARGEST_LIMIT = 6

export const rentalBarrioSlug = (neighborhood: string): string =>
  slugifyText(rentalZoneName(neighborhood))
export const rentalBarrioPath = (department: string, neighborhood: string): string =>
  `/alquiler/${slugifyDepartment(department)}/${rentalBarrioSlug(neighborhood)}`

export interface RentalBarrioCell {
  propertyType: RentalZonePropertyType
  bedrooms: RentalZoneBedrooms
  prices: RentalZonePrices
}
export interface RentalBarrioLink {
  department: string
  neighborhood: string
  path: string
  median: number | null
  count: number
}
export interface RentalBarrioSummary {
  department: string
  departmentSlug: string
  neighborhood: string
  slug: string
  path: string
  cells: RentalBarrioCell[]
  publishableCells: number
  listings: number
  /**
   * The raw `neighborhood` spellings the snapshot buckets carry for this barrio ("POCITOS",
   * "Pocitos"). Server-only: the listings query matches them exactly so it can use the
   * `{department, neighborhood}` index instead of a collated scan. Never sent to the client.
   */
  spellings: string[]
  /** The same folded name exists in another department (Carrasco: Montevideo and Canelones). */
  nameShared: boolean
}
export interface RentalBarrioRank {
  position: number
  of: number
  propertyType: RentalZonePropertyType
  bedrooms: RentalZoneBedrooms
}
export interface RentalBarrioPage {
  department: string
  departmentSlug: string
  neighborhood: string
  slug: string
  path: string
  /** See `RentalBarrioSummary.spellings`; the barrio endpoint strips it from the response. */
  spellings: string[]
  /** Title, H1 and breadcrumb name the department when this is true, or two pages would share them. */
  nameShared: boolean
  cells: RentalBarrioCell[]
  rank: RentalBarrioRank | null
  similar: RentalBarrioLink[]
  largest: RentalBarrioLink[]
  generatedAt: string | null
  rentalDataAsOf: string | null
  indexable: boolean
  officialZone: string | null
  /** `mvd:<code>`, the key `/api/rentals/zone-profile` expects; null outside the 62 areas. */
  officialZoneId: string | null
}

/**
 * Directory link for one table row. The market cells count EXACT bedrooms ('4plus' is the only
 * open bucket), while the directory's `bedrooms` is a minimum unless `bedroomsExact=1`, so the
 * link carries the flag to list the same homes the row measured. `type` is the directory's own
 * filter key (`rentalQueryToParams`), whose values are the stored property types.
 */
export function rentalBarrioDirectoryPath(
  department: string,
  neighborhood: string,
  bedrooms?: string,
  propertyType?: RentalZonePropertyType
): string {
  const params = new URLSearchParams({ department, neighborhood })
  if (propertyType) params.set('type', propertyType)
  if (bedrooms === '4plus') params.set('bedrooms', '4')
  else if (bedrooms && /^\d$/.test(bedrooms)) {
    params.set('bedrooms', bedrooms)
    if (bedrooms !== '0') params.set('bedroomsExact', '1')
  }
  return `/alquileres-uruguay?${params.toString()}`
}

const cellOrder = (cell: RentalBarrioCell) =>
  RENTAL_BARRIO_TYPES.indexOf(cell.propertyType) * 10 +
  RENTAL_BARRIO_BEDROOMS.indexOf(cell.bedrooms)
const cellOf = (
  summary: RentalBarrioSummary,
  type: RentalZonePropertyType,
  bedrooms: RentalZoneBedrooms
) => summary.cells.find(cell => cell.propertyType === type && cell.bedrooms === bedrooms) ?? null
const medianOf = (
  summary: RentalBarrioSummary,
  type: RentalZonePropertyType,
  bedrooms: RentalZoneBedrooms
) => cellOf(summary, type, bedrooms)?.prices.rent.median ?? null

/**
 * One list per snapshot: the loader caches the `market` object, and every ficha and barrio request
 * would otherwise regroup thousands of buckets. Keyed weakly so a replaced snapshot is collected.
 * The returned list is shared: callers filter/copy it, never mutate it.
 */
const barrioListCache = new WeakMap<object, readonly RentalBarrioSummary[]>()

export function listRentalBarrios(snapshots: RentalZoneSnapshots): readonly RentalBarrioSummary[] {
  const market = snapshots.market
  if (!market) return []
  const cached = barrioListCache.get(market)
  if (cached) return cached
  const list = buildRentalBarrioList(market.buckets ?? [])
  barrioListCache.set(market, list)
  return list
}

function buildRentalBarrioList(
  buckets: NonNullable<RentalZoneSnapshots['market']>['buckets']
): RentalBarrioSummary[] {
  const groups = new Map<
    string,
    { department: string; spellings: string[]; cells: RentalBarrioCell[] }
  >()
  for (const bucket of buckets) {
    const key = JSON.stringify([bucket.department, rentalZoneName(bucket.neighborhood)])
    const group = groups.get(key) ?? { department: bucket.department, spellings: [], cells: [] }
    if (!group.spellings.includes(bucket.neighborhood)) group.spellings.push(bucket.neighborhood)
    group.cells.push({
      propertyType: bucket.propertyType,
      bedrooms: bucket.bedrooms,
      prices: bucket.prices,
    })
    groups.set(key, group)
  }
  const out: RentalBarrioSummary[] = []
  for (const group of groups.values()) {
    const neighborhood = rentalZoneLabel(group.spellings)
    const slug = rentalBarrioSlug(neighborhood)
    // A name made only of punctuation would publish `/alquiler/<departamento>/`: no page.
    if (!slug) continue
    const cells = group.cells.sort((a, b) => cellOrder(a) - cellOrder(b))
    const anyCount = (type: RentalZonePropertyType) =>
      cells.find(cell => cell.propertyType === type && cell.bedrooms === 'any')?.prices.rent
        .count ?? 0
    out.push({
      department: group.department,
      departmentSlug: slugifyDepartment(group.department),
      neighborhood,
      slug,
      path: rentalBarrioPath(group.department, neighborhood),
      cells,
      publishableCells: cells.filter(cell => cell.prices.rent.median !== null).length,
      listings: anyCount('apartamento') + anyCount('casa'),
      spellings: group.spellings,
      nameShared: false,
    })
  }
  const departmentsByName = new Map<string, Set<string>>()
  for (const item of out) {
    const name = rentalZoneName(item.neighborhood)
    departmentsByName.set(name, (departmentsByName.get(name) ?? new Set()).add(item.departmentSlug))
  }
  for (const item of out)
    item.nameShared = (departmentsByName.get(rentalZoneName(item.neighborhood))?.size ?? 0) > 1
  return out.sort(
    (a, b) =>
      a.department.localeCompare(b.department, 'es') ||
      b.listings - a.listings ||
      a.neighborhood.localeCompare(b.neighborhood, 'es')
  )
}

const link = (
  summary: RentalBarrioSummary,
  type: RentalZonePropertyType,
  bedrooms: RentalZoneBedrooms
): RentalBarrioLink => ({
  department: summary.department,
  neighborhood: summary.neighborhood,
  path: summary.path,
  median: medianOf(summary, type, bedrooms),
  count: summary.listings,
})

export function buildRentalBarrioPage(
  snapshots: RentalZoneSnapshots,
  departmentSlug: string,
  barrioSlug: string,
  now = Date.now()
): RentalBarrioPage | null {
  const market = snapshots.market
  if (!market) return null
  const all = listRentalBarrios(snapshots)
  const self = all.find(item => item.departmentSlug === departmentSlug && item.slug === barrioSlug)
  if (!self) return null
  const peers = all.filter(item => item.department === self.department && item !== self)
  // Links go only to pages that can be indexed: a chip to a noindex page is a dead end for Google
  // and a thin page for the reader. The rank still counts every barrio with data.
  const linkable = peers.filter(item => item.publishableCells >= RENTAL_BARRIO_MIN_CELLS)
  const cells = self.cells.filter(cell => cell.prices.rent.median !== null)

  let rank: RentalBarrioRank | null = null
  let similar: RentalBarrioLink[] = []
  for (const [type, bedrooms] of [
    ['apartamento', '2'],
    ['apartamento', 'any'],
  ] as const) {
    const own = medianOf(self, type, bedrooms)
    if (own === null) continue
    const compared = peers.filter(item => medianOf(item, type, bedrooms) !== null)
    const higher = compared.filter(item => medianOf(item, type, bedrooms)! > own).length
    rank = { position: higher + 1, of: compared.length + 1, propertyType: type, bedrooms }
    similar = compared
      .filter(item => linkable.includes(item))
      .sort(
        (a, b) =>
          Math.abs(medianOf(a, type, bedrooms)! - own) -
            Math.abs(medianOf(b, type, bedrooms)! - own) ||
          a.neighborhood.localeCompare(b.neighborhood, 'es')
      )
      .slice(0, SIMILAR_LIMIT)
      .map(item => link(item, type, bedrooms))
    break
  }
  const largest = [...linkable]
    .sort((a, b) => b.listings - a.listings || a.neighborhood.localeCompare(b.neighborhood, 'es'))
    .slice(0, LARGEST_LIMIT)
    .map(item => link(item, 'apartamento', 'any'))

  const generated = Date.parse(market.generatedAt ?? '')
  const fresh =
    Number.isFinite(generated) && now - generated <= RENTAL_BARRIO_MAX_AGE_DAYS * 86_400_000
  // The 62 official areas only exist for Montevideo; match by the same folded name the job uses.
  // The services endpoint takes the zone CODE (`mvd:<officialCode>`), not the name.
  const official =
    self.department === 'Montevideo'
      ? ((snapshots.context?.boundaries?.features ?? []).find(
          feature => rentalZoneName(feature.properties.name) === rentalZoneName(self.neighborhood)
        )?.properties ?? null)
      : null
  return {
    officialZone: official?.name ?? null,
    officialZoneId: official?.officialCode ? `mvd:${official.officialCode}` : null,
    department: self.department,
    departmentSlug: self.departmentSlug,
    neighborhood: self.neighborhood,
    slug: self.slug,
    path: self.path,
    spellings: self.spellings,
    nameShared: self.nameShared,
    cells,
    rank,
    similar,
    largest,
    generatedAt: market.generatedAt ?? null,
    rentalDataAsOf: market.rentalDataAsOf ?? null,
    indexable: fresh && self.publishableCells >= RENTAL_BARRIO_MIN_CELLS,
  }
}
