// app/utils/consumerRights.ts
// Tus derechos cuando comprás online en Uruguay — y qué exigir cuando la tienda no cumple.
//
// PURO (sin Vue/Nuxt) para que la página y los tests compartan una sola fuente de verdad.
//
// POR QUÉ EXISTE: la respuesta típica en redes a "compré, me cobraron y no me entregan" es
// "no compres más ahí". Pero la Ley 17.250 de Relaciones de Consumo dice bastante más de lo que
// la gente cree, y —siendo de ORDEN PÚBLICO— sus derechos son IRRENUNCIABLES: ninguna letra
// chica ni "términos y condiciones" te los puede sacar. Acá está el marco, con el artículo al lado.
//
// VERIFICADO CONTRA FUENTE PRIMARIA (IMPO — texto de la Ley 17.250; gub.uy — Área de Defensa del
// Consumidor del MEF) el 2026-07-19, y pasado por verificadores adversariales. Correcciones que
// dejaron marca: la carga de la prueba de la publicidad es del anunciante por el art. 26 (no el 24);
// la contrapublicidad la ordena el organismo por el art. 51; el régimen sancionatorio está en el
// Cap. XVI (arts. 46-52) con las multas en el art. 47. Es información de referencia, no asesoramiento.

/** Cuál es la palanca legal más fuerte de cada caso — texto corto para el chip. */
export interface ConsumerScenario {
  id: string
  /** Agrupa los incidentes para que una lista larga siga siendo escaneable. */
  group: ConsumerScenarioGroupId
  /** Lo que le pasó, en las palabras en que la gente lo cuenta. */
  label: string
  /** Un renglón para la tarjeta. */
  short: string
  icon: string
  /** La palanca legal en una línea (chip). */
  lever: string
  /** La respuesta, sin vueltas: qué te ampara y qué exigir. */
  answer: string
  /** Los artículos que la sostienen. */
  articles: string[]
  /** Plazos concretos que corren desde que te pasó. */
  deadlines: string[]
  /** Qué juntar antes de reclamar. */
  evidence: string[]
  /** Renglones editables que aterrizan el incidente en el modelo de reclamo. */
  complaintFacts: string[]
  /** Soluciones razonables para este incidente; una se inserta en el reclamo. */
  remedies: ConsumerRemedy[]
}

export type ConsumerScenarioGroupId = 'entrega' | 'producto' | 'cobro' | 'oferta-servicio'

export interface ConsumerScenarioGroup {
  id: ConsumerScenarioGroupId
  label: string
  description: string
  icon: string
}

export interface ConsumerRemedy {
  id: string
  label: string
  request: string
}

/** Un derecho de fondo del consumidor online. */
export interface ConsumerRight {
  title: string
  /** Qué dice, en criollo. */
  plain: string
  articles: string[]
  /** Qué hacer en la práctica. */
  practical: string
}

/** Un paso de la escalera de reclamo. */
export interface ComplaintStep {
  step: string
  detail: string
}

export interface Faq {
  q: string
  a: string
}

export interface SourceLink {
  label: string
  url: string
  publisher: string
}

export interface KeyFigure {
  label: string
  value: string
}

/** Categorías reales del problema; ordenan el selector sin esconder ningún caso. */
export const CONSUMER_SCENARIO_GROUPS: readonly ConsumerScenarioGroup[] = Object.freeze([
  {
    id: 'entrega',
    label: 'Entrega y pedido',
    description: 'No llegó, llegó tarde, incompleto, equivocado o dañado.',
    icon: 'mdi-truck-delivery-outline',
  },
  {
    id: 'producto',
    label: 'Producto y garantía',
    description: 'Fallas, reparación, producto usado o un riesgo de seguridad.',
    icon: 'mdi-tools',
  },
  {
    id: 'cobro',
    label: 'Cancelación y cobros',
    description: 'No cancelan, no reintegran, cobran de más o renuevan solos.',
    icon: 'mdi-credit-card-outline',
  },
  {
    id: 'oferta-servicio',
    label: 'Oferta y servicios',
    description: 'Publicidad engañosa, servicio incumplido o algo no solicitado.',
    icon: 'mdi-file-document-alert-outline',
  },
])

/** Excepciones taxativas al retracto de las ventas a distancia (Ley 17.250, art. 16-BIS). */
export const RETRACT_EXCEPTIONS: readonly string[] = Object.freeze([
  'Productos hechos según tus especificaciones o claramente personalizados.',
  'Productos que se deterioran o vencen con rapidez.',
  'Productos precintados que no admiten devolución por salud o higiene, si abriste el precinto.',
  'Grabaciones, videos o software precintados, si los abriste después de recibirlos.',
  'Prensa diaria, publicaciones periódicas o revistas, salvo suscripciones.',
  'Compras realizadas mediante subasta pública.',
  'Alojamiento no residencial, comida o actividades de esparcimiento con fecha o período específico.',
  'Contenido digital sin soporte físico cuya ejecución comenzó con tu consentimiento expreso y sabiendo que perdías el desistimiento.',
])

export const INTRO =
  'Comprar por internet, teléfono, TV o catálogo en Uruguay está amparado por la Ley 17.250 de ' +
  'Relaciones de Consumo, una norma de ORDEN PÚBLICO cuyos derechos son IRRENUNCIABLES: ninguna ' +
  'letra chica ni "términos y condiciones" te los puede quitar. Tenés un derecho de arrepentimiento ' +
  'de 5 días hábiles propio de las ventas a distancia, y ante cualquier incumplimiento del vendedor ' +
  'elegís vos entre exigir la entrega, aceptar un reemplazo o recuperar tu plata actualizada, siempre ' +
  'con derecho a daños y perjuicios. Todos los reclamos se canalizan gratis ante el Área de Defensa ' +
  'del Consumidor del Ministerio de Economía y Finanzas (0800 7005).'

/** La regla que casi nadie usa: la ley es de orden público, así que los derechos no se firman en contra. */
export const GOLDEN_RULE =
  'La Ley 17.250 es de ORDEN PÚBLICO (art. 1): sus derechos son irrenunciables. Un "no se aceptan ' +
  'cancelaciones ni devoluciones" que recorte lo que la ley te da es NULO por abusivo, aunque figure ' +
  'aceptado en los términos y condiciones. Y documentá todo con fecha: el chat, la publicación con el ' +
  'precio y el plazo, el comprobante de pago y tus reclamos son la prueba con la que ganás la mediación.'

/** Situaciones típicas de compra web que salió mal. Primero, la que más se repite. */
export const CONSUMER_SCENARIOS: readonly ConsumerScenario[] = Object.freeze([
  {
    id: 'cobraron-no-entregan',
    group: 'entrega',
    label: 'Me cobraron y no entregan (ni cancelan ni devuelven)',
    short: 'Pagaste, no llega, no te cancelan y no te devuelven.',
    icon: 'mdi-package-variant-remove',
    lever: 'Art. 33: elegís vos el remedio',
    answer:
      'Te amparan dos vías paralelas. De fondo, ante el incumplimiento del vendedor podés exigir el ' +
      'cumplimiento forzado (que te entreguen), aceptar un producto sustituto, o resolver el contrato y ' +
      'reclamar la devolución de todo lo pagado monetariamente actualizado, más daños y perjuicios ' +
      '(art. 33) — y la elección es TUYA, no del comercio. Además, si estás dentro de los 5 días hábiles ' +
      'de la compra a distancia, podés arrepentirte sin causa (art. 16). Si pagaste con tarjeta, en ' +
      'paralelo podés pedir el contracargo a tu emisor (no es un derecho de la ley, sino una regla de las ' +
      'redes Visa/Mastercard y de tu contrato de tarjeta). Si pagaste por transferencia o por Abitab/' +
      'RedPagos no hay contracargo: reclamá al vendedor y ante Defensa del Consumidor; la denuncia penal ' +
      'corresponde solamente si hay indicios de una estafa, no por cualquier atraso.',
    articles: [
      'Ley 17.250 art. 33 — incumplimiento: cumplimiento forzado, sustitución o resolución con devolución actualizada, a tu elección',
      'Ley 17.250 art. 16 — arrepentimiento en la venta a distancia (5 días hábiles)',
      'Ley 17.250 arts. 12 y 14 — la oferta y la publicidad obligan e integran el contrato',
    ],
    deadlines: [
      'Arrepentimiento: 5 días hábiles desde el contrato o desde la entrega, a tu opción.',
      'Contracargo con tarjeta: el plazo depende del emisor, la red y tu contrato — confirmalo con tu banco apenas detectes el incumplimiento.',
    ],
    evidence: [
      'Comprobante de pago (voucher, resumen de tarjeta, transferencia o giro).',
      'Factura o boleta.',
      'Captura de la publicación con el precio y el plazo de entrega prometido.',
      'Chats, mails y WhatsApp con el vendedor (incluido el "está en cadetería").',
    ],
    complaintFacts: [
      'Producto o servicio comprado: [___].',
      'Importe y medio de pago: [___].',
      'Fecha o plazo de entrega prometido: [___].',
      'Al día de hoy no recibí la compra ni una solución: [describí los reclamos previos].',
    ],
    remedies: [
      {
        id: 'entrega',
        label: 'Que entreguen lo comprado',
        request:
          'Exijo el cumplimiento de la compra y la entrega efectiva de lo adquirido dentro de [48/72] horas, sin costos adicionales.',
      },
      {
        id: 'devolucion',
        label: 'Cancelar y recuperar lo pagado',
        request:
          'Resuelvo el contrato y exijo la restitución inmediata de todo lo pagado, monetariamente actualizada, más los daños y perjuicios que correspondan.',
      },
    ],
  },
  {
    id: 'no-cancelan',
    group: 'cobro',
    label: 'No me dejan cancelar la compra',
    short: 'Estás dentro de los días y no te aceptan el arrepentimiento.',
    icon: 'mdi-cart-off',
    lever: 'Art. 16: arrepentimiento ipso jure',
    answer:
      'Si estás dentro de los 5 días hábiles de una compra a distancia, el arrepentimiento opera de pleno ' +
      'derecho (ipso jure) y sin responsabilidad: no necesitás el permiso del vendedor ni dar motivo. El ' +
      'contrato queda sin efecto y deben devolverte todo lo pagado de inmediato, anulándose además las ' +
      'cuotas pactadas con tarjeta. Una cláusula que diga "no se aceptan cancelaciones" es NULA por abusiva ' +
      'si recorta este derecho.',
    articles: [
      'Ley 17.250 art. 16 — rescisión "ipso jure" dentro de los 5 días hábiles, sin causa ni penalidad',
      'Ley 17.250 art. 31 — la cláusula que impide arrepentirte es abusiva y se tiene por no puesta',
    ],
    deadlines: [
      '5 días hábiles desde el contrato o desde la entrega, a tu opción.',
      'Si el vendedor no te informó por escrito ese derecho, el plazo NO corre y podés arrepentirte en cualquier momento.',
    ],
    evidence: [
      'Comunicación fehaciente de la cancelación (mail, WhatsApp con constancia, telegrama).',
      'Comprobante de pago.',
      'Captura de los términos y condiciones donde falte (o figure) el aviso del derecho de arrepentimiento.',
    ],
    complaintFacts: [
      'Compra o contrato celebrado a distancia el: [fecha].',
      'Producto o servicio: [___].',
      'Comuniqué mi arrepentimiento por [medio] el [fecha] y adjunto constancia.',
      'El comercio rechazó o ignoró la cancelación: [respuesta recibida].',
    ],
    remedies: [
      {
        id: 'cancelacion',
        label: 'Cancelar y obtener el reintegro',
        request:
          'Comunico el ejercicio del derecho de retracto, solicito que se deje sin efecto el contrato y que se restituya inmediatamente todo lo pagado por el mismo medio de pago.',
      },
    ],
  },
  {
    id: 'no-devuelven',
    group: 'cobro',
    label: 'No me devuelven la plata',
    short: 'Corresponde la devolución y no te reintegran.',
    icon: 'mdi-cash-refund',
    lever: 'Devolución inmediata + reajuste',
    answer:
      'Cuando corresponde la devolución (por arrepentimiento del art. 16 o por resolución del art. 33), el ' +
      'reintegro debe ser inmediato y por todo lo pagado. Si el vendedor se demora, tenés derecho a exigir la ' +
      'actualización monetaria de las sumas a restituir. En el retracto además se anulan las cuotas o pagos ' +
      'diferidos hechos con tarjeta. Si no cumple, reclamás ante Defensa del Consumidor.',
    articles: [
      'Ley 17.250 art. 16 — en el arrepentimiento, devolución inmediata y anulación de las cuotas con tarjeta',
      'Ley 17.250 art. 33 — resolución del contrato con devolución de lo pagado monetariamente actualizada',
    ],
    deadlines: [
      'La restitución debe ser inmediata; la demora habilita a exigir el reajuste de lo adeudado.',
      'Reclamo ante Defensa del Consumidor: duración estimada 45 días corridos; seguimiento a los 15 días hábiles del envío al proveedor.',
    ],
    evidence: [
      'Constancia de la devolución acordada o reclamada.',
      'Comprobante de pago original.',
      'Fechas de las comunicaciones para acreditar la demora.',
    ],
    complaintFacts: [
      'Compra o contrato: [___].',
      'Importe a reintegrar y medio de pago original: [___].',
      'La devolución fue solicitada o aceptada el: [fecha].',
      'Desde esa fecha no recibí el reintegro: [describí respuestas o comprobantes].',
    ],
    remedies: [
      {
        id: 'reintegro',
        label: 'Cobrar el reintegro pendiente',
        request:
          'Exijo la restitución inmediata de la totalidad de lo pagado por el mismo medio de pago, monetariamente actualizada por la demora.',
      },
    ],
  },
  {
    id: 'esta-en-cadeteria',
    group: 'entrega',
    label: 'Dice "está en cadetería" y nunca llega',
    short: '"Ya salió", "está en el día"… y no aparece.',
    icon: 'mdi-truck-alert-outline',
    lever: 'El plazo prometido obliga (art. 14)',
    answer:
      'El plazo de entrega prometido integra el contrato y es exigible. Si el vendedor incumple o te da ' +
      'información falsa sobre el estado del envío, viola el deber de buena fe y de informar, lo que te habilita ' +
      'a optar por la reparación, la resolución o el cumplimiento del contrato, en todos los casos más daños y ' +
      'perjuicios. Podés exigir que entregue ya, o resolver y recuperar tu plata actualizada. Que te "pasen para ' +
      'cadetería" un día tras otro no suspende ni corre ningún plazo a favor del comercio: la excusa no es cumplimiento.',
    articles: [
      'Ley 17.250 art. 14 — las precisiones de la oferta (incluido el plazo de entrega) obligan e integran el contrato',
      'Ley 17.250 art. 32 — deber de buena fe e información también durante la ejecución del contrato',
      'Ley 17.250 art. 33 — ante el incumplimiento, elegís cumplimiento, sustitución o resolución con devolución actualizada',
    ],
    deadlines: [
      'No hay plazo especial para reclamar el incumplimiento del contrato, pero conviene intimar apenas vencido el plazo de entrega prometido.',
    ],
    evidence: [
      'Captura del plazo de entrega publicado.',
      'Mensajes donde el vendedor dice que "ya salió" o "está en cadetería".',
      'Seguimiento del envío, si existe.',
      'Comprobante de pago.',
    ],
    complaintFacts: [
      'Producto y número de pedido: [___].',
      'Entrega prometida para el: [fecha].',
      'Estado o seguimiento informado por el comercio: [___].',
      'Días de atraso y reclamos ya realizados: [___].',
    ],
    remedies: [
      {
        id: 'entrega-seguimiento',
        label: 'Entrega inmediata con seguimiento',
        request:
          'Exijo la entrega efectiva dentro de [48/72] horas y el envío de un comprobante de despacho y seguimiento verificable, sin costos adicionales.',
      },
      {
        id: 'resolver-atraso',
        label: 'Cancelar por el atraso',
        request:
          'Ante el incumplimiento del plazo prometido, resuelvo el contrato y exijo la devolución inmediata de todo lo pagado, monetariamente actualizada.',
      },
    ],
  },
  {
    id: 'producto-defectuoso',
    group: 'producto',
    label: 'Llegó un producto fallado o distinto al publicado',
    short: 'Vino roto, no funciona o no es lo que compraste.',
    icon: 'mdi-package-variant-closed-remove',
    lever: 'Garantía legal por vicios',
    answer:
      'Tenés la protección legal por vicios: a tu elección podés exigir el arreglo o el cambio por equivalente, o ' +
      'resolver el contrato con devolución de lo pagado actualizada, más daños. Si el producto no coincide con lo ' +
      'publicado, además la oferta te obliga a tu favor. Ninguna cláusula que exonere al vendedor por vicios es ' +
      'válida: es abusiva. Esta garantía legal es un mínimo y es adicional a cualquier garantía comercial que te den.',
    articles: [
      'Ley 17.250 art. 32 — buena fe y deber de informar durante la ejecución del contrato',
      'Ley 17.250 art. 33 — reparación, sustitución o resolución con devolución actualizada, a tu elección',
      'Ley 17.250 art. 37 — plazos de caducidad de la garantía legal (vicios aparentes y ocultos)',
      'Ley 17.250 art. 31 — la cláusula que exonera al vendedor por vicios es abusiva',
    ],
    deadlines: [
      'Vicios aparentes: 30 días (producto o servicio no duradero) o 90 días (duradero), contados desde la entrega.',
      'Vicios ocultos: deben aparecer dentro de 6 meses y se reclaman dentro de los 3 meses de manifestarse.',
    ],
    evidence: [
      'Fotos o video del defecto y del producto recibido.',
      'Captura de la publicación para comparar con lo entregado.',
      'Factura o boleta y el certificado de garantía, si lo hay.',
      'Comunicaciones reclamando el arreglo o el cambio.',
    ],
    complaintFacts: [
      'Producto, marca, modelo y número de serie: [___].',
      'Fecha de entrega: [___].',
      'Defecto detectado y fecha en que apareció: [___].',
      'Uso normal realizado y reclamos o diagnósticos previos: [___].',
    ],
    remedies: [
      {
        id: 'reparacion',
        label: 'Reparación sin costo',
        request:
          'Exijo la reparación integral del producto, sin costo, dentro de un plazo razonable y con constancia escrita de las piezas y fechas de reparación.',
      },
      {
        id: 'sustitucion',
        label: 'Cambio por uno equivalente',
        request:
          'Exijo la sustitución del producto defectuoso por otro nuevo, equivalente y conforme a lo publicado, sin costos adicionales.',
      },
      {
        id: 'devolucion-defecto',
        label: 'Devolución del dinero',
        request:
          'Resuelvo el contrato por falta de conformidad y exijo la restitución de todo lo pagado, monetariamente actualizada, más los daños que correspondan.',
      },
    ],
  },
  {
    id: 'publicidad-enganosa',
    group: 'oferta-servicio',
    label: 'La publicidad era engañosa',
    short: 'Prometían algo que no cumplieron.',
    icon: 'mdi-bullhorn-variant-outline',
    lever: 'Prohibida — y la prueba es del anunciante',
    answer:
      'Está prohibida la publicidad total o parcialmente falsa, o que por omitir datos esenciales induzca a error ' +
      'sobre naturaleza, cantidad, origen o precio. Como la publicidad integra el contrato, podés exigir que se ' +
      'cumpla lo prometido o resolver, más daños. La carga de probar la veracidad de los datos publicitarios es del ' +
      'ANUNCIANTE (art. 26), no tuya. El organismo puede ordenar suspender la publicidad y disponer contrapublicidad ' +
      'a cargo del infractor (art. 51).',
    articles: [
      'Ley 17.250 art. 24 — definición y prohibición de la publicidad engañosa; toda publicidad debe poder identificarse',
      'Ley 17.250 art. 26 — la carga de probar la veracidad de los datos publicitarios es del anunciante',
      'Ley 17.250 art. 14 — la publicidad integra el contrato y es exigible',
      'Ley 17.250 art. 51 — el organismo puede ordenar suspender la publicidad y disponer contrapublicidad a cargo del infractor',
    ],
    deadlines: [
      'Denunciá cuanto antes ante Defensa del Consumidor; guardá el aviso porque suele bajarse.',
    ],
    evidence: [
      'Captura o grabación del aviso engañoso, con fecha.',
      'Comprobante de lo que efectivamente recibiste vs. lo publicitado.',
      'Comprobante de pago.',
    ],
    complaintFacts: [
      'Producto o servicio contratado: [___].',
      'Promesa concreta de la publicidad: [___].',
      'Lo que efectivamente recibí o se me cobró: [___].',
      'Adjunto captura o copia del anuncio difundido el: [fecha].',
    ],
    remedies: [
      {
        id: 'cumplir-publicidad',
        label: 'Que cumplan lo anunciado',
        request:
          'Exijo el cumplimiento íntegro de las condiciones publicitadas, que integran el contrato, sin costo adicional.',
      },
      {
        id: 'resolver-publicidad',
        label: 'Cancelar y recuperar lo pagado',
        request:
          'Resuelvo el contrato por incumplimiento de la oferta y exijo la restitución de todo lo pagado, monetariamente actualizada.',
      },
    ],
  },
  {
    id: 'pedido-incompleto-equivocado-danado',
    group: 'entrega',
    label: 'Llegó incompleto, equivocado o dañado en el envío',
    short: 'Faltan piezas, mandaron otro producto o llegó golpeado.',
    icon: 'mdi-package-variant-closed-alert',
    lever: 'Arts. 14 y 33: la entrega debe coincidir',
    answer:
      'Recibir algo distinto, incompleto o dañado no es cumplimiento. Si el envío era parte de la compra o fue ' +
      'organizado por el vendedor, reclamale al comercio: no puede derivarte sin más al correo o a la cadetería. ' +
      'Podés exigir que complete o sustituya el pedido sin costo, aceptar una reparación equivalente o resolver el ' +
      'contrato con devolución actualizada, más los daños que correspondan. Si contrataste al transportista por ' +
      'separado, puede existir además un reclamo propio contra ese transportista.',
    articles: [
      'Ley 17.250 art. 14 — la descripción y las condiciones publicadas integran el contrato',
      'Ley 17.250 art. 33 — ante el incumplimiento elegís cumplimiento, sustitución o resolución',
      'Ley 17.250 art. 37 — plazos para reclamar vicios aparentes u ocultos',
    ],
    deadlines: [
      'Avisá el faltante, error o daño apenas abrís el paquete y antes de descartar el embalaje.',
      'Si funciona como vicio aparente: 30 días para no duraderos o 90 días para duraderos desde la entrega.',
    ],
    evidence: [
      'Video o fotos de la apertura, el embalaje, la etiqueta y el estado del contenido.',
      'Remito o detalle del pedido para mostrar qué faltó o qué modelo correspondía.',
      'Captura de la publicación y comprobante de pago.',
      'Constancia del reclamo inmediato al vendedor y, si corresponde, al transportista.',
    ],
    complaintFacts: [
      'Producto y número de pedido: [___].',
      'Fecha de entrega y empresa que transportó: [___].',
      'Lo comprado: [___]. Lo efectivamente recibido: [___].',
      'Faltante, error o daño documentado: [___].',
    ],
    remedies: [
      {
        id: 'completar-sustituir',
        label: 'Completar o cambiar el pedido',
        request:
          'Exijo que se complete o sustituya el pedido por el producto correcto y en perfecto estado, sin costo adicional, dentro de [48/72] horas.',
      },
      {
        id: 'devolucion-pedido',
        label: 'Devolverlo y recuperar lo pagado',
        request:
          'Resuelvo el contrato por entrega no conforme y exijo la restitución de todo lo pagado, monetariamente actualizada, incluyendo los gastos de envío.',
      },
    ],
  },
  {
    id: 'garantia-reparacion-incumplida',
    group: 'producto',
    label: 'No cumplen la garantía o la reparación se eterniza',
    short: 'No reciben el producto, lo devuelven igual o no dan constancia.',
    icon: 'mdi-wrench-clock-outline',
    lever: 'Art. 23: garantía escrita y trazable',
    answer:
      'Si ofrecieron garantía, deben entregarla por escrito y cumplir su cobertura. Cada reparación en garantía ' +
      'debe dejar constancia de qué se hizo, qué piezas se cambiaron y las fechas de ingreso y devolución. Todo el ' +
      'tiempo que quedaste sin el producto prolonga el plazo de garantía. Si la reparación prometida no se cumple, ' +
      'podés usar las opciones del art. 33; y aun sin garantía comercial conservás el reclamo por vicios del art. 37.',
    articles: [
      'Ley 17.250 art. 23 — contenido de la garantía, constancia de reparación y extensión del plazo',
      'Ley 17.250 art. 33 — opciones frente al incumplimiento de la garantía ofrecida',
      'Ley 17.250 art. 37 — reclamo por vicios aunque no exista garantía comercial',
    ],
    deadlines: [
      'La garantía contractual rige por el plazo ofrecido y se extiende por todo el tiempo que el producto esté en reparación.',
      'Sin garantía comercial: vicios aparentes, 30/90 días; ocultos, aparición dentro de 6 meses y reclamo dentro de 3 meses.',
    ],
    evidence: [
      'Certificado o publicación donde ofrecieron la garantía.',
      'Órdenes de servicio, constancias de ingreso y diagnóstico técnico.',
      'Fechas exactas en que entregaste y recuperaste el producto.',
      'Fotos o videos que demuestren que la falla continúa.',
    ],
    complaintFacts: [
      'Producto, número de serie y garantía ofrecida: [___].',
      'Ingresó al servicio técnico el [fecha] por la falla: [___].',
      'Reparaciones realizadas o respuesta recibida: [___].',
      'Tiempo total sin poder usar el producto: [___].',
    ],
    remedies: [
      {
        id: 'cumplir-garantia',
        label: 'Que cumplan la garantía',
        request:
          'Exijo el cumplimiento efectivo de la garantía, sin costo y dentro de [plazo], con constancia completa de la reparación y extensión del plazo de cobertura.',
      },
      {
        id: 'sustituir-garantia',
        label: 'Cambio por falla reiterada',
        request:
          'Ante la reparación incumplida o ineficaz, exijo la sustitución por un producto equivalente y en perfecto funcionamiento, sin costo.',
      },
      {
        id: 'resolver-garantia',
        label: 'Devolución del dinero',
        request:
          'Ante el incumplimiento de la garantía, resuelvo el contrato y exijo la devolución de lo pagado, monetariamente actualizada.',
      },
    ],
  },
  {
    id: 'usado-como-nuevo',
    group: 'producto',
    label: 'Me vendieron como nuevo algo usado o reacondicionado',
    short: 'Tenía uso, piezas cambiadas o un defecto que no informaron.',
    icon: 'mdi-package-variant',
    lever: 'Art. 19: debían avisarlo claramente',
    answer:
      'La oferta de un producto defectuoso, usado o reconstituido debe decirlo de forma clara y visible. Si te lo ' +
      'vendieron como nuevo, la entrega no coincide con la oferta y podés exigir un producto nuevo conforme a lo ' +
      'publicado o resolver la compra con devolución actualizada. Guardá la publicación: lo informado obliga al vendedor.',
    articles: [
      'Ley 17.250 art. 19 — debe informarse de forma clara y visible si es defectuoso, usado o reconstituido',
      'Ley 17.250 art. 14 — la información publicada integra el contrato',
      'Ley 17.250 art. 33 — cumplimiento, sustitución o resolución a elección del consumidor',
    ],
    deadlines: [
      'Reclamá apenas detectes señales de uso o reacondicionamiento y conservá el estado del producto.',
      'Si existe un vicio aparente, aplican 30 días (no duradero) o 90 días (duradero) desde la entrega.',
    ],
    evidence: [
      'Captura donde se ofrecía como nuevo.',
      'Fotos del desgaste, sellos abiertos, ciclos de uso, piezas o embalaje.',
      'Número de serie y diagnóstico que permita acreditar uso previo, si existe.',
      'Factura, boleta y comunicaciones con el vendedor.',
    ],
    complaintFacts: [
      'Producto ofrecido como nuevo: [marca, modelo y serie].',
      'Fecha de entrega: [___].',
      'Indicios de uso, reconstrucción o defecto no informado: [___].',
      'La publicación o factura lo describía como: [___].',
    ],
    remedies: [
      {
        id: 'nuevo-conforme',
        label: 'Recibir uno realmente nuevo',
        request:
          'Exijo la sustitución por un producto nuevo, sellado y conforme a la oferta, sin costo adicional.',
      },
      {
        id: 'devolucion-usado',
        label: 'Devolverlo y recuperar lo pagado',
        request:
          'Resuelvo el contrato por información omitida y entrega no conforme, y exijo la restitución actualizada de todo lo pagado.',
      },
    ],
  },
  {
    id: 'producto-peligroso',
    group: 'producto',
    label: 'El producto parece peligroso o causó un daño',
    short: 'Sobrecalienta, da descarga, se incendia o pone en riesgo la salud.',
    icon: 'mdi-alert-octagon-outline',
    lever: 'Arts. 6 a 11: salud y seguridad',
    answer:
      'Dejá de usarlo y no intentes repararlo por tu cuenta. La ley protege la salud y la seguridad, exige advertir ' +
      'los riesgos y obliga al proveedor a comunicar a autoridades y consumidores una peligrosidad conocida después ' +
      'de la venta. Además del reclamo para retirar, cambiar o devolver el producto, una situación de riesgo amerita ' +
      'denuncia ante Defensa del Consumidor. Si hubo lesiones o daños materiales, conservá todo y buscá asesoramiento profesional.',
    articles: [
      'Ley 17.250 art. 6 lit. A y arts. 7 a 11 — protección, información y comunicación de riesgos',
      'Ley 17.250 art. 34 — responsabilidad cuando el vicio o riesgo causa un daño',
      'Ley 17.250 art. 38 — prescripción de la acción por daños personales',
    ],
    deadlines: [
      'Suspendé el uso y reportá el riesgo de inmediato; no esperes a que venza la garantía.',
      'Daños personales: la acción prescribe a los 4 años desde que conociste el daño, el defecto y la identidad del productor; se extingue a los 10 años de la puesta en el mercado.',
    ],
    evidence: [
      'Fotos o video del riesgo, sin exponerte nuevamente.',
      'Producto, embalaje, cargador, manual y número de serie: no los descartes.',
      'Factura, publicación y cualquier alerta o aviso del fabricante.',
      'Informes médicos, técnicos, de Bomberos o presupuestos de daños, si corresponde.',
    ],
    complaintFacts: [
      'Producto, marca, modelo y serie: [___].',
      'Riesgo o incidente ocurrido el [fecha]: [___].',
      'Daños personales o materiales producidos: [___].',
      'Medidas tomadas y aviso previo al proveedor: [___].',
    ],
    remedies: [
      {
        id: 'retiro-seguro',
        label: 'Retiro seguro y sustitución',
        request:
          'Exijo el retiro seguro del producto a cargo del proveedor y su sustitución por otro que no presente el riesgo, sin costo.',
      },
      {
        id: 'devolucion-peligro',
        label: 'Retiro y devolución del dinero',
        request:
          'Resuelvo el contrato y exijo el retiro seguro del producto, la devolución actualizada de lo pagado y el resarcimiento de los daños acreditados.',
      },
    ],
  },
  {
    id: 'precio-cargo-no-informado',
    group: 'cobro',
    label: 'Me cobraron otro precio o un cargo no informado',
    short: 'El total cambió, apareció una comisión o cobraron más cuotas.',
    icon: 'mdi-receipt-text-alert-outline',
    lever: 'Art. 15: precio total antes de comprar',
    answer:
      'Antes de contratar deben informarte el precio con impuestos, la financiación, cantidad y periodicidad de ' +
      'pagos, intereses y gastos adicionales. El precio y las condiciones publicadas integran el contrato. Si te ' +
      'cobraron más o agregaron un concepto no informado, reclamá la diferencia o resolvé el contrato por incumplimiento.',
    articles: [
      'Ley 17.250 art. 15 — precio con impuestos, financiación, intereses y gastos antes de contratar',
      'Ley 17.250 arts. 13 y 14 — prevalece la información más favorable y lo publicado obliga',
      'Ley 17.250 art. 33 — opciones ante el incumplimiento',
    ],
    deadlines: [
      'Reclamá apenas aparezca el cargo y antes del vencimiento del resumen si pagaste con tarjeta.',
      'Los plazos para desconocer o disputar el cargo con el emisor dependen del contrato y del medio de pago: consultalos de inmediato.',
    ],
    evidence: [
      'Captura del precio final, carrito y condiciones de cuotas antes de confirmar.',
      'Factura, comprobante y resumen donde aparece la diferencia.',
      'Detalle del cargo, comisión, interés o cuota que no fue informado.',
      'Respuesta del comercio y número de reclamo ante el emisor, si existe.',
    ],
    complaintFacts: [
      'Precio total y condiciones informadas antes de comprar: [___].',
      'Importe o concepto efectivamente cobrado: [___].',
      'Diferencia reclamada: [___].',
      'Fecha, medio de pago y comprobante: [___].',
    ],
    remedies: [
      {
        id: 'reintegrar-diferencia',
        label: 'Reintegro de la diferencia',
        request:
          'Exijo el reintegro inmediato de la diferencia y la corrección de las cuotas o cargos para respetar el precio y las condiciones informadas.',
      },
      {
        id: 'resolver-cargo',
        label: 'Cancelar por el cobro incorrecto',
        request:
          'Resuelvo el contrato por cobro no informado y exijo la restitución actualizada de todo lo pagado y la anulación de cargos pendientes.',
      },
    ],
  },
  {
    id: 'renovacion-cobro-recurrente',
    group: 'cobro',
    label: 'Renovaron la suscripción o siguen cobrando después de la baja',
    short: 'Se renovó sola, no tramitan la baja o reaparecen cargos.',
    icon: 'mdi-autorenew-off',
    lever: 'Art. 31 lit. I: baja dentro de 60 días',
    answer:
      'Es abusiva la cláusula que te obliga a avisar antes de una fecha límite para evitar la renovación automática. ' +
      'Dentro de los 60 días corridos desde la renovación podés rescindir o resolver el contrato, incluso si es una ' +
      'cuota social o afiliación, y el proveedor tiene como máximo 15 días corridos para procesar la baja. Guardá ' +
      'constancia: los cobros posteriores a la baja efectiva o por un servicio no prestado también se reclaman.',
    articles: [
      'Ley 17.250 art. 31 lit. I — rescisión dentro de 60 días de la renovación y baja en máximo 15 días',
      'Ley 17.250 art. 31 lits. B y H — no vale la renuncia de derechos ni tomar el silencio como aceptación',
      'Ley 17.250 art. 33 — remedios frente a cargos o prestaciones incumplidas',
    ],
    deadlines: [
      'Pedí la baja dentro de los 60 días corridos desde la renovación automática.',
      'El proveedor tiene un máximo de 15 días corridos desde tu solicitud para procesarla.',
    ],
    evidence: [
      'Contrato y fecha exacta de la renovación.',
      'Constancia fechada de la solicitud de baja.',
      'Resúmenes o recibos con los cobros posteriores.',
      'Capturas donde la empresa niega la baja o exige un preaviso vencido.',
    ],
    complaintFacts: [
      'Servicio, suscripción o afiliación: [___].',
      'Fecha de renovación automática: [___].',
      'Solicité la baja el [fecha] por [medio], con número de gestión [___].',
      'Cobros posteriores o respuesta recibida: [___].',
    ],
    remedies: [
      {
        id: 'procesar-baja',
        label: 'Procesar la baja',
        request:
          'Solicito la rescisión de la renovación automática y exijo que la baja se procese dentro del máximo legal de 15 días corridos, cesando los cobros.',
      },
      {
        id: 'reintegrar-post-baja',
        label: 'Baja y devolución de cobros posteriores',
        request:
          'Exijo la baja definitiva y el reintegro de todo cargo efectuado después de la fecha en que debió quedar procesada, con anulación de débitos futuros.',
      },
    ],
  },
  {
    id: 'servicio-digital-no-prestado',
    group: 'oferta-servicio',
    label: 'El servicio o contenido digital no se prestó como prometieron',
    short: 'Curso, reserva, software o trabajo pagado que no funciona o quedó a medias.',
    icon: 'mdi-laptop-off',
    lever: 'Arts. 20 y 33: descripción y plazo obligan',
    answer:
      'La oferta de servicios debe informar quién presta, qué incluye, materiales o tecnología, plazo, precio y ' +
      'garantía cuando exista. Si no lo prestan, queda incompleto o no coincide con lo contratado, podés exigir ' +
      'cumplimiento, aceptar una prestación equivalente o resolver con devolución actualizada. En un retracto, ' +
      'solo pagás la parte efectivamente ejecutada; el contenido digital ya iniciado tiene una excepción específica ' +
      'si consentiste expresamente comenzar y reconociste perder el desistimiento.',
    articles: [
      'Ley 17.250 art. 20 — información obligatoria en la oferta de servicios',
      'Ley 17.250 art. 33 — opciones ante servicio no prestado o no conforme',
      'Ley 17.250 arts. 16 y 16-BIS lit. H — retracto, parte ejecutada y excepción del contenido digital iniciado',
    ],
    deadlines: [
      'Si usás el retracto y no aplica una excepción: 5 días hábiles desde el contrato o la entrega, a tu opción.',
      'Si es incumplimiento, reclamá apenas venza el plazo o compruebes que el servicio no coincide.',
    ],
    evidence: [
      'Descripción, alcance, fecha y condiciones del servicio publicado.',
      'Comprobante de pago y contrato o correo de confirmación.',
      'Capturas del error, contenido inaccesible o entregable incompleto.',
      'Registro de horas, sesiones o parte efectivamente prestada.',
    ],
    complaintFacts: [
      'Servicio o contenido contratado: [___].',
      'Alcance y fecha de cumplimiento prometidos: [___].',
      'Parte efectivamente prestada: [___].',
      'Incumplimiento, error o faltante: [___].',
    ],
    remedies: [
      {
        id: 'cumplir-servicio',
        label: 'Que completen o corrijan el servicio',
        request:
          'Exijo el cumplimiento completo y conforme del servicio dentro de [plazo], sin costo adicional.',
      },
      {
        id: 'devolver-servicio',
        label: 'Devolución total o de la parte no prestada',
        request:
          'Resuelvo el contrato y exijo la devolución inmediata y actualizada de lo pagado por la parte no ejecutada, o de la totalidad si la prestación carece de utilidad.',
      },
    ],
  },
  {
    id: 'producto-servicio-no-solicitado',
    group: 'oferta-servicio',
    label: 'Me enviaron o activaron algo que nunca pedí',
    short: 'Llegó un producto o apareció un servicio sin haberlo contratado.',
    icon: 'mdi-package-variant-remove',
    lever: 'Art. 22 lit. D: no pagás ni devolvés',
    answer:
      'Enviar un producto o activar un servicio que no pediste es una práctica abusiva. La ley lo equipara a una ' +
      'muestra gratis: no genera obligación de pago ni de devolución. No uses ni aceptes condiciones nuevas; ' +
      'dejá constancia de que nunca lo solicitaste y reclamá la anulación de cualquier cargo o deuda asociada.',
    articles: [
      'Ley 17.250 art. 22 lit. D — lo no solicitado no genera obligación de pago ni devolución',
      'Ley 17.250 art. 31 lit. H — el silencio no puede tomarse como aceptación',
    ],
    deadlines: [
      'Desconocé por escrito el producto, servicio o cargo apenas lo detectes.',
      'Si aparece en una tarjeta o débito, avisá también al emisor dentro de su plazo contractual.',
    ],
    evidence: [
      'Foto del paquete, etiqueta o pantalla donde aparece el servicio.',
      'Contrato y comunicaciones que muestran que nunca lo solicitaste.',
      'Factura, resumen o estado de cuenta si generaron un cargo.',
      'Constancia del desconocimiento enviado al proveedor.',
    ],
    complaintFacts: [
      'Producto o servicio no solicitado: [___].',
      'Fecha en que fue enviado, activado o cobrado: [___].',
      'Nunca presté consentimiento ni realicé este pedido: [detalles].',
      'Cargo, factura o deuda generada: [___].',
    ],
    remedies: [
      {
        id: 'anular-no-solicitado',
        label: 'Anular el servicio o cargo',
        request:
          'Exijo la baja inmediata del servicio, la anulación de todo cargo o deuda y confirmación escrita de saldo cero; dejo constancia de que no existe obligación de pago ni devolución.',
      },
    ],
  },
])

/** Los derechos de fondo, para la sección "qué te da la ley". */
export const CONSUMER_RIGHTS: readonly ConsumerRight[] = Object.freeze([
  {
    title: 'Derecho de arrepentimiento (retracto) en 5 días hábiles',
    plain:
      'En toda compra hecha fuera del local (web, teléfono, TV, catálogo) podés dejar la compra sin efecto ' +
      'dentro de 5 días hábiles, sin dar ninguna explicación y sin multa. El vendedor debe devolverte de ' +
      'inmediato todo lo pagado.',
    articles: ['Ley 17.250 art. 16'],
    practical:
      'Comunicá tu arrepentimiento por un medio fehaciente (mail verificable, WhatsApp con constancia, ' +
      'telegrama colacionado o carta con acuse). Contás el plazo desde que firmaste el contrato o desde que ' +
      'recibiste el producto, lo que te convenga. Devolvés el producto sin uso; podés haber abierto el paquete ' +
      'para revisarlo.',
  },
  {
    title: 'La oferta y la publicidad obligan al vendedor',
    plain:
      'Lo que la tienda publicó —producto, precio, plazo de entrega, características— la obliga e integra el ' +
      'contrato. Si la publicidad promete algo, es exigible.',
    articles: ['Ley 17.250 art. 12', 'Ley 17.250 art. 14'],
    practical:
      'Sacá captura de pantalla de la publicación con el precio, el plazo de entrega y las condiciones. Si hay ' +
      'dos datos contradictorios en la oferta, prevalece el más favorable para vos (art. 13).',
  },
  {
    title: 'Elegís vos el remedio ante el incumplimiento',
    plain:
      'Si el vendedor no cumple (no entrega, entrega tarde o mal), a tu libre elección podés: (A) exigir el ' +
      'cumplimiento forzado, (B) aceptar otro producto o la reparación por equivalente, o (C) resolver el contrato ' +
      'y que te devuelvan lo pagado monetariamente actualizado. La elección es tuya, no del comercio.',
    articles: ['Ley 17.250 art. 33'],
    practical:
      'Al reclamar, dejá claro por escrito cuál de las tres opciones elegís. En cualquiera de las tres tenés ' +
      'además derecho a que te resarzan daños y perjuicios.',
  },
  {
    title: 'Información clara, veraz y en español',
    plain:
      'Tenés derecho a información suficiente, clara y veraz en idioma español, y a que el precio se informe con ' +
      'impuestos incluidos antes de contratar.',
    articles: ['Ley 17.250 art. 6 lit. C', 'Ley 17.250 art. 15'],
    practical:
      'Exigí que el precio total (con IVA) y los cargos por financiación o pago con tarjeta figuren claros antes de ' +
      'confirmar la compra.',
  },
  {
    title: 'Protección contra la publicidad engañosa',
    plain:
      'Está prohibida toda publicidad engañosa: la que sea total o parcialmente falsa, o que por omitir datos ' +
      'esenciales pueda inducirte a error sobre naturaleza, cantidad, origen o precio. Toda publicidad debe poder ' +
      'identificarse como tal.',
    articles: ['Ley 17.250 art. 24', 'Ley 17.250 art. 25', 'Ley 17.250 art. 26'],
    practical:
      'Guardá el aviso engañoso. La carga de probar que los datos publicitarios son verdaderos recae sobre el ' +
      'anunciante (art. 26), no sobre vos. El organismo puede ordenar la suspensión de la publicidad y ' +
      'contrapublicidad a cargo del infractor (art. 51).',
  },
  {
    title: 'Garantía legal por vicios o defectos',
    plain:
      'Aunque la ley no la llame así, existe una protección legal mínima e irrenunciable ante productos o ' +
      'servicios con defectos: podés exigir cumplimiento, sustitución o reparación por equivalente, o resolver ' +
      'con devolución actualizada, más daños. Es adicional a cualquier garantía comercial.',
    articles: ['Ley 17.250 art. 32', 'Ley 17.250 art. 33', 'Ley 17.250 art. 37'],
    practical:
      'Reclamá dentro de plazo: vicios aparentes, 30 días (no duradero) o 90 días (duradero) desde la entrega; ' +
      'vicios ocultos, deben aparecer dentro de 6 meses y se reclaman dentro de los 3 meses siguientes.',
  },
  {
    title: 'La garantía comercial nunca reduce tus derechos legales',
    plain:
      'La garantía escrita del comercio es voluntaria y se suma a la protección legal; como la ley es de orden ' +
      'público, ninguna garantía comercial ni cláusula puede dejarte por debajo del mínimo legal.',
    articles: ['Ley 17.250 art. 1', 'Ley 17.250 art. 23', 'Ley 17.250 art. 30'],
    practical:
      'Si te ofrecen garantía, debe ser por escrito e indicar quién la da, el fabricante o importador, el ' +
      'producto, el plazo y la cobertura, dónde se hace efectiva y los costos a tu cargo si los hubiera (art. 23). ' +
      'El plazo se prolonga por el tiempo que el producto esté en reparación.',
  },
  {
    title: 'Las cláusulas abusivas son nulas',
    plain:
      'En los términos y condiciones de las tiendas son abusivas (y se tienen por no puestas) las cláusulas que ' +
      'generan un desequilibrio injustificado en tu perjuicio o que violan la buena fe: exonerar responsabilidad ' +
      'por vicios, hacerte renunciar a derechos, dejar que el vendedor cambie el contrato o que tu silencio se ' +
      'tome como aceptación.',
    articles: ['Ley 17.250 art. 30', 'Ley 17.250 art. 31'],
    practical:
      'Un "no se aceptan cancelaciones ni devoluciones" que recorte tus derechos legales es nulo aunque figure ' +
      'aceptado. La lista del art. 31 no es taxativa: puede haber otras cláusulas abusivas. Podés pedir su nulidad ' +
      'y el juez integra el contrato.',
  },
  {
    title: 'El precio final y todos los cargos deben aparecer antes de comprar',
    plain:
      'La oferta debe mostrar el precio con impuestos. Si hay crédito o cuotas, también debe informar el total ' +
      'financiado, cantidad y frecuencia de pagos, intereses y cualquier gasto extra.',
    articles: ['Ley 17.250 art. 15'],
    practical:
      'Guardá una captura del último paso del carrito. Si el cobro no coincide, exigí que respeten el precio ' +
      'informado o que reintegren la diferencia; avisá además al emisor si aparece en una tarjeta.',
  },
  {
    title: 'Podés salir de una renovación automática',
    plain:
      'No pueden imponerte una fecha límite previa a la renovación para dejarte atrapado. Desde que se renueva ' +
      'automáticamente tenés 60 días corridos para pedir la baja y la empresa tiene hasta 15 días corridos para procesarla.',
    articles: ['Ley 17.250 art. 31 lit. I'],
    practical:
      'Pedí la baja por un medio que deje fecha y número de gestión. Guardá los resúmenes y reclamá cualquier ' +
      'cobro que continúe después del plazo máximo de procesamiento.',
  },
  {
    title: 'Lo que nunca pediste no se paga ni se devuelve',
    plain:
      'Un producto enviado o un servicio activado sin solicitud previa se considera una práctica abusiva y se ' +
      'equipara a una muestra gratis: no genera obligación de pago ni de devolución.',
    articles: ['Ley 17.250 art. 22 lit. D'],
    practical:
      'Desconocelo por escrito, pedí saldo cero y no aceptes condiciones posteriores. Si lo cargaron a una ' +
      'tarjeta o cuenta, notificá también al emisor.',
  },
  {
    title: 'Deben advertirte si es usado, reacondicionado o peligroso',
    plain:
      'La condición de defectuoso, usado o reconstituido debe figurar clara y visible. Además, los riesgos para ' +
      'la salud o seguridad deben informarse y una peligrosidad conocida después de la venta debe comunicarse.',
    articles: ['Ley 17.250 arts. 7 a 11', 'Ley 17.250 art. 17', 'Ley 17.250 art. 19'],
    practical:
      'Si hay riesgo, dejá de usar el producto, conservá toda la prueba y presentá además una denuncia ante ' +
      'Defensa del Consumidor. Si hubo daño personal o material, buscá asesoramiento profesional.',
  },
])

/** La escalera de reclamo, en el orden en que hay que darla. */
export const COMPLAINT_STEPS: readonly ComplaintStep[] = Object.freeze([
  {
    step: '1. Reclamá primero al proveedor por escrito',
    detail:
      'Contactá a la tienda por un medio que deje constancia (mail, WhatsApp, formulario) explicando el problema y ' +
      'qué exigís (entrega, cambio o devolución actualizada). Guardá todo. Si es arrepentimiento en compra a ' +
      'distancia, hacelo dentro de los 5 días hábiles y por medio fehaciente.',
  },
  {
    step: '2. Intimá formalmente si no responde',
    detail:
      'Enviá una intimación por medio fehaciente (telegrama colacionado con aviso de retorno, carta con acuse o ' +
      'mail verificable) dando un plazo para cumplir y advirtiendo que, en su defecto, iniciarás reclamo ante ' +
      'Defensa del Consumidor. Esto fija fecha cierta y refuerza tu prueba.',
  },
  {
    step: '3. Presentá el reclamo ante Defensa del Consumidor (MEF)',
    detail:
      'Es gratis. Se hace en línea en gub.uy (trámite "Consulta, reclamo y/o denuncia en materia de defensa del ' +
      'consumidor"), accediendo con Usuario gub.uy nivel intermedio o identidad electrónica (Cédula Digital, ' +
      'Identidad Digital Abitab o TuID Antel). Quien no use medios digitales puede iniciarlo por el 0800 7005 (lun ' +
      'a vie 9:30 a 16 h). Aportá tus datos, los del comercio y toda la prueba.',
  },
  {
    step: '4. Audiencia de conciliación / mediación',
    detail:
      'La oficina puede citar al proveedor a una audiencia administrativa (convocada con no menos de 3 días de ' +
      'antelación) para intentar un acuerdo. Se labra un acta firmada por las partes con las pretensiones y el ' +
      'resultado. El reclamo busca solucionar; la denuncia apunta a sancionar.',
  },
  {
    step: '5. Denuncia y expediente sancionatorio',
    detail:
      'Si no hay acuerdo, puede abrirse un expediente sancionatorio contra el proveedor: se labra acta y el ' +
      'infractor tiene 10 días hábiles para descargos. Las sanciones posibles (Cap. XVI de la ley) van de ' +
      'apercibimiento a multa de 20 a 4.000 UR (art. 47), decomiso, clausura de hasta 90 días y suspensión en ' +
      'los registros de proveedores del Estado. Seguimiento: llamá al 0800 7005 a los 15 días hábiles de enviado ' +
      'el reclamo al proveedor.',
  },
])

export const CONSUMER_FAQS: readonly Faq[] = Object.freeze([
  {
    q: '¿La compra por internet está incluida en el derecho de arrepentimiento?',
    a: 'Sí. El art. 16 aplica a las ofertas hechas fuera del local por medio postal, telefónico, televisivo, informático o similar, y el propio MEF confirma que la compra por web queda comprendida.',
  },
  {
    q: '¿El plazo de 5 días es corrido o hábil?',
    a: 'Son 5 días hábiles, no corridos. Podés contarlos desde que se formalizó el contrato o desde que recibiste el producto, eligiendo la fecha que más te convenga.',
  },
  {
    q: '¿Tengo que explicar por qué me arrepiento?',
    a: 'No. El arrepentimiento no requiere causa ni justificación y opera de pleno derecho, sin ninguna multa ni penalidad para vos. Solo tenés que comunicarlo por un medio fehaciente.',
  },
  {
    q: '¿Quién paga el flete de la devolución si me arrepiento?',
    a: 'Cada parte carga con sus costos de restitución, y en la práctica el gasto de retorno del producto es a cargo del consumidor. En cambio, si la devolución es por un producto fallado, es distinto: no podés cargar con costos que legalmente son del vendedor.',
  },
  {
    q: '¿Qué pasa si la tienda no me informó del derecho de arrepentimiento?',
    a: 'Si el vendedor no informó por escrito y de forma clara ese derecho, el plazo de 5 días no empieza a correr y podés ejercer la rescisión en cualquier momento.',
  },
  {
    q: 'Me cobraron y no me entregan. ¿Qué exijo?',
    a: 'A tu libre elección: que te entreguen (cumplimiento forzado), aceptar un reemplazo, o resolver el contrato y recuperar todo lo pagado monetariamente actualizado. En cualquier caso tenés derecho a daños y perjuicios (art. 33).',
  },
  {
    q: 'Pagué con tarjeta. ¿Puedo pedir que reversen el cobro?',
    a: 'Podés pedir el contracargo (chargeback) a tu emisor. No es un derecho de la Ley 17.250 sino una regla de las redes Visa/Mastercard y de tu contrato de tarjeta; los plazos los define el emisor, así que reclamá apenas veas el cargo. En paralelo conservás tu reclamo de fondo contra el vendedor.',
  },
  {
    q: 'Pagué por transferencia o Abitab/RedPagos y no llegó nada. ¿Tengo cómo recuperarlo?',
    a: 'En esos medios no existe contracargo: una vez acreditado o cobrado, no hay reversa unilateral. Reclamá por escrito al vendedor y usá la mediación de Defensa del Consumidor. Si además hay indicios concretos de engaño deliberado o el vendedor desapareció, puede corresponder una denuncia penal por estafa; un simple atraso no la configura automáticamente.',
  },
  {
    q: 'El producto vino fallado. ¿Hasta cuándo puedo reclamar?',
    a: 'Por vicios aparentes tenés 30 días si el producto o servicio no es duradero y 90 días si es duradero, contados desde la entrega. Por vicios ocultos, deben aparecer dentro de 6 meses y se reclaman dentro de los 3 meses de manifestarse.',
  },
  {
    q: 'Los términos y condiciones decían "no se aceptan devoluciones". ¿Vale?',
    a: 'No, si esa cláusula recorta tus derechos legales. Son nulas por abusivas las cláusulas que exoneran responsabilidad por vicios, te hacen renunciar a derechos o toman tu silencio como aceptación. La ley es de orden público: esos derechos son irrenunciables.',
  },
  {
    q: '¿El retracto de 5 días aplica a cualquier compra online?',
    a: 'No. El art. 16-BIS excluye, entre otros, productos personalizados, perecederos, ciertos productos de salud o higiene desprecintados, software o grabaciones precintadas que abriste, subastas públicas, alojamiento/comida/esparcimiento con fecha específica y contenido digital iniciado con consentimiento expreso y aviso de pérdida del desistimiento. Aunque no haya retracto, conservás tus derechos si existe defecto o incumplimiento.',
  },
  {
    q: 'Me llegó otro producto, faltan piezas o vino roto. ¿Le reclamo al vendedor o al correo?',
    a: 'Si el envío era parte de la compra o lo organizó el vendedor, reclamale al comercio: la entrega debe coincidir con el contrato y podés exigir que complete o cambie el pedido, o resolver la compra. Si contrataste al transportista por separado, puede existir además un reclamo propio contra él. Documentá el embalaje y el contenido apenas lo abrís.',
  },
  {
    q: 'No me dieron garantía escrita. ¿Igual puedo reclamar por una falla?',
    a: 'Sí. La garantía comercial puede no existir, pero el MEF confirma que aun así podés reclamar por vicios aparentes u ocultos dentro de los plazos del art. 37. Si la garantía fue ofrecida, debe entregarse por escrito y cumplir los requisitos del art. 23.',
  },
  {
    q: '¿Qué pasa con el plazo mientras el producto está en el service?',
    a: 'Todo el tiempo durante el cual no podés usar el producto por una reparación en garantía prolonga el plazo de la garantía contractual. Además, deben darte una constancia con la reparación, piezas cambiadas y fechas de ingreso y devolución.',
  },
  {
    q: 'Se renovó automáticamente una suscripción. ¿Todavía puedo darla de baja?',
    a: 'Sí. Dentro de los 60 días corridos desde la renovación automática podés rescindir o resolver el contrato, incluso una cuota social o afiliación. El proveedor tiene un máximo de 15 días corridos para procesar la baja (art. 31 lit. I).',
  },
  {
    q: 'Me enviaron algo que nunca pedí. ¿Tengo que pagarlo o devolverlo?',
    a: 'No. El art. 22 lit. D equipara el producto o servicio no solicitado a una muestra gratis: no genera obligación de pago ni de devolución. Desconocelo por escrito y pedí que anulen cualquier cargo o deuda.',
  },
  {
    q: 'El producto está bien, pero cambié de opinión. ¿Siempre tienen que aceptarme el cambio?',
    a: 'No siempre. En una compra online podés usar el retracto dentro de 5 días hábiles si no aplica una excepción del art. 16-BIS. Fuera de ese derecho, el cambio por gusto, talle o preferencia solo es exigible si el comercio lo ofreció en la factura, publicación o condiciones de venta. Esto es distinto de un producto defectuoso o no conforme, que sí habilita un reclamo legal.',
  },
  {
    q: 'Compré a través de un marketplace. ¿A quién reclamo?',
    a: 'Reclamá primero al vendedor identificado en la factura o pedido y usá también el sistema de protección del marketplace. Guardá los datos de ambos y toda la conversación. La responsabilidad concreta de la plataforma depende de su intervención en la oferta, el cobro y la entrega; si no se resuelve, incluí esos datos en el reclamo ante Defensa del Consumidor.',
  },
  {
    q: '¿Cuánto cuesta reclamar y cuánto demora?',
    a: 'El trámite ante Defensa del Consumidor es gratuito. La duración total estimada es de 45 días corridos; podés consultar el estado llamando al 0800 7005 a los 15 días hábiles de que la oficina envía el reclamo al proveedor.',
  },
  {
    q: '¿Qué sanciones puede recibir la tienda?',
    a: 'Según la gravedad: apercibimiento, multa de 20 a 4.000 UR, decomiso de mercadería, clausura de hasta 90 días y suspensión de hasta un año en los registros de proveedores del Estado, además del "cartel de infractor" por hasta 20 días.',
  },
])

export const CONSUMER_SOURCES: readonly SourceLink[] = Object.freeze([
  {
    label: 'Ley N.º 17.250 de Relaciones de Consumo — texto oficial completo',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 17.250 art. 16 — derecho de retracto (arrepentimiento en ventas a distancia)',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/16',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 17.250 art. 16-BIS — excepciones al derecho de retracto',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/16_BIS',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 17.250 art. 15 — precio, financiación y gastos que deben informarse',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/15',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 17.250 arts. 19, 22 y 23 — usados, productos no solicitados y garantías',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 17.250 art. 33 — incumplimiento del proveedor y opciones del consumidor',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/33',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 17.250 art. 31 — cláusulas abusivas',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/31',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 17.250 art. 37 — plazos de caducidad por vicios aparentes y ocultos',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/37',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 17.250 art. 47 — sanciones (multa 20 a 4.000 UR, clausura, etc.)',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/47',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: '¿El consumidor puede dejar sin efecto la compraventa hecha por web? — guía oficial',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/consumidor-tiene-derecho-dejar-sin-efecto-compraventa-hecha-web-haciendo',
    publisher: 'MEF — Área de Defensa del Consumidor',
  },
  {
    label: 'Consulta, reclamo y/o denuncia en materia de defensa del consumidor — trámite en línea',
    url: 'https://www.gub.uy/tramites/consulta-reclamo-yo-denuncia-materia-defensa-consumidor',
    publisher: 'gub.uy — MEF',
  },
  {
    label: 'Vías de atención de la Unidad de Defensa del Consumidor (0800 7005)',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/vias-atencion-unidad-defensa-del-consumidor',
    publisher: 'MEF',
  },
  {
    label: 'Preguntas frecuentes oficiales — cambios, retracto, garantías y renovaciones',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/defensa-del-consumidor',
    publisher: 'MEF — Unidad Defensa del Consumidor',
  },
  {
    label: 'Decreto 244/000 — reglamentario de la Ley 17.250',
    url: 'https://www.impo.com.uy/bases/decretos/244-2000',
    publisher: 'IMPO — Centro de Información Oficial',
  },
])

export const KEY_FIGURES: readonly KeyFigure[] = Object.freeze([
  { label: 'Arrepentimiento (venta a distancia)', value: '5 días hábiles' },
  { label: 'Inicio del plazo', value: 'Contrato o entrega, a tu opción' },
  { label: 'Vicios aparentes — no duradero', value: '30 días desde la entrega' },
  { label: 'Vicios aparentes — duradero', value: '90 días desde la entrega' },
  { label: 'Vicios ocultos', value: 'Aparecer en 6 meses; reclamar en 3' },
  { label: 'Defensa del Consumidor (MEF)', value: '0800 7005' },
  { label: 'Costo del reclamo', value: 'Gratuito' },
  { label: 'Duración estimada', value: '45 días corridos' },
  { label: 'Descargos del infractor', value: '10 días hábiles' },
  { label: 'Multa al infractor', value: '20 a 4.000 UR' },
  { label: 'Clausura temporal máxima', value: 'Hasta 90 días' },
])

/** Buscar un escenario por id. */
export function scenarioById(id: string): ConsumerScenario | undefined {
  return CONSUMER_SCENARIOS.find(s => s.id === id)
}

/** Genera el texto final sin depender de Vue, para poder probar cada incidente y solución. */
export function buildConsumerComplaint(scenarioId: string, remedyId?: string): string {
  const scenario = scenarioById(scenarioId)
  if (!scenario) return ''

  const remedy = scenario.remedies.find(item => item.id === remedyId) ?? scenario.remedies[0]
  if (!remedy) return ''

  const articles = scenario.articles
    .map(article => article.split(' — ')[0])
    .slice(0, 4)
    .join('; ')
  const facts = scenario.complaintFacts.map(fact => `- ${fact}`).join('\n')

  return `[localidad], [fecha]

A: [nombre legal del comercio o proveedor]
De: [tu nombre completo], C.I. [tu cédula]
Compra, pedido o contrato N.º: [número] — Fecha: [fecha]

RECLAMO EN MATERIA DE RELACIÓN DE CONSUMO
Tipo de incidente: ${scenario.label}

Hechos:
${facts}

Solicitud:
${remedy.request}

Fundo este reclamo en la Ley 17.250 de Relaciones de Consumo (${articles}). Dejo constancia de
que sus disposiciones son de orden público y de que adjunto la documentación que acredita los
hechos. Solicito una respuesta concreta por este mismo medio dentro de [48/72] horas.

Si no recibo una solución, presentaré el reclamo y la documentación ante la Unidad Defensa del
Consumidor del Ministerio de Economía y Finanzas, sin perjuicio de las demás acciones que
correspondan.

Adjuntos: [factura o comprobante], [capturas], [fotos o video], [reclamos previos].

Saluda atentamente,
[firma]
[nombre] — C.I. [cédula]
[teléfono] — [correo]`
}
