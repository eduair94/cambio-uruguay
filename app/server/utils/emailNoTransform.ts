// Cloudflare "Email Address Obfuscation" reescribe cada email visible del HTML —`info@aduanas.gub.uy`
// pasa a `<a class="__cf_email__">[email protected]</a>`— y lo decodifica después con un script
// suyo. Vue hidrata contra el texto que renderizó y encuentra otro: "Hydration completed but
// contains mismatches" en 17 plantillas del sitio (medido 2026-09-19: /contacto, /privacidad,
// /franquicia-aduana-uruguay, /tarjetas-de-socio-uruguay…). Esas páginas ya publican el email a
// propósito, así que ocultarlo no protege nada y sí rompe la hidratación.
//
// `Cache-Control: no-transform` le dice al borde que no toque el cuerpo. Va sólo en las respuestas
// que muestran un email: con esa directiva Cloudflare tampoco recomprime, y el HTML viaja con el
// gzip del origen en vez de zstd. Medido el mismo día: la ofuscación es lo único que Cloudflare
// inyecta en el HTML del sitio (sin Rocket Loader, sin beacon, sin challenge).

// What Cloudflare obfuscates: an address in the text or in a `mailto:` link. Scripts and styles are
// left alone by the edge, and the Nuxt payload carries strings like a Sentry DSN (`key@o1.ingest…`)
// that must not mark every page; other attributes (`srcset="logo@2x.png"`) are not text either.
const EMAIL = /[\w.%+-]+@[a-z\d-]+(?:\.[a-z\d-]+)*\.[a-z]{2,}/i
const SCRIPT_OR_STYLE = /<(script|style)\b[\s\S]*?<\/\1>/gi

export function hasVisibleEmail(html: string): boolean {
  const markup = html.replace(SCRIPT_OR_STYLE, '')
  if (/href\s*=\s*["']?mailto:/i.test(markup)) return true
  return EMAIL.test(markup.replace(/<[^>]*>/g, ' '))
}

export function withNoTransform(
  cacheControl: string | number | readonly string[] | undefined
): string {
  const current = (
    Array.isArray(cacheControl) ? cacheControl.join(', ') : String(cacheControl ?? '')
  ).trim()
  if (/(?:^|,)\s*no-transform\s*(?:,|$)/i.test(current)) return current
  return current ? `${current}, no-transform` : 'no-transform'
}
