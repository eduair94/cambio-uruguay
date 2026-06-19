// Pure helpers for the embeddable rate-widget generator (`/herramientas/widget-dolar`).
//
// No Vue/Nuxt runtime so the generator page, the sitemap and unit tests share
// one source of truth for the iframe URL + snippet. The whole point of the
// widget is the backlink to cambio-uruguay.com it carries, so third-party sites
// that embed it link back (referral traffic + SEO).

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
