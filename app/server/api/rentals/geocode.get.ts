import { lookupRentalGeocode, RentalGeocodeError } from '../../utils/rentalGeocode'
import type { RentalGeocodeResponse } from '../../../utils/rentalGeocode'

export default defineEventHandler(async (event): Promise<RentalGeocodeResponse> => {
  // Addresses are user input. Do not put them in the shared edge cache or application logs.
  setResponseHeader(event, 'cache-control', 'no-store')
  try {
    return await lookupRentalGeocode(
      getQuery(event) as Record<string, unknown>,
      getRequestIP(event, { xForwardedFor: true }) || 'unknown'
    )
  } catch (error) {
    const statusCode = error instanceof RentalGeocodeError ? error.statusCode : 503
    if (statusCode === 429) setResponseHeader(event, 'retry-after', '60')
    throw createError({
      statusCode,
      statusMessage:
        statusCode === 400
          ? 'Invalid address query'
          : statusCode === 429
            ? 'Address search limit reached'
            : 'Address search temporarily unavailable',
    })
  }
})
