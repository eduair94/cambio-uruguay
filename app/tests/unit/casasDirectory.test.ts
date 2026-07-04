import { describe, expect, it } from 'vitest'
import { buildUsdComparison, type UsdRateRow } from '../../utils/casasDirectory'

const row = (
  origin: string,
  buy: number,
  sell: number,
  type = '',
  isInterBank = false
): UsdRateRow => ({ origin, code: 'USD', type, buy, sell, isInterBank })

describe('buildUsdComparison', () => {
  it('returns empty for empty input', () => {
    expect(buildUsdComparison([])).toEqual([])
  })

  it('excludes interbank rows and non-USD codes', () => {
    const out = buildUsdComparison([
      row('bcu', 40, 40, '', true),
      { origin: 'gales', code: 'EUR', type: '', buy: 45, sell: 47 },
      row('gales', 39.5, 41.5),
    ])
    expect(out.map(e => e.origin)).toEqual(['gales'])
  })

  it('prefers the plain cash row over BILLETE over other types', () => {
    const out = buildUsdComparison([
      row('brou', 38.9, 41.4, 'EBROU'),
      row('brou', 38.4, 41.9, 'BILLETE'),
    ])
    expect(out[0]?.type).toBe('BILLETE')
    const out2 = buildUsdComparison([row('gales', 39, 41, 'BILLETE'), row('gales', 39.2, 41.2, '')])
    expect(out2[0]?.type).toBe('')
  })

  it('skips rows with non-positive prices', () => {
    expect(buildUsdComparison([row('x', 0, 41)])).toEqual([])
  })

  it('treats a null type as the plain cash row', () => {
    const out = buildUsdComparison([
      { origin: 'y', code: 'USD', type: null, buy: 39, sell: 41 },
    ])
    expect(out[0]?.type).toBe('')
  })

  it('computes spread and gap-to-best', () => {
    const out = buildUsdComparison([row('a', 39, 41), row('b', 39.5, 40.5)])
    const a = out.find(e => e.origin === 'a')
    const b = out.find(e => e.origin === 'b')
    // spread = (sell-buy)/midpoint*100
    expect(a?.spreadPct).toBeCloseTo((2 / 40) * 100, 5)
    // best sell = 40.5 (b), best buy = 39.5 (b)
    expect(b?.gapSellPct).toBeCloseTo(0, 5)
    expect(b?.gapBuyPct).toBeCloseTo(0, 5)
    expect(a?.gapSellPct).toBeCloseTo(((41 - 40.5) / 40.5) * 100, 5)
    expect(a?.gapBuyPct).toBeCloseTo(((39.5 - 39) / 39.5) * 100, 5)
  })
})
