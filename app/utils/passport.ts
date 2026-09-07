// Cuánto sale el pasaporte uruguayo: aranceles, plazos y quién paga qué.
//
// Módulo PURO (sin Vue/Nuxt, sin estado global, imports relativos) para que
// `pages/cuanto-sale-el-pasaporte-uruguayo.vue` no duplique el catálogo y vitest
// lo pueda cargar en Node.
//
// POR QUÉ ESTA PÁGINA. El costo del pasaporte se busca en pesos y se contesta en
// tres páginas distintas de gub.uy, una por tipo de ciudadanía, cada una con su
// propio bloque de costos. La respuesta útil —y el motivo por el que la página
// existe— es que LAS TRES COBRAN LO MISMO: el trámite que te toca cambia los
// papeles que llevás, no el precio. Nadie lo dice en una sola pantalla.
//
// LA REGLA DE LAS CIFRAS. Todo importe de acá sale textual del bloque «Costo» de
// la ficha del trámite en gub.uy, que encabeza «VALORES A PARTIR DEL 01/07/2026».
// El arancel y el Certificado de Antecedentes Judiciales se publican SUMADOS con
// un «+» («$3.703 + Certificado de Antecedentes Judiciales $ 175»), así que el
// total lo calcula {@link totalPasaporte} en vez de copiarse a mano: si alguna
// vez se actualiza un arancel, no puede quedar un total viejo al lado.
//
// LO QUE NO SE PUBLICA, A PROPÓSITO (ver {@link PASSPORT_UNPUBLISHED}): la
// vigencia del pasaporte, el arancel de la cédula y el recargo del pago en línea.
// Las tres son preguntas que la gente hace y las tres las contestaríamos de
// memoria o copiando un blog. La ficha oficial no las trae, así que la página
// dice que no las trae en vez de inventar un número.

/** Una fuente primaria: etiqueta legible + URL oficial. */
export interface PassportSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo este archivo contra las fuentes oficiales. */
export const PASSPORT_VERIFIED_AT = '2026-09-07'

/** Fecha desde la que rigen los aranceles, tal como la encabeza la ficha del trámite. */
export const PASSPORT_FEES_EFFECTIVE_FROM = '2026-07-01'

/** Ruta de la página; el mismo slug en los tres idiomas (i18n prefija /en y /pt). */
export const PASSPORT_PATH = '/cuanto-sale-el-pasaporte-uruguayo'

/** Una fila del cuadro de precios: un tipo de trámite y sus dos importes. */
export interface PassportFee {
  /** Id estable, usado como `:key`. */
  readonly key: string
  /** Nombre del trámite tal como lo llama la ficha oficial. */
  readonly label: string
  /** `true` si es el trámite urgente (se cobra aparte y el certificado también sube). */
  readonly urgente: boolean
  /** Arancel del pasaporte, en pesos uruguayos. */
  readonly arancel: number
  /** Certificado de Antecedentes Judiciales, en pesos uruguayos. */
  readonly certificado: number
}

/**
 * Los cuatro precios del pasaporte, vigentes desde el 01/07/2026.
 *
 * Idénticos en las tres fichas (nacionales, ciudadanos naturales y ciudadanos
 * legales), lo que es justamente el dato de la página.
 */
export const PASSPORT_FEES: readonly PassportFee[] = [
  {
    key: 'primera-comun',
    label: 'Primera vez, común',
    urgente: false,
    arancel: 5455,
    certificado: 175,
  },
  {
    key: 'primera-urgente',
    label: 'Primera vez, urgente',
    urgente: true,
    arancel: 10712,
    certificado: 1402,
  },
  {
    key: 'renovacion-comun',
    label: 'Renovación, común',
    urgente: false,
    arancel: 3703,
    certificado: 175,
  },
  {
    key: 'renovacion-urgente',
    label: 'Renovación, urgente',
    urgente: true,
    arancel: 7207,
    certificado: 1402,
  },
]

/** Arancel + certificado: lo que se paga por el trámite completo, en pesos. */
export function totalPasaporte(fee: PassportFee): number {
  return fee.arancel + fee.certificado
}

/** El mismo trámite, en su versión común y en su versión urgente. */
export interface PassportPair {
  readonly comun: PassportFee
  readonly urgente: PassportFee
}

/** Busca una fila por su `key`; lanza si no existe (el catálogo es fijo). */
function fee(key: string): PassportFee {
  const found = PASSPORT_FEES.find(f => f.key === key)
  if (!found) throw new Error(`No existe el trámite de pasaporte "${key}"`)
  return found
}

/** Primera vez y renovación, cada una con su par común/urgente. */
export const PASSPORT_PAIRS: Readonly<Record<'primera' | 'renovacion', PassportPair>> = {
  primera: { comun: fee('primera-comun'), urgente: fee('primera-urgente') },
  renovacion: { comun: fee('renovacion-comun'), urgente: fee('renovacion-urgente') },
}

/**
 * Cuántas veces el urgente cuesta lo que el común, sobre el total pagado.
 *
 * Es el número que decide: la ficha oficial publica los cuatro aranceles sueltos
 * y nunca la relación entre ellos, que es lo único que contesta «¿me conviene
 * pagar el urgente?».
 */
export function recargoUrgente(pair: PassportPair): number {
  return totalPasaporte(pair.urgente) / totalPasaporte(pair.comun)
}

/** A quién le corresponde cada una de las tres fichas del trámite. */
export interface PassportApplicant {
  readonly key: string
  /** Nombre del trámite en gub.uy. */
  readonly label: string
  /** Quién entra, con las palabras de la ficha. */
  readonly quien: string
  /** URL de la ficha del trámite. */
  readonly url: string
}

export const PASSPORT_APPLICANTS: readonly PassportApplicant[] = [
  {
    key: 'nacionales',
    label: 'Personas nacionales uruguayas',
    quien: 'Personas nacidas en el territorio nacional.',
    url: 'https://www.gub.uy/tramites/solicitud-pasaporte-renovacion-personas-nacionales-uruguayas',
  },
  {
    key: 'ciudadanos-naturales',
    label: 'Personas ciudadanas naturales uruguayas',
    quien: 'Personas nacidas en el exterior, hijas o hijos de padre o madre uruguayos.',
    url: 'https://www.gub.uy/tramites/solicitud-pasaporte-renovacion-personas-ciudadanas-naturales-uruguayas',
  },
  {
    key: 'ciudadanos-legales',
    label: 'Ciudadanos legales',
    quien: 'Personas con Carta de Ciudadanía expedida por la Corte Electoral.',
    url: 'https://www.gub.uy/tramites/solicitud-pasaporte-renovacion-ciudadanos-legales',
  },
]

/** Un plazo de entrega, con la sede y el tipo de trámite al que corresponde. */
export interface PassportDelivery {
  readonly key: string
  readonly sede: string
  readonly tramite: string
  readonly plazo: string
}

/**
 * Los plazos, tal como los publica la ficha.
 *
 * Ojo con Montevideo: la ficha no da un plazo de entrega en días. Dice que el
 * pasaporte se retira el mismo día de la gestión y que lo que depende de la
 * demanda es llegar a esa gestión. Se transcribe así, con la ambigüedad a la
 * vista, en vez de convertirla en un número que la fuente no da.
 */
export const PASSPORT_DELIVERY: readonly PassportDelivery[] = [
  {
    key: 'mdeo-comun',
    sede: 'Montevideo',
    tramite: 'Común',
    plazo:
      'Se retira el mismo día de la gestión. La ficha no publica cuánto se espera para llegar a esa gestión: dice «según la demanda».',
  },
  {
    key: 'mdeo-urgente',
    sede: 'Montevideo',
    tramite: 'Urgente',
    plazo: 'Se retira el mismo día de la gestión, «entre 2 y 5 días hábiles, según la demanda».',
  },
  {
    key: 'interior-comun',
    sede: 'Interior',
    tramite: 'Común',
    plazo: 'Se retira 15 días hábiles después de realizada la gestión.',
  },
  {
    key: 'interior-urgente',
    sede: 'Interior',
    tramite: 'Urgente',
    plazo: 'Se retira 5 días hábiles después de realizada la gestión.',
  },
]

/** Un dato que la gente busca, que la fuente oficial NO publica, y por qué no lo inventamos. */
export interface PassportUnpublished {
  readonly key: string
  /** La pregunta, como se la hace la gente. */
  readonly pregunta: string
  /** Qué dice —o qué calla— la fuente. */
  readonly porQue: string
}

export const PASSPORT_UNPUBLISHED: readonly PassportUnpublished[] = [
  {
    key: 'vigencia',
    pregunta: '¿Cuántos años dura el pasaporte uruguayo?',
    porQue:
      'Ninguna de las tres fichas del trámite en gub.uy publica la vigencia del documento. Lo único que sí dicen sobre plazos es lo contrario: el pasaporte que no se retira dentro de los 60 días de expedido se destruye sin aviso al interesado. Preguntá la vigencia en la DNIC al hacer el trámite.',
  },
  {
    key: 'cedula',
    pregunta: '¿Y cuánto sale la cédula?',
    porQue:
      'La ficha del Documento Nacional de Identidad en gub.uy no tiene bloque de costos: no publica arancel. Sí publica plazos —los menores de 9 años lo retiran el mismo día y los mayores de 10, a partir de los 5 días hábiles—, así que acá va el plazo y no un precio.',
  },
  {
    key: 'sistarbanc',
    pregunta: '¿Cuánto se suma si pago en línea?',
    porQue:
      'La ficha avisa que al trámite en línea se le agrega «el costo operativo de la modalidad de pago seleccionada» (Sistarbanc), pero no lo cifra: depende del medio que elijas. La reserva de audiencia, en cambio, sí está definida: se paga exclusivamente en moneda nacional, en efectivo o débito.',
  },
]

/** Una pregunta frecuente (también sale como Question en el JSON-LD FAQPage). */
export interface PassportFaq {
  readonly question: string
  readonly answer: string
}

export const PASSPORT_FAQ: readonly PassportFaq[] = [
  {
    question: '¿Cuánto sale renovar el pasaporte uruguayo en 2026?',
    answer:
      'El arancel de la renovación común es de $3.703 y el Certificado de Antecedentes Judiciales que se paga junto con él, $175: $3.878 en total. La renovación urgente son $7.207 más $1.402 de certificado urgente, o sea $8.609. Valores vigentes desde el 1 de julio de 2026 según la ficha del trámite en gub.uy.',
  },
  {
    question: '¿Sale más caro si es la primera vez?',
    answer:
      'Sí. El pasaporte por primera vez cuesta $5.455 de arancel más $175 de certificado ($5.630 en total), contra $3.878 de la renovación. En la modalidad urgente son $10.712 más $1.402, o sea $12.114.',
  },
  {
    question: '¿Cambia el precio según cómo tenga la ciudadanía?',
    answer:
      'No. Las tres fichas del trámite —personas nacionales uruguayas, personas ciudadanas naturales uruguayas y ciudadanos legales— publican exactamente los mismos aranceles. Lo que cambia entre ellas es la documentación que hay que presentar, no el importe.',
  },
  {
    question: '¿Cómo se paga?',
    answer:
      'La reserva de audiencia se paga exclusivamente en moneda nacional, en efectivo o con débito. Si el trámite se hace en línea, se suma el costo operativo de la modalidad de pago elegida (Sistarbanc), que la ficha menciona pero no cifra.',
  },
]

/** Las fuentes primarias, verificadas el {@link PASSPORT_VERIFIED_AT}. */
export const PASSPORT_SOURCES: readonly PassportSource[] = [
  {
    label:
      'gub.uy — Solicitud de pasaporte, primera vez (personas nacionales uruguayas): «VALORES A PARTIR DEL 01/07/2026 · Trámite primera vez común: $ 5.455 + Certificado de Antecedentes Judiciales $ 175 · Trámite primera vez urgente: $ 10.712 + Certificado de Antecedentes Judiciales urgente $ 1.402», plazos de entrega y forma de pago',
    url: 'https://www.gub.uy/tramites/solicitud-pasaporte-primera-vez-personas-nacionales-uruguayas',
  },
  {
    label:
      'gub.uy — Solicitud de pasaporte, renovación (personas nacionales uruguayas): «Trámite renovación común: $3.703 + Certificado de Antecedentes Judiciales $ 175 · Trámite renovación urgente: $7.207 + Certificado de Antecedentes Judiciales urgente $ 1.402»; el pasaporte no retirado en 60 días se destruye',
    url: 'https://www.gub.uy/tramites/solicitud-pasaporte-renovacion-personas-nacionales-uruguayas',
  },
  {
    label:
      'gub.uy — Solicitud de pasaporte, renovación (personas ciudadanas naturales uruguayas): los mismos cuatro aranceles, para quienes nacieron en el exterior de padre o madre uruguayos',
    url: 'https://www.gub.uy/tramites/solicitud-pasaporte-renovacion-personas-ciudadanas-naturales-uruguayas',
  },
  {
    label:
      'gub.uy — Solicitud de pasaporte, renovación (ciudadanos legales): los mismos aranceles para quienes tienen Carta de Ciudadanía de la Corte Electoral',
    url: 'https://www.gub.uy/tramites/solicitud-pasaporte-renovacion-ciudadanos-legales',
  },
  {
    label:
      'gub.uy — Documento Nacional de Identidad, primera vez: la ficha publica plazos de entrega y no publica arancel',
    url: 'https://www.gub.uy/tramites/documento-nacional-identidad-primera-vez',
  },
]
