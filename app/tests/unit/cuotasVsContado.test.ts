import { describe, expect, it } from 'vitest'
import {
  DEFAULTS,
  compare,
  ivaReduccionFrac,
  monteCarlo,
  pvSeguroSaldo,
  tasaImplicita,
  vanCuotas,
  type CompareInput,
} from '../../utils/cuotasVsContado'

// Antel's own published figures for the iPhone 17 256GB on the 40 GIGAS plan (12 Jul 2026),
// the ones the r/uruguay thread argued about.
const ANTEL_PCE = 46190
const ANTEL_CUOTA = 2389
const CUOTA_CERO = ANTEL_PCE / 24 // a genuine 0% on the cash price: $1.925/mes

const input = (over: Partial<CompareInput> = {}): CompareInput => ({
  ...DEFAULTS,
  precioContado: ANTEL_PCE,
  cuota: ANTEL_CUOTA,
  cuotas: 24,
  ...over,
})

describe('tasaImplicita', () => {
  it("recovers Antel's ~24% TEA from PCE, cuota and plazo", () => {
    const r = tasaImplicita(ANTEL_PCE, ANTEL_CUOTA, 24)
    expect(r.mensual).toBeCloseTo(1.81, 1)
    expect(r.tea).toBeGreaterThan(23.9)
    expect(r.tea).toBeLessThan(24.1)
  })

  it('reports zero for a genuine 0% plan instead of failing', () => {
    // effectiveRate() returns null when you hand back no more than you got, and that is
    // exactly the case this page cares about most.
    expect(tasaImplicita(ANTEL_PCE, CUOTA_CERO, 24)).toEqual({ mensual: 0, tea: 0 })
  })

  it('is not fooled by the flat-markup shortcut at other tenors', () => {
    // PTF/PCE - 1 only coincides with the true rate at ~24 months. At 6 cuotas the same
    // 24,1% markup is a far higher rate.
    const markup = 1.2414
    const seis = tasaImplicita(ANTEL_PCE, (ANTEL_PCE * markup) / 6, 6)
    expect(seis.tea).toBeGreaterThan(60)
  })
})

describe('ivaReduccionFrac', () => {
  it('is 1,64% of the gross price, not 2%', () => {
    // 2 points off a 22% rate: 1,20/1,22 = 0,98361. DGI publishes this as an "alícuota
    // ficta" of 1,64%. Saying "2% cheaper" is the standard mistake.
    expect(ivaReduccionFrac(2, 22)).toBeCloseTo(0.016393, 6)
  })

  it('is zero when there is no reduction', () => {
    expect(ivaReduccionFrac(0, 22)).toBe(0)
  })
})

describe('vanCuotas', () => {
  it('discounts the stream at what the cash could actually earn', () => {
    const van = vanCuotas(ANTEL_CUOTA, 24, 4.5)
    expect(van).toBeGreaterThan(54000)
    expect(van).toBeLessThan(55500)
  })

  it('equals the undiscounted total when the cash earns nothing', () => {
    expect(vanCuotas(1000, 12, 0)).toBeCloseTo(12000, 6)
  })
})

describe('compare — Antel PTF (24% TEA)', () => {
  it('says contado, by a wide margin', () => {
    const r = compare(input())
    expect(r.gana).toBe('contado')
    // You hand over 57.336 nominal for a 46.190 phone.
    expect(r.totalCuotas).toBeCloseTo(57336, 0)
    expect(r.recargoNominal).toBeCloseTo(11146, 0)
    // Even before the extras, financing destroys value.
    expect(r.ventajaBruta).toBeLessThan(-8000)
    expect(r.ventajaNeta).toBeLessThan(-8000)
  })

  it('cannot be rescued by any plausible peso return', () => {
    // The break-even IS the implicit rate. Nothing safe in Uruguay pays 24%.
    const at12 = compare(input({ rendimientoAnualNeto: 12 }))
    expect(at12.gana).toBe('contado')
  })
})

describe('compare — a genuine 0% plan', () => {
  it('shows a real but small gross arbitrage', () => {
    const r = compare(input({ cuota: CUOTA_CERO }))
    expect(r.tasaImplicitaTEA).toBe(0)
    // ~4% of the price. Real money, but not the "mejor jugada" the thread believes.
    expect(r.ventajaBruta).toBeGreaterThan(1800)
    expect(r.ventajaBruta).toBeLessThan(2300)
  })

  it('is wiped out by the seguro and the forfeited debit-IVA reduction', () => {
    const r = compare(input({ cuota: CUOTA_CERO }))
    const conceptos = r.extras.map(e => e.concepto)
    expect(conceptos).toContain('Seguro sobre saldo deudor')
    expect(conceptos).toContain('Rebaja de IVA que perdés al pagar con crédito')

    // The headline finding: once the two forgotten costs are counted, the arbitrage is gone.
    expect(r.ventajaNeta).toBeLessThan(r.ventajaBruta)
    expect(Math.abs(r.ventajaNeta)).toBeLessThan(r.umbralEmpate)
    expect(r.gana).toBe('empate')
  })

  it('does win — modestly — for someone whose card charges no seguro', () => {
    const r = compare(input({ cuota: CUOTA_CERO, seguroSaldoPermil: 0 }))
    expect(r.gana).toBe('cuotas')
    expect(r.ventajaNeta).toBeGreaterThan(1000)
    expect(r.ventajaNeta).toBeLessThan(2500)
  })

  it('cancels the IVA and points terms when contado would also be on a credit card', () => {
    const r = compare(input({ cuota: CUOTA_CERO, contadoMedio: 'credito' }))
    const conceptos = r.extras.map(e => e.concepto)
    expect(conceptos).not.toContain('Rebaja de IVA que perdés al pagar con crédito')
    expect(conceptos).not.toContain('Puntos / cashback')
  })

  it('gives efectivo no IVA reduction and no points — contado is not automatically cheapest', () => {
    // Cash gets nothing: Ley 19.210 rewards débito/dinero electrónico, not billetes.
    const efectivo = compare(input({ cuota: CUOTA_CERO, contadoMedio: 'efectivo' }))
    const debito = compare(input({ cuota: CUOTA_CERO, contadoMedio: 'debito' }))
    expect(efectivo.ventajaNeta).toBeGreaterThan(debito.ventajaNeta)
  })
})

describe('compare — financing on the merchant bill instead of a card', () => {
  it('earns no points and pays no seguro', () => {
    const r = compare(input({ cuota: CUOTA_CERO, financiacion: 'factura' }))
    const conceptos = r.extras.map(e => e.concepto)
    expect(conceptos).not.toContain('Seguro sobre saldo deudor')
    // Points still appear, but as a LOSS: contado on debit earns 0,33%, the bill earns nothing.
    const puntos = r.extras.find(e => e.concepto === 'Puntos / cashback')
    expect(puntos!.monto).toBeLessThan(0)
  })
})

describe('pvSeguroSaldo', () => {
  it('charges on the cuotas still to fall due, not on a constant balance', () => {
    const pv = pvSeguroSaldo(CUOTA_CERO, 24, 3, 4.5)
    expect(pv).toBeGreaterThan(1500)
    expect(pv).toBeLessThan(1800)
  })

  it('is zero when the card does not charge it', () => {
    expect(pvSeguroSaldo(CUOTA_CERO, 24, 0, 4.5)).toBe(0)
  })
})

describe('monteCarlo', () => {
  it('is deterministic for a given seed', () => {
    const a = monteCarlo(input({ cuota: CUOTA_CERO }), { paths: 500, seed: 42 })
    const b = monteCarlo(input({ cuota: CUOTA_CERO }), { paths: 500, seed: 42 })
    expect(a).toEqual(b)
  })

  it('on a 0% plan: wins often, by little — and the losses are the big ones', () => {
    const r = monteCarlo(input({ cuota: CUOTA_CERO, seguroSaldoPermil: 0 }), {
      paths: 3000,
      seed: 7,
    })
    // The rate risk is small, so most paths land in the money...
    expect(r.probGanaCuotas).toBeGreaterThan(70)
    // ...but the mora tail is far fatter than the upside is tall. That asymmetry is the
    // entire argument, and a mean would hide it.
    expect(Math.abs(r.peor)).toBeGreaterThan(r.mejor * 2)
  })

  it('never rescues the 24% plan', () => {
    const r = monteCarlo(input(), { paths: 2000, seed: 7 })
    expect(r.probGanaCuotas).toBe(0)
    expect(r.p95).toBeLessThan(0)
  })

  it('buckets every path into the histogram', () => {
    const r = monteCarlo(input({ cuota: CUOTA_CERO }), { paths: 1000, seed: 3 })
    expect(r.histograma.reduce((s, b) => s + b.n, 0)).toBe(1000)
  })
})
