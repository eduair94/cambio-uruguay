import { describe, expect, it } from 'vitest'
import {
  MIN_SAMPLE,
  OFF_MARKET_PCT,
  deviatesFrom,
  median,
  offMarketDetector,
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
    const isOff = offMarketDetector([...market, stale])
    expect(isOff(stale)).toBe(true)
    expect(market.every(q => !isOff(q))).toBe(true)
  })

  it('leaves a merely competitive quote alone', () => {
    const sharp = { buy: 39.5, sell: 40.4 }
    expect(offMarketDetector([...market, sharp])(sharp)).toBe(false)
  })

  it('stands down on a thin market, whatever the spread', () => {
    // Two houses quoting ARS wildly apart must both survive — with a sample
    // this small the median carries no information.
    const thin = [
      { buy: 0.02, sell: 0.2 },
      { buy: 0.015, sell: 0.3 },
    ]
    const isOff = offMarketDetector(thin)
    expect(thin.every(q => !isOff(q))).toBe(true)
  })

  it('never flags anything below the minimum sample', () => {
    // One short of the threshold, including a quote that is wildly off.
    const few = Array.from({ length: MIN_SAMPLE - 2 }, () => ({ buy: 39, sell: 41 }))
    few.push({ buy: 1, sell: 2 })
    expect(few).toHaveLength(MIN_SAMPLE - 1)
    const isOff = offMarketDetector(few)
    expect(few.some(q => isOff(q))).toBe(false)
  })

  it('starts judging exactly at the minimum sample', () => {
    const enough = Array.from({ length: MIN_SAMPLE - 1 }, () => ({ buy: 39, sell: 41 }))
    const rogue = { buy: 1, sell: 2 }
    enough.push(rogue)
    expect(enough).toHaveLength(MIN_SAMPLE)
    expect(offMarketDetector(enough)(rogue)).toBe(true)
  })

  it('ignores missing sides instead of treating them as zero', () => {
    const quotes = [
      ...market,
      { buy: 39.1, sell: null as number | null },
      { buy: null as number | null, sell: 41.1 },
    ]
    const isOff = offMarketDetector(quotes)
    expect(isOff({ buy: 39.1, sell: null })).toBe(false)
    expect(isOff({ buy: null, sell: 41.1 })).toBe(false)
  })
})
