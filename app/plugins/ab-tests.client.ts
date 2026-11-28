// Los brazos de los experimentos A/B (utils/abTests.ts) ya están marcados en <html> por el script
// del <head>. Esto sólo los anota en GA4 como propiedades de usuario, así cualquier informe
// (sesiones, interacción, páginas por sesión, eventos) se puede partir por brazo. Ver
// docs/analytics/AB_TESTS.md.
//
// Corre ANTES de `gtag-init.client.ts` (orden alfabético de plugins/): el `set` queda en
// `dataLayer` antes del `config`, así el primer page_view ya lleva el brazo. `gtag` de nuxt-gtag
// no empuja si `dataLayer` no existe todavía, por eso se empuja a mano, con el mismo `arguments`
// que usa gtag.js. Sin marcas (servidor, programas, almacenamiento bloqueado, fuera de fecha) no
// hace nada. Las etiquetas de Clarity salen de services/clarityRuntime.ts.
import { abAssignments, abProperties } from '~/utils/abTests'

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return
  const properties = abProperties(abAssignments())
  if (!Object.keys(properties).length) return
  const w = window as unknown as { dataLayer?: unknown[] }
  w.dataLayer = w.dataLayer || []
  const layer = w.dataLayer
  function gtagSet(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    layer.push(arguments)
  }
  gtagSet('set', 'user_properties', properties)
})
