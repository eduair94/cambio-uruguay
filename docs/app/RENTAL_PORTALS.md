# Comparativa de portales de alquiler (`/comparar-portales-de-alquiler-uruguay`)

Página pública que compara los cinco portales que lee el directorio con lo que agrega buscarlos
juntos, más las dos señales que ninguno de ellos publica en su listado. Vive al lado de
`/alquileres-uruguay` en la navegación y en el sitemap.

## Por qué la página dice lo que dice

La medición del **9 de septiembre de 2026** (`GET /api/rentals?perPage=1`, 06:07 UTC) sobre el
catálogo vigente:

| | viviendas |
|---|---|
| Total | 54.645 |
| Mercado Libre | 26.113 |
| InfoCasas | 16.804 |
| Inmuebles El País | 6.504 |
| Casasweb | 3.180 |
| Facebook Marketplace | 2.045 |
| Suma por portal | 54.646 |

Una vivienda unida cuenta en cada portal donde está publicada, así que **el exceso de la suma
sobre el total es la cantidad de viviendas multiportal: una**. Los inventarios son prácticamente
disjuntos, y las reglas de unión —dirección exacta más identificador explícito de unidad, con la
separación de 923 grupos heredados del 2026-09-05— casi nunca cruzan portales.

De ahí sale el argumento de la página, que **no** es «unimos avisos repetidos» sino «cada portal
tiene otras viviendas, y mirar uno solo deja afuera la mayor parte». Y de ahí sale también la
decisión de **publicar el número de viviendas multiportal tal como es**: decir que la unión casi
nunca ocurre es lo que vuelve creíble el resto de la comparativa.

Las filas de la tabla comparan hechos **estructurales** (qué inventario alcanza cada uno, quién
tiene el contacto del anunciante, dónde se publica un aviso), nunca una auditoría de la interfaz
ajena: los portales son SPAs, una lectura automática no ve sus filtros, y afirmar qué botones
tienen es una promesa que caduca sin aviso.

La página incluye una sección de **en qué te conviene ir al portal** y otra de **lo que no
cubrimos** (Gallito, webs propias de inmobiliarias, grupos de WhatsApp, y la cobertura parcial
dentro de los cinco que sí se leen).

## `GET /api/rentals/portales`

Alimenta el bloque de cifras. Reutiliza `rentalPublicStages` con la misma ventana
`RENTAL_STALE_DAYS` que la búsqueda: una comparativa que cuenta un universo distinto del que
muestra el buscador es una comparativa falsa. `defineCachedEventHandler`, una hora.

Devuelve `total`, `sources[]`, `multiPortal`, `withGap`, `medianGapUyu`, `medianGapPct`,
`maxGapUyu`, los dos umbrales y `generatedAt`. La brecha se calcula sobre **el mejor precio de
cada portal**, no sobre el mínimo y el máximo del conjunto: dos avisos del mismo portal son dos
inmobiliarias compitiendo dentro de él, no una diferencia entre portales. Si la lectura falla, la
página se sirve sin el bloque; nunca con números de relleno.

## Las dos señales en la tarjeta y en la ficha

`app/utils/rentalPortals.ts`, puro y sobre el payload que la lista ya recibe (no hay consulta
nueva).

**`portalPriceGap`** — cuando una vivienda tiene avisos en dos portales con precios distintos,
dice cuál es el más barato y cuánto es la diferencia. Umbrales: ≥ $200 UYU **y** ≥ 1 %, porque por
debajo es redondeo y conversión de dólares. La redacción nunca promete un ahorro: compara el
alquiler pedido, no el total con gastos comunes, y los avisos pueden ser de inmobiliarias
distintas. **Hoy alcanza a una vivienda** (ver la medición de arriba); se construyó igual porque
es correcto, no cuesta una consulta y cualquier mejora futura de la unión lo enciende solo. Por eso
no se le escribe copy en la comparativa.

**`rentalListedFor`** — cuánto lleva publicada la vivienda, desde el más viejo de sus avisos, y
esta sí aplica a las 54.645. Si el portal publica la fecha se dice «publicado hace N días»; si no,
se usa la primera lectura propia y se dice **«lo vemos hace N días»**, porque `firstSeen` es
cuándo empezamos a mirar y el aviso puede ser anterior. Por debajo de 7 días no se muestra nada.
La ficha agrega la aclaración completa del origen.

La antigüedad se calcula contra un instante fijado en el servidor y transferido en el payload
(`useState('rental-rendered-at')`): con `Date.now()` en los dos lados, una página renderizada a
las 23:59 e hidratada a las 00:00 cambia el número y Vue vuelve a pintar la lista entera.

## Pruebas

- `app/tests/unit/rentalPortals.test.ts` — umbrales, comparación por portal y no por extremos,
  `publishedAt` contra `firstSeen`, fechas futuras o inservibles, corte de 7 días.
- `app/tests/unit/rentalPortalStats.test.ts` — ejecuta el endpoint real con la base simulada:
  medianas, ausencia de `NaN`, filas rotas descartadas, y que la agrupación por portal y los
  umbrales compartidos sigan en la consulta.
