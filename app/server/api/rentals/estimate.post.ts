import { createError, defineEventHandler, readBody, setResponseHeader } from 'h3'
import { normalizeRentalEstimateQuery } from '../../../utils/rentalAnalysis'
import { loadRentalEstimate, RentalAnalysisStaleError } from '../../utils/rentalAnalysis'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const body: unknown = await readBody(event)
  const query =
    body && typeof body === 'object' && !Array.isArray(body)
      ? normalizeRentalEstimateQuery(body as Record<string, unknown>)
      : null
  if (!query)
    throw createError({
      statusCode: 400,
      statusMessage: 'Provide a valid location, dwelling type, rooms, area and currency',
    })
  try {
    return await loadRentalEstimate(query)
  } catch (error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Rental estimate is temporarily unavailable',
      data:
        error instanceof RentalAnalysisStaleError
          ? { code: error.code, generatedAt: error.generatedAt }
          : undefined,
      cause: error,
    })
  }
})
