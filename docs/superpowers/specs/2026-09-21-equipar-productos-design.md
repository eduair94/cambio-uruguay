# Equipar: hub de avisos por categoría + lista para equipar (diseño, 2026-09-21)

## Qué se pide

Un hub de productos para cada ítem de la casa, con filtros al estilo Mercado Libre, que reúna los
avisos de Facebook Marketplace, Mercado Libre y las tiendas uruguayas que ya cosecha
`currency-equipar`; enlazado desde `/equipar-casa-uruguay`; y que con esa información el lector
pueda armarse **su** lista de productos para amueblar la casa.

## Lo que falta hoy

`equiparitems` guarda por variante sólo las 8 ofertas nuevas y 6 usadas más baratas, y hasta 12
productos con 6 ofertas cada uno. Los avisos crudos (varios miles por corrida) no quedan en ninguna
colección consultable: `equiparstoresnapshots` es un blob de tiendas para la corrida horaria y
`pricewatchoffers` no guarda Marketplace ni usados, ni foto, ni marca, ni condición. Un directorio
con filtros por marca, condición, fuente y precio necesita **una fila por aviso**.

## Diseño

### 1. Backend: `equiparlistings` (APP DB)

`classes/equipar/listings.ts` — función pura `buildEquiparListings({ listings, usdUyu, registry? })`
que devuelve una fila por aviso aceptado por la banda:

| campo | de dónde |
|---|---|
| `listingId` | `RetailListing.listingId` (único) |
| `category`, `categoryLabel`, `variant`, `variantLabel`, `tier`, `room`, `rank`, `variantRank`, `regime` | `attributes.CATEGORY_SPEC` + `variantFor`, como `buildEquiparCatalog` |
| `condition` | `conditionOf` (misma regla: Marketplace es usado salvo que diga nuevo) |
| `source`, `sellerKey`, `sellerName`, `channel`, `officialStore` | tal cual |
| `brand`, `brandKey` | `listing.brand` si no es placeholder (`NOT_A_BRAND`); `brandKey = norm(brand)` |
| `title`, `url`, `image`, `price`, `currency`, `priceUyu`, `listPrice`, `location`, `freeShipping` | tal cual; `priceUyu` convertido con `usdUyu` |
| `suspect` | `true` si el cribado por item+condición lo marcó `suspect` |
| `observedAt`, `firstSeen`, `lastSeen` | `lastSeen` = fecha de `observedAt` (una fila de la foto de tiendas conserva la suya) |

Reglas:
- **Lo que la banda rechaza no se guarda.** El cribado corre igual que en `catalog.ts`: por
  `category:variant` y por condición (`screen()` de `bands.ts`). Se exportan `conditionOf`,
  `toOffer` y `NOT_A_BRAND` de `catalog.ts` para no duplicarlos.
- **Lo sospechoso se guarda con `suspect: true` y la API nunca lo sirve** en el directorio: un
  directorio ordenado por "menor precio" lo pondría en el titular, que es exactamente lo que la
  guarda evita. Se cuenta en la meta (`suspect`), para que la página pueda decirlo.
- **Un aviso repetido (mismo `listingId` dos veces en la corrida) se queda una vez**, la última.

`classes/models/EquiparListing.ts` + `app/server/models/EquiparListing.ts` (paridad en
`tests/appdb/schema_parity.test.ts`). Índices: `listingId` único; `{category, lastSeen}`;
`{lastSeen, priceUyu}`; `{brandKey}`; `{sellerKey}`.

`saveEquiparListings(rows)` en `classes/equipar/store.ts`: `bulkWrite` de upserts (`$set` de todo
menos `firstSeen`, `$setOnInsert: { firstSeen }`) en tandas de 500, más `deleteMany({ lastSeen < hoy − 30 días })`.
Se llama desde `sync_equipar.ts` **después** de `saveEquiparCatalog`, en su propio `try/catch` (como
pricewatch): un fallo acá nunca cuesta el catálogo ya publicado. Corre en la diaria y en la horaria
sobre `listings` (las mezcladas con la foto de tiendas): una fila de la foto conserva la fecha en que
se vio de verdad, así que no inventa una observación de hoy.

### 2. API: `GET /api/equipar/productos`

Patrón de `/api/cars`: paginado en servidor (24 por página), facetas por agregación de Mongo con
`maxTimeMS`, ventana de frescura de 4 días por `lastSeen` (la misma que `/api/equipar`).

Query (`app/utils/equiparProductos.ts::equiparProductosNormalize`):

| param | valores |
|---|---|
| `categoria` | slug del registro (`isEquiparCategorySlug`) |
| `variante` | key de variante (sólo con `categoria`) |
| `condicion` | `nuevo` \| `usado` |
| `fuente` | `mercadolibre` \| `facebook` \| `tienda` |
| `vendedor` | `sellerKey` |
| `marca` | `brandKey` |
| `precioMin`, `precioMax` | UYU enteros |
| `q` | texto (regex escapado, case-insensitive sobre `title`) |
| `orden` | `precio_asc` (default) \| `precio_desc` \| `reciente` |
| `page` | ≥ 1 |
| `ids` | hasta 60 `listingId` separados por coma: devuelve esas filas sin ventana ni filtros (para refrescar la lista) |

Respuesta: `{ generatedAt, usdUyu, total, page, perPage, items, facets: { categorias, variantes, marcas, vendedores, fuentes, condiciones }, suspect }`.
Cada faceta se calcula con la consulta **sin** ese filtro (como autos), para que la lista muestre
cuántos habría con cada opción. `variantes` sólo cuando hay `categoria`. Filas públicas
(`equiparProductoPublic`): sin `_id`, sin `brandKey` interno duplicado innecesario, con `url` tal cual
(los avisos ya se enlazan hoy con `rel="nofollow noopener"`).

Error de base → 503 `no-store` (patrón cars), y la página muestra el aviso de "se está actualizando".

### 3. Páginas

Todas **sólo en español**, canonical sin prefijo de idioma, como las páginas por categoría.

**`/equipar-casa-uruguay/productos`** (`app/pages/equipar-casa-uruguay/productos/index.vue`) — el
hub de todos los avisos de las 38 categorías. H1 "Productos para equipar la casa en Uruguay".
Layout de autos: `CarsSidebarLayout` + `CarsFilterPanel` (a través de un `EquiparProductosFilters`
propio) + `CarsToolbar` en mobile + chips de filtros activos + grilla de tarjetas + `VPagination`.
`robots: noindex, follow` cuando hay algún filtro puesto (cada combinación es una copia fina). Debajo
de la grilla, los enlaces a las 38 páginas por categoría (`/equipar-casa-uruguay/productos/<slug>`)
con su conteo, y "Cómo leer estos datos".

**`/equipar-casa-uruguay/productos/[categoria]`** — el mismo directorio con `categoria` fijada por la
ruta (no por query): H1 "Heladeras en venta en Uruguay: nuevas y usadas", con el conteo del día por
fuente, la variante como primer filtro, y enlaces a `/equipar-casa-uruguay/<categoria>` (la
comparativa de precios) y al hub. `definePageMeta({ validate: isEquiparCategorySlug })` → 404 real.
Indexable sin filtros; JSON-LD `CollectionPage` + `BreadcrumbList` + `ItemList` de hasta 10
`Product`/`Offer` (sin `AggregateRating`). Es la superficie que **puede** rankear por "heladera
usada uruguay" / "marca + modelo" — el hub existe para enlazar.

**Tarjeta** (`app/components/equipar/ListingCard.vue`): foto (con `@error` a ícono por ambiente,
`referrerpolicy="no-referrer"` — Marketplace expira sus URLs), título, precio en su moneda con "≈ $"
si es USD, condición, variante, vendedor · fuente, "visto el d/m", botón **Agregar a mi lista** /
**Quitar**, y el enlace al aviso (`target=_blank rel="nofollow noopener"`).

**`/equipar-casa-uruguay/mi-lista`** (`app/pages/equipar-casa-uruguay/mi-lista.vue`) — `noindex`,
en `EXCLUDED_ROUTES`. Lee la lista guardada en el navegador y la muestra en **orden de necesidad**
(tier → rank del registro), agrupada por categoría, con total en pesos y en dólares (cotización del
payload), qué categorías **tier S** faltan (con enlace a su hub filtrado), y "Actualizar precios",
que pide `?ids=` y marca cada línea como vigente (precio de hoy), cambió de precio, o "ya no está
publicado". Botón "Copiar como texto" (categoría — título — precio — enlace) y "Vaciar".

Barra fija en las páginas del directorio (`app/components/equipar/ListaBar.vue`): "N ítems · $ total
· Ver mi lista", sólo cuando la lista tiene algo.

### 4. La lista en el navegador

`app/composables/useEquiparLista.ts`: `useState` + `localStorage` (`cu_equipar_lista`), hasta 60
líneas, cada una con **la foto del aviso al momento de agregarlo** (`listingId`, `category`,
`categoryLabel`, `variantLabel`, `tier`, `rank`, `title`, `priceUyu`, `price`, `currency`,
`condition`, `sellerName`, `source`, `url`, `image`, `addedAt`). Guardar el snapshot y no sólo el id
es lo que hace que la lista siga leyéndose si el aviso desaparece. `try/catch` alrededor de todo
acceso al storage (navegación privada). Helpers puros en `app/utils/equiparProductos.ts`:
`equiparListaTotal`, `equiparListaOrdenar`, `equiparListaFaltantes(tier S)`, `equiparListaTexto`.

### 5. Enlaces de entrada

- `equipar-casa-uruguay/index.vue`: botón en el encabezado ("Ver todos los avisos") y, en cada
  tarjeta de categoría, "avisos" al hub de esa categoría.
- `equipar-casa-uruguay/[categoria].vue`: botón "Ver los N avisos de <categoría>" sobre la sección de
  modelos.
- `app/utils/directorios.ts`: `tambien` del directorio `equipar` con el hub.
- `siteNav.ts`: entrada `/equipar-casa-uruguay/productos` (`nav.equiparProductos`, es/en/pt) en la
  misma sección que el hub; `DYNAMIC_ROUTE_KEYS` con `equipar-casa-uruguay/productos/[categoria]`;
  `/equipar-casa-uruguay/mi-lista` en `EXCLUDED_ROUTES`.
- Sitemap: junto a cada `/equipar-casa-uruguay/<slug>` que ya entra, `/equipar-casa-uruguay/productos/<slug>`.
- `docs/seo/experiments.json`: fila `equipar-productos-hub` con rutas `/equipar-casa-uruguay/productos/`.

### 6. Tests

Backend (`tests/equipar/listings.test.ts`): una fila por aviso aceptado; rechazado no se guarda;
sospechoso lleva `suspect: true`; condición de Marketplace; marca placeholder queda vacía; `lastSeen`
= fecha de `observedAt`; duplicado se queda una vez. Paridad de esquema.

App: `equiparProductos.test.ts` (normalizar/params/chips/`without`, totales y faltantes de la lista,
texto), `equiparProductosApi.test.ts` (match y proyección con el modelo mockeado, `ids` sin ventana,
sospechosos fuera), `equiparProductosPage.test.ts` (contrato de las tres páginas: un H1, canonical,
`validate`, noindex con filtros / siempre en mi-lista, JSON-LD sin `AggregateRating`), y la
cobertura de siteNav.

### 7. Fuera de alcance (a propósito)

- Ficha por producto (`/productos/<marca-modelo>`): los avisos enlazan al vendedor, como hoy.
- Agregar automáticamente "lo más barato" a la lista: la lista es del lector; los faltantes enlazan
  al hub filtrado y él elige.
- Facebook fuera de Montevideo (sigue como en EQUIPAR.md).
