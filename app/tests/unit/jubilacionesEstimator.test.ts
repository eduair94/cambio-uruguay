import { describe, expect, it } from 'vitest'
import { jubilacionScenarios, nearMinimum, parseUyuAmount } from '../../utils/jubilacionesEstimator'
import { AUMJUB_IMSN_REFERENCIA } from '../../utils/aumentoJubilaciones'
import { AJUSTE_PASIVIDADES_2026_PCT } from '../../utils/bpsFigures2026'

const PENDIENTE = { pct: null, provisorioPct: null, norma: null, fecha: null, url: null }

describe('parseUyuAmount', () => {
  it('lee los pesos como se escriben en Uruguay', () => {
    expect(parseUyuAmount('25.000,50')).toBe(25000.5)
    expect(parseUyuAmount('25.000')).toBe(25000)
    expect(parseUyuAmount('$ 1.250.000')).toBe(1250000)
    expect(parseUyuAmount('25000')).toBe(25000)
    expect(parseUyuAmount('25000.5')).toBe(25000.5)
    expect(parseUyuAmount(' 32 000 ')).toBe(32000)
  })

  it('devuelve null y nunca NaN para lo que no es un monto', () => {
    for (const bad of ['', ' ', '-100', '0', 'abc', '1.2.3,4.5', '25,000,00', '3000000'])
      expect(parseUyuAmount(bad)).toBeNull()
  })
})

describe('jubilacionScenarios', () => {
  it('pendiente: dos estimaciones, la del IMSN y la de 2026', () => {
    const out = jubilacionScenarios(30000, PENDIENTE)
    expect(out.map(s => s.kind)).toEqual(['referencia', 'como-2026'])
    expect(out[0]!.pct).toBe(AUMJUB_IMSN_REFERENCIA.imsnAcumuladoPct)
    expect(out[1]!.pct).toBe(AJUSTE_PASIVIDADES_2026_PCT)
    expect(out[1]!.result).toBe(Math.round(30000 * (1 + AJUSTE_PASIVIDADES_2026_PCT / 100)))
    expect(out[1]!.increase).toBe(out[1]!.result - 30000)
  })

  it('con cifra oficial: sólo esa', () => {
    expect(jubilacionScenarios(30000, { ...PENDIENTE, provisorioPct: 5.5 })).toEqual([
      { kind: 'provisorio', pct: 5.5, result: 31650, increase: 1650 },
    ])
    expect(
      jubilacionScenarios(30000, { ...PENDIENTE, provisorioPct: 5.5, pct: 6 }).map(s => s.kind)
    ).toEqual(['definitivo'])
  })

  it('avisa cerca de la mínima', () => {
    expect(nearMinimum(21000)).toBe(true)
    expect(nearMinimum(60000)).toBe(false)
  })
})
