// Contenido de `/teletrabajo-uruguay`: qué te tiene que dar la empresa y qué podés negarte a hacer.
//
// Módulo PURO (sin runtime de Vue/Nuxt, imports relativos) para que vitest lo corra en Node y la
// página sólo lo renderice.
//
// POR QUÉ ESTA PÁGINA. El teletrabajo tiene ley propia en Uruguay desde 2021 y el sitio no lo
// nombraba en ninguna página: las dos únicas apariciones de la palabra, medidas el 2026-11-19, eran
// la palabra clave «teletrabajo vivienda» en `tools.ts` y en `siteNav.ts`, o sea una etiqueta de
// búsqueda y ninguna respuesta. El racimo laboral del sitio está completo alrededor —horas extras,
// licencias especiales, salario vacacional, aguinaldo, despido, seguro de paro, trabajo en negro—
// y justo la modalidad en la que trabaja buena parte de su audiencia (`/mercado-it-uruguay`,
// `/contractor-en-uruguay`) no tenía dónde contestarse.
//
// Y las preguntas que se hacen son de PLATA, que es donde este sitio tiene algo que decir: quién
// paga la luz y el internet, si el equipo lo tenés que poner vos, si lo que te da la empresa te
// sube el aporte al BPS, y si la hora de más de un martes es hora extra. Las cuatro las contesta
// la norma y ninguna se contesta con una sola frase.
//
// REGLA DE FUENTES — cada regla de este archivo sale del texto vigente de una de las DOS normas,
// leídas artículo por artículo en impo.com.uy el 2026-11-19, y cada una lleva su artículo al lado:
//
//   * Ley 19.978 (2021) — promoción y regulación del teletrabajo.
//   * Decreto 86/022 (2022) — la reglamenta: contenido del acuerdo, los 45 días, el registro de
//     horas, los equipos y las condiciones de seguridad, ergonomía y salud ocupacional.
//
// En IMPO, `/bases/leyes/<n>` es el texto vigente y `/bases/leyes-originales/<n>` el de la
// promulgación: citar el segundo es publicar algo que puede estar derogado.
//
// EL HUECO SE DECLARA COMO HUECO. Ninguna de las dos normas nombra la factura de luz ni el
// internet. Lo que dicen es «servicios», y de ahí sale la regla del desacuerdo. Esta página dice
// eso y no «la empresa te paga la luz», que es lo que se lee afuera y lo que la norma no escribió.

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
export const TELETRABAJO_VERIFIED_AT = '2026-11-19'

/** Los plazos que la norma escribe con un número, que es lo que se busca. */
export interface TeletrabajoPlazo {
  /** El número, listo para imprimir en una celda. */
  valor: string
  /** Qué mide ese número. */
  concepto: string
  /** Qué cambia en la práctica. */
  detalle: string
  articulo: string
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
      'Es un mínimo, no un promedio: tienen que ser corridas. El horario concreto se pacta y queda escrito en el acuerdo.',
    articulo: 'Ley 19.978, art. 8 y Decreto 86/022, art. 9',
  },
  {
    valor: '90 días corridos',
    concepto: 'Para volver a presencial, si el teletrabajo empezó después',
    detalle:
      'Si la relación arrancó presencial y después pasaste a teletrabajo, cualquiera de las dos partes puede volver atrás dentro de ese plazo. Si el teletrabajo fue lo acordado desde el principio, pasar a presencial necesita el consentimiento escrito de las dos.',
    articulo: 'Ley 19.978, art. 7 y Decreto 86/022, art. 4',
  },
  {
    valor: '7 días corridos',
    concepto: 'De aviso previo para ejercer esa vuelta',
    detalle: 'Por escrito o por medios electrónicos.',
    articulo: 'Decreto 86/022, art. 4',
  },
  {
    valor: 'Más de 45 días',
    concepto: 'Y el cambio de modalidad se considera permanente',
    detalle:
      'Salvo que las partes hayan pactado otra cosa. Es la regla que convierte un arreglo "por ahora" en la modalidad de tu contrato.',
    articulo: 'Decreto 86/022, art. 4',
  },
])

/** Una obligación de la empresa, con el artículo que la fija. */
export interface TeletrabajoObligacion {
  titular: string
  detalle: string
  articulo: string
}

/**
 * Lo que la empresa tiene que poner. El orden es el del dinero: primero el equipo y los costos,
 * que es la pregunta, y después lo que no se ve hasta que pasa algo.
 */
export const TELETRABAJO_OBLIGACIONES: readonly TeletrabajoObligacion[] = Object.freeze([
  {
    titular: 'Sin acuerdo, el equipo lo pone la empresa',
    detalle:
      'Cómo se proveen las herramientas se acuerda entre las partes y tiene que constar en el contrato. La norma resuelve el caso en que no se acordó nada: ahí el empleador debe proporcionar los equipos, los insumos y los servicios que el trabajo requiere.',
    articulo: 'Ley 19.978, art. 12 y Decreto 86/022, art. 8',
  },
  {
    titular: 'Y paga lo que cuesta mantenerlo andando',
    detalle:
      'Instalación, operación, funcionamiento, reemplazo y mantenimiento del equipo son costos del empleador. No es lo mismo que la factura del hogar: ver abajo.',
    articulo: 'Decreto 86/022, art. 8',
  },
  {
    titular: 'Lo que te da no es sueldo ni te sube el aporte',
    detalle:
      'Los equipos y servicios que provee el empleador para teletrabajar no se consideran salario ni materia gravada, así que no engrosan la base sobre la que se calculan los aportes a la seguridad social ni el IRPF.',
    articulo: 'Ley 19.978, art. 12',
  },
  {
    titular: 'La seguridad y la ergonomía siguen siendo su problema',
    detalle:
      'Teletrabajar no exime al empleador de controlar las condiciones de salud y seguridad. Los riesgos del teletrabajo —incluidos los psicosociales y los ergonómicos— tienen que estar evaluados dentro del sistema de gestión de la empresa, y si la Inspección General del Trabajo y de la Seguridad Social los pide, el empleador se los informa por escrito.',
    articulo: 'Ley 19.978, art. 11 y Decreto 86/022, art. 7',
  },
  {
    titular: 'Un accidente en tu casa es accidente de trabajo',
    detalle:
      'Los accidentes de trabajo y las enfermedades profesionales del teletrabajador se rigen por la Ley 16.074, la misma que cubre al que trabaja en el local de la empresa: el seguro lo sirve el Banco de Seguros del Estado.',
    articulo: 'Ley 19.978, art. 13',
  },
])

/** Algo que la norma te permite negarte a hacer, o que no te pueden imponer. */
export interface TeletrabajoDerecho {
  derecho: string
  articulo: string
}

export const TELETRABAJO_DERECHOS: readonly TeletrabajoDerecho[] = Object.freeze([
  {
    derecho:
      'No te pueden pasar a teletrabajo sin tu consentimiento, y ese consentimiento tiene que constar por escrito.',
    articulo: 'Ley 19.978, art. 3, lit. A',
  },
  {
    derecho:
      'Durante el tiempo de desconexión, los descansos y la licencia no estás obligado a responder comunicaciones, órdenes ni requerimientos del empleador.',
    articulo: 'Ley 19.978, art. 14 y Decreto 86/022, art. 9',
  },
  {
    derecho: 'No te pueden sancionar por negarte a una tarea dentro del tiempo de desconexión.',
    articulo: 'Decreto 86/022, art. 9',
  },
  {
    derecho:
      'Podés distribuir libremente tu jornada, dentro del horario de funcionamiento de la empresa y de lo que diga el contrato.',
    articulo: 'Ley 19.978, art. 8 y Decreto 86/022, art. 5',
  },
  {
    derecho:
      'El sistema con el que se registren tus horas, si la empresa adopta uno, no puede ser invasivo de tu vida privada y de tu intimidad, y tiene que estar escrito en el acuerdo.',
    articulo: 'Decreto 86/022, art. 6',
  },
  {
    derecho:
      'El lugar desde el que teletrabajás lo fijan las partes, y no podés exigirle al empleador que te lo provea: la contracara es que tampoco se te impone uno.',
    articulo: 'Ley 19.978, art. 6 y Decreto 86/022, art. 3',
  },
])

/** Cada punto que el acuerdo de teletrabajo tiene que decir, según el decreto. */
export const TELETRABAJO_ACUERDO: readonly string[] = Object.freeze([
  'Que la modalidad se pacta en forma voluntaria.',
  'El lugar o los lugares desde donde se teletrabaja, o que podés elegirlo libremente, incluso alternando.',
  'Si hay mezcla de presencial y teletrabajo, cómo se organiza.',
  'Los horarios o las franjas horarias de trabajo.',
  'Los descansos —intermedio, entre jornadas y semanal— y el tiempo de desconexión.',
  'El sistema de registro de asistencia, si la empresa adopta uno.',
  'Cómo se proveen las herramientas informáticas que el trabajo necesita.',
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
      'Lo que la norma dice es menos de lo que se repite afuera, y conviene saberlo antes de reclamar: ni la Ley 19.978 ni el Decreto 86/022 nombran la factura de UTE ni la de internet. Lo que escriben es "servicios". La regla es que la provisión de las herramientas se acuerda entre las partes y queda en el contrato, y que en caso de desacuerdo el empleador debe proporcionar los equipos, los insumos y los servicios que el trabajo requiere (Ley 19.978, art. 12). Lo que sí está escrito con todas las letras son los costos del EQUIPO: instalación, operación, funcionamiento, reemplazo y mantenimiento son del empleador (Decreto 86/022, art. 8). O sea que la respuesta práctica es la misma de todo este régimen: lo que no pactaste por escrito se discute, así que pactalo.',
  },
  {
    question: '¿Cuántas horas de desconexión me corresponden?',
    answer:
      'Ocho continuas entre una jornada y la siguiente, como mínimo. Es un piso del régimen, no algo que se negocie a la baja; lo que se pacta y queda en el acuerdo es el horario concreto en que empieza (Ley 19.978, art. 8; Decreto 86/022, art. 9). Durante ese tiempo, los descansos y la licencia no estás obligado a contestar nada, y no te pueden sancionar por negarte a una tarea en esa franja.',
  },
  {
    question: '¿Me pueden obligar a teletrabajar?',
    answer:
      'No. El teletrabajo es voluntario y el consentimiento del trabajador debe constar por escrito (Ley 19.978, art. 3, lit. A). Pasar de presencial a teletrabajo de manera permanente, o al revés, necesita el común acuerdo de las partes y documentarse por escrito.',
  },
  {
    question: 'Si un día trabajo más horas, ¿son horas extras?',
    answer:
      'No necesariamente, y es la diferencia más importante entre teletrabajar y trabajar en el local. El exceso sobre el límite diario no constituye trabajo extraordinario: se compensa con horas no trabajadas en la misma semana. Lo que sí se paga como extra es lo que pasa del máximo SEMANAL, y el art. 8 de la ley lo escribe con un recargo del 100 % sobre el valor hora de los días hábiles; el decreto, en su art. 5, remite a "los recargos aplicables" del régimen general. El tope semanal que te aplica es el de la actividad de tu empleador, igual que para cualquier trabajador.',
  },
  {
    question: '¿Puedo volver a la oficina si me arrepiento?',
    answer:
      'Depende de cómo empezó. Si tu relación laboral arrancó presencial y después pasaste a teletrabajo, cualquiera de las dos partes puede volver a presencial dentro de los 90 días corridos de iniciado el teletrabajo, avisando por lo menos 7 días corridos antes, por escrito o por medios electrónicos. Si el teletrabajo fue la modalidad acordada desde el inicio, pasar a presencial exige el consentimiento escrito de las dos partes (Ley 19.978, art. 7; Decreto 86/022, art. 4).',
  },
  {
    question: '¿Pueden entrar a mi casa a inspeccionar?',
    answer:
      'No por su cuenta. El lugar de teletrabajo tiene que cumplir la normativa de salud y seguridad, y la Inspección General del Trabajo y de la Seguridad Social puede verificarlo. Si el trabajador no le da acceso a su domicilio, el empleador puede acudir a la IGTSS, que puede solicitar autorización judicial para inspeccionar. Si la inspección encuentra que el lugar no cumple, el teletrabajo queda suspendido hasta que las condiciones se corrijan o se cambie de lugar, sin perjuicio de las sanciones (Decreto 86/022, art. 7).',
  },
  {
    question: '¿Si teletrabajo dos días por semana también me aplica la ley?',
    answer:
      'Sí. El teletrabajo puede ser total o parcial —el decreto lo llama híbrido— y en el caso parcial cuenta cuando las dos partes lo acordaron así (Decreto 86/022, art. 1). Y la regla de jornada del art. 8 de la ley se aplica a todos los días de teletrabajo, sean la modalidad entera o unos pocos días.',
  },
  {
    question: '¿Lo que me da la empresa para teletrabajar me sube los aportes?',
    answer:
      'No. Los equipos y servicios que el empleador provee para teletrabajar no se consideran salario ni materia gravada (Ley 19.978, art. 12), así que no entran en la base sobre la que se calculan los aportes a la seguridad social ni el IRPF. Si querés ver cómo se arma esa base con tu sueldo, está la calculadora de sueldo líquido del sitio.',
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

/** Los plazos expresados en días, para que la página pueda contarlos sin reparsear el texto. */
export function teletrabajoPlazosConNumero(
  plazos: readonly TeletrabajoPlazo[] = TELETRABAJO_PLAZOS
): number {
  return plazos.filter(plazo => /\d/.test(plazo.valor)).length
}

/** Cuántos artículos distintos cita la página. Es la medida de que todo tiene norma detrás. */
export function teletrabajoArticulosCitados(): string[] {
  const fuentes = [
    ...TELETRABAJO_PLAZOS.map(plazo => plazo.articulo),
    ...TELETRABAJO_OBLIGACIONES.map(obligacion => obligacion.articulo),
    ...TELETRABAJO_DERECHOS.map(derecho => derecho.articulo),
  ]
  const articulos = new Set<string>()
  for (const texto of fuentes) {
    for (const match of texto.matchAll(/(Ley 19\.978|Decreto 86\/022|Ley 16\.074), art\. (\d+)/g)) {
      articulos.add(`${match[1]} art. ${match[2]}`)
    }
  }
  return [...articulos].sort()
}
