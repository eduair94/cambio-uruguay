import { describe, expect, it } from 'vitest'
import { INSTRUMENTOS, MACRO } from '../../utils/financingData'
import { applyFinancingOverrides, type FinancingResponse } from '../../server/utils/financingMerge'

const res = (figures: FinancingResponse['figures'], updated: string[]): FinancingResponse => ({
  figures,
  updated,
  asOf: updated.length ? '2026-07-20T00:00:00.000Z' : null,
  sources: [],
})

describe('applyFinancingOverrides', () => {
  it('keeps the baseline when nothing was updated', () => {
    const out = applyFinancingOverrides(res({}, []))
    expect(out.tpm).toBe(MACRO.tpm.value)
    expect(out.fondoPesos).toBe(4.5)
    expect(out.asOf).toBeNull()
  })

  it('keeps the baseline when the backend is unreachable (null)', () => {
    const out = applyFinancingOverrides(null)
    expect(out.tpm).toBe(MACRO.tpm.value)
    expect(out.asOf).toBeNull()
  })

  it('applies validated figures the backend marked as updated', () => {
    const out = applyFinancingOverrides(res({ tpm: 6.5, fondoPesos: 5.1 }, ['tpm', 'fondoPesos']))
    expect(out.tpm).toBe(6.5)
    expect(out.fondoPesos).toBe(5.1)
    expect(out.asOf).toBe('2026-07-20T00:00:00.000Z')
  })

  it('recomputes the net rate when a gross rate moves, because IRPF is withheld on the interest', () => {
    const out = applyFinancingOverrides(res({ plazoFijoBrou: 6 }, ['plazoFijoBrou']))
    const pf = out.instrumentos.find(i => i.id === 'brou-pf-ebrou')!
    expect(pf.bruto).toBe(6)
    // 6% gross, 2,5% IRPF on the interest → 5,85% net.
    expect(pf.neto).toBeCloseTo(5.85, 2)
  })

  it('recomputes the fund net rate too', () => {
    const out = applyFinancingOverrides(res({ fondoPesos: 5 }, ['fondoPesos']))
    const fondo = out.instrumentos.find(i => i.id === 'fondo-pesos')!
    expect(fondo.bruto).toBe(5)
    // 5% gross, 0% IRPF (exento) → 5% net.
    expect(fondo.neto).toBeCloseTo(5, 2)
  })

  it('never mutates the shared baseline singletons', () => {
    const brouBefore = INSTRUMENTOS.find(i => i.id === 'brou-pf-ebrou')!.bruto
    applyFinancingOverrides(
      res({ plazoFijoBrou: 8, fondoPesos: 7 }, ['plazoFijoBrou', 'fondoPesos'])
    )
    expect(INSTRUMENTOS.find(i => i.id === 'brou-pf-ebrou')!.bruto).toBe(brouBefore)
    expect(MACRO.tpm.value).toBe(5.75)
  })
})
