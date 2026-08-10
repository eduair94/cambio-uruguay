import { describe, expect, it } from 'vitest'

import {
  BUY_VS_RENT_FAQ,
  FORGOTTEN_COSTS,
  MODEL_LIMITS,
  compareBuyVsRent,
  firstPaymentInterestShare,
  monthlyPayment,
  type BuyVsRentInput,
} from '../../utils/buyVsRent'

const input = (over: Partial<BuyVsRentInput> = {}): BuyVsRentInput => ({
  price: 150_000,
  downPayment: 30_000,
  annualRatePct: 6,
  years: 20,
  monthlyRent: 800,
  monthlyTaxes: 60,
  monthlyCommonFees: 90,
  monthlyMaintenance: 50,
  altReturnPct: 4,
  closingCosts: 9_000,
  ...over,
})

describe('cuota del sistema francés', () => {
  it('calcula la cuota estándar', () => {
    // 120.000 a 6 % anual por 20 años ≈ 859,72 por mes.
    expect(monthlyPayment(120_000, 6, 20)).toBeCloseTo(859.72, 1)
  })

  // El caso que rompe la fórmula si no se contempla: i = 0 divide por cero.
  it('con tasa 0 reparte el capital en cuotas iguales', () => {
    expect(monthlyPayment(120_000, 0, 10)).toBeCloseTo(1000, 2)
  })

  it('a mayor plazo, menor cuota', () => {
    expect(monthlyPayment(120_000, 6, 30)).toBeLessThan(monthlyPayment(120_000, 6, 20))
  })

  it('no rompe con capital o plazo en cero', () => {
    expect(monthlyPayment(0, 6, 20)).toBe(0)
    expect(monthlyPayment(120_000, 6, 0)).toBe(0)
    expect(Number.isFinite(monthlyPayment(-5, -5, -5))).toBe(true)
  })
})

describe('la primera cuota es casi toda interés', () => {
  // Es el dato que explica "pago y la deuda no baja".
  it('en un crédito largo supera el 60 %', () => {
    const pct = firstPaymentInterestShare(120_000, 6, 20)
    expect(pct).toBeGreaterThan(60)
    expect(pct).toBeLessThan(100)
  })

  it('a mayor plazo, mayor proporción de interés en la primera cuota', () => {
    expect(firstPaymentInterestShare(120_000, 6, 30)).toBeGreaterThan(
      firstPaymentInterestShare(120_000, 6, 10)
    )
  })

  it('con tasa 0 no hay interés', () => {
    expect(firstPaymentInterestShare(120_000, 0, 20)).toBe(0)
  })
})

describe('comparación', () => {
  it('financia el precio menos el anticipo', () => {
    const r = compareBuyVsRent(input())
    expect(r.loan).toBe(120_000)
  })

  it('el anticipo no puede superar el precio', () => {
    const r = compareBuyVsRent(input({ downPayment: 999_999 }))
    expect(r.loan).toBe(0)
  })

  // El costo que casi nadie suma y que da vuelta la conclusión.
  it('cuenta el costo de oportunidad del anticipo', () => {
    const r = compareBuyVsRent(input())
    expect(r.opportunityCost).toBeCloseTo((30_000 * 0.04) / 12, 2)
    const sinCosto = compareBuyVsRent(input({ altReturnPct: 0 }))
    expect(sinCosto.buyMonthlyCost).toBeLessThan(r.buyMonthlyCost)
  })

  it('el costo de comprar suma cuota, tributos, comunes, mantenimiento y oportunidad', () => {
    const r = compareBuyVsRent(input())
    expect(r.buyMonthlyCost).toBeCloseTo(r.monthlyPayment + 60 + 90 + 50 + r.opportunityCost, 1)
  })

  it('la brecha positiva significa que comprar sale más caro', () => {
    const caro = compareBuyVsRent(input({ monthlyRent: 100 }))
    expect(caro.monthlyGap).toBeGreaterThan(0)
    // Y entonces no hay plazo que cubra la escrituración por esta vía.
    expect(caro.yearsToCoverClosing).toBeNull()
  })

  it('si comprar sale más barato, dice en cuántos años cubre la escrituración', () => {
    const barato = compareBuyVsRent(input({ monthlyRent: 3000 }))
    expect(barato.monthlyGap).toBeLessThan(0)
    expect(barato.yearsToCoverClosing).not.toBeNull()
    expect(barato.yearsToCoverClosing!).toBeGreaterThan(0)
    // Coherencia: ventaja mensual × meses ≈ escrituración (los años vienen redondeados a 2).
    const cubierto = barato.yearsToCoverClosing! * 12 * -barato.monthlyGap
    expect(cubierto).toBeGreaterThan(9_000 * 0.97)
    expect(cubierto).toBeLessThan(9_000 * 1.03)
  })

  it('más escrituración exige quedarse más tiempo', () => {
    const a = compareBuyVsRent(input({ monthlyRent: 3000, closingCosts: 9_000 }))
    const b = compareBuyVsRent(input({ monthlyRent: 3000, closingCosts: 18_000 }))
    expect(b.yearsToCoverClosing!).toBeGreaterThan(a.yearsToCoverClosing!)
  })

  it('no produce NaN con todo en cero', () => {
    const z = compareBuyVsRent(
      input({
        price: 0,
        downPayment: 0,
        monthlyRent: 0,
        monthlyTaxes: 0,
        monthlyCommonFees: 0,
        monthlyMaintenance: 0,
        closingCosts: 0,
      })
    )
    expect(Number.isFinite(z.buyMonthlyCost)).toBe(true)
    expect(Number.isFinite(z.monthlyGap)).toBe(true)
  })
})

describe('honestidad del modelo', () => {
  // No proyectar apreciación es una decisión, y la página tiene que decirlo.
  it('declara que no proyecta apreciación ni suba del alquiler', () => {
    expect(MODEL_LIMITS).toMatch(/no proyecta/i)
    expect(MODEL_LIMITS).toMatch(/opini[oó]n/i)
  })

  it('los cuatro costos olvidados están explicados', () => {
    expect(FORGOTTEN_COSTS).toHaveLength(4)
    const all = FORGOTTEN_COSTS.map(f => `${f.title} ${f.detail}`).join(' ')
    expect(all).toMatch(/costo de oportunidad/i)
    expect(all).toMatch(/escrituraci[oó]n/i)
    expect(all).toMatch(/intereses/i)
  })

  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(BUY_VS_RENT_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const f of BUY_VS_RENT_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })
})
