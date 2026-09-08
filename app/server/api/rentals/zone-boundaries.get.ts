import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { loadRentalZoneBoundaries, RentalZonesError } from '../../utils/rentalZones'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  try {
    const result = await loadRentalZoneBoundaries(getQuery(event))
    // Production nginx compresses application/json but not application/geo+json.
    // GeoJSON remains valid JSON; this avoids transferring 1.14 MB uncompressed on mobile.
    setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
    return result
  } catch (error) {
    const statusCode = error instanceof RentalZonesError ? error.statusCode : 503
    throw createError({
      statusCode,
      statusMessage:
        statusCode === 400 ? 'Invalid boundary query' : 'Zone boundaries temporarily unavailable',
    })
  }
})
