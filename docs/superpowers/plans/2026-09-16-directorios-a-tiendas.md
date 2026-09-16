# A — Tiendas online de Uruguay (`/tiendas-online-uruguay`): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** una ficha por tienda online (uruguaya o extranjera usada desde Uruguay) con señales verificables y fechadas —sitio, antigüedad, Trustpilot, Google, Reddit, presencia en los catálogos propios, descuentos con tarjeta— y un índice filtrable; nunca un veredicto propio.

**Architecture:** registro curado en `classes/stores/registry.ts` (espejo liviano en `app/utils/storeDirectory.ts` con test de paridad); un job semanal `sync_store_profiles.ts` junta señales con fetchers de funciones puras + envoltorios de red y escribe APP DB `storeprofiles` conservando la última señal buena; el app sirve `/api/stores` y `/api/stores/<tienda>` y dos páginas SSR sólo en español.

**Tech Stack:** TypeScript 4.9 CommonJS (raíz, vitest), Nuxt 4 + Vuetify 4 (app), MongoDB APP DB, servicios del VPS (Trustpilot `:3029`, Google Maps `:2221`), crt.sh, Wayback CDX, Arctic Shift, Gemini (`classes/gemini.ts` `askJSON`).

**Spec:** `docs/superpowers/specs/2026-09-16-directorios-de-producto-design.md` (§0, §1.3, §2). Referencia obligatoria: `docs/superpowers/plans/2026-09-16-directorios-checklist.md`.

## Global Constraints

- Trabajar SÓLO en `C:/Users/airau/Documents/GitHub/cu-dir-a` (rama `feat/directorios-a-tiendas`). Primer comando de cada tarea: `cd "C:/Users/airau/Documents/GitHub/cu-dir-a" && git branch --show-current` → si no imprime `feat/directorios-a-tiendas`, PARAR y reportar BLOCKED.
- **Nunca** correr un `sync_*` que escriba: el `.env` apunta a la Mongo de producción. `sync_store_profiles.ts --dry-run` no escribe (lo exige un test).
- No correr `nuxi`/`nuxt dev`/`nuxt build` en `C:/Users/airau/Documents/GitHub/cambio-uruguay`. En `cu-dir-a` sí.
- **Sin veredictos:** ni "confiable"/"no confiable" como afirmación propia, ni puntaje propio, ni ranking de confianza, ni la palabra "estafa" aplicada a una tienda. Sin `AggregateRating` en JSON-LD. Cada dato con fuente y fecha.
- **Reddit sin personas:** nunca autores, nunca citas textuales de comentarios; sólo conteos, títulos de hilos y enlaces.
- Los servicios del VPS se leen de variables de entorno con default: `STORES_TRUSTPILOT_URL` (default `http://127.0.0.1:3029`), `STORES_GMAPS_URL` (default `http://127.0.0.1:2221`). El job corre EN el VPS.
- Copy en español ("setiembre"; fechas con `dateLocale()` en el app); texto azul chico `rgb(var(--v-theme-link))`.
- Exports de `app/utils/*.ts` prefijados con `store`.
- Commits en español estilo del repo, con `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Registro de tiendas y espejo del app

**Files:**
- Create: `classes/stores/types.ts`, `classes/stores/registry.ts`, `classes/stores/match.ts`
- Create: `app/utils/storeDirectory.ts`
- Test: `tests/stores/registry.test.ts`, `tests/stores/mirror_parity.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type StoreKind = "tienda-uy" | "marketplace" | "compra-exterior";
  export type StoreRubro = "electrodomesticos" | "muebles" | "colchones" | "tecnologia" | "celulares" | "hogar"
    | "supermercado" | "ferreteria" | "bicicletas" | "motos" | "deportes" | "farmacia" | "moda" | "general";
  export interface StoreEntry {
    key: string; name: string; domain: string | null; kind: StoreKind; rubros: StoreRubro[];
    aliases: string[];            // cómo aparece como vendedor en ML/tiendas; incluye `name`
    retailStoreKey?: string;      // clave en classes/retail/stores.ts
    trustpilotDomain?: string | null; // default = domain; null = no consultar
    redditTerms: string[];        // frases exactas; [] = no consultar Reddit (nombre ambiguo)
    redditMatch?: RegExp;         // confirmación local sobre título+texto normalizados
  }
  export const STORES: readonly StoreEntry[];
  export const STORE_BY_KEY: ReadonlyMap<string, StoreEntry>;
  export function storeNorm(value: string): string;   // sin acentos, minúsculas, [^a-z0-9]+ -> " ", trim
  export function storeKeyForSeller(sellerName: string, sellerKey?: string): string | null;
  ```
  App (`app/utils/storeDirectory.ts`): `STORE_DIRECTORY: readonly { key; name; domain; kind; rubros; aliases }[]`, `storeDirectoryEntry(key)`, `isStoreDirectoryKey(key)`, `storeSlugForSeller(name)`, `STORE_RUBRO_LABELS: Record<StoreRubro, string>`, `STORE_KIND_LABELS`.

- [ ] **Step 1: tests que fallan.**
  - `tests/stores/registry.test.ts`: claves únicas, con forma `^[a-z0-9][a-z0-9-]{1,60}$`; todo `aliases` incluye `name`; ningún alias normalizado se repite entre tiendas distintas; `tienda-uy` tiene `domain`; `storeKeyForSeller("TuShopuy")` → `"tushop"`; `storeKeyForSeller("Estación hogar")` → `"estacion-hogar"`; `storeKeyForSeller("Punto Union")` → `"punto-union"`; `storeKeyForSeller("tyt", "tyt")` → `"tyt"` (vía `retailStoreKey`); `storeKeyForSeller("Mercado Libre")` → `null` (el vendedor genérico de ML NO es la tienda Mercado Libre); `storeKeyForSeller("Vendedor desconocido")` → `null`; toda tienda con `redditTerms.length > 0` y nombre de una sola palabra común (`divino`, `claro`, `market`, `cosmos`, `fama`, `armo`, `tata`, `grassi`) tiene `redditMatch`.
  - `tests/stores/mirror_parity.test.ts`: importa `STORES` y `STORE_DIRECTORY` (`../../app/utils/storeDirectory`) y exige mismas claves, orden, `name`, `domain`, `kind`, `rubros` y `aliases`; y que `storeSlugForSeller` del app y `storeKeyForSeller` del backend coincidan para todos los alias.
- [ ] **Step 2:** `npx vitest run tests/stores` → FAIL.
- [ ] **Step 3: implementación.** `storeKeyForSeller`: índice de `storeNorm(alias)` → key, más `retailStoreKey` → key cuando `sellerKey` coincide; `storeNorm("Mercado Libre")` explícitamente fuera del índice. El espejo del app replica `storeNorm` (sin importar desde la raíz). Comentario de cabecera del registro: por qué es curado (los nombres de vendedores de ML no identifican una empresa por sí solos) y la regla de `redditTerms` vacío para nombres ambiguos.

  **Datos del registro** (verificados el 16/9/2026 con el SERP uruguayo y el relevamiento de plataformas; `tp` = `trustpilotDomain` cuando difiere del dominio; `r` = `redditTerms`; `m` = `redditMatch`):

  | key | name | domain | kind | rubros | aliases extra | retailStoreKey | reddit |
  |---|---|---|---|---|---|---|---|
  | bertoni | Bertoni | bertoni.com.uy | tienda-uy | muebles | | bertoni | r ["bertoni"] |
  | divino | Divino | divino.com.uy | tienda-uy | muebles, electrodomesticos, colchones, hogar | | divino | r ["divino"], m `/\b(en|de|tienda|local) divino\b\|divino (muebles\|tienda\|online)/` |
  | electroventas | Electroventas | electroventas.com.uy | tienda-uy | electrodomesticos, muebles | | electroventas | r ["electroventas"] |
  | la-cueva-muebles | La Cueva Muebles | lacuevamuebles.com.uy | tienda-uy | muebles, colchones | LaCuevaMuebles | lacuevamuebles | r ["la cueva muebles"] |
  | clemur | Clemur | clemur.uy | tienda-uy | muebles | | clemur | r ["clemur"] |
  | tienda-santander | Tienda Santander | tienda.soysantander.com.uy | tienda-uy | general | Soy Santander | soysantander | r [] |
  | dimm | DIMM | dimm.com.uy | tienda-uy | tecnologia, muebles, celulares | | dimm | r ["dimm"] |
  | armo | Armo | armo.uy | tienda-uy | muebles | | armo | r [] |
  | grassi | Grassi | grassi.uy | tienda-uy | muebles | | grassi | r [] |
  | cover-company | Cover Company | covercompany.com.uy | tienda-uy | tecnologia, celulares, hogar | | covercompany | r ["cover company"] |
  | american-mesh | American Mesh | americanmesh.com.uy | tienda-uy | muebles | | americanmesh | r ["american mesh"] |
  | prontometal | Prontometal | prontometal.com.uy | tienda-uy | muebles | | prontometal | r ["prontometal"] |
  | punto-union | Punto Unión | puntounion.com.uy | tienda-uy | muebles, colchones, hogar | Punto Union | puntounion | r ["punto union", "punto unión"] |
  | tyt | TYT | tyt.com.uy | tienda-uy | electrodomesticos, tecnologia, hogar | TYT IMPORTAMOS SOLUCIONES | tyt | r [] |
  | ufficio | Ufficio Equipamientos | ufficio.com.uy | tienda-uy | muebles | Ufficio | ufficio | r [] |
  | el-dorado | El Dorado | eldorado.com.uy | tienda-uy | supermercado, electrodomesticos, hogar | | eldorado | r ["el dorado"], m `/\bel dorado\b.{0,40}(super\|supermercado\|tienda\|compr)\|(super\|supermercado) el dorado/` |
  | expansion-uy | Expansión UY | expansionuy.com | tienda-uy | muebles, colchones | Expansion UY, Expansionuy | | r ["expansion uy", "expansionuy"] |
  | universo-hobby | Universo Hobby | universohobby.uy | tienda-uy | hogar, general | | | r ["universo hobby"] |
  | carolinas-home | Carolina's Home | carolinashome.uy | tienda-uy | muebles, hogar | Carolinas Home | | r ["carolinas home"] |
  | ultrashop | Ultrashop | ultrashopuy.com.uy | tienda-uy | general | ultrashopuy, UltraShopUy | | r ["ultrashop"] |
  | lg-amoblamientos | LG Amoblamientos | lgamoblamientos.com | tienda-uy | muebles | | | r ["lg amoblamientos"] |
  | tushop | Tushop | tushop.uy | tienda-uy | general, electrodomesticos | TuShopuy, TuShop | | r ["tushop"] |
  | silverled | Silverled | silverled.com.uy | tienda-uy | hogar, muebles | Uruguay Silverled | | r ["silverled"] |
  | muebles-web | Muebles Web | mueblesweb.com.uy | tienda-uy | muebles | | | r ["muebles web", "mueblesweb"] |
  | strada | Strada | strada.com.uy | tienda-uy | muebles | | | r [] |
  | boxbit | Boxbit | boxbit.com.uy | tienda-uy | muebles, tecnologia | | | r ["boxbit"] |
  | world-vigo | World Vigo | worldvigo.com | tienda-uy | muebles | Vigo | | r ["world vigo", "sillas vigo"] |
  | estacion-hogar | Estación Hogar | estacionhogar.uy | tienda-uy | electrodomesticos, hogar | Estacion Hogar | | r ["estacion hogar", "estación hogar"] |
  | fama | Fama Electrodomésticos | fama.com.uy | tienda-uy | electrodomesticos | Fama | | r ["fama electrodomesticos"] |
  | cartoons | Cartoons | cartoons.com.uy | tienda-uy | electrodomesticos, tecnologia | | | r [] |
  | cosmos | Cosmos | cosmos.uy | tienda-uy | electrodomesticos, tecnologia | COSMOS | | r [] |
  | tech-house | Tech House | techhouse.uy | tienda-uy | tecnologia | | | r ["tech house"] |
  | narvaja | Narvaja | narvaja.online | tienda-uy | hogar, colchones | | | r [] |
  | la-tentacion | La Tentación | latentacion.com.uy | tienda-uy | electrodomesticos, hogar | La Tentacion | | r ["la tentacion", "la tentación"] |
  | amv-store | AMV Store | amvstore.com.uy | tienda-uy | electrodomesticos, tecnologia, celulares | AMV | | r ["amv store", "amvstore"] |
  | sep-importaciones | SEP Importaciones | sepimportaciones.com.uy | tienda-uy | electrodomesticos | | | r ["sep importaciones"] |
  | goldsky | Goldsky | goldsky.com.uy | tienda-uy | electrodomesticos | GOLDSKY SA | | r [] |
  | el-rey-de-las-ofertas | El Rey de las Ofertas | elreydelasofertas.com.uy | tienda-uy | general | | | r ["el rey de las ofertas"] |
  | tienda-max | Tienda Max | tiendamax.uy | tienda-uy | general | | | r ["tienda max"] |
  | aiwa | Aiwa Uruguay | aiwa.com.uy | tienda-uy | electrodomesticos, tecnologia | Aiwa | | r [] |
  | magic-center | Magic Center | magiccenter.com.uy | tienda-uy | electrodomesticos, tecnologia, celulares | | | r ["magic center"] |
  | loi | LOi | loi.com.uy | tienda-uy | tecnologia, electrodomesticos, celulares | LOI | | r ["loi"], m `/\bloi\b.{0,40}(compr\|tienda\|envio\|pedido\|web)\|(en\|de\|a) loi\b/` |
  | tienda-inglesa | Tienda Inglesa | tiendainglesa.com.uy | tienda-uy | supermercado, electrodomesticos, hogar | | | r ["tienda inglesa"] |
  | sodimac | Sodimac | sodimac.com.uy | tienda-uy | ferreteria, hogar | | | r ["sodimac"] |
  | tata | Ta-Ta | tata.com.uy | tienda-uy | supermercado, electrodomesticos | TaTa, Tata | | r ["ta-ta", "tata online"], m `/\bta ?-?ta\b.{0,40}(super\|supermercado\|compr\|online\|pedido)/` |
  | geant | Géant | geant.com.uy | tienda-uy | supermercado, electrodomesticos | Geant | | r ["geant", "géant"] |
  | zonatecno | Zonatecno | zonatecno.com.uy | tienda-uy | tecnologia, celulares | Zona Tecno | | r ["zonatecno", "zona tecno"] |
  | iplace | iPlace | iplace.com.uy | tienda-uy | celulares, tecnologia | | | r ["iplace"] |
  | cellular-center | Cellular Center | cellularcenter.com.uy | tienda-uy | celulares | | | r ["cellular center"] |
  | nstore | nStore | nstore.com.uy | tienda-uy | tecnologia, celulares | | | r ["nstore"] |
  | mundo-electro | Mundo Electro | mundoelectro.com.uy | tienda-uy | electrodomesticos | Mundoelectro | | r ["mundo electro", "mundoelectro"] |
  | barraca-europa | Barraca Europa | barracaeuropa.com.uy | tienda-uy | ferreteria, electrodomesticos | | | r ["barraca europa"] |
  | rosas-hermanos | Rosas Hermanos | rosashermanos.com.uy | tienda-uy | hogar, electrodomesticos | | | r ["rosas hermanos"] |
  | via-confort | Vía Confort | viaconfort.com.uy | tienda-uy | electrodomesticos, muebles | Via Confort | | r ["via confort"] |
  | dormimundo | Dormimundo | dormimundo.com.uy | tienda-uy | colchones | | | r ["dormimundo"] |
  | thot | Thot Computación | thotcomputacion.com.uy | tienda-uy | tecnologia | Thot | | r ["thot computacion"] |
  | pc-compu | PC Compu | pccompu.com.uy | tienda-uy | tecnologia | PcCompu | | r ["pccompu", "pc compu"] |
  | caribe-sur-store | Caribe Sur Store | caribesurstore.uy | tienda-uy | tecnologia, celulares | CARIBE SUR STORE | | r ["caribe sur"] |
  | deceleste | Deceleste | deceleste.com.uy | tienda-uy | motos, bicicletas | De Celeste | | r ["deceleste"] |
  | albanes | Albanés | albanes.com.uy | tienda-uy | motos | Albanes | | r [] |
  | epicbike | Epic Bike | epicbike.uy | tienda-uy | bicicletas | Epicbike | | r ["epic bike", "epicbike"] |
  | bikestore | Bike Store | bikestore.com.uy | tienda-uy | bicicletas | | | r [] |
  | decathlon | Decathlon Uruguay | decathlon.com.uy | tienda-uy | deportes, bicicletas | Decathlon | | r ["decathlon"] |
  | carlos-gutierrez | Carlos Gutiérrez | carlosgutierrez.com.uy | tienda-uy | electrodomesticos | Carlos Gutierrez | | r ["carlos gutierrez", "carlos gutiérrez"] |
  | farmashop | Farmashop | farmashop.com.uy | tienda-uy | farmacia | | | r ["farmashop"] |
  | san-roque | San Roque | sanroque.com.uy | tienda-uy | farmacia | | | r ["farmacia san roque"] |
  | tienda-claro | Tienda Claro | tienda.claro.com.uy | tienda-uy | celulares | Claro | | r [] , tp claro.com.uy |
  | tienda-antel | Tienda Antel | tienda.antel.com.uy | tienda-uy | celulares, tecnologia | Antel | | r ["tienda antel"] , tp antel.com.uy |
  | tigo | Tigo Uruguay | tigo.com.uy | tienda-uy | celulares | Tigo, Movistar | | r ["tigo"] |
  | mercado-libre | Mercado Libre | mercadolibre.com.uy | marketplace | general | MercadoLibre | | r ["mercado libre", "mercadolibre"] |
  | temu | Temu | temu.com | compra-exterior | general, moda | | | r ["temu"] |
  | shein | Shein | shein.com | compra-exterior | moda | | | r ["shein"] |
  | aliexpress | AliExpress | aliexpress.com | compra-exterior | general, tecnologia | | | r ["aliexpress"] |
  | amazon | Amazon | amazon.com | compra-exterior | general, tecnologia | | | r ["amazon"] |
  | ebay | eBay | ebay.com | compra-exterior | general, tecnologia | | | r ["ebay"] |
  | tiendamia | Tiendamia | tiendamia.com | compra-exterior | general, tecnologia | | | r ["tiendamia"] |

- [ ] **Step 4:** tests → PASS. **Step 5: commit** — `feat(tiendas): registro curado de tiendas y espejo del app`.

---

### Task 2: Señal del sitio y antigüedad del dominio

**Files:**
- Create: `classes/stores/signals/site.ts`, `classes/stores/signals/age.ts`, `classes/stores/net.ts`
- Test: `tests/stores/site.test.ts`, `tests/stores/age.test.ts` (fixtures en `tests/stores/fixtures/`)

**Interfaces:**
- Produces:
  ```ts
  // Todas las señales usan esta convención: `undefined` = no se pudo consultar (se conserva la anterior),
  // `null` = consultado y no existe.
  export interface SiteSignal {
    status: "ok" | "blocked"; finalHost: string; https: boolean;
    platform: "fenicio" | "shopify" | "vtex" | "woocommerce" | "tiendanube" | "wix" | "magento" | "nextjs" | "otra";
    phone: boolean; whatsapp: boolean; email: boolean;
    rut: string | null;                 // 12 dígitos si la página lo publica
    address: string | null;             // sólo de JSON-LD PostalAddress
    policies: { returns: string | null; terms: string | null; privacy: string | null }; // URLs absolutas
    payments: Array<"mercadopago" | "visa" | "mastercard" | "oca" | "abitab" | "redpagos" | "transferencia">;
    checkedAt: string;
  }
  export function parseSite(html: string, finalUrl: string, checkedAt: string): SiteSignal;
  export async function fetchSite(domain: string): Promise<SiteSignal | undefined>;
  export interface AgeSignal { since: string; source: "crt.sh" | "wayback"; checkedAt: string }
  export function earliestCertificate(rows: Array<{ not_before?: string }>): string | null;  // YYYY-MM-DD
  export function waybackFirstCapture(body: unknown): string | null;                     // YYYY-MM-DD
  export async function fetchAge(domain: string): Promise<AgeSignal | null | undefined>;
  export async function httpText(url: string, opts?: { timeoutMs?: number; headers?: Record<string,string> }): Promise<{ status: number; url: string; body: string } | undefined>;
  ```
- [ ] **Step 1: tests que fallan** con HTML de fixture (escribir fixtures chicos a mano, no descargar sitios):
  - Fenicio (`f.fcdn.app` en un `<link>`) → `platform: "fenicio"`; Shopify (`cdn.shopify.com`) → `"shopify"`; VTEX (`vteximg`) → `"vtex"`; WooCommerce (`woocommerce` en una clase) → `"woocommerce"`; body con `Just a moment` + `challenge-platform` → `status: "blocked"`.
  - `<a href="tel:+59829001234">` → `phone: true`; `https://wa.me/59899123456` → `whatsapp: true`; `mailto:` → `email: true`.
  - "RUT: 214567890012" y "R.U.T. 21 456789 0012" → `rut: "214567890012"`; un número de 12 dígitos sin "RUT" cerca → `null`.
  - JSON-LD `{"@type":"Organization","address":{"@type":"PostalAddress","streetAddress":"Av. 8 de Octubre 3908","addressLocality":"Montevideo"}}` → `address: "Av. 8 de Octubre 3908, Montevideo"`; sin JSON-LD → `null` (nunca se adivina del texto).
  - `<a href="/politica-de-devoluciones">Cambios y devoluciones</a>` → `policies.returns` absoluto con el host final; ancla "Términos y condiciones" → `terms`; "Política de privacidad" → `privacy`.
  - íconos/texto "Mercado Pago", "OCA", "Abitab", "Redpagos", "Visa", "Mastercard", "transferencia bancaria" → `payments` sin duplicados, en ese orden fijo.
  - `earliestCertificate([{not_before:"2026-07-28T11:53:21"},{not_before:"2020-07-14T20:14:35"}])` → `"2020-07-14"`; `[]` → `null`.
  - `waybackFirstCapture([["timestamp"],["20190305120000"]])` → `"2019-03-05"`; `[["timestamp"]]` → `null`; HTML de "Temporarily Offline" (string) → `null` sin lanzar.
- [ ] **Step 2:** FAIL. **Step 3: implementación.**
  - `net.ts`: `fetch` con `AbortSignal.timeout` (20 s default), UA de navegador (`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36`) y cabecera `x-cambio-uruguay-bot: store-profiles` (misma política que alquileres: identificarse en una cabecera), `redirect: "follow"`; devuelve `undefined` ante error de red.
  - `fetchSite`: `https://<domain>/`; status ≥ 400 con cuerpo de desafío → `parseSite` igual (queda `blocked`); `undefined` si la red falla.
  - `fetchAge`: sólo para `kind === "tienda-uy"` (lo decide el llamador). crt.sh `https://crt.sh/?q=<domain>&output=json&match==` (timeout 60 s, reintento 1 vez a los 10 s); si falla o viene vacío, Wayback `https://web.archive.org/cdx/search/cdx?url=<domain>&output=json&limit=1&fl=timestamp`; `null` si los dos responden sin datos; `undefined` si los dos fallan por red o status.
- [ ] **Step 4:** PASS. **Step 5: commit** — `feat(tiendas): señales del sitio y antigüedad del dominio`.

---

### Task 3: Trustpilot y Google (validado por dominio)

**Files:**
- Create: `classes/stores/signals/trustpilot.ts`, `classes/stores/signals/google.ts`
- Test: `tests/stores/trustpilot.test.ts`, `tests/stores/google.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface TrustpilotSignal { score: number; reviews: number; reviewsLast12m: number; claimed: boolean; alerts: number; url: string; checkedAt: string }
  export function parseTrustpilot(json: unknown, checkedAt: string): TrustpilotSignal | null;
  export async function fetchTrustpilot(domain: string): Promise<TrustpilotSignal | null | undefined>;
  export interface GoogleSignal { rating: number; reviews: number; address: string | null; url: string; checkedAt: string }
  export function sameSite(website: string | null | undefined, domain: string): boolean;
  export function parsePlaceDetails(json: unknown, domain: string, checkedAt: string): GoogleSignal | null;
  export async function fetchGoogle(name: string, domain: string): Promise<GoogleSignal | null | undefined>;
  ```
- [ ] **Step 1: tests que fallan.**
  - Trustpilot con el shape real (respuesta de `:3029/trustpilot/feedbacks?domain=tiendamia.com` el 16/9/2026): `businessUnit: { numberOfReviews: 104, numberOfReviewsLast12Months: 12, trustScore: 1.4, isClaimed: true, consumerAlerts: [] }`, `pageUrl: "https://www.trustpilot.com/review/www.tiendamia.com"` → `{ score: 1.4, reviews: 104, reviewsLast12m: 12, claimed: true, alerts: 0, url: pageUrl }`. Sin `businessUnit` o `numberOfReviews: 0` → `null`. `trustScore` fuera de 0–5 → `null`.
  - `sameSite("https://www.magiccenter.com.uy/", "magiccenter.com.uy")` true; `sameSite("http://magiccenter.com.uy/tienda", "www.magiccenter.com.uy")` true; `sameSite("https://facebook.com/magiccenter", "magiccenter.com.uy")` false; `sameSite(null, "x.uy")` false; subdominio de la tienda (`tienda.x.com.uy` vs `x.com.uy`) true.
  - `parsePlaceDetails` con `{ result: { rating: 4.3, user_ratings_total: 812, website: "https://magiccenter.com.uy/", formatted_address: "Av. 8 de Octubre 3908…", url: "https://maps.google.com/?cid=1" }, status: "OK" }` y dominio `magiccenter.com.uy` → señal; con `website` de otro dominio → `null`; sin `user_ratings_total` → `null`.
- [ ] **Step 2:** FAIL. **Step 3: implementación.**
  - `fetchTrustpilot`: `${STORES_TRUSTPILOT_URL}/trustpilot/feedbacks?domain=<domain>` (timeout 60 s). 404 o JSON sin unidad → `null`; error de red/5xx → `undefined`.
  - `fetchGoogle`: `${STORES_GMAPS_URL}/findPlaceFromText?input=<name> Uruguay&inputtype=textquery&fields=place_id,name` → hasta 3 candidatos → `placeDetails?place_id=…&fields=place_id,name,rating,user_ratings_total,website,url,formatted_address` → el primero que pase `parsePlaceDetails` gana; ninguno → `null`; red → `undefined`. Comentario: por qué se valida por dominio y nunca por nombre (misma regla que las reseñas de casas de cambio: un local co-marcado o vecino no es la tienda).
  - Sólo se consulta Google para `kind === "tienda-uy"`.
- [ ] **Step 4:** PASS. **Step 5: commit** — `feat(tiendas): Trustpilot y Google validado por dominio`.

---

### Task 4: Menciones en Reddit (Arctic Shift)

**Files:**
- Create: `classes/stores/signals/reddit.ts`
- Test: `tests/stores/reddit.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface RedditMention { id: string; kind: "post" | "comment"; createdUtc: number; threadId: string; title: string | null; permalink: string; score: number; text: string }
  export interface RedditSignal {
    mentions: number; byYear: Record<string, number>;
    threads: Array<{ title: string; date: string; url: string; score: number }>; // hasta 5, sólo posts
    tone: { complaints: number; recommendations: number; neutral: number; classified: number } | null;
    checkedAt: string;
  }
  export function mentionMatches(entry: Pick<StoreEntry, "redditTerms" | "redditMatch">, text: string): boolean;
  export function summarizeMentions(mentions: RedditMention[], checkedAt: string, now?: Date): RedditSignal;
  export async function fetchRedditMentions(entry: StoreEntry, sinceUtc: number): Promise<RedditMention[] | undefined>;
  ```
  (`tone` queda `null` en esta tarea; lo llena la Task 7.)
- [ ] **Step 1: tests que fallan.** `mentionMatches` con `divino`: "compré el placard en Divino y llegó roto" → true; "juventud divino tesoro" → false; con `tushop` "pedí en tushop" → true; comparación sobre texto normalizado (sin acentos). `summarizeMentions`: cuenta por año (UTC), `threads` sólo de posts, ordenados por score desc y luego fecha desc, máximo 5, `url = "https://www.reddit.com" + permalink`; ninguna propiedad `author` en la salida (assert sobre `JSON.stringify`); deduplica por `id`.
- [ ] **Step 2:** FAIL. **Step 3: implementación.** Subreddits `uruguay` y `montevideo`; por término: `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=<sub>&query=<term>&after=<YYYY-MM-DD>&limit=100` y `…/comments/search?subreddit=<sub>&body=<term>&after=<YYYY-MM-DD>&limit=100&fields=id,link_id,created_utc,score,body`. UA `cambio-uruguay/1.0 (+https://cambio-uruguay.com/tiendas-online-uruguay)`. **Ritmo:** 4 s entre llamadas; si la respuesta trae `error` con "Timeout"/"slow down" o HTTP 429/5xx, esperar 20 s y reintentar hasta 3 veces; si agota, devolver `undefined` (se conserva la señal previa). Filtrar localmente con `mentionMatches`. `sinceUtc` = 3 años atrás. Nunca guardar `author`. Tiendas con `redditTerms: []` no se consultan (devuelve `null` desde el llamador).
- [ ] **Step 4:** PASS. **Step 5: commit** — `feat(tiendas): menciones en Reddit sin autores`.

---

### Task 5: Presencia en los catálogos propios

**Files:**
- Create: `classes/stores/signals/catalog.ts`
- Test: `tests/stores/catalog.test.ts`

**Interfaces:**
- Consumes: `storeKeyForSeller` (Task 1). Documentos de APP DB `equiparitems` (`category`, `categoryLabel`, `offers[].seller`, `products[].offers[].seller`, `lastSeen`) y `chaircatalogproducts` (`slug`, `name` o `brand`+`model`, `offers[].sellerName`, `offers[].sellerKey`, `lastSeen`) — leer los modelos `classes/models/EquiparItem.ts` y `classes/models/ChairCatalogProduct.ts` para los nombres exactos de campos antes de escribir.
- Produces:
  ```ts
  export interface CatalogSignal { offers: number; verticals: Array<{ key: string; label: string; url: string; offers: number }>; checkedAt: string }
  export function catalogPresence(input: { equipar: EquiparLikeItem[]; chairs: ChairLikeProduct[] }, checkedAt: string): Map<string, CatalogSignal>;
  export async function loadCatalogPresence(checkedAt: string): Promise<Map<string, CatalogSignal>>;
  ```
- [ ] **Step 1: tests que fallan.** Un item de equipar `aire-acondicionado:12000` con ofertas de "TuShopuy" y "Mercado Libre" y un producto de sillas con oferta `sellerName: "Expansión UY"` → `tushop` con `verticals: [{ key: "equipar:aire-acondicionado", label: "Aire acondicionado", url: "/equipar-casa-uruguay", offers: 1 }]` y `expansion-uy` con `{ key: "sillas", label: "Sillas de escritorio", url: "/sillas-escritorio-uruguay", offers: 1 }`; "Mercado Libre" no suma a nadie; una misma oferta repetida en `offers` y en `products[].offers` (misma `url`) cuenta una vez; items con `lastSeen` de hace más de 7 días no cuentan. La URL de equipar es `/equipar-casa-uruguay` a propósito: la Task 10 la cambia a la página por categoría cuando exista.
- [ ] **Step 2:** FAIL. **Step 3:** implementar (loader con `EquiparItemModel.find({ lastSeen: { $gte } }).select(...)` y `ChairCatalogProductModel` idem, `.lean()`). **Step 4:** PASS. **Step 5: commit** — `feat(tiendas): presencia en los catálogos propios`.

---

### Task 6: Perfil, arrastre de señales, modelos y job semanal

**Files:**
- Create: `classes/stores/profile.ts`, `classes/stores/store.ts`, `classes/models/StoreProfile.ts`, `app/server/models/StoreProfile.ts`, `sync_store_profiles.ts`
- Modify: `tests/appdb/schema_parity.test.ts`, `ecosystem.config.js`, `scripts/deploy-backend.sh` (`OTHER_APPS`)
- Test: `tests/stores/profile.test.ts`, `tests/stores/dry_run.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces:
  ```ts
  export const STORE_SIGNAL_MAX_AGE_DAYS = 60;
  export interface StoreProfileDoc {
    key: string; name: string; domain: string | null; kind: StoreKind; rubros: StoreRubro[]; aliases: string[];
    site: SiteSignal | null; age: AgeSignal | null; trustpilot: TrustpilotSignal | null; google: GoogleSignal | null;
    reddit: RedditSignal | null; catalog: CatalogSignal | null;
    signals: number; indexable: boolean; firstSeen: string; lastSeen: string;
  }
  export function mergeSignal<T extends { checkedAt: string }>(previous: T | null | undefined, fetched: T | null | undefined): T | null;
  export function countFreshSignals(doc: Pick<StoreProfileDoc, "site"|"age"|"trustpilot"|"google"|"reddit"|"catalog">, now: Date): number;
  export function buildProfile(entry: StoreEntry, fetched: Partial<Record<"site"|"age"|"trustpilot"|"google"|"reddit"|"catalog", unknown>>, previous: StoreProfileDoc | null, now: Date): StoreProfileDoc;
  ```
- [ ] **Step 1: tests que fallan.**
  - `mergeSignal(prev, undefined)` → `prev` (fallo de red conserva); `mergeSignal(prev, null)` → `null` (consultado y no existe); `mergeSignal(null, fresh)` → `fresh`.
  - `countFreshSignals`: `site` cuenta sólo con `status: "ok"`; `reddit` sólo con `mentions > 0`; `catalog` sólo con `offers > 0`; cualquier señal con `checkedAt` de más de 60 días no cuenta.
  - `buildProfile`: `indexable = signals >= 3`; `firstSeen` se hereda; `lastSeen` = hoy.
  - `dry_run.test.ts`: lee el texto de `sync_store_profiles.ts` y exige que el camino `--dry-run` no llame a `saveStoreProfiles` (buscar la guarda `if (!dryRun)` alrededor de la escritura) y que exista `--only=`.
- [ ] **Step 2:** FAIL. **Step 3: implementación.**
  - Modelos: colección `storeprofiles`, índice único `key`, `timestamps: true`; subdocumentos como `Schema.Types.Mixed`. App: mismo schema con campos a 4 espacios y segundo argumento `{ timestamps: true }` (trampa de la regex de paridad). Paridad en `schema_parity.test.ts` + nombre de colección.
  - `store.ts`: `loadStoreProfiles(): Map<key, doc>`, `saveStoreProfiles(docs)` con `bulkWrite` upsert por `key` (nunca borra).
  - `sync_store_profiles.ts` (patrón `sync_equipar.ts`): flags `--dry-run` (imprime un resumen por tienda y NO escribe) y `--only=<key,key>`. Orden: `loadCatalogPresence` una vez; por tienda en serie: `fetchSite`, `fetchAge` (tienda-uy), `fetchTrustpilot` (dominio o `trustpilotDomain`; `null` explícito no consulta), `fetchGoogle` (tienda-uy), `fetchRedditMentions` (si hay términos) → `buildProfile`. Log `[tiendas] <key> señales=<n> sitio=<ok|blocked|->  tp=<score|->  g=<rating|->  reddit=<n|->  catálogo=<n|->`. **Corrida flaca:** si menos del 40 % de las tiendas obtuvo al menos una señal nueva (no `undefined`) y ya hay perfiles guardados, no escribir y salir con código 1.
  - `ecosystem.config.js`: `currency-store-profiles`, `dist/sync_store_profiles.js`, `cron_restart: "17 7 * * 0"`, `autorestart: false`, `exec_mode: "fork"`, comentario (domingo 04:17 en Montevideo; semanal porque reseñas y antigüedad se mueven en semanas; lejos de `currency-search-demand` 06:40 y de `currency-rag-index` 04:20).
  - `OTHER_APPS` suma `currency-store-profiles`.
- [ ] **Step 4:** `npx vitest run tests/stores tests/appdb tests/sync` → PASS; `npm run build` OK. **Probar la red sin escribir:** `npx ts-node sync_store_profiles.ts --dry-run --only=tiendamia,expansion-uy,magic-center` desde la máquina local (Trustpilot/Google por defecto apuntan a `127.0.0.1` y fallarán en local: está bien, deben quedar como `-` sin romper la corrida; sitio, crt.sh y Reddit sí deben responder). Pegar la salida en el reporte.
- [ ] **Step 5: commit** — `feat(tiendas): perfil con arrastre de señales y job semanal currency-store-profiles`.

---

### Task 7: Tono de las menciones de Reddit (clasificación automática, agregada)

**Files:**
- Create: `classes/stores/signals/tone.ts`
- Modify: `sync_store_profiles.ts`, `classes/stores/profile.ts` (guardar el caché de clasificaciones)
- Test: `tests/stores/tone.test.ts`

**Interfaces:**
- Consumes: `askJSON<T>(prompt, schema, opts)` de `classes/gemini.ts`; `RedditMention`.
- Produces:
  ```ts
  export type MentionTone = "queja" | "recomendacion" | "neutral";
  export const STORE_TONE_MODEL = "gemini-2.5-flash-lite";
  export function tonePrompt(storeName: string, mentions: Array<{ id: string; text: string }>): string;
  export function applyTone(cache: Record<string, MentionTone>, mentions: RedditMention[]): RedditSignal["tone"];
  export async function classifyMentions(storeName: string, mentions: RedditMention[], cache: Record<string, MentionTone>): Promise<Record<string, MentionTone>>;
  ```
  `StoreProfileDoc` suma `toneCache: Record<string, MentionTone>` (NO se expone en la API; la Task 8 lo excluye con `.select`).
- [ ] **Step 1: tests que fallan.** `applyTone` con menos de 5 menciones clasificadas → `null`; con 6 (3 quejas, 2 recomendaciones, 1 neutral) → conteos exactos y `classified: 6`; `tonePrompt` incluye el nombre de la tienda, pide clasificar SÓLO respecto de esa tienda, y recorta cada texto a 600 caracteres; ningún id fuera de la lista se acepta del modelo (test de `classifyMentions` con `askJSON` inyectado/mokeado que devuelve un id extra).
- [ ] **Step 2:** FAIL. **Step 3: implementación.** Sólo clasifica menciones sin entrada en el caché, en lotes de 25, máximo 100 por tienda por corrida; schema JSON `{ items: [{ id, tone }] }`; `system`: "Clasificás menciones de una tienda en Reddit. queja = relata un problema con la tienda; recomendacion = la recomienda o cuenta una buena experiencia; neutral = la menciona sin juicio. Si el texto no habla de esa tienda, neutral." Si `askJSON` devuelve `null` (sin clave o error), no se toca nada. En el job, después de las menciones.
- [ ] **Step 4:** PASS. **Step 5: commit** — `feat(tiendas): tono agregado de las menciones de Reddit`.

---

### Task 8: API y utilidades del app

**Files:**
- Create: `app/server/api/stores/index.get.ts`, `app/server/api/stores/[slug].get.ts`, `app/utils/storeProfiles.ts`
- Test: `app/tests/unit/storeProfiles.test.ts`

**Interfaces:**
- Consumes: `StoreProfileModel` (app), `STORE_DIRECTORY`/`isStoreDirectoryKey`, la utilidad de marcas de Bankos (`app/utils/bankosBrandPage.ts`: `buildBrandPageIndex`, `findBrandBySlug`, `slugifyText` de `./longform`; leer `app/server/api/bankos/marca/[slug].get.ts` para ver de dónde sale el catálogo de marcas en el servidor y reutilizar ese loader).
- Produces:
  - `GET /api/stores` → `{ stores: StoreCard[] }` con `StoreCard = { key, name, domain, kind, rubros, since: string | null, trustpilot: { score, reviews } | null, google: { rating, reviews } | null, redditMentions: number | null, catalogOffers: number | null, signals: number, indexable: boolean }`, cache 3.600 s, orden alfabético `es`.
  - `GET /api/stores/<slug>` → `{ profile: StorePublicProfile, bankosBrandSlug: string | null }`; **404** si la clave no está en el espejo o no hay documento.
  - `app/utils/storeProfiles.ts`: `storeFreshSignals(profile, now)` (misma regla de 60 días que el backend; test de paridad de la constante en la Task 11), `storeFaq(profile, bankosBrandSlug): Array<{ question: string; answer: string }>`, `storeBuyingAdvice(kind): { title: string; items: Array<{ text: string; to?: string }> }`, `storeSignalSummary(profile): string` (una frase con los datos, sin adjetivos).
- [ ] **Step 1: tests que fallan** (`storeProfiles.test.ts`): `storeSignalSummary` para un perfil con Trustpilot 1,4 (104 reseñas) y Google 4,3 (812) contiene "1,4", "104", "4,3", "812" y NO contiene "confiable", "estafa", "recomendamos", "evitá"; con una señal de hace 61 días, esa señal no aparece; `storeFaq` incluye "¿<name> es confiable?" cuya respuesta enumera señales y termina con "No es una calificación nuestra: cada dato dice de dónde sale."; "¿<name> tiene local físico?" responde con la dirección de Google o del JSON-LD cuando existe y "No encontramos una dirección publicada" cuando no; "¿Cómo le reclamo a <name>?"; `storeBuyingAdvice("compra-exterior")` enlaza a `/franquicia-aduana-uruguay`, `/guias/impuesto-temu-uruguay` y `/problemas-con-la-aduana-uruguay`; `storeBuyingAdvice("tienda-uy")` enlaza a `/derechos-consumidor-compras-online` y `/defensa-al-consumidor-uruguay` y menciona el arrepentimiento de 5 días hábiles de la Ley 17.250 art. 16 (texto consistente con `app/utils/consumerRights.ts`; leerlo antes). Confirmar con `ls app/pages` que cada ruta enlazada existe (`guias/[slug]` cubre `/guias/impuesto-temu-uruguay` si esa guía existe en `app/utils/guidesImportacion.ts`).
- [ ] **Step 2:** FAIL. **Step 3:** implementar las rutas copiando el patrón de `app/server/api/equipar/index.get.ts` (`.select` sin `toneCache`, `_id`, `__v`, timestamps); detalle: `bankosBrandSlug` = marca de Bankos cuyo slug coincide con `slugifyText(name)` o con el de algún alias; si el loader de marcas falla, `null`.
- [ ] **Step 4:** PASS + lint. **Step 5: commit** — `feat(tiendas): API y utilidades de las fichas`.

---

### Task 9: Páginas, navegación, sitemap y contrato SEO

**Files:**
- Create: `app/pages/tiendas-online-uruguay/index.vue`, `app/pages/tiendas-online-uruguay/[tienda].vue`
- Modify: `app/utils/siteNav.ts` (`NAV_SECTIONS` en la sección donde está `/defensa-al-consumidor-uruguay`; `DYNAMIC_ROUTE_KEYS['tiendas-online-uruguay/[tienda]']`), `app/i18n/locales/json/{es,en,pt}.json` (`nav.tiendasOnline`: "Tiendas online: opiniones y datos" / "Online stores in Uruguay" / "Lojas online no Uruguai"), `app/server/api/__sitemap__/urls.get.ts`, `app/tests/unit/seoContract.test.ts`
- Test: `app/tests/unit/storePages.test.ts`

- [ ] **Step 1: test que falla** (texto de archivos): `[tienda].vue` con `definePageMeta` + `validate` que usa `isStoreDirectoryKey`; `useFetch` con `key` que incluye el slug; un `<h1`; `useSeoMeta(` con `title`, `description`, `ogTitle:`, `ogDescription:`; canonical `https://cambio-uruguay.com/tiendas-online-uruguay/`; `BreadcrumbList`; `<FaqSection`; sin `AggregateRating`; sin la palabra `estafa`; `noindex` sólo condicionado a `!profile.indexable` a través de `useHead(() => ({ meta: [...] }))`. **Ojo con el contrato SEO:** una familia registrada en `PROGRAMMATIC_PAGES` no puede contener `noindex`; si el test del contrato lo rechaza, resolverlo sacando el `noindex` del template y excluyendo las fichas no indexables del sitemap (el sitemap es la señal), y anotar la decisión en el commit. `index.vue` con un `<h1`, filtros por rubro y tipo, y cada tarjeta enlazando con `localePath(\`/tiendas-online-uruguay/${`.
- [ ] **Step 2:** FAIL. **Step 3: páginas** (sólo español: canonical sin prefijo de idioma).
  - **Índice:** H1 "Tiendas online de Uruguay: opiniones, reclamos y datos verificables"; párrafo con cuántas tiendas y fecha de la última revisión (máximo `updatedAt`); aviso "No es un ranking de confianza: mostramos datos con su fuente y su fecha"; chips de rubro (`STORE_RUBRO_LABELS`) y de tipo; tabla (`VTable` + `cu-mobile-cards` + `data-label`) con tienda, rubros, "en línea desde", Trustpilot, Google, menciones en Reddit, ofertas en nuestros catálogos; orden alfabético. JSON-LD: `BreadcrumbList` + `ItemList` cuyos `ListItem` llevan `position`, `name` y `url` absoluta de cada ficha. FAQ corta del índice (qué medimos, qué no, cómo corregir un dato).
  - **Ficha:** breadcrumbs Inicio → Tiendas online → nombre; H1 `¿${name} es confiable? Opiniones, reclamos y datos verificables`; `storeSignalSummary`; bloques en este orden, cada uno sólo si hay señal fresca y con "Fuente: … · revisado el <fecha>": Identidad (dominio, en línea desde, plataforma, publica teléfono/WhatsApp/correo, RUT si publica, dirección, políticas con enlaces externos `rel="nofollow noopener"`), Reseñas (Trustpilot y Google con sus enlaces), Reddit (menciones por año, tono si existe con la aclaración "clasificación automática de N menciones", hasta 5 hilos), En nuestros relevamientos (enlaces internos de `catalog.verticals`), Descuentos con tarjeta (si `bankosBrandSlug`, enlace a `/descuentos-con-tarjeta-uruguay/marca/<slug>`), Cómo comprar con menos riesgo (`storeBuyingAdvice`), Si tenés un problema; FAQ (`FaqSection`); bloque "¿Sos de <name>? Escribinos para corregir un dato" con enlace a la página de contacto del sitio (buscar la ruta existente con `ls app/pages | grep -i contact`); "Otras tiendas de <primer rubro>" (hasta 6).
  - SEO: `useSeoMeta` título `¿${name} es confiable? Opiniones y datos | Cambio Uruguay` (si pasa de 65 caracteres, `${name}: opiniones y datos | Cambio Uruguay`), descripción con 2 datos concretos si existen; `defineOgImageComponent('Cambio', { title, subtitle: 'Tiendas online', tag: 'TIENDAS' })`; JSON-LD `@graph` = `BreadcrumbList` + `Organization` `{ '@type': 'Organization', name, url: https://<domain> }` (sin ratings).
  - Sitemap: `StoreProfileModel.find({ indexable: true }).select({ key: 1, updatedAt: 1 })` dentro de `try/catch/finally disconnectDbAfterPrerender()` → `urls.push({ loc: \`/tiendas-online-uruguay/${slug}\`, … })` (sólo español; mismo formato de `loc` que comparativas en ese archivo); el literal `` `/tiendas-online-uruguay/${slug}` `` debe aparecer tal cual.
  - `PROGRAMMATIC_PAGES` suma las dos entradas.
- [ ] **Step 4:** `cd app && npm test && npm run lint` PASS; dev en este worktree (`npx nuxi prepare && npx nuxt dev --port 3218`), `curl --max-time 180`: `/tiendas-online-uruguay` 200; `/tiendas-online-uruguay/tiendamia` 200 o estado vacío sin error (la Mongo local no tiene perfiles); `/tiendas-online-uruguay/no-existe` **404**. Medir `wc -c`. Apagar el dev.
- [ ] **Step 5: commit** — `feat(tiendas): índice y fichas de tiendas online`.

---

### Task 10: Enlaces desde sillas y equipar hacia las fichas

**Precondición:** B (`feat/directorios-b-equipar`) ya está en `origin/main`. Primer paso: `git fetch origin && git rebase origin/main` en `cu-dir-a`; resolver conflictos (esperables en `siteNav.ts`, `urls.get.ts`, `seoContract.test.ts`, `schema_parity.test.ts`, `ecosystem.config.js`, `deploy-backend.sh`, `AGENTS.md`: conservar ambas entradas). Si B todavía no está en main, reportar BLOCKED.

**Files:**
- Modify: `app/pages/sillas-escritorio-uruguay/[slug].vue` (nombre del vendedor de cada oferta), `app/pages/equipar-casa-uruguay/[categoria].vue` (vendedor en productos y "los más baratos"), `classes/stores/signals/catalog.ts` (URL de equipar por categoría: `/equipar-casa-uruguay/<category>`)
- Test: `app/tests/unit/storeLinks.test.ts`, `tests/stores/catalog.test.ts` (actualizar la URL)

- [ ] **Step 1:** tests: en el texto de ambas páginas aparece `storeSlugForSeller(` y un `NuxtLink` a `` `/tiendas-online-uruguay/${ ``; `catalog.test.ts` espera `/equipar-casa-uruguay/aire-acondicionado`.
- [ ] **Step 2:** FAIL. **Step 3:** en cada lugar donde se muestra el nombre del vendedor, si `storeSlugForSeller(nombre)` devuelve clave, envolver el nombre en `<NuxtLink :to="localePath(\`/tiendas-online-uruguay/${key}\`)">`; si no, texto plano. Actualizar la URL en `catalogPresence`.
- [ ] **Step 4:** PASS (raíz y app) + lint. **Step 5: commit** — `feat(tiendas): los vendedores de sillas y equipar enlazan a su ficha`.

---

### Task 11: Documentación y verificación final

**Files:**
- Create: `docs/app/TIENDAS_ONLINE.md` (qué señales, de dónde, qué NO se publica y por qué — veredictos, autores, `AggregateRating`—, convención `undefined`/`null`, 60 días, indexable con 3 señales, Reddit lento y términos curados, cómo agregar una tienda)
- Modify: `AGENTS.md` (fila `currency-store-profiles` en la tabla pm2, `sync_store_profiles.ts` en la lista de entrypoints, `stores` en la lista de carpetas de `classes/`)
- Test: `tests/stores/constants_parity.test.ts` (60 días igual en `classes/stores/profile.ts` y `app/utils/storeProfiles.ts`)

- [ ] **Step 1:** test de paridad → FAIL si difieren (debería pasar); docs.
- [ ] **Step 2:** raíz `npm test` + `npm run build`; app `npm test` + `npm run lint`. Pegar resumen.
- [ ] **Step 3: commit** — `docs(tiendas): fichas de tiendas online y job semanal`.

---

### Task 12: Reddit incremental por ventanas (se ejecuta DESPUÉS de la Task 6 y ANTES de la Task 7)

Origen (medido por la Task 6 el 16/9/2026 contra Arctic Shift): el servicio contesta **HTTP 422** con `{"error":"Timeout. Maybe slow down a bit"}` (no sólo 200), las búsquedas de comentarios de r/uruguay con ventanas de ~6 meses o más se cortan siempre, y una búsqueda que sí contesta devuelve como máximo 100 filas (el tope de `limit`). Con el diseño de la Task 4 la señal casi nunca se llenaría y, cuando se llenara, estaría truncada.

**Files:**
- Modify: `classes/stores/signals/reddit.ts`, `classes/stores/profile.ts`, `classes/stores/store.ts`, `classes/models/StoreProfile.ts`, `app/server/models/StoreProfile.ts`, `sync_store_profiles.ts`
- Test: `tests/stores/reddit.test.ts`, `tests/stores/profile.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface StoredRedditMention { id: string; kind: "post" | "comment"; sub: string; createdUtc: number; threadId: string; title: string | null; permalink: string; score: number } // sin texto, sin autor
  export interface RedditCursor { backfillStartUtc: number; backfillNextUtc: number; backfillDone: boolean; checkedUntilUtc: number }
  export const STORE_REDDIT_BACKFILL_MONTHS = 24;
  export const STORE_REDDIT_MAX_MENTIONS = 500;
  export function planRedditWindows(cursor: RedditCursor | null, nowUtc: number): Array<{ kind: "post" | "comment"; afterUtc: number; beforeUtc: number }>;
  export async function fetchRedditIncrement(entry: StoreEntry, cursor: RedditCursor | null, nowUtc: number, budget: { calls: number }): Promise<{ mentions: RedditMention[]; cursor: RedditCursor; complete: boolean } | undefined>;
  export function mergeStoredMentions(stored: StoredRedditMention[], fresh: RedditMention[]): { mentions: StoredRedditMention[]; capped: boolean };
  ```
  `StoreProfileDoc` suma `redditMentions: StoredRedditMention[]` y `redditCursor: RedditCursor | null` (backend y app, paridad de esquema; la API del app NO los expone). `RedditSignal` suma `capped: boolean` (true cuando se alcanzó el tope de 500 y la cifra es "500 o más").

- [ ] **Step 1: tests que fallan.**
  - `planRedditWindows(null, now)`: arranca 24 meses atrás; posts en ventanas de 6 meses y comentarios en ventanas de 3 meses, contiguas y sin huecos hasta `now`. Con `backfillDone: true`: una sola ventana por tipo desde `checkedUntilUtc - 86400` (un día de solape) hasta `now`. Con backfill a medias: continúa desde `backfillNextUtc`.
  - Paginación: una página con exactamente 100 filas pide la siguiente con `after` = `created_utc` de la última fila; una con menos de 100 termina; ids repetidos entre páginas no se duplican.
  - Reintento: 422 con `{"error":"Timeout. Maybe slow down a bit"}`, 429, 5xx y 200 con `error` de timeout se reintentan hasta 3 veces con la espera configurable; si una ventana de comentarios sigue fallando, se parte a la mitad y se reintentan las dos mitades, hasta un mínimo de 14 días; por debajo de eso la corrida de esa tienda devuelve lo avanzado con `complete: false` y el cursor en la última ventana completada (nunca más allá).
  - Presupuesto: cada llamada HTTP descuenta 1 de `budget.calls`; con 0 se corta, devuelve `complete: false` y el cursor en la última ventana completa.
  - `mergeStoredMentions`: une por `id`, ordena por `createdUtc` descendente, recorta a 500 y marca `capped`; nunca guarda `text` ni `author` (assert sobre `JSON.stringify`).
  - Perfil: `summarizeMentions` se calcula sobre las menciones guardadas (no sólo las nuevas); si `fetchRedditIncrement` devuelve `undefined`, la señal y las menciones guardadas quedan intactas.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: implementación.**
  - `reddit.ts`: `after`/`before` en segundos epoch; `sort=asc`; `limit=100`; subreddits `uruguay` y `montevideo`; los mismos términos y el mismo filtro local (`mentionMatches`) que hoy; mantener `summarizeMentions`. Espera entre llamadas y espera de reintento por env (`STORES_REDDIT_GAP_MS` default 4000, `STORES_REDDIT_RETRY_MS` default 20000) para que los tests no esperen.
  - `sync_store_profiles.ts`: presupuesto por corrida `STORES_REDDIT_MAX_CALLS` (default 900); **guardar cada perfil apenas se procesa su tienda, sólo si obtuvo al menos una señal externa fresca** (sitio, antigüedad, Trustpilot, Google o Reddit distinto de `undefined`), para que un backfill largo no pierda lo hecho; el log de cada tienda dice `reddit=<n>(+<nuevas>)` y `backfill <fecha del cursor>` mientras no termina. **La regla de corrida flaca se reemplaza** por un corte temprano: si las primeras 10 tiendas procesadas no obtuvieron ninguna señal externa fresca, la corrida se detiene sin escribir nada más (fuentes caídas) y sale con código 1. Si cambian los `redditTerms` de una tienda respecto del perfil guardado, se descartan sus menciones guardadas y su cursor (se guarda la huella de los términos en el perfil).
  - Modelos backend y app con los dos campos nuevos (paridad).
- [ ] **Step 4:** `npx vitest run tests/stores tests/appdb tests/sync`; `npx tsc -p tsconfig.production.json --noEmit` con UN solo error (`sync_sheet.ts`/`sheet_key.json`); `cd app && npx eslint server/models/StoreProfile.ts` sin problemas; corrida en seco acotada `STORES_REDDIT_MAX_CALLS=40 npx ts-node sync_store_profiles.ts --dry-run --only=tiendamia,magic-center` (máximo 8 minutos, en primer plano) y pegar el log.
- [ ] **Step 5: commit** — `fix(tiendas): Reddit incremental por ventanas, con paginación y reintentos`.
