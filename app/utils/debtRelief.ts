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

export type RubricId =
  | 'transparencia'
  | 'costo'
  | 'independencia'
  | 'privacidad'
  | 'utilidad'
  | 'constancia'

export interface RubricDimension {
  id: RubricId
  label: string
  weight: number
  what: string
}

/** Transparent weighted rubric. Weights sum to 100 (see spec §4.6). */
export const RELIEF_RUBRIC: readonly RubricDimension[] = Object.freeze([
  {
    id: 'transparencia',
    label: 'Transparencia',
    weight: 20,
    what: 'Se sabe quién está detrás (razón social, RUT, prensa real vs. contenido pago).',
  },
  {
    id: 'costo',
    label: 'Costo para vos',
    weight: 15,
    what: 'Cuánto te cuesta a vos, el deudor, usar el servicio.',
  },
  {
    id: 'independencia',
    label: 'Independencia',
    weight: 20,
    what: '¿Es un tercero neutral, o el brazo de una cobranza / del propio buró que te reporta?',
  },
  {
    id: 'privacidad',
    label: 'Privacidad de datos',
    weight: 15,
    what: 'Qué datos te pide y qué tan coherente es su política con lo que hace.',
  },
  {
    id: 'utilidad',
    label: 'Utilidad real',
    weight: 15,
    what: 'Qué tanto te acerca de verdad a saldar la deuda, y con qué cobertura.',
  },
  {
    id: 'constancia',
    label: 'Constancia de cancelación',
    weight: 15,
    what: '¿Te deja un finiquito por escrito y gestiona la baja del registro?',
  },
])

export interface ReliefService {
  id: string
  name: string
  operador: string
  quienPaga: string
  bcuRegulado: boolean
  documenta: string
  transparencia: string
  scores: Record<RubricId, number>
  sources: { label: string; url: string }[]
}

/**
 * Scores are our best objective judgement from web research + an adversarial
 * fact-check pass; conservative where a service's terms are unpublished. Each
 * factual field is sourced. Critical but fair — never "estafa".
 */
export const RELIEF_SERVICES: readonly ReliefService[] = Object.freeze([
  {
    id: 'negociar_directo',
    name: 'Negociar directo con el acreedor',
    operador: 'Vos mismo (sin intermediario)',
    quienPaga: 'Nadie: es gratis',
    bcuRegulado: false,
    documenta: 'Vos exigís la carta de cancelación / finiquito al acreedor',
    transparencia:
      'Total: sabés exactamente con quién hablás y qué firmás. Requiere tu tiempo y algo de temple.',
    scores: {
      transparencia: 100,
      costo: 100,
      independencia: 100,
      privacidad: 100,
      utilidad: 70,
      constancia: 90,
    },
    sources: [
      {
        label: 'Central de Riesgos BCU (consulta gratis)',
        url: 'https://consultadeuda.bcu.gub.uy/consultadeuda/',
      },
      {
        label: 'r/uruguay: negociación directa (evidencia de usuarios)',
        url: 'https://reddit.com/r/uruguay/comments/1dhwy89',
      },
    ],
  },
  {
    id: 'brou_autogestion',
    name: 'BROU — Autogestión de Deuda',
    operador: 'Banco República (banco estatal, regulado BCU)',
    quienPaga: 'Es el propio acreedor: sin intermediario',
    bcuRegulado: true,
    documenta: 'Acuerdo de refinanciación / cancelación del propio banco',
    transparencia: 'Alta: es tu acreedor directo. Solo sirve para deudas con BROU.',
    scores: {
      transparencia: 95,
      costo: 100,
      independencia: 85,
      privacidad: 90,
      utilidad: 70,
      constancia: 90,
    },
    sources: [
      { label: 'BROU Autogestión de Deudas', url: 'https://autogestiondeudas.brou.com.uy/' },
      {
        label: 'BROU — Reestructuración de deuda',
        url: 'https://www.brou.com.uy/personas/reestructuracion-de-deuda',
      },
    ],
  },
  {
    id: 'ponete_al_dia',
    name: 'Ponete al Día',
    operador: 'WEDKOL S.A. (Alpréstamo) + Equifax Uruguay S.A.',
    quienPaga: 'El acreedor (no vos)',
    bcuRegulado: false,
    documenta: 'Depende del acreedor adherido',
    transparencia:
      'Operadores identificados en sus Términos, pero lo corre el propio buró de crédito (Equifax) que te reporta: conflicto de interés notorio.',
    scores: {
      transparencia: 70,
      costo: 100,
      independencia: 20,
      privacidad: 55,
      utilidad: 65,
      constancia: 60,
    },
    sources: [{ label: 'Ponete al Día (Uruguay)', url: 'https://ponetealdia.com/uy' }],
  },
  {
    id: 'mideuda',
    name: 'MiDeuda',
    operador: 'Requiro SRL (cobranza/BPO; RUT 217697220017)',
    quienPaga: 'El acreedor: % sobre lo que recauda (a vos no te cobra)',
    bcuRegulado: false,
    documenta: 'No borra el registro; la deuda figura mientras la financiera lo informe',
    transparencia:
      'Operada por Requiro (confirmado por LinkedIn de sus fundadores). Pero su propia política deja el RUT de "MiDeuda S.A." como plantilla sin completar, y pide escaneo del documento con la cámara.',
    scores: {
      transparencia: 55,
      costo: 100,
      independencia: 30,
      privacidad: 40,
      utilidad: 65,
      constancia: 55,
    },
    sources: [
      { label: 'MiDeuda', url: 'https://mideuda.com.uy/' },
      { label: 'Requiro (operador)', url: 'https://www.requiro.com.uy/' },
    ],
  },
  {
    id: 'zeroatraso',
    name: 'ZeroAtraso',
    operador: 'Empresa regional (Argentina/Uruguay/Perú)',
    quienPaga: 'El acreedor: dice no cobrar honorarios al deudor',
    bcuRegulado: false,
    documenta: 'Acuerdos con bancos/financieras adheridos',
    transparencia:
      'Declara "no te cobramos honorarios", pero es extranjera, atención por WhatsApp AR, y no queda claro con qué acreedores uruguayos tiene convenio.',
    scores: {
      transparencia: 45,
      costo: 100,
      independencia: 40,
      privacidad: 50,
      utilidad: 55,
      constancia: 50,
    },
    sources: [{ label: 'ZeroAtraso', url: 'https://zeroatraso.com' }],
  },
  {
    id: 'chaudeudas',
    name: 'ChauDeudas',
    operador: 'Chau Deudas SAS (Ituzaingó 1324/501, Montevideo)',
    quienPaga: 'El acreedor (ChauDeudas dice no recibir tu dinero)',
    bcuRegulado: false,
    documenta: 'No menciona el Clearing ni promete constancia de libre deuda',
    transparencia:
      'Baja: no publica RUT ni fundadores; la única prensa es contenido pago. Su propia API lista 12 acreedores con prefijo "CREDITIA -" (recuperadora de carteras), indicio de que su base viene de cobranza. Su FAQ dice no compartir datos, pero los T&C autorizan usarlos para marketing y transferirlos ante una venta de la empresa.',
    scores: {
      transparencia: 35,
      costo: 100,
      independencia: 35,
      privacidad: 40,
      utilidad: 60,
      constancia: 45,
    },
    sources: [
      { label: 'ChauDeudas', url: 'https://www.chaudeudas.com.uy/' },
      {
        label: 'ChauDeudas — Términos y Condiciones',
        url: 'https://www.chaudeudas.com.uy/legal/terminos_condiciones.json',
      },
    ],
  },
])

const RELIEF_WEIGHT_SUM = RELIEF_RUBRIC.reduce((s, d) => s + d.weight, 0)

/** Weighted 0–100 overall from per-dimension scores. */
export function computeReliefScore(scores: Record<RubricId, number>): number {
  const total = RELIEF_RUBRIC.reduce((s, d) => s + (scores[d.id] ?? 0) * d.weight, 0)
  return Math.round((total / RELIEF_WEIGHT_SUM) * 10) / 10
}

export interface RankedService extends ReliefService {
  rank: number
  overall: number
}

/** Services with computed overall, best-first, 1-indexed rank. */
export function rankedServices(
  services: readonly ReliefService[] = RELIEF_SERVICES
): RankedService[] {
  return services
    .map(s => ({ ...s, overall: computeReliefScore(s.scores), rank: 0 }))
    .sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name))
    .map((s, i) => ({ ...s, rank: i + 1 }))
}
