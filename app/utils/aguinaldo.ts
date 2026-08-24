// app/utils/aguinaldo.ts
// Datos de /cuando-se-cobra-el-aguinaldo-uruguay: cuándo se paga el aguinaldo (sueldo anual
// complementario) en Uruguay, cómo se calcula, quién lo cobra y qué descuentos tiene.
//
// POR QUÉ EXISTE: el sitio ya tiene la calculadora de aguinaldo en /herramientas, que resuelve
// «cuánto me toca». Pero la pregunta que más se busca cada junio y cada diciembre es otra —«¿cuándo
// se cobra?»— y ninguna página la contestaba con la fecha que fija la ley. Esta la contesta, y
// además aclara las tres cosas que la gente confunde: que la base es lo pagado EN DINERO (los
// tickets no entran), que al irte del trabajo cobrás la parte proporcional, y que el aguinaldo
// tiene los mismos descuentos jubilatorios que el sueldo.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: la fecha exacta de la primera cuota de junio. El Decreto-Ley
// 14.525 faculta al Poder Ejecutivo a fraccionar el pago en dos, y el Ejecutivo fija la fecha de la
// primera mitad por decreto cada año —sale un día impredecible de junio—. Poner una fecha fija sería
// inventarla: lo único que la LEY garantiza es el plazo de diciembre. Tampoco se publica ningún monto
// ni porcentaje de descuento: el aguinaldo es la doceava parte de lo cobrado, un número propio de
// cada recibo, y las tasas de aportes las fija la seguridad social.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-24 (ver AGUINALDO_SOURCES para la lista completa):
//   - MTSS, «Sueldo Anual Complementario o Aguinaldo» — página oficial del derecho laboral uruguayo:
//     Ley 12.840, plazo del 24 de diciembre, cálculo, proporcionalidad al egreso, notoria mala
//     conducta y descuentos jubilatorios.
//   - Ley 12.840 (22/12/1960) — crea el sueldo anual complementario.
//   - Decreto-Ley 14.525 (27/05/1976) — faculta el pago en dos cuotas.

export interface AguinaldoSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const AGUINALDO_VERIFIED_AT = '2026-08-24'

// ---------------------------------------------------------------------------
// Las dos fechas
// ---------------------------------------------------------------------------

export interface AguinaldoMilestone {
  readonly key: 'primera' | 'segunda'
  /** Etiqueta corta para la línea de tiempo. */
  readonly label: string
  /** Cuándo se paga, en el lenguaje de la norma o del decreto anual. */
  readonly when: string
  /** Qué la fija: la ley (plazo firme) o el decreto anual (fecha variable). */
  readonly source: string
  readonly detail: string
}

/**
 * Las dos cuotas del aguinaldo. La de diciembre tiene plazo LEGAL firme —dentro de los diez días
 * anteriores al 24—; la de junio la habilita el Decreto-Ley 14.525 y su fecha exacta la pone el
 * Poder Ejecutivo por decreto cada año, así que acá se describe, no se fija.
 */
export const AGUINALDO_MILESTONES: readonly AguinaldoMilestone[] = [
  {
    key: 'primera',
    label: 'Primera mitad (medio aguinaldo)',
    when: 'En junio, en la fecha que fija el decreto de cada año',
    source: 'Decreto-Ley 14.525 + decreto anual del Poder Ejecutivo',
    detail:
      'El pago en dos cuotas no lo manda la Ley 12.840: lo habilita el Decreto-Ley 14.525, que faculta al Poder Ejecutivo a fraccionarlo. Por eso la fecha de la primera mitad cambia todos los años y se conoce recién cuando sale el decreto, unos días antes. La primera cuota comprende el semestre corrido hasta mayo.',
  },
  {
    key: 'segunda',
    label: 'Segunda mitad',
    when: 'Dentro de los diez días anteriores al 24 de diciembre',
    source: 'Ley 12.840',
    detail:
      'Este es el único plazo que fija la ley y no depende de ningún decreto: todo empleador tiene que haber pagado el aguinaldo dentro de los diez días anteriores al 24 de diciembre. Si el año se pagó en dos cuotas, en diciembre se abona la segunda mitad, que cubre el semestre que va de junio a noviembre.',
  },
]

// ---------------------------------------------------------------------------
// Qué integra la base y qué no
// ---------------------------------------------------------------------------

export interface AguinaldoBaseRule {
  readonly item: string
  /** true = integra la base del aguinaldo; false = queda afuera. */
  readonly counts: boolean
  readonly detail: string
}

/**
 * El aguinaldo es la doceava parte de lo pagado EN DINERO en los doce meses anteriores al 1.º de
 * diciembre. La palabra «dinero» es la que decide: lo que no se cobra en efectivo o en la cuenta no
 * entra, aunque sí cuente para otras partidas como la licencia o el despido.
 */
export const AGUINALDO_BASE_RULES: readonly AguinaldoBaseRule[] = [
  {
    item: 'Sueldo o jornal en dinero',
    counts: true,
    detail: 'El salario pagado en efectivo o depositado es el núcleo de la base.',
  },
  {
    item: 'Horas extra, nocturnidad, comisiones y viáticos sujetos a montepío',
    counts: true,
    detail:
      'Todo lo que se cobró en dinero durante los doce meses integra el total que después se divide entre doce.',
  },
  {
    item: 'Tickets de alimentación',
    counts: false,
    detail:
      'No integran el aguinaldo porque no son una partida en dinero, aunque el MTSS aclara que sí cuentan para la licencia y para la indemnización por despido.',
  },
  {
    item: 'Prestaciones en especie (vivienda, alimentación en especie)',
    counts: false,
    detail: 'Lo que no se paga en dinero queda fuera de la base del aguinaldo.',
  },
]

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

/**
 * El aguinaldo del período: la doceava parte del total de salarios pagados EN DINERO en los doce
 * meses anteriores al 1.º de diciembre (Ley 12.840, art. 1). Es una división por doce fijada por la
 * ley, no una cifra inventada: por eso vive acá y no en la página.
 */
export function aguinaldoFromCashSalaries(totalCashSalaries: number): number {
  const safe = Number.isFinite(totalCashSalaries) ? Math.max(0, totalCashSalaries) : 0
  return safe / 12
}

/**
 * La parte proporcional que corresponde al egreso: la doceava parte de lo cobrado en dinero durante
 * los meses efectivamente trabajados del período. Se usa cuando alguien renuncia o lo despiden antes
 * de fin de año (salvo despido por notoria mala conducta, que lo hace perder).
 */
export function aguinaldoProporcional(cashSalariesWorked: number): number {
  return aguinaldoFromCashSalaries(cashSalariesWorked)
}

// ---------------------------------------------------------------------------
// Preguntas y fuentes
// ---------------------------------------------------------------------------

export interface AguinaldoFaq {
  readonly question: string
  readonly short: string
  readonly answer: string
}

export const AGUINALDO_FAQ: readonly AguinaldoFaq[] = [
  {
    question: '¿Cuándo se cobra el aguinaldo en Uruguay?',
    short: 'La segunda mitad, antes del 24 de diciembre; la primera, en junio por decreto',
    answer:
      'La Ley 12.840 obliga a pagar el aguinaldo dentro de los diez días anteriores al 24 de diciembre. Desde el Decreto-Ley 14.525, el Poder Ejecutivo puede disponer el pago en dos cuotas: una primera mitad en junio y la otra en diciembre. La fecha exacta de la cuota de junio la fija un decreto cada año, así que cambia y se conoce recién cuando sale; lo único fijo por ley es el plazo de diciembre.',
  },
  {
    question: '¿Cómo se calcula el aguinaldo?',
    short: 'La doceava parte de lo cobrado en dinero en el año',
    answer:
      'El aguinaldo es la doceava parte del total de los salarios pagados en dinero por el empleador en los doce meses anteriores al 1.º de diciembre. Se suma todo lo cobrado en dinero en ese período y se divide entre doce. Cuando se paga en dos cuotas, cada una corresponde a su semestre.',
  },
  {
    question: '¿Los tickets de alimentación cuentan para el aguinaldo?',
    short: 'No: el aguinaldo solo toma lo pagado en dinero',
    answer:
      'No. El aguinaldo se calcula sobre lo pagado en dinero, y los tickets de alimentación no son una partida en dinero. El MTSS aclara que los tickets sí se computan para la licencia y para la indemnización por despido, pero no para el aguinaldo.',
  },
  {
    question: 'Me voy del trabajo antes de fin de año. ¿Cobro el aguinaldo igual?',
    short: 'Sí, la parte proporcional al tiempo trabajado',
    answer:
      'Sí. Cuando la relación laboral termina —por renuncia o por despido— el trabajador cobra el aguinaldo en proporción al tiempo trabajado en el período. La única excepción es el despido por notoria mala conducta, que hace perder el derecho a esa parte.',
  },
  {
    question: '¿El aguinaldo tiene descuentos?',
    short: 'Sí, los mismos descuentos jubilatorios que el sueldo',
    answer:
      'Sí. El MTSS indica que el aguinaldo está sujeto a los descuentos jubilatorios correspondientes al sueldo. Como el resto de las partidas salariales en dinero, integra la materia gravada de la seguridad social; el importe que termina en la cuenta es, entonces, el aguinaldo nominal menos esos aportes.',
  },
  {
    question: '¿Todos los trabajadores tienen derecho al aguinaldo?',
    short: 'Sí, todo empleado con salario en dinero',
    answer:
      'El aguinaldo es un derecho de todo trabajador dependiente que cobra un salario en dinero, tanto en la actividad privada como en el sector público. Se calcula sobre lo efectivamente pagado en dinero, así que un trabajador con pocos meses en el año cobra la parte proporcional de esos meses.',
  },
]

export const AGUINALDO_SOURCES: readonly AguinaldoSource[] = [
  {
    label:
      'MTSS — «Sueldo Anual Complementario o Aguinaldo»: Ley 12.840, plazo del 24 de diciembre, cálculo, proporcionalidad al egreso y descuentos jubilatorios',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/sueldo-anual-complementario-aguinaldo',
  },
  {
    label: 'Ley 12.840 (22/12/1960) — crea el sueldo anual complementario y fija su plazo de pago',
    url: 'https://www.impo.com.uy/bases/leyes/12840-1960',
  },
  {
    label:
      'Decreto-Ley 14.525 (27/05/1976) — faculta al Poder Ejecutivo a disponer el pago del aguinaldo en dos cuotas',
    url: 'https://www.impo.com.uy/bases/leyes/14525-1976',
  },
  {
    label:
      'MTSS — Preguntas frecuentes en materia laboral: la base del aguinaldo se toma sobre lo pagado en dinero (los tickets de alimentación no la integran)',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/preguntas-frecuentes/materia-laboral',
  },
]
