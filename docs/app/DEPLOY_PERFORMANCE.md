# Rendimiento del despliegue

Medición inicial: [run 34254549010](https://github.com/eduair94/cambio-uruguay/actions/runs/34254549010),
commit `5089104`, 2026-09-08. El cambio modificaba únicamente el encabezado móvil de alquileres.

| Paso remoto | Duración observada |
| --- | ---: |
| Actualizar Git, incluyendo limpieza del lockfile | 138 s |
| Build Nuxt completo | 412 s |
| — cliente Vite | 157 s |
| — SSR Vite | 135 s |
| — bundle Nitro | 88 s |
| Verificación SSR del candidato | 4 s |
| Conservar assets del cliente anterior | 33 s |
| Recarga gradual PM2 | 11 s |
| Dos comprobaciones de salud | 18 s |

Las filas de cliente, SSR y Nitro forman parte del build completo. El tiempo restante del build
incluye preparación, assets públicos y PWA. La demora de Git apareció antes de su salida de fetch;
el log anterior no permite atribuirla con certeza a red, etiquetas o mantenimiento.

## Cambios

- CI usa los filtros de paquetes para ejecutar las pruebas pertinentes. Las comprobaciones que
  cruzan contratos entre paquetes también conservan sus dependencias. El escaneo de secretos
  sigue siendo obligatorio y un `workflow_dispatch` ejecuta ambas suites.
- Cada PR tiene su propia concurrencia: actualizarlo reemplaza sus comprobaciones anteriores.
  Los despliegues de producción siguen serializados, sin cancelar un swap o una recarga en curso.
- El backend reutiliza la caché de descargas npm, identificada por `package.json`. Se conserva
  `npm install`: esa caché no es un `node_modules` ni evita resolver las dependencias.
- `app/scripts/sync-deploy-source.sh` separa y mide limpieza de lockfile, fetch, resolución de SHA
  y merge. Fetch no sigue etiquetas ni ejecuta mantenimiento automático. El merge sigue siendo
  fast-forward y rechaza conflictos locales; no activa autostash ni resetea el árbol.
- `app/scripts/retain-client-assets.sh` conserva los assets inmutables anteriores mediante enlaces
  duros. Si el filesystem no lo permite, copia sólo los archivos que faltan. La eliminación de una
  generación anterior no elimina el archivo de la nueva generación.
- Las excepciones de compatibilidad se copian antes de crear enlaces, desvinculando cualquier
  destino previo. Esto evita modificar por accidente el contenido que aún sirve un worker viejo.
  Los archivos nuevos y de compatibilidad tienen prioridad sobre los históricos.
- Se conserva el plazo de tres días de los assets históricos (`-mtime +2` cuenta días completos).
  La elegibilidad se evalúa antes de conservarlos, evitando copiar archivos para borrarlos después.
- El script informa cuánto tardan limpieza, instalación, build, verificación SSR y retención.
  Las cifras del próximo despliegue permiten separar el ahorro de la variación de carga del VPS.
- Nuxt usa `features.inlineStyles: false`: con el `cssCodeSplit: false` existente, el HTML ya
  enlaza la hoja completa. Evita generar cientos de chunks de estilos para SSR y repetir CSS
  dentro del HTML. Se conserva la hoja externa, la configuración de Vuetify y el service worker.

## Comparación controlada del build

Dos copias limpias de `a5a3ba91ccd21cca53034f25a21d63f61eb87a7b`, con los 1.482 archivos de
fuente verificados contra Git y cachés separadas. La única diferencia fue `inlineStyles: false`.
Medición local en Windows/Node 24.15; producción usa Linux/Node 22. Una corrida por variante:
el porcentaje orienta, no garantiza el mismo ahorro en cada despliegue del VPS.

| Métrica | Antes | Después |
| --- | ---: | ---: |
| Build completo | 402,3 s | 363,4 s (−9,7 %) |
| Cliente Vite | 105,8 s | 96,6 s |
| SSR Vite | 58,2 s | 60,3 s |
| Bundle Nitro | 107,8 s | 85,8 s |
| Chunks de estilos del servidor | 934 | 1 |
| Archivos del output | 2.635 | 1.702 |
| HTML de alquileres | 277.497 bytes | 243.508 bytes |

La hoja enlazada mantuvo nombre, tamaño (1.762.338 bytes) y SHA-256 idénticos:
`98544eb0b0ba0bce200142a3a0a7f43003606f973ccdd08a1231bf28e491dfc9`.
`/acerca` y `/alquileres-uruguay` respondieron 200 y conservaron geometría, tipografía, colores
y ancho a 390 px sin JavaScript, sin assets fallidos ni desbordes. Ambas variantes sirvieron
`sw.js` con 200 y 19.811 bytes. Se mantienen los estilos dinámicos del tema de Vuetify.
Las capturas PNG de ambas rutas también resultaron idénticas byte por byte. La captura local
de alquileres usa un catálogo vacío: cubre cabecera, filtros y estado vacío.

## Garantías y comprobaciones

Se mantienen flock, build separado en `.output-next`, prueba SSR antes del swap, retención de la
generación anterior de chunks del servidor, recarga gradual, ambas pruebas de salud y limpieza
diferida. No se cambia la compresión que reciben los visitantes ni se acorta la retención para
acelerar una copia.

Pruebas de helpers: `deploySourceSync`, `clientAssetRetention`, `serverChunkRetention`,
`stagingReadiness`, `workerEntry` y `workerEntryConfig`. Cubren Git con repositorios temporales,
colisiones entre generaciones, inmutabilidad del origen, fallback de copia y rechazo de un
candidato que no renderiza SSR. La guarda de privacidad de ingresos también corre en la suite
del frontend para los cambios sólo de páginas. Validación local: 60 pruebas aprobadas (incluidas
las de actualización y caché PWA) y cuatro omisiones por plataforma; ESLint, Bash y actionlint
sin errores.

No activar `experimental.buildCache` como arreglo de una línea: en las versiones instaladas de
Nuxt y `@vite-pwa/nuxt`, un acierto de caché saltea la inicialización Vite del plugin PWA, por lo
que puede faltar el nuevo service worker. Conservar `.nuxt` tampoco habilita una caché incremental
de transformaciones en los builds de producción de Vite.

Referencias de comportamiento: [concurrencia de Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency),
[caché de setup-node](https://github.com/actions/setup-node#caching-global-packages-data) y
[Git fetch](https://git-scm.com/docs/git-fetch).
