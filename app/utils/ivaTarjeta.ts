// app/utils/ivaTarjeta.ts
// Datos de /descuento-de-iva-con-tarjeta-uruguay: los dos descuentos de IVA que da pagar con
// tarjeta en Uruguay y cuánto valen sobre el ticket.
//
// POR QUÉ EXISTE: el sitio ya usa estos puntos adentro de otras páginas —el ranking de tarjetas los
// valúa, /conviene-comprar-en-cuotas los mete en la cuenta del débito— pero ninguna página contesta
// la pregunta directa: «¿cuánto me descuentan de IVA por pagar con tarjeta?».
//
// LAS DOS REBAJAS NO SON LA MISMA, y confundirlas es el error que el propio MEF denuncia:
//   - 2 puntos (Ley 19.210 art. 87): compras en general, SOLO débito / dinero electrónico.
//   - 9 puntos (Ley 17.934): gastronomía y turismo, TAMBIÉN con crédito.
// Que en un restaurante te apliquen 2 en vez de 9 es un incumplimiento, no una variante.
//
// Corrección factual del 23/10/2026: DGI (guía del 02/10) + Decreto 235/026 art. 1
// prorrogan los nueve puntos hasta el 30/04/2027, también para no residentes.
// Esta revisión no confirma una nueva exoneración estacional ni revalida los otros beneficios.
//
// FUENTES PRIMARIAS: revisión general 2026-08-25; gastronomía 2026-10-23.
// Lista completa en IVA_TARJETA_SOURCES:
//   - DGI, «Reducción de 9 puntos de IVA en determinados servicios…»: la nómina de servicios, los
//     medios de pago admitidos y el 7,38%. Gastronomía revalidada el 23/10/2026.
//   - DGI, «Reducción de IVA para adquisiciones que se abonen a través de medios electrónicos»:
//     los dos puntos de la Ley 19.210 y que son sólo para débito y dinero electrónico.
//   - Ley 17.934 art. 1 (impo): faculta a reducir «hasta nueve puntos porcentuales».
//   - Decreto 203/014 (impo): «dos puntos porcentuales de la tasa básica o mínima».
//   - Decreto 235/026 art. 1 (impo): prorroga el art. 1 del Decreto 318/021 hasta el 30/4/2027.
//   - Decreto 99/026 (impo): incorpora el enoturismo a la nómina del Decreto 537/005.
//   - MEF: el descuento mal aplicado en gastronomía.
//   - Ministerio de Turismo: qué sigue vigente para no residentes.

export interface IvaSource {
  readonly label: string
  readonly url: string
}

/** Fecha de la revisión general original; gastronomía tiene su propia fecha de revalidación. */
export const IVA_TARJETA_VERIFIED_AT = '2026-08-25'

/** Sólo la prórroga y condiciones de gastronomía: DGI 02/10/2026 + Decreto 235/026, art. 1. */
export const IVA_GASTRONOMIA_VERIFIED_AT = '2026-10-23'

/** Tasas del IVA uruguayo, en puntos porcentuales. */
export const IVA_TASA_BASICA = 22
export const IVA_TASA_MINIMA = 10

/** Fin inclusivo de la prórroga confirmada; no anticipa la norma que regirá después. */
export const IVA_NINE_POINTS_LAST_DAY = '2027-04-30'

// ---------------------------------------------------------------------------
// La aritmética del ticket
// ---------------------------------------------------------------------------

/**
 * Qué porcentaje del TOTAL que pagás representa una rebaja de `points` puntos de IVA.
 *
 * La rebaja se descuenta de la tasa, no del precio final, así que «nueve puntos» no son nueve por
 * ciento del ticket. Con precio sin IVA `P`, el total normal es `P × (1 + tasa/100)` y el
 * rebajado `P × (1 + (tasa − points)/100)`: la diferencia sobre el total normal es
 * `points / (100 + tasa)`.
 *
 * La prueba de que la fórmula es la correcta es que reproduce, al centésimo, los porcentajes que
 * publica la DGI para la tasa básica: 9 puntos → 7,38 %, 5 puntos → 4,1 %.
 *
 * @param points puntos porcentuales de rebaja.
 * @param rate tasa de IVA aplicable, en puntos (22 la básica, 10 la mínima).
 * @returns el descuento como porcentaje del total, sin redondear.
 */
export function ivaDiscountOnTicket(points: number, rate: number = IVA_TASA_BASICA): number {
  if (points <= 0 || rate <= 0 || points > rate) return 0
  return (points / (100 + rate)) * 100
}

/**
 * Cuánto te ahorra la rebaja sobre un total dado, en pesos.
 *
 * @param total lo que pagarías sin la rebaja, impuestos incluidos.
 * @param points puntos porcentuales de rebaja.
 * @param rate tasa de IVA aplicable.
 */
export function ivaSavingOnTotal(
  total: number,
  points: number,
  rate: number = IVA_TASA_BASICA
): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  return (total * ivaDiscountOnTicket(points, rate)) / 100
}

// ---------------------------------------------------------------------------
// Los dos regímenes
// ---------------------------------------------------------------------------

export interface IvaRegime {
  readonly id: 'general' | 'gastronomia'
  readonly title: string
  /** Puntos porcentuales de rebaja vigentes hoy. */
  readonly points: number
  /** Qué se compra para que aplique. */
  readonly scope: string
  /** Medios de pago que la habilitan, tal como los nombra la norma. */
  readonly instruments: string
  /** Medios de pago que NO la habilitan: la mitad de la confusión vive acá. */
  readonly excluded: string
  readonly norm: string
  readonly detail: string
}

/**
 * Las dos rebajas que conviven. Son regímenes distintos, con normas, alcances y medios de pago
 * distintos: en un restaurante corresponde la de nueve, no la de dos.
 */
export const IVA_REGIMES: readonly IvaRegime[] = [
  {
    id: 'general',
    title: 'Compras en general',
    points: 2,
    scope: 'Enajenación de bienes y prestación de servicios a consumo final, gravados por IVA.',
    instruments: 'Tarjeta de débito, instrumentos de dinero electrónico o instrumentos análogos.',
    excluded: 'La tarjeta de crédito no da esta rebaja. El efectivo tampoco.',
    norm: 'Ley 19.210 art. 87 + Decreto 203/014',
    detail:
      'El Decreto 203/014 la define como «una reducción de dos puntos porcentuales de la tasa básica o mínima del Impuesto al Valor Agregado», así que baja tanto el 22 % como el 10 %. Es permanente y no depende de ninguna prórroga: no hay temporada ni fecha de vencimiento que mirar.',
  },
  {
    id: 'gastronomia',
    title: 'Gastronomía y turismo',
    points: 9,
    scope:
      'Restaurantes, bares, cantinas, confiterías, cafeterías, salones de té y similares; hoteles y hospedajes cuando el servicio no integra el alojamiento; catering para fiestas y eventos; servicios para fiestas y eventos; arrendamiento de vehículos sin chofer; mediación en el arrendamiento de inmuebles con fines turísticos; y visitas guiadas y degustaciones en establecimientos de enoturismo registrados.',
    instruments:
      'Tarjeta de crédito, tarjeta de débito, instrumentos de dinero electrónico o análogos, de personas físicas.',
    excluded: 'El efectivo no la da. Tampoco una tarjeta a nombre de una empresa.',
    norm: 'Ley 17.934 + Decreto 537/005; Decreto 318/021 prorrogado por el Decreto 235/026',
    detail:
      'El Decreto 235/026 mantiene los nueve puntos hasta el 30 de abril de 2027. La DGI confirma que el beneficio alcanza a residentes y no residentes, para consumo final y pagando con un medio admitido cuyo titular sea una persona física. El pago parcial con esos medios recibe la reducción proporcional. La gastronomía del alojamiento está comprendida cuando no integra el hospedaje; el enoturismo debe estar registrado y los productos locales consumirse en el establecimiento.',
  },
]

// ---------------------------------------------------------------------------
// La prórroga confirmada
// ---------------------------------------------------------------------------

/**
 * DGI publica 7,38% para IVA Mínimo. Para la tasa básica, la fórmula reproduce ese porcentaje.
 * No representa una exoneración estacional ni fija una tasa futura al vencer la prórroga.
 */
export const IVA_GASTRONOMIA_PERIOD = {
  from: '2026-10-01',
  through: IVA_NINE_POINTS_LAST_DAY,
  points: 9,
  dgiPublishedPct: 7.38,
  decree: '235/026',
} as const

// ---------------------------------------------------------------------------
// Lo que hay que mirar en el ticket
// ---------------------------------------------------------------------------

export interface IvaTicketCheck {
  readonly id: string
  readonly what: string
  readonly why: string
}

/**
 * El control que puede hacer cualquiera con el comprobante en la mano. El primero es el que el
 * MEF señala explícitamente como incumplimiento frecuente.
 */
export const IVA_TICKET_CHECKS: readonly IvaTicketCheck[] = [
  {
    id: 'dos-en-vez-de-nueve',
    what: 'En un restaurante, que te hayan descontado dos puntos y no nueve.',
    why: 'El MEF lo nombra como el incumplimiento típico: aplicar la rebaja general de la Ley 19.210 donde corresponde la de gastronomía. Sobre un total de $ 1.000 la diferencia son casi $ 58.',
  },
  {
    id: 'nada-con-credito',
    what: 'Que en un comercio común no te descuenten nada por pagar con crédito.',
    why: 'Ahí no hay nada que reclamar: la rebaja de dos puntos es sólo para débito, dinero electrónico e instrumentos análogos. Con crédito no corresponde.',
  },
  {
    id: 'consumo-final',
    what: 'Que el comprobante diga consumo final y esté a nombre de una persona física.',
    why: 'Las dos rebajas son para consumo final. Una factura a nombre de una empresa, con la tarjeta de la empresa, queda fuera del régimen de gastronomía.',
  },
  {
    id: 'importe-de-la-rebaja',
    what: 'Que el descuento aparezca discriminado, no prometido en un cartel.',
    why: 'La rebaja se liquida en el comprobante o la acredita el sello del medio de pago. Un cartel en la puerta no prueba que te la hayan hecho.',
  },
]

// ---------------------------------------------------------------------------
// No residentes
// ---------------------------------------------------------------------------

export interface IvaNonResidentItem {
  readonly benefit: string
  /** `vigente` = el Ministerio de Turismo lo publica como válido todo el año. */
  readonly status: 'vigente' | 'vigente-hasta'
  readonly detail: string
}

/**
 * Dos beneficios de todo el año y los nueve puntos generales, con fin de prórroga explícito.
 * No se infiere de ellos una exoneración estacional para tarjetas emitidas en el exterior.
 */
export const IVA_NON_RESIDENT: readonly IvaNonResidentItem[] = [
  {
    benefit: 'IVA cero en hoteles y alojamientos',
    status: 'vigente',
    detail:
      'El Ministerio de Turismo lo publica como vigente todo el año para no residentes que se identifiquen con documento extranjero.',
  },
  {
    benefit: 'Tax Free en compras habilitadas',
    status: 'vigente',
    detail:
      'También publicado como de todo el año, en los comercios adheridos al régimen y con el trámite de salida.',
  },
  {
    benefit: 'Reducción general de nueve puntos en gastronomía, eventos y alquiler de autos',
    status: 'vigente-hasta',
    detail:
      'La DGI confirma que los nueve puntos también alcanzan a no residentes, con los mismos requisitos de consumo final y pago electrónico a nombre de una persona física. El Decreto 235/026 los mantiene hasta el 30 de abril de 2027. Este beneficio general no confirma una exoneración total de temporada: para esa posibilidad, consultá a la DGI por las fechas de tu viaje.',
  },
]

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface IvaFaqItem {
  readonly question: string
  readonly answer: string
}

export const IVA_TARJETA_FAQ: readonly IvaFaqItem[] = [
  {
    question: '¿Cuánto IVA me descuentan por pagar con tarjeta en Uruguay?',
    answer:
      'Depende de qué comprás. En un comercio común la rebaja es de dos puntos de IVA y sólo si pagás con débito, dinero electrónico o un instrumento análogo: sobre la tasa básica del 22 % eso es 1,64 % del total. En gastronomía y turismo la rebaja es de nueve puntos y vale también con tarjeta de crédito: 7,38 % del total a tasa básica y el mismo porcentaje que publica la DGI para IVA Mínimo. El Decreto 235/026 mantiene los nueve puntos hasta el 30 de abril de 2027.',
  },
  {
    question: '¿La tarjeta de crédito da descuento de IVA?',
    answer:
      'En gastronomía y turismo sí: el régimen de la Ley 17.934 admite tarjeta de crédito, de débito, dinero electrónico e instrumentos análogos de personas físicas. En una compra común no: la rebaja de dos puntos de la Ley 19.210 es sólo para débito, dinero electrónico e instrumentos análogos, así que con crédito no corresponde y no hay nada que reclamar.',
  },
  {
    question: '¿Hasta cuándo rigen los nueve puntos?',
    answer:
      'Hasta el 30 de abril de 2027, por el Decreto 235/026. La reducción se mantuvo en nueve puntos desde el 1º de octubre de 2026; no bajó a cinco. Para operaciones posteriores al fin de la prórroga, habrá que comprobar la normativa vigente. Esta prórroga no modifica la rebaja general de dos puntos.',
  },
  {
    question: '¿Se suman los dos descuentos?',
    answer:
      'No. Son regímenes distintos y en cada compra corresponde uno solo. En un restaurante corresponde el de gastronomía, el de nueve puntos, y el Ministerio de Economía y Finanzas señala como incumplimiento frecuente justamente que ahí se aplique la rebaja general de dos puntos en su lugar.',
  },
  {
    question: '¿Por qué nueve puntos de IVA no son un 9 % de descuento?',
    answer:
      'Porque los puntos se descuentan de la tasa, no del precio que ves. Si el precio sin IVA es P, el total normal es P por 1,22 y el rebajado P por 1,13: la diferencia sobre el total es 9 dividido 122, o sea 7,38 %. Es la misma cuenta que hace la DGI cuando publica ese número.',
  },
  {
    question: 'Soy turista extranjero, ¿me devuelven el IVA?',
    answer:
      'La reducción general de nueve puntos en gastronomía y los demás servicios comprendidos también alcanza a no residentes hasta el 30 de abril de 2027, con los requisitos de consumo final y pago electrónico de una persona física. Es distinta del IVA cero en alojamiento y del régimen Tax Free. No permite dar por vigente una exoneración total de temporada: consultá a la DGI por las fechas y condiciones de ese otro beneficio.',
  },
]

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

export const IVA_TARJETA_SOURCES: readonly IvaSource[] = [
  {
    label:
      'DGI — Reducción de 9 puntos de IVA en determinados servicios abonados con medios de pago electrónicos',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/reduccion-9-puntos-iva-determinados-servicios-siempre-sean-abonados',
  },
  {
    label:
      'DGI — Reducción de IVA para adquisiciones abonadas con medios electrónicos de pago (Ley 19.210)',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/reduccion-iva-para-adquisiciones-se-abonen-traves-medios-electronicos-0',
  },
  {
    label: 'Ley N° 17.934, art. 1 — faculta a reducir hasta nueve puntos porcentuales',
    url: 'https://www.impo.com.uy/bases/leyes/17934-2005/1',
  },
  {
    label: 'Decreto N° 203/014 — dos puntos porcentuales de la tasa básica o mínima',
    url: 'https://www.impo.com.uy/bases/decretos/203-2014',
  },
  {
    label:
      'Decreto N° 235/026, art. 1 — prórroga hasta el 30 de abril de 2027 (consultado el 23/10/2026)',
    url: 'https://www.impo.com.uy/bases/decretos/235-2026/1',
  },
  {
    label: 'Decreto N° 99/026 — incorpora el enoturismo a la nómina del Decreto 537/005',
    url: 'https://www.impo.com.uy/bases/decretos/99-2026',
  },
  {
    label: 'Decreto N° 537/005 — reglamenta el régimen de la Ley 17.934',
    url: 'https://www.impo.com.uy/bases/decretos/537-2005',
  },
  {
    label: 'MEF — Descuentos de puntos de IVA en el ticket por inclusión financiera o turismo',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/descuentos-puntos-iva-ticket-inclusion-financiera-actividades-vinculadas',
  },
  {
    label: 'Ministerio de Turismo — Beneficios para no residentes',
    url: 'https://www.gub.uy/ministerio-turismo/comunicacion/comunicados/beneficios-para-no-residentes',
  },
  {
    label: 'Decreto N° 220/025 — última ventana verificable del reintegro a no residentes',
    url: 'https://www.impo.com.uy/bases/decretos/220-2025',
  },
]
