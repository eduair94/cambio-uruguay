import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { loadRentalBudget } from '../../utils/rentalBudget'

export default defineEventHandler(async event => {
  try {
    const result = await loadRentalBudget(getQuery(event))
    setResponseHeader(event, 'cache-control', 'public, max-age=30, s-maxage=60')
    return result
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Rental budgets are temporarily unavailable',
      cause: error,
    })
  }
})
