# Monitoreo de errores de la app

La app utiliza el SDK existente `@sentry/nuxt` (lock: 11.1.0), con dos plugins propios: navegador y Nitro. No activa el módulo automático de Nuxt, instrumentación HTTP/Mongo, trazas, perfiles, logs, Replay ni seguimiento de sesiones. La inicialización ocurre cuando `runtimeConfig` está disponible; el proceso PM2 no necesita volver a cargar `.env`.

## Configuración

En `app/.env`, `SENTRY_DSN` es la dirección pública de ingreso de eventos del proyecto del propietario. No es un token administrativo. Nunca copiar `SENTRY_AUTH_TOKEN` a `runtimeConfig.public`.

- `SENTRY_ENABLED=0`: desactiva ambos plugins al construir.
- `SENTRY_ENVIRONMENT=production` (también admite `staging`, `development`, `test`).
- `SENTRY_RELEASE`: opcional; por defecto `cambio-uruguay-app@<SHA del checkout>`.
- Overrides en ejecución: `NUXT_SENTRY_DSN`, `NUXT_SENTRY_ENABLED`, `NUXT_SENTRY_ENVIRONMENT`, `NUXT_SENTRY_RELEASE` y sus equivalentes `NUXT_PUBLIC_SENTRY_*` para el navegador.

Sin un DSN válido no se inicializa el SDK. Desarrollo, tests, prerender y preflight de despliegue no envían eventos. La app lee únicamente su propia configuración; no importa archivos del backend.

Los mapas de código fuente permanecen deshabilitados. El monitoreo funciona con nombre del archivo compilado y línea/columna; no requiere token ni upload. Habilitar mapas en el futuro requiere una decisión explícita sobre upload privado y eliminación de los artefactos públicos.

## Qué llega al proyecto

Se capturan `vue:error`, `app:error`, errores globales del navegador, promesas no atendidas y el hook `error` de Nitro. Los HTTP 3xx/4xx esperados se omiten. Las rutas de búsqueda, mapa y presupuesto conservan la causa interna de sus 503; H3 mantiene el mensaje público genérico. Así, un error Mongo de memoria se clasifica como tal y conserva su stack original.

La proyección final permite únicamente fecha/ID del evento, clase del error, mensaje técnico conocido, hasta 40 frames por excepción (nombre compilado y línea/columna), release, entorno y etiquetas técnicas de app/runtime/categoría de ruta/método/status. Los mensajes arbitrarios se omiten porque pueden contener consultas, credenciales o información personal. Las rutas individuales se convierten en categorías y nunca conservan filtros, slugs de viviendas, IDs privados ni fragmentos.

No se envían usuarios, UID, email, IP como dato de evento, cookies, cabeceras, cuerpo HTTP, consultas Mongo, estados de Pinia, props de Vue, variables locales, código fuente, breadcrumbs, adjuntos ni datos de consola. Las integraciones se seleccionan con una lista permitida y `beforeSend` reconstruye el evento; nuevas integraciones no amplían automáticamente esta información. El servicio receptor necesariamente recibe la conexión de red, pero no se habilita la captura automática de IP del SDK.

La misma excepción se cuenta una vez aunque atraviese ambos hooks de Nuxt; errores independientes siguen siendo observables. No existe un endpoint público de prueba ni una ruta para generar errores a pedido.

Las solicitudes de imágenes sociales conservan el prefijo `/__og-image__/image`
o `/__og-image__/static` y sólo la categoría de la página subyacente, nunca su
slug o consultas. Los errores conocidos de extracción distinguen falta de HTML
y falta de metadatos OG. El buscador de direcciones tiene la categoría fija
`/api/rentals/geocode`, sin conservar la dirección ingresada.

## Verificación sin envíos externos

`sentryPrivacy.test.ts`, `sentryIntegration.test.ts` y `sentryBrowser.test.ts` prueban proyección, gates, deduplicación, los handlers reales del SDK en navegador, el hook Nitro y envelopes mediante un transporte en memoria. Un servidor H3 local confirma que la respuesta HTTP 503 no expone la causa ni el stack interno. Ninguna de estas pruebas envía eventos al proyecto del propietario.

Tras desplegar, confirmar la configuración efectiva y la recepción en el proyecto autorizado antes de afirmar que el monitoreo está activo. Un DSN configurado y una respuesta exitosa del ingest prueban transporte; consultar el evento en el proyecto confirma su disponibilidad para el operador.

Referencias oficiales: [SDK de Nuxt](https://docs.sentry.io/platforms/javascript/guides/nuxt/manual-setup/), [opciones y filtrado](https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/). Las opciones implementadas se verificaron contra la versión instalada (11.1.0): `sendDefaultPii`, `autoSessionTracking`, `registerEsmLoaderHooks` y `skipOpenTelemetrySetup` ya no existen; los reemplazan `dataCollection` (con `userInfo: false` el SDK declara `infer_ip: never`), `enableRuntimeChannelInjection: false` y `traceLifecycle: 'static'` (sin estos dos, el SDK registra hooks de carga de módulos y agrega `SpanStreaming` por fuera de la lista permitida). El filtro de URLs ajenas se llama `EventFilters` (antes `InboundFilters`): una lista permitida con el nombre viejo lo pierde en silencio. Y `@sentry/nuxt` ignora todo `Sentry.init()` posterior al primero en el mismo proceso.

## Qué se descarta en el navegador y qué se agrega (2026-10-05)

La revisión del 2026-10-05 encontró que casi todo lo abierto era inatribuible o ajeno. Desde entonces:

- **Rastreadores y automatización no inician el SDK** (`isAutomatedBrowser`: `navigator.webdriver` o un user agent de bot, headless o herramienta). Los 59 eventos de "JavaScript chunk failed to load" venían de bloques de Yandex, Bing, Baidu, Meta y Tencent Cloud. Un modelo de teléfono con "bot" en el nombre (CUBOT) no cuenta: hace falta `Nombre-bot/1.0`, `compatible; ...bot` o una URL `+http://`.
- **Un fallo de carga de chunk o CSS se verifica antes de reportarse**: `HEAD` sin caché al recurso que nombra el error. Sólo 404, 410 o 5xx se envían (con `asset_status`); un 200 o una falla de red es la conexión del visitante y se descarta. Safari no nombra el recurso y también se descarta.
- **Una página con un incidente no reporta sus consecuencias**: después de un recurso que no cargó o de un `insertBefore`/`removeChild` sobre un nodo que otro código movió, el árbol de Vue queda inconsistente hasta recargar; los errores siguientes de esa carga no se envían. Tope de 5 eventos por carga de página.
- **Código que el sitio no publica**: si el marco que lanzó es anónimo o evaluado (`<anonymous>:1:226`, lo que inyectan navegadores embebidos y extensiones) o un script de otro dominio, se descarta. Los scripts en línea del mismo origen siguen contando como propios. Un evento sin ningún marco y sin estado HTTP tampoco se envía: no dice ni dónde ni qué.
- **Etiquetas nuevas, todas con forma fija**: `error_code` (código de texto de la cadena de causas, p. ej. `ERR_HTTP_HEADERS_SENT`), `component` y `vue_hook` (nombre de archivo del componente y código de ciclo de vida de Vue, nunca props ni estado), `page` (nombre de ruta de Nuxt, armado con nombres de archivo de `pages/`), `browser` (familia y versión mayor) y `asset_status`.
- **Rechazos esperados en Nitro**: `RENTAL_ANALYSIS_UNAVAILABLE` (la foto semanal del análisis todavía no existe en un worker recién levantado) no se reporta; `RENTAL_ANALYSIS_STALE` sí, porque significa dos semanas de reconstrucciones fallidas.

Los mapas de código siguen sin subirse; la decisión de arriba no cambió.

## Fallas transitorias que se absorben (2026-10-07)

- **Comparativa de las fichas (`/api/property-insight/:item`, CAMBIO-URUGUAY-BACKEND-C)**: el 503 con causa `MongoServerError` `mongo_code: 50` (`MaxTimeMSExpired`) de las 14:20 UTC no fue un plan lento sino el `mongod` local trabado unos segundos: la agregación de vecinos tardó 9,2 s con sólo 4 yields contra su tope de 4 s, inserciones por `_id` de otra base tardaron 1,2 s en ese mismo segundo, y la misma consulta volvió en 171–213 ms un minuto después. La ficha ya ocultaba el bloque ante el 503. Ahora `cachedPropertyInsight` reintenta UNA vez ante `MaxTimeMSExpired` o un error de red de Mongo (`transientMongoFailure`), dentro de la misma lectura compartida por clave; si el reintento también falla, el 503 sale y se reporta como antes. Ese issue agrupa por título cualquier 503 con causa Mongo (los eventos de septiembre eran de `/api/rentals` y de una página): leer `route` y `mongo_code` antes de concluir que es el mismo problema.
- **Imágenes sociales que dependen de otro host (CAMBIO-URUGUAY-BACKEND-18)**: nuxt-og-image 5 reemplaza cada emoji del texto de la tarjeta por un SVG de `api.iconify.design` (`retry: 3`, sin tope de tiempo y sin `catch`). Un aviso de auto con 🛑 en el título respondió 500 cuando ese host no contestó (`og_source: 200`, `error_code: ETIMEDOUT`). Cuando la página se leyó bien (2xx) y el dibujo falla por un código de red en la cadena de causas (`ogImageNetworkFailure`), `og-image-page-status.ts` redirige con 302 y `cache-control: no-store` a la tarjeta estática (`/img/og-autos.png` para avisos de autos, `/img/og.png` para el resto) y no se reporta: un `console.warn` deja el rastro en el log de PM2. Cualquier otra falla del dibujo, y las vistas de depuración (svg/html/json), siguen siendo 500.

## Almacenamiento bloqueado al arrancar (2026-10-09)

- **CAMBIO-URUGUAY-BACKEND-17**: el plugin de cliente de `@vite-pwa/nuxt` leía `localStorage` al arrancar para su aviso de instalación (`client.installPrompt: true`). Con los datos del sitio bloqueados (Firefox y Chrome con "bloquear datos de sitios") ese acceso lanza `SecurityError`, y como el plugin es `parallel`, su rechazo aborta todo el arranque de Nuxt (`app:error`, sin `page` porque el router todavía no resolvió). El botón de instalación del sitio es `plugins/pwa-install.client.ts`, que no usa el aviso del módulo, así que `installPrompt` pasa a `false`: el módulo no toca el almacenamiento y deja de registrar un segundo `beforeinstallprompt`. `$pwa.getSWRegistration` sigue disponible para las notificaciones push. `tests/unit/pwa-install-storage.test.ts` corre el plugin real del módulo con el almacenamiento bloqueado.
- Los marcos sin mapa de código se ubicaron reconstruyendo el cliente del mismo commit: los nombres de chunk cambian entre builds (el build ID cambia los hashes), pero las posiciones línea:columna de la entrada coinciden, así que se busca el chunk de entrada por forma y se lee la columna.
