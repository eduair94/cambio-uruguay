# Reportes comunitarios de disponibilidad

La advertencia «Posiblemente alquilado» recoge observaciones de usuarios sobre un anuncio. No confirma que la vivienda esté alquilada ni atribuye una conducta a la inmobiliaria. El anuncio, su ficha y el enlace original siguen accesibles.

## Identidad y cuentas

- Un reporte pertenece a `rent:<fuente>:<id propio del anuncio>`, nunca a la key de una agrupación ni al snapshot de oportunidades.
- Una cuenta recuperable de Firebase aporta como máximo un reporte activo por anuncio. El servidor verifica identidad, revocación y estado de la cuenta. Las sesiones anónimas no pueden contribuir.
- El público ve cantidad de cuentas y fecha del último reporte. No se publican UID, email, IP, nombres ni evidencia física privada.
- La colección `rentalavailabilityreports` vive en la base de la app y es independiente de la cosecha. Los trabajos del backend no la sobrescriben.
- La lectura resuelve el dueño actual del anuncio. Una agrupación ambigua o una contradicción física respecto de la observación original suspende su señal; ni precio ni fecha de lectura son prueba de una vivienda diferente.

## Vigencia y cambios

La señal es visible durante 30 días desde la observación explícita. Releer el portal, regenerar el índice o repetir una petición no prolonga ese plazo. El usuario puede retirar su reporte y volver a aportar una nueva observación posteriormente.

Las mutaciones usan la revisión obtenida del estado privado. Una petición retrasada no puede reactivar un reporte retirado ni retirar una observación más nueva. Una revisión obsoleta devuelve `409 report_changed`; el cliente recarga el estado sin reenviar automáticamente. La unicidad y los límites de altas se aplican en Mongo, además del bloqueo visual del botón.

## Búsquedas y alertas

El parámetro `availability` tiene tres valores:

| Valor | Comportamiento |
| --- | --- |
| `all` (predeterminado) | Mostrar todos los anuncios con sus advertencias. |
| `hide_multiple` | Ocultar anuncios con reportes activos de al menos dos cuentas. |
| `hide_any` | Ocultar anuncios con algún reporte activo. |

La exclusión actúa sobre **ofertas**, antes de elegir el precio, contar, construir facetas y paginar. Si otra publicación no reportada de la misma propiedad cumple la búsqueda, permanece visible con su propio precio. La lista y el mapa usan la misma etapa. La ficha canónica ignora los filtros del catálogo para conservar el acceso directo.

Oportunidades de alquiler consulta la señal del anuncio sujeto. El filtro no cambia comparables, medianas ni snapshots de comparación de precios. Ventas ignora este criterio.

Búsquedas guardadas, URLs y suscripciones conservan el criterio, no una fotografía de los reportes. Las alertas lo vuelven a evaluar antes de seleccionar candidatos, conservando la identidad histórica que evita anunciar un inmueble antiguo como nuevo cuando vence o se retira un reporte.

## Interfaz y verificación

Reportar es siempre una acción explícita. La sesión se solicita al intentar contribuir; navegar, filtrar y consultar enlaces no exige cuenta. En grupos con varias publicaciones se identifica el anuncio que se reporta. Las advertencias y filtros conservan los controles móviles compactos.

Las pruebas cubren normalización y persistencia de filtros, aislamiento por fuente/anuncio, cuentas, revisiones, retirada, caducidad, contradicciones y privacidad. `rentalsMongo.test.ts` ejecuta documentos sintéticos con `$documents` para comprobar exclusión, precio alternativo, facetas y paginación sin escribir en el catálogo. Las pruebas visuales usan reportes simulados claramente aislados; no se registran reportes ficticios contra inmuebles reales.
