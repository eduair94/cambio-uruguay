import type { PriceHistoryCurrency, PriceHistoryVertical } from './priceHistory'

/**
 * Lo que publica `/cambios-de-precio-uruguay`: los cambios de precio que observamos por aviso en los
 * últimos días, por vertical. Lo escribe el job `currency-price-changes` (raíz,
 * `classes/pricehistory/refresh.ts`) en APP DB `pricechangesnapshots`; el pedido sólo lee la foto.
 *
 * Lo que esta página NO dice: si conviene comprar. Un precio que baja puede seguir siendo caro y uno
 * que sube puede seguir siendo el más barato del mercado. La pregunta "¿es un descuento real?" la
 * contesta `/ciberlunes-y-black-friday-uruguay`, que compara cada oferta contra su propio mínimo de
 * 60 días y exige antigüedad; el nivel del mercado lo cuentan las páginas `/evolucion-precio-*`.
 */
export interface PriceChangeRow {
  vertical: PriceHistoryVertical
  id: string
  title: string
  url: string
  external: boolean
  sellerName: string | null
  sellerKey: string | null
  from: number
  to: number
  currency: PriceHistoryCurrency
  at: string
  pct: number
  direction: 'baja' | 'suba'
}

export interface PriceChangeVertical {
  vertical: PriceHistoryVertical
  tracked: number
  withHistory: number
  drops: number
  rises: number
  trackingSince: string | null
}

export interface PriceChangeSnapshotPublic {
  day: string
  generatedAt: string
  windowDays: number
  verticals: PriceChangeVertical[]
  changes: PriceChangeRow[]
}

export interface PriceChangesResponse {
  snapshot: PriceChangeSnapshotPublic | null
}

export const PRICE_CHANGES_PATH = '/cambios-de-precio-uruguay'

/** Las verticales en el orden en que se muestran: primero lo que más plata mueve por decisión. */
export const PRICE_CHANGE_VERTICAL_ORDER: readonly PriceHistoryVertical[] = [
  'alquiler',
  'venta',
  'autos',
  'equipar',
  'celulares',
  'movilidad',
  'sillas',
]

export const PRICE_CHANGE_VERTICAL_LABEL: Record<PriceHistoryVertical, string> = {
  alquiler: 'Alquileres',
  venta: 'Viviendas en venta',
  autos: 'Autos usados',
  equipar: 'Cosas para la casa',
  celulares: 'Celulares',
  movilidad: 'Monopatines y bicicletas eléctricas',
  sillas: 'Sillas de escritorio',
}

/** A dónde manda cada vertical cuando alguien quiere ver todo, no sólo lo que cambió. */
export const PRICE_CHANGE_VERTICAL_HOME: Record<PriceHistoryVertical, string> = {
  alquiler: '/alquileres-uruguay',
  venta: '/venta-viviendas-uruguay',
  autos: '/autos-usados-uruguay',
  equipar: '/equipar-casa-uruguay/productos',
  celulares: '/celulares-uruguay',
  movilidad: '/monopatines-electricos-uruguay',
  sillas: '/sillas-escritorio-uruguay',
}

export const priceChangeMoney = (value: number, currency: PriceHistoryCurrency): string =>
  `${currency === 'USD' ? 'US$' : '$'} ${Math.round(value).toLocaleString('es-UY')}`

/** `2026-09-19` → `19/9`. Sin `new Date`: una fecha sin hora no tiene zona y se corre un día. */
export function priceChangeShortDay(day: string): string {
  const [, month, date] = day.split('-')
  return month && date ? `${Number(date)}/${Number(month)}` : day
}

export function priceChangeLongDay(day: string): string {
  const [year, month, date] = day.split('-')
  return year && month && date ? `${Number(date)}/${Number(month)}/${year}` : day
}

/** Las filas de una vertical, bajas primero y por magnitud: lo que más se movió, arriba. */
export function priceChangesOf(
  rows: readonly PriceChangeRow[],
  vertical: PriceHistoryVertical
): PriceChangeRow[] {
  return rows.filter(row => row.vertical === vertical).sort((a, b) => a.pct - b.pct)
}
