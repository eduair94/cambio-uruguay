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
  /** Representative small-parcel reference price per kg (USD). */
  perKgUsd: number
  /** Fixed handling fee per shipment (USD). */
  baseUsd: number
  /** Service type, e.g. `'Casillero en Miami'`. */
  modality: string
  /** Typical delivery time, when published. */
  transit?: string
  /** Official website. */
  website: string
  /** URL backing the reference rate / information. */
  source: string
  /** Tiered-rate / surcharge caveats. */
  note?: string
}

/**
 * Reference per-kg rates (USD), Miami → Uruguay, **verified 2026-06-18** from each courier's
 * published tariffs. Couriers price by weight tiers; the `perKgUsd` here is the small-parcel
 * tier used by the estimator's flat `base + perKg·kg` model — heavier-parcel tiers and
 * surcharges (e.g. 10% TSPU) are described in `note`. Override in the UI with your actual quote.
 * Not affiliated; informational. See `/couriers-uruguay` for the full comparison.
 */
export const COURIERS: Courier[] = [
  {
    id: 'gripper',
    name: 'Gripper',
    perKgUsd: 21.9,
    baseUsd: 5,
    modality: 'Casillero en Miami',
    transit: '3–7 días hábiles',
    website: 'https://www.gripper.com.uy',
    source: 'https://www.gripper.com.uy/tarifas',
    note: '5–20 kg US$16,5/kg; <900 g US$19,80 fijo; +10% TSPU; manejo US$5',
  },
  {
    id: 'enviamicompra',
    name: 'Envía Mi Compra',
    perKgUsd: 21.9,
    baseUsd: 5,
    modality: 'Casillero en Miami',
    website: 'https://www.enviamicompra.com.uy',
    source: 'https://www.enviamicompra.com.uy/servicios-tarifas',
    note: '10–20 kg US$16,5/kg; 20+ kg US$11,9/kg; mín. 0,5 kg; manejo US$5',
  },
  {
    id: 'casillamia',
    name: 'Casilla Mía',
    perKgUsd: 20,
    baseUsd: 10,
    modality: 'Casillero en Miami',
    website: 'https://www.casillamia.uy',
    source: 'https://www.casillamia.uy/Tarifas',
    note: 'Por tramos de 500 g; despacho de aduana US$75 (≤800) / US$135 (>800)',
  },
  {
    id: 'puntomio',
    name: 'Punto Mío',
    perKgUsd: 18,
    baseUsd: 5,
    modality: 'Casillero en Miami',
    website: 'https://www.puntomio.uy',
    source: 'https://www.puntomio.uy',
    note: 'Desde US$8,99 (<0,5 kg); libros US$8,90/kg; tiene calculadora propia',
  },
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
