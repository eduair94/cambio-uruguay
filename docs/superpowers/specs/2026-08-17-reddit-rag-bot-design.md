# Bot de Reddit con RAG del sitio — diseño

**Fecha:** 2026-08-17
**Estado:** aprobado (respuestas del brainstorming abajo)

## Qué es

Un bot que vigila los subreddits uruguayos, detecta publicaciones que el sitio ya
sabe contestar, y responde con una explicación breve fundamentada en el contenido
real del sitio + un enlace a la página concreta. Cuando no existe página para el
tema, en lugar de responder registra el hueco y genera un borrador fundamentado.

El retriever es RAG denso+léxico sobre el contenido publicado en
cambio-uruguay.com, con los embeddings guardados en el Mongo del servidor 104
(el de la app, `APP_MONGO_URI` → `localhost:27017` en esa máquina).

## Decisiones tomadas

| Pregunta | Respuesta |
|---|---|
| Modo de publicación | **Auto total desde el día 1**, con límites duros y corte automático |
| Cuenta de Reddit | El usuario la crea y carga las credenciales en el `.env` del VPS |
| Vector store | Colección Mongo en el 104 + coseno en memoria |
| Subreddits | `uruguay`, `Burises`, `UruguayFinanzas`, `LegalUruguay`, `AskUruguayan`, `monte_video`, `CharruaDevs` |
| Umbral | **Solo responde si hay página específica**; si no hay, genera borrador |

### La excepción explícita sobre "generar la página"

El pedido fue: si no hay página específica, generarla. Este diseño la **genera
como borrador**, no la publica. Motivo: el sitio tiene guardrails propios que un
auto-publish rompería — nada de cifras sin fuente, verificación de normas contra
el texto vigente, `noGeminiInApp`, y el test AST que prohíbe números no citados.
Una página generada y publicada sola sería la primera del sitio sin ojo humano,
justo en temas (aduana, impuestos, préstamos) donde una cifra mal puesta cuesta
plata a quien la lee.

Entonces: hueco detectado → borrador `.md` fundamentado con fuentes en
`docs/reddit-gaps/` + fila en Mongo + aviso a Telegram. El bot **no responde** ese
hilo. Publicar el borrador es un acto humano (revisar, portar a `.vue`, mergear).

## Arquitectura

Cuatro procesos pm2 independientes en el backend raíz, más módulos compartidos en
`classes/redditbot/` y `classes/rag/`.

```
                    ┌──────────────────────────────────────┐
  sitemap del sitio │  sync_rag_index.ts   (diario 04:20)  │
  4.631 URLs ──────▶│  crawl → chunk → embed → Mongo(104)  │
                    └──────────────────┬───────────────────┘
                                       │ ragchunks
                                       ▼
  /r/<sub>/new  ┌────────────────────────────────────────────────┐
  cada 12 min ─▶│  sync_reddit_bot.ts   (currency-reddit-bot)    │
                │  1 filtro barato  2 retrieve  3 juez  4 redacta│
                │  5 gates  6 postea  7 ledger                   │
                └───────┬────────────────────────────┬───────────┘
                        │ hay página                 │ no hay página
                        ▼                            ▼
                  comentario en Reddit         redditcontentgaps
                        │                            │
                        ▼                            ▼
        sync_reddit_bot_watch.ts (horario)   sync_content_gaps.ts (diario)
        score/removed → alerta → circuit     cluster → borrador .md + Telegram
```

### Por qué en el backend raíz y no en `bots/`

`bots/` no auto-deploya (hay que buildear a mano en el VPS) y no tiene acceso a
Mongo del backend ni al cliente Gemini compartido. El backend raíz sí:
auto-deploya por path-filter al pushear a main, ya tiene `classes/gemini.ts`,
`classes/reddit.ts`, `classes/appdb.ts` y `classes/notify.ts`, y el patrón de
"un `sync_*.ts` por cron" es exactamente esta forma. Los cuatro procesos son
single-instance, así que no chocan con la regla de que el API en cluster no
puede tener trabajo agendado.

## Componentes

### 1. `classes/rag/` — el índice

**`sources.ts`** — decide qué URL entra y con qué profundidad.

- Descarta locales `/en/*` y `/pt/*` (el bot contesta en español).
- Descarta `/blog/*` (125 posts diarios de IA, efímeros) y `/newsletter/*`:
  linkear un post automático del día a un hilo de Reddit es ruido, no ayuda.
- **Tier A — texto completo** (~430 páginas): editoriales de primer nivel,
  `/guias/*`, `/herramientas/*`, `/importar/*`, `/temas/*`, `/glosario/*`,
  `/indicadores*`, `/dolar*`, `/frontera/*`, `/casas-de-cambio*`.
- **Tier B — un solo chunk de título+descripción, SIN embedding** (~1.900 páginas):
  las familias programáticas `/sucursal/*`, `/sucursales/*`, `/casa/*`,
  `/comparativas/*`, `/historico/*`, `/convertir/*`, `/cotizacion/*`,
  `/sillas-escritorio-uruguay/*`. Sirven para "¿dónde cambio en Maldonado?" sin
  inflar el índice con plantillas repetidas. Participan sólo del brazo léxico: esa
  pregunta la gana la palabra *Maldonado*, no un matiz de significado, así que el
  embedding no aportaría nada y cuesta el 40% del cupo diario (ver `embed.ts`).

**`crawl.ts`** — fetch + extracción. axios + cheerio, concurrencia 4, timeout por
petición con `AbortSignal.timeout` (el repo ya se comió el bug de `timeout` de
axios que no acota un CONNECT colgado). Saca `<main>`, tira `nav/footer/script/
style/aside/noscript`, colapsa espacios, guarda `title`, `metaDescription`, `h1`
y el texto con el camino de encabezados. Recrawl incremental: sólo si el
`lastmod` del sitemap es más nuevo que el `crawledAt` guardado.

**`chunk.ts`** — corta en ~1.100 caracteres con 180 de solape, sin partir
oraciones cuando puede, y le antepone a cada chunk `title › h2 › h3` para que el
embedding tenga contexto. Cada chunk lleva `contentHash` (sha1).

**`embed.ts`** — `gemini-embedding-001`, `outputDimensionality: 768`,
`taskType: RETRIEVAL_DOCUMENT` al indexar y `RETRIEVAL_QUERY` al consultar.
**Normaliza L2 siempre**: verificado contra la API real, a 768 dims este modelo
devuelve vectores con norma ≈0,59 (Matryoshka truncado), así que el coseno sin
normalizar da números que parecen scores y no lo son. Re-embebe sólo los chunks
cuyo `contentHash` cambió.

El HTTP no vive acá sino en `classes/gemini.ts`: `tests/gemini_key_ownership.test.ts`
prohíbe que otro archivo del backend nombre el endpoint, y tiene razón — es la
misma clave, la misma cuota y el mismo pacer que usan todos los jobs con IA.

**La cuota de embeddings es por DÍA, y este proyecto está en free tier para ese
endpoint.** Verificado contra la API real:
`EmbedContentRequestsPerDayPerUserPerProjectPerModel-FreeTier = 1000`, con cada
ítem del batch contando como un request. Que `generateContent` se comporte como
pago no implica nada sobre los embeddings.

Eso no es un detalle operativo: cambia el diseño. Con ~3.400 chunks embebibles el
primer índice no entra en un día, así que:

- las páginas de tier B **no se embeben nunca** — van sólo por el brazo léxico, que
  es exactamente donde un título de plantilla se recupera mejor. Ahorra el 40% del
  corpus sin perder nada.
- el indexador gasta `RAG_EMBED_DAILY_BUDGET` (700) y para. Lo que no alcanzó
  conserva su fila anterior y lo toma la corrida siguiente; el `contentHash` hace
  que eso sea gratis. El índice converge en ~5 días.
- el bot tiene tope propio por corrida (`REDDIT_BOT_MAX_CANDIDATES`, 12), y
  preselecciona con el brazo léxico —gratis— antes de gastar un embedding. Sin ese
  tope, 65 corridas diarias se comen el presupuesto del indexador y el índice queda
  a medio construir para siempre.

Aparte: al recibir un 429 el bucle ingenuo pierde la corrida entera, porque dispara
el lote siguiente dentro de la misma ventana cerrada — pasó en la calibración, 5
lotes seguidos, 60% del índice. Por eso `embedTexts` espera 45 s tras un lote vacío
y lo reintenta una vez.

**`store.ts`** — colección `ragchunks` en la app-DB vía `appModel()`. El vector va
como `Buffer` (Float32Array cruda, 3 KB por chunk) en vez de array de 768 doubles
de BSON: ~5.400 chunks entran en ~17 MB en vez de ~90 MB, y cargar el índice es
un `find()` y un `new Float32Array(buf.buffer)`.

**`retrieve.ts`** — híbrido con fusión de rangos recíprocos (RRF):

- **Denso**: coseno del embedding de la consulta contra todos los chunks. 5.400
  productos punto de 768 dims son ~4 M multiplicaciones — menos de 10 ms.
- **Léxico**: BM25 sobre tokens normalizados en español (sin tildes, sin
  stopwords). Necesario porque Reddit escribe en jerga —"me trabó la aduana",
  "cuánto está el verde"— y ahí el denso solo se pierde nombres propios (OCA,
  Prex, BROU, DGI) que el léxico clava.
- Fusión RRF (k=60), después agrega chunk→página tomando el mejor chunk más un
  bonus decreciente por chunks adicionales de la misma página.
- Devuelve `{ url, title, score, cosine, chunks[] }` ordenado.

**El score RRF no sirve como umbral, y eso costó un bug.** Con k=60, el máximo
teórico de una página que gana los dos brazos es `2/61 ≈ 0,033`: el `0.034` que
tenía este spec como "score mínimo" habría dejado al bot mudo para siempre, con
cara de valor calibrado. El score fusionado sirve para *comparar*, no para medir,
así que la puerta compara: coseno del mejor chunk (escala 0-1, interpretable) más
margen sobre la segunda página. Que cuatro páginas empaten significa que cubrimos
el tema pero no contestamos la pregunta — que es la definición de hueco.

El índice se carga una vez por proceso y se refresca si el proceso vive más que
el TTL. Los procesos son crons cortos, así que en la práctica es una carga.

### 2. `classes/redditbot/` — el bot

**`config.ts`** — todo por env, con defaults conservadores. Un `.env` vacío deja
todo en no-op silencioso, igual que el resto de los bots del repo.

**`watch.ts`** — lee `/r/<sub>/new` de los 7 subs (hace falta agregar `fetchNew()`
a `classes/reddit.ts`, que hoy sólo tiene `searchPosts` y `fetchComments`).

**`filter.ts`** — descarte barato antes de gastar un embedding:

- edad entre 15 min y 8 h (dejar que mods y OP se acomoden; no revivir hilos)
- no respondido antes (ledger), no propio, no `locked`/`removed`/`stickied`/NSFW
- el hilo no menciona ya `cambio-uruguay.com`
- forma de pregunta **o** al menos un término del léxico temático
- largo mínimo de título+cuerpo (los "hola" no se contestan)

**`judge.ts`** — segunda puerta, Gemini plano (sin grounding, es sobre texto que
ya tenemos): recibe el post y las 3 páginas candidatas con sus mejores chunks, y
devuelve JSON `{ relevant, url, confidence, reason }`. Se exige a la vez score
del retriever ≥ umbral **y** confianza del juez ≥ umbral. Dos puertas
independientes: el retriever se equivoca por parecido léxico, el juez por
complacencia; que fallen juntas es mucho menos probable que por separado.

**`compose.ts`** — redacta con Gemini plano, con el contexto recuperado como
única fuente. Reglas dentro del prompt y **verificadas después en código**:

- responde primero, linkea después; el enlace es una sola vez y al final
- español rioplatense, voseo, sin "¡Hola! Espero que estés bien"
- 60–130 palabras
- **ninguna cifra que no esté en el contexto recuperado** — `validate.ts` extrae
  todos los tokens numéricos de la respuesta y rechaza la que tenga uno que no
  aparezca en los chunks. Es la misma disciplina que ya aplica el resto del sitio,
  ejecutada acá por código y no por confianza en el modelo.
- línea final de transparencia: que es un bot y de qué sitio
- prohibido: prometer resultados, dar consejo legal/médico, hablar de terceros

**`validate.ts`** — puerta dura post-generación: exactamente 1 enlace y al
dominio propio; sin cifras fuera de contexto; sin markdown roto; largo dentro de
rango; sin frases de la lista negra; el enlace resuelve 200 (HEAD contra el sitio
antes de postear — una respuesta con 404 es peor que ninguna).

**`limits.ts`** — los frenos, sobre el ledger en Mongo:

| freno | default | env |
|---|---|---|
| respuestas por día | 6 | `REDDIT_BOT_MAX_PER_DAY` |
| por subreddit por día | 2 | `REDDIT_BOT_MAX_PER_SUB_PER_DAY` |
| espera entre respuestas | 25 min ± jitter | `REDDIT_BOT_MIN_GAP_MIN` |
| mismo autor | 1 cada 7 días | `REDDIT_BOT_AUTHOR_COOLDOWN_DAYS` |
| mismo hilo | 1 para siempre | — |
| misma página enlazada | 1 cada 3 días | `REDDIT_BOT_PAGE_COOLDOWN_DAYS` |

El último importa más de lo que parece: tres respuestas seguidas linkeando la
misma página es el patrón que los moderadores reconocen como spam.

**`post.ts`** — cliente de escritura. Las credenciales actuales
(`REDDIT_CLIENT_ID/SECRET` con grant `installed_client`) son de sólo lectura;
postear necesita un app "script" y el grant `password` con usuario y contraseña
del bot, o un refresh token. Se soportan ambos, `REDDIT_BOT_*` separado del
lector para que un error de configuración no rompa los pipelines de lectura que
ya funcionan.

**`ledger.ts`** — colección `redditbotreplies` en la app-DB: `postId`, `sub`,
`author`, `pageUrl`, `retrievalScore`, `judgeConfidence`, `replyText`,
`commentId`, `commentFullname`, `postedAt`, `status`
(`posted|dry_run|rejected|failed`), `rejectReason`, y campos de seguimiento
(`checkedAt`, `commentScore`, `removed`).

### 3. Vigilancia y corte automático

`sync_reddit_bot_watch.ts` (horario) relee los comentarios posteados en las
últimas 72 h y anota score y si siguen vivos. Dispara:

- aviso a Telegram por cada comentario borrado o con score ≤ −2
- **circuit breaker**: 3 comentarios negativos o borrados en 24 h escriben
  `pausedUntil` en Mongo y el bot deja de postear 48 h, con aviso.

Sin esto, "auto total" significa que la primera respuesta mal calibrada se repite
seis veces por día hasta que alguien mire. Con esto, el sistema se apaga solo.

### 4. `classes/gaps/` — los huecos de contenido

`sync_content_gaps.ts` (diario). Los hilos que pasaron el filtro temático pero
fallaron la puerta de página específica quedan en `redditcontentgaps` con su
embedding. El job los agrupa por similitud (clustering aglomerativo simple sobre
el coseno, umbral 0,78), y cuando un cluster junta ≥ 4 hilos:

1. `askGrounded` investiga el tema con búsqueda web
2. se arma un borrador `docs/reddit-gaps/<fecha>-<slug>.md` con: la pregunta real
   que hace la gente (citas de los hilos), lo que encontró el modelo, **las
   fuentes resueltas** (misma regla que el resto del repo: cita que el modelo no
   abrió, no vale), y una sección "verificar antes de publicar"
3. aviso a Telegram con el slug y la demanda

Nunca escribe en `app/`. Un borrador es una entrada de trabajo, no una página.

## Datos

Tres colecciones nuevas, todas en la app-DB del 104:

- `ragchunks` — `{ url, tier, title, headingPath, text, contentHash, vector: Buffer, lastmod, crawledAt }`, índice único en `{ url, chunkIndex }`
- `redditbotreplies` — el ledger de arriba, índice único en `postId`
- `redditcontentgaps` — `{ postId, sub, title, text, embedding, topicKey, clusterId, draftPath, createdAt }`

## Configuración

```ini
# --- bot de Reddit (escritura) ---
REDDIT_BOT_ENABLED=0            # segunda puerta: sin esto sólo loguea
REDDIT_BOT_DRY_RUN=1
REDDIT_BOT_CLIENT_ID=
REDDIT_BOT_CLIENT_SECRET=
REDDIT_BOT_USERNAME=
REDDIT_BOT_PASSWORD=
REDDIT_BOT_REFRESH_TOKEN=       # alternativa a usuario/contraseña
REDDIT_BOT_SUBS=uruguay,Burises,UruguayFinanzas,LegalUruguay,AskUruguayan,monte_video,CharruaDevs
REDDIT_BOT_MAX_PER_DAY=6
REDDIT_BOT_MAX_PER_SUB_PER_DAY=2
REDDIT_BOT_MIN_GAP_MIN=25
REDDIT_BOT_AUTHOR_COOLDOWN_DAYS=7
REDDIT_BOT_PAGE_COOLDOWN_DAYS=3
REDDIT_BOT_MIN_COSINE=0.62      # el mejor chunk tiene que estar cerca
REDDIT_BOT_MIN_MARGIN=1.12      # y una página tiene que haber ganado, no cuatro empatado
REDDIT_BOT_MIN_JUDGE=0.7
# --- índice RAG ---
RAG_EMBED_MODEL=gemini-embedding-001
RAG_EMBED_DIMS=768
SITE_BASE_URL=https://cambio-uruguay.com
```

Doble puerta a propósito, igual que `content_promo`: las credenciales van a estar
en el VPS antes de que el bot esté calibrado, así que desplegar el archivo no
puede ser lo que empieza a postear.

## pm2

| app | script | cron UTC | nota |
|---|---|---|---|
| `currency-rag-index` | `dist/sync_rag_index.js` | `20 4 * * *` | crawl + embed incremental |
| `currency-reddit-bot` | `dist/sync_reddit_bot.js` | `*/12 11-23 * * *` | horario despierto de Uruguay |
| `currency-reddit-bot-watch` | `dist/sync_reddit_bot_watch.js` | `9 * * * *` | score/removed + breaker |
| `currency-content-gaps` | `dist/sync_content_gaps.js` | `35 5 * * *` | clustering + borradores |

Los cuatro van a `OTHER_APPS` en `scripts/deploy-backend.sh`, o nunca arrancan en
el VPS. (`currency-temas-analysis` sigue faltando en esa lista; se agrega de paso.)

## Errores

Todo degrada a "hoy no": ningún componente tira hacia arriba.

- Sin `GEMINI_API_KEY` → el índice no se actualiza, el bot no responde, se loguea
- Sin credenciales de bot → dry-run, se loguea
- Reddit caído → 0 candidatos, el cron sale en 0
- Un embedding que falla → ese chunk queda con el vector anterior
- Una página que no crawlea → queda la versión anterior en el índice
- Mongo inalcanzable → `process.exit(1)` explícito, no éxito silencioso (el
  tripwire de conexión del repo cubre esto)

## Tests

`tests/rag/` y `tests/redditbot/`, todos sin red:

- `chunk.test.ts` — solape, camino de encabezados, hash estable
- `embed.test.ts` — normalización L2, batching de a 100, dims
- `retrieve.test.ts` — sobre un índice fixture: que "cuánto sale traer una
  notebook" traiga `/importar/...` y no la home; que RRF le gane al denso solo en
  las consultas con nombre propio
- `sources.test.ts` — clasificación de tier y exclusiones
- `filter.test.ts` — cada regla de descarte
- `validate.test.ts` — **el central**: cifra fuera de contexto rechazada, dos
  enlaces rechazados, enlace externo rechazado, largo fuera de rango rechazado
- `limits.test.ts` — cada freno, incluido el reinicio diario y el breaker
- `ledger.test.ts` — idempotencia por `postId`
- `gaps.test.ts` — clustering y umbral de demanda
- extensión de `tests/sync/connect_tripwire.test.ts` a los 4 entrypoints nuevos
- `no_scheduler_in_api.test.ts` sigue pasando (nada nuevo en el proceso API)

## Lo que este diseño deja afuera a propósito

- Responder comentarios (no sólo posts): más superficie, más riesgo, poco tráfico
- Multi-idioma: los subs uruguayos son en español
- Publicar páginas automáticamente: explicado arriba
- Un vector DB dedicado: 5.400 chunks no lo justifican
- Panel web: por ahora el ledger en Mongo y el digest de Telegram alcanzan
