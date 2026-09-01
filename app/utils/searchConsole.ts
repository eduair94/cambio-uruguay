// Types for the Search Console snapshot the backend job `currency-gsc` writes, plus the two
// helpers the private dashboard uses to render it.
//
// Mirrors classes/gsc/types.ts. Kept as its own module (not folded into siteAnalytics.ts) because
// the two have opposite audiences: the GA4 snapshot is published at /estadisticas-del-sitio, this
// one never leaves the owner's screen.

export interface ScMetrics {
  clicks: number
  impressions: number
  /** 0..1. */
  ctr: number
  position: number
}

export interface ScKeyed extends ScMetrics {
  key: string
}

export interface ScOpportunity {
  kind:
    | 'striking-distance'
    | 'ctr-below-curve'
    | 'cannibalisation'
    | 'rising'
    | 'falling'
    | 'new-query'
    | 'dead-weight'
  subject: string
  impressions: number
  clicks: number
  position: number
  potentialClicks: number
  note: string
  urls?: string[]
}

export interface ScPageType extends ScMetrics {
  bucket: string
  urls: number
}

export interface ScCurvePoint {
  position: number
  ctr: number
  impressions: number
  derived: boolean
}

export interface ScAlert {
  level: 'info' | 'warn' | 'critical'
  code: string
  message: string
}

export interface ScIndexation {
  asOf: string
  checked: number
  indexed: number
  notIndexed: number
  rows: Array<{ url: string; verdict: string; coverageState: string; lastCrawlTime: string | null }>
  skippedReason?: string
}

export interface SearchConsoleSnapshot {
  key: string
  siteUrl: string
  asOf: string
  window: { startDate: string; endDate: string }
  previousWindow: { startDate: string; endDate: string }
  totals: ScMetrics
  previousTotals: ScMetrics
  daily: Array<{ day: string } & ScMetrics>
  topQueries: ScKeyed[]
  topPages: ScKeyed[]
  countries: ScKeyed[]
  devices: ScKeyed[]
  pageTypes: ScPageType[]
  ctrCurve: ScCurvePoint[]
  opportunities: ScOpportunity[]
  zeroClickPool: {
    queries: number
    impressions: number
    clicks: number
    shareOfImpressions: number
  }
  alerts: ScAlert[]
  archivedDays: number
  indexation: ScIndexation
}

/** Spanish label per opportunity kind, and the one-line reason it is on the list. */
export const SC_OPPORTUNITY_LABELS: Record<ScOpportunity['kind'], { label: string; why: string }> =
  {
    'striking-distance': {
      label: 'A tiro',
      why: 'Ya rankea entre la 4 y la 15 con volumen real: subirla es trabajo de contenido, no un milagro.',
    },
    'ctr-below-curve': {
      label: 'CTR bajo la curva',
      why: 'Misma posición, menos clics que lo normal en este sitio. Es el título y el snippet, no el ranking.',
    },
    cannibalisation: {
      label: 'Canibalización',
      why: 'Varias URLs propias compiten por la misma consulta y Google elige mal.',
    },
    falling: { label: 'Cayendo', why: 'Perdió clics contra la ventana anterior.' },
    rising: { label: 'Subiendo', why: 'Ganó clics: vale la pena empujar lo que ya se mueve.' },
    'new-query': {
      label: 'Demanda nueva',
      why: 'Apareció con volumen y todavía no tiene página propia.',
    },
    'dead-weight': {
      label: 'Peso muerto',
      why: 'Muchas impresiones, ningún clic: la SERP contesta sola.',
    },
  }

/** `0.00456` → `0,46 %`. */
export function scPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits).replace('.', ',')} %`
}

/** Signed change between two numbers, as a percentage of the first. */
export function scDelta(current: number, previous: number): { pct: number; up: boolean } | null {
  if (!previous) return null
  const pct = (current - previous) / previous
  return { pct, up: pct >= 0 }
}
