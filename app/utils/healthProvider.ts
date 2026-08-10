// app/utils/healthProvider.ts
// Datos + motor de /cambiar-de-mutualista-uruguay: cuándo te toca el «corralito mutual» según el
// dígito de tu cédula, qué pide BPS para dejarte cambiar, y la devolución de FONASA que mucha
// gente no sabe que le corresponde.
//
// POR QUÉ EXISTE: la auditoría de 13.196 hilos de r/uruguay, r/AskUruguayan, r/Burises,
// r/UruguayFinanzas y r/LegalUruguay puso «mutualista y FONASA» entre los clusters de demanda más
// grandes (125 hilos, ~1.960 comentarios) y el repo no tenía UNA sola mención del cambio de
// prestador ni de la devolución. Las tasas de aporte al FONASA ya estaban en `payroll.ts`; lo que
// faltaba era el trámite y la plata que vuelve.
//
// MÓDULO PURO (sin Vue/Nuxt), compartido con `app/tests/unit/healthProvider.test.ts`.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-09:
//   - BPS, «Cambio de prestador de salud» (movilidad regulada, calendario por dígito,
//     23 meses de permanencia, excepciones y fecha de efectividad)
//     https://www.bps.gub.uy/16772/cambio-de-prestador-de-salud.html
//   - BPS, «Devolución Fonasa» (quiénes están comprendidos y desde cuándo se cobra)
//     https://www.bps.gub.uy/10573/devolucion-fonasa.html
//   - Decreto 359/007 — tiempos de espera cuyo incumplimiento habilita el cambio fuera de fecha
//     https://www.impo.com.uy/bases/decretos/359-2007

/** Fecha en que cada regla de este módulo se contrastó con las fuentes de arriba. */
export const HEALTH_VERIFIED_AT = '2026-08-09'

export interface HealthSource {
  label: string
  url: string
}

export const HEALTH_SOURCES: readonly HealthSource[] = Object.freeze([
  {
    label: 'BPS — Cambio de prestador de salud (movilidad regulada)',
    url: 'https://www.bps.gub.uy/16772/cambio-de-prestador-de-salud.html',
  },
  {
    label: 'BPS — Devolución Fonasa',
    url: 'https://www.bps.gub.uy/10573/devolucion-fonasa.html',
  },
  {
    label: 'Decreto 359/007 — tiempos de espera en la atención',
    url: 'https://www.impo.com.uy/bases/decretos/359-2007',
  },
  {
    label: 'Decreto 317/025 art. 18 — valor del CPE desde el 1/1/2026',
    url: 'https://www.impo.com.uy/bases/decretos/317-2025',
  },
])

// ---------------------------------------------------------------------------
// Movilidad regulada — el «corralito mutual»
// ---------------------------------------------------------------------------

/** Meses de permanencia exigidos en el prestador actual para poder cambiarse. */
export const MIN_PERMANENCE_MONTHS = 23

/**
 * A cada dígito verificador de la cédula le toca un mes. No hay movilidad en enero ni febrero:
 * el calendario arranca en marzo con el dígito 3 y termina en diciembre con el 2.
 *
 * Se guarda como mapa dígito → mes (1-12) porque la pregunta del lector siempre es en ese
 * sentido: «tengo cédula terminada en 7, ¿cuándo me toca?».
 */
export const DIGIT_MONTH: Readonly<Record<number, number>> = Object.freeze({
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  0: 10,
  1: 11,
  2: 12,
})

export const MONTH_NAMES: readonly string[] = Object.freeze([
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
])

export interface MobilityAnswer {
  /** Mes que le toca a ese dígito (1-12), o null si el dígito no es válido. */
  month: number | null
  monthName: string | null
  /** ¿Llega a los 23 meses de permanencia? */
  meetsPermanence: boolean
  /** Cuántos meses le faltan para llegar. 0 si ya llega. */
  monthsShort: number
  /** Puede cambiarse en la ventana de este año. */
  canChange: boolean
  /** Qué le decimos, en una línea. */
  verdict: string
}

/**
 * ¿Le toca cambiar y puede?
 *
 * `permanenceMonths` es cuántos meses lleva en su prestador actual. El requisito se evalúa al
 * último día del mes anterior al del dígito, pero eso es un detalle de borde que no cambia la
 * respuesta útil: o llega a 23 o le faltan N.
 */
export function checkMobility(input: {
  cedulaDigit: number
  permanenceMonths: number
}): MobilityAnswer {
  const digit = Number(input.cedulaDigit)
  const month = Object.prototype.hasOwnProperty.call(DIGIT_MONTH, digit) ? DIGIT_MONTH[digit] : null
  const permanence = Math.max(0, input.permanenceMonths || 0)
  const meetsPermanence = permanence >= MIN_PERMANENCE_MONTHS
  const monthsShort = meetsPermanence ? 0 : MIN_PERMANENCE_MONTHS - permanence

  if (month === null) {
    return {
      month: null,
      monthName: null,
      meetsPermanence,
      monthsShort,
      canChange: false,
      verdict: 'Ese no es un dígito válido de cédula (tiene que ser de 0 a 9).',
    }
  }

  const monthName = MONTH_NAMES[month - 1]
  const verdict = meetsPermanence
    ? `Te toca en ${monthName} y llegás a los ${MIN_PERMANENCE_MONTHS} meses de permanencia: podés cambiarte.`
    : `Te toca en ${monthName}, pero te faltan ${monthsShort} ${
        monthsShort === 1 ? 'mes' : 'meses'
      } para llegar a los ${MIN_PERMANENCE_MONTHS} de permanencia.`

  return {
    month,
    monthName,
    meetsPermanence,
    monthsShort,
    canChange: meetsPermanence,
    verdict,
  }
}

export interface MobilityRequirement {
  label: string
  detail: string
}

export const MOBILITY_REQUIREMENTS: readonly MobilityRequirement[] = Object.freeze([
  {
    label: '23 meses en el mismo prestador',
    detail:
      'Contados al último día del mes anterior al que te toca por tu dígito. Es la razón por la que no se puede saltar de mutualista todos los años.',
  },
  {
    label: 'Cobertura activa',
    detail: 'Tenés que estar con cobertura vigente en el momento del cambio.',
  },
  {
    label: 'Se evalúa sobre el generante',
    detail:
      'Las condiciones se miran únicamente sobre quien genera el derecho, no sobre cada integrante del núcleo.',
  },
  {
    label: 'Se tramita en el prestador nuevo',
    detail: 'Hay que ir con documento de identidad a la institución a la que te querés pasar.',
  },
])

export interface MobilityException {
  title: string
  when: string
  detail: string
  icon: string
}

/** Los casos en que se puede cambiar FUERA del mes que te toca. */
export const MOBILITY_EXCEPTIONS: readonly MobilityException[] = Object.freeze([
  {
    title: 'Te afiliaron de oficio',
    when: 'Dentro de los 180 días de la afiliación',
    detail:
      'Si entraste al sistema y BPS te asignó un prestador sin que lo eligieras, tenés 180 días para elegir otro. Si dejás pasar el plazo, la asignación queda firme y entrás al calendario común.',
    icon: 'mdi-account-question-outline',
  },
  {
    title: 'Te mudaste',
    when: 'Dentro de los 12 meses del cambio de domicilio',
    detail:
      'El cambio de domicilio, o la dificultad de acceso geográfico al prestador, habilita a pedir el cambio fuera de fecha.',
    icon: 'mdi-home-move-outline',
  },
  {
    title: 'Problemas asistenciales',
    when: 'En cualquier momento',
    detail:
      'Si hay problemas serios de atención, la solicitud la analiza la Junta Nacional de Salud (JUNASA), que resuelve si autoriza el cambio.',
    icon: 'mdi-alert-outline',
  },
  {
    title: 'No te cumplen los tiempos de espera',
    when: 'En cualquier momento',
    detail:
      'El Decreto 359/007 fija plazos máximos para consultas y coordinaciones. Si el prestador no los cumple, es causal para pedir el cambio.',
    icon: 'mdi-clock-alert-outline',
  },
])

/** El cambio se hace efectivo el primer día hábil del mes siguiente al trámite. */
export const CHANGE_EFFECTIVE_RULE =
  'Todos los cambios de prestador de salud se hacen efectivos a partir del primer día hábil del mes siguiente al de la tramitación.'

// ---------------------------------------------------------------------------
// Devolución FONASA
// ---------------------------------------------------------------------------

/**
 * Los umbrales que publicó BPS para el último ejercicio liquidado. Se guardan CON su ejercicio
 * y su fecha de pago porque cambian todos los años: publicarlos sin esa etiqueta convierte un
 * dato correcto en uno engañoso doce meses después.
 */
export interface RefundExercise {
  /** Año de los aportes que se liquidan. */
  year: number
  /** Ingreso promedio mensual nominal por encima del cual suele haber devolución. */
  workerThreshold: number
  retireeThreshold: number
  /** Desde cuándo BPS lo puso a disposición. */
  availableFrom: string
}

export const LAST_PUBLISHED_REFUND: RefundExercise = Object.freeze({
  year: 2024,
  workerThreshold: 113167,
  retireeThreshold: 122598,
  availableFrom: '2025-09-22',
})

// ---------------------------------------------------------------------------
// El cambio de 2026: cómo se calcula el tope y por qué va a devolver a menos gente
// ---------------------------------------------------------------------------

/**
 * En la primera versión de esta página no publicamos la fórmula del tope porque el mecanismo del
 * CPE sólo aparecía en fuentes secundarias. Al revisar los hilos de Reddit apareció un dato que
 * obliga a corregir eso: en diciembre de 2025 se firmó un decreto que cambió el cálculo, y el
 * Decreto 317/025 art. 18 fija el CPE con todas las letras. Con ese valor la aritmética cierra
 * exacta ($ 6.693 × 12 × 1,25 = $ 100.395), así que ahora sí es publicable.
 *
 * Decirle a la gente «consultá en BPS» y callar que la regla cambió sería técnicamente correcto
 * y sustancialmente engañoso.
 */

/** Costo Promedio Equivalente mensual del SNS. Decreto 317/025 art. 18. */
export const CPE_MENSUAL = 6693

/** El CPE anterior, para que se vea el salto. */
export const CPE_MENSUAL_ANTERIOR = 4828

/** Desde cuándo rige el CPE nuevo. */
export const CPE_VIGENTE_DESDE = '2026-01-01'

/** El tope se calcula sobre el CPE incrementado en este porcentaje. */
export const TOPE_UPLIFT_PCT = 25

/**
 * Tope anual de aporte personal: el CPE mensual, por la cantidad de personas que cubrís con tu
 * aporte, por doce meses, incrementado un 25 %. Si aportaste por encima de esto, la diferencia
 * es lo que se devuelve.
 */
export function topeAnualAporte(beneficiarios = 1, cpe = CPE_MENSUAL): number {
  const n = Math.max(1, Math.floor(beneficiarios || 1))
  return Math.round(cpe * n * 12 * (1 + TOPE_UPLIFT_PCT / 100))
}

/** A quién le pega el cambio y cuándo. Es lo que la gente necesita saber para no llevarse sorpresas. */
export interface RefundTimeline {
  /** Aportes de este año. */
  contributionYear: number
  /** Se cobran en este año. */
  paidIn: number
  /** Qué régimen los liquida. */
  regime: 'anterior' | 'nuevo'
  note: string
}

export const REFUND_TIMELINE: readonly RefundTimeline[] = Object.freeze([
  {
    contributionYear: 2025,
    paidIn: 2026,
    regime: 'anterior',
    note: 'La devolución por los aportes de 2025 se mantiene con el régimen anterior. Este cambio no la afecta.',
  },
  {
    contributionYear: 2026,
    paidIn: 2027,
    regime: 'nuevo',
    note: 'Acá pega el cambio por primera vez: el tope se calcula con el CPE nuevo, más alto, así que hay que haber aportado más para que sobre algo.',
  },
])

/**
 * El impacto que estimó el propio gobierno. Se publica como estimación oficial y etiquetada como
 * tal, no como certeza: es una proyección, no una liquidación.
 */
export const REFUND_REACH_BEFORE = 155_000
export const REFUND_REACH_AFTER = 81_000

export interface RefundFact {
  title: string
  detail: string
  icon: string
}

export const REFUND_FACTS: readonly RefundFact[] = Object.freeze([
  {
    title: 'Es plata tuya que aportaste de más',
    detail:
      'El aporte al FONASA es un porcentaje del ingreso, pero la cobertura que comprás tiene un costo tope. Si en el año aportaste más que ese tope, la diferencia se devuelve.',
    icon: 'mdi-cash-refund',
  },
  {
    title: 'No es sólo para independientes',
    detail:
      'Alcanza a trabajadores en relación de dependencia, a quienes prestan servicios personales y a jubilados y pensionistas con ingresos altos.',
    icon: 'mdi-account-group-outline',
  },
  {
    title: 'El tope sube si cubrís a otros',
    detail:
      'El tope anual es el CPE mensual por la cantidad de personas que cubrís, por doce meses, más un 25 %. Cuantas más personas cubrís (cónyuge o concubino, hijos menores o con discapacidad), más alto el tope y por lo tanto menos devolución: estás comprando más cobertura.',
    icon: 'mdi-human-male-female-child',
  },
  {
    title: 'Desde 2026 el cálculo cambió y devuelve a menos gente',
    detail:
      'Un decreto de fines de 2025 subió el CPE de $ 4.828 a $ 6.693, lo que sube el tope y deja a menos aportantes por encima de él. Los aportes de 2025 se devuelven con el régimen anterior; el cambio pega recién en la devolución de 2027.',
    icon: 'mdi-trending-down',
  },
  {
    title: 'Se consulta en BPS',
    detail:
      'BPS publica el consultor «¿Estoy comprendido?» y atiende al 0800 2016. Es la vía para saber si te toca y por cuánto.',
    icon: 'mdi-magnify',
  },
])

export interface HealthFaq {
  question: string
  short: string
  answer: string
}

export const HEALTH_FAQ: readonly HealthFaq[] = Object.freeze([
  {
    question: '¿Cuándo puedo cambiar de mutualista?',
    short: 'En el mes que le toca al último dígito de tu cédula, entre marzo y diciembre.',
    answer:
      'La movilidad regulada asigna un mes a cada dígito: marzo para el 3, abril para el 4, y así hasta diciembre para el 2; al 0 le toca octubre y al 1 noviembre. En enero y febrero no hay movilidad. Además tenés que llevar al menos 23 meses en tu prestador actual al último día del mes anterior al tuyo.',
  },
  {
    question: '¿Por qué me piden 23 meses y no 24?',
    short: 'Porque el requisito se mide al último día del mes anterior al de tu dígito.',
    answer:
      'La condición es tener 23 meses cumplidos en el mismo prestador al último día del mes previo al que te corresponde. En la práctica significa que entre un cambio y el siguiente pasan cerca de dos años.',
  },
  {
    question: '¿Puedo cambiarme fuera del mes que me toca?',
    short:
      'Sí, en cuatro situaciones: afiliación de oficio, mudanza, problemas de atención y demoras.',
    answer:
      'Si te afiliaron de oficio tenés 180 días para elegir otro prestador. Si te mudaste, podés pedirlo dentro de los 12 meses. Si hay problemas asistenciales serios o si no te cumplen los tiempos de espera del Decreto 359/007, se puede pedir en cualquier momento y lo resuelve la JUNASA.',
  },
  {
    question: '¿Desde cuándo me atiende la mutualista nueva?',
    short: 'Desde el primer día hábil del mes siguiente al trámite.',
    answer:
      'El cambio no es inmediato: se hace efectivo a partir del primer día hábil del mes siguiente al de la tramitación. Hasta entonces seguís atendiéndote donde estabas.',
  },
  {
    question: '¿Qué es la devolución de FONASA y a quién le toca?',
    short: 'Es el reintegro de lo que aportaste por encima del costo de tu cobertura.',
    answer:
      'El aporte al FONASA es un porcentaje del ingreso, pero la cobertura tiene un costo tope anual que depende de cuántas personas cubrís. Si en el año aportaste más que ese tope, BPS te devuelve la diferencia. Alcanza a dependientes, a quienes prestan servicios personales y a jubilados y pensionistas con ingresos altos.',
  },
  {
    question: '¿Tengo que hacer algo para cobrar la devolución?',
    short: 'Consultá en BPS si estás comprendido; el pago se habilita una vez al año.',
    answer:
      'BPS publica un consultor «¿Estoy comprendido?» y atiende al 0800 2016. Los umbrales de ingreso cambian todos los años, así que no sirve guiarse por el número del año pasado: hay que consultar el del ejercicio que se está liquidando.',
  },
  {
    question: '¿Cómo se calcula el tope por encima del cual hay devolución?',
    short: 'CPE mensual × personas que cubrís × 12 meses, más un 25 %.',
    answer:
      'El Costo Promedio Equivalente (CPE) es lo que el sistema considera que cuesta en promedio la cobertura de una persona. El tope anual de aporte personal se arma multiplicando ese CPE por la cantidad de personas que cubrís con tu aporte y por los doce meses, y agregándole un 25 %. Con el CPE de $ 6.693 que fija el Decreto 317/025, para una persona sola el tope anual da $ 100.395. Todo lo que aportaste por encima de eso es lo que se devuelve.',
  },
  {
    question: '¿Es cierto que desde 2026 devuelven a menos gente?',
    short: 'Sí: subió el CPE, sube el tope, y por lo tanto menos aportantes lo superan.',
    answer:
      'A fines de 2025 se cambió por decreto la forma de calcular el CPE, que pasó de $ 4.828 a $ 6.693 desde el 1° de enero de 2026. Como el tope se calcula sobre el CPE, el tope sube y hay que haber aportado bastante más para que sobre algo. Dos aclaraciones importantes de plazos: la devolución por los aportes de 2025, que se cobra en 2026, se mantiene con el régimen anterior; el cambio recién impacta en la devolución de 2027, por los aportes de 2026. La estimación oficial es que se pasaría de unas 155.000 personas alcanzadas a unas 81.000.',
  },
])
