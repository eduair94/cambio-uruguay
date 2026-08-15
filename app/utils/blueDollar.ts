// The arithmetic behind `/dolar-blue-hoy`. PURE module (no Vue/Nuxt runtime,
// relative imports only) so the API route, the page and the unit tests share
// one definition of every number the page states.
//
// The page answers a question a Uruguayan actually has before crossing to
// Argentina — "¿cambio pesos acá o llevo dólares?" — and it can answer it
// because the site already holds both halves daily and has never joined them:
//
//   - `driversnapshots` carries the Argentine blue and official rates (ARS per
//     USD), ingested every morning by the `drivers:daily` task since 2011. They
//     exist only to attribute moves on the historical charts; no page shows
//     them.
//   - the public rates API carries what Uruguayan casas charge for ARS.
//
// Every figure here is derived from those two, and nothing is estimated: when a
// side is missing the comparison returns null instead of guessing.

/** One point of a driver series (`{date, value}`), as `/api/drivers` serves it. */
export interface BluePoint {
  date: string
  value: number
}

/** The two Argentine reference rates for a day, in ARS per USD. */
export interface BlueRates {
  /** Parallel ("blue") rate, ARS per USD. */
  blue: number
  /** Official rate, ARS per USD. */
  oficial: number
  /** ISO date the pair belongs to. */
  date: string
}

/** What a Uruguayan casa charges for Argentine pesos, in UYU per ARS. */
export interface ArsQuote {
  /** Casa key (`cambio_obelisco`). */
  origin: string
  /** Display name when the directory knows one. */
  name: string
  /** UYU paid per ARS bought from the customer. */
  buy: number
  /** UYU charged per ARS sold to the customer. */
  sell: number
}

const isPos = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

/**
 * The gap between the parallel and official rates, in percent.
 *
 * This is *the* number Argentine coverage leads with, and its story has flipped:
 * it ran past 100% through 2023 and sits near 2% now. A page that only shouted
 * "blue" would be reporting a spread that has mostly stopped existing, which is
 * why the page states the gap rather than assuming it.
 */
export function brechaPct(rates: Pick<BlueRates, 'blue' | 'oficial'>): number | null {
  if (!isPos(rates.blue) || !isPos(rates.oficial)) return null
  return (rates.blue / rates.oficial - 1) * 100
}

/**
 * Cost of one Argentine peso, in Uruguayan pesos, when you buy dollars in
 * Uruguay and change them in Argentina.
 *
 * `usdSell` is what a Uruguayan casa charges for one dollar; `arsPerUsd` is what
 * that dollar becomes in Argentina. Two hops, so the errors compound — which is
 * exactly why the page shows the route rather than a single rate.
 */
export function costViaDollars(usdSell: number, arsPerUsd: number): number | null {
  if (!isPos(usdSell) || !isPos(arsPerUsd)) return null
  return usdSell / arsPerUsd
}

/** Buy/sell spread of a quote, in percent of the buy side. */
export function spreadPct(quote: Pick<ArsQuote, 'buy' | 'sell'>): number | null {
  if (!isPos(quote.buy) || !isPos(quote.sell)) return null
  return (quote.sell / quote.buy - 1) * 100
}

/** One way of ending up with Argentine pesos, priced in UYU per ARS. */
export interface Route {
  id: 'directo' | 'via-dolar-blue' | 'via-dolar-oficial'
  label: string
  /** UYU paid per 1 ARS. Lower is better. */
  costPerArs: number
  /** How the number was built, for the page to show its working. */
  detail: string
}

export interface RouteComparison {
  routes: Route[]
  /** Cheapest route. */
  best: Route
  /** Buying pesos in Uruguay directly, when a casa quotes them. */
  direct: Route | null
  /**
   * How much more the direct route costs than the cheapest one, in percent.
   * `null` when either side is missing — never 0 as a stand-in.
   */
  directSurchargePct: number | null
}

/**
 * Price every way of turning Uruguayan pesos into Argentine pesos and rank them.
 *
 * Deliberately *not* advice: it reports what each route costs today at the best
 * published rate on each leg. The page carries the caveats (the parallel market
 * is informal, rates move, a casa can refuse a large amount) next to the table.
 */
export function compareRoutes(
  usdSell: number | null,
  arsSell: number | null,
  rates: Pick<BlueRates, 'blue' | 'oficial'> | null
): RouteComparison | null {
  const routes: Route[] = []

  if (isPos(usdSell) && rates) {
    const viaBlue = isPos(rates.blue) ? costViaDollars(usdSell, rates.blue) : null
    if (viaBlue !== null) {
      routes.push({
        id: 'via-dolar-blue',
        label: 'Comprar dólares en Uruguay y cambiarlos en el paralelo argentino',
        costPerArs: viaBlue,
        detail: `${usdSell} UYU por dólar ÷ ${rates.blue} ARS por dólar`,
      })
    }
    const viaOficial = isPos(rates.oficial) ? costViaDollars(usdSell, rates.oficial) : null
    if (viaOficial !== null) {
      routes.push({
        id: 'via-dolar-oficial',
        label: 'Comprar dólares en Uruguay y cambiarlos al oficial argentino',
        costPerArs: viaOficial,
        detail: `${usdSell} UYU por dólar ÷ ${rates.oficial} ARS por dólar`,
      })
    }
  }

  let direct: Route | null = null
  if (isPos(arsSell)) {
    direct = {
      id: 'directo',
      label: 'Comprar pesos argentinos en una casa de cambio uruguaya',
      costPerArs: arsSell,
      detail: `${arsSell} UYU por peso argentino, precio de venta al público`,
    }
    routes.push(direct)
  }

  if (!routes.length) return null

  const best = routes.reduce((a, b) => (b.costPerArs < a.costPerArs ? b : a))
  const directSurchargePct =
    direct && best.id !== 'directo' ? (direct.costPerArs / best.costPerArs - 1) * 100 : null

  return {
    routes: [...routes].sort((a, b) => a.costPerArs - b.costPerArs),
    best,
    direct,
    directSurchargePct,
  }
}

/**
 * How far a Uruguayan ARS quote may sit from fair value before it stops being
 * treated as a price.
 *
 * Fair value is not a guess: it is `usdSell / arsPerUsd` — what a peso costs
 * through the dollar, anchored on two rates the site already publishes. Against
 * a live 39-casa board the ARS quotes came out bimodal, one cluster near fair
 * value and another at four to eleven times it (one casa published buy 0,01 /
 * sell 0,25, an 2.400% spread). Those are stale or misparsed pizarras — most
 * casas barely trade pesos and leave the board up for months — and averaging
 * them in, or naming the worst of them in a callout, would publish a scraping
 * artefact as a fact about somebody's business.
 *
 * The band is deliberately wide. `marketOutlier.ts` uses 3% because the USD
 * board is a real competitive market; the ARS board is not, and honest casas
 * genuinely differ by 20-30% on a currency they hardly move.
 */
export const ARS_PLAUSIBLE_MIN_RATIO = 0.5
export const ARS_PLAUSIBLE_MAX_RATIO = 2

/** Fair value of one ARS in UYU, via the dollar. Null when either leg is missing. */
export function arsFairValue(usdSell: number | null, arsPerUsd: number | null): number | null {
  if (!isPos(usdSell) || !isPos(arsPerUsd)) return null
  return usdSell / arsPerUsd
}

/**
 * Split an ARS board into quotes worth ranking and quotes that are not prices.
 *
 * Returns BOTH halves on purpose: the count of what was dropped is disclosed on
 * the page rather than silently truncated, because "17 de 39 casas publican un
 * precio que no se corresponde con ningún mercado" is itself the most useful
 * thing the board has to say. The excluded casas are not named — the evidence
 * says the scrape is unreliable, not that the business is.
 */
export function partitionArsQuotes(
  quotes: readonly ArsQuote[],
  fair: number | null
): { plausible: ArsQuote[]; excluded: ArsQuote[] } {
  if (fair === null) return { plausible: [...quotes], excluded: [] }
  const lo = fair * ARS_PLAUSIBLE_MIN_RATIO
  const hi = fair * ARS_PLAUSIBLE_MAX_RATIO
  const plausible: ArsQuote[] = []
  const excluded: ArsQuote[] = []
  for (const q of quotes) {
    // Judged on the side that exists; a casa publishing only one side is still
    // judged on that side rather than waved through.
    const sides = [q.sell, q.buy].filter(isPos)
    const ok = sides.length > 0 && sides.every(v => v >= lo && v <= hi)
    ;(ok ? plausible : excluded).push(q)
  }
  return { plausible, excluded }
}

/**
 * Whether a dated reading is too old to present as "hoy".
 *
 * The Argentine series comes from a third party through a daily task; when
 * either stalls the page must say the date it actually has rather than implying
 * the number is current. Four days clears a long weekend without hiding a real
 * outage.
 */
export function isStale(date: string | undefined, today: string, maxDays = 4): boolean {
  if (!date) return true
  const a = new Date(`${date}T00:00:00Z`).getTime()
  const b = new Date(`${today}T00:00:00Z`).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return true
  return (b - a) / 86_400_000 > maxDays
}

/** Last point of a series, or null when the series is empty. */
export function latestPoint(points: readonly BluePoint[] | undefined): BluePoint | null {
  if (!points?.length) return null
  const last = points[points.length - 1]
  return last && isPos(last.value) ? last : null
}

/**
 * The point closest to (but not after) `daysAgo` days before the newest one.
 *
 * Used for the "hace un mes / hace un año" context columns. Walks backwards from
 * the end rather than indexing by position: the series skips weekends and
 * holidays, so `points[len - 30]` is about six weeks, not one month.
 */
export function pointDaysAgo(
  points: readonly BluePoint[] | undefined,
  daysAgo: number
): BluePoint | null {
  const last = latestPoint(points)
  if (!last) return null
  const target = new Date(`${last.date}T00:00:00Z`).getTime() - daysAgo * 86_400_000
  let best: BluePoint | null = null
  for (const p of points!) {
    const t = new Date(`${p.date}T00:00:00Z`).getTime()
    if (Number.isNaN(t) || t > target || !isPos(p.value)) continue
    if (!best || t > new Date(`${best.date}T00:00:00Z`).getTime()) best = p
  }
  return best
}

/** Percent change between two points, oldest → newest. */
export function changePct(from: BluePoint | null, to: BluePoint | null): number | null {
  if (!from || !to || !isPos(from.value) || !isPos(to.value)) return null
  return (to.value / from.value - 1) * 100
}

/**
 * Cheapest published sell price among ARS quotes, with its casa.
 *
 * "Cheapest sell" is what matters to someone BUYING pesos; the best buy price is
 * a different casa and a different question, and conflating the two is how a
 * comparison ends up implying a spread nobody offers.
 */
export function bestArsSell(quotes: readonly ArsQuote[]): ArsQuote | null {
  const valid = quotes.filter(q => isPos(q.sell))
  if (!valid.length) return null
  return valid.reduce((a, b) => (b.sell < a.sell ? b : a))
}

/** Best price paid for ARS, for the traveller coming back with leftover pesos. */
export function bestArsBuy(quotes: readonly ArsQuote[]): ArsQuote | null {
  const valid = quotes.filter(q => isPos(q.buy))
  if (!valid.length) return null
  return valid.reduce((a, b) => (b.buy > a.buy ? b : a))
}

/** Widest buy/sell spread on the board — the page's "mirá la letra chica" case. */
export function widestSpread(quotes: readonly ArsQuote[]): { quote: ArsQuote; pct: number } | null {
  let worst: { quote: ArsQuote; pct: number } | null = null
  for (const q of quotes) {
    const pct = spreadPct(q)
    if (pct === null) continue
    if (!worst || pct > worst.pct) worst = { quote: q, pct }
  }
  return worst
}
