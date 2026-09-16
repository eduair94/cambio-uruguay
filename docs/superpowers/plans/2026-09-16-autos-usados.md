# Autos usados: directorio + oportunidades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A daily-refreshed used-car directory (`/autos-usados-uruguay`, per-model market pages) and a buying-opportunity finder (`/oportunidades-autos-usados-uruguay`) built from Mercado Libre Uruguay listings.

**Architecture:** A single-instance pm2 job (`sync_autos.ts`) harvests MLU1744 used cars through the existing `:9656` bridge partitioned brand→model, stores private observations in the APP DB, enriches them (trim, engine, km quality, text flags), finds under-priced adverts against fixed cohorts, verifies each candidate against its own ML page, and publishes public collections. The Nuxt app reads them through explicit projections.

**Tech Stack:** Root: TypeScript 4.9 CommonJS, mongoose (APP DB via `classes/appdb.ts`), vitest. App: Nuxt 4, Vuetify 4 (registered components only), mongoose, vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-autos-usados-directorio-y-oportunidades-design.md`

## Global Constraints

- Work ONLY in the worktree `C:\Users\airau\Documents\GitHub\cu-autos` (branch `feat/autos-usados`, own `node_modules` in root and `app/`). Never run `nuxi prepare`, `npm run dev` or `nuxt build` in `C:\Users\airau\Documents\GitHub\cambio-uruguay`.
- Root backend: TypeScript 4.9, CommonJS. No `satisfies`, no `String.prototype.matchAll` (use `RegExp.exec` loops). Single test file: `npx vitest run tests/autos/<file>.test.ts`.
- App: Prettier (`semi: false`, `singleQuote: true`, `printWidth: 100`, `arrowParens: "avoid"`). After writing app files run `npx prettier --write <files>` from `app/`. App tests: `npx vitest run tests/unit/<file>.test.ts` from `app/`. `npm run typecheck` is broken — use `npm run lint`.
- `app/utils/*` exports are auto-imported into ONE flat namespace: every new export is car-prefixed (`formatUsd` already exists in `utils/entityPages.ts`).
- Only Vuetify components registered in `app/plugins/vuetify.ts` (VAlert VBreadcrumbs VBtn VCol VContainer VIcon VPagination VRow VSelect VTable VTextField are). Never put `VChip` inside `<p>`.
- Public copy is Spanish, inline in the SFCs (pattern of `app/pages/precio/[slug].vue`). Only `nav.*` labels go to `app/i18n/locales/json/{es,en,pt}.json`; no message may contain a raw `|`. Page roots are `VContainer`.
- Collections (APP DB): private `carlistings`, `carharvestmetas`; public `carcatalog`, `carcatalogmetas` (doc key `uy-cars`), `carmarketsnapshots` (doc key = market slug), `caropportunitysnapshots` (doc key `used`).
- ML bridge default: `http://104.234.204.107:9656/mercadolibre` (`AUTOS_ML_API`). Every search sends `country=UY&q=autos&category=MLU1744&q.category=MLU1744&ITEM_CONDITION=2230581&raw=true&limit=20`.
- Policy (verbatim from spec): strict ≥8 comparables, ≥4 sellers, spread ≤0.30, gap ≥0.15, price ≤ P25×0.95, leave-one-seller-out gap ≥0.10; exploratory ≥5 comparables, ≥3 sellers, gap ≥0.12, price ≤ P25, leave-one-seller-out ≥0.08; gap >0.45 → review, never published; subject km ≤ cohort km P75; km tolerance `max(20000, 30 % of subject km)`; ≤2 comparables per seller, ≤24 comparables; opportunity freshness 2 days; catalog freshness 4 days; detail reuse <72 h; detail km tolerance 1 %; ≤400 detail reads per run; ≤2,000 items.
- Never publish: `sellerId`, descriptions, price-history arrays, phone numbers/emails, URLs outside `https://auto.mercadolibre.com.uy/MLU-` (permalinks) and `https://http2.mlstatic.com/` (pictures). Counts are adverts observed; coverage is always `partial`; "Visto por primera vez" is our date, never "publicado".
- Commit after every task (Conventional Commit, Spanish subject like the repo) ending with:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

## File Structure

Backend (root):

| file | responsibility |
|---|---|
| `classes/autos/types.ts` | internal types (raw card, stored doc, enriched listing, detail, harvest result) |
| `classes/autos/publicTypes.ts` | public wire contract (mirrored by `app/utils/carsPublic.ts`) |
| `classes/autos/normalize.ts` | pure parsing: fold/slug, engine, trim, km quality, labels, location, text flags |
| `classes/autos/enrich.ts` | raw + stored context → `CarListing` |
| `classes/autos/stats.ts` | `quantile` |
| `classes/autos/sources/mercadolibre.ts` | bridge URLs, page validation, `toRawCar`, brand→model harvest |
| `classes/autos/analyze.ts` | eligibility, cohorts, tiers, detail verdict, `analyzeCars` |
| `classes/autos/market.ts` | per-model descriptive market snapshots |
| `classes/autos/detail.ts` | parse an ML vehicle page, fetch candidate pages |
| `classes/autos/project.ts` | public projections: catalog rows + meta, opportunity snapshot |
| `classes/autos/store.ts` | APP DB reads/writes + pure store rules |
| `classes/models/Car{Listing,HarvestMeta,CatalogMeta,MarketSnapshot,OpportunitySnapshot}.ts` | appModel schemas |
| `sync_autos.ts`, `scripts/run-autos.sh` | entrypoint + flock wrapper |
| `tests/autos/*.test.ts` | backend tests |
| `docs/app/AUTOS.md` | operating doc |

App:

| file | responsibility |
|---|---|
| `app/utils/carsPublic.ts` | mirror of the wire contract |
| `app/utils/cars.ts` | query normalization, Mongo match/sort, opportunity query, labels, formatting |
| `app/server/models/CarCatalog.ts`, `CarCatalogMeta.ts`, `CarMarketSnapshot.ts`, `CarOpportunitySnapshot.ts` | read models |
| `app/server/utils/cars.ts` | public row rebuild + cached loaders |
| `app/server/api/cars/index.get.ts`, `cars/ficha/[key].get.ts`, `cars/market/[slug].get.ts`, `car-opportunities.get.ts` | APIs |
| `app/components/cars/{ListingCard,Filters,MarketTable,OpportunityCard}.vue` | UI parts |
| `app/pages/autos-usados-uruguay/index.vue`, `[key].vue`, `precios/[slug].vue`, `app/pages/oportunidades-autos-usados-uruguay.vue` | pages |

---

### Task 1: Types, normalization and enrichment

**Files:**
- Create: `classes/autos/types.ts`, `classes/autos/publicTypes.ts`, `classes/autos/normalize.ts`, `classes/autos/enrich.ts`, `classes/autos/stats.ts`
- Test: `tests/autos/normalize.test.ts`

**Interfaces:**
- Produces: all types in `types.ts` / `publicTypes.ts`; from normalize.ts `fold`, `slugify`, `wordText`, `engineOf`, `trimOf`, `trimLabel`, `kmQuality`, `transmissionOf`, `fuelOf`, `parsePrimaryAttribute`, `parseCarLocation`, `CAR_DEPARTMENTS`, `descriptionFlags`, `titleFlags`, `cleanPublicText`; from enrich.ts `EnrichContext`, `carKey`, `priceDropOf`, `enrichCarListing`; from stats.ts `quantile`.

- [ ] **Step 1: Write `classes/autos/types.ts`**

```ts
// Internal shapes of the used-car directory (/autos-usados-uruguay). Public wire shapes live in
// ./publicTypes.ts; nothing here is served as-is.
export type CarCurrency = "USD" | "UYU";
export type CarTransmission = "manual" | "automatica";
export type CarFuel = "nafta" | "diesel" | "electrico" | "hibrido" | "gnc";
export type CarSellerType = "dealer" | "private";
export type CarKmQuality = "ok" | "placeholder" | "unknown";
export type CarTextFlag = "damaged" | "financing" | "foreign_plate" | "paperwork" | "price_mismatch" | "recovered";

export interface RawCarListing {
  id: string;
  source: "mercadolibre";
  brandId: string;
  brand: string;
  modelId: string;
  model: string;
  title: string;
  year: number;
  km: number | null;
  price: number;
  currency: CarCurrency;
  transmission: CarTransmission | null;
  fuel: CarFuel | null;
  neighborhood: string | null;
  department: string | null;
  sellerType: CarSellerType | null;
  sellerId: string | null;
  picture: string | null;
  pictureCount: number | null;
  permalink: string;
  observedAt: string;
}

export interface CarModelVocabulary {
  brandId: string;
  modelId: string;
  trims: string[];
}

export interface CarHarvestGap {
  brandId: string;
  brand: string;
  missing: number;
}

export interface CarHarvestResult {
  mode: "full" | "fast";
  startedAt: string;
  finishedAt: string;
  listings: RawCarListing[];
  vocabularies: CarModelVocabulary[];
  requests: number;
  pages: number;
  failedPages: number;
  rejectedCards: number;
  /** Brands whose every page answered. Only these may count an unseen advert as missing. */
  completeBrands: string[];
  gaps: CarHarvestGap[];
  reportedTotal: number | null;
  note: string | null;
}

export interface CarPricePoint {
  price: number;
  currency: CarCurrency;
  observedAt: string;
}

export interface CarDetail {
  readAt: string;
  price: number;
  currency: CarCurrency;
  active: boolean;
  brand: string | null;
  model: string | null;
  year: number | null;
  km: number | null;
  version: string | null;
  engineText: string | null;
  sellerName: string | null;
  bodyType: string | null;
  color: string | null;
  doors: number | null;
  flags: CarTextFlag[];
  /** Private: never projected to a public collection. */
  description: string;
}

export interface StoredCar {
  key: string;
  firstSeen: string;
  lastSeen: string;
  listing: RawCarListing;
  priceHistory: CarPricePoint[];
  retiredAt: string | null;
  missedFullSweeps: number;
  detail: CarDetail | null;
}

export interface CarListing extends RawCarListing {
  key: string;
  brandSlug: string;
  modelSlug: string;
  marketSlug: string;
  engine: string | null;
  trim: string | null;
  trimLabel: string | null;
  kmQuality: CarKmQuality;
  flags: CarTextFlag[];
  priceUsd: number;
  priceConverted: boolean;
  firstSeen: string;
  lastSeen: string;
  priceDrop: { from: number; currency: CarCurrency; since: string } | null;
  detail: CarDetail | null;
}
```

- [ ] **Step 2: Write `classes/autos/publicTypes.ts`**

```ts
// Public wire contract of the used-car directory. app/utils/carsPublic.ts mirrors this file and
// tests/autos/contracts.test.ts fails when the two drift.
export type PublicCarCurrency = "USD" | "UYU";
export type PublicCarFuel = "nafta" | "diesel" | "electrico" | "hibrido" | "gnc";
export type PublicCarTransmission = "manual" | "automatica";
export type PublicCarSeller = "dealer" | "private";
export type PublicCarFlag = "damaged" | "financing" | "foreign_plate" | "paperwork" | "price_mismatch" | "recovered";
export type PublicCarTier = "strict" | "exploratory";

export interface PublicCarListing {
  key: string;
  brand: string;
  brandSlug: string;
  model: string;
  modelSlug: string;
  marketSlug: string;
  title: string;
  year: number;
  km: number | null;
  price: number;
  currency: PublicCarCurrency;
  priceUsd: number;
  priceConverted: boolean;
  transmission: PublicCarTransmission | null;
  fuel: PublicCarFuel | null;
  engine: string | null;
  trim: string | null;
  department: string | null;
  neighborhood: string | null;
  sellerType: PublicCarSeller | null;
  dealerName: string | null;
  picture: string | null;
  pictureCount: number | null;
  permalink: string;
  firstSeen: string;
  lastSeen: string;
  priceDrop: { from: number; currency: PublicCarCurrency; since: string } | null;
  flags: PublicCarFlag[];
  opportunity: { tier: PublicCarTier; gap: number; median: number; n: number } | null;
}

export interface PublicCarModelSummary {
  slug: string;
  brand: string;
  model: string;
  listings: number;
}

export interface PublicCarCatalogMeta {
  key: "uy-cars";
  generatedAt: string;
  freshDays: number;
  sourceCoverage: "partial";
  listings: number;
  usdUyu: number;
  lastFullReadAt: string | null;
  lastReadAt: string | null;
  reportedTotal: number | null;
  opportunities: number;
  models: PublicCarModelSummary[];
}

export interface PublicCarMarketRow {
  year: number;
  trim: string | null;
  engine: string | null;
  transmission: PublicCarTransmission | null;
  n: number;
  sellers: number;
  p25: number;
  median: number;
  p75: number;
  kmMedian: number;
}

export interface PublicCarMarketSnapshot {
  version: 1;
  slug: string;
  brand: string;
  model: string;
  brandSlug: string;
  modelSlug: string;
  generatedAt: string;
  listings: number;
  years: PublicCarMarketRow[];
  rows: PublicCarMarketRow[];
}

export interface PublicCarComparable {
  key: string;
  title: string;
  year: number;
  km: number;
  priceUsd: number;
  trim: string | null;
  engine: string | null;
  sellerType: PublicCarSeller | null;
  permalink: string;
  lastSeen: string;
}

export interface PublicCarSample {
  n: number;
  sellers: number;
  dealers: number;
  privates: number;
  p25: number;
  median: number;
  p75: number;
  spread: number;
  kmMedian: number;
  kmP75: number;
}

export interface PublicCarOpportunityItem {
  subject: PublicCarListing;
  tier: PublicCarTier;
  gap: number;
  conservativeGap: number;
  sellerSensitivityGap: number;
  sample: PublicCarSample;
  comparables: PublicCarComparable[];
  detailReadAt: string;
}

export interface PublicCarTierPolicy {
  minimumComparables: number;
  minimumSellers: number;
  maximumSpread: number;
  minimumGap: number;
  minimumConservativeGap: number;
  minimumSellerSensitivityGap: number;
}

export interface PublicCarOpportunityPolicy {
  freshDays: number;
  kmToleranceRatio: number;
  kmToleranceMin: number;
  maximumPerSeller: number;
  maximumGap: number;
  strict: PublicCarTierPolicy;
  exploratory: PublicCarTierPolicy;
}

export interface PublicCarOpportunityStats {
  input: number;
  eligible: number;
  analyzed: number;
  candidates: number;
  verified: number;
  strict: number;
  exploratory: number;
  review: number;
  excluded: Record<string, number>;
  rejectedByDetail: Record<string, number>;
}

export interface PublicCarOpportunitySnapshot {
  version: 1;
  algorithm: "car-cohort-v1";
  generatedAt: string;
  usdUyu: number;
  policy: PublicCarOpportunityPolicy;
  items: PublicCarOpportunityItem[];
  stats: PublicCarOpportunityStats;
}
```

- [ ] **Step 3: Write the failing test `tests/autos/normalize.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  cleanPublicText, descriptionFlags, engineOf, fuelOf, kmQuality, parseCarLocation, parsePrimaryAttribute,
  slugify, titleFlags, transmissionOf, trimLabel, trimOf,
} from "../../classes/autos/normalize";
import { enrichCarListing, priceDropOf } from "../../classes/autos/enrich";
import { quantile } from "../../classes/autos/stats";
import type { RawCarListing } from "../../classes/autos/types";

describe("engineOf", () => {
  it.each([
    ["Chevrolet Onix 1.0t Hb Premier At", "1.0T"],
    ["Chevrolet Onix 1.0 Ltz Turbo", "1.0T"],
    ["Volkswagen Golf 1.4 Tsi Highline", "1.4T"],
    ["Peugeot 208 1.2 Active 82cv 5p", "1.2"],
    ["Leapmotor C10 0.0 (69,9 Kwh) Rwd", "EV"],
    ["Baw L7 0km Ev Electrico - 5 Puertas", null],
    ["Baw L7 2026 Retira U$d 7.990 Y Financia", null],
    ["Volkswagen Gol Trendline 2021", null],
  ])("%s -> %s", (title, engine) => {
    expect(engineOf(title)).toBe(engine);
  });
});

describe("trimOf", () => {
  const hb20 = ["Premium", "Confort", "Comfort plus", "Comfort", "Unique", "Sport"];
  it("prefers the longest vocabulary match that contains the others", () => {
    expect(trimOf("Hyundai Hb20 1.6 Comfort Plus 5p", hb20)).toBe("comfort plus");
    expect(trimOf("Hyundai Hb20 1.0 Comfort Mt", hb20)).toBe("comfort");
  });
  it("refuses two unrelated matches instead of guessing", () => {
    expect(trimOf("Volkswagen Gol Power Plus 1.6", ["Power", "Plus", "Trendline"])).toBeNull();
    expect(trimOf("Chevrolet Onix Joy Lt Full 2020", ["Joy", "Lt", "Ltz"])).toBeNull();
  });
  it("matches whole words only and ignores accents", () => {
    expect(trimOf("Chevrolet Onix 1.4 Ltz Mt 98cv", ["Lt", "Ltz"])).toBe("ltz");
    expect(trimOf("Renault Clio Authentiqué", ["Authentique"])).toBe("authentique");
    expect(trimOf("Peugeot 208", ["Active"])).toBeNull();
  });
  it("keeps the vocabulary label for display", () => {
    expect(trimLabel("comfort plus", hb20)).toBe("Comfort plus");
    expect(trimLabel(null, hb20)).toBeNull();
  });
});

describe("kmQuality", () => {
  it.each([
    [111111, "placeholder"], [1, "placeholder"], [385, "placeholder"], [1111111, "placeholder"],
    [11111, "placeholder"], [44000, "ok"], [150000, "ok"], [null, "unknown"],
  ])("%s -> %s", (km, quality) => {
    expect(kmQuality(km as number | null)).toBe(quality);
  });
});

describe("card labels", () => {
  it("reads transmission and fuel variants", () => {
    expect(transmissionOf("Automática secuencial")).toBe("automatica");
    expect(transmissionOf("Automática CVT")).toBe("automatica");
    expect(transmissionOf("Manual")).toBe("manual");
    expect(transmissionOf("111.111 Km")).toBeNull();
    expect(fuelOf("Híbrido/Diesel")).toBe("hibrido");
    expect(fuelOf("Nafta/GNC")).toBe("gnc");
    expect(fuelOf("Diésel")).toBe("diesel");
    expect(fuelOf("Eléctrico")).toBe("electrico");
    expect(fuelOf("Nafta")).toBe("nafta");
  });
  it("parses year and km from primary_attribute", () => {
    expect(parsePrimaryAttribute("2017 | 111111 km", 2027)).toEqual({ year: 2017, km: 111111 });
    expect(parsePrimaryAttribute("2031 | 10 km", 2027)).toEqual({ year: null, km: 10 });
    expect(parsePrimaryAttribute("", 2027)).toEqual({ year: null, km: null });
  });
  it("parses both location formats and the seller type", () => {
    expect(parseCarLocation("{icon_location} Salto, SA • Concesionaria")).toEqual({
      neighborhood: null, department: "Salto", sellerType: "dealer",
    });
    expect(parseCarLocation("{icon_location} Brazo Oriental, MO • Vendedor Particular")).toEqual({
      neighborhood: "Brazo Oriental", department: "Montevideo", sellerType: "private",
    });
    expect(parseCarLocation("Fray Bentos - Río Negro")).toEqual({
      neighborhood: "Fray Bentos", department: "Río Negro", sellerType: null,
    });
    expect(parseCarLocation("Montevideo, MO")).toEqual({ neighborhood: null, department: "Montevideo", sellerType: null });
    expect(parseCarLocation("Treinta Y Tres, TT • Vendedor Particular").department).toBe("Treinta y Tres");
    expect(parseCarLocation("Rivera, RI").department).toBe("Rivera");
    expect(parseCarLocation("Florida, FL").department).toBe("Florida");
    expect(parseCarLocation("Trinidad, FS").department).toBe("Flores");
  });
});

describe("text flags", () => {
  it("flags damage but honours negation", () => {
    expect(descriptionFlags("Jac J2 Chocado Entero O Por Partes")).toEqual(["damaged"]);
    expect(descriptionFlags("Nunca fue chocado, sin deudas, impecable")).toEqual([]);
    expect(descriptionFlags("Motor a reparar, se vende como está")).toEqual(["damaged"]);
    expect(descriptionFlags("No tiene deudas. Papeles al día")).toEqual([]);
    expect(descriptionFlags("Recuperado de seguro, todo en regla")).toEqual(["recovered"]);
    expect(descriptionFlags("Vendo peugeot chapa brasilera")).toEqual(["foreign_plate"]);
    expect(descriptionFlags("Matrícula Mercosur, patente paga")).toEqual([]);
    expect(descriptionFlags("Transferencia de leasing")).toEqual(["paperwork"]);
  });
  it("flags down-payment titles and a second price in the title", () => {
    expect(titleFlags("Topcaruy Usd 5500 Cuotas En Pesos", 10900, "USD")).toEqual(["financing", "price_mismatch"]);
    expect(titleFlags("Geely Coolray Entrega 10 Y Cuot", 21990, "USD")).toEqual(["financing"]);
    expect(titleFlags("Chevrolet Ónix Joy Lt Full 2020 Liquido U$s9900", 10900, "USD")).toEqual(["price_mismatch"]);
    expect(titleFlags("Peugeot 208 Extra Full 1.6 2025 Financio Garzón Automóviles", 16990, "USD")).toEqual([]);
    expect(titleFlags("Renault Kwid 1.0 Sce 66cv Life", 8700, "USD")).toEqual([]);
    expect(titleFlags("Toyota Hilux 2.7 Cd Srv Vvti 4x2 - A3", 19900, "USD")).toEqual([]);
  });
  it("removes contact data from public text", () => {
    expect(cleanPublicText("Gol 2015 llamar 099 123 456 o mail a@b.com")).toBe("Gol 2015 llamar o mail");
  });
});

describe("enrichment", () => {
  const raw: RawCarListing = {
    id: "MLU700355317", source: "mercadolibre", brandId: "b", brand: "Mercedes-Benz", modelId: "m", model: "Clase C",
    title: "Mercedes-benz Clase C 1.8 C200 Avantgarde", year: 2012, km: 150000, price: 16000, currency: "USD",
    transmission: "automatica", fuel: "nafta", neighborhood: "Pocitos", department: "Montevideo", sellerType: "private",
    sellerId: "1", picture: null, pictureCount: 3, permalink: "https://auto.mercadolibre.com.uy/MLU-700355317-x-_JM",
    observedAt: "2026-09-16T10:00:00.000Z",
  };
  it("derives slugs, engine, trim, km quality and USD price", () => {
    const car = enrichCarListing(raw, {
      usdUyu: 40, trims: ["Avantgarde"], firstSeen: "2026-09-10T00:00:00.000Z", lastSeen: raw.observedAt,
      priceHistory: [], detail: null,
    });
    expect(car).toMatchObject({
      key: "ml-MLU700355317", brandSlug: "mercedes-benz", modelSlug: "clase-c", marketSlug: "mercedes-benz-clase-c",
      engine: "1.8", trim: "avantgarde", trimLabel: "Avantgarde", kmQuality: "ok", priceUsd: 16000, priceConverted: false,
      flags: [], priceDrop: null,
    });
    expect(slugify("Citroën C3 Aircross")).toBe("citroen-c3-aircross");
  });
  it("converts pesos with the cycle rate and marks it", () => {
    const car = enrichCarListing({ ...raw, price: 1115000, currency: "UYU" }, {
      usdUyu: 40, trims: [], firstSeen: raw.observedAt, lastSeen: raw.observedAt, priceHistory: [], detail: null,
    });
    expect(car.priceUsd).toBe(27875);
    expect(car.priceConverted).toBe(true);
  });
  it("reports a price drop only against the previous observed price", () => {
    expect(priceDropOf(raw, [
      { price: 17500, currency: "USD", observedAt: "2026-09-01T00:00:00.000Z" },
      { price: 16000, currency: "USD", observedAt: "2026-09-12T00:00:00.000Z" },
    ])).toEqual({ from: 17500, currency: "USD", since: "2026-09-12T00:00:00.000Z" });
    expect(priceDropOf(raw, [{ price: 16000, currency: "USD", observedAt: "2026-09-12T00:00:00.000Z" }])).toBeNull();
    expect(priceDropOf(raw, [
      { price: 15000, currency: "USD", observedAt: "2026-09-01T00:00:00.000Z" },
      { price: 16000, currency: "USD", observedAt: "2026-09-12T00:00:00.000Z" },
    ])).toBeNull();
  });
});

describe("quantile", () => {
  it("interpolates linearly", () => {
    expect(quantile([10, 20, 30, 40], 0.5)).toBe(25);
    expect(quantile([40, 10, 30, 20], 0.25)).toBe(17.5);
    expect(Number.isNaN(quantile([], 0.5))).toBe(true);
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npx vitest run tests/autos/normalize.test.ts`
Expected: FAIL — cannot resolve `../../classes/autos/normalize`.

- [ ] **Step 5: Write `classes/autos/stats.ts`**

```ts
/** Linear-interpolation quantile (the definition the property opportunity engine uses). */
export function quantile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (index - lower);
}
```

- [ ] **Step 6: Write `classes/autos/normalize.ts`**

```ts
// Pure parsing for Mercado Libre used-car cards. Every rule was measured on the 2,279-card sample
// of 2026-09-16 (see the spec): version-by-title agreed with ML's own facet 494 of 498 times, and
// 47 cards carried placeholder km such as 111.111.
import type { CarCurrency, CarFuel, CarKmQuality, CarSellerType, CarTextFlag, CarTransmission } from "./types";

export function fold(text: string): string {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function slugify(text: string): string {
  return fold(text).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** " word word " with dots kept ("1.0" survives), so whole-word matching is a plain includes(). */
export function wordText(text: string): string {
  return ` ${fold(text).replace(/[^a-z0-9.]+/g, " ").trim()} `;
}

const TURBO = /\b(turbo|tsi|tfsi|thp)\b/;

/** "1.0T", "1.6", "EV" (0.0 is how ML writes electric versions) or null. */
export function engineOf(title: string): string | null {
  const text = fold(title);
  const match = /(?:^|[^\d.])(\d\.\d)(?!\d)\s*(t\b|turbo\b|tsi\b|tfsi\b|thp\b)?/.exec(text);
  if (!match) return null;
  if (match[1] === "0.0") return "EV";
  return `${match[1]}${match[2] || TURBO.test(text) ? "T" : ""}`;
}

/** The model's SHORT_VERSION name found in the title. The longest wins only if it contains the rest. */
export function trimOf(title: string, vocabulary: readonly string[]): string | null {
  const text = wordText(title);
  const names = [...new Set(vocabulary.map(name => wordText(name).trim()).filter(Boolean))];
  const hits = names.filter(name => text.includes(` ${name} `)).sort((a, b) => b.length - a.length);
  if (!hits.length) return null;
  const [top, ...rest] = hits;
  return rest.every(hit => ` ${top} `.includes(` ${hit} `)) ? top! : null;
}

export function trimLabel(trim: string | null, vocabulary: readonly string[]): string | null {
  if (!trim) return null;
  return vocabulary.find(name => wordText(name).trim() === trim) ?? trim;
}

/** Placeholder km (1, 111, 111.111…) never enters a statistic. */
export function kmQuality(km: number | null): CarKmQuality {
  if (km === null || !Number.isFinite(km)) return "unknown";
  if (km < 1_000 || km > 1_000_000 || /^(\d)\1+$/.test(String(Math.round(km)))) return "placeholder";
  return "ok";
}

export function transmissionOf(label: string): CarTransmission | null {
  const text = fold(label);
  if (/\bmanual\b/.test(text)) return "manual";
  if (/automat|\bcvt\b|\bdht\b|secuencial/.test(text)) return "automatica";
  return null;
}

export function fuelOf(label: string): CarFuel | null {
  const text = fold(label);
  if (/hibrido/.test(text)) return "hibrido";
  if (/electrico/.test(text)) return "electrico";
  if (/\bgnc\b/.test(text)) return "gnc";
  if (/diesel/.test(text)) return "diesel";
  if (/nafta|gasolina/.test(text)) return "nafta";
  return null;
}

export function parsePrimaryAttribute(value: string, maxYear: number): { year: number | null; km: number | null } {
  const [yearText = "", kmText = ""] = String(value || "").split("|").map(part => part.trim());
  const year = /^\d{4}$/.test(yearText) && Number(yearText) >= 1950 && Number(yearText) <= maxYear ? Number(yearText) : null;
  const digits = kmText.replace(/[^\d]/g, "");
  return { year, km: digits && /km/i.test(kmText) ? Number(digits) : null };
}

const DEPARTMENT_CODES: Readonly<Record<string, string>> = {
  AR: "Artigas", CA: "Canelones", CL: "Cerro Largo", CO: "Colonia", DU: "Durazno", FS: "Flores", FL: "Florida",
  LA: "Lavalleja", MA: "Maldonado", MO: "Montevideo", PA: "Paysandú", RN: "Río Negro", RI: "Rivera", RO: "Rocha",
  SA: "Salto", SJ: "San José", SO: "Soriano", TA: "Tacuarembó", TT: "Treinta y Tres",
};
export const CAR_DEPARTMENTS: readonly string[] = Object.values(DEPARTMENT_CODES).sort((a, b) => a.localeCompare(b, "es"));

const departmentNamed = (name: string): string | null => CAR_DEPARTMENTS.find(d => fold(d) === fold(name.trim())) ?? null;

/** "Barrio, MO • Concesionaria" | "Barrio - Montevideo" | "Barrio, Montevideo". */
export function parseCarLocation(text: string): { neighborhood: string | null; department: string | null; sellerType: CarSellerType | null } {
  const clean = String(text || "").replace(/\{[^}]*\}/g, "").replace(/\s+/g, " ").trim();
  const [place = "", seller = ""] = clean.split("•").map(part => part.trim());
  const sellerType: CarSellerType | null = /concesionaria/i.test(seller) ? "dealer" : /particular|due[nñ]o/i.test(seller) ? "private" : null;
  let neighborhood: string | null = null;
  let department: string | null = null;
  const coded = /^(.*),\s*([A-Z]{2})$/.exec(place);
  const dashed = /^(.*?)\s+-\s+(.+)$/.exec(place);
  const comma = /^(.*),\s*(.+)$/.exec(place);
  if (coded) {
    neighborhood = coded[1]!.trim();
    department = DEPARTMENT_CODES[coded[2]!] ?? null;
  } else if (dashed && departmentNamed(dashed[2]!)) {
    neighborhood = dashed[1]!.trim();
    department = departmentNamed(dashed[2]!);
  } else if (comma && departmentNamed(comma[2]!)) {
    neighborhood = comma[1]!.trim();
    department = departmentNamed(comma[2]!);
  } else {
    department = departmentNamed(place);
  }
  if (!neighborhood || (department && fold(neighborhood) === fold(department))) neighborhood = null;
  return { neighborhood, department, sellerType };
}

const NEGATION = /\b(no|nunca|sin|jamas|cero|libre de|ni|tampoco)\s+(?:[a-z]+\s+){0,2}$/;

function affirmed(text: string, source: string): boolean {
  const pattern = new RegExp(source, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const before = text.slice(Math.max(0, match.index - 40), match.index);
    if (!NEGATION.test(before)) return true;
  }
  return false;
}

// Plural/gender tolerant on purpose: `rueda\b` never matched "Ruedas" in the chair directory.
const DESCRIPTION_FLAGS: ReadonlyArray<[CarTextFlag, string]> = [
  ["damaged", "\\b(chocad[oa]s?|a reparar|para reparar|a arreglar|para repuestos?|por partes|no arranca|siniestrad[oa]s?|incendiad[oa]s?|inundad[oa]s?|para desarme|(?:motor|caja) (?:fundid[oa]|rot[oa]|trancad[oa]|a reparar))\\b"],
  ["recovered", "\\b(recuperad[oa]s? (?:de|por|del) (?:robo|hurto|seguro|aseguradora)|de aseguradora|ex seguro)\\b"],
  ["paperwork", "\\b(sin (?:papeles|titulo|libreta|documentos)|con deudas?|tiene deudas?|embargad[oa]s?|remate|leasing|sucesion)\\b"],
  ["foreign_plate", "\\b(?:chapa|placa|matricula|patente|empadronad[oa])s? (?:en |de )?(?:argentin[oa]|brasil(?:en[oa]|er[oa])?|paraguay[oa]?|extranjer[oa])\\b"],
];

const flatText = (text: string): string => ` ${fold(text).replace(/[^a-z0-9$.,]+/g, " ").replace(/\s+/g, " ").trim()} `;

export function descriptionFlags(text: string): CarTextFlag[] {
  const flat = flatText(text);
  return DESCRIPTION_FLAGS.filter(([, source]) => affirmed(flat, source)).map(([flag]) => flag).sort();
}

function amountOf(text: string): number {
  return Number(text.replace(/[.,](?=\d{3}\b)/g, "").replace(/[^\d]/g, ""));
}

/** Title-only signals: a down payment in the headline, or a second price that is not the listed one. */
export function titleFlags(title: string, price: number, currency: CarCurrency): CarTextFlag[] {
  const flags = new Set<CarTextFlag>(descriptionFlags(title));
  const text = flatText(title);
  const stripped = text
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\b\d\.\d\w*/g, " ")
    .replace(/\b\d+ ?(cv|hp|p|puertas|km|kms|v)\b/g, " ")
    .replace(/\b\dx\d\b/g, " ");
  if (/\b(entrega|anticipo|cuotas?|cuot|retira\w*)\b/.test(text) && /\d{2,}|u\$[sd]|\busd\b|us\$/.test(stripped)) flags.add("financing");
  if (currency === "USD") {
    const pattern = /(?:u\$[sd]|us\$|\busd|\bdolares?)\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,6})/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(stripped))) {
      const amount = amountOf(match[1]!);
      if (amount > 0 && Math.abs(amount - price) > price * 0.02) flags.add("price_mismatch");
    }
  }
  return [...flags].sort();
}

/** Titles are seller prose: drop phone numbers and emails before anything is published. */
export function cleanPublicText(text: string): string {
  return String(text || "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, " ")
    .replace(/\b0?9\d[\s-]?\d{3}[\s-]?\d{3}\b/g, " ")
    .replace(/\b\d{4}[\s-]?\d{4}\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}
```

- [ ] **Step 7: Write `classes/autos/enrich.ts`**

```ts
import { engineOf, kmQuality, slugify, titleFlags, trimLabel, trimOf } from "./normalize";
import type { CarDetail, CarListing, CarPricePoint, RawCarListing } from "./types";

export interface EnrichContext {
  usdUyu: number;
  trims: readonly string[];
  firstSeen: string;
  lastSeen: string;
  priceHistory: readonly CarPricePoint[];
  detail: CarDetail | null;
}

export function carKey(id: string): string {
  return `ml-${id}`;
}

/** A drop we OBSERVED: the previous stored price was higher, in the same currency. */
export function priceDropOf(listing: Pick<RawCarListing, "price" | "currency">, history: readonly CarPricePoint[]): CarListing["priceDrop"] {
  if (history.length < 2) return null;
  const current = history[history.length - 1]!;
  const previous = history[history.length - 2]!;
  if (current.price !== listing.price || current.currency !== listing.currency) return null;
  if (previous.currency !== listing.currency || previous.price <= listing.price) return null;
  return { from: previous.price, currency: listing.currency, since: current.observedAt };
}

export function enrichCarListing(raw: RawCarListing, context: EnrichContext): CarListing {
  const trim = trimOf(raw.title, context.trims);
  const brandSlug = slugify(raw.brand);
  const modelSlug = slugify(raw.model);
  const flags = new Set([...titleFlags(raw.title, raw.price, raw.currency), ...(context.detail?.flags ?? [])]);
  return {
    ...raw,
    key: carKey(raw.id),
    brandSlug,
    modelSlug,
    marketSlug: `${brandSlug}-${modelSlug}`,
    engine: raw.fuel === "electrico" ? "EV" : engineOf(raw.title),
    trim,
    trimLabel: trimLabel(trim, context.trims),
    kmQuality: kmQuality(raw.km),
    flags: [...flags].sort(),
    priceUsd: raw.currency === "USD" ? raw.price : Math.round(raw.price / context.usdUyu),
    priceConverted: raw.currency !== "USD",
    firstSeen: context.firstSeen,
    lastSeen: context.lastSeen,
    priceDrop: priceDropOf(raw, context.priceHistory),
    detail: context.detail,
  };
}
```

- [ ] **Step 8: Run tests until green**

Run: `npx vitest run tests/autos/normalize.test.ts`
Expected: PASS. The test strings are real ML titles: if one fails, fix the regex, never the expectation.

- [ ] **Step 9: Commit**

```bash
git add classes/autos tests/autos/normalize.test.ts
git commit -m "feat(autos): tipos y normalizacion de avisos de autos usados"
```

---

### Task 2: Mercado Libre harvester

**Files:**
- Create: `classes/autos/sources/mercadolibre.ts`
- Test: `tests/autos/mercadolibre.test.ts`

**Interfaces:**
- Consumes: `fetchJson<T>(url, { timeoutMs, retries, unthrottled }) => Promise<T | null>` from `classes/rentals/net`; `collectPolycards(payload: unknown)` from `classes/rentals/sources/mercadolibre`; Task 1 normalize helpers.
- Produces: `ML_CARS_CATEGORY`, `ML_USED_CONDITION`, `ML_PAGE_SIZE`, `ML_OFFSET_CEILING`, `MLCarCard`, `MLCarPage`, `mlCarsApiBase()`, `carSearchUrl(filters, offset, apiBase?)`, `facetValues(page, id)`, `pageMatches(page, filters, offset)`, `toRawCar(card, context: CardContext)`, `drainTasks(tasks, concurrency)`, `CarHarvestOptions`, `harvestMercadoLibreCars(options): Promise<CarHarvestResult>`.

- [ ] **Step 1: Write the failing test `tests/autos/mercadolibre.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchJson = vi.fn();
vi.mock("../../classes/rentals/net", () => ({ fetchJson: (...args: unknown[]) => fetchJson(...args) }));

import {
  carSearchUrl, harvestMercadoLibreCars, pageMatches, toRawCar, type MLCarCard, type MLCarPage,
} from "../../classes/autos/sources/mercadolibre";

function card(id: string, overrides: Record<string, string> = {}): { polycard: MLCarCard } {
  const params = new URLSearchParams({
    title: "Chevrolet Onix 1.4 Ltz Mt 98cv", primary_attribute: "2015 | 140000 km", price: "7990.0", currency_id: "USD",
    condition: "Usado", seller_id: "188917387", picture: "http://http2.mlstatic.com/D_NQ_NP_2X_1-MLU1-V.webp",
    permalink: `https://auto.mercadolibre.com.uy/MLU-${id.slice(3)}-chevrolet-onix-_JM`, ...overrides,
  });
  return {
    polycard: {
      metadata: { id, category_id: "MLU1744", url_params: `?${params}` },
      pictures: { quantity: 15 },
      components: [
        { type: "price", price: { current_price: { value: Number(params.get("price")), currency: params.get("currency_id") || "USD" } } },
        { type: "labels", labels: { labels: [{ text: "{icon_kilometers} 140.000 Km" }, { text: "{icon_transmission} Manual" }, { text: "{icon_fuel_type} Nafta" }] } },
        { type: "location", location: { text: "{icon_location} Prado, MO • Concesionaria" } },
      ],
    },
  };
}

function page(options: { offset: number; total: number; applied: Record<string, string>; cards?: unknown[]; facets?: Record<string, Array<{ id: string; name: string; results: number }>> }): MLCarPage {
  const applied = { ITEM_CONDITION: "2230581", ...options.applied };
  return {
    paging: { total: options.total, offset: options.offset },
    filters: Object.entries(applied).map(([id, value]) => ({ id, values: [{ id: value }] })),
    available_filters: Object.entries(options.facets || {}).map(([id, values]) => ({ id, values })),
    components: options.cards || [],
  };
}

const context = { brandId: "58955", brand: "Chevrolet", modelId: "123123", model: "Onix", observedAt: "2026-09-16T10:00:00.000Z", maxYear: 2027 };

describe("toRawCar", () => {
  it("reads a used-car polycard", () => {
    expect(toRawCar(card("MLU700434767").polycard, context)).toEqual({
      id: "MLU700434767", source: "mercadolibre", brandId: "58955", brand: "Chevrolet", modelId: "123123", model: "Onix",
      title: "Chevrolet Onix 1.4 Ltz Mt 98cv", year: 2015, km: 140000, price: 7990, currency: "USD",
      transmission: "manual", fuel: "nafta", neighborhood: "Prado", department: "Montevideo", sellerType: "dealer",
      sellerId: "188917387", picture: "https://http2.mlstatic.com/D_NQ_NP_2X_1-MLU1-V.webp", pictureCount: 15,
      permalink: "https://auto.mercadolibre.com.uy/MLU-700434767-chevrolet-onix-_JM", observedAt: "2026-09-16T10:00:00.000Z",
    });
  });
  it("rejects ads, new cars, other categories, odd currencies and foreign links", () => {
    const pad = card("MLU1000001").polycard;
    expect(toRawCar({ ...pad, metadata: { ...pad.metadata, is_pad: "true" } }, context)).toBeNull();
    expect(toRawCar(card("MLU1000002", { condition: "Nuevo" }).polycard, context)).toBeNull();
    const rental = card("MLU1000003").polycard;
    expect(toRawCar({ ...rental, metadata: { ...rental.metadata, category_id: "MLU1473" } }, context)).toBeNull();
    const eur = card("MLU1000004", { currency_id: "EUR" }).polycard;
    eur.components = eur.components!.filter(part => part.type !== "price");
    expect(toRawCar(eur, context)).toBeNull();
    expect(toRawCar(card("MLU1000005", { permalink: "https://evil.example/MLU-1" }).polycard, context)).toBeNull();
    expect(toRawCar({ metadata: { id: "MLU1000006", category_id: "MLU1744" } }, context)).toBeNull();
  });
  it("never keeps a picture from another host", () => {
    expect(toRawCar(card("MLU1000007", { picture: "https://tracker.example/p.jpg" }).polycard, context)?.picture).toBeNull();
  });
});

describe("pageMatches", () => {
  it("rejects a page whose offset was reset or whose partition filter was dropped", () => {
    expect(pageMatches(page({ offset: 20, total: 50, applied: { BRAND: "1" } }), { BRAND: "1" }, 20)).toBe(true);
    expect(pageMatches(page({ offset: 0, total: 50, applied: { BRAND: "1" } }), { BRAND: "1" }, 20)).toBe(false);
    expect(pageMatches(page({ offset: 0, total: 50, applied: {} }), { BRAND: "1" }, 0)).toBe(false);
  });
  it("builds the bridge URL with the used-car category", () => {
    const url = new URL(carSearchUrl({ BRAND: "1", since: "today" }, 40, "http://bridge/mercadolibre"));
    expect(url.pathname).toBe("/mercadolibre/search");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      country: "UY", q: "autos", category: "MLU1744", "q.category": "MLU1744", ITEM_CONDITION: "2230581",
      raw: "true", limit: "20", BRAND: "1", since: "today", offset: "40",
    });
  });
});

describe("harvestMercadoLibreCars", () => {
  beforeEach(() => fetchJson.mockReset());

  function route(url: string): MLCarPage | null {
    const params = new URL(url).searchParams;
    const offset = Number(params.get("offset"));
    const brand = params.get("BRAND");
    const model = params.get("MODEL");
    if (!brand) return page({ offset, total: 25, applied: {}, facets: { BRAND: [{ id: "58955", name: "Chevrolet", results: 25 }] } });
    if (!model) {
      return page({ offset, total: 25, applied: { BRAND: brand }, facets: {
        MODEL: [{ id: "123123", name: "Onix", results: 22 }, { id: "999", name: "Spark", results: 3 }],
      } });
    }
    if (model === "123123") {
      const ids = offset === 0 ? Array.from({ length: 20 }, (_, i) => `MLU70000${100 + i}`) : ["MLU70000200", "MLU70000201"];
      return page({ offset, total: 22, applied: { BRAND: brand, MODEL: model }, cards: ids.map(id => card(id)),
        facets: offset === 0 ? { SHORT_VERSION: [{ id: "1", name: "Ltz", results: 9 }, { id: "2", name: "Joy", results: 5 }] } : {} });
    }
    return page({ offset, total: 3, applied: { BRAND: brand, MODEL: model }, cards: ["MLU80000001", "MLU80000002", "MLU80000003"].map(id => card(id)) });
  }

  it("walks brand -> model, assigns brand/model from the applied filters and keeps the version vocabulary", async () => {
    fetchJson.mockImplementation(async (url: string) => route(url));
    const result = await harvestMercadoLibreCars({ mode: "full", maxRequests: 100, maxDurationMs: 60_000, concurrency: 3, apiBase: "http://bridge/mercadolibre" });
    expect(result.listings).toHaveLength(25);
    expect(result.listings.find(l => l.id === "MLU80000001")).toMatchObject({ brand: "Chevrolet", model: "Spark", modelId: "999" });
    expect(result.vocabularies).toContainEqual({ brandId: "58955", modelId: "123123", trims: ["Joy", "Ltz"] });
    expect(result).toMatchObject({ failedPages: 0, completeBrands: ["58955"], reportedTotal: 25, gaps: [], note: null, requests: 5 });
  });

  it("marks the brand incomplete when a page comes back reset", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      const params = new URL(url).searchParams;
      if (params.get("MODEL") === "123123" && params.get("offset") === "20") return route(url.replace("offset=20", "offset=0"));
      return route(url);
    });
    const result = await harvestMercadoLibreCars({ mode: "full", maxRequests: 100, maxDurationMs: 60_000, concurrency: 1, apiBase: "http://bridge/mercadolibre" });
    expect(result.failedPages).toBe(1);
    expect(result.completeBrands).toEqual([]);
    expect(result.note).toMatch(/páginas sin respuesta/);
  });

  it("stops at the request budget and says so", async () => {
    fetchJson.mockImplementation(async (url: string) => route(url));
    const result = await harvestMercadoLibreCars({ mode: "full", maxRequests: 2, maxDurationMs: 60_000, concurrency: 1, apiBase: "http://bridge/mercadolibre" });
    expect(result.requests).toBe(2);
    expect(result.completeBrands).toEqual([]);
    expect(result.note).toMatch(/presupuesto/);
  });

  it("reports an unreachable bridge", async () => {
    fetchJson.mockResolvedValue(null);
    const result = await harvestMercadoLibreCars({ mode: "fast", maxRequests: 10, maxDurationMs: 60_000, concurrency: 2, apiBase: "http://bridge/mercadolibre" });
    expect(result.listings).toEqual([]);
    expect(result.note).toMatch(/no respondió/);
    expect(fetchJson.mock.calls[0]![0]).toContain("since=today");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/autos/mercadolibre.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `classes/autos/sources/mercadolibre.ts`**

```ts
// Mercado Libre Uruguay, category MLU1744 "Autos y Camionetas", read through the scraper bridge on
// the 104 box (pm2 `mercadolibre`, :9656) — the bridge rentals and chairs already use. The RAW
// search payload carries polycards with "2017 | 111111 km", transmission, fuel, location and seller
// type. Two facts measured on 2026-09-16 shape this file:
//   * an offset >= 4000 silently answers page 0, so every page is checked against paging.offset;
//   * no model has more than 4000 used adverts, so brand -> model partitions cover the category and
//     brand/model come from the APPLIED filter, never from guessing the title.
import { fetchJson } from "../../rentals/net";
import { collectPolycards } from "../../rentals/sources/mercadolibre";
import { fold, fuelOf, parseCarLocation, parsePrimaryAttribute, transmissionOf } from "../normalize";
import type { CarHarvestGap, CarHarvestResult, RawCarListing } from "../types";

export const ML_CARS_CATEGORY = "MLU1744";
export const ML_USED_CONDITION = "2230581";
export const ML_PAGE_SIZE = 20;
export const ML_OFFSET_CEILING = 4_000;
const PARTITION_KEYS = ["ITEM_CONDITION", "BRAND", "MODEL", "VEHICLE_YEAR"];

export interface MLFacetValue { id?: unknown; name?: unknown; results?: unknown }
export interface MLFacet { id?: unknown; values?: MLFacetValue[] }
export interface MLCarPage {
  paging?: { total?: unknown; offset?: unknown };
  filters?: MLFacet[];
  available_filters?: MLFacet[];
  components?: unknown;
}
export interface MLCarCard {
  metadata?: { id?: string; category_id?: string; url_params?: string; is_pad?: string };
  pictures?: { quantity?: unknown };
  components?: Array<{
    type?: string;
    title?: { text?: string };
    price?: { current_price?: { value?: number; currency?: string } };
    labels?: { labels?: Array<{ text?: string }> };
    location?: { text?: string };
  }>;
}

export function mlCarsApiBase(): string {
  return (process.env.AUTOS_ML_API || "http://104.234.204.107:9656/mercadolibre").replace(/\/+$/, "");
}

export function carSearchUrl(filters: Readonly<Record<string, string>>, offset: number, apiBase = mlCarsApiBase()): string {
  const params = new URLSearchParams({
    country: "UY", q: "autos", category: ML_CARS_CATEGORY, "q.category": ML_CARS_CATEGORY,
    ITEM_CONDITION: ML_USED_CONDITION, raw: "true", limit: String(ML_PAGE_SIZE),
    ...filters, offset: String(offset),
  });
  return `${apiBase}/search?${params}`;
}

function count(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function facetValues(page: MLCarPage, id: string): Array<{ id: string; name: string; results: number }> {
  const facet = (page.available_filters || []).find(filter => filter?.id === id);
  const values: Array<{ id: string; name: string; results: number }> = [];
  for (const value of facet?.values || []) {
    const valueId = typeof value?.id === "string" ? value.id : "";
    const name = typeof value?.name === "string" ? value.name.trim() : "";
    const results = count(value?.results);
    if (valueId && name && results) values.push({ id: valueId, name, results });
  }
  return values;
}

/** Only APPLIED partition filters and the exact offset prove the page is the one we asked for. */
export function pageMatches(page: MLCarPage, filters: Readonly<Record<string, string>>, offset: number): boolean {
  if (count(page.paging?.offset) !== offset) return false;
  const expected: Record<string, string> = { ITEM_CONDITION: ML_USED_CONDITION, ...filters };
  return Object.entries(expected)
    .filter(([id]) => PARTITION_KEYS.includes(id))
    .every(([id, value]) => (page.filters || []).some(filter =>
      filter?.id === id && (filter.values || []).some(item => item?.id === value)));
}

export interface CardContext {
  brandId: string;
  brand: string;
  modelId: string;
  model: string;
  observedAt: string;
  maxYear: number;
}

export function toRawCar(card: MLCarCard, context: CardContext): RawCarListing | null {
  const id = String(card.metadata?.id || "");
  if (!/^MLU\d{6,14}$/.test(id) || card.metadata?.category_id !== ML_CARS_CATEGORY || card.metadata?.is_pad === "true") return null;
  const query = String(card.metadata?.url_params || "");
  if (!query) return null;
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  const condition = params.get("condition");
  if (condition && fold(condition) !== "usado") return null;
  const part = (type: string) => card.components?.find(component => component.type === type);
  const title = String(params.get("title") || part("title")?.title?.text || "").replace(/\s+/g, " ").trim();
  const price = Number(part("price")?.price?.current_price?.value ?? params.get("price"));
  const currency = String(part("price")?.price?.current_price?.currency || params.get("currency_id") || "").toUpperCase();
  const permalink = String(params.get("permalink") || "");
  const primary = parsePrimaryAttribute(params.get("primary_attribute") || "", context.maxYear);
  if (!title || !(price > 0) || (currency !== "USD" && currency !== "UYU") || primary.year === null) return null;
  if (!permalink.startsWith("https://auto.mercadolibre.com.uy/MLU-")) return null;
  const labels = (part("labels")?.labels?.labels || [])
    .map(label => String(label?.text || "").replace(/\{[^}]*\}/g, "").trim())
    .filter(Boolean);
  const kmLabel = labels.find(label => /\bkm\b/i.test(label));
  const labelKm = kmLabel ? Number(kmLabel.replace(/[^\d]/g, "")) : NaN;
  const location = parseCarLocation(part("location")?.location?.text || params.get("location") || "");
  const sellerId = params.get("seller_id") || "";
  const picture = (params.get("picture") || params.get("thumbnail") || "").replace(/^http:\/\//, "https://");
  let transmission: RawCarListing["transmission"] = null;
  let fuel: RawCarListing["fuel"] = null;
  for (const label of labels) {
    transmission = transmission ?? transmissionOf(label);
    fuel = fuel ?? fuelOf(label);
  }
  return {
    id,
    source: "mercadolibre",
    brandId: context.brandId,
    brand: context.brand,
    modelId: context.modelId,
    model: context.model,
    title: title.slice(0, 200),
    year: primary.year,
    km: primary.km ?? (Number.isFinite(labelKm) ? labelKm : null),
    price,
    currency,
    transmission,
    fuel,
    neighborhood: location.neighborhood,
    department: location.department,
    sellerType: location.sellerType,
    sellerId: /^\d{1,15}$/.test(sellerId) ? sellerId : null,
    picture: /^https:\/\/http2\.mlstatic\.com\//.test(picture) ? picture : null,
    pictureCount: count(card.pictures?.quantity),
    permalink,
    observedAt: context.observedAt,
  };
}

type Task = () => Promise<Task[]>;

/** A dynamic work queue: a task may enqueue more tasks; `concurrency` bridge calls at a time. */
export async function drainTasks(initial: Task[], concurrency: number): Promise<void> {
  const queue = [...initial];
  let active = 0;
  await new Promise<void>(resolve => {
    const pump = (): void => {
      if (!queue.length && active === 0) {
        resolve();
        return;
      }
      while (active < concurrency && queue.length) {
        const task = queue.shift()!;
        active++;
        task()
          .then(more => { queue.push(...more); }, () => undefined)
          .finally(() => { active--; pump(); });
      }
    };
    pump();
  });
}

export interface CarHarvestOptions {
  mode: "full" | "fast";
  maxRequests: number;
  maxDurationMs: number;
  concurrency: number;
  apiBase?: string;
  now?: () => Date;
  onProgress?: (message: string) => void;
}

interface Named { id: string; name: string }

export async function harvestMercadoLibreCars(options: CarHarvestOptions): Promise<CarHarvestResult> {
  const clock = options.now ?? (() => new Date());
  const startedAt = clock().toISOString();
  const started = Date.now();
  const maxYear = new Date(startedAt).getUTCFullYear() + 1;
  const base: Record<string, string> = options.mode === "fast" ? { since: "today" } : {};
  const listings = new Map<string, RawCarListing>();
  const vocabularies = new Map<string, Set<string>>();
  const failedBrands = new Set<string>();
  const gaps: CarHarvestGap[] = [];
  let requests = 0;
  let pages = 0;
  let failedPages = 0;
  let rejectedCards = 0;
  let budgetCut = false;

  async function read(filters: Record<string, string>, offset: number): Promise<MLCarPage | null> {
    if (requests >= options.maxRequests || Date.now() - started >= options.maxDurationMs) {
      budgetCut = true;
      return null;
    }
    requests++;
    const page = await fetchJson<MLCarPage>(carSearchUrl({ ...base, ...filters }, offset, options.apiBase), {
      timeoutMs: 45_000, retries: 1, unthrottled: true,
    });
    if (!page || typeof page !== "object" || !pageMatches(page, filters, offset)) {
      failedPages++;
      return null;
    }
    pages++;
    return page;
  }

  function accept(page: MLCarPage, brand: Named, model: Named): void {
    const observedAt = clock().toISOString();
    const cards = collectPolycards(page.components ?? page) as unknown as MLCarCard[];
    for (const card of cards) {
      const raw = toRawCar(card, { brandId: brand.id, brand: brand.name, modelId: model.id, model: model.name, observedAt, maxYear });
      if (!raw) {
        rejectedCards++;
        continue;
      }
      if (!listings.has(raw.id)) listings.set(raw.id, raw);
    }
  }

  const modelTask = (brand: Named, model: Named, extra: Record<string, string> = {}): Task => async () => {
    const filters = { BRAND: brand.id, MODEL: model.id, ...extra };
    const first = await read(filters, 0);
    if (!first) {
      failedBrands.add(brand.id);
      return [];
    }
    accept(first, brand, model);
    const vocabularyKey = `${brand.id}|${model.id}`;
    const trims = vocabularies.get(vocabularyKey) ?? new Set<string>();
    for (const value of facetValues(first, "SHORT_VERSION")) trims.add(value.name);
    vocabularies.set(vocabularyKey, trims);
    const total = count(first.paging?.total) ?? 0;
    if (total > ML_OFFSET_CEILING && !extra.VEHICLE_YEAR) {
      const years = facetValues(first, "VEHICLE_YEAR");
      const covered = years.reduce((sum, year) => sum + year.results, 0);
      if (covered < total) gaps.push({ brandId: brand.id, brand: `${brand.name} ${model.name} (sin año)`, missing: total - covered });
      return years.map(year => modelTask(brand, model, { VEHICLE_YEAR: year.id }));
    }
    if (total > ML_OFFSET_CEILING) gaps.push({ brandId: brand.id, brand: `${brand.name} ${model.name}`, missing: total - ML_OFFSET_CEILING });
    const tasks: Task[] = [];
    for (let offset = ML_PAGE_SIZE; offset < Math.min(total, ML_OFFSET_CEILING); offset += ML_PAGE_SIZE) {
      tasks.push(async () => {
        const next = await read(filters, offset);
        if (next) accept(next, brand, model);
        else failedBrands.add(brand.id);
        return [];
      });
    }
    return tasks;
  };

  const brandTask = (brand: Named): Task => async () => {
    const first = await read({ BRAND: brand.id }, 0);
    if (!first) {
      failedBrands.add(brand.id);
      return [];
    }
    const models = facetValues(first, "MODEL");
    const total = count(first.paging?.total) ?? 0;
    const covered = models.reduce((sum, model) => sum + model.results, 0);
    if (covered < total) gaps.push({ brandId: brand.id, brand: brand.name, missing: total - covered });
    options.onProgress?.(`[autos] ${brand.name}: ${models.length} modelos, ${total} avisos`);
    return models.map(model => modelTask(brand, model));
  };

  const root = await read({}, 0);
  const brands = root ? facetValues(root, "BRAND") : [];
  const reportedTotal = root ? count(root.paging?.total) : null;
  if (root && reportedTotal !== null) {
    const covered = brands.reduce((sum, brand) => sum + brand.results, 0);
    if (covered < reportedTotal) gaps.push({ brandId: "*", brand: "(sin marca)", missing: reportedTotal - covered });
  }
  if (brands.length) await drainTasks(brands.map(brandTask), Math.max(1, options.concurrency));

  const note = !root
    ? "el puente de Mercado Libre no respondió"
    : budgetCut
      ? "presupuesto de pedidos o de tiempo agotado: cosecha parcial"
      : failedPages
        ? `${failedPages} páginas sin respuesta válida`
        : null;
  return {
    mode: options.mode,
    startedAt,
    finishedAt: clock().toISOString(),
    listings: [...listings.values()].sort((a, b) => a.id.localeCompare(b.id)),
    vocabularies: [...vocabularies]
      .map(([key, trims]) => {
        const [brandId = "", modelId = ""] = key.split("|");
        return { brandId, modelId, trims: [...trims].sort() };
      })
      .sort((a, b) => `${a.brandId}|${a.modelId}`.localeCompare(`${b.brandId}|${b.modelId}`)),
    requests,
    pages,
    failedPages,
    rejectedCards,
    completeBrands: brands.map(brand => brand.id).filter(id => !failedBrands.has(id)).sort(),
    gaps,
    reportedTotal,
    note,
  };
}
```

- [ ] **Step 4: Run tests until green**

Run: `npx vitest run tests/autos/mercadolibre.test.ts tests/autos/normalize.test.ts`
Expected: PASS. First test's `requests: 5` = root + brand + Onix×2 + Spark×1.

- [ ] **Step 5: Probe the live bridge's `since=today` once**

```bash
curl -s -m 60 "http://104.234.204.107:9656/mercadolibre/search?country=UY&q=autos&category=MLU1744&q.category=MLU1744&ITEM_CONDITION=2230581&raw=true&limit=20&since=today&offset=0" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const d=JSON.parse(s);console.log(JSON.stringify(d.paging),(d.available_filters||[]).find(f=>f.id==="BRAND")?.values?.length)})'
```
Expected: `paging.total` in the hundreds with a BRAND facet. If the total is the full ~17,000, the bridge ignores `since`: then set `base` to `{}` in fast mode, keep fast mode bounded by `maxRequests`, and write that finding as a comment above `base`.

- [ ] **Step 6: Commit**

```bash
git add classes/autos/sources tests/autos/mercadolibre.test.ts
git commit -m "feat(autos): cosecha de autos usados de Mercado Libre por marca y modelo"
```

---

### Task 3: Opportunity engine and market snapshots

**Files:**
- Create: `classes/autos/analyze.ts`, `classes/autos/market.ts`
- Test: `tests/autos/analyze.test.ts`, `tests/autos/market.test.ts`

**Interfaces:**
- Consumes: `CarListing`, `CarDetail`, `CarTextFlag` (Task 1); `quantile`; `slugify`, `engineOf`, `trimOf`; `PublicCarOpportunityStats`, `PublicCarMarketRow`, `PublicCarMarketSnapshot`.
- Produces (analyze.ts): `CAR_OPPORTUNITY_POLICY`, `CarTier`, `CarSample`, `CarCandidate { subject; tier; sample; comparables }`, `CarAnalysis { accepted: CarCandidate[]; needsDetail: string[]; stats: PublicCarOpportunityStats }`, `exclusionReason(listing, now)`, `comparablesFor(subject, pool)`, `sampleFor(subject, comparables)`, `tierFor(subject, sample)`, `detailVerdict(subject, detail, now, trims)`, `analyzeCars(listings, { now, details: ReadonlyMap<string, CarDetail>, vocabularies: ReadonlyMap<string, readonly string[]> })` (details keyed by `CarListing.key`, vocabularies keyed `${brandId}|${modelId}`).
- Produces (market.ts): `buildMarketSnapshots(listings, { now, generatedAt, freshDays }): PublicCarMarketSnapshot[]`.

- [ ] **Step 1: Write the failing test `tests/autos/analyze.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  CAR_OPPORTUNITY_POLICY, analyzeCars, comparablesFor, detailVerdict, exclusionReason, sampleFor,
} from "../../classes/autos/analyze";
import type { CarDetail, CarListing } from "../../classes/autos/types";

const NOW = new Date("2026-09-16T12:00:00.000Z");
let serial = 0;

function car(overrides: Partial<CarListing> = {}): CarListing {
  serial++;
  const id = overrides.id ?? `MLU${700000000 + serial}`;
  const price = overrides.price ?? 12_000;
  return {
    id, source: "mercadolibre", brandId: "58955", brand: "Chevrolet", modelId: "123123", model: "Onix",
    title: "Chevrolet Onix 1.4 Lt Mt 98cv", year: 2019, km: 90_000, price, currency: "USD", transmission: "manual",
    fuel: "nafta", neighborhood: null, department: "Montevideo", sellerType: "private", sellerId: `seller-${serial}`,
    picture: null, pictureCount: 10, permalink: `https://auto.mercadolibre.com.uy/MLU-${id.slice(3)}-x-_JM`,
    observedAt: NOW.toISOString(), key: `ml-${id}`, brandSlug: "chevrolet", modelSlug: "onix", marketSlug: "chevrolet-onix",
    engine: "1.4", trim: "lt", trimLabel: "Lt", kmQuality: "ok", flags: [], priceUsd: overrides.priceUsd ?? price,
    priceConverted: false, firstSeen: NOW.toISOString(), lastSeen: NOW.toISOString(), priceDrop: null, detail: null,
    ...overrides,
  };
}

function detailFor(subject: CarListing, overrides: Partial<CarDetail> = {}): CarDetail {
  return {
    readAt: NOW.toISOString(), price: subject.price, currency: subject.currency, active: true, brand: "Chevrolet",
    model: "Onix", year: subject.year, km: subject.km, version: "1.4 Lt 98cv", engineText: "1.4", sellerName: null,
    bodyType: "Hatchback", color: "Gris", doors: 5, flags: [], description: "Impecable", ...overrides,
  };
}

const vocabularies = new Map([["58955|123123", ["Lt", "Ltz", "Joy"]]]);
const market = (count = 10) => Array.from({ length: count }, (_, i) => car({ price: 12_000 + i * 100, km: 85_000 + i * 1_000 }));

describe("exclusionReason", () => {
  it("names why an advert cannot be analysed", () => {
    expect(exclusionReason(car(), NOW)).toBeNull();
    expect(exclusionReason(car({ lastSeen: "2026-09-13T00:00:00.000Z" }), NOW)).toBe("stale");
    expect(exclusionReason(car({ priceConverted: true }), NOW)).toBe("not_usd");
    expect(exclusionReason(car({ kmQuality: "placeholder" }), NOW)).toBe("km_placeholder");
    expect(exclusionReason(car({ flags: ["damaged"] }), NOW)).toBe("flag_damaged");
    expect(exclusionReason(car({ trim: null }), NOW)).toBe("no_trim");
    expect(exclusionReason(car({ engine: null }), NOW)).toBe("no_engine");
    expect(exclusionReason(car({ transmission: null }), NOW)).toBe("no_transmission");
    expect(exclusionReason(car({ priceUsd: 500 }), NOW)).toBe("implausible_price");
  });
});

describe("comparablesFor", () => {
  it("keeps km-close peers, at most two per seller, nearest km first", () => {
    const subject = car({ km: 90_000 });
    const shared = Array.from({ length: 4 }, (_, i) => car({ sellerId: "dealer-1", km: 90_000 + i }));
    const far = car({ km: 200_000 });
    const picked = comparablesFor(subject, [subject, ...shared, far, ...market(3)]);
    expect(picked.filter(peer => peer.sellerId === "dealer-1")).toHaveLength(2);
    expect(picked).not.toContain(far);
    expect(picked).not.toContain(subject);
  });
  it("drops a re-post of the same car by the same seller", () => {
    const subject = car({ sellerId: "s", km: 90_000, price: 9_000 });
    const copy = car({ sellerId: "s", km: 90_100, price: 9_050 });
    expect(comparablesFor(subject, [copy])).toEqual([]);
  });
});

describe("analyzeCars", () => {
  it("publishes a verified strict opportunity", () => {
    const subject = car({ price: 9_500, km: 88_000 });
    const result = analyzeCars([...market(10), subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), vocabularies });
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]).toMatchObject({ tier: "strict", subject: { key: subject.key } });
    expect(result.accepted[0]!.sample.n).toBe(10);
    expect(result.accepted[0]!.sample.gap).toBeGreaterThan(0.2);
    expect(result.stats).toMatchObject({ candidates: 1, verified: 1, strict: 1, exploratory: 0 });
  });

  it("asks for the advert page before publishing", () => {
    const subject = car({ price: 9_500, km: 88_000 });
    const result = analyzeCars([...market(10), subject], { now: NOW, details: new Map(), vocabularies });
    expect(result.accepted).toEqual([]);
    expect(result.needsDetail).toEqual([subject.key]);
    expect(result.stats.rejectedByDetail).toEqual({ detail_missing: 1 });
  });

  it("never compares across versions, engines or years", () => {
    const peers = [
      ...market(4),
      ...Array.from({ length: 6 }, () => car({ trim: "ltz", trimLabel: "Ltz" })),
      ...Array.from({ length: 6 }, () => car({ engine: "1.0T" })),
      ...Array.from({ length: 6 }, () => car({ year: 2020 })),
    ];
    const subject = car({ price: 9_500 });
    const result = analyzeCars([...peers, subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), vocabularies });
    expect(result.accepted).toEqual([]);
  });

  it("does not call a car cheap when it simply has more km than the sample", () => {
    const peers = Array.from({ length: 10 }, (_, i) => car({ price: 12_000 + i * 100, km: 60_000 + i * 1_000 }));
    const subject = car({ price: 9_500, km: 78_000 });
    const result = analyzeCars([...peers, subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), vocabularies });
    expect(result.accepted).toEqual([]);
  });

  it("requires independent sellers", () => {
    const peers = Array.from({ length: 10 }, (_, i) => car({ sellerId: `dealer-${i % 2}`, price: 12_000 + i * 100 }));
    const subject = car({ price: 9_500 });
    const result = analyzeCars([...peers, subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), vocabularies });
    expect(result.accepted).toEqual([]);
  });

  it("holds a too-good-to-be-true gap for review", () => {
    const subject = car({ price: 5_000 });
    const result = analyzeCars([...market(10), subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), vocabularies });
    expect(result.accepted).toEqual([]);
    expect(result.stats.review).toBe(1);
  });

  it("is deterministic regardless of input order", () => {
    const peers = market(12);
    const a = car({ price: 9_400 });
    const b = car({ price: 9_600 });
    const details = new Map([[a.key, detailFor(a)], [b.key, detailFor(b)]]);
    const one = analyzeCars([...peers, a, b], { now: NOW, details, vocabularies });
    const two = analyzeCars([b, ...[...peers].reverse(), a], { now: NOW, details, vocabularies });
    expect(two.accepted.map(item => item.subject.key)).toEqual(one.accepted.map(item => item.subject.key));
  });
});

describe("sampleFor", () => {
  it("reports the smallest gap left after removing any one seller", () => {
    const subject = car({ price: 9_000 });
    const cheap = Array.from({ length: 4 }, () => car({ price: 10_000 }));
    const bigDealer = Array.from({ length: 4 }, () => car({ sellerId: "big", price: 14_000 }));
    const sample = sampleFor(subject, [...cheap, ...bigDealer]);
    expect(sample.gap).toBeCloseTo(0.25, 3);
    expect(sample.sellerSensitivityGap).toBeCloseTo(0.1, 3);
  });
});

describe("detailVerdict", () => {
  const trims = ["Lt", "Ltz", "Joy"];
  it("accepts a matching page", () => {
    const subject = car();
    expect(detailVerdict(subject, detailFor(subject), NOW, trims)).toBeNull();
  });
  it("rejects stale, changed, inactive, mismatched and flagged pages", () => {
    const subject = car();
    expect(detailVerdict(subject, detailFor(subject, { readAt: "2026-09-12T00:00:00.000Z" }), NOW, trims)).toBe("detail_stale");
    expect(detailVerdict(subject, detailFor(subject, { price: 11_000 }), NOW, trims)).toBe("detail_price_changed");
    expect(detailVerdict(subject, detailFor(subject, { active: false }), NOW, trims)).toBe("detail_inactive");
    expect(detailVerdict(subject, detailFor(subject, { year: 2018 }), NOW, trims)).toBe("detail_mismatch");
    expect(detailVerdict(subject, detailFor(subject, { km: 95_000 }), NOW, trims)).toBe("detail_mismatch");
    expect(detailVerdict(subject, detailFor(subject, { version: "1.4 Ltz 98cv" }), NOW, trims)).toBe("detail_trim_mismatch");
    expect(detailVerdict(subject, detailFor(subject, { version: "1.0 Lt" }), NOW, trims)).toBe("detail_engine_mismatch");
    expect(detailVerdict(subject, detailFor(subject, { flags: ["damaged"] }), NOW, trims)).toBe("detail_flag_damaged");
  });
  it("does not reject a version text that names no known trim", () => {
    const subject = car();
    expect(detailVerdict(subject, detailFor(subject, { version: "1.4 Mt" }), NOW, trims)).toBeNull();
  });
  it("uses the documented policy numbers", () => {
    expect(CAR_OPPORTUNITY_POLICY.strict).toMatchObject({ minimumComparables: 8, minimumSellers: 4, maximumSpread: 0.3, minimumGap: 0.15 });
    expect(CAR_OPPORTUNITY_POLICY.maximumGap).toBe(0.45);
  });
});
```

- [ ] **Step 2: Write the failing test `tests/autos/market.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { buildMarketSnapshots } from "../../classes/autos/market";
import type { CarListing } from "../../classes/autos/types";

const NOW = new Date("2026-09-16T12:00:00.000Z");
let serial = 0;
function car(overrides: Partial<CarListing> = {}): CarListing {
  serial++;
  const id = `MLU${800000000 + serial}`;
  return {
    id, source: "mercadolibre", brandId: "1", brand: "Peugeot", modelId: "9301", model: "208", title: "Peugeot 208 1.2 Active",
    year: 2016, km: 100_000, price: 9_000, currency: "USD", transmission: "manual", fuel: "nafta", neighborhood: null,
    department: "Montevideo", sellerType: "private", sellerId: `s${serial}`, picture: null, pictureCount: 1,
    permalink: `https://auto.mercadolibre.com.uy/MLU-${id.slice(3)}-x-_JM`, observedAt: NOW.toISOString(), key: `ml-${id}`,
    brandSlug: "peugeot", modelSlug: "208", marketSlug: "peugeot-208", engine: "1.2", trim: "active", trimLabel: "Active",
    kmQuality: "ok", flags: [], priceUsd: 9_000, priceConverted: false, firstSeen: NOW.toISOString(),
    lastSeen: NOW.toISOString(), priceDrop: null, detail: null, ...overrides,
  };
}

describe("buildMarketSnapshots", () => {
  it("publishes year and version rows only with five or more clean adverts", () => {
    const listings = [
      ...[8_500, 8_900, 9_000, 9_200, 9_600].map(priceUsd => car({ priceUsd, price: priceUsd })),
      ...[7_000, 7_200, 7_400, 7_600].map(priceUsd => car({ year: 2014, priceUsd, price: priceUsd })),
      car({ flags: ["damaged"], priceUsd: 3_000, price: 3_000 }),
      car({ kmQuality: "placeholder" }),
    ];
    const [snapshot] = buildMarketSnapshots(listings, { now: NOW, generatedAt: NOW.toISOString(), freshDays: 4 });
    expect(snapshot).toMatchObject({ version: 1, slug: "peugeot-208", brand: "Peugeot", model: "208", listings: 11 });
    expect(snapshot!.years).toEqual([
      { year: 2016, trim: null, engine: null, transmission: null, n: 5, sellers: 5, p25: 8900, median: 9000, p75: 9200, kmMedian: 100000 },
    ]);
    expect(snapshot!.rows).toEqual([
      { year: 2016, trim: "Active", engine: "1.2", transmission: "manual", n: 5, sellers: 5, p25: 8900, median: 9000, p75: 9200, kmMedian: 100000 },
    ]);
  });
  it("skips models with fewer than five fresh adverts", () => {
    const listings = [car(), car(), car(), car(), car({ lastSeen: "2026-09-01T00:00:00.000Z" })];
    expect(buildMarketSnapshots(listings, { now: NOW, generatedAt: NOW.toISOString(), freshDays: 4 })).toEqual([]);
  });
});
```

- [ ] **Step 3: Run to verify both fail**

Run: `npx vitest run tests/autos/analyze.test.ts tests/autos/market.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Write `classes/autos/analyze.ts`**

```ts
// Which used cars ask noticeably less than the SAME car. The cohort is fixed BEFORE prices are
// looked at: same brand/model ids, year, version, engine and gearbox, km within max(20k, 30 %).
// Measured on 2,279 real adverts (2026-09-16): without version+engine the rule "found" 125 bargains
// that were a cheaper trim or a 4x2; with them, 11, all defensible by eye.
import { quantile } from "./stats";
import { engineOf, slugify, trimOf } from "./normalize";
import type { PublicCarOpportunityStats } from "./publicTypes";
import type { CarDetail, CarListing, CarTextFlag } from "./types";

export const CAR_OPPORTUNITY_POLICY = {
  freshDays: 2,
  kmToleranceRatio: 0.3,
  kmToleranceMin: 20_000,
  maximumPerSeller: 2,
  maximumComparables: 24,
  maximumGap: 0.45,
  detailMaxAgeHours: 72,
  detailKmTolerance: 0.01,
  maxItems: 2_000,
  strict: { minimumComparables: 8, minimumSellers: 4, maximumSpread: 0.3, minimumGap: 0.15, minimumConservativeGap: 0.05, minimumSellerSensitivityGap: 0.1 },
  exploratory: { minimumComparables: 5, minimumSellers: 3, maximumSpread: 0.3, minimumGap: 0.12, minimumConservativeGap: 0, minimumSellerSensitivityGap: 0.08 },
} as const;

export type CarTier = "strict" | "exploratory";

export interface CarSample {
  n: number;
  sellers: number;
  dealers: number;
  privates: number;
  p25: number;
  median: number;
  p75: number;
  spread: number;
  kmMedian: number;
  kmP75: number;
  gap: number;
  conservativeGap: number;
  sellerSensitivityGap: number;
}

export interface CarCandidate {
  subject: CarListing;
  tier: CarTier;
  sample: CarSample;
  comparables: CarListing[];
}

export interface CarAnalysis {
  accepted: CarCandidate[];
  needsDetail: string[];
  stats: PublicCarOpportunityStats;
}

const DAY = 86_400_000;
const EXCLUDING_FLAGS: ReadonlySet<CarTextFlag> = new Set<CarTextFlag>(["damaged", "financing", "foreign_plate", "paperwork", "price_mismatch", "recovered"]);
const REFETCH = new Set(["detail_missing", "detail_stale", "detail_price_changed"]);

export function exclusionReason(listing: CarListing, now: Date): string | null {
  if (now.getTime() - Date.parse(listing.lastSeen) > CAR_OPPORTUNITY_POLICY.freshDays * DAY) return "stale";
  if (listing.priceConverted) return "not_usd";
  if (listing.priceUsd < 1_000 || listing.priceUsd > 500_000) return "implausible_price";
  if (listing.kmQuality !== "ok") return `km_${listing.kmQuality}`;
  const flag = listing.flags.find(item => EXCLUDING_FLAGS.has(item));
  if (flag) return `flag_${flag}`;
  if (!listing.transmission) return "no_transmission";
  if (!listing.trim) return "no_trim";
  if (!listing.engine) return "no_engine";
  return null;
}

const sellerOf = (listing: CarListing): string => listing.sellerId ?? listing.key;
const cohortKey = (listing: CarListing): string =>
  [listing.brandId, listing.modelId, listing.year, listing.trim, listing.engine, listing.transmission].join("|");

function possibleCopy(a: CarListing, b: CarListing): boolean {
  if (a.id === b.id) return true;
  return !!a.sellerId && a.sellerId === b.sellerId && a.year === b.year &&
    Math.abs(a.km! - b.km!) <= Math.max(1, a.km! * 0.01) && Math.abs(a.priceUsd - b.priceUsd) <= a.priceUsd * 0.01;
}

export function comparablesFor(subject: CarListing, pool: readonly CarListing[]): CarListing[] {
  const policy = CAR_OPPORTUNITY_POLICY;
  const tolerance = Math.max(policy.kmToleranceMin, subject.km! * policy.kmToleranceRatio);
  const perSeller = new Map<string, number>();
  return pool
    .filter(peer => peer.key !== subject.key &&
      (!peer.fuel || !subject.fuel || peer.fuel === subject.fuel) &&
      Math.abs(peer.km! - subject.km!) <= tolerance &&
      !possibleCopy(subject, peer))
    .sort((a, b) => Math.abs(a.km! - subject.km!) - Math.abs(b.km! - subject.km!) || a.key.localeCompare(b.key))
    .filter(peer => {
      const seller = sellerOf(peer);
      const used = perSeller.get(seller) ?? 0;
      if (used >= policy.maximumPerSeller) return false;
      perSeller.set(seller, used + 1);
      return true;
    })
    .slice(0, policy.maximumComparables);
}

function measure(subject: CarListing, sample: readonly CarListing[]): Omit<CarSample, "sellerSensitivityGap"> {
  const prices = sample.map(peer => peer.priceUsd);
  const kms = sample.map(peer => peer.km!);
  const median = quantile(prices, 0.5);
  const p25 = quantile(prices, 0.25);
  const p75 = quantile(prices, 0.75);
  return {
    n: sample.length,
    sellers: new Set(sample.map(sellerOf)).size,
    dealers: sample.filter(peer => peer.sellerType === "dealer").length,
    privates: sample.filter(peer => peer.sellerType === "private").length,
    p25,
    median,
    p75,
    spread: (p75 - p25) / median,
    kmMedian: quantile(kms, 0.5),
    kmP75: quantile(kms, 0.75),
    gap: 1 - subject.priceUsd / median,
    conservativeGap: 1 - subject.priceUsd / p25,
  };
}

/** Leave-one-seller-out: the gap must survive removing any single seller's adverts. */
export function sampleFor(subject: CarListing, comparables: readonly CarListing[]): CarSample {
  const base = measure(subject, comparables);
  let sensitivity = base.gap;
  for (const seller of new Set(comparables.map(sellerOf))) {
    const rest = comparables.filter(peer => sellerOf(peer) !== seller);
    if (rest.length >= 3) sensitivity = Math.min(sensitivity, measure(subject, rest).gap);
  }
  return { ...base, sellerSensitivityGap: sensitivity };
}

export function tierFor(subject: CarListing, sample: CarSample): CarTier | "review" | null {
  const policy = CAR_OPPORTUNITY_POLICY;
  if (sample.gap > policy.maximumGap) return "review";
  if (subject.km! > sample.kmP75) return null;
  for (const name of ["strict", "exploratory"] as const) {
    const tier = policy[name];
    if (sample.n >= tier.minimumComparables && sample.sellers >= tier.minimumSellers &&
      sample.spread <= tier.maximumSpread && sample.gap >= tier.minimumGap &&
      sample.conservativeGap >= tier.minimumConservativeGap &&
      sample.sellerSensitivityGap >= tier.minimumSellerSensitivityGap) return name;
  }
  return null;
}

/** The advert's own page must still describe the same car, price and km, and nothing disqualifying. */
export function detailVerdict(subject: CarListing, detail: CarDetail | undefined, now: Date, trims: readonly string[]): string | null {
  const policy = CAR_OPPORTUNITY_POLICY;
  if (!detail) return "detail_missing";
  if (now.getTime() - Date.parse(detail.readAt) > policy.detailMaxAgeHours * 3_600_000) return "detail_stale";
  if (detail.price !== subject.price || detail.currency !== subject.currency) return "detail_price_changed";
  if (!detail.active) return "detail_inactive";
  if (!detail.brand || slugify(detail.brand) !== subject.brandSlug) return "detail_mismatch";
  if (!detail.model || slugify(detail.model) !== subject.modelSlug) return "detail_mismatch";
  if (detail.year !== subject.year) return "detail_mismatch";
  if (detail.km === null || Math.abs(detail.km - subject.km!) > Math.max(1, subject.km! * policy.detailKmTolerance)) return "detail_mismatch";
  if (detail.version) {
    const pageTrim = trimOf(detail.version, trims);
    if (pageTrim && pageTrim !== subject.trim) return "detail_trim_mismatch";
    const pageEngine = engineOf(detail.version);
    if (pageEngine && subject.engine && pageEngine.replace("T", "") !== subject.engine.replace("T", "")) return "detail_engine_mismatch";
  }
  if (detail.flags.length) return `detail_flag_${detail.flags[0]}`;
  return null;
}

const bump = (bag: Record<string, number>, key: string): void => {
  bag[key] = (bag[key] ?? 0) + 1;
};

export function analyzeCars(
  listings: readonly CarListing[],
  options: { now: Date; details: ReadonlyMap<string, CarDetail>; vocabularies: ReadonlyMap<string, readonly string[]> },
): CarAnalysis {
  const stats: PublicCarOpportunityStats = {
    input: listings.length, eligible: 0, analyzed: 0, candidates: 0, verified: 0, strict: 0, exploratory: 0, review: 0,
    excluded: {}, rejectedByDetail: {},
  };
  const eligible = [...listings]
    .sort((a, b) => a.key.localeCompare(b.key))
    .filter(listing => {
      const reason = exclusionReason(listing, options.now);
      if (reason) bump(stats.excluded, reason);
      return !reason;
    });
  stats.eligible = eligible.length;
  const groups = new Map<string, CarListing[]>();
  for (const listing of eligible) {
    const key = cohortKey(listing);
    const group = groups.get(key);
    if (group) group.push(listing);
    else groups.set(key, [listing]);
  }
  const accepted: CarCandidate[] = [];
  const refetch: CarCandidate[] = [];
  for (const subject of eligible) {
    const comparables = comparablesFor(subject, groups.get(cohortKey(subject)) ?? []);
    if (comparables.length < CAR_OPPORTUNITY_POLICY.exploratory.minimumComparables) continue;
    stats.analyzed++;
    const sample = sampleFor(subject, comparables);
    const tier = tierFor(subject, sample);
    if (tier === "review") {
      stats.review++;
      continue;
    }
    if (!tier) continue;
    stats.candidates++;
    const trims = options.vocabularies.get(`${subject.brandId}|${subject.modelId}`) ?? [];
    const verdict = detailVerdict(subject, options.details.get(subject.key), options.now, trims);
    if (verdict) {
      bump(stats.rejectedByDetail, verdict);
      if (REFETCH.has(verdict)) refetch.push({ subject, tier, sample, comparables });
      continue;
    }
    stats.verified++;
    stats[tier]++;
    accepted.push({ subject, tier, sample, comparables });
  }
  const order = (a: CarCandidate, b: CarCandidate): number =>
    (a.tier === b.tier ? 0 : a.tier === "strict" ? -1 : 1) || b.sample.gap - a.sample.gap || a.subject.key.localeCompare(b.subject.key);
  return {
    accepted: accepted.sort(order).slice(0, CAR_OPPORTUNITY_POLICY.maxItems),
    needsDetail: refetch.sort(order).map(candidate => candidate.subject.key),
    stats,
  };
}
```

- [ ] **Step 5: Write `classes/autos/market.ts`**

```ts
// Descriptive asking-price bands per model — what the model pages publish. Not a valuation: same
// quality gates as the opportunity engine, and a row needs five adverts.
import { quantile } from "./stats";
import type { PublicCarMarketRow, PublicCarMarketSnapshot } from "./publicTypes";
import type { CarListing } from "./types";

const MIN_ROW = 5;
const EXCLUDING = new Set(["damaged", "financing", "foreign_plate", "paperwork", "price_mismatch", "recovered"]);

function row(group: readonly CarListing[], shape: Pick<PublicCarMarketRow, "year" | "trim" | "engine" | "transmission">): PublicCarMarketRow {
  const prices = group.map(listing => listing.priceUsd);
  return {
    ...shape,
    n: group.length,
    sellers: new Set(group.map(listing => listing.sellerId ?? listing.key)).size,
    p25: Math.round(quantile(prices, 0.25)),
    median: Math.round(quantile(prices, 0.5)),
    p75: Math.round(quantile(prices, 0.75)),
    kmMedian: Math.round(quantile(group.map(listing => listing.km!), 0.5)),
  };
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = key(item);
    const group = groups.get(name);
    if (group) group.push(item);
    else groups.set(name, [item]);
  }
  return groups;
}

export function buildMarketSnapshots(
  listings: readonly CarListing[],
  options: { now: Date; generatedAt: string; freshDays: number },
): PublicCarMarketSnapshot[] {
  const cutoff = options.now.getTime() - options.freshDays * 86_400_000;
  const fresh = listings.filter(listing => Date.parse(listing.lastSeen) >= cutoff);
  const snapshots: PublicCarMarketSnapshot[] = [];
  for (const [slug, group] of groupBy(fresh, listing => listing.marketSlug)) {
    if (group.length < MIN_ROW) continue;
    const clean = group.filter(listing => !listing.priceConverted && listing.priceUsd >= 1_000 && listing.priceUsd <= 500_000 &&
      listing.kmQuality === "ok" && !listing.flags.some(flag => EXCLUDING.has(flag)));
    const years = [...groupBy(clean, listing => String(listing.year))]
      .filter(([, items]) => items.length >= MIN_ROW)
      .map(([, items]) => row(items, { year: items[0]!.year, trim: null, engine: null, transmission: null }))
      .sort((a, b) => b.year - a.year);
    const rows = [...groupBy(clean.filter(listing => listing.trim && listing.engine && listing.transmission),
      listing => [listing.year, listing.trim, listing.engine, listing.transmission].join("|"))]
      .filter(([, items]) => items.length >= MIN_ROW)
      .map(([, items]) => row(items, { year: items[0]!.year, trim: items[0]!.trimLabel, engine: items[0]!.engine, transmission: items[0]!.transmission }))
      .sort((a, b) => b.year - a.year || b.n - a.n || String(a.trim).localeCompare(String(b.trim)));
    const newest = [...group].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))[0]!;
    snapshots.push({
      version: 1, slug, brand: newest.brand, model: newest.model, brandSlug: newest.brandSlug, modelSlug: newest.modelSlug,
      generatedAt: options.generatedAt, listings: group.length, years, rows,
    });
  }
  return snapshots.sort((a, b) => b.listings - a.listings || a.slug.localeCompare(b.slug));
}
```

- [ ] **Step 6: Run tests until green**

Run: `npx vitest run tests/autos`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add classes/autos/analyze.ts classes/autos/market.ts tests/autos/analyze.test.ts tests/autos/market.test.ts
git commit -m "feat(autos): motor de oportunidades por cohorte y mercado por modelo"
```

---

### Task 4: Advert page verification

**Files:**
- Create: `classes/autos/detail.ts`
- Test: `tests/autos/detail.test.ts`

**Interfaces:**
- Consumes: `fetchText(url, { timeoutMs, retries, headers, onFailure })` from `classes/rentals/net` (per-host throttle, 1.2 s gap); `descriptionFlags`.
- Produces: `AUTOS_USER_AGENT`, `parseCarDetail(html, readAt): CarDetail | null`, `DetailFetchResult { details: Map<string, CarDetail>; gone: string[]; failed: number }`, `fetchCarDetails(targets: ReadonlyArray<{ key; permalink }>, { max, maxDurationMs, now? })`.

- [ ] **Step 1: Write the failing test `tests/autos/detail.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchText = vi.fn();
vi.mock("../../classes/rentals/net", () => ({ fetchText: (...args: unknown[]) => fetchText(...args) }));

import { fetchCarDetails, parseCarDetail } from "../../classes/autos/detail";

function page(options: { status?: string; description?: string; ld?: boolean } = {}): string {
  const vehicle = {
    "@context": "https://schema.org", "@type": "Vehicle", name: "Byd New F3 1.5 Mt", brand: "BYD", bodyType: "Sedán",
    color: "Azul", numberOfDoors: "5", fuelType: "Nafta", offers: { "@type": "Offer", price: 9500, priceCurrency: "USD" },
  };
  const attributes = [
    { id: "Marca", text: "BYD" }, { id: "Modelo", text: "F3" }, { id: "Año", text: "2017" },
    { id: "Versión", text: "1.5 Mt" }, { id: "Kilómetros", text: "111.111 km" }, { id: "Motor", text: "1.5" },
  ];
  const state = {
    components: [{ id: "technical_specifications", attributes }],
    description: { id: "description", type: "description", state: "VISIBLE", title: "Descripción", content: options.description ?? "Equipamiento completo.\nNunca chocado." },
    seller: { seller_name: { title: { text: "Olivera Automotores" } } },
    track: { item_status: options.status ?? "active" },
  };
  const ld = options.ld === false ? "" : `<script type="application/ld+json">${JSON.stringify(vehicle)}</script>`;
  return `<html><head>${ld}</head><body><script>window.state=${JSON.stringify(state)}</script></body></html>`;
}

const READ_AT = "2026-09-16T12:00:00.000Z";

describe("parseCarDetail", () => {
  it("reads price, specs, seller and description from the vehicle page", () => {
    expect(parseCarDetail(page(), READ_AT)).toEqual({
      readAt: READ_AT, price: 9500, currency: "USD", active: true, brand: "BYD", model: "F3", year: 2017, km: 111111,
      version: "1.5 Mt", engineText: "1.5", sellerName: "Olivera Automotores", bodyType: "Sedán", color: "Azul", doors: 5,
      flags: [], description: "Equipamiento completo.\nNunca chocado.",
    });
  });
  it("flags a damaged car and a closed advert", () => {
    expect(parseCarDetail(page({ description: "Motor fundido, se vende como está" }), READ_AT)?.flags).toEqual(["damaged"]);
    expect(parseCarDetail(page({ status: "closed" }), READ_AT)?.active).toBe(false);
  });
  it("refuses a page that is not a vehicle advert", () => {
    expect(parseCarDetail(page({ ld: false }), READ_AT)).toBeNull();
    expect(parseCarDetail("<html>Publicación finalizada</html>", READ_AT)).toBeNull();
  });
});

describe("fetchCarDetails", () => {
  beforeEach(() => fetchText.mockReset());
  it("separates read pages, removed adverts and failures, and only reads ML permalinks", async () => {
    fetchText.mockImplementation(async (url: string, options: { onFailure?: (reason: string) => void }) => {
      if (url.includes("MLU-1-")) return page();
      if (url.includes("MLU-2-")) { options.onFailure?.("HTTP 404"); return null; }
      options.onFailure?.("tiempo agotado (25000 ms)");
      return null;
    });
    const result = await fetchCarDetails([
      { key: "ml-MLU1", permalink: "https://auto.mercadolibre.com.uy/MLU-1-a-_JM" },
      { key: "ml-MLU2", permalink: "https://auto.mercadolibre.com.uy/MLU-2-b-_JM" },
      { key: "ml-MLU3", permalink: "https://auto.mercadolibre.com.uy/MLU-3-c-_JM" },
      { key: "ml-MLU4", permalink: "https://evil.example/MLU-4" },
    ], { max: 10, maxDurationMs: 60_000, now: () => new Date(READ_AT) });
    expect([...result.details.keys()]).toEqual(["ml-MLU1"]);
    expect(result.gone).toEqual(["ml-MLU2"]);
    expect(result.failed).toBe(1);
    expect(fetchText).toHaveBeenCalledTimes(3);
    expect(fetchText.mock.calls[0]![1].headers["user-agent"]).toMatch(/CambioUruguayBot/);
  });
  it("honours the read budget", async () => {
    fetchText.mockResolvedValue(page());
    const targets = Array.from({ length: 5 }, (_, i) => ({ key: `ml-MLU${i}`, permalink: `https://auto.mercadolibre.com.uy/MLU-${i}-x-_JM` }));
    const result = await fetchCarDetails(targets, { max: 2, maxDurationMs: 60_000 });
    expect(result.details.size).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/autos/detail.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `classes/autos/detail.ts`**

```ts
// The advert's own page is the last gate before a car is called an opportunity. Measured
// 2026-09-16: auto.mercadolibre.com.uy item pages answer 200 from the VPS with our own UA, robots.txt
// does not block them, and they carry what the search card cannot — the "Versión" spec row, the
// seller's description ("motor a reparar"), the dealer name and whether the advert is active. Only
// candidates are read (hundreds a day, spaced by the shared per-host throttle).
import { fetchText } from "../rentals/net";
import { descriptionFlags } from "./normalize";
import type { CarDetail } from "./types";

export const AUTOS_USER_AGENT = process.env.AUTOS_USER_AGENT ||
  "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/autos-usados-uruguay; used-car price index; contact via site)";

const STRING = '"((?:[^"\\\\]|\\\\.)*)"';

function decode(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

/** Matches "Año" whether the page ships it raw or as a JSON \u escape. */
function nameAlternatives(name: string): string {
  const escaped = name.replace(/[^\x00-\x7f]/g, char => `\\\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return escaped === name ? name : `${name}|${escaped}`;
}

function attribute(html: string, name: string): string | null {
  const match = new RegExp(`\\{"id":"(?:${nameAlternatives(name)})","text":${STRING}\\}`).exec(html);
  return match ? decode(match[1]!).trim() || null : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function vehicleLd(html: string): any | null {
  const pattern = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    try {
      const data = JSON.parse(match[1]!);
      for (const node of Array.isArray(data) ? data : [data]) if (node?.["@type"] === "Vehicle") return node;
    } catch {
      // Other ld+json blocks may be malformed; only the vehicle one matters.
    }
  }
  return null;
}

export function parseCarDetail(html: string, readAt: string): CarDetail | null {
  const vehicle = vehicleLd(html);
  const price = Number(vehicle?.offers?.price);
  const currency = String(vehicle?.offers?.priceCurrency || "");
  if (!vehicle || !(price > 0) || (currency !== "USD" && currency !== "UYU")) return null;
  const status = /"item_status":"([a-z_]+)"/.exec(html)?.[1] ?? null;
  const descriptionMatch = new RegExp(`"type":"description","state":"VISIBLE","title":${STRING},"content":${STRING}`).exec(html);
  const description = descriptionMatch ? decode(descriptionMatch[2]!) : "";
  const kmText = attribute(html, "Kilómetros");
  const yearText = attribute(html, "Año");
  const seller = new RegExp(`"seller_name":\\{"title":\\{"text":${STRING}`).exec(html)?.[1];
  const doors = Number(vehicle.numberOfDoors);
  const ldBrand = typeof vehicle.brand === "string" ? vehicle.brand : typeof vehicle.brand?.name === "string" ? vehicle.brand.name : null;
  return {
    readAt,
    price,
    currency,
    active: status === "active",
    brand: attribute(html, "Marca") ?? ldBrand,
    model: attribute(html, "Modelo"),
    year: yearText && /^\d{4}$/.test(yearText) ? Number(yearText) : null,
    km: kmText && /\d/.test(kmText) ? Number(kmText.replace(/[^\d]/g, "")) : null,
    version: attribute(html, "Versión"),
    engineText: attribute(html, "Motor"),
    sellerName: seller ? decode(seller).trim().slice(0, 120) || null : null,
    bodyType: typeof vehicle.bodyType === "string" ? vehicle.bodyType : null,
    color: typeof vehicle.color === "string" ? vehicle.color : null,
    doors: Number.isInteger(doors) && doors > 0 && doors < 10 ? doors : null,
    flags: descriptionFlags(description),
    description: description.slice(0, 5_000),
  };
}

export interface DetailFetchResult {
  details: Map<string, CarDetail>;
  gone: string[];
  failed: number;
}

export async function fetchCarDetails(
  targets: ReadonlyArray<{ key: string; permalink: string }>,
  options: { max: number; maxDurationMs: number; now?: () => Date },
): Promise<DetailFetchResult> {
  const clock = options.now ?? (() => new Date());
  const started = Date.now();
  const result: DetailFetchResult = { details: new Map(), gone: [], failed: 0 };
  let reads = 0;
  for (const target of targets) {
    if (reads >= options.max || Date.now() - started >= options.maxDurationMs) break;
    if (!target.permalink.startsWith("https://auto.mercadolibre.com.uy/MLU-")) continue;
    reads++;
    let failure = "";
    const html = await fetchText(target.permalink, {
      timeoutMs: 25_000,
      retries: 1,
      headers: { "user-agent": AUTOS_USER_AGENT },
      onFailure: reason => {
        failure = reason;
      },
    });
    if (!html) {
      if (/^HTTP (404|410)$/.test(failure)) result.gone.push(target.key);
      else result.failed++;
      continue;
    }
    const detail = parseCarDetail(html, clock().toISOString());
    if (detail) result.details.set(target.key, detail);
    else result.failed++;
  }
  return result;
}
```

- [ ] **Step 4: Run tests until green**

Run: `npx vitest run tests/autos/detail.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the parser against one real page**

```bash
S=/c/Users/airau/AppData/Local/Temp/claude/c--Users-airau-Documents-GitHub-cambio-uruguay/e832301d-4606-48ba-9ec9-cfae46908811/scratchpad
curl -s -L -m 40 -A "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/autos-usados-uruguay)" "https://auto.mercadolibre.com.uy/MLU-700355317-byd-new-f3-15-mt-_JM" -o $S/autos-pdp.html
npx ts-node -T -e "const {parseCarDetail}=require('./classes/autos/detail');const d=parseCarDetail(require('fs').readFileSync('$S/autos-pdp.html','utf8'),new Date().toISOString());console.log(d&&{...d,description:d.description.slice(0,80)})"
```
Expected: brand "BYD", model "F3", year 2017, km 111111, version "1.5 Mt", active true, sellerName non-null. If that advert is gone, take any permalink from a live bridge search. If a field is null on the real page, fix the regex and add the exact real fragment to the test.

- [ ] **Step 6: Commit**

```bash
git add classes/autos/detail.ts tests/autos/detail.test.ts
git commit -m "feat(autos): verificacion de candidatas contra la ficha propia del aviso"
```

---

### Task 5: Models, store and public projection

**Files:**
- Create: `classes/models/CarListing.ts`, `classes/models/CarHarvestMeta.ts`, `classes/models/CarCatalogMeta.ts`, `classes/models/CarMarketSnapshot.ts`, `classes/models/CarOpportunitySnapshot.ts`, `classes/autos/store.ts`, `classes/autos/project.ts`
- Test: `tests/autos/store.test.ts`, `tests/autos/project.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4; `appConnection()`, `appModel()` from `classes/appdb`; `CAR_OPPORTUNITY_POLICY`, `CarAnalysis`, `CarCandidate`; `cleanPublicText`; `carKey`.
- Produces (store.ts): `CAR_CATALOG_COLLECTION`, `nextPriceHistory`, `sweepUpdate`, `collapseRefusal(previous, next, label): string | null`, `mergeVocabularies`, `HarvestMetaRecord`, `harvestMetaRecord(harvest, previous)`, `loadStoredCars(now, days?)`, `saveCarHarvest(harvest): Promise<{ upserted; retired }>`, `saveCarDetails(result, now)`, `loadHarvestMeta(key)`, `loadVocabularies()`, `saveVocabularies(vocabularies, updatedAt)`, `saveHarvestMeta(harvest)`, `loadCatalogMeta()`, `publishCarCatalog(rows, meta)`, `publishCarMarkets(snapshots)`, `loadOpportunityStats()`, `saveCarOpportunitySnapshot(snapshot)`.
- Produces (project.ts): `CAR_CATALOG_FRESH_DAYS = 4`, `publicCarListing(listing, opportunity)`, `CatalogContext`, `buildCarCatalog(listings, analysis, context)`, `buildOpportunitySnapshot(analysis, { generatedAt, usdUyu })`.

- [ ] **Step 1: Write the five models**

`classes/models/CarListing.ts`:
```ts
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { StoredCar } from "../autos/types";

// Private observations: descriptions, seller ids and price history never leave this collection.
const CarListingSchema = new Schema({
  key: { type: String, required: true },
  firstSeen: { type: String, required: true },
  lastSeen: { type: String, required: true },
  listing: { type: Schema.Types.Mixed, required: true },
  priceHistory: { type: Schema.Types.Mixed, default: [] },
  retiredAt: { type: String, default: null },
  missedFullSweeps: { type: Number, default: 0 },
  detail: { type: Schema.Types.Mixed, default: null },
}, { timestamps: true, autoCreate: false, autoIndex: false });
CarListingSchema.index({ key: 1 }, { unique: true });
CarListingSchema.index({ lastSeen: 1 });

export const CarListingModel = appModel<StoredCar>("CarListing", CarListingSchema, "carlistings");
```

`classes/models/CarHarvestMeta.ts`:
```ts
import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface CarHarvestMetaDocument {
  key: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

// Private run notes of the used-car job: the source of truth when a run fails (pm2 logs rotate).
const CarHarvestMetaSchema = new Schema({
  key: { type: String, required: true },
  updatedAt: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
}, { autoCreate: false, autoIndex: false });
CarHarvestMetaSchema.index({ key: 1 }, { unique: true });

export const CarHarvestMetaModel = appModel<CarHarvestMetaDocument>("CarHarvestMeta", CarHarvestMetaSchema, "carharvestmetas");
```

`classes/models/CarCatalogMeta.ts`:
```ts
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicCarCatalogMeta } from "../autos/publicTypes";

export interface CarCatalogMetaDocument {
  key: "uy-cars";
  generatedAt: string;
  meta: PublicCarCatalogMeta;
}

const CarCatalogMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
);
CarCatalogMetaSchema.index({ key: 1 }, { unique: true });

export const CarCatalogMetaModel = appModel<CarCatalogMetaDocument>("CarCatalogMeta", CarCatalogMetaSchema, "carcatalogmetas");
```

`classes/models/CarMarketSnapshot.ts`:
```ts
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicCarMarketSnapshot } from "../autos/publicTypes";

export interface CarMarketSnapshotDocument {
  key: string;
  generatedAt: string;
  snapshot: PublicCarMarketSnapshot;
}

const CarMarketSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
);
CarMarketSnapshotSchema.index({ key: 1 }, { unique: true });

export const CarMarketSnapshotModel = appModel<CarMarketSnapshotDocument>("CarMarketSnapshot", CarMarketSnapshotSchema, "carmarketsnapshots");
```

`classes/models/CarOpportunitySnapshot.ts`:
```ts
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicCarOpportunitySnapshot } from "../autos/publicTypes";

export interface CarOpportunitySnapshotDocument {
  key: "used";
  generatedAt: string;
  snapshot: PublicCarOpportunitySnapshot;
}

const CarOpportunitySnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
);
CarOpportunitySnapshotSchema.index({ key: 1 }, { unique: true });

export const CarOpportunitySnapshotModel = appModel<CarOpportunitySnapshotDocument>(
  "CarOpportunitySnapshot", CarOpportunitySnapshotSchema, "caropportunitysnapshots"
);
```

- [ ] **Step 2: Write the failing test `tests/autos/store.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;
const collections = vi.hoisted(() => new Map<string, unknown>());
function fakeCollection(docs: Doc[] = []) {
  const writes: Doc[] = [];
  return {
    writes,
    createIndex: vi.fn(async () => "ok"),
    find: vi.fn((filter: Doc) => ({
      toArray: async () => docs.filter(doc => {
        if (filter.key?.$in) return filter.key.$in.includes(doc.key);
        if (filter.key?.$nin?.includes(doc.key)) return false;
        if (filter["listing.brandId"]?.$in && !filter["listing.brandId"].$in.includes(doc.listing.brandId)) return false;
        if (filter.lastSeen?.$lt && !(String(doc.lastSeen) < filter.lastSeen.$lt)) return false;
        if ("retiredAt" in filter && doc.retiredAt) return false;
        return true;
      }),
    })),
    bulkWrite: vi.fn(async (operations: Doc[]) => {
      writes.push(...operations);
      return { upsertedCount: operations.length, modifiedCount: 0 };
    }),
  };
}
vi.mock("../../classes/appdb", () => ({
  appConnection: () => ({ collection: (name: string) => collections.get(name) }),
  appModel: (_name: string, schema: unknown, collection: string) => ({ schema, collection: { name: collection } }),
}));

import {
  collapseRefusal, harvestMetaRecord, mergeVocabularies, nextPriceHistory, saveCarHarvest, sweepUpdate,
} from "../../classes/autos/store";
import type { CarHarvestResult, RawCarListing } from "../../classes/autos/types";

const raw = (id: string, price = 10_000): RawCarListing => ({
  id, source: "mercadolibre", brandId: "58955", brand: "Chevrolet", modelId: "1", model: "Onix", title: "Onix", year: 2019,
  km: 90_000, price, currency: "USD", transmission: "manual", fuel: "nafta", neighborhood: null, department: null,
  sellerType: null, sellerId: null, picture: null, pictureCount: null, permalink: `https://auto.mercadolibre.com.uy/MLU-${id}`,
  observedAt: "2026-09-16T10:00:00.000Z",
});

const harvest = (listings: RawCarListing[], overrides: Partial<CarHarvestResult> = {}): CarHarvestResult => ({
  mode: "full", startedAt: "2026-09-16T09:00:00.000Z", finishedAt: "2026-09-16T10:30:00.000Z", listings, vocabularies: [],
  requests: 10, pages: 10, failedPages: 0, rejectedCards: 0, completeBrands: ["58955"], gaps: [], reportedTotal: listings.length,
  note: null, ...overrides,
});

describe("pure store rules", () => {
  it("appends a price point only when price or currency changed, keeping 20", () => {
    const history = [{ price: 10_000, currency: "USD" as const, observedAt: "2026-09-01T00:00:00.000Z" }];
    expect(nextPriceHistory(history, raw("MLU1", 10_000))).toEqual(history);
    expect(nextPriceHistory(history, raw("MLU1", 9_500))).toHaveLength(2);
    const long = Array.from({ length: 20 }, (_, i) => ({ price: i, currency: "USD" as const, observedAt: String(i) }));
    expect(nextPriceHistory(long, raw("MLU1", 99))).toHaveLength(20);
  });
  it("retires only after two complete sweeps without the advert", () => {
    expect(sweepUpdate({ missedFullSweeps: 0, retiredAt: null }, "T")).toEqual({ missedFullSweeps: 1, retiredAt: null });
    expect(sweepUpdate({ missedFullSweeps: 1, retiredAt: null }, "T")).toEqual({ missedFullSweeps: 2, retiredAt: "T" });
  });
  it("refuses a collapse of more than 60 %", () => {
    expect(collapseRefusal(17_000, 6_000, "catálogo")).toMatch(/caída/);
    expect(collapseRefusal(17_000, 7_000, "catálogo")).toBeNull();
    expect(collapseRefusal(50, 1, "catálogo")).toBeNull();
    expect(collapseRefusal(null, 0, "catálogo")).toBeNull();
  });
  it("merges version vocabularies without losing earlier names", () => {
    expect(mergeVocabularies(
      [{ brandId: "1", modelId: "2", trims: ["Lt"] }],
      [{ brandId: "1", modelId: "2", trims: ["Ltz", "Lt"] }, { brandId: "1", modelId: "3", trims: ["Joy"] }],
    )).toEqual([{ brandId: "1", modelId: "2", trims: ["Lt", "Ltz"] }, { brandId: "1", modelId: "3", trims: ["Joy"] }]);
  });
  it("tracks since when a source is failing", () => {
    const failing = harvestMetaRecord(harvest([], { failedPages: 3, note: "3 páginas sin respuesta válida" }), { lastOkAt: "2026-09-15T10:00:00.000Z", failingSince: null });
    expect(failing).toMatchObject({ ok: false, lastOkAt: "2026-09-15T10:00:00.000Z", failingSince: "2026-09-16T10:30:00.000Z" });
    const ok = harvestMetaRecord(harvest([raw("MLU1")]), { lastOkAt: null, failingSince: "2026-09-15T10:00:00.000Z" });
    expect(ok).toMatchObject({ ok: true, lastOkAt: "2026-09-16T10:30:00.000Z", failingSince: null, listings: 1 });
  });
});

describe("saveCarHarvest", () => {
  it("upserts seen adverts and counts a miss only for complete brands", async () => {
    const listings = fakeCollection([
      { key: "ml-MLU1", priceHistory: [{ price: 11_000, currency: "USD", observedAt: "2026-09-10T00:00:00.000Z" }], listing: raw("MLU1"), lastSeen: "2026-09-15T00:00:00.000Z", retiredAt: null, missedFullSweeps: 0 },
      { key: "ml-MLU9", priceHistory: [], listing: raw("MLU9"), lastSeen: "2026-09-15T00:00:00.000Z", retiredAt: null, missedFullSweeps: 1 },
      { key: "ml-MLU8", priceHistory: [], listing: { ...raw("MLU8"), brandId: "other" }, lastSeen: "2026-09-15T00:00:00.000Z", retiredAt: null, missedFullSweeps: 1 },
    ]);
    collections.set("carlistings", listings);
    const result = await saveCarHarvest(harvest([raw("MLU1", 10_000)]));
    expect(result.retired).toBe(1);
    const upsert = listings.writes.find(op => op.updateOne?.filter.key === "ml-MLU1" && op.updateOne.upsert)!;
    expect(upsert.updateOne.update.$set.priceHistory).toHaveLength(2);
    const retire = listings.writes.find(op => op.updateOne?.filter.key === "ml-MLU9")!;
    expect(retire.updateOne.update.$set).toEqual({ missedFullSweeps: 2, retiredAt: "2026-09-16T10:30:00.000Z" });
    expect(listings.writes.find(op => op.updateOne?.filter.key === "ml-MLU8")).toBeUndefined();
  });
  it("never counts misses in fast mode", async () => {
    const listings = fakeCollection([{ key: "ml-MLU9", priceHistory: [], listing: raw("MLU9"), lastSeen: "2026-09-15T00:00:00.000Z", retiredAt: null, missedFullSweeps: 1 }]);
    collections.set("carlistings", listings);
    const result = await saveCarHarvest(harvest([raw("MLU1")], { mode: "fast" }));
    expect(result.retired).toBe(0);
    expect(listings.writes.find(op => op.updateOne?.filter.key === "ml-MLU9")).toBeUndefined();
  });
});
```

- [ ] **Step 3: Write the failing test `tests/autos/project.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { CAR_OPPORTUNITY_POLICY, type CarAnalysis } from "../../classes/autos/analyze";
import { buildCarCatalog, buildOpportunitySnapshot, publicCarListing } from "../../classes/autos/project";
import type { CarListing } from "../../classes/autos/types";

const NOW = new Date("2026-09-16T12:00:00.000Z");
function car(overrides: Partial<CarListing> = {}): CarListing {
  return {
    id: "MLU1", source: "mercadolibre", brandId: "1", brand: "Peugeot", modelId: "2", model: "208",
    title: "Peugeot 208 1.5 Allure llamar 099 123 456", year: 2017, km: 112_000, price: 7_900, currency: "USD",
    transmission: "manual", fuel: "nafta", neighborhood: "Pocitos", department: "Montevideo", sellerType: "dealer",
    sellerId: "SELLERID", picture: "https://http2.mlstatic.com/D_1.webp", pictureCount: 9,
    permalink: "https://auto.mercadolibre.com.uy/MLU-1-peugeot-_JM", observedAt: NOW.toISOString(), key: "ml-MLU1",
    brandSlug: "peugeot", modelSlug: "208", marketSlug: "peugeot-208", engine: "1.5", trim: "allure", trimLabel: "Allure",
    kmQuality: "ok", flags: [], priceUsd: 7_900, priceConverted: false, firstSeen: NOW.toISOString(), lastSeen: NOW.toISOString(),
    priceDrop: null,
    detail: { readAt: NOW.toISOString(), price: 7_900, currency: "USD", active: true, brand: "Peugeot", model: "208", year: 2017,
      km: 112_000, version: "1.5 Allure", engineText: null, sellerName: "Automotora X", bodyType: null, color: null, doors: null,
      flags: [], description: "PRIVATE DESCRIPTION TEXT" },
    ...overrides,
  };
}

describe("publicCarListing", () => {
  it("projects only public fields and cleans contact data", () => {
    const row = publicCarListing(car(), null)!;
    expect(Object.keys(row).sort()).toEqual([
      "brand", "brandSlug", "currency", "dealerName", "department", "engine", "firstSeen", "flags", "fuel", "key", "km",
      "lastSeen", "marketSlug", "model", "modelSlug", "neighborhood", "opportunity", "permalink", "picture", "pictureCount",
      "price", "priceConverted", "priceDrop", "priceUsd", "sellerType", "title", "transmission", "trim", "year",
    ]);
    expect(row.title).toBe("Peugeot 208 1.5 Allure llamar");
    expect(row.dealerName).toBe("Automotora X");
    expect(JSON.stringify(row)).not.toMatch(/PRIVATE|SELLERID/);
  });
  it("hides placeholder km, foreign pictures and private sellers' names", () => {
    expect(publicCarListing(car({ kmQuality: "placeholder", km: 111_111 }), null)!.km).toBeNull();
    expect(publicCarListing(car({ picture: "https://tracker.example/x.jpg" }), null)!.picture).toBeNull();
    expect(publicCarListing(car({ sellerType: "private" }), null)!.dealerName).toBeNull();
    expect(publicCarListing(car({ permalink: "https://evil.example/MLU-1" }), null)).toBeNull();
  });
});

const analysis = (subject: CarListing, peers: CarListing[]): CarAnalysis => ({
  accepted: [{ subject, tier: "strict", comparables: peers, sample: {
    n: peers.length, sellers: peers.length, dealers: 3, privates: 7, p25: 10_000, median: 10_600, p75: 11_200, spread: 0.113,
    kmMedian: 110_000, kmP75: 118_000, gap: 0.2547, conservativeGap: 0.21, sellerSensitivityGap: 0.22 } }],
  needsDetail: [],
  stats: { input: 11, eligible: 11, analyzed: 11, candidates: 1, verified: 1, strict: 1, exploratory: 0, review: 0, excluded: {}, rejectedByDetail: {} },
});

describe("snapshots", () => {
  const peers = Array.from({ length: 10 }, (_, i) => car({ id: `MLU${10 + i}`, key: `ml-MLU${10 + i}`, sellerId: `S${i}`,
    permalink: `https://auto.mercadolibre.com.uy/MLU-${10 + i}-x-_JM`, price: 10_000 + i * 100, priceUsd: 10_000 + i * 100 }));
  it("badges opportunities in the catalog and keeps only fresh rows", () => {
    const stale = car({ id: "MLU2", key: "ml-MLU2", lastSeen: "2026-09-01T00:00:00.000Z", permalink: "https://auto.mercadolibre.com.uy/MLU-2-x-_JM" });
    const { listings, meta } = buildCarCatalog([car(), stale, ...peers], analysis(car(), peers), {
      now: NOW, generatedAt: NOW.toISOString(), usdUyu: 40.2, lastFullReadAt: NOW.toISOString(), lastReadAt: NOW.toISOString(), reportedTotal: 17_041,
    });
    expect(listings).toHaveLength(11);
    expect(listings.find(row => row.key === "ml-MLU1")!.opportunity).toEqual({ tier: "strict", gap: 0.255, median: 10600, n: 10 });
    expect(meta).toMatchObject({ key: "uy-cars", freshDays: 4, sourceCoverage: "partial", listings: 11, opportunities: 1,
      models: [{ slug: "peugeot-208", brand: "Peugeot", model: "208", listings: 11 }] });
  });
  it("publishes the policy, the sample and the comparables without private data", () => {
    const snapshot = buildOpportunitySnapshot(analysis(car(), peers), { generatedAt: NOW.toISOString(), usdUyu: 40.2 });
    expect(snapshot).toMatchObject({ version: 1, algorithm: "car-cohort-v1", policy: { maximumGap: CAR_OPPORTUNITY_POLICY.maximumGap } });
    expect(snapshot.items[0]).toMatchObject({ tier: "strict", gap: 0.255, sample: { n: 10, median: 10600 }, detailReadAt: NOW.toISOString() });
    expect(snapshot.items[0]!.comparables).toHaveLength(10);
    expect(JSON.stringify(snapshot)).not.toMatch(/PRIVATE|sellerId|SELLERID|description/);
  });
});
```

- [ ] **Step 4: Run to verify both fail**

Run: `npx vitest run tests/autos/store.test.ts tests/autos/project.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 5: Write `classes/autos/project.ts`**

```ts
// The public boundary. Every public row is REBUILT field by field: descriptions, seller ids, price
// history and the ML detail payload never cross it.
import { CAR_OPPORTUNITY_POLICY, type CarAnalysis, type CarCandidate } from "./analyze";
import { cleanPublicText } from "./normalize";
import type {
  PublicCarCatalogMeta, PublicCarComparable, PublicCarListing, PublicCarOpportunityItem, PublicCarOpportunitySnapshot,
} from "./publicTypes";
import type { CarListing } from "./types";

export const CAR_CATALOG_FRESH_DAYS = 4;
const PERMALINK_PREFIX = "https://auto.mercadolibre.com.uy/MLU-";
const round3 = (value: number): number => Math.round(value * 1000) / 1000;

function safePicture(url: string | null): string | null {
  try {
    const parsed = new URL(String(url || ""));
    return parsed.protocol === "https:" && parsed.host === "http2.mlstatic.com" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function publicCarListing(listing: CarListing, opportunity: PublicCarListing["opportunity"]): PublicCarListing | null {
  if (!listing.permalink.startsWith(PERMALINK_PREFIX)) return null;
  return {
    key: listing.key,
    brand: listing.brand,
    brandSlug: listing.brandSlug,
    model: listing.model,
    modelSlug: listing.modelSlug,
    marketSlug: listing.marketSlug,
    title: cleanPublicText(listing.title).slice(0, 160),
    year: listing.year,
    km: listing.kmQuality === "ok" ? listing.km : null,
    price: listing.price,
    currency: listing.currency,
    priceUsd: listing.priceUsd,
    priceConverted: listing.priceConverted,
    transmission: listing.transmission,
    fuel: listing.fuel,
    engine: listing.engine,
    trim: listing.trimLabel,
    department: listing.department,
    neighborhood: listing.neighborhood,
    sellerType: listing.sellerType,
    dealerName: listing.sellerType === "dealer" && listing.detail?.sellerName ? cleanPublicText(listing.detail.sellerName) : null,
    picture: safePicture(listing.picture),
    pictureCount: listing.pictureCount,
    permalink: listing.permalink,
    firstSeen: listing.firstSeen,
    lastSeen: listing.lastSeen,
    priceDrop: listing.priceDrop ? { ...listing.priceDrop } : null,
    flags: [...listing.flags],
    opportunity,
  };
}

const badgeOf = (candidate: CarCandidate): NonNullable<PublicCarListing["opportunity"]> => ({
  tier: candidate.tier, gap: round3(candidate.sample.gap), median: Math.round(candidate.sample.median), n: candidate.sample.n,
});

export interface CatalogContext {
  now: Date;
  generatedAt: string;
  usdUyu: number;
  lastFullReadAt: string | null;
  lastReadAt: string | null;
  reportedTotal: number | null;
}

export function buildCarCatalog(listings: readonly CarListing[], analysis: CarAnalysis, context: CatalogContext): { listings: PublicCarListing[]; meta: PublicCarCatalogMeta } {
  const badges = new Map(analysis.accepted.map(candidate => [candidate.subject.key, badgeOf(candidate)]));
  const cutoff = context.now.getTime() - CAR_CATALOG_FRESH_DAYS * 86_400_000;
  const rows = listings
    .filter(listing => Date.parse(listing.lastSeen) >= cutoff)
    .map(listing => publicCarListing(listing, badges.get(listing.key) ?? null))
    .filter((row): row is PublicCarListing => !!row)
    .sort((a, b) => a.key.localeCompare(b.key));
  const models = new Map<string, { slug: string; brand: string; model: string; listings: number }>();
  for (const row of rows) {
    const entry = models.get(row.marketSlug) ?? { slug: row.marketSlug, brand: row.brand, model: row.model, listings: 0 };
    entry.listings++;
    models.set(row.marketSlug, entry);
  }
  return {
    listings: rows,
    meta: {
      key: "uy-cars",
      generatedAt: context.generatedAt,
      freshDays: CAR_CATALOG_FRESH_DAYS,
      sourceCoverage: "partial",
      listings: rows.length,
      usdUyu: context.usdUyu,
      lastFullReadAt: context.lastFullReadAt,
      lastReadAt: context.lastReadAt,
      reportedTotal: context.reportedTotal,
      opportunities: rows.filter(row => row.opportunity).length,
      models: [...models.values()].sort((a, b) => b.listings - a.listings || a.slug.localeCompare(b.slug)),
    },
  };
}

function comparable(listing: CarListing): PublicCarComparable {
  return {
    key: listing.key,
    title: cleanPublicText(listing.title).slice(0, 160),
    year: listing.year,
    km: listing.km!,
    priceUsd: listing.priceUsd,
    trim: listing.trimLabel,
    engine: listing.engine,
    sellerType: listing.sellerType,
    permalink: listing.permalink,
    lastSeen: listing.lastSeen,
  };
}

export function buildOpportunitySnapshot(analysis: CarAnalysis, context: { generatedAt: string; usdUyu: number }): PublicCarOpportunitySnapshot {
  const policy = CAR_OPPORTUNITY_POLICY;
  const items: PublicCarOpportunityItem[] = [];
  for (const candidate of analysis.accepted) {
    const subject = publicCarListing(candidate.subject, badgeOf(candidate));
    if (!subject || !candidate.subject.detail) continue;
    const sample = candidate.sample;
    items.push({
      subject,
      tier: candidate.tier,
      gap: round3(sample.gap),
      conservativeGap: round3(sample.conservativeGap),
      sellerSensitivityGap: round3(sample.sellerSensitivityGap),
      sample: {
        n: sample.n, sellers: sample.sellers, dealers: sample.dealers, privates: sample.privates,
        p25: Math.round(sample.p25), median: Math.round(sample.median), p75: Math.round(sample.p75),
        spread: round3(sample.spread), kmMedian: Math.round(sample.kmMedian), kmP75: Math.round(sample.kmP75),
      },
      comparables: candidate.comparables.filter(peer => peer.permalink.startsWith(PERMALINK_PREFIX)).map(comparable),
      detailReadAt: candidate.subject.detail.readAt,
    });
  }
  return {
    version: 1,
    algorithm: "car-cohort-v1",
    generatedAt: context.generatedAt,
    usdUyu: context.usdUyu,
    policy: {
      freshDays: policy.freshDays,
      kmToleranceRatio: policy.kmToleranceRatio,
      kmToleranceMin: policy.kmToleranceMin,
      maximumPerSeller: policy.maximumPerSeller,
      maximumGap: policy.maximumGap,
      strict: { ...policy.strict },
      exploratory: { ...policy.exploratory },
    },
    items,
    stats: { ...analysis.stats, excluded: { ...analysis.stats.excluded }, rejectedByDetail: { ...analysis.stats.rejectedByDetail } },
  };
}
```

- [ ] **Step 6: Write `classes/autos/store.ts`**

```ts
// APP DB boundary of the used-car job. Pure rules first (tested without Mongo), then I/O.
import { appConnection } from "../appdb";
import { CarCatalogMetaModel } from "../models/CarCatalogMeta";
import { CarHarvestMetaModel } from "../models/CarHarvestMeta";
import { CarListingModel } from "../models/CarListing";
import { CarMarketSnapshotModel } from "../models/CarMarketSnapshot";
import { CarOpportunitySnapshotModel } from "../models/CarOpportunitySnapshot";
import { carKey } from "./enrich";
import type { DetailFetchResult } from "./detail";
import type { PublicCarCatalogMeta, PublicCarListing, PublicCarMarketSnapshot, PublicCarOpportunitySnapshot } from "./publicTypes";
import type { CarHarvestResult, CarModelVocabulary, CarPricePoint, RawCarListing, StoredCar } from "./types";

export const CAR_CATALOG_COLLECTION = "carcatalog";
const CHUNK = 300;
const MAX_SNAPSHOT_BYTES = 7 * 1024 * 1024;

export function nextPriceHistory(history: readonly CarPricePoint[], listing: RawCarListing): CarPricePoint[] {
  const last = history[history.length - 1];
  if (last && last.price === listing.price && last.currency === listing.currency) return [...history];
  return [...history, { price: listing.price, currency: listing.currency, observedAt: listing.observedAt }].slice(-20);
}

export function sweepUpdate(doc: { missedFullSweeps?: number | null; retiredAt?: string | null }, now: string): { missedFullSweeps: number; retiredAt: string | null } {
  const missed = (doc.missedFullSweeps ?? 0) + 1;
  return { missedFullSweeps: missed, retiredAt: doc.retiredAt ?? (missed >= 2 ? now : null) };
}

export function collapseRefusal(previous: number | null | undefined, next: number, label: string): string | null {
  if (previous && previous > 100 && next < previous * 0.4) {
    return `${label}: ${next} contra ${previous} de la corrida anterior (caída de más de 60 %); se conserva lo publicado`;
  }
  return null;
}

export function mergeVocabularies(previous: readonly CarModelVocabulary[], next: readonly CarModelVocabulary[]): CarModelVocabulary[] {
  const merged = new Map<string, Set<string>>();
  for (const vocabulary of [...previous, ...next]) {
    const key = `${vocabulary.brandId}|${vocabulary.modelId}`;
    const trims = merged.get(key) ?? new Set<string>();
    vocabulary.trims.forEach(trim => trims.add(trim));
    merged.set(key, trims);
  }
  return [...merged]
    .map(([key, trims]) => {
      const [brandId = "", modelId = ""] = key.split("|");
      return { brandId, modelId, trims: [...trims].sort() };
    })
    .sort((a, b) => `${a.brandId}|${a.modelId}`.localeCompare(`${b.brandId}|${b.modelId}`));
}

export interface HarvestMetaRecord {
  mode: "full" | "fast";
  startedAt: string;
  finishedAt: string;
  listings: number;
  requests: number;
  pages: number;
  failedPages: number;
  rejectedCards: number;
  completeBrands: number;
  gaps: CarHarvestResult["gaps"];
  reportedTotal: number | null;
  note: string | null;
  ok: boolean;
  lastOkAt: string | null;
  failingSince: string | null;
}

export function harvestMetaRecord(harvest: CarHarvestResult, previous: { lastOkAt?: string | null; failingSince?: string | null } | null): HarvestMetaRecord {
  const ok = harvest.failedPages === 0 && !harvest.note && harvest.listings.length > 0;
  return {
    mode: harvest.mode,
    startedAt: harvest.startedAt,
    finishedAt: harvest.finishedAt,
    listings: harvest.listings.length,
    requests: harvest.requests,
    pages: harvest.pages,
    failedPages: harvest.failedPages,
    rejectedCards: harvest.rejectedCards,
    completeBrands: harvest.completeBrands.length,
    gaps: harvest.gaps.slice(0, 50),
    reportedTotal: harvest.reportedTotal,
    note: harvest.note,
    ok,
    lastOkAt: ok ? harvest.finishedAt : previous?.lastOkAt ?? null,
    failingSince: ok ? null : previous?.failingSince ?? harvest.finishedAt,
  };
}

const listingsCollection = () => appConnection().collection(CarListingModel.collection.name);

export async function loadStoredCars(now: Date, days = 21): Promise<StoredCar[]> {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
  const rows = await listingsCollection().find({ lastSeen: { $gte: cutoff }, retiredAt: null }, { projection: { _id: 0 } }).toArray();
  return rows as unknown as StoredCar[];
}

export async function saveCarHarvest(harvest: CarHarvestResult): Promise<{ upserted: number; retired: number }> {
  const collection = listingsCollection();
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ lastSeen: 1 });
  let upserted = 0;
  for (let index = 0; index < harvest.listings.length; index += CHUNK) {
    const chunk = harvest.listings.slice(index, index + CHUNK);
    const existing = new Map(
      (await collection.find({ key: { $in: chunk.map(listing => carKey(listing.id)) } }, { projection: { key: 1, priceHistory: 1 } }).toArray())
        .map(doc => [String(doc.key), doc])
    );
    const operations = chunk.map(listing => {
      const key = carKey(listing.id);
      const history = nextPriceHistory((existing.get(key)?.priceHistory as CarPricePoint[] | undefined) ?? [], listing);
      return {
        updateOne: {
          filter: { key },
          update: {
            $set: { listing, lastSeen: listing.observedAt, priceHistory: history, missedFullSweeps: 0, retiredAt: null },
            $setOnInsert: { key, firstSeen: listing.observedAt, detail: null },
          },
          upsert: true,
        },
      };
    });
    const result = await collection.bulkWrite(operations, { ordered: false });
    upserted += result.upsertedCount + result.modifiedCount;
  }
  let retired = 0;
  if (harvest.mode === "full" && harvest.completeBrands.length) {
    const missing = await collection.find(
      {
        "listing.brandId": { $in: harvest.completeBrands },
        key: { $nin: harvest.listings.map(listing => carKey(listing.id)) },
        lastSeen: { $lt: harvest.startedAt },
        retiredAt: null,
      },
      { projection: { key: 1, missedFullSweeps: 1, retiredAt: 1 } }
    ).toArray();
    const operations = missing.map(doc => {
      const update = sweepUpdate(doc as { missedFullSweeps?: number; retiredAt?: string | null }, harvest.finishedAt);
      if (update.retiredAt) retired++;
      return { updateOne: { filter: { key: doc.key }, update: { $set: update } } };
    });
    for (let index = 0; index < operations.length; index += CHUNK) {
      await collection.bulkWrite(operations.slice(index, index + CHUNK), { ordered: false });
    }
  }
  return { upserted, retired };
}

export async function saveCarDetails(result: DetailFetchResult, now: string): Promise<void> {
  const operations = [
    ...[...result.details].map(([key, detail]) => ({ updateOne: { filter: { key }, update: { $set: { detail } } } })),
    ...result.gone.map(key => ({ updateOne: { filter: { key }, update: { $set: { retiredAt: now } } } })),
  ];
  if (operations.length) await listingsCollection().bulkWrite(operations, { ordered: false });
}

const VOCABULARY_KEY = "uy-cars-vocabulary";

export async function loadHarvestMeta(key: string): Promise<Record<string, unknown> | null> {
  const doc = await CarHarvestMetaModel.findOne({ key }).lean();
  return (doc?.data as Record<string, unknown> | undefined) ?? null;
}

export async function loadVocabularies(): Promise<CarModelVocabulary[]> {
  const data = await loadHarvestMeta(VOCABULARY_KEY);
  return Array.isArray(data?.vocabularies) ? (data!.vocabularies as CarModelVocabulary[]) : [];
}

export async function saveVocabularies(vocabularies: readonly CarModelVocabulary[], updatedAt: string): Promise<void> {
  await CarHarvestMetaModel.updateOne({ key: VOCABULARY_KEY }, { $set: { updatedAt, data: { vocabularies } } }, { upsert: true });
}

export async function saveHarvestMeta(harvest: CarHarvestResult): Promise<HarvestMetaRecord> {
  const key = harvest.mode === "full" ? "uy-cars-last-full" : "uy-cars-last-fast";
  const previous = (await loadHarvestMeta(key)) as { lastOkAt?: string | null; failingSince?: string | null } | null;
  const record = harvestMetaRecord(harvest, previous);
  await CarHarvestMetaModel.updateOne({ key }, { $set: { updatedAt: harvest.finishedAt, data: record } }, { upsert: true });
  await CarHarvestMetaModel.updateOne({ key: "uy-cars" }, { $set: { updatedAt: harvest.finishedAt, data: record } }, { upsert: true });
  return record;
}

export async function loadCatalogMeta(): Promise<PublicCarCatalogMeta | null> {
  const doc = await CarCatalogMetaModel.findOne({ key: "uy-cars" }).lean();
  return (doc?.meta as PublicCarCatalogMeta | undefined) ?? null;
}

export async function publishCarCatalog(rows: readonly PublicCarListing[], meta: PublicCarCatalogMeta): Promise<void> {
  const collection = appConnection().collection(CAR_CATALOG_COLLECTION);
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ marketSlug: 1, year: -1 });
  await collection.createIndex({ brandSlug: 1, lastSeen: -1 });
  await collection.createIndex({ lastSeen: -1, firstSeen: -1 });
  await collection.createIndex({ priceUsd: 1 });
  for (let index = 0; index < rows.length; index += CHUNK) {
    await collection.bulkWrite(rows.slice(index, index + CHUNK).map(row => ({
      replaceOne: { filter: { key: row.key }, replacement: row, upsert: true },
    })), { ordered: false });
  }
  await collection.deleteMany({ key: { $nin: rows.map(row => row.key) } });
  await CarCatalogMetaModel.updateOne({ key: "uy-cars" }, { $set: { generatedAt: meta.generatedAt, meta } }, { upsert: true });
}

export async function publishCarMarkets(snapshots: readonly PublicCarMarketSnapshot[]): Promise<void> {
  const collection = appConnection().collection(CarMarketSnapshotModel.collection.name);
  await collection.createIndex({ key: 1 }, { unique: true });
  for (let index = 0; index < snapshots.length; index += CHUNK) {
    await collection.bulkWrite(snapshots.slice(index, index + CHUNK).map(snapshot => ({
      replaceOne: { filter: { key: snapshot.slug }, replacement: { key: snapshot.slug, generatedAt: snapshot.generatedAt, snapshot }, upsert: true },
    })), { ordered: false });
  }
  await collection.deleteMany({ key: { $nin: snapshots.map(snapshot => snapshot.slug) } });
}

export async function loadOpportunityStats(): Promise<PublicCarOpportunitySnapshot["stats"] | null> {
  const doc = await CarOpportunitySnapshotModel.findOne({ key: "used" }).lean();
  return (doc?.snapshot as PublicCarOpportunitySnapshot | undefined)?.stats ?? null;
}

export async function saveCarOpportunitySnapshot(snapshot: PublicCarOpportunitySnapshot): Promise<void> {
  let bounded = snapshot;
  while (Buffer.byteLength(JSON.stringify(bounded)) > MAX_SNAPSHOT_BYTES && bounded.items.length) {
    bounded = { ...bounded, items: bounded.items.slice(0, Math.floor(bounded.items.length * 0.8)) };
  }
  await CarOpportunitySnapshotModel.updateOne({ key: "used" }, { $set: { generatedAt: bounded.generatedAt, snapshot: bounded } }, { upsert: true });
}
```

- [ ] **Step 7: Run tests until green**

Run: `npx vitest run tests/autos`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add classes/models/Car*.ts classes/autos/store.ts classes/autos/project.ts tests/autos/store.test.ts tests/autos/project.test.ts
git commit -m "feat(autos): almacenamiento privado y proyeccion publica del catalogo"
```

---

### Task 6: Job entrypoint, pm2, deploy wiring and docs

**Files:**
- Create: `sync_autos.ts`, `scripts/run-autos.sh`, `tests/autos/deploy.test.ts`, `docs/app/AUTOS.md`
- Modify: `ecosystem.config.js` (after the `currency-property-opportunities-hourly` object), `scripts/deploy-backend.sh` (`OTHER_APPS` line), `.github/workflows/deploy.yml` (backend filter), `AGENTS.md` (pm2 table), `classes/AGENTS.md` (feature dir list)

**Interfaces:**
- Consumes: Tasks 1–5; `fetchUsdUyuRate()` from `classes/rentals/rate`; `appConnection`, `appDbConfigured`.
- Produces: CLI `node dist/sync_autos.js [--fast] [--analyze-only] [--dry-run] [--report=<file>] [--harvest-snapshot=<file>] [--save-harvest=<file>]`.

- [ ] **Step 1: Write the failing test `tests/autos/deploy.test.ts`**

```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..", "..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("used-car job wiring", () => {
  it("runs the daily and hourly jobs through the same exclusive wrapper", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const apps = require(path.join(ROOT, "ecosystem.config.js")).apps.filter((app: { name: string }) => app.name.startsWith("currency-autos"));
    expect(apps.map((app: { name: string }) => app.name).sort()).toEqual(["currency-autos", "currency-autos-hourly"]);
    for (const app of apps) {
      expect(app).toMatchObject({ script: "scripts/run-autos.sh", interpreter: "bash", autorestart: false, exec_mode: "fork" });
    }
    expect(apps.find((app: { name: string }) => app.name === "currency-autos-hourly").args).toBe("--fast");
  });
  it("starts both on deploy and redeploys when the wrapper changes", () => {
    const deploy = read("scripts/deploy-backend.sh");
    expect(deploy).toMatch(/OTHER_APPS=\([^)]*\bcurrency-autos\b[^)]*\)/);
    expect(deploy).toMatch(/OTHER_APPS=\([^)]*\bcurrency-autos-hourly\b[^)]*\)/);
    expect(read(".github/workflows/deploy.yml")).toContain("'scripts/run-autos.sh'");
  });
  it("locks and execs the compiled entrypoint", () => {
    const wrapper = read("scripts/run-autos.sh");
    expect(wrapper).toContain("flock -n 9");
    expect(wrapper).toContain('exec node dist/sync_autos.js "$@"');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/autos/deploy.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `scripts/run-autos.sh`** (use the Write tool so it has LF endings)

```bash
#!/usr/bin/env bash
set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"
exec 9>"/tmp/cambio-uruguay-autos.lock"
if ! flock -n 9; then
  echo '[autos] another used-car run is in progress; skipping this run.'
  exit 0
fi
exec node dist/sync_autos.js "$@"
```

- [ ] **Step 4: Add the pm2 apps to `ecosystem.config.js`** (right after `currency-property-opportunities-hourly`)

```js
    {
      // Used-car directory + opportunities (/autos-usados-uruguay): brand -> model sweep of
      // Mercado Libre through the :9656 bridge, after the rentals window that also uses it.
      name: "currency-autos",
      autorestart: false,
      exec_mode: "fork",
      script: "scripts/run-autos.sh",
      interpreter: "bash",
      cron_restart: "43 7 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Hourly: only adverts published today, then re-analyse and republish. Never retires.
      name: "currency-autos-hourly",
      autorestart: false,
      exec_mode: "fork",
      script: "scripts/run-autos.sh",
      interpreter: "bash",
      args: "--fast",
      cron_restart: "29 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```

- [ ] **Step 5: Register the apps**

In `scripts/deploy-backend.sh`, append ` currency-autos currency-autos-hourly` inside `OTHER_APPS=( … )` on the same line. In `.github/workflows/deploy.yml`, directly below `- 'scripts/run-property-opportunities.sh'` add `- 'scripts/run-autos.sh'` with identical indentation.

- [ ] **Step 6: Write `sync_autos.ts`**

```ts
import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { analyzeCars } from "./classes/autos/analyze";
import { fetchCarDetails } from "./classes/autos/detail";
import { enrichCarListing } from "./classes/autos/enrich";
import { buildMarketSnapshots } from "./classes/autos/market";
import { buildCarCatalog, buildOpportunitySnapshot, CAR_CATALOG_FRESH_DAYS } from "./classes/autos/project";
import { harvestMercadoLibreCars } from "./classes/autos/sources/mercadolibre";
import {
  collapseRefusal, loadCatalogMeta, loadHarvestMeta, loadOpportunityStats, loadStoredCars, loadVocabularies,
  mergeVocabularies, publishCarCatalog, publishCarMarkets, saveCarDetails, saveCarHarvest, saveCarOpportunitySnapshot,
  saveHarvestMeta, saveVocabularies,
} from "./classes/autos/store";
import type { CarDetail, CarHarvestResult, CarListing, CarModelVocabulary, StoredCar } from "./classes/autos/types";
import { fetchUsdUyuRate } from "./classes/rentals/rate";

const argument = (name: string): string | undefined =>
  process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

function storedFromHarvest(harvest: CarHarvestResult): StoredCar[] {
  return harvest.listings.map(listing => ({
    key: `ml-${listing.id}`, firstSeen: listing.observedAt, lastSeen: listing.observedAt, listing,
    priceHistory: [{ price: listing.price, currency: listing.currency, observedAt: listing.observedAt }],
    retiredAt: null, missedFullSweeps: 0, detail: null,
  }));
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const fast = process.argv.includes("--fast");
  let analyzeOnly = process.argv.includes("--analyze-only");
  const reportFile = argument("report");
  const snapshotFile = argument("harvest-snapshot");
  const saveHarvestFile = argument("save-harvest");
  if (!dryRun && !appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  if (process.env.AUTOS_ML_ENABLED === "0" && !snapshotFile) {
    console.log("[autos] AUTOS_ML_ENABLED=0: skipping Mercado Libre, analysing stored adverts only");
    analyzeOnly = true;
  }
  const now = new Date();
  const usdUyu = await fetchUsdUyuRate();
  if (!(usdUyu > 0)) throw new Error("No current USD/UYU reference; keeping previous publication");

  let harvest: CarHarvestResult | null = null;
  if (snapshotFile) harvest = JSON.parse(fs.readFileSync(snapshotFile, "utf8").replace(/^\uFEFF/, ""));
  else if (!analyzeOnly) {
    harvest = await harvestMercadoLibreCars({
      mode: fast ? "fast" : "full",
      maxRequests: Number(process.env.AUTOS_ML_MAX_REQUESTS || (fast ? 600 : 3_500)),
      maxDurationMs: (fast ? 12 : 75) * 60_000,
      concurrency: Number(process.env.AUTOS_ML_CONCURRENCY || 4),
      onProgress: message => console.log(message),
    });
    console.log(`[autos] harvest ${harvest.mode}: ${harvest.listings.length} adverts, ${harvest.requests} requests, ${harvest.failedPages} failed pages${harvest.note ? `, ${harvest.note}` : ""}`);
  }
  if (harvest && saveHarvestFile) fs.writeFileSync(saveHarvestFile, JSON.stringify(harvest));

  let vocabularies: CarModelVocabulary[] = dryRun ? [] : await loadVocabularies();
  if (harvest) vocabularies = mergeVocabularies(vocabularies, harvest.vocabularies);
  if (harvest && !dryRun) {
    const saved = await saveCarHarvest(harvest);
    await saveVocabularies(vocabularies, harvest.finishedAt);
    await saveHarvestMeta(harvest);
    console.log(`[autos] stored ${saved.upserted} adverts, retired ${saved.retired}`);
  }
  const stored = dryRun ? (harvest ? storedFromHarvest(harvest) : []) : await loadStoredCars(now);
  const trimsByModel = new Map(vocabularies.map(vocabulary => [`${vocabulary.brandId}|${vocabulary.modelId}`, vocabulary.trims]));
  const enrich = (doc: StoredCar, detail: CarDetail | null): CarListing => enrichCarListing(doc.listing, {
    usdUyu, trims: trimsByModel.get(`${doc.listing.brandId}|${doc.listing.modelId}`) ?? [],
    firstSeen: doc.firstSeen, lastSeen: doc.lastSeen, priceHistory: doc.priceHistory ?? [], detail,
  });
  let listings = stored.map(doc => enrich(doc, doc.detail));
  const details = new Map(listings.filter(listing => listing.detail).map(listing => [listing.key, listing.detail!] as [string, CarDetail]));
  let analysis = analyzeCars(listings, { now, details, vocabularies: trimsByModel });

  if (analysis.needsDetail.length) {
    const byKey = new Map(listings.map(listing => [listing.key, listing]));
    const fetched = await fetchCarDetails(
      analysis.needsDetail.map(key => byKey.get(key)!).map(listing => ({ key: listing.key, permalink: listing.permalink })),
      { max: Number(process.env.AUTOS_DETAIL_MAX || 400), maxDurationMs: 20 * 60_000 },
    );
    console.log(`[autos] advert pages: ${fetched.details.size} read, ${fetched.gone.length} gone, ${fetched.failed} failed`);
    if (!dryRun) await saveCarDetails(fetched, new Date().toISOString());
    const gone = new Set(fetched.gone);
    listings = stored.filter(doc => !gone.has(doc.key)).map(doc => enrich(doc, fetched.details.get(doc.key) ?? doc.detail));
    for (const [key, detail] of fetched.details) details.set(key, detail);
    analysis = analyzeCars(listings, { now, details, vocabularies: trimsByModel });
  }

  const generatedAt = new Date().toISOString();
  const lastFull = dryRun ? null : await loadHarvestMeta("uy-cars-last-full");
  const lastRun = dryRun ? null : await loadHarvestMeta("uy-cars");
  const catalog = buildCarCatalog(listings, analysis, {
    now, generatedAt, usdUyu,
    lastFullReadAt: (lastFull?.lastOkAt as string | undefined) ?? (harvest?.mode === "full" ? harvest.finishedAt : null),
    lastReadAt: (lastRun?.finishedAt as string | undefined) ?? harvest?.finishedAt ?? null,
    reportedTotal: (lastFull?.reportedTotal as number | undefined) ?? harvest?.reportedTotal ?? null,
  });
  const markets = buildMarketSnapshots(listings, { now, generatedAt, freshDays: CAR_CATALOG_FRESH_DAYS });
  const snapshot = buildOpportunitySnapshot(analysis, { generatedAt, usdUyu });
  console.log(`[autos] catalog ${catalog.listings.length}, models ${markets.length}, opportunities ${snapshot.items.length}`, JSON.stringify(analysis.stats));

  if (reportFile) {
    fs.writeFileSync(reportFile, JSON.stringify({ dryRun, catalogMeta: catalog.meta, markets: markets.slice(0, 30), snapshot }, null, 2));
  }
  if (dryRun) return;

  const previousCatalog = await loadCatalogMeta();
  const catalogRefusal = collapseRefusal(previousCatalog?.listings, catalog.listings.length, "catálogo");
  if (catalogRefusal) console.warn(`[autos] ${catalogRefusal}`);
  else {
    await publishCarCatalog(catalog.listings, catalog.meta);
    await publishCarMarkets(markets);
  }
  const previousStats = await loadOpportunityStats();
  const snapshotRefusal = collapseRefusal(previousStats?.input, snapshot.stats.input, "oportunidades");
  if (snapshotRefusal) console.warn(`[autos] ${snapshotRefusal}`);
  else await saveCarOpportunitySnapshot(snapshot);
}

main()
  .then(async () => {
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(0);
  })
  .catch(async error => {
    console.error("[autos] failed:", error);
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(1);
  });
```

- [ ] **Step 7: Write `docs/app/AUTOS.md`**

```markdown
# Autos usados: directorio y oportunidades

Páginas: `/autos-usados-uruguay` (directorio), `/autos-usados-uruguay/ml-<id>` (ficha, `noindex`),
`/autos-usados-uruguay/precios/<marca>-<modelo>` (mercado del modelo, indexable con ≥ 30 avisos) y
`/oportunidades-autos-usados-uruguay`. Diseño y mediciones:
`docs/superpowers/specs/2026-09-16-autos-usados-directorio-y-oportunidades-design.md`.

## Fuente

Sólo Mercado Libre (categoría `MLU1744`, usados): ~95 % del volumen uruguayo medido el 2026-09-16.
Se lee por el puente `:9656` (pm2 `mercadolibre`, repo trustpilot) partiendo marca → modelo: un
`offset` ≥ 4000 vuelve a la página 0, y marca y modelo salen del filtro aplicado. La ficha propia
(`auto.mercadolibre.com.uy/MLU-…`) se lee sólo para candidatas a oportunidad.

## Jobs

- `currency-autos` (07:43 UTC): barrido completo, análisis y publicación.
- `currency-autos-hourly` (:29): sólo `since=today`; nunca retira avisos.
- Ambos por `scripts/run-autos.sh` (flock propio). `AUTOS_ML_ENABLED=0` publica sin cosechar.

## Colecciones (APP DB)

Privadas: `carlistings` (observación, historial de precio, ficha con descripción) y
`carharvestmetas` (`uy-cars`, `uy-cars-last-full`, `uy-cars-last-fast`, `uy-cars-vocabulary`).
Públicas: `carcatalog`, `carcatalogmetas` (`uy-cars`), `carmarketsnapshots`, `caropportunitysnapshots` (`used`).

Un aviso se retira sólo si su ficha da 404/410 o si dos barridos completos de su marca, sin páginas
fallidas, no lo vieron. Una caída del universo mayor a 60 % conserva lo publicado.

## Diagnosticar

Leer `carharvestmetas` `uy-cars-last-full`: `ok`, `note`, `failedPages`, `gaps`, `lastOkAt`,
`failingSince`. Reprocesar sin red: `node dist/sync_autos.js --dry-run --harvest-snapshot=<archivo> --report=<salida>`.
Guardar una captura: `--save-harvest=<archivo>`.

## Método de oportunidades

Cohorte fijada antes de mirar precios: misma marca+modelo, año, versión (vocabulario `SHORT_VERSION`
de ML contra el título), motor y caja; km dentro de `max(20.000, 30 %)`. Umbrales en
`classes/autos/analyze.ts` (`CAR_OPPORTUNITY_POLICY`), publicados dentro del snapshot. Toda
oportunidad publicada pasó por su ficha: activa, mismo precio/año/km, sin menciones de choque,
recupero, deuda/leasing o chapa extranjera. No es tasación.
```

- [ ] **Step 8: Add the AGENTS.md rows**

In `AGENTS.md`, pm2 table, right after the `currency-property-opportunities-hourly` row:

```markdown
| currency-autos / -hourly | scripts/run-autos.sh → dist/sync_autos.js (`--fast` la horaria) | 43 7 \* \* \* / 29 \* \* \* \* | `/autos-usados-uruguay` + `/oportunidades-autos-usados-uruguay`: autos usados de Mercado Libre (MLU1744) por el puente :9656, partiendo **marca → modelo** porque un offset ≥ 4000 vuelve a la página 0. APP DB privada `carlistings`/`carharvestmetas`; pública `carcatalog`/`carcatalogmetas`/`carmarketsnapshots`/`caropportunitysnapshots`. Oportunidad = cohorte fija (modelo+año+**versión**+motor+caja, km ±30 %), medida sobre 2.279 avisos reales: sin versión y motor la regla "encontraba" 125 gangas que eran otra versión o un 4x2; con ellas, 11. Toda oportunidad pasa por su ficha propia (activa, mismo precio/km, sin choque/recupero/deuda/chapa extranjera). La horaria nunca retira. Ver `docs/app/AUTOS.md` |
```

In `classes/AGENTS.md`, add `autos` to the per-feature directory list (same format and order as that list).

- [ ] **Step 9: Run tripwires and compile**

Run: `npx vitest run tests/autos tests/sync/pm2_registration.test.ts tests/no_scheduler_in_api.test.ts && npx tsc -p tsconfig.production.json --noEmit`
Expected: PASS, no type errors (fix only autos files).

- [ ] **Step 10: Commit**

```bash
git add sync_autos.ts scripts/run-autos.sh ecosystem.config.js scripts/deploy-backend.sh .github/workflows/deploy.yml tests/autos/deploy.test.ts docs/app/AUTOS.md AGENTS.md classes/AGENTS.md
git update-index --chmod=+x scripts/run-autos.sh
git commit -m "feat(autos): job diario y horario de autos usados con registro en pm2 y deploy"
```

---

### Task 7: Live dry-run calibration against the real bridge

**Files:**
- Modify (only if review finds a defect): `classes/autos/*.ts` + matching tests
- Output (not committed): `<scratchpad>/autos-harvest.json`, `<scratchpad>/autos-report.json` where `<scratchpad>` = `/c/Users/airau/AppData/Local/Temp/claude/c--Users-airau-Documents-GitHub-cambio-uruguay/e832301d-4606-48ba-9ec9-cfae46908811/scratchpad`

- [ ] **Step 1: Full harvest dry-run from the worktree (writes only local files)**

```bash
cd /c/Users/airau/Documents/GitHub/cu-autos
S=/c/Users/airau/AppData/Local/Temp/claude/c--Users-airau-Documents-GitHub-cambio-uruguay/e832301d-4606-48ba-9ec9-cfae46908811/scratchpad
APP_MONGO_URI= AUTOS_DETAIL_MAX=150 npx ts-node -T sync_autos.ts --dry-run --save-harvest=$S/autos-harvest.json --report=$S/autos-report.json
```
Run it in the background (20–40 min). Expected: ~17,000 adverts, `failedPages` 0 or near 0, 1,500–2,500 requests.

- [ ] **Step 2: Measure the report**

```bash
node -e '
const r=require(process.argv[1]); const s=r.snapshot;
console.log("catalog",r.catalogMeta.listings,"models",r.catalogMeta.models.length,"opps",s.items.length,JSON.stringify(s.stats));
for (const i of s.items.slice(0,40)) console.log(i.tier,Math.round(i.gap*100)+"%",i.subject.priceUsd,"med",i.sample.median,"n",i.sample.n,i.subject.year,i.subject.km,i.subject.trim,i.subject.engine,"|",i.subject.title,"|",i.subject.permalink);
' $S/autos-report.json
```
Acceptance: published opportunities between 0.3 % and 3 % of the catalog; `excluded.no_trim + excluded.no_engine` below 35 % of `input`; `rejectedByDetail.detail_mismatch` below 30 % of `candidates`.

- [ ] **Step 3: Review the top 40 against their adverts**

Open each permalink (WebFetch or curl) and classify: genuine (same car, lower ask), explained (different version/engine/body the cohort missed, damage, financing price), or broken (parser error). If more than 5 of 40 share one cause, fix that cause in `normalize.ts` / `analyze.ts` / `detail.ts`, add a test using the real title/description fragment, and re-run WITHOUT re-harvesting:

```bash
APP_MONGO_URI= AUTOS_DETAIL_MAX=150 npx ts-node -T sync_autos.ts --dry-run --harvest-snapshot=$S/autos-harvest.json --report=$S/autos-report.json
```

- [ ] **Step 4: Check the detail-verdict distribution**

If `detail_trim_mismatch` or `detail_mismatch` dominates `rejectedByDetail`, inspect 10 rejected subjects (temporary logging in a scratch copy, NOT committed) and fix the comparison with a test.

- [ ] **Step 5: Commit fixes (if any)**

```bash
git add classes/autos tests/autos
git commit -m "fix(autos): calibracion contra la cosecha real"
```
Record the tally (genuine/explained/broken of 40) for the final report whether or not code changed.

---

### Task 8: App data layer and APIs

**Files:**
- Create: `app/utils/carsPublic.ts`, `app/utils/cars.ts`, `app/server/models/CarCatalog.ts`, `app/server/models/CarCatalogMeta.ts`, `app/server/models/CarMarketSnapshot.ts`, `app/server/models/CarOpportunitySnapshot.ts`, `app/server/utils/cars.ts`, `app/server/api/cars/index.get.ts`, `app/server/api/cars/ficha/[key].get.ts`, `app/server/api/cars/market/[slug].get.ts`, `app/server/api/car-opportunities.get.ts`, `app/tests/unit/cars.test.ts`, `app/tests/unit/carsApi.test.ts`, `tests/autos/contracts.test.ts`
- Modify: `tests/appdb/schema_parity.test.ts`

**Interfaces:**
- Consumes: public collections from Task 5.
- Produces (`app/utils/cars.ts`): `CARS_PATH`, `CAR_OPPORTUNITIES_PATH`, `CARS_PER_PAGE`, `CAR_OPPORTUNITIES_PER_PAGE`, `CAR_MARKET_INDEX_MIN`, `CAR_OPPORTUNITY_FRESH_DAYS`, `CAR_SORTS`, `CarSort`, `CAR_FUELS`, `CAR_TRANSMISSIONS`, `CAR_SELLERS`, `CAR_DEPARTMENTS`, `CAR_FUEL_LABELS`, `CAR_TRANSMISSION_LABELS`, `CAR_SELLER_LABELS`, `CAR_FLAG_LABELS`, `CarsQuery`, `CarFacet`, `CarsResponse`, `CarDetailResponse`, `CarMarketResponse`, `CarOpportunityQuery`, `CarOpportunitiesResponse`, `normalizeCarsQuery`, `carsQueryParams`, `carsFiltered`, `carsMatch`, `carsSort`, `carKeyValid`, `carMarketSlugValid`, `carPath`, `carMarketPath`, `normalizeCarOpportunityQuery`, `carOpportunityQueryParams`, `queryCarOpportunities`, `formatCarUsd`, `formatCarKm`, `formatCarPrice`, `carPercent`, `formatCarDate`.
- Produces (`app/server/utils/cars.ts`): `carListingProjection`, `publicCarRow(row)`, `loadCarCatalogMeta()`, `loadCarOpportunities()`, `loadCarMarket(slug)`.

- [ ] **Step 1: Create `app/utils/carsPublic.ts`**

Copy `classes/autos/publicTypes.ts` verbatim, replace the header comment with `// Mirror of classes/autos/publicTypes.ts (the backend writes these shapes). tests/autos/contracts.test.ts compares both.`, then from `app/` run `npx prettier --write utils/carsPublic.ts`.

- [ ] **Step 2: Write `tests/autos/contracts.test.ts` (root) and extend schema parity**

```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..", "..");
const normalized = (file: string): string =>
  fs.readFileSync(path.join(ROOT, file), "utf8")
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'/g, '"')
    .replace(/[\s;,]/g, "");

describe("used-car wire contract", () => {
  it("keeps the app mirror identical to the backend contract", () => {
    const backend = normalized("classes/autos/publicTypes.ts");
    expect(backend.length).toBeGreaterThan(500);
    expect(normalized("app/utils/carsPublic.ts")).toBe(backend);
  });
});
```

In `tests/appdb/schema_parity.test.ts` add the imports

```ts
import { CarCatalogMetaModel } from "../../classes/models/CarCatalogMeta";
import { CarMarketSnapshotModel } from "../../classes/models/CarMarketSnapshot";
import { CarOpportunitySnapshotModel } from "../../classes/models/CarOpportunitySnapshot";
```

and this test inside the `describe`:

```ts
  it("the used-car public models declare exactly the app's fields", () => {
    // El directorio de autos: un campo que el backend escribe y el app no declara es un dato que la
    // página nunca muestra, sin error.
    expect(Object.keys(CarCatalogMetaModel.schema.obj).sort()).toEqual(appFields(appModel("CarCatalogMeta")).sort());
    expect(Object.keys(CarMarketSnapshotModel.schema.obj).sort()).toEqual(appFields(appModel("CarMarketSnapshot")).sort());
    expect(Object.keys(CarOpportunitySnapshotModel.schema.obj).sort()).toEqual(appFields(appModel("CarOpportunitySnapshot")).sort());
    expect(CarCatalogMetaModel.collection.name).toBe("carcatalogmetas");
    expect(CarMarketSnapshotModel.collection.name).toBe("carmarketsnapshots");
    expect(CarOpportunitySnapshotModel.collection.name).toBe("caropportunitysnapshots");
  });
```

- [ ] **Step 3: Write the app models**

`app/server/models/CarCatalog.ts`:
```ts
import mongoose, { Schema } from 'mongoose'
import type { PublicCarListing } from '../../utils/carsPublic'

// Only the deliberately public collection. `carlistings` (descriptions, seller ids) is never read here.
export const CarCatalogModel =
  (mongoose.models.CarCatalog as mongoose.Model<PublicCarListing>) ||
  mongoose.model<PublicCarListing>(
    'CarCatalog',
    new Schema({ key: String }, { autoCreate: false, autoIndex: false, strict: false }),
    'carcatalog'
  )
```

`app/server/models/CarCatalogMeta.ts`:
```ts
import mongoose, { Schema } from 'mongoose'
import type { PublicCarCatalogMeta } from '../../utils/carsPublic'

interface CarCatalogMetaDocument {
  key: 'uy-cars'
  generatedAt: string
  meta: PublicCarCatalogMeta
}

const CarCatalogMetaSchema = new Schema<CarCatalogMetaDocument>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
)

export const CarCatalogMetaModel =
  (mongoose.models.CarCatalogMeta as mongoose.Model<CarCatalogMetaDocument>) ||
  mongoose.model<CarCatalogMetaDocument>('CarCatalogMeta', CarCatalogMetaSchema, 'carcatalogmetas')
```

`app/server/models/CarMarketSnapshot.ts`:
```ts
import mongoose, { Schema } from 'mongoose'
import type { PublicCarMarketSnapshot } from '../../utils/carsPublic'

interface CarMarketSnapshotDocument {
  key: string
  generatedAt: string
  snapshot: PublicCarMarketSnapshot
}

const CarMarketSnapshotSchema = new Schema<CarMarketSnapshotDocument>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
)

export const CarMarketSnapshotModel =
  (mongoose.models.CarMarketSnapshot as mongoose.Model<CarMarketSnapshotDocument>) ||
  mongoose.model<CarMarketSnapshotDocument>(
    'CarMarketSnapshot',
    CarMarketSnapshotSchema,
    'carmarketsnapshots'
  )
```

`app/server/models/CarOpportunitySnapshot.ts`:
```ts
import mongoose, { Schema } from 'mongoose'
import type { PublicCarOpportunitySnapshot } from '../../utils/carsPublic'

interface CarOpportunitySnapshotDocument {
  key: 'used'
  generatedAt: string
  snapshot: PublicCarOpportunitySnapshot
}

const CarOpportunitySnapshotSchema = new Schema<CarOpportunitySnapshotDocument>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
)

export const CarOpportunitySnapshotModel =
  (mongoose.models.CarOpportunitySnapshot as mongoose.Model<CarOpportunitySnapshotDocument>) ||
  mongoose.model<CarOpportunitySnapshotDocument>(
    'CarOpportunitySnapshot',
    CarOpportunitySnapshotSchema,
    'caropportunitysnapshots'
  )
```

Run (root): `npx prettier --check app/server/models/Car*.ts || (cd app && npx prettier --write server/models/Car*.ts)` then `npx vitest run tests/appdb/schema_parity.test.ts tests/autos/contracts.test.ts`. Expected: PASS. If prettier reflows a schema block so the parity regex (`new Schema(<…>)?(\s*{ … \n  },`, fields at 4 spaces) no longer matches, keep the multi-line layout shown above.

- [ ] **Step 4: Write the failing test `app/tests/unit/cars.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import {
  carKeyValid,
  carMarketSlugValid,
  carsFiltered,
  carsMatch,
  carsQueryParams,
  carsSort,
  formatCarKm,
  formatCarUsd,
  normalizeCarsQuery,
  queryCarOpportunities,
} from '../../utils/cars'
import type { PublicCarListing, PublicCarOpportunitySnapshot } from '../../utils/carsPublic'

const NOW = new Date('2026-09-16T12:00:00.000Z')

describe('normalizeCarsQuery', () => {
  it('keeps valid filters and drops everything else', () => {
    const query = normalizeCarsQuery({
      q: '  onix lt ',
      brand: 'chevrolet',
      model: 'chevrolet-onix',
      yearMin: '2015',
      yearMax: '3000',
      kmMax: '120000',
      priceMax: '15000',
      fuel: 'nafta',
      transmission: 'robot',
      department: 'Montevideo',
      seller: 'private',
      sort: 'price_asc',
      page: '2',
    })
    expect(query).toEqual({
      q: 'onix lt',
      brand: 'chevrolet',
      model: 'chevrolet-onix',
      yearMin: 2015,
      yearMax: null,
      kmMax: 120000,
      priceMin: null,
      priceMax: 15000,
      fuel: 'nafta',
      transmission: '',
      department: 'Montevideo',
      seller: 'private',
      sort: 'price_asc',
      page: 2,
    })
    expect(carsFiltered(query)).toBe(true)
    expect(carsFiltered(normalizeCarsQuery({}))).toBe(false)
  })
  it('rejects operator injection and odd types', () => {
    const query = normalizeCarsQuery({ brand: { $ne: 'x' }, model: '../x', q: ['a', 'b'], page: '-1' })
    expect(query.brand).toBe('')
    expect(query.model).toBe('')
    expect(query.q).toBe('a')
    expect(query.page).toBe(1)
  })
  it('round-trips through URL params without defaults', () => {
    const query = normalizeCarsQuery({ brand: 'peugeot', sort: 'recent', page: '1', kmMax: '90000' })
    expect(carsQueryParams(query)).toEqual({ brand: 'peugeot', kmMax: '90000' })
    expect(normalizeCarsQuery(carsQueryParams(query))).toEqual(query)
  })
})

describe('carsMatch / carsSort', () => {
  it('builds a bounded Mongo filter', () => {
    const match = carsMatch(
      normalizeCarsQuery({ brand: 'peugeot', yearMin: '2015', priceMax: '12000', q: 'Allure', seller: 'dealer' }),
      NOW,
      4
    )
    expect(match).toMatchObject({
      lastSeen: { $gte: '2026-09-12T12:00:00.000Z' },
      brandSlug: 'peugeot',
      year: { $gte: 2015 },
      priceUsd: { $lte: 12000 },
      sellerType: 'dealer',
    })
    expect((match.title as { $regex: string }).$regex).toContain('[aáàä]')
  })
  it('sorts deterministically', () => {
    expect(carsSort('price_asc')).toEqual({ priceUsd: 1, key: 1 })
    expect(carsSort('recent')).toEqual({ firstSeen: -1, key: 1 })
  })
})

describe('keys and formatting', () => {
  it('validates keys and slugs', () => {
    expect(carKeyValid('ml-MLU700355317')).toBe(true)
    expect(carKeyValid('ml-MLU1; drop')).toBe(false)
    expect(carMarketSlugValid('mercedes-benz-clase-c')).toBe(true)
    expect(carMarketSlugValid('Mercedes Benz')).toBe(false)
  })
  it('formats money and km the Uruguayan way', () => {
    expect(formatCarUsd(10600)).toBe('US$ 10.600')
    expect(formatCarKm(111000)).toBe('111.000 km')
    expect(formatCarKm(null)).toBe('km no informado')
  })
})

function item(key: string, overrides: Partial<PublicCarListing> = {}, tier: 'strict' | 'exploratory' = 'strict') {
  return {
    subject: {
      key,
      brand: 'Peugeot',
      brandSlug: 'peugeot',
      model: '208',
      modelSlug: '208',
      marketSlug: 'peugeot-208',
      title: 'Peugeot 208',
      year: 2017,
      km: 100000,
      price: 7900,
      currency: 'USD',
      priceUsd: 7900,
      priceConverted: false,
      transmission: 'manual',
      fuel: 'nafta',
      engine: '1.5',
      trim: 'Allure',
      department: 'Montevideo',
      neighborhood: null,
      sellerType: 'private',
      dealerName: null,
      picture: null,
      pictureCount: 1,
      permalink: 'https://auto.mercadolibre.com.uy/MLU-1-x-_JM',
      firstSeen: NOW.toISOString(),
      lastSeen: NOW.toISOString(),
      priceDrop: null,
      flags: [],
      opportunity: { tier, gap: 0.25, median: 10600, n: 12 },
      ...overrides,
    },
    tier,
    gap: 0.25,
    conservativeGap: 0.2,
    sellerSensitivityGap: 0.22,
    sample: {
      n: 12,
      sellers: 12,
      dealers: 4,
      privates: 8,
      p25: 10000,
      median: 10600,
      p75: 11200,
      spread: 0.11,
      kmMedian: 110000,
      kmP75: 118000,
    },
    comparables: [],
    detailReadAt: NOW.toISOString(),
  }
}

describe('queryCarOpportunities', () => {
  const snapshot = {
    version: 1,
    algorithm: 'car-cohort-v1',
    generatedAt: NOW.toISOString(),
    usdUyu: 40,
    policy: {},
    stats: {},
    items: [
      item('ml-MLU1'),
      item('ml-MLU2', { brandSlug: 'chevrolet', brand: 'Chevrolet', priceUsd: 15000 }, 'exploratory'),
      item('ml-MLU3', { lastSeen: '2026-09-10T00:00:00.000Z' }),
      item('ml-MLU4', { department: 'Salto' }),
    ],
  } as unknown as PublicCarOpportunitySnapshot
  it('filters before paging and retires stale adverts even if the job failed', () => {
    const all = queryCarOpportunities(snapshot, {}, NOW)
    expect(all.items.map(entry => entry.subject.key)).toEqual(['ml-MLU1', 'ml-MLU4', 'ml-MLU2'])
    expect(queryCarOpportunities(snapshot, { tier: 'strict', department: 'Montevideo' }, NOW).total).toBe(1)
    expect(queryCarOpportunities(snapshot, { priceMax: '10000' }, NOW).total).toBe(2)
    expect(queryCarOpportunities(snapshot, { brand: 'chevrolet' }, NOW).items[0]!.subject.key).toBe('ml-MLU2')
    expect(all.brands).toEqual([
      { slug: 'peugeot', name: 'Peugeot', count: 2 },
      { slug: 'chevrolet', name: 'Chevrolet', count: 1 },
    ])
  })
})
```

- [ ] **Step 5: Write `app/utils/cars.ts`**

```ts
import type {
  PublicCarCatalogMeta,
  PublicCarFlag,
  PublicCarFuel,
  PublicCarListing,
  PublicCarMarketRow,
  PublicCarMarketSnapshot,
  PublicCarOpportunityItem,
  PublicCarOpportunitySnapshot,
  PublicCarSeller,
  PublicCarTransmission,
} from './carsPublic'

// Every export is car-prefixed: app/utils is ONE auto-import namespace (formatUsd already exists).
export const CARS_PATH = '/autos-usados-uruguay'
export const CAR_OPPORTUNITIES_PATH = '/oportunidades-autos-usados-uruguay'
export const CARS_PER_PAGE = 24
export const CAR_OPPORTUNITIES_PER_PAGE = 20
export const CAR_MARKET_INDEX_MIN = 30
export const CAR_OPPORTUNITY_FRESH_DAYS = 2

export const CAR_SORTS = ['recent', 'price_asc', 'price_desc', 'km_asc', 'year_desc'] as const
export type CarSort = (typeof CAR_SORTS)[number]
export const CAR_FUELS: readonly PublicCarFuel[] = ['nafta', 'diesel', 'electrico', 'hibrido', 'gnc']
export const CAR_TRANSMISSIONS: readonly PublicCarTransmission[] = ['manual', 'automatica']
export const CAR_SELLERS: readonly PublicCarSeller[] = ['dealer', 'private']
export const CAR_DEPARTMENTS: readonly string[] = [
  'Artigas',
  'Canelones',
  'Cerro Largo',
  'Colonia',
  'Durazno',
  'Flores',
  'Florida',
  'Lavalleja',
  'Maldonado',
  'Montevideo',
  'Paysandú',
  'Río Negro',
  'Rivera',
  'Rocha',
  'Salto',
  'San José',
  'Soriano',
  'Tacuarembó',
  'Treinta y Tres',
]

export const CAR_FUEL_LABELS: Record<PublicCarFuel, string> = {
  nafta: 'Nafta',
  diesel: 'Diésel',
  electrico: 'Eléctrico',
  hibrido: 'Híbrido',
  gnc: 'GNC',
}
export const CAR_TRANSMISSION_LABELS: Record<PublicCarTransmission, string> = {
  manual: 'Manual',
  automatica: 'Automática',
}
export const CAR_SELLER_LABELS: Record<PublicCarSeller, string> = {
  dealer: 'Automotora',
  private: 'Dueño',
}
export const CAR_FLAG_LABELS: Record<PublicCarFlag, string> = {
  financing: 'El título habla de entrega o cuotas',
  price_mismatch: 'El título menciona otro precio',
  damaged: 'Menciona choque, reparación o repuestos',
  recovered: 'Menciona recupero de seguro o robo',
  paperwork: 'Menciona deuda, leasing o papeles',
  foreign_plate: 'Menciona chapa extranjera',
}

export interface CarsQuery {
  q: string
  brand: string
  model: string
  yearMin: number | null
  yearMax: number | null
  kmMax: number | null
  priceMin: number | null
  priceMax: number | null
  fuel: PublicCarFuel | ''
  transmission: PublicCarTransmission | ''
  department: string
  seller: PublicCarSeller | ''
  sort: CarSort
  page: number
}

export interface CarFacet {
  slug: string
  name: string
  count: number
}

export interface CarsResponse {
  generatedAt: string
  usdUyu: number
  total: number
  page: number
  perPage: number
  items: PublicCarListing[]
  facets: { brands: CarFacet[]; models: CarFacet[]; departments: CarFacet[] }
  coverage: Pick<
    PublicCarCatalogMeta,
    'listings' | 'lastReadAt' | 'lastFullReadAt' | 'reportedTotal' | 'opportunities' | 'models'
  >
}

export interface CarDetailResponse {
  car: PublicCarListing
  cohort: PublicCarMarketRow | null
  market: { slug: string; brand: string; model: string; listings: number } | null
  similar: PublicCarListing[]
  opportunity: PublicCarOpportunityItem | null
}

export interface CarMarketResponse {
  market: PublicCarMarketSnapshot
  listings: PublicCarListing[]
  opportunities: PublicCarOpportunityItem[]
  indexable: boolean
}

export interface CarOpportunityQuery {
  tier: 'strict' | 'exploratory' | ''
  brand: string
  priceMax: number | null
  department: string
  seller: PublicCarSeller | ''
  page: number
}

export interface CarOpportunitiesResponse {
  generatedAt: string
  usdUyu: number
  policy: PublicCarOpportunitySnapshot['policy']
  stats: PublicCarOpportunitySnapshot['stats']
  total: number
  page: number
  perPage: number
  items: PublicCarOpportunityItem[]
  brands: CarFacet[]
  departments: string[]
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function text(value: unknown, max = 60): string {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first.trim().slice(0, max) : ''
}

function integer(value: unknown, min: number, max: number): number | null {
  const raw = text(value, 12)
  if (!/^\d+$/.test(raw)) return null
  const number = Number(raw)
  return number >= min && number <= max ? number : null
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | '' {
  const raw = text(value)
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : ''
}

const slugParam = (value: unknown): string => {
  const raw = text(value, 80)
  return SLUG.test(raw) ? raw : ''
}

export function normalizeCarsQuery(input: Record<string, unknown>): CarsQuery {
  return {
    q: text(input.q, 80),
    brand: slugParam(input.brand),
    model: slugParam(input.model),
    yearMin: integer(input.yearMin, 1950, 2100),
    yearMax: integer(input.yearMax, 1950, 2100),
    kmMax: integer(input.kmMax, 1, 1_000_000),
    priceMin: integer(input.priceMin, 1, 1_000_000),
    priceMax: integer(input.priceMax, 1, 1_000_000),
    fuel: oneOf(input.fuel, CAR_FUELS),
    transmission: oneOf(input.transmission, CAR_TRANSMISSIONS),
    department: oneOf(input.department, CAR_DEPARTMENTS),
    seller: oneOf(input.seller, CAR_SELLERS),
    sort: oneOf(input.sort, CAR_SORTS) || 'recent',
    page: integer(input.page, 1, 500) ?? 1,
  }
}

export function carsQueryParams(query: CarsQuery): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === '' || value === null) continue
    if (key === 'sort' && value === 'recent') continue
    if (key === 'page' && value === 1) continue
    params[key] = String(value)
  }
  return params
}

export function carsFiltered(query: CarsQuery): boolean {
  return Object.keys(carsQueryParams(query)).length > 0
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ACCENTS: Record<string, string> = {
  a: '[aáàä]',
  e: '[eéèë]',
  i: '[iíìï]',
  o: '[oóòö]',
  u: '[uúùü]',
  n: '[nñ]',
}

function accentInsensitive(value: string): string {
  const folded = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return escapeRegex(folded).replace(/[aeioun]/g, letter => ACCENTS[letter]!)
}

export function carsMatch(query: CarsQuery, now: Date, freshDays: number): Record<string, unknown> {
  const match: Record<string, unknown> = {
    lastSeen: { $gte: new Date(now.getTime() - freshDays * 86_400_000).toISOString() },
  }
  if (query.brand) match.brandSlug = query.brand
  if (query.model) match.marketSlug = query.model
  if (query.yearMin !== null || query.yearMax !== null) {
    match.year = {
      ...(query.yearMin !== null ? { $gte: query.yearMin } : {}),
      ...(query.yearMax !== null ? { $lte: query.yearMax } : {}),
    }
  }
  if (query.kmMax !== null) match.km = { $ne: null, $lte: query.kmMax }
  if (query.priceMin !== null || query.priceMax !== null) {
    match.priceUsd = {
      ...(query.priceMin !== null ? { $gte: query.priceMin } : {}),
      ...(query.priceMax !== null ? { $lte: query.priceMax } : {}),
    }
  }
  if (query.fuel) match.fuel = query.fuel
  if (query.transmission) match.transmission = query.transmission
  if (query.department) match.department = query.department
  if (query.seller) match.sellerType = query.seller
  if (query.q) match.title = { $regex: accentInsensitive(query.q), $options: 'i' }
  return match
}

export function carsSort(sort: CarSort): Record<string, 1 | -1> {
  if (sort === 'price_asc') return { priceUsd: 1, key: 1 }
  if (sort === 'price_desc') return { priceUsd: -1, key: 1 }
  if (sort === 'km_asc') return { km: 1, key: 1 }
  if (sort === 'year_desc') return { year: -1, priceUsd: 1, key: 1 }
  return { firstSeen: -1, key: 1 }
}

export const carKeyValid = (key: string): boolean => /^ml-MLU\d{6,14}$/.test(key)
export const carMarketSlugValid = (value: string): boolean => value.length <= 80 && SLUG.test(value)
export const carPath = (key: string): string => `${CARS_PATH}/${key}`
export const carMarketPath = (marketSlug: string): string => `${CARS_PATH}/precios/${marketSlug}`

export function normalizeCarOpportunityQuery(input: Record<string, unknown>): CarOpportunityQuery {
  return {
    tier: oneOf(input.tier, ['strict', 'exploratory'] as const),
    brand: slugParam(input.brand),
    priceMax: integer(input.priceMax, 1, 1_000_000),
    department: oneOf(input.department, CAR_DEPARTMENTS),
    seller: oneOf(input.seller, CAR_SELLERS),
    page: integer(input.page, 1, 200) ?? 1,
  }
}

export function carOpportunityQueryParams(query: CarOpportunityQuery): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === '' || value === null || (key === 'page' && value === 1)) continue
    params[key] = String(value)
  }
  return params
}

export function queryCarOpportunities(
  snapshot: PublicCarOpportunitySnapshot,
  input: Record<string, unknown>,
  now = new Date()
): CarOpportunitiesResponse {
  const query = normalizeCarOpportunityQuery(input)
  const cutoff = now.getTime() - CAR_OPPORTUNITY_FRESH_DAYS * 86_400_000
  const fresh = snapshot.items.filter(entry => Date.parse(entry.subject.lastSeen) >= cutoff)
  const brands = new Map<string, CarFacet>()
  for (const entry of fresh) {
    const facet = brands.get(entry.subject.brandSlug) ?? {
      slug: entry.subject.brandSlug,
      name: entry.subject.brand,
      count: 0,
    }
    facet.count++
    brands.set(facet.slug, facet)
  }
  const filtered = fresh
    .filter(entry => !query.tier || entry.tier === query.tier)
    .filter(entry => !query.brand || entry.subject.brandSlug === query.brand)
    .filter(entry => query.priceMax === null || entry.subject.priceUsd <= query.priceMax)
    .filter(entry => !query.department || entry.subject.department === query.department)
    .filter(entry => !query.seller || entry.subject.sellerType === query.seller)
    .sort(
      (a, b) =>
        (a.tier === b.tier ? 0 : a.tier === 'strict' ? -1 : 1) ||
        b.gap - a.gap ||
        a.subject.key.localeCompare(b.subject.key)
    )
  const start = (query.page - 1) * CAR_OPPORTUNITIES_PER_PAGE
  return {
    generatedAt: snapshot.generatedAt,
    usdUyu: snapshot.usdUyu,
    policy: snapshot.policy,
    stats: snapshot.stats,
    total: filtered.length,
    page: query.page,
    perPage: CAR_OPPORTUNITIES_PER_PAGE,
    items: filtered.slice(start, start + CAR_OPPORTUNITIES_PER_PAGE),
    brands: [...brands.values()].sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug)),
    departments: [
      ...new Set(fresh.map(entry => entry.subject.department).filter((d): d is string => !!d)),
    ].sort((a, b) => a.localeCompare(b, 'es')),
  }
}

const grouped = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
export const formatCarUsd = (value: number): string => `US$ ${grouped(value)}`
export const formatCarKm = (km: number | null): string =>
  km === null ? 'km no informado' : `${grouped(km)} km`
export const formatCarPrice = (car: Pick<PublicCarListing, 'price' | 'currency'>): string =>
  car.currency === 'USD' ? formatCarUsd(car.price) : `$ ${grouped(car.price)}`
export const carPercent = (gap: number): string => `${Math.round(gap * 100)} %`
export const formatCarDate = (iso: string | null | undefined): string =>
  iso
    ? new Intl.DateTimeFormat('es-UY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Montevideo',
      }).format(new Date(iso))
    : '—'
```

- [ ] **Step 6: Run the utils test until green**

Run (from `app/`): `npx vitest run tests/unit/cars.test.ts`
Expected: PASS.

- [ ] **Step 7: Write `app/server/utils/cars.ts`**

```ts
import { CarCatalogMetaModel } from '../models/CarCatalogMeta'
import { CarMarketSnapshotModel } from '../models/CarMarketSnapshot'
import { CarOpportunitySnapshotModel } from '../models/CarOpportunitySnapshot'
import type {
  PublicCarCatalogMeta,
  PublicCarListing,
  PublicCarMarketSnapshot,
  PublicCarOpportunitySnapshot,
} from '../../utils/carsPublic'
import { connectDb } from './db'

const FIELDS = [
  'key',
  'brand',
  'brandSlug',
  'model',
  'modelSlug',
  'marketSlug',
  'title',
  'year',
  'km',
  'price',
  'currency',
  'priceUsd',
  'priceConverted',
  'transmission',
  'fuel',
  'engine',
  'trim',
  'department',
  'neighborhood',
  'sellerType',
  'dealerName',
  'picture',
  'pictureCount',
  'permalink',
  'firstSeen',
  'lastSeen',
  'priceDrop',
  'flags',
  'opportunity',
] as const

export const carListingProjection: Record<string, 0 | 1> = Object.fromEntries([
  ['_id', 0],
  ...FIELDS.map(field => [field, 1]),
])

const prefixed = (value: unknown, prefix: string): string | null =>
  typeof value === 'string' && value.startsWith(prefix) ? value : null
const optionalText = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const optionalNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/** Rebuilds a public row field by field: unknown fields in the collection never reach the wire. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function publicCarRow(row: Record<string, any>): PublicCarListing {
  return {
    key: String(row.key),
    brand: String(row.brand),
    brandSlug: String(row.brandSlug),
    model: String(row.model),
    modelSlug: String(row.modelSlug),
    marketSlug: String(row.marketSlug),
    title: String(row.title),
    year: Number(row.year),
    km: optionalNumber(row.km),
    price: Number(row.price),
    currency: row.currency === 'UYU' ? 'UYU' : 'USD',
    priceUsd: Number(row.priceUsd),
    priceConverted: row.priceConverted === true,
    transmission: row.transmission ?? null,
    fuel: row.fuel ?? null,
    engine: optionalText(row.engine),
    trim: optionalText(row.trim),
    department: optionalText(row.department),
    neighborhood: optionalText(row.neighborhood),
    sellerType: row.sellerType ?? null,
    dealerName: optionalText(row.dealerName),
    picture: prefixed(row.picture, 'https://http2.mlstatic.com/'),
    pictureCount: optionalNumber(row.pictureCount),
    permalink: prefixed(row.permalink, 'https://auto.mercadolibre.com.uy/MLU-') ?? '',
    firstSeen: String(row.firstSeen),
    lastSeen: String(row.lastSeen),
    priceDrop: row.priceDrop
      ? {
          from: Number(row.priceDrop.from),
          currency: row.priceDrop.currency === 'UYU' ? 'UYU' : 'USD',
          since: String(row.priceDrop.since),
        }
      : null,
    flags: Array.isArray(row.flags)
      ? row.flags.filter((flag: unknown) => typeof flag === 'string')
      : [],
    opportunity: row.opportunity
      ? {
          tier: row.opportunity.tier === 'strict' ? 'strict' : 'exploratory',
          gap: Number(row.opportunity.gap),
          median: Number(row.opportunity.median),
          n: Number(row.opportunity.n),
        }
      : null,
  }
}

let metaCache: { expires: number; meta: PublicCarCatalogMeta } | null = null
export async function loadCarCatalogMeta(): Promise<PublicCarCatalogMeta | null> {
  if (metaCache && metaCache.expires > Date.now()) return metaCache.meta
  await connectDb()
  const doc = await CarCatalogMetaModel.findOne({ key: 'uy-cars' })
    .select({ _id: 0, meta: 1 })
    .maxTimeMS(5_000)
    .lean()
  const meta = doc?.meta
  if (!meta || meta.key !== 'uy-cars') return null
  metaCache = { meta, expires: Date.now() + 60_000 }
  return meta
}

let opportunityCache: { expires: number; snapshot: PublicCarOpportunitySnapshot } | null = null
export async function loadCarOpportunities(): Promise<PublicCarOpportunitySnapshot | null> {
  if (opportunityCache && opportunityCache.expires > Date.now()) return opportunityCache.snapshot
  await connectDb()
  const doc = await CarOpportunitySnapshotModel.findOne({ key: 'used' })
    .select({ _id: 0, snapshot: 1 })
    .maxTimeMS(10_000)
    .lean()
  const raw = doc?.snapshot
  if (!raw || raw.version !== 1 || !Array.isArray(raw.items)) return null
  const snapshot: PublicCarOpportunitySnapshot = {
    ...raw,
    items: raw.items.map(entry => ({
      ...entry,
      subject: publicCarRow(entry.subject),
      comparables: entry.comparables.map(peer => ({
        key: String(peer.key),
        title: String(peer.title),
        year: Number(peer.year),
        km: Number(peer.km),
        priceUsd: Number(peer.priceUsd),
        trim: optionalText(peer.trim),
        engine: optionalText(peer.engine),
        sellerType: peer.sellerType ?? null,
        permalink: prefixed(peer.permalink, 'https://auto.mercadolibre.com.uy/MLU-') ?? '',
        lastSeen: String(peer.lastSeen),
      })),
    })),
  }
  opportunityCache = { snapshot, expires: Date.now() + 180_000 }
  return snapshot
}

const marketCache = new Map<string, { expires: number; snapshot: PublicCarMarketSnapshot | null }>()
export async function loadCarMarket(slug: string): Promise<PublicCarMarketSnapshot | null> {
  const cached = marketCache.get(slug)
  if (cached && cached.expires > Date.now()) return cached.snapshot
  await connectDb()
  const doc = await CarMarketSnapshotModel.findOne({ key: slug })
    .select({ _id: 0, snapshot: 1 })
    .maxTimeMS(5_000)
    .lean()
  const snapshot = doc?.snapshot?.version === 1 ? doc.snapshot : null
  if (marketCache.size > 500) marketCache.clear()
  marketCache.set(slug, { snapshot, expires: Date.now() + 300_000 })
  return snapshot
}
```

- [ ] **Step 8: Write the four API routes**

`app/server/api/cars/index.get.ts`:
```ts
import {
  CARS_PER_PAGE,
  carsMatch,
  carsSort,
  normalizeCarsQuery,
  type CarFacet,
  type CarsResponse,
} from '../../../utils/cars'
import { CarCatalogModel } from '../../models/CarCatalog'
import { carListingProjection, loadCarCatalogMeta, publicCarRow } from '../../utils/cars'
import { connectDb } from '../../utils/db'

async function facet(
  match: Record<string, unknown>,
  slugField: string,
  nameField: string,
  limit: number
): Promise<CarFacet[]> {
  const rows = await CarCatalogModel.aggregate<{ _id: string; name: string; count: number }>([
    { $match: match },
    { $group: { _id: `$${slugField}`, name: { $first: `$${nameField}` }, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
  ]).option({ maxTimeMS: 10_000 })
  return rows
    .filter(row => row._id)
    .map(row => ({ slug: String(row._id), name: String(row.name), count: row.count }))
}

export default defineEventHandler(async event => {
  const query = normalizeCarsQuery(getQuery(event) as Record<string, unknown>)
  try {
    await connectDb()
    const meta = await loadCarCatalogMeta()
    if (!meta) throw new Error('CAR_CATALOG_PREPARING')
    const now = new Date()
    const match = carsMatch(query, now, meta.freshDays)
    if (query.sort === 'km_asc') match.km = { ...((match.km as object) || {}), $ne: null }
    const [total, rows, brands, models, departments] = await Promise.all([
      CarCatalogModel.countDocuments(match).maxTimeMS(10_000),
      CarCatalogModel.find(match)
        .select(carListingProjection)
        .sort(carsSort(query.sort))
        .skip((query.page - 1) * CARS_PER_PAGE)
        .limit(CARS_PER_PAGE)
        .maxTimeMS(10_000)
        .lean(),
      facet(carsMatch({ ...query, brand: '', model: '' }, now, meta.freshDays), 'brandSlug', 'brand', 150),
      query.brand
        ? facet(carsMatch({ ...query, model: '' }, now, meta.freshDays), 'marketSlug', 'model', 200)
        : Promise.resolve([]),
      facet(carsMatch({ ...query, department: '' }, now, meta.freshDays), 'department', 'department', 19),
    ])
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
    const response: CarsResponse = {
      generatedAt: meta.generatedAt,
      usdUyu: meta.usdUyu,
      total,
      page: query.page,
      perPage: CARS_PER_PAGE,
      items: rows.map(row => publicCarRow(row as Record<string, unknown>)),
      facets: { brands, models, departments },
      coverage: {
        listings: meta.listings,
        lastReadAt: meta.lastReadAt,
        lastFullReadAt: meta.lastFullReadAt,
        reportedTotal: meta.reportedTotal,
        opportunities: meta.opportunities,
        models: meta.models.slice(0, 60),
      },
    }
    return response
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Used-car directory is temporarily unavailable',
      cause: error,
    })
  }
})
```

`app/server/api/cars/ficha/[key].get.ts`:
```ts
import { carKeyValid, type CarDetailResponse } from '../../../../utils/cars'
import { CarCatalogModel } from '../../../models/CarCatalog'
import {
  carListingProjection,
  loadCarCatalogMeta,
  loadCarMarket,
  loadCarOpportunities,
  publicCarRow,
} from '../../../utils/cars'
import { connectDb } from '../../../utils/db'

export default defineEventHandler(async event => {
  const key = String(getRouterParam(event, 'key') || '')
  if (!carKeyValid(key)) throw createError({ statusCode: 404, statusMessage: 'Advert not found' })
  let row: Record<string, unknown> | null
  let freshDays = 4
  try {
    await connectDb()
    freshDays = (await loadCarCatalogMeta())?.freshDays ?? 4
    row = (await CarCatalogModel.findOne({ key })
      .select(carListingProjection)
      .maxTimeMS(5_000)
      .lean()) as Record<string, unknown> | null
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 503, statusMessage: 'Advert temporarily unavailable', cause: error })
  }
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Advert not found' })
  const car = publicCarRow(row)
  const [market, similar, opportunities] = await Promise.all([
    loadCarMarket(car.marketSlug).catch(() => null),
    CarCatalogModel.find({
      marketSlug: car.marketSlug,
      key: { $ne: car.key },
      year: { $gte: car.year - 1, $lte: car.year + 1 },
      lastSeen: { $gte: new Date(Date.now() - freshDays * 86_400_000).toISOString() },
    })
      .select(carListingProjection)
      .sort({ priceUsd: 1, key: 1 })
      .limit(8)
      .maxTimeMS(3_000)
      .lean()
      .then(rows => rows.map(entry => publicCarRow(entry as Record<string, unknown>)))
      .catch(() => []),
    loadCarOpportunities().catch(() => null),
  ])
  const cohort =
    market?.rows.find(
      entry =>
        entry.year === car.year &&
        entry.trim === car.trim &&
        entry.engine === car.engine &&
        entry.transmission === car.transmission
    ) ??
    market?.years.find(entry => entry.year === car.year) ??
    null
  setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
  const response: CarDetailResponse = {
    car,
    cohort,
    market: market
      ? { slug: market.slug, brand: market.brand, model: market.model, listings: market.listings }
      : null,
    similar,
    opportunity: opportunities?.items.find(entry => entry.subject.key === key) ?? null,
  }
  return response
})
```

`app/server/api/cars/market/[slug].get.ts`:
```ts
import {
  CAR_MARKET_INDEX_MIN,
  carMarketSlugValid,
  type CarMarketResponse,
} from '../../../../utils/cars'
import type { PublicCarMarketSnapshot } from '../../../../utils/carsPublic'
import { CarCatalogModel } from '../../../models/CarCatalog'
import {
  carListingProjection,
  loadCarCatalogMeta,
  loadCarMarket,
  loadCarOpportunities,
  publicCarRow,
} from '../../../utils/cars'

export default defineEventHandler(async event => {
  const slug = String(getRouterParam(event, 'slug') || '')
  if (!carMarketSlugValid(slug)) throw createError({ statusCode: 404, statusMessage: 'Model not found' })
  let market: PublicCarMarketSnapshot | null
  let freshDays = 4
  try {
    market = await loadCarMarket(slug)
    freshDays = (await loadCarCatalogMeta())?.freshDays ?? 4
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 503, statusMessage: 'Model temporarily unavailable', cause: error })
  }
  if (!market) throw createError({ statusCode: 404, statusMessage: 'Model not found' })
  const [listings, opportunities] = await Promise.all([
    CarCatalogModel.find({
      marketSlug: slug,
      lastSeen: { $gte: new Date(Date.now() - freshDays * 86_400_000).toISOString() },
    })
      .select(carListingProjection)
      .sort({ year: -1, priceUsd: 1, key: 1 })
      .limit(48)
      .maxTimeMS(5_000)
      .lean()
      .then(rows => rows.map(row => publicCarRow(row as Record<string, unknown>)))
      .catch(() => []),
    loadCarOpportunities()
      .then(snapshot => snapshot?.items.filter(entry => entry.subject.marketSlug === slug).slice(0, 6) ?? [])
      .catch(() => []),
  ])
  setResponseHeader(event, 'cache-control', 'public, max-age=120, s-maxage=300')
  const response: CarMarketResponse = {
    market,
    listings,
    opportunities,
    indexable: market.listings >= CAR_MARKET_INDEX_MIN,
  }
  return response
})
```

`app/server/api/car-opportunities.get.ts`:
```ts
import { queryCarOpportunities } from '../../utils/cars'
import { loadCarOpportunities } from '../utils/cars'

export default defineEventHandler(async event => {
  try {
    const snapshot = await loadCarOpportunities()
    if (!snapshot) throw new Error('CAR_OPPORTUNITIES_PREPARING')
    setResponseHeader(event, 'cache-control', 'public, max-age=30, s-maxage=60')
    return queryCarOpportunities(snapshot, getQuery(event) as Record<string, unknown>)
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Used-car comparison is temporarily unavailable',
      cause: error,
    })
  }
})
```

- [ ] **Step 9: Write `app/tests/unit/carsApi.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const connectDb = vi.fn()
const loadCarCatalogMeta = vi.fn()
const loadCarOpportunities = vi.fn()
const loadCarMarket = vi.fn()
const findOneLean = vi.fn()
const findLean = vi.fn()
const countDocuments = vi.fn()
const aggregate = vi.fn()
const chain = (lean: () => unknown) => {
  const query: Record<string, unknown> = {}
  for (const name of ['select', 'sort', 'skip', 'limit', 'maxTimeMS']) query[name] = () => query
  query.lean = lean
  return query
}
vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/utils/cars', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/utils/cars')>()),
  loadCarCatalogMeta,
  loadCarOpportunities,
  loadCarMarket,
}))
vi.mock('../../server/models/CarCatalog', () => ({
  CarCatalogModel: {
    findOne: () => chain(findOneLean),
    find: () => chain(findLean),
    countDocuments: () => ({ maxTimeMS: countDocuments }),
    aggregate: () => ({ option: aggregate }),
  },
}))
const { getRouterParam, getQuery } = installNitroGlobals()
vi.stubGlobal('setResponseHeader', vi.fn())

const listHandler = (await import('../../server/api/cars/index.get')).default
const fichaHandler = (await import('../../server/api/cars/ficha/[key].get')).default
const marketHandler = (await import('../../server/api/cars/market/[slug].get')).default
const opportunitiesHandler = (await import('../../server/api/car-opportunities.get')).default

const row = {
  key: 'ml-MLU700355317',
  brand: 'BYD',
  brandSlug: 'byd',
  model: 'F3',
  modelSlug: 'f3',
  marketSlug: 'byd-f3',
  title: 'Byd F3',
  year: 2017,
  km: null,
  price: 9500,
  currency: 'USD',
  priceUsd: 9500,
  priceConverted: false,
  permalink: 'https://auto.mercadolibre.com.uy/MLU-700355317-x-_JM',
  picture: 'https://tracker.example/x.jpg',
  firstSeen: '2026-09-16T00:00:00.000Z',
  lastSeen: '2026-09-16T00:00:00.000Z',
  flags: [],
  sellerId: 'SECRET',
  description: 'SECRET',
}

describe('used-car APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connectDb.mockResolvedValue(undefined)
    loadCarCatalogMeta.mockResolvedValue({
      key: 'uy-cars',
      freshDays: 4,
      generatedAt: 'g',
      usdUyu: 40,
      listings: 1,
      models: [],
      opportunities: 0,
      lastReadAt: null,
      lastFullReadAt: null,
      reportedTotal: null,
    })
    loadCarOpportunities.mockResolvedValue(null)
    loadCarMarket.mockResolvedValue(null)
    findOneLean.mockResolvedValue(row)
    findLean.mockResolvedValue([row])
    countDocuments.mockResolvedValue(1)
    aggregate.mockResolvedValue([])
    getQuery.mockReturnValue({})
  })

  it('lists adverts through the explicit projection', async () => {
    const page = (await listHandler({} as never)) as { items: Array<Record<string, unknown>> }
    expect(page.items).toHaveLength(1)
    expect(page.items[0]).not.toHaveProperty('sellerId')
    expect(page.items[0]).not.toHaveProperty('description')
    expect(page.items[0]!.picture).toBeNull()
  })
  it('answers 503 while the catalogue is being prepared', async () => {
    loadCarCatalogMeta.mockResolvedValue(null)
    await expect(listHandler({} as never)).rejects.toMatchObject({ statusCode: 503 })
  })
  it('404s an invalid or unknown advert key and 503s a database failure', async () => {
    getRouterParam.mockReturnValue('ml-MLU1; drop')
    await expect(fichaHandler({} as never)).rejects.toMatchObject({ statusCode: 404 })
    getRouterParam.mockReturnValue('ml-MLU700355317')
    findOneLean.mockResolvedValue(null)
    await expect(fichaHandler({} as never)).rejects.toMatchObject({ statusCode: 404 })
    findOneLean.mockRejectedValue(new Error('down'))
    await expect(fichaHandler({} as never)).rejects.toMatchObject({ statusCode: 503 })
  })
  it('serves an advert even when optional market data fails', async () => {
    getRouterParam.mockReturnValue('ml-MLU700355317')
    loadCarMarket.mockRejectedValue(new Error('slow'))
    const detail = (await fichaHandler({} as never)) as { car: { key: string }; cohort: unknown }
    expect(detail.car.key).toBe('ml-MLU700355317')
    expect(detail.cohort).toBeNull()
  })
  it('404s an unknown model page and marks thin models non-indexable', async () => {
    getRouterParam.mockReturnValue('byd-f3')
    await expect(marketHandler({} as never)).rejects.toMatchObject({ statusCode: 404 })
    loadCarMarket.mockResolvedValue({ version: 1, slug: 'byd-f3', listings: 12, years: [], rows: [] })
    const market = (await marketHandler({} as never)) as { indexable: boolean }
    expect(market.indexable).toBe(false)
  })
  it('answers 503 for opportunities without a snapshot', async () => {
    await expect(opportunitiesHandler({} as never)).rejects.toMatchObject({ statusCode: 503 })
  })
})
```

Note: `vi.mock('../../server/utils/cars', importOriginal)` keeps `publicCarRow`/`carListingProjection` real; the handlers import the same module path, so they get the mocked loaders.

- [ ] **Step 10: Format, test, lint**

From `app/`:
```bash
npx prettier --write utils/carsPublic.ts utils/cars.ts server/utils/cars.ts server/models/Car*.ts server/api/cars server/api/car-opportunities.get.ts tests/unit/cars.test.ts tests/unit/carsApi.test.ts
npx vitest run tests/unit/cars.test.ts tests/unit/carsApi.test.ts
npx eslint utils/cars.ts utils/carsPublic.ts server/utils/cars.ts server/models server/api/cars server/api/car-opportunities.get.ts tests/unit/cars.test.ts tests/unit/carsApi.test.ts
```
From root: `npx vitest run tests/autos/contracts.test.ts tests/appdb/schema_parity.test.ts`
Expected: all PASS, no lint errors.

- [ ] **Step 11: Commit**

```bash
git add app/utils/carsPublic.ts app/utils/cars.ts app/server/models/Car*.ts app/server/utils/cars.ts app/server/api/cars app/server/api/car-opportunities.get.ts app/tests/unit/cars.test.ts app/tests/unit/carsApi.test.ts tests/autos/contracts.test.ts tests/appdb/schema_parity.test.ts
git commit -m "feat(autos): capa de datos y APIs del directorio de autos usados"
```

---

### Task 9: Components, directory page and advert page

**Files:**
- Create: `app/components/cars/ListingCard.vue`, `app/components/cars/Filters.vue`, `app/components/cars/MarketTable.vue`, `app/components/cars/OpportunityCard.vue`, `app/pages/autos-usados-uruguay/index.vue`, `app/pages/autos-usados-uruguay/[key].vue`
- Modify: `app/utils/siteNav.ts`, `app/i18n/locales/json/{es,en,pt}.json`, `app/tests/unit/seoContract.test.ts`

**Interfaces:**
- Consumes: Task 8 (`app/utils/cars.ts`, `carsPublic.ts`, APIs).
- Produces: `<CarsListingCard :car>`, `<CarsFilters :query :facets @apply>`, `<CarsMarketTable :rows :caption :show-version>`, `<CarsOpportunityCard :item :hide-subject-link>`.

- [ ] **Step 1: Write `app/components/cars/ListingCard.vue`**

```vue
<template>
  <article class="car-card" :data-car-key="car.key">
    <NuxtLink :to="localePath(carPath(car.key))" class="car-card__photo" :aria-label="car.title">
      <img
        v-if="car.picture && !failed"
        :src="car.picture"
        :alt="car.title"
        loading="lazy"
        width="360"
        height="240"
        referrerpolicy="no-referrer"
        @error="failed = true"
      />
      <span v-else class="car-card__nophoto"><VIcon icon="mdi-car-outline" size="40" /></span>
    </NuxtLink>
    <div class="car-card__body">
      <div class="car-card__badges">
        <span v-if="car.opportunity" class="car-badge car-badge--deal">
          {{ carPercent(car.opportunity.gap) }} bajo la mediana
        </span>
        <span v-if="car.priceDrop" class="car-badge car-badge--drop">
          Bajó {{ formatCarPrice({ price: car.priceDrop.from - car.price, currency: car.currency }) }}
        </span>
        <span v-if="car.flags.length" class="car-badge car-badge--flag">
          {{ CAR_FLAG_LABELS[car.flags[0]!] }}
        </span>
      </div>
      <h3 class="car-card__title">
        <NuxtLink :to="localePath(carPath(car.key))">{{ car.title }}</NuxtLink>
      </h3>
      <p class="car-card__price">
        {{ formatCarPrice(car) }}
        <span v-if="car.priceConverted" class="text-caption text-medium-emphasis">
          (≈ {{ formatCarUsd(car.priceUsd) }})
        </span>
      </p>
      <p class="car-card__facts">{{ facts }}</p>
      <p class="car-card__place">{{ place }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  CAR_FLAG_LABELS,
  CAR_FUEL_LABELS,
  CAR_SELLER_LABELS,
  CAR_TRANSMISSION_LABELS,
  carPath,
  carPercent,
  formatCarKm,
  formatCarPrice,
  formatCarUsd,
} from '~/utils/cars'
import type { PublicCarListing } from '~/utils/carsPublic'

const props = defineProps<{ car: PublicCarListing }>()
const localePath = useLocalePath()
const failed = ref(false)
const facts = computed(() =>
  [
    String(props.car.year),
    formatCarKm(props.car.km),
    props.car.transmission && CAR_TRANSMISSION_LABELS[props.car.transmission],
    props.car.fuel && CAR_FUEL_LABELS[props.car.fuel],
  ]
    .filter(Boolean)
    .join(' · ')
)
const place = computed(() =>
  [
    props.car.neighborhood,
    props.car.department,
    props.car.sellerType && CAR_SELLER_LABELS[props.car.sellerType],
  ]
    .filter(Boolean)
    .join(' · ')
)
</script>

<style scoped>
.car-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}
.car-card__photo {
  display: block;
  aspect-ratio: 3 / 2;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.car-card__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.car-card__nophoto {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.car-card__body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.car-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.car-badge {
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 2px 8px;
  border: 1px solid currentColor;
}
.car-badge--deal {
  color: rgb(var(--v-theme-success));
}
.car-badge--drop {
  color: rgb(var(--v-theme-info));
}
.car-badge--flag {
  color: rgb(var(--v-theme-warning));
}
.car-card__title {
  font-size: 1rem;
  line-height: 1.3;
  margin: 0;
}
.car-card__title a {
  color: inherit;
  text-decoration: none;
}
.car-card__title a:hover {
  text-decoration: underline;
}
.car-card__price {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}
.car-card__facts,
.car-card__place {
  font-size: 0.875rem;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
```

- [ ] **Step 2: Write `app/components/cars/Filters.vue`**

```vue
<template>
  <form class="car-filters" @submit.prevent="apply">
    <VTextField
      v-model="draft.q"
      label="Buscar en el título"
      density="comfortable"
      variant="outlined"
      hide-details
      clearable
    />
    <VSelect
      v-model="draft.brand"
      :items="brandItems"
      label="Marca"
      density="comfortable"
      variant="outlined"
      hide-details
      @update:model-value="draft.model = ''"
    />
    <VSelect
      v-if="draft.brand && facets.models.length"
      v-model="draft.model"
      :items="modelItems"
      label="Modelo"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <div class="car-filters__pair">
      <VTextField v-model="draft.yearMin" label="Año desde" inputmode="numeric" density="comfortable" variant="outlined" hide-details />
      <VTextField v-model="draft.yearMax" label="Año hasta" inputmode="numeric" density="comfortable" variant="outlined" hide-details />
    </div>
    <div class="car-filters__pair">
      <VTextField v-model="draft.priceMin" label="US$ desde" inputmode="numeric" density="comfortable" variant="outlined" hide-details />
      <VTextField v-model="draft.priceMax" label="US$ hasta" inputmode="numeric" density="comfortable" variant="outlined" hide-details />
    </div>
    <VTextField v-model="draft.kmMax" label="Km máximo" inputmode="numeric" density="comfortable" variant="outlined" hide-details />
    <VSelect v-model="draft.fuel" :items="fuelItems" label="Combustible" density="comfortable" variant="outlined" hide-details />
    <VSelect v-model="draft.transmission" :items="transmissionItems" label="Caja" density="comfortable" variant="outlined" hide-details />
    <VSelect v-model="draft.department" :items="departmentItems" label="Departamento" density="comfortable" variant="outlined" hide-details />
    <VSelect v-model="draft.seller" :items="sellerItems" label="Vende" density="comfortable" variant="outlined" hide-details />
    <div class="car-filters__actions">
      <VBtn type="submit" color="primary" block>Aplicar</VBtn>
      <VBtn variant="text" block @click="clear">Limpiar filtros</VBtn>
    </div>
  </form>
</template>

<script setup lang="ts">
import {
  CAR_DEPARTMENTS,
  CAR_FUELS,
  CAR_FUEL_LABELS,
  CAR_SELLERS,
  CAR_SELLER_LABELS,
  CAR_TRANSMISSIONS,
  CAR_TRANSMISSION_LABELS,
  normalizeCarsQuery,
  type CarFacet,
  type CarsQuery,
} from '~/utils/cars'

const props = defineProps<{
  query: CarsQuery
  facets: { brands: CarFacet[]; models: CarFacet[]; departments: CarFacet[] }
}>()
const emit = defineEmits<{ apply: [query: CarsQuery] }>()

const toDraft = (query: CarsQuery) => ({
  q: query.q,
  brand: query.brand,
  model: query.model,
  yearMin: query.yearMin?.toString() ?? '',
  yearMax: query.yearMax?.toString() ?? '',
  priceMin: query.priceMin?.toString() ?? '',
  priceMax: query.priceMax?.toString() ?? '',
  kmMax: query.kmMax?.toString() ?? '',
  fuel: query.fuel as string,
  transmission: query.transmission as string,
  department: query.department,
  seller: query.seller as string,
})
const draft = reactive(toDraft(props.query))
watch(
  () => props.query,
  next => Object.assign(draft, toDraft(next))
)

const brandItems = computed(() => [
  { title: 'Todas las marcas', value: '' },
  ...props.facets.brands.map(brand => ({ title: `${brand.name} (${brand.count})`, value: brand.slug })),
])
const modelItems = computed(() => [
  { title: 'Todos los modelos', value: '' },
  ...props.facets.models.map(model => ({ title: `${model.name} (${model.count})`, value: model.slug })),
])
const fuelItems = [
  { title: 'Cualquier combustible', value: '' },
  ...CAR_FUELS.map(fuel => ({ title: CAR_FUEL_LABELS[fuel], value: fuel })),
]
const transmissionItems = [
  { title: 'Cualquier caja', value: '' },
  ...CAR_TRANSMISSIONS.map(value => ({ title: CAR_TRANSMISSION_LABELS[value], value })),
]
const departmentItems = [
  { title: 'Todo el país', value: '' },
  ...CAR_DEPARTMENTS.map(value => ({ title: value, value })),
]
const sellerItems = [
  { title: 'Dueño o automotora', value: '' },
  ...CAR_SELLERS.map(value => ({ title: CAR_SELLER_LABELS[value], value })),
]

function apply() {
  emit('apply', normalizeCarsQuery({ ...draft, q: draft.q ?? '', sort: props.query.sort }))
}
function clear() {
  emit('apply', normalizeCarsQuery({ sort: props.query.sort }))
}
</script>

<style scoped>
.car-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.car-filters__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.car-filters__actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
```

- [ ] **Step 3: Write `app/components/cars/MarketTable.vue`**

```vue
<template>
  <div class="market-table">
    <VTable density="compact">
      <caption class="text-left text-body-2 text-medium-emphasis pb-2">
        {{ caption }}
      </caption>
      <thead>
        <tr>
          <th scope="col">Año</th>
          <th v-if="showVersion" scope="col">Versión</th>
          <th scope="col">Avisos</th>
          <th scope="col">Rango central (P25–P75)</th>
          <th scope="col">Mediana</th>
          <th scope="col">Km mediano</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="`${row.year}-${row.trim}-${row.engine}-${row.transmission}`">
          <td>{{ row.year }}</td>
          <td v-if="showVersion">{{ versionOf(row) }}</td>
          <td>{{ row.n }}</td>
          <td>{{ formatCarUsd(row.p25) }} – {{ formatCarUsd(row.p75) }}</td>
          <td class="font-weight-bold">{{ formatCarUsd(row.median) }}</td>
          <td>{{ formatCarKm(row.kmMedian) }}</td>
        </tr>
      </tbody>
    </VTable>
  </div>
</template>

<script setup lang="ts">
import { CAR_TRANSMISSION_LABELS, formatCarKm, formatCarUsd } from '~/utils/cars'
import type { PublicCarMarketRow } from '~/utils/carsPublic'

defineProps<{ rows: PublicCarMarketRow[]; caption: string; showVersion?: boolean }>()
const versionOf = (row: PublicCarMarketRow): string =>
  [row.trim, row.engine, row.transmission && CAR_TRANSMISSION_LABELS[row.transmission]]
    .filter(Boolean)
    .join(' · ')
</script>

<style scoped>
.market-table {
  overflow-x: auto;
}
</style>
```

- [ ] **Step 4: Write `app/components/cars/OpportunityCard.vue`**

```vue
<template>
  <article class="deal-card">
    <div class="deal-card__head">
      <span class="deal-card__tier" :class="`deal-card__tier--${item.tier}`">
        {{ item.tier === 'strict' ? 'Comparación sólida' : 'Comparación exploratoria' }}
      </span>
      <span class="text-body-2 text-medium-emphasis">
        Ficha revisada el {{ formatCarDate(item.detailReadAt) }}
      </span>
    </div>
    <div class="deal-card__main">
      <img
        v-if="item.subject.picture"
        :src="item.subject.picture"
        :alt="item.subject.title"
        loading="lazy"
        width="160"
        height="107"
        referrerpolicy="no-referrer"
        class="deal-card__photo"
      />
      <div>
        <h3 class="text-subtitle-1 font-weight-bold mb-1">
          <NuxtLink v-if="!hideSubjectLink" :to="localePath(carPath(item.subject.key))">
            {{ item.subject.title }}
          </NuxtLink>
          <template v-else>{{ item.subject.title }}</template>
        </h3>
        <p class="text-body-2 mb-1">{{ facts }}</p>
        <p class="text-h6 font-weight-bold mb-1">{{ formatCarUsd(item.subject.priceUsd) }}</p>
        <p class="text-body-1 mb-0">
          <strong>{{ carPercent(item.gap) }} menos</strong> que la mediana
          ({{ formatCarUsd(item.sample.median) }}) de {{ item.sample.n }} avisos del mismo modelo, año,
          versión, motor y caja, de {{ item.sample.sellers }} vendedores distintos. Sacando a cualquier
          vendedor de la muestra, la diferencia sigue en {{ carPercent(item.sellerSensitivityGap) }} o más.
        </p>
      </div>
    </div>
    <details class="deal-card__details">
      <summary>Ver los {{ item.comparables.length }} avisos comparables</summary>
      <div class="deal-card__table">
        <VTable density="compact">
          <thead>
            <tr>
              <th scope="col">Aviso</th>
              <th scope="col">Año</th>
              <th scope="col">Km</th>
              <th scope="col">Precio</th>
              <th scope="col">Vende</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="peer in item.comparables" :key="peer.key">
              <td>
                <a :href="peer.permalink" target="_blank" rel="nofollow noopener">{{ peer.title }}</a>
              </td>
              <td>{{ peer.year }}</td>
              <td>{{ formatCarKm(peer.km) }}</td>
              <td>{{ formatCarUsd(peer.priceUsd) }}</td>
              <td>{{ peer.sellerType ? CAR_SELLER_LABELS[peer.sellerType] : '—' }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p class="text-body-2 text-medium-emphasis mt-2">
        Rango central de la muestra: {{ formatCarUsd(item.sample.p25) }} –
        {{ formatCarUsd(item.sample.p75) }}. Km mediano {{ formatCarKm(item.sample.kmMedian) }}; este auto
        no tiene más km que tres de cada cuatro comparables.
      </p>
    </details>
    <div class="d-flex flex-wrap ga-2 mt-3">
      <VBtn
        size="small"
        color="primary"
        :href="item.subject.permalink"
        target="_blank"
        rel="nofollow noopener"
        append-icon="mdi-open-in-new"
      >
        Ver aviso
      </VBtn>
      <VBtn size="small" variant="outlined" :to="localePath('/comprar-auto-con-deuda-uruguay')">
        Revisar deudas
      </VBtn>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  CAR_SELLER_LABELS,
  carPath,
  carPercent,
  formatCarDate,
  formatCarKm,
  formatCarUsd,
} from '~/utils/cars'
import type { PublicCarOpportunityItem } from '~/utils/carsPublic'

const props = defineProps<{ item: PublicCarOpportunityItem; hideSubjectLink?: boolean }>()
const localePath = useLocalePath()
const facts = computed(() =>
  [
    String(props.item.subject.year),
    formatCarKm(props.item.subject.km),
    props.item.subject.trim,
    props.item.subject.engine,
    props.item.subject.department,
  ]
    .filter(Boolean)
    .join(' · ')
)
</script>

<style scoped>
.deal-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 16px;
  background: rgb(var(--v-theme-surface));
}
.deal-card__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.deal-card__tier {
  font-size: 0.8rem;
  font-weight: 700;
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 2px 10px;
}
.deal-card__tier--strict {
  color: rgb(var(--v-theme-success));
}
.deal-card__tier--exploratory {
  color: rgb(var(--v-theme-info));
}
.deal-card__main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.deal-card__photo {
  width: 160px;
  height: auto;
  border-radius: 8px;
  flex-shrink: 0;
  object-fit: cover;
}
@media (max-width: 599px) {
  .deal-card__main {
    flex-direction: column;
  }
  .deal-card__photo {
    width: 100%;
  }
}
.deal-card__details summary {
  cursor: pointer;
  font-weight: 600;
  margin-top: 12px;
  min-height: 44px;
  display: flex;
  align-items: center;
}
.deal-card__table {
  overflow-x: auto;
}
</style>
```

- [ ] **Step 5: Write `app/pages/autos-usados-uruguay/index.vue`**

```vue
<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[{ title: 'Inicio', to: localePath('/') }, { title: 'Autos usados' }]"
      class="px-0 mb-2"
    />
    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">Autos usados en venta en Uruguay</h1>
      <p class="text-body-1 mb-2">
        Los avisos de autos usados de Mercado Libre en un solo buscador, con el precio en dólares, los
        kilómetros y la comparación contra autos iguales.
        <template v-if="data">
          Hoy hay {{ data.coverage.listings.toLocaleString('es-UY') }} avisos vigentes; última lectura
          el {{ formatCarDate(data.coverage.lastReadAt) }}.
        </template>
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn color="primary" :to="localePath(CAR_OPPORTUNITIES_PATH)" prepend-icon="mdi-tag-arrow-down-outline">
          Ver oportunidades
          <template v-if="data?.coverage.opportunities">({{ data.coverage.opportunities }})</template>
        </VBtn>
        <VBtn
          variant="outlined"
          :to="localePath('/comprar-auto-con-deuda-uruguay')"
          prepend-icon="mdi-file-document-check-outline"
        >
          Antes de señar: deudas y SUCIVE
        </VBtn>
      </div>
    </header>

    <VRow>
      <VCol cols="12" md="3">
        <VBtn
          class="d-md-none mb-3"
          variant="outlined"
          block
          prepend-icon="mdi-filter-variant"
          @click="filtersOpen = !filtersOpen"
        >
          {{ filtersOpen ? 'Ocultar filtros' : 'Filtros' }}
        </VBtn>
        <div class="cars-filters" :class="{ 'cars-filters--open': filtersOpen }">
          <CarsFilters :query="query" :facets="data?.facets ?? emptyFacets" @apply="update" />
        </div>
      </VCol>
      <VCol cols="12" md="9">
        <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
          <h2 class="text-h6 mb-0">
            {{ data ? `${data.total.toLocaleString('es-UY')} avisos` : 'Avisos' }}
          </h2>
          <VSelect
            :model-value="query.sort"
            :items="sortItems"
            label="Ordenar"
            density="compact"
            variant="outlined"
            hide-details
            class="cars-sort"
            @update:model-value="value => update({ ...query, sort: value, page: 1 })"
          />
        </div>

        <VAlert v-if="error" type="warning" variant="outlined" class="mb-4">
          El directorio se está actualizando. Probá de nuevo en unos minutos.
        </VAlert>
        <p v-else-if="data && !data.items.length" class="text-body-1">
          No hay avisos con esos filtros. Probá ampliar el año, el precio o los kilómetros.
        </p>

        <div v-if="data?.items.length" class="cars-grid">
          <CarsListingCard v-for="car in data.items" :key="car.key" :car="car" />
        </div>

        <VPagination
          v-if="data && data.total > data.perPage"
          :model-value="query.page"
          :length="Math.min(500, Math.ceil(data.total / data.perPage))"
          :total-visible="5"
          class="mt-6"
          @update:model-value="page => update({ ...query, page })"
        />
      </VCol>
    </VRow>

    <section v-if="data?.coverage.models.length" class="mt-10">
      <h2 class="text-h5 mb-3">Precios por modelo</h2>
      <p class="text-body-2 mb-3">
        Cuánto se pide por cada modelo según el año y la versión, con el rango central de los avisos.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="model in data.coverage.models.slice(0, 40)"
          :key="model.slug"
          size="small"
          variant="outlined"
          :to="localePath(carMarketPath(model.slug))"
        >
          {{ model.brand }} {{ model.model }} ({{ model.listings }})
        </VBtn>
      </div>
    </section>

    <section class="mt-10">
      <h2 class="text-h5 mb-3">Cómo leer estos datos</h2>
      <ul class="text-body-1 pl-5">
        <li>Son precios <strong>pedidos</strong> en avisos, no precios de venta cerrados.</li>
        <li>
          La fuente es Mercado Libre, que concentra la gran mayoría de los avisos de autos del país; el
          conteo es de avisos vistos, no de autos en venta en Uruguay.
        </li>
        <li>"Visto por primera vez" es la fecha en que leímos el aviso, no la de publicación.</li>
        <li>
          Los kilómetros son los que declara quien vende. Los valores de relleno (1, 111.111…) se
          muestran como "km no informado".
        </li>
        <li>Los avisos en pesos se muestran en pesos; el filtro en dólares usa la cotización del día.</li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CAR_OPPORTUNITIES_PATH,
  CARS_PATH,
  carMarketPath,
  carsFiltered,
  carsQueryParams,
  formatCarDate,
  normalizeCarsQuery,
  type CarSort,
  type CarsQuery,
  type CarsResponse,
} from '~/utils/cars'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const filtersOpen = ref(false)
const emptyFacets = { brands: [], models: [], departments: [] }
const sortItems: Array<{ title: string; value: CarSort }> = [
  { title: 'Vistos más recientemente', value: 'recent' },
  { title: 'Menor precio', value: 'price_asc' },
  { title: 'Mayor precio', value: 'price_desc' },
  { title: 'Menos kilómetros', value: 'km_asc' },
  { title: 'Más nuevos', value: 'year_desc' },
]

const query = computed(() => normalizeCarsQuery(route.query as Record<string, unknown>))
const { data, error } = await useAsyncData(
  'cars-directory',
  () => $fetch<CarsResponse>('/api/cars', { query: carsQueryParams(query.value) }),
  { watch: [query] }
)

function update(next: CarsQuery) {
  filtersOpen.value = false
  router.replace({ query: carsQueryParams(next) })
}

const canonical = `https://cambio-uruguay.com${CARS_PATH}`
const title = 'Autos usados en venta en Uruguay'
const description =
  'Buscador de autos usados en venta en Uruguay: precio en dólares, kilómetros, versión y comparación contra autos iguales. Avisos de Mercado Libre actualizados todos los días.'

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  robots: () => (carsFiltered(query.value) ? 'noindex, follow' : 'index, follow'),
})

useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'CollectionPage', name: title, description, url: canonical },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://cambio-uruguay.com/' },
              { '@type': 'ListItem', position: 2, name: 'Autos usados', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.cars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.cars-sort {
  max-width: 240px;
}
.cars-filters {
  display: none;
}
.cars-filters--open {
  display: block;
}
@media (min-width: 960px) {
  .cars-filters {
    display: block;
    position: sticky;
    top: 80px;
  }
}
</style>
```

- [ ] **Step 6: Write `app/pages/autos-usados-uruguay/[key].vue`**

```vue
<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs :items="breadcrumbs" class="px-0 mb-2" />

    <template v-if="!data">
      <h1 class="text-h5 font-weight-bold mb-3">
        {{ failureCode === 404 ? 'Este aviso ya no está en el directorio' : 'No pudimos cargar el aviso' }}
      </h1>
      <p class="text-body-1 mb-4">
        {{
          failureCode === 404
            ? 'Los avisos de autos vencen o se venden rápido. Buscá autos parecidos en el directorio.'
            : 'Probá de nuevo en unos minutos.'
        }}
      </p>
      <VBtn color="primary" :to="localePath(CARS_PATH)">Ir al directorio</VBtn>
    </template>

    <template v-else>
      <VRow>
        <VCol cols="12" md="6">
          <div class="car-photo">
            <img
              v-if="car.picture"
              :src="car.picture"
              :alt="car.title"
              width="720"
              height="480"
              referrerpolicy="no-referrer"
            />
            <VIcon v-else icon="mdi-car-outline" size="64" />
          </div>
        </VCol>
        <VCol cols="12" md="6">
          <h1 class="text-h5 font-weight-bold mb-2">{{ car.title }}</h1>
          <p class="text-h4 font-weight-bold mb-1">{{ formatCarPrice(car) }}</p>
          <p v-if="car.priceConverted" class="text-body-2 text-medium-emphasis">
            ≈ {{ formatCarUsd(car.priceUsd) }} a la cotización del día
          </p>
          <p v-if="car.priceDrop" class="text-body-2 mb-2">
            Bajó de {{ formatCarPrice({ price: car.priceDrop.from, currency: car.priceDrop.currency }) }} el
            {{ formatCarDate(car.priceDrop.since) }}.
          </p>
          <VTable density="compact" class="mb-4">
            <tbody>
              <tr>
                <th scope="row">Año</th>
                <td>{{ car.year }}</td>
              </tr>
              <tr>
                <th scope="row">Kilómetros</th>
                <td>{{ formatCarKm(car.km) }}</td>
              </tr>
              <tr v-if="car.trim || car.engine">
                <th scope="row">Versión</th>
                <td>{{ [car.trim, car.engine].filter(Boolean).join(' · ') }}</td>
              </tr>
              <tr v-if="car.transmission">
                <th scope="row">Caja</th>
                <td>{{ CAR_TRANSMISSION_LABELS[car.transmission] }}</td>
              </tr>
              <tr v-if="car.fuel">
                <th scope="row">Combustible</th>
                <td>{{ CAR_FUEL_LABELS[car.fuel] }}</td>
              </tr>
              <tr>
                <th scope="row">Ubicación</th>
                <td>{{ [car.neighborhood, car.department].filter(Boolean).join(', ') || '—' }}</td>
              </tr>
              <tr v-if="car.sellerType">
                <th scope="row">Vende</th>
                <td>{{ car.dealerName || CAR_SELLER_LABELS[car.sellerType] }}</td>
              </tr>
              <tr>
                <th scope="row">Visto por primera vez</th>
                <td>{{ formatCarDate(car.firstSeen) }}</td>
              </tr>
              <tr>
                <th scope="row">Última lectura</th>
                <td>{{ formatCarDate(car.lastSeen) }}</td>
              </tr>
            </tbody>
          </VTable>
          <VAlert
            v-for="flag in car.flags"
            :key="flag"
            type="warning"
            variant="outlined"
            density="compact"
            class="mb-2"
          >
            {{ CAR_FLAG_LABELS[flag] }}.
          </VAlert>
          <div class="d-flex flex-wrap ga-2">
            <VBtn
              color="primary"
              :href="car.permalink"
              target="_blank"
              rel="nofollow noopener"
              append-icon="mdi-open-in-new"
            >
              Ver aviso en Mercado Libre
            </VBtn>
            <VBtn variant="outlined" :to="localePath('/comprar-auto-con-deuda-uruguay')">
              Revisar deudas antes de señar
            </VBtn>
          </div>
        </VCol>
      </VRow>

      <section v-if="data.cohort" class="mt-8">
        <h2 class="text-h6 mb-2">¿Cómo está el precio?</h2>
        <p class="text-body-1">
          Para {{ car.brand }} {{ car.model }} {{ data.cohort.trim || '' }} {{ car.year }} hay
          {{ data.cohort.n }} avisos comparables: la mitad pide menos de
          <strong>{{ formatCarUsd(data.cohort.median) }}</strong> y el rango central va de
          {{ formatCarUsd(data.cohort.p25) }} a {{ formatCarUsd(data.cohort.p75) }}, con
          {{ formatCarKm(data.cohort.kmMedian) }} de mediana. Este aviso pide
          {{ formatCarUsd(car.priceUsd) }}.
        </p>
      </section>

      <section v-if="data.opportunity" class="mt-8">
        <h2 class="text-h6 mb-2">Por qué aparece como oportunidad</h2>
        <CarsOpportunityCard :item="data.opportunity" hide-subject-link />
      </section>

      <section v-if="data.similar.length" class="mt-8">
        <h2 class="text-h6 mb-3">Otros {{ car.brand }} {{ car.model }} parecidos</h2>
        <div class="cars-grid">
          <CarsListingCard v-for="other in data.similar" :key="other.key" :car="other" />
        </div>
      </section>

      <p class="text-body-2 text-medium-emphasis mt-8">
        Datos del aviso publicado en Mercado Libre. Es un precio pedido, no una tasación; confirmá
        estado, papeles y deudas del vehículo antes de pagar.
      </p>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CAR_FLAG_LABELS,
  CAR_FUEL_LABELS,
  CAR_SELLER_LABELS,
  CAR_TRANSMISSION_LABELS,
  CARS_PATH,
  carKeyValid,
  carMarketPath,
  carPath,
  formatCarDate,
  formatCarKm,
  formatCarPrice,
  formatCarUsd,
  type CarDetailResponse,
} from '~/utils/cars'

const route = useRoute()
const localePath = useLocalePath()
const key = computed(() => String(route.params.key || ''))
const { data, error } = await useAsyncData<CarDetailResponse>(
  () => `car-${key.value}`,
  () => {
    if (!carKeyValid(key.value))
      throw createError({ statusCode: 404, statusMessage: 'Advert not found' })
    return $fetch<CarDetailResponse>(`/api/cars/ficha/${encodeURIComponent(key.value)}`)
  }
)
const failureCode = computed(() => {
  const failure = error.value as { statusCode?: number; data?: { statusCode?: number } } | null
  return failure?.statusCode === 404 || failure?.data?.statusCode === 404 ? 404 : 503
})
if (import.meta.server && (error.value || !data.value)) {
  const event = useRequestEvent()
  if (event) {
    setResponseStatus(event, failureCode.value)
    useResponseHeader('cache-control').value = 'no-store, max-age=0'
  }
}
const car = computed(() => data.value!.car)
const breadcrumbs = computed(() => [
  { title: 'Autos usados', to: localePath(CARS_PATH) },
  ...(data.value?.market
    ? [
        {
          title: `${data.value.market.brand} ${data.value.market.model}`,
          to: localePath(carMarketPath(data.value.market.slug)),
        },
      ]
    : []),
  { title: data.value?.car.title ?? 'Aviso' },
])
const canonical = computed(() => `https://cambio-uruguay.com${carPath(key.value)}`)
const title = computed(() => (data.value ? `${car.value.title} ${car.value.year}` : 'Aviso de auto usado'))
const description = computed(() =>
  data.value
    ? `${car.value.title}, ${car.value.year}, ${formatCarKm(car.value.km)}: ${formatCarPrice(car.value)}. Comparado contra avisos iguales en Uruguay.`
    : 'Aviso de auto usado en Uruguay.'
)

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  // Un aviso vence en semanas: la ficha sirve para decidir, no para el índice.
  robots: 'noindex, follow',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: data.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Car',
            name: car.value.title,
            brand: { '@type': 'Brand', name: car.value.brand },
            model: car.value.model,
            vehicleModelDate: String(car.value.year),
            ...(car.value.km !== null
              ? {
                  mileageFromOdometer: {
                    '@type': 'QuantitativeValue',
                    value: car.value.km,
                    unitCode: 'KMT',
                  },
                }
              : {}),
            url: canonical.value,
            offers: {
              '@type': 'Offer',
              price: car.value.price,
              priceCurrency: car.value.currency,
              url: car.value.permalink,
              itemCondition: 'https://schema.org/UsedCondition',
            },
          }),
        },
      ]
    : [],
}))
</script>

<style scoped>
.car-photo {
  aspect-ratio: 3 / 2;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.car-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
</style>
```

- [ ] **Step 7: Register navigation, labels and noindex**

`app/utils/siteNav.ts` — immediately after the `/comprar-auto-con-deuda-uruguay` entry object:
```ts
      {
        to: '/autos-usados-uruguay',
        labelKey: 'nav.usedCars',
        icon: 'mdi-car-search-outline',
        priority: 0.8,
        changefreq: 'daily',
        keywords: [
          'autos usados uruguay',
          'autos usados en venta',
          'precio auto usado',
          'comprar auto usado',
          'autos usados montevideo',
          'cuanto vale mi auto',
        ],
      },
```
In `DYNAMIC_ROUTE_KEYS` add `'autos-usados-uruguay/[key]': 'consumer',` next to `'venta-viviendas-uruguay/[key]'`. If the section holding `/comprar-auto-con-deuda-uruguay` is not `consumer`, use that section's id in `DYNAMIC_ROUTE_KEYS` instead.

`app/i18n/locales/json/es.json`, inside `"nav"` next to `"comprarAutoConDeuda"`: `"usedCars": "Autos usados en venta",`; `en.json`: `"usedCars": "Used cars for sale",`; `pt.json`: `"usedCars": "Carros usados à venda",`.

`app/tests/unit/seoContract.test.ts` `NOINDEXED` (alphabetical position):
```ts
  // Autos usados: el directorio se indexa en su URL base; filtros y fichas de aviso (vencen en semanas) no.
  'autos-usados-uruguay/[key].vue',
  'autos-usados-uruguay/index.vue',
```

- [ ] **Step 8: Format, test, lint**

From `app/`:
```bash
npx prettier --write components/cars pages/autos-usados-uruguay utils/siteNav.ts tests/unit/seoContract.test.ts
npx vitest run tests/unit/siteNav-coverage.test.ts tests/unit/seoContract.test.ts tests/unit/pageContainer.test.ts tests/unit/internalLinks.test.ts tests/unit/seoTitleBudget.test.ts
ls tests/unit | grep -i -E "component|resolution|i18n|pipe|date" 
npx eslint components/cars pages/autos-usados-uruguay
```
Run every test file the `ls` lists (component resolution, i18n pipes, date locale). Expected: PASS. Fix what fails; never add these pages to any exemption list other than `NOINDEXED` above.

- [ ] **Step 9: Commit**

```bash
git add app/components/cars app/pages/autos-usados-uruguay app/utils/siteNav.ts app/i18n/locales/json app/tests/unit/seoContract.test.ts
git commit -m "feat(autos): directorio de autos usados y ficha del aviso"
```

---

### Task 10: Model market page, opportunities page, sitemap and related pages

**Files:**
- Create: `app/pages/autos-usados-uruguay/precios/[slug].vue`, `app/pages/oportunidades-autos-usados-uruguay.vue`
- Modify: `app/utils/siteNav.ts`, `app/i18n/locales/json/{es,en,pt}.json`, `app/tests/unit/seoContract.test.ts`, `app/server/api/__sitemap__/urls.get.ts`, `app/utils/relatedPages.ts`

**Interfaces:**
- Consumes: Task 8 utils/APIs; Task 9 components.

- [ ] **Step 1: Write `app/pages/autos-usados-uruguay/precios/[slug].vue`**

```vue
<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Autos usados', to: localePath(CARS_PATH) },
        { title: data ? `${data.market.brand} ${data.market.model}` : 'Modelo' },
      ]"
      class="px-0 mb-2"
    />

    <template v-if="!data">
      <h1 class="text-h5 font-weight-bold mb-3">
        {{ failureCode === 404 ? 'No hay suficientes avisos de este modelo' : 'No pudimos cargar el modelo' }}
      </h1>
      <VBtn color="primary" :to="localePath(CARS_PATH)">Ir al directorio</VBtn>
    </template>

    <template v-else>
      <header class="mb-6">
        <h1 class="text-h4 font-weight-bold mb-2">{{ heading }}</h1>
        <p class="text-body-1">
          {{ data.market.listings }} avisos vigentes de {{ data.market.brand }} {{ data.market.model }}
          usado en Mercado Libre, leídos el {{ formatCarDate(data.market.generatedAt) }}. Son precios
          pedidos, agrupados por año y por versión; no es una tasación.
        </p>
        <VAlert v-if="!data.indexable" type="info" variant="outlined" density="compact" class="mt-3">
          Con menos de {{ CAR_MARKET_INDEX_MIN }} avisos los rangos cambian mucho de un día a otro:
          tomalos como referencia gruesa.
        </VAlert>
      </header>

      <section v-if="data.market.years.length" class="mb-8">
        <h2 class="text-h6 mb-2">Precio por año</h2>
        <CarsMarketTable
          :rows="data.market.years"
          caption="Todas las versiones juntas; sólo años con 5 avisos o más."
        />
      </section>

      <section v-if="data.market.rows.length" class="mb-8">
        <h2 class="text-h6 mb-2">Precio por año y versión</h2>
        <CarsMarketTable
          :rows="data.market.rows"
          show-version
          caption="Misma versión, motor y caja; sólo combinaciones con 5 avisos o más."
        />
      </section>

      <section v-if="data.opportunities.length" class="mb-8">
        <h2 class="text-h6 mb-3">Oportunidades de este modelo</h2>
        <div class="d-flex flex-column ga-4">
          <CarsOpportunityCard v-for="item in data.opportunities" :key="item.subject.key" :item="item" />
        </div>
      </section>

      <section v-if="data.listings.length" class="mb-8">
        <div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-3">
          <h2 class="text-h6 mb-0">Avisos vigentes</h2>
          <VBtn
            variant="text"
            :to="localePath({ path: CARS_PATH, query: { brand: data.market.brandSlug, model: data.market.slug } })"
          >
            Filtrar en el directorio
          </VBtn>
        </div>
        <div class="cars-grid">
          <CarsListingCard v-for="car in data.listings" :key="car.key" :car="car" />
        </div>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CAR_MARKET_INDEX_MIN,
  CARS_PATH,
  carMarketPath,
  carMarketSlugValid,
  formatCarDate,
  formatCarUsd,
  type CarMarketResponse,
} from '~/utils/cars'

const route = useRoute()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.slug || ''))
const { data, error } = await useAsyncData<CarMarketResponse>(
  () => `car-market-${slug.value}`,
  () => {
    if (!carMarketSlugValid(slug.value))
      throw createError({ statusCode: 404, statusMessage: 'Model not found' })
    return $fetch<CarMarketResponse>(`/api/cars/market/${encodeURIComponent(slug.value)}`)
  }
)
const failureCode = computed(() => {
  const failure = error.value as { statusCode?: number; data?: { statusCode?: number } } | null
  return failure?.statusCode === 404 || failure?.data?.statusCode === 404 ? 404 : 503
})
if (import.meta.server && (error.value || !data.value)) {
  const event = useRequestEvent()
  if (event) {
    setResponseStatus(event, failureCode.value)
    useResponseHeader('cache-control').value = 'no-store, max-age=0'
  }
}

const name = computed(() =>
  data.value ? `${data.value.market.brand} ${data.value.market.model}` : 'Auto'
)
const heading = computed(() => `${name.value} usado: precios en Uruguay`)
const canonical = computed(() => `https://cambio-uruguay.com${carMarketPath(slug.value)}`)
const latest = computed(() => data.value?.market.years[0] ?? null)
const description = computed(() =>
  latest.value
    ? `Cuánto se pide por un ${name.value} usado en Uruguay: un ${latest.value.year} tiene mediana de ${formatCarUsd(latest.value.median)} sobre ${latest.value.n} avisos. Precios por año y versión, actualizados todos los días.`
    : `Precios pedidos por ${name.value} usado en Uruguay, por año y versión.`
)

useSeoMeta({
  title: () => `${heading.value} | Cambio Uruguay`,
  description,
  ogTitle: heading,
  ogDescription: description,
  ogUrl: canonical,
  // Un modelo con pocos avisos existe como página pero no promete un rango que la muestra no sostiene.
  robots: () => (data.value?.indexable ? 'index, follow' : 'noindex, follow'),
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: data.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Product',
                name: `${name.value} usado`,
                brand: { '@type': 'Brand', name: data.value.market.brand },
                url: canonical.value,
                ...(data.value.market.years.length
                  ? {
                      offers: {
                        '@type': 'AggregateOffer',
                        priceCurrency: 'USD',
                        lowPrice: Math.min(...data.value.market.years.map(row => row.p25)),
                        highPrice: Math.max(...data.value.market.years.map(row => row.p75)),
                        offerCount: data.value.market.listings,
                      },
                    }
                  : {}),
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Autos usados',
                    item: `https://cambio-uruguay.com${CARS_PATH}`,
                  },
                  { '@type': 'ListItem', position: 2, name: name.value, item: canonical.value },
                ],
              },
            ],
          }),
        },
      ]
    : [],
}))
</script>

<style scoped>
.cars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
</style>
```

- [ ] **Step 2: Write `app/pages/oportunidades-autos-usados-uruguay.vue`**

```vue
<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[{ title: 'Autos usados', to: localePath(CARS_PATH) }, { title: 'Oportunidades' }]"
      class="px-0 mb-2"
    />
    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">Oportunidades en autos usados en Uruguay</h1>
      <p class="text-body-1 mb-3">
        Autos que piden bastante menos que otros avisos del
        <strong>mismo modelo, año, versión, motor y caja</strong>, con kilómetros parecidos. Cada uno pasó
        por su propia ficha: sigue activo, con el mismo precio y sin menciones de choque, recupero de
        seguro, deudas o chapa extranjera.
      </p>
      <VAlert type="warning" variant="outlined" density="comfortable">
        No es una tasación ni una garantía. Un precio bajo puede tener una explicación que el aviso no
        dice: pedí el Certificado SUCIVE, revisá el título y hacé revisar el auto antes de señar.
      </VAlert>
    </header>

    <VRow>
      <VCol cols="12" md="3">
        <form class="deal-filters" @submit.prevent="apply">
          <VSelect v-model="draft.tier" :items="tierItems" label="Evidencia" density="comfortable" variant="outlined" hide-details />
          <VSelect v-model="draft.brand" :items="brandItems" label="Marca" density="comfortable" variant="outlined" hide-details />
          <VTextField
            v-model="draft.priceMax"
            label="Presupuesto máximo (US$)"
            inputmode="numeric"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <VSelect v-model="draft.department" :items="departmentItems" label="Departamento" density="comfortable" variant="outlined" hide-details />
          <VSelect v-model="draft.seller" :items="sellerItems" label="Vende" density="comfortable" variant="outlined" hide-details />
          <VBtn type="submit" color="primary" block>Aplicar</VBtn>
        </form>
      </VCol>
      <VCol cols="12" md="9">
        <VAlert v-if="error" type="info" variant="outlined" class="mb-4">
          La comparación se está calculando. Volvé en unos minutos.
        </VAlert>
        <template v-else-if="data">
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ data.total }} resultados · cálculo del {{ formatCarDate(data.generatedAt) }} sobre
            {{ data.stats.input.toLocaleString('es-UY') }} avisos, de los cuales
            {{ data.stats.analyzed.toLocaleString('es-UY') }} tenían suficientes comparables.
          </p>
          <p v-if="!data.items.length" class="text-body-1">
            Hoy no hay autos que cumplan estas condiciones con esos filtros. Es un resultado válido: la
            regla es exigente a propósito.
          </p>
          <div class="d-flex flex-column ga-4">
            <CarsOpportunityCard v-for="item in data.items" :key="item.subject.key" :item="item" />
          </div>
          <VPagination
            v-if="data.total > data.perPage"
            :model-value="query.page"
            :length="Math.ceil(data.total / data.perPage)"
            :total-visible="5"
            class="mt-6"
            @update:model-value="page => navigate({ ...query, page })"
          />
        </template>
      </VCol>
    </VRow>

    <section v-if="data" id="metodo" class="mt-10">
      <h2 class="text-h5 mb-3">Cómo se calcula</h2>
      <ul class="text-body-1 pl-5">
        <li>
          Cada aviso se compara sólo contra avisos del mismo modelo, año, versión, motor y caja, con
          kilómetros dentro de {{ formatCarKm(data.policy.kmToleranceMin) }} o
          {{ carPercent(data.policy.kmToleranceRatio) }}, lo que sea mayor. La muestra se arma antes de
          mirar los precios.
        </li>
        <li>
          <strong>Comparación sólida:</strong> al menos {{ data.policy.strict.minimumComparables }} avisos
          de {{ data.policy.strict.minimumSellers }} vendedores distintos, el precio
          {{ carPercent(data.policy.strict.minimumGap) }} o más por debajo de la mediana y por debajo del
          cuarto más barato, y la diferencia se sostiene
          ({{ carPercent(data.policy.strict.minimumSellerSensitivityGap) }} o más) aunque se saque de la
          muestra a cualquier vendedor.
        </li>
        <li>
          <strong>Comparación exploratoria:</strong> desde
          {{ data.policy.exploratory.minimumComparables }} avisos y
          {{ data.policy.exploratory.minimumSellers }} vendedores, con
          {{ carPercent(data.policy.exploratory.minimumGap) }} de diferencia.
        </li>
        <li>
          Nunca se muestra un auto con más km que tres de cada cuatro comparables, ni diferencias de más
          de {{ carPercent(data.policy.maximumGap) }}: casi siempre esconden un error o un problema.
        </li>
        <li>
          Se excluyen avisos con km de relleno, precio en pesos, títulos que hablan de entrega y cuotas, o
          menciones de choque, recupero, deuda, leasing o chapa extranjera en el título o la descripción.
        </li>
        <li>Máximo {{ data.policy.maximumPerSeller }} avisos por vendedor en cada muestra.</li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CAR_OPPORTUNITIES_PATH,
  CAR_SELLERS,
  CAR_SELLER_LABELS,
  CARS_PATH,
  carOpportunityQueryParams,
  carPercent,
  formatCarDate,
  formatCarKm,
  normalizeCarOpportunityQuery,
  type CarOpportunitiesResponse,
  type CarOpportunityQuery,
} from '~/utils/cars'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const tierItems = [
  { title: 'Sólida y exploratoria', value: '' },
  { title: 'Sólo comparación sólida', value: 'strict' },
  { title: 'Sólo exploratoria', value: 'exploratory' },
]
const sellerItems = [
  { title: 'Dueño o automotora', value: '' },
  ...CAR_SELLERS.map(value => ({ title: CAR_SELLER_LABELS[value], value })),
]

const query = computed(() => normalizeCarOpportunityQuery(route.query as Record<string, unknown>))
const { data, error } = await useAsyncData(
  'car-opportunities',
  () =>
    $fetch<CarOpportunitiesResponse>('/api/car-opportunities', {
      query: carOpportunityQueryParams(query.value),
    }),
  { watch: [query] }
)
const brandItems = computed(() => [
  { title: 'Todas las marcas', value: '' },
  ...(data.value?.brands ?? []).map(brand => ({ title: `${brand.name} (${brand.count})`, value: brand.slug })),
])
const departmentItems = computed(() => [
  { title: 'Todo el país', value: '' },
  ...(data.value?.departments ?? []).map(value => ({ title: value, value })),
])

const toDraft = (value: CarOpportunityQuery) => ({
  tier: value.tier as string,
  brand: value.brand,
  priceMax: value.priceMax?.toString() ?? '',
  department: value.department,
  seller: value.seller as string,
})
const draft = reactive(toDraft(query.value))
watch(query, next => Object.assign(draft, toDraft(next)))

function navigate(next: CarOpportunityQuery) {
  router.replace({ query: carOpportunityQueryParams(next) })
}
function apply() {
  navigate(normalizeCarOpportunityQuery({ ...draft }))
}

const canonical = `https://cambio-uruguay.com${CAR_OPPORTUNITIES_PATH}`
const title = 'Oportunidades en autos usados en Uruguay'
const description =
  'Autos usados que piden menos que otros avisos del mismo modelo, año, versión, motor y caja en Uruguay, con los comparables a la vista y cada ficha revisada. No es una tasación.'

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  robots: () => (Object.keys(route.query).length ? 'noindex, follow' : 'index, follow'),
})

useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'CollectionPage', name: title, description, url: canonical },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Autos usados',
                item: `https://cambio-uruguay.com${CARS_PATH}`,
              },
              { '@type': 'ListItem', position: 2, name: 'Oportunidades', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.deal-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
@media (min-width: 960px) {
  .deal-filters {
    position: sticky;
    top: 80px;
  }
}
</style>
```

- [ ] **Step 3: Register navigation, labels, noindex, sitemap and related pages**

`app/utils/siteNav.ts` — right after the `/autos-usados-uruguay` entry:
```ts
      {
        to: '/oportunidades-autos-usados-uruguay',
        labelKey: 'nav.usedCarOpportunities',
        icon: 'mdi-tag-arrow-down-outline',
        priority: 0.8,
        changefreq: 'daily',
        keywords: [
          'oportunidades autos usados',
          'autos usados baratos uruguay',
          'auto usado precio bajo',
          'ganga auto usado',
          'comparar precio auto usado',
        ],
      },
```
`DYNAMIC_ROUTE_KEYS`: add `'autos-usados-uruguay/precios/[slug]': 'consumer',` (same section id used in Task 9).

i18n `nav`: es `"usedCarOpportunities": "Oportunidades en autos usados",`; en `"usedCarOpportunities": "Used car deals",`; pt `"usedCarOpportunities": "Oportunidades em carros usados",`.

`NOINDEXED` in `seoContract.test.ts` (alphabetical):
```ts
  'autos-usados-uruguay/precios/[slug].vue',
  // Index the used-car opportunity list itself; filter combinations opt out.
  'oportunidades-autos-usados-uruguay.vue',
```

`app/server/api/__sitemap__/urls.get.ts` — add `import { CarCatalogMetaModel } from '../../models/CarCatalogMeta'` beside `ChairCatalogProductModel`, and right after the desk-chair `try { … } finally { … }` block:
```ts
  // --- Used-car model pages: only models with enough live adverts to publish a range --------
  // Spanish only (the body is Uruguayan asking prices). Individual adverts are noindex.
  try {
    await connectDb()
    const doc = await CarCatalogMetaModel.findOne({ key: 'uy-cars' }).select({ meta: 1 }).lean()
    const models = (doc?.meta?.models ?? []).filter(model => model.listings >= 30)
    models.forEach(model => {
      urls.push({
        loc: `/autos-usados-uruguay/precios/${model.slug}`,
        changefreq: 'daily',
        priority: 0.6,
      })
    })
    if (models.length) console.log(`- Used-car model pages: ${models.length} routes`)
  } catch (carError) {
    console.warn('Failed to add used-car model pages to sitemap:', carError)
  } finally {
    await disconnectDbAfterPrerender()
  }
```

`app/utils/relatedPages.ts` — in `CURATED` add (only routes declared in `siteNav`; if `relatedPages.test.ts` rejects one, swap it for another car-related nav route):
```ts
  '/autos-usados-uruguay': [
    '/oportunidades-autos-usados-uruguay',
    '/comprar-auto-con-deuda-uruguay',
    '/multas-de-transito-y-patente-uruguay',
    '/precio-de-la-nafta-uruguay',
    '/impuesto-autos-electricos-uruguay',
  ],
  '/oportunidades-autos-usados-uruguay': [
    '/autos-usados-uruguay',
    '/comprar-auto-con-deuda-uruguay',
    '/multas-de-transito-y-patente-uruguay',
    '/precio-de-la-nafta-uruguay',
  ],
```
If `CURATED` already has a `'/comprar-auto-con-deuda-uruguay'` key, put `'/autos-usados-uruguay'` first in its list; otherwise add:
```ts
  '/comprar-auto-con-deuda-uruguay': [
    '/autos-usados-uruguay',
    '/oportunidades-autos-usados-uruguay',
    '/multas-de-transito-y-patente-uruguay',
  ],
```

- [ ] **Step 4: Format, run the whole app unit suite and lint**

From `app/`:
```bash
npx prettier --write pages/autos-usados-uruguay pages/oportunidades-autos-usados-uruguay.vue utils/siteNav.ts utils/relatedPages.ts server/api/__sitemap__/urls.get.ts tests/unit/seoContract.test.ts
npx vitest run
npm run lint
```
Expected: whole unit suite passes and lint is clean. Investigate every failure; skip nothing.

- [ ] **Step 5: Commit**

```bash
git add app/pages/autos-usados-uruguay app/pages/oportunidades-autos-usados-uruguay.vue app/utils/siteNav.ts app/utils/relatedPages.ts app/server/api/__sitemap__/urls.get.ts app/i18n/locales/json app/tests/unit/seoContract.test.ts
git commit -m "feat(autos): precios por modelo y oportunidades en autos usados"
```

---

### Task 11: Verification, merge and deploy

**Files:** none new (fixes only).

- [ ] **Step 1: Full backend verification**

From the worktree root: `npm test && npx tsc -p tsconfig.production.json --noEmit`
Expected: all tests pass; no type errors.

- [ ] **Step 2: Render the pages in the worktree's own dev server**

From `cu-autos/app` (own `node_modules`): `npx nuxi prepare`, then start `npm run dev -- --port 3417` in the background. With Playwright open `http://localhost:3417/autos-usados-uruguay`, `/oportunidades-autos-usados-uruguay`, `/autos-usados-uruguay/ml-MLU700355317`, `/autos-usados-uruguay/precios/chevrolet-onix` at 390 px and 1440 px. Without a local catalog the APIs answer 503/404: verify each page renders its unavailable state (one H1, no horizontal overflow, no hydration errors in the console). Stop the dev server.

- [ ] **Step 3: Rebase and push to main in ONE push**

```bash
git fetch origin main
git rebase origin/main
npm test
git push origin HEAD:main
```
Conflicts in `siteNav.ts`, `AGENTS.md`, `ecosystem.config.js`, `deploy-backend.sh`, `deploy.yml` come from other sessions: keep both sides. A single push keeps the app deploy from being cancelled by a second push.

- [ ] **Step 4: Watch CI and verify production**

`gh run watch` the triggered `deploy.yml` run until both deploys finish. The backend deploy starts `currency-autos` immediately (new pm2 app with `autorestart:false` runs on start). Wait for it (30–60 min), then:
```bash
python <scratchpad>/ssh.py "pm2 describe currency-autos | grep -E 'status|restarts'; tail -n 25 /root/.pm2/logs/currency-autos-out.log"
curl -s https://cambio-uruguay.com/api/cars | head -c 400
curl -s https://cambio-uruguay.com/api/car-opportunities | head -c 400
curl -s -o /dev/null -w "%{http_code}\n" https://cambio-uruguay.com/autos-usados-uruguay
curl -s -o /dev/null -w "%{http_code}\n" https://cambio-uruguay.com/oportunidades-autos-usados-uruguay
```
Expected: the job log shows catalog/opportunity counts; both APIs return 200 JSON with items; both pages 200. Open two published opportunities and confirm they match their ML adverts.

- [ ] **Step 5: Clean up**

```bash
cd /c/Users/airau/Documents/GitHub/cambio-uruguay
git worktree remove ../cu-autos
git branch -d feat/autos-usados
```
