import { describe, expect, it } from 'vitest'
import { applyDebtReliefOverrides, baselineDebtRelief } from '../../server/utils/debtReliefMerge'
import { DEBT_RELIEF_BASELINE } from '../../utils/debtRelief'

// Task 5 is identical to Task 4 (costsMerge) in every respect except cadence and payload: the
// merge is arithmetic-free here (no unit conversion, just "use the live caps if we have them").
describe('applyDebtReliefOverrides', () => {
  it('returns the pure baseline when live is null', () => {
    const out = applyDebtReliefOverrides(null)
    expect(out.usuryCaps).toEqual(DEBT_RELIEF_BASELINE.usuryCaps)
    expect(out.refiRates).toEqual(DEBT_RELIEF_BASELINE.refiRates)
    expect(out.period).toBe(DEBT_RELIEF_BASELINE.period)
    expect(out.asOf).toBeNull()
    expect(out.updated).toEqual([])
  })

  it('returns the pure baseline when updated is empty (never synced)', () => {
    const out = applyDebtReliefOverrides({ usuryCaps: [], asOf: null, updated: [], sources: [] })
    expect(out.usuryCaps).toEqual(DEBT_RELIEF_BASELINE.usuryCaps)
  })

  it('uses the live caps and carries through asOf/updated/sources when present', () => {
    const liveCaps = DEBT_RELIEF_BASELINE.usuryCaps.map(c => ({ ...c, topeTasa: 33.5 }))
    const out = applyDebtReliefOverrides({
      usuryCaps: liveCaps,
      asOf: '2026-07-13T00:00:00.000Z',
      updated: ['topeConDescuento'],
      sources: [{ label: 'BCU', url: 'https://bcu.gub.uy' }],
    })
    expect(out.usuryCaps[0]!.topeTasa).toBe(33.5)
    expect(out.asOf).toBe('2026-07-13T00:00:00.000Z')
    expect(out.updated).toEqual(['topeConDescuento'])
    expect(out.sources).toEqual([{ label: 'BCU', url: 'https://bcu.gub.uy' }])
  })

  it('keeps period and refiRates from the baseline even when live has caps (static page content)', () => {
    const out = applyDebtReliefOverrides({
      usuryCaps: DEBT_RELIEF_BASELINE.usuryCaps,
      asOf: '2026-07-13T00:00:00.000Z',
      updated: ['topeConDescuento'],
      sources: [],
    })
    expect(out.period).toBe(DEBT_RELIEF_BASELINE.period)
    expect(out.refiRates).toEqual(DEBT_RELIEF_BASELINE.refiRates)
  })

  it('never mutates the shared DEBT_RELIEF_BASELINE singleton', () => {
    const before = DEBT_RELIEF_BASELINE.usuryCaps[0]!.topeTasa
    const out = baselineDebtRelief()
    out.usuryCaps[0]!.topeTasa = 999
    expect(DEBT_RELIEF_BASELINE.usuryCaps[0]!.topeTasa).toBe(before)
  })
})
