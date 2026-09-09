// Qué se le dice al navegador sobre un documento HTML, y a qué peticiones.
//
// El middleware que lo usa (`server/middleware/html-cache-control.ts`) explica
// el porqué; acá vive sólo la decisión, separada para poder probarla sin
// levantar Nitro.

/**
 * Revalidar siempre, y NADA sobre cachés compartidas.
 *
 * `max-age=0, must-revalidate` es la mitad que le habla al navegador. La otra
 * mitad, `s-maxage`, se omite a propósito: agregarla acá haría edge-cacheable
 * una respuesta que hoy no lo es, y este sitio manda `Set-Cookie: lang` y
 * contenido por idioma en páginas que nunca se midieron para eso.
 */
export const defaultHtmlCacheControl = 'public, max-age=0, must-revalidate'

/** Prefijos que sirven datos o assets, no documentos: se dejan como están. */
const NON_DOCUMENT = /^\/(?:api|_nuxt|_ipx|_scalar|__nuxt|_vercel)(?:\/|$)/

/**
 * ¿Esta petición es la navegación a una página?
 *
 * Se mira el `Accept` en vez de la extensión porque las rutas de este sitio no
 * la tienen (`/dolar-hoy`, `/casa/brou`), y un navegador que navega siempre
 * pide `text/html`. Un `fetch()` de datos, una imagen o un script no.
 */
export function wantsHtmlCacheControl(path: string, accept: string | undefined): boolean {
  if (NON_DOCUMENT.test(path)) return false
  // Un archivo con extensión (sw.js, robots.txt, manifest.webmanifest) no es una
  // página aunque alguien lo abra desde la barra de direcciones. El rango llega
  // a 12 porque `.webmanifest` mide 11 y con {2,5} se colaba como documento.
  if (/\.[a-z0-9]{2,12}$/i.test(path)) return false
  return (accept || '').includes('text/html')
}
