// Cuándo la respuesta de mensajes de vue-i18n se puede guardar para siempre.
//
// El navegador pide `/_i18n/<versión>/<hash>/<idioma>/messages.json` en CADA carga, antes de
// hidratar. La `<versión>` es un hash del contenido de los mensajes (`i18n/messagesVersion.ts`), así
// que esa URL nunca cambia de contenido: `immutable` y un año, en el navegador y en Cloudflare.
//
// La forma de la ruta se exige ENTERA, con su versión de 12 hexadecimales. Si un día el módulo deja
// de leer `serverRoutePrefix` y vuelve a `/_i18n/<hash>/<idioma>/messages.json`, esa URL no coincide
// y sale con la cabecera corta de siempre: el modo de fallar es "sin caché", no "mensajes viejos".

/** Un año: la URL lleva el hash del contenido. */
export const I18N_MESSAGES_CACHE_CONTROL = 'public, max-age=31536000, immutable'

const VERSIONED_MESSAGES_PATH = /^\/_i18n\/[0-9a-f]{12}\/[^/?#]+\/([^/?#]+)\/messages\.json(?:\?|$)/

/** ¿Es la ruta versionada de mensajes? Devuelve el idioma, o null. */
export function versionedMessagesLocale(path: string): string | null {
  return VERSIONED_MESSAGES_PATH.exec(path)?.[1] ?? null
}

/** `/_i18n/<algo>/<idioma>/messages.json` de CUALQUIER versión: el idioma, o null. */
export function anyMessagesLocale(path: string): string | null {
  const segments = (path.split(/[?#]/, 1)[0] ?? '').split('/')
  // ['', '_i18n', <uno o más segmentos>, '<idioma>', 'messages.json']
  if (segments.length < 5 || segments[1] !== '_i18n' || segments.at(-1) !== 'messages.json') {
    return null
  }
  return segments.at(-2) || null
}

/** La ruta vigente de los mensajes de un idioma. El segmento del hash del módulo no se valida: va fijo. */
export function currentMessagesPath(version: string, locale: string): string {
  return `/_i18n/${version}/0/${locale}/messages.json`
}
