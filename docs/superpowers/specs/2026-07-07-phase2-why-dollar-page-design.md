# Diseño Fase 2: Página `/por-que-sube-el-dolar` (visualización de correlación + noticias)

**Fecha:** 2026-07-07
**Estado:** Aprobado (arquitectura). Segunda fase del feature de correlación noticias + drivers macro (ver `2026-07-06-price-history-news-correlation-design.md`). Fase 1 (fundación de datos) + swap FRED están completos y probados E2E.

## Objetivo

Hacer visible el trabajo de Fase 1: una página pública que responde "¿por qué sube o baja el dólar en Uruguay?" mostrando (a) qué se mueve hoy y por qué, (b) el chart USD/UYU con los días de salto marcados, (c) el panel de drivers rankeados por correlación real, y (d) una timeline de saltos notables con atribución numérica y noticias cuando existan. Fuerte activo SEO (query de alto volumen "por qué sube el dólar").

## Decisiones (cerradas con el usuario)

- **Ruta:** `/por-que-sube-el-dolar`.
- **Alcance v1:** card "por qué hoy" + chart con marcadores + panel de correlación + timeline de saltos + metodología/disclaimers + SEO. Solo USD.
- **Panel de correlación:** barras `|r|` (color por signo) + mini-sparkline + frase en lenguaje simple por driver.
- **Timeline:** cada salto muestra atribución numérica (drivers que co-movieron ese día — siempre disponible) + titulares del día si están archivados (thin hoy; se llena forward + con el backfill de Fase 4). Honesto sobre el hueco actual.
- **Sin cambios de backend:** la atribución por-salto y el resumen "hoy" se calculan en un util puro en el cliente, alimentado por las APIs existentes. No se toca `buildAnalysis` ni las rutas Nitro.

## Principios

- **Reusar, no reconstruir:** consume `/api/analysis/USD` + `/api/drivers` (ya existen y probadas). No toca el chart historico de 1057 líneas (eso es Fase 3).
- **Honestidad:** correlación ≠ causalidad; se muestra `r` con su tamaño de muestra y caveats; los saltos sin driver externo claro se marcan como tales. Sección de metodología explícita.
- **Lógica pura testeable:** toda transformación (atribución, resumen de hoy, frases) vive en `app/utils/**` con unit tests; los componentes solo renderizan.

## Arquitectura

### Datos (2 fetch SSR, sin secretos nuevos)

- `useFetch('/api/analysis/USD')` → `{ currency, asOf, base: SeriesPoint[], correlations: {key,r,n}[], moves: {date,pctChange,direction}[], headlines: {title,source,link,pubDate}[] }`.
- `useFetch('/api/drivers')` → `{ drivers: {key,label,source}[], series: {key, points: SeriesPoint[]}[] }` — para sparklines y atribución por-salto.

### Utils puros (`app/utils/`, unit-tested, framework-agnósticos)

- **`app/utils/attribution.ts`**:
  - `interface DriverDayMove { key: string; label: string; dayMovePct: number }`
  - `attributeMove(moveDate: string, driverSeries: {key,points}[], driverLabels: Record<string,string>): DriverDayMove[]` — para la fecha del salto, calcula el % de cambio de cada driver ese día vs el día previo disponible; ordena por `|dayMovePct|` desc; omite drivers sin dato ese día.
  - `interface TodaySummary { date: string; pctChange: number; direction: 'up'|'down'|'flat'; topDriver: {key,label,r} | null; headlineCount: number }`
  - `todaySummary(base: SeriesPoint[], correlations: {key,r,n}[], labels: Record<string,string>, headlines: unknown[]): TodaySummary` — último punto vs previo de `base`; `topDriver` = correlación de mayor `|r|` con `n>0`.
- **`app/utils/driverReadings.ts`**:
  - `readingFor(key: string, r: number): string` — frase ES en lenguaje simple según driver + signo/fuerza de `r`. Catálogo config-driven por driver (brl/dxy/us10y/eurusd/arBlue/arOfficial) con plantillas para r fuerte/moderado/débil/casi-nulo y signo. Ej.: brl r>0 fuerte → "El dólar en Uruguay tiende a subir cuando se debilita el real brasileño."
  - `strengthLabel(r: number): 'fuerte'|'moderada'|'débil'|'casi nula'` — umbrales sobre `|r|`.

### Componentes (`app/components/analysis/`)

- **`WhyTodayCard.vue`** — hero: movimiento de hoy (%, flecha color), driver top con su frase, conteo/lista corta de titulares de hoy. Estados vacíos claros (sin dato hoy → "sin variación / datos pendientes").
- **`PriceMovesChart.vue`** — chart.js `line` (registra escalas/elementos localmente, patrón de `LineChart.vue`) de la serie USD/UYU; los días en `moves` se resaltan con `pointRadius`/`pointBackgroundColor` por índice (verde suba / rojo baja); `options.onClick` mapea el elemento clicado a su fecha y emite `select(moveDate)`. Sin dependencia nueva. Tooltip con fecha `DD/MM/YYYY` + valor.
- **`DollarDriversPanel.vue`** — lista de drivers (de `correlations`, con `label` de `/api/drivers`): barra horizontal proporcional a `|r|` (verde r>0 / rojo r<0), valor `r` + `n`, `<DriverSparkline>` de la serie del driver, y `readingFor(key,r)`. Ordenados por `|r|` desc; drivers con `n=0` (sin dato) van al final atenuados con nota "sin datos".
- **`DriverSparkline.vue`** — sparkline SVG inline (polyline normalizada), sin dep. Props: `points: SeriesPoint[]`, color.
- **`MovesTimeline.vue`** — lista de saltos (de `moves`, desc por fecha), cada uno: fecha, %+dirección, `attributeMove(...)` (chips de drivers que co-movieron ese día), y titulares archivados de ese día si existen (placeholder honesto si no). Click en un salto scrollea/resalta el marcador en el chart (sincronizado con `PriceMovesChart` vía estado en la página).

### Página (`app/pages/por-que-sube-el-dolar.vue`)

Orquesta los fetch y el estado de "salto seleccionado" compartido entre chart y timeline. Layout (mobile-first, tokens de tema claro/oscuro existentes):
1. H1 + intro + USD live (de `base` último).
2. `WhyTodayCard`.
3. `PriceMovesChart` + leyenda de marcadores.
4. `DollarDriversPanel`.
5. `MovesTimeline`.
6. Metodología + disclaimers + fuentes (FRED, argentinadatos, BCU) + fecha de datos.

### SEO / OG / i18n

- `useSeoMeta` (title/description query-matched: "Por qué sube el dólar en Uruguay — análisis y correlación"), `defineOgImageComponent('Cambio', {...})`, JSON-LD `Article` + `Dataset` (via el patrón existente), `useLocaleHead()` para hreflang, robots crawlable. La ruta es estática → nuxt-sitemap la auto-incluye; verificar que aparezca en `/sitemap.xml`. Enlaces cruzados desde/hacia `/historico`, `/dolar-hoy`, `/noticias`.

## Alcance de unidades

Cada componente: una responsabilidad, props tipadas, sin lógica de negocio (delegada a utils). Cada util: función pura, entrada→salida, testeable sin runtime Nuxt (imports relativos, sin auto-imports). La página es el único punto que orquesta fetch + estado compartido.

## Testing

- Unit (vitest, `app/tests/unit/`): `attribution.ts` (attributeMove: día con/ sin dato, orden por |Δ|, fecha faltante; todaySummary: up/down/flat, topDriver con n=0 excluido) y `driverReadings.ts` (frase por signo/fuerza, umbrales de strengthLabel, driver desconocido → fallback genérico).
- E2E (Playwright, `app/tests/e2e/`): la página renderiza (H1, chart canvas, panel con al menos un driver, timeline), 200 OK, sin errores de hidratación; gate en hidratación con retries (patrón del proyecto).
- Sin unit test para componentes .vue (patrón del repo: lógica pura testeada, componentes vía e2e).

## Criterio de éxito

`/por-que-sube-el-dolar` renderiza en prod-like: card "hoy", chart USD con marcadores clicables, panel con BRL/DXY/US10Y rankeados por `r` real con sparklines y frases, timeline de saltos con atribución numérica, metodología. SEO 100 (title/OG/JSON-LD/hreflang/sitemap/robots). e2e verde.

## Riesgos / mitigaciones

- **chart.js click→fecha mapping** frágil si hay índices duplicados → la serie base ya es un punto por día (BILLETE, normalizada); el onClick usa el índice del elemento contra `base[i].date`.
- **Timeline vacía de noticias** hoy → diseño honesto: la atribución numérica siempre está; las noticias son un extra que se llena con el tiempo/Fase 4. Copy claro.
- **Estados vacíos** (sin dato hoy, driver sin serie) → cada componente maneja explícitamente el caso vacío, sin romper el render.
- **Hidratación/SSR** con chart.js → el chart se monta client-side (`<ClientOnly>` o mount en `onMounted`) para evitar mismatch, sin bloquear el SSR del resto (patrón AIInsights del repo).
- **Perf/LCP** → el chart no es LCP; lazy-mount; imágenes/OG cacheadas. Medir Lighthouse contra prod.
