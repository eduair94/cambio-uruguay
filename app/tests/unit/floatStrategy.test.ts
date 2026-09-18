import { describe, expect, it } from 'vitest'
import {
  FLOAT_ROUTES,
  MORA_TEA_PCT,
  estimateFloatStrategy,
  floatBreakEvenDays,
  floatDaysPerCycle,
  getFloatRoute,
} from '../../utils/floatStrategy'

// ─────────────────────────────────────────────────────────────────────────────
// Los días de flote
// ─────────────────────────────────────────────────────────────────────────────
//
// La maniobra vive de un solo número: cuántos días pasan entre que gastás y que
// la tarjeta te cobra. No es el plazo del vencimiento: una compra del primer día
// del ciclo flota casi un ciclo más que una del último, y lo que rinde es el
// promedio de todas.

describe('floatStrategy - los días que la plata queda rindiendo', () => {
  it('promedia el ciclo en vez de usar el plazo del vencimiento', () => {
    // Ciclo de 30 días con 10 de gracia: la compra del día 1 flota 39, la del
    // día 30 flota 10, y el promedio es 24,5. Usar 10 subestima 2,5 veces.
    expect(floatDaysPerCycle({ cycleDays: 30, graceDays: 10 })).toBeCloseTo(24.5, 2)
  })

  it('un ciclo más largo o más gracia dan más flote', () => {
    const base = floatDaysPerCycle({ cycleDays: 30, graceDays: 10 })
    expect(floatDaysPerCycle({ cycleDays: 30, graceDays: 20 })).toBeGreaterThan(base)
    expect(floatDaysPerCycle({ cycleDays: 45, graceDays: 10 })).toBeGreaterThan(base)
  })

  it('no devuelve días negativos ni NaN con datos imposibles', () => {
    expect(floatDaysPerCycle({ cycleDays: -5, graceDays: -5 })).toBe(0)
    expect(floatDaysPerCycle({ cycleDays: Number.NaN, graceDays: Number.NaN })).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// La cuenta que da vuelta la maniobra
// ─────────────────────────────────────────────────────────────────────────────
//
// La rebaja de dos puntos de IVA de la Ley 19.210 art. 87 es sólo para débito y
// dinero electrónico: pagar con crédito la resigna. Son 1,64 % del ticket, todos
// los meses, contra un flote que a la TPM rinde una fracción de eso.

describe('floatStrategy - crédito contra débito en una compra común', () => {
  const comun = {
    monthlySpendUyu: 40000,
    regime: 'general' as const,
    cycle: { cycleDays: 30, graceDays: 10 },
    annualRatePct: 5.75,
    feeAnnualPct: 0,
  }

  it('resigna los dos puntos de IVA: 1,64 % del ticket', () => {
    const r = estimateFloatStrategy(comun)
    // 2 / (100 + 22) = 1,639 %, que es la alícuota ficta que publica la DGI.
    expect(r.ivaForgoneUyu).toBeCloseTo(40000 * 0.0163934, 0)
  })

  it('el flote no alcanza ni de cerca, aun sin comisión del fondo', () => {
    const r = estimateFloatStrategy(comun)
    expect(r.floatGainUyu).toBeGreaterThan(0)
    expect(r.floatGainUyu).toBeLessThan(r.ivaForgoneUyu / 3)
    expect(r.netUyu).toBeLessThan(0)
    expect(r.verdict).toBe('no-conviene')
  })

  it('dice cuántos días de flote harían falta para empatar', () => {
    const r = estimateFloatStrategy(comun)
    // A 5,75 % anual hacen falta más de tres meses de flote para igualar 1,64 %.
    expect(r.breakEvenDays).not.toBeNull()
    expect(r.breakEvenDays!).toBeGreaterThan(100)
    expect(r.breakEvenDays!).toBeGreaterThan(r.floatDays * 3)
  })

  it('la comisión del fondo sólo empeora el resultado', () => {
    const conComision = estimateFloatStrategy({ ...comun, feeAnnualPct: 3.66 })
    const sinComision = estimateFloatStrategy(comun)
    expect(conComision.floatGainUyu).toBeLessThan(sinComision.floatGainUyu)
    expect(conComision.netUyu).toBeLessThan(sinComision.netUyu)
  })
})

describe('floatStrategy - gastronomía y turismo, donde la maniobra sí cierra', () => {
  const resto = {
    monthlySpendUyu: 12000,
    regime: 'gastronomia' as const,
    cycle: { cycleDays: 30, graceDays: 10 },
    annualRatePct: 5.75,
    feeAnnualPct: 0,
  }

  it('no resigna nada: la rebaja de nueve puntos también corre con crédito', () => {
    // Ley 17.934 + Decreto 537/005: el régimen nombra la tarjeta de crédito entre
    // los medios habilitados. Es la diferencia con la rebaja general.
    const r = estimateFloatStrategy(resto)
    expect(r.ivaForgoneUyu).toBe(0)
  })

  it('el flote queda como ganancia limpia, aunque sea chica', () => {
    const r = estimateFloatStrategy(resto)
    expect(r.netUyu).toBeGreaterThan(0)
    expect(r.verdict).toBe('conviene')
    // Chica de verdad: sobre $12.000 por mes no llega a cincuenta pesos.
    expect(r.netUyu).toBeLessThan(50)
  })

  it('sin IVA en el medio se comporta igual que gastronomía', () => {
    const sinIva = estimateFloatStrategy({ ...resto, regime: 'sin-iva' })
    expect(sinIva.ivaForgoneUyu).toBe(0)
    expect(sinIva.verdict).toBe('conviene')
  })
})

describe('floatStrategy - lo que se paga por mover la plata', () => {
  it('el costo de la transferencia se descuenta del resultado', () => {
    const base = {
      monthlySpendUyu: 40000,
      regime: 'sin-iva' as const,
      cycle: { cycleDays: 30, graceDays: 10 },
      annualRatePct: 5.75,
      feeAnnualPct: 0,
    }
    const gratis = estimateFloatStrategy(base)
    const conCosto = estimateFloatStrategy({ ...base, transferCostUyu: 45 })
    expect(conCosto.netUyu).toBeCloseTo(gratis.netUyu - 45, 2)
    expect(conCosto.transferCostUyu).toBe(45)
  })

  it('un descuento perdido por no pagar con débito también entra', () => {
    const base = {
      monthlySpendUyu: 40000,
      regime: 'sin-iva' as const,
      cycle: { cycleDays: 30, graceDays: 10 },
      annualRatePct: 5.75,
      feeAnnualPct: 0,
    }
    // Un 20 % de descuento bancario de un día se come toda la maniobra de un año.
    const r = estimateFloatStrategy({ ...base, lostDiscountPct: 20 })
    expect(r.discountForgoneUyu).toBeCloseTo(8000, 2)
    expect(r.verdict).toBe('no-conviene')
  })

  it('clampea entradas imposibles en vez de devolver NaN', () => {
    const r = estimateFloatStrategy({
      monthlySpendUyu: -1,
      regime: 'general',
      cycle: { cycleDays: Number.NaN, graceDays: -3 },
      annualRatePct: Number.NaN,
      feeAnnualPct: -5,
    })
    expect(Number.isFinite(r.netUyu)).toBe(true)
    expect(r.floatGainUyu).toBe(0)
    expect(r.ivaForgoneUyu).toBe(0)
  })
})

describe('floatStrategy - el punto de empate', () => {
  it('devuelve null cuando no hay nada que empatar', () => {
    expect(floatBreakEvenDays(40000, 0, 5.75)).toBeNull()
  })

  it('devuelve null cuando la tasa neta no puede alcanzarlo nunca', () => {
    // Con la comisión comiéndose toda la tasa no hay plazo que empate.
    expect(floatBreakEvenDays(40000, 650, 0)).toBeNull()
    expect(floatBreakEvenDays(40000, 650, -1)).toBeNull()
  })

  it('el plazo que devuelve reproduce el monto resignado', () => {
    const days = floatBreakEvenDays(40000, 655.74, 5.75)
    expect(days).not.toBeNull()
    const earned = 40000 * (Math.pow(1.0575, days! / 365) - 1)
    expect(earned).toBeCloseTo(655.74, 1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Por dónde vuelve la plata
// ─────────────────────────────────────────────────────────────────────────────

describe('floatStrategy - las rutas para pagar la tarjeta', () => {
  it('cada ruta trae costo, plazo y fuente', () => {
    expect(FLOAT_ROUTES.length).toBeGreaterThanOrEqual(3)
    for (const route of FLOAT_ROUTES) {
      expect(route.wallet.trim().length).toBeGreaterThan(2)
      expect(route.destination.trim().length).toBeGreaterThan(2)
      expect(route.settlement.trim().length).toBeGreaterThan(5)
      expect(route.source.url).toMatch(/^https:\/\//)
      expect(Number.isFinite(route.transferCostUyu)).toBe(true)
      expect(route.transferCostUyu).toBeGreaterThanOrEqual(0)
    }
  })

  it('Prex es gratis sólo hacia Itaú, que es el par que el tarifario exonera por nombre', () => {
    const itau = getFloatRoute('prex-itau')
    const otro = getFloatRoute('prex-otro-banco')
    expect(itau!.transferCostUyu).toBe(0)
    expect(otro!.transferCostUyu).toBe(45)
    expect(itau!.quote).toContain('Itaú')
  })

  it('Mercado Pago es gratis a cualquier banco pero no acredita en el día', () => {
    const mp = getFloatRoute('mercadopago')
    expect(mp!.transferCostUyu).toBe(0)
    expect(mp!.settlement).toContain('hábil')
  })

  it('no inventa un plazo de acreditación para Prex, que no lo publica', () => {
    // La cartilla fija el precio de la transferencia y no dice cuándo llega. Un
    // "es instantáneo" sin fuente sería exactamente lo que esta página evita.
    const itau = getFloatRoute('prex-itau')
    expect(itau!.settlement.toLowerCase()).toContain('no publica')
  })

  it('el mínimo de la primera suscripción sólo lo tiene Prex', () => {
    expect(getFloatRoute('prex-itau')!.minFirstUyu).toBe(4000)
    expect(getFloatRoute('mercadopago')!.minFirstUyu).toBeNull()
  })
})

describe('floatStrategy - el riesgo que borra la ganancia', () => {
  it('publica la tasa de mora con la que se compara', () => {
    expect(MORA_TEA_PCT).toBeGreaterThan(50)
  })

  it('un mes de mora cuesta más que un año entero de la maniobra', () => {
    const spend = 40000
    const year =
      12 *
      estimateFloatStrategy({
        monthlySpendUyu: spend,
        regime: 'sin-iva',
        cycle: { cycleDays: 30, graceDays: 10 },
        annualRatePct: 5.75,
        feeAnnualPct: 0,
      }).netUyu
    const oneMonthLate = spend * (Math.pow(1 + MORA_TEA_PCT / 100, 1 / 12) - 1)
    expect(oneMonthLate).toBeGreaterThan(year)
  })
})
