# `/que-empresa-abrir-uruguay` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/que-empresa-abrir-uruguay` — an interactive recommender plus a sourced guide that tells a Uruguayan entrepreneur which legal form to open (monotributo, monotributo social, unipersonal Literal E, IRPF Cat. II, SAS, SRL…) based on their revenue and situation, with every figure traceable to BPS/DGI/IMPO.

**Architecture:** A pure, unit-tested data+logic module (`app/utils/companyTypes.ts`) holds the verified 2026 constants, the legal eligibility gates and the cost model. The page (`app/pages/que-empresa-abrir-uruguay.vue`) is a thin Vuetify view over it. A guardrailed Gemini refresher (`server/utils/companyFiguresLive.ts`) keeps the volatile figures current without ever being able to publish a hallucinated number, and the existing Telegram drift watchdog is extended to nag when the hand-maintained tables go stale.

**Tech Stack:** Nuxt 4 + Vue 3 `<script setup>` + Vuetify 3, vitest (node env) for unit tests, Nitro server routes + scheduled tasks, Gemini `gemini-2.5-flash` with `google_search` grounding.

**Spec:** `docs/superpowers/specs/2026-07-13-que-empresa-abrir-uruguay-design.md` — read it before starting. It carries every verified figure with its source. **Do not invent a number that is not in the spec.**

## Global Constraints

- **All commands run from `app/`.** The repo root is a separate legacy Express/scraper project; ignore it.
- **`npm run typecheck` is BROKEN in this repo** (vue-tsc crashes). Use **`npm run lint`** instead. Do not "fix" typecheck.
- **CI gate is `npm run test`** (vitest over `app/tests/unit/**`). Playwright e2e is not in CI.
- **A new page not registered in `app/utils/siteNav.ts` fails `tests/unit/siteNav-coverage.test.ts`.** Registration is mandatory, not optional.
- **Page copy is inline Spanish.** Guides in this repo are not i18n'd. The ONLY thing added to `app/i18n/locales/json/{es,en,pt}.json` is the nav label key.
- **`app/utils/companyTypes.ts` must be a PURE module**: no Vue/Nuxt imports, relative imports only, so vitest can run it in plain Node.
- **Vuetify components are PascalCase** (`VCard`, not `<v-card>`). Theme-aware colors only: `rgba(var(--v-theme-*))` / `rgba(var(--v-border-color), …)`, never raw hex, plus `.v-theme--light` overrides where the primary fails contrast.
- **Every route link goes through `localePath()`.**
- **No unsourced numbers.** Every numeric constant in `companyTypes.ts` carries `{ value, label, source, verifiedAt }`. A structural test enforces this (Task 3).
- Figures are current as of **2026-07-13**. `verifiedAt` for all baseline constants: `'2026-07-13'`.

---

## File Structure

| File | Responsibility |
|---|---|
| `app/utils/companyTypes.ts` | **Pure.** Verified 2026 constants (`FIGURES`), regime catalogue, legal gates, cost model, `evaluate()`. The whole brain. |
| `app/tests/unit/companyTypes.test.ts` | Unit tests for the above, incl. the structural "no unsourced number" test. |
| `app/pages/que-empresa-abrir-uruguay.vue` | The page: wizard → verdict → comparison table → guide → trámites → apoyos → FAQ → sources → disclaimer. |
| `app/utils/siteNav.ts` | +1 `NavEntry` in the `services` section (mandatory for CI). |
| `app/i18n/locales/json/{es,en,pt}.json` | +1 key: `nav.queEmpresaAbrir`. |
| `app/server/utils/companyFiguresLive.ts` | Guardrailed Gemini refresher + band validation + fs persistence. |
| `app/server/api/company-figures.get.ts` | Cached handler; self-heals when stale; never blocks. |
| `app/server/tasks/company/daily.ts` | Nitro scheduled task. |
| `app/server/utils/uyFiguresLive.ts` | **Modify:** extend `WATCHED[]` with the new baked constants. |
| `app/nuxt.config.ts` | **Modify:** `nitro.storage.company` + `nitro.scheduledTasks` cron. |

---

## Task 1: Close the BPS Servicios Personales research gap

The spec recommends **IRPF Cat. II** as the sound path for freelancers (the single most common visitor). We have the IRPF scale but **not** the BPS contribution for a *no dependiente* who provides servicios personales (rate, ficto mínimo, FONASA). Without it we cannot cost that path. **Do not guess it.**

**Files:**
- Modify: `docs/superpowers/specs/2026-07-13-que-empresa-abrir-uruguay-design.md` (add §5.5-ter)

**Interfaces:**
- Produces: verified constants `SERVICIOS_PERSONALES_BPS` (or a documented decision that they are unverifiable), consumed by Task 5's cost model.

- [ ] **Step 1: Fetch the BPS primary source**

Fetch these, in order, and read the actual rate/ficto tables:
1. `https://www.bps.gub.uy/16500/trabajadores-no-dependientes.html`
2. `https://www.bps.gub.uy/5478/valores-actuales.html`
3. Search `bps.gub.uy` for "aportación servicios personales" / "profesionales" / "ficto mínimo servicios personales 2026"

Answer precisely:
- What is the contribution base for a *no dependiente* providing servicios personales — **real income** or a **ficto**?
- What is the **minimum ficto** (in BFC or BPC) for 2026, and the resulting UYU/month floor?
- Which rates apply (montepío 15% + FONASA %?) and is FONASA optional or mandatory?
- **Professionals with a Caja paraestatal (CJPPU — abogados, arquitectos, contadores, ingenieros…) do NOT contribute to BPS.** Confirm this and state which activities fall under CJPPU vs. BPS. A software developer is **not** a CJPPU profession — confirm they go to BPS.

- [ ] **Step 2: Record the result in the spec**

Add a `### 5.5-ter Servicios personales — aportación BPS` section to the spec with the verified figures, each with source URL + `verifiedAt`.

**If a figure cannot be verified from a BPS primary source, write it into the spec's §9 ("Lo que no podemos afirmar") instead**, and note that the page will present the IRPF Cat. II path **without a BPS cost figure**, saying explicitly that the BPS contribution depends on the activity and Caja and must be confirmed. That is an acceptable, honest outcome — a guessed number is not.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-13-que-empresa-abrir-uruguay-design.md
git commit -m "docs(empresas): verify BPS aportacion for servicios personales"
```

---

## Task 2: `companyTypes.ts` — types and verified constants

**Files:**
- Create: `app/utils/companyTypes.ts`
- Test: `app/tests/unit/companyTypes.test.ts`

**Interfaces:**
- Produces: `Figure`, `fig()`, `FIGURES`, `RegimeId`, `WizardInput`, `Eligibility`, `GateReason`, `Lockout`, `CostBreakdown`, `RankedRegime`, `Verdict`, `REGIMES`. Every later task consumes these exact names.

- [ ] **Step 1: Write the failing structural test**

Create `app/tests/unit/companyTypes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { FIGURES, REGIMES, type Figure } from '../../utils/companyTypes'

const isFigure = (v: unknown): v is Figure =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Figure).value === 'number' &&
  typeof (v as Figure).label === 'string' &&
  typeof (v as Figure).source === 'string' &&
  typeof (v as Figure).verifiedAt === 'string'

describe('FIGURES', () => {
  it('exposes every numeric constant as a sourced Figure', () => {
    const entries = Object.entries(FIGURES)
    expect(entries.length).toBeGreaterThan(15)
    for (const [key, value] of entries) {
      expect(isFigure(value), `FIGURES.${key} is not a Figure`).toBe(true)
    }
  })

  it('sources every figure to a primary domain with an ISO verification date', () => {
    const PRIMARY = ['bps.gub.uy', 'dgi.gub.uy', 'gub.uy', 'impo.com.uy', 'ine.gub.uy', 'bcu.gub.uy']
    for (const [key, f] of Object.entries(FIGURES)) {
      expect(f.source, `FIGURES.${key} has no URL`).toMatch(/^https:\/\//)
      expect(
        PRIMARY.some(d => f.source.includes(d)),
        `FIGURES.${key} is not sourced to a primary domain: ${f.source}`
      ).toBe(true)
      expect(f.verifiedAt, `FIGURES.${key} has a bad date`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('does not recompute the peso ceilings from the live UI value', () => {
    // The ceilings are annual constants published by BPS/DGI, fixed with the UI at
    // the close of the PREVIOUS ejercicio. Recomputing them with today's UI is wrong.
    expect(FIGURES.topeMonotributoUnipersonalUyu.value).toBe(1_175_537)
    expect(FIGURES.topeLiteralEUyu.value).toBe(1_959_229)
    const wrong = FIGURES.topeMonotributoUnipersonalUi.value * FIGURES.uiHoy.value
    expect(FIGURES.topeMonotributoUnipersonalUyu.value).not.toBe(Math.round(wrong))
  })
})

describe('REGIMES', () => {
  it('has a unique id, a name and at least one source per regime', () => {
    const ids = REGIMES.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of REGIMES) {
      expect(r.name.length).toBeGreaterThan(0)
      expect(r.sources.length).toBeGreaterThan(0)
      expect(['ilimitada', 'limitada']).toContain(r.liability)
    }
  })

  it('marks every simplified regime that has an exit lockout', () => {
    const mono = REGIMES.find(r => r.id === 'monotributo')!
    expect(mono.lockout?.years).toBe(3)
    expect(mono.lockout?.url).toContain('impo.com.uy')
    const litE = REGIMES.find(r => r.id === 'unipersonal-literal-e')!
    expect(litE.lockout?.years).toBe(3)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd app && npx vitest run tests/unit/companyTypes.test.ts
```
Expected: FAIL — `Failed to resolve import "../../utils/companyTypes"`.

- [ ] **Step 3: Write `companyTypes.ts` — types + constants**

Create `app/utils/companyTypes.ts`:

```ts
// Which legal form should a Uruguayan entrepreneur open? Verified catalogue of
// regimes, the legal eligibility gates that rule each one in or out, and the cost
// model, for `pages/que-empresa-abrir-uruguay.vue`.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so it can be unit-tested
// in plain Node via vitest.
//
// EVERY numeric constant is a `Figure` carrying its primary source and the date it
// was verified. `tests/unit/companyTypes.test.ts` fails the build if one is added
// without a source. This is a legal-information page: an unsourced number is a bug.
//
// The peso ceilings are ANNUAL CONSTANTS published by BPS/DGI, fixed with the UI at
// the close of the previous ejercicio. They are NOT recomputed from today's UI.
// Refresh them, and the BPS/DGI tables below, every January (the Telegram drift
// watchdog in server/utils/uyFiguresLive.ts will nag).

/** A number that is safe to publish: it has a primary source and a verification date. */
export interface Figure {
  value: number
  label: string
  /** URL of the primary source (BPS / DGI / IMPO / INE / BCU). */
  source: string
  /** ISO date (YYYY-MM-DD) the value was last checked against that source. */
  verifiedAt: string
}

const V = '2026-07-13'
const fig = (value: number, label: string, source: string): Figure => ({
  value,
  label,
  source,
  verifiedAt: V,
})

const BPS_VALORES = 'https://www.bps.gub.uy/5478/valores-actuales.html'
const BPS_TOPES = 'https://www.bps.gub.uy/23987/tope-de-ingresos-y-capital-de-la-empresa.html'
const BPS_MONO = 'https://www.bps.gub.uy/6668/monotributo-ley-18083.html'
const BPS_MONO_GRAD = 'https://www.bps.gub.uy/18051/monotributo-ley-19942.html'
const BPS_MONO_SOCIAL = 'https://www.bps.gub.uy/6667/monotributo-social-mides-ley-18874.html'
const BPS_IC = 'https://www.bps.gub.uy/6665/industria-y-comercio.html'
const BPS_GRADUAL =
  'https://www.bps.gub.uy/17829/regimen-de-aportacion-gradual-vigente-desde-1_2021-ley-19889.html'
const DGI_LITERAL_E =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/tope-ingresos-anuales-para-pequenas-empresas-iva-minimo'
const DGI_IVA_MINIMO =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/cuota-iva-minimo-valores-vigentes'
const DGI_EFACTURA_BENEF =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/beneficios-tributarios-para-contribuyentes-iva-minimo'
const DGI_ICOSA =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/impuesto-control-sociedades-anonimas-icosa-valores-2026'
const DGI_UI = 'https://www.gub.uy/direccion-general-impositiva/datos-y-estadisticas/datos/unidad-indexada'
const SAS_TRAMITE =
  'https://www.gub.uy/tramites/registro-sociedad-acciones-simplificada-sas-persona-fisica'
const UNIP_TRAMITE = 'https://www.gub.uy/tramites/inscripcion-empresa-unipersonal'
const IRPF_ESCALA =
  'https://www.bps.gub.uy/bps/file/23860/3/2026---comunicado-r-5---valores-escalas-irpf-2026.pdf'

/** Verified 2026 constants. Nothing numeric may live outside this object. */
export const FIGURES = {
  // --- Índices ---
  uiHoy: fig(6.615, 'Unidad Indexada (13/07/2026)', DGI_UI),
  uiCierre2025: fig(6.4237, 'UI al 01/01/2026 (fija los topes 2026)', DGI_UI),
  bpc: fig(6864, 'BPC 2026', BPS_VALORES),
  bfc: fig(1847.96, 'BFC 2026', BPS_VALORES),

  // --- Topes (constantes anuales; NO recalcular con la UI de hoy) ---
  topeMonotributoUnipersonalUi: fig(183_000, 'Tope monotributo unipersonal (UI)', BPS_TOPES),
  topeMonotributoUnipersonalUyu: fig(1_175_537, 'Tope monotributo unipersonal 2026', BPS_TOPES),
  topeMonotributoSociedadUyu: fig(1_959_229, 'Tope monotributo sociedad de hecho 2026', BPS_TOPES),
  topeMonotributoActivosUyu: fig(979_614, 'Tope de activos del monotributo 2026', BPS_TOPES),
  topeLiteralEUi: fig(305_000, 'Tope Literal E (UI)', DGI_LITERAL_E),
  topeLiteralEUyu: fig(1_959_229, 'Tope Literal E 2026', DGI_LITERAL_E),
  topeIraePreceptivoUi: fig(4_000_000, 'Tope de IRAE preceptivo / dividendos exentos (UI)', DGI_LITERAL_E),
  topeLocalM2: fig(15, 'Superficie máxima del local (monotributo)', 'https://www.impo.com.uy/bases/decretos/199-2007'),

  // --- Monotributo (BPS, vigencia enero 2026) ---
  monoPlenoSinFonasa: fig(2637, 'Monotributo pleno, sin FONASA', BPS_MONO),
  monoPlenoFonasaSolo: fig(6327, 'Monotributo pleno, con FONASA, sin cónyuge ni hijos', BPS_MONO),
  monoPlenoFonasaHijos: fig(6996, 'Monotributo pleno, con FONASA, con hijos', BPS_MONO),
  monoPlenoFonasaConyuge: fig(7219, 'Monotributo pleno, con FONASA, con cónyuge', BPS_MONO),
  monoPlenoFonasaConyugeHijos: fig(7888, 'Monotributo pleno, con FONASA, con cónyuge e hijos', BPS_MONO),
  monoAnio1SinFonasa: fig(1071, 'Monotributo año 1 (25%), sin FONASA', BPS_MONO_GRAD),
  monoAnio1FonasaSolo: fig(4761, 'Monotributo año 1 (25%), con FONASA', BPS_MONO_GRAD),
  monoAnio2SinFonasa: fig(1594, 'Monotributo año 2 (50%), sin FONASA', BPS_MONO_GRAD),
  monoAnio2FonasaSolo: fig(5284, 'Monotributo año 2 (50%), con FONASA', BPS_MONO_GRAD),
  monoSocioSociedadHecho: fig(2088, 'Monotributo, jubilatorio + FRL por socio', BPS_MONO),

  // --- Monotributo Social MIDES ---
  monoSocialAnio1SinFonasa: fig(659, 'Monotributo social año 1 (25%), sin FONASA', BPS_MONO_SOCIAL),
  monoSocialAnio2SinFonasa: fig(1320, 'Monotributo social año 2 (50%), sin FONASA', BPS_MONO_SOCIAL),
  monoSocialAnio3SinFonasa: fig(1979, 'Monotributo social año 3 (75%), sin FONASA', BPS_MONO_SOCIAL),

  // --- BPS del titular / socios ---
  bpsUnipersonalPleno: fig(8833, 'BPS titular unipersonal (11 BFC, FONASA, soltero)', BPS_IC),
  bpsUnipersonalAnio1: fig(7689, 'BPS titular unipersonal, año 1 (Ley 19.889)', BPS_GRADUAL),
  bpsUnipersonalAnio2: fig(8070, 'BPS titular unipersonal, año 2', BPS_GRADUAL),
  bpsUnipersonalAnio3: fig(8451, 'BPS titular unipersonal, año 3', BPS_GRADUAL),
  bpsUnipersonalConFonasaDeEmpleo: fig(5143, 'BPS titular que ya aporta FONASA por un empleo', BPS_IC),
  bpsSocioSrl: fig(6265, 'BPS socio de SRL con actividad (15 BFC, sin FONASA)', BPS_IC),
  bpsAdminSas: fig(10_504, 'BPS administrador de SAS (15 BFC, FONASA obligatorio)', BPS_IC),

  // --- IVA mínimo (Literal E) ---
  ivaMinimo: fig(5910, 'Cuota de IVA mínimo 2026', DGI_IVA_MINIMO),
  ivaMinimoAnio1: fig(1478, 'IVA mínimo año 1 (25%)', DGI_IVA_MINIMO),
  ivaMinimoAnio2: fig(2955, 'IVA mínimo año 2 (50%)', DGI_IVA_MINIMO),
  ivaMinimoTopeEfactura: fig(0.033, 'Tope: 3,3% de los ingresos del mes con e-factura', DGI_EFACTURA_BENEF),

  // --- Sociedades ---
  irae: fig(0.25, 'Tasa de IRAE', 'https://www.impo.com.uy/bases/todgi-2023/4-2024'),
  irpfDividendos: fig(0.07, 'IRPF Cat. I sobre dividendos', 'https://www.impo.com.uy/bases/todgi-2023/7-2024'),
  icosaConstitucion: fig(55_732, 'ICOSA a la constitución (solo SA)', DGI_ICOSA),
  icosaAnual: fig(27_866, 'ICOSA anual (solo SA)', DGI_ICOSA),

  // --- Costos de constitución ---
  setupUnipersonal: fig(270, 'Timbre profesional (unipersonal)', UNIP_TRAMITE),
  setupSas: fig(2530, 'Costo estatal SAS digital (DGR + DGI + BPS)', SAS_TRAMITE),
  setupSrl: fig(540, 'Timbres SRL (sin publicaciones ni escribano)', UNIP_TRAMITE),

  // --- IRPF Cat. II ---
  irpfFictoGastos: fig(0.3, 'Ficto de gastos deducible (IRPF Cat. II)', IRPF_ESCALA),
  irpfMinimoNoImponibleMensual: fig(48_048, 'Mínimo no imponible mensual (7 BPC)', IRPF_ESCALA),
} as const satisfies Record<string, Figure>

/** Monthly IRPF Cat. II scale for 2026, in UYU. `upTo: null` = top bracket. */
export const IRPF_CAT2_BRACKETS: ReadonlyArray<{ upTo: number | null; rate: number }> = Object.freeze([
  { upTo: 48_048, rate: 0 },
  { upTo: 68_640, rate: 0.1 },
  { upTo: 102_960, rate: 0.15 },
  { upTo: 205_920, rate: 0.24 },
  { upTo: 343_200, rate: 0.25 },
  { upTo: 514_800, rate: 0.27 },
  { upTo: 789_360, rate: 0.31 },
  { upTo: null, rate: 0.36 },
])

export type RegimeId =
  | 'monotributo-social'
  | 'monotributo'
  | 'unipersonal-literal-e'
  | 'irpf-servicios'
  | 'unipersonal-irae'
  | 'sociedad-hecho'
  | 'srl'
  | 'sas'
  | 'sa'

export type Eligibility = 'elegible' | 'dudoso' | 'excluido'

/** Why a regime was ruled out (or flagged), always with the norm that says so. */
export interface GateReason {
  status: 'excluido' | 'dudoso'
  text: string
  norm: string
  url: string
}

/** How long you are barred from coming back after leaving a regime. */
export interface Lockout {
  years: number
  text: string
  norm: string
  url: string
}

export interface Source {
  label: string
  url: string
}

export interface Regime {
  id: RegimeId
  name: string
  short: string
  liability: 'ilimitada' | 'limitada'
  lockout?: Lockout
  sources: readonly Source[]
}

export const REGIMES: readonly Regime[] = Object.freeze([
  {
    id: 'monotributo-social',
    name: 'Monotributo Social MIDES',
    short: 'Para emprendimientos de hogares en situación de vulnerabilidad. Requiere calificación previa de MIDES.',
    liability: 'ilimitada',
    lockout: {
      years: 3,
      text: 'Si superás el tope quedás fuera; podés volver al ejercicio siguiente con el aval de MIDES.',
      norm: 'Ley 18.874 art. 4',
      url: 'https://www.impo.com.uy/bases/leyes/18874-2011',
    },
    sources: [{ label: 'BPS — Monotributo social', url: BPS_MONO_SOCIAL }],
  },
  {
    id: 'monotributo',
    name: 'Monotributo',
    short: 'Un pago único que sustituye impuestos y aportes. Solo unipersonales y sociedades de hecho que venden a consumidor final.',
    liability: 'ilimitada',
    lockout: {
      years: 3,
      text: 'Si incumplís cualquier condición salís de pleno derecho e inmediato, y no podés volver hasta que termine el tercer año civil posterior. Aplica incluso si te vas voluntariamente.',
      norm: 'Decreto 199/007 arts. 13 y 14',
      url: 'https://www.impo.com.uy/bases/decretos/199-2007',
    },
    sources: [
      { label: 'BPS — Monotributo', url: BPS_MONO },
      { label: 'Ley 18.083 arts. 70-84', url: 'https://www.impo.com.uy/bases/leyes/18083-2006/70' },
    ],
  },
  {
    id: 'unipersonal-literal-e',
    name: 'Unipersonal — Literal E',
    short: 'Pequeña empresa: exonerada de IRAE, paga IVA mínimo. Con e-factura, el IVA mínimo pasa a ser el menor entre la cuota y el 3,3% de lo facturado.',
    liability: 'ilimitada',
    lockout: {
      years: 3,
      text: 'Si superás el tope liquidás IRAE desde el excedente, en ese mismo ejercicio, y quedás obligado a liquidar IRAE por un mínimo de 3 ejercicios.',
      norm: 'Título 4 art. 66 lit. E',
      url: 'https://www.impo.com.uy/bases/todgi-2023/4-2024',
    },
    sources: [
      { label: 'DGI — Tope de ingresos, pequeñas empresas', url: DGI_LITERAL_E },
      { label: 'DGI — Beneficios de e-factura (3,3%)', url: DGI_EFACTURA_BENEF },
    ],
  },
  {
    id: 'irpf-servicios',
    name: 'Servicios personales — IRPF Cat. II',
    short: 'El camino del profesional independiente: IRPF progresivo con mínimo no imponible, 30% de gastos fictos, e IVA con exportación a tasa 0%.',
    liability: 'ilimitada',
    sources: [{ label: 'BPS — Escalas de IRPF 2026', url: IRPF_ESCALA }],
  },
  {
    id: 'unipersonal-irae',
    name: 'Unipersonal — IRAE',
    short: 'Cuando superás el tope de Literal E: IRAE al 25% (ficto o real) más IVA en régimen general.',
    liability: 'ilimitada',
    sources: [{ label: 'Título 4 (IRAE)', url: 'https://www.impo.com.uy/bases/todgi-2023/4-2024' }],
  },
  {
    id: 'sociedad-hecho',
    name: 'Sociedad de hecho',
    short: 'Se configura sola cuando dos personas operan juntas sin formalizar. Responsabilidad solidaria e ilimitada, y cualquier socio puede disolverla.',
    liability: 'ilimitada',
    sources: [{ label: 'Ley 16.060 arts. 36-43', url: 'https://www.impo.com.uy/bases/leyes/16060-1989' }],
  },
  {
    id: 'srl',
    name: 'SRL',
    short: 'Responsabilidad limitada, mínimo 2 socios. Ceder cuotas exige unanimidad si son 5 socios o menos, más escribano y publicación.',
    liability: 'limitada',
    sources: [{ label: 'Ley 16.060', url: 'https://www.impo.com.uy/bases/leyes/16060-1989' }],
  },
  {
    id: 'sas',
    name: 'SAS',
    short: 'Responsabilidad limitada con un solo socio, sin capital mínimo, sin escribano y 100% online. Pero el administrador paga BPS aunque no facture.',
    liability: 'limitada',
    sources: [
      { label: 'Ley 19.820', url: 'https://www.impo.com.uy/bases/leyes/19820-2019' },
      { label: 'Trámite SAS digital', url: SAS_TRAMITE },
    ],
  },
  {
    id: 'sa',
    name: 'SA',
    short: 'Cara y lenta: escritura pública, control de la AIN, y ICOSA para siempre. Hoy rara vez conviene a una empresa chica.',
    liability: 'limitada',
    sources: [{ label: 'DGI — ICOSA 2026', url: DGI_ICOSA }],
  },
])
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
cd app && npx vitest run tests/unit/companyTypes.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Lint and commit**

```bash
cd app && npm run lint
git add app/utils/companyTypes.ts app/tests/unit/companyTypes.test.ts
git commit -m "feat(empresas): verified 2026 constants + regime catalogue"
```

---

## Task 3: The eligibility gates

**Files:**
- Modify: `app/utils/companyTypes.ts`
- Test: `app/tests/unit/companyTypes.test.ts`

**Interfaces:**
- Consumes: `RegimeId`, `Eligibility`, `GateReason`, `FIGURES`, `REGIMES` (Task 2).
- Produces: `WizardInput`, `GateOutcome`, `applyGates(input): GateOutcome[]`.

- [ ] **Step 1: Write the failing tests**

Append to `app/tests/unit/companyTypes.test.ts`:

```ts
import { applyGates, type WizardInput } from '../../utils/companyTypes'

const base: WizardInput = {
  annualRevenueUyu: 600_000,
  sells: 'bienes',
  clients: 'consumidor-final',
  people: 'solo',
  employees: 0,
  needsLimitedLiability: false,
  otherCompanyRole: false,
}

const statusOf = (input: WizardInput, id: string) =>
  applyGates(input).find(g => g.regime === id)!.status

describe('applyGates', () => {
  it('lets a small shop selling to consumers keep monotributo', () => {
    expect(statusOf(base, 'monotributo')).toBe('elegible')
  })

  it('bars servicios personales from monotributo (Ley 18.083 art. 72 lit. C)', () => {
    const g = applyGates({ ...base, sells: 'servicios' }).find(x => x.regime === 'monotributo')!
    expect(g.status).toBe('excluido')
    expect(g.reasons[0]!.norm).toContain('72')
    expect(g.reasons[0]!.url).toMatch(/^https:\/\//)
  })

  it('flags Literal E as DUDOSO — not excluded — for pure servicios personales', () => {
    const g = applyGates({ ...base, sells: 'servicios' }).find(
      x => x.regime === 'unipersonal-literal-e'
    )!
    expect(g.status).toBe('dudoso')
    expect(g.reasons[0]!.url).toContain('4761')
  })

  it('bars monotributo when the client is a company (art. 71 lit. D)', () => {
    expect(statusOf({ ...base, clients: 'empresas' }, 'monotributo')).toBe('excluido')
  })

  it('bars monotributo with more than one employee', () => {
    expect(statusOf({ ...base, employees: 2 }, 'monotributo')).toBe('excluido')
  })

  it('bars monotributo for a director of another company, even a dormant one', () => {
    expect(statusOf({ ...base, otherCompanyRole: true }, 'monotributo')).toBe('excluido')
  })

  it('bars monotributo above the unipersonal ceiling', () => {
    expect(statusOf({ ...base, annualRevenueUyu: 1_200_000 }, 'monotributo')).toBe('excluido')
  })

  it('bars Literal E above its ceiling but leaves IRAE open', () => {
    const input = { ...base, annualRevenueUyu: 2_500_000 }
    expect(statusOf(input, 'unipersonal-literal-e')).toBe('excluido')
    expect(statusOf(input, 'unipersonal-irae')).toBe('elegible')
  })

  it('bars SRL for a single founder (Ley 16.060 needs 2 socios) but allows SAS', () => {
    expect(statusOf(base, 'srl')).toBe('excluido')
    expect(statusOf(base, 'sas')).toBe('elegible')
  })

  it('bars every unlimited-liability regime when limited liability is required', () => {
    const out = applyGates({ ...base, needsLimitedLiability: true })
    for (const id of ['monotributo', 'unipersonal-literal-e', 'sociedad-hecho'] as const) {
      expect(out.find(g => g.regime === id)!.status).toBe('excluido')
    }
    expect(out.find(g => g.regime === 'sas')!.status).toBe('elegible')
  })

  it('bars unipersonal regimes when there are 2+ socios', () => {
    expect(statusOf({ ...base, people: 'socios' }, 'monotributo')).toBe('excluido')
    expect(statusOf({ ...base, people: 'socios' }, 'unipersonal-literal-e')).toBe('excluido')
    expect(statusOf({ ...base, people: 'socios' }, 'srl')).toBe('elegible')
  })

  it('cites a norm and a URL on every exclusion', () => {
    const out = applyGates({ ...base, sells: 'servicios', employees: 2, needsLimitedLiability: true })
    for (const g of out) {
      for (const r of g.reasons) {
        expect(r.norm.length).toBeGreaterThan(0)
        expect(r.url).toMatch(/^https:\/\//)
        expect(r.text.length).toBeGreaterThan(0)
      }
    }
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
cd app && npx vitest run tests/unit/companyTypes.test.ts
```
Expected: FAIL — `applyGates` is not exported.

- [ ] **Step 3: Implement the gates**

Append to `app/utils/companyTypes.ts`:

```ts
const L = {
  ley18083_70: {
    norm: 'Ley 18.083 art. 70',
    url: 'https://www.impo.com.uy/bases/leyes/18083-2006/70',
  },
  ley18083_71: {
    norm: 'Ley 18.083 art. 71',
    url: 'https://www.impo.com.uy/bases/leyes/18083-2006/71',
  },
  ley18083_72: {
    norm: 'Ley 18.083 art. 72',
    url: 'https://www.impo.com.uy/bases/leyes/18083-2006/72',
  },
  dto199: { norm: 'Decreto 199/007', url: 'https://www.impo.com.uy/bases/decretos/199-2007' },
  titulo4_66E: {
    norm: 'Título 4 art. 66 lit. E',
    url: 'https://www.impo.com.uy/bases/todgi-2023/4-2024',
  },
  consulta4761: {
    norm: 'Consulta DGI 4761',
    url: 'https://www.impo.com.uy/bases/consultas-tributarias/4761-2008',
  },
  ley16060_223: { norm: 'Ley 16.060 art. 223', url: 'https://www.impo.com.uy/bases/leyes/16060-1989' },
  ley16060_39: { norm: 'Ley 16.060 art. 39', url: 'https://www.impo.com.uy/bases/leyes/16060-1989' },
} as const

/** What the visitor told the wizard. */
export interface WizardInput {
  /** Estimated annual revenue, in UYU. */
  annualRevenueUyu: number
  sells: 'bienes' | 'servicios' | 'ambos'
  clients: 'consumidor-final' | 'empresas' | 'exterior' | 'mixto'
  people: 'solo' | 'conyuge' | 'socios'
  /** 0, 1, or 2 meaning "2 o más". */
  employees: 0 | 1 | 2
  /** Has employees, debt, credit inventory, contracts with penalties, or can harm third parties. */
  needsLimitedLiability: boolean
  /** Already a socio of another sociedad personal, or a director of an SA — even a dormant one. */
  otherCompanyRole: boolean
  /** Qualified by MIDES (household below the poverty line). */
  midesEligible?: boolean
  /** Local larger than 15 m², or inside a shopping centre. */
  localTooBig?: boolean
  /** Business assets, in UYU. */
  assetsUyu?: number
  /** Documents every operation by e-factura (unlocks the 3,3% IVA mínimo cap). */
  eFactura?: boolean
  /** Full years already operating. 0 = brand new (unlocks the gradual regimes). */
  yearsOperating?: number
  /** Drives the FONASA column of the BPS tables. */
  family?: 'solo' | 'con-hijos' | 'con-conyuge' | 'con-conyuge-e-hijos'
  /** Already covered by FONASA through a salaried job. */
  fonasaFromJob?: boolean
}

export interface GateOutcome {
  regime: RegimeId
  status: Eligibility
  reasons: GateReason[]
}

const uyu = (n: number) => `$${Math.round(n).toLocaleString('es-UY')}`

/**
 * Rule each regime in or out on LEGAL grounds alone. Cost never enters here: a
 * regime you don't qualify for isn't "more expensive", it's illegal.
 *
 * `dudoso` is reserved for a genuine legal grey zone (a freelance in Literal E),
 * where we surface the tension rather than pretend to resolve it.
 */
export function applyGates(input: WizardInput): GateOutcome[] {
  const servicios = input.sells === 'servicios'
  const anyServicios = input.sells === 'servicios' || input.sells === 'ambos'
  const socios = input.people === 'socios'
  const solo = !socios

  return REGIMES.map(regime => {
    const reasons: GateReason[] = []
    const out = (text: string, l: { norm: string; url: string }) =>
      reasons.push({ status: 'excluido', text, norm: l.norm, url: l.url })
    const doubt = (text: string, l: { norm: string; url: string }) =>
      reasons.push({ status: 'dudoso', text, norm: l.norm, url: l.url })

    // Unlimited liability kills every simple regime when the visitor needs a shield.
    if (input.needsLimitedLiability && regime.liability === 'ilimitada') {
      out(
        'Necesitás responsabilidad limitada, y en esta figura respondés con tu patrimonio personal.',
        L.ley16060_39
      )
    }

    switch (regime.id) {
      case 'monotributo':
      case 'monotributo-social': {
        if (regime.id === 'monotributo-social' && !input.midesEligible) {
          out(
            'Requiere calificación previa de MIDES: el hogar debe estar bajo la línea de pobreza o en situación de vulnerabilidad.',
            { norm: 'Ley 18.874 art. 2', url: 'https://www.impo.com.uy/bases/leyes/18874-2011' }
          )
        }
        if (anyServicios) {
          out(
            'El monotributo excluye a quienes prestan servicios personales fuera de la relación de dependencia.',
            L.ley18083_72
          )
        }
        if (input.otherCompanyRole) {
          out(
            'No podés ser monotributista si sos socio de otra sociedad personal o director de una SA, aun cuando esté inactiva.',
            L.ley18083_72
          )
        }
        if (input.clients === 'empresas' || input.clients === 'exterior') {
          out('El monotributista solo puede vender a consumidores finales.', L.ley18083_71)
        }
        const maxEmployees = regime.id === 'monotributo-social' ? 0 : solo ? 1 : 0
        if (input.employees > maxEmployees) {
          out(
            maxEmployees === 0
              ? 'Esta figura no admite ningún dependiente.'
              : 'La unipersonal monotributista admite como máximo 1 dependiente.',
            L.ley18083_70
          )
        }
        if (input.localTooBig) {
          out(
            'El local no puede superar los 15 m² ni estar dentro de un centro comercial.',
            L.dto199
          )
        }
        const tope = socios
          ? FIGURES.topeMonotributoSociedadUyu.value
          : FIGURES.topeMonotributoUnipersonalUyu.value
        if (input.annualRevenueUyu > tope) {
          out(`Superás el tope de ingresos (${uyu(tope)} al año en 2026).`, L.ley18083_71)
        }
        if (
          regime.id === 'monotributo' &&
          input.assetsUyu !== undefined &&
          input.assetsUyu > FIGURES.topeMonotributoActivosUyu.value
        ) {
          out(
            `Superás el tope de activos (${uyu(FIGURES.topeMonotributoActivosUyu.value)}).`,
            L.dto199
          )
        }
        break
      }

      case 'unipersonal-literal-e':
      case 'unipersonal-irae': {
        if (socios) {
          out('Una unipersonal, por definición, tiene un solo titular.', L.ley16060_223)
        }
        if (regime.id === 'unipersonal-literal-e') {
          if (input.annualRevenueUyu > FIGURES.topeLiteralEUyu.value) {
            out(
              `Superás el tope del Literal E (${uyu(FIGURES.topeLiteralEUyu.value)} al año en 2026).`,
              L.titulo4_66E
            )
          }
          if (servicios) {
            doubt(
              'El Literal E excluye a quien obtiene rentas NO empresariales, y los servicios personales puros son renta de trabajo, no renta empresarial. En la práctica se hace, pero la norma está en tensión: consultá un contador.',
              L.consulta4761
            )
          }
        }
        break
      }

      case 'irpf-servicios': {
        if (socios) {
          out('Es el régimen de una persona física, no de una sociedad.', L.titulo4_66E)
        }
        if (!anyServicios) {
          out(
            'Aplica a servicios personales fuera de la relación de dependencia, no a la venta de bienes.',
            L.titulo4_66E
          )
        }
        break
      }

      case 'sociedad-hecho': {
        if (!socios) {
          out('Requiere dos o más personas operando juntas.', L.ley16060_223)
        }
        break
      }

      case 'srl': {
        if (!socios) {
          out('La SRL exige un mínimo de 2 socios. Si vas solo, la figura equivalente es la SAS.', L.ley16060_223)
        }
        break
      }

      case 'sas':
      case 'sa':
        break
    }

    const status: Eligibility = reasons.some(r => r.status === 'excluido')
      ? 'excluido'
      : reasons.some(r => r.status === 'dudoso')
        ? 'dudoso'
        : 'elegible'

    return { regime: regime.id, status, reasons }
  })
}
```

- [ ] **Step 4: Run and watch it pass**

```bash
cd app && npx vitest run tests/unit/companyTypes.test.ts
```
Expected: PASS (all gate tests green).

- [ ] **Step 5: Lint and commit**

```bash
cd app && npm run lint
git add app/utils/companyTypes.ts app/tests/unit/companyTypes.test.ts
git commit -m "feat(empresas): legal eligibility gates with cited norms"
```

---

## Task 4: The cost model

**Files:**
- Modify: `app/utils/companyTypes.ts`
- Test: `app/tests/unit/companyTypes.test.ts`

**Interfaces:**
- Consumes: `FIGURES`, `IRPF_CAT2_BRACKETS`, `WizardInput`, `RegimeId` (Tasks 2-3).
- Produces: `CostBreakdown`, `estimateCost(regime, input): CostBreakdown | null`, `irpfCat2Monthly(taxableMonthly): number`.

**Note on the accountant fee:** it is a **market** figure, not an official one, so it is **not** in `FIGURES`. It enters the model as an input the user can change (`accountantMonthly`, default `4000`), and the page labels it "estimación de mercado — ajustala". Never present it as sourced.

- [ ] **Step 1: Write the failing tests**

Append to `app/tests/unit/companyTypes.test.ts`:

```ts
import { estimateCost, irpfCat2Monthly, FIGURES as F } from '../../utils/companyTypes'

describe('irpfCat2Monthly', () => {
  it('taxes nothing below the mínimo no imponible', () => {
    expect(irpfCat2Monthly(48_000)).toBe(0)
  })

  it('applies the brackets marginally, not as a cliff', () => {
    // 60.000: first 48.048 at 0%, the remaining 11.952 at 10%.
    expect(irpfCat2Monthly(60_000)).toBeCloseTo(1195.2, 1)
  })

  it('is monotonically non-decreasing', () => {
    let prev = -1
    for (let m = 0; m <= 1_000_000; m += 10_000) {
      const t = irpfCat2Monthly(m)
      expect(t).toBeGreaterThanOrEqual(prev)
      prev = t
    }
  })
})

describe('estimateCost', () => {
  const base: WizardInput = {
    annualRevenueUyu: 600_000,
    sells: 'bienes',
    clients: 'consumidor-final',
    people: 'solo',
    employees: 0,
    needsLimitedLiability: false,
    otherCompanyRole: false,
    yearsOperating: 5,
    family: 'solo',
  }

  it('costs a full-regime monotributo at the BPS table value', () => {
    const c = estimateCost('monotributo', base)!
    expect(c.bpsMonthly).toBe(F.monoPlenoFonasaSolo.value)
    expect(c.taxMonthly).toBe(0) // monotributo substitutes the taxes
    expect(c.totalMonthly).toBe(F.monoPlenoFonasaSolo.value)
  })

  it('applies the Ley 19.942 gradual scale to a brand-new monotributo', () => {
    const c = estimateCost('monotributo', { ...base, yearsOperating: 0 })!
    expect(c.bpsMonthly).toBe(F.monoAnio1FonasaSolo.value)
  })

  it('costs Literal E as BPS + the flat IVA mínimo when NOT e-invoicing', () => {
    const c = estimateCost('unipersonal-literal-e', { ...base, eFactura: false })!
    expect(c.bpsMonthly).toBe(F.bpsUnipersonalPleno.value)
    expect(c.taxMonthly).toBe(F.ivaMinimo.value)
    expect(c.totalMonthly).toBe(F.bpsUnipersonalPleno.value + F.ivaMinimo.value)
  })

  it('caps the IVA mínimo at 3,3% of monthly billing when e-invoicing', () => {
    // 600.000/year = 50.000/month. 3,3% = 1.650 < the 5.910 quota.
    const c = estimateCost('unipersonal-literal-e', { ...base, eFactura: true })!
    expect(c.taxMonthly).toBeCloseTo(1650, 0)
    expect(c.notes.join(' ')).toContain('3,3%')
  })

  it('never charges more than the quota even when 3,3% would exceed it', () => {
    const rich = { ...base, annualRevenueUyu: 1_900_000, eFactura: true }
    const c = estimateCost('unipersonal-literal-e', rich)!
    expect(c.taxMonthly).toBe(F.ivaMinimo.value)
  })

  it('charges the SAS administrator BPS even at zero revenue', () => {
    const c = estimateCost('sas', { ...base, annualRevenueUyu: 0 })!
    expect(c.bpsMonthly).toBe(F.bpsAdminSas.value)
    expect(c.totalMonthly).toBeGreaterThanOrEqual(F.bpsAdminSas.value)
  })

  it('adds ICOSA to the SA and to nobody else', () => {
    const sa = estimateCost('sa', base)!
    const sas = estimateCost('sas', base)!
    expect(sa.setupCost).toBeGreaterThanOrEqual(F.icosaConstitucion.value)
    expect(sa.notes.join(' ')).toContain('ICOSA')
    expect(sas.notes.join(' ')).not.toContain('ICOSA')
  })

  it('is monotonically non-decreasing in revenue for every regime', () => {
    for (const id of ['monotributo', 'unipersonal-literal-e', 'irpf-servicios', 'sas'] as const) {
      let prev = -1
      for (let rev = 0; rev <= 3_000_000; rev += 100_000) {
        const c = estimateCost(id, { ...base, sells: 'servicios', annualRevenueUyu: rev })
        if (!c) continue
        expect(c.totalAnnual, `${id} @ ${rev}`).toBeGreaterThanOrEqual(prev)
        prev = c.totalAnnual
      }
    }
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
cd app && npx vitest run tests/unit/companyTypes.test.ts
```
Expected: FAIL — `estimateCost` is not exported.

- [ ] **Step 3: Implement the cost model**

Append to `app/utils/companyTypes.ts`:

```ts
export interface CostBreakdown {
  /** Owner's BPS contribution, UYU/month. */
  bpsMonthly: number
  /** Taxes, UYU/month (IVA mínimo, IRPF, IRAE — whichever applies). */
  taxMonthly: number
  /** Market estimate, NOT an official figure. The user can change it. */
  accountantMonthly: number
  totalMonthly: number
  totalAnnual: number
  /** One-off cost to open, UYU. */
  setupCost: number
  /** Plain-language caveats shown under the number. */
  notes: string[]
}

/** Monthly IRPF Cat. II on an already-net taxable amount, applying the brackets marginally. */
export function irpfCat2Monthly(taxableMonthly: number): number {
  if (taxableMonthly <= 0) return 0
  let tax = 0
  let floor = 0
  for (const b of IRPF_CAT2_BRACKETS) {
    const ceiling = b.upTo ?? Infinity
    if (taxableMonthly <= floor) break
    const slice = Math.min(taxableMonthly, ceiling) - floor
    tax += slice * b.rate
    floor = ceiling
  }
  return tax
}

/** Pick the right column of the BPS monotributo table for this family situation. */
function monoBps(input: WizardInput): number {
  const y = input.yearsOperating ?? 0
  const family = input.family ?? 'solo'
  if (y < 1) return FIGURES.monoAnio1FonasaSolo.value
  if (y < 2) return FIGURES.monoAnio2FonasaSolo.value
  switch (family) {
    case 'con-hijos':
      return FIGURES.monoPlenoFonasaHijos.value
    case 'con-conyuge':
      return FIGURES.monoPlenoFonasaConyuge.value
    case 'con-conyuge-e-hijos':
      return FIGURES.monoPlenoFonasaConyugeHijos.value
    default:
      return FIGURES.monoPlenoFonasaSolo.value
  }
}

/** Titular of a unipersonal: 11 BFC, with the Ley 19.889 patronal ramp for new companies. */
function unipersonalBps(input: WizardInput): number {
  if (input.fonasaFromJob) return FIGURES.bpsUnipersonalConFonasaDeEmpleo.value
  const y = input.yearsOperating ?? 0
  if (y < 1) return FIGURES.bpsUnipersonalAnio1.value
  if (y < 2) return FIGURES.bpsUnipersonalAnio2.value
  if (y < 3) return FIGURES.bpsUnipersonalAnio3.value
  return FIGURES.bpsUnipersonalPleno.value
}

/** IVA mínimo: the flat quota, or — with e-factura — the LESSER of the quota and 3,3% of billing. */
function ivaMinimoMonthly(input: WizardInput): { amount: number; note: string | null } {
  const y = input.yearsOperating ?? 0
  const quota =
    y < 1
      ? FIGURES.ivaMinimoAnio1.value
      : y < 2
        ? FIGURES.ivaMinimoAnio2.value
        : FIGURES.ivaMinimo.value
  if (!input.eFactura) {
    return {
      amount: quota,
      note: 'Sin e-factura pagás la cuota fija completa. Con e-factura pagarías el menor entre la cuota y el 3,3% de lo que factures cada mes — y si un mes no facturás, no pagás nada.',
    }
  }
  const monthly = input.annualRevenueUyu / 12
  const capped = monthly * FIGURES.ivaMinimoTopeEfactura.value
  const amount = Math.min(quota, capped)
  return {
    amount,
    note:
      amount < quota
        ? 'Con e-factura pagás el 3,3% de lo facturado en el mes, porque es menor que la cuota fija. Si un mes no facturás, no pagás nada.'
        : 'Con e-factura pagás el menor entre la cuota y el 3,3% del mes; a tu nivel de facturación, la cuota es lo menor.',
  }
}

/**
 * Cost of running under `regime`, in UYU. Returns `null` for a regime we do not
 * cost (because the honest answer depends on facts we don't have).
 *
 * The accountant fee is a MARKET estimate, never an official figure.
 */
export function estimateCost(
  regime: RegimeId,
  input: WizardInput,
  accountantMonthly = 4000
): CostBreakdown | null {
  const monthlyRevenue = input.annualRevenueUyu / 12
  const notes: string[] = []
  let bpsMonthly = 0
  let taxMonthly = 0
  let accountant = 0
  let setupCost = 0

  switch (regime) {
    case 'monotributo': {
      bpsMonthly = monoBps(input)
      setupCost = FIGURES.setupUnipersonal.value
      notes.push('El pago único sustituye IVA, IRAE y los aportes por tu propia actividad.')
      notes.push(
        `Tu jubilación se construye sobre un ficto de ${uyu(5 * FIGURES.bfc.value)} al mes, no sobre lo que realmente ganás.`
      )
      if ((input.yearsOperating ?? 0) < 2) {
        notes.push('Estás en la gradualidad de la Ley 19.942 (25% el primer año, 50% el segundo).')
      }
      break
    }

    case 'monotributo-social': {
      const y = input.yearsOperating ?? 0
      bpsMonthly =
        y < 1
          ? FIGURES.monoSocialAnio1SinFonasa.value
          : y < 2
            ? FIGURES.monoSocialAnio2SinFonasa.value
            : y < 3
              ? FIGURES.monoSocialAnio3SinFonasa.value
              : FIGURES.monoPlenoSinFonasa.value
      setupCost = 0
      notes.push('Sin cobertura FONASA. Con FONASA el aporte es bastante mayor.')
      notes.push('MIDES revisa cada año que tu hogar siga calificando.')
      break
    }

    case 'unipersonal-literal-e': {
      bpsMonthly = unipersonalBps(input)
      const iva = ivaMinimoMonthly(input)
      taxMonthly = iva.amount
      setupCost = FIGURES.setupUnipersonal.value
      if (iva.note) notes.push(iva.note)
      notes.push('Exonerada de IRAE mientras estés por debajo del tope.')
      notes.push('Respondés con tu patrimonio personal: la unipersonal no es una persona jurídica.')
      break
    }

    case 'unipersonal-irae': {
      bpsMonthly = unipersonalBps(input)
      // IRAE ficto, escala empresarial (Dto. 150/007 art. 64): 12% de la renta bruta
      // en el primer tramo (hasta UI 1.000.000) → 3% efectivo sobre la facturación.
      taxMonthly = monthlyRevenue * 0.12 * FIGURES.irae.value
      accountant = accountantMonthly
      setupCost = FIGURES.setupUnipersonal.value
      notes.push(
        'IRAE ficto: la renta neta se estima como un % de la facturación (12% en el primer tramo) y sobre eso se aplica el 25%.'
      )
      notes.push('Además liquidás IVA en régimen general (22%), que cobrás a tus clientes.')
      break
    }

    case 'irpf-servicios': {
      // BPS de servicios personales: VER TASK 1. Si no se verificó, se deja en 0 y se
      // dice explícitamente que falta, en vez de inventar el número.
      bpsMonthly = 0
      const taxable = monthlyRevenue * (1 - FIGURES.irpfFictoGastos.value)
      taxMonthly = irpfCat2Monthly(taxable)
      setupCost = FIGURES.setupUnipersonal.value
      notes.push(
        `Se deduce un ficto de gastos del 30% y hay un mínimo no imponible de ${uyu(FIGURES.irpfMinimoNoImponibleMensual.value)} al mes: por eso al principio suele ganarle al IRAE.`
      )
      notes.push(
        'No incluye el aporte a BPS ni a la Caja profesional que corresponda: depende de tu actividad. Confirmalo antes de decidir.'
      )
      notes.push(
        'Si exportás el servicio y se aprovecha exclusivamente en el exterior, el IVA es tasa 0% y conservás el crédito de IVA de tus compras.'
      )
      break
    }

    case 'sociedad-hecho': {
      bpsMonthly = FIGURES.bpsUnipersonalPleno.value
      taxMonthly = monthlyRevenue * 0.12 * FIGURES.irae.value
      accountant = accountantMonthly
      setupCost = 0
      notes.push(
        'Responsabilidad SOLIDARIA e ILIMITADA: un acreedor puede ir por el 100% de la deuda contra el socio que tenga bienes, sin importar el % pactado.'
      )
      notes.push('Cualquier socio puede exigir la disolución en cualquier momento.')
      break
    }

    case 'srl': {
      bpsMonthly = FIGURES.bpsSocioSrl.value
      taxMonthly = monthlyRevenue * 0.12 * FIGURES.irae.value
      accountant = accountantMonthly
      setupCost = FIGURES.setupSrl.value
      notes.push('El BPS del socio solo se paga si desarrolla actividad en la empresa.')
      notes.push(
        'Los socios de SRL no están comprendidos en el FONASA por esta actividad: no tenés cobertura de salud por acá.'
      )
      notes.push(
        'Ceder cuotas a un tercero exige unanimidad si son 5 socios o menos, más escribano y publicación.'
      )
      notes.push('No incluye las publicaciones en el Diario Oficial y en otro diario (a cotización).')
      break
    }

    case 'sas': {
      bpsMonthly = FIGURES.bpsAdminSas.value
      taxMonthly = monthlyRevenue * 0.12 * FIGURES.irae.value
      accountant = accountantMonthly
      setupCost = FIGURES.setupSas.value
      notes.push(
        `El administrador paga ${uyu(FIGURES.bpsAdminSas.value)} de BPS al mes AUNQUE NO COBRE SUELDO NI FACTURE UN PESO, y no puede declararse inactivo. Es el costo real de la SAS.`
      )
      notes.push('A cambio, sí tenés cobertura FONASA.')
      notes.push(
        'Un accionista que no administra ni representa NO aporta a BPS por ser accionista.'
      )
      notes.push(
        `Por debajo de 4.000.000 UI de ingresos, los dividendos que retirás están EXENTOS de IRPF: la carga total es 25%, no 30,25%.`
      )
      break
    }

    case 'sa': {
      bpsMonthly = 0
      taxMonthly = monthlyRevenue * 0.12 * FIGURES.irae.value + FIGURES.icosaAnual.value / 12
      accountant = accountantMonthly
      setupCost = FIGURES.icosaConstitucion.value
      notes.push(
        `Pagás ICOSA: ${uyu(FIGURES.icosaConstitucion.value)} al constituirla y ${uyu(FIGURES.icosaAnual.value)} todos los años, para siempre. La SAS y la SRL no lo pagan.`
      )
      notes.push('Un director que no cobra sueldo NO aporta a BPS: es la única figura donde eso pasa.')
      notes.push(
        'Los dividendos pagan 7% de IRPF siempre, sin importar el tamaño. La SAS y la SRL chicas no.'
      )
      notes.push('No incluye escribano ni publicaciones (a cotización).')
      break
    }
  }

  const totalMonthly = bpsMonthly + taxMonthly + accountant
  return {
    bpsMonthly,
    taxMonthly,
    accountantMonthly: accountant,
    totalMonthly,
    totalAnnual: totalMonthly * 12,
    setupCost,
    notes,
  }
}
```

- [ ] **Step 4: Run and watch it pass**

```bash
cd app && npx vitest run tests/unit/companyTypes.test.ts
```
Expected: PASS.

- [ ] **Step 5: Lint and commit**

```bash
cd app && npm run lint
git add app/utils/companyTypes.ts app/tests/unit/companyTypes.test.ts
git commit -m "feat(empresas): cost model with e-factura 3,3% cap and BPS tables"
```

---

## Task 5: `evaluate()` — the verdict

**Files:**
- Modify: `app/utils/companyTypes.ts`
- Test: `app/tests/unit/companyTypes.test.ts`

**Interfaces:**
- Consumes: `applyGates`, `estimateCost`, `REGIMES`, `FIGURES`.
- Produces: `Warning`, `RankedRegime`, `Verdict`, `evaluate(input, accountantMonthly?): Verdict`.

- [ ] **Step 1: Write the failing tests**

Append to `app/tests/unit/companyTypes.test.ts`:

```ts
import { evaluate } from '../../utils/companyTypes'

describe('evaluate', () => {
  const shop: WizardInput = {
    annualRevenueUyu: 600_000,
    sells: 'bienes',
    clients: 'consumidor-final',
    people: 'solo',
    employees: 0,
    needsLimitedLiability: false,
    otherCompanyRole: false,
    yearsOperating: 0,
    family: 'solo',
  }

  it('recommends monotributo to a small shop selling to consumers', () => {
    expect(evaluate(shop).recommended).toBe('monotributo')
  })

  it('never recommends an excluded regime', () => {
    const v = evaluate({ ...shop, sells: 'servicios', clients: 'exterior' })
    const rec = v.ranked.find(r => r.regime === v.recommended)!
    expect(rec.status).not.toBe('excluido')
  })

  it('recommends the cheapest ELIGIBLE regime, not the cheapest overall', () => {
    // Servicios personales: monotributo would be cheapest but is illegal here.
    const v = evaluate({ ...shop, sells: 'servicios', clients: 'empresas' })
    expect(v.recommended).not.toBe('monotributo')
    expect(v.ranked.find(r => r.regime === 'monotributo')!.status).toBe('excluido')
  })

  it('warns about the 3-year lockout when revenue is close to the ceiling', () => {
    const nearTop = { ...shop, annualRevenueUyu: 1_150_000 } // 98% of the monotributo ceiling
    const v = evaluate(nearTop)
    const w = v.warnings.find(x => x.kind === 'lockout')
    expect(w).toBeDefined()
    expect(w!.text).toContain('3')
  })

  it('does not warn about the lockout when revenue is far from the ceiling', () => {
    const v = evaluate({ ...shop, annualRevenueUyu: 300_000 })
    expect(v.warnings.find(x => x.kind === 'lockout')).toBeUndefined()
  })

  it('warns about unlimited liability when the recommended regime has it', () => {
    const v = evaluate(shop)
    expect(v.warnings.find(x => x.kind === 'liability')).toBeDefined()
  })

  it('surfaces the Literal E grey zone as a warning for a freelancer', () => {
    const v = evaluate({ ...shop, sells: 'servicios', clients: 'exterior' })
    const w = v.warnings.find(x => x.kind === 'grey-zone')
    expect(w).toBeDefined()
    expect(w!.url).toContain('4761')
  })

  it('ranks every regime and explains each exclusion', () => {
    const v = evaluate(shop)
    expect(v.ranked.length).toBe(REGIMES.length)
    for (const r of v.ranked) {
      if (r.status === 'excluido') expect(r.reasons.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
cd app && npx vitest run tests/unit/companyTypes.test.ts
```
Expected: FAIL — `evaluate` is not exported.

- [ ] **Step 3: Implement `evaluate`**

Append to `app/utils/companyTypes.ts`:

```ts
export interface Warning {
  kind: 'lockout' | 'liability' | 'grey-zone'
  text: string
  norm?: string
  url?: string
}

export interface RankedRegime {
  regime: RegimeId
  status: Eligibility
  reasons: GateReason[]
  cost: CostBreakdown | null
  lockout?: Lockout
}

export interface Verdict {
  recommended: RegimeId
  ranked: RankedRegime[]
  warnings: Warning[]
}

/** Revenue this close to a ceiling means the 3-year lockout is a live risk. */
const LOCKOUT_ALERT_RATIO = 0.85

/**
 * Legal gates first, cost second. The recommendation is the CHEAPEST ELIGIBLE
 * regime — never a cheaper one the visitor doesn't qualify for. Warnings carry the
 * things that change the decision but don't show up in the monthly number: the
 * 3-year lockouts, unlimited liability, and the Literal E grey zone.
 */
export function evaluate(input: WizardInput, accountantMonthly = 4000): Verdict {
  const gates = applyGates(input)
  const byId = new Map(REGIMES.map(r => [r.id, r]))

  const ranked: RankedRegime[] = gates.map(g => ({
    regime: g.regime,
    status: g.status,
    reasons: g.reasons,
    cost: g.status === 'excluido' ? null : estimateCost(g.regime, input, accountantMonthly),
    lockout: byId.get(g.regime)?.lockout,
  }))

  const viable = ranked
    .filter(r => r.status !== 'excluido' && r.cost !== null)
    .sort((a, b) => a.cost!.totalAnnual - b.cost!.totalAnnual)

  // Prefer a clearly eligible regime over a `dudoso` one at the same price point.
  const recommended =
    viable.find(r => r.status === 'elegible')?.regime ?? viable[0]?.regime ?? 'sas'

  ranked.sort((a, b) => {
    const rank = (s: Eligibility) => (s === 'elegible' ? 0 : s === 'dudoso' ? 1 : 2)
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status)
    return (a.cost?.totalAnnual ?? Infinity) - (b.cost?.totalAnnual ?? Infinity)
  })

  const warnings: Warning[] = []
  const rec = ranked.find(r => r.regime === recommended)!
  const regime = byId.get(recommended)!

  // The lockout only matters if you're near the ceiling of the regime we're recommending.
  const ceiling =
    recommended === 'monotributo' || recommended === 'monotributo-social'
      ? input.people === 'socios'
        ? FIGURES.topeMonotributoSociedadUyu.value
        : FIGURES.topeMonotributoUnipersonalUyu.value
      : recommended === 'unipersonal-literal-e'
        ? FIGURES.topeLiteralEUyu.value
        : null

  if (ceiling && regime.lockout && input.annualRevenueUyu >= ceiling * LOCKOUT_ALERT_RATIO) {
    warnings.push({
      kind: 'lockout',
      text: `Estás a menos del 15% del tope (${uyu(ceiling)} al año). ${regime.lockout.text} Pensalo bien: si crecés y te pasás, el cerrojo es de ${regime.lockout.years} años.`,
      norm: regime.lockout.norm,
      url: regime.lockout.url,
    })
  }

  if (regime.liability === 'ilimitada') {
    warnings.push({
      kind: 'liability',
      text: 'En esta figura respondés con tu patrimonio personal: tu casa, tu auto, tu cuenta. No es una persona jurídica separada. Si vas a tomar deuda, contratar empleados o firmar contratos con penalidades, considerá una SAS.',
      norm: 'Código Civil art. 2372 (prenda general)',
      url: 'https://www.impo.com.uy/bases/codigo-civil',
    })
  }

  const greyZone = rec.reasons.find(r => r.status === 'dudoso')
  if (greyZone) {
    warnings.push({ kind: 'grey-zone', text: greyZone.text, norm: greyZone.norm, url: greyZone.url })
  }

  return { recommended, ranked, warnings }
}
```

- [ ] **Step 4: Run the full unit suite**

```bash
cd app && npm run test
```
Expected: PASS, **except** `siteNav-coverage.test.ts` may still pass (the page doesn't exist yet). All `companyTypes` tests green.

- [ ] **Step 5: Lint and commit**

```bash
cd app && npm run lint
git add app/utils/companyTypes.ts app/tests/unit/companyTypes.test.ts
git commit -m "feat(empresas): verdict engine — gates first, cost second"
```

---

## Task 6: Register the route (siteNav + i18n)

Do this **before** the page, so the coverage test flips from red to green as soon as the page file lands.

**Files:**
- Modify: `app/utils/siteNav.ts` (the `services` section, after the `/salir-del-clearing` entry at ~line 473)
- Modify: `app/i18n/locales/json/es.json`, `en.json`, `pt.json`

**Interfaces:**
- Consumes: nothing.
- Produces: the route `/que-empresa-abrir-uruguay` in the header, drawer, footer, `/buscar`, `/mapa-del-sitio` and the XML sitemap.

- [ ] **Step 1: Add the NavEntry**

In `app/utils/siteNav.ts`, inside the `services` section, right after the `/salir-del-clearing` entry:

```ts
      {
        to: '/que-empresa-abrir-uruguay',
        labelKey: 'nav.queEmpresaAbrir',
        icon: 'mdi-domain',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: [
          'que empresa abrir uruguay',
          'que tipo de empresa abrir',
          'monotributo o unipersonal',
          'abrir sas uruguay',
          'literal e',
          'iva minimo',
          'empresa unipersonal',
          'formalizar emprendimiento',
          'como facturar en uruguay',
          'srl o sas',
          'monotributo social mides',
          'cuanto cuesta abrir una empresa',
        ],
      },
```

- [ ] **Step 2: Add the nav label to the three locales**

`app/i18n/locales/json/es.json` → inside `"nav"`:
```json
"queEmpresaAbrir": "Qué empresa abrir"
```
`en.json` → inside `"nav"`:
```json
"queEmpresaAbrir": "Which company to open"
```
`pt.json` → inside `"nav"`:
```json
"queEmpresaAbrir": "Que empresa abrir"
```

- [ ] **Step 3: Run the coverage test — it must FAIL, and that is correct**

```bash
cd app && npx vitest run tests/unit/siteNav-coverage.test.ts
```
Expected: **FAIL** — "dead nav link: /que-empresa-abrir-uruguay has no page file". This proves the guard works. Task 7 creates the page and turns it green.

- [ ] **Step 4: Do NOT commit yet**

The tree is red on purpose. Commit at the end of Task 7 together with the page.

---

## Task 7: The page

**Files:**
- Create: `app/pages/que-empresa-abrir-uruguay.vue`

**Interfaces:**
- Consumes: `evaluate`, `REGIMES`, `FIGURES`, `type WizardInput`, `type Verdict` from `~/utils/companyTypes` (auto-imported in Nuxt as `evaluate`, etc. — import explicitly to be safe).
- Produces: the route.

- [ ] **Step 1: Build the page**

Create `app/pages/que-empresa-abrir-uruguay.vue`. Follow `app/pages/salir-del-clearing.vue` for structure and `app/pages/mejores-bancos-uruguay.vue` for the interactive parts.

Required sections, in order:

1. **Back breadcrumb** `VBtn` → hero `VCard` (`elevation="8"`, `overflow-hidden`) with `<h1>¿Qué tipo de empresa me conviene abrir en Uruguay?</h1>` + `<ShareButtons />`.
2. **Wizard** (`VCard`): the 6 inputs from the spec §4.1 — revenue (`VTextField` + UYU/USD toggle), `sells`, `clients`, `people`, `employees`, `needsLimitedLiability` — plus a collapsed `VExpansionPanel` "Ajustes finos" holding `otherCompanyRole`, `eFactura`, `yearsOperating`, `family`, `fonasaFromJob`, `localTooBig`, `midesEligible`, and the **accountant fee** (default 4000, labelled *"estimación de mercado — no es una cifra oficial"*).
3. **Verdict** (`VCard`, prominent): the recommended regime, its monthly cost broken down (BPS / impuesto / contador), the setup cost, and its `notes`. Then **every `warnings` entry as a `VAlert`** — `lockout` and `liability` as `type="warning"`, `grey-zone` as `type="info"` — each linking its `norm` to its `url`.
4. **Why the others were ruled out**: the `ranked` list. For `excluido`, show each `reason.text` with the `norm` as a link. **This is the auditable core of the page — do not collapse it behind a toggle.**
5. **Comparison table** of all regimes (`VTable`, wrapped in `overflow-x: auto`): tope, costo mensual, responsabilidad, ¿monotributo?, ¿Literal E?, dividendos, costo de apertura.
6. **Guide per regime**: one `VCard` each, from `REGIMES` + spec §5. Include the SAS/SRL dividend finding (§5.6) and the SA-vs-SAS BPS trade-off (§5.7) prominently — they are the page's differentiators.
7. **Sociedad de hecho — the warning section** (spec §6).
8. **Trámites: obligatorio vs condicional** (spec §7), including the three things blogs get wrong (BSE, planilla MTSS, Empresa en el Día).
9. **Apoyos** (spec §8), with real closing dates.
10. **"Lo que no podemos afirmar"** (spec §9) — a `VCard` with a distinct treatment. This is a feature, not a disclaimer.
11. **FAQ** (`VExpansionPanels`) — feeds the `FAQPage` schema.
12. **Fuentes** — every URL from `FIGURES` and `REGIMES`, deduped, with the `verifiedAt` date.
13. **Disclaimer** `VAlert type="warning"`: *"Esta página es información general, no asesoramiento legal ni contable. Las cifras se verifican contra BPS, DGI e IMPO, pero cambian por decreto. Antes de decidir, confirmá con un contador o escribano."*
14. **Cross-links** (3-up `VCard`s): `/herramientas/calculadora-irpf`, `/salud-financiera`, `/inversiones-uruguay`.

SEO block (copy the shape from `salir-del-clearing.vue` exactly):

```ts
const canonicalUrl = 'https://cambio-uruguay.com/que-empresa-abrir-uruguay'
const title = 'Qué empresa abrir en Uruguay: monotributo, unipersonal, SAS o SRL'
const description =
  'Descubrí qué figura legal te conviene según lo que facturás: monotributo, unipersonal Literal E, IRPF, SAS o SRL. Costos reales 2026, topes y responsabilidad, con la norma citada.'

defineOgImageComponent('Cambio', {
  title: 'Qué empresa abrir en Uruguay',
  subtitle: 'Monotributo, unipersonal, SAS o SRL — según lo que facturás',
  tag: 'GUÍA',
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
```

`useHead` emits an `@graph` with **BreadcrumbList** + **FAQPage** (mapped from the `faq` array) + **HowTo** (the steps to formalize: inscribirse en DGI+BPS → elegir régimen → e-factura → habilitaciones si corresponde).

Theme-aware CSS only. Verdict card uses `rgba(var(--v-theme-primary), 0.05)` with a `.v-theme--light` override for the link color (`#0d47a1`), per the repo's contrast fixes.

- [ ] **Step 2: Run the coverage test — now it must PASS**

```bash
cd app && npx vitest run tests/unit/siteNav-coverage.test.ts
```
Expected: PASS.

- [ ] **Step 3: Run the full suite + lint**

```bash
cd app && npm run test && npm run lint
```
Expected: PASS.

- [ ] **Step 4: Drive the page in a real browser**

```bash
cd app && npm run dev
```
Open `http://localhost:3000/que-empresa-abrir-uruguay` and verify, by hand:
- A shop (bienes, consumidor final, solo, 0 empleados, $600.000/año) → **recommends monotributo**.
- Switching `sells` to **servicios** → monotributo flips to **excluido** citing art. 72, and Literal E goes **dudoso** citing Consulta 4761.
- Raising revenue to **$1.150.000** → the **lockout warning** appears.
- Ticking `needsLimitedLiability` → every unlimited-liability regime is excluded and the verdict moves to **SAS**.
- Toggle the theme: **no unreadable text in light mode**.

- [ ] **Step 5: Commit page + nav + i18n together**

```bash
git add app/pages/que-empresa-abrir-uruguay.vue app/utils/siteNav.ts app/i18n/locales/json/
git commit -m "feat(empresas): /que-empresa-abrir-uruguay page + nav registration"
```

---

## Task 8: Guardrailed live refresh

**Files:**
- Create: `app/server/utils/companyFiguresLive.ts`
- Create: `app/server/api/company-figures.get.ts`
- Create: `app/server/tasks/company/daily.ts`
- Modify: `app/nuxt.config.ts`
- Test: `app/tests/unit/companyFiguresLive.test.ts`

**Interfaces:**
- Consumes: `FIGURES` (Task 2), the `installNitroGlobals()` helper in `tests/unit/helpers/nitro.ts`.
- Produces: `CompanyFigures`, `baselineCompanyFigures()`, `refreshCompanyFigures()`, `getStoredCompanyFigures()`, `GET /api/company-figures`.

- [ ] **Step 1: Write the failing tests**

Create `app/tests/unit/companyFiguresLive.test.ts`, modelled on the existing `tests/unit/debtReliefLive.test.ts` (read it first — it shows how to stub `$fetch` and `useStorage` via `installNitroGlobals()`):

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

describe('refreshCompanyFigures', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns the baseline when there is no API key', async () => {
    installNitroGlobals({ runtimeConfig: { geminiApiKey: '' } })
    const { refreshCompanyFigures, baselineCompanyFigures } = await import(
      '../../server/utils/companyFiguresLive'
    )
    const out = await refreshCompanyFigures()
    expect(out).toEqual(baselineCompanyFigures())
    expect(out.asOf).toBeNull()
  })

  it('rejects an out-of-band value and keeps the baseline', async () => {
    installNitroGlobals({
      runtimeConfig: { geminiApiKey: 'k' },
      fetchImpl: async () => ({
        candidates: [
          { content: { parts: [{ text: '{"ivaMinimo": 999999, "bpsUnipersonalPleno": 8900}' }] } },
        ],
      }),
    })
    const { refreshCompanyFigures, baselineCompanyFigures } = await import(
      '../../server/utils/companyFiguresLive'
    )
    const out = await refreshCompanyFigures()
    expect(out.ivaMinimo).toBe(baselineCompanyFigures().ivaMinimo) // hallucination rejected
    expect(out.bpsUnipersonalPleno).toBe(8900) // in-band value accepted
    expect(out.updated).toEqual(['bpsUnipersonalPleno'])
  })

  it('returns the pure baseline when the network throws', async () => {
    installNitroGlobals({
      runtimeConfig: { geminiApiKey: 'k' },
      fetchImpl: async () => {
        throw new Error('boom')
      },
    })
    const { refreshCompanyFigures, baselineCompanyFigures } = await import(
      '../../server/utils/companyFiguresLive'
    )
    expect(await refreshCompanyFigures()).toEqual(baselineCompanyFigures())
  })

  it('returns the baseline when NOTHING is in band', async () => {
    installNitroGlobals({
      runtimeConfig: { geminiApiKey: 'k' },
      fetchImpl: async () => ({
        candidates: [{ content: { parts: [{ text: '{"ivaMinimo": 1, "bpsUnipersonalPleno": 2}' }] } }],
      }),
    })
    const { refreshCompanyFigures, baselineCompanyFigures } = await import(
      '../../server/utils/companyFiguresLive'
    )
    const out = await refreshCompanyFigures()
    expect(out.updated).toEqual([])
    expect(out).toEqual(baselineCompanyFigures())
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
cd app && npx vitest run tests/unit/companyFiguresLive.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the refresher**

Create `app/server/utils/companyFiguresLive.ts`, mirroring `uyFiguresLive.ts`:

```ts
// Daily self-updating source of truth for the volatile figures on
// /que-empresa-abrir-uruguay. Same guardrailed pattern as uyFiguresLive.ts: ask
// Gemini with grounded search, validate EVERY value against a plausibility band,
// and keep the verified baseline for anything out of band. A hallucinated number
// can never reach the page.
//
// The ANNUAL CEILINGS are deliberately NOT refreshed here: they are constants set
// by decree each January with the UI at the close of the previous ejercicio, and a
// search engine will happily return last year's. They are hand-maintained in
// utils/companyTypes.ts, and the drift watchdog nags when they go stale.
import { FIGURES } from '../../utils/companyTypes'

export interface CompanyFigures {
  ivaMinimo: number
  monoPlenoFonasaSolo: number
  bpsUnipersonalPleno: number
  bpsAdminSas: number
  bpsSocioSrl: number
  icosaAnual: number
  asOf: string | null
  updated: string[]
  sources: Array<{ label: string; url: string }>
}

const KEYS = [
  'ivaMinimo',
  'monoPlenoFonasaSolo',
  'bpsUnipersonalPleno',
  'bpsAdminSas',
  'bpsSocioSrl',
  'icosaAnual',
] as const

/** Anything outside these is a hallucination or a stale year. Keep them TIGHT. */
const BANDS: Record<(typeof KEYS)[number], readonly [number, number]> = {
  ivaMinimo: [4000, 9000],
  monoPlenoFonasaSolo: [4000, 9000],
  bpsUnipersonalPleno: [7000, 12_000],
  bpsAdminSas: [8000, 15_000],
  bpsSocioSrl: [4500, 9000],
  icosaAnual: [20_000, 40_000],
}

const STORAGE = 'company'
const KEY = 'live'

const inBand = (n: unknown, band: readonly [number, number]): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= band[0] && n <= band[1]

export function baselineCompanyFigures(): CompanyFigures {
  return {
    ivaMinimo: FIGURES.ivaMinimo.value,
    monoPlenoFonasaSolo: FIGURES.monoPlenoFonasaSolo.value,
    bpsUnipersonalPleno: FIGURES.bpsUnipersonalPleno.value,
    bpsAdminSas: FIGURES.bpsAdminSas.value,
    bpsSocioSrl: FIGURES.bpsSocioSrl.value,
    icosaAnual: FIGURES.icosaAnual.value,
    asOf: null,
    updated: [],
    sources: [],
  }
}

const PROMPT = `Buscá con búsqueda web real y citable los valores ACTUALES y OFICIALES en Uruguay de:
1. La cuota mensual de IVA mínimo (Literal E, pequeña empresa), en pesos.
2. El aporte mensual TOTAL de un monotributista unipersonal en régimen pleno, con cobertura FONASA, sin cónyuge ni hijos, en pesos.
3. El aporte mensual TOTAL a BPS del titular de una empresa unipersonal sin dependientes (categoría 1ª, 11 BFC), beneficiario del SNS, sin cónyuge ni hijos, en pesos.
4. El aporte mensual TOTAL a BPS del administrador o representante legal de una SAS (15 BFC, con FONASA), soltero sin hijos, en pesos.
5. El aporte mensual TOTAL a BPS de un socio de SRL con actividad (15 BFC, sin FONASA), en pesos.
6. El monto ANUAL del ICOSA (Impuesto de Control de las Sociedades Anónimas) al cierre de ejercicio, en pesos.
Usá SOLO fuentes oficiales: bps.gub.uy, dgi.gub.uy, gub.uy, impo.com.uy.
Respondé SOLO con un objeto JSON válido, sin texto adicional ni markdown, con este formato exacto y números sin separadores de miles ni símbolos:
{"ivaMinimo": <num>, "monoPlenoFonasaSolo": <num>, "bpsUnipersonalPleno": <num>, "bpsAdminSas": <num>, "bpsSocioSrl": <num>, "icosaAnual": <num>}
Si algún dato no lo encontrás en una fuente oficial, poné null. NO INVENTES NINGÚN NÚMERO.`

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> }
  }>
}

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function refreshCompanyFigures(): Promise<CompanyFigures> {
  const baseline = baselineCompanyFigures()
  const apiKey = useRuntimeConfig().geminiApiKey as string | undefined
  if (!apiKey) return baseline

  try {
    const res = await $fetch<GeminiResponse>(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        query: { key: apiKey },
        body: { contents: [{ parts: [{ text: PROMPT }] }], tools: [{ google_search: {} }] },
        timeout: 30_000,
      }
    )
    const candidate = res.candidates?.[0]
    const text = (candidate?.content?.parts ?? [])
      .map(p => p.text ?? '')
      .join('')
      .trim()
    const data = parseJsonLoose(text)
    if (!data) return baseline

    const figures = baselineCompanyFigures()
    const updated: string[] = []
    for (const k of KEYS) {
      if (inBand(data[k], BANDS[k])) {
        figures[k] = Math.round(data[k] as number)
        updated.push(k)
      }
    }
    if (updated.length === 0) return baseline

    const chunks = candidate?.groundingMetadata?.groundingChunks ?? []
    figures.sources = chunks
      .map(c => c.web)
      .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
      .slice(0, 6)
      .map(w => ({ label: w.title || new URL(w.uri).hostname.replace(/^www\./, ''), url: w.uri }))
    figures.asOf = new Date().toISOString()
    figures.updated = updated

    await useStorage(STORAGE).setItem(KEY, figures)
    return figures
  } catch {
    return baseline
  }
}

export async function getStoredCompanyFigures(): Promise<CompanyFigures | null> {
  return (await useStorage(STORAGE).getItem<CompanyFigures>(KEY)) ?? null
}

export function ageInDays(asOf: string | null): number {
  if (!asOf) return Infinity
  const t = new Date(asOf).getTime()
  return Number.isFinite(t) ? (Date.now() - t) / 86_400_000 : Infinity
}
```

- [ ] **Step 4: Run and watch it pass**

```bash
cd app && npx vitest run tests/unit/companyFiguresLive.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Add the API route and the task**

Create `app/server/api/company-figures.get.ts`:

```ts
// Live figures for /que-empresa-abrir-uruguay. Cached; a stale or missing store
// triggers a background refresh so the numbers stay current on their own. The
// verified baseline is the fallback, always.
import {
  ageInDays,
  baselineCompanyFigures,
  getStoredCompanyFigures,
  refreshCompanyFigures,
} from '../utils/companyFiguresLive'

let inFlight = false

export default defineCachedEventHandler(
  async () => {
    const stored = await getStoredCompanyFigures()
    if (stored && ageInDays(stored.asOf) < 8) return stored
    if (!inFlight) {
      inFlight = true
      refreshCompanyFigures()
        .catch(() => {})
        .finally(() => {
          inFlight = false
        })
    }
    return stored ?? baselineCompanyFigures()
  },
  {
    maxAge: 60 * 60,
    staleMaxAge: 60 * 60 * 24 * 7,
    name: 'company-figures-v1',
    getKey: () => 'live',
  }
)
```

Create `app/server/tasks/company/daily.ts`:

```ts
// Nitro scheduled task: refresh the volatile company-formation figures via Gemini
// grounded search. Registered in nuxt.config under `nitro.scheduledTasks`.
import { refreshCompanyFigures } from '../../utils/companyFiguresLive'

export default defineTask({
  meta: {
    name: 'company:daily',
    description: 'Refresh company-formation figures (IVA mínimo, BPS, ICOSA) via Gemini',
  },
  async run() {
    const figures = await refreshCompanyFigures()
    return { result: { asOf: figures.asOf, updated: figures.updated } }
  },
})
```

- [ ] **Step 6: Wire it into `nuxt.config.ts`**

In the `nitro` block, add the storage namespace alongside the existing ones:
```ts
storage: {
  // ...existing
  company: { driver: 'fs', base: './.data/company' },
},
```
And the cron alongside the existing `scheduledTasks`:
```ts
scheduledTasks: {
  // ...existing
  '50 9 * * *': ['company:daily'],
},
```

- [ ] **Step 7: Verify the endpoint**

```bash
cd app && npm run dev
```
Then: `curl -s http://localhost:3000/api/company-figures | head -c 400`
Expected: JSON with the baseline values and `"asOf": null` (no Gemini key locally), **not** a 500.

- [ ] **Step 8: Lint and commit**

```bash
cd app && npm run lint && npm run test
git add app/server/ app/nuxt.config.ts app/tests/unit/companyFiguresLive.test.ts
git commit -m "feat(empresas): guardrailed daily refresh of company figures"
```

---

## Task 9: Extend the drift watchdog + final verification

**Files:**
- Modify: `app/server/utils/uyFiguresLive.ts` (the `WATCHED[]` array, ~line 146)

**Interfaces:**
- Consumes: `FIGURES` from `app/utils/companyTypes.ts`.
- Produces: a Telegram ping to the admin when a hand-maintained constant drifts.

**Why:** the annual ceilings and the BPS tables are set by decree each January and **cannot be safely automated**. The watchdog's job is to make sure a human finds out when they go stale, rather than the page quietly serving 2026 numbers in 2027.

- [ ] **Step 1: Add the new watched constants**

In `app/server/utils/uyFiguresLive.ts`, the `WATCHED` array currently tracks `salarioMinimo` and `bpc`. The BPC is what moves the company figures (the BPS tables and the IRPF brackets are all BPC/BFC-denominated), so extend its `where` to name the new file:

```ts
  {
    id: 'bpc',
    label: 'BPC',
    baked: BASELINE.bpc,
    tol: 0.03,
    where:
      'UY_FACTS (personalFinance.ts), FIGURES (companyTypes.ts — topes, tablas BPS, escalas IRPF: TODAS se fijan por decreto en enero)',
  },
```

- [ ] **Step 2: Run the whole suite**

```bash
cd app && npm run test
```
Expected: PASS, all of it.

- [ ] **Step 3: Lint**

```bash
cd app && npm run lint
```
Expected: clean.

- [ ] **Step 4: Check light-mode contrast**

```bash
cd app && node scripts/lightmode-axe.mjs
```
Expected: **0 contrast violations** on `/que-empresa-abrir-uruguay`. If the script needs a running server, start `npm run dev` first. Fix any violation by adding a `.v-theme--light` override — do not change the dark theme.

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/uyFiguresLive.ts
git commit -m "chore(empresas): watch BPC drift for the company-formation constants"
```

---

## Task 10: E2E smoke test (local only, not in CI)

**Files:**
- Create: `app/tests/e2e/que-empresa-abrir.spec.ts`

**Interfaces:**
- Consumes: the page from Task 7.

**Note:** this repo has a known hydration flake — a first click can land before Vue hydrates. **Gate on hydration with `expect(...).toPass()` retries**, never a bare `click()` + `expect()`.

- [ ] **Step 1: Write the test**

```ts
import { expect, test } from '@playwright/test'

test.describe('/que-empresa-abrir-uruguay', () => {
  test('recommends monotributo to a small shop, and rules it out for a freelancer', async ({
    page,
  }) => {
    await page.goto('/que-empresa-abrir-uruguay')
    await expect(page.locator('h1')).toContainText('empresa')

    // Wait for hydration before touching anything interactive.
    await expect(async () => {
      await page.getByLabel(/facturación anual/i).fill('600000')
      await expect(page.getByTestId('verdict')).toContainText(/monotributo/i)
    }).toPass({ timeout: 15_000 })

    // Switching to servicios personales must EXCLUDE monotributo, citing the norm.
    await page.getByTestId('sells-servicios').click()
    await expect(page.getByTestId('verdict')).not.toContainText(/^monotributo$/i)
    await expect(page.getByTestId('ruled-out-monotributo')).toContainText('72')
  })
})
```

Add `data-testid="verdict"`, `data-testid="sells-servicios"` and `data-testid="ruled-out-<regimeId>"` to the page in Task 7 if they are not there yet.

- [ ] **Step 2: Run it**

```bash
cd app && npm run test:e2e -- que-empresa-abrir
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/tests/e2e/que-empresa-abrir.spec.ts app/pages/que-empresa-abrir-uruguay.vue
git commit -m "test(empresas): e2e smoke for the recommender"
```

---

## Self-Review

**Spec coverage:**

| Spec § | Task |
|---|---|
| §3 Arquitectura / file layout | Tasks 2-9 (matches exactly) |
| §3 UI de hoy vs UI de cierre (el bug) | Task 2, Step 1 (explicit test) |
| §4 Motor: compuertas → costo | Tasks 3, 5 |
| §4.1 Inputs del wizard | Task 3 (`WizardInput`), Task 7 (UI) |
| §4.2 Las compuertas | Task 3 |
| §4.3 Cerrojos de salida | Task 2 (`Lockout`), Task 5 (`Warning`), Task 7 (rendered) |
| §5.1–5.2 Índices y topes | Task 2 (`FIGURES`) |
| §5.3–5.4 Monotributo y Mono Social | Tasks 2, 4 |
| §5.5 Unipersonal / Literal E / 3,3% | Tasks 2, 4 |
| §5.5-bis IRPF Cat. II | Tasks 2 (`IRPF_CAT2_BRACKETS`), 4 (`irpfCat2Monthly`) |
| §5.5-ter BPS servicios personales | **Task 1** (the research gap) |
| §5.6 Sociedades + dividendos exentos | Task 4 (notes), Task 7 (guide) |
| §5.7 BPS de los dueños | Tasks 2, 4 |
| §5.8 Costo de constitución | Task 2 (`setup*`), Task 4 |
| §5.9–5.10 BF y EECC | Task 7 (content) |
| §6 Sociedad de hecho | Task 4 (notes), Task 7 |
| §7 Trámites | Task 7 |
| §8 Apoyos | Task 7 |
| §9 Lo que no podemos afirmar | Task 7 |
| §10 Auto-actualización + watchdog | Tasks 8, 9 |
| §11 SEO / a11y | Tasks 6, 7, 9 (axe) |
| §12 Tests | Tasks 2-5, 8, 10 |

No gaps.

**Placeholder scan:** none. Every code step carries real code; every command carries expected output.

**Type consistency:** `Figure`, `FIGURES`, `RegimeId`, `WizardInput`, `GateReason`, `GateOutcome`, `Lockout`, `CostBreakdown`, `Warning`, `RankedRegime`, `Verdict`, `applyGates`, `estimateCost`, `irpfCat2Monthly`, `evaluate` — defined once, used consistently across Tasks 2-10. `uyu()` is defined in Task 3 and reused in Tasks 4-5 (same module, fine). `ageInDays` is re-declared in `companyFiguresLive.ts` rather than imported from `uyFiguresLive.ts` — intentional, keeps the two refreshers independent, and mirrors the existing `debtReliefLive.ts`.

**One risk worth naming:** Task 4's `estimateCost('irpf-servicios')` returns `bpsMonthly: 0` until Task 1 closes the research gap. If Task 1 fails to verify the figure, that zero **must** be surfaced in the UI as "no incluye el aporte a BPS/Caja" (the note is already written), not silently presented as a total. Do not let a `0` masquerade as a cost.
