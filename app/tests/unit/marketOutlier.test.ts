import { describe, expect, it } from 'vitest'
import {
  MIN_SAMPLE,
  OFF_MARKET_PCT,
  OFF_MARKET_BANDS,
  bandFor,
  crownable,
  frozenAheadIn,
  median,
  offMarketSide,
  pastBand,
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

describe('pastBand', () => {
  it('uses the documented threshold, only in the direction that would be crowned', () => {
    expect(OFF_MARKET_PCT).toBe(3)
    // A sell too cheap and a buy too generous.
    expect(pastBand(96.9, 100, 'sell')).toBe(true)
    expect(pastBand(97.1, 100, 'sell')).toBe(false)
    expect(pastBand(103.01, 100, 'buy')).toBe(true)
    expect(pastBand(102.9, 100, 'buy')).toBe(false)
    // A sell too dear and a buy too stingy are bad prices, not errors: they are never crowned.
    expect(pastBand(110, 100, 'sell')).toBe(false)
    expect(pastBand(90, 100, 'buy')).toBe(false)
  })

  it('reads a factor band as a ratio', () => {
    expect(pastBand(0.15, 0.02, 'buy', { factor: 2 })).toBe(true)
    expect(pastBand(0.04, 0.02, 'buy', { factor: 2 })).toBe(false)
    expect(pastBand(0.03, 0.05, 'sell', { factor: 2 })).toBe(false)
    expect(pastBand(0.02, 0.05, 'sell', { factor: 2 })).toBe(true)
    // BROU selling the Argentine peso at 0,55 is expensive, and real.
    expect(pastBand(0.55, 0.05, 'sell', { factor: 2 })).toBe(false)
  })

  it('is false without a usable reference', () => {
    expect(pastBand(50, null, 'sell')).toBe(false)
    expect(pastBand(50, 0, 'buy')).toBe(false)
  })
})

describe('offMarketSide', () => {
  const market = Array.from({ length: 20 }, (_, i) => ({ buy: 39 + i * 0.01, sell: 41 + i * 0.01 }))

  it('flags the frozen board on the side it would win, and only there', () => {
    // The dollar board frozen since July: its sell would be crowned, its buy is just low.
    const stale = { buy: 37.15, sell: 39.55 }
    const quotes = [...market, stale]
    expect(offMarketSide(quotes, 'USD', 'sell')(stale)).toBe(true)
    expect(offMarketSide(quotes, 'USD', 'buy')(stale)).toBe(false)
    expect(market.some(q => offMarketSide(quotes, 'USD', 'sell')(q))).toBe(false)
  })

  it('leaves a merely competitive quote alone', () => {
    const sharp = { buy: 39.5, sell: 40.4 }
    const quotes = [...market, sharp]
    expect(offMarketSide(quotes, 'USD', 'sell')(sharp)).toBe(false)
    expect(offMarketSide(quotes, 'USD', 'buy')(sharp)).toBe(false)
  })

  it('judges only the side asked for', () => {
    // A narrow-spread casa: its buy sits high, its sell is the cheapest and real.
    const narrow = { buy: 40.7, sell: 40.9 }
    const quotes = [...market, narrow]
    expect(offMarketSide(quotes, 'USD', 'sell')(narrow)).toBe(false)
    // 40,7 is 4,1 % over a 39,1 median buy: past the dollar's 4 % buy band.
    expect(offMarketSide(quotes, 'USD', 'buy')(narrow)).toBe(true)
  })

  it('uses the band of the currency', () => {
    // 5 % under the median sell: a frozen board for the dollar, a real casa for the real.
    const cheap = { buy: 39, sell: 39 }
    expect(offMarketSide([...market, cheap], 'USD', 'sell')(cheap)).toBe(true)
    expect(offMarketSide([...market, cheap], 'BRL', 'sell')(cheap)).toBe(false)
  })

  it('keeps the banks’ expensive Argentine peso, and drops the buy that is not a price', () => {
    // Casas sell at 0,03–0,08 and banks at 0,20–0,55: the two clusters of the real market.
    const casas = Array.from({ length: 24 }, (_, i) => ({ buy: 0.02, sell: 0.03 + (i % 6) * 0.01 }))
    const banks = Array.from({ length: 16 }, (_, i) => ({ buy: 0.02, sell: 0.2 + i * 0.02 }))
    const tradelix = { buy: 0.15, sell: 0.3 }
    const quotes = [...casas, ...banks, tradelix]
    const sellOff = offMarketSide(quotes, 'ARS', 'sell')
    expect(quotes.some(sellOff)).toBe(false)
    expect(offMarketSide(quotes, 'ARS', 'buy')(tradelix)).toBe(true)
  })

  it('stands down on a thin market, whatever the spread', () => {
    // Two houses quoting ARS wildly apart must both survive — with a sample
    // this small the median carries no information.
    const thin = [
      { buy: 0.02, sell: 0.2 },
      { buy: 0.5, sell: 0.003 },
    ]
    for (const side of ['buy', 'sell'] as const) {
      const isOff = offMarketSide(thin, 'ARS', side)
      expect(thin.some(isOff)).toBe(false)
    }
  })

  it('never flags anything below the minimum sample', () => {
    // One short of the threshold, including a quote that is wildly off.
    const few = Array.from({ length: MIN_SAMPLE - 2 }, () => ({ buy: 39, sell: 41 }))
    few.push({ buy: 100, sell: 2 })
    expect(few).toHaveLength(MIN_SAMPLE - 1)
    expect(few.some(offMarketSide(few, 'USD', 'sell'))).toBe(false)
    expect(few.some(offMarketSide(few, 'USD', 'buy'))).toBe(false)
  })

  it('starts judging exactly at the minimum sample', () => {
    const enough = Array.from({ length: MIN_SAMPLE - 1 }, () => ({ buy: 39, sell: 41 }))
    const rogue = { buy: 100, sell: 2 }
    enough.push(rogue)
    expect(enough).toHaveLength(MIN_SAMPLE)
    expect(offMarketSide(enough, 'USD', 'sell')(rogue)).toBe(true)
    expect(offMarketSide(enough, 'USD', 'buy')(rogue)).toBe(true)
  })

  it('ignores a missing price instead of treating it as zero', () => {
    const noSell = { buy: 45, sell: null as number | null }
    const noBuy = { buy: null as number | null, sell: 30 }
    const quotes = [...market, noSell, noBuy]
    expect(offMarketSide(quotes, 'USD', 'sell')(noSell)).toBe(false)
    expect(offMarketSide(quotes, 'USD', 'buy')(noSell)).toBe(true)
    expect(offMarketSide(quotes, 'USD', 'buy')(noBuy)).toBe(false)
    expect(offMarketSide(quotes, 'USD', 'sell')(noBuy)).toBe(true)
  })
})

// The bands of 2026-11-11, measured on 55 snapshots (utils/marketOutlier.ts has the numbers).
describe('bands by currency and side', () => {
  it('keeps the documented bands', () => {
    expect(bandFor('USD', 'sell')).toEqual({ pct: 3 })
    expect(bandFor('USD', 'buy')).toEqual({ pct: 4 })
    expect(bandFor('EUR', 'sell')).toEqual({ pct: 3 })
    expect(bandFor('EUR', 'buy')).toEqual({ pct: 3.5 })
    expect(bandFor('BRL', 'sell')).toEqual({ pct: 12 })
    expect(bandFor('BRL', 'buy')).toEqual({ pct: 15 })
    expect(bandFor('ARS', 'sell')).toEqual({ factor: 4 })
    expect(bandFor('ARS', 'buy')).toEqual({ factor: 2 })
    // A currency without its own band, and a lower-case code, use the dollar's sell band.
    expect(bandFor('CHF', 'sell')).toEqual({ pct: OFF_MARKET_PCT })
    expect(bandFor('brl', 'sell')).toEqual({ pct: 12 })
    expect(Object.keys(OFF_MARKET_BANDS).sort()).toEqual(['ARS', 'BRL', 'EUR', 'USD'])
  })
})

describe('crownable', () => {
  const market = Array.from({ length: 20 }, (_, i) => ({
    origin: `c${i}`,
    buy: 39 + i * 0.01,
    sell: 41 + i * 0.01,
  }))
  const stale = { origin: 'stale', buy: 37.15, sell: 39.55 }
  const narrow = { origin: 'narrow', buy: 40.7, sell: 40.9 }
  const all = [...market, stale, narrow]

  it('sorts best first and leaves out what the market rejects on that side', () => {
    expect(
      crownable(all, all, 'USD', 'sell')
        .map(q => q.origin)
        .slice(0, 2)
    ).toEqual(['narrow', 'c0'])
    expect(crownable(all, all, 'USD', 'buy')[0]!.origin).toBe('c19')
  })

  it('judges a subset against the market it is given, not against itself', () => {
    // Two boards alone are too few to judge anything.
    expect(crownable([stale, narrow], [stale, narrow], 'USD', 'sell')[0]!.origin).toBe('stale')
    expect(crownable([stale, narrow], all, 'USD', 'sell')[0]!.origin).toBe('narrow')
  })

  it('drops a missing or zero price', () => {
    const quotes = [...all, { origin: 'none', buy: 0, sell: null }]
    expect(crownable(quotes, all, 'USD', 'buy').some(q => q.origin === 'none')).toBe(false)
    expect(crownable(quotes, all, 'USD', 'sell').some(q => q.origin === 'none')).toBe(false)
  })
})

// The backend's `frozen` mark (classes/frozen_marks.ts): a board that has published the same prices
// for days. No band separates one sitting 1 % from the best live price — cambio_principal's euro buy,
// 45 for 100 days, was the site's best euro buy on 2026-11-11 — so the rule reads the mark.
describe('a frozen board', () => {
  const live = Array.from({ length: 12 }, (_, i) => ({
    origin: `casa_${i}`,
    buy: 39 + i * 0.01,
    sell: 41 + i * 0.01,
  }))
  const ahead = { origin: 'ahead', buy: 39.2, sell: 40.95, frozen: true }
  const behind = { origin: 'behind', buy: 39.05, sell: 41.05, frozen: true }
  const market = [...live, ahead, behind]

  it('loses the crown it would win, inside the band, on each side', () => {
    expect(offMarketSide(market, 'USD', 'sell')(ahead)).toBe(true)
    expect(offMarketSide(market, 'USD', 'buy')(ahead)).toBe(true)
    expect(crownable(market, market, 'USD', 'sell')[0]?.origin).toBe('casa_0')
    expect(crownable(market, market, 'USD', 'buy')[0]?.origin).toBe('casa_11')
  })

  it('a tie with the best live price goes to the live board', () => {
    const tie = { origin: 'tie', buy: 39.11, sell: 41, frozen: true }
    // First in the list, so a stable sort would keep it ahead if the rule let it through.
    const rows = [tie, ...live]
    expect(crownable(rows, rows, 'USD', 'sell')[0]?.origin).toBe('casa_0')
    expect(crownable(rows, rows, 'USD', 'buy')[0]?.origin).toBe('casa_11')
  })

  it('behind the best live price stays ranked and counted: a quiet board can be a real price', () => {
    expect(offMarketSide(market, 'USD', 'sell')(behind)).toBe(false)
    expect(offMarketSide(market, 'USD', 'buy')(behind)).toBe(false)
    expect(crownable(market, market, 'USD', 'sell')).toHaveLength(13)
  })

  it('does not head a subset either, where the national best is not present', () => {
    // A department: `behind` is its cheapest board, behind the national best but ahead of the
    // department's best live one.
    const department = [live[6]!, live[9]!, behind]
    expect(crownable(department, market, 'USD', 'sell').map(q => q.origin)).toEqual([
      'casa_6',
      'casa_9',
    ])
    expect(offMarketSide(market, 'USD', 'sell', department)(behind)).toBe(true)
    expect(frozenAheadIn(department, 'sell')(behind)).toBe(true)
  })

  it('alone in a subset, it is measured against the market', () => {
    expect(crownable([ahead], market, 'USD', 'sell')).toEqual([])
    expect(crownable([behind], market, 'USD', 'sell').map(q => q.origin)).toEqual(['behind'])
  })

  it('is judged on a thin market too, where the band stands down', () => {
    const thin = [...live.slice(0, 4), ahead]
    expect(offMarketSide(thin, 'USD', 'sell')(ahead)).toBe(true)
    expect(offMarketSide(thin, 'USD', 'sell')(live[0]!)).toBe(false)
  })

  it('without the mark, the same prices are crowned', () => {
    const unmarked = market.map(({ origin, buy, sell }) => ({ origin, buy, sell }))
    expect(crownable(unmarked, unmarked, 'USD', 'sell')[0]?.origin).toBe('ahead')
  })
})
