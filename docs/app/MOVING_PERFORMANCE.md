# Carga móvil y saturación SSR — 2026-09-14

URL reportada: `/fletes-mudanzas-uruguay?servicio=freight&departamento=Montevideo`.

## Medición inicial

Chrome nuevo, caché vacía, viewport 390 × 844, CPU ×4, red de 1,6 Mbps y 150 ms
de latencia añadida. Es una simulación de laboratorio, no una medición de todos
los teléfonos. La captura privada guarda el trace y los tiempos de navegación.

| Métrica | Antes |
| --- | ---: |
| Respuesta inicial del servidor | 20,95 s |
| Primer contenido / elemento principal (h1) | 27,38 s |
| Fin de hidratación | 42,51 s |
| Trabajo bloqueante observado hasta terminar la captura | 14,22 s |
| Transferencia observada | 1,72 MB |
| CSS global transferido | 284.679 bytes |
| Elementos DOM | 3.924 |

La segunda navegación, sin limitación de CPU/red, devolvió **502 a los 75 s**.
No se hicieron solicitudes de reseñas durante la llegada: sólo se consultan
cuando se abre el perfil. El JSON del directorio comprimido ronda 27 KB; no era
la causa principal de los segundos de espera.

Antes de publicar, a las 14:47 UTC aproximadamente, se repitió la medición de la
versión anterior con el mismo perfil móvil. El pico de tráfico había cesado:
respuesta inicial 1,35 s, primer contenido 7,80 s, hidratación 23,16 s y 14,23 s
de trabajo bloqueante observado. Esta es la referencia para comparar el cambio
del navegador; no se atribuye al código la recuperación del pico anterior.

## Incidente compartido del servidor

Los dos workers de la app agotaban el heap de 512 MiB y terminaban con SIGABRT;
no alcanzaban el umbral de reinicio PM2 de 900 MiB. En aproximadamente dos minutos
sumaron seis y cinco reinicios. Uno alcanzó 504 MiB de heap usado y el indicador
PM2 «Active requests» marcaba 16; ese contador no demuestra por sí solo la cantidad
de solicitudes HTTP simultáneas. El proceso calentaba `/acerca` en unos 1,2 s antes de aceptar tráfico,
pero esa página llegó a tardar 55,6 s una vez bajo carga.

Una muestra agregada de mil solicitudes completadas, entre 14:08:58 y 14:14:24 UTC,
contenía 703 fichas de alquiler, 103 visitas a ventas y sólo seis al directorio
de fletes. No se guardaron IPs ni parámetros de visitantes en este documento.

Un proceso aislado con el mismo artefacto desplegado, producción, heap de 512 MiB
y trabajos programados desactivados respondió 200 a las 16 comprobaciones:

| Fase | Latencia observada | Heap después de GC |
| --- | ---: | ---: |
| Calentamiento de acerca | 1.262 ms | 76 MiB |
| Cuatro fichas secuenciales | 587–1.010 ms | 84 MiB |
| Fichas con concurrencia 2 | 1.073–1.436 ms | 82 MiB |
| Fichas con concurrencia 4 | 2.266–2.608 ms | 83 MiB |
| Acerca / fletes al finalizar | 441 / 496 ms | 84 MiB |

RSS máximo muestreado: 252 MiB. Esta prueba acotada no muestra retención creciente
en esas fichas; no descarta problemas en todas las rutas. Sí muestra que aumentar
la concurrencia de dos a cuatro duplica la espera sin mejorar apreciablemente
el rendimiento por worker. No se aumentó la memoria configurada.

## Cambios de carga del navegador

- CSS dividido por ruta: la llegada deja de descargar la hoja conjunta de todas
  las páginas. Se conserva `inlineStyles: false` y el orden de los estilos globales.
- El contenido del menú móvil se prepara al abrirlo por primera vez. Después
  permanece montado para conservar grupos abiertos y transiciones.
- Las fichas conservan su HTML SSR y se hidratan cuando se acercan al viewport.
  Los filtros, los precios con sus condiciones y los enlaces permanecen disponibles.

La comprobación requiere un build real: el servidor dev no permite comparar
transferencia y tiempos de producción. También debe verificar CSS sin JavaScript,
filtros compartidos, historial, precios, reseñas bajo demanda y menú móvil.

## Admisión de SSR inmobiliario

`server/entry.ts` envuelve el listener HTTP/HTTPS antes de entrar a Nuxt. Cada
worker admite dos renders de alquileres/ventas y hasta ocho solicitudes en espera,
con un máximo de cinco segundos de cola. Las variantes es/en/pt están incluidas.
Fletes, otras páginas, assets y APIs no usan esa cola; una API interna de un render
admitido no debe intentar adquirir de nuevo el mismo cupo.

El excedente responde 503 de texto, `Retry-After: 2` y `no-store`, sin crear una
página de error Vue. Un visitante que se va mientras espera sale de la cola.
Si se va durante un render, el cupo sigue ocupado hasta que termine el trabajo:
cerrar el socket no cancela las consultas ni la instancia Vue.

La liberación está en el `finally` de la promesa de `toNodeListener`, que incluye
el render de errores. El hook `afterResponse` de H3 puede omitirse cuando un error
ya fue manejado y no es un lugar suficiente para liberar cupos. Las pruebas usan
HTTP real y H3 para cubrir saturación, espera, ambas desconexiones y errores.

El build local completo necesita `NODE_OPTIONS=--max-old-space-size=8192`, como
el proceso de compilación del despliegue. El primer intento local agotó su límite
predeterminado de 4 GiB durante Nitro. Esto es independiente del presupuesto de
512 MiB de los workers de producción, que se conserva.

## Validación previa

- Build de producción local completo: correcto con el presupuesto de compilación.
- 23 comprobaciones de CSS/SSR/navegación: correctas; 32 hojas con HTTP 200 y MIME
  `text/css`, sin errores de hidratación ni recursos faltantes. Incluye nueve
  llegadas sin JavaScript, tres idiomas, menú móvil y una ruta con Leaflet.
- Ocho E2E del directorio: correctos. Se precisó el selector del campo Departamento
  para distinguirlo del listbox que comparte su etiqueta durante el cierre animado.
- Pruebas HTTP de admisión y readiness: 21 correctas.
- La revisión posterior del componente de reseñas encontró dos carreras: apertura
  nativa anterior a la hidratación y finalización tardía de una petición abortada.
  Se corrigieron con el estado del elemento `details` y la identidad del controlador.
  Dos pruebas compilan el SFC real y ejercitan esas secuencias en JSDOM; forman parte
  de las 60 pruebas correctas de reseñas, catálogo y filtros. Este último ajuste no
  altera estilos y se incluye en el build final de CI y su verificación pública.

## Medición en producción después del despliegue

Publicado en `54b1ad2e` mediante [CI 34857651508](https://github.com/eduair94/cambio-uruguay/actions/runs/34857651508),
completado correctamente el 2026-09-14 aproximadamente a las 14:56 UTC. La medición
de las 15:01 UTC usa la misma URL, caché vacía, conexión y CPU limitadas. La columna
anterior corresponde a la repetición de las 14:47 UTC, cuando el servidor ya se
había recuperado del pico de tráfico, antes de desplegar estos cambios.

| Métrica | Versión anterior sin saturación | Versión publicada |
| --- | ---: | ---: |
| Respuesta inicial del servidor | 1,35 s | 0,95 s |
| Primer contenido / elemento principal (h1) | 7,80 s | 5,64 s |
| Fin de hidratación de la página | 23,16 s | 13,32 s |
| Trabajo bloqueante observado hasta terminar la captura | 14,23 s | 5,11 s |
| Elementos DOM | 3.922 | 2.404 |
| CSS decodificado observado | 1.843.196 bytes | 894.634 bytes |
| Transferencia CSS observada por Resource Timing | 284.352 bytes | 144.117 bytes |
| Fichas presentes en el HTML inicial | 18 | 18 |

El contenido principal aparece un 28 % antes, la hidratación termina un 42 % antes
y el trabajo bloqueante observado baja un 64 %. Este último valor es la suma de
la porción superior a 50 ms de las tareas largas hasta terminar cada captura;
no se presenta como TBT de Lighthouse. La hidratación global no significa que las
18 fichas se hayan activado: las que siguen fuera de pantalla se activan al acercarse.

La transferencia total de esta captura aumentó de 1,76 a 1,96 MB porque los scripts
externos llegaron antes dentro de la ventana observada (0,20 frente a 0,46 MB).
La transferencia del propio sitio bajó de 1,56 a 1,50 MB. No se confunde la reducción
del CSS y del trabajo inicial con una reducción equivalente de todos los recursos.

A las 15:01 UTC ambos workers seguían con los mismos PID y contadores de reinicio
desde el despliegue, después de más de cinco minutos. Heap usado: 170 y 191 MiB.
Es una observación acotada bajo tráfico natural, no una prueba de carga ni una
garantía sobre futuros picos de tráfico.

La lectura de registros a las 15:03 UTC agregó 1.552 accesos completados desde las
14:56: 1.529 respuestas 200, ninguna 502 y dos 503. Las fichas de alquiler tuvieron
399 respuestas 200 y dos 503 cuyo tamaño de cuerpo coincide con el rechazo plano
del límite de admisión. Fletes respondió 200 en sus 19 accesos. Los procesos y
contadores de reinicio seguían iguales, sin salidas ni menciones OOM posteriores
al despliegue en el log del supervisor; heap de 231–247 MiB en esa muestra.

## Corrección detectada sólo detrás de Cloudflare

La primera ejecución pública de los ocho E2E pasó siete casos y detectó una
advertencia de hidratación al desplazarse hasta una ficha con correo. Cloudflare
reescribe ese texto como `__cf_email__`; su decoder restituye la dirección pero
deja separados los nodos de texto del separador y el correo. El VDOM esperaba
un único nodo y tenía que reconstruirlos al hidratar la ficha.

Se envolvieron el separador y el valor del contacto en un único `span`, que Vue
trata como contenido de texto del elemento. Conserva el mismo item flex y el
enlace `mailto:`. Una prueba con el SFC real, el HTML transformado y el decoder
público reprodujo tres advertencias en la versión anterior y ninguna con el
ajuste; la dirección quedó presente una sola vez y el enlace conservó su destino.
La regresión no se resuelve ocultando advertencias ni normalizando todo el DOM.

Este ajuste se publicó en `20056e04` mediante [CI 34860381926](https://github.com/eduair94/cambio-uruguay/actions/runs/34860381926),
que terminó correctamente aproximadamente a las 15:19 UTC. Los dos E2E públicos
de hidratación pasaron, incluido desplazamiento, correo único, enlace correcto,
apertura de reseñas y ausencia de advertencias de hidratación.

La repetición móvil sobre esa versión obtuvo respuesta inicial de 0,75 s,
contenido principal a los 6,16 s, hidratación a los 17,30 s y 8,31 s de trabajo
bloqueante observado. Las dos mediciones posteriores muestran variación: contenido
a los 5,64–6,16 s e hidratación a los 13,32–17,30 s, frente a 7,80 y 23,16 s en
la referencia anterior sin saturación. Se conservan ambas capturas; no se presenta
el mejor resultado como un tiempo garantizado para cualquier celular.

La prueba rápida de compartir detectó además una carrera anterior a este cambio:
escribir inmediatamente después de Limpiar podía perder el nuevo texto cuando
terminaba la navegación del reset. El watcher de URL cancelaba el debounce y
reponía el borrador vacío. Esperar más en la prueba habría ocultado la pérdida;
se corrige la coordinación entre la navegación propia y los borradores posteriores,
conservando la restauración de estado al usar Atrás y Adelante.

La página registra la revisión del borrador al despachar una navegación propia y
mantiene ese registro hasta que Nuxt expone su URL, incluso si `router.push` ya
resolvió. Un borrador posterior se confirma contra los filtros recién aplicados.
Si una navegación falla, sólo un borrador posterior habilita otro intento; no se
reintenta indefinidamente el mismo texto rechazado. Seis pruebas del script SFC
real controlan ambos momentos y los cambios de historial. Lint correcto y 23
pruebas específicas correctas, junto con las de query/sort y ciclo de reseñas.
El E2E rápido se conserva sin introducir una espera que oculte la carrera.
