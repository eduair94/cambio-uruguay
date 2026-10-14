// Cómo se paga el alquiler en Uruguay: qué obliga la ley hoy y qué obligaba hasta 2020.
//
// El sitio ya tiene `/limite-de-efectivo-uruguay` (el tope GENERAL del art. 35 de la Ley 19.210,
// en UI) y `/credito-fiscal-por-alquiler-uruguay` (el 8 % que el inquilino imputa al IRPF). Lo que
// no tenía página es la regla PROPIA del alquiler, que es otro artículo, otra unidad (BPC, no UI) y
// otra consecuencia: entre el 1/12/2015 y 2020 el precio de todo arrendamiento de más de 40 BPC al
// año tenía que acreditarse en una cuenta bancaria del arrendador, con multa de tres alquileres y
// sin acción judicial para quien no lo cumpliera. La Ley 19.889 (LUC) derogó el artículo que lo
// mandaba, y ninguna página del sitio lo decía.
//
// POR QUÉ ESTO ES UN MÓDULO Y NO PROSA EN LA PÁGINA: cada afirmación de abajo lleva su norma, su
// URL y su estado (`vigente` / `derogada` / `sin-base-legal` / `no-resuelto`), y el test al lado
// exige las cuatro cosas. Publicar "se puede pagar en efectivo" sin la cadena de derogación es
// exactamente el error que este repo no comete: la conclusión se sostiene en el texto de la LUC,
// no en lo que se oye decir.
//
// NO HAY NI UNA CIFRA EN PESOS ACÁ, a propósito. Los dos topes que importan están en unidades que
// flotan —40 BPC al año, 200.000 UI por operación— y el valor del día lo tiene el sitio en vivo.
// Congelar su conversión en un literal es el error recurrente del repo; `rentPaymentMeans.test.ts`
// lo vigila con un barrido por `$`.
//
// Verificado contra impo.com.uy el 2026-10-14, artículo por artículo.

import { RENT_CREDIT_PERCENT } from './rentTaxCredit'

/** La fecha en que se cotejó cada norma de este módulo contra su fuente. */
export const RENT_PAYMENT_VERIFIED_ON = '2026-10-14'

/**
 * Qué tan firme es una afirmación.
 *
 * `sin-base-legal` es la categoría que hace falta acá y no existe en otros módulos: el Decreto
 * 264/015 sigue publicado sin nota de derogación, pero el único artículo que reglamentaba está
 * derogado. No es lo mismo que `derogada` ni que `vigente`, y no se puede decir ninguna de las dos.
 */
export type RentPaymentStatus = 'vigente' | 'derogada' | 'sin-base-legal' | 'no-resuelto'

export interface RentPaymentSource {
  readonly label: string
  readonly url: string
}

export interface RentPaymentRule {
  readonly id: string
  /** Encabezado del bloque: la pregunta que contesta. */
  readonly heading: string
  readonly body: string
  /** Cita textual de la norma, cuando la hay. Nunca parafraseada. */
  readonly quote?: string
  /** El artículo del que sale, escrito como se cita. */
  readonly law: string
  readonly url: string
  readonly status: RentPaymentStatus
}

export interface RentPaymentEvent {
  /** Fecha ISO del hecho. */
  readonly on: string
  readonly label: string
  readonly law: string
  readonly url: string
}

export interface RentPaymentFaq {
  readonly question: string
  readonly answer: string
}

// ── Las cifras, todas en la unidad en que las escribe la norma ───────────────

/** Decreto 264/015 art. 1: el régimen derogado alcanzaba a lo que superara 40 BPC en el año civil. */
export const RENT_BANK_RULE_THRESHOLD_BPC = 40
/** Decreto 264/015 art. 12: la multa era de tres veces el precio mensual pactado. */
export const RENT_BANK_RULE_FINE_MONTHS = 3
/** Desde cuándo rigió la obligación de acreditar en cuenta (Decreto 264/015 art. 1). */
export const RENT_BANK_RULE_FROM = '2015-12-01'
/** Promulgación de la Ley 19.889, que derogó el artículo que la mandaba. */
export const RENT_BANK_RULE_REPEALED_ON = '2020-07-09'
/** Ley 19.210 art. 35 lit. a): el tope general de efectivo por operación. */
export const CASH_LIMIT_UI = 200000
/** Ley 19.210 art. 35 lit. b): o el 5 % de la operación… */
export const CASH_LIMIT_SHARE_PCT = 5
/** …con tope de 450.000 UI. */
export const CASH_LIMIT_SHARE_CAP_UI = 450000
/** Decreto 264/015 art. 11: el alquiler turístico admitía efectivo hasta cuatro meses de plazo. */
export const TOURIST_CASH_MAX_MONTHS = 4
/** Y obligaba a depositarlo dentro de un día hábil. */
export const TOURIST_DEPOSIT_BUSINESS_DAYS = 1

// ── Las fuentes ─────────────────────────────────────────────────────────────

const LEY_19210_35 = 'https://www.impo.com.uy/bases/leyes/19210-2014/35'
const LEY_19210_39 = 'https://www.impo.com.uy/bases/leyes/19210-2014/39'
const LUC_224 = 'https://www.impo.com.uy/bases/leyes/19889-2020/224'
const LUC_421 = 'https://www.impo.com.uy/bases/leyes/19889-2020/421'
const DEC_264_015 = 'https://www.impo.com.uy/bases/decretos/264-2015'
const DEC_148_007_14 = 'https://www.impo.com.uy/bases/decretos/148-2007/14'
const TO_17_T7 = 'https://www.impo.com.uy/bases/todgi2023/101-2024/17_T7'
const TO_51_T7 = 'https://www.impo.com.uy/bases/todgi2023/101-2024/51_T7'

export const RENT_PAYMENT_SOURCES: readonly RentPaymentSource[] = Object.freeze([
  {
    label: 'Ley 19.889 (LUC), art. 224 — deroga los artículos 39 y 40 de la Ley 19.210',
    url: LUC_224,
  },
  {
    label: 'Ley 19.210, art. 39 — pago de arrendamientos (IMPO lo marca derogado)',
    url: LEY_19210_39,
  },
  {
    label: 'Ley 19.210, art. 35 — restricción al uso del efectivo, vigente',
    url: LEY_19210_35,
  },
  {
    label: 'Decreto 264/015 — el reglamento del artículo derogado, con el tope y la multa',
    url: DEC_264_015,
  },
  {
    label: 'Decreto 148/007, art. 14 — requisitos de IRPF vinculados a los arrendamientos',
    url: DEC_148_007_14,
  },
  {
    label: 'Texto Ordenado 2023 (DGI), art. 17 Título 7 — estar al día con el IRPF para litigar',
    url: TO_17_T7,
  },
  {
    label: `Texto Ordenado 2023 (DGI), art. 51 Título 7 — el ${RENT_CREDIT_PERCENT} % del inquilino`,
    url: TO_51_T7,
  },
  {
    label: 'Ley 19.889 (LUC), art. 421 — el arrendamiento sin garantía',
    url: LUC_421,
  },
])

// ── La línea de tiempo ──────────────────────────────────────────────────────

export const RENT_PAYMENT_TIMELINE: readonly RentPaymentEvent[] = Object.freeze([
  {
    on: '2014-04-29',
    label:
      'La Ley de Inclusión Financiera crea la obligación: el precio del alquiler tiene que pagarse por los medios que la ley define.',
    law: 'Ley 19.210, art. 39',
    url: LEY_19210_39,
  },
  {
    on: RENT_BANK_RULE_FROM,
    label:
      'Empieza a regir la acreditación en cuenta para todo alquiler de más de 40 BPC al año, con multa de tres alquileres y sin acción judicial para quien cobre de otra forma.',
    law: 'Decreto 264/015, arts. 1 y 12',
    url: DEC_264_015,
  },
  {
    on: RENT_BANK_RULE_REPEALED_ON,
    label:
      'La LUC deroga el artículo 39 (y el 40) de la Ley 19.210. Desde ahí ninguna ley dice por qué medio hay que pagar el alquiler.',
    law: 'Ley 19.889, art. 224',
    url: LUC_224,
  },
])

// ── Qué rige hoy ────────────────────────────────────────────────────────────

export const RENT_PAYMENT_RULES: readonly RentPaymentRule[] = Object.freeze([
  {
    id: 'derogacion',
    heading: 'La obligación de cobrar el alquiler por banco está derogada',
    body: 'La creó el artículo 39 de la Ley de Inclusión Financiera y la borró la LUC en 2020, por nombre y número. IMPO lo muestra sin texto, con la nota «Derogado/s por: Ley Nº 19.889 de 09/07/2020 artículo 224». La derogación es expresa: no hay que interpretar nada.',
    quote:
      'Deróganse los artículos 36, 36 BIS, 39, 40, 41, 41 BIS, 43, 44 y 64 de la Ley N° 19.210, de 29 de abril de 2014, y sus modificativas, así como toda otra norma que se oponga a la presente ley.',
    law: 'Ley 19.889, art. 224',
    url: LUC_224,
    status: 'derogada',
  },
  {
    id: 'tope-general',
    heading: 'Lo que sí sigue vigente es el tope general de efectivo',
    body: 'El artículo 35 de la misma ley no fue derogado: cualquier operación admite efectivo hasta 200.000 UI, o hasta el 5 % de la operación con tope de 450.000 UI, y el saldo va por otro medio. Está escrito en unidades indexadas, así que el número en pesos se mueve todos los días; un alquiler mensual tendría que ser enorme para acercarse.',
    quote:
      'El pago y entrega de dinero en toda operación o negocio jurídico, cualesquiera sean la naturaleza de las partes intervinientes, podrá realizarse mediante el medio de pago en efectivo hasta: a) La suma de 200.000 Unidades Indexadas (doscientas mil unidades indexadas), o b) El cinco por ciento (5%) del valor total de la operación, siempre que dicho monto no supere las 450.000 Unidades Indexadas',
    law: 'Ley 19.210, art. 35',
    url: LEY_19210_35,
    status: 'vigente',
  },
  {
    id: 'decreto-264',
    heading: 'El decreto que lo reglamentaba sigue publicado, y eso no es un detalle',
    body: 'El Decreto 264/015 no tiene nota de derogación en IMPO, pero su único VISTO es el artículo 39 que la LUC derogó. Un reglamento no puede sostener solo una obligación ni una multa que la ley ya no manda. Por eso acá no decimos «el decreto está derogado» —no lo dice ninguna norma— sino que quedó sin la ley que lo sostenía.',
    quote:
      'A partir del 1° de diciembre de 2015 el pago del precio en dinero de todo arrendamiento, subarrendamiento o crédito de uso sobre inmuebles cuyo importe supere las 40 BPC (cuarenta Bases de Prestaciones y Contribuciones) en el año civil, o su equivalente mensual, deberá cumplirse mediante acreditación en cuenta en una institución de intermediación financiera que tenga como titular al arrendador',
    law: 'Decreto 264/015, art. 1',
    url: DEC_264_015,
    status: 'sin-base-legal',
  },
  {
    id: 'irpf-reglamento',
    heading: 'El reglamento del IRPF todavía lo nombra',
    body: 'Y ésta es la razón práctica para no tratar el asunto como un trámite cerrado: el Decreto 148/007, que reglamenta el IRPF, agregó en 2017 un inciso que condiciona la acción judicial de los contratos de más de 40 BPC al año al cumplimiento del Decreto 264/015. Ese inciso sigue en el texto. El requisito que sí está en la ley, y no en un decreto, es el otro: estar al día con el IRPF del alquiler.',
    quote:
      'Asimismo no se dará curso a ninguna acción judicial que se funde en contratos de arrendamiento sobre inmuebles cuyo importe supere las 40 BPC (cuarenta Bases de Prestaciones y Contribuciones) en el año civil, o su equivalente mensual, si no se acredita el cumplimiento de las condiciones establecidas en el Decreto N° 264/015 de 28 de setiembre de 2015.',
    law: 'Decreto 148/007, art. 14',
    url: DEC_148_007_14,
    status: 'sin-base-legal',
  },
  {
    id: 'irpf-al-dia',
    heading: 'Para hacer valer el contrato en juicio hay que estar al día con el IRPF',
    body: 'Esto no salió con la Ley de Inclusión Financiera y no lo tocó la LUC: está en el Texto Ordenado y es la exigencia que sobrevive a todo lo demás. La única excepción es el arrendamiento sin garantía del artículo 421 de la LUC, y sólo para la acción de desalojo.',
    quote:
      'En toda acción judicial en la que se pretenda hacer valer un contrato de arrendamiento, deberá acreditarse estar al día en el pago del Impuesto a la Renta de las Personas Físicas (IRPF) correspondiente a este Capítulo.',
    law: 'Texto Ordenado 2023 (DGI), art. 17 Título 7',
    url: TO_17_T7,
    status: 'vigente',
  },
])

// ── Por qué conviene que el pago deje rastro, aunque nada lo obligue ────────

export const RENT_PAYMENT_WHY_TRACEABLE: readonly RentPaymentRule[] = Object.freeze([
  {
    id: 'prueba',
    heading: 'Porque el recibo es lo que te queda si hay que discutir',
    body: 'El régimen derogado llegaba al extremo de decir que los pagos «solo podrán probarse» con el comprobante de depósito o transferencia. Hoy no rige esa limitación, así que vale cualquier medio de prueba, pero la carga de probar que pagaste sigue siendo tuya: una transferencia la prueba sola y un sobre con plata necesita un recibo firmado por quien cobró.',
    law: 'Decreto 264/015, art. 10',
    url: DEC_264_015,
    status: 'sin-base-legal',
  },
  {
    id: 'credito-inquilino',
    heading: `Porque el inquilino se descuenta el ${RENT_CREDIT_PERCENT} % del IRPF`,
    body: `Si alquilás para vivir, podés imputar hasta el ${RENT_CREDIT_PERCENT} % del alquiler contra tu IRPF, y el artículo pone una condición: identificar al arrendador. Un pago que no quedó registrado en ninguna parte complica justificar el monto que declarás.`,
    law: `Texto Ordenado 2023 (DGI), art. 51 Título 7`,
    url: TO_51_T7,
    status: 'vigente',
  },
  {
    id: 'sin-cargo',
    heading: 'Y porque el banco no puede cobrarle nada al arrendador por recibirlo',
    body: 'La prohibición venía con el régimen derogado, así que hoy no hay norma que la imponga. Vale saberlo igual antes de aceptar que te descuenten algo de la acreditación: es un cargo negociable, no una regla.',
    quote:
      'Las instituciones de intermediación financiera locales no podrán cobrar cargo alguno por las acreditaciones recibidas como pago por los arrendamientos, subarrendamientos o créditos de uso que se reglamentan.',
    law: 'Decreto 264/015, art. 1',
    url: DEC_264_015,
    status: 'sin-base-legal',
  },
])

// ── Lo que no podemos afirmar ───────────────────────────────────────────────

/**
 * Las preguntas que el texto de las normas NO contesta. Van publicadas a propósito: la página que
 * se calla lo que no sabe hace creer que lo sabe todo.
 */
export const RENT_PAYMENT_UNRESOLVED: readonly RentPaymentRule[] = Object.freeze([
  {
    id: 'multa',
    heading: '¿La multa de tres alquileres se puede aplicar hoy?',
    body: 'No hay norma que la derogue ni norma que la confirme después de la LUC. Está en un decreto cuyo artículo legal ya no existe, y no encontramos resolución de la DGI que la revoque expresamente. No lo afirmamos en ninguno de los dos sentidos: si te lo reclaman, es una consulta con abogado o con la DGI, no una respuesta de una página web.',
    law: 'Decreto 264/015, art. 12',
    url: DEC_264_015,
    status: 'no-resuelto',
  },
  {
    id: 'accion-judicial',
    heading: '¿Un juez puede rechazar la demanda por no haber cobrado en cuenta?',
    body: 'El inciso del Decreto 148/007 que lo manda sigue escrito y apunta a un decreto sin base legal. Cómo resuelve eso un juzgado es jurisprudencia, no texto de la norma, y este sitio no la releva.',
    law: 'Decreto 148/007, art. 14',
    url: DEC_148_007_14,
    status: 'no-resuelto',
  },
])

// ── Preguntas frecuentes ────────────────────────────────────────────────────

export const RENT_PAYMENT_FAQ: readonly RentPaymentFaq[] = Object.freeze([
  {
    question: '¿Es obligatorio pagar el alquiler por transferencia en Uruguay?',
    answer:
      'No. La obligación existió entre el 1 de diciembre de 2015 y 2020: el artículo 39 de la Ley 19.210 mandaba acreditar en una cuenta del arrendador todo alquiler de más de 40 BPC al año. El artículo 224 de la Ley 19.889 (LUC) lo derogó por número. Hoy ninguna ley fija el medio de pago del alquiler.',
  },
  {
    question: '¿Entonces se puede pagar el alquiler en efectivo?',
    answer:
      'Sí, con el único límite general de la Ley 19.210: hasta 200.000 UI por operación, o el 5 % de la operación con tope de 450.000 UI. Ese artículo (el 35) no fue derogado y está escrito en unidades indexadas, así que el equivalente en pesos cambia todos los días.',
  },
  {
    question: '¿Puede el contrato obligarme a pagar por transferencia?',
    answer:
      'Sí. Que la ley ya no lo imponga no significa que el contrato no pueda: lo que firmaste manda sobre la forma de pago. Si el contrato dice la cuenta y los medios de prueba, eso es lo que rige entre las partes.',
  },
  {
    question: '¿Cuánto era el tope que obligaba a usar el banco?',
    answer:
      'Cuarenta Bases de Prestaciones y Contribuciones en el año civil, o su equivalente mensual, según el artículo 1 del Decreto 264/015. Está en BPC y no en pesos, así que el umbral se movía cada enero con el valor de la BPC.',
  },
  {
    question: '¿Qué pasaba si el arrendador cobraba en efectivo igual?',
    answer:
      'El Decreto 264/015 preveía una multa de tres veces el precio mensual pactado y, hasta acreditar el cumplimiento, no se daba curso a ninguna acción judicial fundada en el contrato. Las dos consecuencias cuelgan del artículo que la LUC derogó, así que no afirmamos que sigan siendo aplicables.',
  },
  {
    question: '¿Y los alquileres de temporada?',
    answer:
      'El mismo decreto ya admitía efectivo para los arrendamientos con fines turísticos de hasta cuatro meses contratados por personas físicas, con la obligación de depositarlo dentro de un día hábil. Es parte del régimen que quedó sin ley que lo sostenga.',
  },
  {
    question: '¿Cómo pruebo que pagué el alquiler?',
    answer:
      'Hoy vale cualquier medio de prueba, porque la regla que limitaba la prueba al comprobante bancario era parte del régimen derogado. En la práctica una transferencia se prueba sola; si pagás en efectivo, pedí recibo firmado con el mes, el monto y quién cobró.',
  },
  {
    question: '¿El arrendador necesita estar al día con el IRPF?',
    answer:
      'Para hacer valer el contrato en juicio, sí: lo exige el artículo 17 del Título 7 del Texto Ordenado 2023 y eso no lo tocó la LUC. La única excepción es la acción de desalojo en los arrendamientos sin garantía del artículo 421 de la Ley 19.889.',
  },
])

/** Etiqueta legible de cada estado, para la pantalla y para el test. */
export const RENT_PAYMENT_STATUS_LABEL: Readonly<Record<RentPaymentStatus, string>> = Object.freeze(
  {
    vigente: 'Vigente',
    derogada: 'Derogada',
    'sin-base-legal': 'Sin ley que lo sostenga',
    'no-resuelto': 'No resuelto',
  }
)

/** Todas las afirmaciones con norma del módulo, en un solo lugar (lo usa el test). */
export const RENT_PAYMENT_ALL_RULES: readonly RentPaymentRule[] = Object.freeze([
  ...RENT_PAYMENT_RULES,
  ...RENT_PAYMENT_WHY_TRACEABLE,
  ...RENT_PAYMENT_UNRESOLVED,
])
