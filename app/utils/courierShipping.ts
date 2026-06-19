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
  /**
   * Representative small-parcel reference price per kg (USD), or `null` when the courier only
   * quotes through its own calculator (no public flat per-kg). `null`-rate couriers are listed
   * in the comparison but excluded from the by-weight estimator.
   */
  perKgUsd: number | null
  /** Fixed handling fee per shipment (USD), or `null` when quote-based. */
  baseUsd: number | null
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
 * Couriers that ship door-to-door (mostly Miami → Uruguay) for online purchases. Per-kg rates
 * (USD) were **verified 2026-06-18** from each courier's published tariffs. Couriers price by
 * weight tiers; the `perKgUsd` here is the small-parcel tier used by the estimator's flat
 * `base + perKg·kg` model — heavier-parcel tiers and surcharges (e.g. the 10% postal/URSEC
 * surcharge) are described in `note`. Couriers without a public flat rate carry `null` and are
 * shown as "Consultar". Override in the UI with your actual quote. Not affiliated; informational.
 * See `/couriers-uruguay` for the full comparison.
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
    id: 'soycourier',
    name: 'SoyCourier',
    perKgUsd: 14.99,
    baseUsd: 0,
    modality: 'Casillero en Miami',
    transit: '3–7 días',
    website: 'https://www.soycourier.com',
    source: 'https://www.soycourier.com',
    note: 'Tarifa todo incluido (manejo, despacho, seguro y entrega); descuenta el impuesto',
  },
  {
    id: 'uruguaycargo',
    name: 'UruguayCargo',
    perKgUsd: 19.5,
    baseUsd: 4,
    modality: 'Casillero en Miami',
    website: 'https://www.uruguaycargo.com.uy',
    source: 'https://www.uruguaycargo.com.uy/tarifas.html',
    note: 'Mín. US$14,99 (≤500 g); 5–10 kg US$18,99/kg; 10–20 kg US$18,20/kg; +10% postal; manejo US$4',
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
    id: 'aerobox',
    name: 'Aerobox',
    perKgUsd: 23.5,
    baseUsd: 5,
    modality: 'Casillero en Miami',
    website: 'https://aerobox.com.uy',
    source: 'https://aerobox.com.uy/tarifas/',
    note: '1–500 g US$11,99 fijo; 5–10 kg US$20,5/kg; 10–20 kg US$17,5/kg; +10% URSEC; manejo US$5+IVA',
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
    note: 'Desde US$8,99 (<0,5 kg); libros US$8,90/kg; descuenta el impuesto; tiene calculadora propia',
  },
  {
    id: 'usxcargo',
    name: 'USX Cargo',
    perKgUsd: null,
    baseUsd: null,
    modality: 'Casillero en Miami y Europa',
    website: 'https://usxcargo.com',
    source: 'https://usxcargo.com',
    note: 'Envíos desde EE.UU. y Europa; tarifa según su propia calculadora',
  },
  {
    id: 'miami-box',
    name: 'Miami Box',
    perKgUsd: null,
    baseUsd: null,
    modality: 'Casillero en Miami',
    website: 'https://www.miami-box.com',
    source: 'https://www.miami-box.com/precios',
    note: 'Consultá la tarifa por peso en su sitio',
  },
  {
    id: 'urubox',
    name: 'Urubox',
    perKgUsd: null,
    baseUsd: null,
    modality: 'Casillero en Miami',
    website: 'https://www.urubox.com.uy',
    source: 'https://www.urubox.com.uy',
    note: 'Consultá la tarifa por peso en su sitio',
  },
  {
    id: 'exur',
    name: 'EXUR Envíos',
    perKgUsd: null,
    baseUsd: null,
    modality: 'Casillero en Miami / mensajería',
    website: 'https://www.exurenvios.com',
    source: 'https://www.exurenvios.com',
    note: 'Consultá la tarifa por peso en su sitio',
  },
]

/** Couriers that publish a flat per-kg rate — the ones offered in the by-weight estimator. */
export const ESTIMATOR_COURIERS: Courier[] = COURIERS.filter(c => c.perKgUsd != null)

export function getCourier(id: string): Courier {
  return COURIERS.find(c => c.id === id) ?? ESTIMATOR_COURIERS[0]!
}

/** Estimated shipping cost (USD) = base fee + per-kg rate × weight. */
export function shippingCostUsd(perKgUsd: number, baseUsd: number, weightKg: number): number {
  const kg = Math.max(weightKg || 0, 0)
  const perKg = Math.max(perKgUsd || 0, 0)
  const base = Math.max(baseUsd || 0, 0)
  return round(base + perKg * kg)
}
