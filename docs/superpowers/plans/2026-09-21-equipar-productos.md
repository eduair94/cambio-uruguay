# Equipar: hub de avisos + mi lista — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** publicar una fila por aviso de la cosecha de equipar y, sobre ella, un directorio con filtros
(todo + por categoría) y una lista para equipar que el lector arma en su navegador.

**Architecture:** el job `sync_equipar.ts` escribe `equiparlistings` (APP DB) después del catálogo;
`GET /api/equipar/productos` la sirve paginada con facetas (patrón `/api/cars`); tres páginas Nuxt
sólo-ES reutilizan el layout/panel/toolbar de autos; la lista vive en `localStorage` con snapshot por
aviso.

**Tech Stack:** TS 4.9 CommonJS (root), Nuxt 4 + Vuetify 4 (app), mongoose, vitest en los dos lados.

**Spec:** `docs/superpowers/specs/2026-09-21-equipar-productos-design.md`

## Global Constraints

- `app/utils` es un namespace plano: todo export con prefijo `equipar`/`EQUIPAR_`.
- Páginas sólo en español; canonical absoluto sin prefijo de idioma; un solo H1.
- Nunca `AggregateRating`; avisos enlazados con `rel="nofollow noopener"`.
- Nada de cifras de ingreso en nada versionado.
- Cambio pensado para tráfico → fila en `docs/seo/experiments.json` en el mismo commit.
- Nunca correr `nuxi prepare`/`nuxt build`/`npm run dev` en el root compartido; sólo en este worktree.

---

### Task 1: `buildEquiparListings` (backend, puro)

**Files:**
- Create: `classes/equipar/listings.ts`
- Modify: `classes/equipar/catalog.ts` (exportar `conditionOf`, `toOffer`, `NOT_A_BRAND`)
- Test: `tests/equipar/listings.test.ts`

**Interfaces:**
- Produces: `interface EquiparListingRow { listingId, category, categoryLabel, variant, variantLabel, tier, room, rank, variantRank, regime, condition: "new"|"used", source: "store"|"mercadolibre"|"facebook", sellerKey, sellerName, channel, officialStore, brand, brandKey, title, url, image, price, currency, priceUyu, listPrice, location, freeShipping, suspect, observedAt, lastSeen }`
- Produces: `buildEquiparListings({ listings, usdUyu, registry? }): { rows: EquiparListingRow[]; rejected: number; suspect: number }`

- [ ] Test: 10 heladeras de tienda + 6 usadas FB → 16 filas; una a $70 no está (`rejected` 1); `condition` "used" para FB sin decir nuevo; `brand` "" para "Sin marca"; `brandKey` normalizado; `lastSeen` = `observedAt.slice(0,10)`; `listingId` duplicado → una fila (la última); sin `CATEGORY_SPEC` y sin match → fuera.
- [ ] Implementar reusando `variantFor`, `itemKey`, `screen`, `conditionOf`, `toOffer`.
- [ ] `npx vitest run tests/equipar/listings.test.ts` verde. Commit.

### Task 2: modelo `EquiparListing` en los dos lados + store + job

**Files:**
- Create: `classes/models/EquiparListing.ts`, `app/server/models/EquiparListing.ts`
- Modify: `classes/equipar/store.ts` (`saveEquiparListings`), `sync_equipar.ts`, `tests/appdb/schema_parity.test.ts`
- Test: `tests/equipar/listings_store.test.ts` (operaciones de upsert puras: `equiparListingOps(rows)`)

**Interfaces:**
- Produces: `saveEquiparListings(rows, today): Promise<{ written: number; pruned: number }>`; `EQUIPAR_LISTING_KEEP_DAYS = 30`; `equiparListingUpsert(row): { updateOne: { filter, update: { $set, $setOnInsert }, upsert: true } }`.

- [ ] Test de paridad: agregar `EquiparListing` a `schema_parity.test.ts`.
- [ ] Test: `$setOnInsert.firstSeen === row.lastSeen`, `$set` no lleva `firstSeen`.
- [ ] Implementar; llamar desde `sync_equipar.ts` tras `saveEquiparCatalog`, en `try/catch` propio, sobre `listings` (mezcladas). Log `[equipar] avisos: N escritos, M podados, R rechazados, S sospechosos`.
- [ ] Root `npx vitest run tests/equipar tests/appdb` verde; `npx tsc -p tsconfig.production.json --noEmit` verde. Commit.

### Task 3: `app/utils/equiparProductos.ts` (tipos, query, chips, lista)

**Files:**
- Create: `app/utils/equiparProductos.ts`
- Test: `app/tests/unit/equiparProductos.test.ts`

**Interfaces (Produces):**
- `EQUIPAR_PRODUCTOS_PATH = '/equipar-casa-uruguay/productos'`, `EQUIPAR_LISTA_PATH = '/equipar-casa-uruguay/mi-lista'`, `EQUIPAR_PRODUCTOS_PER_PAGE = 24`
- `equiparProductoPath(categoria)`, `EQUIPAR_PRODUCTOS_SORTS`, `EquiparProductosSort`
- `EQUIPAR_FUENTE_LABELS`, `EQUIPAR_CONDICION_LABELS`
- `interface EquiparProductosQuery { categoria, variante, condicion: ''|'nuevo'|'usado', fuente: ''|'mercadolibre'|'facebook'|'tienda', vendedor, marca, precioMin: number|null, precioMax: number|null, q, orden, page }`
- `equiparProductosNormalize(raw)`, `equiparProductosParams(query)` (omite defaults), `equiparProductosFiltered(query)`, `equiparProductosChips(query, facets)`, `equiparProductosWithout(query, keys)`
- `interface EquiparProductoPublic { listingId, category, categoryLabel, variant, variantLabel, tier, rank, condition, source, sellerKey, sellerName, brand, title, url, image, price, currency, priceUyu, listPrice, location, freeShipping, lastSeen }`
- `interface EquiparProductosFacet { slug, name, count }`, `interface EquiparProductosResponse { generatedAt, usdUyu, total, page, perPage, items, facets: { categorias, variantes, marcas, vendedores, fuentes, condiciones }, suspect }`
- `interface EquiparListaLine { listingId, category, categoryLabel, variantLabel, tier, rank, title, priceUyu, price, currency, condition, sellerName, source, url, image, addedAt }`
- `equiparListaFromProducto(p): EquiparListaLine`, `equiparListaOrdenar(lines)`, `equiparListaTotal(lines): number`, `equiparListaFaltantes(lines, categorias: {key,label,tier,rank}[]): {key,label}[]` (tier S sin línea), `equiparListaTexto(lines, usdUyu|null): string`, `EQUIPAR_LISTA_MAX = 60`, `equiparListaValida(x): x is EquiparListaLine`

- [ ] Tests: normalize (page<1→1, precio no numérico→null, orden inválido→precio_asc, condicion 'x'→''), params omite vacíos, filtered, chips (rango de a una punta), without, ordenar por tier/rank, total, faltantes tier S, texto.
- [ ] Implementar. `cd app && npx vitest run tests/unit/equiparProductos.test.ts`. Commit.

### Task 4: API `GET /api/equipar/productos`

**Files:**
- Create: `app/server/utils/equiparProductos.ts` (`equiparProductosMatch(query, cutoff)`, `equiparProductosSort(orden)`, `equiparProductoPublic(row)`, `EQUIPAR_PRODUCTOS_PROJECTION`)
- Create: `app/server/api/equipar/productos.get.ts`
- Test: `app/tests/unit/equiparProductosApi.test.ts` (match/sort/public puros + handler con modelos mockeados, como `equiparCategoryRoute.test.ts`)

- [ ] Tests: match lleva `suspect: false` y `lastSeen >= cutoff`; `fuente: 'tienda'` → `source: 'store'`; `q` escapa regex; `ids` ignora filtros y ventana; `page` 3 → skip 48; error de DB → 503 `no-store`.
- [ ] Implementar facetas con `aggregate` + `maxTimeMS(10_000)` (categorías 40, variantes 12, marcas 40, vendedores 40, fuentes 3, condiciones 2), cada una sin su propio filtro. Cache `public, max-age=300, s-maxage=300`.
- [ ] Verde. Commit.

### Task 5: composable `useEquiparLista` + componentes

**Files:**
- Create: `app/composables/useEquiparLista.ts`
- Create: `app/components/equipar/ListingCard.vue`, `app/components/equipar/ProductosFilters.vue`, `app/components/equipar/ActiveFilters.vue`, `app/components/equipar/ListaBar.vue`
- Test: `app/tests/unit/equiparListaComposable.test.ts` (el composable con `useState`/`onMounted` stubbeados — o helpers puros ya cubiertos en Task 3; lo que se testea acá: `toggle` respeta tope 60 y persiste JSON válido).

- [ ] `useEquiparLista()` → `{ lines, ready, limited, storageFailed, has(id), toggle(line), remove(id), clear(), replace(lines) }`; clave `cu_equipar_lista`.
- [ ] `ListingCard` (props `producto`, `inList`; emit `toggle`): foto con `@error`, precio (USD ≈ $), chips condición/variante, vendedor · fuente, "visto el", botón agregar/quitar, enlace `nofollow noopener`.
- [ ] `ProductosFilters` (props `query`, `facets`, `mobile`, `open`, `total`, `fixedCategoria?`; emit `apply`, `update:open`): usa `CarsFilterPanel` con `noun="aviso"`. Campos: q, categoría (oculto si fija), variante (si hay), condición, fuente, marca, vendedor, precio min/max UYU.
- [ ] `ActiveFilters` (copia mínima de la de autos tipada con `EquiparProductosQuery`).
- [ ] `ListaBar` (sticky bottom, sólo si `lines.length`): "N ítems · $ total · Ver mi lista".
- [ ] `cd app && npm run lint` limpio en los archivos nuevos. Commit.

### Task 6: páginas `productos/index.vue`, `productos/[categoria].vue`, `mi-lista.vue`

**Files:**
- Create: `app/pages/equipar-casa-uruguay/productos/index.vue`, `app/pages/equipar-casa-uruguay/productos/[categoria].vue`, `app/pages/equipar-casa-uruguay/mi-lista.vue`
- Test: `app/tests/unit/equiparProductosPage.test.ts` (contrato por texto, como `equiparCategoryPage.test.ts`)

- [ ] Tests: cada página un H1, raíz `<VContainer`, `useSeoMeta`, canonical `https://cambio-uruguay.com/equipar-casa-uruguay/productos`; `[categoria]` con `validate` + `isEquiparCategorySlug` importado; `robots` noindex cuando `equiparProductosFiltered`; `mi-lista` `robots: 'noindex, nofollow'`; JSON-LD `CollectionPage`+`BreadcrumbList` y `ItemList`/`Product`/`Offer` en `[categoria]`, sin `AggregateRating`; index enlaza `equiparProductoPath(`; ambas montan `<EquiparListaBar`.
- [ ] Implementar las tres (patrón `autos-usados-uruguay/index.vue`; `useAsyncData` con `watch: [query]`; `scrollToPageTop`).
- [ ] Commit.

### Task 7: enlaces, nav, sitemap, directorios, i18n, experiments, docs

**Files:**
- Modify: `app/pages/equipar-casa-uruguay/index.vue` (CTA + "avisos" por tarjeta), `app/pages/equipar-casa-uruguay/[categoria].vue` (botón), `app/utils/directorios.ts` (`tambien`), `app/utils/siteNav.ts` (entrada + `DYNAMIC_ROUTE_KEYS` + `EXCLUDED_ROUTES`), `app/i18n/locales/json/{es,en,pt}.json` (`nav.equiparProductos`), `app/server/api/__sitemap__/urls.get.ts`, `docs/seo/experiments.json`, `docs/app/EQUIPAR.md`, `AGENTS.md` (fila del job).
- Test: `app/tests/unit/siteNav-coverage.test.ts` (existente), `tests/revenueplan/experiments_routes.test.ts` (existente), `equiparCategoryPage.test.ts` (existente, sigue verde).

- [ ] Implementar; `cd app && npx vitest run tests/unit/siteNav-coverage.test.ts tests/unit/equipar*.test.ts`; root `npx vitest run tests/revenueplan tests/equipar tests/appdb`.
- [ ] Commit.

### Task 8: verificación, merge, deploy, medición

- [ ] Root: `npm test` (o al menos `tests/equipar tests/appdb tests/revenueplan tests/no_scheduler_in_api.test.ts`) + `npx tsc -p tsconfig.production.json --noEmit`.
- [ ] App: `npm run lint` + `npx vitest run tests/unit`.
- [ ] `git fetch`, rebase sobre `origin/main`, merge fast-forward a `main`, push, `gh run watch`.
- [ ] Después del próximo `currency-equipar-hourly` (:53 UTC), medir en producción: `curl https://cambio-uruguay.com/api/equipar/productos?categoria=heladera` y abrir `/equipar-casa-uruguay/productos/heladera`.
- [ ] Prune de ramas mergeadas; sacar junctions y el worktree.
