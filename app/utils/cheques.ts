// app/utils/cheques.ts
// Datos de `/cheques-uruguay`: los plazos para cobrar un cheque en Uruguay, en qué se diferencia
// el de pago diferido, y qué pasa —de los dos lados del mostrador— cuando uno rebota.
//
// POR QUÉ EXISTE: el cheque era el único instrumento de pago uruguayo del que el sitio no decía
// nada. Aparecía nombrado de paso en `/prestamos-p2p-uruguay` (el descuento de cheques) y en
// ningún lado se contestaba la pregunta que llega primero, que es de plazo: cuántos días tengo
// para presentarlo antes de que el papel deje de servir. La respuesta no es un número sino
// cuatro, y el que aplica depende de dónde se libró y en qué moneda.
//
// LAS DOS COSAS QUE ESTA PÁGINA CONTESTA Y CASI NINGUNA OTRA:
//
//   1. El «cheque posdatado» no existe como tal. El artículo 28 dice que «el cheque es pagadero
//      a la vista» y que «toda mención contraria se tendrá por no escrita»: ponerle fecha futura
//      a un cheque COMÚN no lo hace incobrable hasta esa fecha, se puede depositar hoy. Para
//      pagar más adelante la ley tiene otro documento, el cheque de PAGO DIFERIDO (art. 3), que
//      es el único que el banco se niega a pagar antes de su fecha (art. 72).
//
//   2. Recibir un cheque «en garantía» es delito. El artículo 60 castiga con seis a veinticuatro
//      meses de prisión al que, fuera de los casos de usura, acepte o exija un cheque como medio
//      de garantía de una obligación — y con condena penal la obligación garantizada se extingue
//      de pleno derecho. Es la práctica más común del mercado informal de crédito y está escrita
//      como delito desde 1975.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA (ver `CHEQUE_NOT_PUBLISHED`): ningún arancel bancario por
// cheque rechazado, y ningún detalle del trámite de rehabilitación ante el BCU. Los dos existen;
// ninguno se pudo verificar contra fuente primaria, y el sitio no publica cifras que no puede
// sostener con una norma o un documento oficial.
//
// PURE module (sin Vue/Nuxt, imports relativos) para que la página, el sitemap y los tests en
// Node pelado lean lo mismo.
//
// FUENTE PRIMARIA ÚNICA, verificada el 2026-09-06 contra el texto ACTUALIZADO publicado en
// impo.com.uy: Decreto-Ley 14.412 de 08/08/1975 (Ley de Cheques), vigente desde el 1.º de
// octubre de 1975 (art. 78). Cada dato de este archivo lleva su artículo, y cada artículo lleva
// su URL en `CHEQUE_SOURCES`.

export interface ChequeSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo este archivo contra el texto oficial en impo.com.uy. */
export const CHEQUE_VERIFIED_AT = '2026-09-06'

/** La norma que rige todo lo de acá. */
export const CHEQUE_LAW = {
  number: '14.412',
  kind: 'Decreto-Ley',
  name: 'Ley de Cheques',
  enacted: '1975-08-08',
  inForceSince: '1975-10-01',
  url: 'https://www.impo.com.uy/bases/decretos-ley/14412-1975',
} as const

/** URL del artículo N del decreto-ley en el buscador oficial. */
export function articleUrl(article: number): string {
  return `${CHEQUE_LAW.url}/${article}`
}

// ---------------------------------------------------------------------------
// Los plazos de presentación (art. 29)
// ---------------------------------------------------------------------------

export interface PresentationDeadline {
  readonly key: string
  /** Días CORRIDOS, contados como manda el propio art. 29. */
  readonly days: number
  readonly caseLabel: string
  readonly detail: string
}

/**
 * Los cuatro plazos del artículo 29, en el orden en que la norma los escribe.
 *
 * El plazo se computa por días CORRIDOS, incluyendo el de la fecha de creación y los intermedios.
 * Los dos primeros cuentan desde «la fecha designada en el mismo»; los dos últimos, desde la
 * fecha de creación — la norma cambia el punto de partida y por eso cada fila lo dice.
 */
export const PRESENTATION_DEADLINES: readonly PresentationDeadline[] = [
  {
    key: 'same-place',
    days: 15,
    caseLabel: 'Librado en el país, en pesos, sobre un banco de la misma plaza',
    detail:
      'Quince días contados desde la fecha designada en el cheque. Es el caso normal: cheque uruguayo en moneda nacional cobrado donde se libró.',
  },
  {
    key: 'other-place',
    days: 30,
    caseLabel: 'Librado en el país, en pesos, «de un punto a otro de la República»',
    detail:
      'Treinta días desde la fecha designada en el cheque. La norma no habla de departamentos sino de plazas: lo que cambia el plazo es que el banco girado esté en otro lugar.',
  },
  {
    key: 'from-abroad',
    days: 60,
    caseLabel: 'Librado en el extranjero, en pesos, sobre un banco domiciliado en el país',
    detail:
      'Sesenta días contados desde la fecha de su CREACIÓN, no desde la fecha designada. El punto de partida cambia.',
  },
  {
    key: 'foreign-currency',
    days: 120,
    caseLabel: 'En moneda extranjera, creado en el país o fuera de él, sobre un banco de acá',
    detail:
      'Ciento veinte días desde la fecha de creación. Es el plazo del cheque en dólares, y es ocho veces el del cheque en pesos de la misma plaza.',
  },
]

/** Plazo máximo, en días, entre la creación de un cheque de pago diferido y su fecha de pago. */
export const DEFERRED_MAX_DAYS = 180

/** Días hábiles que tiene el tenedor para avisar del rechazo a su endosante y al librador. */
export const HOLDER_NOTICE_BUSINESS_DAYS = 5

/** Días hábiles que el banco le da al librador para acreditar que pagó, antes de sancionarlo. */
export const DRAWER_CURE_BUSINESS_DAYS = 5

/** Meses de suspensión de todas las cuentas corrientes del librador en el banco girado. */
export const SUSPENSION_MONTHS = 6

/** Meses en que prescriben las acciones judiciales del tenedor contra librador y endosantes. */
export const PRESCRIPTION_MONTHS = 6

// ---------------------------------------------------------------------------
// Común vs. diferido
// ---------------------------------------------------------------------------

export interface ChequeKindTrait {
  readonly key: string
  readonly label: string
  readonly common: string
  readonly deferred: string
  readonly article: number
}

export const CHEQUE_KIND_TRAITS: readonly ChequeKindTrait[] = [
  {
    key: 'when-payable',
    label: '¿Cuándo se puede cobrar?',
    common:
      'A la vista, siempre. «Toda mención contraria se tendrá por no escrita»: ponerle fecha futura no lo frena.',
    deferred:
      'Recién desde la fecha escrita en el propio documento. Si se presenta antes, el banco se niega a pagarlo.',
    article: 28,
  },
  {
    key: 'max-term',
    label: '¿Hasta cuándo puede diferirse?',
    common: 'No aplica: no hay fecha futura que valga.',
    deferred:
      'No puede mediar un plazo mayor de ciento ochenta días entre la fecha de creación y la fecha de pago.',
    article: 73,
  },
  {
    key: 'rules',
    label: '¿Qué reglas se le aplican?',
    common: 'Todo el Capítulo II del decreto-ley.',
    deferred:
      'A partir de su fecha de pago, las mismas del cheque común, salvo las que se opongan a su régimen propio.',
    article: 71,
  },
  {
    key: 'death',
    label: '¿Y si el librador muere antes?',
    common: 'Ni la muerte ni la incapacidad sobreviniente afectan los efectos del cheque.',
    deferred:
      'Si ocurre antes de la fecha de pago, el documento pasa a regirse por las disposiciones de los vales, billetes o pagarés.',
    article: 75,
  },
  {
    key: 'chequebook',
    label: '¿Hace falta otra cuenta?',
    common: 'No.',
    deferred:
      'No: los bancos entregan libretas «claramente diferenciables» y la misma cuenta corriente atiende las dos.',
    article: 74,
  },
]

// ---------------------------------------------------------------------------
// Las cláusulas que se le escriben encima al cheque
// ---------------------------------------------------------------------------

export interface ChequeClause {
  readonly key: string
  readonly label: string
  readonly what: string
  readonly article: number
}

export const CHEQUE_CLAUSES: readonly ChequeClause[] = [
  {
    key: 'crossing-general',
    label: 'Cruzamiento general',
    what: 'Dos líneas paralelas en el anverso, vacías o con la palabra «banco»: el girado solo puede pagarlo a otro banco, nunca por ventanilla.',
    article: 47,
  },
  {
    key: 'crossing-special',
    label: 'Cruzamiento especial',
    what: 'Con el nombre de un banco entre las líneas: solo lo cobra ese banco o el que ese banco designe. El general se puede volver especial; el especial no vuelve atrás.',
    article: 48,
  },
  {
    key: 'account-only',
    label: '«Para abono en cuenta»',
    what: 'Prohíbe el pago en efectivo: el girado solo puede acreditarlo en la cuenta del tenedor. Si el tenedor no tiene cuenta y el banco no se la abre, niega el pago.',
    article: 50,
  },
  {
    key: 'certified',
    label: 'Cheque certificado',
    what: 'El librador pide al banco que certifique que hay fondos. El banco los mantiene afectados durante el plazo de presentación. No es endosable ni puede certificarse al portador.',
    article: 51,
  },
  {
    key: 'irrevocable',
    label: 'Lo que no se puede escribir',
    what: 'Una revocación. «El cheque no puede ser revocado»: firmado y entregado, el librador no lo da de baja por arrepentimiento.',
    article: 32,
  },
]

// ---------------------------------------------------------------------------
// Qué pasa cuando rebota
// ---------------------------------------------------------------------------

export interface BounceStep {
  readonly key: string
  readonly side: 'tenedor' | 'librador'
  readonly label: string
  readonly detail: string
  readonly article: number
}

/**
 * La secuencia del rechazo, separada por lado del mostrador. Se separa a propósito: el tenedor
 * pregunta «¿y ahora cómo cobro?» y el librador «¿qué me va a pasar?», y las dos respuestas
 * están en artículos distintos que casi siempre se cuentan mezclados.
 */
export const BOUNCE_STEPS: readonly BounceStep[] = [
  {
    key: 'constancia',
    side: 'tenedor',
    label: 'La constancia del banco vale como protesto',
    detail:
      'El banco que se niega a pagar debe dejar escrito en el propio cheque el motivo, la fecha, la hora de presentación y los datos del librador registrados en el banco. Esa constancia tiene carácter de protesto por falta de pago y, sin ningún otro requisito, el cheque apareja ejecución.',
    article: 39,
  },
  {
    key: 'aviso',
    side: 'tenedor',
    label: 'Cinco días hábiles para avisar',
    detail:
      'El tenedor debe avisar de la falta de pago a su endosante y al librador dentro de los cinco días hábiles siguientes al rechazo. Cada endosante repite el aviso hacia atrás en el mismo plazo hasta llegar al librador.',
    article: 40,
  },
  {
    key: 'prescripcion',
    side: 'tenedor',
    label: 'Seis meses para reclamar en juicio',
    detail:
      'Las acciones judiciales del tenedor contra el librador y los endosantes prescriben a los seis meses, contados desde el vencimiento del plazo de presentación del cheque para su cobro.',
    article: 68,
  },
  {
    key: 'aviso-banco',
    side: 'librador',
    label: 'Cinco días hábiles para pagarlo',
    detail:
      'El banco debe avisar por escrito al librador para que dentro de los cinco días hábiles siguientes acredite haber pagado el cheque. El aviso puede ir por telegrama certificado o colacionado.',
    article: 61,
  },
  {
    key: 'suspension',
    side: 'librador',
    label: 'Seis meses con las cuentas suspendidas',
    detail:
      'Si no acredita el pago, el banco girado suspende por seis meses todas las cuentas corrientes que el infractor tenga en ese banco, avisa de inmediato al Banco Central del Uruguay y le notifica la sanción.',
    article: 62,
  },
  {
    key: 'clausura',
    side: 'librador',
    label: 'A la segunda, las cierra el Banco Central',
    detail:
      'Si ya notificado de la suspensión vuelve a librar un cheque sin fondos, el Banco Central del Uruguay dispone la clausura de todas las cuentas corrientes que el infractor tenga en todas las instituciones bancarias.',
    article: 63,
  },
  {
    key: 'rehabilitacion',
    side: 'librador',
    label: 'La rehabilitación se pide y se concede',
    detail:
      'A petición del infractor, el Banco Central del Uruguay considera su rehabilitación y puede concederla en los casos debidamente justificados. No es automática ni corre sola con el tiempo.',
    article: 64,
  },
]

// ---------------------------------------------------------------------------
// Los dos delitos del capítulo penal
// ---------------------------------------------------------------------------

export interface ChequeOffence {
  readonly key: string
  readonly label: string
  readonly penalty: string
  readonly detail: string
  readonly article: number
}

export const CHEQUE_OFFENCES: readonly ChequeOffence[] = [
  {
    key: 'sin-fondos',
    label: 'Librar un cheque sin fondos',
    penalty: 'De seis meses de prisión a cuatro años de penitenciaría',
    detail:
      'El artículo 58 castiga con esa pena cinco conductas, entre ellas librar un cheque que al presentarse no tenga fondos suficientes ni autorización para girar en descubierto (literal E), librarlo contra una cuenta ajena (literal A) y frustrar su pago de cualquier manera (literal D).',
    article: 58,
  },
  {
    key: 'garantia',
    label: 'Aceptar o exigir un cheque como garantía',
    penalty: 'De seis a veinticuatro meses de prisión',
    detail:
      'Fuera de los casos de usura, el que acepte o exija un cheque como medio de garantía de una obligación comete delito. Decretado el procesamiento queda en suspenso la acción civil por esa obligación, y si hay condena penal la obligación se extingue de pleno derecho.',
    article: 60,
  },
]

/**
 * La salida del artículo 59, que es lo primero que pregunta quien libró el cheque. Va aparte de
 * `CHEQUE_OFFENCES` porque NO alcanza al literal B (falsear las enunciaciones esenciales).
 */
export const OFFENCE_EXTINCTION = {
  article: 59,
  text: 'La pretensión penal se extingue si se paga el importe del cheque, los intereses bancarios corrientes por las operaciones activas, los gastos y los honorarios arancelarios. Si el procedimiento penal ya empezó, el pago tiene que hacerse antes de la acusación del Ministerio Público. La salida no vale para el literal B del artículo 58.',
} as const

// ---------------------------------------------------------------------------
// Lo que no se publica
// ---------------------------------------------------------------------------

export interface NotPublished {
  readonly claim: string
  readonly why: string
}

export const CHEQUE_NOT_PUBLISHED: readonly NotPublished[] = [
  {
    claim: 'Cuánto cobra cada banco por un cheque rechazado.',
    why: 'La ley no fija ningún arancel: el artículo 39 solo habla de la multa que la autoridad monetaria le aplica al BANCO que no deja las constancias. Lo que te descuenta tu banco sale de su propio tarifario, cambia entre instituciones y no hay una tabla oficial que publicar. Miralo en el tarifario vigente de tu banco.',
  },
  {
    claim: 'El trámite y los requisitos de la rehabilitación ante el Banco Central.',
    why: 'El artículo 64 dice que el BCU «considerará» la rehabilitación y puede concederla «en los casos debidamente justificados», y el artículo 66 le encarga reglamentar la forma del registro de infractores. Esa reglamentación no se pudo verificar contra fuente primaria, así que acá no se describen requisitos ni plazos que no podemos sostener.',
  },
  {
    claim: 'Cuántas cuentas corrientes hay clausuradas hoy en Uruguay.',
    why: 'El registro de infractores lo lleva el Banco Central (art. 66), pero no encontramos una publicación oficial con la serie. Un número sin fuente sería inventado.',
  },
]

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface ChequeFaq {
  readonly question: string
  readonly answer: string
}

export const CHEQUE_FAQ: readonly ChequeFaq[] = [
  {
    question: '¿Sirve de algo ponerle fecha futura a un cheque común?',
    answer:
      'No. El artículo 28 del Decreto-Ley 14.412 dice que el cheque es pagadero a la vista y que toda mención contraria se tendrá por no escrita, así que quien lo tiene puede depositarlo antes de esa fecha. Para pagar más adelante hay que usar un cheque de pago diferido, que es otro documento y el banco no lo paga antes de su fecha.',
  },
  {
    question: '¿Cuánto tiempo tengo para cobrar un cheque en Uruguay?',
    answer:
      'Depende de dónde se libró y en qué moneda. El artículo 29 fija cuatro plazos, todos en días corridos: quince días si se libró en el país en moneda nacional sobre un banco de la misma plaza, treinta si es de un punto a otro de la República, sesenta si se libró en el extranjero en moneda nacional sobre un banco domiciliado acá, y ciento veinte si es en moneda extranjera. Vencido el plazo el banco no debe pagarlo y el tenedor pierde toda acción cambiaria.',
  },
  {
    question: '¿Cuál es el plazo máximo de un cheque de pago diferido?',
    answer:
      'Ciento ochenta días. El artículo 73 establece que no puede mediar un plazo mayor entre la fecha de creación del cheque y la fecha de pago escrita en el documento.',
  },
  {
    question: 'Me rebotó un cheque, ¿tengo que hacer un protesto?',
    answer:
      'No hace falta. Según el artículo 39, la constancia que el banco deja en el propio cheque con el motivo del rechazo, la fecha y la hora tiene carácter de protesto por falta de pago, y con ella el cheque apareja ejecución sin ningún otro requisito. El plazo para reclamar en juicio es de seis meses desde que venció el plazo de presentación (artículo 68).',
  },
  {
    question: '¿Qué le pasa a quien libró un cheque sin fondos?',
    answer:
      'El banco lo intima por escrito y le da cinco días hábiles para acreditar que lo pagó (artículo 61). Si no lo hace, le suspende por seis meses todas las cuentas corrientes que tenga en ese banco y avisa al Banco Central (artículo 62). Si reincide, el Banco Central clausura todas sus cuentas corrientes en todas las instituciones bancarias (artículo 63). Además, librar un cheque sin fondos es delito (artículo 58, literal E).',
  },
  {
    question: '¿Es legal dejar un cheque en garantía de un préstamo?',
    answer:
      'No. El artículo 60 castiga con seis a veinticuatro meses de prisión a quien, fuera de los casos de usura, acepte o exija un cheque como medio de garantía de una obligación. Y si hay sentencia penal condenatoria, la obligación que se quiso garantizar se extingue de pleno derecho.',
  },
  {
    question: '¿Puedo frenar un cheque que ya entregué?',
    answer:
      'No por arrepentimiento: el artículo 32 dice que el cheque no puede ser revocado. El banco solo se niega a pagar en los casos tasados del artículo 36, entre ellos que el librador le avise por escrito y bajo su responsabilidad que hubo violencia al librarlo, o que haya denunciado el extravío o robo de la libreta. Avisar para no pagar fuera de esos casos es delito (artículo 58, literal D).',
  },
]

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

export const CHEQUE_SOURCES: readonly ChequeSource[] = [
  {
    label: 'Decreto-Ley 14.412 (Ley de Cheques) — texto actualizado completo',
    url: CHEQUE_LAW.url,
  },
  {
    label: 'Art. 1 — las dos únicas clases: común y de pago diferido',
    url: articleUrl(1),
  },
  {
    label: 'Art. 3 — qué es el cheque de pago diferido',
    url: articleUrl(3),
  },
  {
    label: 'Art. 28 — el cheque es pagadero a la vista; la fecha futura se tiene por no escrita',
    url: articleUrl(28),
  },
  {
    label: 'Art. 29 — los cuatro plazos de presentación y la pérdida de la acción cambiaria',
    url: articleUrl(29),
  },
  {
    label: 'Art. 32 — el cheque no puede ser revocado',
    url: articleUrl(32),
  },
  {
    label: 'Art. 36 — los casos tasados en que el banco se niega a pagar',
    url: articleUrl(36),
  },
  {
    label: 'Art. 39 — la constancia del rechazo vale como protesto y apareja ejecución',
    url: articleUrl(39),
  },
  {
    label: 'Art. 40 — cinco días hábiles para avisar del rechazo',
    url: articleUrl(40),
  },
  {
    label: 'Art. 46 — el cheque no extingue el crédito originario, y la acción causal',
    url: articleUrl(46),
  },
  {
    label: 'Arts. 47 a 50 — cruzamiento general, especial y «para abono en cuenta»',
    url: articleUrl(47),
  },
  {
    label: 'Arts. 51 y 52 — el cheque certificado y los fondos afectados',
    url: articleUrl(51),
  },
  {
    label: 'Art. 58 — las cinco figuras delictivas y su pena',
    url: articleUrl(58),
  },
  {
    label: 'Art. 59 — la extinción de la pretensión penal por pago',
    url: articleUrl(59),
  },
  {
    label: 'Art. 60 — aceptar o exigir un cheque en garantía es delito',
    url: articleUrl(60),
  },
  {
    label: 'Arts. 61 a 64 — intimación, suspensión, clausura por el BCU y rehabilitación',
    url: articleUrl(61),
  },
  {
    label: 'Art. 68 — las acciones prescriben a los seis meses',
    url: articleUrl(68),
  },
  {
    label: 'Arts. 71 a 75 — el régimen del cheque de pago diferido y el tope de 180 días',
    url: articleUrl(71),
  },
]
