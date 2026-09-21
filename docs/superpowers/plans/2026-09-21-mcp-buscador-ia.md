# Buscador con IA (MCP + skill) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sumar al MCP `cambio-uruguay-mcp` 19 tools (alquileres, oportunidades, autos, productos), 6 prompts, instrucciones de servidor, toolsets por ruta, una skill descargable y la página `/buscar-con-ia`.

**Architecture:** Handlers puros `(site: SiteApi, input) => Promise<ToolOutput>` por vertical sobre una costura HTTP (`SiteApi`) contra `https://cambio-uruguay.com/api/*`; registro MCP separado por toolset; `buildServer(api, { site, toolsets })`. La skill vive en `mcp/skills/` y se empaqueta como zip hacia `app/public/descargas/`.

**Tech Stack:** TypeScript 5 ESM (Node16), `@modelcontextprotocol/sdk` 1.30, zod 3, vitest 2; Nuxt 4 + Vuetify 4 para la página.

**Spec:** `docs/superpowers/specs/2026-09-21-mcp-buscador-ia-design.md`

## Global Constraints

- Imports relativos con sufijo `.js` (Node16). Sin dependencias nuevas en `mcp/`.
- Salida de cada tool: `text` (español, compacto) + `structuredContent` compactado con `asOf`, `siteUrl`, `notes`.
- Links públicos siempre a `https://cambio-uruguay.com` (`PUBLIC_SITE`), independiente de `SITE_BASE_URL`.
- Nunca loguear ni cachear ingresos, coordenadas o direcciones del hogar (POST no se cachea; geocode con `ttlMs: 0`).
- Cero cifras de ingreso publicitario en nada versionado (repo público).
- Timeout default 25 s; `rentals/fit` 90 s; un reintento en 502/503/504/red.
- Versión del paquete: 0.2.0.

## File Structure (mcp/)

| file | responsabilidad |
|---|---|
| `src/format.ts` | formato de montos/porcentajes, `slugify`, `fold`, `toQuery`, `siteUrl`, `PUBLIC_SITE` |
| `src/site.ts` | `SiteApi`, `SiteError`, `httpSiteApi()` (caché TTL, dedupe, timeout, reintento, errores en español) |
| `src/output.ts` | `ToolOutput`, `toolResult`, `toolError`, `safe()` |
| `src/toolsets.ts` | `TOOLSETS`, `parseToolsets`, `toolsetsFromUrl` |
| `src/instructions.ts` | `serverInstructions(toolsets)` |
| `src/rentals/types.ts` | tipos crudos mínimos del sitio + enums (garantías, comodidades, orden, servicios) |
| `src/rentals/compact.ts` | `compactRental`, `rentalLine` (texto de una vivienda) |
| `src/rentals/search.ts` | `rentalSearchParams`, `searchRentals`, `geocodeAddress` |
| `src/rentals/household.ts` | `householdBody`, `rankRentalsForHousehold` |
| `src/rentals/detail.ts` | `getRental` |
| `src/rentals/market.ts` | `rentalMarketStats`, `estimateFairRent`, `compareNeighborhoods` |
| `src/rentals/opportunities.ts` | `findPropertyOpportunities` |
| `src/cars/compact.ts` | `compactCar`, `carLine` |
| `src/cars/search.ts` | `carSearchParams`, `searchUsedCars`, `resolveCarModel` |
| `src/cars/market.ts` | `findCarOpportunities`, `getCar`, `carModelPrices`, `carDeclaredRisks`, `carMarketReport` |
| `src/products/search.ts` | `searchProducts`, `listDirectories` |
| `src/products/home.ts` | `planHomeSetup` |
| `src/products/stores.ts` | `checkOnlineStore` |
| `src/products/groceries.ts` | `supermarketPrices` |
| `src/register/exchange.ts` | las 7 tools + prompt existentes (movidas de `server.ts`, sin cambios) |
| `src/register/rentals.ts` · `cars.ts` · `products.ts` | zod + descripciones + `safe(handler)` |
| `src/register/prompts.ts` | 6 prompts nuevos |
| `src/server.ts` | `buildServer(api, options)` |
| `src/index.ts` | `SITE_BASE_URL`, `MCP_TOOLSETS`, rutas `/mcp/<toolset>` |
| `vitest.config.ts` | config propio (hoy hereda el de la raíz) |
| `test/fakeSite.ts` | `fakeSite(routes)` que registra llamadas |
| `test/{format,site,rentals,cars,products,server}.test.ts` | tests |
| `scripts/smoke.mjs` | humo en vivo contra producción |
| `scripts/pack-skill.mjs` | zip "store" de la skill |
| `skills/buscador-uruguay/SKILL.md` + `references/*.md` | skill |

---

### Task 1: Fundaciones (format, site, output, toolsets, vitest config)

**Files:** Create `mcp/vitest.config.ts`, `mcp/src/format.ts`, `mcp/src/site.ts`, `mcp/src/output.ts`, `mcp/src/toolsets.ts`, `mcp/test/fakeSite.ts`, `mcp/test/format.test.ts`, `mcp/test/site.test.ts`.

**Interfaces (produce):**
```ts
// format.ts
export const PUBLIC_SITE = "https://cambio-uruguay.com";
export type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];
export function toQuery(params?: Record<string, QueryValue>): string;          // "" o "?a=1&b=x,y"; true→"1"; false/null/undefined/""/[]→omitido
export function siteUrl(path: string, params?: Record<string, QueryValue>): string;
export function fmt(n: number, digits?: number): string;                       // es-UY
export function money(amount: number | null | undefined, currency?: string): string; // "$ 24.900" | "US$ 7.900" | "s/d"
export function pct(ratio: number | null | undefined, digits?: number): string; // 0.27 → "27 %"
export function slugify(s: string): string;
export function fold(s: string): string;
// site.ts
export interface SiteRequestOptions { ttlMs?: number; timeoutMs?: number; retry?: boolean }
export interface SiteApi {
  get<T>(path: string, query?: Record<string, QueryValue>, opts?: SiteRequestOptions): Promise<T>;
  post<T>(path: string, body: unknown, opts?: SiteRequestOptions): Promise<T>;
}
export class SiteError extends Error { readonly status: number }
export const TTL = { search: 60_000, catalog: 600_000 } as const;
export function httpSiteApi(baseUrl?: string, deps?: { fetch?: typeof fetch; now?: () => number; userAgent?: string }): SiteApi;
// output.ts
export interface ToolOutput { text: string; data: Record<string, unknown> }
export function toolResult(out: ToolOutput): { content: { type: "text"; text: string }[]; structuredContent: Record<string, unknown> };
export function toolError(error: unknown): { isError: true; content: { type: "text"; text: string }[] };
export function safe<I>(fn: (input: I) => Promise<ToolOutput>): (input: I) => Promise<ReturnType<typeof toolResult> | ReturnType<typeof toolError>>;
// toolsets.ts
export const TOOLSETS: readonly ["cambio", "alquileres", "autos", "productos"];
export type Toolset = (typeof TOOLSETS)[number];
export function parseToolsets(raw?: string | null): Toolset[];                 // vacío/desconocido → todos
export function toolsetsFromUrl(url: string): Toolset[] | null;              // "/mcp" → todos; "/mcp/autos" → ["autos"]; otra ruta → null
```

- [ ] Tests (format): `toQuery({a:1,b:true,c:false,d:null,e:"",f:["x","y"],g:[]})` → `"?a=1&b=1&f=x%2Cy"`; `money(24900,"UYU")` → `"$ 24.900"`; `money(7900,"USD")` → `"US$ 7.900"`; `money(null)` → `"s/d"`; `pct(0.271)` → `"27 %"`; `slugify("Citroën C3 Aircross")` → `"citroen-c3-aircross"`; `siteUrl("/x",{q:"a b"})` → `"https://cambio-uruguay.com/x?q=a+b"`.
- [ ] Tests (site): GET cachea por `ttlMs` (2 llamadas → 1 fetch; tras vencer → 2); pedidos en vuelo idénticos se deduplican; POST nunca se cachea; 429 → `SiteError` status 429 con "reintentá en un minuto"; 404 → "no existe o ya no está publicado"; 502 reintenta una vez y devuelve el segundo resultado; `retry:false` no reintenta; manda `user-agent` `cambio-uruguay-mcp/0.2.0`.
- [ ] Tests (toolsets): `parseToolsets("autos, x")` → `["autos"]`; `parseToolsets("")` → los 4; `toolsetsFromUrl("/mcp?toolsets=autos,productos")` → `["autos","productos"]`; `toolsetsFromUrl("/mcp/nope")` → `null`.
- [ ] Implementar; `npx vitest run` verde; commit `feat(mcp): cliente del sitio, formato y toolsets`.

### Task 2: Alquileres — búsqueda, geocodificación, ficha

**Files:** Create `src/rentals/{types,compact,search,detail}.ts`, `test/rentals.test.ts`.

**Mapping `rentalSearchParams(input)` → query de `/api/rentals`** (nombres exactos del sitio, `app/utils/rentals.ts#normalizeRentalQuery`):
`department`, `neighborhoods` (join ","), `types` (join; valores `vivienda|apartamento|casa|habitacion|local|oficina|garaje|terreno|otro`), `bedrooms`, `bedroomsExact`, `bathrooms`, `areaMin`, `areaMax`, `currency`, `priceMin`, `priceMax`, `monthlyMaxUyu→monthlyMax`, `expensesMaxUyu→expensesMax`, `pets`, `parking`, `furnished`, `guarantees→garantia` (`anda|contaduria|aseguradora|propietaria|deposito|bhu|aConvenir`), `amenities→comodidades` (`gimnasio|piscina|parrillero|ascensor|aire|balcon|lavadero|calefaccion|jardin|sauna|salon`), `ownerDirect→dueno`, `agency`, `source` (`mercadolibre|infocasas|facebook|elpais|casasweb`), `text→q`, `near→refLat/refLng/refLabel` (+ fuerza `sort=distancia`), `neighborhoodQuality→servicios` (`denuncias|agua|luz|saneamiento|limpieza|alumbrado`), `hideReported` (`any→availability=hide_any`, `multiple→hide_multiple`), `sort` (`recientes|precio|precio-desc|total|precio-m2|metros|distancia`), `page`, `perPage` (6–48, default 10 → se pide 12 y se recorta).

**`compactRental(p)`** → `{ key, title, type, department, neighborhood, address?, bedrooms, bathrooms, areaM2, rent: {amount, currency, uyu}, expensesUyu, monthlyUyu, guarantees, pets, parking, furnished, sources, advertiser: {name,type}, listingUrl, siteUrl: PUBLIC_SITE+"/alquileres/"+key, firstSeen, lastSeen, reported: availability.status!=="unconfirmed" ? status : undefined, distanceKm? }` usando `matchingOffer ?? offers[0]`; `monthlyUyu` = `priceUyu + commonExpenses` sólo si el MISMO aviso publica gastos comunes (UYU directo; USD × usdUyu del meta).

**`searchRentals`**: GET `/api/rentals` (TTL.search) → texto: total, mediana, 1 línea por vivienda (`rentalLine`), top 8 barrios del facet, `siteUrl` (`/alquileres-uruguay` + mismos params sin page/perPage). Con `near.radiusKm`, filtra `distanceKm <= radiusKm` y lo dice en `notes`. `notes` siempre incluye: "total mensual sólo cuando el aviso publica gastos comunes".

**`geocodeAddress(site,{address,department})`**: GET `/api/rentals/geocode?q&department` `ttlMs:0` → `{items:[{label,lat,lng}]}`; sin resultados → texto que pide esquina o número de puerta.

**`getRental(site,{key})`**: GET `/api/rentals/ficha/:key`; si `property.officialZone.zone` → GET `/api/rentals/zone-profile?zone&department` (fallo tolerado). Devuelve vivienda compactada + todos los avisos (portal, precio, gastos, link, anunciante), descripción (≤1.200 chars), comodidades, texto de garantía, superficies, mercado (`medianRentUyu`, p25/p75, `differencePercent`, muestra, alcance), similares (compactados), perfil del barrio (niveles agua/alumbrado/saneamiento/limpieza/calles/denuncias, cortes de agua, reclamos por mil, denuncias del período).

- [ ] Tests: params (cada alias, `near` fuerza distancia, perPage recortado), `compactRental` (total sólo con gastos del mismo aviso; USD convertido), `searchRentals` llama la ruta correcta y arma `siteUrl`, filtro por radio, `getRental` sobrevive a zone-profile caído, `geocodeAddress` vacío.
- [ ] Implementar; verde; commit `feat(mcp): buscar alquileres, ficha y geocodificar`.

### Task 3: Alquileres — hogar, mercado, tasador, barrios, oportunidades

**Files:** Create `src/rentals/{household,market,opportunities}.ts`; extend `test/rentals.test.ts`.

**`householdBody(input)`** → cuerpo exacto de `POST /api/rentals/fit` (`app/utils/rentalFit.ts#normalizeRentalFitInput`): ids `p1..`, `d1..`; `label` ≤ 40; destino `{id,label,kind:work|study|other,lat,lng,days(0–7),mode:walking|bicycling|transit|driving,targetKm>0}`; defaults `otherExpensesUyu/savingsUyu/transportUyu=0`, `types=["apartamento","casa"]`, `minBedrooms=0`, `minArea=0`, flags false, `hideReported=true`, `priority="balanced"`; `zones` sólo si hay preferidos/excluidos: `{mode:"prefer"|"only", include:[{department,neighborhood}], exclude:[…]}`.
**`rankRentalsForHousehold`**: destinos con `address` sin coordenadas → `geocodeAddress` (primer resultado; si no hay, error que nombra el destino). POST con `timeoutMs: 90_000, retry: true`. Salida: top N (default 10, máx 24) con puntaje, alquiler/gastos/total, `remainingUyu`, `% del ingreso`, distancia por persona/destino (con nombre), motivos/advertencias en español (`within_budget`→"dentro del presupuesto", `near_destinations`→"cerca de los destinos", `remote_household`→"hogar con mucho home office", `balanced_commutes`→"traslados parejos", `preferred_zone`→"barrio preferido"; `unknown_expenses`→"no publica gastos comunes", `unknown_location`→"sin ubicación exacta", `over_budget`→"supera el presupuesto", `low_remaining`→"deja poco margen", `reported`→"reportado como no disponible", `unknown_zone`→"barrio sin identificar") + `scanned/matched/complete`.
**`rentalMarketStats`**: GET `/api/rentals/analysis` (`currency, department, neighborhood, type, bedrooms`) → resumen (alquiler, gastos, total, $/m² construido), por dormitorios, top/bottom 8 barrios por mediana (con n), cobertura.
**`estimateFairRent`**: POST `/api/rentals/estimate` (`department, neighborhood, type, bedrooms, bathrooms, area, areaBasis, currency, parkingSpaces?, askingPrice?`) → estado, rango p25–p75, mediana, total mensual, posición del precio pedido, 5 comparables con link; `status!=="supported"` → explica `reason`.
**`compareNeighborhoods`**: GET `/api/rentals/zones` (`department, propertyType, bedrooms`; TTL.catalog) + `/api/rentals/zone-scores` (TTL.catalog, fallo tolerado). Con `neighborhoods[]` → esos (match por `fold`); sin lista → ranking por `rankBy` (`rent|monthly|crime|services`) top 10. Por barrio: alquiler mediana/p25/p75 (n), total mensual, $/m², denuncias total + por tipo, niveles de servicios públicos, servicios cercanos, puesto entre N (de zone-scores: `betterThan`).
**`findPropertyOpportunities`**: GET `/api/property-opportunities` (`operation, department, neighborhood, type, bedrooms, maxPrice, confidence, evidence, signal, sort, page, perPage`, `availability=hide_any` en alquiler) → por ítem: aviso, precio de comparación, mediana, brecha % y conservadora, comparables/anunciantes, confianza, cautelas en español; `stats.excluded` resumido; `siteUrl` `/oportunidades-inmobiliarias-uruguay`.

- [ ] Tests: `householdBody` (defaults, ids, zonas), geocodificación de destino por dirección, error de destino no encontrado, traducción de motivos, `compareNeighborhoods` por lista y por ranking, oportunidades mapea params y cautelas.
- [ ] Implementar; verde; commit `feat(mcp): ranking por hogar, mercado, tasador, barrios y oportunidades`.

### Task 4: Autos

**Files:** Create `src/cars/{compact,search,market}.ts`, `test/cars.test.ts`.

**`carSearchParams`** → `/api/cars` (`app/utils/cars.ts#normalizeCarsQuery`): `text→q`, `brand` (slug), `model` (marketSlug `marca-modelo`), `yearMin/yearMax`, `kmMax`, `maxLitersPer100Km→l100Max`, `priceMinUsd→priceMin`, `priceMaxUsd→priceMax`, `fuel` (`nafta|diesel|electrico|hibrido|gnc|…` validado por el sitio), `transmission` (`manual|automatica`), `body` (`sedan|hatchback|suv|pickup|rural|furgon|monovolumen|coupe|cabriolet`), `doors`, `color`, `department`, `seller` (`dealer|private`), `source`, `priceDrop`, `onlyOpportunities→opportunity`, `noDeclaredRisk→noRisk`, `sinceDays`, `sort` (`recent|price_asc|price_desc|km_asc|year_desc|consumption_asc`), `page`.
**`resolveCarModel(site, brand, model)`**: `brand` → `slugify`; `model` ya con prefijo de marca → tal cual; si no, GET `/api/cars?brand=<slug>` y busca en `facets.models` por `fold(name)` exacto, luego "empieza con"; si no, `${brand}-${slugify(model)}`.
**`compactCar`** → `{ key, title, brand, model, trim, engine, year, km, priceUsd, currency, currencyInferred, fuel, transmission, body, doors, color, l100km, department, seller: dealer|private (+dealerName), source, listingUrl: permalink, siteUrl: /autos-usados-uruguay/<key>, priceDrop, opportunity: {gapPct, medianUsd, n}, reference: {priceUsd, basis}, risks: [{category, severity, quote}] }`.
**`findCarOpportunities`** → `/api/car-opportunities` (`tier, brand, priceMax, yearMin, kmMax, fuel, transmission, body, l100Max, department, seller, sort, page`) + `policy` resumida.
**`getCar`** → `/api/cars/ficha/:key`: auto + cohorte (n, p25/mediana/p75, km mediana) + posición vs mediana + referencia de la guía + riesgos citados + 5 similares.
**`carModelPrices`** → `resolveCarModel` + `/api/cars/market/:slug`: por año (n, mediana), filas por versión, guía de ML, oportunidades del modelo (≤5), 8 avisos más baratos del año pedido (`year?`).
**`carDeclaredRisks`** → `/api/car-risks` (`category, brand, measured, subject filters, sort, page`): categorías (avisos, medidos, descuento mediano) + ítems con cita y severidad.
**`carMarketReport(site,{section, budgetUsd?, model?})`** → `/api/car-report` (TTL.catalog): `overview` | `budgets` (si `budgetUsd`, la banda `maxUsd` más chica ≥ budget) | `depreciation` (si `model`, la fila por `fold`) | `negotiation` | `seller_gaps` | `valuation` | `rotation`.

- [ ] Tests: params, resolveCarModel (prefijado, por facet, fallback), compactCar, budgets elige banda correcta, riesgos con cita.
- [ ] Implementar; verde; commit `feat(mcp): autos usados — búsqueda, oportunidades, riesgo, modelo e informe`.

### Task 5: Productos

**Files:** Create `src/products/{search,home,stores,groceries}.ts`, `test/products.test.ts`.

**`searchProducts(site,{vertical, text, brand, maxPriceUyu, condition, limit})`**, verticales `celulares|sillas|hogar|monopatines|bicicletas-electricas|todas`, todos con TTL.catalog. Fila normalizada `{ vertical, name, brand?, category?, variant?, bestPriceUyu, band?: {p25, median, p75, n}, usedBand?, sellers, bestOffer?: {seller, priceUyu, url, condition}, rating?, tier?, siteUrl }`:
- celulares: `/api/phones` → `brands[].models[]` (`name, bestNewUyu, newSellers`, `siteUrl /celulares-uruguay/<slug>`).
- sillas: `/api/chairs` → `products[]` (`price.median/min/bestNew/bestUsed`, `offers` más barata, `stars`, `ratingCount`, `tier`, `/sillas-escritorio-uruguay/<slug>`).
- hogar: `/api/equipar` → `items[]` (`categoryLabel`, `variantLabel`, `newBand`, `usedBand`, producto/oferta más barata, `tier`, `/equipar-casa-uruguay/<category>`).
- monopatines/bicicletas: `/api/movilidad/<monopatin-electrico|bicicleta-electrica>` → `items[]` igual que hogar, siteUrl de la página de movilidad.
Filtro por `fold(text)` contra nombre+categoría+variante (todas las palabras), `brand`, `maxPriceUyu` sobre `bestPriceUyu`, `condition=used` exige banda/oferta usada. Orden por precio.
**`listDirectories`** → `/api/directorios` → conteo + fecha + link por directorio (mapa fijo clave→ruta).
**`planHomeSetup(site,{level, have, condition})`**: `/api/equipar` `meta.baskets` (`minima|decente|completa`); quita líneas cuyo `itemKey`/`label` coincide con `have` (fold, prefijo de categoría); `condition=new` recalcula cada línea con `newBand.median` del ítem si la línea era usada (y lo dice); total, líneas por ambiente, `missing` del sitio (total parcial honesto), link.
**`checkOnlineStore(site,{name})`**: `/api/stores` (TTL.catalog) match por `fold` en nombre/dominio/clave; si hay perfil → `/api/stores/:key`; devuelve señales fechadas (antigüedad, Google rating/reseñas, Trustpilot, menciones Reddit, https, políticas, medios de pago, contacto) + frase fija "son señales, no un veredicto". Sin match → lista las 5 más parecidas.
**`supermarketPrices(site,{text, department})`**: `/api/precios` (TTL.catalog): artículos que matchean `text` (p10/p50/p90, n, unidad) y `basket.cheapestStores` filtrado por departamento (ratio vs mediana del país, cobertura) + costo de la canasta nacional.

- [ ] Tests: normalización de cada vertical, filtros, `planHomeSetup` excluye lo que se tiene y marca parcial, `checkOnlineStore` sin match sugiere, precios filtra por departamento.
- [ ] Implementar; verde; commit `feat(mcp): productos — búsqueda unificada, equipar, tiendas y súper`.

### Task 6: Registro MCP, toolsets, instrucciones, prompts, index

**Files:** Create `src/register/{exchange,rentals,cars,products,prompts}.ts`, `src/instructions.ts`, `test/server.test.ts`; Modify `src/server.ts`, `src/index.ts`, `src/lib.ts`, `package.json` (0.2.0, script `smoke`, `files` += `skills`).

- `buildServer(api: CambioApi, options: { site?: SiteApi; toolsets?: readonly Toolset[] } = {})` → `new McpServer({name:"cambio-uruguay", version:"0.2.0"}, { instructions: serverInstructions(toolsets) })`; registra por toolset.
- zod: todo opcional salvo lo necesario; `.describe()` en español con valores válidos y unidades; límites (`perPage` ≤ 24, personas ≤ 8, destinos ≤ 4).
- Prompts: `buscar-alquiler {necesidades?}`, `evaluar-aviso-alquiler {aviso}`, `comparar-barrios {barrios?, departamento?}`, `buscar-auto-usado {necesidades?}`, `evaluar-auto {aviso}`, `equipar-casa {nivel?, tengo?}`.
- index: `toolsetsFromUrl(req.url)` → `null` = 404; `/health` → `{status, api, site, toolsets}`; stdio usa `parseToolsets(process.env.MCP_TOOLSETS)`; `SITE_BASE_URL`.
- Test con `InMemoryTransport.createLinkedPair()` + `Client`: toolsets registran exactamente sus tools (7/8/6/5 y 26 en total), prompts por toolset, `callTool("search_rentals")` con fake devuelve texto + structuredContent, error del sitio → `isError`, instrucciones presentes.
- [ ] Implementar; `npm test` + `npm run build` verdes; commit `feat(mcp): toolsets, instrucciones y prompts del buscador`.

### Task 7: Skill + zip + README/AGENTS/DEPLOY + humo

**Files:** Create `mcp/skills/buscador-uruguay/SKILL.md`, `references/{alquileres,autos,productos,api-http}.md`, `mcp/scripts/pack-skill.mjs`, `mcp/scripts/smoke.mjs`, `app/public/descargas/buscador-uruguay-skill.zip`, `mcp/test/skill.test.ts`; Modify `mcp/README.md`, `mcp/AGENTS.md`, `mcp/DEPLOY.md`, root `AGENTS.md` (fila currency-mcp).

- `pack-skill.mjs`: recorre la carpeta, escribe zip método 0 con `zlib.crc32`, fechas fijas (1980-01-01) para que sea determinista; salida `../app/public/descargas/buscador-uruguay-skill.zip`.
- `skill.test.ts`: SKILL.md tiene frontmatter `name`/`description`; el zip existe y su lista de archivos + CRC coincide con la carpeta (drift → rojo con "corré npm run pack-skill").
- `smoke.mjs`: llama cada handler contra producción e imprime la primera línea + ms; sale 1 si alguno falla.
- [ ] Implementar; tests verdes; `npm run smoke` verde; commit `feat(mcp): skill buscador-uruguay, zip y docs`.

### Task 8: Página `/buscar-con-ia`

**Files:** Create `app/pages/buscar-con-ia.vue`, `app/utils/aiSearch.ts` (conectores, prompts de ejemplo, lista de tools por vertical), `app/tests/unit/aiSearch.test.ts`; Modify `app/utils/siteNav.ts` (entrada junto a `/conectar`), `app/i18n/locales/json/{es,en,pt}.json` (`nav.buscarConIa`), `app/components/McpConfigCard.vue` (mención + link).

- Página: H1 "Buscá alquiler, auto o productos con tu IA", qué pedir (3 bloques con prompts copiables), conectar (Claude.ai/Desktop, ChatGPT, Claude Code, Cursor/VS Code, npx) con la URL por toolset, descarga de la skill, qué hace con tus datos, límites. `useSeoMeta`, sin anuncios nuevos.
- Test: cada tool listada en `aiSearch.ts` existe en el set del MCP (lista fija compartida con `mcp/src/register`… se compara contra un array exportado del test del MCP: se duplica la lista y el test del MCP verifica la suya; el de la app verifica rutas de ejemplo y que el zip exista en `public/descargas`).
- [ ] `npx vitest run tests/unit/aiSearch.test.ts` y `npx eslint` de los archivos tocados verdes; commit `feat(app): /buscar-con-ia — conectá tu IA al buscador`.

### Task 9: Verificación, merge y deploy

- [ ] `mcp`: `npm test`, `npm run build`, `npm run smoke`.
- [ ] app: tests tocados + lint.
- [ ] Rebase sobre `origin/main`, merge a `main`, push (CI despliega app).
- [ ] VPS: `cd /root/cambio-uruguay && git pull && cd mcp && npm install && npm run build && pm2 reload currency-mcp && pm2 save`; verificar `/health` y `tools/list` en `https://mcp.cambio-uruguay.com/mcp` y `/mcp/alquileres`.
- [ ] Medir `/buscar-con-ia` en producción (200, H1).
