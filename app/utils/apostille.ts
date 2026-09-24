// Apostillar un documento en Uruguay: cuánto sale, y sobre todo EN QUÉ ORDEN.
//
// Módulo PURO (sin Vue/Nuxt, imports relativos) para que
// `pages/apostillar-un-documento-uruguay.vue` no duplique el catálogo y vitest lo
// pueda cargar en Node.
//
// POR QUÉ ESTA PÁGINA. Hasta ahora la única mención del arancel en todo el sitio
// era una LÍNEA del FAQ de la partida de nacimiento (`utils/birthCertificate.ts`:
// «La apostilla sale $777 y la legalización $379»). Es el mismo accidente que ya
// documentó el certificado de antecedentes, donde el precio vivía dentro de la
// página del pasaporte: la consulta de marca —«apostillar documentos uruguay»,
// «cuánto sale la apostilla»— caía en una página sobre OTRO trámite, que contesta
// el importe de pasada y no contesta nada más.
//
// LO QUE NADIE PONE EN UNA PANTALLA, Y ES EL MOTIVO REAL DE LA PÁGINA: la
// apostilla es el ÚLTIMO paso, no el único, y casi nunca se paga sola. Cancillería
// apostilla una firma que ya tiene que estar registrada ante ella, así que según
// QUIÉN firmó tu documento hay un organismo distinto antes, con su propio arancel
// y su propia agenda. Un título de estudio pasa antes por el MEC, un certificado
// firmado por un profesional de la salud por el MSP, y todo lo que firma un
// escribano, un juez o un traductor público por la IGRN del Poder Judicial. Las
// tres fichas son públicas y están en tres sitios distintos; nadie las suma.
//
// LA REGLA DE LAS CIFRAS. Cada importe sale textual del bloque «Costos» de la
// ficha de SU organismo, y cada paso guarda la fuente de la que salió. El arancel
// del MSP se publica en UNIDADES REAJUSTABLES, no en pesos, así que se guarda en
// UR y la conversión la hace {@link stepCostPesos} con el valor del día que la
// página recibe del API — igual que el certificado de antecedentes hace con la UI.
// Un importe en pesos escrito a mano acá sería un número viejo mañana.
//
// Y LA REGLA DEL TOTAL, que es la lección de PRECIOS.md aplicada a un trámite: un
// total BAJA por faltarle ítems. La IGRN no publica su arancel en ninguna parte, y
// un total que lo omitiera en silencio diría que apostillar un poder sale $777,
// que es menos de lo que sale. Por eso {@link totalFor} nunca devuelve un número
// pelado: devuelve el total PARCIAL y qué le falta, para que la página lo imprima
// en la misma línea.

/** Una fuente primaria: etiqueta legible + URL oficial. */
export interface ApostilleSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo este archivo contra las fuentes oficiales. */
export const APOSTILLE_VERIFIED_AT = '2026-09-24'

/** Ruta de la página; el mismo slug en los tres idiomas (i18n prefija /en y /pt). */
export const APOSTILLE_PATH = '/apostillar-un-documento-uruguay'

/** Organismo que apostilla, tal como lo nombra la ficha. */
export const APOSTILLE_ORGANISMO =
  'Ministerio de Relaciones Exteriores — Dirección de Asuntos Consulares'

/** Año al que la ficha del MRREE refiere sus importes, textual. */
export const APOSTILLE_FEE_YEAR = 2026

// ---------------------------------------------------------------------------
// Los dos trámites del MRREE
// ---------------------------------------------------------------------------

/** Cuál de los dos trámites del MRREE corresponde. No son intercambiables. */
export type ApostilleTramite = 'apostilla' | 'legalizacion'

/** Un trámite del MRREE: su arancel en pesos y para qué sirve. */
export interface ApostilleFee {
  readonly key: ApostilleTramite
  readonly label: string
  /** Arancel en pesos uruguayos, textual del bloque «Costos» de la ficha. */
  readonly pesos: number
  /** Qué autentica, en los términos de la ficha. */
  readonly what: string
  /** Cuándo corresponde éste y no el otro. */
  readonly when: string
}

/**
 * Los dos trámites, con el importe que publica la ficha para {@link APOSTILLE_FEE_YEAR}.
 *
 * El que corresponde NO lo elegís vos: depende de si el país donde vas a presentar
 * el documento ratificó el Convenio de La Haya. La ficha enlaza la tabla de estados
 * de la HCCH, que es la única lista que manda y cambia cuando se adhiere un país.
 */
export const APOSTILLE_FEES: readonly ApostilleFee[] = Object.freeze([
  Object.freeze({
    key: 'apostilla' as const,
    label: 'Apostilla',
    pesos: 777,
    what: 'La autenticación de la firma que figura en un documento emitido o intervenido por un organismo público uruguayo, para que pueda presentarse en el exterior.',
    when: 'Cuando el país donde vas a presentarlo ratificó el Convenio sobre la Apostilla.',
  }),
  Object.freeze({
    key: 'legalizacion' as const,
    label: 'Legalización',
    pesos: 379,
    what: 'La autenticación de la firma del agente consular uruguayo que intervino el documento en el país de origen, y la validación de documentos uruguayos para países que no ratificaron el Convenio.',
    when: 'Cuando el país de destino NO ratificó el Convenio, o cuando el documento viene del exterior y tiene que valer en Uruguay.',
  }),
])

/** El trámite pedido, o `undefined` si la clave no existe. */
export function feeFor(tramite: ApostilleTramite): ApostilleFee | undefined {
  return APOSTILLE_FEES.find(fee => fee.key === tramite)
}

// ---------------------------------------------------------------------------
// El paso previo: qué organismo te toca según quién firmó
// ---------------------------------------------------------------------------

/**
 * Lo que cuesta un paso previo.
 *
 * `unpublished` es un estado de primera clase y no un cero: el organismo existe,
 * el paso es obligatorio, y su ficha no dice el precio. Tratarlo como gratis
 * fabricaría un total más barato que la realidad, que es exactamente el error que
 * este módulo existe para no cometer.
 */
export type StepCost =
  | { readonly kind: 'pesos'; readonly pesos: number }
  | { readonly kind: 'ur'; readonly ur: number }
  | { readonly kind: 'unpublished'; readonly why: string }
  | { readonly kind: 'none' }

/** Un paso previo a la apostilla, disparado por quién firmó el documento. */
export interface ApostillePreStep {
  /** Id estable, usado como `:key`. */
  readonly key: string
  /** Quién firmó el documento. Es la pregunta que el lector se sabe contestar. */
  readonly signedBy: string
  /** Organismo donde hay que pasar ANTES del MRREE. `null` si no hay paso previo. */
  readonly organismo: string | null
  /** Lo que cuesta ese paso. */
  readonly cost: StepCost
  /** Qué hay que hacer, en una línea. */
  readonly note: string
  /** URL de la ficha oficial de la que salió el importe, o `null` si no hay ficha con costo. */
  readonly sourceUrl: string | null
}

/**
 * Los pasos previos que lista la ficha del MRREE, cada uno con el arancel que
 * publica la ficha de SU organismo.
 *
 * El orden es por frecuencia con la que aparecen en la vida real: poderes y
 * traducciones primero, después títulos, después salud.
 */
export const APOSTILLE_PRE_STEPS: readonly ApostillePreStep[] = Object.freeze([
  Object.freeze({
    key: 'notarial',
    signedBy: 'Un escribano, una oficina del Poder Judicial o un traductor público',
    organismo: 'Inspección General de Registros Notariales (IGRN), Poder Judicial',
    cost: Object.freeze({
      kind: 'unpublished' as const,
      why: 'La página de Legalizaciones de la IGRN explica el trámite y no publica arancel.',
    }),
    note: 'La IGRN legaliza firmas de jueces, actuarios, escribanos, abogados y traductores públicos. Se inicia por la Ventanilla Única Judicial y recién después se va al MRREE.',
    sourceUrl: 'https://www.poderjudicial.gub.uy/institucional/igrn/legalizaciones',
  }),
  Object.freeze({
    key: 'estudio',
    signedBy: 'Una autoridad nacional, en un título o documento de estudio',
    organismo: 'Ministerio de Educación y Cultura (MEC)',
    cost: Object.freeze({ kind: 'pesos' as const, pesos: 269 }),
    note: 'El MEC cobra por documento y atiende sólo con agenda previa, en 18 de Julio 1730, 5.º piso.',
    sourceUrl:
      'https://www.gub.uy/tramites/legalizacion-titulos-documentos-estudiantiles-firmados-autoridades-nacionales',
  }),
  Object.freeze({
    key: 'salud',
    signedBy: 'Un profesional de la salud (incluye certificados de vacunación)',
    organismo: 'MSP — Departamento de Habilitación y Control de Profesionales de la Salud',
    cost: Object.freeze({ kind: 'ur' as const, ur: 1 }),
    note: 'No necesita agenda y la constancia se obtiene en el momento; el arancel se publica en UR, no en pesos.',
    sourceUrl:
      'https://www.gub.uy/tramites/constancia-legalizacion-documentos-firmados-profesionales-salud-registrados-habilitados-msp',
  }),
  Object.freeze({
    key: 'iglesia',
    signedBy: 'Un obispado del interior o una iglesia',
    organismo: 'Arzobispado de Montevideo',
    cost: Object.freeze({
      kind: 'unpublished' as const,
      why: 'No es un organismo del Estado y no publica una ficha de trámite con arancel.',
    }),
    note: 'La ficha del MRREE manda a legalizar ahí antes de presentar el documento.',
    sourceUrl: null,
  }),
  Object.freeze({
    key: 'bps',
    signedBy: 'El BPS',
    organismo: null,
    cost: Object.freeze({ kind: 'none' as const }),
    note: 'No hay organismo intermedio, pero el documento tiene que llevar firma ológrafa de un funcionario registrado ante el MRREE: una constancia impresa sin firma manuscrita no se puede apostillar.',
    sourceUrl: null,
  }),
  Object.freeze({
    key: 'caj',
    signedBy: 'La Policía Científica, en un certificado de antecedentes judiciales',
    organismo: null,
    cost: Object.freeze({ kind: 'none' as const }),
    note: 'Es la excepción cómoda: el trámite se puede iniciar adjuntando únicamente el ticket que da la Dirección Nacional de Policía Científica o la jefatura departamental.',
    sourceUrl: null,
  }),
  Object.freeze({
    key: 'otro',
    signedBy: 'Otro organismo público uruguayo con la firma ya registrada',
    organismo: null,
    cost: Object.freeze({ kind: 'none' as const }),
    note: 'Se va directo al MRREE con el original, sin alteraciones ni roturas.',
    sourceUrl: null,
  }),
])

/** El paso previo pedido, o `undefined` si la clave no existe. */
export function preStepFor(key: string): ApostillePreStep | undefined {
  return APOSTILLE_PRE_STEPS.find(step => step.key === key)
}

// ---------------------------------------------------------------------------
// Aritmética
// ---------------------------------------------------------------------------

/**
 * Convierte un importe en UR a pesos con el valor de la UR del día.
 *
 * Devuelve `null` si no hay valor de UR utilizable, para que la página muestre el
 * arancel en UR sin inventar una conversión. Redondea a peso entero: el organismo
 * cobra en UR y el centésimo de la conversión es ruido, no precisión.
 */
export function pesosForUr(ur: number, urValue: number | null | undefined): number | null {
  if (typeof urValue !== 'number' || !Number.isFinite(urValue) || urValue <= 0) return null
  if (!Number.isFinite(ur) || ur <= 0) return null
  return Math.round(ur * urValue)
}

/**
 * Lo que cuesta un paso previo EN PESOS, o `null` si no se puede saber hoy.
 *
 * `null` tiene dos causas distintas y las dos terminan igual acá: el organismo no
 * publica el arancel, o lo publica en UR y todavía no tenemos el valor del día.
 * Quién de las dos fue lo dice {@link totalFor} en `missing`.
 */
export function stepCostPesos(cost: StepCost, urValue: number | null | undefined): number | null {
  switch (cost.kind) {
    case 'none':
      return 0
    case 'pesos':
      return Number.isFinite(cost.pesos) && cost.pesos >= 0 ? cost.pesos : null
    case 'ur':
      return pesosForUr(cost.ur, urValue)
    case 'unpublished':
      return null
  }
}

/** Un total, con la honestidad de decir qué no pudo contar. */
export interface ApostilleTotal {
  /** Suma de lo que SÍ se pudo contar, en pesos. */
  readonly total: number
  /** `true` si falta algún importe: el total es un piso, no el precio final. */
  readonly partial: boolean
  /** Qué quedó sin contar, en texto listo para imprimir al lado del total. */
  readonly missing: readonly string[]
}

/**
 * El total de apostillar (o legalizar) un documento firmado por `step`.
 *
 * Nunca devuelve un número pelado. Si el paso previo no tiene arancel publicado,
 * el total sale igual —el arancel del MRREE se conoce— pero marcado `partial` y
 * diciendo qué le falta, que es la única forma de que un piso no se lea como un
 * precio. Un `tramite` desconocido devuelve total 0 y `partial`, porque no saber
 * cuál de los dos corresponde no es lo mismo que que sea gratis.
 */
export function totalFor(
  step: ApostillePreStep,
  tramite: ApostilleTramite,
  urValue: number | null | undefined
): ApostilleTotal {
  const fee = feeFor(tramite)
  if (!fee) {
    return Object.freeze({
      total: 0,
      partial: true,
      missing: Object.freeze(['el arancel del MRREE']),
    })
  }

  const previo = stepCostPesos(step.cost, urValue)
  if (previo !== null) {
    return Object.freeze({ total: fee.pesos + previo, partial: false, missing: Object.freeze([]) })
  }

  const missing =
    step.cost.kind === 'ur'
      ? `el paso previo en ${step.organismo ?? 'el organismo previo'} (${step.cost.ur} UR, sin valor de la UR de hoy)`
      : `el paso previo en ${step.organismo ?? 'el organismo previo'}, que no publica su arancel`

  return Object.freeze({ total: fee.pesos, partial: true, missing: Object.freeze([missing]) })
}

// ---------------------------------------------------------------------------
// Dónde, cuándo y las exoneraciones
// ---------------------------------------------------------------------------

/** Los datos de atención del MRREE, textuales de la ficha. */
export const APOSTILLE_CONTACT = Object.freeze({
  direccion: 'Cuareim 1384, planta baja (entre Avenida 18 de Julio y Colonia), Montevideo',
  horario: 'Lunes a viernes de 09:30 a 12:30 y de 14:00 a 15:30',
  telefono: '17707, de 09:30 a 15:30',
  email: 'cac@mrree.gub.uy',
})

/** Las dos etapas del trámite, en el orden en que la ficha las numera. */
export const APOSTILLE_ETAPAS: readonly { readonly title: string; readonly body: string }[] =
  Object.freeze([
    Object.freeze({
      title: 'Primera etapa, en línea',
      body: 'Se inicia el trámite con los datos y los documentos escaneados (escaneados, no fotografiados, y todas las hojas). El MRREE valida que esté completo, después se paga —en línea o en Abitab— y recién con el pago hecho se habilita la agenda.',
    }),
    Object.freeze({
      title: 'Segunda etapa, presencial',
      body: 'El día de la cita hay que llevar los documentos originales, los mismos que se cargaron. Si no va el titular, la persona que va tiene que presentar el formulario de autorización.',
    }),
  ])

/**
 * Las exoneraciones que lista la ficha, con la norma que cada una invoca.
 *
 * Se transcriben como las enumera el MRREE y se cita su ficha: este sitio no
 * interpreta el alcance de una ley que no leyó entera. El dato operativo, que la
 * ficha aclara y es fácil de perderse, es que la exoneración NO se pide en el
 * formulario: como la agenda se habilita recién con el pago hecho, hay que
 * escribir antes al correo de Cancillería.
 */
export const APOSTILLE_EXONERACIONES: readonly string[] = Object.freeze([
  'Certificado que acredite situación de vulnerabilidad social expedido por el MIDES, de acuerdo a la Ley 18.996, artículo 125.',
  'Constancia de vulnerabilidad social expedida por agentes consulares o un Poder del Estado con competencia para hacerlo, de acuerdo a la Ley 11.924, artículo 21, literal E.',
  'Cartas poder para BPS expedidas por consulados del Uruguay en el exterior, de acuerdo a la Ley 11.924, artículo 21, literal A.',
  'Traslados de cenizas firmados por la necrópolis del departamento correspondiente, de acuerdo al artículo 2 del Decreto del 28/07/1911.',
])

// ---------------------------------------------------------------------------
// Preguntas y límites
// ---------------------------------------------------------------------------

export interface ApostilleFaq {
  readonly question: string
  readonly answer: string
}

export const APOSTILLE_FAQS: readonly ApostilleFaq[] = Object.freeze([
  Object.freeze({
    question: '¿Cuánto sale apostillar un documento en Uruguay?',
    answer:
      'La apostilla sale $777 y la legalización $379, importes que la ficha del Ministerio de Relaciones Exteriores publica para 2026 y que se pagan siempre en pesos uruguayos, en línea o por Abitab. Ese es el arancel del MRREE: si tu documento necesita un paso previo en otro organismo, ese paso se paga aparte.',
  }),
  Object.freeze({
    question: '¿Apostilla o legalización? ¿Cuál me corresponde?',
    answer:
      'Depende del país donde vas a presentar el documento, no de vos. Si ratificó el Convenio sobre la Apostilla, va apostilla; si no lo ratificó, va legalización y después el consulado del país de destino. La lista de países que lo ratificaron la mantiene la Conferencia de La Haya y la enlaza la propia ficha del MRREE.',
  }),
  Object.freeze({
    question: '¿Puedo ir directo a Cancillería con el documento?',
    answer:
      'Sólo si lo firmó un organismo público cuya firma ya está registrada ante el MRREE. Lo que firma un escribano, una oficina del Poder Judicial o un traductor público pasa antes por la IGRN del Poder Judicial; un título de estudio, por el MEC; un documento firmado por un profesional de la salud, por el MSP. La apostilla es el último paso, no el único.',
  }),
  Object.freeze({
    question: '¿Se puede hacer todo en línea?',
    answer:
      'No del todo. La primera etapa es en línea —datos, documentos escaneados, validación y pago—, pero la segunda es presencial: hay que llevar los originales a Cuareim 1384 el día de la cita. Y la agenda recién se habilita cuando el pago está hecho.',
  }),
  Object.freeze({
    question: '¿Cuánto sale apostillar el certificado de antecedentes judiciales?',
    answer:
      'El arancel del MRREE es el mismo, $777, y no necesita paso previo: la ficha permite iniciar el trámite adjuntando únicamente el ticket que da la Dirección Nacional de Policía Científica o la jefatura de tu departamento. El certificado en sí se paga aparte, en UI, y tiene su propia página en este sitio.',
  }),
  Object.freeze({
    question: '¿Hay forma de no pagarlo?',
    answer:
      'La ficha lista cuatro exoneraciones, casi todas ligadas a situaciones de vulnerabilidad social acreditadas por el MIDES o por un consulado. El detalle práctico es que no se piden en el formulario: como el sistema habilita la agenda recién después del pago, hay que comunicarlas antes al correo cac@mrree.gub.uy.',
  }),
])

/** Un dato que la gente busca, que la fuente oficial NO publica, y por qué no lo inventamos. */
export const APOSTILLE_UNPUBLISHED: readonly ApostilleFaq[] = Object.freeze([
  Object.freeze({
    question: '¿Cuánto sale la legalización en la IGRN del Poder Judicial?',
    answer:
      'No lo publicamos porque su página no lo publica. La IGRN describe qué legaliza y cómo se inicia el trámite, y no trae bloque de costos. Es el paso previo más frecuente —todo poder, toda traducción pública, todo documento judicial pasa por ahí—, así que el total que muestra esta página para esos casos es un piso y lo dice.',
  }),
  Object.freeze({
    question: '¿Cuánto tarda en salir la apostilla?',
    answer:
      'La ficha del MRREE no publica un plazo de entrega. Sí publica el orden que condiciona todo lo demás: primero se paga, después se agenda, y la cita presencial es el último paso. Cualquier cantidad de días que leas en otro lado no sale de la fuente oficial.',
  }),
  Object.freeze({
    question: '¿Cuántos días de cupo hay en la agenda?',
    answer:
      'Tampoco lo publica. Y es lo que más conviene mirar antes de comprar un pasaje o comprometer una fecha, porque el cupo se ve recién después de haber pagado el trámite.',
  }),
])

/** Las fuentes primarias, verificadas el {@link APOSTILLE_VERIFIED_AT}. */
export const APOSTILLE_SOURCES: readonly ApostilleSource[] = Object.freeze([
  Object.freeze({
    label:
      'gub.uy — Apostilla y/o legalización de documentos públicos (MRREE): «Costos actualizados para el año 2026: Apostilla: $777 (pesos uruguayos setecientos setenta y siete). Legalización: $379 (pesos uruguayos trescientos setenta y nueve)», las dos etapas del trámite, las exoneraciones y la atención en Cuareim 1384',
    url: 'https://www.gub.uy/tramites/apostilla-yo-legalizacion-documentos-publicos-uruguayos-extranjeros-produzcan-efectos-exterior-republica',
  }),
  Object.freeze({
    label:
      'gub.uy — Legalización de títulos y documentos estudiantiles firmados por autoridades nacionales (MEC): «Costos 269 $ Doscientos sesenta y nueve pesos uruguayos, por documento»',
    url: 'https://www.gub.uy/tramites/legalizacion-titulos-documentos-estudiantiles-firmados-autoridades-nacionales',
  }),
  Object.freeze({
    label:
      'gub.uy — Constancia para legalización de documentos firmados por profesionales de la salud (MSP): «Costos 1 U.R.», sin agenda previa y con entrega en el momento',
    url: 'https://www.gub.uy/tramites/constancia-legalizacion-documentos-firmados-profesionales-salud-registrados-habilitados-msp',
  }),
  Object.freeze({
    label:
      'Poder Judicial — IGRN, Legalizaciones: qué firmas legaliza y el orden «IGRN + Apostilla en MRREE», o «IGRN + MRREE + Consulado» si el país de destino no firmó el Convenio de La Haya',
    url: 'https://www.poderjudicial.gub.uy/institucional/igrn/legalizaciones',
  }),
  Object.freeze({
    label:
      'HCCH — Tabla de estados del Convenio sobre la Apostilla: qué países lo ratificaron, que es lo que decide si va apostilla o legalización',
    url: 'https://www.hcch.net/es/instruments/conventions/status-table/?cid=41',
  }),
])
