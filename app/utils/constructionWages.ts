/**
 * Quién paga la licencia, el salario vacacional y el aguinaldo de un trabajador de la construcción.
 *
 * La respuesta es la página entera y no la sabe casi nadie: **no los paga la empresa, los paga el
 * BPS**, con un calendario propio que no se parece al del resto del sector privado. El dinero sale
 * igual del bolsillo del empleador —viaja dentro del Aporte Unificado de la Construcción— pero lo
 * liquida y lo deposita el Banco de Previsión Social.
 *
 * POR QUÉ ESTA PÁGINA Y NO LA DE AGUINALDO QUE YA EXISTE. `/cuando-se-cobra-el-aguinaldo-uruguay`
 * ya tiene a la construcción: es la tercera fila de su tabla de tres regímenes
 * (`AGUINALDO_2026_CALENDAR`), con las dos partes y sus meses. Así que el aguinaldo de la
 * construcción ya está contestado y una página que lo repita le saca las impresiones sin agregar
 * nada, que es la regla del repo. Lo que NO está en ninguna de las 211 páginas es la otra mitad del
 * régimen, que es la que más se busca y la única con un reparto que sorprende: la **licencia** y el
 * **salario vacacional**, que el BPS parte en dos pagos —diciembre hasta 16 días, el resto en
 * Semana de Turismo— y que arrastran tres cosas que nadie cuenta: que postergar la licencia se pide
 * en el MTSS y la fecha de ESA solicitud decide en cuál de los tres pagos cobrás; que la licencia
 * por antigüedad computa los períodos de TODOS tus empleadores de la obra y no sólo del actual; y
 * que cobrar estas partidas te vuelve multiempleo, con declaración de IRPF obligatoria.
 *
 * Por eso el título apunta a la licencia y no al aguinaldo, y el aguinaldo se entrega a la página
 * que ya lo tiene con un enlace.
 *
 * DE DÓNDE SALE CADA COSA, y la distinción que importa: los PORCENTAJES y el hecho de que estas
 * partidas viajan en el aporte unificado son de norma (Decreto-Ley 14.411 y Decreto 951/975,
 * art. 1, más la tabla vigente del BPS); los MESES no están en la norma. Se leyó el Decreto 951/975
 * buscándolos y no los tiene: su art. 1 pone la vigencia del régimen y enumera las aportaciones
 * «para el pago de la licencia anual, del sueldo anual complementario y de las sumas para el mejor
 * goce de la licencia», pero ningún artículo fija noviembre-abril ni mayo-octubre. El calendario
 * sale de la ficha oficial del BPS y se cita así, sin colgárselo a un decreto que no lo dice.
 *
 * LA TRAMPA DE LOS NOMBRES DE 1975, que es la razón por la que leer la ley desconcierta: el
 * Decreto-Ley 14.411 y su decreto reglamentario no nombran al BPS como pagador. El art. 5 del
 * decreto-ley dice que «El Consejo Central de Asignaciones Familiares deberá abonar estos
 * beneficios a los trabajadores», porque ése era el organismo de la época; sus funciones las
 * absorbió el BPS. Es el mismo tropezón que la guía del subsidio por enfermedad ya documenta con la
 * «ASSE» de 1975, que tampoco es la ASSE de hoy.
 *
 * Módulo puro: sin imports de Vue ni de Nuxt, para que vitest-node lo cargue.
 */

/** La ruta de la página, en un solo lugar: la usa el canonical y el JSON-LD. */
export const CONSTRUCTION_PATH = '/licencia-de-la-construccion-uruguay'

/** El día en que se cotejaron las cifras contra las fichas del BPS y las normas en IMPO. */
export const CONSTRUCTION_VERIFIED_AT = '2026-10-16'

// ---------------------------------------------------------------------------
// El Aporte Unificado de la Construcción: por qué paga el BPS y no la empresa
// ---------------------------------------------------------------------------

/** El total del aporte unificado, en % de las remuneraciones gravadas (BPS, Régimen Construcción). */
export const AUC_TOTAL_RATE = 71.8

/**
 * La cuota parte del aporte unificado que financia licencia, salario vacacional y aguinaldo.
 *
 * Es el número que explica toda la página: el empleador no te paga estas partidas porque ya las
 * pagó acá. La tabla vigente del BPS la llama «Cargas salariales».
 */
export const AUC_WAGE_CHARGES_RATE = 29.9

export interface AucComponent {
  readonly id: string
  readonly label: string
  readonly rate: number
  /** Qué financia, en una línea. */
  readonly detail: string
}

/**
 * Los cinco componentes del 71,8 %, como los publica el BPS en su página de Régimen Construcción.
 *
 * Suman exactamente el total, y el test lo verifica: una fila mal copiada deja de sumar y se nota.
 */
export const AUC_COMPONENTS: readonly AucComponent[] = Object.freeze([
  {
    id: 'cargas-salariales',
    label: 'Cargas salariales',
    rate: AUC_WAGE_CHARGES_RATE,
    detail:
      'Licencia anual, salario vacacional y aguinaldo. Es la parte que después te paga el BPS.',
  },
  {
    id: 'cess-personales',
    label: 'Contribuciones a la seguridad social (personales)',
    rate: 17.9,
    detail: 'El aporte jubilatorio del trabajador, retenido dentro del mismo aporte unificado.',
  },
  {
    id: 'cess-patronales',
    label: 'Contribuciones a la seguridad social (patronales)',
    rate: 9,
    detail: 'El aporte jubilatorio que le toca a la empresa.',
  },
  {
    id: 'snis',
    label: 'Seguro Nacional de Salud',
    rate: 9,
    detail: 'El FONASA del trabajador y su familia.',
  },
  {
    id: 'bse',
    label: 'BSE',
    rate: 6,
    detail: 'El seguro por accidentes de trabajo, obligatorio en el Banco de Seguros del Estado.',
  },
])

/**
 * El tributo a la Caja de Profesionales Universitarios, que NO está dentro del 71,8 %.
 *
 * Va aparte a propósito y el BPS lo escribe así: se paga junto con el aporte unificado pero no lo
 * integra, y la tasa depende de si la obra es de arquitectura o de ingeniería (Ley 17.738).
 */
export const CAJA_PROFESIONALES_RATES = Object.freeze({
  arquitectura: 4,
  ingenieria: 2,
})

// ---------------------------------------------------------------------------
// El calendario: tres pagos al año, y qué trae cada uno
// ---------------------------------------------------------------------------

export interface ConstructionPayout {
  readonly id: string
  /** Cuándo lo paga el BPS. */
  readonly when: string
  /** Qué partidas entran en ese pago. */
  readonly items: readonly string[]
  /** El período de trabajo que cubre, o el recorte que lo define. */
  readonly covers: string
}

/**
 * Los tres pagos, como los enumera la ficha «Partidas salariales de Construcción» del BPS.
 *
 * El orden es el del año civil de cobro y no el del devengamiento, porque es el orden en el que el
 * lector los vive. Semana de Turismo va al final aunque caiga en marzo o abril: es el pago que
 * cierra el año de licencia anterior.
 */
export const CONSTRUCTION_PAYOUTS: readonly ConstructionPayout[] = Object.freeze([
  {
    id: 'junio',
    when: 'Junio',
    items: ['Primera parte del aguinaldo'],
    covers: 'Lo trabajado de noviembre del año anterior a abril de este año.',
  },
  {
    id: 'diciembre',
    when: 'Diciembre',
    items: [
      'Segunda parte del aguinaldo',
      'Primer período de licencia',
      'Salario vacacional de esos días',
    ],
    covers:
      'El aguinaldo cubre de mayo a octubre. La licencia de este pago tiene un tope de 16 días.',
  },
  {
    id: 'turismo',
    when: 'Semana de Turismo',
    items: ['Segundo período de licencia', 'Licencia por antigüedad', 'Salario vacacional'],
    covers:
      'Sólo para quien generó más de 16 días de licencia en el año: son los días que no entraron en diciembre.',
  },
])

/**
 * El tope de días de licencia que el BPS paga en el pago de diciembre.
 *
 * Es el número que parte la licencia en dos cobros y el que casi nadie espera: con 20 días
 * generados, en diciembre cobrás 16 y los otros 4 recién en Semana de Turismo.
 */
export const DECEMBER_LICENCIA_CAP_DAYS = 16

export interface LicenciaSplit {
  /** Días que se pagan en diciembre. */
  readonly december: number
  /** Días que quedan para el pago de Semana de Turismo. */
  readonly turismo: number
}

/**
 * Cómo se reparten en los dos pagos los días de licencia generados en el año.
 *
 * El corte es el de la ficha del BPS: diciembre paga el primer período «con un máximo de 16 días» y
 * el segundo período va en Semana de Turismo, para los trabajadores «que generaron más de 16 días».
 * O sea que 16 justos se cobran enteros en diciembre y no abren un segundo pago — el borde importa,
 * porque una implementación que usara `>=` mandaría a Turismo a quien no tiene nada que cobrar ahí.
 *
 * Devuelve `null` ante un dato que no es una cantidad de días: un campo vacío no es cero.
 */
export function licenciaSplit(days: number | null): LicenciaSplit | null {
  if (days === null || !Number.isFinite(days) || days < 0) return null
  const whole = Math.floor(days)
  const december = Math.min(whole, DECEMBER_LICENCIA_CAP_DAYS)
  return Object.freeze({ december, turismo: whole - december })
}

// ---------------------------------------------------------------------------
// En qué pago cae el aguinaldo del mes que trabajaste
// ---------------------------------------------------------------------------

export interface AguinaldoTranche {
  /** `junio` o `diciembre`: cuál de los dos pagos lo trae. */
  readonly payoutId: 'junio' | 'diciembre'
  readonly when: string
  /** El año civil en el que se cobra. */
  readonly year: number
}

/**
 * Dado un mes trabajado, en qué pago del BPS viene su aguinaldo.
 *
 * Es la pregunta literal del buscador («trabajé en setiembre, ¿cuándo cobro ese aguinaldo?») y el
 * punto donde la construcción se separa del resto del sector privado. Los semestres del régimen
 * general son diciembre-mayo y junio-noviembre; los de la construcción están corridos un mes:
 * **noviembre-abril** se paga en junio y **mayo-octubre** en diciembre (BPS, Partidas salariales de
 * Construcción).
 *
 * El salto de año es la parte que se equivoca sola: noviembre y diciembre se cobran en junio del
 * año SIGUIENTE, porque su tramo empieza en noviembre y termina en abril.
 *
 * `month` es 1-12. Devuelve `null` fuera de ese rango: no se adivina un mes inválido.
 */
export function aguinaldoTrancheFor(month: number, year: number): AguinaldoTranche | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(year)) return null
  // Mayo a octubre: el tramo cierra en octubre y se paga en diciembre del mismo año.
  if (month >= 5 && month <= 10) {
    return Object.freeze({ payoutId: 'diciembre' as const, when: 'Diciembre', year })
  }
  // Noviembre y diciembre abren el tramo que cierra en abril: se cobra en junio del año siguiente.
  const payYear = month >= 11 ? year + 1 : year
  return Object.freeze({ payoutId: 'junio' as const, when: 'Junio', year: payYear })
}

// ---------------------------------------------------------------------------
// Postergar la licencia: la solicitud se hace en el MTSS y su fecha decide el pago
// ---------------------------------------------------------------------------

export interface PostponementRule {
  readonly id: string
  /** Hasta cuándo se presenta la solicitud. */
  readonly deadline: string
  /** En qué pago se cobra la licencia postergada. */
  readonly paidAt: string
}

/**
 * Las tres ventanas de la postergación, como las publica el BPS.
 *
 * El dato operativo que falta en todas partes: la solicitud **no se hace en el BPS**, se hace en el
 * Ministerio de Trabajo y Seguridad Social, y la fecha en que se presenta es la que decide en cuál
 * de los tres pagos cobrás.
 */
export const POSTPONEMENT_RULES: readonly PostponementRule[] = Object.freeze([
  { id: 'febrero', deadline: 'Hasta el 28 de febrero', paidAt: 'Se cobra en diciembre' },
  { id: 'mayo', deadline: 'Hasta el 31 de mayo', paidAt: 'Se cobra en Semana de Turismo' },
  { id: 'junio', deadline: 'Desde el 1.º de junio', paidAt: 'Se cobra en junio' },
])

/**
 * El recorte que la postergación le pone a quien generó más de 16 días.
 *
 * Lo dice la ficha del BPS y es la única restricción de la postergación: quien supera los 16 días y
 * posterga para junio no puede fraccionar los períodos.
 */
export const POSTPONEMENT_NO_SPLIT_NOTE =
  'Quien generó más de 16 días y posterga para junio no puede fraccionar los períodos: va todo a ese pago.'

// ---------------------------------------------------------------------------
// Las condiciones y las consecuencias que nadie cuenta
// ---------------------------------------------------------------------------

export interface ConstructionCondition {
  readonly id: string
  readonly title: string
  readonly body: string
}

export const CONSTRUCTION_CONDITIONS: readonly ConstructionCondition[] = Object.freeze([
  {
    id: 'nominas-pagas',
    title: 'Se liquida sobre nóminas ya pagas',
    body: 'El BPS calcula estas partidas sobre las nóminas de la obra que ya estaban pagas al momento de liquidarlas. Si la de tu período no estaba paga cuando se liquidó, no entrás en ese pago: es la causa más común de «a mí no me vino» y no se arregla en el BPS, se arregla con la empresa.',
  },
  {
    id: 'solo-en-obra',
    title: 'Sólo el personal que trabaja en la obra',
    body: 'El régimen comprende únicamente al personal que cumple tareas directamente en obra (Decreto-Ley 14.411, art. 4). Quedan afuera los subcontratistas de taller y las fábricas de materiales (art. 3), y tampoco se consideran empresas de la construcción las que tienen otro giro principal, ni sus trabajadores (art. 8). Un administrativo de una constructora puede estar fuera del régimen y cobrar del empleador como cualquiera.',
  },
  {
    id: 'antiguedad-todos-los-empleadores',
    title: 'La antigüedad suma los períodos de todos tus empleadores',
    body: 'Para calcular la licencia por antigüedad el BPS computa todos los períodos trabajados en las actividades alcanzadas, aunque hayan sido con empleadores distintos, siempre que entre un vínculo y otro no hayas hecho actividades de otro giro (Decreto 110/017). Cambiar de empresa dentro de la obra no te reinicia el contador, que es justo lo contrario de lo que pasa fuera de este régimen.',
  },
  {
    id: 'irpf-multiempleo',
    title: 'Te vuelve multiempleo, con declaración de IRPF obligatoria',
    body: 'Cobrar estas partidas del BPS mientras tu empleador te paga el sueldo configura multiempleo, y por eso el propio BPS avisa que quien las recibe tiene que presentar la declaración anual de IRPF ante la DGI. No es opcional ni depende del monto, y es la consecuencia que más cae de sorpresa en el año siguiente.',
  },
  {
    id: 'fallecimiento',
    title: 'Si el trabajador fallece, la partida tiene orden de cobro',
    body: 'La cobra primero el cónyuge o concubino, que tiene que acreditar su estado civil. Si además hay otros herederos, al cónyuge le corresponde el 50 % y el otro 50 % se reparte en partes iguales entre los demás.',
  },
])

/** Cómo y dónde se cobra, de la ficha de pago de licencia del BPS. */
export const CONSTRUCTION_PAYMENT_CHANNELS = Object.freeze([
  'Por banco o instrumento de dinero electrónico, si es ahí donde cobrás habitualmente.',
  'En locales de pago descentralizado.',
  'En el Edificio Sede del BPS, en Montevideo.',
])

/**
 * El recibo, que es el dato útil para reclamar.
 *
 * Con Usuario personal BPS se ven los recibos de aguinaldo, salario vacacional y licencia. Quien no
 * lo tiene lo pide con cédula y correo electrónico en cualquier local de la Red de cobranza del
 * país.
 */
export const CONSTRUCTION_RECEIPT_NOTE =
  'Con Usuario personal BPS podés ver tus recibos de aguinaldo, salario vacacional y licencia. Si no lo tenés, se pide con la cédula y una dirección de correo en cualquier local de la Red de cobranza del país.'

// ---------------------------------------------------------------------------
// Lo que esta página NO publica, con la razón escrita
// ---------------------------------------------------------------------------

export interface UnpublishedItem {
  readonly id: string
  readonly question: string
  readonly why: string
}

/**
 * Cuatro cifras que se buscaron y no se publican.
 *
 * La regla del repo: un número sin fuente vigente que citar no entra, y se dice por qué en la
 * propia página en vez de dejar el hueco sin explicar.
 */
export const CONSTRUCTION_UNPUBLISHED: readonly UnpublishedItem[] = Object.freeze([
  {
    id: 'fecha-exacta',
    question: '¿Qué día exacto de diciembre de 2026 paga el BPS?',
    why: 'El BPS lo anuncia por edición, no por norma: la última fecha documentada es la de diciembre de 2025 y la de 2026 no está publicada al día de esta verificación. Poner un día acá sería inventarlo, así que va el mes.',
  },
  {
    id: 'semana-de-turismo',
    question: '¿Qué fechas son la Semana de Turismo del año que viene?',
    why: 'Es movible —cae según la Pascua— y la ficha del BPS nombra la semana, no un día. No se calcula acá: el calendario propio del sitio es el que lleva los feriados.',
  },
  {
    id: 'cuanto-me-toca',
    question: '¿Cuánto me va a venir?',
    why: 'Depende de tus nóminas del período y de tus días de licencia por antigüedad, dos datos que sólo tiene el BPS. La página reparte los días entre los dos pagos, que es la parte que sí se puede calcular sin tu historia.',
  },
  {
    id: 'ajuste-de-partidas',
    question: '¿Cuánto aumentaron las partidas este año?',
    why: 'El único porcentaje de ajuste que la ficha del BPS trae escrito corresponde al período 1/4/2023-31/3/2024, así que ya no rige y publicarlo como vigente sería un error de fecha disfrazado de dato.',
  },
])

// ---------------------------------------------------------------------------
// FAQ y fuentes
// ---------------------------------------------------------------------------

export interface ConstructionFaq {
  readonly question: string
  readonly answer: string
}

export const CONSTRUCTION_FAQ: readonly ConstructionFaq[] = Object.freeze([
  {
    question: '¿Quién me paga la licencia si trabajo en la construcción?',
    answer:
      'El BPS, no tu empleador. La empresa ya pagó esa partida dentro del Aporte Unificado de la Construcción, cuya cuota parte de cargas salariales es del 29,9 % de las remuneraciones gravadas, y el BPS la liquida y te la deposita.',
  },
  {
    question: '¿Cuándo cobro la licencia y el salario vacacional?',
    answer:
      'En dos pagos. En diciembre, junto con la segunda parte del aguinaldo, con un tope de 16 días de licencia. Los días que pasen de 16 se cobran en Semana de Turismo, junto con la licencia por antigüedad.',
  },
  {
    question: 'Trabajé en setiembre, ¿cuándo me viene ese aguinaldo?',
    answer:
      'En diciembre del mismo año: el tramo de mayo a octubre se paga en diciembre. El tramo de noviembre a abril se paga en junio, así que lo trabajado en noviembre y diciembre se cobra en junio del año siguiente.',
  },
  {
    question: '¿Puedo postergar la licencia?',
    answer:
      'Sí, pero la solicitud se presenta en el Ministerio de Trabajo y Seguridad Social, no en el BPS, y la fecha en que la presentás decide el pago: hasta el 28 de febrero se cobra en diciembre, hasta el 31 de mayo en Semana de Turismo y desde el 1.º de junio en junio.',
  },
  {
    question: 'Cambié de empresa, ¿pierdo la antigüedad para la licencia?',
    answer:
      'No, si seguiste en la construcción. El BPS computa todos los períodos trabajados en las actividades alcanzadas aunque hayan sido con empleadores distintos, siempre que en el medio no hayas trabajado en otro giro (Decreto 110/017).',
  },
  {
    question: '¿Tengo que hacer la declaración de IRPF?',
    answer:
      'Sí. El BPS avisa que quien cobra estas partidas queda configurado como multiempleo y por eso tiene que presentar la declaración anual de IRPF ante la DGI.',
  },
  {
    question: 'No me vino el pago, ¿qué pasó?',
    answer:
      'La causa más común es que la nómina de tu período no estaba paga cuando el BPS liquidó las partidas: en ese caso no entrás en ese pago. Con Usuario personal BPS podés ver tus recibos y confirmarlo antes de reclamar.',
  },
])

export interface ConstructionSource {
  readonly label: string
  readonly url: string
}

/** Las cinco fuentes, todas oficiales: tres fichas del BPS y dos normas en IMPO. */
export const CONSTRUCTION_SOURCES: readonly ConstructionSource[] = Object.freeze([
  {
    label: 'BPS — Partidas salariales de Construcción (el calendario y los 16 días)',
    url: 'https://www.bps.gub.uy/16585/partidas-salariales-de-construccion.html',
  },
  {
    label: 'BPS — Régimen Construcción (el aporte unificado y sus componentes)',
    url: 'https://www.bps.gub.uy/837/regimen-construccion.html',
  },
  {
    label: 'BPS — Pago de licencia a trabajadores de la construcción (medios de cobro y recibos)',
    url: 'https://www.bps.gub.uy/23990/pago-de-licencia-a-trabajadores-de-la-construccion.html',
  },
  {
    label: 'Decreto-Ley 14.411 (el régimen, su alcance y el pagador del art. 5)',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14411-1975',
  },
  {
    label: 'Decreto 951/975, art. 1 (las partidas viajan en el aporte unificado)',
    url: 'https://www.impo.com.uy/bases/decretos/951-1975',
  },
  {
    label: 'Decreto 110/017 (la licencia por antigüedad con varios empleadores)',
    url: 'https://www.impo.com.uy/bases/decretos/110-2017/1',
  },
])
