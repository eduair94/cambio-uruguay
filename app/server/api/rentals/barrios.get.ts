import { createError, defineEventHandler, setResponseHeader } from 'h3'
import { loadIndexableRentalBarrios } from '../../utils/rentalBarrio'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  let barrios
  try {
    barrios = await loadIndexableRentalBarrios()
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Neighborhood data temporarily unavailable',
    })
  }
  setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=900')
  return {
    barrios: barrios.map(({ department, neighborhood, path, listings }) => ({
      department,
      neighborhood,
      path,
      listings,
    })),
  }
})
