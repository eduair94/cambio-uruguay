import { describe, it, expect } from 'vitest'
import { applyLiveCaps } from '../../server/utils/debtReliefLive'
import { DEBT_RELIEF_BASELINE } from '../../utils/debtRelief'

describe('applyLiveCaps guardrails', () => {
  it('keeps baseline when the payload is empty', () => {
    const { caps, updated } = applyLiveCaps(DEBT_RELIEF_BASELINE, {})
    expect(updated).toEqual([])
    expect(caps).toEqual(DEBT_RELIEF_BASELINE.usuryCaps)
  })

  it('accepts an in-band tope and marks it updated', () => {
    const { caps, updated } = applyLiveCaps(DEBT_RELIEF_BASELINE, {
      topeConDescuento: 33.5,
      moraConDescuento: 39.0,
    })
    expect(updated).toContain('topeConDescuento')
    expect(caps[0].topeTasa).toBe(33.5)
  })

  it('rejects an absurd out-of-band value and keeps the baseline', () => {
    const { caps, updated } = applyLiveCaps(DEBT_RELIEF_BASELINE, {
      topeConDescuento: 5, // below the plausible band
    })
    expect(updated).not.toContain('topeConDescuento')
    expect(caps[0].topeTasa).toBe(DEBT_RELIEF_BASELINE.usuryCaps[0].topeTasa)
  })

  it('does not mutate the shared DEBT_RELIEF_BASELINE singleton', () => {
    const before = DEBT_RELIEF_BASELINE.usuryCaps[0].topeTasa
    applyLiveCaps(DEBT_RELIEF_BASELINE, { topeConDescuento: 33.5 })
    expect(DEBT_RELIEF_BASELINE.usuryCaps[0].topeTasa).toBe(before)
  })
})
