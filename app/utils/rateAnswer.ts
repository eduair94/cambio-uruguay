// The "answer block": the facts a page must state in server-rendered text so a
// searcher (and an AI Overview, and a SERP snippet) gets the answer without a
// click into JavaScript.
//
// PURE functions (no Vue/Nuxt runtime) so they are unit-testable in plain Node.
//
// Everything here is derived from the `statistics` block the /evolution endpoint
// already returns — we never recompute what the API computed, and never invent a
// figure the API did not send.

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
