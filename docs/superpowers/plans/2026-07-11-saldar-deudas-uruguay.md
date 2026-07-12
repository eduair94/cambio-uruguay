# /saldar-deudas-uruguay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new Spanish page `/saldar-deudas-uruguay` that guides Uruguayans to settle overdue debt (prescription check, negotiation playbook, honest rubric comparison of ChauDeudas/MiDeuda/etc., credit rebuild), backed by a monthly Gemini refresh, and trim the overlap out of `/salir-del-clearing`.

**Architecture:** Pure, unit-tested logic in `app/utils/debtRelief.ts` (prescription math, weighted rubric, structured content, dated baselines). A server layer (`app/server/utils/debtReliefLive.ts` + `/api/debt-relief` + a monthly Nitro task) refreshes usury caps and refi rates via Gemini grounded search with guardrail bands and a baseline fallback. The page consumes the util synchronously and the API via `useLazyFetch({ server: false })`. Follows the house pattern of `/mejores-bancos-uruguay`, `/salud-financiera`, and `/herramientas/costo-de-vida`.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup lang="ts">`, Vuetify, Vitest, Nitro scheduled tasks, Gemini `gemini-2.5-flash` grounded search.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-11-saldar-deudas-uruguay-design.md`.
- Branch: `feat/saldar-deudas-uruguay` (already checked out).
- Working dir for all commands: `c:\Users\airau\Documents\GitHub\cambio-uruguay\app` (the Nuxt app). Paths below are relative to that dir unless noted.
- Util modules under `app/utils/*.ts` are **pure** (no Vue/Nuxt imports; only relative imports). Server utils under `app/server/utils` may use Nitro globals (`useRuntimeConfig`, `$fetch`, `useStorage`).
- Page body copy is **Spanish only**. Only the nav label is trilingual (`nav.saldarDeudas` in `es.json`, `en.json`, `pt.json`).
- Editorial: factual, sourced, critical-but-fair. Never the word "estafa". Unconfirmed leads (ChauDeudas↔Creditia) marked as indicio. Legal facts cited only from primary sources (IMPO/BCU/Equifax), never Reddit. Every page must carry the "informativo, no asesoramiento financiero" disclaimer.
- Tests: `npx vitest run tests/unit/<file>` from `app/`. Lint gate: `npm run lint` (do NOT use `npm run typecheck` — it crashes; see memory `typecheck-broken`).
- New page MUST be registered in `app/utils/siteNav.ts` (`services` section) and get a `nav.saldarDeudas` label in all three locale JSONs, or `tests/unit/siteNav-coverage.test.ts` fails.
- Money/number display uses `formatUYU` / `formatNumber` from `~/utils/format`.
- Commit after each task. Do not push. Do not merge.

---

### Task 1: Prescription table + `checkPrescription` in `debtRelief.ts`

**Files:**
- Create: `app/utils/debtRelief.ts`
- Test: `app/tests/unit/debtRelief.test.ts`

**Interfaces:**
- Produces:
  - `interface PrescriptionType { id: string; label: string; months: number; norma: string; nota: string }`
  - `const PRESCRIPTION_TYPES: readonly PrescriptionType[]`
  - `interface PrescriptionResult { plazoLabel: string; months: number; monthsElapsed: number; monthsRemaining: number; mayHaveExpired: boolean; norma: string; caveat: string }`
  - `function checkPrescription(typeId: string, lastActionISO: string, todayISO: string): PrescriptionResult | null`

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/debtRelief.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  PRESCRIPTION_TYPES,
  checkPrescription,
} from '../../utils/debtRelief'

describe('PRESCRIPTION_TYPES', () => {
  it('every type has a positive month plazo, a norma and a nota', () => {
    expect(PRESCRIPTION_TYPES.length).toBeGreaterThanOrEqual(6)
    for (const t of PRESCRIPTION_TYPES) {
      expect(t.months).toBeGreaterThan(0)
      expect(t.norma.length).toBeGreaterThan(0)
      expect(t.nota.length).toBeGreaterThan(0)
    }
  })

  it('includes the key verified plazos (cheque 6m, pagaré 48m, préstamo 120m)', () => {
    const byId = Object.fromEntries(PRESCRIPTION_TYPES.map(t => [t.id, t.months]))
    expect(byId['cheque']).toBe(6)
    expect(byId['pagare_vale']).toBe(48)
    expect(byId['prestamo_personal']).toBe(120)
  })
})

describe('checkPrescription', () => {
  it('returns null for an unknown type', () => {
    expect(checkPrescription('nope', '2010-01-01', '2026-07-11')).toBeNull()
  })

  it('flags a 10-year debt untouched for 12 years as maybe-expired', () => {
    const r = checkPrescription('prestamo_personal', '2014-01-01', '2026-07-11')!
    expect(r.mayHaveExpired).toBe(true)
    expect(r.monthsRemaining).toBe(0)
    expect(r.months).toBe(120)
  })

  it('does NOT flag a 10-year debt only 3 years old', () => {
    const r = checkPrescription('prestamo_personal', '2023-07-11', '2026-07-11')!
    expect(r.mayHaveExpired).toBe(false)
    expect(r.monthsRemaining).toBeGreaterThan(0)
  })

  it('handles the cheque 6-month plazo', () => {
    expect(checkPrescription('cheque', '2026-06-01', '2026-07-11')!.mayHaveExpired).toBe(false)
    expect(checkPrescription('cheque', '2025-06-01', '2026-07-11')!.mayHaveExpired).toBe(true)
  })

  it('returns null when lastActionISO is in the future', () => {
    expect(checkPrescription('cheque', '2027-01-01', '2026-07-11')).toBeNull()
  })

  it('always carries a caveat about opposing prescription and not reconociendo the debt', () => {
    const r = checkPrescription('pagare_vale', '2000-01-01', '2026-07-11')!
    expect(r.caveat.toLowerCase()).toContain('recono')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/debtRelief.test.ts`
Expected: FAIL — cannot resolve `../../utils/debtRelief`.

- [ ] **Step 3: Write minimal implementation**

Create `app/utils/debtRelief.ts`:

```ts
// app/utils/debtRelief.ts
// Pure data + maths for /saldar-deudas-uruguay (and shared with tests). No Vue/Nuxt.
//
// Three things this module owns that the rest of the site does not:
//   1. checkPrescription() — does a debt's collection right MAY have prescribed?
//      Plazos are the post-LUC (Ley 19.889) civil/commercial terms. This only
//      tells the user the legal window; prescription is NOT automatic (has to be
//      opposed in court, CC art. 1191) and ANY acknowledgment — paying a cuota,
//      paying interest, signing an "acuerdo" — resets it (CC arts. 1189/1234).
//   2. A transparent weighted RUBRIC scoring debt-relief services 0–100.
//   3. Dated baselines (usury caps, refi rates) that a monthly Gemini job refreshes.
//
// Informativo, no asesoramiento financiero.

export interface PrescriptionType {
  id: string
  label: string
  /** Prescription window in months. */
  months: number
  /** Legal source (norm + article). */
  norma: string
  /** Short plain-language note. */
  nota: string
}

/** Verified plazos (IMPO, post-LUC Ley 19.889). See spec §4.4 / research. */
export const PRESCRIPTION_TYPES: readonly PrescriptionType[] = Object.freeze([
  {
    id: 'prestamo_personal',
    label: 'Préstamo personal / obligación personal',
    months: 120,
    norma: 'Código Civil art. 1216 (redacción Ley 19.889 / LUC)',
    nota: 'Acción personal por deuda exigible: 10 años. La vía ejecutiva (juicio rápido) se pierde a los 5 años (art. 1217).',
  },
  {
    id: 'deuda_comercial',
    label: 'Deuda comercial general',
    months: 120,
    norma: 'Código de Comercio art. 1018 (redacción Ley 19.889 / LUC)',
    nota: 'Obligaciones comerciales: 10 años (antes de la LUC eran 20).',
  },
  {
    id: 'pagare_vale',
    label: 'Vale, conforme o pagaré',
    months: 48,
    norma: 'Código de Comercio art. 1019 num. 1',
    nota: '4 años desde el vencimiento, si la deuda no fue reconocida por documento separado.',
  },
  {
    id: 'letra_cambio',
    label: 'Letra de cambio (contra el aceptante)',
    months: 36,
    norma: 'Decreto-Ley de Títulos Valores 14.701 art. 116',
    nota: '3 años desde el vencimiento contra el aceptante; 1 año contra endosantes y librador.',
  },
  {
    id: 'intereses_periodico',
    label: 'Intereses, cuotas y pagos periódicos',
    months: 48,
    norma: 'Código Civil art. 1222',
    nota: 'Intereses, arriendos y todo lo que se paga por años o plazos periódicos: 4 años.',
  },
  {
    id: 'comercio_mercaderia',
    label: 'Mercadería fiada / géneros vendidos por comercio',
    months: 24,
    norma: 'Código Civil art. 1223 / Código de Comercio art. 1020',
    nota: 'Precio de géneros vendidos por comerciantes y honorarios profesionales: 2 años (deudor domiciliado en el país).',
  },
  {
    id: 'cheque',
    label: 'Cheque',
    months: 6,
    norma: 'Ley de Cheques 14.412 art. 68',
    nota: '6 meses desde el vencimiento del plazo de presentación.',
  },
])

export interface PrescriptionResult {
  plazoLabel: string
  months: number
  monthsElapsed: number
  monthsRemaining: number
  mayHaveExpired: boolean
  norma: string
  caveat: string
}

const PRESCRIPTION_CAVEAT =
  'Ojo: la prescripción NO es automática — hay que oponerla como excepción en un juicio (CC art. 1191) y no la aplica el juez de oficio. Y cualquier reconocimiento (pagar una cuota, pagar intereses, firmar un acuerdo o pedir plazo) la reinicia o la renuncia (CC arts. 1189 y 1234). No reconozcas ni pagues una deuda vieja sin asesorarte con un abogado.'

/** Whole months between two ISO dates (a ≤ b), floor. */
function monthsBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO)
  const b = new Date(bISO)
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) m -= 1
  return m
}

/**
 * Does this debt's collection right MAY have prescribed? Returns null for an
 * unknown type or a future lastActionISO. `todayISO` is a parameter (not
 * Date.now()) so the function is deterministic and testable.
 */
export function checkPrescription(
  typeId: string,
  lastActionISO: string,
  todayISO: string
): PrescriptionResult | null {
  const type = PRESCRIPTION_TYPES.find(t => t.id === typeId)
  if (!type) return null
  const last = new Date(lastActionISO)
  const today = new Date(todayISO)
  if (!Number.isFinite(last.getTime()) || !Number.isFinite(today.getTime())) return null
  if (last.getTime() > today.getTime()) return null

  const monthsElapsed = Math.max(0, monthsBetween(lastActionISO, todayISO))
  const monthsRemaining = Math.max(0, type.months - monthsElapsed)
  return {
    plazoLabel: type.label,
    months: type.months,
    monthsElapsed,
    monthsRemaining,
    mayHaveExpired: monthsElapsed >= type.months,
    norma: type.norma,
    caveat: PRESCRIPTION_CAVEAT,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/debtRelief.test.ts`
Expected: PASS (all cases in this file).

- [ ] **Step 5: Commit**

```bash
git add app/utils/debtRelief.ts app/tests/unit/debtRelief.test.ts
git commit -m "feat(deudas): prescription table + checkPrescription (verified plazos)"
```

---

### Task 2: Rubric + services + score computation

**Files:**
- Modify: `app/utils/debtRelief.ts`
- Test: `app/tests/unit/debtRelief.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `type RubricId = 'transparencia' | 'costo' | 'independencia' | 'privacidad' | 'utilidad' | 'constancia'`
  - `interface RubricDimension { id: RubricId; label: string; weight: number; what: string }`
  - `const RELIEF_RUBRIC: readonly RubricDimension[]` (weights sum to 100)
  - `interface ReliefService { id: string; name: string; operador: string; quienPaga: string; bcuRegulado: boolean; documenta: string; transparencia: string; scores: Record<RubricId, number>; sources: { label: string; url: string }[] }`
  - `const RELIEF_SERVICES: readonly ReliefService[]`
  - `function computeReliefScore(scores: Record<RubricId, number>): number`
  - `interface RankedService extends ReliefService { rank: number; overall: number }`
  - `function rankedServices(services?: readonly ReliefService[]): RankedService[]`

- [ ] **Step 1: Write the failing test** — append to `app/tests/unit/debtRelief.test.ts`:

```ts
import {
  RELIEF_RUBRIC,
  RELIEF_SERVICES,
  computeReliefScore,
  rankedServices,
} from '../../utils/debtRelief'

describe('RELIEF_RUBRIC', () => {
  it('weights sum to 100', () => {
    expect(RELIEF_RUBRIC.reduce((s, d) => s + d.weight, 0)).toBe(100)
  })
})

describe('RELIEF_SERVICES', () => {
  it('every service scores every rubric dimension 0–100 and cites a source', () => {
    for (const s of RELIEF_SERVICES) {
      for (const d of RELIEF_RUBRIC) {
        const v = s.scores[d.id]
        expect(v, `${s.id}.${d.id}`).toBeGreaterThanOrEqual(0)
        expect(v, `${s.id}.${d.id}`).toBeLessThanOrEqual(100)
      }
      expect(s.sources.length).toBeGreaterThan(0)
      for (const src of s.sources) expect(src.url).toMatch(/^https?:\/\//)
    }
  })

  it('includes the negotiate-direct baseline and the two named platforms', () => {
    const ids = RELIEF_SERVICES.map(s => s.id)
    expect(ids).toContain('negociar_directo')
    expect(ids).toContain('chaudeudas')
    expect(ids).toContain('mideuda')
  })
})

describe('computeReliefScore + rankedServices', () => {
  it('computes the weighted average', () => {
    const flat = Object.fromEntries(RELIEF_RUBRIC.map(d => [d.id, 50])) as Record<
      'transparencia' | 'costo' | 'independencia' | 'privacidad' | 'utilidad' | 'constancia',
      number
    >
    expect(computeReliefScore(flat)).toBe(50)
  })

  it('ranks negociar_directo first (it dominates the rubric)', () => {
    const ranked = rankedServices()
    expect(ranked[0].id).toBe('negociar_directo')
    expect(ranked[0].rank).toBe(1)
    // ranks are strictly increasing and overall is descending
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].rank).toBe(i + 1)
      expect(ranked[i].overall).toBeLessThanOrEqual(ranked[i - 1].overall)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/debtRelief.test.ts`
Expected: FAIL — `RELIEF_RUBRIC` etc. not exported.

- [ ] **Step 3: Write minimal implementation** — append to `app/utils/debtRelief.ts`:

```ts
export type RubricId =
  | 'transparencia'
  | 'costo'
  | 'independencia'
  | 'privacidad'
  | 'utilidad'
  | 'constancia'

export interface RubricDimension {
  id: RubricId
  label: string
  weight: number
  what: string
}

/** Transparent weighted rubric. Weights sum to 100 (see spec §4.6). */
export const RELIEF_RUBRIC: readonly RubricDimension[] = Object.freeze([
  { id: 'transparencia', label: 'Transparencia', weight: 20, what: 'Se sabe quién está detrás (razón social, RUT, prensa real vs. contenido pago).' },
  { id: 'costo', label: 'Costo para vos', weight: 15, what: 'Cuánto te cuesta a vos, el deudor, usar el servicio.' },
  { id: 'independencia', label: 'Independencia', weight: 20, what: '¿Es un tercero neutral, o el brazo de una cobranza / del propio buró que te reporta?' },
  { id: 'privacidad', label: 'Privacidad de datos', weight: 15, what: 'Qué datos te pide y qué tan coherente es su política con lo que hace.' },
  { id: 'utilidad', label: 'Utilidad real', weight: 15, what: 'Qué tanto te acerca de verdad a saldar la deuda, y con qué cobertura.' },
  { id: 'constancia', label: 'Constancia de cancelación', weight: 15, what: '¿Te deja un finiquito por escrito y gestiona la baja del registro?' },
])

export interface ReliefService {
  id: string
  name: string
  operador: string
  quienPaga: string
  bcuRegulado: boolean
  documenta: string
  transparencia: string
  scores: Record<RubricId, number>
  sources: { label: string; url: string }[]
}

/**
 * Scores are our best objective judgement from web research + an adversarial
 * fact-check pass; conservative where a service's terms are unpublished. Each
 * factual field is sourced. Critical but fair — never "estafa".
 */
export const RELIEF_SERVICES: readonly ReliefService[] = Object.freeze([
  {
    id: 'negociar_directo',
    name: 'Negociar directo con el acreedor',
    operador: 'Vos mismo (sin intermediario)',
    quienPaga: 'Nadie: es gratis',
    bcuRegulado: false,
    documenta: 'Vos exigís la carta de cancelación / finiquito al acreedor',
    transparencia: 'Total: sabés exactamente con quién hablás y qué firmás. Requiere tu tiempo y algo de temple.',
    scores: { transparencia: 100, costo: 100, independencia: 100, privacidad: 100, utilidad: 70, constancia: 90 },
    sources: [
      { label: 'Central de Riesgos BCU (consulta gratis)', url: 'https://consultadeuda.bcu.gub.uy/consultadeuda/' },
      { label: 'r/uruguay: negociación directa (evidencia de usuarios)', url: 'https://reddit.com/r/uruguay/comments/1dhwy89' },
    ],
  },
  {
    id: 'brou_autogestion',
    name: 'BROU — Autogestión de Deuda',
    operador: 'Banco República (banco estatal, regulado BCU)',
    quienPaga: 'Es el propio acreedor: sin intermediario',
    bcuRegulado: true,
    documenta: 'Acuerdo de refinanciación / cancelación del propio banco',
    transparencia: 'Alta: es tu acreedor directo. Solo sirve para deudas con BROU.',
    scores: { transparencia: 95, costo: 100, independencia: 85, privacidad: 90, utilidad: 70, constancia: 90 },
    sources: [
      { label: 'BROU Autogestión de Deudas', url: 'https://autogestiondeudas.brou.com.uy/' },
      { label: 'BROU — Reestructuración de deuda', url: 'https://www.brou.com.uy/personas/reestructuracion-de-deuda' },
    ],
  },
  {
    id: 'ponete_al_dia',
    name: 'Ponete al Día',
    operador: 'WEDKOL S.A. (Alpréstamo) + Equifax Uruguay S.A.',
    quienPaga: 'El acreedor (no vos)',
    bcuRegulado: false,
    documenta: 'Depende del acreedor adherido',
    transparencia: 'Operadores identificados en sus Términos, pero lo corre el propio buró de crédito (Equifax) que te reporta: conflicto de interés notorio.',
    scores: { transparencia: 70, costo: 100, independencia: 20, privacidad: 55, utilidad: 65, constancia: 60 },
    sources: [{ label: 'Ponete al Día (Uruguay)', url: 'https://ponetealdia.com/uy' }],
  },
  {
    id: 'mideuda',
    name: 'MiDeuda',
    operador: 'Requiro SRL (cobranza/BPO; RUT 217697220017)',
    quienPaga: 'El acreedor: % sobre lo que recauda (a vos no te cobra)',
    bcuRegulado: false,
    documenta: 'No borra el registro; la deuda figura mientras la financiera lo informe',
    transparencia: 'Operada por Requiro (confirmado por LinkedIn de sus fundadores). Pero su propia política deja el RUT de "MiDeuda S.A." como plantilla sin completar, y pide escaneo del documento con la cámara.',
    scores: { transparencia: 55, costo: 100, independencia: 30, privacidad: 40, utilidad: 65, constancia: 55 },
    sources: [
      { label: 'MiDeuda', url: 'https://mideuda.com.uy/' },
      { label: 'Requiro (operador)', url: 'https://www.requiro.com.uy/' },
    ],
  },
  {
    id: 'zeroatraso',
    name: 'ZeroAtraso',
    operador: 'Empresa regional (Argentina/Uruguay/Perú)',
    quienPaga: 'El acreedor: dice no cobrar honorarios al deudor',
    bcuRegulado: false,
    documenta: 'Acuerdos con bancos/financieras adheridos',
    transparencia: 'Declara "no te cobramos honorarios", pero es extranjera, atención por WhatsApp AR, y no queda claro con qué acreedores uruguayos tiene convenio.',
    scores: { transparencia: 45, costo: 100, independencia: 40, privacidad: 50, utilidad: 55, constancia: 50 },
    sources: [{ label: 'ZeroAtraso', url: 'https://zeroatraso.com' }],
  },
  {
    id: 'chaudeudas',
    name: 'ChauDeudas',
    operador: 'Chau Deudas SAS (Ituzaingó 1324/501, Montevideo)',
    quienPaga: 'El acreedor (ChauDeudas dice no recibir tu dinero)',
    bcuRegulado: false,
    documenta: 'No menciona el Clearing ni promete constancia de libre deuda',
    transparencia: 'Baja: no publica RUT ni fundadores; la única prensa es contenido pago. Su propia API lista 12 acreedores con prefijo "CREDITIA -" (recuperadora de carteras), indicio de que su base viene de cobranza. Su FAQ dice no compartir datos, pero los T&C autorizan usarlos para marketing y transferirlos ante una venta de la empresa.',
    scores: { transparencia: 35, costo: 100, independencia: 35, privacidad: 40, utilidad: 60, constancia: 45 },
    sources: [
      { label: 'ChauDeudas', url: 'https://www.chaudeudas.com.uy/' },
      { label: 'ChauDeudas — Términos y Condiciones', url: 'https://www.chaudeudas.com.uy/legal/terminos_condiciones.json' },
    ],
  },
])

const RELIEF_WEIGHT_SUM = RELIEF_RUBRIC.reduce((s, d) => s + d.weight, 0)

/** Weighted 0–100 overall from per-dimension scores. */
export function computeReliefScore(scores: Record<RubricId, number>): number {
  const total = RELIEF_RUBRIC.reduce((s, d) => s + (scores[d.id] ?? 0) * d.weight, 0)
  return Math.round((total / RELIEF_WEIGHT_SUM) * 10) / 10
}

export interface RankedService extends ReliefService {
  rank: number
  overall: number
}

/** Services with computed overall, best-first, 1-indexed rank. */
export function rankedServices(
  services: readonly ReliefService[] = RELIEF_SERVICES
): RankedService[] {
  return services
    .map(s => ({ ...s, overall: computeReliefScore(s.scores), rank: 0 }))
    .sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name))
    .map((s, i) => ({ ...s, rank: i + 1 }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/debtRelief.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/debtRelief.ts app/tests/unit/debtRelief.test.ts
git commit -m "feat(deudas): weighted rubric + service comparison (computed scores)"
```

---

### Task 3: Structured content + dated baselines

**Files:**
- Modify: `app/utils/debtRelief.ts`
- Test: `app/tests/unit/debtRelief.test.ts`

**Interfaces:**
- Produces:
  - `interface Myth { myth: string; truth: string; norma: string }` and `const DEBT_MYTHS: readonly Myth[]`
  - `interface Step { title: string; detail: string }` and `const NEGOTIATION_STEPS: readonly Step[]`, `const CREDIT_REBUILD_STEPS: readonly Step[]`
  - `interface VerdictCase { situation: string; advice: string; tone: 'good' | 'neutral' | 'warn' }` and `const VERDICT_CASES: readonly VerdictCase[]`
  - `interface UsuryCap { segmento: string; tasaMedia: number; topeTasa: number; topeMora: number }`
  - `interface DebtReliefBaseline { asOf: string; period: string; usuryCaps: UsuryCap[]; refiRates: { institucion: string; producto: string; tasa: string; nota: string }[] }`
  - `const DEBT_RELIEF_BASELINE: DebtReliefBaseline`

- [ ] **Step 1: Write the failing test** — append to `app/tests/unit/debtRelief.test.ts`:

```ts
import {
  DEBT_MYTHS,
  NEGOTIATION_STEPS,
  CREDIT_REBUILD_STEPS,
  VERDICT_CASES,
  DEBT_RELIEF_BASELINE,
} from '../../utils/debtRelief'

describe('structured content', () => {
  it('has myths, steps and verdict cases with content', () => {
    expect(DEBT_MYTHS.length).toBeGreaterThanOrEqual(4)
    for (const m of DEBT_MYTHS) expect(m.norma.length).toBeGreaterThan(0)
    expect(NEGOTIATION_STEPS.length).toBeGreaterThanOrEqual(5)
    expect(CREDIT_REBUILD_STEPS.length).toBeGreaterThanOrEqual(3)
    expect(VERDICT_CASES.length).toBeGreaterThanOrEqual(4)
    for (const v of VERDICT_CASES) expect(['good', 'neutral', 'warn']).toContain(v.tone)
  })
})

describe('DEBT_RELIEF_BASELINE', () => {
  it('carries a dated usury-cap snapshot and refi rates', () => {
    expect(DEBT_RELIEF_BASELINE.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(DEBT_RELIEF_BASELINE.usuryCaps.length).toBeGreaterThan(0)
    for (const c of DEBT_RELIEF_BASELINE.usuryCaps) {
      expect(c.topeTasa).toBeGreaterThan(c.tasaMedia)
      expect(c.topeMora).toBeGreaterThanOrEqual(c.topeTasa)
    }
    expect(DEBT_RELIEF_BASELINE.refiRates.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/debtRelief.test.ts`
Expected: FAIL — new exports missing.

- [ ] **Step 3: Write minimal implementation** — append to `app/utils/debtRelief.ts`:

```ts
export interface Myth {
  myth: string
  truth: string
  norma: string
}

export const DEBT_MYTHS: readonly Myth[] = Object.freeze([
  {
    myth: '"Pagar me borra del Clearing."',
    truth: 'No. La deuda pagada queda registrada como "cancelada" hasta 5 años (no renovable); en la práctica Equifax la mantiene unos 3 años. Pagar mejora tu situación a futuro, pero no borra el antecedente.',
    norma: 'Ley 18.331 art. 22',
  },
  {
    myth: '"La deuda caduca sola a los 10 años."',
    truth: 'La deuda no desaparece sola. Lo que caduca es tu registro en el Clearing (5 años + 5 renovable una vez) y lo que prescribe es el derecho a cobrarte por juicio (10 años la acción personal, 5 la vía ejecutiva, 4 el pagaré, 6 meses el cheque). Y la prescripción hay que oponerla: no la aplica el juez de oficio.',
    norma: 'CC arts. 1216, 1217, 1191; CCom 1019; Ley 14.412 art. 68',
  },
  {
    myth: '"Si arreglo un pago, no pierdo nada."',
    truth: 'Cuidado: pagar una cuota, pagar intereses o firmar un "acuerdo" sobre una deuda ya prescrita la RESUCITA (es renuncia tácita a la prescripción y reinicia el plazo). Verificá la prescripción ANTES de reconocer o pagar nada.',
    norma: 'CC arts. 1189, 1234; CCom 1026',
  },
  {
    myth: '"Me pueden embargar el sueldo / meter preso."',
    truth: 'El sueldo es inembargable salvo por tributos o pensión alimenticia (hasta 1/3, o 1/2 alimentos a menores), y siempre debés conservar como mínimo el 35% líquido. Y no hay cárcel por deudas civiles o comerciales.',
    norma: 'CGP art. 381; Ley 17.829 art. 3; Constitución art. 52',
  },
])

export interface Step {
  title: string
  detail: string
}

export const NEGOTIATION_STEPS: readonly Step[] = Object.freeze([
  { title: 'Diagnóstico gratis primero', detail: 'Consultá tu situación sin costo en la Central de Riesgos del BCU (consultadeuda.bcu.gub.uy) y pedí tu informe de Clearing gratis, que te corresponde una vez cada 6 meses. Antes de hablar con nadie, sabé exactamente qué debés y a quién.' },
  { title: 'Entendé quién tiene tu deuda hoy', detail: 'Si ya pasó a una recuperadora, esa empresa te la compró a centavos (a veces ~10% del nominal). Eso te da poder: le sirve cobrar algo antes que nada.' },
  { title: 'Anclá en el capital original', detail: 'Anotá cuánto pediste de verdad y negociá sobre ese número, no sobre el total inflado con intereses y gastos. Los intereses que te quieren cobrar son lo primero que se recorta.' },
  { title: 'Ofrecé pago contado por una quita', detail: 'La quita más grande aparece pagando de una. Táctica que reportan usuarios de r/uruguay: "tengo esto para hoy, más no". Usuarios reportan quitas de 54.000→12.000 (~78%) con financieras y 240.000→50.000 con un banco vía estudio.' },
  { title: 'Exigí el acuerdo por escrito ANTES de pagar', detail: 'Pedí el acuerdo y la carta de cancelación / finiquito por escrito antes de transferir un peso. Nunca pagues por Abitab de palabra: el doble cobro (te reclaman una deuda que ya pagaste) es un fraude común.' },
  { title: 'Priorizá por la tasa más cara', detail: 'Si tenés varias deudas, atacá primero la de mayor TEA. Usá el simulador de /salir-del-clearing para ver el orden y cuánto te ahorra.' },
  { title: 'Guardá todo', detail: 'Comprobantes, el acuerdo firmado y la constancia de cancelación. Con eso pedís la baja del registro y te cubrís de reclamos futuros.' },
])

export const CREDIT_REBUILD_STEPS: readonly Step[] = Object.freeze([
  { title: 'Pagá en tiempo y forma, y esperá', detail: 'Reconstruir es cuestión de historial nuevo y limpio. El antecedente "cancelada con atraso" queda 3-5 años; no hay atajo que lo borre antes.' },
  { title: 'Ojo con la lista negra interna del banco', detail: 'Cada banco guarda su propio registro. El banco donde fallaste puede no darte crédito aunque el Clearing esté limpio. A veces conviene reconstruir en otra institución.' },
  { title: 'Empezá con un producto chico y bien pagado', detail: 'Una tarjeta de límite bajo o prepaga, usada y pagada al día, genera historial positivo. Consistencia y tiempo, no monto.' },
  { title: 'Refinanciar puede ayudar (con criterio)', detail: 'Consolidar varias deudas caras en una más barata baja tu TEA y ordena las cuotas. Pero no saques un préstamo caro para pagar otro: eso es la "calesita" y agranda el pozo.' },
])

export interface VerdictCase {
  situation: string
  advice: string
  tone: 'good' | 'neutral' | 'warn'
}

export const VERDICT_CASES: readonly VerdictCase[] = Object.freeze([
  { situation: 'Tu deuda sigue en el acreedor original (banco o financiera)', advice: 'Andá directo a su canal de regularización (por ejemplo BROU Autogestión). No necesitás intermediario: cualquier plataforma te va a mandar igual a negociar con ellos.', tone: 'good' },
  { situation: 'Ya la tiene una recuperadora / estudio de cobranza', advice: 'Vas a negociar con ellos de todos modos. Una plataforma puede agilizar el trámite, pero verificá quién está detrás y exigí el acuerdo escrito y el finiquito antes de pagar.', tone: 'neutral' },
  { situation: 'No sabés qué deudas tenés ni con quién', advice: 'Empezá GRATIS: Central de Riesgos del BCU + informe de Clearing. Recién ahí decidí. No entregues tu cédula ni tus datos a una plataforma solo para "ver qué debés".', tone: 'neutral' },
  { situation: 'Te prometen "borrarte del Clearing" pagando una tarifa', advice: 'Es imposible y engañoso: del Clearing se sale pagando o por el paso del tiempo, no por una gestión pagada. No pagues por eso.', tone: 'warn' },
])

export interface UsuryCap {
  segmento: string
  tasaMedia: number
  topeTasa: number
  topeMora: number
}

export interface DebtReliefBaseline {
  asOf: string
  period: string
  usuryCaps: UsuryCap[]
  refiRates: { institucion: string; producto: string; tasa: string; nota: string }[]
}

/**
 * Dated verified snapshot. The monthly Gemini task overrides usuryCaps/refiRates
 * when it finds fresher, in-band values; otherwise this baseline is served as-is.
 * Verified figures: BCU "Tasas medias", período marzo–mayo 2026 (topes vigentes
 * desde el 1/7/2026). See spec §4.9 and research.
 */
export const DEBT_RELIEF_BASELINE: DebtReliefBaseline = Object.freeze({
  asOf: '2026-07-01',
  period: 'marzo–mayo 2026 (topes vigentes desde el 1/7/2026)',
  usuryCaps: [
    { segmento: 'Consumo con autorización de descuento, < 10.000 UI', tasaMedia: 21.16, topeTasa: 32.798, topeMora: 38.088 },
    { segmento: 'Consumo sin autorización de descuento, < 10.000 UI', tasaMedia: 80.72, topeTasa: 125.116, topeMora: 145.296 },
  ],
  refiRates: [
    { institucion: 'BBVA', producto: 'Préstamo Personal Unificación de Deuda', tasa: '24% en $ / 9% en UI (hasta 60 cuotas)', nota: 'Único que cancela deuda en OTRAS instituciones. Exige no tener antecedentes en Clearing ni BCU.' },
    { institucion: 'Itaú', producto: 'Reorganizá tus deudas', tasa: '42% TEA', nota: 'Solo unifica deuda propia dentro de Itaú.' },
    { institucion: 'OCA', producto: 'Reorganización de préstamos', tasa: '39–87% + IVA', nota: 'Solo saldo propio de OCA; exige tener >50% de las cuotas pagas.' },
    { institucion: 'ANDA', producto: 'Préstamo personal', tasa: '27,40–32,20% + IVA', nota: 'Cooperativa: presta estando en el Clearing (puede pedir garantía).' },
    { institucion: 'BROU', producto: 'Consumo / reestructura de morosos', tasa: 'Con retención 21–28% + IVA; sin retención 26–31% + IVA', nota: 'Campaña de reestructura: quita de intereses + bonificación de tasa para atrasos >360 días.' },
  ],
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/debtRelief.test.ts`
Expected: PASS (whole file).

- [ ] **Step 5: Commit**

```bash
git add app/utils/debtRelief.ts app/tests/unit/debtRelief.test.ts
git commit -m "feat(deudas): myths, steps, verdict cases + dated usury/refi baseline"
```

---

### Task 4: Live refresh server util + storage

**Files:**
- Create: `app/server/utils/debtReliefLive.ts`
- Modify: `app/nuxt.config.ts` (add `debt-relief` storage entry next to `costs`)
- Test: `app/tests/unit/debtReliefLive.test.ts`

**Interfaces:**
- Consumes: `DEBT_RELIEF_BASELINE`, `UsuryCap`, `DebtReliefBaseline` from `../../utils/debtRelief`.
- Produces:
  - `interface LiveDebtRelief extends DebtReliefBaseline { asOf: string | null; updated: string[]; sources: { label: string; url: string }[] }`
  - `function baselineDebtRelief(): LiveDebtRelief`
  - `function refreshLiveDebtRelief(): Promise<LiveDebtRelief>`
  - `function getStoredDebtRelief(): Promise<LiveDebtRelief | null>`
  - `function ageInDays(asOf: string | null): number`
  - `function applyLiveCaps(baseline: DebtReliefBaseline, data: Record<string, unknown>): { caps: UsuryCap[]; updated: string[] }` (exported for unit testing the guardrails)

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/debtReliefLive.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { applyLiveCaps } from '../../server/utils/debtReliefLive'
import { DEBT_RELIEF_BASELINE } from '../../utils/debtRelief'

describe('applyLiveCaps guardrails', () => {
  it('keeps baseline when the payload is empty', () => {
    const { caps, updated } = applyLiveCaps(DEBT_RELIEF_BASELINE, {})
    expect(updated).toEqual([])
    expect(caps).toEqual(DEBT_RELIEF_BASELINE.usuryCaps)
  })

  it('accepts an in-band tope and marks it updated', () => {
    const { caps, updated } = applyLiveCaps(DEBT_RELIEF_BASELINE, {
      topeConDescuento: 33.5,
      moraConDescuento: 39.0,
    })
    expect(updated).toContain('topeConDescuento')
    expect(caps[0].topeTasa).toBe(33.5)
  })

  it('rejects an absurd out-of-band value and keeps the baseline', () => {
    const { caps, updated } = applyLiveCaps(DEBT_RELIEF_BASELINE, {
      topeConDescuento: 5, // below the plausible band
    })
    expect(updated).not.toContain('topeConDescuento')
    expect(caps[0].topeTasa).toBe(DEBT_RELIEF_BASELINE.usuryCaps[0].topeTasa)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/debtReliefLive.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

Create `app/server/utils/debtReliefLive.ts`:

```ts
// Monthly self-updating layer for /saldar-deudas-uruguay. Uses Gemini grounded
// google-search to refresh the two volatile BCU usury-cap figures (con/sin
// autorización de descuento, < 10.000 UI) and merges validated values over the
// static verified baseline in ~/utils/debtRelief. Same endpoint + graceful-null
// + guardrail-band pattern as costOfLivingLive.ts.
//
// Guardrails: every fetched number must fall inside a plausible band or it is
// ignored (baseline kept). A hallucinated number can never make the page show
// something absurd; worst case it keeps the last-good / baseline data.
import { DEBT_RELIEF_BASELINE } from '../../utils/debtRelief'
import type { DebtReliefBaseline, UsuryCap } from '../../utils/debtRelief'

export interface LiveDebtRelief extends DebtReliefBaseline {
  asOf: string | null
  updated: string[]
  sources: { label: string; url: string }[]
}

const STORAGE = 'debt-relief'
const KEY = 'live'

/** Plausible bands (annual %). Outside → rejected, baseline kept. */
const BANDS = {
  topeConDescuento: [25, 45],
  moraConDescuento: [28, 55],
  topeSinDescuento: [90, 160],
  moraSinDescuento: [100, 190],
} as const

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> }
  }>
}

const inBand = (n: unknown, band: readonly [number, number]): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= band[0] && n <= band[1]

function cloneBaseline(): DebtReliefBaseline {
  return {
    asOf: DEBT_RELIEF_BASELINE.asOf,
    period: DEBT_RELIEF_BASELINE.period,
    usuryCaps: DEBT_RELIEF_BASELINE.usuryCaps.map(c => ({ ...c })),
    refiRates: DEBT_RELIEF_BASELINE.refiRates.map(r => ({ ...r })),
  }
}

/**
 * Merge validated live caps over a baseline. Pure + exported so the guardrails
 * are unit-testable without a network call. Index 0 = con descuento, 1 = sin.
 */
export function applyLiveCaps(
  baseline: DebtReliefBaseline,
  data: Record<string, unknown>
): { caps: UsuryCap[]; updated: string[] } {
  const caps = baseline.usuryCaps.map(c => ({ ...c }))
  const updated: string[] = []
  if (caps[0]) {
    if (inBand(data.topeConDescuento, BANDS.topeConDescuento)) {
      caps[0].topeTasa = data.topeConDescuento
      updated.push('topeConDescuento')
    }
    if (inBand(data.moraConDescuento, BANDS.moraConDescuento)) {
      caps[0].topeMora = data.moraConDescuento
      updated.push('moraConDescuento')
    }
  }
  if (caps[1]) {
    if (inBand(data.topeSinDescuento, BANDS.topeSinDescuento)) {
      caps[1].topeTasa = data.topeSinDescuento
      updated.push('topeSinDescuento')
    }
    if (inBand(data.moraSinDescuento, BANDS.moraSinDescuento)) {
      caps[1].topeMora = data.moraSinDescuento
      updated.push('moraSinDescuento')
    }
  }
  return { caps, updated }
}

const PROMPT = `Buscá con búsqueda real y citable los topes de usura vigentes que publica el Banco Central del Uruguay (Ley 18.212, "Tasas medias de interés") para crédito al CONSUMO de familias, en moneda nacional no reajustable, hasta 366 días, tramo menor a 10.000 UI. Necesito la TASA MÁXIMA (tope) efectiva anual, en porcentaje:
1. Con autorización de descuento (retención de haberes): tope de tasa y tope de mora.
2. Sin autorización de descuento: tope de tasa y tope de mora.
Respondé SOLO con un objeto JSON válido, sin texto ni markdown, con números en porcentaje sin el signo %:
{"topeConDescuento": <num>, "moraConDescuento": <num>, "topeSinDescuento": <num>, "moraSinDescuento": <num>}
Usá solo valores hallados en una búsqueda real (idealmente bcu.gub.uy). Si un dato no lo encontrás, poné null. No inventes.`

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as Record<string, unknown>
  } catch {
    return null
  }
}

export function baselineDebtRelief(): LiveDebtRelief {
  const b = cloneBaseline()
  return { ...b, asOf: null, updated: [], sources: [] }
}

export async function refreshLiveDebtRelief(): Promise<LiveDebtRelief> {
  const baseline = baselineDebtRelief()
  const apiKey = useRuntimeConfig().geminiApiKey as string | undefined
  if (!apiKey) return baseline

  try {
    const res = await $fetch<GeminiResponse>(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        query: { key: apiKey },
        body: { contents: [{ parts: [{ text: PROMPT }] }], tools: [{ google_search: {} }] },
        timeout: 30000,
      }
    )
    const candidate = res.candidates?.[0]
    const text = (candidate?.content?.parts ?? []).map(p => p.text ?? '').join('').trim()
    const data = parseJsonLoose(text)
    if (!data) return baseline

    const merged = cloneBaseline()
    const { caps, updated } = applyLiveCaps(merged, data)
    if (updated.length === 0) return baseline
    merged.usuryCaps = caps

    const chunks = candidate?.groundingMetadata?.groundingChunks ?? []
    const sources = chunks
      .map(c => c.web)
      .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
      .slice(0, 6)
      .map(w => ({ label: w.title || new URL(w.uri).hostname.replace(/^www\./, ''), url: w.uri }))

    const live: LiveDebtRelief = {
      ...merged,
      asOf: new Date().toISOString(),
      updated,
      sources,
    }
    await useStorage(STORAGE).setItem(KEY, live)
    return live
  } catch {
    return baseline
  }
}

export async function getStoredDebtRelief(): Promise<LiveDebtRelief | null> {
  return (await useStorage(STORAGE).getItem<LiveDebtRelief>(KEY)) ?? null
}

export function ageInDays(asOf: string | null): number {
  if (!asOf) return Infinity
  const t = new Date(asOf).getTime()
  if (!Number.isFinite(t)) return Infinity
  return (Date.now() - t) / 86400000
}
```

- [ ] **Step 4: Add the storage bucket** — in `app/nuxt.config.ts`, find the `costs` storage entry (search for `Durable store for the live cost-of-living figures`) and add immediately after its closing `},`:

```ts
      // Durable store for the live debt-relief figures (debt-relief:monthly).
      'debt-relief': {
        driver: 'fs',
        base: './.data/debt-relief',
      },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/debtReliefLive.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/server/utils/debtReliefLive.ts app/tests/unit/debtReliefLive.test.ts app/nuxt.config.ts
git commit -m "feat(deudas): monthly Gemini refresh util for usury caps (guardrailed)"
```

---

### Task 5: API endpoint + monthly scheduled task

**Files:**
- Create: `app/server/api/debt-relief.get.ts`
- Create: `app/server/tasks/debt-relief/monthly.ts`
- Modify: `app/nuxt.config.ts` (`scheduledTasks`)

**Interfaces:**
- Consumes: `getStoredDebtRelief`, `refreshLiveDebtRelief`, `baselineDebtRelief`, `ageInDays` from `../utils/debtReliefLive`.
- Produces: `GET /api/debt-relief` → `LiveDebtRelief`; task `debt-relief:monthly`.

- [ ] **Step 1: Create the API handler**

Create `app/server/api/debt-relief.get.ts`:

```ts
// Live debt-relief figures (usury caps + refi rates) for /saldar-deudas-uruguay.
// Returns the verified baseline merged with the monthly Gemini refresh when
// available. Cached; a stale/missing store triggers a background refresh so the
// numbers stay current on their own. Mirrors /api/cost-of-living.
import {
  getStoredDebtRelief,
  refreshLiveDebtRelief,
  baselineDebtRelief,
  ageInDays,
} from '../utils/debtReliefLive'

let inFlight = false

export default defineCachedEventHandler(
  async () => {
    const stored = await getStoredDebtRelief()
    // Monthly cadence → treat anything under ~35 days old as fresh.
    if (stored && ageInDays(stored.asOf) < 35) return stored

    if (!inFlight) {
      inFlight = true
      refreshLiveDebtRelief()
        .catch(() => {})
        .finally(() => {
          inFlight = false
        })
    }
    return stored ?? baselineDebtRelief()
  },
  {
    maxAge: 60 * 60 * 6, // 6h
    staleMaxAge: 60 * 60 * 24 * 40,
    name: 'debt-relief-v1',
    getKey: () => 'live',
  }
)
```

- [ ] **Step 2: Create the scheduled task**

Create `app/server/tasks/debt-relief/monthly.ts`:

```ts
// Nitro scheduled task: refresh the live debt-relief figures (BCU usury caps)
// via Gemini grounded search, so /saldar-deudas-uruguay stays current without
// manual edits. Registered in nuxt.config under nitro.scheduledTasks. Graceful:
// with no Gemini key it is a no-op that keeps the verified baseline.
import { refreshLiveDebtRelief } from '../../utils/debtReliefLive'

export default defineTask({
  meta: {
    name: 'debt-relief:monthly',
    description: 'Refresh live debt-relief figures (usury caps) via Gemini grounded search',
  },
  async run() {
    const live = await refreshLiveDebtRelief()
    return { result: { asOf: live.asOf, updated: live.updated } }
  },
})
```

- [ ] **Step 3: Register the cron** — in `app/nuxt.config.ts` `scheduledTasks`, add after the `figures:daily` line:

```ts
      // 10:10 UTC on the 1st ≈ 07:10 Uruguay: refresh debt-relief usury caps (monthly).
      '10 10 1 * *': ['debt-relief:monthly'],
```

- [ ] **Step 4: Verify the endpoint serves the baseline**

Run (from `app/`): `npx vitest run tests/unit/debtRelief.test.ts tests/unit/debtReliefLive.test.ts`
Expected: PASS (no regressions). The endpoint itself is exercised via the page in Task 8; here just confirm the units are green.

- [ ] **Step 5: Commit**

```bash
git add app/server/api/debt-relief.get.ts app/server/tasks/debt-relief/monthly.ts app/nuxt.config.ts
git commit -m "feat(deudas): /api/debt-relief endpoint + monthly refresh task"
```

---

### Task 6: Page skeleton + nav registration + i18n (coverage green)

Land the page file, the nav entry and the locale labels together so
`siteNav-coverage.test.ts` (which cross-checks pages↔nav both ways) stays green.

**Files:**
- Create: `app/pages/saldar-deudas-uruguay.vue`
- Modify: `app/utils/siteNav.ts`
- Modify: `app/i18n/locales/json/es.json`, `en.json`, `pt.json`
- Test: `app/tests/unit/siteNav-coverage.test.ts` (existing; must pass unchanged)

**Interfaces:**
- Produces: route `/saldar-deudas-uruguay`; nav label key `nav.saldarDeudas`.

- [ ] **Step 1: Create the page skeleton**

Create `app/pages/saldar-deudas-uruguay.vue`:

```vue
<template>
  <VContainer class="page py-6" style="max-width: 1100px">
    <VBtn :to="localePath('/salud-financiera')" variant="text" size="small" class="px-1 mb-2">
      <VIcon start icon="mdi-arrow-left" /> Salud financiera
    </VBtn>

    <VCard class="hero pa-6 pa-md-8 mb-6" rounded="xl">
      <div class="eyebrow mb-2">Guía práctica · Uruguay</div>
      <h1 class="hero-title mb-3">Saldar deudas en Uruguay: cómo negociar, y si conviene ChauDeudas o MiDeuda</h1>
      <p class="hero-lead mb-4">
        Conseguiste trabajo y querés ponerte al día para mejorar tu historial. Esta guía te muestra
        qué hacer gratis primero, cómo negociar una quita vos mismo, y qué son realmente las
        plataformas de "solución de deudas" — con datos, no promesas.
      </p>
      <ShareButtons text="Saldar deudas en Uruguay: guía y comparativa de servicios" />
    </VCard>

    <!-- Sections added in Tasks 7 and 8 -->

    <VAlert type="info" variant="tonal" class="mt-8" density="comfortable">
      Información con fines educativos, no asesoramiento financiero ni legal. Cada caso concreto
      requiere un abogado. Verificá siempre los datos en la fuente oficial.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
const localePath = useLocalePath()

const title = 'Saldar deudas en Uruguay: cómo negociar y si conviene ChauDeudas o MiDeuda'
const description =
  'Guía para saldar deudas viejas en Uruguay: verificá prescripción, negociá una quita vos mismo, comparativa honesta de ChauDeudas, MiDeuda y otras, y cómo reconstruir tu historial crediticio.'
const canonicalUrl = 'https://cambio-uruguay.com/saldar-deudas-uruguay'

defineOgImageComponent('Cambio', {
  title: 'Saldar deudas en Uruguay',
  subtitle: 'Negociar, comparar servicios y reconstruir tu historial',
  tag: 'Guía',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'saldar deudas uruguay, chaudeudas opiniones, mideuda vale la pena, negociar deuda uruguay, quita de deuda, salir de deudas uruguay, prescripción deuda, clearing',
    },
  ],
}))
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.16), rgba(var(--v-theme-primary), 0.04));
  border: 1px solid rgba(var(--v-border-color), 0.16);
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.hero-title {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 800;
  line-height: 1.15;
}
.hero-lead {
  font-size: 1.05rem;
  opacity: 0.9;
  max-width: 60ch;
}
.section-heading {
  font-size: 1.35rem;
  font-weight: 750;
  border-left: 4px solid rgb(var(--v-theme-primary));
  padding-left: 0.6rem;
  margin: 2rem 0 1rem;
}
.cross-link {
  display: block;
  border: 1px solid rgba(var(--v-border-color), 0.18);
  border-radius: 14px;
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.cross-link:hover {
  transform: translateY(-2px);
  border-color: rgb(var(--v-theme-primary));
}
</style>
```

- [ ] **Step 2: Register in siteNav** — in `app/utils/siteNav.ts`, find the `services` section entry for `/salir-del-clearing` and add a sibling entry immediately after it:

```ts
    {
      to: '/saldar-deudas-uruguay',
      labelKey: 'nav.saldarDeudas',
      icon: 'mdi-handshake-outline',
      keywords: ['saldar deudas', 'chaudeudas', 'mideuda', 'negociar deuda', 'quita', 'recuperadora', 'prescripción', 'refinanciar deuda', 'historial crediticio'],
      priority: 0.7,
      changefreq: 'monthly',
    },
```

- [ ] **Step 3: Add the nav label to all three locales**

In `app/i18n/locales/json/es.json`, next to the existing `"salirClearing"` key inside the `nav` object, add:
```json
"saldarDeudas": "Saldar deudas",
```
In `app/i18n/locales/json/en.json`, same place:
```json
"saldarDeudas": "Settle debts",
```
In `app/i18n/locales/json/pt.json`, same place:
```json
"saldarDeudas": "Quitar dívidas",
```

- [ ] **Step 4: Run the coverage + scorer tests**

Run: `npx vitest run tests/unit/siteNav-coverage.test.ts tests/unit/siteNav-scorer.test.ts tests/unit/sitemap-urls.test.ts`
Expected: PASS (page resolves, nav entry valid, no duplicates, label present).

- [ ] **Step 5: Commit**

```bash
git add app/pages/saldar-deudas-uruguay.vue app/utils/siteNav.ts app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(deudas): page skeleton + nav entry + i18n labels"
```

---

### Task 7: Static content sections (TL;DR, myths, negotiation, verdict, rebuild, rights, sources)

Flesh out the page body with the data-driven prose sections. All content comes
from `~/utils/debtRelief`; the template just loops.

**Files:**
- Modify: `app/pages/saldar-deudas-uruguay.vue`

**Interfaces:**
- Consumes: `DEBT_MYTHS`, `NEGOTIATION_STEPS`, `VERDICT_CASES`, `CREDIT_REBUILD_STEPS`, `DEBT_RELIEF_BASELINE` from `~/utils/debtRelief`.

- [ ] **Step 1: Import the data** — in the page `<script setup>`, add below `const localePath`:

```ts
import {
  DEBT_MYTHS,
  NEGOTIATION_STEPS,
  VERDICT_CASES,
  CREDIT_REBUILD_STEPS,
  DEBT_RELIEF_BASELINE,
} from '~/utils/debtRelief'
import { formatNumber } from '~/utils/format'

const verdictColor = (tone: 'good' | 'neutral' | 'warn') =>
  tone === 'good' ? 'success' : tone === 'warn' ? 'warning' : 'info'

const sources = [
  { label: 'BCU — Consulta de deuda (Central de Riesgos)', url: 'https://consultadeuda.bcu.gub.uy/consultadeuda/' },
  { label: 'BCU — Tasas medias / topes de usura (Ley 18.212)', url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Tasas-Medias.aspx' },
  { label: 'Ley 18.331 (Protección de Datos) art. 22 — IMPO', url: 'https://www.impo.com.uy/bases/leyes/18331-2008/22' },
  { label: 'Equifax Uruguay — informe personal gratis', url: 'https://www.equifax.uy/personales/faqs/' },
  { label: 'Ley 17.829 (retenciones sobre el sueldo) — IMPO', url: 'https://www.impo.com.uy/bases/leyes/17829-2004/3' },
  { label: 'Defensa del Consumidor (MEF) — 0800 7005', url: 'https://www.gub.uy/tramites/consulta-reclamo-yo-denuncia-materia-defensa-consumidor' },
  { label: 'URCDP — denuncias de datos personales', url: 'https://www.gub.uy/tramites/denuncias-unidad-reguladora-control-datos-personales-urcdp' },
]
```

- [ ] **Step 2: Add the section markup** — replace the `<!-- Sections added in Tasks 7 and 8 -->` comment with:

```vue
      <!-- TL;DR -->
      <VCard variant="tonal" color="primary" class="pa-5 mb-6" rounded="lg">
        <h2 class="text-h6 font-weight-bold mb-2">La respuesta corta</h2>
        <p class="mb-2">
          ChauDeudas y MiDeuda no son estafa, pero rara vez son tu mejor opción: son plataformas de
          empresas de cobranza que te cobran gratis a vos porque le cobran al acreedor. Hacen —a
          cambio de tus datos— algo que podés hacer solo y gratis.
        </p>
        <p class="mb-0">
          <strong>Hacé esto primero, gratis:</strong> consultá tu situación en la Central de Riesgos
          del BCU (<a href="https://consultadeuda.bcu.gub.uy/consultadeuda/" target="_blank" rel="noopener">consultadeuda.bcu.gub.uy</a>)
          y pedí tu informe de Clearing, que te toca gratis cada 6 meses. Recién ahí decidí.
        </p>
      </VCard>

      <!-- 4 verdades / myths -->
      <h2 class="section-heading">Antes de pagar un peso: 4 verdades que te ahorran plata</h2>
      <VRow>
        <VCol v-for="m in DEBT_MYTHS" :key="m.myth" cols="12" md="6">
          <VCard class="pa-4 h-100" variant="outlined" rounded="lg">
            <div class="text-medium-emphasis mb-1">{{ m.myth }}</div>
            <p class="mb-2">{{ m.truth }}</p>
            <div class="text-caption text-medium-emphasis">{{ m.norma }}</div>
          </VCard>
        </VCol>
      </VRow>

      <!-- Negotiation playbook -->
      <h2 class="section-heading">Cómo negociar una quita vos mismo</h2>
      <VExpansionPanels variant="accordion" class="mb-2">
        <VExpansionPanel v-for="(s, i) in NEGOTIATION_STEPS" :key="s.title">
          <VExpansionPanelTitle>
            <span class="font-weight-bold mr-2">{{ i + 1 }}.</span> {{ s.title }}
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ s.detail }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
      <p class="text-caption text-medium-emphasis">
        Cifras de quita reportadas por usuarios de
        <a href="https://reddit.com/r/uruguay/comments/1dhwy89" target="_blank" rel="noopener">r/uruguay</a>;
        no son garantía. ¿Varias deudas? Ordénalas con el
        <NuxtLink :to="localePath('/salir-del-clearing')">simulador de pago</NuxtLink>.
      </p>

      <!-- Verdict by case -->
      <h2 class="section-heading">Veredicto honesto, según tu caso</h2>
      <VRow>
        <VCol v-for="v in VERDICT_CASES" :key="v.situation" cols="12" md="6">
          <VAlert :type="verdictColor(v.tone)" variant="tonal" class="h-100" density="comfortable">
            <div class="font-weight-bold mb-1">{{ v.situation }}</div>
            <div>{{ v.advice }}</div>
          </VAlert>
        </VCol>
      </VRow>

      <!-- Credit rebuild -->
      <h2 class="section-heading">Reconstruir tu historial crediticio</h2>
      <VRow>
        <VCol v-for="s in CREDIT_REBUILD_STEPS" :key="s.title" cols="12" md="6">
          <VCard class="pa-4 h-100" variant="outlined" rounded="lg">
            <div class="font-weight-bold mb-1">{{ s.title }}</div>
            <p class="mb-0">{{ s.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
      <p class="mt-3">
        ¿Necesitás consolidar? Compará opciones de refinanciación en
        <NuxtLink :to="localePath('/prestamos-uruguay')">préstamos en Uruguay</NuxtLink>.
      </p>
      <VTable density="comfortable" class="mt-2">
        <thead>
          <tr><th>Institución</th><th>Producto</th><th>Tasa</th><th>Nota</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in DEBT_RELIEF_BASELINE.refiRates" :key="r.institucion + r.producto">
            <td class="font-weight-medium">{{ r.institucion }}</td>
            <td>{{ r.producto }}</td>
            <td>{{ r.tasa }}</td>
            <td class="text-caption">{{ r.nota }}</td>
          </tr>
        </tbody>
      </VTable>

      <!-- Rights -->
      <h2 class="section-heading">Tus derechos y dónde denunciar</h2>
      <VRow>
        <VCol cols="12" md="4">
          <VCard class="pa-4 h-100" variant="outlined" rounded="lg">
            <div class="font-weight-bold mb-1">Usura (Ley 18.212)</div>
            <p class="mb-0 text-body-2">
              Se compara la tasa real (TIR), no la nominal. El tope es la tasa media del BCU + 55%
              (o + 80% en mora) para créditos chicos. Si te cobraron de más, caduca el derecho a
              cobrarte intereses y el juez lo releva de oficio.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard class="pa-4 h-100" variant="outlined" rounded="lg">
            <div class="font-weight-bold mb-1">Cobranza abusiva</div>
            <p class="mb-0 text-body-2">
              No pueden contarle tu deuda a tu empleador ni a tu familia (Ley 18.331 art. 11), ni
              amenazarte con cárcel. Denunciá en Defensa del Consumidor: 0800 7005.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard class="pa-4 h-100" variant="outlined" rounded="lg">
            <div class="font-weight-bold mb-1">Datos y Clearing</div>
            <p class="mb-0 text-body-2">
              Si figura un dato caduco o erróneo, pedí su rectificación o supresión. Si no cumplen,
              denunciá ante la URCDP.
            </p>
          </VCard>
        </VCol>
      </VRow>

      <!-- Sources + cross-links -->
      <h2 class="section-heading">Fuentes</h2>
      <VCard variant="outlined" class="pa-4 mb-6" rounded="lg">
        <ul class="mb-0">
          <li v-for="s in sources" :key="s.url">
            <a :href="s.url" target="_blank" rel="noopener">{{ s.label }}</a>
          </li>
        </ul>
      </VCard>

      <VRow>
        <VCol cols="12" md="4">
          <NuxtLink :to="localePath('/salir-del-clearing')" class="cross-link pa-4 h-100">
            <div class="font-weight-bold mb-1">Salir del Clearing</div>
            <div class="text-body-2 text-medium-emphasis">Simulador de pago de deudas y calculadora de la tasa real que te cobran.</div>
          </NuxtLink>
        </VCol>
        <VCol cols="12" md="4">
          <NuxtLink :to="localePath('/prestamos-uruguay')" class="cross-link pa-4 h-100">
            <div class="font-weight-bold mb-1">Préstamos en Uruguay</div>
            <div class="text-body-2 text-medium-emphasis">Compará tasas para refinanciar o consolidar deudas.</div>
          </NuxtLink>
        </VCol>
        <VCol cols="12" md="4">
          <NuxtLink :to="localePath('/salud-financiera')" class="cross-link pa-4 h-100">
            <div class="font-weight-bold mb-1">Salud financiera</div>
            <div class="text-body-2 text-medium-emphasis">Medí tu situación y armá un presupuesto que aguante.</div>
          </NuxtLink>
        </VCol>
      </VRow>
```

- [ ] **Step 2b: Remove the now-unused import guard** — confirm `formatNumber` is used; if the linter flags it as unused (Task 8 uses it), leave the import and it will be consumed there. If Task 8 is not yet done, temporarily drop `formatNumber` from the import to keep lint green, and re-add it in Task 8.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors for `pages/saldar-deudas-uruguay.vue`.

- [ ] **Step 4: Visual check (dev)**

Start dev if not running (`npm run dev`), open `http://localhost:3000/saldar-deudas-uruguay`, confirm all sections render in both light and dark themes with no hydration warning in the console.

- [ ] **Step 5: Commit**

```bash
git add app/pages/saldar-deudas-uruguay.vue
git commit -m "feat(deudas): static sections (TL;DR, mitos, negociación, veredicto, historial, derechos)"
```

---

### Task 8: Interactive prescription tool + live comparison table

**Files:**
- Modify: `app/pages/saldar-deudas-uruguay.vue`

**Interfaces:**
- Consumes: `PRESCRIPTION_TYPES`, `checkPrescription`, `RELIEF_RUBRIC`, `rankedServices` from `~/utils/debtRelief`; `GET /api/debt-relief` via `useLazyFetch`.

- [ ] **Step 1: Extend the script** — add to the imports and logic in `<script setup>`:

```ts
import {
  PRESCRIPTION_TYPES,
  checkPrescription,
  RELIEF_RUBRIC,
  rankedServices,
  type LiveDebtRelief,
} from '~/utils/debtRelief'

// --- Prescription tool state ---
const presType = ref(PRESCRIPTION_TYPES[0].id)
const presDate = ref('') // yyyy-mm-dd from <input type="date">
const presResult = computed(() => {
  if (!presDate.value) return null
  const today = new Date().toISOString().slice(0, 10)
  return checkPrescription(presType.value, presDate.value, today)
})
const yearsMonths = (months: number) => {
  const y = Math.floor(months / 12)
  const m = months % 12
  return [y ? `${y} año${y === 1 ? '' : 's'}` : '', m ? `${m} mes${m === 1 ? '' : 'es'}` : '']
    .filter(Boolean)
    .join(' y ') || '0 meses'
}

// --- Ranked services (computed from the rubric) ---
const ranked = rankedServices()
const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '')

// --- Live usury caps (non-blocking) ---
// Do NOT await: awaiting makes this an async component (Suspense) and triggers the
// known first-click hydration bug. useLazyFetch is non-blocking by design.
const { data: live } = useLazyFetch<LiveDebtRelief>('/api/debt-relief', { server: false })
```

Note: `LiveDebtRelief` is declared in `app/server/utils/debtReliefLive.ts`. To import it from `~/utils/debtRelief` as written above, re-export the type from the pure util. Add to the **end** of `app/utils/debtRelief.ts`:

```ts
// Shape returned by /api/debt-relief (baseline + live overrides). Declared here
// so the page can import it from the pure util without reaching into server/.
export interface LiveDebtRelief extends DebtReliefBaseline {
  asOf: string | null
  updated: string[]
  sources: { label: string; url: string }[]
}
```

Then change `app/server/utils/debtReliefLive.ts` to import and re-export that type instead of redeclaring it: replace its local `export interface LiveDebtRelief …{}` block with:

```ts
import { DEBT_RELIEF_BASELINE } from '../../utils/debtRelief'
import type { DebtReliefBaseline, UsuryCap, LiveDebtRelief } from '../../utils/debtRelief'
export type { LiveDebtRelief }
```

(Keep the rest of the server util unchanged.)

- [ ] **Step 2: Insert the prescription tool + comparison markup** — place the prescription tool right after the "4 verdades" `VRow`, and the comparison right before the "Veredicto honesto" heading:

```vue
      <!-- Prescription tool -->
      <h2 class="section-heading">¿Tu deuda pudo prescribir?</h2>
      <VCard variant="outlined" class="pa-4 mb-2" rounded="lg">
        <VRow align="center">
          <VCol cols="12" md="6">
            <VSelect
              v-model="presType"
              :items="PRESCRIPTION_TYPES.map(t => ({ title: t.label, value: t.id }))"
              label="Tipo de deuda"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="presDate"
              type="date"
              label="Fecha del último pago o vencimiento"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
        </VRow>

        <VAlert
          v-if="presResult"
          :type="presResult.mayHaveExpired ? 'success' : 'info'"
          variant="tonal"
          class="mt-4"
        >
          <div class="font-weight-bold mb-1">
            Plazo legal: {{ yearsMonths(presResult.months) }} · {{ presResult.norma }}
          </div>
          <div v-if="presResult.mayHaveExpired" class="mb-2">
            Pasaron {{ yearsMonths(presResult.monthsElapsed) }}: el plazo legal de cobro
            <strong>pudo</strong> haberse cumplido.
          </div>
          <div v-else class="mb-2">
            Pasaron {{ yearsMonths(presResult.monthsElapsed) }}; faltarían
            {{ yearsMonths(presResult.monthsRemaining) }} para cumplir el plazo.
          </div>
          <div class="text-body-2">{{ presResult.caveat }}</div>
        </VAlert>
      </VCard>

      <!-- Live usury caps note -->
      <VAlert v-if="live" type="info" variant="text" density="compact" class="mb-6 text-caption">
        Topes de usura vigentes ({{ live.period }}): sin descuento &lt; 10.000 UI, tope
        {{ formatNumber(live.usuryCaps[1]?.topeTasa ?? 0, 2) }}%. Si tu tasa real supera el tope,
        podés reclamar.
      </VAlert>

      <!-- Comparison table (computed rubric) -->
      <h2 class="section-heading">Las plataformas, comparadas</h2>
      <p class="mb-3 text-body-2 text-medium-emphasis">
        Puntaje 0–100 calculado con una rúbrica ponderada
        ({{ RELIEF_RUBRIC.map(d => `${d.label} ${d.weight}%`).join(' · ') }}). La línea base
        "negociar directo" es el patrón contra el que se miden las plataformas.
      </p>
      <div style="overflow-x: auto">
        <VTable density="comfortable">
          <thead>
            <tr>
              <th>#</th><th>Servicio</th><th>Quién está detrás</th><th>¿Quién paga?</th>
              <th>¿BCU?</th><th class="text-right">Puntaje</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in ranked" :key="s.id">
              <td>{{ medal(s.rank) || s.rank }}</td>
              <td class="font-weight-medium">{{ s.name }}</td>
              <td class="text-caption">{{ s.operador }}</td>
              <td class="text-caption">{{ s.quienPaga }}</td>
              <td>{{ s.bcuRegulado ? 'Sí' : 'No' }}</td>
              <td class="text-right font-weight-bold">{{ s.overall }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <VExpansionPanels variant="accordion" class="mt-3 mb-2">
        <VExpansionPanel v-for="s in ranked" :key="s.id">
          <VExpansionPanelTitle>{{ medal(s.rank) || (s.rank + '.') }} {{ s.name }} — {{ s.overall }}/100</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="mb-2">{{ s.transparencia }}</p>
            <div class="text-caption text-medium-emphasis mb-2">Qué documenta: {{ s.documenta }}</div>
            <div class="text-caption">
              Fuentes:
              <a v-for="src in s.sources" :key="src.url" :href="src.url" target="_blank" rel="noopener" class="mr-2">{{ src.label }}</a>
            </div>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: clean (all imports now used, including `formatNumber`).

- [ ] **Step 4: Unit + coverage regression**

Run: `npx vitest run tests/unit/debtRelief.test.ts tests/unit/debtReliefLive.test.ts tests/unit/siteNav-coverage.test.ts`
Expected: PASS.

- [ ] **Step 5: Visual check (dev)**

Open `http://localhost:3000/saldar-deudas-uruguay`. Verify:
- Selecting a debt type + a date ≥ the plazo shows the green "pudo haberse cumplido" alert with the caveat; a recent date shows the blue "faltarían…" alert.
- The comparison table renders with 🥇 on "Negociar directo" and computed scores descending.
- No horizontal page scroll on mobile width (the table scrolls inside its own container).
- Light and dark both legible.

- [ ] **Step 6: Commit**

```bash
git add app/pages/saldar-deudas-uruguay.vue app/utils/debtRelief.ts app/server/utils/debtReliefLive.ts
git commit -m "feat(deudas): prescription tool + computed rubric comparison + live usury caps"
```

---

### Task 9: Refactor `/salir-del-clearing` + fix FAQ + cross-links

**Files:**
- Modify: `app/pages/salir-del-clearing.vue` (trim the "Cómo salir, en concreto" section ~line 380; add cross-link)
- Modify: `app/utils/personalFinanceFaq.ts` (fix the `salir-del-clearing` FAQ, ~lines 163–168)
- Modify: `app/pages/salud-financiera.vue` (add cross-links to both debt pages)
- Test: `app/tests/unit/personalFinanceFaq.test.ts` if it exists (else lint only)

- [ ] **Step 1: Fix the FAQ inconsistency** — in `app/utils/personalFinanceFaq.ts`, the `salir-del-clearing` entry currently says the paid debt stays "2 años". Replace its `shortAnswer` and `answer` with the verified plazos:

`shortAnswer` →
```
Pagando o negociando la deuda (una vez cancelada queda registrada hasta 5 años más; en la práctica Equifax la muestra ~3) o esperando el plazo legal (5 años impaga, renovable una vez).
```
In `answer`, replace the clause "las impagas quedan hasta 5 años desde el último incumplimiento y las pagas 2 años desde que las cancelaste" with:
```
las impagas quedan 5 años desde su incorporación (renovable por otros 5 si siguen sin pagarse) y, una vez canceladas, quedan registradas como "canceladas" hasta 5 años más (en la práctica Equifax las muestra unos 3)
```

- [ ] **Step 2: Trim the overlap in salir-del-clearing** — open `app/pages/salir-del-clearing.vue`, find the "Cómo salir, en concreto" section (heading ~line 380 with its 6-step `<ol>`). Replace the full step list with a short pointer, keeping the heading:

```vue
        <p class="mb-3">
          El paso a paso para negociar una quita, la comparativa honesta de servicios como
          ChauDeudas y MiDeuda, y cómo reconstruir tu historial están en una guía aparte.
        </p>
        <VBtn :to="localePath('/saldar-deudas-uruguay')" color="primary" variant="flat">
          Ver la guía para saldar deudas
          <VIcon end icon="mdi-arrow-right" />
        </VBtn>
```

Keep the existing "desconfiá de quien cobre por borrarte" alert that follows.

- [ ] **Step 3: Add cross-links in salud-financiera** — in `app/pages/salud-financiera.vue`, locate the cross-link `VRow` at the foot of the page and ensure it includes a card to `/saldar-deudas-uruguay` (and to `/salir-del-clearing` if not already present), following the existing `.cross-link` card markup in that file:

```vue
        <VCol cols="12" md="4">
          <NuxtLink :to="localePath('/saldar-deudas-uruguay')" class="cross-link pa-4 h-100">
            <div class="font-weight-bold mb-1">Saldar deudas</div>
            <div class="text-body-2 text-medium-emphasis">Negociá una quita, compará servicios y reconstruí tu historial.</div>
          </NuxtLink>
        </VCol>
```

- [ ] **Step 4: Lint + affected tests**

Run: `npm run lint`
Run: `npx vitest run tests/unit/personalFinanceFaq.test.ts` (skip if the file does not exist).
Expected: clean / PASS.

- [ ] **Step 5: Visual check** — open `/salir-del-clearing` and `/salud-financiera` in dev; confirm the trimmed section shows the button to the new guide and the cross-link cards navigate correctly.

- [ ] **Step 6: Commit**

```bash
git add app/pages/salir-del-clearing.vue app/utils/personalFinanceFaq.ts app/pages/salud-financiera.vue
git commit -m "refactor(deudas): trim overlap in /salir-del-clearing, fix Clearing FAQ, cross-link"
```

---

### Task 10: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the whole unit suite for touched modules**

Run (from `app/`):
```bash
npx vitest run tests/unit/debtRelief.test.ts tests/unit/debtReliefLive.test.ts tests/unit/siteNav-coverage.test.ts tests/unit/siteNav-scorer.test.ts tests/unit/sitemap-urls.test.ts
```
Expected: all PASS.

- [ ] **Step 2: Lint the whole app**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Drive the page end-to-end** — with `npm run dev` running, in a browser (or the run/verify skill):
  1. `/saldar-deudas-uruguay` loads with no console errors, light + dark.
  2. Prescription tool: `cheque` + a date 8 months ago → green "pudo haberse cumplido"; `prestamo_personal` + 2 years ago → blue "faltarían…".
  3. Comparison table: 🥇 Negociar directo, scores descending, expansion panels show sources.
  4. `/api/debt-relief` returns JSON (baseline is fine without a Gemini key): `curl -s localhost:3000/api/debt-relief` → has `usuryCaps` and `refiRates`.
  5. `/salir-del-clearing` shows the trimmed section + button to the new guide.
  6. Nav/search: the page appears in the site search (Ctrl+K "saldar deudas").

- [ ] **Step 4: Final commit if anything changed during verification** (otherwise skip).

```bash
git add -A && git commit -m "chore(deudas): verification fixes"
```

---

## Self-Review

**Spec coverage:** every spec section maps to a task — §4.2 TL;DR + §4.3 myths + §4.5 negotiation + §4.7 verdict + §4.8 rebuild + §4.9 rights + §4.10 sources → Task 7; §4.4 prescription tool + §4.6 comparison → Tasks 1/2/8; §5.2–5.4 live/API/task → Tasks 4/5; §5.6 refactor → Task 9; §5.7 nav/i18n → Task 6; §5.8 SEO → Task 6. Verification → Task 10.

**Placeholder scan:** no TBD/TODO; every code step shows full code; the one cross-file type move (LiveDebtRelief) is spelled out in Task 8 Step 1.

**Type consistency:** `checkPrescription`, `computeReliefScore`, `rankedServices`, `RankedService.overall/rank`, `LiveDebtRelief`, `applyLiveCaps`, `DEBT_RELIEF_BASELINE.usuryCaps[0|1]` used consistently across tasks. `RubricId` union matches the six rubric dimensions and every service's `scores` keys.
