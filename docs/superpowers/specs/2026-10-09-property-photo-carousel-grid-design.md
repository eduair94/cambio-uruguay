# Todas las fotos: carrusel en las tarjetas y grilla en la ficha — diseño

2026-10-09. Pedido del usuario: "Intentar incluir todas las imágenes en la plataforma, no únicamente
una. Utilizar vista de tipo carrusel y en la página de vivienda mostrar en forma de grilla (o mason,
como consideres mejor)". Spec y plan aprobados por la orden permanente de auto-aprobación.

## Lo que hay hoy (medido en producción el 9/10/2026)

- **Tarjeta** de `/alquileres-uruguay`: una sola portada. Tocarla abre el visor
  (`PropertyPhotoLightbox`), que pide la galería a `/api/rentals/propiedad/<key>` porque la lista no
  la trae a propósito (`rentalPublicPropertyProjection`): esa proyección también la usan la búsqueda
  por hogar, el presupuesto, las alertas y el salario mínimo, y el catálogo de la búsqueda por hogar
  estuvo en 48,3 MB contra un tope de 64 el mismo día (#115).
- **Ficha** (`/alquileres/<key>`, `RentalsPropertyGallery`; ventas, `PropertySalesGallery`): una foto
  grande con flechas y una tira de miniaturas.
- **Fotos guardadas por aviso** (`details.images`, tope de 12 en `rentalImages`): InfoCasas y El País
  llegan al tope; alquileres.uy hasta 12; **Mercado Libre y Casasweb 0** (sólo la portada); Facebook,
  TikTok, Instagram y Reels sólo la portada. Por propiedad, `rentalPhotos` corta en 24.

## Diseño

### 1. Tarjetas: carrusel

- `components/property/PhotoCarousel.vue`, compartido. Tira horizontal con `scroll-snap`: el dedo
  desliza nativo en el teléfono; en escritorio, flechas que aparecen al pasar el mouse o con foco
  (44 px de blanco). Contador "3 / 12" sobre la foto. Tocar una foto abre el visor **en esa foto**.
- **Las primeras fotos viajan con la lista, el resto se pide cuando hace falta.** La lista agrega a
  cada tarjeta `galleryPreview` (hasta 8 URLs) y `photoCount` (las fotos distintas que tiene la
  propiedad). Se calculan en una SEGUNDA consulta por las ~24 claves de la página, después de
  paginar: la proyección compartida no cambia, así que ni la búsqueda por hogar ni el orden en
  memoria cargan un byte más. Al llegar a la última foto precargada, si hay más, se pide la galería
  completa (la misma lectura del visor, con un caché compartido por clave: tarjeta y visor no la
  piden dos veces).
- Orden de las fotos: el de `rentalPhotos`, con el aviso que coincide con el filtro primero (la
  portada de la tarjeta). El mismo orden en la tarjeta, el visor y la ficha, así que el índice que
  abre el visor es el mismo que se estaba mirando.
- Accesibilidad: región con `aria-roledescription="carrusel"`; sólo la foto visible es tabulable; las
  flechas se deshabilitan en los extremos; `prefers-reduced-motion` desplaza sin animación. Una foto
  que no carga sale de la tira.

### 2. Ficha: grilla

- `components/property/PhotoGrid.vue`, compartido por alquileres y ventas. Grilla, no masonry: las
  fotos de inmuebles son casi todas horizontales y una grilla pareja se lee en orden; la masonry por
  columnas cambia el orden de lectura (arriba-abajo por columna) y deja bordes desparejos. La primera
  foto ocupa 2×2 (es la LCP: `fetchpriority="high"`), las demás 4:3 recortadas; la foto entera está
  siempre a un toque, en el visor.
- Desde 600 px: 4 columnas; teléfono: 2 con la primera a lo ancho. Se muestran 5 (la principal y
  cuatro: dos filas parejas); si hay más, la quinta dice "+N" y un botón "Ver las N fotos" despliega
  la grilla completa en la página (y "Ver menos" la recoge). De una a cuatro fotos, cada cantidad
  tiene su composición.
- Las tarjetas de "sin foto" de El País (338×253, el mismo archivo con URLs distintas) se reconocen
  al cargar y salen de la grilla, el carrusel y el visor a la vez (`utils/photoPlaceholders.ts`).
- Cada foto es un botón que abre el visor en esa foto. El crédito queda debajo: "Fotos publicadas
  en InfoCasas · Mercado Libre", con enlace a cada aviso.

### 3. Más fotos guardadas (fase 2, PR aparte)

Tope por aviso 12 → 40 y por propiedad 24 → 60, y galería completa de Mercado Libre, Casasweb y
Facebook desde los jobs de ficha que ya leen esas páginas. Esta fase sube el tope de `rentalPhotos`
a 60 para que lo que se guarde se vea.

## Pruebas

- Unitarias (`app/tests/unit`): orden y tope de `rentalPhotos`, `rentalGalleryPreview` (vista previa
  y conteo), la mezcla del servidor (sólo avisos públicos, sin URLs inválidas), y que la proyección
  compartida no incluye `details.images`.
- Verificación visual en dev con el proxy a producción (ver memoria `playwright-sandbox-sin-url`),
  que además simula los campos nuevos de la lista: 320/390/1440 px, claro/oscuro, teclado.

## Plan

1. `rentalPhotos` (orden con el aviso coincidente primero, tope 60) + `rentalGalleryPreview` + tests.
2. Servidor: `attachRentalGalleryPreviews` en `/api/rentals` (segunda consulta) + tests.
3. Caché compartido de galerías (`usePropertyGalleries`) y `startIndex` en el visor de propiedades.
4. `PropertyPhotoCarousel` y su uso en las tarjetas de alquileres.
5. `PropertyPhotoGrid` y su uso en las fichas de alquiler y de venta.
6. i18n (es/en/pt), lint, tests, verificación visual, PR, deploy, medición en producción.
