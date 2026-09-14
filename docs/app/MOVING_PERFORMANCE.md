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

## Incidente compartido del servidor

Los dos workers de la app agotaban el heap de 512 MiB y terminaban con SIGABRT;
no alcanzaban el umbral de reinicio PM2 de 900 MiB. En aproximadamente dos minutos
sumaron seis y cinco reinicios. Uno alcanzó 504 MiB de heap usado y 16 solicitudes
activas. El proceso calentaba `/acerca` en unos 1,2 s antes de aceptar tráfico,
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
