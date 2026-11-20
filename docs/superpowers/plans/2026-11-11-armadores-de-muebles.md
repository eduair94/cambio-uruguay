# Armadores de muebles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/armadores-de-muebles-montevideo`: directorio por zona de armadores de muebles con precios, alimentado por un job diario.

**Architecture:** `sync_armadores.ts` (pm2 `currency-armadores`, `5 18 * * *`) lee editorial + Google Places (semanal) + FB Marketplace + ML Servicios, fusiona y escribe UN documento `armadorsnapshots{key:"mvd"}` en la APP DB. `app/server/api/armadores.get.ts` lo sirve compacto; la página filtra en el cliente con la URL como estado.

**Tech Stack:** TypeScript (CommonJS raíz), mongoose (`appModel`), puppeteer-core vía `classes/facebook`, Nuxt 4 / Vuetify 4, vitest.

**Spec:** `docs/superpowers/specs/2026-11-11-armadores-de-muebles-design.md`

## Global Constraints

- Precio de aviso FB < 150 UYU = simbólico: «a consultar», fuera de estadísticas.
- Referencia por mueble: sólo UYU, n ≥ 3 prestadores distintos.
- TTL: avisos FB/ML 14 días sin verse; Google 30 días; editorial no vence (fecha visible).
- Corrida flaca: filas no editoriales nuevas < 50 % de las guardadas (si había ≥ 20) → no escribe, exit 1.
- Google `textsearch` como máximo una vez cada 7 días (`googleAt`); contactos de Google sólo en vivo.
- Sin `APP_MONGO_URI` el job se niega (exit 1), salvo `--dry-run`.
- Repo público: cero cifras de ingreso. Fila en `docs/seo/experiments.json` en el mismo commit.

## Review Focus

1. Producto con "armado gratis" en el título (un ropero a la venta) colado como armador → `isAssemblyTitle` lo rechaza (test en Task 2).
2. "Centro" / "Unión" / "Colón" sueltos en un título leídos como barrio → sólo con "en/zona/barrio" delante (test Task 2).
3. Una fuente caída (FB sin sesión) borra todos sus avisos → `mergeEntries` conserva las filas previas de una fuente que no corrió (test Task 4).
4. Lista de precios con dos montos en un segmento ("ropero $800 a $1200") → rango, nunca dos filas; con montos sin mueble → nada (test Task 2).
5. Snapshot ausente (job nunca corrió) → la API devuelve `null` y la página muestra estado vacío, no 500 (test Task 6).

---

### Task 1: Tipos y zonas

**Files:** Create `classes/armadores/types.ts`, `classes/armadores/zones.ts`; Test `tests/armadores/zones.test.ts`.

**Produces:** tipos `ArmadorSource`, `ArmadorZone`, `ArmadorItem`, `ArmadorPrice`, `ArmadorEntry`, `ArmadorSnapshot` (ver spec); `ZONE_BARRIOS: Record<MontevideoZone, readonly string[]>` (los 62 barrios INE partidos por coma + alias anunciados), `METRO_LOCALITIES: readonly string[]`, `zoneOfBarrio(name: string): ArmadorZone | null`.

- [ ] Test: cada parte de `INE_DISPLAY_NAMES` cae en exactamente una zona; `zoneOfBarrio('pocitos nuevo') === 'costa-este'`, `'Ciudad de la Costa' → 'metropolitana'`, `'Maldonado' → null`.
- [ ] Implementar; correr `npx vitest run tests/armadores/zones.test.ts` → PASS.

### Task 2: Lectura de texto

**Files:** Create `classes/armadores/text.ts`; Modify `classes/rentals/neighborhoods.ts` (agregar `neighborhoodsNamedIn(text, department): string[]`, todas las coincidencias con las mismas guardas, sin solapes); Test `tests/armadores/text.test.ts`.

**Produces:** `isAssemblyTitle(title): boolean`, `coverageFromText(text): { allMontevideo; barrios; outside }`, `servicesFromText(text): string[]`, `itemOf(label): ArmadorItem | null`, `pricesFromText(text, sourceUrl, observedAt): ArmadorPrice[]` (origin `ad-text`).

- [ ] Tests: Review Focus 1, 2, 4; "voy a todo Montevideo" → `allMontevideo`; "Pocitos, Buceo y Malvín" → tres barrios; "Ropero 3 puertas $1.200" → `{item:'ropero', amount:1200}`.
- [ ] Implementar; PASS.

### Task 3: Fuentes

**Files:** Create `classes/armadores/sources/{google,facebook,mercadolibre}.ts`, `classes/armadores/editorial.ts` (+ `editorialData.json` generado de `docs/research/armadores/editorial.json`); Test `tests/armadores/sources.test.ts`.

**Produces:** `googleEntry(place, locate, observedAt): ArmadorEntry | null`; `readGooglePlaces({ base, queries, fetcher }): Promise<{ places; calls; failed }>`; `facebookEntry(card, description, observedAt)`; `facebookDescription(id, texts): string | null`; `mlEntry(item, observedAt)`; `readMlServices({ fetcher })`; `editorialEntries(): ArmadorEntry[]`.

- [ ] Tests con fixtures: negocio "Mueblería X" sin "arm" → null; coordenada en Pocitos → base `costa-este`; tarjeta FB $100 → `symbolicPrice`; ML con city "Centro" → base Centro.
- [ ] Implementar; PASS.

### Task 4: Fusión, guarda y job

**Files:** Create `classes/armadores/build.ts`, `classes/armadores/store.ts`, `classes/models/ArmadorSnapshot.ts`, `classes/models/ArmadorFacebookDetail.ts`, `sync_armadores.ts`; Modify `ecosystem.config.js`, `scripts/deploy-backend.sh` (`OTHER_APPS`); Test `tests/armadores/build.test.ts`.

**Produces:** `mergeEntries(previous, fresh, now): ArmadorEntry[]`, `snapshotIsThin(next, previous): string | null`.

- [ ] Tests: Review Focus 3; TTL 14/30; Google↔editorial por placeId/dominio; FB duplicado (título+monto) colapsa; flaca.
- [ ] Implementar; `npm run build` limpio; `node dist/sync_armadores.js --dry-run` en el VPS imprime conteos.

### Task 5: App — datos

**Files:** Create `app/server/models/ArmadorSnapshot.ts`, `app/server/api/armadores.get.ts`, `app/server/api/armadores/contacto/[placeId].get.ts`, `app/utils/armadores.ts`; Test `app/tests/unit/armadores.test.ts`, `app/tests/unit/armadoresZonesParity.test.ts`.

**Produces:** `readArmadoresQuery`, `buildArmadoresQuery`, `filterArmadores`, `sortArmadores`, `splitByZoneMatch`, `priceReference`.

- [ ] Tests: Review Focus 5; zona → base primero / cobertura después; referencia n ≥ 3 y sin simbólicos; paridad de zonas con el backend.
- [ ] Implementar; PASS.

### Task 6: App — página

**Files:** Create `app/pages/armadores-de-muebles-montevideo.vue`, `app/components/armadores/{ProviderCard,PriceReference,ZonePicker}.vue`, `app/utils/armadoresCopy.ts`; Modify `app/utils/siteNav.ts`, `app/utils/relatedPages.ts`, enlaces desde `fletes-mudanzas-uruguay.vue`; `docs/seo/experiments.json`; `docs/app/ARMADORES.md`; `AGENTS.md`.

- [ ] `siteNav-coverage`, `pageContainer`, `relatedPages`, `experiments_routes` en verde; `npm run lint` sobre lo propio.
- [ ] Verificar en navegador (390 px y escritorio, ambos temas); revisión de terminación.

### Task 7: Deploy y medición

- [ ] PR → automerge → deploy; correr el job a mano en el VPS; medir la página publicada.
