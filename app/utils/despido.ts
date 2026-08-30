// app/utils/despido.ts
// Datos de /indemnizacion-por-despido-uruguay: cuánto es la indemnización por despido, cuál es el
// tope que efectivamente te toca y cuánto tiempo tenés para reclamarla.
//
// POR QUÉ EXISTE: el sitio ya contesta qué pasa DESPUÉS de quedarte sin trabajo
// (/seguro-de-paro-uruguay) y ya explica las otras partidas anuales —aguinaldo, salario vacacional,
// licencias—, pero la partida más grande del egreso, la indemnización por despido, no estaba escrita
// en ningún lado. Y es donde vive el error más caro: todo el mundo repite «el tope son seis meses»,
// cuando el art. 4 de la Ley 10.489 fija DOS topes y el que te toca depende de si tenés o no derecho
// a jubilación. La Ley 12.597 (art. 5) define «derecho a jubilación» con dos números concretos —más
// de diez años de servicios reconocidos Y cuarenta años de edad—, así que la diferencia entre cobrar
// tres meses y cobrar seis es verificable, no opinable, y prácticamente nadie la publica.
//
// El otro dato que falta en todos lados es el plazo: la acción prescribe AL AÑO del cese (Ley
// 18.091, art. 1), y pedir la audiencia de conciliación en el MTSS interrumpe la prescripción (art.
// 3). Quien espera «a ver si me llaman» se queda sin juicio por calendario.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: cuántos jornales de indemnización le corresponden a un
// jornalero que SÍ computó 240 jornales en el año. La cifra que circula («25 jornales por año») es
// doctrina y no aparece ni en el texto de la Ley 10.489, ni en el de la Ley 12.597, ni en las
// páginas del MTSS que se pudieron verificar. Sí se publica el caso que la ley resuelve con todas
// las letras: el del jornalero que no llegó a 240 jornales. Tampoco se publica ningún monto en
// pesos ni ninguna tasa de retención: la base de cálculo sale de cada recibo.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-30 (ver DESPIDO_SOURCES para la lista):
//   - Ley 10.489 (06/06/1944), art. 4 — un mes de remuneración total por año o fracción, con
//     límite de tres mensualidades con derecho a jubilación y seis como máximo en caso contrario;
//     sin derecho por notoria mala conducta.
//   - Ley 10.542 (20/10/1944), art. 1 — extiende esas garantías a la industria y a toda actividad
//     privada, salvo destajistas y jornaleros de establecimientos típicamente industriales.
//   - Ley 12.597 (30/12/1958), arts. 1 a 10 — jornaleros y destajistas, la definición de «derecho a
//     jubilación», el cómputo año a año, el servicio doméstico y la carga de la prueba.
//   - Ley 18.091 (07/01/2007), arts. 1 a 4 — prescripción anual de la acción, quinquenal de los
//     créditos, e interrupción por la audiencia del MTSS o la demanda.
//   - MTSS, «Despido (régimen común)» — la lectura oficial vigente.

export interface DespidoSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const DESPIDO_VERIFIED_AT = '2026-08-30'

// ---------------------------------------------------------------------------
// Cuánto: el régimen mensual
// ---------------------------------------------------------------------------

/** Meses de remuneración total por cada año o fracción de actividad (Ley 10.489, art. 4). */
export const MESES_POR_ANIO = 1

/** Tope en mensualidades para quien NO tiene derecho a jubilación (Ley 10.489, art. 4). */
export const TOPE_SIN_DERECHO_A_JUBILACION = 6

/** Tope en mensualidades para quien SÍ tiene derecho a jubilación (Ley 10.489, art. 4). */
export const TOPE_CON_DERECHO_A_JUBILACION = 3

/** Años de servicios reconocidos a partir de los cuales puede haber derecho a jubilación (Ley 12.597, art. 5). */
export const JUBILACION_ANIOS_DE_SERVICIO = 10

/** Edad a partir de la cual puede haber derecho a jubilación (Ley 12.597, art. 5). */
export const JUBILACION_EDAD = 40

/**
 * Si el trabajador tiene «derecho a jubilación» en el sentido del art. 5 de la Ley 12.597, que es lo
 * único que decide cuál de los dos topes del art. 4 de la Ley 10.489 se le aplica.
 *
 * La norma es explícita y acumulativa: «se considera que existe derecho a jubilación solamente
 * cuando el trabajador tiene más de diez años de servicios reconocidos o que puedan ser reconocidos
 * por la Caja respectiva y cuarenta (40) años de edad, o cuando tenga derecho a jubilación por leyes
 * especiales». Las dos condiciones van juntas —más de diez años Y cuarenta de edad—, y las leyes
 * especiales son una vía aparte que este parámetro deja declarar directamente.
 *
 * «Más de diez años» es estricto: diez exactos no alcanzan.
 */
export function tieneDerechoAJubilacion(
  aniosDeServicio: number,
  edad: number,
  porLeyEspecial = false
): boolean {
  if (porLeyEspecial) return true
  const anios = Number.isFinite(aniosDeServicio) ? aniosDeServicio : 0
  const years = Number.isFinite(edad) ? edad : 0
  return anios > JUBILACION_ANIOS_DE_SERVICIO && years >= JUBILACION_EDAD
}

/**
 * Mensualidades de indemnización que corresponden a un trabajador mensual, en meses de remuneración
 * total.
 *
 * El art. 4 de la Ley 10.489 paga «un mes de trabajo por cada año o fracción de actividad»: la
 * fracción cuenta como año entero, así que un año y un día son dos mensualidades. Después se aplica
 * el tope, que son tres mensualidades si hay derecho a jubilación y seis si no.
 *
 * Devuelve MESES, no pesos: el importe sale de multiplicarlo por la remuneración total del
 * trabajador, que es propia de cada recibo y no se publica acá.
 */
export function mensualidadesPorDespido(
  aniosDeActividad: number,
  conDerechoAJubilacion = false
): number {
  const anios = Number.isFinite(aniosDeActividad) ? Math.max(0, aniosDeActividad) : 0
  if (anios <= 0) return 0
  // «Año o fracción»: cualquier resto empezado suma una mensualidad entera.
  const mensualidades = Math.ceil(anios) * MESES_POR_ANIO
  const tope = conDerechoAJubilacion ? TOPE_CON_DERECHO_A_JUBILACION : TOPE_SIN_DERECHO_A_JUBILACION
  return Math.min(mensualidades, tope)
}

// ---------------------------------------------------------------------------
// Cuánto: el régimen a jornal
// ---------------------------------------------------------------------------

/** Jornales anuales a partir de los cuales el año deja de liquidarse como indemnización parcial (Ley 12.597, art. 1). */
export const JORNALES_ANIO_COMPLETO = 240

/** Jornales mínimos en el año para tener derecho a la indemnización parcial (Ley 12.597, art. 1). */
export const JORNALES_MINIMOS_EN_EL_ANIO = 100

/** Días de salario que paga la indemnización parcial por cada tramo trabajado (Ley 12.597, arts. 1 y 3). */
export const DIAS_POR_TRAMO = 2

/** Jornadas trabajadas que componen cada tramo de la indemnización parcial (Ley 12.597, arts. 1 y 3). */
export const JORNADAS_POR_TRAMO = 25

/**
 * Días de salario de indemnización parcial por un año en el que el jornalero no llegó a los 240
 * jornales, «calculada a razón del salario de dos días por cada veinticinco trabajados» (Ley 12.597,
 * art. 1).
 *
 * El art. 1 exige más de cien jornales en ese año para que el año dé derecho; el art. 3 exceptúa
 * expresamente a las fracciones de año, que se computan igual «aunque la fracción no llegue a cien
 * jornales». Por eso `esFraccionDeAnio`: es la misma cuenta con distinto piso, y no dos reglas.
 *
 * Los tramos se truncan: veinticuatro jornadas sueltas no pagan medio tramo.
 *
 * Devuelve 0 —no una excepción— cuando el año no da derecho, porque el cómputo del art. 1 se hace
 * «año a año, partiendo del día del despido hacia atrás» y un año que no califica simplemente no
 * suma nada a los que sí.
 */
export function diasDeIndemnizacionParcial(
  jornadasTrabajadas: number,
  esFraccionDeAnio = false
): number {
  const jornadas = Number.isFinite(jornadasTrabajadas)
    ? Math.max(0, Math.floor(jornadasTrabajadas))
    : 0
  if (!esFraccionDeAnio && jornadas <= JORNALES_MINIMOS_EN_EL_ANIO) return 0
  return Math.floor(jornadas / JORNADAS_POR_TRAMO) * DIAS_POR_TRAMO
}

// ---------------------------------------------------------------------------
// Cuándo: los plazos
// ---------------------------------------------------------------------------

/** Años que dura la acción laboral, contados desde el día siguiente al cese (Ley 18.091, art. 1). */
export const PRESCRIPCION_ACCION_ANIOS = 1

/** Años que duran los créditos laborales, desde que pudieron ser exigibles (Ley 18.091, art. 2). */
export const PRESCRIPCION_CREDITOS_ANIOS = 5

/** Recargo mensual sobre lo que se paga por sentencia ejecutoriada, en porcentaje (Ley 12.597, art. 8). */
export const RECARGO_MENSUAL_POR_SENTENCIA = 1

/**
 * El día en que prescribe la acción: al año, «a partir del día siguiente a aquél en que haya cesado
 * la relación laboral» (Ley 18.091, art. 1).
 *
 * El art. 1 arranca el cómputo el día DESPUÉS del cese, no el mismo día, y esta función respeta esa
 * diferencia de un día en vez de sumarle un año a la fecha de cese. Devuelve `null` ante una fecha
 * inválida: una fecha límite inventada es peor que ninguna.
 */
export function prescribeEl(fechaDeCese: Date | string): Date | null {
  const cese = fechaDeCese instanceof Date ? fechaDeCese : new Date(`${fechaDeCese}T12:00:00Z`)
  if (Number.isNaN(cese.getTime())) return null
  const inicio = new Date(cese.getTime())
  inicio.setUTCDate(inicio.getUTCDate() + 1)
  const vence = new Date(inicio.getTime())
  vence.setUTCFullYear(vence.getUTCFullYear() + PRESCRIPCION_ACCION_ANIOS)
  return vence
}

// ---------------------------------------------------------------------------
// La escala, para mostrarla
// ---------------------------------------------------------------------------

export interface DespidoEscalon {
  readonly anios: number
  readonly label: string
  /** Mensualidades sin derecho a jubilación (tope 6). */
  readonly sinJubilacion: number
  /** Mensualidades con derecho a jubilación (tope 3). */
  readonly conJubilacion: number
}

/**
 * La escala de mensualidades, derivada de {@link mensualidadesPorDespido} en vez de escrita a mano:
 * si la regla cambia, la tabla cambia con ella y no queda una fila vieja contradiciendo a la
 * función. Muestra las dos columnas juntas porque el punto de la página es que el tope no es uno.
 */
export const DESPIDO_ESCALONES: readonly DespidoEscalon[] = Object.freeze(
  [1, 2, 3, 4, 5, 6, 7, 10].map(anios => ({
    anios,
    label: anios === 1 ? '1 año o menos' : `${anios} años`,
    sinJubilacion: mensualidadesPorDespido(anios, false),
    conJubilacion: mensualidadesPorDespido(anios, true),
  }))
)

// ---------------------------------------------------------------------------
// Qué integra la base, y qué la corta
// ---------------------------------------------------------------------------

export interface DespidoRegla {
  readonly key: string
  readonly label: string
  /** Qué norma lo fija. */
  readonly source: string
  readonly detail: string
}

export const DESPIDO_REGLAS: readonly DespidoRegla[] = [
  {
    key: 'antiguedad',
    label: 'No se exige antigüedad mínima',
    source: 'Ley 10.489, art. 4 — MTSS, «Despido (régimen común)»',
    detail:
      'La indemnización se paga «por cada año o fracción de actividad», y el MTSS lo dice sin rodeos: no se exige antigüedad. Un trabajador mensual despedido a los dos meses tiene derecho a una mensualidad, porque la fracción cuenta como año.',
  },
  {
    key: 'computo',
    label: 'Se cuenta desde el ingreso hasta el despido',
    source: 'Ley 12.597, art. 2',
    detail:
      'Los servicios prestados se computan desde el día del ingreso al establecimiento hasta el día del despido. Para los jornaleros el art. 1 agrega que el cómputo se hace año a año, partiendo del día del despido hacia atrás, no por año civil.',
  },
  {
    key: 'base',
    label: 'La base es el salario vigente el día del despido',
    source: 'Ley 12.597, art. 6',
    detail:
      'Los trabajadores a jornal o salario fijo cobran sobre su salario normal vigente el día del despido, aunque ese salario rija en esa fecha por una tarifa con efecto retroactivo. Si la indemnización ya se había pagado, corresponde reliquidarla.',
  },
  {
    key: 'jornadas',
    label: 'Los días de licencia y de accidente cuentan como trabajados',
    source: 'Ley 12.597, art. 9',
    detail:
      'Se consideran jornadas trabajadas los días en que el trabajador percibió su salario, en todo o en parte, por accidente de trabajo, enfermedad profesional, vacación anual o feriados pagados. No son huecos en el cómputo.',
  },
  {
    key: 'mala-conducta',
    label: 'La notoria mala conducta la tiene que probar el empleador',
    source: 'Ley 10.489, art. 4 — Ley 12.597, art. 10',
    detail:
      'Es la única causal que borra la indemnización, y no basta con invocarla: el art. 10 pone la carga de la prueba del lado del empleador, que «deberá probar los hechos constitutivos de la notoria mala conducta».',
  },
  {
    key: 'domestico',
    label: 'El servicio doméstico necesita un año continuado',
    source: 'Ley 12.597, art. 7',
    detail:
      'Es la excepción a la regla de que no hay antigüedad mínima: el personal del servicio doméstico tiene derecho a indemnización por despido, pero se le exige una antigüedad mínima de un año continuado de labor al servicio del empleador.',
  },
  {
    key: 'recargo',
    label: 'Lo que se cobra por sentencia lleva 1 % mensual de recargo',
    source: 'Ley 12.597, art. 8',
    detail:
      'Las indemnizaciones que corresponda pagar por sentencia ejecutoriada se aumentan con un recargo del uno por ciento mensual. Litigar no congela el monto en el valor que tenía el día del despido.',
  },
]

// ---------------------------------------------------------------------------
// Preguntas y fuentes
// ---------------------------------------------------------------------------

export interface DespidoFaq {
  readonly question: string
  readonly short: string
  readonly answer: string
}

export const DESPIDO_FAQ: readonly DespidoFaq[] = [
  {
    question: '¿Cuánto me corresponde por despido en Uruguay?',
    short: 'Un mes de remuneración total por cada año o fracción',
    answer:
      'El art. 4 de la Ley 10.489 fija «una indemnización equivalente al importe de la remuneración total correspondiente a un mes de trabajo por cada año o fracción de actividad». La fracción cuenta como año entero: un año y un mes de trabajo son dos mensualidades. La Ley 10.542 (art. 1) extendió esa garantía desde el comercio a la industria y a toda la actividad privada, y el MTSS aclara que no se exige antigüedad mínima.',
  },
  {
    question: '¿El tope son seis meses de sueldo?',
    short: 'Son seis, o tres si ya tenés derecho a jubilación',
    answer:
      'La misma frase del art. 4 fija dos topes, no uno: «con límite de tres mensualidades si tuvieren derecho a jubilación y de seis mensualidades como máximo en caso contrario». El resumen público del MTSS menciona sólo el tope de seis, que es el que le toca a la mayoría, pero el de tres está en el texto vigente de la ley y cambia el resultado a la mitad para quien queda del otro lado.',
  },
  {
    question: '¿Qué significa «tener derecho a jubilación» para el tope de tres meses?',
    short: 'Más de 10 años de servicios y 40 de edad, o una ley especial',
    answer:
      'No es una frase abierta: el art. 5 de la Ley 12.597 la define. «Se considera que existe derecho a jubilación solamente cuando el trabajador tiene más de diez años de servicios reconocidos o que puedan ser reconocidos por la Caja respectiva y cuarenta (40) años de edad, o cuando tenga derecho a jubilación por leyes especiales.» Las dos condiciones son acumulativas, y «más de diez años» excluye los diez exactos.',
  },
  {
    question: 'Trabajo a jornal y no llego a 240 jornales en el año, ¿cobro igual?',
    short: 'Sí, con más de 100 jornales: dos días de salario cada 25 trabajados',
    answer:
      'El art. 1 de la Ley 12.597 cubre justamente ese caso. Quien no computó 240 jornales anuales pero sí más de 100 en uno o más de los años que se toman para graduar la indemnización tiene derecho a una indemnización parcial «calculada a razón del salario de dos días por cada veinticinco trabajados» en esos años. Para las fracciones de año el art. 3 aplica la misma cuenta aunque la fracción no llegue a los cien jornales.',
  },
  {
    question: '¿Cuánto tiempo tengo para reclamar la indemnización?',
    short: 'Un año desde el cese, y el trámite en el MTSS frena el reloj',
    answer:
      'La Ley 18.091 separa dos plazos. Por el art. 1 las acciones originadas en la relación de trabajo prescriben al año, contado desde el día siguiente a aquel en que cesó la relación. Por el art. 2 los créditos laborales prescriben a los cinco años desde que pudieron ser exigibles. El art. 3 agrega la salida práctica: la sola presentación del trabajador ante el MTSS pidiendo la audiencia de conciliación interrumpe la prescripción, y por el art. 4 también la interrumpe la presentación de la demanda.',
  },
  {
    question: '¿Me pueden dejar sin indemnización por mala conducta?',
    short: 'Sólo por notoria mala conducta, y probándola',
    answer:
      'Es la única causal. El art. 4 de la Ley 10.489 excluye del beneficio a quienes «sean despedidos por notoria mala conducta», y el art. 10 de la Ley 12.597 la repite agregando quién carga con la prueba: «el empleador deberá probar los hechos constitutivos de la notoria mala conducta». No alcanza con que figure escrito como motivo del cese.',
  },
  {
    question: '¿La indemnización por despido y el seguro de paro son lo mismo?',
    short: 'No: una la paga el empleador, el otro lo paga el BPS',
    answer:
      'Son cosas distintas y compatibles. La indemnización por despido es una obligación del empleador que sale de las leyes 10.489, 10.542 y 12.597. El subsidio por desempleo es una prestación de seguridad social que paga el BPS y tiene sus propios requisitos y plazos. El art. 5 de la Ley 12.597 incluso contempla al subsidista de paro, que «se beneficiará de las indemnizaciones mayores que correspondan».',
  },
]

export const DESPIDO_SOURCES: readonly DespidoSource[] = [
  {
    label:
      'Ley 10.489 (06/06/1944), art. 4 — un mes de remuneración total por año o fracción de actividad, con límite de tres mensualidades con derecho a jubilación y seis como máximo en caso contrario; sin derecho por notoria mala conducta',
    url: 'https://www.impo.com.uy/bases/leyes/10489-1944',
  },
  {
    label:
      'Ley 10.542 (20/10/1944), art. 1 — extiende las garantías del art. 4 a los obreros y empleados de la industria y a toda actividad privada o servicio público a cargo de particulares',
    url: 'https://www.impo.com.uy/bases/leyes/10542-1944',
  },
  {
    label:
      'Ley 12.597 (30/12/1958), arts. 1 a 10 — indemnización parcial de dos días por cada veinticinco jornadas, definición de «derecho a jubilación» (más de diez años de servicios y cuarenta de edad), cómputo desde el ingreso, base salarial, recargo del 1 % mensual, servicio doméstico y carga de la prueba de la notoria mala conducta',
    url: 'https://www.impo.com.uy/bases/leyes/12597-1958',
  },
  {
    label:
      'Ley 18.091 (07/01/2007), arts. 1 a 4 — la acción prescribe al año del cese, los créditos a los cinco, y la audiencia de conciliación en el MTSS o la demanda interrumpen la prescripción',
    url: 'https://www.impo.com.uy/bases/leyes/18091-2007',
  },
  {
    label:
      'MTSS — «Despido (régimen común)»: alcance a industria, comercio y actividades privadas, no se exige antigüedad, y la notoria mala conducta la prueba el empleador',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/despido-regimen-comun',
  },
  {
    label:
      'MTSS — «Método de cálculo»: qué haberes de naturaleza salarial integran la remuneración total que sirve de base',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/despido-regimen-comun/metodo-calculo',
  },
]
