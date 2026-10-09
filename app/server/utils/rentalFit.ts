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

// Measured 2026-10-09, the day the household search started answering 503 to everyone: 51.629
// rows read, 33.532 candidates, 48,3 MB as JSON against a 48 MB cap. The Facebook reader had just
// started reading whole searches, and the directory grows with it.
// The same day, over every row of production: 87,2 MB of heap for the catalogue as it was built
// (each advert went dictionary-mode on `delete`, every row carried its own copy of each department,
// date and agency) and 47,7 MB with the interner below, the 33.789 candidates identical field by
// field and in the same order. At that density the JSON measure tracks the heap about one to one,
// so 96 MB keeps the memory budget the cache had before the incident and fits about twice the homes.
export const RENTAL_FIT_MAX_ROWS = 120_000
const MAX_CACHE_BYTES = 96 * 1024 * 1024
const CACHE_MS = 60_000
const MAX_SNAPSHOT_AGE_MS = 10 * 60_000
interface FitIdentity {
  version?: number
  propertyType?: string
  description?: string
  department?: string
  neighborhood?: string
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

/**
 * One copy of each repeated value across a catalogue: the same department, barrio, portal, date or
 * agency appears in tens of thousands of homes, and every row read from Mongo brings its own copy.
 * Values and shapes are untouched (a shared string or object is the same value), so the ranking and
 * the response cannot tell; shared objects are never mutated downstream (annotation copies offers).
 */
export interface RentalFitInterner {
  text<T>(value: T): T
  object<T>(value: T): T
}
export function createRentalFitInterner(): RentalFitInterner {
  const strings = new Map<string, string>()
  const objects = new Map<string, unknown>()
  return {
    text<T>(value: T): T {
      if (typeof value !== 'string') return value
      const seen = strings.get(value)
      if (seen !== undefined) return seen as T
      strings.set(value, value)
      return value
    },
    object<T>(value: T): T {
      if (!value || typeof value !== 'object') return value
      const signature = JSON.stringify(value)
      const seen = objects.get(signature)
      if (seen !== undefined) return seen as T
      objects.set(signature, value)
      return value
    },
  }
}
const NO_INTERNING: RentalFitInterner = { text: value => value, object: value => value }

/** Source evidence never reaches the catalogue cache, API response or ranking function. */
export function projectRentalFitCandidate(
  row: RentalFitRawProperty,
  now = Date.now(),
  intern: RentalFitInterner = NO_INTERNING
): RentalFitCachedCandidate | null {
  const shared = intern.text.bind(intern)
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
    // Cards do not need contact channels, and copied agency/owner evidence is revalidated above.
    // Left out here rather than deleted afterwards: `delete` turns every advert of the catalogue
    // into a dictionary-mode object, several times its size.
    const {
      publicContact: _contact,
      agency,
      ownerDirect,
      ...advertiser
    } = publicAdvertiserMetadata({ ...own, publicContact: undefined }, now)
    const offer: RentalOffer = {
      source: shared(own.source),
      listingId: own.listingId,
      url: rentalSavedSafeUrl(own.url)!,
      title: text(own.title),
      price: own.price,
      priceUyu: own.priceUyu,
      currency: shared(own.currency),
      commonExpenses: amount(own.commonExpenses),
      commonExpensesCurrency: ['UYU', 'USD'].includes(own.commonExpensesCurrency || '')
        ? shared(own.commonExpensesCurrency)
        : null,
      sellerName: shared(text(own.sellerName, 160)),
      sellerType: ['inmobiliaria', 'particular'].includes(own.sellerType)
        ? shared(own.sellerType)
        : 'desconocido',
      image: rentalSavedSafeUrl(own.image),
      parkingSpaces: amount(own.parkingSpaces),
      furnished: typeof own.furnished === 'boolean' ? own.furnished : null,
      petsAllowed: own.petsAllowed === true ? true : null,
      guarantees: guarantees(own.guarantees).map(shared),
      publishedAt: typeof own.publishedAt === 'string' ? shared(own.publishedAt) : null,
      firstSeen: shared(text(own.firstSeen, 40)),
      lastSeen: shared(text(own.lastSeen, 40)),
      ...advertiser,
      ...(agency !== undefined ? { agency: intern.object(agency) } : {}),
      ...(ownerDirect !== undefined ? { ownerDirect: intern.object(ownerDirect) } : {}),
    }
    return {
      ...offer,
      ...rentalBudgetOwnExpenses(
        offer,
        own.identity?.description || own.details?.description || ''
      ),
    }
  })
  const zoneName = (value: unknown) =>
    typeof value === 'string' && value.length <= 100 && !/[\p{Cc}\p{Cf}<>]/u.test(value)
      ? value.normalize('NFC').trim().replace(/\s+/g, ' ')
      : ''
  const offerZones = ownOffers.map(own => {
    const department = zoneName(own.identity?.department),
      neighborhood = zoneName(own.identity?.neighborhood)
    return {
      source: shared(own.source),
      listingId: own.listingId,
      zone:
        department && neighborhood
          ? intern.object({ department: shared(department), neighborhood: shared(neighborhood) })
          : null,
    }
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
    propertyType: shared(row.propertyType),
    department: shared(text(row.department, 100)),
    neighborhood: shared(text(row.neighborhood, 160)),
    // Search cards need the published zone and checked point, never a hidden address fallback.
    address: '',
    latitude: point?.lat ?? null,
    longitude: point?.lng ?? null,
    bedrooms: specification('bedrooms'),
    bathrooms: specification('bathrooms'),
    area: specification('area'),
    parkingSpaces:
      offers.reduce((max, offer) => Math.max(max, offer.parkingSpaces || 0), 0) || null,
    furnished: offers.some(offer => offer.furnished === true)
      ? offers.some(offer => offer.furnished === false)
        ? null
        : true
      : offers.some(offer => offer.furnished === false)
        ? false
        : null,
    petsAllowed: offers.some(offer => offer.petsAllowed === true) ? true : null,
    guarantees: guarantees(offers.flatMap(offer => offer.guarantees || [])),
    price: selected.price,
    priceUyu: selected.priceUyu,
    currency: selected.currency,
    sources: [...new Set(offers.map(offer => offer.source))],
    offers,
    firstSeen: shared(text(row.firstSeen, 40)),
    lastSeen: offers
      .map(offer => offer.lastSeen)
      .sort()
      .at(-1)!,
    freshAt: shared(text(row.freshAt, 40)),
  }
  return { property, point, pointAdvertIds, offerZones }
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
            'department',
            'neighborhood',
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
      // Per load: the catalogue it builds is the only thing that keeps these copies alive.
      const intern = createRentalFitInterner()
      let rows = 0,
        bytes = 0
      try {
        for await (const row of cursor) {
          if (++rows > maxRows) {
            console.warn(
              `[rental-fit] catalogue over ${maxRows} rows: household search unavailable`
            )
            throw new RentalFitError(503)
          }
          const candidate = projectRentalFitCandidate(row, now(), intern)
          if (!candidate) continue
          bytes += Buffer.byteLength(JSON.stringify(candidate))
          if (bytes > maxBytes) {
            console.warn(
              `[rental-fit] catalogue over ${Math.round(maxBytes / 1048576)} MB after ${candidates.length} homes: household search unavailable`
            )
            throw new RentalFitError(503)
          }
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
      offerZones: row.offerZones?.filter(zone =>
        offers.some(offer => offer.source === zone.source && offer.listingId === zone.listingId)
      ),
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
