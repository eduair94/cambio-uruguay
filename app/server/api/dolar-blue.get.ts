// Everything `/dolar-blue-hoy` needs, joined server-side and cached.
//
// Two sources the site already refreshes daily and had never put in one place:
// the Argentine blue/official series from `driversnapshots` (written by the
// `drivers:daily` task) and what Uruguayan casas quote for ARS and USD from the
// public rates API. The join is the page's whole reason to exist, so it happens
// once here rather than in the browser.
import { connectDb } from '../utils/db'
import { DriverSnapshotModel } from '../models/DriverSnapshot'
import {
  arsFairValue,
  bestArsBuy,
  bestArsSell,
  changePct,
  compareRoutes,
  isStale,
  latestPoint,
  partitionArsQuotes,
  pointDaysAgo,
  widestSpread,
  type ArsQuote,
  type BluePoint,
} from '../../utils/blueDollar'
import { montevideoToday } from '../../utils/newsletterIssue'

interface RateRow {
  origin: string
  code: string
  type?: string
  buy: number
  sell: number
}

/** How far back the sparkline + context columns look. */
const HISTORY_DAYS = 400

export default defineCachedEventHandler(
  async () => {
    const cfg = useRuntimeConfig()
    const apiBase = (cfg.public as { apiBase: string }).apiBase

    // --- Argentine reference rates (Mongo, app DB) --------------------------
    let bluePoints: BluePoint[] = []
    let oficialPoints: BluePoint[] = []
    try {
      await connectDb()
      const cutoff = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10)
      const docs = await DriverSnapshotModel.find({ date: { $gte: cutoff } })
        .sort({ date: 1 })
        .lean()
      for (const d of docs) {
        const values = (d.values as unknown as Record<string, number>) ?? {}
        if (typeof values.arBlue === 'number')
          bluePoints.push({ date: d.date, value: values.arBlue })
        if (typeof values.arOficial === 'number')
          oficialPoints.push({ date: d.date, value: values.arOficial })
        // The driver key is `arOfficial` (English spelling) in config.ts; accept
        // both so a future rename cannot silently empty the page.
        else if (typeof values.arOfficial === 'number')
          oficialPoints.push({ date: d.date, value: values.arOfficial })
      }
    } catch {
      bluePoints = []
      oficialPoints = []
    }

    // --- Uruguayan casa quotes (public API) --------------------------------
    let rates: RateRow[] = []
    let local: Record<string, { name?: string }> = {}
    try {
      ;[rates, local] = await Promise.all([
        $fetch<RateRow[]>('/', { baseURL: apiBase }),
        $fetch<Record<string, { name?: string }>>('/localData', { baseURL: apiBase }).catch(
          () => ({})
        ),
      ])
    } catch {
      rates = []
    }

    const isRetail = (r: RateRow) => r.origin !== 'bcu' && !r.type

    const arsQuotes: ArsQuote[] = rates
      .filter(r => r.code === 'ARS' && isRetail(r) && (r.sell > 0 || r.buy > 0))
      .map(r => ({
        origin: r.origin,
        name: local[r.origin]?.name ?? r.origin,
        buy: r.buy,
        sell: r.sell,
      }))

    const usdRows = rates.filter(r => r.code === 'USD' && isRetail(r) && r.sell > 0)
    const usdSell = usdRows.length ? Math.min(...usdRows.map(r => r.sell)) : null
    const usdSellRow = usdRows.length ? usdRows.reduce((a, b) => (b.sell < a.sell ? b : a)) : null

    const blueLatest = latestPoint(bluePoints)
    const oficialLatest = latestPoint(oficialPoints)
    const argRates =
      blueLatest && oficialLatest
        ? { blue: blueLatest.value, oficial: oficialLatest.value, date: blueLatest.date }
        : null

    // Drop the boards that are not prices before ranking anything. Anchored on
    // what a peso costs through the dollar, so the filter is data, not a guess.
    const fair = arsFairValue(usdSell, blueLatest?.value ?? oficialLatest?.value ?? null)
    const { plausible, excluded } = partitionArsQuotes(arsQuotes, fair)

    const cheapestArs = bestArsSell(plausible)

    return {
      // Argentine side
      blue: blueLatest,
      oficial: oficialLatest,
      blueMonthAgo: pointDaysAgo(bluePoints, 30),
      blueYearAgo: pointDaysAgo(bluePoints, 365),
      blueChange30d: changePct(pointDaysAgo(bluePoints, 30), blueLatest),
      blueChange365d: changePct(pointDaysAgo(bluePoints, 365), blueLatest),

      // Uruguayan side
      usdSell,
      usdSellHouse: usdSellRow ? (local[usdSellRow.origin]?.name ?? usdSellRow.origin) : null,
      arsQuotes: plausible.sort((a, b) => (a.sell || Infinity) - (b.sell || Infinity)),
      arsFairValue: fair,
      arsExcludedCount: excluded.length,
      arsTotalCount: arsQuotes.length,
      bestArsSell: cheapestArs,
      bestArsBuy: bestArsBuy(plausible),
      widestSpread: widestSpread(plausible),
      argStale: isStale(blueLatest?.date, montevideoToday()),

      // The join
      comparison: compareRoutes(usdSell, cheapestArs?.sell ?? null, argRates),

      updatedAt: new Date().toISOString(),
    }
  },
  {
    // The Argentine series moves once a day; the casa quotes move every few
    // minutes but this page reasons about a route, not a tick.
    maxAge: 60 * 15,
    staleMaxAge: 60 * 60 * 6,
    name: 'dolar-blue',
    getKey: () => 'all',
  }
)
