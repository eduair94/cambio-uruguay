// app/utils/trafficFines.ts
// Datos de /multas-de-transito-y-patente-uruguay: qué hacer con una multa, en qué plazos, y qué
// pasa con la deuda de patente que se arrastra.
//
// POR QUÉ EXISTE: el cluster «auto: patente, multas, SUCIVE» junta 155 preguntas en el corpus
// («¿Algún pique para pagar multas SUCIVE?» 74 comentarios, «¿Afano con la patente?» 59). El
// sitio tiene cuatro guías de auto, pero grep de «multa de tránsito» sobre todo `app/` daba CERO,
// y SUCIVE aparecía sólo como una frase suelta: «la deuda sigue al vehículo».
//
// CÓMO SE ENGANCHA CON LO QUE YA HAY: en /prescripcion-de-deudas-con-el-estado-uruguay quedó
// dicho que la patente NO se rige por el artículo 38 del Código Tributario, porque los tributos
// departamentales están excluidos. Esta página trae la regla departamental que sí la rige.
//
// DOS TRAMPAS DE PLAZO QUE ESTA PÁGINA EXISTE PARA EVITAR:
//   1. El descargo son 10 días HÁBILES; el recurso posterior, 10 días CORRIDOS. No es el mismo
//      plazo y se pierden por confundirlos.
//   2. La prescripción de la multa NO opera sola: requiere acto administrativo. Y cualquier
//      reconocimiento, expreso o tácito, interrumpe el plazo — pagar una cuota la resucita.
//
// ALCANCE: el tributo de patente está unificado por el SUCIVE, pero el PROCEDIMIENTO de la
// infracción es departamental. Los pasos y las oficinas de acá son los de Montevideo; en otro
// departamento hay que confirmarlos en su intendencia. La página lo dice.
//
// FUENTES, verificadas el 2026-08-10:
//   - Intendencia de Montevideo, «¿Cómo apelar una multa?»
//     https://montevideo.gub.uy/areas-tematicas/movilidad/fiscalizacion-de-infracciones/como-apelar-una-multa
//   - Intendencia de Montevideo, consulta de infracciones
//     https://tramites.montevideo.gub.uy/consultainfracciones
//   - Texto ordenado del SUCIVE
//     https://montevideo.gub.uy/sites/default/files/biblioteca/sucivetextoordenado2022_0.pdf
//   - gub.uy, «Multa de tránsito - Prescripción» (trámite departamental)
//     https://www.gub.uy/tramites/multa-transito-prescripcion-maldonado

/** Fecha en que plazos y procedimiento se contrastaron con las fuentes. */
export const FINES_VERIFIED_AT = '2026-08-10'

export interface FinesSource {
  label: string
  url: string
}

export const FINES_SOURCES: readonly FinesSource[] = Object.freeze([
  {
    label: 'Intendencia de Montevideo — Cómo apelar una multa',
    url: 'https://montevideo.gub.uy/areas-tematicas/movilidad/fiscalizacion-de-infracciones/como-apelar-una-multa',
  },
  {
    label: 'Intendencia de Montevideo — Consulta de infracciones',
    url: 'https://tramites.montevideo.gub.uy/consultainfracciones',
  },
  {
    label: 'Texto ordenado del SUCIVE',
    url: 'https://montevideo.gub.uy/sites/default/files/biblioteca/sucivetextoordenado2022_0.pdf',
  },
  {
    label: 'gub.uy — Multa de tránsito, prescripción (trámite departamental)',
    url: 'https://www.gub.uy/tramites/multa-transito-prescripcion-maldonado',
  },
])

/** Que el procedimiento sea departamental es lo primero que hay que aclarar. */
export const FINES_SCOPE_NOTE =
  'El tributo de patente está unificado en el SUCIVE, pero el procedimiento de la infracción lo lleva cada intendencia. Los plazos y las oficinas de esta página son los de Montevideo: si tu vehículo está empadronado en otro departamento, confirmá el procedimiento en esa intendencia antes de contar los días.'

// ---------------------------------------------------------------------------
// Plazos: la parte que se pierde por confundir hábiles con corridos
// ---------------------------------------------------------------------------

/** Días HÁBILES para presentar descargos desde la notificación. */
export const DESCARGO_DIAS_HABILES = 10

/** Días CORRIDOS para recurrir si la multa se mantiene. */
export const RECURSO_DIAS_CORRIDOS = 10

/** Años de prescripción de la multa, contados desde que se cometió la infracción. */
export const FINE_PRESCRIPTION_YEARS = 5

export interface FineStep {
  n: number
  title: string
  deadline: string | null
  /** `true` cuando el plazo se cuenta en días hábiles. */
  businessDays: boolean
  detail: string
}

export const FINE_STEPS: readonly FineStep[] = Object.freeze([
  {
    n: 1,
    title: 'Te notifican la infracción',
    deadline: null,
    businessDays: false,
    detail:
      'Desde la notificación empieza a correr el plazo. Si no presentás descargos, la multa se aplica sin más.',
  },
  {
    n: 2,
    title: 'Presentás descargos',
    deadline: `${DESCARGO_DIAS_HABILES} días hábiles`,
    businessDays: true,
    detail:
      'Se hacen en línea con el formulario de descargos de contravenciones de tránsito, o presencialmente en Atención a la Ciudadanía. Es el momento de aportar la prueba.',
  },
  {
    n: 3,
    title: 'Informa la Comisión Asesora de Infracciones',
    deadline: null,
    businessDays: false,
    detail:
      'Tus descargos pasan a una comisión que elabora un informe con una recomendación para la dependencia que corresponda.',
  },
  {
    n: 4,
    title: 'Si la multa se mantiene, recurrís',
    deadline: `${RECURSO_DIAS_CORRIDOS} días corridos`,
    businessDays: false,
    detail:
      'El recurso tiene dos partes que van juntas: reposición ante el funcionario que aplicó la multa, y apelación ante el Intendente. Ojo con el cambio de unidad: acá los días son corridos, no hábiles.',
  },
])

/** La trampa, escrita para poder citarla. */
export const DEADLINE_TRAP =
  'El descargo se cuenta en días hábiles y el recurso posterior en días corridos. No es el mismo plazo y es la forma más común de quedarse sin instancia: alguien cuenta diez días corridos para el descargo y llega tarde, o cuenta diez hábiles para el recurso y también.'

// ---------------------------------------------------------------------------
// Prescripción de la multa
// ---------------------------------------------------------------------------

/** Qué interrumpe el plazo. Es lo que hace que una deuda vieja se reinicie sola. */
export const FINE_PRESCRIPTION_INTERRUPTS: readonly string[] = Object.freeze([
  'Haber firmado un convenio de pago.',
  'La notificación.',
  'Cualquier reconocimiento de la deuda, expreso o tácito.',
])

/**
 * El paralelo con la prescripción tributaria nacional: tampoco opera sola. Acá además hace falta
 * una resolución del intendente.
 */
export const FINE_PRESCRIPTION_RULE =
  'Las multas de tránsito prescriben a los cinco años contados desde que se cometió la infracción, siempre que no haya habido convenio, notificación ni reconocimiento —expreso o tácito— que interrumpa el plazo. Y no opera sola: la prescripción tiene que ser autorizada por acto administrativo, es decir, por resolución del intendente o de quien haga sus veces.'

/** La advertencia práctica, igual que con la deuda privada. */
export const FINE_RECOGNITION_WARNING =
  'Pagar una cuota, firmar un convenio o incluso reconocer la deuda de palabra puede interrumpir el plazo y reiniciarlo. Si estás mirando una multa vieja pensando en la prescripción, no reconozcas nada antes de asesorarte: el gesto que parece de buena fe es el que reinicia el reloj.'

// ---------------------------------------------------------------------------
// Si ya pagaste una multa que no correspondía
// ---------------------------------------------------------------------------

export interface RefundRoute {
  label: string
  detail: string
}

export const FINE_REFUND_ROUTES: readonly RefundRoute[] = Object.freeze([
  {
    label: 'Crédito en la cuenta del vehículo',
    detail:
      'Se deja sin efecto la infracción y queda un crédito en la cuenta corriente del vehículo. Sólo para vehículos empadronados en Montevideo.',
  },
  {
    label: 'Devolución en dinero por el SUCIVE',
    detail:
      'El dinero vuelve a través del SUCIVE, en tres momentos del año: abril, agosto y diciembre.',
  },
])

export interface FinesFaq {
  question: string
  short: string
  answer: string
}

export const FINES_FAQ: readonly FinesFaq[] = Object.freeze([
  {
    question: 'Me llegó una multa que no me corresponde. ¿Qué hago?',
    short: 'Presentá descargos dentro de los 10 días hábiles de notificado.',
    answer:
      'Desde la notificación tenés diez días hábiles para presentar descargos, en línea con el formulario de contravenciones de tránsito o presencialmente en Atención a la Ciudadanía. Es el momento de aportar la prueba. Si no presentás nada, la multa se aplica. Después los descargos pasan a una Comisión Asesora de Infracciones que informa con una recomendación.',
  },
  {
    question: 'Rechazaron mi descargo. ¿Puedo insistir?',
    short: 'Sí, con el recurso, pero ahí son 10 días CORRIDOS.',
    answer:
      'Si la multa se mantiene, tenés diez días corridos para recurrir. El recurso tiene dos partes que se presentan juntas: reposición ante el funcionario que aplicó la multa y apelación ante el Intendente. Prestá atención al cambio de unidad, porque el descargo se contaba en días hábiles y este plazo en corridos.',
  },
  {
    question: '¿Prescriben las multas de tránsito?',
    short: 'A los cinco años, pero hay que pedirlo y cualquier reconocimiento reinicia el plazo.',
    answer:
      'Prescriben a los cinco años desde que se cometió la infracción, siempre que no haya habido convenio, notificación ni reconocimiento expreso o tácito que interrumpa el plazo. Y no opera sola: requiere un acto administrativo, una resolución del intendente. Es el mismo patrón que en materia tributaria nacional, donde la prescripción también opera a petición de parte.',
  },
  {
    question: 'Tengo una multa vieja. ¿Me conviene pagar una cuota mientras averiguo?',
    short: 'No: pagar o reconocer la deuda puede reiniciar el plazo de prescripción.',
    answer:
      'Cualquier reconocimiento, expreso o tácito, interrumpe el plazo. Pagar una cuota o firmar un convenio sobre una deuda que podría estar prescrita la revive y hace empezar a contar de nuevo. Si estás mirando una deuda vieja con la prescripción en mente, asesorate antes de hacer cualquier gesto que implique reconocerla.',
  },
  {
    question: 'Pagué una multa que no correspondía. ¿Me la devuelven?',
    short: 'Sí: como crédito en la cuenta del vehículo o en dinero por el SUCIVE.',
    answer:
      'Hay dos caminos. Uno es dejar sin efecto la infracción y que quede un crédito en la cuenta corriente del vehículo, disponible sólo para vehículos empadronados en Montevideo. El otro es la devolución del dinero a través del SUCIVE, que se hace en tres momentos del año: abril, agosto y diciembre.',
  },
  {
    question: '¿Esto aplica en todo el país?',
    short: 'El tributo está unificado en el SUCIVE; el procedimiento de la multa es departamental.',
    answer:
      'La patente está unificada a nivel nacional por el SUCIVE, pero el procedimiento de la infracción lo lleva cada intendencia. Los plazos y las oficinas de esta página son los de Montevideo. Si tu vehículo está empadronado en otro departamento, confirmá el procedimiento en esa intendencia antes de contar los días: perder el plazo por aplicar el de otro departamento es un error caro y evitable.',
  },
])
