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
// FUENTES PRIMARIAS, verificadas el 2026-08-10:
//   - BPS, «Revocación art. 8 Ley 16.713 AFAP» (condiciones y efecto)
//     https://www.bps.gub.uy/12913/revocacion-art-8-ley-16713-afap.html
//   - BPS, «Asesoramiento revocación art. 8» (el plazo de 90 días corridos)
//     https://www.bps.gub.uy/12912/asesoramiento-revocacion-art-8-ley-16713-afap.html
//   - Ley 16.713 art. 8 — la opción que se revoca
//     https://www.impo.com.uy/bases/leyes/16713-1995/8
//   - Ley 20.130 — Sistema Previsional Común (el marco vigente)
//     https://www.impo.com.uy/bases/leyes/20130-2023

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
      'No te vas de la AFAP: cambia cómo se distribuyen los aportes. Después de revocar, aportás a la AFAP sólo por la parte del sueldo que supera el tope.',
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
      'Casi todo el que hace esta pregunta está pensando en revocar la opción del artículo 8, que es dejar sin efecto la distribución especial de aportes entre el BPS y la AFAP. Eso no te saca de la AFAP: cambia cómo se reparten los aportes, y después seguís aportando a la AFAP por la parte del sueldo que supera el tope. Desafiliarse es un trámite distinto que BPS lista aparte, con sus propias condiciones. Los dos se formalizan ante BPS.',
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
      'Después de revocar, pasás a aportar a la AFAP sólo por la parte del sueldo que supera el tope. Si eso te conviene o no depende de tu edad, tu historia laboral y tus años que faltan, y por eso el asesoramiento estima los dos escenarios. No hay una respuesta que sirva para todos: quien te diga que sí o que no sin mirar tu historia laboral está adivinando.',
  },
  {
    question: '¿Esto tiene que ver con la reforma de 2023?',
    short: 'Sí: el marco es la Ley 20.130 y el régimen de transición hasta 2043.',
    answer:
      'La Ley 20.130 creó el Sistema Previsional Común y fijó un régimen de transición. La condición de poder configurar causal antes de 2043 viene de ahí. Si querés el panorama general de qué cambió y a quién le aplica, está en nuestra guía de la reforma jubilatoria.',
  },
])
