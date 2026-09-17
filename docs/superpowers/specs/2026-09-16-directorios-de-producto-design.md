# Directorios de producto — diseño (16 de setiembre de 2026)

Implementa `docs/seo/2026-09-16-directorios-de-producto-plan.md` en su orden: **A** tiendas online,
**B** fichas de equipar, **C** celulares, **D** CyberLunes/Black Friday, **E** motos y bicicletas.
Cada subproyecto tiene su plan en `docs/superpowers/plans/2026-09-16-directorios-<letra>-*.md`, su
rama y su despliegue. Esta spec fija lo que comparten y las decisiones que no se ven en el código.

## 0. Lo que el relevamiento cambió antes de escribir una línea

Todo medido en producción el 16/9/2026 (APP DB por SSH, sólo lectura):

1. **`/equipar-casa-uruguay` publica hoy cifras equivocadas.** TYT (WooCommerce) declara
   `currency_minor_unit: 2` pero manda pesos enteros ("15900" = $ 15.900), y el adaptador divide por
   100: un Smart TV Samsung de 32" figura a $ 178 y la banda de TV 32" arranca en $ 659. Además hay
   yogures ("calcar de frutillas 130gr") como productos de "colchón 2 plazas", un convector Kassel y
   equipos de 9.000 BTU dentro de "aire 12.000 BTU", muebles para microondas en "microondas",
   cartuchos de gas en "anafe" y una linterna en "impresora". **B empieza por la calidad**, porque
   una ficha por categoría multiplicaría esos errores por 38 URLs indexables.
2. **Equipar tiene 109 productos y ninguno con dos vendedores.** El agrupado por `marca|modelo` a
   partir del título casi nunca coincide entre tiendas. MercadoLibre sí trae `catalog_product_id`
   (el retail ya lo guarda en `catalogId`) y nadie lo usa para agrupar. Con eso aparecen productos
   con varias ofertas; sin eso, fichas por modelo serían de un vendedor y no se publican.
3. **El puente de ML no da reputación de vendedor** (`/product/{id}` responde 403 upstream) y en la
   búsqueda compacta muchas veces falta `seller.id` (sillas tiene 65 ofertas `ml:unknown`). Sí trae
   `seller.name`, `official_store` y `price.original_amount` (precio tachado), que hoy se descarta.
4. **Trustpilot** (`:3029/trustpilot/feedbacks?domain=`) devuelve puntaje, cantidad, reseñas de los
   últimos 12 meses, si el perfil está reclamado y alertas al consumidor. **Google Maps** (`:2221`)
   acepta `findPlaceFromText` y `placeDetails`; el lugar se valida porque su `website` coincide con
   el dominio de la tienda, nunca por nombre.
5. **Plataformas** (relevamiento de 100 dominios desde el VPS): celulares se pueden leer en Claro,
   Zonatecno, Cellular Center, nstore, Zonalaptop, XUruguay, Market y Magic Center (Fenicio), Thot y
   Digital World (Woo) y Cover Company (Shopify). Bicicletas: Epicbike (Fenicio), Bikestore (Woo),
   Decathlon y Voltbike (Shopify). Motos: Albanés (Fenicio), Dilusso (Woo). Detrás de Cloudflare
   desde el VPS: LOi, Tienda Inglesa, Tiendamia, Farmashop, Urbanbikes, PC Store, Sodimac.

## 1. Base compartida (va con B, porque D necesita que el reloj arranque ya)

### 1.1 Retail

- `RetailListing.listPrice: number | null` — el precio tachado de ML (`original_amount`) y el
  `regular_price` de Woo/Shopify/VTEX cuando es mayor que el precio. Nunca se inventa.
- Vendedor de ML sin id: `sellerKey = ml:n:<slug del nombre>` en vez de `ml:unknown`, para que dos
  vendedores sin id no colapsen en uno. `ml:unknown` queda sólo cuando tampoco hay nombre.
- **Guarda de unidad por tienda** (`classes/retail/unitGuard.ts`): después de cosechar, la mediana
  de cada tienda por categoría se compara con la de MercadoLibre para la misma categoría; si queda
  por debajo de 1/20 con ≥5 productos, la tienda entera se descarta en esa corrida y la nota lo dice.
  Además, override explícito `priceInMajorUnits: true` para TYT en `stores.ts` (el Store API miente
  sobre la unidad). La guarda existe para la próxima tienda que haga lo mismo.

### 1.2 Historial por oferta (`classes/pricewatch/`)

- APP DB `pricewatchoffers`: un documento por `listingId` (sólo nuevos; nunca Facebook) con
  `vertical`, `productKey`, `sellerKey`, `sellerName`, `title`, `url`, `currency`,
  `history: [{ d, p, lp }]` (últimos 120 días, un punto por día, el último valor del día gana),
  `firstSeen`, `lastSeen`.
- Escritura con `bulkWrite` y update por pipeline (sin leer antes). Lo llaman `sync_equipar`,
  `sync_phones`, `sync_rodados` y `sync_chairs` después de guardar su catálogo, y un fallo de
  pricewatch **nunca** tumba la corrida del catálogo.
- Índices: `listingId` único, `{ vertical, lastSeen }`, `{ productKey }`.

### 1.3 Tiendas conocidas (`classes/stores/registry.ts` + espejo `app/utils/storeDirectory.ts`)

Registro curado con `key` (slug), nombre, dominio, tipo (`tienda-uy`, `marketplace`,
`plataforma-extranjera`), rubros, `aliases` (cómo aparece como vendedor en ML y en las tiendas),
`retailStoreKey`, dominio de Trustpilot y términos de Reddit. El app no puede importar desde la
raíz, así que el espejo lleva sólo `key`, nombre, rubros y alias, con un test de paridad
(`tests/stores/mirror_parity.test.ts`) como el de sillas. `storeSlugForSeller(name)` en el app
enlaza cualquier oferta de sillas, equipar, celulares o motos a la ficha de su tienda.

## 2. A — `/tiendas-online-uruguay`

**Job** `currency-store-profiles` (`sync_store_profiles.ts`, semanal, domingo 07:15 UTC) → APP DB
`storeprofiles` (uno por tienda) + `storeprofilesmeta`.

Señales, cada una con su `checkedAt` y su fuente, y **una señal que falla conserva la última buena**
(con su fecha vieja; a los 60 días se marca vencida y deja de mostrarse):

| señal | cómo | se publica |
|---|---|---|
| sitio | GET a la home: HTTPS, host final, plataforma, `tel:`/WhatsApp/`mailto:`, dirección JSON-LD, RUT (12 dígitos), enlaces a devoluciones/términos/privacidad por texto del ancla | datos que la tienda publica; "no pudimos leer el sitio desde nuestro servidor" si hay bloqueo, sin tono negativo |
| antigüedad | Wayback CDX, primera captura | "en línea desde AAAA" |
| Trustpilot | servicio `:3029` | puntaje, cantidad, últimos 12 meses, reclamado, alertas |
| Google | `findPlaceFromText` → `placeDetails` aceptado sólo si `website` coincide con el dominio | puntaje, cantidad, dirección, enlace |
| Reddit | Arctic Shift, r/uruguay y r/montevideo, 3 años, términos curados | cantidad por año y hasta 5 hilos (título, fecha, enlace). **Sin autores ni citas.** |
| catálogo propio | `equiparitems`, `chaircatalogproducts`, `phonemodels` por alias | rubros donde aparece, cuántas ofertas, enlaces a esas páginas |
| descuentos | marca de Bankos con el mismo nombre | enlace a `/descuentos-con-tarjeta-uruguay/marca/<slug>` |

**Nada de veredictos.** No hay "confiable/no confiable", ni puntaje propio, ni ranking de
confianza, ni la palabra estafa. No hay `AggregateRating` en JSON-LD (reseñas de terceros no califican
y Google lo penaliza). Cada ficha tiene "¿Sos de <tienda>? Escribinos para corregir un dato".

**Páginas.** Hub con filtros por rubro y tipo y columnas de señales (años en línea, Trustpilot,
Google, menciones), orden alfabético. Ficha: H1 "¿<Tienda> es confiable? Opiniones, reclamos y datos
verificables"; resumen de señales; identidad; reseñas; Reddit; en qué rubros la relevamos; descuentos;
"cómo comprar con menos riesgo" según el tipo (medio de pago y contracargo, factura, derecho de
arrepentimiento con su norma verificada); "si tenés un problema" hacia
`/defensa-al-consumidor-uruguay` y `/derechos-consumidor-compras-online`; FAQ con `FaqSection`.
Sitemap: sólo fichas con ≥3 señales vigentes. Las fichas de sillas y equipar enlazan al vendedor.

**Semilla:** ~90 tiendas (las 16 del retail, vendedores con más ofertas en equipar y sillas, los
dominios de los SERP del plan, y Temu, Shein, AliExpress, Amazon, Tiendamia, eBay y MercadoLibre como
plataformas). Una tienda sin dominio propio (vendedor sólo de ML) entra sólo si tiene ≥20 ofertas en
nuestros catálogos.

## 3. B — `/equipar-casa-uruguay/[categoria]`

1. **Calidad primero** (con tests que fijan cada caso encontrado): unidad de TYT y guarda §1.1;
   `NOT_A_PRODUCT` y excludes por categoría (convector/estufa en aire; mueble/soporte/"apto
   microondas" en microondas; cartucho/garrafa en anafe; linterna/arrocera en impresora; alimentos en
   cualquier categoría); variantes: aire suma **9.000 BTU** y **portátil** y lee "9000btu" sin espacio;
   lavarropas suma **semiautomático / doble cuba**; TV lee 40 y 50 pulgadas en su rango.
2. **Productos por `catalogId`** de ML primero, `marca|modelo` después; una tienda se suma a un
   producto de catálogo cuando marca y modelo normalizados coinciden. Se publica ficha por modelo
   sólo con ≥2 vendedores (queda para cuando existan; la página de categoría ya lista productos).
3. **Página por categoría**: H1 con la consulta real ("Precio de aire acondicionado en Uruguay:
   9.000, 12.000 y 18.000 BTU"); por variante, mediana nueva, rango p25–p75 y mediana usada con n;
   gráfico de mediana desde el 10/9 (la historia ya existe); productos con ofertas y enlace a la tienda
   (ficha de A cuando hay alias); por qué está en su tier; "qué mirar al comprar" escrito por
   categoría para las 12 de más demanda; en las eléctricas, costo mensual con la tarifa escalonada de
   UTE de `householdBills.ts` **sólo si** hay consumo con fuente (etiqueta de eficiencia o ficha del
   fabricante), y la mención del Plan Redondo **sólo en las categorías que UTE lista**; FAQ.
   Sitemap: categorías con banda vigente. El índice enlaza cada tarjeta a su categoría.

## 4. C — `/celulares-uruguay` y `/celulares-uruguay/[modelo]`

- `classes/phones/`: spec (títulos de celular; fuera fundas, vidrios, cargadores, repuestos, "para
  iphone", relojes y tablets), tiendas nuevas en `stores.ts` (§0.5), búsquedas de ML por familia
  vigente + categoría `MLU1055`.
- **Identidad del modelo:** marca + familia + almacenamiento (`apple-iphone-17-pro-256gb`). Sin
  almacenamiento en el título no hay modelo publicable. Condición separada: nuevo, **caja abierta**,
  reacondicionado, usado; sólo nuevo arma la banda principal. "Sólo eSIM" es un atributo visible,
  no otro modelo.
- APP DB `phonemodels` (uno por modelo, con historia diaria de mínimo y mediana) + `phonemeta`;
  pricewatch por oferta. Job `currency-phones` diario + `-hourly --fast`, en horario que no pise
  equipar ni sillas.
- **"¿Conviene traerlo de EE.UU.?"** con `resolveRegime` (courier, franquicia, IVA sobre el tope de
  EE.UU.), `resolveBaggageTax` (viajero), `courierParcelQuote`, el certificado URSEC que un celular
  sí necesita, impuesto de venta del estado elegido, y el precio de lista de EE.UU. desde una tabla
  fechada `app/utils/phoneUsPrices.ts` verificada contra apple.com / samsung.com el día que se
  escribe. Contra el mejor precio local nuevo y la cotización del día.
- Página de modelo: ofertas por tienda con fecha, historia, la calculadora, garantía (oficial vs
  importado), eSIM, FAQ. Hub: familias por marca con rango de precio.

## 5. D — `/ciberlunes-y-black-friday-uruguay`

- Job `currency-price-events` (diario; horario durante la ventana del evento) lee `pricewatchoffers`
  y escribe `priceeventsnapshots`: por oferta vista hoy con ≥21 días de historia, precio actual vs
  mínimo de los 60 días previos y precio tachado vs máximo observado. Clases: **baja real** (≤ 90 %
  del mínimo previo), **tachado por encima de todo lo registrado** (referencia > 110 % del máximo),
  **precio de siempre**.
- Página perenne ("ofertas reales de esta semana") que durante el evento se vuelve el tablero:
  fechas **verificadas en ciberlunes.uy** y Black Friday (27/11/2026), bajas reales por rubro con
  enlace, conteos agregados de tachados por encima del historial **por tienda sólo como número**, sin
  adjetivos, derechos del consumidor con su norma verificada, promos con tarjeta, cómo medimos.

## 6. E — motos y bicicletas

Se diseña con datos propios al terminar D (spec corta propia). Punto de partida: registro estilo
equipar sin tier ni canasta (`classes/rodados/`), bicicletas por tipo y rodado (montaña, urbana,
niño, eléctrica) + monopatín eléctrico, motos por cilindrada y tipo con 0 km separado de usado,
tiendas de §0.5 + ML, y fichas por modelo de moto con ≥2 ofertas.

## 7. Reglas que valen para las cinco

- Worktree propio desde `origin/main` con su `npm install`; nada de `nuxi`/dev en la raíz compartida.
- El `.env` local escribe en la Mongo de producción: ningún `sync_*` a mano sin `--dry-run`.
- Payload: `transform` en `useFetch` y medir el HTML servido antes y después.
- `definePageMeta({ validate })` para el 404 real de cada `[slug]`.
- Vuetify a mano en `app/plugins/vuetify.ts`; componentes con prefijo de ruta.
- Utils del app con nombres prefijados (namespace plano de auto-import).
- "setiembre", fechas con `dateLocale`, `ink-blue` para texto chico azul.
- Cada job nuevo en `ecosystem.config.js`, `OTHER_APPS` de `deploy-backend.sh` y la tabla de
  `AGENTS.md`; cada colección nueva del app con paridad de esquema.
- Un push por subproyecto con todo lo de `app/`, y verificación en producción antes de darlo por
  hecho.
