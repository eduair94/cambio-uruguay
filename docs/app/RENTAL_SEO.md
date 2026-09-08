# SEO del directorio y las fichas de alquiler

## Cambio del 8 de septiembre de 2026

La solicitud del usuario amplía el lanzamiento indexable más allá del piloto histórico de 93
keys. La lista de `rentalSeoPilot.ts` permanece como evidencia de aquella revisión, pero ya no
controla la indexación. No se crean páginas de barrios con texto repetido ni se inventan datos
para completar fichas.

Cada ficha española vigente puede indexarse si supera la misma evaluación en la API y el
sitemap: vivienda residencial con barrio/departamento y dormitorios, tres atributos concretos,
foto atribuida, enlace original, título suficiente, dirección publicada o descripción propia,
costo mensual conocido y ausencia de contradicciones detectadas o anuncios compartidos entre
keys. No se publica una dirección oculta. Las fichas incompletas conservan `noindex, follow`;
las ausentes responden 404 y los fallos de datos responden 503. Las traducciones de fichas
siguen fuera del sitemap y con noindex mientras el contenido propio del anuncio esté en español.

## Marcado y fotografías

El catálogo muestra `CollectionPage`, su lista de resultados visible y migas de navegación en
el HTML inicial. La paginación sin filtros tiene enlaces reales y canonical propia; las
combinaciones de filtros, mapa y orden mantienen noindex para limitar el espacio de rastreo.

Las fichas enlazan `RealEstateListing`, `Apartment`/`House`, ofertas mensuales y `ImageObject`.
La primera foto atribuida de la galería también es la imagen Open Graph/Twitter. Sin fotos se
conserva la tarjeta de Cambio Uruguay. No se inventan dimensiones, disponibilidad, licencia,
tasación, reseñas ni fecha de modificación. Un grupo con datos contradictorios no establece
una vivienda consolidada en el marcado. Los textos alternativos identifican inmueble y foto;
las imágenes están disponibles mediante elementos IMG con src en SSR.

## Sitemap

`/sitemap_index.xml`, anunciado por robots.txt, conserva los tres sitemaps por idioma y añade
la familia `rentals`, dividida en archivos de 1.000 URLs. Sus entradas contienen las URLs
canónicas españolas y las imágenes originales de la misma galería visible. No hay `lastmod`:
volver a leer un aviso no demuestra un cambio significativo.

Robots permite los archivos públicos CSS/JavaScript de `/_nuxt/`, necesarios para renderizar
la página como la ve el usuario. Se conserva el bloqueo de las rutas administrativas.

La fuente independiente `/api/__sitemap__/rentals` se actualiza con caché de una hora. Lee
dossiers con un cursor de 64 documentos para no cargar el catálogo completo de propiedades
en memoria; conserva sólo URLs/fotos. Verifica identidades compartidas y deduplica las URLs.
Un error cierra el cursor y rechaza el resultado parcial; no sustituye la caché válida por un
catálogo vacío. Los sitemaps de navegación no dependen de esta lectura.

Las imágenes pertenecen a los portales/anunciantes y siguen en sus dominios originales. Su
rastreo también depende del acceso que permita cada origen; no se copian ni se declaran
derechos sobre ellas. La presencia de una URL o imagen en el sitemap facilita su descubrimiento,
pero no acredita indexación ni garantiza posiciones o un resultado enriquecido.

## Referencias y comprobaciones

- [Google: imágenes y textos alternativos](https://developers.google.com/search/docs/appearance/google-images).
- [Google: sitemap de imágenes](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps).
- [Google: URLs canónicas y fechas del sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- [Google: paginación rastreable](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading).
- [Google: reglas de datos estructurados](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).
- [Schema.org: RealEstateListing](https://schema.org/RealEstateListing).

Las pruebas unitarias cubren coherencia entre ficha y sitemap, imágenes deduplicadas/seguras,
descarte por identidad dudosa o datos faltantes, cierre del cursor y rechazo de lecturas
incompletas, además de marcado y metadatos. La comprobación pública debe contrastar el HTML
SSR, las fotos, canonical/robots y las URLs efectivamente publicadas por el índice XML.

El módulo sitemap 7.4 puede convertir una fuente fallida en un arreglo vacío. El plugin
`rental-sitemap-status.ts` rechaza ese catálogo vacío con 503 antes de generar o guardar XML,
tanto al formar el índice como cada fragmento. También prefiere 503 si ninguna vivienda
califica: no anuncia una retirada completa del catálogo sin una revisión operativa. La clave
de caché de la fuente es constante, independientemente de parámetros enviados por visitantes.
