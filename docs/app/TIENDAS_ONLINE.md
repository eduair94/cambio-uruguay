# Tiendas online de Uruguay (`/tiendas-online-uruguay`)

Un directorio de 76 tiendas curadas a mano (`classes/stores/registry.ts`), cada una con hasta seis
señales verificables — sitio propio, antigüedad de dominio, Trustpilot, Google Maps, menciones en
Reddit y presencia en los catálogos propios del sitio — fechadas y con su fuente. **No hay puntaje
ni veredicto en ningún lugar de esta feature**: nunca "confiable"/"estafa"/"recomendamos"/"evitá",
sólo hechos con de dónde salen y cuándo se leyeron. `tests/unit/storeProfiles.test.ts` (app) revisa
directamente que ninguna de esas palabras aparezca en el texto generado.

## Las seis señales

Cada señal es un sub-documento con su propio `checkedAt`; no hay una fecha única para todo el
perfil porque cada fuente se lee — y puede fallar — de forma independiente.

| señal | módulo | de dónde | sólo aplica cuando |
|---|---|---|---|
| `site` | `classes/stores/signals/site.ts` | la home de la tienda: HTTPS, plataforma (fenicio/shopify/vtex/woocommerce/tiendanube/wix/magento/nextjs/otra), teléfono/WhatsApp/mail, RUT (sólo si está etiquetado "RUT"/"R.U.T.", nunca inferido de 12 dígitos sueltos), dirección (sólo de un `PostalAddress` JSON-LD, nunca de texto libre), políticas de devolución/términos/privacidad, medios de pago mencionados | tiene `domain` |
| `age` | `classes/stores/signals/age.ts` | certificado TLS más antiguo en crt.sh; si crt.sh no contesta o no tiene nada, primera captura en la Wayback Machine | `domain` y `kind === "tienda-uy"` |
| `trustpilot` | `classes/stores/signals/trustpilot.ts` | el servicio propio de Trustpilot (`:3029`, el mismo que usan las casas de cambio) — `businessUnit`, descartado si tiene 0 reseñas o el score no está en 0-5 | `domain` y `trustpilotDomain !== null` |
| `google` | `classes/stores/signals/google.ts` | el proxy propio de Google Places (`:2221`) — busca por nombre, pero SÓLO cuenta un candidato cuyo `website` propio resuelva al dominio de la tienda (`sameSite`); nunca por coincidencia de nombre, que puede ser un local homónimo o un revendedor | `domain` y `kind === "tienda-uy"` |
| `reddit` | `classes/stores/signals/reddit.ts` | Arctic Shift (archivo público que conserva lo borrado) sobre r/uruguay y r/montevideo — menciones, por año, hasta 5 hilos, sin autor ni cuerpo de comentario | `redditTerms.length > 0` |
| `catalog` | `classes/stores/signals/catalog.ts` | los catálogos propios (`equiparitems`, `chaircatalogproducts`) resueltos por `storeKeyForSeller`, sin llamada de red — es la única señal que nunca falla por una fuente externa | siempre |

### Convención `undefined` / `null`

Es la pieza central de todo el diseño (`classes/stores/profile.ts` `mergeSignal`):

- **`undefined`** = la fuente no contestó esta semana (crt.sh caído, el servicio de Trustpilot
  abajo, presupuesto de Reddit agotado). El valor anterior se conserva **con su fecha vieja**, para
  que la página pueda decir cuándo fue cierto en vez de fingir que se revisó hoy.
- **`null`** = la fuente contestó y no hay nada (sin página de Trustpilot, sin listado de Maps cuyo
  sitio sea el dominio de la tienda). El valor anterior SE BORRA: publicarlo contradiría a la fuente.

Un valor guardado tampoco vive para siempre: `STORE_SIGNAL_MAX_AGE_DAYS = 60`
(`classes/stores/profile.ts`, espejado en `app/utils/storeProfiles.ts` como
`STORE_SIGNAL_MAX_AGE_DAYS`) hace que una señal más vieja que eso deje de contar para `indexable`
sola, sin que nadie tenga que acordarse de vencerla a mano. La paridad de esa constante — y de
`INDEXABLE_MIN_SIGNALS`/`STORE_INDEXABLE_MIN_SIGNALS` — la vigila
**`app/tests/unit/storeConstantsParity.test.ts`**, no un test en la raíz: un test de la raíz no
puede cargar un archivo de `app/` (Vite resuelve `app/tsconfig.json` → `app/.nuxt/tsconfig.json`,
que sólo existe después de instalar `app/`, y el job de CI del backend nunca lo instala).

## `signals` / `indexable`, recalculados en cada lectura

El documento guarda `signals` (cuántas señales frescas tenía **al escribirse**) e `indexable`
(`signals >= INDEXABLE_MIN_SIGNALS`, hoy 3). Ninguna ruta de la API confía en esos dos campos tal
cual están guardados: los recalculan contra `now` en el momento de servir
(`storeFreshSignals`/`storeIndexable`, `app/utils/storeProfiles.ts`), porque un perfil sólo se
reescribe cuando alguna fuente externa contestó esa semana — si todas estuvieron caídas, los campos
guardados envejecen sin que nadie los actualice. Sin este recálculo, una tienda que dejó de tener
datos frescos hace tiempo seguiría leyendo como indexable simplemente porque nadie volvió a
escribir el documento. Lo hacen `GET /api/stores` (índice), `GET /api/stores/<slug>` (ficha) y
`app/server/api/__sitemap__/urls.get.ts` (el sitemap).

**No hay `noindex` en ninguna plantilla de esta familia** — `seoContract` lo prohíbe para páginas
programáticas (`PROGRAMMATIC_PAGES`). La señal de indexabilidad es el sitemap: sólo entra una
`/tiendas-online-uruguay/<key>` cuya tienda sigue en el registro curado (`isStoreDirectoryKey`) y
cuyo `storeIndexable(doc, now)` da `true` en el momento de generarlo.

## Las dos rutas de la API

- **`GET /api/stores`** (`app/server/api/stores/index.get.ts`) — una fila por **cada** tienda del
  registro curado, tenga o no perfil escrito todavía (`hasProfile`). Los campos `since`/
  `trustpilot`/`google`/`redditMentions`/`catalogOffers` sólo se llenan cuando la señal propia sigue
  fresca (`storeSignalFresh`); si no, `null` — que significa "sin dato fresco", nunca "sin perfil en
  Trustpilot". `reviewedAt` es el `updatedAt` más nuevo entre todos los perfiles escritos.
- **`GET /api/stores/<slug>`** (`[slug].get.ts`) — 404 ANTES de tocar la base si `slug` no está en
  el registro curado (`isStoreDirectoryKey`); 404 también si el registro lo tiene pero todavía no
  hay documento (`"Todavía no hay ficha para esta tienda"`). Ambas rutas excluyen con `.select` el
  estado de trabajo interno que nunca se publica: `toneCache`, `redditMentions`, `redditCursor`,
  `redditTermsKey` (y la lista de índice también saca `_id`/`__v`/`createdAt`).

### Por qué el hub linkea distinto que un vendedor de equipar/sillas

El hub (`index.vue`) lista **todas** las tiendas del registro, con o sin ficha — las que no tienen
perfil se muestran como tarjeta vacía, no se ocultan. Pero un enlace desde afuera (la ficha de un
producto en `/equipar-casa-uruguay` o `/sillas-escritorio-uruguay`) sólo debe apuntar a una tienda
que realmente tiene documento, porque la ficha devuelve un 404 de verdad si no lo tiene. Esa lista
de claves con ficha viaja bajo su **propia** clave de `useFetch`
(`useStoreProfileKeys.ts`, clave `'store-profile-keys'`) — nunca la del hub (`tiendas-online-index`)
ni la de una ficha individual (`store-<key>`), porque Nuxt cachea el payload por clave y reusar una
de esas con un `transform` distinto serviría la forma equivocada a quien la pidió primero.

## Cómo se arma un perfil (`sync_store_profiles.ts`)

Corre una tienda a la vez, sobre todo el registro (o un subconjunto con `--only=key,key`):

1. Lee `site`, `age`, `trustpilot`, `google` (en modo `full`; en `--reddit-only` estas cuatro no se
   llaman en absoluto y llegan como `undefined` a `buildProfile`, que conserva el valor anterior tal
   cual — ver más abajo).
2. Lee Reddit de forma incremental (`fetchRedditIncrement`) desde el cursor guardado.
3. Clasifica el tono de las menciones nuevas de esta corrida (`classifyMentions`/
   `freshMentionsToClassify`, Gemini `gemini-2.5-flash-lite`).
4. Resuelve la presencia en catálogos propios (una sola vez para toda la corrida, no por tienda).
5. Arma el documento (`buildProfile`) y lo **guarda de inmediato**, antes de pasar a la próxima
   tienda — no al final de la corrida.

**Cada tienda se guarda apenas se lee, y sólo si alguna fuente externa contestó** (`site`, `age`,
`trustpilot`, `google` o `reddit` — el catálogo propio no cuenta para esta regla porque siempre
contesta cuando Mongo contesta, así que contarlo escondería una caída de red detrás de un "sí
hubo respuesta"). Esto es a propósito: un backfill de Reddit que tarda horas nunca pierde lo que ya
hizo, aunque el proceso se corte a mitad de camino. Si las primeras 10 tiendas de la corrida no
consiguieron ninguna respuesta nueva, las fuentes están caídas: la corrida corta sin escribir nada
y sale con código 1 (`shouldStopEarly`).

`--dry-run` nunca escribe: el módulo escritor (`classes/stores/store.ts`) sólo se importa fuera de
la rama dry-run, así que una laptop cuyo `.env` apunte a producción no puede alcanzarlo por
accidente. Un dry run tampoco carga los perfiles guardados, así que lee Reddit como si arrancara de
cero (acotado por el mismo presupuesto de llamadas).

### Reddit: incremental, por ventanas, con memoria de qué tamaño funciona

Medido contra Arctic Shift el 2026-09-16: una búsqueda cara no vuelve como 429 sino como HTTP 422 (o
a veces 200) con `{"error":"Timeout. Maybe slow down a bit"}`; en r/uruguay una búsqueda de
comentarios de un mes y una de posts de tres meses ya agotan el tiempo, mientras que ventanas de
14-21 días (comentarios) y 30 días (posts) sí contestan; una respuesta trae como máximo 100 filas;
y `after`/`before` son **exclusivos** (una fila creada justo en `after` no vuelve).

Por eso cada tienda guarda un cursor (`RedditCursor`): las primeras corridas hacen un backfill de
**24 meses** en ventanas (posts cada 6 meses, comentarios cada 3), paginando cada ventana; una vez
terminado, cada corrida sólo lee desde un día antes de donde quedó la anterior. Una ventana que
sigue agotando el tiempo se parte a la mitad hasta un piso de 14 días; los tamaños que fallaron y
los que respondieron se recuerdan **para el resto del proceso** (`spanMemory`), así la próxima
tienda no paga los mismos reintentos — con un piso: una ventana sólo se considera "aprendida" como
lenta si tenía al menos 14 días, y como "funciona" si tenía al menos 7, para que un tropiezo de
carga puntual no le queme el presupuesto entero a chunks diminutos por el resto de la corrida.
Cualquier otra falla que sobrevive los reintentos (429, 5xx, red, consulta rechazada) corta la
lectura de Reddit de esa tienda para la corrida — partir la ventana no arregla una caída real.

No hay conteo publicado de menciones hasta que el backfill de 24 meses termina: un conteo que sólo
cubre la mitad de la ventana se leería como un hecho sobre la tienda que no es. Se guardan hasta
**500 menciones** por tienda (`STORE_REDDIT_MAX_MENTIONS`), metadata únicamente — id, tipo,
subreddit, fecha, hilo, título, permalink y score — **nunca** cuerpo de comentario ni autor
(`classes/stores/signals/reddit.ts`, módulo "Reddit sin personas, por diseño"). El texto crudo de
una mención sólo existe en memoria, durante la corrida que la trajo, y únicamente para que el
clasificador de tono lo lea una vez.

Un cambio de `redditTerms`/`redditMatch` en el registro invalida todo lo guardado: el cursor, las
menciones y el `toneCache` de esa tienda arrancan de cero la próxima corrida
(`redditTermsKey`/`carriedReddit`).

**Los hasta 5 hilos publicados se re-verifican en vivo antes de guardarse** (`verifyLiveThreads`,
fix round F1): Arctic Shift es un archivo que conserva lo borrado, así que un hilo que
`summarizeMentions` eligió por puntaje puede llevar meses eliminado por un moderador o por su
autor. Justo antes de guardar el perfil, esos hilos se chequean contra el `/api/info` **en vivo** de
Reddit (`classes/reddit.ts`, OAuth — una fuente distinta de Arctic Shift): el que ya no existe se
descarta, y al que sigue existiendo se le reemplaza el puntaje archivado por el actual. Si Reddit en
vivo no contesta, la corrida no publica NINGÚN título ese hilo — la lista queda vacía —, pero el
conteo de menciones (`mentions`/`byYear`) no se toca: sólo se cae la lista de hilos destacados.

### Tono automático (`toneCache`)

Un tono agregado por tienda — cantidad de quejas/recomendaciones/neutrales — nunca un veredicto por
mención. Se clasifica **una sola vez por id de mención**, con Gemini
(`gemini-2.5-flash-lite`, fijo — cambiarlo cambiaría la serie), y se cachea para siempre
(`toneCache`, campo del perfil, nunca publicado). El texto de una mención sólo existe en memoria
durante la corrida que la trajo, así que lo que esa corrida no clasifica queda sin clasificar para
siempre — no hay una segunda oportunidad, por eso el tope por corrida (`STORE_TONE_MAX_PER_RUN`,
igual a `STORE_REDDIT_MAX_MENTIONS`, 500) cubre todo lo que podría sobrevivir al merge en una sola
pasada, en lotes de 25 (hasta 20 llamadas a `askJSON` por tienda). El tono publicado exige al menos
5 menciones clasificadas; con menos, `tone` es `null` — una tienda con un solo comentario enojado no
debe leerse como "100% quejas". `pruneToneCache` descarta cualquier id que el tope de 500 menciones
ya sacó de lo guardado.

### El dominio cambia → las señales de dominio se caen

`site`, `age`, `google` y `trustpilot` son hechos sobre un **dominio**, no sobre la tienda en
abstracto. Si el registro cambia el `domain` de una tienda, todo lo guardado sobre el dominio
anterior se descarta esa misma corrida (`carriedSignals`) — no se conserva con fecha vieja, porque
describiría otro sitio. Trustpilot además se cae si su página revisa un dominio distinto al que
ahora apunta la tienda (`trustpilotDomain ?? domain`), o si no dice qué dominio revisa. El catálogo
propio y Reddit están atados a la tienda, no al dominio, y sobreviven un cambio de dominio (Reddit
sigue su propia regla de `redditTermsKey`).

## `--reddit-only` y los dos jobs de pm2

Medido en el backfill (Task 12): completar los 24 meses de una tienda cuesta ~90 llamadas a Arctic
Shift. Con el presupuesto semanal (900 llamadas, 76 tiendas) el backfill completo tardaría ~8
semanas. Por eso hay un segundo modo, sólo para Reddit, corriendo cada noche:

| pm2 app | script | cron (UTC) | qué hace |
|---|---|---|---|
| `currency-store-profiles` | `scripts/run-store-profiles.sh` | `17 7 * * 0` (domingo 07:17 UTC = 04:17 Montevideo) | corrida completa semanal: las seis señales, sobre las 76 tiendas del registro |
| `currency-store-reddit` | `scripts/run-store-profiles.sh --reddit-only` | `41 3 * * *` (diario 03:41 UTC = 00:41 Montevideo) | sólo Reddit; `site`/`age`/`trustpilot`/`google`/catálogo no se tocan en absoluto (no sólo "no fallaron": ni se llaman) |

`--reddit-only` sólo procesa tiendas cuyo backfill de 24 meses **no** terminó
(`needsRedditBackfill`) — una tienda ya al día no le suma nada a este modo; de ahí en más su señal
de Reddit la mantiene fresca la corrida semanal, día a día. Por noche NO se agotan las 900 llamadas
del presupuesto: el tope de reloj de pared (`STORES_REDDIT_MAX_MINUTES`, 150 minutos) corta antes,
y a ~16,7 s por llamada (medido en el Task 13) eso da ~540 llamadas antes de cortar (150×60/16,7 ≈
540) — no las 900 completas. Con ~90 llamadas por tienda (arriba) y 76 tiendas (~6.840 llamadas en
total), el backfill completo termina en ~13 noches (6.840/540 ≈ 12,7) en vez de ~8 semanas.

La barra para guardar cambia en este modo: no alcanza con "Reddit contestó" (una llamada que sólo
reconfirma una ventana ya cubierta no aporta nada), hace falta que Reddit **haya avanzado de
verdad** — una mención nueva o el cursor movido (`redditProgressed`/`shouldSaveStore`).

Un tope de reloj de pared independiente del presupuesto de llamadas
(`STORES_REDDIT_MAX_MINUTES`, default 150) corta el modo `--reddit-only` **entre** tiendas (nunca a
mitad de una) para que una noche lenta de reintentos no llegue a pisar el arranque de la corrida
semanal del domingo.

### El flock compartido (`scripts/run-store-profiles.sh`)

Los dos jobs leen y reescriben los MISMOS documentos de `storeprofiles`, y una corrida
`--reddit-only` puede tardar hasta ~4 h con el presupuesto completo — tiempo de sobra para seguir
corriendo cuando arranca la semanal del domingo. El wrapper comparte un `flock` sobre
`/tmp/cambio-uruguay-store-profiles.lock` (configurable con `STORES_LOCK_FILE`):

- la corrida **nocturna** (`--reddit-only`) toma el lock sin esperar (`flock -n`): si la semanal ya
  lo tiene, imprime un aviso y sale con 0 — no espera, no compite.
- la corrida **semanal** (completa) SÍ espera, hasta `STORES_FULL_LOCK_WAIT_SECONDS` (default 7200 =
  2 h): no debe cancelarse silenciosamente por una corrida nocturna que sigue en curso.

### Flags de `sync_store_profiles.ts`

- `--dry-run` — imprime, nunca escribe (ver arriba).
- `--only=key,key` — subconjunto del registro por clave; una clave que no existe corta con error.
- `--reddit-only` — ver arriba.
- `STORES_REDDIT_MAX_CALLS` (default 900) — presupuesto de llamadas HTTP a Arctic Shift por corrida,
  compartido entre todas las tiendas y ambos jobs (cada uno lo aplica a su propia corrida).
- `STORES_REDDIT_MAX_MINUTES` (default 150) — sólo para `--reddit-only`, ver arriba.

## Colecciones (APP DB)

- **`storeprofiles`** (`classes/models/StoreProfile.ts`, espejo en
  `app/server/models/StoreProfile.ts`) — un documento por tienda curada, `key` único, nunca se
  borra (una tienda sacada del registro conserva su último perfil). Campos privados que ninguna
  ruta de la API selecciona jamás: `toneCache`, `redditMentions`, `redditCursor`,
  `redditTermsKey`. No hay `storeprofilesmeta`: el hub calcula `reviewedAt` como el `updatedAt` más
  nuevo entre los documentos existentes.

## Fuentes externas y cómo fallan

| fuente | para qué | modo de falla conocido |
|---|---|---|
| Home de la tienda | `site` | interstitial de Cloudflare ("Just a moment" + `challenge-platform`) se detecta y se guarda como `status: "blocked"`, no como error de red — sigue contando como respuesta (no es `undefined`) |
| crt.sh | `age` (primario) | timeouts/5xx bajo carga; un reintento con pausa antes de caer a Wayback |
| Wayback Machine CDX | `age` (fallback) | a veces devuelve una página HTML "Internet Archive: Temporarily Offline" en vez de JSON — se lee como "sin dato", nunca como error |
| Servicio propio de Trustpilot (`:3029`) | `trustpilot` | 5xx o sin respuesta → `undefined`; 404 → `null` (sin página) |
| Proxy propio de Google Places (`:2221`) | `google` | 5xx o sin respuesta → `undefined`; `ZERO_RESULTS` o ningún candidato con `website` coincidente → `null` |
| Arctic Shift | `reddit` | HTTP 422 (o 200) con `error: "Timeout..."` — no es un 429; `after`/`before` exclusivos; 100 filas por página; ver la sección de arriba |

## Cómo agregar una tienda

1. **Backend** — nueva entrada en `classes/stores/registry.ts` (`STORES`): `key`, `name`, `domain`,
   `kind`, `rubros`, `aliases` (siempre incluye `name`), y opcionalmente `retailStoreKey` (si
   también es una tienda relevada en `classes/retail/stores.ts`), `trustpilotDomain` (si difiere de
   `domain`, o `null` para no consultar Trustpilot), `redditTerms` (`[]` si el nombre es una palabra
   común sin forma barata de desambiguar) y `redditMatch` (regex de contexto para un nombre común
   que sí se quiere consultar — ver los comentarios de `Divino`/`El Dorado`/`LOi`/`Ta-Ta` en el
   registro).
2. **Espejo de `app/`** — la misma entrada, con los mismos `key`/`name`/`domain`/`kind`/`rubros`/
   `aliases` (sin los campos sólo-backend), en `app/utils/storeDirectory.ts` (`STORE_DIRECTORY`), en
   el **mismo orden**.
3. **Paridad** — `app/tests/unit/storeDirectoryParity.test.ts` falla si las dos listas divergen en
   claves, orden o cualquiera de esos cinco campos, y también revisa que `storeSlugForSeller` (app)
   y `storeKeyForSeller` (backend) resuelvan igual cada alias.
4. La primera corrida del job (semanal o `--only=<key>`) escribe el perfil; hasta entonces la tienda
   aparece en el hub sin ficha propia (`hasProfile: false`) y ningún enlace externo apunta a ella
   todavía.

## Cómo diagnosticar

- **¿Por qué esta tienda no tiene ficha?** `GET /api/stores` y mirar `hasProfile` — si es `false`,
  el job todavía no la procesó ni una vez (revisar el log de `currency-store-profiles` por su
  `key`).
- **¿Por qué no es indexable?** `GET /api/stores/<slug>` y contar cuántas de `site`/`age`/
  `trustpilot`/`google`/`reddit`/`catalog` tienen `checkedAt` de menos de 60 días — hace falta 3 o
  más. Recordar que `reddit`/`catalog` sólo cuentan si además tienen `mentions > 0` / `offers > 0`.
- **¿Por qué una señal quedó vieja?** Es `undefined` en la fuente, no `null`: revisar el log de la
  corrida más reciente por `[tiendas] <key> ... sin respuesta: <señal>` — la línea que imprime
  `formatStoreLogLine` en `sync_store_profiles.ts`.
- **¿Por qué el backfill de Reddit de una tienda no avanza?** Mirar `redditCursor` (no publicado por
  la API — sólo visible directo en Mongo o en el log `reddit leyendo <fecha>→<fecha>`) y el log de
  `currency-store-reddit` por `[tiendas] reddit <key> r/<sub> <kind> "<term>": <detalle>` — ahí
  queda registrada la consulta exacta que falló.
- **¿Por qué el tono no aparece?** `reddit.tone` es `null` con menos de 5 menciones clasificadas
  (`applyTone`); revisar cuántos ids tiene `toneCache` en Mongo (no publicado por la API) contra
  `redditMentions.length`.
- **¿Se solaparon los dos jobs de Reddit?** Revisar si `currency-store-reddit` imprimió "otra
  sincronización está en curso; se saltea la corrida de Reddit" (perdió el `flock -n`) o si
  `currency-store-profiles` imprimió el aviso de agotar la espera de `FULL_LOCK_WAIT_SECONDS`
  (nunca llegó a correr).

## Qué NO se publica, y por qué

- **Ningún veredicto de confianza.** Ni una palabra tipo "confiable"/"estafa"/"recomendamos"/
  "evitá" en ningún texto generado — cada oración de `storeSignalSummary`/`storeFaq` es un hecho con
  su fuente y su fecha, nunca una opinión del sitio.
- **Autor ni cuerpo de comentario de Reddit.** Ni en lo que se guarda (`StoredRedditMention`) ni en
  lo que se publica (`RedditSignal`) — sólo metadata (id, tipo, subreddit, fecha, hilo, título,
  permalink, score) y, agregado, el conteo de tono.
- **El estado de trabajo de Reddit** (`redditMentions`, `redditCursor`, `redditTermsKey`) ni el
  **`toneCache`** — nunca en la respuesta de ninguna ruta de la API (`.select` los excluye siempre);
  son mecanismo interno del job, no un dato para la página.
- **Un dominio que ya no es el de la tienda.** Un cambio de `domain` en el registro descarta
  `site`/`age`/`google`/`trustpilot` viejos esa misma corrida, aunque estuvieran frescos — describen
  otro sitio.
- **Una dirección sin fecha ni fuente.** `storeAddress` (`app/utils/storeProfiles.ts`) sólo muestra
  la de Google Maps o la del propio sitio (JSON-LD), y sólo si esa señal sigue fresca — nunca una
  dirección vieja mostrada como si fuera actual.
- **Una tienda fuera del registro curado, aunque tenga perfil viejo.** `isStoreDirectoryKey` corta
  antes de tocar la base — la ficha 404s de verdad para cualquier clave que ya no está en
  `classes/stores/registry.ts`.
- **Un enlace "(ficha)" desde afuera hacia una tienda sin documento.** El hub muestra tarjetas vacías
  para tiendas sin perfil, pero un vendedor en `/equipar-casa-uruguay` o
  `/sillas-escritorio-uruguay` sólo enlaza cuando su clave está en `useStoreProfileKeys()` — de lo
  contrario queda como texto plano.
- **`indexable`/`signals` guardados tal cual, sin recalcular.** Ver la sección de arriba: todas las
  rutas de lectura los recomputan contra `now`.
