import { connectDb } from './db'
import { DriverSnapshotModel } from '../models/DriverSnapshot'
import { PriceNewsModel } from '../models/PriceNews'
import { toSeries } from '../../utils/dollarSeries'
import { montevideoToday } from '../../utils/blog'
import { driversFor } from '../../utils/drivers/config'
import { snapshotsToDriverSeries, type DateValueMap } from '../../utils/drivers/pivot'
import { rankDrivers, detectMoves, type Correlation, type Move } from '../../utils/correlation'
import type { SeriesPoint } from '../../utils/rateStats'

export interface AnalysisResult {
  currency: string
  asOf: string
  base: SeriesPoint[]
  correlations: Correlation[]
  moves: Move[]
  headlines: { title: string; source: string; link: string; pubDate: string }[]
}

// Phase 1 anchors every currency's canonical series on BCU USD. Phase 3 will map
// EUR/ARS to their own canonical origin/code.
const CANONICAL: Record<string, { origin: string; code: string }> = {
  USD: { origin: 'bcu', code: 'USD' },
}

async function fetchCanonicalSeries(currency: string): Promise<SeriesPoint[]> {
  const anchor = CANONICAL[currency] ?? CANONICAL.USD!
  const base = useRuntimeConfig().apiBaseServer
  const res = await $fetch<{ evolution?: { date?: string; buy?: number; sell?: number }[] }>(
    `/evolution/${anchor.origin}/${anchor.code}`,
    { baseURL: base, query: { period: 60 } }
  )
  return toSeries(res?.evolution, 'sell')
}

/** Assemble driver correlations + notable moves + today's archived news for a currency. */
export async function buildAnalysis(currency: string): Promise<AnalysisResult> {
  await connectDb()
  const asOf = montevideoToday()

  const [base, snapshotDocs, newsDoc] = await Promise.all([
    fetchCanonicalSeries(currency),
    DriverSnapshotModel.find({}).lean(),
    PriceNewsModel.findOne({ currency, date: asOf }).lean(),
  ])

  const snapshots: DateValueMap[] = snapshotDocs.map(d => ({
    date: d.date,
    values: (d.values as unknown as Record<string, number>) ?? {},
  }))
  const driverSeries = snapshotsToDriverSeries(snapshots, driversFor(currency))

  return {
    currency,
    asOf,
    base,
    correlations: rankDrivers(base, driverSeries),
    moves: detectMoves(base, 1),
    headlines: newsDoc?.headlines ?? [],
  }
}
