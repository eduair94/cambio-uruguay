// Lo que sale registrar una marca en Uruguay, con las tasas de la DNPI y los plazos de la ley.
//
// POR QUÉ NO HAY UN PRECIO. La pregunta que trae a alguien acá es «cuánto sale registrar una
// marca», y la respuesta honesta es que no existe un número: la tasa se cobra POR CLASE de la
// Clasificación de Niza y además cambia según la marca sea denominativa (sólo el nombre) o
// emblemática/mixta (con logo). Las dos cosas multiplican, así que el mismo trámite va de una tasa
// a seis sin que nada «suba»: lo que cambia es cuántas clases se reivindican. Por eso este módulo
// no publica un importe y publica la tasa unitaria con su unidad.
//
// POR QUÉ LAS CIFRAS VIVEN EN UI Y NO EN PESOS. El artículo 99 de la Ley 17.011 —en la redacción
// que le dio el artículo 392 de la Ley 18.719— fija las tasas en Unidades Indexadas, y la DNPI
// publica mes a mes la misma tabla convertida a pesos con el valor de la UI del primer día del mes.
// O sea que el número en UI es la cifra legal y no envejece, y el número en pesos es una conversión
// fechada. Acá se guarda la cifra en UI tal como la imprime la tabla oficial, y los pesos se
// calculan con `TRADEMARK_UI_VALUE`, que es el valor que esa misma tabla declara en su encabezado.
// `tests/unit/trademarkRegistry.test.ts` comprueba que esa multiplicación reproduce, peso por peso,
// las dieciséis filas de la tabla de noviembre de 2026: si alguien actualiza la UI y la tabla
// oficial redondea distinto, el test lo dice en vez de dejar pasar una cifra inventada.
//
// LO QUE NO ESTÁ ACÁ, A PROPÓSITO. El honorario de un agente de la propiedad industrial o de un
// abogado no es una tasa, no lo publica ningún organismo y no se estima: la página dice que existe
// y no le pone precio. Tampoco se decide qué clase de Niza corresponde a un negocio, que es la
// única parte del trámite donde una equivocación cuesta el registro entero.
//
// PURO (sin Vue ni Nuxt) para que vitest lo cargue directo, como el resto de `utils/`.

/** La ruta de la página, en un solo lugar para que la canónica y los enlaces no se despeguen. */
export const TRADEMARK_PATH = '/registrar-una-marca-uruguay'

/** El día en que se abrieron, una por una, las fuentes de `TRADEMARK_SOURCES`. */
export const TRADEMARK_VERIFIED_AT = '2026-11-11'

/**
 * El valor de la UI con el que la DNPI convirtió su tabla de noviembre de 2026.
 *
 * NO es el valor de la UI de hoy ni el que publica el INE para hoy: es el que la propia tabla
 * declara en su encabezado («VALOR AL 01/11/2026 6,685»), porque la tasa en pesos que cobra la
 * ventanilla ese mes sale de ese número. Mezclar la UI de hoy con las cifras en UI daría un peso
 * que la DNPI no cobra.
 */
export const TRADEMARK_UI_VALUE = 6.685

/** El día de la UI de arriba, tal como lo fecha el encabezado de la tabla. */
export const TRADEMARK_UI_VALUE_AT = '2026-11-01'

/** Qué clase de marca es, que es la mitad de lo que decide la tasa. */
export type TrademarkKind = 'denominativa' | 'mixta'

export interface TrademarkFee {
  /** Clave estable, para los tests y para el `v-for`. */
  readonly id: string
  /** Lo que la fila nombra en la tabla oficial. */
  readonly label: string
  /** La cifra en UI, copiada tal como la imprime la tabla. */
  readonly ui: number
  /** Qué conviene saber de esa fila, cuando la tabla sola no alcanza. */
  readonly note?: string
}

/**
 * Las filas de marcas de la tabla del artículo 99, en el orden en que le sirven a quien registra.
 *
 * La tabla oficial trae además las marcas colectivas, las de certificación o garantía, las
 * denominaciones de origen y toda la actuación en patentes (artículo 117 de la Ley 17.164). No
 * están acá porque son otro trámite y otra página: lo que esta lista responde es el registro de una
 * marca común.
 */
export const TRADEMARK_FEES: readonly TrademarkFee[] = Object.freeze([
  {
    id: 'solicitud-denominativa',
    label: 'Solicitud de registro, marca denominativa, 1 clase',
    ui: 1121.03558,
    note: 'Sólo el nombre, sin logo ni diseño.',
  },
  {
    id: 'solicitud-denominativa-extra',
    label: 'Marca denominativa, por cada clase adicional',
    ui: 672.62135,
    note: 'El 60 % de la primera clase, exacto.',
  },
  {
    id: 'solicitud-mixta',
    label: 'Solicitud de registro, marca emblemática o mixta, 1 clase',
    ui: 1569.44982,
    note: 'Con logo o diseño: 40 % más que la denominativa, exacto.',
  },
  {
    id: 'solicitud-mixta-extra',
    label: 'Marca emblemática o mixta, por cada clase adicional',
    ui: 896.828466,
  },
  {
    id: 'titulo',
    label: 'Título del registro concedido',
    ui: 448.414233,
    note: 'Tiene su propia tasa: no viene incluido en la de la solicitud.',
  },
  {
    id: 'renovacion-denominativa',
    label: 'Renovación, marca denominativa, 1 clase',
    ui: 1121.03558,
    note: 'La misma tasa que la solicitud.',
  },
  {
    id: 'renovacion-mixta',
    label: 'Renovación, marca emblemática o mixta, 1 clase',
    ui: 1569.44982,
  },
  {
    id: 'renovacion-gracia',
    label: 'Renovación en el plazo de gracia, 1 clase',
    ui: 3363.10675,
    note: 'El triple de la renovación en plazo, exacto.',
  },
  {
    id: 'oposicion',
    label: 'Oposición al registro de otra marca, 1 clase',
    ui: 1569.44982,
  },
  {
    id: 'transferencia',
    label: 'Transferencia de la marca, por 1 clase',
    ui: 1121.03558,
  },
  {
    id: 'cambio-nombre',
    label: 'Cambio de nombre del titular',
    ui: 448.414233,
  },
  {
    id: 'cambio-domicilio',
    label: 'Cambio de domicilio del titular',
    ui: 448.414233,
  },
  {
    id: 'cancelacion',
    label: 'Acción de cancelación de una marca',
    ui: 1345.24,
    note: 'Numeral agregado por el artículo 189 de la Ley 19.149.',
  },
  {
    id: 'anulacion',
    label: 'Acción de anulación de una marca',
    ui: 1345.2427,
  },
  {
    id: 'certificado',
    label: 'Certificado por marca',
    ui: 560.517792,
  },
  {
    id: 'matricula-agente',
    label: 'Matrícula de agente de la propiedad industrial',
    ui: 11210.3558,
    note: 'La paga quien se matricula para representar a otros, no quien registra su marca.',
  },
])

const byId = new Map(TRADEMARK_FEES.map(fee => [fee.id, fee]))

/** La fila de la tabla con ese `id`, o `undefined` si no existe. */
export const trademarkFee = (id: string): TrademarkFee | undefined => byId.get(id)

/** La cifra en UI de esa fila, o 0 si el `id` no existe. */
export const trademarkFeeUi = (id: string): number => byId.get(id)?.ui ?? 0

/**
 * Una cifra en UI pasada a pesos, con el mismo redondeo a dos decimales que imprime la tabla.
 *
 * El redondeo no es cosmético: es lo que hace que esta cuenta reproduzca la tabla oficial, y el test
 * lo verifica fila por fila.
 */
export const uiToUyu = (ui: number): number => Math.round(ui * TRADEMARK_UI_VALUE * 100) / 100

/** La tasa en pesos de esa fila. */
export const trademarkFeeUyu = (id: string): number => uiToUyu(trademarkFeeUi(id))

/** Los plazos que fija la Ley 17.011, en un solo lugar. */
export const TRADEMARK_TERM_YEARS = 10
export const TRADEMARK_RENEWAL_WINDOW_MONTHS = 6
export const TRADEMARK_GRACE_MONTHS = 6
export const TRADEMARK_OPPOSITION_DAYS = 30
export const TRADEMARK_NON_USE_YEARS = 5

/**
 * El descuento que la página del trámite declara para las Pymes con certificado Pyme vigente.
 *
 * La fuente dice «80 % de descuento en las tasas de REGISTRO» y no nombra ninguna otra fila, así que
 * acá se aplica sólo a la solicitud. El título y los trámites posteriores se cobran enteros hasta
 * que una fuente diga lo contrario: estirar un descuento más allá de lo que su fuente dice es
 * inventar una cifra con forma de cita.
 */
export const PYME_DISCOUNT = 0.8

export interface TrademarkQuoteInput {
  readonly kind: TrademarkKind
  /** Clases de Niza que se reivindican. Menos de 1 se trata como 1: no hay marca sin clase. */
  readonly classes: number
  /** Si se suma la tasa del título del registro concedido. */
  readonly withTitle?: boolean
  /** Si el titular tiene certificado Pyme vigente. */
  readonly pyme?: boolean
}

export interface TrademarkQuote {
  /** Clases efectivamente contadas, ya saneadas. */
  readonly classes: number
  /** Tasa de la primera clase, en UI, antes del descuento. */
  readonly firstClassUi: number
  /** Tasa de las clases adicionales, en UI, antes del descuento. */
  readonly extraClassesUi: number
  /** Lo que el descuento Pyme resta, en UI. 0 si no corresponde. */
  readonly pymeDiscountUi: number
  /** Tasa del título, en UI. 0 si no se pidió. Nunca lleva descuento. */
  readonly titleUi: number
  /** Total en UI, con el descuento ya aplicado. */
  readonly totalUi: number
  /** El mismo total en pesos, a `TRADEMARK_UI_VALUE`. */
  readonly totalUyu: number
}

const whole = (value: number): number =>
  Number.isFinite(value) && value > 1 ? Math.floor(value) : 1

/**
 * Lo que suman las tasas de la DNPI para registrar una marca.
 *
 * Es una SUMA de tasas publicadas, no un presupuesto: no incluye honorarios de agente ni de
 * abogado, que no son tasas y que ningún organismo publica.
 */
export function trademarkQuote(input: TrademarkQuoteInput): TrademarkQuote {
  const classes = whole(input.classes)
  const mixed = input.kind === 'mixta'
  const firstClassUi = trademarkFeeUi(mixed ? 'solicitud-mixta' : 'solicitud-denominativa')
  const extraUnitUi = trademarkFeeUi(
    mixed ? 'solicitud-mixta-extra' : 'solicitud-denominativa-extra'
  )
  const extraClassesUi = extraUnitUi * (classes - 1)
  const registrationUi = firstClassUi + extraClassesUi
  const pymeDiscountUi = input.pyme ? registrationUi * PYME_DISCOUNT : 0
  const titleUi = input.withTitle ? trademarkFeeUi('titulo') : 0
  const totalUi = registrationUi - pymeDiscountUi + titleUi
  return {
    classes,
    firstClassUi,
    extraClassesUi,
    pymeDiscountUi,
    titleUi,
    totalUi,
    totalUyu: uiToUyu(totalUi),
  }
}

/**
 * Las dos tasas que la tabla oficial dejó de cobrar, con la norma que las sacó.
 *
 * Es lo que más se publica mal sobre este trámite: los resúmenes siguen listando la búsqueda de
 * antecedentes y la publicación en el Boletín como dos costos del registro, y la tabla vigente
 * marca una como suprimida y la otra como no cobrada.
 */
export const TRADEMARK_NOT_CHARGED = Object.freeze([
  {
    id: 'busqueda',
    label: 'Búsqueda de antecedentes',
    detail:
      'El numeral 2 del artículo 99 —la tasa de la búsqueda— quedó suprimido por el artículo 138 de la Ley 19.670. La página del trámite agrega que desde el 24 de enero de 2024 la búsqueda fonética se hace sólo desde la base pública de marcas.',
  },
  {
    id: 'publicacion',
    label: 'Publicación en el Boletín de la Propiedad Industrial',
    detail:
      'La tabla le pone precio a la publicación de marcas denominativas y mixtas, y en la misma fila aclara «no se cobra por la circular 3/2018».',
  },
])

/** Las fuentes, con la URL que se abrió y qué sostiene cada una. */
export const TRADEMARK_SOURCES = Object.freeze([
  {
    label: 'DNPI — Tasas y precios, noviembre de 2026 (tabla oficial en UI y en pesos)',
    url: 'https://www.gub.uy/ministerio-industria-energia-mineria/comunicacion/publicaciones/tasas-precios-direccion-nacional-propiedad-industrial',
  },
  {
    label: 'gub.uy — Registro de marcas: requisitos, pasos y descuento Pyme',
    url: 'https://www.gub.uy/tramites/registro-marcas',
  },
  {
    label: 'Ley 17.011, artículo 18 — diez años, renovable, y el plazo de gracia',
    url: 'https://www.impo.com.uy/bases/leyes/17011-1998/18',
  },
  {
    label: 'Ley 17.011, artículo 19 — el uso es obligatorio y la cancelación por no uso',
    url: 'https://www.impo.com.uy/bases/leyes/17011-1998/19',
  },
  {
    label: 'Ley 17.011, artículo 23 — treinta días corridos para oponerse',
    url: 'https://www.impo.com.uy/bases/leyes/17011-1998/23',
  },
  {
    label: 'INE — Unidad Indexada, noviembre de 2026',
    url: 'https://www.gub.uy/instituto-nacional-estadistica/unidad-indexada',
  },
])
