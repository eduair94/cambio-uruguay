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

import {
  isClassicWidget,
  parseWidgetCurrencies,
  parseWidgetOrigin,
  type WidgetCurrency,
  type WidgetOrigin,
} from './widgetRates'

export type WidgetTheme = 'dark' | 'light'

const DEFAULT_BASE = 'https://cambio-uruguay.com'
const MIN_WIDTH = 240
const MAX_WIDTH = 600
const MIN_HEIGHT = 120
const MAX_HEIGHT = 360
/** Cabecera + encabezado de la tabla + pie con la fuente y el enlace, más los bordes. */
const TABLE_CHROME_PX = 144
const TABLE_ROW_PX = 37

/** Normalize a theme to a known value (defaults to dark, matching the widget). */
export function normalizeTheme(theme: unknown): WidgetTheme {
  return theme === 'light' ? 'light' : 'dark'
}

export interface WidgetSrcOptions {
  theme?: WidgetTheme
  /** Origin to build the URL against; trailing slash is tolerated. */
  baseUrl?: string
  /** Monedas a mostrar (por defecto, el dólar solo). */
  currencies?: readonly WidgetCurrency[]
  /** `mejor` (mejor precio del mercado, por defecto) o `brou` (pizarra del BROU). */
  origin?: WidgetOrigin
}

/**
 * The `/widget` iframe URL. The default widget (dollar only, best price) keeps the exact URL it
 * always had: `monedas` and `origen` only appear when they say something.
 */
export function widgetSrc(opts: WidgetSrcOptions = {}): string {
  const base = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '')
  const currencies = parseWidgetCurrencies((opts.currencies ?? []).join(','))
  const origin = parseWidgetOrigin(opts.origin)
  let url = `${base}/widget?theme=${normalizeTheme(opts.theme)}`
  if (!(currencies.length === 1 && currencies[0] === 'USD'))
    url += `&monedas=${currencies.join(',')}`
  if (origin !== 'mejor') url += `&origen=${origin}`
  return url
}

/**
 * Alto del iframe para que no quede ni cortado ni con aire: la tarjeta del dólar solo mide 170; la
 * tabla, la cabecera y el pie más una fila por moneda (el dólar del BROU trae además su eBROU).
 * Medido en el navegador a 320 y 420 px de ancho.
 */
export function widgetHeight(
  currencies: readonly WidgetCurrency[] = ['USD'],
  origin: WidgetOrigin = 'mejor'
): number {
  const picked = parseWidgetCurrencies(currencies.join(','))
  const where = parseWidgetOrigin(origin)
  if (isClassicWidget(picked, where)) return 170
  const rows = picked.length + (where === 'brou' && picked.includes('USD') ? 1 : 0)
  return clamp(TABLE_CHROME_PX + rows * TABLE_ROW_PX, MIN_HEIGHT, MAX_HEIGHT)
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

function defaultTitle(currencies?: readonly WidgetCurrency[]): string {
  const picked = parseWidgetCurrencies((currencies ?? []).join(','))
  return picked.length === 1 && picked[0] === 'USD'
    ? 'Cotización del dólar en Uruguay — Cambio Uruguay'
    : 'Cotizaciones del día en Uruguay — Cambio Uruguay'
}

/** Build a ready-to-paste, responsive-friendly iframe embed snippet. */
export function buildWidgetEmbed(opts: WidgetEmbedOptions = {}): string {
  const src = widgetSrc(opts)
  const width =
    opts.width === '100%' ? '100%' : clamp(Number(opts.width ?? 320), MIN_WIDTH, MAX_WIDTH)
  const height = clamp(
    Number(opts.height ?? widgetHeight(opts.currencies, opts.origin)),
    MIN_HEIGHT,
    MAX_HEIGHT
  )
  const title = escapeAttr(opts.title ?? defaultTitle(opts.currencies))
  const widthStyle = width === '100%' ? 'width:100%;max-width:420px;' : ''
  return (
    `<iframe src="${src}" width="${width}" height="${height}" ` +
    `title="${title}" loading="lazy" ` +
    `style="border:0;border-radius:12px;overflow:hidden;${widthStyle}"></iframe>`
  )
}
