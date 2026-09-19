import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { loadRentalZoneServiceProfile } from '../../utils/rentalZoneServices'

/** One official area's power, water and complaint layers, for the listing page. */
export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const query = getQuery(event)
  let profile
  try {
    profile = await loadRentalZoneServiceProfile(query.zone, query.department)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Zone profile temporarily unavailable' })
  }
  if (!profile) throw createError({ statusCode: 404, statusMessage: 'Zone not found' })
  setResponseHeader(event, 'cache-control', 'public, max-age=120, s-maxage=300')
  return profile
})
