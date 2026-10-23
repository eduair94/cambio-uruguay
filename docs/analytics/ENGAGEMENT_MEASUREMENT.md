# Medir lectura y la siguiente página

Desde este cambio, dos señales pequeñas ayudan a decidir qué corregir antes de agregar anuncios.
No requieren una base nueva, credenciales en el navegador ni otro proveedor. Usan el Google tag y
el Consent Mode ya configurados; no cambian la elección de cookies ni sus valores regionales.

| Evento                | Cuándo sale                                                                                                                                                    | Parámetros útiles                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `read_progress`       | Al desplazar contenido, con al menos 15 segundos visibles y 50 % alcanzado; otro al superar 30 segundos y 90 %. Cada umbral sale una vez por visita a la ruta. | `content_path`, `read_percent` (50 o 90)        |
| `internal_navigation` | Activación de un enlace a otra ruta pública, incluido el botón central. No incluye filtros, anclas ni descargas.                                               | `content_path`, `destination_path`, `link_area` |
| `recommendation_view` | Al menos la mitad de un enlace interno del módulo queda en el viewport, con la pestaña visible. Una vez por módulo y visita al pathname.                     | `content_path`, `link_area`                    |
| `outbound_click`      | Activación de un enlace externo.                                                                                                                               | `link_domain`, `link_url` (sólo origen)         |
| `cta_click`           | Activación de un elemento con un identificador fijo `data-cta`.                                                                                                | `cta`, `path`                                   |

`related_click` y los eventos específicos de herramientas siguen existiendo. No sumar
`related_click` e `internal_navigation`: pueden describir el mismo clic. `internal_navigation`
registra la intención de abrir otra página, **no prueba** que cargó; para la llegada usar el
`page_view` que ya produce GA4 y la exploración de rutas.

Las exposiciones se limitan a `guide_next_steps` y `bank_decision`. Se observa el enlace real,
no la caja completa del módulo; no se cuentan anclas de la misma página, descargas, destinos
privados ni enlaces externos. Cambiar de página desconecta el observador anterior; cambiar
filtros, volver de una pestaña oculta o restaurar la caché del navegador no repite la exposición.
No hay temporizadores y, sin soporte de IntersectionObserver, no se inventan vistas.

## Qué mide y qué no

La lectura es una señal conservadora de avance: no prueba comprensión ni tiempo de lectura activo.
Cuenta sólo tiempo con la pestaña visible y evalúa hitos durante un desplazamiento precedido por
rueda, gesto táctil o tecla de navegación. Abrir una pestaña en segundo plano, restaurar el scroll,
quedarse inmóvil o saltar con un enlace del índice no emite hitos por sí solo. Arrastrar únicamente
la barra del navegador puede quedar fuera. Las páginas que caben en una pantalla no se califican
como lecturas completas. Se mide la caja de la página, sin el pie, las recomendaciones del layout
ni el riel publicitario; listados y calculadoras siguen siendo desplazamientos, no artículos leídos.

El reloj y los hitos se reinician al cambiar de pathname, incluso entre dos fichas de la misma
familia. Cambiar filtros o hash no reinicia nada. Ocultar/minimizar la pestaña pausa el reloj;
`pagehide`/`pageshow` cubren la caché de navegación del navegador. No hay intervalos ni pings de
permanencia y nunca se envían `user_engagement`, `page_view`, `engagement_time_msec` ni IDs de sesión.
Los hitos llevan `non_interaction: true`, pero **eso no reemplaza las reglas de GA4**: no marcar
estos eventos como eventos clave ni como conversiones publicitarias. Google define la sesión
comprometida por duración, vistas o eventos clave y desaconseja pings genéricos que alargan sesiones.
Fuentes: [sesiones y medición](https://developers.google.com/analytics/devguides/collection/ga4/sessions)
y [tasa de rebote](https://support.google.com/analytics/answer/12195621?hl=es).

## Privacidad y cardinalidad

Los plugins toman rutas del patrón registrado por Vue Router, nunca del texto introducido por una
persona. Una ruta estática conserva su nombre (`/tarjetas-de-credito-uruguay`). Las guías presentes
en el índice editorial compacto `guideMeasurementSlugs.json` conservan su ruta exacta y su idioma,
después de comprobar el slug contra esa lista; los tests exigen paridad con todo el catálogo y
que cada slug resuelva en `getGuide`. Las demás rutas dinámicas
conservan la familia (`/guias/:item`, `/alquileres/:item`), incluidos slugs desconocidos. No se
carga el corpus completo de guías en los plugins globales. Se excluyen rutas privadas, autenticación, cuenta,
la lista personal, rutas desconocidas y las pantallas sin terceros (`/pizarra`, `/widget`). Esto
también se cumple después de navegar por la SPA.

El test `guideMeasurementSlugs.test.ts` es el generador del índice. Después de agregar o quitar
una guía, actualizar con `npx vitest run tests/unit/guideMeasurementSlugs.test.ts -u`.

Estos eventos sobrescriben sus campos automáticos `page_location`, `page_referrer` y `page_title`
con el patrón seguro o un valor vacío. No incluyen términos de búsqueda, filtros, coordenadas,
datos de contacto, títulos del contenido ni parámetros/hash de enlaces. Los enlaces externos
conservan sólo protocolo+host: antes `outbound_click` podía enviar el teléfono y el texto de una
URL de WhatsApp. Los valores de `data-link-area` y `data-cta` son vocabulario fijo, no texto de una
persona. Esta protección corresponde a estos plugins; no modifica los eventos automáticos del
Google tag ni la configuración de Enhanced Measurement de la propiedad.

Áreas admitidas: `guide_next_steps`, `guide_section`, `guide_contents`, `related_pages`, `header`,
`drawer`, `footer`, `content`. Un contenedor puede declarar `data-link-area="guide_next_steps"`;
para el resto se reconoce el área por la estructura del sitio. Un valor desconocido cae en
`content`, sin publicarlo como dimensión.

## Cómo usar los datos después de desplegar

1. En GA4 ya existen las dimensiones de evento `content_path` y `destination_path`, verificadas
   por Admin API y por la metadata de Data API el **23/10/2026**. Faltan `link_area` y
   `read_percent`. Se intentó crear la primera con un token válido de alcance `analytics.edit`,
   pero Google respondió **403 PERMISSION_DENIED: The caller does not have permission**. La
   cuenta de servicio puede leer la configuración, pero no editarla. La verificación posterior
   confirmó que no se creó ninguna definición. No se modificaron eventos clave ni filtros.

   Una persona con rol **Editor o Administrador** debe abrir **Administrar → Visualización de
   datos → Definiciones personalizadas → Crear dimensión personalizada** y guardar estas dos:

   | Nombre visible | Alcance | Parámetro del evento |
   | --- | --- | --- |
   | Link area | Evento | `link_area` |
   | Reading depth percent | Evento | `read_percent` |

   No convertir los eventos en eventos clave. Los nombres de evento se reciben sin estas
   definiciones, pero faltarán las columnas para desglosarlos por área y profundidad; Google
   indica que las definiciones pueden tardar **24–48 horas** en estar disponibles en informes.
   `section_kind` y `section_index` son opcionales para estudiar saltos del índice y no se
   intentó registrarlos. Referencia: [dimensiones personalizadas de evento](https://support.google.com/analytics/answer/14239696).
2. En Exploraciones, filtrar país Uruguay y comparar móvil/escritorio y canal de sesión. Usar
   ventanas equivalentes de 28 días, evitando interpretar la llegada de esta instrumentación
   como una mejora de comportamiento. Nunca sumar usuarios únicos de filas diferentes.
3. Explorar `internal_navigation` por `content_path` → `destination_path`, con `link_area` en
   columnas y recuento de eventos. Permite ver si las siguientes páginas relevantes realmente
   reciben clics o todo el movimiento se limita al encabezado. Comparar también las vistas por
   sesión y llegadas a destinos; un clic no garantiza otra vista ni otro anuncio servido.
4. Comparar `internal_navigation` y `recommendation_view` con el mismo `content_path`,
   `link_area`, país, dispositivo y período. El cociente de eventos es **acciones por exposición
   de módulo**, no una proporción de visitantes únicos: una persona puede activar varios enlaces
   después de una exposición. Para una proporción de personas, usar `totalUsers` de ambos eventos
   con el mismo alcance; los clics también pueden ocurrir antes de que el observador registre una
   exposición, así que no es un embudo enlazado por visitante. No sumar usuarios entre filas.
5. Explorar `read_progress` por `content_path` y `read_percent`. Un cociente 90/50 bajo señala
   páginas donde quienes llegan a la mitad rara vez avanzan más. En rutas estáticas también se
   puede comparar el hito 50 con las vistas de esa página en la misma ventana, igual que en las
   guías verificadas por el índice editorial. **En las demás rutas dinámicas se agrupa por familia**:
   no dividir `/guias/:item` por las vistas de una única guía. No usar la
   ausencia de hitos en páginas cortas como señal de rebote.
6. Para rebote real, usar el informe de páginas de destino de GA4 con sesiones, tasa de rebote y
   tiempo de interacción, segmentado igual. Una página que resuelve una consulta y termina en un
   clic a una fuente oficial puede haber cumplido su función. Cruzar mejoras de navegación con el
   RPM y los ingresos de la familia en los tableros privados; más permanencia no demuestra más
   ingreso por sí sola.

Hipótesis accionables: muchas llegadas y poco avance → revisar respuesta inicial y legibilidad;
buen avance y pocos clics al siguiente paso → revisar pertinencia y ubicación de las recomendaciones;
muchos clics sin llegadas → revisar carga, errores y destino. No agregar anuncios para resolver
ninguna de esas tres situaciones.

## Verificación

`npx vitest run tests/unit/engagementMeasurement.test.ts tests/unit/recommendationExposure.test.ts tests/unit/consent.test.ts tests/unit/gtagEnvironment.test.ts`
cubre rutas sensibles, querystrings, teléfono/mensaje externo, tiempo oculto, restauración del scroll,
reinicios SPA, clic central, paridad de slugs editoriales, exposición visible de enlaces y desmontaje
de los plugins. Los tests no contactan Google.

En un navegador de prueba con depuración habilitada en producción: hacer una navegación real y
comprobar **una sola** vista nueva, ubicación/referrer correctos en esa vista y un evento de clic
separado; los nuevos plugins no administran vistas. Leer/desplazar más de 30 segundos, ocultar la
pestaña y volver para inspeccionar los hitos en DebugView. Confirmar también un inicio sin cookies,
una aceptación y un rechazo persistido. El procedimiento de Google para SPA está
[documentado aquí](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications).
