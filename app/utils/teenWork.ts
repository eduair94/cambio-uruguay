// Content for `/trabajo-para-menores-de-edad-uruguay`.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so vitest exercises
// it in plain Node and the page only renders it.
//
// WRITING RULE — ASD-STE100 (Simplified Technical English) adapted to Spanish,
// same discipline as `noiseComplaint.ts`. The reader here is often 15 years old
// and needs to act, not to interpret:
//
//   - One idea per sentence. Short sentences.
//   - Active voice, present tense: "El INAU entrega el carné".
//   - ONE word per meaning. Always "carné" (never "permiso" or "habilitación"
//     as synonyms), always "adolescente", "empleador", "jornada".
//   - Steps are numbered and imperative: "Pedí la fecha por teléfono."
//   - No ambiguous pronouns. Repeat the noun.
//
// SOURCING RULE — every figure carries the source that states it. Two honest
// gaps are stated as gaps:
//
//   1. The carné trámite exists for EMPLOYMENT. No equivalent published trámite
//      covers own-account activity (selling things, tutoring), so the page says
//      so instead of inventing a procedure.
//   2. No source consulted states the carné's validity period, so the page does
//      not claim one.

/** An external source backing a claim on the page. */
export interface TeenWorkSource {
  label: string
  url: string
  publisher: string
}

export const TEEN_WORK_SOURCES: readonly TeenWorkSource[] = Object.freeze([
  {
    label: 'Trabajo de niños y adolescentes — edad mínima, jornada, descansos y prohibiciones',
    url: 'https://www.impo.com.uy/trabajo-ninos-y-adolescentes/',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Código de la Niñez y la Adolescencia (Ley 17.823), artículos 161 a 180',
    url: 'https://www.impo.com.uy/bases/codigo-ninez-adolescencia/17823-2004',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Carné laboral del adolescente — documentos, costo y dónde se tramita',
    url: 'https://www.gub.uy/tramites/carne-laboral-adolescente',
    publisher: 'gub.uy — trámites del Estado',
  },
  {
    label: 'Inspección del Trabajo Infantil y Adolescente — contacto y condiciones',
    url: 'https://www.inau.gub.uy/info-institucional-inau/inspeccion-del-trabajo-infantil-y-adolescente',
    publisher: 'INAU',
  },
  {
    label: 'Entre los 15 y los 18 años la habilitación depende del INAU',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/uruguay-prohibido-trabajo-infantil-entre-15-18-anos-habilitacion-depende-del',
    publisher: 'Presidencia de la República',
  },
  {
    label: 'Ley 19.133 de Empleo Juvenil — modalidades y edad mínima de 15 años',
    url: 'https://www.impo.com.uy/bases/leyes/19133-2013',
    publisher: 'IMPO — Centro de Información Oficial',
  },
])

/** Date the norms and procedures were checked against their source. */
export const TEEN_WORK_VERIFIED_AT = '2026-08-17'

/** What the law allows at each age. */
export interface AgeRule {
  age: string
  allowed: string
  condition: string
  sourceIndex: number
}

/**
 * The age ladder.
 *
 * 15 is the floor for ordinary work. The 13-to-15 window exists in the law but
 * it is an exception the INAU authorises case by case, not a right, so the page
 * presents it as such.
 */
export const TEEN_AGE_RULES: readonly AgeRule[] = Object.freeze([
  {
    age: 'Menos de 13 años',
    allowed: 'No podés trabajar',
    condition: 'El trabajo infantil está prohibido.',
    sourceIndex: 4,
  },
  {
    age: '13 y 14 años',
    allowed: 'Solo trabajos ligeros, y solo por excepción',
    condition:
      'El INAU autoriza caso por caso. El trabajo no puede perjudicar tu salud ni tu escolaridad. No es un derecho: es una excepción que el INAU concede.',
    sourceIndex: 0,
  },
  {
    age: '15, 16 y 17 años',
    allowed: 'Podés trabajar con el carné del INAU',
    condition:
      'Necesitás el carné de trabajo y la autorización de tu padre, tu madre o tu tutor. Sin el carné, el empleador no te puede contratar.',
    sourceIndex: 2,
  },
  {
    age: '18 años',
    allowed: 'Trabajás con las reglas de cualquier persona adulta',
    condition: 'El carné del INAU deja de ser necesario.',
    sourceIndex: 4,
  },
])

/** One limit on the working day. */
export interface WorkLimit {
  rule: string
  detail: string
  sourceIndex: number
}

export const TEEN_WORK_LIMITS: readonly WorkLimit[] = Object.freeze([
  {
    rule: 'Máximo 6 horas por día',
    detail: 'Y un máximo de 36 horas por semana.',
    sourceIndex: 0,
  },
  {
    rule: 'Horario diurno: de 6.00 a 22.00',
    detail:
      'El trabajo nocturno, entre las 22.00 y las 6.00, está prohibido. El INAU puede autorizar excepciones.',
    sourceIndex: 0,
  },
  {
    rule: 'Descanso intermedio de 30 minutos a 3 horas',
    detail:
      'Va en la mitad de la jornada. Si el descanso es de 30 minutos, te lo tienen que pagar.',
    sourceIndex: 0,
  },
  {
    rule: '12 horas entre una jornada y la siguiente',
    detail: 'Como mínimo, siempre.',
    sourceIndex: 0,
  },
  {
    rule: 'Un día de descanso por semana',
    detail: 'De preferencia el domingo.',
    sourceIndex: 0,
  },
  {
    rule: 'Sin horarios rotativos durante el año lectivo',
    detail: 'La escuela o el liceo mandan sobre el horario de trabajo.',
    sourceIndex: 0,
  },
  {
    rule: 'De 16 a 18 años, el INAU puede autorizar 8 horas',
    detail:
      'Es una autorización, no la regla general. En ese caso te corresponden 2 días de descanso seguidos cada 5 días trabajados, uno de ellos de preferencia el domingo.',
    sourceIndex: 0,
  },
  {
    rule: 'El sueldo es tuyo',
    detail:
      'Te lo tienen que pagar a vos, en la mano, y vos lo administrás. Nadie más tiene derecho a cobrarlo por vos.',
    sourceIndex: 0,
  },
])

/** A document the carné trámite asks for. */
export interface CarneRequirement {
  item: string
  note: string
}

export const CARNE_REQUIREMENTS: readonly CarneRequirement[] = Object.freeze([
  { item: 'Cédula de identidad vigente y una fotocopia', note: 'La tuya.' },
  {
    item: 'Fotocopia de la cédula de tu padre, tu madre o tu tutor',
    note: 'Esa persona firma la autorización para que trabajes.',
  },
  { item: 'Carné de salud vigente', note: 'El del adolescente.' },
  { item: 'Certificado de vacuna antitetánica', note: '' },
  { item: 'Una foto carné', note: '' },
  {
    item: 'Constancia de estudio',
    note: 'De primaria, secundaria o UTU. Sirve la constancia del último año que cursaste.',
  },
  {
    item: 'Formulario del empleador, completo y firmado',
    note: 'Lo completa la empresa que te va a contratar. Sin empleador no hay formulario.',
  },
])

/** One step of the carné procedure, emitted as HowToStep JSON-LD. */
export interface TeenWorkStep {
  name: string
  text: string
}

export const CARNE_STEPS: readonly TeenWorkStep[] = Object.freeze([
  {
    name: 'Conseguí primero el trabajo',
    text: 'El trámite pide el formulario del empleador. Sin una empresa que te quiera contratar, no podés completar el carné.',
  },
  {
    name: 'Juntá la documentación',
    text: 'Cédula tuya y de tu padre, madre o tutor, carné de salud vigente, vacuna antitetánica, una foto carné y la constancia de estudio.',
  },
  {
    name: 'Pedí fecha por teléfono',
    text: 'En Montevideo llamá al 2402 0604, de lunes a viernes de 9.00 a 16.00, y pedí día y hora. En el interior, contactá la oficina del INAU de tu departamento.',
  },
  {
    name: 'Presentate con todo',
    text: 'En Montevideo el trámite se hace en Fernández Crespo 1796, subsuelo. El trámite es presencial y no tiene costo.',
  },
  {
    name: 'Esperá la resolución',
    text: 'El INAU evalúa la documentación y te notifica lo que resolvió.',
  },
  {
    name: 'Entregá el carné al empleador',
    text: 'Con el carné, la empresa ya te puede registrar. Guardá una copia para vos.',
  },
])

/** A kind of work the law forbids for adolescents. */
export const FORBIDDEN_WORK: readonly string[] = Object.freeze([
  'Trabajo nocturno, entre las 22.00 y las 6.00',
  'Jornadas de más de 6 horas por día',
  'Trabajo en alta mar, en ríos y en medios fluviales',
  'Pesca industrial y pesca artesanal',
  'Venta de armas',
  'Venta de bebidas alcohólicas',
  'Tareas con riesgo químico o biológico',
  'Tareas con riesgo ergonómico',
  'Máquinas y herramientas con elementos de corte',
  'Trabajo en altura',
])

/** A legal route to earn money, with what it requires. */
export interface MoneyRoute {
  title: string
  body: string
  requires: string
  sourceIndex: number
}

/**
 * The routes, ordered by how reachable they are at 15.
 *
 * The last one is deliberately framed as a gap: the carné trámite covers
 * employment, and no source consulted publishes an equivalent procedure for
 * own-account activity. Inventing one would be worse than saying so.
 */
export const MONEY_ROUTES: readonly MoneyRoute[] = Object.freeze([
  {
    title: 'Empleo formal con carné del INAU',
    body: 'Es la vía principal. El comercio y la gastronomía son los rubros donde más se emplea a adolescentes. Trabajás hasta 6 horas por día, en horario diurno, y cobrás tu sueldo vos. La empresa te registra y aportás al BPS, así que ese tiempo cuenta para tu historia laboral.',
    requires: 'Carné del INAU y firma de tu padre, madre o tutor.',
    sourceIndex: 4,
  },
  {
    title: 'Ley de Empleo Juvenil (Ley 19.133)',
    body: 'La ley crea modalidades de contrato pensadas para quien no tiene experiencia, y fija la edad mínima en 15 años. Los contratos son de 20 horas semanales como mínimo y la empresa los registra en la Dirección Nacional de Empleo del MTSS. Si tenés menos de 18 años, igual necesitás el carné del INAU. Preguntá por estas modalidades cuando te presentes: a la empresa le conviene y muchas no las conocen.',
    requires: 'Registrarte en la Dirección Nacional de Empleo del MTSS y tener el carné del INAU.',
    sourceIndex: 5,
  },
  {
    title: 'Trabajo artístico',
    body: 'La ley contempla el trabajo artístico de niños y adolescentes con un régimen propio. Si lo tuyo es la actuación, la música o la publicidad, ese es el marco que te corresponde y no el del empleo común.',
    requires: 'Consultá el régimen específico antes de firmar nada.',
    sourceIndex: 0,
  },
  {
    title: 'Por tu cuenta: changas, clases particulares, vender lo que hacés',
    body: 'Acá hay un hueco real y conviene saberlo. El trámite del carné existe para el empleo, porque pide el formulario de un empleador. Para la actividad por cuenta propia no hay un trámite equivalente publicado. Eso no vuelve ilegal dar clases o vender lo que hacés, pero sí significa que nadie te está controlando la jornada ni el riesgo: los límites de 6 horas, el horario diurno y la lista de trabajos prohibidos son igual tu referencia. Si el ingreso empieza a ser regular y significativo, consultá en el INAU antes de crecer.',
    requires: 'Nada publicado. Usá los límites de arriba como referencia propia.',
    sourceIndex: 3,
  },
])

/** Advice that decides whether the experience is good or bad. */
export interface TeenWorkTip {
  title: string
  body: string
}

export const TEEN_WORK_TIPS: readonly TeenWorkTip[] = Object.freeze([
  {
    title: 'El carné lo pide la ley, no la empresa',
    body: 'Si un empleador te dice que no hace falta el carné, te está proponiendo algo irregular. Las multas al empleador van de 10 a 2.000 unidades reajustables y las cobra el INAU. El que se expone es él, pero el que se queda sin registro de aportes sos vos.',
  },
  {
    title: 'El estudio manda sobre el horario',
    body: 'La ley prohíbe los horarios rotativos durante el año lectivo justamente por esto. Antes de aceptar un horario, ponelo al lado del de tu liceo o tu UTU. Si no entran los dos, no es el trabajo.',
  },
  {
    title: 'Pedí que te expliquen cómo te van a pagar',
    body: 'El sueldo se paga a vos y lo administrás vos. Preguntá el monto, la fecha de pago y si te registran en el BPS. Un trabajo que no te registra no te suma historia laboral.',
  },
  {
    title: 'Revisá la lista de trabajos prohibidos antes de aceptar',
    body: 'No es una lista teórica. Cubre cosas que aparecen en avisos reales: vender bebidas alcohólicas, usar máquinas con elementos de corte, trabajar en altura. Si la tarea está en la lista, ninguna autorización la habilita.',
  },
  {
    title: 'Guardá todo por escrito',
    body: 'Guardá el carné, el formulario del empleador y los recibos de sueldo. Si algo sale mal, esos papeles son la única prueba de que trabajaste y de cuánto.',
  },
  {
    title: 'Si algo no cierra, consultá al INAU',
    body: 'La Inspección del Trabajo Infantil y Adolescente atiende en el 2402 0604 y en insplaboral@inau.gub.uy. Consultar no te hace perder el trabajo: el organismo existe para eso.',
  },
])

/** One question and its answer, emitted as FAQPage JSON-LD. */
export interface TeenWorkFaq {
  q: string
  a: string
}

export const TEEN_WORK_FAQS: readonly TeenWorkFaq[] = Object.freeze([
  {
    q: '¿Puedo trabajar con 15 años en Uruguay?',
    a: 'Sí. La edad mínima para trabajar es 15 años, en empleos públicos o privados y en todos los sectores. Necesitás el carné de trabajo que entrega el INAU y la autorización firmada de tu padre, tu madre o tu tutor. Sin ese carné, el empleador no te puede contratar.',
  },
  {
    q: '¿Cuánto cuesta el carné de trabajo del INAU?',
    a: 'No tiene costo. El trámite es gratuito y presencial. En Montevideo se hace en Fernández Crespo 1796, subsuelo, con fecha pedida antes por teléfono al 2402 0604. En el interior lo hace la oficina del INAU de cada departamento.',
  },
  {
    q: '¿Necesito tener el trabajo antes de sacar el carné?',
    a: 'Sí. Entre los documentos está el formulario del empleador, completo y firmado. Ese formulario lo llena la empresa que te va a contratar, así que primero conseguís el trabajo y después tramitás el carné.',
  },
  {
    q: '¿Cuántas horas puedo trabajar por día?',
    a: 'Hasta 6 horas por día y 36 por semana, en horario diurno de 6.00 a 22.00, con un descanso intermedio de entre 30 minutos y 3 horas en la mitad de la jornada. Si el descanso es de 30 minutos, te lo tienen que pagar. Entre 16 y 18 años el INAU puede autorizar 8 horas diarias, pero es una autorización y no la regla.',
  },
  {
    q: '¿Puedo trabajar de noche?',
    a: 'No. El trabajo nocturno, entre las 22.00 y las 6.00, está prohibido para adolescentes. El INAU puede autorizar excepciones considerando el interés superior del adolescente, pero la regla es que no.',
  },
  {
    q: '¿Qué trabajos no puedo hacer?',
    a: 'El INAU tiene una lista de trabajos peligrosos que están prohibidos. Incluye el trabajo en alta mar y en ríos, la pesca industrial y artesanal, la venta de armas, la venta de bebidas alcohólicas, las tareas con riesgo químico, biológico o ergonómico, las máquinas con elementos de corte y el trabajo en altura. Ninguna autorización habilita una tarea de esa lista.',
  },
  {
    q: '¿A quién le pagan mi sueldo?',
    a: 'A vos. El adolescente tiene el derecho exclusivo de administrar su salario y el pago se le hace directamente. Nadie más tiene derecho a cobrarlo en tu lugar.',
  },
  {
    q: '¿Puedo trabajar con 13 o 14 años?',
    a: 'Solo por excepción y solo en trabajos ligeros que no perjudiquen tu salud ni tu escolaridad. Lo autoriza el INAU caso por caso, por sí mismo o a pedido de tus padres o tutores. No es un derecho general: la regla es que la edad mínima son 15 años.',
  },
  {
    q: '¿Y si quiero ganar plata por mi cuenta, sin un empleador?',
    a: 'El trámite del carné está pensado para el empleo: pide el formulario de un empleador. Para la actividad por cuenta propia no hay un trámite equivalente publicado. Dar clases particulares o vender lo que hacés no es ilegal, pero tampoco hay nadie controlando tu jornada ni tu seguridad, así que los límites de 6 horas, el horario diurno y la lista de trabajos prohibidos siguen siendo tu referencia.',
  },
  {
    q: '¿Qué pasa si trabajo sin carné?',
    a: 'El que se expone a la sanción es el empleador: las multas van de 10 a 2.000 unidades reajustables y las aplica y cobra el INAU. El problema para vos es otro: un trabajo irregular no te registra aportes, no te suma historia laboral y te deja sin respaldo si te accidentás o si no te pagan.',
  },
])
