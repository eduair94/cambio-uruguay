// Contenido de `/carne-de-manipulacion-de-alimentos-uruguay`.
//
// Módulo PURO (sin runtime de Vue/Nuxt, imports relativos) para que vitest lo
// ejecute en Node y la página sólo lo renderice.
//
// POR QUÉ ESTA PÁGINA
//
// «Carné de manipulación de alimentos» se busca como un precio y como un plazo
// («cuánto sale», «cuánto dura», «dónde lo hago»), y afuera se contesta con una
// sola cifra. No hay una sola cifra: el carné NO es nacional. El Reglamento
// Bromatológico Nacional (Decreto 315/994) exige otra cosa —el carné de SALUD,
// apartado 5.5.1— y pone la capacitación a cargo del titular de la empresa
// (5.5.2); la palabra «carné de manipulación» no aparece en todo su texto
// consolidado. El carné lo crea, lo cobra y lo fecha cada intendencia, y por eso
// el mismo documento no se cobra en Montevideo ni en Rivera y sale $ 962 en
// Salto, y vale 5 años en Montevideo y 3 en Canelones.
//
// Esa es la respuesta que ninguna página contestaba y la razón de que esta
// exista: la pregunta no tiene respuesta nacional, tiene DIECINUEVE, y lo útil
// es saber cuál te toca.
//
// REGLA DE FUENTES — cada importe, cada plazo y cada requisito sale de una
// fuente oficial del departamento (la ficha del trámite en gub.uy o en el portal
// de la intendencia, o una noticia publicada por la propia intendencia), con su
// URL, con la fecha que la propia fuente declara y con la frase textual que lo
// dice (`quotes`). Cuatro huecos se declaran como huecos en lugar de rellenarse:
//
//   1. Maldonado, Lavalleja, Flores y Rivera NO publican la vigencia del carné.
//      Acá dice «no la publica», no «3 años» por analogía con las otras.
//   2. Florida publica «una tasa por gestión» sin importe. No se estima.
//   3. Canelones expresa su costo en «U.R. Municipal» y aclara que se ajusta
//      semestralmente. No se convierte a pesos con la UR del INE: la fuente no
//      dice que sean la misma unidad y suponerlo sería inventar un importe.
//   4. Nueve departamentos no tienen fuente en esta tabla. Figuran por nombre,
//      no como «gratis» ni con el promedio de los demás, y la página no dice que
//      no publiquen nada: San José y Salto no aparecieron en el catálogo de
//      gub.uy y sí publican el importe en el sitio de su intendencia, así que a
//      otro puede pasarle lo mismo.
//
// Y una regla de redacción: un «es el único» se dice SÓLO dentro de esta tabla
// («de las fuentes de esta tabla»), porque de nueve departamentos no se sabe.

/** Una fuente oficial que respalda una afirmación de la página. */
export interface FoodHandlerSource {
  label: string
  url: string
  publisher: string
}

/**
 * El orden es el de autoridad: primero la norma nacional que fija lo que SÍ es
 * nacional, después las fuentes departamentales que fijan lo que no lo es.
 */
export const FOOD_HANDLER_SOURCES: readonly FoodHandlerSource[] = Object.freeze([
  {
    label:
      'Reglamento Bromatológico Nacional (Decreto 315/994), capítulo 5, sección 5 — «Personal que manipula alimentos»',
    url: 'https://www.impo.com.uy/bases/decretos-reglamento/315-1994/5',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label:
      'Decreto 415/002 — modificación del apartado 5.5.1 del Reglamento Bromatológico Nacional',
    url: 'https://www.impo.com.uy/bases/decretos/415-2002',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label:
      'Certificado de Habilitación en Manipulación de Alimentos — Montevideo: costo, vigencia y las cinco categorías',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/certificado-de-habilitacion-en-manipulacion-de-alimentos',
    publisher: 'Intendencia de Montevideo — Portal de trámites',
  },
  {
    label: 'Carné de manipulador de alimentos — Canelones: costos por vía y vigencia',
    url: 'https://www.gub.uy/tramites/carne-manipulador-alimentos-canelones',
    publisher: 'gub.uy — trámites del Estado',
  },
  {
    label: 'Carné de manipulador de alimentos — Paysandú: primera vez, renovación y vigencia',
    url: 'https://www.gub.uy/tramites/carne-manipulador-alimentos-paysandu',
    publisher: 'gub.uy — trámites del Estado',
  },
  {
    label: 'Carné de Manipulación de Alimentos — Maldonado: costo, prueba y agenda',
    url: 'https://www.gub.uy/tramites/carne-manipulacion-alimentos-maldonado',
    publisher: 'gub.uy — trámites del Estado',
  },
  {
    label: 'Carné manipulación de alimentos — Lavalleja: costo, requisitos y revisación médica',
    url: 'https://www.gub.uy/tramites/carne-manipulacion-alimentos-lavalleja',
    publisher: 'gub.uy — trámites del Estado',
  },
  {
    label: 'Carné de manipulación de alimentos — Florida: requisitos y vigencia',
    url: 'https://www.gub.uy/tramites/carne-manipulacion-alimentos-florida',
    publisher: 'gub.uy — trámites del Estado',
  },
  {
    label: 'Carné de Manipulador — Flores: costo y tiempo de respuesta',
    url: 'https://flores.gub.uy/carne-de-manipulador',
    publisher: 'Intendencia de Flores',
  },
  {
    label: 'Inscripción al curso de manipulación de alimentos — Rivera: costo, requisitos y dónde',
    url: 'https://www.gub.uy/tramites/inscripcion-curso-manipulacion-alimentos-rivera',
    publisher: 'gub.uy — trámites del Estado',
  },
  {
    label:
      'Cronograma para tramitar carné de manipulación de alimentos en noviembre — San José: costo, validez y requisitos',
    url: 'https://sanjose.gub.uy/2026-10-26manipulacion-alimentos/',
    publisher: 'Intendencia de San José',
  },
  {
    label:
      'Curso de Manipulación de Alimentos: inscripciones abiertas en la app Gobierno de Salto — timbre y validez',
    url: 'https://www.salto.gub.uy/noticias/curso-de-manipulacion-de-alimentos-este-miercoles-inscripciones-abiertas-en-la-app',
    publisher: 'Intendencia de Salto',
  },
])

/**
 * Fecha en que se leyó cada fuente.
 *
 * No es lo mismo que la fecha que declara cada fuente (`updatedAt`): una ficha
 * puede llevar dos años sin tocarse y seguir siendo lo vigente. Las dos se
 * publican.
 */
export const FOOD_HANDLER_CHECKED_AT = '2026-11-20'

/** Cómo está expresado el importe en la fuente oficial. Nunca se traduce entre sí. */
export type FoodHandlerCostKind =
  /** Gratis: la fuente dice expresamente que no tiene costo. */
  | 'sin-costo'
  /** Un importe en pesos uruguayos. */
  | 'pesos'
  /** Un importe en Unidades Reajustables, tal como lo publica la fuente. */
  | 'ur'
  /** La fuente menciona que se paga una tasa pero no publica el importe. */
  | 'sin-importe'

/** Por dónde se hace el trámite, según lo que publica la fuente. */
export type FoodHandlerChannel = 'en-linea' | 'presencial' | 'mixto'

/**
 * Qué clase de publicación es la fuente. Una ficha de trámite describe el
 * trámite vigente y declara su última actualización; una noticia anuncia un
 * curso concreto y lleva la fecha en que se publicó.
 */
export type FoodHandlerSourceKind = 'ficha' | 'noticia'

/** Lo que publica la fuente oficial del trámite de un departamento. */
export interface FoodHandlerDepartment {
  /** Nombre del departamento tal como se escribe en prosa. */
  department: string
  /** Cómo llama la intendencia al documento o al trámite (no todas lo llaman igual). */
  documentName: string
  costKind: FoodHandlerCostKind
  /** El costo tal como lo publica la fuente, listo para imprimir. */
  cost: string
  /**
   * El importe en pesos, SÓLO cuando la fuente lo publica en pesos (0 incluido).
   * `null` para las que cobran en UR o no publican importe: no se convierte.
   */
  costPesos: number | null
  /** Años de vigencia que declara la fuente, o `null` si no la declara. */
  validityYears: number | null
  channel: FoodHandlerChannel
  /** Lo que esta fuente tiene de propio y cambia la decisión de quien la lee. */
  note: string
  /** Índice en {@link FOOD_HANDLER_SOURCES}. */
  sourceIndex: number
  sourceKind: FoodHandlerSourceKind
  /**
   * La fecha que declara la fuente: la última actualización de una ficha o la
   * publicación de una noticia. `null` si no publica ninguna.
   */
  updatedAt: string | null
  /** Las frases textuales de la fuente que respaldan el costo y la vigencia. */
  quotes: readonly string[]
}

/**
 * Los diez departamentos con una fuente oficial que publica el trámite.
 *
 * Ordenados por costo creciente en pesos y después por nombre, que es el orden
 * en que la pregunta se contesta: lo primero que se quiere saber es dónde sale
 * menos. Los importes en UR van después de los pesos porque no son comparables
 * sin inventar una conversión, y la tasa sin importe va al final.
 */
export const FOOD_HANDLER_DEPARTMENTS: readonly FoodHandlerDepartment[] = Object.freeze([
  {
    department: 'Montevideo',
    documentName: 'Certificado de Habilitación en Manipulación de Alimentos',
    costKind: 'sin-costo',
    cost: 'No tiene costo',
    costPesos: 0,
    validityYears: 5,
    channel: 'en-linea',
    note: 'Curso y examen 100 % en línea, en cinco categorías: operario, decisor, transportista, delivery y libre de gluten. El acceso al curso llega aproximadamente a los 15 días hábiles de inscribirse, el curso queda abierto 3 meses y el certificado demora otros 15 días hábiles.',
    sourceIndex: 2,
    sourceKind: 'ficha',
    updatedAt: '2026-10-09',
    quotes: ['No tiene costo', 'La vigencia del carné es de 5 años'],
  },
  {
    department: 'Rivera',
    documentName: 'Inscripción al curso de manipulación de alimentos',
    costKind: 'sin-costo',
    cost: 'No tiene costo',
    costPesos: 0,
    validityYears: null,
    channel: 'presencial',
    note: 'La ficha es la de inscripción al curso, que es el trámite para obtener el carné en Rivera. Se hace en persona en la División Empresas de la Intendencia, de lunes a viernes de 7 a 14; quien no puede ir puede inscribirse mandando nombre, cédula y teléfono a empresas@rivera.gub.uy. Pide cédula, teléfono y foto carné. La ficha no publica vigencia.',
    sourceIndex: 9,
    sourceKind: 'ficha',
    updatedAt: '2026-04-14',
    quotes: [
      'Es el trámite que debe realizar cualquier persona que requiera o desee obtener el carné de Manipulador de Alimentos dentro del Departamento de Rivera.',
      'No tiene costo',
    ],
  },
  {
    department: 'Flores',
    documentName: 'Carné de Manipulador',
    costKind: 'pesos',
    cost: '$ 100',
    costPesos: 100,
    validityYears: null,
    channel: 'presencial',
    note: 'Hay que concurrir al curso que dicta la Oficina de Bromatología; el carné se entrega 24 horas después. La ficha no publica vigencia ni fecha de actualización.',
    sourceIndex: 8,
    sourceKind: 'ficha',
    updatedAt: null,
    quotes: ['Costo del Carné $ 100', '24 horas después de dictado el curso.'],
  },
  {
    department: 'San José',
    documentName: 'Carné de manipulación de alimentos',
    costKind: 'pesos',
    cost: '$ 623',
    costPesos: 623,
    validityYears: 3,
    channel: 'presencial',
    note: 'Inscripción en persona en la Dirección General de Gestión Ambiental y Salud (San José de Mayo), en los municipios de Rodríguez y Libertad o en las oficinas de Ciudad del Plata y Ecilda Paullier, con fotocopia de cédula y de carné de salud y foto carné a color. Se paga al inscribirse; después de una charla se rinde una prueba escrita y el carné se entrega en el momento. Quien no la salva puede repetirla hasta dos veces sin volver a pagar. La fuente es la noticia de la intendencia con el cronograma de noviembre de 2026.',
    sourceIndex: 10,
    sourceKind: 'noticia',
    updatedAt: '2026-10-26',
    quotes: [
      'El costo es de $623, los que deberán abonarse en el momento de la inscripción.',
      'La validez del carné es de tres años.',
      'Se deberá presentar fotocopia de cédula de identidad, fotocopia de carné de salud y foto tipo carné (actualizada y a color).',
    ],
  },
  {
    department: 'Paysandú',
    documentName: 'Carné de manipulador de alimentos',
    costKind: 'pesos',
    cost: '$ 850 la primera vez, $ 300 la renovación',
    costPesos: 850,
    validityYears: 3,
    channel: 'presencial',
    note: 'El pago se gestiona con la Agencia de Desarrollo Paysandú, que también agenda la capacitación y la prueba. De las fuentes de esta tabla, es la única con un precio de renovación distinto al de la primera vez.',
    sourceIndex: 4,
    sourceKind: 'ficha',
    updatedAt: '2026-11-04',
    quotes: ['El carné tiene una vigencia de 3 años.', 'Primera vez: $850', 'Renovación: $300'],
  },
  {
    department: 'Salto',
    documentName: 'Curso de Manipulación de Alimentos',
    costKind: 'pesos',
    cost: 'Un timbre de $ 962',
    costPesos: 962,
    validityYears: 5,
    channel: 'mixto',
    note: 'La inscripción se hace sólo por la app Gobierno de Salto, con el timbre comprado antes en redes de cobranza o en la misma app; el curso es presencial y el timbre se presenta ese día. Los cupos son limitados. La fuente es una noticia de la intendencia sobre el curso del 29 de abril de 2026, no una ficha de trámite: confirmá el importe antes de comprar el timbre.',
    sourceIndex: 11,
    sourceKind: 'noticia',
    updatedAt: '2026-04-27',
    quotes: [
      'un timbre con un valor de $962 (pesos uruguayos)',
      'otorga un carné con validez de cinco años a quienes completen la formación',
    ],
  },
  {
    department: 'Maldonado',
    documentName: 'Carné de Manipulación de Alimentos',
    costKind: 'ur',
    cost: '0,1 UR',
    costPesos: null,
    validityYears: null,
    channel: 'presencial',
    note: 'Se paga antes de agendarse. La prueba son 30 preguntas de sí o no y se aprueba con 25 correctas; si no se aprueba hay que iniciar un trámite nuevo y pagar el carné de nuevo. Desde los 15 años. La ficha no publica vigencia.',
    sourceIndex: 5,
    sourceKind: 'ficha',
    updatedAt: '2026-01-02',
    quotes: ['0.1 U.R.', 'Para aprobar, debe tener un mínimo de 25 respuestas correctas.'],
  },
  {
    department: 'Lavalleja',
    documentName: 'Carné manipulación de alimentos',
    costKind: 'ur',
    cost: '0,28 UR',
    costPesos: null,
    validityYears: null,
    channel: 'presencial',
    note: 'Pide carné de salud vigente y foto carné, y después de aprobar la prueba hay que agendar una revisación médica que certifique que no hay lesiones o infecciones en piel y ojos; ese día hay que ir sin esmalte en las uñas. De las fuentes de esta tabla, es la única que agrega una revisación médica. La ficha no publica vigencia.',
    sourceIndex: 6,
    sourceKind: 'ficha',
    updatedAt: '2026-07-28',
    quotes: [
      '0.28 U.R.',
      'Carné de salud vigente.',
      'deberá agendarse a la revisión médica para certificar que no hay lesiones o infecciones en piel y ojos.',
    ],
  },
  {
    department: 'Canelones',
    documentName: 'Carné de manipulador de alimentos',
    costKind: 'ur',
    cost: '½ UR el trámite web y el mixto, 1 UR el urgente',
    costPesos: null,
    validityYears: 3,
    channel: 'mixto',
    note: 'Se arranca por internet y se paga en Abitab o Redpagos; después llega el acceso a la plataforma para estudiar y rendir. El urgente sólo en la ciudad de Canelones. La ficha habla de «U.R. Municipal» y aclara que se ajusta semestralmente, así que acá no se convierte a pesos.',
    sourceIndex: 3,
    sourceKind: 'ficha',
    updatedAt: '2026-11-17',
    quotes: [
      'Trámite web 1/2 U.R. Trámite mixto 1/2 U.R. Trámite urgente 1 U.R. La U.R. Municipal se ajusta semestralmente.',
      'El carné tiene una vigencia de 3 años.',
    ],
  },
  {
    department: 'Florida',
    documentName: 'Carné de manipulación de alimentos',
    costKind: 'sin-importe',
    cost: 'Una tasa por gestión, sin importe publicado',
    costPesos: null,
    validityYears: 3,
    channel: 'presencial',
    note: 'Se paga primero en la sección de tributos de la Intendencia o en las cajas de los municipios, y recién después se pide fecha para la prueba en el Laboratorio de Bromatología, los municipios o las juntas locales. La ficha nombra la tasa pero no publica cuánto es.',
    sourceIndex: 7,
    sourceKind: 'ficha',
    updatedAt: '2024-05-27',
    quotes: ['Una tasa por gestión', 'El carnet habilitante tendrá una vigencia de 3 años.'],
  },
])

/**
 * Los nueve departamentos que también emiten el carné pero para los que esta
 * tabla no tiene una fuente oficial con importe y plazo al
 * {@link FOOD_HANDLER_CHECKED_AT}.
 *
 * Se publican por nombre y nada más. No llevan importe porque no hay ninguno
 * leído que copiar, y ponerles el de un vecino sería inventarlo.
 */
export const FOOD_HANDLER_WITHOUT_SHEET: readonly string[] = Object.freeze([
  'Artigas',
  'Cerro Largo',
  'Colonia',
  'Durazno',
  'Río Negro',
  'Rocha',
  'Soriano',
  'Tacuarembó',
  'Treinta y Tres',
])

/** Los 19 departamentos del país: los que tienen fuente en la tabla más los que no. */
export const FOOD_HANDLER_TOTAL_DEPARTMENTS =
  FOOD_HANDLER_DEPARTMENTS.length + FOOD_HANDLER_WITHOUT_SHEET.length

/** Una regla nacional, con la transcripción literal del apartado que la dice. */
export interface FoodHandlerNationalRule {
  headline: string
  detail: string
  /** Transcripción textual del Reglamento Bromatológico Nacional. */
  quote: string
  article: string
  sourceIndex: number
}

export const FOOD_HANDLER_NATIONAL_RULES: readonly FoodHandlerNationalRule[] = Object.freeze([
  {
    headline: 'Lo nacional es el carné de SALUD, no el de manipulación',
    detail:
      'El Reglamento Bromatológico Nacional exige a todo el personal de una empresa alimentaria un carné de salud vigente, y hay que mostrarlo cuando lo pidan. Ese es el documento que exige una norma del país; el de manipulación lo exige cada intendencia.',
    quote:
      'El personal de todas las empresas alimentarias, sin excepción, cualquiera sea la función que desempeñe, deberá poseer carné de salud en vigencia expedido por las oficinas municipales correspondientes o por el Ministerio de Salud Pública. El referido documento se exhibirá a los funcionarios competentes toda vez que sea solicitado.',
    article: 'Apartado 5.5.1, en la redacción dada por el Decreto 415/002',
    sourceIndex: 0,
  },
  {
    headline: 'La capacitación es responsabilidad del empleador',
    detail:
      'La norma nacional no le manda al trabajador sacarse un carné: le manda a la empresa instruir a su gente. El carné departamental es la forma que cada intendencia eligió para controlar que eso pasó.',
    quote:
      'En toda empresa elaboradora de alimentos se instruirá al personal afectado a la manipulación, a fin de obtener su capacitación desde el punto de vista tecnológico e higiénico. Esta tarea será de responsabilidad del titular de la empresa.',
    article: 'Apartado 5.5.2',
    sourceIndex: 0,
  },
  {
    headline: 'Una lesión en la piel o en los ojos te deja afuera, aunque no contagie',
    detail:
      'Es la regla que explica por qué Lavalleja agrega una revisación médica al trámite y por qué el carné de salud se puede suspender: el apartado siguiente deja a las oficinas bromatológicas exigir exámenes médicos y, mientras tanto, el carné de salud queda en suspenso.',
    quote:
      '5.5.4. Las personas que padezcan enfermedades o lesiones de la piel o de los ojos, no podrán intervenir en ningún proceso de elaboración, envasado, distribución o comercio de alimentos aunque aquellas no sean de naturaleza infecciosa. 5.5.5. Sin perjuicio de lo establecido en el artículo anterior, las Oficinas Bromatológicas competentes podrán exigir que cualquier persona afectada a las actividades de las empresas alimentarias se someta a los exámenes médicos que se estime necesarios, en cuyo caso quedará en suspenso la vigencia del carné de salud respectivo.',
    article: 'Apartados 5.5.4 y 5.5.5',
    sourceIndex: 0,
  },
])

export interface FoodHandlerFaq {
  q: string
  a: string
}

export const FOOD_HANDLER_FAQS: readonly FoodHandlerFaq[] = Object.freeze([
  {
    q: '¿El carné de manipulación de alimentos vale en todo el país?',
    a: 'No hay una norma nacional que lo diga. Lo emite cada intendencia para su departamento y cada una fija su costo, su vigencia y su forma de evaluarlo; el documento que sí exige una norma nacional para todo el país es el carné de salud (Reglamento Bromatológico Nacional, apartado 5.5.1). Si trabajás en otro departamento, preguntá en esa intendencia antes de dar por hecho que te lo aceptan.',
  },
  {
    q: '¿Cuánto sale el carné de manipulación de alimentos?',
    a: 'Depende del departamento, y la diferencia es grande: Montevideo y Rivera no cobran nada, Flores publica $ 100, San José $ 623, Paysandú $ 850 la primera vez (con renovación a $ 300) y Salto un timbre de $ 962. Maldonado cobra 0,1 UR, Lavalleja 0,28 UR y Canelones ½ UR el trámite web. Florida dice que se paga una tasa pero no publica el importe. Para los otros nueve departamentos no hay importe en esta página: hay que preguntarlo en la intendencia.',
  },
  {
    q: '¿Cuánto dura?',
    a: 'Montevideo y Salto lo dan por 5 años. Canelones, Florida, Paysandú y San José lo dan por 3. Maldonado, Lavalleja, Flores y Rivera no publican la vigencia, así que vale la fecha impresa en tu carné.',
  },
  {
    q: '¿Se puede hacer por internet?',
    a: 'En Montevideo sí: el curso y la prueba son 100 % en línea y autogestionados, en cinco categorías (operario, decisor, transportista, delivery y libre de gluten). Canelones arranca por internet pero el pago va por red de cobranza. En Salto la inscripción es sólo por la app Gobierno de Salto y el curso es presencial, y en Rivera, si no podés ir, te podés inscribir por correo. Las demás fuentes de esta tabla describen un trámite presencial.',
  },
  {
    q: '¿Es lo mismo que el carné de salud?',
    a: 'No, y hay que tener los dos. El carné de salud lo exige el Reglamento Bromatológico Nacional a todo el personal de cualquier empresa alimentaria; el de manipulación acredita capacitación en inocuidad y lo da la intendencia. Lavalleja, de hecho, pide el carné de salud vigente para empezar el trámite del de manipulación, y San José pide una fotocopia del carné de salud para inscribirse.',
  },
  {
    q: 'Tengo un almacén con dos empleados, ¿tengo que presentar un plan de capacitación?',
    a: 'En Montevideo, no. Las empresas alimentarias deben acreditar cada 2 años la capacitación de su personal ante el Servicio de Regulación Alimentaria, pero los rubros almacén, quioscos, salones, bares y pubs, y toda empresa con menos de 5 personas empleadas, quedan exonerados de presentar el plan según la Resolución 4506/21. El carné de cada persona se sigue exigiendo igual.',
  },
])

export interface FoodHandlerRelated {
  to: string
  label: string
}

export const FOOD_HANDLER_RELATED: readonly FoodHandlerRelated[] = Object.freeze([
  { to: '/carne-de-salud-uruguay', label: 'Carné de salud: cuándo es gratis' },
  { to: '/libreta-de-conducir-uruguay', label: 'Libreta de conducir: cuánto sale' },
  { to: '/que-empresa-abrir-uruguay', label: 'Qué empresa abrir en Uruguay' },
  { to: '/cuanto-me-tienen-que-pagar-uruguay', label: 'Cuánto te tienen que pagar' },
  { to: '/denunciar-trabajo-en-negro-uruguay', label: 'Denunciar trabajo en negro' },
])

/** Etiqueta en prosa de la vía del trámite. */
export function foodHandlerChannelLabel(channel: FoodHandlerChannel): string {
  if (channel === 'en-linea') return 'En línea'
  if (channel === 'mixto') return 'En línea y presencial'
  return 'Presencial'
}

/** Lo que imprime la celda de vigencia: el plazo, o que la fuente no lo publica. */
export function foodHandlerValidityLabel(years: number | null): string {
  if (years === null) return 'No la publica'
  return years === 1 ? '1 año' : `${years} años`
}

/** Cómo se nombra la fuente y su fecha en la tabla. */
export function foodHandlerSourceLabel(kind: FoodHandlerSourceKind): {
  link: string
  dated: string
} {
  if (kind === 'noticia') return { link: 'Noticia oficial', dated: 'publicada el' }
  return { link: 'Ficha oficial', dated: 'actualizada el' }
}

/**
 * El importe en pesos más bajo y más alto de los que SE PUBLICAN en pesos.
 *
 * Sólo mira `costPesos`, o sea que las fuentes en UR y la que no publica importe
 * quedan fuera a propósito: meterlas exigiría una conversión que ninguna fuente
 * respalda. Por lo mismo, NO es un rango nacional (Canelones cobra 1 UR el
 * urgente y nueve departamentos no están) y el título no lo publica como tal.
 * Devuelve `null` si ninguna fuente publica pesos.
 */
export function foodHandlerPesoRange(
  departments: readonly FoodHandlerDepartment[] = FOOD_HANDLER_DEPARTMENTS
): { min: number; max: number } | null {
  const amounts = departments
    .map(row => row.costPesos)
    .filter((amount): amount is number => amount !== null)
  if (amounts.length === 0) return null
  return { min: Math.min(...amounts), max: Math.max(...amounts) }
}

/** Las vigencias distintas que las fuentes declaran, de menor a mayor. */
export function foodHandlerValidityYears(
  departments: readonly FoodHandlerDepartment[] = FOOD_HANDLER_DEPARTMENTS
): number[] {
  const years = departments
    .map(row => row.validityYears)
    .filter((value): value is number => value !== null)
  return [...new Set(years)].sort((a, b) => a - b)
}

/** Qué fuentes no declaran vigencia. Es un hueco, y la página lo dice. */
export function foodHandlerWithoutValidity(
  departments: readonly FoodHandlerDepartment[] = FOOD_HANDLER_DEPARTMENTS
): string[] {
  return departments.filter(row => row.validityYears === null).map(row => row.department)
}

/** Los departamentos que no cobran nada, según su fuente. */
export function foodHandlerFree(
  departments: readonly FoodHandlerDepartment[] = FOOD_HANDLER_DEPARTMENTS
): string[] {
  return departments.filter(row => row.costKind === 'sin-costo').map(row => row.department)
}
