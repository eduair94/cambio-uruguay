# Seguimiento de precios: alquileres, viviendas en venta y autos usados

Páginas: `/evolucion-precio-alquileres-uruguay`, `/evolucion-precio-viviendas-uruguay`,
`/evolucion-precio-autos-usados-uruguay` y el bloque "Cómo se mueve el precio" de cada
`/autos-usados-uruguay/precios/<modelo>`. Job: `currency-market-series` (`dist/sync_market_series.js`,
`3 13 * * *`). Código: `classes/marketseries/` (raíz), `app/utils/marketSeries.ts`,
`app/server/api/market-series/`, `app/components/MarketSeriesExplorer.vue`. Diseño:
`docs/superpowers/specs/2026-09-18-seguimiento-de-precios-design.md`.

## Qué mide, y por qué son dos números

Una cohorte es "un producto": alquileres o ventas por moneda × tipo (apartamento, casa, todas) ×
dormitorios (todos, 0, 1, 2, 3, 4+) × ámbito (Uruguay, departamento, barrio); autos por modelo,
modelo+año y "todos los autos". Cada día, cada cohorte recibe un punto con dos medidas que **no son lo
mismo** y la página nunca mezcla:

- **Nivel**: p25/mediana/p75 de los precios pedidos vigentes, con `n` (y mediana por m² construido en
  viviendas). Se mueve también cuando cambia qué avisos hay publicados: si entran casas baratas, baja
  sola. En autos es peor, porque la mediana de un modelo sigue a la mezcla de años publicada.
- **Misma oferta** (`w7`/`w30`/`w90`): sólo los avisos vigentes hoy que el job ya seguía hace 7, 30 o
  90 días, cada uno contra su propio precio de entonces. Se publica la media geométrica de
  `precio_hoy / precio_entonces` menos 1 y cuántos bajaron, subieron o quedaron igual (umbral ±0,5 %).
  No depende de la composición: es el único número que la página llama "variación".

Reglas (constantes con paridad raíz/app en `app/tests/unit/marketSeries.test.ts`):

- Nivel con `n ≥ 8`, emparejado con `pares ≥ 8`. Una cohorte que no llega ese día no recibe punto (el
  gráfico muestra el hueco); su último punto queda con su fecha y la página lo dice.
- **Las monedas nunca se mezclan ni se convierten**: la moneda es parte de la clave. Un alquiler en
  dólares de Punta del Este es otra serie.
- Un par con razón fuera de `[0,5; 2]` se cuenta en `outliers` y no entra: en 30 días un aviso que se
  duplica o se parte a la mitad es un error de carga o de unidad. Un par con monedas distintas no se
  forma.
- Alquileres: una observación por **vivienda** para el nivel (la lectura más reciente, desempate por
  id; nunca la oferta más barata — la regla de `propertyzones/market.ts`), el **aviso** para el
  emparejado. Ventas y autos: un aviso, una observación.
- Autos: sólo precio nativo en dólares y moneda no deducida, precio entre USD 1.000 y 500.000 (debajo
  es una seña), y sin ninguna bandera pública (choque, deuda, recupero, chapa extranjera...), igual que
  la página de cada modelo.

## Cómo se reparten los precios (histograma, no campana)

Cada cohorte con 30 unidades o más guarda también la **forma** de sus precios del día
(`classes/marketseries/histogram.ts`): un histograma de los precios reales. No se ajusta una campana
de Gauss: los precios pedidos no son simétricos (venta, todo el país: p25 US$ 139.800, mediana
195.000, p75 346.000, el tramo de arriba mide 2,7 veces el de abajo) y una normal pondría el centro
donde no está y probabilidad en precios negativos.

- **Eje de p1 a p99**; lo de afuera se cuenta en `below`/`above` y la página lo dice. En esas colas
  viven los errores de carga.
- **Tramos logarítmicos** cuando p99 es 4 veces p1 o más (venta y alquiler a nivel país); si no,
  lineales.
- **Unas √n barras, entre 6 y 20**: 20 barras para los 71 Onix 2018 dibujaban ruido.
- **Un tramo lineal es múltiplo del redondeo que usa la mayoría de los precios** (el más grueso que
  todavía deja 3 barras). La gente pide números redondos: en Pocitos, 2 dormitorios, $45.000 tenía
  127 avisos y $42.500 18; con tramos de $2.500 las barras serpenteaban por ese anclaje y no por el
  mercado. Con tramos de $5.000 cada barra lleva los mismos redondos.
- Se guardan las últimas **100 formas** por cohorte (`hists`). `GET /api/market-series/series`
  devuelve la de hoy (`hist`, sólo si la cohorte tiene forma hoy) y la más nueva con 28 días o más
  (`histThen`); la página la dibuja como línea punteada sobre las barras de hoy, redistribuida en los
  tramos de hoy con su propia acumulada (los tramos de dos días no coinciden).
- El campo **"Tu precio"** ubica un precio en la acumulada del histograma (interpolada dentro del
  tramo; en escala log si los tramos lo son): "pide más que el 63 % de los avisos".

## De dónde lee

Sólo los catálogos **públicos** de la APP DB, nunca una cosecha: `rentallistings` (con
`ZONE_RENTAL_PROJECTION` + `projectZoneObservations`, las reglas de identidad y elegibilidad del
sitio), `propertysalecatalog` y `carcatalog`, cada uno con la ventana de frescura de su propio
catálogo (10, `freshDays` del meta y `freshDays` del meta). Un meta con más de 3 días saltea ese
mercado ese día: un catálogo viejo no es el mercado de hoy.

## Qué escribe (APP DB)

| colección | qué | quién la lee |
|---|---|---|
| `marketpricelogs` | un documento por `mercado:aviso`, con `firstSeen`/`lastSeen` (días en que ESTE job lo vio) y `points [{d, p, c}]` **sólo cuando cambia** el precio o la moneda (tope 40). Se poda a 120 días sin verse | privada, con UNA excepción acotada desde el 2026-09-22: la ficha de un alquiler o de una vivienda en venta publica la serie `{fecha, precio}` **de ese aviso** (`classes/pricehistory/`, `docs/app/PRICE_CHANGES.md`). Nada más de estos documentos cruza la red |
| `marketseries` | un documento por cohorte: `dims`, `labels`, `label`, `latest` y `points` (tope 1.100 = 3 años). Pipeline con `$literal` (la trampa de `PRICEWATCH.md`); re-correr el mismo día reemplaza el punto del día | `GET /api/market-series/series?key=` |
| `marketseriesmetas` | `index:<mercado>` (zonas o modelos con su `n`, mayores movimientos emparejados, `trackingSince`) y `run` (estado de la última corrida por mercado) | `GET /api/market-series?v=` |

El día de observación de un log es el `lastSeen` del propio catálogo, no el de la corrida: una fila que
el cosechador no releyó no genera un punto nuevo. El emparejado se calcula contra el log **de antes**
de actualizarlo.

## El job

`node dist/sync_market_series.js [--dry-run] [--only=alquiler,venta,autos]`. Cada mercado en su
propio `try`: uno caído no frena a los otros. Si las observaciones de un mercado caen bajo el 60 % de
la corrida anterior (y la anterior tenía 50 o más), ese mercado no escribe nada, queda anotado en `run`
y el job sale con 1. 13:03 UTC: después de alquileres (04:52), oportunidades (06:21) y autos (07:43);
no usa el puente de ML.

Primera corrida, 2026-09-18 (a mano, desde el VPS): 27.138 avisos de alquiler → 1.173 cohortes,
16.753 ventas → 1.068, 17.633 autos → 874 (fuera: 765 por moneda, 179 por bandera, 33 inválidos).
13 s en total. Mediana nacional: alquiler $ 28.000, venta US$ 195.000, auto usado US$ 13.000.

## No hay pasado, y no se inventa

La serie empieza el día de la primera corrida. No se reconstruye hacia atrás: los precios viejos no
existen y rellenar con el precio de hoy dibujaría una línea plana que nunca se observó. La variación
de 7 días aparece a la semana, la de 30 al mes y la de 90 a los tres meses; hasta entonces la tarjeta
dice desde cuándo se publica. Los "mayores movimientos" usan 30 días si hay cohortes con 20 pares o
más, si no 7, si no no se muestran.

## Verificar

- `node dist/sync_market_series.js --dry-run` en el VPS: conteos, excluidos y las 6 cohortes más
  grandes de cada mercado, sin escribir.
- `curl -s 'https://cambio-uruguay.com/api/market-series?v=autos' | head -c 400` y
  `.../api/market-series/series?key=alquiler%7CUYU%7Ctodas%7Cany%7Cuy`.
- En el navegador, ninguna etiqueta Vuetify cruda (`document.querySelectorAll('vchipgroup, vbtntoggle').length === 0`).
