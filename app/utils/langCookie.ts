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
// QUÉ SE SACA Y QUÉ NO. Sólo la cookie del idioma que la RUTA ya decide. En una ruta sin prefijo
// eso es `lang=es`: un visitante sin cookie se atiende en español igual, así que la cookie no lleva
// ninguna información — es la respuesta a una pregunta que ya tenía respuesta. Y en `/en/...` o
// `/pt/...` es exactamente lo mismo con `lang=en`/`lang=pt` (`redundantLangLocale`, abajo): con
// `strategy: 'prefix_except_default'` y el `redirectOn: 'root'` por defecto de @nuxtjs/i18n, una
// ruta con prefijo se renderiza en el idioma del prefijo sin mirar cookie ni Accept-Language, y el
// módulo escribe la cookie del idioma de la ruta INCONDICIONALMENTE (incluso cuando el idioma no
// cambió). Medido el 2026-09-22: `GET /en/guias` sin cookie → `Set-Cookie: lang=en` → BYPASS, en
// TODAS las páginas de /en y /pt. La cookie de otro idioma en una ruta SIN prefijo (`lang=en` en
// `/guias/x`) sí dice algo — que alguien eligió otro idioma — y esa pasa intacta, igual que
// cualquier otra cookie (sesión, tema, consentimiento). Una respuesta que trae una de esas sigue
// siendo BYPASS, que es lo correcto: es personal.
//
// Sacarla es seguro porque el cliente la vuelve a escribir: el plugin `route-locale-detect` de
// @nuxtjs/i18n es universal (corre también en el navegador) y `useCookie` de Nuxt materializa
// `lang=<idioma>` en `document.cookie` apenas hidrata. Lo único que pierde un visitante sin JS es
// que una visita posterior a `/` pelada no lo redirija a su idioma — el mismo trato que ya se
// aceptó para `lang=es`.
//
// PURE (sin h3, sin Nitro) para poder probarlo con las cadenas reales que manda el servidor.

/** El nombre de la cookie que escribe @nuxtjs/i18n (`detectBrowserLanguage.cookieKey`). */
export const LANG_COOKIE = 'lang'

/** El idioma por defecto del sitio (`i18n.defaultLocale`). */
export const DEFAULT_LOCALE = 'es'

/** Los idiomas que el router pone como prefijo de ruta (`strategy: 'prefix_except_default'`). */
export const PREFIXED_LOCALES = ['en', 'pt'] as const

/**
 * El idioma que la URL YA dice, y que por lo tanto la cookie no agrega.
 *
 * En `/en/guias/x` el prefijo decide el render sin mirar cookie ni Accept-Language
 * (`redirectOn: 'root'`), así que `Set-Cookie: lang=en` es la respuesta a una pregunta que la ruta
 * ya tenía contestada — lo mismo que `lang=es` en una ruta sin prefijo, que es lo que devuelve para
 * cualquier otra ruta.
 *
 * Se compara el PRIMER SEGMENTO, no un `startsWith`: `/entrar` y `/english-uruguay` empiezan con
 * "en" y no son inglés. Tolera query string y barra final, como `isBareRoute`.
 */
export function redundantLangLocale(path: string): string {
  const clean = String(path || '/').split('?')[0] ?? '/'
  const first = clean.split('/')[1] ?? ''
  return (PREFIXED_LOCALES as readonly string[]).includes(first) ? first : DEFAULT_LOCALE
}

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
 * `defaultLocale` es el idioma que la ruta ya decide (ver `redundantLangLocale`): en una ruta sin
 * prefijo, `es`; en `/en/...`, `en`. Devuelve el mismo arreglo (por identidad) cuando no hay nada
 * que sacar, para que el que llama pueda no tocar la cabecera en el caso común y no reordene
 * cookies ajenas sin necesidad.
 */
export function withoutDefaultLangCookie(
  values: readonly string[],
  defaultLocale: string = DEFAULT_LOCALE
): readonly string[] {
  if (!values.some(v => isDefaultLangCookie(v, defaultLocale))) return values
  return values.filter(v => !isDefaultLangCookie(v, defaultLocale))
}
