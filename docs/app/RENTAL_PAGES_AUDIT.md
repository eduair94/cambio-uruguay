# Auditoría del piloto de fichas de alquiler

Revisión de metadatos públicos el 2026-09-05T05:36:36.364Z. No se copiaron descripciones de portales ni se escribieron datos en Mongo.

## Alcance y decisión

16.590 propiedades visibles bajo la ventana de 10 días. El umbral inicial amplio habría habilitado 8.559 páginas, con 2.840 títulos repetidos: no justifica publicarlas automáticamente. La revisión conservadora encontró 1.104 candidatas con dos portales y algún costo mensual conocido, libres de contradicciones explícitas y sin ofertas asignadas a varias propiedades; 253 también tenían antigüedad observada, dirección, tres atributos y barrio respaldado en títulos. Se examinaron individualmente 100 registros y todos los títulos de sus ofertas; se descartaron siete casos dudosos.

El piloto fijo contiene **93 apartamentos de Montevideo**. No representa todas las localidades ni tipos de Uruguay. Todas las otras fichas vigentes están disponibles para usuarios con noindex. No se rellena el cupo ni se rota automáticamente el catálogo cuando una propiedad vence.

La elegibilidad se vuelve a comprobar al servir ficha y sitemap: oferta vigente, foto y enlace originales, barrio/departamento/tipo residencial/dormitorios, al menos dos atributos, dos portales, costo mensual publicado y ausencia de contradicciones detectables. Si un aviso vigente pertenece a dos propiedades, ambas quedan fuera del índice. La auditoría encontró 452 propiedades con esa ambigüedad; no se borraron ni se certificó que sus merges fueran correctos.

## Identidad y límites del dato

Las keys se heredan por identidad de avisos. El backend reserva las keys previas antes de asignar unidades nuevas y selecciona de forma determinista el dueño de avisos históricos ambiguos. Una fusión puede retirar una key; no hay alias histórico certificado, por lo que se devuelve 404 en vez de redirigir hacia un inmueble aproximado. Las URLs no cambian por moneda, orden, filtros o título de presentación.

Los títulos pueden contradecir atributos canónicos y las ofertas aún no conservan dormitorios/baños/superficie separados por portal. El detector marca evidencia incierta; no inventa una corrección. La muestra automatizada inicial detectó 479 conflictos de dormitorios, 142 de baños, 160 de tipo y 92 señales de alquiler temporal/invernal; las categorías se solapan y no son un conteo de propiedades únicas. Los siete descartes de la revisión individual fueron:

- `montevideo-ciudad-vieja-25-de-mayo-1qh8btn`: Título de local, tipo estructurado apartamento.
- `montevideo-centro-ciudadela-1r6nu6k`: Ofertas distinguen unidades 601 y 801.
- `montevideo-cordon-4osl8h`: Unidad 1303 y patio de uso exclusivo: identidad no suficientemente clara.
- `montevideo-centro-hector-gutierrez-ruiz-prox-a-18-de-julio-1em2icl-1j9ye5h`: Monoambiente frente a oferta que declara un dormitorio.
- `montevideo-cordon-eduardo-acevedo-z5n0uy`: Eduardo Acevedo frente a Acevedo Díaz.
- `montevideo-cordon-eduardo-acevedo-1i7jmi2`: Dirección anuncia planta baja con patio; otra oferta anuncia balcón al frente.
- `montevideo-pocitos-nuevo-26-de-marzo-d5mcsd`: Cruces publicados diferentes: Julio César frente a Manuel Pagola.

## Comparación y moneda

El benchmark compara alquileres anunciados, sin gastos comunes: mismo departamento, barrio, tipo y dormitorios, una propiedad ajena por observación. Excluye la ficha propia, identidades repetidas y contradicciones explícitas. Con menos de diez observaciones no publica mediana ni cuartiles. Usa interpolación lineal de cuantiles. No es tasación, precio de cierre ni muestra representativa del mercado completo.

Todas las rentas USD de la ficha y sus comparables se convierten con la misma cotización del fetch; UYU conserva su precio publicado. Si la cotización falta, el total convertido queda desconocido. Los gastos sólo se suman desde la misma oferta y con su moneda publicada. Los comparables usan una proyección mínima; se cargan registros completos sólo para la propiedad solicitada y hasta seis similares.

## Rastreo y fechas

Sólo las 93 keys revisadas que sigan calificando se incluyen en el sitemap español. EN/PT tienen noindex y no se multiplican en el sitemap. Se omite lastmod: updatedAt y lastSeen reflejan escrituras/lecturas, no cambios de contenido. La fecha de observación del anuncio puede mostrarse con ese significado. Canonical propia estable en /alquileres/[key], sin parámetros. Ausencia/caducidad da 404; fallo temporal de datos, 503.

La decisión sigue las recomendaciones oficiales: [contenido escalado sin valor añadido](https://developers.google.com/search/docs/essentials/spam-policies#scaled-content), [sitemap con URLs canónicas y lastmod de cambios significativos](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), y [consolidación de duplicados](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls). El valor añadido del piloto es la comparación entre portales, costos transparentes, benchmark acotado y navegación hacia alternativas reales. No se añade prosa genérica para alcanzar un número de palabras.

## Registros revisados aprobados

| Key | Barrio | Dorm. | Baños | m² publicados | Portales |
|---|---|---:|---:|---:|---|
| montevideo-pocitos-26-de-marzo-twecvp | Pocitos | 0 | 1 | 35 | mercadolibre, infocasas |
| montevideo-cordon-arenal-grande-1o9en65 | Cordón | 0 | 1 | 28 | infocasas, mercadolibre |
| montevideo-punta-carretas-21-de-septiembre-99v1ms | Punta Carretas | 1 | 1 | 36 | infocasas, casasweb |
| montevideo-pocitos-juan-benito-blanco-1hu46eq | Pocitos | 2 | 2 | 60 | infocasas, mercadolibre |
| montevideo-cordon-mercedes-al-9y238m-6a2am5 | Cordón | 1 | 1 | 41 | infocasas, mercadolibre |
| montevideo-tres-cruces-acevedo-diaz-rovd6z | Tres Cruces | 1 | 1 | 57 | mercadolibre, infocasas |
| montevideo-la-blanqueada-avenida-luis-alberto-de-herrera-15n9xkj-v6cw4i | La Blanqueada | 1 | 1 | 55 | casasweb, infocasas |
| montevideo-pocitos-gabriel-pereira-3285-1w953ou | Pocitos | 0 | 1 | 28 | infocasas, mercadolibre |
| montevideo-cordon-lorenzo-carnelli-daydg4 | Cordón | 1 | 1 | 36 | mercadolibre, infocasas |
| montevideo-centro-la-paz-1hvtom5 | Centro | 2 | 1 | 64 | infocasas, mercadolibre |
| montevideo-pocitos-luis-b-cavia-dklttb | Pocitos | 1 | 1 | 40 | infocasas, mercadolibre |
| montevideo-pocitos-avenida-brasil-5gwfw9 | Pocitos | 1 | 2 | 42 | mercadolibre, infocasas |
| montevideo-pocitos-chucarro-10p2pol | Pocitos | 0 | 1 | 40 | mercadolibre, infocasas |
| montevideo-cordon-avenida-de-julio-4jwooi | Cordón | 0 | 1 | 40 | infocasas, mercadolibre |
| montevideo-cordon-pablo-de-maria-69qegc | Cordón | 3 | 2 | 65 | mercadolibre, infocasas |
| montevideo-pocitos-joaquin-munoz-al-5shfdh | Pocitos | 2 | 1 | 66 | mercadolibre, infocasas |
| montevideo-tres-cruces-cufre-p144ko | Tres Cruces | 2 | 1 | 50 | infocasas, mercadolibre |
| montevideo-pocitos-pedro-fco-berro-1jeri6u | Pocitos | 1 | 1 | 49 | infocasas, mercadolibre |
| montevideo-pocitos-avenida-brasil-ant6j1 | Pocitos | 0 | 1 | 26 | mercadolibre, infocasas |
| montevideo-buceo-avenida-solano-lopez-1enj14v | Buceo | 1 | 1 | 51 | infocasas, mercadolibre |
| montevideo-pocitos-sarmiento-gj7sqc | Pocitos | 0 | 1 | 34 | infocasas, mercadolibre |
| montevideo-la-blanqueada-echeandia-14nne2a-12rj5to | La Blanqueada | 1 | 1 | 40 | infocasas, mercadolibre |
| montevideo-pocitos-charrua-trzzbw | Pocitos | 0 | 1 | 26 | infocasas, mercadolibre |
| montevideo-barrio-sur-avenida-gonzalo-ramirez-1ftcxh2 | Barrio Sur | 1 | 1 | 46 | infocasas, mercadolibre |
| montevideo-ciudad-vieja-buenos-aires-8zw734 | Ciudad Vieja | 1 | 1 | 41 | infocasas, mercadolibre |
| montevideo-centro-agrim-german-barbato-so12sg | Centro | 1 | 1 | 43 | infocasas, mercadolibre |
| montevideo-punta-carretas-21-de-setiembre-1uri0va | Punta Carretas | 0 | 1 | 43 | infocasas, mercadolibre |
| montevideo-punta-carretas-ibiray-1bwad2s | Punta Carretas | 1 | 1 | 45 | infocasas, mercadolibre |
| montevideo-pocitos-21-de-setiembre-966ouj | Pocitos | 0 | 1 | 40 | infocasas, mercadolibre |
| montevideo-pocitos-manuel-vicente-pagola-v64bwc | Pocitos | 1 | 1 | 58 | infocasas, mercadolibre |
| montevideo-la-blanqueada-luis-alberto-de-herrera-g427ad | La Blanqueada | 1 | 1 | 35 | infocasas, mercadolibre |
| montevideo-punta-gorda-rambla-ohiggins-yx55r7 | Punta Gorda | 0 | 1 | 30 | infocasas, mercadolibre |
| montevideo-cordon-ana-monterroso-1r3x9gq | Cordón | 1 | 1 | 38 | infocasas, mercadolibre |
| montevideo-la-blanqueada-joanico-1j4ppbt | La Blanqueada | 0 | 1 | 33 | infocasas, mercadolibre |
| montevideo-punta-carretas-lagunillas-1k0e9k9 | Punta Carretas | 1 | 1 | 45 | infocasas, mercadolibre |
| montevideo-punta-carretas-benito-blanco-18kyy32 | Punta Carretas | 0 | 2 | 53 | infocasas, mercadolibre |
| montevideo-carrasco-norte-lancasteriana-11wn400 | Carrasco Norte | 0 | 1 | 23 | infocasas, mercadolibre |
| montevideo-centro-rio-branco-8a3t64 | Centro | 1 | 1 | 54 | infocasas, mercadolibre |
| montevideo-punta-carretas-lagunillas-gynzvf | Punta Carretas | 1 | 1 | 43 | infocasas, mercadolibre |
| montevideo-cordon-arenal-grande-1192b05-jxh1eu | Cordón | 1 | 1 | 45 | infocasas, mercadolibre |
| montevideo-pocitos-luis-b-cavia-1sr5e72 | Pocitos | 2 | 2 | 69 | infocasas, mercadolibre |
| montevideo-parque-rodo-macachines-1fixgib | Parque Rodó | 2 | 1 | 52 | infocasas, mercadolibre |
| montevideo-pocitos-pereira-gabriel-19086u1 | Pocitos | 1 | 1 | 39 | infocasas, mercadolibre |
| montevideo-malvin-avenida-italia-1pcwj39 | Malvín | 1 | 1 | 37 | infocasas, mercadolibre |
| montevideo-pocitos-gabriel-pereira-al-132bec5 | Pocitos | 0 | 1 | 30 | mercadolibre, infocasas |
| montevideo-carrasco-rbla-republica-de-mexico-1cys4c | Carrasco | 0 | 1 | 32 | mercadolibre, infocasas |
| montevideo-malvin-colombes-al-1nbzyzk | Malvin | 1 | 1 | 37 | mercadolibre, infocasas |
| montevideo-villa-biarritz-leyenda-patria-19af0vi | Villa Biarritz | 2 | 1 | 41 | infocasas, mercadolibre |
| montevideo-punta-carretas-garcia-cortinas-1lt3mcz | Punta Carretas | 1 | 1 | 54 | mercadolibre, infocasas |
| montevideo-cordon-paullier-al-vhumt7 | Cordón | 1 | 1 | 46 | infocasas, mercadolibre |
| montevideo-cordon-jose-enrique-rodo-1tsz8tk | Cordón | 0 | 1 | 25 | infocasas, mercadolibre |
| montevideo-pocitos-pedro-campbell-al-1mkbmk8 | Pocitos | 0 | 1 | 24 | mercadolibre, infocasas |
| montevideo-cordon-doctor-pablo-de-maria-jcol3e | Cordón | 2 | 1 | 59 | infocasas, mercadolibre |
| montevideo-pocitos-nuevo-26-de-marzo-1a45nso | Pocitos Nuevo | 1 | 1 | 40 | mercadolibre, infocasas, casasweb |
| montevideo-parque-batlle-doctor-jose-brito-foresti-1sj9936 | Parque Batlle | 0 | 1 | 24 | mercadolibre, infocasas |
| montevideo-la-blanqueada-avenida-centenario-18ez7dy | La Blanqueada | 1 | 1 | 39 | infocasas, mercadolibre |
| montevideo-union-pres-ingeniero-jose-serrato-ny9pof | Unión | 1 | 1 | 43 | infocasas, mercadolibre |
| montevideo-malvin-samuel-blixen-13beaqa | Malvín | 1 | 1 | 37.5 | infocasas, mercadolibre |
| montevideo-centro-arismendi-xmm2pt | Centro | 1 | 1 | 51 | infocasas, mercadolibre |
| montevideo-cordon-joaquin-de-salterain-1nmqelh | Cordón | 1 | 1 | 41 | infocasas, mercadolibre |
| montevideo-pocitos-francisco-munoz-1vixo8p | Pocitos | 0 | 1 | 40 | infocasas, mercadolibre |
| montevideo-cordon-juan-d-jackson-z9tr8d | Cordón | 0 | 1 | 35 | infocasas, mercadolibre |
| montevideo-punta-carretas-francisco-garcia-cortinas-al-n8yo81 | Punta Carretas | 1 | 1 | 47 | infocasas, mercadolibre |
| montevideo-pocitos-manuel-vicente-pagola-1aldj4t | Pocitos | 0 | 1 | 38 | infocasas, mercadolibre |
| montevideo-la-blanqueada-republica-dominicana-1mri04v | La Blanqueada | 3 | 1 | 61 | infocasas, mercadolibre |
| montevideo-pocitos-avenida-brasil-gvtpv | Pocitos | 2 | 2 | 74 | mercadolibre, infocasas |
| montevideo-parque-batlle-avenita-italia-al-nb4j1k | Parque Batlle | 2 | 1 | 54 | infocasas, mercadolibre |
| montevideo-malvin-colombes-al-1qkjfti | Malvin | 2 | 2 | 70 | mercadolibre, infocasas |
| montevideo-malvin-rbla-concepcion-del-uruguay-1okw5oe | Malvín | 1 | 1 | 47 | infocasas, mercadolibre |
| montevideo-la-blanqueada-jaime-cibils-so7rw9 | La Blanqueada | 1 | 1 | 41 | infocasas, mercadolibre |
| montevideo-la-blanqueada-felipe-sanguinetti-15lbl7i | La Blanqueada | 2 | 1 | 51 | infocasas, mercadolibre |
| montevideo-pocitos-avenida-luis-alberto-de-herrera-1f441xa | Pocitos | 1 | 1 | 46 | infocasas, mercadolibre |
| montevideo-cordon-arenal-grande-1192b05 | Cordón | 1 | 1 | 45 | mercadolibre, infocasas |
| montevideo-parque-rodo-br-espana-s71up6 | Parque Rodó | 0 | 1 | 40 | infocasas, casasweb |
| montevideo-pocitos-26-de-marzo-2wa92j | Pocitos | 0 | 1 | 30 | infocasas, mercadolibre |
| montevideo-pocitos-bulevar-espana-pzxdmm | Pocitos | 4 | 3 | 96 | infocasas, mercadolibre |
| montevideo-tres-cruces-acevedo-diaz-1pbngoa | Tres Cruces | 1 | 1 | 42 | infocasas, mercadolibre |
| montevideo-puerto-buceo-rambla-armenia-1a3tz6c | Puerto Buceo | 1 | 1 | 55 | mercadolibre, infocasas |
| montevideo-la-blanqueada-ramon-ortiz-1mrcbv8 | La Blanqueada | 1 | 1 | 40 | infocasas, mercadolibre |
| montevideo-ciudad-vieja-buenos-aires-xzp55o | Ciudad Vieja | 0 | 1 | 32 | infocasas, mercadolibre |
| montevideo-punta-carretas-21-de-setiembre-vjq7lw | Punta Carretas | 3 | 3 | 100 | infocasas, casasweb |
| montevideo-cordon-jose-enrique-rodo-7u5xh1 | Cordón | 1 | 1 | 37 | mercadolibre, infocasas |
| montevideo-apartamento-benito-blanco-mw1i0y | Pocitos | 3 | 3 | 131 | infocasas, mercadolibre |
| montevideo-punta-carretas-joaquin-nunez-vd1vt4 | Punta Carretas | 2 | 2 | 82 | mercadolibre, infocasas |
| montevideo-punta-carretas-21-de-setiembre-2axwk1 | Punta Carretas | 2 | 1 | 50 | mercadolibre, infocasas |
| montevideo-centro-paraguay-17xgz58 | Centro | 1 | 1 | 39 | mercadolibre, infocasas |
| montevideo-pocitos-franzini-131cot4 | Pocitos | 1 | 1 | 40 | infocasas, mercadolibre |
| montevideo-cordon-juan-a-rodriguez-190pkci | Cordón | 1 | 1 | 42 | mercadolibre, infocasas |
| montevideo-pocitos-jose-marti-1khqs7l | Pocitos | 3 | 3 | 94 | infocasas, mercadolibre |
| montevideo-cordon-18-de-julio-al-1ow9g1j | Cordón | 0 | 1 | 38 | infocasas, mercadolibre |
| montevideo-pocitos-lorenzo-justiniano-perez-1moyfrm | Pocitos | 2 | 1 | 64 | infocasas, mercadolibre |
| montevideo-cordon-jose-enrique-rodo-1qechrc | Cordón | 1 | 1 | 52 | infocasas, mercadolibre |
| montevideo-buceo-demostenes-18gw5ae | Buceo | 0 | 1 | 25 | infocasas, mercadolibre |
