// app/utils/sickLeaveBenefit.ts
// Motor del subsidio por enfermedad del BPS para /herramientas/calculadora-subsidio-por-enfermedad.
//
// POR QUÉ EXISTE: el sitio ya explica el régimen entero en
// `/guias/me-certifique-subsidio-por-enfermedad-uruguay` (Decreto-Ley 14.407, el tope, el cuarto
// día, la prórroga, el art. 23), pero la pregunta que la gente escribe —«me certificaron N días,
// cuánto me va a pagar el BPS»— no la contesta ningún número de este sitio: hay que leer el 70 %,
// acordarse de que los tres primeros días no se cubren, mirar si el tope muerde y sumar la cuota
// parte de aguinaldo. Eso es una cuenta, y la cuenta vive acá.
//
// MÓDULO PURO (sin Vue/Nuxt), compartido por la página y `app/tests/unit/sickLeaveBenefit.test.ts`.
//
// EL TOPE NO SE CALCULA, SE COPIA, y es la misma trampa que `unemploymentBenefit.ts` documenta en
// `BENEFIT_FLOOR`: el art. 27 del decreto-ley escribe el máximo como «el triple del monto del
// salario mínimo nacional», la Ley 18.725 art. 1 lo reescribió en BPC (4 BPC desde el 1/1/2011,
// +1 por año hasta 8 BPC desde el 1/1/2015) y la Ley 19.003 —art. 1 en la redacción vigente, la
// del art. 739 de la Ley 19.924— sólo lo INDEXA, convirtiendo a BPC los topes vigentes al
// 31/12/2020. O sea que la cantidad de BPC ya no vale 8: con la BPC de 2026 ($ 6.864, ver
// `URUGUAY.bpc`) ocho darían $ 54.912 y el BPS publica $ 67.754. Multiplicar da OTRO número; el
// que se paga es el que el BPS publica cada enero, y por eso va copiado con su fecha al lado.
//
// LO QUE ESTE MÓDULO NO AFIRMA, a propósito y en la misma línea que el resto del sitio:
//
//  a. EL DIVISOR DIARIO NO ESTÁ EN NINGUNA NORMA. Se leyó el Decreto-Ley 14.407 y su reglamento,
//     el Decreto 7/976, y ninguno fija cuántos días tiene el mes para liquidar: el art. 7 del
//     decreto reglamentario sólo dice que el monto máximo mensual «queda fijado para los jornales
//     en veinticinco jornales» y, para los mensuales, en un sueldo. Así que el monto diario de
//     acá es el mensual dividido entre {@link DAYS_PER_MONTH} y la página lo dice con esas
//     palabras: es una estimación nuestra, no una regla publicada, y el recibo del BPS puede
//     diferir. Publicar la ausencia es más honesto que inventar un divisor y presentarlo como ley.
//
//  b. NO SE CALCULA EL LÍQUIDO. El subsidio es materia gravada: los arts. 6 y 8 del Decreto 7/976
//     mandan calcular los aportes «sobre la base del monto del subsidio» y descontar el obrero «en
//     el momento del pago». Cuánto es ese descuento exacto sobre el subsidio no lo publica ninguna
//     de las fuentes leídas, así que acá el total es NOMINAL y la página avisa que el BPS descuenta
//     aportes. Es la misma regla que `unemploymentBenefit.ts` aplica a lo que no está escrito.
//
//  c. NO SIRVE PARA JORNALEROS TAL CUAL. El BPS les liquida por jornal y les cuenta los requisitos
//     distinto (75 jornales en el año anterior al último día trabajado). Esta cuenta toma el
//     promedio MENSUAL, que es la base del mensual, y la página lo dice en vez de disfrazarlo.
//
//  d. NO SE AFIRMA QUIÉN PAGA LOS TRES PRIMEROS DÍAS. Ni el decreto-ley ni el Decreto 7/976 los
//     ponen a cargo del empleador: quedan fuera de la prestación. Si un convenio de rama los paga,
//     sale del convenio, no de esta ley.
//
// FUENTES PRIMARIAS, verificadas el 2026-11-17:
//   - BPS, «Subsidio por enfermedad» (beneficiarios, 70 % de materia gravada, promedio de 180
//     días, tope de $ 67.754 con vigencia 01/2026, tope del patrón rural de $ 40.655, pago desde
//     el cuarto día de certificación y desde el primero con internación, duración y prórroga).
//     Página con «Última actualización: 08/09/2026».
//     https://www.bps.gub.uy/4774/subsidio-por-enfermedad.html
//   - IMPO, texto VIGENTE del Decreto-Ley 14.407: art. 13 num. 2 (el 70 %), art. 14 (cuarto día,
//     internación, un año más un año de prórroga), art. 28 (cuota parte de aguinaldo).
//     https://www.impo.com.uy/bases/decretos-ley/14407-1975
//   - IMPO, Decreto 7/976, reglamento: art. 7 num. II (promedio de los 180 días anteriores y topes
//     de 1976), art. 12 («Conjuntamente con el pago del subsidio el trabajador percibirá la
//     doceava parte del mismo en concepto de aguinaldo»), arts. 6 y 8 (aportes sobre el subsidio).
//     https://www.impo.com.uy/bases/decretos/7-1976
//   - IMPO, Ley 18.725 art. 2: desde el 1/1/2011 la base son «todas las que constituyan materia
//     gravada», que es por qué el BPS no liquida sobre el «sueldo básico» del art. 13 num. 2.
//     https://www.impo.com.uy/bases/leyes/18725-2011/2

/** Fecha en que cada cifra de este módulo se contrastó con las fuentes de arriba. */
export const SICK_LEAVE_VERIFIED_AT = '2026-11-17'

/** El 70 % del art. 13 num. 2 del Decreto-Ley 14.407, que el BPS liquida sobre materia gravada. */
export const SICK_LEAVE_RATE = 0.7

/** Tope mensual que publica el BPS, con su vigencia. NO se calcula: ver el encabezado. */
export const SICK_LEAVE_MONTHLY_CAP = 67754

/** Vigencia del tope, tal como el BPS la escribe. */
export const SICK_LEAVE_CAP_SINCE = '01/2026'

/** Tope mensual del patrón rural: el 70 % del ficto patronal, en palabras del BPS. */
export const SICK_LEAVE_RURAL_PATRON_CAP = 40655

/** Días de certificación que la prestación no cubre (art. 14: se paga «a partir del cuarto día»). */
export const SICK_LEAVE_WAITING_DAYS = 3

/** Ventana del promedio que el BPS toma como base (BPS y Decreto 7/976, art. 7 num. II). */
export const SICK_LEAVE_AVERAGE_WINDOW_DAYS = 180

/** La doceava parte del subsidio, en concepto de aguinaldo (Decreto 7/976, art. 12). */
export const SICK_LEAVE_AGUINALDO_DIVISOR = 12

/**
 * Días por mes para pasar el monto mensual a diario.
 *
 * NO SALE DE NINGUNA NORMA: ver el punto (a) del encabezado. Es el divisor de esta estimación y la
 * página lo declara como tal.
 */
export const DAYS_PER_MONTH = 30

/** Plazo máximo del subsidio y su prórroga, en años (art. 14). */
export const SICK_LEAVE_MAX_YEARS = 1
export const SICK_LEAVE_EXTENSION_YEARS = 1

/** Ventana del art. 15 dentro de la cual se acumulan los tramos de la misma dolencia, en años. */
export const SICK_LEAVE_ACCUMULATION_WINDOW_YEARS = 4

export interface SickLeaveInput {
  /** Promedio mensual nominal de materia gravada de los 180 días previos, en pesos. */
  monthlyBase: number
  /** Días que abarca la certificación. */
  certifiedDays: number
  /** Internación en la mutualista o en el domicilio: se paga desde el primer día. */
  hospitalized?: boolean
}

export interface SickLeaveResult {
  /** La base que entró, saneada (nunca negativa). */
  monthlyBase: number
  /** El 70 % de la base, ANTES del tope. */
  grossMonthly: number
  /** Lo que el BPS liquida por mes: el 70 % o el tope, el menor de los dos. */
  monthly: number
  /** True cuando el tope recorta el 70 %. */
  cappedByTope: boolean
  /** Días de la certificación que la prestación no cubre. Cero con internación. */
  unpaidDays: number
  /** Días que el subsidio paga. */
  paidDays: number
  /** Monto por día: el mensual dividido entre {@link DAYS_PER_MONTH}. Estimación nuestra. */
  daily: number
  /** Subsidio por los días pagos, sin la cuota parte de aguinaldo. */
  subsidy: number
  /** La doceava parte del subsidio (Decreto 7/976, art. 12). */
  aguinaldoShare: number
  /** Subsidio + cuota parte, NOMINAL: el BPS descuenta aportes personales al pagar. */
  total: number
  /** Lo que se deja de cobrar por los días no cubiertos, al mismo monto diario. */
  lostToWaitingDays: number
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** Entero no negativo; cualquier basura de un `<input type="number">` cae en 0. */
const positiveInt = (value: number) => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0)

/** Número no negativo; igual que arriba, pero sin truncar los centavos de un sueldo. */
const positiveAmount = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0)

/**
 * Cuánto paga el BPS por una certificación por enfermedad, con las reglas de las fuentes del
 * encabezado y el divisor diario declarado como estimación.
 */
export function computeSickLeave(input: SickLeaveInput): SickLeaveResult {
  const monthlyBase = positiveAmount(input.monthlyBase)
  const certifiedDays = positiveInt(input.certifiedDays)

  const grossMonthly = round2(monthlyBase * SICK_LEAVE_RATE)
  const cappedByTope = grossMonthly > SICK_LEAVE_MONTHLY_CAP
  const monthly = cappedByTope ? SICK_LEAVE_MONTHLY_CAP : grossMonthly

  const waiting = input.hospitalized ? 0 : SICK_LEAVE_WAITING_DAYS
  const unpaidDays = Math.min(certifiedDays, waiting)
  const paidDays = Math.max(0, certifiedDays - waiting)

  const daily = round2(monthly / DAYS_PER_MONTH)
  const subsidy = round2(daily * paidDays)
  const aguinaldoShare = round2(subsidy / SICK_LEAVE_AGUINALDO_DIVISOR)

  return {
    monthlyBase,
    grossMonthly,
    monthly,
    cappedByTope,
    unpaidDays,
    paidDays,
    daily,
    subsidy,
    aguinaldoShare,
    total: round2(subsidy + aguinaldoShare),
    lostToWaitingDays: round2(daily * unpaidDays),
  }
}

/** La base mensual a partir de la cual el tope empieza a morder. */
export function baseWhereCapBites(): number {
  return round2(SICK_LEAVE_MONTHLY_CAP / SICK_LEAVE_RATE)
}
