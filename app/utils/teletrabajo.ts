// Contenido de `/teletrabajo-uruguay`: qué te tiene que dar la empresa y qué derechos tenés.
//
// Módulo PURO (sin runtime de Vue/Nuxt, imports relativos) para que vitest lo corra en Node y la
// página sólo lo renderice.
//
// POR QUÉ ESTA PÁGINA. El teletrabajo tiene ley propia en Uruguay desde 2021 y el sitio no lo
// nombraba en ninguna página: las dos únicas apariciones de la palabra, medidas el 2026-11-19, eran
// la palabra clave «teletrabajo vivienda» en `tools.ts` y en `siteNav.ts`, o sea una etiqueta de
// búsqueda y ninguna respuesta. El racimo laboral del sitio está completo alrededor —horas extras,
// licencias especiales, salario vacacional, aguinaldo, despido, seguro de paro, trabajo en negro—
// y la modalidad del teletrabajo no tenía dónde contestarse.
//
// Y las preguntas que se hacen son de PLATA, que es donde este sitio tiene algo que decir: quién
// paga la luz y el internet, si el equipo lo tenés que poner vos, si lo que te da la empresa te
// sube el aporte al BPS, y si la hora de más de un martes es hora extra. Las cuatro las contesta
// la norma y ninguna se contesta con una sola frase.
//
// REGLA DE FUENTES — cada regla de este archivo sale del texto vigente de una de estas normas,
// leídas artículo por artículo en impo.com.uy (última lectura: `TELETRABAJO_VERIFIED_AT`), y cada
// una lleva su artículo al lado y, en `cita`, las palabras EXACTAS de la norma de las que sale:
//
//   * Ley 19.978 (2021) — promoción y regulación del teletrabajo.
//   * Decreto 86/022 (2022) — la reglamenta: contenido del acuerdo, los 45 días, el registro de
//     horas, los equipos y las condiciones de seguridad, ergonomía y salud ocupacional.
//   * Ley 16.074 (1989) — el seguro de accidentes de trabajo, al que remite el art. 13 de la ley.
//
// En IMPO, `/bases/leyes/<n>` es el texto vigente y `/bases/leyes-originales/<n>` el de la
// promulgación: citar el segundo es publicar algo que puede estar derogado.
//
// LO QUE NO ESTÁ ESCRITO NO SE PUBLICA. Dos ejemplos que ya costaron una revisión:
//   * Los costos del equipo son del empleador SÓLO si no se acordó otra cosa («En caso de
//     desacuerdo», ley art. 12; «Para el caso de no existir acuerdo», decreto art. 8). Escribirlo
//     sin la condición es afirmar una regla que la norma no tiene.
//   * «No es materia gravada» se publica como dice la norma (aportes); el IRPF no lo nombra
//     ninguna de las dos y ninguna fuente de la DGI lo dice, así que la página no lo afirma.
//
// EL HUECO SE DECLARA COMO HUECO. Ninguna de las dos normas nombra la factura de luz ni el
// internet. Lo que dicen es «servicios», y de ahí sale la regla del desacuerdo. Esta página dice
// eso y no «la empresa te paga la luz», que es lo que la norma no escribió.

/** Una fuente oficial que respalda lo que afirma la página. */
export interface TeletrabajoSource {
  label: string
  url: string
  publisher: string
}

/** Primero la ley, después el decreto que la reglamenta: es el orden de autoridad. */
export const TELETRABAJO_SOURCES: readonly TeletrabajoSource[] = Object.freeze([
  {
    label: 'Ley N.º 19.978 — Teletrabajo (texto vigente)',
    url: 'https://www.impo.com.uy/bases/leyes/19978-2021',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label:
      'Decreto N.º 86/022 — reglamenta la Ley 19.978: acuerdo, jornada, equipos, seguridad y ergonomía',
    url: 'https://www.impo.com.uy/bases/decretos/86-2022',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label:
      'Ley N.º 16.074 — Seguro obligatorio sobre accidentes de trabajo y enfermedades profesionales',
    url: 'https://www.impo.com.uy/bases/leyes/16074-1989',
    publisher: 'IMPO — Centro de Información Oficial',
  },
])

/** Cuándo se leyeron las normas. Se cambia a mano y sólo después de volver a leerlas. */
export const TELETRABAJO_VERIFIED_AT = '2026-11-20'

/**
 * A quién se aplica la ley. Va arriba de todo en la página porque decide si el resto te toca: la
 * ley no cubre a quien trabaja para el Estado ni a quien factura como independiente.
 */
export const TELETRABAJO_ALCANCE = Object.freeze({
  texto:
    'La ley se aplica a quien trabaja en relación de dependencia para un empleador privado o una persona de derecho público no estatal. No cubre a quien trabaja para el Estado ni a quien trabaja como independiente.',
  articulo: 'Ley 19.978, art. 2',
  cita: 'será aplicable a las relaciones laborales que se desempeñen en un régimen de subordinación y dependencia en las que el empleador sea una persona privada o de derecho público no estatal',
})

/** Los plazos que la norma escribe con un número, que es lo que se busca. */
export interface TeletrabajoPlazo {
  /** El número, listo para imprimir en una celda. */
  valor: string
  /** Qué mide ese número. */
  concepto: string
  /** Qué cambia en la práctica. */
  detalle: string
  articulo: string
  /** Las palabras exactas de la norma de las que sale el número. */
  cita: string
}

/**
 * Ordenados por lo que más se busca, no por número de artículo: la desconexión primero, porque es
 * la única de las cuatro que protege al trabajador todos los días y no una vez.
 */
export const TELETRABAJO_PLAZOS: readonly TeletrabajoPlazo[] = Object.freeze([
  {
    valor: '8 horas continuas',
    concepto: 'Desconexión entre una jornada y la siguiente',
    detalle:
      'Es un mínimo y tienen que ser corridas. El horario de desconexión lo acuerdan las partes y se establece en el contrato.',
    articulo: 'Ley 19.978, art. 8 y Decreto 86/022, art. 9',
    cita: 'Deberá existir una desconexión mínima de 8 horas continuas entre una jornada y la siguiente.',
  },
  {
    valor: '90 días corridos',
    concepto: 'Para volver a presencial, si el teletrabajo empezó después',
    detalle:
      'Si la relación arrancó presencial y después pasaste a teletrabajo, cualquiera de las dos partes tiene derecho a volver a presencial dentro de ese plazo, contado desde que empezó el teletrabajo. Si el teletrabajo fue la modalidad adoptada desde el principio, pasar a presencial necesita el consentimiento de las dos por escrito.',
    articulo: 'Ley 19.978, art. 7 y Decreto 86/022, art. 4',
    cita: 'tendrán derecho a retornar a la modalidad presencial dentro de los 90 (noventa) días corridos de iniciado el teletrabajo',
  },
  {
    valor: '7 días corridos',
    concepto: 'De aviso previo para ejercer esa vuelta',
    detalle: 'Como mínimo, y por escrito o por cualquier medio electrónico.',
    articulo: 'Ley 19.978, art. 7 y Decreto 86/022, art. 4',
    cita: 'con una comunicación previa a la otra parte no inferior a 7 (siete) días corridos. Dicha comunicación deberá efectuarse por escrito o por cualquier medio electrónico.',
  },
  {
    valor: 'Más de 45 días',
    concepto: 'Y el cambio de modalidad se entiende permanente',
    detalle:
      'Salvo que las partes acuerden expresamente otra cosa. Y un cambio permanente, de presencial a teletrabajo o al revés, necesita el común acuerdo de las partes y documentarse por escrito.',
    articulo: 'Decreto 86/022, art. 4',
    cita: 'Salvo que las partes acuerden expresamente otra cosa, se entenderán permanentes aquellas modificaciones que determinen que la prestación de trabajo se realiza en una u otra modalidad durante más de 45 (cuarenta y cinco) días.',
  },
])

/** Una obligación de la empresa, con el artículo que la fija. */
export interface TeletrabajoObligacion {
  titular: string
  detalle: string
  articulo: string
  /** Las palabras exactas de la norma de las que sale la obligación. */
  cita: string
}

/**
 * Lo que la empresa tiene que poner. El orden es el del dinero: primero el equipo y los costos,
 * que es la pregunta, y después lo que no se ve hasta que pasa algo.
 */
export const TELETRABAJO_OBLIGACIONES: readonly TeletrabajoObligacion[] = Object.freeze([
  {
    titular: 'Sin acuerdo, el equipo lo pone la empresa',
    detalle:
      'Cómo se proveen las herramientas se acuerda entre las partes y tiene que constar en el contrato. La norma resuelve el caso en que no hay acuerdo: ahí el empleador debe proporcionar los equipos, los insumos y los servicios necesarios para teletrabajar.',
    articulo: 'Ley 19.978, art. 12 y Decreto 86/022, art. 8',
    cita: 'En caso de desacuerdo, el empleador deberá proporcionar los equipos, insumos y servicios y demás herramientas necesarias para el desarrollo del teletrabajo',
  },
  {
    titular: 'Y, en ese mismo caso, paga lo que cuesta mantenerlo andando',
    detalle:
      'Si no se acordó otra cosa, la instalación, la operación, el funcionamiento, el reemplazo y el mantenimiento de los equipos son costos del empleador. No es lo mismo que la factura del hogar: ver abajo.',
    articulo: 'Ley 19.978, art. 12 y Decreto 86/022, art. 8',
    cita: 'Para el caso de no existir acuerdo, los equipos, insumos y servicios necesarios para el teletrabajo deberán ser proporcionados por el empleador, siendo de su cargo los costos de instalación, operación, funcionamiento, reemplazo y mantenimiento de los equipos.',
  },
  {
    titular: 'Lo que te da no es sueldo ni te sube el aporte',
    detalle:
      'Los equipos, insumos y servicios que provee el empleador, sea entregándolos o pagando su costo, no se consideran a ningún efecto parte del salario, materia gravada ni asignación computable, así que no engrosan la base sobre la que se calculan los aportes a la seguridad social.',
    articulo: 'Ley 19.978, art. 12',
    cita: 'Los equipos, insumos y servicios que provea el empleador, ya sea en forma directa o asumiendo su costo para el desarrollo de las tareas asignadas al teletrabajador, no serán considerados a ningún efecto parte del salario, materia gravada ni asignación computable.',
  },
  {
    titular: 'La seguridad y la ergonomía siguen siendo su problema',
    detalle:
      'Teletrabajar no exime al empleador de verificar las condiciones de salud y seguridad. Los riesgos del teletrabajo —incluidos los psicosociales y los ergonómicos— tienen que integrarse al sistema de gestión de salud y seguridad de la empresa, y si la Inspección General del Trabajo y de la Seguridad Social se lo pide, el empleador informa por escrito los riesgos identificados y las medidas preventivas.',
    articulo: 'Ley 19.978, art. 11 y Decreto 86/022, art. 7',
    cita: 'Se deberán integrar los riesgos laborales del teletrabajo al sistema de gestión de salud y seguridad en el trabajo de las empresas, debiéndose identificar y evaluar los riesgos laborales a los que están expuestos los teletrabajadores, incluidos los riesgos psicosociales y ergonómicos.',
  },
  {
    titular: 'Un accidente trabajando desde tu casa se cubre como accidente de trabajo',
    detalle:
      'Al teletrabajador se le aplica toda la Ley 16.074, la misma del que trabaja en el local de la empresa. Esa ley cubre los accidentes y las enfermedades profesionales que ocurran «a causa del trabajo o en ocasión del mismo»: no cualquier accidente en tu casa, sino el que tiene que ver con el trabajo.',
    articulo: 'Ley 19.978, art. 13 y Ley 16.074, art. 2',
    cita: 'Todo patrono es responsable civilmente de los accidentes o enfermedades profesionales que ocurran a sus obreros y empleados a causa del trabajo o en ocasión del mismo',
  },
])

/** Un derecho del teletrabajador, con el artículo que lo fija. */
export interface TeletrabajoDerecho {
  derecho: string
  articulo: string
  /** Las palabras exactas de la norma de las que sale el derecho. */
  cita: string
}

export const TELETRABAJO_DERECHOS: readonly TeletrabajoDerecho[] = Object.freeze([
  {
    derecho:
      'No te pueden pasar a teletrabajo sin tu consentimiento, y ese consentimiento tiene que constar por escrito.',
    articulo: 'Ley 19.978, art. 3, lit. A',
    cita: 'El teletrabajo es voluntario, deberá obtenerse el consentimiento del trabajador, el que deberá constar por escrito.',
  },
  {
    derecho:
      'Durante el tiempo de desconexión, los descansos y la licencia no estás obligado a responder comunicaciones, órdenes ni requerimientos del empleador.',
    articulo: 'Ley 19.978, art. 14 y Decreto 86/022, art. 9',
    cita: 'Todo teletrabajador tiene derecho a la desconexión en los tiempos de descanso y licencias, y durante ese periodo el teletrabajador tiene derecho a no responder comunicaciones, órdenes u otros requerimientos.',
  },
  {
    derecho: 'No te pueden sancionar por negarte a cumplir tareas en el período de desconexión.',
    articulo: 'Decreto 86/022, art. 9',
    cita: 'El teletrabajador no podrá ser sancionado por el ejercicio de su derecho a oponerse a cumplir tareas en el período de desconexión.',
  },
  {
    derecho:
      'Podés distribuir libremente tu jornada en los horarios que mejor se adapten a tus necesidades, considerando el horario de funcionamiento y las necesidades de la empresa, y sin perjuicio de lo que diga tu contrato sobre el horario.',
    articulo: 'Ley 19.978, art. 8 y Decreto 86/022, art. 5',
    cita: 'El teletrabajador podrá distribuir libremente su jornada en los horarios que mejor se adapten a sus necesidades, considerando el horario de funcionamiento y las necesidades de la empresa',
  },
  {
    derecho:
      'Si se acuerda un sistema para registrar tus horas, no puede ser invasivo de tu vida privada ni de tu intimidad, ni de las de tu grupo familiar, y tiene que incluirse en el contrato o en el acuerdo de teletrabajo.',
    articulo: 'Decreto 86/022, art. 6',
    cita: 'siempre que el mismo no sea invasivo respecto de la vida privada e intimidad del teletrabajador y su grupo familiar',
  },
  {
    derecho:
      'El lugar desde el que teletrabajás lo determinan las partes: tu domicilio u otro sitio definido en el contrato. En ningún caso podés exigirle al empleador que te lo proporcione.',
    articulo: 'Ley 19.978, art. 6 y Decreto 86/022, art. 3',
    cita: 'En ningún caso, el teletrabajador podrá exigir al empleador que sea este quien le proporcione el lugar donde se preste el teletrabajo.',
  },
])

/** Cada punto que el acuerdo de teletrabajo tiene que decir, según el decreto (art. 3). */
export const TELETRABAJO_ACUERDO: readonly string[] = Object.freeze([
  'Que la modalidad se pacta en forma voluntaria.',
  'El lugar o los lugares desde donde se teletrabaja, o que podés elegirlo libremente, incluso alternando más de uno.',
  'Si hay combinación de trabajo presencial y teletrabajo y, en ese caso, cómo se organiza.',
  'Si hay horarios o franjas horarias en que distribuís tus horas.',
  'Los descansos —intermedio, entre jornadas y semanal— y el tiempo de desconexión.',
  'El sistema de registro de asistencia y horario, con una breve descripción, si el empleador resuelve implementarlo.',
  'Cómo se proveen las tecnologías de la información que el teletrabajo necesita.',
])

export interface TeletrabajoFaq {
  question: string
  answer: string
}

/** Las preguntas son las que se escriben en el buscador, no las que se nos ocurrieron. */
export const TELETRABAJO_FAQ: readonly TeletrabajoFaq[] = Object.freeze([
  {
    question: '¿Quién paga la luz y el internet en el teletrabajo?',
    answer:
      'Conviene saber lo que la norma escribe antes de reclamar: ni la Ley 19.978 ni el Decreto 86/022 nombran la factura de UTE ni la de internet. Lo que escriben es "servicios". La regla es que la provisión de las herramientas se acuerda entre las partes y queda en el contrato, y que en caso de desacuerdo el empleador debe proporcionar los equipos, los insumos y los servicios necesarios para teletrabajar (Ley 19.978, art. 12). En ese mismo caso, sin acuerdo, los costos de instalación, operación, funcionamiento, reemplazo y mantenimiento de los EQUIPOS son del empleador (Ley 19.978, art. 12; Decreto 86/022, art. 8). O sea que la respuesta práctica es la misma de todo este régimen: lo que no pactaste por escrito se discute, así que pactalo.',
  },
  {
    question: '¿Cuántas horas de desconexión me corresponden?',
    answer:
      'Ocho continuas entre una jornada y la siguiente, como mínimo. Lo que acuerdan las partes, y queda establecido en el contrato, es el horario de desconexión (Ley 19.978, art. 8; Decreto 86/022, art. 9). Durante los descansos y las licencias no estás obligado a contestar comunicaciones, órdenes ni requerimientos, y no te pueden sancionar por negarte a cumplir tareas en el período de desconexión.',
  },
  {
    question: '¿Me pueden obligar a teletrabajar?',
    answer:
      'No. El teletrabajo es voluntario y el consentimiento del trabajador debe constar por escrito (Ley 19.978, art. 3, lit. A). Pasar de presencial a teletrabajo de manera permanente, o al revés, necesita el común acuerdo de las partes y documentarse por escrito (Ley 19.978, art. 7).',
  },
  {
    question: 'Si un día trabajo más horas, ¿son horas extras?',
    answer:
      'No necesariamente. El exceso sobre la jornada diaria legal o contractual no constituye trabajo extraordinario: se compensa con horas no trabajadas en otros días de la misma semana. Lo que sí se paga como extra es lo que pasa del máximo SEMANAL: el art. 8 de la ley lo escribe con un 100 % de recargo sobre el valor hora de los días hábiles, y el decreto, en su art. 5, dice que se abonará como hora extra "con las tasas de recargo que correspondan". El máximo semanal es el legal de la actividad a la que pertenece la empresa, o el límite semanal pactado en el contrato.',
  },
  {
    question: '¿Puedo volver a la oficina si me arrepiento?',
    answer:
      'Depende de cómo empezó. Si tu relación laboral arrancó presencial y después pasaste a teletrabajo, cualquiera de las dos partes tiene derecho a volver a presencial dentro de los 90 días corridos de iniciado el teletrabajo, avisando a la otra con por lo menos 7 días corridos de anticipación, por escrito o por cualquier medio electrónico. Si el teletrabajo fue la modalidad adoptada desde el inicio, pasar a presencial exige el consentimiento de las dos partes por escrito (Ley 19.978, art. 7; Decreto 86/022, art. 4).',
  },
  {
    question: '¿Pueden entrar a mi casa a inspeccionar?',
    answer:
      'No sin tu consentimiento o una autorización judicial. El lugar de teletrabajo tiene que cumplir la normativa de salud y seguridad, y el empleador puede pedir la intervención de la Inspección General del Trabajo y de la Seguridad Social para verificarlo. Si el trabajo se hace en tu domicilio y no das tu consentimiento, la Inspección tiene que pedir la inspección por vía judicial. Si la inspección constata que el lugar no cumple, se dispone la suspensión del teletrabajo hasta que se modifiquen las condiciones o el lugar, sin perjuicio de las sanciones que puedan corresponder (Ley 19.978, art. 11; Decreto 86/022, art. 7).',
  },
  {
    question: '¿Si teletrabajo dos días por semana también me aplica la ley?',
    answer:
      'Sí. El teletrabajo puede ser total o parcial —el decreto lo llama régimen híbrido— y en el caso parcial hay teletrabajo cuando las dos partes lo establecen de común acuerdo (Decreto 86/022, art. 1). Y las reglas de jornada del art. 8 de la ley se aplican "a la totalidad de las jornadas trabajadas en régimen de teletrabajo parcial o híbrido" (Decreto 86/022, art. 5).',
  },
  {
    question: '¿Lo que me da la empresa para teletrabajar me sube los aportes?',
    answer:
      'No. Los equipos, insumos y servicios que el empleador provee para teletrabajar, sea entregándolos o pagando su costo, no se consideran a ningún efecto parte del salario, materia gravada ni asignación computable (Ley 19.978, art. 12), así que no entran en la base sobre la que se calculan los aportes a la seguridad social. Si querés ver cómo se arma esa base con tu sueldo, está la calculadora de sueldo líquido del sitio.',
  },
  {
    question: '¿La ley de teletrabajo me aplica si trabajo para el Estado o como independiente?',
    answer:
      'No. La Ley 19.978 se aplica a las relaciones laborales en régimen de subordinación y dependencia en las que el empleador es una persona privada o de derecho público no estatal (Ley 19.978, art. 2). Quien trabaja para el Estado, o como independiente y sin relación de dependencia, queda fuera de este régimen.',
  },
])

export interface TeletrabajoRelated {
  to: string
  label: string
}

export const TELETRABAJO_RELATED: readonly TeletrabajoRelated[] = Object.freeze([
  { to: '/horas-extras-uruguay', label: 'Horas extras: 100 % hábil, 150 % feriado' },
  { to: '/licencias-especiales-uruguay', label: 'Licencias especiales' },
  { to: '/contractor-en-uruguay', label: 'Contractor o dependiente' },
  { to: '/mercado-it-uruguay', label: 'Mercado IT en Uruguay' },
  {
    to: '/herramientas/calculadora-sueldo-liquido',
    label: 'Calculadora de sueldo líquido',
  },
])

/** Las normas que la página cita, con el nombre con que aparecen en cada `articulo`. */
export const TELETRABAJO_NORMAS = Object.freeze(['Ley 19.978', 'Decreto 86/022', 'Ley 16.074'])

/** Los plazos expresados en días, para que la página pueda contarlos sin reparsear el texto. */
export function teletrabajoPlazosConNumero(
  plazos: readonly TeletrabajoPlazo[] = TELETRABAJO_PLAZOS
): number {
  return plazos.filter(plazo => /\d/.test(plazo.valor)).length
}

/**
 * Cuántos artículos distintos cita la página. Es la medida de que todo tiene norma detrás.
 *
 * Un `articulo` puede nombrar dos normas («Ley 19.978, art. 13 y Ley 16.074, art. 2»), y cada
 * artículo cuenta sólo si va escrito pegado a su norma («<norma>, art. N»): un «art. N» suelto no
 * se le atribuye a nadie.
 */
export function teletrabajoArticulosCitados(): string[] {
  const fuentes = [
    TELETRABAJO_ALCANCE.articulo,
    ...TELETRABAJO_PLAZOS.map(plazo => plazo.articulo),
    ...TELETRABAJO_OBLIGACIONES.map(obligacion => obligacion.articulo),
    ...TELETRABAJO_DERECHOS.map(derecho => derecho.articulo),
    // Las respuestas de las preguntas frecuentes también citan: la del régimen híbrido es la única
    // que trae el Decreto 86/022, art. 1, y sin ella el recuento quedaba uno corto.
    ...TELETRABAJO_FAQ.map(item => item.answer),
  ]
  const articulos = new Set<string>()
  for (const texto of fuentes) {
    for (const match of texto.matchAll(/(Ley 19\.978|Decreto 86\/022|Ley 16\.074), art\. (\d+)/g)) {
      articulos.add(`${match[1]} art. ${match[2]}`)
    }
  }
  return [...articulos].sort()
}
