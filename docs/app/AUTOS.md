# Autos usados: directorio y oportunidades

Páginas: `/autos-usados-uruguay` (directorio), `/autos-usados-uruguay/<fuente>-<id>` (ficha,
`noindex`), `/autos-usados-uruguay/precios/<marca>-<modelo>` (mercado del modelo, indexable con ≥ 30
avisos) y `/oportunidades-autos-usados-uruguay`. Diseño y mediciones:
`docs/superpowers/specs/2026-09-16-autos-usados-directorio-y-oportunidades-design.md` (v1, sólo ML) y
`docs/superpowers/specs/2026-09-17-autos-fuentes-adicionales-design.md` (fuentes, catálogo, guía).

## Fuentes

| fuente | clave | contrato | usados (17/9) | lectura |
|---|---|---|---|---|
| Mercado Libre | `ml-` | puente `:9656`, `MLU1744` marca → modelo | ~16.300 | completa por marca |
| Facebook Marketplace | `fb-` | GraphQL de la página, Chrome con sesión (CDP) | ~50 nuevos/h | siempre parcial |
| Clasiautos | `clasiautos-` | `/wp-json/wp/v2/listings` (tema Listivo) | 218 | completa |
| Julio Automóviles | `julio-` | `/wp-json/wp/v2/cars` + taxonomía de años (Vehica) | 138 | completa |
| Shopping de Autos | `sda-` | `/wp-json/wc/store/v1/products` | 121 | completa |
| Carper | `carper-` | ídem en `usados.carper.com.uy` (precios en centavos) | 378 | completa |
| Usados Fidocar | `fidocar-` | sitemap + microdatos de cada ficha (Fenicio) | 105 | completa |
| Car One | `carone-` | HTML del listado con `carone_estado=96` | 218 | parcial (el orden cambia entre páginas) |
| Motorlider | `motorlider-` | sitemap + ficha (Fenicio, igual que Fidocar) | 50 | completa |
| Dueño Directo | `duenodirecto-` | listado paginado + ficha de cada aviso | 22 | parcial (hay avisos sin ficha propia) |

Descartadas y por qué: Gallito (el permiso de El País cubre sólo inmuebles), AG Automóviles y Go Select
(el mismo stock que publican en ML), clasificados.st (spam), heiwork y Trovit (agregadores),
Autodata/URUTAX (pago).

**Motorlider vende la seña, no el auto.** Su vidriera Fenicio publica como producto la reserva: el
`itemprop="price"` de los microdatos dice USD 500 en las 77 fichas y el precio del auto (USD 13.990)
sólo está en la ficha técnica (`data-codigo="precio-ficha"`) y en el precio tachado. El lector Fenicio
usa la ficha cuando existe y descarta cualquier auto por debajo de USD 1.000 / $U 40.000, que es una
seña y no un usado. También vende motos (10 de 77): sus marcas —KTM, Bajaj, Aprilia, Kymco, Piaggio—
no están en el diccionario de autos de ML, así que no se identifican y no entran.

Medido en la primera corrida (2026-09-18): de los 50 usados de Motorlider, **41 ya estaban en ML** y
quedan 9 propios; de los 22 de Dueño Directo, **ninguno** repite. Es la diferencia entre una
automotora y un clasificado de particulares, y es la razón de sumar el segundo.

**Dueño Directo** es el otro extremo: avisos de particulares, `sellerType: "private"`. Su paginador
sigue contestando pasado el último aviso (la página 5 y la 6 devuelven tarjetas repetidas), así que la
barrida corta cuando una página no agrega nada nuevo. Las tarjetas cuyo enlace no tiene slug —el sitio
las renderiza sin ficha propia— se cuentan en la nota y se descartan: sin permalink no hay fila
publicable. El host es IDN y todas las URLs, las suyas y las nuestras, van en punycode
(`vehiculos.xn--dueodirecto-3db.com.uy`); los nombres de sus fotos traen espacios y se guardan
codificados.

Todas las fuentes que no son ML se **identifican contra el diccionario** (`classes/autos/catalog/`):
marcas y modelos con los ids de ML, así un auto de Clasiautos cae en la misma cohorte que los de ML.
Con los 16.301 títulos de ML, el reconocedor coincide con el modelo de ML en 91 % y deja sin
identificar 5 %. Un modelo que ML no conoce se publica con id `x-…` y no forma cohorte. Los 0 km se
descartan en todas las fuentes. Las webs se leen con la UA honesta de autos
(`AUTOS_USER_AGENT`); Car One sólo se pagina con su filtro de usados porque su robots.txt no permite
otra cosa.

### Mercado Libre

**El barrido es secuencial, con 1,5 s entre pedidos.** Medido el 2026-09-17: con 4 pedidos en
paralelo, a los 6 minutos Mercado Libre le contestó 429 al puente, y el puente
(`trustpilot/dist/classes/MercadoLibre.js`, `mobileGet`) pasa entonces **10 minutos** buscando por su
proxy residencial —para todos los jobs que lo usan: alquileres, sillas, equipar— con hasta 12 intentos
por pedido; el proxy devolvió 502 y se perdieron 700 de 1.517 páginas. Por eso el cosechador no
reintenta dentro de `fetchJson`, y cuando el puente falla 3 veces seguidas espera 11 minutos una sola
vez y relee lo perdido (`CAR_HARVEST_RETRY`, hasta 3 intentos por página). `AUTOS_ML_GAP_MS` y
`AUTOS_ML_CONCURRENCY` ajustan el ritmo. La ficha propia (`auto.mercadolibre.com.uy/MLU-…`) se lee
sólo para candidatas a oportunidad.

### Facebook Marketplace

- Se conecta por CDP al Chrome del perfil (`AUTOS_FB_CDP_URL`, `http://127.0.0.1:9224`), después de
  confirmar `sessionStatus: "valid"` en `AUTOS_FB_HEALTH_URL` (`:9246/health`). Abre sus pestañas, las
  cierra y se desconecta **sin cerrar el navegador** (es el de `facebook_profile_browser`, el mismo que
  usan alquileres y sillas por el puente `:9657`).
- Lee el feed de Vehículos por más nuevo (80 scrolls la diaria, 15 la horaria) y, en la diaria, busca
  las 20 marcas con más avisos (4 scrolls cada una). Fichas: hasta 120 por diaria y 15 por horaria,
  6 s entre una y otra, primero las que el análisis pidió (`uy-cars-fb-wanted`) y después las que no
  dicen año o km. Un login o checkpoint corta Facebook por el resto de la corrida.
- En Uruguay **todos los campos `vehicle_*` vienen vacíos** y la moneda es siempre "UYU" aunque el
  monto sea en dólares. El auto sale del título y la descripción; la moneda se lee **pegada al monto**
  ("U$S 4.000", "4 mil dólares" — "debe 52 mil pesos" no cuenta) y si no está escrita se deduce: de
  US$ y $U, la única que cae entre ×0,4 y ×2,5 de la mediana propia de ese modelo y año (si no, el
  promedio de la guía de ML). Si caen las dos o ninguna, el aviso no se publica. Una moneda deducida
  se muestra como "moneda estimada" y **nunca** cuenta para oportunidades.
- Nunca se guarda el nombre del vendedor; su id queda privado (tope de 2 comparables por vendedor).
  El teléfono tampoco: Facebook nunca aporta números a la base de contactos ([AUTOS_CONTACTOS.md](AUTOS_CONTACTOS.md)).
  Las tarjetas viven en `carfbcards`; sólo las que nombran un auto con año pasan a `carlistings`.
- Nunca se retira por ausencia: sale de la ventana pública de 4 días si no se la vuelve a ver. Una
  ficha vendida o no disponible la retira.
- `AUTOS_FB_ENABLED=0` lo apaga sin desplegar.

## Bloqueos desde el VPS (2026-09-17)

Dos webs contestan distinto según desde dónde se pida. Medido el mismo minuto desde la máquina de
desarrollo (anda) y desde el 104 (no):

- **Clasiautos**: 503 de Wordfence con "Access from your area has been temporarily limited for
  security reasons" en `/wp-json/…`; la home sigue en 200. Es por IP, no por UA (con UA de
  navegador también da 503).
- **Car One**: 405 a cualquier pedido, incluso a la home.

Las dos permiten esas rutas en su `robots.txt` y las dos contestan 200 desde otra red, así que el
bloqueo es de la IP del datacenter, no una decisión sobre nosotros. Esas dos fuentes —y sólo esas—
salen por proxy (`classes/autos/sources/proxy.ts`): **cambia la red, nunca la identidad**. Viaja el
mismo `CambioUruguayBot` con el contacto, una página cada 1,5 s, y sólo las rutas que robots permite.

- `AUTOS_PROXY_SOURCES` (default `clasiautos,carone`) decide quién usa proxy; vaciarlo lo apaga.
- Proxy: `AUTOS_PROXY_LIST` (los alquilados, `host:port` separados por comas, credenciales en
  `AUTOS_PROXY_AUTH=usuario:clave`, ambos en el `.env` del servidor) → `AUTOS_PROXY_URL` (uno fijo) →
  el pool de proxyscrape que ya usan los scrapers de casas (`PROXY_SCRAPE_API_KEY`).
- El proxy que funciona se conserva para el resto de la corrida; se rota ante un 403/405/429/503 o un
  error de red, nunca ante un 404 (eso es la respuesta del sitio). En el log va `host:port`, jamás la
  clave.

**Si un sitio nos bloquea a nosotros** —por UA, por una regla que nos nombre o porque lo pidan— la
fuente sale (`AUTOS_<FUENTE>_ENABLED=0`) y no se insiste.

## Duplicados entre fuentes

Las automotoras publican el mismo auto en su web, en ML y en Facebook (multiaviso lo hace en un clic).
Mismo modelo y año, km a ±max(500, 1 %) y precio en dólares a ±3 % ⇒ queda una sola fila: ML, después
las webs, después Facebook. Los descartes se cuentan por fuente en `carcatalogmetas.meta.sources`.

## Guía de precios de Mercado Libre

`currency-autos-guide` (05:13 UTC, 40 min, 1,5 s entre páginas) lee
`/precios-autos/<marca>/<modelo>/<año>/` sólo para los modelo-año que el directorio tiene: primero los
nunca leídos, después los de más de 7 días. 404 o redirección = `missing` (se reintenta a los 30 días);
tres fallas seguidas cortan la corrida. **No es una referencia independiente**: su precio es la
mediana de los mismos avisos de ML (Hilux 2018 DX = US$ 32.990 en los dos lados). Se usa como
catálogo de versiones, como segunda opinión donde la muestra propia no alcanza (ficha:
`reference`, por versión si coincide, si no el promedio del año; página del modelo: tabla por año) y
como último recurso para deducir la moneda de Facebook.

## Jobs

- `currency-autos` (07:43 UTC): ML completo → webs → Facebook → fichas de ML → análisis → publicación.
- `currency-autos-hourly` (:29): ML `since=today` + Facebook poco profundo. No relee las webs (su
  inventario cambia en días); nunca retira por ausencia.
- Ambos por `scripts/run-autos.sh` (flock propio). `AUTOS_SOURCES=a,b` limita una corrida;
  `AUTOS_<FUENTE>_ENABLED=0` (`AUTOS_ML_ENABLED`, `AUTOS_FB_ENABLED`, `AUTOS_CARONE_ENABLED`…) apaga
  una fuente. Una fuente que falla conserva sus avisos y queda anotada.
- `currency-autos-guide` (05:13 UTC): la guía de ML.
- `currency-autos-detail` (:11 de cada hora): lee la ficha propia de los avisos de ML que ya tenemos
  guardados, con presupuesto (`AUTOS_DETAIL_MAX`, 400; `AUTOS_DETAIL_MINUTES`, 25) y por orden de
  utilidad. No publica nada. Después de leer, mira las fotos de los dudosos (`AUTOS_VISION_MAX`, 30).
  `AUTOS_DETAIL_REFRESH_DAYS=<n>` vuelve a leer fichas viejas (por defecto no relee ninguna).

## Colecciones (APP DB)

Privadas: `carlistings` (observación de cualquier fuente, historial de precio, ficha con descripción),
`carfbcards` (tarjetas y fichas de Facebook), `carguideentries` (guía de ML) y `carharvestmetas`
(`uy-cars`, `uy-cars-last-full`, `uy-cars-last-fast`, `uy-cars-vocabulary`, `uy-cars-publish`,
`uy-cars-source-<fuente>`, `uy-cars-fb-wanted`, `uy-cars-guide`).
Públicas: `carcatalog`, `carcatalogmetas` (`uy-cars`, con cobertura por fuente), `carmarketsnapshots`
(con la guía), `caropportunitysnapshots` (`used`, `car-cohort-v2`) y `carrisksnapshots` (`used`).
El veredicto de fotos vive en `carlistings.photoCheck` y **no cruza la frontera pública**: de él sólo
sale un booleano, y sólo cuando corrobora lo que el aviso ya declaraba.

Un aviso se retira si su ficha da 404/410 o está inactiva, o si dos lecturas completas de su fuente
(en ML: de su marca) no lo vieron. Una caída del universo mayor a 60 % conserva lo publicado.

## Diagnosticar

- ML: `carharvestmetas` `uy-cars-last-full` (`ok`, `note`, `failedPages`, `gaps`, `lastOkAt`,
  `failingSince`).
- Otras fuentes: `uy-cars-source-<fuente>` (`ok`, `complete`, `note`, `lastOkAt`, `failingSince`).
  `sesión de Facebook no disponible` = el perfil perdió la sesión (ver la memoria del puente de FB).
- Guía: `uy-cars-guide` (`counts`, `note`).
- Rechazo de la última publicación: `uy-cars-publish`.
- Reprocesar sin tocar la base: `APP_MONGO_URI= node dist/sync_autos.js --dry-run
  --harvest-snapshot=<archivo> --report=<salida>` (las webs se leen en vivo; Facebook sólo con
  `--with-facebook` y en el 104). `--sources=clasiautos,julio` limita. `--harvest-snapshot` exige
  `--dry-run`. Guardar una captura de ML: `--save-harvest=<archivo>`.

## Método de oportunidades

Cohorte fijada antes de mirar precios: misma marca+modelo (ids de ML), año, versión (vocabulario
`SHORT_VERSION` de ML contra el título y la versión que da la fuente), motor y caja; km dentro de
`max(20.000, 30 %)`. Umbrales en `classes/autos/analyze.ts` (`CAR_OPPORTUNITY_POLICY`), publicados
dentro del snapshot. Toda oportunidad publicada pasó por su ficha (en las webs, la lectura del día; en
ML y Facebook, la página del aviso): activa, mismo precio/año/km, sin menciones de choque, recupero,
deuda/leasing o chapa extranjera. Monedas deducidas fuera. No es tasación.

### El precio es el de contado que dice el aviso (2026-09-19)

Las automotoras publican la **entrega** como precio y ponen el precio real en la descripción:
MLU700552753 (Hyundai HB20 2023) figuraba a US$ 8.990 con "US$12990 Contado / US$8990 y cuotas" en la
descripción, y la página lo daba 30 % más barato que el mismo auto. Medido ese día: 2.015 de 10.515
descripciones mencionan "contado"; 640 declaran un precio de contado; en 34 difiere del publicado; y
3 de las 89 oportunidades publicadas eran esto (HB20 +44 %, Nissan March +73 %, un Spark que publicaba
la entrega sin decir el contado).

`classes/autos/cashPrice.ts` lee título + descripción y decide el precio (`priceBasisOf`):

- **Si el aviso dice un precio de contado, ése es el precio** del auto (`price`, `priceUsd`: cohortes,
  medianas, informe, tasador y la tarjeta). El número del portal queda en `listedPrice` y la tarjeta
  dice "En el portal figura US$ 8.990". La ficha se verifica contra el publicado (`listedPrice`).
- **Si el publicado aparece como entrega** ("US$8990 y cuotas", "retirá con", "entrega de") **y no hay
  contado**, el precio es desconocido: bandera `financing`, fuera de oportunidades.
- **Dos contados distintos** en el mismo texto: ninguno se usa, `financing`.
- **Descripción vieja:** si el contado que dice el texto es un precio al que ESTE aviso estuvo
  publicado antes ("U$S12.900 contado" en un aviso bajado a 12.300), manda el publicado. No aplica si
  el publicado es la entrega.
- Se ignora lo que también se paga "contado" y no es el auto: la patente ("Patente Anual Contado es
  de $ 38.019", el caso más común), el seguro, "50 % contado", "contador". Un monto sólo cuenta en la
  moneda del aviso, entre 0,8× y 4× el publicado, y nunca si es la misma cifra que una entrega del texto.
- Con el contado como precio, una baja del publicado (una entrega más chica) no es una baja del auto:
  `priceDrop` se apaga.

Los casos reales están en `tests/autos/cashPrice.test.ts`.

## Consumo en L/100 km (2026-09-19)

Ningún portal da el consumo como campo: la tabla "Rendimiento y dimensiones" de Mercado Libre trae
potencia, tanque y medidas, nunca el consumo. Vive en la descripción, sobre todo en plantillas de
automotora ("Consumo medio en ruta: 19 km/l. Consumo medio en ciudad: 17 km/l.") y en una docena de
formas de particulares ("16km Por litro", "En ciudad 11km x lt / En Ruta 14km x lt", "6,5 l/100 km").
`classes/autos/fuelEconomy.ts`:

- **Se mide y se muestra en litros cada 100 km** (pedido del usuario). Los vendedores escriben km/l
  casi siempre: cada cifra se convierte una sola vez, en el lector, y se redondea al final.
- **`readFuelEconomy`** separa ciudad / ruta / combinado según la palabra que precede a cada cifra, y
  la cifra única para comparar es el combinado, si no el promedio de ciudad y ruta, si no la que haya.
  Descarta `km/h`, lo que queda fuera de 5–35 km/l y un número pegado a una letra (un enlace
  `…/a7w3w7kl` se leía como 7 km/l). Una plantilla con la ruta por debajo de la ciudad y valores
  chicos son litros cada 100 km mal rotulados (Yaris "ruta 5,09 / ciudad 7,9"): se toman como litros.
- **`attachFuelEconomy`**: si el aviso no lo dice, la mediana de lo que declaran OTROS vendedores del
  mismo modelo y motor; si no alcanza, del mismo modelo; si tampoco, del mismo combustible y cilindrada
  (estimación gruesa, mínimo 10 vendedores). **Un valor por vendedor**: una automotora pega la misma
  plantilla en todos sus autos de un modelo, y diez copias de una suposición siguen siendo una. Mínimo
  3 vendedores. Agrupa por nombre de modelo (`marketSlug`), no por id: una web cuyo modelo no se
  identificó contra ML lleva un id sintético. Sin combustible conocido se usa el modelo con cualquier
  combustible; con combustible conocido nunca se mezclan. Los eléctricos no tienen km/l.
- Medido el 2026-09-19 sobre 19.206 avisos: 1.287 lo declaran (7 %), 6.591 por modelo y motor, 4.307
  por modelo, 3.059 por cilindrada, 3.962 sin dato (sobre todo pick-ups diésel, casi nadie lo escribe,
  y eléctricos).
- Público como `fuelEconomy` (catálogo y oportunidades) con `basis` y `sellers`: la página siempre dice
  si es del aviso o una estimación y cuántos vendedores la sostienen. Filtro "consumo máximo" y orden
  "menor consumo" en el directorio (índice `fuelEconomy.litersPer100Km`) y en oportunidades; como
  "menos kilómetros", ese orden deja afuera los avisos sin el dato.

## Precios imposibles (2026-09-21)

`classes/autos/priceSanity.ts`. Un Chevrolet Spark 2008 se publicó a $ 6.990 —US$ 169— desde
Facebook Marketplace. En Facebook `listing_price.currency` siempre dice "UYU" aunque el precio esté
en dólares, así que un aviso cuyo texto nombra pesos cerca del monto entra como pesos sin que nadie
lo discuta.

**Pero al medir, el problema resultó más ancho que Facebook y más ancho que la moneda.** De los 17
avisos que hoy se retiran, 11 son de Mercado Libre con la moneda declarada en un campo estructurado
—señas publicadas como precio, precios de atracción—, 3 son placeholders de Clasiautos (avisos a
US$ 9 y US$ 17) y uno es un **alquiler** listado entre las ventas.

**Lo que NO se hizo: un piso fijo en dólares.** Medido el 2026-09-21 sobre los 19.036 avisos
publicados, debajo de US$ 1.000 hay 36 y la mayoría son PRECIOS REALES: autos que se venden para
repuestos y lo dicen en su propia descripción ("vendo para repuestos, está completo", "vendo por
partes", "está sin andar solo para repuestos"). Un piso global borraría esos avisos legítimos y,
peor, dejaría pasar lo que de verdad está mal: una Toyota Hilux SRV 2015 "inmaculada" a $ 35.500
(US$ 857) sobrevive a cualquier piso razonable. **El monto no distingue; lo que distingue es el
auto.** Un Fiat Duna del 99 a US$ 483 es chatarra a precio de chatarra; una Hilux del 2015 al mismo
precio es un error.

Así que cada aviso se compara contra su propia cohorte —la lección de `classes/precios/` y de
`rate_audit.ts`: la banda sale del grupo, no de un factor inventado— en cascada, de la cohorte más
parecida a la más gruesa. La primera que existe manda:

| cohorte | mínimo | se retira si | por qué ese umbral |
|---|---|---|---|
| modelo + año | 5 avisos | < 15 % de la mediana | autos iguales: un 15 % de sus pares ya es imposible |
| marca + año | 8 avisos | < 8 % | Mercado Libre parte "Hilux" de "Hilux Pick-up" y fragmenta la cohorte del modelo |
| año | 20 avisos | < 7 % | mezcla un Lada con una Hilux, así que sólo un umbral muy bajo prueba algo |
| ninguna | — | < US$ 200 | debajo de eso no hay auto, ni para repuestos |

**El umbral se AFLOJA cuanto más parecida es la cohorte**, que es al revés de lo que parece: cuanto
más homogéneo el grupo, más dice una desviación chica. Y la cascada corta en la primera cohorte que
existe: si el modelo+año aprueba el precio no se le pregunta a grupos más gruesos, porque un modelo
barato dentro de una marca cara (un Starlet entre Land Cruisers) no es un error.

**No se corrige el precio, se retira el aviso entero.** No sabemos cuál es: que el vendedor quiso
decir dólares, que publicó la seña o que se le fue un dígito son tres historias distintas y ninguna
se puede adivinar desde acá. El descarte corre en `sync_autos.ts` **antes del análisis**, así que el
mismo veredicto vale para el catálogo, las oportunidades, el riesgo y el informe: un precio que no
es un precio tampoco es una cohorte ni un comparable.

Medido con el módulo real contra producción: **17 de 19.036** (5 por modelo+año, 7 por marca+año,
5 por año), y ninguno de los que se venden para repuestos. El job lo registra por motivo.

**El mínimo de marca+año bajó de 20 a 8 avisos (2026-09-21).** Con 20 no existía la cohorte de
Toyota 2007 y una **Hilux SRV 2007 a $ 27.500 (US$ 664)** caía al escalón del año, donde compite con
Ladas y sobrevive con r = 0,095 contra un umbral de 0,07. Con 8 la cohorte existe, r = 0,031 y se
retira. Medido: bajar el mínimo retira ese aviso y **ninguno más**.

### Repuestos publicados como autos (2026-09-21)

Un repuesto listado en la categoría de autos tiene precio de repuesto, así que **ninguna banda de
precios lo va a agarrar**: se va por lo que dice ser. `IS_A_PART` en `sources/common.ts`, al lado de
`NOT_A_CAR`.

Sólo cuenta cuando la pieza es el **sujeto** del título, o sea que lo abre. Buscar la palabra en
cualquier posición es inservible y está medido: de 19.026 títulos, **556** contienen "techo",
"turbo", "cuero" o "volante", y los más caros de esa lista son un Jeep Wrangler, un Porsche Macan y
un Kia Carnival — ahí esas palabras son equipamiento, no lo que se vende. Anclado al principio son
**2 títulos y los 2 son repuestos** ("Techo De Chevrolet S10 Doble Cabina Nuevo Original", "Butacas
Fiat 147").

**"Motor" quedó afuera de la lista a propósito**: "Motor Echo Ase 2 Años Libreta Títulos Tiene Deuda"
no es un motor, es un Toyota Echo con el motor rehecho, con libreta y con deuda. Un auto.

### La moneda: "U$U" leía pesos (2026-09-21)

**El Spark no era una ambigüedad, era un bug del parser.** Su descripción decía "💵 Precio contado
**U$U6990** (bonificado)", que en Uruguay es una forma de escribir dólares. La lista de marcadores
era `(u\$s|us\$|u\$d|\busd|\$u|\buyu)`: en "u$u6990" ninguna alternativa dólar engancha en la
posición 0, el motor avanza una letra y ahí **`$u` —el marcador de PESOS— matchea el medio de la
palabra**. Un marcador de dólares leído como pesos, y de ahí US$ 169.

El arreglo es del vocabulario, no una heurística: `u$u` va **primero** en toda alternancia (así gana
en la posición 0) y el `$u` de pesos exige que no venga una letra pegada adelante. Faltaba en cinco
lugares: `catalog/match.ts` (los dos marcadores, `currencyOfMarker` y `declaredCurrencyFor`),
`sources/common.ts`, `sources/carone.ts` y las dos expresiones de financiación de `normalize.ts`.
`cashPrice.ts` ya lo trataba bien, con el mismo comentario sobre el orden de la alternancia.

Medido: `u$u` aparece en 2 avisos de 20.601 y 1 estaba mal cotizado. Poco volumen, pero es un parser
de moneda devolviendo lo contrario.

**Por eso NO se agregó el rescate heurístico** que se había considerado —reinterpretar como dólares
un precio en pesos absurdo cuando cae en la banda de su modelo—: medido sobre las 28 filas de
Facebook en pesos, los avisos rescatables son **cero**, porque el único caso real era este bug.
Inventar un precio donde el vendedor escribió otro no se hace sin un caso que lo pida.

## Carrocería, puertas y color (2026-09-20)

El filtro por carrocería (sedán, SUV, pick-up…) y los filtros avanzados del directorio.
`classes/autos/bodyType.ts`.

**No hubo que raspar nada**: `detail.ts` lee `bodyType`, `color` y `numberOfDoors` del `ld+json`
`Vehicle` de la ficha de Mercado Libre desde el primer día, y esos tres campos nunca habían cruzado
la frontera pública. Medido contra producción el 2026-09-20: de 20.601 avisos vigentes, 19.460
tienen ficha leída, 16.746 declaran carrocería (81,3 %), 17.651 puertas y 17.612 color.

**Lo que se descartó, y por qué** — las dos opciones "obvias" del lado de Mercado Libre:

- *Partir el barrido por `VEHICLE_BODY_TYPE`*, como se parte por marca y modelo. La tarjeta de
  búsqueda no trae la carrocería (sólo km, caja y combustible), así que sería la única forma de
  tenerla por aviso desde la búsqueda. Medido: ~83 % de los avisos están en modelos con más de una
  carrocería, o sea casi el doble de páginas — y un 429 de ML deja al puente `:9656` diez minutos en
  su proxy residencial **para todos los jobs**. Además no alcanzaría: entre el 2 y el 8 % de los
  avisos no tiene el atributo (Peugeot 208: 427 avisos, 416 en la faceta), así que el barrido por
  carrocería tampoco reemplaza al de modelo.
- *La faceta `VEHICLE_BODY_TYPE` de la página de cada modelo*, que viene gratis en la página 0 que el
  barrido ya pide (es donde se lee `SHORT_VERSION`). Es la distribución del modelo, no el dato del
  aviso, y **Mercado Libre omite la faceta cuando el modelo tiene una sola carrocería**: Nissan Kicks
  (157 avisos, todos SUV) no devuelve ninguna, indistinguible de "no sé". Nuestras propias fichas
  dicen lo mismo y mejor.

**El orden de evidencia**, de la más firme a la más floja:

1. La **ficha propia** del aviso (`detail.bodyType`), agrupada en las nueve familias que un comprador
   distingue: las 16 carrocerías de ML se reducen a `sedan hatchback suv pickup rural furgon
   monovolumen coupe cabriolet`. Crossover y Off-Road van con SUV porque acá son la misma compra;
   Rural queda aparte de SUV porque una familiar no lo es; furgón y monovolumen **no** se mezclan (una
   Fiorino de reparto y una Spin de siete plazas no son el mismo auto). `basis: "advert"`.
2. La **carrocería dominante de su modelo** entre nuestras fichas (`marketSlug`, ≥ 8 fichas y ≥ 90 %
   de acuerdo). `basis: "model"`. El diccionario se arma **sólo con fichas**: si lo alimentara también
   lo leído del título, ocho avisos de Facebook que dicen "sedán" le enseñarían al modelo una
   carrocería que nadie corroboró, y esa adivinanza volvería multiplicada sobre los demás.
3. La **palabra del título** ("Corsa Wagon", "Gol Sedán", "Berlingo Van"), sólo para los avisos sin
   ficha — Facebook y las webs de automotora nunca la tienen. Va **después** del diccionario, no
   antes: en "Chevrolet Tracker Ltz **Rural** 5 Puertas" el vendedor usa "rural" con el sentido
   uruguayo de "cinco puertas" y el auto es un SUV, cosa que las 153 fichas de Tracker dicen sin
   ambigüedad. Así el título manda exactamente donde el diccionario se abstiene, que es donde el
   modelo tiene de verdad más de una carrocería y el título es lo único que las distingue.
4. Nada. **Un aviso sin carrocería nunca cumple un filtro de carrocería**, igual que pasa con los
   kilómetros y con el consumo.

Medido con el módulo real sobre los 20.601 avisos de producción: **93,6 % con carrocería** (16.886
del aviso, 2.391 del modelo, 1.324 sin dato). Por fuente: ML 97 %, Facebook 72 %, Car One 77 %,
Carper 75 %, Motorlider 80 %, Clasiautos 57 %, Dueño Directo 41 %.

Público como `body: { type, basis }`, `doors` y `color` (índice `{ "body.type": 1, priceUsd: 1 }`).
La tarjeta imprime la carrocería estimada con un "≈" delante — la misma convención que el consumo
estimado— y la ficha dice de dónde sale. El color se normaliza a 15 familias ("Gris oscuro" → gris,
"Plateado" → plata, "Bordeaux" → bordó); un color que no está en la lista no se publica.

**Filtros avanzados** del directorio, todos sobre datos que ya existían: puertas, color, publicado en
los últimos N días (`firstSeen`), bajó de precio (`priceDrop`), sólo oportunidades (`opportunity`) y
**sin deuda ni choque declarados** (`risks.0` no existe). Ese último dice "declarados" a propósito:
la ausencia no es una afirmación de que el auto esté limpio, sólo de que el vendedor no dijo nada
— la misma regla del tablero de riesgo. Los interruptores viajan por la URL como `=1` y cualquier
otra cosa los apaga, así que `?priceDrop=0` no filtra.

La carrocería entra además en `CarSubjectFilters`, o sea también en `/oportunidades-autos-usados-uruguay`
y en `/autos-chocados-y-con-deuda-uruguay`: las tres son listas de avisos y quien filtra por
carrocería en una espera poder hacerlo en las otras.

## Precio con motivo: el riesgo declarado

`/autos-chocados-y-con-deuda-uruguay`. Lo que el aviso DICE del auto —deuda o prenda, papeles que
faltan, choque, recupero de seguro, mecánica rota, chapa extranjera, ex taxi— con la frase textual del
vendedor al lado y cuánto menos pide que los mismos autos que no declaran nada.

Medido el 2026-09-18 sobre 18.796 avisos vigentes, y estas tres cifras explican el diseño entero:

- **185 avisos (1 %) traían bandera de riesgo**, porque las banderas salían del título y la descripción
  sólo se bajaba para candidatas: de Mercado Libre había 122 fichas de 16.865 avisos. De ahí nace
  `currency-autos-detail`.
- Corrido contra las 647 descripciones que sí teníamos, el extractor encuentra algo en **57 avisos, el
  8,8 %** de los que tienen descripción.
- **Las medianas por categoría con pocos avisos no son datos**, y esto se aprendió publicándolas.
  Con 6-7 avisos medidos la deuda dio **−21 %** y con 13, **−2 % con el rango cruzando el cero**; papeles
  cambió de signo dos veces el mismo día. El chocado da −34 % pero sobre 5 avisos. Por eso una categoría
  publica mediana recién con **10** avisos medidos, y toda afirmación ("la deuda se descuenta") exige
  además que el 50 % central entero esté del mismo lado del cero. `financing` y `price_mismatch` dan
  **≈0 %** (n=38): no son riesgo, son truco de aviso, y por eso no entran a la taxonomía.
  El formateador escribía el signo menos fijo delante del número y publicó `−-2 %`; ahora dice
  "21 % más barato" o "2 % más caro", y si el 50 % central cruza el cero, "sin diferencia clara".
- **La tasa real es ~3 %**, no 8,8 %: las primeras 647 descripciones eran de candidatas a oportunidad
  (avisos baratos), y ahí el riesgo está sobrerrepresentado. De las 1.500 fichas siguientes, leídas por
  la cola normal, 44 declaran algo. Sobre los 16.900 avisos de ML eso proyecta ~500.

Reglas, todas en `classes/autos/risk.ts` y `riskAnalyze.ts`:

- **El que afirma es el vendedor.** Se publica su frase, nunca una conclusión nuestra. Para poder citar
  sin desalinear los índices existe `foldOffsets` (baja acentos y mayúsculas sin mover un carácter).
- **Lo negado no cuenta.** "Sin deuda" y "nunca chocado" son argumentos de venta. De 43 coincidencias
  crudas de "deuda" en las descripciones reales, la mayoría eran "sin deuda".
- **La cohorte de referencia es la limpia.** Comparar un chocado contra otros chocados no dice nada, y
  meter chocados en la mediana del modelo abarata a todos. Un aviso sin ficha propia puede estar en la
  referencia: lo que se afirma de él es "no dice", no "no tiene".
- **Sin comparables no hay número.** El aviso se publica igual, diciendo que no se pudo medir. Una
  categoría muestra mediana recién con cinco avisos medidos.
- **La ausencia no es una afirmación**: que un aviso no declare nada no quiere decir que el auto esté
  limpio. La página lo dice y enlaza las verificaciones (SUCIVE para la patente, certificado registral
  en la Dirección General de Registros para prenda y embargo; las dos fuentes se abrieron el
  2026-09-18).

## Las fotos, y qué se hace con la IA

`classes/autos/llm/vision.ts` le pasa a Gemini hasta cuatro fotos del propio aviso con lo que ese aviso
afirma y pregunta tres cosas: si el auto concuerda, si se ve daño, si son fotos de catálogo. Existe
porque **tres de las cuatro brechas más grandes de la primera corrida en vivo eran autos chocados que
el título no decía** y las fotos sí mostraban.

**La IA no publica, filtra.** Dos usos y ninguno más:

1. Retirar en silencio una oportunidad que sus propias fotos contradicen (`photo_damage`,
   `photo_mismatch`, `photo_catalog` en `rejectedByDetail`).
2. Corroborar lo que el vendedor YA declaró (`photoConfirms`).

El sitio **nunca** publica "este auto está chocado" sobre un aviso que no lo dice: equivocarse de un
lado cuesta una oportunidad; del otro, difama a una persona cuyo nombre y teléfono están en el aviso.
Sólo lo inequívoco descalifica: "no se ve" no retira nada y el daño leve tampoco. Sin `GEMINI_API_KEY`
el módulo es inerte y el resto del pipeline no cambia.

## Versiones: el vocabulario se mina del corpus

7.056 avisos no tenían versión, y no por falta de inteligencia sino de vocabulario: la faceta de ML
lista **cero versiones en 515 de 932 modelos**, y donde lista algo el aviso usa otra palabra (lista
"Privilegio", el título dice "Privilege"; lista "Trendline", el título dice "Trend").

`classes/autos/catalog/trims.ts` mina candidatos del propio corpus. Sin filtros el minado **empeora** la
lectura (61,7 % → 60,3 %), porque publica como versión el nombre de la automotora ("Fullcars",
"Barriola") y "buen" de "Muy Buen Estado", y esa basura genera ambigüedad, que hace abstenerse. Tres
reglas lo dan vuelta: un candidato bajo más de dos modelos es un vendedor y no una versión; la firma
después de " - " en el título es un nombre; y ante dos aciertos, el nombre que publica Mercado Libre le
gana al minado. Medido: **61,7 % → 66,1 %** (+834 avisos), y "Confort" y "Comfort" pasan a ser una sola
cohorte.

Lo que NO hizo: sumó apenas **+121 avisos a cohortes de ≥5**. El cuello de botella no era el
vocabulario sino la fragmentación del mercado (año × versión × motor × caja). Vale por la etiqueta
pública y por unificar variantes, no como palanca de oportunidades.

Las dos mediciones se reproducen con `npm run cars_trim_report` y `npm run cars_risk_report` sobre un
volcado del corpus (`CARS_CORPUS=`, `CARS_VOCAB=`).

## El informe del mercado

`/mercado-de-autos-usados-uruguay`, desde `classes/autos/report.ts` → `carreportsnapshots`. Agregados
sobre los mismos avisos: composición del mercado, oferta por marca y modelo, depreciación por modelo,
margen de negociación observado, automotora contra dueño y qué se compra con cada presupuesto.

**Lo primero es lo que el informe no puede decir**, porque es lo primero que alguien busca en un
informe así: cuáles son los más vendidos. En Uruguay las transferencias de usados no se publican
abiertas por modelo; lo que tenemos son AVISOS, y un modelo con mucha oferta puede ser el más vendido
o el que nadie se saca de encima. La medición que más se le parece es la **rotación** —cuánto tarda un
aviso en desaparecer—, que se calcula todos los días y **no se publica** hasta tener 14 días de serie
y 150 avisos retirados. La serie propia arrancó el 2026-09-17: con día y medio, "los avisos duran 1,1
días" mide cuándo empezamos a mirar, no el mercado.

Tres defectos que sólo aparecieron mirando el informe ya calculado, y que valen como advertencia para
el próximo agregado:

1. **La caída anual daba 1,8 % para la Fiat Strada.** Era la mediana de las razones entre años
   consecutivos, y los años recientes —que son los que más avisos tienen— están casi planos, así que
   la mediana se paraba ahí y no veía que de 2025 (US$ 18.500) a 2019 (US$ 11.995) hay 35 % en seis
   años. Ahora es una recta por mínimos cuadrados sobre el log de la mediana de cada año, ponderada
   por la raíz de los avisos. El rango pasó de 1,8–14,8 % a 2,5–12,8 %, que es un mercado creíble:
   los chicos populares aguantan (Prisma 2,5 %, Celerio 4,1 %) y las SUV y pick-ups grandes caen
   (Amarok 12,8 %, Tiguan 11,2 %).
2. **"Con US$ 30.000, ¿qué compro?" contestaba "un Gol".** Listaba los modelos con más avisos POR
   DEBAJO del tope, y abajo de 30.000 entra casi todo el mercado. La franja ahora es 80–100 % del
   presupuesto y lo que se muestra es el AÑO que ese dinero paga: con 30.000, Hilux 2013 o Compass
   2023; con 10.000, Kwid 2020 o Gol 2013.
3. **La diferencia automotora/dueño publicaba −22 % para el VW Vento** con dos años comparados. Con
   tres años mínimos queda en 2,7 % mediano sobre 30 modelos, y los negativos que sobreviven son
   hallazgo y no ruido: en SUV y pick-ups grandes la automotora no es más cara.

Medido el 2026-09-18: 17.684 avisos comparables, 80 marcas, 942 modelos; mediana US$ 13.000, año 2018,
107.000 km; 83 % nafta, 65 % manual, 51 % automotora; Montevideo 48 %.

## El tasador y la guía para vender

`/cuanto-vale-mi-auto-uruguay` (matemática pura en `app/utils/carsValuation.ts`) toma la cohorte del
mismo modelo y año de `carmarketsnapshots` —o la de la misma versión, motor y caja si la persona la elige
y tiene 5 avisos— y devuelve tres precios de publicación: para vender rápido (p25), de mercado
(mediana) y tope realista (p75), corregidos por kilómetros y redondeados a las terminaciones que usa el
mercado (900 23 %, 500 20 %, 990 18 %). La corrección por kilómetros nunca pasa del 25 %; con menos de 5
avisos no da número. La elección vive en la URL: un resultado se comparte y abre calculado desde el
servidor, y cada combinación es `noindex`.

`/vender-mi-auto-uruguay` dice lo mismo para quien vende, y sus coeficientes salen de
`classes/autos/valuation.ts`, medidos **emparejados** (mismo modelo y año) y como mediana de cohortes.
Lo que dieron el 2026-09-19:

| palanca | efecto | sobre |
|---|---|---|
| 10.000 km más | −1,6 % | 359 cohortes de modelo y año |
| caja automática, misma versión | +5,1 % | 28 cohortes de modelo, año, versión y motor |
| caja automática, sin fijar versión | +10,2 % | 104 cohortes de modelo y año |
| un año más de antigüedad | −5,4 % | mediana de 34 modelos |
| automotora en vez de dueño | +2,2 % | 30 modelos |

Dos confusiones que la medición emparejada sacó a la luz: **la mitad del "premio" de la caja automática
es el equipamiento** con el que suele venir (5,1 % contra 10,2 %), y **el diésel no se puede medir así**:
dio +48,5 % sobre 17 cohortes, pero en los modelos que se venden con los dos combustibles el diésel es
la 4x4 o la cabina doble. Se calcula y no se usa como consejo.

Lo que la guía NO puede decir, y lo dice: el precio al que se cierra (sólo hay precios pedidos), cuánto
tarda en venderse (la rotación todavía no tiene serie) y cuánto paga una automotora por un auto que toma
en parte de pago (ninguna lo publica).

El informe gana arriba una sección **"Lo que dicen los datos"** (`carReportFindings`): conclusiones
calculadas, cada una aparece sólo si la medición que la sostiene está y dice su número. Ninguna es texto
fijo, porque un hallazgo escrito a mano sigue diciéndose el día que deja de ser cierto.

## La ficha técnica y la galería del aviso (2026-09-22)

La página de cada aviso (`/autos-usados-uruguay/<key>`) publica la **ficha técnica** que la página
propia de Mercado Libre trae como tabla y nadie leía, y la **galería** del propio aviso.
`classes/autos/specs.ts` (lectura y rearmado), `app/utils/carsSpecs.ts` (etiquetas y tablas).

**Medido el 2026-09-22 sobre 27 fichas reales**: las 12 filas básicas (marca, modelo, año, versión,
km, motor, color, puertas, caja, combustible, carrocería y "Control de tracción") están en TODAS;
potencia, tanque, largo × alto × ancho, distancia entre ejes, plazas y válvulas por cilindro en ~20
de 27; y después una lista de equipamiento en Sí/No que va de 0 a 45 filas según lo que marcó el
vendedor. Las marchas no tienen fila: sólo las dice el `ld+json` (`numberOfForwardGears`), y el
tanque a veces también (`fuelCapacity`); las dos entran a la tabla privada bajo "Marchas" y
"Capacidad del tanque" cuando la tabla no las trae.

Reglas, todas distintas de las de carrocería y consumo:

- **Nada se estima.** La carrocería y el consumo publican un "≈" cuando salen de los demás avisos
  del modelo; acá no hay "≈": o lo dice la ficha de ESTE aviso o el campo es null. Sólo Mercado
  Libre tiene ficha leída, así que sólo sus avisos llevan `specs`; Facebook y las webs de
  automotora, no.
- **Sólo cruza la frontera lo que está en la lista.** `detail.specs` guarda la tabla ENTERA tal
  cual la etiqueta la página (privado, para poder mirar qué más hay); `carSpecsOf` rearma un
  objeto público con campos fijos —potencia, válvulas, marchas, tracción, dirección, tanque, baúl,
  medidas, plazas, equipamiento en Sí y en No, único dueño, permuta, negociable, garantías— y una
  etiqueta que no conoce no se publica. Del lado de la app `publicCarRow` lo vuelve a rearmar
  clave por clave (`specsOf`), como todo lo demás.
- **Una cifra que no puede ser la de un auto no se publica**: potencia fuera de 20–1.500 hp,
  tanque fuera de 10–300 L, medidas fuera de 2–7 m de largo y 1–2,6 m de alto y ancho, más de 15
  plazas. En milímetros el punto es de miles ("2.600 mm"); en litros la coma es decimal ("77,6 L").
- **"Control de tracción" es la tracción.** Mercado Libre archiva ahí Delantera / Trasera / 4x4 /
  4x2 / Integral; el control de tracción de verdad es la fila "Tracción ASR" y va al equipamiento.
- **El "No" también se publica**, aparte (`missing`): "Bluetooth: No" es un dato que el vendedor
  dio, y la página lo muestra tachado. Lo que la ficha no menciona no está en ninguna de las dos
  listas, y la página no lo presenta como ausente.
- **La galería son las fotos del propio aviso** (`detail.pictures`, el `data-zoom` de la página,
  hasta 6), cada una atada al host de fotos de su fuente como la de portada. Sólo la sirve la ficha:
  `carFichaProjection` suma `pictures` y `specs` a la proyección del listado, que sigue sin ellos
  — una lista de 24 tarjetas no tiene qué hacer con seis URLs y cuarenta claves por fila.

**El relleno se hace solo.** `currency-autos-detail` suma la razón `specs` a su cola: una ficha
leída antes de esta fecha (sin `detail.specs`) vuelve a leerse UNA vez, después de todo lo que
nunca se leyó; una tabla vacía (`{}`) ya cuenta como leída. A 400 por hora, las ~19.500 fichas
vigentes se recorren en dos días, y la relectura a los 14 días sigue igual.

La ficha se muestra como tres tablas (motor y mecánica, medidas y capacidad, condiciones del
aviso) más el equipamiento por grupo (seguridad, confort, audio y conectividad, exterior), con la
fecha de lectura y la aclaración de que lo cargó el vendedor. El `ld+json` `Car` de la página
gana `image`, `bodyType`, `color`, `fuelType`, `vehicleTransmission`, `vehicleEngine`,
`seatingCapacity`, `numberOfForwardGears`, `driveWheelConfiguration` y `fuelCapacity`. Las
tarjetas y el directorio no cambian: la ficha técnica no filtra ni ordena nada (todavía).

## Teléfonos de vendedores

Desde el 2026-09-21 la ficha muestra, con un clic, el teléfono que el vendedor escribió en el texto
público de su aviso o el número comercial de la automotora. Política, fuentes medidas, vencimiento y
bajas en [AUTOS_CONTACTOS.md](AUTOS_CONTACTOS.md).

## El asesor de compra y los repuestos (2026-09-24)

`/que-auto-comprar-uruguay`: la persona contesta presupuesto, uso, kilómetros por año, cuántos
viajan, caja, combustible, carrocería, hasta tres prioridades y un gasto mensual máximo, y recibe
hasta ocho modelos con el año que le alcanza, el costo mensual de tenerlo y lo que resigna. La
respuesta vive en la URL (cada combinación es `noindex`), y el cálculo corre en el servidor por
pedido (`app/utils/carAdvisor.ts`) sobre una tabla chica precalculada.

**La tabla** (`classes/autos/advisor.ts` → `caradvisorsnapshots`, la escribe cada corrida de
`currency-autos` al lado del informe, sobre los mismos avisos comparables): una fila por modelo con
12+ avisos, partida en **variantes combustible × caja** (6+ avisos) con p25/mediana/p75 por año
(3+ avisos), el consumo mediano, la carrocería dominante, lo que dicen las fichas técnicas (plazas,
baúl, largo, potencia, proporción 4x4 y de ABS, airbags, control de estabilidad e ISOFIX como
sí/(sí+no)), la caída anual con la misma recta del informe y el índice de repuestos. Si el armado
falla, la corrida sigue publicando catálogo e informe y se conserva el snapshot anterior.

**Los repuestos** (`currency-autos-parts`, `sync_autos_parts.ts`, 02:11, 18:11 y 22:11 UTC): seis piezas por
modelo —pastillas delanteras, filtro de aceite, amortiguador delantero, kit de embrague, kit de
distribución y óptica delantera— buscadas en Mercado Libre por el puente `:9656`, cada una en su
categoría (`CAR_PARTS` en `classes/autos/repuestos.ts`). Reglas que salieron de títulos reales:

- el modelo va como palabra entera y con todas sus palabras ("Peugeot 2008" no es un 208, "Citroen
  C4 06-" no es un C4 Cactus), y un nombre de tres letras o menos exige la marca ("Pick Up" no es
  un Up!);
- la trasera no es la delantera, y donde el precio es por unidad (amortiguador, óptica) un par o un
  kit no cuenta;
- **la distribución exige "kit"**: la categoría mezcla correas sueltas con kits y el Onix iba de
  $ 508 a $ 6.740 en la primera corrida;
- 3 ofertas y **2 vendedores** para que una pieza tenga precio (el filtro del C4 Cactus salía de uno
  solo); las ofertas sin vendedor identificado cuentan como un solo vendedor;
- **el título tiene que nombrar la pieza**, además de la categoría: un filtro de aire no es de
  aceite, discos con pastillas no son pastillas, un faro auxiliar no es la óptica;
- el modelo se reconoce junto o separado ("Tcross", "Rav 4", "S-10"), la cilindrada no se lee como
  modelo ("Mazda 6 2.3" no nombra al Mazda 3) y **un modelo más largo de la misma marca no es
  este**: "C4 Cactus" no cuenta para el C4, ni "Onix Plus" para el Onix;
- una página sin lista de resultados, o que no aplicó la categoría pedida, es una falla y no "cero
  ofertas"; una lectura con menos de 3 piezas no pisa una anterior que tenía índice.

El índice es la media geométrica de (mediana del modelo / mediana de todos los modelos) con 3+
piezas; una pieza entra a la base con 5+ modelos, y la base sale sólo de los modelos que hoy están
en el asesor. Nunca se suma una canasta a la que le faltan piezas. Ritmo: 10 min por corrida en el
hueco :11-:21 del puente (entre movilidad y sillas horarias), tres corridas por día lejos de las
barridas diarias de ML, 2 s entre pedidos, sin reintentos dentro de `fetchJson`, el reloj mirado en
cada pedido y relectura cada 14 días; tres pedidos sin respuesta cortan la corrida y un modelo sólo
se guarda si sus seis búsquedas contestaron. `--dry-run --models=a,b` imprime sin escribir. Medido
el 2026-09-24: 248 modelos con 12+ avisos; Onix con 17-43 ofertas por pieza. En el asesor, un modelo
relevado con menos de 3 piezas con precio vale como no relevado: no se afirma que no tenga repuestos.

**El orden** (`app/utils/carAdvisor.ts`), con tres defectos que sólo aparecieron leyendo la salida
real de cuatro perfiles: con US$ 20.000 recomendaba un Geely LC 2017 de US$ 6.900 (ahora un auto bajo
el 40 % del presupuesto queda afuera si hay 3+ opciones en rango, y el uso del presupuesto pesa en
"lo más nuevo posible"); la primera razón decía "con US$ 20.000 llegás a un 2017" cuando 2017 era
el año más nuevo a la venta; y el espacio de una familia de cinco lo ganaban autos chicos porque el
baúl de las fichas se carga con los asientos rebatidos (Up! con 985 L). El espacio mira sobre todo el
largo, descarta baúles y plazas imposibles para la carrocería, en pick-ups y furgones no cuenta el
largo (es la caja) y, si la ficha no dice nada, la carrocería aproxima el tamaño sólo para ordenar.
Los precios por año salen de la cohorte limpia (sin avisos que declaren choque, deuda o papeles),
la misma que muestra el enlace al directorio.

**El costo mensual** (`app/utils/carAdvisorFigures.ts`): combustible (consumo de la variante × km ×
ANCAP), patente estimada con el Texto Ordenado del SUCIVE 2026 leído del PDF (4,5 % del valor de
mercado, eléctricos 2,25 % sin IVA, piso $ 8.770,10, dólar del SUCIVE $ 41,826, bonificación 20 % o
10 % no acumulable; el aforo no se publica por modelo, así que se estima con la mediana pedida), SOA
promedio del BCU y el mantenimiento del comparador de transporte con la parte por km escalada por
el índice de repuestos. La depreciación se muestra aparte: no sale del bolsillo cada mes.

**Latin NCAP** (`app/utils/latinNcap.ts`, 124 resultados verificados uno por uno en latinncap.com
el 2026-09-24): se MUESTRAN los ensayos del modelo y **no puntúan**, porque Latin NCAP califica una
versión en un momento y casi nunca dice a qué años de modelo aplica (el Onix tiene 0 estrellas
adulto en 2017 y 5 en 2019; son dos generaciones). Quedaron afuera tres resultados cuyo auto no es
el que se vende acá (Vento hecho en India, Sentra B13, Dolphin Plus). Sin ensayo no es cero.

Lo que la página no puede decir, y dice: cuánto falla cada modelo (nadie lo publica), el precio de
cierre y el seguro contra todo riesgo.
