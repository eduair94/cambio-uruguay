// Courier shipping cost estimator for the import calculator.
//
// Door-to-door couriers from Miami to Uruguay price mostly by weight (USD per
// kg) plus a fixed handling fee. Exact tariffs change and depend on volume /
// dimensional weight, so these are REFERENCE rates the user can override; the
// selector pre-fills a courier's typical per-kg rate which feeds the freight
// input of the import-tax calculation. Pure functions → unit-testable.
import { round } from './calculators'

export interface Courier {
  id: string
  name: string
  /** Reference price per kg (USD). */
  perKgUsd: number
  /** Fixed handling fee per shipment (USD). */
  baseUsd: number
  note?: string
}

/**
 * Reference per-kg rates (USD), Miami → Uruguay, updated periodically. Override
 * in the UI with your courier's actual quote. Not affiliated; informational.
 */
export const COURIERS: Courier[] = [
  { id: 'usxcargo', name: 'USX Cargo', perKgUsd: 22, baseUsd: 5, note: 'Miami → Uruguay' },
  { id: 'miami-box', name: 'Miami Box / casillero', perKgUsd: 25, baseUsd: 6 },
  { id: 'aeropost', name: 'Aeropost / Tiendamia', perKgUsd: 28, baseUsd: 0 },
  { id: 'grabr', name: 'Grabr / shopper', perKgUsd: 30, baseUsd: 0 },
  { id: 'postal', name: 'Correo / postal', perKgUsd: 18, baseUsd: 4 },
]

export function getCourier(id: string): Courier {
  return COURIERS.find(c => c.id === id) ?? COURIERS[0]!
}

/** Estimated shipping cost (USD) = base fee + per-kg rate × weight. */
export function shippingCostUsd(perKgUsd: number, baseUsd: number, weightKg: number): number {
  const kg = Math.max(weightKg || 0, 0)
  const perKg = Math.max(perKgUsd || 0, 0)
  const base = Math.max(baseUsd || 0, 0)
  return round(base + perKg * kg)
}
