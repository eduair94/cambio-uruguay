// app/utils/consumerDefense.ts
// Datos de /defensa-al-consumidor-uruguay: qué puede hacer por vos el Área de Defensa del
// Consumidor, qué NO puede, y las reglas de la compra presencial.
//
// POR QUÉ EXISTE Y EN QUÉ SE DIFERENCIA DE LO QUE YA HAY:
// el sitio ya tiene /derechos-consumidor-compras-online, que cubre la Ley 17.250 aplicada a la
// COMPRA A DISTANCIA (retracto del art. 16, vicios, remedios del art. 33). Esta página cubre lo
// que aquella deja afuera y que en los hilos aparece más seguido:
//   1. La compra PRESENCIAL, donde no hay derecho de retracto y casi todo el mundo cree que sí.
//   2. El organismo en sí: qué facultades tiene, cuáles no, y las dos palancas que casi nadie usa.
//
// LA TESIS, y es la parte incómoda: Defensa del Consumidor no te devuelve la plata. La ley le da
// dos herramientas —convocar a una audiencia para «tentar el acuerdo» (art. 42 lit. F) y sancionar
// al proveedor (art. 47)— y ninguna de las dos es una orden de restitución a tu favor. La multa es
// una sanción del Estado al proveedor, no una indemnización para vos. Saber esto cambia cómo se
// usa la herramienta: el reclamo sirve para forzar la conversación y dejar rastro, no para cobrar.
//
// LAS DOS PALANCAS QUE NADIE USA (ninguna estaba en el sitio antes de esta página):
//   - Art. 37: reclamar por escrito al proveedor INTERRUMPE el plazo de caducidad, y sigue
//     interrumpido hasta que el proveedor niegue el reclamo expresamente. El silencio del comercio
//     deja de correr en tu contra.
//   - Art. 42 lit. F: si el proveedor no comparece a la audiencia, esa inasistencia se tiene como
//     presunción simple EN SU CONTRA. Y el organismo puede publicar los casos de inasistencia
//     injustificada a dos o más audiencias en un plazo de dos años.
//
// FUENTES, verificadas el 2026-08-10:
//   - IMPO — texto de la Ley 17.250 https://www.impo.com.uy/bases/leyes/17250-2000
//   - IMPO — Defensa del Consumidor https://www.impo.com.uy/derechosconsumidor/
//   - MEF — ¿Estoy obligado a aceptar la devolución de un producto que vendí en mi tienda física?
//   - MEF — Evitemos conflictos con las políticas de cambio y devolución
//   - gub.uy — trámite «Consulta, reclamo y/o denuncia en materia de defensa del consumidor»
//
// Es información de referencia, no asesoramiento legal.

/** Fecha en que artículos, plazos y criterios se contrastaron con las fuentes. */
export const DEFENSE_VERIFIED_AT = '2026-08-10'

export interface DefenseSource {
  label: string
  url: string
}

export const DEFENSE_SOURCES: readonly DefenseSource[] = Object.freeze([
  {
    label: 'IMPO — Ley 17.250 de Relaciones de Consumo (texto completo)',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
  },
  {
    label: 'IMPO — Defensa del Consumidor',
    url: 'https://www.impo.com.uy/derechosconsumidor/',
  },
  {
    label:
      'MEF — ¿Estoy obligado a aceptar la devolución de un producto que vendí en mi tienda física?',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/estoy-obligado-aceptar-devolucion-producto-vendi-mi-tienda-fisica',
  },
  {
    label: 'MEF — Evitemos conflictos con las políticas de cambio y devolución',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/evitemos-conflictos-politicas-cambio-devolucion',
  },
  {
    label: 'gub.uy — Consulta, reclamo y/o denuncia en materia de defensa del consumidor',
    url: 'https://www.gub.uy/tramites/consulta-yo-reclamo-materia-defensa-consumidor',
  },
  {
    label: 'MEF — Defensa del Consumidor',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/defensa-del-consumidor',
  },
])

/** La tesis de la página, escrita para poder citarla entera. */
export const DEFENSE_THESIS =
  'Defensa del Consumidor no te devuelve la plata. La ley le da dos herramientas: convocar al proveedor a una audiencia cuya finalidad es tentar el acuerdo entre las partes, y sancionarlo si infringió la ley. Ninguna de las dos es una orden de restitución a tu favor, y la multa es una sanción que cobra el Estado, no una indemnización para vos. Eso no lo vuelve inútil: lo vuelve otra cosa. Sirve para forzar la conversación, dejar rastro y construir prueba. Si el proveedor no acuerda y vos querés tu dinero, la restitución la ordena un juez.'

// ---------------------------------------------------------------------------
// Qué puede y qué no puede el Área
// ---------------------------------------------------------------------------

export interface DefensePower {
  /** `true` si es una facultad del organismo; `false` si es un límite. */
  can: boolean
  title: string
  detail: string
  /** El artículo o la fuente que lo sostiene. */
  source: string
}

export const DEFENSE_POWERS: readonly DefensePower[] = Object.freeze([
  {
    can: true,
    title: 'Citar al proveedor a una audiencia',
    detail:
      'A pedido del consumidor afectado, puede citar al proveedor a una audiencia administrativa cuya finalidad es tentar el acuerdo entre las partes. Es gratis y no necesitás abogado.',
    source: 'Ley 17.250 art. 42 lit. F',
  },
  {
    can: true,
    title: 'Tomar la inasistencia como presunción en contra',
    detail:
      'Si el proveedor citado no comparece, esa inasistencia se tiene como presunción simple en su contra. No es una sanción, pero es un hecho que queda registrado y sirve después.',
    source: 'Ley 17.250 art. 42 lit. F',
  },
  {
    can: true,
    title: 'Publicar a quien falta sistemáticamente',
    detail:
      'Puede dar publicidad a los casos de inasistencia injustificada a dos o más audiencias administrativas dentro de un plazo de dos años.',
    source: 'Ley 17.250 art. 42 lit. F',
  },
  {
    can: true,
    title: 'Sancionar al proveedor que infringió la ley',
    detail:
      'Las sanciones van de apercibimiento a multa de 20 a 4.000 UR, decomiso, clausura del establecimiento por hasta 90 días y suspensión en los registros de proveedores del Estado.',
    source: 'Ley 17.250 art. 47',
  },
  {
    can: true,
    title: 'Controlar, inspeccionar y exigir información',
    detail:
      'Controla la aplicación de la ley, puede exigir acceso, realizar inspecciones y pedir a los proveedores la información que necesite.',
    source: 'Ley 17.250 art. 42',
  },
  {
    can: false,
    title: 'No te puede ordenar la devolución del dinero',
    detail:
      'La audiencia busca un acuerdo, no dicta una condena. Si el proveedor no acuerda, la restitución de lo pagado —que es un derecho tuyo por el art. 33— la tiene que ordenar un juez, no el organismo.',
    source: 'Ley 17.250 arts. 33 y 42 lit. F',
  },
  {
    can: false,
    title: 'La multa no es plata para vos',
    detail:
      'La sanción es del Estado al proveedor por infringir la ley. Que lo multen no repara tu perjuicio ni sustituye a tu reclamo: son dos cosas distintas que corren en paralelo.',
    source: 'Ley 17.250 Cap. XVI (arts. 46-52)',
  },
  {
    can: false,
    title: 'No es tu abogado ni te representa en juicio',
    detail:
      'Te informa y asesora, y media entre las partes. Si el caso termina en la Justicia, el juicio lo llevás vos con tu propio patrocinio.',
    source: 'Ley 17.250 art. 42',
  },
])

// ---------------------------------------------------------------------------
// Compra presencial: donde casi todo el mundo se equivoca
// ---------------------------------------------------------------------------

/** El malentendido más común del país en materia de consumo. */
export const IN_STORE_RETRACT_RULE =
  'El derecho de arrepentimiento de cinco días es de la compra a distancia, no de la tienda física. La razón está en el propio criterio del MEF: en la tienda física el consumidor pudo ver el producto, por lo tanto no aplica el derecho de retracto. Si comprás en el local y después no te gusta, no te queda el talle o cambiaste de idea, la ley no obliga al comercio a aceptarte el cambio.'

/** Y el matiz que da vuelta el caso a tu favor. */
export const IN_STORE_POLICY_RULE =
  'Lo que sí obliga es la política que el propio comercio anunció. El comerciante fija libremente si acepta cambios, con qué plazos y con qué requisitos, pero esa política debe estar informada de forma que el consumidor la conozca antes de la transacción. Y toda información difundida obliga a quien ordenó difundirla (art. 14): si el cartel, el ticket o la web dicen «cambios dentro de los 30 días», eso es exigible.'

export interface StoreRule {
  title: string
  detail: string
  icon: string
  /** De dónde sale, para el chip. */
  source: string
}

export const STORE_RULES: readonly StoreRule[] = Object.freeze([
  {
    title: 'El vale de cambio no puede tener vencimiento',
    detail:
      'Si en lugar de devolverte el dinero el comercio te da un vale, ese vale no puede caducar. Es el criterio expreso del MEF sobre políticas de cambio.',
    icon: 'mdi-ticket-confirmation-outline',
    source: 'MEF — políticas de cambio y devolución',
  },
  {
    title: 'Al cambiar, vale el precio de lista',
    detail:
      'El MEF señala como práctica abusiva permitir el cambio por talle o color sin mirar el descuento, pero tomar el precio rebajado cuando querés cambiar por otro producto. En el cambio corresponde el precio de lista, sin descuentos, en los dos casos.',
    icon: 'mdi-tag-multiple-outline',
    source: 'MEF — políticas de cambio y devolución',
  },
  {
    title: 'Al devolver, vuelve lo que pagaste',
    detail:
      'La devolución es otra cosa que el cambio: se reembolsa el monto efectivamente pagado, no el de lista.',
    icon: 'mdi-cash-refund',
    source: 'MEF — políticas de cambio y devolución',
  },
  {
    title: 'La política anunciada obliga al comercio',
    detail:
      'Toda información difundida por cualquier medio obliga al oferente que ordenó su difusión. El cartel de la puerta y la letra del ticket son exigibles aunque hoy el mostrador diga otra cosa.',
    icon: 'mdi-sign-text',
    source: 'Ley 17.250 art. 14',
  },
])

/** Lo que sí te ampara siempre, incluso comprando en el local. */
export const IN_STORE_ALWAYS =
  'Nada de esto toca el caso del producto fallado. Si salió con un defecto, no estás pidiendo un favor ni dependés de la política de cambios: podés exigir el cumplimiento, aceptar un sustituto o resolver el contrato y recuperar lo pagado, a tu libre elección y con derecho a daños y perjuicios (art. 33). El comercio no puede reemplazar ese derecho por un vale.'

// ---------------------------------------------------------------------------
// Las dos palancas
// ---------------------------------------------------------------------------

export interface DefenseLever {
  title: string
  detail: string
  source: string
}

export const DEFENSE_LEVERS: readonly DefenseLever[] = Object.freeze([
  {
    title: 'Reclamar por escrito congela el reloj',
    detail:
      'Los plazos para reclamar por vicios son cortos y la gente los pierde esperando respuesta. Pero el plazo se interrumpe si el consumidor efectúa una reclamación debidamente comprobada ante el proveedor, y sigue interrumpido hasta que el proveedor la niegue expresamente. Por eso conviene reclamar por un medio que deje constancia y desde el primer día: mientras el comercio te da vueltas sin negarte nada, el plazo no corre en tu contra.',
    source: 'Ley 17.250 art. 37',
  },
  {
    title: 'Que no venga a la audiencia juega en su contra',
    detail:
      'Mucha gente abandona cuando el proveedor ignora la citación, justo cuando conviene seguir. La no comparecencia del citado se tiene como presunción simple en su contra, y el organismo puede publicar los casos de inasistencia injustificada a dos o más audiencias en dos años. El acta de esa audiencia a la que no vino es prueba para lo que siga.',
    source: 'Ley 17.250 art. 42 lit. F',
  },
])

// ---------------------------------------------------------------------------
// Cómo se hace el reclamo
// ---------------------------------------------------------------------------

/** Los datos del trámite, tal como los publica gub.uy. */
export const DEFENSE_TRAMITE = Object.freeze({
  name: 'Consulta, reclamo y/o denuncia en materia de defensa del consumidor',
  url: 'https://www.gub.uy/tramites/consulta-yo-reclamo-materia-defensa-consumidor',
  cost: 'No tiene costo',
  channel: 'En línea',
  /** Identificación aceptada para iniciarlo. */
  identities: Object.freeze([
    'Usuario gub.uy con nivel de seguridad intermedio verificado',
    'Cédula de identidad digital (requiere lector)',
    'Identidad Digital de Abitab',
    'TuID de Antel',
  ]),
  /** Plazo estimado que publica el propio trámite. */
  estimatedDays: 45,
  /** Días hábiles después de los cuales podés consultar el estado. */
  followUpBusinessDays: 15,
  phone: '0800 7005',
})

export interface DefenseStep {
  n: number
  title: string
  detail: string
}

export const DEFENSE_STEPS: readonly DefenseStep[] = Object.freeze([
  {
    n: 1,
    title: 'Reclamá al comercio por escrito',
    detail:
      'Antes que nada, y por un medio que deje constancia. No es un trámite previo obligatorio: es lo que interrumpe el plazo del art. 37 y lo que después demuestra que le diste la chance de solucionarlo.',
  },
  {
    n: 2,
    title: 'Juntá la prueba mientras el caso está fresco',
    detail:
      'Ticket o factura, el anuncio o el cartel con la política de cambios, la conversación con el comercio, fotos del producto. La prueba se junta ahora, no cuando te la piden.',
  },
  {
    n: 3,
    title: 'Presentá el reclamo en gub.uy',
    detail:
      'El trámite es en línea y no tiene costo. Necesitás Usuario gub.uy de nivel intermedio verificado, cédula digital, Identidad Digital de Abitab o TuID de Antel.',
  },
  {
    n: 4,
    title: 'Pedí la audiencia si no hay respuesta',
    detail:
      'Es la instancia donde el proveedor tiene que dar la cara. Si no viene, esa inasistencia se tiene como presunción simple en su contra. Que no comparezca no es el final del camino: es una carta más para vos.',
  },
  {
    n: 5,
    title: 'Seguí el estado, y decidí si vas a la Justicia',
    detail:
      'A los 15 días hábiles podés llamar al 0800 7005 para saber cómo va. Si hubo acuerdo, se cumple. Si no, y lo que querés es tu dinero, ese es el punto en que el caso pasa a la vía judicial: la restitución la ordena un juez.',
  },
])

// ---------------------------------------------------------------------------
// Cláusulas abusivas
// ---------------------------------------------------------------------------

/** El principio, para que se entienda por qué la letra chica no siempre vale. */
export const ABUSIVE_CLAUSE_RULE =
  'Es abusiva toda cláusula que determine claros e injustificados desequilibrios entre los derechos y las obligaciones de las partes en perjuicio del consumidor (art. 30). Incluirlas te da derecho a exigir su nulidad, y en ese caso el juez integra el contrato. No hace falta que las hayas leído ni que no las hayas firmado: se tienen por no puestas.'

/** Ejemplos que la ley enumera y que aparecen a diario en contratos de consumo. */
export const ABUSIVE_CLAUSE_EXAMPLES: readonly string[] = Object.freeze([
  'Exonerar o limitar la responsabilidad del proveedor por vicios de cualquier naturaleza.',
  'Hacerte renunciar a derechos que la ley te da.',
  'Autorizar al proveedor a modificar los términos del contrato por su cuenta.',
  'Reservar la resolución del contrato exclusivamente a favor del proveedor.',
  'Ponerte a vos la carga de la prueba cuando por ley no te corresponde.',
  'Tomar tu silencio como aceptación de cualquier modificación.',
  'Fijarte una fecha límite anticipada para avisar que no querés la renovación automática.',
])

export interface DefenseFaq {
  question: string
  short: string
  answer: string
}

export const DEFENSE_FAQ: readonly DefenseFaq[] = Object.freeze([
  {
    question: '¿Defensa del Consumidor me hace devolver la plata?',
    short: 'No. Concilia y sanciona; la restitución la ordena un juez.',
    answer:
      'La ley le da dos herramientas: citar al proveedor a una audiencia cuya finalidad es tentar el acuerdo entre las partes (art. 42 lit. F) y aplicar sanciones si infringió la ley (art. 47). Ninguna de las dos es una orden de devolución a tu favor, y la multa la cobra el Estado, no vos. Si el proveedor acuerda, se cumple el acuerdo; si no acuerda y querés tu dinero, la restitución la ordena un juez. Que el reclamo no cobre no lo vuelve inútil: fuerza la conversación, deja rastro y construye la prueba con la que después se litiga.',
  },
  {
    question: 'Compré en el local y quiero devolverlo. ¿Estoy en mi derecho?',
    short: 'En general no: el arrepentimiento de 5 días es de la compra a distancia.',
    answer:
      'El derecho de retracto aplica a las ofertas hechas fuera del local —por medio postal, telefónico, informático o similar—, no a la compra presencial. El criterio del MEF es explícito: en la tienda física el consumidor pudo ver el producto, así que no aplica. Si no te gustó, no te quedó el talle o cambiaste de idea, el comercio no está obligado a aceptarte el cambio. Distinto es si el producto salió fallado: ahí no dependés de ninguna política de cambios.',
  },
  {
    question: 'El comercio anunció «cambios dentro de 30 días» y ahora no me lo acepta.',
    short:
      'La política que anunció lo obliga: toda información difundida obliga a quien la difunde.',
    answer:
      'El comerciante fija libremente su política de cambios, pero debe informarla de forma que el consumidor la conozca antes de la transacción, y una vez anunciada lo obliga: toda información difundida por cualquier medio obliga al oferente que ordenó su difusión (art. 14). Si el cartel, el ticket o la web decían treinta días, eso es exigible aunque hoy en el mostrador te digan otra cosa. Guardá la foto del cartel o la captura de la web: esa es tu prueba.',
  },
  {
    question: 'Me dieron un vale de cambio con fecha de vencimiento.',
    short: 'El vale de cambio no puede vencer.',
    answer:
      'Es el criterio expreso del MEF sobre políticas de cambio y devolución: si el comercio opta por dar un vale en lugar del dinero, ese vale no puede tener vencimiento. Si te lo pusieron, planteálo primero en el comercio por escrito y, si no lo corrigen, es exactamente el tipo de caso que va al reclamo.',
  },
  {
    question: 'Compré en oferta y al cambiarlo me quieren tomar el precio rebajado.',
    short: 'Para el cambio corresponde el precio de lista, no el rebajado.',
    answer:
      'El MEF señala como práctica abusiva que el comercio permita el cambio por talle o color sin mirar el descuento aplicado, pero tome el precio rebajado cuando lo que querés es cambiar por otro producto. En el cambio corresponde el precio de lista sin descuentos en los dos casos. La devolución es otra cosa: ahí se reembolsa el monto que efectivamente pagaste.',
  },
  {
    question: 'Reclamé y el comercio me da vueltas. ¿Se me vence el plazo?',
    short: 'No mientras no te nieguen el reclamo expresamente.',
    answer:
      'El plazo para reclamar por vicios se interrumpe cuando el consumidor efectúa una reclamación debidamente comprobada ante el proveedor, y sigue interrumpido hasta que el proveedor la niegue expresamente (art. 37). Por eso importa reclamar desde el primer día y por un medio que deje constancia: mientras el comercio te da largas sin negarte nada, el reloj no corre en tu contra. Lo que sí te perjudica es reclamar sólo de palabra y no poder probarlo.',
  },
  {
    question: 'Cité al proveedor a la audiencia y no vino. ¿Perdí?',
    short: 'Al contrario: su inasistencia se tiene como presunción simple en su contra.',
    answer:
      'Es el momento en que mucha gente abandona, y es justo cuando conviene seguir. La no comparecencia del citado a la audiencia administrativa se tiene como presunción simple en su contra, y el organismo puede dar publicidad a los casos de inasistencia injustificada a dos o más audiencias dentro de un plazo de dos años. El acta de la audiencia a la que no se presentó es prueba para lo que venga después.',
  },
  {
    question: 'El contrato que firmé dice que no puedo reclamar. ¿Vale?',
    short: 'No: las cláusulas abusivas son nulas y se tienen por no puestas.',
    answer:
      'Es abusiva toda cláusula que determine claros e injustificados desequilibrios en perjuicio del consumidor (art. 30), y la ley enumera casos concretos (art. 31): exonerar al proveedor por vicios, hacerte renunciar a derechos, dejarle modificar el contrato, ponerte la carga de la prueba, tomar tu silencio como aceptación. Su inclusión te da derecho a exigir la nulidad y en ese caso el juez integra el contrato. Que la hayas firmado no la salva: los derechos de la ley de consumo son de orden público.',
  },
  {
    question: '¿Cuánto sale y cuánto demora el reclamo?',
    short: 'No tiene costo, es en línea y el trámite estima 45 días.',
    answer:
      'El trámite «Consulta, reclamo y/o denuncia en materia de defensa del consumidor» se hace en línea en gub.uy y no tiene costo. Para iniciarlo necesitás Usuario gub.uy con nivel de seguridad intermedio verificado, cédula de identidad digital con lector, Identidad Digital de Abitab o TuID de Antel. El propio trámite estima 45 días, y a los 15 días hábiles podés llamar al 0800 7005 para saber en qué estado está tu gestión.',
  },
])
