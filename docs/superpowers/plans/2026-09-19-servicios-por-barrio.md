# Servicios por barrio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Luz (UTE), agua (OSE) y reclamos urbanos (IM) por barrio en el análisis de zonas, su relación con el alquiler por m² y un filtro del directorio de alquileres por esos atributos.

**Architecture:** Dos jobs nuevos llenan libros propios en APP DB (UTE cada 10 min, OSE diario). El job existente `currency-property-zones` agrega las capas, asigna cada vivienda a un barrio oficial (`officialZone`), calcula niveles e impacto y lo guarda; la app sólo lee.

**Tech Stack:** TypeScript 4.9 CommonJS (root, vitest), mongoose/mongodb APP DB vía `classes/appdb.ts`, Nuxt 4 + Vuetify 4 (app, vitest), Leaflet (mapa existente).

**Spec:** `docs/superpowers/specs/2026-09-19-servicios-por-barrio-design.md`

## Global Constraints

- Root tests nunca importan `app/` (rompe CI de backend). Paridad → `app/tests/unit`.
- Ningún scheduler en `currency-server`; cada job nuevo es app pm2 fork + `OTHER_APPS` en `scripts/deploy-backend.sh`.
- Toda escritura a APP DB por `classes/appdb.ts`; jobs sin `APP_MONGO_URI` fallan.
- Una fuente caída no borra las demás; un job fallido sale con 1 y conserva lo último bueno.
- Ausencia de dato nunca es cero; cada capa publica su fecha y su fuente.
- Sin puntaje combinado ni filtro de denuncias.
- Nada de campos con nombre "key" + valor con dígitos en fixtures nuevas si puede evitarse (gitleaks `generic-api-key`): usar `id`/`zone`.
- Umbrales: luz publica con ≥ 14 días y ≥ 85 % de cobertura en ventana de 90 días; agua ventana 24 meses, tope 72 h por aviso; reclamos 12 meses completos; impacto ≥ 15 apartamentos por zona y ≥ 20 zonas; alias ≥ 10 geolocalizadas y ≥ 85 %; coordenada compartida ≥ 5 propiedades.

---

### Task 1: ECSE parser + libro de luz (puro)

**Files:** Create `classes/utilities/power/ecse.ts`, `classes/utilities/power/ledger.ts`; Test `tests/utilities/power.test.ts`

**Interfaces — Produces:**
- `parseEcseRows(raw: unknown, kind: "urban" | "department"): EcseSample` → `{ observedAt: string /*ISO UTC*/, zones: EcseZone[] }`; `EcseZone = { zone: string /* "b:PO" | "l:3210" | "d:1" */, name, type: "barrio"|"localidad"|"departamento", customers, unplanned, planned, incidents, lat, lng }`. Throws on bad shape (63 barrios, ≥60 localidades for urban; 19 for department).
- `foldSample(state: PowerState | null, sample: EcseSample): { state: PowerState; increments: PowerDayIncrement[] }` — trapezoid over Δt = min(obs − prev, 20 min); prev missing or Δt ≤ 0 → no increment (state reset); gap > 20 min → credits 10 min using current values only. `PowerDayIncrement = { zone, day /* YYYY-MM-DD Montevideo */, name, type, customers, coveredMinutes, unplannedCustomerMinutes, plannedCustomerMinutes, newIncidents, samples: 1 }`.

- [ ] Tests: FECHA `"19/09/2026 11:20:41"` → `2026-09-19T14:20:41.000Z`; two samples 10 min apart with unplanned 0→12 give 60 customer-minutes; incidents 1→3→2 give newIncidents 2; repeated FECHA returns no increments; 45-min gap credits 10 min; wrong barrio count throws.
- [ ] Implement, run `npx vitest run tests/utilities/power.test.ts`, commit.

### Task 2: UTE zone data (barrio→INE, localidades con polígono y departamento)

**Files:** Create `scripts/oneoff/build_ute_zones.py`, `classes/utilities/power/ute_zones.json`, `classes/utilities/power/zones.ts`; Test in `tests/utilities/power.test.ts`

**Produces:** `uteBarrioToIne: Record<string /*UTE code*/, string /*INE officialCode*/>` (PU→"1"); `uteLocalities(): Array<{ id: string; name: string; department: string; geometry: Polygon|MultiPolygon }>`; `ineCodeForUteZone(zone: string): string | null`.

- [ ] Generator: downloads `ZonasUrbanas.json` + `geomdeptos.js`, IoU-matches the 63 barrio polygons to `ine2011.json`, maps ADT polygons to ECSE localidad ids (`nombre.split(' ')[0]`), department by point-in-polygon of ECSE LAT/LON, rounds to 6 decimals, writes JSON with `measuredAt` and per-barrio IoU.
- [ ] Tests: 63 barrio codes cover all 62 INE codes; PU and CJ both → "1"; every localidad has one of the 19 departments.
- [ ] Commit.

### Task 3: Store + job `currency-power-outages`

**Files:** Create `classes/utilities/power/store.ts`, `classes/utilities/power/run.ts`, `sync_power_outages.ts`; Modify `ecosystem.config.js`, `scripts/deploy-backend.sh`, `package.json` (script `sync_power_outages`); Test `tests/utilities/power_run.test.ts`

**Produces:** collections `poweroutagedays` (`_id: "<zone>|<day>"`) and `poweroutagestate` (`_id: "ute-ecse"`); `runPowerSample({ fetchJson, store, now })` returns `{ written: number; skipped: boolean }`; `readPowerDays(fromDay: string): Promise<PowerDayDoc[]>`.

- [ ] Test with in-memory store: first run writes state only; second with new FECHA writes increments via `$inc`; same FECHA → skipped; fetch failure → throws, state untouched.
- [ ] pm2: `currency-power-outages`, `dist/sync_power_outages.js`, `cron_restart: "3-59/10 * * * *"`, `autorestart: false`, fork. Poda: delete days older than 400 days once per day (first run after 00:00 Montevideo).
- [ ] Commit.

### Task 4: OSE parser + matcher (puro)

**Files:** Create `classes/utilities/water/parse.ts`, `classes/utilities/water/match.ts`; Test `tests/utilities/water.test.ts` + fixture `tests/utilities/fixtures/ose_list.html` (real page trimmed to 3 notices)

**Produces:** `parseOseList(html: string): WaterNotice[]` with `{ id, department, locality, publishedAt, zoneText, from, to, reason }` (dates ISO UTC from Montevideo local); `ineCodesInText(text: string): string[]`; `OSE_MATCH_VERSION = 1`.

- [ ] Tests: fixture parses 3 notices with exact fields; `"Maroñas, Parque Guaraní"` → ["17"]; `"Barrio Sur\nentre las calles…"` → ["3"]; `"Cno. Carrasco y Av. Italia"` → []; `"Barrio Colón"` → [] (two INE areas); `"Malvín Norte"` → ["12"] not ["11"]; `"Ramos, Solano López…"` → [].
- [ ] Commit.

### Task 5: Job `currency-water-interruptions`

**Files:** Create `classes/utilities/water/store.ts`, `classes/utilities/water/run.ts`, `sync_water_interruptions.ts`; Modify ecosystem/deploy/package.json; Test `tests/utilities/water_run.test.ts`

**Produces:** collection `waterinterruptions` (`_id: notice id`, fields of `WaterNotice` + `ineCodes`, `matchVersion`, `firstSeenAt`, `lastSeenAt`); `runWaterHarvest({ fetchPage, store, pages, delayMs })`; `readWaterNotices(fromIso: string)`.

- [ ] Test: two pages upserted, stop early when a page parses zero notices; parse of zero notices on page 0 → throws (layout changed).
- [ ] pm2 `29 8 * * *`; `--backfill` → all pages.
- [ ] Commit.

### Task 6: Reclamos IM (ZIP streaming + agregado)

**Files:** Create `classes/utilities/claims/zip.ts`, `classes/utilities/claims/aggregate.ts`, `classes/utilities/claims/source.ts`; Test `tests/utilities/claims.test.ts`

**Produces:** `openSingleZipEntry(path: string): Readable` (central directory, deflate/stored); `aggregateClaims(lines: AsyncIterable<string>, zones, period): ClaimsAggregate` = `{ periodFrom, periodTo, countsByOfficialCode: Record<code, {alumbrado, saneamiento, limpieza, calles}>, unassigned, rows }`; `loadClaims({ previous, now })` checks CKAN `package_show` `last_modified`, reuses when unchanged.

- [ ] Tests: zip built in-test with `zlib.deflateRawSync` round-trips; CSV lines categorised (Alumbrado; Saneamiento; Limpieza only two groups; Calles y veredas/Viales); outside period ignored; period = last 12 complete months before `now`.
- [ ] Commit.

### Task 7: Asignación de vivienda a zona oficial (puro)

**Files:** Create `classes/propertyzones/assign.ts`; Test `tests/propertyzones/assign.test.ts`

**Produces:** `buildZoneAssigner(input: { ine: PropertyZoneGeometry zones; localities: uteLocalities(); rows: ListingLocation[] }): { assign(row): OfficialZone | null; aliases: Record<string, { code: string; share: number; n: number }> }`; `ListingLocation = { id: string /*property key*/, department, neighborhood, locality?, latitude, longitude }`; `OfficialZone = { zone: string /* "mvd:8" | "ute:3210" */, name, department, evidence: "coordinate"|"name"|"alias" }`.

- [ ] Tests: own coordinate in Pocitos → mvd:8 coordinate; shared coordinate (5 rows) ignored → falls to name; "Parque Batlle" alias from 12 geolocated rows 11 in code 10 → alias; 50/50 split → no alias → null; interior "Punta del Este" name → ute:3210; Montevideo point outside polygons → name path.
- [ ] Commit.

### Task 8: Capas y niveles (puro)

**Files:** Create `classes/propertyzones/utilities.ts`; Test `tests/propertyzones/utilities.test.ts`

**Produces:** `buildPowerLayer(days, { now })`, `buildWaterLayer(notices, { now })`, `buildClaimsLayer(aggregate, customersByCode)`, `buildLevels(layers)` → `ZoneUtilityContext` = `{ power: {...byZone, observedFrom, observedDays, coverage, status: "ready"|"collecting"}, water: {...}, claims: {...}, levels: Record<attribute, Record<zone, "low"|"mid"|"high">> }` with attributes `luz | agua | alumbrado | saneamiento | limpieza | calles`.

- [ ] Tests: 10 days observed → status collecting and no values; 20 days 90 % coverage → minutes per customer per month; terciles with ties; claims rate per 1.000 customers; CJ+PU customers summed for code 1.
- [ ] Commit.

### Task 9: Impacto en el precio (puro)

**Files:** Create `classes/propertyzones/impact.ts`; Test `tests/propertyzones/impact.test.ts`

**Produces:** `buildPriceImpact({ observations, zoneOf, attributes, usdUyu, now })` → `{ version: 1, generatedAt, unit: "rent-per-built-m2", minimumListings: 15, zones: [{ zone, name, n, rentM2 }], attributes: [{ attribute, zones: number, rho, rhoLow, rhoHigh, pctPerUnit, unit, verdict, points: [{zone, x, y}] }], joint: { r2, coefficients: [{attribute, pct, low, high}] } | null }`.

- [ ] Tests: synthetic 30 zones with y decreasing in x → verdict lower, CI below 0; random x → inconclusive; deterministic output across two runs; <20 zones → attribute omitted.
- [ ] Commit.

### Task 10: Integración en `refreshPropertyZones` + `--assign-only`

**Files:** Modify `classes/propertyzones/refresh.ts`, `classes/propertyzones/store.ts`, `classes/propertyzones/context.ts` (type), `sync_property_zones.ts`, `ecosystem.config.js`, `scripts/deploy-backend.sh`; Test `tests/propertyzones/refresh.test.ts`

**Produces:** context doc gains `utilities: ZoneUtilityContext | null` and `aliases`; new doc `_id: "impact"`; `source-cache` keeps crime, new `_id: "claims-cache"`; listings get `$set { officialZone, officialZoneAt }` only when changed; `refreshPropertyZones({ assignOnly })` assigns listings missing `officialZone` and exits.

- [ ] Tests: utilities failure keeps previous utilities and still publishes crime; assign writes only changed rows; assign-only never touches snapshots.
- [ ] pm2 `currency-property-zones-hourly` `57 * * * *` `--assign-only`.
- [ ] Commit.

### Task 11: App — tipos, proyección y respuesta de zonas

**Files:** Modify `app/utils/rentalZoneTypes.ts`, `app/utils/rentalZones.ts`, `app/server/utils/rentalZones.ts`; Create `app/server/api/rentals/zone-impact.get.ts`, `app/server/api/rentals/zone-profile.get.ts`; Test `app/tests/unit/rentalZoneUtilities.test.ts`

**Produces:** `RentalZone.utilities: { power, water, claims } | null`, `RentalZone.official: { code, name, match: "exact"|"alias" } | null`, `RentalZoneResponse.utilitiesStatus`; `RentalZoneImpact` type; `loadRentalZoneImpact()`; `rentalZoneFilterKeys(snapshots, attributes): string[] | null`.

- [ ] Tests: projection drops malformed values; alias zone gets INE layers but `boundaryAvailable` false; interior zone named like a UTE localidad gets power; stale power (>2 días) hides values.
- [ ] Commit.

### Task 12: App — capas nuevas en el explorador

**Files:** Modify `app/components/rentals/zones/Explorer.vue`, `app/components/rentals/zones/Detail.vue`, `app/utils/rentalZoneMessages.ts`

- [ ] Layers `power`, `water`, `claims` (+ `claimCategory` select). Detail shows value, level chip, period, source, caveat. Messages es/en/pt.
- [ ] `npm run lint` in app; commit.

### Task 13: App — "¿Se paga en el alquiler?"

**Files:** Create `app/components/rentals/zones/PriceImpact.vue`, `app/utils/rentalZoneImpactMessages.ts`; Modify `app/pages/barrios-alquileres-uruguay.vue`, `app/pages/analisis-alquileres-uruguay.vue`

- [ ] SVG scatter (no chart lib), trend line from `pctPerUnit`, table, plain verdict. SSR-safe (fetch with `useFetch` server true, small payload).
- [ ] Commit.

### Task 14: App — filtro `servicios` en el directorio

**Files:** Modify `app/utils/rentals.ts` (query + `buildRentalFilter(query, staleDays, usdUyu, zoneKeys?)`), `app/server/api/rentals/index.get.ts`, `app/server/api/rentals/mapa.get.ts`, `app/server/utils/rentalAlertMatching.ts`, `app/server/models/RentalListing.ts` (index), `app/components/rentals/SearchFilters.vue`; Test `app/tests/unit/rentalServiceFilter.test.ts`

- [ ] Tests: `servicios=luz,agua` parsed/serialised; unknown values dropped; with keys → `officialZone.zone $in`; servicios without keys → `$in: []`.
- [ ] Commit.

### Task 15: App — panel del barrio en la ficha

**Files:** Modify ficha page component (found via `app/pages/alquileres/**`), `app/server/utils/rentalDetail.ts` projection (`officialZone`); Create `app/components/rentals/ZoneServicesPanel.vue`

- [ ] Shows barrio oficial + evidencia + cada atributo con nivel; nada si `officialZone` null.
- [ ] Commit.

### Task 16: Docs + verificación + deploy

- [ ] `docs/app/PROPERTY_ZONE_SERVICES.md`; update `docs/app/PROPERTY_ZONES.md`, `AGENTS.md` pm2 table, `classes/AGENTS.md` if it lists features.
- [ ] Root `npx vitest run`, app `npx vitest run` + `npm run lint`, dev server visual check of `/barrios-alquileres-uruguay` + `/alquileres-uruguay?servicios=...`.
- [ ] Dry-run on VPS (read-only), merge to main, push, watch CI; after deploy run OSE `--backfill`, check pm2 jobs, measure pages in production.
