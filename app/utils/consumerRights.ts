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
      'RedPagos no hay contracargo: la recuperación pasa por la denuncia penal por estafa y la mediación ' +
      'de Defensa del Consumidor.',
    articles: [
      'Ley 17.250 art. 33 — incumplimiento: cumplimiento forzado, sustitución o resolución con devolución actualizada, a tu elección',
      'Ley 17.250 art. 16 — arrepentimiento en la venta a distancia (5 días hábiles)',
      'Ley 17.250 arts. 12 y 14 — la oferta y la publicidad obligan e integran el contrato',
    ],
    deadlines: [
      'Arrepentimiento: 5 días hábiles desde el contrato o desde la entrega, a tu opción.',
      'Contracargo con tarjeta: orientativo ~120 días de la red, pero el emisor local suele exigir mucho menos — confirmalo con tu banco apenas veas el cargo.',
    ],
    evidence: [
      'Comprobante de pago (voucher, resumen de tarjeta, transferencia o giro).',
      'Factura o boleta.',
      'Captura de la publicación con el precio y el plazo de entrega prometido.',
      'Chats, mails y WhatsApp con el vendedor (incluido el "está en cadetería").',
    ],
  },
  {
    id: 'no-cancelan',
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
  },
  {
    id: 'no-devuelven',
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
      'Reclamo ante Defensa del Consumidor: duración estimada ~45 días hábiles; seguimiento a los 15 días hábiles.',
    ],
    evidence: [
      'Constancia de la devolución acordada o reclamada.',
      'Comprobante de pago original.',
      'Fechas de las comunicaciones para acreditar la demora.',
    ],
  },
  {
    id: 'esta-en-cadeteria',
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
      'Ley 17.250 art. 32 — el proveedor responde por los vicios o la falta de conformidad de lo entregado',
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
  },
  {
    id: 'producto-defectuoso',
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
      'Ley 17.250 art. 32 — responsabilidad del proveedor por vicios o falta de conformidad',
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
  },
  {
    id: 'publicidad-enganosa',
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
    a: 'En esos medios no existe contracargo: una vez acreditado o cobrado, no hay reversa unilateral. La recuperación depende de la denuncia penal por estafa (los giros por redes de cobranza exigen la cédula del beneficiario, lo que ayuda a identificarlo) y de la mediación de Defensa del Consumidor. La protección es bastante menor que con tarjeta.',
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
    q: '¿Cuánto cuesta reclamar y cuánto demora?',
    a: 'El trámite ante Defensa del Consumidor es gratuito. La duración estimada es de unos 45 días hábiles; podés consultar el estado llamando al 0800 7005 a los 15 días hábiles de que la oficina envía el reclamo al proveedor.',
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
  { label: 'Duración estimada', value: '~45 días hábiles' },
  { label: 'Descargos del infractor', value: '10 días hábiles' },
  { label: 'Multa al infractor', value: '20 a 4.000 UR' },
  { label: 'Clausura temporal máxima', value: 'Hasta 90 días' },
])

/** Buscar un escenario por id. */
export function scenarioById(id: string): ConsumerScenario | undefined {
  return CONSUMER_SCENARIOS.find(s => s.id === id)
}
