# Seguimiento de precios (alquileres, viviendas, autos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A daily price series per market cohort ("cada producto") for rentals, homes for sale and used cars, with a composition-free "misma oferta" variation, served by three explorer pages and a block on each car-model page.

**Architecture:** A new backend job (`sync_market_series.ts`) reads the three PUBLIC catalogues already in the APP DB (never the harvesters), keeps a private per-advert price-change log, and upserts one series document per cohort plus one index document per market. The Nuxt app reads those two collections through two endpoints and renders them with one shared `MarketSeriesExplorer` component.

**Tech Stack:** TypeScript 4.9 + mongoose 6 (root, CommonJS, vitest), Nuxt 4 + Vuetify 4 + Chart.js (app, vitest).

**Spec:** `docs/superpowers/specs/2026-09-18-seguimiento-de-precios-design.md`

## Global Constraints

- Currencies are never mixed nor converted: currency is part of every cohort key.
- Level stats publish only with `n ≥ 8` (`MARKET_SAMPLE_MINIMUM`); pair stats only with `pairs ≥ 8` (`MARKET_PAIR_MINIMUM`).
- Pair band `[0.5, 2]`; "bajó/subió" threshold ±0.5 % (`MARKET_CHANGE_EPSILON = 0.005`); windows 7, 30, 90 days.
- Private log: change points only, max 40 per advert, pruned after 120 days unseen. Series: max 1.100 points.
- Thin run: a market whose observations fall under 60 % of the previous run writes nothing and the job exits 1.
- pm2 app `currency-market-series`, `cron_restart: "3 13 * * *"`, `autorestart: false`, listed in `OTHER_APPS`.
- Root tests never import `app/`; app tests read root files as text for parity.
- Vuetify components must be registered in `app/plugins/vuetify.ts` (all used here already are). Pages are Spanish-only; nav labels in es/en/pt.
- SEO titles ≤ 43 chars (the `seoTitleBudget` test adds " | Cambio Uruguay").
- Work only in the worktree `C:\Users\airau\Documents\GitHub\cu-market-series` (branch `feat/market-series`).

---

### Task 1: Types, cohorts and statistics (pure)

**Files:**
- Create: `classes/marketseries/types.ts`, `classes/marketseries/cohorts.ts`, `classes/marketseries/stats.ts`
- Test: `tests/marketseries/cohorts.test.ts`, `tests/marketseries/stats.test.ts`

**Interfaces:**
- Produces: all types in `types.ts`; `marketSlug(value)`, `bedroomBucket(n)`, `MARKET_SERIES_KEY_PATTERN`, `housingCohorts(obs)`, `carCohorts(obs)`, `cohortsOf(obs)`, `cohortLabel(dims, labels)`; `quantile`, `levelStats(prices)`, `medianStats(values)`, `pairStats(ratios)`, constants `MARKET_SAMPLE_MINIMUM`, `MARKET_PAIR_MINIMUM`, `MARKET_PAIR_BAND`, `MARKET_CHANGE_EPSILON`, `MARKET_WINDOWS`.

- [ ] **Step 1: Write the failing tests**

`tests/marketseries/fixtures.ts`:

```ts
import type { MarketObservation } from "../../classes/marketseries/types";

export function observation(overrides: Partial<MarketObservation> = {}): MarketObservation {
  return {
    vertical: "alquiler", advertId: "infocasas:1", groupKey: "prop-1", price: 30000, currency: "UYU",
    seenAt: "2026-09-18", seenDay: "2026-09-18", areaBuilt: null, department: "Montevideo",
    neighborhood: "Pocitos", propertyType: "apartamento", bedrooms: 2, marketSlug: null, brand: null,
    model: null, year: null, ...overrides,
  };
}

export function car(overrides: Partial<MarketObservation> = {}): MarketObservation {
  return observation({
    vertical: "autos", advertId: "ml-1", groupKey: "ml-1", price: 15000, currency: "USD", seenAt: "2026-09-18T10:00:00.000Z",
    department: null, neighborhood: null, propertyType: null, bedrooms: null, marketSlug: "toyota-hilux",
    brand: "Toyota", model: "Hilux", year: 2018, ...overrides,
  });
}
```

`tests/marketseries/cohorts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { bedroomBucket, carCohorts, cohortLabel, housingCohorts, marketSlug, MARKET_SERIES_KEY_PATTERN } from "../../classes/marketseries/cohorts";
import { car, observation } from "./fixtures";

describe("marketSlug", () => {
  it("folds accents, case and spacing and nothing else", () => {
    expect(marketSlug("Paysandú")).toBe("paysandu");
    expect(marketSlug("  Punta del  Este ")).toBe("punta-del-este");
    expect(marketSlug("Cordón Sur")).toBe("cordon-sur");
    expect(marketSlug("¡!")).toBe("");
  });
});

describe("bedroomBucket", () => {
  it("keeps 0-3, groups 4 or more, and refuses what is not a count", () => {
    expect([0, 1, 2, 3, 4, 7].map(bedroomBucket)).toEqual(["0", "1", "2", "3", "4plus", "4plus"]);
    expect([null, -1, 1.5, 21].map(bedroomBucket)).toEqual([null, null, null, null]);
  });
});

describe("housingCohorts", () => {
  it("puts a 2-bedroom flat in 12 cohorts: 3 scopes x 2 types x 2 bedroom buckets", () => {
    const keys = housingCohorts(observation()).map(cohort => cohort.key);
    expect(keys).toHaveLength(12);
    expect(keys).toContain("alquiler|UYU|apartamento|2|b:montevideo:pocitos");
    expect(keys).toContain("alquiler|UYU|todas|any|uy");
    expect(keys).toContain("alquiler|UYU|todas|any|d:montevideo");
    for (const key of keys) expect(key).toMatch(MARKET_SERIES_KEY_PATTERN);
  });

  it("an unknown bedroom count only reaches the 'any' bucket", () => {
    const keys = housingCohorts(observation({ bedrooms: null })).map(cohort => cohort.key);
    expect(keys).toHaveLength(6);
    expect(keys.every(key => key.split("|")[3] === "any")).toBe(true);
  });

  it("without a neighborhood there is no neighborhood scope", () => {
    const keys = housingCohorts(observation({ neighborhood: null })).map(cohort => cohort.key);
    expect(keys).toHaveLength(8);
    expect(keys.some(key => key.includes("|b:"))).toBe(false);
  });

  it("currency is part of the key: a dollar rent is its own cohort", () => {
    expect(housingCohorts(observation({ currency: "USD" }))[0]!.key.startsWith("alquiler|USD|")).toBe(true);
  });
});

describe("carCohorts", () => {
  it("all cars, the model, and the model-year", () => {
    expect(carCohorts(car()).map(cohort => cohort.key)).toEqual([
      "autos|USD|all", "autos|USD|m:toyota-hilux", "autos|USD|m:toyota-hilux|y:2018",
    ]);
  });
  it("a car priced in pesos or without a model forms no cohort", () => {
    expect(carCohorts(car({ currency: "UYU" }))).toEqual([]);
    expect(carCohorts(car({ marketSlug: null }))).toEqual([]);
  });
});

describe("cohortLabel", () => {
  const none = { department: null, neighborhood: null, brand: null, model: null };
  it("reads like a place or a car", () => {
    const [uy, dep, bar] = [housingCohorts(observation())[0]!, housingCohorts(observation())[4]!, housingCohorts(observation())[8]!];
    expect(cohortLabel(uy.dims, none)).toBe("Uruguay");
    expect(cohortLabel(dep.dims, { ...none, department: "Montevideo" })).toBe("Montevideo");
    expect(cohortLabel(bar.dims, { ...none, department: "Montevideo", neighborhood: "Pocitos" })).toBe("Pocitos, Montevideo");
    const [all, model, year] = carCohorts(car());
    expect(cohortLabel(all!.dims, none)).toBe("Todos los autos");
    expect(cohortLabel(model!.dims, { ...none, brand: "Toyota", model: "Hilux" })).toBe("Toyota Hilux");
    expect(cohortLabel(year!.dims, { ...none, brand: "Toyota", model: "Hilux" })).toBe("Toyota Hilux 2018");
  });
});
```

`tests/marketseries/stats.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { levelStats, medianStats, pairStats, quantile } from "../../classes/marketseries/stats";

describe("quantile", () => {
  it("interpolates linearly between (n-1)p positions", () => {
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
    expect(quantile([10], 0.5)).toBe(10);
  });
});

describe("levelStats", () => {
  it("keeps the count but publishes nothing under 8", () => {
    expect(levelStats([1, 2, 3, 4, 5, 6, 7])).toEqual({ n: 7, p25: null, med: null, p75: null });
  });
  it("p25 / median / p75 from 8 on, order-independent", () => {
    expect(levelStats([8, 1, 7, 2, 6, 3, 5, 4])).toEqual({ n: 8, p25: 2.75, med: 4.5, p75: 6.25 });
  });
});

describe("medianStats", () => {
  it("same minimum as the level", () => {
    expect(medianStats([1, 2, 3])).toEqual({ n: 3, med: null });
    expect(medianStats([1, 2, 3, 4, 5, 6, 7, 8])).toEqual({ n: 8, med: 4.5 });
  });
});

describe("pairStats", () => {
  it("nobody repriced: zero change, all 'same'", () => {
    expect(pairStats(Array(8).fill(1))).toEqual({ n: 8, chg: 0, down: 0, up: 0, same: 8, outliers: 0 });
  });
  it("everyone down 10 %: -10 %", () => {
    expect(pairStats(Array(8).fill(0.9))).toMatchObject({ n: 8, chg: -0.1, down: 8 });
  });
  it("geometric mean: -20 % and +25 % cancel out", () => {
    expect(pairStats([0.8, 1.25, 0.8, 1.25, 0.8, 1.25, 0.8, 1.25]).chg).toBe(0);
  });
  it("a pair outside [0.5, 2] is a typo, counted apart", () => {
    expect(pairStats([...Array(8).fill(1), 3, 0.4])).toMatchObject({ n: 8, outliers: 2, chg: 0 });
  });
  it("under 8 pairs the change is withheld but the counts stay", () => {
    expect(pairStats([0.9, 0.9])).toEqual({ n: 2, chg: null, down: 2, up: 0, same: 0, outliers: 0 });
  });
  it("a rounding is not a move: +/-0.5 % threshold", () => {
    expect(pairStats([1.004, 0.996, 1.006, 0.994])).toMatchObject({ same: 2, up: 1, down: 1 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/marketseries`
Expected: FAIL — cannot resolve `../../classes/marketseries/cohorts`.

- [ ] **Step 3: Implement**

`classes/marketseries/types.ts`:

```ts
// Seguimiento de precios de mercado: alquileres, viviendas en venta y autos usados. Una serie diaria
// por cohorte ("cada producto") con dos medidas que NO son lo mismo: el nivel (p25/mediana/p75 de lo
// que se pide hoy, sensible a qué avisos entran y salen) y la variación de la misma oferta (el mismo
// aviso contra su propio precio de hace 7/30/90 días, que no depende de la composición).
// Diseño: docs/superpowers/specs/2026-09-18-seguimiento-de-precios-design.md.
//
// Espejo público en app/utils/marketSeries.ts (la app no importa la raíz); la paridad de las
// constantes la vigila app/tests/unit/marketSeries.test.ts leyendo este directorio como texto.

export const MARKET_VERTICALS = ["alquiler", "venta", "autos"] as const;
export type MarketVertical = (typeof MARKET_VERTICALS)[number];
export type MarketCurrency = "UYU" | "USD";
export type MarketPropertyType = "apartamento" | "casa";
export type MarketTypeBucket = MarketPropertyType | "todas";
export type MarketBedrooms = "any" | "0" | "1" | "2" | "3" | "4plus";
export type MarketScope = "uy" | "department" | "neighborhood" | "all" | "model" | "year";
export type MarketWindow = 7 | 30 | 90;

/** One advert in today's public catalogue, already validated by that catalogue's own rules. */
export interface MarketObservation {
  vertical: MarketVertical;
  /** Stable per advert across runs. */
  advertId: string;
  /** Unit of the level: the rental PROPERTY (several portals, one home); the advert elsewhere. */
  groupKey: string;
  price: number;
  currency: MarketCurrency;
  /** The catalogue's own lastSeen, raw (day or ISO): picks the representative. */
  seenAt: string;
  /** YYYY-MM-DD of seenAt: the day this price was actually observed. */
  seenDay: string;
  areaBuilt: number | null;
  department: string | null;
  neighborhood: string | null;
  propertyType: MarketPropertyType | null;
  bedrooms: number | null;
  marketSlug: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
}

export interface MarketPricePoint {
  d: string;
  p: number;
  c: MarketCurrency;
}

/** Private change log of one advert: a point only when its price or currency changes. */
export interface MarketPriceLog {
  key: string;
  vertical: MarketVertical;
  advertId: string;
  /** First day THIS job saw the advert — not the portal's publication date. */
  firstSeen: string;
  lastSeen: string;
  points: MarketPricePoint[];
}

export interface MarketPairStats {
  /** Pairs inside the plausibility band. */
  n: number;
  /** Geometric mean of price_today / price_then, minus 1. Null under MARKET_PAIR_MINIMUM. */
  chg: number | null;
  down: number;
  up: number;
  same: number;
  /** Pairs outside [0.5, 2]: a typo or a unit change, never a repricing. */
  outliers: number;
}

export interface MarketSeriesPoint {
  d: string;
  n: number;
  p25: number | null;
  med: number | null;
  p75: number | null;
  /** Housing only: asking price per built square metre. */
  m2: { n: number; med: number | null } | null;
  w7: MarketPairStats | null;
  w30: MarketPairStats | null;
  w90: MarketPairStats | null;
}

export interface MarketCohortDims {
  vertical: MarketVertical;
  currency: MarketCurrency;
  scope: MarketScope;
  propertyType: MarketTypeBucket | null;
  bedrooms: MarketBedrooms | null;
  departmentSlug: string | null;
  neighborhoodSlug: string | null;
  marketSlug: string | null;
  year: number | null;
}

export interface MarketCohort {
  key: string;
  dims: MarketCohortDims;
}

export interface MarketCohortLabels {
  department: string | null;
  neighborhood: string | null;
  brand: string | null;
  model: string | null;
}

export interface MarketSeriesEntry {
  cohort: MarketCohort;
  labels: MarketCohortLabels;
  label: string;
  point: MarketSeriesPoint;
}

/** Stored in `marketseries`, one per cohort. */
export interface MarketSeriesDoc {
  key: string;
  vertical: MarketVertical;
  dims: MarketCohortDims;
  labels: MarketCohortLabels;
  label: string;
  latest: MarketSeriesPoint;
  updatedAt: string;
  points: MarketSeriesPoint[];
}

export interface MarketIndexScope {
  token: string;
  scope: "uy" | "department" | "neighborhood";
  department: string | null;
  neighborhood: string | null;
  label: string;
  n: Partial<Record<MarketCurrency, number>>;
}

export interface MarketIndexModel {
  slug: string;
  brand: string;
  model: string;
  n: number;
  med: number | null;
  w30: number | null;
}

export interface MarketMover {
  key: string;
  label: string;
  currency: MarketCurrency;
  window: MarketWindow;
  chg: number;
  pairs: number;
  down: number;
  up: number;
}

/** Stored in `marketseriesmetas` as `index:<vertical>`: everything the page's selectors need. */
export interface MarketSeriesIndex {
  key: string;
  vertical: MarketVertical;
  day: string;
  generatedAt: string;
  dataAsOf: string;
  trackingSince: string;
  observations: number;
  cohorts: number;
  excluded: Record<string, number>;
  scopes: MarketIndexScope[];
  models: MarketIndexModel[];
  movers: { window: MarketWindow | null; down: MarketMover[]; up: MarketMover[] };
}
```

`classes/marketseries/cohorts.ts`:

```ts
// Qué cohortes ("productos") alimenta un aviso. La moneda es parte de la clave: un alquiler en
// dólares de Punta del Este es otra serie, nunca se convierte (convertir movería la serie con el
// dólar, no con el precio). Espejo del patrón en app/utils/marketSeries.ts.
import type {
  MarketBedrooms, MarketCohort, MarketCohortDims, MarketCohortLabels, MarketObservation, MarketTypeBucket,
} from "./types";

/** Accents, case and spacing are the only equivalences (the rule of propertyzones/market.ts). */
export const marketSlug = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

export function bedroomBucket(value: number | null): Exclude<MarketBedrooms, "any"> | null {
  if (value === null || !Number.isInteger(value) || value < 0 || value > 20) return null;
  return value >= 4 ? "4plus" : (String(value) as "0" | "1" | "2" | "3");
}

export const MARKET_SERIES_KEY_PATTERN =
  /^(?:(?:alquiler|venta)\|(?:UYU|USD)\|(?:apartamento|casa|todas)\|(?:any|0|1|2|3|4plus)\|(?:uy|d:[a-z0-9-]{1,80}|b:[a-z0-9-]{1,80}:[a-z0-9-]{1,80})|autos\|USD\|(?:all|m:[a-z0-9-]{1,80}(?:\|y:\d{4})?))$/;

const EMPTY = { propertyType: null, bedrooms: null, departmentSlug: null, neighborhoodSlug: null, marketSlug: null, year: null };

type ScopePart = Pick<MarketCohortDims, "scope" | "departmentSlug" | "neighborhoodSlug"> & { token: string };

export function housingCohorts(obs: MarketObservation): MarketCohort[] {
  if (obs.vertical === "autos" || !obs.propertyType || !obs.department) return [];
  const department = marketSlug(obs.department);
  if (!department) return [];
  const neighborhood = obs.neighborhood ? marketSlug(obs.neighborhood) : "";
  const scopes: ScopePart[] = [
    { scope: "uy", token: "uy", departmentSlug: null, neighborhoodSlug: null },
    { scope: "department", token: `d:${department}`, departmentSlug: department, neighborhoodSlug: null },
  ];
  if (neighborhood)
    scopes.push({ scope: "neighborhood", token: `b:${department}:${neighborhood}`, departmentSlug: department, neighborhoodSlug: neighborhood });
  const types: MarketTypeBucket[] = [obs.propertyType, "todas"];
  const bucket = bedroomBucket(obs.bedrooms);
  const beds: MarketBedrooms[] = bucket ? ["any", bucket] : ["any"];
  const cohorts: MarketCohort[] = [];
  for (const { token, ...scope } of scopes)
    for (const propertyType of types)
      for (const bedrooms of beds)
        cohorts.push({
          key: `${obs.vertical}|${obs.currency}|${propertyType}|${bedrooms}|${token}`,
          dims: { ...EMPTY, vertical: obs.vertical, currency: obs.currency, ...scope, propertyType, bedrooms },
        });
  return cohorts;
}

export function carCohorts(obs: MarketObservation): MarketCohort[] {
  if (obs.vertical !== "autos" || obs.currency !== "USD" || !obs.marketSlug) return [];
  const base = { ...EMPTY, vertical: "autos" as const, currency: "USD" as const };
  const cohorts: MarketCohort[] = [
    { key: "autos|USD|all", dims: { ...base, scope: "all" } },
    { key: `autos|USD|m:${obs.marketSlug}`, dims: { ...base, scope: "model", marketSlug: obs.marketSlug } },
  ];
  if (obs.year !== null)
    cohorts.push({ key: `autos|USD|m:${obs.marketSlug}|y:${obs.year}`, dims: { ...base, scope: "year", marketSlug: obs.marketSlug, year: obs.year } });
  return cohorts;
}

export const cohortsOf = (obs: MarketObservation): MarketCohort[] =>
  obs.vertical === "autos" ? carCohorts(obs) : housingCohorts(obs);

export function cohortLabel(dims: MarketCohortDims, labels: MarketCohortLabels): string {
  if (dims.vertical === "autos") {
    if (dims.scope === "all") return "Todos los autos";
    const name = [labels.brand, labels.model].filter(Boolean).join(" ") || dims.marketSlug || "";
    return dims.scope === "year" && dims.year ? `${name} ${dims.year}` : name;
  }
  if (dims.scope === "neighborhood")
    return `${labels.neighborhood ?? dims.neighborhoodSlug}, ${labels.department ?? dims.departmentSlug}`;
  if (dims.scope === "department") return labels.department ?? dims.departmentSlug ?? "";
  return "Uruguay";
}
```

`classes/marketseries/stats.ts`:

```ts
// Las dos medidas. El nivel es p25/mediana/p75 de precios pedidos (cuantiles con interpolación lineal
// en (n-1)p, los mismos de propertyzones/market.ts). La misma oferta es la media GEOMÉTRICA de
// precio_hoy / precio_entonces: -20 % y +25 % se anulan, como tiene que ser con razones.

export const MARKET_SAMPLE_MINIMUM = 8;
export const MARKET_PAIR_MINIMUM = 8;
/** A same-advert ratio outside this band is a typo or a unit change, not a repricing. */
export const MARKET_PAIR_BAND = { min: 0.5, max: 2 } as const;
/** Under +/-0.5 % a pair counts as unchanged: a rounding is not a move. */
export const MARKET_CHANGE_EPSILON = 0.005;
export const MARKET_WINDOWS = [7, 30, 90] as const;

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function quantile(sorted: readonly number[], p: number): number {
  const position = (sorted.length - 1) * p;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (position - low);
}

export function levelStats(prices: readonly number[]): { n: number; p25: number | null; med: number | null; p75: number | null } {
  const sorted = [...prices].sort((a, b) => a - b);
  if (sorted.length < MARKET_SAMPLE_MINIMUM) return { n: sorted.length, p25: null, med: null, p75: null };
  return { n: sorted.length, p25: round2(quantile(sorted, 0.25)), med: round2(quantile(sorted, 0.5)), p75: round2(quantile(sorted, 0.75)) };
}

export function medianStats(values: readonly number[]): { n: number; med: number | null } {
  const sorted = [...values].sort((a, b) => a - b);
  return { n: sorted.length, med: sorted.length >= MARKET_SAMPLE_MINIMUM ? round2(quantile(sorted, 0.5)) : null };
}

export function pairStats(ratios: readonly number[]): {
  n: number; chg: number | null; down: number; up: number; same: number; outliers: number;
} {
  let n = 0, down = 0, up = 0, same = 0, outliers = 0, logSum = 0;
  for (const ratio of ratios) {
    if (!Number.isFinite(ratio) || ratio < MARKET_PAIR_BAND.min || ratio > MARKET_PAIR_BAND.max) {
      outliers++;
      continue;
    }
    n++;
    logSum += Math.log(ratio);
    if (ratio < 1 - MARKET_CHANGE_EPSILON) down++;
    else if (ratio > 1 + MARKET_CHANGE_EPSILON) up++;
    else same++;
  }
  const chg = n >= MARKET_PAIR_MINIMUM ? Math.round((Math.exp(logSum / n) - 1) * 10_000) / 10_000 : null;
  return { n, chg: chg === 0 ? 0 : chg, down, up, same, outliers };
}
```

(`chg === 0 ? 0 : chg` turns `-0` into `0` so `toEqual({chg: 0})` holds.)

- [ ] **Step 4: Run tests** — `npx vitest run tests/marketseries` → PASS.
- [ ] **Step 5: Commit** — `git add classes/marketseries tests/marketseries && git commit -m "feat(precios): cohortes y estadisticas del seguimiento de precios"`

---

### Task 2: Change log and the day's build (pure)

**Files:**
- Create: `classes/marketseries/log.ts`, `classes/marketseries/build.ts`
- Test: `tests/marketseries/log.test.ts`, `tests/marketseries/build.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `MARKET_LOG_MAX_POINTS = 40`, `MARKET_LOG_RETENTION_DAYS = 120`, `shiftDay(day, days)`, `marketLogKey(vertical, advertId)`, `priceAt(log, day)`, `nextLog(log, obs)` (returns the SAME object when nothing changed), `marketLogPruneFilter(vertical, today)`; `preferredName(counts)`, `buildMarketDay({vertical, today, observations, logs}) → { entries: MarketSeriesEntry[]; logs: MarketPriceLog[]; adverts: number; groups: number }`.

- [ ] **Step 1: Write the failing tests**

`tests/marketseries/log.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { marketLogPruneFilter, nextLog, priceAt, shiftDay } from "../../classes/marketseries/log";
import type { MarketPriceLog } from "../../classes/marketseries/types";
import { observation } from "./fixtures";

const first = nextLog(undefined, observation({ seenDay: "2026-09-01", price: 100 }));

describe("nextLog", () => {
  it("starts a log on the day of the catalogue's own observation", () => {
    expect(first).toEqual({ key: "alquiler:infocasas:1", vertical: "alquiler", advertId: "infocasas:1", firstSeen: "2026-09-01", lastSeen: "2026-09-01", points: [{ d: "2026-09-01", p: 100, c: "UYU" }] });
  });
  it("same price another day: only lastSeen moves", () => {
    const next = nextLog(first, observation({ seenDay: "2026-09-05", price: 100 }));
    expect(next.lastSeen).toBe("2026-09-05");
    expect(next.points).toHaveLength(1);
  });
  it("a new price appends a point; a new currency too", () => {
    const priced = nextLog(first, observation({ seenDay: "2026-09-05", price: 90 }));
    expect(priced.points.map(point => point.p)).toEqual([100, 90]);
    const dollars = nextLog(priced, observation({ seenDay: "2026-09-06", price: 90, currency: "USD" }));
    expect(dollars.points.at(-1)).toEqual({ d: "2026-09-06", p: 90, c: "USD" });
  });
  it("a second price the same day replaces that day's point", () => {
    const priced = nextLog(first, observation({ seenDay: "2026-09-05", price: 90 }));
    expect(nextLog(priced, observation({ seenDay: "2026-09-05", price: 95 })).points.map(point => point.p)).toEqual([100, 95]);
  });
  it("nothing new returns the very same object (so it is not rewritten)", () => {
    expect(nextLog(first, observation({ seenDay: "2026-09-01", price: 100 }))).toBe(first);
    expect(nextLog(first, observation({ seenDay: "2026-08-30", price: 80 }))).toBe(first);
  });
  it("keeps the newest 40 points", () => {
    let log: MarketPriceLog = first;
    for (let day = 2; day <= 60; day++) log = nextLog(log, observation({ seenDay: shiftDay("2026-09-01", day), price: 100 + day }));
    expect(log.points).toHaveLength(40);
    expect(log.points.at(-1)!.p).toBe(160);
  });
});

describe("priceAt", () => {
  const log = nextLog(nextLog(first, observation({ seenDay: "2026-09-10", price: 90 })), observation({ seenDay: "2026-09-20", price: 80 }));
  it("returns the price in force that day", () => {
    expect(priceAt(log, "2026-09-01")!.p).toBe(100);
    expect(priceAt(log, "2026-09-15")!.p).toBe(90);
    expect(priceAt(log, "2026-09-25")!.p).toBe(80);
  });
  it("before we first saw it there is no price", () => {
    expect(priceAt(log, "2026-08-31")).toBeNull();
    expect(priceAt(undefined, "2026-09-15")).toBeNull();
  });
  it("a day older than the oldest kept point has no price either", () => {
    expect(priceAt({ ...log, points: log.points.slice(1) }, "2026-09-05")).toBeNull();
  });
});

describe("marketLogPruneFilter", () => {
  it("120 days unseen, one vertical at a time", () => {
    expect(marketLogPruneFilter("autos", "2026-09-18")).toEqual({ vertical: "autos", lastSeen: { $lt: "2026-05-21" } });
  });
});
```

`tests/marketseries/build.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildMarketDay, preferredName } from "../../classes/marketseries/build";
import { marketLogKey } from "../../classes/marketseries/log";
import type { MarketObservation, MarketPriceLog } from "../../classes/marketseries/types";
import { car, observation } from "./fixtures";

const TODAY = "2026-09-18";
const flats = (count: number, extra: (i: number) => Partial<MarketObservation> = () => ({})): MarketObservation[] =>
  Array.from({ length: count }, (_, i) => observation({ advertId: `infocasas:${i}`, groupKey: `prop-${i}`, price: 20000 + i * 1000, ...extra(i) }));
const entry = (day: ReturnType<typeof buildMarketDay>, key: string) => day.entries.find(item => item.cohort.key === key);

describe("buildMarketDay: level", () => {
  it("publishes a cohort from 8 homes on, with its labels", () => {
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations: flats(8), logs: new Map() });
    const pocitos = entry(day, "alquiler|UYU|apartamento|2|b:montevideo:pocitos")!;
    expect(pocitos.point).toMatchObject({ d: TODAY, n: 8, med: 23500, p25: 21750, p75: 25250, w7: null, w30: null, w90: null });
    expect(pocitos.label).toBe("Pocitos, Montevideo");
  });
  it("7 homes publish nothing", () => {
    expect(buildMarketDay({ vertical: "alquiler", today: TODAY, observations: flats(7), logs: new Map() }).entries).toEqual([]);
  });
  it("one home is one observation: the freshest offer represents it, never the cheapest", () => {
    const observations = [
      ...flats(8),
      observation({ advertId: "mercadolibre:x", groupKey: "prop-0", price: 1000, seenAt: "2026-09-10", seenDay: "2026-09-10" }),
    ];
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations, logs: new Map() });
    expect(entry(day, "alquiler|UYU|todas|any|uy")!.point.n).toBe(8);
    expect(entry(day, "alquiler|UYU|todas|any|uy")!.point.p25).toBe(21750);
    expect(day.groups).toBe(8);
    expect(day.adverts).toBe(9);
  });
  it("price per built m2 only from explicit built area, cars never", () => {
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations: flats(8, () => ({ areaBuilt: 50 })), logs: new Map() });
    expect(entry(day, "alquiler|UYU|todas|any|uy")!.point.m2).toEqual({ n: 8, med: 470 });
    const cars = buildMarketDay({ vertical: "autos", today: TODAY, observations: Array.from({ length: 8 }, (_, i) => car({ advertId: `ml-${i}`, groupKey: `ml-${i}` })), logs: new Map() });
    expect(entry(cars, "autos|USD|all")!.point.m2).toBeNull();
  });
});

describe("buildMarketDay: misma oferta", () => {
  const logsAt = (price: number, currency: "UYU" | "USD" = "UYU"): Map<string, MarketPriceLog> =>
    new Map(Array.from({ length: 8 }, (_, i) => {
      const key = marketLogKey("alquiler", `infocasas:${i}`);
      return [key, { key, vertical: "alquiler" as const, advertId: `infocasas:${i}`, firstSeen: "2026-06-01", lastSeen: "2026-09-17", points: [{ d: "2026-06-01", p: price, c: currency }] }];
    }));

  it("each advert against its own price 7/30/90 days ago", () => {
    const observations = flats(8, () => ({ price: 90 }));
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations, logs: logsAt(100) });
    const uy = entry(day, "alquiler|UYU|todas|any|uy")!.point;
    expect(uy.w7).toMatchObject({ n: 8, chg: -0.1, down: 8 });
    expect(uy.w30).toMatchObject({ n: 8, chg: -0.1 });
    expect(uy.w90).toMatchObject({ n: 8, chg: -0.1 });
  });
  it("never pairs across currencies", () => {
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations: flats(8, () => ({ price: 90 })), logs: logsAt(100, "USD") });
    expect(entry(day, "alquiler|UYU|todas|any|uy")!.point.w30).toBeNull();
  });
  it("a cohort with 4 homes but 8 repriced adverts still publishes its pairs", () => {
    const observations = flats(8, i => ({ groupKey: `prop-${i % 4}`, price: 90 }));
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations, logs: logsAt(100) });
    const uy = entry(day, "alquiler|UYU|todas|any|uy")!.point;
    expect(uy.n).toBe(4);
    expect(uy.med).toBeNull();
    expect(uy.w30!.n).toBe(8);
  });
  it("returns only the logs that changed", () => {
    const observations = flats(8, i => ({ price: i === 0 ? 90 : 100, seenDay: "2026-09-17" }));
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations, logs: logsAt(100) });
    expect(day.logs.map(log => log.advertId)).toEqual(["infocasas:0"]);
  });
});

describe("preferredName", () => {
  it("most frequent spelling; a tie goes to the accented one", () => {
    expect(preferredName(new Map([["Paysandu", 1], ["Paysandú", 1]]))).toBe("Paysandú");
    expect(preferredName(new Map([["Paysandu", 3], ["Paysandú", 1]]))).toBe("Paysandu");
    expect(preferredName(new Map())).toBeNull();
  });
});
```

(Check of the m2 median: prices 20000..27000 / 50 → 400..540, median 470.)

- [ ] **Step 2: Run** — `npx vitest run tests/marketseries` → FAIL (missing modules).

- [ ] **Step 3: Implement**

`classes/marketseries/log.ts`:

```ts
// El historial PRIVADO de cada aviso: un punto sólo cuando cambia su precio o su moneda. Es lo que
// permite la medida de "misma oferta": el precio de hoy contra el propio precio de hace W días.
// Nunca se sirve campo a campo; la página sólo ve agregados.
import type { MarketObservation, MarketPriceLog, MarketPricePoint, MarketVertical } from "./types";

export const MARKET_LOG_MAX_POINTS = 40;
export const MARKET_LOG_RETENTION_DAYS = 120;

export const shiftDay = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);

export const marketLogKey = (vertical: MarketVertical, advertId: string): string => `${vertical}:${advertId}`;

/** The price in force on `day`, or null when we did not know the advert yet. */
export function priceAt(log: MarketPriceLog | undefined, day: string): MarketPricePoint | null {
  if (!log || log.firstSeen > day) return null;
  let found: MarketPricePoint | null = null;
  for (const point of log.points) {
    if (point.d > day) break;
    found = point;
  }
  return found;
}

/**
 * The log after today's observation. The observation's day is the catalogue's own lastSeen: a row the
 * harvester did not re-read today adds nothing. Returns the SAME object when nothing changed, so the
 * caller writes only what moved.
 */
export function nextLog(existing: MarketPriceLog | undefined, obs: MarketObservation): MarketPriceLog {
  const point: MarketPricePoint = { d: obs.seenDay, p: obs.price, c: obs.currency };
  if (!existing)
    return { key: marketLogKey(obs.vertical, obs.advertId), vertical: obs.vertical, advertId: obs.advertId, firstSeen: obs.seenDay, lastSeen: obs.seenDay, points: [point] };
  if (obs.seenDay < existing.lastSeen) return existing;
  const last = existing.points[existing.points.length - 1];
  const samePrice = !!last && last.p === point.p && last.c === point.c;
  if (samePrice && obs.seenDay === existing.lastSeen) return existing;
  const points = samePrice
    ? existing.points
    : (last && last.d === point.d ? [...existing.points.slice(0, -1), point] : [...existing.points, point]).slice(-MARKET_LOG_MAX_POINTS);
  return { ...existing, lastSeen: obs.seenDay, points };
}

export function marketLogPruneFilter(vertical: MarketVertical, today: string, days: number = MARKET_LOG_RETENTION_DAYS): {
  vertical: MarketVertical; lastSeen: { $lt: string };
} {
  return { vertical, lastSeen: { $lt: shiftDay(today, -days) } };
}
```

`classes/marketseries/build.ts`:

```ts
// El día de un mercado: nivel por cohorte (una observación por vivienda o aviso) y "misma oferta"
// (cada aviso contra su propio log de ANTES de hoy). Puro: sin base, testeable.
import { cohortLabel, cohortsOf } from "./cohorts";
import { marketLogKey, nextLog, priceAt, shiftDay } from "./log";
import { levelStats, medianStats, pairStats, MARKET_PAIR_MINIMUM, MARKET_SAMPLE_MINIMUM, MARKET_WINDOWS } from "./stats";
import type {
  MarketCohort, MarketCohortLabels, MarketObservation, MarketPairStats, MarketPriceLog, MarketSeriesEntry, MarketVertical, MarketWindow,
} from "./types";

interface Accumulator {
  cohort: MarketCohort;
  prices: number[];
  m2: number[];
  pairs: Record<MarketWindow, number[]>;
  names: Record<keyof MarketCohortLabels, Map<string, number>>;
}

/** Freshest observation wins; same instant, the lowest id (stable, and never "the cheapest"). */
const newer = (a: MarketObservation, b: MarketObservation): boolean =>
  a.seenAt > b.seenAt || (a.seenAt === b.seenAt && a.advertId < b.advertId);

/** Most frequent spelling; a tie goes to the accented one ("Paysandú" over "Paysandu"), then A-Z. */
export function preferredName(counts: ReadonlyMap<string, number>): string | null {
  let best: string | null = null;
  let bestCount = -1;
  let bestMarks = -1;
  for (const [name, count] of counts) {
    const marks = name.normalize("NFD").length - name.normalize("NFC").length;
    if (count > bestCount || (count === bestCount && (marks > bestMarks || (marks === bestMarks && best !== null && name < best)))) {
      best = name;
      bestCount = count;
      bestMarks = marks;
    }
  }
  return best;
}

export interface MarketDayInput {
  vertical: MarketVertical;
  today: string;
  observations: readonly MarketObservation[];
  /** Keyed by `marketLogKey`, as they were BEFORE today. */
  logs: ReadonlyMap<string, MarketPriceLog>;
}

export interface MarketDay {
  entries: MarketSeriesEntry[];
  /** Only new or changed logs. */
  logs: MarketPriceLog[];
  adverts: number;
  groups: number;
}

export function buildMarketDay(input: MarketDayInput): MarketDay {
  const adverts = new Map<string, MarketObservation>();
  for (const obs of input.observations) {
    if (obs.vertical !== input.vertical) continue;
    const existing = adverts.get(obs.advertId);
    if (!existing || newer(obs, existing)) adverts.set(obs.advertId, obs);
  }
  const groups = new Map<string, MarketObservation>();
  for (const obs of adverts.values()) {
    const existing = groups.get(obs.groupKey);
    if (!existing || newer(obs, existing)) groups.set(obs.groupKey, obs);
  }

  const accumulators = new Map<string, Accumulator>();
  const accumulator = (cohort: MarketCohort): Accumulator => {
    let acc = accumulators.get(cohort.key);
    if (!acc) {
      acc = { cohort, prices: [], m2: [], pairs: { 7: [], 30: [], 90: [] }, names: { department: new Map(), neighborhood: new Map(), brand: new Map(), model: new Map() } };
      accumulators.set(cohort.key, acc);
    }
    return acc;
  };
  const tally = (map: Map<string, number>, value: string | null): void => {
    if (value) map.set(value, (map.get(value) ?? 0) + 1);
  };

  for (const obs of groups.values()) {
    for (const cohort of cohortsOf(obs)) {
      const acc = accumulator(cohort);
      acc.prices.push(obs.price);
      if (obs.vertical !== "autos" && obs.areaBuilt) acc.m2.push(obs.price / obs.areaBuilt);
      tally(acc.names.department, obs.department);
      tally(acc.names.neighborhood, obs.neighborhood);
      tally(acc.names.brand, obs.brand);
      tally(acc.names.model, obs.model);
    }
  }

  const changed: MarketPriceLog[] = [];
  for (const obs of adverts.values()) {
    const log = input.logs.get(marketLogKey(obs.vertical, obs.advertId));
    const cohorts = cohortsOf(obs);
    for (const window of MARKET_WINDOWS) {
      const then = priceAt(log, shiftDay(input.today, -window));
      if (!then || then.c !== obs.currency || !(then.p > 0)) continue;
      for (const cohort of cohorts) accumulator(cohort).pairs[window].push(obs.price / then.p);
    }
    const next = nextLog(log, obs);
    if (next !== log) changed.push(next);
  }

  const entries: MarketSeriesEntry[] = [];
  const ordered = [...accumulators.values()].sort((a, b) => (a.cohort.key < b.cohort.key ? -1 : a.cohort.key > b.cohort.key ? 1 : 0));
  for (const acc of ordered) {
    const level = levelStats(acc.prices);
    const windows = {} as Record<MarketWindow, MarketPairStats | null>;
    for (const window of MARKET_WINDOWS) windows[window] = acc.pairs[window].length ? pairStats(acc.pairs[window]) : null;
    const pairsPublishable = MARKET_WINDOWS.some(window => (windows[window]?.n ?? 0) >= MARKET_PAIR_MINIMUM);
    if (level.n < MARKET_SAMPLE_MINIMUM && !pairsPublishable) continue;
    const labels: MarketCohortLabels = {
      department: preferredName(acc.names.department),
      neighborhood: preferredName(acc.names.neighborhood),
      brand: preferredName(acc.names.brand),
      model: preferredName(acc.names.model),
    };
    entries.push({
      cohort: acc.cohort,
      labels,
      label: cohortLabel(acc.cohort.dims, labels),
      point: { d: input.today, ...level, m2: input.vertical === "autos" ? null : medianStats(acc.m2), w7: windows[7], w30: windows[30], w90: windows[90] },
    });
  }
  return { entries, logs: changed, adverts: adverts.size, groups: groups.size };
}
```

- [ ] **Step 4: Run** — `npx vitest run tests/marketseries` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(precios): historial por aviso y el dia de cada mercado"`

---

### Task 3: Index for the page (pure)

**Files:**
- Create: `classes/marketseries/index.ts`
- Test: `tests/marketseries/index.test.ts`

**Interfaces:**
- Consumes: `MarketSeriesEntry`, `MarketSeriesIndex` (Task 1), `buildMarketDay` (Task 2, in tests).
- Produces: `MARKET_MOVER_MIN_PAIRS = 20`, `MARKET_MOVERS_PER_SIDE = 8`, `buildMarketIndex(input: MarketIndexInput): MarketSeriesIndex` where `MarketIndexInput = { vertical; today; generatedAt; dataAsOf; previous: MarketSeriesIndex | null; entries: readonly MarketSeriesEntry[]; observations: number; excluded: Record<string, number> }`.

- [ ] **Step 1: Failing test** `tests/marketseries/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildMarketIndex } from "../../classes/marketseries/index";
import type { MarketPairStats, MarketSeriesEntry } from "../../classes/marketseries/types";
import { housingCohorts, carCohorts } from "../../classes/marketseries/cohorts";
import { car, observation } from "./fixtures";

const pairs = (chg: number, n = 25): MarketPairStats => ({ n, chg, down: chg < 0 ? n : 0, up: chg > 0 ? n : 0, same: 0, outliers: 0 });
const point = (n: number, w30: MarketPairStats | null = null, w7: MarketPairStats | null = null) =>
  ({ d: "2026-09-18", n, p25: 1, med: 2, p75: 3, m2: null, w7, w30, w90: null });
const labels = { department: "Montevideo", neighborhood: "Pocitos", brand: null, model: null };
const base = { vertical: "alquiler" as const, today: "2026-09-18", generatedAt: "2026-09-18T13:03:00.000Z", dataAsOf: "2026-09-18T05:00:00.000Z", previous: null, observations: 100, excluded: {} };

function housing(neighborhood: string | null, n: number, w30: MarketPairStats | null = null, w7: MarketPairStats | null = null): MarketSeriesEntry[] {
  return housingCohorts(observation({ neighborhood })).filter(c => c.dims.propertyType === "todas" && c.dims.bedrooms === "any")
    .map(cohort => ({ cohort, labels: { ...labels, neighborhood }, label: cohort.dims.scope === "neighborhood" ? `${neighborhood}, Montevideo` : cohort.dims.scope === "department" ? "Montevideo" : "Uruguay", point: point(n, w30, w7) }));
}

describe("buildMarketIndex", () => {
  it("lists the scopes the selectors can offer, country first, with n per currency", () => {
    const index = buildMarketIndex({ ...base, entries: housing("Pocitos", 40) });
    expect(index.scopes.map(scope => scope.token)).toEqual(["uy", "d:montevideo", "b:montevideo:pocitos"]);
    expect(index.scopes[0]).toMatchObject({ label: "Uruguay", department: null, n: { UYU: 40 } });
    expect(index.key).toBe("index:alquiler");
    expect(index.trackingSince).toBe("2026-09-18");
  });

  it("keeps the first tracking day across runs", () => {
    const previous = buildMarketIndex({ ...base, today: "2026-09-01", entries: [] });
    expect(buildMarketIndex({ ...base, previous, entries: [] }).trackingSince).toBe("2026-09-01");
  });

  it("movers use 30 days when there are enough pairs, never the country row", () => {
    const entries = [...housing("Pocitos", 40, pairs(-0.05)), ...housing("Centro", 40, pairs(0.03)).filter(e => e.cohort.dims.scope === "neighborhood")];
    const index = buildMarketIndex({ ...base, entries });
    expect(index.movers.window).toBe(30);
    expect(index.movers.down.map(mover => mover.label)).toEqual(["Montevideo", "Pocitos, Montevideo"].sort((a, b) => a.localeCompare(b)).slice(0, 2).length ? index.movers.down.map(m => m.label) : []);
    expect(index.movers.down.every(mover => mover.chg < 0)).toBe(true);
    expect(index.movers.up.map(mover => mover.label)).toEqual(["Centro, Montevideo"]);
    expect([...index.movers.down, ...index.movers.up].some(mover => mover.key.endsWith("|uy"))).toBe(false);
  });

  it("falls back to 7 days, then to nothing, and ignores thin pairs", () => {
    expect(buildMarketIndex({ ...base, entries: housing("Pocitos", 40, null, pairs(-0.02)) }).movers.window).toBe(7);
    expect(buildMarketIndex({ ...base, entries: housing("Pocitos", 40, pairs(-0.02, 10)) }).movers).toEqual({ window: null, down: [], up: [] });
  });

  it("cars: one row per model for the model picker", () => {
    const entries = carCohorts(car()).map(cohort => ({ cohort, labels: { department: null, neighborhood: null, brand: "Toyota", model: "Hilux" }, label: "x", point: point(30) }));
    const index = buildMarketIndex({ ...base, vertical: "autos", entries });
    expect(index.models).toEqual([{ slug: "toyota-hilux", brand: "Toyota", model: "Hilux", n: 30, med: 2, w30: null }]);
    expect(index.scopes).toEqual([]);
  });
});
```

Simplify the down-labels assertion when implementing: expect `index.movers.down.map(m => m.label).sort()` toEqual `["Montevideo", "Pocitos, Montevideo"]`.

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `classes/marketseries/index.ts`:

```ts
// El documento `index:<mercado>` que lee la página: qué zonas o modelos tienen serie hoy (para los
// selectores) y los mayores movimientos de "misma oferta". El nivel no entra en "movimientos": un
// cambio de mediana puede ser sólo que cambió la mezcla de avisos.
import type {
  MarketCurrency, MarketIndexModel, MarketIndexScope, MarketMover, MarketPairStats, MarketSeriesEntry, MarketSeriesIndex, MarketVertical, MarketWindow,
} from "./types";

export const MARKET_MOVER_MIN_PAIRS = 20;
export const MARKET_MOVERS_PER_SIDE = 8;

export interface MarketIndexInput {
  vertical: MarketVertical;
  today: string;
  generatedAt: string;
  dataAsOf: string;
  previous: MarketSeriesIndex | null;
  entries: readonly MarketSeriesEntry[];
  observations: number;
  excluded: Record<string, number>;
}

const collator = new Intl.Collator("es", { sensitivity: "base" });

export function buildMarketIndex(input: MarketIndexInput): MarketSeriesIndex {
  const trackingSince = input.previous?.trackingSince && input.previous.trackingSince < input.today ? input.previous.trackingSince : input.today;
  const scopes = new Map<string, MarketIndexScope>();
  const models: MarketIndexModel[] = [];
  const pool: MarketSeriesEntry[] = [];

  for (const entry of input.entries) {
    const { dims } = entry.cohort;
    if (dims.vertical === "autos") {
      if (dims.scope === "model" && dims.marketSlug) {
        models.push({ slug: dims.marketSlug, brand: entry.labels.brand ?? dims.marketSlug, model: entry.labels.model ?? "", n: entry.point.n, med: entry.point.med, w30: entry.point.w30?.chg ?? null });
        pool.push(entry);
      }
      continue;
    }
    if (dims.propertyType !== "todas" || dims.bedrooms !== "any") continue;
    if (dims.scope !== "uy" && dims.scope !== "department" && dims.scope !== "neighborhood") continue;
    const token = entry.cohort.key.split("|")[4]!;
    const scope = scopes.get(token) ?? {
      token,
      scope: dims.scope,
      department: dims.scope === "uy" ? null : entry.labels.department,
      neighborhood: dims.scope === "neighborhood" ? entry.labels.neighborhood : null,
      label: entry.label,
      n: {},
    };
    scope.n[dims.currency as MarketCurrency] = entry.point.n;
    scopes.set(token, scope);
    if (dims.scope !== "uy") pool.push(entry);
  }

  const rank = (scope: MarketIndexScope): number => (scope.scope === "uy" ? 0 : 1);
  const sortedScopes = [...scopes.values()].sort((a, b) =>
    rank(a) - rank(b) ||
    collator.compare(a.department ?? "", b.department ?? "") ||
    (a.scope === "department" ? 0 : 1) - (b.scope === "department" ? 0 : 1) ||
    collator.compare(a.neighborhood ?? "", b.neighborhood ?? ""));
  models.sort((a, b) => collator.compare(a.brand, b.brand) || collator.compare(a.model, b.model));

  let window: MarketWindow | null = null;
  let candidates: Array<{ entry: MarketSeriesEntry; stats: MarketPairStats & { chg: number } }> = [];
  for (const option of [30, 7] as const) {
    const found = pool
      .map(entry => ({ entry, stats: entry.point[`w${option}`] }))
      .filter((row): row is { entry: MarketSeriesEntry; stats: MarketPairStats & { chg: number } } =>
        !!row.stats && row.stats.chg !== null && row.stats.n >= MARKET_MOVER_MIN_PAIRS);
    if (found.length) {
      window = option;
      candidates = found;
      break;
    }
  }
  const mover = ({ entry, stats }: (typeof candidates)[number]): MarketMover => ({
    key: entry.cohort.key, label: entry.label, currency: entry.cohort.dims.currency, window: window!, chg: stats.chg, pairs: stats.n, down: stats.down, up: stats.up,
  });
  const byKey = (a: (typeof candidates)[number], b: (typeof candidates)[number]): number => (a.entry.cohort.key < b.entry.cohort.key ? -1 : 1);
  const down = candidates.filter(row => row.stats.chg < 0).sort((a, b) => a.stats.chg - b.stats.chg || byKey(a, b)).slice(0, MARKET_MOVERS_PER_SIDE).map(mover);
  const up = candidates.filter(row => row.stats.chg > 0).sort((a, b) => b.stats.chg - a.stats.chg || byKey(a, b)).slice(0, MARKET_MOVERS_PER_SIDE).map(mover);

  return {
    key: `index:${input.vertical}`,
    vertical: input.vertical,
    day: input.today,
    generatedAt: input.generatedAt,
    dataAsOf: input.dataAsOf,
    trackingSince,
    observations: input.observations,
    cohorts: input.entries.length,
    excluded: input.excluded,
    scopes: sortedScopes,
    models,
    movers: { window, down, up },
  };
}
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(precios): indice de zonas, modelos y movimientos`.

---

### Task 4: Reading the three public catalogues

**Files:**
- Create: `classes/marketseries/sources.ts`
- Test: `tests/marketseries/sources.test.ts`

**Interfaces:**
- Consumes: `ZONE_RENTAL_PROJECTION`, `projectZoneObservations` from `classes/propertyzones/project.ts`; `RentalZoneMarketObservation` from `classes/propertyzones/market.ts`; `appConnection` from `classes/appdb.ts`; `shiftDay` (Task 2).
- Produces: `freshSeen(value, now, days): string | null`; mappers returning `MarketObservation | string` (a string is the exclusion reason): `rentalObservation(o, now)`, `saleObservation(row, now, freshDays)`, `carObservation(row, now, freshDays)`; readers `readRentals(now)`, `readSales(now)`, `readCars(now)` → `Promise<MarketRead>` with `MarketRead = { observations: MarketObservation[]; excluded: Record<string, number>; dataAsOf: string }`; `MARKET_READERS: Record<MarketVertical, (now: Date) => Promise<MarketRead>>`.

- [ ] **Step 1: Failing test** `tests/marketseries/sources.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { carObservation, freshSeen, rentalObservation, saleObservation } from "../../classes/marketseries/sources";

const NOW = new Date("2026-09-18T13:03:00.000Z");

describe("freshSeen", () => {
  it("inside the window, by calendar day", () => {
    expect(freshSeen("2026-09-08", NOW, 10)).toBe("2026-09-08");
    expect(freshSeen("2026-09-07", NOW, 10)).toBeNull();
    expect(freshSeen("2026-09-18T12:00:00.000Z", NOW, 4)).toBe("2026-09-18");
  });
  it("refuses the future and garbage", () => {
    expect(freshSeen("2026-09-19T00:00:00.000Z", NOW, 4)).toBeNull();
    expect(freshSeen("ayer", NOW, 4)).toBeNull();
    expect(freshSeen(undefined, NOW, 4)).toBeNull();
  });
});

const rental = { propertyKey: "p1", advertId: "infocasas:9", source: "infocasas", department: "Montevideo", neighborhood: "Pocitos",
  propertyType: "apartamento" as const, bedrooms: 2, price: 30000, currency: "UYU" as const, commonExpenses: null,
  commonExpensesCurrency: null, areaBuilt: 60, lastSeen: "2026-09-17" };

describe("rentalObservation", () => {
  it("maps the validated zone observation; the property is the level's unit", () => {
    expect(rentalObservation(rental, NOW)).toMatchObject({ vertical: "alquiler", advertId: "infocasas:9", groupKey: "p1", seenDay: "2026-09-17", areaBuilt: 60 });
  });
  it("older than the directory's 10 days is stale", () => {
    expect(rentalObservation({ ...rental, lastSeen: "2026-09-01" }, NOW)).toBe("stale");
  });
});

const sale = { key: "infocasas-123", propertyType: "casa", department: "Canelones", neighborhood: "Solymar", bedrooms: 3,
  price: { amount: 180000, currency: "USD" }, areas: { built: 120 }, lastSeen: "2026-09-16T06:30:00.000Z" };

describe("saleObservation", () => {
  it("one advert, native price", () => {
    expect(saleObservation(sale, NOW, 21)).toMatchObject({ vertical: "venta", advertId: "infocasas-123", groupKey: "infocasas-123", price: 180000, currency: "USD", areaBuilt: 120, bedrooms: 3, seenDay: "2026-09-16" });
  });
  it("invalid or stale rows are counted apart", () => {
    expect(saleObservation({ ...sale, propertyType: "terreno" }, NOW, 21)).toBe("invalid");
    expect(saleObservation({ ...sale, price: { amount: 0, currency: "USD" } }, NOW, 21)).toBe("invalid");
    expect(saleObservation({ ...sale, lastSeen: "2026-08-01T00:00:00.000Z" }, NOW, 21)).toBe("stale");
  });
  it("a built area outside 8..100000 m2 is unknown, not a reason to drop the row", () => {
    expect((saleObservation({ ...sale, areas: { built: 3 } }, NOW, 21) as { areaBuilt: unknown }).areaBuilt).toBeNull();
  });
});

const carRow = { key: "ml-MLU1", marketSlug: "toyota-hilux", brand: "Toyota", model: "Hilux", year: 2018, price: 32990,
  currency: "USD", currencyInferred: false, flags: [], lastSeen: "2026-09-18T08:00:00.000Z" };

describe("carObservation", () => {
  it("native dollars only, never a deduced currency", () => {
    expect(carObservation(carRow, NOW, 4)).toMatchObject({ vertical: "autos", marketSlug: "toyota-hilux", year: 2018, price: 32990 });
    expect(carObservation({ ...carRow, currency: "UYU" }, NOW, 4)).toBe("currency");
    expect(carObservation({ ...carRow, currencyInferred: true }, NOW, 4)).toBe("currency");
  });
  it("a declared problem (damaged, debt, foreign plate...) stays out, as in the model page", () => {
    expect(carObservation({ ...carRow, flags: ["damaged"] }, NOW, 4)).toBe("flags");
  });
  it("a deposit is not a car", () => {
    expect(carObservation({ ...carRow, price: 500 }, NOW, 4)).toBe("invalid");
    expect(carObservation({ ...carRow, marketSlug: "Toyota Hilux" }, NOW, 4)).toBe("invalid");
  });
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `classes/marketseries/sources.ts`:

```ts
// Lee los tres catálogos PÚBLICOS que ya existen en la APP DB. Nunca toca una cosecha: lo que entra
// acá ya pasó las reglas del sitio (identidad v1 y elegibilidad de alquileres, ficha propia de ventas,
// moneda leída y banderas de autos). Un catálogo cuyo meta tiene más de 3 días no es el mercado de
// hoy y el mercado se saltea.
import { appConnection } from "../appdb";
import type { RentalZoneMarketObservation } from "../propertyzones/market";
import { projectZoneObservations, ZONE_RENTAL_PROJECTION } from "../propertyzones/project";
import { shiftDay } from "./log";
import type { MarketObservation, MarketVertical } from "./types";

const DAY = 86_400_000;
const META_MAX_AGE_DAYS = 3;
const RENTAL_FRESH_DAYS = 10;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KEY = /^[\w:.-]{1,160}$/;

export interface MarketRead {
  observations: MarketObservation[];
  excluded: Record<string, number>;
  dataAsOf: string;
}

const NONE = { areaBuilt: null, department: null, neighborhood: null, propertyType: null, bedrooms: null, marketSlug: null, brand: null, model: null, year: null };

const cleanName = (value: unknown): string | null =>
  typeof value === "string" && value.length <= 120 && !/[\p{Cc}\p{Cf}<>]/u.test(value)
    ? value.normalize("NFC").trim().replace(/\s+/g, " ") || null
    : null;

/** The observation's calendar day when it lies inside the catalogue's own window; never the future. */
export function freshSeen(value: unknown, now: Date, days: number): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time > now.getTime() + 60_000) return null;
  const day = value.slice(0, 10);
  return day >= shiftDay(now.toISOString().slice(0, 10), -days) ? day : null;
}

export function rentalObservation(o: RentalZoneMarketObservation, now: Date): MarketObservation | string {
  const seenDay = freshSeen(o.lastSeen, now, RENTAL_FRESH_DAYS);
  if (!seenDay) return "stale";
  if (!(o.price > 0) || (o.currency !== "UYU" && o.currency !== "USD")) return "invalid";
  return {
    ...NONE, vertical: "alquiler", advertId: o.advertId, groupKey: o.propertyKey, price: o.price, currency: o.currency,
    seenAt: o.lastSeen, seenDay, areaBuilt: o.areaBuilt, department: o.department, neighborhood: o.neighborhood,
    propertyType: o.propertyType, bedrooms: o.bedrooms,
  };
}

export function saleObservation(row: Record<string, any>, now: Date, freshDays: number): MarketObservation | string {
  const key = typeof row.key === "string" && KEY.test(row.key) ? row.key : null;
  const propertyType = row.propertyType === "apartamento" || row.propertyType === "casa" ? row.propertyType : null;
  const department = cleanName(row.department);
  const amount = row.price?.amount;
  const currency = row.price?.currency;
  if (!key || !propertyType || !department || !(typeof amount === "number" && Number.isFinite(amount) && amount > 0) || (currency !== "USD" && currency !== "UYU"))
    return "invalid";
  const seenDay = freshSeen(row.lastSeen, now, freshDays);
  if (!seenDay) return "stale";
  const built = row.areas?.built;
  return {
    ...NONE, vertical: "venta", advertId: key, groupKey: key, price: amount, currency, seenAt: row.lastSeen, seenDay,
    areaBuilt: typeof built === "number" && built >= 8 && built <= 100_000 ? built : null,
    department, neighborhood: cleanName(row.neighborhood), propertyType,
    bedrooms: Number.isInteger(row.bedrooms) && row.bedrooms >= 0 && row.bedrooms <= 20 ? row.bedrooms : null,
  };
}

export function carObservation(row: Record<string, any>, now: Date, freshDays: number): MarketObservation | string {
  const key = typeof row.key === "string" && KEY.test(row.key) ? row.key : null;
  const marketSlug = typeof row.marketSlug === "string" && row.marketSlug.length <= 80 && SLUG.test(row.marketSlug) ? row.marketSlug : null;
  const year = Number.isInteger(row.year) && row.year >= 1950 && row.year <= now.getUTCFullYear() + 1 ? (row.year as number) : null;
  if (!key || !marketSlug || !(typeof row.price === "number" && row.price >= 1_000 && row.price <= 500_000)) return "invalid";
  if (row.currency !== "USD" || row.currencyInferred === true) return "currency";
  if (Array.isArray(row.flags) && row.flags.length) return "flags";
  const seenDay = freshSeen(row.lastSeen, now, freshDays);
  if (!seenDay) return "stale";
  return {
    ...NONE, vertical: "autos", advertId: key, groupKey: key, price: row.price, currency: "USD", seenAt: row.lastSeen, seenDay,
    marketSlug, brand: cleanName(row.brand), model: cleanName(row.model), year,
  };
}

function metaDate(value: unknown, now: Date): string {
  const time = typeof value === "string" ? Date.parse(value) : NaN;
  if (!Number.isFinite(time) || time > now.getTime() + 60_000 || now.getTime() - time > META_MAX_AGE_DAYS * DAY)
    throw new Error(`catálogo sin meta o con más de ${META_MAX_AGE_DAYS} días (${String(value)})`);
  return new Date(time).toISOString();
}

function collect(read: MarketRead, mapped: MarketObservation | string): void {
  if (typeof mapped === "string") read.excluded[mapped] = (read.excluded[mapped] ?? 0) + 1;
  else read.observations.push(mapped);
}

const freshDaysOf = (value: unknown, fallback: number): number =>
  Number.isInteger(value) && (value as number) > 0 && (value as number) <= 60 ? (value as number) : fallback;

export async function readRentals(now: Date): Promise<MarketRead> {
  const db = appConnection();
  const meta = await db.collection("rentalmetas").findOne({ key: "uy-rentals" }, { projection: { _id: 0, generatedAt: 1 }, maxTimeMS: 5000 });
  const read: MarketRead = { observations: [], excluded: {}, dataAsOf: metaDate(meta?.generatedAt, now) };
  const cutoff = shiftDay(now.toISOString().slice(0, 10), -RENTAL_FRESH_DAYS);
  const cursor = db.collection("rentallistings").find(
    { offers: { $elemMatch: { "identity.version": 1, "identity.propertyType": { $in: ["apartamento", "casa"] }, lastSeen: { $gte: cutoff } } } },
    { projection: ZONE_RENTAL_PROJECTION, batchSize: 200, maxTimeMS: 180_000 },
  );
  try {
    for await (const row of cursor) for (const o of projectZoneObservations(row)) collect(read, rentalObservation(o, now));
  } finally {
    await cursor.close();
  }
  return read;
}

export async function readSales(now: Date): Promise<MarketRead> {
  const db = appConnection();
  const meta = await db.collection("propertysalecatalogmetas").findOne({ key: "uy-sales" }, { projection: { _id: 0, generatedAt: 1, freshDays: 1 }, maxTimeMS: 5000 });
  const read: MarketRead = { observations: [], excluded: {}, dataAsOf: metaDate(meta?.generatedAt, now) };
  const freshDays = freshDaysOf(meta?.freshDays, 21);
  const cursor = db.collection("propertysalecatalog").find({}, {
    projection: { _id: 0, key: 1, propertyType: 1, department: 1, neighborhood: 1, bedrooms: 1, price: 1, "areas.built": 1, lastSeen: 1 },
    batchSize: 500, maxTimeMS: 120_000,
  });
  try {
    for await (const row of cursor) collect(read, saleObservation(row, now, freshDays));
  } finally {
    await cursor.close();
  }
  return read;
}

export async function readCars(now: Date): Promise<MarketRead> {
  const db = appConnection();
  const meta = await db.collection("carcatalogmetas").findOne({ key: "uy-cars" }, { projection: { _id: 0, generatedAt: 1, "meta.freshDays": 1 }, maxTimeMS: 5000 });
  const read: MarketRead = { observations: [], excluded: {}, dataAsOf: metaDate(meta?.generatedAt, now) };
  const freshDays = freshDaysOf(meta?.meta?.freshDays, 4);
  const cursor = db.collection("carcatalog").find({}, {
    projection: { _id: 0, key: 1, marketSlug: 1, brand: 1, model: 1, year: 1, price: 1, currency: 1, currencyInferred: 1, flags: 1, lastSeen: 1 },
    batchSize: 1000, maxTimeMS: 120_000,
  });
  try {
    for await (const row of cursor) collect(read, carObservation(row, now, freshDays));
  } finally {
    await cursor.close();
  }
  return read;
}

export const MARKET_READERS: Record<MarketVertical, (now: Date) => Promise<MarketRead>> = {
  alquiler: readRentals,
  venta: readSales,
  autos: readCars,
};
```

- [ ] **Step 4: Run** → PASS. Also `npx tsc -p tsconfig.json --noEmit` (root) → no errors in `classes/marketseries`.
- [ ] **Step 5: Commit** `feat(precios): lectura de los tres catalogos publicos`.

---

### Task 5: Store, orchestration, job and pm2 registration

**Files:**
- Create: `classes/marketseries/store.ts`, `classes/marketseries/refresh.ts`, `sync_market_series.ts`
- Modify: `ecosystem.config.js` (new app before the closing `],`), `scripts/deploy-backend.sh:51` (`OTHER_APPS` += `currency-market-series`)
- Test: `tests/marketseries/store.test.ts`, `tests/marketseries/refresh.test.ts` (existing `tests/sync/pm2_registration.test.ts` covers the registration)

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: collections `marketpricelogs`, `marketseries`, `marketseriesmetas`; `seriesOperation(entry, today, maxPoints?)`; `marketThinRun(current, previous)`; `refreshMarketSeries({ now?, dryRun?, only? }) → Promise<MarketVerticalResult[]>`.

- [ ] **Step 1: Failing tests**

`tests/marketseries/store.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { seriesOperation, MARKET_SERIES_MAX_POINTS } from "../../classes/marketseries/store";
import { housingCohorts } from "../../classes/marketseries/cohorts";
import { observation } from "./fixtures";

const cohort = housingCohorts(observation())[0]!;
const point = { d: "2026-09-18", n: 8, p25: 1, med: 2, p75: 3, m2: null, w7: null, w30: null, w90: null };

describe("seriesOperation", () => {
  const op = seriesOperation({ cohort, labels: { department: "$ Montevideo", neighborhood: null, brand: null, model: null }, label: "$ raro", point }, "2026-09-18");
  const set = (op.updateOne.update as Array<{ $set: Record<string, any> }>)[0]!.$set;

  it("upserts by key with an update PIPELINE", () => {
    expect(op.updateOne.filter).toEqual({ key: cohort.key });
    expect(op.updateOne.upsert).toBe(true);
    expect(Array.isArray(op.updateOne.update)).toBe(true);
  });
  it("wraps every value in $literal: a label starting with '$' would be read as a field path", () => {
    expect(set.label).toEqual({ $literal: "$ raro" });
    expect(set.labels).toEqual({ $literal: { department: "$ Montevideo", neighborhood: null, brand: null, model: null } });
    expect(set.latest).toEqual({ $literal: point });
  });
  it("replaces today's point instead of duplicating it, and keeps the newest 1100", () => {
    const [concat, max] = set.points.$slice;
    expect(max).toBe(-MARKET_SERIES_MAX_POINTS);
    expect(concat.$concatArrays[0].$filter.cond).toEqual({ $ne: ["$$this.d", { $literal: "2026-09-18" }] });
    expect(concat.$concatArrays[1]).toEqual([{ $literal: point }]);
  });
});
```

`tests/marketseries/refresh.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { marketThinRun } from "../../classes/marketseries/refresh";

describe("marketThinRun", () => {
  it("the first run and small markets always write", () => {
    expect(marketThinRun(10, null)).toBeNull();
    expect(marketThinRun(10, 40)).toBeNull();
  });
  it("under 60 % of the previous run keeps yesterday", () => {
    expect(marketThinRun(59, 100)).toMatch(/59 observaciones contra 100/);
    expect(marketThinRun(60, 100)).toBeNull();
  });
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**

`classes/marketseries/store.ts`:

```ts
// Las tres colecciones (APP DB). `marketpricelogs` es privada: la app nunca la lee.
import { appConnection } from "../appdb";
import { marketLogPruneFilter } from "./log";
import type { MarketPriceLog, MarketSeriesEntry, MarketSeriesIndex, MarketVertical } from "./types";

export const MARKET_LOG_COLLECTION = "marketpricelogs";
export const MARKET_SERIES_COLLECTION = "marketseries";
export const MARKET_META_COLLECTION = "marketseriesmetas";
/** Three years of daily points per cohort. */
export const MARKET_SERIES_MAX_POINTS = 1100;
const BATCH = 1000;

const lit = (value: unknown): { $literal: unknown } => ({ $literal: value });

/**
 * One cohort's upsert as an update PIPELINE: `points` is recomputed from the stored array (today's
 * point replaces an earlier one of the same day, never duplicates it). Every value goes through
 * `$literal` — in a pipeline `$set` a string starting with "$" is a field path (PRICEWATCH.md).
 */
export function seriesOperation(entry: MarketSeriesEntry, today: string, maxPoints: number = MARKET_SERIES_MAX_POINTS) {
  return {
    updateOne: {
      filter: { key: entry.cohort.key },
      update: [
        {
          $set: {
            key: lit(entry.cohort.key),
            vertical: lit(entry.cohort.dims.vertical),
            dims: lit(entry.cohort.dims),
            labels: lit(entry.labels),
            label: lit(entry.label),
            latest: lit(entry.point),
            updatedAt: lit(today),
            points: {
              $slice: [
                {
                  $concatArrays: [
                    { $filter: { input: { $ifNull: ["$points", []] }, cond: { $ne: ["$$this.d", lit(today)] } } },
                    [lit(entry.point)],
                  ],
                },
                -maxPoints,
              ],
            },
          },
        },
      ],
      upsert: true as const,
    },
  };
}

export async function ensureMarketIndexes(): Promise<void> {
  const db = appConnection();
  await db.collection(MARKET_LOG_COLLECTION).createIndex({ key: 1 }, { unique: true });
  await db.collection(MARKET_LOG_COLLECTION).createIndex({ vertical: 1, lastSeen: 1 });
  await db.collection(MARKET_SERIES_COLLECTION).createIndex({ key: 1 }, { unique: true });
  await db.collection(MARKET_SERIES_COLLECTION).createIndex({ vertical: 1 });
  await db.collection(MARKET_META_COLLECTION).createIndex({ key: 1 }, { unique: true });
}

export async function loadMarketLogs(vertical: MarketVertical): Promise<Map<string, MarketPriceLog>> {
  const logs = new Map<string, MarketPriceLog>();
  const cursor = appConnection().collection(MARKET_LOG_COLLECTION).find({ vertical }, { projection: { _id: 0 }, batchSize: 2000, maxTimeMS: 120_000 });
  try {
    for await (const row of cursor) logs.set((row as unknown as MarketPriceLog).key, row as unknown as MarketPriceLog);
  } finally {
    await cursor.close();
  }
  return logs;
}

export async function writeMarketLogs(logs: readonly MarketPriceLog[]): Promise<void> {
  const collection = appConnection().collection(MARKET_LOG_COLLECTION);
  for (let i = 0; i < logs.length; i += BATCH)
    await collection.bulkWrite(logs.slice(i, i + BATCH).map(log => ({ replaceOne: { filter: { key: log.key }, replacement: log, upsert: true } })), { ordered: false });
}

export async function pruneMarketLogs(vertical: MarketVertical, today: string): Promise<number> {
  const { deletedCount } = await appConnection().collection(MARKET_LOG_COLLECTION).deleteMany(marketLogPruneFilter(vertical, today));
  return deletedCount ?? 0;
}

export async function writeMarketSeries(entries: readonly MarketSeriesEntry[], today: string): Promise<void> {
  const collection = appConnection().collection(MARKET_SERIES_COLLECTION);
  for (let i = 0; i < entries.length; i += BATCH)
    await collection.bulkWrite(entries.slice(i, i + BATCH).map(entry => seriesOperation(entry, today)) as any, { ordered: false });
}

export async function readMarketIndex(vertical: MarketVertical): Promise<MarketSeriesIndex | null> {
  return (await appConnection().collection(MARKET_META_COLLECTION).findOne({ key: `index:${vertical}` }, { projection: { _id: 0 }, maxTimeMS: 5000 })) as unknown as MarketSeriesIndex | null;
}

export async function writeMarketIndex(index: MarketSeriesIndex): Promise<void> {
  await appConnection().collection(MARKET_META_COLLECTION).replaceOne({ key: index.key }, index, { upsert: true });
}

export async function writeMarketRun(vertical: MarketVertical, run: Record<string, unknown>): Promise<void> {
  await appConnection().collection(MARKET_META_COLLECTION).updateOne(
    { key: "run" },
    { $set: { key: "run", [`verticals.${vertical}`]: run, updatedAt: new Date().toISOString() } },
    { upsert: true },
  );
}
```

`classes/marketseries/refresh.ts`:

```ts
// Un mercado por vez, cada uno en su propio try: un catálogo caído no frena a los otros dos.
// Orden: leer → emparejar contra el log de AYER → escribir series → actualizar logs → podar → índice.
import { appConnection } from "../appdb";
import { buildMarketDay } from "./build";
import { buildMarketIndex } from "./index";
import { MARKET_READERS } from "./sources";
import {
  ensureMarketIndexes, loadMarketLogs, pruneMarketLogs, readMarketIndex, writeMarketIndex, writeMarketLogs, writeMarketRun, writeMarketSeries,
} from "./store";
import { MARKET_VERTICALS, type MarketVertical } from "./types";

export const MARKET_THIN_RATIO = 0.6;
const MARKET_THIN_FLOOR = 50;

/** A market whose read fell under 60 % of the previous run is an outage, not a market move. */
export function marketThinRun(current: number, previous: number | null | undefined): string | null {
  if (!previous || previous < MARKET_THIN_FLOOR) return null;
  return current < previous * MARKET_THIN_RATIO
    ? `${current} observaciones contra ${previous} de la corrida anterior (menos del ${MARKET_THIN_RATIO * 100} %)`
    : null;
}

export interface MarketVerticalResult {
  vertical: MarketVertical;
  ok: boolean;
  skipped: string | null;
  error: string | null;
  observations: number;
  adverts: number;
  groups: number;
  cohorts: number;
  logsWritten: number;
  logsPruned: number;
  excluded: Record<string, number>;
  sample: string[];
}

export async function refreshMarketSeries(options: { now?: Date; dryRun?: boolean; only?: readonly MarketVertical[] } = {}): Promise<MarketVerticalResult[]> {
  const now = options.now ?? new Date();
  const today = now.toISOString().slice(0, 10);
  await appConnection().asPromise();
  if (!options.dryRun) await ensureMarketIndexes();
  const results: MarketVerticalResult[] = [];
  for (const vertical of options.only ?? MARKET_VERTICALS) {
    const result: MarketVerticalResult = {
      vertical, ok: false, skipped: null, error: null, observations: 0, adverts: 0, groups: 0, cohorts: 0, logsWritten: 0, logsPruned: 0, excluded: {}, sample: [],
    };
    try {
      const read = await MARKET_READERS[vertical](now);
      result.observations = read.observations.length;
      result.excluded = read.excluded;
      const previous = await readMarketIndex(vertical);
      result.skipped = marketThinRun(read.observations.length, previous?.observations);
      if (!result.skipped) {
        const day = buildMarketDay({ vertical, today, observations: read.observations, logs: await loadMarketLogs(vertical) });
        const index = buildMarketIndex({
          vertical, today, generatedAt: now.toISOString(), dataAsOf: read.dataAsOf, previous, entries: day.entries, observations: read.observations.length, excluded: read.excluded,
        });
        Object.assign(result, { adverts: day.adverts, groups: day.groups, cohorts: day.entries.length, logsWritten: day.logs.length });
        result.sample = [...day.entries].sort((a, b) => b.point.n - a.point.n).slice(0, 6)
          .map(entry => `${entry.cohort.key} n=${entry.point.n} med=${entry.point.med ?? "-"} w7=${entry.point.w7?.chg ?? "-"} w30=${entry.point.w30?.chg ?? "-"}`);
        if (!options.dryRun) {
          await writeMarketSeries(day.entries, today);
          await writeMarketLogs(day.logs);
          result.logsPruned = await pruneMarketLogs(vertical, today);
          await writeMarketIndex(index);
        }
        result.ok = true;
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }
    if (!options.dryRun) await writeMarketRun(vertical, { ...result, sample: undefined, at: now.toISOString() }).catch(() => undefined);
    results.push(result);
  }
  return results;
}
```

`sync_market_series.ts`:

```ts
// Seguimiento de precios de alquileres, viviendas en venta y autos usados: una serie diaria por
// cohorte y la variación de la misma oferta. Lee los catálogos públicos de la APP DB y escribe
// `marketseries`, `marketseriesmetas` y el historial privado `marketpricelogs`.
// Diseño: docs/superpowers/specs/2026-09-18-seguimiento-de-precios-design.md. Ver docs/app/MARKET_SERIES.md.
//
//   --dry-run                lee y calcula, no escribe nada.
//   --only=alquiler,autos    sólo esos mercados.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appConnection, appDbConfigured } from "./classes/appdb";
import { refreshMarketSeries } from "./classes/marketseries/refresh";
import { MARKET_VERTICALS, type MarketVertical } from "./classes/marketseries/types";

function parseOnly(argv: readonly string[]): MarketVertical[] | undefined {
  const flag = argv.find(arg => arg.startsWith("--only="));
  if (!flag) return undefined;
  const wanted = flag.slice("--only=".length).split(",").map(value => value.trim());
  const unknown = wanted.filter(value => !(MARKET_VERTICALS as readonly string[]).includes(value));
  if (unknown.length) throw new Error(`--only desconocido: ${unknown.join(", ")}`);
  return wanted as MarketVertical[];
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const only = parseOnly(process.argv);
  // Mismo mapeo explícito que sync_price_events.ts: el app llama MONGO_URI a su base.
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  if (!appDbConfigured()) {
    console.error("[market-series] APP_MONGO_URI/MONGO_URI is missing — refusing to write the wrong DB");
    process.exit(1);
  }
  const results = await refreshMarketSeries({ dryRun, only });
  for (const result of results) {
    const excluded = Object.entries(result.excluded).map(([reason, count]) => `${reason}=${count}`).join(" ") || "-";
    console.log(
      `[market-series] ${result.vertical}: ${result.error ? `ERROR ${result.error}` : result.skipped ? `SALTEADO ${result.skipped}` : "ok"} ` +
        `observaciones=${result.observations} avisos=${result.adverts} unidades=${result.groups} cohortes=${result.cohorts} ` +
        `logs=${result.logsWritten} podados=${result.logsPruned} excluidos: ${excluded}`,
    );
    for (const line of result.sample) console.log(`[market-series]   ${line}`);
  }
  if (dryRun) console.log("[market-series] --dry-run: no se escribió nada");
  await appConnection().close().catch(() => undefined);
  process.exit(results.some(result => result.error || result.skipped) ? 1 : 0);
}

main().catch(error => {
  console.error("[market-series] fatal", error);
  process.exit(1);
});
```

`ecosystem.config.js` — append after the `currency-price-events-hourly` object:

```js
    {
      // Seguimiento de precios: una serie diaria por cohorte de alquileres, viviendas en venta y autos
      // usados, más la variación de la misma oferta (docs/app/MARKET_SERIES.md). Sólo LEE los catálogos
      // públicos de la APP DB, así que corre después de todas las cosechas completas (alquileres 04:52,
      // oportunidades 06:21, autos 07:43) y no toca el puente de ML. Needs APP_MONGO_URI.
      name: "currency-market-series",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_market_series.js",
      cron_restart: "3 13 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```

`scripts/deploy-backend.sh` line 51: add ` currency-market-series` right after `currency-price-events-hourly` inside `OTHER_APPS=(...)`.

- [ ] **Step 4: Run** — `npx vitest run tests/marketseries tests/sync` → PASS; `npx tsc -p tsconfig.production.json --noEmit` → PASS.
- [ ] **Step 5: Commit** `feat(precios): job currency-market-series`.

---

### Task 6: App contract, models and endpoints

**Files:**
- Create: `app/utils/marketSeries.ts`, `app/server/models/MarketSeries.ts`, `app/server/api/market-series/index.get.ts`, `app/server/api/market-series/series.get.ts`
- Test: `app/tests/unit/marketSeries.test.ts`

**Interfaces:**
- Produces (app): types mirroring root (`MarketVertical`, `MarketCurrency`, `MarketTypeBucket`, `MarketBedrooms`, `MarketPairStats`, `MarketSeriesPoint`, `MarketCohortDims`, `MarketSeriesDoc`, `MarketIndexScope`, `MarketIndexModel`, `MarketMover`, `MarketSeriesIndex`, `MarketSibling`, `MarketSeriesResponse`), constants (`MARKET_SAMPLE_MINIMUM`, `MARKET_PAIR_MINIMUM`, `MARKET_WINDOWS`, `MARKET_SERIES_KEY_PATTERN`, `MARKET_VERTICALS`, `MARKET_TYPE_LABELS`, `MARKET_BEDROOM_LABELS`), helpers `housingSeriesKey`, `carSeriesKey`, `isMarketSeriesKey`, `housingSiblingKeys`, `carModelOfKey`, `marketMoney`, `marketPct`, `marketDay`, `marketWindowState`, `marketChart`, `marketSeriesFaq`.
- Endpoints: `GET /api/market-series?v=` → `{ index: MarketSeriesIndex | null }`; `GET /api/market-series/series?key=` → `MarketSeriesResponse`.

- [ ] **Step 1: Failing test** `app/tests/unit/marketSeries.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  carModelOfKey, carSeriesKey, housingSeriesKey, housingSiblingKeys, isMarketSeriesKey, marketChart, marketDay,
  marketPct, marketWindowState, MARKET_PAIR_MINIMUM, MARKET_SAMPLE_MINIMUM, MARKET_SERIES_KEY_PATTERN,
} from '../../utils/marketSeries'

const root = (file: string) => readFileSync(join(__dirname, '..', '..', '..', 'classes', 'marketseries', file), 'utf8')

describe('parity with classes/marketseries (read as text, never imported)', () => {
  it('same minimums', () => {
    expect(root('stats.ts')).toContain(`MARKET_SAMPLE_MINIMUM = ${MARKET_SAMPLE_MINIMUM};`)
    expect(root('stats.ts')).toContain(`MARKET_PAIR_MINIMUM = ${MARKET_PAIR_MINIMUM};`)
  })
  it('same key pattern', () => {
    expect(root('cohorts.ts')).toContain(MARKET_SERIES_KEY_PATTERN.source)
  })
})

describe('keys', () => {
  it('builds keys the backend writes', () => {
    expect(housingSeriesKey('alquiler', 'UYU', 'apartamento', '2', 'b:montevideo:pocitos')).toBe('alquiler|UYU|apartamento|2|b:montevideo:pocitos')
    expect(carSeriesKey('toyota-hilux', 2018)).toBe('autos|USD|m:toyota-hilux|y:2018')
    expect(carSeriesKey('toyota-hilux')).toBe('autos|USD|m:toyota-hilux')
    expect(carSeriesKey(null)).toBe('autos|USD|all')
  })
  it('validates before touching Mongo', () => {
    expect(isMarketSeriesKey('venta|USD|todas|any|uy')).toBe(true)
    expect(isMarketSeriesKey('venta|EUR|todas|any|uy')).toBe(false)
    expect(isMarketSeriesKey({ $ne: null })).toBe(false)
    expect(isMarketSeriesKey('autos|USD|m:.*')).toBe(false)
  })
  it('siblings: every type x bedrooms of the same place and currency', () => {
    const keys = housingSiblingKeys('venta|USD|casa|3|d:canelones')
    expect(keys).toHaveLength(18)
    expect(keys).toContain('venta|USD|todas|any|d:canelones')
    expect(housingSiblingKeys('autos|USD|all')).toEqual([])
  })
  it('the model of a car key', () => {
    expect(carModelOfKey('autos|USD|m:toyota-hilux|y:2018')).toBe('toyota-hilux')
    expect(carModelOfKey('autos|USD|all')).toBeNull()
  })
})

describe('formatting', () => {
  it('signed percentages in Uruguayan Spanish', () => {
    expect(marketPct(-0.0123)).toBe('-1,2 %')
    expect(marketPct(0.0081)).toBe('+0,8 %')
    expect(marketPct(0)).toBe('0,0 %')
    expect(marketPct(null)).toBe('—')
  })
  it('days without time zones', () => {
    expect(marketDay('2026-09-08')).toBe('8/9/2026')
  })
})

describe('marketWindowState', () => {
  const stats = { n: 12, chg: -0.02, down: 5, up: 1, same: 6, outliers: 0 }
  it('waiting until the log is old enough', () => {
    expect(marketWindowState(null, 30, '2026-09-18', '2026-09-20')).toEqual({ kind: 'waiting', from: '2026-10-18' })
  })
  it('thin, then ok', () => {
    expect(marketWindowState({ ...stats, n: 3, chg: null }, 30, '2026-08-01', '2026-09-20')).toEqual({ kind: 'thin', n: 3 })
    expect(marketWindowState(null, 30, '2026-08-01', '2026-09-20')).toEqual({ kind: 'thin', n: 0 })
    expect(marketWindowState(stats, 30, '2026-08-01', '2026-09-20')).toEqual({ kind: 'ok', stats })
  })
})

describe('marketChart', () => {
  it('labels and the three lines, with gaps kept as null', () => {
    const chart = marketChart([
      { d: '2026-09-18', n: 8, p25: 1, med: 2, p75: 3, m2: null, w7: null, w30: null, w90: null },
      { d: '2026-09-19', n: 5, p25: null, med: null, p75: null, m2: null, w7: null, w30: null, w90: null },
    ])
    expect(chart.labels).toEqual(['18/9', '19/9'])
    expect(chart.med).toEqual([2, null])
    expect(chart.p25).toEqual([1, null])
  })
})
```

- [ ] **Step 2: Run** — `cd app && npx vitest run tests/unit/marketSeries.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`app/utils/marketSeries.ts`:

```ts
// Contrato público del seguimiento de precios (alquileres, viviendas en venta, autos usados).
// Espejo de classes/marketseries/types.ts — la app no importa la raíz; tests/unit/marketSeries.test.ts
// compara las constantes leyendo esos archivos como texto.
import type { FaqItem } from './faqAnswers'
import { formatCurrency } from './format'

export const MARKET_VERTICALS = ['alquiler', 'venta', 'autos'] as const
export type MarketVertical = (typeof MARKET_VERTICALS)[number]
export type MarketCurrency = 'UYU' | 'USD'
export type MarketTypeBucket = 'apartamento' | 'casa' | 'todas'
export type MarketBedrooms = 'any' | '0' | '1' | '2' | '3' | '4plus'
export type MarketWindow = 7 | 30 | 90

export const MARKET_SAMPLE_MINIMUM = 8
export const MARKET_PAIR_MINIMUM = 8
export const MARKET_WINDOWS = [7, 30, 90] as const
export const MARKET_SERIES_KEY_PATTERN =
  /^(?:(?:alquiler|venta)\|(?:UYU|USD)\|(?:apartamento|casa|todas)\|(?:any|0|1|2|3|4plus)\|(?:uy|d:[a-z0-9-]{1,80}|b:[a-z0-9-]{1,80}:[a-z0-9-]{1,80})|autos\|USD\|(?:all|m:[a-z0-9-]{1,80}(?:\|y:\d{4})?))$/

export interface MarketPairStats { n: number; chg: number | null; down: number; up: number; same: number; outliers: number }
export interface MarketSeriesPoint {
  d: string; n: number; p25: number | null; med: number | null; p75: number | null
  m2: { n: number; med: number | null } | null
  w7: MarketPairStats | null; w30: MarketPairStats | null; w90: MarketPairStats | null
}
export interface MarketCohortDims {
  vertical: MarketVertical; currency: MarketCurrency
  scope: 'uy' | 'department' | 'neighborhood' | 'all' | 'model' | 'year'
  propertyType: MarketTypeBucket | null; bedrooms: MarketBedrooms | null
  departmentSlug: string | null; neighborhoodSlug: string | null; marketSlug: string | null; year: number | null
}
export interface MarketSeriesDoc {
  key: string; vertical: MarketVertical; dims: MarketCohortDims
  labels: { department: string | null; neighborhood: string | null; brand: string | null; model: string | null }
  label: string; latest: MarketSeriesPoint; updatedAt: string; points: MarketSeriesPoint[]
}
export interface MarketIndexScope {
  token: string; scope: 'uy' | 'department' | 'neighborhood'; department: string | null; neighborhood: string | null
  label: string; n: Partial<Record<MarketCurrency, number>>
}
export interface MarketIndexModel { slug: string; brand: string; model: string; n: number; med: number | null; w30: number | null }
export interface MarketMover { key: string; label: string; currency: MarketCurrency; window: MarketWindow; chg: number; pairs: number; down: number; up: number }
export interface MarketSeriesIndex {
  key: string; vertical: MarketVertical; day: string; generatedAt: string; dataAsOf: string; trackingSince: string
  observations: number; cohorts: number; excluded: Record<string, number>
  scopes: MarketIndexScope[]; models: MarketIndexModel[]
  movers: { window: MarketWindow | null; down: MarketMover[]; up: MarketMover[] }
}
export interface MarketSibling { key: string; dims: MarketCohortDims; latest: MarketSeriesPoint; updatedAt: string }
export interface MarketSeriesResponse { series: MarketSeriesDoc | null; siblings: MarketSibling[] }

export const MARKET_TYPE_LABELS: Record<MarketTypeBucket, string> = {
  todas: 'Casas y apartamentos', apartamento: 'Apartamentos', casa: 'Casas',
}
export const MARKET_BEDROOM_LABELS: Record<MarketBedrooms, string> = {
  any: 'Todos', '0': 'Monoambiente', '1': '1 dormitorio', '2': '2 dormitorios', '3': '3 dormitorios', '4plus': '4 o más',
}

export const housingSeriesKey = (vertical: 'alquiler' | 'venta', currency: MarketCurrency, type: MarketTypeBucket, bedrooms: MarketBedrooms, scope: string): string =>
  `${vertical}|${currency}|${type}|${bedrooms}|${scope}`
export const carSeriesKey = (slug: string | null, year?: number | null): string =>
  !slug ? 'autos|USD|all' : year ? `autos|USD|m:${slug}|y:${year}` : `autos|USD|m:${slug}`
export const isMarketSeriesKey = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 240 && MARKET_SERIES_KEY_PATTERN.test(value)

/** The 18 type x bedrooms cohorts of the same market, currency and place. */
export function housingSiblingKeys(key: string): string[] {
  const [vertical, currency, , , scope] = key.split('|')
  if ((vertical !== 'alquiler' && vertical !== 'venta') || !scope) return []
  const types: MarketTypeBucket[] = ['todas', 'apartamento', 'casa']
  const beds: MarketBedrooms[] = ['any', '0', '1', '2', '3', '4plus']
  return types.flatMap(type => beds.map(bed => housingSeriesKey(vertical, currency as MarketCurrency, type, bed, scope)))
}
export function carModelOfKey(key: string): string | null {
  return /^autos\|USD\|m:([a-z0-9-]{1,80})(?:\|y:\d{4})?$/.exec(key)?.[1] ?? null
}

export const marketMoney = (value: number | null | undefined, currency: MarketCurrency): string =>
  typeof value === 'number' ? formatCurrency(value, currency, 0) : '—'

export function marketPct(value: number | null | undefined, digits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 100 * 10 ** digits) / 10 ** digits
  const body = Math.abs(rounded).toLocaleString('es-UY', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return `${rounded > 0 ? '+' : rounded < 0 ? '-' : ''}${body} %`
}

export const marketDay = (day: string): string => `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}/${day.slice(0, 4)}`

const shiftDay = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10)

export type MarketWindowState =
  | { kind: 'waiting'; from: string }
  | { kind: 'thin'; n: number }
  | { kind: 'ok'; stats: MarketPairStats & { chg: number } }

/** Why a "misma oferta" card has no number yet: too early, or too few adverts to say. */
export function marketWindowState(stats: MarketPairStats | null, window: number, trackingSince: string, today: string): MarketWindowState {
  const from = shiftDay(trackingSince, window)
  if (today < from) return { kind: 'waiting', from }
  if (!stats || stats.chg === null) return { kind: 'thin', n: stats?.n ?? 0 }
  return { kind: 'ok', stats: stats as MarketPairStats & { chg: number } }
}

export function marketChart(points: readonly MarketSeriesPoint[]): { labels: string[]; med: (number | null)[]; p25: (number | null)[]; p75: (number | null)[] } {
  return {
    labels: points.map(point => `${Number(point.d.slice(8, 10))}/${Number(point.d.slice(5, 7))}`),
    med: points.map(point => point.med),
    p25: points.map(point => point.p25),
    p75: points.map(point => point.p75),
  }
}

const NOUN: Record<MarketVertical, string> = { alquiler: 'alquileres', venta: 'viviendas en venta', autos: 'autos usados' }

export function marketSeriesFaq(vertical: MarketVertical): FaqItem[] {
  const unit = vertical === 'alquiler' ? 'vivienda' : 'aviso'
  return [
    {
      id: `evolucion-${vertical}-mediana`,
      question: '¿Por qué la mediana no alcanza para saber si los precios bajaron?',
      answer:
        'Porque cambia qué avisos hay publicados. Si esta semana entraron avisos baratos o se fueron los caros, la mediana baja aunque nadie haya bajado nada. Por eso mostramos aparte la variación de la misma oferta: el mismo aviso contra su propio precio de hace 7, 30 o 90 días.',
    },
    {
      id: `evolucion-${vertical}-misma-oferta`,
      question: '¿Qué es la variación de la misma oferta?',
      answer:
        `Tomamos los avisos que siguen publicados y que ya seguíamos hace 7, 30 o 90 días, y comparamos su precio de hoy con el de entonces. Publicamos el promedio geométrico de esas razones y cuántos bajaron, subieron o quedaron igual. Un aviso que en ese lapso se duplica o se parte a la mitad lo tratamos como error de carga y no cuenta. Hacen falta al menos ${MARKET_PAIR_MINIMUM} avisos para publicar el número.`,
    },
    {
      id: `evolucion-${vertical}-desde-cuando`,
      question: '¿Desde cuándo hay datos?',
      answer:
        'La serie empezó el 18 de septiembre de 2026 y no la reconstruimos hacia atrás: no guardábamos los precios viejos, y rellenar el pasado con el precio de hoy dibujaría una línea plana que nunca existió. La variación de 7 días aparece a la semana, la de 30 días al mes y la de 90 días a los tres meses.',
    },
    {
      id: `evolucion-${vertical}-que-es`,
      question: `¿Son precios de ${vertical === 'autos' ? 'venta' : 'cierre'}?`,
      answer:
        `No. Son precios pedidos en ${NOUN[vertical]} publicados en internet, una observación por ${unit}. El precio al que se cierra un trato puede ser otro y no se publica en ningún lado. Nunca mezclamos pesos con dólares: cada moneda es su propia serie.`,
    },
  ]
}
```

`app/server/models/MarketSeries.ts`:

```ts
import mongoose, { Schema } from 'mongoose'
import type { MarketSeriesDoc, MarketSeriesIndex } from '../../utils/marketSeries'

// Written by the backend job currency-market-series (classes/marketseries/store.ts). Read-only here.
// The private per-advert log `marketpricelogs` is never read by the app.
const options = { autoCreate: false, autoIndex: false, strict: false }
export const MarketSeriesModel =
  (mongoose.models.MarketSeries as mongoose.Model<MarketSeriesDoc>) ||
  mongoose.model<MarketSeriesDoc>('MarketSeries', new Schema({ key: String }, options), 'marketseries')
export const MarketSeriesMetaModel =
  (mongoose.models.MarketSeriesMeta as mongoose.Model<MarketSeriesIndex>) ||
  mongoose.model<MarketSeriesIndex>('MarketSeriesMeta', new Schema({ key: String }, options), 'marketseriesmetas')
```

`app/server/api/market-series/index.get.ts`:

```ts
import { MARKET_VERTICALS, type MarketSeriesIndex, type MarketVertical } from '../../../utils/marketSeries'
import { MarketSeriesMetaModel } from '../../models/MarketSeries'
import { connectDb } from '../../utils/db'

/** The `index:<market>` document: selectors (places or models) and the biggest same-offer moves. */
export default defineEventHandler(async (event): Promise<{ index: MarketSeriesIndex | null }> => {
  const vertical = String(getQuery(event).v || '')
  if (!(MARKET_VERTICALS as readonly string[]).includes(vertical))
    throw createError({ statusCode: 400, statusMessage: 'Unknown market' })
  try {
    await connectDb()
    const index = await MarketSeriesMetaModel.findOne({ key: `index:${vertical as MarketVertical}` })
      .select({ _id: 0, __v: 0 })
      .maxTimeMS(5_000)
      .lean()
    setResponseHeader(event, 'cache-control', 'public, max-age=600, s-maxage=600, stale-while-revalidate=86400')
    return { index: (index as unknown as MarketSeriesIndex | null) ?? null }
  } catch {
    // Un problema de Mongo no tira la página: el cómo se mide y el FAQ valen igual.
    setResponseHeader(event, 'cache-control', 'no-store')
    return { index: null }
  }
})
```

`app/server/api/market-series/series.get.ts`:

```ts
import { carModelOfKey, housingSiblingKeys, isMarketSeriesKey, type MarketSeriesDoc, type MarketSeriesResponse, type MarketSibling } from '../../../utils/marketSeries'
import { MarketSeriesModel } from '../../models/MarketSeries'
import { connectDb } from '../../utils/db'

/** One cohort's series plus its siblings (other types/bedrooms of the place, or the model's years). */
export default defineEventHandler(async (event): Promise<MarketSeriesResponse> => {
  const key = getQuery(event).key
  if (!isMarketSeriesKey(key)) throw createError({ statusCode: 400, statusMessage: 'Invalid series key' })
  try {
    await connectDb()
    const model = carModelOfKey(key)
    // `model` only matches [a-z0-9-]: safe inside an anchored prefix regex, which rides the key index.
    const siblingFilter = model
      ? { key: { $regex: `^autos\\|USD\\|m:${model}\\|y:` } }
      : { key: { $in: housingSiblingKeys(key) } }
    const [series, siblings] = await Promise.all([
      MarketSeriesModel.findOne({ key }).select({ _id: 0, __v: 0 }).maxTimeMS(5_000).lean(),
      MarketSeriesModel.find(siblingFilter).select({ _id: 0, key: 1, dims: 1, latest: 1, updatedAt: 1 }).limit(200).maxTimeMS(5_000).lean(),
    ])
    setResponseHeader(event, 'cache-control', 'public, max-age=600, s-maxage=600, stale-while-revalidate=86400')
    return { series: (series as unknown as MarketSeriesDoc | null) ?? null, siblings: siblings as unknown as MarketSibling[] }
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    return { series: null, siblings: [] }
  }
})
```

- [ ] **Step 4: Run** — `cd app && npx vitest run tests/unit/marketSeries.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(precios): contrato y endpoints del seguimiento de precios en la app`.

---

### Task 7: Explorer component, three pages, nav, car-model block

**Files:**
- Create: `app/components/MarketSeriesExplorer.vue`, `app/pages/evolucion-precio-alquileres-uruguay.vue`, `app/pages/evolucion-precio-viviendas-uruguay.vue`, `app/pages/evolucion-precio-autos-usados-uruguay.vue`
- Modify: `app/utils/siteNav.ts` (three entries next to the existing rentals/sales/cars entries), `app/i18n/locales/json/{es,en,pt}.json` (`nav.evolucionAlquileres`, `nav.evolucionViviendas`, `nav.evolucionAutos`), `app/pages/autos-usados-uruguay/precios/[slug].vue` (compact block)
- Test: existing app tripwires (`siteNav-coverage`, `seoContract`, `seoTitleBudget`, `pageContainer`, `internalLinks`, `componentResolution`, `noChipInsideParagraph`) + `npm run lint`

**Interfaces:**
- Consumes: Task 6 utils and endpoints; `ChartsLineChart` (`components/charts/LineChart.vue`, props `chartData`, `options`, `ariaLabel`); `FaqSection` (`items`, `heading`, `expanded`).
- Produces: `<MarketSeriesExplorer vertical="alquiler|venta|autos" :fixed-model="slug?" :compact="bool?" />`.

- [ ] **Step 1: Write the component** — `app/components/MarketSeriesExplorer.vue` (full code in the implementation commit; structure below is binding):
  - Props `{ vertical: MarketVertical; fixedModel?: string | null; compact?: boolean }`.
  - State: housing → `currency` (default `UYU` for alquiler, `USD` for venta), `scope` (`uy`), `type` (`todas`), `bedrooms` (`any`); autos → `model` (`fixedModel` or null), `year` (null). Initial values read from `route.query` (`moneda`, `zona`, `tipo`, `dormitorios`, `modelo`, `anio`) only when `!fixedModel`, validated against the allowed values; changes written back with `router.replace({ query })` from a non-immediate watcher (Vuetify controls emit on mount).
  - `useFetch('/api/market-series', { query: { v }, key: 'market-index-'+v })` (skipped when `compact`); `useFetch('/api/market-series/series', { query: computed(() => ({ key: key.value })), key: computed(...) })`.
  - Selectors: `VBtnToggle` currency (only currencies present in the scope's `n`), `VAutocomplete` zone (items from `index.scopes` filtered by currency), `VChipGroup` type and bedrooms (chips disabled when the sibling for that key has `latest.n < 8` and no pairs); autos `VAutocomplete` model (items from `index.models`, title `brand model`, subtitle `n avisos`), `VChipGroup` years from siblings.
  - Cards: "Mediana pedida" (`marketMoney(latest.med)`, p25–p75, `n` with unit "viviendas"/"avisos", m² median when present) and three "Misma oferta" cards from `marketWindowState` (`ok` → `marketPct(chg)` + "de N avisos: A bajaron, B subieron"; `waiting` → "Se publica desde el <marketDay(from)>"; `thin` → "Muy pocos avisos para medir (N)").
  - Chart (`ClientOnly` + `ChartsLineChart`) only when ≥ 2 points: p25 dashed, p75 dashed with `fill: '-1'`, median solid; plus an accessible `VTable` of the last 14 points (fecha, n, mediana, p25–p75, misma oferta 30 días).
  - Movers table (not in compact mode) when `index.movers.window` is set; empty-state text when `index` is null or the series is missing ("Todavía no hay suficientes avisos en esta combinación…").
  - Footer line: "Datos del <marketDay(index.day)> · seguimiento desde <marketDay(trackingSince)>".
- [ ] **Step 2: Write the three pages** (header with eyebrow/H1/intro, `<MarketSeriesExplorer>`, "Cómo lo medimos" section, related links to the directory pages, `<FaqSection :items="marketSeriesFaq(v)" heading="Preguntas frecuentes" :expanded="true" />`, `useSeoMeta` + canonical + BreadcrumbList JSON-LD + keywords + `defineOgImageComponent('Cambio', …)`). Titles: "Evolución del alquiler en Uruguay", "Evolución del precio de la vivienda", "Evolución del precio de autos usados".
- [ ] **Step 3: Wire nav** — three `siteNav.ts` entries (`labelKey`, `icon: 'mdi-chart-line'`, `priority: 0.7`, `changefreq: 'daily'`, `fresh: true`, keywords) next to `/analisis-alquileres-uruguay`, `/venta-viviendas-uruguay` and `/mercado-de-autos-usados-uruguay`; labels in es/en/pt.
- [ ] **Step 4: Car-model block** — in `pages/autos-usados-uruguay/precios/[slug].vue`, after the "Precio por año" section: `<section class="mb-8"><h2 class="text-h6 mb-2">Cómo se mueve el precio</h2><MarketSeriesExplorer vertical="autos" :fixed-model="slug" compact /></section>`.
- [ ] **Step 5: Run** — `cd app && npx vitest run tests/unit` and `npm run lint` → all green (fix what the tripwires report).
- [ ] **Step 6: Commit** `feat(precios): paginas de evolucion de precios y bloque por modelo`.

---

### Task 8: Docs, full verification, merge, deploy, first run

**Files:**
- Create: `docs/app/MARKET_SERIES.md`
- Modify: `AGENTS.md` (pm2 row, root entrypoints list, `classes/` feature dirs list)

- [ ] **Step 1: Docs** — `MARKET_SERIES.md`: what/why (two measures), cohorts, collections, job/flags, guards, pages, how to verify; `AGENTS.md` row `| currency-market-series | dist/sync_market_series.js | 3 13 * * * | … |`, add `sync_market_series.ts` to entrypoints and `marketseries` to the feature dirs.
- [ ] **Step 2: Full suites** — root `npx vitest run` and `npx tsc -p tsconfig.production.json --noEmit`; app `npx vitest run` and `npm run lint`.
- [ ] **Step 3: Commit docs**, then merge to `main` via a clean integration (re-check `git -C ../cambio-uruguay status` and `git log origin/main -3` right before), push (CI deploys backend + app).
- [ ] **Step 4: On the VPS** after `backend-deploy` is green: `node dist/sync_market_series.js --dry-run` → read counts/excluded/sample; then `pm2 start`-registered job run once (`pm2 restart currency-market-series` or `node dist/sync_market_series.js`) → first points written.
- [ ] **Step 5: Verify in production** — `GET /api/market-series?v=alquiler|venta|autos` returns an index; open the three pages and a car-model page; confirm no raw Vuetify tags and no console errors.
