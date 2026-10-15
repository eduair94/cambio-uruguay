/**
 * Qué se paga de impuestos al comprar o vender una vivienda en Uruguay.
 *
 * El sitio ya tiene todo el resto de la cadena —`/venta-viviendas-uruguay` publica los avisos,
 * `/valor-catastral-uruguay` explica cómo mirar el valor que fija Catastro,
 * `/contribucion-inmobiliaria-uruguay` y `/impuesto-de-primaria-uruguay` cuelgan de ese mismo
 * valor— y en ninguna de sus 210 páginas se decía qué impuesto se paga en la escritura. La
 * expresión «trasmisiones patrimoniales» no aparecía ni una vez fuera de una fila de exoneraciones
 * de vivienda promovida.
 *
 * El ángulo propio, y la razón por la que esto no lo contesta la caja de respuestas de Google: la
 * tasa es fácil (2 % y 2 %) pero **la base no es el precio**. El artículo 5º del Título 19 la fija
 * en el valor real de Catastro actualizado por IPC, y el precio entra sólo como TECHO: «Si esa
 * actualización determinare un valor mayor que el precio establecido […] el monto imponible, en
 * tales casos, será dicho precio». En el caso normal —una casa que se vende por encima de su valor
 * catastral— el 2 % se calcula sobre el valor catastral, que es bastante menos. Quien hace la
 * cuenta sobre el precio se asusta de más.
 *
 * Y la segunda confusión, que es la cara: el vendedor paga DOS impuestos distintos, con bases
 * distintas. El ITP del 2 % y el IRPF por incremento patrimonial, que tiene su propia aritmética y
 * del que el ITP pagado se DEDUCE.
 *
 * Módulo puro: sin imports de Vue ni de Nuxt, para que vitest-node lo cargue.
 */

/** La ruta de la página, en un solo lugar: la usa el canonical y el JSON-LD. */
export const ITP_PATH = '/impuesto-a-las-trasmisiones-patrimoniales-uruguay'

/** El día en que se cotejaron las cifras contra el Texto Ordenado y las fichas de la DGI. */
export const ITP_VERIFIED_AT = '2026-10-15'

// ---------------------------------------------------------------------------
// Las tasas del ITP (Título 19, artículo 7º)
// ---------------------------------------------------------------------------

/** El 2 % del que vende, en un negocio a título oneroso. */
export const ITP_SELLER_RATE = 2
/** El 2 % del que compra. */
export const ITP_BUYER_RATE = 2
/** Herederos y legatarios en línea recta ascendente o descendente con el causante. */
export const ITP_HEIR_DIRECT_RATE = 3
/** Los demás contribuyentes, entre ellos los herederos que no son de línea recta. */
export const ITP_OTHER_RATE = 4

export interface ItpRate {
  id: string
  /** Quién paga, en los términos del Texto Ordenado. */
  who: string
  rate: number
  /** Cuándo se aplica, en una línea. */
  when: string
}

export const ITP_RATES: readonly ItpRate[] = Object.freeze([
  {
    id: 'enajenante',
    who: 'El que vende (enajenante)',
    rate: ITP_SELLER_RATE,
    when: 'Compraventa, promesa de enajenación y cesión de promesa.',
  },
  {
    id: 'adquirente',
    who: 'El que compra (adquirente)',
    rate: ITP_BUYER_RATE,
    when: 'La misma operación: las dos partes son contribuyentes, cada una por su 2 %.',
  },
  {
    id: 'heredero-linea-recta',
    who: 'Hijos, nietos, padres y abuelos del fallecido',
    rate: ITP_HEIR_DIRECT_RATE,
    when: 'Herederos y legatarios en línea recta ascendente o descendente con el causante.',
  },
  {
    id: 'otros',
    who: 'Los demás contribuyentes',
    rate: ITP_OTHER_RATE,
    when: 'Hermanos, sobrinos y cualquier otro heredero o legatario, y los demás hechos gravados.',
  },
])

// ---------------------------------------------------------------------------
// La base, que es el punto de toda la página
// ---------------------------------------------------------------------------

/**
 * El monto imponible del ITP sobre un inmueble, según el artículo 5º, literal A).
 *
 * La base es el valor real que fija Catastro, ACTUALIZADO por la variación del IPC entre el mes de
 * la fijación y el anterior al de la operación. El precio no es la base: entra sólo como techo, y
 * sólo cuando la actualización da un valor mayor que él. O sea `min(valor real actualizado, precio)`
 * cuando hay precio.
 *
 * `price` va `null` cuando el acto no tiene precio —una transmisión por causa de muerte, por
 * ejemplo—: ahí no hay techo que aplicar y la base es el valor real actualizado. Devolver el valor
 * real también ante un precio cero o negativo es deliberado: un cero en un formulario es «no lo
 * escribí», no «se regaló» ([[cifra-vieja-pasa-la-banda-de-plausibilidad]], la misma regla que los
 * gastos comunes de Mercado Libre).
 */
export function itpTaxableBase(updatedCadastralValue: number, price: number | null): number {
  if (!Number.isFinite(updatedCadastralValue) || updatedCadastralValue <= 0) return 0
  if (price === null || !Number.isFinite(price) || price <= 0) return updatedCadastralValue
  return Math.min(updatedCadastralValue, price)
}

/** El impuesto de una parte: la base por su tasa. */
export function itpAmount(base: number, ratePercent: number): number {
  if (!Number.isFinite(base) || base <= 0) return 0
  if (!Number.isFinite(ratePercent) || ratePercent <= 0) return 0
  return (base * ratePercent) / 100
}

export interface ItpBreakdown {
  /** El monto imponible que resultó, ya con el techo del precio aplicado. */
  base: number
  /** `true` cuando el techo del precio mandó, que es el caso que el artículo 5º prevé. */
  priceCapped: boolean
  seller: number
  buyer: number
  /** Lo que la escritura mueve en total por este impuesto. */
  total: number
}

/**
 * El ITP de una compraventa, visto desde las dos puntas.
 *
 * Se publican los dos lados y el total porque el impuesto es de las dos partes y el escribano lo
 * retiene junto: un comprador que sólo mira su 2 % no entiende la cifra que le pasan.
 */
export function itpBreakdown(updatedCadastralValue: number, price: number | null): ItpBreakdown {
  const base = itpTaxableBase(updatedCadastralValue, price)
  const seller = itpAmount(base, ITP_SELLER_RATE)
  const buyer = itpAmount(base, ITP_BUYER_RATE)
  return {
    base,
    priceCapped:
      base > 0 &&
      price !== null &&
      Number.isFinite(price) &&
      price > 0 &&
      price < updatedCadastralValue,
    seller,
    buyer,
    total: seller + buyer,
  }
}

// ---------------------------------------------------------------------------
// El otro impuesto del vendedor: IRPF por incremento patrimonial
// ---------------------------------------------------------------------------

/** La tasa del IRPF de la Categoría I sobre la renta computable. */
export const IRPF_CAPITAL_RATE = 12
/** La renta computable del criterio ficto: 15 % del mayor entre precio y valor real. */
export const IRPF_FICTO_SHARE = 15
/**
 * El ficto llevado a tasa efectiva sobre ese mayor: 15 % × 12 %.
 *
 * Se guarda calculado y no escrito a mano para que no pueda desincronizarse de los dos números de
 * arriba, que son los que están en la ficha de la DGI.
 */
export const IRPF_FICTO_EFFECTIVE_RATE = (IRPF_FICTO_SHARE * IRPF_CAPITAL_RATE) / 100

/** Sólo los inmuebles adquiridos ANTES de esta fecha pueden optar por el ficto. */
export const IRPF_FICTO_CUTOFF = '2007-07-01'

/** El IRPF del vendedor por el criterio ficto, sobre el mayor entre precio y valor real. */
export function irpfFictoAmount(priceOrCadastralValue: number): number {
  if (!Number.isFinite(priceOrCadastralValue) || priceOrCadastralValue <= 0) return 0
  return (priceOrCadastralValue * IRPF_FICTO_EFFECTIVE_RATE) / 100
}

/**
 * La exoneración de la casa habitación permanente, con sus cinco condiciones.
 *
 * Los topes van en UNIDADES INDEXADAS y no en pesos a propósito: la ficha de la DGI los declara en
 * UI y el equivalente en pesos cambia todos los meses. El sitio tiene la UI del día en
 * `/indicadores/unidad-indexada`, así que la página enlaza ahí en vez de congelar un monto.
 */
export const IRPF_HOME_EXEMPTION = Object.freeze({
  soldMaxUi: 1_200_000,
  boughtMaxUi: 1_800_000,
  reinvestedSharePercent: 50,
  monthsBetween: 12,
})

export interface IrpfCriterion {
  id: 'ficto' | 'real'
  label: string
  /** Quién puede usarlo. */
  eligibility: string
  /** Cómo se arma la renta computable. */
  computable: string
}

export const IRPF_CRITERIA: readonly IrpfCriterion[] = Object.freeze([
  {
    id: 'ficto',
    label: 'Criterio ficto',
    eligibility: 'Sólo si el inmueble se adquirió antes del 1.º de julio de 2007. Es opcional.',
    computable:
      'El 15 % del precio de venta o del valor real de Catastro, el mayor de los dos. Con la tasa del 12 % encima, queda un 1,8 % de esa cifra.',
  },
  {
    id: 'real',
    label: 'Criterio real',
    eligibility:
      'El único posible si el inmueble se adquirió desde el 1.º de julio de 2007. Opcional para los anteriores.',
    computable:
      'El precio (nunca menor al valor real de Catastro) menos el costo fiscal actualizado por la Unidad Indexada, menos el ITP que pagó el vendedor, menos las mejoras documentadas.',
  },
])

// ---------------------------------------------------------------------------
// Plazos y trámite
// ---------------------------------------------------------------------------

export interface ItpDeadline {
  id: string
  act: string
  deadline: string
}

export const ITP_DEADLINES: readonly ItpDeadline[] = Object.freeze([
  {
    id: 'compraventa',
    act: 'Compraventa, promesa de enajenación y cesión de derechos hereditarios o posesorios',
    deadline: '15 días corridos desde el otorgamiento',
  },
  {
    id: 'prescripcion',
    act: 'Sentencia declarativa de prescripción adquisitiva',
    deadline: '15 días corridos desde que la sentencia queda ejecutoriada',
  },
  {
    id: 'sucesion',
    act: 'Transmisión por causa de muerte (sucesión)',
    deadline: '1 año desde el fallecimiento',
  },
  {
    id: 'ausente',
    act: 'Posesión definitiva de los bienes del ausente',
    deadline: '1 año desde que la sentencia queda ejecutoriada',
  },
])

/** Los formularios y el código de pago que declara la propia ficha de la DGI. */
export const ITP_FORMS = Object.freeze({
  urban: '1700',
  rural: '1701',
  application: 'Aplicación Sigma',
  paymentCode: '680',
})

// ---------------------------------------------------------------------------
// Exoneraciones: las que hay, que no son la que se busca
// ---------------------------------------------------------------------------

export interface ItpExemption {
  id: string
  label: string
  detail: string
}

/**
 * Las exoneraciones del artículo 8º que le pueden tocar a una vivienda.
 *
 * La lista importa por lo que NO tiene: no hay una exoneración general por primera vivienda ni por
 * vivienda única. Es la pregunta que trae a la página («exoneración ITP primera vivienda») y la
 * respuesta es que ese beneficio no existe en el régimen general; lo que existe son estos casos
 * acotados y el régimen aparte de vivienda promovida.
 */
export const ITP_EXEMPTIONS: readonly ItpExemption[] = Object.freeze([
  {
    id: 'cooperativas',
    label: 'Cooperativas de vivienda y fondos sociales',
    detail:
      'La primera promesa de enajenación a plazo y la primera enajenación que realicen, más las adquisiciones para sus programas de la Ley 13.728.',
  },
  {
    id: 'bhu-anv',
    label: 'Actos del BHU y de la ANV',
    detail:
      'Los actos en que el Banco Hipotecario del Uruguay interviene como parte otorgante, y los de la Agencia Nacional de Vivienda por sí, como representante del promotor o a través de sus fideicomisos.',
  },
  {
    id: 'expropiacion',
    label: 'Expropiación a favor del Estado',
    detail:
      'Las enajenaciones por expropiación a favor del Estado, los municipios, los entes autónomos y los servicios descentralizados.',
  },
  {
    id: 'promesa-pagada',
    label: 'Escritura de una promesa que ya pagó el impuesto',
    detail:
      'La enajenación que cumple una promesa posterior a la Ley 16.107 que ya tributó: el impuesto no se paga dos veces por la misma operación.',
  },
])

/** Lo que esta página NO publica, y por qué. */
export interface ItpUnpublished {
  id: string
  what: string
  why: string
}

export const ITP_UNPUBLISHED: readonly ItpUnpublished[] = Object.freeze([
  {
    id: 'honorarios',
    what: 'Los honorarios del escribano',
    why: 'No hay una tasa oficial vigente que podamos citar: lo que se cobra se pacta y varía por operación. Publicar un porcentaje de referencia sería inventarlo.',
  },
  {
    id: 'ipc-del-padron',
    what: 'El valor catastral de tu padrón ya actualizado por IPC',
    why: 'La actualización corre desde el mes en que Catastro fijó ESE valor, que es un dato de cada padrón. La cuenta de abajo pide el valor ya actualizado en vez de adivinar el mes.',
  },
  {
    id: 'vis',
    what: 'El alcance de la exoneración de vivienda promovida',
    why: 'Depende del proyecto y de la zona, y lo declara la resolución que lo aprueba. La página dice que el régimen existe y no cuánto le toca a una unidad concreta.',
  },
])

// ---------------------------------------------------------------------------
// Fuentes y preguntas
// ---------------------------------------------------------------------------

export interface ItpSource {
  label: string
  url: string
}

export const ITP_SOURCES: readonly ItpSource[] = Object.freeze([
  {
    label: 'Título 19 del Texto Ordenado DGI — Impuestos a las Trasmisiones Patrimoniales',
    url: 'https://www.impo.com.uy/bases/todgi-2023/19-2024',
  },
  {
    label: 'Ley 16.107, de 31 de marzo de 1990 — origen del impuesto y de las tasas',
    url: 'https://www.impo.com.uy/bases/leyes/16107-1990',
  },
  {
    label: 'DGI — Impuesto a las Transmisiones Patrimoniales',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/impuesto-transmisiones-patrimoniales-0',
  },
  {
    label: 'DGI — IRPF, incrementos patrimoniales de inmuebles urbanos',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-incrementos-patrimoniales-inmuebles-urbanos',
  },
])

export interface ItpFaq {
  question: string
  answer: string
}

export const ITP_FAQ: readonly ItpFaq[] = Object.freeze([
  {
    question: '¿El 2 % se paga sobre el precio de la casa?',
    answer:
      'No. El artículo 5º del Título 19 fija el monto imponible en el valor real que fija Catastro, actualizado por la variación del IPC entre el mes de la fijación y el anterior a la operación. El precio entra sólo como techo: si esa actualización da un valor MAYOR que el precio, se paga sobre el precio. En una venta por encima del valor catastral, que es el caso habitual, la base es el valor catastral.',
  },
  {
    question: '¿Quién paga el ITP, el que compra o el que vende?',
    answer:
      'Los dos. El artículo 7º fija 2 % para el enajenante y 2 % para el adquirente, y el artículo 3º hace contribuyentes a los otorgantes. El escribano interviniente actúa como agente de retención y percepción, así que lo retiene y lo paga él.',
  },
  {
    question: '¿Hay exoneración de ITP por ser mi primera vivienda?',
    answer:
      'No en el régimen general: el artículo 8º no exonera por primera vivienda ni por vivienda única. Las exoneraciones que existen son otras —cooperativas de vivienda y fondos sociales, actos del BHU y de la ANV, expropiación— y, aparte, el régimen de vivienda promovida exonera el ITP de la compra en los proyectos que lo tienen aprobado.',
  },
  {
    question: '¿Cuánto paga de impuestos el que vende?',
    answer:
      'Dos cosas distintas: el 2 % de ITP sobre el valor catastral actualizado, y el IRPF por incremento patrimonial, que es el 12 % de la renta computable. Si compró el inmueble antes del 1.º de julio de 2007 puede optar por el criterio ficto, donde la renta computable es el 15 % del mayor entre el precio y el valor real, o sea un 1,8 % de esa cifra. Si lo compró después, sólo puede usar el criterio real, y ahí el ITP que pagó se deduce.',
  },
  {
    question: '¿Cuándo hay que pagarlo?',
    answer:
      'En una compraventa, promesa o cesión, dentro de los 15 días corridos del otorgamiento. En una sucesión, dentro de 1 año del fallecimiento. La declaración va en el formulario 1700 para inmuebles urbanos o 1701 para rurales, armado con la Aplicación Sigma, y el pago con el código 680. Los Registros no inscriben el documento sin el comprobante.',
  },
  {
    question: '¿Y si vendo mi casa para comprar otra?',
    answer:
      'Esa es una exoneración del IRPF, no del ITP, y tiene cinco condiciones: que el inmueble vendido no pase de 1.200.000 UI, que al menos el 50 % del precio vaya a comprar la nueva vivienda permanente, que entre las dos operaciones no pasen más de 12 meses, que la nueva no pase de 1.800.000 UI y que las dos sean casa habitación permanente. Aun cumpliendo todo, el escribano retiene igual y la devolución se le pide después a la DGI.',
  },
])
