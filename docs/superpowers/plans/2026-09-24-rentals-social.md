# Instagram Reels y Facebook Reels — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** publicar en `/alquileres-uruguay` los avisos que las inmobiliarias suben a Instagram y a Facebook Reels, con una guarda que deja una sola copia de la misma vivienda entre TikTok, Instagram y Facebook.

**Architecture:** se extrae de `classes/rentals/sources/tiktok/` lo que no depende de la red a `classes/rentals/sources/social/` (leyenda, post→aviso, proceso con memoria y geocodificación, lanzamiento de Chrome, stores por colección) y se agregan dos adaptadores (`social/instagram/`, `social/facebookreels/`). `harvestSocial` corre las tres redes en secuencia, junta los avisos aceptados, aplica la guarda de copias con reclamos estables en `rentalsocialclaims` y devuelve un `RentalSourceResult` por red.

**Tech Stack:** TypeScript 4.9 CommonJS (root), puppeteer 24, mongoose/`appConnection`, vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-rentals-social-design.md`

## Global Constraints

- Claves nuevas: `"instagram"` (etiqueta "Instagram", `listingId = instagram:<code>`) y `"facebookreels"` (etiqueta "Facebook Reels", `listingId = facebookreels:<post_id>`).
- Prioridad de red para copias: `tiktok`, `instagram`, `facebookreels` (en ese orden).
- Sólo la corrida completa lee; la horaria devuelve `ok: true, complete: false, listings: []`, nota "sólo en la corrida completa".
- Sin sesiones: Chrome headless propio. Nunca el Chrome del perfil de Facebook.
- `complete: false` siempre para Instagram y Facebook Reels.
- Sin contactos: `rentalDescription` sanea la leyenda; `agency`/`publicContact` quedan `undefined`.
- Uniones de tipos de fuentes en el app: una por línea (prettier, printWidth 100) y la misma disposición en `classes/propertyopportunities/types.ts` (el test de contrato compara textos).
- TS 4.9, `target: es6`: nada de `async/await` dentro de funciones serializadas a `page.evaluate`.
- Repo público: cero cifras de ingreso en nada versionado.

## Review Focus

1. La página de un post de Instagram trae VARIOS nodos con `code` (posts relacionados): se toma el nodo cuyo `code` es el pedido, no el primero. Test en Task 5.
2. La misma vivienda en TikTok, Instagram y Facebook con leyendas distintas pero misma esquina, precio y dormitorios: se publica una sola. Test en Task 4.
3. Reclamante vivo que hoy no se vio: sus copias no se publican (si no, al volver quedaría duplicado). Test en Task 4.
4. Candidata de Instagram extranjera (la mexicana `habitarte.inmobiliaria`): pasa a `descartada` con ≥3 posts evaluados y no se relee por 30 días. Test en Task 5.
5. Resultado de Facebook que es una FOTO (sin `videoId`): no se publica como Facebook Reels. Test en Task 6.

---

### Task 1: Claves `instagram` y `facebookreels` en los tipos y todos los espejos

**Files:**
- Modify: `classes/rentals/types.ts`, `classes/pricehistory/marketLog.ts`, `classes/propertyzones/project.ts`, `classes/propertyopportunities/types.ts`, `classes/propertyopportunities/analyze.ts` (SOURCES y HOSTS), `classes/rentals/advertiser.ts` (ORIGINS), `classes/rentals/dedupe.ts` (SOURCE_RANK), `app/utils/rentals.ts`, `app/utils/rentalAvailability.ts`, `app/utils/propertyOpportunities.ts`, `mcp/src/rentals/types.ts`
- Modify tests: `app/tests/unit/rentalsCoverage.test.ts`, `app/tests/e2e/rentals.spec.ts`
- Test: `tests/rentals/social.test.ts` (nuevo)

**Interfaces:**
- Produces: `RentalSource` incluye `"instagram" | "facebookreels"`; `RENTAL_SOURCE_LABEL.instagram === "Instagram"`, `.facebookreels === "Facebook Reels"`.

- [ ] **Step 1: test**

```ts
// tests/rentals/social.test.ts
import { describe, expect, it } from "vitest";
import { RENTAL_SOURCES, RENTAL_SOURCE_LABEL } from "../../classes/rentals/types";

describe("Instagram and Facebook Reels are rental sources", () => {
  it("are enumerated with their labels", () => {
    expect(RENTAL_SOURCES).toEqual(expect.arrayContaining(["tiktok", "instagram", "facebookreels"]));
    expect(RENTAL_SOURCE_LABEL.instagram).toBe("Instagram");
    expect(RENTAL_SOURCE_LABEL.facebookreels).toBe("Facebook Reels");
  });
});
```

- [ ] **Step 2: correr → FAIL.**
- [ ] **Step 3: agregar las dos claves** al final de cada lista/unión/mapa listados arriba. Valores de los mapas:
  - `advertiser.ts` ORIGINS: `instagram: "https://www.instagram.com"`, `facebookreels: "https://www.facebook.com"`.
  - `dedupe.ts` SOURCE_RANK: `instagram: 1`, `facebookreels: 1`.
  - `analyze.ts` HOSTS: `instagram: { advert: ["instagram.com"], image: ["cdninstagram.com", "fbcdn.net"] }`, `facebookreels: { advert: ["facebook.com"], image: ["fbcdn.net"] }`.
  - `types.ts`/app/mcp labels: `"Instagram"`, `"Facebook Reels"`.
  - Las uniones del app y de `classes/propertyopportunities/types.ts` ya están una por línea: agregar `| 'instagram'` / `| 'facebookreels'` (o con comillas dobles en `classes/`).
- [ ] **Step 4: tests del app** — `rentalsCoverage.test.ts`: la lista esperada suma `{ key: 'instagram', properties: 0 }, { key: 'facebookreels', properties: 0 }` y `toHaveLength(6)` → `toHaveLength(8)`. `rentals.spec.ts`: `fixtureCoverage.sources` suma `{ key: 'instagram', properties: 9 }, { key: 'facebookreels', properties: 4 }` y `expectedSources` suma `['instagram', 'Instagram', '9 resultados'], ['facebookreels', 'Facebook Reels', '4 resultados']`.
- [ ] **Step 5: correr** `npx vitest run tests/rentals/social.test.ts tests/propertyopportunities/contracts.test.ts`, `npx tsc -p tsconfig.production.json --noEmit` (1 error esperado: `sheet_key.json`), `cd app && npx vitest run tests/unit/rentalsCoverage.test.ts tests/unit/rentalSourceStatus.test.ts` → PASS.
- [ ] **Step 6: commit** — `feat(rentals): instagram y facebookreels son fuentes del directorio (tipos y espejos)`.

---

### Task 2: Extraer la capa `social/` (leyenda, post, Chrome) sin cambiar a TikTok

**Files:**
- Move: `classes/rentals/sources/tiktok/caption.ts` → `classes/rentals/sources/social/caption.ts` (`git mv`, las rutas relativas no cambian de profundidad)
- Create: `classes/rentals/sources/social/post.ts`, `classes/rentals/sources/social/chrome.ts`
- Modify: `classes/rentals/sources/tiktok/post.ts`, `classes/rentals/sources/tiktok/browser.ts`, `classes/rentals/sources/tiktok/index.ts`, `tests/rentals/tiktok.test.ts` (import de `caption`)
- Test: `tests/rentals/social.test.ts`

**Interfaces:**
- Produces:

```ts
// social/post.ts
export type SocialSource = "tiktok" | "instagram" | "facebookreels";
export const SOCIAL_SOURCES: readonly SocialSource[];            // ["tiktok", "instagram", "facebookreels"]
export interface SocialPost {
  source: SocialSource; id: string; url: string; lines: string[]; createTime: number;
  author: { uniqueId: string; nickname: string; secUid: string };  // handle, display name, stable id ("" if none)
  cover: string | null; hashtags: string[];
}
export interface PostGeo { latitude: number; longitude: number; neighborhood?: string }
export function postToRawRental(post: SocialPost, facts: CaptionFacts, geo: PostGeo | null, observedAt: string): RawRental | null;
export function hashtagsIn(text: string): string[];
// social/chrome.ts
export function proxyArg(proxy: string | null): string[];
export async function launchChrome(proxy: string | null, label: string): Promise<{ browser: any; page: any } | null>;
export const sleep: (ms: number) => Promise<void>;
```
- `tiktok/post.ts` keeps `postFromItemStruct` (now fills `source: "tiktok"`, `url`), `postUrl = (post) => post.url`, and re-exports `postToRawRental`, `SocialPost as TiktokPost`, `PostGeo`.
- `tiktok/browser.ts` imports `launchChrome`/`proxyArg`/`sleep` from `../social/chrome` and re-exports `proxyArg`.

- [ ] **Step 1: test** (a non-TikTok post goes through the same builder)

```ts
import { postToRawRental, hashtagsIn } from "../../classes/rentals/sources/social/post";
import { parseCaption } from "../../classes/rentals/sources/social/caption";

describe("social post → RawRental", () => {
  it("takes source, id and url from the post, and titles an untitled caption with the network's label", () => {
    const text = "🏠 Alquiler 1 dormitorio en Pocitos\n\n📍 Charrúa y Luis Ponce — Pocitos\n\n🔹 $27.500\n🔹 Gastos comunes: $5.500";
    const post = { source: "instagram" as const, id: "Ddm6q_TiZ2l", url: "https://www.instagram.com/p/Ddm6q_TiZ2l/", lines: text.split(/\n+/),
      createTime: 1790119737, author: { uniqueId: "inmobiliariaalquilar", nickname: "Inmobiliaria Alquiler Montevideo", secUid: "" }, cover: null, hashtags: [] };
    const row = postToRawRental(post, parseCaption(post.lines, []), null, "2026-09-24T05:00:00.000Z")!;
    expect(row).toMatchObject({ source: "instagram", listingId: "instagram:Ddm6q_TiZ2l", url: post.url, price: 27500, commonExpenses: 5500,
      sellerName: "Inmobiliaria Alquiler Montevideo", department: "Montevideo", neighborhood: "Pocitos", publishedAt: "2026-09-22" });
    const bare = postToRawRental({ ...post, lines: ["#alquiler $27.500 alquiler en Pocitos"] }, parseCaption(["#alquiler $27.500 alquiler en Pocitos"], []), null, "2026-09-24T05:00:00.000Z")!;
    expect(bare.title).toBe("alquiler en Pocitos");
  });
  it("reads hashtags out of a caption", () => {
    expect(hashtagsIn("Alquiler #Pocitos #alquilerMontevideo #1dormitorio fin")).toEqual(["Pocitos", "alquilerMontevideo", "1dormitorio"]);
  });
});
```

- [ ] **Step 2: correr → FAIL** (módulo inexistente).
- [ ] **Step 3: `git mv` de `caption.ts`**; `social/post.ts` con el cuerpo de `postToRawRental` de `tiktok/post.ts` generalizado:

```ts
import { advertiserClassification, ownerDirectDeclaration } from "../../advertiser";
import { rentalDescription, rentalOfferDetails } from "../../details";
import { RENTAL_SOURCE_LABEL, type RawRental } from "../../types";
import type { CaptionFacts } from "./caption";

export type SocialSource = "tiktok" | "instagram" | "facebookreels";
export const SOCIAL_SOURCES: readonly SocialSource[] = ["tiktok", "instagram", "facebookreels"];
export interface SocialPost { /* como en Interfaces */ }
export interface PostGeo { latitude: number; longitude: number; neighborhood?: string }

export function hashtagsIn(text: string): string[] {
  const out: string[] = [];
  for (const match of String(text || "").matchAll(/#([\p{L}\p{N}_]{2,60})/gu)) if (!out.includes(match[1]!)) out.push(match[1]!);
  return out.slice(0, 40);
}

export function postToRawRental(post: SocialPost, facts: CaptionFacts, geo: PostGeo | null, observedAt: string): RawRental | null {
  if (facts.rejected || facts.price === null || !facts.currency) return null;
  const body = post.lines.join("\n");
  const title = facts.title || `Alquiler en ${RENTAL_SOURCE_LABEL[post.source]} (@${post.author.uniqueId})`;
  // … idéntico al de tiktok/post.ts, con source: post.source, listingId: `${post.source}:${post.id}`, url: post.url
}
```
`social/chrome.ts`: mover `CHROME_PATHS`, `proxyArg`, `launch` (renombrado `launchChrome(proxy, label)`, el `label` reemplaza "TikTok" en los `console.warn`) y `sleep` desde `tiktok/browser.ts`, con el cierre del Chrome huérfano ya incluido. `tiktok/post.ts`: `postFromItemStruct` devuelve `{ source: "tiktok", id, url: \`https://www.tiktok.com/@${uniqueId}/video/${id}\`, … }`. Imports: `tiktok/index.ts` y `tiktok/browser.ts` toman `parseCaption`/tipos de `../social/…`; el test cambia `sources/tiktok/caption` por `sources/social/caption`.
- [ ] **Step 4: correr** `npx vitest run tests/rentals/` (la suite de TikTok intacta) + `tsc` → PASS.
- [ ] **Step 5: commit** — `refactor(rentals/social): leyenda, post y Chrome salen de tiktok/ a social/`.

---

### Task 3: `social/process.ts` y `social/store.ts`; TikTok los usa y devuelve un `PlatformRun`

**Files:**
- Create: `classes/rentals/sources/social/process.ts`, `classes/rentals/sources/social/store.ts`, `classes/rentals/sources/social/run.ts`
- Modify: `classes/rentals/sources/tiktok/index.ts`, `classes/rentals/sources/tiktok/store.ts`, `classes/models/RentalTiktokPost.ts` (campos opcionales `url`, `authorName`, `image`)
- Test: `tests/rentals/social.test.ts`

**Interfaces:**
- Produces:

```ts
// social/store.ts
export interface SocialPostRow extends RentalTiktokPostDocument { url?: string; authorName?: string; image?: string | null }
export interface SocialPostStore {
  loadPosts(ids: readonly string[]): Promise<Map<string, SocialPostRow>>;
  loadPostsByAuthors(authors: readonly string[]): Promise<Map<string, SocialPostRow>>;
  savePosts(rows: SocialPostRow[]): Promise<void>;
}
export interface SocialAccountStore<T> { loadAccounts(): Promise<T[]>; saveAccounts(rows: T[]): Promise<void> }
export function mongoPostStore(collection: string): SocialPostStore;
export function mongoAccountStore<T extends object>(collection: string, key: keyof T & string): SocialAccountStore<T>;
export interface SocialClaim { key: string; listingId: string; source: SocialSource; firstPublishedAt: string; lastSeenAt: string }
export interface ClaimStore { loadLiveClaims(since: string): Promise<Map<string, SocialClaim>>; saveClaims(rows: SocialClaim[]): Promise<void>; pruneClaims(before: string): Promise<void> }
export const mongoClaimStore: ClaimStore;     // colección rentalsocialclaims
// social/process.ts
export type GeocodeFn = (candidates: readonly string[], department: string, budget: { remaining: number }) => Promise<GeocodeOutcome>;
export type LocateZone = (lng: number, lat: number) => string | null;
export interface ProcessContext { usdUyu: number; observedAt: string; minCreateTime: number; geocodeBudget: { remaining: number }; geocode: GeocodeFn; locateZone: LocateZone }
export interface ProcessedPost { post: SocialPost; facts: CaptionFacts; row: RawRental | null; memory: SocialPostRow }
export interface ProcessCounts { tooOld: number; rejected: number; implausible: number; geocoded: number; contradicted: number }
export async function processPosts(posts: Iterable<SocialPost>, stored: ReadonlyMap<string, SocialPostRow>, ctx: ProcessContext): Promise<{ processed: ProcessedPost[]; counts: ProcessCounts }>;
export function defaultLocateZone(lng: number, lat: number): string | null;   // movido de tiktok/index.ts
// social/run.ts
export interface PlatformRun { result: RentalSourceResult; processed: ProcessedPost[] }
export function idleRun(source: SocialSource, note: string): PlatformRun;
export const plural: (n: number, one: string, many: string) => string;
export const envList: (value: string | undefined, fallback: string) => string[];
export const envNumber: (value: string | undefined, fallback: number) => number;   // acepta 0
// tiktok/index.ts
export async function harvestTiktokRun(mode: "full" | "fast", usdUyu: number, deps?: Partial<HarvestTiktokDeps>): Promise<PlatformRun>;
export async function harvestTiktok(mode, usdUyu, deps?): Promise<RentalSourceResult>;   // = (await harvestTiktokRun(...)).result
```

- [ ] **Step 1: test de `processPosts`** (ventana, rechazo, geocodificación una sola vez, memoria con url/autor/imagen)

```ts
import { processPosts } from "../../classes/rentals/sources/social/process";
const igPost = (id: string, text: string, createTime = 1790119737) => ({ source: "instagram" as const, id, url: `https://www.instagram.com/p/${id}/`,
  lines: text.split(/\n+/), createTime, author: { uniqueId: "inmobiliariaalquilar", nickname: "Inmobiliaria Alquiler Montevideo", secUid: "" }, cover: "https://scontent.cdninstagram.com/x.jpg", hashtags: [] });
describe("processPosts", () => {
  it("drops posts older than the window, rejects by caption, geocodes a new corner once and remembers url, author and image", async () => {
    const geocode = vi.fn(async () => ({ point: { latitude: -34.91, longitude: -56.15, address: "Charrúa & Luis Ponce" }, query: "q", tried: 1 }));
    const ctx = { usdUyu: 40, observedAt: "2026-09-24T05:00:00.000Z", minCreateTime: 1790000000, geocodeBudget: { remaining: 5 }, geocode, locateZone: () => "8" };
    const { processed, counts } = await processPosts([
      igPost("A", "Alquiler 1 dormitorio en Pocitos 📍 Charrúa y Luis Ponce — Pocitos $27.500"),
      igPost("B", "⛔️NO DISPONIBLE⛔️ Alquiler en Pocitos $20.000"),
      igPost("C", "Alquiler en Pocitos $30.000", 1780000000),
    ], new Map(), ctx);
    expect(counts).toMatchObject({ tooOld: 1, rejected: 1, geocoded: 1 });
    expect(processed.map(p => p.post.id)).toEqual(["A", "B"]);
    expect(processed[0]!.row).toMatchObject({ listingId: "instagram:A", latitude: -34.91 });
    expect(processed[0]!.memory).toMatchObject({ listingId: "instagram:A", url: "https://www.instagram.com/p/A/", authorName: "Inmobiliaria Alquiler Montevideo", image: "https://scontent.cdninstagram.com/x.jpg" });
    const again = await processPosts([igPost("A", "Alquiler 1 dormitorio en Pocitos 📍 Charrúa y Luis Ponce — Pocitos $27.500")], new Map([["A", processed[0]!.memory]]), ctx);
    expect(geocode).toHaveBeenCalledTimes(1);
    expect(again.processed[0]!.row).toMatchObject({ latitude: -34.91 });
  });
});
```

- [ ] **Step 2: FAIL.** **Step 3: implementar** `process.ts` con el paso 4 de `harvestTiktok` (sin cambios de reglas), `listingId: \`${post.source}:${post.id}\``, y la memoria con `url: post.url, authorName: post.author.nickname, image: post.cover`; `store.ts` con `connected()` (movido de `tiktok/store.ts`), `mongoPostStore`/`mongoAccountStore`/`mongoClaimStore`; `run.ts` con `PlatformRun`, `idleRun`, `plural`, `envList`, `envNumber`. `tiktok/store.ts` pasa a `appDbTiktokStore = { ...mongoAccountStore<TiktokAccountRow>("rentaltiktokaccounts", "uniqueId"), ...mongoPostStore("rentaltiktokposts") }`. `tiktok/index.ts`: paso 4 → `processPosts`, devuelve `{ result, processed }` desde `harvestTiktokRun`; `harvestTiktok` envuelve.
- [ ] **Step 4: correr** `npx vitest run tests/rentals/` + `tsc` → PASS (suite de TikTok sin cambios).
- [ ] **Step 5: commit** — `refactor(rentals/social): proceso y memoria compartidos; TikTok devuelve un PlatformRun`.

---

### Task 4: Guarda de copias (`social/copies.ts`) y `harvestSocial`

**Files:**
- Create: `classes/rentals/sources/social/copies.ts`, `classes/rentals/sources/social/index.ts`, `classes/models/RentalSocial.ts` (esquema de `rentalsocialclaims` y de las colecciones de las Tasks 5-6)
- Modify: `classes/rentals/sources/index.ts` (reemplaza `harvestTiktok` por `harvestSocial`, que devuelve un arreglo)
- Test: `tests/rentals/social.test.ts`

**Interfaces:**
- Produces:

```ts
export interface SocialEntry { source: SocialSource; listingId: string; row: RawRental; keys: string[]; createTime: number }
export function factKey(facts: CaptionFacts): string | null;
export function textKey(post: SocialPost): string | null;
export function entryFor(processed: ProcessedPost): SocialEntry | null;
export interface CopyResolution { keep: SocialEntry[]; copies: Array<{ entry: SocialEntry; of: string }>; claims: SocialClaim[] }
export function resolveCopies(entries: readonly SocialEntry[], live: ReadonlyMap<string, SocialClaim>, now: string): CopyResolution;
export interface HarvestSocialDeps { runs: Array<(mode: "full" | "fast", usdUyu: number) => Promise<PlatformRun>>; claims: ClaimStore; now: () => Date; env: NodeJS.ProcessEnv }
export async function harvestSocial(mode: "full" | "fast", usdUyu: number, deps?: Partial<HarvestSocialDeps>): Promise<RentalSourceResult[]>;
```

- [ ] **Step 1: tests**

```ts
import { factKey, resolveCopies, textKey, type SocialEntry } from "../../classes/rentals/sources/social/copies";
import { harvestSocial } from "../../classes/rentals/sources/social";

const facts = (corner: string | null, price: number | null, bedrooms: number | null) => ({ ...parseCaption(["Alquiler"], []), addressCandidates: corner ? [corner] : [], price, currency: "UYU" as const, bedrooms });
const entry = (source: SocialEntry["source"], id: string, keys: string[], createTime = 1790000000): SocialEntry =>
  ({ source, listingId: `${source}:${id}`, row: { listingId: `${source}:${id}` } as never, keys, createTime });
const NOW = "2026-09-24T05:00:00.000Z";

describe("the copy guard", () => {
  it("keys a flat by corner (streets in any order), price and bedrooms, and never without all three", () => {
    expect(factKey(facts("Gaboto y La Paz", 22000, 2))).toBe(factKey(facts("La Paz y Gaboto", 22000, 2)));
    expect(factKey(facts("Gaboto esq. La Paz", 22000, 2))).toBe(factKey(facts("La Paz y Gaboto", 22000, 2)));
    expect(factKey(facts("Gaboto y La Paz", 22000, 3))).not.toBe(factKey(facts("Gaboto y La Paz", 22000, 2)));
    expect(factKey(facts(null, 22000, 2))).toBeNull();
    expect(factKey(facts("Gaboto y La Paz", 22000, null))).toBeNull();
  });
  it("twins the carousel and the reel of one account by their caption, ignoring emojis and hashtags", () => {
    const text = "🏠 Alquiler Pocitos / Puerto del Buceo – 1 dormitorio 📍 Marco Bruto y Rivera 💰 $26.000 #alquiler";
    const post = (id: string, lines: string[]) => ({ source: "instagram" as const, id, url: "", lines, createTime: 1, author: { uniqueId: "inmobiliariaalquilar", nickname: "", secUid: "" }, cover: null, hashtags: [] });
    expect(textKey(post("a", [text]))).toBe(textKey(post("b", [text.replace("🏠 ", "") + " #reels"])));
    expect(textKey(post("c", ["Alquiler"]))).toBeNull();
  });
  it("publishes one of the same flat across networks: TikTok first, then the oldest", () => {
    const r = resolveCopies([entry("facebookreels", "1", ["k"], 1), entry("instagram", "2", ["k"], 2), entry("tiktok", "3", ["k"], 3), entry("instagram", "4", ["other"])], new Map(), NOW);
    expect(r.keep.map(e => e.listingId).sort()).toEqual(["instagram:4", "tiktok:3"]);
    expect(r.copies.map(c => [c.entry.listingId, c.of]).sort()).toEqual([["facebookreels:1", "tiktok:3"], ["instagram:2", "tiktok:3"]]);
    expect(r.claims).toEqual(expect.arrayContaining([expect.objectContaining({ key: "k", listingId: "tiktok:3", firstPublishedAt: NOW, lastSeenAt: NOW })]));
  });
  it("keeps the flat with its first publisher: a live claimant seen today wins, and one unseen today blocks every copy", () => {
    const live = new Map([["k", { key: "k", listingId: "instagram:2", source: "instagram" as const, firstPublishedAt: "2026-09-10T00:00:00.000Z", lastSeenAt: "2026-09-23T05:00:00.000Z" }]]);
    const seen = resolveCopies([entry("tiktok", "3", ["k"]), entry("instagram", "2", ["k"])], live, NOW);
    expect(seen.keep.map(e => e.listingId)).toEqual(["instagram:2"]);
    expect(seen.claims.find(c => c.key === "k")).toMatchObject({ listingId: "instagram:2", firstPublishedAt: "2026-09-10T00:00:00.000Z", lastSeenAt: NOW });
    const unseen = resolveCopies([entry("tiktok", "3", ["k"])], live, NOW);
    expect(unseen.keep).toEqual([]);
    expect(unseen.copies).toEqual([expect.objectContaining({ of: "instagram:2" })]);
    expect(unseen.claims).toEqual([]);
  });
  it("never groups an entry without keys", () => {
    expect(resolveCopies([entry("tiktok", "1", []), entry("tiktok", "2", [])], new Map(), NOW).keep).toHaveLength(2);
  });
});

describe("harvestSocial", () => {
  it("runs every network, drops copies across them, says so in the note, and survives a network that throws", async () => {
    const processed = (source: "tiktok" | "instagram", id: string, corner: string) => {
      const text = `Alquiler 2 dormitorios en Montevideo 📍 ${corner} $22.000`;
      const f = parseCaption([text], []);
      const row = { listingId: `${source}:${id}`, source } as never;
      return { post: { source, id, url: "", lines: [text], createTime: 1790000000, author: { uniqueId: "a", nickname: "", secUid: "" }, cover: null, hashtags: [] }, facts: f, row, memory: {} as never };
    };
    const run = (source: "tiktok" | "instagram", items: ReturnType<typeof processed>[]) => async () =>
      ({ result: { key: source, ok: true, complete: false, listings: items.map(p => p.row), note: `${items.length} avisos` }, processed: items });
    const saved: unknown[] = [];
    const claims = { loadLiveClaims: async () => new Map(), saveClaims: async (rows: unknown[]) => { saved.push(...rows); }, pruneClaims: async () => {} };
    const results = await harvestSocial("full", 40, {
      runs: [run("tiktok", [processed("tiktok", "1", "Gaboto y La Paz")]), run("instagram", [processed("instagram", "A", "La Paz y Gaboto"), processed("instagram", "B", "Rivera y Soca")]),
        async () => { throw new Error("boom"); }],
      claims, now: () => new Date(NOW), env: {},
    });
    expect(results.map(r => [r.key, r.listings.length])).toEqual([["tiktok", 1], ["instagram", 1], ["facebookreels", 0]]);
    expect(results[1]!.note).toContain("1 copia de un aviso ya publicado");
    expect(results[2]).toMatchObject({ ok: false, complete: false });
    expect(saved.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: FAIL.** **Step 3: implementar** `copies.ts`:

```ts
import { createHash } from "node:crypto";
import { flatten } from "../../normalize";
import type { RawRental } from "../../types";
import type { CaptionFacts } from "./caption";
import { SOCIAL_SOURCES, type SocialPost, type SocialSource } from "./post";
import type { ProcessedPost } from "./process";
import type { SocialClaim } from "./store";

export interface SocialEntry { source: SocialSource; listingId: string; row: RawRental; keys: string[]; createTime: number }

const CONNECTOR = /\s+(?:y|e|esq\.?|esquina|casi|entre)\s+/;
export function factKey(facts: CaptionFacts): string | null {
  const corner = facts.addressCandidates[0];
  if (!corner || facts.price === null || !facts.currency || facts.bedrooms === null) return null;
  const streets = flatten(corner).split(CONNECTOR).map(s => s.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean).sort();
  if (!streets.length) return null;
  return `hechos:${streets.join("|")}:${facts.currency}${facts.price}:${facts.bedrooms}d`;
}
export function textKey(post: SocialPost): string | null {
  const normalized = flatten(post.lines.join(" ")).replace(/#\S+/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  if (normalized.length < 40) return null;
  return `texto:${post.source}:${post.author.uniqueId}:${createHash("sha1").update(normalized).digest("hex").slice(0, 16)}`;
}
export function entryFor(p: ProcessedPost): SocialEntry | null {
  if (!p.row) return null;
  return { source: p.post.source, listingId: p.row.listingId, row: p.row, keys: [factKey(p.facts), textKey(p.post)].filter((k): k is string => !!k), createTime: p.post.createTime };
}

export function resolveCopies(entries: readonly SocialEntry[], live: ReadonlyMap<string, SocialClaim>, now: string): CopyResolution {
  // union-find by shared key
  const parent = entries.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const byKey = new Map<string, number>();
  entries.forEach((e, i) => { for (const k of e.keys) { const j = byKey.get(k); if (j === undefined) byKey.set(k, i); else parent[find(i)] = find(j); } });
  const groups = new Map<number, SocialEntry[]>();
  entries.forEach((e, i) => { const r = find(i); groups.set(r, [...(groups.get(r) || []), e]); });
  const rank = (e: SocialEntry) => SOCIAL_SOURCES.indexOf(e.source);
  const out: CopyResolution = { keep: [], copies: [], claims: [] };
  for (const members of groups.values()) {
    const keys = [...new Set(members.flatMap(m => m.keys))];
    const claimants = keys.map(k => live.get(k)).filter((c): c is SocialClaim => !!c)
      .sort((a, b) => a.firstPublishedAt.localeCompare(b.firstPublishedAt) || a.listingId.localeCompare(b.listingId));
    const ids = new Set(members.map(m => m.listingId));
    const seenClaimant = claimants.find(c => ids.has(c.listingId));
    let canonical: SocialEntry | undefined;
    if (seenClaimant) canonical = members.find(m => m.listingId === seenClaimant.listingId);
    else if (claimants.length) { for (const m of members) out.copies.push({ entry: m, of: claimants[0]!.listingId }); continue; }
    else canonical = [...members].sort((a, b) => rank(a) - rank(b) || a.createTime - b.createTime || a.listingId.localeCompare(b.listingId))[0];
    out.keep.push(canonical!);
    for (const m of members) if (m !== canonical) out.copies.push({ entry: m, of: canonical!.listingId });
    const first = claimants.filter(c => c.listingId === canonical!.listingId).map(c => c.firstPublishedAt).sort()[0] || now;
    for (const key of keys) out.claims.push({ key, listingId: canonical!.listingId, source: canonical!.source, firstPublishedAt: first, lastSeenAt: now });
  }
  return out;
}
```

`social/index.ts`:

```ts
export async function harvestSocial(mode, usdUyu, overrides = {}): Promise<RentalSourceResult[]> {
  const deps: HarvestSocialDeps = { runs: [harvestTiktokRun, harvestInstagramRun, harvestFacebookReelsRun], claims: mongoClaimStore, now: () => new Date(), env: process.env, ...overrides };
  const runs: PlatformRun[] = [];
  for (const [index, run] of deps.runs.entries()) {
    try { runs.push(await run(mode, usdUyu)); }
    catch (error) { runs.push({ result: { key: SOCIAL_SOURCES[index]!, ok: false, complete: false, listings: [], note: `falla: ${String((error as Error)?.name || "Error")}` }, processed: [] }); }
  }
  const entries = runs.flatMap(r => r.processed.map(entryFor).filter((e): e is SocialEntry => !!e));
  if (!entries.length) return runs.map(r => r.result);
  const now = deps.now().toISOString();
  const pruneDays = envNumber(deps.env.RENTALS_PRUNE_DAYS, 21);
  const since = new Date(deps.now().getTime() - pruneDays * 86_400_000).toISOString();
  const live = await deps.claims.loadLiveClaims(since).catch(() => new Map<string, SocialClaim>());
  const resolution = resolveCopies(entries, live, now);
  const kept = new Set(resolution.keep.map(e => e.listingId));
  const copies = new Map<string, number>();
  for (const c of resolution.copies) copies.set(c.entry.source, (copies.get(c.entry.source) ?? 0) + 1);
  await deps.claims.saveClaims(resolution.claims).catch(e => console.warn(`[social] no se pudieron guardar los reclamos: ${String(e?.name || e)}`));
  await deps.claims.pruneClaims(new Date(deps.now().getTime() - 60 * 86_400_000).toISOString()).catch(() => undefined);
  return runs.map(({ result }) => {
    const n = copies.get(result.key as SocialSource) ?? 0;
    return { ...result, listings: result.listings.filter(row => kept.has(row.listingId)),
      note: n ? `${result.note}; ${plural(n, "copia de un aviso ya publicado", "copias de avisos ya publicados")} (en esta u otra red)` : result.note };
  });
}
```

`sources/index.ts`: `const [ml, ic, fb, cw, ep, social] = await Promise.all([… , harvestSocial(mode, usdUyu)]); const runs = [ml, ic, fb, cw, ep, ...social];`. Until Tasks 5–6, `deps.runs` default lists only `harvestTiktokRun` plus idle runs `() => idleRun("instagram", …)`/`idleRun("facebookreels", …)`.

- [ ] **Step 4: correr** `npx vitest run tests/rentals/` + `tsc` → PASS.
- [ ] **Step 5: commit** — `feat(rentals/social): una sola copia de la misma vivienda entre redes, con reclamos estables`.

---

### Task 5: Instagram

**Files:**
- Create: `classes/rentals/sources/social/instagram/page.ts`, `…/instagram/browser.ts`, `…/instagram/index.ts`
- Create fixtures: `tests/rentals/fixtures/instagram-profile.html`, `instagram-missing.html`, `instagram-post.html`
- Modify: `classes/rentals/sources/social/index.ts` (default run), `classes/models/RentalSocial.ts`
- Test: `tests/rentals/instagram.test.ts`

**Interfaces:**
- Produces:

```ts
// page.ts
export interface InstagramProfile { exists: boolean; name: string; codes: string[] }
export function parseInstagramProfile(html: string, handle: string): InstagramProfile | null;   // null = not a profile page (challenge/login)
export function postFromInstagramHtml(html: string, code: string): SocialPost | null;
export function postFromInstagramMemory(row: SocialPostRow): SocialPost | null;
// browser.ts
export interface InstagramAccountRead { handle: string; profile: InstagramProfile | null; posts: SocialPost[]; failures: number }
export interface InstagramPlan { accounts: string[]; known: ReadonlySet<string>; maxNewPerAccount: number; gapMs: number; budgetMs: number; proxy: string | null }
export interface InstagramResults { accounts: Map<string, InstagramAccountRead>; launched: boolean; note: string }
export type InstagramReader = (plan: InstagramPlan) => Promise<InstagramResults>;
export const readInstagram: InstagramReader;
// index.ts
export type InstagramStatus = "semilla" | "activa" | "candidata" | "no existe" | "descartada";
export interface InstagramAccountRow { handle: string; name: string; status: InstagramStatus; firstSeen: string; checkedAt: string | null; lastReadAt: string | null; lastPostAt: string | null; published: number; evaluated: number; reads: number; note: string | null }
export interface HarvestInstagramDeps { readInstagram: InstagramReader; accounts: SocialAccountStore<InstagramAccountRow>; posts: SocialPostStore; tiktokHandles: () => Promise<string[]>; geocode: GeocodeFn; locateZone: LocateZone; now: () => Date; env: NodeJS.ProcessEnv }
export async function harvestInstagramRun(mode: "full" | "fast", usdUyu: number, deps?: Partial<HarvestInstagramDeps>): Promise<PlatformRun>;
```

- [ ] **Step 1: fixtures** (real values from the 2026-09-24 probe of `@inmobiliariaalquilar`; the post page carries a RELATED post's node FIRST):

`instagram-profile.html`:
```html
<!DOCTYPE html><html><head><title>Inmobiliaria Alquiler Montevideo (@inmobiliariaalquilar) • Fotos y videos de Instagram</title></head>
<body><a href="/inmobiliariaalquilar/p/Ddo4yVYiX9j/">1</a><a href="/p/Ddm6q_TiZ2l/">2</a><a href="/reel/DdrDonPR85C/">3</a><a href="/p/Ddo4yVYiX9j/">dup</a><a href="/explore/tags/alquiler/">tag</a></body></html>
```
`instagram-missing.html`: `<!DOCTYPE html><html><head><title>Profile no está disponible • Instagram</title></head><body></body></html>`
`instagram-post.html`: two `<script type="application/json">` blobs; the first holds `{"related":{"items":[{"code":"Ddm4CelmLhP","taken_at":1790118356,"product_type":"carousel_container","caption":{"text":"🤩 ALQUILER POCITOS / PUNTA CARRETAS – 1 DORMITORIO\n\n📍 Scoseria y Luis de la Torre\n💰 $29.500 + $4.900 de gastos comunes"},"user":{"username":"inmobiliariaalquilar","full_name":"Inmobiliaria Alquiler Montevideo"}}]}}`, the second `{"data":{"xdt_api__v1__media__shortcode__web_info":{"items":[{"code":"Ddm6q_TiZ2l","pk":"1","taken_at":1790119737,"product_type":"carousel_container","caption":{"text":"🏠 Alquiler 1 dormitorio en Pocitos\n\n📍 Charrúa y Luis Ponce — Pocitos\n\n🔹 $27.500\n🔹 Gastos comunes: $5.500\n🔹 Garantías: Anda, CGN y aseguradoras\n\n📲 099 232 050 WhatsApp #alquiler #pocitos"},"user":{"username":"inmobiliariaalquilar","full_name":"Inmobiliaria Alquiler Montevideo","pk":"55"},"image_versions2":{"candidates":[{"url":"https://scontent-yyz1-1.cdninstagram.com/v/t51.82787-15/8202.jpg"}]}}]}}}`.

- [ ] **Step 2: tests**

```ts
describe("Instagram pages, logged out", () => {
  it("lists a profile's post codes once each, and says when a handle does not exist", () => {
    expect(parseInstagramProfile(fixture("instagram-profile"), "inmobiliariaalquilar")).toEqual({ exists: true, name: "Inmobiliaria Alquiler Montevideo", codes: ["Ddo4yVYiX9j", "Ddm6q_TiZ2l", "DdrDonPR85C"] });
    expect(parseInstagramProfile(fixture("instagram-missing"), "cap.propiedades")).toEqual({ exists: false, name: "", codes: [] });
    expect(parseInstagramProfile("<title>Instagram</title>", "x")).toBeNull();
  });
  it("reads THE post of the code asked for, not the related post that comes first", () => {
    const post = postFromInstagramHtml(fixture("instagram-post"), "Ddm6q_TiZ2l")!;
    expect(post).toMatchObject({ source: "instagram", id: "Ddm6q_TiZ2l", url: "https://www.instagram.com/p/Ddm6q_TiZ2l/", createTime: 1790119737,
      author: { uniqueId: "inmobiliariaalquilar", nickname: "Inmobiliaria Alquiler Montevideo", secUid: "55" }, cover: "https://scontent-yyz1-1.cdninstagram.com/v/t51.82787-15/8202.jpg", hashtags: ["alquiler", "pocitos"] });
    expect(post.lines[0]).toBe("🏠 Alquiler 1 dormitorio en Pocitos");
    expect(postFromInstagramHtml(fixture("instagram-post"), "ZZZZZZZZZZZ")).toBeNull();
    expect(postFromInstagramHtml(fixture("instagram-post"), "Ddm4CelmLhP")!.url).toBe("https://www.instagram.com/p/Ddm4CelmLhP/");
  });
  it("rebuilds a known post from memory without reading it again", () => {
    const post = postFromInstagramHtml(fixture("instagram-post"), "Ddm6q_TiZ2l")!;
    const row = { listingId: "instagram:Ddm6q_TiZ2l", id: post.id, uniqueId: post.author.uniqueId, createTime: post.createTime, readAt: "2026-09-24T05:00:00.000Z", text: post.lines.join("\n"), hashtags: post.hashtags, url: post.url, authorName: post.author.nickname, image: post.cover } as never;
    expect(postFromInstagramMemory(row)).toMatchObject({ id: "Ddm6q_TiZ2l", url: post.url, createTime: post.createTime, author: { uniqueId: "inmobiliariaalquilar" }, cover: post.cover });
  });
});

describe("harvestInstagramRun", () => {
  // memory stores and a fake reader: profile codes + posts built from the fixture
  it("reads seeds and TikTok candidates, skips known codes, and moves accounts through their states", async () => { /* see Step 3 of the plan: seeds inmobiliariaalquilar;
     candidates ["cap.propiedades","habitarte.inmobiliaria"]; reader answers exists:false for cap.propiedades (→ "no existe"),
     4 Mexican captions without Uruguay for habitarte (→ "descartada", evaluated 4), and for the seed 2 new + 1 known code;
     assert: reader got known = {the known code}; seed published >=1 and status stays "semilla"; the known post was rebuilt (its listingId in result);
     result.complete === false. */ });
  it("does not re-read a descartada or no-existe account for 30 days", async () => { /* registry row checkedAt 2026-09-10 → not in plan.accounts; checkedAt 2026-08-20 → in plan.accounts */ });
  it("does nothing in the hourly run or when disabled", async () => { /* RENTALS_INSTAGRAM_ENABLED=0 and mode "fast" → idle, reader not called */ });
});
```
(The two harvester tests are written out in full in the test file with the fixture captions: the Mexican ones are `"¡Iniciamos Preventa! Residencial Terrazas del Sur, 2 a 3 recámaras, precios de contado $1.850.000 alquiler"`-style captions without any Uruguay evidence.)

- [ ] **Step 3: implementar**

`page.ts`:
```ts
import type { SocialPost } from "../post";
import { hashtagsIn } from "../post";
import type { SocialPostRow } from "../store";

const MISSING = /no está disponible|isn't available|not available|Página no disponible/i;
const HTTPS = /^https:\/\/[^\s"'<>]+$/;
function* walk(node: unknown): Generator<Record<string, any>> {
  if (node && typeof node === "object") { yield node as Record<string, any>; for (const v of Array.isArray(node) ? node : Object.values(node)) yield* walk(v); }
}
const titleOf = (html: string): string => (/<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&#064;/g, "@").trim();

export function parseInstagramProfile(html: string, handle: string): InstagramProfile | null {
  const title = titleOf(html);
  if (MISSING.test(title)) return { exists: false, name: "", codes: [] };
  const marker = `(@${handle.toLowerCase()})`;
  if (!title.toLowerCase().includes(marker)) return null;
  const name = title.slice(0, title.toLowerCase().indexOf(marker)).trim();
  const codes: string[] = [];
  for (const m of html.matchAll(/\/(?:p|reel)\/([A-Za-z0-9_-]{8,20})\//g)) if (!codes.includes(m[1]!)) codes.push(m[1]!);
  return { exists: true, name, codes };
}

export function postFromInstagramHtml(html: string, code: string): SocialPost | null {
  for (const [, raw] of html.matchAll(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data: unknown; try { data = JSON.parse(raw!); } catch { continue; }
    for (const d of walk(data)) {
      if (d.code !== code || typeof d.taken_at !== "number") continue;
      const username = typeof d.user?.username === "string" ? d.user.username : "";
      if (!/^[\w.]{1,40}$/.test(username)) continue;
      const text = typeof d.caption?.text === "string" ? d.caption.text.slice(0, 4_000) : "";
      const image = d.image_versions2?.candidates?.[0]?.url;
      return {
        source: "instagram", id: code,
        url: d.product_type === "clips" ? `https://www.instagram.com/reel/${code}/` : `https://www.instagram.com/p/${code}/`,
        lines: text.split(/\n+/).map((l: string) => l.trim()).filter(Boolean), createTime: Math.floor(d.taken_at),
        author: { uniqueId: username, nickname: typeof d.user?.full_name === "string" && d.user.full_name.trim() ? d.user.full_name.trim().slice(0, 120) : username, secUid: d.user?.pk ? String(d.user.pk) : "" },
        cover: typeof image === "string" && HTTPS.test(image) ? image : null, hashtags: hashtagsIn(text),
      };
    }
  }
  return null;
}

export function postFromInstagramMemory(row: SocialPostRow): SocialPost | null {
  if (!row?.id || !row.text || !row.uniqueId || !row.createTime) return null;
  return { source: "instagram", id: row.id, url: row.url || `https://www.instagram.com/p/${row.id}/`, lines: row.text.split(/\n+/).filter(Boolean),
    createTime: row.createTime, author: { uniqueId: row.uniqueId, nickname: row.authorName || row.uniqueId, secUid: "" }, cover: row.image || null, hashtags: row.hashtags || [] };
}
```

`browser.ts`: `readInstagram` = `launchChrome(plan.proxy, "Instagram")`; per handle: `goto https://www.instagram.com/<handle>/` (`networkidle2`, 45 s, catch), `parseInstagramProfile(content)`; if `profile?.exists`, each code not in `plan.known` (≤ `maxNewPerAccount`): `sleep(gapMs)`, `goto https://www.instagram.com/p/<code>/` (`domcontentloaded`), `sleep(2500)`, `postFromInstagramHtml(content, code)` or `failures++`; `/accounts/login/` in the URL stops that account and notes it; budget checked before each navigation; `browser.close()` in `finally`.

`index.ts` (`harvestInstagramRun`): disabled/fast → `idleRun`; `known` registry + `envList(RENTALS_INSTAGRAM_ACCOUNTS, "inmobiliariaalquilar")` seeds (`semilla`) + `tiktokHandles()` not in the registry (`candidata`); eligible = `semilla|activa|candidata`, or `no existe|descartada` with `checkedAt` older than 30 days; order semilla/activa by `lastReadAt` asc, then the rest by `firstSeen`, `handle`; cap `RENTALS_INSTAGRAM_MAX_ACCOUNTS` (40). `stored = posts.loadPostsByAuthors(accounts)`; reader with `known = stored ids`, `maxNewPerAccount` 12, `RENTALS_INSTAGRAM_GAP_MS` 2500, `RENTALS_INSTAGRAM_BUDGET_MS` 720000, `RENTALS_INSTAGRAM_PROXY` or null. Posts = new reads + `postFromInstagramMemory(stored.get(code))` for each listed known code. `processPosts` → registry: profile null → note "perfil ilegible"; `exists: false` → "no existe", `checkedAt`; exists → name, `checkedAt`, `lastReadAt`, `reads++`, `lastPostAt`, `published` = accepted this run, `evaluated += posts of that author evaluated`; accepted > 0 and status candidata → "activa"; candidata with `evaluated >= 3` and nothing accepted → "descartada". Save posts, save accounts. Result: `ok = launched && some profile answered (exists true or false)`; `complete: false`; note `"${avisos} de ${posts} posts (…); ${leídas} de ${cuentas} cuentas (${activas} activas, ${candidatas} candidatas, ${descartadas} descartadas, ${noExiste} sin perfil)"`.

`social/index.ts`: default run for Instagram = `harvestInstagramRun`, with `tiktokHandles = () => appDbTiktokStore.loadAccounts().then(rows => rows.map(r => r.uniqueId))`.

- [ ] **Step 4: correr** `npx vitest run tests/rentals/` + `tsc` → PASS.
- [ ] **Step 5: commit** — `feat(rentals/instagram): cuentas verificadas, sólo los posts nuevos se leen, sin sesión`.

---

### Task 6: Facebook Reels

**Files:**
- Create: `classes/rentals/sources/social/facebookreels/page.ts`, `…/browser.ts`, `…/index.ts`
- Create fixture: `tests/rentals/fixtures/facebook-reels-search.html`
- Modify: `classes/rentals/sources/social/index.ts` (default run)
- Test: `tests/rentals/facebookreels.test.ts`

**Interfaces:**
- Produces:

```ts
export function reelsFromFacebookHtml(html: string): SocialPost[];
export interface FacebookReelsPlan { pages: string[]; gapMs: number; budgetMs: number; proxy: string | null }
export interface FacebookReelsResults { pages: Map<string, { posts: SocialPost[]; failure: string | null }>; launched: boolean; note: string }
export type FacebookReelsReader = (plan: FacebookReelsPlan) => Promise<FacebookReelsResults>;
export const readFacebookReels: FacebookReelsReader;
export interface HarvestFacebookReelsDeps { readFacebookReels: FacebookReelsReader; posts: SocialPostStore; geocode: GeocodeFn; locateZone: LocateZone; now: () => Date; env: NodeJS.ProcessEnv }
export async function harvestFacebookReelsRun(mode: "full" | "fast", usdUyu: number, deps?: Partial<HarvestFacebookReelsDeps>): Promise<PlatformRun>;
export function facebookReelsPages(env: NodeJS.ProcessEnv): string[];
```

- [ ] **Step 1: fixture** — one `<script type="application/json">` with `{"require":[["X",null,null,[{"__bbox":{"result":{"data":{"serpResponse":{"results":{"edges":[ … ]}}}}}}]]]}` and four `node.story` objects built from the 2026-09-24 VPS probe: Alagoa (`post_id` "1696598655805785", `actors[0]` {name "Alagoa Negocios Inmobiliarios", url "https://www.facebook.com/AlagoaNegociosInmobiliarios", id "100063"}, message "🏡ALQUILER $ 18.000 | Pocitos | Mono ambiente luminoso al contra frente\n📍 Excelente ubicación sobre Pereira esquina Benito Blanco.\n#alquiler #pocitos", attachment media {videoId "1585970963272286", publish_time 1789418715, thumbnailImage.uri "https://scontent-eze1-2.xx.fbcdn.net/v/t51/a.jpg"}, `permalink_url` "https://www.facebook.com/reel/1585970963272286/", and a `FbShortsVideoAttachmentStyleInfo` typename); "Inmobiliaria en Montevideo" (`actors[0].url` "https://www.facebook.com/people/Inmobiliaria-en-Montevideo/61577037072561/", videoId "814498925053427", publish 1786121406, "🤩 Alquiler Cordón Sur Monoambiente\n\n📍 Jackson y Canelones\n💰 $25.500\n💵 Gastos comunes: $5.000"); the Dominican reel ("¡ALQUILO APARTAMENTO SÚPER GRANDE POR SOLO RD$13,000! 📍 Km 17 Autopista Duarte", videoId "992002840566526"); and a PHOTO story without any `videoId` ("📌✅¡ESTUDIO HOME ALQUILA EN AGUADA! … $ 24.000", attachments with `__typename: "Photo"`). The Alagoa story appears twice in the blob (the search repeats nodes).
- [ ] **Step 2: tests**

```ts
describe("Facebook Reels, logged out", () => {
  it("reads each video story once: caption, author, reel URL, date and thumbnail; a photo post is not a reel", () => {
    const posts = reelsFromFacebookHtml(fixture("facebook-reels-search"));
    expect(posts.map(p => p.id)).toEqual(["1696598655805785", "122181646544901235", "4545717008976910"]);
    expect(posts[0]).toMatchObject({ source: "facebookreels", url: "https://www.facebook.com/reel/1585970963272286/", createTime: 1789418715,
      author: { uniqueId: "AlagoaNegociosInmobiliarios", nickname: "Alagoa Negocios Inmobiliarios", secUid: "100063" }, cover: "https://scontent-eze1-2.xx.fbcdn.net/v/t51/a.jpg", hashtags: ["alquiler", "pocitos"] });
    expect(posts[1]!.author.uniqueId).toBe("61577037072561");
  });
  it("publishes the Uruguayan reels and refuses the Dominican one", async () => {
    const reader = vi.fn(async (plan: FacebookReelsPlan) => ({ launched: true, note: "", pages: new Map(plan.pages.map(url => [url, { posts: reelsFromFacebookHtml(fixture("facebook-reels-search")), failure: null }])) }));
    const saved: unknown[] = [];
    const run = await harvestFacebookReelsRun("full", 40, { readFacebookReels: reader, posts: { loadPosts: async () => new Map(), loadPostsByAuthors: async () => new Map(), savePosts: async rows => { saved.push(...rows); } },
      geocode: async () => ({ point: null, query: null, tried: 0 }), locateZone: () => null, now: () => new Date("2026-09-24T05:00:00.000Z"), env: { RENTALS_FBREELS_QUERIES: "alquiler montevideo", RENTALS_FBREELS_TAGS: "" } });
    expect(reader.mock.calls[0]![0].pages).toEqual(["https://www.facebook.com/watch/search/?q=alquiler%20montevideo"]);
    expect(run.result).toMatchObject({ key: "facebookreels", ok: true, complete: false });
    expect(run.result.listings.map(r => r.listingId)).toEqual(["facebookreels:1696598655805785"]);   // Cordón Sur is 60 days old
    expect(saved.find((r: any) => r.id === "4545717008976910")).toMatchObject({ rejected: "sin evidencia de Uruguay" });
  });
  it("does nothing in the hourly run or when disabled", async () => { /* RENTALS_FBREELS_ENABLED=0, mode fast → idle, reader not called */ });
});
```

- [ ] **Step 3: implementar**

`page.ts`:
```ts
function handleOf(url: unknown, id: string): string {
  try {
    const u = new URL(String(url || ""));
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "people" && parts[2]) return parts[2];
    if (parts[0] === "profile.php") return u.searchParams.get("id") || id;
    if (parts[0] && /^[\w.-]{2,80}$/.test(parts[0])) return parts[0];
  } catch { /* no url */ }
  return id;
}
export function reelsFromFacebookHtml(html: string): SocialPost[] {
  const out = new Map<string, SocialPost>();
  for (const [, raw] of html.matchAll(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data: unknown; try { data = JSON.parse(raw!); } catch { continue; }
    for (const d of walk(data)) {
      if (typeof d.post_id !== "string" || !/^\d{6,25}$/.test(d.post_id) || typeof d.message?.text !== "string" || !Array.isArray(d.actors) || out.has(d.post_id)) continue;
      let videoId = "", publish = 0, thumb = "", permalink = "";
      for (const n of walk(d)) {
        if (!videoId && typeof n.videoId === "string" && /^\d{6,25}$/.test(n.videoId)) videoId = n.videoId;
        if (typeof n.publish_time === "number") publish = Math.max(publish, n.publish_time);
        if (typeof n.creation_time === "number") publish = Math.max(publish, n.creation_time);
        if (!thumb && typeof n.thumbnailImage?.uri === "string") thumb = n.thumbnailImage.uri;
        if (!permalink && typeof n.permalink_url === "string" && /facebook\.com\/(?:reel|watch|[^/]+\/videos)\//.test(n.permalink_url)) permalink = n.permalink_url;
      }
      if (!videoId || !publish) continue;
      const actor = d.actors[0] || {};
      const text = d.message.text.slice(0, 4_000);
      out.set(d.post_id, { source: "facebookreels", id: d.post_id, url: permalink || `https://www.facebook.com/reel/${videoId}/`,
        lines: text.split(/\n+/).map((l: string) => l.trim()).filter(Boolean), createTime: publish,
        author: { uniqueId: handleOf(actor.url, String(actor.id || "")), nickname: typeof actor.name === "string" ? actor.name.slice(0, 120) : "", secUid: actor.id ? String(actor.id) : "" },
        cover: /^https:\/\/[^\s"'<>]+$/.test(thumb) ? thumb : null, hashtags: hashtagsIn(text) });
    }
  }
  return [...out.values()];
}
```

`browser.ts`: `launchChrome(plan.proxy, "Facebook Reels")`; each page: `sleep(gapMs)`, `goto` (`domcontentloaded`, 60 s), `sleep(5000)`, `reelsFromFacebookHtml(content)`; failure when navigation throws or the URL lands on `/login`; budget before each page; `browser.close()` in `finally`.

`index.ts`: `facebookReelsPages(env)` = `envList(RENTALS_FBREELS_QUERIES, DEFAULT_QUERIES).map(q => \`https://www.facebook.com/watch/search/?q=${encodeURIComponent(q)}\`)` + `envList(RENTALS_FBREELS_TAGS, "alquilermontevideo,alquileruruguay").map(t => \`https://www.facebook.com/hashtag/${encodeURIComponent(t)}\`)`; run: disabled/fast → idle; read (`RENTALS_FBREELS_GAP_MS` 2500, `RENTALS_FBREELS_BUDGET_MS` 360000, `RENTALS_FBREELS_PROXY`); posts deduped by id; `stored = posts.loadPosts(ids)`; `processPosts` (window `RENTALS_FBREELS_MAX_AGE_DAYS` 45, geocode budget `RENTALS_FBREELS_GEOCODE_MAX` 30); save; result `ok = launched && some page read without failure`, `complete: false`, note `"${avisos} de ${reels} reels (…); ${leídas} de ${páginas} páginas"`.

- [ ] **Step 4: correr** `npx vitest run tests/rentals/` + `tsc` → PASS.
- [ ] **Step 5: commit** — `feat(rentals/facebookreels): búsquedas de video sin sesión, sólo historias con video`.

---

### Task 7: Docs, AGENTS y memoria

- `docs/app/RENTALS.md`: sección "Instagram y Facebook Reels — 24 de setiembre de 2026" con la tabla medida, la guarda de copias y el caso YouTube; filas en "Fuentes"; variables `RENTALS_INSTAGRAM_*`, `RENTALS_FBREELS_*`.
- `AGENTS.md`: la celda de `currency-rentals` suma una oración.
- Memoria: `redes-sociales-fuentes-alquileres.md` + línea en `propiedades-index.md`.
- Commit — `docs(rentals): Instagram y Facebook Reels — lo medido, la guarda de copias y las variables`.

### Task 8: Verificación, merge, deploy, medición

- `npx vitest run` (root), `cd app && npx vitest run tests/unit/rentalsCoverage.test.ts tests/unit/rentalSourceStatus.test.ts`, `cd mcp && npm run build`, `tsc`, `npx prettier --check` sobre los archivos del app tocados, `gitleaks git . --log-opts="origin/main..HEAD"`.
- En el VPS antes del merge: build de la rama en un worktree temporal (sin junctions) y `harvestSocial("full", 41)` con presupuestos chicos, midiendo notas y avisos por red.
- Push a `main` (un solo push con los cambios del app juntos), `gh run watch`; si el filtro saltea el app, `workflow_dispatch`.
- `pm2 restart currency-rentals` y medir `rentalmetas` + `/api/rentals?source=instagram|facebookreels`.
