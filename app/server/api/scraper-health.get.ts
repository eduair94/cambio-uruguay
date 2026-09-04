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
//   4. /frozen-quotes -> the board that did not break, it just stopped moving. The other three
//                  signals all measure THIS run; only this one compares an origin against its own
//                  past. baluma_cambio published 37,15/39,55 for 57 days straight while its source
//                  returned a clean HTTP 200 titled "Cotizaciones del día" — fresh row, plausible
//                  spread, inside the peer band, and therefore `live` on this very page.
//
// Classification per origin:
//   error  — the run threw (in originResults with status!=success)
//   silent — the run "succeeded" but produced 0 fresh rows (parsed nothing)
//   stale  — has rows, but newest row is older than today (Montevideo)
//   frozen — fresh rows, but the PRICE has not changed in 7+ days. Ranks worse than `live` on
//            purpose: a frozen board drifts to the edge of the distribution as the market moves,
//            and since the site sorts by "cheapest", staleness promotes it to the headline.
//   live   — ran clean, has fresh rows, and the number still moves
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

interface FrozenQuote {
  origin: string
  code: string
  type: string
  daysFrozen: number
  capped: boolean
  extreme: 'min-sell' | 'max-sell' | 'min-buy' | 'max-buy' | null
}

interface FrozenReport {
  generatedAt?: string | null
  quotes?: FrozenQuote[]
}

export type ScraperStatus = 'live' | 'frozen' | 'stale' | 'silent' | 'error'

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
  /** Días sin que cambie el precio del USD de mostrador. `null` = se mueve, o no hay historia. */
  frozenDays: number | null
  /** Si esa cotización quieta encabeza hoy su grupo — el caso que llega a la portada. */
  frozenExtreme: FrozenQuote['extreme']
}

export interface ScraperHealth {
  generatedAt: string
  lastSync: string | null
  minutesAgo: number | null
  summary: {
    total: number
    live: number
    frozen: number
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

const EXTREME_LABEL: Record<NonNullable<FrozenQuote['extreme']>, string> = {
  'min-sell': 'y es la venta más barata del mercado',
  'max-sell': 'y es la venta más cara del mercado',
  'max-buy': 'y es la compra más alta del mercado',
  'min-buy': 'y es la compra más baja del mercado',
}

/** El detalle importa: los mismos días quietos pesan mucho más si además encabezan el ranking. */
function frozenDetail(s: ScraperRow): string {
  const days = `precio sin cambiar hace ${s.frozenDays} días`
  return s.frozenExtreme ? `${days}, ${EXTREME_LABEL[s.frozenExtreme]}` : days
}

async function buildHealth(nowMs: number): Promise<ScraperHealth> {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string

  const [health, rates, localData, frozenReport] = await Promise.all([
    $fetch<HealthResponse>('/health', { baseURL: apiBase, timeout: 20000 }).catch(
      () => ({}) as HealthResponse
    ),
    $fetch<RateRow[]>('/', { baseURL: apiBase, timeout: 20000 }).catch(() => [] as RateRow[]),
    $fetch<LocalData>('/localData', { baseURL: apiBase, timeout: 20000 }).catch(
      () => ({}) as LocalData
    ),
    // Cuarta señal. Si la ruta no existe todavía o falla, el resto de la página sigue igual: no
    // saber si una pizarra está quieta no puede costar el tablero entero.
    $fetch<FrozenReport>('/frozen-quotes', { baseURL: apiBase, timeout: 20000 }).catch(
      () => ({ quotes: [] }) as FrozenReport
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

  // Sólo el USD de mostrador: es la cotización que la portada ordena y publica, y mezclarle los
  // tipos (EBROU, TRANSFERENCIA) haría que una casa figure quieta por una punta que nadie mira.
  const frozenByOrigin = new Map<string, FrozenQuote>()
  for (const q of frozenReport?.quotes || []) {
    if (q.code !== 'USD' || (q.type && q.type !== '')) continue
    const prev = frozenByOrigin.get(q.origin)
    if (!prev || q.daysFrozen > prev.daysFrozen) frozenByOrigin.set(q.origin, q)
  }

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

    const frozen = frozenByOrigin.get(origin) || null

    let status: ScraperStatus
    if (run && run.status !== 'success') status = 'error'
    else if (rows.length === 0) status = 'silent'
    else if (!hasFresh) status = 'stale'
    else if (frozen) status = 'frozen'
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
      frozenDays: frozen ? frozen.daysFrozen : null,
      frozenExtreme: frozen ? frozen.extreme : null,
    })
  }

  // Sort: problems first (error, silent, stale), then live; alpha within a tier.
  const order: Record<ScraperStatus, number> = { error: 0, silent: 1, stale: 2, frozen: 3, live: 4 }
  scrapers.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name))

  const summary = {
    total: scrapers.length,
    live: scrapers.filter(s => s.status === 'live').length,
    frozen: scrapers.filter(s => s.status === 'frozen').length,
    stale: scrapers.filter(s => s.status === 'stale').length,
    silent: scrapers.filter(s => s.status === 'silent').length,
    error: scrapers.filter(s => s.status === 'error').length,
    okPct: 0,
  }
  summary.okPct = summary.total ? Math.round((summary.live / summary.total) * 100) : 0

  // --- Insights ---
  const usdSells = scrapers
    .filter(s => (s.status === 'live' || s.status === 'frozen') && s.usdSell && s.origin !== 'bcu')
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
  const liveUsd = scrapers.filter(
    s => (s.status === 'live' || s.status === 'frozen') && s.origin !== 'bcu'
  )
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
            : s.status === 'frozen'
              ? frozenDetail(s)
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
