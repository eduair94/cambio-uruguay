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

Descartadas y por qué: Gallito (el permiso de El País cubre sólo inmuebles), AG Automóviles, Go Select
y Motorlider (130 entre las tres, el mismo stock que publican en ML), clasificados.st (spam), heiwork y
Trovit (agregadores), Autodata/URUTAX (pago).

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

No se esquiva: **nada de proxies ni de UA falsa** para entrar donde nos bloquean. Las dos fuentes
quedan encendidas y reintentan una vez por día (una lectura cada una, anotada en
`uy-cars-source-<fuente>`); si el bloqueo era temporal vuelven solas. Para incluirlas de verdad hay
que pedirle a cada sitio que habilite el bot —la UA lleva el contacto— o leerlas desde otra IP.

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

## Colecciones (APP DB)

Privadas: `carlistings` (observación de cualquier fuente, historial de precio, ficha con descripción),
`carfbcards` (tarjetas y fichas de Facebook), `carguideentries` (guía de ML) y `carharvestmetas`
(`uy-cars`, `uy-cars-last-full`, `uy-cars-last-fast`, `uy-cars-vocabulary`, `uy-cars-publish`,
`uy-cars-source-<fuente>`, `uy-cars-fb-wanted`, `uy-cars-guide`).
Públicas: `carcatalog`, `carcatalogmetas` (`uy-cars`, con cobertura por fuente), `carmarketsnapshots`
(con la guía), `caropportunitysnapshots` (`used`, `car-cohort-v2`).

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
