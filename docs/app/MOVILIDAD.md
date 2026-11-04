# Movilidad eléctrica: monopatines y bicicletas (`/monopatines-electricos-uruguay`, `/bicicletas-electricas-uruguay`)

Cuánto sale un monopatín o una bicicleta eléctrica en Uruguay, nuevo y usado, con la normativa
departamental al lado — la comparación que el SERP uruguayo no tiene: la búsqueda "monopatín
eléctrico uruguay"/"bicicleta eléctrica uruguay" (17/9/2026, VPS `:5112`) sólo devuelve tiendas
sueltas, dos notas de prensa sobre regulación y un hilo de Reddit, nunca una página que junte precio
y norma. Diseño: `docs/superpowers/specs/2026-09-17-movilidad-electrica-design.md` (plan **E1** del
plan padre `docs/seo/2026-09-16-directorios-de-producto-plan.md`; **E2**, motos 0 km, queda para
después de que el directorio de celulares llegue a `main`, porque reutiliza su identificador por
modelo — no se bifurca acá). Ledger: `.superpowers/sdd/2026-09-17-directorios-e1-movilidad/`.

## Un segundo consumidor del catálogo de equipar, no un fork

`classes/movilidad/registry.ts` declara dos categorías con la MISMA forma que
`classes/equipar/registry.ts` (`EquiparCategory[]`), y las funciones que arman el catálogo aceptan
esa forma como un parámetro en vez de tenerla fija:

- `buildEquiparCatalog({ listings, usdUyu, registry })` (`classes/equipar/catalog.ts`),
- `categoryFor(title, context, registry)`/`matchesCategory` (`classes/equipar/classify.ts`),
- `specsFor(registry)` (los `CategorySpec` que arma el cosechador compartido),
- `uncoveredCategories(items, registry)`.

Cada una por defecto usa `EQUIPAR_CATEGORIES` cuando no se pasa nada, así que ningún consumidor
existente cambió de comportamiento. `sync_movilidad.ts` es el segundo consumidor (el primero,
`classes/chairs/`, entra por la capa de abajo — `CategorySpec` en `classes/retail/`, no por esta):
inyecta `MOVILIDAD_CATEGORIES` y reutiliza, sin copiar, los dos regímenes, las bandas, la separación
nuevo/usado, la guarda de unidad, el historial diario y la mecánica de foto de tienda para la
corrida horaria.

**Lo que NO se comparte a propósito:** `classes/equipar/basket.ts` (las tres canastas de
`/equipar-casa-uruguay`) sólo itera `EQUIPAR_CATEGORIES`, nunca un registro inyectado — monopatines
y bicicletas no son una necesidad para llenar una casa vacía, así que ninguna de las dos categorías
puede alcanzar la canasta ni su presupuesto, sin importar qué valores de relleno (`tier`, `quantity`)
lleven en el registro. `room: "movilidad"` es un quinto valor del tipo `EquiparRoom`
(`classes/equipar/types.ts`) que existe sólo para que el registro no mienta sobre en qué ambiente de
una casa vive un monopatín — no en ninguno.

Cada categoría/ítem de este catálogo usa el tipo `EquiparItem` sin declarar uno paralelo (ver el
encabezado de `classes/movilidad/registry.ts` y `classes/movilidad/types.ts`): sólo la forma del
`meta` es propia (`MovilidadMeta`, sin `baskets` porque no hay canasta que publicar).

## Las dos categorías (`classes/movilidad/registry.ts`)

| categoría | régimen | variantes | usado |
|---|---|---|---|
| `monopatin-electrico` | `modelo` (producto `marca\|modelo` con sus ofertas) | `infantil` (para niños/niñas), `urbano` (fallback), `alto-rendimiento` (potencia o velocidad declarada) | sí, con nota: la batería es la pieza que se degrada; un usado sin fecha ni ciclos de carga es una apuesta |
| `bicicleta-electrica` | `commodity` (banda p25/mediana/p75) | `plegable`, `urbana` (fallback), `montana`/`mtb`, `carga`/`cargo` | sí, con la misma nota sobre la batería |

`alto-rendimiento` se decide por texto explícito de potencia o velocidad —nunca por inferencia—, con
un umbral medido (`tests/movilidad/registry.test.ts`): 350 W y 500 W quedan en `urbano`; 800 W y
1000 W suben a `alto-rendimiento` (regex `[89]\d{2}|\d{4,5}\s*w` — 800-999 o 4-5 dígitos — o
45-99 km/h, o "todo terreno"/"cross"/"off-road"/"doble motor"/"dual drive"/"fat tire"). No hay unidad
`watts`/`km/h` en `EquiparUnit`: el título dice el número con su propia unidad o no dice nada, y
"nada" cae correctamente a `urbano`.

`usedOk: true` en las dos, pero es un juicio de la CATEGORÍA en el registro, no de la corrida:
`movilidadUsadoAnswer` (`app/utils/movilidad.ts`) separa "no hay categoría donde no convenga" de
"todavía no relevamos suficiente usado", que son dos respuestas distintas al mismo "sin datos".

## Una pieza que abre el título no es un vehículo (22/9/2026)

Medido sobre los 622 avisos de la PRIMERA corrida publicada del directorio: doce son repuestos que
pasaban `include` porque el título nombra el vehículo al que van — "Pantalla Lcd Para Bicicleta
Eléctrica", "Palanca De Freno Para E-bike", "Sprocket Trasero De Acero Para E-bike Y Scooter",
"Llantas Y Cámaras Para E-bike", dos "Kit bicicleta eléctrica". No es cosmético: a $ 2.958 una
pantalla entra a la banda por abajo, y con el directorio ordenado por menor precio encabeza "las
ofertas más baratas".

`PIEZA_ABRE_EL_TITULO` (`classes/movilidad/registry.ts`) es la regla de `IS_A_PART` de autos y por
la misma razón: la pieza cuenta **sólo si ABRE el título**. Se probó también "abre un segmento"
(después de `-`, `|` o `,`) sobre los mismos 622 avisos: marcaba 10 más y **9 eran vehículos
reales** ("Monopatín Eléctrico Knex Urban | Motor 800w", "Segway Ninebot F25 Patinete Eléctrico,
Motor Potente De 30…"), así que se descartó con la medición en la mano. Lo que paga la regla
estricta es un aviso de 622, el que antepone la marca ("Y&trefen Ebike - Juego De Palanca De
Freno"): un falso negativo es una fila de más en el directorio, un falso positivo borra monopatines
reales de la banda. Los doce títulos y los seis vehículos-control están fijados en
`tests/movilidad/registry.test.ts`.

El único falso negativo que dejaba esa regla —"Y&trefen Ebike - Juego De Palanca De Freno", que
antepone la marca— lo cubre una SEGUNDA regla, `JUEGO_DE_PIEZAS`: "juego de <pieza>" en cualquier
posición. No afloja el ancla (eso ya está medido que borra vehículos reales); es una frase que por
sí sola nunca describe un vehículo. Sobre los mismos 622 avisos marca ese aviso y ninguno más.

`kit` es **palabra desnuda** en las dos listas de exclusión, no una pieza que abre el título: el
tercer kit del inventario se titula "Bicicleta Electrica Kit P/ Instalar En Tu Bici C/ Motor 350w"
—no abre con la pieza y tampoco dice "conversión"—. Medido sobre los 622: `kit` en cualquier
posición marca tres avisos y los tres son kits.

Una fila ya guardada que deja de clasificar no se vuelve a escribir: sale de la ventana que sirve
la API a los 4 días y de la colección a los 30. Para no esperar, `npm run movilidad_prune_listings`
(`--apply` para borrar; sin eso sólo informa) relee lo guardado contra el registro de hoy.

## Qué queda afuera, y por qué

Ninguna de las dos categorías incluye una bicicleta o un monopatín SIN motor (`MONOPATIN_INCLUDE`/
`BICICLETA_INCLUDE` exigen la palabra "eléctric[oa]"/"e-" en el propio título, nunca un
"monopatín"/"bicicleta" a secas) — eso es lo que la spec llama "es exactamente el caso que nunca se
publica bajo esta categoría" (patineta de juguete, skate, bici común). El costo medido de mantener
ese calificador obligatorio: un vendedor que titula un monopatín eléctrico real sin la palabra
"eléctrico"/"electric" en ningún lado, y cuya tienda tampoco lo dice en `product_type`, se pierde —
aceptado a propósito antes que aflojar el filtro que mantiene afuera lo que no tiene motor.

Además de eso, `MONOPATIN_EXCLUDE`/`BICICLETA_EXCLUDE` (`classes/movilidad/registry.ts`) vetan,
contra título+contexto:

- **Repuestos y accesorios sueltos**: batería/cargador/casco/cubierta/neumático/cámara de aire,
  guantes, y un `accesorio`/`accesorios` genérico (ver más abajo por qué hizo falta agregarlo).
- **Otro vehículo, no un monopatín/bicicleta**: moto/motos/motoneta/ciclomotor (las líneas "e-Yumbo"
  de Supermotos son motos eléctricas vendidas como "Moto Eléctrica", nunca como "Monopatín" — la
  exclusión de `moto`/`motos` las saca aunque electrifiquen la misma palabra), triciclo(s)/
  cuatriciclo(s) eléctricos (otro vehículo, y San José ya los regula con un decreto propio, el 3278,
  distinto del 3279 de monopatines), hoverboard.
- **Requiere trámite que este catálogo no es**: `homologado`/`empadronable`/`matricula` — un vehículo
  que necesita matrícula no es lo que estas dos páginas comparan.
- **Kit de conversión** (motor bolt-on sobre un cuadro común, no una e-bike/e-scooter de fábrica) y
  **lubricante** (sólo en bicicleta: "Lubricante de Cadena Zefal eBike 120ml" matchea el include por
  la palabra suelta "eBike" impresa en el frasco, sin ser una bicicleta).

**La exclusión de conversión es la palabra desnuda, después de un miss real.** La primera versión
exigía una frase completa con un conector fijo ("kit de conversión", "convertir tu bicicleta"). Un
título real de producción la esquivó sin querer: "Kit Conversión Bicicleta Eléctrica 36v 350w" (sin
"de") y "convertir bicicleta" (sin "tu"/"la") no matcheaban ninguna de las dos frases exactas, así
que un kit de conversión se publicaba como si fuera una bicicleta de fábrica completa. La corrección
(fix round 2, `tests/movilidad/registry.test.ts` "fix round 2: un kit o motor de conversión nunca es
un vehículo completo") no agrega un conector más: saca el conector del todo y deja la palabra sola
bajo el exclude — una e-bike/e-scooter de fábrica completa casi nunca dice "conversión"/"convertir"
en su título, con o sin conector, así que la palabra desnuda no tiene costo de recall real acá. La
misma razón vale para `matricula` (reemplazó a la frase "con matricula", que se perdía "matrícula
incluida") y para `convertir`/`conversion` en las dos categorías.

**Lo que esa lista se lleva puesto, y no está medido:** el `exclude` corre contra título+contexto, así
que un vehículo real cuyo título anuncia un accesorio incluido ("Monopatín eléctrico X + casco de
regalo", "incluye cargador extra") queda afuera por la palabra del regalo. Es el mismo canje que la
rama ya hizo a propósito con `conversion`/`convertir`/`matricula` —precisión antes que recall— pero
a diferencia de aquél no salió de un caso observado: ninguna de las cinco tiendas tituló así en el
relevamiento del 17/9/2026. Queda anotado acá para que el día que una lo haga se vea como lo que es
(un falso negativo conocido) y no como un bug nuevo; la salida sería exigir adyacencia del accesorio
al sustantivo, no borrar la palabra del `exclude`.

**`accesorio`/`accesorios` entró por el mismo motivo que existe `productTypeInTitle`** (ver más
abajo): al componer el `product_type` de Shopify sobre el título, "Accesorio de bicicleta eléctrica
Canasto Central…" (loopbikes) o "Accesorio Cargador 60V Motopatin" (voltbike) pasan a contener la
frase completa "bicicleta eléctrica"/"electric[oa]" adyacente y calificarían para el `include` si no
fuera por este exclude — es la contrapartida necesaria de activar el flag, no una regla
independiente.

## Las cinco tiendas (`MOVILIDAD_STORE_KEYS`)

`classes/movilidad/registry.ts` exporta `MOVILIDAD_STORE_KEYS = ["delcar", "superbikers",
"covercompany", "voltbike", "loopbikes"]`: toda tienda registrada en `classes/retail/stores.ts` para
este dominio que **midió al menos un producto real aceptado** a través del clasificador de
producción real (`scripts/oneoff/movilidad_dry_run.ts`, nunca una suposición leída de la categoría
del propio storefront). Medido el 2026-09-17:

| tienda | plataforma | medido | en `MOVILIDAD_STORE_KEYS` porque |
|---|---|---|---|
| `delcar` (Delcar Motos) | WooCommerce, USD | 205 productos: 88 motos, 9 bicicletas eléctricas, 3 monopatines eléctricos | todos titulados "… Eléctric[oa] …": pasan el filtro tal cual está, sin `productTypeInTitle` |
| `superbikers` (Super Bikers) | WooCommerce, USD | 99 productos: 2 monopatines eléctricos (categoría propia "Eléctricas"), resto motos a nafta | sin bicicletas eléctricas; sin `productTypeInTitle` |
| `covercompany` (Cover Company) | Shopify, ya registrada para celulares/equipar | barrido completo de ~1.750 productos: 6 "Monopatin electrico Xiaomi MI Electric Scooter 5/6…", ninguna bicicleta eléctrica | ya tenía contrato publicado; sólo se le sumó la categoría |
| `voltbike` (Voltbike) | Shopify, USD | 89 productos: 5 `product_type` "Bicicleta Eléctrica", 1 "Motopatín Eléctrico", 65 "Accesorio", 18 sin `product_type` | **0 aceptados sin `productTypeInTitle`** (títulos de marca/modelo puro: "SuperVolt", "Monopatin Air"); 6 aceptados con el flag activo, ninguno de los 65 "Accesorio" se coló |
| `loopbikes` (Loop, `shop.loop-bikes.com`) | Shopify, USD | 135 productos: 13 "Bicicleta eléctrica" (12 aceptados, 1 cargador mal tipeado), 2 "Bicicleta" llana (bici manual, correctamente afuera), 10 "Accesorio de bicicleta eléctrica", 89 "Repuesto", 8 "Ropa", 5 "Merchandising" | **0 aceptados sin `productTypeInTitle`**; 12 con el flag activo, ninguno de los "Accesorio"/"Repuesto" se coló |

El candidato inicial de la spec también nombraba a Zonatecno, Digital World y Magic Center (ya
registradas para celulares/equipar) como posibles vendedoras de monopatines — nunca se corrieron
contra el clasificador real de movilidad, así que no están en `MOVILIDAD_STORE_KEYS`: sólo entra una
tienda medida, no una hipótesis. Mistyle (Wix), Urban Bikes (403) y Wheele (Joomla) quedan fuera
directamente: sin contrato publicado que un adaptador pueda leer.

### `productTypeInTitle`: el flag que hizo entrar a voltbike y loopbikes

`matchesCategory()` (`classes/equipar/classify.ts`) siempre testea `include` contra el TÍTULO — el
contexto (categoría/tag de una tienda) sólo puede vetar (`exclude`/`NOT_A_PRODUCT`), nunca conceder
un match. Voltbike y Loop publican sus e-bikes/e-scooters reales bajo marca/modelo puro ("SuperVolt",
"Loop Cruiser", "Michael Blast Outsider Sport") sin la palabra "eléctric[oa]" en ningún lado del
título — sólo en el `product_type` propio de Shopify ("Bicicleta Eléctrica", "Motopatín Eléctrico").
Medidas así, las dos tiendas midieron CERO productos aceptados.

En vez de aflojar el `include` (lo que también admitiría "Loop Craft Kids 24"", una bici manual con
`product_type: "Bicicleta"`, nunca "Bicicleta eléctrica"), `RetailStore.productTypeInTitle`
(`classes/retail/types.ts`, opt-in, sólo Shopify) hace que el adaptador (`titleWithType`,
`classes/retail/sources/shopify.ts`) anteponga el `product_type` no vacío al título ANTES de
clasificar — "SuperVolt" pasa a "Bicicleta Eléctrica SuperVolt" — salvo que el título ya lo diga (evita
duplicar). Es por tienda y sólo se activa después de medir: un `product_type` vale exactamente lo que
el comerciante haya tipeado, y un "Accesorio"/"Repuesto" compuesto igual tiene que pasar el `exclude`
como cualquier otro título (de ahí el `accesorio`/`accesorios` agregado a las exclusiones, arriba). El
mismo helper es el que usa `scripts/oneoff/movilidad_dry_run.ts` para no mantener una segunda copia de
la lógica que pudiera divergir de producción.

## Presupuestos del puente compartido y ventanas silenciosas

`sync_movilidad.ts` reusa `classes/retail/harvest.ts` — el mismo cosechador y el mismo puente de
MercadoLibre (`:9656`) y la misma sesión de Facebook (el Chrome del perfil por CDP, con candado) que
sillas, autos, alquileres y equipar—, con un presupuesto
propio, mucho más chico que el de equipar (dos categorías y cinco tiendas contra 38/16):

| | diaria | horaria (`--fast`) |
|---|---|---|
| búsquedas de ML | 16 | 6 |
| consultas de Facebook | 8 | 2 |
| consultas por tienda | 16 | 6 |

Fijo en código (`ML_MAX_SCANS`/`FB_MAX_QUERIES`/`STORE_MAX_QUERIES`, `sync_movilidad.ts`), no una env
de pm2 — `scripts/deploy-backend.sh` sólo reaplica el `ecosystem.config.js` de una app cuando cambia
su cron, así que un env agregado después nunca llegaría a una app ya registrada en el VPS.

**La diaria lee Marketplace a fondo (desde 2026-10-14).** Ocho listas: las cuatro palabras y la primera
de cada categoría partida por el filtro de precio de Facebook (`fbPriceBands`: monopatín hasta
$ 15.000 y más; bicicleta hasta $ 30.000 y más), 30 rondas cada una en vez de 8 (`FB_DEPTH`, reloj de
15 minutos). Medido contra lo que el directorio mostraba (avisos vistos en 4 días): a 8 rondas las
cuatro palabras encontraban 12 avisos aceptados que no estaban; a 30, 310 —ninguna lista se había
terminado y un tercio de sus tarjetas seguían siendo aceptadas en la última página—, y las bandas
sumaban 215 más (monopatín de más de $ 15.000: 85). «monopatin xiaomi» (4) y «e-bike» (36 tarjetas en
total) quedaron afuera. La horaria no cambia: 3 rondas, dos listas que rotan por hora.

**Los horarios evitan pisar a todos los demás consumidores del mismo puente** (comentario de
`ecosystem.config.js`, junto a los dos jobs): sillas horaria `:23`, autos horaria `:29` y su barrida
diaria secuencial `07:43`, celulares (rama aparte) horaria `:37` y diaria `14:29`, alquileres horaria
`:47`, equipar horaria `:53` y diaria `12:47`. `currency-movilidad` diaria corre a **`33 15 * * *`**
(15:33 UTC) y `currency-movilidad-hourly` al minuto **`:07`** — los dos huecos libres de esa lista.
**Un horario diario también se compara contra los minutos horarios**, no sólo contra las otras
diarias: un job horario corre ese minuto de TODAS las horas, así que la diaria a las 15:47 se habría
cruzado con la de alquileres una vez por día, todos los días (lo encontró la revisión final de la
rama, con el minuto ya elegido y el comentario del `ecosystem.config.js` listando `:47` dos líneas
más arriba). Un
429 de MercadoLibre dejaría al puente 10 minutos respondiendo por su proxy residencial **para todos
los jobs que lo usan**, no sólo el que lo disparó (medido y documentado en `docs/app/AUTOS.md`), así
que agregar un consumidor sin revisar los minutos de los demás arriesgaría gatillar esa penalidad
para el resto.

## Los jobs (`sync_movilidad.ts`)

| app pm2 | script | cron UTC | qué hace |
|---|---|---|---|
| `currency-movilidad` | `dist/sync_movilidad.js` | `33 15 * * *` | corrida completa: presupuesto diario de las tres fuentes, guarda catálogo + foto de tiendas |
| `currency-movilidad-hourly` | `dist/sync_movilidad.js --fast` | `7 * * * *` | sólo precio: presupuesto horario, sin Fenicio (esta lista de tiendas no tiene ninguna), mezcla la foto de tiendas de la diaria |

`main()` nunca llama `process.exit`: cada refusal es un `Error` lanzado, y `main` está exportado y
sólo se autoinvoca detrás de `require.main === module`, así que `tests/movilidad/dry_run.test.ts` lo
llama directo con cada colaborador mockeado — mismo patrón que `sync_equipar.ts`.

**`--dry-run` funciona incluso sin `APP_MONGO_URI`/`MONGO_URI` configurada.** Salta cargar el
catálogo anterior, contar lo guardado y leer la foto de tiendas — y NUNCA abre una conexión, tenga o
no la env configurada — en vez de conectar sólo para leer cuando la corrida no podría escribir de
todos modos; avisa por consola cuál de los dos casos es.

**La foto de tiendas** (`saveStoreSnapshot`/`loadStoreSnapshot`, `classes/movilidad/store.ts`) reusa
tal cual — sin copiar — las funciones genéricas de `classes/equipar/storeSnapshot.ts`
(`storeSnapshotRows`, `storeSnapshotBytes`, `mergeStoreSnapshot`, `STORE_SNAPSHOT_MAX_BYTES`): son
genéricas sobre `RetailListing[]` y no llevan nada específico de equipar más allá de una clave de
Mongo, que este archivo provee la suya. Sólo la corrida diaria la escribe (después de un publish
exitoso — una corrida flaca ya tiró antes de llegar ahí), y sólo la horaria la lee y mezcla: fresco
siempre gana, una fila de más de 36 horas se descarta, y MercadoLibre/Facebook nunca vienen de la
foto. Guardarla/leerla va en su propio `try/catch`: un fallo nunca cuesta el catálogo ya guardado ni
tumba la corrida horaria, que sigue con lo que trajo esta hora si la foto no se pudo leer.

**Una corrida flaca no pisa una buena** (`THIN_RUN_FLOOR = 0.4`): si ya había algo guardado
(`storedCount > 0`) y los ítems con precio de esta corrida caen por debajo del 40 % de eso, el job
tira un `Error` y el catálogo anterior queda intacto. La primera corrida nunca puede activar esta
guarda (`storedCount` es 0).

**Pricewatch, vertical `movilidad`.** Después de guardar el catálogo, en su propio `try/catch` (un
fallo acá nunca cuesta el catálogo recién guardado), llama a `recordPricewatch(guarded.listings,
"movilidad")` — sin `productKeyFor` propio, a diferencia de celulares: la mayoría de lo que entra acá
sí puede traer `catalogId` de MercadoLibre, así que la clave por defecto (`ml:<catalogId>`, o `null`
si no hay) alcanza. Se registra sobre `guarded.listings` (los avisos post-guarda-de-unidad de ESTA
corrida), nunca sobre la lista ya mezclada con la foto de tiendas — un aviso que vino de la foto de
ayer no se vio HOY. Ver [PRICEWATCH.md](PRICEWATCH.md).

## Colecciones (APP DB)

- **`movilidaditems`** (`classes/models/MovilidadItem.ts`, espejo `app/server/models/MovilidadItem.ts`)
  — un documento por categoría+variante (`EquiparItem`, historial diario hasta 365 puntos).
- **`movilidadmeta`** (`classes/models/MovilidadMeta.ts`, espejo `app/server/models/MovilidadMeta.ts`)
  — un documento: corrida, fuentes, categorías sin cobertura. Sin `baskets` (no hay canasta acá).
- **`movilidadstoresnapshots`** (`classes/models/MovilidadStoreSnapshot.ts`) — **sin espejo en `app/`**,
  a propósito: sólo la horaria del propio backend la lee, igual que `equiparstoresnapshots`.
- **`movilidadlistings`** (`classes/models/MovilidadListing.ts`, espejo
  `app/server/models/MovilidadListing.ts`) — **una fila por aviso** que la banda aceptó, para el
  directorio con filtros de las dos páginas (2026-09-22). La FORMA es la de `equiparlistings`
  (`EquiparListingRow`) y el tipo es el mismo a propósito: `buildEquiparListings` devuelve esa fila
  sea cual sea el registro inyectado, así que declarar una paralela sólo habilitaría que las dos
  deriven. La COLECCIÓN es aparte porque un monopatín no puede aparecer en el directorio de equipar
  la casa. Las filas `suspect` se guardan (para poder publicar el conteo) y **nunca se sirven**;
  poda a 30 días con el mismo corte de equipar (`equiparListingPruneCutoff`). Las escriben las dos
  corridas, la diaria y la horaria, con el `observedAt` que cada aviso realmente tiene.
- `pricewatchoffers` (compartida con equipar/sillas, vertical `movilidad`; ver
  [PRICEWATCH.md](PRICEWATCH.md)).

## API y reglas de publicación

`GET /api/movilidad/<categoria>` (`app/server/api/movilidad/[categoria].get.ts`): sólo
`monopatin-electrico`/`bicicleta-electrica` existen (`isMovilidadCategorySlug`) — cualquier otro slug
da 404 **antes** de tocar la base. Cache 600 s en éxito (más corto que los 900 s de equipar: catálogo
más chico, páginas que dependen más de "cuántas ofertas, desde cuándo"). `history` nunca se
selecciona de Mongo — ninguna de las dos páginas dibuja un gráfico, así que no hay para qué mandarlo.
Un fallo de base de datos devuelve la forma vacía con `cache-control: no-store` (nunca un 404, nunca
cacheado como si el catálogo estuviera realmente vacío). Sólo trae `lastSeen` de los últimos 4 días
(`STALE_DAYS`): una pizarra congelada no encabeza "cuánto sale hoy".

Reglas de publicación, heredadas de equipar sin reescribirlas:

- **Nuevo y usado jamás se promedian.** Dos bandas siempre, `newBand`/`usedBand`, cada una con su
  propio piso de muestra y su propio "sin datos suficientes" cuando no llega
  (`movilidadPrecioTipicoAnswer`/`movilidadUsadoAnswer`, `app/utils/movilidad.ts`) — nunca un número
  inventado para no dejar un hueco en la tarjeta.
- **Un vendedor de MercadoLibre sin identificar nunca se lee como si "Mercado Libre" vendiera algo.**
  `movilidadSellerLabel` reescribe el nombre reservado `"Mercado Libre"` (sólo cuando `source ===
  'mercadolibre'`) a `"Vendedor sin identificar (Mercado Libre)"` — una tienda o un vendedor de
  Facebook que casualmente se llamara así es un bug distinto y esta función no lo tapa.
- **Un enlace "(ficha)" hacia una tienda sólo aparece si esa tienda tiene ficha publicada.** Las dos
  páginas resuelven `storeSlugForSeller(seller)` contra `useStoreProfileKeys()` (la misma lista
  compartida con `/equipar-casa-uruguay` y `/sillas-escritorio-uruguay`) y sólo entonces arman el
  `NuxtLink` a `/tiendas-online-uruguay/<key>` — si no, el nombre queda como texto plano. Una oferta
  de Facebook (`source === 'facebook'`) nunca enlaza, aunque el nombre resuelva a una tienda curada:
  el nombre visible de un particular en Marketplace no es la identidad de una empresa. `delcar`,
  `superbikers`, `voltbike` y `loopbikes` entraron al registro curado de tiendas
  (`classes/stores/registry.ts`/`app/utils/storeDirectory.ts`) en el mismo tramo de trabajo que esta
  feature — ver [TIENDAS_ONLINE.md](TIENDAS_ONLINE.md) — así que sus vendedores sí pueden enlazar en
  cuanto tengan perfil escrito (`hasProfile`).
- **Productos filtrados por la banda, nunca por texto.** `movilidadPlausibleProducts` descarta
  cualquier producto de `monopatin-electrico` con `bestPriceUyu` bajo la mitad del `p25` de la banda
  nueva del ítem — la misma guarda de lectura que `equiparPlausibleProducts`, para el mismo caso: un
  documento escrito antes de un ajuste de la banda no debe abrir la tabla de modelos con un precio
  que la banda actual ya rechazaría. `bicicleta-electrica` es régimen `commodity`: no arma tabla de
  modelos en absoluto, sólo banda y ofertas más baratas.

### `GET /api/movilidad/productos` — el directorio con filtros (2026-09-22)

El mismo cuerpo que `/api/equipar/productos`, extraído a `app/server/utils/retailProductos.ts` y
compartido por las dos rutas: paginado en Mongo, cada faceta contada sobre la consulta **sin su
propio filtro** (para que el panel diga cuántas filas devolvería cada opción junto con todo lo demás
que el lector ya puso), y el conteo de sospechosos que quedaron afuera. Lo único inyectado es la
colección y de qué documento sale la fecha de la corrida, así que un arreglo en la paginación o en
una faceta vale para las dos verticales en vez de tener que copiarse.

En la página, el directorio va **adentro** de `/monopatines-electricos-uruguay` y
`/bicicletas-electricas-uruguay`, no en una ruta aparte: el lector llama "el directorio" a estas dos
páginas, y una ruta nueva obligaría a convertir cada `pages/<x>.vue` en `pages/<x>/index.vue` (si no,
Nuxt la vuelve layout padre con `<NuxtPage>`) por dos canonicals más que nadie pidió. La categoría va
fija por página (`fixed-categoria`), el botón de **«agregar a mi lista» no aparece** (esa lista es
para equipar una casa vacía: `hide-list`), y **toda URL con filtros va `noindex, follow`** — cada
combinación es una copia delgada de la misma página, igual que en `/equipar-casa-uruguay/productos`.

La foto: `EquiparItem.image` (la representativa del tipo) ya se guardaba y no se dibujaba; desde el
2026-09-22 cada OFERTA además lleva la suya (`EquiparOffer.image`, aditivo, también para equipar).
**Nunca la de Facebook Marketplace**: esas URLs son del vendedor y vencen, así que una tarjeta
construida sobre una de ésas se rompe sola en unos días — un aviso de Marketplace se dibuja con el
ícono de su categoría.

## La normativa, como dato (`app/utils/movilidadNormativa.ts`)

Una fila por departamento (los 19, orden alfabético, mismo criterio de acentos que
`costOfLiving.ts`/`rentalZones.ts` — comparado por slug con `sameDepartment`, nunca por igualdad de
cadena) con `estado` (`vigente` | `en-estudio` | `sin-norma-encontrada`), sus reglas si las hay, sus
fuentes con URL y fecha, y una nota. **Regla del archivo, sin excepción: nunca se inventa una regla.**
Si la norma citada no dice algo, ese campo es `null`; si no encontramos norma departamental, todas las
reglas van `null` y el estado es `sin-norma-encontrada` — que se lee "no encontramos una norma propia
para citar", nunca "está permitido"/"no hay restricción". Tampoco se publica un veredicto genérico
("es legal"/"es ilegal", "está prohibido usar…"): se describe lo que dice cada norma, punto por punto,
y dónde no hay norma, que no la hay.

Leídas y verificadas en vivo el 17/9/2026 (`MOVILIDAD_NORMATIVA_REVISADA`):

| departamento | estado | qué dice la fuente |
|---|---|---|
| Montevideo | `vigente` | Decreto de la Junta 37.330 (24/12/2019), arts. D.709.4-D.709.12 (`normativa.montevideo.gub.uy`): 16 años, 25 km/h (monopatines con/sin impulso propio y plataformas tipo segway), casco abrochado, alta visibilidad, por la calzada salvo donde haya infraestructura para bicicletas (ahí es obligatoria), no se empadronan (sólo L1-L7 lo hacen) |
| San José | `vigente` | Decreto Nº 3279, aprobado por unanimidad en junio de 2026 y promulgado por la Intendencia (El Observador y Primera Hora, leídas 16/9/2026 y 4/6/2026): 14 años, 25 km/h, casco, elementos reflectivos, luces, frenos en ambas ruedas, base de apoyo para los pies, dispositivo sonoro, seguro de responsabilidad civil, Registro Departamental gratuito, prohibido en veredas/espacios peatonales/rutas nacionales, una persona por vehículo |
| Canelones, Durazno, Maldonado | `en-estudio` | comisiones de sus juntas departamentales evalúan proyectos (canelonesciudad.com.uy 4/5/2026; El Acontecer 16/9/2026; la diaria Maldonado 1/4/2026) — sin decreto aprobado ni texto único para citar al 17/9/2026 |
| los otros 14 departamentos | `sin-norma-encontrada` | no encontramos una norma departamental específica al 17/9/2026 |

**La fecha de entrada en vigencia de San José NO se publica** porque ninguna fuente oficial la
confirma: el decreto está aprobado y promulgado, pero ni El Observador ni Primera Hora publican desde
cuándo rige, y el decreto no figura en el listado de decretos de `sanjose.gub.uy` (que llega sólo
hasta 2021). Publicar una fecha ahí sería inventar el único dato que ninguna de las dos notas de
prensa ni el sitio de la Intendencia confirma.

`MOVILIDAD_NORMATIVA_NOTA_NACIONAL` deja constancia, como nota de contexto y no como regla: no existe
una ley nacional específica sobre monopatines ni bicicletas eléctricas; el Congreso de Intendentes
evalúa una norma común, y UNASEV señaló que la normativa vigente desde 2020 quedó desactualizada.
Ningún departamento se cita como si tuviera respaldo nacional.

### Recordatorio con fecha: revisar antes del 2026-11-01

Este es el tema que más rápido cambia de todo lo que el sitio publica con norma citada. **Antes del
1/11/2026**, releer las cinco fuentes de arriba y `MOVILIDAD_NORMATIVA_REVISADA`
(`app/utils/movilidadNormativa.ts`) para:

- **Maldonado y Canelones**: si su comisión de tránsito aprobó un decreto, `estado` pasa de
  `en-estudio` a `vigente` con el texto real (nunca se anticipa contenido de un proyecto como si ya
  rigiera).
- **Durazno**: mismo chequeo — al 17/9/2026 sólo hay un técnico municipal evaluando exigencias, sin
  proyecto de decreto.
- **El Congreso de Intendentes**: si publica una norma común entre departamentos, reemplaza (o
  contradice) la nota nacional de contexto — en ese caso hay que revisar si sigue siendo cierto que
  "no existe una ley nacional específica".
- **San José**: si alguna fuente oficial confirma por fin la fecha de entrada en vigencia del decreto
  3279, se agrega — nunca antes.

Cambiar cualquier fila implica actualizar `MOVILIDAD_NORMATIVA_REVISADA` a la fecha de la nueva
lectura: es el campo que ambas páginas muestran como "Tabla revisada el…", y quien lo lea confía en
que la fecha significa que alguien de verdad volvió a mirar las cinco fuentes ese día.

## Las páginas

`app/pages/monopatines-electricos-uruguay.vue` y `app/pages/bicicletas-electricas-uruguay.vue`, SSR,
**sólo español** (como comparativas, sucursal, `/equipar-casa-uruguay` y `/tiendas-online-uruguay`):
canonical literal sin prefijo de idioma aunque la ruta exista bajo `/en/`/`/pt/` por
`prefix_except_default`. Comparten `<MovilidadNormativaTable>` (`app/components/movilidad/`, sin
`<h2>` propio: cada página lo envuelve en su propia sección para no duplicar nivel de encabezado).

Monopatines agrega una sección de "Modelos y sus mejores ofertas" (tabla, régimen `modelo`) que
bicicletas no tiene (régimen `commodity`: sólo banda + ofertas más baratas). Las dos traen "Cómo
elegir" (autonomía, peso, potencia declarada, freno, garantía — sin nombrar marcas ni afirmar "el
mejor"), "Si se rompe" (garantía legal Ley 17.250, enlace a
`/derechos-consumidor-compras-online`), FAQ generado con los datos del día
(`movilidadPrecioTipicoAnswer`/`movilidadUsadoAnswer`, más una pregunta fija de licencia/circulación
que remite a la tabla de normativa en vez de afirmar una regla genérica), y un bloque final "Seguí
leyendo" que enlaza a la otra página, a `/equipar-casa-uruguay` y a
`/ciberlunes-y-black-friday-uruguay`. JSON-LD: migas + hasta 10 `Product`/`Offer` (monopatines, desde
la tabla de modelos), nunca `AggregateRating`.

## Qué no se publica, y por qué

- **Un vehículo sin motor bajo estas dos categorías** (patineta, skate, bici común, juguete): el
  `include` exige "eléctric[oa]"/"e-" explícito en el título; nunca se infiere motor de un precio alto
  ni de ninguna otra señal.
- **El precio de una moto eléctrica bajo "monopatín eléctrico"**: `moto`/`motos`/`motoneta`/
  `ciclomotor` vetan aunque el título diga "eléctrica" (las líneas e-Yumbo).
- **Un triciclo o cuatriciclo eléctrico como bicicleta o monopatín**: es otro vehículo, con su propio
  decreto en San José (3278, no 3279).
- **Un kit de conversión o un motor bolt-on como vehículo de fábrica completo**: nunca se agrupa con
  las e-bikes/e-scooters reales, aunque el título mencione "eléctrica"/"eléctrico" al lado.
- **Una regla de circulación sin fuente, una fecha de vigencia no confirmada** (San José), o un
  veredicto genérico ("es legal"/"es ilegal"): se describe lo que dice cada norma citada, nunca una
  conclusión que la norma misma no dio.
- **Una recomendación de marca o "el mejor monopatín/la mejor bicicleta"**: sólo precios observados,
  con fecha y su fuente.
- **Un "mejor precio" que no pasó las guardas de banda**: los avisos descartados por `screen()` no
  arman oferta, producto ni banda — `suspectDropped` cuenta cuántos se dejaron afuera, la página lo
  dice.
- **Un enlace "(ficha)" hacia una tienda sin perfil publicado, o hacia un vendedor de Facebook**: ver
  la regla de publicación arriba.
- **Un ítem con `lastSeen` vencido** (más de 4 días): la API lo excluye antes de que la página lo vea.

## Cómo diagnosticar

- **¿Por qué una tienda no aparece en el catálogo?** Confirmar que su `key` está en
  `MOVILIDAD_STORE_KEYS` (`classes/movilidad/registry.ts`) — sólo entra la que ya midió al menos un
  producto aceptado. Correr `npx ts-node scripts/oneoff/movilidad_dry_run.ts <key>` para ver
  aceptados/rechazados con el clasificador real; si todo cae en rechazados, revisar si necesita
  `productTypeInTitle: true` (Shopify) o si su `product_type`/título nunca dice "eléctric[oa]".
- **¿Por qué un producto real no entra?** Correr el mismo dry run y mirar el top de títulos
  rechazados — casi siempre es una palabra de `MONOPATIN_EXCLUDE`/`BICICLETA_EXCLUDE` matcheando algo
  que no debería (revisar `tests/movilidad/registry.test.ts` para los casos ya cubiertos) o un título
  sin la palabra "eléctric[oa]" que ninguna tienda declara en `product_type` tampoco.
- **¿Por qué una categoría dice "sin datos suficientes"?** Revisar `uncovered` en `movilidadmeta` (el
  log de `sync_movilidad.ts` imprime una línea por fuente con avisos/ok/nota) y cuántos avisos
  pasaron `screen()` para esa variante — un piso de muestra no alcanzado es la causa más común, no un
  bug.
- **¿Por qué la corrida no escribió nada?** Buscar en el log `[movilidad] sólo N ítems con precio
  contra M guardados` (guarda de corrida flaca, `THIN_RUN_FLOOR = 0.4`) o `[movilidad] no USD
  reference rate` (sin tasa de referencia, la corrida se niega a publicar precios sin con qué
  compararlos).
- **¿Por qué la horaria no trae ofertas de tienda?** Mirar si `currency-movilidad` (la diaria) corrió
  y guardó su foto (`[movilidad] foto de tiendas: …`); la horaria imprime `sin foto de tiendas de la
  diaria` cuando no hay nada que mezclar, y descarta cualquier fila de la foto con más de 36 horas.
- **¿Por qué la tabla de normativa no cambió aunque salió una noticia nueva?** Es manual, no un job:
  hay que editar `app/utils/movilidadNormativa.ts` a mano y actualizar
  `MOVILIDAD_NORMATIVA_REVISADA` — ver el recordatorio con fecha arriba.
- **¿Por qué un vendedor no tiene enlace "(ficha)"?** Confirmar que está en el registro curado de
  tiendas (`classes/stores/registry.ts`) Y que ya tiene perfil escrito (`GET /api/stores`,
  `hasProfile`) — las dos condiciones son necesarias, ver [TIENDAS_ONLINE.md](TIENDAS_ONLINE.md).

## Ficha técnica, filtros por especificación y asesor (3/11/2026)

`/monopatines-electricos-uruguay` contestaba "cuánto sale" pero no lo que decide la compra y lo que
cualquier tienda de monopatines pone arriba de la ficha: autonomía, velocidad, potencia, peso que
soporta, peso del aparato, tiempo de carga, ruedas, frenos, plegable. Medido el 3/11/2026: la tarjeta
de búsqueda de Mercado Libre llega con `attributes: []` (por eso la faceta de marca tenía 7 avisos con
marca de 782), pero **la ficha propia de ML trae la tabla entera** (`ui-vpp-striped-specs`) y las
tiendas la escriben como texto rotulado. Sobre 22 avisos reales leídos con el código nuevo: 22 de 22
leídos, autonomía en 21, ruedas en 20, potencia en 19, velocidad y carga soportada en 18, peso y
tiempo de carga en 14. Con la primera corrida sobre una copia local de los 783 avisos, la faceta de
marca pasó de 7 avisos con marca a 486 (Xiaomi 237, Atom 46, Mistyle 39…).

**Sólo monopatín.** El código es genérico; bicicletas queda para después.

### El job `currency-movilidad-specs` (`sync_movilidad_specs.ts`, `1 * * * *`)

1. Cola (`classes/movilidad/specs/queue.ts`): monopatines frescos (4 días) y no sospechosos, nunca
   Facebook (la ficha de Marketplace exige la sesión; lo único público es el título). Tiendas primero,
   después ML nunca leídos, después relecturas. 60 por corrida a 3 s, tope 8 min
   (`MOVILIDAD_SPECS_MAX` / `_GAP_MS` / `_MINUTES`). A los :01, en el hueco de los consumidores
   horarios del puente de ML (movilidad :07, sillas :23, autos :29, celulares :37, motos :44,
   alquileres :47, equipar :53).
2. **Toda lectura se guarda**, buena o mala, en la colección privada `movilidadspecs`. La mala vuelve
   con espera de 1, 3 y 7 días y a la cuarta falla seguida se abandona por un mes; un aviso que ya no
   existe (404/410) espera 7 días y no cuenta como falla. Una página 200 SIN
   ficha es falla y no "borrado": es el aspecto de un desafío anti-bot, y contarlo como borrado mandaría
   la cola entera 7 días afuera sin que el corte se entere. Es la
   lección de Casasweb (9-10/10/2026): no guardar la falla + orden determinista + corte por fallas
   seguidas = cola trabada para siempre. Cortan cinco pedidos seguidos sin respuesta o sin ficha. Una
   relectura que falla, o que carga pero no trae ficha, no borra la ficha buena anterior
   (`write.ts`); si la mitad de las leídas no trae datos, el log avisa `ALERTA`. Ficha buena se relee a
   los 45 días.
3. Lectura (`read.ts`): **ML = el puente propio, `/product/<id>`** (tabla `specifications` +
   descripción + marca/modelo). La primera corrida en producción (3/11/2026 23:37 UTC) leyó las 19
   fichas de tiendas y cortó en las de ML: desde la IP del VPS toda página de producto de ML (`/up/`,
   `/p/`, `articulo.`) redirige a `/gz/account-verification`, el muro de login — los clasificados
   (`auto.`, `casa.`) siguen abiertos, por eso autos-detail y rentals-ml-detail no lo ven. El muro no se
   rodea con otra IP: se usa la vía que el repo ya tiene para ML. El puente acepta ids de producto de
   usuario (`/up/MLUU…`) y de catálogo (`/p/MLU…`), 609 de 618 avisos; los 9 `articulo.…` no tienen id
   y la cola no los pide (quedan con lo del título). La guarda de "página 200 sin ficha = falla" fue la
   que hizo cortar la corrida en vez de marcar 90 avisos como borrados. Shopify =
   `<producto>.json` (`body_html`, `vendor` como marca); resto de tiendas = HTML sin scripts, cortado en
   "Productos relacionados". UA propia `MOVILIDAD_SPECS_USER_AGENT`.
4. Reaplica la ficha a TODAS las filas frescas de `movilidadlistings` con `enrichMovilidadRow`
   (`enrich.ts`), la misma función que usa `sync_movilidad.ts` antes de guardar: si sólo la aplicara
   este job, la horaria de movilidad volvería a dejar la marca vacía cada hora. Si la colección de
   fichas no se puede leer, `sync_movilidad.ts` guarda las filas sin `specs`/`uyuPerKm` en el `$set`
   (lo guardado sobrevive).
5. Guarda el snapshot `movilidadspecsnapshots` (`key: monopatin-electrico`): candidatos del asesor
   (sólo avisos con ficha propia, no sospechosos, nunca Facebook) y medianas por tipo. Las medianas
   cuentan sólo lo que dijo la ficha o la descripción, nunca el título, y exigen 5 datos.

### El parser (`parse.ts`, puro)

- Tabla de ML (`mlSpecRows`, HTML o JSON escapado) → `specsFromRows`; texto → `specsFromText` en tres
  pasadas: pares con dos puntos ("Ruedas: 8,5”", una tabla) antes que pares sueltos ("Rodado 10") y los
  dos antes que la prosa ("45 km de autonomía"). Superbikers dice "rodado 10”" en la prosa y "Ruedas:
  8,5”" en su tabla: gana la tabla.
- Rangos hacia el lado conservador del filtro: autonomía y carga soportada toman el extremo bajo
  ("20–25 km" → 20); peso del aparato, tiempo de carga y velocidad, el alto.
- "Potencia máxima"/"pico" va a `motorPeakW`, nunca a `motorW` ("motor de 600 W (potencia máxima)").
- Millas, mph y libras se convierten sólo con la unidad escrita.
- Bandas de cordura (`SPEC_BANDS`): fuera de banda el campo queda en `null`, no se corrige ("Largo =
  100 m" en una ficha real de un infantil).
- Título (`specsFromTitle`): lo mismo, más "45km" suelto como autonomía (en un título sólo puede ser
  eso; "25 km/h" no). Procedencia por campo en `specs.from` (`ficha` | `descripcion` | `titulo`).
- Marca (`brands.ts`): la de la ficha salvo genéricos ("Monopatin", "Genérica"); si no, la primera
  marca conocida del título ("Go Green Mod. Zero" es Gogreen, por eso Zero no está en la lista).

### Directorio: filtros, facetas y órdenes

Sólo con `vertical: 'movilidad'` (equipar normaliza exactamente como antes; el `toEqual` de su test
no cambió): `autonomia` (mínimo km), `velocidad` (`hasta-25`|`25-35`|`mas-35`), `potencia` (tramos),
`potenciaMin` (la que pide el asesor: un tramo no puede decir "350 W o más"), `carga` (mínimo kg),
`peso` (máximo kg), `rueda`, `rasgos` (`plegable,suspension,disco,app`), `ficha=1`. Órdenes nuevos sólo
para monopatín: mayor autonomía, menor precio por km (`uyuPerKm`, sólo con autonomía de ficha) y más
liviano — estos dos dejan afuera a los avisos sin el dato en vez de ponerlos primero. Facetas
(`server/utils/monopatinFichaFacets.ts`): un `$group` con `$cond` por opción, cada dimensión sin su
propio filtro; **toda condición va con `$isNumber`**, porque en agregación `null` es menor que
cualquier número y "hasta 25 km/h" contaría a todos los que no declaran velocidad. Un aviso sin el
dato no cumple ese filtro, y el panel lo dice con el conteo de los que tienen ficha.

### El asesor "¿Cuál te conviene?" (`utils/monopatinAsesor.ts`)

Corre en el navegador sobre `/api/movilidad/monopatin-asesor` (sólo lee el snapshot, caché 300 s,
`server: false`): los controles responden en el acto, como el comparador de transporte. Reglas
publicadas en la página: autonomía real 65 % de la declarada (55 % sobre 90 kg), carga soportada ≥
peso + 10 kg, 350 W con algunas subidas y 500 W con muchas, liviano ≤ 15 kg. Tres elecciones con nombre
y porqué: la más barata que cumple, más kilómetros por tu plata, y la más liviana (si lo carga o es llano)
o la más potente. Si declara más de 25 km/h lo dice contra la norma de Montevideo y San José, nunca
"ilegal". Si nadie cumple, nombra el requisito que más deja afuera. El botón lleva los mismos
requisitos al directorio (`asesorQueryFicha`).

### En la página

Asesor después de "Cuánto sale hoy, por tipo"; columna "Ficha técnica" en la tabla de modelos (la
ficha de la primera oferta del modelo con ficha propia, `$in` acotado en `/api/movilidad/<categoria>`);
franja de ficha en cada tarjeta del directorio (`MovilidadSpecStrip`, sólo si el aviso trae `specs`:
equipar no cambia); "Qué esperar de cada tipo" con las medianas y el costo de una carga (batería
mediana × UTE simple 101–600 kWh con IVA + 15 % de pérdida del cargador); "Cómo elegir" y cuatro
preguntas frecuentes con esas cifras; `Product.additionalProperty` en el JSON-LD.

## Páginas por modelo y comparador (4/11/2026)

**Por qué.** La tabla "Modelos y sus mejores ofertas" salía del régimen `modelo` de equipar, que
identifica por el texto entero del título: en producción eran 23 "productos" con un aviso cada uno
("Xiaomi 5 Max" tres veces). Con la marca y el modelo que trae la ficha de ML, los 774 avisos vivos
daban 190 grupos y 37 con dos vendedores o más. Y la ficha de entidad es lo que rankea (sillas,
celulares, autos); el hub no.

**Identidad** (`classes/movilidad/models/identify.ts`, puro). Precisión sobre recall:
- la marca es la del aviso (ficha → título); una marca desconocida que el título no nombra suele ser
  el vendedor ("Like Latam") y no da modelo;
- el modelo son hasta tres palabras que siguen a la marca, salteando genéricas al principio
  ("Monopatín Eléctrico Electric Xiaomi Scooter 5 Pro 25km/h" → `xiaomi-5-pro`) y cortando en la
  primera medida (`350w`, `25 km`), color, conector, número pelado > 99 o número después de un código
  ("Sgx3 10", "E9pro 25");
- `e9pro` se parte en `e9 pro` (sufijo de gama pegado), el guion separa, "Move 2.0" es `move-2`, y la
  generación se escribe de cinco formas (`Gen2`, `Gen 2`, `2nd`, `2da Gen`, `segunda`) que son `gen2`;
- el modelo de la ficha se usa si el título no trae, o si el título es ese mismo modelo con ruido
  ("Enxuta 45 Meenx552n" con ficha MEENX552N), **nunca para sacarle la gama** (un "6 Pro" con ficha
  "Electric Scooter 6" sigue siendo 6 Pro);
- los avisos del mismo producto de catálogo de ML (`/p/MLU…`) toman el modelo mayoritario.
Facebook nunca entra. Nunca se une por precio, foto ni parecido de texto.

**Catálogo** (`classes/movilidad/models/build.ts`), escrito por `currency-movilidad-specs` en APP DB
`movilidadmodels` después del re-enriquecimiento:
- un modelo con un solo aviso no se publica;
- ofertas una por aviso, la más barata primero (tope 40); bandas nuevo y usado separadas;
- **ficha de consenso**: por campo numérico la MODA si un valor se repite más que los demás, si no la
  mediana BAJA — nunca un promedio: con 12 V y 48 V la mediana par publicaba 30 V, que ninguna ficha
  dijo (Mistyle ME500, 4/11). `agree` dice cuántas fichas coinciden con el valor (±5 %) y `spread`
  el rango cuando no coinciden; la página muestra el rango si coincide menos de la mitad;
- `indexable` = dos vendedores o más y tres datos numéricos de ficha; si no, la página va `noindex,
  follow` y no entra al sitemap;
- `history`: un punto diario `{ newMin, newMedian, n }` desde el 4/11 (tope 400). No se dibuja
  todavía: no se reconstruye hacia atrás, así que se empieza a guardar ya;
- un modelo que deja de verse conserva su documento; la API sólo sirve `lastSeen` de los últimos 7
  días (después 404). Corrida que arma menos del 40 % de los modelos frescos guardados: no escribe
  modelos ni toca el `modelSlug` de los avisos.

Medido el 4/11 sobre los 774 avisos: 54 modelos, 41 indexables, 386 avisos enlazados (Xiaomi 6 Lite:
36 avisos de 11 vendedores).

**App.** `GET /api/movilidad/modelos` (resúmenes) y `/api/movilidad/modelos/<slug>` (modelo + hasta 4
del mismo tipo con el precio más parecido); slug malo 404 sin base, base caída 503 no-store.
- `/monopatines-electricos-uruguay/<modelo>` (`pages/monopatines-electricos-uruguay/[modelo].vue`):
  nuevo/usado desde, todas las ofertas, ficha con "N de M fichas" o el rango, autonomía real (65 %) y
  costo de carga con la tarifa de UTE, normativa si declara más de 25 km/h, "Comparalo con", FAQ.
  `Product` + `AggregateOffer` sólo con ofertas nuevas. Título con el precio (`monopatinModelTitle`,
  forma corta "Monopatín Xiaomi 6 Pro: desde $ X" si el nombre largo no entra en 60).
- `/monopatines-electricos-uruguay/comparar?m=a,b,c`: hasta 3 modelos, el mejor de cada fila marcado
  sólo donde más (o menos) es mejor — la velocidad no se premia (25 km/h en Montevideo y San José), ni
  el voltaje, la capacidad o la rueda. `noindex`, en `EXCLUDED_ROUTES`.
- El hub pasó a `pages/monopatines-electricos-uruguay/index.vue` (misma URL). Su tabla de modelos lee
  el catálogo nuevo (con casilla "Comparar" y bandeja fija) y cae a la tabla vieja si está vacío. Las
  tarjetas del directorio y las elecciones del asesor enlazan a su modelo (`modelSlug`).
- Enlaces a la familia literales, sin `localePath`: es sólo español, como las fichas de celulares.

## Tests

- `tests/movilidad/registry.test.ts` — forma del registro (claves sin colisión con equipar, room
  `movilidad`, régimen por categoría, variante por defecto), `MOVILIDAD_STORE_KEYS` sólo tiendas
  habilitadas, positivos/negativos medidos de cada categoría, el umbral de alto rendimiento, los dos
  rounds de fix (`productTypeInTitle` compuesto, kit/motor de conversión).
- `tests/movilidad/store.test.ts` — documentos propios (nunca los de equipar), paridad de campos con
  el espejo de `app/`, `withHistory` (primera vez, agrega sin perder ayer, no duplica el mismo día,
  recorta a 365).
- `tests/movilidad/dry_run.test.ts` — `main()`: se niega sin `APP_MONGO_URI` fuera de `--dry-run`,
  `--dry-run` nunca escribe ni conecta (con o sin la env configurada), la primera corrida nunca
  bloquea, la guarda de corrida flaca, la mezcla de foto de tiendas y su límite de 36 horas.
- `app/tests/unit/movilidad.test.ts` — helpers de `app/utils/movilidad.ts`: orden de ítems, filtro de
  productos plausibles, recorte de proyección, rótulo de vendedor sin identificar, ofertas más
  baratas, respuestas de FAQ.
- `app/tests/unit/movilidadApi.test.ts` — `GET /api/movilidad/<categoria>`: 404 real para un slug que
  no existe, forma de la respuesta, `cache-control` en éxito y en fallo de base.
- `app/tests/unit/movilidadNormativa.test.ts` — nunca una regla inventada (todo lo `null` que la
  fuente no dice), `sameDepartment` resuelve variantes con/sin tilde, el resumen cuenta bien los tres
  estados.
- `app/tests/unit/movilidadPages.test.ts` — las dos páginas: H1, canonical sin idioma, secciones
  presentes/ausentes según régimen, JSON-LD sin `AggregateRating`.
- `app/tests/unit/movilidadStoreLinks.test.ts` — el enlace "(ficha)" sólo aparece con
  `useStoreProfileKeys()` conteniendo la clave, nunca para una oferta de Facebook.
- `tests/appdb/schema_parity.test.ts` — `movilidaditems`/`movilidadmeta` declaran los mismos campos
  en los dos lados (`movilidadstoresnapshots` queda afuera a propósito: no tiene espejo en `app/`).
- `tests/pricewatch/record.test.ts` — el mecanismo genérico que también graba la vertical
  `movilidad` (ver [PRICEWATCH.md](PRICEWATCH.md)).

## Marketplace: un sinónimo por categoría y rotación (11/10/2026)

Facebook buscaba sólo «monopatin electrico» y «bicicleta electrica», aunque el `include` de cada
categoría ya acepta «scooter eléctrico» y «bici eléctrica». Se suman esas dos búsquedas: la diaria lee
las cuatro (tope 6) y la horaria dos, otro par cada hora (`fbRotation`, como equipar).
