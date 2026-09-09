import { defaultHtmlCacheControl, wantsHtmlCacheControl } from '../../utils/htmlCacheControl'

// Que TODA página HTML le pida al navegador revalidar, no sólo la home.
//
// EL ARREGLO DE SEPTIEMBRE LLEGÓ A UNA SOLA RUTA. `routeRules` declara
// `cache-control` para `/` y `/widget`; el resto del sitio —incluidas las 1.255
// páginas programáticas— salía sin ninguna cabecera de caché. Medido contra
// producción el 2026-09-09:
//
//   /                   public, max-age=0, must-revalidate, s-maxage=3600
//   /dolar-hoy          (sin cache-control)
//   /casas-de-cambio    (sin cache-control)
//   /alquileres-uruguay (sin cache-control)
//
// Sin cabecera nadie decide: el navegador aplica caché heurístico y un visitante
// que vuelve puede quedarse con el documento de un deploy anterior, que es el
// mismo daño de docs/app/LOADING_INCIDENT_2026-09-06.md — el HTML viejo nombra
// `_nuxt/<hash>.js` que ya no existen. El síntoma que lo destapó fue más leve:
// una corrección de maquetado desplegada y verificada en el origen que en el
// teléfono seguía viéndose vieja.
//
// SÓLO LA MITAD DEL NAVEGADOR. No se declara `s-maxage`, así que ninguna
// respuesta que hoy es DYNAMIC en el borde empieza a cachearse ahí: una página
// con la cookie `lang` guardada en el borde ya rompió el sitio una vez
// (`lang-cookie-cache.ts`). Y no se pisa a nadie: si `routeRules` ya declaró su
// propia cabecera, ésta no se toca.
//
// POR QUÉ EN EL ORIGEN Y NO EN CLOUDFLARE: por lo mismo que `canonical-host.ts`
// y `lang-cookie-cache.ts` — la configuración del borde no vive en el repo, y
// una regla que nadie puede leer en el diff es una regla que la próxima sesión
// no sabe que existe. La otra mitad (Browser Cache TTL en "Respect Existing
// Headers") sigue viviendo en el panel, y sin ella esta cabecera no llega.
export default defineEventHandler(event => {
  const method = event.method
  if (method !== 'GET' && method !== 'HEAD') return

  if (!wantsHtmlCacheControl(event.path || '/', getRequestHeader(event, 'accept'))) return

  const res = event.node?.res
  if (!res || typeof res.setHeader !== 'function') return
  // `routeRules` corre antes para las rutas que declaran cabecera propia; las
  // demás llegan acá sin nada y se las pone este middleware.
  if (res.getHeader('cache-control')) return

  res.setHeader('cache-control', defaultHtmlCacheControl)
})
