// Strict API types for cambio-uruguay (quicktype-assisted, then refined).
// Sources: GET / (rates array) and GET /evolution/:origin/:currency.
// Note: the API serialises dates as ISO strings; literal unions that quicktype
// inferred from single samples (code/origin/name) are widened to `string`.

/** Operation type. Empty string = plain/cash quote. */
export type ExchangeType =
  | ''
  | 'INTERBANCARIO'
  | 'PROMED.FONDO'
  | 'CABLE'
  | 'BILLETE'
  | 'EBROU'
  | 'TRANSFERENCIA'

/** One row from GET / — a currency quote for a given exchange house. */
export interface ExchangeRate {
  origin: string
  date: string
  type: ExchangeType
  code: string
  name: string
  buy?: number
  sell?: number
}

export interface PreferentialRateBand {
  currency: string
  buy: number
  sell: number
  minAmount: number
  /** Exclusive upper boundary. `null` means there is no upper limit. */
  maxAmount: number | null
  arbitrageBuy?: number
  arbitrageSell?: number
}

export interface PreferentialRateSnapshot {
  date: string
  scrapedAt: string
  rates: PreferentialRateBand[]
  selectedRate: PreferentialRateBand | null
}

export interface PreferentialRateProvider {
  provider: string
  displayName: string
  source: string
  requiresAuthentication: boolean
  currencies: string[]
  boundaryRule: string
  current: PreferentialRateSnapshot | null
  history: PreferentialRateSnapshot[]
  updatedAt: string
}

export interface PreferentialRatesCatalog {
  currency: string | null
  amount: number | null
  providers: PreferentialRateProvider[]
  providerCount: number
  updatedAt: string
}

export interface EvolutionPoint {
  date: string
  buy: number
  sell: number
  origin: string
  code: string
  type: ExchangeType
  name: string
}

export interface EvolutionStat {
  min: number
  max: number
  avg: number
  current: number
  change: number
}

export interface EvolutionStatistics {
  totalDataPoints: number
  dateRange: {
    start: string
    end: string
    periodMonths: number
  }
  buy: EvolutionStat
  sell: EvolutionStat
}

export interface EvolutionLocalData {
  name: string
  website: string
  maps: string
  bcu: string
  departments: string[]
}

/** Response from GET /evolution/:origin/:currency. */
export interface EvolutionResponse {
  origin: string
  code: string
  type: ExchangeType | null
  statistics: EvolutionStatistics
  evolution: EvolutionPoint[]
  localData: EvolutionLocalData
}
