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

// Phase 3: canonical anchors for USD, EUR, ARS. EUR has no BCU quote (verified —
// BCU's currency set is USD/ARS/BRL/UI/UP/UR only), so it anchors on BROU, whose
// EUR feed uses an empty `type` (single series, no BILLETE/CABLE-style ambiguity).
// ARS mirrors USD exactly (BCU, BILLETE, same backfill/gap-detection tooling).
// IMPORTANT: BCU emits several `type` rows per date for USD/ARS (BILLETE/CABLE/PROMED.FONDO).
// Pin a single type or the adjacent-pair log-return math compares same-day spreads.
// Matches app/composables/useDollarTrend.ts.
const CANONICAL: Record<string, { origin: string; code: string; type: string }> = {
  USD: { origin: 'bcu', code: 'USD', type: 'BILLETE' },
  EUR: { origin: 'brou', code: 'EUR', type: '' },
  ARS: { origin: 'bcu', code: 'ARS', type: 'BILLETE' },
}

async function fetchCanonicalSeries(currency: string): Promise<SeriesPoint[]> {
  const anchor = CANONICAL[currency] ?? CANONICAL.USD!
  const base = useRuntimeConfig().apiBaseServer
  // Omit the /type segment entirely when empty (EUR) — an untyped trailing
  // segment would 404/produce a malformed URL, unlike a simply-absent one.
  const path = anchor.type
    ? `/evolution/${anchor.origin}/${anchor.code}/${anchor.type}`
    : `/evolution/${anchor.origin}/${anchor.code}`
  const res = await $fetch<{ evolution?: { date?: string; buy?: number; sell?: number }[] }>(path, {
    baseURL: base,
    query: { period: 60 },
  })
  // Backend returns `date` as an ISO datetime ("...T00:00:00.000Z"); driver-snapshot and
  // news dates are plain YYYY-MM-DD. alignByDate() is an exact string join, so normalize
  // here or every driver correlation silently comes back r=0/n=0.
  return toSeries(res?.evolution, 'sell').map(p => ({ date: p.date.slice(0, 10), value: p.value }))
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
