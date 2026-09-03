// Cuánto vale una hora extra en Uruguay, cuántas te pueden pedir, y qué es trabajo nocturno.
//
// POR QUÉ ESTA PÁGINA. Medido el 2026-09-03 en el SERP uruguayo (gl=uy) para "cómo se pagan las
// horas extras en uruguay": no hay caja de respuesta ni preguntas relacionadas, y lo que rankea es
// una página del MTSS, dos blogs de estudios jurídicos, una consultora de empleo y el PIT-CNT.
// Es el mismo patrón que la página de licencias especiales: el SERP es institucional e ilegible,
// que es donde un sitio chico gana escribiéndolo claro.
//
// Y el autocompletado uruguayo pide exactamente lo que la ley contesta: "tope horas extras
// uruguay" (son 8 por semana, art. 5), "me pueden obligar a hacer horas extras" (no: el art. 5
// pide consentimiento previo), "horas extras nocturnas uruguay" (es otra norma, la 19.313).
//
// TODO NÚMERO SALE DEL TEXTO VIGENTE, leído en impo.com.uy el 2026-09-03:
//   * Ley 15.996 (1988) — horas extras: recargos, redondeo, tope semanal.
//   * Ley 5.350 (1915), "ley de las ocho horas" — 8 h diarias y 48 por cada seis días de labor.
//   * Decreto-ley 14.320 (1974) — comercio: 44 horas semanales.
//   * Ley 19.313 (2015) — trabajo nocturno: sobretasa del 20 %.
// No hay una sola cifra estimada. En IMPO, `/bases/leyes/<n>` es el texto vigente y
// `/bases/leyes-originales/<n>` el de la promulgación: citar el segundo es publicar algo derogado.

export interface RecargoHoraExtra {
  cuando: string
  recargo: string
  detalle: string
  articulo: string
}

export const RECARGOS: readonly RecargoHoraExtra[] = Object.freeze([
  {
    cuando: 'En un día hábil',
    recargo: '100 %',
    detalle: 'La hora extra se paga al doble de la hora común.',
    articulo: 'Ley 15.996, art. 1',
  },
  {
    cuando: 'En un feriado o en tu día de descanso semanal',
    recargo: '150 %',
    detalle:
      'La hora se paga a dos veces y media. El porcentaje se calcula sobre el valor de la hora de un día laborable, no sobre el del feriado.',
    articulo: 'Ley 15.996, art. 1',
  },
])

export interface LimiteJornada {
  rama: string
  diario: string
  semanal: string
  norma: string
}

/**
 * El límite importa porque define QUÉ es una hora extra: es la que pasa el tope que te aplica a
 * vos. Y el tope no es el mismo en toda la actividad privada — la diferencia entre 44 y 48 es una
 * jornada entera al mes.
 */
export const LIMITES_JORNADA: readonly LimiteJornada[] = Object.freeze([
  {
    rama: 'Industria',
    diario: '8 horas',
    semanal: '48 horas por cada seis días de labor',
    norma: 'Ley 5.350 (ley de las ocho horas)',
  },
  {
    rama: 'Comercio',
    diario: '8 horas',
    semanal: '44 horas, con 36 horas seguidas de descanso',
    norma: 'Decreto-ley 14.320, art. 1',
  },
])

export interface ReglaHoraExtra {
  regla: string
  articulo: string
}

export const REGLAS: readonly ReglaHoraExtra[] = Object.freeze([
  {
    regla:
      'El tope es de 8 horas extras por semana, y el empleador necesita tu consentimiento previo para pedírtelas.',
    articulo: 'Ley 15.996, art. 5',
  },
  {
    regla:
      'Las fracciones cuentan: menos de treinta minutos se computan como media hora y más de treinta, como una hora entera.',
    articulo: 'Ley 15.996, art. 2',
  },
  {
    regla:
      'Lo que cobrás por horas extras es salario. No es una gratificación: entra en el cálculo de todo lo que se calcula sobre el salario.',
    articulo: 'Ley 15.996, art. 3',
  },
  {
    regla:
      'Cuentan para la licencia y el salario vacacional: se toma el promedio de horas extras del año y se aplica la tarifa vigente.',
    articulo: 'Ley 15.996, art. 4',
  },
  {
    regla:
      'Un convenio colectivo o un laudo puede darte un régimen mejor, y en ese caso vale el mejor. Nunca uno peor.',
    articulo: 'Ley 15.996, art. 7',
  },
])

export interface ReglaNocturna {
  regla: string
  articulo: string
}

/**
 * El nocturno es OTRA norma y otro concepto: no es una hora extra, es un recargo por el horario.
 * Se pueden dar juntos, pero confundirlos es el error más común en lo que hay publicado.
 */
export const NOCTURNIDAD: readonly ReglaNocturna[] = Object.freeze([
  {
    regla:
      'Es trabajo nocturno el que se hace entre las 22 y las 6 del día siguiente, y sólo genera recargo si trabajás más de cinco horas seguidas en esa franja.',
    articulo: 'Ley 19.313, art. 4',
  },
  {
    regla:
      'La sobretasa mínima es del 20 %, o su equivalente en reducción horaria. Si tu laudo ya te da un porcentaje igual o mayor, rige el del laudo; si te da menos, se ajusta a este mínimo.',
    articulo: 'Ley 19.313, art. 3',
  },
  {
    regla:
      'La trabajadora embarazada, y hasta un año después del parto, puede pasar a horario diurno por su sola voluntad, sin perder la compensación por trabajo nocturno.',
    articulo: 'Ley 19.313, art. 2',
  },
])

export interface Fuente {
  label: string
  url: string
}

export const HORAS_EXTRAS_SOURCES: readonly Fuente[] = Object.freeze([
  {
    label: 'Ley N.º 15.996 — Horas extras (texto vigente, IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/15996-1988',
  },
  {
    label: 'Ley N.º 5.350 — Ley de las ocho horas',
    url: 'https://www.impo.com.uy/bases/leyes/5350-1915',
  },
  {
    label: 'Decreto-ley N.º 14.320 — Jornada en el comercio',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14320-1974',
  },
  {
    label: 'Ley N.º 19.313 — Trabajo nocturno',
    url: 'https://www.impo.com.uy/bases/leyes/19313-2015',
  },
])

/** Cuándo se leyeron las normas. Se actualiza a mano y sólo después de volver a leerlas. */
export const HORAS_EXTRAS_VERIFIED_AT = '2026-09-03'

export interface FaqEntry {
  question: string
  answer: string
}

/** Las preguntas son las que sugiere el autocompletado uruguayo, no las que se nos ocurrieron. */
export const HORAS_EXTRAS_FAQ: readonly FaqEntry[] = Object.freeze([
  {
    question: '¿Cuánto se paga la hora extra en Uruguay?',
    answer:
      'Con 100 % de recargo si la hacés en un día hábil, o sea el doble de la hora común. Si la hacés en un feriado o en tu día de descanso semanal, el recargo es del 150 %: dos veces y media. Ese 150 % se calcula sobre el valor de la hora de un día laborable.',
  },
  {
    question: '¿Cuál es el tope de horas extras por semana?',
    answer:
      'Ocho por semana. La ley también exige el consentimiento previo del trabajador, así que el empleador no puede imponerlas por su cuenta. Hay excepciones que autoriza el Ministerio de Trabajo con razones fundadas.',
  },
  {
    question: '¿Me pueden obligar a hacer horas extras?',
    answer:
      'No. La ley de horas extras habla de "previo consentimiento del trabajador" para disponerlas. Distinto es lo que pase en los hechos, y ahí la consulta va al Ministerio de Trabajo o al sindicato.',
  },
  {
    question: '¿Desde qué hora es hora extra?',
    answer:
      'Desde que pasás el límite que te aplica a vos. En la industria son 8 horas diarias y 48 por cada seis días de labor; en el comercio, 8 diarias y 44 semanales. Por eso la misma hora puede ser extra para uno y no para otro.',
  },
  {
    question: '¿Y si trabajo media hora de más?',
    answer:
      'Se redondea a favor tuyo por tramos: las fracciones de menos de treinta minutos se computan como media hora y las de más de treinta, como una hora entera.',
  },
  {
    question: '¿Las horas extras cuentan para el aguinaldo y la licencia?',
    answer:
      'Sí. La ley les da carácter salarial, y para la licencia y el salario vacacional se computa el promedio de horas extras del año con la tarifa vigente.',
  },
  {
    question: '¿El recargo nocturno es lo mismo que una hora extra?',
    answer:
      'No, son dos cosas distintas y de dos leyes distintas. El nocturno es un recargo del 20 % como mínimo por trabajar entre las 22 y las 6, y sólo aplica si hacés más de cinco horas seguidas en esa franja. Una hora puede ser extra, nocturna, o las dos.',
  },
])
