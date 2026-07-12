// app/utils/fraudRights.ts
// Qué te debe el emisor cuando te estafan, según la ley uruguaya — y qué NO te debe.
//
// PURO (sin Vue/Nuxt) para que la página y los tests compartan una sola fuente de verdad.
//
// POR QUÉ EXISTE: en Reddit la respuesta a "me clonaron la tarjeta, ¿me devuelven?" es
// folklore contradictorio — un ex-empleado de banco asegurando que el reintegro en débito es
// "por no decir imposible", al lado de un usuario al que Santander le devolvió todo. Nadie
// sabe el plazo real, el canal real, ni quién carga con la pérdida.
//
// TODO LO DE ACÁ ESTÁ VERIFICADO CONTRA FUENTE PRIMARIA (IMPO, BCU) el 2026-07-11, y pasó por
// tres verificadores adversariales. Donde la ley calla o está discutida, lo decimos: `certainty`
// existe justamente para no vender certezas que no tenemos. Es información, no asesoramiento.
//
// LAS TRES COSAS QUE MÁS SORPRENDEN, Y QUE SON LAS QUE MÁS IMPORTAN:
//   1. La CARGA DE LA PRUEBA es del emisor. Si no puede demostrar que la operación fue
//      "correctamente autenticada" y hecha por vos, responde él (RNRCSF art. 364 lit. h).
//   2. Si la operación superó tu LÍMITE autorizado, responde el emisor AUNQUE HAYAS AVISADO
//      TARDE (Ley 19.731 art. 16 lit. B).
//   3. Pero si la transferencia la ordenaste vos, engañado (estafa de marketplace), NO tenés
//      derecho a que el banco te la devuelva. El BCU dice expresamente que no puede exigirla.

/** Cuán firme es la respuesta. Publicamos la incertidumbre, no la escondemos. */
export type Certainty = 'claro' | 'contestado' | 'silencio de la ley'

/** Quién termina pagando, en una palabra (para el color del chip). */
export type WhoPays = 'emisor' | 'usuario' | 'depende' | 'nadie te lo devuelve'

export interface FraudScenario {
  id: string
  /** Lo que le pasó, en las palabras en que la gente lo cuenta. */
  label: string
  /** Un renglón para la tarjeta. */
  short: string
  icon: string
  whoPays: WhoPays
  certainty: Certainty
  /** La respuesta, sin vueltas. */
  answer: string
  /** Los artículos que la sostienen. Si no hay artículo, no se publica. */
  articles: string[]
  /** Plazos concretos que corren desde que te pasó. */
  deadlines: string[]
  /** Lo que el emisor puede usar EN TU CONTRA. Se dice, aunque no guste. */
  againstYou?: string
  /** Qué juntar antes de reclamar. */
  evidence: string[]
}

/**
 * La matriz. El orden es el de utilidad: primero lo más frecuente en el corpus.
 * `certainty: 'contestado'` no es un adorno — es el estado real de la discusión y el lector
 * merece saberlo antes de pelearse con su banco.
 */
export const FRAUD_SCENARIOS: readonly FraudScenario[] = Object.freeze([
  {
    id: 'clonada',
    label: 'Me clonaron la tarjeta (débito o crédito) y me hicieron compras',
    short: 'Compras que no hiciste, con tu tarjeta o con sus datos.',
    icon: 'mdi-credit-card-off-outline',
    whoPays: 'emisor',
    certainty: 'claro',
    answer:
      'La regla no distingue entre débito y crédito: la ley pone a los dos (y al dinero electrónico) en pie de igualdad. Todo pivota sobre UN instante: el momento en que avisás. Lo que pasó DESPUÉS de tu aviso lo paga el emisor, salvo que PRUEBE que las operaciones las hiciste vos o alguien autorizado por vos. Y lo que superó tu LÍMITE autorizado lo paga el emisor aunque hayas avisado tarde. Lo anterior al aviso y dentro del límite, en principio corre por tu cuenta — pero con dos escapes grandes: si hubo una falla de seguridad del sistema, o si el emisor no logra probar que la operación fue correctamente autenticada, responde él.',
    articles: [
      'Ley 19.731, art. 16 lits. A, B y C',
      'Ley 19.731, art. 15 lit. F (carga de la prueba)',
      'RNRCSF (BCU), art. 364 lit. h — si el emisor no demuestra la correcta autenticación, es responsable',
      'RNRCSF, art. 327 — el emisor tiene 15 días corridos para responderte',
    ],
    deadlines: [
      'Avisá "inmediatamente al detectarlo", por un medio que deje constancia (Ley 19.731, art. 17 lit. B).',
      'El emisor debe responder tu reclamo en 15 días corridos, prorrogables por única vez por otros 15.',
      'Ojo: NO existe un plazo legal para que te reintegren la plata. Sólo para que te contesten.',
    ],
    againstYou:
      'El emisor va a intentar probar que la operación la hiciste vos o alguien con tu consentimiento. Por eso la constancia del aviso, con fecha y hora, es la pieza más importante del expediente.',
    evidence: [
      'Constancia del aviso al emisor (con fecha y hora).',
      'Denuncia penal.',
      'Estado de cuenta con las operaciones desconocidas marcadas.',
      'Si la tarjeta física la tenías vos: decilo por escrito, es un hecho a tu favor.',
    ],
  },
  {
    id: 'transferencia-no-autorizada',
    label: 'Me vaciaron la cuenta: transferencias que yo no ordené',
    short: 'Entraron a tu homebanking y transfirieron. Vos no hiciste nada.',
    icon: 'mdi-bank-transfer-out',
    whoPays: 'emisor',
    certainty: 'claro',
    answer:
      'Acá tenés la palanca más fuerte del ordenamiento uruguayo, y casi nadie la usa: HOY el BCU ya exige, como mínimo, DOBLE FACTOR DE AUTENTICACIÓN para las transferencias o pagos a terceros hechos de forma no presencial. Si te vaciaron la cuenta con una transferencia a un tercero SIN doble factor, el banco incumplió una norma expresa del BCU: eso es una falla en la seguridad del sistema, y entonces responde el emisor. Lo mismo si el estafador te cambió el teléfono o el mail y el banco no te avisó del intento. Y en cualquier caso, el emisor tiene que demostrar que la operación fue correctamente autenticada y mostrarte los registros. Si no puede, paga él.',
    articles: [
      'RNRCSF (BCU), art. 364 lit. i — doble factor obligatorio para transferencias a terceros no presenciales',
      'RNRCSF, art. 364 lit. m — deben avisarte de todo intento de cambio de tus datos',
      'Ley 19.731, art. 16 lit. C — falla del sistema o de su seguridad: responde el emisor',
      'Ley 20.327, art. 11 — inmovilización de los fondos en la cuenta de destino',
    ],
    deadlines: [
      'EL MISMO DÍA: avisá al emisor, pedí por escrito la INMOVILIZACIÓN de los fondos en la cuenta de destino, y hacé la denuncia penal.',
      '48 HORAS: llevale al banco la constancia de la denuncia. Si no, la inmovilización se cae y los fondos se liberan.',
      '30 DÍAS: tiene que llegar una orden judicial que confirme la inmovilización, o también se cae.',
    ],
    againstYou:
      'Si el estafador entró con credenciales que le diste vos (aunque haya sido engañándote), la discusión se muda al escenario de phishing — que está discutido.',
    evidence: [
      'Pedido de inmovilización por escrito, con fecha y hora.',
      'Denuncia penal (llevala al banco dentro de las 48 h).',
      'Detalle de las transferencias: cuenta destino, importe, hora.',
      'Pedí por escrito los registros de autenticación de esas operaciones.',
    ],
  },
  {
    id: 'phishing',
    label: 'Caí en un phishing: les di yo la clave o el código',
    short: 'Te llamaron o te escribieron haciéndose pasar por el banco, y les diste los datos.',
    icon: 'mdi-fish',
    whoPays: 'depende',
    certainty: 'contestado',
    answer:
      'Es el punto más disputado del tema, y te lo decimos así: ni la ley ni la jurisprudencia uruguaya publicada lo resuelven. A tu favor: la ley sólo libera al emisor si prueba que las operaciones las hizo el usuario "o terceros AUTORIZADOS por este" — y un estafador no es un tercero autorizado; además el emisor igual tiene que demostrar que la operación fue correctamente autenticada. En tu contra: la misma norma exime al emisor si el daño es atribuible a que vos incumpliste tus obligaciones, y entre esas obligaciones está expresamente no divulgar tu clave y no responder a comunicaciones por canales no acordados. O sea: el gancho para culparte existe y es expreso; el gancho para salvarte, también. Lo único indiscutible es quién tiene que probar: el emisor. No creas ni al que te dice "no hay nada que hacer" ni al que te promete que siempre te devuelven.',
    articles: [
      'Ley 19.731, art. 16 lits. A y B — el emisor se libera sólo si prueba que fuiste vos o un tercero autorizado',
      'RNRCSF (BCU), art. 364 lit. h — pero el emisor debe probar la correcta autenticación',
      'RNRCSF, art. 366 lits. d, g y j — tus obligaciones: no divulgar el PIN, no responder por canales no acordados',
      'Código Penal, art. 347-BIS (fraude informático)',
    ],
    deadlines: [
      'Avisá inmediatamente y pedí el bloqueo.',
      'Si derivó en una transferencia: 48 horas para llevarle al banco la constancia de la denuncia penal.',
      'El emisor tiene 15 días corridos para responder tu reclamo.',
    ],
    againstYou:
      'Que hayas entregado la clave es, textualmente, un incumplimiento de tus obligaciones como usuario. Es el argumento que va a usar el emisor. No significa que pierdas automáticamente — significa que la pelea es cuesta arriba y conviene documentar el engaño (el SMS, el número, la web falsa).',
    evidence: [
      'El mensaje, el mail o el número desde el que te contactaron (no lo borres).',
      'La captura de la web falsa, si la tenés.',
      'Denuncia penal.',
      'Constancia del aviso al emisor.',
    ],
  },
  {
    id: 'transferi-a-un-estafador',
    label: 'Le transferí a un vendedor y desapareció',
    short: 'Compraste por Marketplace/Facebook, transferiste, y nunca te llegó nada.',
    icon: 'mdi-account-cancel-outline',
    whoPays: 'nadie te lo devuelve',
    certainty: 'silencio de la ley',
    answer:
      'Esto hay que decirlo sin rodeos, porque es lo contrario de lo que la gente espera: NO tenés derecho a que el banco te devuelva esa plata. El propio BCU dice que no tiene competencia para exigir la devolución de transferencias, y que una transferencia a un beneficiario equivocado ni siquiera se considera denuncia: para pedir que te la devuelvan hay que ir a la Justicia. La única herramienta real e inmediata es pedirle al banco que INMOVILICE los fondos en la cuenta de destino — y ojo, la ley dice que el banco "está facultado", no obligado. Pedila igual, por escrito y ya. Cada hora cuenta: si el estafador saca la plata antes, no queda nada que congelar.',
    articles: [
      'Ley 20.327, art. 11 — el banco ESTÁ FACULTADO a inmovilizar (no obligado)',
      'Código Penal, art. 347-BIS (fraude informático) — la vía penal',
      'BCU — Portal del Usuario Financiero: no tiene competencia para exigir devoluciones',
    ],
    deadlines: [
      'EL MISMO DÍA, y cuanto antes mejor: pedile al banco por escrito que inmovilice los fondos + hacé la denuncia penal.',
      '48 HORAS: constancia de la denuncia al banco, o la inmovilización se cae.',
      '30 DÍAS: orden judicial confirmatoria, o se cae.',
    ],
    againstYou:
      'La transferencia la ordenaste vos. Engañado, pero la ordenaste — y la norma de inmovilización habla de operaciones "desconocidas y no autorizadas". Que tu caso entre ahí es una interpretación abierta que el texto no zanja.',
    evidence: [
      'Comprobante de la transferencia (cuenta destino, importe, hora).',
      'La conversación con el estafador y la publicación.',
      'Denuncia penal.',
    ],
  },
  {
    id: 'debito-automatico',
    label: 'Un débito automático que no autoricé',
    short: 'Una suscripción o un débito que aparece en tu cuenta o tarjeta y vos no aceptaste.',
    icon: 'mdi-calendar-refresh-outline',
    whoPays: 'emisor',
    certainty: 'claro',
    answer:
      'Es el ÚNICO escenario con un plazo de devolución de verdad, y juega a tu favor por el mero silencio: si desconocés la operación, el proveedor tiene 5 DÍAS HÁBILES para demostrar que la autorizaste. Si no lo hace en ese plazo, el reclamo se considera CONFIRMADO — y una vez confirmado debe devolverte el importe ÍNTEGRO en no más de 1 DÍA HÁBIL, más los costos financieros. Desde el 1.º de enero de 2026 esto alcanza también a los débitos automáticos cargados a tu tarjeta. Ojo: no cubre la compra fraudulenta suelta ni el retiro en cajero — para eso mirá los otros casos.',
    articles: [
      'Ley 19.210, art. 72 — 5 días hábiles del proveedor para probar; vencidos, el reclamo se considera confirmado',
      'Ley 19.210, art. 73 — devolución íntegra en 1 día hábil',
      'Ley 19.210, art. 68 lit. A (redacción de la Ley 20.446, vigente desde el 01/01/2026) — alcanza a las tarjetas',
    ],
    deadlines: [
      '5 DÍAS HÁBILES desde tu reclamo: el proveedor tiene que probar que lo autorizaste.',
      'Si no lo prueba, el reclamo queda CONFIRMADO y tiene 1 DÍA HÁBIL para devolverte todo.',
    ],
    evidence: [
      'El reclamo por escrito, con constancia de la fecha en que lo presentaste (el reloj arranca ahí).',
      'El resumen donde aparece el débito.',
    ],
  },
  {
    id: 'no-llego',
    label: 'Compré online y el producto nunca llegó',
    short: 'Pagaste con tarjeta y el vendedor no entregó.',
    icon: 'mdi-package-variant-remove',
    whoPays: 'depende',
    certainty: 'silencio de la ley',
    answer:
      'No es un problema de medios de pago sino de relación de consumo, y no encontramos ninguna norma uruguaya que obligue al emisor de la tarjeta a revertirte el cargo por falta de entrega. Así que no te vamos a prometer un chargeback que no existe. Lo que SÍ existe y es potente: en una venta a distancia tenés 5 DÍAS HÁBILES para rescindir el contrato sin ninguna responsabilidad — y el plazo lo contás desde que compraste O desde que te entregaron, a TU elección. Si le comunicás eso al emisor de la tarjeta, el emisor NO LIBERA los fondos; y si igual los libera después de tu comunicación, no te puede cobrar la operación. Es el chargeback con más base legal que hay en Uruguay. Fuera de ese plazo: reclamo al proveedor y después Defensa del Consumidor.',
    articles: [
      'Ley 17.250, art. 16 — rescisión "ipso jure" dentro de los 5 días hábiles en la venta a distancia',
      'Ley 19.731, art. 11 — comunicada la rescisión, el emisor no libera los fondos y no te puede cobrar la operación',
    ],
    deadlines: [
      '5 DÍAS HÁBILES desde la compra o desde la entrega, a tu opción, para rescindir.',
      'Comunicáselo al emisor de la tarjeta ANTES de que libere los fondos.',
      'Fuera de ese plazo: reclamo al proveedor y luego Defensa del Consumidor (el trámite dura unos 45 días corridos).',
    ],
    evidence: [
      'La comunicación de rescisión al vendedor Y al emisor, con fecha.',
      'El comprobante de compra y la fecha de entrega prometida.',
    ],
  },
])

/**
 * El emisor es una billetera (Prex, Mi Dinero…) y no un banco. Tenés MENOS herramientas, y
 * ocultarlo sería lo peor que podríamos hacer: el Título II de la Recopilación del BCU —el que
 * contiene la regla de oro "si el emisor no prueba la correcta autenticación, paga él", el
 * doble factor obligatorio y la regla del tramo previo al aviso— NO se les aplica.
 */
export const EMONEY_GAP = Object.freeze({
  applies: [
    'La Ley 19.731 completa: su art. 1 incluye expresamente al instrumento de dinero electrónico, así que la responsabilidad del emisor (art. 16) y la carga de la prueba (art. 15 lit. F) te alcanzan.',
    'El reclamo con respuesta en 15 días corridos, prorrogables por única vez, y que debe poder presentarse por cualquier canal digital, incluso sin autenticarte (RNSP, Libro VII, art. 108.2).',
    'El contrato debe decir que no sos responsable por fallas de seguridad del sistema que no te sean atribuibles (RNSP, art. 107).',
    'El reloj de 48 h / 30 días para inmovilizar fondos: la Ley 20.327 nombra expresamente a las emisoras de dinero electrónico.',
  ],
  doesNotApply: [
    'La regla "si el emisor no puede probar la correcta autenticación, responde él" (RNRCSF art. 364 lit. h).',
    'El doble factor obligatorio para transferencias a terceros (art. 364 lit. i).',
    'La regla del tramo anterior a tu aviso (art. 367): no les aplica, y la ley calla. Ese tramo queda sin regla.',
  ],
})

/** Los pasos, en el orden en que hay que darlos. El orden importa: los plazos son fatales. */
export interface EscalationStep {
  when: string
  title: string
  detail: string
  source?: string
}

export const ESCALATION: readonly EscalationStep[] = Object.freeze([
  {
    when: 'El mismo día',
    title: 'Avisá al emisor, pedí la inmovilización y denunciá',
    detail:
      'Los tres, no elijas uno. Avisá por un medio que deje constancia y pedí el bloqueo. Si hubo transferencia, pedí POR ESCRITO que inmovilicen los fondos en la cuenta de destino. Y hacé la denuncia penal (la de estafa/fraude informático no se puede hacer online: es presencial).',
    source: 'Ley 19.731 art. 17 lit. B; Ley 20.327 art. 11',
  },
  {
    when: 'Dentro de 48 horas',
    title: 'Llevale al banco la constancia de la denuncia',
    detail:
      'Si la institución no la recibe dentro de las 48 horas de hecha la inmovilización, la inmovilización SE CAE y los fondos quedan libres. Es el plazo que más plata hace perder.',
    source: 'Ley 20.327 art. 11 lit. A',
  },
  {
    when: 'Dentro de 30 días',
    title: 'Orden judicial que confirme la inmovilización',
    detail: 'La tramita la Fiscalía. Si no llega, la inmovilización también se cae.',
    source: 'Ley 20.327 art. 11 lit. B',
  },
  {
    when: 'En paralelo',
    title: 'Reclamo formal ante la institución',
    detail:
      'Exigí constancia de recepción con fecha, hora, número y plazo de respuesta. Tienen 15 días corridos para responderte, prorrogables por única vez por otros 15.',
    source: 'RNRCSF art. 327',
  },
  {
    when: 'Si te rechazan',
    title: 'Defensa del Consumidor (MEF) — NO el BCU',
    detail:
      'Para fraude con tarjeta, desconocimiento de operaciones o cajeros, el organismo es la Unidad de Defensa del Consumidor del MEF. El trámite dura unos 45 días corridos; a los 15 días hábiles de que envían tu reclamo al proveedor podés llamar al 0800 7005.',
    source: 'gub.uy — trámite de Defensa del Consumidor',
  },
  {
    when: 'También',
    title: 'Denuncia ante el BCU: sirve, pero no para que te devuelvan',
    detail:
      'La denuncia al BCU sirve para que SUPERVISE y eventualmente SANCIONE a la institución. El propio BCU aclara que no tiene competencia para instruir la devolución de importes. Hacela igual: deja rastro.',
    source: 'BCU — Portal del Usuario Financiero',
  },
  {
    when: 'La única que ordena devolver',
    title: 'La Justicia',
    detail:
      'Es la única vía que puede ordenar que te devuelvan la plata: "competencia exclusiva de los órganos jurisdiccionales", en palabras del propio BCU. Dos carriles no excluyentes: el penal que ya abriste, y el civil contra el emisor.',
  },
])

/** Regla transversal, y la más importante de todas. */
export const GOLDEN_RULE =
  'Documentá TODO con fecha y hora. Toda la arquitectura de responsabilidad pivota sobre UN instante: el momento en que avisaste. Sin constancia de ese aviso, la discusión la perdés antes de empezar.'

/** Buscar un escenario por id. */
export function scenarioById(id: string): FraudScenario | undefined {
  return FRAUD_SCENARIOS.find(s => s.id === id)
}

/** Color del chip según quién paga — verde no significa "ganaste", significa "la ley te ampara". */
export function toneFor(who: WhoPays): 'success' | 'warning' | 'error' | 'info' {
  if (who === 'emisor') return 'success'
  if (who === 'depende') return 'warning'
  if (who === 'nadie te lo devuelve') return 'error'
  return 'info'
}
