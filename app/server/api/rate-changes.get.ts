interface RateChange {
  origin: string
  houseName: string
  code: string
  type: string
  name: string
  previousBuy: number
  previousSell: number
  buy: number
  sell: number
  buyChanged: boolean
  sellChanged: boolean
  observedAt: string
}

interface RateChangesResponse {
  asOf: string
  changes: RateChange[]
}

export default defineEventHandler(async event => {
  const base = useRuntimeConfig().apiBaseServer
  const query = getQuery(event)
  return $fetch<RateChangesResponse>(`${base}/changes`, {
    query: {
      origin: query.origin,
      code: query.code,
      limit: query.limit ?? 100,
    },
    timeout: 8000,
  })
})
