import { describe, expect, it } from 'vitest'
import {
  LIFE_PLAN_DEBT_KINDS,
  lifePlanBestRealNet,
  lifePlanDebtRate,
  lifePlanRealNet,
  lifePlanReturns,
  type LifePlanDebtInput,
  type LifePlanRates,
  LIFE_PLAN_EMERGENCY_MONTHS_DEFAULT,
  buildLifePlan,
} from '../../utils/lifePlan'
import { estimateBudget } from '../../utils/costOfLiving'

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

const budgetFor = (netIncome: number) =>
  estimateBudget({
    netIncome,
    situation: 'solo',
    city: 'montevideo',
    housing: 'alquila',
    children: 0,
  })

const cardDebt = (over: Partial<LifePlanDebtInput> = {}): LifePlanDebtInput => ({
  id: 'tarjeta',
  name: 'Tarjeta',
  balance: 60_000,
  minPayment: 4_000,
  kind: 'sin_descuento',
  ...over,
})

describe('buildLifePlan: guarda 1, sin ingreso suficiente no hay plan', () => {
  it('con deficit devuelve no-alcanza y NO reparte nada', () => {
    const budget = budgetFor(15_000)
    expect(budget.deficit).toBeGreaterThan(0)
    const plan = buildLifePlan(budget, [cardDebt()], {}, RATES)
    expect(plan.verdict).toBe('no-alcanza')
    // Ni un paso de asignacion: repartir un ingreso que no cubre lo esencial es
    // exactamente lo que hace una regla 50/30/20 aplicada sin mirar el piso.
    expect(plan.steps.filter(s => !s.committed && s.monthly > 0)).toEqual([])
  })
})

describe('buildLifePlan: guarda 2, sin evidencia no se afirma un orden', () => {
  it('sin tasas de deuda el paso queda unresolved y se declara', () => {
    const plan = buildLifePlan(
      budgetFor(90_000),
      [cardDebt()],
      {},
      { ...RATES, deudaSinDescuento: null }
    )
    const deuda = plan.steps.find(s => s.id.startsWith('deuda'))
    expect(deuda?.unresolved).toBe(true)
    expect(plan.unresolvedNotes.length).toBeGreaterThan(0)
  })

  it('sin ningun destino con tasa NO hay umbral y no se clasifica la deuda', () => {
    const plan = buildLifePlan(
      budgetFor(90_000),
      [cardDebt()],
      {},
      { ...RATES, plazoFijoBrou: null, fondoPesos: null }
    )
    expect(plan.bestRealNet).toBeNull()
    expect(plan.unresolvedNotes.join(' ')).toMatch(/umbral|comparar/i)
  })
})

describe('buildLifePlan: guarda 3, neverPaysOff se propaga', () => {
  it('si el minimo no cubre el interes lo dice', () => {
    // 80,72 % anual sobre 60.000 son ~4.033 por mes de interes: un minimo de 500
    // no lo cubre. Se pasa extra 0 para aislar la guarda del excedente.
    const plan = buildLifePlan(
      budgetFor(90_000),
      [cardDebt({ minPayment: 500, balance: 5_000_000 })],
      {},
      RATES
    )
    expect(plan.payoff?.neverPaysOff).toBe(true)
    expect(plan.unresolvedNotes.join(' ')).toMatch(/nunca|no se cancela/i)
  })
})

describe('buildLifePlan: el orden', () => {
  const plan = () => buildLifePlan(budgetFor(90_000), [cardDebt()], { savingsNow: 0 }, RATES)

  it('los esenciales van primero y estan comprometidos', () => {
    expect(plan().steps[0].id).toBe('esenciales')
    expect(plan().steps[0].committed).toBe(true)
  })

  it('los minimos son obligacion y van antes del colchon', () => {
    const ids = plan().steps.map(s => s.id)
    expect(ids.indexOf('minimos')).toBeLessThan(ids.indexOf('colchon'))
    expect(plan().steps.find(s => s.id === 'minimos')?.committed).toBe(true)
  })

  it('la deuda cara va antes del colchon, y dice por que con numeros', () => {
    const ids = plan().steps.map(s => s.id)
    expect(ids.indexOf('deuda-cara')).toBeLessThan(ids.indexOf('colchon'))
    const paso = plan().steps.find(s => s.id === 'deuda-cara')
    expect(paso?.evidence).toMatch(/80\.72|80,72/)
    expect(paso?.unresolved).toBe(false)
  })

  it('una deuda MAS BARATA que el colchon va despues del colchon', () => {
    const barata = cardDebt({ kind: 'otro', annualRatePct: 1, id: 'subsidiado' })
    const ids = buildLifePlan(budgetFor(90_000), [barata], {}, RATES).steps.map(s => s.id)
    expect(ids.indexOf('colchon')).toBeLessThan(ids.indexOf('deuda-barata'))
  })

  it('el colchon apunta a 3 meses de esenciales por defecto', () => {
    expect(LIFE_PLAN_EMERGENCY_MONTHS_DEFAULT).toBe(3)
    const p = plan()
    expect(p.emergencyTarget).toBeCloseTo(p.budget.essentials * 3, 5)
  })

  it('lo que ya tenes ahorrado descuenta del colchon', () => {
    const p = buildLifePlan(budgetFor(90_000), [], { savingsNow: 1_000_000 }, RATES)
    expect(p.emergencyGap).toBe(0)
    expect(p.steps.find(s => s.id === 'colchon')?.monthly).toBe(0)
  })

  it('el excedente se reparte DESPUES de los minimos, no antes', () => {
    const p = plan()
    expect(p.pot).toBeCloseTo(p.budget.savingsMax - p.minimums, 5)
  })

  it('sin excedente despues de los minimos lo dice y no ordena destinos', () => {
    const p = buildLifePlan(budgetFor(90_000), [cardDebt({ minPayment: 200_000 })], {}, RATES)
    expect(p.verdict).toBe('sin-excedente')
  })

  it('reparte como maximo el pote, nunca mas', () => {
    const p = plan()
    const repartido = p.steps.filter(s => !s.committed).reduce((a, s) => a + s.monthly, 0)
    expect(repartido).toBeLessThanOrEqual(p.pot + 0.01)
  })

  it('el colchon se puede mover, y queda acotado entre 1 y 12 meses', () => {
    const p = buildLifePlan(budgetFor(90_000), [], { emergencyMonths: 99 }, RATES)
    expect(p.emergencyTarget).toBeCloseTo(p.budget.essentials * 12, 5)
    const q = buildLifePlan(budgetFor(90_000), [], { emergencyMonths: 0 }, RATES)
    expect(q.emergencyTarget).toBeCloseTo(q.budget.essentials * 1, 5)
  })
})
