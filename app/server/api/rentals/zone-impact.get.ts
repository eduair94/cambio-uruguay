import { createError, defineEventHandler, setResponseHeader } from 'h3'
import { loadRentalZoneImpactSnapshot } from '../../utils/rentalZoneServices'

/** The stored neighbourhood price analysis (computed daily by currency-property-zones, never here). */
export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  let impact
  try {
    impact = await loadRentalZoneImpactSnapshot()
  } catch {
    impact = null
  }
  if (!impact || impact.status === 'unavailable')
    throw createError({ statusCode: 503, statusMessage: 'Zone price analysis temporarily unavailable' })
  setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=600')
  return impact
})
