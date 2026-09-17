# Autos usados: más fuentes, catálogo de versiones y precio de referencia — diseño

Fecha: 2026-09-17. Pedido: "investigar otros sitios donde se publiquen vehículos e integrarlos, cuanto
más mejor" y "una base de datos de vehículos para cruzar con las publicaciones, determinar cuál es
cuál y tener precios de referencia agregados". Sigue a
`docs/superpowers/specs/2026-09-16-autos-usados-directorio-y-oportunidades-design.md` (v1 = sólo ML).

## 1. Lo que se midió (2026-09-17)

| Fuente | Usados | Contrato que se lee | Qué trae |
|---|---|---|---|
| Facebook Marketplace (Vehículos) | ~50 nuevos por hora en todo el país | GraphQL de la propia página, en el Chrome con sesión del VPS (CDP `127.0.0.1:9224`) | título libre, monto, ciudad, id de vendedor. **Todos los campos `vehicle_*` vienen `null` en Uruguay** y `currency` es siempre `"UYU"` aunque el monto sea en dólares. La ficha (≈10 s) trae la descripción. Sólo 39 % de los títulos nombra marca o modelo |
| Car One (Magento) | 226 (`carone_estado=96`) | HTML del listado, 12 por página, `&p=N` | marca, modelo+versión, año, km, combustible, precio US$ |
| Clasiautos (tema Listivo) | 243 | `/wp-json/wp/v2/listings` | todo estructurado: marca, modelo, motor, año, km, caja, combustible, `U$S 15,000`, Particular/Automotora, fotos, descripción |
| Julio Automóviles (tema Vehica) | ⊂ 334 (usados + 0 km) | `/wp-json/wp/v2/cars` + taxonomías `vehica_*` | estado, marca, modelo+versión, año (término), km, cilindrada, precio `{moneda: monto}` |
| Shopping de Autos (WooCommerce) | 171 | `/wp-json/wc/store/v1/products` | atributos Año, Kilómetros, Marca, Modelo, Motor, Transmisión, Combustible, Estado; versión en el nombre |
| Carper usados (WooCommerce) | ~425 (relevamiento del 16/9) | ídem en `usados.carper.com.uy` | ídem; precios en centavos (`currency_minor_unit`), `Estatus: NO APTO PARA LA VENTA` |
| Fidocar (Fenicio) | 112 | `/sitemap/catalogo-articulos.xml` + microdatos y tabla de la ficha | precio+moneda, Año, Kilometros, Transmisión; marca/modelo/versión en el nombre |
| Guía de Precios de ML | 112 marcas | `/precios-autos/<marca>/<modelo>/<año>/` (robots no la bloquea, el VPS recibe 200) | precio promedio del año y **precio por versión**, actualizado a diario |

Descartadas: Gallito (31 avisos; es de El País y el permiso vigente cubre sólo inmuebles),
AG Automóviles / Go Select / Motorlider (130 entre las tres; AG usa multiaviso, que publica el mismo
stock en ML y FB, y Go Select es ASP.NET con postbacks), clasificados.st (spam), heiwork y Trovit
(agregadores), vendemetuauto (sin stock), BuscandoAuto (datos de prueba), Autodata/URUTAX (pago).

**La guía de ML no es una referencia independiente**: Hilux 2018 DX = US$ 32.990 en la guía y en la
mediana propia. Vale como catálogo (qué versiones existen cada año) y como segunda opinión donde la
muestra propia no alcanza (Hilux 2018 SR: la guía da 32.500, la muestra propia no tiene 5 avisos).

## 2. Qué se construye

1. **Lectores por fuente** en `classes/autos/sources/`, uno por contrato: `woo.ts` (Shopping de Autos,
   Carper), `wordpress.ts` (Listivo = Clasiautos, Vehica = Julio), `fenicio.ts` (Fidocar),
   `carone.ts`, `facebook.ts`. Cada uno devuelve `CarSourceResult` (§4) y nunca lanza.
2. **Diccionario y reconocedor** (`classes/autos/catalog/dictionary.ts`, `match.ts`): marcas y modelos
   con los ids de ML, alias ("vw", "chevy", "mercedes"), versiones por modelo. Dado un texto (y los
   campos que la fuente ya trae) devuelve marca/modelo con ids de ML, año, km, motor, caja,
   combustible y moneda declarada. Así un aviso de otra fuente cae en la **misma cohorte** que los de
   ML.
3. **Guía de precios** (`classes/autos/catalog/guide.ts` + job `currency-autos-guide`): lee sólo los
   modelos y años que el directorio tiene, primero los que nunca se leyeron y después los más viejos,
   con presupuesto de 40 min y 1,5 s entre pedidos. Guarda una fila por (marca, modelo, año).
4. **Duplicados entre fuentes** (`classes/autos/dedupe.ts`): las automotoras publican el mismo auto en
   ML y en su web (multiaviso lo hace en un clic). Mismo modelo y año, km a ±max(500, 1 %) y precio en
   dólares a ±3 % ⇒ es el mismo auto; se queda el de mayor prioridad (ML > webs > Facebook). El
   duplicado no entra ni al directorio ni a la estadística, y se cuenta por fuente.
5. **Precio de referencia en lo público**: cada ficha lleva `reference` (guía, por versión si la
   versión coincide, si no el promedio del año) y la página de precios por modelo agrega la tabla de
   la guía por año y versión, rotulada como "guía de Mercado Libre".
6. **App**: fuente visible en tarjeta, ficha y comparables ("Ver en Clasiautos"), filtro por fuente,
   cobertura por fuente en el pie del directorio, textos de método actualizados.

## 3. Facebook Marketplace

- **Por qué CDP directo y no el puente :9657**: el puente sólo busca por texto y descarta los campos
  de GraphQL; vive en otro repo. El lector se conecta al Chrome del perfil (`AUTOS_FB_CDP_URL`,
  default `http://127.0.0.1:9224`), abre **su** pestaña, la cierra y se desconecta sin cerrar el
  navegador — el mismo contrato que el puente. Antes de abrir nada consulta
  `AUTOS_FB_HEALTH_URL` (default `http://127.0.0.1:9246/health`) y exige `sessionStatus: "valid"`.
- **Qué lee**: el feed de Vehículos ordenado por más nuevo (corrida diaria 80 scrolls, horaria 15) y,
  en la diaria, búsquedas por las 20 marcas con más avisos (4 scrolls cada una) para volver a ver
  avisos viejos. Captura las respuestas `/api/graphql` y el JSON embebido.
- **Fichas**: sólo de tarjetas que el reconocedor identifica (marca+modelo) y a las que les falta año,
  km o moneda; primero las más nuevas. Tope 120 por corrida diaria y 15 por horaria, 6 s entre fichas.
- **Freno**: una redirección a `/login` o `checkpoint` corta Facebook por el resto de la corrida y
  queda anotada (`failingSince`). `AUTOS_FB_ENABLED=0` lo apaga sin desplegar.
- **Moneda**: si el texto la declara ("U$S", "USD", "dólares" / "$U", "pesos") se usa esa. Si no, se
  compara el monto contra la referencia del modelo y año (mediana propia, si no la guía): se elige la
  moneda cuyo valor en dólares cae dentro de ×0,4–×2,5 de la referencia, **sólo si cae una sola**. Si
  no hay referencia o caen las dos o ninguna, el aviso no se publica. Una moneda deducida se publica
  como `currencyInferred: true` y **nunca** entra a la estadística de oportunidades.
- **Lo que no se toma**: nombre del vendedor, descripción (sólo para banderas), mensajes, nada que
  exija interactuar. El id de vendedor queda privado (sólo para el tope por vendedor).
- **Vida pública**: Facebook es parcial; nunca se retira por ausencia. Una tarjeta sale de la ventana
  pública de 4 días si no se la vuelve a ver; una ficha leída con `is_live` la refresca y una con
  `is_sold`/no disponible la retira.

## 4. Datos

- `RawCarListing.source`: `"mercadolibre" | "facebook" | "clasiautos" | "julio" | "shoppingdeautos" |
  "carper" | "fidocar" | "carone"`. Clave `<prefijo>-<id>`: `ml-`, `fb-`, `clasiautos-`, `julio-`,
  `sda-`, `carper-`, `fidocar-`, `carone-`.
- `RawCarListing` suma `specText` (privado: "motor 1.6 versión EXCLUSIVE", para derivar motor y
  versión con las mismas reglas que ML), `dealerName` (nombre comercial de la automotora, público) y
  `currencyInferred`.
- `CarSourceResult = { source, ok, complete, listings, details, requests, note }`. `complete` = se leyó
  el inventario entero sin fallas; **sólo entonces** un aviso ausente suma una barrida perdida
  (retiro a las 2, la regla de ML). `details` = la ficha sintetizada (webs: la propia lectura; FB: la
  ficha leída) con `readAt`, `active`, descripción y banderas, para que `detailVerdict` valga igual.
- Vendedor: automotoras = `source` (un solo vendedor, tope 2 comparables); Clasiautos = autor; FB =
  id del vendedor. Nada de eso es público.
- 0 km fuera: estado "Nuevo"/"0km" o km < 1.000 con año ≥ el actual.
- Marca/modelo sin equivalente en ML ⇒ id `x-<slug>`: se publica pero no forma cohorte con ML.
- APP DB privada nueva: `carfbcards` (tarjeta, ficha, reconocimiento, fechas) y `carguideentries`.
  Pública: campos nuevos en `carcatalog`, `carcatalogmetas` y `carmarketsnapshots`.

## 5. Contrato público (cambios)

- `PublicCarListing`: `source`, `sourceName`, `currencyInferred`, `reference: { priceUsd, basis:
  "version" | "year", updatedAt } | null`.
- `PublicCarComparable`: `source`, `sourceName`.
- `PublicCarCatalogMeta`: `sources: { source, name, listings, duplicates, lastReadAt, ok }[]`.
- `PublicCarMarketSnapshot`: `guide: { year, averageUsd, versions: { name, priceUsd }[] }[]` y
  `guideUpdatedAt`.
- Permalinks aceptados por fuente (prefijo exacto) y fotos por host: `http2.mlstatic.com`,
  `*.fbcdn.net`, `clasiautos.uy`, `julioautomoviles.com.uy`, `shoppingdeautos.uy`,
  `usados.carper.com.uy`, `f.fcdn.app`, `cdn.impel.io`.
- `algorithm` pasa a `car-cohort-v2` (la cohorte ahora mezcla fuentes).

## 6. Jobs

- `currency-autos` (diaria) y `-hourly` siguen con el mismo flock. Orden: ML → webs → Facebook →
  fichas de ML → análisis → publicación. `AUTOS_SOURCES` elige fuentes (default todas);
  `AUTOS_<FUENTE>_ENABLED=0` apaga una. La horaria lee ML (`since=today`), Facebook poco profundo y
  **no** relee las webs (su inventario cambia en días).
- `currency-autos-guide` (nuevo, `13 5 * * *`, lock propio): guía de ML, 40 min.
- Una fuente que falla conserva sus avisos (no se retira nada) y se anota en `carharvestmetas`
  `uy-cars-source-<fuente>` con `lastOkAt`/`failingSince`/`note`.

## 7. Pruebas

Fixtures reales recortados por fuente (JSON/HTML/GraphQL de 2026-09-17) para cada lector; el
reconocedor contra títulos reales de FB y de las webs; duplicados; inferencia de moneda; guía
(parser); proyección pública (hosts, prefijos, privacidad); contrato espejo con el app; corrida en seco
en vivo por fuente antes de desplegar.

## 8. Fuera de alcance

Gallito (falta permiso), Autodata (pago), AG/Go Select/Motorlider, motos y 0 km, alertas.
