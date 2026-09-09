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
  atribuye este evento a una causa concreta sólo por no repetirse. La consulta
  final mostró un segundo evento a las 22:42:23 UTC en release `c4dd0d5`, ruta
  `/sucursales`: tampoco conserva nombre del archivo ni frames. Ese evento
  es anterior a la finalización del despliegue `adda48a` y no demuestra que
  éste corrija el fallo de carga.

[K](https://eduardo-vn.sentry.io/issues/7719782797/) corresponde a la petición
periódica de actualización PWA sin manejo del fallo de red: se cotejó
`BR_MveoI.js:2253:57015` de release `6666116`. La corrección `a5a3ba9` ya cubre
ese caso y se confirmó su recuperación en el bundle desplegado. Se marcó como
resuelta. [8](https://eduardo-vn.sentry.io/issues/7716291446/) es el diagnóstico
sintético antiguo `.sdd-sentry-diagnostic.cjs`, no una funcionalidad pública;
también se cerró, identificándolo como prueba.

## Validación previa a publicar

51 pruebas focalizadas aprobadas en ocho archivos; ESLint aprobado para los
cuatro archivos de implementación y pruebas modificados. Los casos sin causa
confirmada no se consideran arreglados ni se cierran por mera ausencia de
recurrencias. La actualización de estados se realiza después de comprobar el
despliegue, con la sesión autenticada de Sentry.

## Comprobación en producción

El [despliegue 34286922303](https://github.com/eduair94/cambio-uruguay/actions/runs/34286922303)
finalizó correctamente para `adda48ab69b795288702c9155469c755595ef0c3`. A las
22:48:49 UTC se confirmó esa release en los recursos servidos en producción,
la recuperación PWA y su limpieza de temporizadores. El histórico válido
respondió 200; el origen inexistente y su imagen OG, 404. La imagen OG de una
casa válida respondió 200 con contenido PNG.

El navegador real cargó el detalle de BROU con título, canónica y `og:url`
correctos y sin los `ReferenceError`/`TypeError` reparados. Apareció un aviso
genérico de discrepancia de hidratación sin identificar el elemento. Las
fechas y el rango visibles coinciden con el HTML del servidor; no se atribuye
ese aviso a una causa confirmada ni se considera corregido.

Tras estas verificaciones, Sentry confirmó individualmente el estado
`Resolved` de M, Q, N, P y 9. Junto con K y la prueba 8, son siete incidencias
cerradas en esta revisión; D, E y H permanecen abiertas por falta de evidencia
para confirmar una corrección.
La consulta final `is:unresolved`, todos los entornos y últimos catorce días,
mostró exactamente esas tres incidencias.

## Reaparición de 9 en fichas con foto (2026-09-09 00:11 UTC)

El evento `ad581932` de release `371ee2d` pertenece a
`/__og-image__/image/alquileres/:item`. Es otro caso del mismo mensaje: una
ficha válida publica su foto original en `og:image`, pero omitía por completo
`defineOgImageComponent` cuando tenía foto. La corrección de prioridades en
`0da2b16` agregó `defineOgImage(false)` para retirar la tarjeta de la raíz;
eso también retiró su payload. Su antigua URL de tarjeta generada
queda sin el payload que requiere el extractor. Se reprodujo en producción
con `/alquileres/artigas-apartamento-17im6g2`: ficha 200, foto original presente,
sin `nuxt-og-image-options`, tarjeta generada 500. El identificador del evento
está redactado; se reproduce la condición en una ficha pública equivalente.

La página ahora registra siempre los datos de la tarjeta. Sus metadatos de
foto tienen la misma prioridad que los del módulo y se registran después,
conservando la foto original como única imagen social. Se anulan el tipo y
las dimensiones de la tarjeta cuando hay foto, porque no describen la imagen
del anunciante. Sin foto se conserva la tarjeta con sus dimensiones reales.
`rentalOgPreview.test.ts` ejecuta los bloques reales de metadatos de la raíz y
la página con Unhead y los composables instalados de nuxt-og-image en ambos
casos, y reproduce la pérdida de payload al retirar la tarjeta de la raíz.
La guarda anterior de 404/410 permanece intacta; no se filtra el error 500.
