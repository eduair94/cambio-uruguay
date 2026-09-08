# Monitoreo de errores de la app

La app utiliza el SDK existente `@sentry/nuxt` (lock: 8.55.0), con dos plugins propios: navegador y Nitro. No activa el módulo automático de Nuxt, instrumentación HTTP/Mongo, trazas, perfiles, logs, Replay ni seguimiento de sesiones. La inicialización ocurre cuando `runtimeConfig` está disponible; el proceso PM2 no necesita volver a cargar `.env`.

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

Referencias oficiales: [SDK de Nuxt](https://docs.sentry.io/platforms/javascript/guides/nuxt/manual-setup/), [opciones y filtrado](https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/). Las opciones implementadas se verificaron contra la versión instalada: las opciones `dataCollection` de versiones recientes no existen en 8.55.0.
