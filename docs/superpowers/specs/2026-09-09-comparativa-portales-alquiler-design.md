# Comparativa de portales de alquiler + lo que sólo puede hacer un agregador

Fecha: 2026-09-09. Estado: aprobado (orden permanente de auto-aprobación).

## Problema

`/alquileres-uruguay` lee cinco portales (Mercado Libre, InfoCasas, Facebook Marketplace,
Casasweb, Inmuebles El País) y publica **una fila por vivienda**, no una por aviso. Quien busca
alquiler no llega por esa arquitectura: llega escribiendo «páginas para alquilar en Uruguay»,
«InfoCasas o Mercado Libre», «dónde buscar alquiler». No existe una página que conteste esa
pregunta, y tampoco existe en el sitio ninguna señal visible de por qué mirar acá en vez de abrir
los cinco portales a mano.

Peor: la ventaja YA está en los datos y no se dice. La tarjeta muestra un cartel «2 portales» y,
en la columna lateral, el precio de cada aviso. El usuario tiene que restar mentalmente para
descubrir que el mismo inmueble está más barato en uno de los dos. Y el tiempo que un aviso lleva
publicado —el dato con el que se negocia, que ningún portal muestra en su listado— existe en
`firstSeen`/`publishedAt` y no aparece en ninguna tarjeta.

## La medición que cambió el diseño

El diseño original ponía la brecha de precios entre portales en el centro: «el mismo inmueble,
más barato en otro lado». Antes de escribir el texto se midió producción
(`GET /api/rentals?perPage=1`, 2026-09-09 06:07 UTC):

| | viviendas |
|---|---|
| Total vigente | 54.645 |
| Mercado Libre | 26.113 |
| InfoCasas | 16.804 |
| Inmuebles El País | 6.504 |
| Casasweb | 3.180 |
| Facebook Marketplace | 2.045 |
| **Suma por portal** | **54.646** |

La suma excede el total en **uno**. Como una vivienda unida cuenta en cada portal donde está, ese
exceso ES la cantidad de viviendas multiportal: **una, en todo el catálogo**. Las reglas de unión
—exigen dirección exacta más identificador explícito de unidad, y el 2026-09-05 separaron 923
grupos heredados— prácticamente no cruzan portales.

Dos consecuencias, y las dos importan más que el plan original:

1. **La brecha de precios no puede sostener la página.** Dispararía en 1 de 54.645 fichas. El
   código se construye igual, porque es correcto y no cuesta una consulta nueva, pero no se
   publicita ni se le escribe una sección.
2. **El dato verdadero es mejor.** Los inventarios son casi disjuntos: cada portal tiene otras
   viviendas. Quien busca sólo en InfoCasas está viendo el 31 % de lo publicado; sólo en Mercado
   Libre, el 48 %. Ese es el argumento de la comparativa, es verificable, y se explica solo.

La página, entonces, no argumenta «unimos avisos repetidos» sino «los portales no se pisan, y por
eso mirar uno solo no alcanza». También publica el número de viviendas multiportal tal como es,
en vez de esconderlo: decir que la unión casi nunca ocurre es lo que vuelve creíble el resto.

## Qué se construye

Tres piezas. Una responde la búsqueda; dos convierten datos que ya tenemos en ventaja visible.

### 1. Página `/comparar-portales-de-alquiler-uruguay`

Comparativa honesta entre los portales y el directorio propio, siguiendo el precedente de
`/alternativa-a-bankos-uruguay`: tabla, razones, y una sección explícita de **en qué te conviene
ir al portal**.

Regla de contenido, heredada de esa página: **no se audita la interfaz ajena**. Los portales son
SPAs; una lectura automática no ve sus filtros y no se puede afirmar qué filtros tienen sin
mirarlos a mano y que cambien mañana. Por eso cada fila de la tabla compara hechos
**estructurales**, no funcionalidades:

- cuántos portales ve cada uno (nosotros cinco, cada portal el suyo — cierto por definición);
- quién une el mismo inmueble publicado en varios lados;
- quién puede decirte que está más barato en otro portal;
- de quién es el inventario y dónde se contacta al anunciante (del portal, y eso es una ventaja
  suya);
- dónde se publica un aviso (en el portal; acá no se puede);
- qué capas propias existen que no son inventario: servicios cercanos desde OpenStreetMap,
  comparación de zonas, planificador por ingreso del hogar, alertas por email/push.

Las cifras de la comparativa **no se escriben a mano**: se leen en vivo del propio catálogo, así
la página no puede quedar desactualizada ni exagerar. Si la lectura falla, la página se sirve sin
el bloque de cifras, nunca con números inventados.

Se declara también lo que NO cubrimos: Gallito y las webs propias de las inmobiliarias no están
entre las fuentes; la cobertura es parcial y así está documentado en `RENTALS.md`.

### 2. Endpoint `GET /api/rentals/portales`

Alimenta el bloque de cifras. Reutiliza `rentalPublicStages` para que la ventana de vigencia
(`RENTAL_STALE_DAYS`) y las exclusiones sean **exactamente las mismas** que ve el directorio: una
comparativa que cuenta un universo distinto del que muestra la búsqueda es una comparativa falsa.

Devuelve:

- `total`: viviendas vigentes.
- `sources[]`: viviendas por portal (una vivienda en dos portales cuenta en los dos; se dice).
- `multiPortal`: viviendas con avisos en dos o más portales.
- `withGap`: de ésas, cuántas tienen precios distintos entre portales.
- `medianGapUyu` / `medianGapPct`: mediana de la diferencia, calculada sobre `withGap`.
- `maxGapUyu`: la mayor diferencia observada.
- `generatedAt`.

`defineCachedEventHandler` con una hora, como el resto de los agregados del sitio.

Guardas: la brecha se calcula sólo entre avisos con `priceUyu` finito y positivo, y sólo entre
**portales distintos** (dos avisos del mismo portal son dos inmobiliarias compitiendo dentro de
la misma casa, no una diferencia entre portales). La conversión a pesos usa la tasa de la corrida,
que ya está documentada en el tipo `RentalOffer`.

### 3. Mejora A — la brecha, dicha en palabras (silenciosa hoy)

Medida arriba: hoy alcanza a una vivienda. Se construye porque es correcta y gratis, y porque
cualquier mejora futura de la unión la enciende sola. No se le escribe copy en la comparativa.


En la tarjeta del directorio y en la ficha: cuando una vivienda tiene avisos en dos o más
portales **con precios distintos**, una línea explícita dice cuál es el más barato y cuánto es la
diferencia, en pesos y en porcentaje.

Umbral: se muestra sólo si la diferencia es ≥ 1 % y ≥ $200 UYU. Por debajo es ruido de
redondeo/conversión y llenar la lista de carteles de $37 destruye la señal.

Redacción: **«el mismo inmueble, más barato en X»**, nunca «ahorrás». No se promete un ahorro: es
el precio pedido en un aviso, hay que confirmarlo con el anunciante, y los gastos comunes pueden
diferir entre avisos. La línea aclara que compara el alquiler, no el total.

Es la única afirmación de esta página que un portal no puede copiar: para hacerla hay que leer a
los cinco y unir el inmueble.

### 4. Mejora B — cuánto lleva publicado

Chip en la tarjeta y línea en la ficha con el tiempo que el aviso lleva en circulación. Es el
dato con el que se negocia y ningún portal lo pone en su listado.

Honestidad del origen, que acá es todo:

- si el portal publica `publishedAt`, se usa ése y se dice «publicado hace N días»;
- si no, se usa `firstSeen`, que es **cuándo lo vimos nosotros por primera vez**, y se dice «lo
  vemos hace N días» — nunca «publicado hace», porque el aviso puede ser anterior a que
  empezáramos a leer esa fuente.

Se toma el aviso más antiguo de la vivienda (la primera vez que apareció en cualquier portal).
Por debajo de 7 días no se muestra nada: «hace 2 días» no informa nada y compite con el resto de
la tarjeta.

## Qué NO se hace

- **Historial de precios.** Sería lo más valioso («bajó de $32.000 a $29.000») y ningún portal lo
  muestra, pero no está en el modelo: `RentalOffer` guarda un precio, no una serie. Agregarlo es
  cambio de esquema en las dos copias (`classes/models` y `app/server/models`), lógica de mezcla
  en `store.ts` y test de paridad — y arrancaría vacío, porque la serie empieza el día que se
  despliega. Queda fuera de este trabajo, anotado como el siguiente paso natural.
- **Auditar los filtros de los portales.** Ver arriba.
- **Tocar el pipeline de lectura.** Las tres piezas leen lo que ya está guardado.

## Verificación

- `app/tests/unit/` — pruebas puras del cálculo de brecha (umbrales, portales distintos, precios
  ausentes, moneda mixta) y del cálculo de antigüedad (`publishedAt` vs `firstSeen`, corte de 7
  días).
- Prueba del endpoint con el catálogo simulado que ya usan las pruebas de alquileres.
- `npm run lint` en `app/` (`typecheck` está roto, ver AGENTS.md).
- Comprobación en producción después del despliegue: la página muestra cifras y la tarjeta
  muestra la brecha en una vivienda multiportal real.
