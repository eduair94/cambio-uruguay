// app/utils/domesticWork.ts
// /trabajo-domestico-uruguay: trabajar en casa de familia, de los dos lados del mostrador.
// Qué se paga por categoría, qué dice la ley propia del sector y cómo se registra en BPS.
//
// POR QUÉ EXISTE: el sitio tenía el tema repartido en pedazos y ninguno contestaba la pregunta
// entera. `utils/despido.ts` traía la antigüedad mínima (y la traía MAL, ver abajo),
// `unemploymentBenefit.ts` el seguro de paro del sector, `stateSupport.ts` la asignación familiar,
// y la guía /guias/despido-y-liquidacion-uruguay tiene una sección larga y bien documentada sobre
// la jornada y los descansos — enterrada en una página de despido, donde quien busca «cómo
// registro a la empleada en BPS» o «cuánto hay que pagarle» no la encuentra nunca. Esto es la
// intención propia: contratar, liquidar y registrar.
//
// LA CORRECCIÓN QUE SALIÓ DE ACÁ: `utils/despido.ts` publicaba «el servicio doméstico necesita un
// año continuado» citando la Ley 12.597, art. 7 (1958). La ley propia del sector la dejó sin
// efecto: la Ley 18.065, art. 7 (2006) da derecho a indemnización «desde los noventa días
// corridos de iniciada la relación laboral». Se corrigió en el mismo commit que publica esta
// página, y `tests/unit/despido.test.ts` lo ata.
//
// LO QUE DELIBERADAMENTE NO PUBLICA: el salario vacacional del sector. El MTSS lo enuncia en una
// redacción que no se pudo leer sin ambigüedad, y la regla del repo es que una cifra sin fuente
// inequívoca no se publica. El régimen general vive en `utils/salarioVacacional.ts` y la página
// enlaza ahí.
//
// POR QUÉ LOS MONTOS SÍ VAN, con ventana: el laudo del Grupo 21 se renegocia por rondas y se
// ajusta más de una vez al año, así que un número sin fecha envejece mal. Pero éstos los publica
// BPS con su período de vigencia escrito (1/7/2026 al 31/12/2026), así que van con la ventana y la
// fuente, y la página dice en voz alta que el día que liquidás se mira BPS. El error a evitar es
// el contrario: la tabla de la creación de las categorías (Comunicado 12/2026) está expresada «al
// 30/6/2026» y es la BASE, no lo vigente — General $ 31.178 ahí contra $ 32.051 desde julio.
//
// PURO: sin Vue ni Nuxt, para que lo carguen la página y vitest.

/** Fecha en que cada cifra y cada cita de este módulo se contrastó con las fuentes de abajo. */
export const DOMESTIC_WORK_VERIFIED_AT = '2026-10-06'

export const DOMESTIC_WORK_PATH = '/trabajo-domestico-uruguay'

export interface DomesticSource {
  readonly label: string
  readonly url: string
}

/**
 * FUENTES PRIMARIAS. Sólo impo.com.uy (normativa) y gub.uy / bps.gub.uy (el organismo que
 * liquida). Un test verifica que no se cuele ninguna otra.
 */
export const DOMESTIC_WORK_SOURCES: readonly DomesticSource[] = Object.freeze([
  {
    label:
      'Ley 18.065 (05/12/2006) — ley del trabajo doméstico: jornada de 8 horas y 44 semanales (art. 2), descansos (arts. 3 a 5), Consejos de Salarios (art. 6), indemnización por despido desde los 90 días corridos (art. 7), seguro de paro (art. 9), edad mínima de 18 años (art. 11) e inspección domiciliaria con orden judicial (art. 13)',
    url: 'https://www.impo.com.uy/bases/leyes/18065-2006',
  },
  {
    label:
      'Ley 18.065, art. 7 — «tendrán derecho a indemnización por despido desde los noventa días corridos de iniciada la relación laboral»',
    url: 'https://www.impo.com.uy/bases/leyes/18065-2006/7',
  },
  {
    label:
      'BPS, Comunicado 12/2026 — creación de las tres categorías laborales del sector (acta del consejo de salarios del 5 de diciembre de 2025), la definición de cada una, la regla del «50 % más una hora» y los aspectos operativos del cambio de categoría',
    url: 'https://www.bps.gub.uy/bps/file/24278/1/2026---comunicado-12---trabajo-domestico---creacion-de-categorias-laborales-julio-2026.pdf',
  },
  {
    label:
      'BPS, «Nuevas categorías laborales para trabajo doméstico» — vigencia desde el 1.º de julio de 2026 y asignación por defecto de la categoría general',
    url: 'https://www.bps.gub.uy/24308/nuevas-categorias-laborales-para-trabajo-domestico.html',
  },
  {
    label:
      'BPS, «Aumento salarial - Julio 2026» — los mínimos por categoría vigentes del 1/7/2026 al 31/12/2026, con su valor hora',
    url: 'https://www.bps.gub.uy/24375/aumento-salarial---julio-2026.html',
  },
  {
    label:
      'MTSS, «Trabajo Doméstico» — licencia anual de 20 días continuos, aguinaldo en dos fracciones, plazos de pago del sueldo, vestimenta y herramientas sin costo, y el registro en BPS',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/trabajo-domestico',
  },
])

// ---------------------------------------------------------------------------
// Las tres categorías (desde el 1.º de julio de 2026)
// ---------------------------------------------------------------------------

export type DomesticCategoryId = 'general' | 'cocina' | 'cuidados'

export interface DomesticCategory {
  readonly id: DomesticCategoryId
  /** Cómo la nombra BPS. */
  readonly nombre: string
  /** Qué comprende, en la redacción del Comunicado 12/2026. */
  readonly comprende: string
  /** Lo que NO alcanza para quedar en la categoría, cuando BPS lo escribió. */
  readonly noAlcanza?: string
  /** Mínimo por 44 horas semanales, en pesos, vigente en la ventana de abajo. */
  readonly minimoMensual: number
  /** Valor mínimo por hora, en pesos, vigente en la ventana de abajo. */
  readonly minimoHora: number
}

/** Desde cuándo existen las tres categorías (BPS: «a partir del 1.° de julio de 2026»). */
export const DOMESTIC_CATEGORIES_SINCE = '2026-07-01'

/** Ventana de vigencia de los montos de `DOMESTIC_CATEGORIES`, tal como BPS la publica. */
export const DOMESTIC_WAGE_WINDOW = Object.freeze({
  desde: '2026-07-01',
  hasta: '2026-12-31',
})

/**
 * Los mínimos son los del período 1/7/2026–31/12/2026 (BPS, «Aumento salarial - Julio 2026»),
 * que salen de las actas del consejo de salarios del 5/12/2025 y del 6/7/2026.
 *
 * OJO al confundirlos con la tabla del Comunicado 12/2026: ésa está expresada «al 30/6/2026»
 * (General $ 31.178, Cocina $ 32.875, Cuidados $ 33.935) y es la base con la que se crearon las
 * categorías, no lo que se paga hoy.
 */
export const DOMESTIC_CATEGORIES: readonly DomesticCategory[] = Object.freeze([
  {
    id: 'general',
    nombre: 'General',
    comprende:
      'Las funciones de orden, limpieza, mantenimiento de la vivienda, lavado y planchado, realización de mandados, atención de espacios comunes o exteriores, cuidados de mascotas y otras tareas relacionadas con la organización y mantenimiento del hogar. También entran acá las tareas de cuidado o cocina cuando se hacen de manera secundaria: hasta el 50 % del tiempo trabajado.',
    minimoMensual: 32051,
    minimoHora: 169,
  },
  {
    id: 'cocina',
    nombre: 'Cocina',
    comprende:
      'La elaboración de alimentos para la familia: preparación de comidas a partir de ingredientes crudos, manipulación de alimentos, planificación de menús y tareas asociadas a la elaboración.',
    noAlcanza:
      'No alcanzan para quedar en esta categoría servir alimentos ya preparados o calentados, acciones menores como cortar, pelar o preparar bebidas simples, limpiar vajilla, utensilios o las áreas de cocina y comedor, ni servir o retirar la mesa.',
    minimoMensual: 33796,
    minimoHora: 178,
  },
  {
    id: 'cuidados',
    nombre: 'Cuidados',
    comprende:
      'El cuidado directo y habitual de personas: niños, adolescentes, personas mayores o personas con distintos grados de dependencia. Incluye supervisión, acompañamiento, alimentación e higiene, y las tareas complementarias de limpieza o aseo de la persona o su entorno inmediato.',
    noAlcanza:
      'No alcanza con actividades puntuales, como servir alimentos o brindar una asistencia breve.',
    minimoMensual: 34885,
    minimoHora: 184,
  },
])

export const categoriaPorId = (id: DomesticCategoryId): DomesticCategory => {
  const found = DOMESTIC_CATEGORIES.find(c => c.id === id)
  if (!found) throw new Error(`Categoría de trabajo doméstico desconocida: ${id}`)
  return found
}

/** Horas de la semana dedicadas a cada familia de tareas. */
export interface DomesticHours {
  readonly general: number
  readonly cocina: number
  readonly cuidados: number
}

/**
 * Qué categoría corresponde, con la regla que BPS escribió y que es la que la gente aplica mal.
 *
 * «Se entiende por tarea principal o mayoritaria aquella que ocupe el 50 % más una hora de la
 * jornada laboral, tanto en régimen mensual como jornalero.» O sea que cocinar o cuidar NO sube de
 * categoría por hacerse todos los días: tiene que pasar la mitad de la jornada más una hora. Por
 * debajo de eso la propia BPS la deja en general, que es además la categoría que asigna por
 * defecto.
 *
 * Devuelve `general` también cuando no hay ninguna tarea mayoritaria, que es el caso frecuente de
 * una jornada repartida.
 */
export const categoriaPorHoras = (horas: DomesticHours): DomesticCategoryId => {
  const total = horas.general + horas.cocina + horas.cuidados
  if (total <= 0) return 'general'
  const umbral = total / 2 + 1
  if (horas.cuidados >= umbral) return 'cuidados'
  if (horas.cocina >= umbral) return 'cocina'
  return 'general'
}

/**
 * El piso semanal de una jornada parcial, al valor hora publicado de la categoría.
 *
 * Es multiplicación del mínimo por hora que BPS publica, NO una regla propia de
 * proporcionalidad: por eso devuelve el piso de ESAS horas y la página lo dice así. Para 44 horas
 * el resultado no tiene por qué dar exactamente `minimoMensual`, porque el mensual y el valor hora
 * se publican redondeados cada uno por su lado.
 */
export const pisoSemanalPorHoras = (id: DomesticCategoryId, horasSemanales: number): number => {
  if (!Number.isFinite(horasSemanales) || horasSemanales <= 0) return 0
  return Math.round(categoriaPorId(id).minimoHora * horasSemanales)
}

// ---------------------------------------------------------------------------
// La ley propia del sector
// ---------------------------------------------------------------------------

export interface DomesticRule {
  readonly key: string
  readonly label: string
  /** La norma, con artículo. */
  readonly source: string
  readonly detail: string
}

/**
 * Las reglas que distinguen al trabajo doméstico del régimen de industria y comercio. Todas con su
 * artículo: la jornada y los descansos son los que más se incumplen y los que menos se conocen.
 */
export const DOMESTIC_WORK_RULES: readonly DomesticRule[] = Object.freeze([
  {
    key: 'jornada',
    label: 'Ocho horas por día y cuarenta y cuatro por semana',
    source: 'Ley 18.065, art. 2',
    detail:
      'La ley fija «un máximo legal de ocho horas diarias, y de cuarenta y cuatro horas semanales». Lo que pase de ahí son horas extra, con el régimen general de recargos.',
  },
  {
    key: 'intermedio',
    label: 'El descanso intermedio depende de si es con retiro o sin retiro',
    source: 'Ley 18.065, art. 3',
    detail:
      'Media hora paga como trabajo efectivo para quien trabaja con retiro; mínimo de dos horas para quien trabaja sin retiro. La hora en que se toma se acuerda entre las partes.',
  },
  {
    key: 'semanal',
    label: 'Treinta y seis horas seguidas de descanso semanal, con el domingo entero adentro',
    source: 'Ley 18.065, art. 4',
    detail:
      'El descanso semanal «será de treinta y seis horas ininterrumpidas, que comprenderá todo el día domingo». El día en que se goza el resto lo pueden acordar las partes, pero el domingo no se negocia.',
  },
  {
    key: 'nocturno',
    label: 'Sin retiro: nueve horas de descanso nocturno que no se pueden interrumpir',
    source: 'Ley 18.065, art. 5',
    detail:
      'Quien trabaja sin retiro tiene derecho a un descanso nocturno mínimo de nueve horas continuas, además de alimentación adecuada y a un alojamiento higiénico y privado.',
  },
  {
    key: 'laudo',
    label: 'El piso no es el salario mínimo nacional: es el laudo del sector',
    source: 'Ley 18.065, art. 6',
    detail:
      'El artículo incorporó al trabajo doméstico «en el sistema de fijación de salarios y categorías dispuesto por la Ley Nº 10.449», que es el de los Consejos de Salarios. De ahí salen las tres categorías y sus mínimos, que se renegocian por rondas y se ajustan más de una vez al año.',
  },
  {
    key: 'despido',
    label: 'La indemnización por despido corre desde los noventa días',
    source: 'Ley 18.065, art. 7',
    detail:
      'Mensuales y jornaleros «tendrán derecho a indemnización por despido desde los noventa días corridos de iniciada la relación laboral, rigiéndose en lo demás por las normas generales sobre despido». El año de antigüedad que todavía circula es de la Ley 12.597, art. 7, de 1958, y quedó sin efecto.',
  },
  {
    key: 'embarazo',
    label: 'Despido en el embarazo: indemnización especial',
    source: 'Ley 18.065, art. 8',
    detail:
      'La trabajadora despedida durante el embarazo y en los meses siguientes al reintegro tiene derecho a una indemnización especial, además de la común.',
  },
  {
    key: 'paro',
    label: 'Tiene seguro de paro',
    source: 'Ley 18.065, art. 9',
    detail:
      'El sector quedó incluido en el régimen de subsidio por desempleo del Decreto-Ley 15.180. No es un beneficio aparte: es el mismo seguro de paro, con sus requisitos de aportación.',
  },
  {
    key: 'salud',
    label: 'Cobertura médica por el seguro de salud',
    source: 'Ley 18.065, art. 10',
    detail:
      'Da acceso a la atención por instituciones de asistencia médica colectiva o por ASSE, que es la puerta de entrada al FONASA del sector.',
  },
  {
    key: 'edad',
    label: 'La edad mínima son 18 años',
    source: 'Ley 18.065, art. 11',
    detail:
      'Dieciocho años para desempeñarse en el sector. El INAU puede autorizar desde los quince «cuando medien razones fundadas», y es una autorización, no una excepción automática.',
  },
  {
    key: 'recibo',
    label: 'Recibo de sueldo obligatorio',
    source: 'Ley 18.065, art. 12',
    detail:
      'El empleador tiene que extender recibo de sueldo en los términos de la Ley 16.244. Sin recibo no hay prueba del salario, y la prueba es lo que después sostiene cualquier reclamo.',
  },
  {
    key: 'inspeccion',
    label: 'La inspección en el domicilio necesita orden judicial',
    source: 'Ley 18.065, art. 13',
    detail:
      'El MTSS controla el cumplimiento, pero para inspeccionar un domicilio particular necesita orden judicial expresa. Es el límite que pone el hecho de que el lugar de trabajo sea la casa de alguien.',
  },
])

// ---------------------------------------------------------------------------
// Lo que publica el MTSS y lo que hay que hacer en BPS
// ---------------------------------------------------------------------------

export interface DomesticDuty {
  readonly key: string
  readonly label: string
  readonly detail: string
}

/** Licencia, aguinaldo, plazos de pago y herramientas, tal como los publica el MTSS. */
export const DOMESTIC_WORK_DUTIES: readonly DomesticDuty[] = Object.freeze([
  {
    key: 'licencia',
    label: 'Licencia anual: 20 días continuos',
    detail:
      'Veinte días continuos por año completo trabajado, o 1,67 días por mes cada 25 días trabajados cuando el año no está completo.',
  },
  {
    key: 'aguinaldo',
    label: 'Aguinaldo en dos fracciones',
    detail:
      'Se paga en dos partes, en junio y en diciembre, como en el resto de la actividad privada.',
  },
  {
    key: 'plazos',
    label: 'El plazo para pagar el sueldo no es uno solo',
    detail:
      'El mensual se paga dentro de los primeros 5 días hábiles; el quincenal, dentro de los 5 días hábiles del vencimiento de la quincena; el semanal, al finalizar la respectiva semana.',
  },
  {
    key: 'herramientas',
    label: 'Vestimenta y herramientas, sin costo',
    detail:
      'La provisión de vestimenta adecuada y de las herramientas de trabajo corre por cuenta del empleador. No se le puede descontar del sueldo.',
  },
  {
    key: 'registro',
    label: 'El registro en BPS va al inicio, no después',
    detail:
      'El alta se hace a más tardar el día en que la persona empieza a trabajar, y el egreso se comunica dentro de los 5 días hábiles. El trámite es el servicio en línea «Trabajo Doméstico: inscribir trabajadores y modificar datos».',
  },
  {
    key: 'categoria',
    label: 'BPS te puso la categoría general: si no es la que va, cambiala vos',
    detail:
      'BPS asignó la categoría general a todos los trabajadores con actividad. Si corresponde cocina o cuidados, es el empleador el que tiene que modificarla desde ese mismo servicio, con la acción «Modificar». Al dar de alta a alguien nuevo, la categoría se declara.',
  },
])

/** La regla del 50 % más una hora, en la redacción de BPS, para citarla en la página. */
export const DOMESTIC_MAIN_TASK_QUOTE =
  'Se entiende por tarea principal o mayoritaria aquella que ocupe el 50 % más una hora de la jornada laboral, tanto en régimen mensual como jornalero. En este último caso, se evaluará la tarea principal considerando el conjunto de jornales del mes.'

/** El otro detalle del mismo comunicado que evita una rebaja encubierta. */
export const DOMESTIC_LOWER_TASKS_QUOTE =
  'Quienes se encuentren en una categoría podrán realizar tareas correspondientes a categorías de menor remuneración.'

export interface DomesticFaq {
  readonly question: string
  readonly answer: string
}

export const DOMESTIC_WORK_FAQ: readonly DomesticFaq[] = Object.freeze([
  {
    question: '¿Cuánto hay que pagarle como mínimo a una empleada doméstica en 2026?',
    answer:
      'Depende de la categoría, que desde el 1.º de julio de 2026 son tres. Para el período que va del 1/7/2026 al 31/12/2026, BPS publica por 44 horas semanales $ 32.051 en la categoría general, $ 33.796 en cocina y $ 34.885 en cuidados, con un valor mínimo por hora de $ 169, $ 178 y $ 184. El laudo se renegocia por rondas, así que el día que liquidás conviene mirar el valor vigente en BPS.',
  },
  {
    question: '¿Qué categoría le corresponde si limpia y además cocina?',
    answer:
      'Sigue siendo la general. Para quedar en cocina o en cuidados, esa tarea tiene que ser la principal, y BPS define principal como la que ocupa el 50 % más una hora de la jornada. Cocinar o cuidar de manera secundaria —hasta el 50 % del tiempo trabajado— está comprendido dentro de la categoría general.',
  },
  {
    question: '¿A los cuántos meses le corresponde indemnización por despido?',
    answer:
      'A los noventa días corridos de iniciada la relación laboral, tanto si es mensual como jornalera, por el art. 7 de la Ley 18.065. El año de antigüedad que todavía se repite salía del art. 7 de la Ley 12.597, de 1958, y la ley propia del sector lo dejó sin efecto en 2006.',
  },
  {
    question: '¿Cuándo hay que inscribirla en BPS?',
    answer:
      'A más tardar el día en que empieza a trabajar, por el servicio en línea «Trabajo Doméstico: inscribir trabajadores y modificar datos». El egreso se comunica dentro de los 5 días hábiles. Al dar el alta hay que declarar la categoría: BPS pone la general por defecto y el cambio lo hace el empleador.',
  },
  {
    question: '¿Cuánto descanso le corresponde si duerme en la casa?',
    answer:
      'Si trabaja sin retiro, nueve horas continuas de descanso nocturno que no se pueden interrumpir, más alimentación adecuada y un alojamiento higiénico y privado (Ley 18.065, art. 5). El descanso intermedio de la jornada es de un mínimo de dos horas, contra la media hora paga de quien trabaja con retiro.',
  },
  {
    question: '¿Tiene seguro de paro y cobertura de salud?',
    answer:
      'Sí las dos. La Ley 18.065 incluyó al sector en el subsidio por desempleo del Decreto-Ley 15.180 (art. 9) y en la cobertura médica por instituciones de asistencia médica colectiva o ASSE (art. 10). Son los mismos regímenes del resto de la actividad privada, con sus requisitos de aportación.',
  },
  {
    question: '¿Puede trabajar una persona menor de edad en casa de familia?',
    answer:
      'La edad mínima son 18 años. El INAU puede autorizar a partir de los quince «cuando medien razones fundadas» (Ley 18.065, art. 11), pero es una autorización que hay que pedir, no una excepción que se aplique sola.',
  },
  {
    question: '¿El MTSS puede entrar a controlar a la casa?',
    answer:
      'No sin orden judicial. El art. 13 de la Ley 18.065 le da al MTSS el control del cumplimiento, pero la inspección de un domicilio particular requiere orden expresa de la justicia, porque el lugar de trabajo es la vivienda de alguien.',
  },
])
