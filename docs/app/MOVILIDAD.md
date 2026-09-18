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
MercadoLibre (`:9656`)/Facebook (`:9657`) que sillas, autos, alquileres y equipar—, con un presupuesto
propio, mucho más chico que el de equipar (dos categorías y cinco tiendas contra 38/16):

| | diaria | horaria (`--fast`) |
|---|---|---|
| búsquedas de ML | 16 | 6 |
| consultas de Facebook | 6 | 2 |
| consultas por tienda | 16 | 6 |

Fijo en código (`ML_MAX_SCANS`/`FB_MAX_QUERIES`/`STORE_MAX_QUERIES`, `sync_movilidad.ts`), no una env
de pm2 — `scripts/deploy-backend.sh` sólo reaplica el `ecosystem.config.js` de una app cuando cambia
su cron, así que un env agregado después nunca llegaría a una app ya registrada en el VPS.

**Los horarios evitan pisar a todos los demás consumidores del mismo puente** (comentario de
`ecosystem.config.js`, junto a los dos jobs): sillas horaria `:23`, autos horaria `:29` y su barrida
diaria secuencial `07:43`, celulares (rama aparte) horaria `:37` y diaria `14:29`, alquileres horaria
`:47`, equipar horaria `:53` y diaria `12:47`. `currency-movilidad` diaria corre a **`47 15 * * *`**
(15:47 UTC) y `currency-movilidad-hourly` al minuto **`:07`** — los dos huecos libres de esa lista. Un
429 de MercadoLibre dejaría al puente 10 minutos respondiendo por su proxy residencial **para todos
los jobs que lo usan**, no sólo el que lo disparó (medido y documentado en `docs/app/AUTOS.md`), así
que agregar un consumidor sin revisar los minutos de los demás arriesgaría gatillar esa penalidad
para el resto.

## Los jobs (`sync_movilidad.ts`)

| app pm2 | script | cron UTC | qué hace |
|---|---|---|---|
| `currency-movilidad` | `dist/sync_movilidad.js` | `47 15 * * *` | corrida completa: presupuesto diario de las tres fuentes, guarda catálogo + foto de tiendas |
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
