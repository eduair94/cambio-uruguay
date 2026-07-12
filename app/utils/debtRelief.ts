// app/utils/debtRelief.ts
// Pure data + maths for /saldar-deudas-uruguay (and shared with tests). No Vue/Nuxt.
//
// Three things this module owns that the rest of the site does not:
//   1. checkPrescription() — does a debt's collection right MAY have prescribed?
//      Plazos are the post-LUC (Ley 19.889) civil/commercial terms. This only
//      tells the user the legal window; prescription is NOT automatic (has to be
//      opposed in court, CC art. 1191) and ANY acknowledgment — paying a cuota,
//      paying interest, signing an "acuerdo" — resets it (CC arts. 1189/1234).
//   2. A transparent weighted RUBRIC scoring debt-relief services 0–100.
//   3. Dated baselines (usury caps, refi rates) that a monthly Gemini job refreshes.
//
// Informativo, no asesoramiento financiero.

export interface PrescriptionType {
  id: string
  label: string
  /** Prescription window in months. */
  months: number
  /** Legal source (norm + article). */
  norma: string
  /** Short plain-language note. */
  nota: string
}

/** Verified plazos (IMPO, post-LUC Ley 19.889). See spec §4.4 / research. */
export const PRESCRIPTION_TYPES: readonly PrescriptionType[] = Object.freeze([
  {
    id: 'prestamo_personal',
    label: 'Préstamo personal / obligación personal',
    months: 120,
    norma: 'Código Civil art. 1216 (redacción Ley 19.889 / LUC)',
    nota: 'Acción personal por deuda exigible: 10 años. La vía ejecutiva (juicio rápido) se pierde a los 5 años (art. 1217).',
  },
  {
    id: 'deuda_comercial',
    label: 'Deuda comercial general',
    months: 120,
    norma: 'Código de Comercio art. 1018 (redacción Ley 19.889 / LUC)',
    nota: 'Obligaciones comerciales: 10 años (antes de la LUC eran 20).',
  },
  {
    id: 'pagare_vale',
    label: 'Vale, conforme o pagaré',
    months: 48,
    norma: 'Código de Comercio art. 1019 num. 1',
    nota: '4 años desde el vencimiento, si la deuda no fue reconocida por documento separado.',
  },
  {
    id: 'letra_cambio',
    label: 'Letra de cambio (contra el aceptante)',
    months: 36,
    norma: 'Decreto-Ley de Títulos Valores 14.701 art. 116',
    nota: '3 años desde el vencimiento contra el aceptante; 1 año contra endosantes y librador.',
  },
  {
    id: 'intereses_periodico',
    label: 'Intereses, cuotas y pagos periódicos',
    months: 48,
    norma: 'Código Civil art. 1222',
    nota: 'Intereses, arriendos y todo lo que se paga por años o plazos periódicos: 4 años.',
  },
  {
    id: 'comercio_mercaderia',
    label: 'Mercadería fiada / géneros vendidos por comercio',
    months: 24,
    norma: 'Código Civil art. 1223 / Código de Comercio art. 1020',
    nota: 'Precio de géneros vendidos por comerciantes y honorarios profesionales: 2 años (deudor domiciliado en el país).',
  },
  {
    id: 'cheque',
    label: 'Cheque',
    months: 6,
    norma: 'Ley de Cheques 14.412 art. 68',
    nota: '6 meses desde el vencimiento del plazo de presentación.',
  },
])

export interface PrescriptionResult {
  plazoLabel: string
  months: number
  monthsElapsed: number
  monthsRemaining: number
  mayHaveExpired: boolean
  norma: string
  caveat: string
}

const PRESCRIPTION_CAVEAT =
  'Ojo: la prescripción NO es automática — hay que oponerla como excepción en un juicio (CC art. 1191) y no la aplica el juez de oficio. Y cualquier reconocimiento (pagar una cuota, pagar intereses, firmar un acuerdo o pedir plazo) la reinicia o la renuncia (CC arts. 1189 y 1234). No reconozcas ni pagues una deuda vieja sin asesorarte con un abogado.'

/** Whole months between two ISO dates (a ≤ b), floor. */
function monthsBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO)
  const b = new Date(bISO)
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) m -= 1
  return m
}

/**
 * Does this debt's collection right MAY have prescribed? Returns null for an
 * unknown type or a future lastActionISO. `todayISO` is a parameter (not
 * Date.now()) so the function is deterministic and testable.
 */
export function checkPrescription(
  typeId: string,
  lastActionISO: string,
  todayISO: string
): PrescriptionResult | null {
  const type = PRESCRIPTION_TYPES.find(t => t.id === typeId)
  if (!type) return null
  const last = new Date(lastActionISO)
  const today = new Date(todayISO)
  if (!Number.isFinite(last.getTime()) || !Number.isFinite(today.getTime())) return null
  if (last.getTime() > today.getTime()) return null

  const monthsElapsed = Math.max(0, monthsBetween(lastActionISO, todayISO))
  const monthsRemaining = Math.max(0, type.months - monthsElapsed)
  return {
    plazoLabel: type.label,
    months: type.months,
    monthsElapsed,
    monthsRemaining,
    mayHaveExpired: monthsElapsed >= type.months,
    norma: type.norma,
    caveat: PRESCRIPTION_CAVEAT,
  }
}
