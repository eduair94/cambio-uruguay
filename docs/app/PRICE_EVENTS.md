# CyberLunes y Black Friday: ¿el descuento es real? (`/ciberlunes-y-black-friday-uruguay`)

Plan D, escrito 2026-09-17. Compara el precio de HOY de cada oferta propia (`pricewatchoffers`,
`docs/app/PRICEWATCH.md`) contra su PROPIO historial de hasta 60 días — nunca contra otra tienda ni
contra una banda de mercado, que es lo que ya publican `/equipar-casa-uruguay` y
`/sillas-escritorio-uruguay`. `sync_price_events.ts` (raíz) sólo LEE `pricewatchoffers` (lo escriben
`sync_equipar.ts`/`sync_chairs.ts`) y publica en APP DB `priceeventsnapshots`, que sirve
`GET /api/price-events` (Nuxt) a la página del mismo nombre. El código puro vive en
`classes/priceevents/` (`types.ts`, `analyze.ts`, `aggregate.ts`, `calendar.ts`, `refresh.ts`,
`store.ts`); el mismo calendario se replica a mano en `app/utils/priceEvents.ts` porque un test de la
raíz no puede importar `app/` (ver AGENTS.md, "Dos build surfaces").

## Las tres clases (`classes/priceevents/analyze.ts`)

Una oferta calificada cae en una o dos de estas tres — nunca en `precio-de-siempre` junto con otra,
porque esa clase es literalmente "ninguna de las otras dos":

- **`baja-real`**: el precio de venta de hoy es ≤ 90 % del precio MÍNIMO que esa misma oferta tuvo en
  los 60 días previos (`PRICE_EVENT_DROP_RATIO = 0.9`).
- **`tachado-por-encima`**: el precio de lista (tachado) de hoy es ≥ 110 % del precio de venta MÁXIMO
  que esa misma oferta tuvo en los 60 días previos (`PRICE_EVENT_INFLATED_RATIO = 1.1`). Sólo se
  evalúa cuando hay `lp` hoy; `lp`, cuando existe, siempre es mayor que `p` por construcción del
  escritor (`listPriceOf` en `classes/retail/price.ts`), así que no hace falta re-chequear esa
  relación acá.
- **`precio-de-siempre`**: ninguna de las dos anteriores. Una oferta puede ser `baja-real` Y
  `tachado-por-encima` a la vez (dos preguntas distintas sobre el mismo día: ¿bajó el precio de venta?
  ¿está inflado el tachado?), pero `precio-de-siempre` nunca convive con otra clase.

**Comparación en centavos enteros, no en floats.** `priorMax * 1.1` en JavaScript puede aterrizar en
`7700.000000000001` y perder un umbral que cae justo en el borde (110 % exacto no clasificaría). Por
eso `analyze.ts` no usa `PRICE_EVENT_DROP_RATIO`/`PRICE_EVENT_INFLATED_RATIO` (documentativos) para
decidir: convierte cada precio a centavos con `Math.round(value * 100)` y compara los PRODUCTOS
enteros de fracciones exactas — `PRICE_EVENT_DROP_NUM/DEN = 9/10` y
`PRICE_EVENT_INFLATED_NUM/DEN = 11/10` — así un precio que cae EXACTO en el borde (90,00 % o 110,00 %)
clasifica siempre, sin que un error de redondeo de `1e-13` se lo coma. `tests/priceevents/analyze.test.ts`
fija ambos bordes en las dos direcciones.

**Umbrales de calificación**, todos en `classes/priceevents/types.ts`:

- **21 días** (`PRICE_EVENT_MIN_AGE_DAYS`): antigüedad mínima de `firstSeen` a `today`, INCLUSIVA — 21
  días exactos alcanza. Menos que eso, la oferta todavía no tiene "pasado propio" contra el que
  comparar; sería medir ruido, no una campaña.
- **10 días previos distintos** (`PRICE_EVENT_MIN_POINTS`): dentro de la ventana de 60 días, sin
  contar el punto de hoy. Se cuenta por DÍA, no por punto — si dos puntos comparten fecha `d` (un
  resync del mismo día, o un doc armado a mano), se queda con el ÚLTIMO y cuenta una sola vez. Con 3 o
  4 puntos, priorMin/priorMax/priorMedian son ruido, no una línea de base.
- **Ventana de 60 días** (`PRICE_EVENT_LOOKBACK_DAYS`): "previo" es un punto con `d` estrictamente
  antes de `today` y a lo sumo 60 días antes. La frontera es INCLUSIVA a propósito — un punto de hace
  exactamente 60 días es tan parte de "la temporada anterior" como uno de hace 59; lo que se descarta
  es lo más viejo que eso, no el borde mismo.
- **Moneda**: sólo UYU/USD (`isTrackedCurrency`); una tercera moneda no calificaría.
- Sin punto de historial fechado exactamente `today`: no hay nada que evaluar hoy (se descarta, no es
  un error).

## `analyzed` vs `eligible`

`analyzed` es cuántas ofertas se LEYERON hoy en total, con o sin punto calificado — el denominador que
hace legible a `eligible` en el reporte de una corrida en seco. `eligible` es cuántas de esas
`analyzeOffer` NO descartó (edad + puntos previos + moneda soportada). La distinción importa porque sin
ella el reporte no puede distinguir "no hay ofertas que leer" de "hay ofertas pero ninguna con 21 días
de historia todavía" — que es exactamente lo que pasa hoy (ver "Cómo diagnosticar" abajo).

## Forma del snapshot (`classes/priceevents/aggregate.ts`, colección `priceeventsnapshots`)

Un documento por día (`key: "day:YYYY-MM-DD"`, archivo que se poda) más un puntero `key: "current"`
sobreescrito cada corrida — mismo patrón `current`/`day:` que `RegionalSnapshot`. Campos:

- **`topDrops`**: la VITRINA, tope `PRICE_EVENT_MAX_DROPS = 200` y máx `PRICE_EVENT_MAX_DROPS_PER_SELLER = 3`
  por vendedor — nunca el total del día. Orden determinista para que el mismo conjunto de análisis dé
  siempre el mismo resultado, sin importar en qué orden entregó el cursor de Mongo: (1) `dropPct` desc
  — el criterio publicado; (2) `price / priorMin` sin redondear, asc — desempate de precisión completa
  para bajas que redondearon igual a 1 decimal; (3) `listingId` asc — desempate final para precio Y
  priorMin idénticos. El tope por vendedor se aplica DESPUÉS de ordenar, así que cada vendedor entra
  con sus 3 mejores bajas, no con las que sobraron.
- **`dropsCount`/`inflatedCount`**: totales del día SIN recortar (suma de `byVertical[*].drops`/
  `inflated`) — el titular y la serie de 30 días leen de estos dos, NUNCA de `topDrops.length`, que se
  achata en 200 apenas el día tiene más bajas que eso. Antes `topDrops` se llamaba `drops`; un total
  con el mismo nombre habría sido ambiguo ("¿el array recortado o la cuenta completa?"), de ahí el
  rename en la revisión de Task 2.
- **`sellers`**: sólo vendedores con ≥ `PRICE_EVENT_MIN_SELLER_LISTINGS = 5` ofertas con precio de
  lista hoy — bajo esa cantidad, "la mitad de mis tachados están inflados" no dice nada. Cada fila es
  `sellerKey`/`sellerName`/`withListPrice`/`inflated`/`share` (`inflated / withListPrice`, 1 decimal),
  ordenadas por nombre — nunca por `share`, para no fabricar un ranking de "peor tienda".
- **`byVertical`**: `{ eligible, drops, inflated }` por vertical (equipar/sillas hoy; una vertical
  nueva no toca este código porque `loadVerticals()` lee `distinct("vertical")` de los datos mismos).
- **`trackingSince`**: el `firstSeen` más viejo de TODA la colección `pricewatchoffers`, sin importar
  vertical (`loadTrackingSince()`, índice `{ firstSeen: 1 }`) — nunca hardcodeado (ruling del plan):
  viene de los datos, así que se corrige solo si algún día se reconstruye el historial desde otra
  fecha. Alimenta la respuesta de la FAQ "¿desde cuándo tienen este historial?" y sólo se muestra esa
  pregunta cuando el campo no es `null`.
- **`analyzed`/`eligible`**: ver arriba.
- **`generatedAt`**: timestamp ISO de CUÁNDO corrió, documentativo — nunca se usa para decidir nada
  dentro del análisis o el agregado.

## La guarda de corrida flaca (`classes/priceevents/refresh.ts`)

Antes de escribir, compara `snapshot.eligible` contra el `eligible` YA publicado en `current`
(`loadCurrentEligible()`, sin hidratar `topDrops`/`sellers`). Si el `current` almacenado tiene
**≥ `PRICE_EVENT_THIN_FLOOR = 20`** elegibles Y la corrida nueva trae **< `PRICE_EVENT_THIN_RATIO = 0.4`**
(40 %) de ese número, la corrida se trata como una SALIDA (menos fuentes respondieron), no como una
temporada con menos descuentos reales: no escribe `current` ni el archivo `day:`, y
`sync_price_events.ts` sale con código 1 (falla visible en pm2). El piso de 20 existe para no confundir
"la serie recién empieza" (semanas enteras con `eligible` en 0 mientras `pricewatchoffers` junta sus
primeros 21 días) con una corrida flaca real — mientras el `current` almacenado esté por debajo de 20,
la guarda nunca se dispara. El primer run de todos (sin `current` previo, `currentEligible === null`)
siempre escribe, aunque traiga 0 elegibles: no hay nada contra qué comparar todavía. El límite es
`<` estricto: exactamente 40 % NO dispara la guarda (`tests/priceevents/dry_run.test.ts`, caso del
borde: 20 de 50 = 40 % exacto → no es flaca).

## Retención: 400 días

`PRICE_EVENT_SNAPSHOT_RETENTION_DAYS = 400`. Sólo se podan las filas `day:YYYY-MM-DD` (nunca `current`,
cuya key no empieza con `day:`) y sólo en la corrida DIARIA (`prune: true` por default). El horario de
evento (`--event-only`) pasa `prune: false` a propósito: puede correr hasta 24 veces en un día de
evento activo, y la corrida diaria de esa misma mañana ya barrió lo vencido — repetir la poda en cada
corrida horaria no suma nada.

## El job horario `--event-only` y cuándo corre

`sync_price_events.ts --event-only` (cron `19 * * * *`, cada hora) llama
`classes/priceevents/calendar.ts::activeEvent(today)` ANTES de tocar Mongo: si no hay evento activo
hoy, loggea y sale con código 0 **sin conectarse a la base** — son 24 corridas por hora, 365 días al
año, casi todas sin nada que hacer, y no deben costar ni una conexión. Cuando SÍ hay un evento activo
corre el mismo pipeline que la diaria (mismo `runPriceEvents`), sin podar. La corrida diaria
(`13 15 * * *` = 15:13 UTC ≈ 12:13 America/Montevideo) va después de `currency-equipar` (12:47 UTC) y
de la cosecha de celulares (14:29 UTC, otra rama/plan — el detector de verticales es automático, así
que en cuanto ese job empiece a escribir `pricewatchoffers` con `vertical: "celulares"` este feature lo
suma sin tocar código) para que el punto de hoy de cada vertical ya esté escrito cuando esto lee.

Un evento "activo" es una fila del calendario cuyo rango cubre `today` — incluida la edición de
noviembre 2026 SIN fecha publicada, que activa una **ventana adivinada 2026-11-01..2026-11-08**
(`UNCONFIRMED_WINDOW_START/END` en `calendar.ts`) para que el job horario empiece a recalcular ANTES de
que la CEDU confirme la fecha real, en vez de quedarse dormido hasta que alguien la cargue a mano. Si
dos ventanas se solapan, gana la CONFIRMADA (`resolveActiveEvent`, probado con datos sintéticos aparte
de `activeEvent` para no depender de que el calendario real algún día tenga dos ediciones que se pisen).

## El calendario, con fuentes (`classes/priceevents/calendar.ts` / `app/utils/priceEvents.ts`)

Verificado 16–17/9/2026:

| key | fechas | confirmado | fuente |
|---|---|---|---|
| `ciberlunes-2025-11` | 2025-11-03 a 05 | sí | [cuti.org.uy](https://cuti.org.uy/en/destacados/noviembre-comienza-con-una-nueva-edicion-de-ciberlunes-con-hasta-70-off/) |
| `ciberlunes-2026-06` | 2026-06-01 a 03 | sí | [sodimac.com.uy](https://www.sodimac.com.uy/sodimac-uy/content/Ciberlunes/) |
| `ciberlunes-2026-11` | sin fecha (`start`/`end` `null`) | **no** | [cedu.org.uy/ciberlunes](https://www.cedu.org.uy/ciberlunes/) — "La CEDU todavía no publicó la fecha." |
| `black-friday-2026` | 2026-11-27 a 30 | sí | sin URL — nota: "Del viernes 27 al lunes 30 de noviembre (Cyber Monday de EE.UU.)." |

CyberLunes lo organiza la CEDU dos veces por año (junio y noviembre); Black Friday sigue el calendario
de EE.UU. (viernes después de Acción de Gracias) sin una fuente uruguaya puntual que fechar. **Nunca
inventar una fecha** para completar esta lista mientras la CEDU no publique la de noviembre 2026.

## Qué NO se publica, y por qué

- **Ninguna palabra de acusación.** La tabla de vendedores con precio tachado por encima del historial
  muestra sólo conteo (`withListPrice`, `inflated`) y proporción (`share`) — la página lo dice
  explícito: "Es un conteo y una proporción contra nuestro propio historial, no una acusación: puede
  haber una explicación que no medimos, y esto no prueba que un precio anterior no haya existido."
  (`app/pages/ciberlunes-y-black-friday-uruguay.vue`).
- **Ninguna regla de "N días" de vigencia previa.** La FAQ lo aclara de frente: esa regla es de una
  directiva EUROPEA y no existe en Uruguay — ni en la Ley 17.250 ni en el Decreto 244/000, ninguno de
  los dos le pone un plazo mínimo al precio anterior. Lo que la ley sí exige: **art. 24** (no inducir a
  error sobre el precio) y **art. 26** (probar el precio publicitado es responsabilidad de quien
  anuncia, no del comprador) — citados así, sin agregar un umbral que la ley uruguaya no tiene.
- **Historial sólo desde lo que observamos, y se dice desde cuándo.** El "tachado por encima" es
  contra lo que ESTE sitio vio, con las tiendas que releva para `/equipar-casa-uruguay` y
  `/sillas-escritorio-uruguay` — nunca una afirmación sobre el mercado completo. La FAQ "¿desde cuándo
  tienen este historial?" (sólo aparece si `trackingSince` no es `null`) y "¿por qué no aparecen todas
  las tiendas?" existen para que esa limitación quede explícita, no implícita.
- **Ningún enlace de "voto" a una oferta de tercero.** Las filas de la tabla de bajas sin ficha propia
  enlazan afuera con `rel="nofollow noopener"` (no `noreferrer`, que sí llevaban los enlaces del
  calendario) — mismo criterio que equipar/sillas: nunca se le regala autoridad de enlace a un
  vendedor externo por aparecer en una tabla de bajas.

## El contrato de la API (`GET /api/price-events`, `app/server/api/price-events.get.ts`)

- **`days[]`** sale de `dropsCount`/`inflatedCount` de cada documento `day:` — nunca de
  `topDrops.length` (recortado a 200 en el snapshot guardado). Se consultan los 30 `day:` más
  recientes (`PRICE_EVENT_RESPONSE_MAX_DAYS = 30`) ordenados DESC con `.limit()` y se dan vuelta antes
  de servir, para que el gráfico de la página los reciba ascendentes.
- **`current.topDrops`** se recorta OTRA VEZ a `PRICE_EVENT_RESPONSE_MAX_DROPS = 50` al servir, aunque
  el documento guardado permita hasta 200 — la página nunca pinta más de 50 filas, así que no tiene
  sentido mandar el resto por la red.
- **Caché**: `cache-control: public, max-age=600, s-maxage=600, stale-while-revalidate=86400` (10
  minutos de frescura, un día de tolerancia mientras revalida).
- **Ante cualquier error de Mongo**: forma vacía (`{ current: null, days: [], events: PRICE_EVENT_CALENDAR }`)
  — un problema de base nunca puede tirar la página entera; el resto (metodología, marco legal,
  enlaces relacionados) vale la pena leerlo aunque hoy no haya datos.
- **`events`** siempre sale del espejo estático `app/utils/priceEvents.ts::PRICE_EVENT_CALENDAR`,
  independiente de la base — el calendario no vive en Mongo.

## La cuenta regresiva (`app/utils/priceEvents.ts::priceEventCountdown`)

Cinco estados, calculados server-side una sola vez con `today` como parámetro (nunca `Date.now()`
adentro ni un reloj que tickea en el cliente — SSR e hidratación tienen que calcular el mismo `today`):

- **`upcoming`**: `today < start`. Muestra `daysUntilStart`.
- **`first-day`**: `today === start` — el único día en que "hoy empieza" es cierto.
- **`in-progress`**: `start < today <= end`, incluido el ÚLTIMO día del evento. Esto arregló un bug real:
  clampear `daysUntilStart` a 0 con `Math.max(0, …)` hacía que CUALQUIER día de un evento de varios
  días (28 y 29 de noviembre, no sólo el 27) mostrara "Hoy es el primer día de Black Friday".
- **`undated`**: no hay evento confirmado activo ni por venir, pero la edición sin fecha (CyberLunes
  noviembre 2026) todavía cae dentro de su ventana adivinada (2026-11-01..08).
- **`none`**: ni un evento confirmado ni la ventana adivinada de la edición sin fecha siguen vigentes.
  Arregla el segundo bug: sin este estado, la página seguía anunciando "CyberLunes noviembre 2026: a
  confirmar por la CEDU" en diciembre, cuando esa ventana ya había cerrado sin que nadie cargara la
  fecha real — una edición vencida nunca es "la próxima".

`priceEventOtherUnconfirmed()` es la segunda línea aparte: cuando Black Friday (fecha fija) gana el
titular pero CyberLunes noviembre (sin fecha) en la práctica podría venir antes, esa función decide si
todavía vale la pena mostrarlo como nota — mismas reglas de ventana vencida que `none`.

## Cómo cargar la fecha de noviembre cuando la CEDU la publique

1. Editar el array `PRICE_EVENTS`/`PRICE_EVENT_CALENDAR` en **LOS DOS** archivos —
   `classes/priceevents/calendar.ts` (raíz) y `app/utils/priceEvents.ts` (app) — con la MISMA key
   (`ciberlunes-2026-11`), mismo `label`, mismo `start`/`end` (`YYYY-MM-DD`), `confirmed: true`, la
   URL real que anuncia la fecha en `source`, y `note: ''` (mismo patrón que las otras ediciones
   confirmadas).
2. `app/tests/unit/priceEventsCalendarParity.test.ts` compara los dos arrays campo a campo — importa
   `classes/priceevents/calendar.ts` directamente porque es un TEST del suite del app, no build de
   producción (un archivo de `app/` nunca puede importarse desde un test o módulo de la raíz, y
   viceversa un módulo de producción de `app/` nunca importa de la raíz — ver AGENTS.md, "Dos build
   surfaces"). Si los dos arrays quedan distintos, ese test falla y lo dice.
3. Correr `npm test` en la raíz y en `app/` antes de pushear (el CI ya lo hace, pero conviene verlo en
   verde localmente primero) y pushear a `main` — el filtro de deploy despliega raíz y app en el mismo
   push si ambos archivos cambiaron juntos (ver AGENTS.md, "Deploy").
4. **Cuando el directorio de celulares se publique** (otra rama/plan), agregar el enlace estático a
   `/celulares-uruguay` en la sección "Seguí comparando" de
   `app/pages/ciberlunes-y-black-friday-uruguay.vue`. Se dejó afuera a propósito en esta tarea porque
   esa página no existe todavía en este branch; `priceEventInternalHref()`
   (`app/utils/priceEvents.ts`) YA sabe derivar `/celulares-uruguay/<slug>` para una fila de vertical
   `celulares` con `productKey: 'phone:<slug>'` — no hace falta tocar esa función, sólo el enlace fijo
   de la lista de relacionados.

## Cómo diagnosticar

- **Corrida en seco**: `npx ts-node sync_price_events.ts --dry-run` lee y agrega, nunca escribe ni
  poda. Necesita `APP_MONGO_URI` (o `MONGO_URI`, que el script mapea a `APP_MONGO_URI` si el primero
  falta) apuntando a la Mongo REAL del VPS — el `app/.env` local apunta a una Mongo localhost vacía,
  así que una corrida en seco que de verdad diga algo tiene que correr contra un `.env` copiado del VPS
  (sólo lectura) o directamente por SSH en el servidor.
- **Líneas de log a buscar**:
  - Corrida normal: `[price-events] <YYYY-MM-DD> evento=<key|ninguno> verticales=<lista|-> leídas=<analyzed> elegibles=<eligible> trackingSince=<fecha|->`.
  - Corrida flaca (exit 1): `[price-events] corrida flaca: <N> elegibles contra <M> ya publicadas — se conserva el snapshot anterior`.
  - `--event-only` sin evento (exit 0, sin conexión a Mongo): `[price-events] --event-only: sin evento activo hoy (<fecha>) — no se conecta a la base`.
- **Campos a mirar en Mongo** (APP DB, colección `priceeventsnapshots`): `key: "current"` es el
  puntero que lee la API; `key: "day:YYYY-MM-DD"` son las filas de archivo. `analyzed`/`eligible`/
  `dropsCount`/`inflatedCount`/`trackingSince`/`byVertical` cuentan la historia completa de una
  corrida sin tener que leer `topDrops` entero.
- **Estado de producción medido el 2026-09-17** (ver el ledger del plan): `pricewatchoffers` tenía
  5.761 ofertas (equipar 5.174, sillas 587), con el `firstSeen` más viejo de TODA la colección en
  **2026-09-17** — el historial recién empieza. Con `PRICE_EVENT_MIN_AGE_DAYS = 21`, el primer día en
  que CUALQUIER oferta puede calificar es **2026-10-08**; hasta esa fecha, `eligible` en 0 en todas las
  corridas es el comportamiento esperado, no un bug — y el piso de la guarda de corrida flaca
  (`PRICE_EVENT_THIN_FLOOR = 20`) está diseñado explícitamente para no dispararse durante ese tramo.
- **Tests a leer primero** cuando algo no clasifica como se espera: `tests/priceevents/analyze.test.ts`
  (umbrales y bordes de centavos enteros), `tests/priceevents/aggregate.test.ts` (orden determinista de
  `topDrops`, tope por vendedor, `sellers`), `tests/priceevents/calendar.test.ts` (ventanas, solape),
  `tests/priceevents/dry_run.test.ts` (guarda de corrida flaca, orquestación completa con `store.ts`
  mockeado); del lado del app, `app/tests/unit/priceEvents.test.ts` (calendario, cuenta regresiva, FAQ,
  formato), `app/tests/unit/priceEventsApi.test.ts` (contrato de la ruta) y
  `app/tests/unit/priceEventsCalendarParity.test.ts` (paridad de los dos calendarios). Medido
  2026-09-17: 67 tests en 4 archivos (raíz) + 76 tests en 3 archivos (app) = 143 tests, todos verdes.

## Ver también

- `docs/app/PRICEWATCH.md` — de dónde sale `pricewatchoffers`, qué escribe y con qué guardas.
- `docs/app/EQUIPAR.md` — el otro consumidor del mismo cosechador de retail (`classes/retail/`).
- `AGENTS.md` — filas `currency-price-events`/`currency-price-events-hourly` en la tabla de pm2.
