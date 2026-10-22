/**
 * Prescripción de la deuda PRIVADA: bancos, financieras, tarjetas y estudios de cobranza.
 *
 * El sitio ya contestaba la prescripción tributaria (`/prescripcion-de-deudas-con-el-estado-uruguay`,
 * `utils/dgiTaxes.ts`) y ahí la deuda privada figura como uno de los tres regímenes que la gente
 * mezcla, con una sola línea: «régimen civil y comercial, con plazos distintos según el título».
 * El plazo no estaba en ninguna parte del sitio, así que la página que separa los tres regímenes
 * dejaba al lector a mitad de camino justo en el régimen que más se pregunta.
 *
 * Todo lo que sigue se contrastó contra el texto oficial en impo.com.uy el día de
 * `PRIVATE_DEBT_VERIFIED_AT`, artículo por artículo, y cada plazo viaja con su cita textual. Ningún
 * número de este archivo se afirma sin `quote` y `url` propios: es la regla que `utils/cheques.ts` y
 * `utils/dgiTaxes.ts` ya aplican, y acá importa más que en otros archivos porque el lector típico
 * está decidiendo si contesta un reclamo por una deuda vieja.
 *
 * Lo que este archivo NO hace: decir a alguien que no pague. La prescripción no borra la deuda del
 * registro de incumplimientos (eso es `/salir-del-clearing`, otro reloj) y no se aplica sola.
 */

/** Fecha en la que se contrastó todo este archivo contra el texto oficial en impo.com.uy. */
export const PRIVATE_DEBT_VERIFIED_AT = '2026-10-22'

export interface PrescriptionTerm {
  /** Clave estable; la usan la página y los tests, nunca se muestra. */
  key: string
  /** El plazo como se escribe («5 años», «6 meses»). */
  term: string
  /** El plazo en MESES: es lo único comparable entre un plazo en años y uno en meses. */
  months: number
  /** Qué acción es la que prescribe, en una línea. */
  what: string
  /** Desde cuándo corre. */
  from: string
  /** Artículo que lo fija. */
  article: string
  /** La frase del artículo, textual. */
  quote: string
  url: string
}

/**
 * Los cuatro relojes del Código Civil y los dos de los títulos valores, de más corto a más largo.
 *
 * El orden importa y es el del lector: el primer plazo que se le cae encima al acreedor es el más
 * corto que su título tolere, no el general de diez años.
 */
export const PRESCRIPTION_TERMS: readonly PrescriptionTerm[] = Object.freeze([
  {
    key: 'cheque',
    term: '6 meses',
    months: 6,
    what: 'Las acciones del tenedor de un cheque contra el librador y los endosantes.',
    from: 'Desde que venció el plazo de presentación del cheque al cobro.',
    article: 'Ley de Cheques (Decreto-Ley 14.412), art. 68',
    quote:
      'Las acciones judiciales del tenedor contra el librador y los endosantes prescriben a los seis meses, contados desde el vencimiento del plazo de presentación del cheque para su cobro.',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14412-1975/68',
  },
  {
    key: 'vale',
    term: '3 años',
    months: 36,
    what: 'Toda acción contra quien firmó un vale, pagaré o conforme — el documento de las financieras.',
    from: 'Desde la fecha del vencimiento del documento.',
    article: 'Títulos Valores (Decreto-Ley 14.701), art. 116 por remisión del art. 125',
    quote:
      'Toda acción emergente de la letra de cambio contra el aceptante prescribe a los tres años, contados desde la fecha del vencimiento.',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14701-1977/116',
  },
  {
    key: 'intereses',
    term: '4 años',
    months: 48,
    what: 'Los ATRASOS de intereses de dinero prestado y de todo lo que se paga en cuotas periódicas.',
    from: 'Cada atraso corre por su cuenta, desde que se debía pagar.',
    article: 'Código Civil, art. 1222',
    quote:
      'Se prescribe por cuatro años la obligación de pagar los atrasos: 1º.- De pensiones alimenticias. 2º.- Del precio de los arriendos, bien sea la finca rústica o urbana. 3º.- De interés de dinero prestado. 4º.- De todo lo que debe pagarse por años o plazos periódicos más cortos.',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1222',
  },
  {
    key: 'ejecutar',
    term: '5 años',
    months: 60,
    what: 'El derecho a EJECUTAR, que es el juicio corto en el que no se discute si la deuda existe.',
    from: 'Desde que la deuda es exigible.',
    article: 'Código Civil, art. 1217',
    quote:
      'El derecho de ejecutar por acción personal se prescribe por cinco años contados como expresa el inciso segundo del artículo anterior. Transcurridos los cinco años, la acción no adquiere el carácter ejecutivo por la confesión judicial del deudor, ni por el reconocimiento que haga del documento privado.',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1217',
  },
  {
    key: 'personal',
    term: '10 años',
    months: 120,
    what: 'La acción personal por la deuda, o sea el juicio común donde sí se discute todo.',
    from: 'Desde que la deuda es exigible.',
    article: 'Código Civil, art. 1216',
    quote:
      'Toda acción personal por deuda exigible se prescribe por diez años, sin perjuicio de lo que al respecto dispongan leyes especiales. El tiempo comenzará a correr desde que la deuda es exigible.',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1216',
  },
])

/** El de ejecutar y el de demandar, que son los dos que el lector confunde con uno solo. */
export const EXECUTIVE_TERM = PRESCRIPTION_TERMS.find(t => t.key === 'ejecutar')!
export const ORDINARY_TERM = PRESCRIPTION_TERMS.find(t => t.key === 'personal')!

/**
 * La trampa más cara, y es la misma que en la deuda tributaria: el plazo no se aplica solo.
 *
 * Un juez no puede declararla de oficio, así que una deuda prescrita por la que no se opone la
 * excepción termina en sentencia de condena igual.
 */
export const NOT_AUTOMATIC =
  'El plazo no corre solo: la prescripción hay que OPONERLA en el juicio. El Código Civil permite hacerlo en cualquier estado de la causa hasta que esté para sentencia, en primera o segunda instancia, pero agrega que «los Jueces no pueden suplir de oficio la excepción que resulta de la prescripción» (art. 1191). Una deuda vencida hace quince años por la que nadie opuso la excepción se cobra igual.'

export const NOT_AUTOMATIC_SOURCE = 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1191'

export interface InterruptionCause {
  label: string
  detail: string
  article: string
  url: string
}

/**
 * Qué vuelve el contador a cero. Las dos que importan son de signo opuesto: una la provoca el
 * acreedor y la otra el propio deudor sin saberlo.
 */
export const INTERRUPTION_CAUSES: readonly InterruptionCause[] = Object.freeze([
  {
    label: 'Que te notifiquen un emplazamiento judicial',
    detail:
      'Toda prescripción se interrumpe civilmente por el emplazamiento judicial notificado al deudor, y vale aunque lo haya dado un juez incompetente o sea nulo por vicio de forma. No alcanza con que el acreedor haya iniciado el juicio: la interrupción es la notificación.',
    article: 'Código Civil, art. 1235',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1235',
  },
  {
    label: 'Reconocer la deuda',
    detail:
      'El Código le da al reconocimiento del deudor el mismo efecto interruptivo que a la interpelación, y lo extiende a los codeudores solidarios: «La interpelación hecha conforme a los artículos precedentes a uno de los deudores solidarios o su reconocimiento, interrumpe la prescripción contra todos los demás y aun contra sus herederos». Por eso un acuerdo de pago, un pago a cuenta o una firma sobre una deuda vieja no es un trámite neutro.',
    article: 'Código Civil, art. 1240',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1240',
  },
])

/**
 * Por qué un resumen viejo de esto no sirve, dicho sin inventar el número anterior.
 *
 * Los artículos 1215, 1216 y 1217 tienen la redacción que les dio la Ley 19.889 (LUC) en su
 * artículo 463 — eso lo dice la nota al pie de cada artículo en impo—, y el encabezado de la propia
 * sección que los contiene todavía anuncia plazos que sus artículos ya no dicen todos. No se afirma
 * acá cuánto decían antes: lo verificable es la fecha de la redacción vigente, y es el dato que le
 * sirve al lector para desconfiar de un resumen sin fecha.
 */
export const REWRITTEN_IN_2020 =
  'La redacción vigente de los artículos 1215, 1216 y 1217 es la que les dio la Ley 19.889 (LUC) en su artículo 463, del 9 de julio de 2020. El encabezado de la sección que los contiene sigue diciendo «DE LAS PRESCRIPCIONES DE TREINTA, VEINTE Y DIEZ AÑOS» mientras los artículos de abajo hablan de veinte, diez y cinco. Si estás leyendo un resumen sin fecha, puede ser anterior a esa reforma.'

export const REWRITE_SOURCE = 'https://www.impo.com.uy/bases/leyes/19889-2020/463'

export interface PrivateDebtFaq {
  question: string
  short: string
  answer: string
}

export const PRIVATE_DEBT_FAQ: readonly PrivateDebtFaq[] = Object.freeze([
  {
    question: '¿Cuándo prescribe una deuda con un banco o una financiera?',
    short: 'Depende del documento que firmaste, no del acreedor',
    answer:
      'No hay un plazo único por ser «deuda bancaria»: lo fija el título. Si firmaste un vale, pagaré o conforme —el documento habitual de un crédito al consumo—, la acción contra quien lo firmó prescribe a los tres años del vencimiento (Decreto-Ley 14.701, art. 116, aplicable por remisión del art. 125). Si no hay título valor, el derecho a ejecutar prescribe a los cinco años y la acción personal por la deuda a los diez, en los dos casos desde que la deuda es exigible (Código Civil, arts. 1217 y 1216).',
  },
  {
    question: '¿Por qué hay dos plazos, cinco y diez años?',
    short: 'Porque son dos juicios distintos',
    answer:
      'Son dos acciones diferentes sobre la misma deuda. A los cinco años se le cae al acreedor el derecho de EJECUTAR, que es la vía corta donde se discute poco; el artículo 1217 agrega que, pasados los cinco años, la acción ya no recupera el carácter ejecutivo ni por la confesión judicial del deudor ni porque reconozca el documento privado. Lo que le queda hasta los diez años es la acción personal del artículo 1216, el juicio común. Que no puedan ejecutarte no significa que no puedan demandarte.',
  },
  {
    question: 'Si la deuda prescribió, ¿me sacan del Clearing?',
    short: 'No: son dos relojes distintos',
    answer:
      'No. La prescripción es un plazo para reclamar en juicio y la permanencia en un registro de incumplimientos es otra cosa, con su propio plazo y su propia norma. Una cosa no arrastra a la otra, así que una deuda prescrita puede seguir figurando y una deuda ya borrada del registro puede seguir siendo reclamable. El plazo del registro está en la página del Clearing.',
  },
  {
    question: '¿Me conviene pagar algo para «mostrar buena fe»?',
    short: 'Un pago a cuenta puede reiniciar el plazo',
    answer:
      'Ese es el error más caro de todos. El reconocimiento de la deuda por el propio deudor interrumpe la prescripción, y el artículo 1240 le da ese efecto incluso frente a los codeudores solidarios. Un pago a cuenta, un acuerdo de refinanciación o una firma sobre una deuda vieja pueden volver el contador a cero y dejar al acreedor con el plazo entero otra vez. Antes de reconocer o pagar una deuda vieja, consultá.',
  },
  {
    question: 'Me llama un estudio de cobranza por una deuda de hace años, ¿qué puedo hacer?',
    short: 'Que te llamen no interrumpe nada',
    answer:
      'Una llamada, una carta o un mensaje de un estudio de cobranza no interrumpen la prescripción: el Código Civil exige el emplazamiento judicial NOTIFICADO al deudor (art. 1235). Lo que sí la interrumpe es lo que hagas vos reconociendo la deuda. Pedí por escrito de qué deuda se trata, de qué fecha y con qué documento, y no reconozcas nada hasta saberlo.',
  },
  {
    question: '¿Y los intereses de una deuda que sigue viva?',
    short: 'Los atrasos prescriben a los cuatro años',
    answer:
      'Los atrasos del interés de dinero prestado, y en general de todo lo que debe pagarse por años o plazos periódicos más cortos, prescriben a los cuatro años (Código Civil, art. 1222). Es un plazo que corre sobre cada atraso por separado, así que puede haber capital exigible con parte de los intereses ya prescritos.',
  },
])

export interface PrivateDebtSource {
  label: string
  url: string
}

export const PRIVATE_DEBT_SOURCES: readonly PrivateDebtSource[] = Object.freeze([
  {
    label: 'Código Civil art. 1191 — la prescripción no se suple de oficio',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1191',
  },
  {
    label: 'Código Civil art. 1216 — acción personal por deuda exigible: diez años',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1216',
  },
  {
    label: 'Código Civil art. 1217 — derecho de ejecutar: cinco años',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1217',
  },
  {
    label: 'Código Civil art. 1222 — atrasos de intereses y de cuotas periódicas: cuatro años',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1222',
  },
  {
    label: 'Código Civil art. 1235 — interrupción por emplazamiento judicial notificado',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1235',
  },
  {
    label: 'Código Civil art. 1240 — el reconocimiento del deudor interrumpe',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1240',
  },
  {
    label: 'Ley 19.889 (LUC) art. 463 — redacción vigente de los arts. 1215 a 1217',
    url: 'https://www.impo.com.uy/bases/leyes/19889-2020/463',
  },
  {
    label: 'Decreto-Ley 14.701 art. 116 — prescripción de la letra de cambio',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14701-1977/116',
  },
  {
    label: 'Decreto-Ley 14.701 art. 124 — el vale es título ejecutivo sin protesto',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14701-1977/124',
  },
  {
    label: 'Decreto-Ley 14.701 art. 125 — a los vales se les aplican las reglas de la letra',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14701-1977/125',
  },
  {
    label: 'Decreto-Ley 14.412 art. 68 — prescripción de las acciones del cheque',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14412-1975/68',
  },
])
