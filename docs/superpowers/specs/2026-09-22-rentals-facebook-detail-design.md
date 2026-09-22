# La ficha de Facebook Marketplace en /alquileres-uruguay — diseño

2026-09-22. Aprobado por el usuario ("Implementar propuesta") sobre la revisión medida ese día.

## Problema

El puente `:9657` entrega tarjetas: título, precio, ciudad, foto. Sin barrio, sin coordenada, sin
descripción. Con el barrio leído del título (`classes/rentals/neighborhoods.ts`) quedaron 1.823 de
3.032 ofertas de Facebook sin barrio (544 son avisos legacy sin identidad, todos viejos).

Medido sobre 100 fichas de esos avisos: 89 traen descripción; nombra un barrio en 31, trae una
esquina o dirección en 17; con esquina geocodificada y validada se ubican 36 (Montevideo 30 de
63). Ningún otro campo del nodo aporta: `walk_score`/`transit_score` nulos, `nearby_*` vacíos,
`home_address` una vez y dice "Canelones", `external_url` y `real_estate_multi_listing` cero, el
pin es una grilla de ~1 km y `is_map_eligible` es falso.

## Diseño

**`currency-rentals-detail`** (`sync_rentals_detail.ts`, `15 * * * *`, flock propio): lee la ficha
de los avisos de Facebook guardados, con presupuesto y por orden de utilidad. Calcado de
`currency-autos-detail`. No publica nada por sí mismo: escribe la colección privada
`rentalfacebookdetails` y aplica a `rentallistings` sólo los campos vacíos de propiedades de un
único aviso de Facebook.

- **Lectura**: puppeteer atado al Chrome de `facebook_profile_browser` (CDP `:9224`), el mismo
  contrato que autos. Sesión inválida → salir en 0 sin leer. Redirección a login → cortar la
  corrida. `RENTALS_FB_DETAIL_MAX` fichas por corrida (60), 6 s entre fichas, tope de reloj
  `RENTALS_FB_DETAIL_MINUTES` (12). Lo compartido con autos se extrae a `classes/facebook/`
  (`graphql.ts`: blobs/walk; `browser.ts`: conectar, leer una ficha, sesión). Autos sigue con su
  copia hasta que alguien lo migre; no se toca en este cambio.
- **Cola**: ofertas de Facebook vistas en los últimos 10 días sin fila en `rentalfacebookdetails`.
  Prioridad: Montevideo, sin barrio, sin coordenada, más reciente. Una ficha se lee UNA vez; si no
  se encontró el nodo se guarda igual (`found: false`) para no reintentar cada hora.
- **Qué se saca de la ficha** (`classes/rentals/facebookDetail.ts`, puro):
  `redacted_description` saneada con `rentalDescription` (sin teléfonos, correos ni enlaces),
  ciudad y código postal del pin (sólo para llenar el DEPARTAMENTO cuando la tarjeta no lo trajo;
  el pin nunca se publica como coordenada), `is_live`.
- **Barrio**: `neighborhoodFromText` sobre el título y, si no, sobre la descripción, con el
  departamento de la tarjeta.
- **Coordenada**: candidatos de dirección del texto (esquina "X y Z"/"esq."/"entre", o calle con
  número), sólo en segmentos con un ancla locativa ("calle", "esquina", "sobre", "ubicado en",
  "📍") y sin palabras de la vivienda ("dormitorios", "patio", "garantía"). Se geocodifican hasta
  dos por aviso contra el proxy de Google del sitio (`RENTALS_GEOCODER_URL`, el mismo que usa
  `/api/rentals/geocode`), con presupuesto `RENTALS_FB_GEOCODE_MAX` (40) por corrida. **Regla de
  aceptación**: la dirección devuelta trae "&" (intersección real) y comparte una palabra con el
  texto, o es ROOFTOP/RANGE_INTERPOLATED con un número que estaba en el texto. Medido: sin la
  regla Google devuelve el centroide de UNA calle, hasta 10 km del inmueble. **Contradicción**:
  si el texto nombra un barrio INE y el punto cae en otro barrio INE, se conserva el nombre y se
  descarta el punto.
- **Aplicar a `rentallistings`**: sólo propiedades con UN aviso, de Facebook, con `identity`
  (version 1). Se llenan únicamente los campos VACÍOS: `identity.description`,
  `details.description`, barrio (identidad + propiedad), departamento, latitud/longitud. Nunca
  se renueva `lastSeen`/`firstSeen` ni se pisa un valor existente. Compare-and-set sobre el
  `listingId` y el tamaño de `offers`.
- **La cosecha conserva el enriquecimiento**: `harvestFacebookMarketplace` carga las fichas ya
  leídas de los avisos que vuelve a ver y `toRawRental` las mezcla (descripción, barrio,
  coordenada, garantías por texto, dormitorios/baños/m² por texto). Sin esto, una re-cosecha
  reconstruiría la identidad desde la tarjeta pelada y borraría lo aprendido.
- **Lo que NO se toma**: nombre del vendedor, contactos, `petsAllowed` (política: sólo dato
  estructurado), el pin como ubicación, `home_address`.

## Verificación

Tests puros: parser de la ficha con fixture (nunca copia el nombre del vendedor), candidatos de
dirección, regla de aceptación, prioridad de la cola, plan de aplicación, mezcla en `toRawRental`.
En producción: correr una vez, contar filas de `rentalfacebookdetails` y ofertas de Facebook con
barrio/coordenada antes y después, y ver una ficha con descripción y pin en el mapa.
