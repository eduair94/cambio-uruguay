// Los certificados del BPS: el común y el especial.
//
// Catálogo puro (sin imports de Vue/Nuxt) para `/certificados-bps-uruguay`.
//
// REGLA DE ESTE ARCHIVO: cada cifra que se publica viene de una página del BPS o del
// portal nacional de trámites, y va con su cita textual. Lo que no se pudo sostener con
// una fuente, no se publica — y se dice por qué, que es la convención que ya sigue
// `companyTypes.ts` con el importe del timbre profesional.

export const BPS_CERTIFICATES_VERIFIED_AT = '2026-09-25'

export interface BpsSource {
  readonly label: string
  readonly url: string
}

export const BPS_CERTIFICATE_SOURCES: readonly BpsSource[] = Object.freeze([
  {
    label: 'BPS — Solicitar certificados de empresas (vigencia y costo)',
    url: 'https://www.bps.gub.uy/857/solicitar-certificados-de-empresas.html',
  },
  {
    label: 'BPS — Certificados comunes',
    url: 'https://www.bps.gub.uy/859/certificados-comunes.html',
  },
  {
    label: 'BPS — Certificados especiales',
    url: 'https://www.bps.gub.uy/865/certificados-especiales.html',
  },
  {
    label: 'BPS — Solicitar o renovar certificado común',
    url: 'https://www.bps.gub.uy/18470/solicitar-o-renovar-certificado-comun.html',
  },
  {
    label: 'BPS — Solicitar certificado especial (observaciones)',
    url: 'https://www.bps.gub.uy/18545/solicitar-certificado-especial.html',
  },
  {
    label: 'Trámites — Solicitud de Certificado Único Especial',
    url: 'https://www.gub.uy/tramites/solicitud-certificado-unico-especial',
  },
])

/**
 * La vigencia, que es el dato que la gente viene a buscar.
 *
 * Textual del BPS: «180 días corridos a partir del día siguiente a su expedición, salvo
 * situaciones especiales». Las dos partes importan: el día siguiente (no el mismo día) y
 * la salvedad, porque el propio organismo se reserva acortarla.
 */
export const BPS_CERTIFICATE_VALIDITY_DAYS = 180

/** Días corridos para salvar una observación de un certificado especial. */
export const BPS_OBSERVATION_DAYS = 60

/** Días antes del vencimiento a partir de los cuales se puede pedir la renovación. */
export const BPS_RENEWAL_WINDOW_DAYS = 10

/** Días desde la toma de posesión tras los cuales el comprador puede pedirlo él mismo. */
export const BPS_BUYER_TAKEOVER_DAYS = 15

export interface BpsCertificate {
  readonly key: 'comun' | 'especial'
  readonly name: string
  /** Qué acredita, en la definición del propio BPS. */
  readonly quote: string
  readonly quoteSource: string
  /** Para qué se usa, en una línea. */
  readonly useFor: string
}

export const BPS_CERTIFICATES: readonly BpsCertificate[] = Object.freeze([
  {
    key: 'comun',
    name: 'Certificado común',
    quote:
      'El certificado común se expide a los contribuyentes activos de BPS, personas físicas o jurídicas, que se encuentran en situación regular de pago.',
    quoteSource: 'https://www.bps.gub.uy/859/certificados-comunes.html',
    useFor:
      'Es el que acredita que la empresa está al día y el que piden de rutina para operar: licitaciones, cobros y trámites donde hay que mostrar situación regular.',
  },
  {
    key: 'especial',
    name: 'Certificado especial',
    quote:
      'Documento que expide BPS a los contribuyentes, personas físicas o jurídicas, que acredita que no registran adeudos de especie alguna ante el organismo.',
    quoteSource: 'https://www.bps.gub.uy/865/certificados-especiales.html',
    useFor:
      'Es el de los actos puntuales: vender, cerrar o gravar. Se pide para el acto concreto que lo motiva, no para el día a día.',
  },
])

/**
 * Los actos que exigen certificado ESPECIAL, según la página del BPS.
 *
 * Redactados en nuestras palabras a partir de esa lista, no entrecomillados: el
 * entrecomillado se reserva para el texto que verificamos palabra por palabra.
 */
export const BPS_SPECIAL_OPERATIONS: readonly string[] = Object.freeze([
  'Vender o transferir establecimientos comerciales, industriales o agropecuarios.',
  'Vender o transferir, disolver, liquidar, clausurar o fusionar sociedades comerciales.',
  'Vender vehículos de transporte público de pasajeros o de carga.',
  'Vender o gravar bienes inmuebles.',
  'Vender o gravar diques flotantes, aeronaves, buques o embarcaciones.',
  'Otorgar contratos de prenda agraria o industrial.',
])

export interface BpsFaq {
  readonly question: string
  readonly answer: string
}

export const BPS_CERTIFICATE_FAQ: readonly BpsFaq[] = Object.freeze([
  {
    question: '¿Cuánto dura un certificado del BPS?',
    answer:
      'El BPS publica que los certificados —común y especial— tienen «180 días corridos a partir del día siguiente a su expedición, salvo situaciones especiales». Dos detalles que cambian la cuenta: el plazo arranca al día siguiente de expedido, no el mismo día, y la salvedad es del propio organismo, así que el vencimiento que vale es el que figura en tu certificado.',
  },
  {
    question: '¿Cuál es la diferencia entre el certificado común y el especial?',
    answer:
      'El común se expide a los contribuyentes activos que están en situación regular de pago: acredita que la empresa está al día y sirve para operar de rutina. El especial acredita que no se registran adeudos «de especie alguna» a la fecha del acto que lo motiva, y se pide para actos puntuales como vender un establecimiento, disolver una sociedad o gravar un inmueble.',
  },
  {
    question: '¿Cuánto cuesta pedirlo?',
    answer:
      'Un timbre profesional. El BPS aclara que «la solicitud genera el costo de un timbre profesional, cuyo valor se incluye en la siguiente factura de obligaciones», bajo el código de pago 113: no se paga aparte ni se adjunta nada. No publicamos el importe a propósito: el que figura hoy en el trámite viene con un período de vigencia acotado a un semestre y ese período ya venció. Preferimos decirte que se paga a decirte cuánto y equivocarnos.',
  },
  {
    question: 'Me observaron el certificado especial, ¿cuánto tiempo tengo?',
    answer:
      'El BPS da «60 días corridos desde la fecha de observación» para salvarla. Una vez corregida, la solicitud vuelve a procesarse dentro de las 24 horas.',
  },
  {
    question: '¿Con cuánta anticipación puedo renovar el común?',
    answer:
      'El BPS indica que «al contar con un certificado próximo a vencer, es posible solicitar su renovación hasta diez días antes del vencimiento». El servicio en línea de solicitud y descarga permite además adherirse a la renovación automática.',
  },
  {
    question: 'Estoy comprando y el vendedor no pide el certificado especial, ¿puedo pedirlo yo?',
    answer:
      'Sí, pasado un plazo. El portal de trámites lo dice así: «Si transcurridos quince días de la toma de posesión, el promitente vendedor no hubiese solicitado el certificado, lo podrá realizar el promitente comprador o el profesional actuante». En una compraventa el obligado a pedirlo es la parte vendedora.',
  },
])

/**
 * El vencimiento de un certificado, a partir de su fecha de expedición.
 *
 * El BPS cuenta desde el DÍA SIGUIENTE a la expedición, así que un certificado expedido
 * el día 1 no vence a los 180 días del día 1 sino del día 2. Ese corrimiento de un día
 * es justamente el que hace que alguien llegue tarde por un día a una escritura.
 *
 * Devuelve `null` para una fecha inválida en vez de un `Invalid Date` que se propague.
 */
export function certificateExpiry(
  issuedAt: string,
  validityDays: number = BPS_CERTIFICATE_VALIDITY_DAYS
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedAt)) return null
  const issued = new Date(`${issuedAt}T00:00:00Z`)
  if (Number.isNaN(issued.getTime())) return null
  const expiry = new Date(issued)
  // +1 porque el plazo corre desde el día siguiente, +validityDays por el plazo mismo.
  expiry.setUTCDate(expiry.getUTCDate() + 1 + validityDays - 1)
  return expiry
}
