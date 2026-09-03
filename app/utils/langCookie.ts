// El `Set-Cookie: lang=es` que dejaba todo el sitio sin caché de borde.
//
// MEDIDO EN PRODUCCIÓN el 2026-09-03, sobre la página de más impresiones del sitio (la home,
// 126.252 impresiones en 28 días):
//
//   GET /  sin cookie   → Set-Cookie: lang=es · cf-cache-status: BYPASS · TTFB 1,16 s
//   GET /  con cookie   → sin Set-Cookie      · cf-cache-status: HIT    · TTFB 0,12 s
//
// Diez veces. Cloudflare no cachea una respuesta que trae `Set-Cookie`, y @nuxtjs/i18n la manda
// justamente cuando la petición NO trae la cookie — que es el caso de Googlebot (nunca manda
// cookies) y el de toda primera visita. O sea: la regla de caché existe y funciona, y la estaban
// esquivando exactamente los dos visitantes que más importan.
//
// QUÉ SE SACA Y QUÉ NO. Sólo la cookie del idioma POR DEFECTO. Un visitante sin cookie se atiende
// en español igual, así que `lang=es` no lleva ninguna información: es la respuesta a una pregunta
// que ya tenía respuesta. `lang=en` y `lang=pt` sí dicen algo — que alguien eligió otro idioma — y
// esas pasan intactas, igual que cualquier otra cookie (sesión, tema, consentimiento). Una
// respuesta que trae una de esas sigue siendo BYPASS, que es lo correcto: es personal.
//
// PURE (sin h3, sin Nitro) para poder probarlo con las cadenas reales que manda el servidor.

/** El nombre de la cookie que escribe @nuxtjs/i18n (`detectBrowserLanguage.cookieKey`). */
export const LANG_COOKIE = 'lang'

/** El idioma por defecto del sitio (`i18n.defaultLocale`). */
export const DEFAULT_LOCALE = 'es'

/** True si esta cabecera `Set-Cookie` es la del idioma por defecto y nada más. */
export function isDefaultLangCookie(
  value: string,
  defaultLocale: string = DEFAULT_LOCALE
): boolean {
  const name = String(value || '')
    .split('=')[0]
    ?.trim()
    .toLowerCase()
  if (name !== LANG_COOKIE) return false
  const first = String(value).split(';')[0] ?? ''
  const assigned = first.slice(first.indexOf('=') + 1).trim()
  return assigned === defaultLocale
}

/**
 * Los valores de `Set-Cookie` que sí hay que mandar.
 *
 * Devuelve el mismo arreglo (por identidad) cuando no hay nada que sacar, para que el que llama
 * pueda no tocar la cabecera en el caso común y no reordene cookies ajenas sin necesidad.
 */
export function withoutDefaultLangCookie(
  values: readonly string[],
  defaultLocale: string = DEFAULT_LOCALE
): readonly string[] {
  if (!values.some(v => isDefaultLangCookie(v, defaultLocale))) return values
  return values.filter(v => !isDefaultLangCookie(v, defaultLocale))
}
