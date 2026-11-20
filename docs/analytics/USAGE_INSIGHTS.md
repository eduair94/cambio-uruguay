# Uso del sitio: `currency-usage-insights` y `/estadisticas-de-uso`

Un job diario (pm2 `currency-usage-insights`, `21 12 * * *` UTC = 09:21 en Uruguay) lee del lado del
servidor ocho fuentes sobre lo que hace la gente en cada página, calcula las **señales** con las que un
ingeniero decide la próxima iteración y deja todo en un documento privado que leen la página
`/estadisticas-de-uso` (sólo `NUXT_ADMIN_EMAILS`) y el comando `npm run insights`.

## Qué es y qué NO es

- **No agrega nada al navegador.** Ningún script, ninguna cookie, ningún pedido del visitante: todo es
  lectura de APIs desde el servidor.
- **Es privado.** La página y su API (`/api/usage-insights`) piden `requireAdmin`; la página es noindex,
  está fuera del sitemap, sin anuncios y fuera de la navegación y del buscador.
  `tests/insights/privacy.test.ts` y `app/tests/unit/usageInsightsPrivacy.test.ts` lo vigilan.
- **Sin IP, sin ids de usuario, sin texto de visitantes** salvo los términos del buscador del sitio
  (filtrados: sin correos, sin cédulas ni teléfonos, sin URLs) y **sin cifras de ingreso** (este repo es
  público). Los términos y las consultas de Bing/Search Console viven sólo en las filas: nunca en un log,
  en un resumen ni en Telegram.
- **No publica nada ni toca páginas.** Es para que una persona (o un agente) lea y decida.

## Las ocho fuentes

Cada fuente corre en su propio `try`. Una que falla no le cuesta nada a las otras y **conserva su bloque
anterior con su fecha vieja** (`fetchedAt`), con el estado (`failed`, `thin`…) y la nota de por qué.

| Fuente | Estado hoy | Qué trae | Unidades y trampas |
|---|---|---|---|
| `cloudflareRum` | anda (`CLOUDFLARE_TOKEN`, Account Analytics Read) | cargas y entradas por página, dispositivo, referente (sólo el host) y país; Core Web Vitals por página × dispositivo con bien/regular/mal y el **elemento** culpable | tiempos en **microsegundos**, −1 = sin dato; sin cookies: cuenta a quien rechazó el banner (es el denominador que no depende del consentimiento), pero un bloqueador lo frena, así que es un piso |
| `ga4Behavior` | anda (cuenta de servicio de GA4) | eventos por página (lectura al 50/90 %, salidas, navegación interna, recomendaciones, «¿Te sirvió?» mostrado), celular contra escritorio, página de entrada, búsquedas del sitio, recorridos internos, dimensiones propias | siempre `hostName` del sitio **y** `countryId = UY`; nunca métricas de ingreso |
| `indexation` | anda (Search Console, permiso «Completo») | por URL: veredicto, estado de cobertura, canónicas, último rastreo | 2.000 por día de Google, compartidas |
| `feedback` | anda (base del app) | `sitefeedbacks`: «Sí»/«No» por página, personas distintas, cuántos textos (nunca el texto) | — |
| `clarity` | **inerte** hasta `CLARITY_EXPORT_TOKEN` | clics de bronca, clics muertos, vueltas atrás, scroll excesivo, errores de JS, scroll y tiempo, por URL, dispositivo, país, navegador y canal | 10 llamadas por día por proyecto; sólo las últimas 24 h; varios nombres de campo sin verificar |
| `bing` | **inerte** hasta `BING_WEBMASTER_API_KEY` | consultas y páginas de Bing (baldes semanales), rastreo y problemas de rastreo | la clave viaja en la URL |
| `cloudflareZone` | **inerte** hasta el permiso Zone → Analytics → Read | qué rastreadores (por user-agent declarado) piden qué URLs y con qué código, errores en el borde, caché | sin IP, sin ASN, sin huellas, sin query, sin referer |
| `crux` | **inerte** hasta `CRUX_API_KEY` | los Core Web Vitals de campo que usa Google, por origen y por URL, PHONE y DESKTOP, y la historia semanal | milisegundos; el CLS llega como texto; un 404 es "sin datos de campo", no un error |

### Cloudflare RUM: por qué se archiva ayer

Una consulta directa de 14 días devolvió todos los grupos en múltiplos de 10 (`sampleInterval` 10): la
API **muestrea lo viejo**. Un día pedido mientras tiene menos de 7 días vuelve entero. Por eso cada
corrida pide AYER (y cualquier día reciente que falte), lo guarda en `usageinsightdays`, y el bloque de
28 días es la **suma de los días archivados**. Las calificaciones salen de sumar bien/regular/mal por día
(son aditivas); el p75 que se muestra es "aprox." (el del último día). Todo umbral de muestra usa
`realSamples` = Σ(eventos ÷ `sampleInterval`), así que un día muestreado cuenta una décima.

Un día con cargas uruguayas en 0, o bajo el 30 % de la mediana de los 7 anteriores, se archiva como
sospechoso, no se suma y deja el bloque en `thin` ("¿se rompió el beacon o la API?"). Después de 7 días
seguidos así se acepta: una baja real no puede congelar el bloque para siempre.

**Días a medias.** Cada una de las siete consultas de un día corre en su propio try; la que falla queda
en `missing` y el día se vuelve a pedir mientras sea reciente. Al sumar los 28 días, un día sin
`countries` no entra a `totals.all` ni a `uyShare` (sumaría 0 a todos los países y su total uruguayo
entero: la porción uruguaya podía pasar de 1), y un día sin `vitals` no entra a las calificaciones (no
suma ceros). Cuántos quedaron afuera lo dice `partialDays`. Si la consulta de páginas llega a su tope
(2.000 grupos ruta × dispositivo), sumar sus grupos deja corto el total del día: entonces el total sale
de una consulta **sin dimensiones**, y si ésa falla el día lleva `missing: totals` y la comparación de
consentimiento no se usa ("Cloudflare cortó la lista de páginas…"), porque la cobertura del sitio
saldría inflada. `consent.pagesTruncated` avisa que las cifras por ruta son un piso.

`--backfill=N` (≤ 28, y ≤ lo que `settings.notOlderThan` deje) fija un día objetivo y trae los que
falten hasta ahí; cada corrida siguiente sigue con el tope de 200 consultas por corrida hasta llegar, y
borra el objetivo.

### GA4: plantillas y "sin medición"

- Los eventos propios del sitio (`read_progress`, los de `track-clicks`) sobrescriben `page_location`
  con la ruta de **medición**: una ruta dinámica llega como `/x/:item`, mientras `page_view` llega con la
  real. Las tasas por página **pliegan** las rutas reales en su plantilla y lo dicen (`template`). Es una
  aproximación: una hermana estática que calza con la plantilla y nunca mandó un evento propio infla el
  denominador de la plantilla.
- Una página sin `measurementPath` (de cuenta, rutas dinámicas de primer nivel, guías desconocidas, 404),
  una más corta que la pantalla o una que nadie scrolleó **no manda eventos**. Una tasa de 0 ahí es "sin
  medición", nunca "nadie lee": `readMeasured` exige ≥ 20 `read_progress` en la ventana y `measured` ≥ 20
  eventos de clic o lectura.
- No existe un evento `search`: el buscador manda `search_no_results {q}` y `search_select {q}`, y `q` no
  es una dimensión registrada. Sin el paso 5.6 se sabe **cuántas** búsquedas no encontraron nada y en qué
  páginas, no **cuáles**. El job mira las dimensiones registradas en cada corrida y lo detecta solo.
- El porcentaje de lectura sale de un reporte aparte (`read_percent`) que se saltea si la cuota horaria
  de GA4 está baja (la comparten `currency-site-analytics` y `/site-analytics-realtime`) o si falla. Ese
  día se copian los conteos y tasas de lectura de la corrida anterior (`carryRead`), `low-reading` lo
  dice y su severidad queda en "baja". Una página medida sin porcentaje es "no se sabe": si no llegó el
  de NINGUNA, la señal queda `unavailable`, nunca "ninguna página".
- La comparación de consentimiento exige que la propiedad **informe** America/Montevideo: una zona que
  no vino no se supone. Un reporte de consentimiento cortado (2.500 filas) no rellena con ceros las rutas
  que no trajo: `consent-gap` las salta y lo cuenta en el resumen.

### Inspección de URLs: la muestra rota

- **≤ 400 por día de Google** (hora del Pacífico), **sumando todas las corridas de ese día**: cada
  inspección reserva antes una unidad en la base (`state.quota.inspection`). Una segunda corrida el mismo
  día (un deploy, un `pm2 resurrect`, una corrida a mano) usa sólo lo que quedó.
- Orden: rutas nuevas del sitemap **en castellano** (≤ 14 días, hasta 150: una página que el traductor
  publica en 38 idiomas no llena la capa con sus copias, que entran por la capa al azar), las más
  visitadas que no se miraron en 7 días
  (hasta 100), y el resto una tajada al azar por familia (orden reproducible por día) que no se miró en 28.
- La proporción de una familia sale **sólo de la capa al azar** ("N de M al azar") y sólo con 10 o más:
  las nuevas son en su mayoría páginas que Google todavía no procesó y las más visitadas tiran a indexadas.
- Una URL con menos de 14 días en el sitemap que Google todavía no indexó es **pendiente**, no "no
  indexada". Una cuota agotada, un permiso faltante o el reloj (20 min) **cortan la muestra**: lo que no
  se inspeccionó no tiene veredicto.
- La memoria de "primera vez en el sitemap" guarda **sólo rutas en castellano** (el sitemap lista cada
  página una vez por idioma); una ruta traducida toma la fecha de su par. La primera corrida siembra todo
  con la fecha de siembra, que nunca cuenta como "nueva".

## Las doce señales

Cada señal tiene un id estable, la pregunta que contesta, los umbrales exactos que usó, filas (≤ 20) con
`isNew` contra la corrida anterior y una severidad. Una fuente sin datos deja la señal `unavailable` con
el motivo; una fuente vieja la deja `stale` con severidad tope "baja". **La severidad de una señal de
páginas** es el impacto sobre el total del sitio **en la misma unidad**: cargas uruguayas de Cloudflare
contra las del sitio, o vistas uruguayas de GA4 contra las vistas de GA4 del sitio (GA4 ve una porción
que depende del consentimiento: dividir vistas por cargas dejaba siempre más bajas a las señales de
GA4). ≥ 5 % alta, ≥ 1 % media, > 0 baja.

**`isNew` y `newRows`** se comparan contra las claves de **todas** las filas de la corrida anterior, que
se guardan en el estado (`state.signalKeys`, hasta 1.000 por señal, por encima de cualquier `count`
posible), no contra las 20 del snapshot: si no, toda fila del puesto 21 para abajo salía "nueva" cada
día y una señal alta con más de 20 filas mandaba Telegram a diario. Sin ese estado y con el snapshot
anterior cortado, no se afirma que nada sea nuevo. Una señal `unavailable` no pisa sus claves.

| id | Pregunta | Regla (umbrales) |
|---|---|---|
| `consent-gap` | ¿Qué páginas ve Google Analytics mucho menos que Cloudflare? | Sólo si los dos bloques de consentimiento cubren **el mismo rango**, la propiedad GA4 **informa** America/Montevideo, ningún día del rango tiene la lista de páginas de Cloudflare cortada sin su total, y hay ≥ 7 días. Una ruta que no vino en un reporte de GA4 cortado se salta. Fila: entradas Cloudflare ≥ 100, entradas reales ≥ 20 y sesiones GA4 por página de entrada ÷ entradas Cloudflare < 0,6 × la cobertura del sitio. El cociente por cargas es contexto. |
| `mobile-worse` | ¿Dónde el celular rinde mucho peor que la computadora? | vistas cel ≥ 100, escr ≥ 50, y 15 puntos menos de interacción o la mitad del tiempo |
| `low-reading` | ¿Qué páginas casi nadie lee hasta la mitad? | sólo páginas medidas; vistas ≥ 200 y < 10 % llega al 50 %; las populares sin medición van al grupo `sin-medicion`, las medidas sin `read_percent` al grupo `sin-porcentaje`; sin el porcentaje de ninguna, `unavailable` |
| `poor-vitals` | ¿Qué páginas tienen LCP, INP o CLS malos y qué elemento los causa? | muestras reales ≥ 30 y más del 25 % malo; con el elemento más repetido; sin ninguna fila de vitals, `unavailable` |
| `search-no-results` | ¿Qué buscan en el sitio y no encuentran? | términos con ≥ 5 eventos (con `q`) o páginas con ≥ 5 (sin `q`); media si ≥ 30 % de las aperturas no encuentra |
| `outbound-rate` | ¿Qué páginas mandan a la gente afuera? | sólo páginas medidas; vistas ≥ 100 y salidas ≥ 25 % de las vistas (aproximación de "se va y no vuelve") |
| `not-indexed` | ¿Qué páginas no están indexadas y por qué? | clases accionables y no pendientes; alta si una familia tiene ≥ 40 % al azar o una del top 20 está en la lista; media con ≥ 20 % |
| `helpful-no` | ¿Dónde contestan «No» al «¿Te sirvió?»? | ≥ 3 personas distintas, ≥ 10 respuestas y ≥ 50 % «No»; nunca más que media; impacto en cargas de Cloudflare; `answerRate` = respuestas de todos los países ÷ vistas uruguayas del widget, una cota con tope 1 |
| `friction` | ¿Dónde hay clics de bronca, clics muertos o vueltas atrás? | ≥ 100 sesiones y alguna de: bronca ≥ 3 %, muertos ≥ 10 %, vuelta atrás ≥ 15 %, errores ≥ 5 %, con ≥ 5 sesiones afectadas; sesiones **sin bots**; las filas por dispositivo son de todos los países (`population`) |
| `bing-only-queries` | ¿Por qué búsquedas aparece en Bing y Google no manda nadie? | ≥ 30 impresiones en Bing (4 baldes) y 0 clics de Google en 28 días (Search Console anonimiza las raras) |
| `ai-crawler-errors` | ¿Qué rastreadores de IA piden páginas que dan error o redirigen? | errores ≥ 3, redirecciones ≥ 10 en la ventana (7 días, o lo que `maxDuration` deje); user-agent **declarado**; un 304 nunca es redirección |
| `edge-errors` | ¿Qué URLs contestan error en el borde, a personas o a bots? | URL × código ≥ 400 con ≥ 20 pedidos en la ventana (7 días, o lo que `maxDuration` deje); cuenta personas y bots, con la porción de rastreadores declarados |

Los umbrales viven en `classes/insights/signals.ts` (`THRESHOLDS`) y cada señal los publica tal cual.

## Lo que escribe

| Colección (base del app) | Documento | Tope |
|---|---|---|
| `usageinsightsnapshots` | `{ key: "site" }`: el tablero que lee la página | 1.000.000 bytes, recortado solo (`run.trimmed`) |
| `usageinsightsnapshots` | `{ key: "state" }`: primera vez en el sitemap, últimas inspecciones, las claves de filas de cada señal, los dos contadores de cuota | 8 MB; la ruta nunca lo lee |
| `usageinsightdays` | uno por día de datos, un `$set` por fuente | 800.000 bytes; es el archivo de Clarity y Cloudflare, que olvidan |

Medido con todo en su tope, rutas de 54 caracteres (`tests/insights/budget.test.ts` arma el mismo
documento desde `classes/insights/caps.ts`): snapshot **≈ 883 KB**, día **≈ 588 KB** con 400 inspecciones
(≈ 765 KB con 1.000), estado ≈ 7,0 MB (≈ 0,8 MB de claves de señales al tope; ≈ 8,4 MB en BSON, debajo de los 16 MB de Mongo). Para tener el 10 % de margen se bajaron seis topes respecto del
diseño: páginas de consentimiento 150 (no 200), plantillas GA4 40, áreas de enlace 80, destinos de
navegación 80, rutas de rastreadores 150 y grupos por señal 12.

## Cuotas y cómo se cuentan

| Fuente | Cupo | Cómo lo respeta el job |
|---|---|---|
| Clarity | 10 llamadas por día UTC por proyecto, compartidas | ≤ `USAGE_INSIGHTS_CLARITY_MAX_CALLS` (6) **por día sumando todas las corridas**: `store.reserveQuota("clarity")` antes de cada llamada, un `$inc` atómico y condicional; una unidad reservada no se devuelve aunque falle. No relee dentro de las 20 h de una lectura buena. |
| URL Inspection | 2.000 por día de Google (Pacífico), compartidas con `currency-gsc` (20) y con lo manual | ≤ `USAGE_INSIGHTS_INSPECT_MAX` (400) por día de Google, mismo contador (`state.quota.inspection`) |
| GA4 Data API | por hora y por proyecto, compartida con `currency-site-analytics` | lee `propertyQuota`; con menos de 2.000 de cuota horaria saltea los reportes de dimensiones propias |
| CrUX | 150 por minuto | 500 ms entre llamadas, 5 min de reloj, no relee en 20 h |
| Cloudflare GraphQL | 300 consultas cada 5 minutos | ≥ 1,1 s entre consultas y ≤ 200 por corrida (una normal hace ~14) |

`saveState` escribe un `$set` por sub-clave y **nunca** `state.quota`: ninguna escritura de la memoria del
job puede deshacer un contador.

## Variables (`.env` de la raíz en el VPS)

| Variable | Para qué | Sin ella |
|---|---|---|
| `APP_MONGO_URI` | todo | el job no corre (salvo `--dry-run`) |
| `CLOUDFLARE_TOKEN` / `CLOUDFLARE_ANALYTICS_TOKEN` | las dos de Cloudflare; se prueban en orden, un `authz` pasa al siguiente | inactivas |
| `CLOUDFLARE_ZONE_ID` | opcional | la zona del sitio |
| GA4 (`GA4_PROPERTY_ID` + cuenta de servicio) | `ga4Behavior` | inactiva |
| Search Console (cuenta de servicio, `GSC_SITE_URL`) | `indexation` y el cruce con Bing | inactiva |
| `CLARITY_EXPORT_TOKEN` | `clarity` (paso 5.1) | inactiva, una línea, 0 llamadas |
| `BING_WEBMASTER_API_KEY`, `BING_SITE_URL` | `bing` (paso 5.2) | inactiva, una línea, 0 llamadas |
| `CRUX_API_KEY` | `crux` (paso 5.4) | inactiva, una línea, 0 llamadas |
| `USAGE_INSIGHTS_INSPECT_MAX` (400, 0–1000), `USAGE_INSIGHTS_INSPECT_MINUTES` (20), `USAGE_INSIGHTS_CLARITY_MAX_CALLS` (6, 0–8), `USAGE_INSIGHTS_CRUX_URLS` (100, 0–300) | ajustes | los valores por defecto |

Van en el `.env`, nunca en `ecosystem.config.js`: pm2 no vuelve a leer el `env` de una app registrada.

## Cómo activar cada fuente (para el dueño)

Cada paso termina en un valor secreto. Pegalo en `/root/cambio-uruguay/.env` del servidor, en una línea
nueva `NOMBRE=valor`, o mandáselo al ingeniero por un canal privado. **Nunca** en GitHub, un issue, un
PR, una captura ni un chat público. No hace falta reiniciar nada: el job lo lee en su próxima corrida
(09:21 de Uruguay) y al día siguiente la fuente aparece "al día" en `/estadisticas-de-uso`. Si algo sale
mal, la página la muestra "inactiva" y dice qué falta.

### 5.1 Clarity → `CLARITY_EXPORT_TOKEN`

1. clarity.microsoft.com con la cuenta **administradora** del proyecto `zgf7vprwql`.
2. **Settings** → **Data Export** → **Generate new API token**, nombre `usage-insights`.
3. Copiá el token en ese momento (se muestra una sola vez) y mandá `CLARITY_EXPORT_TOKEN=<token>`.

Clarity permite 10 consultas por día por proyecto: el job usa como mucho 6 y deja 4 para mirar a mano.

### 5.2 Bing Webmaster → `BING_WEBMASTER_API_KEY`

1. bing.com/webmasters. Si el sitio no está: **Agregar sitio** → **Importar desde Google Search
   Console** (lo verifica solo).
2. Engranaje **Configuración** → **Acceso a la API** → aceptar → **Generar clave de API**.
3. Mandá `BING_WEBMASTER_API_KEY=<clave>`. Si el sitio figura con otra dirección que
   `https://cambio-uruguay.com/`, mandá también `BING_SITE_URL=<la dirección exacta>`.

### 5.3 Cloudflare zona (rastreadores de IA, errores, caché)

- **Opción A, sin mandar nada:** dash.cloudflare.com → My Profile → API Tokens → el token de
  `CLOUDFLARE_TOKEN` (el que purga la caché en cada deploy) → **Edit** → **+ Add more** → **Zone** →
  **Analytics** → **Read**, zona `cambio-uruguay.com` → **Update token**. El valor no cambia.
- **Opción B:** **Create Custom Token** `usage-insights-read` con **Account → Account Analytics → Read** y
  **Zone → Analytics → Read**, y mandá `CLOUDFLARE_ANALYTICS_TOKEN=<token>`.

### 5.4 Chrome UX Report → `CRUX_API_KEY`

1. console.cloud.google.com → **APIs y servicios** → **Biblioteca** → **Chrome UX Report API** →
   **Habilitar**.
2. **Credenciales** → **Crear credenciales** → **Clave de API** → **Restringir clave** a Chrome UX Report
   API (y si se quiere, a la IP del servidor).
3. Mandá `CRUX_API_KEY=<clave>`. La clave viaja en la cabecera `X-Goog-Api-Key`, nunca en la URL.

### 5.5 Search Console y Google Analytics

Nada que hacer: ya funcionan con la cuenta de servicio del sitio (verificado el 20/11/2026).

### 5.6 (Recomendado) Que Analytics guarde qué se buscó y no se encontró

analytics.google.com → **Administrar** → **Definiciones personalizadas** → **Crear dimensión
personalizada**: nombre `Search query`, alcance **Evento**, parámetro `q` → **Guardar**. No hay nada que
mandar; junta desde ese día y tarda 24–48 h. El job lo detecta solo.

### 5.7 (Opcional) BigQuery

Ver «Qué no hace».

## Comandos

```sh
npm run sync_usage_insights -- --dry-run     # trae, calcula e imprime el digest; no escribe ni gasta cupos
node dist/sync_usage_insights.js --dry-run --skip=crux
node dist/sync_usage_insights.js --backfill=28   # sólo Cloudflare RUM, GA4 y opiniones
node dist/sync_usage_insights.js --inspect=50    # techo del día de Google para esta corrida
npm run insights                              # el digest del snapshot guardado (sólo lee)
npm run insights -- --signal=poor-vitals
npm run insights -- --page=/dolar-hoy
npm run insights -- --source=indexation
npm run insights -- --day=2026-11-20
npm run insights -- --json | wc -c
```

`--dry-run` no escribe nada salvo, con `--clarity` o `--inspect=N`, el contador de esa cuota (una llamada
que no se cuenta dejaría a la corrida siguiente pasarse); sin la base esas dos se rechazan. `--backfill`
rechaza `indexation`, `clarity` y `crux`. Salida: 1 si falta la base fuera de un dry run, si falló una
escritura o si fallaron todas las fuentes que se intentaron; 2 para combinaciones de flags rechazadas.

Telegram (`notifyAdmin`, nunca en un dry run): un mensaje por corrida sólo si una señal alta tiene filas
nuevas o una fuente que andaba ahora falla. Armado con ids, títulos, conteos y resúmenes.

## Verificar en el VPS

1. `pm2 describe currency-usage-insights`: `cron_restart 21 12 * * *`, `autorestart false`.
2. `node dist/sync_usage_insights.js --dry-run --skip=crux`: `cloudflareRum` ok **sin** la nota
   "requestHost_in rechazado" (si aparece, anotarla acá: el filtro `_in` está en el esquema pero no se
   probó en vivo), `ga4Behavior` ok, `feedback` ok, `indexation` skipped, las cuatro con variable
   `inactivo`; el log sin tokens, sin `apikey` y sin términos.
3. Primera corrida real: `pm2 logs currency-usage-insights --lines 60 --nostream`, una línea por fuente,
   `inspección N/400 día Google`, bytes < 1.000.000. Una segunda corrida a mano el mismo día deja
   `indexation` skipped ("cupo diario de inspección ya usado") o inspecciona sólo lo que quedó.
4. `node dist/sync_usage_insights.js --backfill=28` una vez; `consentCheck.usable` pasa a true y
   `consent-gap` deja de decir "faltan días".
5. `curl -s -o /dev/null -w "%{http_code}\n" https://cambio-uruguay.com/api/usage-insights`: 401, 403 o
   503, nunca 200.
6. Confirmar en un navegador si el beacon de Cloudflare cuenta las navegaciones internas de Nuxt
   (DevTools → Network → `cdn-cgi/rum` al hacer clic en un enlace interno). La regla de consentimiento no
   depende de eso (compara entradas); el cociente por cargas sí.

## Qué no hace

- **BigQuery.** Lo único que mide "se fue por un enlace y no volvió" con exactitud (el evento siguiente de
  la misma sesión). La exportación **no recupera días anteriores**: conviene vincularla cuanto antes
  aunque nada la lea todavía. GA4 → Administrar → Vínculos de productos → **BigQuery** (diaria), y darle a
  la cuenta de servicio **BigQuery Job User** en el proyecto y **BigQuery Data Viewer** en el dataset
  `analytics_<propiedad>`. Sin facturación, las tablas se borran a los 60 días.
- `rumPerformanceEventsAdaptiveGroups` de Cloudflare y `GetUrlInfo` de Bing por URL.
- Ningún veredicto por ausencia: una fuente caída, una cuota agotada o una página sin medición nunca se
  leen como "cero".

## Decisiones (R1–R20 del diseño)

- **R1.** La brecha de consentimiento elige filas por **entradas** (GA4 sesiones por página de entrada ÷
  Cloudflare `sum.visits`), que no depende de si el beacon cuenta las navegaciones de la SPA. El cociente
  por cargas va al lado como contexto, con las dos proporciones de tráfico interno.
- **R2.** `read_progress` se manda al 50 % y al 90 %, no al 25 %: la señal es "llega a la mitad"; Clarity
  agrega "ni un cuarto" cuando está.
- **R3.** Las rutas de medición `/x/:item` se pliegan; las filas de plantilla dicen que lo son.
- **R4.** Los términos sin resultado necesitan la dimensión `q` (paso 5.6).
- **R5.** Los filtros de Cloudflare van en microsegundos (`interactionToNextPaint_gt: 200000`).
- **R6.** Cron `21 12`: después de `currency-site-analytics`, `currency-gsc` y `currency-revenue-plan`.
- **R7.** 400 inspecciones por día de Google, 20 minutos.
- **R8.** Los dos tokens de Cloudflare se prueban en orden.
- **R9.** Cloudflare: se archiva ayer cada día y el bloque es la suma.
- **R10.** Todo reporte de GA4 filtra los dos hosts del sitio y Uruguay.
- **R11.** `insightFamily()` saca el prefijo de idioma y pliega rutas de varios segmentos; `bucketOf` no se toca.
- **R12.** `inspectUrlDetailed()` distingue cuota de permiso y trae los campos que `inspectUrl()` tiraba;
  `inspectUrl()` conserva su contrato.
- **R13.** Google-Extended es un token de robots.txt, no un user-agent: el que pide es Googlebot.
- **R14.** La cuenta de Cloudflare sale de `GET /zones/<zona>`.
- **R15.** Los «Sí»/«No» salen de `sitefeedbacks`; GA4 da las veces que se mostró la pregunta.
- **R16.** CrUX con la clave en cabecera.
- **R17.** La comparación de consentimiento termina anteayer en los dos lados y exige que la propiedad
  GA4 esté en America/Montevideo.
- **R18.** Dos contadores de cuota reservados en la base antes de cada llamada.
- **R19.** `requestHost_in` con los dos hosts; si el esquema lo rechaza se vuelve al host exacto y se anota.
- **R20.** «¿Te sirvió?» cuenta personas distintas dentro del pipeline; los `clientId` nunca salen de Mongo.
