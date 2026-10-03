// Orden y filtros de la tabla "Precio por año (y versión)" de /autos-usados-uruguay/precios/<modelo>.
//
// Puro a propósito: la tabla es chica (decenas de filas) y se filtra en el navegador, pero el orden
// por defecto tiene que ser el mismo que renderiza el servidor, así que la lógica vive acá y no en
// el componente, y se prueba sin montar nada.
import type { PublicCarMarketRow } from '~/utils/carsPublic'

export type CarMarketSortKey = 'year' | 'version' | 'n' | 'median' | 'km'
export type CarMarketSortDir = 'asc' | 'desc'

export interface CarMarketSort {
  key: CarMarketSortKey
  dir: CarMarketSortDir
}

export interface CarMarketFilters {
  /** Versiones elegidas (por `trimKey`); vacío = todas. */
  trims: string[]
  yearMin: number | null
  yearMax: number | null
  engine: string
  transmission: string
  /** Presupuesto: la MEDIANA de la fila tiene que entrar. */
  priceMax: number | null
}

export const CAR_MARKET_DEFAULT_SORT: CarMarketSort = { key: 'year', dir: 'desc' }

export const emptyCarMarketFilters = (): CarMarketFilters => ({
  trims: [],
  yearMin: null,
  yearMax: null,
  engine: '',
  transmission: '',
  priceMax: null,
})

/** La dirección natural de cada columna la primera vez que se toca: lo nuevo, lo barato, lo poco usado. */
export const CAR_MARKET_FIRST_DIR: Record<CarMarketSortKey, CarMarketSortDir> = {
  year: 'desc',
  version: 'asc',
  n: 'desc',
  median: 'asc',
  km: 'asc',
}

/** Las opciones del selector de orden en el celular, donde los encabezados no se ven. */
export const CAR_MARKET_SORT_OPTIONS: { title: string; value: string }[] = [
  { title: 'Más nuevos', value: 'year:desc' },
  { title: 'Más viejos', value: 'year:asc' },
  { title: 'Más baratos', value: 'median:asc' },
  { title: 'Más caros', value: 'median:desc' },
  { title: 'Menos kilómetros', value: 'km:asc' },
  { title: 'Más avisos', value: 'n:desc' },
  { title: 'Versión A–Z', value: 'version:asc' },
]

export const trimKey = (row: Pick<PublicCarMarketRow, 'trim'>): string =>
  (row.trim ?? '').trim().toLowerCase()

/**
 * La versión tal como la publica el vendedor llega en minúsculas cuando sale del título
 * ("exteme plus", "gp ce"). Sólo se capitaliza lo que viene TODO en minúsculas: "Trendline" o
 * "SRV" ya traen la forma que eligió la marca y no se tocan. Las palabras de dos letras o menos
 * son siglas ("gp", "ce", "tdi" no) y van en mayúsculas.
 */
export const displayTrim = (trim: string | null): string => {
  const value = (trim ?? '').trim()
  if (!value) return 'Sin versión'
  if (value !== value.toLowerCase()) return value
  return value
    .split(/\s+/)
    .map(word =>
      word.length <= 2 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ')
}

export const filterCarMarketRows = (
  rows: PublicCarMarketRow[],
  filters: CarMarketFilters
): PublicCarMarketRow[] => {
  const trims = new Set(filters.trims)
  return rows.filter(
    row =>
      (!trims.size || trims.has(trimKey(row))) &&
      (filters.yearMin === null || row.year >= filters.yearMin) &&
      (filters.yearMax === null || row.year <= filters.yearMax) &&
      (!filters.engine || row.engine === filters.engine) &&
      (!filters.transmission || row.transmission === filters.transmission) &&
      (filters.priceMax === null || row.median <= filters.priceMax)
  )
}

const valueOf = (row: PublicCarMarketRow, key: CarMarketSortKey): number | string => {
  switch (key) {
    case 'year':
      return row.year
    case 'version':
      return displayTrim(row.trim)
    case 'n':
      return row.n
    case 'median':
      return row.median
    case 'km':
      return row.kmMedian
  }
}

/**
 * Estable y con desempate fijo (año más nuevo, después mediana más baja): dos filas con la misma
 * mediana nunca cambian de lugar entre el servidor y el navegador.
 */
export const sortCarMarketRows = (
  rows: PublicCarMarketRow[],
  sort: CarMarketSort
): PublicCarMarketRow[] => {
  const sign = sort.dir === 'asc' ? 1 : -1
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const left = valueOf(a.row, sort.key)
      const right = valueOf(b.row, sort.key)
      const primary =
        typeof left === 'string'
          ? left.localeCompare(String(right), 'es', { sensitivity: 'base' })
          : left - (right as number)
      if (primary) return primary * sign
      return b.row.year - a.row.year || a.row.median - b.row.median || a.index - b.index
    })
    .map(entry => entry.row)
}

export const parseCarMarketSort = (value: string): CarMarketSort => {
  const [key, dir] = value.split(':')
  const keys: CarMarketSortKey[] = ['year', 'version', 'n', 'median', 'km']
  return keys.includes(key as CarMarketSortKey) && (dir === 'asc' || dir === 'desc')
    ? { key: key as CarMarketSortKey, dir }
    : CAR_MARKET_DEFAULT_SORT
}

/** Escala común de la barra de rango: de la P25 más baja a la P75 más alta de TODAS las filas. */
export const carMarketScale = (rows: PublicCarMarketRow[]): { min: number; max: number } | null => {
  if (!rows.length) return null
  const min = Math.min(...rows.map(row => row.p25))
  const max = Math.max(...rows.map(row => row.p75))
  return max > min ? { min, max } : null
}

/** Posición (0–100) de un precio sobre la escala, para la barra de rango. */
export const carMarketPct = (value: number, scale: { min: number; max: number }): number =>
  Math.min(100, Math.max(0, ((value - scale.min) / (scale.max - scale.min)) * 100))
