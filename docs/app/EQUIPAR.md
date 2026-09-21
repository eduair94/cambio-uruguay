# Equipar una casa vacía (`/equipar-casa-uruguay`)

Cuánto sale llenar una vivienda sin amueblar en Uruguay: 38 categorías con precio vivo, ordenadas
por necesidad, con el mercado de usados al lado del nuevo y tres canastas ya sumadas.

Origen: el hilo https://www.reddit.com/r/uruguay/comments/1w9c2r6/independizarse/ (2026-09-06), que
pregunta qué comprar al independizarse y **no trae un solo precio**. Esa es la mitad que el sitio
puede medir. El hilo se cita, no se cosecha.

Llena el hueco del medio de una cadena que el sitio ya cubría por los dos extremos:
`/alquileres-uruguay` (encontrarlo) → `/primer-alquiler-uruguay` (firmarlo) → **equiparlo** →
`/plan-de-vida-uruguay` (vivir en él).

## `classes/retail`: el cosechador dejó de ser de sillas

`classes/chairs` ya era un lector de retail uruguayo con la palabra "silla" compilada en **un solo
punto por adaptador** (`isDeskChair`, llamado como predicado). Se extrajo:

```
classes/retail/
├── net.ts            throttle por host, timeout, reintentos (movido tal cual)
├── types.ts          RetailListing, RetailStore, CategorySpec
├── stores.ts         las 16 tiendas uruguayas y su adaptador
├── harvest.ts        corre todas las fuentes y reporta qué produjo cada una
└── sources/          fenicio · shopify · woocommerce · vtex · structured · mercadolibre · facebook
```

`classes/chairs/spec.ts` es ahora todo lo que "silla" significa para las cañerías, y
`classes/chairs/sources/*.ts` quedaron como shims que atan `CHAIR_SPEC` al adaptador compartido —
así los 11 archivos de `tests/chairs/` siguen importando las mismas rutas y siguen verdes (82/82),
que es la prueba de que la extracción no movió comportamiento.

**Una barrida por tienda, muchos clasificadores.** Leer un sitemap de 40k URLs cuesta lo mismo para
una categoría que para cuarenta, así que el adaptador recibe `CategorySpec[]` y la primera spec que
acepta el título se lo queda (`attributes.CATEGORY_SPEC`). MercadoLibre y Facebook son al revés —se
buscan por término— así que **sí** escalan con las categorías y toman presupuesto.

## El job

| app pm2 | script | cron UTC | qué hace |
|---|---|---|---|
| `currency-equipar` | `dist/sync_equipar.js` | `47 12 * * *` | corrida completa; `RETAIL_STORE_MAX_PDP=900` sólo acá |
| `currency-equipar-hourly` | `dist/sync_equipar.js --fast` | `53 * * * *` | sólo precios, sin las tiendas Fenicio, medio presupuesto |

12:47 UTC deja una hora limpia después de `currency-chairs` (11:41): pegan a los mismos hosts y a
los mismos dos puentes (`:9656` ML, `:9657` FB), y superponerlos duplicaría la carga sobre la tienda
chica de otro para nada.

`RETAIL_STORE_MAX_PDP` sube a 900 **sólo en este job**. El default de 260 páginas de producto por
tienda Fenicio es el correcto para una categoría y truncaría 38 en orden de sitemap, lo que sesga en
silencio todas las bandas hacia lo que la tienda lista primero.

Presupuestos: `EQUIPAR_ML_MAX_SCANS` (70) y `EQUIPAR_FB_MAX_QUERIES` (26). Los planes van
**intercalados por categoría**, así que un corte le cuesta a cada categoría su cola y no a una
categoría todo. El orden es el del registro, que pone heladera, colchón y lavarropas arriba: si se
corta, se cortan los repasadores.

APP DB (`APP_MONGO_URI`): `equiparitems` (un documento por categoría+variante, con historia diaria
de hasta un año) y `equiparmeta` (un documento: corrida, fuentes, las tres canastas, lo no cubierto).
Además, sólo la corrida diaria, `equiparstoresnapshots` (una foto de los avisos de tienda del día,
que la horaria mezcla — ver "Errores encontrados en producción", abajo) y, las dos corridas,
`pricewatchoffers` (historial diario por oferta, compartido con sillas — ver
[PRICEWATCH.md](PRICEWATCH.md)).

## El registro es inyectable

`buildEquiparCatalog`, `categoryFor`/`matchesCategory`, `specsFor` y `uncoveredCategories`
(`classes/equipar/catalog.ts`, `classes/equipar/classify.ts`) reciben un `registry: EquiparCategory[]`
opcional que por defecto es `EQUIPAR_CATEGORIES` — así que cualquier llamador existente sigue
funcionando sin tocarlo. `classes/movilidad/` (monopatines y bicicletas eléctricas,
`docs/app/MOVILIDAD.md`) es el segundo consumidor: inyecta su propio registro de dos categorías
para reutilizar los dos regímenes, las bandas, la separación nuevo/usado, la guarda de unidad y la
foto de tienda **sin** forkearlos. `room: "movilidad"` existe en `EquiparRoom` sólo para que ese
registro no tenga que mentir sobre en qué ambiente de una casa vive un monopatín.

**`classes/equipar/basket.ts` (las tres canastas) se queda hardcodeado a `EQUIPAR_CATEGORIES` a
propósito**: nunca itera un registro inyectado, así que ninguna categoría de un consumidor externo
—monopatines, bicicletas, o el que siga— puede alcanzar la canasta de llenar una casa ni su
presupuesto, sin importar qué valores de relleno (`tier`, `quantity`) declare en su propio registro.

## Dos regímenes, y por qué

`classes/equipar/registry.ts` declara, por categoría, cómo se puede publicar:

| régimen | quiénes | qué se publica |
|---|---|---|
| `modelo` | heladera, lavarropas, cocina, microondas, calefón, TV, aire, colchón, mixer, plancha, ventilador, estufa… | fila = producto `marca\|modelo` con sus ofertas y link |
| `commodity` | ollas, sartenes, cubiertos, vajilla, vasos, tabla, toallas, sábanas, limpieza, mesa, sofá, ropero… | fila = banda p25 / mediana / p75 de la categoría+variante |

Un juego de ollas se lista con doce títulos y sin modelo: agruparlos por texto inventaría un
producto que no existe. Lo que esa categoría **sí** puede afirmar es la distribución.

**La variante no es opcional.** Un frigobar y una side-by-side son las dos "heladera", con 5× de
varianza. El tier y el presupuesto cuelgan de categoría+variante, nunca de la categoría. La variante
sale de un `match` de texto o de un número con unidad (litros, pulgadas, cm, plazas, piezas, BTU), y
cuando el título no dice nada cae en la variante marcada `fallback` — que es lo que hace Marketplace
todo el tiempo.

**Facebook Marketplace nunca entra al régimen `modelo`.** "Heladera funcionando" no identifica nada,
y una descripción no prueba identidad (misma regla que en alquileres). FB alimenta siempre la banda
de **usados**.

### Productos agrupados por catálogo, no por texto

`buildProducts` (`classes/equipar/catalog.ts`) agrupaba antes por `marca|modelo` leído del título: el
mismo producto con dos títulos distintos (dos vendedores de ML, o un vendedor y una tienda) entraba
como dos productos separados. Ahora agrupa primero por `catalog_product_id` de MercadoLibre
(`cat:<catalogId>`), sin mirar el texto del título; el nombre del grupo sale de una votación por
mayoría de lo que `identify()` lee en cada oferta, así que un título raro de un vendedor no le gana a
dos que coinciden. Un grupo sin ninguna marca identificable igual se publica —el `catalogId` ya prueba
que es un solo producto real, aunque nadie lo haya nombrado bien— con marca/modelo derivados del
primer título, salvo que esa marca sea un placeholder (`NOT_A_BRAND`, p. ej. "Sin marca") y el modelo
derivado del título quede vacío: ese producto no se publica, pero sus avisos siguen contando para la
banda de precio de la fila (`newBand`/`usedBand` se calculan sobre los avisos, no sobre los
productos). Un aviso sin `catalogId` (tienda, o ML sin catálogo) se suma a un grupo existente sólo si
su propio `marca|modelo` coincide EXACTO con el que ya ganó esa votación —primero en llegar, gana: dos
`catalogId` que voten la misma identidad nunca se funden entre sí, y si eso produce el mismo slug para
dos productos, el segundo lleva un sufijo con los últimos 6 dígitos de su `catalogId`. `sellers` cuenta
nombres de vendedor normalizados, no la cadena cruda de cada oferta.

**Un producto sólo sale de avisos que pasaron la banda.** `buildProducts` recibía todos los avisos del
ítem, incluidos los que `screen()` descartaba o marcaba sospechosos, y la tabla de modelos ordena por
precio: medido en producción el 16/9/2026, colchón abría con cuatro yogures a $ 70–77 y aire
acondicionado con un convector Kassel a $ 2.773, publicados además como `Offer` en el JSON-LD. Ahora
recibe sólo los avisos nuevos de `newScreen.kept`. Como el app se despliega antes que el backend, la
API (`equiparPlausibleProducts` en `app/utils/equipar.ts`, dentro de `equiparCategoryProjection`) y
la tabla también sacan todo producto con `bestPriceUyu` por debajo de `newBand.p25 / 2`: tapa los
documentos escritos por el código anterior hasta que la corrida los reescriba.

**El nombre publicado conserva la grafía del aviso.** La clave normalizada (minúsculas, sin tildes)
sigue agrupando y armando el slug, pero se imprimía como nombre: "grenno fr-kh200b". Cada palabra
de la clave se busca, entera, en la marca, el modelo y el título del aviso más barato del producto
(`originalSpelling`), y sale "Grenno FR-KH200B". Ninguna URL cambia.

## El orden es necesidad, no precio

El tier mide qué tan rápido la casa deja de funcionar sin eso, y **cada categoría escribe por qué**
(`reason`), texto que se publica al lado de la fila: un tier que no puede explicarse es una opinión
con una letra adelante. `tests/equipar/registry.test.ts` exige ese texto.

- **S (14)** heladera · colchón · cocina/anafe · calefón · olla · sartén · cuchillo · cubiertos ·
  platos · vasos · sábanas · toallas · kit de limpieza · tacho
- **A (11)** lavarropas · microondas · mesa+sillas · ropero · tabla de picar · escurridor · plancha ·
  estufa · ventilador · almohada · acolchado
- **B (8)** TV · sofá · mixer · pava · aspiradora · tostadora · aire acondicionado · cortina de baño
- **C (5)** secarropas · deshumidificador · impresora · horno eléctrico · cafetera

Los cuatro ítems que el hilo discute (secarropas, deshumidificador, impresora, tabla de picar) quedan
donde el hilo los deja, con el motivo citado.

**Fuera del catálogo a propósito:** la garrafa de supergas de 13 kg. Su precio está regulado y lo que
listan tiendas y ML mezcla envase con recarga, así que un precio cosechado ahí sería ruido. Se
menciona en la nota de cocina, sin cifra propia.

## Guardas

1. **La moneda nunca se asume** (heredado de chairs). Tienda cuya moneda no se puede establecer se
   saltea: USD publicado como UYU es un error de 40×. Además queda un guardarraíl genérico para la
   PRÓXIMA tienda que mienta (`classes/retail/unitGuard.ts`, `applyUnitGuard`): compara la mediana en
   pesos de tienda+categoría contra la mediana de MercadoLibre de la misma categoría y descarta el
   grupo entero si están a más de 20× una de otra — nunca reescala un precio, sólo lo tira. TYT (ver
   "Errores encontrados en producción", abajo) se arregló en su propio adaptador, no con este
   guardarraíl: éste es el respaldo para el caso siguiente, no la solución de éste.
2. **Banda por percentiles de la propia categoría+variante**, reusando `classes/precios/plausibility.ts`
   sin tocarlo. Bajo p10/3 se borra; entre p10/3 y p10/2 queda `suspect` — se ve, dice por qué, y no
   encabeza. Un factor fijo no sirve: el spread real de un sartén no es el de una heladera.
3. **Nuevo y usado jamás se promedian.** Dos bandas, siempre, y el cribado corre por condición —si no,
   el mercado de usados entero cae bajo la línea de sospecha del nuevo.
4. **El ahorro exige las dos patas**: nuevo ≥ 8 observaciones, usado ≥ 5. Si falta una, la fila dice
   que no hay datos, no un porcentaje inventado — y sería el titular.
5. **Canasta emparejada.** Es la lección de [PRECIOS.md](PRECIOS.md): un total baja por *faltarle*
   ítems. Si una categoría de la canasta no tiene banda, se publica el total **parcial** y qué falta,
   en la misma tarjeta. `tests/equipar/basket.test.ts` lo vigila.
6. **Nada sin fecha**: la API descarta lo que no se observó en 4 días. Una pizarra congelada no
   encabeza un ranking de "más barato".
7. **Una corrida flaca no pisa una buena**: si los ítems con precio caen por debajo del 40 % de lo
   guardado, el job aborta y conserva el catálogo anterior.
8. **Accesorios fuera antes de clasificar** (`NOT_A_PRODUCT`): fundas, repuestos, gomas de puerta,
   controles remotos y los "no funciona, para repuesto" de Marketplace, que entrarían derecho al
   fondo de la banda de usados.
9. **Una fila sin precio nunca encabeza su categoría.** Medido en la primera corrida de producción:
   ordenar variantes alfabéticamente puso una "Heladera / Frigobar" **vacía** en el primer renglón
   de "sin esto la casa no funciona", y listó el calefón como 100 L, 50 L, 80 L. El orden es
   tier → categoría → tiene precio → rango de la variante, que es el tamaño que el registro ya
   declaraba.

## Errores encontrados en producción y cómo se arreglaron (medido 16/9/2026)

**TYT mezclaba monedas, no unidades.** El Store API de WooCommerce declara `currency_code: "UYU"` en
sus 515 productos, pero 149 de esos 515 están en dólares en la propia vidriera: "15900" con
`currency_minor_unit: 2` es USD 159,00, no $ 15.900. Un primer arreglo (`priceInMajorUnits`, un
resolver de banda contra la mediana de MercadoLibre) partía de un diagnóstico equivocado —asumía
error de unidad, no de moneda— y rescataba precios reales que quedaban apenas por encima de la banda:
el Smart TV Samsung QLED 85" (229900) bajaba a $ 2.299. El arreglo definitivo lee la moneda que la
propia tienda renderiza en la misma respuesta (`price_html`, función `wooDisplayedPrice` en
`classes/retail/sources/woocommerce.ts`) y sólo la usa cuando el monto coincide con `price / 100`
dentro de ±2 % (`wooPricing`); si no coincide, el producto se descarta ("precio mostrado distinto") en
vez de adivinarse. Verificado en las 515 filas: 515 de 515 coinciden. Si el símbolo nombra otra
moneda pero el importe no se puede leer (un tema que pone el símbolo después del número, o ningún
número), el producto también se descarta ("moneda mostrada sin importe legible"): caer a la moneda
de la API es justo lo que publicaría un producto en dólares como pesos, 40 veces más barato. `priceInMajorUnits` y el
resolver de banda se sacaron del código.

**"Colchón de frutillas" es un yogur.** El Dorado (supermercado, VTEX) vende "Yogur ... Colchón De
Frutillas 130gr"; sin campo `Modelo` en la API, `identify()` tomaba la cola del título como si fuera
el modelo de un colchón, y marca/título/precio eran todos los del yogur. Arreglado con exclusiones de
gramos/ml, `yogur\w*` y `lacteos` en `colchon.exclude` (`classes/equipar/registry.ts`) — la ruta de
categoría VTEX `/Frescos/Lacteos/Yogurt/` viaja como contexto aunque el título no diga gramos.

**Otros colados medidos y excluidos:** convector en `aire-acondicionado`; mueble para microondas en
`microondas`; cartuchos de gas y anafes de camping en `estufa`; calefones a gas (el catálogo sólo
cubre el termotanque eléctrico, medido en litros: "calefón" a gas queda fuera a propósito); lavarropas
semiautomáticos, hidrolavadoras y mangueras de desagote en `lavarropas`; limpiadores, mangueras y
cinta de auto en `aire-acondicionado`; camas para mascotas en `colchon`; toallas de papel en
`toallas`; papas congeladas de airfryer en `horno-electrico`; ventiladores industriales de gran porte
en `ventilador`; entre otros (lista completa, con el título real de cada caso, en los reportes de las
tareas 3 y 10 del ledger `.superpowers/sdd/2026-09-16-directorios-b-equipar/`). `aire-acondicionado`
ganó además las variantes `portatil` y `9000` (BTU), separadas de `12000`/`18000`.

**La serie de `aire-acondicionado:12000` da un escalón el día del despliegue.** Antes esa variante era
el `fallback` de 1.000 a 12.999 BTU y juntaba los equipos de 9.000 BTU y los portátiles; desde el
despliegue de esta rama (`feat/directorios-b-equipar`, setiembre de 2026) va de 10.500 a 12.999 BTU,
y los 9.000 BTU y los portátiles tienen su propia fila. La historia guardada es la del mismo `key`,
así que el gráfico de `/equipar-casa-uruguay/aire-acondicionado` muestra una suba de un día para el
otro en la mediana de 12.000 BTU: es la muestra que cambió, no el precio.

**El tope de búsquedas por tienda dejaba fuera a media tabla de tier S.** WooCommerce y VTEX mandan
las `storeQueries` del registro en el orden del registro y cortan a las 24 primeras
(`RETAIL_WOO_MAX_QUERIES` / `RETAIL_VTEX_MAX_QUERIES`); hay unas 71 consultas distintas en el
registro, así que sartén, cuchillo, cubiertos, vajilla, vasos, sábanas, toallas, limpieza y tacho
—casi todo el tier S— nunca llegaban a El Dorado ni a las cinco tiendas WooCommerce. El tope ahora es
un parámetro en código (`HarvestOptions.maxStoreQueries`, `classes/equipar/budget.ts`,
`EQUIPAR_STORE_QUERIES`), no una variable de entorno de pm2: `scripts/deploy-backend.sh` sólo
reaplica el `ecosystem.config.js` de una app cuando cambia su cron, así que un env nuevo ahí nunca
llega a una app ya registrada en el VPS. La corrida diaria manda 80 consultas (entran las ~71 del
registro); la horaria se queda en 24 para no golpear cada hora a El Dorado y a las cinco tiendas Woo.
Lo que la horaria no busca no se pierde: la diaria guarda una foto de sus propios avisos de tienda,
ya pasados por la guarda de unidad (`equiparstoresnapshots`, APP DB), y la horaria la mezcla por
`listingId` antes de armar el catálogo —gana lo fresco, una fila de más de 36 horas se descarta— lo
que además corrige a Fenicio, al que la corrida horaria siempre saltea entero. La foto se guarda sin
`attributes.DESCRIPTION` (`storeSnapshotRows`): Fenicio copia ahí la descripción entera del producto,
nada después de la cosecha la lee, y era el grueso de un documento que tiene que quedar bajo 12 MB.
Guardarla va en su propio `try/catch`: si falla, el catálogo ya está publicado y la corrida termina
en 0; la horaria sigue con la foto anterior.

## Lo que encontró auditar la página en producción

Vale dejarlo escrito porque ninguno de los cuatro se veía en el código, sólo en la página real con
datos reales:

- **El texto de "no sé" era el menos legible de la página.** 53 nodos a 3,64:1 en claro (axe), y
  eran exactamente `sin precio esta semana` y `sin datos suficientes de usado`. La declaración de
  honestidad sobre la que se apoya todo el diseño resultaba ser el texto más difícil de leer.
  `opacity: 0.66` es donde ese mismo compuesto cruza 4,5:1.
- **El azul de texto chico no era del sistema.** `--v-theme-primary` (#1976d2) da 4,29:1 en claro y
  4,18:1 en oscuro. Medidas `/primer-alquiler-uruguay` y `/plan-de-vida-uruguay`: **cero**
  violaciones con ese color, así que lo había introducido esta página. Va `ink-blue` en claro.
- **Los cuatro colores de tier estaban fuera de la paleta.** Ahora salen de DESIGN.md, cada uno con
  el color de texto que realmente cruza 4,5:1 encima (el ámbar lleva tinta, los profundos blanco).
- **34 checkboxes de 13×13** contra el mínimo de 24 de WCAG 2.5.8. La etiqueta entera es el blanco.

## Las tres canastas

| canasta | tiers | variante | precio | usado |
|---|---|---|---|---|
| mínima | S | la más barata | mediana de usado, si no p25 nuevo | sí, donde la categoría lo tolera |
| decente | S+A | la típica | p25 nuevo | no |
| completa | S+A+B | la típica | mediana nueva | no |

El tier C nunca entra a una canasta. El colchón nunca se compra usado, ni siquiera en la mínima: es
la única categoría del catálogo donde la opción barata es el mal consejo, y el registro lo declara
(`usedOk: false`).

## La página

`app/pages/equipar-casa-uruguay/index.vue`, SSR, ES/EN/PT (`app/utils/equipar{Es,En,Pt}.ts`). Los tres
totales se renderizan en el servidor: son la cifra que Google puede citar y la respuesta que la
mayoría vino a buscar.

**Una tarjeta por categoría, con foto — no una tabla por variante.** La primera versión era una
tabla con una fila por categoría+variante, y eso repetía el mismo motivo de dos párrafos tres veces
para la heladera, tres para el colchón y tres para la olla: el argumento que justifica el tier —lo
único que esta página tiene y un comparador de precios no— se convertía en el muro de texto que uno
saltea. Ahora el motivo se dice una vez y las medidas van como lista compacta debajo.

La foto sale del propio relevamiento (`representativeImage` en `catalog.ts`) y **nunca de
Marketplace**: esa es la cocina del vendedor de noche y su URL caduca, así que la tarjeta se
rompería sola. Se toma la del aviso de precio **mediano**, no la del más barato — el más barato de
cualquier categoría es desproporcionadamente el accesorio o el mal titulado, y su foto
representaría mal a toda la categoría. Si igual devuelve 404, la tarjeta cae a un ícono por ambiente.

Debajo, la **calculadora**: "tengo $X", tilde de usado, tildes de lo que ya se tiene. Baja en orden
de necesidad y dice **dónde se corta la plata**. Estado de sesión, sin persistencia.

**El planificador ordena por el `rank` publicado**, no por precio. Es un campo guardado, no derivado:
el plan y la tabla TIENEN que coincidir, o la página se contradice. Ordenar por precio dentro del
tier parece razonable y no lo es —el más barato primero compra seis cosas chicas en vez de la
heladera; el más caro primero compra el colchón y deja la heladera afuera—, y en los dos casos el
planificador estaría eligiendo en silencio qué imprescindible sacrificar.

`GET /api/equipar` devuelve todo en un payload (menos de cien filas) sin la historia diaria, que la
página no dibuja.

### Una página por categoría

`app/pages/equipar-casa-uruguay/[categoria].vue` (`/equipar-casa-uruguay/heladera`, `/aire-acondicionado`…),
**sólo en español** como comparativas y sucursal: canonical sin prefijo de idioma y una sola URL por
categoría en el sitemap. Lee `GET /api/equipar/<categoria>` (con la historia diaria) y el copy editorial
de `app/utils/equiparCategoryPages.ts`, espejo a mano del registro. Un slug que no está en esa lista es
**404 real** vía `definePageMeta({ validate })`. Muestra la mediana nueva por tamaño con su banda
p25–p75, la usada con su ahorro, el gráfico de la mediana diaria (desde tres días relevados), los
modelos con sus ofertas (hasta 8 nuevas + 6 usadas por producto), los avisos más baratos, el motivo
del tier, la guía de compra, el Plan Redondo de UTE (ventana de compras 1/9/2026–31/3/2027,
verificada en ute.com.uy el 16/9/2026 — sólo donde la categoría aplica) y el costo por hora donde
corresponde, y el FAQ generado con los datos del día (cada respuesta con cifras nombra su variante —
la mediana usada y su ahorro salen del mismo ítem—, sin nota de usado no afirma nada sobre el estado
de un usado, y donde el plan excluye la categoría no agrega la ventana de compras). JSON-LD: migas + hasta 10 `Product` con
`Offer`, **nunca** `AggregateRating` (el sitio no mide calificaciones).

El sitemap sólo declara las categorías con alguna banda vista en los últimos 4 días —la misma ventana
que sirve la API—, así que nunca manda a Google una página que sólo puede decir "todavía no hay
avisos". Cada tarjeta del índice enlaza a su categoría.

## El directorio de avisos y la lista del lector (2026-09-21)

`equiparitems` guarda por variante sólo las 8 ofertas nuevas y 6 usadas más baratas: la cifra
correcta para "cuánto sale una heladera" y ninguna para "mostrame todas las heladeras usadas de
Samsung por debajo de $ 15.000". Para eso el job escribe además **`equiparlistings`** (APP DB): una
fila por aviso que la banda aceptó (`classes/equipar/listings.ts`, `buildEquiparListings`), con la
MISMA clasificación del catálogo —`CATEGORY_SPEC`, `variantFor`, `conditionOf`, `screen()` por ítem
y condición—, así que una fila que está acá es una que `buildEquiparCatalog` contó. Lo rechazado por
la banda no se guarda; lo **sospechoso** (bajo p10/2) se guarda con `suspect: true` y la API nunca lo
sirve: un directorio ordenado por "menor precio" lo pondría en el titular. `firstSeen` sólo se
escribe al insertar; `lastSeen` es la fecha del `observedAt` de cada aviso (una fila de la foto de
tiendas conserva la suya, la horaria no inventa una observación de hoy). Poda a 30 días. Se escribe
en su propio `try/catch` después del catálogo y en las dos corridas.

`GET /api/equipar/productos` (patrón `/api/cars`): paginado en Mongo, 24 por página, ventana de 4
días, cada faceta contada con la consulta SIN su propio filtro. `?ids=` devuelve las filas de la
lista guardada sin ventana y con `private, no-store`.

Páginas, sólo en español:

- `/equipar-casa-uruguay/productos` — todas las categorías, filtros al estilo Mercado Libre
  (categoría, tamaño, condición, precio, marca, fuente, vendedor, texto), `noindex` con filtros.
- `/equipar-casa-uruguay/productos/<categoria>` — la misma grilla con la categoría fijada por la
  ruta; es la superficie que puede rankear por "heladera usada uruguay" o marca+modelo (la ficha
  rankea, el hub enlaza). JSON-LD `ItemList` de hasta 10 `Product`/`Offer` con `itemCondition`, sin
  `AggregateRating`. En el sitemap junto a la página de precios de la misma categoría.
- `/equipar-casa-uruguay/mi-lista` — `noindex`, en `EXCLUDED_ROUTES`. La lista vive en
  `localStorage` (`cu_equipar_lista`, hasta 60) como **snapshot** de cada aviso al agregarlo, así
  sigue leyéndose cuando el aviso desaparece; se ordena por necesidad (tier → rank), suma en pesos y
  dólares, nombra las categorías del tier S que faltan (cada una enlaza a su buscador) y "Actualizar
  precios" pide `?ids=` para marcar vigente / cambió de precio / ya no está publicado.

Reusa de autos `CarsSidebarLayout`, `CarsFilterPanel` y `CarsToolbar`; lo propio vive en
`app/components/equipar/` y `app/composables/useEquiparProductosDirectorio.ts`.

## Tests

- `tests/retail/spec_injection.test.ts` — una barrida sirve a varias specs; el presupuesto de FB
  intercala categorías.
- `tests/equipar/registry.test.ts` — toda categoría con variante por defecto, motivo escrito y
  consultas para las tres fuentes.
- `tests/equipar/classify.test.ts` — acentos, exclusiones, variantes por número.
- `tests/equipar/bands.test.ts` — pisos de muestra, los dos veredictos, el ahorro que no se inventa.
- `tests/equipar/basket.test.ts` — **la guarda central**: total parcial + faltantes.
- `tests/equipar/catalog.test.ts` — nuevo y usado separados; FB no arma productos.
- `tests/equipar/catalog_products.test.ts` — agrupación por `catalog_product_id` de ML, votación de
  marca/modelo, placeholder sin publicar, slug desambiguado entre dos `catalogId`; un aviso de $ 70 o
  uno sospechoso nunca es producto ni oferta de un producto; el nombre conserva mayúsculas y tildes.
- `tests/equipar/production_cases.test.ts` — colados reales de producción pinneados por título (yogur,
  convector, calefón a gas, aspiradoras/hidrolavadoras, etc.), con su contraparte de que el producto
  real de esa misma categoría sigue entrando.
- `tests/retail/woo_currency.test.ts` — el adaptador de WooCommerce lee la moneda de TYT desde
  `price_html` en vez de asumirla, y descarta cuando el monto mostrado no coincide con la API o no se
  puede leer.
- `tests/retail/unit_guard.test.ts` — el guardarraíl genérico tienda-vs-ML (`applyUnitGuard`) descarta
  a más de 20×, y con muestra insuficiente de cualquiera de los dos lados no decide nada.
- `app/tests/unit/equiparPlan.test.ts` — el plan compra en el orden publicado.
- `app/tests/unit/equiparCategoryPage.test.ts` — la página por categoría: 404 real, `transform`, un H1,
  canonical sin idioma, `Product`/`Offer` sin calificaciones, productos filtrados por la banda, la
  ventana del Plan Redondo sólo donde entra, y el índice enlazando cada tarjeta.
- `app/tests/unit/equiparCategoryPages.test.ts` — copy y FAQ por categoría: variantes nombradas, nada
  de "segura", Plan Redondo excluido sin ventana.
- `app/tests/unit/equiparCategoryApi.test.ts` — recortes de la API y `equiparPlausibleProducts`.
- `tests/equipar/listings.test.ts` + `listings_store.test.ts` — una fila por aviso aceptado, sospechoso
  marcado, rechazado fuera, `firstSeen` sólo al insertar, poda a 30 días.
- `app/tests/unit/equiparProductos.test.ts` / `equiparProductosApi.test.ts` / `equiparProductosPage.test.ts`
  — consulta normalizada y chips, match/facetas/`ids` de la API, contrato de las tres páginas.
- `tests/appdb/schema_parity.test.ts` — los dos lados declaran los mismos campos.
- `tests/pricewatch/record.test.ts` — historial diario por oferta (ver [PRICEWATCH.md](PRICEWATCH.md)).

## Pendiente

- Facebook fuera de Montevideo (hoy `location=montevideo`; ampliar es más fan-out de consultas).
- La primera corrida real todavía no ocurrió: los números de cobertura por categoría hay que medirlos
  contra producción antes de citarlos afuera.
