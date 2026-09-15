# Oportunidades de Trends (ventana "ahora") — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar cuatro entregables que capturan demanda medida en Google Trends: serie y página de precios de combustibles, refresh de la devolución FONASA 2026, guía "Impuesto Temu" (con BFE Express) y página de las elecciones del BPS 2026.

**Architecture:** Backend Express (TS 4.9, CommonJS) suma un job pm2 `currency-combustibles` que lee la tabla HTML de ANCAP, la valida y la guarda en Mongo (`combustibles_history` + meta), servida por `GET /combustibles` con Redis. El app Nuxt 4 la consume por un proxy cacheado con fallback horneado y la renderiza en `/precio-de-la-nafta-uruguay`. FONASA, la guía y la página del BPS son sólo app: catálogos puros en `app/utils/*.ts` + páginas `.vue` + tests vitest-node.

**Tech Stack:** Node 22, TypeScript, Express, mongoose (`MongooseServer`), Redis (`redisCache`), vitest (raíz y app), Nuxt 4 + Vuetify 4, Chart.js vía `app/components/charts/LineChart.vue`.

**Spec:** `docs/superpowers/specs/2026-09-15-trends-oportunidades-design.md`

## Global Constraints

- Backend: TS 4.9 CommonJS; nada de `matchAll` ni `Array.prototype.at`; `fetch` global de Node 22 con `AbortSignal.timeout`.
- Root vitest: `npm test` corre `tests/**/*.test.ts`; imports relativos `../../classes/...`.
- App utils puros: **sin** imports de Vue/Nuxt, **imports relativos** (`./foo`), para que vitest-node los cargue.
- Páginas: raíz `VContainer`, **un solo `<h1>`**, `useSeoMeta` + `rel: 'canonical'` + `application/ld+json` con `BreadcrumbList`; `<FaqSection :items="faq" heading="Preguntas frecuentes" expanded />` (emite FAQPage solo; **no** duplicarlo en el graph); `defineOgImageComponent('Cambio', { title, subtitle, tag })`.
- Títulos: base ≤ 43 caracteres (el sufijo ` | Cambio Uruguay` suma 17). Nunca un `|` dentro de un mensaje i18n.
- Prettier vía eslint en `app/`: `semi: false`, comillas simples, `arrowParens: avoid`, `printWidth: 100`, `trailingComma: es5`, 2 espacios. `npm run typecheck` está roto: usar `npm run lint` / `npm run lintfix`.
- Los agentes de las tareas 1–5 **no editan** `app/utils/siteNav.ts` ni `app/i18n/locales/json/*.json`: eso lo hace la tarea 6 de una sola vez. Cada agente reporta al final lo que necesita registrado.
- El árbol tiene cambios ajenos sin commitear (`app/server/api/property-sales/**`, `classes/propertysales/store.ts`, `app/tests/unit/propertySalesPageApi.test.ts`): **commitear sólo los archivos propios**, nunca `git add -A`.
- Mes en español uruguayo: "setiembre", no "septiembre".
- Fixture ya presente en el repo: `tests/combustibles/fixtures/ancap-historico-2026-09-15.html` (primera tabla real de ANCAP, 53 filas de datos, + una tabla vieja de 9 celdas que el parser debe ignorar).

---

### Task 1: Backend de combustibles (`classes/combustibles/`, `sync_combustibles.ts`, ruta, pm2)

**Files:**
- Create: `classes/combustibles/parse.ts`, `classes/combustibles/validate.ts`, `classes/combustibles/baseline.ts`, `classes/combustibles/store.ts`, `classes/combustibles/api.ts`, `classes/combustibles/refresh.ts`, `sync_combustibles.ts`
- Modify: `index.ts` (imports junto a los de figures, ruta después de `uy-figures` ~línea 2740), `ecosystem.config.js` (append al array `apps`), `scripts/deploy-backend.sh:51` (`OTHER_APPS`), `AGENTS.md` (fila en la tabla de pm2 y en la lista de entrypoints)
- Test: `tests/combustibles/parse.test.ts`, `tests/combustibles/validate.test.ts`, `tests/combustibles/api.test.ts`, `tests/combustibles/baseline_parity.test.ts`

**Interfaces:**
- Produces: `FuelKey`, `FuelRow { from: string; super95|premium97|gasoil50s|gasoil10s|queroseno|supergas: number | null }`, `FUEL_KEYS`, `parseAncapHistory(html): FuelRow[]`, `validateFuelRows(rows, storedLatestFrom?): Validation`, `BASELINE_FUEL_ROWS`, `BASELINE_FUEL_SOURCE_URL`, `buildFuelResponse(rows, meta): FuelResponse { asOf, sourceUrl, latest, previous, rows }`, `refreshFuelPrices()`, `GET /combustibles`.
- La tarea 2 copia la forma de `FuelRow`/`FuelResponse` en `app/utils/fuelPrices.ts` y las 24 filas de `BASELINE_FUEL_ROWS` en `app/server/utils/combustiblesFallback.ts` (la paridad la vigila `baseline_parity.test.ts`).

- [ ] **Step 1: Test del parser (falla)**

`tests/combustibles/parse.test.ts`:
```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseAncapHistory } from "../../classes/combustibles/parse";

const html = fs.readFileSync(path.join(__dirname, "fixtures", "ancap-historico-2026-09-15.html"), "utf8");

describe("parseAncapHistory", () => {
  const rows = parseAncapHistory(html);

  it("lee las 53 vigencias de la primera tabla y las ordena ascendente", () => {
    expect(rows).toHaveLength(53);
    expect(rows[0].from).toBe("2021-07-01");
    expect(rows[rows.length - 1].from).toBe("2026-09-01");
  });

  it("convierte la coma decimal y respeta las columnas", () => {
    expect(rows[0]).toEqual({ from: "2021-07-01", super95: 65.81, premium97: 67.74, gasoil50s: 45.7, gasoil10s: 67.87, queroseno: 44.95, supergas: 56.16 });
    const last = rows[rows.length - 1];
    expect(last.super95).toBe(88.67);
    expect(last.premium97).toBe(91.19);
    expect(last.gasoil50s).toBe(58.68);
    expect(last.supergas).toBe(93.56);
  });

  it("ignora la tabla vieja de 9 celdas y devuelve null en celdas vacías", () => {
    expect(rows.some((r) => r.from.startsWith("1974"))).toBe(false);
    const withBlank = parseAncapHistory(
      "<table><tr><td>01/03/2024</td><td>70,00</td><td></td><td>50,00</td><td>55,00</td><td>50,00</td><td>80,00</td></tr></table>"
    );
    expect(withBlank).toEqual([{ from: "2024-03-01", super95: 70, premium97: null, gasoil50s: 50, gasoil10s: 55, queroseno: 50, supergas: 80 }]);
  });

  it("devuelve [] sin tabla", () => {
    expect(parseAncapHistory("<html></html>")).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run (raíz): `npx vitest run tests/combustibles/parse.test.ts`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar `parse.ts`**

```ts
// classes/combustibles/parse.ts
//
// La tabla de precios históricos de ANCAP (una fila por vigencia, desde 01/07/2021) está en HTML
// plano: siete celdas, fecha dd/mm/yyyy y decimales con coma. Se lee la PRIMERA tabla de la
// página; la segunda es histórico pre-2021 en otra moneda y con otras columnas.
export type FuelKey = "super95" | "premium97" | "gasoil50s" | "gasoil10s" | "queroseno" | "supergas";

export interface FuelRow {
  /** Vigencia (ISO yyyy-mm-dd). */
  from: string;
  super95: number | null;
  premium97: number | null;
  gasoil50s: number | null;
  gasoil10s: number | null;
  queroseno: number | null;
  supergas: number | null;
}

export const FUEL_KEYS: readonly FuelKey[] = ["super95", "premium97", "gasoil50s", "gasoil10s", "queroseno", "supergas"];

const stripTags = (s: string): string => s.replace(/<[^>]+>/g, "").replace(/&nbsp;| /g, " ").trim();

function cell(raw: string): number | null {
  const text = stripTags(raw);
  if (!text) return null;
  const n = Number(text.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseAncapHistory(html: string): FuelRow[] {
  const table = /<table[\s\S]*?<\/table>/i.exec(html);
  if (!table) return [];
  const rows: FuelRow[] = [];
  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(table[0]))) {
    const cells: string[] = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let td: RegExpExecArray | null;
    while ((td = tdRe.exec(tr[0]))) cells.push(td[1] ?? "");
    if (cells.length !== 7) continue;
    const date = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(stripTags(cells[0]));
    if (!date) continue;
    rows.push({
      from: `${date[3]}-${date[2]}-${date[1]}`,
      super95: cell(cells[1]),
      premium97: cell(cells[2]),
      gasoil50s: cell(cells[3]),
      gasoil10s: cell(cells[4]),
      queroseno: cell(cells[5]),
      supergas: cell(cells[6]),
    });
  }
  rows.sort((a, b) => a.from.localeCompare(b.from));
  return rows;
}
```

- [ ] **Step 4: Correr, verde**

Run: `npx vitest run tests/combustibles/parse.test.ts` → PASS.

- [ ] **Step 5: Test de validación (falla)**

`tests/combustibles/validate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { FuelRow } from "../../classes/combustibles/parse";
import { validateFuelRows } from "../../classes/combustibles/validate";

const row = (from: string, over: Partial<FuelRow> = {}): FuelRow => ({
  from, super95: 80, premium97: 83, gasoil50s: 50, gasoil10s: 58, queroseno: 52, supergas: 88, ...over,
});
const months = (n: number): FuelRow[] =>
  Array.from({ length: n }, (_, i) => row(`2025-${String(i + 1).padStart(2, "0")}-01`));

describe("validateFuelRows", () => {
  it("acepta una serie sana", () => {
    const v = validateFuelRows(months(12));
    expect(v.ok).toBe(true);
  });
  it("rechaza menos de 12 filas", () => {
    expect(validateFuelRows(months(11))).toMatchObject({ ok: false, reason: expect.stringContaining("12") });
  });
  it("rechaza fechas duplicadas", () => {
    const rows = months(12);
    rows[5] = row(rows[4].from);
    expect(validateFuelRows(rows).ok).toBe(false);
  });
  it("rechaza un valor fuera de banda", () => {
    const rows = months(12);
    rows[3] = row(rows[3].from, { super95: 350 });
    expect(validateFuelRows(rows)).toMatchObject({ ok: false, reason: expect.stringContaining("super95") });
  });
  it("rechaza un salto mayor al 50 % entre vigencias (tabla corrida de columna)", () => {
    const rows = months(12);
    rows[6] = row(rows[6].from, { gasoil50s: 88, super95: 50 });
    expect(validateFuelRows(rows).ok).toBe(false);
  });
  it("exige super95 y gasoil50s presentes", () => {
    const rows = months(12);
    rows[2] = row(rows[2].from, { super95: null });
    expect(validateFuelRows(rows).ok).toBe(false);
  });
  it("no deja que una edición vieja pise la vigente", () => {
    expect(validateFuelRows(months(12), "2026-01-01").ok).toBe(false);
    expect(validateFuelRows(months(12), "2025-12-01").ok).toBe(true);
  });
});
```

- [ ] **Step 6: Implementar `validate.ts`**

```ts
// classes/combustibles/validate.ts
import { FUEL_KEYS, type FuelKey, type FuelRow } from "./parse";

/** Pesos por litro (supergás por kg). Medido 2021-07 → 2026-09: 45,7–101,26. */
export const FUEL_BANDS: Record<FuelKey, readonly [number, number]> = {
  super95: [40, 200],
  premium97: [40, 200],
  gasoil50s: [30, 180],
  gasoil10s: [30, 180],
  queroseno: [30, 180],
  supergas: [40, 200],
};
/** Salto máximo entre vigencias consecutivas. El mayor real fue 35 % (queroseno, abril 2026). */
export const MAX_STEP_PCT = 50;
export const MIN_ROWS = 12;
const REQUIRED: readonly FuelKey[] = ["super95", "gasoil50s"];

export type Validation = { ok: true; rows: FuelRow[] } | { ok: false; reason: string };

export function validateFuelRows(rows: FuelRow[], storedLatestFrom: string | null = null): Validation {
  if (rows.length < MIN_ROWS) return { ok: false, reason: `sólo ${rows.length} filas (mínimo ${MIN_ROWS})` };
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.from)) return { ok: false, reason: `vigencia duplicada ${r.from}` };
    seen.add(r.from);
    for (const key of REQUIRED) if (r[key] == null) return { ok: false, reason: `${key} vacío en ${r.from}` };
    for (const key of FUEL_KEYS) {
      const v = r[key];
      if (v == null) continue;
      const [lo, hi] = FUEL_BANDS[key];
      if (!Number.isFinite(v) || v < lo || v > hi) return { ok: false, reason: `${key}=${v} fuera de banda en ${r.from}` };
    }
  }
  for (const key of FUEL_KEYS) {
    let prev: number | null = null;
    for (const r of rows) {
      const v = r[key];
      if (v == null) continue;
      if (prev != null && Math.abs(v / prev - 1) * 100 > MAX_STEP_PCT) {
        return { ok: false, reason: `${key} salta ${prev} → ${v} en ${r.from}` };
      }
      prev = v;
    }
  }
  const latest = rows[rows.length - 1].from;
  if (storedLatestFrom && latest < storedLatestFrom) {
    return { ok: false, reason: `última vigencia ${latest} anterior a la guardada ${storedLatestFrom}` };
  }
  return { ok: true, rows };
}
```

- [ ] **Step 7: Verde**

Run: `npx vitest run tests/combustibles/validate.test.ts` → PASS.

- [ ] **Step 8: `baseline.ts` (24 vigencias horneadas)**

```ts
// classes/combustibles/baseline.ts
//
// Lo que sirve GET /combustibles si Mongo está vacío. Copia de la tabla de ANCAP leída el
// 2026-09-15; app/server/utils/combustiblesFallback.ts lleva la misma lista y
// tests/combustibles/baseline_parity.test.ts impide que se separen.
import type { FuelRow } from "./parse";

export const BASELINE_FUEL_SOURCE_URL = "https://www.ancap.com.uy/10564/5/historico-precios-combustibles.html";

export const BASELINE_FUEL_ROWS: readonly FuelRow[] = [
  { from: "2024-10-01", super95: 75.04, premium97: 77.58, gasoil50s: 49.92, gasoil10s: 58.1, queroseno: 52.13, supergas: 80.75 },
  { from: "2024-11-01", super95: 75.04, premium97: 77.58, gasoil50s: 49.92, gasoil10s: 58.1, queroseno: 52.13, supergas: 80.75 },
  { from: "2024-12-01", super95: 75.04, premium97: 77.58, gasoil50s: 49.92, gasoil10s: 58.1, queroseno: 52.13, supergas: 80.75 },
  { from: "2025-01-01", super95: 78.54, premium97: 81.08, gasoil50s: 49.92, gasoil10s: 58.1, queroseno: 55.8, supergas: 88.46 },
  { from: "2025-02-01", super95: 78.54, premium97: 81.08, gasoil50s: 50.92, gasoil10s: 58.1, queroseno: 55.8, supergas: 88.46 },
  { from: "2025-03-01", super95: 78.54, premium97: 81.08, gasoil50s: 50.92, gasoil10s: 58.1, queroseno: 55.8, supergas: 88.46 },
  { from: "2025-04-01", super95: 78.54, premium97: 81.08, gasoil50s: 50.17, gasoil10s: 58.1, queroseno: 54.63, supergas: 88.46 },
  { from: "2025-05-01", super95: 78.54, premium97: 81.08, gasoil50s: 49.42, gasoil10s: 57.23, queroseno: 54.55, supergas: 88.46 },
  { from: "2025-06-01", super95: 78.47, premium97: 80.87, gasoil50s: 47.03, gasoil10s: 54.03, queroseno: 52.4, supergas: 88.46 },
  { from: "2025-07-01", super95: 78.72, premium97: 81.13, gasoil50s: 48.08, gasoil10s: 55.08, queroseno: 53.34, supergas: 80.77 },
  { from: "2025-08-01", super95: 78.72, premium97: 81.13, gasoil50s: 48.08, gasoil10s: 55.08, queroseno: 54.18, supergas: 80.77 },
  { from: "2025-09-01", super95: 78.2, premium97: 80.61, gasoil50s: 50.14, gasoil10s: 57.14, queroseno: 53.13, supergas: 88.46 },
  { from: "2025-10-01", super95: 78.2, premium97: 80.61, gasoil50s: 50.14, gasoil10s: 57.14, queroseno: 53.63, supergas: 88.46 },
  { from: "2025-11-01", super95: 78.02, premium97: 80.48, gasoil50s: 49.77, gasoil10s: 56.77, queroseno: 53.95, supergas: 88.46 },
  { from: "2025-12-01", super95: 78.02, premium97: 80.48, gasoil50s: 49.77, gasoil10s: 56.77, queroseno: 55.19, supergas: 88.46 },
  { from: "2026-01-01", super95: 77.79, premium97: 80.3, gasoil50s: 48.9, gasoil10s: 55.9, queroseno: 52.16, supergas: 88.46 },
  { from: "2026-02-01", super95: 77.79, premium97: 80.3, gasoil50s: 48.9, gasoil10s: 55.9, queroseno: 52.27, supergas: 88.46 },
  { from: "2026-03-01", super95: 76.88, premium97: 79.4, gasoil50s: 47.32, gasoil10s: 54.32, queroseno: 55.24, supergas: 88.46 },
  { from: "2026-04-01", super95: 82.27, premium97: 84.95, gasoil50s: 50.63, gasoil10s: 58.13, queroseno: 74.68, supergas: 94.64 },
  { from: "2026-05-01", super95: 88.03, premium97: 90.9, gasoil50s: 57.72, gasoil10s: 66.27, queroseno: 74.68, supergas: 101.26 },
  { from: "2026-06-01", super95: 93.36, premium97: 96.0, gasoil50s: 61.76, gasoil10s: 70.91, queroseno: 74.68, supergas: 101.26 },
  { from: "2026-07-01", super95: 88.67, premium97: 91.19, gasoil50s: 58.68, gasoil10s: 67.33, queroseno: 67.19, supergas: 93.56 },
  { from: "2026-08-01", super95: 88.67, premium97: 91.19, gasoil50s: 58.68, gasoil10s: 67.33, queroseno: 67.5, supergas: 93.56 },
  { from: "2026-09-01", super95: 88.67, premium97: 91.19, gasoil50s: 58.68, gasoil10s: 67.33, queroseno: 67.5, supergas: 93.56 },
];
```

- [ ] **Step 9: Test de `api.ts` (falla) y su implementación**

`tests/combustibles/api.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildFuelResponse } from "../../classes/combustibles/api";
import { BASELINE_FUEL_ROWS, BASELINE_FUEL_SOURCE_URL } from "../../classes/combustibles/baseline";

describe("buildFuelResponse", () => {
  it("expone latest, previous y las filas ascendentes", () => {
    const r = buildFuelResponse([...BASELINE_FUEL_ROWS], null);
    expect(r.asOf).toBeNull();
    expect(r.sourceUrl).toBe(BASELINE_FUEL_SOURCE_URL);
    expect(r.latest.from).toBe("2026-09-01");
    expect(r.previous?.from).toBe("2026-08-01");
    expect(r.rows[0].from < r.rows[r.rows.length - 1].from).toBe(true);
  });
  it("lleva el asOf de la meta cuando hay lectura viva", () => {
    const r = buildFuelResponse([...BASELINE_FUEL_ROWS], { asOf: "2026-09-15T07:11:00.000Z", rows: 24, latestFrom: "2026-09-01", sourceUrl: "x" });
    expect(r.asOf).toBe("2026-09-15T07:11:00.000Z");
    expect(r.sourceUrl).toBe("x");
  });
  it("con una sola fila previous es null", () => {
    expect(buildFuelResponse([BASELINE_FUEL_ROWS[0]], null).previous).toBeNull();
  });
});
```

```ts
// classes/combustibles/api.ts
import { BASELINE_FUEL_SOURCE_URL } from "./baseline";
import type { FuelRow } from "./parse";
import type { FuelMeta } from "./store";

export interface FuelResponse {
  asOf: string | null;
  sourceUrl: string;
  latest: FuelRow;
  previous: FuelRow | null;
  rows: FuelRow[];
}

export function buildFuelResponse(rows: FuelRow[], meta: FuelMeta | null): FuelResponse {
  const sorted = [...rows].sort((a, b) => a.from.localeCompare(b.from));
  return {
    asOf: meta?.asOf ?? null,
    sourceUrl: meta?.sourceUrl ?? BASELINE_FUEL_SOURCE_URL,
    latest: sorted[sorted.length - 1],
    previous: sorted.length > 1 ? sorted[sorted.length - 2] : null,
    rows: sorted,
  };
}
```

- [ ] **Step 10: `store.ts` y `refresh.ts`** (sin test unitario: Mongo y red; se prueban a mano en el VPS)

```ts
// classes/combustibles/store.ts
import { Schema } from "mongoose";
import { MongooseServer } from "../database";
import type { FuelRow } from "./parse";

const rowSchema = new Schema(
  {
    from: { type: String, required: true },
    super95: { type: Number, default: null },
    premium97: { type: Number, default: null },
    gasoil50s: { type: Number, default: null },
    gasoil10s: { type: Number, default: null },
    queroseno: { type: Number, default: null },
    supergas: { type: Number, default: null },
    source: { type: String, required: true },
  },
  { strict: true }
);
rowSchema.index({ from: 1 }, { unique: true });

const META_KEY = "combustibles";
const metaSchema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });

const rowsDb = () => MongooseServer.getInstance("combustibles_history", rowSchema);
const metaDb = () => MongooseServer.getInstance("combustibles_meta", metaSchema);

export interface FuelMeta {
  asOf: string;
  rows: number;
  latestFrom: string;
  sourceUrl: string;
}

export async function saveFuelRows(rows: FuelRow[], source: string): Promise<number> {
  if (!rows.length) return 0;
  await rowsDb().bulkUpsert(rows.map((row) => ({ filter: { from: row.from }, update: { ...row, source } })));
  return rows.length;
}

/** Ascendente, para que el gráfico se dibuje sin invertir. */
export async function loadFuelRows(limit = 1000): Promise<FuelRow[]> {
  const rows = await rowsDb().aggregate([
    { $sort: { from: -1 } },
    { $limit: Math.min(Math.max(limit, 1), 5000) },
    { $project: { _id: 0, source: 0, __v: 0 } },
    { $sort: { from: 1 } },
  ]);
  return rows as FuelRow[];
}

export async function loadFuelMeta(): Promise<FuelMeta | null> {
  const rows = await metaDb().aggregate([{ $match: { key: META_KEY } }, { $limit: 1 }]);
  return (rows[0]?.doc as FuelMeta | undefined) ?? null;
}

export async function saveFuelMeta(doc: FuelMeta): Promise<void> {
  await metaDb().updateOne({ key: META_KEY }, { key: META_KEY, doc });
}
```

```ts
// classes/combustibles/refresh.ts
import { parseAncapHistory } from "./parse";
import { validateFuelRows } from "./validate";
import { loadFuelMeta, loadFuelRows, saveFuelMeta, saveFuelRows } from "./store";

export const ANCAP_HISTORY_URL = "https://www.ancap.com.uy/10564/5/historico-precios-combustibles.html";
const UA = "cambio-uruguay.com combustibles bot (+https://cambio-uruguay.com)";

export async function fetchAncapHistoryHtml(): Promise<string> {
  const res = await fetch(ANCAP_HISTORY_URL, {
    headers: { "user-agent": UA, accept: "text/html,*/*" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${ANCAP_HISTORY_URL}`);
  return res.text();
}

export interface RefreshSummary {
  rows: number;
  latestFrom: string;
  inserted: number;
}

/** Lee, valida contra lo guardado y recién ahí escribe. Cualquier fallo conserva lo anterior. */
export async function refreshFuelPrices(): Promise<RefreshSummary> {
  const html = await fetchAncapHistoryHtml();
  const parsed = parseAncapHistory(html);
  const meta = await loadFuelMeta();
  const checked = validateFuelRows(parsed, meta?.latestFrom ?? null);
  if (!checked.ok) throw new Error(`tabla rechazada: ${checked.reason}`);
  const known = new Set((await loadFuelRows()).map((r) => r.from));
  const inserted = checked.rows.filter((r) => !known.has(r.from)).length;
  await saveFuelRows(checked.rows, ANCAP_HISTORY_URL);
  const latestFrom = checked.rows[checked.rows.length - 1].from;
  await saveFuelMeta({ asOf: new Date().toISOString(), rows: checked.rows.length, latestFrom, sourceUrl: ANCAP_HISTORY_URL });
  return { rows: checked.rows.length, latestFrom, inserted };
}
```

- [ ] **Step 11: `sync_combustibles.ts` (raíz)**

```ts
// Precios de combustibles de ANCAP (pm2 `currency-combustibles`, 07:11 y 13:11 UTC). Lee la tabla
// histórica pública, la valida y la guarda. No usa Gemini. Nunca borra lo guardado en un fallo.
import dotenv from "dotenv";
dotenv.config();

import { refreshFuelPrices } from "./classes/combustibles/refresh";
import { MongooseServer, withTimeout } from "./classes/database";

async function main(): Promise<void> {
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  } catch (e: any) {
    console.error("[combustibles] cannot reach MongoDB — refusing to run silently:", e?.message || e);
    process.exit(1);
  }
  try {
    const summary = await refreshFuelPrices();
    console.log(`[combustibles] ${summary.rows} vigencias, última ${summary.latestFrom}, ${summary.inserted} nuevas`);
  } catch (e) {
    console.error("[combustibles] refresh failed, keeping the previous rows", e);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[combustibles] sync failed", e);
  process.exit(1);
});
```

- [ ] **Step 12: Ruta en `index.ts`**

Imports junto a los de figures (`index.ts:26-27`):
```ts
import { buildFuelResponse } from "./classes/combustibles/api";
import { BASELINE_FUEL_ROWS } from "./classes/combustibles/baseline";
import { loadFuelMeta, loadFuelRows } from "./classes/combustibles/store";
```
Después del bloque de `uy-figures`:
```ts
  /**
   * @openapi
   * /combustibles:
   *   get:
   *     summary: Precios de combustibles de ANCAP (vigentes e histórico mensual desde 2021)
   *     description: Nafta Súper 95, Premium 97, Gasoil 50-S, Gasoil 10-S, queroseno (pesos por litro) y supergás (pesos por kg), una fila por vigencia, leídas de la tabla pública de ANCAP. `asOf` es null cuando se sirve el baseline horneado.
   *     tags: [Indicadores]
   *     responses:
   *       200:
   *         description: latest, previous y rows ascendentes
   */
  server.getJson("combustibles", async (): Promise<any> => {
    return await redisCache.getOrSet(
      "combustibles",
      async () => {
        const rows = await loadFuelRows();
        if (!rows.length) return buildFuelResponse([...BASELINE_FUEL_ROWS], null);
        return buildFuelResponse(rows, await loadFuelMeta());
      },
      1800
    );
  });
```
Copiar el estilo exacto del JSDoc OpenAPI de `uy-figures` (`index.ts:2693-2735`) y ajustar el `tags` al que use ese bloque.

- [ ] **Step 13: pm2 y deploy**

`ecosystem.config.js`, dentro de `apps` (copiar la forma de `currency-figures`):
```js
    {
      name: "currency-combustibles",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_combustibles.js",
      cron_restart: "11 7,13 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```
`scripts/deploy-backend.sh:51`: agregar `currency-combustibles` al final de `OTHER_APPS`.
`AGENTS.md`: fila `| currency-combustibles | dist/sync_combustibles.js | 11 7,13 * * * | tabla histórica de ANCAP (HTML, sin LLM) → `combustibles_history` + `GET /combustibles`; rechaza tablas con salto > 50 % o edición vieja; sirve `/precio-de-la-nafta-uruguay` |` y `sync_combustibles.ts` en la lista de entrypoints.

- [ ] **Step 14: Paridad con el fallback del app (el test queda ROJO hasta la tarea 2)**

`tests/combustibles/baseline_parity.test.ts`:
```ts
// La app hornea las mismas 24 vigencias en app/server/utils/combustiblesFallback.ts para que la
// página nunca quede en blanco. Misma técnica que tests/figures/baseline_parity.test.ts: leer el
// archivo del app como texto, sin build cruzado.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { BASELINE_FUEL_ROWS } from "../../classes/combustibles/baseline";

const FALLBACK = path.join(__dirname, "..", "..", "app", "server", "utils", "combustiblesFallback.ts");

describe("combustibles baseline parity", () => {
  it("la última vigencia horneada es la misma en backend y app", () => {
    const src = fs.readFileSync(FALLBACK, "utf8");
    const last = BASELINE_FUEL_ROWS[BASELINE_FUEL_ROWS.length - 1];
    expect(src).toContain(`from: '${last.from}'`);
    expect(src).toContain(`super95: ${last.super95}`);
    expect(src).toContain(`supergas: ${last.supergas}`);
    expect((src.match(/from: '20\d\d-\d\d-\d\d'/g) ?? []).length).toBe(BASELINE_FUEL_ROWS.length);
  });
});
```

- [ ] **Step 15: Build y suite**

Run: `npx tsc -p tsconfig.production.json --noEmit` (raíz) y `npx vitest run tests/combustibles` → parse/validate/api PASS; parity FAIL hasta la tarea 2 (esperado; no commitear parity roto: commitearlo en la tarea 6).

- [ ] **Step 16: Commit (sólo archivos propios)**

```bash
git add classes/combustibles sync_combustibles.ts index.ts ecosystem.config.js scripts/deploy-backend.sh AGENTS.md tests/combustibles/parse.test.ts tests/combustibles/validate.test.ts tests/combustibles/api.test.ts tests/combustibles/fixtures
git commit -m "feat(combustibles): serie mensual de ANCAP, job pm2 y GET /combustibles"
```

---

### Task 2: App `/precio-de-la-nafta-uruguay`

**Files:**
- Create: `app/utils/fuelPrices.ts`, `app/server/utils/combustiblesFallback.ts`, `app/server/api/combustibles.get.ts`, `app/pages/precio-de-la-nafta-uruguay.vue`
- Test: `app/tests/unit/fuelPrices.test.ts`
- NO tocar `siteNav.ts` ni i18n (tarea 6).

**Interfaces:**
- Consumes: forma de `FuelRow`/`FuelResponse` de la tarea 1 y las 24 filas de `BASELINE_FUEL_ROWS` (copiarlas tal cual, con comillas simples).
- Produces: `FUEL_PRODUCTS`, `monthLabel`, `formatUyu`, `changeBetween`, `lastChange`, `yearAgo`, `buildFuelFaq`, `FUEL_HOW_IT_WORKS`, `FUEL_SOURCES`, `FUEL_VERIFIED_AT`, `FUEL_FALLBACK`.

- [ ] **Step 1: Test de los helpers (falla)**

`app/tests/unit/fuelPrices.test.ts`:
```ts
import { describe, expect, it } from 'vitest'

import {
  FUEL_HOW_IT_WORKS,
  FUEL_PRODUCTS,
  FUEL_SOURCES,
  FUEL_VERIFIED_AT,
  buildFuelFaq,
  changeBetween,
  formatUyu,
  lastChange,
  monthLabel,
  yearAgo,
} from '../../utils/fuelPrices'
import type { FuelRow } from '../../utils/fuelPrices'

const row = (from: string, super95: number, gasoil50s = 50): FuelRow => ({
  from, super95, premium97: super95 + 2.5, gasoil50s, gasoil10s: gasoil50s + 8, queroseno: 55, supergas: 88,
})
const rows = [row('2026-06-01', 93.36), row('2026-07-01', 88.67), row('2026-08-01', 88.67), row('2026-09-01', 88.67)]

describe('monthLabel', () => {
  it('escribe setiembre, no septiembre', () => {
    expect(monthLabel('2026-09-01')).toBe('setiembre 2026')
    expect(monthLabel('2026-01-01')).toBe('enero 2026')
  })
  it('no explota con basura', () => {
    expect(monthLabel('')).toBe('')
    expect(monthLabel('nope')).toBe('')
  })
})

describe('formatUyu', () => {
  it('usa coma decimal y el signo de pesos', () => {
    expect(formatUyu(88.67)).toBe('$ 88,67')
    expect(formatUyu(null)).toBe('—')
  })
})

describe('changeBetween', () => {
  it('devuelve diferencia y porcentaje', () => {
    expect(changeBetween(93.36, 88.67)).toEqual({ abs: -4.69, pct: -5.02 })
    expect(changeBetween(88.67, 88.67)).toEqual({ abs: 0, pct: 0 })
  })
  it('devuelve null con nulos o cero', () => {
    expect(changeBetween(null, 1)).toBeNull()
    expect(changeBetween(0, 1)).toBeNull()
    expect(changeBetween(Number.NaN, 1)).toBeNull()
  })
})

describe('lastChange', () => {
  it('encuentra la última vigencia en la que cambió el producto', () => {
    expect(lastChange(rows, 'super95')).toEqual({ from: '2026-07-01', before: 93.36, after: 88.67, abs: -4.69, pct: -5.02 })
  })
  it('null si nunca cambió o no hay filas', () => {
    expect(lastChange(rows, 'supergas')).toBeNull()
    expect(lastChange([], 'super95')).toBeNull()
  })
})

describe('yearAgo', () => {
  it('trae la fila vigente doce meses antes', () => {
    const many = [row('2025-09-01', 78.2), row('2025-10-01', 78.2), ...rows]
    expect(yearAgo(many, '2026-09-01')?.from).toBe('2025-09-01')
    expect(yearAgo(rows, '2026-09-01')).toBeNull()
  })
})

describe('buildFuelFaq', () => {
  const faq = buildFuelFaq(rows[3], rows[2], rows)
  it('arma al menos seis preguntas con id, pregunta y respuesta', () => {
    expect(faq.length).toBeGreaterThanOrEqual(6)
    for (const f of faq) {
      expect(f.id).toMatch(/^[a-z0-9-]+$/)
      expect(f.question.length).toBeGreaterThan(10)
      expect(f.answer.length).toBeGreaterThan(40)
    }
  })
  it('las respuestas llevan los números vigentes', () => {
    expect(faq.map(f => f.answer).join(' ')).toContain('$ 88,67')
    expect(faq.map(f => f.answer).join(' ')).toContain('setiembre 2026')
  })
})

describe('catálogo', () => {
  it('seis productos con unidad', () => {
    expect(FUEL_PRODUCTS.map(p => p.key)).toEqual(['super95', 'premium97', 'gasoil50s', 'gasoil10s', 'queroseno', 'supergas'])
    expect(FUEL_PRODUCTS.find(p => p.key === 'supergas')?.unit).toBe('kg')
  })
  it('fuentes https y fecha de verificación ISO', () => {
    expect(FUEL_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of FUEL_SOURCES) expect(s.url).toMatch(/^https:\/\//)
    expect(FUEL_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(FUEL_HOW_IT_WORKS.length).toBeGreaterThanOrEqual(4)
  })
})
```

- [ ] **Step 2: Correr (falla)**

Run (en `app/`): `npx vitest run tests/unit/fuelPrices.test.ts` → FAIL.

- [ ] **Step 3: Implementar `app/utils/fuelPrices.ts`**

```ts
// Precios de combustibles: tipos, catálogo y helpers puros de /precio-de-la-nafta-uruguay.
// Sin imports de Vue/Nuxt: lo carga vitest-node y también el server (fallback).
import type { FaqItem } from './faqAnswers'

export type FuelKey = 'super95' | 'premium97' | 'gasoil50s' | 'gasoil10s' | 'queroseno' | 'supergas'

export interface FuelRow {
  from: string
  super95: number | null
  premium97: number | null
  gasoil50s: number | null
  gasoil10s: number | null
  queroseno: number | null
  supergas: number | null
}

export interface FuelResponse {
  asOf: string | null
  sourceUrl: string
  latest: FuelRow
  previous: FuelRow | null
  rows: FuelRow[]
}

export interface FuelProduct {
  key: FuelKey
  label: string
  short: string
  unit: 'litro' | 'kg'
}

export const FUEL_PRODUCTS: readonly FuelProduct[] = [
  { key: 'super95', label: 'Nafta Súper 95', short: 'Súper 95', unit: 'litro' },
  { key: 'premium97', label: 'Nafta Premium 97', short: 'Premium 97', unit: 'litro' },
  { key: 'gasoil50s', label: 'Gasoil 50-S', short: 'Gasoil 50-S', unit: 'litro' },
  { key: 'gasoil10s', label: 'Gasoil 10-S', short: 'Gasoil 10-S', unit: 'litro' },
  { key: 'queroseno', label: 'Queroseno', short: 'Queroseno', unit: 'litro' },
  { key: 'supergas', label: 'Supergás', short: 'Supergás', unit: 'kg' },
]

export const FUEL_VERIFIED_AT = '2026-09-15'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre']

/** "setiembre 2026" a partir de una vigencia ISO. Uruguay escribe setiembre. */
export function monthLabel(from: string): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(from ?? '')
  if (!m) return ''
  const month = MONTHS[Number(m[2]) - 1]
  return month ? `${month} ${m[1]}` : ''
}

const round2 = (n: number): number => Math.round(n * 100) / 100

export function formatUyu(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `$ ${n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export interface Change {
  abs: number
  pct: number
}

export function changeBetween(before: number | null | undefined, after: number | null | undefined): Change | null {
  if (before == null || after == null || !Number.isFinite(before) || !Number.isFinite(after) || before === 0) return null
  return { abs: round2(after - before), pct: round2(((after - before) / before) * 100) }
}

export interface LastChange extends Change {
  from: string
  before: number
  after: number
}

/** La última vigencia en la que ese producto cambió de precio, y cuánto. */
export function lastChange(rows: readonly FuelRow[], key: FuelKey): LastChange | null {
  for (let i = rows.length - 1; i > 0; i--) {
    const after = rows[i][key]
    const before = rows[i - 1][key]
    if (after == null || before == null) continue
    if (after !== before) {
      const c = changeBetween(before, after)
      return c ? { from: rows[i].from, before, after, ...c } : null
    }
  }
  return null
}

/** La fila vigente doce meses antes de `latestFrom` (misma vigencia del año anterior). */
export function yearAgo(rows: readonly FuelRow[], latestFrom: string): FuelRow | null {
  const m = /^(\d{4})-(\d{2}-\d{2})$/.exec(latestFrom ?? '')
  if (!m) return null
  const wanted = `${Number(m[1]) - 1}-${m[2]}`
  return rows.find(r => r.from === wanted) ?? null
}

export interface FuelSource {
  label: string
  url: string
}

export const FUEL_SOURCES: readonly FuelSource[] = [
  { label: 'ANCAP — Histórico de precios de combustibles', url: 'https://www.ancap.com.uy/10564/5/historico-precios-combustibles.html' },
  { label: 'ANCAP — Decretos de precios', url: 'https://www.ancap.com.uy/4898/5/decretos-precios.html' },
  { label: 'MIEM — Tarifas y precios de combustibles', url: 'https://www.gub.uy/ministerio-industria-energia-mineria/tematica/tarifas' },
  { label: 'URSEA — Precios de paridad de importación (PPI)', url: 'https://www.gub.uy/unidad-reguladora-servicios-energia-agua/tematica/paridad-precios-importacion-ppi' },
  { label: 'Catálogo de Datos Abiertos — PPI de combustibles líquidos', url: 'https://catalogodatos.gub.uy/dataset/ursea-ppi_vs_pe_v2' },
]

export const FUEL_HOW_IT_WORKS: ReadonlyArray<{ heading: string; body: string }> = [
  {
    heading: 'URSEA calcula cada mes el precio de paridad de importación',
    body: 'La Unidad Reguladora de los Servicios de Energía y Agua publica todos los meses el precio de paridad de importación (PPI): lo que costaría traer nafta, gasoil y supergás terminados en vez de refinarlos en ANCAP. Es la referencia técnica, no el precio en el surtidor.',
  },
  {
    heading: 'El Poder Ejecutivo fija el precio por decreto',
    body: 'Con ese informe, los ministerios de Economía y de Industria deciden el precio de venta al público y lo firman por decreto, normalmente en los últimos días del mes. Pueden seguir el PPI o apartarse: en 2026 el Gobierno anunció que amortigua parte de la suba del petróleo por el conflicto en Medio Oriente.',
  },
  {
    heading: 'Rige el día 1 y es igual en todo el país',
    body: 'El precio nuevo entra en vigencia el primer día del mes y es uniforme en todo el territorio: una estación de Artigas cobra lo mismo que una de Montevideo. Lo que sí cambia entre estaciones son las promociones y los descuentos con tarjeta.',
  },
  {
    heading: 'El IMESI de las naftas se ajusta en enero',
    body: 'Las naftas pagan IMESI, un impuesto específico que el Ejecutivo actualiza a comienzos de cada año. Por eso los cambios de enero suelen mezclar dos cosas: la variación del petróleo y la del impuesto.',
  },
]

const product = (key: FuelKey): FuelProduct => FUEL_PRODUCTS.find(p => p.key === key)!

export function buildFuelFaq(latest: FuelRow, previous: FuelRow | null, rows: readonly FuelRow[]): FaqItem[] {
  const month = monthLabel(latest.from)
  const superChange = changeBetween(previous?.super95, latest.super95)
  const last = lastChange(rows, 'super95')
  const movement =
    superChange == null
      ? `Todavía no hay una vigencia anterior para comparar.`
      : superChange.abs === 0
        ? `Este mes la Súper 95 no cambió: sigue a ${formatUyu(latest.super95)} el litro, igual que en ${monthLabel(previous!.from)}.`
        : `Desde el 1.º de ${month} la Súper 95 ${superChange.abs > 0 ? 'subió' : 'bajó'} ${formatUyu(Math.abs(superChange.abs))} por litro (${Math.abs(superChange.pct).toLocaleString('es-UY')} %) respecto de ${monthLabel(previous!.from)}.`
  const lastMove =
    last == null
      ? ''
      : ` La última vez que se movió fue en ${monthLabel(last.from)}: pasó de ${formatUyu(last.before)} a ${formatUyu(last.after)}.`
  return [
    {
      id: 'cuanto-sale-la-nafta',
      question: '¿Cuánto sale el litro de nafta hoy en Uruguay?',
      answer: `La Nafta Súper 95 vale ${formatUyu(latest.super95)} el litro y la Premium 97 ${formatUyu(latest.premium97)}, precios vigentes desde el 1.º de ${month} y fijados por decreto para todo el país.`,
    },
    {
      id: 'cuanto-subio-la-nafta',
      question: '¿Cuánto subió o bajó la nafta este mes?',
      answer: `${movement}${lastMove}`,
    },
    {
      id: 'cuando-cambia-el-precio',
      question: '¿Cuándo cambia el precio de los combustibles?',
      answer: `Los precios se revisan mes a mes: URSEA publica su informe de paridad de importación, el Poder Ejecutivo decide y firma el decreto en los últimos días del mes, y el precio nuevo rige desde el día 1. El próximo cambio posible es el 1.º del mes siguiente a ${month}.`,
    },
    {
      id: 'cuanto-sale-el-gasoil',
      question: '¿Cuánto sale el gasoil?',
      answer: `El Gasoil 50-S vale ${formatUyu(latest.gasoil50s)} el litro y el Gasoil 10-S ${formatUyu(latest.gasoil10s)}, vigentes desde el 1.º de ${month}.`,
    },
    {
      id: 'cuanto-sale-el-supergas',
      question: '¿Cuánto sale el supergás?',
      answer: `El supergás vale ${formatUyu(latest.supergas)} por kilo desde el 1.º de ${month}. El precio de la garrafa depende de su tamaño y del distribuidor; ANCAP publica el valor por kilo.`,
    },
    {
      id: 'quien-fija-el-precio',
      question: '¿Quién fija el precio de la nafta en Uruguay?',
      answer: 'El Poder Ejecutivo, por decreto de los ministerios de Economía y de Industria, con el informe mensual de precios de paridad de importación de URSEA como referencia. ANCAP produce y distribuye, pero no decide el precio de venta al público.',
    },
    {
      id: 'por-que-la-premium-sale-mas',
      question: '¿Por qué la Premium 97 sale más que la Súper 95?',
      answer: `Tiene más octanaje (97 contra 95) y un proceso de refinación distinto. La diferencia hoy es de ${formatUyu(changeBetween(latest.super95, latest.premium97)?.abs ?? null)} por litro. Sólo conviene si el manual del auto la pide.`,
    },
    {
      id: 'es-igual-en-todo-el-pais',
      question: '¿El precio es el mismo en todas las estaciones?',
      answer: 'Sí, el precio de venta al público es uniforme en todo el país por decreto. Lo que cambia son las promociones por día, las apps de fidelidad y los descuentos con tarjeta, que pueden bajar el gasto real entre 5 y 20 %.',
    },
  ]
}
```

- [ ] **Step 4: Verde**

Run: `npx vitest run tests/unit/fuelPrices.test.ts` → PASS.

- [ ] **Step 5: Fallback y proxy**

`app/server/utils/combustiblesFallback.ts`:
```ts
// Lo que sirve /api/combustibles cuando el backend no responde: las mismas 24 vigencias que
// classes/combustibles/baseline.ts (tests/combustibles/baseline_parity.test.ts las compara).
import type { FuelResponse, FuelRow } from '../../utils/fuelPrices'

const ROWS: FuelRow[] = [
  { from: '2024-10-01', super95: 75.04, premium97: 77.58, gasoil50s: 49.92, gasoil10s: 58.1, queroseno: 52.13, supergas: 80.75 },
  // … las 24 filas de classes/combustibles/baseline.ts, con comillas simples …
  { from: '2026-09-01', super95: 88.67, premium97: 91.19, gasoil50s: 58.68, gasoil10s: 67.33, queroseno: 67.5, supergas: 93.56 },
]

export const FUEL_FALLBACK: FuelResponse = {
  asOf: null,
  sourceUrl: 'https://www.ancap.com.uy/10564/5/historico-precios-combustibles.html',
  latest: ROWS[ROWS.length - 1]!,
  previous: ROWS[ROWS.length - 2]!,
  rows: ROWS,
}
```
(escribir las 24 filas completas; el test de paridad cuenta las fechas).

`app/server/api/combustibles.get.ts`:
```ts
// Passthrough cacheado de GET /combustibles del API público, con el baseline horneado si no
// responde: la página se renderiza en SSR con números siempre.
import type { FuelResponse } from '../../utils/fuelPrices'
import { FUEL_FALLBACK } from '../utils/combustiblesFallback'

export default defineCachedEventHandler(
  async () => {
    const base = useRuntimeConfig().apiBaseServer
    return $fetch<FuelResponse>(`${base}/combustibles`, { timeout: 12000 }).catch(() => FUEL_FALLBACK)
  },
  { maxAge: 60 * 30, staleMaxAge: 60 * 60 * 12, name: 'combustibles', getKey: () => 'combustibles' }
)
```

- [ ] **Step 6: La página**

`app/pages/precio-de-la-nafta-uruguay.vue` (esqueleto completo; copiar estilos de `deuda-de-gastos-comunes-uruguay.vue`):
```vue
<template>
  <VContainer class="nafta py-8" style="max-width: 1100px">
    <VBreadcrumbs :items="crumbs" class="px-0 pb-2" />
    <header class="mb-6">
      <VChip color="primary" variant="tonal" size="small" class="mb-3">Combustibles · vigente desde el 1.º de {{ month }}</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">Precio de la nafta en Uruguay hoy</h1>
      <p class="text-body-1">
        La Nafta Súper 95 vale <strong>{{ fmt(latest.super95) }}</strong> el litro y la Premium 97
        <strong>{{ fmt(latest.premium97) }}</strong>; el Gasoil 50-S, <strong>{{ fmt(latest.gasoil50s) }}</strong>,
        y el supergás, <strong>{{ fmt(latest.supergas) }}</strong> el kilo. Precios fijados por decreto, iguales en
        todo el país, vigentes desde el 1.º de {{ month }}.
      </p>
      <p v-if="superMove" class="text-body-2">{{ superMove }}</p>
    </header>

    <section class="mb-8">
      <h2 class="text-h5 mb-3">Precios vigentes por producto</h2>
      <VTable class="cu-mobile-cards" density="comfortable">
        <thead><tr><th>Producto</th><th class="text-right">Precio</th><th class="text-right">vs. mes anterior</th><th class="text-right">Último cambio</th></tr></thead>
        <tbody>
          <tr v-for="p in products" :key="p.key">
            <td data-label="Producto">{{ p.label }} <span class="text-medium-emphasis">(por {{ p.unit }})</span></td>
            <td data-label="Precio" class="text-right font-weight-bold">{{ fmt(latest[p.key]) }}</td>
            <td data-label="vs. mes anterior" class="text-right">{{ p.change }}</td>
            <td data-label="Último cambio" class="text-right">{{ p.last }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-caption mt-2">Fuente: ANCAP. {{ asOfLabel }}</p>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 mb-3">Cuándo cambia el precio</h2>
      <p>El próximo cambio posible es el <strong>1.º de {{ nextMonth }}</strong>. El decreto se firma en los últimos días del mes, después del informe de paridad de importación de URSEA. Si el Ejecutivo decide mantener los precios, la tabla de arriba no se mueve.</p>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 mb-3">Histórico mensual desde 2021</h2>
      <ClientOnly>
        <LineChart :chart-data="chartData" :options="chartOptions" aria-label="Evolución mensual del precio de la nafta, el gasoil y el supergás" />
      </ClientOnly>
      <VTable class="cu-mobile-cards mt-4" density="compact">
        <thead><tr><th>Vigencia</th><th class="text-right">Súper 95</th><th class="text-right">Premium 97</th><th class="text-right">Gasoil 50-S</th><th class="text-right">Gasoil 10-S</th><th class="text-right">Queroseno</th><th class="text-right">Supergás (kg)</th></tr></thead>
        <tbody>
          <tr v-for="r in visibleRows" :key="r.from">
            <td data-label="Vigencia">{{ monthLabel(r.from) }}</td>
            <td data-label="Súper 95" class="text-right">{{ fmt(r.super95) }}</td>
            <td data-label="Premium 97" class="text-right">{{ fmt(r.premium97) }}</td>
            <td data-label="Gasoil 50-S" class="text-right">{{ fmt(r.gasoil50s) }}</td>
            <td data-label="Gasoil 10-S" class="text-right">{{ fmt(r.gasoil10s) }}</td>
            <td data-label="Queroseno" class="text-right">{{ fmt(r.queroseno) }}</td>
            <td data-label="Supergás (kg)" class="text-right">{{ fmt(r.supergas) }}</td>
          </tr>
        </tbody>
      </VTable>
      <VBtn v-if="rowsDesc.length > 12" variant="text" size="small" class="mt-2" @click="showAll = !showAll">
        {{ showAll ? 'Ver sólo el último año' : `Ver las ${rowsDesc.length} vigencias` }}
      </VBtn>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 mb-3">Cómo se fija el precio</h2>
      <div v-for="s in howItWorks" :key="s.heading" class="mb-4">
        <h3 class="text-h6">{{ s.heading }}</h3>
        <p>{{ s.body }}</p>
      </div>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <section class="mb-8">
      <h2 class="text-h5 mb-3">Fuentes</h2>
      <ul><li v-for="s in sources" :key="s.url"><a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a></li></ul>
      <p class="text-caption">Verificado el {{ verifiedAt }}.</p>
    </section>

    <section>
      <h2 class="text-h5 mb-3">Seguir leyendo</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn v-for="l in related" :key="l.to" :to="localePath(l.to)" variant="tonal" color="primary" size="small">{{ l.label }}</VBtn>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LineChart from '~/components/charts/LineChart.vue'
import {
  FUEL_HOW_IT_WORKS,
  FUEL_PRODUCTS,
  FUEL_SOURCES,
  FUEL_VERIFIED_AT,
  buildFuelFaq,
  changeBetween,
  formatUyu,
  lastChange,
  monthLabel,
} from '~/utils/fuelPrices'
import type { FuelResponse } from '~/utils/fuelPrices'

const localePath = useLocalePath()
const { data } = await useFetch<FuelResponse>('/api/combustibles', { key: 'combustibles' })
const res = computed(() => data.value!)
const latest = computed(() => res.value.latest)
const previous = computed(() => res.value.previous)
const rowsAsc = computed(() => res.value.rows)
const rowsDesc = computed(() => [...rowsAsc.value].reverse())
const showAll = ref(false)
const visibleRows = computed(() => (showAll.value ? rowsDesc.value : rowsDesc.value.slice(0, 12)))
const fmt = formatUyu
const month = computed(() => monthLabel(latest.value.from))
const nextMonth = computed(() => {
  const [y, m] = latest.value.from.split('-').map(Number)
  const d = new Date(Date.UTC(y, m, 1))
  return monthLabel(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`)
})
const signed = (c: { abs: number; pct: number } | null): string =>
  c == null ? '—' : c.abs === 0 ? '= sin cambio' : `${c.abs > 0 ? '▲' : '▼'} ${fmt(Math.abs(c.abs))} (${Math.abs(c.pct).toLocaleString('es-UY')} %)`
const products = computed(() =>
  FUEL_PRODUCTS.map(p => {
    const lc = lastChange(rowsAsc.value, p.key)
    return {
      ...p,
      change: signed(changeBetween(previous.value?.[p.key], latest.value[p.key])),
      last: lc ? `${monthLabel(lc.from)}: ${fmt(lc.before)} → ${fmt(lc.after)}` : 'sin cambios en la serie',
    }
  })
)
const superMove = computed(() => {
  const c = changeBetween(previous.value?.super95, latest.value.super95)
  if (!c || !previous.value) return ''
  if (c.abs === 0) return `La Súper 95 no cambió respecto de ${monthLabel(previous.value.from)}.`
  return `La Súper 95 ${c.abs > 0 ? 'subió' : 'bajó'} ${fmt(Math.abs(c.abs))} por litro respecto de ${monthLabel(previous.value.from)} (${Math.abs(c.pct).toLocaleString('es-UY')} %).`
})
const asOfLabel = computed(() =>
  res.value.asOf ? `Tabla leída el ${new Date(res.value.asOf).toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' })}.` : 'Tabla verificada a mano.'
)
const faq = computed(() => buildFuelFaq(latest.value, previous.value, rowsAsc.value))
const howItWorks = FUEL_HOW_IT_WORKS
const sources = FUEL_SOURCES
const verifiedAt = new Date(`${FUEL_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const related = [
  { label: 'Descuentos con tarjeta en combustible', to: '/descuentos-con-tarjeta-uruguay/rubro/combustible-y-vehiculos' },
  { label: 'IMESI a autos eléctricos', to: '/impuesto-autos-electricos-uruguay' },
  { label: 'Cuánto cuesta tener auto', to: '/guias/costos-de-tener-auto-uruguay' },
  { label: 'Costo de vida', to: '/herramientas/costo-de-vida' },
  { label: 'Dólar hoy', to: '/dolar-hoy' },
]
const chartData = computed(() => ({
  labels: rowsAsc.value.map(r => monthLabel(r.from)),
  datasets: [
    { label: 'Súper 95', data: rowsAsc.value.map(r => r.super95), borderColor: '#1976d2', tension: 0.2 },
    { label: 'Premium 97', data: rowsAsc.value.map(r => r.premium97), borderColor: '#7b1fa2', tension: 0.2 },
    { label: 'Gasoil 50-S', data: rowsAsc.value.map(r => r.gasoil50s), borderColor: '#388e3c', tension: 0.2 },
    { label: 'Supergás (kg)', data: rowsAsc.value.map(r => r.supergas), borderColor: '#f57c00', tension: 0.2 },
  ],
}))
const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { ticks: { callback: (v: number) => `$ ${v}` } } } }
const crumbs = [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Precio de la nafta', disabled: true },
]

const canonicalUrl = 'https://cambio-uruguay.com/precio-de-la-nafta-uruguay'
const title = computed(() => `Precio de la nafta hoy: ${fmt(latest.value.super95)} el litro`)
const description = computed(
  () =>
    `Nafta Súper 95 ${fmt(latest.value.super95)}, Premium 97 ${fmt(latest.value.premium97)}, Gasoil 50-S ${fmt(latest.value.gasoil50s)} y supergás ${fmt(latest.value.supergas)} el kilo, vigentes desde el 1.º de ${month.value}. Cuánto subió, cuándo cambia y el histórico mensual de ANCAP desde 2021.`
)
defineOgImageComponent('Cambio', {
  title: 'Precio de la nafta hoy',
  subtitle: `Súper 95 ${fmt(latest.value.super95)} · Gasoil ${fmt(latest.value.gasoil50s)}`,
  tag: 'COMBUSTIBLES',
})
useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: () => title.value,
  ogDescription: () => description.value,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value,
  twitterDescription: () => description.value,
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [{ name: 'keywords', content: 'precio nafta, precio de la nafta hoy, nafta uruguay, nafta super 95 precio, nafta premium 97 precio, precio gasoil, precio supergas, cuanto sube la nafta, cuando sube la nafta, precio combustibles uruguay, ancap precios' }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://cambio-uruguay.com/' },
            { '@type': 'ListItem', position: 2, name: 'Precio de la nafta', item: canonicalUrl },
          ] },
          { '@type': 'Article', headline: title.value, description: description.value, dateModified: latest.value.from, mainEntityOfPage: canonicalUrl, author: { '@type': 'Organization', name: 'Cambio Uruguay' }, publisher: { '@type': 'Organization', name: 'Cambio Uruguay' } },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.nafta :deep(.v-table) { width: 100%; }
</style>
```
Comprobar contra `deuda-de-gastos-comunes-uruguay.vue` cómo se usa `VBreadcrumbs` allí y ajustar. Si `ClientOnly` + `LineChart` da problemas de SSR, mirar el workaround comentado en `app/pages/por-que-sube-el-dolar.vue:103`.

- [ ] **Step 7: Suite y lint**

Run (en `app/`): `npx vitest run tests/unit/fuelPrices.test.ts tests/unit/seoContract.test.ts tests/unit/pageContainer.test.ts` (siteNav-coverage va a fallar hasta la tarea 6: esperado) y `npm run lintfix`.

- [ ] **Step 8: Commit**

```bash
git add app/utils/fuelPrices.ts app/server/utils/combustiblesFallback.ts app/server/api/combustibles.get.ts app/pages/precio-de-la-nafta-uruguay.vue app/tests/unit/fuelPrices.test.ts
git commit -m "feat(app): /precio-de-la-nafta-uruguay con dato vivo e histórico de ANCAP"
```
Reportar a la integración: entrada `consumer` con `labelKey: 'nav.precioNafta'`, `icon: 'mdi-gas-station'`, `priority: 0.8`, `changefreq: 'weekly'`, `fresh: true` y las keywords del spec; textos i18n "Precio de la nafta" / "Fuel prices" / "Preço da gasolina".

---

### Task 3: Refresh de `/devolucion-fonasa-uruguay`

**Files:**
- Modify: `app/utils/fonasaRefund.ts`, `app/pages/devolucion-fonasa-uruguay.vue`, `app/tests/unit/fonasaRefund.test.ts`

**Interfaces:**
- Produces: `FONASA_CONSULTA`, `FONASA_COBRO`, `FONASA_ANTICIPO`, ejercicio 2025 en `FONASA_EXERCISES` (→ `LATEST_EXERCISE`).

- [ ] **Step 1: Tests nuevos (fallan)**

Agregar a `app/tests/unit/fonasaRefund.test.ts`:
```ts
import { CPE_MONTHLY, FONASA_ANTICIPO, FONASA_COBRO, FONASA_CONSULTA, FONASA_EXERCISES, FONASA_FAQ, FONASA_SOURCES, FONASA_VERIFIED_AT, LATEST_EXERCISE } from '../../utils/fonasaRefund'

describe('el ejercicio 2025 (se cobra en 2026)', () => {
  it('es el último y trae las cifras del BPS', () => {
    expect(LATEST_EXERCISE.year).toBe(2025)
    expect(LATEST_EXERCISE.paidFrom).toBe('2026-09-21')
    expect(LATEST_EXERCISE.people).toBe(152000)
    expect(LATEST_EXERCISE.totalPesos).toBe(8_676_000_000)
    expect(LATEST_EXERCISE.workerThreshold).toBe(122629)
    expect(LATEST_EXERCISE.retireeThreshold).toBe(132848)
  })
  it('los umbrales suben respecto de 2024 y los años van en orden', () => {
    const years = FONASA_EXERCISES.map(e => e.year)
    expect(years).toEqual([...years].sort((a, b) => a - b))
    const prev = FONASA_EXERCISES[FONASA_EXERCISES.length - 2]!
    expect(LATEST_EXERCISE.workerThreshold).toBeGreaterThan(prev.workerThreshold)
    expect(LATEST_EXERCISE.retireeThreshold).toBeGreaterThan(prev.retireeThreshold)
  })
})

describe('consulta, cobro y anticipo', () => {
  it('canales y fechas', () => {
    expect(FONASA_CONSULTA.web).toMatch(/^https:\/\/www\.bps\.gub\.uy\//)
    expect(FONASA_CONSULTA.phone).toBe('0800 2016')
    expect(FONASA_CONSULTA.whatsapp).toBe('092 366 272')
    expect(FONASA_CONSULTA.openedForRegistered < FONASA_CONSULTA.openedForAll).toBe(true)
    expect(FONASA_COBRO.chooseBy).toBe('2026-09-16')
    expect(FONASA_COBRO.depositOptions).toContain('Prex')
    expect(FONASA_COBRO.inPerson.length).toBeGreaterThanOrEqual(4)
  })
  it('el mínimo del anticipo es el 75 % del CPE', () => {
    expect(FONASA_ANTICIPO.minPctOfCpe).toBe(75)
    expect(FONASA_ANTICIPO.minMonthly).toBe(Math.round(CPE_MONTHLY * 0.75))
    expect(FONASA_ANTICIPO.url).toMatch(/^https:\/\//)
  })
  it('FAQ y fuentes crecieron con 2026', () => {
    expect(FONASA_FAQ.some(f => /cómo saber si tengo/i.test(f.q))).toBe(true)
    expect(FONASA_FAQ.some(f => /2026/.test(f.q))).toBe(true)
    expect(FONASA_SOURCES.some(s => s.url.includes('bps.gub.uy/10573'))).toBe(true)
    for (const s of FONASA_SOURCES) expect(s.url).toMatch(/^https:\/\//)
    expect(FONASA_VERIFIED_AT).toBe('2026-09-15')
  })
})
```
Ajustar los nombres de campos de `FONASA_FAQ` a los reales del archivo (`FonasaFaq` está en la línea 158: verificar si es `q/a` o `question/answer` y usar el que corresponda). Si algún test viejo asume que 2024 es el último ejercicio, actualizarlo.

- [ ] **Step 2: Correr (falla)**: `npx vitest run tests/unit/fonasaRefund.test.ts`.

- [ ] **Step 3: Datos**

En `app/utils/fonasaRefund.ts`:
- `FONASA_VERIFIED_AT = '2026-09-15'`.
- Agregar a `FONASA_EXERCISES` (después de 2024):
```ts
  {
    year: 2025,
    paidFrom: '2026-09-21',
    people: 152000,
    totalPesos: 8_676_000_000,
    workerThreshold: 122629,
    retireeThreshold: 132848,
  },
```
- Constantes nuevas (con comentario de fuente y fecha):
```ts
/** Cómo saber si estás comprendido en la devolución 2026 (BPS, verificado 2026-09-15). */
export const FONASA_CONSULTA = {
  web: 'https://www.bps.gub.uy/15053/',
  phone: '0800 2016',
  whatsapp: '092 366 272',
  whatsappUrl: 'https://wa.me/59892366272?text=FONASA',
  /** Usuarios registrados en BPS. */
  openedForRegistered: '2026-09-01',
  /** Toda la población. */
  openedForAll: '2026-09-07',
} as const

export const FONASA_COBRO = {
  /** Último día para elegir depósito en cuenta o dinero electrónico. */
  chooseBy: '2026-09-16',
  depositOptions: ['cuenta bancaria', 'MiDinero', 'DeAnda', 'Prex', 'OCA Blue'],
  depositWithin: '72 horas hábiles',
  inPerson: ['Abitab', 'Redpagos', 'ANDA', 'supermercados El Dorado', 'Tesorería del BPS (Colonia 1851, planta baja)'],
} as const

/** Anticipo mensual de FONASA de servicios personales (BPS, comunicado 6/2026). */
export const FONASA_ANTICIPO = {
  minPctOfCpe: 75,
  minMonthly: 5020,
  since: '2026-01-01',
  dueExample: 'la factura de los servicios de enero de 2026 venció el 24 de febrero',
  url: 'https://www.bps.gub.uy/9534/servicios-personales:-anticipo-fonasa.html',
} as const
```
- `FONASA_SOURCES`: agregar `{ label: 'BPS — Devolución Fonasa 2026', url: 'https://www.bps.gub.uy/10573/devolucion-fonasa.html' }`, `{ label: 'Presidencia — BPS habilitó la consulta de la devolución Fonasa 2026', url: 'https://www.gub.uy/presidencia/comunicacion/noticias/devolucion-fonasa-bps-consulta-2026' }`, `{ label: 'BPS — Servicios personales: anticipo Fonasa', url: 'https://www.bps.gub.uy/9534/servicios-personales:-anticipo-fonasa.html' }`.
- `FONASA_STEPS[1]` ("Consultás si te toca"): mencionar los tres canales y las fechas 1/9 y 7/9.
- `FONASA_FAQ`: cuatro preguntas nuevas al principio: "¿Cómo saber si tengo devolución de FONASA?" (los tres canales, dos fechas); "¿Cuándo es la devolución de FONASA 2026?" (desde el 21 de setiembre; depósito en 72 horas hábiles si se eligió antes del 16/9); "¿A quién le corresponde la devolución de FONASA?" (umbrales 122.629 / 132.848 nominales promedio mensual; excedente sobre el tope anual); "¿Qué pasa si no elegí cómo cobrar antes del 16 de setiembre?" (cobro presencial con cédula en Abitab, Redpagos, ANDA, El Dorado o Tesorería del BPS).

- [ ] **Step 4: Página**

En `app/pages/devolucion-fonasa-uruguay.vue`:
- `title = 'Devolución FONASA 2026: cuándo se cobra'` (39 caracteres). La descripción ya se arma con `latest`; agregar al final: `Consultá si estás comprendido en bps.gub.uy, ${FONASA_CONSULTA.phone} o WhatsApp ${FONASA_CONSULTA.whatsapp}.`. Eyebrow/OG: `subtitle: 'Se paga desde el 21 de setiembre de 2026'`.
- Bloque nuevo inmediatamente debajo del `<h1>` y el lead: `VCard` "¿Estás comprendido? Consultalo" con tres botones/enlaces (web `FONASA_CONSULTA.web`, `tel:08002016`, `FONASA_CONSULTA.whatsappUrl`) y una línea "Habilitado desde el 1.º de setiembre para usuarios registrados y desde el 7 para todo el mundo".
- Sección "Cómo se cobra" antes de la calculadora: dos columnas (depósito: opciones, plazo 16/9 y las 72 horas hábiles; presencial: la lista `inPerson` con cédula).
- Sección "Anticipo FONASA para servicios personales" después de la FAQ: quién (titulares de servicios personales no incluidos por otra actividad), mínimo `FONASA_ANTICIPO.minPctOfCpe` % del CPE = `formatMoney(FONASA_ANTICIPO.minMonthly)` desde enero de 2026, dónde se saca la factura (enlace `FONASA_ANTICIPO.url`), ejemplo de vencimiento.
- Keywords: agregar `devolucion fonasa 2026, como saber si tengo devolucion fonasa, consulta devolucion fonasa, a quien le corresponde devolucion fonasa, anticipo fonasa, anticipo fonasa servicios personales`.
- Si la página tiene un `FAQPage` hecho a mano en el `@graph` **además** de `<FaqSection>`/acordeón propio, dejar UNO solo (preferir `FaqSection expanded` y quitar el nodo manual).

- [ ] **Step 5: Verde y lint**

`npx vitest run tests/unit/fonasaRefund.test.ts tests/unit/seoContract.test.ts` → PASS; `npm run lintfix`.

- [ ] **Step 6: Commit**

```bash
git add app/utils/fonasaRefund.ts app/pages/devolucion-fonasa-uruguay.vue app/tests/unit/fonasaRefund.test.ts
git commit -m "feat(fonasa): devolución 2026 con consulta, cobro y anticipo"
```
Reportar a la integración las keywords nuevas para la entrada de `siteNav.ts`.

---

### Task 4: Guía `/guias/impuesto-temu-uruguay`

**Files:**
- Create: `app/utils/guidesImportacion.ts`
- Modify: `app/utils/guides.ts` (import + spread al final del array, junto a `...consumoGuides`), `app/utils/guideHubs.ts` (slug en `guideSlugs` del hub `importaciones-y-aduana-uruguay`, ~línea 111), `app/pages/franquicia-aduana-uruguay.vue` (un enlace "Impuesto Temu: qué es y cuánto pagás" en su bloque de seguir leyendo)
- Test: `app/tests/unit/guidesImportacion.test.ts`

**Interfaces:**
- Consumes: `Guide` de `./guides`; reglas y números ya publicados en `app/utils/aduanaFaq.ts` y `app/pages/franquicia-aduana-uruguay.vue` (leerlos antes de escribir: mínimo de IVA por paquete, US$ 800 en tres envíos, régimen general del 60 %).
- Produces: `importacionGuides: readonly Guide[]` con el slug `impuesto-temu-uruguay`.

- [ ] **Step 1: Test (falla)**

`app/tests/unit/guidesImportacion.test.ts`:
```ts
import { describe, expect, it } from 'vitest'

import { importacionGuides } from '../../utils/guidesImportacion'
import { getGuide } from '../../utils/guides'
import { hubOfGuide } from '../../utils/guideHubs'

describe('guía impuesto-temu-uruguay', () => {
  const g = importacionGuides.find(x => x.slug === 'impuesto-temu-uruguay')!
  it('existe, está en el índice y en el hub de importación', () => {
    expect(g).toBeDefined()
    expect(getGuide('impuesto-temu-uruguay')?.slug).toBe('impuesto-temu-uruguay')
    expect(hubOfGuide('impuesto-temu-uruguay')?.slug).toBe('importaciones-y-aduana-uruguay')
  })
  it('cumple los presupuestos de título, descripción, secciones, FAQ y fuentes', () => {
    expect(g.title.length).toBeLessThanOrEqual(60)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(190)
    expect(g.sections.length).toBeGreaterThanOrEqual(6)
    expect(g.sections.length).toBeLessThanOrEqual(9)
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(g.sources?.length ?? 0).toBeGreaterThanOrEqual(4)
    for (const s of g.sources ?? []) expect(s.url).toMatch(/^https:\/\//)
    expect(g.updatedAt).toBe('2026-09-15')
  })
  it('nombra los hechos que la gente busca', () => {
    const text = [g.title, g.description, ...g.sections.map(s => `${s.heading} ${s.body}`), ...(g.faqs ?? []).map(f => `${f.q} ${f.a}`)].join(' ')
    expect(text).toMatch(/Decreto 50\/026/)
    expect(text).toMatch(/1\.?º? de mayo de 2026/)
    expect(text).toMatch(/US\$ ?800/)
    expect(text).toMatch(/BFE Express/)
    expect(text).toMatch(/US\$ ?200/)
    expect(text).not.toMatch(/\*\*|^#|\n- /m)
  })
  it('enlaza la franquicia y los problemas con la aduana', () => {
    const tos = (g.related ?? []).map(r => r.to)
    expect(tos).toContain('/franquicia-aduana-uruguay')
    expect(tos).toContain('/problemas-con-la-aduana-uruguay')
  })
})
```

- [ ] **Step 2: Correr (falla)**: `npx vitest run tests/unit/guidesImportacion.test.ts`.

- [ ] **Step 3: Escribir la guía**

`app/utils/guidesImportacion.ts` con `import type { Guide } from './guides'` y `export const importacionGuides: readonly Guide[] = [ { … } ]`. Hechos obligatorios (verificados 2026-09-15) y estructura:

- `slug: 'impuesto-temu-uruguay'`, `title: 'Impuesto Temu: qué es y cuánto pagás'`, `tag: 'ADUANA'`, `updatedAt: '2026-09-15'`, `description` de 100–190 caracteres con "IVA 22 %", "desde el 1.º de mayo de 2026" y "US$ 800 en tres envíos".
- Secciones (prosa plana, sin markdown; una `table` en la sección 2):
  1. "Qué es el impuesto Temu y desde cuándo rige": Decreto 50/026; rige desde el 1.º de mayo de 2026; grava con IVA (22 %) las compras web del exterior que entran por el régimen de franquicia; el nombre es periodístico, no legal.
  2. "Cuánto pagás: tres ejemplos": tabla `headers: ['Compra', 'Origen', 'Qué pagás']` con tres filas coherentes con `aduanaFaq.ts` (paquete chico de China con el mínimo de IVA que el sitio ya publica; compra de US$ 150 desde China; compra de US$ 150 desde EE.UU. exenta por TIFA). Explicar que sobre US$ 800 anuales o más de tres envíos se sale de la franquicia y aplica el régimen general.
  3. "Cuándo no pagás": envíos desde EE.UU. de hasta US$ 200 por envío (TIFA Uruguay–EE.UU.); obsequios familiares que cumplen la definición de Aduanas; los dos consumen igual el cupo anual y el cupo de tres envíos.
  4. "La franquicia nueva: US$ 800 en tres envíos": persona física mayor de edad con cédula uruguaya, uso personal sin fin comercial, tope anual US$ 800 en hasta tres envíos por año civil (antes US$ 600 con tope de US$ 200 por envío); el operador postal informa cada envío a Aduana.
  5. "Cómo y cuándo se cobra": Temu, Shein o AliExpress no lo cobran al pagar; el operador postal o courier liquida el IVA ante Aduana y lo cobra antes de entregar; pagar con tarjeta a nombre del destinatario.
  6. "BFE Express: quién te entrega el pedido de Temu": es el operador logístico que aparece en el seguimiento de Temu para Uruguay; se rastrea desde la app de Temu o con el número de seguimiento en rastreadores como 17track; en redes se reportan demoras de más de un mes; si no llega en la fecha estimada Temu ofrece reembolso por artículo no recibido desde "Devolución/otra ayuda" y crédito por entrega tardía; si el paquete quedó en aduana, seguir la guía de problemas con la aduana (`links` de la sección hacia `/problemas-con-la-aduana-uruguay` y `/donde-te-entregan-el-paquete-uruguay`).
  7. "Shein y AliExpress pagan lo mismo": misma regla para cualquier origen sin acuerdo; comparar con comprar en EE.UU. (`links` a `/guias/comprar-en-amazon-desde-uruguay`).
  8. "Qué pasó con las compras": el propio Gobierno estimó la recaudación (El Observador, 28/7/2026) y las compras web al exterior cayeron por tercer mes consecutivo respecto de 2025 (El País, 20/8/2026); la franquicia más grande no compensó el IVA.
- `faqs` (≥ 5, `{ q, a }`): ¿Temu cobra el impuesto al comprar? (no; lo cobra el courier al entregar); ¿Cuánto es el impuesto Temu? (IVA 22 % sobre el valor, con el mínimo por paquete que publica el sitio); ¿Qué es BFE Express?; ¿Cuántas compras puedo hacer por año? (tres envíos, US$ 800); ¿Shein también paga?; ¿Conviene comprar en EE.UU.? (hasta US$ 200 por envío sin IVA).
- `sources`: IMPO Decreto 50/026 `https://www.impo.com.uy/bases/decretos-originales/50-2026`; Aduanas (nuevo régimen desde el 1.º de mayo) `https://www.aduanas.gub.uy/innovaportal/v/28455/1/innova.front/desde-el-1%C2%BA-de-mayo-comienza-a-regir-el-nuevo-regimen-de-franquicias-de-envios-postales-internacionales.html`; Ámbito `https://www.ambito.com/uruguay/comenzo-regir-el-impuesto-temu-cuales-son-las-claves-n6273075`; Telenoche `https://www.telenoche.com.uy/nacionales/desde-mayo-rige-el-impuesto-temu-compras-web-del-exterior-pagaran-iva-y-cambian-las-franquicias-n5394059`; 17track (BFE) `https://www.17track.net/en/carriers/bfe`.
- `related`: `/franquicia-aduana-uruguay`, `/guias/importar-de-aliexpress-a-uruguay`, `/guias/comprar-en-amazon-desde-uruguay`, `/problemas-con-la-aduana-uruguay`, `/donde-te-entregan-el-paquete-uruguay`, `/declarar-compra-exterior-uruguay`.
- Si el cuerpo nombra "calculadora de impuestos de importación", agregar `links: [{ label, to: '/herramientas/calculadora-impuestos-importacion' }]` en esa sección (regla `TOOL_MENTIONS`).

`app/utils/guides.ts`: `import { importacionGuides } from './guidesImportacion'` y `...importacionGuides,` al final del array. `app/utils/guideHubs.ts`: `'impuesto-temu-uruguay'` en `guideSlugs` del hub `importaciones-y-aduana-uruguay`. `app/pages/franquicia-aduana-uruguay.vue`: un enlace a `/guias/impuesto-temu-uruguay` con el texto "Impuesto Temu: qué es y cuánto pagás" en el bloque de seguir leyendo existente.

- [ ] **Step 4: Verde**

`npx vitest run tests/unit/guidesImportacion.test.ts tests/unit/guides.test.ts tests/unit/guideHubs.test.ts tests/unit/guidesRedditSep2026.test.ts` → PASS; `npm run lintfix`.

- [ ] **Step 5: Commit**

```bash
git add app/utils/guidesImportacion.ts app/utils/guides.ts app/utils/guideHubs.ts app/pages/franquicia-aduana-uruguay.vue app/tests/unit/guidesImportacion.test.ts
git commit -m "feat(guias): impuesto Temu y BFE Express"
```

---

### Task 5: `/elecciones-bps-2026`

**Files:**
- Create: `app/utils/bpsElections.ts`, `app/pages/elecciones-bps-2026.vue`
- Test: `app/tests/unit/bpsElections.test.ts`
- NO tocar `siteNav.ts` ni i18n (tarea 6).

**Interfaces:**
- Consumes: `currentIndicatorValue`, `indicatorFromSlug` de `~/utils/indicators`; `useApiService().getProcessedExchangeData('')`; `ExchangeRate` de `~/types/api`.
- Produces: `ELECTION_DATE`, `VOTERS`, `EXEMPT`, `FINES`, `CALENDAR`, `JUSTIFICATION_CAUSES`, `fineInPesos`, `BPS_ELECTIONS_FAQ`, `BPS_ELECTIONS_SOURCES`, `BPS_ELECTIONS_VERIFIED_AT`.

- [ ] **Step 1: Test (falla)**

`app/tests/unit/bpsElections.test.ts`:
```ts
import { describe, expect, it } from 'vitest'

import {
  BPS_ELECTIONS_FAQ,
  BPS_ELECTIONS_SOURCES,
  BPS_ELECTIONS_VERIFIED_AT,
  CALENDAR,
  ELECTION_DATE,
  EXEMPT,
  FINES,
  JUSTIFICATION_CAUSES,
  VOTERS,
  fineInPesos,
} from '../../utils/bpsElections'

describe('elecciones del BPS 2026', () => {
  it('fecha, calendario ordenado y verificación', () => {
    expect(ELECTION_DATE).toBe('2026-11-22')
    const dates = CALENDAR.map(c => c.from)
    expect(dates).toEqual([...dates].sort())
    expect(CALENDAR.some(c => c.from === '2026-11-23' && c.to === '2027-01-21')).toBe(true)
    expect(BPS_ELECTIONS_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('tres órdenes, dos exenciones, multas en UR', () => {
    expect(VOTERS.map(v => v.orden)).toEqual(['Trabajadores activos', 'Jubilados y pensionistas', 'Empresas'])
    expect(EXEMPT.length).toBe(2)
    expect(FINES.find(f => f.ur === 1)).toBeDefined()
    expect(FINES.find(f => f.ur === 2)).toBeDefined()
    expect(FINES.find(f => Array.isArray(f.ur) && f.ur.join() === '6,12,20')).toBeDefined()
  })
  it('fineInPesos redondea y no explota con basura', () => {
    expect(fineInPesos(1, 1921.36)).toBe(1921)
    expect(fineInPesos(2, 1921.36)).toBe(3843)
    expect(fineInPesos(1, null)).toBeNull()
    expect(fineInPesos(1, Number.NaN)).toBeNull()
    expect(fineInPesos(0, 1921.36)).toBeNull()
  })
  it('causales, FAQ y fuentes', () => {
    expect(JUSTIFICATION_CAUSES.length).toBeGreaterThanOrEqual(5)
    expect(BPS_ELECTIONS_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of BPS_ELECTIONS_FAQ) expect(f.answer.length).toBeGreaterThan(40)
    expect(BPS_ELECTIONS_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const s of BPS_ELECTIONS_SOURCES) expect(s.url).toMatch(/^https:\/\//)
  })
})
```

- [ ] **Step 2: Correr (falla)**: `npx vitest run tests/unit/bpsElections.test.ts`.

- [ ] **Step 3: `app/utils/bpsElections.ts`**

```ts
// Elecciones de directores sociales del BPS, 22 de noviembre de 2026. Todo verificado el
// 2026-09-15 contra el BPS y la Corte Electoral; la multa en pesos se calcula con la UR viva.
import type { FaqItem } from './faqAnswers'

export const BPS_ELECTIONS_VERIFIED_AT = '2026-09-15'
export const ELECTION_DATE = '2026-11-22'
export const WHAT_IS_ELECTED =
  'Tres representantes sociales del Directorio del BPS: uno por los trabajadores activos, uno por los jubilados y pensionistas y uno por las empresas contribuyentes. El voto es secreto, personal y obligatorio para quienes están en el padrón.'

export interface VoterOrder {
  orden: string
  who: string
  cutoff: string
  excluded: string[]
}

export const VOTERS: readonly VoterOrder[] = [
  {
    orden: 'Trabajadores activos',
    who: 'Mayores de 18 años con vínculo laboral dependiente activo o en actividad subsidiada al 28 de febrero de 2026 (si no cumplían ese día, se toma el 31 de julio de 2025).',
    cutoff: '2026-02-28',
    excluded: ['Afiliados a las cajas Civil, Bancaria, Notarial y Profesional'],
  },
  {
    orden: 'Jubilados y pensionistas',
    who: 'Jubilados, pensionistas por sobrevivencia e invalidez mayores de 18 años y pensionistas a la vejez, al 28 de febrero de 2026.',
    cutoff: '2026-02-28',
    excluded: ['Asistencia a la vejez', 'Pensiones especiales y graciables', 'Rentas del Banco de Seguros'],
  },
  {
    orden: 'Empresas',
    who: 'Empresas registradas y al día con sus obligaciones al 28 de febrero de 2026; votan por un mandatario (hasta diez empresas por mandatario, registro cerrado el 15 de junio de 2026).',
    cutoff: '2026-02-28',
    excluded: ['Afiliadas a las cajas Civil, Bancaria, Notarial y Profesional', 'Servicio doméstico', 'Construcción'],
  },
]

export const EXEMPT: readonly string[] = [
  'Mayores de 75 años (trabajadores, jubilados, pensionistas y titulares de empresas unipersonales)',
  'Titulares de prestaciones por incapacidad, sin importar la edad',
]

export interface Fine {
  who: string
  ur: number | readonly number[]
  note: string
}

export const FINES: readonly Fine[] = [
  { who: 'Trabajadores, jubilados y pensionistas', ur: 1, note: 'Misma multa que por no votar en las últimas elecciones nacionales.' },
  { who: 'Funcionarios públicos y profesionales con título de la UdelaR', ur: 2, note: 'Misma regla que en las elecciones nacionales.' },
  { who: 'Empresas', ur: [6, 12, 20], note: 'Según la cantidad de trabajadores dependientes, cualquiera sea la naturaleza jurídica.' },
]

export interface CalendarItem {
  from: string
  to?: string
  label: string
}

export const CALENDAR: readonly CalendarItem[] = [
  { from: '2026-02-28', label: 'Cierre del padrón' },
  { from: '2026-08-24', label: 'Publicación del padrón' },
  { from: '2026-08-26', to: '2026-09-14', label: 'Reclamos al padrón ante la Corte Electoral' },
  { from: '2026-09-22', label: 'Padrón definitivo y planes circuitales (dónde votás)' },
  { from: '2026-10-23', label: 'Cierre del registro de hojas de votación' },
  { from: '2026-11-22', label: 'Elección' },
  { from: '2026-11-23', to: '2027-01-21', label: 'Plazo para justificar el no voto' },
  { from: '2026-11-24', label: 'Escrutinio definitivo' },
  { from: '2027-02-01', to: '2027-05-04', label: 'Control del voto obligatorio y multas' },
]

export const JUSTIFICATION_CAUSES: readonly string[] = [
  'Enfermedad, invalidez o imposibilidad física',
  'Razones de fuerza mayor',
  'Estar fuera del país el día de la elección',
  'Residir en un departamento distinto al del circuito asignado',
  'Ser mayor de 75 años o titular de una prestación por incapacidad (no hace falta justificar)',
]

export function fineInPesos(ur: number, urValue: number | null | undefined): number | null {
  if (!Number.isFinite(ur) || ur <= 0 || urValue == null || !Number.isFinite(urValue) || urValue <= 0) return null
  return Math.round(ur * urValue)
}

export interface BpsSource {
  label: string
  url: string
}

export const BPS_ELECTIONS_SOURCES: readonly BpsSource[] = [
  { label: 'BPS — Elecciones de Directores Sociales, noviembre 2026', url: 'https://www.bps.gub.uy/24184/elecciones-de-directores-sociales-del-bps---noviembre-2026.html' },
  { label: 'BPS — Elecciones de Directores Sociales 2026 (padrón y consultas)', url: 'https://www.bps.gub.uy/24209/elecciones-de-directores-sociales-2026.html' },
  { label: 'Corte Electoral — Calendario electoral, elecciones BPS 2026', url: 'https://www.gub.uy/corte-electoral/comunicacion/publicaciones/calendario-electoral-elecciones-bps-2026' },
  { label: 'Presidencia — Las elecciones del BPS serán el 22 de noviembre', url: 'https://www.gub.uy/presidencia/comunicacion/noticias/elecciones-bps-cuando-son-mayo-2026' },
  { label: 'El Observador — Cuándo se vota, quiénes están obligados y cuánto sale la multa', url: 'https://www.elobservador.com.uy/nacional/elecciones-obligatorias-bps-2026-cuando-se-vota-quienes-estan-obligados-y-cuanto-sale-la-multa-no-hacerlo-n6054566' },
  { label: 'Montevideo Portal — Quiénes votan, cómo consultar el padrón y las multas', url: 'https://www.montevideo.com.uy/Noticias/Elecciones-del-BPS-2026-quienes-votan-como-consultar-el-padron-y-cuales-son-las-multas-uc973797' },
]

export const BPS_ELECTIONS_FAQ: readonly FaqItem[] = [
  { id: 'cuando-son', question: '¿Cuándo son las elecciones del BPS 2026?', answer: 'El domingo 22 de noviembre de 2026. Se eligen los tres representantes sociales del Directorio del BPS: trabajadores, jubilados y pensionistas, y empresas.' },
  { id: 'son-obligatorias', question: '¿Es obligatorio votar en las elecciones del BPS?', answer: 'Sí, para quienes figuran en el padrón: trabajadores dependientes mayores de 18, jubilados y pensionistas, y empresas contribuyentes. No están obligados los mayores de 75 años ni quienes cobran una prestación por incapacidad.' },
  { id: 'cuanto-es-la-multa', question: '¿Cuánto es la multa por no votar?', answer: 'Para trabajadores, jubilados y pensionistas es la misma que por no votar en las elecciones nacionales: 1 unidad reajustable (2 UR para funcionarios públicos y profesionales con título de la UdelaR). Para las empresas, 6, 12 o 20 UR según la cantidad de trabajadores. El valor en pesos depende de la UR vigente el día del cobro.' },
  { id: 'donde-voto', question: '¿Dónde voto y cómo consulto el padrón?', answer: 'El padrón se consulta en el sitio del BPS con la cédula. El plan circuital, con el lugar de votación, se publica desde el 22 de setiembre de 2026 por la Corte Electoral.' },
  { id: 'como-justifico', question: '¿Cómo justifico si no pude votar?', answer: 'Entre el 23 de noviembre de 2026 y el 21 de enero de 2027, ante la Corte Electoral, con la causal documentada: enfermedad, invalidez, fuerza mayor, estar fuera del país o residir en otro departamento.' },
  { id: 'jubilados-votan', question: '¿Los jubilados tienen que votar?', answer: 'Sí, si tienen menos de 75 años y cobran jubilación, pensión por sobrevivencia o invalidez, o pensión a la vejez. Quedan fuera del padrón las asistencias a la vejez, las pensiones especiales y graciables y las rentas del Banco de Seguros.' },
  { id: 'empresa-mandatario', question: '¿Cómo vota una empresa?', answer: 'Por medio de un mandatario registrado ante el BPS (el registro cerró el 15 de junio de 2026; cada mandatario puede representar hasta diez empresas). Si no designó mandatario o este no vota, la multa es de 6, 12 o 20 UR.' },
]
```

- [ ] **Step 4: La página**

`app/pages/elecciones-bps-2026.vue`, misma estructura que la página de nafta (VContainer, breadcrumbs, un `<h1>` "Elecciones del BPS 2026: quién vota y cuánto es la multa", FaqSection, fuentes, seguir leyendo). Script clave:
```ts
import { computed } from 'vue'
import type { ExchangeRate } from '~/types/api'
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'
import { BPS_ELECTIONS_FAQ, BPS_ELECTIONS_SOURCES, BPS_ELECTIONS_VERIFIED_AT, CALENDAR, ELECTION_DATE, EXEMPT, FINES, JUSTIFICATION_CAUSES, VOTERS, WHAT_IS_ELECTED, fineInPesos } from '~/utils/bpsElections'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()
const ur = indicatorFromSlug('unidad-reajustable')!
// Igual que /indicadores/[indicador]: el número en pesos SÓLO si la UR vino viva; null → sólo UR.
const { data: urValue } = await useAsyncData('elecciones-bps-ur', async () => {
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  return currentIndicatorValue(rows, ur)
})
const pesos = (n: number | readonly number[]) =>
  Array.isArray(n) ? n.map(x => fineInPesos(x, urValue.value)) : [fineInPesos(n as number, urValue.value)]
const fmt = (n: number | null) => (n == null ? null : n.toLocaleString('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }))
const daysLeft = computed(() => Math.ceil((Date.parse(`${ELECTION_DATE}T12:00:00-03:00`) - Date.now()) / 86_400_000))
const faq = BPS_ELECTIONS_FAQ
const canonicalUrl = 'https://cambio-uruguay.com/elecciones-bps-2026'
const title = 'Elecciones del BPS 2026: quién vota y la multa'
const description = computed(() => {
  const one = fmt(fineInPesos(1, urValue.value))
  return `Domingo 22 de noviembre de 2026, voto obligatorio para trabajadores, jubilados y empresas; exentos los mayores de 75 y las prestaciones por incapacidad. Multa de 1 UR${one ? ` (hoy ${one})` : ''}, 2 UR para públicos y profesionales, 6 a 20 UR para empresas. Cómo justificar hasta el 21 de enero de 2027.`
})
```
Template: tarjeta de fecha con `daysLeft` (sólo en `ClientOnly` para no desajustar la hidratación); "¿Tengo que votar?" con una `VCard` por `VOTERS`; lista `EXEMPT`; **"La multa en pesos, hoy"**: `VTable` con `FINES` y, si `urValue` no es null, la columna en pesos (`fmt`), si es null, un aviso con enlace a `/indicadores/unidad-reajustable`; calendario (`CALENDAR`, `VTimeline` o tabla); "Cómo justificar" (`JUSTIFICATION_CAUSES` + plazo); enlaces a BPS y Corte Electoral; `FaqSection expanded`; fuentes; seguir leyendo: `/indicadores/unidad-reajustable`, `/devolucion-fonasa-uruguay`, `/cuando-me-puedo-jubilar-uruguay`, `/asignacion-familiar-uruguay`.
SEO: `defineOgImageComponent('Cambio', { title: 'Elecciones del BPS 2026', subtitle: 'Domingo 22 de noviembre · voto obligatorio', tag: 'BPS' })`; `useSeoMeta` como en nafta; `useHead` con canonical, keywords (`elecciones bps, elecciones bps 2026, elecciones bps obligatorias, multa por no votar bps, elecciones bps circuitos, padron elecciones bps, quienes votan elecciones bps, justificar no voto bps`) y `@graph` con `BreadcrumbList`, `Article` y `Event` (`name: 'Elecciones de directores sociales del BPS 2026'`, `startDate: '2026-11-22'`, `eventStatus: 'https://schema.org/EventScheduled'`, `location: { '@type': 'Country', name: 'Uruguay' }`, `organizer: { '@type': 'GovernmentOrganization', name: 'Banco de Previsión Social' }`).

- [ ] **Step 5: Verde y lint**

`npx vitest run tests/unit/bpsElections.test.ts tests/unit/seoContract.test.ts tests/unit/pageContainer.test.ts` → PASS; `npm run lintfix`.

- [ ] **Step 6: Commit**

```bash
git add app/utils/bpsElections.ts app/pages/elecciones-bps-2026.vue app/tests/unit/bpsElections.test.ts
git commit -m "feat(app): /elecciones-bps-2026 con la multa en pesos por UR viva"
```
Reportar a la integración: entrada `invest` junto a FONASA con `labelKey: 'nav.eleccionesBps'`, `icon: 'mdi-vote'`, `priority: 0.7`, `changefreq: 'weekly'`, `fresh: true`, keywords del spec; i18n "Elecciones del BPS 2026" / "BPS elections 2026" / "Eleições do BPS 2026".

---

### Task 6: Integración, suites completas y deploy

**Files:**
- Modify: `app/utils/siteNav.ts` (sección `consumer` ~línea 2820 junto a `/impuesto-autos-electricos-uruguay`; sección `invest` ~línea 1851 junto a `/devolucion-fonasa-uruguay`; keywords de FONASA), `app/i18n/locales/json/es.json`, `en.json`, `pt.json` (objeto `nav`), `app/utils/relatedPages.ts` (opcional: `CURATED` para las dos páginas nuevas)
- Test: suites completas.

- [ ] **Step 1: siteNav**

En `consumer`, después de la entrada de `/impuesto-autos-electricos-uruguay`:
```ts
      {
        // Trends UY 2026-09-15: "nafta" es el 23 % del volumen de "dólar", con picos cada fin de
        // mes ("cuánto sube la nafta", "cuándo sube"). Era el único tema de costos sin página.
        to: '/precio-de-la-nafta-uruguay',
        labelKey: 'nav.precioNafta',
        icon: 'mdi-gas-station',
        priority: 0.8,
        changefreq: 'weekly',
        fresh: true,
        keywords: ['nafta', 'precio nafta', 'precio de la nafta hoy', 'nafta super precio', 'nafta premium precio', 'precio gasoil', 'precio supergas', 'cuanto sube la nafta', 'cuando sube la nafta', 'precio combustibles uruguay', 'ancap precios'],
      },
```
En `invest`, después de la entrada de `/devolucion-fonasa-uruguay`:
```ts
      {
        // Elección del 22/11/2026: "elecciones bps 2026 son obligatorias" y "multa por no votar"
        // eran breakout en Trends; el sitio tiene la UR viva y puede dar la multa en pesos.
        to: '/elecciones-bps-2026',
        labelKey: 'nav.eleccionesBps',
        icon: 'mdi-vote',
        priority: 0.7,
        changefreq: 'weekly',
        fresh: true,
        keywords: ['elecciones bps', 'elecciones bps 2026', 'elecciones bps obligatorias', 'multa por no votar bps', 'elecciones bps circuitos', 'padron elecciones bps', 'quienes votan elecciones bps', 'justificar no voto bps'],
      },
```
Keywords de FONASA: agregar `'devolucion fonasa 2026', 'como saber si tengo devolucion fonasa', 'consulta devolucion fonasa', 'a quien le corresponde devolucion fonasa', 'anticipo fonasa', 'anticipo fonasa servicios personales'`.

- [ ] **Step 2: i18n** (sin `|`): en el objeto `nav` de los tres JSON: `"precioNafta": "Precio de la nafta"` / `"Fuel prices"` / `"Preço da gasolina"` y `"eleccionesBps": "Elecciones del BPS 2026"` / `"BPS elections 2026"` / `"Eleições do BPS 2026"`.

- [ ] **Step 3: Suites completas**

En `app/`: `npm run test:unit` y `npm run lint`. En la raíz: `npm test` (incluye `tests/combustibles/baseline_parity.test.ts`, que ahora encuentra el fallback). Todo verde antes de seguir.

- [ ] **Step 4: Commit y push**

```bash
git add app/utils/siteNav.ts app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json tests/combustibles/baseline_parity.test.ts
git commit -m "feat(nav): registrar nafta y elecciones BPS; paridad del baseline de combustibles"
git push origin main
```

- [ ] **Step 5: Verificar en producción** (después de que corran `deploy` y `backend-deploy` en Actions)

```bash
curl -s https://cambio-uruguay.com/precio-de-la-nafta-uruguay | grep -o "<title>[^<]*"
curl -s https://cambio-uruguay.com/devolucion-fonasa-uruguay | grep -o "<title>[^<]*"
curl -s https://cambio-uruguay.com/guias/impuesto-temu-uruguay | grep -o "<title>[^<]*"
curl -s https://cambio-uruguay.com/elecciones-bps-2026 | grep -o "<title>[^<]*"
curl -s https://api.cambio-uruguay.com/combustibles | head -c 400
ssh -p 2223 root@104.234.204.107 "cd /root/cambio-uruguay && pm2 describe currency-combustibles | grep -E 'status|cron' && node dist/sync_combustibles.js"
curl -s https://cambio-uruguay.com/api/combustibles | head -c 300
```
Esperado: los cuatro títulos con los textos del plan (el de nafta con `$ 88,67`), `/combustibles` con 53 filas y `asOf` no nulo después de correr el job a mano.
