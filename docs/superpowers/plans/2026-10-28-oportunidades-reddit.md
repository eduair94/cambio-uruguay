# Oportunidades en Reddit — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** job diario que arma una cola de hilos uruguayos de Reddit (≤30 días) recomendables para responder con un enlace del sitio, y la página privada `/oportunidades-reddit` que la muestra en cards con filtros, scroll infinito y paginación.

**Architecture:** el job de backend lee `/new` de 11 subs, filtra sin red, genera candidatas (reglas de intención + BM25 del índice RAG), las hace juzgar por Gemini en lotes y guarda un documento por hilo en la APP DB. El app sólo lee (y escribe el estado de trabajo de cada hilo) detrás de `requireAdmin`.

**Tech Stack:** TypeScript 6 (CommonJS raíz), mongoose 9, vitest; Nuxt 4.4 + Vuetify 4.2 en `app/`.

**Spec:** `docs/superpowers/specs/2026-10-28-oportunidades-reddit-design.md`

## Global Constraints

- Ventana: 30 días; poda a 35 días.
- Subs: `uruguay, monte_video, Uruguay_nomas, Burises, CharruaDevs, AskUruguayan, AutosUy, Uruguay_Mujeres, LegalUruguay, UruguayMarketplace, MadeInUruguay` (env `REDDIT_OPPS_SUBS` la reemplaza).
- Cron `21 10 * * *` UTC, pm2 `currency-reddit-opportunities`, `dist/sync_reddit_opportunities.js`, agregado a `OTHER_APPS`.
- Colecciones APP DB: `redditopportunities` (uno por hilo, `postId` único), `redditopportunitymetas` (un doc, `key: "reddit_opportunities"`).
- Juez: `askJSON` de `classes/gemini.ts` (tripwire `gemini_key_ownership`), lotes de 10, modelo `REDDIT_OPPS_MODEL` o `GEMINI_MODEL`.
- Mostrar sólo `verdict: "recommend"` con `confidence ≥ 0.6`.
- El job nunca escribe `state`/`stateAt` salvo `$setOnInsert: { state: "open" }`.
- Nunca se guarda el autor.
- Página privada: `requireAdmin`, `middleware: 'auth'`, `noindex, nofollow`, robots disallow, fuera de sitemap/nav/anuncios, `cache-control: private, no-store`.
- Sin cifras de ingreso en nada versionado. Sin fila en `experiments.json`.
- Heredocs < 3 KB; regex con `\u` escritas con Edit, no con Write (o reusar `strip` de `classes/redditbot/filter.ts`).

**Agregados por la revisión del constructor** (ver spec): campos `lang`, `answerUrl`, `answerVisible`, `answerCheckedAt` en `RedditOpportunity`; `langOf(text)` en Task 2; chequeo anónimo de `answerUrl` en Task 5 (`answerCheckQueue`/`markAnswerChecked` en Task 4); `SUB_NOTES` y enlace `/en/` en Tasks 6–7; tope de chequeo de comentarios 200.

## Review Focus

1. Juez devuelve una ruta que no estaba entre las candidatas → se descarta ese veredicto (test en Task 3).
2. Juez devuelve `null` (cuota, 503) → esos hilos no se guardan y se reintentan mañana (test en Task 5).
3. Reddit caído / sin credenciales: todos los subs vacíos → no poda, no pisa la meta, sale 1 (test en Task 5).
4. Hilo recomendado que después se cierra o lo borra un moderador → deja de listarse como pendiente (test en Task 5 + filtro en Task 6).
5. Título con entidades HTML (`&amp;`) → se decodifica antes de filtrar y mostrar (test en Task 2).

---

### Task 1: datos compartidos — post borrado, modelos y paridad

**Files:**
- Modify: `classes/reddit.ts` (`RawPost.removed_by_category`, `RedditPostRaw.removedBy?: string`, `toPost`)
- Create: `classes/models/RedditOpportunity.ts`, `classes/models/RedditOpportunityMeta.ts`, `app/server/models/RedditOpportunity.ts`, `app/server/models/RedditOpportunityMeta.ts`
- Modify: `tests/appdb/schema_parity.test.ts`

**Interfaces — Produces:**
- `RedditOpportunityModel` (campos de nivel superior): `postId, sub, title, excerpt, permalink, linkUrl, flair, createdAt, score, numComments, locked, removed, verdict ("recommend"|"reject"), path, pageTitle, family, confidence, reason, angle, alreadyLinked, linkCheckedAt, linkCheckedComments, rank, judgedAt, judgeModel, seenAt, state ("open"|"answered"|"dismissed"), stateAt`. Índices: `{postId:1}` único, `{verdict:1, state:1, rank:-1}`, `{createdAt:1}`.
- `RedditOpportunityMetaModel`: `key, asOf, windowDays, subs (Mixed[]: {sub, fetched, candidates, judged, recommended, note}), judged, judgeFailures, recommendedTotal, notes (string[])`.

- [ ] Agregar en `schema_parity.test.ts` dos `it` (mismo patrón que `CompetitorMonitor`) que exigen igualdad de campos y los nombres de colección `redditopportunities` / `redditopportunitymetas`. Correr `npx vitest run tests/appdb/schema_parity.test.ts` → FAIL (módulo no existe).
- [ ] Crear los cuatro modelos (raíz con `appModel`, app con `mongoose.models.X || mongoose.model(...)`, `timestamps: true`). Correr → PASS.
- [ ] `removedBy`: `toPost` copia `removed_by_category ?? undefined`. `npx vitest run tests/redditbot` → PASS (nada cambia para el bot).
- [ ] Commit `feat(reddit-opps): modelos de la cola y estado de borrado del post`.

### Task 2: filtro y candidatas (puro)

**Files:**
- Modify: `classes/redditbot/filter.ts` — exportar `looksLikeAQuestion`, y predicados nuevos `isSensitive(text)`, `isEvasion(text)`, `hasBlockedFlair(flair)` que usen las listas existentes (y `screenPost` los use, sin cambiar conducta).
- Create: `classes/redditopps/subs.ts`, `classes/redditopps/text.ts`, `classes/redditopps/destinations.ts`, `classes/redditopps/screen.ts`, `classes/redditopps/candidates.ts`
- Test: `tests/redditopps/screen.test.ts`, `tests/redditopps/destinations.test.ts`

**Interfaces — Produces:**
- `OPPS_SUBS: readonly string[]`; `oppsSubs(): string[]` (env `REDDIT_OPPS_SUBS`, coma).
- `decodeEntities(s: string): string`; `excerptOf(text: string, max = 600): string`.
- `type Family = "alquileres"|"viviendas"|"autos"|"motos"|"compras"|"movilidad"|"cambio"|"tarjetas"|"prestamos"|"aduana"|"trabajo"|"impuestos"|"tramites"|"otros"`.
- `interface Destination { path; title; family; describe; patterns: RegExp[] }`; `DESTINATIONS: readonly Destination[]`; `intentMatches(text: string): Destination[]` (texto ya `strip`eado); `familyOf(path: string): Family`.
- `type ScreenReason = "nsfw"|"stickied"|"locked"|"removed"|"deleted_author"|"blocked_flair"|"too_short"|"already_linked"|"sensitive"|"evasion"|"marketplace_offer"|"not_a_request"`; `screenForOpportunity(post: RedditPostRaw): { ok: boolean; reason?: ScreenReason }`.
- `interface Candidate { path; title; family; source: "intent"|"search"; describe }`; `candidatesFor(post: RedditPostRaw, retriever: Pick<SiteRetriever,"rankWithVector"> | null, max = 6): Candidate[]` — intenciones primero, después BM25 (`rankWithVector(retrievalQuery(post), null, 8)` → `linkableOnly`, stubs fuera), sin rutas repetidas.

Tests (asserts):
- `"Busco apartamento para alquilar en Pocitos, qué portales recomiendan?"` → ok, y `intentMatches` incluye `/alquileres-uruguay`.
- `"Me quiero comprar mi primer auto usado, qué miro?"` → incluye `/autos-usados-uruguay` y `/que-auto-comprar-uruguay`.
- `"Recomendación de celular hasta 15 mil pesos"` → `/celulares-uruguay`; `"Antel arena"` sólo → ninguna.
- `"Vendo heladera Samsung impecable"` en r/UruguayMarketplace → `marketplace_offer`.
- flair `"Política"` → `blocked_flair`; `over18` → `nsfw`; `removedBy: "moderator"` → `removed`; autor `[deleted]` → `deleted_author`; texto con `cambio-uruguay.com` → `already_linked`; `"cómo traer semillas de cannabis sin que se den cuenta"` → `evasion`.
- Declarativo sin pedido (`"El dólar bajó hoy"` sin `?`) → `not_a_request`; `"Busco ..."`/`"recomiendan"` sin `?` → ok.
- `decodeEntities("Autos &amp; motos &#x27;usados&#x27;")` → `"Autos & motos 'usados'"`.
- `familyOf("/alquiler/montevideo/pocitos") === "alquileres"`, `familyOf("/guias/franquicia") ` según reglas → `"aduana"` si la ruta nombra franquicia/courier/aduana.
- `candidatesFor` con un retriever falso que devuelve `/temas-de-dinero-reddit` y `/couriers-uruguay` → sólo `/couriers-uruguay` entra; sin retriever → sólo intenciones.

- [ ] Escribir los tests, correr `npx vitest run tests/redditopps` → FAIL.
- [ ] Implementar. Destinos mínimos: `/alquileres-uruguay`, `/alquiler-de-temporada-uruguay`, `/garantia-de-alquiler-uruguay`, `/venta-viviendas-uruguay`, `/prestamo-hipotecario-uruguay`, `/autos-usados-uruguay`, `/que-auto-comprar-uruguay`, `/cuanto-vale-mi-auto-uruguay`, `/vender-mi-auto-uruguay`, `/motos-usadas-uruguay`, `/celulares-uruguay`, `/sillas-escritorio-uruguay`, `/equipar-casa-uruguay`, `/cuanto-gastar-en-un-sommier-uruguay`, `/monopatines-electricos-uruguay`, `/bicicletas-electricas-uruguay`, `/precio-de-la-nafta-uruguay`, `/conviene-auto-moto-o-omnibus-uruguay`, `/precios-de-supermercado-uruguay`, `/tiendas-online-uruguay`, `/mejor-casa-de-cambio`, `/cotizaciones-de-la-region`, `/tarjetas-de-credito-uruguay`, `/descuentos-con-tarjeta-uruguay`, `/mejores-prestamos-uruguay`, `/couriers-uruguay`, `/franquicia-aduana-uruguay`, `/herramientas/calculadora-sueldo-liquido`, `/declaracion-de-irpf-uruguay`, `/fletes-mudanzas-uruguay`. Correr → PASS; `npx vitest run tests/redditbot` → PASS.
- [ ] Commit `feat(reddit-opps): filtro de pedidos y candidatas por intención y BM25`.

### Task 3: juez y orden (puro + inyectable)

**Files:**
- Create: `classes/redditopps/judge.ts`, `classes/redditopps/rank.ts`
- Test: `tests/redditopps/judge.test.ts`, `tests/redditopps/rank.test.ts`

**Interfaces:**
- Consumes: `Candidate`, `RedditPostRaw`.
- Produces: `interface JudgeItem { post: RedditPostRaw; candidates: Candidate[] }`; `interface Verdict { postId; recommend: boolean; path: string|null; confidence: number; reason: string; angle: string }`; `JUDGE_SCHEMA`; `buildJudgePrompt(items: JudgeItem[]): string`; `judgeBatch(items, ask: AskJson = askJSON): Promise<Map<string, Verdict> | null>`; `oppsJudgeModel(): string`; `rankOf(i: {confidence; createdAt: Date; score; numComments}, now: number): number`; `MIN_CONFIDENCE = 0.6`.

Tests:
- `judgeBatch` con `ask` falso que devuelve `{verdicts:[{id:"a", recommend:true, path:"/inventada", ...}]}` → el veredicto de `a` queda `recommend:false, path:null`.
- confianza fuera de [0,1] se recorta; `reason` > 160 y `angle` > 200 se recortan.
- `ask` devuelve `null` → `judgeBatch` devuelve `null`.
- id que el juez omitió → no aparece en el mapa (se reintenta mañana).
- el prompt contiene cada `path` candidato y el id de cada hilo, y no contiene el autor.
- `rankOf`: mismo hilo de hoy > de hace 20 días; más votos > menos votos; 120 comentarios < 30 comentarios a igual resto.

- [ ] Tests → FAIL; implementar; → PASS. El prompt (español): para cada hilo, título + cuerpo (≤900) + sub + candidatas (ruta, título, `describe`); reglas: recomendar sólo si la página contesta directo lo que se pide; no recomendar desahogos, noticias, política, avisos de venta, chistes ni temas sensibles; `reason` = qué pide y por qué esa página lo contesta; `angle` = qué dato aportar al responder. `temperature 0.1`.
- [ ] Commit `feat(reddit-opps): juez por lotes y orden de la cola`.

### Task 4: almacenamiento

**Files:**
- Create: `classes/redditopps/store.ts`

**Interfaces — Produces:**
- `knownPostIds(ids: string[]): Promise<Set<string>>`
- `refreshLive(posts: RedditPostRaw[], now: Date): Promise<number>` — `bulkWrite` sin upsert: `score, numComments, locked, removed, flair, seenAt`.
- `saveVerdicts(rows: Array<{post; verdict; candidate?: Candidate}>, model: string, now: Date): Promise<void>` — upsert por `postId`, `$setOnInsert: {state:"open"}`.
- `linkCheckQueue(limit: number): Promise<Array<{postId; sub; numComments}>>` — recomendados sin chequeo o con más comentarios que en el chequeo.
- `markLinkChecked(postId, alreadyLinked: boolean, numComments: number, now): Promise<void>`
- `unseenRecommended(since: Date, now: Date): Promise<string[]>` — recomendados abiertos que no se vieron en esta corrida.
- `rerank(now: number): Promise<number>`; `prune(before: Date): Promise<number>`; `saveMeta(meta): Promise<void>`.

- [ ] Implementar (sin test propio: lo cubre Task 5 con dobles; los modelos ya tienen paridad). `npx tsc -p tsconfig.json --noEmit --pretty false` sin errores nuevos en `classes/redditopps`.
- [ ] Commit `feat(reddit-opps): lectura y escritura de la cola en la base del app`.

### Task 5: corrida y entrypoint

**Files:**
- Create: `classes/redditopps/refresh.ts`, `sync_reddit_opportunities.ts`, `docs/app/REDDIT_OPPORTUNITIES.md`
- Modify: `ecosystem.config.js`, `scripts/deploy-backend.sh` (`OTHER_APPS`), `AGENTS.md` (fila pm2 + lista de entrypoints)
- Test: `tests/redditopps/refresh.test.ts`

**Interfaces:**
- Produces: `interface OppsDeps { fetchSub(sub, sinceUtc): Promise<RedditPostRaw[]>; fetchByIds(ids): Promise<RedditPostRaw[]|null>; fetchCommentBodies(sub, postId): Promise<string[]|null>; judge(items): Promise<Map<string,Verdict>|null>; retriever: ... | null; store: typeof import("./store") }`; `refreshRedditOpportunities(deps: OppsDeps, opts: {now?: number; judgeMax?: number; linkCheckMax?: number; dryRun?: boolean}): Promise<OppsRunSummary>`; `OppsRunSummary { fetched; perSub; screened; candidates; judged; recommended; judgeFailures; linkChecked; pruned; aborted: boolean }`.

Tests (store y deps falsos en memoria):
- todos los `fetchSub` vacíos → `aborted: true`, `prune`/`saveMeta` no se llaman.
- hilo ya conocido → no se vuelve a juzgar; sí se refresca.
- `judge` devuelve `null` en un lote → esos hilos no se guardan, `judgeFailures` cuenta el lote.
- recomendado ausente del listado y `fetchByIds` lo trae con `removedBy` → `refreshLive` lo marca `removed`.
- `fetchCommentBodies` con un cuerpo que contiene `cambio-uruguay.com` → `markLinkChecked(..., true, ...)`.
- `judgeMax: 10` con 25 candidatos → se juzgan 10, el resto queda para mañana.

- [ ] Tests → FAIL; implementar `refresh.ts` → PASS.
- [ ] `sync_reddit_opportunities.ts`: flags `--dry-run`, `--judge-max=N`; sin `APP_MONGO_URI` y sin `--dry-run` sale 1 con mensaje; arma deps reales (`fetchNewPostsSince(sub, since, {maxPages:10})`, `fetchPostsByIdsOrNull`, `fetchComments` → cuerpos, `judgeBatch`, `new SiteRetriever(await loadIndex())` en try → `null` si falla o vacío); imprime resumen; `notifyAdmin` si hubo recomendados nuevos (top 3 títulos + `https://cambio-uruguay.com/oportunidades-reddit`); exit 1 si `aborted`.
- [ ] pm2: `{ name: "currency-reddit-opportunities", autorestart: false, exec_mode: "fork", script: "dist/sync_reddit_opportunities.js", cron_restart: "21 10 * * *", log_date_format: "YYYY-MM-DD HH:mm Z" }`; `OTHER_APPS` += `currency-reddit-opportunities`; fila en `AGENTS.md`; doc corto.
- [ ] `npm test` raíz → PASS. `npx tsc -p tsconfig.production.json --noEmit --pretty false` → sin errores nuevos.
- [ ] Commit `feat(reddit-opps): job diario currency-reddit-opportunities`.

### Task 6: API del app

**Files:**
- Create: `app/utils/redditOpportunities.ts`, `app/server/api/reddit-opportunities/index.get.ts`, `app/server/api/reddit-opportunities/state.post.ts`
- Test: `app/tests/unit/redditOpportunities.test.ts`

**Interfaces — Produces:**
- `OPPS_PAGE_SIZE = 24`, `OPPS_MAX_LIMIT = 60`, `OPPS_SORTS = ["rank","new","comments","score"]`, `OPPS_STATES = ["open","answered","dismissed","all"]`, `FAMILY_LABELS: Record<string,string>`.
- `interface OppsQuery { page; limit; sub: string|null; family: string|null; state; q: string; sort }`; `parseOppsQuery(raw: Record<string, unknown>): OppsQuery` (enteros acotados, valores fuera de lista → default, `q` ≤ 80).
- `buildOppsFilter(q: OppsQuery): Record<string, unknown>` — siempre `verdict:"recommend"`, `confidence ≥ 0.6`; `state:"open"` agrega `locked:false, removed:false, alreadyLinked:{$ne:true}`; `q` → `$or` de `title`/`excerpt`/`pageTitle` con regex escapada, case-insensitive.
- `sortOf(sort): Record<string, 1|-1>`; `ageLabel(createdAt: string|Date, now: number): string` ("hace 3 h", "hace 2 días").
- `interface OppItem` = proyección pública de la API (sin `verdict`, sin `judgeModel`).
- GET: `requireAdmin`, `no-store`, `connectDb`, `find(filter).sort().skip().limit()`, `countDocuments`, facetas por `aggregate` (`sub`, `family`) sobre el filtro sin su propia dimensión, `state` counts, meta. Respuesta `{ items, total, page, pages, facets: {subs, families, states}, meta }`.
- POST state: `requireAdmin`, body `{postId: /^[a-z0-9]{5,10}$/, state ∈ open|answered|dismissed}` → `updateOne({postId}, {$set:{state, stateAt:new Date()}})`; 404 si no existe.

Tests: `parseOppsQuery({page:"-3", limit:"999", sort:"x", state:"zzz"})` → `page 1, limit 60, sort "rank", state "open"`; `buildOppsFilter` con `state:"open"` tiene `removed:false` y `locked:false`; `q: "a.b(c"` se escapa; `ageLabel` a 3 h y a 2 días.

- [ ] Tests → FAIL; implementar → PASS (`cd app && npx vitest run tests/unit/redditOpportunities.test.ts`).
- [ ] Commit `feat(reddit-opps): API privada de la cola`.

### Task 7: página `/oportunidades-reddit`

**Files:**
- Create: `app/pages/oportunidades-reddit.vue`, `app/components/reddit/OpportunityCard.vue`
- Modify (registro de página privada, mismo trato que `/estadisticas-por-pagina`): `app/nuxt.config.ts` (robots disallow + sitemap exclude con `/*/`), `app/utils/siteNav.ts` (`EXCLUDED_ROUTES`), `app/utils/ads.ts` (`NO_ADS`), `app/utils/engagementMeasurement.ts` (regex de rutas sin medición) y su test, `app/tests/unit/seoContract.test.ts`, `app/tests/unit/siteNav-coverage.test.ts`, `app/tests/unit/temaHuerfanas.test.ts`, `app/tests/unit/enlacesDeContexto.test.ts`, `classes/site-analytics/publicTopPages.ts` (`PUBLIC_EXCLUDED_PATHS`)

Comportamiento:
- `definePageMeta({ middleware: 'auth' })`, `useHead` con `noindex, nofollow`.
- Encabezado: título, una línea de qué es, fecha de la última corrida y cuántos pendientes; aviso si la corrida tiene >36 h.
- Filtros (fila que se apila en móvil): buscar (debounce 300 ms), sub, familia, estado (chips con conteo), orden. Cambiar filtro → página 1, lista vacía, URL `?sub&family&state&q&sort&page` con `router.replace`.
- Grid `VRow`/`VCol cols=12 sm=6 lg=4` de `OpportunityCard`.
- Scroll infinito: centinela + `IntersectionObserver` (`rootMargin: '600px'`) pide `page+1` mientras `page < pages`; sin IO, botón "Cargar más". Al terminar, "No hay más".
- `VPagination` (`total-visible` 5 en móvil, 7 en desktop) con la página más alta cargada; elegir un número reemplaza la lista por esa página y hace scroll arriba.
- Card: chip `r/sub`, antigüedad, votos y comentarios, título enlazado al permalink (nueva pestaña, `rel="noopener nofollow"`), extracto con clamp de 4 líneas, bloque "Página sugerida" (título, familia, ruta), motivo, ángulo, avisos (cerrado, ya enlazado). Acciones: "Abrir en Reddit", "Copiar enlace" (`navigator.clipboard`, URL absoluta `https://cambio-uruguay.com<path>`), "Ver página", "Respondido", "Descartar". Respondido/descartado: actualización optimista, la card sale de "pendientes", snackbar con "Deshacer" (POST `state: open`).
- Estados: cargando (skeleton cards), 403 ("Esta cuenta no está en la lista de administradores."), sin datos (hint), error de red con reintento.

- [ ] Agregar la ruta a las listas de los tests (`siteNav-coverage`, `seoContract`, `temaHuerfanas`, `enlacesDeContexto`, engagement) y a las listas de código. `cd app && npx vitest run` de esos tests → PASS.
- [ ] Página y card. `cd app && npm run lint` → sin errores.
- [ ] Verificar en el navegador con dev server del worktree (datos de una corrida local `--dry-run` no escriben, así que para la vista se usa un snapshot de prueba en Mongo en memoria o el VPS tras el deploy): 375 px y 1280 px, scroll carga más, paginación salta, acciones cambian el estado.
- [ ] Commit `feat(reddit-opps): /oportunidades-reddit, la cola en cards con scroll infinito`.

### Task 8: verificación, deploy y primera corrida

- [ ] `npm test` raíz y `cd app && npm test && npm run lint` → PASS.
- [ ] PR contra `main` (automerge), esperar CI verde y deploy.
- [ ] En el VPS: `pm2 start` lo hace el deploy; correr una vez `node dist/sync_reddit_opportunities.js` y leer el resumen (por sub: leídos/candidatos/recomendados).
- [ ] Medir producción: `/api/reddit-opportunities` con token admin o la página logueada; muestrear 20 recomendados y anotar cuántos son buenos.
- [ ] Memoria: archivo nuevo + línea en `reddit-index.md`.
