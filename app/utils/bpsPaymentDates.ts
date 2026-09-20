// Fecha y lugar de cobro de las prestaciones del BPS.
//
// Verificado el 2026-09-20 contra las páginas oficiales del BPS:
//   https://www.bps.gub.uy/22437/calendario-de-cobros.html
//   https://www.bps.gub.uy/23774/como-se-cuando-cobro.html
//   https://www.bps.gub.uy/21940/pago-de-prestaciones-en-setiembre.html
//
// POR QUÉ ESTA PÁGINA NO PUBLICA UN CALENDARIO. El BPS publica DOS PDF por mes (activos y
// pasivos) y la fecha exacta depende de la prestación y de dónde cobres, así que cualquier
// tabla de días que copiáramos acá envejece el 1.º del mes siguiente y manda a alguien a la
// sucursal el día equivocado. Lo que no cambia de un mes al otro es el mecanismo: el pago va
// vencido, quien cobra por banco o dinero electrónico lo tiene el primer día del calendario
// del mes, y hay cuatro formas de averiguar TU fecha. Eso es lo que se publica; la fecha del
// mes se busca en el origen, enlazado.
//
// Módulo PURO (sin Vue/Nuxt, imports relativos) para que vitest lo cargue en Node.

import type { FaqItem } from './faqAnswers'

/** Fecha de la última verificación contra las páginas del BPS. */
export const BPS_COBRO_VERIFIED_AT = '2026-09-20'

export interface BpsSourceLink {
  label: string
  url: string
}

export const BPS_COBRO_SOURCES: readonly BpsSourceLink[] = Object.freeze([
  {
    label: 'BPS — Calendario de cobros',
    url: 'https://www.bps.gub.uy/22437/calendario-de-cobros.html',
  },
  {
    label: 'BPS — ¿Cómo sé cuándo cobro?',
    url: 'https://www.bps.gub.uy/23774/como-se-cuando-cobro.html',
  },
  {
    label: 'BPS — Pago de prestaciones en setiembre',
    url: 'https://www.bps.gub.uy/21940/pago-de-prestaciones-en-setiembre.html',
  },
])

export interface BpsConsultChannel {
  id: string
  name: string
  how: string
  availability: string
}

/** Las cuatro vías que el propio BPS lista para consultar fecha y lugar de cobro. */
export const BPS_CONSULT_CHANNELS: readonly BpsConsultChannel[] = Object.freeze([
  {
    id: 'sms',
    name: 'SMS al 1997',
    how: 'Mandás un mensaje al 1997 con la palabra COBRO y tu número de cédula.',
    availability: 'Sin computadora ni datos: alcanza con la línea del celular.',
  },
  {
    id: 'web',
    name: 'Servicio en línea',
    how: '«Consultar fecha y lugar de cobro de mis prestaciones», en el sitio del BPS.',
    availability: 'En línea, a cualquier hora.',
  },
  {
    id: 'telefono',
    name: 'Teléfono',
    how: '*1997 desde un celular, 0800 1997 desde un fijo o +598 1997 0000 desde el exterior.',
    availability: 'Lunes a viernes de 08:00 a 18:00 h.',
  },
  {
    id: 'presencial',
    name: 'Sucursal',
    how: 'Atención presencial en las sucursales del BPS.',
    availability: 'Lunes a viernes de 09:15 a 16:00 h.',
  },
])

/** Instrumentos de dinero electrónico que el BPS nombra junto con el pago bancario. */
export const BPS_ELECTRONIC_INSTRUMENTS: readonly string[] = Object.freeze([
  'Midinero',
  'DeAnda',
  'Prex',
  'OCA Blue',
])

/** Red descentralizada de cobro en Montevideo. */
export const BPS_NETWORKS_MONTEVIDEO: readonly string[] = Object.freeze([
  'Abitab',
  'Anda',
  'Redpagos',
])

/** Red descentralizada de cobro en el interior: suma los supermercados El Dorado. */
export const BPS_NETWORKS_INTERIOR: readonly string[] = Object.freeze([
  'Abitab',
  'Anda',
  'Redpagos',
  'supermercados El Dorado',
])

/** Lo que hay que llevar para cobrar en una boca de pago. */
export const BPS_REQUIRED_DOCUMENTS: readonly string[] = Object.freeze([
  'Cédula de identidad vigente.',
  'Apoderados, tutores y curadores: además, el último recibo o una fotocopia de la cédula de identidad del titular.',
])

/**
 * El texto exacto del SMS que hay que mandar al 1997, o `null` si la cédula no es plausible.
 *
 * Acepta la cédula como la escribe la gente —con puntos, guion o espacios— porque el número que
 * uno tiene a mano viene de la propia cédula, donde está puntuado. Se queda sólo con los dígitos,
 * DÍGITO VERIFICADOR INCLUIDO: el BPS pide el número de cédula, no el número sin verificador, y
 * recortarlo silenciosamente devolvería un mensaje que el 1997 no reconoce.
 *
 * El rango de 6 a 8 dígitos es a propósito ancho: las cédulas viejas se escriben con menos
 * dígitos que las nuevas y esta función no valida identidades, sólo evita armar un mensaje con
 * un campo vacío o con un teléfono pegado por error.
 */
export function cobroSmsText(cedula: string): string | null {
  const digits = (cedula ?? '').replace(/\D/g, '')
  if (digits.length < 6 || digits.length > 8) return null
  return `COBRO ${digits}`
}

export const BPS_COBRO_FAQ: readonly FaqItem[] = Object.freeze([
  {
    id: 'cuando-cobro',
    question: '¿Cómo sé cuándo cobro del BPS?',
    answer:
      'Mandá un SMS al 1997 con la palabra COBRO y tu número de cédula, o entrá al servicio en línea «Consultar fecha y lugar de cobro de mis prestaciones» del BPS. También podés llamar al *1997 desde un celular o al 0800 1997 desde un fijo, de lunes a viernes de 08:00 a 18:00 h.',
  },
  {
    id: 'mes-que-se-paga',
    question: '¿El pago de este mes es por este mes?',
    answer:
      'No: el BPS paga vencido. En su propio calendario, el pago que se cobra en setiembre de 2026 es el que corresponde a agosto de 2026.',
  },
  {
    id: 'banco-o-boca',
    question: 'Cobro por banco. ¿Tengo que esperar mi fecha?',
    answer:
      'No. Quienes cobran por banco o por un instrumento de dinero electrónico (Midinero, DeAnda, Prex y OCA Blue) reciben el pago directamente en la cuenta el primer día del calendario de pagos del mes. El calendario por fecha rige para el cobro presencial.',
  },
  {
    id: 'donde-cobro',
    question: '¿Dónde se cobra?',
    answer:
      'En Montevideo, en el Edificio Sede del BPS y en la red descentralizada: Abitab, Anda o Redpagos. En el interior, en la red descentralizada de tu localidad: Abitab, Anda, Redpagos o supermercados El Dorado. Los pagos a domicilio en Montevideo y las giras de pago en el interior siguen como siempre.',
  },
  {
    id: 'que-llevar',
    question: '¿Qué documento hay que llevar?',
    answer:
      'La cédula de identidad vigente. Si cobrás como apoderado, tutor o curador, además el último recibo o una fotocopia de la cédula de identidad del titular.',
  },
  {
    id: 'activos-pasivos',
    question: '¿Es el mismo calendario para todas las prestaciones?',
    answer:
      'No. El BPS publica dos calendarios por mes, uno para las prestaciones de activos y otro para las de pasivos, y por eso esta página no copia fechas: la que te toca sale del calendario del mes o de la consulta con tu cédula.',
  },
])
