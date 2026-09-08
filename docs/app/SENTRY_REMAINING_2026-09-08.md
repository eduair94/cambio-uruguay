# Segunda revisión de incidencias abiertas en Sentry

Consulta posterior a los arreglos `a5a3ba9` y `07a13cf`: diez incidencias abiertas
en el proyecto `cambio-uruguay-backend` durante los últimos catorce días. Los
recuentos son los observados en esta revisión, no una medida en tiempo real.

## Histórico: M/Q y cascada N/P

| Incidencia | Eventos | Evidencia |
| --- | ---: | --- |
| [M](https://eduardo-vn.sentry.io/issues/7719873859/) | 2 | Release `07a13cf`, `BmcqEq6U.js:1:16167`: getter de `og:url`; `1:15755`: registro de los metadatos. |
| [Q](https://eduardo-vn.sentry.io/issues/7720000772/) | 3 | Release `b2a1bbb`, mismos puntos en `B9YBhYkO.js:1:16172` y `1:15760`. |
| [N](https://eduardo-vn.sentry.io/issues/7719873908/) | 2 | `ii6Ygg58.js:24:18384`, llamada a `entry.dispose()` durante el desmontaje de Unhead. |
| [P](https://eduardo-vn.sentry.io/issues/7720000741/) | 3 | Mismo desmontaje en `NwlzwXeJ.js:24:18384`. |

Los cuatro eventos pertenecen a la página de detalle de histórico. Unhead evalúa
los getters inmediatamente en el cliente, pero `historicalCanonical` se declaraba
después de `useSeoMeta`. Esto abortaba el registro; al desmontar la página,
Unhead intentaba disponer de una entrada inexistente. La corrección inicializa
la canónica antes de registrar los metadatos.

`historicoDetailHead.test.ts` ejecuta el setup real con Vue y Unhead instalados.
El código anterior reproduce primero el `ReferenceError` y después el
`TypeError` durante el desmontaje. El corregido pasa la lectura inmediata de
metadatos, variantes de tipo, actualización reactiva, SSR y montaje/desmontaje
con limpieza de los metadatos.

## Imágenes para compartir: incidencia 9

El octavo evento de [9](https://eduardo-vn.sentry.io/issues/7716551829/) ya conserva
el diagnóstico `OG image metadata missing from page` y la categoría
`/__og-image__/image/sucursales/:item`, en release `b2a1bbb`.

La validación real de sucursales devuelve 404 para una casa o departamento
inexistente. El extractor instalado de `nuxt-og-image` lee ese HTML sin
metadatos y lo convierte incorrectamente en 500. El plugin
`server/plugins/og-image-page-status.ts` observa la lectura que el módulo ya
hace, por evento y sin consultas adicionales. Sólo conserva 404/410 si esa
lectura confirma el estado y el error coincide con la extracción sin HTML o
sin metadatos. La conversión ocurre antes de la captura y respuesta de Nitro.

HTML con estado 200 pero sin metadatos, errores 5xx y otros fallos del generador
siguen visibles. Las pruebas ejercitan el validador de sucursales, el middleware
de validación de Nuxt, el extractor OG y HTTP H3 instalados, incluyendo
peticiones paralelas. El slug original continúa redactado: se demuestra el
fallo de esta familia de rutas, sin afirmar que se reconstruyó su URL exacta.

## Casos sin causa confirmada

- [D](https://eduardo-vn.sentry.io/issues/7717385629/): un desbordamiento de pila
  en sucursales, sin frames. El mapa real con Leaflet/markercluster, 528
  sucursales y 135 cambios de marcadores/resaltado no reprodujo errores.
- [E](https://eduardo-vn.sentry.io/issues/7717585410/): un error de navegador sin
  mensaje técnico ni frames que permitan atribuirlo.
- [H](https://eduardo-vn.sentry.io/issues/7718165648/): un fallo de carga de un
  módulo sin su nombre ni frames. Nuxt ya tiene recuperación mediante recarga;
  el nuevo despliegue mantiene la misma retención de tres días. Pasaron 23
  pruebas de retención y caché; una de symlinks se omitió en Windows. No se
  atribuye este evento a una causa concreta sólo por no repetirse.

[K](https://eduardo-vn.sentry.io/issues/7719782797/) tiene un evento en el bundle
`BR_MveoI.js` y requiere cotejo de su traza. [8](https://eduardo-vn.sentry.io/issues/7716291446/)
es el diagnóstico sintético antiguo `.sdd-sentry-diagnostic.cjs`, no una
funcionalidad pública.

## Validación previa a publicar

51 pruebas focalizadas aprobadas en ocho archivos; ESLint aprobado para los
cuatro archivos de implementación y pruebas modificados. Los casos sin causa
confirmada no se consideran arreglados ni se cierran por mera ausencia de
recurrencias. La actualización de estados se realiza después de comprobar el
despliegue, con la sesión autenticada de Sentry.
