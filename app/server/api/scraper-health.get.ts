// Scraper health dashboard data source.
//
// Merges THREE prod-API signals so the result reflects "is each casa de cambio
// scraper actually delivering data", not just "did the scraper run without
// throwing":
//   1. /health  -> sync.originResults: per-origin RUN status (success/error) +
//                  duration. An exception (e.g. HTTP 403) shows here.
//   2. /         -> today's rate rows. A scraper can report "success" yet parse
//                  ZERO rows (e.g. a Wix/JS site whose selectors broke) — that
//                  silent failure only shows up as the origin being ABSENT here.
//   3. /localData -> display name + website per origin (for a humane table).
//
// Classification per origin:
//   error  — the run threw (in originResults with status!=success)
//   silent — the run "succeeded" but produced 0 fresh rows (parsed nothing)
//   stale  — has rows, but newest row is older than today (Montevideo)
//   live   — ran clean AND has fresh rows
//
// Everything is read-only against the public API and cached briefly.

interface RateRow {
  origin: string
  code: string
  type?: string
  buy?: number
  sell?: number
  date?: string
}

interface OriginRun {
  origin: string
  status: string
  duration?: number
  error?: string
}

interface HealthResponse {
  sync?: {
    available?: boolean
    lastSync?: string
    minutesAgo?: number
    originResults?: {
      timestamp?: string
      summary?: { total?: number; success?: number; errors?: number }
      origins?: OriginRun[]
    }
  }
}

type LocalData = Record<string, { name?: string; website?: string }>

export type ScraperStatus = 'live' | 'stale' | 'silent' | 'error'

export interface ScraperRow {
  origin: string
  name: string
  website: string | null
  status: ScraperStatus
  ran: boolean
  runOk: boolean
  durationMs: number | null
  error: string | null
  rows: number
  currencies: string[]
  usdBuy: number | null
  usdSell: number | null
  lastUpdate: string | null
}

export interface ScraperHealth {
  generatedAt: string
  lastSync: string | null
  minutesAgo: number | null
  summary: {
    total: number
    live: number
    stale: number
    silent: number
    error: number
    okPct: number
  }
  insights: {
    usdMedianSell: number | null
    usdSellRange: { min: number; max: number; minOrigin: string; maxOrigin: string } | null
    usdOutliers: { origin: string; sell: number }[]
    bestUsdBuy: { origin: string; name: string; sell: number } | null
    bestUsdSell: { origin: string; name: string; buy: number } | null
    avgDurationMs: number | null
    slowest: { origin: string; name: string; durationMs: number }[]
    issues: { origin: string; name: string; status: ScraperStatus; detail: string }[]
  }
  scrapers: ScraperRow[]
}

// Montevideo "start of today" as an epoch, to flag stale rows without pulling a
// tz library into the Nitro bundle. Uruguay is UTC-3 year-round (no DST).
function montevideoTodayStartMs(now: number): number {
  const UY_OFFSET_MS = 3 * 60 * 60 * 1000
  const local = now - UY_OFFSET_MS
  const dayStartLocal = Math.floor(local / 86_400_000) * 86_400_000
  return dayStartLocal + UY_OFFSET_MS
}

function median(nums: number[]): number | null {
  if (!nums.length) return null
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

async function buildHealth(nowMs: number): Promise<ScraperHealth> {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string

  const [health, rates, localData] = await Promise.all([
    $fetch<HealthResponse>('/health', { baseURL: apiBase, timeout: 20000 }).catch(
      () => ({}) as HealthResponse
    ),
    $fetch<RateRow[]>('/', { baseURL: apiBase, timeout: 20000 }).catch(() => [] as RateRow[]),
    $fetch<LocalData>('/localData', { baseURL: apiBase, timeout: 20000 }).catch(
      () => ({}) as LocalData
    ),
  ])

  const sync = health.sync || {}
  const runResults = sync.originResults?.origins || []
  const runByOrigin = new Map<string, OriginRun>()
  for (const r of runResults) runByOrigin.set(r.origin, r)

  // Per-origin aggregation of today's rate rows.
  const rowsByOrigin = new Map<string, RateRow[]>()
  for (const row of Array.isArray(rates) ? rates : []) {
    if (!row?.origin) continue
    const arr = rowsByOrigin.get(row.origin) || []
    arr.push(row)
    rowsByOrigin.set(row.origin, arr)
  }

  // Universe of origins = everything the backend KNOWS about (localData) plus
  // anything that ran or returned data. This is what lets us see a registered
  // casa that silently produced nothing.
  const origins = new Set<string>([
    ...Object.keys(localData || {}),
    ...runByOrigin.keys(),
    ...rowsByOrigin.keys(),
  ])

  const todayStart = montevideoTodayStartMs(nowMs)

  const scrapers: ScraperRow[] = []
  for (const origin of origins) {
    const run = runByOrigin.get(origin)
    const rows = rowsByOrigin.get(origin) || []
    const meta = (localData || {})[origin] || {}

    const ran = !!run
    const runOk = run ? run.status === 'success' : false

    // Newest row timestamp + whether any row is fresh (today, Montevideo).
    let newest = 0
    for (const r of rows) {
      const t = r.date ? Date.parse(r.date) : NaN
      if (Number.isFinite(t) && t > newest) newest = t
    }
    const hasFresh = newest >= todayStart && rows.length > 0

    // Plain USD quote (no interbank/cable type) for the comparison column.
    const usd = rows.find(r => r.code === 'USD' && (!r.type || r.type === ''))

    let status: ScraperStatus
    if (run && run.status !== 'success') status = 'error'
    else if (rows.length === 0) status = 'silent'
    else if (!hasFresh) status = 'stale'
    else status = 'live'

    scrapers.push({
      origin,
      name: meta.name || origin,
      website: meta.website || null,
      status,
      ran,
      runOk,
      durationMs: run?.duration ?? null,
      error: run?.error ?? null,
      rows: rows.length,
      currencies: [...new Set(rows.map(r => r.code).filter(Boolean))],
      usdBuy: usd?.buy ?? null,
      usdSell: usd?.sell ?? null,
      lastUpdate: newest ? new Date(newest).toISOString() : null,
    })
  }

  // Sort: problems first (error, silent, stale), then live; alpha within a tier.
  const order: Record<ScraperStatus, number> = { error: 0, silent: 1, stale: 2, live: 3 }
  scrapers.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name))

  const summary = {
    total: scrapers.length,
    live: scrapers.filter(s => s.status === 'live').length,
    stale: scrapers.filter(s => s.status === 'stale').length,
    silent: scrapers.filter(s => s.status === 'silent').length,
    error: scrapers.filter(s => s.status === 'error').length,
    okPct: 0,
  }
  summary.okPct = summary.total ? Math.round((summary.live / summary.total) * 100) : 0

  // --- Insights ---
  const usdSells = scrapers
    .filter(s => s.status === 'live' && s.usdSell && s.origin !== 'bcu')
    .map(s => ({ origin: s.origin, name: s.name, sell: s.usdSell as number }))
  const usdMedianSell = median(usdSells.map(u => u.sell))
  usdSells.sort((a, b) => a.sell - b.sell)
  const usdSellRange = usdSells.length
    ? {
        min: usdSells[0].sell,
        minOrigin: usdSells[0].origin,
        max: usdSells[usdSells.length - 1].sell,
        maxOrigin: usdSells[usdSells.length - 1].origin,
      }
    : null
  const usdOutliers =
    usdMedianSell != null
      ? usdSells
          .filter(u => Math.abs(u.sell - usdMedianSell) > 3)
          .map(u => ({ origin: u.origin, sell: u.sell }))
      : []

  // Best place to BUY usd = lowest sell price; best to SELL usd = highest buy.
  const liveUsd = scrapers.filter(s => s.status === 'live' && s.origin !== 'bcu')
  const bestUsdBuy = liveUsd
    .filter(s => s.usdSell)
    .sort((a, b) => (a.usdSell as number) - (b.usdSell as number))[0]
  const bestUsdSell = liveUsd
    .filter(s => s.usdBuy)
    .sort((a, b) => (b.usdBuy as number) - (a.usdBuy as number))[0]

  const durations = scrapers.filter(s => s.durationMs != null).map(s => s.durationMs as number)
  const avgDurationMs = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null
  const slowest = scrapers
    .filter(s => s.durationMs != null)
    .sort((a, b) => (b.durationMs as number) - (a.durationMs as number))
    .slice(0, 5)
    .map(s => ({ origin: s.origin, name: s.name, durationMs: s.durationMs as number }))

  const issues = scrapers
    .filter(s => s.status !== 'live')
    .map(s => ({
      origin: s.origin,
      name: s.name,
      status: s.status,
      detail:
        s.status === 'error'
          ? s.error || 'run failed'
          : s.status === 'silent'
            ? 'ran but parsed 0 rows'
            : 'data not refreshed today',
    }))

  return {
    generatedAt: new Date(nowMs).toISOString(),
    lastSync: sync.lastSync || null,
    minutesAgo: typeof sync.minutesAgo === 'number' ? sync.minutesAgo : null,
    summary,
    insights: {
      usdMedianSell: usdMedianSell != null ? round2(usdMedianSell) : null,
      usdSellRange,
      usdOutliers,
      bestUsdBuy: bestUsdBuy
        ? { origin: bestUsdBuy.origin, name: bestUsdBuy.name, sell: bestUsdBuy.usdSell as number }
        : null,
      bestUsdSell: bestUsdSell
        ? { origin: bestUsdSell.origin, name: bestUsdSell.name, buy: bestUsdSell.usdBuy as number }
        : null,
      avgDurationMs,
      slowest,
      issues,
    },
    scrapers,
  }
}

export default defineCachedEventHandler(
  async () => {
    // Date.now() is fine in a Nitro route (not a workflow script).
    return buildHealth(Date.now())
  },
  {
    maxAge: 60 * 5, // refresh every 5 min
    staleMaxAge: 60 * 30, // serve stale up to 30 min while revalidating
    name: 'scraper-health',
    getKey: () => 'scraper-health',
  }
)
