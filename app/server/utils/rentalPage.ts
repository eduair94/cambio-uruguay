import {
  buildRentalFilter,
  normalizeRentalQuery,
  rentalPublicStages,
  totalMonthlyUyu,
  type RentalOffer,
  type RentalPublicProperty,
} from '../../utils/rentals'
import type {
  RentalMarketScope,
  RentalPageMarket,
  RentalPageResponse,
} from '../../utils/rentalPage'
import { RENTAL_SEO_PILOT_KEYS } from '../../utils/rentalSeoPilot'
import { rentalPublicPropertyProjection } from './rentalDetail'

export const RENTAL_PAGE_STALE_DAYS = 10
export const RENTAL_MARKET_MINIMUM_SAMPLE = 10
const pilot = new Set(RENTAL_SEO_PILOT_KEYS)
const locationCollator = new Intl.Collator('es', { sensitivity: 'base' })
export type RentalPageEvidence = Pick<
  RentalPublicProperty,
  | 'key'
  | 'title'
  | 'department'
  | 'neighborhood'
  | 'propertyType'
  | 'bedrooms'
  | 'bathrooms'
  | 'price'
  | 'currency'
  | 'priceUyu'
> & {
  offers: Array<
    Pick<RentalOffer, 'source' | 'listingId' | 'title' | 'price' | 'currency' | 'priceUyu'>
  >
  matchingOffer?: Pick<
    RentalOffer,
    'source' | 'listingId' | 'title' | 'price' | 'currency' | 'priceUyu'
  >
}

/** One conversion snapshot for every amount shown and compared on the canonical page. */
export function rentalPageReprice<T extends RentalPageEvidence>(property: T, usdUyu: number): T {
  const offers = property.offers.map(offer => ({
    ...offer,
    priceUyu:
      offer.price > 0 && Number.isFinite(offer.price)
        ? offer.currency === 'UYU'
          ? Math.round(offer.price)
          : Number.isFinite(usdUyu) && usdUyu > 0
            ? Math.round(offer.price * usdUyu)
            : 0
        : 0,
  }))
  const known = offers.filter(offer => offer.priceUyu > 0)
  const matchingOffer =
    known.reduce<(typeof offers)[number] | undefined>(
      (best, offer) => (!best || offer.priceUyu < best.priceUyu ? offer : best),
      undefined
    ) ??
    offers.find(
      offer =>
        offer.source === property.matchingOffer?.source &&
        offer.listingId === property.matchingOffer?.listingId
    ) ??
    offers[0]
  return {
    ...property,
    offers,
    matchingOffer,
    priceUyu: matchingOffer?.priceUyu ?? 0,
    price: matchingOffer?.price ?? property.price,
    currency: matchingOffer?.currency ?? property.currency,
  }
}

function unambiguousPeers<T extends RentalPageEvidence>(property: RentalPageEvidence, peers: T[]) {
  const owners = new Map<string, Set<string>>()
  for (const row of [property, ...peers]) {
    for (const offer of row.offers) {
      const id = `${offer.source}:${offer.listingId}`
      const keys = owners.get(id) ?? new Set<string>()
      keys.add(row.key)
      owners.set(id, keys)
    }
  }
  return peers.filter(peer =>
    peer.offers.every(offer => owners.get(`${offer.source}:${offer.listingId}`)!.size === 1)
  )
}

export function rentalPageScope(property: RentalPageEvidence): RentalMarketScope | null {
  if (
    !property.department?.trim() ||
    !property.neighborhood?.trim() ||
    !['apartamento', 'casa'].includes(property.propertyType) ||
    !Number.isInteger(property.bedrooms) ||
    property.bedrooms! < 0 ||
    property.bedrooms! > 10
  )
    return null
  return {
    department: property.department,
    neighborhood: property.neighborhood,
    propertyType: property.propertyType,
    bedrooms: property.bedrooms!,
  }
}

/** A title disagreement is evidence of uncertain metadata, never an invented correction. */
export function rentalPageConflicts(property: RentalPageEvidence): string[] {
  const conflicts = new Set<string>()
  const explicitUnits = new Set<string>()
  for (const title of [property.title, ...property.offers.map(offer => offer.title)]) {
    const text = String(title ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036F]/g, '')
      .toLowerCase()
    if (
      /\b(?:temporada|temporario|temporal|turistico|invernal)\b|\balquiler\s+(?:de\s+|por\s+)?invierno\b/.test(
        text
      )
    ) {
      conflicts.add('temporary_rental')
    }
    const quantities: Record<string, number> = {
      un: 1,
      uno: 1,
      una: 1,
      dos: 2,
      tres: 3,
      cuatro: 4,
      cinco: 5,
      seis: 6,
    }
    const bedrooms = [
      ...text.matchAll(
        /\b(\d{1,2}|un|uno|una|dos|tres|cuatro|cinco|seis)\s*(?:dormitorios?|dorm\.?\b|dorms\b|bedrooms?)/g
      ),
    ].map(match => quantities[match[1]!] ?? Number(match[1]))
    if (/\bmono\s*ambiente\b/.test(text)) bedrooms.push(0)
    if (property.bedrooms !== null && bedrooms.some(value => value !== property.bedrooms)) {
      conflicts.add('conflicting_bedrooms')
    }
    const bathrooms = [
      ...text.matchAll(/\b(\d{1,2}|un|uno|dos|tres|cuatro|cinco|seis)\s*banos?\b/g),
    ].map(match => quantities[match[1]!] ?? Number(match[1]))
    if (property.bathrooms !== null && bathrooms.some(value => value !== property.bathrooms)) {
      conflicts.add('conflicting_bathrooms')
    }
    if (
      ['apartamento', 'casa'].includes(property.propertyType) &&
      (/\b(?:locales? comerciales?|oficinas? en alquiler)\b/.test(text) ||
        /^(?:alquiler\s+(?:de\s+)?)?(?:local|oficina)\b/.test(text))
    ) {
      conflicts.add('conflicting_type')
    }
    // Explicit advert headers only: "casa de apartamentos" in prose is not a type label.
    if (/^(?:alquiler\s+(?:de\s+)?)?casa\b/.test(text) && property.propertyType === 'apartamento') {
      conflicts.add('conflicting_type')
    }
    if (
      /^(?:alquiler\s+(?:de\s+)?)?(?:apartamento|apto\b)/.test(text) &&
      property.propertyType === 'casa'
    ) {
      conflicts.add('conflicting_type')
    }
    const unit = text.match(/\s-\s(\d{3,4})\s*$/)?.[1]
    if (unit) explicitUnits.add(unit)
  }
  if (explicitUnits.size > 1) conflicts.add('conflicting_unit')
  return [...conflicts]
}

function publicUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  } catch {
    return false
  }
}

export function rentalPageQualityIssues(
  property: RentalPublicProperty,
  market: RentalPageMarket,
  usdUyu: number
): string[] {
  const issues = rentalPageConflicts(property)
  if (!rentalPageScope(property)) issues.push('missing_location_or_residential_specs')
  const attributes = [
    Number.isInteger(property.bedrooms) && property.bedrooms! >= 0,
    Number.isFinite(property.bathrooms) && property.bathrooms! > 0,
    Number.isFinite(property.area) && property.area! > 0,
    Number.isFinite(property.parkingSpaces) && property.parkingSpaces! > 0,
    property.furnished === true,
  ].filter(Boolean).length
  if (attributes < 2) issues.push('insufficient_specific_attributes')
  if (!property.offers.some(offer => publicUrl(offer.image))) issues.push('missing_photo')
  if (!property.offers.some(offer => publicUrl(offer.url))) issues.push('missing_original_advert')
  if (!property.title || property.title.trim().length < 15) issues.push('insufficient_title')
  const comparableOffers = property.offers.filter(offer => publicUrl(offer.url))
  if (comparableOffers.length < 2 && market.status !== 'available')
    issues.push('insufficient_comparison_value')
  // The reviewed pilot adds a useful, source-backed cost comparison to the source adverts.
  if (new Set(comparableOffers.map(offer => offer.source)).size < 2)
    issues.push('pilot_needs_multiple_portals')
  if (!comparableOffers.some(offer => totalMonthlyUyu(offer, usdUyu) !== null))
    issues.push('pilot_needs_known_monthly_cost')
  return issues
}

export function rentalPagePeerStages(property: RentalPublicProperty) {
  if (!property.department?.trim() || !property.neighborhood?.trim()) return null
  const scope = rentalPageScope(property)
  const query = normalizeRentalQuery({
    department: property.department,
    neighborhoods: [property.neighborhood],
    type: property.propertyType,
    ...(scope ? { bedrooms: scope.bedrooms, bedroomsExact: true } : {}),
  })
  const { filter } = buildRentalFilter(query, RENTAL_PAGE_STALE_DAYS, 0)
  return [
    ...rentalPublicStages({ ...filter, key: { $ne: property.key } }, RENTAL_PAGE_STALE_DAYS),
    { $project: rentalPublicPropertyProjection },
  ]
}

/** Benchmarks do not retrieve photos, addresses, sellers, or full advert records. */
export function rentalPageEvidenceStages(property: RentalPublicProperty) {
  const stages = rentalPagePeerStages(property)
  if (!stages) return null
  const fields = [
    'key',
    'title',
    'department',
    'neighborhood',
    'propertyType',
    'bedrooms',
    'bathrooms',
    'price',
    'currency',
    'priceUyu',
  ]
  const offerFields = ['source', 'listingId', 'title', 'price', 'currency', 'priceUyu']
  return [
    ...stages.slice(0, -1),
    {
      $project: {
        _id: 0,
        ...Object.fromEntries(fields.map(field => [field, 1])),
        ...Object.fromEntries(offerFields.map(field => [`offers.${field}`, 1])),
      },
    },
  ]
}

export function rentalPageSimilarKeys(property: RentalPageEvidence, peers: RentalPageEvidence[]) {
  const seen = new Set<string>([property.key])
  return unambiguousPeers(property, peers)
    .filter(peer => {
      if (seen.has(peer.key) || rentalPageConflicts(peer).length || !(peer.priceUyu > 0))
        return false
      seen.add(peer.key)
      return true
    })
    .sort(
      (a, b) =>
        Math.abs(a.priceUyu - property.priceUyu) - Math.abs(b.priceUyu - property.priceUyu) ||
        a.key.localeCompare(b.key)
    )
    .slice(0, 6)
    .map(peer => peer.key)
}

export function rentalPageSimilarStages(keys: string[]) {
  const { filter } = buildRentalFilter(normalizeRentalQuery({}), RENTAL_PAGE_STALE_DAYS, 0)
  return [
    ...rentalPublicStages({ ...filter, key: { $in: keys } }, RENTAL_PAGE_STALE_DAYS),
    { $project: rentalPublicPropertyProjection },
  ]
}

function sameScope(property: RentalPageEvidence, other: RentalPageEvidence): boolean {
  return (
    property.key !== other.key &&
    locationCollator.compare(property.department, other.department) === 0 &&
    locationCollator.compare(property.neighborhood, other.neighborhood) === 0 &&
    property.propertyType === other.propertyType &&
    property.bedrooms === other.bedrooms
  )
}

/** Linear-interpolated quantiles, one current asking rent per other property. */
function quantile(sorted: number[], fraction: number): number {
  const index = (sorted.length - 1) * fraction
  const lower = Math.floor(index)
  const value = sorted[lower]! + (sorted[Math.ceil(index)]! - sorted[lower]!) * (index - lower)
  return Math.round(value)
}

export function rentalPageMarket(
  property: RentalPageEvidence,
  peers: RentalPageEvidence[]
): RentalPageMarket {
  const scope = rentalPageScope(property)
  const result: RentalPageMarket = {
    status: scope ? 'insufficient' : 'not_comparable',
    minimumSample: RENTAL_MARKET_MINIMUM_SAMPLE,
    sampleSize: 0,
    medianRentUyu: null,
    p25RentUyu: null,
    p75RentUyu: null,
    differencePercent: null,
    scope,
  }
  if (!scope || rentalPageConflicts(property).length) return { ...result, status: 'not_comparable' }
  const seen = new Set<string>()
  const prices = unambiguousPeers(property, peers)
    .filter(peer => {
      if (seen.has(peer.key) || !sameScope(property, peer) || rentalPageConflicts(peer).length)
        return false
      seen.add(peer.key)
      return Number.isFinite(peer.priceUyu) && peer.priceUyu > 0
    })
    .map(peer => peer.priceUyu)
    .sort((a, b) => a - b)
  result.sampleSize = prices.length
  if (prices.length < RENTAL_MARKET_MINIMUM_SAMPLE) return result
  result.status = 'available'
  result.medianRentUyu = quantile(prices, 0.5)
  result.p25RentUyu = quantile(prices, 0.25)
  result.p75RentUyu = quantile(prices, 0.75)
  result.differencePercent =
    Number.isFinite(property.priceUyu) && property.priceUyu > 0
      ? Math.round((property.priceUyu / result.medianRentUyu - 1) * 100)
      : null
  return result
}

export function buildRentalPage(
  property: RentalPublicProperty,
  peers: RentalPublicProperty[],
  usdUyu: number,
  ambiguousIdentity = false,
  marketOverride?: RentalPageMarket
): RentalPageResponse {
  property = rentalPageReprice(property, usdUyu)
  peers = unambiguousPeers(
    property,
    peers.map(peer => rentalPageReprice(peer, usdUyu))
  )
  let market = marketOverride ?? rentalPageMarket(property, peers)
  if (ambiguousIdentity)
    market = {
      ...market,
      status: 'not_comparable',
      sampleSize: 0,
      medianRentUyu: null,
      p25RentUyu: null,
      p75RentUyu: null,
      differencePercent: null,
    }
  const reasons = rentalPageQualityIssues(property, market, usdUyu)
  if (ambiguousIdentity) reasons.push('ambiguous_identity')
  if (!pilot.has(property.key)) reasons.push('outside_reviewed_pilot')
  const seen = new Set<string>([property.key])
  const similar = peers
    .filter(peer => {
      if (seen.has(peer.key) || rentalPageConflicts(peer).length) return false
      seen.add(peer.key)
      return true
    })
    .sort(
      (a, b) =>
        Math.abs(a.priceUyu - property.priceUyu) - Math.abs(b.priceUyu - property.priceUyu) ||
        a.key.localeCompare(b.key)
    )
    .slice(0, 6)
  return {
    property,
    usdUyu,
    canonicalPath: `/alquileres/${encodeURIComponent(property.key)}`,
    seo: { indexable: reasons.length === 0, reasons, contentUpdatedAt: null },
    market,
    similar,
  }
}

export function rentalPageSitemapStages() {
  const query = normalizeRentalQuery({})
  const { filter } = buildRentalFilter(query, RENTAL_PAGE_STALE_DAYS, 0)
  return [
    ...rentalPublicStages(
      { ...filter, key: { $in: [...RENTAL_SEO_PILOT_KEYS] } },
      RENTAL_PAGE_STALE_DAYS
    ),
    { $project: rentalPublicPropertyProjection },
  ]
}

export function rentalPageSitemapUrls(
  properties: RentalPublicProperty[],
  usdUyu: number,
  ambiguousKeys: ReadonlySet<string> = new Set()
) {
  return properties
    .map(property => buildRentalPage(property, [], usdUyu, ambiguousKeys.has(property.key)))
    .filter(page => page.seo.indexable)
    .map(page => ({ loc: page.canonicalPath }))
}

/** A shared current advert is not evidence for two distinct canonical rental pages. */
export function rentalPageIdentityStages(property: RentalPublicProperty) {
  const { filter } = buildRentalFilter(normalizeRentalQuery({}), RENTAL_PAGE_STALE_DAYS, 0)
  return [
    ...rentalPublicStages(
      {
        ...filter,
        key: { $ne: property.key },
        'offers.listingId': { $in: property.offers.map(offer => offer.listingId) },
        offers: {
          $elemMatch: {
            $or: property.offers.map(offer => ({
              source: offer.source,
              listingId: offer.listingId,
            })),
          },
        },
      },
      RENTAL_PAGE_STALE_DAYS
    ),
    { $limit: 1 },
    { $project: { _id: 0, key: 1 } },
  ]
}

export function rentalPageAmbiguousKeysStages() {
  const { filter } = buildRentalFilter(normalizeRentalQuery({}), RENTAL_PAGE_STALE_DAYS, 0)
  return [
    ...rentalPublicStages(filter, RENTAL_PAGE_STALE_DAYS),
    { $unwind: '$offers' },
    {
      $group: {
        _id: { source: '$offers.source', listingId: '$offers.listingId' },
        keys: { $addToSet: '$key' },
      },
    },
    { $match: { 'keys.1': { $exists: true } } },
    { $unwind: '$keys' },
    { $group: { _id: '$keys' } },
    { $project: { _id: 0, key: '$_id' } },
  ]
}
