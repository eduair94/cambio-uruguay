// app/tests/unit/transferFees.test.ts
import { describe, expect, it } from 'vitest'

import {
  evaluateRoute,
  feeCliffs,
  SCHEDULE_BY_ORIGIN,
  TRANSFER_SCHEDULES,
  TRANSFER_TIPS,
  transferFee,
  TRANSFER_UI_VALUE,
} from '../../utils/transferFees'

/** Pizarra de referencia para los tests: pesos por dólar. */
const RATE = 40

describe('transferFee', () => {
  it('exonera Itaú -> Prex por nombre propio, sin importar el monto', () => {
    for (const amount of [10, 5_000, 100_000]) {
      const fee = transferFee({ from: 'itau', to: 'prex', currency: 'USD', amount, usdRate: RATE })
      expect(fee.amount).toBe(0)
      expect(fee.namedFree).toBe(true)
    }
  })

  it('exonera Itaú -> OCA Blue igual que a Prex', () => {
    const fee = transferFee({
      from: 'itau',
      to: 'oca',
      currency: 'USD',
      amount: 5_000,
      usdRate: RATE,
    })
    expect(fee.amount).toBe(0)
    expect(fee.namedFree).toBe(true)
  })

  it('NO exonera Itaú hacia otra IEDE: cobra 0,85 % topeado en U$S 1', () => {
    const fee = transferFee({
      from: 'itau',
      to: 'mercadopago',
      currency: 'USD',
      amount: 5_000,
      usdRate: RATE,
    })
    expect(fee.namedFree).toBe(false)
    expect(fee.amount).toBe(1) // 0,85 % de 5.000 = 42,5 -> tope U$S 1
  })

  it('Itaú no cobra por debajo de U$S 100 ni de $ 4.000', () => {
    expect(
      transferFee({ from: 'itau', to: 'brou', currency: 'USD', amount: 100, usdRate: RATE }).amount
    ).toBe(0)
    expect(
      transferFee({ from: 'itau', to: 'brou', currency: 'UYU', amount: 4_000, usdRate: RATE })
        .amount
    ).toBe(0)
    expect(
      transferFee({ from: 'itau', to: 'brou', currency: 'UYU', amount: 4_001, usdRate: RATE })
        .amount
    ).toBeGreaterThan(0)
  })

  it('Prex cobra la vuelta a cualquier banco salvo Itaú', () => {
    const aItau = transferFee({
      from: 'prex',
      to: 'itau',
      currency: 'UYU',
      amount: 200_000,
      usdRate: RATE,
    })
    const aBrou = transferFee({
      from: 'prex',
      to: 'brou',
      currency: 'UYU',
      amount: 200_000,
      usdRate: RATE,
    })
    expect(aItau.amount).toBe(0)
    expect(aItau.namedFree).toBe(true)
    expect(aBrou.amount).toBe(45)
    expect(aBrou.currency).toBe('UYU')
  })

  it('Prex cobra en dólares cuando la transferencia es en dólares', () => {
    const fee = transferFee({
      from: 'prex',
      to: 'brou',
      currency: 'USD',
      amount: 1_000,
      usdRate: RATE,
    })
    expect(fee.amount).toBe(1.9)
    expect(fee.currency).toBe('USD')
    expect(fee.uyu).toBeCloseTo(76, 5)
  })

  it('OCA Blue no cobra por transferir a ningún banco', () => {
    expect(
      transferFee({ from: 'oca', to: 'brou', currency: 'UYU', amount: 500_000, usdRate: RATE })
        .amount
    ).toBe(0)
  })

  it('BBVA salta de $ 320 a $ 1.000 al pasar los $ 300.000', () => {
    const abajo = transferFee({
      from: 'bbva',
      to: 'itau',
      currency: 'UYU',
      amount: 300_000,
      usdRate: RATE,
    })
    const arriba = transferFee({
      from: 'bbva',
      to: 'itau',
      currency: 'UYU',
      amount: 300_001,
      usdRate: RATE,
    })
    expect(abajo.amount).toBe(320) // 0,3 % de 300.000 = 900 -> tope $ 320
    expect(arriba.amount).toBe(1_000)
  })

  it('BBVA mide un envío en dólares por su equivalente en pesos', () => {
    // U$S 8.000 a $ 40 son $ 320.000: cae del lado caro aunque el número en
    // dólares sea chico.
    const fee = transferFee({
      from: 'bbva',
      to: 'itau',
      currency: 'USD',
      amount: 8_000,
      usdRate: RATE,
    })
    expect(fee.amount).toBe(1_000)
    expect(fee.currency).toBe('UYU')
  })

  it('BROU topea el porcentaje en 10 UI y recién cobra 70 UI arriba de 340.000 UI', () => {
    const chica = transferFee({
      from: 'brou',
      to: 'itau',
      currency: 'UYU',
      amount: 1_000,
      usdRate: RATE,
    })
    const media = transferFee({
      from: 'brou',
      to: 'itau',
      currency: 'UYU',
      amount: 100_000,
      usdRate: RATE,
    })
    const grande = transferFee({
      from: 'brou',
      to: 'itau',
      currency: 'UYU',
      amount: 3_000_000,
      usdRate: RATE,
    })
    expect(chica.amount).toBe(0) // menor a 350 UI
    expect(media.amount).toBe(Math.round(10 * TRANSFER_UI_VALUE))
    expect(grande.amount).toBe(Math.round(70 * TRANSFER_UI_VALUE))
  })

  it('Santander cobra U$S 1,90 también cuando la transferencia va en pesos', () => {
    const fee = transferFee({
      from: 'santander',
      to: 'itau',
      currency: 'UYU',
      amount: 200_000,
      usdRate: RATE,
    })
    expect(fee.amount).toBe(1.9)
    expect(fee.currency).toBe('USD')
    expect(fee.uyu).toBeCloseTo(76, 5)
  })

  it('Santander salta a U$S 10 arriba de U$S 10.000', () => {
    expect(
      transferFee({ from: 'santander', to: 'itau', currency: 'USD', amount: 10_000, usdRate: RATE })
        .amount
    ).toBe(1.9)
    expect(
      transferFee({ from: 'santander', to: 'itau', currency: 'USD', amount: 10_001, usdRate: RATE })
        .amount
    ).toBe(10)
  })

  it('un origen sin tarifario no inventa una comisión', () => {
    const fee = transferFee({
      from: 'cambio_minas',
      to: 'itau',
      currency: 'USD',
      amount: 1_000,
      usdRate: RATE,
    })
    expect(fee.amount).toBe(0)
    expect(fee.schedule).toBeNull()
  })
})

describe('evaluateRoute', () => {
  it('el pro-tip de Itaú a Prex no paga ninguna de las dos patas', () => {
    const r = evaluateRoute({
      amountUsd: 1_000,
      home: 'itau',
      via: 'prex',
      homeBuy: 39.2,
      viaBuy: 40.1,
      returnLeg: true,
    })
    expect(r.feesUyu).toBe(0)
    expect(r.gainUyu).toBeCloseTo(900, 6)
    expect(r.netUyu).toBeCloseTo(900, 6)
    expect(r.breakevenUsd).toBe(1)
  })

  it('la misma ruta desde BROU sí paga las dos patas', () => {
    const r = evaluateRoute({
      amountUsd: 1_000,
      home: 'brou',
      via: 'prex',
      homeBuy: 39.2,
      viaBuy: 40.1,
      returnLeg: true,
    })
    expect(r.outbound.uyu).toBeGreaterThan(0)
    expect(r.ret?.amount).toBe(45)
    expect(r.netUyu).toBeLessThan(r.gainUyu)
  })

  it('saltear la vuelta elimina una comisión entera', () => {
    const base = {
      amountUsd: 500,
      home: 'bbva',
      via: 'prex',
      homeBuy: 39.2,
      viaBuy: 40.1,
    }
    const conVuelta = evaluateRoute({ ...base, returnLeg: true })
    const sinVuelta = evaluateRoute({ ...base, returnLeg: false })
    expect(sinVuelta.ret).toBeNull()
    expect(sinVuelta.feesUyu).toBeLessThan(conVuelta.feesUyu)
    expect(sinVuelta.netUyu).toBeGreaterThan(conVuelta.netUyu)
  })

  it('una diferencia de pizarra nula o negativa no tiene punto de equilibrio', () => {
    const r = evaluateRoute({
      amountUsd: 1_000,
      home: 'itau',
      via: 'prex',
      homeBuy: 40.5,
      viaBuy: 40.1,
      returnLeg: true,
    })
    expect(r.breakevenUsd).toBeNull()
    expect(r.netUyu).toBeLessThan(0)
  })

  it('avisa cuando el monto pisa el tope diario de carga de Prex', () => {
    const r = evaluateRoute({
      amountUsd: 12_000,
      home: 'itau',
      via: 'prex',
      homeBuy: 39.2,
      viaBuy: 40.1,
      returnLeg: true,
    })
    expect(r.warnings.join(' ')).toMatch(/10\.000/)
  })

  it('avisa que Scotiabank no habilita la instantánea arriba de U$S 500', () => {
    const r = evaluateRoute({
      amountUsd: 1_000,
      home: 'scotiabank',
      via: 'prex',
      homeBuy: 39.2,
      viaBuy: 40.1,
      returnLeg: true,
    })
    expect(r.warnings.join(' ')).toMatch(/No habilita|no habilita/)
  })

  it('sin pizarra del origen no inventa una ganancia', () => {
    const r = evaluateRoute({
      amountUsd: 1_000,
      home: 'itau',
      via: 'prex',
      homeBuy: null,
      viaBuy: 40.1,
      returnLeg: true,
    })
    expect(r.gainUyu).toBe(0)
    expect(r.breakevenUsd).toBeNull()
  })
})

describe('feeCliffs', () => {
  it('encuentra el escalón de BBVA en $ 300.000', () => {
    const cliffs = feeCliffs(RATE)
    const bbva = cliffs.find(c => c.origin === 'bbva')
    expect(bbva).toBeDefined()
    expect(bbva!.below).toBe(300_000)
    expect(bbva!.feeBelow.amount).toBe(320)
    expect(bbva!.feeAbove.amount).toBe(1_000)
  })

  it('sale del tarifario y no de una lista escrita a mano', () => {
    for (const cliff of feeCliffs(RATE)) {
      const schedule = SCHEDULE_BY_ORIGIN[cliff.origin]
      expect(schedule).toBeDefined()
      expect(schedule!.bands.some(b => b.upTo[cliff.currency] === cliff.below)).toBe(true)
    }
  })
})

describe('el dataset', () => {
  it('cada tarifario tiene fuente con URL y fecha de vigencia', () => {
    for (const s of TRANSFER_SCHEDULES) {
      expect(s.source.url).toMatch(/^https:\/\//)
      expect(s.source.effective).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(s.bands.length).toBeGreaterThan(0)
    }
  })

  it('la última banda de cada tarifario no tiene techo', () => {
    for (const s of TRANSFER_SCHEDULES) {
      const last = s.bands[s.bands.length - 1]!
      expect(last.upTo.UYU).toBeNull()
      expect(last.upTo.USD).toBeNull()
    }
  })

  it('cada banda cita textualmente su renglón del tarifario', () => {
    for (const s of TRANSFER_SCHEDULES) {
      for (const b of s.bands) expect(b.quote.length).toBeGreaterThan(20)
    }
  })

  it('cada exoneración por nombre propio apunta a un origen que el sitio cotiza', () => {
    for (const s of TRANSFER_SCHEDULES) {
      for (const target of s.freeTo?.origins ?? []) {
        expect(TRANSFER_SCHEDULES.some(o => o.origin === target)).toBe(true)
      }
    }
  })

  it('cada pro-tip lleva su fuente', () => {
    expect(TRANSFER_TIPS.length).toBeGreaterThanOrEqual(6)
    for (const tip of TRANSFER_TIPS) {
      expect(tip.source.url).toMatch(/^https:\/\//)
      expect(tip.body.length).toBeGreaterThan(60)
    }
  })
})
