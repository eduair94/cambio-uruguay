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
// LAS DOS FECHAS, CON LO QUE LAS FIJA CADA UNA (corregido el 2026-09-22). La Ley 12.840 (art. 1)
// manda pagar «dentro de los diez días anteriores al 24 de diciembre». El Decreto-Ley 14.525 faculta
// al Poder Ejecutivo a partirlo en dos: «lo generado hasta el 31 de mayo dentro del mes de junio y
// el complemento antes del 24 de diciembre». O sea que el TOPE de la primera cuota no es un
// misterio: es el 30 de junio. Lo que cambia cada año es el decreto que ejerce esa facultad (el de
// 2026 es el Decreto 113/026, promulgado el 29/05/2026) y, en la segunda cuota, la fecha en que el
// decreto ACORTA el plazo legal: para 2026 dice «hasta el 20 del mes de diciembre». Una versión
// anterior de este archivo decía que la fecha de junio «sale un día impredecible» y que el único
// plazo firme era el del 24: las dos frases eran imprecisas y se corrigieron con la letra de las
// normas.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: ningún monto ni porcentaje de descuento (el aguinaldo es la
// doceava parte de lo cobrado, un número propio de cada recibo), una fecha de junio 2026 para la
// construcción (el BPS no la anunció; la última edición documentada es la de diciembre de 2025), y
// quién liquida la cuota parte de aguinaldo de un accidentado en el BSE (ninguna fuente primaria lo
// dice). En cada caso se nombra el organismo y se linkea su página, en vez de inventar la respuesta.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-24, ampliadas el 2026-09-16 y contrastadas de nuevo el
// 2026-09-22 contra IMPO, MTSS, BPS y DGI (ver AGUINALDO_SOURCES para la lista completa):
//   - Ley 12.840 (22/12/1960) — crea el sueldo anual complementario: plazo (art. 1), base (art. 2),
//     proporcionalidad al egreso (art. 3), mismo régimen que el salario (art. 4), multa del doble
//     (art. 7). El art. 6 exigió un año de antigüedad SÓLO para el aguinaldo de 1960.
//   - Decreto-Ley 14.525 (27/05/1976) — faculta el pago en dos etapas.
//   - Decreto 113/026 (29/05/2026) — el decreto del año: junio y hasta el 20 de diciembre de 2026.
//   - Decreto 122/026 (03/06/2026) — el aguinaldo de junio de los funcionarios públicos (DL 14.360).
//   - Ley 18.572 (2009), art. 29 — recargo del 10 % por la mora en cualquier crédito laboral.
//   - Ley 18.091 (2007) — prescripción: un año desde el cese, cinco desde la exigibilidad.
//   - Decreto-Ley 14.407, art. 28, y Ley 19.161, arts. 6 y 9 — la cuota parte de aguinaldo en los
//     subsidios por enfermedad, maternidad y paternidad.
//   - BPS, Partidas salariales de Construcción, y Decreto 951/975 — el aguinaldo de la construcción
//     lo liquida el BPS con la aportación unificada de la Ley 14.411 (NO el Fondo Social).
//   - DGI, IRPF para trabajadores dependientes (11/06/2026) — el aguinaldo legal tributa aparte.
// Nota aparte: la Ley 16.101 NO es una fuente del aguinaldo —regula el salario vacacional—, así que
// no aparece en este archivo ni debería aparecer en ninguna cita sobre el SAC.

export interface AguinaldoSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const AGUINALDO_VERIFIED_AT = '2026-09-22'

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
 * Las dos cuotas del aguinaldo. La de junio tiene tope legal —«dentro del mes de junio», o sea el
 * 30—; la de diciembre tiene el techo de la ley (los diez días anteriores al 24) y, cada año, la
 * fecha más corta que fija el decreto: en 2026, el 20 de diciembre.
 */
export const AGUINALDO_MILESTONES: readonly AguinaldoMilestone[] = [
  {
    key: 'primera',
    label: 'Primera mitad (medio aguinaldo)',
    when: 'Dentro del mes de junio: el tope es el 30 de junio (en 2026 cayó martes)',
    source: 'Decreto-Ley 14.525, art. 1 + Decreto 113/026, art. 1',
    detail:
      'El pago en dos cuotas no lo manda la Ley 12.840: lo habilita el Decreto-Ley 14.525, que faculta al Poder Ejecutivo a pagar «lo generado hasta el 31 de mayo dentro del mes de junio». Cada año un decreto ejerce esa facultad —el de 2026 es el Decreto 113/026, del 29 de mayo— y repite la misma regla, así que el tope de la primera cuota es siempre el último día de junio. La primera cuota comprende lo cobrado de diciembre a mayo.',
  },
  {
    key: 'segunda',
    label: 'Segunda mitad',
    when: 'Hasta el 20 de diciembre de 2026 (domingo), por decreto; la ley fija el techo en los diez días anteriores al 24 de diciembre',
    source: 'Ley 12.840, art. 1 + Decreto 113/026, art. 1',
    detail:
      'La Ley 12.840 obliga a pagar el aguinaldo «dentro de los diez días anteriores al 24 de diciembre», o sea entre el 14 y el 23. El decreto anual acorta ese plazo: el Decreto 113/026 dice que lo generado del 1.º de junio al 30 de noviembre de 2026 se paga «hasta el 20 del mes de diciembre». Un pago el 22 de diciembre de 2026 cumple la ley, pero no el decreto. El decreto no dice nada sobre días inhábiles, y el 20 de diciembre de 2026 es domingo.',
  },
]

// ---------------------------------------------------------------------------
// El calendario 2026, con la norma que fija cada fila
// ---------------------------------------------------------------------------

/**
 * El decreto del Poder Ejecutivo que fija, para lo generado en 2026, el calendario de pago del
 * sector privado. No inventa nada nuevo sobre el techo legal de diciembre: lo acorta y le pone
 * fecha. Leído en IMPO el 2026-09-22.
 */
export const AGUINALDO_2026_DECREE = {
  number: 'Decreto 113/026',
  promulgatedOn: '29 de mayo de 2026',
  publishedOn: '5 de junio de 2026',
  url: 'https://www.impo.com.uy/bases/decretos/113-2026',
  juneDeadline: '30 de junio de 2026',
  juneNote:
    'Lo generado hasta el 31 de mayo de 2026 se paga dentro del mes de junio de 2026: el tope es el 30 de junio.',
  decemberDeadline: '20 de diciembre de 2026',
  decemberWeekday: 'domingo',
  decemberNote:
    'Lo generado entre el 1.º de junio y el 30 de noviembre de 2026 se paga hasta el 20 de diciembre de 2026, que cae domingo; el decreto no prevé días inhábiles.',
  // El decreto de 2024 decía «antes del 20 de diciembre»; el de 2026 dice «hasta el 20» (inclusivo).
  // Va dicho porque la diferencia es un día. Sólo se contrastó el de 2024: no se afirma nada de
  // otros años.
  wordingNote:
    'El decreto de 2024 decía «antes del 20 del mes de diciembre»; el de 2026 dice «hasta el 20», que incluye ese día.',
}

export interface AguinaldoCalendarRow {
  readonly who: string
  readonly june: string
  readonly december: string
  readonly norm: string
}

/**
 * Tres regímenes, tres calendarios. La Ley 12.840 alcanza a los patronos privados y a las personas
 * públicas no estatales; los funcionarios públicos tienen norma propia (Decreto-Ley 14.360) y
 * decreto propio; los trabajadores de la construcción cobran del BPS con períodos distintos.
 */
export const AGUINALDO_2026_CALENDAR: readonly AguinaldoCalendarRow[] = [
  {
    who: 'Sector privado (empleador privado o persona pública no estatal)',
    june: 'Lo generado hasta el 31 de mayo, dentro de junio: tope 30 de junio de 2026',
    december: 'Lo generado del 1.º de junio al 30 de noviembre, hasta el 20 de diciembre de 2026',
    norm: 'Ley 12.840, art. 1; Decreto-Ley 14.525; Decreto 113/026',
  },
  {
    who: 'Funcionarios públicos (incisos del Presupuesto Nacional)',
    june: 'Desde el 18 de junio de 2026: la doceava parte de lo cobrado con montepío del 1.º de diciembre de 2025 al 31 de mayo de 2026',
    december: 'La cuota de diciembre de 2026 todavía no tiene decreto (al 22 de setiembre de 2026)',
    norm: 'Decreto-Ley 14.360; Decreto 122/026',
  },
  {
    who: 'Construcción (trabajadores de la Ley 14.411)',
    june: 'El BPS paga la primera parte, que cubre de noviembre del año anterior a abril',
    december:
      'El BPS paga la segunda parte, de mayo a octubre, junto con licencia y salario vacacional; en 2025 estuvo disponible desde el 12 de diciembre',
    norm: 'Ley 14.411; Decreto 951/975, art. 1; BPS, Partidas salariales de Construcción',
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
 * diciembre (Ley 12.840, art. 2: «la totalidad de las prestaciones en dinero originadas en la
 * relación de trabajo que tengan carácter remuneratorio»). La palabra «dinero» es la que decide,
 * con una excepción escrita en otra ley: la alimentación y la vivienda del trabajador rural.
 */
export const AGUINALDO_BASE_RULES: readonly AguinaldoBaseRule[] = [
  {
    item: 'Sueldo o jornal en dinero',
    counts: true,
    detail:
      'El salario pagado en efectivo o depositado es el núcleo de la base (Ley 12.840, art. 2).',
  },
  {
    item: 'Horas extra, nocturnidad, comisiones y viáticos sujetos a montepío',
    counts: true,
    detail:
      'Todo lo que se cobró en dinero con carácter remuneratorio durante los doce meses integra el total que después se divide entre doce.',
  },
  {
    item: 'Alimentación y vivienda del trabajador rural',
    counts: true,
    detail:
      'Es la excepción a la regla del dinero: la Ley 13.619 (art. 1) manda computarlas aunque se paguen en especie, valuadas por el ficto legal. El MTSS lo repite en su página del aguinaldo.',
  },
  {
    item: 'Tickets de alimentación',
    counts: false,
    detail:
      'No integran el aguinaldo porque no son una partida en dinero. El MTSS aclara en sus preguntas frecuentes que sí cuentan para la licencia, el salario vacacional y la indemnización por despido.',
  },
  {
    item: 'Salario vacacional',
    counts: false,
    detail:
      'El Decreto 49/000 (art. 2) declara que la suma para el mejor goce de la licencia no es remuneratoria y no se computa para el aguinaldo.',
  },
  {
    item: 'Participación en las ganancias de la empresa y el aguinaldo del año anterior',
    counts: false,
    detail:
      'La propia Ley 12.840 (art. 2) los deja afuera: ni las habilitaciones o participaciones en los beneficios ni el sueldo anual complementario ya cobrado.',
  },
  {
    item: 'Otras prestaciones en especie (fuera del caso rural)',
    counts: false,
    detail: 'Lo que no se paga en dinero queda fuera de la base del aguinaldo.',
  },
]

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

/**
 * El aguinaldo del período: la doceava parte del total de salarios pagados EN DINERO en los doce
 * meses anteriores al 1.º de diciembre (Ley 12.840, art. 2). Es una división por doce fijada por la
 * ley, no una cifra inventada: por eso vive acá y no en la página.
 */
export function aguinaldoFromCashSalaries(totalCashSalaries: number): number {
  const safe = Number.isFinite(totalCashSalaries) ? Math.max(0, totalCashSalaries) : 0
  return safe / 12
}

/**
 * La parte proporcional que corresponde al egreso: la doceava parte de lo cobrado en dinero durante
 * los meses efectivamente trabajados del período. Se usa cuando alguien renuncia o lo despiden antes
 * de fin de año (salvo despido por notoria mala conducta, que lo hace perder). La ley no exige
 * antigüedad mínima: el art. 6 de la Ley 12.840 pidió un año SÓLO para el aguinaldo de 1960.
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
    label: 'Recargo del 10 % a tu favor',
    detail:
      'La omisión de pago de cualquier crédito laboral —el aguinaldo incluido— genera automáticamente, desde que es exigible, un recargo del 10 % sobre el monto adeudado. Es lo que sí va al trabajador.',
    source: 'Ley 18.572, art. 29',
  },
  {
    label: 'Multa del doble',
    // La ley no dice "el doble de lo adeudado": dice "el doble del monto del sueldo anual
    // complementario". No es lo mismo cuando te pagaron una parte, así que va la palabra de la ley.
    // Y es una sanción: su percepción y destino se rigen por la Ley 5.427, no la cobra el trabajador.
    detail:
      'El empleador que viola la ley del aguinaldo es sancionado con una multa equivalente al doble del monto del sueldo anual complementario de cada trabajador. Es una sanción cuya percepción y destino rige la Ley 5.427: la cobra el Estado, no vos.',
    source: 'Ley 12.840, art. 7',
  },
]

export interface AguinaldoComplaintChannel {
  readonly office: string
  readonly address: string
  readonly hours: string
  readonly email: string
  readonly phones: readonly string[]
  /** La IGTSS sólo recibe denuncias con vínculo laboral vigente. */
  readonly onlyWhileEmployed: string
  /** A dónde va quien ya no trabaja ahí. */
  readonly afterLeaving: string
  /** Dónde se calculan las liquidaciones (la IGTSS no las hace). */
  readonly liquidations: string
  /** Hasta cuándo se puede reclamar. */
  readonly prescription: string
}

/** Dónde se denuncia un aguinaldo no pagado, pagado de menos o pagado fuera de plazo. */
export const AGUINALDO_COMPLAINT_CHANNEL: AguinaldoComplaintChannel = {
  office:
    'Inspección General del Trabajo y de la Seguridad Social (MTSS), Oficina de Asesoramiento y Denuncias',
  address: 'Oficina 108, 1er piso del MTSS, Juncal 1511, Montevideo',
  hours: 'Lunes a viernes de 09:00 a 16:00 h',
  email: 'asesoramientoydenuncias@mtss.gub.uy',
  phones: ['(+598) 1928', '(+598) 2915 2020', 'Call Center 0800 7171 (o *7171 desde Antel)'],
  onlyWhileEmployed:
    'La Inspección recibe denuncias —anónimas— sólo si el vínculo laboral está vigente y la infracción está ocurriendo. Si el aguinaldo impago es del semestre pasado y seguís trabajando ahí, el camino es la División Consultas de DINATRA, con agenda previa al 0800 7171.',
  afterLeaving:
    'Si ya no trabajás en la empresa, el reclamo va al Centro de Asesoramiento del MTSS (Juncal 1511, planta baja) o a las Oficinas de Trabajo del Interior.',
  liquidations:
    'La Inspección no calcula liquidaciones: eso se hace exclusivamente en la Dirección Nacional de Trabajo (DINATRA).',
  prescription:
    'Las acciones prescriben al año contado desde el día siguiente al cese de la relación laboral, y cada crédito a los cinco años desde que fue exigible (Ley 18.091, arts. 1 y 2). La sola presentación en el MTSS pidiendo audiencia de conciliación interrumpe ese plazo (art. 3).',
}

// ---------------------------------------------------------------------------
// «En negro»: el derecho existe, lo que falta es la prueba
// ---------------------------------------------------------------------------

/**
 * La Ley 12.840 obliga a «todo patrono»: el aguinaldo nace de la relación de trabajo, no del
 * registro en el BPS. Lo que cambia en el trabajo no registrado es que hay que PROBAR el vínculo, y
 * las tres puertas para eso son públicas y con fecha.
 */
export const AGUINALDO_UNREGISTERED = {
  right:
    'Sí, te corresponde: la Ley 12.840 (art. 1) obliga a todo patrono, y el derecho al aguinaldo nace de la relación de trabajo, no de que el empleador te haya declarado en el BPS. Lo que no tenés es el recibo que lo prueba, así que el reclamo empieza por juntar prueba: mensajes, transferencias, horarios, testigos.',
  steps: [
    'Denunciá la actividad no declarada al BPS: el servicio en línea «Denunciar diferencias de salarios y actividades no declaradas» (con usuario personal) sirve para actividades no declaradas o mal declaradas desde el 1.º de abril de 1996 y admite adjuntar recibos, sentencias u otros documentos; el BPS inspecciona y, si prueba la dependencia, reconstruye tu historia laboral.',
    'Con el vínculo vigente, denunciá en la Inspección General del Trabajo (es anónima); si ya te fuiste, pedí asesoramiento en el Centro de Asesoramiento del MTSS y la liquidación en DINATRA (0800 7171).',
    'Si el empleador no paga, el crédito se reclama en un juicio laboral; el plazo es un año desde el día siguiente al cese (Ley 18.091) y pedir la audiencia de conciliación en el MTSS lo interrumpe.',
  ],
}

// ---------------------------------------------------------------------------
// Régimen especial: construcción
// ---------------------------------------------------------------------------

/**
 * En la construcción el mecanismo es otro: no paga el empleador de mano propia, paga el BPS con la
 * aportación unificada de la Ley 14.411. NO es el Fondo Social de la Construcción, que es una
 * prestación distinta (Decreto 466/008) cuya página del BPS ni siquiera menciona el aguinaldo —una
 * versión anterior de este archivo los confundía y se corrigió el 2026-09-22.
 */
export const AGUINALDO_CONSTRUCTION = {
  mechanism:
    'A los trabajadores de la construcción comprendidos en la Ley 14.411, con tipo de aportación Construcción, el aguinaldo se lo liquida y paga el BPS, junto con la antigüedad, la licencia y el salario vacacional: la aportación unificada del sector comprende «las aportaciones que correspondan para el pago de la licencia anual, del sueldo anual complementario y de las sumas para el mejor goce de la licencia» (Decreto 951/975, art. 1).',
  periods:
    'Los períodos no son los del régimen general: en junio el BPS paga la primera parte, que cubre de noviembre del año anterior a abril; en diciembre paga la segunda, de mayo a octubre, junto con el primer período de licencia y salario vacacional (máximo 16 días). No cobran los trabajadores cuyas nóminas no estaban pagas al liquidarse las partidas.',
  lastEdition:
    'La última edición documentada por el BPS es la de diciembre de 2025: el pago estuvo disponible desde el 12 de diciembre de 2025 en redes de cobranza y en el Edificio Sede, con una liquidación complementaria por nóminas tardías desde el 19 de diciembre. Para junio de 2026 el BPS no publicó una fecha: esta página no la inventa.',
  notFondoSocial:
    'El Fondo Social de la Construcción es otra cosa: un fondo creado por convenio colectivo del grupo 9 (subgrupo 01), homologado por el Decreto 466/008, con aportes propios (patronal 1,2691 % y personal 0,5809 % desde enero de 2014). Su página oficial no menciona el aguinaldo.',
  irpfNote:
    'Cobrar estas partidas del BPS te pone en situación de multiempleo: el propio BPS avisa que el trabajador de la construcción queda obligado a presentar la declaración jurada anual de IRPF ante la DGI.',
}

// ---------------------------------------------------------------------------
// Licencia, enfermedad, accidente, maternidad y seguro de paro
// ---------------------------------------------------------------------------

export interface AguinaldoLeaveCase {
  readonly situation: string
  readonly detail: string
}

/**
 * Seis situaciones que generan la misma duda: ¿ese período cuenta para el aguinaldo y quién lo
 * paga? Cada respuesta se corta donde termina lo que la fuente oficial confirma. Para enfermedad,
 * maternidad y paternidad la ley lo dice con todas las letras; para el seguro de paro las normas no
 * prevén la cuota parte, y se dice así, como ausencia verificada, no como cita; para el accidente
 * de trabajo ninguna fuente primaria dice quién la liquida, y se remite al organismo.
 */
export const AGUINALDO_LEAVE_CASES: readonly AguinaldoLeaveCase[] = [
  {
    situation: 'Estuviste de licencia',
    // Esta fila NO tiene fuente oficial detrás: es un razonamiento a partir de la regla general de
    // la Ley 12.840 (el aguinaldo se calcula sobre los sueldos ABONADOS EN DINERO). Va marcada
    // como tal, en la primera línea de la celda, para que no se lea como una cita.
    detail:
      'Acá no hay una página oficial que lo diga: es un razonamiento, no una cita. La Ley 12.840 calcula el aguinaldo sobre los sueldos pagados en dinero, y durante la licencia seguís cobrando tu sueldo (el jornal de licencia), que se paga en dinero; de ahí se sigue que esos meses integran la base igual que los demás. Lo que no entra es el salario vacacional (Decreto 49/000). Si tu caso es dudoso, confirmalo en el MTSS.',
  },
  {
    situation: 'Tuviste subsidio por enfermedad (BPS)',
    detail:
      'Lo paga el BPS, no tu empleador. El Decreto-Ley 14.407 (art. 28) da al beneficiario «una parte proporcional del aguinaldo por el tiempo que esté cobrando subsidio», liquidada y pagada por el seguro de enfermedad —hoy el BPS—. La página del BPS (actualizada el 8 de setiembre de 2026) lo confirma: el subsidio es el 70 % de la materia gravada, sin contar el aguinaldo, con tope de $ 67.754 (valor 01/2026), «más la cuota parte de aguinaldo». Los días trabajados los liquida el empleador: son dos recibos.',
  },
  {
    situation: 'Accidente de trabajo (BSE)',
    detail:
      'Mientras dura la incapacidad temporaria, el BSE cubre dos tercios del jornal (66,67 %) y el BPS agrega el 3,33 % restante hasta llegar al 70 %, según la página del BPS de subsidio por enfermedad. Sobre la cuota parte de aguinaldo de ese período no hay fuente primaria: ni la ley de accidentes ni las páginas del BSE consultadas dicen quién la liquida, así que consultalo en el BSE o el BPS antes de darlo por hecho.',
  },
  {
    situation: 'Subsidio por maternidad o paternidad',
    detail:
      'La Ley 19.161 (arts. 6 y 9) incluye en el subsidio «la cuota parte correspondiente al sueldo anual complementario, licencia y salario vacacional» del período de amparo. El BPS lo repite en sus páginas de maternidad y paternidad: el 100 % del promedio de los seis meses anteriores más esa cuota parte, en un solo pago por todo el período.',
  },
  {
    situation: 'Estuviste en seguro de paro',
    detail:
      'Las normas no prevén una cuota parte de aguinaldo por el tiempo en el seguro: el Decreto-Ley 15.180 no menciona el aguinaldo, y la página del BPS de subsidio por desempleo por despido (actualizada el 26 de enero de 2026) define el monto como porcentajes del promedio —66 % el primer mes, con tope 2026 de $ 93.155— sin cuota parte, a diferencia de enfermedad, maternidad y paternidad, donde la ley la nombra. Lo generado antes de entrar al seguro te lo paga el empleador en la fecha normal, y el BPS no lo descuenta del subsidio: en un mes entero suspendido, aclara, el trabajador «solo puede haber cobrado aguinaldo y feriados pagos».',
  },
  {
    situation: 'Subsidio transitorio por incapacidad parcial',
    detail:
      'La página del BPS de esta prestación (actualizada el 13 de abril de 2026) no menciona el aguinaldo. Dura hasta tres años; si el nuevo dictamen configura incapacidad total, pasa a jubilación por incapacidad total, y un jubilado no cobra aguinaldo.',
  },
]

// ---------------------------------------------------------------------------
// Jubilados y pensionistas
// ---------------------------------------------------------------------------

/**
 * El BPS no llama "aguinaldo" a nada de lo que paga a pasivos, y la partida que sí existe es un
 * beneficio distinto: monto fijo, focalizado por ingreso, no proporcional al sueldo. No confundir.
 *
 * LA PARTIDA VA FECHADA. El monto y el tope de ingresos los fija el BPS edición por edición, y la
 * única que está publicada con su letra chica es la de 2025 (el corte de edad es "mayores de 65
 * años al 31/10/2025"). Publicar "$ 3.151" a secas, en un archivo verificado en 2026, lo hace leer
 * como la cifra de este año: es exactamente la falla que ya dejó la BPC de 2024 en el sitio
 * durante meses. El año viaja dentro del string, no sólo en un campo que la página podría no
 * renderizar. Al 22 de setiembre de 2026 el BPS no publicó la edición 2026.
 */
export const AGUINALDO_RETIREES = {
  headline: 'Los jubilados y pensionistas no cobran aguinaldo',
  detail:
    'El sueldo anual complementario es un derecho de quien trabaja en relación de dependencia, no de quien está jubilado o pensionista. El BPS no paga aguinaldo a pasivos.',
  benefit:
    'Lo que el BPS sí paga a fin de año es una partida especial —la "canasta de fin de año"—, focalizada en pasividades bajas: no es un aguinaldo, es un monto fijo y no una doceava parte del sueldo. En la edición 2025 fue de $ 3.151. El BPS vuelve a fijar el monto y el tope de ingresos cada año, así que la cifra de la edición siguiente sale de su página, no de esta.',
  eligibility:
    'En la edición 2025 correspondió a jubilados con pasividad de hasta $ 20.458 (3,111 BPC), y a pensionistas por sobrevivencia, vejez o invalidez y beneficiarios de Asistencia a la Vejez (Mides) mayores de 65 años al 31 de octubre de 2025 con ingresos hasta ese mismo tope, siempre que residieran en Uruguay y no percibieran otros ingresos públicos o privados.',
  amount: 3151,
  /** La edición de la partida a la que corresponden `amount` y `eligibility`. */
  amountYear: 2025,
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
    short: 'En 2026: la primera mitad hasta el 30 de junio y la segunda hasta el 20 de diciembre',
    answer:
      'La Ley 12.840 obliga a pagar el aguinaldo dentro de los diez días anteriores al 24 de diciembre, y el Decreto-Ley 14.525 permite partirlo: lo generado hasta el 31 de mayo se paga dentro de junio (tope 30 de junio) y el resto en diciembre. Cada año un decreto lo dispone y puede acortar el plazo de diciembre: el Decreto 113/026 fija para 2026 el pago de la segunda cuota hasta el 20 de diciembre, que cae domingo.',
  },
  {
    question: '¿Hasta cuándo pueden pagar el aguinaldo de diciembre de 2026?',
    short: 'Hasta el 20 de diciembre de 2026 (Decreto 113/026), que es domingo',
    answer:
      'Hasta el 20 de diciembre de 2026, según el artículo 1 del Decreto 113/026 (promulgado el 29 de mayo de 2026). La Ley 12.840 fija como techo los diez días anteriores al 24 de diciembre, pero el decreto anual lo adelanta: un pago el 22 de diciembre cumple la ley y no el decreto. Al 22 de setiembre de 2026 no hay un comunicado del MTSS específico de diciembre; cuando lo haya, la fecha que manda sigue siendo la del decreto.',
  },
  {
    question: '¿Cómo se calcula el aguinaldo?',
    short: 'La doceava parte de lo cobrado en dinero en el año',
    answer:
      'El aguinaldo es la doceava parte del total de los salarios pagados en dinero por el empleador en los doce meses anteriores al 1.º de diciembre (Ley 12.840, art. 2). Se suma todo lo cobrado en dinero con carácter remuneratorio en ese período y se divide entre doce. Cuando se paga en dos cuotas, cada una corresponde a su semestre: diciembre a mayo la de junio, junio a noviembre la de diciembre.',
  },
  {
    question: '¿Los tickets de alimentación cuentan para el aguinaldo?',
    short: 'No: el aguinaldo solo toma lo pagado en dinero',
    answer:
      'No. El aguinaldo se calcula sobre lo pagado en dinero, y los tickets de alimentación no son una partida en dinero. El MTSS aclara que los tickets sí se computan para la licencia, el salario vacacional y la indemnización por despido, pero no para el aguinaldo. Tampoco entra el salario vacacional (Decreto 49/000).',
  },
  {
    question: 'Me voy del trabajo antes de fin de año. ¿Cobro el aguinaldo igual?',
    short: 'Sí, la parte proporcional al tiempo trabajado',
    answer:
      'Sí. Cuando la relación laboral termina —por renuncia, jubilación o despido— el trabajador cobra el aguinaldo en proporción al tiempo de permanencia en la empresa (Ley 12.840, art. 3). La única excepción es el despido por notoria mala conducta, que hace perder el derecho a esa parte. Si te vas sin renunciar formalmente (abandono), el MTSS aclara que la empresa igual debe pagar el aguinaldo generado; lo que se pierde es la indemnización por despido.',
  },
  {
    question: '¿El aguinaldo tiene descuentos?',
    short: 'Sí: aportes jubilatorios como el sueldo, y el IRPF se calcula aparte',
    answer:
      'Sí. El aguinaldo está sujeto al mismo régimen legal que el salario (Ley 12.840, art. 4), así que lleva los descuentos jubilatorios del sueldo, como indica el MTSS. Y paga IRPF, pero aparte: la DGI grava el aguinaldo y el salario vacacional legales de forma independiente, con una tasa proporcional igual a la tasa marginal máxima que ya pagás por el resto de tus rentas de trabajo; no se suman a la escala ni te suben de franja. Sólo lo que exceda el mínimo legal (por convenio) se agrega a los ingresos comunes.',
  },
  {
    question: '¿Todos los trabajadores tienen derecho al aguinaldo?',
    short: 'Todo dependiente con salario en dinero; los públicos, por su propia norma',
    answer:
      'La Ley 12.840 alcanza a todo empleado de un patrono privado o de una persona pública no estatal que cobra un salario en dinero, con cualquier antigüedad. Los funcionarios públicos también lo cobran, pero por otra norma (Decreto-Ley 14.360) y con decreto propio: en 2026, el Decreto 122/026 fijó el cobro de la cuota de junio desde el 18 de junio. Los jubilados y pensionistas no cobran aguinaldo.',
  },
  {
    question: '¿Me corresponde aguinaldo si trabajé sólo 3 meses?',
    short: 'Sí, la doceava parte de lo cobrado en esos 3 meses',
    answer:
      'Sí. La Ley 12.840 no exige una antigüedad mínima: el trabajador cobra el aguinaldo «en proporción al tiempo de permanencia en la empresa» (art. 3). La exigencia de un año existió sólo para el aguinaldo de 1960 (art. 6), así que el empleador que la invoca hoy está equivocado. Si trabajaste 3 meses del semestre, te corresponde la doceava parte de lo que cobraste en dinero en esos 3 meses, no un aguinaldo completo.',
  },
  {
    question: '¿Y si estuve incapacitado, con subsidio por enfermedad?',
    short: 'El BPS paga la cuota parte de aguinaldo del tiempo en subsidio',
    answer:
      'La paga el BPS, no tu empleador. El Decreto-Ley 14.407 (art. 28) manda pagar al beneficiario una parte proporcional del aguinaldo por el tiempo en subsidio, y la página del BPS de subsidio por enfermedad (actualizada el 8 de setiembre de 2026) lo confirma: 70 % de la materia gravada, tope $ 67.754 (valor 01/2026), más la cuota parte de aguinaldo. Los días que trabajaste los liquida el empleador como siempre. Si estás en el BSE por accidente de trabajo, ninguna fuente primaria dice quién liquida esa cuota parte: consultalo en el BSE o el BPS.',
  },
  {
    question: '¿El seguro de paro genera aguinaldo?',
    short: 'Las normas no prevén cuota parte; lo generado antes se cobra igual',
    answer:
      'Las normas no lo prevén: el Decreto-Ley 15.180 no menciona el aguinaldo y el monto del subsidio en la página del BPS son porcentajes del promedio, sin cuota parte de aguinaldo, a diferencia de enfermedad, maternidad y paternidad, donde la ley la nombra. Lo que sí cobrás es lo generado antes de entrar al seguro, que el empleador paga en la fecha normal y el BPS no descuenta del subsidio.',
  },
  {
    question: '¿Me corresponde aguinaldo si estoy en negro?',
    short: 'Sí: el derecho nace de la relación de trabajo, no del registro',
    answer:
      'Sí. La Ley 12.840 obliga a todo patrono y el derecho nace de la relación de trabajo, no de que te hayan declarado en el BPS. Para cobrarlo hay que probar el vínculo: denuncia en línea al BPS («Denunciar diferencias de salarios y actividades no declaradas», con recibos, mensajes u otros documentos), asesoramiento en el MTSS y, si hace falta, juicio laboral. El plazo es un año desde que terminó la relación (Ley 18.091) y la sola presentación en el MTSS lo interrumpe.',
  },
  {
    question: '¿Qué pasa si no me pagan el aguinaldo a tiempo?',
    short: 'Recargo del 10 % a tu favor y multa del doble para el empleador',
    answer:
      'Desde el día en que venció corre automáticamente un recargo del 10 % sobre lo adeudado a tu favor (Ley 18.572, art. 29), y el empleador queda expuesto a una multa equivalente al doble del monto del sueldo anual complementario (Ley 12.840, art. 7), que cobra el Estado, no vos. Con vínculo vigente denunciás en la Inspección General del Trabajo del MTSS (Oficina 108, Juncal 1511); si el atraso es del semestre pasado, en la División Consultas de DINATRA; si ya te fuiste, en el Centro de Asesoramiento del MTSS. Tenés un año desde el cese para reclamar.',
  },
  {
    question: '¿Cuántos días de aguinaldo me corresponden?',
    short: 'El aguinaldo no se cuenta en días: es dinero, no días de licencia',
    answer:
      'El aguinaldo no se mide en días: es la doceava parte de todo lo que cobraste en dinero durante los doce meses anteriores al 1.º de diciembre (o durante los meses que trabajaste, si fue menos de un año). Los «15 días de sueldo» son de la ley mexicana y las cuentas por días, del marco argentino. Si la pregunta es por días, probablemente te referís a la licencia anual, que es un beneficio distinto con sus propias reglas de antigüedad.',
  },
]

export const AGUINALDO_SOURCES: readonly AguinaldoSource[] = [
  {
    label:
      'Ley 12.840 (22/12/1960) — crea el sueldo anual complementario: plazo (art. 1), base en dinero (art. 2), proporcional al egreso (art. 3), mismo régimen que el salario (art. 4), multa del doble (art. 7)',
    url: 'https://www.impo.com.uy/bases/leyes/12840-1960',
  },
  {
    label:
      'Decreto 113/026 (29/05/2026) — el decreto del aguinaldo 2026 para la actividad privada: junio y hasta el 20 de diciembre de 2026',
    url: 'https://www.impo.com.uy/bases/decretos/113-2026',
  },
  {
    label:
      'Decreto-Ley 14.525 (27/05/1976) — faculta al Poder Ejecutivo a disponer el pago del aguinaldo en dos etapas',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14525-1976',
  },
  {
    label:
      'MTSS — Gobierno decretó el pago de aguinaldo para el sector privado (16/06/2026): calendario 2026',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/comunicacion/noticias/gobierno-decreto-pago-aguinaldo-para-sector-privado',
  },
  {
    label:
      'Decreto 122/026 (03/06/2026) — aguinaldo de junio de 2026 de los funcionarios públicos: desde el 18 de junio, período 1/12/2025–31/5/2026',
    url: 'https://www.impo.com.uy/bases/decretos/122-2026',
  },
  {
    label:
      'MTSS — «Sueldo Anual Complementario o Aguinaldo»: notoria mala conducta, descuentos jubilatorios, fictos rurales y el decreto de cada año',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/sueldo-anual-complementario-aguinaldo',
  },
  {
    label:
      'MTSS — Preguntas frecuentes en materia laboral: los tickets de alimentación no integran el aguinaldo; el abandono de trabajo no hace perder el aguinaldo generado',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/preguntas-frecuentes/materia-laboral',
  },
  {
    label:
      'Decreto 49/000 (09/02/2000), art. 2 — el salario vacacional no se computa para el aguinaldo',
    url: 'https://www.impo.com.uy/bases/decretos/49-2000',
  },
  {
    label:
      'Ley 13.619 (10/10/1967), art. 1 — alimentación y vivienda del trabajador rural integran el aguinaldo',
    url: 'https://www.impo.com.uy/bases/leyes/13619-1967',
  },
  {
    label:
      'Ley 18.572, art. 29 — recargo automático del 10 % por la omisión de pago de créditos laborales, el aguinaldo incluido',
    url: 'https://www.impo.com.uy/bases/leyes/18572-2009/29',
  },
  {
    label:
      'Ley 18.091 (07/01/2007) — prescripción de los créditos laborales: un año desde el cese, cinco desde la exigibilidad; la presentación en el MTSS la interrumpe',
    url: 'https://www.impo.com.uy/bases/leyes/18091-2007',
  },
  {
    label:
      'MTSS — Denuncias laborales en la Inspección General del Trabajo: sólo con vínculo vigente; desvinculados al Centro de Asesoramiento; liquidaciones en DINATRA',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/denuncias-laborales',
  },
  {
    label:
      'BPS — Denuncias de trabajadores: actividades no declaradas o mal declaradas desde el 1/4/1996 (actualizado 13/03/2026)',
    url: 'https://www.bps.gub.uy/11439/denuncias-de-trabajadores.html',
  },
  {
    label:
      'Decreto-Ley 14.407, art. 28 — la parte proporcional del aguinaldo del subsidio por enfermedad la liquida y paga el seguro de enfermedad',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14407-1975',
  },
  {
    label:
      'BPS — Subsidio por enfermedad: 70 % de la materia gravada, tope $ 67.754 (01/2026), más la cuota parte de aguinaldo; reparto BSE/BPS en accidentes (actualizado 08/09/2026)',
    url: 'https://www.bps.gub.uy/4774/subsidio-por-enfermedad.html',
  },
  {
    label:
      'Ley 19.161 (2013), arts. 6 y 9 — los subsidios por maternidad y paternidad incluyen la cuota parte de aguinaldo del período de amparo',
    url: 'https://www.impo.com.uy/bases/leyes/19161-2013',
  },
  {
    label:
      'BPS — Subsidio por desempleo por despido: monto por porcentajes del promedio, sin cuota parte de aguinaldo; el aguinaldo no se descuenta del subsidio (actualizado 26/01/2026)',
    url: 'https://www.bps.gub.uy/4802/subsidio-por-desempleo-por-despido.html',
  },
  {
    label:
      'BPS — Subsidio por desempleo por suspensión: en un mes entero suspendido «solo puede haber cobrado aguinaldo y feriados pagos» (actualizado 26/01/2026)',
    url: 'https://www.bps.gub.uy/18239/subsidio-por-desempleo-por-suspension.html',
  },
  {
    label:
      'BPS — Partidas salariales de Construcción: el BPS liquida aguinaldo, licencia y salario vacacional a los trabajadores de la Ley 14.411; períodos noviembre–abril y mayo–octubre (actualizado 05/12/2025)',
    url: 'https://www.bps.gub.uy/16585/partidas-salariales-de-construccion.html',
  },
  {
    label:
      'Decreto 951/975, art. 1 — la aportación unificada de la construcción comprende los aportes para pagar el sueldo anual complementario',
    url: 'https://www.impo.com.uy/bases/decretos/951-1975',
  },
  {
    label:
      'BPS — Pago de licencia y aguinaldo de la construcción: disponible desde el 12 de diciembre de 2025 (última edición publicada)',
    url: 'https://www.bps.gub.uy/23733/pago-de-licencia-y-aguinaldo-de-la-construccion.html',
  },
  {
    label:
      'BPS — Fondo Social de la Construcción (Decreto 466/008): una prestación distinta, cuya página no menciona el aguinaldo',
    url: 'https://www.bps.gub.uy/10317/fondo-social-de-la-construccion.html',
  },
  {
    label:
      'DGI — IRPF para trabajadores dependientes (11/06/2026): el aguinaldo legal se grava aparte, a la tasa marginal máxima del resto de las rentas',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-para-trabajadores-dependientes',
  },
  {
    label:
      'BPS — Partida especial de fin de año para jubilados y pensionistas: $ 3.151 en la edición 2025, y por qué no es un aguinaldo',
    url: 'https://www.bps.gub.uy/23594/partida-especial-de-fin-de-ano-para-jubilados-y-pensionistas.html',
  },
]
