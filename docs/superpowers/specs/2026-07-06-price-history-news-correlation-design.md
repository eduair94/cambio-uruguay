# Diseño: "¿Por qué sube/baja el dólar?" — Correlación de noticias y drivers macro en el histórico de precios

**Fecha:** 2026-07-06
**Estado:** Aprobado (arquitectura). Se implementa por fases; este documento cubre el diseño completo y se implementa **Fase 1 primero**.

## Problema

El histórico de precios (`/historico/[origin]/[currency]/[[type]]`) muestra la serie de cotización pero no explica *por qué* sube o baja. El usuario pidió integrar noticias diarias que expliquen los movimientos y encontrar correlaciones.

**Blocker descubierto:** las noticias son efímeras. `/api/news` trae Google News RSS en vivo y cachea 30 min en memoria; no hay archivo de noticias por fecha en ningún lado. El único registro durable con fecha es el store fs del `/blog` (2 posts/día, `headlines[]`), y solo desde que arrancó el blog (~2026-06). Por eso explicar movimientos **pasados** no es posible out-of-the-box: nada registró qué pasó esos días.

En cambio, los **drivers macro medibles** (índice dólar, blue argentino, soja, bono US, tasa BCU) sí tienen historia pública disponible, así que la correlación numérica sí funciona sobre el pasado.

## Decisiones (cerradas con el usuario)

- **Núcleo:** híbrido — narrativa (noticias explican saltos) **+** correlación de datos (drivers medibles).
- **Pasado noticias:** forward-only (persistir desde ahora) **+** backfill de los top-N saltos históricos vía WebSearch con fuentes citadas. No reconstrucción agresiva por IA (riesgo de alucinación).
- **Alcance monedas:** USD + EUR + ARS. Driver-set configurable por moneda.
- **UI:** página dedicada (`/por-que-sube-el-dolar`) **+** anotaciones inline en los charts historico existentes.
- **Fuentes:** sin key — stooq.com (CSV histórico) + dolarapi.com (Argentina) + backend propio (BCU).
- **Ancla de serie canónica:** BCU USD (`/evolution/bcu/USD`).
- **Umbral de salto notable:** |Δ%| > 1% día-a-día (o > 2σ de retornos recientes).

## Principios

- **Honestidad:** correlación ≠ causa. Se muestran valores de `r` con caveats; los saltos sin driver externo claro (flujo local/BCU) se marcan como tales, no se inventa causa.
- **Degradación:** la atribución numérica es pura data y siempre está. La IA solo enriquece; si el proveedor da 402 (memoria: puede estar sin créditos), cae a un template numérico.
- **Sin redeploy del backend:** todo lo nuevo vive en la app Nuxt (Nitro + su Mongo). El backend solo se consume (serie de precios) vía HTTP.

## Arquitectura

### Fuentes de datos (drivers, sin API key)

| Driver | Fuente | Nota |
|---|---|---|
| DXY (índice dólar) | stooq CSV | Diario histórico |
| Bono US 10a | stooq CSV | Rendimiento |
| EUR/USD | stooq CSV | Para EUR/UYU |
| Soja | stooq CSV | Export UY |
| Real BRL/USD | stooq CSV | Vecino |
| Blue / oficial Argentina | dolarapi.com | Sin key, histórico |
| USD BCU (ancla) | backend propio `/evolution/bcu/USD` | Ya existe |

Driver-set **configurable por moneda**: USD, EUR y ARS declaran su propia lista de drivers relevantes.

### Storage (Mongo lado Nitro — `app/server/models/`, mongoose vía `app/server/utils/db.ts`)

- **`DriverSnapshot`** — 1 doc/día: `{ date, dxy, us10y, eurusd, soybean, brl, arBlue, arOfficial, bcuUsd }`. Backfill histórico + refresh diario. Índice único por `date`.
- **`PriceNews`** — archivo de titulares por día: `{ date, currency, headlines: [{ title, source, link, pubDate }] }`. Persiste desde ahora (arregla la fuga). Reusa el fetch RSS existente (`app/server/utils/news.ts`).
- **`MoveExplanation`** — `{ currency, date, pctChange, direction, drivers: [{ key, r, dayMove }], narrative?, headlines: [{ title, source, link }] }`. Backfill top-N + forward diario. Índice único por `(currency, date)`.

### Cómputo de correlación (util puro, framework-agnóstico, unit-tested)

Ubicación: `app/utils/` (relativo, sin auto-imports Nuxt, para vitest sin runtime).

1. Traer serie canónica USD/UYU desde backend (`getEvolutionData('bcu','USD')`).
2. Alinear cada serie de driver al mismo día, clave `YYYY-MM-DD` en `America/Montevideo`. Tolerar huecos (finde/feriado/outage) — inner-join por fecha.
3. **Correlación sobre retornos diarios (log-returns), no niveles** — los niveles dan correlación espuria. Pearson `r`, ranking por `|r|`. Soporte opcional de lag (driver adelantado 1 día).
4. **Move-detection:** día con `|Δ%| > 1%` o `> 2σ` de la ventana reciente = salto notable.
5. **Atribución por salto:** para un día notable, qué drivers co-movieron ese día y con qué `r` en la ventana.

### Generación de explicación (por salto, degradable)

1. **Atribución numérica** (siempre): construida de la data. Ej.: *"El 12/03 el dólar subió 1.4%; ese día DXY +0.8%, blue AR +3%; r con DXY 0.62 en la ventana."*
2. **Titulares del día** (citados): del archivo `PriceNews` (forward) o de WebSearch (backfill).
3. **Narrativa IA** (opcional): 2-3 frases en español. Reusa `app/server/utils/ai.ts` (`generateChat` → wormgpt) o fallback backend `/ai/insights`. Si falla/402 → template desde la atribución numérica.

### Backfill (seed único, build-time)

- Detectar top ~15 saltos históricos de la serie USD sobre el rango disponible.
- Por cada uno: valores de driver de ese día (stooq/dolarapi soportan histórico) + atribución numérica + **WebSearch corrido por Claude en build-time** para juntar 1-3 fuentes de noticia de esa fecha → seed a `MoveExplanation`.
- Forward ya no necesita WebSearch: el RSS diario alimenta `PriceNews`.

### Rutas Nitro (`app/server/api/`)

- `GET /api/drivers` — series de drivers alineadas (cacheado).
- `GET /api/analysis/:currency` — correlaciones + saltos notables + explicaciones de una moneda.
- `GET /api/analysis/:currency/:date` — explicación de un día (lazy-gen + persist).

### Task programado (`app/server/tasks/`)

- `drivers:daily` — refresh de `DriverSnapshot` + detectar salto de hoy + generar `MoveExplanation` de hoy + archivar `PriceNews` de hoy. Idempotente (solo genera lo faltante).

### UI

- **Página `/por-que-sube-el-dolar`** — chart USD grande con marcadores de salto clicables; card "hoy: por qué se mueve"; panel de correlación (drivers rankeados + `r` + sparklines); timeline de saltos con noticia. SEO completo: JSON-LD, OG (nuxt-og-image), sitemap, i18n/hreflang, robots, 404-on-bad-slug. Target de query: "por qué sube el dólar uruguay/hoy".
- **Inline** en `app/pages/historico/[origin]/[currency]/[[type]].vue` — marcadores en el chart (anclados por `date`/índice de `evolution[]`, no por label `MM/YYYY`) → popover con explicación + titulares del día; panel "drivers/correlación" colapsable. Reusado en páginas USD/EUR/ARS.

## Fases (decomposición — 1 spec/plan por fase)

| Fase | Alcance | Depende de |
|---|---|---|
| **1. Fundación de datos** | Ingesta drivers→Mongo, task diario, util de correlación (unit-tested), `/api/drivers` + `/api/analysis/:currency`, archivo `PriceNews` forward. Solo USD. | — |
| **2. Página dedicada** | `/por-que-sube-el-dolar`: chart + marcadores + panel correlación + card hoy. Solo USD. | 1 |
| **3. Inline + monedas** | Marcadores/panel en charts historico. Drivers EUR + ARS. | 1, 2 |
| **4. Backfill + IA** | Top-N saltos históricos vía WebSearch + IA, con degradación. | 1 |

**Este ciclo implementa la Fase 1.** Las fases 2-4 tendrán su propio spec → plan → implementación.

## Alcance de Fase 1 (lo que se planea ahora)

Unidades con propósito único e interfaces claras:

1. **Clientes de fuentes** (`app/server/utils/drivers/`): un fetcher por fuente (stooq CSV, dolarapi), cada uno devuelve `{ date, value }[]` normalizado. Testeable con fixtures.
2. **Modelos Mongo** (`app/server/models/`): `DriverSnapshot`, `PriceNews`, `MoveExplanation`.
3. **Ingesta** (`app/server/utils/drivers/ingest.ts`): junta fetchers → upsert `DriverSnapshot`. Backfill histórico + refresh incremental.
4. **Correlación** (`app/utils/correlation.ts`): puro, log-returns, Pearson, alineación por fecha, move-detection. Unit tests.
5. **Archivo noticias** (`app/server/utils/priceNews.ts`): snapshot diario de RSS → `PriceNews`.
6. **Rutas**: `GET /api/drivers`, `GET /api/analysis/:currency` (cacheadas).
7. **Task** `drivers:daily`.

**Criterio de éxito Fase 1:** `GET /api/analysis/USD` devuelve, para el USD canónico (BCU), la lista de drivers rankeada por `|r|` con valores reales y no espurios (retornos, no niveles), la lista de saltos notables detectados, y el archivo de noticias del día se persiste. Sin UI todavía.

## Riesgos / mitigaciones

- **stooq rate-limits / caídas** → cachear agresivo, tolerar fallo por-driver (un driver caído no rompe el resto), reintentos suaves.
- **Desalineación de fechas/TZ** entre precio (00:00 Montevideo), driver (TZ propio), noticia (RFC-822) → normalizar todo a clave `YYYY-MM-DD` Montevideo.
- **Correlación espuria** → siempre sobre retornos, nunca niveles; mostrar `r` con tamaño de muestra y caveat.
- **IA sin créditos (402)** → degradación a template; nunca bloquear la feature por IA.
- **Huecos en la serie de precios** (finde/feriado) → inner-join tolerante; anotaciones robustas a fechas faltantes.
