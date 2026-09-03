// Pure helpers for the embeddable rate-widget generator (`/herramientas/widget-dolar`).
//
// No Vue/Nuxt runtime so the generator page, the sitemap and unit tests share
// one source of truth for the iframe URL + snippet.
//
// EL WIDGET NO DA BACKLINKS, y este comentario decía lo contrario. Verificado: el snippet es un
// <iframe> puro, así que el sitio que lo incrusta no publica ningún <a> hacia acá; el enlace vive
// DENTRO de /widget, que se sirve desde cambio-uruguay.com y responde `noindex`. La arista del
// grafo es interna y apunta a una página que no se indexa: valor de enlace, cero.
//
// Lo que sí da es tráfico de referencia cuando alguien toca adentro del iframe — hoy medido en 7
// sesiones en 28 días, o sea casi nada, pero es real y es la única razón por la que existe.
//
// NO "ARREGLAR" ESTO agregando un <a> con texto rico al snippet. Eso es exactamente lo que Google
// prohibió en su comunicado de 2016 sobre enlaces en widgets: un enlace que el que incrusta no
// eligió poner es un enlace no editorial, y la sanción cae sobre quien lo distribuye.

export type WidgetTheme = 'dark' | 'light'

const DEFAULT_BASE = 'https://cambio-uruguay.com'
const MIN_WIDTH = 240
const MAX_WIDTH = 600
const MIN_HEIGHT = 120
const MAX_HEIGHT = 360

/** Normalize a theme to a known value (defaults to dark, matching the widget). */
export function normalizeTheme(theme: unknown): WidgetTheme {
  return theme === 'light' ? 'light' : 'dark'
}

export interface WidgetSrcOptions {
  theme?: WidgetTheme
  /** Origin to build the URL against; trailing slash is tolerated. */
  baseUrl?: string
}

/** The `/widget` iframe URL for the given theme. */
export function widgetSrc(opts: WidgetSrcOptions = {}): string {
  const base = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '')
  return `${base}/widget?theme=${normalizeTheme(opts.theme)}`
}

export interface WidgetEmbedOptions extends WidgetSrcOptions {
  /** Pixel width (clamped) or the literal string `'100%'` for responsive. */
  width?: number | '100%'
  /** Pixel height (clamped). */
  height?: number
  /** Accessible iframe title; escaped into the attribute. */
  title?: string
}

const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(n)))

/** Escape a string for safe inclusion inside a double-quoted HTML attribute. */
export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Build a ready-to-paste, responsive-friendly iframe embed snippet. */
export function buildWidgetEmbed(opts: WidgetEmbedOptions = {}): string {
  const src = widgetSrc(opts)
  const width =
    opts.width === '100%' ? '100%' : clamp(Number(opts.width ?? 320), MIN_WIDTH, MAX_WIDTH)
  const height = clamp(Number(opts.height ?? 170), MIN_HEIGHT, MAX_HEIGHT)
  const title = escapeAttr(opts.title ?? 'Cotización del dólar en Uruguay — Cambio Uruguay')
  const widthStyle = width === '100%' ? 'width:100%;max-width:420px;' : ''
  return (
    `<iframe src="${src}" width="${width}" height="${height}" ` +
    `title="${title}" loading="lazy" ` +
    `style="border:0;border-radius:12px;overflow:hidden;${widthStyle}"></iframe>`
  )
}
