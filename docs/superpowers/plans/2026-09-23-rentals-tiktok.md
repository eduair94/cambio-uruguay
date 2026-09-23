# TikTok como fuente de alquileres — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** publicar en `/alquileres-uruguay` los alquileres que inmobiliarias y particulares suben a TikTok, leyendo hashtags y cuentas con el puppeteer del repo a través del proxy, y parseando la leyenda con precisión sobre recall.

**Architecture:** un sexto harvester `harvestTiktok` en `classes/rentals/sources/tiktok/` con el mismo contrato `RentalSourceResult` que los otros cinco. Parser puro de leyendas (`caption.ts`) → `RawRental` (`post.ts`); lectura de listados por navegador (`browser.ts`, calcado de `elpais_browser.ts`) y de videos sueltos por HTTP plano (`page.ts`); dos colecciones privadas (`rentaltiktokposts`, `rentaltiktokaccounts`) como memoria y auditoría; geocodificación de esquinas con la regla de aceptación de Facebook.

**Tech Stack:** TypeScript 4.9 CommonJS (root), puppeteer 24 (ya en `package.json`), mongoose vía `appModel`, vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-rentals-tiktok-design.md`

## Global Constraints

- Root compila a `target: es6` con TS 4.9: **nada de `async/await` dentro de funciones que se serializan a `page.evaluate`** (ver `elpais_browser.ts`). Sin `Object.hasOwn`, sin `Array.prototype.at`.
- Fuente nueva = `"tiktok"`; etiqueta "TikTok"; `listingId = tiktok:<videoId>`.
- Sólo la corrida completa lee; la horaria devuelve `{ ok: true, complete: false, listings: [], note: "sólo en la corrida completa" }`.
- Ningún contacto: `rentalDescription` sanea la leyenda; `agency`/`publicContact` quedan `undefined`.
- `robots.txt`: nunca `/search?`. Sólo `/tag/<tag>`, `/@user`, `/@user/video/<id>`.
- Un solo Chrome por corrida, cierre en `finally`, presupuesto de tiempo; proxy obligatorio para listar (sin proxy la corrida sigue y lo dice).
- Este repositorio es público: cero cifras de ingreso en nada versionado (no aplica aquí, pero rige).

## Review Focus

1. Leyenda con dos precios por garantía (`$24.000 con aseguradoras ✅ $25.000 con Anda`): se publica el menor y no se abstiene. Test en Task 2.
2. `Durazno y Maldonado`, `Jackson y Canelones`: calles que son departamentos. El departamento no sale de ahí; sólo de hashtag o de nombre con cue locativo. Test en Task 2.
3. `⛔️NO DISPONIBLE⛔️`, `‼️RESERVADO‼️`, `ALQUILADO EN TIEMPO RÉCORD`: rechazadas; `‼️DISPONIBLE‼️` no. Test en Task 2.
4. Presupuesto de cuentas agotado: `complete: false` y ninguna oferta caduca. Test en Task 6.
5. Cover firmado vencido / sin cover: `image: null` cuando no hay URL https válida; nunca una cadena vacía. Test en Task 3.

---

### Task 1: Tipos, etiqueta y espejos de la fuente

**Files:**
- Modify: `classes/rentals/types.ts:14-24`
- Modify: `classes/pricehistory/marketLog.ts:20`, `classes/propertyzones/project.ts:4`, `classes/propertyopportunities/types.ts:7`, `classes/propertyopportunities/analyze.ts:46`
- Modify: `app/utils/rentals.ts:67,370-376`, `app/utils/rentalAvailability.ts:3`, `app/utils/propertyOpportunities.ts:8`
- Modify: `mcp/src/rentals/types.ts:44-51`
- Modify: `app/tests/unit/rentalsCoverage.test.ts:26-36`, `app/tests/e2e/rentals.spec.ts:103-109,884-889`
- Test: `tests/rentals/tiktok.test.ts` (nuevo, primer bloque)

**Interfaces:**
- Produces: `RentalSource` incluye `"tiktok"`; `RENTAL_SOURCE_LABEL.tiktok === "TikTok"`.

- [ ] **Step 1: test de la etiqueta**

```ts
// tests/rentals/tiktok.test.ts
import { describe, expect, it } from "vitest";
import { RENTAL_SOURCES, RENTAL_SOURCE_LABEL } from "../../classes/rentals/types";

describe("TikTok is a rental source", () => {
  it("is enumerated with its label", () => {
    expect(RENTAL_SOURCES).toContain("tiktok");
    expect(RENTAL_SOURCE_LABEL.tiktok).toBe("TikTok");
  });
});
```

- [ ] **Step 2: correr y ver fallar** — `npx vitest run tests/rentals/tiktok.test.ts` → FAIL (`tiktok` no está).
- [ ] **Step 3: agregar la fuente** en `classes/rentals/types.ts`:

```ts
export type RentalSource = "mercadolibre" | "infocasas" | "facebook" | "casasweb" | "elpais" | "tiktok";
export const RENTAL_SOURCES: readonly RentalSource[] = ["mercadolibre", "infocasas", "facebook", "casasweb", "elpais", "tiktok"];
export const RENTAL_SOURCE_LABEL: Record<RentalSource, string> = { /* … */, tiktok: "TikTok" };
```

y en cada espejo (`marketLog.ts`, `propertyzones/project.ts`, `propertyopportunities/types.ts` y `analyze.ts`, `app/utils/rentals.ts`, `rentalAvailability.ts`, `propertyOpportunities.ts`, `mcp/src/rentals/types.ts`) sumar `"tiktok"` / `tiktok: "TikTok"` al final de la lista.

- [ ] **Step 4: tests del app que fijan la lista** — `app/tests/unit/rentalsCoverage.test.ts` espera `[..., { key: 'casasweb', properties: 1 }]` → agregar `{ key: 'tiktok', properties: 0 }` al final. `app/tests/e2e/rentals.spec.ts`: `fixtureCoverage.sources` suma `{ key: 'tiktok', properties: 12 }` y `expectedSources` suma `['tiktok', 'TikTok', '12 resultados']`.
- [ ] **Step 5: correr** — `npx vitest run tests/rentals/tiktok.test.ts` (root) y `cd app && npx vitest run tests/unit/rentalsCoverage.test.ts tests/unit/rentalSourceStatus.test.ts` → PASS.
- [ ] **Step 6: commit** — `git commit -m "feat(rentals): tiktok es una fuente del directorio (tipos y espejos)"`.

---

### Task 2: Parser puro de leyendas (`caption.ts`)

**Files:**
- Create: `classes/rentals/sources/tiktok/caption.ts`
- Create: `tests/rentals/fixtures/tiktok-captions.json`
- Test: `tests/rentals/tiktok.test.ts`

**Interfaces:**
- Produces:

```ts
export interface CaptionFacts {
  title: string;
  rejected: string | null;                   // motivo, o null si es publicable
  price: number | null; currency: RentalCurrency | null;
  commonExpenses: number | null; commonExpensesCurrency: RentalCurrency | null;
  propertyType: RentalPropertyType;
  department: string; neighborhood: string;
  bedrooms: number | null; bathrooms: number | null; area: number | null;
  addressCandidates: string[];
  guarantees: RentalGuarantee[];
}
export function parseCaption(lines: readonly string[], hashtags: readonly string[]): CaptionFacts;
export function captionTitle(lines: readonly string[]): string;
export function captionAmounts(text: string): { price: number | null; currency: RentalCurrency | null; commonExpenses: number | null; commonExpensesCurrency: RentalCurrency | null; ambiguous: boolean };
export function captionLocation(text: string, hashtags: readonly string[]): { department: string; neighborhood: string };
export function captionPropertyType(title: string, text: string): RentalPropertyType;
export function captionRejection(text: string): string | null;
```

- [ ] **Step 1: fixture** `tests/rentals/fixtures/tiktok-captions.json` — leyendas reales capturadas el 2026-09-23 (id, author, createTime, desc, hashtags) — las 15 elegidas abajo, verbatim de la captura (`scratchpad/tiktok-items.json`):
  `7688511584326454549` (Gaboto y La Paz, $22.000, GC $1.850, Cordón/Aguada), `7684347053853445397` (Pocitos monoambiente, Precio: $25.000, GC $4.900, cochera), `7677263722120842517` ($24.000 con aseguradoras / $25.000 con Anda), `7673622265199676693` ($19.000 Porto / $20.000 Anda), `7685857708834245908` (Buenos Aires y Rambla, 45 m², cochera opcional $3.500–$4.000, Alquiler: $29.500, GC: $6.000), `7675131286196849941` (Emilio Frugoni entre Durazno y Maldonado, $43.000, 3 dorm 2 baños), `7673654750243589396` (Jackson y Canelones, Alquiler: $25.500), `7686209173708688661` (casa Punta Carretas, Sin gastos comunes, Alquiler $49.000), `7679135522408746261` (NO DISPONIBLE), `7485408122287213879` (RESERVADO), `7641681054167862548` (Alquiler Centro 3 habitaciones, $39.000 + GC), `7593048064441470219` (DISPONIBLE, sin precio), `7670918879937432839` (💲22.000, La Unión, hashtag montevideo), `7680743292232797447` (Cerrito de la Victoria, $21.000 alquiler), `7278750140763000070` (sólo hashtags).
- [ ] **Step 2: tests** (agregar a `tests/rentals/tiktok.test.ts`):

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { captionAmounts, captionLocation, captionPropertyType, captionRejection, captionTitle, parseCaption } from "../../classes/rentals/sources/tiktok/caption";

interface Fixture { id: string; desc: string; hashtags: string[] }
const captions: Fixture[] = JSON.parse(readFileSync(join(__dirname, "fixtures", "tiktok-captions.json"), "utf8"));
const byId = (id: string): Fixture => captions.find(row => row.id === id)!;
const facts = (id: string) => { const row = byId(id); return parseCaption(row.desc.split("\n"), row.hashtags); };

describe("TikTok caption amounts", () => {
  it("separates rent from gastos comunes and ignores garages, deposits and guarantee variants", () => {
    expect(captionAmounts(byId("7688511584326454549").desc)).toMatchObject({ price: 22000, currency: "UYU", commonExpenses: 1850, commonExpensesCurrency: "UYU", ambiguous: false });
    expect(captionAmounts(byId("7685857708834245908").desc)).toMatchObject({ price: 29500, commonExpenses: 6000 });
    expect(captionAmounts(byId("7684347053853445397").desc)).toMatchObject({ price: 25000, commonExpenses: 4900 });
  });
  it("publishes the LOWEST rent when the price depends on the guarantee", () => {
    expect(captionAmounts(byId("7677263722120842517").desc)).toMatchObject({ price: 24000, commonExpenses: 3170 });
    expect(captionAmounts(byId("7673622265199676693").desc)).toMatchObject({ price: 19000, commonExpenses: 1800 });
  });
  it("reads 'sin gastos comunes' as zero, a labelled amount without a symbol as pesos, and 💲 as $", () => {
    expect(captionAmounts(byId("7686209173708688661").desc)).toMatchObject({ price: 49000, commonExpenses: 0 });
    expect(captionAmounts("CASA EN ALQUILER PRECIO:42.000 No paga gastos comunes")).toMatchObject({ price: 42000, currency: "UYU", commonExpenses: 0 });
    expect(captionAmounts(byId("7670918879937432839").desc)).toMatchObject({ price: 22000, commonExpenses: 0 });
  });
  it("abstains on two different unlabelled amounts and on no amount at all", () => {
    expect(captionAmounts("Alquiler apto $18.000 hermoso $21.000 consultar")).toMatchObject({ price: null, ambiguous: true });
    expect(captionAmounts(byId("7278750140763000070").desc)).toMatchObject({ price: null, ambiguous: false });
    expect(captionAmounts("Alquiler U$S 900 mensuales gastos comunes U$S 120")).toMatchObject({ price: 900, currency: "USD", commonExpenses: 120, commonExpensesCurrency: "USD" });
    expect(captionAmounts("Alquiler $ 39.000 + GC")).toMatchObject({ price: 39000, commonExpenses: null });
  });
});

describe("TikTok caption rejection", () => {
  it.each([
    ["7679135522408746261", "no disponible"],
    ["7485408122287213879", "reservado"],
  ])("%s → %s", (id, reason) => expect(captionRejection(byId(id).desc)).toBe(reason));
  it("rejects rented, transferred, sale and wanted adverts, but not 'DISPONIBLE'", () => {
    expect(captionRejection("🔵 ¡ALQUILADO EN TIEMPO RÉCORD! 🏡 ¿Buscás algo similar?")).toBe("alquilado");
    expect(captionRejection("🏠 ¡TRASPASO MI APARTAMENTO EN POCITOS! $25.000")).toBe("traspaso");
    expect(captionRejection("Casa en venta Carrasco U$S 350.000")).toBe("venta");
    expect(captionRejection("Busco apartamento en alquiler en Pocitos")).toBe("busco");
    expect(captionRejection("Alquiler temporario por día Punta del Este")).toBe("temporal");
    expect(captionRejection(byId("7593048064441470219").desc)).toBeNull();
    expect(captionRejection("Sólo hashtags #alquiler #montevideo")).toBeNull();
  });
});

describe("TikTok caption location", () => {
  it("never reads a department out of a street corner", () => {
    expect(captionLocation(byId("7675131286196849941").desc, byId("7675131286196849941").hashtags)).toEqual({ department: "Montevideo", neighborhood: "Palermo" });
    expect(captionLocation(byId("7673654750243589396").desc, byId("7673654750243589396").hashtags)).toEqual({ department: "Montevideo", neighborhood: "Cordón" });
  });
  it("takes the department from a hashtag, and the barrio from text or from a hashtag", () => {
    expect(captionLocation(byId("7670918879937432839").desc, byId("7670918879937432839").hashtags)).toEqual({ department: "Montevideo", neighborhood: "La Unión" });
    expect(captionLocation("Apto 2 dormitorios", ["alquilerpocitos"])).toEqual({ department: "Montevideo", neighborhood: "Pocitos" });
    expect(captionLocation("Alquiler en Piriápolis casa 2 dormitorios", [])).toEqual({ department: "Maldonado", neighborhood: "Piriápolis" });
  });
  it("abstains on two departments and on a generic name without a cue", () => {
    expect(captionLocation("Alquiler en Maldonado y en Canelones", ["montevideo", "maldonado"])).toEqual({ department: "", neighborhood: "" });
    expect(captionLocation("Alquiler Centro 📍 3 habitaciones", ["alquiler"])).toEqual({ department: "", neighborhood: "" });
    expect(captionLocation("Alquiler en Centro", ["montevideo"])).toEqual({ department: "Montevideo", neighborhood: "Centro" });
  });
});

describe("TikTok caption title and type", () => {
  it("uses the first line without emojis, bullets or hashtags", () => {
    expect(captionTitle(["🤩 Alquiler Pocitos – Monoambiente con cochera", "✅ 26 de Marzo"])).toBe("Alquiler Pocitos – Monoambiente con cochera");
    expect(captionTitle([byId("7688511584326454549").desc])).toBe("ALQUILER 2 DORMITORIOS BARATO, MUY ECONÓMICO");
    expect(captionTitle(["#alquiler #montevideo"])).toBe("");
  });
  it("does not turn '3 habitaciones' into a room rental", () => {
    expect(captionPropertyType("Alquiler Centro", byId("7641681054167862548").desc)).toBe("otro");
    expect(captionPropertyType("Alquiler Pocitos – Monoambiente con cochera", "")).toBe("apartamento");
    expect(captionPropertyType("Alquiler 2 dormitorios, Punta Carretas", byId("7686209173708688661").desc)).toBe("casa");
    expect(captionPropertyType("Habitación en alquiler en casa compartida", "")).toBe("habitacion");
  });
  it("parses the example advert end to end", () => {
    expect(facts("7688511584326454549")).toMatchObject({
      rejected: null, price: 22000, currency: "UYU", commonExpenses: 1850, propertyType: "apartamento",
      department: "Montevideo", neighborhood: "Cordón", bedrooms: 2, bathrooms: 1, area: null,
      addressCandidates: ["Gaboto y La Paz"],
    });
    expect(facts("7688511584326454549").guarantees).toContain("aseguradora");
    expect(facts("7278750140763000070").rejected).toBe("sin precio");
    expect(facts("7679135522408746261").rejected).toBe("no disponible");
  });
});
```

- [ ] **Step 3: correr y ver fallar** (módulo inexistente).
- [ ] **Step 4: implementar** `classes/rentals/sources/tiktok/caption.ts`:

```ts
// What a TikTok caption SAYS about a rental, and nothing it does not.
//
// The caption is the whole advert: there is no structured price, no type dropdown, no address
// field. Everything here is text, so every rule is precision-first — an abstention costs one
// advert, a wrong price poisons a median.
import { addressCandidates } from "../../facebookDetail";
import { guaranteesFromText, type RentalGuarantee } from "../../guarantees";
import { KNOWN_NEIGHBORHOODS, neighborhoodFromText } from "../../neighborhoods";
import { DEPARTMENTS, canonicalDepartment, flatten, inferPropertyType, looksLikeRentalAdvert, parseAttributes, parseMoney } from "../../normalize";
import type { RentalCurrency, RentalPropertyType } from "../../types";

export interface CaptionFacts { /* como en Interfaces */ }

const EMOJI = /[\p{Extended_Pictographic}️‍]/gu;
const BULLET_SPLIT = /\s*(?:[✅🔹▪️•▫️🔸➡️👉📍💰💲🛏️🚿🧾📑📲📞❗️‼️⛔️🔑🏡🏠🤩❤️✨🎥🔥🌳🐶]|\s[–—|]\s)\s*/u;

/** The first line of the caption, without emojis, bullets and hashtags; "" when there is none. */
export function captionTitle(lines: readonly string[]): string {
  for (const raw of lines) {
    const first = raw.split(BULLET_SPLIT).map(part => part.replace(EMOJI, "").replace(/#\S+/g, "").replace(/\s+/g, " ").trim()).find(part => /[a-záéíóúñ]{3}/i.test(part));
    if (first) return first.replace(/[\s:–—-]+$/g, "").slice(0, 120);
  }
  return "";
}

const NEGATED = /\bno\s+disponible\b/i;
export function captionRejection(text: string): string | null {
  const flat = flatten(text);
  if (NEGATED.test(flat)) return "no disponible";
  if (/\breservad[oa]\b/.test(flat)) return "reservado";
  if (/\balquilad[oa]s?\b/.test(flat)) return "alquilado";
  if (/\btraspaso\b/.test(flat)) return "traspaso";
  if (/\b(busco|buscamos|necesito|solicito)\b/.test(flat) && !/\b(buscas|buscás|busca un|buscando)\b/.test(flat)) return "busco";
  if (/\b(vendo|venta|se vende|permuta|remato)\b/.test(flat) && !/\balquil/.test(flat)) return "venta";
  if (!looksLikeRentalAdvert(text)) return "temporal";
  return null;
}

// --- Amounts ---------------------------------------------------------------------------------

interface Amount { value: number; currency: RentalCurrency | null; role: "price" | "gc" | "variant" | "ignore" | "plain" }

const USD = /(?:u\$s|us\$|usd|u\$d|d[oó]lares)/i;
const AMOUNT = /(?:(u\$s|us\$|usd|u\$d|\$u|\$)\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,6})(?:\s*(pesos|d[oó]lares|usd|u\$s))?/giu;
const GC_LABEL = /\b(?:gastos\s+comunes|gastos\s+c\b|g\.?\s?c\.?|expensas|gc)\b/i;
const IGNORE_LABEL = /\b(?:dep[oó]sito|se[ñn]a|comisi[oó]n|honorarios|cochera|garaje|garage|estacionamiento|extra|adelantad[oa]|luz|agua|ute|ose|internet|wifi|tributos?|contribuci[oó]n|m2|m²|metros|a[ñn]os?|meses)\b/i;
const PRICE_LABEL = /\b(?:precio|alquiler|arriendo|mensual(?:es)?|por\s+mes|al\s+mes|renta|valor)\b/i;
const VARIANT_LABEL = /\b(?:anda|cgn|contadur[ií]a|porto|aseguradoras?|sura|mapfre|surco|fideciu|sancor|con\s+garant[ií]a)\b/i;

export function captionAmounts(text: string) {
  const source = text.replace(/💲/g, "$").replace(/\$\s*U\b/gi, "$");
  const amounts: Amount[] = [];
  for (const match of source.matchAll(AMOUNT)) {
    const [, symbol = "", digits, word = ""] = match;
    const value = parseMoney(digits);
    if (value === null) continue;
    const before = source.slice(Math.max(0, match.index! - 34), match.index!);
    const after = source.slice(match.index! + match[0].length, match.index! + match[0].length + 28);
    const currency: RentalCurrency | null = USD.test(symbol) || USD.test(word) ? "USD" : symbol || /pesos/i.test(word) ? "UYU" : null;
    const role: Amount["role"] = GC_LABEL.test(before) || GC_LABEL.test(after.slice(0, 12)) ? "gc"
      : IGNORE_LABEL.test(before) || IGNORE_LABEL.test(after.slice(0, 14)) ? "ignore"
      : VARIANT_LABEL.test(before) || VARIANT_LABEL.test(after) ? "variant"
      : PRICE_LABEL.test(before) ? "price"
      : "plain";
    // A bare number without a currency mark is money only when its label says so.
    if (!currency && role !== "price" && role !== "gc") continue;
    amounts.push({ value, currency: currency ?? "UYU", role });
  }
  const gc = amounts.find(amount => amount.role === "gc");
  const noGc = /\b(?:sin|no\s+(?:paga|tiene|abona)|libre\s+de)\s+(?:gastos\s+comunes|gc|expensas)\b/i.test(source);
  const labelled = amounts.filter(amount => amount.role === "price");
  const plain = amounts.filter(amount => amount.role === "plain");
  const variants = amounts.filter(amount => amount.role === "variant");
  const distinct = (list: Amount[]) => [...new Set(list.map(amount => `${amount.currency}:${amount.value}`))];
  let chosen: Amount | undefined;
  let ambiguous = false;
  const min = (list: Amount[]) => list.reduce((best, amount) => (amount.value < best.value ? amount : best));
  if (labelled.length) chosen = min(labelled);
  else if (distinct(plain).length === 1) chosen = plain[0];
  else if (plain.length > 1) ambiguous = true;
  else if (variants.length) chosen = min(variants);
  return {
    price: chosen?.value ?? null, currency: chosen?.currency ?? null,
    commonExpenses: gc ? gc.value : noGc ? 0 : null,
    commonExpensesCurrency: gc ? gc.currency : noGc ? (chosen?.currency ?? "UYU") : null,
    ambiguous,
  };
}

// --- Location --------------------------------------------------------------------------------

const HASHTAG_PREFIX = /^(?:alquiler(?:es)?|alquilo|alquilar|apartamentos?|apto|casas?|inmobiliaria|propiedades|inmuebles|venta)?/;
const HASHTAG_SUFFIX = /(?:uruguay|uy|montevideo)?$/;
const departmentKeys = new Map(DEPARTMENTS.map(name => [flatten(name).replace(/\s+/g, ""), name]));
const neighborhoodKeys: Array<[string, string, string]> = Object.entries(KNOWN_NEIGHBORHOODS)
  .flatMap(([department, names]) => names.map(name => [flatten(name).replace(/\s+/g, ""), name, department] as [string, string, string]))
  .filter(([key]) => key.length >= 5);

/** `#alquilermontevideo` → Montevideo; `#alquilerpocitos` / `#pocitosmontevideo` → "Pocitos". */
export function hashtagEvidence(hashtags: readonly string[]): { departments: Set<string>; neighborhoods: string[] } {
  const departments = new Set<string>();
  const neighborhoods: string[] = [];
  for (const raw of hashtags) {
    const tag = flatten(raw).replace(/[^a-z0-9]/g, "");
    if (!tag) continue;
    const core = tag.replace(HASHTAG_PREFIX, "").replace(HASHTAG_SUFFIX, "");
    if (core && departmentKeys.has(core)) { departments.add(departmentKeys.get(core)!); continue; }
    if (tag === "montevideo" || core === "montevideo") { departments.add("Montevideo"); continue; }
    const hit = neighborhoodKeys.find(([key]) => core === key || tag === key);
    if (hit) neighborhoods.push(hit[1]);
  }
  return { departments, neighborhoods };
}

const DEPARTMENT_CUE = /\b(?:en|de|zona|departamento|ciudad|dpto)\s+$/;
const CORNER_AFTER = /^\s*(?:y|e|esq|esquina|casi|entre)\b/;

/** Departments the text names with a locative cue and not as a street ("Durazno y Maldonado"). */
function departmentsInText(text: string): Set<string> {
  const flat = flatten(text);
  const found = new Set<string>();
  for (const name of DEPARTMENTS) {
    const key = flatten(name);
    const pattern = new RegExp(`(^|[^a-z0-9])${key.replace(/\s+/g, "\\s+")}(?![a-z0-9])`, "g");
    for (const match of flat.matchAll(pattern)) {
      const before = flat.slice(0, match.index! + match[1].length);
      const after = flat.slice(match.index! + match[0].length);
      if (!DEPARTMENT_CUE.test(before) || CORNER_AFTER.test(after)) continue;
      found.add(canonicalDepartment(name));
    }
  }
  return found;
}

export function captionLocation(text: string, hashtags: readonly string[]): { department: string; neighborhood: string } {
  const evidence = hashtagEvidence(hashtags);
  const departments = new Set([...departmentsInText(text), ...evidence.departments]);
  const department = departments.size === 1 ? [...departments][0]! : "";
  if (departments.size > 1) return { department: "", neighborhood: "" };
  const corpus = `${text}\n${evidence.neighborhoods.join(" · ")}`;
  const named = neighborhoodFromText(corpus, department);
  return { department: department || named?.department || "", neighborhood: named?.neighborhood || "" };
}

// --- Type ------------------------------------------------------------------------------------

export function captionPropertyType(title: string, text: string): RentalPropertyType {
  const flat = flatten(`${title}\n${text}`);
  if (/\b(?:habitaci[oó]n(?:es)?\s+(?:en|para|disponible)|pensi[oó]n|cuarto|pieza|compartid[oa]|coliving|residencia estudiantil)\b/.test(flat)) return "habitacion";
  const byTitle = inferPropertyType(title);
  if (byTitle !== "otro" && byTitle !== "habitacion") return byTitle;
  if (/\b(?:apartamento|apto|apart|monoambiente|duplex|penthouse|loft)\b/.test(flat)) return "apartamento";
  if (/\b(?:casa|chalet|chacra|quinta)\b/.test(flat)) return "casa";
  const byText = inferPropertyType(text);
  return byText === "habitacion" ? "otro" : byText;
}

// --- Everything ------------------------------------------------------------------------------

export function parseCaption(lines: readonly string[], hashtags: readonly string[]): CaptionFacts {
  const text = lines.join("\n");
  const title = captionTitle(lines);
  const amounts = captionAmounts(text);
  const location = captionLocation(text, hashtags);
  const attributes = parseAttributes([text]);
  const rejected = captionRejection(text)
    ?? (!/\b(?:alquil|arriend)/.test(flatten(text)) ? "sin verbo de alquiler" : null)
    ?? (amounts.ambiguous ? "precio ambiguo" : amounts.price === null ? "sin precio" : null);
  return {
    title, rejected,
    price: amounts.price, currency: amounts.currency,
    commonExpenses: amounts.commonExpenses, commonExpensesCurrency: amounts.commonExpensesCurrency,
    propertyType: captionPropertyType(title, text),
    department: location.department, neighborhood: location.neighborhood,
    bedrooms: attributes.bedrooms, bathrooms: attributes.bathrooms, area: attributes.area,
    addressCandidates: addressCandidates(text),
    guarantees: guaranteesFromText(text),
  };
}
```

- [ ] **Step 5: correr** hasta verde; ajustar regex contra el fixture, nunca el fixture contra el regex.
- [ ] **Step 6: commit** — `feat(rentals/tiktok): parser de leyendas con precisión sobre recall`.

---

### Task 3: Post normalizado y `RawRental` (`post.ts`)

**Files:**
- Create: `classes/rentals/sources/tiktok/post.ts`
- Test: `tests/rentals/tiktok.test.ts`

**Interfaces:**
- Produces:

```ts
export interface TiktokPost { id: string; lines: string[]; createTime: number; author: { uniqueId: string; nickname: string; secUid: string }; cover: string | null; hashtags: string[] }
export function postFromItemStruct(raw: unknown): TiktokPost | null;       // item_list / video-detail itemStruct
export function postUrl(post: TiktokPost): string;
export interface PostGeo { latitude: number; longitude: number; neighborhood?: string }
export function postToRawRental(post: TiktokPost, facts: CaptionFacts, geo: PostGeo | null, observedAt: string): RawRental | null;
```

- [ ] **Step 1: tests**

```ts
import { postFromItemStruct, postToRawRental, postUrl } from "../../classes/rentals/sources/tiktok/post";
import { parseCaption } from "../../classes/rentals/sources/tiktok/caption";

const item = (over: Record<string, unknown> = {}) => ({
  id: "7688511584326454549", desc: byId("7688511584326454549").desc, createTime: "1790121112",
  author: { uniqueId: "inmobiliariaalquilar", nickname: "Inmobiliaria Alquilar Mvd", secUid: "MS4wLjAB" },
  video: { cover: "https://p16-common-sign.tiktokcdn.com/x~tplv.image?x-expires=1790330400" },
  textExtra: byId("7688511584326454549").hashtags.map(hashtagName => ({ hashtagName, type: 1 })),
  contents: [{ desc: "🏠 ALQUILER 2 DORMITORIOS BARATO, MUY ECONÓMICO" }, { desc: "🔹📍 Gaboto y La Paz" }],
  ...over,
});

describe("TikTok post → RawRental", () => {
  it("normalises an itemStruct: lines from contents, hashtags from textExtra, cover, author", () => {
    const post = postFromItemStruct(item())!;
    expect(post).toMatchObject({ id: "7688511584326454549", createTime: 1790121112, author: { uniqueId: "inmobiliariaalquilar" }, hashtags: ["alquiler", "apartamento", "cordón", "aguada", "alquilar"] });
    expect(post.lines[0]).toBe("🏠 ALQUILER 2 DORMITORIOS BARATO, MUY ECONÓMICO");
    expect(postUrl(post)).toBe("https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549");
    expect(postFromItemStruct(item({ contents: undefined }))!.lines).toEqual([byId("7688511584326454549").desc]);
    expect(postFromItemStruct({ id: "1" })).toBeNull();
    expect(postFromItemStruct(item({ author: { uniqueId: "" } }))).toBeNull();
  });
  it("builds the offer: sanitized description without the phone, real publish date, guarantees, no contacts", () => {
    const post = postFromItemStruct(item())!;
    const row = postToRawRental(post, parseCaption(post.lines, post.hashtags), null, "2026-09-23T10:00:00.000Z")!;
    expect(row).toMatchObject({
      source: "tiktok", listingId: "tiktok:7688511584326454549", url: postUrl(post), price: 22000, currency: "UYU",
      commonExpenses: 1850, commonExpensesCurrency: "UYU", propertyType: "apartamento", department: "Montevideo", neighborhood: "Cordón",
      bedrooms: 2, bathrooms: 1, address: "", street: "", streetNumber: "", latitude: null, longitude: null,
      publishedAt: "2026-09-22", sellerName: "Inmobiliaria Alquilar Mvd", sellerType: "desconocido", petsAllowed: null, furnished: null, parkingSpaces: null,
      image: "https://p16-common-sign.tiktokcdn.com/x~tplv.image?x-expires=1790330400",
    });
    expect(row.description).not.toContain("099");
    expect(row.details?.description).not.toContain("232 050");
    expect(row.details?.images).toEqual([row.image]);
    expect(row.guarantees).toContain("aseguradora");
    expect(row.agency).toBeUndefined();
    expect(row.publicContact).toBeUndefined();
  });
  it("takes a validated corner coordinate and its INE barrio when the text named none", () => {
    const post = postFromItemStruct(item({ desc: "Alquiler 2 dormitorios 📍 Gaboto y La Paz $22.000", contents: undefined, textExtra: [] }))!;
    const row = postToRawRental(post, parseCaption(post.lines, post.hashtags), { latitude: -34.9, longitude: -56.18, neighborhood: "Cordón" }, "2026-09-23T10:00:00.000Z")!;
    expect(row).toMatchObject({ latitude: -34.9, longitude: -56.18, neighborhood: "Cordón", department: "Montevideo" });
  });
  it("returns null for a rejected caption and null image for a missing or non-https cover", () => {
    const post = postFromItemStruct(item({ desc: "⛔️NO DISPONIBLE⛔️ Alquiler $20.000", contents: undefined }))!;
    expect(postToRawRental(post, parseCaption(post.lines, post.hashtags), null, "2026-09-23T10:00:00.000Z")).toBeNull();
    const bare = postFromItemStruct(item({ video: { cover: "" } }))!;
    expect(postToRawRental(bare, parseCaption(bare.lines, bare.hashtags), null, "2026-09-23T10:00:00.000Z")!.image).toBeNull();
  });
});
```

- [ ] **Step 2: correr y ver fallar.**
- [ ] **Step 3: implementar** `post.ts`:

```ts
import { advertiserClassification, ownerDirectDeclaration } from "../../advertiser";
import { rentalDescription, rentalOfferDetails } from "../../details";
import type { RawRental } from "../../types";
import type { CaptionFacts } from "./caption";

export interface TiktokPost { id: string; lines: string[]; createTime: number; author: { uniqueId: string; nickname: string; secUid: string }; cover: string | null; hashtags: string[] }
export interface PostGeo { latitude: number; longitude: number; neighborhood?: string }

const text = (value: unknown, max = 4_000): string => (typeof value === "string" ? value.slice(0, max).trim() : "");
const HTTPS = /^https:\/\/[^\s"'<>]+$/;

export function postFromItemStruct(raw: unknown): TiktokPost | null {
  const item = raw as { id?: unknown; desc?: unknown; createTime?: unknown; author?: { uniqueId?: unknown; nickname?: unknown; secUid?: unknown }; video?: { cover?: unknown; originCover?: unknown }; textExtra?: unknown; contents?: unknown } | null;
  const id = text(item?.id, 32);
  const uniqueId = text(item?.author?.uniqueId, 80);
  const createTime = Number(item?.createTime);
  if (!/^\d{6,25}$/.test(id) || !/^[\w.-]{1,80}$/.test(uniqueId) || !Number.isFinite(createTime) || createTime <= 0) return null;
  const desc = text(item?.desc);
  const contents = Array.isArray(item?.contents) ? item!.contents.map(part => text((part as { desc?: unknown })?.desc)).filter(Boolean) : [];
  const lines = contents.length ? contents : desc ? [desc] : [];
  const hashtags = Array.isArray(item?.textExtra)
    ? item!.textExtra.map(tag => text((tag as { hashtagName?: unknown })?.hashtagName, 80)).filter(Boolean)
    : [];
  const cover = [item?.video?.cover, item?.video?.originCover].map(value => text(value, 2_048)).find(value => HTTPS.test(value)) ?? null;
  return { id, lines, createTime: Math.floor(createTime), author: { uniqueId, nickname: text(item?.author?.nickname, 120) || uniqueId, secUid: text(item?.author?.secUid, 200) }, cover, hashtags };
}

export const postUrl = (post: TiktokPost): string => `https://www.tiktok.com/@${post.author.uniqueId}/video/${post.id}`;

export function postToRawRental(post: TiktokPost, facts: CaptionFacts, geo: PostGeo | null, observedAt: string): RawRental | null {
  if (facts.rejected || facts.price === null || !facts.currency) return null;
  const body = post.lines.join("\n");
  const url = postUrl(post);
  const title = facts.title || `Alquiler en TikTok (@${post.author.uniqueId})`;
  const description = rentalDescription(body, 4_000);
  const neighborhood = facts.neighborhood || geo?.neighborhood || "";
  const department = facts.department || (geo?.neighborhood ? "Montevideo" : "");
  return {
    source: "tiktok", listingId: `tiktok:${post.id}`, url, title,
    price: facts.price, currency: facts.currency,
    commonExpenses: facts.commonExpenses, commonExpensesCurrency: facts.commonExpensesCurrency,
    sellerName: post.author.nickname || post.author.uniqueId,
    sellerType: advertiserClassification({ title, description: body }).sellerType,
    ownerDirect: ownerDirectDeclaration({ title, description: body }, url, observedAt) ?? undefined,
    image: post.cover,
    publishedAt: new Date(post.createTime * 1000).toISOString().slice(0, 10),
    propertyType: facts.propertyType, department, neighborhood,
    address: "", street: "", streetNumber: "",
    latitude: geo?.latitude ?? null, longitude: geo?.longitude ?? null,
    bedrooms: facts.bedrooms, bathrooms: facts.bathrooms, area: facts.area,
    parkingSpaces: null, furnished: null, petsAllowed: null,
    guarantees: facts.guarantees,
    description,
    details: rentalOfferDetails({ description: body, images: post.cover ? [post.cover] : [] }),
  };
}
```

- [ ] **Step 4: correr → PASS.** **Step 5: commit** — `feat(rentals/tiktok): del itemStruct al RawRental`.

---

### Task 4: Página de video por HTTP y resolución de `vt.tiktok.com` (`page.ts`)

**Files:**
- Create: `classes/rentals/sources/tiktok/page.ts`
- Create: `tests/rentals/fixtures/tiktok-video.html` (recorte: `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">{"__DEFAULT_SCOPE__":{"webapp.video-detail":{"itemInfo":{"itemStruct":{…el item del ejemplo…}}}}}</script>`)
- Test: `tests/rentals/tiktok.test.ts`

**Interfaces:**
- Produces:

```ts
export function postFromVideoHtml(html: string): TiktokPost | null;
export function canonicalVideoUrl(url: string): string | null;                    // ya canónica → misma; otra cosa → null
export async function resolveTiktokUrl(url: string, fetchImpl?: typeof fetch): Promise<string | null>;   // vt.tiktok.com/… → canónica
export async function readVideoPage(url: string, fetchTextImpl?: typeof fetchText): Promise<TiktokPost | null>;
export const TIKTOK_HEADERS: Record<string, string>;   // UA de navegador + x-cambio-uruguay-bot + accept-language
```

- [ ] **Step 1: tests**

```ts
import { canonicalVideoUrl, postFromVideoHtml, readVideoPage, resolveTiktokUrl } from "../../classes/rentals/sources/tiktok/page";
import { fetchText } from "../../classes/rentals/net";
vi.mock("../../classes/rentals/net", async () => ({ ...(await vi.importActual<typeof import("../../classes/rentals/net")>("../../classes/rentals/net")), fetchText: vi.fn() }));

describe("TikTok video page over plain HTTP", () => {
  it("reads the embedded itemStruct", () => {
    const post = postFromVideoHtml(fixture("tiktok-video"))!;
    expect(post).toMatchObject({ id: "7688511584326454549", author: { uniqueId: "inmobiliariaalquilar" } });
    expect(postFromVideoHtml("<html>Please wait...</html>")).toBeNull();
  });
  it("only accepts canonical video URLs and resolves short links by following the redirect", async () => {
    expect(canonicalVideoUrl("https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549?_r=1")).toBe("https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549");
    expect(canonicalVideoUrl("https://www.tiktok.com/search?q=alquiler")).toBeNull();
    const redirect = vi.fn(async () => new Response(null, { status: 301, headers: { location: "https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549?_r=1&_t=x" } }));
    expect(await resolveTiktokUrl("https://vt.tiktok.com/ZSbJ6eN9S/", redirect as unknown as typeof fetch)).toBe("https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549");
    expect(redirect.mock.calls[0]![1]).toMatchObject({ redirect: "manual" });
    expect(await resolveTiktokUrl("https://example.com/x", redirect as unknown as typeof fetch)).toBeNull();
  });
  it("readVideoPage goes through fetchText with the identifying header and returns null on a challenge", async () => {
    vi.mocked(fetchText).mockResolvedValueOnce(fixture("tiktok-video"));
    expect((await readVideoPage("https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549"))?.id).toBe("7688511584326454549");
    expect(vi.mocked(fetchText).mock.calls[0]![1]?.headers).toMatchObject({ "x-cambio-uruguay-bot": "CambioUruguayBot/1.0" });
    vi.mocked(fetchText).mockResolvedValueOnce("<html>Please wait...</html>");
    expect(await readVideoPage("https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549")).toBeNull();
  });
});
```

- [ ] **Step 2: correr y ver fallar.**
- [ ] **Step 3: implementar** `page.ts`:

```ts
// One TikTok video over plain HTTP: the page embeds the same itemStruct the list API serves.
// Measured 2026-09-23 from the VPS: 200, 450 KB, no proxy needed. The profile page is behind a
// WAF challenge and the tag page lists nothing without a browser — those live in browser.ts.
import { fetchText } from "../../net";
import { postFromItemStruct, type TiktokPost } from "./post";

export const TIKTOK_HEADERS: Record<string, string> = {
  "user-agent": process.env.RENTALS_TIKTOK_USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "accept-language": "es-UY,es;q=0.9",
  "x-cambio-uruguay-bot": "CambioUruguayBot/1.0",
};
const VIDEO = /^https:\/\/www\.tiktok\.com\/@([\w.-]{1,80})\/video\/(\d{6,25})(?:[/?#]|$)/;
const SHORT = /^https:\/\/(?:vt|vm|www)\.tiktok\.com\/(?:t\/)?[\w-]{5,20}\/?(?:[?#]|$)/;

export function canonicalVideoUrl(url: string): string | null {
  const match = VIDEO.exec(String(url || "").trim());
  return match ? `https://www.tiktok.com/@${match[1]}/video/${match[2]}` : null;
}

export async function resolveTiktokUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const direct = canonicalVideoUrl(url);
  if (direct) return direct;
  if (!SHORT.test(String(url || "").trim())) return null;
  try {
    const response = await fetchImpl(url, { method: "HEAD", redirect: "manual", headers: TIKTOK_HEADERS, signal: AbortSignal.timeout(15_000) });
    return canonicalVideoUrl(response.headers.get("location") || "");
  } catch { return null; }
}

export function postFromVideoHtml(html: string): TiktokPost | null {
  const match = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/.exec(html || "");
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]!) as { __DEFAULT_SCOPE__?: { "webapp.video-detail"?: { itemInfo?: { itemStruct?: unknown } } } };
    return postFromItemStruct(data.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct);
  } catch { return null; }
}

export async function readVideoPage(url: string, fetchTextImpl: typeof fetchText = fetchText): Promise<TiktokPost | null> {
  const canonical = canonicalVideoUrl(url);
  if (!canonical) return null;
  const html = await fetchTextImpl(canonical, { headers: TIKTOK_HEADERS, timeoutMs: 30_000, retries: 1 });
  return html ? postFromVideoHtml(html) : null;
}
```

Nota: `fetchText` mete su propia UA salvo que `headers` traiga `user-agent`; comprobar en `net.ts` que los headers del caller pisan la UA por defecto (línea ~110: `headers: { "user-agent": UA, ...options.headers }`); si no, ajustarlo ahí.

- [ ] **Step 4: correr → PASS.** **Step 5: commit** — `feat(rentals/tiktok): la página de un video por HTTP plano y el enlace corto`.

---

### Task 5: Navegador: hashtags y cuentas (`browser.ts`)

**Files:**
- Create: `classes/rentals/sources/tiktok/browser.ts`
- Test: `tests/rentals/tiktok.test.ts` (sólo las funciones puras: `proxyArg`, `parseListBody`, `listPlanFor`)

**Interfaces:**
- Produces:

```ts
export interface ListRead { posts: TiktokPost[]; pages: number; exhausted: boolean; failure: string | null }
export interface ListPlan { tags: string[]; accounts: string[]; tagPages: number; accountPages: number; minCreateTime: number; gapMs: number; budgetMs: number; proxy: string | null; warmUrl: string }
export interface ListResults { tags: Map<string, ListRead>; accounts: Map<string, ListRead>; launched: boolean; note: string }
export type ListReader = (plan: ListPlan) => Promise<ListResults>;
export const readTiktokLists: ListReader;
export function parseListBody(body: string): { posts: TiktokPost[]; hasMore: boolean } | null;
export function proxyArg(proxy: string | null): string[];           // "host:port" | "http://…" | "socks5://…" → ["--proxy-server=…"]
```

- [ ] **Step 1: tests puros**

```ts
import { parseListBody, proxyArg } from "../../classes/rentals/sources/tiktok/browser";
describe("TikTok list plumbing", () => {
  it("parses an item_list body and treats an empty body as no answer", () => {
    expect(parseListBody(JSON.stringify({ statusCode: 0, hasMore: true, itemList: [item()] }))).toMatchObject({ hasMore: true });
    expect(parseListBody(JSON.stringify({ statusCode: 0, hasMore: true, itemList: [item()] }))!.posts[0]!.id).toBe("7688511584326454549");
    expect(parseListBody("")).toBeNull();
    expect(parseListBody("{\"statusCode\":10000}")).toBeNull();
  });
  it("turns a proxy into a Chrome flag without leaking credentials into the label", () => {
    expect(proxyArg("1.2.3.4:8080")).toEqual(["--proxy-server=http://1.2.3.4:8080"]);
    expect(proxyArg("socks5://1.2.3.4:1080")).toEqual(["--proxy-server=socks5://1.2.3.4:1080"]);
    expect(proxyArg(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: correr y ver fallar.** **Step 3: implementar** `browser.ts`:

```ts
// TikTok lists (a hashtag page, an account page) read from a real Chrome, the way elpais_browser.ts
// opens El País searches: one launch per run, a time budget, close in `finally`.
//
// Measured 2026-09-23:
//   * plain HTTP: `/@user` is a WAF interstitial and `/tag/<tag>` ships no videos — the client
//     fetches them from `/api/{post,challenge}/item_list/` with signed params. We do not sign
//     anything: the page's own JS does, and we read the responses as they arrive.
//   * headless Chrome is answered with an EMPTY body unless `--disable-blink-features=
//     AutomationControlled` is set and the UA does not say HeadlessChrome. That is a flag and a UA
//     string, not a fingerprint forgery; the browser is a browser.
//   * the tag list answers only after the origin's cookies exist, so the run opens a video page
//     first (`warmUrl`).
//   * from the VPS's own IP every list body is empty; through the proxy in `proxy.txt` it is
//     full. The proxy changes the network, never the identity (see autos/sources/proxy.ts).
import { postFromItemStruct, type TiktokPost } from "./post";

export interface ListRead { posts: TiktokPost[]; pages: number; exhausted: boolean; failure: string | null }
export interface ListPlan { tags: string[]; accounts: string[]; tagPages: number; accountPages: number; minCreateTime: number; gapMs: number; budgetMs: number; proxy: string | null; warmUrl: string }
export interface ListResults { tags: Map<string, ListRead>; accounts: Map<string, ListRead>; launched: boolean; note: string }
export type ListReader = (plan: ListPlan) => Promise<ListResults>;

const CHROME_PATHS = [process.env.RENTALS_TIKTOK_CHROME, process.env.RENTALS_EP_CHROME, process.env.PUPPETEER_EXECUTABLE_PATH, "/usr/bin/google-chrome-stable", "/usr/bin/google-chrome"];
const NAV_TIMEOUT_MS = Number(process.env.RENTALS_TIKTOK_NAV_MS || 60_000);
const SETTLE_MS = Number(process.env.RENTALS_TIKTOK_SETTLE_MS || 4_000);
const LIST_API = /\/api\/(?:post|challenge)\/item_list\//;
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export function proxyArg(proxy: string | null): string[] {
  const value = String(proxy || "").trim();
  if (!value) return [];
  return [`--proxy-server=${/^\w+:\/\//.test(value) ? value : `http://${value}`}`];
}

export function parseListBody(body: string): { posts: TiktokPost[]; hasMore: boolean } | null {
  if (!body) return null;
  try {
    const data = JSON.parse(body) as { statusCode?: unknown; status_code?: unknown; hasMore?: unknown; itemList?: unknown };
    const status = Number(data.statusCode ?? data.status_code ?? 0);
    if (status !== 0 || !Array.isArray(data.itemList)) return null;
    return { posts: data.itemList.map(postFromItemStruct).filter((post): post is TiktokPost => post !== null), hasMore: data.hasMore === true };
  } catch { return null; }
}

async function launch(proxy: string | null): Promise<{ browser: any; page: any } | null> {
  let puppeteer: any;
  try { puppeteer = (await import("puppeteer")).default; } catch (error) { console.warn(`TikTok: puppeteer no disponible — ${(error as Error).message}`); return null; }
  const args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--no-first-run", "--no-zygote", "--disable-gpu", "--lang=es-UY", "--disable-blink-features=AutomationControlled", ...proxyArg(proxy)];
  for (const executablePath of [...CHROME_PATHS.filter(Boolean), undefined]) {
    try {
      const browser = await puppeteer.launch({ headless: true, executablePath, args, timeout: 30_000 });
      const page = await browser.newPage();
      await page.setViewport({ width: 1366, height: 900 });
      await page.setUserAgent(String(await browser.userAgent()).replace(/HeadlessChrome/, "Chrome"));
      await page.setExtraHTTPHeaders({ "accept-language": "es-UY,es;q=0.9" });
      return { browser, page };
    } catch (error) { console.warn(`TikTok: Chrome no arrancó en ${executablePath || "puppeteer"} — ${(error as Error).message}`); }
  }
  return null;
}

/** Loads one list page and scrolls until `pages` API answers arrived, the list ended, or the window was passed. */
async function readList(page: any, url: string, pages: number, minCreateTime: number, deadline: number): Promise<ListRead> {
  const posts = new Map<string, TiktokPost>();
  let answers = 0;
  let empty = 0;
  let hasMore = true;
  let oldest = Number.POSITIVE_INFINITY;
  const pending: Promise<void>[] = [];
  const onResponse = (response: any): void => {
    if (!LIST_API.test(String(response.url()))) return;
    pending.push(response.text().then((body: string) => {
      const parsed = parseListBody(body);
      if (!parsed) { empty++; return; }
      answers++;
      hasMore = parsed.hasMore;
      for (const post of parsed.posts) { posts.set(post.id, post); oldest = Math.min(oldest, post.createTime); }
    }, () => { empty++; }));
  };
  page.on("response", onResponse);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    for (let round = 0; round < pages * 3; round++) {
      await sleep(SETTLE_MS);
      await Promise.all(pending.splice(0));
      if (answers >= pages || !hasMore || oldest < minCreateTime || Date.now() > deadline) break;
      try { await page.evaluate("window.scrollBy(0, document.body.scrollHeight)"); } catch { break; }
    }
    await Promise.all(pending.splice(0));
    const exhausted = !hasMore || oldest < minCreateTime;
    return { posts: [...posts.values()], pages: answers, exhausted, failure: answers === 0 ? (empty ? "lista vacía (IP bloqueada o desafío)" : "sin respuesta de lista") : null };
  } catch (error) {
    return { posts: [...posts.values()], pages: answers, exhausted: false, failure: `navegación: ${String((error as Error)?.name || "Error")}` };
  } finally {
    page.off("response", onResponse);
  }
}

export const readTiktokLists: ListReader = async (plan) => {
  const results: ListResults = { tags: new Map(), accounts: new Map(), launched: false, note: "" };
  if (!plan.tags.length && !plan.accounts.length) return results;
  const deadline = Date.now() + plan.budgetMs;
  const started = await launch(plan.proxy);
  if (!started) { results.note = "Chrome no arrancó"; return results; }
  results.launched = true;
  const { browser, page } = started;
  try {
    // Cookies first: the tag list answers nothing to a visitor without them.
    await page.goto(plan.warmUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS }).catch(() => undefined);
    await sleep(SETTLE_MS);
    const jobs: Array<["tags" | "accounts", string, string, number]> = [
      ...plan.tags.map(tag => ["tags", tag, `https://www.tiktok.com/tag/${encodeURIComponent(tag)}`, plan.tagPages] as ["tags", string, string, number]),
      ...plan.accounts.map(account => ["accounts", account, `https://www.tiktok.com/@${encodeURIComponent(account)}`, plan.accountPages] as ["accounts", string, string, number]),
    ];
    for (const [kind, key, url, pages] of jobs) {
      if (Date.now() > deadline) { results.note = `presupuesto agotado: ${jobs.length - results.tags.size - results.accounts.size} listas sin leer`; break; }
      await sleep(plan.gapMs);
      results[kind].set(key, await readList(page, url, pages, plan.minCreateTime, deadline));
    }
  } catch (error) {
    results.note = `navegador: ${String((error as Error)?.name || "Error")}`;
  } finally {
    await browser.close().catch(() => undefined);
  }
  return results;
};
```

- [ ] **Step 4: correr → PASS.** **Step 5: commit** — `feat(rentals/tiktok): hashtags y cuentas por navegador, con proxy y presupuesto`.

---

### Task 6: Memoria (`store.ts` + modelos) y el harvester (`index.ts`)

**Files:**
- Create: `classes/models/RentalTiktokPost.ts`, `classes/models/RentalTiktokAccount.ts`
- Create: `classes/rentals/sources/tiktok/store.ts`, `classes/rentals/sources/tiktok/index.ts`
- Modify: `classes/rentals/sources/index.ts` (registrar `harvestTiktok`)
- Test: `tests/rentals/tiktok.test.ts`

**Interfaces:**
- Produces:

```ts
// store.ts
export interface TiktokAccountRow { uniqueId: string; secUid: string; nickname: string; firstSeen: string; lastReadAt: string | null; lastPostAt: string | null; published: number; reads: number; note: string | null }
export interface TiktokPostRow { listingId: string; id: string; uniqueId: string; createTime: number; readAt: string; text: string; hashtags: string[]; rejected: string | null; price: number | null; currency: string | null; department: string; neighborhood: string; candidates: string[]; geocodeQuery: string | null; geocodeAddress: string | null; latitude: number | null; longitude: number | null; geoNeighborhood: string | null; note: string | null }
export interface TiktokStore { loadAccounts(): Promise<TiktokAccountRow[]>; saveAccounts(rows: TiktokAccountRow[]): Promise<void>; loadPosts(ids: string[]): Promise<Map<string, TiktokPostRow>>; savePosts(rows: TiktokPostRow[]): Promise<void> }
export const appDbTiktokStore: TiktokStore;    // real; refuses (no-op, empty) when !appDbConfigured()
// index.ts
export interface HarvestTiktokDeps { readLists: ListReader; readVideo: (url: string) => Promise<TiktokPost | null>; resolveUrl: (url: string) => Promise<string | null>; geocode: (candidates: readonly string[], department: string, budget: { remaining: number }) => Promise<GeocodeOutcome>; locateZone: (lng: number, lat: number) => string | null; store: TiktokStore; now: () => Date; env: NodeJS.ProcessEnv }
export function tiktokProxy(env: NodeJS.ProcessEnv, readFile?: (path: string) => string): string | null;
export async function harvestTiktok(mode: "full" | "fast", usdUyu: number, deps?: Partial<HarvestTiktokDeps>): Promise<RentalSourceResult>;
```

- [ ] **Step 1: tests del harvester** (mock de todo lo externo):

```ts
import { harvestTiktok, tiktokProxy } from "../../classes/rentals/sources/tiktok";
import type { ListPlan, ListResults } from "../../classes/rentals/sources/tiktok/browser";
import type { TiktokStore, TiktokAccountRow, TiktokPostRow } from "../../classes/rentals/sources/tiktok/store";

const memoryStore = (accounts: TiktokAccountRow[] = []): TiktokStore & { accounts: TiktokAccountRow[]; posts: TiktokPostRow[] } => {
  const state = { accounts, posts: [] as TiktokPostRow[] };
  return {
    ...state,
    loadAccounts: async () => state.accounts,
    saveAccounts: async rows => { state.accounts = rows; },
    loadPosts: async () => new Map(state.posts.map(row => [row.id, row])),
    savePosts: async rows => { state.posts.push(...rows); },
  };
};
const post = (id: string, uniqueId: string, desc: string, createTime = 1790121112) => postFromItemStruct(item({ id, desc, contents: undefined, createTime: String(createTime), author: { uniqueId, nickname: uniqueId, secUid: "S" } }))!;
const listsOf = (tags: Record<string, ReturnType<typeof post>[]>, accounts: Record<string, { posts: ReturnType<typeof post>[]; exhausted?: boolean }>) =>
  vi.fn(async (_plan: ListPlan): Promise<ListResults> => ({
    launched: true, note: "",
    tags: new Map(Object.entries(tags).map(([tag, posts]) => [tag, { posts, pages: 1, exhausted: true, failure: null }])),
    accounts: new Map(Object.entries(accounts).map(([acc, read]) => [acc, { posts: read.posts, pages: 1, exhausted: read.exhausted ?? true, failure: null }])),
  }));
const baseEnv = { RENTALS_TIKTOK_PROXY: "1.2.3.4:8080", RENTALS_TIKTOK_TAGS: "alquilermontevideo", RENTALS_TIKTOK_ACCOUNTS: "inmobiliariaalquilar", RENTALS_TIKTOK_MAX_AGE_DAYS: "45" };
const now = () => new Date("2026-09-23T05:00:00.000Z");
const CAPTION = "🏠 Alquiler Pocitos 2 dormitorios 📍 Chucarro y Guayaquí $30.000 GC $4.000 #alquiler #montevideo";

describe("harvestTiktok", () => {
  it("does nothing in the hourly run and when disabled", async () => {
    const readLists = listsOf({}, {});
    expect(await harvestTiktok("fast", 40, { readLists, env: baseEnv, now })).toMatchObject({ key: "tiktok", ok: true, complete: false, listings: [] });
    expect(await harvestTiktok("full", 40, { readLists, env: { ...baseEnv, RENTALS_TIKTOK_ENABLED: "0" }, now })).toMatchObject({ ok: true, listings: [], note: "deshabilitado por configuración" });
    expect(readLists).not.toHaveBeenCalled();
  });
  it("reads the seed account, publishes its adverts, registers discovered authors, and is complete when every account was exhausted", async () => {
    const store = memoryStore();
    const readLists = listsOf({ alquilermontevideo: [post("1", "otra.inmo", CAPTION), post("2", "spam", "#alquiler #montevideo")] }, { inmobiliariaalquilar: { posts: [post("3", "inmobiliariaalquilar", CAPTION)] } });
    const run = await harvestTiktok("full", 40, { readLists, store, env: baseEnv, now, geocode: async () => ({ point: null, query: null, tried: 0 }) });
    expect(run).toMatchObject({ ok: true, complete: true });
    expect(run.listings.map(row => row.listingId).sort()).toEqual(["tiktok:1", "tiktok:3"]);
    expect(store.accounts.map(row => row.uniqueId).sort()).toEqual(["inmobiliariaalquilar", "otra.inmo"]);   // "spam" published nothing
    expect(store.posts.find(row => row.id === "2")?.rejected).toBe("sin precio");
    const plan = readLists.mock.calls[0]![0];
    expect(plan.proxy).toBe("1.2.3.4:8080");
    expect(plan.accounts).toEqual(["inmobiliariaalquilar"]);
    expect(plan.minCreateTime).toBe(Math.floor(now().getTime() / 1000) - 45 * 86_400);
  });
  it("is NOT complete when an account was cut by budget or not read, and never publishes a video older than the window", async () => {
    const store = memoryStore([{ uniqueId: "vieja.inmo", secUid: "S", nickname: "Vieja", firstSeen: "2026-09-01", lastReadAt: "2026-09-01T00:00:00.000Z", lastPostAt: null, published: 3, reads: 1, note: null }]);
    const readLists = listsOf({}, { inmobiliariaalquilar: { posts: [post("9", "inmobiliariaalquilar", CAPTION, 1780000000)], exhausted: false } });
    const run = await harvestTiktok("full", 40, { readLists, store, env: { ...baseEnv, RENTALS_TIKTOK_MAX_ACCOUNTS: "1" }, now, geocode: async () => ({ point: null, query: null, tried: 0 }) });
    expect(run.complete).toBe(false);
    expect(run.listings).toEqual([]);
    expect(readLists.mock.calls[0]![0].accounts).toEqual(["vieja.inmo"]);   // el registro nunca leído/mas viejo va primero; la semilla queda fuera del presupuesto
  });
  it("imports a manual short link over HTTP without the browser, and geocodes a corner once", async () => {
    const store = memoryStore();
    const geocode = vi.fn(async () => ({ point: { latitude: -34.906, longitude: -56.156, address: "Chucarro & Guayaquí" }, query: "q", tried: 1 }));
    const deps = { readLists: listsOf({}, {}), store, env: { ...baseEnv, RENTALS_TIKTOK_TAGS: "", RENTALS_TIKTOK_ACCOUNTS: "", RENTALS_TIKTOK_VIDEOS: "https://vt.tiktok.com/ZSbJ6eN9S/" }, now,
      resolveUrl: async () => "https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549",
      readVideo: async () => post("7688511584326454549", "inmobiliariaalquilar", CAPTION), geocode, locateZone: () => "MV_POC" };
    const first = await harvestTiktok("full", 40, deps);
    expect(first.listings[0]).toMatchObject({ listingId: "tiktok:7688511584326454549", latitude: -34.906, longitude: -56.156, neighborhood: "Pocitos" });
    expect(deps.readLists).not.toHaveBeenCalled();
    const second = await harvestTiktok("full", 40, deps);
    expect(geocode).toHaveBeenCalledTimes(1);
    expect(second.listings[0]).toMatchObject({ latitude: -34.906 });
  });
  it("says so when there is no proxy and lists came back empty", async () => {
    const readLists = vi.fn(async (): Promise<ListResults> => ({ launched: true, note: "", tags: new Map([["alquilermontevideo", { posts: [], pages: 0, exhausted: false, failure: "lista vacía (IP bloqueada o desafío)" }]]), accounts: new Map() }));
    const run = await harvestTiktok("full", 40, { readLists, store: memoryStore(), env: { ...baseEnv, RENTALS_TIKTOK_PROXY: "", RENTALS_TIKTOK_ACCOUNTS: "" }, now });
    expect(run.ok).toBe(false);
    expect(run.note).toContain("sin proxy");
    expect(tiktokProxy({}, () => "9.9.9.9:3128\n")).toBe("9.9.9.9:3128");
    expect(tiktokProxy({ RENTALS_TIKTOK_PROXY: "socks5://a:1" }, () => "x")).toBe("socks5://a:1");
    expect(tiktokProxy({}, () => { throw new Error("ENOENT"); })).toBeNull();
  });
});
```

- [ ] **Step 2: correr y ver fallar.** **Step 3: modelos**

```ts
// classes/models/RentalTiktokAccount.ts
import { Schema } from "mongoose";
import { appModel } from "../appdb";
export interface RentalTiktokAccountDocument { uniqueId: string; secUid: string; nickname: string; firstSeen: string; lastReadAt: string | null; lastPostAt: string | null; published: number; reads: number; note: string | null }
const RentalTiktokAccountSchema = new Schema({
  uniqueId: { type: String, required: true }, secUid: { type: String, default: "" }, nickname: { type: String, default: "" },
  firstSeen: { type: String, required: true }, lastReadAt: { type: String, default: null }, lastPostAt: { type: String, default: null },
  published: { type: Number, default: 0 }, reads: { type: Number, default: 0 }, note: { type: String, default: null },
}, { autoCreate: false, autoIndex: false });
RentalTiktokAccountSchema.index({ uniqueId: 1 }, { unique: true });
export const RentalTiktokAccountModel = appModel<RentalTiktokAccountDocument>("RentalTiktokAccount", RentalTiktokAccountSchema, "rentaltiktokaccounts");
```

`RentalTiktokPost.ts` igual, con los campos de `TiktokPostRow`, índice único por `listingId` y otro por `readAt`.

- [ ] **Step 4: `store.ts`** — `appDbTiktokStore` con `appConnection().collection(<Model>.collection.name)`, `bulkWrite` upsert por `uniqueId` / `listingId` (calcado de `saveFacebookDetails`), y todo devuelve vacío/no-op si `!appDbConfigured()`.

- [ ] **Step 5: `index.ts`**

```ts
import fs from "node:fs";
import { geocodeCandidates, type GeocodeOutcome } from "../../facebookGeocode";
import { INE_DISPLAY_NAMES } from "../../../propertyzones/names";
import { isPlausibleRent } from "../../normalize";
import { neighborhoodFromZoneLabel, pointContradictsBarrio } from "../../facebookDetailStore";
import type { RawRental } from "../../types";
import type { RentalSourceResult } from "../types";
import { parseCaption } from "./caption";
import { readTiktokLists, type ListPlan, type ListReader } from "./browser";
import { readVideoPage, resolveTiktokUrl } from "./page";
import { postToRawRental, postUrl, type PostGeo, type TiktokPost } from "./post";
import { appDbTiktokStore, type TiktokAccountRow, type TiktokPostRow, type TiktokStore } from "./store";

export interface HarvestTiktokDeps { /* como en Interfaces */ }

const DEFAULT_TAGS = "alquilermontevideo,alquileruruguay,alquileresmontevideo,alquilermvd,alquileresuruguay";
const DEFAULT_ACCOUNTS = "inmobiliariaalquilar";
const WARM_URL = "https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549";
const list = (value: string | undefined, fallback: string): string[] => String(value ?? fallback).split(",").map(item => item.trim().replace(/^[@#]/, "")).filter(Boolean);
const number = (value: string | undefined, fallback: number): number => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : fallback; };

/** `RENTALS_TIKTOK_PROXY`, else the first line of proxy.txt (the one Prex uses), else none. */
export function tiktokProxy(env: NodeJS.ProcessEnv, readFile: (path: string) => string = path => fs.readFileSync(path, "utf8")): string | null {
  const configured = String(env.RENTALS_TIKTOK_PROXY ?? "").trim();
  if (configured) return configured;
  try { return readFile("proxy.txt").split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? null; } catch { return null; }
}

let zoneLocator: ((lng: number, lat: number) => string | null) | null = null;
function defaultLocateZone(lng: number, lat: number): string | null {
  if (!zoneLocator) {
    const { areaLocator } = require("../../../propertyzones/geo") as typeof import("../../../propertyzones/geo");
    const { loadOfficialPropertyZoneGeometry } = require("../../../propertyzones/sources/geometry") as typeof import("../../../propertyzones/sources/geometry");
    const zones = loadOfficialPropertyZoneGeometry().zones;
    zoneLocator = areaLocator(zones.map(zone => ({ id: zone.officialCode, geometry: zone.geometry })));
  }
  return zoneLocator(lng, lat);
}

export async function harvestTiktok(mode: "full" | "fast", usdUyu: number, overrides: Partial<HarvestTiktokDeps> = {}): Promise<RentalSourceResult> {
  const deps: HarvestTiktokDeps = {
    readLists: readTiktokLists, readVideo: readVideoPage, resolveUrl: resolveTiktokUrl, geocode: geocodeCandidates,
    locateZone: defaultLocateZone, store: appDbTiktokStore, now: () => new Date(), env: process.env, ...overrides,
  };
  const { env } = deps;
  if (env.RENTALS_TIKTOK_ENABLED === "0") return { key: "tiktok", ok: true, complete: false, listings: [], note: "deshabilitado por configuración" };
  if (mode === "fast") return { key: "tiktok", ok: true, complete: false, listings: [], note: "sólo en la corrida completa" };

  const now = deps.now();
  const observedAt = now.toISOString();
  const today = observedAt.slice(0, 10);
  const maxAgeDays = number(env.RENTALS_TIKTOK_MAX_AGE_DAYS, 45);
  const minCreateTime = Math.floor(now.getTime() / 1000) - maxAgeDays * 86_400;
  const proxy = tiktokProxy(env);
  const seeds = list(env.RENTALS_TIKTOK_ACCOUNTS, DEFAULT_ACCOUNTS);
  const tags = list(env.RENTALS_TIKTOK_TAGS, DEFAULT_TAGS);
  const maxAccounts = number(env.RENTALS_TIKTOK_MAX_ACCOUNTS, 60);
  const geocodeBudget = { remaining: number(env.RENTALS_TIKTOK_GEOCODE_MAX, 60) };

  // 1. Manual videos over plain HTTP (no browser, no proxy).
  const manual: TiktokPost[] = [];
  let manualFailed = 0;
  for (const raw of list(env.RENTALS_TIKTOK_VIDEOS, "")) {
    const url = await deps.resolveUrl(raw);
    const post = url ? await deps.readVideo(url) : null;
    if (post) manual.push(post); else manualFailed++;
  }

  // 2. Registry + seeds: who to read, oldest read first, within budget.
  const known = new Map<string, TiktokAccountRow>((await deps.store.loadAccounts()).map(row => [row.uniqueId, row]));
  for (const uniqueId of seeds) if (!known.has(uniqueId)) known.set(uniqueId, { uniqueId, secUid: "", nickname: uniqueId, firstSeen: today, lastReadAt: null, lastPostAt: null, published: 0, reads: 0, note: "semilla" });
  const wanted = [...known.values()].sort((a, b) => (a.lastReadAt || "").localeCompare(b.lastReadAt || "") || a.uniqueId.localeCompare(b.uniqueId)).map(row => row.uniqueId);
  const accounts = wanted.slice(0, maxAccounts);

  // 3. Lists through the browser.
  const plan: ListPlan = { tags, accounts, tagPages: number(env.RENTALS_TIKTOK_TAG_PAGES, 3), accountPages: number(env.RENTALS_TIKTOK_ACCOUNT_PAGES, 3), minCreateTime, gapMs: number(env.RENTALS_TIKTOK_GAP_MS, 2_000), budgetMs: number(env.RENTALS_TIKTOK_BROWSER_BUDGET_MS, 15 * 60_000), proxy, warmUrl: WARM_URL };
  const lists = tags.length || accounts.length ? await deps.readLists(plan) : { tags: new Map(), accounts: new Map(), launched: false, note: "" };

  // 4. Every post once, newest first; caption → facts → offer.
  const posts = new Map<string, TiktokPost>();
  for (const post of manual) posts.set(post.id, post);
  for (const read of [...lists.tags.values(), ...lists.accounts.values()]) for (const post of read.posts) posts.set(post.id, post);
  const stored = await deps.store.loadPosts([...posts.keys()]);
  const rows: TiktokPostRow[] = [];
  const listings: RawRental[] = [];
  const publishedBy = new Map<string, number>();
  const authors = new Map<string, TiktokPost["author"]>();
  let tooOld = 0, rejected = 0, implausible = 0, geocoded = 0, contradicted = 0;
  for (const post of [...posts.values()].sort((a, b) => b.createTime - a.createTime)) {
    if (post.createTime < minCreateTime) { tooOld++; continue; }
    const facts = parseCaption(post.lines, post.hashtags);
    const previous = stored.get(post.id);
    let geo: PostGeo | null = previous && typeof previous.latitude === "number" && typeof previous.longitude === "number" ? { latitude: previous.latitude, longitude: previous.longitude!, neighborhood: previous.geoNeighborhood || undefined } : null;
    let geocodeQuery = previous?.geocodeQuery ?? null, geocodeAddress = previous?.geocodeAddress ?? null, note: string | null = null;
    if (!facts.rejected && !previous && facts.addressCandidates.length && geocodeBudget.remaining > 0) {
      const outcome = await deps.geocode(facts.addressCandidates, facts.department, geocodeBudget);
      geocodeQuery = outcome.query; geocodeAddress = outcome.point?.address ?? null;
      if (outcome.point) {
        const label = deps.locateZone(outcome.point.longitude, outcome.point.latitude);
        const zoneLabel = label ? INE_DISPLAY_NAMES[label] ?? null : null;
        if (pointContradictsBarrio(facts.neighborhood, zoneLabel)) { contradicted++; note = `punto en ${zoneLabel} contradice el barrio nombrado (${facts.neighborhood}); se descarta`; }
        else { geocoded++; geo = { latitude: outcome.point.latitude, longitude: outcome.point.longitude, neighborhood: facts.neighborhood ? undefined : neighborhoodFromZoneLabel(zoneLabel) || undefined }; }
      }
    }
    const row = postToRawRental(post, facts, geo, observedAt);
    let reason = facts.rejected;
    if (row && !isPlausibleRent(row.currency === "USD" ? row.price * usdUyu : row.price, row.propertyType)) { reason = "precio inverosímil"; implausible++; }
    else if (row) { listings.push(row); publishedBy.set(post.author.uniqueId, (publishedBy.get(post.author.uniqueId) ?? 0) + 1); authors.set(post.author.uniqueId, post.author); }
    if (reason) rejected++;
    rows.push({ listingId: `tiktok:${post.id}`, id: post.id, uniqueId: post.author.uniqueId, createTime: post.createTime, readAt: observedAt, text: post.lines.join("\n").slice(0, 4_000), hashtags: post.hashtags.slice(0, 40), rejected: reason, price: row?.price ?? facts.price, currency: row?.currency ?? facts.currency, department: row?.department ?? facts.department, neighborhood: row?.neighborhood ?? facts.neighborhood, candidates: facts.addressCandidates, geocodeQuery, geocodeAddress, latitude: geo?.latitude ?? null, longitude: geo?.longitude ?? null, geoNeighborhood: geo?.neighborhood ?? null, note });
  }

  // 5. Registry: every account read now, plus every author who published something.
  for (const [uniqueId, author] of authors) if (!known.has(uniqueId)) known.set(uniqueId, { uniqueId, secUid: author.secUid, nickname: author.nickname, firstSeen: today, lastReadAt: null, lastPostAt: null, published: 0, reads: 0, note: "descubierta por hashtag" });
  for (const [uniqueId, read] of lists.accounts) {
    const row = known.get(uniqueId)!;
    if (read.failure && !read.posts.length) { row.note = read.failure; continue; }
    row.lastReadAt = observedAt; row.reads++; row.note = read.exhausted ? null : "lectura cortada por presupuesto";
    const newest = read.posts.reduce((max, post) => Math.max(max, post.createTime), 0);
    if (newest) row.lastPostAt = new Date(newest * 1000).toISOString();
  }
  for (const row of known.values()) row.published = publishedBy.get(row.uniqueId) ?? 0;
  await deps.store.savePosts(rows);
  await deps.store.saveAccounts([...known.values()]);

  // 6. Completeness: absence is evidence only if EVERY tracked account was read to the end of the window.
  const unread = [...known.keys()].filter(uniqueId => !lists.accounts.get(uniqueId)?.exhausted);
  const complete = unread.length === 0 && !lists.note;
  const emptyLists = [...lists.tags.values(), ...lists.accounts.values()].filter(read => read.failure).length;
  const ok = listings.length > 0 || (posts.size > 0 && emptyLists === 0);
  const note = `${listings.length} avisos de ${posts.size} videos (${rejected} rechazados, ${tooOld} fuera de la ventana de ${maxAgeDays} días, ${implausible} con precio inverosímil); `
    + `${lists.tags.size} hashtags y ${lists.accounts.size} de ${known.size} cuentas leídas${manual.length || manualFailed ? `; ${manual.length} videos manuales${manualFailed ? `, ${manualFailed} sin leer` : ""}` : ""}`
    + `; ${geocoded} esquinas ubicadas${contradicted ? `, ${contradicted} descartadas por contradecir el barrio` : ""}`
    + (proxy ? "" : "; sin proxy: TikTok no lista desde esta IP")
    + (emptyLists ? `; ${emptyLists} listas vacías` : "")
    + (lists.note ? `; ${lists.note}` : "")
    + (complete ? "" : `; cobertura parcial (${unread.length} cuentas sin leer a fondo)`);
  return { key: "tiktok", ok, complete, listings, note };
}
```

- [ ] **Step 6: registrar** en `classes/rentals/sources/index.ts`: `import { harvestTiktok } from "./tiktok";` y sumarlo al `Promise.all`.
- [ ] **Step 7: correr** `npx vitest run tests/rentals/` completo → PASS; `npx tsc -p tsconfig.production.json --noEmit` → sin errores.
- [ ] **Step 8: commit** — `feat(rentals/tiktok): harvester con registro de cuentas, memoria de posts y geocodificación`.

---

### Task 7: Docs, AGENTS y memoria

**Files:**
- Modify: `docs/app/RENTALS.md` (fila en la tabla "Fuentes" + sección "## TikTok — 23 de setiembre de 2026" con lo medido y las reglas)
- Modify: `AGENTS.md` (celda de `currency-rentals`: una oración sobre TikTok: leyendas, navegador + proxy, sólo diaria, `RENTALS_TIKTOK_*`)
- Modify: `docs/app/RENTALS.md` "Variables de entorno": las `RENTALS_TIKTOK_*`.

- [ ] **Step 1: escribir** las tres cosas con las cifras medidas de la spec.
- [ ] **Step 2: commit** — `docs(rentals): TikTok como fuente — lo medido, las reglas y las variables`.

---

### Task 8: Verificación, merge y deploy

- [ ] `npx vitest run` (root) verde; `cd app && npx vitest run tests/unit/rentalsCoverage.test.ts tests/unit/rentalSourceStatus.test.ts tests/unit/rentalsMongo.test.ts` verde; `cd mcp && npm run build`.
- [ ] `npx tsc -p tsconfig.production.json --noEmit`.
- [ ] Prueba real desde el VPS ANTES del merge: `scp` del build o `git fetch` de la rama en `/root/cambio-uruguay`; `node -e` que importe `dist/classes/rentals/sources/tiktok/index.js` con `APP_MONGO_URI` de `app/.env` y `RENTALS_TIKTOK_MAX_ACCOUNTS=3`, e imprima `note` y `listings.length`. Esperado: ≥ 15 avisos de la cuenta semilla, proxy tomado de `proxy.txt`.
- [ ] Merge a `main` (worktree → `git checkout main` en el root sólo si está limpio; si no, merge en un worktree temporal), push, `gh run watch`.
- [ ] `pm2 restart currency-rentals` en el VPS (corre en el acto) y medir: `rentalmetas.sources` con `key: "tiktok"`, `rentallistings` con `offers.source: "tiktok"`, y `https://cambio-uruguay.com/alquileres-uruguay?source=tiktok` con filas.
- [ ] Memoria: `tiktok-fuente-alquileres.md` + línea en `propiedades-index.md`.
