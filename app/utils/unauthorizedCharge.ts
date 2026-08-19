// app/utils/unauthorizedCharge.ts
// Te están cobrando algo que no autorizaste: cómo frenarlo, a quién reclamar, y quién puede
// realmente hacer que te devuelvan la plata.
//
// POR QUÉ EXISTE: `complaintRouting.ts` ya resuelve BIEN la pregunta "¿a qué organismo voy?" — y
// dice lo que casi nadie sabe, que el BCU no puede ordenar una devolución. Lo que no existía en
// ninguna página es el escalón anterior y el posterior: qué hacer HOY para que el cobro pare, con
// qué norma se discute un cargo que nunca se pactó, y adónde se va cuando el organismo ya hizo lo
// único que podía hacer. Esta página es ese recorrido; el ruteo se delega en la otra.
//
// EL CASO QUE LA ORIGINA (r/monte_video, 19/08/2026): a alguien le siguen cobrando un seguro de
// viaje que el banco renovó sin su autorización, ya pagadas las 12 cuotas. En el hilo le contestan
// "denunciá en el BCU". Es media verdad, y la mitad que falta es la cara.
//
// LAS TRES COSAS QUE ORDENAN TODO EL CONTENIDO:
//   1. SUPERVISAR NO ES ORDENAR. El BCU supervisa y sanciona; Defensa del Consumidor concilia y
//      sanciona; la orden de devolver la da un juez — o la empresa, por acuerdo. Poner meses de
//      expectativa en la ventanilla equivocada es el error caro del rubro.
//   2. EL ENCUADRE DECIDE EL RESULTADO. Peleado como "me estafaron" se pierde, porque no hay fraude
//      y el art. 367 de la Recopilación te hace responsable hasta que avisás. Peleado como "este
//      cargo nunca se pactó" hay norma, plazo de reembolso y hasta intereses (arts. 359, 379, 361).
//   3. LO URGENTE NO ES EL RECLAMO, ES QUE PARE. Rescindir el contrato de fondo y cortar el
//      instrumento de pago son dos cosas distintas y hay que hacer las dos.
//
// PURO: sin Vue, sin fetch. La página sólo renderiza.
//
// REGLA DE LA CASA: cada afirmación declara su origen — `norma`, `operador` o `practica` — y nunca
// se mezclan. Lo que no está publicado se declara como hueco (ver `CHARGE_GAPS`) en vez de
// estimarse. Acá eso importa más que en otras páginas: la mitad de lo que circula sobre plazos de
// desconocimiento de cargos es contrato de un emisor presentado como si fuera ley.
//
// FUENTES PRIMARIAS verificadas el 2026-08-19:
//   - Ley 19.678 (Contrato de Seguro) arts. 6, 13, 14, 24, 94 y 104
//     https://www.impo.com.uy/bases/leyes/19678-2018
//   - Ley 17.250 (Relaciones de Consumo) arts. 22 lit. D, 31 lits. H e I, 42 y 47
//     https://www.impo.com.uy/bases/leyes/17250-2000
//   - Ley 20.212 art. 185 (da la redacción vigente del art. 31 lit. I desde el 1/1/2024)
//   - Ley 19.731 (Tarjetas) arts. 13, 14, 15 lit. F y 17 lit. B
//     https://www.impo.com.uy/bases/leyes/19731-2019
//   - Ley 19.210 arts. 68, 70, 72 y 73 (débito automático)
//     https://www.impo.com.uy/bases/leyes/19210-2014
//   - Ley 18.507 (procesos de consumo hasta 100 UR)
//     https://www.impo.com.uy/bases/leyes/18507-2009
//   - Ley 18.212 art. 11 (usura) y Ley 18.331 art. 22 (Central de Riesgos)
//   - RNRCSF (Recopilación de Regulación y Control del Sistema Financiero) arts. 327, 359, 361,
//     364 lit. h, 367, 378, 379 y 384.1
//   - RNSR (Recopilación de Seguros y Reaseguros) arts. 86.1, 86.6 y 86.8
//   - BCU — Reclamos y denuncias  https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/
//
// TRAMPAS verificadas (no las repitas):
//   - Defensa del Consumidor es del **MEF**, no del MEC. Es el error más repetido del tema.
//   - El plazo de respuesta al reclamo es de 15 días **CORRIDOS**, no hábiles.
//   - El art. 86.6 de la RNSR cierra diciendo que su procedimiento NO aplica a la gestión de
//     siniestros. El art. 327 bancario no trae esa exclusión.
//   - Los "90 días para desconocer" que publica un banco son SU contrato, no una ley. Ninguna norma
//     uruguaya fija un número: la Ley 19.731 art. 17 lit. B dice "inmediatamente al detectarlo".
//   - Una póliza de asistencia al viajero con tope de 45 días POR VIAJE puede ser perfectamente
//     anual: 12 cuotas no contradicen los 45 días. No repetir esa confusión, corregirla.
//   - El art. 13 NO habla de "devolución proporcional de la prima": fija el TOPE de lo que el
//     asegurador puede cobrar (el premio por el riesgo corrido). No le pongas a la ley una palabra
//     que no tiene, ni un plazo de reintegro que no fija.
//   - Y ese mismo art. 13 EXCEPTÚA los seguros para las personas, que van por el art. 104 (recién
//     después de la primera anualidad). Cuál rige en una asistencia al viajero depende de cómo esté
//     calificada la póliza, y una cobertura de 45 días no tiene primera anualidad: es un hueco.

/** De dónde sale lo que afirmamos. Misma taxonomía que `parcelDelivery.ts` y `shippingRoutes.ts`. */
export type SourceKind = 'norma' | 'operador' | 'practica'

export interface ChargeSource {
  label: string
  url: string
  kind: SourceKind
}

/** Fecha en que se contrastaron las cifras de este módulo contra la fuente primaria. */
export const UNAUTHORIZED_CHARGE_VERIFIED_AT = '2026-08-19'

// ─────────────────────────────────────────────────────────────────────────────
// Quién hace qué
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La tabla que evita meses perdidos.
 *
 * `ordersRefund` es la columna que nadie publica junta con las otras, y es la única que le importa
 * a quien quiere su plata de vuelta. Sale `false` en los tres primeros renglones a propósito.
 */
export interface Authority {
  id: string
  name: string
  fullName: string
  supervises: boolean
  sanctions: boolean
  /** ¿Puede ORDENAR que te devuelvan la plata? */
  ordersRefund: boolean
  /** Qué logra de verdad, en una línea. */
  achieves: string
  deadline: string
  url: string
  sources: ChargeSource[]
}

export const AUTHORITIES: Authority[] = [
  {
    id: 'empresa',
    name: 'La empresa',
    fullName: 'El banco y la aseguradora, cada uno por su cuenta',
    supervises: false,
    sanctions: false,
    ordersRefund: false,
    achieves:
      'Es la única ventanilla que puede devolverte sin pelear: si reconoce el error, la norma le fija 30 días para reembolsar, a tu elección en efectivo o en cuenta, y con intereses si el cobro indebido es imputable a la institución.',
    deadline: 'Respuesta en 15 días corridos, prorrogable por única vez otros 15 con aviso escrito',
    url: 'https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/',
    sources: [
      {
        label: 'RNRCSF art. 327 (banco) y art. 361 (reembolso con intereses)',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Normativa/RNRCSF.aspx',
        kind: 'norma',
      },
      {
        label: 'RNSR art. 86.6 (aseguradora)',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Normativa/RNSR.aspx',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'bcu',
    name: 'BCU',
    fullName: 'Banco Central del Uruguay — Superintendencia de Servicios Financieros',
    supervises: true,
    sanctions: true,
    ordersRefund: false,
    achieves:
      'Que se revise y eventualmente se sancione la conducta de la institución. Termina en una resolución escrita. La multa la cobra el Estado, no vos.',
    deadline: 'Se presenta recién pasados los 15 días corridos del reclamo a la empresa',
    url: 'https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/',
    sources: [
      {
        label: 'BCU — Reclamos y denuncias (lo que el BCU no puede hacer)',
        url: 'https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'dnc',
    name: 'Defensa del Consumidor',
    fullName: 'Área de Defensa del Consumidor — Ministerio de Economía y Finanzas',
    supervises: false,
    sanctions: true,
    ordersRefund: false,
    achieves:
      'Una audiencia de conciliación donde la empresa puede acordar devolverte. El propio organismo pone "cancelar un contrato" y "cancelar una deuda financiera" como ejemplos de lo que se resuelve por esta vía.',
    deadline: 'Sin plazo legal publicado',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/defensa-del-consumidor',
    sources: [
      {
        label: 'Ley 17.250 arts. 42 lit. F y 47 (incomparecencia y sanciones)',
        url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'juzgado',
    name: 'Juzgado de Paz',
    fullName: 'Proceso de consumo de la Ley 18.507, hasta 100 UR',
    supervises: false,
    sanctions: false,
    ordersRefund: true,
    achieves:
      'La orden de devolución. Es el único de la lista que puede darla. Sin abogado obligatorio, timbre del 1% de lo reclamado, y sin conciliación previa.',
    deadline: 'La acción CADUCA al año del hecho',
    url: 'https://www.impo.com.uy/bases/leyes/18507-2009',
    sources: [
      {
        label: 'Ley 18.507 arts. 1 a 5',
        url: 'https://www.impo.com.uy/bases/leyes/18507-2009',
        kind: 'norma',
      },
      {
        label: 'CGP art. 294 num. 6 (sin conciliación previa)',
        url: 'https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988',
        kind: 'norma',
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Frenar el cobro ya
// ─────────────────────────────────────────────────────────────────────────────

/** Una acción para que el cobro pare, ordenada por certeza jurídica. */
export interface StopAction {
  id: string
  title: string
  detail: string
  /** Qué tan seguro es que funcione, según lo que está escrito. */
  certainty: 'alta' | 'media' | 'baja'
  sources: ChargeSource[]
}

export const STOP_ACTIONS: StopAction[] = [
  {
    id: 'rescindir',
    title: 'Rescindí el contrato de fondo, por escrito y con constancia',
    detail:
      'Es lo único que corta el contrato; todo lo demás corta el instrumento de pago. La regla general es el art. 13 de la Ley 19.678: el tomador rescinde en cualquier tiempo, sin expresar causa, comunicándolo fehacientemente con un mes de antelación, y el asegurador sólo tiene derecho al premio por el riesgo corrido hasta ahí. Cuidado con el atajo: ese mismo artículo EXCEPTÚA los seguros para las personas, que van por el art. 104 y sólo se rescinden después de la primera anualidad, salvo pacto en contrario. Cuál de los dos rige depende de cómo esté calificada TU póliza, y una cobertura de 45 días ni siquiera tiene primera anualidad: no lo asumas, miralo en el papel.',
    certainty: 'alta',
    sources: [
      {
        label: 'Ley 19.678 arts. 13, 94 y 104',
        url: 'https://www.impo.com.uy/bases/leyes/19678-2018/13',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'riesgo-inexistente',
    title: 'Si el riesgo ya no existe, el contrato se rescinde por la propia ley',
    detail:
      'Es el argumento más fuerte cuando lo que te cobran es un seguro atado a algo que ya terminó, y casi nadie lo usa. Ley 19.678 art. 14: «El contrato de seguro será nulo si al tiempo de su celebración no existía el riesgo o había ocurrido el siniestro. Si el riesgo desaparece comenzada la cobertura, el contrato se rescinde a partir del momento en que esta circunstancia llegue a conocimiento del asegurador por cualquier medio y el asegurador podrá percibir el premio solo por el período transcurrido hasta ese momento.» Un seguro de viaje cubre un viaje: terminado el viaje, el riesgo desapareció. Avisale al asegurador por escrito — la norma dice «por cualquier medio», así que tu propio aviso hace correr el efecto.',
    certainty: 'alta',
    sources: [
      {
        label: 'Ley 19.678 art. 14',
        url: 'https://www.impo.com.uy/bases/leyes/19678-2018/14',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'debito-automatico',
    title: 'Si es débito automático, revocá la orden ante el BANCO',
    detail:
      'No ante la empresa: ante quien te debita. "El ordenante podrá revocar la orden de pago otorgada en cualquier momento, hasta el final del día hábil anterior al día convenido para el débito automático" (Ley 19.210 art. 70). Y si desconocés la autorización, el banco tiene 5 días hábiles para demostrar que la operación fue autorizada; pasado ese plazo se considera confirmado el desconocimiento y la devolución va en no más de 1 día hábil, con los costos financieros (arts. 72 y 73).',
    certainty: 'media',
    sources: [
      {
        label: 'Ley 19.210 arts. 70, 72 y 73',
        url: 'https://www.impo.com.uy/bases/leyes/19210-2014',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'baja-tarjeta',
    title: 'La palanca que sí está escrita para la tarjeta: darla de baja o sustituirla',
    detail:
      'El contrato tiene que prever que la tarjeta pierda validez antes de su vencimiento a solicitud del titular, y el emisor debe anularla del sistema (Ley 19.731 art. 14 lit. C). Además te deben devolver la parte proporcional del cargo anual cobrado por adelantado y no usado. Es incómodo, pero es lo que tiene respaldo normativo expreso.',
    certainty: 'alta',
    sources: [
      {
        label: 'Ley 19.731 art. 14 lits. C y D',
        url: 'https://www.impo.com.uy/bases/leyes/19731-2019',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'avisar-hoy',
    title: 'Avisá hoy, aunque después amplíes',
    detail:
      'No hay plazo legal en días para desconocer un consumo: la ley dice "inmediatamente al detectarlo" (Ley 19.731 art. 17 lit. B). Pero la fecha de tu aviso es la pieza más cara del expediente, porque la Recopilación te hace responsable de las operaciones no autorizadas hasta el momento de la notificación (RNRCSF art. 367). Un mail con fecha vale más que tres llamadas.',
    certainty: 'alta',
    sources: [
      {
        label: 'Ley 19.731 art. 17 lit. B',
        url: 'https://www.impo.com.uy/bases/leyes/19731-2019',
        kind: 'norma',
      },
    ],
  },
]

/**
 * Lo que buscamos y NO existe. Se publica como hueco porque la ausencia es accionable: cambia lo
 * que le pedís al banco.
 */
export const STOP_ACTIONS_GAP =
  'No encontramos ninguna norma uruguaya que obligue al emisor a bloquear hacia adelante un cobro recurrente iniciado por un comercio. Buscamos en la Ley 19.731, la Ley 19.210, la Recopilación de Regulación y Control y la de Sistema de Pagos: no hay un «stop payment» genérico. Si querés certeza de que el cobro pare, la vía escrita es rescindir el contrato Y dar de baja o sustituir la tarjeta — no pedirle al banco que «lo frene».'

// ─────────────────────────────────────────────────────────────────────────────
// La norma, citada
// ─────────────────────────────────────────────────────────────────────────────

/** Una cita textual, con su artículo y para qué te sirve. */
export interface NormQuote {
  id: string
  topic: string
  /** El texto entre comillas, sin parafrasear. */
  quote: string
  article: string
  /** Para qué la usás en tu reclamo. */
  useFor: string
  sources: ChargeSource[]
}

export const NORM_QUOTES: NormQuote[] = [
  {
    id: 'renovacion-pactada',
    topic: 'La renovación automática tiene que estar pactada',
    quote:
      'Las partes podrán convenir la renovación automática o la prórroga del seguro… salvo que se pretenda modificar las condiciones vigentes en cuyo caso deberá recabarse el consentimiento expreso del tomador. No mediando aceptación de las modificaciones, el contrato se dará por finalizado al vencimiento previsto.',
    article: 'Ley 19.678, art. 6',
    useFor:
      'La pregunta correcta no es «¿pueden renovar?» sino «¿está pactada la renovación en MIS condiciones particulares?». Pedí por escrito el documento donde conste ese pacto. Si no existe, el cobro del período siguiente no tiene respaldo contractual.',
    sources: [
      {
        label: 'Ley 19.678 art. 6',
        url: 'https://www.impo.com.uy/bases/leyes/19678-2018',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'cortar-renovacion',
    topic: 'Cómo se corta una renovación que sí estaba pactada',
    quote:
      'cualquiera de las partes podrá dejarla sin efecto mediante una notificación escrita a la otra parte, efectuada con un plazo de treinta días corridos de anticipación a la conclusión del período del seguro en curso.',
    article: 'Ley 19.678, art. 6',
    useFor:
      'Si la renovación estaba pactada, no es que no puedas salir: es que tenés que avisar por escrito 30 días corridos antes de que termine el período en curso.',
    sources: [
      {
        label: 'Ley 19.678 art. 6',
        url: 'https://www.impo.com.uy/bases/leyes/19678-2018',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'riesgo-desaparece',
    topic: 'Si el riesgo desapareció, el contrato se rescinde solo',
    quote:
      'El contrato de seguro será nulo si al tiempo de su celebración no existía el riesgo o había ocurrido el siniestro. Si el riesgo desaparece comenzada la cobertura, el contrato se rescinde a partir del momento en que esta circunstancia llegue a conocimiento del asegurador por cualquier medio y el asegurador podrá percibir el premio solo por el período transcurrido hasta ese momento.',
    article: 'Ley 19.678, art. 14',
    useFor:
      'El argumento más fuerte y el menos usado cuando el seguro estaba atado a algo que ya terminó — un viaje, un bien que vendiste, un crédito que cancelaste. No discutís la renovación: decís que el riesgo no existe. Y como la norma dice «por cualquier medio», tu propio aviso escrito hace correr el efecto desde esa fecha.',
    sources: [
      {
        label: 'Ley 19.678 art. 14',
        url: 'https://www.impo.com.uy/bases/leyes/19678-2018/14',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'pago-acepta-importe',
    topic: 'Lo que te van a contestar: «pagaste, entonces aceptaste»',
    quote: 'El pago del premio o de la primera cuota implicará la aceptación de su importe.',
    article: 'Ley 19.678, art. 6, inciso 4',
    useFor:
      'Anticipalo, porque es la defensa estándar. Se contesta con lo que el artículo dice y con lo que no dice: acepta el IMPORTE, no la existencia de una renovación que nunca se pactó. Y en una relación de consumo choca de frente con el art. 31 lit. H de la Ley 17.250, que hace abusiva la cláusula que toma tu silencio por aceptación. Honestidad ante todo: no encontramos pronunciamiento uruguayo publicado que zanje esa tensión, así que es un argumento, no una certeza.',
    sources: [
      {
        label: 'Ley 19.678 art. 6',
        url: 'https://www.impo.com.uy/bases/leyes/19678-2018/6',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'silencio',
    topic: 'Tu silencio no es aceptación',
    quote:
      'que el silencio del consumidor se tendrá por aceptación de cualquier modificación, restricción o ampliación de lo pactado',
    article: 'Ley 17.250, art. 31 lit. H — es una cláusula ABUSIVA',
    useFor:
      'Contra el «usted no dijo nada, así que se renovó». La Ley 19.731 lo repite para tarjetas en su art. 13 y cierra: «La inclusión de cláusulas abusivas en el contrato entre el emisor y el usuario no vincularán a este último y serán nulas».',
    sources: [
      {
        label: 'Ley 17.250 art. 31 lit. H',
        url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
        kind: 'norma',
      },
      {
        label: 'Ley 19.731 art. 13',
        url: 'https://www.impo.com.uy/bases/leyes/19731-2019',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'sesenta-dias',
    topic: 'Los 60 días para deshacer una renovación automática',
    quote:
      'El consumidor podrá, dentro de los sesenta días corridos contados desde la fecha en que se produjo la renovación automática, rescindir o resolver el contrato… teniendo el proveedor un máximo de quince días corridos para procesar la baja.',
    article:
      'Ley 17.250, art. 31 lit. I (redacción del art. 185 de la Ley 20.212, vigente 1/1/2024)',
    useFor:
      'Es el atajo, y hay que ser honesto: si la renovación fue hace más de dos meses, ese carril ya se cerró. Quedan los otros dos, que son mejores — cargo no pactado y servicio no solicitado.',
    sources: [
      {
        label: 'Ley 17.250 art. 31 lit. I',
        url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'no-solicitado',
    topic: 'El servicio que no pediste no se paga',
    quote:
      'no conllevan obligación de pago ni de devolución, equiparándose por lo tanto a las muestras gratis',
    article: 'Ley 17.250, art. 22 lit. D (servicios prestados sin solicitud previa)',
    useFor:
      'Es el argumento de fondo y el que cambia el terreno: no estás discutiendo el precio, estás discutiendo que no hay obligación de pagarlo.',
    sources: [
      {
        label: 'Ley 17.250 art. 22 lit. D',
        url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'cargo-no-pactado',
    topic: 'Un seguro no pactado no se puede cobrar',
    quote:
      'Las instituciones no podrán cobrar intereses, cargos, gastos, comisiones, tarifas, multas, seguros ni otros importes que no hayan sido previa y expresamente pactados.',
    article: 'RNRCSF, art. 359 (y art. 379 para todo cargo del estado de cuenta)',
    useFor:
      'Es la norma que convierte tu reclamo en algo que el BCU sí supervisa. Citala con el número: obliga a la institución a mostrar dónde lo pactaste.',
    sources: [
      {
        label: 'RNRCSF arts. 359 y 379',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Normativa/RNRCSF.aspx',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'venta-cruzada',
    topic: 'Si te lo vendieron junto con la tarjeta, el consentimiento va en papel aparte',
    quote:
      'recabar el consentimiento por escrito y en un documento separado del contrato de tarjeta de crédito',
    article: 'RNRCSF, art. 384.1',
    useFor:
      'Pedí ese documento separado. Si la venta fue telefónica, la norma exige grabación con la fórmula «Acepto contratar el producto [NOMBRE] por el precio de [PRECIO]», y quien no tenga ese registro debe, a pedido del cliente, tener por resuelto el contrato y restituir lo abonado.',
    sources: [
      {
        label: 'RNRCSF art. 384.1',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Normativa/RNRCSF.aspx',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'carga-prueba',
    topic: 'La prueba la tiene que dar el emisor, y no sólo en fraude',
    quote:
      'en caso de no poder demostrarlo, el emisor será responsable de la transacción reclamada… a efectos de cumplir con esta obligación no serán oponibles las condiciones de los contratos que el emisor hubiese firmado con terceros',
    article: 'RNRCSF, art. 364 lit. h (y Ley 19.731 art. 15 lit. F)',
    useFor:
      'Ante un reclamo por una transacción, el emisor debe demostrar que fue hecha según los procedimientos acordados y correctamente autenticada. Y la última frase es la que importa: «me lo mandó la aseguradora» no es defensa.',
    sources: [
      {
        label: 'Ley 19.731 art. 15 lit. F',
        url: 'https://www.impo.com.uy/bases/leyes/19731-2019',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'poliza',
    topic: 'La póliza te la tienen que entregar',
    quote:
      'dentro de los treinta días corridos de celebrado el contrato o toda vez que este se modifique',
    article: 'Ley 19.678, art. 24',
    useFor:
      'En español, legible y por un medio que permita comprobar la recepción. Si nunca te la dieron, eso mismo es parte del reclamo — y sin póliza es difícil que sostengan que la renovación estaba pactada.',
    sources: [
      {
        label: 'Ley 19.678 art. 24',
        url: 'https://www.impo.com.uy/bases/leyes/19678-2018',
        kind: 'norma',
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Trampas
// ─────────────────────────────────────────────────────────────────────────────

export interface ChargeTrap {
  id: string
  title: string
  detail: string
  sources: ChargeSource[]
}

export const CHARGE_TRAPS: ChargeTrap[] = [
  {
    id: 'dejar-de-pagar',
    title: 'Dejar de pagar la cuota mientras reclamás',
    detail:
      'Ninguna norma suspende la exigibilidad del cargo mientras se tramita el reclamo. Se configura mora, el interés puede llegar legalmente hasta las tasas medias del BCU más un 80% en operaciones por debajo de 2:000.000 UI (Ley 18.212 art. 11), y después la deuda va a la Central de Riesgos, donde queda 5 años. Salir del Clearing sale más caro que la cuota que estás discutiendo: pagá bajo protesta y peleá el reintegro.',
    sources: [
      {
        label: 'Ley 18.212 art. 11',
        url: 'https://www.impo.com.uy/bases/leyes/18212-2007',
        kind: 'norma',
      },
      {
        label: 'Ley 18.331 art. 22 (plazos de la Central de Riesgos)',
        url: 'https://www.impo.com.uy/bases/leyes/18331-2008',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'pago-parcial',
    title: '«Pago todo menos el cargo que discuto»',
    detail:
      'No te blinda. La imputación de los pagos parciales la fija el contrato (RNRCSF art. 378 lit. g), así que la diferencia puede quedar como saldo impago y generar mora igual.',
    sources: [
      {
        label: 'RNRCSF art. 378',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Normativa/RNRCSF.aspx',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'bcu-devuelve',
    title: 'Creer que el BCU te devuelve la plata',
    detail:
      'Es la trampa central, y la corrige el propio organismo: no puede ordenar la devolución de un importe, ni fijar daños y perjuicios, ni resolver un conflicto contractual entre partes. Todo eso es competencia exclusiva de la Justicia. Denunciar igual sirve —queda registrado y hace a la conducta de la institución supervisada— pero si lo que buscás es la plata, la vía es otra.',
    sources: [
      {
        label: 'BCU — Reclamos y denuncias',
        url: 'https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'saltear-empresa',
    title: 'Ir al BCU sin haber reclamado antes en la institución',
    detail:
      'Te rebotan: el trámite pide adjuntar copia del reclamo presentado ante la institución y copia de la respuesta, si la hubo. Ese requisito es del trámite publicado, no de la norma — pero es igual de real a la hora de que te den entrada.',
    sources: [
      {
        label: 'BCU — Denuncias de usuarios del sistema financiero',
        url: 'https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'reclamo-vs-denuncia',
    title: 'Confundir reclamo con denuncia en Defensa del Consumidor',
    detail:
      'No son la misma puerta. El reclamo es la mediación, y es el que puede terminar con la empresa devolviéndote. La denuncia busca la sanción, y el propio organismo aclara que no es para obtener una compensación. Para recuperar plata: reclamo.',
    sources: [
      {
        label: 'Defensa del Consumidor — MEF',
        url: 'https://www.gub.uy/ministerio-economia-finanzas/defensa-del-consumidor',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'plazo-contractual',
    title: 'Aceptar un «se te venció el plazo» como si fuera la ley',
    detail:
      'Los plazos para desconocer un consumo que publican los emisores salen de sus condiciones de contratación, no de una norma: ninguna ley uruguaya fija un número. Y en un cobro recurrente cada cuota es un cargo nuevo, así que el reloj corre por cada débito y no desde el primero.',
    sources: [
      {
        label: 'Ley 19.731 art. 17 lit. B («inmediatamente al detectarlo»)',
        url: 'https://www.impo.com.uy/bases/leyes/19731-2019',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'como-fraude',
    title: 'Discutirlo como si fuera un fraude',
    detail:
      'No lo es, y encuadrarlo así te lleva al terreno donde la norma juega en tu contra (sos responsable de las operaciones no autorizadas hasta que avisás, RNRCSF art. 367). Encuadralo como cargo no pactado (arts. 359, 361 y 379) y como servicio no solicitado (Ley 17.250 art. 22 lit. D).',
    sources: [
      {
        label: 'RNRCSF arts. 359, 361, 367 y 379',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Normativa/RNRCSF.aspx',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'una-sola-ventanilla',
    title: 'Reclamarle sólo al banco, o sólo a la aseguradora',
    detail:
      'Son dos ventanillas con el mismo plazo pero normas distintas: el banco por el art. 327 de la Recopilación de Regulación y Control, la aseguradora por el art. 86.6 de la de Seguros. Presentá en las dos y pedí en las dos el número de constancia.',
    sources: [
      {
        label: 'RNRCSF art. 327 / RNSR art. 86.6',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Normativa/RNSR.aspx',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'dejar-pasar-el-ano',
    title: 'Dejar pasar el año',
    detail:
      'La vía rápida y barata —el proceso de consumo del Juzgado de Paz, hasta 100 UR, sin abogado obligatorio— caduca al año del hecho. Después queda el juicio ordinario, que es otra cosa en tiempo y en costo.',
    sources: [
      {
        label: 'Ley 18.507',
        url: 'https://www.impo.com.uy/bases/leyes/18507-2009',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'cuotas-vs-cobertura',
    title: 'Confundir el plazo de la financiación con el de la cobertura',
    detail:
      'Que una póliza se pague en 12 cuotas no la vuelve anual, y que cubra 45 días no la vuelve mensual. Hay coberturas anuales de asistencia al viajero cuyo tope es de 45 días CONSECUTIVOS POR VIAJE, financiadas en 12 cuotas que coinciden con el año de cobertura. Antes de pelear, mirá la póliza: si dice «anual multiviaje», el reclamo no es «me cobraron de más» sino «renovaron el período siguiente sin que yo lo pactara», que es un reclamo distinto y con otra norma.',
    sources: [
      {
        label: 'Ley 19.678 art. 6 (renovación) y art. 24 (entrega de la póliza)',
        url: 'https://www.impo.com.uy/bases/leyes/19678-2018',
        kind: 'norma',
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Huecos declarados
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lo que buscamos y no está publicado. Va en la página, a la vista: en este tema la mitad de lo que
 * circula como derecho es contrato de un emisor, y declarar el hueco es lo que separa esta página
 * de las que inventan un número.
 */
export const CHARGE_GAPS: readonly string[] = Object.freeze([
  'Cuánto tarda Defensa del Consumidor. El organismo menciona una expectativa de gestión, no un plazo legal: no hay norma que lo fije.',
  'Si un cobro recurrente en tarjeta de CRÉDITO queda comprendido en el régimen de débito automático de la Ley 19.210 —los 5 días hábiles para probar y 1 para devolver—. El art. 68 ya nombra las tarjetas asociadas, pero la definición sigue hablando de cuenta o instrumento de dinero electrónico y exige contrato marco. Se puede invocar; no se puede prometer.',
  'Si el banco responde solidariamente con la aseguradora por un seguro vendido en su sucursal. No hay norma de bancaseguros que lo establezca. Sí está claro que el banco es proveedor a los efectos de la Ley 17.250 y que tiene deber propio de atender tu reclamo.',
  'Si el emisor puede negarse a reintegrar invocando su plazo contractual cuando la norma que ordena el reembolso no fija caducidad para el cliente. Es la pelea central de este tipo de caso y ninguna fuente primaria la resuelve.',
  'Si el art. 6 inciso 4 de la Ley 19.678 —«el pago del premio o de la primera cuota implicará la aceptación de su importe»— alcanza para convalidar una renovación que nunca se pactó, o si sólo acepta el importe. Choca con el art. 31 lit. H de la Ley 17.250 y no encontramos pronunciamiento uruguayo publicado que lo zanje.',
  'Cuál de los dos regímenes de rescisión rige en una asistencia al viajero: el art. 13 de la Ley 19.678 (rescisión en cualquier tiempo con un mes de aviso) o el art. 104 (recién después de la primera anualidad), que se aplica a los seguros para las personas. Y una cobertura de 45 días no tiene primera anualidad, así que el texto no resuelve el caso. Depende de cómo esté calificada la póliza.',
  'Si los corredores y agentes de seguros están registrados y supervisados por el BCU. La Recopilación los menciona de refilón y responsabiliza a la aseguradora por ellos, pero no encontramos un registro.',
  'Las reglas de contracargo de las marcas de tarjeta y sus ventanas de tiempo. No son norma uruguaya ni las publica el emisor: cualquier plazo de ese origen es práctica, no derecho.',
])

// ─────────────────────────────────────────────────────────────────────────────
// Qué llevar
// ─────────────────────────────────────────────────────────────────────────────

/** Los papeles que hay que pedir, en el orden en que sirven. */
export const DOCUMENTS_TO_ASK: readonly string[] = Object.freeze([
  'La póliza completa, con las condiciones particulares (Ley 19.678 art. 24).',
  'El documento donde conste que pactaste la renovación automática (Ley 19.678 art. 6).',
  'Si te lo vendieron junto con la tarjeta: el consentimiento por escrito en documento SEPARADO, o la grabación si fue por teléfono (RNRCSF art. 384.1).',
  'Los estados de cuenta con cada cargo marcado, uno por uno.',
  'La constancia de tu reclamo, con fecha, hora y número identificatorio. Sin eso, el resto del camino no arranca.',
])

/** El paso que casi todos se saltean. */
export const CONSTANCIA_RULE =
  'Pedí SIEMPRE el número de constancia y guardalo. La norma obliga a la institución a dártela con fecha, hora y número identificatorio, y a informarte que podés acudir a la Superintendencia de Servicios Financieros. Sin ese número, el BCU no te da trámite y en Defensa del Consumidor arrancás sin poder probar que reclamaste.'

// ─────────────────────────────────────────────────────────────────────────────
// FAQ y fuentes
// ─────────────────────────────────────────────────────────────────────────────

export const CHARGE_FAQS: { q: string; a: string }[] = [
  {
    q: '¿Es verdad que «esto lo tenés que denunciar en el BCU»?',
    a: 'Es media verdad. El BCU es el supervisor correcto de bancos y aseguradoras y recibe la denuncia, pero publica que no puede ordenar la devolución de importes ni resolver controversias sobre el cumplimiento de cláusulas: eso es competencia exclusiva de los órganos jurisdiccionales. Denunciá igual, pero sabiendo qué esperar.',
  },
  {
    q: 'Entonces, ¿quién me puede hacer devolver la plata?',
    a: 'Un juez. O la propia empresa, si reconoce el error en el reclamo o acuerda en la audiencia de Defensa del Consumidor. Por eso el primer escalón —la ventanilla de la empresa— no es un trámite: es, estadísticamente, donde más casos se resuelven.',
  },
  {
    q: '¿Puedo ir directo al BCU sin reclamar antes en el banco?',
    a: 'No. El trámite exige adjuntar copia del reclamo presentado ante la institución y copia de la respuesta. El paso previo es la ventanilla de la institución, con su número de constancia.',
  },
  {
    q: '¿Cuántos días tengo para desconocer un cargo?',
    a: 'Ninguna ley uruguaya fija un número: la Ley 19.731 dice «inmediatamente al detectarlo». El número lo pone el contrato de tu emisor. Y en un cobro recurrente cada cuota es un cargo nuevo, así que el plazo corre por cada débito y no desde el primero.',
  },
  {
    q: '¿Puedo dejar de pagar mientras reclamo?',
    a: 'Podés, pero no hay norma que te proteja: se configura mora, con interés que puede llegar hasta las tasas medias del BCU más un 80%, y la deuda va a la Central de Riesgos por 5 años. Conviene pagar bajo protesta y pelear el reintegro.',
  },
  {
    q: '¿Cómo freno el cobro hoy mismo?',
    a: 'Rescindí el contrato por escrito con la aseguradora; si es débito automático, revocá la orden ante el banco; y si querés certeza, pedí la baja o sustitución de la tarjeta. Ojo: no existe una norma que obligue al banco a bloquear hacia adelante un cobro recurrente de un comercio.',
  },
  {
    q: 'Me renovaron el seguro sin avisar. ¿Pueden?',
    a: 'Sólo si la renovación automática estaba pactada, y si cambiaron las condiciones hacía falta tu consentimiento expreso. Pedí por escrito el documento donde conste ese pacto: si no existe, el cobro del período siguiente no tiene respaldo contractual.',
  },
  {
    q: 'Pasó más de un año de la renovación. ¿Perdí todo?',
    a: 'Perdiste el atajo de los 60 días corridos del art. 31 lit. I de la Ley 17.250. No perdiste los otros dos argumentos, que son mejores: cargo no pactado y servicio no solicitado. Pero ojo con el año de caducidad de la vía rápida del Juzgado de Paz.',
  },
  {
    q: '¿Necesito abogado?',
    a: 'Para reclamar a la empresa, al BCU y a Defensa del Consumidor, no. Para el proceso de consumo del Juzgado de Paz hasta 100 UR, la ley dice expresamente que la comparecencia no requiere asistencia letrada obligatoria, y el costo es un timbre del 1% de lo reclamado.',
  },
  {
    q: '¿Tengo que hacer conciliación previa antes de demandar?',
    a: 'Para los procesos de consumo de la Ley 18.507, no: el Código General del Proceso los exceptúa expresamente. Por encima de ese monto la respuesta se complica y conviene consultar.',
  },
  {
    q: '¿Defensa del Consumidor es del MEC?',
    a: 'No: del Ministerio de Economía y Finanzas. Es un error muy repetido y hace perder tiempo buscando en el ministerio equivocado.',
  },
  {
    q: '¿Reclamo o denuncia en Defensa del Consumidor?',
    a: 'Reclamo, que es la mediación y puede terminar con la empresa devolviéndote. La denuncia busca la sanción, y el propio organismo aclara que no es para obtener una compensación.',
  },
  {
    q: 'Compré la asistencia al viajero en una agencia, no en un banco. ¿Cambia algo?',
    a: 'Puede cambiar mucho. Si lo que tenés es un voucher de una empresa de asistencia y no una póliza de una aseguradora autorizada, el vendedor puede no estar en el registro del BCU, y entonces el BCU no es el organismo. Mirá el papel: quién lo emite y si dice «póliza». Si no lo es, la vía es Defensa del Consumidor.',
  },
]

export const UNAUTHORIZED_CHARGE_SOURCES: ChargeSource[] = [
  {
    label: 'Ley 19.678 — Contrato de Seguro (arts. 6, 13, 24 y 104)',
    url: 'https://www.impo.com.uy/bases/leyes/19678-2018',
    kind: 'norma',
  },
  {
    label: 'Ley 17.250 — Relaciones de Consumo (arts. 22, 31, 42 y 47)',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
    kind: 'norma',
  },
  {
    label: 'Ley 19.731 — Tarjetas de crédito y débito (arts. 13, 14, 15 y 17)',
    url: 'https://www.impo.com.uy/bases/leyes/19731-2019',
    kind: 'norma',
  },
  {
    label: 'Ley 19.210 — Débito automático (arts. 68, 70, 72 y 73)',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014',
    kind: 'norma',
  },
  {
    label: 'Ley 18.507 — Procesos de consumo hasta 100 UR',
    url: 'https://www.impo.com.uy/bases/leyes/18507-2009',
    kind: 'norma',
  },
  {
    label: 'Ley 18.212 art. 11 — tope de intereses de mora',
    url: 'https://www.impo.com.uy/bases/leyes/18212-2007',
    kind: 'norma',
  },
  {
    label: 'Ley 18.331 art. 22 — plazos de la Central de Riesgos',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008',
    kind: 'norma',
  },
  {
    label: 'BCU — Recopilación de Regulación y Control del Sistema Financiero',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Normativa/RNRCSF.aspx',
    kind: 'norma',
  },
  {
    label: 'BCU — Recopilación de Seguros y Reaseguros',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Normativa/RNSR.aspx',
    kind: 'norma',
  },
  {
    label: 'BCU — Reclamos y denuncias del usuario financiero',
    url: 'https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/',
    kind: 'operador',
  },
  {
    label: 'Área de Defensa del Consumidor — Ministerio de Economía y Finanzas',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/defensa-del-consumidor',
    kind: 'operador',
  },
]
