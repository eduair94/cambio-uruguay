// app/utils/smallClaims.ts
// Los datos de /reclamar-sin-abogado-uruguay: hasta cuánto se puede reclamar en Uruguay sin
// abogado, por qué vía y con qué plazos.
//
// POR QUÉ EXISTE. El sitio ya explica que Defensa del Consumidor «concilia y sanciona, pero no
// ordena que te devuelvan la plata: la multa la cobra el Estado y la restitución la ordena un
// juez» (`/defensa-al-consumidor-uruguay`). Esa frase deja al lector en la puerta del juzgado y
// ahí se terminaba: medido el 2026-11-03 con grep sobre `pages/` y `utils/`, el sitio tenía CERO
// menciones de «menor cuantía» y de la Ley 18.507, y las cuatro de «juzgado de paz» eran de paso
// (la multa por no votar y un cargo no autorizado). O sea que la pregunta que sigue —«¿puedo
// reclamar yo, sin pagar un abogado?»— no la contestaba ninguna página.
//
// EL NÚMERO QUE DECIDE, Y POR QUÉ VA EN UR. Las dos puertas tienen tope y los dos topes están en
// unidades reajustables, así que el sitio puede imprimirlos en pesos de hoy con la UR viva, igual
// que `/elecciones-bps-2026` hace con la multa: 100 UR para el proceso de consumo de la Ley 18.507
// y 20 UR para el resto de los asuntos ante Juzgados de Paz y de Conciliación (CGP art. 37.2
// literal A). Los pesos NO se guardan acá: se calculan al renderizar con `smallClaimPesos`, y si
// la UR no vino viva la página muestra sólo las UR.
//
// LO QUE NO SE AFIRMA. La competencia por monto de los Juzgados de Paz de la Ley 15.750 (arts. 72
// y 73) está escrita en NUEVOS PESOS de 1985 y el texto de IMPO no trae ninguna conversión
// vigente, así que acá no aparece ningún monto de competencia: la Ley 18.507 manda al «Juzgado de
// Paz que corresponda» y eso es lo que se publica. Tampoco se publica el arancel de un abogado ni
// cuánto sale un juicio ordinario, que no los fija una norma que se pueda citar.
//
// FUENTES PRIMARIAS, todas leídas el 2026-11-03 en impo.com.uy («Documento Actualizado»):
//   - Ley 18.507 (promulgada 26/06/2009, publicada 07/07/2009), arts. 1 a 6: el proceso de menor
//     cuantía en relaciones de consumo. https://www.impo.com.uy/bases/leyes/18507-2009
//   - CGP (Ley 15.982) art. 37, redacción dada por el art. 1 de la Ley 19.090: asistencia letrada
//     obligatoria y sus dos excepciones.
//     https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988/37
//   - CGP art. 117: qué tiene que decir la demanda.
//   - CGP art. 293: la conciliación previa es preceptiva antes de cualquier proceso.
//   - CGP art. 294: de qué asuntos se exceptúa (el numeral 6, las relaciones de consumo de la
//     Ley 18.507, lo agregó la Ley 19.149).
//   - CGP art. 340: qué pasa si una de las partes no va a la audiencia.

/** Cuándo se leyeron por última vez las normas citadas. ISO. */
export const SMALL_CLAIMS_VERIFIED_AT = '2026-11-03'

/** Tope del proceso de consumo de la Ley 18.507, art. 1. */
export const CONSUMER_CLAIM_CAP_UR = 100

/** Tope general sin abogado ante Juzgados de Paz y de Conciliación: CGP art. 37.2 literal A. */
export const GENERAL_NO_LAWYER_UR = 20

/** Timbre del Poder Judicial de la Ley 18.507, art. 4: 1 % de lo reclamado. */
export const CONSUMER_CLAIM_STAMP_PCT = 1

/** Caducidad de la acción sumaria de la Ley 18.507, art. 5. */
export const CONSUMER_CLAIM_CADUCIDAD_MONTHS = 12

/** Testigos por parte en la audiencia (Ley 18.507, art. 2.3). */
export const CONSUMER_CLAIM_MAX_WITNESSES = 3

/**
 * Un tope en UR pasado a pesos. `null` cuando no hay UR viva: la página muestra sólo las UR en vez
 * de inventar un número, que es la regla de `/elecciones-bps-2026`.
 */
export function smallClaimPesos(ur: number, urValue: number | null | undefined): number | null {
  if (!Number.isFinite(ur) || ur <= 0) return null
  if (urValue == null || !Number.isFinite(urValue) || urValue <= 0) return null
  return Math.round(ur * urValue)
}

/** El timbre del art. 4 sobre un monto reclamado. */
export function consumerClaimStamp(amountUyu: number): number | null {
  if (!Number.isFinite(amountUyu) || amountUyu <= 0) return null
  return Math.round((amountUyu * CONSUMER_CLAIM_STAMP_PCT) / 100)
}

/** Una de las dos puertas, con su tope y su norma. */
export interface SmallClaimRoute {
  id: 'consumo' | 'general'
  label: string
  /** Hasta cuánto se puede comparecer sin abogado, en UR. */
  capUr: number
  /** Ante quién se presenta, tal como lo nombra la norma. */
  court: string
  /** Qué asuntos entran. */
  scope: string
  articulo: string
  /** Si hay que pedir audiencia de conciliación previa antes de demandar. */
  conciliacionPrevia: boolean
}

export const SMALL_CLAIM_ROUTES: readonly SmallClaimRoute[] = [
  {
    id: 'consumo',
    label: 'Reclamo de consumo',
    capUr: CONSUMER_CLAIM_CAP_UR,
    court: 'Juzgado de Paz que corresponda',
    scope:
      'Pretensiones referidas a relaciones de consumo de la Ley 17.250 cuando el valor total de lo reclamado en la demanda no supera las 100 UR.',
    articulo: 'Ley 18.507, arts. 1 y 3',
    conciliacionPrevia: false,
  },
  {
    id: 'general',
    label: 'Cualquier otro asunto',
    capUr: GENERAL_NO_LAWYER_UR,
    court: 'Juzgado de Paz o Juzgado de Conciliación',
    scope:
      'Asuntos de cuantía menor a 20 UR ante Juzgados de Paz y de Conciliación. Por encima de ese monto el escrito necesita firma de abogado, y sin ella el tribunal lo rechaza de plano.',
    articulo: 'CGP arts. 37.2 literal A y 37.6',
    conciliacionPrevia: true,
  },
]

/** Un paso del proceso de la Ley 18.507, con el plazo que la propia ley le pone. */
export interface SmallClaimStep {
  id: string
  label: string
  detail: string
  articulo: string
}

export const CONSUMER_CLAIM_STEPS: readonly SmallClaimStep[] = [
  {
    id: 'solicitud',
    label: 'Pedís la audiencia',
    detail:
      'Un escrito ante el Juzgado de Paz con los datos de una demanda y el monto máximo que reclamás. No necesitás abogado.',
    articulo: 'Ley 18.507, arts. 2.1 y 3',
  },
  {
    id: 'fijacion',
    label: 'El juez la fija en 48 horas',
    detail:
      'La audiencia se señala dentro de las 48 horas de la solicitud y se celebra dentro de los 30 días como máximo. Al demandado se lo notifica personalmente; vos quedás notificado en el acto.',
    articulo: 'Ley 18.507, art. 2.1',
  },
  {
    id: 'audiencia',
    label: 'Audiencia pública, con conciliación primero',
    detail:
      'Cada parte expone su posición y ofrece su prueba, y recién después se intenta conciliar. El acuerdo que se logre tiene el efecto de una sentencia ejecutoriada pasada en cosa juzgada.',
    articulo: 'Ley 18.507, art. 2.2',
  },
  {
    id: 'prueba',
    label: 'Hasta tres testigos por parte',
    detail:
      'Si no hay acuerdo se recibe la prueba en la misma audiencia, con un máximo de tres testigos por parte. El juez los interroga con amplias facultades y la audiencia se puede prorrogar una sola vez, por hasta 15 días.',
    articulo: 'Ley 18.507, arts. 2.3 y 2.4',
  },
  {
    id: 'sentencia',
    label: 'Sentencia al cerrar la audiencia',
    detail:
      'El juez falla al final de la audiencia y sólo en casos excepcionales lo difiere hasta tres días. Las costas y costos son, en principio, del vencido.',
    articulo: 'Ley 18.507, art. 2.5',
  },
  {
    id: 'recursos',
    label: 'Sin apelación',
    detail:
      'Contra la sentencia definitiva sólo caben aclaración y ampliación, y la ampliación se pide y se resuelve en la propia audiencia. El juez puede rechazar de plano cualquier incidente y esa decisión no admite recurso.',
    articulo: 'Ley 18.507, art. 2.6',
  },
]

/** Lo que el escrito tiene que decir: CGP art. 117, que la Ley 18.507 art. 2.1 le exige. */
export const CLAIM_CONTENT: readonly string[] = [
  'El juzgado al que te dirigís',
  'Tu nombre, documento de identidad y domicilios',
  'El nombre y el domicilio de quien reclamás',
  'Los hechos en párrafos numerados, el derecho invocado y la prueba',
  'El petitorio, formulado con precisión: qué pedís',
  'El valor de la causa, determinado con precisión',
  'Tu firma (la del abogado sólo si la ley no te exime)',
]

/** Qué pasa si una parte no va a la audiencia (CGP art. 340, aplicable por Ley 18.507 art. 2.2). */
export interface AbsenceOutcome {
  who: string
  outcome: string
  articulo: string
}

export const ABSENCE_OUTCOMES: readonly AbsenceOutcome[] = [
  {
    who: 'No vas vos',
    outcome:
      'Se tiene como desistimiento de tu pretensión, aunque el demandado tampoco haya ido. Se declara en la misma audiencia y la podés recurrir por reposición y apelación con efecto suspensivo.',
    articulo: 'CGP art. 340.2',
  },
  {
    who: 'No va el demandado',
    outcome:
      'La audiencia no se aplaza y el tribunal tiene por ciertos los hechos que afirmaste, salvo prueba en contrario. En ese caso el juez falla de inmediato y la condena no puede pasar del monto que pediste.',
    articulo: 'CGP art. 340.3 y Ley 18.507 art. 2.2',
  },
]

/** Un asunto exceptuado de la conciliación previa del CGP art. 293. */
export const CONCILIATION_EXCEPTIONS: readonly string[] = [
  'Relaciones de consumo por el proceso de la Ley 18.507',
  'Familia, arrendamientos y materia laboral (lo laboral concilia en vía administrativa)',
  'Procesos que no tramitan por la vía contenciosa ordinaria',
  'Medidas preparatorias, pretensiones nuevas en un juicio ya iniciado e intervención de terceros',
  'Pretensiones de nulidad de actos de personas públicas no estatales',
  'Cuando una ley excluye expresamente la conciliación',
  'La acción de repetición del artículo 25 de la Constitución, cuando la ley la regula',
]

export interface SmallClaimSource {
  label: string
  url: string
  /** ISO. Cuándo se leyó. */
  checkedAt: string
}

export const SMALL_CLAIMS_SOURCES: readonly SmallClaimSource[] = [
  {
    label: 'Ley 18.507 — proceso de menor cuantía en relaciones de consumo (texto actualizado)',
    url: 'https://www.impo.com.uy/bases/leyes/18507-2009',
    checkedAt: SMALL_CLAIMS_VERIFIED_AT,
  },
  {
    label: 'CGP art. 37 — asistencia letrada obligatoria y sus excepciones (Ley 19.090)',
    url: 'https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988/37',
    checkedAt: SMALL_CLAIMS_VERIFIED_AT,
  },
  {
    label: 'CGP art. 117 — forma y contenido de la demanda',
    url: 'https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988/117',
    checkedAt: SMALL_CLAIMS_VERIFIED_AT,
  },
  {
    label: 'CGP art. 293 — conciliación previa: regla general y preceptividad',
    url: 'https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988/293',
    checkedAt: SMALL_CLAIMS_VERIFIED_AT,
  },
  {
    label: 'CGP art. 294 — asuntos exceptuados de la conciliación previa',
    url: 'https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988/294',
    checkedAt: SMALL_CLAIMS_VERIFIED_AT,
  },
  {
    label: 'CGP art. 340 — audiencia preliminar: inasistencia de las partes',
    url: 'https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988/340',
    checkedAt: SMALL_CLAIMS_VERIFIED_AT,
  },
]

/**
 * Las preguntas frecuentes. Cada respuesta nombra su artículo: es la regla de este archivo y lo
 * que hace que el `FAQPage` que `FaqSection` publica no afirme nada que la norma no diga.
 *
 * Los montos en pesos NO van acá —dependen de la UR del día— y por eso ninguna respuesta los trae:
 * la que necesita el número manda a la tabla de arriba, que se calcula al renderizar.
 */
export const SMALL_CLAIMS_FAQ = [
  {
    id: 'puedo-sin-abogado',
    question: '¿Puedo reclamar sin abogado en Uruguay?',
    answer:
      'En dos casos. En un reclamo de consumo por la Ley 18.507 la comparecencia «no requerirá asistencia letrada obligatoria» (art. 3) y el tope es de 100 UR de lo reclamado (art. 1). Fuera del consumo, el CGP exige abogado en todos los actos del proceso (art. 37.1) y sólo exceptúa los asuntos de cuantía menor a 20 UR ante Juzgados de Paz y de Conciliación, más el caso del interior donde no haya tres abogados en la localidad (art. 37.2).',
  },
  {
    id: 'cuanto-sale',
    question: '¿Cuánto cuesta presentar el reclamo de consumo?',
    answer:
      'Las partes «sólo deberán reponer un timbre» del Poder Judicial equivalente al 1 % del monto reclamado (Ley 18.507, art. 4). Las costas y costos del juicio son, en principio, de la parte vencida, aunque el juez puede apartarse de esa regla fundándolo (art. 2.5).',
  },
  {
    id: 'conciliacion-previa',
    question: '¿Tengo que ir a conciliación antes de demandar?',
    answer:
      'En el proceso de consumo de la Ley 18.507, no: el numeral 6 del artículo 294 del CGP lo exceptúa expresamente. En los demás asuntos sí, porque antes de iniciar cualquier proceso hay que pedir audiencia de conciliación ante el Juzgado de Paz o de Conciliación del domicilio del demandado (CGP art. 293). Se prescinde de ella si no conocés el domicilio del demandado, si el demandado es desconocido o si vive fuera del departamento del tribunal competente.',
  },
  {
    id: 'cuanto-tarda',
    question: '¿Cuánto tarda?',
    answer:
      'El juez señala la audiencia dentro de las 48 horas de la solicitud y la celebra dentro de los 30 días como máximo (Ley 18.507, art. 2.1). Puede prorrogarla una sola vez por hasta 15 días (art. 2.4) y falla al final de la audiencia, difiriéndolo hasta tres días sólo en casos excepcionales (art. 2.5).',
  },
  {
    id: 'plazo',
    question: '¿Hasta cuándo puedo usar esta vía?',
    answer:
      'La acción por este procedimiento sumario caduca al año de verificado el acto, hecho u omisión que la funda, sin perjuicio de los plazos de la Ley 17.250 (Ley 18.507, art. 5). Que caduque no te cierra el reclamo: el mismo artículo deja abierta la vía del proceso ordinario o extraordinario, que ya pide abogado.',
  },
  {
    id: 'apelacion',
    question: '¿Se puede apelar la sentencia?',
    answer:
      'No. Contra la sentencia definitiva sólo caben los recursos de aclaración y ampliación, y la ampliación se deduce y se resuelve en la propia audiencia (Ley 18.507, art. 2.6). Las providencias interlocutorias admiten reposición, y el rechazo de plano de un incidente no admite recurso.',
  },
  {
    id: 'no-va-la-empresa',
    question: '¿Qué pasa si la empresa no va a la audiencia?',
    answer:
      'La audiencia no se aplaza y el tribunal «tendrá por ciertos los hechos afirmados por el actor», salvo prueba en contrario (CGP art. 340.3, aplicable por el art. 2.2 de la Ley 18.507). En ese caso no se recibe prueba, el juez falla de inmediato y la condena no puede exceder el monto de la solicitud. Al revés también tiene consecuencia: si el que no va sos vos, se tiene como desistimiento de tu pretensión (CGP art. 340.2).',
  },
  {
    id: 'que-poner-en-el-escrito',
    question: '¿Qué tengo que poner en el escrito?',
    answer:
      'Lo que el artículo 117 del CGP le pide a una demanda, más el monto máximo que reclamás (Ley 18.507, art. 2.1): el juzgado al que te dirigís, tu nombre, documento y domicilios, el nombre y domicilio de quien reclamás, los hechos en párrafos numerados con el derecho invocado y la prueba, el petitorio formulado con precisión y el valor de la causa determinado con precisión.',
  },
] as const
