# Celulares en Uruguay (`/celulares-uruguay`)

Directorio de precios de celulares nuevos en Uruguay: MercadoLibre + 9 tiendas locales, agrupados
por modelo (marca + familia + almacenamiento), con una banda de precio por condición (nunca
mezcladas) y la cuenta de si conviene traerlo de Estados Unidos en vez de comprarlo acá. Diseño:
`docs/superpowers/specs/2026-09-16-directorios-de-producto-design.md` (plan C del ledger
`.superpowers/sdd/2026-09-16-directorios-c-celulares/`).

## Identidad del modelo (`classes/phones/identify.ts`)

Un título de MercadoLibre o de una tienda se convierte en `{ brand, family, storageGb, key, name }`
sólo si el título mismo lo dice — nada se adivina para completar un hueco, porque todo lo que sigue
(agrupar, comparar precios) cuelga de `identity.key`. **La regla de oro es precisión sobre recall**:
un título que no se puede leer con confianza devuelve `null` y se pierde, en vez de publicarse medio
adivinado. Medido a mano sobre la muestra real de títulos del 16/9/2026
(`docs/superpowers/plans/2026-09-16-celulares-titulos-muestra.txt`): **240 de 271 títulos
identificados**, 31 `null` auditados uno por uno.

**El almacenamiento es parte de la identidad, no una variante.** Un iPhone 17 Pro de 128 GB y uno de
256 GB son dos productos distintos a dos precios genuinamente distintos — promediarlos inventaría un
número que no describe a ninguno, la misma lección que PRECIOS.md/EQUIPAR.md ya codifican para
"nuevo y usado nunca se promedian", aplicada a otro eje. La clave (`key`) es
`${brand}-${family}-${storageSlug}` (`storageSlug` escribe `256gb` o, para 1024/2048, `1tb`/`2tb`,
nunca `1024gb`) y es exactamente lo que junta un aviso de una tienda con uno de MercadoLibre del
mismo modelo real.

**La guarda de variante no consumida.** Cada parser de marca (Apple, Samsung, Motorola, Xiaomi,
Honor tienen el suyo; el resto cae en un parser genérico) reconoce su propia gramática de sufijos
(`pro`, `plus`, `ultra`…), pero un título real siempre puede traer un sufijo que ESE parser no
anticipó ("Honor 400 Smart" vs. "Honor 400" liso, "Redmi A3 Pro" vs. "Redmi A3"). Cuando la palabra
inmediatamente después de donde terminó el match es una de las variantes conocidas
(`pro|plus|max|ultra|lite|mini|smart|neo|prime|power|play|fusion|edge|fe|s|x|t|e|i|c|g`) y el propio
parser NO la consumió como parte de su gramática, la identidad entera se anula (`null`) en vez de
publicar el modelo base. **Fusionar dos teléfonos reales bajo una misma clave es peor que perder un
aviso**: un aviso perdido sólo cuesta recall, una fusión corrompe la comparación de precio de los
dos modelos. Las palabras de conectividad (5G/4G/LTE/NFC/Dual/Sim) están deliberadamente afuera de
esta lista — describen la red, no el modelo, y nunca deben bloquear un match bueno.

**La regla del bulto ("+ funda de regalo").** Un aviso real de MercadoLibre dice a menudo "iPhone 17
Pro Max (256 Gb) - Nuevos + Funda De Regalo": sigue siendo un teléfono, no una funda. Bloquear todo
título que mencione una palabra de accesorio en cualquier parte castigaba exactamente a los
vendedores que describían su regalo — 9 de 13 títulos reales rechazados en una corrida de prueba de
ML eran teléfonos así. Por eso la exclusión de accesorio sólo mira el título **ANTES** de un marcador
de bulto (un "+"/"plus" seguido, en cualquier punto posterior del título, de una palabra de
accesorio o de "regalo"/"obsequio"/"incluye"; o una cláusula como "con regalo"/"de regalo"/"incluye"
en cualquier parte). Un "+" que es parte del propio nombre del modelo ("Redmi Note 14 Pro+",
"Galaxy S25+") o de una combinación de specs ("8gb+256gb") nunca cuenta como bulto: ambos casos caen
ANTES del final de la identidad ya reconocida, nunca en la cola que este chequeo escanea. Ruling del
controlador: un accesorio después de un "+" cuenta como bulto aunque NO haya palabra de regalo
explícita ("Samsung Galaxy S25 256gb + Funda Silicona" se lee como el teléfono, no como la funda) —
el propio hecho de que el título ya declaró el almacenamiento del teléfono antes del "+" es evidencia
fuerte de que es un teléfono, y una funda no tiene motivo para declarar cuánto almacenamiento tiene
un teléfono ajeno.

**Palabras de repuesto ("batería"/"pantalla"), sólo como specs.** La mayoría de las palabras de
exclusión ("flex", "housing", "chasis", "placa", "carcasa"…) nunca son un spec legítimo de un
teléfono en venta — sólo aparecen en un aviso que vende el REPUESTO. Pero "batería" y "pantalla" se
usan de las dos formas en títulos reales: "Batería 5000mah" es un spec del teléfono, "Bateria
Original Samsung S24 Ultra… + Instalacion" es un repuesto. La distinción es posicional: cuenta como
spec sólo si un número/unidad aparece INMEDIATAMENTE después de la palabra ("bateria 5000mah") o
dentro de una ventana más amplia inmediatamente antes ("6500 mAh Batería Azul") — nunca al revés (un
repuesto siempre pone la palabra primero, con marca/"original"/"compatible" después, no un dígito
pegado). "Tapa" tiene el mismo problema con un matiz propio: "Con Tapa" es una frase de condición
ordinaria (el teléfono conserva su film/sello original), así que sólo se excluye la frase compuesta
("tapa trasera"/"tapa de bateria") que sí nombra la pieza física, nunca la palabra sola.

## Fuentes (`classes/phones/spec.ts`)

MercadoLibre (categoría `MLU1055` + 22 búsquedas de texto por familia, ver `PHONE_SPEC.mlQueries`)
más 9 tiendas uruguayas, verificadas a mano el **2026-09-17** (plataforma alcanzable, moneda leída
de un producto real, al menos una URL/aviso de teléfono encontrado) antes de agregarlas:

| tienda | plataforma | moneda | lo medido |
|---|---|---|---|
| `claro` | fenicio | UYU | 85 URLs del sitemap que matchean el hint de celular |
| `zonatecno` | fenicio | USD | 245 URLs; un iPhone 17 Pro outlet de muestra en USD |
| `nstore` | fenicio | USD | 76 URLs; un iPhone 17 Pro Max de muestra en USD |
| `zonalaptop` | fenicio | USD | 4 URLs (catálogo chico, sobre todo notebooks); un Oppo Reno 11 de muestra en USD |
| `market` | fenicio | UYU | 233 URLs; un Redmi 17 de muestra en UYU |
| `magiccenter` | fenicio | USD | 9 URLs (sobre todo electrodomésticos); un iPhone 13 de muestra en USD |
| `dimm` | fenicio | USD | 300 URLs del sitemap |
| `covercompany` | shopify | UYU | 51 de 250 productos muestreados |
| `digitalworld` | woocommerce | USD | Store API `search=iphone` trae iPhone 16/16 Plus reales (más soportes de teléfono, ya rechazados por `isPhoneTitle`); `currency_code` USD, `currency_minor_unit: 2` |

**`thotcomputacion` y `tyt` se midieron y se descartaron**, no por falla de plataforma — las dos
APIs contestan bien — sino porque **no venden celulares hoy**: `thotcomputacion` devuelve cero
teléfonos en cada término de búsqueda (monitores, tablets, un control de Razer); `tyt` (ya
registrada para sillas/equipar) devuelve lo mismo en una muestra casi completa (500 de sus ~515
productos): electrodomésticos, herramientas y ACCESORIOS de teléfono, nunca un teléfono. Una tienda
sin nada que aceptar es una barrida diaria desperdiciada, y algo peor que un no-op inofensivo: es una
fila más de "0 aceptados" que una persona tiene que leer de más todos los días para ver las que sí
importan.

**Facebook Marketplace no se usa en absoluto para celulares** (`fbQueries: []`). Un título de
Marketplace casi nunca trae marca+familia+almacenamiento los tres juntos ("iPhone 13 en buen
estado", sin GB en ningún lado), así que nada de ahí podría pasar `identifyPhone` de forma confiable.
Los usados igual llegan al catálogo — a través de la condición `used` que MercadoLibre sí declara —
sin que los títulos poco fiables de Marketplace contaminen el match de identidad.

**El puente de MercadoLibre (`:9656`) tiene presupuesto y ventana silenciosa.** La corrida diaria pide
40 búsquedas de ML y hasta 12 consultas por tienda; la horaria (`--fast`) pide sólo 8 búsquedas de ML
y 6 por tienda, y salta las 7 tiendas Fenicio (una tienda Fenicio se lee página de producto por
página de producto — aceptable una vez al día, abusivo cada hora). El cron de ambos jobs se eligió
para no chocar con otros consumidores del mismo puente: la diaria a las 14:29 UTC (después de
`currency-chairs` 11:41 y `currency-equipar` 12:47) y la horaria al minuto :37 (lejos de
`currency-chairs-hourly` :23, `currency-autos-hourly` :29 y `currency-equipar-hourly` :53).
Medido el 2026-09-17 (`docs/app/AUTOS.md`): un 429 de MercadoLibre deja al puente **10 minutos**
respondiendo por su proxy residencial, para TODOS los jobs que lo usan, no sólo el que lo disparó —
de ahí que la horaria pida la mitad del presupuesto diario en vez de igualarlo.

## Catálogo (`classes/phones/catalog.ts`)

Una fila por modelo (`identity.key`), con **una banda de precio por condición** (`new`, `open-box`,
`refurbished`, `used`) — nunca mezcladas, la misma regla de "nuevo y usado jamás se promedian" que
PRECIOS.md/EQUIPAR.md ya declaran en otro eje. `PHONE_MIN_BAND_SAMPLE = 3` (no el 8 de
`classes/precios/plausibility.ts`, tuneado para un artículo del SIPC con ~350 filas por corrida): un
modelo de celular rara vez junta 8 ofertas en una sola condición entre todas las tiendas más
MercadoLibre, y exigir 8 dejaría casi todos los modelos sin banda.

**Piso y techo absolutos, sin importar el tamaño de la muestra.** El cribado por percentiles necesita
compañía: un modelo con una o dos ofertas nuevas nunca llega a `PHONE_MIN_BAND_SAMPLE`, así que
`priceVerdict` contesta "ok" sin condiciones y esa única oferta —aunque sea una funda mal titulada
que la regla del bulto leyó como teléfono— se vuelve el precio, y por lo tanto el titular, del
modelo. Los números, medidos sobre la muestra real del 16/9/2026:

| condición | piso | techo | por qué |
|---|---|---|---|
| nueva | UYU 2.400 | UYU 300.000 | El teléfono nuevo más barato de la muestra es un Honor Play10 a USD 132 (tres avisos, no un typo); el piso queda bien por debajo de la mitad de eso. El techo sale de triplicar el teléfono nuevo más caro real, un Apple iPhone 17 Pro a USD 2.499 de lista (no un outlier: un segundo aviso pone la variante de 512 GB en USD 2.299) |
| no-nueva (open-box/reacondicionado/usado) | UYU 1.200 | UYU 210.000 | Un usado/reacondicionado del modelo más barato puede revenderse por bastante menos de la mitad de su precio nuevo, y la muestra no tiene un "usado" genuino de referencia (el usado más barato observado, una Galaxy A56, es de gama media a UYU 10.000). El techo sale de triplicar el no-nuevo más caro real: un iPhone 16 Pro Max reacondicionado a USD 1.749 |

**El cribado corre en tres pasos, en este orden, y el orden importa.** (1) Piso/techo absolutos.
(2) `findAmbiguousSplit` — ¿el grupo es en realidad DOS poblaciones parejas fusionadas en una sola
clave (típicamente dos tiers de almacenamiento que un hueco de `identify.ts` fusionó), no una
población con un outlier? Busca el ÚNICO salto más grande entre precios consecutivos ordenados; si
esa razón ≥ 1,8× y quedan al menos 2 ofertas de cada lado, el grupo se abstiene entero — **no se
publica banda ni ofertas para esa condición**, y esas ofertas cuentan en `ambiguousDropped`, no en
`suspectDropped`, porque ninguna fue juzgada mala individualmente, todo el grupo resultó demasiado
ambiguo para arbitrar. Esto corre ANTES del paso 3 porque ese paso está construido para encontrar el
outlier contra una mayoría, no para elegir entre dos poblaciones del mismo tamaño — forzar una
respuesta ahí publicaría un número que describe sólo la mitad del mercado y esconde la otra mitad.
(3) `screenByMedianOfOthers` — un cribado de mediana-de-los-demás **iterativo**: saca la peor oferta
(mayor desvío logarítmico contra la mediana de sus pares), recalcula, y repite hasta que nadie más
quede señalado o el grupo caiga bajo `PHONE_MIN_BAND_SAMPLE`. Iterativo porque un solo pase (el bug
que esto reemplazó) deja que UN outlier contamine la mediana de comparación de las ofertas normales
también — `[56000, 56500, 250000]`: en un solo pase, 56000 se compara contra {56500, 250000} (mediana
153.250) y también sale señalado, condenando el grupo entero. Sacando primero el peor (250000) y
recalculando, 56000 y 56500 se comparan entre sí y salen perfectamente normales. Umbrales en escala
logarítmica (no la razón cruda: 0,4× por debajo y 2,5× por arriba son la misma distorsión relativa en
direcciones opuestas, y comparar razones crudas sesgaría cuál se saca primero cuando hay más de una
señalada en la misma ronda): nueva tolera 60%–250% de la mediana de sus pares (un teléfono nuevo, aún
en garantía, tiene un solo costo mayorista alimentando el margen de cada vendedor, así que los
precios se agrupan cerca); no-nueva tolera 35%–300% (el estado cosmético y la salud de batería hacen
que un spread real de 3–8× sea ordinario para "usado"/"reacondicionado", y un umbral más ajustado
señalaría avisos genuinos todo el tiempo). Sesgo conocido y documentado por un test propio, no
escondido: si dos ofertas en lados opuestos del grupo empatan como "la peor", el desempate prefiere
sacar la más BARATA — a `n` chico esto puede decidir todo el resultado.

Recién con lo que sobrevive de (2)+(3) se calcula la banda de percentiles (`min`/`p25`/`median`/`p75`,
en pesos enteros — `Math.round`, una fracción de peso nunca es un precio real) y `priceVerdict` (el
mismo `classes/precios/plausibility.ts` sin tocar) decide qué sobrevive a un tercer filtro final.

**`suspectDropped` cuenta TODO lo que se perdió** en una condición — piso/techo, cada remoción del
cribado de mediana, y todo `priceVerdict` que no dio "ok" — a diferencia de `classes/equipar/bands.ts`,
que sólo cuenta su bolsa "suspect" y descarta "reject" en silencio: un modelo de celular parte de
muchas menos ofertas, así que cada pérdida vale la pena mostrarla. `ambiguousDropped` es un contador
aparte para lo que el paso (2) abstuvo — nunca se mezclan, porque no significan lo mismo (uno es
"esto se juzgó malo", el otro es "el grupo entero era imposible de arbitrar").

**`n` no es `sellers`.** `PhoneBand.n` cuenta observaciones de precio que pasaron todo el cribado,
ANTES de deduplicar por vendedor — varios avisos del MISMO vendedor cuentan cada uno si cada uno pasó
individualmente. `sellers` (y el `newSellers` a nivel de modelo) cuentan vendedores normalizados
distintos. **Cualquier página que quiera decir "vendido en N tiendas" tiene que leer `sellers`/
`newSellers`, nunca `n`.**

**El vendedor anónimo de MercadoLibre se colapsa en un solo balde.** Un aviso de ML sin id de
vendedor real, o con el nombre de reserva literal "Mercado Libre", se normaliza a `ml:unknown`
(`sellerIdentity` en `catalog.ts`) — medido: para celulares esto suele ser la MAYORÍA de las filas de
ML de un modelo. Contar cada uno como su propio "vendedor" inflaría `sellers`/`newSellers` con
competencia falsa. La página (`app/utils/phones.ts`, `phoneSellerLabel`) imprime ese balde como
**"Vendedor sin identificar (Mercado Libre)"** — nunca como si "Mercado Libre" fuera en sí mismo un
vendedor — mientras que cualquier otro vendedor (uno real de ML, o cualquier tienda, que siempre
tiene su propia clave de registro) conserva su nombre propio.

## El job (`sync_phones.ts`)

| app pm2 | script | cron UTC | qué hace |
|---|---|---|---|
| `currency-phones` | `dist/sync_phones.js` | `29 14 * * *` | corrida completa: 40 búsquedas de ML + las 9 tiendas de `PHONE_STORE_KEYS` (incluidas las 7 Fenicio) |
| `currency-phones-hourly` | `dist/sync_phones.js --fast` | `37 * * * *` | sólo precio: 8 búsquedas de ML, 6 consultas por tienda, salta las 7 tiendas Fenicio |

`main()` nunca llama `process.exit` — cada refusal es un `Error` — así que un único wrapper al final
del archivo cierra la conexión a la APP DB y sale, en éxito o en fallo. `main` está exportado (y sólo
se autoinvoca detrás de `require.main === module`) para que `tests/phones/dry_run.test.ts` lo llame
directo con cada dependencia pesada mockeada.

**La foto de tiendas (`phonestoresnapshots`) mantiene vivas las ofertas de tienda entre corridas.**
La horaria salta las 7 tiendas Fenicio y busca la mitad de los términos de ML, así que sola
reconstruiría cada modelo desde un mercado mucho más flaco que el que la diaria acaba de ver — las
ofertas/bandas de tienda que la diaria encontró desaparecerían 23 horas al día, y el `$set` de
documento completo de `savePhoneCatalog` pisaría las bandas buenas de ayer con unas armadas sólo con
ML+Shopify+WooCommerce. Por eso la diaria guarda cada aviso de tienda que publicó (después de la
guarda de unidad) en un solo documento, sin `attributes.DESCRIPTION` (Fenicio copia ahí la
descripción entera del producto; nada río abajo la lee, y era el grueso del peso del documento) y con
tope de 12 MB (un documento de Mongo corta en 16 MB; por debajo de eso se prefiere conservar la foto
anterior a arriesgar una escritura fallida). La horaria mezcla esa foto DESPUÉS de la guarda de unidad
de su propia corrida (las filas de la foto ya pasaron la guarda de unidad de la corrida diaria, más
grande, así que no se re-guardan contra la muestra de ML más flaca de la horaria): lo fresco siempre
gana, y una fila de la foto con más de 36 horas (`PHONE_STORE_SNAPSHOT_MAX_AGE_MS`) se ignora — cubre
una corrida diaria perdida y no más. Guardar la foto va en su propio `try/catch`, como el
pricewatch: si falla, el catálogo ya se guardó y la corrida diaria termina bien; la horaria sigue con
la foto anterior hasta la próxima diaria exitosa.

**Una corrida flaca no pisa una buena.** Si ningún modelo tiene banda nueva publicable, o si hay
menos del 40% de los modelos que ya estaban guardados con banda nueva publicable (cuando ese número
se conoce — una corrida `--dry-run` sin APP DB configurada no tiene con qué compararse y sólo se
rechaza si queda totalmente vacía), el job tira un `Error` y el catálogo anterior queda intacto.

**`--dry-run` funciona incluso sin `APP_MONGO_URI`/`MONGO_URI` configurada** (un chequeo local sin
`app/.env`): salta cargar el catálogo anterior, contar lo guardado y leer la foto de tiendas, y avisa
por consola que lo está haciendo, en vez de intentar conectar sólo para leer cuando la corrida no
podría escribir de todos modos.

**Pricewatch, vertical `celulares`.** Después de guardar el catálogo, en su propio `try/catch` (un
fallo acá nunca cuesta el catálogo recién guardado), llama a `recordPricewatch(guarded.listings,
"celulares", undefined, { productKeyFor })`. `productKeyFor` reemplaza la clave por defecto
(`ml:<catalogId>`, que la mayoría de los avisos de celulares — de tienda o de ML — nunca tiene) por
`phone:<identity.key>`, reidentificando el título con `identifyPhone`. Se registra sobre
`guarded.listings` (los avisos post-guarda-de-unidad de ESTA corrida), no sobre la lista ya mezclada
con la foto de tiendas: una fila que vino de la foto de ayer no se vio HOY, y darle la fecha de hoy
fabricaría una observación que nunca ocurrió. Ver [PRICEWATCH.md](PRICEWATCH.md).

## Páginas y API

- `GET /api/phones` (el hub, `/celulares-uruguay`): sólo modelos **publicables** — banda nueva
  existente, `"new"` no está en `ambiguousConditions`, y `lastSeen` no está vencido (más de
  `PHONE_STALE_DAYS = 4` días) — agrupados por marca en orden fijo (Apple, Samsung, Motorola, Xiaomi,
  Honor, después el resto alfabético) y, dentro de cada marca, por familia y almacenamiento
  ascendente.
- `GET /api/phones/<modelo>` (la ficha): sirve el modelo AUNQUE no sea publicable — la página decide
  qué mostrar — pero informa `publishable`/`stale` para que nunca headlinee un precio que la corrida
  no puede sostener. Un slug mal formado da 404 antes de tocar la base; una falla de base de datos da
  **503** con `cache-control: no-store` (nunca cacheada como si fuera un 404 genuino) — sólo un slug
  bien formado sin documento es un 404 real.
- **El gate del sitemap** (`app/server/api/__sitemap__/urls.get.ts`) es más estricto que el del hub:
  además de `phonePublishable` (fresco + banda + no ambiguo), exige `newSellers >= 2` — un modelo con
  un solo vendedor puede aparecer en el hub/su propia ficha, pero no se manda a indexar a Google hasta
  que haya competencia real detrás del precio.

### La cuenta de traerlo de EE.UU. (`app/utils/phoneImport.ts`, `phoneUsPrices.ts`)

Reutiliza las reglas que ya audita el resto del sitio — **no repite ningún cálculo de impuesto a
mano** — para las dos vías que una persona física puede usar sin importación formal:

- **Equipaje de viajero** (`resolveBaggageTax`, entrada aérea por Carrasco, franquicia USD 500).
- **Courier puerta a puerta** (`courierImport`), asumiendo la franquicia anual COMPLETA disponible
  (USD 800, 0 envíos usados este año — el escenario de "primera compra grande del año") y cotizando
  el flete más barato entre `ESTIMATOR_COURIERS` (`courierParcelQuote`), con 0,5 kg de peso de
  referencia (una caja de iPhone).

Los precios de lista de EE.UU. salen de `PHONE_US_PRICES` (`app/utils/phoneUsPrices.ts`), leídos a
mano de `apple.com/shop/buy-iphone` el **2026-09-16** (`PHONE_US_PRICES_VERIFIED_AT`) — es una foto
mantenida a mano, NO sincronizada: se queda vieja en cuanto Apple cambia un precio de lista en
EE.UU., sin que nada lo detecte solo. Dos escenarios de sales tax: Miami-Dade, Florida (7%, el
condado de las tiendas Apple que más visita un uruguayo — Dolphin Mall, Aventura, Brickell City
Centre) y 0% (el piso honesto: los estados sin impuesto de venta, ninguno una parada realista de una
Apple Store para un viajero uruguayo).

**El certificado URSEC (trámite VUCE) está incluido en todo total que se muestra**, vía
`phoneImportTotals()`. `phoneImportEstimate()` deja `ursecUyu` deliberadamente separado de
`traveler.totalUyu`/`courier.totalUyu` (no es un tributo aduanero, es un trámite aparte que igual hay
que pagar para que el paquete entre) — pero eso significa que NINGUNO de esos dos campos, ni
`savingTravelerUyu`/`savingCourierUyu` calculados a partir de ellos, es "cuánto sale puesto en
Uruguay". Un bug real (encontrado en la revisión de la Tarea 7): una pantalla que sumaba el ahorro
sin el URSEC podía decir "conviene traerlo" cuando, certificado incluido, no convenía.
`phoneImportTotals()` es el único lugar que arma el total y el ahorro reales
(`travelerTotalUyu = traveler.totalUyu + ursecUyu`, `courierTotalUyu` igual, y los ahorros contra
`localBestUyu`) — **ninguna pantalla debe leer los campos de `phoneImportEstimate` directamente para
mostrar un total o un ahorro**. El costo del certificado se lee de la propia ficha
`celular-router-drone` de `aduanaFaq.ts` con una regex, no un número copiado a mano: si esa ficha
cambia de texto de forma que la regex ya no matchea, la función tira un error en vez de publicar un
número viejo sin avisar. La lectura es perezosa y memoizada (recién adentro de
`phoneImportEstimate`, no a nivel de módulo) para que importar el archivo nunca tire sólo por
mencionarlo.

Esto es una **estimación**, no un consejo: los supuestos (vía aérea, franquicia completa disponible,
0,5 kg) están documentados en el propio archivo porque la interfaz pública no los recibe como
parámetro, y cualquier régimen por encima de ambas franquicias no se calcula (requiere despachante y
DUA — mismo criterio que el resto de la calculadora de aduana del sitio).

## Qué no se publica y por qué

- **Un título sin cifra de almacenamiento**: `identifyPhone` devuelve `null` y el aviso nunca entra
  al catálogo, ni siquiera como fila sin identificar — no hay nada seguro que decir de un aviso que
  no se puede comparar contra otro.
- **Una condición con `findAmbiguousSplit` positivo** (dos poblaciones de precio parejas fusionadas
  en una clave): esa condición se abstiene entera, sin banda ni ofertas. Si es la condición `new` y
  no queda ninguna otra cosa publicable para el modelo, el modelo entero no headlinea ningún precio.
- **Un modelo con `lastSeen` vencido** (más de 4 días sin verse): desaparece del hub y del sitemap;
  su propia ficha sigue existiendo pero con un aviso de que el precio no se actualizó.
- **Un modelo con menos de 2 vendedores nuevos** (`newSellers < 2`): puede aparecer en el hub y en su
  propia ficha si por lo demás es publicable, pero nunca en el sitemap.
- **Usados de cualquier fuente, para pricewatch**: `pricewatchEligible` excluye Facebook y toda
  condición `used` en las tres verticales (equipar, sillas, celulares) — un precio de segunda mano es
  lo que ese vendedor decidió cobrar hoy, no una rebaja sobre un precio de lista.
- **Facebook Marketplace, para celulares, siempre**: ni un solo aviso de Marketplace entra al
  catálogo (ver "Fuentes" arriba).
- **Una corrida flaca**: menos del 40% de los modelos con banda nueva publicable que ya había
  guardados (o cero, cuando no hay nada guardado para comparar) tira el `Error` y conserva el
  catálogo anterior entero.
- **Los enlaces vendedor → perfil de tienda** (`/tiendas-online-uruguay/<key>`, ver
  `docs/app/TIENDAS_ONLINE.md`) **todavía no están conectados**: esa feature (plan A del mismo
  ciclo) llegó a `main` después de que esta rama ya había arrancado. Conectarlos queda para cuando
  esta rama se rebase sobre `main`.

## Cómo diagnosticar

- El log de cada corrida imprime una línea por fuente (`[phones] ok/FAIL <tienda> N avisos :: nota`),
  cada descarte de la guarda de unidad (`applyUnitGuard`) con la mediana de tienda contra la de ML, y
  un resumen final: modelos totales, modelos con banda nueva publicable, modelos con alguna condición
  ambigua, ofertas sospechosas descartadas, ofertas descartadas por ambigüedad, avisos totales y
  segundos que tardó.
- Correr `sync_phones.ts --dry-run` (con o sin `--fast`) no escribe nada — ni catálogo, ni pricewatch,
  ni foto de tiendas — y funciona sin `APP_MONGO_URI` configurada para un chequeo puramente local.
- Un modelo que "desapareció" del hub: revisar primero si su `lastSeen` está vencido (banner de
  "precios no actualizados" en su propia ficha) antes de asumir que el scraper se rompió; segundo, si
  `ambiguousConditions` incluye `"new"` — la propia ficha lo explica.
- Un precio que parece absurdo: comprobar si sobrevivió al piso/techo absoluto y al cribado de
  mediana-de-otros antes de asumir que el problema está en `identifyPhone` — el bulto/regalo y las
  palabras de repuesto están cubiertos ahí, pero un título nuevo con una forma no vista puede seguir
  colándose, y el respaldo es exactamente este cribado numérico, no el parser de texto.

## Tests

- `tests/phones/identify.test.ts` — normalización, marcas, exclusión de accesorios/piezas, la
  guarda de variante no consumida, la regla del bulto, extracción de almacenamiento/RAM, condición.
- `tests/phones/spec.test.ts` — `PHONE_SPEC.accept`, `PHONE_STORE_KEYS`.
- `tests/phones/catalog.test.ts` — bandas por condición, piso/techo, el cribado iterativo de
  mediana-de-otros (incluido el caso `[56000, 56500, 250000]` pinneado), la abstención bimodal,
  `n` vs. `sellers`, la imagen representativa.
- `tests/phones/store.test.ts` / `store_snapshot.test.ts` — historial diario, merge de la foto de
  tiendas (fresco gana, más de 36 h se ignora, `DESCRIPTION` fuera).
- `tests/phones/dry_run.test.ts` — `sync_phones.ts main()` con toda dependencia pesada mockeada.
- `app/tests/unit/phones.test.ts` — `phonePublishable`, `phoneSellerLabel`, `phoneHubGroups`,
  `phoneSiblings`, proyecciones.
- `app/tests/unit/phonesApi.test.ts` — las dos rutas de API: 404 de slug malformado, 503 vs. 404,
  proyecciones que excluyen `history` en el hub.
- `app/tests/unit/phonePages.test.ts` — hub y ficha: estado honesto cuando no es publicable, JSON-LD
  sin `AggregateRating`, sitemap gate.
- `app/tests/unit/phoneImport.test.ts` — la cuenta de traerlo de EE.UU., incluido `phoneImportTotals`
  sumando el URSEC.
- `tests/appdb/schema_parity.test.ts` — `classes/models/PhoneModel.ts` / `PhoneMeta.ts` contra sus
  espejos de `app/server/models/`.

## Pendiente

- Enlazar vendedor → perfil de tienda (`/tiendas-online-uruguay`) cuando esta rama se rebase sobre
  `main` (ver "Qué no se publica y por qué").
- La primera corrida real en producción todavía no ocurrió al escribir esto: los números de cobertura
  por marca/familia hay que medirlos contra producción antes de citarlos afuera.
