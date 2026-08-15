// The arithmetic behind /dolar-blue-hoy.
//
// Every number this module returns is stated on the page as a fact about
// somebody's money, so the tests care less about happy paths than about the two
// ways a page like this goes wrong: quoting a rate nobody offers, and printing a
// confident 0 when a side of the comparison is actually missing.
import { describe, expect, it } from 'vitest'

import {
  arsFairValue,
  bestArsBuy,
  bestArsSell,
  brechaPct,
  changePct,
  compareRoutes,
  costViaDollars,
  isStale,
  latestPoint,
  partitionArsQuotes,
  pointDaysAgo,
  spreadPct,
  widestSpread,
  type ArsQuote,
} from '../../utils/blueDollar'

const quote = (over: Partial<ArsQuote> = {}): ArsQuote => ({
  origin: 'casa',
  name: 'Casa',
  buy: 0.02,
  sell: 0.03,
  ...over,
})

describe('brechaPct', () => {
  it('measures how much dearer the parallel rate is', () => {
    // Real pair, 2026-08-14.
    expect(brechaPct({ blue: 1545, oficial: 1510 })).toBeCloseTo(2.318, 2)
  })

  it('handles the historically huge gap the same way', () => {
    expect(brechaPct({ blue: 1000, oficial: 400 })).toBeCloseTo(150, 5)
  })

  it('returns null rather than 0 when a side is missing', () => {
    // 0 would render as "0% de brecha" — a claim, not an absence.
    expect(brechaPct({ blue: 0, oficial: 1510 })).toBeNull()
    expect(brechaPct({ blue: 1545, oficial: 0 })).toBeNull()
    expect(brechaPct({ blue: Number.NaN, oficial: 1510 })).toBeNull()
  })
})

describe('costViaDollars', () => {
  it('prices one peso through the two-hop route', () => {
    // 39,55 UYU buys a dollar; that dollar buys 1545 ARS.
    expect(costViaDollars(39.55, 1545)).toBeCloseTo(0.0256, 4)
  })

  it('refuses to divide by a missing rate', () => {
    expect(costViaDollars(39.55, 0)).toBeNull()
    expect(costViaDollars(0, 1545)).toBeNull()
  })
})

describe('spreadPct', () => {
  it('measures buy-to-sell distance', () => {
    // la_favorita on 2026-08-15: buys at 0,019 and sells at 0,034.
    expect(spreadPct({ buy: 0.019, sell: 0.034 })).toBeCloseTo(78.9, 1)
  })

  it('is null when either side is unpublished', () => {
    expect(spreadPct({ buy: 0, sell: 0.03 })).toBeNull()
    expect(spreadPct({ buy: 0.02, sell: 0 })).toBeNull()
  })
})

describe('compareRoutes', () => {
  const rates = { blue: 1545, oficial: 1510 }

  it('ranks cheapest first and marks the best route', () => {
    const c = compareRoutes(39.55, 0.03, rates)!
    expect(c.routes.map(r => r.id)).toEqual(['via-dolar-blue', 'via-dolar-oficial', 'directo'])
    expect(c.best.id).toBe('via-dolar-blue')
  })

  it('reports the real surcharge of buying pesos in Uruguay', () => {
    // The page's headline claim, with the day's actual numbers.
    const c = compareRoutes(39.55, 0.03, rates)!
    expect(c.directSurchargePct).toBeCloseTo(17.2, 1)
  })

  it('reports no surcharge when the direct route IS the cheapest', () => {
    // Must not invent a penalty that is not there — if a casa ever prices ARS
    // below the two-hop route, the page has to say so.
    const c = compareRoutes(39.55, 0.02, rates)!
    expect(c.best.id).toBe('directo')
    expect(c.directSurchargePct).toBeNull()
  })

  it('still compares when no casa quotes pesos at all', () => {
    const c = compareRoutes(39.55, null, rates)!
    expect(c.direct).toBeNull()
    expect(c.directSurchargePct).toBeNull()
    expect(c.routes).toHaveLength(2)
  })

  it('still shows the direct route when the Argentine side is unavailable', () => {
    const c = compareRoutes(39.55, 0.03, null)!
    expect(c.routes.map(r => r.id)).toEqual(['directo'])
    expect(c.best.id).toBe('directo')
    expect(c.directSurchargePct).toBeNull()
  })

  it('returns null when there is nothing to compare', () => {
    expect(compareRoutes(null, null, null)).toBeNull()
    expect(compareRoutes(0, 0, { blue: 0, oficial: 0 })).toBeNull()
  })

  it('drops only the leg whose rate is missing', () => {
    const c = compareRoutes(39.55, 0.03, { blue: 1545, oficial: 0 })!
    expect(c.routes.map(r => r.id)).toEqual(['via-dolar-blue', 'directo'])
  })
})

describe('bestArsSell / bestArsBuy', () => {
  const board = [
    quote({ origin: 'a', sell: 0.03, buy: 0.02 }),
    quote({ origin: 'b', sell: 0.035, buy: 0.025 }),
    quote({ origin: 'c', sell: 0, buy: 0.019 }),
  ]

  it('picks the cheapest seller and the best payer separately', () => {
    // Different casas, different questions — conflating them would imply a
    // spread no single casa offers.
    expect(bestArsSell(board)?.origin).toBe('a')
    expect(bestArsBuy(board)?.origin).toBe('b')
  })

  it('ignores rows with no published price on the relevant side', () => {
    expect(bestArsSell(board)?.origin).not.toBe('c')
  })

  it('is null on an empty board', () => {
    expect(bestArsSell([])).toBeNull()
    expect(bestArsBuy([])).toBeNull()
  })
})

describe('widestSpread', () => {
  it('finds the worst buy/sell gap on the board', () => {
    const w = widestSpread([
      quote({ origin: 'a', buy: 0.02, sell: 0.03 }),
      quote({ origin: 'b', buy: 0.019, sell: 0.034 }),
    ])!
    expect(w.quote.origin).toBe('b')
    expect(w.pct).toBeCloseTo(78.9, 1)
  })

  it('is null when no quote has both sides', () => {
    expect(widestSpread([quote({ buy: 0, sell: 0.03 })])).toBeNull()
  })
})

describe('arsFairValue', () => {
  it('prices a peso through the dollar', () => {
    expect(arsFairValue(39.55, 1535)).toBeCloseTo(0.02577, 5)
  })

  it('is null when a leg is missing, so the filter cannot run on a guess', () => {
    expect(arsFairValue(null, 1535)).toBeNull()
    expect(arsFairValue(39.55, null)).toBeNull()
    expect(arsFairValue(39.55, 0)).toBeNull()
  })
})

describe('partitionArsQuotes', () => {
  // Observed on the live 39-casa board (2026-08-15): fair value ~0,0258, one
  // cluster near it and another at 4-11x, including buy 0,01 / sell 0,25.
  const fair = 0.0258

  it('keeps quotes near fair value', () => {
    const board = [quote({ origin: 'a', sell: 0.03, buy: 0.02 })]
    expect(partitionArsQuotes(board, fair).plausible.map(q => q.origin)).toEqual(['a'])
  })

  it('drops the stale pizarras that are multiples of fair value', () => {
    const board = [
      quote({ origin: 'real', sell: 0.03, buy: 0.02 }),
      quote({ origin: 'stale', sell: 0.2, buy: 0.15 }),
      quote({ origin: 'openn', sell: 0.25, buy: 0.01 }),
    ]
    const { plausible, excluded } = partitionArsQuotes(board, fair)
    expect(plausible.map(q => q.origin)).toEqual(['real'])
    expect(excluded.map(q => q.origin).sort()).toEqual(['openn', 'stale'])
  })

  it('drops a quote whose OTHER side is implausible', () => {
    // buy 0,01 is under half of fair value even though sell 0,03 looks fine —
    // a board that wrong on one side is not evidence on the other.
    const { excluded } = partitionArsQuotes([quote({ origin: 'x', sell: 0.03, buy: 0.001 })], fair)
    expect(excluded.map(q => q.origin)).toEqual(['x'])
  })

  it('keeps everything when fair value is unknown, rather than guessing a band', () => {
    const board = [quote({ origin: 'a', sell: 0.25, buy: 0.01 })]
    const { plausible, excluded } = partitionArsQuotes(board, null)
    expect(plausible).toHaveLength(1)
    expect(excluded).toHaveLength(0)
  })

  it('excludes a row with no usable price at all', () => {
    const { excluded } = partitionArsQuotes([quote({ origin: 'z', sell: 0, buy: 0 })], fair)
    expect(excluded.map(q => q.origin)).toEqual(['z'])
  })

  it('every quote lands in exactly one half', () => {
    const board = [
      quote({ origin: 'a', sell: 0.03, buy: 0.02 }),
      quote({ origin: 'b', sell: 0.2, buy: 0.15 }),
      quote({ origin: 'c', sell: 0, buy: 0 }),
    ]
    const { plausible, excluded } = partitionArsQuotes(board, fair)
    expect(plausible.length + excluded.length).toBe(board.length)
  })
})

describe('isStale', () => {
  it('accepts a reading from within the window', () => {
    expect(isStale('2026-08-14', '2026-08-15')).toBe(false)
    expect(isStale('2026-08-11', '2026-08-15')).toBe(false) // 4 days, a long weekend
  })

  it('flags a reading the daily task stopped refreshing', () => {
    expect(isStale('2026-08-10', '2026-08-15')).toBe(true)
  })

  it('treats a missing or unparseable date as stale, never as fresh', () => {
    expect(isStale(undefined, '2026-08-15')).toBe(true)
    expect(isStale('nope', '2026-08-15')).toBe(true)
  })
})

describe('latestPoint / pointDaysAgo / changePct', () => {
  const series = [
    { date: '2025-08-14', value: 1300 },
    { date: '2026-07-15', value: 1500 },
    { date: '2026-08-13', value: 1540 },
    { date: '2026-08-14', value: 1545 },
  ]

  it('takes the newest point', () => {
    expect(latestPoint(series)?.value).toBe(1545)
    expect(latestPoint([])).toBeNull()
  })

  it('walks back by CALENDAR days, not by array position', () => {
    // The series skips weekends and holidays, so points[len-30] is about six
    // weeks back, not one month — the whole reason this is not an index lookup.
    expect(pointDaysAgo(series, 30)?.date).toBe('2026-07-15')
    expect(pointDaysAgo(series, 365)?.date).toBe('2025-08-14')
  })

  it('is null when the series does not reach that far back', () => {
    expect(pointDaysAgo([{ date: '2026-08-14', value: 1545 }], 365)).toBeNull()
  })

  it('computes change between two points, and null when one is missing', () => {
    expect(changePct({ date: 'a', value: 1500 }, { date: 'b', value: 1545 })).toBeCloseTo(3, 5)
    expect(changePct(null, { date: 'b', value: 1545 })).toBeNull()
    expect(changePct({ date: 'a', value: 0 }, { date: 'b', value: 1545 })).toBeNull()
  })
})
