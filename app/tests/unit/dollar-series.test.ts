import { describe, it, expect } from 'vitest'
import { toSeries } from '../../utils/dollarSeries'

describe('toSeries', () => {
  it('maps evolution points to {date,value} using sell by default', () => {
    const out = toSeries([
      { date: '2026-06-01', buy: 39, sell: 41 },
      { date: '2026-06-02', buy: 39.4, sell: 41.2 },
    ])
    expect(out).toEqual([
      { date: '2026-06-01', value: 41 },
      { date: '2026-06-02', value: 41.2 },
    ])
  })
  it('mid = (buy+sell)/2', () => {
    expect(toSeries([{ date: 'd', buy: 40, sell: 42 }], 'mid')[0]!.value).toBe(41)
  })
  it('drops points without a usable value and sorts by date', () => {
    const out = toSeries([
      { date: '2026-06-03', sell: 41.5 },
      { date: '2026-06-01', sell: undefined as any },
      { date: '2026-06-02', sell: 41.2 },
    ])
    expect(out.map(p => p.date)).toEqual(['2026-06-02', '2026-06-03'])
  })
  it('tolerates undefined input', () => {
    expect(toSeries(undefined)).toEqual([])
  })
})
