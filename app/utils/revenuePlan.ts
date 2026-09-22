// Espejo de `classes/revenueplan/types.ts`. Lo escribe el job `currency-revenue-plan` y lo lee
// SOLO la página privada /estadisticas-de-busqueda.
//
// NO ES PÚBLICO: además de las consultas de Search Console, este documento lleva el RPM por familia
// de página, o sea cuánto factura cada sección del sitio. Va detrás de `requireAdmin`, igual que
// /api/site-revenue, y `tests/revenueplan/privacy.test.ts` en la raíz falla si alguna página o
// ruta sin `requireAdmin` lo toca.

export type RpValueBasis = 'medido' | 'tramo' | 'sin-datos'

export interface RpAction {
  kind: string
  subject: string
  note: string
  impressions: number
  clicks: number
  position: number
  potentialClicks: number
  url: string | null
  bucket: string | null
  usdPerClick: number
  basis: RpValueBasis
  expectedUsd: number
  weightedClicks: number
  rankByClicks: number
}

export interface RpFamily {
  bucket: string
  usdPerClick: number
  multiplier: number
  basis: RpValueBasis
  measuredRpm: number
  views: number
  adImpressions: number
  adRevenue: number
  measuredMultiplier: number
  tierMultiplier: number
  tier: string
  searchClicks: number
  searchImpressions: number
  shareOfViews: number
  shareOfRevenue: number
  gap: number
}

export type RpVerdict = 'esperando' | 'mejoró' | 'sin cambio' | 'empeoró' | 'sin datos'

export interface RpExperiment {
  id: string
  shippedOn: string
  routes: string[]
  queries?: string[]
  hypothesis: string
  verdict: RpVerdict
  daysAfter: number
  daysMissing: number
  before: { clicks: number; impressions: number; days: number }
  after: { clicks: number; impressions: number; days: number }
  siteBefore: { clicks: number; impressions: number }
  siteAfter: { clicks: number; impressions: number }
  relativeLift: number | null
  note: string
}

export interface RevenuePlanSnapshot {
  key: string
  asOf: string
  searchWindow: { startDate: string; endDate: string }
  revenueWindow: { start: string; end: string }
  currency: string
  siteRpm: number
  /**
   * RPM medido sólo sobre visitas desde Uruguay. Resistente al tráfico automatizado, que infla el
   * denominador de `siteRpm` sin dejar impresiones. Nunca ordena la cola: se publica al lado.
   * Opcional porque los planes anteriores al 2026-09-22 no lo traen.
   */
  siteRpmUy?: number
  siteUsdPerClick: number
  revenuePending: boolean
  totalUpsideUsd: number
  actions: RpAction[]
  defend: RpAction[]
  families: RpFamily[]
  experiments: RpExperiment[]
  alerts: Array<{ level: 'info' | 'warn' | 'critical'; code: string; message: string }>
}

/** Color del chip de cada veredicto. `esperando` es gris a propósito: todavía no dice nada. */
export function rpVerdictColor(verdict: RpVerdict): string {
  switch (verdict) {
    case 'mejoró':
      return 'success'
    case 'empeoró':
      return 'error'
    case 'sin cambio':
      return 'warning'
    default:
      return 'grey'
  }
}

/** Cómo se leyó el precio de esa fila, en una palabra que se pueda poner al lado del número. */
export function rpBasisLabel(basis: RpValueBasis): string {
  switch (basis) {
    case 'medido':
      return 'RPM medido de la familia'
    case 'tramo':
      return 'estimado por tramo (la familia todavía no tiene muestra propia)'
    default:
      return 'sin ingreso medido: sólo ordena'
  }
}

/**
 * Una cifra de plata chica no se puede redondear a dos decimales sin desaparecer: con el ingreso
 * diario actual, la mitad de la tabla imprimiría "0,00" y parecería un error.
 */
export function rpMoney(value: number, currency = 'USD'): string {
  if (!value) return '—'
  const digits = Math.abs(value) < 0.01 ? 4 : 2
  return `${currency} ${value.toFixed(digits)}`
}
