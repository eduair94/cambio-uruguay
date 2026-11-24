# Computadoras usadas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/computadoras-usadas-uruguay` (directorio de Facebook Marketplace + ML usados con lo que
cuesta armar cada PC pieza por pieza), su ficha por aviso y `/precios-componentes-pc-uruguay`.

**Architecture:** módulo propio `classes/computadoras/` (lector de especificaciones, tabla de
precios por pieza, valuación) sobre las cañerías existentes (`classes/facebook/`, puente de ML,
`fetchUsdUyuRate`); un job `sync_computadoras.ts` (diaria + `--fast` horaria) escribe en la APP DB;
el app lee con la forma de motos (API con facetas, tarjetas, ficha noindex).

**Tech Stack:** TypeScript 6 (CommonJS) + mongoose en la raíz, vitest; Nuxt 4 / Vuetify 4 en `app/`.

**Spec:** `docs/superpowers/specs/2026-11-23-computadoras-usadas-design.md`

## Global Constraints

- Todo regex corre sobre `norm()` (minúsculas, sin acentos); ninguno con bandera `g`/`y`.
- Ningún campo `key` con dígitos en código o fixtures (gitleaks `generic-api-key`): usar `slug`/`id`.
- Fixtures de tests: títulos y descripciones reales de la muestra del 23/11/2026, sin ids, vendedores
  ni enlaces.
- Precios de piezas en USD; pesos convertidos con la cotización del día; sin cotización no corre.
- Publicar mediana de pieza nueva con ≥ 3 ofertas de ≥ 2 vendedores; usada con ≥ 3 avisos.
- Un total (nuevo o usado) sólo si TODAS las piezas tienen precio; si no, parcial + `missing`.
- Moneda deducida o falla declarada ⇒ sin veredicto y fuera de comparables.
- Nada de descripción, vendedor de Facebook ni contactos en colecciones públicas.
- Cada entrypoint de pm2 importa `./sentry_job` primero; job nuevo en `OTHER_APPS` de
  `scripts/deploy-backend.sh`; fila en AGENTS.md; `npx tsc -p tsconfig.production.json --noEmit`
  entero antes de empujar.
- Fila en `docs/seo/experiments.json` para las dos rutas nuevas en el mismo commit que las publica.

## Review Focus

- Un título que nombra una pieza «para» otra cosa («Cargador Laptop Toshiba», «Pantalla para
  notebook») no es una computadora → `readComputerSpecs` devuelve `kind: null`.
- «16gb 480gb» sin rótulos: el chico es RAM, el grande disco; «RTX 4060 8gb» no es RAM.
- Un precio 0/1 o «consultar» no entra al directorio.
- «i7» sin modelo no se valúa como ningún i7 concreto: la pieza queda sin precio.
- Una PC «sin disco»/«sin placa de video» no inventa la pieza ausente.

---

### Task 1: Identidad de procesador y placa de video

**Files:** Create `classes/computadoras/text.ts`, `classes/computadoras/cpu.ts`,
`classes/computadoras/gpu.ts`, `classes/computadoras/types.ts`; Test `tests/computadoras/cpu.test.ts`,
`tests/computadoras/gpu.test.ts`.

**Interfaces — Produces:**
- `norm(text: string): string`
- `readCpu(text: string): CpuIdentity | null` — `{ brand: 'intel'|'amd'|'apple', family, model: string|null, slug: string|null, label, generation: number|null, socket: string|null, ramType: 'ddr3'|'ddr4'|'ddr5'|null, mobile: boolean, year: number|null }`; `slug` sólo con modelo exacto (`cpu:i5-12400f`, `cpu:ryzen-5-5600x`, `cpu:apple-m2-pro`).
- `readGpu(text: string): GpuIdentity | null` — `{ brand, series, model, slug: string|null, label, vramGb: number|null, integrated: boolean, year: number|null }` (`gpu:rtx-3060-ti`).

- [ ] Tests con títulos reales: «Pc Gamer Intel I5 9400f | Gtx 1050 Ti 4gb» → i5-9400F gen 9 LGA1151 ddr4; «Ryzen 7 5700G» → AM4; «Ryzen 5 8400f … Am5» → AM5 ddr5; «i7-13620h» mobile; «Core Ultra 5 245kf» LGA1851; «Apple Macbook Air 2020,m1» → apple-m1; «i5 10ma generacion» → modelo null, gen 10; «Pc Gamer I7 2070rtx» → gpu rtx-2070; «rtx3060ti» → rtx-3060-ti; «Rx580 2048sp 8gb» → rx-580 vram 8; «Vega 8» → integrated; «FX-8350» → AM3+ ddr3.
- [ ] Implementar; `npx vitest run tests/computadoras` verde; commit.

### Task 2: Lector de especificaciones

**Files:** Create `classes/computadoras/specs.ts`; Test `tests/computadoras/specs.test.ts`.

**Interfaces — Consumes:** Task 1. **Produces:**
`readComputerSpecs(input: { title: string; description?: string | null; mlCategory?: string | null; fbAttributes?: Record<string,string> }): ComputerSpecs` con `kind: ComputerKind | null`, `rejectReason`, `cpu`, `gpu`, `ramGb`, `ramType`, `storage: StorageDrive[]`, `psuWatts`, `chipset`, `screenInches`, `monitorInches`, `peripherals`, `faults: FaultKind[]`, `condition`, `basis` por campo (`'title'|'description'|'facebook'`).

- [ ] Tests: tipo por categoría de ML y por palabras; rechazos (TV, PS5, tablet, cargador, monitor solo); «16gb 480gb», «16ram», «1 tera», «ssd 240 + hdd 1tb»; descripción rotulada de la ficha real; fallas («No Bootea», «para repuestos», «No funciona»); el título gana a la descripción.
- [ ] Implementar; verde; commit.

### Task 3: Piezas, precios y valuación

**Files:** Create `classes/computadoras/parts.ts`, `classes/computadoras/valuation.ts`,
`classes/computadoras/currency.ts`; Test `tests/computadoras/{parts,valuation,currency}.test.ts`.

**Interfaces — Produces:**
- `partsOf(specs: ComputerSpecs): PartNeed[]` (rol, slug o null, label, `estimated`).
- `partObservationFrom(row: RawListing, specs): PartObservation | null` (una pieza sola, nueva o usada).
- `buildPartTable(obs: PartObservation[], previous: PartRow[], day: string): PartRow[]`.
- `valueListing(specs, priceUsd, table: Map<string, PartRow>, cohort): Valuation`.
- `inferUsd(amount, currency, specs, table, rate): { currency, inferred: boolean }`.

- [ ] Tests: total sólo completo; parcial con `missing`; mother por socket y fuente estimada marcadas `estimated`; veredicto por tramos 60/90/110 %; sin veredicto con moneda deducida o falla; mediana con ≥3 ofertas y ≥2 vendedores; banda ×3.
- [ ] Implementar; verde; commit.

### Task 4: Fuentes, almacenamiento y job

**Files:** Create `classes/computadoras/sources/{facebook,mercadolibre}.ts`, `classes/computadoras/catalog.ts`,
`classes/computadoras/store.ts`, `classes/models/Computer{Listing,Catalog,Part,Meta,FbDetail}.ts`,
`sync_computadoras.ts`; Modify `ecosystem.config.js`, `scripts/deploy-backend.sh`, `AGENTS.md`;
Test `tests/computadoras/{facebook,catalog,dry_run}.test.ts`.

**Interfaces — Produces:** `buildComputerCatalog(raw, details, table, rate, day): ComputerCatalogRow[]`
(la fila pública del Task 5); `sync_computadoras.ts [--fast] [--dry-run --json=<archivo>]`.

- [ ] Tests: tarjeta de Facebook → fila cruda; ficha → descripción + `attribute_data`; catálogo sin
  campos privados; guarda de corrida flaca (< 40 %); `--dry-run` sin base.
- [ ] Implementar; `npx tsc -p tsconfig.production.json --noEmit` limpio salvo `sheet_key.json`; commit.

### Task 5: App

**Files:** Create `app/utils/computadoras.ts`, `app/utils/computadorasPublic.ts`,
`app/server/models/Computer{Catalog,Part,Meta}.ts`, `app/server/api/computadoras/{index,aviso/[slug],componentes}.get.ts`,
`app/components/computadoras/*`, `app/pages/computadoras-usadas-uruguay/{index,aviso/[slug]}.vue`,
`app/pages/precios-componentes-pc-uruguay.vue`; Modify siteNav, directorios (+ API), sitemap, ads,
nuxt.config robots, seoContract, wideDirectories, `docs/seo/experiments.json`; Test
`app/tests/unit/computadoras{,Api,Pages}.test.ts`.

- [ ] Forma de `/api/motos` (estado `ok|preparing|unavailable`, facetas sin su propio filtro,
  cache 600 s); la ficha noindex; `npm test` y `npm run lint` del app verdes; commit.

### Task 6: Medir y publicar

- [ ] `--dry-run --json` en el VPS con el `dist/` de la rama; mirar cobertura de especificaciones y
  de precios; corregir; `docs/app/COMPUTADORAS.md`; PR; deploy; medir la página publicada.
