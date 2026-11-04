// Los modelos de monopatín: /monopatines-electricos-uruguay/<modelo>, el comparador y la tabla de
// modelos del hub. El catálogo lo arma currency-movilidad-specs cada hora (classes/movilidad/models/);
// acá sólo se lee y se presenta.
//
// `app/utils` es un espacio de auto-import plano: todo lo de acá lleva el prefijo `monopatinModel`/
// `MONOPATIN_MODEL_` para no chocar con equipar ni celulares.
import type { MonopatinSpecsPublic } from './monopatinFicha'

export type MonopatinConsensusValues = Omit<MonopatinSpecsPublic, 'fromFicha'>
export type MonopatinConsensusField = keyof MonopatinConsensusValues
export type MonopatinNumericField =
  | 'rangeKm'
  | 'maxSpeedKmh'
  | 'motorW'
  | 'motorPeakW'
  | 'batteryV'
  | 'batteryAh'
  | 'batteryWh'
  | 'chargeHours'
  | 'maxLoadKg'
  | 'weightKg'
  | 'wheelInches'
  | 'minAge'

export interface MonopatinModelOffer {
  listingId: string
  title: string
  sellerName: string
  sellerKey: string
  url: string
  price: number
  currency: 'UYU' | 'USD'
  priceUyu: number
  condition: 'new' | 'used'
  source: 'store' | 'mercadolibre'
  image: string | null
  observedAt: string
  freeShipping: boolean | null
  officialStore: boolean
}

export interface MonopatinModelBand {
  min: number
  median: number
  max: number
  n: number
  sellers: number
}

export interface MonopatinConsensus {
  values: MonopatinConsensusValues
  agree: Partial<Record<MonopatinConsensusField, { n: number; of: number }>>
  spread: Partial<Record<MonopatinNumericField, { min: number; max: number }>>
}

export interface MonopatinModelHistoryPoint {
  day: string
  newMin: number
  newMedian: number
  n: number
}

/** Espejo de `MovilidadModelDoc` (classes/movilidad/models/build.ts). */
export interface MonopatinModelDoc {
  slug: string
  name: string
  brandKey: string
  brandLabel: string
  modelLabel: string
  variant: string
  image: string | null
  offers: MonopatinModelOffer[]
  newBand: MonopatinModelBand | null
  usedBand: MonopatinModelBand | null
  specs: MonopatinConsensus | null
  fichas: number
  listings: number
  sellers: number
  indexable: boolean
  firstSeen: string
  lastSeen: string
  generatedAt: string
  history: MonopatinModelHistoryPoint[]
}
