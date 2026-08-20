// Proxy for the public `GET /intraday` endpoint of api.cambio-uruguay.com.
//
// Exists so /api-cotizacion-intradia can render its live example server-side
// without the browser talking to a second origin (and without CORS). It adds
// nothing: same parameters, same payload. Anyone integrating should call the
// public API directly — this route is a demo surface, not a second API.

interface IntradayPoint {
  at: string
  buy: number
  sell: number
  buyChanged: boolean
  sellChanged: boolean
}

export interface IntradaySeries {
  origin: string
  houseName: string
  code: string
  type: string
  name: string
  openBuy: number
  openSell: number
  openSource: 'ledger-previous' | 'ledger-carried' | 'daily-previous' | 'flat'
  lastBuy: number
  lastSell: number
  lastAt: string | null
  highBuy: number
  lowBuy: number
  highSell: number
  lowSell: number
  buyChange: number
  buyChangePct: number
  sellChange: number
  sellChangePct: number
  changes: number
  firstChangeAt: string | null
  lastChangeAt: string | null
  points: IntradayPoint[]
}

export interface IntradayResponse {
  asOf: string
  date: string
  dayStart: string
  dayEnd: string
  coverageEnd: string
  isToday: boolean
  code: string
  totals: {
    quotes: number
    quotesChanged: number
    changes: number
    avgOpenBuy: number | null
    avgOpenSell: number | null
    avgLastBuy: number | null
    avgLastSell: number | null
    avgBuyChangePct: number | null
    avgSellChangePct: number | null
  }
  availableCurrencies: string[]
  series: IntradaySeries[]
}

export default defineEventHandler(async event => {
  const base = useRuntimeConfig().apiBaseServer
  const query = getQuery(event)
  return $fetch<IntradayResponse>(`${base}/intraday`, {
    query: {
      code: query.code || 'USD',
      date: query.date,
      origins: query.origins,
      type: query.type,
    },
    timeout: 8000,
  })
})
