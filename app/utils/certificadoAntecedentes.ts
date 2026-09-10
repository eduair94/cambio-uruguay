// app/utils/certificadoAntecedentes.ts
// Datos de /certificado-de-antecedentes-judiciales-uruguay: cuánto sale el certificado que todo el
// mundo llama «de buena conducta», cuánto dura y —lo que casi nadie dice— quién te lo puede exigir.
//
// POR QUÉ EXISTE: el sitio ya contesta cuánto sale la cédula y cuánto sale el pasaporte, y este es
// el tercer trámite de la misma familia: se pide para entrar a trabajar, para un trámite consular,
// para una residencia. Pero acá hay algo que los otros dos no tienen, y es el motivo real de la
// página: la tarifa está escrita en UNIDADES INDEXADAS, así que ninguna fuente puede publicar
// cuánto sale en pesos sin que quede vieja al día siguiente. Este sitio ya sirve el valor de la UI
// del BCU en /indicadores, así que puede contestar en pesos lo que el Estado sólo contesta en UI.
//
// EL DATO QUE CAMBIA LA RESPUESTA: el trámite dice, textual, que «se expide sólo para Organismos
// Públicos u Oficinas Consulares». O sea que la empresa privada que te lo pide como requisito de
// ingreso, o el propietario que te lo pide para alquilar, no están entre los destinos para los que
// el certificado se emite. Eso no es una opinión nuestra: es el destino declarado del trámite, y
// para las entidades públicas que se pasan de los requisitos existe un formulario de denuncia por
// incumplimiento del Decreto 353/023.
//
// LOS DOS CERTIFICADOS QUE SE CONFUNDEN, y se confunden porque se llaman casi igual:
//   1. El general (este, «buena conducta»): 26,50 UI común o 53,10 UI urgente, lo paga la persona.
//   2. El de la Ley 19.791 («libre de delitos sexuales»): lo pide la INSTITUCIÓN sobre la persona a
//      contratar, y el art. 2 dice que «no tendrá costo alguno para la institución solicitante».
//
// LO QUE DELIBERADAMENTE NO SE RESUELVE: la ficha del trámite de la Ley 19.791 en gub.uy publica
// 26,5 UI, y el art. 2 de esa misma ley dice que el certificado no tiene costo para la institución
// solicitante. Las dos cosas pueden convivir —la gratuidad está escrita para la institución, no
// para la persona que lo tramita por su cuenta— pero eso es una lectura, no un texto, así que la
// página muestra las dos fuentes y no declara cuál gana. No se publica ningún monto en pesos fijo:
// las tarifas son en UI y la UI se mueve todos los días.
//
// FUENTES PRIMARIAS, verificadas el 2026-09-10 (ver ANTECEDENTES_SOURCES).

export interface AntecedentesSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra gub.uy e impo.com.uy. */
export const ANTECEDENTES_VERIFIED_AT = '2026-09-10'

// ---------------------------------------------------------------------------
// Las tarifas (gub.uy, ficha del trámite)
// ---------------------------------------------------------------------------

/** Una de las dos velocidades con las que se puede pedir el certificado general. */
export interface ModalidadCertificado {
  readonly id: 'comun' | 'urgente'
  readonly nombre: string
  /** Tarifa en Unidades Indexadas, tal como la publica la ficha del trámite. */
  readonly costoUi: number
  /** El plazo, con su unidad: la común se cuenta en días corridos y la urgente en hábiles. */
  readonly plazo: string
}

export const MODALIDADES: readonly ModalidadCertificado[] = Object.freeze([
  {
    id: 'comun',
    nombre: 'Común',
    costoUi: 26.5,
    plazo: '15 días corridos',
  },
  {
    id: 'urgente',
    nombre: 'Urgente',
    costoUi: 53.1,
    plazo: '2 días hábiles',
  },
])

/** Días que el certificado sigue sirviendo: «caducará a los 90 días de expedido». */
export const VIGENCIA_DIAS = 90

/**
 * Convierte un monto en UI a pesos con un valor de UI dado. Valores inválidos devuelven 0.
 *
 * Mismo criterio que `cashLimit.uiAPesos`: nunca devuelve `NaN`, así que la página no puede llegar
 * a mostrar «$ NaN» si la API no contesta el valor de la UI.
 */
export function uiAPesos(montoUi: number, valorUi: number): number {
  if (!Number.isFinite(montoUi) || !Number.isFinite(valorUi)) return 0
  if (montoUi <= 0 || valorUi <= 0) return 0
  return montoUi * valorUi
}

/**
 * Cuánto más caro sale apurarlo, como proporción de la tarifa común.
 *
 * Se calcula y no se escribe a mano: si alguna de las dos tarifas cambia, el número de la página se
 * mueve con ella en vez de quedar contradiciendo a la tabla que tiene al lado.
 */
export function sobreprecioUrgente(): number {
  const comun = MODALIDADES.find(m => m.id === 'comun')
  const urgente = MODALIDADES.find(m => m.id === 'urgente')
  if (!comun || !urgente || comun.costoUi <= 0) return 0
  return urgente.costoUi / comun.costoUi - 1
}

// ---------------------------------------------------------------------------
// Los destinos: para quién se expide
// ---------------------------------------------------------------------------

/**
 * Un caso concreto de «me lo están pidiendo», con lo que dice la fuente.
 *
 * `admitido` no juzga si el pedido es legal en abstracto —eso no lo puede decidir esta página—:
 * dice si ese destino está entre los que la ficha del trámite declara que atiende. Es la distinción
 * que hace la respuesta útil sin inventar una norma que no leímos.
 */
export interface DestinoCertificado {
  readonly quien: string
  readonly admitido: boolean
  readonly detalle: string
}

export const DESTINOS: readonly DestinoCertificado[] = Object.freeze([
  {
    quien: 'Un organismo público',
    admitido: true,
    detalle:
      'Es uno de los dos destinos para los que la ficha del trámite declara que el certificado se expide.',
  },
  {
    quien: 'Una oficina consular acreditada',
    admitido: true,
    detalle:
      'El otro destino declarado: el trámite de residencia o de visa que lo pide desde el exterior.',
  },
  {
    quien: 'Una empresa privada, como requisito de ingreso',
    admitido: false,
    detalle:
      'No figura entre los destinos del trámite: «se expide sólo para Organismos Públicos u Oficinas Consulares». Para el personal que trata directamente con niñas, niños, adolescentes, personas con discapacidad y personas mayores en situación de dependencia existe otro certificado, el de la Ley 19.791, y lo pide la institución, no la persona.',
  },
  {
    quien: 'El propietario o la inmobiliaria, para alquilarte',
    admitido: false,
    detalle:
      'Tampoco figura. Lo que sí se te puede pedir para alquilar es una garantía y la documentación de ingresos; el certificado de antecedentes no está entre los destinos que el trámite atiende.',
  },
])

// ---------------------------------------------------------------------------
// El otro certificado: Ley 19.791
// ---------------------------------------------------------------------------

/**
 * Los once literales del art. 1 de la Ley 19.791, con el artículo del Código Penal que cada uno
 * cita. Van completos y no resumidos porque el alcance de ese certificado ES esta lista: cualquier
 * paráfrasis («delitos sexuales») la agranda o la achica.
 */
export const LEY_19791_DELITOS: readonly string[] = Object.freeze([
  'Violación (artículo 272 del Código Penal)',
  'Abuso sexual (artículo 272-BIS del Código Penal)',
  'Abuso sexual especialmente agravado (artículo 272-TER del Código Penal)',
  'Atentado violento al pudor (artículo 273 del Código Penal)',
  'Abuso sexual sin contacto corporal (artículo 273-BIS del Código Penal)',
  'Corrupción (artículo 274 del Código Penal)',
  'Reducción de personas a la esclavitud, servidumbre o trabajo forzoso (artículo 280 del Código Penal)',
  'Esclavitud sexual (artículo 280-BIS del Código Penal)',
  'Unión matrimonial o concubinaria forzada o servil (artículo 280-TER del Código Penal)',
  'Prostitución forzada (artículo 280-QUATER del Código Penal)',
  'Los consagrados en la Ley N° 17.815, de 6 de setiembre de 2004',
])

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface AntecedentesFaq {
  readonly question: string
  readonly answer: string
}

export const ANTECEDENTES_FAQ: readonly AntecedentesFaq[] = Object.freeze([
  {
    question: '¿Cuánto sale el certificado de antecedentes judiciales?',
    answer:
      'La ficha del trámite publica dos tarifas, las dos en Unidades Indexadas y las dos «para todos los destinos»: 26,50 UI en la modalidad común, que demora 15 días corridos, y 53,10 UI en la urgente, que demora 2 días hábiles. Como están en UI, el monto en pesos cambia todos los días: esta página lo convierte con el valor de la UI que publica el Banco Central.',
  },
  {
    question: '¿Cuánto dura el certificado de buena conducta?',
    answer:
      'Noventa días. La ficha del trámite dice que el certificado «caducará a los 90 días de expedido». Si el trámite para el que lo pediste se demora más que eso, hay que sacarlo de nuevo y pagarlo de nuevo.',
  },
  {
    question: '¿Una empresa privada me puede pedir el certificado de buena conducta?',
    answer:
      'La ficha del trámite dice que «se expide sólo para Organismos Públicos u Oficinas Consulares debidamente acreditadas», así que un empleador privado no está entre los destinos para los que el certificado se emite. Hay un certificado distinto, el de la Ley 19.791, que sí tienen que pedir las instituciones del área educativa, de la salud y todas las que impliquen trato directo con niñas, niños y adolescentes, personas con discapacidad y personas mayores en situación de dependencia. Ese lo pide la institución sobre la persona a contratar, no se lo pide a la persona que lo lleve.',
  },
  {
    question: '¿Un propietario me lo puede pedir para alquilar?',
    answer:
      'El alquiler tampoco figura entre los destinos declarados del trámite. Lo que sí se pide habitualmente para alquilar es una garantía —ANDA, Contaduría General de la Nación, seguro de fianza— y comprobantes de ingreso.',
  },
  {
    question: '¿Qué hago si un organismo público me pide requisitos de más?',
    answer:
      'La propia ficha del trámite dice que «las Entidades Públicas no podrán exigir requisitos adicionales a los aquí detallados» y enlaza un formulario para denunciar el incumplimiento del Decreto 353/023, que obliga a las entidades públicas a dejar de pedir certificados y constancias que puedan obtenerse por otros medios.',
  },
  {
    question: '¿El certificado de la Ley 19.791 es gratis?',
    answer:
      'El artículo 2 de la Ley 19.791 dice que el certificado «no tendrá costo alguno para la institución solicitante». La ficha del trámite de gub.uy para ese mismo certificado, en cambio, publica 26,5 UI. Las dos cosas pueden convivir, porque la gratuidad del artículo está escrita para la institución y no para la persona que lo tramita por su cuenta, pero eso es una lectura y no un texto: acá dejamos las dos fuentes enlazadas y no afirmamos cuál se aplica en tu caso.',
  },
  {
    question: '¿Se puede hacer online?',
    answer:
      'Sí. El trámite se puede completar en línea con identidad digital avanzada, o iniciarlo en línea y agendarse para terminarlo presencialmente. En Montevideo se hace en la Dirección Nacional de Policía Científica, en Mercedes 1004 esquina Julio Herrera y Obes, de lunes a viernes de 9:00 a 15:00; en el interior, en las jefaturas departamentales de policía.',
  },
])

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

export const ANTECEDENTES_SOURCES: readonly AntecedentesSource[] = Object.freeze([
  {
    label:
      'gub.uy — Certificado de antecedentes judiciales (ficha del trámite): «Este tramite se expide sólo para Organismos Públicos u Oficinas Consulares»; «Común (15 días corridos): Para todos los destinos: 26,50 UI»; «Urgente (2 días hábiles): Para todos los destinos 53.10 UI»; «caducará a los 90 días de expedido»; «Las Entidades Públicas no podrán exigir requisitos adicionales a los aquí detallados»',
    url: 'https://www.gub.uy/tramites/certificado-antecedentes-judiciales',
  },
  {
    label:
      'gub.uy — Certificado de antecedentes judiciales según Ley N° 19.791 (ficha del trámite): el certificado que piden las instituciones del área educativa, de la salud y las de trato directo; publica 26,5 UI para todos los destinos',
    url: 'https://www.gub.uy/tramites/certificado-antecedentes-judiciales-segun-ley-ndeg19791',
  },
  {
    label:
      'Ley 19.791, art. 1 — «Toda institución pública o privada perteneciente al área educativa, de la salud y todas aquellas que impliquen trato directo con niñas, niños y adolescentes, personas con discapacidad y personas mayores en situación de dependencia, deberán solicitar a la Dirección Nacional de Policía Científica que expidan un certificado», con los once literales de delitos',
    url: 'https://www.impo.com.uy/bases/leyes/19791-2019/1',
  },
  {
    label:
      'Ley 19.791, art. 2 — el certificado «no tendrá costo alguno para la institución solicitante»; la información se maneja «en forma reservada dando cumplimiento a lo establecido en la Ley Nº 18.331»',
    url: 'https://www.impo.com.uy/bases/leyes/19791-2019/2',
  },
  {
    label:
      'Decreto 353/023, de 9 de noviembre de 2023 — obliga a las entidades públicas a simplificar sus trámites y a «eliminar la solicitud de certificados, constancias, testimonios o documentación similar que pueda obtenerse por otros medios»',
    url: 'https://www.gub.uy/presidencia/institucional/normativa/decreto-353023-se-establecen-obligaciones-para-entidades-publicas',
  },
  {
    label:
      'gub.uy — Incumplimiento del Decreto 353/23: recepción de denuncia, el formulario que enlaza la propia ficha del trámite',
    url: 'https://www.gub.uy/tramites//formulario-reclamo-decreto-353-23?procedure=1296',
  },
])
