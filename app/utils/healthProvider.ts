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
      'Cuantas más personas cubrís con tu aporte (cónyuge o concubino, hijos menores o con discapacidad), más alto es el tope anual y por lo tanto menos devolución hay: pagás más cobertura.',
    icon: 'mdi-human-male-female-child',
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
])
