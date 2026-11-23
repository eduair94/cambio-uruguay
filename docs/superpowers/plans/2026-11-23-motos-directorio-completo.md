# Motos usadas: directorio completo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/motos-usadas-uruguay` con la forma, los filtros y la ficha por aviso del directorio de autos, y la cilindrada deducida cuando el aviso no la dice.

**Architecture:** Backend: job nuevo `currency-motos-detail` lee la ficha propia de cada aviso de ML; `sync_motos.ts` aplica la cascada de cilindrada (ficha → título → consenso del modelo → nombre del modelo) y publica campos nuevos. App: componentes propios de motos sobre las piezas neutras de autos, ficha por aviso y comparador.

**Tech Stack:** TypeScript 6 (raíz, CommonJS, vitest), Nuxt 4.4 + Vuetify 4.2 (app), Mongo (APP DB).

**Spec:** `docs/superpowers/specs/2026-11-23-motos-directorio-completo-design.md`

## Global Constraints

- Las claves de URL existentes de motos NO cambian (`marca`, `modelo`, `cilindrada`, `tipo`, `departamento`, `combustible`, `vendedor`, `precioMaxUsd`, `anioDesde`, `anioHasta`, `sort`, `page`).
- Ficha por modelo sigue en `/motos-usadas-uruguay/<slug>`; ficha por aviso en `/motos-usadas-uruguay/aviso/<key>`, `noindex, follow`.
- Estimaciones (`model`, `model-name`) se imprimen con «≈ » y su fuente; nunca votan el consenso; nunca entran a bandas por cilindrada ni a `productKey`.
- Consenso: ≥ 3 votos, ≥ 80 % dentro de ±10 % de la mediana. Veto por tramo de ML con 10 % de tolerancia. Ficha contra consenso fuerte (≥ 4 votos) a más de 30 % → manda el consenso.
- Todo export de `app/utils` lleva prefijo `moto`/`MOTO_`.
- Todo job raíz importa `./sentry_job` primero; app nueva en `ecosystem.config.js`, `OTHER_APPS` de `scripts/deploy-backend.sh` y tabla de `AGENTS.md`.
- Sin cifras de ingreso en nada versionado.
- `npx tsc -p tsconfig.production.json --noEmit` limpio (salvo `sheet_key.json`) antes de empujar.

## Review Focus

- Aviso con ficha que dice una cilindrada absurda y sin tramo de ML (Pulsar «2.000 cc») → no publicar 2000 si el modelo tiene consenso fuerte. Test en Task 1.
- Modelo con un solo aviso y nombre sin número → sin cilindrada, no `0` ni `NaN`. Test en Task 1.
- Respuesta de la API vieja (sin `pictures`/`specs`/`risks`) durante el despliegue → tarjeta y ficha no se rompen (`?? []`). Test en Task 5.
- Clave de aviso inválida en `/aviso/<key>` → 404 antes de tocar la base. Test en Task 6.
- Alerta guardada con las claves viejas sigue filtrando igual. Test en Task 4.

---

### Task 1: Cascada de cilindrada (raíz)

**Files:** Create `classes/motos/displacement.ts`; Test `tests/motos/displacement.test.ts`.

**Interfaces — Produces:**
- `type MotoDisplacementBasis = "ficha" | "title" | "model" | "model-name"`
- `parseFichaDisplacement(raw: string | null | undefined): number | null` («1.590 cc» → 1590, «150» → 150, fuera de 30–2.500 → null)
- `displacementFromModelName(model: string): number | null`
- `fitsBand(value: number, band: MotoDisplacementBandId | null): boolean`
- `attachDisplacement<T extends DisplacementInput>(listings: readonly T[]): Array<T & DisplacementOutput>` con `DisplacementInput = { marketSlug; model; title; declaredBand: MotoDisplacementBandId | null; fichaDisplacement: number | null }` y `DisplacementOutput = { displacement: number | null; displacementBasis: MotoDisplacementBasis | null; displacementVotes: number | null; exactDisplacement: number | null }`.

- [ ] Tests: ficha gana; título si no hay ficha; tramo veta ficha fuera de banda; consenso con 3 votos (124,125,125 → 125, base `model`, votes 3); no hay consenso con 2 votos; consenso no se alimenta de estimaciones; Pulsar 2000 con 4 votos de 200 → 200 `model`; nombre «GTR 125» → 125 `model-name`; «MT 03»/«FZ25» → null; «Z900» → 900; modelo sin número y sin votos → null.
- [ ] Implementar; `npx vitest run tests/motos/displacement.test.ts` verde; commit.

### Task 2: Ficha del aviso + job `currency-motos-detail` (raíz)

**Files:** Create `classes/motos/detail.ts`, `classes/motos/detailQueue.ts`, `sync_motos_detail.ts`; Modify `classes/motos/types.ts` (`MotoDetail`, `StoredMoto.detail/detailError/detailGoneAt`), `classes/motos/store.ts` (`saveMotoDetails`), `ecosystem.config.js`, `scripts/deploy-backend.sh`; Test `tests/motos/detail.test.ts`, `tests/motos/detailQueue.test.ts`.

**Interfaces — Produces:**
- `interface MotoDetail { readAt; price; currency; active; specs: Record<string,string>; displacement: number|null; typeText: string|null; color: string|null; pictures: string[]; description: string }`
- `parseMotoDetail(html: string, readAt: string): MotoDetail | null` (reusa `detailSpecs`, `detailPictures(html, 8)`)
- `fetchMotoDetails(targets: {key; permalink}[], opts: {max; maxDurationMs; gapMs}): Promise<{ details: Map<string, MotoDetail>; gone: string[]; failed: Array<{key; reason}> }>` (sólo permalinks `ML_MOTOS_PERMALINK_PREFIX`)
- `motoDetailTargets(stored: StoredMoto[], opts: {now: Date; refreshDays: number}): Array<{key; permalink; reason: "nuevo"|"vencido"}>` (nunca leídos primero, por `lastSeen` desc; error < 1 día y gone < 7 días se saltean)
- `saveMotoDetails(result, at: string): Promise<void>`
- pm2 `currency-motos-detail`, `dist/sync_motos_detail.js`, cron `51 * * * *`, `MOTOS_DETAIL_MAX` 120, gap 2 s, 10 min.

- [ ] Tests de parseo con un HTML mínimo (fila Cilindrada, Color, Tipo de moto, ld+json Vehicle, `data-zoom`, descripción) y de cola (orden, salteos).
- [ ] Implementar; tests verdes; `tests/sentry/job_entrypoints.test.ts` verde; commit.

### Task 3: Enriquecer y publicar los campos nuevos (raíz)

**Files:** Modify `classes/motos/enrich.ts`, `classes/motos/catalog.ts`, `classes/motos/types.ts`, `sync_motos.ts`, `docs/app/MOTOS.md`, `AGENTS.md`; Test `tests/motos/enrich.test.ts`, `tests/motos/catalog.test.ts`.

**Interfaces — Consumes:** Task 1, Task 2. **Produces** en `PublicMotoListing`: `displacementBasis: MotoDisplacementBasis|null`, `displacementVotes: number|null`, `displacementBand` (faceta ?? tramo de la cilindrada), `pictures: string[]`, `color: string|null`, `specs: PublicMotoSpecs|null` (`engine, brakes, starter, transmission, power, uniqueOwner, tradeIn, negotiable, readAt`), `risks: CarRisk[]`, `hasDetail: boolean`. Meta: `displacementEstimated`.

- [ ] Tests: tipo de ficha completa al de faceta; ficha «Cuatriciclos» excluye; ficha inactiva leída después de `lastSeen` excluye; `specs.power` descarta «636 hp» de una 636 cc (tope 250 hp/cv, 190 kW); bandas por cilindrada sólo con bases exactas.
- [ ] Implementar; `npx vitest run tests/motos` verde; commit.

### Task 4: Utils del app (query, filtros, formato)

**Files:** Modify `app/utils/motosPublic.ts`, `app/utils/motos.ts`, `app/server/utils/listingAlertSources.ts`; Test `app/tests/unit/motos.test.ts`, `app/tests/unit/listingAlerts.test.ts`.

**Produces:** `MotoQuery` + `q, precioMinUsd, kmMax, ccMin, ccMax, color, dias, bajo, sinRiesgo, unicoDueno`; `MOTO_SORTS` + `cc_asc`, `cc_desc`; `MOTO_COLORS`, `MOTO_COLOR_LABEL`, `MOTO_SINCE_STEPS`; `motoDisplacementText(listing)` («150 cc» / «≈ 150 cc»), `motoDisplacementSource(listing)`; `motoAvisoPath(key)`, `motoAvisoKeyValid(key)`; `motoFilterChips` con `key`; facetas `colors`, `bands`.

- [ ] Tests de normalización (claves viejas intactas), match (cada filtro nuevo), chips, formato.
- [ ] Implementar; `npx vitest run tests/unit/motos.test.ts tests/unit/listingAlerts.test.ts` verde; commit.

### Task 5: Directorio con la forma de autos

**Files:** Create `app/components/motos/ListingCard.vue`, `app/components/motos/Filters.vue`; Modify `app/components/cars/ActiveFilters.vue` (genérico), `app/pages/motos-usadas-uruguay/index.vue`, `app/server/api/motos/index.get.ts`, `app/pages/motos-usadas-uruguay/[key].vue` (tarjetas); Test `app/tests/unit/motosPages.test.ts`, `app/tests/unit/motosApi.test.ts`.

- [ ] Tests de estructura (sidebar, cajón, tarjetas, `?? []`), facetas nuevas en la API.
- [ ] Implementar; tests + `npm run lint` verdes; commit.

### Task 6: Ficha por aviso

**Files:** Create `app/pages/motos-usadas-uruguay/aviso/[key].vue`, `app/server/api/motos/aviso/[key].get.ts`, `app/server/models/MotoListing.ts` (sólo lectura de `priceHistory`); Test `app/tests/unit/motosAviso.test.ts`.

**Produces:** `MotoAvisoResponse { moto; model: MotoPublicModel|null; yearBand: MotoPublicYearBand|null; similar: MotoPublicListing[]; priceHistory: PriceHistorySeries|null }`.

- [ ] Tests: clave inválida → 404 sin base; posición contra banda; página noindex.
- [ ] Implementar; tests verdes; commit.

### Task 7: Comparador de avisos

**Files:** Create `app/components/motos/CompareLink.vue`, `app/pages/motos-usadas-uruguay/comparar.vue`, `app/server/api/motos/compare.get.ts`; Test en `app/tests/unit/motosAviso.test.ts`.

- [ ] Implementar siguiendo `CarsCompareLink`/`comparar.vue` de autos (localStorage, hasta 4); tests verdes; commit.

### Task 8: Verificación y publicación

- [ ] `npm test` raíz, `npx tsc -p tsconfig.production.json --noEmit`, `cd app && npm test && npm run lint`.
- [ ] Dev server del worktree contra un snapshot local: directorio, filtros, ficha, comparador en 1280 y 400 px.
- [ ] Fila en `docs/seo/experiments.json`; PR; automerge; medir producción.
