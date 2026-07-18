# Mapa analítico de temas consultados — diseño

**Fecha:** 2026-07-18 · **Ruta nueva:** `/mapa-de-temas` · **Estado:** aprobado, en implementación

## Problema
Queremos una página que muestre, de un vistazo, **qué temas de dinero consultan los uruguayos**, cómo evolucionan, y dónde nuestro contenido tiene huecos — con una **lectura interpretativa generada por IA (Gemini) que se regenera cada 90 días** (trimestral). Debe usar Vuetify y gráficos con una librería npm popular.

## Señal de datos (decidido)
No hay señal de tráfico propio legible: GA4 es *send-only* (no hay Data API) y `/buscar` no persiste queries. La única señal real de demanda que existe es el **radar de temas de Reddit** (`/api/reddit-topics`, colección `reddittopics`, 14 temas rankeados por volumen + momentum 90d, refresco diario ya en producción). El mapa se construye cruzando esa **demanda real** con **nuestra cobertura** de guías.

## Arquitectura

### Backend (root API — único lugar con Gemini)
- `classes/temas-analysis/refresh.ts` — `refreshTemasAnalysis(topics)`: llama `askGrounded()` (classes/gemini.ts) y devuelve `TemasAnalysis = { overview: string[], topics: {id,trend,insight}[], sources, asOf }`. Nunca tira: devuelve vacío si Gemini falla o no parsea. `emptyTemasAnalysis()` para el fallback.
- `classes/temas-analysis/store.ts` — un doc Mongo (`temas_analysis_data`), mirror de `classes/costs/store.ts`. `loadTemasAnalysis()` / `saveTemasAnalysis()`.
- `classes/temas-analysis/appTopics.ts` — lee la colección `reddittopics` de la **DB de la app** vía el bridge `classes/appdb.ts` (`appModel`). `readAppTopics()` → ranking actual como input del prompt.
- `sync_temas_analysis.ts` — cron pm2 fork. Dispara **diario** pero **se auto-limita a 90 días** con un gate `asOf` (`Date.now() - Date.parse(stored.asOf) < 90d → exit 0`). Orden: `startConnectionPromise()` (tripwire) → gate 90d → checks (`geminiConfigured`, `appDbConfigured`) → `readAppTopics` → `refreshTemasAnalysis` → `saveTemasAnalysis`.
- `ecosystem.config.js` — nueva app `currency-temas-analysis`, `exec_mode: fork`, `cron_restart: "17 11 * * *"` (diario; la cadencia real de 90d la impone el gate `asOf`, no el cron — igual que la recomendación de patrón). Ops: tras el deploy hay que registrarla (`pm2 start ecosystem.config.js --only currency-temas-analysis`).
- `index.ts` — ruta `GET /temas-analysis` (redis 1800s) → `loadTemasAnalysis() ?? emptyTemasAnalysis()`. Solo lee, nunca gasta Gemini.

### App (Nuxt — cero Gemini)
- `app/server/api/temas-analysis.get.ts` — proxy cacheado al backend `/temas-analysis`, fallback a análisis vacío. Mirror de `cost-of-living.get.ts`.
- `app/utils/topicMap.ts` — puro. `TOPIC_HUB` (14 topicId → hub slug), `coverageCount(id)` (cuenta guías nuestras que matchean el `match` del tema — **la misma regla que mide la demanda**, así demanda y cobertura se leen con la misma vara), `coverageStatus`, `hubFor(id)`.
- `app/utils/topicColors.ts` — puro. `momentumColor(mo)` (rampa cool→hot, hues constantes en ambos temas) + `STATUS_COLOR`.
- `app/components/mapa/TopicMapChart.client.vue` — ECharts scatter (x=volumen, y=momentum, tamaño=recent, color=momentum) con toggle a treemap. Client-only por sufijo. Emite `select(id)`.
- `app/components/mapa/TopicRankingChart.client.vue` — ECharts barras horizontales de demanda 90d, color por momentum.
- `app/pages/mapa-de-temas.vue` — Vuetify. `useLazyFetch('/api/reddit-topics',{server:false})` + `useLazyFetch('/api/temas-analysis',{server:false})` (sin `await` top-level → respeta el bug de Suspense/primer-click). Merge demanda+IA+cobertura → view model. Secciones: hero, KPIs, mapa (ClientOnly)+panel detalle, ranking (ECharts), cobertura (VTable), narrativa IA, grilla de 14 temas, nota metodológica. SEO (`useSeoMeta` + JSON-LD Dataset/BreadcrumbList/ItemList) + `defineOgImageComponent('Cambio', …)`.
- `app/utils/siteNav.ts` — entry en sección `learn` (`temas.navMapa`, `mdi-map-search-outline`, `fresh:true`).
- `app/i18n/locales/json/{es,en,pt}.json` — clave `temas.navMapa`.

### Librería de gráficos
`echarts` + `vue-echarts` (npm popular, soporte fuerte, treemap/scatter/bar nativos). Client-only (componentes `.client.vue`), tree-shake vía `echarts/core` + `use([...])`. Los hues de datos (momentum/estado) son constantes; solo el "chrome" (ejes/tooltip/fondo) sigue el tema.

## Cadencia
- Números de demanda (charts): **diarios** (tarea `reddit:sentiment` ya refresca `reddittopics`).
- Lectura IA: **cada 90 días** (gate `asOf` en el cron). = "análisis con IA cada 90 días".

## Guardrails (tests) respetados
`siteNav-coverage` (registrar + i18n) · `noGeminiInApp` (Gemini solo backend) · `no_scheduler_in_api` (cron = fork propio) · `connect_tripwire` (`startConnectionPromise`) · `gemini_key_ownership` (solo `classes/gemini.ts`) · Suspense first-click (lazy + client-only) · contraste light/dark.

## Fuera de alcance (YAGNI)
- Lector de GA4 Data API (tráfico propio real) — alcance mayor, sin credenciales; se puede sumar después como segunda señal.
- Persistir queries de `/buscar`.
- Precomputar `coverageCount` server-side para no enviar `guides` al bundle del cliente — optimización posterior si pesa.
