// app/utils/salaryGarnishment.ts
// Datos y aritmética de /embargo-de-sueldo-uruguay: qué le pueden descontar a un sueldo o a una
// pasividad en Uruguay, por orden judicial o por retención de haberes.
//
// POR QUÉ EXISTE: el sitio ya tiene la familia de deuda entera —`/salir-del-clearing`,
// `/saldar-deudas-uruguay`, `/prescripcion-de-deudas-con-el-estado-uruguay`,
// `/comprar-auto-con-deuda-uruguay`— y ninguna de esas páginas contesta la pregunta que aparece
// primero cuando a alguien lo intiman: «¿me pueden embargar el sueldo?». La respuesta que circula
// («te dejan lo mínimo», «te pueden sacar la mitad») es falsa en las dos direcciones.
//
// LO QUE ESTA PÁGINA CONTESTA Y NADIE MÁS: el sueldo es, por regla, INEMBARGABLE. El numeral 1 del
// artículo 381 del Código General del Proceso lo dice en la primera línea, y recién después abre
// dos excepciones tasadas. Un acreedor común —una tarjeta, una financiera, un comercio— no entra
// en ninguna de las dos: no puede embargar el sueldo aunque tenga sentencia. Lo que sí puede
// existir es una RETENCIÓN DE HABERES, que es otra cosa: nace de un contrato que la persona firmó,
// necesita consentimiento expreso y tiene su propio tope.
//
// LAS DOS REGLAS QUE SE CONFUNDEN TODO EL TIEMPO:
//   1. El TOPE del embargo judicial: un tercio, o la mitad si es pensión alimenticia de menores o
//      incapaces servida por sus ascendientes (CGP art. 381 num. 1 lit. a y b).
//   2. El PISO de lo que tenés que cobrar igual: 35 % del nominal una vez deducidos los impuestos a
//      las rentas, sus anticipos y las contribuciones especiales de seguridad social (Ley 17.829
//      art. 3). Ese piso baja a 30 % cuando hay retenciones por garantía de alquiler o por actos
//      cooperativos. El piso rige aunque concurran varias retenciones a la vez: es el que impide
//      que la suma de todas te deje sin nada.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: ninguna cifra en pesos. El piso de la Ley 17.829 es un
// porcentaje del líquido de cada persona, no un monto; y el artículo 381 del CGP dice «hasta la
// tercera parte» sin definir sobre qué base exacta se calcula, cosa que fija el juez en cada
// expediente. Poner un número redondo acá sería inventarlo.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-23 (ver SALARY_SOURCES para la lista completa):
//   - CGP (Ley 15.982) art. 381 — bienes inembargables. Redacción vigente dada por la Ley 20.212
//     de 06/11/2023 art. 647. https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988/381
//   - Ley 17.829 arts. 1 a 5 — régimen de retenciones sobre salarios y pasividades. VIGENTE, con
//     el literal H) agregado por la Ley 20.446 de 16/12/2025 art. 182.
//     https://www.impo.com.uy/bases/leyes/17829-2004

export interface SalarySource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra el texto oficial en impo.com.uy. */
export const SALARY_VERIFIED_AT = '2026-08-23'

// ---------------------------------------------------------------------------
// El piso: Ley 17.829, artículo 3
// ---------------------------------------------------------------------------

/**
 * Porcentaje del líquido que la persona tiene que percibir SIEMPRE, por debajo del cual ninguna
 * suma de retenciones puede llevarla. Ley 17.829 art. 3, inciso 1.º.
 */
export const RETENTION_FLOOR_PCT = 35

/**
 * El mismo piso, rebajado, cuando entran a jugar las retenciones por servicio de garantía de
 * alquileres (art. 1 lit. A) o por actos cooperativos (art. 1 lit. G). Ley 17.829 art. 3, inciso
 * 2.º, en la redacción dada por la Ley 19.670 art. 353.
 */
export const RETENTION_FLOOR_PCT_HOUSING = 30

// ---------------------------------------------------------------------------
// El tope: CGP artículo 381, numeral 1
// ---------------------------------------------------------------------------

export type GarnishmentKind = 'tributos' | 'alimentos' | 'alimentosMenores' | 'leyHabilitante'

export interface GarnishmentCap {
  readonly kind: GarnishmentKind
  /** Etiqueta corta para la tabla. */
  readonly label: string
  /** Fracción máxima embargable, expresada como número entre 0 y 1. */
  readonly fraction: number
  /** Cómo se lee la fracción en el texto de la norma. */
  readonly asText: string
  /** El literal del numeral 1 del artículo 381 que la habilita. */
  readonly article: string
  readonly detail: string
}

/**
 * Las ÚNICAS puertas por las que un sueldo o una pasividad se pueden embargar. Todo lo que no está
 * en esta lista cae bajo la regla general del numeral 1: inembargable.
 */
export const GARNISHMENT_CAPS: readonly GarnishmentCap[] = [
  {
    kind: 'alimentosMenores',
    label: 'Pensión alimenticia de menores o incapaces',
    fraction: 1 / 2,
    asText: 'hasta la mitad',
    article: 'CGP art. 381 num. 1 lit. a',
    detail:
      'Cuando la pensión es a favor de menores o incapaces y la sirve un ascendiente, el tope sube a la mitad. Es la única hipótesis en la que la ley admite llegar tan arriba.',
  },
  {
    kind: 'alimentos',
    label: 'Pensión alimenticia decretada judicialmente',
    fraction: 1 / 3,
    asText: 'hasta la tercera parte',
    article: 'CGP art. 381 num. 1 lit. a',
    detail:
      'Las pensiones alimenticias decretadas por un juez son la primera excepción a la inembargabilidad, y además encabezan el orden de prelación del artículo 1 de la Ley 17.829: cobran antes que cualquier retención contractual.',
  },
  {
    kind: 'tributos',
    label: 'Deudas por tributos',
    fraction: 1 / 3,
    asText: 'hasta la tercera parte',
    article: 'CGP art. 381 num. 1 lit. a',
    detail:
      'Una deuda tributaria —DGI, BPS, un tributo departamental— puede afectar el sueldo hasta un tercio. No alcanza con que el acreedor sea un organismo público: tiene que tratarse de un tributo.',
  },
  {
    kind: 'leyHabilitante',
    label: 'Embargo o retención habilitado por una ley, con orden judicial',
    fraction: 1 / 3,
    asText: 'hasta la tercera parte',
    article: 'CGP art. 381 num. 1 lit. b',
    detail:
      'Cuando una ley especial habilita el embargo o la afectación por retención y media orden judicial, el límite vuelve a ser la tercera parte. Si hay más de un embargo o afectación al mismo tiempo, el propio literal manda aplicar el régimen de la Ley 17.829.',
  },
]

// ---------------------------------------------------------------------------
// El orden de prelación: Ley 17.829, artículo 1
// ---------------------------------------------------------------------------

export interface RetentionRank {
  /** Posición en la fila. 0 es la pensión alimenticia judicial, que va antes que los literales. */
  readonly position: number
  /** El literal del artículo 1, o null para la pensión alimenticia del encabezado. */
  readonly letter: string | null
  readonly label: string
}

/**
 * Quién cobra primero cuando el sueldo no alcanza para todas las retenciones comunicadas. El orden
 * es el del artículo 1 de la Ley 17.829 y no es negociable entre acreedores: dentro de un mismo
 * nivel, prevalece la operación que se comunicó antes al agente de retención.
 */
export const RETENTION_ORDER: readonly RetentionRank[] = [
  { position: 1, letter: null, label: 'Pensiones alimenticias dispuestas por Juez competente' },
  {
    position: 2,
    letter: 'A',
    label: 'Servicio de garantía de alquileres (CGN, aseguradoras u otra entidad habilitada)',
  },
  {
    position: 3,
    letter: 'B',
    label: 'Cuota sindical y contribución para el financiamiento de los partidos políticos',
  },
  { position: 4, letter: 'C', label: 'Créditos de la División Crédito Social del BROU' },
  { position: 5, letter: 'D', label: 'Créditos del BHU, la ANV y MEVIR' },
  {
    position: 6,
    letter: 'E',
    label: 'Seguros de vida colectivos (BSE u otras aseguradoras autorizadas por el BCU)',
  },
  {
    position: 7,
    letter: 'F',
    label: 'Cuotas de mutualista o de otra institución de asistencia médica de prepago',
  },
  {
    position: 8,
    letter: 'G',
    label: 'Créditos de nómina y actos cooperativos en cooperativas de consumo',
  },
  {
    position: 9,
    letter: 'H',
    label: 'Facilidades de pago del Código Tributario (arts. 32 y 33 del Decreto-Ley 14.306)',
  },
]

// ---------------------------------------------------------------------------
// Otros bienes inembargables del artículo 381
// ---------------------------------------------------------------------------

export interface ExemptAsset {
  readonly numeral: number
  readonly label: string
  readonly caveat: string
}

/**
 * Lo que tampoco se embarga, con la salvedad que la propia norma le pone a cada uno. Está acá
 * porque la pregunta «me van a sacar las cosas de casa» viene pegada a la del sueldo.
 */
export const EXEMPT_ASSETS: readonly ExemptAsset[] = [
  {
    numeral: 2,
    label: 'La ropa de uso personal y los muebles y útiles de la casa habitación',
    caveat:
      'Salvo que la deuda venga de haber comprado esos mismos muebles, o que sean más de dos mensualidades de pensión alimenticia de los hijos omitidas intencionalmente. Los bienes suntuarios quedan fuera de la protección.',
  },
  {
    numeral: 3,
    label: 'Los libros de la actividad laboral del deudor',
    caveat: 'Misma salvedad de las dos mensualidades de pensión alimenticia de los hijos.',
  },
  {
    numeral: 4,
    label: 'Las máquinas e instrumentos del oficio, la profesión o la enseñanza',
    caveat:
      'Salvo que estén prendados para garantizar el precio de su compra, o la salvedad de la pensión alimenticia.',
  },
  {
    numeral: 5,
    label: 'Los alimentos y combustibles que haya en la casa',
    caveat: 'Hasta lo necesario para el consumo de la familia durante tres meses.',
  },
]

// ---------------------------------------------------------------------------
// Aritmética
// ---------------------------------------------------------------------------

export interface RetentionInput {
  /** Retribución nominal del mes. */
  readonly nominal: number
  /** Impuestos a las rentas del mes y sus anticipos (IRPF, IASS). */
  readonly incomeTax: number
  /** Contribuciones especiales de seguridad social (BPS, FONASA, FRL). */
  readonly socialSecurity: number
}

/**
 * La base del artículo 3: el nominal menos los impuestos a las rentas (y sus anticipos) y las
 * contribuciones especiales de seguridad social. NO es el líquido de bolsillo: los descuentos
 * voluntarios que ya venías teniendo no se restan antes, porque son justamente las retenciones que
 * el artículo viene a limitar.
 */
export function retentionBase({ nominal, incomeTax, socialSecurity }: RetentionInput): number {
  const safe = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0)
  return Math.max(0, safe(nominal) - safe(incomeTax) - safe(socialSecurity))
}

/**
 * Lo mínimo que la persona tiene que percibir en dinero, por debajo de lo cual la suma de todas las
 * retenciones no puede bajar. `housing` marca si entre ellas hay garantía de alquileres (literal A)
 * o actos cooperativos (literal G), que es lo que rebaja el piso del 35 % al 30 %.
 */
export function retentionFloor(base: number, housing = false): number {
  const pct = housing ? RETENTION_FLOOR_PCT_HOUSING : RETENTION_FLOOR_PCT
  return Math.max(0, base) * (pct / 100)
}

/** El espacio que queda para retener: la base menos el piso. */
export function maxRetention(base: number, housing = false): number {
  return Math.max(0, Math.max(0, base) - retentionFloor(base, housing))
}

/**
 * El tope del embargo judicial para un tipo de deuda, aplicado sobre la misma base.
 *
 * La fracción («la tercera parte», «la mitad») es la del artículo 381; sobre qué base exacta se
 * liquida lo resuelve el juez del expediente, así que esto es una referencia, no una liquidación.
 */
export function garnishmentCap(base: number, kind: GarnishmentKind): number {
  const cap = GARNISHMENT_CAPS.find(entry => entry.kind === kind)
  return cap ? Math.max(0, base) * cap.fraction : 0
}

/**
 * Lo que efectivamente se puede descontar: el menor entre el tope del embargo y el espacio que deja
 * el piso de la Ley 17.829. Los dos límites conviven —uno mira la deuda, el otro mira a la persona—
 * y el que manda es el que primero se toca.
 */
export function bindingLimit(
  base: number,
  kind: GarnishmentKind,
  housing = false
): { amount: number; binding: 'tope' | 'piso' } {
  const cap = garnishmentCap(base, kind)
  const room = maxRetention(base, housing)
  return cap <= room ? { amount: cap, binding: 'tope' } : { amount: room, binding: 'piso' }
}

// ---------------------------------------------------------------------------
// Preguntas y fuentes
// ---------------------------------------------------------------------------

export interface SalaryFaq {
  readonly question: string
  readonly short: string
  readonly answer: string
}

export const SALARY_FAQ: readonly SalaryFaq[] = [
  {
    question: '¿Me pueden embargar el sueldo por una deuda con una tarjeta o una financiera?',
    short: 'No: el sueldo es inembargable y esa deuda no es ninguna de las excepciones',
    answer:
      'El numeral 1 del artículo 381 del Código General del Proceso declara inembargables las remuneraciones de empleados públicos y privados, y también las pensiones, jubilaciones y retiros. Las únicas excepciones son las deudas por tributos, las pensiones alimenticias decretadas judicialmente y los casos en que una ley especial habilite el embargo por orden judicial. Una deuda de consumo no entra en ninguna: el acreedor puede demandarte y obtener sentencia, pero el sueldo no es el bien del que va a cobrar.',
  },
  {
    question: 'Entonces, ¿por qué me descuentan una cuota del sueldo todos los meses?',
    short: 'Eso no es un embargo, es una retención de haberes que firmaste',
    answer:
      'Retención y embargo son cosas distintas. La retención de haberes nace de un contrato: el artículo 5 de la Ley 17.829 exige el consentimiento expreso del titular del sueldo, y el artículo 4 prohíbe a cualquier empresa retener sin autorización legal. Las únicas que no necesitan tu consentimiento son las que dispone un juez. Si te aparece un descuento que nunca autorizaste, ese descuento no tiene base legal.',
  },
  {
    question: '¿Cuánto es lo máximo que me pueden sacar?',
    short: 'Un tercio, o la mitad si es pensión alimenticia de menores',
    answer:
      'El artículo 381 del CGP permite embargar hasta la tercera parte por deudas de tributos, por pensiones alimenticias decretadas judicialmente y por los embargos que habilite una ley especial. Sube a la mitad solo en un caso: pensiones alimenticias a favor de menores o incapaces servidas por sus ascendientes. Por encima de esos topes juega además el piso del artículo 3 de la Ley 17.829, que es el que limita la suma de todo junto.',
  },
  {
    question: '¿Cuánto tengo que cobrar sí o sí?',
    short: `El ${RETENTION_FLOOR_PCT} % de tu nominal después de impuestos y aportes`,
    answer: `El artículo 3 de la Ley 17.829 dice que ninguna persona física puede percibir por su salario o pasividad menos del ${RETENTION_FLOOR_PCT} % del monto nominal, una vez deducidos los impuestos a las rentas con sus anticipos y las contribuciones especiales de seguridad social. Ese porcentaje baja al ${RETENTION_FLOOR_PCT_HOUSING} % cuando entre las retenciones hay servicio de garantía de alquileres o actos cooperativos. Es un piso sobre el total de las retenciones, no sobre cada una: por eso importa cuando se acumulan.`,
  },
  {
    question: 'Tengo varios descuentos y no me alcanza. ¿Cuál se cae primero?',
    short: 'El orden lo fija la ley, no vos ni el acreedor',
    answer:
      'El artículo 1 de la Ley 17.829 ordena la fila. Primero las pensiones alimenticias dispuestas por juez, y después, por su orden: garantía de alquileres, cuota sindical, Crédito Social del BROU, BHU/ANV/MEVIR, seguros de vida colectivos, cuotas de asistencia médica, créditos de nómina y actos cooperativos, y facilidades de pago del Código Tributario. Cuando dos operaciones están en el mismo nivel, prevalece la que se comunicó antes a la empresa que actúa como agente de retención.',
  },
  {
    question: '¿Y las jubilaciones y pensiones?',
    short: 'Están en la misma línea del artículo, con las mismas excepciones',
    answer:
      'El numeral 1 del artículo 381 nombra expresamente las pensiones, jubilaciones y retiros junto a las remuneraciones, y también las pensiones alimenticias salvo que sean suntuarias. Las excepciones y los topes son los mismos, y la Ley 17.829 habla en todo su texto de «retribuciones salariales y pasividades».',
  },
  {
    question: '¿Me pueden sacar las cosas de casa?',
    short: 'La casa habitación y las herramientas del oficio también están protegidas',
    answer:
      'El mismo artículo 381 declara inembargables la ropa de uso personal, los muebles y útiles de la casa habitación, los libros de la actividad laboral, las máquinas e instrumentos del oficio o la profesión, y los alimentos y combustibles necesarios para tres meses. Cada uno tiene su salvedad: los muebles se pueden embargar si la deuda viene de haberlos comprado, los bienes suntuarios quedan siempre fuera de la protección, y varias protecciones ceden ante dos o más mensualidades de pensión alimenticia de los hijos omitidas intencionalmente.',
  },
  {
    question: '¿La tasa de un crédito con retención de haberes tiene límite?',
    short: 'Sí, la de la Ley 18.212 de usura',
    answer:
      'El artículo 2 de la Ley 17.829 solo habilita a usar el derecho de retención en operaciones cuya tasa de interés implícita quede dentro de los límites de la Ley 18.212. El Banco Central publica esos topes y los actualiza; el sitio los sigue en la página de adelanto de efectivo con tarjeta.',
  },
]

export const SALARY_SOURCES: readonly SalarySource[] = [
  {
    label:
      'Código General del Proceso (Ley 15.982), art. 381 — bienes inembargables: el sueldo, la tercera parte y la mitad',
    url: 'https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988/381',
  },
  {
    label:
      'Ley 17.829 — régimen de retenciones sobre salarios y pasividades: orden de prelación (art. 1), tasa (art. 2), piso del 35 % (art. 3), prohibición de retener sin ley (art. 4) y consentimiento expreso (art. 5)',
    url: 'https://www.impo.com.uy/bases/leyes/17829-2004',
  },
  {
    label: 'Ley 20.212, art. 647 — la redacción vigente del art. 381 del CGP',
    url: 'https://www.impo.com.uy/bases/leyes/20212-2023/647',
  },
  {
    label: 'Ley 19.670, art. 353 — la redacción vigente del art. 3 de la Ley 17.829',
    url: 'https://www.impo.com.uy/bases/leyes/19670-2018/353',
  },
  {
    label: 'Ley 18.212 — intereses y usura: el techo de tasa que el art. 2 de la Ley 17.829 exige',
    url: 'https://www.impo.com.uy/bases/leyes/18212-2007',
  },
]
