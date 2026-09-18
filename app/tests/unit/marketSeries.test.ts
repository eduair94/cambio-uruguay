import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  carModelOfKey,
  carSeriesKey,
  housingSeriesKey,
  housingSiblingKeys,
  isMarketSeriesKey,
  marketChart,
  marketDay,
  marketPct,
  marketSeriesFaq,
  marketWindowState,
  MARKET_PAIR_MINIMUM,
  MARKET_SAMPLE_MINIMUM,
  MARKET_SERIES_KEY_PATTERN,
} from '../../utils/marketSeries'

// Root files read as TEXT: an app test never imports the backend (the app's CI job has no root install).
const root = (file: string) =>
  readFileSync(join(__dirname, '..', '..', '..', 'classes', 'marketseries', file), 'utf8')

describe('parity with classes/marketseries', () => {
  it('same minimums', () => {
    expect(root('stats.ts')).toContain(`MARKET_SAMPLE_MINIMUM = ${MARKET_SAMPLE_MINIMUM};`)
    expect(root('stats.ts')).toContain(`MARKET_PAIR_MINIMUM = ${MARKET_PAIR_MINIMUM};`)
  })
  it('same key pattern', () => {
    expect(root('cohorts.ts')).toContain(MARKET_SERIES_KEY_PATTERN.source)
  })
})

describe('keys', () => {
  it('builds the keys the backend writes', () => {
    expect(housingSeriesKey('alquiler', 'UYU', 'apartamento', '2', 'b:montevideo:pocitos')).toBe(
      'alquiler|UYU|apartamento|2|b:montevideo:pocitos'
    )
    expect(carSeriesKey('toyota-hilux', 2018)).toBe('autos|USD|m:toyota-hilux|y:2018')
    expect(carSeriesKey('toyota-hilux')).toBe('autos|USD|m:toyota-hilux')
    expect(carSeriesKey(null)).toBe('autos|USD|all')
  })
  it('validates before touching Mongo', () => {
    expect(isMarketSeriesKey('venta|USD|todas|any|uy')).toBe(true)
    expect(isMarketSeriesKey('venta|EUR|todas|any|uy')).toBe(false)
    expect(isMarketSeriesKey({ $ne: null })).toBe(false)
    expect(isMarketSeriesKey('autos|USD|m:.*')).toBe(false)
    expect(isMarketSeriesKey(['venta|USD|todas|any|uy'])).toBe(false)
  })
  it('siblings: every type x bedrooms of the same place and currency', () => {
    const keys = housingSiblingKeys('venta|USD|casa|3|d:canelones')
    expect(keys).toHaveLength(18)
    expect(keys).toContain('venta|USD|todas|any|d:canelones')
    expect(keys.every(isMarketSeriesKey)).toBe(true)
    expect(housingSiblingKeys('autos|USD|all')).toEqual([])
  })
  it('the model of a car key', () => {
    expect(carModelOfKey('autos|USD|m:toyota-hilux|y:2018')).toBe('toyota-hilux')
    expect(carModelOfKey('autos|USD|m:toyota-hilux')).toBe('toyota-hilux')
    expect(carModelOfKey('autos|USD|all')).toBeNull()
  })
})

describe('formatting', () => {
  it('signed percentages in Uruguayan Spanish', () => {
    expect(marketPct(-0.0123)).toBe('-1,2 %')
    expect(marketPct(0.0081)).toBe('+0,8 %')
    expect(marketPct(0)).toBe('0,0 %')
    expect(marketPct(-0.0001)).toBe('0,0 %')
    expect(marketPct(null)).toBe('—')
  })
  it('days without time zones', () => {
    expect(marketDay('2026-09-08')).toBe('8/9/2026')
  })
})

describe('marketWindowState', () => {
  const stats = { n: 12, chg: -0.02, down: 5, up: 1, same: 6, outliers: 0 }
  it('waiting until the log is old enough', () => {
    expect(marketWindowState(null, 30, '2026-09-18', '2026-09-20')).toEqual({
      kind: 'waiting',
      from: '2026-10-18',
    })
  })
  it('thin, then ok', () => {
    expect(marketWindowState({ ...stats, n: 3, chg: null }, 30, '2026-08-01', '2026-09-20')).toEqual({
      kind: 'thin',
      n: 3,
    })
    expect(marketWindowState(null, 30, '2026-08-01', '2026-09-20')).toEqual({ kind: 'thin', n: 0 })
    expect(marketWindowState(stats, 30, '2026-08-01', '2026-09-20')).toEqual({ kind: 'ok', stats })
  })
})

describe('marketChart', () => {
  it('labels and the three lines, with gaps kept as null', () => {
    const chart = marketChart([
      { d: '2026-09-18', n: 8, p25: 1, med: 2, p75: 3, m2: null, w7: null, w30: null, w90: null },
      { d: '2026-09-19', n: 5, p25: null, med: null, p75: null, m2: null, w7: null, w30: null, w90: null },
    ])
    expect(chart.labels).toEqual(['18/9', '19/9'])
    expect(chart.med).toEqual([2, null])
    expect(chart.p25).toEqual([1, null])
    expect(chart.p75).toEqual([3, null])
  })
})

describe('marketSeriesFaq', () => {
  it('unique ids per market and plain-text answers', () => {
    const ids = ['alquiler', 'venta', 'autos'].flatMap(v =>
      marketSeriesFaq(v as 'alquiler').map(item => item.id)
    )
    expect(new Set(ids).size).toBe(ids.length)
    for (const item of marketSeriesFaq('autos')) expect(item.answer).not.toMatch(/<[a-z]/i)
  })
})
