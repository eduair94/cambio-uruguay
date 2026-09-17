# D — CyberLunes y Black Friday: ¿el descuento es real? — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ciberlunes-y-black-friday-uruguay`, una página perenne que con el historial por oferta propio muestra qué bajas de precio son reales y cuántos precios tachados están por encima de todo lo que registramos, y que durante CyberLunes y Black Friday se recalcula cada hora.

**Architecture:** análisis puro (`classes/priceevents/analyze.ts`) sobre `pricewatchoffers` (escrito por equipar, sillas y celulares); un job `sync_price_events.ts` (diario, y horario dentro de las ventanas de evento) que escribe APP DB `priceeventsnapshots` (`current` + un documento por día); el app lo sirve en `/api/price-events` y una página SSR sólo en español.

**Tech Stack:** TypeScript 4.9 (raíz, vitest), Nuxt 4 + Vuetify 4 (app), MongoDB APP DB.

**Spec:** `docs/superpowers/specs/2026-09-16-directorios-de-producto-design.md` (§1.2, §5). Checklist: `docs/superpowers/plans/2026-09-16-directorios-checklist.md`. Historial por oferta: `docs/app/PRICEWATCH.md`.

## Global Constraints

- Worktree `C:/Users/airau/Documents/GitHub/cu-dir-d`, rama `feat/directorios-d-eventos`; primer comando de cada tarea verifica la rama (si no, BLOCKED).
- Nunca correr un `sync_*` que escriba; `sync_price_events.ts --dry-run` no escribe (test).
- Build de producción: `npx tsc -p tsconfig.production.json --noEmit` con exactamente UN error (`sync_sheet.ts`/`sheet_key.json`).
- **Fechas del evento:** sólo con fuente. Verificado el 16–17/9/2026: CyberLunes lo organiza la CEDU dos veces por año, junio y noviembre (cedu.org.uy/ciberlunes); ediciones pasadas 3 al 5 de noviembre de 2025 (CUTI, nota del 29/10/2025) y 1 al 3 de junio de 2026 (página de Sodimac Uruguay para la edición). **La edición de noviembre de 2026 no tiene fecha publicada**: se muestra "a confirmar por la CEDU" hasta que un humano cargue la fecha con su fuente. Black Friday 2026: viernes 27 de noviembre (el día siguiente al cuarto jueves de noviembre de EE.UU.).
- **Marco legal, sólo el que ya tiene el sitio** (`app/utils/consumerRights.ts`, cabecera y caso del "precio tachado"): en Uruguay NO hay norma de precio de referencia ("el precio anterior tuvo que estar vigente N días" es la directiva Omnibus europea); lo que la ley ataca es el aviso: Ley 17.250 art. 24 (publicidad engañosa sobre el precio) y art. 26 (la prueba es del anunciante). Nunca escribir un plazo legal de precio anterior.
- **Sin acusaciones:** una tienda con tachados por encima del historial se muestra como conteo y proporción con la regla que lo define, sin adjetivos ("engaña", "trucho", "falso", "estafa"); requiere ≥ 5 ofertas con precio tachado ese día; y la página explica que el historial es sólo lo que nosotros vimos.
- Umbrales: ≥ 21 días desde `firstSeen` y ≥ 10 días con precio en los 60 anteriores para clasificar; **baja real** = precio de hoy ≤ 90 % del mínimo de los 60 días previos; **tachado por encima del historial** = precio tachado de hoy ≥ 110 % del máximo precio de venta de los 60 días previos; **precio de siempre** = el resto. Las comparaciones son dentro de la misma oferta (misma moneda).
- Copy en español ("setiembre", `dateLocale()`), texto azul chico `rgb(var(--v-theme-link))`, exports del app prefijados `priceEvent`/`PRICE_EVENT_`.
- Sin control bytes; Spanish commits con `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`; no commitear `app/package-lock.json`.

---

### Task 1: Análisis por oferta (puro)

**Files:** Create `classes/priceevents/types.ts`, `classes/priceevents/analyze.ts`; Test `tests/priceevents/analyze.test.ts`

**Interfaces:**
- Consumes: documento de `pricewatchoffers` (`listingId, vertical, category, productKey, source, sellerKey, sellerName, title, url, currency, firstSeen, lastSeen, history: [{ d, p, lp }]`) — leer `classes/models/PricewatchOffer.ts` y `classes/pricewatch/types.ts`.
- Produces:
  ```ts
  export type PriceEventClass = "baja-real" | "tachado-por-encima" | "precio-de-siempre";
  export const PRICE_EVENT_MIN_AGE_DAYS = 21, PRICE_EVENT_MIN_POINTS = 10, PRICE_EVENT_LOOKBACK_DAYS = 60;
  export const PRICE_EVENT_DROP_RATIO = 0.9, PRICE_EVENT_INFLATED_RATIO = 1.1;
  export interface PriceEventAnalysis {
    listingId: string; vertical: string; category: string | null; productKey: string | null;
    sellerKey: string; sellerName: string; title: string; url: string; currency: "UYU" | "USD";
    price: number; listPrice: number | null; priorMin: number; priorMax: number; priorMedian: number; priorPoints: number;
    classes: PriceEventClass[];            // puede ser baja-real Y tachado-por-encima a la vez
    dropPct: number | null;                // 1 - price/priorMin, redondeado a 1 decimal en %
  }
  export function analyzeOffer(doc: PricewatchOfferLike, today: string): PriceEventAnalysis | null;  // null si no califica
  ```
- [ ] Tests primero: sin punto de hoy → null; `firstSeen` hace 20 días → null; 9 días con precio en los 60 previos → null; historia de 30 días a 10.000 y hoy 8.900 → `baja-real`, `dropPct` 11; hoy 9.100 → `precio-de-siempre`; hoy 10.000 con `lp` 13.500 y máximo previo 12.000 → `tachado-por-encima` (13.500 ≥ 13.200); con `lp` 13.100 → no; hoy 8.500 con `lp` 14.000 y máximo previo 10.000 → ambas clases; los puntos de más de 60 días no cuentan; el punto de hoy no cuenta como "previo".
- [ ] Implementación y commit — `feat(eventos): clasificación de bajas reales y tachados sobre el historial propio`.

### Task 2: Agregado del día, modelo y job

**Files:** Create `classes/priceevents/aggregate.ts`, `classes/priceevents/calendar.ts`, `classes/models/PriceEventSnapshot.ts`, `app/server/models/PriceEventSnapshot.ts`, `sync_price_events.ts`; Modify `tests/appdb/schema_parity.test.ts`, `ecosystem.config.js`, `scripts/deploy-backend.sh`; Test `tests/priceevents/aggregate.test.ts`, `tests/priceevents/calendar.test.ts`, `tests/priceevents/dry_run.test.ts`

**Interfaces:**
- `calendar.ts`:
  ```ts
  export interface PriceEvent { key: string; label: string; start: string | null; end: string | null; confirmed: boolean; source: string | null; note: string }
  export const PRICE_EVENTS: readonly PriceEvent[] = [
    { key: 'ciberlunes-2025-11', label: 'CyberLunes noviembre 2025', start: '2025-11-03', end: '2025-11-05', confirmed: true, source: 'https://cuti.org.uy/en/destacados/noviembre-comienza-con-una-nueva-edicion-de-ciberlunes-con-hasta-70-off/', note: '' },
    { key: 'ciberlunes-2026-06', label: 'CyberLunes junio 2026', start: '2026-06-01', end: '2026-06-03', confirmed: true, source: 'https://www.sodimac.com.uy/sodimac-uy/content/Ciberlunes/', note: '' },
    { key: 'ciberlunes-2026-11', label: 'CyberLunes noviembre 2026', start: null, end: null, confirmed: false, source: 'https://www.cedu.org.uy/ciberlunes/', note: 'La CEDU todavía no publicó la fecha.' },
    { key: 'black-friday-2026', label: 'Black Friday 2026', start: '2026-11-27', end: '2026-11-30', confirmed: true, source: null, note: 'Del viernes 27 al lunes 30 de noviembre (Cyber Monday de EE.UU.).' },
  ]
  export function activeEvent(today: string): PriceEvent | null   // dentro de [start, end]; un evento sin fecha activa la ventana amplia 2026-11-01..2026-11-08 con confirmed=false
  ```
  El mismo arreglo se replica en `app/utils/priceEvents.ts` (Task 3) con test de paridad **en el suite del app** (`app/tests/unit/priceEventsCalendarParity.test.ts`, que importa `../../../classes/priceevents/calendar`): un test de la raíz NO puede importar un archivo de `app/` (Vite toma `app/tsconfig.json`, que extiende `app/.nuxt/tsconfig.json`, ausente en el job de backend del CI; rompió el deploy el 2026-09-17).
- `aggregate.ts`: `buildPriceEventSnapshot(analyses, today, event, trackingSince)` → `{ key, day, event: PriceEvent | null, generatedAt, trackingSince: string | null, analyzed, eligible, byVertical: Record<string, { eligible, drops, inflated }>, drops: PriceEventAnalysis[] (las 200 bajas más grandes por dropPct, máx 3 por vendedor), sellers: Array<{ sellerKey, sellerName, withListPrice, inflated, share }> (sólo con withListPrice ≥ 5, orden alfabético) }`.
- Colección `priceeventsnapshots`: `key` único (`current` y `day:YYYY-MM-DD`), campos del snapshot; timestamps; paridad con el app.
- `sync_price_events.ts`: `--dry-run`, `--event-only` (sale 0 sin hacer nada si `activeEvent(today)` es null); calcula `trackingSince` = el `firstSeen` más viejo de `pricewatchoffers` (una consulta ordenada con `limit(1)` sobre un índice nuevo `{ firstSeen: 1 }` que se agrega en `classes/models/PricewatchOffer.ts`, no un escaneo); lee `pricewatchoffers` **por vertical** (`{ vertical, lastSeen: today }`, así usa el índice existente `{ vertical: 1, lastSeen: 1 }`; las verticales salen de `distinct("vertical")`) en lotes con `.select` y `.lean()` (cursor), analiza, agrega, guarda `current` y `day:<hoy>` (upsert), borra `day:` de más de 400 días. Corrida flaca: si hay `current` guardado y `eligible` cae por debajo del 40 % del anterior, no escribe y sale 1.
- pm2: `currency-price-events` (`cron_restart: "13 15 * * *"`, después de equipar 12:47 y celulares 14:29) y `currency-price-events-hourly` (`args: "--event-only"`, `cron_restart: "19 * * * *"`), `autorestart: false`, fork; ambos en `OTHER_APPS`.
- [ ] Tests primero (máximo 3 bajas por vendedor; vendedores con < 5 tachados-visibles no aparecen; `share` = inflated/withListPrice con 1 decimal; activeEvent con evento confirmado, sin fecha y fuera de ventana; dry-run no escribe; paridad del modelo); implementación; `npx vitest run tests/priceevents tests/appdb tests/sync`; tsc de producción; corrida en seco `npx ts-node sync_price_events.ts --dry-run` (lee la base de producción, no escribe) y pegar el conteo de ofertas elegibles del día — es esperable que sea 0 si el historial tiene menos de 21 días: decirlo.
- [ ] Commit — `feat(eventos): snapshot diario de bajas reales y job currency-price-events`.

### Task 3: API, util y página

**Files:** Create `app/utils/priceEvents.ts`, `app/server/api/price-events.get.ts`, `app/pages/ciberlunes-y-black-friday-uruguay.vue`; Modify `app/utils/siteNav.ts`, `app/i18n/locales/json/{es,en,pt}.json` (`nav.ciberlunes`), `app/tests/unit/seoContract.test.ts` (sólo si la página entra en alguna lista; la página estática la cubre el trinquete global); Test `app/tests/unit/priceEvents.test.ts`, `app/tests/unit/priceEventsApi.test.ts`, `app/tests/unit/priceEventsCalendarParity.test.ts`

- `app/utils/priceEvents.ts`: espejo de `PRICE_EVENTS` y `activeEvent`; `priceEventCountdown(today)` (próximo evento con fecha confirmada, o el sin fecha); `priceEventFaq(snapshot)`; `priceEventDropRows(snapshot)` con enlace interno cuando se puede derivar: vertical `equipar` con `category` → `/equipar-casa-uruguay/<category>` si `isEquiparCategorySlug`; vertical `celulares` con `productKey` `phone:<key>` → `/celulares-uruguay/<key>`; vertical `sillas` → `/sillas-escritorio-uruguay`; si no, sólo el enlace externo.
- `GET /api/price-events` → `{ current, days: Array<{ day, eligible, drops, inflated }> (últimos 30, con `drops`/`inflated` tomados de `dropsCount`/`inflatedCount` de cada `day:` — NUNCA de `topDrops.length`, que está recortado a 200), events }`; `current` sin `topDrops` más allá de lo que la página muestra (recortar a 50 en la ruta para no inflar el payload); cache 600 s; error → forma vacía.
- Página (sólo español, canonical sin prefijo): H1 "CyberLunes y Black Friday en Uruguay: ¿el descuento es real?"; bloque de fechas (próxima edición, confirmada o "a confirmar por la CEDU" con enlace a la fuente; ediciones pasadas con sus fuentes); "cómo medimos" (qué es baja real, qué es tachado por encima del historial, que sólo vemos las tiendas que relevamos y desde qué fecha); tabla de bajas reales de hoy desde `current.topDrops` (producto, tienda, precio de hoy, mínimo de los 60 días, baja %, enlace; `VTable` + `cu-mobile-cards`); tabla de tiendas con precio tachado por encima de lo registrado (sólo conteos y proporción, con la regla escrita arriba de la tabla); serie de los últimos 30 días (bajas y tachados por día) con `<ChartsLineChart>` dentro de `<ClientOnly>`; "qué dice la ley" (sólo lo de `consumerRights.ts`: no hay regla de precio anterior en Uruguay; art. 24 y art. 26; enlace a `/derechos-consumidor-compras-online`); enlaces a `/descuentos-con-tarjeta-uruguay`, `/equipar-casa-uruguay`, `/celulares-uruguay`, `/sillas-escritorio-uruguay`; FAQ con `FaqSection`; estado vacío honesto ("todavía no tenemos historial suficiente: empezamos a guardar precios el <`trackingSince` formateado> y la regla pide 21 días"; la fecha sale del snapshot, nunca escrita a mano).
- Nav: entrada en la sección de consumo con `fresh: true`.
- [ ] Tests primero (paridad del calendario; enlaces derivados; FAQ sin adjetivos prohibidos; ruta vacía ante error; texto de la página: un `<h1`, `useSeoMeta(`, canonical, `application/ld+json` con `BreadcrumbList`, `<FaqSection`, sin "falso"/"engaña"/"estafa"); implementación; `cd app && npm test && npm run lint`; dev en este worktree con `curl` a la página (200) y `wc -c`.
- [ ] Commit — `feat(eventos): /ciberlunes-y-black-friday-uruguay con bajas reales del historial propio`.

### Task 4: Documentación

- `docs/app/PRICE_EVENTS.md` (reglas, umbrales, calendario con fuentes, qué no se publica y por qué, cómo cargar la fecha de noviembre cuando la CEDU la publique: una línea en `PRICE_EVENTS` de los dos lados), `AGENTS.md` (filas pm2 y entrypoint), `docs/app/PRICEWATCH.md` (quién lo lee ahora).
- [ ] Raíz `npm test` + tsc; app `npm test` + lint. Commit — `docs(eventos): CyberLunes y Black Friday sobre el historial propio`.
