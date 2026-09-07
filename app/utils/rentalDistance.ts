import { haversineKm, type LatLng } from './nearbyRates'
import { rentalNearbyOrigin } from './propertyNearby'

/** The same public Uruguay bounds used by the rental map and nearby-services index. */
export const RENTAL_REFERENCE_BOUNDS = { south: -35.5, north: -30, west: -58.6, east: -53 } as const

export interface RentalReferenceQuery {
  refLat?: unknown
  refLng?: unknown
}

/** Display-only label from a confirmed suggestion, never provider HTML or an implicit address. */
export function normalizeRentalReferenceLabel(value: unknown): string {
  return typeof value === 'string'
    ? value
        .replace(/<[^>]*>/g, '')
        .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160)
    : ''
}

/** Reject arrays, partial pairs and coercions (empty strings, booleans, scientific notation). */
export function parseRentalReferencePoint(query: RentalReferenceQuery): LatLng | null {
  const coordinate = (value: unknown): number | null => {
    if (typeof value !== 'number' && typeof value !== 'string') return null
    if (typeof value === 'string' && !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }
  const lat = coordinate(query.refLat)
  const lng = coordinate(query.refLng)
  const { south, north, west, east } = RENTAL_REFERENCE_BOUNDS
  if (lat === null || lng === null || lat < south || lat > north || lng < west || lng > east)
    return null
  return { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) }
}

/** JavaScript oracle for the same source-owned location policy used in nearby services. */
export function rentalDistanceKm(
  row: Parameters<typeof rentalNearbyOrigin>[0],
  query: RentalReferenceQuery
): number | null {
  const reference = parseRentalReferencePoint(query)
  const origin = rentalNearbyOrigin(row)
  return reference && origin ? haversineKm(reference, origin) : null
}

function usableCoordinates(lat: unknown, lng: unknown) {
  const { south, north, west, east } = RENTAL_REFERENCE_BOUNDS
  return {
    $and: [
      { $isNumber: lat },
      { $gte: [lat, south] },
      { $lte: [lat, north] },
      { $isNumber: lng },
      { $gte: [lng, west] },
      { $lte: [lng, east] },
    ],
  }
}

/** Call only from a guarded $cond: Mongo $and does not short-circuit unsafe arithmetic. */
function haversineExpression(aLat: unknown, aLng: unknown, bLat: unknown, bLng: unknown) {
  const halfDelta = (a: unknown, b: unknown) => ({
    $divide: [{ $degreesToRadians: { $subtract: [b, a] } }, 2],
  })
  const squaredSine = (angle: unknown) => ({ $pow: [{ $sin: angle }, 2] })
  const h = {
    $add: [
      squaredSine(halfDelta(aLat, bLat)),
      {
        $multiply: [
          { $cos: { $degreesToRadians: aLat } },
          { $cos: { $degreesToRadians: bLat } },
          squaredSine(halfDelta(aLng, bLng)),
        ],
      },
    ],
  }
  return { $multiply: [12742, { $asin: { $sqrt: { $min: [1, { $max: [0, h] }] } } }] }
}

/**
 * Mirrors rentalNearbyOrigin. A group coordinate alone is insufficient: a currently visible
 * advert must own that exact point and no visible own point may contradict it by over 100m.
 * Hidden addresses and old inferred/centroid points without own evidence remain unknown.
 */
function rentalDistanceExpression(reference: LatLng) {
  const ownLat = '$$offer.identity.latitude'
  const ownLng = '$$offer.identity.longitude'
  return {
    $cond: [
      usableCoordinates('$latitude', '$longitude'),
      {
        $let: {
          vars: {
            locatedOffers: {
              $filter: {
                input: { $cond: [{ $isArray: '$offers' }, '$offers', []] },
                as: 'offer',
                cond: {
                  $and: [
                    { $eq: ['$$offer.identity.version', 1] },
                    { $ne: ['$$offer.identity.addressHidden', true] },
                    usableCoordinates(ownLat, ownLng),
                  ],
                },
              },
            },
          },
          in: {
            $cond: [
              {
                $and: [
                  {
                    $anyElementTrue: [
                      {
                        $map: {
                          input: '$$locatedOffers',
                          as: 'offer',
                          in: {
                            $and: [{ $eq: [ownLat, '$latitude'] }, { $eq: [ownLng, '$longitude'] }],
                          },
                        },
                      },
                    ],
                  },
                  {
                    $allElementsTrue: [
                      {
                        $map: {
                          input: '$$locatedOffers',
                          as: 'offer',
                          in: {
                            $lte: [
                              haversineExpression('$latitude', '$longitude', ownLat, ownLng),
                              0.1,
                            ],
                          },
                        },
                      },
                    ],
                  },
                ],
              },
              haversineExpression(reference.lat, reference.lng, '$latitude', '$longitude'),
              null,
            ],
          },
        },
      },
      null,
    ],
  }
}

export const RENTAL_DISTANCE_SORT_FIELDS = ['_rentalDistanceUnknown'] as const

/** Run after current-offer filtering and before public projection, sort and pagination. */
export function rentalDistanceStages(query: RentalReferenceQuery) {
  const reference = parseRentalReferencePoint(query)
  return reference
    ? [
        { $set: { distanceKm: rentalDistanceExpression(reference) } },
        { $set: { _rentalDistanceUnknown: { $eq: ['$distanceKm', null] } } },
      ]
    : []
}

/** Keep the optional public scalar and internal unknown-last key through the blocking sort. */
export function rentalDistanceProjection(query: RentalReferenceQuery) {
  return parseRentalReferencePoint(query) ? { distanceKm: 1, _rentalDistanceUnknown: 1 } : {}
}
