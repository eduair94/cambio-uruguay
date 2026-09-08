import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { loadRentalAnalysis, RentalAnalysisStaleError } from '../../utils/rentalAnalysis'

export default defineEventHandler(async event => {
  try {
    const result = await loadRentalAnalysis(getQuery(event))
    setResponseHeader(event, 'cache-control', 'public, max-age=30, s-maxage=60')
    return result
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Rental analysis is temporarily unavailable',
      data:
        error instanceof RentalAnalysisStaleError
          ? { code: error.code, generatedAt: error.generatedAt }
          : undefined,
      cause: error,
    })
  }
})
