# Cambios de precio por aviso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native, este mismo session) para implementar tarea por tarea. Los pasos usan checkbox (`- [ ]`).

**Goal:** que la ficha de cada artículo (auto, alquiler, venta, heladera, celular, silla, monopatín)
muestre cómo cambió el precio de ESE aviso, y que una página publique los últimos cambios.

**Architecture:** no se crea una colección nueva de historial. Se agrega `classes/pricehistory/`, un
LECTOR que normaliza las tres series que ya se escriben (`pricewatchoffers`,
`carlistings.priceHistory`, `marketpricelogs`) a una forma común. Las fichas y directorios adjuntan
la serie del aviso en su endpoint ya existente (lectura por índice único, va en el HTML). La página
de últimos cambios lee un snapshot que escribe un job diario nuevo, nunca agrega en el pedido.

**Tech Stack:** TS 4.9 CommonJS en la raíz (vitest), Nuxt 4 + Vuetify 4.1.5 + vitest en `app/`,
MongoDB (APP DB) vía mongoose, pm2 cron.

**Spec:** `docs/superpowers/specs/2026-09-22-cambios-de-precio-design.md`

## Global Constraints

- La moneda nunca se mezcla ni se convierte: una serie es de UNA moneda; un cambio de moneda corta la
  serie y se marca `currencySwitched: true`.
- Nunca se afirma nada anterior a `firstSeen`: toda la UI lleva "medido desde el <fecha>".
- De `marketpricelogs` y `carlistings` (privadas) se publica SÓLO `{fecha, precio, moneda}` del aviso
  que el lector está mirando. Ningún otro campo cruza la red.
- Facebook Marketplace nunca aporta historial publicado.
- Repo público: cero cifras de ingreso en código, comentarios, docs o mensajes de commit.
- gitleaks: en fixtures y tests, nada de un campo llamado `key` con valor numérico — usar `id`/`slug`
  desde el primer commit (un rename posterior no salva el push).
- El job nuevo va en `OTHER_APPS` de `scripts/deploy-backend.sh` en el mismo commit que lo agrega a
  `ecosystem.config.js`, si no nunca arranca en el VPS.
- La página nueva agrega su fila a `docs/seo/experiments.json` en el mismo commit.
- Ningún `setInterval`/cron dentro del proceso de la API (`currency-server` es cluster ×2).

## Review Focus

1. **Aviso sin historia** (`history: []`, `points: []`, documento ausente): la ficha no debe romper ni
   dibujar una línea; muestra "lo medimos desde el <fecha>" o nada. Test en Task 1 y Task 6.
2. **Punto sin `c`** (pricewatch anterior al 2026-09-17): se trata como "misma moneda que el aviso",
   nunca como moneda distinta que corta la serie. Test en Task 1.
3. **Cambio de moneda** (USD→UYU en el mismo `listingId`): `changePct` se calcula sólo sobre la
   moneda vigente y el aviso no aparece como baja del 4.000 % en la página. Test en Task 1 y Task 3.
4. **Un vendedor que retoca 40 precios el mismo día**: la tabla de la página lo topea en 3 filas, así
   que una automotora no se come la vertical. Test en Task 3.
5. **Snapshot ausente o vencido** (`pricechangesnapshots` vacío, primer deploy): `/api/price-changes`
   devuelve vacío con 200 y la página dice que todavía no hay foto, nunca 500. Test en Task 8.

---

## File Structure

| archivo | responsabilidad |
|---|---|
| `classes/pricehistory/types.ts` | `PriceHistorySeries`, `PriceChange`, `PriceChangeSnapshot`, `PriceHistoryVertical` |
| `classes/pricehistory/normalize.ts` | PURO: 3 adaptadores → serie; corte por moneda; `changePct`/`lastChange` |
| `classes/pricehistory/scan.ts` | PURO: series → cambios de la ventana, orden, topes |
| `classes/pricehistory/read.ts` | lecturas Mongo por id y por lote (APP DB) |
| `classes/pricehistory/refresh.ts` | el job: recorre las 3 colecciones con cursor, arma el snapshot |
| `classes/pricehistory/store.ts` | escribe `pricechangesnapshots` (current + day:, poda 400 d) |
| `classes/models/PriceChangeSnapshot.ts` | modelo raíz |
| `sync_price_changes.ts` | entrypoint pm2 |
| `app/server/models/{PricewatchOffer,MarketPriceLog,PriceChangeSnapshot}.ts` | espejos app |
| `app/utils/priceHistory.ts` | PURO espejo: formato, etiquetas, constantes |
| `app/server/utils/priceHistory.ts` | adjunta series a las respuestas de los endpoints existentes |
| `app/components/PriceHistoryBlock.vue` | el bloque de ficha |
| `app/pages/cambios-de-precio-uruguay.vue` + `app/server/api/price-changes.get.ts` | la página |

---

### Task 1: el lector puro (`normalize.ts`)

**Files:**
- Create: `classes/pricehistory/types.ts`, `classes/pricehistory/normalize.ts`
- Test: `tests/pricehistory/normalize.test.ts`

**Interfaces:**
- Produces: `seriesFromPricewatch(doc, vertical)`, `seriesFromCarListing(doc)`,
  `seriesFromMarketLog(doc)`, todas `→ PriceHistorySeries | null`; `summarize(points)`.

- [ ] **Step 1: Write the failing test** (`tests/pricehistory/normalize.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { seriesFromCarListing, seriesFromMarketLog, seriesFromPricewatch } from "../../classes/pricehistory/normalize";

describe("seriesFromPricewatch", () => {
  it("arma la serie del aviso con su variación", () => {
    const series = seriesFromPricewatch({
      listingId: "ml:MLU123", vertical: "equipar", title: "Heladera", url: "https://x/y",
      sellerKey: "tienda", sellerName: "Tienda", source: "mercadolibre", currency: "UYU",
      firstSeen: "2026-09-17", lastSeen: "2026-09-22",
      history: [{ d: "2026-09-17", p: 30000, lp: null, c: "UYU" }, { d: "2026-09-22", p: 27000, lp: null, c: "UYU" }],
    });
    expect(series?.points).toEqual([{ d: "2026-09-17", p: 30000 }, { d: "2026-09-22", p: 27000 }]);
    expect(series?.changePct).toBeCloseTo(-10, 5);
    expect(series?.lastChange).toEqual({ from: 30000, to: 27000, at: "2026-09-22" });
    expect(series?.currencySwitched).toBe(false);
  });

  it("un punto sin moneda es del aviso, no otra moneda", () => {
    const series = seriesFromPricewatch({
      listingId: "ml:MLU1", vertical: "sillas", title: "Silla", url: "https://x", sellerKey: "s",
      sellerName: "S", source: "mercadolibre", currency: "UYU", firstSeen: "2026-09-10", lastSeen: "2026-09-12",
      history: [{ d: "2026-09-10", p: 5000, lp: null }, { d: "2026-09-12", p: 4500, lp: null, c: "UYU" }],
    });
    expect(series?.points).toHaveLength(2);
    expect(series?.currencySwitched).toBe(false);
  });

  it("corta en el cambio de moneda y no inventa una caída", () => {
    const series = seriesFromPricewatch({
      listingId: "ml:MLU2", vertical: "celulares", title: "Tel", url: "https://x", sellerKey: "s",
      sellerName: "S", source: "mercadolibre", currency: "UYU", firstSeen: "2026-09-01", lastSeen: "2026-09-20",
      history: [{ d: "2026-09-01", p: 300, lp: null, c: "USD" }, { d: "2026-09-20", p: 12000, lp: null, c: "UYU" }],
    });
    expect(series?.points).toEqual([{ d: "2026-09-20", p: 12000 }]);
    expect(series?.changePct).toBeNull();
    expect(series?.currencySwitched).toBe(true);
  });

  it("sin historia devuelve null", () => {
    expect(seriesFromPricewatch({
      listingId: "x", vertical: "equipar", title: "t", url: "https://x", sellerKey: "s", sellerName: "S",
      source: "mercadolibre", currency: "UYU", firstSeen: "2026-09-01", lastSeen: "2026-09-01", history: [],
    })).toBeNull();
  });
});

describe("seriesFromCarListing", () => {
  it("usa observedAt como día y la moneda del punto", () => {
    const series = seriesFromCarListing({
      key: "mercadolibre:MLU9", listing: { title: "Onix 2018", url: "https://x", price: 11900, currency: "USD", sellerName: "Automotora" },
      firstSeen: "2026-09-17", lastSeen: "2026-09-22",
      priceHistory: [
        { price: 12490, currency: "USD", observedAt: "2026-09-17T06:35:09.109Z" },
        { price: 11900, currency: "USD", observedAt: "2026-09-17T20:33:48.260Z" },
      ],
    });
    expect(series?.points).toEqual([{ d: "2026-09-17", p: 12490 }, { d: "2026-09-17", p: 11900 }]);
    expect(series?.lastChange).toEqual({ from: 12490, to: 11900, at: "2026-09-17" });
  });
});

describe("seriesFromMarketLog", () => {
  it("lee points {d,p,c}", () => {
    const series = seriesFromMarketLog({
      key: "alquiler:infocasas:1", vertical: "alquiler", advertId: "infocasas:1",
      firstSeen: "2026-09-08", lastSeen: "2026-09-22",
      points: [{ d: "2026-09-08", p: 15500, c: "UYU" }, { d: "2026-09-19", p: 14500, c: "UYU" }],
    });
    expect(series?.changePct).toBeCloseTo(-6.4516, 3);
    expect(series?.vertical).toBe("alquiler");
  });
});
```

- [ ] **Step 2: Run it** — `npx vitest run tests/pricehistory/normalize.test.ts` → FAIL (módulo inexistente).

- [ ] **Step 3: Implement** `types.ts` y `normalize.ts`.

```ts
// types.ts
export type PriceHistoryVertical = "autos" | "alquiler" | "venta" | "equipar" | "sillas" | "celulares" | "movilidad";
export interface PriceHistoryPoint { d: string; p: number }
export interface PriceHistorySeries {
  vertical: PriceHistoryVertical;
  id: string;
  title: string;
  url: string;
  sellerName: string;
  sellerKey: string;
  currency: "UYU" | "USD";
  points: PriceHistoryPoint[];
  firstSeen: string;
  lastSeen: string;
  changePct: number | null;
  lastChange: { from: number; to: number; at: string } | null;
  currencySwitched: boolean;
  source: "pricewatch" | "carlistings" | "marketpricelogs";
}
```

`normalize.ts` — reglas: se conserva sólo la cola de puntos cuya moneda **conocida** coincide con la
del último punto (un punto sin moneda hereda la del documento); `changePct` es
`(último − primero) / primero * 100` con 2 decimales y `null` si queda un solo punto; `lastChange` es
el último par consecutivo con precio distinto.

- [ ] **Step 4: Run tests** → PASS. Además `npx vitest run tests/pricewatch` sigue verde.
- [ ] **Step 5: Commit** — `feat(precios): lector normalizado del historial por aviso`.

---

### Task 2: lecturas Mongo (`read.ts`)

**Files:**
- Create: `classes/pricehistory/read.ts`
- Test: `tests/pricehistory/read.test.ts` (modelos simulados con `vi.mock`, sin base)

**Interfaces:**
- Consumes: Task 1.
- Produces: `readPricewatchSeries(ids)`, `readCarSeries(keys)`, `readMarketSeriesLogs(vertical, ids)`,
  cada una `→ Map<string, PriceHistorySeries>`; `PRICE_HISTORY_ID_MAX = 60`.

- [ ] **Step 1: test** — que cada lectura topee en 60 ids, proyecte sólo los campos necesarios
  (`expect(projection).toEqual({...})`) y devuelva un Map vacío con lista vacía sin ir a Mongo.
- [ ] **Step 2: correr** → FAIL.
- [ ] **Step 3: implementar** con `PricewatchOfferModel`, `appConnection().collection("carlistings")`
  (proyección `{ key: 1, "listing.title": 1, "listing.url": 1, "listing.sellerName": 1, "listing.currency": 1, priceHistory: 1, firstSeen: 1, lastSeen: 1 }`) y
  `appConnection().collection("marketpricelogs")`.
- [ ] **Step 4: correr** → PASS.
- [ ] **Step 5: commit** — `feat(precios): lecturas por id del historial`.

---

### Task 3: el barrido puro (`scan.ts`)

**Files:**
- Create: `classes/pricehistory/scan.ts`
- Test: `tests/pricehistory/scan.test.ts`

**Interfaces:**
- Produces: `changesFromSeries(series, today, { windowDays = 7, perSeller = 3, perVertical = 25 })`
  `→ PriceChange[]`; `PriceChange = { vertical, id, title, url, sellerName, sellerKey, from, to, currency, at, pct, direction: "baja" | "suba" }`.

- [ ] **Step 1: test** — (a) un cambio de hace 3 días entra y uno de hace 20 no; (b) orden por `|pct|`
  descendente; (c) un vendedor con 5 cambios aporta 3 filas; (d) una serie con `currencySwitched` y un
  solo punto no entra; (e) tope por vertical.
- [ ] **Step 2: correr** → FAIL. **Step 3: implementar. Step 4: correr** → PASS.
- [ ] **Step 5: commit** — `feat(precios): barrido de cambios recientes`.

---

### Task 4: el job `currency-price-changes`

**Files:**
- Create: `classes/pricehistory/{refresh.ts,store.ts}`, `classes/models/PriceChangeSnapshot.ts`,
  `sync_price_changes.ts`
- Modify: `ecosystem.config.js`, `scripts/deploy-backend.sh` (`OTHER_APPS`), `AGENTS.md` (fila de la tabla)
- Test: `tests/pricehistory/refresh.test.ts`

**Interfaces:**
- Produces: `buildPriceChangeSnapshot(input)` puro y `runPriceChanges()`; documento
  `{ key, day, generatedAt, verticals: [{ vertical, tracked, withHistory, drops, rises, trackingSince }], changes: PriceChange[] }`.

- [ ] **Step 1: test** — la guarda de corrida flaca (primera corrida escribe aunque traiga 0; con ≥20
  publicados y menos del 40 %, no escribe y devuelve `{ written: false }`), y que `day:` se poda a 400.
- [ ] **Step 2: correr** → FAIL. **Step 3: implementar** (cursor `.find().batchSize(500)` por colección,
  proyección mínima, sin cargar todo en memoria). **Step 4: correr** → PASS.
- [ ] **Step 5: commit** — `feat(precios): job diario de cambios de precio`.

Cron: `9 16 * * *` (después de market-series 13:03, phones 14:29, movilidad 15:33; el minuto :09 no lo
usa ninguna horaria).

---

### Task 5: espejos en `app/` y el adjuntador

**Files:**
- Create: `app/server/models/{PricewatchOffer,MarketPriceLog,PriceChangeSnapshot}.ts`,
  `app/utils/priceHistory.ts`, `app/server/utils/priceHistory.ts`,
  `classes/models/MarketPriceLog.ts` (para la paridad)
- Test: `app/tests/unit/priceHistory.test.ts`, `app/tests/unit/priceHistoryPrivacy.test.ts`

**Interfaces:**
- Produces: `attachPricewatchHistory(rows, idOf)`, `attachCarHistory(key)`, `attachMarketHistory(vertical, ids)`,
  y `publicSeries(series)` que es **el único** lugar que arma lo que cruza la red.

- [ ] **Step 1: test de privacidad** — `publicSeries()` sobre un documento con campos privados
  (`detail`, `contact`, `advertId` ajeno) devuelve exactamente
  `["id","currency","points","firstSeen","lastSeen","changePct","lastChange","currencySwitched"]`.
- [ ] **Step 2: correr** → FAIL. **Step 3: implementar. Step 4: correr** → PASS, y
  `npx vitest run tests/appdb/schema_parity.test.ts` en la raíz sigue verde.
- [ ] **Step 5: commit** — `feat(precios): espejo app del historial por aviso`.

---

### Task 6: el bloque de ficha + autos, alquiler y venta

**Files:**
- Create: `app/components/PriceHistoryBlock.vue`
- Modify: `app/server/api/cars/ficha/[key].get.ts`, `app/server/api/rentals/ficha/...`,
  `app/server/api/property-sales/ficha/...`, y las tres páginas de ficha
- Test: `app/tests/unit/priceHistoryBlock.test.ts`

- [ ] **Step 1: test** — el componente con 1 punto dice "medido desde"; con ≥2 muestra el porcentaje y
  la fecha del último cambio; con `currencySwitched` muestra la nota de moneda.
- [ ] **Step 2: correr** → FAIL. **Step 3: implementar** (reusa `components/Sparkline.vue`).
  **Step 4: correr** → PASS + `npm run lint` en `app/`.
- [ ] **Step 5: commit** — `feat(fichas): la variación del propio aviso en autos, alquiler y venta`.

---

### Task 7: celulares, sillas, equipar y mi-lista

**Files:**
- Modify: `app/server/api/phones/[modelo].get.ts`, `app/server/api/chairs/[slug].get.ts`,
  `app/server/api/equipar/productos.get.ts` (ambas ramas: página y `?ids=`), y sus páginas
- Test: `app/tests/unit/equiparProductosHistory.test.ts`

- [ ] **Step 1: test** — el endpoint de equipar adjunta la variación por fila y no hace la consulta
  cuando la página no trajo filas.
- [ ] **Step 2–4:** rojo → verde. **Step 5: commit** — `feat(directorios): variación por oferta`.

---

### Task 8: la página `/cambios-de-precio-uruguay`

**Files:**
- Create: `app/server/api/price-changes.get.ts`, `app/pages/cambios-de-precio-uruguay.vue`,
  `docs/app/PRICE_CHANGES.md`
- Modify: `app/utils/siteNav.ts`, `docs/seo/experiments.json`, `docs/app/PRICEWATCH.md`,
  `docs/app/MARKET_SERIES.md`, `AGENTS.md`
- Test: `app/tests/unit/priceChangesApi.test.ts` + `siteNav-coverage.test.ts` (ya existe)

- [ ] **Step 1: test** — snapshot ausente → `{ snapshot: null }` con 200; snapshot presente → sólo los
  campos que la página pinta.
- [ ] **Step 2–4:** rojo → verde; `npm run lint`; `npx vitest run` en la raíz y en `app/`.
- [ ] **Step 5: commit** — `feat(precios): página de últimos cambios de precio`.

---

### Task 9: verificación y deploy

- [ ] `npx vitest run` (raíz) y `npm test` + `npm run lint` (app) en verde, con la salida pegada.
- [ ] `npx ts-node sync_price_changes.ts --dry-run` contra la APP DB de producción en modo lectura.
- [ ] Merge a `main`, push, `gh run watch`, y medir la página en producción antes de darla por
      desplegada (el filtro de `app/**` y la cancelación por concurrencia ya dejaron cambios sin
      desplegar antes).
