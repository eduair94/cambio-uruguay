# Cambios de precio por aviso (`/cambios-de-precio-uruguay` + el bloque de cada ficha)

Qué bajó y qué subió de precio, **aviso por aviso**, en las siete verticales que el sitio releva.
Páginas: `/cambios-de-precio-uruguay` y el bloque "Cómo cambió el precio" de cada ficha (autos,
alquiler, venta) y la variación por oferta de celulares, sillas y el directorio de equipar. Job:
`currency-price-changes` (`dist/sync_price_changes.js`, `9 16 * * *`). Código: `classes/pricehistory/`
(raíz), `app/utils/priceHistory.ts`, `app/server/utils/priceHistory.ts`,
`app/components/PriceHistoryBlock.vue`. Diseño:
`docs/superpowers/specs/2026-09-22-cambios-de-precio-design.md`.

## Lo primero: acá no se escribe historial, se lee

El registro ya existía y es regular. Vive en tres colecciones, cada una escrita por el job que ya
relevaba ese mercado:

| vertical | colección | qué guarda | quién la escribe | cadencia |
|---|---|---|---|---|
| equipar, sillas, celulares, movilidad | `pricewatchoffers` | un punto **por día**, aunque no cambie; 120 puntos; poda 180 d | `sync_equipar` / `sync_chairs` / `sync_phones` / `sync_movilidad` (ver `PRICEWATCH.md`) | diaria + horaria |
| autos | `carlistings.priceHistory` | un punto **sólo al cambiar**; tope 20 | `sync_autos` (`classes/autos/store.ts`) | diaria + horaria |
| alquiler, venta (y autos, que no se usa acá) | `marketpricelogs` | un punto **sólo al cambiar**; tope 40; poda 120 d | `sync_market_series` (`classes/marketseries/log.ts`) | 1×/día, 13:03 UTC |

`classes/pricehistory/normalize.ts` las lleva a una forma común. **No hay una cuarta colección de
historial**: duplicaría el dato, agregaría una escritura por job y tendría su propio desfasaje.

La vertical **autos sale de `carlistings` y no de `marketpricelogs`**, aunque las dos la tengan:
carlistings se actualiza cada hora y marketpricelogs una vez por día, así que publicar las dos
contaría el mismo cambio dos veces con distinta resolución.

## Las reglas del lector

- **La moneda nunca se mezcla.** Una serie es de UNA moneda. Se camina desde el último punto hacia
  atrás y se corta en el primero cuya moneda conocida sea distinta; ahí se marca `currencySwitched` y
  la ficha lo dice en palabras. Un aviso que pasó de USD a UYU no bajó un 4.000 %, cambió de unidad.
- **Un punto sin moneda hereda la del aviso.** Los puntos de `pricewatchoffers` anteriores al
  2026-09-17 no llevan `c` (ver `PRICEWATCH.md`): "desconocida" no es "otra", así que no corta nada.

La tercera es de plausibilidad, y salió de mirar la primera ficha publicada: **un salto de más de 5×
no es un cambio de precio, es un error de carga**. `carlistings` guarda el punto igual —`priceSanity.ts`
retira el AVISO del catálogo, no el punto de su historia— y el bloque anunciaba "subió 6.597,5 %" sobre
un Chery Tiggo 8 que había pasado de US$ 16.590 a US$ 1.111.111 (medido el 2026-09-22). Con tres o más
puntos se descarta el que se aparta de la mediana de los demás; con dos no hay mediana ni forma de
saber cuál es el bueno, así que **no se publica serie**. El factor es 5 y no 2 porque duplicar el
precio de un alquiler pasa de verdad (15.000 → 30.000, medido el mismo día).

Y una cuarta que es de la UI: **nunca se afirma nada anterior a `firstSeen`**. Todo bloque lleva
"lo medimos desde el <fecha>", porque un aviso publicado en 2024 no tiene historia nuestra.

## Dónde se ve

| ficha o directorio | id que cruza | fuente |
|---|---|---|
| `/autos-usados-uruguay/<key>` | `key` | `carlistings.priceHistory` |
| `/alquileres/<key>` | `<fuente>:<id nativo>` de cada oferta | `marketpricelogs` (`alquiler`) |
| `/venta-viviendas-uruguay/<key>` | `key` | `marketpricelogs` (`venta`) |
| `/celulares-uruguay/<modelo>` | `listingId` de cada oferta | `pricewatchoffers` |
| `/sillas-escritorio-uruguay/<slug>` | `id` de cada oferta | `pricewatchoffers` |
| `/equipar-casa-uruguay/productos` y `/mi-lista` | `listingId` de cada fila | `pricewatchoffers` |

**No hay ruta `/api/price-history`**: la serie viaja adjunta a la respuesta que la ficha o el
directorio ya pide, así va en el HTML servido y no cuesta un segundo viaje por el mismo id. Todas son
lecturas por índice único (o un `$in` de como mucho una página de ids), así que no agregan sobre la
colección y pueden ir en vivo.

En celulares y sillas el bloque **convive** con la serie del producto que esas fichas ya publicaban y
no la reemplaza: la del producto se mueve también cuando entra o sale un vendedor; la del aviso sólo
cuando ese vendedor cambió su precio.

`app/utils/phones.ts` y `classes/phones/catalog.ts` ganaron un `listingId` por oferta (aditivo) porque
sin él la ficha de celulares no podía cruzar sus ofertas con el historial; lo mismo
`classes/equipar/catalog.ts`, que es el que arma las ofertas de equipar y de movilidad.

Las filas guardadas ANTES del 2026-09-22 no lo traen, y su catálogo sólo se reescribe en la próxima
corrida diaria de cada job. Para no esperar hasta ahí está `npm run backfill_offer_listing_ids`
(`scripts/oneoff/`), que le pone el id a las ofertas ya publicadas cruzándolas **por URL** contra
`pricewatchoffers` —la misma URL que esa colección ya guarda junto al id— sin volver a raspar nada y
sin tocar ningún precio. Una URL que aparece en dos avisos distintos se deja sin id: no hay forma de
decidir cuál es, y ponerle el del otro sería peor que no ponerle ninguno.

## Lo que se publica de una colección privada

`carlistings` y `marketpricelogs` son privadas (descripciones, vendedores, teléfonos, ids cruzados).
De ellas sale **sólo la serie del aviso que el lector está mirando**: `{fecha, precio}` más la moneda,
que es el mismo precio pedido que ese aviso publica hoy, fechado por nosotros.
`app/server/utils/priceHistory.ts::publicSeries` es el único armador de lo que cruza la red y
`app/tests/unit/priceHistoryPrivacy.test.ts` lo vigila, igual que
`tests/site_analytics/revenue_privacy.test.ts` vigila el ingreso.

Esto **cambia a propósito** la nota de `MARKET_SERIES.md` que decía que esa colección no se sirve
campo a campo: se sirve la serie de un aviso, nada más.

## La página

`/cambios-de-precio-uruguay` lee un snapshot; **no agrega nada en el pedido** (regla del usuario,
2026-09-19: lo que procesa la base se calcula periódicamente y se guarda). El job recorre las tres
colecciones con cursor y publica en APP DB `pricechangesnapshots` un documento `current` más un
`day:YYYY-MM-DD` de archivo, podado a 400 días.

- Ventana: **7 días**. Una fila es el ÚLTIMO cambio de ese aviso dentro de la ventana.
- Orden: por magnitud del cambio, con desempate por fecha y por id, así dos corridas con los mismos
  datos publican exactamente la misma tabla.
- **Tope de 3 filas por vendedor** y 25 por vertical: una automotora que retoca cuarenta precios el
  mismo día no puede ocupar la tabla entera. El cupo cuenta por **nombre público**, no por clave
  interna: DIMM tiene su propia tienda (`dimm`) y su cuenta de Mercado Libre (`ml:n:dimm`), y con el
  tope por clave publicaba seis filas seguidas con el mismo nombre (medido el 2026-09-22). En autos el
  nombre sale de `dealerName` del catálogo —no existe `sellerName` ahí, y por eso las 25 primeras
  filas salieron sin anunciante y sin tope—. Un aviso sin nombre ni clave (un particular que el portal
  no identifica) no comparte cupo con otro.
- Alquiler, venta y autos se enriquecen contra el catálogo **público** (`rentallistings`,
  `propertysalecatalog`, `carcatalog`): un aviso que el catálogo ya no publica no aparece, y el enlace
  va a la ficha propia del sitio. Las verticales de retail enlazan a la oferta en la tienda
  (`external: true`).
- **Guarda de corrida flaca**: con 20 o más cambios ya publicados, una corrida que trae menos del 40 %
  no escribe y sale en 1. La primera corrida siempre escribe, aunque traiga cero.

Lo que la página **no** dice: si conviene comprar. Un precio que baja puede seguir siendo caro. La
pregunta "¿es un descuento real?" la contesta `/ciberlunes-y-black-friday-uruguay`, que compara contra
el propio mínimo de 60 días y exige antigüedad; el nivel del mercado lo cuentan las páginas
`/evolucion-precio-*`.

## La resolución de cada vertical

| vertical | quién escribe el punto | cada cuánto |
|---|---|---|
| equipar, sillas, celulares, movilidad | `recordPricewatch` en cada job | diaria + horaria |
| autos | `classes/autos/store.ts` | diaria + horaria |
| **alquiler** | `currency-market-series` (13:03) **y la propia cosecha** (`recordRentalPriceLogs`, `classes/pricehistory/marketLog.ts`) | **diaria + horaria** desde el 2026-09-22 |
| venta | `currency-market-series` | 1×/día |

El registro de alquiler lo escriben **dos** jobs sobre las mismas filas, y por eso la cosecha escribe
con un **pipeline de update atómico** (`marketLogOperation`) en vez de leer-modificar-escribir: si
leyera primero, perdería los puntos que el otro acabara de agregar. Las reglas del punto son las
mismas que las de `classes/marketseries/log.ts` —mismo precio y moneda que el último punto no agrega
nada, un cambio dentro del MISMO día reemplaza el punto de ese día, tope de 40— y están fijadas sin
base de datos por su gemelo en JS (`applyMarketPoints`, `tests/pricehistory/marketLog.test.ts`).

La cosecha no poda nada: la poda de `marketpricelogs` sigue siendo de `currency-market-series`, por
vertical y a 120 días.

Queda una ventana conocida, y es del otro lado: `currency-market-series` sí hace leer-modificar-
escribir (carga todos los logs de la vertical al empezar y los reemplaza al terminar), así que un
punto que la cosecha horaria escriba **mientras ese job corre** puede perderse. Son los pocos minutos
de su corrida diaria, y el punto vuelve en la hora siguiente si el precio sigue ahí; arreglarlo sería
reescribir ese job para que también use el pipeline atómico, y no vale el riesgo por esa ventana.

Medido el 2026-09-22, primera corrida horaria con esto puesto: 2.058 avisos registrados, y la
colección pasó de 29.196 a 30.649 filas de alquiler — o sea que además hay 1.453 avisos que el
seguimiento diario no veía (los que la proyección de zonas descarta por elegibilidad) y que ahora sí
tienen historia propia.

## Lo que todavía no mide

- **Venta sigue con resolución diaria**, y no por una decisión de este job: su catálogo se cosecha una
  vez por día (`currency-property-opportunities`, 06:21), así que no hay nada intradía que registrar.
  La corrida horaria de ese job (`--analyze-only`) no consulta los portales.
- **No hay historia hacia atrás**: las series arrancan entre el 6 y el 18 de setiembre de 2026 según
  la vertical, y no se puede reconstruir.
- **Facebook Marketplace no aporta historial publicado** (nunca entró a `pricewatchoffers`; en autos y
  alquiler su precio es el pedido de un particular, no una lista).

## Tests

Raíz: `tests/pricehistory/normalize.test.ts` (los tres adaptadores, el corte por moneda, el punto sin
`c`, la serie de un punto), `scan.test.ts` (ventana, orden, topes) y `refresh.test.ts` (corrida flaca,
poda del archivo). App: `priceHistory.test.ts` (paridad con el lector de la raíz, importándolo
directamente), `priceHistoryPrivacy.test.ts` (qué cruza la red) y la cobertura de navegación de
siempre.
