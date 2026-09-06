# Buscador de viviendas en venta

Página independiente `/venta-viviendas-uruguay`, con fichas en `/venta-viviendas-uruguay/<fuente>-<id>`. Extiende la experiencia de alquileres a compra: lista y mapa, filtros persistentes en móvil, favoritos locales y comparación de anuncios. La navegación, el buscador del sitio y los directorios de alquileres y oportunidades enlazan la nueva página.

## Qué representa un resultado

Un resultado es **un anuncio de venta de una fuente**, no una vivienda única certificada. Dos anuncios parecidos conservan su propia ficha; precio, fotos, texto o barrio compartidos no prueban que sean la misma unidad. No se reutilizan los grupos ni las direcciones de alquileres para crear fichas de venta.

Se muestran el precio pedido y la moneda original. Los gastos comunes son mensuales y aparecen aparte; no se suman al precio de adquisición. Un gasto desconocido no equivale a cero. El precio por metro cuadrado identifica la superficie utilizada, porque terreno, superficie construida y superficie total no son intercambiables.

Proyectos, inmuebles ocupados, reformas y gastos adicionales requieren etiquetas basadas en el aviso. Una fecha de última lectura demuestra que vimos la publicación; no certifica que siga disponible. No se publican teléfonos, correos ni coordenadas que el origen oculta.

## Datos y actualizaciones

El trabajo de oportunidades ya posee entradas de venta en APP DB; la nueva colección pública `propertysalecatalog` se construye con una proyección explícita. La colección privada `propertysalelistings` no se expone desde ninguna API. La metadata pública vive en `propertysalecatalogmetas` con clave `uy-sales`.

La publicación conserva la fecha propia de cada anuncio y elimina de la vista pública las lecturas vencidas. Las capturas parciales no permiten inferir que un anuncio desapareció. La cobertura cuenta identificadores de anuncios visibles por fuente, no el tamaño de la última tanda ni viviendas únicas. La aplicación no declara cobertura exhaustiva del mercado.

Fuentes iniciales: InfoCasas y Casasweb. Sus identificadores se guardan en espacios separados y las lecturas tienen presupuestos y controles propios. El permiso documentado de El País para alquileres no se extiende a ventas. Los anuncios cuyo origen declara expresamente que se retiraron se apartan por su identificador; una omisión en una página parcial no produce ese efecto.

En Casasweb una tarjeta sólo sirve para descubrir el anuncio. La publicación exige también haber leído su ficha propia completa y comprobar el precio, porque la tarjeta puede omitir cuotas, saldos hipotecarios o derechos parciales. La ampliación diaria prioriza fichas que todavía no tienen esa evidencia. Un texto anterior no se reutiliza para justificar un precio distinto ni recibe una fecha nueva sin volver a leerse.

Las fotografías y características provienen del mismo anuncio que el precio. Una ubicación aproximada conserva esa condición en el mapa; los datos de ubicación ocultos por el portal no se convierten en coordenadas públicas.

Los grupos de anuncios sin coordenada pueden abrir la búsqueda de un barrio de Montevideo. Sus centros proceden de los polígonos públicos de [CAT_Barrios_Mvd del MVOT](https://sit.mvot.gub.uy/arcgis/rest/services/03_CBASE/MAPA_BASE_VECTORIAL/MapServer/56), leídos el 2026-09-06, y son puntos de navegación de zona, nunca ubicaciones de viviendas. Sólo coinciden nombres completos normalizados: no se convierte Pocitos Nuevo en Pocitos ni una localidad de otro departamento en Centro de Montevideo.

La actualización usa el trabajo existente `currency-property-opportunities`; no agrega tareas al proceso API en clúster. Consultar `PROPERTY_OPPORTUNITIES.md` para horarios y bloqueo compartido. Se conserva el catálogo anterior ante una caída sustancial de las entradas.

## API y búsqueda

- `GET /api/property-sales`: lista paginada, filtros, facetas y cobertura.
- `GET /api/property-sales/mapa`: puntos acotados, total de coincidencias y cantidad con ubicación.
- `GET /api/property-sales/ficha/<key>`: datos propios completos, calidad de la página y enlaces a otros anuncios de la zona.

Filtros: texto, departamento, localidad, barrio, tipo, dormitorios, baños, rango de precio y moneda, superficie y clase de superficie, garaje, muebles, servicios, anunciante, fotografías y antigüedad de lectura. Los favoritos guardan identificadores; sus precios se vuelven a consultar. Los enlaces compartidos preservan los filtros.

El catálogo de ventas y el motor de oportunidades tienen criterios distintos. Una vivienda puede ser útil en el directorio y no tener evidencia suficiente para una comparación de precio. Las oportunidades continúan calculándose a partir de cohortes previamente fijadas, con su nivel de evidencia y sus comparables visibles.

## Fichas y buscadores

Cada anuncio visible tiene una URL estable. La ficha presenta datos particulares y enlaces de exploración, no prosa inventada. Las variantes de búsqueda con filtros son `noindex,follow`. La publicación inicial en el sitemap limita las fichas a un conjunto revisado y exige también datos suficientes y lectura vigente; el resto sigue disponible para quien busca dentro del catálogo.

La misma función decide la indexabilidad de una ficha y su presencia en el sitemap. No se convierte la última lectura en `lastmod`, porque volver a encontrar un anuncio no prueba que su contenido haya cambiado. Las fichas en otros idiomas mantienen el tratamiento de la descripción original; no se inventan traducciones de los datos del vendedor ni se promete que Google indexe una página.

## Referencias revisadas

- [Apartamentos en venta de InfoCasas](https://www.infocasas.com.uy/venta/apartamentos) y [casas](https://www.infocasas.com.uy/venta/casas): precio, gastos, fotos y condiciones de compra publicados por cada anunciante.
- [Buscador público de venta de Casasweb](https://casasweb.com/resultados.aspx?m=0&n=V&t=a&x=1&z=0): operación explícita de venta, tipo y departamento.
- [Robots meta de Google](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag): controla indexación de variantes e incompletas.
- [Sitemaps de Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): URLs canónicas y fechas de modificación reales.
- [RealEstateListing de Schema.org](https://schema.org/RealEstateListing): descripción semántica de la ficha, sin prometer un resultado enriquecido en Google.

La revisión de datos y de la experiencia móvil forma parte de cada ampliación del catálogo. Los resultados de pruebas y la muestra de fichas de este despliegue se documentan al concluir la validación.

## Revisión inicial, 2026-09-06

Se revisaron las descripciones completas de 50 candidatas para buscadores contra sus propios precios, dormitorios, baños, superficies y zonas. El piloto resultante contiene 18 fichas, enumeradas en `app/utils/propertySalesSeo.ts`; todas sus portadas respondieron con una imagen válida. La revisión no certifica el estado físico de una propiedad ni su disponibilidad. Se descartaron del piloto folletos genéricos de proyectos, zonas contradictorias y gastos sin respaldo claro.

La revisión descubrió casos que también debían salir de la búsqueda y de las comparaciones: anticipos más cuotas, precios por hectárea, terrenos publicados como casas, derechos parciales, paquetes de varias viviendas y descripciones con más baños en suite que el total declarado. No se resolvieron suponiendo un importe o una identidad. Los gastos comunes iguales a cero necesitan evidencia explícita del anuncio.

La interfaz se probó a 320, 390 y 1440 píxeles: sin desborde horizontal, filtros accesibles después de desplazarse, botones táctiles de al menos 44 píxeles, cancelación que recupera foco y posición, detalles del mapa visibles y fichas individuales que no montan otro catálogo detrás. Los recorridos de comparación, fotos, favoritos vacíos, almacenamiento bloqueado y datos estructurados tienen pruebas de navegador. La suite completa de la aplicación aprobó 5.432 pruebas al concluir la integración inicial.

La revisión previa a la publicación de las 09:33 UTC produjo 8.533 anuncios públicos: 8.382 de InfoCasas y 151 de Casasweb, desde 21.543 identificadores privados. De Casasweb se pudieron leer 237 fichas completas; 151 superaron los controles y 3.700 tarjetas permanecieron privadas hasta contar con esa lectura. El mismo cálculo produjo 13 oportunidades de compra y 40 de alquiler. Estas cifras describen esa captura, no una cobertura fija o exhaustiva del mercado.
