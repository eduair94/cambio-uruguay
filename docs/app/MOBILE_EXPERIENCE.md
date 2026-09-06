# Experiencia móvil y filtros

Revisión del 6 de septiembre de 2026 a partir de feedback de una primera visita: el chat, las invitaciones automáticas y los filtros ocupaban o bloqueaban la pantalla.

## Comportamiento

- Se retiró el chat global, su carga diferida, su precarga de dominios y la opción obsoleta de ocultarlo.
- No se abren invitaciones de instalación ni de redes sociales por tiempo, desplazamiento o interacción con otro control. La instalación es una acción opcional en el pie de página o después de crear una alerta. En iOS, esa acción muestra instrucciones dentro de la página.
- El recorrido guiado de la portada se inicia únicamente desde «Ver tour guiado». Aceptar cookies ya no dispara el tutorial unos segundos después ni bloquea otros controles.
- El consentimiento inicial de cookies ocupa espacio en el documento y se desplaza con él. Aceptar y rechazar tienen controles equivalentes. «Configurar cookies», en el pie, abre las preferencias por petición del usuario.
- Las donaciones forman parte del contenido de la portada; no hay tarjeta flotante.
- Alquileres, ventas y oportunidades tienen una barra móvil compacta debajo del encabezado. Permite volver a abrir los filtros al recorrer resultados. En alquileres y ventas también mantiene a mano el cambio entre lista y mapa.
- Los filtros abren un panel lateral. Ubicación y presupuesto quedan a mano; las opciones adicionales se pueden desplegar y se abren cuando contienen criterios activos. Los botones de aplicar y limpiar permanecen en el pie del panel. Los campos usan texto de 16 px y los controles principales tienen un área de al menos 44 px.
- Cerrar el panel cancela el borrador, conserva la búsqueda aplicada y devuelve el foco y el desplazamiento. Aplicar conserva los parámetros restantes de la búsqueda. Se mantiene el ajuste al área visible cuando cambia la altura del navegador.

## Regresiones que deben comprobarse

Las pruebas de primera visita usan un contexto nuevo, sin consentimiento, preferencias de promociones ni preferencias de donación precargadas. La interacción debe esperar hidratación mediante un gesto real, sin clics forzados.

Pruebas relevantes en `app/tests/e2e/`:

- `mobile-first-visit.spec.ts`: consentimiento en el flujo, acceso al filtro con la página desplazada, 85 segundos con el panel abierto, ausencia de promociones y un evento de instalación sintético que sólo se ejecuta al pulsar el botón.
- `mobile-property-filters.spec.ts`: alquileres, ventas y oportunidades en 320 y 390 px; presupuesto, cancelación, aplicación, foco, opciones adicionales, cambio a mapa y altura reducida.
- `consent.spec.ts`: aceptar, rechazar, persistencia y reapertura desde el pie.
- `global-chat-removed.spec.ts`: ausencia de solicitudes y elementos de chat después de interacción e inactividad, y donaciones dentro del documento.

La unidad `pwa-install.test.ts` prueba consumo único del evento, cancelación, instalación externa, modo independiente, instrucciones de iOS y limpieza de listeners. `noGlobalChat.test.ts` impide reintroducir la carga global de chat.

`siteTour.test.ts` ejecuta el setup real del recorrido con un visitante nuevo y 85 segundos simulados: no se importa ni se inicia el tutorial hasta solicitarlo. La prueba de portada en `global-chat-removed.spec.ts` comprueba además que sus capas no bloqueen las preferencias de cookies.

Las dimensiones emuladas y WebKit permiten detectar problemas de adaptación; no equivalen a probar cada teléfono físico ni a garantizar todas las versiones de navegador.
