import { loadCarReport } from '../utils/cars'

export default defineEventHandler(async event => {
  try {
    const snapshot = await loadCarReport()
    if (!snapshot) throw new Error('CAR_REPORT_PREPARING')
    setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=900')
    return { generatedAt: snapshot.generatedAt, usdUyu: snapshot.usdUyu, data: snapshot.data }
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'The used-car market report is temporarily unavailable',
      cause: error,
    })
  }
})
