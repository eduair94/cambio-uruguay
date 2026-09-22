# Cambios de precio: la variación del propio aviso, en la ficha y en una página

Fecha: 2026-09-22. Estado: spec aprobado (orden permanente del usuario: auto-aprobar spec y plan).

## Qué pidió el usuario

> "Revisar se estén trackeando regularmente los cambios de precios de los artículos y quede algún
> registro y al entrar a la ficha se pueda ver las variaciones de precios respectivas. También sería
> ideal tener una página que reporte los últimos cambios de precios."
>
> "Artículos = autos, casas (alquiler, venta), heladera, etc."

Tres cosas, en este orden: (1) que el registro exista y sea regular, (2) que la ficha de cada
artículo muestre **su propia** variación, (3) una página con los últimos cambios.

## Lo que ya existe (medido en producción el 2026-09-22)

El registro **ya está** y es regular. Vive en tres colecciones que nadie lee desde el sitio:

| vertical | colección | qué guarda | cadencia | prod 2026-09-22 |
|---|---|---|---|---|
| equipar, sillas, celulares, movilidad | `pricewatchoffers` | punto **diario por aviso**, aunque no cambie; 120 pts; poda 180 d | diaria + horaria de los 4 jobs | 19.354 avisos (equipar 16.114, celulares 1.374, sillas 1.057, movilidad 809); 1.390 con cambio real |
| autos | `carlistings.priceHistory` (privada) | punto **sólo al cambiar**; tope 20 | `currency-autos` diaria + horaria | 22.092 avisos, 1.262 con ≥2 puntos |
| alquiler, venta, autos | `marketpricelogs` (privada) | punto **sólo al cambiar**; tope 40; poda 120 d | `currency-market-series`, 1×/día 13:03 UTC | alquiler 29.196 (345 con cambio), venta 18.517 (115), autos 19.480 (840) |

Lo que el sitio muestra hoy:

- **autos** `/autos-usados-uruguay/<key>`: **un solo escalón** (`priceDrop`: "antes US$ 12.490 el
  17/9"), 1.052 de 19.366 avisos del catálogo. No hay serie.
- **sillas** `/sillas-escritorio-uruguay/<slug>` y **celulares** `/celulares-uruguay/<modelo>`: serie
  del **producto/modelo** (mediana y mínimo diarios), que no es la variación de un aviso: baja
  cuando entra un vendedor barato aunque nadie haya bajado nada.
- **alquiler** `/alquileres/<key>`, **venta** `/venta-viviendas-uruguay/<key>`: nada.
- **equipar** y **movilidad**: no tienen ficha por producto; sus tarjetas no dicen nada.
- Página de cambios: no existe. `/ciberlunes-y-black-friday-uruguay` es la más cercana y hoy publica
  `dropsCount: 0, eligible: 0` — exige 21 días de historia y el tracking arrancó el 17/9, así que su
  primer día elegible es el 2026-10-08. Además es evento-céntrica por diseño.

**Conclusión del punto (1): no hay que construir el registro, hay que leerlo.** El trabajo es de
lectura y de publicación.

## Decisiones

### D1 — No se crea una cuarta colección de historial

Se agrega `classes/pricehistory/`, que es **sólo un lector**: normaliza las tres formas que ya se
escriben a una serie común. Una cuarta colección duplicaría el dato, agregaría una escritura por job
y tendría su propio desfasaje. El costo es un lector con tres adaptadores; la alternativa es un
escritor más en cuatro jobs.

Serie normalizada (la que cruza la red):

```ts
interface PriceHistorySeries {
  vertical: "autos" | "alquiler" | "venta" | "equipar" | "sillas" | "celulares" | "movilidad";
  id: string;            // el id con el que la ficha ya identifica ese aviso
  currency: "UYU" | "USD";
  points: { d: string; p: number }[];   // sólo los puntos de ESTA moneda, orden ascendente
  firstSeen: string;     // desde cuándo lo medimos NOSOTROS
  lastSeen: string;
  changePct: number | null;   // último punto contra el primero de la misma moneda
  lastChange: { from: number; to: number; at: string } | null;
  currencySwitched: boolean;  // hubo puntos en otra moneda: la serie no es comparable hacia atrás
  source: "pricewatch" | "carlistings" | "marketpricelogs";
}
```

### D2 — La moneda nunca se mezcla

Ya es regla en `classes/priceevents/analyze.ts` y en `classes/marketseries/log.ts`. El lector corta
la serie en el último cambio de moneda y marca `currencySwitched: true`; la ficha dice "antes estaba
publicado en otra moneda" en vez de dibujar un salto que no es un cambio de precio. Un aviso que pasó
de USD a UYU no bajó un 4.000 %.

### D3 — La ficha lee en vivo; la página lee un snapshot

La regla del usuario (2026-09-19, `analisis-periodico-no-en-el-pedido`) es que un análisis que
procesa la base se calcula periódicamente y se guarda. Se aplica así:

- **Ficha**: una lectura por id sobre un índice único (`listingId`, `key`, `vertical+advertId`). No
  agrega sobre la colección: es el mismo costo que traer la ficha. Va en vivo, y va en el HTML
  (server-rendered) porque es contenido, no adorno.
- **Directorio de equipar (`/productos`, `/mi-lista`)**: un `$in` de como mucho 60 ids —el tamaño de
  la página— contra el índice único. También en vivo.
- **Página de últimos cambios**: recorre **toda** la base de las tres colecciones. Job diario, snapshot
  guardado, el pedido sólo lee.

### D4 — Qué se publica de `marketpricelogs`

`docs/app/MARKET_SERIES.md` la declara privada: "nunca se sirve campo a campo; la página sólo ve
agregados". Esta feature **cambia esa política a propósito y en forma acotada**: se publica, del
aviso que el lector está mirando, la serie `{fecha, precio, moneda}` — que es el mismo precio pedido
que el aviso publica hoy, fechado por nosotros. No se publica nada más de esos documentos
(`advertId` cruzado con otros, contactos, identidad del anunciante). El motivo es el pedido: sin
esto, la ficha de un alquiler no puede decir que bajó. Se actualiza el párrafo de `MARKET_SERIES.md`
en el mismo commit, porque una regla que cambia sin actualizar su documento vuelve como bug.

Lo mismo vale para `carlistings`: se proyecta **sólo** `priceHistory`, nunca el resto del documento
privado.

### D5 — Nunca se afirma nada anterior a `firstSeen`

Toda la UI lleva "medido desde el <fecha>". El sitio empezó a mirar estos avisos el 6–18 de setiembre
de 2026 según la vertical; un aviso publicado en 2024 con precio viejo no tiene historia acá y la
ficha lo dice en vez de dibujar una línea plana que parezca "nunca cambió".

### D6 — Un cambio de precio no es un veredicto

La página lista lo que **observamos**: bajó, subió, con fechas. No dice "conviene", no dice "oferta
real" —eso es el trabajo de `/ciberlunes-y-black-friday-uruguay`, que compara contra el propio
mínimo de 60 días y exige antigüedad— y no ordena por "mejor". El titular es "qué se movió", no "qué
comprar".

## Arquitectura

```
classes/pricehistory/
  types.ts      PriceHistorySeries, PriceChange, PriceChangeSnapshot
  normalize.ts  PURO: los 3 adaptadores (pricewatch | carlistings | marketpricelogs) -> serie,
                corte por moneda, changePct, lastChange
  read.ts       lecturas por id y por lote (Mongo, APP DB)
  scan.ts       PURO: de un lote de series -> los cambios de los últimos N días, ordenados
  refresh.ts    el job: recorre las 3 colecciones, arma el snapshot, guarda
  store.ts      escribe APP DB `pricechangesnapshots` (current + day:YYYY-MM-DD, poda 400 d)

app/utils/priceHistory.ts        espejo puro de normalize.ts (formato y etiquetas)
app/server/utils/priceHistory.ts lectura por id/lote desde el APP DB (models nuevos)
app/server/api/price-history.get.ts   ?vertical=&id= (y &ids= hasta 60)
app/server/api/price-changes.get.ts   el snapshot de la página
app/components/PriceHistoryBlock.vue  el bloque de ficha (reusa components/Sparkline.vue)
app/pages/cambios-de-precio-uruguay.vue
```

Modelos nuevos en `app/server/models/`: `PricewatchOffer.ts`, `MarketPriceLog.ts`,
`PriceChangeSnapshot.ts` (con su espejo de raíz; `tests/appdb/schema_parity.test.ts` los toma).
`carlistings` ya tiene modelo de raíz; el app lo lee con una proyección explícita.

## Qué ve el lector

### En la ficha — bloque "Cómo cambió el precio"

Aparece sólo con ≥2 puntos. Trae: precio de hoy, variación contra el primer punto medido (con su
fecha), la última baja o suba con fecha, sparkline (`components/Sparkline.vue`) y una tabla corta de
los cambios. Con 1 solo punto, una línea: "lo venimos midiendo desde el <fecha> y no cambió".

| ficha | id que usa | fuente |
|---|---|---|
| `/autos-usados-uruguay/<key>` | `key` | `carlistings.priceHistory` (más puntos que `marketpricelogs`: se actualiza cada hora) |
| `/alquileres/<key>` | `advertId` de cada oferta de la propiedad | `marketpricelogs` vertical `alquiler` |
| `/venta-viviendas-uruguay/<key>` | `key` | `marketpricelogs` vertical `venta` |
| `/celulares-uruguay/<modelo>` | `listingId` de cada oferta de la tabla | `pricewatchoffers` |
| `/sillas-escritorio-uruguay/<slug>` | `listingId` de cada oferta | `pricewatchoffers` |
| `/equipar-casa-uruguay/productos` y `/mi-lista` | `listingId` de cada fila | `pricewatchoffers` |

Una vivienda en alquiler tiene varias ofertas (el mismo inmueble en varios portales): cada oferta
lleva su propia variación, nunca una sola línea inventada para la propiedad.

En `/celulares`, `/sillas` y `/equipar` el bloque convive con la serie del producto que ya existe y
**no la reemplaza**: son dos cosas distintas y la página lo dice — la del producto se mueve porque
cambia quién vende, la del aviso porque ese vendedor cambió su precio.

### La página `/cambios-de-precio-uruguay`

Título: "Qué bajó y qué subió de precio en Uruguay". Contenido:

- Encabezado con la fecha del snapshot, desde cuándo medimos cada vertical y cuántos avisos se siguen.
- Contadores: cuántos bajaron y cuántos subieron en los últimos 7 días, por vertical.
- Tablas por vertical (autos, alquiler, venta, heladera/equipar, celulares, sillas, movilidad), hasta
  25 filas cada una, ordenadas por magnitud del cambio: título, precio anterior → actual, %, fecha,
  link a la ficha.
- Tope por vendedor/anunciante (3) para que una automotora que retocó 40 precios no se coma la tabla.
- Nota de método: qué es un cambio observado, qué no medimos, por qué una moneda distinta no aparece.
- Enlace cruzado con `/ciberlunes-y-black-friday-uruguay` (la pregunta "¿es un descuento real?" se
  contesta allá) y con `/evolucion-precio-*` (el nivel del mercado, que es otra medida).

## El job `currency-price-changes`

- Entrypoint de raíz `sync_price_changes.ts` → `dist/sync_price_changes.js`; pm2 cron `9 16 * * *`
  UTC (después de `currency-market-series` 13:03, de `currency-phones` 14:29 y de
  `currency-movilidad` 15:33, así el snapshot del día ya ve lo que esos escribieron).
- Se agrega a `OTHER_APPS` en `scripts/deploy-backend.sh`, si no nunca arranca en el VPS.
- Necesita `APP_MONGO_URI`; sin eso sale en 1 sin escribir.
- Lee por lotes con cursor (`pricewatchoffers` ~19 k, `marketpricelogs` ~67 k, `carlistings` ~22 k) y
  proyección mínima. No carga todo en memoria.
- Escribe `pricechangesnapshots`: `current` + `day:YYYY-MM-DD`, poda a 400 días (igual que
  `priceeventsnapshots`).
- **Guarda de corrida flaca**: si ya había ≥20 cambios publicados y la corrida nueva trae menos del
  40 %, no escribe y sale en 1 — salvo la primera corrida, que siempre escribe.
- Log de una línea por vertical: avisos leídos, con historia, cambios en la ventana.

## Tests

Raíz (`vitest`, sin base de datos — los modelos van simulados):

- `tests/pricehistory/normalize.test.ts`: los tres adaptadores; corte por cambio de moneda;
  `changePct` y `lastChange`; serie de 1 punto; historia vacía; punto sin `c` (los de antes del
  2026-09-17) tratado como "desconocido" y no como otra moneda.
- `tests/pricehistory/scan.test.ts`: ventana de N días; orden por magnitud; tope por vendedor; un
  cambio de moneda no entra; una suba y una baja del mismo aviso en la ventana cuentan una vez (la
  última).
- `tests/pricehistory/refresh.test.ts`: la guarda de corrida flaca (primera corrida escribe con 0;
  una corrida con menos del 40 % de lo publicado no escribe y sale en 1); la poda de `day:`.
- `tests/no_scheduler_in_api.test.ts` ya existente sigue verde (el job es pm2 aparte, no un
  `setInterval` en la API).

App (`app/tests/unit`):

- `priceHistory.test.ts`: paridad del espejo puro con el de raíz (mismas constantes y mismo formato).
- `priceHistoryApi.test.ts`: la ruta valida `vertical`/`id`, topea `ids` en 60, y **no** devuelve
  ningún campo de `carlistings`/`marketpricelogs` fuera de la serie (test de privacidad, del mismo
  tipo que `tests/site_analytics/revenue_privacy.test.ts`).
- `priceChangesApi.test.ts`: forma de la respuesta, snapshot ausente → respuesta vacía, no 500.
- `siteNav-coverage.test.ts` (ya existe): la ruta nueva entra en la navegación.

## Fuera de alcance (a propósito)

- No se cambia la cadencia de `marketpricelogs` (1×/día): el precio pedido de una vivienda no se
  mueve por hora, y meter la escritura en la cosecha horaria de alquileres es otro trabajo con su
  propio riesgo. La ficha muestra la resolución real con sus fechas.
- No se reconstruye historia hacia atrás: no existe. Las series arrancan el 6–18/9/2026.
- No se tocan `/ciberlunes-y-black-friday-uruguay` ni las series de `/evolucion-precio-*`.
- No se publica el historial de un aviso de Facebook Marketplace (nunca entró a `pricewatchoffers`, y
  en alquiler/autos su precio es un pedido de un particular, no una lista).

## Reglas del repo que aplican a este commit

- `docs/seo/experiments.json`: la página nueva es un cambio pensado para mover tráfico → su fila va en
  el mismo commit, con ruta declarada (hay test que verifica que la ruta exista).
- Repo público: cero cifras de ingreso en código, comentarios, docs versionados o mensajes de commit.
- gitleaks: nada de campos llamados `key` con valores numéricos en los fixtures — `id`/`slug` desde el
  primer commit.
- `docs/app/PRICE_CHANGES.md` nuevo, y actualización de `docs/app/PRICEWATCH.md` ("quién lo lee") y
  `docs/app/MARKET_SERIES.md` (D4).
