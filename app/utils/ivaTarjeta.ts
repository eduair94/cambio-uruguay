// app/utils/ivaTarjeta.ts
// Datos de /descuento-de-iva-con-tarjeta-uruguay: los dos descuentos de IVA que da pagar con
// tarjeta en Uruguay, cuánto valen sobre el ticket y qué cambia el 1º de octubre de 2026.
//
// POR QUÉ EXISTE: el sitio ya usa estos puntos adentro de otras páginas —el ranking de tarjetas los
// valúa, /conviene-comprar-en-cuotas los mete en la cuenta del débito— pero ninguna página contesta
// la pregunta directa: «¿cuánto me descuentan de IVA por pagar con tarjeta?». Y hay un reloj
// corriendo: el Decreto 83/026 prorrogó los nueve puntos de gastronomía SOLO hasta el 30 de
// setiembre de 2026, y desde el 1º de octubre la DGI publica que la reducción queda en cinco.
//
// LAS DOS REBAJAS NO SON LA MISMA, y confundirlas es el error que el propio MEF denuncia:
//   - 2 puntos (Ley 19.210 art. 87): compras en general, SOLO débito / dinero electrónico.
//   - 9 puntos (Ley 17.934): gastronomía y turismo, TAMBIÉN con crédito.
// Que en un restaurante te apliquen 2 en vez de 9 es un incumplimiento, no una variante.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: que el reintegro EXTRA de nueve puntos para turistas no
// residentes esté vigente hoy. Su última ventana verificable —Decreto 220/025— corrió del 15 de
// noviembre de 2025 al 30 de abril de 2026, y no encontramos norma publicada que la prorrogue más
// allá de esa fecha. Lo que sí sigue todo el año, según el Ministerio de Turismo, es el IVA cero en
// alojamiento y el régimen Tax Free. Decir «hoy te devuelven nueve puntos» sin la norma sería
// inventarlo.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-25 (lista completa en IVA_TARJETA_SOURCES):
//   - DGI, «Reducción de 9 puntos de IVA en determinados servicios…»: la nómina de servicios, los
//     medios de pago admitidos, el 7,38% de hoy y el paso a 5 puntos / 4,1% el 1/10/2026.
//   - DGI, «Reducción de IVA para adquisiciones que se abonen a través de medios electrónicos»:
//     los dos puntos de la Ley 19.210 y que son sólo para débito y dinero electrónico.
//   - Ley 17.934 art. 1 (impo): faculta a reducir «hasta nueve puntos porcentuales».
//   - Decreto 203/014 (impo): «dos puntos porcentuales de la tasa básica o mínima».
//   - Decreto 83/026 art. 1 (impo): prorroga los nueve puntos hasta el 30/9/2026.
//   - Decreto 99/026 (impo): incorpora el enoturismo a la nómina del Decreto 537/005.
//   - MEF: el descuento mal aplicado en gastronomía.
//   - Ministerio de Turismo: qué sigue vigente para no residentes.

export interface IvaSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const IVA_TARJETA_VERIFIED_AT = '2026-08-25'

/** Tasas del IVA uruguayo, en puntos porcentuales. */
export const IVA_TASA_BASICA = 22
export const IVA_TASA_MINIMA = 10

/** El día en que los nueve puntos de gastronomía pasan a cinco (DGI). */
export const IVA_STEP_DOWN_DATE = '2026-10-01'

/** El último día en que rigen los nueve puntos, según el art. 1 del Decreto 83/026. */
export const IVA_NINE_POINTS_LAST_DAY = '2026-09-30'

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
    norm: 'Ley 17.934 + Decreto 537/005, prorrogada por el Decreto 83/026',
    detail:
      'La Ley 17.934 faculta al Poder Ejecutivo a reducir «hasta nueve puntos porcentuales», y el Ejecutivo la fijó en los nueve. El Decreto 99/026, de mayo de 2026, sumó el enoturismo a la nómina. A diferencia de la rebaja general, ésta vive de prórrogas: la última, la del Decreto 83/026, llega hasta el 30 de setiembre de 2026.',
  },
]

// ---------------------------------------------------------------------------
// El escalón del 1º de octubre de 2026
// ---------------------------------------------------------------------------

export interface IvaStepDownRow {
  /** Cómo se llama el tramo. */
  readonly period: string
  readonly points: number
  /** El porcentaje sobre el total que publica la DGI para los locales de IVA Mínimo. */
  readonly dgiPublishedPct: number
}

/**
 * El escalón, con los porcentajes que publica la DGI a los dos lados. `dgiPublishedPct` NO es un
 * cálculo nuestro: es el número que la DGI pone en su comunicación. Coincide al centésimo con
 * `ivaDiscountOnTicket(points)`, y ese es justamente el control del test.
 */
export const IVA_STEP_DOWN: readonly IvaStepDownRow[] = [
  { period: 'Hasta el 30 de setiembre de 2026', points: 9, dgiPublishedPct: 7.38 },
  { period: 'Desde el 1º de octubre de 2026', points: 5, dgiPublishedPct: 4.1 },
]

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
  readonly status: 'vigente' | 'sin-prorroga-verificada'
  readonly detail: string
}

/**
 * Qué le queda al turista no residente. La distinción importa: dos beneficios que MinTur publica
 * como de todo el año, y un paquete de reintegros cuya última ventana verificable venció.
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
    benefit: 'Reintegro de nueve puntos en gastronomía, eventos y alquiler de autos',
    status: 'sin-prorroga-verificada',
    detail:
      'Es un beneficio distinto del que tienen los residentes: exige pagar el total con tarjeta emitida en el exterior o transferencia desde el exterior. Su última ventana verificable, la del Decreto 220/025, corrió del 15 de noviembre de 2025 al 30 de abril de 2026. No encontramos norma publicada que la extienda más allá: si viajás, confirmalo con la DGI antes de contarlo como descuento.',
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
      'Depende de qué comprás. En un comercio común la rebaja es de dos puntos de IVA y sólo si pagás con débito, dinero electrónico o un instrumento análogo: sobre la tasa básica del 22 % eso es 1,64 % del total. En gastronomía y turismo la rebaja es de nueve puntos y vale también con tarjeta de crédito: 7,38 % del total, el porcentaje que publica la DGI. Desde el 1º de octubre de 2026 esa segunda rebaja baja a cinco puntos, o 4,1 %.',
  },
  {
    question: '¿La tarjeta de crédito da descuento de IVA?',
    answer:
      'En gastronomía y turismo sí: el régimen de la Ley 17.934 admite tarjeta de crédito, de débito, dinero electrónico e instrumentos análogos de personas físicas. En una compra común no: la rebaja de dos puntos de la Ley 19.210 es sólo para débito, dinero electrónico e instrumentos análogos, así que con crédito no corresponde y no hay nada que reclamar.',
  },
  {
    question: '¿Qué pasa el 1º de octubre de 2026?',
    answer:
      'El Decreto 83/026 prorrogó la rebaja de nueve puntos en gastronomía y turismo sólo hasta el 30 de setiembre de 2026. La DGI publica que desde el 1º de octubre de 2026 la reducción queda fijada en cinco puntos porcentuales, y que el descuento en los locales de IVA Mínimo pasa de 7,38 % a 4,1 % del total de la operación. La rebaja general de dos puntos no cambia: es permanente y no depende de prórrogas.',
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
      'El Ministerio de Turismo publica como vigentes todo el año dos cosas para no residentes: el IVA cero en hoteles y alojamientos, y el régimen Tax Free en los comercios adheridos. El reintegro adicional de nueve puntos en gastronomía, eventos y alquiler de vehículos —que exige pagar con tarjeta emitida en el exterior— tuvo su última ventana verificable hasta el 30 de abril de 2026 y no encontramos una prórroga publicada: conviene confirmarlo con la DGI antes de contar con él.',
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
    label: 'Decreto N° 83/026, art. 1 — prorroga los nueve puntos hasta el 30 de setiembre de 2026',
    url: 'https://www.impo.com.uy/bases/decretos/83-2026',
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
