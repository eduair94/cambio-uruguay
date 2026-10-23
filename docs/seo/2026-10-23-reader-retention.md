# Lectura, navegación y elección de banco — 23/10/2026

## Evidencia y alcance

Se consultaron GA4 y los snapshots privados del sitio, sin modificar colecciones ni ejecutar
sincronizaciones. Los datos crudos y la facturación quedan en `docs/seo/data/`, fuera de Git.
La propiedad informa en `America/Los_Angeles`: no se deben cerrar sus días con el reloj del VPS.

La comparación semanal uruguaya del 14–20/10 contra 7–13/10 ya mostraba una mejora de interacción
y de vistas por sesión. El deterioro del agregado mundial no describe por sí solo a los lectores
uruguayos. En la lectura de 28 días (24/9–21/10), la portada móvil también tenía buena continuidad.
No se rediseñó la portada ni se modificó la cantidad de anuncios por esa señal agregada.

Las guías aportan una proporción de ingresos mayor que su proporción de vistas; el rendimiento
medido por vista de esa familia era aproximadamente 3,5 veces el promedio del sitio. La muestra
por página es pequeña: eso justifica priorizar lectura y enlaces, no prometer un ingreso futuro.

La cola de contenido disponible ya estaba cubierta en gran medida por páginas publicadas y PRs
abiertos. Se añadió contenido útil a una página con visitas comprobadas, evitando otra URL que
compitiera con una guía existente. No se tocaron las reservas de casas, CyberLunes, temporada fiscal
ni trabajo doméstico.

## Cambios

- **Guías:** índice nativo después de la primera respuesta, anclas para secciones, pasos,
  preguntas y fuentes. El cierre prioriza los destinos que el autor eligió para esa guía y los
  recursos de su tema. Sustituye la invitación universal a comparar dólares que aparecía incluso
  en temas de familia, empleo o deudas. La publicidad editorial conserva su lugar después de la
  primera respuesta; no se agrega ninguna unidad.
- **Bancos:** los tres primeros resultados de la rúbrica se ven antes de los controles y abren
  sus fichas. Se mantiene el cálculo existente y la fecha de cada dato. Una orientación nueva
  distingue cuenta cotidiana, recepción desde el exterior y ahorro, con enlaces a las guías
  correspondientes y referencias del BCU y COPAB consultadas el 23/10. Es un piloto: sus 38
  entradas móviles uruguayas son una muestra orientativa, no una prueba causal de abandono.
- **Medición:** lectura con tiempo visible y desplazamiento real, navegación interna por ubicación
  y exposición de recomendaciones. No se emiten visitas sintéticas ni pulsos para alargar sesiones.
  Se preservan los controles de consentimiento y se omiten consultas, fragmentos y datos privados
  de estos eventos. Las rutas de guías se conservan sólo cuando pertenecen al catálogo editorial.
- **Informe repetible:** `npm run retention_report` compara dos ventanas completas de 28 días con
  totales independientes, país y dispositivo. Rechaza datos incompletos y guarda el JSON privado.
  El informe no solicita métricas de ingresos ni escribe en Mongo.

## Cómo evaluar

1. Anotar el despliegue efectivo. No atribuir a estos cambios el crecimiento observado antes.
2. Verificar en GA4 los eventos nuevos y registrar las dimensiones descritas en
   [ENGAGEMENT_MEASUREMENT.md](../analytics/ENGAGEMENT_MEASUREMENT.md). No marcarlos como eventos
   clave. La configuración de dimensiones no es retroactiva.
3. Comparar Uruguay móvil y escritorio por separado. Observar sesiones, rebote, vistas por sesión
   y segundos de interacción por sesión; no interpretar la duración del reloj como lectura.
4. Para recomendaciones, comparar exposición y navegación con el mismo `content_path` y
   `link_area`. Los clics por exposición no son un porcentaje de personas: alguien puede abrir
   varios enlaces. Para personas, usar usuarios distintos con el mismo alcance.
5. Separar un lector que obtuvo la respuesta y salió de una falla: lectura profunda con pocas
   páginas por sesión puede ser una visita útil. Una sección de enlaces que nadie vio requiere
   una decisión distinta de una sección visible que nadie eligió.
6. Revisar a los 28 días completos, con muestra por segmento. El registro de bancos mide la
   adquisición por Search Console; su éxito de retención se evalúa aparte en GA4. El cambio de
   plantilla universal no tiene una fila de porción de clics, porque no tiene control interno.

La ventana anterior de 28 días cruza el cambio de consentimiento de septiembre; no usarla para
afirmar causalidad. AdSense directo sigue siendo la fuente para confirmar ingresos de la cuenta:
la atribución vinculada de GA4 no la sustituye. No se modificaron ajustes de Auto Ads.

## Referencias

- [BCU: condiciones y costos de los depósitos](https://usuariofinanciero.bcu.gub.uy/depositos/derechos-y-obligaciones/)
- [BCU: tipos de depósitos](https://usuariofinanciero.bcu.gub.uy/depositos/tipos-de-depositos/)
- [COPAB: depósitos garantizados](https://www.copab.org.uy/innovaportal/v/78/1/web/que-depositos-estan-garantizados)
- [Google: sesiones y medición sin pulsos artificiales](https://developers.google.com/analytics/devguides/collection/ga4/sessions)
- [Google: próximos pasos claros para el lector](https://support.google.com/adsense/answer/2893021)
- [Operación del informe privado](../analytics/RETENTION_REPORT.md)
