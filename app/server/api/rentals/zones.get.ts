import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { loadRentalZones, RentalZonesError } from '../../utils/rentalZones'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  try {
    const result = await loadRentalZones(getQuery(event))
    setResponseHeader(event, 'cache-control', 'public, max-age=30, s-maxage=60')
    return result
  } catch (error) {
    const statusCode = error instanceof RentalZonesError ? error.statusCode : 503
    throw createError({
      statusCode,
      statusMessage:
        statusCode === 400 ? 'Invalid zone query' : 'Zone data temporarily unavailable',
    })
  }
})
