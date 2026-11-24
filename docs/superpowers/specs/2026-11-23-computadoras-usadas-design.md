# Computadoras usadas: el directorio y lo que cuesta armarla

Fecha: 2026-11-23. Pedido del dueño: «una sub app de directorio de computadoras usadas evaluando en
comparación los precios de los componentes y cuánto costaría armarla. Enriquecer la información lo
más posible. Obtener la información de Facebook Marketplace. Desconozco si hay otro lugar donde
publiquen computadoras usadas».

## Por qué

Quien mira una PC usada en Uruguay no tiene contra qué compararla: el aviso dice «PC gamer i5 +
GTX 1060 $ 23.900» y nadie sabe si eso es mucho. La respuesta existe en el mismo mercado: cuánto
salen hoy esas piezas nuevas, cuánto salen esas piezas usadas sueltas y cuánto piden por PCs
iguales. Nadie lo junta.

## Medido antes de diseñar (23/11/2026)

**Facebook Marketplace** (Chrome del perfil, `readMarketplaceSearches`, 12 búsquedas + 2
categorías desde Montevideo): 254 tarjetas únicas. Facebook estaba entregando sólo la primera
página (24 tarjetas por lista: 14 listas, 12 frenadas). Mezcla tres cosas: computadoras completas,
**piezas sueltas usadas** («RTX 3080 10GB $ 23.000», «I7 4790 (Socket 1150) $ 2.000», «RAM SK Hynix
8GB DDR4») y lo que no es (televisores, PS5, tablets, cargadores). El 77 % de la ubicación es
Montevideo, el resto Canelones y algo del interior.

La **ficha** (13 leídas) trae la descripción, y ahí están las especificaciones, casi siempre en
líneas rotuladas («Procesador: Ryzen 7 5700G / Gráfica: RTX 2060 Strix 6GB / Memoria RAM: 16GB
3200MHz / Almacenamiento: M.2 NV3 1TB / Fuente: 750W»). Además `attribute_data`: estado
(`used_like_new`, `used_good`, `new`…), y a veces marca, línea y sistema operativo. Cada ficha
tarda entre 15 y 40 s.

La **moneda** de la tarjeta es «UYU» por defecto: «PC Gamer Ryzen 5 5600 | RTX 4060 8GB | 8GB RAM
| SSD 1TB NVMe — $ 950» son dólares. El precio 0 o 1 es «consultar».

**Mercado Libre** (puente `:9656`), usados con `condition=used`: 298 PCs de escritorio (MLU1649),
~1.000 notebooks (MLU1652, el puente corta en 1.000), 50 mini PC (MLU407379), 33 iMac (MLU443594).
Dos tercios en pesos. El título trae especificaciones mucho más seguido que en Facebook («Pc Gamer
I5 9400f, 16gb Ram Ddr4, Gtx 1050ti 4gb, Ssd 480gb»). **La ficha de un usado no se puede leer**:
el puente sólo atiende fichas de catálogo (`/product/` → 404 «listing ids are not supported») y
`articulo.mercadolibre.com.uy` redirige (302) al muro de login. De ML va sólo el título.

**Componentes nuevos en Mercado Libre**, categorías limpias: procesador MLU1693, placa de video
MLU1658, RAM MLU1694 (notebook MLU3582), discos MLU1672, mother MLU1692, fuente MLU1695, gabinete
MLU1696. Casi todo en dólares. Un componente usado también aparece ahí (`condition=used`).

Otros lugares donde se publica: el pedido no los conocía. Mercado Libre es el grande (arriba). Una
búsqueda de clasificados y tiendas de componentes uruguayas quedó encargada a un agente aparte; lo
que traiga se agrega como fuente sólo si tiene un contrato legible (ver «Lo que queda»).

## Objetivos

1. **Directorio** `/computadoras-usadas-uruguay`: un aviso por tarjeta (foto, precio, qué es, las
   especificaciones leídas) de Facebook Marketplace y Mercado Libre, con filtros (tipo, marca y
   familia del procesador, placa de video, RAM mínima, almacenamiento SSD, precio, departamento,
   fuente, «sin fallas declaradas», «pide menos que sus piezas») y órdenes.
2. **Lo que cuesta armarla**, por aviso de PC de escritorio: cada pieza identificada con su precio
   NUEVO de hoy en Uruguay (mediana de Mercado Libre, con la oferta más barata enlazada) y su precio
   USADO de hoy (mediana de las piezas sueltas usadas de Facebook y ML). Dos totales:
   «armarla con piezas nuevas» y «juntar las mismas piezas usadas», cada uno sólo si TODAS las
   piezas tienen precio; si no, el parcial con lo que falta, nunca un total que baja por faltarle
   ítems (la lección de la canasta emparejada de PRECIOS.md).
3. **Notebooks, all-in-one, Mac y mini PC** no se arman: se comparan contra los usados iguales
   (mismo procesador y RAM) y contra la misma máquina nueva (notebooks nuevas con el mismo
   procesador en ML).
4. **Piezas sueltas usadas** (placa de video, procesador, RAM, disco, mother, fuente) entran al
   directorio con su propio tipo y se comparan contra la misma pieza nueva y usada.
5. **`/precios-componentes-pc-uruguay`**: la tabla de precios de hoy por componente (nuevo y usado,
   cuántas ofertas, la más barata) y cuánto sale armar hoy unas PCs tipo (oficina, gamer de entrada,
   gamer media) con esas mismas medianas.
6. **Ficha propia de cada aviso** `/computadoras-usadas-uruguay/aviso/<slug>` (noindex, como autos
   y motos): las especificaciones con su origen (título, descripción, Facebook), el desglose pieza
   por pieza, el veredicto y los parecidos.
7. **Enriquecer lo más posible sin inventar**: año de lanzamiento aproximado de procesador y placa
   (por serie), socket y tipo de RAM deducidos del procesador, estado declarado por Facebook, fallas
   declaradas en el texto («no enciende», «para repuesto»), si trae monitor/teclado/mouse.

## No objetivos / anti-objetivos

- **Puntajes de rendimiento** (benchmarks numéricos) no van en v1: ningún dato abierto con licencia
  clara quedó verificado. Lo que se publica de cada pieza es identidad, precio y año aproximado.
- **Contactos del vendedor**: nunca. El nombre del vendedor de Facebook tampoco (es una persona).
- **La descripción de Facebook no se publica**: se publica lo que se leyó de ella (las piezas), no
  el texto. Va a una colección privada.
- Anti-objetivo: un «armarla nueva sale US$ 400» calculado sobre la mitad de las piezas, o una
  pieza que se valúa por otra parecida («i7» sin modelo valuado como un i7-12700). Una pieza sin
  identidad exacta queda «sin precio» y lo dice.
- Anti-objetivo: un precio en pesos de Facebook que en realidad es en dólares, tratado como pesos.
  La moneda deducida se marca y no entra en ningún veredicto ni comparación.

## Enfoques considerados

1. **Otro consumidor del registro inyectable de equipar** (`CategorySpec` + bandas). Rechazado: el
   registro agrupa por categoría y variante con bandas p25/mediana/p75, y acá la unidad es una
   MÁQUINA con cinco a ocho piezas, cada una con su identidad. Un «PC gamer» como categoría con
   bandas dice poco; lo que el pedido quiere es el desglose.
2. **Módulo propio `classes/computadoras/` que reusa las cañerías** (elegido): el lector de
   Marketplace (`classes/facebook/`: búsquedas, candado, ficha), el puente de ML, `fetchUsdUyuRate`,
   el patrón de catálogo público + meta + colección privada de motos/armadores. Lo nuevo es el
   lector de especificaciones, la tabla de precios por pieza y la valuación.
3. **Extraer especificaciones con un LLM** (créditos de Claude). Postergado: las descripciones
   rotuladas se leen bien con reglas, que son verificables con tests sobre textos reales y no
   cuestan nada por corrida. Queda como mejora si la cobertura medida no alcanza.

## Lectura de especificaciones (`classes/computadoras/specs/`)

Todo sobre el texto normalizado (minúsculas, sin acentos). Orden de evidencia: título, después la
descripción de la ficha; el título gana cuando los dos dicen algo distinto de la misma pieza.

- **Tipo**: `notebook`, `desktop`, `all-in-one`, `mini-pc`, o una pieza (`gpu`, `cpu`, `ram`,
  `storage`, `motherboard`, `psu`, `combo` = mother+procesador). La categoría de ML decide cuando
  existe; en Facebook, palabras del título (y de la descripción sólo para desempatar). Se rechaza
  lo que no es (monitor solo, televisor, consola, celular, tablet, impresora, cargador, teclado,
  repuesto de notebook, lote).
- **Procesador**: marca, familia (Core i3/i5/i7/i9, Core Ultra 5/7/9, Ryzen 3/5/7/9, Celeron,
  Pentium, Xeon, FX, Athlon, A-series, Apple M1–M5 con Pro/Max), modelo («12400F», «5600X») y de ahí
  generación, socket, tipo de RAM, si es de notebook (sufijo U/H/HS/HX/P) y año aproximado. «i5 10ma
  generación» da familia + generación sin modelo.
- **Placa de video**: NVIDIA GTX/RTX/GT/MX/Quadro, AMD RX, Intel Arc, con Ti/Super/XT y VRAM; o
  integrada (Vega, Iris Xe, UHD). También «2070rtx», «rtx3060ti».
- **RAM**: GB totales y DDR3/4/5. **Almacenamiento**: cada disco con tipo (NVMe, SSD, HDD) y
  capacidad. **Fuente**: watts. **Mother**: chipset (B450, A520, H610…). **Pantalla** (notebook).
- **Lo que trae**: monitor (y pulgadas), teclado/mouse. **Fallas declaradas**: no enciende, no da
  video, para repuesto, pantalla rota, sin disco, bloqueada, batería… (la cita queda privada).

## Precios por pieza (`classes/computadoras/parts/`)

Identidad de pieza: `cpu:<modelo>`, `gpu:<modelo+variante+vram>`, `ram:<ddr>:<gb>`,
`storage:<tipo>:<tramo>`, `motherboard:<chipset>`, `psu:<tramo de watts>`, `case:basico`.

- **Nuevo**: búsquedas de ML por categoría de pieza. Fijas para RAM, discos, fuentes, mothers por
  chipset y gabinetes; dinámicas para procesadores y placas de video: los modelos que aparecen en
  los avisos del directorio, los más frecuentes primero, con tope por corrida. Un aviso de ML entra
  a la mediana de una identidad sólo si su título lee EXACTAMENTE esa pieza y nada más (sin «kit»,
  «combo», «+», PC armada) y es nuevo. Se publica con ≥ 3 ofertas de ≥ 2 vendedores.
- **Usado**: las piezas sueltas del directorio (Facebook + ML usados), más búsquedas de ML usados
  para procesadores y placas. Mismas reglas de identidad. ≥ 3 avisos para publicar mediana.
- Todo en dólares (la mayoría de las tiendas de informática cotiza en dólares); un precio en pesos
  se convierte con la cotización del día (`fetchUsdUyuRate`). Una pieza fuera de banda contra su
  propia identidad (< mediana/3 o > mediana×3) se descarta.

## Valuación (`classes/computadoras/valuation.ts`)

PC de escritorio: procesador, placa de video (si es dedicada), RAM, cada disco, mother, fuente y
gabinete. Las tres últimas casi nunca se declaran: la mother sale del chipset declarado o, si no,
de la más barata del socket del procesador (cuartil bajo); la fuente del tramo declarado o, si no,
de uno estimado por la placa de video; el gabinete del cuartil bajo de los nuevos. Esas tres llevan
`basis: "estimada"` y la página lo dice.

- `newTotalUsd` = suma de precios nuevos, sólo si todas las piezas tienen precio nuevo.
- `usedTotalUsd` = suma de medianas usadas, sólo si todas las tienen.
- Sin total completo, las piezas con precio y la lista de lo que falta.
- **Veredicto** (`verdict`): contra las piezas usadas si ese total existe, si no contra las nuevas.
  `muy-por-debajo` (< 60 %), `por-debajo` (60–90 %), `parejo` (90–110 %), `por-encima` (> 110 %).
  Nunca con moneda deducida ni con fallas declaradas.
- **Comparables**: mediana de los usados con el mismo procesador (modelo) y la misma placa (o
  integrada), n ≥ 4; si no, mismo procesador; nunca con moneda deducida.
- Notebook/all-in-one/mini/Mac: comparables iguales (procesador + RAM), y «nueva con el mismo
  procesador» (mediana de notebooks nuevas de ML que leen ese modelo, n ≥ 3).
- Pieza suelta: contra su misma identidad nueva y usada.

## Fuentes y corridas

- `currency-computadoras` (diaria): Marketplace con todas las búsquedas (≈ 30 listas: palabras,
  bandas de precio de «pc gamer» y «notebook», la categoría de informática), ML usados entero, las
  búsquedas de piezas nuevas y usadas, fichas de Facebook con presupuesto, y publicación.
- `currency-computadoras-hourly` (`--fast`): un tramo rotativo de búsquedas de Marketplace ordenadas
  por más nuevas, fichas de Facebook con presupuesto de tiempo, y republicación sobre lo guardado.
  **Nunca retira por ausencia**: un aviso sale cuando no se lo vio en `freshDays` (4) días.
- Minutos: diaria 17:17 UTC (fuera de los horarios del puente), horaria :03 (ningún consumidor del
  puente ni de Facebook usa ese minuto).
- Guardas: sin cotización del dólar no corre; Facebook ocupado o sin sesión conserva lo anterior;
  una corrida que publicaría menos del 40 % de lo publicado no pisa nada.

## Datos (APP DB)

- `computerlistings` (privada): un documento por aviso visto, con lo crudo (título, precio, moneda,
  ubicación, foto, primera y última vez visto).
- `computerfbdetails` (privada): descripción y atributos de la ficha de Facebook.
- `computercatalog` (pública): la fila armada campo por campo — especificaciones, valuación,
  comparables, sin descripción ni vendedor.
- `computerparts` (pública): una fila por identidad de pieza con mediana nueva/usada, n, vendedores,
  la oferta nueva más barata, y un historial diario de la mediana.
- `computermetas` (pública): la corrida (fecha, cobertura por fuente, `freshDays`, cotización).

## App

- `pages/computadoras-usadas-uruguay/index.vue` (directorio, con el layout de autos/motos),
  `aviso/[slug].vue`, `pages/precios-componentes-pc-uruguay.vue`.
- `server/api/computadoras/{index,aviso/[slug],componentes}.get.ts`, `utils/computadoras.ts`,
  `components/computadoras/*`.
- Registro en siteNav, directorios, sitemap, anuncios, contrato SEO, robots (la ficha del aviso
  noindex) y una fila en `docs/seo/experiments.json` para las dos rutas nuevas.

## Lo que queda al constructor

Textos, detalle visual (siguiendo motos), nombres internos, el tope exacto de búsquedas de piezas.
Tiendas uruguayas de componentes: si alguna tiene un catálogo legible por los adaptadores de
`classes/retail/`, se suma a «nuevo» con su propia fila de fuente; si no, sólo ML.
