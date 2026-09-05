// app/utils/childSupport.ts
// Datos y aritmética de /pension-alimenticia-uruguay: cuánto es una pensión alimenticia en
// Uruguay, quién la debe, hasta cuándo, y qué palancas de DINERO existen cuando no se paga.
//
// POR QUÉ EXISTE: el sitio ya tiene el otro lado del mostrador —`/embargo-de-sueldo-uruguay`
// contesta cuánto te pueden descontar y con qué tope— y ninguna página contesta la pregunta que
// llega antes: cuánto es. La respuesta que circula («el 30 % del sueldo», «un tercio por hijo»)
// no está en ninguna norma uruguaya: el artículo 46 del Código de la Niñez y la Adolescencia
// manda fijarla en proporción a las posibilidades del obligado y a las necesidades del
// beneficiario, y eso lo resuelve el juez expediente por expediente.
//
// LO QUE ESTA PÁGINA CONTESTA Y NADIE MÁS: que la ley uruguaya escribe UN solo número, y es un
// piso, no un porcentaje. Cuando el tribunal no tiene información sobre los ingresos del
// obligado, el artículo 46 in fine le manda fijar igual «una prestación alimenticia universal de
// 1 BPC (una Base de Prestaciones y Contribuciones) por núcleo familiar como mínimo». No es lo
// que le corresponde a cada uno: es el piso de lo que un juez puede fijar a ciegas. Ese inciso
// entró con la Ley 20.212 de 06/11/2023 art. 646, así que es reciente y casi nadie lo cita.
//
// LA SEGUNDA COSA QUE NADIE JUNTA: la morosidad alimentaria es un problema BANCARIO. Inscripto
// alguien en el Registro Nacional de Actos Personales, Sección Interdicciones, el artículo 2 de
// la Ley 18.244 prohíbe a las instituciones de intermediación financiera otorgar o renovar
// créditos, abrir cuentas bancarias y emitir o renovar tarjetas de crédito a su favor. Eso NO es
// el Clearing —que es una base privada de la Ley 18.331 y no inhabilita a nadie— y confundirlos
// es el error más común: acá la inhabilitación la manda una ley y la comunica el BCU.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA:
//   - Ningún porcentaje «típico» ni «de referencia» del sueldo. No existe en la norma y no hay
//     estadística oficial publicada de cuotas fijadas; poner un número sería inventarlo.
//   - Ninguna consecuencia penal. La figura penal por incumplimiento existe en el debate público,
//     pero no se pudo verificar su artículo vigente contra el texto oficial, así que no se
//     afirma. Ver `CHILD_SUPPORT_NOT_PUBLISHED`.
//
// PURE module (sin Vue/Nuxt, imports relativos) para que la página, el sitemap y los tests en
// Node pelado lean lo mismo.
//
// FUENTES PRIMARIAS, verificadas el 2026-09-05 contra impo.com.uy (lista completa en
// `CHILD_SUPPORT_SOURCES`):
//   - CNA (Ley 17.823) arts. 45, 46, 47, 50, 51, 52 y 53.
//   - Ley 17.957 arts. 2 y 7 — Registro de deudores alimentarios morosos.
//   - Ley 18.244 arts. 1 y 2 — la inhabilitación financiera. (El art. 5 de la Ley 17.957 está
//     DEROGADO por esta ley: citarlo sería citar norma muerta.)
//   - Ley 17.829 art. 1 — prioridad de la retención por pensión alimenticia.

import { URUGUAY } from './calculators'

export interface ChildSupportSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo este archivo contra el texto oficial en impo.com.uy. */
export const CHILD_SUPPORT_VERIFIED_AT = '2026-09-05'

// ---------------------------------------------------------------------------
// El único número que la ley escribe
// ---------------------------------------------------------------------------

/**
 * Prestación alimenticia universal mínima, en BPC por NÚCLEO FAMILIAR, que el tribunal debe fijar
 * cuando no cuenta con información sobre los ingresos del obligado.
 * CNA art. 46 inciso final, en la redacción dada por la Ley 20.212 de 06/11/2023 art. 646.
 *
 * Ojo con leerlo mal: es un PISO para el caso de ingresos desconocidos, no la cuota que
 * corresponde ni un porcentaje. Con ingresos conocidos rige la proporcionalidad del inciso 3.º y
 * la cuota puede ser —y normalmente es— muy superior.
 */
export const UNIVERSAL_FLOOR_BPC = 1

/** El piso del art. 46 convertido a pesos con la BPC vigente. */
export function universalFloorUyu(bpc: number = URUGUAY.bpc): number {
  return Math.round(UNIVERSAL_FLOOR_BPC * bpc)
}

// ---------------------------------------------------------------------------
// Qué es «alimentos» (CNA art. 46, incisos 1.º y 2.º)
// ---------------------------------------------------------------------------

export interface SupportItem {
  readonly key: string
  readonly label: string
  readonly detail: string
}

/**
 * Los conceptos que el art. 46 enumera. Importa listarlos porque «alimentos» se lee como comida
 * y la norma incluye salud, educación, cultura y recreación: una cuota que sólo cubre el
 * supermercado no está cubriendo lo que la ley llama alimentos.
 */
export const SUPPORT_COVERS: readonly SupportItem[] = [
  {
    key: 'sustento',
    label: 'Sustento',
    detail: 'La comida y lo que hace falta para el día a día del beneficiario.',
  },
  {
    key: 'habitacion',
    label: 'Habitación',
    detail: 'El techo: alquiler, gastos comunes y servicios de la vivienda donde vive.',
  },
  { key: 'vestimenta', label: 'Vestimenta', detail: 'Ropa y calzado, incluido el de la escuela.' },
  {
    key: 'salud',
    label: 'Salud',
    detail: 'Mutualista o cobertura, tickets, medicamentos y tratamientos.',
  },
  {
    key: 'educacion',
    label: 'Educación y profesión u oficio',
    detail:
      'La norma nombra por separado la educación y «los gastos necesarios para adquirir una profesión u oficio».',
  },
  {
    key: 'cultura',
    label: 'Cultura y recreación',
    detail:
      'Están escritas en el artículo, con todas las letras. No son un extra que se concede: integran el concepto legal.',
  },
  {
    key: 'embarazo',
    label: 'Embarazo y posparto',
    detail:
      'El inciso 2.º suma «los gastos de atención de la madre durante el embarazo, desde la concepción hasta la etapa del posparto».',
  },
]

// ---------------------------------------------------------------------------
// Quién la debe, y en qué orden (CNA art. 51)
// ---------------------------------------------------------------------------

export interface Obligor {
  /** 0 = obligado principal; 1..4 = el orden subsidiario del art. 51. */
  readonly rank: number
  readonly label: string
  readonly detail: string
}

/**
 * El orden de preferencia. Sólo se baja un escalón cuando el anterior es imposible o insuficiente:
 * los abuelos no deben nada mientras el padre o la madre puedan.
 */
export const OBLIGOR_ORDER: readonly Obligor[] = [
  {
    rank: 0,
    label: 'Los padres o adoptantes',
    detail:
      'Son los obligados principales. Recién si para ellos es imposible o insuficiente se pasa a la lista de abajo.',
  },
  {
    rank: 1,
    label: 'Los ascendientes más próximos',
    detail: 'Con preferencia los del progenitor obligado: primero los abuelos de ese lado.',
  },
  {
    rank: 2,
    label: 'El cónyuge, respecto de los hijos del otro',
    detail: 'Sólo si convive con el beneficiario.',
  },
  {
    rank: 3,
    label: 'El concubino, respecto de los hijos no comunes del otro',
    detail: 'Sólo si conviven todos formando una familia de hecho.',
  },
  {
    rank: 4,
    label: 'Los hermanos',
    detail: 'Con preferencia los de doble vínculo sobre los de vínculo simple.',
  },
]

// ---------------------------------------------------------------------------
// Caracteres de la obligación (CNA arts. 52 y 53)
// ---------------------------------------------------------------------------

export interface SupportTrait {
  readonly key: string
  readonly label: string
  readonly detail: string
  readonly article: string
}

/**
 * Las reglas que sorprenden. La cuarta es la excepción que se olvida: los caracteres del art. 52
 * valen para el derecho a pedir alimentos hacia adelante, y el art. 53 dice lo contrario para las
 * cuotas YA vencidas.
 */
export const SUPPORT_TRAITS: readonly SupportTrait[] = [
  {
    key: 'irrenunciable',
    label: 'No se puede renunciar ni ceder',
    detail:
      'El derecho a pedir alimentos no se transmite por causa de muerte, no se renuncia y no se vende ni se cede. Un acuerdo privado en el que alguien «renuncia a la pensión» no vale.',
    article: 'CNA art. 52 num. 1',
  },
  {
    key: 'inembargable',
    label: 'Lo que cobra el beneficiario no se embarga',
    detail:
      'Las pensiones alimenticias no son embargables: un acreedor del beneficiario no puede ir contra esa cuota.',
    article: 'CNA art. 52 num. 2',
  },
  {
    key: 'imprescriptible',
    label: 'No prescribe',
    detail:
      'El derecho a pedir alimentos es imprescriptible: no se pierde por dejar pasar el tiempo.',
    article: 'CNA art. 52 num. 3',
  },
  {
    key: 'atrasadas',
    label: 'Pero las cuotas atrasadas sí se pueden renunciar',
    detail:
      'Es la excepción expresa: las pensiones alimenticias ya vencidas pueden renunciarse, y el derecho a demandarlas se transmite por causa de muerte.',
    article: 'CNA art. 53',
  },
  {
    key: 'anticipada',
    label: 'Se paga por adelantado y en forma periódica',
    detail:
      'Puede ser en dinero, en especie o de las dos formas. El obligado puede pedir rendición de cuentas de los gastos, y el juez aprecia si le da trámite.',
    article: 'CNA art. 47',
  },
]

// ---------------------------------------------------------------------------
// Si no la pagan: las tres palancas de dinero
// ---------------------------------------------------------------------------

export interface NonPaymentLever {
  readonly key: string
  readonly label: string
  readonly norm: string
  readonly detail: string
  /** Ruta interna del sitio que desarrolla esta palanca, si existe. */
  readonly to?: string
}

export const NON_PAYMENT_LEVERS: readonly NonPaymentLever[] = [
  {
    key: 'prioridad',
    label: 'La retención sobre el sueldo va primero que todo lo demás',
    norm: 'Ley 17.829, art. 1',
    detail:
      'En el orden de prelación de las retenciones sobre sueldos y pasividades, tienen prioridad las dispuestas por juez competente destinadas a servir pensiones alimenticias. Van antes que la garantía de alquiler, la cuota social, el préstamo y cualquier otra.',
    to: '/embargo-de-sueldo-uruguay',
  },
  {
    key: 'embargo',
    label: 'El embargo llega más lejos que en cualquier otra deuda',
    norm: 'CGP (Ley 15.982), art. 381 num. 1',
    detail:
      'El sueldo es, por regla, inembargable, y un acreedor común no lo toca aunque tenga sentencia. La pensión alimenticia es una de las dos excepciones tasadas, y cuando es de menores o incapaces servida por sus ascendientes el tope sube a la mitad.',
    to: '/embargo-de-sueldo-uruguay',
  },
  {
    key: 'registro',
    label: 'El registro de morosos le cierra el banco',
    norm: 'Ley 17.957 y Ley 18.244',
    detail:
      'Inscripto en el Registro Nacional de Actos Personales, Sección Interdicciones, las instituciones de intermediación financiera no pueden otorgarle ni renovarle créditos, abrirle cuentas bancarias ni emitirle o renovarle tarjetas de crédito.',
  },
]

// ---------------------------------------------------------------------------
// El registro de deudores alimentarios morosos
// ---------------------------------------------------------------------------

export interface RegistryRule {
  readonly key: string
  readonly label: string
  readonly detail: string
  readonly article: string
}

/** Cuántas cuotas hay que adeudar para que proceda la inscripción (Ley 17.957 art. 2 num. 2). */
export const REGISTRY_OVERDUE_INSTALMENTS = 3

/** Duración de la inscripción, en años, con baja de oficio al vencer (Ley 17.957 art. 7). */
export const REGISTRY_YEARS = 5

export const REGISTRY_RULES: readonly RegistryRule[] = [
  {
    key: 'cuando',
    label: `Cuándo procede: más de ${REGISTRY_OVERDUE_INSTALMENTS} cuotas adeudadas`,
    detail:
      'Adeudar más de tres cuotas alimenticias, total o parcialmente, sobre una pensión fijada por sentencia ejecutoriada o por acuerdo homologado, con beneficiarios menores de edad o incapaces.',
    article: 'Ley 17.957 art. 2, en la redacción dada por la Ley 20.212',
  },
  {
    key: 'intimacion',
    label: 'Nunca de sorpresa: primero hay intimación judicial',
    detail:
      'La inscripción exige intimación judicial previa, y no procede si el obligado acredita carecer transitoriamente de recursos para pagar. Tampoco procede mientras esté pendiente de resolución definitiva una acción de reducción o exoneración.',
    article: 'Ley 17.957 art. 2',
  },
  {
    key: 'consecuencia',
    label: 'La consecuencia es financiera',
    detail:
      'El Registro comunica al Banco Central del Uruguay y a la Auditoría Interna de la Nación dentro de los treinta días corridos, y esas instituciones avisan a las que regulan. Recibida la comunicación, no pueden otorgar ni renovar créditos, abrir cuentas bancarias ni emitir o renovar tarjetas de crédito a favor del inscripto.',
    article: 'Ley 18.244 arts. 1 y 2',
  },
  {
    key: 'duracion',
    label: `Dura ${REGISTRY_YEARS} años, o hasta que se pague`,
    detail:
      'La inscripción tiene una duración de cinco años y al vencer se da de baja de oficio. Acreditado el pago de la deuda, la cancelación es inmediata.',
    article: 'Ley 17.957 art. 7',
  },
]

// ---------------------------------------------------------------------------
// Lo que esta página se niega a publicar
// ---------------------------------------------------------------------------

export interface WithheldClaim {
  readonly key: string
  readonly claim: string
  readonly why: string
}

/**
 * La lista es contenido, no una nota al pie: el visitante llega buscando exactamente el primer
 * ítem, y decirle que no existe es el dato.
 */
export const CHILD_SUPPORT_NOT_PUBLISHED: readonly WithheldClaim[] = [
  {
    key: 'porcentaje',
    claim: 'Un porcentaje del sueldo («el 30 %», «un tercio», «20 % por hijo»).',
    why: 'Ninguna norma uruguaya lo fija. El art. 46 manda proporcionalidad entre posibilidades del obligado y necesidades del beneficiario, y eso se resuelve caso por caso.',
  },
  {
    key: 'montoTipico',
    claim: 'Un monto «promedio» o «de referencia» en pesos.',
    why: 'No hay estadística oficial publicada de cuotas fijadas. Un número redondo acá sería inventado, y funcionaría como ancla en una negociación real.',
  },
  {
    key: 'penal',
    claim: 'La pena de cárcel por no pagar.',
    why: 'La figura se menciona todo el tiempo, pero no pudimos verificar su artículo vigente contra el texto oficial. Antes que citar mal una norma penal, no se afirma nada.',
  },
]

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface ChildSupportFaq {
  readonly question: string
  readonly answer: string
}

export const CHILD_SUPPORT_FAQ: readonly ChildSupportFaq[] = [
  {
    question: '¿Qué porcentaje del sueldo es la pensión alimenticia en Uruguay?',
    answer:
      'Ninguno fijo. El artículo 46 del Código de la Niñez y la Adolescencia manda que la prestación sea proporcional a las posibilidades económicas del obligado y a las necesidades del beneficiario, y el juez la fija en cada caso. El porcentaje que circula no está en la ley.',
  },
  {
    question: '¿Hay un mínimo legal?',
    answer: `Sí, pero sólo para un caso: cuando el tribunal no cuenta con información sobre los ingresos del obligado, debe fijar igual una prestación alimenticia universal de ${UNIVERSAL_FLOOR_BPC} BPC por núcleo familiar como mínimo (CNA art. 46 in fine, redacción de la Ley 20.212 de 2023). Es un piso para decidir a ciegas, no la cuota que corresponde.`,
  },
  {
    question: '¿Hasta qué edad se paga?',
    answer:
      'Son acreedores los niños y adolescentes, y también los mayores de dieciocho y menores de veintiún años que no dispongan de medios de vida propios y suficientes para su congrua y decente sustentación (CNA art. 50).',
  },
  {
    question: '¿Los abuelos tienen que pagar?',
    answer:
      'Sólo si para los padres o adoptantes es imposible o insuficiente. Ahí el artículo 51 llama a los ascendientes más próximos, con preferencia los del progenitor obligado. Si hay varios obligados del mismo grado, la obligación se divide en proporción a la capacidad económica de cada uno.',
  },
  {
    question: '¿Se puede renunciar a la pensión en un acuerdo entre las partes?',
    answer:
      'El derecho a pedir alimentos no puede renunciarse ni cederse (CNA art. 52). La excepción es puntual: las cuotas ya atrasadas sí pueden renunciarse, y el derecho a demandarlas se transmite por causa de muerte (CNA art. 53).',
  },
  {
    question: '¿Qué pasa si el obligado no paga?',
    answer: `La retención judicial por pensión alimenticia tiene prioridad sobre cualquier otra retención del sueldo (Ley 17.829 art. 1), el embargo puede llegar a la mitad cuando es de menores servida por sus ascendientes (CGP art. 381) y, adeudando más de ${REGISTRY_OVERDUE_INSTALMENTS} cuotas con intimación judicial previa, procede la inscripción en el registro de deudores alimentarios morosos: durante ${REGISTRY_YEARS} años ningún banco puede darle crédito, abrirle cuenta ni emitirle tarjeta (Leyes 17.957 y 18.244).`,
  },
  {
    question: '¿El registro de deudores alimentarios morosos es el Clearing?',
    answer:
      'No. El Clearing de Informes es una base privada regida por la Ley 18.331 que informa antecedentes pero no inhabilita a nadie. El registro de deudores alimentarios morosos es la Sección Interdicciones del Registro Nacional de Actos Personales, y la prohibición de dar crédito, abrir cuentas y emitir tarjetas la manda el artículo 2 de la Ley 18.244.',
  },
]

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

export const CHILD_SUPPORT_SOURCES: readonly ChildSupportSource[] = [
  {
    label:
      'Código de la Niñez y la Adolescencia (Ley 17.823), art. 46 — concepto de alimentos, proporcionalidad y el piso de 1 BPC',
    url: 'https://www.impo.com.uy/bases/codigo-ninez-adolescencia/17823-2004/46',
  },
  {
    label: 'CNA art. 47 — forma de la prestación: periódica, anticipada y con rendición de cuentas',
    url: 'https://www.impo.com.uy/bases/codigo-ninez-adolescencia/17823-2004/47',
  },
  {
    label: 'CNA art. 50 — beneficiarios: niños, adolescentes y mayores de 18 y menores de 21',
    url: 'https://www.impo.com.uy/bases/codigo-ninez-adolescencia/17823-2004/50',
  },
  {
    label: 'CNA art. 51 — sujetos obligados y orden de preferencia',
    url: 'https://www.impo.com.uy/bases/codigo-ninez-adolescencia/17823-2004/51',
  },
  {
    label: 'CNA art. 52 — irrenunciable, inembargable e imprescriptible',
    url: 'https://www.impo.com.uy/bases/codigo-ninez-adolescencia/17823-2004/52',
  },
  {
    label: 'CNA art. 53 — las pensiones atrasadas sí pueden renunciarse',
    url: 'https://www.impo.com.uy/bases/codigo-ninez-adolescencia/17823-2004/53',
  },
  {
    label:
      'Ley 17.957 — registro de deudores alimentarios morosos: art. 2 (más de tres cuotas) y art. 7 (cinco años)',
    url: 'https://www.impo.com.uy/bases/leyes/17957-2006',
  },
  {
    label:
      'Ley 18.244, arts. 1 y 2 — comunicación al BCU y prohibición de crédito, cuentas y tarjetas',
    url: 'https://www.impo.com.uy/bases/leyes/18244-2007',
  },
  {
    label:
      'Ley 17.829, art. 1 — la retención por pensión alimenticia tiene prioridad sobre las demás',
    url: 'https://www.impo.com.uy/bases/leyes/17829-2004',
  },
  {
    label: 'Código General del Proceso (Ley 15.982), art. 381 — topes del embargo sobre el sueldo',
    url: 'https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988/381',
  },
]
