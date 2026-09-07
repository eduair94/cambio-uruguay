import { createHash } from 'node:crypto'
import type { PipelineStage } from 'mongoose'
import { normalizeRentalFitInput, rankRentalFits } from '../../utils/rentalFit'
import type { RentalFitCandidate, RentalFitResponse } from '../../utils/rentalFitTypes'
import { rentalEligibility } from '../../utils/rentalEligibility'
import { rentalNearbyOrigin } from '../../utils/propertyNearby'
import { publicAdvertiserMetadata } from '../../utils/propertyAdvertiser'
import {
  rentalAvailabilityAdvertId,
  rentalAvailabilityHidden,
} from '../../utils/rentalAvailability'
import { rentalSavedSafeUrl } from '../../utils/rentalSaved'
import {
  RENTAL_COLLATION,
  RENTAL_GUARANTEE_PUBLISHED,
  RENTAL_STALE_DAYS,
  rentalPublicStages,
  type RentalOffer,
  type RentalPublicProperty,
} from '../../utils/rentals'
import { RentalListingModel } from '../models/RentalListing'
import { RentalMetaModel } from '../models/RentalMeta'
import { connectDb } from './db'
import { rentalBudgetOwnExpenses } from './rentalBudget'
import { rentalPublicPropertyProjection } from './rentalDetail'
import {
  annotateRentalAvailability,
  loadRentalAvailabilityIndex,
  type RentalAvailabilityIndex,
} from './rentalAvailability'

export const RENTAL_FIT_MAX_ROWS = 60_000
const MAX_CACHE_BYTES = 48 * 1024 * 1024
const CACHE_MS = 60_000
const MAX_SNAPSHOT_AGE_MS = 10 * 60_000
interface FitIdentity {
  version?: number
  propertyType?: string
  description?: string
  latitude?: number
  longitude?: number
  addressHidden?: boolean
  bedrooms?: number
  bathrooms?: number
  area?: number
}
export type RentalFitRawProperty = Omit<RentalPublicProperty, 'offers'> & {
  offers: Array<RentalOffer & { identity?: FitIdentity }>
}
export interface RentalFitCachedCandidate extends RentalFitCandidate {
  /** Public advert IDs only: revoke a cached point if its corroborating advert is no longer shown. */
  pointAdvertIds: string[]
}
export interface RentalFitCatalogue {
  generatedAt: string
  usdUyu: number
  candidates: RentalFitCachedCandidate[]
}
export class RentalFitError extends Error {
  constructor(readonly statusCode: 400 | 429 | 503) {
    super('Rental household evaluation unavailable')
  }
}
const text = (value: unknown, max = 500) => (typeof value === 'string' ? value.slice(0, max) : '')
const amount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
const cutoffAt = (now: number) =>
  new Date(now - RENTAL_STALE_DAYS * 86_400_000).toISOString().slice(0, 10)
const fresh = (offer: RentalOffer, cutoff: string) =>
  typeof offer.lastSeen === 'string' &&
  Number.isFinite(Date.parse(offer.lastSeen)) &&
  offer.lastSeen >= cutoff
const guarantees = (value: unknown) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(item => (RENTAL_GUARANTEE_PUBLISHED as readonly unknown[]).includes(item))
        ),
      ]
    : []

/** Source evidence never reaches the catalogue cache, API response or ranking function. */
export function projectRentalFitCandidate(
  row: RentalFitRawProperty,
  now = Date.now()
): RentalFitCachedCandidate | null {
  if (!row || !['casa', 'apartamento'].includes(row.propertyType) || !text(row.key)) return null
  const cutoff = cutoffAt(now)
  const ownOffers = (Array.isArray(row.offers) ? row.offers : []).filter(own => {
    const identity = own?.identity?.version === 1 ? own.identity : undefined
    return (
      own &&
      identity?.propertyType === row.propertyType &&
      fresh(own, cutoff) &&
      amount(own.priceUyu) !== null &&
      own.priceUyu > 0 &&
      rentalAvailabilityAdvertId(own.source, own.listingId) &&
      rentalSavedSafeUrl(own.url) &&
      rentalEligibility({
        title: text(own.title, 20_000),
        description: identity.description || own.details?.description || '',
        guaranteeText: own.details?.guaranteeText,
        price: own.price,
        currency: own.currency,
        propertyType: identity.propertyType,
      }).eligible
    )
  })
  if (!ownOffers.length) return null
  const origin = rentalNearbyOrigin({ ...row, offers: ownOffers })
  const point = origin ? { lat: origin.lat, lng: origin.lng } : null
  const pointAdvertIds = point
    ? ownOffers
        .filter(own => rentalNearbyOrigin({ ...row, offers: [own] }))
        .map(own => rentalAvailabilityAdvertId(own.source, own.listingId)!)
    : []
  const offers: RentalOffer[] = ownOffers.map(own => {
    const offer: RentalOffer = {
      source: own.source,
      listingId: own.listingId,
      url: rentalSavedSafeUrl(own.url)!,
      title: text(own.title),
      price: own.price,
      priceUyu: own.priceUyu,
      currency: own.currency,
      commonExpenses: amount(own.commonExpenses),
      commonExpensesCurrency: ['UYU', 'USD'].includes(own.commonExpensesCurrency || '')
        ? own.commonExpensesCurrency
        : null,
      sellerName: text(own.sellerName, 160),
      sellerType: ['inmobiliaria', 'particular'].includes(own.sellerType)
        ? own.sellerType
        : 'desconocido',
      image: rentalSavedSafeUrl(own.image),
      parkingSpaces: amount(own.parkingSpaces),
      furnished: own.furnished === true ? true : null,
      petsAllowed: own.petsAllowed === true ? true : null,
      guarantees: guarantees(own.guarantees),
      publishedAt: typeof own.publishedAt === 'string' ? own.publishedAt : null,
      firstSeen: text(own.firstSeen, 40),
      lastSeen: text(own.lastSeen, 40),
      ...publicAdvertiserMetadata({ ...own, publicContact: undefined }, now),
    }
    // Cards do not need contact channels, and copied agency/owner evidence is revalidated above.
    delete offer.publicContact
    Object.assign(
      offer,
      rentalBudgetOwnExpenses(offer, own.identity?.description || own.details?.description || '')
    )
    return offer
  })
  const specification = (field: 'bedrooms' | 'bathrooms' | 'area') => {
    const value = amount(row[field])
    return ownOffers.some(
      own => amount(own.identity?.[field]) !== null && own.identity![field] !== value
    )
      ? null
      : value
  }
  const selected = offers.reduce((best, offer) => (offer.priceUyu < best.priceUyu ? offer : best))
  const property: RentalPublicProperty = {
    key: text(row.key),
    title: selected.title,
    propertyType: row.propertyType,
    department: text(row.department, 100),
    neighborhood: text(row.neighborhood, 160),
    // Search cards need the published zone and checked point, never a hidden address fallback.
    address: '',
    latitude: point?.lat ?? null,
    longitude: point?.lng ?? null,
    bedrooms: specification('bedrooms'),
    bathrooms: specification('bathrooms'),
    area: specification('area'),
    parkingSpaces:
      offers.reduce((max, offer) => Math.max(max, offer.parkingSpaces || 0), 0) || null,
    furnished: offers.some(offer => offer.furnished === true) ? true : null,
    petsAllowed: offers.some(offer => offer.petsAllowed === true) ? true : null,
    guarantees: guarantees(offers.flatMap(offer => offer.guarantees || [])),
    price: selected.price,
    priceUyu: selected.priceUyu,
    currency: selected.currency,
    sources: [...new Set(offers.map(offer => offer.source))],
    offers,
    firstSeen: text(row.firstSeen, 40),
    lastSeen: offers
      .map(offer => offer.lastSeen)
      .sort()
      .at(-1)!,
    freshAt: text(row.freshAt, 40),
  }
  return { property, point, pointAdvertIds }
}

interface FitCursor extends AsyncIterable<RentalFitRawProperty> {
  close(): Promise<unknown>
}
function openFitCursor(): FitCursor {
  return RentalListingModel.aggregate<RentalFitRawProperty>([
    ...rentalPublicStages({ propertyType: { $in: ['casa', 'apartamento'] } }, RENTAL_STALE_DAYS),
    { $limit: RENTAL_FIT_MAX_ROWS + 1 },
    {
      $project: {
        ...rentalPublicPropertyProjection,
        ...Object.fromEntries(
          [
            'version',
            'propertyType',
            'description',
            'latitude',
            'longitude',
            'addressHidden',
            'bedrooms',
            'bathrooms',
            'area',
          ].map(field => [`offers.identity.${field}`, 1])
        ),
        'offers.details.description': 1,
        'offers.details.guaranteeText': 1,
      },
    },
  ] as PipelineStage[])
    .collation(RENTAL_COLLATION)
    .option({ maxTimeMS: 20_000 })
    .cursor({ batchSize: 500 })
}
async function readFitMeta() {
  await connectDb()
  return RentalMetaModel.findOne({ key: 'uy-rentals' })
    .select({ _id: 0, generatedAt: 1, usdUyu: 1 })
    .maxTimeMS(10_000)
    .lean()
}

export function createRentalFitCatalogueLoader({
  readMeta = readFitMeta,
  openCursor = openFitCursor,
  now = Date.now,
  maxRows = RENTAL_FIT_MAX_ROWS,
  maxBytes = MAX_CACHE_BYTES,
} = {}) {
  let cached: {
    until: number
    loadedAt: number
    signature: string
    value: RentalFitCatalogue
  } | null = null
  let loading: Promise<RentalFitCatalogue> | null = null
  return async (): Promise<RentalFitCatalogue> => {
    if (cached && cached.until > now()) return cached.value
    if (loading) return loading
    loading = (async () => {
      const meta = await readMeta()
      if (!meta?.generatedAt || !Number.isFinite(Date.parse(String(meta.generatedAt))))
        throw new RentalFitError(503)
      const generatedAt = new Date(meta.generatedAt).toISOString()
      const usdUyu = amount(Number(meta.usdUyu)) ?? 0
      const signature = `${generatedAt}:${usdUyu}`
      const checkedAt = now()
      if (
        cached &&
        cached.signature === signature &&
        checkedAt < cached.loadedAt + MAX_SNAPSHOT_AGE_MS
      ) {
        // Recheck metadata every minute, while forcing a full refresh within ten minutes
        // even if an out-of-band repair did not update the harvest metadata.
        cached.until = Math.min(checkedAt + CACHE_MS, cached.loadedAt + MAX_SNAPSHOT_AGE_MS)
        return cached.value
      }
      // No stale fallback after a failed refresh, and no extra full catalogue retained in memory.
      cached = null
      const cursor = openCursor()
      const candidates: RentalFitCachedCandidate[] = []
      let rows = 0,
        bytes = 0
      try {
        for await (const row of cursor) {
          if (++rows > maxRows) throw new RentalFitError(503)
          const candidate = projectRentalFitCandidate(row, now())
          if (!candidate) continue
          bytes += Buffer.byteLength(JSON.stringify(candidate))
          if (bytes > maxBytes) throw new RentalFitError(503)
          candidates.push(candidate)
        }
      } finally {
        await cursor.close()
      }
      const value = {
        generatedAt,
        usdUyu,
        candidates,
      }
      const loadedAt = now()
      cached = { until: loadedAt + CACHE_MS, loadedAt, signature, value }
      return value
    })()
    try {
      return await loading
    } finally {
      loading = null
    }
  }
}
export const loadRentalFitCatalogue = createRentalFitCatalogueLoader()

/** Refresh visibility on every evaluation; a cached public point must still have a shown owner. */
export function currentRentalFitCandidates(
  catalogue: RentalFitCatalogue,
  availability: RentalAvailabilityIndex,
  hideReported: boolean,
  now = Date.now()
): RentalFitCandidate[] {
  const cutoff = cutoffAt(now)
  const candidates: RentalFitCandidate[] = []
  for (const row of catalogue.candidates) {
    const annotated = annotateRentalAvailability(row.property, availability)
    const offers = annotated.offers.filter(
      offer =>
        fresh(offer, cutoff) &&
        (!hideReported || !rentalAvailabilityHidden(offer.availability, 'hide_any'))
    )
    if (!offers.length) continue
    const point = offers.some(offer =>
      row.pointAdvertIds.includes(rentalAvailabilityAdvertId(offer.source, offer.listingId)!)
    )
      ? row.point
      : null
    const matchingOffer = offers.reduce((best, offer) =>
      offer.priceUyu < best.priceUyu ? offer : best
    )
    candidates.push({
      point,
      property: {
        ...annotated,
        offers,
        matchingOffer,
        price: matchingOffer.price,
        priceUyu: matchingOffer.priceUyu,
        currency: matchingOffer.currency,
        sources: [...new Set(offers.map(offer => offer.source))],
        latitude: point?.lat ?? null,
        longitude: point?.lng ?? null,
        availability: availability.summaryForOffers(offers, row.property.key),
      },
    })
  }
  return candidates
}

export function createRentalFitService({
  loadCatalogue = loadRentalFitCatalogue,
  loadAvailability = loadRentalAvailabilityIndex,
  now = Date.now,
  rank = rankRentalFits,
} = {}) {
  const clients = new Map<string, { count: number; until: number }>()
  let globalWindow = { count: 0, until: 0 },
    active = 0
  return async (
    readInput: () => Promise<unknown>,
    clientKey: string
  ): Promise<RentalFitResponse> => {
    const time = now()
    for (const [key, client] of clients) if (client.until <= time) clients.delete(key)
    const key = createHash('sha256').update(clientKey).digest('hex')
    const client = clients.get(key)
    if (globalWindow.until <= time) globalWindow = { count: 0, until: time + 60_000 }
    if (
      active >= 4 ||
      globalWindow.count >= 30 ||
      (client?.count || 0) >= 10 ||
      (!client && clients.size >= 2048)
    )
      throw new RentalFitError(429)
    clients.set(key, { count: (client?.count || 0) + 1, until: client?.until ?? time + 60_000 })
    globalWindow.count++
    active++
    try {
      let input
      try {
        input = normalizeRentalFitInput(await readInput())
      } catch {
        throw new RentalFitError(400)
      }
      const [catalogue, availability] = await Promise.all([loadCatalogue(), loadAvailability()])
      const candidates = currentRentalFitCandidates(
        catalogue,
        availability,
        input.hideReported,
        now()
      )
      return {
        generatedAt: catalogue.generatedAt,
        usdUyu: catalogue.usdUyu,
        scanned: candidates.length,
        ...rank(candidates, input, catalogue.usdUyu),
      }
    } catch (error) {
      // Do not retain a cause: it could include household coordinates, income or a private Mongo row.
      throw error instanceof RentalFitError ? error : new RentalFitError(503)
    } finally {
      active--
    }
  }
}
export const evaluateRentalFit = createRentalFitService()
