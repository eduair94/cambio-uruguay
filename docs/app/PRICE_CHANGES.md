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

## Las dos reglas del lector

- **La moneda nunca se mezcla.** Una serie es de UNA moneda. Se camina desde el último punto hacia
  atrás y se corta en el primero cuya moneda conocida sea distinta; ahí se marca `currencySwitched` y
  la ficha lo dice en palabras. Un aviso que pasó de USD a UYU no bajó un 4.000 %, cambió de unidad.
- **Un punto sin moneda hereda la del aviso.** Los puntos de `pricewatchoffers` anteriores al
  2026-09-17 no llevan `c` (ver `PRICEWATCH.md`): "desconocida" no es "otra", así que no corta nada.

Y una tercera que es de la UI: **nunca se afirma nada anterior a `firstSeen`**. Todo bloque lleva
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
sin él la ficha de celulares no podía cruzar sus ofertas con el historial. Las filas guardadas antes
del 2026-09-22 no lo traen y simplemente no muestran variación.

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
  mismo día no puede ocupar la tabla entera. Un aviso sin vendedor conocido no comparte cupo con otro.
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

## Lo que todavía no mide

- **Alquiler y venta tienen resolución diaria** porque `currency-market-series` corre una vez por día:
  un cambio que dura unas horas puede no quedar registrado. Mover esa escritura a la cosecha horaria
  de alquileres es otro trabajo, con su propio riesgo.
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
