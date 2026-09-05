# Dos pruebas de difusión para Cambio Uruguay

Preparado el 4 de septiembre de 2026. Estado: listo para revisión; publicaciones y agenda pendientes de autorización. Los textos y las imágenes siguientes son el material público. La evidencia de Analytics y Search Console se conserva en la [ficha privada de medición](data/traffic-2026-09-04/growth-campaign-measurement.md), dentro de la carpeta excluida de Git.

## Publicación 1 · Elegir tarjeta

Objetivo: llevar a personas que están comparando tarjetas a revisar las condiciones de cada programa. Presentar la herramienta sin prometer un ahorro ni declarar un ganador universal.

Texto para X, 183 caracteres contando el enlace como 23:

```text
¿Tu tarjeta encaja con lo que comprás? Compará costo anual, canje de puntos, topes y vencimientos de programas en Uruguay. Mirá la letra chica antes de elegir.
https://cambio-uruguay.com/tarjetas-de-credito-uruguay?utm_source=twitter&utm_medium=social&utm_campaign=tarjetas_septiembre_2026&utm_content=x_comparacion_01
```

Adjuntar [tarjetas-comparacion.png](campaign-assets/2026-09-04/tarjetas-comparacion.png). [Original editable SVG](campaign-assets/2026-09-04/tarjetas-comparacion.svg).

Texto alternativo: «Tarjetas en Uruguay: antes de elegir, compará el costo anual, el canje de puntos y los topes y vencimientos. Cambio Uruguay».

## Publicación 2 · Usar el mapa

Objetivo: mostrar un uso concreto del mapa a personas que ya tienen tarjeta.

Texto para X, 202 caracteres contando el enlace como 23:

```text
¿Tenés descuento en ese comercio? Elegí tus tarjetas y filtrá el mapa por rubro o cercanía. Podés combinar varios bancos en una sola vista. Revisá las condiciones antes de pagar.
https://cambio-uruguay.com/descuentos-con-tarjeta-uruguay?utm_source=twitter&utm_medium=social&utm_campaign=descuentos_septiembre_2026&utm_content=x_mapa_01
```

Adjuntar [mapa-descuentos.png](campaign-assets/2026-09-04/mapa-descuentos.png). [Original editable SVG](campaign-assets/2026-09-04/mapa-descuentos.svg).

Texto alternativo: «Tus tarjetas, tu zona, tus descuentos. Elegí tarjetas, filtrá por rubro y buscá cerca tuyo en Cambio Uruguay. Ilustración esquemática de calles con marcadores; no representa comercios reales».

## Ejecución manual después de la aprobación

| Momento | Acción |
|---|---|
| Día 0 | Elegir la cuenta de X y aprobar las dos piezas. Abrir ambos enlaces; probar el mapa con una tarjeta y una categoría. Registrar la hora local y verificar que Analytics conserva las etiquetas de campaña. |
| Día 1 · 19:00 de Uruguay | Publicar la comparación con su PNG y texto alternativo. Guardar el enlace de la publicación en la ficha privada. La hora es una hipótesis inicial, no un horario óptimo demostrado. |
| Día 2 | Revisar las preguntas recibidas y preparar respuestas con fuentes. Registrar las métricas iniciales de X y las sesiones atribuibles cuando estén disponibles. |
| Día 4 · 19:00 de Uruguay | Publicar el mapa con su PNG y texto alternativo. Mantener la misma hora para reducir una diferencia entre pruebas. |
| Día 8 | Comparar los primeros siete días de la pieza 1 y revisar comentarios que revelen dificultades para usar el sitio. |
| Día 11 | Comparar los primeros siete días de la pieza 2. Elegir el siguiente tema usando sesiones con interacción, clics y preguntas útiles. |
| Día 15–30 | Preparar una continuación del tema que mostró interés con un nuevo ejemplo, una mejora concreta y un nuevo `utm_content`. Revisar Search Console por página en ventanas completas de 28 días. |

Las dos piezas tienen temas y fechas diferentes: esta prueba sirve para elegir qué desarrollar, sin atribuir causalidad a una sola variable. No hay publicaciones, respuestas, recordatorios ni tareas automáticas creadas por este documento.

## Qué medir y cómo decidir

En GA4, usar las dimensiones de sesión: **fuente/medio de la sesión**, **campaña de la sesión** y **contenido de anuncio manual de la sesión**. Filtrar `twitter / social`, después cada campaña y su `utm_content`. Registrar sesiones y sesiones con interacción; calcular tasa de interacción como sesiones con interacción / sesiones. En X, guardar impresiones y clics en el enlace cuando la cuenta tenga esas métricas disponibles. Comparar ventanas de igual duración, con el mismo corte horario.

Priorizar sesiones con interacción por publicación; usar clics / impresiones para entender el desempeño del mensaje. Registrar por separado el tiempo dedicado. Muchos clics y poca interacción sugieren revisar la promesa, la carga o el primer paso de la página. Buen uso con poca llegada sugiere mejorar el mensaje o su distribución. Con pocas sesiones, conservar los conteos y repetir la observación antes de declarar una pieza ganadora.

Las altas confirmadas y el uso del mapa requieren instrumentación comprobada: no deducir una suscripción de haber visto un formulario ni un uso de haber abierto la página. Los enlaces entre páginas del propio sitio deben ir sin UTM. Consultar la [ficha privada](data/traffic-2026-09-04/growth-campaign-measurement.md) para la base histórica y los resultados.

La mejora de navegación preparada junto a esta campaña incorporará `content_navigation` cuando se despliegue. Su alcance son los clics en accesos a secciones y páginas relacionadas: `content_path` identifica la página de origen; `destination_path`, el destino; y `placement`, la ubicación (`page_entry`, `program_summary` o `matcher_results`). La recepción en GA4 debe comprobarse después del despliegue. Estos clics pueden ayudar a medir continuidad; no prueban uso del ranking, un ahorro ni un alta. Para desglosar los parámetros en informes, comprobar también su disponibilidad como dimensiones personalizadas.

El evento existente `newsletter_signup` indica que la solicitud fue aceptada por el servidor. No equivale a una suscripción nueva ni a la confirmación por correo: una dirección ya registrada también puede recibir una respuesta de éxito. Las altas confirmadas atribuibles siguen pendientes de una medición específica.

## Mejoras del sitio preparadas en local

| Página | Cambio | Resultado buscado |
|---|---|---|
| Tarjetas | Título y descripción más claros; acceso temprano al ranking, al mapa y a la comparación con débito; enlace al mapa filtrado por banco en cada programa. | Facilitar que quien compara una tarjeta llegue a sus condiciones y descuentos. |
| Alquilar estando en clearing | Accesos a garantías y requisitos; siguiente paso hacia avisos de alquiler y alternativas sin recibo. | Dar continuidad a la búsqueda sin insinuar que los avisos aceptan solicitantes en clearing. |
| Ruidos molestos | Accesos a la plantilla, autoridad competente y respuesta visible sobre anonimato. | Acercar la respuesta concreta que busca la persona. |
| Multas y patente | Accesos a consulta, convenio y consecuencias de circular con deuda. | Resolver antes las consultas que están trayendo visitas. |

También se distinguen los parámetros de los eventos de navegación, búsqueda, recorrido y newsletter. El formulario conserva la página de origen aunque la persona navegue mientras espera la respuesta; los eventos no incluyen su correo ni sus respuestas personales.

Validación local: 95 pruebas automatizadas aprobadas; las cuatro páginas respondieron correctamente en navegador, con anclas y enlaces comprobados. Se verificaron las nuevas cabeceras de tarjetas y clearing en español, inglés y portugués, los eventos de navegación y 12 vistas de escritorio/móvil sin desbordes. Se revisaron el estilo del código y las diferencias. No se ejecutó un build completo estable que incluya este conjunto de cambios.

Estado de entrega: cambios locales, sin commit, despliegue ni publicaciones. Después del despliegue, comprobar las páginas públicas y la recepción de los eventos antes de lanzar las piezas. Evaluar el efecto SEO con ventanas completas de 28 días; los cambios no garantizan posiciones ni tráfico.

## Comprobaciones y fuentes

- El [comparador de tarjetas](https://cambio-uruguay.com/tarjetas-de-credito-uruguay) permite revisar las condiciones citadas en la primera pieza. Se verificó su contenido publicado el 4/9/2026; la campaña no reproduce importes, posiciones ni rendimientos.
- El [mapa de descuentos](https://cambio-uruguay.com/descuentos-con-tarjeta-uruguay) documenta la selección de tarjetas, combinación de bancos y búsqueda por cercanía. El filtro de categoría también se verificó en su código. Los dibujos son originales y no simulan ofertas reales.
- [Google Analytics: recoger datos de campañas con URL personalizadas](https://support.google.com/analytics/answer/10917952): se usan etiquetas externas distintas por pieza.
- Ambas imágenes: 1200 × 675 px, PNG para publicar y SVG para editar. Tipografía de sistema; colores basados en el azul y el fondo marino del sitio; sin marcas bancarias ni porcentajes promocionales.
- Se revisaron visualmente los dos PNG completos y la estructura de sus SVG. Los dos textos están por debajo de 280 caracteres con la URL contada como 23. Se verificaron las páginas base públicas y la sintaxis de los enlaces etiquetados; falta la comprobación de llegada y atribución de cada enlace en Analytics antes de publicar.
