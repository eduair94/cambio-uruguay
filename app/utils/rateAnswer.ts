// The "answer block": the facts a page must state in server-rendered text so a
// searcher (and an AI Overview, and a SERP snippet) gets the answer without a
// click into JavaScript.
//
// PURE functions (no Vue/Nuxt runtime) so they are unit-testable in plain Node.
//
// Facts come from the /evolution payload and nothing else — we never invent a
// figure the API did not send. Prefer `factsFromRows` over `rateAnswerFacts`:
// the endpoint interleaves every rate type a casa quotes, so its own
// `statistics` block mixes them, while the rows can be filtered to one.

/** The `statistics` shape returned by GET /evolution/:origin/:currency. */
export interface EvolutionStatistics {
  totalDataPoints?: number
  dateRange?: {
    start?: string
    end?: string
    periodMonths?: number
  }
  buy?: RateStat
  sell?: RateStat
}

interface RateStat {
  min?: number
  max?: number
  avg?: number
  current?: number
  change?: number
}

/** The facts an answer block renders. All numbers are finite and positive. */
export interface RateAnswerFacts {
  /** What the house pays you for one unit (you sell to them). */
  buy: number
  /** What the house charges you for one unit (you buy from them). */
  sell: number
  /** Percent change of the sell price over the period. */
  changePct: number
  direction: 'up' | 'down' | 'flat'
  /** Lowest / highest sell price observed over the period. */
  minSell: number
  maxSell: number
  /** Length of the series in months — 3, 6, 12 or 24. Never "30 days". */
  periodMonths: number
  /** ISO date of the most recent point. A calendar date, NOT a scrape time. */
  asOf: string
}

/** One day's quote in the /evolution series. */
export interface EvolutionRow {
  date: string
  buy: number
  sell: number
  type?: string | null
}

/**
 * Type preference, matching the rest of the site: the plain cash quote (`''`) is
 * the walk-in rate; anything else (EBROU, promos) applies under conditions.
 */
const typeRank = (t: string): number => (t === '' ? 0 : t === 'BILLETE' ? 1 : 2)

/**
 * Reduce the /evolution series to ONE rate type.
 *
 * The endpoint interleaves every type a casa quotes: /evolution/brou/USD returns
 * an EBROU row AND a plain row for each day, in no stable order. Reading the
 * "current" rate off the last element therefore returns whichever type happened
 * to sort last (eBROU's 40,90 rather than BROU's walk-in 41,40), and a
 * day-over-day streak compares eBROU against plain. Everything downstream must
 * run on a single type.
 *
 * @param type the route's `[[type]]` segment, if any. Case-insensitive.
 * @returns rows of the requested type, or — with no type — of the casa's
 *   best-ranked type. Empty when nothing matches.
 */
export function selectTypeRows(
  rows: readonly EvolutionRow[],
  type?: string | null
): EvolutionRow[] {
  const wanted = String(type ?? '')
    .trim()
    .toLowerCase()
  if (wanted) {
    return rows.filter(r => String(r.type ?? '').toLowerCase() === wanted)
  }

  const present = new Set(rows.map(r => String(r.type ?? '')))
  if (present.size <= 1) return [...rows]

  const best = [...present].sort((a, b) => typeRank(a) - typeRank(b))[0]!
  return rows.filter(r => String(r.type ?? '') === best)
}

const isPositive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

/** A move under this magnitude reads as flat rather than a direction. */
const FLAT_THRESHOLD_PCT = 0.05

/**
 * Reduce the API's `statistics` to the facts an answer block can state, or
 * `null` when the payload is incomplete.
 *
 * Returning `null` is the important path: a finance page must fall back to
 * generic prose rather than render a partial or zeroed rate. A scraper gap must
 * never surface as "el dólar en X cotiza a $0".
 */
export function rateAnswerFacts(
  stats: EvolutionStatistics | null | undefined
): RateAnswerFacts | null {
  if (!stats) return null

  const buy = stats.buy?.current
  const sell = stats.sell?.current
  if (!isPositive(buy) || !isPositive(sell)) return null

  const minSell = stats.sell?.min
  const maxSell = stats.sell?.max
  if (!isPositive(minSell) || !isPositive(maxSell)) return null
  if (minSell > maxSell) return null

  const periodMonths = stats.dateRange?.periodMonths
  if (!isPositive(periodMonths)) return null

  const asOf = stats.dateRange?.end
  if (typeof asOf !== 'string' || Number.isNaN(new Date(asOf).getTime())) return null

  const rawChange = stats.sell?.change
  const changePct = typeof rawChange === 'number' && Number.isFinite(rawChange) ? rawChange : 0

  return {
    buy,
    sell,
    changePct: roundTo(changePct, 2),
    direction: Math.abs(changePct) < FLAT_THRESHOLD_PCT ? 'flat' : changePct > 0 ? 'up' : 'down',
    minSell,
    maxSell,
    periodMonths,
    asOf,
  }
}

/**
 * The same facts, computed from the evolution rows of a SINGLE rate type rather
 * than from the API's `statistics` block.
 *
 * Prefer this over {@link rateAnswerFacts}: `statistics` is computed across the
 * mixed-type series, so on a casa quoting two types (BROU: plain + eBROU) its
 * `current` is whichever type sorts last, and its min/max mix the two.
 *
 * @param periodMonths the window the caller requested (3/6/12/24) — the API's
 *   `dateRange.periodMonths`. Stated in months because there is no 30-day series.
 */
export function factsFromRows(
  rows: readonly EvolutionRow[],
  type: string | null | undefined,
  periodMonths: number | undefined
): RateAnswerFacts | null {
  if (!isPositive(periodMonths)) return null

  const typed = selectTypeRows(rows, type).filter(r => isPositive(r.buy) && isPositive(r.sell))
  if (typed.length === 0) return null

  const sorted = [...typed].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!

  const asOf = last.date
  if (typeof asOf !== 'string' || Number.isNaN(new Date(asOf).getTime())) return null

  let minSell = last.sell
  let maxSell = last.sell
  for (const r of sorted) {
    if (r.sell < minSell) minSell = r.sell
    if (r.sell > maxSell) maxSell = r.sell
  }

  const changePct = first.sell === 0 ? 0 : ((last.sell - first.sell) / first.sell) * 100

  return {
    buy: last.buy,
    sell: last.sell,
    changePct: roundTo(changePct, 2),
    direction: Math.abs(changePct) < FLAT_THRESHOLD_PCT ? 'flat' : changePct > 0 ? 'up' : 'down',
    minSell,
    maxSell,
    periodMonths,
    asOf,
  }
}

function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round((value + Number.EPSILON) * f) / f
}

/**
 * Format a rate the way Uruguayan pages render money: `40,90` (comma decimal,
 * two places). Kept here so the meta description, the visible answer and the
 * JSON-LD cannot format the same number three different ways.
 */
export function formatRate(value: number, locale = 'es-UY'): string {
  return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * The signed percent, as shown to a reader: `+3,41 %` / `-1,20 %` / `0,00 %`.
 */
export function formatChangePct(value: number, locale = 'es-UY'): string {
  const abs = Math.abs(value).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${abs}`
}
