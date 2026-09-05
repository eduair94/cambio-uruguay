# Alquileres Uruguay: producto, necesidades y fichas individuales

Investigación realizada el **5 de septiembre de 2026**. Continúa el [relevamiento del 4 de septiembre](rentals-ux-2026-09-04.md), sin reemplazar sus observaciones históricas. Es una propuesta de producto y de implementación SEO; no acredita que las mejoras propuestas estén publicadas.

## Decisión para esta entrega

La oportunidad principal es ayudar a **decidir y continuar una búsqueda**, además de reunir avisos. La página ya tiene filtros amplios, presupuesto con gastos comunes, guardados y comparación locales, cobertura transparente y una ficha contextual en el mapa. La siguiente entrega debe convertir esa información en una ficha individual útil, compartible y accesible directamente desde un buscador.

Cinco prioridades, en orden:

1. **Una URL estable por inmueble**, con contenido inicial completo, enlace desde listado y mapa, compartir y retorno a la búsqueda conservando filtros. La ficha tiene que servir también sin haber visitado el directorio.
2. **Costo y condiciones por oferta**, con alquiler, moneda, gastos comunes y su suma; procedencia y fechas; desconocidos explícitos. No combinar el precio de un portal con los gastos de otro ni llamar a esa suma el costo completo de vivir allí.
3. **Vigencia y retirada honestas**: distinguir lectura reciente, publicación y disponibilidad; retirar del buscador una ficha que ya no se ofrece sin presentar una caída temporal del proveedor como prueba de que se alquiló.
4. **Ayuda concreta antes de contactar**: preguntas sobre gastos adicionales, garantías, plazo, mascotas y condiciones físicas. Mostrar lo que falta por confirmar sirve más que completar campos con suposiciones.
5. **Indexación con criterios de calidad y ciclo de vida**, no una campaña para multiplicar páginas. Sitemap, enlaces, canonical y estados HTTP deben coincidir con el inventario público; las variantes arbitrarias de filtros no deben multiplicar las fichas.

Las prioridades son una síntesis de esta investigación y del modelo de datos local. No constituyen una clasificación estadística de las preferencias uruguayas.

## Método y límites

Se contrastaron páginas públicas de MercadoLibre Uruguay, InfoCasas, Casasweb, Gallito, Inmuebles El País y Trovit; se intentó consultar BuscandoCasa. Se revisaron testimonios públicos de r/uruguay sobre el proceso de alquilar y documentación primaria de Google Search Central, Schema.org e INE. Todas las fuentes enlazadas fueron consultadas o localizadas mediante su contenido indexado el **05/09/2026**. La columna de evidencia distingue esos casos.

- La muestra de Reddit es intencional y de conveniencia: búsquedas por problema, con fuerte presencia de Montevideo y de experiencias frustrantes. No es una encuesta, no permite porcentajes de demanda ni estimar cuántos usuarios tienen cada problema. Los relatos no verifican responsabilidades de anunciantes o inmobiliarias.
- Se conservaron testimonios históricos cuando describen un problema operativo, junto con testimonios recientes. Las fechas relativas que devuelve el buscador o una copia rastreada no se transformaron en fechas de publicación exactas.
- No se completaron formularios, contactaron anunciantes, contrataron servicios ni comprobaron viviendas en persona. No se probaron todas las combinaciones de filtros o funcionalidades con cuenta de cada competidor.
- Una página que anuncia una función acredita la afirmación del portal; no acredita precisión, disponibilidad real ni la misma experiencia en todos los dispositivos.
- Los conteos de portales no son comparables: pueden mezclar operaciones, duplicados, temporadas, tipos comerciales y ventanas de actualización. No se los utiliza como cuota de mercado.
- No se consultó una API de keywords de pago ni se extrajeron consultas privadas de Search Console al documento público. No hay estimaciones inventadas de volumen de búsqueda, conversión o demanda nacional.

## Punto de partida y mercado que estamos midiendo

Según la documentación y el código locales revisados, la app ya resuelve búsqueda explícita con URL, varios barrios, filtros de características, gastos conocidos/cero/desconocidos, total mensual por oferta, mapa bajo demanda, favoritos y comparación. En escritorio hay sidebar con desplazamiento interno; en móvil, panel completo y acceso fijo desde los resultados. La cobertura global se calcula separada del resultado filtrado y de la última lectura de cada fuente. Véanse [RENTALS.md](../app/RENTALS.md) y [decisiones de búsqueda](../app/RENTALS_SEARCH_DESIGN.md).

El inventario observado durante esta entrega ronda las 16 mil propiedades únicas. Eso representa **ofertas públicas captadas y suficientemente recientes según nuestras reglas**, no todas las viviendas disponibles en Uruguay ni contratos firmados. El País sigue teniendo cero aporte público en el último estado documentado: una página pública consultable por buscador no demuestra que el recolector desplegado pueda recorrerla.

Como referencia metodológica, el INE publica indicadores de contratos vigentes y alquileres, un universo distinto del precio pedido en avisos. Su ficha de junio de 2026, publicada el 10/08/2026, informa variaciones mensuales de precio y cantidad de contratos. El informe detallado y la nota metodológica devolvieron timeout/502 en esta revisión, por lo que no se extrapolan cobertura o cantidades desde ellos. No conviene rotular una mediana del índice como «alquiler promedio de Uruguay». [INE: indicadores de junio de 2026](https://www.gub.uy/instituto-nacional-estadistica/comunicacion/publicaciones/indicadores-actividad-inmobiliaria-iai-mercado-alquileres-junio-2026).

## Matriz de competidores

«No comprobado» no significa «no existe». Las observaciones se limitan a las rutas indicadas y al estado de consulta de esta revisión.

| Portal y evidencia | Funciones observadas | Qué aporta al diseño propio | Límite o diferencia relevante |
| --- | --- | --- | --- |
| **MercadoLibre Uruguay**: [listado Montevideo](https://listado.mercadolibre.com.uy/apartamentos-en-alquiler-montevideo), [listado de dueño directo](https://listado.mercadolibre.com.uy/alquiler-apartamentos-montevideo-due%C3%B1o-directo). Contenido indexado consultado hoy; portada directa devolvió 403. | Guardar búsqueda, publicados hoy, precio UYU/USD, anunciante, dormitorios/monoambiente, baños, superficie y mapa. | Filtros escaneables, recuentos por faceta, búsqueda recuperable y ficha concreta como destino. | Un listado por palabras de «dueño directo» no equivale al filtro estructurado del anunciante. Algunas rutas por texto incluyen venta o temporada: preservar operación mensual de forma explícita. No se verificó la entrega actual de alertas con cuenta. |
| **InfoCasas**: [alquileres](https://www.infocasas.com.uy/alquiler) y [ficha 194173830](https://www.infocasas.com.uy/alquiler-apartamento-de-1-dor-con-amplio-patio-y-parrillero-prop-en-bella-vista-garaje-opcional/194173830). Páginas abiertas. | Galería/video/mapa, precio y GC separados, datos extensos, garantías, datos desconocidos que invitan a preguntar, referencia y anunciante. | Una ficha útil expone tanto lo conocido como las preguntas pendientes. Separar m² interiores, exteriores y totales. | La lista general consultada incluye textos de alquiler invernal y temporada. Hay diferencias entre campos y descripción. «Inmobiliaria verificada» es una etiqueta del portal, no una validación nuestra. |
| **Casasweb**: [búsqueda Carrasco](https://casasweb.com/resultados.aspx?m=0&n=A&t=c&x=1&z=1), [ficha CW243972](https://casasweb.com/ALQUILER__COOPER_INMOBILIARIA_CASA_CARRASCO_MONTEVIDEO_CW243972). Páginas abiertas. | Varios barrios, rangos de superficie, mascotas, muebles, fondo, vigilancia y equipamiento; ficha con referencia, fotos, guardar y compartir. | Grupos de atributos domésticos, referencia estable y compartir sin reconstruir la búsqueda. | No copiar todos los filtros posibles: varios pertenecen a venta o inversión. Una ficha observada declara 80 m² edificados y 10 m² totales; las contradicciones de origen requieren cautela, no una corrección inventada. |
| **Gallito**: [alquileres](https://www.gallito.com.uy/inmuebles/alquiler). Guardar búsqueda confirmado en resultado indexado; apertura directa inestable/timeout. | Guardar búsqueda; el relevamiento anterior documentó ubicación, precio, dormitorios, superficie, orientación, estado y garantías. | Referencia para organización del formulario y continuidad de la búsqueda. | Los detalles de filtros del 04/09 permanecen evidencia histórica, no una nueva prueba completa. No se verificó el envío de correos. Acceso de scraping sigue siendo una limitación independiente de la interfaz. |
| **Inmuebles El País**: [inicio](https://inmuebles.elpais.com.uy/). Página abierta. | El portal presenta una búsqueda conversacional que traduce necesidades en filtros y permite refinarlas; separa alquiler de temporario y enlaza categorías por zona. | Un asistente, si se incorpora, debería generar un borrador de filtros entendible, editable y explícito. | La actualización diaria y la retirada de avisos son afirmaciones del portal, no auditadas aquí. Su cifra anunciada engloba venta y temporario. No se probó una conversación ni se justifica añadir IA antes de resolver datos faltantes. |
| **Trovit**: [búsqueda de GC bajos](https://casas.trovit.com.uy/alquiler-apartamento-gastos-comunes-bajos). Página abierta, copia rastreada hace meses. | Guardar búsqueda, reportar, ver propiedad y atributos resumidos en un agregador. | Referencia de la necesidad de corregir o descartar un resultado durante la comparación. | Buscar por palabras puede traer resultados heterogéneos. Es otro agregador: incorporarlo como fuente puede añadir saltos y duplicados; no se demostró ganancia única ni acceso estable. |
| **BuscandoCasa**: [inicio](https://www.buscandocasa.com/). Falló la apertura de esta revisión. | No se adjudican nuevas funciones. | Candidato de investigación de cobertura, no una integración comprometida. | El 04/09 se documentó una portada accesible, pero no un recorrido nacional de resultados validado. |

La diferencia defendible de Cambio Uruguay es relacionar publicaciones de una misma propiedad, hacer comparables sus costos y exponer las limitaciones del dato. No basta con una descripción reformulada de cada portal.

## Necesidades expresas y brechas que quedan

La fecha de consulta de todos los testimonios siguientes es 05/09/2026. «Reciente» indica que el contenido indexado lo sitúa en 2026; no se infiere un día exacto desde etiquetas relativas.

| Necesidad observada | Evidencia primaria | Estado actual y oportunidad |
| --- | --- | --- |
| **Saber si alcanza el presupuesto mensual** | [Alquiler y gastos mensuales — MVD](https://www.reddit.com/r/uruguay/comments/1vm3aye/alquiler_y_gastos_mensuales_mvd/), reciente, abierto: una pareja pide un límite que incluya GC; las respuestas agregan servicios y estilo de vida. | La suma alquiler+GC está resuelta. Falta separar lo que esa suma excluye y facilitar un presupuesto personal editable, sin recomendar un porcentaje universal de ingresos. |
| **Llegar con el dinero y la garantía necesarios** | [Alquilar sin garantía](https://www.reddit.com/r/uruguay/comments/xe3ewe/), histórico, contenido indexado: se describen comisión, depósitos, garantía y adelantos como obstáculos acumulados. | El filtro de garantía no muestra requisitos de elegibilidad ni efectivo de entrada. Primera entrega: preguntas concretas y enlace a la guía existente; posterior: calculadora con valores introducidos por la persona y condiciones oficiales verificadas. |
| **Evitar intermediación cuando no se quiere pagarla** | [Inmobiliarias: ¿soy el único al que esto le hace ruido?](https://www.reddit.com/r/uruguay/comments/1qpd9yg/inmobiliarias_soy_el_%C3%BAnico_al_que_esto_le_hace/), reciente, abierto. | Hay filtro de dueño. La ficha debe exponer quién lo declara, no convertir un dato de origen en una certificación. Faltaría un mecanismo para señalar clasificación incorrecta. |
| **No perder tiempo con avisos retirados** | [Páginas para buscar alquileres](https://www.reddit.com/r/uruguay/comments/qoou5v/), histórico, contenido indexado: un comentario relata llamadas a avisos que ya estaban alquilados. | Última lectura y caducidad ayudan, pero no prueban disponibilidad. Posible siguiente paso: reporte «ya no disponible» con revisión y trazabilidad; nunca borrar públicamente por un reporte aislado. |
| **Enterarse antes de volver a revisar todos los portales** | [Voy a alquilar una propiedad](https://www.reddit.com/r/uruguay/comments/150k3ix/), histórico, contenido indexado: un comentario describe revisión repetida y uso de alertas de ML. | Guardar búsqueda local ya existe; avisos de nuevas coincidencias aún requieren infraestructura real. Antes de correo/push, puede ser útil «nuevos desde tu última visita» basado en fecha de primera detección e identidad estable. |
| **Mascotas con condiciones concretas** | [Mudarse con cuatro mascotas](https://www.reddit.com/r/uruguay/comments/1r4qz76/considerando_mudarnos_a_uruguay_pregunt%C3%A1ndome/), reciente, abierto: la autora distingue «aceptan» de límites de cantidad y tamaño. | El booleano no responde eso. Mostrar la aceptación declarada y sugerir confirmar cantidad, tamaño y reglas; no inferir compatibilidad por jardín o tamaño del inmueble. |
| **Evitar humedad, ruido y falta de sol** | [Tips para buen alquiler precio/calidad](https://www.reddit.com/r/uruguay/comments/wol9ua/), histórico, contenido indexado; [Alquiler y humedad](https://www.reddit.com/r/uruguay/comments/1ny14nv/), contenido indexado: se describe una mudanza que implicaría nuevos gastos tras problemas de humedad. | No hay datos que permitan certificar estas condiciones. Lista de visita con orientación/disposición/ventilación a confirmar; notas personales. No una etiqueta automática de «sin humedad» basada en fotos o texto publicitario. |
| **Elegir ubicación según tiempo y dinero propios** | [Habitación en Montevideo](https://www.reddit.com/r/uruguay/comments/10cztuh/), histórico, indexado: el autor compara traslado largo con vivir cerca. [Peores consejos del sub](https://www.reddit.com/r/uruguay/comments/1w4fofa/peores_consejos_en_este_sub_que_hayan_le%C3%ADdo/), reciente, abierto: hay desacuerdo sobre cuánto compensa pagar más por cercanía. | El mapa y proximidad a salud no equivalen a tiempo de viaje. Enlace a indicaciones con ubicación declarada es factible; tiempos de ómnibus, transbordos y costo mensual requieren datos y preferencias. No recomendar un barrio como universalmente conveniente. |
| **Delimitar una zona menor que el barrio** | [Encontrar apartamentos en cierta área](https://www.reddit.com/r/uruguay/comments/ia0xyb/), histórico, indexado: se pregunta por búsqueda espacial más precisa. | Varios barrios y ver puntos no equivalen a filtrar por la zona visible. Próximo paso posible: «buscar en esta zona» con aplicación explícita y sin perder los demás filtros. Debe informar que deja fuera inmuebles sin coordenadas. |

No se halló en esta revisión evidencia suficiente para priorizar una clasificación automática de «barrios seguros», precios futuros, un chatbot libre o una puntuación única de «mejor propiedad». Podrían ocultar incertidumbre o preferencias distintas. La accesibilidad física sí merece un modelo explícito futuro (escalones, ascensor, ancho de acceso), pero aquí no se reunió una muestra suficiente de búsquedas de alquiler sobre ese tema: no se presenta como demanda cuantificada.

## Dos casos de datos que cambian una decisión

**Garaje y superficie no siempre significan lo que parece.** La ficha InfoCasas 194173830 declara un garaje, pero el texto especifica que es opcional por 3.000 UYU mensuales; distingue 65 m² totales de 45 m² interiores. El plazo estructurado aparece pendiente de consulta mientras la descripción indica 2 años. También declara tributos cada 2 meses. La mejora necesaria es conservar condiciones y procedencia por campo, no añadir esas cifras al índice sin un extractor validado. [Ficha primaria, ingresada según el portal el 27/08/2026](https://www.infocasas.com.uy/alquiler-apartamento-de-1-dor-con-amplio-patio-y-parrillero-prop-en-bella-vista-garaje-opcional/194173830).

**Mensual no implica anual.** La lista general de InfoCasas contiene una oferta cuyo texto especifica abril–noviembre, junto con otras que indican mínimo de días o precios de temporada. Esto no demuestra su frecuencia en nuestro índice; sí justifica auditar la modalidad antes de prometer vivienda para todo el año. El modelo debería admitir anual, invernal, temporal y desconocido, con evidencia del origen. [Listado consultado](https://www.infocasas.com.uy/alquiler).

## Alcance implementable y siguiente secuencia

| Prioridad | Mejora | Datos y trabajo necesarios | Criterio de aceptación |
| --- | --- | --- | --- |
| **P0, esta entrega** | Ficha individual completa y compartible | Reutilizar la proyección pública y la identidad de propiedad; SSR y un destino por key. | Acceso directo sin sesión; título/localización/datos/ofertas en HTML; compartir funciona; regreso conserva búsqueda; errores de red distinguibles de inmueble inexistente. |
| **P0, esta entrega** | Comparación de ofertas y preguntas pendientes | Datos existentes, textos breves ES/EN/PT y vínculo a guía. | Fuente y moneda visibles; GC de cero distinto de desconocido; suma del mismo aviso; ninguna garantía, comisión, duración o disponibilidad inventada. |
| **P0, esta entrega** | Descubrimiento y ciclo SEO | Canonical, estados HTTP, enlaces internos y sitemap dinámico de elegibles. | Una ficha real se descubre desde el directorio y sitemap; una key falsa no da 200; filtros de retorno no alteran identidad; páginas retiradas no siguen anunciándose como disponibles. |
| **P1, iteración siguiente** | Descartar/restaurar, notas y estado «contacté/visité» | Persistencia local, límites y manejo de fallos; no hace falta cuenta. | Descartar no borra un inmueble del índice; es reversible; el usuario ve que sus notas son privadas de ese navegador. |
| **P1, iteración siguiente** | Nuevos desde la última visita y seguimiento real | Identidad estable, primera detección y fecha de visita local. Alertas posteriores necesitan suscripción, deduplicación y baja. | Una republicación no se vende automáticamente como propiedad nueva; no se muestran botones que prometan avisos inexistentes. |
| **P1, primero medir** | Modalidad anual/invernal, GC incluidos/opcionales, m² interiores/totales, piso/ascensor, cocina definida | Extender esquema y extracción por oferta; muestra manual estratificada y casos contradictorios. | Publicar campo sólo con evidencia; desconocidos preservados; distinguir atributo disponible de atributo incluido en precio. |
| **P1, primero medir** | Reportes de disponibilidad y datos incorrectos | Cola de revisión, protección frente a abuso y feedback al usuario. | Un reporte no se interpreta como prueba ni expone datos del denunciante; corrección verificable en origen. |
| **P2** | Zona visible/dibujada, trabajo/estudio, trayectos | Cobertura geográfica, precisión declarada y, para tiempos, red de transporte/ruteo. | Mantener filtros y presupuesto; no geocodificar una dirección incompleta como exacta; no llamar «10 min» a una distancia en línea recta. |
| **P2** | Ampliación de directorios | Acceso público permitido, estabilidad, parser y medición de ganancia única. | Reportar inmuebles nuevos útiles por zona y frescura, no sólo cantidad descargada. |

Para ampliar cobertura, el siguiente experimento debería elegir un territorio o tipo con poca oferta y una fuente con acceso estable, medir primero el solapamiento y después decidir. Casasweb ya está incorporado; no contarlo de nuevo como novedad. Trovit y redes sincronizadas pueden repetir los portales existentes. Gallito y El País requieren resolver acceso estable sin sortear sus controles. Un contador alto no compensa datos incompletos o un recorrido de contacto que termina en un aviso retirado.

## Fichas SEO: contrato recomendado

### Utilidad y elegibilidad

Una ficha debe contestar: qué propiedad es, dónde se ubica con la precisión disponible, cuánto publica cada fuente, qué condiciones se conocen, cuándo se leyó, qué queda por consultar y cómo continuar. El contenido diferencial es la normalización y comparación, más la trazabilidad; no una descripción generada para alargar la página.

Propuesta de elegibilidad: al menos una oferta pública vigente y válida, identificación/localización suficientes para distinguirla, información útil para decidir y enlace original seguro. No imponer una cantidad arbitraria de palabras ni exigir dos portales a toda propiedad. Las fichas muy incompletas pueden seguir siendo navegables para quien las guardó sin formar parte del sitemap indexable.

Google considera abuso la producción de muchas páginas cuyo propósito principal es manipular rankings y que aportan poco valor, incluyendo feeds copiados o reformulados. **La cantidad de 16 mil por sí sola no determina infracción ni calidad.** La recomendación es conservar valor verificable por ficha y revisar una muestra de cada patrón de datos. [Políticas de spam: contenido a escala y scraping](https://developers.google.com/search/docs/essentials/spam-policies).

### Identidad y contexto

- La key existente se hereda de las ofertas en `resolveKey`; el precio no es la identidad. No regenerar la URL con cada cambio de título, precio o portal preferido.
- Una fusión o separación de grupos requiere tratar las URLs anteriores. Redirigir permanentemente sólo cuando se confirma que el destino representa el mismo inmueble; no enviar toda ficha retirada a la portada o a una propiedad parecida.
- La URL canónica debe representar la ficha completa sin presupuesto, selección de portal, tracking o parámetros de regreso. El contexto de búsqueda puede conservarse aparte para volver y destacar ofertas coincidentes.
- Una propiedad no deja de existir porque no cumpla los filtros del enlace de llegada. Si el precio cambió, mostrar la ficha y explicar que ya no coincide; no devolver un 404 producido únicamente por esos parámetros.

Los redirects y `rel=canonical` son señales de consolidación, no una garantía de selección. Enlaces internos y sitemap deben usar la misma URL preferida. [Google: consolidar duplicados](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

### HTML, navegación y facetas

El HTML inicial debería incluir los datos principales, título, descripción breve, canonical y enlaces originales. El mapa puede seguir cargando bajo demanda; el acceso a la ficha no debería depender de abrirlo ni de ejecutar un click. Google recomienda SSR o prerender por velocidad y por compatibilidad con rastreadores que no ejecutan JavaScript. [Google: JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

Las tarjetas deben enlazar con `<a href>` a su ficha. Si se utiliza una secuencia paginada rastreable, cada página tiene URL y canonical propios; no canonicalizar toda la secuencia a página 1. La navegación sólo mediante botones o scroll no sustituye los enlaces. [Google: paginación](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading).

Conservar los filtros compartibles de la app no exige indexar cada combinación. Propuesta inicial: catálogo y fichas elegibles indexables; variantes arbitrarias de presupuesto, orden, radio y búsqueda libres fuera del sitemap, con política explícita de indexación/rastreo. Más adelante, crear sólo categorías por zona/tipo que tengan demanda observada y contenido sostenido. Google explica que las facetas pueden generar espacios casi ilimitados y retrasar descubrimiento de URLs útiles. [Google: navegación facetada](https://developers.google.com/crawling/docs/faceted-navigation).

`noindex` necesita que Google pueda rastrear la página para leerlo. Bloquear simultáneamente en robots y esperar que se procese el `noindex` no es un plan de retirada. Decidir separadamente qué se quiere sacar del índice y qué no se quiere rastrear. [Google: noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

### Estados y fallos

| Situación | Comportamiento propuesto |
| --- | --- |
| Oferta vigente con información suficiente | 200, ficha completa, canonical propio, elegible para sitemap. |
| Key inventada, inválida o sin propiedad | 404 real con explicación y enlace a búsqueda. |
| Propiedad retirada sin oferta vigente | Quitar del sitemap;404/410 si ya no se conserva una ficha útil. Si existe un archivo histórico útil y autorizado, presentarlo inequívocamente como histórico y decidir su indexación por separado. |
| Precio o fuente cambió; dejó de coincidir con el filtro de llegada | La ficha sigue siendo 200 si existe; explicar el cambio y preservar acceso a la búsqueda. |
| Mongo/API temporalmente caído | Error temporal controlado, normalmente 503; no cachear un falso 404 masivo ni afirmar que se alquiló. |
| Fusión confirmada del mismo inmueble | 301/308 hacia la key conservada, sin cadenas. |

Google retira del índice las URLs que responden 4xx y reduce temporalmente el rastreo ante 5xx/429. Devolver 200 con una ficha vacía o un error visual no representa correctamente esos estados. No existe aquí una promesa de retirada inmediata del buscador. [Google: códigos HTTP](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes).

### Sitemap y datos estructurados

El sitemap debe generarse desde la misma definición de vigencia/elegibilidad que la ficha, con URLs absolutas y sin versiones filtradas. Evitar topes silenciosos que dejen fuera gran parte de las propiedades; paginar o dividir la consulta si hace falta. Un sitemap admite hasta 50.000 URLs o 50 MB sin comprimir: 16 mil URLs caben por cantidad, aunque dividir por segmento puede ayudar a observarlas. `lastmod` debe reflejar cambios significativos del contenido, no el instante de cada petición ni una actualización cosmética. Google ignora `priority` y `changefreq`. [Google: crear un sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

`RealEstateListing` existe en Schema.org como tipo de página, y `Apartment` permite describir un apartamento. Se pueden utilizar términos correctos del vocabulario con los datos conocidos, además de migas de navegación; no crear reseñas, coordenadas precisas, fechas o amenities que no se muestran al usuario. La validez Schema.org y la elegibilidad para una presentación especial de Google son cosas diferentes. [Schema.org: RealEstateListing](https://schema.org/RealEstateListing), [Apartment](https://schema.org/Apartment), [galería de resultados compatibles de Google](https://developers.google.com/search/docs/appearance/structured-data/search-gallery).

No aplicar `VacationRental` a alquileres mensuales para buscar un resultado enriquecido. Google documenta una integración vacacional con requisitos y acceso a Hotel Center; no es una garantía general para cualquier alquiler. Tampoco se debe inventar disponibilidad `InStock` como sinónimo de haber leído un aviso. [Google: VacationRental y elegibilidad](https://developers.google.com/search/docs/appearance/structured-data/vacation-rental).

La interfaz ES/EN/PT no justifica generar tres variantes indexables automáticamente sin contenido localizado y URLs/canonical coherentes. La decisión de internacionalización debe ser explícita; esta entrega puede localizar la experiencia sin prometer cobertura SEO en tres idiomas.

## Validación de la entrega y medición posterior

Comprobar una muestra que incluya varias ofertas, una sola oferta, GC de cero, GC desconocidos, mezcla UYU/USD, falta de foto, falta de coordenadas, dirección incompleta, título largo, origen caído y propiedad retirada. Revisar acceso directo y desde filtros, HTML sin interacción, canonical, estados HTTP, JSON-LD y pertenencia al sitemap. En 320/390 px, la persona debe poder ver costo y origen, guardar, compartir y volver sin controles superpuestos; en escritorio, la información debe ser escaneable sin un mapa obligatorio.

Métricas propuestas, no resultados obtenidos: continuidad listado→ficha→portal, uso de compartir/guardar/regreso, fallos de enlaces, tasa de fichas con GC conocido y localización útil, discrepancias de oferta auditadas y reportes confirmados. Para SEO, observar URLs elegibles frente a enviadas/indexadas, canonical elegido, exclusiones, errores y latencia. Medir consultas y clics en Search Console de forma privada, por cohortes de ficha; no atribuir una subida global al cambio sin comparación temporal.

Como siguiente investigación, entrevistar personas que estén buscando ahora en al menos Montevideo, Canelones/Maldonado e interior, incluyendo primera vivienda, familias con mascotas y necesidades de acceso físico. Observar cómo descartan, comparan y contactan con sus propios criterios. Esa investigación todavía no ocurrió y no se sustituye contando comentarios de Reddit.

## Material local y trazabilidad

- [Investigación anterior](rentals-ux-2026-09-04.md): fuentes, fricciones y límites previos.
- [Contrato y datos de alquileres](../app/RENTALS.md): fuentes realmente integradas, vigencia, deduplicación y limitaciones del recolector.
- [Decisiones de búsqueda](../app/RENTALS_SEARCH_DESIGN.md): funciones ya resueltas y pruebas de interacción.
- `classes/rentals/dedupe.ts`, funciones `propertyKey` y `resolveKey`: lectura del mecanismo actual de identidad; no se modificó código durante esta investigación.

No se publicaron mensajes externos ni se usaron llamadas de pago. Este documento propone alcance; la implementación, sus pruebas y el despliegue deben verificarse por separado.
