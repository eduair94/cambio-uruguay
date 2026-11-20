# Scroll infinito en los directorios con paginación y filtros — diseño

Fecha: 2026-10-28. Pedido del dueño: "Donde haya paginación y filtros (alquileres, autos, etc.)
habilita e implementa la opción de cargar con scroll infinito (navegación más fácil). Optimizar
para evitar sobrecarga de memoria al cargar muchas entradas."

## Intención

Hoy cada directorio (alquileres, autos, motos, ventas, equipar, movilidad, sillas, …) obliga a
tocar "2", "3", … y a volver a ubicarse arriba de una lista nueva. El visitante que está
*mirando* (no buscando una ficha puntual) quiere seguir bajando. La opción tiene que existir en
todos los directorios con filtros y paginación, con el mismo comportamiento en todos, y no puede
convertirse en una página que, después de 300 avisos, pesa 300 tarjetas con sus carruseles de
fotos en memoria.

## Objetivos

1. Una **opción** (no un reemplazo) "Cargar más al bajar" en cada directorio paginado con filtros.
   La preferencia es del visitante, vale para todos los directorios y se recuerda
   (`localStorage`, clave `cu_list_mode`).
2. En modo scroll, al acercarse al final se pide la página siguiente con los MISMOS filtros y se
   agrega abajo, sin saltos.
3. **Memoria acotada**: nunca hay más de una ventana de ~96 avisos en el DOM (mínimo 3 páginas).
   Las páginas que quedan lejos arriba se sacan del DOM y se reemplazan por un espaciador del
   mismo alto medido; si el visitante vuelve a subir, se piden de nuevo (o salen de un caché
   chico de datos) y el espaciador se achica. Es una lista virtual a nivel de página.
4. **Volver desde una ficha** (atrás del navegador) devuelve la misma ventana y la misma posición,
   no la página 1 arriba de todo.
5. El pie de la página (asistente, preguntas, footer) sigue siendo alcanzable: la carga
   automática se pausa después de ~120 avisos nuevos y ofrece "Cargar más"; un toque reanuda.

## No objetivos

- No cambia lo que ve un rastreador ni el HTML del servidor: el SSR sigue pintando la página
  `?page=N` con su paginación de enlaces reales (`href`), canonical, robots y JSON-LD como hoy.
- No reescribe la URL mientras se baja. `history.replaceState` dispara `page_view` en GA4
  (medición mejorada por eventos del historial) y inflaría las vistas por página que usa el plan
  de ingresos. La URL sigue diciendo la página donde arrancó la lista.
- No se tocan las APIs del servidor: cada página siguiente es el mismo pedido con `page+1`
  (ya cacheado por Nitro). Del resultado el cliente se queda sólo con `items` y tira facetas,
  cobertura y metadatos en el acto.
- No cambia el modo por defecto: sigue siendo paginación numerada (ver "Decisiones").
- Ni mapa ni vistas que no son lista (el mapa de alquileres queda igual).

## Anti-objetivos (fracaso aunque "funcione")

- Que la página salte al agregar o sacar páginas (ver memoria "contenido tardío salta el scroll").
- Que el DOM crezca sin techo al bajar mucho.
- Desajuste de hidratación: el servidor nunca sabe la preferencia; el modo entra al montar.
- Que un directorio quede sin el pie alcanzable.
- Que un cambio de filtro mezcle avisos de la búsqueda vieja con la nueva (pedidos en vuelo se
  abortan).

## Cómo se hace (decisiones tomadas)

### Piezas

1. `app/utils/infiniteFeed.ts` — lógica PURA y testeada: cálculo de la ventana deseada a partir de
   alturas medidas por página y del viewport, alto de los espaciadores (descontando el `gap` de la
   grilla), qué páginas sacar, cuándo pausar la carga automática, caché LRU de datos por página y
   el caché de "volver atrás".
2. `app/composables/useListMode.ts` — preferencia compartida `paginas | scroll` (estado de módulo
   + `localStorage`), con la guarda de "ya cargué" para que un control que emite al montar no pise
   lo guardado (memoria "Vuetify mount-emit").
3. `app/composables/useInfiniteFeed.ts` — el estado de la ventana de un directorio. Recibe
   getters (`items` de la página que pintó el servidor, `page`, `pageCount`, `perPage`,
   `resetKey` = filtros sin la página, `fetchPage(page, signal)`, `enabled`, `goToPage`,
   `anchorId`) y devuelve un objeto reactivo con `items` (la ventana en modo scroll; los mismos
   avisos de la página en modo páginas), los espaciadores, el estado y las acciones.
4. `app/components/feed/Edge.vue` (`<FeedEdge>`) y `app/components/feed/Controls.vue`
   (`<FeedControls>`): el borde de la ventana (marca + espaciador + "Ver resultados anteriores"; con
   `tag="tr"`/`"li"` para tablas y listas) y el pie (la paginación de siempre por slot, o el estado
   de la carga, más el interruptor).
5. Cableado en cada directorio: la grilla conserva su `v-for` (sobre `feed.items`) y su clase, con
   un `<FeedEdge>` justo antes y otro justo después de los avisos, y su paginación pasa al slot
   `pagination` de `<FeedControls>`.

**Por qué no un componente que envuelva la lista:** los estilos `scoped` de cada página no
llegarían a una grilla rendida dentro de otro componente (sólo la RAÍZ de un hijo lleva el `scope`
del padre). Con el composable la grilla sigue siendo de la página y ningún CSS cambia.

**Orden de declaración:** en una navegación dentro del sitio el composable llama a sus getters en
el mismo `setup`, así que se declara después de todo lo que leen (en oportunidades inmobiliarias y
en mercado IT el `const` de abajo reventaba con "Cannot access before initialization").

### Ventana y memoria

- Techo de la ventana: `max(3, ceil(96 / perPage))` páginas, pero lo que pide la ventana son las
  páginas a menos de 1.600 px del viewport: en la práctica hay 2 (alquileres en el teléfono: una
  página de 24 mide ~12.000 px, la ventana queda en 24–48 tarjetas).
- Alto de cada página medido en vivo: `top(primer ítem de p+1) − top(primer ítem de p)`; la última,
  `bottom(último) − top(primero) + gap + margin-bottom del último` (las filas-tarjeta de una tabla
  `cu-mobile-cards` se separan con margen, no con `gap`).
- Si el viewport queda lejos más allá de todo lo conocido (leyendo lo que va después de la lista, o
  esperando la página siguiente), la ventana se queda SÓLO con la página del borde. Conservar "las
  últimas N" volvía a meter páginas viejas arriba mientras se esperaba la nueva (medido en
  alquileres a 390 px: la ventana [3] saltaba a [1–3]).
- Espaciador superior = suma de altos de las páginas sacadas arriba − `gap` (el espaciador es un
  ítem de grilla de ancho completo y agrega su propio `gap`). Lo mismo abajo cuando, al subir, la
  ventana suelta páginas de abajo.
- Una página EN pantalla nunca se saca, aunque supere el techo (`feedPagesOnScreen`).
- Después de cada cambio de la ventana se mide un ancla visible; si se movió (cambió el ancho y con
  él las columnas, o cambió el contenido) se corrige con `scrollBy` instantáneo. Los bordes llevan
  `overflow-anchor: none` para que el navegador no los elija como ancla.
- Medido en el navegador (autos y alquileres, escritorio y 390 px, bajando y subiendo de a 600 px):
  deriva 0 px y ningún `scrollBy` de corrección. La única deriva que apareció fue un defecto de la
  tarjeta de autos, no del scroll: con `align-items: start` heredado de la fila, la foto diferida
  medía 0 px de ancho hasta cargar y una página de 24 pasaba de 2.200 a 3.400 px después de
  pintada. Arreglado en `components/cars/ListingCard.vue` (`align-items: stretch`), que además
  saca ese salto de layout del modo páginas.
- Datos de páginas fuera de la ventana: LRU de `2 × ventana` páginas; más allá se vuelven a pedir.
- Disparo: un `scroll`/`resize` pasivo con `requestAnimationFrame` (sólo lecturas de `rect`) y
  después de cada pedido o render.
- Arrancando en `?page=N>1`, las páginas anteriores nunca cargadas no se piden solas (moverían lo
  que se está mirando): botón "Ver resultados anteriores" arriba.

### Lo que encontró la revisión (y quedó arreglado)

- Un cambio de ruta que no toca los filtros (un clic en `#cobertura`) dejaba la lista esperando
  avisos que no llegaban: el `watch` armaba un arreglo nuevo en cada lectura. Ahora mira la clave y
  la página por separado y sólo espera si cambiaron.
- Un pedido caído al volver a subir se reintentaba en cada cuadro. Con error, la ventana no se
  mueve hasta "Reintentar".
- En una grilla de 5 o 7 columnas la página termina a mitad de fila; al salir la de arriba, las
  tarjetas de la siguiente cambiaban de columna. Cada página arranca en la columna 1
  (`grid-column-start`, sólo en modo scroll). Medido a 2.400 px (alquileres, 5 columnas): deriva 0
  vertical y 0 horizontal.
- Avisos repetidos entre páginas pedidas en momentos distintos (los catálogos se reordenan cada
  hora): la página que llega suelta los que ya están en la ventana (`itemKey`).
- Una lista vacía mientras se refresca no vacía la página de arranque, y un "llegaste al final"
  provisorio (mercado IT pide sólo en el cliente) se corrige cuando llegan los datos.
- La paginación vuelve a mostrarse con sus condiciones de siempre.

### Volver desde una ficha

Caché en memoria del cliente por `feedId` (una entrada, 30 min): `resetKey`, página de arranque,
datos de la ventana, altos conocidos, contador de pausa. Al montar por navegación del historial
(`popstate` reciente) con el mismo `resetKey` y la misma página de arranque, la ventana se arma
sincrónicamente en el `setup`, así el `savedPosition` del router de Nuxt aterriza donde estaba.

### Modo y controles

- Al pie de la lista, en los dos modos: interruptor "Cargar más al bajar". En modo páginas va
  debajo de la paginación; en modo scroll reemplaza a la paginación junto con el estado ("Viendo la
  página N de M", "Cargando…", error con "Reintentar", "Cargar más" en la pausa, "Llegaste al
  final") y un "Volver arriba" (suelta todo lo cargado y vuelve a la página de arranque).
- Apagar el interruptor parado en la página 6 navega a `?page=6` (la paginación sigue donde se
  estaba mirando).
- Estado anunciado con `aria-live="polite"`.
- Evento GA4 `list_mode` (`feed`, `mode`) al cambiar el interruptor.

## Decisiones del builder (mi criterio, para revisar)

- **Por defecto: paginación.** El pedido dice "la opción"; el comportamiento actual, los e2e y la
  medición quedan intactos, y el interruptor aparece justo donde se termina la primera página,
  que es el momento en que alguien quiere seguir. Cambiar el defecto es una línea
  (`DEFAULT_LIST_MODE`).
- Pausa cada ~120 avisos nuevos (`max(3, ceil(120 / perPage))` páginas).
- Ventana de ~96 avisos.

## Inventario de directorios (recorrido del código, 2026-10-28)

Con paginación y filtros, todos paginados en el servidor (`?page`, salvo mercado IT que usa `?p`):

| Directorio | Archivo | Por página | Lista |
|---|---|---|---|
| /alquileres-uruguay | `pages/alquileres-uruguay.vue` | 24 | grilla de `article.rental-card` (mosaico/filas) |
| /autos-usados-uruguay | `pages/autos-usados-uruguay/index.vue` | 24 | grilla de `CarsListingCard` |
| /motos-usadas-uruguay | `pages/motos-usadas-uruguay/index.vue` | 30 | filas de `VTable` (`cu-mobile-cards`) |
| /oportunidades-autos-usados-uruguay | `pages/oportunidades-autos-usados-uruguay.vue` | 20 | columna de `CarsOpportunityCard` |
| /autos-chocados-y-con-deuda-uruguay | `pages/autos-chocados-y-con-deuda-uruguay.vue` | 20 | columna de `CarsRiskCard` |
| /equipar-casa-uruguay/productos(/…), /monopatines-…, /bicicletas-… | `components/equipar/Directorio.vue` | 24 | grilla de `EquiparListingCard` |
| /venta-viviendas-uruguay | `components/property-sales/Directory.vue` | 24 | grilla de `PropertySalesListingCard` |
| /oportunidades-inmobiliarias-uruguay | `pages/oportunidades-inmobiliarias-uruguay.vue` | 24 | lista de `OpportunityCard` |
| … `?mode=budget` | `components/rentals/BudgetRentals.vue` | 24 | lista de `article.budget-card` |
| /mercado-it-uruguay | `components/mercadoIt/SearchPanel.vue` | 20 | lista de `ResultCard` (sólo cliente) |
| /vivir-con-el-salario-minimo-uruguay | `pages/vivir-con-el-salario-minimo-uruguay.vue` | 24 | `li.smn-aviso` |
| /inmobiliarias-uruguay | `pages/inmobiliarias-uruguay/index.vue` | 24 | lista de `AgenciesAgencyCard` |

Fuera de alcance, con su motivo:

- `/sillas-escritorio-uruguay/precios` y las listas "ver más" (descuentos, fletes, barrios): no
  paginan; ya cargan de a tandas en el cliente con todo el catálogo en memoria.
- `/newsletter/archivo`: paginado pero sin filtros, y rechaza el scroll infinito a propósito
  (comentario en el archivo, por rastreo).
- `/celulares-uruguay`: filtros sin paginación. Las páginas por barrio y "hasta N dólares":
  listas fijas de 6 y 12.
- Las tablas `VDataTable` con pie propio (histórico, sucursales): paginación cliente de una tabla,
  otra cosa.

Ninguna pieza existente sirve: no hay `VInfiniteScroll` registrado (y `componentResolution.test.ts`
falla si se usa sin registrar), `@vueuse/core` no es dependencia directa y no hay `router.options.ts`
(rige el `scrollBehavior` por defecto de Nuxt, que restaura `savedPosition` al volver).

### Cableado

En vez de un componente que envuelva la lista (sus estilos `scoped` no llegarían a la grilla, que
quedaría dentro de otro componente), cada directorio conserva su grilla y su `v-for`:

```vue
<div ref="resultsList" class="cars-grid">
  <FeedEdge :feed="feed" edge="top" />
  <CarsListingCard v-for="car in feed.items" :key="car.key" :car="car" />
  <FeedEdge :feed="feed" edge="bottom" />
</div>
<FeedControls :feed="feed">
  <template #pagination><VPagination … /></template>
</FeedControls>
```

`FeedEdge` lleva `order: -10` (arriba) porque alquileres reordena con `order` el primer aviso en el
teléfono; en alquileres ese "primer aviso" pasa a ser el primero de la PRIMERA página conocida
(clase en vez de `:first-of-type`), así la fila de atajos no salta de tarjeta en cada página que
entra. Para tablas (`motos`), `FeedEdge` admite `tag="tr"` con `colspan`.
