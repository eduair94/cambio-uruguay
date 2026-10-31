// app/tests/unit/loanSimulator.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { loanPayment } from '../../utils/calculators'
import { LENDER_TIERLIST, type LenderEntity } from '../../utils/loanTierlist'
import {
  compareLenders,
  frenchInstallment,
  monthlyRateFromTea,
  teaBandLabel,
  teaBandOf,
} from '../../utils/loanSimulator'

/** Un prestamista de prueba: sólo los campos que la cuenta lee. */
function lender(over: Partial<LenderEntity>): LenderEntity {
  return {
    ...LENDER_TIERLIST[0]!,
    id: 'x',
    name: 'X',
    teaPct: 30,
    teaMaxPct: null,
    ivaOnInterest: false,
    maxAmountUyu: null,
    maxTermMonths: null,
    currencies: ['UYU'],
    sourceUrl: 'https://example.uy/prestamos',
    ...over,
  }
}

describe('teaBandOf: un rango se publica como rango', () => {
  it('lee las cuatro formas en que se publica una TEA', () => {
    expect(teaBandOf({ teaPct: 25, teaMaxPct: 36.5 })).toEqual({
      kind: 'rango',
      low: 25,
      high: 36.5,
    })
    expect(teaBandOf({ teaPct: 36.8, teaMaxPct: null })).toEqual({
      kind: 'unica',
      low: 36.8,
      high: 36.8,
    })
    // Un máximo que no supera al mínimo no es un rango: es el mismo criterio de
    // /mejores-prestamos-uruguay (Itaú quedó 39 con un 36 viejo de techo).
    expect(teaBandOf({ teaPct: 39, teaMaxPct: 36 })).toEqual({ kind: 'unica', low: 39, high: 39 })
    expect(teaBandOf({ teaPct: null, teaMaxPct: 129.92 })).toEqual({
      kind: 'tope',
      low: null,
      high: 129.92,
    })
    expect(teaBandOf({ teaPct: null, teaMaxPct: null })).toBeNull()
  })

  it('la etiqueta dice el rango entero, nunca un número solo', () => {
    expect(teaBandLabel({ kind: 'rango', low: 25, high: 36.5 }, true)).toBe('25–36,5 % + IVA')
    expect(teaBandLabel({ kind: 'unica', low: 28, high: 28 }, false)).toBe('28 %')
    expect(teaBandLabel({ kind: 'tope', low: null, high: 31 }, true)).toBe('hasta 31 % + IVA')
  })
})

describe('la cuenta', () => {
  it('la TEA se convierte a tasa mensual efectiva, no se divide entre 12', () => {
    const m = monthlyRateFromTea(26.82418, false)
    expect(m).toBeCloseTo(0.02, 6) // 1,02^12 − 1 = 26,82418 %
    expect(Math.pow(1 + monthlyRateFromTea(40, false), 12) - 1).toBeCloseTo(0.4, 10)
  })

  it('el IVA va sobre el interés: la tasa mensual se multiplica por 1,22', () => {
    expect(monthlyRateFromTea(40, true)).toBeCloseTo(monthlyRateFromTea(40, false) * 1.22, 12)
  })

  it('sistema francés: con tasa mensual nominal reproduce la calculadora de siempre', () => {
    // loanPayment trata la tasa como nominal anual (i = r/12) y redondea a centavos.
    const viejo = loanPayment(200_000, 30, 24)
    const nuevo = frenchInstallment(200_000, 0.3 / 12, 24)
    expect(nuevo.cuota).toBeCloseTo(viejo.monthlyPayment, 2)
    expect(nuevo.total).toBeCloseTo(viejo.totalPaid, 0)
  })

  it('tasa cero y casos vacíos', () => {
    expect(frenchInstallment(120_000, 0, 12)).toEqual({
      cuota: 10_000,
      total: 120_000,
      intereses: 0,
    })
    expect(frenchInstallment(0, 0.02, 12).cuota).toBe(0)
    expect(frenchInstallment(100_000, 0.02, 0).cuota).toBe(0)
  })

  it('un ejemplo a mano: $ 100.000 en 12 cuotas al 2 % mensual', () => {
    const r = frenchInstallment(100_000, 0.02, 12)
    expect(r.cuota).toBeCloseTo(9455.96, 2)
    expect(r.intereses).toBeCloseTo(13471.55, 1)
  })
})

describe('compareLenders', () => {
  it('un rango da dos cuotas, la del piso y la del techo, y ordena por el techo', () => {
    const ancho = lender({ id: 'ancho', name: 'Ancho', teaPct: 14.25, teaMaxPct: 99 })
    const fijo = lender({ id: 'fijo', name: 'Fijo', teaPct: 40, teaMaxPct: null })
    const { quotes } = compareLenders([ancho, fijo], 100_000, 24)
    // Ordenar por el "desde" pondría primero a quien escribe la banda más ancha.
    expect(quotes.map(q => q.id)).toEqual(['fijo', 'ancho'])
    const a = quotes.find(q => q.id === 'ancho')!
    expect(a.band).toEqual({ kind: 'rango', low: 14.25, high: 99 })
    expect(a.low!.cuota).toBeLessThan(a.high.cuota)
    expect(a.low!.cuota).toBeCloseTo(
      frenchInstallment(100_000, monthlyRateFromTea(14.25, false), 24).cuota,
      8
    )
    expect(a.high.cuota).toBeCloseTo(
      frenchInstallment(100_000, monthlyRateFromTea(99, false), 24).cuota,
      8
    )
    const f = quotes.find(q => q.id === 'fijo')!
    expect(f.low!.cuota).toBe(f.high.cuota)
  })

  it('sólo el tope: no inventa un piso', () => {
    const { quotes } = compareLenders(
      [lender({ teaPct: null, teaMaxPct: 31, ivaOnInterest: true })],
      100_000,
      12
    )
    expect(quotes[0]!.low).toBeNull()
    expect(quotes[0]!.high.cuota).toBeCloseTo(
      frenchInstallment(100_000, monthlyRateFromTea(31, true), 12).cuota,
      8
    )
  })

  it('el IVA aparte encarece la cuota de quien lo cobra aparte', () => {
    const sin = lender({ id: 'sin', name: 'Sin', ivaOnInterest: false })
    const con = lender({ id: 'con', name: 'Con', ivaOnInterest: true })
    const { quotes } = compareLenders([con, sin], 100_000, 12)
    expect(quotes.map(q => q.id)).toEqual(['sin', 'con'])
    expect(quotes[1]!.high.intereses).toBeGreaterThan(quotes[0]!.high.intereses)
  })

  it('fuera de monto o plazo, sin tasa o a tasa cero: se nombran con el motivo', () => {
    const r = compareLenders(
      [
        lender({ id: 'chico', name: 'Chico', maxAmountUyu: 50_000 }),
        lender({ id: 'corto', name: 'Corto', maxTermMonths: 12 }),
        lender({ id: 'opaco', name: 'Opaco', teaPct: null, teaMaxPct: null }),
        lender({
          id: 'adelanto',
          name: 'Adelanto',
          teaPct: 0,
          identity: 'Adelanto de sueldo — no es un préstamo',
        }),
        lender({ id: 'dolares', name: 'Dólares', currencies: ['USD'] }),
      ],
      100_000,
      24
    )
    expect(r.quotes).toEqual([])
    expect(r.outOfLimits).toEqual([
      expect.objectContaining({ id: 'chico', reason: 'monto', detail: 'presta hasta $ 50.000' }),
      expect.objectContaining({ id: 'corto', reason: 'plazo', detail: 'presta hasta 12 cuotas' }),
    ])
    expect(r.unpublished.map(u => [u.id, u.reason])).toEqual([
      ['opaco', 'no-publica'],
      ['adelanto', 'sin-interes'],
      ['dolares', 'moneda'],
    ])
    expect(r.unpublished[1]!.detail).toMatch(/no es un préstamo/)
  })

  it('con el catálogo real, nadie desaparece: cada prestamista está en una de las tres listas', () => {
    const r = compareLenders(LENDER_TIERLIST, 200_000, 24)
    const n = r.quotes.length + r.outOfLimits.length + r.unpublished.length
    expect(n).toBe(LENDER_TIERLIST.length)
    expect(r.quotes.length).toBeGreaterThan(5)
    for (const q of r.quotes) {
      expect(q.sourceUrl).toMatch(/^https:\/\//)
      expect(q.high.total).toBeGreaterThan(200_000)
    }
    const totals = r.quotes.map(q => q.high.total)
    expect([...totals].sort((a, b) => a - b)).toEqual(totals)
  })
})

describe('la página', () => {
  const page = readFileSync(
    resolve(__dirname, '../../pages/herramientas/calculadora-prestamo.vue'),
    'utf8'
  )

  it('arma la tabla con el tablero de prestamistas y dice de cuándo son los datos', () => {
    expect(page).toMatch(/compareLenders\(/)
    expect(page).toMatch(/\/api\/loan-tiers/)
    expect(page).toMatch(/mergeLenderFacts\(/)
    expect(page).toMatch(/asOf/)
    expect(page).toMatch(/teaBandLabel\(/)
    expect(page).toMatch(/cu-mobile-cards/)
  })

  it('el contexto de usura se enlaza, no se reescribe', () => {
    expect(page).toContain("localePath('/ley-de-usura-uruguay')")
    expect(page).toContain("localePath('/mejores-prestamos-uruguay')")
  })

  it('no agrega unidades de anuncio', () => {
    expect(page).not.toMatch(/<AdSlot/)
  })
})
