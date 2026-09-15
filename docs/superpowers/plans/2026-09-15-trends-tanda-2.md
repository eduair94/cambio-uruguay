# Oportunidades de Trends, segunda tanda — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar la comparativa de garantías de alquiler, la página del suplemento solidario del BPS, la página de comisiones de Mercado Pago, y refrescar UTE (Plan Redondo, corte de luz), seguro de paro (paro parcial) y monotributo (categorías 2026).

**Architecture:** Sólo app Nuxt 4: catálogos puros en `app/utils/*.ts` + páginas `.vue` + tests vitest-node, mismo patrón que la tanda 1 (`docs/superpowers/plans/2026-09-15-trends-oportunidades.md`). Sin backend.

**Tech Stack:** Nuxt 4 + Vuetify 4, vitest, eslint/prettier.

**Spec:** `docs/superpowers/specs/2026-09-15-trends-tanda-2-design.md`

## Global Constraints

- App utils puros: sin imports de Vue/Nuxt, **imports relativos**. Páginas: raíz `VContainer`, un solo `<h1>`, `useSeoMeta` + canonical + `application/ld+json` con `BreadcrumbList` (+ `Article`); `<FaqSection :items="faq" heading="Preguntas frecuentes" expanded />` emite FAQPage solo (no duplicar); `defineOgImageComponent('Cambio', { title, subtitle, tag })`; base del `title` ≤ 43 caracteres; `description` ≤ 160; tablas anchas con `cu-mobile-cards` + `data-label` en cada `<td>` y `scope="col"` en cada `<th>`; radios sólo 4/8/12/16 px; "setiembre" nunca "septiembre"; sin `|` en mensajes i18n.
- Guías (`Guide` en `app/utils/guides.ts:25-118`): cuerpos en prosa plana (sin markdown/HTML), `faqs` `{ q, a }`, `sources` https, tablas con `headers.length > 1` y filas del mismo largo, `related[].to` con `/`; regla `TOOL_MENTIONS` (nombrar una calculadora obliga a enlazarla).
- **Hechos**: cada número sale de los dossiers del scratchpad (`C:\Users\airau\AppData\Local\Temp\claude\c--Users-airau-Documents-GitHub-cambio-uruguay\108f6a94-a224-402a-adf2-225218438b9d\scratchpad\dossier-*.md`) o de las URLs citadas en la tarea, con la etiqueta [OFICIAL]/[SECUNDARIA]. Un número secundario se publica como aproximación explícita ("según relevamientos del mercado, alrededor de…") o se reemplaza por "no publica el costo: cotizá". Nunca se inventa.
- Prettier vía eslint (sin punto y coma, comillas simples, `arrowParens: avoid`, printWidth 100, trailingComma es5, 2 espacios). `npm run typecheck` está roto. Lint sólo de los archivos propios (`npx eslint --fix <files>` desde `app/`).
- Los implementadores **no** editan `app/utils/siteNav.ts` ni `app/i18n/**` (la integración lo hace) y **no** commitean.
- Fecha de hoy: 2026-09-15. Fechas de verificación (`*_VERIFIED_AT`, `updatedAt`): `'2026-09-15'`.

---

### Task 1 (F): Guía de garantías → comparativa

**Files:**
- Modify: `app/utils/guidesReddit.ts` — la entrada `slug: 'garantias-de-alquiler-uruguay'` (~línea 392; sólo esa entrada)
- Create: `app/tests/unit/guidesGarantias.test.ts`

**Interfaces:**
- Consumes: `Guide` (`./guides`), dossier `dossier-garantias.md` (secciones 1–7 y "Dudas abiertas").
- Produces: la misma guía, mismo slug, con tabla comparativa, 9 secciones, ≥ 6 FAQ, ≥ 6 fuentes.

- [ ] **Step 1: Test (falla)**

```ts
// app/tests/unit/guidesGarantias.test.ts
import { describe, expect, it } from 'vitest'

import { getGuide } from '../../utils/guides'

const g = getGuide('garantias-de-alquiler-uruguay')!
const text = () =>
  [g.title, g.description, ...g.sections.map(s => `${s.heading} ${s.body}`), ...(g.faqs ?? []).map(f => `${f.q} ${f.a}`)].join(' ')

describe('guía de garantías de alquiler (comparativa 2026)', () => {
  it('conserva el slug y sube la fecha', () => {
    expect(g).toBeDefined()
    expect(g.updatedAt).toBe('2026-09-15')
    expect(g.title.length).toBeLessThanOrEqual(60)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(190)
  })
  it('nombra a los cinco proveedores y a los fondos del Ministerio', () => {
    for (const name of ['ANDA', 'Contaduría', 'Porto', 'Sura', 'Mapfre', 'Fondo de Garantía']) expect(text()).toContain(name)
  })
  it('trae la tabla comparativa con una fila por garantía', () => {
    const table = g.sections.find(s => s.table)?.table!
    expect(table.headers).toEqual(['Garantía', 'Cuánto cuesta', 'Cuánto podés alquilar', 'Quién puede', 'Demora'])
    expect(table.rows.length).toBeGreaterThanOrEqual(6)
    for (const row of table.rows) expect(row).toHaveLength(5)
  })
  it('no publica un costo que el proveedor no publica', () => {
    const rows = g.sections.find(s => s.table)!.table!.rows
    for (const name of ['Porto', 'Sura', 'Mapfre']) {
      const row = rows.find(r => r[0].includes(name))!
      expect(row[1]).toMatch(/cotiz|no publica|alrededor de/i)
    }
  })
  it('FAQ, fuentes y enlaces', () => {
    expect(g.sections.length).toBeGreaterThanOrEqual(8)
    expect(g.sections.length).toBeLessThanOrEqual(9)
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(6)
    expect(g.sources?.length ?? 0).toBeGreaterThanOrEqual(6)
    for (const s of g.sources ?? []) expect(s.url).toMatch(/^https:\/\//)
    const tos = (g.related ?? []).map(r => r.to)
    for (const to of ['/alquilar-sin-recibo-de-sueldo', '/alquilar-estando-en-clearing', '/guias/alquilar-sin-garantia-uruguay']) expect(tos).toContain(to)
    expect(text()).not.toMatch(/\*\*|^#|\n- /m)
    expect(text()).not.toMatch(/septiembre/)
  })
})
```

- [ ] **Step 2: Correr (falla)**: desde `app/`, `npx vitest run tests/unit/guidesGarantias.test.ts`.

- [ ] **Step 3: Reescribir la entrada de la guía**

Título `'Garantía de alquiler: Anda, Sura, Porto, Mapfre o Contaduría'` (57), `tag: 'GARANTÍAS'`, `updatedAt: '2026-09-15'`, descripción (100–190) con "cuánto cuesta cada una, cuánto podés alquilar y cuál acepta más rápido".

Secciones (9, cada una 90–180 palabras, prosa plana, "vos"):
1. "Qué es una garantía y por qué te la piden" — conservar y podar la actual.
2. "La comparativa, en una tabla" — `table` con `headers: ['Garantía', 'Cuánto cuesta', 'Cuánto podés alquilar', 'Quién puede', 'Demora']` y estas filas (valores del dossier; [S] = secundaria, escribir como aproximación; "—" nunca: escribir "no publica"):
   - `['Contaduría (SGA)', '3 % del alquiler a cada parte, más retención de IRPF salvo exoneración', 'hasta el 40 % del sueldo o pasividad nominal', 'públicos con 6 meses, privados de empresas inscriptas en el SGA con 6 meses, jubilados', 'no publica el plazo']`
   - `['ANDA', '3 % mensual del alquiler más la cuota social', 'hasta el 40 % del ingreso nominal', 'privados con 4 meses, públicos con 1 mes, jubilados, independientes con certificado', '24 a 48 horas hábiles']`
   - `['Porto Seguro', 'no publica el costo: cotizador online (alrededor de un mes de alquiler por año, según relevamientos)', 'no publica el tope', 'inquilinos sin fiador; el análisis vale 60 días', 'análisis en el día']`
   - `['Sura', 'no publica el costo: cotizá por la app o garantia@segurossura.com.uy', 'no publica el tope', 'dependientes, independientes con 1 año, jubilados menores de 80, rentistas', 'no publica el plazo']`
   - `['Mapfre', 'no publica el costo: simulador online (alrededor del 80 % de un mes por año, según relevamientos)', 'hasta el 30 % de los ingresos declarados (se suman hasta 5 personas)', 'dependientes con 3 meses, independientes y rentistas con 1 año, jubilados', 'resultado en plazo breve; 30 días para contratar']`
   - `['Fondo de Garantía de Alquiler (MVOTMA/ANV)', 'trámite gratis; después 3 % mensual a cada parte más un depósito único', 'hasta 18 UR (21 UR en vivienda promovida); jóvenes 22,5 UR', 'núcleos con ingresos formales de 15 a 100 UR; jóvenes de 18 a 29', '120 días para conseguir vivienda una vez aprobado']`
   - `['FIDECIU', 'no publica el costo', 'hasta el 40 % del ingreso (30 % jubilados)', 'dependientes con 6 meses, pasivos, independientes con documentación', 'precalificación en el día; garantía en 48 horas']`
   El cuerpo explica cómo leerla: dos familias (retención de sueldo: Contaduría, ANDA, FIDECIU; seguro de fianza: Porto, Sura, Mapfre) y el fondo estatal para ingresos bajos.
3. "Contaduría General de la Nación: la del Estado" — 3 % a cada parte, IRPF 10,5 % salvo exoneración, ILD con 30 días de vigencia, pago al propietario por transferencia en los primeros días hábiles del mes, 6 meses de antigüedad, empresas privadas inscriptas en el SGA. Fuente `https://www.gub.uy/tramites/alquiler-contaduria-general-nacion`.
4. "ANDA: afiliarte y descontar del sueldo" — 3 % mensual + cuota social (no publican el monto), 40 %, plazos por tipo de trabajador, 24–48 h, contrato mínimo 1 año, propietario cobra el 14, cubre daños por tabla propia y gastos asociados. Fuente `https://www.anda.com.uy/garantia-de-alquiler/inquilino/`.
5. "Porto Seguro: la más rápida" — análisis en el día, sin fiador, cobertura hasta 36 meses con honorarios y costas, daños hasta 5 veces el alquiler, gastos comunes hasta 30 %, pago en redes, débito o cuotas; el costo sale del cotizador. Fuente `https://www.portoseguro.com.uy/`.
6. "Sura: 24 meses y consumos" — cobertura hasta 24 meses, OSE/UTE/gas hasta 25 % del alquiler por 6 meses, daños 5 veces, jubilados menores de 80, extranjeros dependientes, empresas con 1 año; cotizá por la app. Fuente `https://www.segurossura.com.uy/`.
7. "Mapfre: 30 % de los ingresos, hasta cinco personas" — alquiler ≤ 30 % de los ingresos declarados sumando hasta 5 personas, 36 meses de alquiler, gastos comunes 3 meses, servicios 3 meses c/u, tributos 4, daños 6 meses, póliza anual renovable, 30 días para contratar tras la aprobación. Fuente `https://www.mapfre.com.uy/seguros-garantia-alquiler/`.
8. "Si tus ingresos son bajos o tenés entre 18 y 29: el fondo del Ministerio" — FGA (ingresos 15–100 UR, alquiler hasta 18/21 UR, 3 % a cada parte más depósito único, excluye jubilados) y FGA Jóvenes (hasta 100 UR, colectivo mínimo 30 UR, 40 % del ingreso, 22,5 UR); mencionar FIDECIU como alternativa con retención. Fuentes `https://www.anv.gub.uy/fondo-de-garantia-de-alquiler`, `https://www.gub.uy/tramites/fga-garantia-alquiler`, `https://fideciu.uy/`.
9. "Cuál te conviene, según tu caso" — público con sueldo fijo → Contaduría; privado con poca antigüedad → aseguradora; sin recibo → `/alquilar-sin-recibo-de-sueldo`; en clearing → `/alquilar-estando-en-clearing`; sin nada → `/guias/alquilar-sin-garantia-uruguay` (`links` en la sección).

`faqs` (≥ 6, `{ q, a }`, 30–80 palabras): ¿Cuánto cuesta una garantía de alquiler?; ¿La Contaduría es sólo para funcionarios públicos?; ¿Qué garantía aprueba más rápido?; ¿La garantía cubre gastos comunes y UTE?; ¿Puedo cambiar de garantía con el contrato firmado?; ¿Qué pasa si dejo de pagar el alquiler?; ¿Hay garantía para jóvenes?
`sources` (≥ 6): las siete URLs anteriores + `https://www.anv.gub.uy/fondo-de-garantia-de-alquiler-para-jovenes`.
`related`: `/alquilar-en-uruguay`, `/alquilar-sin-recibo-de-sueldo`, `/alquilar-estando-en-clearing`, `/primer-alquiler-uruguay`, `/guias/alquilar-sin-garantia-uruguay`, `/guias/ser-garante-o-codeudor-riesgos-uruguay`.

- [ ] **Step 4: Verde y lint**: `npx vitest run tests/unit/guidesGarantias.test.ts tests/unit/guides.test.ts tests/unit/guideHubs.test.ts`; `npx eslint --fix app/utils/guidesReddit.ts app/tests/unit/guidesGarantias.test.ts` (rutas relativas a `app/`).

---

### Task 2 (H): `/suplemento-solidario-bps`

**Files:**
- Create: `app/utils/suplementoSolidario.ts`, `app/pages/suplemento-solidario-bps.vue`, `app/tests/unit/suplementoSolidario.test.ts`

**Interfaces:**
- Produces: `SUPLEMENTO_VERIFIED_AT`, `BASE_2026`, `DEDUCTION_PCT`, `JUBILACION_MINIMA_2026`, `PENSION_VEJEZ_INVALIDEZ_2026`, `AUMENTO_2026_PCT`, `ELIGIBLE`, `RESIDENCY_RULE`, `APPLY_STEPS`, `EXAMPLES`, `estimateSupplement()`, `SUPLEMENTO_FAQ`, `SUPLEMENTO_SOURCES`.

- [ ] **Step 1: Test (falla)**

```ts
// app/tests/unit/suplementoSolidario.test.ts
import { describe, expect, it } from 'vitest'

import {
  APPLY_STEPS,
  BASE_2026,
  DEDUCTION_PCT,
  ELIGIBLE,
  EXAMPLES,
  JUBILACION_MINIMA_2026,
  PENSION_VEJEZ_INVALIDEZ_2026,
  SUPLEMENTO_FAQ,
  SUPLEMENTO_SOURCES,
  SUPLEMENTO_VERIFIED_AT,
  estimateSupplement,
} from '../../utils/suplementoSolidario'

describe('suplemento solidario 2026', () => {
  it('valores oficiales', () => {
    expect(BASE_2026).toBe(17591)
    expect(DEDUCTION_PCT).toBe(33)
    expect(JUBILACION_MINIMA_2026).toBe(20935)
    expect(PENSION_VEJEZ_INVALIDEZ_2026).toBe(18575)
    expect(SUPLEMENTO_VERIFIED_AT).toBe('2026-09-15')
  })
  it('estimateSupplement descuenta el 33 % de la pasividad', () => {
    expect(estimateSupplement(15000)).toBe(12641)
    expect(estimateSupplement(30000)).toBe(7691)
    expect(estimateSupplement(53400)).toBe(0)
    expect(estimateSupplement(0)).toBe(17591)
  })
  it('otros ingresos: 33 % sobre el tope si tiene 65 o más, 100 % si no', () => {
    expect(estimateSupplement(30000, { otherIncome: 3000, age: 70 })).toBe(7691 - 990)
    expect(estimateSupplement(30000, { otherIncome: 3000, age: 60 })).toBe(7691 - 3000)
  })
  it('basura → null', () => {
    expect(estimateSupplement(Number.NaN)).toBeNull()
    expect(estimateSupplement(-5)).toBeNull()
    expect(estimateSupplement(30000, { otherIncome: Number.NaN })).toBeNull()
  })
  it('los ejemplos de la tabla salen de la misma función', () => {
    for (const e of EXAMPLES) expect(estimateSupplement(e.pension)).toBe(e.supplement)
  })
  it('catálogo', () => {
    expect(ELIGIBLE.length).toBeGreaterThanOrEqual(2)
    expect(APPLY_STEPS.length).toBeGreaterThanOrEqual(3)
    expect(SUPLEMENTO_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of SUPLEMENTO_FAQ) expect(f.answer.length).toBeGreaterThan(40)
    expect(SUPLEMENTO_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of SUPLEMENTO_SOURCES) expect(s.url).toMatch(/^https:\/\//)
  })
})
```

- [ ] **Step 2: Correr (falla)**: `npx vitest run tests/unit/suplementoSolidario.test.ts`.

- [ ] **Step 3: Util**

```ts
// app/utils/suplementoSolidario.ts
// Suplemento solidario (Ley 20.130, Decreto 232/023). Verificado el 2026-09-15 contra
// https://www.bps.gub.uy/20541/suplemento-solidario.html y
// https://www.bps.gub.uy/6182/montos-y-aumentos-de-pasividades.html
import type { FaqItem } from './faqAnswers'

export const SUPLEMENTO_VERIFIED_AT = '2026-09-15'
/** Valor base 2026 ("lleva deducciones de ingresos previsionales"). */
export const BASE_2026 = 17591
/** Se descuenta el 33 % del monto de las prestaciones previsionales, incluida la que da origen. */
export const DEDUCTION_PCT = 33
export const JUBILACION_MINIMA_2026 = 20935
export const PENSION_VEJEZ_INVALIDEZ_2026 = 18575
/** Aumento general de pasividades 2026. */
export const AUMENTO_2026_PCT = 5.97
export const AUMENTO_2026_FROM = '2026-02-09'

export const ELIGIBLE: readonly string[] = [
  'Jubilados de cualquier caja que se jubilaron dentro del Sistema Previsional Común (SPC), el régimen nuevo de la Ley 20.130.',
  'Pensionistas por sobrevivencia de 65 años o más, cuando la persona fallecida estaba comprendida en el SPC.',
]
export const RESIDENCY_RULE =
  'Residir en Uruguay y haber residido en el país por lo menos 10 de los últimos 20 años.'

export const APPLY_STEPS: readonly { title: string; detail: string }[] = [
  { title: 'Presentás una declaración jurada', detail: 'De ingresos y de residencia, ante el BPS, al pedir la jubilación o pensión o cuando cambian tus ingresos.' },
  { title: 'El BPS calcula el monto', detail: 'Al valor base le descuenta el 33 % de tus prestaciones previsionales y, si tenés otros ingresos, la parte que corresponda según tu edad.' },
  { title: 'Lo cobrás junto con la pasividad', detail: 'Rige desde el otorgamiento de la jubilación o pensión y se mantiene mientras se cumplan las condiciones.' },
]

export interface SupplementOptions {
  otherIncome?: number
  age?: number
}

/**
 * Estimación del suplemento: base menos el 33 % de la pasividad. Otros ingresos: el BPS descuenta el
 * 33 % (65 años o más) o el 100 % (menos de 65). Es una estimación: el BPS mira todos los ingresos.
 */
export function estimateSupplement(pension: number, opts: SupplementOptions = {}): number | null {
  const other = opts.otherIncome ?? 0
  if (!Number.isFinite(pension) || pension < 0 || !Number.isFinite(other) || other < 0) return null
  const age = opts.age
  const otherPct = age != null && Number.isFinite(age) && age < 65 ? 1 : DEDUCTION_PCT / 100
  const value = BASE_2026 - (DEDUCTION_PCT / 100) * pension - otherPct * other
  return Math.max(0, Math.round(value))
}

export const EXAMPLES: readonly { pension: number; supplement: number }[] = [
  { pension: 15000, supplement: 12641 },
  { pension: 30000, supplement: 7691 },
  { pension: 53400, supplement: 0 },
]

export const SUPLEMENTO_SOURCES: readonly { label: string; url: string }[] = [
  { label: 'BPS — Suplemento solidario', url: 'https://www.bps.gub.uy/20541/suplemento-solidario.html' },
  { label: 'BPS — Montos y aumentos de pasividades 2026', url: 'https://www.bps.gub.uy/6182/montos-y-aumentos-de-pasividades.html' },
  { label: 'Ley 20.130 (BPS)', url: 'https://www.bps.gub.uy/20600/' },
  { label: 'Decreto 232/023 (BPS)', url: 'https://www.bps.gub.uy/20802/' },
  { label: 'El Observador — BPS paga un suplemento de más de $ 17 mil en 2026', url: 'https://www.elobservador.com.uy/nacional/bps-paga-un-suplemento-mas-17-mil-2026-quienes-pueden-cobrarlo-y-cuales-son-los-requisitos-n6056845' },
]

export const SUPLEMENTO_FAQ: readonly FaqItem[] = [
  { id: 'que-es', question: '¿Qué es el suplemento solidario del BPS?', answer: 'Es un complemento que la Ley 20.130 creó para las pasividades bajas del sistema nuevo: el BPS paga la diferencia entre un valor base ($ 17.591 en 2026) y una parte de lo que ya cobrás, junto con la jubilación o pensión.' },
  { id: 'quien-cobra', question: '¿Quién puede cobrar el suplemento solidario?', answer: 'Jubilados de cualquier caja dentro del Sistema Previsional Común y pensionistas por sobrevivencia de 65 años o más cuando el causante estaba en ese sistema, con residencia en el país de al menos 10 de los últimos 20 años.' },
  { id: 'cuanto-es', question: '¿Cuánto es el suplemento solidario en 2026?', answer: 'El valor base es de $ 17.591. Lo que cobrás es ese valor menos el 33 % de tus prestaciones previsionales y, si tenés otros ingresos, una deducción adicional. Con una jubilación de $ 30.000 quedan unos $ 7.691.' },
  { id: 'como-se-calcula', question: '¿Cómo se calcula?', answer: 'Base menos el 33 % del total de tus jubilaciones y pensiones. Otros ingresos: si tenés 65 o más se descuenta el 33 % de lo que supere el tope; si tenés menos de 65, el 100 %. Con unos $ 53.300 de pasividad el suplemento se agota.' },
  { id: 'regimen-viejo', question: '¿Lo cobran los jubilados del régimen anterior?', answer: 'No. Está reservado a quienes se jubilan por el Sistema Previsional Común de la Ley 20.130. Las pasividades del régimen anterior tienen la jubilación mínima ($ 20.935 en 2026) como piso, no el suplemento.' },
  { id: 'como-se-pide', question: '¿Cómo se pide?', answer: 'Con una declaración jurada de ingresos y residencia ante el BPS. Rige desde que se otorga la jubilación o pensión y se mantiene mientras sigas cumpliendo las condiciones; el BPS lo liquida junto con la pasividad.' },
  { id: 'pension-vejez', question: '¿Es lo mismo que la pensión a la vejez?', answer: 'No. La pensión por vejez e invalidez ($ 18.575 en 2026) es una prestación no contributiva para quien no tiene jubilación; el suplemento solidario complementa una jubilación o pensión del sistema nuevo que quedó baja.' },
]
```

- [ ] **Step 4: Página** — `app/pages/suplemento-solidario-bps.vue`, misma estructura que `app/pages/elecciones-bps-2026.vue`: eyebrow "BPS · Ley 20.130", `<h1>` "Suplemento solidario del BPS: quién lo cobra y cuánto"; calculadora (`v-model.number` jubilación + otros ingresos + edad → `estimateSupplement`, con aviso "estimación; el BPS considera todos tus ingresos"); "¿Te corresponde?" (`ELIGIBLE` + `RESIDENCY_RULE`); "Cómo se calcula" con tabla de `EXAMPLES` (`cu-mobile-cards`, `data-label`, `scope="col"`); "Cómo se pide" (`APPLY_STEPS`); "Referencias 2026" (mínima, pensión vejez, aumento 5,97 % desde el 9/2/2026); `FaqSection`; fuentes; seguir leyendo: `/cuando-me-puedo-jubilar-uruguay`, `/desvincularme-de-la-afap-uruguay`, `/devolucion-fonasa-uruguay`, `/elecciones-bps-2026`, `/asignacion-familiar-uruguay`. SEO: `title` `'Suplemento solidario BPS 2026: quién cobra'` (42); `description` ≤ 160 con $ 17.591 y el 33 %; `defineOgImageComponent('Cambio', { title: 'Suplemento solidario del BPS', subtitle: 'Valor base 2026: $ 17.591', tag: 'BPS' })`; canonical `https://cambio-uruguay.com/suplemento-solidario-bps`; keywords `suplemento solidario, suplemento solidario bps, suplemento solidario 2026, quienes cobran el suplemento solidario, suplemento solidario requisitos, suplemento solidario monto, ley 20130 suplemento`; JSON-LD `BreadcrumbList` + `Article`.

- [ ] **Step 5: Verde y lint**: `npx vitest run tests/unit/suplementoSolidario.test.ts tests/unit/seoContract.test.ts tests/unit/pageContainer.test.ts tests/unit/noChipInsideParagraph.test.ts`; eslint sobre los tres archivos. Reportar a la integración: entrada `invest` (`nav.suplementoSolidario`, `mdi-hand-coin`, priority 0.7, weekly, fresh) + i18n "Suplemento solidario del BPS" / "BPS solidarity supplement" / "Suplemento solidário do BPS".

---

### Task 3 (I): UTE — Plan Redondo y corte de luz

**Files:**
- Modify: `app/pages/factura-de-ute-uruguay.vue` (+ el util que provea su FAQ/fecha, ver `BILLS_FAQ_VERIFIED_AT` en el propio archivo)
- Test: el contrato existente (`seoContract`, `pageContainer`) + agregar a `app/tests/unit/` un test pequeño si la FAQ vive en un util (verificar que las dos preguntas nuevas existen).

- [ ] **Step 1: Leer la página** (≈550 líneas) y ubicar la FAQ, `description` (~línea 511) y `BILLS_FAQ_VERIFIED_AT`.

- [ ] **Step 2: Dos secciones nuevas** antes de la FAQ, con este contenido (verificado 2026-09-15):

"Plan Redondo: $ 2.500 o $ 5.000 de descuento por un electrodoméstico eficiente": es un descuento en la factura de UTE por comprar equipos con características de interés para UTE y registrarlos; $ 2.500 IVA incluido por equipo, $ 5.000 para termotanque con bomba de calor y sistemas SAVE; hasta 6 equipos por cliente; clientes residenciales y comerciales con potencia contratada de hasta 40 kW; compras del 1.º de setiembre de 2026 al 31 de marzo de 2027; el equipo tiene que estar instalado en el servicio donde se pide; se registra el comprobante fiscal electrónico en el portal de UTE, en las oficinas comerciales o por WhatsApp al 098 1930 00. Enlace `https://www.ute.com.uy/clientes/soluciones-para-el-hogar/planredondo`.

"Corte de luz: cómo reclamar y qué compensación hay": primero el reclamo a UTE (web, app o 0800 1930); las compensaciones por calidad del servicio no se piden: salen del Reglamento de Calidad de Servicio de Distribución de URSEA, que mide nueve indicadores por semestre (respuesta a reclamos, reconexión, lecturas estimadas, frecuencia y duración de las interrupciones, límites máximos) y UTE las descuenta en la factura al cierre del semestre, en proporción al desvío y a tu facturación promedio; si UTE no responde o la respuesta no te conforma, URSEA atiende en segunda instancia después de 15 días hábiles (formulario web o cita presencial en Liniers 1324, con el número del reclamo original); si un corte o sobretensión te rompió un aparato, hay un reclamo aparte por daños eléctricos con presupuesto en papel membretado. Enlaces `https://www.ute.com.uy/facturas/compensaciones-por-calidad-del-servicio`, `https://www.ute.com.uy/reclamos/reclamos-por-cortes-en-el-servicio-de-energia-electrica`, `https://www.gub.uy/tramites/reclamos-ursea`.

- [ ] **Step 3: FAQ y SEO** — dos preguntas nuevas ("¿Qué es el Plan Redondo de UTE?", "¿UTE me compensa por un corte de luz?"), fecha de verificación de la FAQ a `'2026-09-15'`, keywords `plan redondo ute, plan redondo, reclamo corte de luz, ute corte de luz reclamo, compensacion ute corte`, `description` ≤ 160 (hoy es más larga), fuentes nuevas en el bloque de fuentes.

- [ ] **Step 4: Verde y lint**: `npx vitest run tests/unit/seoContract.test.ts tests/unit/pageContainer.test.ts tests/unit/noChipInsideParagraph.test.ts` (+ el test del util si existe); eslint sobre los archivos tocados. Reportar keywords a la integración.

---

### Task 4 (G): `/comisiones-mercado-pago-uruguay`

**Files:**
- Create: `app/utils/mercadoPagoFees.ts`, `app/pages/comisiones-mercado-pago-uruguay.vue`, `app/tests/unit/mercadoPagoFees.test.ts`

**Interfaces:**
- Consumes: `dossier-mercadopago.md` (§1.1–1.5 tabla oficial, §3 recargo por cuotas sin interés, §5 modelos y precios de Point, §6 retiro, §7 plazo de liberación, §8 IVA, "Fuentes" oficiales). Leerlo entero antes de escribir.
- Produces: `MP_FEES_VERIFIED_AT`, `MpMethod`, `MpFeeRow`, `MP_FEES`, `MP_INSTALLMENT_SURCHARGE`, `MP_POINT_DEVICES`, `MP_WITHDRAWAL`, `MP_RELEASE`, `feeForSale()`, `MP_FAQ`, `MP_SOURCES`.

- [ ] **Step 1: Test (falla)**

```ts
// app/tests/unit/mercadoPagoFees.test.ts
import { describe, expect, it } from 'vitest'

import { MP_FEES, MP_FEES_VERIFIED_AT, MP_FAQ, MP_INSTALLMENT_SURCHARGE, MP_POINT_DEVICES, MP_SOURCES, feeForSale } from '../../utils/mercadoPagoFees'

describe('comisiones de Mercado Pago', () => {
  it('tabla oficial: extremos y forma', () => {
    const pcts = MP_FEES.map(r => r.pct)
    expect(Math.min(...pcts)).toBe(1.15)
    expect(Math.max(...pcts)).toBe(11.99)
    for (const r of MP_FEES) {
      expect(['qr', 'link', 'checkout', 'suscripcion', 'point']).toContain(r.method)
      expect(['instante', '21 días']).toContain(r.release)
      expect(r.pct).toBeGreaterThan(0)
      expect(r.pct).toBeLessThan(15)
    }
    expect(MP_FEES.find(r => r.method === 'qr' && r.release === '21 días')?.pct).toBe(2.99)
    expect(MP_FEES.find(r => r.method === 'link' && r.release === 'instante')?.pct).toBe(5.99)
    expect(MP_FEES.filter(r => r.method === 'point').length).toBeGreaterThanOrEqual(9)
    expect(MP_INSTALLMENT_SURCHARGE.qr).toBe(2.99)
    expect(MP_INSTALLMENT_SURCHARGE.link).toBe(2.49)
    expect(MP_FEES_VERIFIED_AT).toBe('2026-09-15')
  })
  it('feeForSale reparte comisión, IVA y neto', () => {
    expect(feeForSale(1000, 5.99)).toEqual({ fee: 59.9, iva: 13.18, net: 926.92 })
    expect(feeForSale(1000, 1.15)).toEqual({ fee: 11.5, iva: 2.53, net: 985.97 })
    expect(feeForSale(0, 5.99)).toEqual({ fee: 0, iva: 0, net: 0 })
  })
  it('feeForSale con basura → null', () => {
    expect(feeForSale(Number.NaN, 5.99)).toBeNull()
    expect(feeForSale(-1, 5.99)).toBeNull()
    expect(feeForSale(1000, Number.NaN)).toBeNull()
  })
  it('catálogo', () => {
    expect(MP_POINT_DEVICES.length).toBeGreaterThanOrEqual(1)
    expect(MP_FAQ.length).toBeGreaterThanOrEqual(6)
    expect(MP_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of MP_SOURCES) expect(s.url).toMatch(/^https:\/\/(www\.)?(mercadopago\.com\.uy|vendedores\.mercadolibre\.com\.uy)\//)
  })
})
```

- [ ] **Step 2: Correr (falla)**: `npx vitest run tests/unit/mercadoPagoFees.test.ts`.

- [ ] **Step 3: Util** — `app/utils/mercadoPagoFees.ts` (puro, `import type { FaqItem } from './faqAnswers'`):

```ts
export const MP_FEES_VERIFIED_AT = '2026-09-15'
export type MpMethod = 'qr' | 'link' | 'checkout' | 'suscripcion' | 'point'
export type MpRelease = 'instante' | '21 días'
export interface MpFeeRow {
  method: MpMethod
  label: string
  /** Con qué paga el cliente (o cuotas, en Point). */
  payer: string
  release: MpRelease
  /** Porcentaje sin IVA, tal como lo publica Mercado Pago ("+ IVA"). */
  pct: number
}
export const MP_FEES: readonly MpFeeRow[] = [
  { method: 'qr', label: 'Código QR', payer: 'Tarjeta de crédito', release: 'instante', pct: 3.59 },
  { method: 'qr', label: 'Código QR', payer: 'Tarjeta de crédito', release: '21 días', pct: 2.99 },
  { method: 'qr', label: 'Código QR', payer: 'Débito, dinero en Mercado Pago u otras billeteras', release: 'instante', pct: 1.15 },
  { method: 'link', label: 'Link de pago', payer: 'Todos los medios', release: 'instante', pct: 5.99 },
  { method: 'link', label: 'Link de pago', payer: 'Todos los medios', release: '21 días', pct: 4.99 },
  { method: 'checkout', label: 'Checkout (sitio web)', payer: 'Todos los medios', release: 'instante', pct: 5.99 },
  { method: 'checkout', label: 'Checkout (sitio web)', payer: 'Todos los medios', release: '21 días', pct: 4.99 },
  { method: 'suscripcion', label: 'Suscripciones', payer: 'Todos los medios', release: 'instante', pct: 5.99 },
  { method: 'suscripcion', label: 'Suscripciones', payer: 'Todos los medios', release: '21 días', pct: 4.99 },
  { method: 'point', label: 'Point Smart', payer: 'Débito', release: 'instante', pct: 2.25 },
  { method: 'point', label: 'Point Smart', payer: 'Crédito en 1 cuota', release: 'instante', pct: 5.99 },
  { method: 'point', label: 'Point Smart', payer: 'Crédito hasta 3 cuotas', release: 'instante', pct: 8.49 },
  { method: 'point', label: 'Point Smart', payer: 'Crédito hasta 6 cuotas', release: 'instante', pct: 9.49 },
  { method: 'point', label: 'Point Smart', payer: 'Crédito hasta 12 cuotas', release: 'instante', pct: 11.99 },
  { method: 'point', label: 'Point Smart', payer: 'Crédito en 1 cuota', release: '21 días', pct: 5.24 },
  { method: 'point', label: 'Point Smart', payer: 'Crédito hasta 3 cuotas', release: '21 días', pct: 7.74 },
  { method: 'point', label: 'Point Smart', payer: 'Crédito hasta 6 cuotas', release: '21 días', pct: 8.74 },
  { method: 'point', label: 'Point Smart', payer: 'Crédito hasta 12 cuotas', release: '21 días', pct: 11.24 },
]
/** Recargo por ofrecer cuotas sin interés (+ IVA). */
export const MP_INSTALLMENT_SURCHARGE = { link: 2.49, checkout: 2.49, qr: 2.99 } as const
export const IVA_PCT = 22
const round2 = (n: number) => Math.round(n * 100) / 100
export function feeForSale(amount: number, pct: number): { fee: number; iva: number; net: number } | null {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(pct) || pct < 0) return null
  const fee = round2((amount * pct) / 100)
  const iva = round2((fee * IVA_PCT) / 100)
  return { fee, iva, net: round2(amount - fee - iva) }
}
```
`MP_POINT_DEVICES` (`{ name, price, note }` con los modelos y precios del §5 del dossier, verbatim), `MP_WITHDRAWAL` (`{ cost, timing }` del §6), `MP_RELEASE` (`{ options, howToChange }` del §7), `MP_SOURCES` (≥ 4 URLs oficiales del bloque "Fuentes" del dossier: ayuda de comisiones QR, link de pago, Point Smart, cuotas sin interés, retiro), `MP_FAQ` (≥ 6, `FaqItem`): cuánto cobra Mercado Pago por venta (rango 1,15 %–11,99 % + IVA según medio y plazo); QR o Point o link, cuál sale más barato (QR con débito 1,15 %; link 5,99 %); cuándo me liberan la plata (al instante o a 21 días; la diferencia es el %); cuánto sale el Point (precio del §5); el IVA de la comisión (el % es + IVA; MP factura la comisión); cobrar en cuotas sin interés (recargo 2,49–2,99 % + IVA); retirar a la cuenta bancaria (§6). Si el dossier marca un dato como secundario (p. ej. deducibilidad del IVA para monotributistas), la FAQ lo dice como "consultá a tu contador", sin afirmarlo.

- [ ] **Step 4: Página** — `app/pages/comisiones-mercado-pago-uruguay.vue`, estructura de `elecciones-bps-2026.vue`: `<h1>` "Comisiones de Mercado Pago para cobrar en Uruguay"; calculadora (monto de la venta, selector de fila de `MP_FEES` → comisión, IVA y neto con `formatUYU`); tabla completa (`cu-mobile-cards`, `data-label`, `scope="col"`) con columnas Medio / Cómo paga el cliente / Plazo / Comisión (+ IVA) / Te quedan de $ 1.000; "Cuotas sin interés" (recargo); "Point: el aparato" (`MP_POINT_DEVICES`); "Cuándo cobrás y cómo retirás" (`MP_RELEASE`, `MP_WITHDRAWAL`); "Lo que no te dicen" (el % es + IVA; el plazo cambia el %; comparar con transferencia, enlace `/comisiones-de-transferencia-uruguay`); `FaqSection`; fuentes; seguir leyendo: `/que-empresa-abrir-uruguay`, `/facturar-en-monotributo-uruguay`, `/comisiones-de-transferencia-uruguay`, `/tarjetas-de-debito-uruguay`, `/pagar-cuentas-con-tarjeta`. SEO: `title` `'Comisiones de Mercado Pago para cobrar'` (38); `description` ≤ 160: "Del 1,15 % (QR con débito) al 11,99 % (Point en 12 cuotas), más IVA. Tabla por medio y plazo, cuánto te queda de cada venta y cuándo se libera la plata."; OG `tag: 'PAGOS'`; canonical; keywords `comision mercado pago, cuanto cobra mercado pago, mercado pago point precio, point smart, mercado pago pos, comisiones mercado pago uruguay, cobrar con mercado pago, link de pago mercado pago`; JSON-LD `BreadcrumbList` + `Article`.

- [ ] **Step 5: Verde y lint**: `npx vitest run tests/unit/mercadoPagoFees.test.ts tests/unit/seoContract.test.ts tests/unit/pageContainer.test.ts tests/unit/noChipInsideParagraph.test.ts`; eslint. Reportar: entrada `banking` (`nav.comisionesMercadoPago`, `mdi-qrcode-scan`, priority 0.7, weekly, fresh) + i18n "Comisiones de Mercado Pago" / "Mercado Pago fees" / "Taxas do Mercado Pago".

---

### Task 5 (J): Seguro de paro — paro parcial y snippet

**Files:**
- Modify: `app/pages/seguro-de-paro-uruguay.vue` (y el util de sus cifras si las tiene: buscar dónde viven los porcentajes 66/57/50/45/42/40 y los topes)
- Test: si hay util con test, extenderlo; si no, `app/tests/unit/seguroDeParo.test.ts` no es necesario — alcanza con los contratos de página.

**Hechos** (BPS, fetch 2026-09-15; `https://www.bps.gub.uy/18239/subsidio-por-desempleo-por-suspension.html`, última actualización declarada 26/01/2026, y la página de despido citada en `dossier-paro-monotributo.md` §A.2):
- Causal **suspensión o reducción**: el BPS lo otorga a trabajadores suspendidos o con una reducción laboral de **al menos un 25 %**. Monto: mensuales y destajistas, **50 % del promedio de los últimos seis meses**; jornaleros, **12 jornales por mes**; en reducción se liquida por el período de la reducción, proporcional a los días desocupados; destajistas tienen subsidio parcial cuando la reducción supera el 25 %. Tope máximo por suspensión **$ 67.754** y mínimo **$ 8.467** (enero 2026). Complemento del **20 %** con cónyuge, hijos o personas a cargo, salvo que esos familiares ganen más de 1 BPC (**$ 6.864**). Duración: suspendidos **4 meses o 48 jornales**; reducción **72 jornales**. Trámite: la empresa lo ingresa en línea dentro de **10 días hábiles**; si se niega, el trabajador se presenta en el BPS dentro de **30 días corridos** para reservar el derecho.
- Causal **despido**: 66 / 57 / 50 / 45 / 42 / 40 % con topes mensuales decrecientes **$ 93.155, $ 80.445, $ 67.754, $ 59.287, $ 55.044, $ 50.802** (2026); jornaleros 16/14/12/11/10/9 jornales con los mismos topes. **El "tope 8 BPC = $ 54.912" que circula en calculadoras de terceros no existe en el BPS: no usarlo.**

- [ ] **Step 1: Leer la página** y ubicar la calculadora, sus constantes de porcentajes/topes, la FAQ y `description` (~línea 426). Comparar los topes que usa la calculadora con los seis oficiales; si difieren, corregirlos y reportarlo.
- [ ] **Step 2: Sección nueva "Paro parcial: reducción de jornada o suspensión"** después de "Cómo terminó el vínculo" (o donde encaje), con los hechos de arriba en prosa + una tabla chica (Situación / Cuánto cobrás / Tope / Duración) y enlace a la página del BPS.
- [ ] **Step 3: FAQ** — agregar "¿Qué es el seguro de paro parcial y cuánto se cobra?" y "¿Cuánto es el tope del seguro de paro en 2026?" (los seis topes). Si la FAQ se emite por `FaqSection` y además hay un nodo FAQPage manual, dejar uno.
- [ ] **Step 4: SEO** — `description` ≤ 160: "Por despido cobrás del 66 % al 40 % del promedio de seis meses, con topes de $ 93.155 a $ 50.802 en 2026; por suspensión o reducción de jornada, el 50 %. Calculadora y requisitos." Keywords: `seguro de paro parcial, paro parcial, cuanto se cobra en el seguro de paro, seguro de paro reduccion de jornada, tope seguro de paro 2026`. Fuente nueva en el bloque de fuentes.
- [ ] **Step 5: Verde y lint**: `npx vitest run tests/unit/seoContract.test.ts tests/unit/pageContainer.test.ts tests/unit/noChipInsideParagraph.test.ts` (+ el test del util si existe); eslint. Reportar keywords.

---

### Task 6 (K): Monotributo — cuánto se paga por mes en 2026

**Files:**
- Modify: `app/utils/monotributoInvoicing.ts` (agregar `MONO_APORTES_2026`; no tocar el resto salvo corregir una cifra que contradiga al BPS), `app/pages/facturar-en-monotributo-uruguay.vue` (sección + FAQ + keywords)
- Test: `app/tests/unit/monotributoInvoicing.test.ts` si existe (extender), si no crear `app/tests/unit/monotributoAportes.test.ts`.

**Hechos** (BPS, fetch 2026-09-15, `dossier-paro-monotributo.md` §B): tres regímenes: Ley 18.083 (altas hasta el 31/12/2020), **Ley 19.942** (altas desde el 1/1/2021, con gradualidad: primeros 12 meses 25 %, segundos 12 meses 50 %, después 100 %) y **Monotributo Social MIDES** (Ley 18.874, gradualidad 25/50/75/100 % por tramos de 12 meses). Montos mensuales Ley 19.942 pleno (100 %): sin FONASA $ 2.637; con FONASA $ 6.996 (sin cónyuge) / $ 7.888 (con cónyuge); ambos cónyuges colaboradores sin FONASA $ 5.274, con FONASA $ 13.992; sólo uno con FONASA $ 9.633 / $ 10.525. Primeros 12 meses (25 %): sin FONASA $ 1.071; con FONASA $ 5.430 / $ 6.322. Segundos 12 meses (50 %): sin FONASA $ 1.594; con FONASA $ 5.953 / $ 6.845. MIDES sin FONASA: $ 659 (meses 1–12), $ 1.320 (13–24), $ 1.979 (25–36), $ 2.637 (desde el 37); MIDES con FONASA (sin cónyuge, con hijos / sin hijos / con cónyuge con hijos / sin hijos): 25 % $ 5.430 / 4.761 / 6.322 / 5.653; 50 % $ 5.953 / 5.284 / 6.845 / 6.176; 75 % $ 6.475 / 5.806 / 7.367 / 6.698; 100 % $ 6.996 / 6.327 / 7.888 / 7.219. Topes 2026: ingresos unipersonal **$ 1.175.537**, sociedad de hecho **$ 1.959.229**, activos **$ 979.614** (no aplica a MIDES). URLs: `https://www.bps.gub.uy/18051/monotributo-ley-19942.html`, `https://www.bps.gub.uy/6667/monotributo-social-mides-ley-18874.html`, `https://www.bps.gub.uy/23987/`.

- [ ] **Step 1: Test (falla)** — asserts: `MONO_APORTES_2026.verifiedAt === '2026-09-15'`; `ley19942.pleno.sinFonasa === 2637`; `ley19942.primerAnio.sinFonasa === 1071`; `mides.sinFonasa` = `[659, 1320, 1979, 2637]`; `mides.conFonasa[3].sinConyugeConHijos === 6996`; topes 1175537 / 1959229 / 979614; fuentes https (bps.gub.uy).
- [ ] **Step 2: Util** — `export const MONO_APORTES_2026 = { verifiedAt: '2026-09-15', sources: [...], ley19942: { primerAnio: {...}, segundoAnio: {...}, pleno: {...} }, mides: { sinFonasa: [...], conFonasa: [...] }, topes: { unipersonal, sociedadDeHecho, activos } } as const` con los números de arriba. Si `FIGURES.aporteMidesAnio1SinFonasa` / `aporteMidesPlenoSinFonasa` / `topeAnualUnipersonal` difieren de 659 / 2.637 / 1.175.537, corregirlos con `verifiedAt: '2026-09-15'` y reportar el cambio.
- [ ] **Step 3: Página** — sección "Cuánto se paga por mes en 2026" después de "Cuánto te sale cada uno, con tus números": dos tablas (`cu-mobile-cards`, `scope="col"`): Ley 19.942 (filas: primeros 12 meses / segundos 12 meses / desde el mes 25; columnas: sin FONASA / con FONASA sin cónyuge / con FONASA con cónyuge) y MIDES (filas por tramo; columnas: sin FONASA / con FONASA sin cónyuge con hijos / con cónyuge con hijos), nota sobre Ley 18.083 para altas viejas (sin gradualidad, mismos montos plenos), y los topes 2026. FAQ "¿Cuáles son las categorías del monotributo en 2026?" (respuesta: no son categorías por facturación como en Argentina; lo que cambia la cuota es FONASA, cónyuge, hijos y la antigüedad de la empresa). Keywords `categorias monotributo 2026, monotributo montos 2026, cuanto se paga de monotributo, monotributo mides cuota`.
- [ ] **Step 4: Verde y lint**: tests del util + `seoContract` + `pageContainer` + `noChipInsideParagraph`; eslint. Reportar keywords.

---

### Task 7: Integración

Como en la tanda 1: entradas `siteNav` (`banking` para G, `invest` junto a FONASA para H) + keywords nuevas en las entradas existentes de UTE, seguro de paro y monotributo; `nav.comisionesMercadoPago` y `nav.suplementoSolidario` en es/en/pt; `npm run test:unit` + `npm run lint` en `app/`; commits por frente; push; verificación en producción.
