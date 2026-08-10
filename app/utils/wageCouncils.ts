// app/utils/wageCouncils.ts
// Datos de /cuanto-me-tienen-que-pagar-uruguay: cuál es el mínimo LEGAL de tu categoría y cómo
// encontrarlo, que no es el Salario Mínimo Nacional.
//
// POR QUÉ EXISTE: «cuánto se gana» es el cluster de demanda más grande de todo el corpus (261
// preguntas, 4.372 de engagement), con megahilos anuales de salarios de 456, 298 y 208
// comentarios. Pero esa pregunta, tal como se hace, no tiene respuesta publicable: son
// autorreportes de la comunidad, no un dato.
//
// EL GIRO QUE SÍ ES RESPONDIBLE: no «cuánto se gana en el mercado» sino «cuánto me TIENEN que
// pagar como mínimo». Eso sí es un dato duro, lo fija el Consejo de Salarios de tu grupo y es
// exigible. El sitio ya decía, en la guía del SMN, que «los laudos del grupo y subgrupo pueden
// establecer mínimos superiores» — y nunca decía cómo encontrar el tuyo.
//
// POR QUÉ NO PUBLICAMOS LAS TABLAS DE LAUDOS: son decenas de grupos por subgrupos por categorías,
// y cambian en cada ronda de negociación. Una tabla acá sería dato viejo garantizado. Publicamos
// el MÉTODO y los canales oficiales, que no caducan.
//
// FUENTES, verificadas el 2026-08-10:
//   - MTSS, «Consejos de Salarios y Negociación Colectiva»
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/tematica/consejos-salarios-negociacion-colectiva
//   - MTSS, «Grupos de Industria, Comercio y actividades en general» (el listado de grupos)
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/tematica/grupos-industria-comercio-actividades-general
//   - MTSS, «Consultas laborales y salariales vía web» (el servicio gratuito)
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/consultas-laborales-salariales-via-web

/** Fecha en que la estructura y los canales se contrastaron con el MTSS. */
export const WAGE_VERIFIED_AT = '2026-08-10'

export interface WageSource {
  label: string
  url: string
}

export const WAGE_SOURCES: readonly WageSource[] = Object.freeze([
  {
    label: 'MTSS — Consejos de Salarios y Negociación Colectiva',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/tematica/consejos-salarios-negociacion-colectiva',
  },
  {
    label: 'MTSS — Grupos de Industria, Comercio y actividades en general',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/tematica/grupos-industria-comercio-actividades-general',
  },
  {
    label: 'MTSS — Consultas laborales y salariales vía web (gratis)',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/consultas-laborales-salariales-via-web',
  },
])

/** La confusión de base, y el motivo por el que alguien cobra menos de lo que le corresponde. */
export const WAGE_SMN_IS_NOT_YOUR_MINIMUM =
  'El Salario Mínimo Nacional es un piso para todo el país, no tu mínimo. Si tu actividad está en un Consejo de Salarios —y la mayoría de la actividad privada lo está—, tu mínimo lo fija el laudo de tu grupo, subgrupo y categoría, y casi siempre es superior al SMN. Cobrar el SMN estando en un grupo con laudo más alto no es legal por el hecho de superar el mínimo nacional.'

/** Cómo se estructura la cosa. Sin esto, buscar el laudo propio es imposible. */
export interface WageLayer {
  n: number
  label: string
  detail: string
}

export const WAGE_LAYERS: readonly WageLayer[] = Object.freeze([
  {
    n: 1,
    label: 'Grupo',
    detail:
      'La rama de actividad de la EMPRESA, no tu tarea. Un contador que trabaja en un supermercado está en el grupo del comercio, no en uno de contadores.',
  },
  {
    n: 2,
    label: 'Subgrupo',
    detail:
      'Dentro del grupo, la especialidad. Es donde se separan realidades muy distintas que comparten rama.',
  },
  {
    n: 3,
    label: 'Categoría',
    detail:
      'Tu puesto dentro del subgrupo. Es la línea que finalmente fija tu mínimo, y la que más se discute: estar mal categorizado es cobrar menos de forma legalizada.',
  },
])

/**
 * Los grupos que el MTSS lista bajo «Industria, Comercio y actividades en general».
 * NO es el total de Consejos de Salarios del país: hay otros ámbitos (rural, doméstico) con su
 * propia negociación. No publicamos un total porque no lo verificamos.
 */
export const WAGE_INDUSTRY_GROUPS: readonly string[] = Object.freeze([
  'Procesamiento y conservación de alimentos, bebidas y tabaco',
  'Industria frigorífica',
  'Pesca',
  'Industria textil',
  'Industrias del cuero, vestimenta y calzado',
  'Industria de la madera, celulosa y papel',
  'Industria química, farmacéutica, de combustibles y afines',
  'Industria de productos metálicos, maquinaria y equipo',
  'Industria de la construcción y actividades complementarias',
  'Comercio en general',
])

export interface WageStep {
  n: number
  title: string
  detail: string
  /** Enlace oficial para ese paso, si aplica. */
  url?: string
}

/** El método para encontrar TU mínimo. Es lo que reemplaza a la tabla que no publicamos. */
export const WAGE_LOOKUP_STEPS: readonly WageStep[] = Object.freeze([
  {
    n: 1,
    title: 'Identificá el grupo por la actividad de la empresa',
    detail:
      'Mirá el listado de grupos del MTSS y ubicá la rama de tu empleador. Si la empresa hace varias cosas, manda la actividad principal.',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/tematica/grupos-industria-comercio-actividades-general',
  },
  {
    n: 2,
    title: 'Buscá el último convenio o acta vigente de ese grupo',
    detail:
      'En la página del grupo están los convenios y actas. Interesa el último vigente, porque los mínimos se ajustan en cada ronda.',
  },
  {
    n: 3,
    title: 'Encontrá tu categoría en la tabla',
    detail:
      'El acta trae las categorías con su mínimo. Si no te reconocés en ninguna, ese es el problema a resolver primero: la categoría mal asignada es la forma más común de pagar de menos sin incumplir en apariencia.',
  },
  {
    n: 4,
    title: 'Si no lo encontrás, preguntale al MTSS: es gratis',
    detail:
      'El MTSS tiene un servicio de consulta laboral y salarial por web. Te informa el contenido del acuerdo de tu sector: mínimos, partidas, licencias especiales, beneficios y las fechas de los aumentos.',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/consultas-laborales-salariales-via-web',
  },
])

/** Lo que el laudo fija además del mínimo, y que suele quedar sin reclamar. */
export const WAGE_BEYOND_MINIMUM: readonly string[] = Object.freeze([
  'Las categorías y qué tarea corresponde a cada una.',
  'Partidas y primas del sector: por antigüedad, presentismo, nocturnidad y otras propias de la rama.',
  'Licencias especiales por encima del régimen general.',
  'Beneficios del convenio, como tickets o partidas por alimentación.',
  'Las fechas de los aumentos y el porcentaje de cada ajuste.',
])

export interface WageFaq {
  question: string
  short: string
  answer: string
}

export const WAGE_FAQ: readonly WageFaq[] = Object.freeze([
  {
    question: '¿Cuánto tendría que estar ganando?',
    short: 'Como mínimo, lo que fije el laudo de tu grupo, subgrupo y categoría.',
    answer:
      'La pregunta «cuánto se gana» no tiene una respuesta oficial: los números que circulan en los hilos de salarios son autorreportes, útiles como referencia de mercado pero sin valor legal. La que sí tiene respuesta es «cuánto me tienen que pagar como mínimo», y esa la fija el Consejo de Salarios de tu rama. Es exigible, está publicada y se puede consultar gratis en el MTSS.',
  },
  {
    question: '¿El Salario Mínimo Nacional no es mi mínimo?',
    short: 'No. Es un piso nacional; tu mínimo suele ser más alto.',
    answer:
      'El SMN aplica como piso general, pero si tu actividad tiene Consejo de Salarios, el laudo de tu grupo fija un mínimo propio por categoría que casi siempre lo supera. Que te paguen por encima del SMN no significa que te estén pagando bien: hay que compararlo contra el laudo, no contra el mínimo nacional.',
  },
  {
    question: '¿Cómo sé en qué grupo estoy?',
    short: 'Por la actividad de la empresa, no por tu tarea.',
    answer:
      'El grupo lo determina la rama de actividad del empleador. Un administrativo en una fábrica de alimentos está en el grupo de esa industria, no en uno de administrativos. Si la empresa tiene varias actividades, pesa la principal. En el listado de grupos del MTSS se ubica la rama, y dentro está el subgrupo que corresponda.',
  },
  {
    question: 'Creo que estoy mal categorizado. ¿Importa?',
    short: 'Mucho: es la forma más común de pagar de menos sin aparentar incumplimiento.',
    answer:
      'La categoría es la línea que fija tu mínimo. Si hacés tareas de una categoría superior pero figurás en una inferior, el mínimo que te aplican es más bajo y todo lo demás se calcula sobre eso. Antes de discutir el monto conviene discutir la categoría, porque es la que arrastra el resto.',
  },
  {
    question: '¿Qué más me da el laudo además del mínimo?',
    short: 'Partidas, primas, licencias especiales y las fechas de los aumentos.',
    answer:
      'El acuerdo del sector suele fijar bastante más que un número: las categorías, primas por antigüedad o nocturnidad, licencias especiales por encima del régimen general, beneficios como partidas de alimentación, y el calendario de los ajustes. Es habitual que alguien cobre el mínimo correcto y no esté cobrando una prima que el convenio de su rama le da.',
  },
  {
    question: 'Me pagan menos del laudo. ¿Qué hago?',
    short: 'Primero confirmalo con el MTSS, que asesora gratis, y guardá tus recibos.',
    answer:
      'Antes de reclamar conviene tener el dato firme: consultá el laudo de tu grupo y categoría en el MTSS, que da asesoramiento laboral y salarial gratuito por web. Con eso confirmado y tus recibos de sueldo a mano, el incumplimiento es reclamable. El MTSS es también el organismo donde se plantea.',
  },
])
