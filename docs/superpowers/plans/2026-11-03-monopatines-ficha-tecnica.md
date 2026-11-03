# Monopatines: ficha técnica, filtros y asesor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leer la ficha técnica de cada monopatín, filtrar y ordenar el directorio por especificación, y sumar un asesor y contenido con cifras del propio mercado a `/monopatines-electricos-uruguay`.

**Architecture:** Un job horario nuevo (`sync_movilidad_specs.ts`) lee fichas de ML y tiendas a `movilidadspecs` (privada), enriquece las filas de `movilidadlistings` (`specs`, `uyuPerKm`, marca) con una función pura compartida con `sync_movilidad.ts`, y guarda un snapshot precalculado (candidatos + estadísticas) en `movilidadspecsnapshots`. El app lee: filtros/facetas/órdenes nuevos sólo para `vertical: 'movilidad'`, asesor que corre en el navegador sobre el snapshot, secciones SSR con las estadísticas.

**Tech Stack:** TypeScript (raíz CommonJS, vitest), cheerio no hace falta (regex como `classes/rentals/mlDetail.ts`), Nuxt 4 + Vuetify 4, mongoose.

**Spec:** `docs/superpowers/specs/2026-11-03-monopatines-ficha-tecnica-design.md`

## Global Constraints

- Sólo categoría `monopatin-electrico`; bicicletas no cambian.
- Equipar no cambia: el campo de consulta nuevo `ficha` existe sólo si `vertical === 'movilidad'`; `equiparProductosNormalize(raw)` (equipar) devuelve exactamente la forma de hoy (el `toEqual` de `app/tests/unit/equiparProductos.test.ts:51` sigue pasando sin tocarlo).
- Nunca se lee una ficha de Facebook.
- Bandas de cordura (fuera = `null`): rangeKm 3–150, maxSpeedKmh 5–100, motorW 100–8000, motorPeakW 100–15000, batteryV 12–84, batteryAh 1–60, batteryWh 50–4000, chargeHours 1–24, maxLoadKg 30–200, weightKg 3–80, wheelInches 5–14, minAge 3–18.
- Rango "a–b": rangeKm y maxLoadKg toman `a`; weightKg y chargeHours toman `b`; maxSpeedKmh toma `b`.
- Supuestos publicados: autonomía real 65 % (55 % si peso > 90 kg), margen de carga 10 kg, potencia ≥ 350 W "algunas subidas" y ≥ 500 W "muchas", liviano ≤ 15 kg, cargador 15 % de pérdida, tarifa UTE Simple escalón 101–600 kWh con IVA (`uteTariff('simple').brackets[1].pricePerKwh * (1 + UTE_IVA_RATE)`).
- Normativa: Montevideo y San José 25 km/h; nunca la palabra "ilegal".
- Repo público: cero cifras de ingreso. Commits en español, formato del repo.
- Cola de fichas: una falla se guarda; reintento a 1/3/7 días, abandono a la 4.ª; ficha buena se relee a 45 días; `gone` (404 o redirección a búsqueda) espera 7 días.

## Review Focus

- Una ficha de ML con la tabla en JSON escapado (`í`) y no en HTML → el parser igual la lee (test en Task 1 con `"Autonomía"`).
- Un aviso cuya ficha dice "Largo = 100 m" o "Peso = 260 kg" → el campo queda `null`, el resto se conserva (Task 1).
- La horaria de `sync_movilidad` corre después del job de fichas → la marca y `specs` no vuelven a vacío (Task 2, test de `enrichMovilidadRow` con ficha ausente vs presente, y el llamado en `sync_movilidad.ts`).
- Facetas cuando ningún aviso tiene ficha todavía (primer deploy antes de la primera corrida) → el panel no rompe y no muestra el grupo (Task 4/6: facetas vacías `[]`).
- El asesor con requisitos que nadie cumple → dice cuántos cumplen cada requisito por separado y cuál aflojar, nunca una lista vacía muda (Task 5).

---

### Task 1: Parser de especificaciones y marcas (raíz, puro)

**Files:**
- Create: `classes/movilidad/specs/types.ts`, `classes/movilidad/specs/parse.ts`, `classes/movilidad/specs/brands.ts`
- Test: `tests/movilidad/specs_parse.test.ts` (fixtures inline recortadas de las fichas reales medidas: Xiaomi 6 ML, RP500 ML, delcar S-PRO MOVE, superbikers Concept, voltbike Air, covercompany 6 GL)

**Interfaces:**
- Produces:
  - `type SpecSource = 'ficha' | 'descripcion' | 'titulo'`
  - `interface MonopatinSpecs { rangeKm, maxSpeedKmh, motorW, motorPeakW, batteryV, batteryAh, batteryWh, chargeHours, maxLoadKg, weightKg, wheelInches, minAge: number|null; foldable, suspension, discBrake, bluetooth: boolean|null; brakes: string|null; ipRating: string|null; from: Partial<Record<SpecField, SpecSource>> }`, `type SpecField = Exclude<keyof MonopatinSpecs,'from'>`, `EMPTY_SPECS`.
  - `mlSpecRows(html: string): Record<string,string>` (label → value; HTML `andes-table` y JSON `{"id":"…","text":"…"}`; decodifica `\uXXXX` y `&quot;`).
  - `mlDescription(html: string): string` (JSON `"type":"description"…"content"` o `ui-pdp-description__content`, más `og:description`).
  - `specsFromRows(rows: Record<string,string>): MonopatinSpecs` (from = 'ficha').
  - `specsFromText(text: string, source: SpecSource): MonopatinSpecs`.
  - `specsFromTitle(title: string): MonopatinSpecs`.
  - `mergeSpecs(...layers: MonopatinSpecs[]): MonopatinSpecs` (primer no-null gana, conserva `from`).
  - `hasFichaSpecs(s): boolean` (algún campo con from ficha|descripcion).
  - `brandFromTitle(title: string): string | null`; `cleanBrand(raw: string): string | null` (null para genéricos: monopatin, scooter, generica, generic, sin marca, e-scooter, electric).

- [ ] **Step 1:** tests: `specsFromRows(mlSpecRows(XIAOMI6))` → `{rangeKm:45, maxSpeedKmh:25, motorW:800, batteryAh:10, chargeHours:8, maxLoadKg:120, weightKg:26.3, wheelInches:12, foldable:true, bluetooth:true, minAge:16}`; RP500 → `{batteryV:24, batteryAh:4, batteryWh:96, rangeKm:15, maxSpeedKmh:15, motorW:150, maxLoadKg:65, wheelInches:6.5, weightKg:7.7}`; tabla en JSON escapado igual; "Peso = 260 kg" → weightKg null; `specsFromText(DELCAR,'descripcion')` → `{motorW:300, motorPeakW:600, batteryV:36, batteryAh:8, rangeKm:30, maxSpeedKmh:25, maxLoadKg:100}`; superbikers → `{rangeKm:20, chargeHours:6, wheelInches:8.5, weightKg:14, maxLoadKg:100, suspension:true, discBrake:true, motorW:350}` (tabla rotulada gana sobre "rodado 10" de la prosa: los pares rotulados se leen antes que la prosa); voltbike → `{rangeKm:15, batteryV:36, batteryAh:7, chargeHours:6, motorW:250, wheelInches:8.5, discBrake:true}`; covercompany → `{motorPeakW:800, rangeKm:45, wheelInches:12, ipRating:'IPX5', suspension:true}`; `specsFromTitle('Monopatín Eléctrico Luxor E9pro 25 Km/h Plegable 350w Dimm')` → `{maxSpeedKmh:25, motorW:350, foldable:true}`; `'Scooter Eléctrico Xiaomi 6 ... 800w Max Autonomía 45km Suspensión Doble'` → `{motorW:800, rangeKm:45, suspension:true}`; `'Monopatin Eléctrico Plegable K'nex 1600w'` → `motorW:1600`; mph convertido sólo con unidad explícita; `brandFromTitle('Monopatín Eléctrico Xiaomi Electric Scooter 6')` → 'Xiaomi', `'Segway Ninebot F25'` → 'Segway', `cleanBrand('Monopatin')` → null.
- [ ] **Step 2:** `npx vitest run tests/movilidad/specs_parse.test.ts` → FAIL (módulo no existe).
- [ ] **Step 3:** implementar. Texto: normalizar (NFD sin acentos, minúsculas, `,`→`.` en decimales, guiones `–—`→`-`). Primero pares rotulados `<label>[:\s]+<valor>` sobre etiquetas conocidas (autonomia, velocidad maxima, potencia (del motor)?, potencia maxima|pico, voltaje, capacidad (de la) bateria, bateria, tiempo de carga, carga maxima|peso maximo soportado|capacidad maxima de carga, peso (del monopatin)?, rodado|ruedas|tamano de las ruedas, frenos|sistema de frenos|freno trasero|freno delantero, suspension (delantera|trasera)?, plegable|sistema de plegado, bluetooth|app, ip\w\d, edad minima); después prosa sólo para campos vacíos.
- [ ] **Step 4:** test → PASS.
- [ ] **Step 5:** commit `feat(monopatines): leer la ficha técnica de un aviso (parser puro)`.

### Task 2: Enriquecer filas + esquemas + llamado en sync_movilidad

**Files:**
- Create: `classes/movilidad/specs/enrich.ts`
- Modify: `classes/models/MovilidadListing.ts`, `app/server/models/MovilidadListing.ts` (sumar `specs: { type: Schema.Types.Mixed, default: null }`, `uyuPerKm: { type: Number, default: null }`), `classes/equipar/listings.ts` (`EquiparListingRow` suma opcionales `specs?: MonopatinSpecs | null; uyuPerKm?: number | null` — no los escribe), `sync_movilidad.ts` (antes de `saveMovilidadListings`), `classes/movilidad/store.ts` (`loadFichaByListingId(ids)` desde colección cruda `movilidadspecs`)
- Test: `tests/movilidad/specs_enrich.test.ts`; `tests/appdb/schema_parity.test.ts` sigue verde sin cambios.

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `interface StoredFicha { listingId: string; ok: boolean; specs: MonopatinSpecs | null; brand: string | null; model: string | null }`
  - `enrichMovilidadRow<T extends EquiparListingRow>(row: T, ficha: StoredFicha | undefined): T` — sólo `category === 'monopatin-electrico'` (otras filas vuelven idénticas). `specs = mergeSpecs(ficha?.specs ?? EMPTY, specsFromTitle(row.title))`, `null` si no queda ningún campo; `uyuPerKm = round(priceUyu / rangeKm)` sólo si `hasFichaSpecs` y rangeKm; marca: si `row.brandKey` vacío → `cleanBrand(ficha.brand) ?? brandFromTitle(title)`, `brandKey = norm(brand)` (`norm` de `classes/equipar/classify.ts`).
  - `MOVILIDAD_SPECS_COLLECTION = 'movilidadspecs'`.
  - `loadFichaByListingId(ids: readonly string[]): Promise<Map<string, StoredFicha>>`.

- [ ] **Step 1:** tests: fila de bicicleta sin cambios; fila ML sin ficha con título "…25 Km/h…350w" → specs con from titulo y `uyuPerKm` null; con ficha rangeKm 30 y priceUyu 24000 → `uyuPerKm` 800; brand vacío + ficha brand 'Xiaomi' → 'Xiaomi'/'xiaomi'; brand vacío + ficha 'Monopatin' + título "… Segway …" → 'Segway'; brand ya presente no se pisa.
- [ ] **Step 2:** FAIL. **Step 3:** implementar + esquemas + en `sync_movilidad.ts`: `const fichas = await loadFichaByListingId(built.rows.filter(r => r.category === 'monopatin-electrico').map(r => r.listingId))` (try propio: si falla, filas sin enriquecer — y en ese caso NO incluir `specs`/`uyuPerKm`/`brand` en el `$set`, para no borrar lo que el job de fichas escribió: si `loadFichaByListingId` falla, se pasan las filas tal cual vinieron).
- [ ] **Step 4:** `npx vitest run tests/movilidad tests/appdb` → PASS. **Step 5:** commit.

### Task 3: Job de fichas + snapshot del asesor

**Files:**
- Create: `classes/movilidad/specs/read.ts`, `classes/movilidad/specs/queue.ts`, `classes/movilidad/specs/snapshot.ts`, `classes/models/MovilidadSpecSnapshot.ts`, `app/server/models/MovilidadSpecSnapshot.ts`, `sync_movilidad_specs.ts`
- Modify: `ecosystem.config.js` (app `currency-movilidad-specs`, `41 * * * *`), `scripts/deploy-backend.sh` (`OTHER_APPS` + `currency-movilidad-specs`), `tests/appdb/schema_parity.test.ts` (caso `MovilidadSpecSnapshot`, colección `movilidadspecsnapshots`)
- Test: `tests/movilidad/specs_queue.test.ts`, `tests/movilidad/specs_snapshot.test.ts`, `tests/movilidad/specs_read.test.ts` (fetch inyectado)

**Interfaces:**
- Produces:
  - `readFicha(target: { url: string; source: 'mercadolibre'|'store' }, fetcher = fetchText): Promise<{ ok: boolean; gone: boolean; specs: MonopatinSpecs|null; brand: string|null; model: string|null }>` — ML: url sin `#…`; `ok` si hay filas de tabla o descripción; `gone` si html contiene `"item_status":"closed"|"inactive"` o falta todo rastro de PDP. Tiendas: si `/products/` en la URL → `<url-sin-query>.json` y `product.body_html` (+ `product_type`, `vendor` como marca); si no, HTML → texto (quitar `script/style`, etiquetas → espacio).
  - `fichaDue(stored: StoredFichaDoc | undefined, now: Date): boolean` y `orderTargets(rows, stored, now, budget)` — tiendas primero, después ML nunca leídos, después vencidos; FB excluido; backoff `[1,3,7]` días por `failures`, `failures >= 4` nunca; `gone` 7 días; ok 45 días.
  - `interface AdvisorCandidate { id, title, url, image, priceUyu, condition, source, sellerName, brand, variant, specs }` (sólo filas con `hasFichaSpecs`, `suspect:false`, frescas ≤ 4 días)
  - `interface SpecStatsRow { variant: string; label: string; n: number; rangeKm, maxSpeedKmh, motorW, weightKg, maxLoadKg, chargeHours, batteryWh: number|null /* medianas, n≥5 por campo */ }`
  - `buildSpecSnapshot(rows, generatedAt): { key: 'monopatin-electrico'; generatedAt; candidates: AdvisorCandidate[]; stats: { byVariant: SpecStatsRow[]; all: SpecStatsRow; withFicha: number; total: number; over25: number } }`
- [ ] **Step 1:** tests de cola (orden, backoff, abandono, gone, 45 días), de snapshot (mediana con n≥5 si no null, `over25` cuenta `maxSpeedKmh > 25`, candidatos excluyen sospechosos/FB/sin ficha), de `readFicha` (ML con fixture → ok; html sin PDP → gone; Shopify json).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. `sync_movilidad_specs.ts` (exporta `main`, corre bajo `require.main === module`, como `sync_movilidad.ts`): `RENTALS`-style `number(env, def)`: `MOVILIDAD_SPECS_MAX` 90, `_GAP_MS` 2500, `_MINUTES` 8; cinco fallas de RED seguidas (sin html) cortan, `gone` no cuenta. Escribe cada ficha (ok o falla) en `movilidadspecs` con `$set` + `$inc failures` en falla (ok resetea a 0). Al final: filas frescas de monopatín → `enrichMovilidadRow` → bulk `$set {specs, uyuPerKm, brand, brandKey}`; `buildSpecSnapshot` → upsert `movilidadspecsnapshots`. Log JSON resumen. `--dry-run` no escribe.
- [ ] **Step 4:** `npx vitest run tests/movilidad tests/appdb` y `npx tsc -p tsconfig.production.json --noEmit --pretty false` → PASS / 0 errores. **Step 5:** commit.

### Task 4: Consulta, filtros, facetas y órdenes del directorio (app)

**Files:**
- Create: `app/utils/monopatinFicha.ts` (vocabulario compartido: buckets, etiquetas, formato)
- Modify: `app/utils/equiparProductos.ts`, `app/server/utils/equiparProductos.ts`, `app/server/utils/retailProductos.ts`
- Test: `app/tests/unit/monopatinFicha.test.ts`, ampliar `app/tests/unit/movilidadProductos.test.ts`

**Interfaces:**
- Produces:
  - `app/utils/monopatinFicha.ts`: `MonopatinSpecsPublic` (los campos numéricos/booleanos de Task 1 + `fromFicha: boolean`), `FICHA_VELOCIDAD = ['hasta-25','25-35','mas-35']`, `FICHA_POTENCIA = ['hasta-350','350-500','500-800','800-mas']`, `FICHA_RUEDA = ['hasta-8','9-10','mas-10']`, `FICHA_RASGOS = ['plegable','suspension','disco','app']`, `FICHA_AUTONOMIA_OPCIONES = [20,30,45,60]`, `FICHA_CARGA_OPCIONES = [100,120,150]`, `FICHA_PESO_OPCIONES = [12,15,20]`, `monopatinSpecChips(specs): string[]` ("45 km", "25 km/h", "800 W", "26,3 kg" en ese orden), `monopatinChargeCostUyu(wh): number|null`, `MONOPATIN_KWH_UYU`.
  - En `EquiparProductosQuery`: `ficha?: MovilidadFichaQuery` con `{ autonomia: number|null; velocidad: string; potencia: string; carga: number|null; peso: number|null; rueda: string; rasgos: string[]; soloFicha: boolean }`; parámetros URL `autonomia, velocidad, potencia, carga, peso, rueda, rasgos` (coma), `ficha=1`. `EquiparProductosSort` suma `'autonomia_desc' | 'precio_km' | 'peso_asc'`, aceptados sólo con vertical movilidad (equipar los normaliza a `precio_asc`). `EQUIPAR_PRODUCTOS_SORT_ITEMS` no cambia; nuevo `MOVILIDAD_SORT_ITEMS` (los 3 de siempre + "Mayor autonomía", "Menor precio por km", "Más liviano").
  - Claves de chip para ficha: `keys` admite `` `ficha.${keyof MovilidadFichaQuery}` ``; `equiparProductosWithout` las limpia; `equiparProductosFiltered` cuenta ficha; chips con etiqueta ("30 km o más", "Hasta 25 km/h", "Soporta 120 kg", "Hasta 15 kg", "Plegable", "Sólo con ficha técnica").
  - Server: `equiparProductosMatch` suma la ficha (`specs.rangeKm $gte`, `specs.maxSpeedKmh` por bucket, `specs.motorW`, `specs.maxLoadKg $gte`, `specs.weightKg $lte`, `specs.wheelInches`, rasgos `specs.foldable/suspension/discBrake/bluetooth: true`, `soloFicha` → `specs.fromFicha: true`); `ignore` acepta las claves `ficha.*`. Sort: `autonomia_desc` → `{'specs.rangeKm': -1, priceUyu: 1, listingId: 1}` con match extra `specs.rangeKm: {$ne:null}`... (no: orden con nulos al final — usar `$exists` en el sort no se puede; el match NO cambia y Mongo ordena null primero en desc… va al final en desc: correcto); `precio_km` → `{uyuPerKm: 1}` con `uyuPerKm: {$type:'number'}` agregado al match; `peso_asc` → `{'specs.weightKg': 1}` con `specs.weightKg: {$type:'number'}`. Proyección suma `specs: 1`; `equiparProductoPublic` copia `specs` saneado (sólo campos conocidos, `fromFicha` = algún `from` ficha/descripcion) o lo omite.
  - `EquiparProductosFacets.ficha?: { autonomia, velocidad, potencia, carga, peso, rueda, rasgos: EquiparProductosFacet[]; conFicha: number }` — calculadas en `retailProductosResponse` sólo con `vertical === 'movilidad'` y `categoria === 'monopatin-electrico'`, cada dimensión con el match SIN su propio filtro, en un solo `$facet` por dimensión (`$group` con `$switch` a bucket; los umbrales "al menos" cuentan `$gte`).
- [ ] **Step 1:** tests: normalize equipar intacto (`ficha` ausente); movilidad parsea `?autonomia=30&velocidad=hasta-25&rasgos=plegable,disco&orden=precio_km`; valor inválido descartado; params ida y vuelta; chips y `without(['ficha.autonomia'])`; match produce `{'specs.rangeKm': {$gte:30}, 'specs.maxSpeedKmh': {$lte:25}, 'specs.foldable': true, 'specs.discBrake': true}`; `precio_km` agrega `uyuPerKm: {$type:'number'}`; `equiparProductoPublic` con `specs` desconocidos limpia; `monopatinSpecChips`; `monopatinChargeCostUyu(360)` = `round(360/1000/0.85*MONOPATIN_KWH_UYU)`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** `cd app && npx vitest run tests/unit/equiparProductos tests/unit/movilidadProductos tests/unit/monopatinFicha tests/unit/equiparProductosApi` → PASS. **Step 5:** commit.

### Task 5: Asesor (lógica pura) + endpoint

**Files:**
- Create: `app/utils/monopatinAsesor.ts`, `app/server/api/movilidad/monopatin-asesor.get.ts`
- Test: `app/tests/unit/monopatinAsesor.test.ts`

**Interfaces:**
- Consumes: `AdvisorCandidate` (forma de Task 3, espejada como `MonopatinCandidato` en `monopatinAsesor.ts`).
- Produces:
  - `interface AsesorInput { kmDia: number; pesoKg: number; presupuesto: number|null; terreno: 'llano'|'algunas'|'muchas'; lo_carga: boolean; usados: boolean }`, `ASESOR_DEFAULT = { kmDia: 10, pesoKg: 75, presupuesto: null, terreno: 'algunas', lo_carga: false, usados: false }`
  - `asesorRequisitos(input): { autonomiaDeclaradaMin: number; cargaMin: number; potenciaMin: number|null; pesoMax: number|null }` — `autonomiaDeclaradaMin = ceil(kmDia / factor)` con factor 0.65 (0.55 si pesoKg > 90); `cargaMin = pesoKg + 10`; potencia 350/500/null; `pesoMax = lo_carga ? 15 : null` (blando: sólo para la elección "liviana").
  - `recomendarMonopatines(candidatos, input): { cumplen: MonopatinCandidato[]; picks: Array<{ kind: 'barato'|'autonomia'|'liviano'|'subidas'; titulo: string; candidato; porque: string[] }>; descartes: { autonomia: number; carga: number; potencia: number; presupuesto: number; sinDato: number }; requisitos }` — duros: rangeKm ≥ mín, maxLoadKg ≥ cargaMin (o null → `sinDato`, fuera), motorW ≥ potenciaMin, priceUyu ≤ presupuesto, condición nueva salvo `usados`. Picks distintos entre sí: `barato` = menor precio; `autonomia` = menor `priceUyu/rangeKm`; `liviano` (si `lo_carga` o no hay subidas) = menor weightKg; si no, `subidas` = mayor motorW. `porque`: "Autonomía real estimada N km para tus M km", "Soporta X kg (vos + 10 kg)", "Pesa N kg", "Declara más de 25 km/h: en Montevideo y San José se circula hasta 25 km/h".
  - `asesorQueryFicha(requisitos, presupuesto): MovilidadFichaQuery + precioMax` para el botón "Ver los N en el directorio".
  - Endpoint: lee `MovilidadSpecSnapshotModel.findOne({key:'monopatin-electrico'})`, `cache-control public, max-age=300`, 503 sin snapshot.
- [ ] **Step 1:** tests: requisitos (10 km/75 kg → 16 km declarados, 85 kg carga; 100 kg → factor 0.55); candidato sin maxLoadKg → `sinDato`; picks distintos y con `porque`; presupuesto excluye; cero cumplen → `cumplen: []` y `descartes` con conteos; aviso usado fuera salvo `usados`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** commit.

### Task 6: UI — filtros, tarjeta, asesor y secciones de la página

**Files:**
- Create: `app/components/movilidad/MovilidadMonopatinAsesor.vue`, `app/components/movilidad/MovilidadSpecStrip.vue`
- Modify: `app/components/equipar/ProductosFilters.vue` (grupo "Ficha técnica" con `v-if="vertical === 'movilidad' && facets.ficha"`), `app/components/equipar/ListingCard.vue` (`<MovilidadSpecStrip v-if="producto.specs" …>`), `app/components/equipar/Directorio.vue` (items de orden = `MOVILIDAD_SORT_ITEMS` si movilidad), `app/server/api/movilidad/[categoria].get.ts` (`specStats` + `product.specs` para monopatín), `app/utils/movilidad.ts` (tipos de respuesta), `app/pages/monopatines-electricos-uruguay.vue`
- Test: `app/tests/unit/movilidadPages.test.ts` (ampliar: la página contiene las secciones nuevas e ids), `app/tests/unit/movilidadApi.test.ts` (specStats/product specs)

**Interfaces:**
- Consumes: Tasks 4–5.
- Página: orden de secciones = header → por tipo → **asesor** (`id="asesor-title"`) → modelos (columnas Autonomía/Velocidad/Potencia) → CTA → más baratos → directorio → **qué esperar de cada tipo** (`id="tipos-title"`, tabla con medianas y "Una carga cuesta ≈ $ N") → normativa → **cómo elegir** reescrito (autonomía real, potencia y subidas, peso soportado, peso del aparato, tiempo de carga y costo, frenos/suspensión/IP, velocidad y normativa) → si se rompe → FAQ (+ "¿Cuánta autonomía…?", "¿Cuánto tarda en cargarse…?", "¿Cuánto cuesta cargar…?", "¿Qué monopatín para una persona de 100 kg?" con cifras de `specStats`) → relacionadas → método (suma la ficha). JSON-LD Product suma `additionalProperty` con `PropertyValue` (Autonomía km, Velocidad máxima km/h, Potencia W, Peso kg, Peso máximo soportado kg).
- [ ] **Step 1:** tests de página/API. **Step 2:** FAIL. **Step 3:** implementar; el asesor pide `/api/movilidad/monopatin-asesor` con `useFetch(..., { server: false, lazy: true })`, sliders `VSlider` (km 2–40, peso 40–140), `VBtnToggle` terreno, `VSwitch` carga/usados, `VTextField` presupuesto; botón "Ver los N en el directorio" → `dirUpdate({...dirQuery, ficha, precioMax, page:1})` y scroll a `#movilidad-resultados`. **Step 4:** `cd app && npx vitest run tests/unit/movilidad* tests/unit/equipar* tests/unit/monopatin*` y `npm run lint` → verde. **Step 5:** commit.

### Task 7: Documentación, experimento, verificación y entrega

**Files:**
- Modify: `docs/app/MOVILIDAD.md` (sección "Ficha técnica, filtros y asesor"), `AGENTS.md` (fila `currency-movilidad-specs` + entrypoint en la lista), `docs/seo/experiments.json` (fila `monopatines-ficha-tecnica-y-asesor`, `shippedOn` = día del merge, ruta `/monopatines-electricos-uruguay`)
- [ ] **Step 1:** `npm test` (raíz) y `cd app && npm test` → verde; `npm run build` raíz → 0 errores.
- [ ] **Step 2:** dry-run del job contra 5 fichas reales locales (`MOVILIDAD_SPECS_MAX=5 npx ts-node sync_movilidad_specs.ts --dry-run`) — sin APP DB local sale sin targets; si es así, probar `readFicha` con un script one-off sobre 5 URLs reales del API de producción y anotar cobertura medida.
- [ ] **Step 3:** levantar el app en dev con proxy a la API de prod y mirar la página (asesor, filtros, tarjeta) en 1280 y 390 px.
- [ ] **Step 4:** revisión de rama completa (un revisor fresco), arreglos.
- [ ] **Step 5:** PR contra `main` (auto-merge), seguir el deploy, después de la primera corrida del job medir en producción: cobertura de ficha, facetas, HTML de la página.
