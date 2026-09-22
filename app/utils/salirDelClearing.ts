// app/utils/salirDelClearing.ts
// Data for /salir-del-clearing: las 7 categorías de la Central de Riesgos del BCU, cómo ver el
// informe de Equifax (gratis y pago), qué pasa de verdad cuando estás en el clearing, y la FAQ.
//
// Por qué existe: "que pasa si estoy en clearing" es una consulta que la página no respondía con
// casos concretos, y "cómo lo veo" sólo tenía la consulta del BCU: faltaban el teléfono gratuito de
// Equifax, el precio del informe online, las alertas gratis y la práctica de Equifax de conservar
// lo cancelado con atraso 3 años (la ley permite hasta 5). Además la página decía que el BCU publica
// el tope de usura una vez por trimestre: lo republica todos los meses sobre una ventana móvil de
// tres meses (el propio job `currency-bcu-rates` lo lee mensualmente).
//
// Cada cifra viene con su fuente y la fecha en que se leyó (`CLEARING_REVIEWED`). Una cifra no se
// "actualiza" a mano: se relee y se refecha, o se retira.
//
// PURE module (no Vue/Nuxt) so the page and the unit tests share it.

import type { FaqItem } from './faqAnswers'

/** Last time every figure below was read against its source. */
export const CLEARING_REVIEWED = '2026-09-22'

// ── Central de Riesgos del BCU ────────────────────────────────────────────────────────────────

export interface BcuRiskCategory {
  id: string
  code: string
  /** Definición tal como la imprime el BCU. */
  definition: string
}

/**
 * Las siete categorías, en el orden del BCU (de mejor a peor). Leídas de
 * https://subsitio.bcu.gub.uy/central-de-riesgos/ el 22 de setiembre de 2026.
 */
export const BCU_RISK_CATEGORIES: readonly BcuRiskCategory[] = Object.freeze([
  { id: 'cat-1a', code: '1A', definition: 'Operaciones con garantías autoliquidables admitidas' },
  { id: 'cat-1c', code: '1C', definition: 'Deudores con capacidad de pago fuerte' },
  { id: 'cat-2a', code: '2A', definition: 'Deudores con capacidad de pago adecuada' },
  {
    id: 'cat-2b',
    code: '2B',
    definition: 'Deudores con capacidad de pago con problemas potenciales',
  },
  { id: 'cat-3', code: '3', definition: 'Deudores con capacidad de pago comprometida' },
  { id: 'cat-4', code: '4', definition: 'Deudores con capacidad de pago muy comprometida' },
  { id: 'cat-5', code: '5', definition: 'Deudores irrecuperables' },
])

export const BCU_CENTRAL_URL = 'https://subsitio.bcu.gub.uy/central-de-riesgos/'
export const BCU_CONSULTA_URL = 'https://consultadeuda.bcu.gub.uy/consultadeuda/'

/** Lo que el BCU dice que NO publica, con sus palabras. */
export const BCU_NOT_PUBLISHED =
  'No se publican las deudas con más de 15 años de su vencimiento, los créditos sobre los cuales haya operado la prescripción ni los extinguidos por remisión.'

// ── Clearing de Informes (Equifax) ────────────────────────────────────────────────────────────

export const EQUIFAX_FAQ_URL = 'https://www.equifax.uy/personas/preguntas-frecuentes/'
export const EQUIFAX_PERSONAS_URL = 'https://www.clearing.com.uy/personas/'

/** Cómo pedir el informe gratis, con las palabras de la FAQ de Equifax. */
export const EQUIFAX_FREE_ACCESS = Object.freeze({
  phone: '2628 1515',
  option: 'interno 1, opción 2',
  hours: 'de lunes a viernes de 9:00 a 17:30',
  delivery: 'llega por mail en 5 días hábiles',
  cadence: 'una vez cada 6 meses',
})

export interface EquifaxProduct {
  id: string
  name: string
  /** Precio tal como lo imprime clearing.com.uy, o "Gratis". */
  price: string
  note: string
}

/** Precios de clearing.com.uy/personas, página renderizada el 22 de setiembre de 2026. */
export const EQUIFAX_PRODUCTS: readonly EquifaxProduct[] = Object.freeze([
  {
    id: 'miclearing',
    name: 'MiClearing',
    price: '$ 540',
    note: 'Con las palabras de Equifax: "información detallada sobre tu comportamiento comercial y crediticio", online.',
  },
  {
    id: 'huella-3',
    name: 'Huella Financiera, 3 meses',
    price: '$ 740',
    note: 'La variante de tres meses, tal como la lista Equifax.',
  },
  {
    id: 'huella-6',
    name: 'Huella Financiera, 6 meses',
    price: '$ 990',
    note: 'La variante de seis meses, tal como la lista Equifax.',
  },
  {
    id: 'alertas',
    name: 'Alertas MiClearing',
    price: 'Gratis',
    note: 'Aviso por mail cuando cambia tu reporte.',
  },
  {
    id: 'gestiones',
    name: 'Mis Gestiones (correcciones)',
    price: 'Gratis',
    note: 'Reclamos directos ante Equifax, respuesta en 5 días hábiles; "no requiere gestores ni intermediarios".',
  },
])

/** Qué avisan las alertas gratuitas, según la FAQ de Equifax. */
export const EQUIFAX_ALERT_EVENTS: readonly string[] = Object.freeze([
  'incumplimientos',
  'cancelaciones',
  'denuncias de cédula',
  'refinanciaciones',
  'cheques rechazados',
  'cuentas suspendidas',
])

/** Años que Equifax declara conservar una "operación cancelada con atraso" (la ley permite 5). */
export const EQUIFAX_CANCELLED_YEARS = 3

// ── Qué pasa si estás en el clearing ──────────────────────────────────────────────────────────

export interface ClearingConsequence {
  id: string
  title: string
  text: string
  sourceLabel?: string
  sourceUrl?: string
}

export const CLEARING_CONSEQUENCES: readonly ClearingConsequence[] = Object.freeze([
  {
    id: 'garantia-alquiler',
    title: 'La garantía de alquiler se complica, aunque no siempre se cierra',
    text: 'Las aseguradoras y las inmobiliarias consultan el Clearing antes de dar una garantía. Un usuario con reporte 1C fue rechazado inicialmente por Porto para una garantía de alquiler; al reenviar la solicitud con su reporte Clearing, la aceptaron (r/uruguay, junio de 2026). En ese caso, lo que cambió el resultado fue presentar el informe uno mismo en vez de dejar que lo leyeran por su cuenta.',
    sourceLabel: 'r/uruguay — hilo sobre una garantía de alquiler rechazada (6 de junio de 2026)',
    sourceUrl: 'https://reddit.com/r/uruguay/comments/1typb0p/clearing_de_mierda/',
  },
  {
    id: 'prestamos',
    title: 'Los bancos y casi todas las financieras te dicen que no',
    text: 'OCA exige "no figurar actualmente en el clearing", Crédito de la Casa pide no tener incumplimientos en Infocred ni Clearing ni siquiera para su línea chica, República Microfinanzas exige "sin morosidad vigente en Clearing de informes y/o sistema financiero" y el BROU pide no tener información negativa. La única que dice en su propia página que presta estando en el clearing es Pronto!, sujeto a evaluación, y la puerta que queda abierta es la cara: la tasa se acerca al tope legal.',
  },
  {
    id: 'despues-de-pagar',
    title: 'Pagar no te borra: te deja como "cancelada"',
    text: 'Una persona de 24 años que figuró como 5C en el BCU y en el Clearing, pagó todo y sigue rechazada, contó su caso en r/uruguay en julio de 2026, y en los comentarios le dijeron "5 años", "3 años si pagaste con atraso" y "hasta 15 años dependiendo del rubro". La ley dice hasta 5 años no renovables para una obligación cancelada, contados desde el pago; Equifax declara que conserva la "operación cancelada con atraso" 3 años.',
    sourceLabel: 'r/uruguay — Mejorar historial crediticio (24 de julio de 2026)',
    sourceUrl: 'https://reddit.com/r/uruguay/comments/1v5gvl4/mejorar_historial_crediticio/',
  },
  {
    id: 'retencion',
    title: 'Del sueldo no te descuentan por estar en el clearing',
    text: 'Una retención sobre el sueldo o la jubilación sólo existe si la autorizaste en el contrato o hay convenio. Verde, por ejemplo, avisa que ante atraso registra en Clearing de Informes y retiene el 20 % de haberes salariales, jubilación o pensión. Y la Ley 17.829 (art. 3) fija un piso: tenés que cobrar en mano al menos el 35 % del nominal, deducidos impuestos y aportes.',
    sourceLabel: 'IMPO — Ley 17.829, retenciones sobre retribuciones salariales y pasividades',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/17829-2004',
  },
  {
    id: 'estafa',
    title: 'Nadie te "saca" del clearing por un pago',
    text: 'Las gestiones de corrección se hacen gratis y directamente ante Equifax, que lo dice con estas palabras: "no requiere gestores ni intermediarios". Lo único que existe es corregir un error, pagar o refinanciar (queda como cancelada) y esperar la caducidad. Quien te cobra por adelantado para "liberar" un préstamo o "borrarte" del registro te está estafando.',
    sourceLabel: 'Equifax — sitio de personas (Mis Gestiones)',
    sourceUrl: 'https://www.clearing.com.uy/personas/',
  },
])

// ── FAQ ───────────────────────────────────────────────────────────────────────────────────────

/** Las preguntas visibles y el FAQPage salen de la misma lista. */
export function clearingFaq(): FaqItem[] {
  return [
    {
      id: 'que-pasa',
      question: '¿Qué pasa si estoy en clearing?',
      answer:
        'Te rechazan tarjetas, préstamos de banco y de la mayoría de las financieras, y una garantía de alquiler puede trabarse: un usuario con reporte 1C fue rechazado inicialmente por Porto y lo aceptaron al reenviar la solicitud con su reporte Clearing. Del sueldo no te descuentan nada por figurar; una retención sólo existe si la autorizaste. Lo que queda es caro (la única financiera que publica que presta estando en el clearing es Pronto!), así que el primer paso es mirar el informe gratis y corregir lo que esté mal.',
      link: {
        label: 'Quién presta sólo con la cédula y a qué tasa',
        to: '/prestamo-sin-recibo-de-sueldo-uruguay',
      },
    },
    {
      id: 'cuanto-tiempo',
      question: '¿Cuánto tiempo quedo en el clearing?',
      answer:
        'Depende de si pagaste. Una obligación impaga se registra por cinco años desde que la incorporaron, y si al vencer sigue impaga el acreedor puede pedir por única vez, dentro de los treinta días anteriores al vencimiento, un nuevo registro por otros cinco: pueden ser diez años. Una obligación ya cancelada permanece registrada como tal por un máximo de cinco años no renovables, contados desde la cancelación (Ley 18.331, art. 22); Equifax declara que la conserva como "operación cancelada con atraso" tres años. Cuando pagás, el acreedor tiene cinco días hábiles para avisar y la base tres días hábiles para actualizar.',
    },
    {
      id: 'como-lo-veo',
      question: '¿Cómo sé si estoy en el clearing y cuánto cuesta el informe?',
      answer:
        'Gratis: llamá al 2628 1515, interno 1, opción 2, de lunes a viernes de 9:00 a 17:30, y el informe llega por mail en 5 días hábiles, una vez cada 6 meses (Ley 18.331, art. 14). Online en clearing.com.uy cuesta $ 540 (MiClearing) o $ 740 y $ 990 (Huella Financiera por 3 o 6 meses); las Alertas MiClearing son gratuitas. Tu calificación en el Banco Central se consulta gratis en consultadeuda.bcu.gub.uy. Precios vistos el 22 de setiembre de 2026.',
    },
    {
      id: 'clearing-vs-bcu',
      question: '¿Es lo mismo el Clearing de Informes que la Central de Riesgos del BCU?',
      answer:
        'No. El Clearing de Informes es una base privada de Equifax, alimentada por comercios, financieras y empresas. La Central de Riesgos es el registro oficial del Banco Central, donde figuran tus créditos con instituciones supervisadas y tu categoría: 1A, 1C, 2A, 2B, 3, 4 o 5. Podés estar en uno y no en el otro, y el reclamo por una calificación del BCU se hace primero ante la institución y después ante el Banco Central.',
    },
    {
      id: 'tasa',
      question: '¿Me pueden cobrar cualquier tasa de interés?',
      answer:
        'No. La Ley 18.212 fija topes de usura sobre las tasas medias que publica el BCU, y el BCU republica esa tabla todos los meses sobre una ventana móvil de tres meses, por tipo de crédito, plazo y monto. Cobrar por encima del tope es usura, que es un delito. Los topes vigentes, con la fecha de su tabla, están en la página de préstamos sin recibo de sueldo.',
      link: { label: 'Ver los topes vigentes', to: '/prestamo-sin-recibo-de-sueldo-uruguay' },
    },
  ]
}

// ── Fuentes ───────────────────────────────────────────────────────────────────────────────────

export const CLEARING_SOURCES: readonly { label: string; url: string }[] = Object.freeze([
  { label: 'BCU — Consulta de la Central de Riesgos Crediticios (gratis)', url: BCU_CONSULTA_URL },
  { label: 'BCU — Central de Riesgos: categorías y qué no se publica', url: BCU_CENTRAL_URL },
  { label: 'Equifax Uruguay — Preguntas frecuentes para personas', url: EQUIFAX_FAQ_URL },
  { label: 'Equifax — informes y precios para personas', url: EQUIFAX_PERSONAS_URL },
  {
    label: 'Ley 18.331 — Protección de Datos Personales y acción de Habeas Data',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008',
  },
  {
    label: 'Ley 17.829 — Retenciones sobre retribuciones salariales y pasividades',
    url: 'https://www.impo.com.uy/bases/leyes/17829-2004',
  },
  {
    label: 'BCU — Topes de tasas de interés y usura (Ley 18.212)',
    url: 'https://usuariofinanciero.bcu.gub.uy/tasas/topes-de-tasas-de-interes-y-usura/',
  },
  {
    label: 'Unidad Reguladora y de Control de Datos Personales (URCDP)',
    url: 'https://www.gub.uy/unidad-reguladora-control-datos-personales/',
  },
])
