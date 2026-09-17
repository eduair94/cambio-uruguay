# Autos usados: fuentes adicionales, catálogo y referencia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Facebook Marketplace, Car One, Clasiautos, Julio Automóviles, Shopping de Autos, Carper and Fidocar to the used-car directory, identify every advert against an ML-based vehicle dictionary, drop cross-source duplicates, and publish ML price-guide references.

**Architecture:** One reader per published contract (`classes/autos/sources/*`) returns a `CarSourceResult`; a pure dictionary/matcher maps free text to ML brand/model ids so every source joins the same cohorts; `sync_autos.ts` orchestrates ML → webs → Facebook → dedupe → reference → analysis → publish. A separate daily job reads the ML price guide for the model-years the directory holds.

**Tech Stack:** Root TypeScript 4.9 CommonJS, mongoose/native driver (APP DB), puppeteer-core (CDP), vitest. App Nuxt 4 + Vuetify 4.

**Spec:** `docs/superpowers/specs/2026-09-17-autos-fuentes-adicionales-design.md`

## Global Constraints

- Work ONLY in `C:\Users\airau\Documents\GitHub\cu-autos-fuentes` (branch `feat/autos-fuentes`, own `node_modules`). Never run `nuxi prepare`/`npm run dev`/`nuxt build` in the shared checkout.
- TypeScript 4.9: no `satisfies`, no `matchAll` (use `RegExp.exec` loops). Tests: `npx vitest run tests/autos/<file>.test.ts`.
- App: Prettier (`semi: false`, `singleQuote`, `printWidth: 100`, `arrowParens: "avoid"`), `npx prettier --write <files>` from `app/`, `npm run lint` (typecheck is broken). App utils exports are car-prefixed.
- Local `.env` MONGODB_URI is PRODUCTION: live dry runs only as `APP_MONGO_URI= npx ts-node sync_autos.ts --dry-run ...`.
- Write/Edit decode `\uXXXX` escapes into raw characters; after writing any file with such escapes, `grep -n` and fix with Python `chr(92)`.
- Fetch other sites with `fetchText`/`fetchJson` from `classes/rentals/net.ts` (honest bot UA, per-host throttle). Facebook only through CDP on the VPS profile Chrome.
- Never publish: seller ids, seller names of private sellers, Facebook seller names (never stored), descriptions, price history, phone/emails, permalinks/pictures outside the source registry.
- Facebook budgets (spec §3): feed 80 scrolls full / 15 fast, 20 brand queries × 4 scrolls (full only), item pages ≤120 full / ≤15 fast, 6 s apart; login/checkpoint stops Facebook for the run; `AUTOS_FB_ENABLED=0` disables.
- Dedupe (spec §2.4): same brandId+modelId+year, km within max(500, 1 %), priceUsd within 3 %, different sources; priority ML(0) > webs(1) > Facebook(2).
- Currency inference (spec §3): declared currency wins; else exactly one of {USD, UYU} lands in ×0.4–×2.5 of the reference; else drop. Inferred → `currencyInferred: true`, excluded from opportunities.
- Commit after every task, Spanish Conventional Commit subject, body ends with `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

---

## File Structure

| file | responsibility |
|---|---|
| `classes/autos/types.ts` (mod) | `CarSource`, `CarSourceResult`, new optional raw fields, `CarReference` |
| `classes/autos/publicTypes.ts` + `app/utils/carsPublic.ts` (mod) | wire contract v2 fields |
| `classes/autos/sources/registry.ts` (new) | per-source name, key prefix, permalink/picture rules, priority, dealer name |
| `classes/autos/catalog/dictionary.ts` (new) | ML-id dictionary of brands/models/trims + aliases |
| `classes/autos/catalog/match.ts` (new) | text → brand/model/year/km/transmission/fuel/declared currency |
| `classes/autos/catalog/guide.ts` (new) | ML price-guide year-page parser, target planner, crawler |
| `classes/autos/sources/woo.ts` (new) | WooCommerce Store API (Shopping de Autos, Carper) |
| `classes/autos/sources/wordpress.ts` (new) | Listivo (Clasiautos) and Vehica (Julio) REST |
| `classes/autos/sources/fenicio.ts` (new) | Fidocar sitemap + PDP |
| `classes/autos/sources/carone.ts` (new) | Car One listing HTML |
| `classes/autos/sources/facebook.ts` (new) | GraphQL parsing, currency inference, card→car, CDP reader |
| `classes/autos/sources/common.ts` (new) | shared helpers for web sources (html text, money, synthesized detail) |
| `classes/autos/dedupe.ts` (new) | cross-source duplicates, reference attach |
| `classes/autos/{enrich,analyze,market,project,store}.ts` (mod) | multi-source support |
| `classes/models/CarFbCard.ts`, `CarGuideEntry.ts` (new) | private APP DB models |
| `sync_autos.ts` (mod), `sync_autos_guide.ts` (new) | orchestration, guide job |
| `ecosystem.config.js`, `scripts/deploy-backend.sh` (mod) | `currency-autos-guide` |
| `app/utils/cars.ts`, `app/server/utils/cars.ts`, `app/server/api/cars/*` (mod) | source filter, rows, guide |
| `app/components/cars/*.vue`, `app/pages/autos-usados-uruguay/**`, `app/pages/oportunidades-autos-usados-uruguay.vue` (mod) | UI |
| `tests/autos/fixtures/*` (new) | real trimmed payloads from 2026-09-17 |
| `docs/app/AUTOS.md`, `AGENTS.md`, `classes/AGENTS.md` (mod) | docs |

---

### Task 1: Multi-source data model and wire contract

**Files:**
- Create: `classes/autos/sources/registry.ts`, `tests/autos/registry.test.ts`
- Modify: `classes/autos/types.ts`, `classes/autos/publicTypes.ts`, `app/utils/carsPublic.ts`, `classes/autos/enrich.ts`, `classes/autos/analyze.ts`, `classes/autos/project.ts`, `classes/autos/market.ts`, `classes/autos/store.ts`, `sync_autos.ts`, `tests/autos/{project,analyze,market,store,normalize}.test.ts`

**Interfaces — Produces:**
```ts
// types.ts
export type CarSource = "mercadolibre" | "facebook" | "clasiautos" | "julio" | "shoppingdeautos" | "carper" | "fidocar" | "carone";
export interface RawCarListing { /* existing */ source: CarSource; specText?: string | null; dealerName?: string | null; currencyInferred?: boolean }
export interface CarReference { priceUsd: number; basis: "version" | "year"; updatedAt: string }
export interface CarListing { /* existing */ sourceName: string; reference: CarReference | null }
export interface CarSourceResult { source: CarSource; ok: boolean; complete: boolean; listings: RawCarListing[]; details: Map<string, CarDetail>; requests: number; note: string | null; startedAt: string; finishedAt: string }
// registry.ts
export interface CarSourceInfo { source: CarSource; name: string; prefix: string; permalink: RegExp; pictureHost: RegExp; priority: number; dealerName: string | null }
export const CAR_SOURCES: Readonly<Record<CarSource, CarSourceInfo>>;
export const CAR_SOURCE_LIST: readonly CarSource[];
export function carKeyFor(source: CarSource, id: string): string;
export function safeSourcePermalink(source: CarSource, url: string): string | null;
export function safeSourcePicture(source: CarSource, url: string | null): string | null;
// enrich.ts
export function carKey(id: string, source?: CarSource): string; // default mercadolibre, delegates to carKeyFor
// publicTypes.ts additions
export type PublicCarSource = CarSource-equivalent union
PublicCarListing += source, sourceName, currencyInferred, reference: { priceUsd: number; basis: "version" | "year"; updatedAt: string } | null
PublicCarComparable += source, sourceName
PublicCarSourceCoverage { source; name; listings; duplicates; lastReadAt: string | null; ok: boolean }
PublicCarCatalogMeta += sources: PublicCarSourceCoverage[]
PublicCarGuideYear { year; averageUsd: number | null; versions: { name: string; priceUsd: number }[] }
PublicCarMarketSnapshot += guide: PublicCarGuideYear[]; guideUpdatedAt: string | null
PublicCarOpportunitySnapshot.algorithm: "car-cohort-v2"
```

- [ ] **Step 1: Write the failing registry test** (`tests/autos/registry.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { CAR_SOURCES, CAR_SOURCE_LIST, carKeyFor, safeSourcePermalink, safeSourcePicture } from "../../classes/autos/sources/registry";

describe("car source registry", () => {
  it("builds keys with one prefix per source", () => {
    expect(carKeyFor("mercadolibre", "MLU1")).toBe("ml-MLU1");
    expect(carKeyFor("facebook", "1268374875382121")).toBe("fb-1268374875382121");
    expect(carKeyFor("shoppingdeautos", "153528")).toBe("sda-153528");
    expect(new Set(CAR_SOURCE_LIST.map(source => CAR_SOURCES[source].prefix)).size).toBe(CAR_SOURCE_LIST.length);
  });
  it("accepts only each source's own permalinks", () => {
    expect(safeSourcePermalink("facebook", "https://www.facebook.com/marketplace/item/1268374875382121/")).not.toBeNull();
    expect(safeSourcePermalink("facebook", "https://www.facebook.com/profile.php?id=1")).toBeNull();
    expect(safeSourcePermalink("clasiautos", "https://clasiautos.uy/avisos/toyota-corolla/")).not.toBeNull();
    expect(safeSourcePermalink("clasiautos", "https://auto.mercadolibre.com.uy/MLU-1")).toBeNull();
    expect(safeSourcePermalink("carone", "https://carone.com.uy/chevrolet-nuevo-onix-10-joy-mt-sku4-717444")).not.toBeNull();
    expect(safeSourcePermalink("carone", "http://carone.com.uy/x")).toBeNull();
  });
  it("accepts only each source's picture hosts over https without credentials", () => {
    expect(safeSourcePicture("facebook", "https://scontent-yyz1-1.xx.fbcdn.net/v/t39/x.jpg?stp=1")).not.toBeNull();
    expect(safeSourcePicture("facebook", "https://evil.example/x.jpg")).toBeNull();
    expect(safeSourcePicture("fidocar", "https://f.fcdn.app/imgs/x.jpg")).not.toBeNull();
    expect(safeSourcePicture("carone", "https://cdn.impel.io/swipetospin-viewers/carone/1/thumb-lg.jpg")).not.toBeNull();
    expect(safeSourcePicture("mercadolibre", "https://user:pw@http2.mlstatic.com/D_1.webp")).toBeNull();
    expect(safeSourcePicture("julio", null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it — expect FAIL (module missing)**

Run: `npx vitest run tests/autos/registry.test.ts`

- [ ] **Step 3: Implement `classes/autos/sources/registry.ts`**

```ts
// One row per source: how its keys look and which URLs of it may ever be published.
import type { CarSource } from "../types";

export interface CarSourceInfo {
  source: CarSource;
  name: string;
  prefix: string;
  permalink: RegExp;
  pictureHost: RegExp;
  /** Lower wins a cross-source duplicate. */
  priority: number;
  /** Commercial name shown as the seller for a dealer's own website. */
  dealerName: string | null;
}

export const CAR_SOURCES: Readonly<Record<CarSource, CarSourceInfo>> = {
  mercadolibre: { source: "mercadolibre", name: "Mercado Libre", prefix: "ml", permalink: /^https:\/\/auto\.mercadolibre\.com\.uy\/MLU-/, pictureHost: /^http2\.mlstatic\.com$/, priority: 0, dealerName: null },
  clasiautos: { source: "clasiautos", name: "Clasiautos", prefix: "clasiautos", permalink: /^https:\/\/clasiautos\.uy\/avisos\/[\w%-]+\/?$/, pictureHost: /^clasiautos\.uy$/, priority: 1, dealerName: null },
  julio: { source: "julio", name: "Julio Automóviles", prefix: "julio", permalink: /^https:\/\/julioautomoviles\.com\.uy\/vehiculo\/[\w%-]+\/?$/, pictureHost: /^julioautomoviles\.com\.uy$/, priority: 1, dealerName: "Julio Automóviles" },
  shoppingdeautos: { source: "shoppingdeautos", name: "Shopping de Autos", prefix: "sda", permalink: /^https:\/\/shoppingdeautos\.uy\/producto\/[\w%-]+\/?$/, pictureHost: /^shoppingdeautos\.uy$/, priority: 1, dealerName: "Shopping de Autos" },
  carper: { source: "carper", name: "Carper", prefix: "carper", permalink: /^https:\/\/usados\.carper\.com\.uy\/[\w%/-]+$/, pictureHost: /^usados\.carper\.com\.uy$/, priority: 1, dealerName: "Carper" },
  fidocar: { source: "fidocar", name: "Usados Fidocar", prefix: "fidocar", permalink: /^https:\/\/www\.usadosfidocar\.com\.uy\/modelo\/[\w%-]+$/, pictureHost: /^f\.fcdn\.app$/, priority: 1, dealerName: "Usados Fidocar" },
  carone: { source: "carone", name: "Car One", prefix: "carone", permalink: /^https:\/\/carone\.com\.uy\/[\w%-]+$/, pictureHost: /^cdn\.impel\.io$/, priority: 1, dealerName: "Car One" },
  facebook: { source: "facebook", name: "Facebook Marketplace", prefix: "fb", permalink: /^https:\/\/www\.facebook\.com\/marketplace\/item\/\d{6,20}\/$/, pictureHost: /^scontent[\w.-]*\.fbcdn\.net$/, priority: 2, dealerName: null },
};

export const CAR_SOURCE_LIST = Object.keys(CAR_SOURCES) as CarSource[];

export const carKeyFor = (source: CarSource, id: string): string => `${CAR_SOURCES[source].prefix}-${id}`;

export function safeSourcePermalink(source: CarSource, url: string): string | null {
  return CAR_SOURCES[source]?.permalink.test(String(url || "")) ? url : null;
}

export function safeSourcePicture(source: CarSource, url: string | null): string | null {
  try {
    const parsed = new URL(String(url || ""));
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && CAR_SOURCES[source].pictureHost.test(parsed.host)
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Types + contract.** Add to `types.ts` the `CarSource` union, widen `RawCarListing.source` to `CarSource`, add optional `specText`, `dealerName`, `currencyInferred`, `CarReference`, `CarListing.sourceName`/`reference`, and `CarSourceResult` (exact shapes above). In `publicTypes.ts` add `PublicCarSource` (same 8 literals), the listing/comparable/meta/market fields above and change `algorithm` to `"car-cohort-v2"`. Copy the file to `app/utils/carsPublic.ts` (keep its header comment) and run `npx prettier --write utils/carsPublic.ts` from `app/`.

- [ ] **Step 5: enrich/analyze/market/project/store/sync.**
  - `enrich.ts`: `carKey(id, source = "mercadolibre")` → `carKeyFor(source, id)`; `enrichCarListing` uses `raw.source` for the key, derives engine/trim from `` `${raw.title} ${raw.specText ?? ""}` ``, sets `sourceName: CAR_SOURCES[raw.source].name`, `reference: null`, and keeps `currencyInferred` from raw.
  - `analyze.ts`: `exclusionReason` returns `"currency_inferred"` right after `not_usd` when `listing.currencyInferred`.
  - `market.ts`: snapshots get `guide: []`, `guideUpdatedAt: null`; the clean filter also drops `currencyInferred`.
  - `project.ts`: `publicCarListing` rejects when `safeSourcePermalink(listing.source, listing.permalink)` is null; `picture: safeSourcePicture(listing.source, listing.picture)`; `dealerName` = `cleanPublicText(listing.dealerName)` when set, else the old ML detail rule; adds `source`, `sourceName`, `currencyInferred: !!listing.currencyInferred`, `reference` copy. Comparables keep only rows with a safe permalink for their own source and add `source`/`sourceName`. `buildCarCatalog` takes `context.sources: PublicCarSourceCoverage[]` and writes it to meta. Snapshot algorithm `"car-cohort-v2"`.
  - `store.ts`: `saveCarHarvest` uses `carKey(listing.id, listing.source)` and adds `"listing.source": "mercadolibre"` to the retirement query (a web advert shares ML brand ids and must never be retired by an ML sweep).
  - `sync_autos.ts`: `storedFromHarvest` uses `carKey(listing.id, listing.source)`; `buildCarCatalog(..., { ..., sources: [] })` until Task 8.

- [ ] **Step 6: Update existing tests.** `project.test.ts`: fixture `car()` gains `sourceName: "Mercado Libre", reference: null`; the key list gains `currencyInferred`, `reference`, `source`, `sourceName`; add:

```ts
  it("publishes a web source's own permalink, picture and dealer name", () => {
    const row = publicCarListing(car({
      id: "15715", source: "clasiautos", key: "clasiautos-15715", sourceName: "Clasiautos",
      permalink: "https://clasiautos.uy/avisos/toyota-corolla-le/", picture: "https://clasiautos.uy/wp-content/uploads/a.jpg",
      dealerName: "Autos Pepe 099 123 456", detail: null,
    }), null)!;
    expect(row).toMatchObject({ source: "clasiautos", sourceName: "Clasiautos", dealerName: "Autos Pepe", picture: "https://clasiautos.uy/wp-content/uploads/a.jpg" });
    expect(publicCarListing(car({ source: "clasiautos", permalink: "https://auto.mercadolibre.com.uy/MLU-1" }), null)).toBeNull();
  });
```
`analyze.test.ts`: add `expect(exclusionReason(listing({ currencyInferred: true }), NOW)).toBe("currency_inferred")` (use the file's existing fixture helper name). `store.test.ts`: if it asserts the retirement filter, add `"listing.source": "mercadolibre"`. `buildCarCatalog` callers pass `sources: []`.

- [ ] **Step 7: Run** `npx vitest run tests/autos` and `npx tsc -p tsconfig.production.json --noEmit` (only the known `sheet_key.json` error allowed). Expected: PASS.

- [ ] **Step 8: Commit** `feat(autos): modelo de datos multi-fuente y contrato público v2`

---

### Task 2: Vehicle dictionary and text matcher

**Files:**
- Create: `classes/autos/catalog/dictionary.ts`, `classes/autos/catalog/match.ts`, `tests/autos/match.test.ts`

**Interfaces — Consumes:** `fold`, `slugify`, `wordText`, `fuelOf`, `transmissionOf` (normalize.ts), `CarModelVocabulary`, `RawCarListing`.
**Produces:**
```ts
export interface CarDictionaryBrand { brandId: string; brand: string; slug: string; aliases: string[] }
export interface CarDictionaryModel { brandId: string; modelId: string; brand: string; model: string; slug: string; names: string[]; trims: string[] }
export interface CarDictionary { brands: CarDictionaryBrand[]; models: CarDictionaryModel[] }
export function buildCarDictionary(listings: readonly Pick<RawCarListing, "source" | "brandId" | "brand" | "modelId" | "model">[], vocabularies: readonly CarModelVocabulary[]): CarDictionary;
export interface CarMatch { brandId: string; brand: string; modelId: string; model: string; year: number | null; km: number | null; transmission: CarTransmission | null; fuel: CarFuel | null; declaredCurrency: CarCurrency | null; isNew: boolean }
export interface CarMatchHints { brand?: string | null; model?: string | null; year?: number | null; km?: number | null }
export function matchCar(text: string, dictionary: CarDictionary, hints: CarMatchHints, maxYear: number): CarMatch | null;
export function yearFromText(text: string, maxYear: number): number | null;
export function kmFromText(text: string): number | null;
export function declaredCurrencyOf(text: string): CarCurrency | null;
/** A currency marker glued to THIS amount ("U$S 4.000", "4 mil dólares"); "debe 52 mil pesos" says nothing about a 4,000 price. */
export function declaredCurrencyFor(text: string, amount: number): CarCurrency | null;
export function versionTransmission(text: string): CarTransmission | null;
export function engineFromCc(value: string): string | null;
```

Rules:
- Dictionary from ML rows only (`source === "mercadolibre"`), first name seen per id; brand slug = `slugify(brand)`; brand aliases from `BRAND_ALIASES` (`volkswagen: ["vw","volks"]`, `chevrolet: ["chevy"]`, `mercedes-benz: ["mercedes","mercedes benz","mb"]`, `citroen: ["citroen"]`, `peugeot: ["peugot"]`, `hyundai: ["hyunday","hiunday"]`, `land-rover: ["landrover"]`, `great-wall: ["great wall"]`) plus the brand name itself. Model `names` = model name, the name with separators removed (`"cr-v"` → `"crv"`) and `MODEL_ALIASES` (`corolla: ["corola"]`, `onix: ["onyx"]`, `hb20: ["hb 20"]`). Trims from vocabularies.
- Matching works on `wordText(text)` padded with spaces. Brand: hint (slug equality or alias equality) first, else longest brand name/alias found as whole words. Model: candidates = brand's models (or all models when no brand). A model name matches as whole words; a purely numeric name (`208`, `3008`) only matches when the brand is known. Longest match wins. Hint model: exact slug equality first, then the hint text is searched like free text. With no brand and the best length shared by models of different brands → `null`. No model → `null`.
- `yearFromText`: 4-digit 1950..maxYear not followed by `km`/`cc`/`.`digit; if several distinct, one adjacent to `año|ano|modelo|mod` wins, else the one appearing first after the model… keep it simple: distinct years > 1 without an `año` anchor → `null`. Two digits after `del|año|ano|mod|modelo` (`del 99` → 1999, `año 08` → 2008; > maxYear%100 → 19xx).
- `kmFromText`: `(\d{1,3}(?:[.,]\d{3})+|\d{1,7})\s*(?:km|kms|kilometros)\b` → integer; `(\d{1,3}(?:[.,]\d)?)\s*mil\s*(?:km|kms|kilometros)` → ×1000; returns the first.
- `declaredCurrencyFor(text, amount)`: every `marker ⟷ number` pair (marker before or after, number with dots/commas or `N mil`) whose number is within 1 % of `amount`; all such pairs agree → that currency; none or disagreeing → `null`.
- `declaredCurrencyOf`: USD markers `u$s|us$|usd|u$d|dolares`; UYU markers `$u|uyu|pesos uruguayos|\bpesos\b`; both or none → `null`. Run on folded text (dollar sign kept).
- `versionTransmission`: `\b(mt|m/t|manual)\b` → manual, `\b(at|a/t|cvt|dsg|automatica|automatico|aut)\b` → automatica; only used on dealer version lines.
- `engineFromCc("1600cc" | "1.6" | "1400" | "3,5")` → `"1.6" | "1.6" | "1.4" | "3.5"`; invalid → null.
- `matchCar` fills year/km from hints first, else text; `transmission = transmissionOf(text) ?? (dsg|tiptronic → automatica)`; `fuel = fuelOf(text)`; `isNew` = `/\b0\s?km\b/` or `\bnuevo\b` adjacent to `0km`… use: km === 0 or `/\b0 ?km\b/`.

- [ ] **Step 1: Write the failing tests** (`tests/autos/match.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { buildCarDictionary } from "../../classes/autos/catalog/dictionary";
import { declaredCurrencyFor, declaredCurrencyOf, engineFromCc, kmFromText, matchCar, versionTransmission, yearFromText } from "../../classes/autos/catalog/match";

const ml = (brandId: string, brand: string, modelId: string, model: string) => ({ source: "mercadolibre" as const, brandId, brand, modelId, model });
const DICT = buildCarDictionary([
  ml("60297", "Toyota", "60315", "Corolla"), ml("60297", "Toyota", "60318", "Corolla Cross"), ml("60297", "Toyota", "60320", "Hilux"),
  ml("67781", "Chevrolet", "67800", "Aveo"), ml("67781", "Chevrolet", "67801", "Onix"), ml("60249", "Volkswagen", "60260", "Golf"),
  ml("60249", "Volkswagen", "60261", "Gol"), ml("60279", "Peugeot", "60280", "208"), ml("60279", "Peugeot", "60281", "2008"),
  ml("60300", "Hyundai", "60301", "Creta"), ml("60310", "Fiat", "60311", "Uno"), ml("60330", "Honda", "60331", "CR-V"),
  { source: "facebook" as const, brandId: "x-foo", brand: "Foo", modelId: "x-bar", model: "Bar" },
], [{ brandId: "60297", modelId: "60315", trims: ["LE", "XEI"] }]);
const MAX = 2027;

describe("buildCarDictionary", () => {
  it("keeps ML ids only and carries trims", () => {
    expect(DICT.brands.find(brand => brand.slug === "foo")).toBeUndefined();
    expect(DICT.models.find(model => model.modelId === "60315")!.trims).toEqual(["LE", "XEI"]);
    expect(DICT.brands.find(brand => brand.slug === "volkswagen")!.aliases).toContain("vw");
  });
});

describe("matchCar", () => {
  it("prefers the longest model name", () => {
    expect(matchCar("2022 Toyota corolla cross xei hybrid", DICT, {}, MAX)).toMatchObject({ modelId: "60318", year: 2022 });
    expect(matchCar("TOYOTA COROLLA 2.0 DIÉSEL", DICT, {}, MAX)).toMatchObject({ modelId: "60315", year: null });
  });
  it("finds the brand from the model when the title omits it", () => {
    expect(matchCar("golf tsi 2016", DICT, {}, MAX)).toMatchObject({ brandId: "60249", modelId: "60260", year: 2016 });
    expect(matchCar("Vendo+gol+", DICT, {}, MAX)).toMatchObject({ modelId: "60261" });
  });
  it("understands aliases and misspellings", () => {
    expect(matchCar("VW Gol 1.6 2012", DICT, {}, MAX)).toMatchObject({ brandId: "60249", modelId: "60261" });
    expect(matchCar("2015 Toyota corola+", DICT, {}, MAX)).toMatchObject({ modelId: "60315", year: 2015 });
    expect(matchCar("Honda CRV 2010", DICT, {}, MAX)).toMatchObject({ modelId: "60331" });
  });
  it("matches numeric models only with their brand", () => {
    expect(matchCar("Peugeot 2008 Allure 2019", DICT, {}, MAX)).toMatchObject({ modelId: "60281", year: 2019 });
    expect(matchCar("vendo 208 impecable", DICT, {}, MAX)).toBeNull();
  });
  it("gives up on titles that name no car", () => {
    expect(matchCar("Vendo o permuto", DICT, {}, MAX)).toBeNull();
    expect(matchCar("Venta de repuestos de todas las marcas", DICT, {}, MAX)).toBeNull();
  });
  it("uses structured hints before the text", () => {
    expect(matchCar("NISSAN KICKS EXCLUSIVE 2023", DICT, { brand: "TOYOTA", model: "COROLLA", year: 2021, km: 5_000 }, MAX))
      .toMatchObject({ modelId: "60315", year: 2021, km: 5_000 });
    expect(matchCar("UNO ATTRACTIVE", DICT, { brand: "fiat", model: "uno-attractive" }, MAX)).toMatchObject({ modelId: "60311" });
  });
  it("reads km, gearbox, fuel and declared currency from prose", () => {
    const hit = matchCar("Golf 1.4t año 2016 ✅Caja automática DSG ✅95000km nafta U$S 22.500", DICT, {}, MAX)!;
    expect(hit).toMatchObject({ year: 2016, km: 95_000, transmission: "automatica", fuel: "nafta", declaredCurrency: "USD" });
  });
});

describe("text helpers", () => {
  it("reads years", () => {
    expect(yearFromText("Saveiro del 99 nafta", MAX)).toBe(1999);
    expect(yearFromText("Corolla 1.8 2014 extra full", MAX)).toBe(2014);
    expect(yearFromText("modelo 2019 igual al 2021", MAX)).toBe(2019);
    expect(yearFromText("2019 o 2021", MAX)).toBeNull();
    expect(yearFromText("motor 1600 cc", MAX)).toBeNull();
  });
  it("reads km", () => {
    expect(kmFromText("250,000km")).toBe(250_000);
    expect(kmFromText("180 mil kilómetros")).toBe(180_000);
    expect(kmFromText("70.000km 2023")).toBe(70_000);
    expect(kmFromText("0 km")).toBe(0);
    expect(kmFromText("consumo 14 km por litro")).toBe(14);
  });
  it("reads declared currencies", () => {
    expect(declaredCurrencyOf("U$S 15,000")).toBe("USD");
    expect(declaredCurrencyOf("Debe 52 mil pesos")).toBe("UYU");
    expect(declaredCurrencyOf("$U 450.000")).toBe("UYU");
    expect(declaredCurrencyOf("USD 5000 o su equivalente en pesos")).toBeNull();
    expect(declaredCurrencyOf("impecable")).toBeNull();
  });
  it("reads a currency only when it is attached to the asked amount", () => {
    expect(declaredCurrencyFor("Debe 52 mil pesos con titulos", 4_000)).toBeNull();
    expect(declaredCurrencyFor("vendo U$S 4.000 o permuto", 4_000)).toBe("USD");
    expect(declaredCurrencyFor("precio 4 mil dólares", 4_000)).toBe("USD");
    expect(declaredCurrencyFor("$U 180.000 negociable", 180_000)).toBe("UYU");
    expect(declaredCurrencyFor("4000 pesos de deuda, pido 4000 dolares", 4_000)).toBeNull();
  });
  it("reads dealer version gearboxes and engine sizes", () => {
    expect(versionTransmission("NUEVO ONIX 1.0 JOY MT")).toBe("manual");
    expect(versionTransmission("NEW CS35 PLUS 1.4T 5P AT")).toBe("automatica");
    expect(versionTransmission("SWIFT 1.2 GLS MHEV")).toBeNull();
    expect(engineFromCc("1600cc")).toBe("1.6");
    expect(engineFromCc("1400")).toBe("1.4");
    expect(engineFromCc("3,5")).toBe("3.5");
    expect(engineFromCc("abc")).toBeNull();
  });
});
```

Note: `kmFromText("consumo 14 km por litro")` returns 14 on purpose — callers treat km < 1000 through `kmQuality` (placeholder), never as a real reading.

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement both files per the rules above.**
- [ ] **Step 4: Run — expect PASS.** Also run against the 16,301 real titles in the scratchpad snapshot (`autos-harvest-run2.json`): a throwaway script prints the share of ML titles whose `matchCar(title)` agrees with the card's own `modelId` (expect ≥ 90 %; investigate disagreements before continuing).
- [ ] **Step 5: Commit** `feat(autos): diccionario de marcas y modelos y reconocedor de avisos`

### Task 3: ML price guide (parser, planner, crawler, job)

**Files:**
- Create: `classes/autos/catalog/guide.ts`, `classes/models/CarGuideEntry.ts`, `sync_autos_guide.ts`, `tests/autos/guide.test.ts`, `tests/autos/fixtures/guide-toyota-hilux-2018.html`
- Modify: `classes/autos/store.ts` (guide I/O), `ecosystem.config.js`, `scripts/deploy-backend.sh`

**Interfaces — Produces:**
```ts
export interface CarGuideVersion { name: string; slug: string; priceUsd: number }
export interface CarGuideEntry { key: string; brandSlug: string; modelSlug: string; year: number; status: "ok" | "missing" | "failed"; averageUsd: number | null; versions: CarGuideVersion[]; updatedLabel: string | null; fetchedAt: string }
export interface CarGuideTarget { brandSlug: string; modelSlug: string; year: number; listings: number }
export const guideKey: (brandSlug: string, modelSlug: string, year: number) => string; // "toyota|hilux|2018"
export function guideYearUrl(target: Pick<CarGuideTarget, "brandSlug" | "modelSlug" | "year">): string; // https://www.mercadolibre.com.uy/precios-autos/toyota/hilux/2018/
export function parseGuideYearPage(html: string, target: Pick<CarGuideTarget, "brandSlug" | "modelSlug" | "year">): { averageUsd: number | null; updatedLabel: string | null; versions: CarGuideVersion[] } | null;
export function planGuideTargets(targets: readonly CarGuideTarget[], previous: ReadonlyMap<string, Pick<CarGuideEntry, "status" | "fetchedAt">>, now: Date): CarGuideTarget[];
export async function crawlGuide(targets: readonly CarGuideTarget[], options: { maxDurationMs: number; gapMs: number; fetchPage?: (url: string) => Promise<{ status: number; body: string } | null>; sleep?: (ms: number) => Promise<void>; now?: () => Date }): Promise<{ entries: CarGuideEntry[]; requests: number; note: string | null }>;
export function referenceFor(listing: Pick<CarListing, "brandSlug" | "modelSlug" | "year" | "trimLabel">, guide: ReadonlyMap<string, CarGuideEntry>): CarReference | null;
export function guideYearsFor(brandSlug: string, modelSlug: string, guide: ReadonlyMap<string, CarGuideEntry>): { guide: PublicCarGuideYear[]; guideUpdatedAt: string | null };
// store.ts
export async function loadGuideEntries(): Promise<Map<string, CarGuideEntry>>;
export async function saveGuideEntries(entries: readonly CarGuideEntry[]): Promise<void>;
export async function loadGuideTargets(now: Date): Promise<CarGuideTarget[]>; // from carlistings fresh 21 d, grouped by brand/model slug + year
```

Rules: the price in the page is written `$ 30,897` and is US$ (it equals our own median); parse digits only. Planner order: never-fetched first by `listings` desc; then `ok` entries older than 7 days and `failed` older than 1 day by age; `missing` retried after 30 days; everything else skipped. Crawler: sequential, `gapMs` between requests, stops at `maxDurationMs` (`note: "presupuesto agotado"`); HTTP 404 → `missing`; other non-200 or unparsable → `failed`; three failures in a row → stop (`note: "la guía no responde"`). `referenceFor`: entry `ok` → version whose `slugify(name)` ends with `-${slugify(trimLabel)}` (names are "Toyota Hilux 2018 Srv") → `basis: "version"`; else `averageUsd` → `basis: "year"`; `updatedAt = fetchedAt`. `guideYearsFor`: `ok` entries of that model sorted by year desc, versions renamed to the bare version (strip the "Brand Model Year " prefix), max 40 years.

- [ ] **Step 1: Save the fixture.** From the scratchpad `mlp_hilux18.html`, keep the `seo-landing-average-price-component` block and the versions `<table>` (Python slice between `<h1>Precio promedio` −400 chars and the closing `</table>` after `seo-landing-versions-price__link`), write it to `tests/autos/fixtures/guide-toyota-hilux-2018.html`.

- [ ] **Step 2: Write the failing test** (`tests/autos/guide.test.ts`)

```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { crawlGuide, guideKey, guideYearUrl, guideYearsFor, parseGuideYearPage, planGuideTargets, referenceFor, type CarGuideEntry } from "../../classes/autos/catalog/guide";

const HTML = fs.readFileSync(path.join(__dirname, "fixtures", "guide-toyota-hilux-2018.html"), "utf8");
const HILUX = { brandSlug: "toyota", modelSlug: "hilux", year: 2018 };
const NOW = new Date("2026-09-17T12:00:00Z");

describe("parseGuideYearPage", () => {
  it("reads the average and every version price", () => {
    const page = parseGuideYearPage(HTML, HILUX)!;
    expect(page.averageUsd).toBe(30_897);
    expect(page.updatedLabel).toBe("16 sep., 2026");
    expect(page.versions).toEqual([
      { name: "Toyota Hilux 2018 Srv", slug: "srv", priceUsd: 27_200 },
      { name: "Toyota Hilux 2018 Dx", slug: "dx", priceUsd: 32_990 },
      { name: "Toyota Hilux 2018 Sr", slug: "sr", priceUsd: 32_500 },
    ]);
  });
  it("ignores version links of another model-year and pages without a price", () => {
    expect(parseGuideYearPage(HTML, { ...HILUX, year: 2019 })!.versions).toEqual([]);
    expect(parseGuideYearPage("<html>nada</html>", HILUX)).toBeNull();
  });
  it("builds the public URL", () => {
    expect(guideYearUrl(HILUX)).toBe("https://www.mercadolibre.com.uy/precios-autos/toyota/hilux/2018/");
  });
});

const entry = (overrides: Partial<CarGuideEntry>): CarGuideEntry => ({
  key: guideKey("toyota", "hilux", 2018), ...HILUX, status: "ok", averageUsd: 30_897, updatedLabel: null,
  versions: [{ name: "Toyota Hilux 2018 Srv", slug: "srv", priceUsd: 27_200 }], fetchedAt: "2026-09-16T00:00:00Z", ...overrides,
});

describe("planGuideTargets", () => {
  it("reads new model-years first, then stale ones, and waits on missing pages", () => {
    const targets = [
      { brandSlug: "toyota", modelSlug: "hilux", year: 2018, listings: 40 },
      { brandSlug: "fiat", modelSlug: "uno", year: 2010, listings: 5 },
      { brandSlug: "fiat", modelSlug: "uno", year: 2011, listings: 50 },
      { brandSlug: "kia", modelSlug: "rio", year: 2015, listings: 9 },
    ];
    const previous = new Map([
      ["toyota|hilux|2018", { status: "ok" as const, fetchedAt: "2026-09-01T00:00:00Z" }],
      ["kia|rio|2015", { status: "missing" as const, fetchedAt: "2026-09-10T00:00:00Z" }],
    ]);
    expect(planGuideTargets(targets, previous, NOW).map(target => `${target.modelSlug}${target.year}`)).toEqual(["uno2011", "uno2010", "hilux2018"]);
  });
});

describe("crawlGuide", () => {
  it("marks 404 as missing, stops after three failures in a row and respects the gap", async () => {
    const statuses = [404, 200, 500, 500, 500, 200];
    const sleeps: number[] = [];
    const targets = statuses.map((_, index) => ({ brandSlug: "b", modelSlug: "m", year: 2000 + index, listings: 1 }));
    const result = await crawlGuide(targets, {
      maxDurationMs: 60_000, gapMs: 1_500, now: () => NOW,
      sleep: async ms => { sleeps.push(ms); },
      fetchPage: async url => {
        const index = Number(/\/(\d{4})\/$/.exec(url)![1]) - 2000;
        return { status: statuses[index]!, body: statuses[index] === 200 ? HTML.split("hilux/2018").join(`m/${2000 + index}`).split("toyota").join("b") : "" };
      },
    });
    expect(result.entries.map(item => item.status)).toEqual(["missing", "ok", "failed", "failed", "failed"]);
    expect(result.requests).toBe(5);
    expect(result.note).toBe("la guía no responde");
    expect(sleeps.every(ms => ms === 1_500)).toBe(true);
  });
});

describe("references", () => {
  const guide = new Map([[guideKey("toyota", "hilux", 2018), entry({})]]);
  it("prefers the version price and falls back to the year average", () => {
    expect(referenceFor({ ...HILUX, trimLabel: "SRV" }, guide)).toEqual({ priceUsd: 27_200, basis: "version", updatedAt: "2026-09-16T00:00:00Z" });
    expect(referenceFor({ ...HILUX, trimLabel: "Dx" }, guide)).toEqual({ priceUsd: 30_897, basis: "year", updatedAt: "2026-09-16T00:00:00Z" });
    expect(referenceFor({ ...HILUX, year: 2017, trimLabel: null }, guide)).toBeNull();
    expect(referenceFor({ ...HILUX, trimLabel: null }, new Map([[guideKey("toyota", "hilux", 2018), entry({ status: "missing", averageUsd: null })]]))).toBeNull();
  });
  it("lists the model's guide rows with bare version names", () => {
    expect(guideYearsFor("toyota", "hilux", guide)).toEqual({
      guide: [{ year: 2018, averageUsd: 30_897, versions: [{ name: "Srv", priceUsd: 27_200 }] }],
      guideUpdatedAt: "2026-09-16T00:00:00Z",
    });
  });
});
```

- [ ] **Step 3: Run — FAIL. Step 4: implement `guide.ts`** (regexes: average `/seo-landing-average-price-component__price-amount">\s*\$\s*([\d.,]+)/`, date `/seo-landing-average-price-component__date">\s*Actualizado el\s*([^<]+)</`, rows `/<a class="seo-landing-versions-price__link" href="\/precios-autos\/([\w-]+)\/([\w-]+)\/(\d{4})\/([\w-]+)\/">([^<]+)<\/a>[\s\S]*?andes-table__column--value"[^>]*>\s*\$\s*([\d.,]+)/g`; keep rows whose brand/model/year equal the target; `null` when neither average nor versions). `fetchPage` default uses global `fetch` with `AUTOS_USER_AGENT` and a 20 s `AbortController` timeout, returning `{status, body}` or `null` on network error (counts as failed).
- [ ] **Step 5: `CarGuideEntry` model** (`classes/models/CarGuideEntry.ts`, collection `carguideentries`, same `appModel` pattern as `CarHarvestMeta.ts`; fields of `CarGuideEntry`, unique index on `key`). Store I/O in `store.ts`: `saveGuideEntries` = bulk `replaceOne` upserts by key; `loadGuideEntries` = all docs without `_id`; `loadGuideTargets` = aggregate on `carlistings` (`lastSeen` ≥ now−21 d, `retiredAt: null`) grouping `listing.brand`, `listing.model`, `listing.year` → slugs via `slugify` in JS, summing counts per (brandSlug, modelSlug, year).
- [ ] **Step 6: `sync_autos_guide.ts`** — dotenv, refuse without `APP_MONGO_URI` unless `--dry-run --targets=<json file>`; `planGuideTargets` → `crawlGuide({ maxDurationMs: Number(process.env.AUTOS_GUIDE_MINUTES || 40) * 60_000, gapMs: Number(process.env.AUTOS_GUIDE_GAP_MS || 1_500) })` → `saveGuideEntries` → `CarHarvestMetaModel.updateOne({ key: "uy-cars-guide" }, { data: { requests, entries, ok, note, finishedAt } })`; logs `[autos-guide] …`; closes the app connection; exit code 1 on throw.
- [ ] **Step 7: pm2.** `ecosystem.config.js` after `currency-autos-hourly`:
```js
    {
      // ML price guide for the model-years the directory holds (catalog + second opinion).
      name: "currency-autos-guide",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_autos_guide.js",
      cron_restart: "13 5 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```
Add `currency-autos-guide` after `currency-autos-hourly` in `OTHER_APPS` of `scripts/deploy-backend.sh`.
- [ ] **Step 8: Run** `npx vitest run tests/autos/guide.test.ts tests/sync/pm2_registration.test.ts` → PASS. Live check (read-only, no DB): `APP_MONGO_URI= npx ts-node sync_autos_guide.ts --dry-run --targets=<scratch json with 3 targets>` prints 3 entries with prices.
- [ ] **Step 9: Commit** `feat(autos): guía de precios de Mercado Libre por modelo, año y versión`

---

### Task 4: Shared web-source helpers and WooCommerce reader

**Files:**
- Create: `classes/autos/sources/common.ts`, `classes/autos/sources/woo.ts`, `tests/autos/woo.test.ts`, `tests/autos/fixtures/woo-shoppingdeautos.json`, `tests/autos/fixtures/woo-carper.json`

**Interfaces — Produces:**
```ts
// common.ts
export interface WebCarContext { observedAt: string; maxYear: number; dictionary: CarDictionary }
export function htmlText(html: string): string; // strip tags, decode entities (&aacute; &ntilde; &#8211; &amp; …), collapse spaces
export function moneyOf(text: string): { amount: number; currency: CarCurrency } | null; // "U$S 15,000" | "US$ 11.990" | "$U 450.000" | "USD 54.890,00"
export function titleCase(text: string): string;
export function buildWebCar(input: {
  source: CarSource; id: string; title: string; specText: string; permalink: string; picture: string | null;
  price: number; currency: CarCurrency; brand: string | null; model: string | null; year: number | null; km: number | null;
  transmission: CarTransmission | null; fuel: CarFuel | null; sellerType: CarSellerType; sellerId: string;
  dealerName: string | null; department: string | null; description: string; context: WebCarContext;
}): { listing: RawCarListing; detail: CarDetail } | null;
export function emptySourceResult(source: CarSource, startedAt: string): CarSourceResult;
// woo.ts
export interface WooSite { source: "shoppingdeautos" | "carper"; baseUrl: string }
export const WOO_SITES: readonly WooSite[]; // https://shoppingdeautos.uy, https://usados.carper.com.uy
export function wooProductToCar(product: WooProduct, site: WooSite, context: WebCarContext): { listing: RawCarListing; detail: CarDetail } | null;
export async function harvestWooCars(site: WooSite, context: WebCarContext, options?: { fetchPage?: (url: string) => Promise<unknown[] | null>; maxPages?: number }): Promise<CarSourceResult>;
```

`buildWebCar` rules: `matchCar(`${title} ${specText}`, dictionary, { brand, model, year, km }, maxYear)`; with no match but `brand`+`model`+`year` present → ids `x-${slugify(brand)}` / `x-${slugify(model)}`, names `titleCase`; no year → null; `isNew` or km < 1000 with year ≥ maxYear−1 → null; `price` must be > 0. Transmission = input ?? match. Detail: `{ readAt: observedAt, price, currency, active: true, brand: listing.brand, model: listing.model, year, km, version: `${title} ${specText}`.trim(), engineText: null, sellerName: dealerName, bodyType: null, color: null, doors: null, flags: descriptionFlags(`${title} ${description}`), description }`. Listing `source`, `sellerType`, `sellerId: `${source}:${sellerId}``, `dealerName`, `specText`, `neighborhood: null`, `pictureCount: picture ? 1 : null`.

Woo rules: attribute names folded; `año`→year, `kilometros|kilometraje`→km, `marca`, `modelo`, `motor (cc)|cilindrada`→`engineFromCc`, `transmision`→`transmissionOf`, `combustible`→`fuelOf`; reject when `estado|tipo` folded contains `0km|nuevo` (but "usado" passes), when `estatus` contains `no apto`, when `disponibilidad` is present and not `disponible`, when `is_in_stock === false`. Price = `Number(prices.price) / 10 ** (prices.currency_minor_unit ?? 0)`, currency `prices.currency_code`. Title = `htmlText(name)`; specText = engine + version from the name. Picture = `images[0].src`. Seller: dealer, sellerId = source, dealerName from registry. Pagination `/wp-json/wc/store/v1/products?per_page=100&page=N` from 1 until a page returns < 100 items or `maxPages` (20); a null page → `ok: false, complete: false, note: "página N sin respuesta"`.

- [ ] **Step 1: Fixtures.** Write the 3 Shopping de Autos products from `sites2/sda3.json` and the 2 Carper products from `sites2/carper_wc.json` (drop `srcset`, `add_to_cart`, `extensions`). In the Carper fixture keep product 1 (`Estatus: muy bueno`) and product 2 (`NO APTO PARA LA VENTA`).
- [ ] **Step 2: Failing test** (`tests/autos/woo.test.ts`)

```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildCarDictionary } from "../../classes/autos/catalog/dictionary";
import { htmlText, moneyOf } from "../../classes/autos/sources/common";
import { harvestWooCars, WOO_SITES, wooProductToCar } from "../../classes/autos/sources/woo";

const read = (name: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8"));
const ml = (brandId: string, brand: string, modelId: string, model: string) => ({ source: "mercadolibre" as const, brandId, brand, modelId, model });
const CONTEXT = {
  observedAt: "2026-09-17T12:00:00.000Z", maxYear: 2027,
  dictionary: buildCarDictionary([ml("60285", "Nissan", "60286", "Kicks"), ml("60287", "Renault", "60288", "Sandero"), ml("60287", "Renault", "60289", "Clio"), ml("67781", "Chevrolet", "67801", "Onix")],
    [{ brandId: "60285", modelId: "60286", trims: ["Exclusive", "Advance"] }]),
};
const SDA = WOO_SITES.find(site => site.source === "shoppingdeautos")!;
const CARPER = WOO_SITES.find(site => site.source === "carper")!;

describe("common helpers", () => {
  it("decodes html and money", () => {
    expect(htmlText("<p>Autom&aacute;tica &#8211; A&ntilde;o</p>")).toBe("Automática – Año");
    expect(moneyOf("U$S 15,000")).toEqual({ amount: 15_000, currency: "USD" });
    expect(moneyOf("US$ 11.990")).toEqual({ amount: 11_990, currency: "USD" });
    expect(moneyOf("USD 54.890,00")).toEqual({ amount: 54_890, currency: "USD" });
    expect(moneyOf("$U 450.000")).toEqual({ amount: 450_000, currency: "UYU" });
    expect(moneyOf("consultar")).toBeNull();
  });
});

describe("wooProductToCar", () => {
  it("maps Shopping de Autos attributes onto ML ids", () => {
    const [kicks] = read("woo-shoppingdeautos.json");
    const { listing, detail } = wooProductToCar(kicks, SDA, CONTEXT)!;
    expect(listing).toMatchObject({
      id: "153528", source: "shoppingdeautos", brandId: "60285", modelId: "60286", year: 2023, km: 73_168, price: 18_990,
      currency: "USD", transmission: "automatica", fuel: "nafta", sellerType: "dealer", sellerId: "shoppingdeautos:shoppingdeautos",
      dealerName: "Shopping de Autos", permalink: "https://shoppingdeautos.uy/producto/nissan-kicks-exclusive-2023/",
    });
    expect(listing.specText).toContain("1.6");
    expect(detail).toMatchObject({ active: true, price: 18_990, year: 2023, km: 73_168, brand: "Nissan", model: "Kicks" });
  });
  it("divides Carper's minor units and drops units it will not sell", () => {
    const [clio, onix] = read("woo-carper.json");
    expect(wooProductToCar(clio, CARPER, CONTEXT)!.listing).toMatchObject({ price: 18_490, currency: "USD", year: 2023, km: 47_444, modelId: "60289" });
    expect(wooProductToCar(onix, CARPER, CONTEXT)).toBeNull();
  });
  it("drops new cars and out-of-stock products", () => {
    const [kicks] = read("woo-shoppingdeautos.json");
    const renamed = { ...kicks, attributes: kicks.attributes.map((a: { name: string; terms: unknown[] }) => a.name === "Estado" ? { ...a, terms: [{ name: "0km" }] } : a) };
    expect(wooProductToCar(renamed, SDA, CONTEXT)).toBeNull();
    expect(wooProductToCar({ ...kicks, is_in_stock: false }, SDA, CONTEXT)).toBeNull();
  });
});

describe("harvestWooCars", () => {
  it("pages until a short page and reports completeness", async () => {
    const products = read("woo-shoppingdeautos.json");
    const urls: string[] = [];
    const result = await harvestWooCars(SDA, CONTEXT, { fetchPage: async url => { urls.push(url); return products; } });
    expect(urls).toEqual(["https://shoppingdeautos.uy/wp-json/wc/store/v1/products?per_page=100&page=1"]);
    expect(result).toMatchObject({ source: "shoppingdeautos", ok: true, complete: true, requests: 1 });
    expect(result.listings.length).toBeGreaterThan(0);
    expect(result.details.size).toBe(result.listings.length);
  });
  it("keeps going on a failed page but never claims completeness", async () => {
    const result = await harvestWooCars(SDA, CONTEXT, { fetchPage: async () => null });
    expect(result).toMatchObject({ ok: false, complete: false, note: "página 1 sin respuesta" });
  });
});
```

- [ ] **Step 3: Run — FAIL. Step 4: implement `common.ts` and `woo.ts`.** `harvestWooCars` default `fetchPage` = `fetchJson<unknown[]>(url, { timeoutMs: 30_000 })`. `details` map keyed by the listing KEY (`carKeyFor(source, id)`).
- [ ] **Step 5: Run — PASS. Live check:** a throwaway `ts-node -e` calling `harvestWooCars` for both sites with a dictionary built from the scratch snapshot prints counts and 3 sample listings (Shopping de Autos ≈171, Carper ≥ 1; if Carper returns far fewer than its site shows, record the number in the ledger).
- [ ] **Step 6: Commit** `feat(autos): lector de WooCommerce para Shopping de Autos y Carper`

---

### Task 5: WordPress listing themes (Clasiautos, Julio)

**Files:**
- Create: `classes/autos/sources/wordpress.ts`, `tests/autos/wordpress.test.ts`, `tests/autos/fixtures/listivo-clasiautos.json`, `tests/autos/fixtures/vehica-julio.json`, `tests/autos/fixtures/vehica-julio-years.json`

**Interfaces — Produces:**
```ts
export function listivoToCar(post: WpPost, context: WebCarContext): { listing: RawCarListing; detail: CarDetail } | null;
export function vehicaToCar(post: WpPost, years: ReadonlyMap<number, number>, context: WebCarContext): { listing: RawCarListing; detail: CarDetail } | null;
export async function harvestClasiautos(context: WebCarContext, options?: { fetchPage?: (url: string) => Promise<unknown[] | null>; maxPages?: number; perPage?: number }): Promise<CarSourceResult>;
export async function harvestJulio(context: WebCarContext, options?: { fetchPage?: (url: string) => Promise<unknown[] | null>; maxPages?: number; perPage?: number }): Promise<CarSourceResult>;
```

Clasiautos (`https://clasiautos.uy/wp-json/wp/v2/listings?per_page=100&page=N`), field ids: condition `listivo_8114`, seller `listivo_8131`, brand `listivo_945`, model `listivo_8116`, engine `listivo_8132`, transmission `listivo_5666`, fuel `listivo_5667`, price `listivo_130`, year `listivo_4316`, km `listivo_4686`, gallery `listivo_145`. First array element of each. Condition must fold to `usado`. Seller `Particular` → private, anything else → dealer; `sellerId = author`; `dealerName: null`. Price via `moneyOf`. Title `htmlText(title.rendered)`; description `htmlText(content.rendered)`; specText = engine; permalink = `link`; picture = first gallery URL.

Julio (`https://julioautomoviles.com.uy/wp-json/wp/v2/cars?per_page=100&page=N`, years from `/wp-json/wp/v2/vehica_19418?per_page=100` → id → numeric name when 1950..maxYear). From `class_list`: `vehica_6654-autos-usados` required; `vehica_6659-<brand>` and `vehica_6660-<model>` slugs as hints (dashes → spaces). Year = `years.get(vehica_19418[0])`. Price = the single value of `vehica_6656` whose key ends in `_2316` (US$); any other key → null. km = `Number(vehica_6664)`; engine = `engineFromCc(vehica_6665)`; picture = `vehica_6673[0]`; permalink = `link`; title = `htmlText(title.rendered)`; description = `htmlText(content.rendered)`; transmission from `versionTransmission(title)`; seller dealer `julio`, dealerName from registry.

A page past the end answers HTTP 400 with `rest_post_invalid_page_number`: `fetchPage` returns `[]` for that case (default fetch: use `fetchText` and treat a JSON object body with that code as `[]`).

- [ ] **Step 1: Fixtures.** `listivo-clasiautos.json` = the 3 posts of `sites2/ca3.json` with `content.rendered` shortened to its first 300 chars, plus one post copied with `listivo_8114: ["Nuevo"]`. `vehica-julio.json` = first 3 posts of `sites2/julio_p1.json`; `vehica-julio-years.json` = `sites2/julio_vehica_19418.json` reduced to `[{id,name}]`.
- [ ] **Step 2: Failing test** (`tests/autos/wordpress.test.ts`)

```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildCarDictionary } from "../../classes/autos/catalog/dictionary";
import { harvestClasiautos, listivoToCar, vehicaToCar } from "../../classes/autos/sources/wordpress";

const read = (name: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8"));
const ml = (brandId: string, brand: string, modelId: string, model: string) => ({ source: "mercadolibre" as const, brandId, brand, modelId, model });
const CONTEXT = {
  observedAt: "2026-09-17T12:00:00.000Z", maxYear: 2027,
  dictionary: buildCarDictionary([ml("60297", "Toyota", "60315", "Corolla"), ml("60310", "Fiat", "60311", "Uno"), ml("60310", "Fiat", "60312", "Mobi"), ml("60400", "Suzuki", "60401", "Alto")], []),
};
const YEARS = new Map<number, number>(read("vehica-julio-years.json").filter((t: { name: string }) => /^\d{4}$/.test(t.name)).map((t: { id: number; name: string }) => [t.id, Number(t.name)]));

describe("listivoToCar (Clasiautos)", () => {
  it("reads the structured fields", () => {
    const [corolla] = read("listivo-clasiautos.json");
    const { listing, detail } = listivoToCar(corolla, CONTEXT)!;
    expect(listing).toMatchObject({
      id: "15715", source: "clasiautos", brandId: "60297", modelId: "60315", year: 2014, km: 250_000, price: 15_000, currency: "USD",
      transmission: "manual", fuel: "nafta", sellerType: "private", sellerId: "clasiautos:879", dealerName: null,
      permalink: "https://clasiautos.uy/avisos/toyota-corolla-le-1-8-extra-full-manual-2014-techo-carplay-clim/",
    });
    expect(listing.specText).toBe("1.8");
    expect(listing.picture).toMatch(/^https:\/\/clasiautos\.uy\/wp-content\//);
    expect(detail.description).toContain("Toyota Corolla 2014");
  });
  it("skips new cars", () => {
    const posts = read("listivo-clasiautos.json");
    expect(listivoToCar(posts[posts.length - 1], CONTEXT)).toBeNull();
  });
});

describe("vehicaToCar (Julio)", () => {
  it("resolves terms, the US$ price and the engine size", () => {
    const [uno] = read("vehica-julio.json");
    const { listing } = vehicaToCar(uno, YEARS, CONTEXT)!;
    expect(listing).toMatchObject({ id: "49408", source: "julio", brandId: "60310", modelId: "60311", price: 9_200, currency: "USD", km: 117_131, sellerType: "dealer", dealerName: "Julio Automóviles" });
    expect(listing.year).toBeGreaterThanOrEqual(1990);
    expect(listing.specText).toContain("1.4");
  });
  it("refuses an unknown price currency", () => {
    const [uno] = read("vehica-julio.json");
    expect(vehicaToCar({ ...uno, vehica_6656: { vehica_currency_6656_9999: 9200 } }, YEARS, CONTEXT)).toBeNull();
  });
});

describe("harvestClasiautos", () => {
  it("stops at the empty page after the last one", async () => {
    const posts = read("listivo-clasiautos.json");
    const pages = [posts, []];
    const result = await harvestClasiautos(CONTEXT, { perPage: 4, fetchPage: async () => pages.shift() ?? [] });
    expect(result).toMatchObject({ ok: true, complete: true, requests: 2 });
    expect(result.listings.map(item => item.id)).toContain("15715");
  });
});
```

(A page shorter than `perPage` ends the loop too; both harvesters accept `options.perPage`, default 100 — the fixture has 4 posts, so the test pages with `perPage: 4`.)

- [ ] **Step 3: Run — FAIL. Step 4: implement. Step 5: Run — PASS.** Fix the fixture-year assertion to the exact year once the fixture term id is known (`vehica_19418-2525` → look it up in the years fixture and assert that number).
- [ ] **Step 6: Live check** (throwaway ts-node): Clasiautos ≈243 posts → used listings count; Julio ≈138 used.
- [ ] **Step 7: Commit** `feat(autos): lector de Clasiautos y Julio Automóviles (temas Listivo y Vehica)`

### Task 6: Fidocar (Fenicio) and Car One readers

**Files:**
- Create: `classes/autos/sources/fenicio.ts`, `classes/autos/sources/carone.ts`, `tests/autos/dealers.test.ts`, `tests/autos/fixtures/fidocar-pdp.html`, `tests/autos/fixtures/fidocar-sitemap.xml`, `tests/autos/fixtures/carone-list.html`

**Interfaces — Produces:**
```ts
// fenicio.ts
export const FIDOCAR_BASE = "https://www.usadosfidocar.com.uy";
export function fidocarUrls(sitemapXml: string): string[]; // /modelo/<slug>_<id>_<id> only, deduped
export function fidocarPdpToCar(html: string, url: string, context: WebCarContext): { listing: RawCarListing; detail: CarDetail } | null;
export async function harvestFidocar(context: WebCarContext, options?: { fetchPage?: (url: string) => Promise<string | null>; maxPdp?: number }): Promise<CarSourceResult>;
// carone.ts
export const CARONE_USED_URL = "https://carone.com.uy/autos-usados-y-0km?carone_estado=96";
export function caroneCards(html: string, context: WebCarContext): Array<{ listing: RawCarListing; detail: CarDetail }>;
export function caroneTotal(html: string): number | null; // "toolbar-number" third value (376 in the fixture page)
export async function harvestCarOne(context: WebCarContext, options?: { fetchPage?: (url: string) => Promise<string | null>; maxPages?: number }): Promise<CarSourceResult>;
```

Fidocar rules: id = `/_(\d+)_\d+$/` of the URL; brand = `itemprop="brand">X<`; title = `itemprop="name">X<` (or `<h1 class="tit">`); price/currency from `<meta itemprop="price" content>` / `priceCurrency`; availability link must end with `InStock`; specs from `<h5>Label</h5><p>Value</p>` pairs (`Año`, `Kilometros`, `Transmisión`); picture = `og:image`; specText = title with `(\d),(\d)` → `$1.$2` (engine "3,5" → "3.5"); description = "" (the page's description carries phone numbers — never read). Dealer `fidocar`. Sequential PDPs (throttled by `fetchText`), `maxPdp` default 300; the result is `complete` only if the sitemap answered and every PDP answered.

Car One rules: page N URL = `${CARONE_USED_URL}&p=${N}` (robots allows `carone_estado=` URLs; bare `?p=` is disallowed — never request it). Cards split on `<li class="item product product-item`; id = `-sku4-(\d+)"`; permalink = the first `href="https://carone.com.uy/...-sku4-<id>"`; brand line = `carone-car-info-data-brand[^>]*>([^<]+)<` ("Chevrolet JOY": first word(s) matched as brand hint through the dictionary, whole line as model hint); version = `carone-car-info-data-model" title="([^"]+)"`; price = `data-price-amount="(\d+)"` with currency from the visible `class="price">(US\$|\$)`; attributes = pairs `carone-car-attribute-value">V</p><p class="carone-car-attribute-title[^>]*>T<` (T decoded: `A&ntildeo` → Año, `Kil&oacutemetros` → Kilómetros; km "82.900" → 82900); picture = `<img src="(https://cdn\.impel\.io/[^"]+)"`; specText = version; transmission = `versionTransmission(version)`; fuel = `fuelOf(value of Combustible)`. Title = `${brandLine} ${version}` title-cased. Pages until a page adds no new ids, `maxPages` 40; `complete` when the number of ids read ≥ `caroneTotal` of page 1 (or no total shown and no page failed).

- [ ] **Step 1: Fixtures.** `fidocar-pdp.html` = from `sites2/fido_pdp.html` keep `<head>` meta tags (og:image), the `<div class="hdr">…</h1>` block, the `Ficha Tecnica` first `contenedor` block and the hidden `itemscope Product` block (≈4 KB, phone numbers replaced by `000`). `fidocar-sitemap.xml` = first 3 `<url>` entries of `sites2/fido_sm.xml` plus one `/catalogo/...` URL. `carone-list.html` = the toolbar block containing `toolbar-number` and the first 2 cards of `sites2/carone.html` (style blocks removed).
- [ ] **Step 2: Failing test** (`tests/autos/dealers.test.ts`)

```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildCarDictionary } from "../../classes/autos/catalog/dictionary";
import { caroneCards, caroneTotal, CARONE_USED_URL, harvestCarOne } from "../../classes/autos/sources/carone";
import { fidocarPdpToCar, fidocarUrls } from "../../classes/autos/sources/fenicio";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
const ml = (brandId: string, brand: string, modelId: string, model: string) => ({ source: "mercadolibre" as const, brandId, brand, modelId, model });
const CONTEXT = {
  observedAt: "2026-09-17T12:00:00.000Z", maxYear: 2027,
  dictionary: buildCarDictionary([ml("60300", "Hyundai", "60302", "Santa Fe"), ml("67781", "Chevrolet", "67801", "Onix"), ml("60500", "Changan", "60501", "CS35")], []),
};
const PDP_URL = "https://www.usadosfidocar.com.uy/modelo/hyundai-new-santa-fe-3-5-limited-awd-7plz-2022_418633_418633";

describe("Fidocar", () => {
  it("lists only model pages from the sitemap", () => {
    const urls = fidocarUrls(fixture("fidocar-sitemap.xml"));
    expect(urls.length).toBe(3);
    expect(urls.every(url => /\/modelo\/[\w-]+_\d+_\d+$/.test(url))).toBe(true);
  });
  it("reads the product page", () => {
    const { listing, detail } = fidocarPdpToCar(fixture("fidocar-pdp.html"), PDP_URL, CONTEXT)!;
    expect(listing).toMatchObject({
      id: "418633", source: "fidocar", brandId: "60300", modelId: "60302", year: 2022, km: 30_000, price: 54_890, currency: "USD",
      transmission: "automatica", sellerType: "dealer", dealerName: "Usados Fidocar", permalink: PDP_URL,
    });
    expect(listing.specText).toContain("3.5");
    expect(listing.picture).toMatch(/^https:\/\/f\.fcdn\.app\//);
    expect(detail.description).toBe("");
  });
  it("drops a product that is not in stock", () => {
    expect(fidocarPdpToCar(fixture("fidocar-pdp.html").replace("schema.org/InStock", "schema.org/OutOfStock"), PDP_URL, CONTEXT)).toBeNull();
  });
});

describe("Car One", () => {
  it("parses cards", () => {
    const cards = caroneCards(fixture("carone-list.html"), CONTEXT);
    expect(cards.map(card => card.listing)).toEqual([
      expect.objectContaining({ id: "717444", source: "carone", brandId: "67781", modelId: "67801", year: 2023, km: 82_900, price: 11_990, currency: "USD", transmission: "manual", fuel: "nafta", dealerName: "Car One", permalink: "https://carone.com.uy/chevrolet-nuevo-onix-10-joy-mt-sku4-717444" }),
      expect.objectContaining({ id: "717443", brandId: "60500", modelId: "60501", year: 2023, km: 50_979, price: 15_290, transmission: "automatica" }),
    ]);
    expect(caroneTotal(fixture("carone-list.html"))).toBe(376);
  });
  it("pages with the used filter until nothing new appears", async () => {
    const html = fixture("carone-list.html");
    const urls: string[] = [];
    const result = await harvestCarOne(CONTEXT, { fetchPage: async url => { urls.push(url); return html; } });
    expect(urls).toEqual([`${CARONE_USED_URL}&p=1`, `${CARONE_USED_URL}&p=2`]);
    expect(result.listings).toHaveLength(2);
    expect(result.complete).toBe(false);
  });
});
```

- [ ] **Step 3: Run — FAIL. Step 4: implement. Step 5: Run — PASS.**
- [ ] **Step 6: Live check** (throwaway): Fidocar ≈112 PDPs → used listings; Car One ≈226 used over ~19 pages; print 3 samples each and any card that failed to parse.
- [ ] **Step 7: Commit** `feat(autos): lectores de Usados Fidocar y Car One`

---

### Task 7: Facebook Marketplace reader

**Files:**
- Create: `classes/autos/sources/facebook.ts`, `classes/autos/sources/facebookBrowser.ts`, `classes/models/CarFbCard.ts`, `tests/autos/facebook.test.ts`, `tests/autos/fixtures/fb-feed.jsonl`, `tests/autos/fixtures/fb-item.json`

**Interfaces — Produces:**
```ts
// facebook.ts (pure)
export const FB_VEHICLES_CATEGORY = "807311116002614";
export interface FbCard { id: string; title: string; amount: number | null; city: string | null; createdAt: string | null; sellerId: string | null; picture: string | null; isSold: boolean; isPending: boolean; isLive: boolean; categoryId: string | null }
export interface FbItem { id: string; title: string | null; description: string; amount: number | null; isLive: boolean; isSold: boolean; readAt: string }
export function fbCardsFromText(text: string): FbCard[];             // every JSON line/blob; nodes with listing_price + marketplace_listing_title; seller NAME never copied
export function fbItemFromTexts(id: string, texts: readonly string[], readAt: string): FbItem | null; // node with redacted_description + listing_price and the same id
export function resolveFbCurrency(amount: number, declared: CarCurrency | null, referenceUsd: number | null, usdUyu: number): { currency: CarCurrency; inferred: boolean } | null;
export function fbDepartment(city: string | null): string | null;  // "Pando, Canelones, Uruguay" → Canelones; "Montevideo, Uruguay" → Montevideo; "Paysandú" → Paysandú
export function fbCardToCar(card: FbCard, item: FbItem | null, context: WebCarContext & { usdUyu: number; referenceUsd: (brandId: string, modelId: string, year: number) => number | null }): { listing: RawCarListing; detail: CarDetail | null } | null;
export function fbDetailQueue(cards: readonly (FbCard & { lastSeen: string; item: FbItem | null })[], dictionary: CarDictionary, options: { now: Date; max: number; wanted: ReadonlySet<string>; maxYear: number }): string[];
// facebookBrowser.ts (I/O)
export class FacebookSessionError extends Error {}
export async function facebookSessionOk(healthUrl?: string): Promise<boolean>;
export async function readFacebookVehicles(options: { feedScrolls: number; queries: readonly string[]; queryScrolls: number; itemIds: () => Promise<string[]>; itemGapMs: number; maxDurationMs: number; cdpUrl?: string }): Promise<{ cards: FbCard[]; items: FbItem[]; pages: number; note: string | null; sessionLost: boolean }>;
```

Rules:
- `fbCardToCar`: text = `${card.title} ${item?.description ?? ""}`; `matchCar(text, dictionary, {}, maxYear)`; needs brand+model AND year; amount = item?.amount ?? card.amount (> 0); `declaredCurrencyFor(text, amount)` (never `declaredCurrencyOf`: descriptions quote debts in pesos); `referenceUsd(brandId, modelId, year)`; `resolveFbCurrency`; null when unresolved. Price/currency = amount + resolved currency. `isSold` (card or item) or `item.isLive === false` → null. Listing: `id` card id, `source: "facebook"`, title = card title, `km` from match, `sellerType: "private"` (Marketplace does not tell; the public label is only "Facebook Marketplace"), `sellerId` = card.sellerId, `picture`, `permalink` = `https://www.facebook.com/marketplace/item/${id}/`, `department` = `fbDepartment(card.city)`, `currencyInferred`, `specText: ""`. Detail only when item: `{ readAt: item.readAt, price: amount, currency, active: item.isLive && !item.isSold, brand, model, year, km, version: text, engineText: null, sellerName: null, bodyType: null, color: null, doors: null, flags: descriptionFlags(text), description: item.description }`.
- `resolveFbCurrency`: declared → `{declared, inferred:false}`. Else no reference → null. USD candidate ratio = amount/ref, UYU ratio = (amount/usdUyu)/ref; in-band = 0.4 ≤ r ≤ 2.5; exactly one in band → `{that, inferred:true}`; else null.
- `fbDetailQueue`: cards with `lastSeen` ≥ now−4 d, not sold, no item or item older than 72 h, and `matchCar(title)` non-null; order: ids in `wanted` first, then cards whose title match lacks year or km, then newest `createdAt`; slice `max`.
- `facebookBrowser.ts`: `facebookSessionOk` GETs `AUTOS_FB_HEALTH_URL` (default `http://127.0.0.1:9246/health`), true only for `sessionStatus === "valid"`. `readFacebookVehicles` connects `puppeteer-core` to `AUTOS_FB_CDP_URL` (default `http://127.0.0.1:9224`); ONE page for the feed (`https://www.facebook.com/marketplace/montevideo/vehicles?sortBy=creation_time_descend`) collecting `/api/graphql` response texts + `script[type="application/json"]`, scrolling `window.innerHeight*3` every 2.2 s; then for each query `https://www.facebook.com/marketplace/montevideo/search?query=<q>` with `queryScrolls`; keeps cards whose `categoryId` is the vehicles category (feed cards with null category are kept); then a fresh page per item id (`/marketplace/item/<id>/`, wait 6 s, `itemGapMs` between); any navigation landing on `/login` or `checkpoint` throws `FacebookSessionError` → returns what it has with `sessionLost: true`; pages always closed in `finally`; `browser.disconnect()` (never `close()`); stops at `maxDurationMs` with a note.
- `CarFbCard` model (`carfbcards`): `{ key: "fb-<id>", card: FbCard, item: FbItem | null, firstSeen, lastSeen }`, unique `key`, index `lastSeen`.

- [ ] **Step 1: Fixtures.** `fb-feed.jsonl`: two lines. Line 1 = `{"data":{"marketplace_search":{"feed_units":{"edges":[{"node":{"listing": <feed node>}}]}}}}` using the captured shape (id `1268374875382121`, title `Chevrolet Aveo 1.6`, amount `"4000.00"`, city `Montevideo, Uruguay`, seller `{ "__typename": "User", "name": "SELLER NAME", "id": "100070961392265" }`, category `807311116002614`, `creation_time` 1789656553, photo uri `https://scontent-yyz1-1.xx.fbcdn.net/v/t39/x.jpg`). Line 2 = a second listing `Vendo o permuto` (id `1610946387331862`, amount `"60000.00"`, city `Mercedes, Soriano`, category `807311116002614`) and a third `Moto Yumbo` with category `1234`. `fb-item.json` = the captured item node for `1268374875382121` (description `Muy buen estado de motor ... Debe 52 mil pesos con titulos pronto a transferir`, `is_live: true`, `is_sold: false`, `listing_price.amount "4000.00"`, seller name replaced by `SELLER NAME`) wrapped as `{"data":{"viewer":{"marketplace_product_details_page":{"target": <node>}}}}`.
- [ ] **Step 2: Failing test** (`tests/autos/facebook.test.ts`)

```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildCarDictionary } from "../../classes/autos/catalog/dictionary";
import { fbCardToCar, fbCardsFromText, fbDepartment, fbDetailQueue, fbItemFromTexts, resolveFbCurrency } from "../../classes/autos/sources/facebook";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
const ml = (brandId: string, brand: string, modelId: string, model: string) => ({ source: "mercadolibre" as const, brandId, brand, modelId, model });
const DICT = buildCarDictionary([ml("67781", "Chevrolet", "67800", "Aveo"), ml("60310", "Fiat", "60311", "Uno")], []);
const NOW = new Date("2026-09-17T12:00:00Z");
const CONTEXT = { observedAt: NOW.toISOString(), maxYear: 2027, dictionary: DICT, usdUyu: 40, referenceUsd: () => 5_000 };

describe("GraphQL parsing", () => {
  it("reads feed cards without ever copying the seller name", () => {
    const cards = fbCardsFromText(fixture("fb-feed.jsonl"));
    expect(cards.map(card => card.id)).toEqual(["1268374875382121", "1610946387331862", "9990000000000001"]);
    expect(cards[0]).toMatchObject({ title: "Chevrolet Aveo 1.6", amount: 4_000, city: "Montevideo, Uruguay", sellerId: "100070961392265", categoryId: "807311116002614", isSold: false });
    expect(cards[0]!.createdAt).toBe(new Date(1789656553 * 1000).toISOString());
    expect(JSON.stringify(cards)).not.toContain("SELLER NAME");
  });
  it("reads the item page", () => {
    const item = fbItemFromTexts("1268374875382121", [fixture("fb-item.json")], NOW.toISOString())!;
    expect(item).toMatchObject({ amount: 4_000, isLive: true, isSold: false });
    expect(item.description).toContain("Debe 52 mil pesos");
    expect(fbItemFromTexts("1", [fixture("fb-item.json")], NOW.toISOString())).toBeNull();
    expect(JSON.stringify(item)).not.toContain("SELLER NAME");
  });
});

describe("resolveFbCurrency", () => {
  it("trusts a declared currency", () => {
    expect(resolveFbCurrency(4_000, "USD", null, 40)).toEqual({ currency: "USD", inferred: false });
  });
  it("infers only when exactly one reading fits the reference", () => {
    expect(resolveFbCurrency(4_000, null, 5_000, 40)).toEqual({ currency: "USD", inferred: true });
    expect(resolveFbCurrency(200_000, null, 5_000, 40)).toEqual({ currency: "UYU", inferred: true });
    expect(resolveFbCurrency(60, null, 5_000, 40)).toBeNull();
    expect(resolveFbCurrency(4_000, null, null, 40)).toBeNull();
    expect(resolveFbCurrency(10_000, null, 10_000, 1.5)).toBeNull();
  });
});

describe("fbCardToCar", () => {
  const [aveo, permuto] = fbCardsFromText(fixture("fb-feed.jsonl"));
  const item = fbItemFromTexts("1268374875382121", [fixture("fb-item.json")], NOW.toISOString());
  it("needs a year: the Aveo title has none and neither does its description", () => {
    expect(fbCardToCar(aveo!, item, CONTEXT)).toBeNull();
  });
  it("builds a private listing with an inferred currency and the description's flags", () => {
    const withYear = { ...aveo!, title: "Chevrolet Aveo 1.6 2012" };
    const result = fbCardToCar(withYear, item, CONTEXT)!;
    expect(result.listing).toMatchObject({
      id: "1268374875382121", source: "facebook", brandId: "67781", modelId: "67800", year: 2012, price: 4_000, currency: "USD",
      currencyInferred: true, sellerType: "private", sellerId: "100070961392265", department: "Montevideo",
      permalink: "https://www.facebook.com/marketplace/item/1268374875382121/",
    });
    expect(result.detail!.flags).toContain("paperwork");
  });
  it("skips cards that name no car or are sold", () => {
    expect(fbCardToCar(permuto!, null, CONTEXT)).toBeNull();
    expect(fbCardToCar({ ...aveo!, title: "Chevrolet Aveo 2012", isSold: true }, null, CONTEXT)).toBeNull();
  });
  it("maps cities to departments", () => {
    expect(fbDepartment("Pando, Canelones, Uruguay")).toBe("Canelones");
    expect(fbDepartment("Montevideo, Uruguay")).toBe("Montevideo");
    expect(fbDepartment("Paysandú")).toBe("Paysandú");
    expect(fbDepartment("Nueva Palmira")).toBeNull();
  });
});

describe("fbDetailQueue", () => {
  it("reads wanted and incomplete identifiable cards first, never sold or unknown ones", () => {
    const base = fbCardsFromText(fixture("fb-feed.jsonl"))[0]!;
    const cards = [
      { ...base, id: "1", title: "Chevrolet Aveo 2012 90000 km", createdAt: "2026-09-17T10:00:00Z", lastSeen: NOW.toISOString(), item: null },
      { ...base, id: "2", title: "Chevrolet Aveo", createdAt: "2026-09-17T09:00:00Z", lastSeen: NOW.toISOString(), item: null },
      { ...base, id: "3", title: "Vendo o permuto", createdAt: "2026-09-17T11:00:00Z", lastSeen: NOW.toISOString(), item: null },
      { ...base, id: "4", title: "Fiat Uno 2010", isSold: true, createdAt: "2026-09-17T11:00:00Z", lastSeen: NOW.toISOString(), item: null },
      { ...base, id: "5", title: "Fiat Uno 2010 50000 km", createdAt: "2026-09-16T11:00:00Z", lastSeen: NOW.toISOString(), item: null },
      { ...base, id: "6", title: "Fiat Uno", createdAt: "2026-09-01T11:00:00Z", lastSeen: "2026-09-01T11:00:00Z", item: null },
    ];
    expect(fbDetailQueue(cards, DICT, { now: NOW, max: 3, wanted: new Set(["5"]), maxYear: 2027 })).toEqual(["5", "2", "1"]);
  });
});
```

- [ ] **Step 3: Run — FAIL. Step 4: implement `facebook.ts`, `facebookBrowser.ts`, `CarFbCard.ts`. Step 5: Run — PASS.**
- [ ] **Step 6: Live check on the VPS** (never locally — the CDP port is only there): compile `classes/autos/sources/facebook*.ts` + their imports to a scratch dir (`npx tsc --outDir <scratch>/fbbuild --module commonjs --target es2020 --esModuleInterop --skipLibCheck classes/autos/sources/facebookBrowser.ts`), upload with `sshrun.py` to `/tmp/fbbuild`, run a 20-line runner with `NODE_PATH=/root/cambio-uruguay/node_modules` doing `readFacebookVehicles({ feedScrolls: 15, queries: ["toyota"], queryScrolls: 2, itemIds: async () => [<first 2 ids>], itemGapMs: 6000, maxDurationMs: 180000 })`; expect ≥ 100 cards, 2 items with descriptions, `sessionLost: false`. Delete `/tmp/fbbuild` afterwards.
- [ ] **Step 7: Commit** `feat(autos): lector de Facebook Marketplace con moneda deducida y fichas con tope`

### Task 8: Dedupe, references and orchestration

**Files:**
- Create: `classes/autos/dedupe.ts`, `tests/autos/dedupe.test.ts`, `tests/autos/orchestrate.test.ts`
- Modify: `classes/autos/store.ts`, `classes/autos/market.ts`, `sync_autos.ts`, `classes/autos/sources/index.ts` (new small file), `tests/autos/store.test.ts`, `tests/appdb/schema_parity.test.ts` (nothing new is public-model — only confirm it still passes)

**Interfaces — Produces:**
```ts
// dedupe.ts
export function dedupeAcrossSources(listings: readonly CarListing[]): { kept: CarListing[]; duplicates: Partial<Record<CarSource, number>> };
export function attachReferences(listings: readonly CarListing[], guide: ReadonlyMap<string, CarGuideEntry>): CarListing[];
export function referenceMedians(listings: readonly CarListing[]): Map<string, number>; // `${brandId}|${modelId}|${year}` → median priceUsd of USD, non-inferred, clean ML+web adverts with ≥3 rows
export function sourceCoverage(rows: readonly PublicCarListing[], duplicates: Partial<Record<CarSource, number>>, metas: ReadonlyMap<CarSource, { lastOkAt: string | null; ok: boolean }>): PublicCarSourceCoverage[];
// sources/index.ts
export const WEB_SOURCES: readonly CarSource[]; // clasiautos, julio, shoppingdeautos, carper, fidocar, carone
export function sourceEnabled(source: CarSource, env?: NodeJS.ProcessEnv): boolean; // AUTOS_SOURCES list (default all) and AUTOS_<SOURCE>_ENABLED !== "0"
export async function harvestWebSource(source: CarSource, context: WebCarContext): Promise<CarSourceResult>;
// store.ts
export function sourceRetirementFilter(result: Pick<CarSourceResult, "source" | "startedAt" | "listings">): Record<string, unknown>;
export async function saveSourceHarvest(result: CarSourceResult): Promise<{ upserted: number; retired: number }>;
export async function saveSourceMeta(result: CarSourceResult): Promise<void>;       // carharvestmetas uy-cars-source-<source>, lastOkAt/failingSince like harvestMetaRecord
export async function loadSourceMetas(): Promise<Map<CarSource, { lastOkAt: string | null; ok: boolean }>>;
export async function upsertFbCards(cards: readonly FbCard[], observedAt: string): Promise<void>;
export async function saveFbItems(items: readonly FbItem[]): Promise<void>;
export async function loadFbCards(since: string): Promise<Array<FbCard & { lastSeen: string; item: FbItem | null }>>;
export async function loadFbWanted(): Promise<Set<string>>; export async function saveFbWanted(ids: readonly string[]): Promise<void>; // meta key uy-cars-fb-wanted
// market.ts
export function buildMarketSnapshots(listings, options: { now; generatedAt; freshDays; guide?: ReadonlyMap<string, CarGuideEntry> }): PublicCarMarketSnapshot[]; // fills guide via guideYearsFor
```

Rules:
- `dedupeAcrossSources`: sort by `CAR_SOURCES[source].priority`, then key; keep a listing unless an already-kept listing of a DIFFERENT source has the same brandId+modelId+year, both km non-null with |Δ| ≤ max(500, 1 % of the kept km), and |ΔpriceUsd| ≤ 3 % of the kept price. Count drops per source.
- `sourceRetirementFilter`: `{ "listing.source": source, key: { $nin: keys }, lastSeen: { $lt: startedAt, $gte: startedAt − 21 d }, retiredAt: null }`. `saveSourceHarvest` upserts like `saveCarHarvest` (key via `carKey(id, source)`, price history, `detail` overwritten from `result.details` when present) and applies `sweepUpdate` to the filter's matches ONLY when `result.complete`. Facebook never passes `complete: true`. A detail with `active: false` retires the key.
- `sync_autos.ts` order (full mode): ML harvest (unchanged) → load stored → dictionary from ML stored rows + vocabularies (dry run: from `--harvest-snapshot`) → for each enabled web source: `harvestWebSource` → log `[autos] <source>: N avisos, ok|parcial, note` → save (not in dry run) → Facebook (enabled, not dry run unless `--with-facebook`): `facebookSessionOk` → `readFacebookVehicles({ feedScrolls: fast ? 15 : 80, queries: fast ? [] : top-20 brand names by stored count, queryScrolls: 4, itemIds: () => fbDetailQueue(...) with max fast ? 15 : 120, itemGapMs: 6000, maxDurationMs: (fast ? 8 : 30) * 60_000 })` → `upsertFbCards`, `saveFbItems` → build FB listings from `loadFbCards(now − 4 d)` with `fbCardToCar` (reference = `referenceMedians` of the enriched non-FB listings, else guide average) → `saveSourceHarvest({ source: "facebook", complete: false, ... })` → reload stored → enrich all → `attachReferences` (guide from `loadGuideEntries`, `new Map()` in dry run) → `dedupeAcrossSources` → analysis on `kept` → ML detail refetch (only `ml-` keys go to `fetchCarDetails`; `fb-` keys go to `saveFbWanted`; web keys wait for the next full read) → catalog/markets/snapshot from `kept` with `sources: sourceCoverage(...)` and `guide` → publish exactly as today.
- Facebook listings built from `carfbcards` use `observedAt` = the later of the card's `lastSeen` and, when the item is live, `item.readAt` (a live item page keeps an old card in the 4-day window); an item with `isLive === false` or `isSold` retires `fb-<id>` via `saveSourceHarvest` details (`active: false`).
- Fast mode: ML fast + Facebook shallow; web sources are NOT read (their stored rows stay; their `lastSeen` is the last full read, inside the 4-day window).
- `--sources=a,b` limits sources for a run (dry runs); `AUTOS_FB_ENABLED=0` skips Facebook; a thrown error inside one source is caught, logged, recorded as `ok: false` and never aborts the run.

- [ ] **Step 1: Failing tests** (`tests/autos/dedupe.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { attachReferences, dedupeAcrossSources, referenceMedians, sourceCoverage } from "../../classes/autos/dedupe";
import { guideKey } from "../../classes/autos/catalog/guide";
import { sourceRetirementFilter } from "../../classes/autos/store";
import type { CarListing } from "../../classes/autos/types";

const NOW = "2026-09-17T12:00:00.000Z";
const car = (key: string, source: CarListing["source"], overrides: Partial<CarListing> = {}): CarListing => ({
  id: key.split("-")[1]!, source, brandId: "1", brand: "Chevrolet", modelId: "2", model: "Onix", title: "Chevrolet Onix 1.0 LT",
  year: 2023, km: 82_900, price: 11_990, currency: "USD", transmission: "manual", fuel: "nafta", neighborhood: null,
  department: null, sellerType: "dealer", sellerId: source, picture: null, pictureCount: null, permalink: "https://x", observedAt: NOW,
  key, brandSlug: "chevrolet", modelSlug: "onix", marketSlug: "chevrolet-onix", engine: "1.0", trim: "lt", trimLabel: "LT",
  kmQuality: "ok", flags: [], priceUsd: 11_990, priceConverted: false, firstSeen: NOW, lastSeen: NOW, priceDrop: null, detail: null,
  sourceName: source, reference: null, ...overrides,
});

describe("dedupeAcrossSources", () => {
  it("keeps the Mercado Libre copy of a dealer's car and counts the drop", () => {
    const { kept, duplicates } = dedupeAcrossSources([
      car("carone-717444", "carone", { km: 82_900, priceUsd: 11_990 }),
      car("ml-MLU1", "mercadolibre", { km: 82_950, priceUsd: 12_190 }),
      car("fb-9", "facebook", { km: 83_000, priceUsd: 11_900 }),
    ]);
    expect(kept.map(item => item.key)).toEqual(["ml-MLU1"]);
    expect(duplicates).toEqual({ carone: 1, facebook: 1 });
  });
  it("keeps same-source copies (analysis handles those) and different cars", () => {
    const { kept } = dedupeAcrossSources([
      car("ml-MLU1", "mercadolibre"), car("ml-MLU2", "mercadolibre"),
      car("carone-1", "carone", { km: 120_000 }), car("carone-2", "carone", { priceUsd: 14_000 }),
      car("carone-3", "carone", { year: 2022 }), car("fb-4", "facebook", { km: null }),
    ]);
    expect(kept.map(item => item.key).sort()).toEqual(["carone-1", "carone-2", "carone-3", "fb-4", "ml-MLU1", "ml-MLU2"]);
  });
});

describe("references", () => {
  it("attaches the guide reference to each listing", () => {
    const guide = new Map([[guideKey("chevrolet", "onix", 2023), { key: guideKey("chevrolet", "onix", 2023), brandSlug: "chevrolet", modelSlug: "onix", year: 2023, status: "ok" as const, averageUsd: 13_000, updatedLabel: null, fetchedAt: NOW, versions: [{ name: "Chevrolet Onix 2023 Lt", slug: "lt", priceUsd: 12_500 }] }]]);
    expect(attachReferences([car("ml-MLU1", "mercadolibre")], guide)[0]!.reference).toEqual({ priceUsd: 12_500, basis: "version", updatedAt: NOW });
  });
  it("medians ignore inferred currencies and thin groups", () => {
    const rows = [car("ml-1", "mercadolibre", { priceUsd: 10_000 }), car("ml-2", "mercadolibre", { priceUsd: 12_000 }), car("sda-3", "shoppingdeautos", { priceUsd: 11_000 }), car("fb-4", "facebook", { priceUsd: 1, currencyInferred: true })];
    expect(referenceMedians(rows).get("1|2|2023")).toBe(11_000);
    expect(referenceMedians(rows.slice(0, 2)).get("1|2|2023")).toBeUndefined();
  });
});

describe("sourceCoverage", () => {
  it("lists every source with its public count, duplicates and last good read", () => {
    const coverage = sourceCoverage([{ source: "clasiautos" } as never, { source: "clasiautos" } as never], { facebook: 3 }, new Map([["clasiautos", { lastOkAt: NOW, ok: true }]]));
    expect(coverage.find(item => item.source === "clasiautos")).toEqual({ source: "clasiautos", name: "Clasiautos", listings: 2, duplicates: 0, lastReadAt: NOW, ok: true });
    expect(coverage.find(item => item.source === "facebook")).toMatchObject({ listings: 0, duplicates: 3, lastReadAt: null, ok: false });
    expect(coverage).toHaveLength(8);
  });
});

describe("sourceRetirementFilter", () => {
  it("only ever considers the same source's unseen adverts from the last 21 days", () => {
    const filter = sourceRetirementFilter({ source: "carone", startedAt: NOW, listings: [{ id: "1", source: "carone" } as never] });
    expect(filter).toEqual({
      "listing.source": "carone", key: { $nin: ["carone-1"] },
      lastSeen: { $lt: NOW, $gte: "2026-08-27T12:00:00.000Z" }, retiredAt: null,
    });
  });
});
```

`tests/autos/orchestrate.test.ts` covers `sourceEnabled`:

```ts
import { describe, expect, it } from "vitest";
import { sourceEnabled, WEB_SOURCES } from "../../classes/autos/sources";

describe("sourceEnabled", () => {
  it("defaults to every source and honours both switches", () => {
    expect(WEB_SOURCES).toEqual(["clasiautos", "julio", "shoppingdeautos", "carper", "fidocar", "carone"]);
    expect(sourceEnabled("carone", {})).toBe(true);
    expect(sourceEnabled("carone", { AUTOS_SOURCES: "clasiautos,facebook" })).toBe(false);
    expect(sourceEnabled("facebook", { AUTOS_SOURCES: "clasiautos,facebook" })).toBe(true);
    expect(sourceEnabled("facebook", { AUTOS_FB_ENABLED: "0" })).toBe(false);
    expect(sourceEnabled("shoppingdeautos", { AUTOS_SHOPPINGDEAUTOS_ENABLED: "0" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run — FAIL. Step 3: implement** `dedupe.ts`, `sources/index.ts`, store additions, market `guide`, and the `sync_autos.ts` flow above (the dry-run report also writes `sources` and per-source samples).
- [ ] **Step 4: Run** `npx vitest run tests/autos tests/appdb tests/sync` + `npx tsc -p tsconfig.production.json --noEmit` → PASS (only the known error).
- [ ] **Step 5: Live dry run (no Facebook, no DB):** `APP_MONGO_URI= AUTOS_FB_ENABLED=0 npx ts-node sync_autos.ts --dry-run --harvest-snapshot=<scratch>/autos-harvest-run2.json --report=<scratch>/autos-report-sources.json` → log shows each web source count, duplicates by source, catalog total ≈ ML + webs − duplicates. Read 20 random web rows in the report by eye (right model? right year/km/price?) and the duplicate counts per dealer; write the numbers in the ledger.
- [ ] **Step 6: Commit** `feat(autos): orquestación multi-fuente, duplicados entre fuentes y precio de referencia`

---

### Task 9: App — sources, reference and guide in the UI

**Files:**
- Modify: `app/utils/cars.ts`, `app/server/utils/cars.ts`, `app/server/api/cars/index.get.ts`, `app/server/api/cars/ficha/[key].get.ts`, `app/components/cars/{ListingCard,Filters,OpportunityCard}.vue`, `app/pages/autos-usados-uruguay/{index,[key]}.vue`, `app/pages/autos-usados-uruguay/precios/[slug].vue`, `app/pages/oportunidades-autos-usados-uruguay.vue`, `app/tests/unit/{cars,carsApi}.test.ts`
- Create: `app/components/cars/GuideTable.vue`

**Interfaces — Produces (app/utils/cars.ts):**
```ts
export const CAR_SOURCES_PUBLIC: readonly PublicCarSource[] // same order as the backend registry
export const CAR_SOURCE_RULES: Record<PublicCarSource, { name: string; permalink: RegExp; pictureHost: RegExp }> // copy of the backend registry values
export function carSafePermalink(source: PublicCarSource, url: unknown): string
export function carSafePicture(source: PublicCarSource, url: unknown): string | null
CarsQuery += source: PublicCarSource | ''   // normalizeCarsQuery, carsMatch → match.source
CarsResponse.facets += sources: CarFacet[]; coverage += 'sources'
carKeyValid: /^(?:ml-MLU\d{6,14}|fb-\d{6,20}|(?:clasiautos|julio|sda|carper|fidocar|carone)-\d{1,12})$/
```

Changes:
- `publicCarRow`: `source` = known value or `'mercadolibre'`; `sourceName` = `CAR_SOURCE_RULES[source].name`; `permalink = carSafePermalink(source, row.permalink)`; `picture = carSafePicture(source, row.picture)`; `currencyInferred: row.currencyInferred === true`; `reference` rebuilt (`priceUsd` number, `basis` 'version'|'year', `updatedAt` string) or null; add the 4 fields to `CAR_FIELDS`. Opportunity comparables: same source/permalink rules plus `source`, `sourceName`. `loadCarMarket`: `guide: Array.isArray(snapshot.guide) ? snapshot.guide : []`, `guideUpdatedAt ?? null`.
- `index.get.ts`: facet `sources` on `source` (name from `CAR_SOURCE_RULES`), coverage passes `meta.sources ?? []`.
- `ListingCard.vue`: small line `car.sourceName` under the place; when `car.currencyInferred`, the price gets `(moneda estimada)` caption.
- `Filters.vue`: `VSelect` "Fuente" with `Todas las fuentes` + facet items (only when `facets.sources.length > 1`).
- `[key].vue`: button text `Ver aviso en {{ car.sourceName }}`; table row "Fuente"; row "Referencia de la guía de Mercado Libre" = `formatCarUsd(car.reference.priceUsd)` + (basis year → " (promedio del año, todas las versiones)"); footer "Datos del aviso publicado en {{ car.sourceName }}." ; for `currencyInferred` an info alert: "El aviso no dice la moneda; la dedujimos comparando con autos iguales."; JSON-LD offer URL unchanged.
- `OpportunityCard.vue`: comparables table gets a "Fuente" column (`peer.sourceName`); "Ver aviso" → `Ver en {{ item.subject.sourceName }}`.
- `GuideTable.vue`: props `rows: PublicCarGuideYear[]`, `updatedAt: string | null`; `VTable.cu-mobile-cards` with Año / Promedio / Versiones (`name US$ price` joined with " · "); caption "Guía de precios de Mercado Libre, leída el {date}. Se calcula con los mismos avisos de Mercado Libre: sirve de segunda opinión, no de tasación."
- `precios/[slug].vue`: section "Guía de precios de Mercado Libre" when `data.market.guide.length`; intro copy says "avisos vigentes de {brand model} usado en {n} fuentes (Mercado Libre, Facebook Marketplace y webs de automotoras)" — use the fixed phrase "en Mercado Libre, Facebook Marketplace y webs de automotoras".
- `index.vue`: intro copy → "Los avisos de autos usados de Mercado Libre, Facebook Marketplace, Clasiautos y las webs de automotoras en un solo buscador…"; the "Cómo leer estos datos" list gets: sources line (from `data.coverage.sources` → "Mercado Libre 16.300 · Facebook Marketplace 410 · …", and "N avisos repetidos entre fuentes se muestran una sola vez"), and "En Facebook Marketplace la moneda a veces no está escrita: la deducimos comparando con autos iguales y lo marcamos." Meta description mentions "Mercado Libre, Facebook Marketplace y automotoras".
- `oportunidades-autos-usados-uruguay.vue`: method copy — replace any Mercado-Libre-only wording with "cada fuente"; add "Los avisos con moneda deducida nunca cuentan como oportunidad."

- [ ] **Step 1: Failing app tests.** In `app/tests/unit/cars.test.ts` add:

```ts
  it('accepts every source key shape and nothing else', () => {
    for (const key of ['ml-MLU123456', 'fb-1268374875382121', 'clasiautos-15715', 'sda-153528', 'carone-717444', 'julio-49408', 'carper-1', 'fidocar-418633'])
      expect(carKeyValid(key)).toBe(true)
    for (const key of ['fb-abc', 'x-1', 'ml-1', 'clasiautos-../x']) expect(carKeyValid(key)).toBe(false)
  })
  it('filters by source', () => {
    const query = normalizeCarsQuery({ source: 'facebook' })
    expect(query.source).toBe('facebook')
    expect(carsMatch(query, new Date('2026-09-17T00:00:00Z'), 4).source).toBe('facebook')
    expect(normalizeCarsQuery({ source: 'olx' }).source).toBe('')
  })
```

In `app/tests/unit/carsApi.test.ts` add:

```ts
  it('keeps each source on its own permalink and picture hosts', () => {
    const row = publicCarRow({ ...BASE_ROW, key: 'fb-1', source: 'facebook', permalink: 'https://www.facebook.com/marketplace/item/1268374875382121/', picture: 'https://scontent-yyz1-1.xx.fbcdn.net/v/x.jpg', currencyInferred: true, reference: { priceUsd: 5000, basis: 'year', updatedAt: '2026-09-17' } })
    expect(row).toMatchObject({ source: 'facebook', sourceName: 'Facebook Marketplace', currencyInferred: true, reference: { priceUsd: 5000, basis: 'year' } })
    expect(publicCarRow({ ...BASE_ROW, source: 'facebook', permalink: 'https://auto.mercadolibre.com.uy/MLU-1' }).permalink).toBe('')
    expect(publicCarRow({ ...BASE_ROW, source: 'clasiautos', picture: 'https://http2.mlstatic.com/x.jpg' }).picture).toBeNull()
    expect(publicCarRow({ ...BASE_ROW, source: 'nope' }).source).toBe('mercadolibre')
  })
```
(`BASE_ROW` = the existing ML row fixture in that file; rename to match its actual constant.)

- [ ] **Step 2: Run** from `app/`: `npx vitest run tests/unit/cars.test.ts tests/unit/carsApi.test.ts` → FAIL.
- [ ] **Step 3: Implement** the changes above; `npx prettier --write` every touched file; `npx eslint <files>`.
- [ ] **Step 4: Run** the two tests + `tests/unit/seoContract.test.ts tests/unit/siteNav-coverage.test.ts` and root `npx vitest run tests/autos/contracts.test.ts` → PASS.
- [ ] **Step 5: Dev check** in the worktree only (`npm run dev` in `cu-autos-fuentes/app` with `APP_MONGO_URI` pointing to local `mongodb://127.0.0.1:27017/cu-autos-verify`, seeded by a throwaway script that publishes the Task 8 dry-run report rows through `publishCarCatalog`/`publishCarMarkets`/`saveCarOpportunitySnapshot` against that local DB): directory with source filter, a Facebook row, a Clasiautos ficha with reference, Hilux price page with guide table — at 390 px and 1440 px, no console errors. Drop the local DB afterwards.
- [ ] **Step 6: Commit** `feat(autos): fuente, referencia y guía de precios en el directorio`

---

### Task 10: Docs, verification, deploy

**Files:**
- Modify: `docs/app/AUTOS.md`, `AGENTS.md` (autos row + new `currency-autos-guide` row + entrypoint list `sync_autos.ts`, `sync_autos_guide.ts`), `classes/AGENTS.md` (autos row: sources, catalog)

- [ ] **Step 1: Docs.** `AUTOS.md` gains sections "Fuentes" (table of §1 of the spec with contract and budget per source), "Facebook" (CDP, health, budgets, currency rule, what is never stored), "Duplicados", "Guía de precios" (job, planner, 404 = missing, not independent), "Diagnosticar" (`carharvestmetas` keys `uy-cars-source-<fuente>`, `uy-cars-guide`, `uy-cars-fb-wanted`; how to switch a source off).
- [ ] **Step 2: Full verification.** Root `npx vitest run` (the known `revenue_privacy` timeout is re-run alone), `npx tsc -p tsconfig.production.json --noEmit`; app `npx vitest run` and `npx eslint` on touched files.
- [ ] **Step 3: Review** the whole branch diff against spec §2–§6 and the Global Constraints (privacy: grep the public projection and app rows for `sellerId|description|name` leaks); fix findings.
- [ ] **Step 4: Integrate.** `git checkout -- app/package-lock.json`; `git fetch origin main`; `git rebase origin/main` (keep both sides on conflicts); re-run the backend and app suites touched by conflicts; ONE `git push origin HEAD:main`; `gh run watch` until green.
- [ ] **Step 5: Production.** On the VPS: `pm2 jlist` has `currency-autos-guide`; run it once by hand (`pm2 restart currency-autos-guide`) and read its log; wait for (or trigger with `pm2 restart currency-autos`) a full autos run; check its log for each source line, duplicates and Facebook `sessionLost: false`; then `https://cambio-uruguay.com/api/cars?source=facebook`, `?source=clasiautos`, a Facebook ficha, `/autos-usados-uruguay/precios/toyota-hilux` guide section, and `/api/car-opportunities` still 200.
- [ ] **Step 6: Cleanup.** Remove the worktree and branch; drop local verify DB; memory update (`autos-usados-directorio.md`).

