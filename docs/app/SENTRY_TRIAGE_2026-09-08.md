# Revisión de Sentry — 2026-09-08

Proyecto: `cambio-uruguay-backend`, que también recibe los errores de la app Nuxt.
Se revisaron las diez incidencias abiertas de este proyecto visibles en la ventana
de 14 días. Nueve son incidencias de producción y una es un diagnóstico sintético.
Los recuentos corresponden a la lectura, no a una consulta en tiempo real.

## Correcciones de esta revisión

| Incidencia | Eventos | Causa y corrección |
| --- | ---: | --- |
| [A](https://eduardo-vn.sentry.io/issues/7716570384/) | 37 | `/historico/:item`: el computed de cotizaciones lanzaba un 404 para una casa inexistente. Una evaluación posterior desde los metadatos terminaba leyendo `.filter()` sobre `undefined`. La validación sale del computed y ocurre antes de registrar esos metadatos. |
| [B](https://eduardo-vn.sentry.io/issues/7716831356/) | 1 | La comprobación periódica de actualizaciones PWA dejaba un rechazo sin manejar si fallaba `fetch()`. Un plugin propio conserva los 20 segundos y permite reintentar tras fallos de red; evita comprobaciones simultáneas y limpia el temporizador. |
| [F](https://eduardo-vn.sentry.io/issues/7717733387/) | 1 | Misma causa que B, en otra versión y página. Ambos eventos apuntan a la misma línea y columna del código compilado. |

La correspondencia de B/F se comprobó contra el artefacto local: línea 2253,
columna 57015 del bundle principal, dentro de `periodicSyncForUpdates` del módulo
PWA. La línea 46 corresponde al envoltorio del SDK. El callback original del
módulo instalado reproduce el rechazo de `fetch()` sin manejarlo.

## Correcciones ya existentes

| Incidencia | Eventos | Evidencia |
| --- | ---: | --- |
| [C](https://eduardo-vn.sentry.io/issues/7717207569/) | 2 | MongoDB agotaba la memoria del ordenamiento de `/api/rentals`. `3fae072` ya incorpora proyección y `allowDiskUse(true)`; la mediana reduce los documentos a precio antes de ordenar. Las pruebas unitarias y de índices pasaron. Las pruebas con Mongo real se omitieron al no haber una conexión de prueba configurada. |
| [G](https://eduardo-vn.sentry.io/issues/7717735033/) | 9 | El 503 procede de `geocode.get.mjs`. El último release afectado observado fue `fd86198`; la corrección IPv4 de `015de3c` es posterior y está en el checkout actual. Pasaron las pruebas de transporte, reintentos, límite de tiempo, diagnóstico y API. |

Esto confirma que los arreglos están en código y tienen pruebas; no certifica que
no puedan aparecer nuevos eventos después del despliegue.

## Pendientes de más evidencia

| Incidencia | Eventos | Conclusión |
| --- | ---: | --- |
| [9](https://eduardo-vn.sentry.io/issues/7716551829/) | 7 | La traza encaja con el extractor de `nuxt-og-image` al recibir contenido sin opciones OG. Se reprodujo localmente con HTML de error y una respuesta JSON; una página con el OG global pasa. La categoría `/other` impide saber qué entrada lo provocó. Se agrega clasificación técnica y categoría OG de la página subyacente, conservando la redacción de slugs y consultas. |
| [D](https://eduardo-vn.sentry.io/issues/7717385629/) | 1 | `Maximum call stack size exceeded` en `/sucursales/:item`, sin frames. La revisión del componente y el mapa no permite atribuir una recursión concreta. |
| [E](https://eduardo-vn.sentry.io/issues/7717585410/) | 1 | Error de navegador en `/other`, sin mensaje técnico reconocido ni frames. No permite una corrección fundada. |
| [H](https://eduardo-vn.sentry.io/issues/7718165648/) | 1 | Falló la carga de un módulo JavaScript en `/herramientas/:item`; no conserva el nombre del módulo ni frames. Ya existe retención de assets entre despliegues. No se puede distinguir red, caché o un asset ausente con este evento. |

[8](https://eduardo-vn.sentry.io/issues/7716291446/) es el evento del helper
`.sdd-sentry-diagnostic.cjs`; no corresponde a un fallo de una funcionalidad pública.

La fase inicial fue de lectura y pruebas locales, sin despliegues ni cambios de
estado. Las actuaciones posteriores y su verificación se detallan abajo.

## Nueva incidencia J y publicación de los arreglos

Una revisión posterior identificó [J](https://eduardo-vn.sentry.io/issues/7719357712/):
un evento del release `abc463fa5d8eba79846af86b96a0564646365d87`. El archivo público
`_tToGznX.js`, recuperado con HTTP 200, conserva exactamente el `fetch()` sin
captura del sondeo PWA en 2253:57015 y el wrapper de Sentry en 46:5945. Es la misma
causa de B/F y queda cubierta por el mismo plugin; no necesita un segundo arreglo.

Al aparecer J, las correcciones anteriores todavía estaban sin commit ni
despliegue, mientras otras versiones del sitio se habían publicado. A también
volvió a abrirse por un evento posterior. Marcar una incidencia «en la próxima
versión» no publica el código y una versión intermedia sin el arreglo puede
reabrirla. El paso pendiente es publicar juntos estos cambios de Sentry y
comprobar la versión servida antes de cerrar las recurrencias.

La validación previa a publicar estos arreglos ejecutó la suite completa de la
app: **6.420 pruebas aprobadas y 43 omitidas** (373 archivos aprobados, 5 omitidos).
ESLint también aprobó los ocho archivos de configuración, implementación y
pruebas incluidos en el cambio.

## Validación

- 50 pruebas focalizadas aprobadas: Sentry (22 de privacidad, 4 de integración,
  1 de navegador), PWA (6 de actualizaciones, 11 de caché) e histórico (5 de
  setup/metadatos y 1 de respuesta HTTP con el runtime instalado de Nuxt).
- 35 pruebas relacionadas de canónicas, cotizaciones y selección de fuente,
  18 de consultas/índices de alquileres y 42 de geocodificación aprobadas.
- ESLint aprobado para los archivos de código y pruebas modificados, incluida
  la configuración de Nuxt. Revisión independiente sin hallazgos bloqueantes.
- Sin build completo ni comprobación del release en producción. El test HTTP
  del histórico usa el renderer y el manejo de errores instalados de Nuxt,
  devuelve 404 y no inicia trabajos programados ni conexiones a bases de datos.

## Verificación posterior al despliegue

`a5a3ba91ccd21cca53034f25a21d63f61eb87a7b` se publicó mediante la corrida
[34255192837](https://github.com/eduair94/cambio-uruguay/actions/runs/34255192837),
con pruebas y despliegue satisfactorios. La respuesta pública con una consulta
de comprobación confirmó ese release; la portada sin consulta aún tenía una
copia CDN anterior (`s-maxage=3600`). El bundle servido `/_nuxt/sRS3vfup.js`
contiene el plugin corregido. Se extrajo únicamente ese plugin y se ejecutó con
red y temporizadores simulados: recupera un fallo de `fetch`, uno de `update`
y permite el siguiente intento; también limpia el intervalo y el hook. J quedó
marcada como resuelta después de esta comprobación.

La comprobación HTTP del histórico detectó un segundo problema: una casa
inexistente ya no causaba el TypeError original, pero devolvía un shell vacío con
HTTP 200. Los dos `onErrorCaptured` de `app.vue` devolvían `false`, bloqueando el
manejador de Nuxt. La prueba anterior usaba el root de Nuxt sin este componente
intermedio y por eso no detectaba el fallo. Se amplía con el `app.vue` real y se
retiran ambos manejadores redundantes para que Nuxt procese los errores y
conserve su estado HTTP. La prueba ampliada reprodujo el 200 antes del arreglo.
