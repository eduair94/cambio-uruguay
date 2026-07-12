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
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
  if (b.getUTCDate() < a.getUTCDate()) m -= 1
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

export interface Myth {
  myth: string
  truth: string
  norma: string
}

export const DEBT_MYTHS: readonly Myth[] = Object.freeze([
  {
    myth: '"Pagar me borra del Clearing."',
    truth:
      'No. La deuda pagada queda registrada como "cancelada" hasta 5 años (no renovable); en la práctica Equifax la mantiene unos 3 años. Pagar mejora tu situación a futuro, pero no borra el antecedente.',
    norma: 'Ley 18.331 art. 22',
  },
  {
    myth: '"La deuda caduca sola a los 10 años."',
    truth:
      'La deuda no desaparece sola. Lo que caduca es tu registro en el Clearing (5 años + 5 renovable una vez) y lo que prescribe es el derecho a cobrarte por juicio (10 años la acción personal, 5 la vía ejecutiva, 4 el pagaré, 6 meses el cheque). Y la prescripción hay que oponerla: no la aplica el juez de oficio.',
    norma: 'CC arts. 1216, 1217, 1191; CCom 1019; Ley 14.412 art. 68',
  },
  {
    myth: '"Si arreglo un pago, no pierdo nada."',
    truth:
      'Cuidado: pagar una cuota, pagar intereses o firmar un "acuerdo" sobre una deuda ya prescrita la RESUCITA (es renuncia tácita a la prescripción y reinicia el plazo). Verificá la prescripción ANTES de reconocer o pagar nada.',
    norma: 'CC arts. 1189, 1234; CCom 1026',
  },
  {
    myth: '"Me pueden embargar el sueldo / meter preso."',
    truth:
      'El sueldo es inembargable salvo por tributos o pensión alimenticia (hasta 1/3, o 1/2 alimentos a menores), y siempre debés conservar como mínimo el 35% líquido. Y no hay cárcel por deudas civiles o comerciales.',
    norma: 'CGP art. 381; Ley 17.829 art. 3; Constitución art. 52',
  },
])

export interface Step {
  title: string
  detail: string
}

export const NEGOTIATION_STEPS: readonly Step[] = Object.freeze([
  {
    title: 'Diagnóstico gratis primero',
    detail:
      'Consultá tu situación sin costo en la Central de Riesgos del BCU (consultadeuda.bcu.gub.uy) y pedí tu informe de Clearing gratis, que te corresponde una vez cada 6 meses. Antes de hablar con nadie, sabé exactamente qué debés y a quién.',
  },
  {
    title: 'Entendé quién tiene tu deuda hoy',
    detail:
      'Si ya pasó a una recuperadora, esa empresa te la compró a centavos (a veces ~10% del nominal). Eso te da poder: le sirve cobrar algo antes que nada.',
  },
  {
    title: 'Anclá en el capital original',
    detail:
      'Anotá cuánto pediste de verdad y negociá sobre ese número, no sobre el total inflado con intereses y gastos. Los intereses que te quieren cobrar son lo primero que se recorta.',
  },
  {
    title: 'Ofrecé pago contado por una quita',
    detail:
      'La quita más grande aparece pagando de una. Táctica que reportan usuarios de r/uruguay: "tengo esto para hoy, más no". Usuarios reportan quitas de 54.000→12.000 (~78%) con financieras y 240.000→50.000 con un banco vía estudio.',
  },
  {
    title: 'Exigí el acuerdo por escrito ANTES de pagar',
    detail:
      'Pedí el acuerdo y la carta de cancelación / finiquito por escrito antes de transferir un peso. Nunca pagues por Abitab de palabra: el doble cobro (te reclaman una deuda que ya pagaste) es un fraude común.',
  },
  {
    title: 'Priorizá por la tasa más cara',
    detail:
      'Si tenés varias deudas, atacá primero la de mayor TEA. Usá el simulador de /salir-del-clearing para ver el orden y cuánto te ahorra.',
  },
  {
    title: 'Guardá todo',
    detail:
      'Comprobantes, el acuerdo firmado y la constancia de cancelación. Con eso pedís la baja del registro y te cubrís de reclamos futuros.',
  },
])

export const CREDIT_REBUILD_STEPS: readonly Step[] = Object.freeze([
  {
    title: 'Pagá en tiempo y forma, y esperá',
    detail:
      'Reconstruir es cuestión de historial nuevo y limpio. El antecedente "cancelada con atraso" queda 3-5 años; no hay atajo que lo borre antes.',
  },
  {
    title: 'Ojo con la lista negra interna del banco',
    detail:
      'Cada banco guarda su propio registro. El banco donde fallaste puede no darte crédito aunque el Clearing esté limpio. A veces conviene reconstruir en otra institución.',
  },
  {
    title: 'Empezá con un producto chico y bien pagado',
    detail:
      'Una tarjeta de límite bajo o prepaga, usada y pagada al día, genera historial positivo. Consistencia y tiempo, no monto.',
  },
  {
    title: 'Refinanciar puede ayudar (con criterio)',
    detail:
      'Consolidar varias deudas caras en una más barata baja tu TEA y ordena las cuotas. Pero no saques un préstamo caro para pagar otro: eso es la "calesita" y agranda el pozo.',
  },
])

export interface VerdictCase {
  situation: string
  advice: string
  tone: 'good' | 'neutral' | 'warn'
}

export const VERDICT_CASES: readonly VerdictCase[] = Object.freeze([
  {
    situation: 'Tu deuda sigue en el acreedor original (banco o financiera)',
    advice:
      'Andá directo a su canal de regularización (por ejemplo BROU Autogestión). No necesitás intermediario: cualquier plataforma te va a mandar igual a negociar con ellos.',
    tone: 'good',
  },
  {
    situation: 'Ya la tiene una recuperadora / estudio de cobranza',
    advice:
      'Vas a negociar con ellos de todos modos. Una plataforma puede agilizar el trámite, pero verificá quién está detrás y exigí el acuerdo escrito y el finiquito antes de pagar.',
    tone: 'neutral',
  },
  {
    situation: 'No sabés qué deudas tenés ni con quién',
    advice:
      'Empezá GRATIS: Central de Riesgos del BCU + informe de Clearing. Recién ahí decidí. No entregues tu cédula ni tus datos a una plataforma solo para "ver qué debés".',
    tone: 'neutral',
  },
  {
    situation: 'Te prometen "borrarte del Clearing" pagando una tarifa',
    advice:
      'Es imposible y engañoso: del Clearing se sale pagando o por el paso del tiempo, no por una gestión pagada. No pagues por eso.',
    tone: 'warn',
  },
])

export interface UsuryCap {
  segmento: string
  tasaMedia: number
  topeTasa: number
  topeMora: number
}

export interface DebtReliefBaseline {
  asOf: string
  period: string
  usuryCaps: UsuryCap[]
  refiRates: { institucion: string; producto: string; tasa: string; nota: string }[]
}

/**
 * Dated verified snapshot. The monthly Gemini task overrides usuryCaps/refiRates
 * when it finds fresher, in-band values; otherwise this baseline is served as-is.
 * Verified figures: BCU "Tasas medias", período marzo–mayo 2026 (topes vigentes
 * desde el 1/7/2026). See spec §4.9 and research.
 */
export const DEBT_RELIEF_BASELINE: DebtReliefBaseline = Object.freeze({
  asOf: '2026-07-01',
  period: 'marzo–mayo 2026 (topes vigentes desde el 1/7/2026)',
  usuryCaps: [
    {
      segmento: 'Consumo con autorización de descuento, < 10.000 UI',
      tasaMedia: 21.16,
      topeTasa: 32.798,
      topeMora: 38.088,
    },
    {
      segmento: 'Consumo sin autorización de descuento, < 10.000 UI',
      tasaMedia: 80.72,
      topeTasa: 125.116,
      topeMora: 145.296,
    },
  ],
  refiRates: [
    {
      institucion: 'BBVA',
      producto: 'Préstamo Personal Unificación de Deuda',
      tasa: '24% en $ / 9% en UI (hasta 60 cuotas)',
      nota: 'Único que cancela deuda en OTRAS instituciones. Exige no tener antecedentes en Clearing ni BCU.',
    },
    {
      institucion: 'Itaú',
      producto: 'Reorganizá tus deudas',
      tasa: '42% TEA',
      nota: 'Solo unifica deuda propia dentro de Itaú.',
    },
    {
      institucion: 'OCA',
      producto: 'Reorganización de préstamos',
      tasa: '39–87% + IVA',
      nota: 'Solo saldo propio de OCA; exige tener >50% de las cuotas pagas.',
    },
    {
      institucion: 'ANDA',
      producto: 'Préstamo personal',
      tasa: '27,40–32,20% + IVA',
      nota: 'Cooperativa: presta estando en el Clearing (puede pedir garantía).',
    },
    {
      institucion: 'BROU',
      producto: 'Consumo / reestructura de morosos',
      tasa: 'Con retención 21–28% + IVA; sin retención 26–31% + IVA',
      nota: 'Campaña de reestructura: quita de intereses + bonificación de tasa para atrasos >360 días.',
    },
  ],
})

// Shape returned by /api/debt-relief (baseline + live overrides). Declared here
// so the page can import it from the pure util without reaching into server/.
export interface LiveDebtRelief extends Omit<DebtReliefBaseline, 'asOf'> {
  asOf: string | null
  updated: string[]
  sources: { label: string; url: string }[]
}
