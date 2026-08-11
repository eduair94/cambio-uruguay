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
//
// AMPLIACIÓN 2026-08-10 (cese laboral, urgencias y obligatoriedad), fuentes propias:
//   - BPS, «Afiliación mutual trabajadores» — pérdida del amparo al SNS y continuidad de 12 meses
//     de los hijos menores
//     https://www.bps.gub.uy/6486/afiliacion-mutual-trabajadores.html
//   - gub.uy, «Afiliación a ASSE» — el trámite, las tres modalidades y su costo
//     https://www.gub.uy/tramites/afiliacion-asse
//   - Ley 19.535 arts. 145 a 148 — urgencia y emergencia NO tienen la misma regla: el centro más
//     próximo es de la EMERGENCIA (art. 147 inc. 2); en la URGENCIA sólo se puede ir a otro
//     prestador si el propio no tiene sede ni cobertura en esa localidad (art. 145 inc. 5)
//     https://www.impo.com.uy/bases/leyes/19535-2017/145
//   - Decreto 211/018 — reglamentación: qué paga el usuario y cómo se salda entre prestadores
//     https://www.impo.com.uy/bases/decretos/211-2018
//   - Ley 18.731 art. 30 — los 12 meses de continuidad de los menores de 18 y de los mayores con
//     discapacidad: se cuentan desde el mes SIGUIENTE al cese y cesan si consiguen amparo propio
//     https://www.impo.com.uy/bases/leyes/18731-2011/30
//   - BPS, «Extensión de cobertura de salud para trabajadores despedidos o con cese de
//     actividades» (13/8/2020) — la medida COVID que Google devuelve primero, con su ventana
//     https://www.bps.gub.uy/17508/extension-de-cobertura-de-salud-para-trabajadores-despedidos-o-con-cese-de-actividades.html
//   - Presidencia, «Gobierno extiende cobertura de salud para trabajadores en situación de
//     despido» (11/8/2020) — el anuncio y el Fondo Coronavirus que la financió
//     https://www.gub.uy/presidencia/comunicacion/noticias/gobierno-extiende-cobertura-salud-para-trabajadores-situacion-despido-0
//   - Ley 18.211 arts. 11, 47, 50, 58 y 61 — quiénes integran el SNIS, elección libre, no rechazo
//     y carácter obligatorio del aporte
//     https://www.impo.com.uy/bases/leyes/18211-2007
//   - Ley 17.930 art. 265 — los seguros integrales privados habilitados por el MSP
//     https://www.impo.com.uy/bases/leyes/17930-2005/265
//   - BPS, «¿Cuáles son las tasas de aportes Fonasa que se aplican?» — de qué depende el porcentaje
//     https://www.bps.gub.uy/13406/cuales-son-las-tasas-de-aportes-fonasa-que-se-aplican.html
//
// CORRECCIÓN 2026-08-10 (la salida que faltaba). La primera versión enumeraba «las cuatro salidas
// fuera de fecha» y omitía la más ancha, que estaba a la vista en la fuente citada en primer
// lugar: BPS 16772 dice, bajo «Condiciones para realizar el cambio», que «el cambio hacia ASSE o
// seguros integrales puede realizarse en cualquier momento». El costo era concreto: alguien que
// se quiere pasar a ASSE no se reconocía en ninguna de las cuatro y esperaba hasta once meses su
// mes por dígito para un cambio que puede tramitar hoy. Las normas que lo dicen en términos:
//   - Decreto 344/020 — movilidad regulada. Art. 17: «Todos los usuarios del Seguro Nacional de
//     Salud, sin excepción, podrán en cualquier momento cambiar de prestador integral de salud a
//     la Administración de los Servicios de Salud del Estado». Art. 13: dos años calendario de
//     permanencia después de CUALQUIER cambio. Art. 8 lit. b: los asignados de oficio a ASSE no
//     esperan la antigüedad. Art. 15: efectividad el primer día hábil del mes siguiente.
//     https://www.impo.com.uy/bases/decretos/344-2020
//   - Decreto 114/023 — causales excepcionales (art. 1: mudanza DE UN DEPARTAMENTO A OTRO,
//     problemas asistenciales, tiempos de espera) y art. 5, que ratifica el traslado a ASSE «sin
//     excepciones» y «en cualquier momento»
//     https://www.impo.com.uy/bases/decretos/114-2023

/** Fecha en que cada regla de este módulo se contrastó con las fuentes de arriba. */
export const HEALTH_VERIFIED_AT = '2026-08-09'

/**
 * El bloque de cese laboral, urgencias y obligatoriedad se agregó después y se contrastó en otra
 * fecha. Se declara aparte en vez de pisar `HEALTH_VERIFIED_AT`: decir que TODO el módulo se
 * revisó hoy porque se revisó una parte es exactamente la clase de exageración que hace que la
 * fecha deje de servir para algo.
 */
export const HEALTH_COVERAGE_VERIFIED_AT = '2026-08-10'

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
    label:
      'Decreto 344/020 — movilidad regulada: art. 17 (traslado a ASSE en cualquier momento) y art. 13 (dos años de permanencia)',
    url: 'https://www.impo.com.uy/bases/decretos/344-2020',
  },
  {
    label:
      'Decreto 114/023 — causales excepcionales (art. 1) y ratificación del traslado libre a ASSE (art. 5)',
    url: 'https://www.impo.com.uy/bases/decretos/114-2023',
  },
  {
    label: 'Decreto 317/025 art. 18 — valor del CPE desde el 1/1/2026',
    url: 'https://www.impo.com.uy/bases/decretos/317-2025',
  },
  {
    label: 'BPS — Afiliación mutual trabajadores (pérdida del amparo y continuidad de los hijos)',
    url: 'https://www.bps.gub.uy/6486/afiliacion-mutual-trabajadores.html',
  },
  {
    label: 'gub.uy — Afiliación a ASSE',
    url: 'https://www.gub.uy/tramites/afiliacion-asse',
  },
  {
    label:
      'Ley 19.535 arts. 145 a 148 — urgencia y emergencia: el centro más próximo es regla de la emergencia',
    url: 'https://www.impo.com.uy/bases/leyes/19535-2017/145',
  },
  {
    label: 'Decreto 211/018 — reglamentación de la atención de urgencia y emergencia',
    url: 'https://www.impo.com.uy/bases/decretos/211-2018',
  },
  {
    label: 'Ley 18.211 arts. 11, 47, 50, 58 y 61 — SNIS: quiénes lo integran, elección y aportes',
    url: 'https://www.impo.com.uy/bases/leyes/18211-2007',
  },
  {
    label: 'Ley 17.930 art. 265 — seguros integrales privados habilitados por el MSP',
    url: 'https://www.impo.com.uy/bases/leyes/17930-2005/265',
  },
  {
    label: 'BPS — Tasas de aportes Fonasa que se aplican',
    url: 'https://www.bps.gub.uy/13406/cuales-son-las-tasas-de-aportes-fonasa-que-se-aplican.html',
  },
  {
    label:
      'Ley 18.731 art. 30 — los 12 meses de continuidad de los menores y de los mayores con discapacidad',
    url: 'https://www.impo.com.uy/bases/leyes/18731-2011/30',
  },
  {
    label:
      'BPS — Extensión de cobertura de salud para despedidos (13/8/2020, medida COVID vencida)',
    url: 'https://www.bps.gub.uy/17508/extension-de-cobertura-de-salud-para-trabajadores-despedidos-o-con-cese-de-actividades.html',
  },
  {
    label: 'Presidencia — Gobierno extiende cobertura de salud para despedidos (11/8/2020)',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/gobierno-extiende-cobertura-salud-para-trabajadores-situacion-despido-0',
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
      'Contados al último día del mes anterior al que te toca por tu dígito. Es la razón por la que no se puede saltar de mutualista todos los años. Una excepción: si BPS te afilió de oficio a ASSE, no tenés que esperar la antigüedad — quedás habilitado en el año calendario siguiente a esa asignación (Decreto 344/020 art. 8 lit. b), aunque igual tenés que ir en el mes de tu dígito.',
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
  {
    label: 'Declaración jurada, siempre',
    detail:
      'Todas las solicitudes de cambio, sin importar la causal, van acompañadas de una declaración jurada en la que manifestás que la elección es libre e informada y que no recibiste dinero ni otra ventaja equivalente por cambiarte (Decreto 344/020 art. 14 y Decreto 114/023 art. 6).',
  },
])

export interface MobilityException {
  title: string
  when: string
  detail: string
  icon: string
}

/**
 * LA REGLA QUE ESTA PÁGINA OMITÍA. El calendario por dígito sólo gobierna el cambio HACIA una
 * mutualista. Hacia ASSE o hacia un seguro integral no hay calendario, y no es una lectura
 * nuestra: BPS lo pone entre las condiciones del cambio, y para ASSE hay dos decretos vigentes
 * que lo dicen con las palabras «sin excepción» y «en cualquier momento».
 *
 * Se declara como constante propia además de estar en `MOBILITY_EXCEPTIONS` porque el lector que
 * más la necesita no llega a la sección de excepciones: llega al calculador, lee «te toca en
 * noviembre» y se va. Va arriba, al lado del veredicto.
 */
export const ASSE_ANYTIME_RULE =
  'El calendario por dígito manda sólo si te pasás a una mutualista. El cambio hacia ASSE o hacia un seguro integral se puede tramitar en cualquier momento del año: BPS lo publica entre las condiciones del cambio («el cambio hacia ASSE o seguros integrales puede realizarse en cualquier momento»), y para ASSE lo dicen además dos decretos vigentes — el Decreto 344/020 art. 17, «todos los usuarios del Seguro Nacional de Salud, sin excepción, podrán en cualquier momento cambiar de prestador integral de salud a la Administración de los Servicios de Salud del Estado», y el Decreto 114/023 art. 5, que lo ratifica sin excepciones. No hace falta causal, ni resolución de la JUNASA, ni esperar tu mes.'

/**
 * La contrapartida, que va pegada a la regla anterior o la convierte en una trampa: entrar es
 * libre, salir no. Publicar la puerta abierta sin el candado del art. 13 hace que alguien se
 * pase a ASSE en marzo creyendo que puede volver en abril.
 */
export const POST_CHANGE_LOCK_RULE =
  'Ojo con la vuelta: una vez formalizado el cambio de prestador «por cualquier concepto», el Decreto 344/020 art. 13 exige permanecer un mínimo de dos años calendario en el prestador elegido. Es el mismo período que BPS evalúa como los 23 meses al último día del mes anterior al de tu dígito. Pasarte a ASSE es libre y es hoy; volver a una mutualista vuelve a estar atado al calendario.'

/** Los casos en que se puede cambiar FUERA del mes que te toca. */
export const MOBILITY_EXCEPTIONS: readonly MobilityException[] = Object.freeze([
  {
    title: 'Te pasás a ASSE o a un seguro integral',
    when: 'En cualquier momento',
    detail:
      'La salida más ancha, y la que casi nunca se publica. BPS la pone entre las condiciones del cambio: el cambio hacia ASSE o seguros integrales puede realizarse en cualquier momento. Para ASSE está además en dos decretos vigentes: el 344/020 art. 17 habilita a todos los usuarios del Seguro Nacional de Salud, sin excepción, a pasarse a ASSE en cualquier momento, y el 114/023 art. 5 lo ratifica. No necesitás causal ni que lo resuelva la JUNASA: vas al prestador nuevo y registrás la afiliación, como cualquier cambio. Las causales de acá abajo existen para lo otro: son las que te habilitan a salir hacia un prestador privado fuera de tu mes. Hacia ASSE no hacen falta.',
    icon: 'mdi-door-open',
  },
  {
    title: 'Te afiliaron de oficio',
    when: 'Dentro de los 180 días de la afiliación',
    detail:
      'Si entraste al sistema y BPS te asignó un prestador sin que lo eligieras, tenés 180 días para elegir otro. Si dejás pasar el plazo, la asignación queda firme y entrás al calendario común.',
    icon: 'mdi-account-question-outline',
  },
  {
    title: 'Te mudaste a otro departamento',
    when: 'Dentro de los 12 meses de la mudanza',
    detail:
      'No alcanza con cambiar de barrio: la causal es trasladar el domicilio de un departamento a otro, o acreditar dificultades supervinientes de acceso geográfico a los servicios de tu prestador (Decreto 114/023 art. 1 lit. a). Hay que pedirlo antes de que pasen 12 meses de concretada la radicación en el otro departamento o de generada la dificultad, y hay que probarlo.',
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
  'Todos los cambios de prestador de salud se hacen efectivos a partir del primer día hábil del mes siguiente al de la tramitación (Decreto 344/020 art. 15).'

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

// ---------------------------------------------------------------------------
// Cuando se corta el trabajo: renuncia, despido, fin del seguro de paro
// ---------------------------------------------------------------------------

/**
 * `unemploymentBenefit.ts` ya responde el caso DURANTE el subsidio (seguís cubierto y el FONASA
 * sale del propio subsidio). Lo que faltaba en las dos páginas es el día después, que es cuando
 * la gente pregunta. La respuesta honesta es incómoda: para el generante no hay período de
 * continuidad publicado. El amparo se cae.
 */

/**
 * Meses que la continuidad mantiene el amparo del Seguro. Ley 18.731 art. 30: «por un período de
 * doce meses continuos contados a partir del mes siguiente al del cese de la aportación».
 */
export const MINOR_CONTINUITY_MONTHS = 12

/**
 * Aportes mínimos del generante para que esa continuidad se active. La ley lo dice como «en la
 * medida en que el período de aportación haya sido no menor a un año».
 */
export const MINOR_CONTINUITY_MIN_CONTRIB_MONTHS = 12

/**
 * …contados dentro de esta ventana anterior al cese o al fin del subsidio. OJO: la ventana de 24
 * meses NO está en la ley, que sólo exige «no menor a un año»; es el criterio de cómputo que
 * publica BPS en «Afiliación mutual trabajadores». Se guarda separado por eso.
 */
export const MINOR_CONTINUITY_WINDOW_MONTHS = 24

/**
 * LA TRAMPA DE GOOGLE. Buscando «cobertura de salud despido» el primer resultado de BPS es una
 * extensión de tres meses del FONASA para despedidos, sin fecha visible en el título. Es de
 * agosto de 2020, alcanzaba únicamente a quien perdía la cobertura entre el 1° de agosto y el
 * 31 de octubre de ese año y la pagó el Fondo Coronavirus. Se modela como dato NO vigente para
 * poder desmentirla en la página: callarla no evita que la gente la encuentre.
 */
export const EXTENSION_TRES_MESES_2020 = Object.freeze({
  year: 2020,
  months: 3,
  window: 'quienes perdieran la cobertura entre el 1° de agosto y el 31 de octubre de 2020',
  funding: 'Fondo Coronavirus (Fondo Solidario COVID-19)',
  inForce: false,
})

export interface CoverageFallback {
  title: string
  detail: string
  icon: string
}

/** Qué te queda cuando se te cae el amparo al Seguro Nacional de Salud. */
export const COVERAGE_FALLBACKS: readonly CoverageFallback[] = Object.freeze([
  {
    title: 'ASSE, pero tenés que ir a inscribirte',
    detail:
      'No es automático: la afiliación a ASSE es un trámite presencial en un puesto de afiliación, y el trámite no tiene costo. Llevá documento de identidad vigente, certificado de ingresos de todos los integrantes del hogar y certificado de residencia (o, en subsidio, la constancia de residencia en trámite: no es lo mismo que una constancia de domicilio, que es otro papel). El calendario por dígito no te frena, por dos motivos distintos según dónde estés parado: si ya perdiste el amparo no sos usuario del Seguro Nacional de Salud y la movilidad regulada no te aplica — lo que te falta es volver a tener cobertura; y si todavía lo tenés, el traslado a ASSE es libre en cualquier momento y sin excepción (Decreto 344/020 art. 17, ratificado por el Decreto 114/023 art. 5). Hay tres modalidades: gratuita si los ingresos del hogar están dentro de los topes, por FONASA si tenés amparo, y cuota ASSE paga si superás los topes.',
    icon: 'mdi-hospital-building',
  },
  {
    title: 'Seguir en la misma mutualista como socio particular',
    detail:
      'Es una afiliación individual: sale del FONASA y pasa a ser un contrato tuyo con la institución. No consta norma que obligue a la mutualista a mantenerte en las mismas condiciones ni a no aplicarte carencias por seguir sin interrupción. Preguntá en tu institución ANTES de que se caiga el amparo, no después.',
    icon: 'mdi-account-cash-outline',
  },
  {
    title: 'Los menores siguen 12 meses más',
    detail:
      'La Ley 18.731 art. 30 mantiene el amparo del Seguro Nacional de Salud a los menores de 18 años y a los mayores de esa edad con discapacidad por doce meses continuos, contados desde el mes SIGUIENTE al del cese de la aportación, siempre que el período de aportación no haya sido menor a un año. BPS lo computa como 12 meses de aportes dentro de los 24 anteriores al cese de la actividad o al fin del subsidio. Ese amparo cesa antes si el beneficiario obtiene el mismo amparo por sí o a través de otro generante.',
    icon: 'mdi-account-child-outline',
  },
  {
    title: 'Sin cobertura vigente no hay cambio de prestador',
    detail:
      'La movilidad regulada exige cobertura activa al momento del cambio. Si quedaste sin amparo, el mes que te toca por tu dígito no te sirve de nada: primero hay que volver a tener cobertura.',
    icon: 'mdi-swap-horizontal-circle-outline',
  },
])

// ---------------------------------------------------------------------------
// Urgencia y emergencia en un prestador que no es el tuyo
// ---------------------------------------------------------------------------

export interface UrgencyRule {
  title: string
  detail: string
  icon: string
}

/**
 * La pregunta real es «¿me lo cobran?», y la respuesta está en una ley que casi nadie cita por
 * número porque vino dentro de una Rendición de Cuentas (Ley 19.535, arts. 145 a 148) y en su
 * decreto reglamentario, el 211/018.
 *
 * DOS DISTINCIONES QUE CASI TODAS LAS NOTAS PIERDEN, y que acá van separadas porque publicarlas
 * fundidas es mandar a alguien a una guardia ajena creyendo que le sale la tasa moderadora:
 *   1. La regla del «centro más próximo o accesible» es de la EMERGENCIA (art. 147 inc. 2). Para
 *      la URGENCIA, el derecho a ir a otro prestador se activa sólo si el tuyo no tiene sede en
 *      esa localidad ni te asegura cobertura por otra institución (art. 145 inc. 5).
 *   2. La tasa moderadora que fija el decreto es la de la URGENCIA (art. 19). Para la emergencia
 *      no hay disposición equivalente, así que publicamos la ausencia y no una analogía.
 *
 * No publicamos importes, pero la razón no es que cada institución fije el precio: el valor de la
 * Consulta Urgencia Centralizada lo autoriza el Poder Ejecutivo (Decreto 211/018 art. 19). No lo
 * ponemos porque se actualiza, no porque no exista.
 */
export const URGENCY_RULES: readonly UrgencyRule[] = Object.freeze([
  {
    title: 'Emergencia: el centro más próximo, sea de quien sea',
    detail:
      'La Ley 19.535 art. 145 reconoce a todos los habitantes residentes el derecho a la asistencia en urgencia y emergencia en todo el territorio nacional, y obliga a brindarla a todos los prestadores integrales, públicos o privados. Cuando el cuadro es una emergencia —deterioro agudo que pone en peligro inminente la vida o una función—, la asistencia se brinda en el centro asistencial más próximo o accesible al lugar donde te encuentres (art. 147 inc. 2 y Decreto 211/018 art. 4). Ahí no importa si el prestador es o no el tuyo.',
    icon: 'mdi-ambulance',
  },
  {
    title: 'Urgencia: primero los servicios de TU prestador',
    detail:
      'La urgencia no tiene la regla del centro más próximo, y confundirlas es el error caro. El derecho a atenderte en cualquier servicio de salud se activa sólo si tu prestador no cuenta con sede principal ni secundaria en esa localidad, o si no te asegura la cobertura a través de otra institución (art. 145 inc. 5). Tu prestador está obligado a informarte qué servicios de urgencia tiene en todo el país, justamente para que vayas a esos (Decreto 211/018 art. 11), y el decreto agrega que si en una localidad hay un servicio con atención de urgencia y otro sin ella, el usuario deberá concurrir al primero (art. 12). Si no sabés si hay servicio disponible, podés ir a la institución más próxima a que te informen (art. 13).',
    icon: 'mdi-hospital-marker',
  },
  {
    title: 'Si es urgencia o emergencia lo decide el médico que te recibe',
    detail:
      'No lo resuelve tu mutualista por teléfono ni vos: la valoración la hace el médico de la institución que recibe al usuario, empleando todos los medios pertinentes con los que esa institución cuenta (Ley 19.535 art. 145). Es la pieza que hace utilizable el resto: no tenés que autodiagnosticarte antes de salir.',
    icon: 'mdi-stethoscope',
  },
  {
    title: 'En la urgencia, la tasa moderadora la pagás en TU institución',
    detail:
      'Una vez que hacés efectivo el derecho a la atención de urgencia, abonás a tu institución asistencial de origen la tasa moderadora por Consulta Urgencia Centralizada, de acuerdo al valor oportunamente autorizado por el Poder Ejecutivo para esa prestación (Decreto 211/018 art. 19). El prestador que te asistió no te factura a vos. Para la EMERGENCIA la reglamentación no fija una tasa equivalente: la ley remite a «la tasa moderadora que corresponda según disponga la reglamentación» (art. 148 inc. 1) y el decreto sólo la establece para la urgencia, así que no te podemos prometer que se cobre igual.',
    icon: 'mdi-cash-check',
  },
  {
    title: 'El traslado lo paga tu prestador de origen',
    detail:
      'Los traslados que resulten del proceso asistencial de urgencia o emergencia, determinados por la institución que te está asistiendo y previa comunicación a la dirección técnica de la tuya, son de cargo de esta última (Ley 19.535 art. 147 inc. 1).',
    icon: 'mdi-car-emergency',
  },
  {
    title: 'Entre prestadores PUEDEN saldarlo por el FONASA',
    detail:
      'Es una facultad, no un automatismo: las instituciones incorporadas al Seguro Nacional de Salud PODRÁN saldar esa facturación a través de la JUNASA mediante compensaciones del Fondo Nacional de Salud (Ley 19.535 art. 148 inc. 2), y la condición necesaria para ejercer esa opción es usar el sistema informático que provee la JUNASA (Decreto 211/018 art. 21). La institución de origen puede objetar la factura, y entonces se resuelve entre las partes (art. 22). Si el prestador involucrado no está incorporado al Seguro Nacional de Salud, el mecanismo de pago es el de las normas generales (art. 148 inc. 3 y Decreto 211/018 art. 25). En ninguno de esos caminos la cuenta te llega a vos.',
    icon: 'mdi-bank-transfer',
  },
])

// ---------------------------------------------------------------------------
// ¿Es obligatorio el FONASA?
// ---------------------------------------------------------------------------

/**
 * La confusión de fondo es entre APORTAR y ELEGIR. Para el dependiente lo primero es obligatorio
 * y lo segundo es libre; el sitio ya modela en `companyTypes.ts` que para el monotributista el
 * aporte al SNS es una opción, y esa asimetría es justamente lo que hace que la pregunta exista.
 */
export const FONASA_MANDATORY_RULE =
  'Para el trabajador dependiente el aporte al FONASA no es opcional: la Ley 18.211 art. 61 lo fija como un porcentaje de las retribuciones y se retiene del sueldo. Lo que elegís es el prestador, no si aportás.'

/** El porcentaje no se mueve según a quién elijas. Es la corrección más pedida. */
export const FONASA_RATE_RULE =
  'La tasa de aporte personal varía según el monto imponible (menor o mayor a 2,5 BPC) y la familia a cargo. No depende del prestador que elijas: elegir un seguro privado en vez de una mutualista no te cambia el descuento.'

export interface ProviderKind {
  label: string
  detail: string
  icon: string
}

/**
 * Entre qué se puede elegir con el FONASA. Ley 18.211 art. 11, que remite a Ley 17.930 art. 265.
 * El art. 11 dice «PODRÁN integrar», y su literal A) incluye personas jurídicas públicas
 * «estatales y no estatales»: es una habilitación, no una enumeración cerrada del padrón.
 */
export const SNIS_PROVIDER_KINDS: readonly ProviderKind[] = Object.freeze([
  {
    label: 'ASSE',
    detail:
      'El prestador público. Integra el SNIS como servicio de salud a cargo de una persona jurídica pública y se elige con FONASA como cualquier otro, pero en la regla de movilidad no está en igualdad de condiciones: es el único al que te podés trasladar en cualquier momento, sin esperar el mes de tu dígito (Decreto 344/020 art. 17 y Decreto 114/023 art. 5).',
    icon: 'mdi-hospital-building',
  },
  {
    label: 'IAMC (las mutualistas)',
    detail:
      'Las instituciones de asistencia médica colectiva del Decreto-Ley 15.181. Son la opción de la enorme mayoría de los afiliados.',
    icon: 'mdi-medical-bag',
  },
  {
    label: 'Seguros integrales privados',
    detail:
      'Los seguros integrales autorizados por el Ministerio de Salud Pública que ya funcionaban regularmente cuando se dictó la norma. Están dentro del padrón del SNIS: elegir uno no te saca del FONASA.',
    icon: 'mdi-shield-plus-outline',
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
    short:
      'Hacia una mutualista, en el mes de tu dígito. Hacia ASSE o un seguro integral, cuando quieras.',
    answer:
      'La movilidad regulada asigna un mes a cada dígito: marzo para el 3, abril para el 4, y así hasta diciembre para el 2; al 0 le toca octubre y al 1 noviembre. En enero y febrero no hay movilidad. Además tenés que llevar al menos 23 meses en tu prestador actual al último día del mes anterior al tuyo. Pero ese calendario gobierna el cambio hacia una mutualista: el cambio hacia ASSE o hacia un seguro integral puede realizarse en cualquier momento, así lo publica BPS entre las condiciones del cambio y así lo establecen el Decreto 344/020 art. 17 y el Decreto 114/023 art. 5 para el traslado a ASSE. Antes de esperar once meses, fijate hacia dónde vas.',
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
      'Sí. Hacia ASSE o un seguro integral, siempre; hacia un privado, sólo por causal tasada.',
    answer:
      'Sí, y la salida más ancha es la que menos se publica: el cambio hacia ASSE o hacia un seguro integral se puede tramitar en cualquier momento, sin esperar el mes de tu dígito. Lo dice BPS entre las condiciones del cambio, y para ASSE lo dicen dos decretos vigentes: el 344/020 art. 17 («todos los usuarios del Seguro Nacional de Salud, sin excepción, podrán en cualquier momento cambiar de prestador integral de salud a la Administración de los Servicios de Salud del Estado») y el 114/023 art. 5, que lo ratifica. Si a donde te querés pasar es un prestador privado, ahí sí manda el calendario, con estas salidas: si te afiliaron de oficio tenés 180 días para elegir otro prestador; si trasladaste tu domicilio de un departamento a otro o se te generaron dificultades de acceso geográfico, podés pedirlo dentro de los 12 meses; si hay problemas asistenciales que rompen la confianza, o si no te cumplen los tiempos de espera del Decreto 359/007, se puede pedir en cualquier momento. Esas tres últimas quedan sujetas a resolución de la Junta Nacional de Salud, no son automáticas. Y en todos los casos, una vez que te cambiaste el Decreto 344/020 art. 13 te pide dos años calendario de permanencia en el prestador nuevo: entrar a ASSE es libre, volver a una mutualista vuelve a estar atado al calendario.',
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
  {
    question: '¿Qué pasa con mi mutualista si renuncio, me despiden o se me termina el paro?',
    short: 'Mientras cobrás el paro seguís cubierto. Cuando eso se corta, el amparo se cae.',
    answer:
      'Durante el subsidio por desempleo mantenés la cobertura del Sistema Nacional Integrado de Salud y los aportes al FONASA salen del propio subsidio. El problema empieza después. BPS lo dice con todas las letras: se pierde el amparo al Seguro Nacional de Salud por no tener actividad, por haber finalizado el subsidio de desempleo, por fallecimiento u otro motivo. Para vos no hay un período de continuidad publicado: la cobertura se corta y quedás por tu cuenta. Lo único que sigue es el amparo de los menores de 18 años y de los mayores de esa edad con discapacidad: la Ley 18.731 art. 30 se los mantiene por doce meses continuos contados desde el mes SIGUIENTE al del cese de la aportación, siempre que el período de aportación no haya sido menor a un año, y ese amparo cesa antes si el beneficiario obtiene el mismo amparo por sí o a través de otro generante. BPS lo computa como 12 meses de aportes dentro de los 24 anteriores al cese o al fin del subsidio. Sin amparo tampoco podés usar la movilidad regulada: el cambio de prestador exige cobertura vigente. Las salidas son ASSE, que es un trámite presencial y no algo automático, o seguir en tu institución como socio particular, que ya es un contrato privado y no un derecho del Seguro. Y cuidado con la extensión de tres meses para despedidos que aparece primero en Google: esa página de BPS es de agosto de 2020, alcanzaba sólo a quienes perdieran la cobertura entre el 1° de agosto y el 31 de octubre de ese año y la financió el Fondo Coronavirus. No es un derecho vigente.',
  },
  {
    question: '¿Me pueden cobrar una urgencia o una emergencia en un prestador que no es el mío?',
    short:
      'En la emergencia vas al centro más próximo. En la urgencia, a otro prestador sólo si el tuyo no llega a esa localidad.',
    answer:
      'Urgencia y emergencia no tienen la misma regla, y mezclarlas es lo que hace que alguien vaya a una guardia ajena creyendo que le sale la tasa moderadora. La Ley 19.535 art. 145 reconoce a todos los habitantes residentes el derecho a la asistencia en urgencia y emergencia en todo el territorio nacional, y obliga a brindarla a todos los prestadores integrales, públicos o privados. Pero la regla del centro más próximo es sólo de la EMERGENCIA: cuando se requiere atención de emergencia, la misma será brindada en el centro asistencial más próximo o accesible del lugar donde se encuentre el paciente (art. 147 inc. 2, y Decreto 211/018 art. 4). En la URGENCIA es distinto: el derecho a atenderte en cualquier servicio de salud se activa sólo si tu prestador no cuenta con sede principal ni secundaria en esa localidad, o no te asegura la cobertura a través de otra institución (art. 145 inc. 5). Si tu prestador sí tiene servicio de urgencia ahí, tenés que ir a ese: el Decreto 211/018 obliga a las instituciones a informar los servicios de urgencia que tienen en todo el país para que los usuarios se dirijan a ellos (art. 11), y establece que si en una localidad hay un servicio con atención de urgencia y otro sin ella, el usuario deberá concurrir al primero (art. 12). Si el cuadro es urgencia o emergencia no lo definís vos ni tu mutualista por teléfono: lo valora el médico de la institución que te recibe. Sobre la plata: una vez que hacés efectivo el derecho a la atención de urgencia, abonás a tu institución de origen la tasa moderadora por Consulta Urgencia Centralizada (Decreto 211/018 art. 19). Para la emergencia la reglamentación no fija una tasa equivalente —la ley remite a la que disponga la reglamentación (art. 148 inc. 1) y el decreto sólo la regula para la urgencia—, así que no te podemos afirmar que se cobre igual. Los traslados que resulten de ese proceso asistencial son de cargo de tu prestador de origen. Y la factura entre instituciones no es tuya: las incorporadas al Seguro Nacional de Salud PODRÁN saldarla vía JUNASA con compensaciones del Fondo Nacional de Salud, que es una facultad condicionada a usar el sistema informático de la JUNASA (art. 148 inc. 2 y Decreto 211/018 art. 21); si el prestador involucrado no está incorporado al Seguro, rigen las normas generales. El valor de esa tasa moderadora no lo fija cada institución a su criterio: lo autoriza el Poder Ejecutivo y se actualiza, así que no lo publicamos acá — consultalo en tu institución.',
  },
  {
    question: '¿Es obligatorio el FONASA? ¿Puedo contratar un seguro privado en su lugar?',
    short:
      'Si sos dependiente, aportar es obligatorio. Elegir prestador es libre, y un seguro privado integral cuenta.',
    answer:
      'Hay que separar dos cosas que se confunden todo el tiempo: aportar y elegir. Para el trabajador dependiente el aporte no es opcional, la Ley 18.211 art. 61 lo fija como un porcentaje de las retribuciones y se retiene del sueldo. Lo optativo es el prestador: la elección es libre (art. 50). El art. 11 está redactado como habilitación y no como lista cerrada —dice que PODRÁN integrar el Sistema Nacional Integrado de Salud los servicios de salud a cargo de personas jurídicas públicas, estatales y no estatales, y las entidades del art. 265 de la Ley 17.930—, es decir ASSE, las mutualistas del Decreto-Ley 15.181 y los seguros integrales privados habilitados por el Ministerio de Salud Pública. O sea que sí podés estar en un seguro privado con tu FONASA, pero no podés cambiar el FONASA por un seguro privado. Dos precisiones: no se admite doble cobertura integral a cargo del Sistema, hay que optar por una; y el porcentaje que te descuentan no cambia según a quién elijas, depende del monto imponible (menor o mayor a 2,5 BPC) y de la familia a cargo. Los prestadores que integran el sistema no pueden rechazar a ningún usuario AMPARADO POR EL SEGURO NACIONAL DE SALUD ni limitarle las prestaciones de los programas integrales aprobados por el MSP (art. 58). Ojo con el alcance de esa protección: es del amparo del Seguro, no de un contrato particular, así que no cubre a quien se afilia por su cuenta como socio particular. Lo que quede fuera de esos programas se pacta en régimen de libre contratación (art. 47), y ahí es donde algunas instituciones cobran por encima. Cuánto, no lo publica ninguna tabla oficial comparable, así que no lo publicamos. Distinto es el monotributista: para él el aporte al Seguro Nacional de Salud es una opción, y por eso BPS publica el monotributo con y sin FONASA.',
  },
])
