// app/utils/postalHandling.ts
// What Correo Uruguayo charges you ON TOP of the tax, for handling the declaration.
//
// WHY THIS EXISTS: our calculator priced the TRIBUTO and stopped there, so a reader with a
// US$ 19,15 parcel from AliExpress was told "US$ 20" and then saw "Pendiente U$S 26,00" in
// Ahíva. The gap is not a mistake of the Correo: it is a published charge nobody quotes.
//
//   19,15 × 60% = 11,49 → menor al mínimo → US$ 20 de prestación única
//   + US$ 5   por declarar cuando el paquete YA había llegado (dentro de los 10 días del aviso)
//   + US$ 1   = 5% del impuesto abonado
//   = US$ 26,00 exactos
//
// EVERY NUMBER HERE IS SOURCED. Correo Uruguayo, "Gestiones administrativas para envíos del
// exterior" (última actualización 01/04/2026):
//   https://www.correo.com.uy/gestiones-administrativas-envios-exterior
// verbatim:
//   - "Si usted declara su compra u obsequio previamente a su arribo a Uruguay: El único costo
//      administrativo será de 1,5 USD más el 5 % del impuesto abonado."
//   - "Si usted registra su paquete cuando este ya arribó a Uruguay: Deberá abonar 5 USD más el
//      5 % del impuesto abonado si realiza la declaración antes de los 10 días de emitida la
//      notificación de retención."
//   - "Si eligió franquicia, no aplicará el 5% adicional."
//   - "Pasados los 30 días, el envío será declarado en «abandono no infraccional»."
//
// The charge is the OPERATOR's, not a tribute: it is the price of "transferencia de los montos
// recaudados e información a DNA". A private courier bills its own handling instead, on its own
// tariff — so this module is only about parcels that arrive through Correo Uruguayo.

/** Date the figures below were last read off Correo's tariff page. */
export const POSTAL_HANDLING_LAST_RESEARCHED = '2026-08-12'

/** Base charge when the declaration is filed BEFORE the parcel lands, in USD. */
export const HANDLING_BEFORE_ARRIVAL_USD = 1.5

/**
 * Base charge when the parcel is registered AFTER arriving, in USD. Correo publishes it tied to
 * one deadline: "antes de los 10 días de emitida la notificación de retención".
 */
export const HANDLING_AFTER_ARRIVAL_USD = 5

/** Days from the retention notice that the USD 5 tier is published for. */
export const HANDLING_AFTER_ARRIVAL_DAYS = 10

/** Percentage of the tax actually paid, added to the base charge. Waived under franquicia. */
export const HANDLING_TAX_PCT = 5

/** Days after which an undeclared parcel is declared in "abandono no infraccional". */
export const ABANDONMENT_DAYS = 30

/**
 * When the reader files the declaration. Correo prices exactly these two situations and nothing
 * in between: see {@link POSTAL_HANDLING_UNPUBLISHED}.
 */
export type DeclarationTiming = 'before-arrival' | 'after-arrival'

/**
 * The hole in the published schedule, kept as text so pages quote it instead of inventing a
 * number. Correo prices "before arrival" and "within 10 days of the retention notice", and then
 * jumps straight to the 30-day abandonment. What the charge is on day 11-29 is NOT published, so
 * we do not price it — we tell the reader to ask before the 30 days run out.
 */
export const POSTAL_HANDLING_UNPUBLISHED =
  'Correo publica el cargo para dos momentos: antes del arribo y dentro de los 10 días de la notificación de retención. Qué se cobra entre el día 11 y el 30 no está publicado; a los 30 días el envío pasa a «abandono no infraccional». Si se te pasó el plazo, consultá al 0800 2108 antes de que corran los 30 días.'

export interface PostalHandlingInput {
  /** Tax actually paid for the shipment, in USD — the base of the 5%. */
  taxUsd: number
  /** When the declaration is filed. Defaults to `'before-arrival'`, the cheap path. */
  timing?: DeclarationTiming
  /** Whether the shipment went under franquicia: Correo waives the 5% in that case. */
  useFranchise?: boolean
}

export interface PostalHandlingResult {
  /** Fixed part: 1,5 or 5 USD. */
  baseUsd: number
  /** Variable part: 5% of the tax paid, or 0 under franquicia. */
  pctUsd: number
  /** What Correo adds to the tax. */
  totalUsd: number
  /** Label for a breakdown row, spelling out how it was built. */
  label: string
}

/** Round to cents without the float dust (0.1 + 0.2 style). */
function cents(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Correo Uruguayo's administrative charge for a postal shipment.
 *
 * Note the interaction that surprises people: the 5% is waived under franquicia, but the
 * franquicia path can still owe IVA (only US-origin invoices up to USD 200 escape it), so
 * "franquicia" does not mean "no charge" — it means US$ 1,50 or US$ 5 flat.
 */
export function postalHandling(input: PostalHandlingInput): PostalHandlingResult {
  const timing: DeclarationTiming = input.timing ?? 'before-arrival'
  const taxUsd = Math.max(input.taxUsd || 0, 0)
  const baseUsd =
    timing === 'after-arrival' ? HANDLING_AFTER_ARRIVAL_USD : HANDLING_BEFORE_ARRIVAL_USD
  const pctUsd = input.useFranchise ? 0 : cents((taxUsd * HANDLING_TAX_PCT) / 100)

  const base = timing === 'after-arrival' ? 'US$ 5' : 'US$ 1,50'
  const label = input.useFranchise
    ? `Gestión del Correo (${base}, sin el 5% por franquicia)`
    : `Gestión del Correo (${base} + ${HANDLING_TAX_PCT}% del impuesto)`

  return { baseUsd, pctUsd, totalUsd: cents(baseUsd + pctUsd), label }
}
