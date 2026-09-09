# Plan de vida por ingreso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una cascada que dice en qué orden va cada peso del ingreso, donde cada paso se justifica con una tasa pública y fechada, y que se niega a ordenar cuando la resta no alcanza para decidir.

**Architecture:** Un módulo puro (`app/utils/lifePlan.ts`) que COMPONE motores existentes —`estimateBudget` (costOfLiving), `payoffPlan` (debt), `netOfIrpf` (investments)— más un sobre de tasas vivas servido por una ruta nueva del app que junta `/financing-rates` y `/debt-relief` del backend. Sin backend nuevo: C no ingiere nada, sólo ordena lo que ya se mide.

**Tech Stack:** TypeScript, Nuxt 4, Vuetify 4.1.5, vitest (app).

**Spec:** `docs/superpowers/specs/2026-09-08-plan-de-vida-design.md`

## Global Constraints

- **El pote que se reparte es `budget.savingsMax`** (ingreso − esenciales), NO `savingsSuggested`.
- **Los pagos mínimos son obligación, no decisión**: salen antes del colchón y de todo destino, y se muestran como línea comprometida. La cascada reparte lo que queda después de los mínimos.
- **El umbral que separa deuda cara de barata SE CALCULA** contra `bestRealNet`; nunca un número escrito a mano.
- **Colchón por defecto 3 meses**, ajustable de 1 a 12.
- Rendimiento real neto: `(1 + netOfIrpf(gross, moneda, plazo)/100) / (1 + inflacion/100) − 1`. Sin inflación viva se publica el **nominal neto** y se declara.
- **Cuatro guardas, ninguna opcional:** (1) `budget.deficit > 0` ⇒ `verdict: 'no-alcanza'`, sin asignación inventada, con punteros a `/vivir-con-25000-pesos-uruguay` y `/asignacion-familiar-uruguay`; (2) un paso sin evidencia va con `unresolved: true` y el plan declara qué comparación no pudo hacer; (3) `payoffPlan.neverPaysOff` se propaga; (4) nada se proyecta más allá de los meses que salen de los saldos cargados.
- **No se nombra producto ni institución** en los destinos del excedente.
- Tasas de deuda por tipo: **la media del segmento del BCU, no el tope**, con fecha visible y campo para corregir.
- `app/utils/` es namespace plano de auto-imports: todo lo exportado lleva prefijo `lifePlan`/`LIFE_PLAN` salvo los tipos del dominio.
- Escribir archivos con LF. `io.open(path,"w")` de Python en esta caja produce CRLF y rompe el lint del app.

---

### Task 1: Rendimiento real neto y el umbral

**Files:**
- Create: `app/utils/lifePlan.ts`
- Test: `app/tests/unit/lifePlan.test.ts`

**Interfaces:**
- Consumes: `netOfIrpf(grossPct, currency, months)` y `type DepositCurrency = 'UYU' | 'UI' | 'USD'` de `~/utils/investments`.
- Produces:
  - `interface LifePlanRates { plazoFijoBrou: number | null; fondoPesos: number | null; inflacion: number | null; deudaSinDescuento: number | null; deudaConDescuento: number | null; asOfRates: string | null; asOfDebt: string | null }`
  - `interface LifePlanReturn { id: string; label: string; grossPct: number; netPct: number; realPct: number | null; currency: DepositCurrency; months: number; note: string }`
  - `function lifePlanRealNet(grossPct: number, currency: DepositCurrency, months: number, inflacionPct: number | null): { netPct: number; realPct: number | null }`
  - `function lifePlanReturns(rates: LifePlanRates): LifePlanReturn[]`
  - `function lifePlanBestRealNet(returns: LifePlanReturn[]): { pct: number; from: string } | null`

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/unit/lifePlan.test.ts
import { describe, expect, it } from 'vitest'
import {
  lifePlanBestRealNet,
  lifePlanRealNet,
  lifePlanReturns,
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
    // 7,37 % bruto en pesos a 12 meses: IRPF del literal A y luego inflacion.
    const out = lifePlanRealNet(7.37, 'UYU', 12, 4.27)
    expect(out.netPct).toBeLessThan(7.37)
    expect(out.realPct).not.toBeNull()
    expect(out.realPct!).toBeLessThan(out.netPct)
    // Con 4,27 % de inflacion el real queda chico pero positivo.
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/unit/lifePlan.test.ts`
Expected: FAIL — `Cannot find module '../../utils/lifePlan'`

- [ ] **Step 3: Write minimal implementation**

```ts
// app/utils/lifePlan.ts
// El plan de vida: en qué orden va cada peso.
//
// Este módulo NO mide nada y no tiene motor propio. Compone tres que ya existen
// y están probados —`estimateBudget` (costOfLiving), `payoffPlan` (debt) y
// `netOfIrpf` (investments)— y agrega lo único que faltaba: el orden.
//
// Y el orden sólo se afirma donde hay una resta que lo justifique. Medido el
// 2026-09-08: la deuda de consumo sin descuento del sueldo tiene 80,72 % de tasa
// media contra ~3 % real de la mejor colocación accesible después de IRPF e
// inflación. Eso no es una opinión sobre el riesgo, es una diferencia entre dos
// números públicos y fechados. Donde la resta no alcanza para decidir, este
// módulo NO ordena: marca el paso como `unresolved` y dice qué le faltó.
import { netOfIrpf, type DepositCurrency } from '~/utils/investments'

export interface LifePlanRates {
  /** Plazo fijo en pesos, % nominal anual. */
  plazoFijoBrou: number | null
  /** Fondo en pesos, % nominal anual. */
  fondoPesos: number | null
  /** IPC interanual, en puntos porcentuales. */
  inflacion: number | null
  /** Tasa MEDIA del segmento de consumo sin autorización de descuento. */
  deudaSinDescuento: number | null
  /** Tasa MEDIA del segmento con autorización de descuento del sueldo. */
  deudaConDescuento: number | null
  asOfRates: string | null
  asOfDebt: string | null
}

export interface LifePlanReturn {
  id: string
  /** Sin nombre de producto ni de institución: se ordenan destinos. */
  label: string
  grossPct: number
  netPct: number
  /** Neto de IRPF y de inflación. null cuando no hubo inflación con la que descontar. */
  realPct: number | null
  currency: DepositCurrency
  months: number
  note: string
}

/** Neto de IRPF y, si hay inflación, real. */
export function lifePlanRealNet(
  grossPct: number,
  currency: DepositCurrency,
  months: number,
  inflacionPct: number | null
): { netPct: number; realPct: number | null } {
  if (!Number.isFinite(grossPct) || grossPct <= 0) return { netPct: 0, realPct: null }
  const { netPct } = netOfIrpf(grossPct, currency, months)
  if (typeof inflacionPct !== 'number' || !Number.isFinite(inflacionPct)) {
    return { netPct, realPct: null }
  }
  const realPct = ((1 + netPct / 100) / (1 + inflacionPct / 100) - 1) * 100
  return { netPct, realPct }
}

interface ReturnSeed {
  id: string
  label: string
  gross: (rates: LifePlanRates) => number | null
  currency: DepositCurrency
  months: number
  note: string
}

const RETURN_SEEDS: readonly ReturnSeed[] = Object.freeze([
  Object.freeze({
    id: 'plazo-fijo-pesos',
    label: 'Depósito a plazo en pesos',
    gross: (r: LifePlanRates) => r.plazoFijoBrou,
    currency: 'UYU' as DepositCurrency,
    months: 12,
    note: 'Tasa de referencia de plazo fijo en pesos, neta del IRPF que corresponde al plazo.',
  }),
  Object.freeze({
    id: 'fondo-pesos',
    label: 'Fondo de inversión en pesos',
    gross: (r: LifePlanRates) => r.fondoPesos,
    currency: 'UYU' as DepositCurrency,
    months: 12,
    note: 'Rendimiento de referencia de fondos en pesos, neto del IRPF que corresponde al plazo.',
  }),
])

/** Un destino por cada tasa que llegó. Los que no llegaron no se inventan. */
export function lifePlanReturns(rates: LifePlanRates): LifePlanReturn[] {
  const out: LifePlanReturn[] = []
  for (const seed of RETURN_SEEDS) {
    const grossPct = seed.gross(rates)
    if (typeof grossPct !== 'number' || !Number.isFinite(grossPct) || grossPct <= 0) continue
    const { netPct, realPct } = lifePlanRealNet(grossPct, seed.currency, seed.months, rates.inflacion)
    out.push({
      id: seed.id,
      label: seed.label,
      grossPct,
      netPct,
      realPct,
      currency: seed.currency,
      months: seed.months,
      note: seed.note,
    })
  }
  return out.sort((a, b) => (b.realPct ?? b.netPct) - (a.realPct ?? a.netPct))
}

/**
 * El mejor rendimiento real neto disponible, que es el umbral contra el que se
 * mide si una deuda es cara.
 *
 * Devuelve null y NO cero cuando no hay ningún destino con tasa: cero haría que
 * toda deuda pareciera cara por comparación contra nada, que es exactamente
 * afirmar un orden sin evidencia.
 */
export function lifePlanBestRealNet(
  returns: LifePlanReturn[]
): { pct: number; from: string } | null {
  const usable = returns.filter(r => r.realPct !== null || r.netPct > 0)
  if (!usable.length) return null
  const best = usable.reduce((a, b) => ((b.realPct ?? b.netPct) > (a.realPct ?? a.netPct) ? b : a))
  return { pct: best.realPct ?? best.netPct, from: best.label }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run tests/unit/lifePlan.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/utils/lifePlan.ts app/tests/unit/lifePlan.test.ts
git commit -m "feat(plan-de-vida): rendimiento real neto y el umbral que decide"
```

---

### Task 2: Tipo de deuda → tasa medida

**Files:**
- Modify: `app/utils/lifePlan.ts`
- Test: `app/tests/unit/lifePlan.test.ts`

**Interfaces:**
- Consumes: `LifePlanRates` de Task 1.
- Produces:
  - `type LifePlanDebtKind = 'sin_descuento' | 'con_descuento' | 'gastos_comunes' | 'estado' | 'otro'`
  - `interface LifePlanDebtKindMeta { id: LifePlanDebtKind; label: string; help: string; measured: boolean }`
  - `const LIFE_PLAN_DEBT_KINDS: readonly LifePlanDebtKindMeta[]`
  - `interface LifePlanDebtInput { id: string; name: string; balance: number; minPayment: number; kind: LifePlanDebtKind; annualRatePct?: number | null }`
  - `function lifePlanDebtRate(input: LifePlanDebtInput, rates: LifePlanRates): { annualRatePct: number | null; source: string; measured: boolean }`

- [ ] **Step 1: Write the failing test**

```ts
// añadir a app/tests/unit/lifePlan.test.ts
describe('lifePlanDebtRate', () => {
  const debt = (over: Partial<LifePlanDebtInput> = {}): LifePlanDebtInput => ({
    id: 'd1',
    name: 'Tarjeta',
    balance: 50_000,
    minPayment: 3_000,
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
```

Añadir a los imports del archivo de test:

```ts
import {
  LIFE_PLAN_DEBT_KINDS,
  lifePlanDebtRate,
  type LifePlanDebtInput,
} from '../../utils/lifePlan'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/unit/lifePlan.test.ts`
Expected: FAIL — `lifePlanDebtRate is not a function`

- [ ] **Step 3: Write minimal implementation**

```ts
// añadir a app/utils/lifePlan.ts

export type LifePlanDebtKind =
  | 'sin_descuento'
  | 'con_descuento'
  | 'gastos_comunes'
  | 'estado'
  | 'otro'

export interface LifePlanDebtKindMeta {
  id: LifePlanDebtKind
  label: string
  help: string
  /** Si el BCU publica una tasa media para este segmento. */
  measured: boolean
}

/**
 * Los tipos de deuda, y de dónde sale la tasa de cada uno.
 *
 * Casi nadie sabe su TEA, así que se pregunta el TIPO y se completa con la tasa
 * MEDIA del segmento del BCU. La media y no el tope: el tope es el máximo legal
 * que la ley permite cobrar, no lo que la gente paga.
 *
 * Dos tipos no tienen segmento en la grilla y por eso no se les inventa una
 * tasa: pedirla es peor experiencia y mejor dato.
 */
export const LIFE_PLAN_DEBT_KINDS: readonly LifePlanDebtKindMeta[] = Object.freeze([
  Object.freeze({
    id: 'sin_descuento' as LifePlanDebtKind,
    label: 'Tarjeta o préstamo sin descuento del sueldo',
    help: 'Se completa con la tasa media del segmento de consumo sin autorización de descuento.',
    measured: true,
  }),
  Object.freeze({
    id: 'con_descuento' as LifePlanDebtKind,
    label: 'Préstamo con descuento del sueldo',
    help: 'Se completa con la tasa media del segmento con autorización de descuento.',
    measured: true,
  }),
  Object.freeze({
    id: 'gastos_comunes' as LifePlanDebtKind,
    label: 'Gastos comunes',
    help: 'No tiene segmento propio en la grilla del BCU: cargá la tasa que te cobran.',
    measured: false,
  }),
  Object.freeze({
    id: 'estado' as LifePlanDebtKind,
    label: 'Deuda con el Estado',
    help: 'No tiene segmento propio: cargá la tasa. Puede además estar prescripta.',
    measured: false,
  }),
  Object.freeze({
    id: 'otro' as LifePlanDebtKind,
    label: 'Otra',
    help: 'Cargá la tasa efectiva anual si la conocés.',
    measured: false,
  }),
])

export interface LifePlanDebtInput {
  id: string
  name: string
  /** Saldo en UYU. */
  balance: number
  /** Pago mínimo mensual en UYU. */
  minPayment: number
  kind: LifePlanDebtKind
  /** Tasa efectiva anual cargada a mano. Gana sobre la media del segmento. */
  annualRatePct?: number | null
}

/** La tasa de una deuda, y de dónde salió. */
export function lifePlanDebtRate(
  input: LifePlanDebtInput,
  rates: LifePlanRates
): { annualRatePct: number | null; source: string; measured: boolean } {
  const manual = input.annualRatePct
  if (typeof manual === 'number' && Number.isFinite(manual) && manual > 0) {
    return { annualRatePct: manual, source: 'tasa cargada por vos', measured: false }
  }
  if (input.kind === 'sin_descuento' && typeof rates.deudaSinDescuento === 'number') {
    return {
      annualRatePct: rates.deudaSinDescuento,
      source: 'tasa media del BCU, consumo sin autorización de descuento',
      measured: true,
    }
  }
  if (input.kind === 'con_descuento' && typeof rates.deudaConDescuento === 'number') {
    return {
      annualRatePct: rates.deudaConDescuento,
      source: 'tasa media del BCU, consumo con autorización de descuento',
      measured: true,
    }
  }
  return { annualRatePct: null, source: 'sin tasa: cargala para poder ordenarla', measured: false }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run tests/unit/lifePlan.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/utils/lifePlan.ts app/tests/unit/lifePlan.test.ts
git commit -m "feat(plan-de-vida): tipo de deuda a tasa media del BCU, no al tope"
```

---

### Task 3: La cascada y las cuatro guardas

**Files:**
- Modify: `app/utils/lifePlan.ts`
- Test: `app/tests/unit/lifePlan.test.ts`

**Interfaces:**
- Consumes: todo lo de Tasks 1-2; `estimateBudget`, `type BudgetResult`, `type BudgetInputs` de `~/utils/costOfLiving`; `payoffPlan`, `type Debt`, `type PayoffPlan` de `~/utils/debt`.
- Produces:
  - `type LifePlanVerdict = 'no-alcanza' | 'sin-excedente' | 'ordenado'`
  - `interface LifePlanStep { id: string; label: string; monthly: number; reason: string; evidence: string | null; unresolved: boolean; committed: boolean }`
  - `interface LifePlanResult { verdict: LifePlanVerdict; budget: BudgetResult; pot: number; minimums: number; steps: LifePlanStep[]; payoff: PayoffPlan | null; bestRealNet: { pct: number; from: string } | null; returns: LifePlanReturn[]; unresolvedNotes: string[]; emergencyTarget: number; emergencyGap: number }`
  - `const LIFE_PLAN_EMERGENCY_MONTHS_DEFAULT = 3`
  - `interface LifePlanOptions { emergencyMonths?: number; savingsNow?: number }`
  - `function buildLifePlan(budget: BudgetResult, debts: readonly LifePlanDebtInput[], options: LifePlanOptions, rates: LifePlanRates): LifePlanResult`

- [ ] **Step 1: Write the failing test**

```ts
// añadir a app/tests/unit/lifePlan.test.ts
import { estimateBudget } from '../../utils/costOfLiving'
import { buildLifePlan, LIFE_PLAN_EMERGENCY_MONTHS_DEFAULT } from '../../utils/lifePlan'

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
    // no lo cubre.
    const plan = buildLifePlan(
      budgetFor(90_000),
      [cardDebt({ minPayment: 500 })],
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
    const p = buildLifePlan(
      budgetFor(90_000),
      [],
      { savingsNow: 1_000_000 },
      RATES
    )
    expect(p.emergencyGap).toBe(0)
    expect(p.steps.find(s => s.id === 'colchon')?.monthly).toBe(0)
  })

  it('el excedente se reparte DESPUES de los minimos, no antes', () => {
    const p = plan()
    expect(p.pot).toBeCloseTo(p.budget.savingsMax - p.minimums, 5)
  })

  it('sin excedente despues de los minimos lo dice y no ordena destinos', () => {
    const p = buildLifePlan(
      budgetFor(90_000),
      [cardDebt({ minPayment: 200_000 })],
      {},
      RATES
    )
    expect(p.verdict).toBe('sin-excedente')
  })

  it('reparte como maximo el pote, nunca mas', () => {
    const p = plan()
    const repartido = p.steps.filter(s => !s.committed).reduce((a, s) => a + s.monthly, 0)
    expect(repartido).toBeLessThanOrEqual(p.pot + 0.01)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/unit/lifePlan.test.ts`
Expected: FAIL — `buildLifePlan is not a function`

- [ ] **Step 3: Write minimal implementation**

```ts
// añadir a app/utils/lifePlan.ts
import { type BudgetResult } from '~/utils/costOfLiving'
import { payoffPlan, type Debt, type PayoffPlan } from '~/utils/debt'

export type LifePlanVerdict = 'no-alcanza' | 'sin-excedente' | 'ordenado'

export interface LifePlanStep {
  id: string
  label: string
  monthly: number
  reason: string
  /** La cifra que justifica la posición del paso, con su fuente. null si no llegó. */
  evidence: string | null
  /** true cuando el paso no se puede justificar con lo que hay. */
  unresolved: boolean
  /** true cuando el monto es obligación y no decisión (esenciales, mínimos). */
  committed: boolean
}

export interface LifePlanOptions {
  emergencyMonths?: number
  savingsNow?: number
}

export interface LifePlanResult {
  verdict: LifePlanVerdict
  budget: BudgetResult
  /** Lo repartible: ingreso − esenciales − mínimos. */
  pot: number
  minimums: number
  steps: LifePlanStep[]
  payoff: PayoffPlan | null
  bestRealNet: { pct: number; from: string } | null
  returns: LifePlanReturn[]
  unresolvedNotes: string[]
  emergencyTarget: number
  emergencyGap: number
}

export const LIFE_PLAN_EMERGENCY_MONTHS_DEFAULT = 3
export const LIFE_PLAN_EMERGENCY_MONTHS_MIN = 1
export const LIFE_PLAN_EMERGENCY_MONTHS_MAX = 12

const pct = (n: number) => `${n.toFixed(2)} %`

/**
 * La cascada.
 *
 * Las cuatro guardas del spec están acá y ninguna es opcional:
 *   1. con déficit no hay plan, hay un faltante y un puntero a los apoyos;
 *   2. un paso sin evidencia va `unresolved` y el plan declara qué le faltó;
 *   3. `neverPaysOff` se propaga;
 *   4. no se proyecta nada más allá de los meses que salen de los saldos.
 */
export function buildLifePlan(
  budget: BudgetResult,
  debts: readonly LifePlanDebtInput[],
  options: LifePlanOptions,
  rates: LifePlanRates
): LifePlanResult {
  const returns = lifePlanReturns(rates)
  const bestRealNet = lifePlanBestRealNet(returns)
  const unresolvedNotes: string[] = []

  const emergencyMonths = Math.min(
    LIFE_PLAN_EMERGENCY_MONTHS_MAX,
    Math.max(LIFE_PLAN_EMERGENCY_MONTHS_MIN, options.emergencyMonths ?? LIFE_PLAN_EMERGENCY_MONTHS_DEFAULT)
  )
  const savingsNow = Math.max(0, options.savingsNow ?? 0)
  const emergencyTarget = budget.essentials * emergencyMonths
  const emergencyGap = Math.max(0, emergencyTarget - savingsNow)

  const minimums = debts.reduce((sum, d) => sum + Math.max(0, d.minPayment), 0)

  const steps: LifePlanStep[] = [
    {
      id: 'esenciales',
      label: 'Lo esencial',
      monthly: budget.essentials,
      reason: 'Vivienda, comida, servicios, transporte y salud, con los precios medidos del sitio.',
      evidence: null,
      unresolved: false,
      committed: true,
    },
  ]

  // Guarda 1: sin ingreso suficiente no hay plan.
  if (budget.deficit > 0) {
    steps.push({
      id: 'faltante',
      label: 'Falta para llegar a lo esencial',
      monthly: budget.deficit,
      reason:
        'El ingreso no cubre lo esencial, así que no hay excedente que ordenar. Antes que un reparto, revisá los apoyos del Estado que te puedan corresponder.',
      evidence: null,
      unresolved: false,
      committed: true,
    })
    return {
      verdict: 'no-alcanza',
      budget,
      pot: 0,
      minimums,
      steps,
      payoff: null,
      bestRealNet,
      returns,
      unresolvedNotes,
      emergencyTarget,
      emergencyGap,
    }
  }

  if (minimums > 0) {
    steps.push({
      id: 'minimos',
      label: 'Pagos mínimos de tus deudas',
      monthly: minimums,
      reason: 'Los mínimos son obligación, no decisión: salen antes de cualquier destino.',
      evidence: null,
      unresolved: false,
      committed: true,
    })
  }

  const pot = Math.max(0, budget.savingsMax - minimums)

  // La deuda se clasifica sólo si hay umbral con el que compararla (guarda 2).
  const rated = debts.map(d => ({ input: d, ...lifePlanDebtRate(d, rates) }))
  const sinTasa = rated.filter(r => r.annualRatePct === null)
  if (sinTasa.length) {
    unresolvedNotes.push(
      `No se pudo ordenar ${sinTasa.length === 1 ? 'una deuda' : `${sinTasa.length} deudas`} porque no tienen tasa cargada.`
    )
  }
  if (!bestRealNet) {
    unresolvedNotes.push(
      'No llegó ninguna tasa de referencia, así que no hay umbral con el que comparar tus deudas.'
    )
  }

  const expensive = rated.filter(
    r => r.annualRatePct !== null && bestRealNet !== null && r.annualRatePct > bestRealNet.pct
  )
  const cheap = rated.filter(
    r => r.annualRatePct !== null && bestRealNet !== null && r.annualRatePct <= bestRealNet.pct
  )

  // Guarda 3: el plan de pago y su neverPaysOff.
  const payoffDebts: Debt[] = rated
    .filter(r => r.annualRatePct !== null)
    .map(r => ({
      id: r.input.id,
      name: r.input.name,
      balance: r.input.balance,
      annualRatePct: r.annualRatePct as number,
      minPayment: r.input.minPayment,
    }))
  const payoff = payoffDebts.length ? payoffPlan(payoffDebts, pot, 'avalancha') : null
  if (payoff?.neverPaysOff) {
    unresolvedNotes.push(
      'Con esos mínimos la deuda no se cancela nunca: el interés crece más rápido de lo que pagás.'
    )
  }

  let left = pot

  const take = (amount: number): number => {
    const used = Math.max(0, Math.min(left, amount))
    left -= used
    return used
  }

  if (expensive.length || sinTasa.length) {
    const worst = expensive.reduce<typeof expensive[number] | null>(
      (a, b) => (a === null || (b.annualRatePct as number) > (a.annualRatePct as number) ? b : a),
      null
    )
    const evidence =
      worst && bestRealNet
        ? `${pct(worst.annualRatePct as number)} de la deuda contra ${pct(bestRealNet.pct)} real de ${bestRealNet.from}: pagarla rinde más que colocar la plata.`
        : null
    steps.push({
      id: 'deuda-cara',
      label: 'Deuda cara, primero',
      monthly: expensive.length ? take(left) : 0,
      reason: worst
        ? 'Ordenada de mayor a menor tasa: es el orden que minimiza el interés total.'
        : 'No hay con qué decidir si tus deudas son caras.',
      evidence,
      unresolved: !worst || !bestRealNet,
      committed: false,
    })
  }

  steps.push({
    id: 'colchon',
    label: `Colchón de ${emergencyMonths} ${emergencyMonths === 1 ? 'mes' : 'meses'}`,
    monthly: emergencyGap > 0 ? take(left) : 0,
    reason:
      emergencyGap > 0
        ? `Te faltan ${Math.round(emergencyGap)} pesos para tener ${emergencyMonths} ${emergencyMonths === 1 ? 'mes' : 'meses'} de lo esencial guardado.`
        : 'Ya tenés el colchón completo.',
    evidence: null,
    unresolved: false,
    committed: false,
  })

  if (cheap.length) {
    steps.push({
      id: 'deuda-barata',
      label: 'Deuda barata, después del colchón',
      monthly: take(left),
      reason:
        'Rinde menos que tener el colchón, así que no conviene adelantarla antes de tenerlo.',
      evidence: bestRealNet ? `Por debajo de ${pct(bestRealNet.pct)} real de ${bestRealNet.from}.` : null,
      unresolved: !bestRealNet,
      committed: false,
    })
  }

  for (const destino of returns) {
    if (left <= 0) break
    steps.push({
      id: `destino-${destino.id}`,
      label: destino.label,
      monthly: take(left),
      reason: destino.note,
      evidence:
        destino.realPct !== null
          ? `${pct(destino.grossPct)} nominal, ${pct(destino.netPct)} neto de IRPF, ${pct(destino.realPct)} real.`
          : `${pct(destino.grossPct)} nominal, ${pct(destino.netPct)} neto de IRPF. No se pudo descontar inflación.`,
      unresolved: destino.realPct === null,
      committed: false,
    })
  }

  const verdict: LifePlanVerdict = pot <= 0 ? 'sin-excedente' : 'ordenado'

  return {
    verdict,
    budget,
    pot,
    minimums,
    steps,
    payoff,
    bestRealNet,
    returns,
    unresolvedNotes,
    emergencyTarget,
    emergencyGap,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run tests/unit/lifePlan.test.ts`
Expected: PASS

Si algún test del orden falla porque un paso queda con `monthly: 0` y el test
esperaba su posición, revisar que el paso se siga empujando (con monto 0) para
que el orden sea legible: el spec pide mostrar el paso y su razón incluso cuando
no le toca plata este mes.

- [ ] **Step 5: Commit**

```bash
git add app/utils/lifePlan.ts app/tests/unit/lifePlan.test.ts
git commit -m "feat(plan-de-vida): la cascada y las cuatro guardas"
```

---

### Task 4: El sobre de tasas vivas

**Files:**
- Create: `app/server/utils/lifePlanRates.ts`
- Create: `app/server/api/life-plan-rates.get.ts`
- Test: `app/tests/unit/lifePlanRates.test.ts`

**Interfaces:**
- Consumes: `type LifePlanRates` de Task 1.
- Produces:
  - `function projectLifePlanRates(financing: unknown, debt: unknown): LifePlanRates`
  - `GET /api/life-plan-rates` → `LifePlanRates`

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/unit/lifePlanRates.test.ts
import { describe, expect, it } from 'vitest'
import { projectLifePlanRates } from '../../server/utils/lifePlanRates'

// Respuestas reales, medidas en produccion el 2026-09-08.
const FINANCING = {
  figures: { tpm: 5.75, inflacion: 4.27, plazoFijoBrou: 5.5, fondoPesos: 7.37, topeUsura: 133.49 },
  asOf: '2026-08-31T10:20:02.979Z',
  updated: ['tpm', 'inflacion', 'plazoFijoBrou', 'fondoPesos', 'topeUsura'],
}

const DEBT = {
  usuryCaps: [
    { segmento: 'Consumo con autorización de descuento, < 10.000 UI', tasaMedia: 21.16, topeTasa: 32.798 },
    { segmento: 'Consumo sin autorización de descuento, < 10.000 UI', tasaMedia: 80.72, topeTasa: 122.23 },
  ],
  asOf: '2026-09-01T10:13:02.894Z',
}

describe('projectLifePlanRates', () => {
  it('saca las tasas de referencia y las dos medias de deuda', () => {
    const out = projectLifePlanRates(FINANCING, DEBT)
    expect(out.plazoFijoBrou).toBe(5.5)
    expect(out.fondoPesos).toBe(7.37)
    expect(out.inflacion).toBe(4.27)
    expect(out.deudaSinDescuento).toBe(80.72)
    expect(out.deudaConDescuento).toBe(21.16)
    expect(out.asOfRates).toBe('2026-08-31T10:20:02.979Z')
    expect(out.asOfDebt).toBe('2026-09-01T10:13:02.894Z')
  })

  it('distingue CON de SIN autorizacion de descuento, que es la diferencia que ordena', () => {
    // Confundirlas invertiria el orden: 21,16 % contra 80,72 %.
    const out = projectLifePlanRates(FINANCING, DEBT)
    expect(out.deudaSinDescuento).toBeGreaterThan(out.deudaConDescuento as number)
  })

  it('toma la MEDIA y no el tope', () => {
    const out = projectLifePlanRates(FINANCING, DEBT)
    expect(out.deudaSinDescuento).not.toBe(122.23)
  })

  it('un endpoint caido deja sus campos en null, no en cero', () => {
    const out = projectLifePlanRates(null, null)
    expect(out.plazoFijoBrou).toBeNull()
    expect(out.inflacion).toBeNull()
    expect(out.deudaSinDescuento).toBeNull()
    expect(out.asOfRates).toBeNull()
  })

  it('un segmento que no reconoce no contamina las otras tasas', () => {
    const out = projectLifePlanRates(FINANCING, { usuryCaps: [{ segmento: 'Otra cosa', tasaMedia: 9 }] })
    expect(out.deudaSinDescuento).toBeNull()
    expect(out.plazoFijoBrou).toBe(5.5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/unit/lifePlanRates.test.ts`
Expected: FAIL — módulo inexistente

- [ ] **Step 3: Write minimal implementation**

```ts
// app/server/utils/lifePlanRates.ts
// El sobre de tasas del plan de vida: dos endpoints del backend en una forma.
//
// Función pura y con test propio por la lección de la canasta medida: una
// proyección inline que deja un campo afuera no falla, no avisa, y la sección
// simplemente no aparece.
//
// El segmento importa: la deuda de consumo CON autorización de descuento del
// sueldo tiene 21,16 % de tasa media y la de SIN autorización 80,72 %.
// Confundirlas invierte el orden de la cascada.
import type { LifePlanRates } from '../../utils/lifePlan'

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null

const str = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null

/** La media del segmento cuyo nombre matchea, o null. */
function mediaOf(caps: unknown, pattern: RegExp): number | null {
  if (!Array.isArray(caps)) return null
  for (const row of caps) {
    if (!row || typeof row !== 'object') continue
    const segmento = (row as Record<string, unknown>).segmento
    if (typeof segmento !== 'string' || !pattern.test(segmento)) continue
    // La MEDIA, no el tope: el tope es el máximo legal, no lo que se paga.
    return num((row as Record<string, unknown>).tasaMedia)
  }
  return null
}

export function projectLifePlanRates(financing: unknown, debt: unknown): LifePlanRates {
  const f =
    financing && typeof financing === 'object'
      ? ((financing as Record<string, unknown>).figures as Record<string, unknown> | undefined)
      : undefined
  const d = debt && typeof debt === 'object' ? (debt as Record<string, unknown>) : undefined

  return {
    plazoFijoBrou: num(f?.plazoFijoBrou),
    fondoPesos: num(f?.fondoPesos),
    inflacion: num(f?.inflacion),
    deudaSinDescuento: mediaOf(d?.usuryCaps, /sin autorizaci/i),
    deudaConDescuento: mediaOf(d?.usuryCaps, /con autorizaci/i),
    asOfRates: str(
      financing && typeof financing === 'object'
        ? (financing as Record<string, unknown>).asOf
        : null
    ),
    asOfDebt: str(d?.asOf),
  }
}
```

```ts
// app/server/api/life-plan-rates.get.ts
// Las tasas que justifican el orden del plan de vida, en un sobre.
//
// Dos endpoints del backend, cada uno con su propio job y su propia cadencia:
//   * `/financing-rates` (pm2 currency-financing, **semanal**, lunes 10:20 UTC)
//     — plazo fijo, fondo en pesos, inflación
//   * `/debt-relief` (pm2 currency-debt-relief, **mensual**, día 1 a las 10:13
//     UTC) — las tasas medias de usura del BCU
//
// Ninguna es diaria, y eso está bien: la grilla del BCU rige por ventana
// trimestral móvil y las tasas de referencia se mueven en semanas. Pero implica
// que el `asOf` de la deuda va a tener semanas de antigüedad casi siempre, así
// que la página muestra la fecha en vez de dar a entender que es de hoy.
//
// Cada uno falla por su cuenta: lo que no llega queda en null y la cascada
// declara qué comparación no pudo hacer, en vez de ordenar sin evidencia.
import { projectLifePlanRates } from '../utils/lifePlanRates'
import type { LifePlanRates } from '../../utils/lifePlan'

export default defineCachedEventHandler(
  async (): Promise<LifePlanRates> => {
    const base = useRuntimeConfig().apiBaseServer
    const [financing, debt] = await Promise.all([
      $fetch<unknown>(`${base}/financing-rates`, { timeout: 8000 }).catch(() => null),
      $fetch<unknown>(`${base}/debt-relief`, { timeout: 8000 }).catch(() => null),
    ])
    return projectLifePlanRates(financing, debt)
  },
  {
    // Una hora, aunque los jobs de origen corran semanal y mensual: el caché
    // corto no cuesta nada y evita servir un sobre viejo tras un refresco.
    maxAge: 60 * 60,
    staleMaxAge: 60 * 60 * 24 * 7,
    name: 'life-plan-rates',
    getKey: () => 'live',
  }
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run tests/unit/lifePlanRates.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/lifePlanRates.ts app/server/api/life-plan-rates.get.ts app/tests/unit/lifePlanRates.test.ts
git commit -m "feat(plan-de-vida): sobre de tasas vivas con proyeccion pura"
```

---

### Task 5: La página

**Files:**
- Create: `app/pages/plan-de-vida-uruguay.vue`
- Modify: `app/utils/siteNav.ts` (entrada de nav)
- Modify: `app/i18n/locales/json/{es,en,pt}.json` (`nav.planDeVida`)
- Test: `app/tests/unit/lifePlan.test.ts` (ya cubre el motor; la página no agrega lógica)

**Interfaces:**
- Consumes: `buildLifePlan`, `LIFE_PLAN_DEBT_KINDS`, `LIFE_PLAN_EMERGENCY_MONTHS_DEFAULT`, `type LifePlanDebtInput` de `~/utils/lifePlan`; `estimateBudget` de `~/utils/costOfLiving`; `/api/cost-of-living` y `/api/life-plan-rates`.
- Produces: la ruta `/plan-de-vida-uruguay`.

- [ ] **Step 1: Escribir la página**

Estructura, con las obligaciones del repo que los tests ya verifican:

- `useFetch('/api/cost-of-living', { key: 'plan-costos' })` para el modelo con la
  comida reexpresada, y `useFetch('/api/life-plan-rates', { key: 'plan-tasas' })`
  para el sobre. Server-rendered: los números son la página.
- Controles: ingreso, convivencia, ciudad, vivienda, zona; colchón (slider 1–12);
  ahorro actual; y una lista de deudas con tipo (`LIFE_PLAN_DEBT_KINDS`), saldo,
  mínimo y tasa opcional.
- `const plan = computed(() => buildLifePlan(estimateBudget(inputs), debts, opts, rates))`.
- Veredicto arriba. Con `no-alcanza`: el faltante, y botones a
  `/vivir-con-25000-pesos-uruguay` y `/asignacion-familiar-uruguay`. **No se
  dibuja la cascada.**
- La cascada como tabla con `class="cu-mobile-cards"` y `data-label` en cada
  `<td>`: paso, monto, por qué, y la evidencia con su fecha.
- Los pasos `unresolved` con un chip de aviso y su motivo; `unresolvedNotes` en un
  `VAlert` arriba de la tabla.
- Un `<FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" />`
  con `id` en cada ítem.
- `useSeoMeta` con título de **60 caracteres o menos contando el sufijo**
  ` | Cambio Uruguay` (17): el base tiene que entrar en 43. Usar
  `'Cómo distribuir tu sueldo en Uruguay'` (36 → 53 renderizados).
- `useHead` con canonical y un JSON-LD propio (`@type: 'WebApplication'`), que
  `tests/unit/seoContract.test.ts` exige a toda página que se debe su SEO.
- Un solo `<h1>`.
- Cruces: `/herramientas/costo-de-vida`, `/saldar-deudas-uruguay`,
  `/inversiones-uruguay`, `/precios-de-supermercado-uruguay`,
  `/alquileres-uruguay`, `/herramientas/calculadora-sueldo-liquido`.
- Un párrafo fijo al pie: esto es aritmética sobre tasas públicas y fechadas, no
  asesoramiento financiero, y no recomienda productos ni instituciones.

- [ ] **Step 2: Registrar la ruta en la navegación**

En `app/utils/siteNav.ts`, dentro de la sección de finanzas personales, antes de
la entrada de `/herramientas/costo-de-vida`:

```ts
      {
        to: '/plan-de-vida-uruguay',
        labelKey: 'nav.planDeVida',
        icon: 'mdi-chart-timeline-variant',
        priority: 0.8,
        changefreq: 'weekly',
        fresh: true,
        keywords: [
          'como distribuir mi sueldo',
          'en que gastar el sueldo',
          'cuanto ahorrar por mes uruguay',
          'pagar deuda o ahorrar',
          'plan financiero uruguay',
          'presupuesto personal uruguay',
          'que hacer con el excedente',
        ],
      },
```

Y la etiqueta en los tres locales, insertada quirúrgicamente junto a otra clave
de `nav` (NO reescribir el JSON entero: esos archivos suelen tener cambios sin
commitear de otras sesiones):

- `es`: `"planDeVida": "Cómo distribuir tu sueldo"`
- `en`: `"planDeVida": "How to allocate your salary"`
- `pt`: `"planDeVida": "Como distribuir seu salário"`

- [ ] **Step 3: Correr los contratos del repo**

Run: `cd app && npx vitest run tests/unit/siteNav-coverage.test.ts tests/unit/seoContract.test.ts tests/unit/seoTitleBudget.test.ts`
Expected: PASS. Si `seoTitleBudget` falla, el título base pasa de 43 caracteres:
acortarlo, no subir el presupuesto.

- [ ] **Step 4: Lint y suite completa**

Run: `cd app && npx eslint --fix pages/plan-de-vida-uruguay.vue utils/siteNav.ts`
Run: `cd app && npx vitest run && npm run lint`
Expected: sin errores (los 8 warnings de `v-html` son preexistentes)

- [ ] **Step 5: Commit**

```bash
git add app/pages/plan-de-vida-uruguay.vue app/utils/siteNav.ts app/i18n/locales/json
git commit -m "feat(app): pagina del plan de vida por ingreso"
```

---

### Task 6: Documentación

**Files:**
- Create: `docs/app/PLAN_DE_VIDA.md`
- Modify: `AGENTS.md` (mención en la fila de `currency-financing`/`currency-debt-relief` no hace falta: C no agrega job; alcanza el doc)

**Interfaces:**
- Consumes: nada.
- Produces: nada.

- [ ] **Step 1: Escribir `docs/app/PLAN_DE_VIDA.md`**

Con las cifras medidas y fechadas:

- de dónde sale cada tasa y con qué job se refresca;
- **el contraste que autoriza a ordenar**: 80,72 % de la deuda de consumo sin
  descuento (BCU, vigente 2026-09-01) contra ~3 % real de la mejor colocación
  accesible después de IRPF e inflación (`/financing-rates`, 2026-08-31);
- **que la media no es el tope**, y por qué se usa la media;
- las cuatro guardas y qué falla cada una previene;
- que el umbral se calcula y no se escribe, con la razón (un umbral a mano
  envejece igual que la BPC de 2024);
- lo que C **no** hace: no recomienda productos, no proyecta a varios años, no
  cubre jubilación ni compra de vivienda, y no es asesoramiento.

- [ ] **Step 2: Verificar las dos suites**

Run: `npx vitest run` (raíz)
Run: `cd app && npx vitest run`
Expected: sin fallos nuevos. Los preexistentes conocidos son los de los
directorios scratch `.sdd-*` (gitignored) en la raíz.

- [ ] **Step 3: Commit**

```bash
git add docs/app/PLAN_DE_VIDA.md
git commit -m "docs(plan-de-vida): de donde sale cada tasa y que autoriza a ordenar"
```

---

## Self-Review

**Cobertura del spec:**

| sección del spec | tarea |
|---|---|
| §1 lo que ya existe, composición | 1, 3 (imports de costOfLiving/debt/investments) |
| §2 el contraste que autoriza a ordenar | 1 (umbral), 3 (evidencia en el paso), 6 (docs) |
| §3 la cascada, los 5 pasos | 3 |
| §3 qué se reparte (`savingsMax` − mínimos) | 3 (test `el excedente se reparte DESPUES de los minimos`) |
| §3 el umbral se calcula | 1 (`lifePlanBestRealNet`), 3 |
| §3 rendimiento real neto | 1 (`lifePlanRealNet`) |
| §4 guarda 1, no-alcanza | 3 |
| §4 guarda 2, sin evidencia no se ordena | 1 (best null), 3, 4 (proyección con nulls) |
| §4 guarda 3, `neverPaysOff` | 3 |
| §4 guarda 4, nada se proyecta | por construcción: no hay función de proyección en ninguna tarea |
| §5 tipo de deuda → media del BCU | 2, 4 (`mediaOf`) |
| §6 arquitectura, 4 archivos | 1-4 |
| §7 la página y las obligaciones del repo | 5 |
| §8 lo que C no hace | 1 (test de que no se nombra institución), 5 (párrafo al pie), 6 |

**Consistencia de tipos:** `LifePlanRates` se define en Task 1 y lo consumen
Tasks 2, 3 y 4 con ese nombre. `LifePlanDebtInput` se define en Task 2 y lo
consumen 3 y 5. `LifePlanStep`/`LifePlanResult` se definen en Task 3 y los
consume 5. `lifePlanBestRealNet` devuelve `{pct, from} | null` y Task 3 chequea
el null antes de usarlo.

**Riesgo abierto, dicho y no tapado:** `payoffPlan` recibe `pot` como
`extraMonthly`, o sea todo el excedente. Eso es correcto para calcular en cuántos
meses se cancela la deuda **si le dedicás todo el excedente**, y es lo que la
cascada propone mientras haya deuda cara. Pero si el usuario mueve el colchón a
12 meses, la cascada le da menos al pago de deuda que lo que `payoff.months`
asume. La página tiene que decir que ese plazo es "si le dedicás todo el
excedente", y no presentarlo como el plazo de esta asignación. Está en el copy de
Task 5, no en el motor, porque el motor no debe elegir por el usuario.
