# C — Celulares en Uruguay (`/celulares-uruguay`): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** precio de cada modelo de celular en las tiendas uruguayas y MercadoLibre, con su historia, y la cuenta de "¿conviene traerlo de EE.UU.?" con las reglas de aduana que el sitio ya tiene.

**Architecture:** una `CategorySpec` de celulares para el cosechador compartido (`classes/retail/`), un identificador de modelo puro (`classes/phones/identify.ts`) que exige marca + familia + almacenamiento, un catálogo por modelo con bandas por condición (`classes/phones/catalog.ts`), APP DB `phonemodels` + `phonemeta`, un job diario + horario, historial por oferta en `pricewatchoffers` (vertical `celulares`), y dos páginas SSR sólo en español que reutilizan `courierImport`, `resolveBaggageTax` y `courierParcelQuote` del app.

**Tech Stack:** TypeScript 4.9 CommonJS (raíz, vitest), Nuxt 4 + Vuetify 4 (app), MongoDB APP DB.

**Spec:** `docs/superpowers/specs/2026-09-16-directorios-de-producto-design.md` (§0.5, §1, §4). Checklist: `docs/superpowers/plans/2026-09-16-directorios-checklist.md`. Documentación del cosechador y lo aprendido en B: `docs/app/EQUIPAR.md`, `docs/app/PRICEWATCH.md`.

## Global Constraints

- Worktree `C:/Users/airau/Documents/GitHub/cu-dir-c`, rama `feat/directorios-c-celulares`. Primer comando de cada tarea: `cd "C:/Users/airau/Documents/GitHub/cu-dir-c" && git branch --show-current` → si no imprime `feat/directorios-c-celulares`, PARAR (BLOCKED).
- Nunca correr un `sync_*` que escriba (el `.env` apunta a producción). `sync_phones.ts --dry-run` no escribe (test).
- No correr `nuxi`/`nuxt dev`/`nuxt build` en `C:/Users/airau/Documents/GitHub/cambio-uruguay`.
- **Build de producción:** `npx tsc -p tsconfig.production.json --noEmit` con exactamente UN error (`sync_sheet.ts` / `sheet_key.json`, que sólo existe en el servidor). Los tests de la raíz se compilan: tipar los mocks.
- **Nada inventado:** un modelo sin almacenamiento identificado no se publica; precios de EE.UU. sólo de la tabla fechada; reglas de aduana sólo de `app/utils/importRules.ts`, `importTax.ts`, `travelerBaggageRules.ts`, `courierShipping.ts`, `aduanaFaq.ts`; sobre US$ 800 el régimen general no se calcula (se dice).
- **Nuevo y usado nunca se promedian.** Condiciones: `new`, `open-box` (caja abierta), `refurbished` (reacondicionado/outlet/CPO), `used`. Sólo `new` arma la banda principal y el "mejor precio".
- Monedas: nunca se asumen (el cosechador ya las resuelve); todas las comparaciones en UYU con la cotización del día, y cada oferta se muestra también en su moneda original.
- Copy en español ("setiembre", `dateLocale()`), texto azul chico `rgb(var(--v-theme-link))`, exports del app prefijados `phone`/`PHONE_`.
- Sin control bytes en los archivos (chequeo con `node -e` antes de commitear). Si se arma un `RegExp` desde un template string, duplicar las barras.
- Commits en español con `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`. No commitear `app/package-lock.json`.

---

### Task 1: Identificador de modelo (puro)

**Files:**
- Create: `classes/phones/types.ts`, `classes/phones/identify.ts`
- Test: `tests/phones/identify.test.ts`, `tests/phones/fixtures/titles.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PhoneBrand = "apple" | "samsung" | "motorola" | "xiaomi" | "honor" | "oppo" | "realme" | "tcl" | "zte" | "nokia" | "infinix" | "tecno";
  export type PhoneCondition = "new" | "open-box" | "refurbished" | "used";
  export interface PhoneIdentity {
    brand: PhoneBrand; brandLabel: string;           // "Apple", "Samsung", "Motorola", "Xiaomi", …
    family: string;                                  // "iphone-17-pro", "galaxy-s26-ultra", "redmi-note-15-pro-plus", "moto-g17", "edge-70-fusion"
    familyLabel: string;                             // "iPhone 17 Pro", "Galaxy S26 Ultra", "Redmi Note 15 Pro+", "Moto G17", "Edge 70 Fusion"
    storageGb: number;                               // 32 | 64 | 128 | 256 | 512 | 1024 | 2048
    ramGb: number | null;
    esimOnly: boolean;
    key: string;                                     // `${brand}-${family}-${storage}` → "apple-iphone-17-pro-256gb", "apple-iphone-17-pro-1tb"
    name: string;                                    // "Apple iPhone 17 Pro 256 GB"
  }
  export function phoneNorm(title: string): string;  // minúsculas, sin acentos, "+"→" plus ", separadores a espacio
  export function isPhoneTitle(title: string): boolean;   // marca conocida y no accesorio/clon/tablet/reloj
  export function identifyPhone(title: string, attributes?: Record<string, string>): PhoneIdentity | null;
  export function phoneConditionFromTitle(title: string, sourceCondition: "new" | "refurbished" | "used" | "unknown"): PhoneCondition;
  ```
- [ ] **Step 1: fixtures y tests que fallan.** `tests/phones/fixtures/titles.ts` exporta pares `[título, esperado]` con estos títulos REALES (MercadoLibre y tiendas, 16/9/2026) y su resultado:
  - `"Apple iPhone 17 Pro (256 GB) - Azul profundo"` → `apple-iphone-17-pro-256gb`, esimOnly false
  - `"Apple iPhone 17 Pro (512 GB) - Azul profundo - Sólo eSIM"` → `apple-iphone-17-pro-512gb`, esimOnly true
  - `"Apple iPhone 17 Pro 256gb ( Solo Esim )silver Plateado"` → `apple-iphone-17-pro-256gb`, esimOnly true
  - `"Iphone 17 Pro Max 6,9'' 5g 12gb 256gb Triple Cam 48mp"` → `apple-iphone-17-pro-max-256gb`, ramGb 12
  - `"Apple iPhone 17 Esim 256gb - Blanco Verde Musgo"` → `apple-iphone-17-256gb`, esimOnly true
  - `"Apple iPhone 16e (128 Gb) - Blanco"` → `apple-iphone-16e-128gb`
  - `"Apple iPhone 15 Plus (128 GB - 6 GB RAM) - Negro"` → `apple-iphone-15-plus-128gb`, ramGb 6
  - `"Apple iPhone 14 Pro (256 GB) - Morado oscuro (Nuevo con caja abierta)"` → `apple-iphone-14-pro-256gb` y `phoneConditionFromTitle(t, "unknown")` = `open-box`
  - `"Apple Iphone 15 128 Gb Rosa - Excelente (Reacondicionado)"` → `apple-iphone-15-128gb`, condición `refurbished`
  - `"celular-apple-iphone-12-128gb-4gb-black-cpo"` (título armado desde la URL de Zonatecno "outlet …") → `apple-iphone-12-128gb`, condición `refurbished` (por `cpo`/`outlet`)
  - `"Cel Samsung Galaxy S26 6,3'' 5g 12gb 256gb - Tecnobox"` → `samsung-galaxy-s26-256gb`
  - `"Celular Samsung Galaxy S26 Plus 5g 12 Gb 512 Gb Azul"` → `samsung-galaxy-s26-plus-512gb`
  - `"Celular Samsung Galaxy S26 Ultra 512gb Violeta 5g Nnet"` → `samsung-galaxy-s26-ultra-512gb`
  - `"samsung galaxy s26 fe 5g 128gb pistachio"` → `samsung-galaxy-s26-fe-128gb`
  - `"Celular Samsung Galaxy A17 8/256gb Dual Sim"` → `samsung-galaxy-a17-256gb`, ramGb 8
  - `"Celular Samsung Galaxy A36 5g 256gb Black"` → `samsung-galaxy-a36-256gb`
  - `"Celular Samsung Galaxy A56 5g Como Nuevo"` → `null` (sin almacenamiento) y condición `used`
  - `"Celular Moto Edge 70 Fusion 8+256gb Azul Azul"` → `motorola-edge-70-fusion-256gb`, ramGb 8
  - `"Motorola Edge 70 Pro 5g 512gb 12gb+12gb Ram + Regalo Dimm"` → `motorola-edge-70-pro-512gb`, ramGb 12
  - `"Motorola G17 4gb + 8gb Ram 256gb 4g Fhd + Regalo Dimm"` → `motorola-moto-g17-256gb`, ramGb 4 (la RAM "virtual/expandible" no cuenta)
  - `"Motorola Moto G17 Power 4g, 256 Gb, 8gb De Ram Expandible 24gb"` → `motorola-moto-g17-power-256gb`, ramGb 8
  - `"Moto G06 256 Dual SIM 256 GB verde 4 GB RAM"` → `motorola-moto-g06-256gb`
  - `"celular motorola razr 70 ultra 1tb"` → `motorola-razr-70-ultra-1tb`
  - `"Celular Xiaomi Redmi Note 15 Pro+ 5g 256gb 8gb Black"` → `xiaomi-redmi-note-15-pro-plus-256gb`
  - `"Celular Xiaomi Redmi Note 15 256gb 8gb Ram 2026 Azul"` → `xiaomi-redmi-note-15-256gb` (el "2026" no es almacenamiento ni familia)
  - `"Celular Xiaomi Poco X8 Pro Max Dual Sim 5g 12 Gb RAM 512 Gb Negro"` → `xiaomi-poco-x8-pro-max-512gb`
  - `"Celular Xiaomi Poco M8 Pro 5g 8gb Ram 256gb Rom 6.83 Amoled Dual Sim Black"` → `xiaomi-poco-m8-pro-256gb`
  - `"Celular Xiaomi Redmi 15c 4g 256gb 8gb Ram +8gb Virtual Verde Menta"` → `xiaomi-redmi-15c-256gb`, ramGb 8
  - `"Honor Magic 8 Lite 8gb Ram 256gb 108mpx 5g + Regalo Dimm"` → `honor-magic-8-lite-256gb`
  - `"Celular Honor Magic8 Lite 8gb+256gb Dual Sim Verde Bosque"` → `honor-magic-8-lite-256gb` (mismo modelo con o sin espacio)
  - `"HONOR X7e / 4G 256GB 12GB (6+6) RAM / 7500mAh"` → `honor-x7e-256gb`, ramGb 6
  - `"Honor X5c Plus 4gb + 4gb Ram 256gb 50mpx 90hz Dimm"` → `honor-x5c-plus-256gb`
  - Negativos (`isPhoneTitle` false o `identifyPhone` null): `"Celular B17 Pro Max 4gb 128gb Desbloqueo Facial Dual Sim"` (clon sin marca), `"Fuffi S26 Pro Curved-screen Smartphone 16+512gb"`, `"Celular Logic Z8l Con Tapita"`, `"Celular Vortex Zg55 3/32gb"` (marca fuera de la lista), `"Protector Prodigee Kickit iPhone 17 Pro Max"`, `"Funda iPhone 17 Pro Magsafe"`, `"Vidrio templado Samsung Galaxy A56"`, `"Cargador Samsung 25W"`, `"Galaxy Watch 8"`, `"samsung galaxy tab s10 ultra 256 gb"`, `"Galaxy Buds4 Pro"`, `"Monopatín eléctrico Xiaomi Electric Scooter 5"`, `"Aspiradora Xiaomi Mi Robot Vacuum"`, `"Notebook Samsung Galaxy Book 4 512gb"`, `"Control para iPhone Razer Kishi"`, `"Apple iPad Air 256GB"`, `"Motorola Moto Buds"`.
- [ ] **Step 2:** `npx vitest run tests/phones` → FAIL.
- [ ] **Step 3: implementación.**
  - Marca: tokens en el título normalizado — apple: `iphone`/`apple`; samsung: `samsung`/`galaxy`; motorola: `motorola`/`moto g`/`moto e`/`moto edge`/`razr`/`edge \d`; xiaomi: `xiaomi`/`redmi`/`poco`; honor; oppo; realme; tcl; zte; nokia; infinix; tecno (palabra completa). Sin marca → no es celular.
  - Excluir antes (palabra completa, plural tolerante): `funda|case|protector|vidrio|templado|film|lamina|cargador|cable|adaptador|soporte|auricular(es)?|buds|watch|reloj|smartwatch|banda|band|tablet|tab|ipad|notebook|book|monopatin|scooter|aspiradora|robot|repuesto|display|pantalla de repuesto|modulo|bateria para|carcasa|estuche|correa|airpods|router|parlante|power ?bank|kit|skin|control|joystick|lente|camara para|holder|popsocket|tv|stick`. `tab` y `book` sólo como palabra completa.
  - Almacenamiento: juntar números con `gb|tb` (incluye formas `8+256gb`, `8/256gb`, `4gb+256`, `(6+6)`); descartar los precedidos/seguidos de `ram|virtual|expand\w*|boost` y los que están en `N+N ram`; storage = el mayor valor dentro del conjunto `{32, 64, 128, 256, 512, 1024, 2048}` (1 TB = 1024, 2 TB = 2048); si no hay ninguno → `null`. RAM = el menor valor ≤ 24 que aparece asociado a `ram` o como primer término de `a+b`/`a/b`; si no, `null`.
  - Familia por marca, con reglas explícitas (en este orden): apple `iphone (\d{1,2})(e)?( plus| pro max| pro| mini| air)?` o `iphone (air|duo)`; samsung `galaxy (s|a|m|z flip|z fold)\s?(\d{1,2})( ?(ultra|plus|fe|edge))?`; motorola `(moto )?g(\d{2})( power| stylus| play)?` → `moto-gNN…`, `edge (\d{2})( fusion| pro| ultra| neo)?`, `razr (\d{2})( ultra| plus)?`, `razr fold`; xiaomi `redmi note (\d{2})( pro plus| pro)?`, `redmi (\d{2})c?`, `redmi a(\d)`, `poco ([xmcf])(\d)( pro max| pro)?`, `xiaomi (\d{2})( ultra| pro| t pro| t)?`; honor `magic ?(\d)( lite| pro)?`, `x(\d)([a-z])?( plus)?`, `(\d{3})( lite| e)?`, `play ?(\d{1,2})`. Etiqueta legible con mayúsculas propias ("Pro Max", "Plus" → "Pro+" sólo para Redmi Note, "FE", "Ultra").
  - `esimOnly`: `(solo|solamente) ?esim` o `esim` sin `dual sim`/`sim fisica`.
  - `phoneConditionFromTitle`: `caja abierta` → open-box; `reacondicionado|refurbished|outlet|cpo|como nuevo reacondicionado` → refurbished; `usado|como nuevo|segunda mano` → used; si no, la condición de la fuente (`unknown` → `new`).
  - Comentarios en inglés explicando POR QUÉ (clones sin marca, RAM virtual, "2026" en el título).
- [ ] **Step 4:** PASS. **Step 5: commit** — `feat(celulares): identificador de modelo por marca, familia y almacenamiento`.

---

### Task 2: Spec del cosechador, tiendas nuevas y corrida en seco

**Files:**
- Create: `classes/phones/spec.ts`, `scripts/oneoff/phones_dry_run.ts`
- Modify: `classes/retail/stores.ts`
- Test: `tests/phones/spec.test.ts`

**Interfaces:**
- Consumes: `isPhoneTitle`, `identifyPhone` (Task 1); `CategorySpec`, `RetailStore` (`classes/retail/types.ts`).
- Produces: `export const PHONE_SPEC: CategorySpec` (`key: "celulares"`); `export const PHONE_STORE_KEYS: readonly string[]` (tiendas que venden celulares, para que el job lea sólo esas).

- [ ] **Step 1: tests que fallan.** `PHONE_SPEC.accept` acepta los positivos de la Task 1 y rechaza los negativos; `PHONE_SPEC.urlHint` acepta `celular-apple-iphone-17-pro-256gb…`, `samsung-galaxy-s26-fe-5g-128gb-pistachio…`, `celular-motorola-razr-70-512gb…`, `celular-xiaomi-redmi-a5-64gb…`, y rechaza `monopatin-electrico-xiaomi…`, `auriculares-bluetooth-honor…`, `galaxy-z-flip-8-clear-magnet-transparent…` (este último lo rechaza el `accept`, no hace falta que lo rechace el hint; el test del hint se limita a lo que el hint promete); todas las claves de `PHONE_STORE_KEYS` existen en `RETAIL_STORES`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: implementación.**
  - `PHONE_SPEC`: `accept = (title) => isPhoneTitle(title) && identifyPhone(title) !== null` — un aviso sin almacenamiento no sirve para comparar y no se cosecha; `urlHint = /(celular|iphone|galaxy-(s|a|z|m)\d|moto-g\d|motorola|redmi|poco-[xmcf]\d|honor-(x|magic|\d{3}|play))/i`; `storeQueries` = `["celular", "iphone", "samsung galaxy", "motorola", "xiaomi redmi", "honor"]`; `mlCategories = ["MLU1055"]`, `mlCategoryQuery = "celular"`; `mlQueries` intercaladas por familia vigente: `"iphone 17 pro max"`, `"iphone 17 pro"`, `"iphone 17"`, `"iphone air"`, `"iphone 16"`, `"iphone 16e"`, `"iphone 15"`, `"samsung galaxy s26 ultra"`, `"samsung galaxy s26"`, `"samsung galaxy s26 fe"`, `"samsung galaxy a56"`, `"samsung galaxy a36"`, `"samsung galaxy a17"`, `"motorola edge 70"`, `"moto g17"`, `"moto g06"`, `"motorola razr 70"`, `"xiaomi redmi note 15"`, `"xiaomi redmi 15c"`, `"xiaomi poco x8 pro"`, `"honor magic 8 lite"`, `"honor x7e"`, `"honor x5c plus"`; `acceptFromCategory` = el mismo `accept`; `fbQueries: []` (Marketplace no identifica modelo ni almacenamiento con fiabilidad; los usados salen de ML).
  - `stores.ts` suma (con comentario de lo medido el 16/9/2026: plataforma, moneda de los productos vistos, cantidad de URLs de celular en el sitemap):
    - `claro` Tienda Claro, `https://tienda.claro.com.uy`, fenicio, UYU (92 URLs de celular).
    - `zonatecno` Zonatecno, `https://www.zonatecno.com.uy`, fenicio, USD (387).
    - `nstore` nStore, `https://nstore.com.uy`, fenicio, USD (149; muchos accesorios Samsung).
    - `zonalaptop` Zonalaptop, `https://zonalaptop.com.uy`, fenicio, USD.
    - `market` Market, `https://www.market.com.uy`, fenicio, UYU.
    - `magiccenter` Magic Center, `https://magiccenter.com.uy`, fenicio, USD (vende también electrodomésticos: equipar lo aprovecha).
    - `digitalworld` Digital World, `https://digitalworld.com.uy`, woocommerce, USD (Store API con `currency_minor_unit: 2`).
    - `thotcomputacion` Thot Computación, `https://thotcomputacion.com.uy`, woocommerce, USD.
    - `expectCurrency` es sólo respaldo: el adaptador lee la moneda real (y en Woo, la de `price_html`).
  - `PHONE_STORE_KEYS` = esas 8 + las ya registradas que venden celulares: `dimm`, `covercompany`, `tyt`.
  - `scripts/oneoff/phones_dry_run.ts` (copiar el patrón de `scripts/oneoff/equipar_dry_run.ts`, sin Mongo): `npx ts-node scripts/oneoff/phones_dry_run.ts <storeKey|ml> [--limit=N]` cosecha y para cada aviso imprime `clave | condición | moneda precio | vendedor | título`, y al final cuántos se aceptaron, cuántos quedaron sin identidad y los 20 títulos rechazados más frecuentes.
- [ ] **Step 4:** tests PASS; correr la corrida en seco sobre `zonatecno`, `claro`, `digitalworld` y `ml` (acotada a 8 búsquedas) en primer plano y pegar en el reporte los resultados; si aparecen accesorios o clones aceptados, sumarlos como negativos a la Task 1 (en este commit) y ajustar las reglas.
- [ ] **Step 5: commit** — `feat(celulares): spec del cosechador y ocho tiendas uruguayas de celulares`.

---

### Task 3: Catálogo por modelo (puro)

**Files:**
- Create: `classes/phones/catalog.ts`
- Test: `tests/phones/catalog.test.ts`

**Interfaces:**
- Consumes: `RetailListing` (`listingId, source, sellerKey, sellerName, title, url, price, currency, condition, image, attributes, officialStore, observedAt, listPrice?`), `identifyPhone`, `phoneConditionFromTitle`, `articleBand`/`priceVerdict`/`percentile` de `classes/precios/plausibility.ts` (leer sus firmas).
- Produces:
  ```ts
  export interface PhoneOffer { seller: string; sellerKey: string; source: "store" | "mercadolibre"; officialStore: boolean; title: string; url: string; price: number; currency: "UYU" | "USD"; priceUyu: number; listPrice: number | null; condition: PhoneCondition; esimOnly: boolean; observedAt: string }
  export interface PhoneBand { min: number; p25: number; median: number; p75: number; n: number; sellers: number }
  export interface PhoneModel {
    key: string; slug: string; brand: PhoneBrand; brandLabel: string; family: string; familyLabel: string;
    storageGb: number; name: string; image: string | null;
    bands: Partial<Record<PhoneCondition, PhoneBand>>;   // una banda por condición, nunca mezcladas
    offers: PhoneOffer[];                                 // la más barata por vendedor y condición; nuevas primero; máx 30
    newSellers: number;                                   // vendedores distintos con oferta nueva no sospechosa
    esimOnlySeen: boolean; suspectDropped: number; observedAt: string;
  }
  export function buildPhoneCatalog(input: { listings: readonly RetailListing[]; usdUyu: number }): PhoneModel[];
  export const PHONE_MIN_BAND_SAMPLE = 3;
  ```
- [ ] **Step 1: tests que fallan.**
  - Dos avisos del mismo modelo con títulos distintos (`"Apple iPhone 17 Pro (256 GB) - Azul profundo"` y `"Iphone 17 Pro 256gb Orange Garantía Oficial"`) → un modelo `apple-iphone-17-pro-256gb` con 2 ofertas.
  - El mismo modelo con 256 y 512 GB → dos modelos distintos.
  - USD y UYU: `priceUyu` convierte con `usdUyu`; la banda se calcula en UYU.
  - Una oferta `open-box` y una `refurbished` nunca entran en `bands.new`; cada una tiene su banda sólo si llega a `PHONE_MIN_BAND_SAMPLE`.
  - Screening por modelo y condición: con 6 ofertas nuevas entre 55.000 y 62.000 y una de 5.500 (un repuesto mal titulado que pasó), la de 5.500 no aparece en `offers` ni en la banda y cuenta en `suspectDropped` o se descarta según `priceVerdict`.
  - Dedupe: el mismo vendedor con dos avisos nuevos del mismo modelo deja sólo el más barato; el mismo vendedor con uno nuevo y uno reacondicionado deja los dos.
  - `newSellers` cuenta vendedores distintos (normalizados) sólo en ofertas nuevas que pasaron el screening.
  - `offers` ordenadas: nuevas por precio, luego caja abierta, reacondicionado, usado.
  - `image`: de una oferta de tienda o ML de precio mediano; nunca de una oferta sospechosa.
  - Un aviso cuyo título no identifica almacenamiento no crea modelo.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. `slug = key`. Comentarios en inglés (por qué la condición parte las bandas, por qué el storage es parte de la identidad).
- [ ] **Step 4:** PASS. **Step 5: commit** — `feat(celulares): catálogo por modelo con bandas por condición`.

---

### Task 4: Modelos, guardado, historial y job

**Files:**
- Create: `classes/models/PhoneModel.ts`, `classes/models/PhoneMeta.ts`, `app/server/models/PhoneModel.ts`, `app/server/models/PhoneMeta.ts`, `classes/phones/store.ts`, `sync_phones.ts`
- Modify: `classes/pricewatch/record.ts` (opción `productKeyFor`), `tests/appdb/schema_parity.test.ts`, `ecosystem.config.js`, `scripts/deploy-backend.sh` (`OTHER_APPS`)
- Test: `tests/phones/store.test.ts`, `tests/phones/dry_run.test.ts`, `tests/pricewatch/record.test.ts`

**Interfaces:**
- Produces:
  - Colección `phonemodels`: todos los campos de `PhoneModel` + `history: [{ date, newMin, newMedian, sellers }]` (365 puntos) + `firstSeen`, `lastSeen`; índice único `key`, índice `{ brand: 1, lastSeen: -1 }`.
  - Colección `phonemeta` (un documento, `key: "celulares-uruguay"`): `generatedAt`, `usdUyu`, `models`, `listings`, `runs` (mismo formato que equipar).
  - `recordPricewatch(listings, vertical, today?, options?: { productKeyFor?: (listing) => string | null })` — sin la opción, igual que hoy.
- [ ] **Step 1: tests que fallan.** `withPhoneHistory` (puro, en `store.ts`): reemplaza el punto de hoy, agrega uno nuevo, recorta a 365, hereda `firstSeen`; `sync_phones.ts --dry-run` no escribe (misma técnica que `tests/stores/dry_run.test.ts`: el guardado detrás de `if (!dryRun)`); `recordPricewatch` con `productKeyFor` usa la clave devuelta; paridad de esquema de los dos modelos + nombres de colección.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: implementación.**
  - Modelos backend con `appModel` y espejo del app (campos a 4 espacios, `{ timestamps: true }`; estilo del app, lint limpio).
  - `store.ts`: `loadPreviousPhones()`, `countStoredPhones()`, `withPhoneHistory(models, previous, today)`, `savePhoneCatalog(models, meta)` (upsert por `key`, nunca borra).
  - `sync_phones.ts` (patrón de `sync_equipar.ts`): `--fast` y `--dry-run`; `harvestRetail({ stores: retailStores(PHONE_STORE_KEYS), specs: [PHONE_SPEC], fast, maxMlScans: fast ? 8 : 40, maxFbQueries: 0, maxStoreQueries: fast ? 6 : 12 })`; `applyUnitGuard`; `buildPhoneCatalog`; corrida flaca: si hay modelos guardados y los modelos con banda nueva caen por debajo del 40 % de los guardados → no escribe, sale 1; guarda; `recordPricewatch(guarded.listings, "celulares", undefined, { productKeyFor: (l) => { const id = identifyPhone(l.title, l.attributes); return id ? \`phone:${id.key}\` : null } })` en su propio try/catch; log por fuente y total.
  - `ecosystem.config.js`: `currency-phones` (`dist/sync_phones.js`, `cron_restart: "29 14 * * *"`, comentario: 11:29 en Montevideo, lejos de sillas 11:41 y equipar 12:47 que pegan a los mismos hosts) y `currency-phones-hourly` (`args: "--fast"`, `cron_restart: "37 * * * *"` — lejos de autos :29, alquileres :47 y equipar :53: el puente de ML (:9656) contesta 429 a las ráfagas y entonces pasa 10 min por el proxy residencial para TODOS los jobs (docs/app/AUTOS.md en feat/autos-usados), por eso la horaria busca 8 y no 16), ambos `autorestart: false`, fork, `log_date_format`. Ambos en `OTHER_APPS`.
- [ ] **Step 4:** `npx vitest run tests/phones tests/pricewatch tests/appdb tests/sync`; tsc de producción con UN error; `cd app && npx eslint server/models/PhoneModel.ts server/models/PhoneMeta.ts`; corrida en seco `npx ts-node sync_phones.ts --dry-run` acotada a 8 minutos en primer plano, pegar el log (modelos con banda, vendedores, fuentes).
- [ ] **Step 5: commit** — `feat(celulares): modelos, historial y job currency-phones`.

---

### Task 5: Precios de EE.UU. y cuenta de "traerlo" (app, puro)

**Files:**
- Create: `app/utils/phoneUsPrices.ts`, `app/utils/phoneImport.ts`
- Test: `app/tests/unit/phoneImport.test.ts`

**Interfaces:**
- Consumes: `courierImport` (`app/utils/importTax.ts`), `resolveBaggageTax` (`app/utils/travelerBaggageRules.ts`), `ESTIMATOR_COURIERS`, `courierParcelQuote` (`app/utils/courierShipping.ts`), `DEFAULT_REGIME_RULES` (`app/utils/importRules.ts`); el costo del certificado URSEC tal como lo publica `app/utils/aduanaFaq.ts` (id `celular-router-drone`: "$239, y $852 si además el equipo requiere homologación", en pesos).
- Produces:
  ```ts
  export const PHONE_US_PRICES_VERIFIED_AT = '2026-09-16'
  export const PHONE_US_PRICES_SOURCE = 'https://www.apple.com/shop/buy-iphone'
  export const PHONE_US_PRICES: Readonly<Record<string, number>>   // clave de modelo → USD sin impuestos
  export const PHONE_US_SALES_TAX = [
    { key: 'miami-dade', label: 'Florida, Miami-Dade (7 %)', pct: 7, source: 'https://floridarevenue.com/taxes/taxesfees/Pages/discretionary.aspx' },
    { key: 'sin-impuesto', label: 'Estado sin impuesto de venta (0 %)', pct: 0, source: null },
  ] as const
  export interface PhoneImportEstimate {
    usPriceUsd: number; salesTaxUsd: number; invoiceUsd: number;
    traveler: { franchiseUsd: number; taxUsd: number; totalUsd: number; totalUyu: number };
    courier: { regime: 'franquicia' | 'simplificado' | 'general'; taxUsd: number | null; freightUsd: number | null; courierName: string | null; totalUsd: number | null; totalUyu: number | null; reasons: string[] };
    ursecUyu: number;                 // 239 (pesos, trámite VUCE)
    localBestUyu: number | null; savingTravelerUyu: number | null; savingCourierUyu: number | null;
  }
  export function phoneImportEstimate(input: { usPriceUsd: number; salesTaxPct: number; usdUyu: number; localBestUyu: number | null; weightKg?: number; today?: Date }): PhoneImportEstimate
  ```
- [ ] **Step 1: tests que fallan.**
  - `PHONE_US_PRICES` tiene exactamente (lista de apple.com leída el 16/9/2026 a las 20:30 UTC, precio de lista sin impuestos): `apple-iphone-18-pro-256gb: 1199`, `-512gb: 1399`, `-1tb: 1799`, `-2tb: 2399`; `apple-iphone-18-pro-max-256gb: 1299`, `-512gb: 1499`, `-1tb: 1899`, `-2tb: 2499`; `apple-iphone-air-256gb: 1099`, `-512gb: 1299`, `-1tb: 1699`; `apple-iphone-17-256gb: 899`, `-512gb: 1099`; `apple-iphone-17e-256gb: 699`, `-512gb: 899`; `apple-iphone-16-128gb: 799`.
  - iPhone 17e 256 GB (US$ 699, 7 %): factura US$ 747,93 → courier `franquicia` con IVA 22 % sobre la factura (supera los US$ 200 de EE.UU.) → `taxUsd` 164,54; viajero: excedente 247,93 × 50 % = 123,97.
  - iPhone 17 256 GB (US$ 899, 7 %): factura US$ 961,93 → courier `general`: `taxUsd`, `totalUsd` y `totalUyu` son `null` y `reasons` contiene el texto del régimen general; viajero: excedente 461,93 × 50 % = 230,97.
  - Con 0 %: iPhone 17 256 GB factura 899 → sigue en `general`.
  - `ursecUyu` = 239 siempre en el camino courier (y el test lee el valor desde el mismo texto de `aduanaFaq.ts` con una regex, para que no se desincronice).
  - `freightUsd` = el `totalUsd` más barato de `courierParcelQuote` entre `ESTIMATOR_COURIERS` para 0,5 kg, con su nombre; `null` si ninguno cotiza.
  - Ahorros: `localBestUyu - totalUyu` (positivo = conviene traerlo); `null` si falta alguno.
- [ ] **Step 2:** FAIL. **Step 3:** implementar sin copiar reglas: todo sale de las funciones existentes. Comentario con las fuentes y que la tabla se re-verifica el día que cambie Apple.
- [ ] **Step 4:** PASS + lint. **Step 5: commit** — `feat(celulares): cuenta de traer el celular de EE.UU. con las reglas del sitio`.

---

### Task 6: API

**Files:**
- Create: `app/server/api/phones/index.get.ts`, `app/server/api/phones/[modelo].get.ts`, `app/utils/phones.ts`
- Test: `app/tests/unit/phonesApi.test.ts` (rutas, patrón de `app/tests/unit/propertyNearbyApi.test.ts`), `app/tests/unit/phones.test.ts`

**Interfaces:**
- `app/utils/phones.ts`: tipos espejo (`PhoneModelDoc`, `PhoneOfferDoc`, `PhoneBandDoc`, `PhoneHubCard`), `PHONE_STALE_DAYS = 4`, `PHONE_SLUG_RE = /^[a-z0-9][a-z0-9-]{3,80}$/`, `phoneHubCards(models)` (una tarjeta por modelo: slug, name, brandLabel, familyLabel, storageGb, image, mejor nueva en UYU y su moneda original, `newSellers`, `lastSeen`), `phoneModelProjection(doc)` (ofertas ≤ 30, historia ≤ 180 puntos), `phoneMoney(uyu)`, `phoneUsd(n)`.
- `GET /api/phones` → `{ generatedAt, usdUyu, brands: Array<{ brand, brandLabel, models: PhoneHubCard[] }> }` sólo con modelos con banda nueva y `lastSeen` en los últimos 4 días, ordenados por marca (Apple, Samsung, Motorola, Xiaomi, Honor, resto) y dentro por familia y almacenamiento; cache 900 s; error de base → forma vacía.
- `GET /api/phones/<modelo>` → `{ generatedAt, usdUyu, model: PhoneModelDoc, stale: boolean, siblings: PhoneHubCard[] }` (hermanos: misma familia con otro almacenamiento y otras familias de la marca, máx 8); slug que no cumple la forma → 404 sin tocar la base; sin documento → 404; `stale` = `lastSeen` fuera de 4 días.
- [ ] Steps TDD como en las tareas anteriores (404 sin base; vacío ante error; recortes de la proyección; orden del hub). Lint limpio. **Commit** — `feat(celulares): API del directorio y de cada modelo`.

---

### Task 7: Páginas, navegación, sitemap y contrato SEO

**Files:**
- Create: `app/pages/celulares-uruguay/index.vue`, `app/pages/celulares-uruguay/[modelo].vue`
- Modify: `app/utils/siteNav.ts` (`NAV_SECTIONS` en la sección de consumo, `DYNAMIC_ROUTE_KEYS['celulares-uruguay/[modelo]']`), `app/i18n/locales/json/{es,en,pt}.json` (`nav.celulares`: "Precios de celulares" / "Phone prices in Uruguay" / "Preços de celulares no Uruguai"), `app/server/api/__sitemap__/urls.get.ts`, `app/tests/unit/seoContract.test.ts`
- Test: `app/tests/unit/phonePages.test.ts`

- [ ] **Step 1: test que falla** (texto de archivos): `[modelo].vue` con `definePageMeta` + `validate` que chequea la forma del slug y confirma con `$fetch('/api/phones/<slug>')` (patrón de `pages/descuentos-con-tarjeta-uruguay/marca/[marca].vue`); `useFetch` con clave que incluye el slug y `transform`; un `<h1`; `useSeoMeta(` con `title`, `description`, `ogTitle:`, `ogDescription:`; canonical `https://cambio-uruguay.com/celulares-uruguay/`; `BreadcrumbList`; `Product` con `AggregateOffer` (`lowPrice`, `highPrice`, `offerCount`, `priceCurrency: 'UYU'`) sólo con ofertas nuevas; sin `AggregateRating`; `<FaqSection`; `<ChartsLineChart`; raíz `<VContainer`. `index.vue` con un `<h1` y enlaces `localePath(\`/celulares-uruguay/${`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: hub** — H1 "Precio de celulares en Uruguay: iPhone, Samsung, Motorola y Xiaomi"; fecha de actualización; filtros por marca (chips) y por rango; tarjetas por modelo (foto, nombre, "desde $ X nuevo en N tiendas"); sección **"¿Conviene traer el celular de Estados Unidos?"** (explicación con los dos caminos: viajero —US$ 500 por aire, 50 % del excedente, uso personal es zona gris, enlace a `/franquicia-viajero-uruguay`— y courier —franquicia de US$ 800 anuales en 3 envíos con IVA 22 % sobre compras de EE.UU. de más de US$ 200, régimen general arriba de US$ 800, certificado URSEC de $ 239 por VUCE, enlaces a `/franquicia-aduana-uruguay` y `/herramientas/calculadora-impuestos-importacion`— y una tabla con los iPhone de `PHONE_US_PRICES` que tengan modelo local con banda: precio en EE.UU. con 7 %, costo traído por cada camino y mejor precio local, con la fecha de la tabla y su fuente); qué mirar al comprar (garantía oficial vs importado, eSIM, liberado, caja abierta y reacondicionado); FAQ. JSON-LD: `BreadcrumbList` + `ItemList` de fichas.
- [ ] **Step 4: ficha** — H1 `${name}: precio en Uruguay`; resumen ("N tiendas lo venden nuevo; el más barato está en $ X (US$ Y) en <vendedor>, visto el <fecha>"); tabla de ofertas por condición (vendedor, condición, precio en su moneda y en pesos, eSIM si corresponde, fecha, enlace externo `rel="nofollow noopener"` `target="_blank"`, precio tachado sólo si existe); aviso si `stale`; bandas por condición; gráfico de `history` (mínimo y mediana nuevos) con ≥ 3 puntos, dentro de `<ClientOnly>`; bloque **"Traerlo de Estados Unidos"** con `phoneImportEstimate` cuando el modelo está en `PHONE_US_PRICES` (selector de impuesto de venta), y si no está, un campo para que la persona escriba el precio en EE.UU. (sin valor por defecto); aviso de eSIM cuando `esimOnlySeen` (texto: "Algunas ofertas son de equipos sólo eSIM: confirmá que tu compañía lo soporte antes de comprar"; nada más, sin afirmar qué versiones de EE.UU. son sólo eSIM); garantía; FAQ generada con datos (cuánto sale, dónde está más barato con su variante y fecha, conviene traerlo, caja abierta vs reacondicionado); otros almacenamientos y modelos de la marca. Sólo español: canonical sin prefijo.
- [ ] **Step 5: sitemap** — modelos con `lastSeen` en 4 días y `newSellers >= 2` → `urls.push({ loc: \`/celulares-uruguay/${slug}\`, … })` dentro del bloque con `finally { await disconnectDbAfterPrerender() }`; literal `` `/celulares-uruguay/${slug}` `` presente. `PROGRAMMATIC_PAGES` suma las dos entradas.
- [ ] **Step 6: verificar** — `cd app && npx vitest run tests/unit/phonePages.test.ts tests/unit/seoContract.test.ts tests/unit/siteNav-coverage.test.ts tests/unit/sitemap-urls.test.ts tests/unit/componentResolution.test.ts tests/unit/internalLinks.test.ts`, `npm test`, `npm run lint`; dev en este worktree (`npx nuxi prepare && npx nuxt dev --port 3219`), `curl --max-time 180`: hub 200, `/celulares-uruguay/apple-iphone-17-pro-256gb` 200 o 404 según datos locales (si 404 por base vacía, insertar un documento de muestra en la Mongo LOCAL del `app/.env` y borrarlo al final, diciendo en el reporte qué se insertó), `/celulares-uruguay/no-existe-123` 404; `wc -c`; apagar el dev.
- [ ] **Step 7: commit** — `feat(celulares): directorio y ficha por modelo con la cuenta de traerlo`.

---

### Task 8: Documentación y verificación final

**Files:**
- Create: `docs/app/CELULARES.md` (identidad del modelo, condiciones, tiendas y monedas medidas, por qué Marketplace no entra, reglas de aduana reutilizadas, tabla de EE.UU. fechada, qué no se publica)
- Modify: `AGENTS.md` (filas `currency-phones` y `currency-phones-hourly`, `sync_phones.ts` en la lista, `phones` en carpetas de `classes/`), `docs/app/PRICEWATCH.md` (vertical `celulares` y `productKeyFor`)
- [ ] Raíz `npm test` + tsc de producción (UN error); app `npm test` + `npm run lint`; control bytes. **Commit** — `docs(celulares): directorio de celulares y job currency-phones`.
