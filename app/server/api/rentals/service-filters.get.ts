import { createError, defineEventHandler, setResponseHeader } from 'h3'
import { loadRentalServiceFilters } from '../../utils/rentalZoneServices'

/** Which neighbourhood-service filters the directory can offer right now, and their thresholds. */
export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  try {
    const result = await loadRentalServiceFilters()
    setResponseHeader(event, 'cache-control', 'public, max-age=120, s-maxage=300')
    return result
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Service filters temporarily unavailable' })
  }
})
