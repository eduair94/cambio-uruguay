// Tipos del snapshot de ingreso publicitario que escribe `currency-site-analytics`.
//
// Módulo aparte de `siteAnalytics.ts` por la misma razón que la colección es aparte: aquél alimenta
// una página pública, éste sólo la privada. Ver classes/site-analytics/revenue.ts.

export interface RevenueTotals {
  adRevenue: number
  adImpressions: number
  adClicks: number
  screenPageViews: number
  sessions: number
  /** Ingreso por cada 1.000 vistas de página. */
  rpm: number
}

export interface RevenueFamilyRow {
  bucket: string
  urls: number
  adRevenue: number
  adImpressions: number
  adClicks: number
  screenPageViews: number
  rpm: number
  /** 0..1 */
  shareOfRevenue: number
}

export interface RevenuePageRow {
  path: string
  adRevenue: number
  adImpressions: number
  screenPageViews: number
  rpm: number
}

export interface SiteRevenueSnapshot {
  key: string
  asOf: string
  currency: string
  range: { start: string; end: string }
  totals: RevenueTotals
  families: RevenueFamilyRow[]
  topPages: RevenuePageRow[]
  daily: Array<{ date: string; adRevenue: number; adImpressions: number }>
  /** El enlace AdSense↔GA4 todavía no devuelve datos (tarda hasta 24 h). */
  pending: boolean
}

/** Formatea plata con la moneda que informa GA4, sin inventar el símbolo. */
export function formatRevenue(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(amount || 0)
  } catch {
    // Una moneda que Intl no conoce no es motivo para romper la página.
    return `${(amount || 0).toFixed(2)} ${currency || ''}`.trim()
  }
}
