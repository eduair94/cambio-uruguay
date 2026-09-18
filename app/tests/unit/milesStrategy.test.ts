import { describe, expect, it } from 'vitest'
import {
  ITAU_ANNUAL_FEE_UI,
  MILES_EARN,
  estimateMilesStrategy,
  getMilesEarnRate,
  itauAnnualFeeUyu,
  mileValueFromRedemption,
  milesPerMonth,
} from '../../utils/milesStrategy'

// ─────────────────────────────────────────────────────────────────────────────
// Cuántas millas salen de un mes de gasto
// ─────────────────────────────────────────────────────────────────────────────
//
// La tasa de Volar está en dólares, no en pesos: 1 milla por US$1 con crédito y
// 1 cada US$2 con débito. O sea que cuántas millas junta el mismo sueldo depende
// del dólar del día, y por eso la cotización es un campo y no una constante.

describe('milesStrategy - acumulación', () => {
  it('convierte el gasto en pesos a millas pasando por el dólar', () => {
    // $42.000 a $40 son US$1.050: con crédito, 1.050 millas.
    expect(milesPerMonth({ monthlySpendUyu: 42000, usdRateUyu: 40, card: 'credito' })).toBeCloseTo(
      1050,
      2
    )
  })

  it('el débito acumula exactamente la mitad que el crédito', () => {
    const credito = milesPerMonth({ monthlySpendUyu: 42000, usdRateUyu: 40, card: 'credito' })
    const debito = milesPerMonth({ monthlySpendUyu: 42000, usdRateUyu: 40, card: 'debito' })
    expect(debito).toBeCloseTo(credito / 2, 2)
  })

  it('un dólar más caro da menos millas por el mismo gasto en pesos', () => {
    const barato = milesPerMonth({ monthlySpendUyu: 42000, usdRateUyu: 40, card: 'credito' })
    const caro = milesPerMonth({ monthlySpendUyu: 42000, usdRateUyu: 45, card: 'credito' })
    expect(caro).toBeLessThan(barato)
  })

  it('no divide por cero ni devuelve NaN con un dólar mal tipeado', () => {
    expect(milesPerMonth({ monthlySpendUyu: 42000, usdRateUyu: 0, card: 'credito' })).toBe(0)
    expect(milesPerMonth({ monthlySpendUyu: 42000, usdRateUyu: Number.NaN, card: 'credito' })).toBe(
      0
    )
  })

  it('publica las dos tasas con su fuente, y ninguna inventa el valor de la milla', () => {
    expect(MILES_EARN.length).toBe(2)
    for (const rate of MILES_EARN) {
      expect(rate.usdPerMile).toBeGreaterThan(0)
      expect(rate.quote.trim().length).toBeGreaterThan(20)
      // El dato que Itaú NO publica es justamente el que haría falta para calcular
      // un rendimiento. Si algún día aparece en la ficha, este test lo va a notar.
      expect(rate).not.toHaveProperty('mileValueUyu')
    }
    expect(getMilesEarnRate('debito')!.usdPerMile).toBe(2)
    expect(getMilesEarnRate('credito')!.usdPerMile).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cuánto vale una milla
// ─────────────────────────────────────────────────────────────────────────────
//
// Itaú no lo publica: está en la lista de programas opacos de `financingData.ts`
// justamente por eso. Lo único honesto es que el lector mida el suyo con un canje
// real, que es una consulta al catálogo.

describe('milesStrategy - el valor de la milla se mide, no se inventa', () => {
  it('saca el valor de un canje concreto', () => {
    // Un pasaje de $32.000 que pide 40.000 millas: cada milla vale ochenta centésimos.
    expect(mileValueFromRedemption(32000, 40000)).toBeCloseTo(0.8, 4)
  })

  it('devuelve null cuando falta cualquiera de los dos datos', () => {
    expect(mileValueFromRedemption(32000, 0)).toBeNull()
    expect(mileValueFromRedemption(0, 40000)).toBeNull()
    expect(mileValueFromRedemption(Number.NaN, 40000)).toBeNull()
  })

  it('la anualidad de la tarjeta está en UI y se convierte con el valor publicado', () => {
    expect(ITAU_ANNUAL_FEE_UI).toBe(864)
    // UI 864 al valor que ya publica el sitio da los $ 5.733 de la ficha.
    expect(itauAnnualFeeUyu()).toBeGreaterThan(5700)
    expect(itauAnnualFeeUyu()).toBeLessThan(5770)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// La maniobra con débito: rendimiento, millas y IVA a la vez
// ─────────────────────────────────────────────────────────────────────────────

describe('milesStrategy - débito Volar', () => {
  const base = {
    monthlySpendUyu: 42000,
    card: 'debito' as const,
    usdRateUyu: 40,
    transfersPerMonth: 1,
    annualRatePct: 5.75,
    feeAnnualPct: 0,
    annualCardFeeUyu: 0,
  }

  it('no resigna el IVA: con débito la rebaja de dos puntos sigue corriendo', () => {
    const r = estimateMilesStrategy(base)
    expect(r.ivaForgoneUyu).toBe(0)
  })

  it('lo único que cuesta es el rendimiento de la plata parada en el banco', () => {
    const r = estimateMilesStrategy(base)
    expect(r.lostYieldUyu).toBeGreaterThan(0)
    // Una transferencia por mes deja parada, en promedio, la mitad del gasto.
    expect(r.averageIdleUyu).toBeCloseTo(21000, 0)
  })

  it('mover la plata más seguido baja el costo sin tocar las millas', () => {
    const unaVez = estimateMilesStrategy(base)
    const cuatroVeces = estimateMilesStrategy({ ...base, transfersPerMonth: 4 })
    expect(cuatroVeces.lostYieldUyu).toBeCloseTo(unaVez.lostYieldUyu / 4, 1)
    expect(cuatroVeces.milesPerMonth).toBeCloseTo(unaVez.milesPerMonth, 4)
    expect(cuatroVeces.breakEvenMileValueUyu!).toBeLessThan(unaVez.breakEvenMileValueUyu!)
  })

  it('el umbral que despeja es bajo: centavos por milla', () => {
    const r = estimateMilesStrategy(base)
    expect(r.breakEvenMileValueUyu).not.toBeNull()
    expect(r.breakEvenMileValueUyu!).toBeGreaterThan(0)
    expect(r.breakEvenMileValueUyu!).toBeLessThan(0.3)
  })

  it('con un valor de milla por encima del umbral la maniobra deja plata', () => {
    const r = estimateMilesStrategy({ ...base, mileValueUyu: 0.8 })
    expect(r.netUyu).not.toBeNull()
    expect(r.netUyu!).toBeGreaterThan(0)
    expect(r.verdict).toBe('conviene')
  })

  it('con un valor por debajo del umbral, no', () => {
    const r = estimateMilesStrategy({ ...base, mileValueUyu: 0.05 })
    expect(r.netUyu!).toBeLessThan(0)
    expect(r.verdict).toBe('no-conviene')
  })

  it('sin valor de milla no inventa un resultado: devuelve el umbral y nada más', () => {
    const r = estimateMilesStrategy(base)
    expect(r.netUyu).toBeNull()
    expect(r.verdict).toBe('depende')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// La maniobra con crédito: más millas, pero pagando el IVA y la anualidad
// ─────────────────────────────────────────────────────────────────────────────

describe('milesStrategy - crédito Volar', () => {
  const base = {
    monthlySpendUyu: 42000,
    card: 'credito' as const,
    usdRateUyu: 40,
    transfersPerMonth: 1,
    annualRatePct: 5.75,
    feeAnnualPct: 0,
    annualCardFeeUyu: 5733,
    cycle: { cycleDays: 30, graceDays: 10 },
  }

  it('acumula el doble de millas que el débito', () => {
    const credito = estimateMilesStrategy(base)
    const debito = estimateMilesStrategy({ ...base, card: 'debito' })
    expect(credito.milesPerMonth).toBeCloseTo(debito.milesPerMonth * 2, 2)
  })

  it('resigna los dos puntos de IVA y no deja plata parada en el banco', () => {
    const r = estimateMilesStrategy(base)
    expect(r.ivaForgoneUyu).toBeCloseTo(42000 * 0.0163934, 0)
    // Con crédito no hay que adelantar la plata: se paga al vencimiento.
    expect(r.lostYieldUyu).toBe(0)
    expect(r.floatGainUyu).toBeGreaterThan(0)
  })

  it('la anualidad entra prorrateada por mes, no de una vez', () => {
    const conAnualidad = estimateMilesStrategy(base)
    const sinAnualidad = estimateMilesStrategy({ ...base, annualCardFeeUyu: 0 })
    expect(conAnualidad.cardFeeMonthlyUyu).toBeCloseTo(5733 / 12, 2)
    expect(conAnualidad.breakEvenMileValueUyu!).toBeGreaterThan(sinAnualidad.breakEvenMileValueUyu!)
  })

  it('exige una milla cinco veces más valiosa que el débito', () => {
    const credito = estimateMilesStrategy(base)
    const debito = estimateMilesStrategy({ ...base, card: 'debito', annualCardFeeUyu: 0 })
    expect(credito.breakEvenMileValueUyu!).toBeGreaterThan(debito.breakEvenMileValueUyu! * 4)
    expect(credito.breakEvenMileValueUyu!).toBeGreaterThan(0.8)
  })

  it('devuelve umbral cero cuando lo ganado ya cubre lo resignado sin millas', () => {
    // Sin IVA que resignar y sin anualidad, el flote solo ya alcanza.
    const r = estimateMilesStrategy({
      ...base,
      annualCardFeeUyu: 0,
      regimeKeepsIva: true,
    })
    expect(r.ivaForgoneUyu).toBe(0)
    expect(r.breakEvenMileValueUyu).toBe(0)
  })
})

describe('milesStrategy - entradas imposibles', () => {
  it('clampea en vez de devolver NaN', () => {
    const r = estimateMilesStrategy({
      monthlySpendUyu: -1,
      card: 'debito',
      usdRateUyu: -5,
      transfersPerMonth: 0,
      annualRatePct: Number.NaN,
      feeAnnualPct: -2,
      annualCardFeeUyu: -100,
    })
    expect(Number.isFinite(r.lostYieldUyu)).toBe(true)
    expect(r.milesPerMonth).toBe(0)
    expect(r.breakEvenMileValueUyu).toBeNull()
  })

  it('sin millas no hay umbral que despejar', () => {
    const r = estimateMilesStrategy({
      monthlySpendUyu: 0,
      card: 'debito',
      usdRateUyu: 40,
      transfersPerMonth: 1,
      annualRatePct: 5.75,
      feeAnnualPct: 0,
      annualCardFeeUyu: 0,
    })
    expect(r.breakEvenMileValueUyu).toBeNull()
    expect(r.verdict).toBe('depende')
  })
})
