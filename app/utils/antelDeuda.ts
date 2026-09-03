// Qué pasa si no pagás la factura de Antel: bloqueo, supresión y reconexión.
//
// POR QUÉ ESTA PÁGINA. La eligió el job `currency-search-demand` el 2026-09-03: tres consultas del
// autocompletado uruguayo del mismo tema, las tres con el máximo puntaje porque el SERP son foros.
// Verificado consulta por consulta contra el SERP uruguayo (gl=uy) ese mismo día:
//
//   "que pasa si no pago antel"        → 1.º un hilo de Reddit, 4.º un posteo de Facebook
//   "cuando antel te corta el servicio" → 2.º Reddit, 4.º Facebook; el 1.º de Antel es la página
//                                          de "Estado del Servicio", que es sobre cortes técnicos
//   "antel cuanto demora en reconectar" → 1.º Reddit, 6.º el foro GameOver
//
// Cuando el primer resultado de una pregunta de plata es un hilo de Reddit, Google no encontró una
// página buena. Y no la encontró por un motivo concreto que este archivo hace explícito abajo: la
// propia Antel no publica la respuesta a la pregunta más buscada de las tres.
//
// TODO SALE DE DOCUMENTOS DE ANTEL, leídos el 2026-09-03:
//   * Reglamento General de Servicios (PDF oficial) — capítulo IV: mora, bloqueo, supresión,
//     registro de morosos.
//   * Condiciones de Contratación del Servicio de Acceso a Internet (PDF oficial) — reintegro por
//     interrupciones, incumplimientos, rescisión.
//   * Preguntas frecuentes de facturación (antel.com.uy) — los plazos de rehabilitación.
// Ni una cifra estimada, y lo que no está publicado se dice que no está publicado.

export interface HechoAntel {
  /** La pregunta, tal como la hace la gente. */
  pregunta: string
  /** La respuesta, o la constancia de que no hay respuesta publicada. */
  respuesta: string
  /** El documento y el artículo exactos. Vacío cuando justamente no hay dónde. */
  fuente: string
  /** True cuando Antel NO publica el dato. Es la mitad honesta de la página. */
  sinPublicar?: boolean
}

/**
 * Lo que pasa, en el orden en que pasa.
 *
 * El segundo renglón es el importante y es el que nadie más dice: entre el vencimiento y el
 * bloqueo hay un plazo que Antel no publica en ninguno de los tres documentos.
 */
export const SECUENCIA: readonly HechoAntel[] = Object.freeze([
  {
    pregunta: 'Cuando vence la factura y no la pagás',
    respuesta:
      'Caés en mora automáticamente, el mismo día del vencimiento. El reglamento dice "sin necesidad de interpelación judicial o extrajudicial alguna": no hay aviso previo, ni carta, ni llamada que tenga que llegarte antes.',
    fuente: 'Reglamento General de Servicios, art. 4.3',
  },
  {
    pregunta: 'Cuántos días pasan hasta que te bloquean',
    respuesta:
      'Antel no lo publica. El reglamento dice que se procede al bloqueo, y que la supresión definitiva llega "en caso que la deuda no fuere cancelada dentro de los plazos establecidos" — pero no dice cuáles son esos plazos, y las preguntas frecuentes de facturación y de telefonía fija tampoco los mencionan. Ese silencio es exactamente el motivo por el que la respuesta mejor posicionada en Google hoy es un hilo de Reddit.',
    fuente: 'Reglamento General de Servicios, art. 4.3, inciso c',
    sinPublicar: true,
  },
  {
    pregunta: 'Qué te bloquean',
    respuesta:
      'El bloqueo puede ser parcial o total de tus servicios. El reglamento no distingue por producto: alcanza a todos los servicios del cliente, no sólo al que quedó impago.',
    fuente: 'Reglamento General de Servicios, art. 4.3, inciso b',
  },
  {
    pregunta: 'Cuánto se recarga la deuda',
    respuesta:
      'Se aplican multas y recargos sobre las facturas impagas de acuerdo con el Código Tributario y las leyes vigentes. El reglamento remite a esa norma en vez de fijar un porcentaje propio, así que la tasa no es una decisión comercial de Antel.',
    fuente: 'Reglamento General de Servicios, art. 4.3, inciso a',
  },
  {
    pregunta: 'Qué pasa si la deuda sigue',
    respuesta:
      'Se procede a la supresión definitiva de todos los servicios del cliente, sin perjuicio de las acciones legales para cobrar lo adeudado. "Supresión" no es lo mismo que "bloqueo": el servicio se da de baja, no queda esperando.',
    fuente: 'Reglamento General de Servicios, art. 4.3, inciso c',
  },
  {
    pregunta: 'Cuánto tarda en volver el servicio cuando pagás',
    respuesta:
      'No hay desbloqueo manual: hay que esperar 48 horas hábiles para el servicio fijo y 72 horas para el de internet. Antel lo dice para el caso de quien pagó el mismo día del vencimiento y quedó bloqueado igual, así que el plazo corre aunque el bloqueo haya sido un desencuentro de fechas.',
    fuente: 'Preguntas frecuentes de facturación, antel.com.uy',
  },
])

/**
 * El registro de morosos de Antel, que no es el Clearing.
 *
 * Se separa porque es la confusión más común y la más cara: alguien supone que una deuda con Antel
 * le arruina el crédito en todos lados, o al revés, que estar limpio en el Clearing le alcanza para
 * contratar. El reglamento describe un registro PROPIO de la empresa y no menciona en ningún lado
 * al Clearing de Informes ni a ningún buró externo.
 */
export const REGISTRO_MOROSOS: readonly HechoAntel[] = Object.freeze([
  {
    pregunta: '¿Antel te manda al Clearing?',
    respuesta:
      'El reglamento describe un registro propio: "la Empresa llevará un registro de quienes mantengan deuda con plazo vencido". No menciona al Clearing de Informes ni a ningún buró externo. Lo que sí dice es qué hace con ese registro propio.',
    fuente: 'Reglamento General de Servicios, art. 4.4',
  },
  {
    pregunta: '¿Podés contratar otro servicio con deuda?',
    respuesta:
      'No, mientras la deuda no esté cancelada con sus intereses moratorios. Y es requisito para tramitar cualquier solicitud, no sólo para contratar de nuevo lo que te bloquearon.',
    fuente: 'Reglamento General de Servicios, arts. 4.4 y 5.5',
  },
  {
    pregunta: 'La deuda queda pegada a la dirección, no sólo a la persona',
    respuesta:
      'Antel puede tomar medidas preventivas para adjudicar servicios en direcciones donde existen antecedentes de morosidad. O sea que la deuda del inquilino anterior puede complicarle la contratación al que llega después.',
    fuente: 'Reglamento General de Servicios, art. 4.4',
  },
])

/**
 * Lo que se puede reclamar, que casi nadie reclama.
 *
 * Va en la página porque quien la busca ya tiene un problema con Antel, y esto es lo único que
 * juega para su lado. El reintegro por interrupción NO es automático: sale a solicitud.
 */
export const A_FAVOR_DEL_CLIENTE: readonly HechoAntel[] = Object.freeze([
  {
    pregunta: 'Si el servicio se cortó 12 horas o más por causa de Antel',
    respuesta:
      'Corresponde el reintegro proporcional del cargo fijo mensual por el período que el servicio estuvo interrumpido. Es a solicitud del cliente y previa verificación: si no lo pedís, no llega solo.',
    fuente: 'Condiciones de Contratación de Internet, art. 2.6',
  },
  {
    pregunta: 'Reclamar por un corte',
    respuesta:
      'Al 121 desde un fijo o desde un móvil de otra compañía, o al *121 desde un móvil Antel.',
    fuente: 'Preguntas frecuentes de telefonía fija, antel.com.uy',
  },
  {
    pregunta: 'Convenio de pago',
    respuesta:
      'Se hacen en los locales habilitados para esa gestión o en MiAntel. No todos los locales atienden temas de facturación, así que conviene verificarlo antes de ir.',
    fuente: 'Preguntas frecuentes de facturación, antel.com.uy',
  },
])

/** Lo que hay que saber antes de dar de baja con deuda encima. */
export const RESCISION: readonly HechoAntel[] = Object.freeze([
  {
    pregunta: 'Si tenías plazo mínimo',
    respuesta:
      'Al rescindir antes de que termine, hay que abonar la totalidad de las mensualidades que resten hasta esa fecha.',
    fuente: 'Condiciones de Contratación de Internet, art. 11.1',
  },
  {
    pregunta: 'Si no habías pagado la conexión',
    respuesta:
      'Si elegiste no abonar los gastos de conexión al contratar, hay que pagarlos en la rescisión, sin importar cuánto tiempo pasó.',
    fuente: 'Condiciones de Contratación de Internet, art. 11.2',
  },
  {
    pregunta: 'Cómo se da de baja',
    respuesta:
      'Presencialmente en un Centro Comercial de Antel, devolviendo el equipamiento que te entregaron al conectar el servicio.',
    fuente: 'Condiciones de Contratación de Internet, art. 11.3',
  },
])

export interface FuenteAntel {
  label: string
  url: string
}

export const ANTEL_DEUDA_SOURCES: readonly FuenteAntel[] = Object.freeze([
  {
    label: 'Antel — Reglamento General de Servicios (PDF)',
    url: 'https://www.antel.com.uy/institucional/nuestra-empresa/condiciones',
  },
  {
    label: 'Antel — Condiciones de Contratación del Servicio de Acceso a Internet (PDF)',
    url: 'https://www.antel.com.uy/institucional/nuestra-empresa/condiciones',
  },
  {
    label: 'Antel — Preguntas frecuentes de facturación',
    url: 'https://www.antel.com.uy/personas/preguntas-frecuentes/facturacion',
  },
  {
    label: 'Antel — Preguntas frecuentes de telefonía fija',
    url: 'https://www.antel.com.uy/personas/preguntas-frecuentes/fija',
  },
])

export const ANTEL_DEUDA_VERIFIED_AT = '2026-09-03'

export interface FaqEntryAntel {
  question: string
  answer: string
}

/** Las preguntas son las que sugiere el autocompletado uruguayo, no las que se nos ocurrieron. */
export const ANTEL_DEUDA_FAQ: readonly FaqEntryAntel[] = Object.freeze([
  {
    question: '¿Qué pasa si no pago la factura de Antel?',
    answer:
      'Caés en mora automáticamente el día del vencimiento, sin aviso previo: el reglamento dice que no hace falta ninguna interpelación. A partir de ahí corren multas y recargos según el Código Tributario, Antel puede bloquear parcial o totalmente tus servicios, y si la deuda sigue impaga procede a la supresión definitiva de todos ellos.',
  },
  {
    question: '¿Cuándo te corta Antel el servicio por falta de pago?',
    answer:
      'Antel no publica el plazo. Su Reglamento General de Servicios dice que se procede al bloqueo y que la supresión llega si la deuda no se cancela "dentro de los plazos establecidos", pero no dice cuáles son, y las preguntas frecuentes de facturación y de telefonía fija tampoco los mencionan.',
  },
  {
    question: '¿Cuánto demora Antel en reconectar el internet después de pagar?',
    answer:
      'Setenta y dos horas para el servicio de internet y 48 horas hábiles para el servicio fijo. Antel aclara que no se hacen desbloqueos manuales, así que el plazo corre igual aunque hayas pagado el mismo día del vencimiento.',
  },
  {
    question: '¿Una deuda con Antel te manda al Clearing?',
    answer:
      'El reglamento de Antel describe un registro propio de quienes mantienen deuda vencida y no menciona al Clearing de Informes ni a ningún buró externo. Lo que sí establece es que no te adjudica otros servicios mientras la deuda siga, y que puede tomar medidas preventivas en direcciones con antecedentes de morosidad.',
  },
  {
    question: '¿Me pueden negar un servicio nuevo por la deuda del inquilino anterior?',
    answer:
      'Puede pasar. El reglamento habilita a Antel a tomar medidas preventivas para adjudicar servicios en direcciones donde existen antecedentes de morosidad, así que la deuda queda asociada también al domicilio y no sólo a la persona.',
  },
  {
    question: '¿Antel devuelve algo si el servicio estuvo caído?',
    answer:
      'Sí, si la interrupción fue de 12 horas o más continuas y por causas imputables exclusivamente a Antel: corresponde el reintegro proporcional del cargo fijo mensual. No es automático, sale a solicitud del cliente y previa verificación.',
  },
  {
    question: '¿Puedo hacer un convenio de pago por la deuda?',
    answer:
      'Sí. Los convenios se hacen en los locales habilitados para esa gestión o desde MiAntel. Conviene verificar antes que el local atienda temas de facturación, porque no todos lo hacen.',
  },
])
