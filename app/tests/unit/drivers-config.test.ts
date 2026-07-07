import { describe, it, expect } from 'vitest'
import { DRIVERS, driversFor } from '../../utils/drivers/config'
import { snapshotsToDriverSeries } from '../../utils/drivers/pivot'

describe('driver config', () => {
  it('every driver has a unique key and at least one currency', () => {
    const keys = DRIVERS.map(d => d.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const d of DRIVERS) expect(d.currencies.length).toBeGreaterThan(0)
  })
  it('driversFor(USD) returns only USD-tagged drivers', () => {
    const usd = driversFor('USD')
    expect(usd.length).toBeGreaterThan(0)
    for (const d of usd) expect(d.currencies).toContain('USD')
    expect(usd.map(d => d.key)).toContain('dxy')
  })
})

describe('snapshotsToDriverSeries', () => {
  it('builds one date-sorted series per driver, skipping missing values', () => {
    const defs = [
      { key: 'dxy', label: '', source: 'stooq' as const, symbol: 'dx.f', currencies: ['USD'] },
      { key: 'arBlue', label: '', source: 'argentinadatos' as const, symbol: 'blue', currencies: ['USD'] },
    ]
    const snapshots = [
      { date: '2026-06-02', values: { dxy: 104.4, arBlue: 1200 } },
      { date: '2026-06-01', values: { dxy: 104.0 } }, // arBlue missing this day
    ]
    const out = snapshotsToDriverSeries(snapshots, defs)
    expect(out.find(s => s.key === 'dxy')!.points).toEqual([
      { date: '2026-06-01', value: 104.0 },
      { date: '2026-06-02', value: 104.4 },
    ])
    expect(out.find(s => s.key === 'arBlue')!.points).toEqual([{ date: '2026-06-02', value: 1200 }])
  })
})
