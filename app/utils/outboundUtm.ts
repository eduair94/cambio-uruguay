// app/utils/outboundUtm.ts
// Enlaces salientes pagos (patrocinio, afiliación): la URL con su atribución y el host impreso.
//
// Dos reglas que comparten el banner de Con la tuya, la fila patrocinada de la home y los enlaces
// de afiliado, para que un enlace pago nunca salga sin ellas:
//   1. La atribución viaja en la URL (utm_*), no en un evento nuestro. `useTrack` documenta por
//      qué: `source`/`medium`/`campaign` son campos de ADQUISICIÓN del destino, y mezclarlos con
//      metadatos de interacción en GA4 contamina el informe de tráfico.
//   2. El host del destino se imprime al lado del enlace ("conlatuya.checkleaked.cc"): el lector
//      ve a dónde va ANTES de hacer clic, y un enlace que no puede mostrar su host no se publica.
//
// Módulo PURO (sin Vue/Nuxt).

export interface UtmParams {
  /** `banner`, `sponsored`, `affiliate`: el tipo de enlace pago. */
  medium: string
  /** Identificador estable de la campaña (el id del patrocinio o del afiliado). */
  campaign: string
  /** Dónde está el enlace en el sitio, p. ej. `home-after-rates` o `guias/cobrar-exterior`. */
  content?: string
}

/**
 * Agrega los utm_* a una URL respetando los parámetros que ya trae. Devuelve `''` si la URL no es
 * http(s): un `javascript:` o un `mailto:` no son destinos que un enlace pago pueda tener.
 */
export function withUtm(base: string, params: UtmParams): string {
  let url: URL
  try {
    url = new URL(base.trim())
  } catch {
    return ''
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
  url.searchParams.set('utm_source', 'cambio-uruguay')
  url.searchParams.set('utm_medium', params.medium)
  url.searchParams.set('utm_campaign', params.campaign)
  if (params.content) url.searchParams.set('utm_content', params.content)
  return url.toString()
}

/** `https://www.wise.com/x?y` → `wise.com`. `''` si no es una URL. */
export function hostnameOf(url: string): string {
  try {
    return new URL(url.trim()).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}
