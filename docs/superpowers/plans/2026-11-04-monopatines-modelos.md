# Monopatines: página por modelo + comparador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** agrupar los avisos de monopatín en modelos, publicar una página por modelo con todas sus
ofertas y su ficha de consenso, y un comparador de 2–3 modelos.

**Architecture:** identidad y catálogo puros en `classes/movilidad/models/`, escritos por el job
existente `sync_movilidad_specs.ts` en APP DB `movilidadmodels`; dos rutas Nitro de sólo lectura; tres
páginas Nuxt (hub movido a `index.vue`, `[modelo].vue`, `comparar.vue`).

**Tech Stack:** TypeScript 6, mongoose, vitest; Nuxt 4 + Vuetify 4.

**Spec:** `docs/superpowers/specs/2026-11-04-monopatines-modelos-design.md`

## Global Constraints
- Nada de `vertical: 'equipar'` cambia: lo nuevo se ata a monopatín.
- Facebook nunca entra a un modelo; su imagen nunca se guarda en un modelo.
- Consenso de ficha: sólo valores con `from` = `ficha` | `descripcion`.
- Modelo publicado = ≥ 2 avisos; indexable = `sellers >= 2` y ≥ 3 campos numéricos de consenso.
- API sirve `lastSeen >= hoy − 7 días`; slug `^[a-z0-9]+(?:-[a-z0-9]+){1,6}$`.
- Corrida flaca: < 40 % de los modelos frescos guardados → no escribe modelos.
- Español rioplatense en todo texto visible; NBSP vía `String.fromCharCode(160)`; nunca un segundo
  `import type` del mismo módulo (memoria eslint-fix).
- Repo público: cero cifras de ingreso.

## Review Focus
1. Dos modelos distintos que comparten prefijo (6 / 6 Lite / 6 Pro; T1 / T1 Max; Tenacity / Tenacity Pro)
   nunca se unen — test en Task 2.
2. Título con la marca repetida o el modelo antes de la marca ("Xiaomi Monopatin Xiaomi Electric
   Scooter 6", "Scooter 6 Max Xiaomi") — test en Task 2.
3. Un modelo cuyas fichas se contradicen (autonomía 60 y 70) publica la mediana y "1 de 2" — Task 3.
4. Un slug que deja de verse > 7 días da 404, no una página con precio viejo — Task 5.
5. El hub sin catálogo nuevo (colección vacía o caída) sigue mostrando la tabla vieja — Task 6.

---

### Task 1: Negaciones y rangos de la ficha
**Files:** `classes/movilidad/specs/parse.ts`; test `tests/movilidad/specs_parse.test.ts`.
- [ ] Tests (RED): `specsFromText("Freno de disco: No", "descripcion").discBrake` → `null` (no `true`);
  `specsFromText("Sin app ni bluetooth", …).bluetooth` → `false`; `specsFromText("Bluetooth: no", …)
  .bluetooth` → `false`; `specsFromRows({ "Tiempo de carga": "4 a 6 h" }).chargeHours` → `6`;
  `specsFromRows({ "Autonomía": "20 a 25 km" }).rangeKm` → `20`.
- [ ] Implementar: el patrón de disco no cuenta si sigue `\s*[:=]?\s*no\b` o lo precede `sin `; el
  de bluetooth/app reconoce `sin `; el número de fila acepta `-`, ` a ` y ` hasta ` como separador.
- [ ] `npx vitest run tests/movilidad` verde. Commit.

### Task 2: Identidad de modelo
**Files:** create `classes/movilidad/models/identify.ts`; test `tests/movilidad/models_identify.test.ts`.
**Produces:**
```ts
export interface ModelIdentity { brandKey: string; brandLabel: string; tokens: string[]; key: string; label: string }
export interface IdentifyInput { title: string; brand: string | null; brandKey: string | null; fichaModel: string | null; source: string }
export function modelTokens(text: string, brandWords: string[]): string[]
export function identifyModel(input: IdentifyInput): ModelIdentity | null
export function mlCatalogId(url: string): string | null            // /p/(MLU\d+)
export function unifyByCatalog<T extends { url: string; identity: ModelIdentity | null }>(rows: T[]): T[]
```
- [ ] Tests (RED) con títulos reales medidos el 4/11: "Monopatin Scooter Electrico Xiaomi 6 Pro 25 Km/h
  1000w 70 Km Autonomía Negro" → `xiaomi-6-pro`; "Xiaomi Monopatin Xiaomi Electric Scooter 6" →
  `xiaomi-6`; "Scooter Eléctrico Xiaomi 6 Lite 25km/h 300W" → `xiaomi-6-lite`; "Monopatin Electrico
  Luxor E9pro 350w 25 Km/h Negro" y "Luxor Plegable E9pro 25" → `luxor-e9-pro`; "Monopatín Eléctrico
  Atom Kaizen Pro Plegable 120kg 50km/h" → `atom-kaizen-pro`; "Atom Tenacity Plegable" → `atom-tenacity`
  (≠ `atom-tenacity-pro`); "MISTYLE T1 350W" → `mistyle-t1` y "Mistyle T1 Max 500w" → `mistyle-t1-max`;
  "Proove City Pulse 350w" → brand Proove desconocida → `null`; "Atom Habit-pro 500w" →
  `atom-habit-pro`; "Xiaomi Electric Scooter 5 Pro Us Color Negro" → `xiaomi-5-pro`; fuente facebook →
  `null`; brandKey null → `null`; título sin modelo + fichaModel "6 Max" → `xiaomi-6-max`; fichaModel
  "BHR08KTGL" → ignorado. `unifyByCatalog`: dos avisos `/p/MLU1` (uno `xiaomi-6-pro`, otro null) → los
  dos `xiaomi-6-pro`; mayoría gana; avisos sin `/p/` intactos.
- [ ] Agregar a `brands.ts` las marcas medidas que faltan (Proove, Maxwheel, Mirrend, Life-e, Link
  Sport, Like Latam no — es vendedor) con test de `brandFromTitle("Proove City Pulse")`. Con eso
  "Proove City Pulse 350w" → `proove-city-pulse`.
- [ ] Verde. Commit.

### Task 3: Catálogo de modelos
**Files:** create `classes/movilidad/models/build.ts`; test `tests/movilidad/models_build.test.ts`.
**Consumes:** Task 2. `MonopatinSpecs` de `specs/types.ts`.
**Produces:**
```ts
export interface ModelRow { listingId; title; url; image; price; currency; priceUyu; condition; source;
  sellerName; sellerKey; brand; brandKey; variant; suspect; specs: MonopatinSpecs | null; firstSeen?;
  observedAt; freeShipping?; officialStore?; fichaModel: string | null }
export interface ModelBand { min; median; max; n; sellers }
export interface ConsensusSpecs { values: Omit<MonopatinSpecs,'from'>; agree: Partial<Record<SpecField,{n:number;of:number}>> }
export interface MovilidadModelDoc { slug; name; brandKey; brandLabel; modelLabel; variant; image;
  offers: ModelOffer[]; newBand: ModelBand|null; usedBand: ModelBand|null; specs: ConsensusSpecs;
  fichas; listings; sellers; indexable; firstSeen; lastSeen; generatedAt; history: ModelHistoryPoint[] }
export function buildModels(rows: ModelRow[], today: string, generatedAt: string): { models: MovilidadModelDoc[]; slugByListing: Map<string,string> }
export function mergeHistory(prev: ModelHistoryPoint[] | undefined, doc: MovilidadModelDoc): ModelHistoryPoint[]
export function modelsRunIsThin(built: number, freshStored: number): boolean   // built < 0.4*stored && stored >= 5
export const MODEL_OFFERS_MAX = 40, MODEL_HISTORY_MAX = 400, MODEL_MIN_LISTINGS = 2
```
- [ ] Tests (RED): agrupa 3 avisos `xiaomi-6-pro` de 2 vendedores en un doc con `sellers: 2`,
  `listings: 3`, ofertas ordenadas por precio; un modelo de 1 aviso no se publica y su aviso no entra a
  `slugByListing`; nuevo/usado en bandas separadas; consenso: autonomía 60 (ficha) y 70 (ficha) y 80
  (titulo) → mediana 65, `agree.rangeKm = { n: 1, of: 2 }`… (regla: `n` = fichas a ±10 % de la mediana);
  booleano mayoritario; `indexable` false con 1 vendedor; imagen nunca de facebook; filas `suspect`
  fuera; `mergeHistory` reemplaza el punto de hoy y topea 400; `modelsRunIsThin(3, 20)` true,
  `(10, 20)` false, `(0, 2)` false.
- [ ] Verde. Commit.

### Task 4: Persistencia y job
**Files:** create `classes/models/MovilidadModel.ts`, `app/server/models/MovilidadModel.ts`; modify
`classes/models/MovilidadListing.ts` + app espejo (`modelSlug: String`), `classes/movilidad/specs/
snapshot.ts` (`AdvisorCandidate.modelSlug?: string`), `sync_movilidad_specs.ts`, `classes/movilidad/
store.ts` (`MOVILIDAD_MODELS_COLLECTION`), `tests/appdb/schema_parity.test.ts`, test
`tests/movilidad/models_job.test.ts`.
- [ ] Test (RED): `modelsWrites(models, prevBySlug)` (exportado de `classes/movilidad/models/write.ts`)
  devuelve `updateOne` upserts por slug con `history` mezclado; paridad de esquema incluye
  `movilidadmodels`.
- [ ] Job: después del re-enriquecimiento, `buildModels` sobre filas no-FB; si no es flaca, bulkWrite
  modelos; `modelSlug` va en el `$set` existente (null si no tiene); candidato del asesor recibe
  `modelSlug`. Log suma `models`, `indexable`.
- [ ] `npx vitest run tests/movilidad tests/appdb` + `npx tsc -p tsconfig.production.json --noEmit`.
  Commit.

### Task 5: API de modelos
**Files:** create `app/utils/monopatinModelos.ts`, `app/server/api/movilidad/modelos/index.get.ts`,
`app/server/api/movilidad/modelos/[slug].get.ts`; tests `app/tests/unit/monopatinModelos.test.ts`,
`app/tests/unit/monopatinModelosApi.test.ts`.
**Produces (utils):** tipos `MonopatinModelDoc`, `MonopatinModelSummary`, `MonopatinModelDetailResponse`;
`MONOPATIN_MODEL_SLUG_RE`, `MONOPATIN_MODEL_STALE_DAYS = 7`, `monopatinModelFreshFloor(today)`,
`monopatinModelSummary(doc)`, `monopatinModelSiblings(model, all, max=4)` (mismo tipo, precio ±35 %,
ordena por distancia de precio), `monopatinModelTitle(model)` (≤ 60 con " | Cambio Uruguay"),
`monopatinModelDescription(model)`, `monopatinCompareRows(models)` (filas con `best` por regla),
`monopatinRealRangeKm(km)`.
- [ ] Tests (RED) de cada función; API: slug malo → 404 sin DB; DB caída → 503 no-store; viejo → 404;
  ok → `{ model, siblings, generatedAt }` con cache pública 900 s; lista → resúmenes frescos ordenados
  por vendedores, avisos.
- [ ] Verde. Commit.

### Task 6: Hub movido + tabla de modelos + bandeja de comparación
**Files:** `git mv app/pages/monopatines-electricos-uruguay.vue app/pages/monopatines-electricos-uruguay/index.vue`;
create `app/components/movilidad/MovilidadCompareTray.vue`; actualizar rutas en tests que leen el archivo.
- [ ] Test (RED) en `app/tests/unit/monopatinPage.test.ts`: la página usa `/api/movilidad/modelos`,
  enlaza `/monopatines-electricos-uruguay/${…slug}` y conserva el fallback `productRows`.
- [ ] Implementar: SSR de la lista; tabla nueva con enlace, desde, vendedores, ficha, "Comparar";
  fallback a la tabla vieja si la lista está vacía.
- [ ] Verde (`npx vitest run tests/unit/monopatin* tests/unit/movilidad*`). Commit.

### Task 7: Página del modelo
**Files:** create `app/pages/monopatines-electricos-uruguay/[modelo].vue`; test
`app/tests/unit/monopatinModelPage.test.ts` (texto del .vue: validate con slug RE, robots noindex si no
indexable, JSON-LD Product+AggregateOffer sólo nuevas, secciones con ids).
- [ ] RED → implementar → verde → commit.

### Task 8: Comparador
**Files:** create `app/pages/monopatines-electricos-uruguay/comparar.vue`; test
`app/tests/unit/monopatinComparePage.test.ts` (noindex, `?m=` normalizado a ≤3 slugs válidos, usa
`monopatinCompareRows`).
- [ ] RED → implementar → verde → commit.

### Task 9: Enlaces desde tarjeta y asesor
**Files:** `classes/equipar/listings.ts` (`modelSlug?`), `app/utils/equiparProductos.ts`
(`EquiparProductoPublic.modelSlug?`), `app/server/utils/equiparProductos.ts` (proyección),
`app/components/equipar/ListingCard.vue`, `app/components/movilidad/MovilidadMonopatinAsesor.vue`,
`app/utils/monopatinAsesor.ts` (tipo candidato).
- [ ] Test (RED): la fila pública lleva `modelSlug` sólo si existe; vertical equipar no.
- [ ] Verde. Commit.

### Task 10: Sitemap, navegación, medición, docs
**Files:** `app/server/api/__sitemap__/urls.get.ts` (modelos indexables frescos), exclusiones de
`comparar` donde corresponda (siteNav coverage, `EXCLUDED_ROUTES`), `docs/seo/experiments.json` (fila
`monopatines-paginas-por-modelo`, ruta `/monopatines-electricos-uruguay/*`), `docs/app/MOVILIDAD.md`,
`AGENTS.md` (fila de currency-movilidad-specs).
- [ ] Tests existentes de sitemap/siteNav/experiments verdes; suite app + root completa. Commit.
