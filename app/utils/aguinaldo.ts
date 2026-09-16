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
// FUENTES PRIMARIAS, verificadas el 2026-08-24 y ampliadas el 2026-09-16 (ver AGUINALDO_SOURCES
// para la lista completa):
//   - MTSS, «Sueldo Anual Complementario o Aguinaldo» — página oficial del derecho laboral uruguayo:
//     Ley 12.840, plazo del 24 de diciembre, cálculo, proporcionalidad al egreso, notoria mala
//     conducta y descuentos jubilatorios.
//   - Ley 12.840 (22/12/1960) — crea el sueldo anual complementario, fija la multa del doble por
//     incumplimiento (art. 7) y la proporcionalidad al egreso (art. 3).
//   - Decreto-Ley 14.525 (27/05/1976) — faculta el pago en dos cuotas.
//   - Ley 18.572 (2009), art. 29 — recargo del 10 % por la mora en cualquier crédito laboral,
//     aguinaldo incluido.
//
// AMPLIACIÓN 2026-09-16: qué pasa si no te lo pagan (multa + recargo + dónde reclamar), el régimen
// especial de la construcción (Fondo Social, Decreto 466/008), licencia/enfermedad/seguro de paro,
// y por qué los jubilados no cobran aguinaldo. Dos aclaraciones a propósito de lo que NO se publica
// acá como hecho firme, porque las fuentes oficiales consultadas no lo detallan: la fórmula exacta
// del aguinaldo de la construcción, y si el seguro de paro genera o no una cuota parte de aguinaldo.
// En los dos casos se nombra el organismo y se linkea su página, en vez de inventar la respuesta.
// Nota aparte: la Ley 16.101 NO es una fuente del aguinaldo —regula el salario vacacional—, así que
// no aparece en este archivo ni debería aparecer en ninguna cita sobre el SAC.

export interface AguinaldoSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const AGUINALDO_VERIFIED_AT = '2026-09-16'

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
// El plazo, la mora y dónde reclamar
// ---------------------------------------------------------------------------

export interface AguinaldoConsequence {
  readonly label: string
  readonly detail: string
  readonly source: string
}

/**
 * Qué le pasa a un empleador que no paga el aguinaldo en plazo: una multa administrativa y, aparte,
 * un recargo automático a favor del trabajador. Son dos normas distintas y se acumulan.
 */
export const AGUINALDO_LATE_PAYMENT_CONSEQUENCES: readonly AguinaldoConsequence[] = [
  {
    label: 'Multa del doble',
    detail:
      'El empleador que viola el plazo de pago del aguinaldo es sancionado con una multa equivalente al doble del monto adeudado.',
    source: 'Ley 12.840, art. 7',
  },
  {
    label: 'Recargo del 10 % a tu favor',
    detail:
      'Aparte de la multa, la omisión de pago de cualquier crédito laboral —el aguinaldo incluido— genera automáticamente, desde que es exigible, un recargo del 10 % sobre el monto adeudado.',
    source: 'Ley 18.572, art. 29',
  },
]

export interface AguinaldoComplaintChannel {
  readonly office: string
  readonly address: string
  readonly hours: string
  readonly email: string
  readonly phones: readonly string[]
}

/** Dónde se denuncia un aguinaldo no pagado, pagado de menos o pagado fuera de plazo. */
export const AGUINALDO_COMPLAINT_CHANNEL: AguinaldoComplaintChannel = {
  office:
    'Inspección General del Trabajo y de la Seguridad Social (MTSS), Oficina de Asesoramiento y Denuncias',
  address: 'Oficina 108, 1er piso del MTSS, Juncal 1511, Montevideo',
  hours: 'Lunes a viernes de 09:00 a 16:00 h',
  email: 'asesoramientoydenuncias@mtss.gub.uy',
  phones: ['(+598) 1928', '(+598) 2915 2020', 'Call Center 0800 7171 (o *7171 desde Antel)'],
}

/**
 * El decreto del Poder Ejecutivo que reafirma, para lo generado en 2026, el calendario de pago del
 * sector privado. No inventa nada nuevo sobre el plazo legal de diciembre: lo confirma con fecha.
 */
export const AGUINALDO_2026_DECREE = {
  juneNote: 'Lo generado hasta el 31 de mayo de 2026 se paga en junio de 2026.',
  decemberDeadline: '20 de diciembre de 2026',
  decemberNote:
    'Lo generado entre el 1.º de junio y el 30 de noviembre de 2026 se paga hasta el 20 de diciembre de 2026.',
}

// ---------------------------------------------------------------------------
// Régimen especial: construcción
// ---------------------------------------------------------------------------

/**
 * En la construcción el mecanismo es otro: no paga el empleador de mano propia, paga un fondo
 * sectorial. La fórmula de cálculo exacta no está detallada en la página oficial de BPS consultada,
 * así que acá se nombra el organismo y se linkea su página en vez de inventarla (ver AGUINALDO_SOURCES).
 */
export const AGUINALDO_CONSTRUCTION = {
  mechanism:
    'En la construcción el aguinaldo no lo paga directamente el empleador: se financia a través del Fondo Social de la Construcción, creado por convenio colectivo del sector (grupo 9, subgrupo 01) y homologado por el Decreto 466/008.',
  administrator:
    'El BPS cobra los aportes patronal y personal del Fondo, y es quien liquida y paga el aguinaldo a cada trabajador de la construcción.',
  payWindow:
    'BPS habilita el pago a partir del 11 de junio para quienes cobran por depósito bancario, y del 14 al 17 de junio para quienes cobran en locales de pago descentralizado.',
  formulaNote:
    'La página oficial de BPS no detalla la fórmula exacta de cálculo para este régimen. Para tu caso puntual, consultá directamente la página de BPS sobre el Fondo Social de la Construcción.',
}

// ---------------------------------------------------------------------------
// Licencia, enfermedad y seguro de paro
// ---------------------------------------------------------------------------

export interface AguinaldoLeaveCase {
  readonly situation: string
  readonly detail: string
}

/**
 * Tres situaciones que generan dudas frecuentes. Cada respuesta se corta donde termina lo que la
 * fuente oficial confirma: para la enfermedad, el BPS lo dice con todas las letras; para el seguro
 * de paro, no hay una página de BPS con esa cita puntual, así que se remite al organismo en vez de
 * afirmar que "no genera aguinaldo" sin poder mostrarlo.
 */
export const AGUINALDO_LEAVE_CASES: readonly AguinaldoLeaveCase[] = [
  {
    situation: 'Estuviste de licencia',
    detail:
      'Durante la licencia seguís cobrando tu sueldo (el jornal de licencia), que se paga en dinero, así que esos meses integran la base del aguinaldo igual que los demás meses trabajados.',
  },
  {
    situation: 'Tuviste subsidio por enfermedad (BPS/DISSE)',
    detail:
      'El BPS aclara que el aguinaldo no se cuenta dentro de la base del 70 % del subsidio por enfermedad, pero que el subsidio sí genera su propia cuota parte de aguinaldo. Para cómo se liquida en tu caso, consultá la página oficial de BPS sobre subsidio por enfermedad.',
  },
  {
    situation: 'Estuviste en seguro de paro',
    detail:
      'El seguro de paro es una prestación distinta, que paga el BPS y no el empleador. La página de BPS consultada no detalla si genera o no una cuota parte de aguinaldo: consultalo directamente con el BPS antes de dar una respuesta por sentada.',
  },
]

// ---------------------------------------------------------------------------
// Jubilados y pensionistas
// ---------------------------------------------------------------------------

/**
 * El BPS no llama "aguinaldo" a nada de lo que paga a pasivos, y la partida que sí existe es un
 * beneficio distinto: monto fijo, focalizado por ingreso, no proporcional al sueldo. No confundir.
 */
export const AGUINALDO_RETIREES = {
  headline: 'Los jubilados y pensionistas no cobran aguinaldo',
  detail:
    'El sueldo anual complementario es un derecho de quien trabaja en relación de dependencia, no de quien está jubilado o pensionista. El BPS no paga aguinaldo a pasivos.',
  benefit:
    'Lo que el BPS sí paga a fin de año es una partida especial —la "canasta de fin de año"— de $ 3.151, focalizada en pasividades bajas. No es un aguinaldo: es un monto fijo, no una doceava parte del sueldo.',
  eligibility:
    'Corresponde a jubilados con pasividad de hasta $ 20.458 (3.111 BPC), y a pensionistas por sobrevivencia, vejez o invalidez y beneficiarios de Asistencia a la Vejez (Mides) mayores de 65 años con ingresos hasta ese mismo tope, siempre que residan en Uruguay y no perciban otros ingresos públicos o privados.',
  amount: 3151,
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
  {
    question: '¿Me corresponde aguinaldo si trabajé sólo 3 meses?',
    short: 'Sí, la doceava parte de lo cobrado en esos 3 meses',
    answer:
      'Sí. La Ley 12.840 no exige una antigüedad mínima: el trabajador que no estuvo todo el período de generación cobra el aguinaldo en proporción al tiempo de permanencia en el empleo. Si trabajaste 3 meses del semestre, te corresponde la parte proporcional a esos 3 meses de sueldo cobrado en dinero, no un aguinaldo completo.',
  },
  {
    question: '¿Y si estuve incapacitado, con subsidio por enfermedad?',
    short: 'El subsidio por enfermedad genera su propia cuota parte de aguinaldo',
    answer:
      'El BPS aclara que el aguinaldo no integra la base del 70 % del subsidio por enfermedad, pero que el subsidio sí genera su propia cuota parte de aguinaldo. Quien te paga en ese período es el BPS, no tu empleador, así que para el detalle de cómo se liquida esa cuota parte en tu caso conviene consultar directamente la página oficial de BPS sobre subsidio por enfermedad.',
  },
  {
    question: '¿Qué pasa si no me pagan el aguinaldo a tiempo?',
    short: 'Multa del doble para el empleador y recargo del 10 % a tu favor',
    answer:
      'El empleador que no paga el aguinaldo en plazo puede ser sancionado con una multa equivalente al doble del monto adeudado (Ley 12.840, art. 7), y además se genera automáticamente un recargo del 10 % sobre el monto adeudado a tu favor (Ley 18.572, art. 29). Podés denunciarlo en la Inspección General del Trabajo y de la Seguridad Social del MTSS.',
  },
  {
    question: '¿Cuántos días de aguinaldo me corresponden?',
    short: 'El aguinaldo no se cuenta en días: es dinero, no días de licencia',
    answer:
      'El aguinaldo no se mide en días: es la doceava parte de todo lo que cobraste en dinero durante los doce meses anteriores al 1.º de diciembre (o durante los meses que trabajaste, si fue menos de un año). Si la pregunta es por días, probablemente te referís a la licencia anual, que es un beneficio distinto con sus propias reglas de antigüedad.',
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
  {
    label:
      'Ley 18.572, art. 29 — recargo automático del 10 % por la omisión de pago de créditos laborales, el aguinaldo incluido',
    url: 'https://www.impo.com.uy/bases/leyes/18572-2009/29',
  },
  {
    label:
      'MTSS — Denuncias y asesoramiento en la Inspección General del Trabajo: dónde reclamar un aguinaldo no pagado o pagado fuera de plazo',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/denuncias-laborales',
  },
  {
    label:
      'MTSS — Gobierno decretó el pago de aguinaldo para el sector privado: calendario 2026 (junio y hasta el 20 de diciembre)',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/comunicacion/noticias/gobierno-decreto-pago-aguinaldo-para-sector-privado',
  },
  {
    label: 'BPS — Fondo Social de la Construcción: base legal (Decreto 466/008) y aportes',
    url: 'https://www.bps.gub.uy/10317/fondo-social-de-la-construccion.html',
  },
  {
    label: 'BPS — Pago de aguinaldo a trabajadores de la construcción: ventana de pago 2026',
    url: 'https://www.bps.gub.uy/18045/pago-de-aguinaldo-a-trabajadores-de-la-construccion.html',
  },
  {
    label: 'BPS — Subsidio por enfermedad: base del 70 % y cuota parte de aguinaldo',
    url: 'https://www.bps.gub.uy/4774/subsidio-por-enfermedad.html',
  },
  {
    label:
      'BPS — Partida especial de fin de año para jubilados y pensionistas: $ 3.151, y por qué no es un aguinaldo',
    url: 'https://www.bps.gub.uy/23594/partida-especial-de-fin-de-ano-para-jubilados-y-pensionistas.html',
  },
]
