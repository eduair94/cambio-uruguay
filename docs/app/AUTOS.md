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
- El descuento es real y medible. Con la taxonomía separada y 3.100 fichas leídas (18/9 a la noche):
  **deuda −25 %** (n=5 medidos de 34 avisos) y **papeles −2 %** (n=7 de 28). Que la deuda se descuente
  diez veces más que un papel faltante tiene sentido y no se sabía: una deuda es un número que el
  comprador puede calcular y restar, un título que falta no tiene precio de lista. `financing` y
  `price_mismatch` dan **≈0 %** (n=38): no son riesgo, son truco de aviso, y por eso no entran a la
  taxonomía.
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
