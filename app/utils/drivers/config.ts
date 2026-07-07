export type DriverSource = 'stooq' | 'argentinadatos'

export interface DriverDef {
  key: string
  label: string
  source: DriverSource
  /** stooq symbol (e.g. 'dx.f') or argentinadatos dolar path (e.g. 'blue'). */
  symbol: string
  /** Target currencies this driver is expected to help explain. */
  currencies: string[]
}

// Phase 1 anchors on USD. EUR/ARS drivers are declared for Phase 3 reuse but
// unused until then. Verify stooq symbols return data on first ingest run.
export const DRIVERS: DriverDef[] = [
  { key: 'dxy', label: 'Índice dólar (DXY)', source: 'stooq', symbol: 'dx.f', currencies: ['USD', 'EUR'] },
  { key: 'us10y', label: 'Bono EE.UU. 10 años', source: 'stooq', symbol: '10usy.b', currencies: ['USD'] },
  { key: 'soybean', label: 'Soja (CBOT)', source: 'stooq', symbol: 'zs.f', currencies: ['USD'] },
  { key: 'brl', label: 'Real BRL/USD', source: 'stooq', symbol: 'usdbrl', currencies: ['USD'] },
  { key: 'arBlue', label: 'Dólar blue Argentina', source: 'argentinadatos', symbol: 'blue', currencies: ['USD', 'ARS'] },
  { key: 'arOfficial', label: 'Dólar oficial Argentina', source: 'argentinadatos', symbol: 'oficial', currencies: ['ARS'] },
  { key: 'eurusd', label: 'EUR/USD', source: 'stooq', symbol: 'eurusd', currencies: ['EUR'] },
]

export function driversFor(currency: string): DriverDef[] {
  return DRIVERS.filter(d => d.currencies.includes(currency))
}
