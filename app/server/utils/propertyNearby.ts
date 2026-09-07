import { PropertyServiceMetaModel, PropertyServicePointModel } from '../models/PropertyService'
import { RentalListingModel } from '../models/RentalListing'
import { PropertySaleCatalogModel } from '../models/PropertySaleCatalog'
import { connectDb } from './db'
import { rentalPublicStages, RENTAL_STALE_DAYS } from '../../utils/rentals'
import { propertySalesVisibleFilter } from '../../utils/propertySalesQuery'
import {
  PROPERTY_NEARBY_CATEGORIES,
  emptyPropertyNearby,
  propertyNearbyOrigin,
  rentalNearbyOrigin,
  propertyNearbyDataState,
  publicPropertyNearbyItem,
  type PropertyNearbyOperation,
  type PropertyNearbyOrigin,
  type PropertyNearbyResponse,
} from '../../utils/propertyNearby'

type Meta = { version: number; snapshotId: string; fetchedAt: string; dataAsOf: string }
let metaCache: { until: number; meta: Meta | null } | null = null
let metaLoading: Promise<Meta | null> | null = null
async function loadMeta(): Promise<Meta | null> {
  if (metaCache && metaCache.until > Date.now()) return metaCache.meta
  if (metaLoading) return metaLoading
  metaLoading = (async () => {
    const row = (await PropertyServiceMetaModel.findOne({ _id: 'uy-property-services' })
      .select({ _id: 0, version: 1, snapshotId: 1, fetchedAt: 1, dataAsOf: 1 })
      .maxTimeMS(3000)
      .lean()) as Meta | null
    const meta = row?.version === 1 && /^osm-v1-[a-f0-9]{64}$/.test(row.snapshotId) ? row : null
    metaCache = { meta, until: Date.now() + 30_000 }
    return meta
  })().finally(() => {
    metaLoading = null
  })
  return metaLoading
}
const cache = new Map<string, { until: number; categories: PropertyNearbyResponse['categories'] }>()
const pending = new Map<string, Promise<PropertyNearbyResponse['categories']>>()

export function propertyNearbyStages(snapshotId: string, origin: PropertyNearbyOrigin) {
  return [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [origin.lng, origin.lat] },
        key: 'location',
        distanceField: 'distanceM',
        maxDistance: 1000,
        spherical: true,
        query: { snapshotId },
      },
    },
    { $project: { _id: 0, id: 1, category: 1, name: 1, location: 1, pointKind: 1, distanceM: 1 } },
    {
      $facet: Object.fromEntries(
        PROPERTY_NEARBY_CATEGORIES.map(id => [id, [{ $match: { category: id } }, { $limit: 4 }]])
      ),
    },
  ]
}
async function loadCategories(snapshotId: string, origin: PropertyNearbyOrigin) {
  const key = `${snapshotId}:${origin.lat}:${origin.lng}`
  const stored = cache.get(key)
  if (stored && stored.until > Date.now()) return stored.categories
  if (pending.has(key)) return pending.get(key)!
  if (pending.size >= 8) throw new Error('Nearby query capacity reached')
  const promise = (async () => {
    const [row] = await PropertyServicePointModel.aggregate(
      propertyNearbyStages(snapshotId, origin)
    ).option({ maxTimeMS: 3000 })
    const categories = PROPERTY_NEARBY_CATEGORIES.map(id => {
      const items = (Array.isArray(row?.[id]) ? row[id] : [])
        .map((value: Record<string, unknown>) => publicPropertyNearbyItem(value, origin))
        .filter((value: unknown) => !!value)
      return { id, items: items.slice(0, 3), hasMore: items.length > 3 }
    })
    if (cache.size >= 128) cache.delete(cache.keys().next().value!)
    cache.set(key, { until: Date.now() + 60_000, categories })
    return categories
  })().finally(() => {
    pending.delete(key)
  })
  pending.set(key, promise)
  return promise
}

/** A key resolves only an already-public, currently visible point. Never accepts caller coordinates. */
async function lookupPropertyNearby(
  operation: PropertyNearbyOperation,
  key: string
): Promise<PropertyNearbyResponse | null> {
  await connectDb()
  let origin: PropertyNearbyOrigin | null
  if (operation === 'rent') {
    const [row] = await RentalListingModel.aggregate([
      ...rentalPublicStages({ key }, RENTAL_STALE_DAYS),
      { $limit: 1 },
      {
        $project: {
          _id: 0,
          latitude: 1,
          longitude: 1,
          'offers.identity.version': 1,
          'offers.identity.latitude': 1,
          'offers.identity.longitude': 1,
          'offers.identity.addressHidden': 1,
        },
      },
    ]).option({ maxTimeMS: 3000 })
    if (!row) return null
    origin = rentalNearbyOrigin(row)
  } else {
    const row = await PropertySaleCatalogModel.findOne({ ...propertySalesVisibleFilter(), key })
      .select({ _id: 0, 'geo.lat': 1, 'geo.lng': 1, 'geo.precision': 1 })
      .maxTimeMS(3000)
      .lean()
    if (!row) return null
    origin = ['approximate', 'exact'].includes(row.geo?.precision || '')
      ? propertyNearbyOrigin(row.geo?.lat, row.geo?.lng)
      : null
  }
  const response = emptyPropertyNearby(operation, key, origin, origin ? 'unavailable' : 'unlocated')
  if (!origin) return response
  try {
    const meta = await loadMeta()
    if (!meta) return { ...response, retryAfterSeconds: 300 }
    response.dataAsOf = meta.dataAsOf
    response.fetchedAt = Number.isFinite(Date.parse(meta.fetchedAt)) ? meta.fetchedAt : null
    response.status = propertyNearbyDataState(meta.dataAsOf)
    if (response.status === 'unavailable') return { ...response, retryAfterSeconds: 300 }
    response.categories = await loadCategories(meta.snapshotId, origin)
    return response
  } catch {
    return { ...response, status: 'unavailable', retryAfterSeconds: 60 }
  }
}

const propertyRequests = new Map<string, Promise<PropertyNearbyResponse | null>>()
/** Bound even cold connection/identity lookups and coalesce equal requests across callers. */
export async function resolvePropertyNearby(operation: PropertyNearbyOperation, key: string) {
  const id = `${operation}:${key}`
  const current = propertyRequests.get(id)
  if (current) return current
  if (propertyRequests.size >= 16) {
    return { ...emptyPropertyNearby(operation, key, null, 'unavailable'), retryAfterSeconds: 60 }
  }
  const request = lookupPropertyNearby(operation, key).finally(() => propertyRequests.delete(id))
  propertyRequests.set(id, request)
  return request
}
