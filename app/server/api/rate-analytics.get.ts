import type { RateAnalyticsResponse } from '../../types/api'

export default defineEventHandler(async event => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const base = config.apiBaseServer || config.public.apiBase

  return $fetch<RateAnalyticsResponse>('/analytics/rates', {
    baseURL: base,
    query: {
      code: query.code ?? 'USD',
      origins: query.origins,
      from: query.from,
      to: query.to,
      interval: query.interval ?? 'hour',
    },
    timeout: 12_000,
  })
})
