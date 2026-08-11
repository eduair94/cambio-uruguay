// app/utils/afapRevocation.ts
// Datos de /desvincularme-de-la-afap-uruguay: qué se puede deshacer de verdad, para quién, y en
// qué plazos.
//
// POR QUÉ EXISTE: la pregunta aparece triple-confirmada en la auditoría de los subs uruguayos.
// El hilo testigo es «Como carajos me desvinculo de una AFAP?» (92 comentarios), y el cluster
// «jubilación y AFAP» junta 50 preguntas con 1.302 de engagement sólo en r/uruguay.
//
// LO QUE EL SITIO YA TENÍA: una sola entrada de FAQ (`personalFinanceFaq.ts`) que dice que «BPS
// publica trámites de revocación o desafiliación sólo para personas alcanzadas por sus
// condiciones» y manda a pedir asesoramiento. Es cierto y es un no-respuesta: no dice quiénes
// están alcanzados, ni los plazos, ni la diferencia entre las dos cosas.
//
// LA CONFUSIÓN QUE ESTA PÁGINA EXISTE PARA DESHACER: revocar el artículo 8 NO es desafiliarse de
// la AFAP. Son dos trámites distintos, con efectos distintos. La mayoría de la gente que dice
// «me quiero ir de la AFAP» está preguntando por el primero.
//
// LAS TRES PREGUNTAS QUE SE AGREGARON DESPUÉS (barrido de r/uruguay, r/monte_video y compañía):
//   1. ¿En qué está invertida la plata y por qué no se va afuera? La respuesta es normativa: el
//      artículo 123 de la Ley 16.713 es una LISTA CERRADA de categorías de activos, y la única
//      ventana al exterior que abre para invertir es renta fija de organismos internacionales de
//      crédito o de gobiernos extranjeros de muy alta calificación (literal D) más instrumentos de
//      cobertura (literal E). Los máximos por literal y subfondo NO los fija el regulador: están
//      en el artículo 123-BIS, agregado por el artículo 119 de la Ley 20.130. La AFAP no elige la
//      composición: la acota la ley.
//   2. ¿Sobre qué te cobran? Sobre el aporte que entra, no sobre el saldo (art. 103 num. 2). Y lo
//      que más te descuentan no es la comisión: es la prima del seguro colectivo de invalidez y
//      fallecimiento (art. 57), que va aparte y que casi nadie sabe que existe.
//   3. ¿Desde qué sueldo va plata a la AFAP? Depende del tope A y de si hiciste el artículo 8.
//
// OJO CON EL CORTE POR COHORTE: los topes A/B/C de los artículos 7 y 8 de la Ley 16.713 rigen sólo
// para quien ya estaba afiliado al BPS antes de la vigencia del Sistema Previsional Común. Quien
// tuvo su primer ingreso al mercado de trabajo desde el 1.º de diciembre de 2023 se rige por el
// artículo 22 de la Ley 20.130, con otros dos niveles. Es el error más repetido del tema.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-10:
//   - BPS, «Revocación art. 8 Ley 16.713 AFAP» (condiciones y efecto)
//     https://www.bps.gub.uy/12913/revocacion-art-8-ley-16713-afap.html
//   - BPS, «Asesoramiento revocación art. 8» (el plazo de 90 días corridos)
//     https://www.bps.gub.uy/12912/asesoramiento-revocacion-art-8-ley-16713-afap.html
//   - BPS, «¿Cómo se distribuyen mis aportes con y sin artículo 8?» (el reparto por tramos)
//     https://www.bps.gub.uy/22615/como-se-distribuyen-mis-aportes-con-y-sin-articulo-8.html
//   - BPS, «Valores actuales» (topes A/B/C y niveles del art. 22, agosto 2026)
//     https://www.bps.gub.uy/5478/
//   - Ley 16.713 art. 8 — la opción que se revoca
//     https://www.impo.com.uy/bases/leyes/16713-1995/8
//   - Ley 16.713 art. 123 — las seis categorías de activos, TEXTO VIGENTE (redacción dada por el
//     art. 118 de la Ley 20.130)
//     https://www.impo.com.uy/bases/leyes/16713-1995/123
//   - Ley 16.713 art. 123-BIS — LOS MÁXIMOS: cuadro por literal y subfondo, tope de moneda
//     extranjera, tope del literal D sobre todo el fondo y prohibición de índices en el Subfondo
//     de Retiro (agregado por el art. 119 de la Ley 20.130)
//     https://www.impo.com.uy/bases/leyes/16713-1995/123_BIS
//   - Ley 16.713 art. 123-TER — condiciones para adquirir los activos de los literales B) y D) y
//     régimen de fideicomisos y fondos (agregado por el art. 120 de la Ley 20.130)
//     https://www.impo.com.uy/bases/leyes/16713-1995/123_TER
//   - Ley 16.713 arts. 102 y 103 — comisiones y su base de cálculo
//     https://www.impo.com.uy/bases/leyes/16713-1995/102
//     https://www.impo.com.uy/bases/leyes/16713-1995/103
//   - Ley 16.713 art. 57 — seguro colectivo de invalidez y fallecimiento
//     https://www.impo.com.uy/bases/leyes/16713-1995/57
//   - Ley 20.130 art. 22 — reparto del Sistema Previsional Común y su inciso final de cohorte
//     https://www.impo.com.uy/bases/leyes/20130-2023/22
//   - BCU, Memoria Trimestral AFAP N.º 119, marzo 2026 (máximos legales por literal y subfondo,
//     composición del activo al 31/03/2026, comisiones y primas por AFAP)
//     https://www.bcu.gub.uy/Servicios-Financieros-SSF/AFAPMemoriaTrimestral/esen06d0326.pdf
//   - Presidencia, «Comienza a regir este martes 1.° el nuevo sistema previsional común»
//     https://www.gub.uy/presidencia/comunicacion/noticias/comienza-regir-martes-1-nuevo-sistema-previsional-comun
//   - Ley 20.130 — Sistema Previsional Común (el marco vigente)
//     https://www.impo.com.uy/bases/leyes/20130-2023
//
// TRAMPA QUE NOS COMIMOS Y DEJAMOS ANOTADA, CON SU CORRECCIÓN: impo.com.uy sirve dos versiones del
// artículo 123. El texto ORIGINAL (/bases/leyes-originales/16713-1995/123) trae porcentajes
// metidos dentro de cada literal —60%, 30%, 25%…— que hoy NO rigen. El texto VIGENTE del 123 no
// trae ninguno, y de ahí sacamos la conclusión equivocada de que el régimen ya no tiene
// porcentajes legales y que los máximos eran criterio del BCU.
//
// Es falso, y es una AUSENCIA FALSA de manual: los porcentajes no desaparecieron, se mudaron. La
// misma Ley 20.130 que le dio nueva redacción al 123 (art. 118) agregó el artículo 123-BIS
// (art. 119), y ahí está el cuadro completo por literal y subfondo, el tope de moneda extranjera,
// el tope del literal D sobre todo el Fondo de Ahorro Previsional y la prohibición de títulos
// representativos de índices financieros en el Subfondo de Retiro. TODOS los máximos que publica
// esta página son legales y salen del art. 123-BIS. El BCU no fija los máximos: publica el USO
// EFECTIVO de cada AFAP contra ellos.
//
// Lo que costó esa premisa: publicamos 15% como máximo del literal D en el Subfondo de Acumulación
// (es 25%, art. 123-BIS) y, encima de ese error, un aviso que le imputaba a las cuatro AFAP un
// incumplimiento del régimen de inversiones que nunca ocurrió. Regla que queda: antes de decir
// «la ley no lo dice», buscar el BIS y el TER.

/** Fecha en que cada condición y plazo se contrastó con BPS. */
export const AFAP_VERIFIED_AT = '2026-08-10'

export interface AfapSource {
  label: string
  url: string
}

export const AFAP_SOURCES: readonly AfapSource[] = Object.freeze([
  {
    label: 'BPS — Revocación art. 8 Ley 16.713 AFAP',
    url: 'https://www.bps.gub.uy/12913/revocacion-art-8-ley-16713-afap.html',
  },
  {
    label: 'BPS — Asesoramiento previo a la revocación',
    url: 'https://www.bps.gub.uy/12912/asesoramiento-revocacion-art-8-ley-16713-afap.html',
  },
  {
    label: 'Ley 16.713 art. 8 — la opción que se revoca',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/8',
  },
  {
    label: 'BPS — Cómo se distribuyen mis aportes con y sin artículo 8',
    url: 'https://www.bps.gub.uy/22615/como-se-distribuyen-mis-aportes-con-y-sin-articulo-8.html',
  },
  {
    label: 'BPS — Valores actuales (topes A, B y C; niveles del art. 22)',
    url: 'https://www.bps.gub.uy/5478/',
  },
  {
    label: 'Ley 16.713 art. 123 — las seis categorías de activos (texto vigente)',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/123',
  },
  {
    label: 'Ley 16.713 art. 123-BIS — los máximos por literal y subfondo (texto vigente)',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/123_BIS',
  },
  {
    label: 'Ley 16.713 art. 123-TER — condiciones para adquirir esos activos (texto vigente)',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/123_TER',
  },
  {
    label: 'Ley 16.713 art. 102 — las comisiones son el único ingreso de la AFAP',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/102',
  },
  {
    label: 'Ley 16.713 art. 103 — sobre qué se cobra la comisión',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/103',
  },
  {
    label: 'Ley 16.713 art. 57 — seguro colectivo de invalidez y fallecimiento',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/57',
  },
  {
    label: 'Ley 20.130 art. 22 — reparto del Sistema Previsional Común y a quién alcanza',
    url: 'https://www.impo.com.uy/bases/leyes/20130-2023/22',
  },
  {
    label: 'BCU — Memoria Trimestral AFAP N.º 119 (marzo 2026), PDF',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/AFAPMemoriaTrimestral/esen06d0326.pdf',
  },
  {
    label: 'Presidencia — el Sistema Previsional Común y sus dos etapas',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/comienza-regir-martes-1-nuevo-sistema-previsional-comun',
  },
  {
    label: 'Ley 20.130 — Sistema Previsional Común',
    url: 'https://www.impo.com.uy/bases/leyes/20130-2023',
  },
])

// ---------------------------------------------------------------------------
// Las dos cosas que no son la misma
// ---------------------------------------------------------------------------

export interface AfapPath {
  id: 'revocacion' | 'desafiliacion'
  label: string
  /** Qué es, en una línea. */
  what: string
  /** Qué cambia en concreto. */
  effect: string
  icon: string
}

export const AFAP_PATHS: readonly AfapPath[] = Object.freeze([
  {
    id: 'revocacion',
    label: 'Revocar la opción del artículo 8',
    what: 'Dejás sin efecto la opción que hiciste de repartir tus aportes entre el BPS y la AFAP.',
    effect:
      'No te vas de la AFAP: cambia cómo se distribuyen los aportes. Después de revocar, aportás a la AFAP sólo por la parte del sueldo que supera el tope A ($ 96.279 según el BPS en agosto de 2026).',
    icon: 'mdi-undo-variant',
  },
  {
    id: 'desafiliacion',
    label: 'Desafiliarte de la AFAP',
    what: 'Es un trámite distinto, con sus propias condiciones, que BPS lista aparte.',
    effect:
      'Salís del ahorro individual. No es lo mismo que revocar el artículo 8 y no se pide igual.',
    icon: 'mdi-exit-run',
  },
])

/** El malentendido más común, escrito para que se pueda citar tal cual. */
export const AFAP_NOT_THE_SAME =
  'Revocar la opción del artículo 8 NO es desafiliarse de la AFAP. Revocar cambia cómo se reparten tus aportes entre el BPS y la AFAP; desafiliarse es otro trámite, con otras condiciones. Casi todo el que dice «me quiero ir de la AFAP» está preguntando por lo primero.'

// ---------------------------------------------------------------------------
// Condiciones de la revocación
// ---------------------------------------------------------------------------

export const AFAP_AGE_MIN = 40
export const AFAP_AGE_MAX = 49

/** Hay que poder configurar causal jubilatoria antes de este año. */
export const AFAP_CAUSAL_BEFORE_YEAR = 2043

/** Días corridos para decidir, contados desde que descargás el asesoramiento. */
export const AFAP_DECISION_DAYS = 90

export interface AfapCondition {
  id: string
  label: string
  detail: string
}

export const AFAP_CONDITIONS: readonly AfapCondition[] = Object.freeze([
  {
    id: 'edad',
    label: `Tener entre ${AFAP_AGE_MIN} y ${AFAP_AGE_MAX} años`,
    detail: 'Fuera de esa franja el trámite no está disponible.',
  },
  {
    id: 'mixto',
    label: 'Estar incorporado al Régimen Mixto',
    detail: 'Es el régimen que combina el BPS con el ahorro individual en la AFAP.',
  },
  {
    id: 'voluntaria',
    label: 'Haber optado por el artículo 8 sin estar obligado',
    detail:
      'La revocación es para quien eligió esa distribución de aportes pudiendo no hacerlo. Si en tu caso era obligatoria, no hay nada que revocar.',
  },
  {
    id: 'sin-jubilacion',
    label: 'No haberte jubilado por el Régimen Mixto',
    detail: 'Una vez obtenida la jubilación, la puerta se cierra.',
  },
  {
    id: 'causal',
    label: `Poder configurar causal jubilatoria antes de ${AFAP_CAUSAL_BEFORE_YEAR}`,
    detail: 'Es la fecha que fija el régimen de transición.',
  },
  {
    id: 'asesoramientos',
    label: 'No haber agotado las dos instancias de asesoramiento',
    detail: 'El asesoramiento previo tiene un cupo y, si se acabó, el trámite no se habilita.',
  },
])

/**
 * Chequeo de las condiciones que se pueden evaluar con datos que la persona tiene a mano.
 * Las otras (haber optado voluntariamente, no haberse jubilado, cupo de asesoramientos) las
 * sabe BPS, no nosotros — y la página lo dice en vez de fingir un veredicto.
 */
export interface AfapEligibility {
  /** `false` sólo cuando algo medible lo descarta. */
  possible: boolean
  blockers: string[]
  /** Lo que hay que confirmar en BPS igual. */
  toConfirm: string[]
}

export function checkRevocation(input: { age: number; mixedRegime: boolean }): AfapEligibility {
  const blockers: string[] = []
  const age = Number(input.age)

  if (!Number.isFinite(age) || age < AFAP_AGE_MIN || age > AFAP_AGE_MAX) {
    blockers.push(
      `El trámite es para personas de ${AFAP_AGE_MIN} a ${AFAP_AGE_MAX} años${
        Number.isFinite(age) ? ` y tenés ${age}` : ''
      }.`
    )
  }
  if (!input.mixedRegime) {
    blockers.push('Hay que estar incorporado al Régimen Mixto.')
  }

  return {
    possible: blockers.length === 0,
    blockers,
    toConfirm: [
      'Que hayas optado por el artículo 8 sin estar obligado a hacerlo.',
      'Que no te hayas jubilado por el Régimen Mixto.',
      `Que puedas configurar causal jubilatoria antes de ${AFAP_CAUSAL_BEFORE_YEAR}.`,
      'Que te queden instancias de asesoramiento disponibles.',
    ],
  }
}

// ---------------------------------------------------------------------------
// El trámite
// ---------------------------------------------------------------------------

export interface AfapStep {
  n: number
  title: string
  detail: string
}

export const AFAP_STEPS: readonly AfapStep[] = Object.freeze([
  {
    n: 1,
    title: 'Pedí la reserva de derecho',
    detail:
      'Es el paso que te pone en la fila. Quienes la reservaron antes del 1° de diciembre de 2023 quedan habilitados directamente; el resto pasa por una verificación de condiciones.',
  },
  {
    n: 2,
    title: 'BPS verifica que cumplas',
    detail:
      'Chequea edad, régimen, si la opción fue voluntaria y si te queda cupo de asesoramiento.',
  },
  {
    n: 3,
    title: 'Recibís el asesoramiento, que es obligatorio',
    detail:
      'Es virtual, por la app BPS Personas o los servicios en línea, y necesitás usuario personal de BPS. Te estima la jubilación futura en los dos escenarios: revocando y sin revocar.',
  },
  {
    n: 4,
    title: `Tenés ${AFAP_DECISION_DAYS} días corridos para decidir`,
    detail:
      'El plazo corre desde que descargás el asesoramiento. Si se te pasa, perdés esa instancia.',
  },
])

/** La advertencia que va arriba de todo. */
export const AFAP_IRREVERSIBLE_WARNING =
  'Es una decisión sobre tu jubilación y no se toma con la cuenta de un tercero. El asesoramiento de BPS te muestra tu número en los dos escenarios: pedilo y decidí con eso, no con lo que te diga un vendedor ni un hilo de internet.'

// ---------------------------------------------------------------------------
// 1. ¿Desde qué sueldo va plata a la AFAP?
//
// Los topes salen del BPS («Valores actuales», consultado el 10 de agosto de 2026, columna de
// agosto). El BPS los publica con dos nombres distintos y NO son intercambiables: «Topes Art. 7º
// y 8º (Ley 16713)» y «Niveles Art. 22 (ley 20.130)». Cuál te toca depende de cuándo entraste al
// mercado de trabajo, no de cuánto ganás.
//
// NO CONFUNDIR con el «tope 3» de `payroll.ts`: ese es el mismo número que el tope C ($ 288.836) y
// es el techo por encima del cual el aporte deja de ser obligatorio. El tope que define si te
// entra plata a la AFAP es el A.
// ---------------------------------------------------------------------------

/** Mes al que corresponden los topes publicados por el BPS. */
export const AFAP_TOPES_AT = '2026-08'

/** Ley 16.713, arts. 7 y 8. Hasta acá el aporte va todo al BPS si no hiciste la opción. */
export const AFAP_TOPE_A = 96279
/** Ley 16.713, arts. 7 y 8. Con la opción del art. 8, desde acá va todo a la AFAP. */
export const AFAP_TOPE_B = 144418
/** Ley 16.713, arts. 7 y 8. Por encima de este tope el aporte es voluntario. */
export const AFAP_TOPE_C = 288836

/** Ley 20.130 art. 22, primer nivel (el BPS lo publica como «Niveles Art. 22 - A»). */
export const SPC_NIVEL_1 = 144418
/**
 * Ley 20.130 art. 22, segundo nivel (el BPS lo publica como «Niveles Art. 22 - B»).
 *
 * CUIDADO CON LA CITA: la frase «la aportación por la materia gravada que exceda la suma indicada
 * será voluntaria» está en el numeral 4 del art. 22, y ese numeral se abre acotado a «las personas
 * comprendidas en el Servicio de Retiros y Pensiones de las Fuerzas Armadas, la Dirección Nacional
 * de Asistencia y Seguridad Social Policial, la Caja de Jubilaciones y Pensiones Bancarias, la
 * Caja Notarial de Seguridad Social … y la Caja de Jubilaciones y Pensiones de Profesionales
 * Universitarios». El BPS NO está en esa enumeración (sí está en el numeral 1). Para el afiliado
 * al BPS lo que se puede afirmar es lo del numeral 2: el aporte al ahorro individual corre «hasta»
 * este nivel y de ahí para arriba el artículo ya no asigna aporte obligatorio. Cuál es el corte lo
 * publica el BPS.
 */
export const SPC_NIVEL_2 = 288836

/** Tasa del aporte jubilatorio personal, en puntos porcentuales. */
export const APORTE_JUBILATORIO_RATE = 15

/** Fecha desde la cual el primer ingreso al mercado de trabajo cae en el Sistema Previsional Común. */
export const SPC_VIGENCIA = '2023-12-01'

/** Quién se rige por qué juego de cortes. */
export type AfapCohort = 'ley16713' | 'spc'

export const AFAP_COHORTS: readonly { id: AfapCohort; label: string; who: string }[] =
  Object.freeze([
    {
      id: 'ley16713',
      label: 'Ya estabas afiliado al BPS antes del 1.º de diciembre de 2023',
      who: 'Te rigen los artículos 7 y 8 de la Ley 16.713 y los topes A, B y C. Es el caso de casi todo el que puede revocar, porque el trámite es para gente de 40 a 49 años. Ojo: el corte no es de por vida. El numeral 6 del artículo 22 de la Ley 20.130 dice que si después de esa fecha empezás una actividad amparada por otra caja —Fuerzas Armadas, Policial, Bancaria, Notarial o Profesionales Universitarios— en esa actividad nueva te rige el artículo 22, no los topes A, B y C.',
    },
    {
      id: 'spc',
      label: 'Tu primer ingreso al mercado de trabajo fue desde el 1.º de diciembre de 2023',
      who: 'Te rige el artículo 22 de la Ley 20.130: van 10 puntos a solidaridad intergeneracional y 5 a tu cuenta individual desde el primer peso. Acá no hay artículo 8 que revocar.',
    },
  ])

/**
 * El inciso que zanja la discusión, citado textual porque es el que más se ignora.
 * Ley 20.130, art. 22, inciso final.
 */
export const AFAP_COHORT_RULE =
  'Las disposiciones de los artículos 7º y 8º de la Ley N° 16.713, de 3 de setiembre de 1995, serán aplicables exclusivamente a los afiliados al Banco de Previsión Social que, antes de la fecha indicada en el numeral 4) del artículo 6° de la presente ley, estuvieren comprendidos en los Títulos I a IV de la misma.'

export interface AporteSplit {
  cohort: AfapCohort
  /** Materia gravada que efectivamente se considera (topeada en el último nivel). */
  base: number
  /** Lo que queda por encima del último nivel: aportarlo es voluntario. */
  excedente: number
  /** Aporte jubilatorio personal del mes (15% de la base). */
  aporte: number
  aBps: number
  aAfap: number
  /** Nominal a partir del cual entra el primer peso a la AFAP en este escenario. */
  desde: number
}

function tramo(nominal: number, from: number, to: number): number {
  return Math.max(0, Math.min(nominal, to) - from)
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Cómo se parte tu aporte jubilatorio entre el BPS y la AFAP.
 *
 * Reglas, tal como las publica el BPS en «¿Cómo se distribuyen mis aportes con y sin artículo 8?»:
 *   - sin artículo 8: todo al BPS hasta el tope A y el resto todo a la AFAP;
 *   - con artículo 8: 50% y 50% hasta el tope A, todo al BPS entre el tope A y el tope B, y todo a
 *     la AFAP a partir del tope B;
 *   - en los dos casos, lo que excede el tope C es voluntario.
 * Y para la cohorte del Sistema Previsional Común, el artículo 22 de la Ley 20.130, numerales 1 y
 * 2: 10 puntos a solidaridad intergeneracional y 5 al ahorro individual hasta el primer nivel, y
 * 15 puntos al ahorro individual entre el primer y el segundo nivel. Los dos numerales dicen
 * «hasta» esas sumas: por encima del segundo nivel el artículo ya no asigna aporte obligatorio
 * para el afiliado al BPS. No lo colgamos del numeral 4, que dice «será voluntaria» pero se abre
 * acotado a las otras cajas y no nombra al BPS (ver SPC_NIVEL_2).
 */
export function splitAporte(input: {
  nominal: number
  art8?: boolean
  cohort?: AfapCohort
}): AporteSplit {
  const cohort: AfapCohort = input.cohort ?? 'ley16713'
  const n = Number.isFinite(input.nominal) && input.nominal > 0 ? input.nominal : 0
  const r = APORTE_JUBILATORIO_RATE / 100

  if (cohort === 'spc') {
    const t1 = tramo(n, 0, SPC_NIVEL_1)
    const t2 = tramo(n, SPC_NIVEL_1, SPC_NIVEL_2)
    // Redondeamos las partes primero para que el total sea siempre la suma de lo que se muestra.
    const aBps = round2(0.1 * t1)
    const aAfap = round2(0.05 * t1 + r * t2)
    return {
      cohort,
      base: round2(t1 + t2),
      excedente: round2(Math.max(0, n - SPC_NIVEL_2)),
      aporte: round2(aBps + aAfap),
      aBps,
      aAfap,
      desde: 0,
    }
  }

  const art8 = Boolean(input.art8)
  let aBps: number
  let aAfap: number
  if (art8) {
    const t1 = tramo(n, 0, AFAP_TOPE_A)
    const t2 = tramo(n, AFAP_TOPE_A, AFAP_TOPE_B)
    const t3 = tramo(n, AFAP_TOPE_B, AFAP_TOPE_C)
    aBps = round2(r * (t1 / 2 + t2))
    aAfap = round2(r * (t1 / 2 + t3))
  } else {
    const t1 = tramo(n, 0, AFAP_TOPE_A)
    const t2 = tramo(n, AFAP_TOPE_A, AFAP_TOPE_C)
    aBps = round2(r * t1)
    aAfap = round2(r * t2)
  }

  return {
    cohort,
    base: round2(Math.min(n, AFAP_TOPE_C)),
    excedente: round2(Math.max(0, n - AFAP_TOPE_C)),
    aporte: round2(aBps + aAfap),
    aBps,
    aAfap,
    desde: art8 ? 0 : AFAP_TOPE_A,
  }
}

/** La frase que la página venía dejando sin terminar. */
export const AFAP_TOPE_ANSWER = `Si ya estabas afiliado al BPS antes del 1.º de diciembre de 2023 y no hiciste la opción del artículo 8, el aporte va entero al BPS hasta el tope A y sólo lo que supera ese tope entra a tu AFAP. El tope A es $ 96.279 (BPS, valores de agosto de 2026). Dicho crudo: por debajo de ese sueldo, hoy no te está entrando nada a la cuenta individual. Con la opción del artículo 8 hecha, en cambio, te entra desde el primer peso, mitad y mitad hasta el tope A.`

// ---------------------------------------------------------------------------
// 2. ¿En qué está invertida la plata y por qué no se va afuera?
//
// La pregunta tiene respuesta normativa, no ideológica. El artículo 123 de la Ley 16.713 (texto
// vigente) es una lista cerrada de seis categorías. La AFAP no elige qué clase de activo comprar:
// elige DENTRO de esa lista y con un máximo por literal y por subfondo.
//
// LOS MÁXIMOS SON LEGALES Y SALEN DEL ART. 123-BIS, no del regulador. El BCU no los fija: publica
// el uso efectivo de cada AFAP contra ellos, en el cuadro «Inversiones según literales art. 123 -
// Ley 16.713» de cada Memoria Trimestral. Los valores de uso son el rango entre las cuatro AFAP al
// 31 de marzo de 2026, en esa fuente.
//
// Si alguna vez un cuadro del BCU y el art. 123-BIS discrepan en un casillero, manda la ley. Ya
// nos pasó: la columna «MÁXIMO LEGAL» del cuadro del BCU trae 15% para el literal D en el Subfondo
// de Acumulación y el art. 123-BIS dice 25%.
// ---------------------------------------------------------------------------

export type AfapSubfondo = 'crecimiento' | 'acumulacion' | 'retiro'

export const AFAP_SUBFONDOS: readonly { id: AfapSubfondo; label: string }[] = Object.freeze([
  { id: 'crecimiento', label: 'Crecimiento' },
  { id: 'acumulacion', label: 'Acumulación' },
  { id: 'retiro', label: 'Retiro' },
])

/** Fecha de los datos del BCU (Memoria Trimestral N.º 119). */
export const AFAP_PORTFOLIO_AT = '2026-03-31'

export interface AfapAssetClass {
  literal: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  label: string
  detail: string
  /** `true` si la categoría admite emisores del exterior. */
  exterior: boolean
  /** Máximo legal del cuadro del art. 123-BIS, en % sobre los activos de cada subfondo. */
  max: Record<AfapSubfondo, number>
  /** Uso efectivo al 31/03/2026: [mínimo, máximo] entre las cuatro AFAP. */
  used: Record<AfapSubfondo, readonly [number, number]>
}

/**
 * Las seis categorías del art. 123 con los máximos del cuadro del art. 123-BIS (texto vigente,
 * agregado por el art. 119 de la Ley 20.130), verificados uno por uno contra el articulado.
 */
export const AFAP_ASSET_CLASSES: readonly AfapAssetClass[] = Object.freeze([
  {
    literal: 'A',
    label: 'Valores emitidos por el Estado uruguayo y por el BCU',
    detail:
      'Bonos globales, notas del Tesoro, notas de Tesorería y letras de regulación monetaria. Es la categoría con el techo más alto y la más usada.',
    exterior: false,
    max: { crecimiento: 75, acumulacion: 75, retiro: 90 },
    used: { crecimiento: [58, 62], acumulacion: [50, 55], retiro: [66, 72] },
  },
  {
    literal: 'B',
    label: 'Valores de empresas uruguayas y fideicomisos financieros uruguayos',
    detail:
      'Obligaciones negociables, acciones, certificados de participación y títulos de deuda de fideicomisos uruguayos, cuotapartes de fondos de inversión uruguayos.',
    exterior: false,
    max: { crecimiento: 50, acumulacion: 50, retiro: 15 },
    used: { crecimiento: [15, 21], acumulacion: [21, 30], retiro: [0, 3] },
  },
  {
    literal: 'C',
    label: 'Depósitos a plazo en instituciones financieras instaladas en el país',
    detail:
      'En moneda nacional o extranjera, pero en bancos instalados acá. Un depósito en un banco del exterior no entra en ninguna categoría.',
    exterior: false,
    max: { crecimiento: 30, acumulacion: 30, retiro: 30 },
    used: { crecimiento: [5, 8], acumulacion: [5, 7], retiro: [13, 19] },
  },
  {
    literal: 'D',
    label: 'Renta fija de organismos internacionales de crédito o de gobiernos extranjeros',
    detail:
      'Y sólo «de muy alta calificación crediticia». Es la única puerta al exterior que abre la ley para invertir de verdad, y es renta fija: soberana o multilateral. Además de estos máximos por subfondo, el literal D tiene un tope propio sobre el fondo entero.',
    exterior: true,
    max: { crecimiento: 30, acumulacion: 25, retiro: 20 },
    used: { crecimiento: [12, 15], acumulacion: [15, 18], retiro: [8, 13] },
  },
  {
    literal: 'E',
    label: 'Instrumentos de cobertura de riesgos financieros',
    detail:
      'Emitidos por instituciones uruguayas o extranjeras de muy alta calificación internacional. Son coberturas, no inversión: al 31 de marzo de 2026 las cuatro AFAP los tenían en 0%.',
    exterior: true,
    max: { crecimiento: 10, acumulacion: 10, retiro: 10 },
    used: { crecimiento: [0, 0], acumulacion: [0, 0], retiro: [0, 0] },
  },
  {
    literal: 'F',
    label: 'Préstamos personales a afiliados y beneficiarios',
    detail:
      'Hasta 2 años de plazo, tasa no inferior al Índice Medio de Salarios de los últimos 12 meses más 5 puntos, y como máximo 6 salarios de actividad o pasividad.',
    exterior: false,
    max: { crecimiento: 20, acumulacion: 15, retiro: 5 },
    used: { crecimiento: [2, 2], acumulacion: [0, 0], retiro: [4, 5] },
  },
])

/** Tope a la suma de los literales A) a F) colocada en moneda extranjera, por subfondo. */
export const AFAP_ME_MAX: Readonly<Record<AfapSubfondo, number>> = Object.freeze({
  crecimiento: 45,
  acumulacion: 40,
  retiro: 15,
})

/** Uso efectivo de ese tope al 31/03/2026: [mínimo, máximo] entre las cuatro AFAP. */
export const AFAP_ME_USED: Readonly<Record<AfapSubfondo, readonly [number, number]>> =
  Object.freeze({
    crecimiento: [14, 18],
    acumulacion: [18, 23],
    retiro: [9, 11],
  })

/**
 * La respuesta a «¿por qué no invierten afuera?», que es una respuesta legal.
 *
 * Ojo con el tono: la versión anterior decía «no existe una categoría que habilite acciones,
 * fondos ni ETF del exterior», y eso el articulado no lo sostiene tan liso. El art. 123-BIS
 * prohíbe los títulos representativos de índices financieros SÓLO en el Subfondo de Retiro (si
 * fueran imposibles en toda categoría, una prohibición acotada a un subfondo no tendría objeto) y
 * el art. 123-TER nombra fondos «uruguayos o del exterior» para prohibir los que tengan por objeto
 * inversiones vedadas por el art. 124. Lo que sí se puede afirmar con la norma en la mano es lo
 * que dice esta constante: la lista afirmativa no abre ninguna puerta a renta variable del
 * exterior, y la única ventana de inversión directa afuera es renta fija.
 */
export const AFAP_WHY_NOT_ABROAD =
  'Porque la ley no lo permite más allá de un límite chico y para un tipo muy acotado de activo. El artículo 123 de la Ley 16.713 no dice «invertí bien»: enumera seis categorías y nada fuera de esa lista se puede comprar. La única ventana al exterior para invertir es el literal D, renta fija de organismos internacionales de crédito o de gobiernos extranjeros de muy alta calificación crediticia, con un máximo de 30% en el Subfondo de Crecimiento, 25% en el de Acumulación y 20% en el de Retiro (artículo 123-BIS), y encima de eso un techo de 15% sobre el fondo entero. Las acciones y los fondos que la lista sí habilita son los del literal B, y ese literal pide emisores uruguayos. Que tu plata esté mayormente en papel uruguayo no es una decisión de tu AFAP: es el diseño de la ley.'

/**
 * El segundo techo del literal D, que es el que de verdad ata la exposición al exterior: además
 * del máximo por subfondo, el art. 123-BIS le pone un tope sobre el fondo CONSOLIDADO.
 *
 * Acá hubo un error nuestro que vale la pena dejar anotado. Con el máximo mal tomado (15% en vez
 * de 25% en el Subfondo de Acumulación) el uso real de las AFAP parecía pasarse del tope, y
 * llegamos a publicar un aviso sobre una «anomalía sin explicación». No había anomalía: había un
 * número mal copiado. El aviso le imputaba a las cuatro AFAP un incumplimiento del régimen de
 * inversiones que no ocurrió. Está borrado.
 */
export const AFAP_D_FUND_CAP = 15

/** Ley 16.713 art. 123-BIS, textual: el tope del literal D sobre todo el fondo. */
export const AFAP_D_FUND_CAP_RULE =
  'Las inversiones realizadas en la categoría D) no podrán superar el 15% (quince por ciento) de los activos del Fondo de Ahorro Previsional.'

/** Ley 16.713 art. 123-BIS, textual: la única prohibición nominada del régimen de inversiones. */
export const AFAP_INDEX_BAN_RULE =
  'No se admitirán inversiones en títulos representativos de índices financieros en el Subfondo de Retiro.'

export interface AfapPortfolioLine {
  label: string
  moneda: 'pesos' | 'reajustable' | 'extranjera'
  /** % sobre el total de activos del Fondo de Ahorro Previsional consolidado. */
  pct: number
}

/**
 * Composición consolidada del Fondo de Ahorro Previsional al 31/03/2026, cuadro 10.1.1 de la
 * Memoria Trimestral N.º 119 del BCU. Es la última memoria publicada: la del segundo trimestre de
 * 2026 todavía no está en línea.
 *
 * Omitimos la línea de forwards, que el BCU publica en +0,73% y −0,73% y se cancela sola.
 */
export const AFAP_PORTFOLIO: readonly AfapPortfolioLine[] = Object.freeze([
  { label: 'Bonos globales (UI)', moneda: 'reajustable', pct: 25.91 },
  { label: 'Notas del Tesoro (UI y UP)', moneda: 'reajustable', pct: 9.76 },
  { label: 'Notas multilaterales', moneda: 'extranjera', pct: 9.05 },
  { label: 'Fideicomisos financieros (UI y UP)', moneda: 'reajustable', pct: 8.33 },
  { label: 'Fideicomisos financieros', moneda: 'extranjera', pct: 7.78 },
  { label: 'Bonos globales', moneda: 'pesos', pct: 7.73 },
  { label: 'Certificados de depósito (UI)', moneda: 'reajustable', pct: 7.0 },
  { label: 'Notas de Tesorería', moneda: 'pesos', pct: 6.58 },
  { label: 'Letras de regulación monetaria', moneda: 'pesos', pct: 5.69 },
  { label: 'Notas multilaterales', moneda: 'reajustable', pct: 4.99 },
  { label: 'Obligaciones negociables reajustables', moneda: 'reajustable', pct: 2.4 },
  { label: 'Préstamos a afiliados', moneda: 'pesos', pct: 1.35 },
  { label: 'Bonos globales', moneda: 'extranjera', pct: 0.94 },
  { label: 'Notas de crédito hipotecarias', moneda: 'reajustable', pct: 0.63 },
  { label: 'Depósitos bancarios a plazo', moneda: 'pesos', pct: 0.54 },
  { label: 'Bonos de gobierno extranjero', moneda: 'extranjera', pct: 0.36 },
  { label: 'Certificados de depósito a plazo', moneda: 'extranjera', pct: 0.25 },
  { label: 'Fideicomisos financieros', moneda: 'pesos', pct: 0.2 },
  { label: 'Acciones', moneda: 'pesos', pct: 0.12 },
  { label: 'Obligaciones negociables', moneda: 'extranjera', pct: 0.05 },
])

/** Totales que el BCU publica como tales en el mismo cuadro, al 31/03/2026. */
export const AFAP_PORTFOLIO_TOTALS = Object.freeze({
  monedaNacional: 81.94,
  monedaExtranjera: 17.7,
  disponibilidades: 0.37,
  /** Total de activos del fondo, en miles de pesos. */
  totalMilesDePesos: 1088587191,
})

/**
 * Las líneas del cuadro consolidado que caen en el literal D: emisores del exterior de renta fija,
 * o sea organismos internacionales de crédito («notas multilaterales», en las dos monedas en que
 * el BCU las publica) y gobiernos extranjeros.
 */
export const AFAP_D_PORTFOLIO_LABELS: readonly string[] = Object.freeze([
  'Notas multilaterales',
  'Bonos de gobierno extranjero',
])

/**
 * Uso del literal D sobre el fondo consolidado al 31/03/2026. Es una SUMA NUESTRA de líneas del
 * cuadro 10.1.1 del BCU, no un total que el BCU publique como tal: lo decimos porque la diferencia
 * importa para leer el número.
 */
export const AFAP_D_FUND_USED =
  Math.round(
    AFAP_PORTFOLIO.filter(l => AFAP_D_PORTFOLIO_LABELS.includes(l.label)).reduce(
      (acc, l) => acc + l.pct * 100,
      0
    )
  ) / 100

/** El dato que reemplaza al aviso equivocado: el tope real del exterior y cuánto se usaba. */
export const AFAP_D_FUND_NOTE = `El literal D tiene un segundo techo, y es el que de verdad ata la exposición al exterior: además del máximo por subfondo, el artículo 123-BIS manda que «las inversiones realizadas en la categoría D) no podrán superar el ${AFAP_D_FUND_CAP}% de los activos del Fondo de Ahorro Previsional». Al 31 de marzo de 2026 el fondo estaba en ${AFAP_D_FUND_USED.toLocaleString('es-UY', { minimumFractionDigits: 2 })}%: casi pegado al techo. Esa suma la hacemos nosotros con las líneas del cuadro consolidado del BCU (notas multilaterales en moneda extranjera y en reajustables, más bonos de gobierno extranjero); el BCU no publica ese total junto. Dicho de otro modo: la razón por la que no hay más plata afuera no es que las AFAP no quieran, es que ya casi no les queda margen legal.`

// ---------------------------------------------------------------------------
// 3. ¿Sobre qué te cobra la AFAP?
//
// Sobre el aporte que entra, no sobre el saldo acumulado. Lo dice el artículo 103 de la Ley 16.713
// y lo confirma el BCU en las notas de sus cuadros de comisiones.
//
// Y hay un segundo descuento que casi nadie sabe que existe: la PRIMA DEL SEGURO COLECTIVO de
// invalidez y fallecimiento. En LAS CUATRO AFAP la prima es más cara que la comisión —no en tres:
// se puede chequear fila por fila en AFAP_FEES y lo asegura el test.
// ---------------------------------------------------------------------------

/** Ley 16.713 art. 103 num. 1, textual. */
export const AFAP_FEE_BASE_RULE =
  'Solo podrá estar sujeta al cobro de comisiones la acreditación de los aportes obligatorios.'

/** Ley 16.713 art. 103 num. 2, textual. */
export const AFAP_FEE_BASE_RULE_2 =
  'La comisión por acreditación de los aportes obligatorios solo podrá establecerse como un porcentaje del aporte que le dio origen.'

/** El malentendido que este bloque existe para deshacer. */
export const AFAP_FEE_MYTH =
  'No te cobran un porcentaje de lo que tenés acumulado: te cobran un porcentaje del aporte de cada mes, cuando entra. Por eso el número asusta —entre 12,3% y 17,2% del aporte, según la AFAP, en marzo de 2026— y por eso al mismo tiempo es sólo entre 1,8% y 2,6% del sueldo sobre el que aportás. Y más de la mitad de ese descuento no es la comisión de la AFAP: es la prima del seguro colectivo de invalidez y fallecimiento, que va aparte y no se la queda la AFAP.'

/** Mes al que corresponden los valores publicados por el BCU (memoria N.º 119, mes de cargo). */
export const AFAP_FEES_AT = '2026-03'

export interface AfapFee {
  afap: string
  /** % sobre el ingreso de aportación. */
  comisionSobreIngreso: number
  primaSobreIngreso: number
  totalSobreIngreso: number
  /** % sobre el aporte efectivo (el aporte es el 15% del ingreso de aportación). */
  comisionSobreAporte: number
  primaSobreAporte: number
  totalSobreAporte: number
}

/**
 * Comisión de administración y prima del seguro por AFAP, marzo de 2026, por mes de cargo.
 * Cuadros 7.2.1 y 7.2.3 de la memoria del BCU. Los mismos valores rigen en los tres subfondos.
 *
 * La comisión fija por fondo aparece con un guion para las cuatro AFAP en enero, febrero y marzo
 * de 2026: hoy nadie cobra un cargo fijo sobre el saldo en el régimen general.
 */
export const AFAP_FEES: readonly AfapFee[] = Object.freeze([
  {
    afap: 'República AFAP',
    comisionSobreIngreso: 0.6,
    primaSobreIngreso: 1.24,
    totalSobreIngreso: 1.84,
    comisionSobreAporte: 4.0,
    primaSobreAporte: 8.267,
    totalSobreAporte: 12.267,
  },
  {
    afap: 'AFAP Itaú',
    comisionSobreIngreso: 0.864,
    primaSobreIngreso: 1.47,
    totalSobreIngreso: 2.334,
    comisionSobreAporte: 5.76,
    primaSobreAporte: 9.8,
    totalSobreAporte: 15.56,
  },
  {
    afap: 'Integración AFAP',
    comisionSobreIngreso: 0.864,
    primaSobreIngreso: 1.54,
    totalSobreIngreso: 2.404,
    comisionSobreAporte: 5.76,
    primaSobreAporte: 10.267,
    totalSobreAporte: 16.027,
  },
  {
    afap: 'AFAP SURA',
    comisionSobreIngreso: 0.864,
    primaSobreIngreso: 1.72,
    totalSobreIngreso: 2.584,
    comisionSobreAporte: 5.76,
    primaSobreAporte: 11.467,
    totalSobreAporte: 17.227,
  },
])

/**
 * El tope legal a las comisiones (Ley 16.713 art. 102) y el hecho de que tres AFAP cobren lo
 * mismo, DICHOS POR SEPARADO.
 *
 * Antes iban unidos por un «y por eso», que era inferencia nuestra y encima no cierra con los
 * números del BCU: el promedio ponderado del sistema que publica la memoria N.º 119 ronda 0,75%,
 * y un 20% por encima de eso da ≈0,90%, no el 0,864% que cobran las tres. El BCU no publica cuál
 * de los dos límites del art. 102 es el que ata, así que no afirmamos la causa.
 */
export const AFAP_FEE_CAP =
  'Hay un tope legal: ninguna AFAP puede cobrar más de un 20% por encima de la comisión promedio del sistema del mes anterior, ponderada por el volumen de activos bajo manejo, ni más que el máximo vigente al 31 de diciembre de 2021, y el regulador publica ese máximo todos los meses (artículo 102 de la Ley 16.713). Y hay un hecho: tres de las cuatro AFAP cobran exactamente la misma comisión, 0,864% del sueldo. Que lo segundo sea consecuencia de lo primero suena razonable, pero no lo afirmamos: el BCU no publica cuál de los dos límites es el que está atando, y con el promedio del sistema que sí publica la cuenta no da justo.'

/** Qué es la prima del seguro colectivo, según el art. 57 de la Ley 16.713. */
export const AFAP_INSURANCE_PREMIUM =
  'Es lo que financia el seguro colectivo de invalidez y fallecimiento. Si te incapacitás totalmente o fallecés en actividad, tu saldo acumulado casi nunca alcanza para pagar la jubilación por incapacidad o la pensión de sobrevivencia mínimas que fija la ley: esa insuficiencia la cubre un seguro que la AFAP contrata con una aseguradora, y la prima se descuenta de tu aporte obligatorio. No es plata que se quede la AFAP y no se acumula en tu cuenta: es la prima de un seguro que sí te cubre. Lo que aportás voluntariamente queda afuera —la ley dice que los recursos de las cuentas de ahorro voluntario y complementarios no están sujetos al pago de esa prima.'

/** Aseguradoras habilitadas a suscribir el contrato al 31/03/2026 (BCU, cuadro 1.1). */
export const AFAP_INSURERS: readonly string[] = Object.freeze([
  'Banco de Seguros del Estado',
  'MAPFRE Uruguay',
  'MetLife Seguros de Vida',
  'Metropolitan Life Seguros de Vida',
  'SURCO Compañía Cooperativa de Seguros',
  'Zurich Santander Seguros Uruguay',
])

/**
 * El régimen especial del art. 103 num. 5: quien entra al mercado de trabajo ya con el Sistema
 * Previsional Común vigente paga comisión SOBRE SALDOS los primeros 36 meses, y el BCU aclara en
 * sus cuadros que esa comisión es 0% desde diciembre de 2023.
 */
export const AFAP_NEW_ENTRANTS_FEE =
  'Si tu primer trabajo fue con el Sistema Previsional Común ya vigente, tu comisión no se cobra sobre el aporte sino sobre el saldo, durante los primeros treinta y seis meses, y es la misma para todos los nuevos aportantes. El BCU aclara en sus cuadros de comisiones que la comisión de ese régimen especial es 0% desde diciembre de 2023. Si no elegís AFAP en los primeros tres meses de aportación, la ley te asigna de oficio a la que menos cobre en ese régimen.'

export interface AfapFaq {
  question: string
  short: string
  answer: string
}

export const AFAP_FAQ: readonly AfapFaq[] = Object.freeze([
  {
    question: '¿Cómo me desvinculo de una AFAP?',
    short: 'Depende de qué quieras deshacer: revocar el artículo 8 y desafiliarse no son lo mismo.',
    answer:
      'Casi todo el que hace esta pregunta está pensando en revocar la opción del artículo 8, que es dejar sin efecto la distribución especial de aportes entre el BPS y la AFAP. Eso no te saca de la AFAP: cambia cómo se reparten los aportes, y después seguís aportando a la AFAP por la parte del sueldo que supera el tope A, que el BPS fija en $ 96.279 (valores de agosto de 2026). Desafiliarse es un trámite distinto que BPS lista aparte, con sus propias condiciones. Los dos se formalizan ante BPS.',
  },
  {
    question: '¿Quién puede revocar la opción del artículo 8?',
    short: 'Entre 40 y 49 años, en Régimen Mixto y habiendo optado sin estar obligado.',
    answer:
      'Las condiciones son: tener entre 40 y 49 años, estar incorporado al Régimen Mixto, haber optado por el artículo 8 sin estar obligado a hacerlo, no haberte jubilado por el Régimen Mixto, poder configurar causal jubilatoria antes de 2043 y no haber agotado las dos instancias de asesoramiento. Si alguna no se cumple, el trámite no se habilita.',
  },
  {
    question: '¿Puedo revocar sin pasar por el asesoramiento?',
    short: 'No. El asesoramiento de BPS es obligatorio.',
    answer:
      'BPS lo dice expresamente: el asesoramiento es obligatorio para poder revocar la opción del artículo 8. Es virtual, se hace por la app BPS Personas o los servicios en línea con usuario personal, y consiste en estimarte la jubilación futura en los dos escenarios, revocando y manteniendo la opción. La idea es justamente que decidas con tu número y no con una regla general.',
  },
  {
    question: '¿Cuánto tiempo tengo para decidir?',
    short: '90 días corridos desde que descargás el asesoramiento.',
    answer:
      'El plazo para tomar la decisión es de 90 días corridos a partir del momento en que descargás el asesoramiento. Es el dato que más se pasa por alto: la gente pide el asesoramiento, lo lee, lo deja para después y se le vence la instancia.',
  },
  {
    question: '¿Qué cambia en mi bolsillo si revoco?',
    short: 'Cambia el reparto de aportes entre BPS y AFAP, no el monto que aportás.',
    answer:
      'El aporte jubilatorio personal sigue siendo el mismo 15% del sueldo: lo que cambia es a dónde va. Con la opción del artículo 8 vigente, hasta el tope A ($ 96.279 según el BPS en agosto de 2026) se reparte mitad y mitad entre el BPS y la AFAP, entre el tope A y el tope B ($ 144.418) va todo al BPS, y del tope B para arriba va todo a la AFAP. Si revocás, pasa a ir todo al BPS hasta el tope A y todo a la AFAP por lo que lo supere. En los dos casos, lo que excede el tope C ($ 288.836) es aporte voluntario. Si eso te conviene o no depende de tu edad, tu historia laboral y los años que te faltan, y por eso el asesoramiento estima los dos escenarios. Quien te diga que sí o que no sin mirar tu historia laboral está adivinando.',
  },
  {
    question: '¿Desde qué sueldo empieza a irme plata a la AFAP?',
    short: 'Sin la opción del artículo 8, desde el tope A: $ 96.279 (BPS, agosto de 2026).',
    answer:
      'Depende de dos cosas y ninguna es cuánto ganás en abstracto. Primero, cuándo entraste al mercado de trabajo: si ya estabas afiliado al BPS antes del 1.º de diciembre de 2023, te rigen los artículos 7 y 8 de la Ley 16.713; si tu primer ingreso al mercado de trabajo fue desde esa fecha, te rige el artículo 22 de la Ley 20.130 y te van 5 de los 15 puntos a la cuenta individual desde el primer peso. Segundo, si hiciste la opción del artículo 8: con la opción, te entra a la AFAP desde el primer peso; sin la opción, el aporte va entero al BPS hasta el tope A y sólo lo que supera ese tope entra a la AFAP. El BPS publica los topes mes a mes y en agosto de 2026 el tope A estaba en $ 96.279, el B en $ 144.418 y el C en $ 288.836.',
  },
  {
    question: '¿En qué está invertida la plata de mi AFAP?',
    short: 'Sobre todo en deuda del Estado uruguayo; en acciones, casi nada.',
    answer:
      'El BCU publica la composición del fondo consolidado en cada memoria trimestral. Al 31 de marzo de 2026, las líneas más grandes eran bonos globales en unidades indexadas (25,91% del activo total), notas multilaterales en moneda extranjera (9,05%), notas del Tesoro en UI y UP (9,76%), fideicomisos financieros en UI y UP (8,33%) y en moneda extranjera (7,78%), bonos globales en pesos (7,73%), certificados de depósito en UI (7,00%), notas de Tesorería (6,58%) y letras de regulación monetaria (5,69%). Del otro lado de la tabla, las acciones eran el 0,12% y los bonos de gobierno extranjero el 0,36%. El 81,94% del activo estaba en moneda nacional y el 17,70% en moneda extranjera.',
  },
  {
    question: '¿Por qué las AFAP no invierten afuera?',
    short: 'Porque la ley no lo permite: el artículo 123 es una lista cerrada de activos.',
    answer:
      'La composición no la elige la AFAP: la acota la ley. El artículo 123 de la Ley 16.713 enumera seis categorías de activos y nada fuera de esa lista se puede comprar. La única ventana al exterior para invertir es el literal D, valores de renta fija emitidos por organismos internacionales de crédito o por gobiernos extranjeros de muy alta calificación crediticia, con un máximo de 30% del Subfondo de Crecimiento, 25% del de Acumulación y 20% del de Retiro, y además un techo de 15% sobre el Fondo de Ahorro Previsional entero. El literal E admite instrumentos de instituciones extranjeras de muy alta calificación, pero sólo para cubrir riesgos, no para invertir. Las acciones y los fondos que la lista sí habilita son los del literal B, y ese literal pide emisores uruguayos. Hay también un tope a la suma de todos los literales colocada en moneda extranjera: 45%, 40% y 15% según el subfondo. Todos esos máximos son legales y están en el artículo 123-BIS, agregado por la Ley 20.130; el BCU no los fija, publica cuánto usa cada AFAP contra ellos. Un matiz que la ley deja abierto y no vamos a resolver por vos: el mismo artículo 123-BIS prohíbe los títulos representativos de índices financieros sólo en el Subfondo de Retiro, y el artículo 123-TER nombra fondos de inversión «uruguayos o del exterior» para prohibir los que tengan por objeto inversiones vedadas.',
  },
  {
    question: '¿La AFAP me cobra sobre lo que aporto o sobre lo que tengo acumulado?',
    short: 'Sobre el aporte que entra cada mes. Hoy nadie cobra sobre el saldo acumulado.',
    answer:
      'El artículo 103 de la Ley 16.713 es tajante: sólo puede estar sujeta al cobro de comisiones la acreditación de los aportes obligatorios, y la comisión sólo puede establecerse como un porcentaje del aporte que le dio origen. En los cuadros del BCU de enero, febrero y marzo de 2026 la columna de comisión fija sobre el fondo aparece con un guion para las cuatro AFAP. Por eso el número que circula en internet suena tan feo: en marzo de 2026, entre comisión y prima del seguro, se descontaba entre el 12,3% y el 17,2% del aporte de ese mes según la AFAP. Es mucho del aporte, pero es sobre lo que entra ese mes, no sobre todo lo que juntaste. Sobre el sueldo que genera ese aporte, el mismo descuento va de 1,84% a 2,584%. Hay una excepción: si tu primer trabajo fue con el Sistema Previsional Común ya vigente, tu comisión se cobra sobre saldos los primeros treinta y seis meses, y el BCU aclara que esa comisión es 0% desde diciembre de 2023.',
  },
  {
    question: '¿Qué es la prima del seguro que me descuentan además de la comisión?',
    short:
      'El seguro colectivo de invalidez y fallecimiento. En las cuatro AFAP cuesta más que la comisión.',
    answer:
      'Es la prima del seguro colectivo de invalidez y fallecimiento del artículo 57 de la Ley 16.713. Si te incapacitás totalmente o fallecés en actividad, tu saldo acumulado casi nunca alcanza para pagar la jubilación por incapacidad o la pensión de sobrevivencia mínimas que fija la ley: esa insuficiencia la cubre un seguro que tu AFAP contrata con una aseguradora, y la prima sale de tu aporte obligatorio. No se la queda la AFAP y no se acumula en tu cuenta. En marzo de 2026, medida sobre el aporte, la prima iba de 8,267% en República AFAP a 11,467% en AFAP SURA, contra comisiones de 4,000% y 5,760%: en las cuatro AFAP el seguro te sale más caro que la administración. Lo que aportás voluntariamente no paga esta prima.',
  },
  {
    question: '¿Esto tiene que ver con la reforma de 2023?',
    short: 'Sí: el marco es la Ley 20.130 y el régimen de transición hasta 2043.',
    answer:
      'La Ley 20.130 creó el Sistema Previsional Común y fijó un régimen de transición. La condición de poder configurar causal antes de 2043 viene de ahí. Si querés el panorama general de qué cambió y a quién le aplica, está en nuestra guía de la reforma jubilatoria.',
  },
])
