import type { RateAnalyticsResponse } from '../../types/api'
import { rateAnalyticsUpstreamQuery, upstreamTimedOut } from '../utils/rateAnalyticsProxy'

export default defineEventHandler(async event => {
  const config = useRuntimeConfig()
  const base = config.apiBaseServer || config.public.apiBase

  try {
    return await $fetch<RateAnalyticsResponse>('/analytics/rates', {
      baseURL: base,
      query: rateAnalyticsUpstreamQuery(getQuery(event)),
      timeout: 12_000,
    })
  } catch (error) {
    // Still reported (>= 500), but as what it is: a slow backend, not a broken one.
    if (upstreamTimedOut(error))
      throw createError({
        statusCode: 504,
        statusMessage: 'Rate analytics timed out',
        cause: error,
      })
    throw error
  }
})
