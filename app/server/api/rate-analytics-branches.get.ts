interface AnalyticsBranch {
  key: string
  origin: string
  id: string
  name: string
  dept: string
  locality: string
  address: string
}

export default defineCachedEventHandler(
  async () => {
    const config = useRuntimeConfig()
    const base = config.apiBaseServer || config.public.apiBase

    return $fetch<AnalyticsBranch[]>('/analytics/branches', {
      baseURL: base,
      timeout: 12_000,
    })
  },
  {
    maxAge: 600,
    name: 'rate-analytics-branches',
    getKey: () => 'all',
  }
)
