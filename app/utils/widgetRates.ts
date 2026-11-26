// Lo que publica el widget embebible (/widget): una o varias monedas, del mejor precio del mercado
// o de la pizarra del BROU.
//
// Por qué estas dos fuentes y no más: son las dos que piden los sitios que ya muestran nuestros
// datos. ElTemaDeHoy publica «Dólar hoy» con el mejor precio; Diario NORTE arma a mano un recuadro
// «Cotización del día» con la pizarra del BROU (dólar, dólar eBROU, peso argentino, real y euro).
// Una casa puntual no se ofrece: el widget lo pega un tercero que no la elige con criterio, y una
// pizarra que se congela (ver classes/frozen_marks.ts) quedaría publicada en su sitio sin aviso.
//
// PURO (sin Vue/Nuxt): lo comparten la ruta de Nitro, la página del widget, el generador y los tests.
import { bestPair, type OgRatePair } from './ogRate'

export const WIDGET_CURRENCIES = ['USD', 'EUR', 'BRL', 'ARS'] as const
export type WidgetCurrency = (typeof WIDGET_CURRENCIES)[number]

export const WIDGET_ORIGINS = ['mejor', 'brou'] as const
export type WidgetOrigin = (typeof WIDGET_ORIGINS)[number]

/** Una fila del widget. `ebrou` es el dólar de la app del BROU, que sólo existe en su pizarra. */
export type WidgetRowKey = WidgetCurrency | 'EBROU'

export interface WidgetRow {
  key: WidgetRowKey
  buy: number | null
  sell: number | null
}

/** Lo que devuelve `/api/widget-rates`: las dos fuentes resueltas de una vez (una sola clave de caché). */
export interface WidgetRatesPayload {
  mejor: Record<WidgetCurrency, OgRatePair>
  brou: Record<WidgetRowKey, OgRatePair>
  /** ISO de cuando se armó (la caché de la ruta es de 10 minutos). */
  at: string
}

interface Quote {
  origin?: string
  code?: string
  type?: string
  buy?: number | null
  sell?: number | null
}

const EMPTY: OgRatePair = { buy: null, sell: null }

const price = (n: unknown): number | null =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null

function brouPair(rates: readonly Quote[], code: string, type: string): OgRatePair {
  const row = rates.find(r => r.origin === 'brou' && r.code === code && (r.type ?? '') === type)
  return row ? { buy: price(row.buy), sell: price(row.sell) } : EMPTY
}

export function buildWidgetRates(
  rates: readonly Quote[],
  now: Date = new Date()
): WidgetRatesPayload {
  // Última guarda: el widget se publica en sitios ajenos, así que un par imposible (compra ≥ venta)
  // sale como "—" antes que como un precio que ningún mostrador da.
  const coherent = (p: OgRatePair): OgRatePair =>
    p.buy !== null && p.sell !== null && p.buy >= p.sell ? EMPTY : p
  const mejor = Object.fromEntries(
    WIDGET_CURRENCIES.map(c => [c, coherent(bestPair(rates, c))])
  ) as Record<WidgetCurrency, OgRatePair>
  const brou = {
    USD: brouPair(rates, 'USD', ''),
    EBROU: brouPair(rates, 'USD', 'EBROU'),
    EUR: brouPair(rates, 'EUR', ''),
    BRL: brouPair(rates, 'BRL', ''),
    ARS: brouPair(rates, 'ARS', ''),
  }
  return { mejor, brou, at: now.toISOString() }
}

/**
 * `?monedas=USD,EUR` → monedas conocidas, sin repetir, en el orden fijo del widget. Vacío o basura
 * vuelve al dólar solo, que es el widget de siempre: un iframe pegado hace meses no cambia.
 */
export function parseWidgetCurrencies(value: unknown): WidgetCurrency[] {
  const raw = Array.isArray(value) ? value.join(',') : typeof value === 'string' ? value : ''
  const asked = new Set(
    raw
      .toUpperCase()
      .split(/[\s,]+/)
      .filter(Boolean)
  )
  const picked = WIDGET_CURRENCIES.filter(c => asked.has(c))
  return picked.length ? picked : ['USD']
}

export function parseWidgetOrigin(value: unknown): WidgetOrigin {
  return value === 'brou' ? 'brou' : 'mejor'
}

/** El widget de siempre: el dólar solo, mejor precio. Es el único que usa la tarjeta grande. */
export function isClassicWidget(currencies: readonly WidgetCurrency[], origin: WidgetOrigin) {
  return origin === 'mejor' && currencies.length === 1 && currencies[0] === 'USD'
}

/** Las filas a dibujar. Con la pizarra del BROU el dólar va seguido de su dólar eBROU. */
export function widgetRows(
  data: Pick<WidgetRatesPayload, 'mejor' | 'brou'> | null | undefined,
  currencies: readonly WidgetCurrency[],
  origin: WidgetOrigin
): WidgetRow[] {
  const keys: WidgetRowKey[] =
    origin === 'brou'
      ? currencies.flatMap((c): WidgetRowKey[] => (c === 'USD' ? ['USD', 'EBROU'] : [c]))
      : [...currencies]
  return keys.map(key => {
    const pair =
      origin === 'brou'
        ? data?.brou?.[key]
        : key === 'EBROU'
          ? undefined
          : data?.mejor?.[key as WidgetCurrency]
    return { key, buy: pair?.buy ?? null, sell: pair?.sell ?? null }
  })
}

/**
 * 41,2 → "41,20"; el peso argentino se cotiza al centavo de peso uruguayo (0,02 / 0,035), así que
 * debajo de 1 van tres decimales: con dos, 0,035 se publicaría como 0,04.
 */
export function formatWidgetRate(value: number | null, locale = 'es-UY'): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const digits = value < 1 ? 3 : 2
  return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: digits })
}
