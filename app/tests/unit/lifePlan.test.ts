import { describe, expect, it } from 'vitest'
import {
  LIFE_PLAN_DEBT_KINDS,
  lifePlanBestRealNet,
  lifePlanDebtRate,
  lifePlanRealNet,
  lifePlanReturns,
  type LifePlanDebtInput,
  type LifePlanRates,
} from '../../utils/lifePlan'

// Medido en produccion el 2026-09-08.
const RATES: LifePlanRates = {
  plazoFijoBrou: 5.5,
  fondoPesos: 7.37,
  inflacion: 4.27,
  deudaSinDescuento: 80.72,
  deudaConDescuento: 21.16,
  asOfRates: '2026-08-31T10:20:02.979Z',
  asOfDebt: '2026-09-01T10:13:02.894Z',
}

describe('lifePlanRealNet', () => {
  it('descuenta IRPF y despues inflacion', () => {
    // 7,37 % bruto en pesos a 12 meses: 5,5 % de IRPF (Titulo 7 art. 37 lit. A)
    // deja 6,97 % neto, y 4,27 % de inflacion lo baja a ~2,59 % real.
    const out = lifePlanRealNet(7.37, 'UYU', 12, 4.27)
    expect(out.netPct).toBeLessThan(7.37)
    expect(out.realPct).not.toBeNull()
    expect(out.realPct!).toBeLessThan(out.netPct)
    expect(out.realPct!).toBeGreaterThan(0)
    expect(out.realPct!).toBeLessThan(3)
  })

  it('sin inflacion publica el nominal neto y no inventa un real', () => {
    const out = lifePlanRealNet(7.37, 'UYU', 12, null)
    expect(out.netPct).toBeLessThan(7.37)
    expect(out.realPct).toBeNull()
  })

  it('un bruto que no es numero no produce un rendimiento', () => {
    expect(lifePlanRealNet(Number.NaN, 'UYU', 12, 4.27).realPct).toBeNull()
    expect(lifePlanRealNet(0, 'UYU', 12, 4.27).realPct).toBeNull()
  })
})

describe('lifePlanReturns', () => {
  it('arma un destino por cada tasa que llego', () => {
    const out = lifePlanReturns(RATES)
    expect(out.length).toBeGreaterThanOrEqual(2)
    out.forEach(r => {
      expect(r.grossPct).toBeGreaterThan(0)
      expect(r.netPct).toBeLessThanOrEqual(r.grossPct)
    })
  })

  it('los ordena de mayor a menor rendimiento real', () => {
    const out = lifePlanReturns(RATES)
    for (let i = 1; i < out.length; i++) {
      const prev = out[i - 1].realPct ?? out[i - 1].netPct
      const cur = out[i].realPct ?? out[i].netPct
      expect(prev).toBeGreaterThanOrEqual(cur)
    }
  })

  it('NO nombra producto ni institucion en la etiqueta', () => {
    // El spec lo prohibe: se ordenan destinos, no vendedores.
    const out = lifePlanReturns(RATES)
    out.forEach(r => {
      expect(r.label.toLowerCase()).not.toMatch(/brou|itau|santander|scotiabank|banco/)
    })
  })

  it('omite los destinos cuya tasa no llego', () => {
    const out = lifePlanReturns({ ...RATES, fondoPesos: null, plazoFijoBrou: null })
    expect(out).toEqual([])
  })
})

describe('lifePlanBestRealNet', () => {
  it('devuelve el mejor rendimiento real y de donde sale', () => {
    const best = lifePlanBestRealNet(lifePlanReturns(RATES))
    expect(best).not.toBeNull()
    expect(best!.pct).toBeGreaterThan(0)
    expect(best!.from).toBeTruthy()
  })

  it('sin destinos no hay mejor rendimiento, y eso NO es cero', () => {
    // Devolver 0 aca haria que toda deuda parezca cara por comparacion con
    // nada, que es afirmar un orden sin evidencia.
    expect(lifePlanBestRealNet([])).toBeNull()
  })
})

describe('lifePlanDebtRate', () => {
  const debt = (over: Partial<LifePlanDebtInput> = {}): LifePlanDebtInput => ({
    id: 'd1',
    name: 'Tarjeta',
    balance: 60_000,
    minPayment: 4_000,
    kind: 'sin_descuento',
    ...over,
  })

  it('pone la tasa MEDIA del segmento del BCU, no el tope', () => {
    // El tope de ese segmento es 122,23 %: es el maximo legal, no lo que se paga.
    const out = lifePlanDebtRate(debt(), RATES)
    expect(out.annualRatePct).toBe(80.72)
    expect(out.measured).toBe(true)
    expect(out.source).toMatch(/BCU|media/i)
  })

  it('usa el segmento con descuento del sueldo cuando corresponde', () => {
    expect(lifePlanDebtRate(debt({ kind: 'con_descuento' }), RATES).annualRatePct).toBe(21.16)
  })

  it('lo que el usuario carga a mano gana sobre la media', () => {
    const out = lifePlanDebtRate(debt({ annualRatePct: 45 }), RATES)
    expect(out.annualRatePct).toBe(45)
    expect(out.measured).toBe(false)
  })

  it('los tipos sin segmento propio NO inventan una tasa', () => {
    // Gastos comunes y deuda con el Estado no tienen segmento en la grilla del
    // BCU. Inventarles una tasa seria peor que pedirla.
    expect(lifePlanDebtRate(debt({ kind: 'gastos_comunes' }), RATES).annualRatePct).toBeNull()
    expect(lifePlanDebtRate(debt({ kind: 'estado' }), RATES).annualRatePct).toBeNull()
  })

  it('sin tasas vivas no hay tasa medida', () => {
    const sinTasas = { ...RATES, deudaSinDescuento: null, deudaConDescuento: null }
    expect(lifePlanDebtRate(debt(), sinTasas).annualRatePct).toBeNull()
  })
})

describe('LIFE_PLAN_DEBT_KINDS', () => {
  it('cubre los cinco tipos y dice cuales tienen tasa medida', () => {
    expect(LIFE_PLAN_DEBT_KINDS).toHaveLength(5)
    const measured = LIFE_PLAN_DEBT_KINDS.filter(k => k.measured).map(k => k.id)
    expect(measured).toContain('sin_descuento')
    expect(measured).toContain('con_descuento')
    expect(measured).not.toContain('gastos_comunes')
  })
})
