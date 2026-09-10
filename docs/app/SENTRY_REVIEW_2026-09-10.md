# Tercera revisión de Sentry — 2026-09-10

Consulta `is:unresolved`, todos los entornos, últimos catorce días, en el proyecto
`cambio-uruguay-backend`. Doce incidencias son de este sitio; las otras cuatro de
la lista pertenecen a otros proyectos del mismo panel (`SHELLIX-*`) y no se tocan.
Los recuentos son los de esta lectura, no una medida en tiempo real.

## Lo que la lectura dejó claro antes que cualquier arreglo

Tres de las doce no se pueden atribuir con lo que el evento conserva, y no por
falta de datos del origen sino por cómo se los proyecta:

- **`/other` era la ruta más frecuente.** La categoría sólo reconocía 13 familias
  de API contra las **139 rutas** que existen en `server/api`: todo lo demás
  —`/api/branches`, `/api/property-nearby`, `/api/agencies`— caía en `/other`.
  Dos `MongoServerError` (la incidencia C, la última hoy 09:04 UTC) llegaron así:
  se sabe que Mongo falló y no en qué endpoint.
- **Un 503 sin `cause` no dice nada.** `X` son 6 eventos de
  `/api/property-sales/ficha/:key` entre las 06:03:58 y las 06:05:06 de hoy, y el
  stack termina en `_key_.get.mjs:65:11`, que es exactamente el `createError(503)`
  del `catch`. Siete rutas ya adjuntaban `cause`; seis no, y ésta era una.
- **El mensaje de Mongo se retiene entero, con razón** (puede citar la consulta),
  así que sólo se reconocía "Sort exceeded memory limit". Cualquier otro fallo del
  driver aparece como `HTTP 503 error`.

## Cambios de esta revisión

| Qué | Por qué |
| --- | --- |
| Categoría genérica `/api/<segmento>` (+ `/:item` si hay más) | El primer segmento bajo `/api` es un directorio de `server/api` —ninguno es dinámico a esa profundidad— así que nombra el endpoint sin nombrar al visitante. Las páginas siguen con lista explícita: ahí el primer segmento es lo que el visitante o un rastreador hayan escrito. |
| `cause: error` en los seis 503 que no lo tenían | `property-sales` (ficha, índice, mapa), `property-opportunities`, `rentals` (ficha, propiedad). La respuesta pública sigue siendo genérica; lo verificado en `sentryIntegration.test.ts` es que el JSON HTTP no expone la causa ni el stack. |
| Etiqueta `mongo_code` | El código numérico del driver (292 = orden sobre el límite de memoria, 50 = límite de tiempo) es un enumerado fijo: dice qué falló sin decir sobre qué. Se lee de toda la cadena de `cause`, con tope de profundidad y detección de ciclos. |
| Etiqueta `og_source` | Ver abajo: es instrumentación, no un arreglo. |
| `allowDiskUse(true)` en los dos ordenamientos de ventas | Preventivo y declarado como tal. |
| `denyUrls` de terceros en el navegador | Ver abajo. |

Las dos etiquetas nuevas pasan por el mismo allowlist que todo lo demás: se
descartan si no coinciden con su forma (`^\d{1,6}$` y `^(?:[1-5]\d{2}|unobserved)$`).

## Incidencia 9: no se reprodujo, así que se instrumentó

`9` sigue abierta con 12 eventos, el último hoy a las 15:04 UTC en el release
vigente, ruta `/__og-image__/image/sucursales/:item`. La corrección anterior
convierte el 500 del extractor en 404/410 **cuando la lectura de la página que el
propio módulo hace confirma ese estado**; estos eventos no cumplen esa condición.

Se intentó reproducir contra producción y no se logró: 198 URLs de sucursales
(45 casas y 153 pares casa/departamento), la grafía del sitemap con
`encodeURIComponent` (`cerro%20largo`, `paysand%C3%BA`), prefijos `/en` y `/pt`,
barra final, mayúsculas y departamentos inventados. Todo respondió 200 con su
tarjeta, o 404 en ambos lados —página e imagen— que es la conversión funcionando.

Dos hallazgos colaterales de ese barrido, ninguno es la incidencia:

- Seis casas que `/api/branches` todavía lista con sucursales —`aspen`,
  `cambio_pampex`, `cambio_sicurezza`, `cambio_velso`, `cambio_vexel`,
  `mas_cambio`— no están en `casas`, así que su página responde 404. Es
  coherente con las seis claves comentadas en `origins.ts`, pero significa que el
  directorio publica sucursales de casas cuya página no existe.
- Con 8 y 12 peticiones en paralelo, la imagen tarda entre 3 y 10 segundos y seis
  devolvieron 502 del borde; en serie las mismas responden 200 en 2,5-2,9 s.

Como la causa no se puede afirmar, el evento pasa a llevar el estado que vio la
lectura de la página del propio módulo: `200` (la página respondió bien y perdió
su tarjeta, que es un fallo real de esa página) o `unobserved` (la lectura nunca
resolvió). Es la diferencia entre dos causas que el error solo no distingue. No
se cierra la incidencia por esto.

## Lo que ya estaba arreglado y no necesita código

- **F** (2 eventos, `/alquileres-uruguay`): `BTI0eiS2.js:2253:57015` es el sondeo
  de actualización del módulo PWA, el mismo punto que B/F/J/K. Su release
  `bc6b0ce` es del 2026-09-07 y **no** contiene `a5a3ba9`, que es el arreglo. El
  último evento (09-09 23:47) viene de un navegador que seguía con el bundle
  viejo.
- **R** y **H** (10 eventos, 10 personas, "JavaScript chunk failed to load"):
  es la secuela de que las páginas salieran sin `cache-control`, corregido el
  2026-09-09 por `c820e889`; los eventos posteriores son clientes con el HTML ya
  guardado por heurística del navegador. Un fallo de chunk en la misma dirección
  se recupera con `location.reload()`, que revalida el documento.

## Sin causa confirmada, siguen abiertas

- **D**: `Maximum call stack size exceeded` en `/sucursales/:item`, un evento del
  2026-09-07, sin marcos.
- **E**: cuatro eventos sin mensaje reconocido ni marcos.
- **W**: `200.js:1:1442`, un archivo que no existe en este sitio (los propios
  llevan hash). Tres eventos de una persona en un minuto.
- **T** y **S**: `ReferenceError` cuyo marco útil es `<anonymous>:1:226`. El otro
  marco es el envoltorio del SDK dentro de nuestro bundle, así que `denyUrls` no
  los alcanza y se dejan visibles.

**V** sí se silencia: su stack es entero de `adsbygoogle.js`. Se agregan
`denyUrls` para googlesyndication, doubleclick, adsbygoogle y los protocolos de
extensión del navegador: es código de terceros que la página incrusta y ningún
cambio de acá lo corrige.

## Validación

`allowDiskUse` no se justifica con un fallo observado en ventas sino con el mismo
fallo observado en su gemela: `/api/rentals` agotó el límite de 100 MiB de Mongo
ordenando con esta misma forma —el `$project` corre **después** del `$sort`, así
que cada aviso cruza el orden entero— y hoy son 12.320 avisos de venta contra
55.861 de alquiler. Es una guarda, no un diagnóstico. La reordenación del
`$project` antes del `$sort`, que es la corrección de fondo que se aplicó en
alquileres, exige arrastrar `_displayPrice`, `_area` y `_freshAt` por la
proyección; sin medirlo se arriesga un orden silenciosamente equivocado.

- Suite completa de la app: **6.698 pruebas aprobadas, 44 omitidas** (397
  archivos aprobados, 5 omitidos).
- Las pruebas nuevas se comprobaron en rojo antes del cambio: sin el registro del
  estado, `ogImagePageStatus.test.ts` falla; sin las etiquetas, fallan las tres
  de `sentryPrivacy.test.ts`.
- La prueba del ciclo de vida de Nitro ejercita el plugin real con el transporte
  del SDK y verifica que el sobre no contenga la clave del aviso, ni la casa, ni
  el departamento.
- ESLint aprobado en los trece archivos modificados.

Queda pendiente comprobar en producción el release desplegado y volver a leer las
incidencias; ninguna se cierra en Sentry por este cambio.
