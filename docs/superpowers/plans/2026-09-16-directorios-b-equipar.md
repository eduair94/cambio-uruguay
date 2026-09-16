# B — Fichas de equipar por categoría: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** arreglar los precios equivocados que `/equipar-casa-uruguay` publica hoy, empezar a guardar historial por oferta (lo necesita D) y publicar una página por categoría (`/equipar-casa-uruguay/<categoria>`).

**Architecture:** los arreglos van en el retail compartido (`classes/retail/`) y en el registro de equipar; el historial por oferta es un módulo nuevo `classes/pricewatch/` que escriben los jobs existentes; las páginas nuevas leen `equiparitems` (ya tiene historia diaria por categoría+variante) con una ruta de API por categoría y un espejo de las categorías en `app/utils/`.

**Tech Stack:** TypeScript 4.9 CommonJS (raíz, vitest), Nuxt 4 + Vuetify 4 (app, vitest + eslint), MongoDB (APP DB vía `classes/appdb.ts`), chart.js vía `components/charts/LineChart.vue`.

**Spec:** `docs/superpowers/specs/2026-09-16-directorios-de-producto-design.md` (§0, §1.1, §1.2, §3). Referencia obligatoria: `docs/superpowers/plans/2026-09-16-directorios-checklist.md`.

## Global Constraints

- Trabajar SÓLO en el worktree `C:/Users/airau/Documents/GitHub/cu-dir-b` (rama `feat/directorios-b-equipar`). Primer comando de cada tarea: `cd "C:/Users/airau/Documents/GitHub/cu-dir-b" && git branch --show-current` → si no imprime `feat/directorios-b-equipar`, PARAR y reportar BLOCKED.
- **Nunca** correr un `sync_*` que escriba: el `.env` apunta a la Mongo de producción. Los scripts de prueba de esta rama no escriben base.
- No correr `nuxi prepare`, `nuxt dev` ni `nuxt build` en `C:/Users/airau/Documents/GitHub/cambio-uruguay` (raíz compartida). En `cu-dir-b` sí.
- Raíz: `npm test` (vitest) y `npm run build` (tsc). App (`cd app`): `npm test` y `npm run lint` (`typecheck` está roto).
- Copy en español rioplatense neutro ("setiembre", nunca "septiembre"; fechas con `dateLocale()`); texto azul chico con `rgb(var(--v-theme-link))`.
- Nada de cifras inventadas: toda cifra publicada sale del dato o de una fuente citada en el código.
- Exports de `app/utils/*.ts` con prefijo `equipar` (namespace plano de auto-import).
- Commits en español, estilo del repo (`feat(equipar): …`, `fix(retail): …`), terminando con la línea `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Precio tachado y clave de vendedor de MercadoLibre sin id

**Files:**
- Modify: `classes/retail/types.ts` (interfaz `RetailListing`)
- Modify: `classes/retail/sources/mercadolibre.ts` (`MlResult`, `toListing`)
- Modify: `classes/retail/sources/woocommerce.ts` (`WooProduct.prices`, `wooPrice`, armado del listing)
- Modify: `classes/retail/sources/shopify.ts` (variante: `compare_at_price`)
- Modify: `classes/retail/sources/vtex.ts` (`ListPrice`)
- Test: `tests/retail/list_price.test.ts` (nuevo)

**Interfaces:**
- Produces: `RetailListing.listPrice?: number | null` (opcional para no romper los constructores de Fenicio/estructurado/Facebook, que lo dejan sin definir). `export function mlSellerKey(seller: { id?: number; name?: string } | undefined): string`. `export function listPriceOf(price: number, reference: number | null | undefined): number | null` en un archivo nuevo `classes/retail/price.ts`.

- [ ] **Step 1: tests que fallan** — `tests/retail/list_price.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { listPriceOf } from "../../classes/retail/price";
import { mlSellerKey, mlToListing } from "../../classes/retail/sources/mercadolibre";

describe("precio tachado", () => {
  it("sólo existe cuando es mayor que el precio", () => {
    expect(listPriceOf(12993, 14990)).toBe(14990);
    expect(listPriceOf(12993, 12993)).toBeNull();
    expect(listPriceOf(12993, 9000)).toBeNull();
    expect(listPriceOf(12993, null)).toBeNull();
    expect(listPriceOf(12993, Number.NaN)).toBeNull();
  });

  it("MercadoLibre guarda original_amount como listPrice", () => {
    const listing = mlToListing(
      {
        id: "MLU1479683002",
        catalog_product_id: "MLU58584611",
        title: "Aire Acondicionado Futura 12000 Btu Fut-12aa-c Split",
        permalink: "https://www.mercadolibre.com.uy/x/p/MLU58584611",
        condition: "Nuevo",
        price: { amount: 12993, currency: "UYU", original_amount: 14990 },
        seller: { name: "NATIONAL PLUS +", official_store: true },
      },
      "2026-09-16T00:00:00.000Z"
    );
    expect(listing?.listPrice).toBe(14990);
    expect(listing?.officialStore).toBe(true);
  });
});

describe("clave de vendedor de MercadoLibre", () => {
  it("usa el id cuando viene", () => {
    expect(mlSellerKey({ id: 250646458, name: "DIMM" })).toBe("ml:250646458");
  });
  it("sin id, usa el nombre: dos vendedores distintos no colapsan en ml:unknown", () => {
    expect(mlSellerKey({ name: "NATIONAL PLUS +" })).toBe("ml:n:national-plus");
    expect(mlSellerKey({ name: "Estación hogar" })).toBe("ml:n:estacion-hogar");
    expect(mlSellerKey({ name: "NATIONAL PLUS +" })).not.toBe(mlSellerKey({ name: "Estación hogar" }));
  });
  it("sin id ni nombre queda ml:unknown", () => {
    expect(mlSellerKey(undefined)).toBe("ml:unknown");
    expect(mlSellerKey({})).toBe("ml:unknown");
  });
});
```

- [ ] **Step 2:** `npx vitest run tests/retail/list_price.test.ts` → FAIL (no existe `classes/retail/price.ts`, ni `mlSellerKey`/`mlToListing` exportados).

- [ ] **Step 3: implementación.**
  - `classes/retail/price.ts`:
    ```ts
    /** The crossed-out reference price, only when it is genuinely above the selling price. Never invented. */
    export function listPriceOf(price: number, reference: number | null | undefined): number | null {
      const value = Number(reference);
      if (!Number.isFinite(value) || value <= 0) return null;
      return value > price ? Math.round(value * 100) / 100 : null;
    }
    ```
  - `types.ts`: agregar a `RetailListing` `listPrice?: number | null;` con comentario ("crossed-out price the seller shows; null when there is none").
  - `mercadolibre.ts`: `price?: { amount?: number; currency?: string; original_amount?: number }`; exportar `mlSellerKey` (`slug` = `norm` de acentos → minúsculas → `[^a-z0-9]+` a `-` → recortar guiones; con id numérico devuelve `ml:<id>`; con nombre no vacío `ml:n:<slug>`; si no, `ml:unknown`); renombrar `toListing` a `export function mlToListing` (actualizar su uso) y poner `sellerKey: mlSellerKey(result.seller)` y `listPrice: listPriceOf(amount, result.price?.original_amount)`.
  - `woocommerce.ts`: `prices` suma `regular_price?: string`; el listing lleva `listPrice: listPriceOf(price, wooPrice({ ...product.prices, price: product.prices?.regular_price }))` (misma unidad que el precio: la Task 2 agrega el override de unidad dentro de `wooPrice`, así que pasar el mismo `store`).
  - `shopify.ts`: la variante suma `compare_at_price?: string | null`; `listPrice: listPriceOf(price, Number(variant?.compare_at_price))`.
  - `vtex.ts`: donde se arma la oferta, `listPrice: listPriceOf(offer.price, <ListPrice del mismo commertialOffer>)` — extender el retorno de la función que elige el SKU para que también devuelva `listPrice`.

- [ ] **Step 4:** `npx vitest run tests/retail tests/chairs tests/equipar` → PASS. Si algún test de `tests/chairs` fijaba `ml:unknown` para un vendedor con nombre, actualizarlo a la clave nueva y explicar en el commit por qué (dos vendedores sin id colapsaban en uno).

- [ ] **Step 5: commit** — `feat(retail): precio tachado y clave de vendedor de ML sin id`.

---

### Task 2: Guarda de unidad por tienda y override de TYT

Contexto medido en producción: TYT responde en su Store API `{"price":"15900","currency_code":"UYU","currency_minor_unit":2}` para un Smart TV de $ 15.900; el adaptador divide por 100 y publica $ 159. El sitio muestra hoy un Smart TV Samsung 32" a $ 178.

**Files:**
- Modify: `classes/retail/types.ts` (`RetailStore.priceInMajorUnits?: boolean`)
- Modify: `classes/retail/stores.ts` (entrada `tyt`)
- Modify: `classes/retail/sources/woocommerce.ts` (`wooPrice(prices, store?)`)
- Create: `classes/retail/unitGuard.ts`
- Modify: `sync_equipar.ts` (aplicar la guarda antes de `buildEquiparCatalog` y sumar la nota a `runs`)
- Test: `tests/retail/unit_guard.test.ts` (nuevo)

**Interfaces:**
- Consumes: `RetailListing` (Task 1).
- Produces:
  ```ts
  export interface UnitGuardDrop { sellerKey: string; spec: string; storeMedianUyu: number; mlMedianUyu: number; n: number }
  export function applyUnitGuard(listings: readonly RetailListing[], usdUyu: number): { listings: RetailListing[]; dropped: UnitGuardDrop[] }
  export function wooPrice(prices: WooProduct["prices"], store?: Pick<RetailStore, "priceInMajorUnits">): number | null
  ```

- [ ] **Step 1: tests que fallan** — `tests/retail/unit_guard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyUnitGuard } from "../../classes/retail/unitGuard";
import { wooPrice } from "../../classes/retail/sources/woocommerce";
import type { RetailListing } from "../../classes/retail/types";

const listing = (over: Partial<RetailListing>): RetailListing => ({
  listingId: Math.random().toString(36), source: "store", sellerKey: "tyt", sellerName: "TYT", channel: "local-store",
  title: "Smart TV 32", url: "https://x", price: 100, currency: "UYU", condition: "new", available: true, image: null,
  brand: "", model: "", catalogId: null, attributes: { CATEGORY_SPEC: "tv" }, rating: null, ratingCount: 0,
  location: null, freeShipping: null, officialStore: true, observedAt: "2026-09-16T00:00:00.000Z", ...over,
});

describe("unidad del Store API de WooCommerce", () => {
  it("respeta currency_minor_unit por defecto", () => {
    expect(wooPrice({ price: "399000", currency_code: "UYU", currency_minor_unit: 2 })).toBe(3990);
  });
  it("una tienda marcada priceInMajorUnits manda pesos enteros aunque declare minor unit 2 (TYT)", () => {
    expect(wooPrice({ price: "15900", currency_code: "UYU", currency_minor_unit: 2 }, { priceInMajorUnits: true })).toBe(15900);
  });
});

describe("guarda de unidad por tienda", () => {
  const ml = Array.from({ length: 6 }, (_, i) =>
    listing({ source: "mercadolibre", sellerKey: `ml:${i}`, sellerName: `v${i}`, price: 15000 + i * 500 })
  );
  it("descarta una tienda cuya mediana queda 20 veces por debajo de MercadoLibre en la misma categoría", () => {
    const tyt = Array.from({ length: 5 }, (_, i) => listing({ price: 159 + i }));
    const { listings, dropped } = applyUnitGuard([...ml, ...tyt], 40);
    expect(listings.filter((l) => l.sellerKey === "tyt")).toHaveLength(0);
    expect(dropped).toEqual([expect.objectContaining({ sellerKey: "tyt", spec: "tv", n: 5 })]);
  });
  it("también la que queda 20 veces por encima", () => {
    const wrong = Array.from({ length: 5 }, (_, i) => listing({ sellerKey: "x", price: 1_600_000 + i }));
    expect(applyUnitGuard([...ml, ...wrong], 40).listings.filter((l) => l.sellerKey === "x")).toHaveLength(0);
  });
  it("no toca una tienda con precios normales ni decide con muestras chicas", () => {
    const ok = Array.from({ length: 5 }, (_, i) => listing({ sellerKey: "ok", price: 14000 + i }));
    const few = Array.from({ length: 4 }, (_, i) => listing({ sellerKey: "few", price: 150 + i }));
    const { listings, dropped } = applyUnitGuard([...ml, ...ok, ...few], 40);
    expect(listings.filter((l) => l.sellerKey === "ok")).toHaveLength(5);
    expect(listings.filter((l) => l.sellerKey === "few")).toHaveLength(4);
    expect(dropped).toHaveLength(0);
  });
  it("compara en pesos: una tienda en USD no es sospechosa por el número chico", () => {
    const usd = Array.from({ length: 5 }, (_, i) => listing({ sellerKey: "usd", currency: "USD", price: 380 + i }));
    expect(applyUnitGuard([...ml, ...usd], 40).listings.filter((l) => l.sellerKey === "usd")).toHaveLength(5);
  });
});
```

- [ ] **Step 2:** `npx vitest run tests/retail/unit_guard.test.ts` → FAIL.

- [ ] **Step 3: implementación.**
  - `RetailStore.priceInMajorUnits?: boolean` con comentario: "The Store API declares `currency_minor_unit` but sends whole units (TYT: "15900" is $ 15.900). Verified 2026-09-16."
  - `stores.ts`: `tyt` suma `priceInMajorUnits: true` y el mismo comentario.
  - `wooPrice(prices, store?)`: si `store?.priceInMajorUnits` el divisor es 1. Pasar `store` en el armado del listing y en el `regular_price` de la Task 1.
  - `unitGuard.ts`: agrupar por `attributes.CATEGORY_SPEC`; mediana de MercadoLibre en UYU (`currency === "USD" ? price * usdUyu : price`) con ≥5 avisos; por `(sellerKey, spec)` de `source === "store"` con ≥5 avisos, mediana en UYU; si `storeMedian < mlMedian / 20 || storeMedian > mlMedian * 20` se descartan TODOS los avisos de esa tienda en esa categoría y se registra el `UnitGuardDrop`. Mediana con `percentile(sorted, 0.5)` de `classes/precios/plausibility.ts`. Comentario de cabecera con el caso TYT y por qué el umbral es 20 (la unidad equivocada es ×100; 20 deja lejos cualquier tienda legítimamente barata).
  - `sync_equipar.ts`: después de tener `usdUyu`, `const guarded = applyUnitGuard(harvest.listings, usdUyu)`; usar `guarded.listings` en `buildEquiparCatalog` y en el conteo `listings`; por cada `dropped`, loguear `[equipar] unidad: <sellerKey> en <spec> mediana $<store> contra $<ml> de ML — descartada` y agregar al `run` de esa tienda (buscar por `key === sellerKey`) la nota `, descartada en <spec> por unidad`.

- [ ] **Step 4:** `npx vitest run tests/retail tests/equipar` → PASS.

- [ ] **Step 5: commit** — `fix(retail): TYT manda pesos enteros y guarda de unidad por tienda`.

---

### Task 3: Calidad de la clasificación de equipar (casos medidos en producción)

**Files:**
- Modify: `classes/equipar/registry.ts`
- Modify: `classes/equipar/classify.ts` (`UNIT_PATTERNS.btu`)
- Create: `scripts/oneoff/equipar_dry_run.ts` (cosecha una tienda o ML sin escribir base, imprime lo clasificado)
- Test: `tests/equipar/production_cases.test.ts` (nuevo)

**Interfaces:**
- Consumes: `categoryFor`, `variantFor`, `EQUIPAR_BY_KEY`.
- Produces: variantes nuevas `aire-acondicionado:9000` y `aire-acondicionado:portatil` (claves estables que usa la Task 6).

- [ ] **Step 1: tests que fallan** — `tests/equipar/production_cases.test.ts`. Cada título es real (APP DB `equiparitems`, 16/9/2026):

```ts
import { describe, expect, it } from "vitest";
import { categoryFor, variantFor } from "../../classes/equipar/classify";
import { EQUIPAR_BY_KEY } from "../../classes/equipar/registry";

const keyOf = (title: string): string | null => categoryFor(title)?.key ?? null;
const variantOf = (category: string, title: string): string => variantFor(EQUIPAR_BY_KEY.get(category)!, title).key;

describe("lo que se coló en producción el 16/9/2026", () => {
  it.each([
    ["Convector Kassel Ks-Con3002 Split Digital 2000w", "aire-acondicionado"],
    ["Mueble Mf211 Blanco 130X63X47Cm Para Microondas", "microondas"],
    ["Batidora Arno Chef, con bowl de 5 litros apto microondas y freezer (-20°C Mín y 80 °C Máx)", "microondas"],
    ["Gas Butano 220 Gr. Cocinilla O Anafe Isobutano 4 Vientos", "cocina"],
    ["Cartucho Gas Butano Campgas Ntk Anafe Camping Repostería", "cocina"],
    ["Linterna de camping multifunción Xiaomi", "impresora"],
    ["Arrocera Inteligente Xiaomi Smart Multifunción Rice Cooker", "impresora"],
    ["Cama Box Base Para Colchon De 140x190 032 Altura Ecoline Azul Oscuro O Negro", "colchon"],
    ["Lavarropas Semi-automático Enxuta Lenx7500 Blanco 5kg Amv", "lavarropas"],
    ["Lavarropas 13 Kg Arno Semi-automatico (Sin centrifutgado), posee 5 Programas Y Timer Negro", "lavarropas"],
    ["Lavarropas Enxuta Leb7200 7.2 Kgs Doble Cuba", "lavarropas"],
    ["Calentador Instantáneo Calefon A Gas Mega 7lts Tiro Natural", "calefon"],
  ])("%s no es %s", (title, category) => {
    expect(keyOf(title)).not.toBe(category);
  });

  it("siguen entrando los que sí son", () => {
    expect(keyOf("Impresora Multifuncion Brother DCP-T230")).toBe("impresora");
    expect(keyOf("Microondas Panavox M20n 20l 700w 11 Niveles Mecánico Negro")).toBe("microondas");
    expect(keyOf("Anafe A Gas Smartlife 5 Hornallas 70x60cm Inox C/encendido Color Plateado")).toBe("cocina");
    expect(keyOf("Aire Acondicionado Split Hogaron 12000 BTU Frío/Calor con Gas R32 y Caño de Cobre")).toBe("aire-acondicionado");
    expect(keyOf("Colchón 2 Plazas Kingshouse Espuma Alta Densidad Premium 14 188x138x14 Cm")).toBe("colchon");
    expect(keyOf("Calefón Termotanque Eléctrico Enxuta 40L Aislación Acero Anticorrosivo")).toBe("calefon");
  });

  it("aire: 9.000 BTU es su propia variante, con o sin espacio antes de BTU", () => {
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Futura 9000btu Fut-09aa-c")).toBe("9000");
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Greenwind 9000 Btu Color Blanco")).toBe("9000");
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Greenwind Inverter Con Wifi 12000 Btu Bla")).toBe("12000");
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Split Xion Frio Calor 18000 Btu Eficien B")).toBe("18000");
    expect(variantOf("aire-acondicionado", "Aire Acondicionado Portátil 12000 BTU Frío")).toBe("portatil");
  });
});
```

- [ ] **Step 2:** `npx vitest run tests/equipar/production_cases.test.ts` → FAIL.

- [ ] **Step 3: implementación en `registry.ts` / `classify.ts`.**
  - `UNIT_PATTERNS.btu`: `/(\d{1,2}[.,]?\d{3})\s*(?:btu|btus)\b/` y normalizar el número quitando `.`/`,` antes de `Number()` (el título "12.000 BTU" también debe leer 12000). Verificar que `numericValue` siga devolviendo `null` sin unidad.
  - `aire-acondicionado`:
    - `include: /\b(aire acondicionado|aire split|split (inverter|frio|on ?off)|\d{4,5} ?btu)\b/` y `exclude: /\b(convector|estufa|calefactor|caloventor|portatil de aire|caño|instalacion|soporte|bomba|control remoto)\b/`.
    - variantes (orden de `rank` = tamaño): `{ key: "portatil", label: "Portátil", match: /\bportatil\b/, rank: 1 }`, `{ key: "9000", label: "9.000 BTU", numeric: { unit: "btu", min: 1000, max: 10499 }, rank: 2 }`, `{ key: "12000", label: "12.000 BTU", numeric: { unit: "btu", min: 10500, max: 12999 }, fallback: true, rank: 3 }`, `{ key: "18000", label: "18.000 BTU o más", numeric: { unit: "btu", min: 13000, max: 40000 }, rank: 4 }`.
    - `mlQueries` suma `"aire acondicionado 9000 btu"` y `"aire acondicionado portatil"`; `storeQueries` suma `"aire portatil"`.
    - **Revisar `classes/equipar/basket.ts`**: si las canastas eligen la variante "típica" por posición/rank, confirmar con `tests/equipar/basket.test.ts` que la canasta completa sigue tomando 12.000 BTU; si la regla es "la del medio", fijar explícitamente la típica por `fallback` y ajustar el test con un comentario.
  - `microondas.exclude`: `/\b(bandeja|plato giratorio|grill de repuesto|mueble|soporte|estante|apto microondas|para microondas|bowl|recipiente|tupper|batidora|olla|tapa)\b/`.
  - `cocina.exclude`: sumar `cartucho|gas butano|isobutano|garrafa|camping|cocinilla`.
  - `impresora.include`: `/\bimpresora\b/` (sacar `multifuncion` suelto).
  - `colchon.exclude`: sumar `base para colchon|cama box|sommier base|base de cama|protector|\d+ ?(gr|grs|gramos|ml)\b`.
  - `lavarropas.exclude`: `/\b(secarropas|semi ?-?automatic\w*|doble cuba|para bebe|de juguete|industrial)\b/` (el guion de "Semi-automático" sobrevive a `norm`).
  - `calefon.exclude`: sumar `a gas|tiro natural|instantaneo`.
  - `tv` variantes: sólo cambiar labels a `"Hasta 39 pulgadas"`, `"40 a 49 pulgadas"`, `"50 pulgadas o más"` (las claves NO cambian: hay historia guardada bajo `tv:32`, `tv:43`, `tv:55`).
- [ ] **Step 4: script de diagnóstico sin base** — `scripts/oneoff/equipar_dry_run.ts`:
  ```ts
  // Dry run: harvests one store (or ML) with the equipar specs and prints how each listing was
  // classified. Writes NOTHING — no appdb import. Usage: npx ts-node scripts/oneoff/equipar_dry_run.ts eldorado [categoria]
  import { harvestRetail } from "../../classes/retail/harvest";
  import { retailStores } from "../../classes/retail/stores";
  import { equiparSpecs } from "../../classes/equipar/classify";
  const [storeKey = "eldorado", only] = process.argv.slice(2);
  (async () => {
    const specs = equiparSpecs().filter((s) => !only || s.key === only);
    const stores = storeKey === "ml" ? [] : retailStores([storeKey]);
    const harvest = await harvestRetail({ stores, specs, maxMlScans: storeKey === "ml" ? 6 : 0, maxFbQueries: 0 });
    for (const l of harvest.listings) console.log(l.attributes.CATEGORY_SPEC, "|", l.currency, l.price, "|", l.brand, "|", l.model, "|", l.title);
    for (const r of harvest.runs) console.log(r.key, r.ok, r.listings, r.note);
  })();
  ```
  Correr `npx ts-node scripts/oneoff/equipar_dry_run.ts eldorado colchon`. **Objetivo:** encontrar por qué productos como "calcar de frutillas 130gr" (yogur, $ 70) quedaron en `colchon:2plazas` (vendedor El Dorado, VTEX). Si el listing tiene título de colchón con `brand`/`model` de otro producto, el bug está en `classes/retail/sources/vtex.ts` (mezcla de SKUs/productos): arreglarlo ahí y agregar a `tests/retail/` un test con el fragmento de respuesta VTEX que lo reproduce. Si el título mismo es del yogur, el bug está en el `accept`/contexto: arreglar y fijar el título en `production_cases.test.ts`. Documentar la causa en el commit. Si `maxMlScans: 0` no corta ML (revisar `harvestMercadoLibre(specs, 0)`: `plan.slice(0, 0)`), ajustar el script, no el harvester.
- [ ] **Step 5:** `npx vitest run tests/equipar tests/retail` → PASS (incluye los tests previos de clasificación, bandas y canasta).
- [ ] **Step 6: commit** — `fix(equipar): lo que se colaba en producción (convector, muebles, cartuchos, semiautomáticos) y 9.000 BTU`.

---

### Task 4: Productos agrupados por catálogo de MercadoLibre

Medido: 109 productos, 0 con dos vendedores. ML trae `catalog_product_id` (ya en `RetailListing.catalogId`) y nadie lo usa.

**Files:**
- Modify: `classes/equipar/catalog.ts` (`buildProducts`)
- Test: `tests/equipar/catalog_products.test.ts` (nuevo)

**Interfaces:**
- Consumes: `RetailListing.catalogId`, `identify()`.
- Produces: `EquiparProduct` sin cambios de forma; `sellers` cuenta vendedores distintos (por `seller` normalizado).

- [ ] **Step 1: test que falla** — tres avisos de ML con el mismo `catalogId` y vendedores distintos (títulos con variaciones: "Heladera Panavox BC-450 Frío Seco 338L Blanca", "Heladera Panavox Bc450 338 Litros", "Panavox BC-450 heladera frio seco") + un aviso de tienda "Heladera Panavox BC-450 338L" sin `catalogId` con `brand: "Panavox"`: `buildEquiparCatalog({ listings, usdUyu: 40 })` debe dar en `heladera:grande` UN producto con `sellers === 4` y 4 ofertas ordenadas por precio. Y dos avisos con `catalogId` distinto nunca se juntan aunque el título sea igual. Usar el helper de listing de `tests/equipar/catalog.test.ts` (copiarlo si no está exportado).
- [ ] **Step 2:** `npx vitest run tests/equipar/catalog_products.test.ts` → FAIL.
- [ ] **Step 3: implementación.** En `buildProducts`:
  1. Primera pasada: avisos nuevos, no Facebook, con `catalogId` → grupo `cat:<catalogId>`. Identidad del grupo: el `identify()` más frecuente entre sus avisos; si ninguno identifica, marca = `norm(listing.brand)` y modelo = título normalizado sin la palabra de la categoría, recortado a 4 palabras.
  2. Índice `marca|modelo` → clave de grupo de catálogo (sólo cuando el grupo tiene identidad por `identify()`).
  3. Segunda pasada: avisos nuevos sin `catalogId` con `identify()` → si su `marca|modelo` está en el índice, se suman a ese grupo; si no, grupo propio `id:<marca>|<modelo>` (comportamiento actual).
  4. `sellers` = cantidad de `norm(offer.seller)` distintos. Nombre, slug, orden y `slice(0, 12)` como hoy.
  Comentario: por qué el catálogo manda (el mismo producto con cuatro títulos distintos) y por qué la tienda se suma sólo por marca+modelo exactos.
- [ ] **Step 4:** `npx vitest run tests/equipar` → PASS.
- [ ] **Step 5: commit** — `feat(equipar): productos agrupados por catálogo de MercadoLibre`.

---

### Task 5: Historial por oferta (`classes/pricewatch/`)

**Files:**
- Create: `classes/pricewatch/types.ts`, `classes/pricewatch/record.ts`
- Create: `classes/models/PricewatchOffer.ts`
- Modify: `sync_equipar.ts`, `sync_chairs.ts` (llamar después de guardar el catálogo)
- Test: `tests/pricewatch/record.test.ts` (nuevo)

**Interfaces:**
- Consumes: `RetailListing` con `listPrice`.
- Produces:
  ```ts
  export interface PricewatchPoint { d: string; p: number; lp: number | null }
  export function pricewatchEligible(listing: RetailListing): boolean
  export function pricewatchOperation(listing: RetailListing, vertical: string, today: string, maxPoints?: number): { updateOne: { filter: { listingId: string }; update: object[]; upsert: true } }
  export async function recordPricewatch(listings: readonly RetailListing[], vertical: string, today?: string): Promise<{ written: number; skipped: number }>
  ```
  Colección APP DB `pricewatchoffers`; campos: `listingId, vertical, category, productKey, source, sellerKey, sellerName, title, url, currency, firstSeen, lastSeen, history`.

- [ ] **Step 1: tests que fallan** — `tests/pricewatch/record.test.ts` (sin base):
  - `pricewatchEligible`: Facebook → false; ML usado → false; tienda `condition: "unknown"` → true; precio 0 → false; sin url → false.
  - `pricewatchOperation`: `filter` es `{ listingId }`; `upsert: true`; el update es un **pipeline** (array); el `$set` guarda `productKey = "ml:<catalogId>"` cuando hay `catalogId` y `null` si no; `category` = `attributes.CATEGORY_SPEC ?? null`.
  - **Trampa de literales:** un título que empieza con `$` ("$ 4.500 Colchón 2 plazas") debe viajar envuelto en `{ $literal: … }` — si no, Mongo lo lee como ruta de campo. Assert: `JSON.stringify(op.updateOne.update)` contiene `"$literal":"$ 4.500 Colchón 2 plazas"`. Lo mismo para `sellerName`, `url`, `title`.
  - La expresión de `history` quita el punto de hoy y agrega `{ d: today, p, lp }` recortando a los últimos `maxPoints` (120): assert sobre la forma (`$slice` con `-120`, `$filter` con `$ne: ["$$this.d", today]`).
  - Test de la lógica aplicada, sin Mongo: exportar además `export function applyHistory(history: PricewatchPoint[] | undefined, point: PricewatchPoint, maxPoints = 120): PricewatchPoint[]` (misma semántica que el pipeline, en JS) y probar: reemplaza el punto del mismo día, agrega uno nuevo, recorta a 120, arranca vacío.
- [ ] **Step 2:** `npx vitest run tests/pricewatch` → FAIL.
- [ ] **Step 3: implementación.**
  - `classes/models/PricewatchOffer.ts` (backend-only; no hay espejo en el app todavía, lo lee sólo el job de D): schema con los campos de arriba (`history: { type: [Schema.Types.Mixed], default: [] }`), `timestamps: true`, índices `{ listingId: 1 }` único, `{ vertical: 1, lastSeen: 1 }`, `{ productKey: 1 }`; `export const PricewatchOfferModel = appModel<…>("PricewatchOffer", schema, "pricewatchoffers")`. Copiar la forma de `classes/models/EquiparItem.ts`.
  - `record.ts`: `pricewatchOperation` arma
    ```ts
    const lit = (value: unknown) => ({ $literal: value });
    [{ $set: {
      listingId: lit(listing.listingId), vertical: lit(vertical), category: lit(listing.attributes.CATEGORY_SPEC ?? null),
      productKey: lit(listing.catalogId ? `ml:${listing.catalogId}` : null), source: lit(listing.source),
      sellerKey: lit(listing.sellerKey), sellerName: lit(listing.sellerName), title: lit(listing.title), url: lit(listing.url),
      currency: lit(listing.currency), firstSeen: { $ifNull: ["$firstSeen", today] }, lastSeen: lit(today),
      history: { $slice: [{ $concatArrays: [
        { $filter: { input: { $ifNull: ["$history", []] }, cond: { $ne: ["$$this.d", today] } } },
        [{ d: lit(today), p: lit(listing.price), lp: lit(listing.listPrice ?? null) }],
      ] }, -maxPoints] },
    } }]
    ```
    `recordPricewatch` filtra elegibles, deduplica por `listingId` (el más barato), crea índices una vez por proceso (`await PricewatchOfferModel.createIndexes()`), y escribe con `bulkWrite(ops, { ordered: false })` en lotes de 1.000. `today` por defecto `new Date().toISOString().slice(0, 10)`.
  - `sync_equipar.ts`: después de `saveEquiparCatalog`, dentro de `try/catch` propio: `const pw = await recordPricewatch(guarded.listings, "equipar"); console.log(\`[equipar] pricewatch ${pw.written} ofertas\`)`; en `catch` loguear y seguir (`process.exit(0)` igual). Comentario: un fallo del historial nunca cuesta el catálogo.
  - `sync_chairs.ts`: el mismo bloque con `vertical: "sillas"` después de guardar el catálogo, sobre los listings que usó para armarlo (leer el archivo para ubicar la variable).
- [ ] **Step 4:** `npx vitest run tests/pricewatch tests/equipar tests/chairs tests/sync` → PASS; `npm run build` → sin errores.
- [ ] **Step 5: commit** — `feat(pricewatch): historial diario por oferta desde equipar y sillas`.

---

### Task 6: Espejo de categorías y contenido por categoría en el app

**Files:**
- Create: `app/utils/equiparCategoryPages.ts`
- Test: `app/tests/unit/equiparCategoryPages.test.ts`, `tests/equipar/app_mirror_parity.test.ts` (raíz)

**Interfaces:**
- Consumes: tipos de `app/utils/equipar.ts` (`EquiparItemDoc`, `EquiparTier`, `EquiparRoom`, `equiparMoney`), tarifa de UTE exportada por `app/utils/householdBills.ts` (buscar el export que contiene los escalones con `pricePerKwh`), `FaqItem` (ver `components/Faq/FaqSection.vue`).
- Produces:
  ```ts
  export interface EquiparCategoryPage {
    key: string; label: string; plural: string; h1: string; description: string;
    room: EquiparRoom; tier: EquiparTier;
    guide: readonly string[] | null;       // "Qué mirar al comprar"
    planRedondo: string | null;            // aplica / no aplica, con su condición
    wattsExample: number | null;           // estufa/ventilador: W de ejemplo para el costo por hora
  }
  export const EQUIPAR_CATEGORY_PAGES: readonly EquiparCategoryPage[]
  export function equiparCategoryPage(slug: string): EquiparCategoryPage | undefined
  export function isEquiparCategorySlug(slug: string): boolean
  export function equiparCategoryTitle(page: EquiparCategoryPage, items: readonly EquiparItemDoc[]): string
  export function equiparCategoryFaq(page: EquiparCategoryPage, items: readonly EquiparItemDoc[], generatedAt: string | null): Array<{ question: string; answer: string }>
  export function equiparHourlyCostUyu(watts: number): number   // kWh × $/kWh del escalón 101–600 × 1,22
  export const EQUIPAR_PLAN_REDONDO_SOURCE = 'https://www.ute.com.uy/clientes/soluciones-para-el-hogar/planredondo'
  ```

- [ ] **Step 1: tests que fallan.**
  - Raíz `tests/equipar/app_mirror_parity.test.ts`: importar `EQUIPAR_CATEGORIES` de `classes/equipar/registry` y `EQUIPAR_CATEGORY_PAGES` de `../../app/utils/equiparCategoryPages`; exigir mismas claves en el mismo orden, mismo `tier`, `room` y `label`.
  - App `app/tests/unit/equiparCategoryPages.test.ts`:
    - `isEquiparCategorySlug('aire-acondicionado')` true; `'aire'`, `''`, `'../x'` false.
    - todo `h1` ≤ 70 caracteres, todo `description` entre 110 y 160, sin la palabra "septiembre".
    - `planRedondo` no nulo exactamente en `calefon`, `aire-acondicionado`, `secarropas`, `cocina`, `lavarropas`, `horno-electrico`, `microondas`, y en `heladera` es `null` (el plan no la lista).
    - `equiparCategoryTitle` con un item `aire-acondicionado:12000` con `newBand.median = 16085` devuelve un título que contiene `$ 16.085` y ≤ 70 caracteres; sin bandas devuelve el `h1`.
    - `equiparCategoryFaq` para `colchon` (usedOk false) incluye una pregunta sobre comprar usado cuya respuesta NO recomienda usado; para `heladera` con bandas nueva y usada incluye la mediana de cada una.
    - `equiparHourlyCostUyu(2000)` = `Math.round(2 * <pricePerKwh del escalón 101–600> * 1.22 * 10) / 10` leyendo la constante (no un número fijo en el test).
- [ ] **Step 2:** correr ambos tests → FAIL.
- [ ] **Step 3: implementación.** Una entrada por categoría del registro, en el mismo orden. `h1` = `Precio de <plural> en Uruguay` (casos especiales: `aire-acondicionado` → `Precio de aire acondicionado en Uruguay: 9.000, 12.000 y 18.000 BTU`; `tv` → `Precio de televisores en Uruguay`; `mesa-sillas` → `Precio de juego de mesa y sillas en Uruguay`; `limpieza` → `Precio del kit de limpieza para una casa en Uruguay`). `description` sin cifras (las cifras van en el título dinámico). `equiparCategoryTitle`: variante con `fallback` del registro — el espejo no la conoce, así que usar la variante con más observaciones nuevas — `${h1corto}: mediana $ ${n}` donde `h1corto` = `Precio de <plural> en Uruguay`; si pasa de 70, `<Plural> en Uruguay: mediana $ <n>`.

  **`guide`** (textos exactos; son afirmaciones generales verificables, sin cifras propias):
  - `heladera`: ["Frío húmedo o frío seco (no frost): el no frost no junta hielo y suele costar más.", "Los litros del aviso son totales: incluyen el freezer.", "Mirá la etiqueta de eficiencia energética: en Uruguay es obligatoria para heladeras y la clase A es la que menos consume.", "Medí el hueco y dejá espacio atrás y arriba para que el motor ventile; el manual dice cuánto.", "Usada conviene sólo si la ves enfriando: el compresor es lo que falla y no se ve en una foto."]
  - `lavarropas`: ["Carga frontal o superior: la frontal suele gastar menos agua; la superior no te obliga a agacharte.", "Los kilos son de ropa seca: para una o dos personas alcanza con 6 a 7 kg.", "Más revoluciones de centrifugado dejan la ropa más seca.", "Semiautomático o doble cuba no es lo mismo que automático: hay pasos que se hacen a mano, y por eso no entran en esta comparación."]
  - `aire-acondicionado`: ["Los BTU dependen del ambiente: tamaño, orientación, aislación y altura del techo. Pedile al instalador que lo calcule para tu cuarto.", "Inverter regula la potencia del compresor: cuesta más y consume menos si lo usás muchas horas.", "Frío/calor sirve de calefacción en invierno.", "El precio publicado casi nunca incluye la instalación (caños, soporte, mano de obra): preguntá antes de comparar.", "Un portátil no necesita instalación, pero enfría menos y hace más ruido que un split de los mismos BTU."]
  - `colchon`: ["Espuma o resortes: en espuma mirá la densidad; en resortes, si son independientes (pocket) o de bloque.", "Medidas habituales: 1 plaza 80 u 88 × 190 cm, 2 plazas 140 × 190 cm, queen 160 × 200 cm, king 200 × 200 cm. Confirmá la de tu cama.", "No lo compres usado: es el único ítem de esta lista donde lo barato es el mal consejo."]
  - `tv`: ["Las pulgadas se eligen por la distancia al sillón: a más distancia, más pantalla.", "4K empieza a notarse desde 43 o 50 pulgadas.", "Fijate el sistema (Google TV, webOS, Tizen u otro): define qué aplicaciones podés instalar.", "Garantía oficial o importado: el precio más bajo a veces es un equipo sin garantía en Uruguay."]
  - `calefon`: ["Más personas, más litros: un calefón chico se queda sin agua caliente en la segunda ducha.", "La etiqueta de eficiencia energética es obligatoria: la clase A pierde menos calor.", "Cuba de acero, esmaltada o de cobre: cambia la duración en zonas de agua dura.", "Los calefones instantáneos a gas son otro producto y no están en esta comparación."]
  - `microondas`: ["20 litros alcanzan para calentar; para platos grandes, 25 a 30 litros.", "Con grill dora; sin grill sólo calienta.", "Digital o mecánico: el mecánico tiene menos que romperse."]
  - `cocina`: ["Supergás (garrafa) o gas natural por cañería: la conexión es distinta, confirmala antes de comprar.", "Buscá termocupla: corta el gas si la llama se apaga.", "Las de inducción necesitan ollas que sirvan para inducción."]
  - `secarropas`: ["Centrífugo sólo escurre; de tambor (a calor) seca.", "El centrífugo es más barato y casi no gasta luz; el de tambor consume bastante más."]
  - `estufa`: ["Caloventor, oleoeléctrica, panel o a gas: el caloventor calienta rápido y fuerte; la oleoeléctrica tarda pero es pareja y silenciosa.", "La potencia en W define el consumo: el costo por hora está abajo."]
  - `ventilador`: ["De pie, de techo o turbo: el de techo mueve más aire en toda la habitación.", "Un ventilador gasta muy poco: el costo por hora está abajo."]
  - `aspiradora`: ["Trineo, escoba inalámbrica o robot: la inalámbrica es cómoda para el día a día y tiene autonomía limitada.", "Con bolsa o ciclónica (sin bolsa): la ciclónica no requiere comprar bolsas."]
  - resto: `null`.

  **`planRedondo`** (fuente `EQUIPAR_PLAN_REDONDO_SOURCE`, verificada 16/9/2026; compras del 1/9/2026 al 31/3/2027; el descuento va en la factura de UTE, hasta 6 equipos por cliente, con potencia contratada de hasta 40 kW, registrando la factura electrónica; el equipo tiene que quedar instalado en ese servicio):
  - `calefon`: "Si es de 40 litros o más y clase A, UTE descuenta $ 2.500 (IVA incluido) en la factura; si es con bomba de calor, $ 5.000."
  - `aire-acondicionado`: "Si es clase A en frío y en calor, UTE descuenta $ 2.500 (IVA incluido) en la factura."
  - `secarropas`: "Sólo los de tambor: UTE descuenta $ 2.500 (IVA incluido). Los centrífugos no entran."
  - `cocina`: "Sólo las totalmente eléctricas: anafes de inducción o resistivos de 2 hornallas o más, y hornos eléctricos empotrables de 55 litros o más: $ 2.500 (IVA incluido). A gas no entra."
  - `lavarropas`: "Sólo el lavasecarropas entra ($ 2.500, IVA incluido). Un lavarropas común no."
  - `horno-electrico`: "Los hornos de mesa no entran: el plan pide hornos empotrables de 55 litros o más."
  - `microondas`: "Los microondas están excluidos del plan."
  - resto: `null`.

  **`wattsExample`**: `estufa` 2000, `ventilador` 60; resto `null`.

  **`equiparCategoryFaq`** (respuestas armadas con los datos; si no hay banda, la respuesta lo dice): "¿Cuánto sale un/a <label> en Uruguay?" (mediana nueva por variante con n y fecha en `es-UY`), "¿Conviene comprar <label> usado/a?" (usa `usedOk`/`usedNote` de los items; si hay `usedSavingPct`, lo cita; si `usedOk` es false, dice que no), "¿Dónde está más barato/a?" (vendedor de la oferta nueva más barata no sospechosa de la variante con más datos, con la aclaración de que el precio cambia y la fecha), y si `planRedondo` no es null "¿Entra en el Plan Redondo de UTE?".
- [ ] **Step 4:** tests → PASS; `cd app && npm run lint` → sin errores nuevos.
- [ ] **Step 5: commit** — `feat(equipar): contenido y FAQ por categoría (espejo del registro)`.

---

### Task 7: API por categoría

**Files:**
- Create: `app/server/api/equipar/[categoria].get.ts`
- Modify: `app/utils/equipar.ts` (tipo de respuesta)
- Test: `app/tests/unit/equiparCategoryApi.test.ts`

**Interfaces:**
- Consumes: `EquiparItemModel`, `EquiparMetaModel`, `connectDb`, `isEquiparCategorySlug`, `equiparSortItems`.
- Produces: `GET /api/equipar/<categoria>` → `EquiparCategoryResponse = { category: string; generatedAt: string | null; usdUyu: number | null; sources: Array<{ label: string; ok: boolean; listings: number }>; items: EquiparItemDoc[] }` con `history` incluida; **404** (`throw createError({ statusCode: 404 })`) si el slug no es categoría; 200 con `items: []` si no hay datos frescos (mismo `STALE_DAYS = 4` que el índice); en error de base, 200 con forma vacía.
  Export puro para testear: `export function equiparCategoryProjection(items: EquiparItemDoc[]): EquiparItemDoc[]` que deja por item `products` (máx 12, cada uno con máx 6 ofertas), `offers` (máx 8) e `history` (máx 180 puntos).

- [ ] **Step 1:** test de `equiparCategoryProjection` (recortes) → FAIL.
- [ ] **Step 2:** implementar la ruta copiando `app/server/api/equipar/index.get.ts` (cache 900 s): `find({ category: slug, lastSeen: { $gte: cutoff } })` con `.select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })`, meta con `.select({ generatedAt: 1, usdUyu: 1, runs: 1 })` → `sources` = runs mapeados sin `note` ni `key`.
- [ ] **Step 3:** test → PASS; lint → OK.
- [ ] **Step 4: commit** — `feat(equipar): API por categoría con historia`.

---

### Task 8: Página por categoría, índice enlazado, sitemap, nav y contrato SEO

**Files:**
- Move: `app/pages/equipar-casa-uruguay.vue` → `app/pages/equipar-casa-uruguay/index.vue` (con `git mv`; grep de tests/utilidades que referencian el nombre de archivo viejo y actualizarlos)
- Create: `app/pages/equipar-casa-uruguay/[categoria].vue`
- Modify: `app/pages/equipar-casa-uruguay/index.vue` (cada tarjeta de categoría enlaza a su página)
- Modify: `app/server/api/__sitemap__/urls.get.ts`, `app/utils/siteNav.ts` (`DYNAMIC_ROUTE_KEYS`), `app/tests/unit/seoContract.test.ts` (`PROGRAMMATIC_PAGES`)
- Test: `app/tests/unit/equiparCategoryPage.test.ts` (lee el texto del archivo de la página, como otros tests de página del repo)

**Interfaces:**
- Consumes: Task 6 y Task 7.

- [ ] **Step 1: test que falla** — `equiparCategoryPage.test.ts` verifica en el texto de `[categoria].vue`: `definePageMeta` con `validate` que usa `isEquiparCategorySlug`; `useFetch(` con `key:` que contiene la categoría y `transform`; un solo `<h1`; `useSeoMeta(`; `rel: 'canonical'` con `https://cambio-uruguay.com/equipar-casa-uruguay/`; `BreadcrumbList`; `<FaqSection`; `<ChartsLineChart`; la raíz del template es `<VContainer`. Y en `index.vue`: un `localePath(\`/equipar-casa-uruguay/${` en la tarjeta de categoría.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3: la página.** Estructura (familia **sólo en español**: canonical sin prefijo de idioma):
  1. `VBreadcrumbs`: Inicio → Equipar una casa (`/equipar-casa-uruguay`) → `<label>`.
  2. `<h1>{{ page.h1 }}</h1>` y un párrafo: "Relevamos N avisos nuevos y M usados de <label> en tiendas uruguayas, MercadoLibre y Marketplace. Actualizado el <fecha larga es-UY>." (N y M = suma de `newBand.n`/`usedBand.n`).
  3. Tarjetas por variante (orden `variantRank`): label; mediana nueva grande; "la mitad de los avisos entre $ p25 y $ p75"; mediana usada con n y, si hay, "usado sale X % menos"; "sin datos suficientes" cuando falta la banda. Colores: sin azules de primary para texto chico.
  4. Gráfico `<ChartsLineChart>`: una serie por variante con `history[].newMedian` (fechas en eje X formateadas `dd/MM`), `aria-label` descriptivo, sólo si hay ≥3 puntos; si no, texto "La serie arranca el <firstSeen>".
  5. Productos (regime `modelo`): tabla (`VTable`, clase `cu-mobile-cards` con `data-label` por celda) con producto, cantidad de vendedores, mejor precio y hasta 3 ofertas con enlace externo `rel="nofollow noopener"` y `target="_blank"`, vendedor y fecha.
  6. "Los más baratos esta semana": `offers` nuevas primero y usadas aparte, con vendedor, precio, fecha y enlace; aclaración de que las filas sospechosas (`suspectDropped`) no encabezan.
  7. "Por qué está en el tier X": `items[0].reason` + enlace al índice.
  8. "Qué mirar al comprar" si `page.guide`.
  9. "Plan Redondo de UTE" si `page.planRedondo`, con enlace a `EQUIPAR_PLAN_REDONDO_SOURCE` y a `/factura-de-ute-uruguay` (confirmar que la página existe en `app/pages/`; si no, enlazar sólo la fuente).
  10. Costo por hora si `page.wattsExample`: "Una <label> de <W> W prendida una hora cuesta unos $ <equiparHourlyCostUyu(W)> con IVA, si tu casa está en el escalón de 101 a 600 kWh de la tarifa residencial simple."
  11. `<FaqSection :items="faq" heading="Preguntas frecuentes" />`.
  12. "Otras categorías de <ambiente>": enlaces a las demás categorías del mismo `room`.
  13. Método (2–3 frases): nuevo y usado nunca se promedian, variantes, 4 días de frescura, Marketplace sólo en usados.
  - Datos: `const { data } = await useFetch(() => \`/api/equipar/${slug.value}\`, { key: \`equipar-cat-${slug.value}\`, transform: (r) => r })` (la API ya recorta; el `transform` existe para cumplir el patrón y cualquier recorte extra de presentación).
  - SEO: `definePageMeta({ validate: route => isEquiparCategorySlug(String(route.params.categoria ?? '')) })` importando la función; `useSeoMeta` con `title: () => \`${equiparCategoryTitle(page, items)} | Cambio Uruguay\``, `description`, `ogTitle`, `ogDescription`, `ogType: 'website'`, `ogUrl`; `defineOgImageComponent('Cambio', { title, subtitle: 'Equipar una casa', tag: 'PRECIOS' })`; `useHead` con canonical `https://cambio-uruguay.com/equipar-casa-uruguay/<slug>` y JSON-LD `@graph` = `BreadcrumbList` + `ItemList` de hasta 10 `Product` con `offers: { '@type': 'Offer', price, priceCurrency: 'UYU', url }` sólo de productos con precio (nunca `AggregateRating`).
- [ ] **Step 4: índice.** En `index.vue`, el título de cada tarjeta de categoría (`article.cat-card`, alrededor de la línea 82 del archivo viejo) pasa a ser `<NuxtLink :to="localePath(\`/equipar-casa-uruguay/${group.key}\`)">`; agregar además un enlace chico "Ver precios de <label>" al pie de la tarjeta. Mantener el resto intacto.
- [ ] **Step 5: sitemap.** En `urls.get.ts`, bloque `try { await connectDb(); … } catch { console.warn } finally { await disconnectDbAfterPrerender() }` (si ya hay uno con `connectDb` para sillas, sumarse dentro del mismo): `EquiparItemModel.find({ lastSeen: { $gte: cutoff4d } }).select({ category: 1, lastSeen: 1, newBand: 1, usedBand: 1 })`, categorías con al menos una banda → `urls.push({ loc: \`/equipar-casa-uruguay/${slug}\`, lastmod, changefreq: 'daily', priority: 0.6 })` (sólo español; copiar la forma exacta de `loc` que usan comparativas/sucursal en ese archivo) — el literal `` `/equipar-casa-uruguay/${slug}` `` tiene que aparecer tal cual.
- [ ] **Step 6: nav y contrato.** `DYNAMIC_ROUTE_KEYS['equipar-casa-uruguay/[categoria]']` = la sección donde está `/equipar-casa-uruguay` (línea ~2417). Si `siteNav-coverage` pide algo por el `index.vue` movido, ajustar la clave (no tocar `EXCLUDED_ROUTES`). `PROGRAMMATIC_PAGES` suma `{ file: 'equipar-casa-uruguay/[categoria].vue', sitemapMarker: '`/equipar-casa-uruguay/${slug}`' }`.
- [ ] **Step 7: verificar.** `cd app && npm test && npm run lint` → PASS. Levantar dev en ESTE worktree (`npx nuxi prepare && npx nuxt dev --port 3217`), y con `curl --max-time 180`: `/equipar-casa-uruguay/aire-acondicionado` → 200 con `<h1` y el JSON-LD; `/equipar-casa-uruguay/no-existe` → **404**; `/equipar-casa-uruguay` → 200 con enlaces a las categorías. Medir `curl -s URL | wc -c` de la página de categoría y anotar el número en el commit (objetivo < 450 KB). El dev local lee la Mongo local del `app/.env`: si viene sin datos, verificar que la página renderice el estado vacío sin errores; la verificación con datos se hace en producción después del deploy. Apagar el dev server.
- [ ] **Step 8: commit** — `feat(equipar): una página por categoría con historia, productos y FAQ`.

---

### Task 9: Documentación y verificación final

**Files:**
- Modify: `docs/app/EQUIPAR.md` (secciones: errores encontrados en producción y cómo se arreglaron; guarda de unidad; productos por catálogo; páginas por categoría; Plan Redondo con fecha de verificación; sacar "Subpáginas por categoría" de Pendiente)
- Create: `docs/app/PRICEWATCH.md` (qué guarda, por qué por oferta y no por producto, la trampa de `$literal`, quién escribe, 120 días, que D lo va a leer)
- Modify: `AGENTS.md` (fila de `currency-equipar`: mencionar la guarda de unidad y pricewatch; nota breve en la línea de `classes/` sobre `pricewatch/`)

- [ ] **Step 1:** escribir los docs (español, mismo tono que `EQUIPAR.md`: hechos medidos con fecha, sin marketing).
- [ ] **Step 2: verificación completa.** Raíz: `npm test` y `npm run build`. App: `npm test` y `npm run lint`. Pegar el resumen (cantidad de tests, 0 fallas) en el reporte. Si fallan `gemini_key_ownership`/`claude_endpoint_ownership` por copias ajenas del repo, confirmar que en este worktree no hay `.artifacts/`/`.sdd-*` y reportar.
- [ ] **Step 3: commit** — `docs(equipar): calidad, pricewatch y páginas por categoría`.
