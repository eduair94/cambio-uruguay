import { describe, expect, it } from 'vitest'
import {
  MIN_SAMPLE,
  OFF_MARKET_PCT,
  deviatesFrom,
  median,
  OFF_MARKET_BANDS,
  bandFor,
  offMarketDetector,
  offMarketSide,
} from '../../utils/marketOutlier'

describe('median', () => {
  it('handles odd and even lengths', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })

  it('is null for an empty list', () => {
    expect(median([])).toBeNull()
  })

  it('does not mutate its input', () => {
    const input = [3, 1, 2]
    median(input)
    expect(input).toEqual([3, 1, 2])
  })
})

describe('deviatesFrom', () => {
  it('uses the documented threshold', () => {
    expect(OFF_MARKET_PCT).toBe(3)
    expect(deviatesFrom(103.01, 100)).toBe(true)
    expect(deviatesFrom(102.9, 100)).toBe(false)
    expect(deviatesFrom(96.9, 100)).toBe(true)
  })

  it('is false without a usable reference', () => {
    expect(deviatesFrom(50, null)).toBe(false)
    expect(deviatesFrom(50, 0)).toBe(false)
  })
})

describe('offMarketDetector', () => {
  const market = Array.from({ length: 20 }, (_, i) => ({ buy: 39 + i * 0.01, sell: 41 + i * 0.01 }))

  it('flags the board that sits far from the median on both sides', () => {
    const stale = { buy: 37.15, sell: 39.55 }
    const isOff = offMarketDetector([...market, stale], 'USD')
    expect(isOff(stale)).toBe(true)
    expect(market.every(q => !isOff(q))).toBe(true)
  })

  it('leaves a merely competitive quote alone', () => {
    const sharp = { buy: 39.5, sell: 40.4 }
    expect(offMarketDetector([...market, sharp], 'USD')(sharp)).toBe(false)
  })

  it('stands down on a thin market, whatever the spread', () => {
    // Two houses quoting ARS wildly apart must both survive — with a sample
    // this small the median carries no information.
    const thin = [
      { buy: 0.02, sell: 0.2 },
      { buy: 0.015, sell: 0.3 },
    ]
    const isOff = offMarketDetector(thin, 'ARS')
    expect(thin.every(q => !isOff(q))).toBe(true)
  })

  it('never flags anything below the minimum sample', () => {
    // One short of the threshold, including a quote that is wildly off.
    const few = Array.from({ length: MIN_SAMPLE - 2 }, () => ({ buy: 39, sell: 41 }))
    few.push({ buy: 1, sell: 2 })
    expect(few).toHaveLength(MIN_SAMPLE - 1)
    const isOff = offMarketDetector(few, 'USD')
    expect(few.some(q => isOff(q))).toBe(false)
  })

  it('starts judging exactly at the minimum sample', () => {
    const enough = Array.from({ length: MIN_SAMPLE - 1 }, () => ({ buy: 39, sell: 41 }))
    const rogue = { buy: 1, sell: 2 }
    enough.push(rogue)
    expect(enough).toHaveLength(MIN_SAMPLE)
    expect(offMarketDetector(enough, 'USD')(rogue)).toBe(true)
  })

  it('ignores missing sides instead of treating them as zero', () => {
    const quotes = [
      ...market,
      { buy: 39.1, sell: null as number | null },
      { buy: null as number | null, sell: 41.1 },
    ]
    const isOff = offMarketDetector(quotes, 'USD')
    expect(isOff({ buy: 39.1, sell: null })).toBe(false)
    expect(isOff({ buy: null, sell: 41.1 })).toBe(false)
  })
})

// The bands of 2026-11-11, measured on 55 snapshots (utils/marketOutlier.ts has the numbers).
describe('bands by currency and side', () => {
  it('keeps the documented bands', () => {
    expect(bandFor('USD', 'sell')).toEqual({ pct: 3 })
    expect(bandFor('USD', 'buy')).toEqual({ pct: 4 })
    expect(bandFor('EUR', 'buy')).toEqual({ pct: 3 })
    expect(bandFor('BRL', 'sell')).toEqual({ pct: 12 })
    expect(bandFor('ARS', 'buy')).toEqual({ factor: 2 })
    // A currency without its own band, and a lower-case code, use the dollar's sell band.
    expect(bandFor('CHF', 'sell')).toEqual({ pct: OFF_MARKET_PCT })
    expect(bandFor('brl', 'sell')).toEqual({ pct: 12 })
    expect(Object.keys(OFF_MARKET_BANDS).sort()).toEqual(['ARS', 'BRL', 'EUR', 'USD'])
  })

  it('reads a factor band as a ratio either way', () => {
    expect(deviatesFrom(0.15, 0.02, { factor: 2 })).toBe(true)
    expect(deviatesFrom(0.04, 0.02, { factor: 2 })).toBe(false)
    expect(deviatesFrom(0.03, 0.05, { factor: 2 })).toBe(false)
    expect(deviatesFrom(0.02, 0.05, { factor: 2 })).toBe(true)
  })
})

describe('offMarketSide', () => {
  const market = Array.from({ length: 20 }, (_, i) => ({ buy: 39 + i * 0.01, sell: 41 + i * 0.01 }))

  it('judges only the side asked for', () => {
    // A narrow-spread casa: its buy sits high, its sell is the cheapest and real.
    const narrow = { buy: 40.7, sell: 40.9 }
    const quotes = [...market, narrow]
    expect(offMarketSide(quotes, 'USD', 'sell')(narrow)).toBe(false)
    // 40,7 is 4,2 % over a 39,1 median buy: past the dollar's 4 % buy band.
    expect(offMarketSide(quotes, 'USD', 'buy')(narrow)).toBe(true)
    expect(offMarketDetector(quotes, 'USD')(narrow)).toBe(true)
  })

  it('uses the band of the currency', () => {
    // 5 % under the median sell: a frozen board for the dollar, a real casa for the real.
    const cheap = { buy: 39, sell: 39 }
    expect(offMarketSide([...market, cheap], 'USD', 'sell')(cheap)).toBe(true)
    expect(offMarketSide([...market, cheap], 'BRL', 'sell')(cheap)).toBe(false)
  })

  it('ignores a missing price on the side asked for', () => {
    const noSell = { buy: 30, sell: null as number | null }
    expect(offMarketSide([...market, noSell], 'USD', 'sell')(noSell)).toBe(false)
    expect(offMarketSide([...market, noSell], 'USD', 'buy')(noSell)).toBe(true)
  })
})
