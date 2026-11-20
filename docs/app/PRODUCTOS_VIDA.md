# Productos que te cambian la vida (`/productos-que-te-cambian-la-vida-uruguay`)

Lo que r/uruguay contestó en el hilo «¿Qué producto les cambió la vida?» (publicado el
19/11/2026), producto por producto: cuántas personas lo nombraron, por qué (parafraseado, sin
usuarios ni citas), qué conviene mirar antes de comprarlo y, al lado, cuánto sale hoy nuevo en
Mercado Libre Uruguay por variante. Job: `currency-productos-vida` (`sync_productos_vida.ts`).
Página: `app/pages/productos-que-te-cambian-la-vida-uruguay/index.vue`.

## Un tercer consumidor del registro de equipar

`classes/productosvida/registry.ts` declara 26 categorías con la forma de
`classes/equipar/registry.ts` (`EquiparCategory[]`). Igual que `classes/movilidad/`, no es un fork:
el job inyecta ese arreglo en las mismas funciones que usan equipar y movilidad
(`specsFor`, `buildEquiparCatalog`, `buildEquiparListings`, `uncoveredCategories`, todas con
`registry` opcional) y reutiliza sin copiar los dos regímenes (`modelo`/`commodity`), las
variantes, el cribado por condición (`screen()`), la separación nuevo/usado y el historial diario
(`withHistory` de `classes/equipar/store.ts`).

Lo que lo distingue:

- **Sólo Mercado Libre.** Todas las categorías declaran `storeQueries: []` y `fbQueries: []`, y el
  job pasa `stores: []` y `maxFbQueries: 0`: el cosechador compartido ni siquiera abre Marketplace.
  Sin pricewatch (no hay `PriceHistoryVertical` nuevo), sin foto de tiendas, sin ficha técnica.
- **Sala propia.** `room: "productos-vida"` (agregado a `EquiparRoom`), `tier: "B"` y el mismo
  `reason` en todas. `classes/equipar/basket.ts` sólo itera `EQUIPAR_CATEGORIES`, así que nada de
  acá puede llegar a la canasta de `/equipar-casa-uruguay`.
- **Colecciones propias.** Dos claves coinciden con equipar a propósito (`secarropas` y
  `deshumidificador`, porque la clave es también el ancla de la página y el slug del app), pero son
  dos definiciones distintas en dos colecciones distintas: una nunca toca las filas de la otra.
- **El registro importa una sola cosa**, `import type { EquiparCategory } from "../equipar/types"`:
  el CI del app lo carga (`app/tests/unit/productosVidaParity.test.ts`) y no tiene las
  dependencias de la raíz. La ventana del puente (`productosVidaBridgeWindowOpen`) vive en el
  mismo archivo y es pura.

## El hilo y cómo se contó

Se leyó entero el 20/11/2026, con 81 comentarios según el contador de Reddit. La regla, una sola y
escrita antes de contar: una persona cuenta **una vez por producto** cuando dice que lo tiene o lo
usa y que le mejoró la vida, o cuando lo pone en su propia lista. Eso incluye a quien abrió el
hilo, en el post y en las respuestas donde dice que tiene uno. No cuentan las preguntas, los deseos
(lo que alguien piensa comprar), lo que a alguien no le gusta, los productos para adultos ni un
remedio sin evidencia.

El contador muestra **personas**, no comentarios («Lo nombraron 4 personas»), porque eso es lo que
se contó. A igual cantidad, el orden es por nombre: neutro y verificable. El texto editorial (cuántas
personas, por qué, qué mirar, la lista sin precio) vive en `app/utils/productosVidaCatalog.ts`, y
nunca lleva un usuario de Reddit, una cita textual, un monto en pesos ni un porcentaje sacado de un
comentario (`app/tests/unit/productosVidaCatalog.test.ts`).

## Categorías y variantes

El orden del registro es el del hilo (menciones de mayor a menor, después por nombre), y es también
el orden del presupuesto: `planScans` intercala por rondas, así que una corrida cortada pierde
segundas búsquedas antes que un producto entero. `*` marca la variante de respaldo; `r` es el
`rank` (1 = la más chica o barata).

| # | clave | nombre | régimen | usado ok | búsquedas | variantes |
|---|---|---|---|---|---|---|
| 1 | `calientacama` | Calientacama | modelo | no | calientacama, manta electrica | manta r3 (por encima, tipo frazada; también un título que abre con «frazada»; con correas o elásticos es bajo la sábana); una-plaza r1 (salvo que diga 2 plazas); dos-plazas* r2 |
| 2 | `lavavajillas` | Lavavajillas | modelo | sí | lavavajillas, lavavajillas compacto | compacto r1 (hasta 9 servicios, también escritos «sets», «cub.» o «personas», o «de mesa»; 10 o más declarados le ganan a la palabra «compacto»); estandar* r2 |
| 3 | `secarropas` | Secarropas | modelo | sí | secarropas, secarropas carga frontal | bolsa r1 (portátil de aire caliente); centrifugo r2; tambor* r3 |
| 4 | `aspiradora-robot` | Aspiradora robot | modelo | sí | aspiradora robot | trapea r2 (también «limpieza en húmedo»); aspira* r1 |
| 5 | `freidora-de-aire` | Freidora de aire | modelo | sí | freidora de aire | grande r3 (8 L o más, doble canasto; «horno freidora» sólo si no declara menos de 8 L); chica r1 (hasta 4,5 L); mediana* r2 |
| 6 | `cortadora-barba` | Cortadora de barba y pelo | modelo | no | cortadora de barba, afeitadora electrica | recortadora* r1 (también la «Vintage T9», se llame como se llame); afeitadora r2 |
| 7 | `deshumidificador` | Deshumidificador | modelo | sí | deshumidificador | compresor* r2 (10 L/día o más, pintas o 1000+ pies²); mini r1 (USB, menos de 3 L, 100–999 pies², tanque en onzas); un título que no dice ninguna de las dos cosas no cuenta |
| 8 | `freezer` | Freezer | modelo | sí | freezer horizontal | chico r1 (horizontal, hasta 120 L); grande r3 (horizontal, más de 250 L); mediano* r2 (horizontal, 121 a 250 L); un vertical no cuenta |
| 9 | `panificadora` | Panificadora | modelo | sí | panificadora, maquina de hacer pan | estandar* r1 |
| 10 | `recortadora-nariz` | Recortadora de nariz | commodity | no | recortadora nariz | estandar* r1 |
| 11 | `tuppers-vidrio` | Tuppers de vidrio | commodity | no | tupper vidrio hermetico | set r2 (3 o más; una medida «14,5 X 10,5» no es un pack); unidad* r1; un par no cuenta |
| 12 | `almohada-viscoelastica` | Almohada viscoelástica | modelo | no | almohada viscoelastica | par r2; unidad* r1 |
| 13 | `arrancador-bateria` | Arrancador de batería portátil | commodity | no | arrancador de bateria portatil | compresor r2; solo* r1 |
| 14 | `auriculares-inalambricos` | Auriculares inalámbricos | modelo | no | auriculares inalambricos | vincha r2 (nunca si dice TWS, true wireless o buds); inear* r1 (sin vincha: in-ear u open-ear) |
| 15 | `bicicleta` | Bicicleta | commodity | sí | bicicleta rodado 29, bicicleta urbana | urbana r1 (también con canasto; salvo que el título diga montaña, mtb o mountain); montana* r2 |
| 16 | `deshidratador` | Deshidratador de alimentos | commodity | sí | deshidratador de alimentos | grande r2 (8 bandejas o más); hogar* r1 |
| 17 | `espumador-de-leche` | Espumador de leche | commodity | no | espumador de leche | electrico r2 (jarra que calienta); mano* r1 |
| 18 | `frigobar` | Frigobar | modelo | sí | frigobar | estandar* r1 |
| 19 | `kindle` | Kindle | modelo | sí | kindle | premium r3; paperwhite r2; basico* r1 |
| 20 | `lavasecarropas` | Lavasecarropas | modelo | sí | lavasecarropas | torre r2; combinado* r1 |
| 21 | `monitor` | Monitor extra | modelo | sí | monitor 24 pulgadas | gamer r2 (22 a 25 pulgadas, 120 Hz o más; un Hz declarado por debajo de 120 le gana a la palabra «gamer»); oficina* r1 (22 a 25 pulgadas, hasta 100 Hz) |
| 22 | `perfume-arabe` | Perfume árabe | modelo | no | perfume arabe | chico r1 (hasta 60 ml); grande r3 (150 ml o más); estandar* r2 |
| 23 | `pesa-rusa` | Pesa rusa | commodity | sí | pesa rusa | liviana r1 (hasta 8 kg o 17 lb); pesada r3 (16 kg o 35 lb o más); media* r2; sin peso declarado, o un set de mancuernas, no cuenta |
| 24 | `robot-de-cocina` | Robot de cocina | modelo | sí | robot de cocina, robot de cocina multifuncion | estandar* r1 (el que cocina) |
| 25 | `sarten-acero-inoxidable` | Sartén de acero inoxidable | modelo | no | sarten acero inoxidable | chica r1 (hasta 22 cm); grande r3 (27 cm o más); mediana* r2 |
| 26 | `ventilador-industrial` | Ventilador industrial | commodity | sí | ventilador industrial | grande r3 (60 cm o más); chico r1 (hasta 45 cm); mediano* r2; sin diámetro declarado no cuenta |

33 búsquedas en total (26 primeras y 7 segundas). La primera búsqueda de cada categoría es también
el enlace «Buscar … en Mercado Libre» de la página (paridad en
`app/tests/unit/productosVidaParity.test.ts`).

Reglas del registro, todas con test (`tests/productosvida/registry.test.ts`):

- **Claves sin dígitos**, de categoría y de variante (el escáner de secretos marca un campo `key`
  con dígitos, y renombrarlo después no alcanza: el commit viejo sigue en el rango). Por eso la
  sartén es `chica/mediana/grande` y no 20/24/28, y el calientacama `una-plaza/dos-plazas`.
- **Cada regex corre sobre `norm()`** (`classes/equipar/classify.ts`): minúsculas, sin acentos y
  todo lo que no sea `[a-z0-9%"'\s.,+-]` cambiado por un espacio. Una alternativa con «ñ», «¨» o
  «/» no coincide nunca: «piñon» se escribe `pinon`, «18/10» se escribe `18 10` y «lt/día» `lt dia`.
  Ningún regex lleva la bandera `g` ni `y` (guardan `lastIndex` entre títulos).
- **Títulos reales, ninguno inventado.** El test lee `tests/productosvida/fixtures/ml_sample.json`:
  los 50 resultados reales de cada búsqueda, tomados por el puente la noche del 19/11/2026, sólo
  `[título, precio, moneda, condición]`. Para cada categoría hay títulos aceptados con su variante,
  rechazados donde la muestra los tiene, y el aviso nuevo **más barato** que la categoría acepta,
  leído a ojo: es lo que encabeza «los más baratos», así que tiene que ser una unidad real y no un
  repuesto o un recambio. La muestra se tomó antes de fijar la búsqueda de tuppers: en los tests la
  reemplaza la búsqueda real más parecida («contenedores de vidrio hermeticos»).

Los rechazos que importan, todos medidos en la muestra: el detergente se llama «lavavajillas» (la
búsqueda «pastillas lavavajillas» entera queda afuera), un chal o un poncho se llaman «manta
eléctrica», una funda se llama «Kindle», un frasco se llama «recipiente de vidrio», la batidora
planetaria se vende como «robot de cocina», los «deshidratadores» de 3 litros son centrifugadores de
ensalada y la sartén «de acero inoxidable» con revestimiento antiadherente es el otro producto (el
punto del hilo es la sartén sin revestimiento).

### Lo que trajo la primera corrida real (20/11/2026)

La muestra de 50 por búsqueda no alcanzó. La primera corrida real (`--dry-run`, 07:13 UTC, 62
páginas, 1 986 avisos aceptados) trajo lo que la muestra no tenía, y como la página publica los avisos
**más baratos** de cada variante, un ítem equivocado al fondo del rango es el defecto más visible que
puede tener. Con el registro corregido, 44 de esos 1 986 avisos se descartan y 34 cambian de
variante; ninguna regla es un piso de precio y ningún `include` se aflojó.

- **No era el producto:** una caja secadora de audífonos, un pote de sales de 500 ml y unas perchas
  desecantes llamados «deshumidificador»; un mueble de madera llamado «mini bar»; un medidor y una
  correa de repuesto **para** panificadora (la pieza se nombra por la máquina a la que va, detrás de
  «para» o abriendo el título); un set de mancuernas ajustables que nombra la pesa rusa; un freezer
  vertical en filas que dicen «horizontal»; un wok y una sartén de acero al carbono «color acero
  inoxidable»; el robot que sólo trapea (Braava); un espumador de émbolo; una heladera de 12/24 V; un
  set de cortapelo y cortabarba en la fila de nariz; una recortadora de ingle; una máquina de cupcakes.
- **Era el producto, en otra variante:** un lavavajillas de 6 «sets» en «estándar», un horno freidora
  de 5 L en «grande», la recortadora Vintage T9 titulada «afeitadora», un tupper suelto leído como
  pack por su medida («14,5 X 10,5»), unos auriculares TWS por la palabra «headphones», 14 monitores
  «gamer» de 75 a 100 Hz bajo «120 Hz o más», una pesa de 15 libras bajo «10 a 14 kg».
- **No se puede ubicar:** un ventilador sin diámetro (cuatro de los seis más baratos de «46 a 59 cm»,
  y uno es el mismo que otro vendedor publica con «42 Cm») y un deshumidificador sin capacidad ni señal
  de mini (los dos más baratos de «de compresor», entre el Peltier más caro y el compresor declarado
  más barato) ya no cuentan, con la misma regla que la pesa rusa sin peso. Un par de tuppers tampoco:
  «Set» dice 3 o más.

Cada título está en `tests/productosvida/fixtures/ml_dryrun.json` (la corrida entera, sin ids,
vendedores ni enlaces) y en `REAL_FIXTURES` de `tests/productosvida/registry.test.ts`, al lado de las
unidades reales vecinas de cada regla, y `REAL_CHEAPEST` fija el aviso nuevo más barato de cada
variante con banda de esa corrida releída con el registro actual.

## Qué queda afuera y por qué

- **El reloj inteligente.** El `NOT_A_PRODUCT` compartido de equipar descarta todo título que nombre
  la «correa», y así quedan afuera justo los de Apple, que son los del hilo. Ese filtro corre primero
  para todas las categorías, no se puede saltear desde un registro inyectado, y no se toca durante la
  semana del Black Friday porque lo usan equipar y movilidad en vivo. El reloj va a la lista sin
  precio de la página, con esa explicación. El mismo filtro le cuesta a otras categorías unas pocas
  unidades reales cada una («display», «tapa», «control remoto»): está documentado en el test
  (`lostToSharedFilter`), no corregido.
- **Automatizar la casa.** Quien abrió el hilo lo pone primero en su lista sin decir con qué
  aparatos: es un proyecto, no un producto con precio. Nadie nombró un enchufe inteligente, así que
  no hay categoría de enchufe.
- **La batería de ollas** se sacó: un solo comentario genérico y una banda muy ancha. Se nombra en el
  «por qué» de la sartén.
- **La sartén de acero inoxidable cuenta una persona, no dos.** Sólo un comentario nombra el
  material; el otro dice «ollas y sartenes» de buena calidad sin decir de qué. Por eso va con los de
  una mención, por nombre (entre el robot de cocina y el ventilador), y el segundo comentario queda
  como contexto en su «por qué».
- **Las bandas de equipar no se reusan.** Donde un producto del hilo se superpone con una fila de
  equipar, esa fila mezcla justo el mercado del que habla el hilo (la aspiradora de equipar no tiene
  robots, su secarropas junta el de tambor con el de bolsa, su horno eléctrico incluye freidoras de
  aire). Además ataría esta página a las corridas de equipar en la semana del Black Friday. Equipar
  aporta enlaces, no números.
- **Usados.** El job calcula la banda de usados (no cuesta nada) y la guarda, pero la v1 de la
  página publica sólo avisos nuevos.
- Vehículos, la libreta, las apps, la plata y lo demás que no se compra en Mercado Libre o que una
  banda honesta no puede medir (championes, la PC gamer) van a la lista sin precio de la página.
  Los productos para adultos y un remedio sin evidencia se dejaron afuera y la página lo dice en una
  línea.

## Presupuesto del puente

El puente propio de Mercado Libre (:9656) lo comparten sillas, equipar, celulares, movilidad, motos,
alquileres y autos. Un 429 deja al puente 10 minutos en su proxy residencial **para todos los jobs**,
así que este job pide poco y en un hueco:

- **33 búsquedas × 2 páginas = a lo sumo 66 pedidos** por corrida (`PRODUCTOS_VIDA_ML_MAX_SCANS = 40`,
  `PRODUCTOS_VIDA_ML_PAGES_PER_QUERY = 2`). Con el puente vivo (2,2 a 4,2 s por página) son 2,5 a
  4,6 minutos.
- **Cron `13 0,4,16,20 * * *`.** El minuto :13 es el hueco libre del puente (:13–:21, después de
  movilidad-specs :01 y movilidad-horaria :07, antes de sillas-horaria :23). Las horas 00/04/16/20
  esquivan autos-parts (02/18/22), el barrido diario de autos (07:43 a ~10:15) y la diaria de sillas
  (11:41).
- **La puerta de ventana.** pm2 lanza una app de cron apenas se registra (`pm2 start
  ecosystem.config.js --only <app>` en `scripts/deploy-backend.sh`, también cuando el control de
  deriva la recrea) y en cada `pm2 resurrect` después de un reinicio, a cualquier minuto. Sin puerta,
  la primera cosecha caería donde terminara el deploy, encima de sillas :23, autos :29, celulares
  :37, motos :44, alquileres :47 o equipar :53. Así que `main()` mira primero
  `productosVidaBridgeWindowOpen(new Date())`: fuera de :13–:14 de las 00/04/16/20 UTC deja **una
  sola línea** en el log («fuera de la ventana del puente…»), devuelve `"outside-window"` y sale en
  0 sin pedir la cotización, sin tocar el puente y sin abrir una conexión. Los dos minutos de
  tolerancia siguen la idea de `bridgeWindowOpen` de autos-parts. La ventana es una constante del
  registro (`PRODUCTOS_VIDA_WINDOW`) y `tests/productosvida/schedule.test.ts` ata el cron a ella.
- **El reloj de 6 minutos** cuenta desde el arranque del proceso (no desde el primer pedido, así una
  cotización lenta come de esos 6 minutos en vez de correr la última página). Se mira antes de cada
  página, nunca en el medio de una: ninguna página nueva después de los 6 minutos. Una página puede
  durar hasta 3 × 45 s más 1,8 s de espera (`fetchJson` con `retries: 2` y `timeoutMs: 45_000`), así
  que en el peor caso (cada pedido agota el tiempo) la última termina ~8,5 minutos después del
  arranque: antes de las :23 de sillas-horaria. Un corte se anota en la nota de la corrida
  («corte por reloj: N búsquedas sin leer»).
- Los dos límites (`maxPagesPerQuery` y `deadlineAt`) son un tercer parámetro **opcional** de
  `harvestMercadoLibre` (`MlHarvestLimits`, en `classes/retail/sources/mercadolibre.ts`) que sólo
  puede bajar lo que hace el cosechador; `harvestRetail` los recibe como `mlMaxPagesPerQuery` y
  `mlDeadlineAt`. Sin ellos (sillas, equipar, celulares, movilidad) el cosechador hace exactamente lo
  de siempre (`tests/retail/ml_page_cap.test.ts`, `tests/retail/harvest.test.ts`).

## El job

`sync_productos_vida.ts`, con la forma de `sync_movilidad.ts`: `main()` exportada, cada negativa es
un `Error`, y el proceso sólo sale detrás de `require.main === module`, así un test llama a `main()`
contra colaboradores simulados. En orden:

1. Marca el arranque (el reloj de 6 minutos cuenta desde acá).
2. Sin `--dry-run` y sin `APP_MONGO_URI` (o `MONGO_URI`, que se mapea sólo si está), se niega.
3. La puerta de ventana (arriba). `--dry-run` no la mira; `--ignore-window` la saltea a propósito.
4. **La cotización del dólar antes que el puente.** Sin cotización, falla sin haber gastado un
   pedido: no se publican precios que no se pueden comparar.
5. Cosecha (sólo Mercado Libre) y, en una corrida real, en paralelo, el historial guardado y el
   conteo de la guarda.
6. **Si Mercado Libre no contestó, falla y no escribe nada**, también en la primera corrida: un
   catálogo vacío se leería como «no existe nada» hasta la próxima corrida buena.
7. `applyUnitGuard` (sin tiendas no hace nada; queda a propósito para el día que se agregue una).
8. `buildEquiparCatalog` con el registro de esta página.
9. **Corrida flaca:** si hay ítems guardados y la corrida trae menos del 40 % de ellos con banda
   NUEVA, falla y conserva el catálogo anterior. El denominador es «ítems con banda nueva vistos en
   los últimos 3 días» (`countPricedRecentItems`), no `countDocuments({})`: los ítems nunca se
   borran, así que el total sólo crece (la lección de celulares en AGENTS.md). Y las dos puntas
   cuentan sólo bandas **nuevas**, porque la página sólo publica bandas nuevas: contar las de usado
   dejaría pasar una corrida que vacía todos los precios de la página.
10. `withHistory`: un punto por día UTC con la mediana nueva y la usada, el último del día gana, a
    lo sumo 365. Corre también en el dry run (con historial vacío).
11. El meta (`runs` con una sola entrada, la de Mercado Libre, y `uncovered`: las categorías sin
    banda esta corrida) y las filas por aviso (`buildEquiparListings`).
12. Dry run: escribe el JSON si se pidió y termina. Corrida real: guarda el catálogo y el meta, y
    después las filas por aviso en su propio try/catch (un fallo ahí se anota y no tumba lo ya
    guardado).

No hay modo `--fast`, ni foto de tiendas, ni pricewatch, ni ficha.

## Colecciones y API

Todo en la APP DB; el job nunca toca la base del backend.

| qué | modelo (los dos lados) | colección | backend | app |
|---|---|---|---|---|
| ítems | `ProductosVidaItem` | `productosvidaitems` | `classes/models/ProductosVidaItem.ts` | `app/server/models/ProductosVidaItem.ts` |
| meta | `ProductosVidaMeta` | `productosvidameta` | `classes/models/ProductosVidaMeta.ts` | `app/server/models/ProductosVidaMeta.ts` |
| avisos | `ProductosVidaListing` | `productosvidalistings` | `classes/models/ProductosVidaListing.ts` | `app/server/models/ProductosVidaListing.ts` |

Los nombres de colección salen de una sola constante (`PRODUCTOS_VIDA_COLLECTIONS`) y el meta usa la
clave `productos-que-te-cambian-la-vida-uruguay` (`PRODUCTOS_VIDA_META_KEY`, sin dígitos).
`tests/appdb/schema_parity.test.ts` compara los campos de los dos lados y además verifica el nombre
de colección que el app fija como texto.

- **Ítem:** uno por `<categoría>:<variante>` (`calientacama:una-plaza`). Es `EquiparItem` más
  `history`, `firstSeen` y `lastSeen`, los mismos campos que `MovilidadItem`. Índices `{ key: 1 }`
  único y `{ category: 1, lastSeen: 1 }` (el prefiltro de la ruta).
- **Meta:** `generatedAt`, `usdUyu`, `listings` (avisos aceptados esta corrida), `items`, `runs`,
  `uncovered`. Índice `{ key: 1 }` único.
- **Aviso:** uno por aviso aceptado, `EquiparListingRow` más `firstSeen` (lo escribe sólo el insert).
  Se podan 30 días después de `lastSeen`. La v1 del app no lo lee: es material para las subpáginas
  por producto de la v2.

**`GET /api/productos-vida`** (`app/server/api/productos-vida/index.get.ts`) es la única fuente de la
página. Lee el meta y los ítems de las categorías del catálogo con `lastSeen` desde hace dos días
(con el índice), y la función pura `productosVidaResponse(meta, items, nowMs)` de
`app/utils/productosVida.ts` arma la respuesta:

- descarta los ítems cuyo `observedAt` tiene más de 48 horas (el prefiltro por día solo dejaría vivir
  una banda hasta ~72 h) — por eso `observedAt` está en el `.select()` de la ruta, con test: una
  proyección sin ese campo vaciaría la página con los tests en verde (la trampa del PR #288);
- deja afuera las ofertas usadas y la banda de usados;
- toma ofertas **sólo de variantes con banda nueva**: debajo de 8 precios `articleBand()` devuelve
  null y `priceVerdict(price, null)` contesta `ok`, así que el aviso más barato de una variante flaca
  puede ser un precio de relleno, un dólar leído como peso o un accesorio. Hasta 4 por producto,
  repartidas por ronda entre las variantes con banda;
- marca `stale` cuando el meta tiene más de 13 h (y no 12: de 04:13 a 16:13 UTC ya pasan 12 h,
  así que con 12 el aviso saldría unos minutos antes de cada corrida normal de las 16:13), y
  `seenOn` cuando la variante no se refrescó en la última corrida (más de 6 h antes del meta), las
  dos fechas en hora de Montevideo;
- `unavailable: true` sólo en el camino de error de la ruta (Mongo no se pudo leer), con
  `cache-control: no-store`; en el camino bueno, `public, max-age=900, s-maxage=900,
  stale-while-revalidate=86400`. Nunca 404 ni 500: la lista editorial se muestra igual.

La respuesta peor posible (26 productos, 3 variantes y 4 ofertas cada uno, textos al máximo) mide
menos de 72 000 bytes, con test.

## La página

`app/pages/productos-que-te-cambian-la-vida-uruguay/index.vue`, en carpeta para que la v2
(`[producto].vue`) quede al lado. Recorre `PRODUCTOS_VIDA_PRODUCTS` (el catálogo), no la respuesta,
así que los 26 productos se muestran aunque no haya ningún precio.

- **Encabezado:** H1 «Productos que te cambian la vida, según r/uruguay», una bajada que nombra sólo
  los productos más nombrados, la fecha de lectura del hilo y, cuando hay meta, la fecha y hora de los
  precios. A lo sumo una nota de estado para toda la página: sin lectura de Mongo, sin primera
  corrida, sin precios recientes, o precios viejos.
- **Filtros de presupuesto y tipo** como enlaces (`?hasta=` y `?tipo=`), leídos en el servidor. Un
  producto sin banda nunca se juzga contra el presupuesto: se muestra igual.
- **Cada producto:** puesto, cuántas personas lo nombraron, el porqué, y el panel de precio con una
  fila por variante (precio típico = mediana, «la mitad sale entre» p25 y p75, cuántos avisos) y una
  regla logarítmica compartida por toda la página; hasta 4 avisos nuevos baratos y siempre el enlace
  a la búsqueda de Mercado Libre (directo, sin afiliado). «Qué mirar antes de comprar» en un
  `<details>`, y un enlace a la fila de equipar cuando la hay.
- **Lo que también nombraron, sin precio**, **Cómo armamos la lista** (la regla de conteo, los 81
  comentarios, la fecha del hilo, de dónde salen los precios y a qué cotización), preguntas
  frecuentes y botones para compartir.
- Nada se renderiza según el visitante (el HTML se cachea en el borde) y la página nunca lee el reloj:
  `stale` y las fechas vienen de la API, así el HTML del servidor y la hidratación no difieren.

## Vista previa en dev

`--dry-run --json=<archivo>` no conecta a ninguna base (el log lo dice) y escribe exactamente lo que
guardaría:

```json
{ "meta": { "key": "productos-que-te-cambian-la-vida-uruguay", "generatedAt": "…", "usdUyu": 40, "listings": 0, "items": 0, "runs": [], "uncovered": [] },
  "items": [ "…los documentos de ítem con firstSeen, lastSeen e history…" ],
  "listings": [ "…las filas de buildEquiparListings…" ] }
```

La ruta del app lee ese archivo en `nuxt dev` cuando está `PRODUCTOS_VIDA_PREVIEW_FILE` (rama detrás
de `import.meta.dev`, nunca en producción) y lo pasa por el mismo `productosVidaResponse`, así que la
vista previa se comporta igual que Mongo. **El `.env` local apunta a producción**: la vista previa
nunca conecta.

```sh
npx ts-node sync_productos_vida.ts --dry-run --json=<scratch>/productos-vida.json
# en un worktree del app con su propio npm install:
PRODUCTOS_VIDA_PREVIEW_FILE=<scratch>/productos-vida.json npx nuxi dev
```

El dry run no mira la ventana, pero sí pega al puente: correrlo a las :13 de una hora UTC que no
sea 02, 07, 08, 09, 10, 11 ni 18 o 22.

## Tests

Raíz (`npx vitest run tests/productosvida tests/retail tests/appdb/schema_parity.test.ts`):

- `tests/productosvida/registry.test.ts`: forma (26 claves en orden, sin dígitos, un respaldo por
  categoría, sala/tramo/fuentes, ningún carácter que `norm()` borra ni bandera `g`/`y`, presupuesto),
  la ventana del puente, títulos reales aceptados con su variante y rechazados, el más barato de
  cada categoría, lo que pierde el filtro compartido, exclusividad entre categorías, los títulos con
  barra de la muestra, que equipar no cambia y la primera corrida real (`fixtures/ml_dryrun.json`:
  sus rechazos, las unidades vecinas de cada regla y el aviso nuevo más barato de cada variante con
  banda).
- `tests/productosvida/dry_run.test.ts`: `main()` con colaboradores simulados y el `withHistory`
  real — negativa sin base, puerta de ventana (una sola línea, ningún pedido, ninguna conexión),
  `--ignore-window`, `--dry-run` sin base y con JSON, los parámetros del cosechador, Mercado Libre
  caído, primera corrida, corrida flaca (también con sólo bandas de usado), fallo de las filas y
  cotización en cero sin tocar el puente.
- `tests/productosvida/store.test.ts`: colecciones, la consulta exacta de la guarda y el reemplazo
  del punto del día en el historial.
- `tests/productosvida/listings.test.ts`: las filas por aviso con la muestra real.
- `tests/productosvida/schedule.test.ts`: la entrada de pm2, `OTHER_APPS`, el cron atado a la
  ventana, el minuto entre los consumidores horarios del puente, las horas y la línea de
  `appContracts`.
- `tests/retail/ml_page_cap.test.ts` y el caso nuevo de `tests/retail/harvest.test.ts`: los límites
  opcionales del cosechador y que sin ellos nada cambia.
- `tests/revenueplan/value_routes.test.ts`: la ruta en `DIRECTORIO_PATHS` existe como página.

App: `productosVidaParity`, `productosVidaCatalog`, `productosVida`, `productosVidaRoute` y
`productosVidaPage` en `app/tests/unit/`.

## Cómo diagnosticar

- **La página dice «Todavía no hay precios…».** El job nunca escribió: `pm2 logs
  currency-productos-vida --lines 40`. Si sólo hay líneas «fuera de la ventana del puente…», todavía
  no llegó un horario (00/04/16/20:13 UTC). Para correrlo antes: `pm2 restart
  currency-productos-vida` **sólo a las :13 o :14 de esas horas** (en cualquier otro minuto sale sin
  leer), o `node dist/sync_productos_vida.js --ignore-window` a mano a las :13 de una hora libre del
  puente.
- **«No pudimos leer los precios recientes…».** El meta existe pero ningún ítem tiene menos de 48 h:
  las últimas corridas fallaron. Mirar en el log la línea de Mercado Libre (`FAIL mercadolibre …
  sin respuesta de …` es el puente caído) o la de la corrida flaca («sólo N ítems con banda nueva
  contra M guardados…»).
- **«corte por reloj» en la nota de Mercado Libre.** El puente anduvo lento y el reloj de 6 minutos
  cortó; las búsquedas sin leer son las del final del plan (segundas búsquedas primero). Si se repite
  todos los días a la misma hora, otro job está usando el puente en ese hueco.
- **Una categoría sin banda** aparece en `uncovered` del meta. Con menos de 8 avisos nuevos en una
  variante no hay banda; si una categoría entera se vacía de golpe, mirar si Mercado Libre cambió los
  títulos o si un filtro (`titleExclude` o el `NOT_A_PRODUCT` compartido) empezó a descartarlos.
- **Un no-producto encabeza «los más baratos».** Endurecer el `titleExclude` de esa categoría (la
  regla más angosta: una palabra que una unidad real nunca lleva, o la pieza que abre el título o va
  detrás de «para»; nunca un piso de precio ni aflojar un `include`), agregar el título real a
  `tests/productosvida/registry.test.ts` (rechazados, con una unidad real vecina como aceptada) y
  volver a correr el dry run.
