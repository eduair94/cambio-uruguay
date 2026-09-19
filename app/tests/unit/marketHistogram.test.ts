import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  marketHistogramCdf,
  marketHistogramShares,
  marketHistogramShift,
  marketHistogramInBand,
  marketHistogramBinOf,
  marketMoneyShort,
  marketPickHistograms,
  marketPositionSentence,
  MARKET_HISTOGRAM_MINIMUM,
  type MarketHistogram,
} from '../../utils/marketSeries'

const linear: MarketHistogram = {
  n: 100,
  log: false,
  edges: [0, 10, 20, 30],
  counts: [20, 50, 20],
  below: 5,
  above: 5,
}
const logHist: MarketHistogram = {
  n: 40,
  log: true,
  edges: [100, 1000, 10000],
  counts: [20, 20],
  below: 0,
  above: 0,
}

describe('parity with classes/marketseries/histogram.ts', () => {
  it('same minimum to draw a shape', () => {
    const root = readFileSync(
      join(__dirname, '..', '..', '..', 'classes', 'marketseries', 'histogram.ts'),
      'utf8'
    )
    expect(root).toContain(`MARKET_HISTOGRAM_MINIMUM = ${MARKET_HISTOGRAM_MINIMUM};`)
  })
})

describe('marketHistogramCdf: share asking less than a price', () => {
  it('counts the tail below the axis, then interpolates inside the bin', () => {
    expect(marketHistogramCdf(linear, 0)).toBeCloseTo(0.05)
    expect(marketHistogramCdf(linear, 10)).toBeCloseTo(0.25)
    expect(marketHistogramCdf(linear, 15)).toBeCloseTo(0.5)
    expect(marketHistogramCdf(linear, 30)).toBeCloseTo(0.95)
  })
  it('outside the axis it answers with the tail it knows', () => {
    expect(marketHistogramCdf(linear, -5)).toBeCloseTo(0.05)
    expect(marketHistogramCdf(linear, 999)).toBeCloseTo(0.95)
  })
  it('log bins interpolate on the log scale', () => {
    expect(marketHistogramCdf(logHist, Math.sqrt(100 * 1000))).toBeCloseTo(0.25)
  })
})

describe('marketPositionSentence', () => {
  it('reads as a position, and admits the extremes', () => {
    expect(marketPositionSentence(0.634)).toBe(
      'Pide más que el 63 % de los avisos y menos que el 37 %.'
    )
    expect(marketPositionSentence(0.004)).toBe('Es más bajo que casi todos los avisos.')
    expect(marketPositionSentence(0.996)).toBe('Es más alto que casi todos los avisos.')
  })
})

describe('shares and bands', () => {
  it('share of all observations per bin', () => {
    expect(marketHistogramShares(linear)).toEqual([0.2, 0.5, 0.2])
  })
  it('the bins that touch the p25..p75 band', () => {
    expect(marketHistogramInBand(linear, 12, 18)).toEqual([false, true, false])
    expect(marketHistogramInBand(linear, 9, 21)).toEqual([true, true, true])
  })
  it('the bin a price falls in, or -1 outside the axis', () => {
    expect(marketHistogramBinOf(linear, 15)).toBe(1)
    expect(marketHistogramBinOf(linear, 30)).toBe(2)
    expect(marketHistogramBinOf(linear, 31)).toBe(-1)
  })
})

describe("marketHistogramShift: then, redrawn on today's bins", () => {
  it('the same shape redrawn on itself is itself', () => {
    marketHistogramShift(linear, linear).forEach((share, i) =>
      expect(share).toBeCloseTo(marketHistogramShares(linear)[i]!)
    )
  })
  it('a market that moved up leaves the low bins empty', () => {
    const then: MarketHistogram = {
      n: 100,
      log: false,
      edges: [10, 20, 30],
      counts: [50, 50],
      below: 0,
      above: 0,
    }
    const shift = marketHistogramShift(linear, then)
    expect(shift[0]).toBeCloseTo(0)
    expect(shift[1]).toBeCloseTo(0.5)
    expect(shift[2]).toBeCloseTo(0.5)
  })
})

describe('marketPickHistograms', () => {
  const at = (d: string) => ({ ...linear, d })
  it("today's shape and the newest one at least 28 days older", () => {
    const picked = marketPickHistograms(
      [at('2026-08-01'), at('2026-08-20'), at('2026-08-22'), at('2026-09-18')],
      '2026-09-18'
    )
    expect(picked.hist?.d).toBe('2026-09-18')
    expect(picked.histThen?.d).toBe('2026-08-20')
  })
  it('no shape today means none shown, even if yesterday had one', () => {
    expect(marketPickHistograms([at('2026-09-17')], '2026-09-18')).toEqual({
      hist: null,
      histThen: null,
    })
  })
  it('without a month of history there is nothing to compare', () => {
    expect(
      marketPickHistograms([at('2026-09-01'), at('2026-09-18')], '2026-09-18').histThen
    ).toBeNull()
  })
})

describe('marketMoneyShort', () => {
  it('compact axis labels', () => {
    expect(marketMoneyShort(28000, 'UYU')).toBe('$ 28 mil')
    expect(marketMoneyShort(1250000, 'USD')).toBe('US$ 1,25 M')
    expect(marketMoneyShort(950, 'USD')).toBe('US$ 950')
  })
})
