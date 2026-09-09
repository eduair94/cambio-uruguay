// app/utils/primaryEducationTax.ts
// Datos de /impuesto-de-primaria-uruguay: el impuesto anual que la DGI le cobra a cada padrón
// urbano, suburbano y rural del país.
//
// POR QUÉ EXISTE: el sitio ya contesta casi todo lo que se paga por tener o alquilar una vivienda
// —gastos comunes, UTE, OSE, contribución dentro del comparador de comprar vs. alquilar, el IRPF
// del arrendamiento— y a Primaria sólo lo nombraba de costado: aparecía como una línea deducible
// en `capitalTax.ts` y como una advertencia en la guía del primer alquiler ("no es un tributo
// domiciliario, no lo pagás vos"). La pregunta que llega —quién lo paga, desde cuándo, cuánto es y
// qué padrón queda afuera— no la contestaba ninguna página.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA:
//
//   1. NINGUNA ESCALA PARA 2026. La DGI ya publicó el monto exonerado del ejercicio 2026
//      ($ 282.612), pero el decreto anual que fija los tramos todavía es el 140/025, con valores
//      al 1.º de enero de 2025. Los tramos se mueven todos los años junto con el exonerado, así
//      que sería trivial multiplicarlos por el mismo 4,25 % que subió el exonerado y publicar una
//      tabla "2026" — y sería un número inventado. Acá se publica la escala del decreto que
//      existe, fechada, y se dice que la del ejercicio nuevo no está.
//
//   2. NINGUNA CUENTA DEL IMPUESTO A PAGAR. El decreto da la alícuota por tramo, pero no dice si
//      se aplica sobre el valor entero o por escalones, y las dos lecturas dan cifras distintas
//      para el mismo padrón. `tramoParaValor()` devuelve la alícuota que corresponde y nada más:
//      el importe lo liquida la DGI y se consulta por padrón en su servicio en línea. Una
//      calculadora acá sería una cifra propia disfrazada de dato oficial.
//
// FUENTES PRIMARIAS, verificadas el 2026-09-09 (ver IEP_SOURCES):
//   - Texto Ordenado DGI 2023, Título 13, arts. 1, 2, 5 y 11 — hecho generador, contribuyentes,
//     exoneraciones y destino de lo recaudado.
//   - Decreto 140/025, de 2 de julio de 2025, arts. 3 y 4 — monto exonerado y escala vigente.
//   - DGI — monto base exonerado por ejercicio, 2015 a 2026.
//   - DGI — quiénes pagan, desde cuándo, en cuántas cuotas y cómo se paga.

export interface IepSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const IEP_VERIFIED_AT = '2026-09-09'

/** Ejercicio cuyo monto exonerado ya publicó la DGI. */
export const IEP_EJERCICIO_VIGENTE = 2026

/**
 * Último ejercicio con decreto de escala publicado.
 *
 * NO es lo mismo que `IEP_EJERCICIO_VIGENTE`, y esa diferencia es justamente el dato: la DGI
 * publica el monto exonerado del ejercicio nuevo antes que el decreto que reajusta los tramos.
 */
export const IEP_ESCALA_EJERCICIO = 2025

export const IEP_SOURCES: readonly IepSource[] = Object.freeze([
  {
    label: 'Texto Ordenado DGI 2023, Título 13 — Impuesto de Enseñanza Primaria',
    url: 'https://www.impo.com.uy/bases/todgi-2023/13-2024/13',
  },
  {
    label: 'Decreto 140/025, de 2 de julio de 2025 — monto exonerado y escala',
    url: 'https://www.impo.com.uy/bases/decretos-originales/140-2025',
  },
  {
    label: 'DGI — Monto base exonerado de Impuesto de Enseñanza Primaria, por ejercicio',
    url: 'https://www.gub.uy/direccion-general-impositiva/impuesto-primaria/sobre-impuesto/monto-base-exonerado-impuesto-ensenanza-primaria',
  },
  {
    label: 'DGI — Qué es el impuesto de primaria y quiénes deben pagar',
    url: 'https://www.gub.uy/direccion-general-impositiva/politicas-y-gestion/programas/que-es-el-impuesto-primaria-y-quienes-deben-pagar',
  },
  {
    label: 'DGI — Cuál es la base de cálculo del Impuesto de Enseñanza Primaria',
    url: 'https://www.gub.uy/direccion-general-impositiva/impuesto-primaria/sobre-impuesto/es-base-calculo-del-impuesto-ensenanza-primaria',
  },
  {
    label: 'DGI — Cómo pago el impuesto',
    url: 'https://www.gub.uy/direccion-general-impositiva/impuesto-primaria/sobre-pagos/pago-impuesto',
  },
  {
    label: 'DGI — Consulte su deuda de Impuesto de Primaria',
    url: 'https://servicios.dgi.gub.uy/serviciosenlinea/impuesto-primaria/dgi--servicios-en-linea--primaria-consulte-su-deuda',
  },
  {
    label: 'DGI — Exoneración del Impuesto de Primaria para pequeños productores rurales',
    url: 'https://www.gub.uy/direccion-general-impositiva/impuesto-primaria/padrones-rurales/exoneracion-del-impuesto-primaria-para-pequenos-productores',
  },
])

// ---------------------------------------------------------------------------
// El monto exonerado, ejercicio por ejercicio
// ---------------------------------------------------------------------------

export interface MontoExonerado {
  readonly ejercicio: number
  /** Valor imponible por debajo del cual el padrón no paga, en pesos uruguayos. */
  readonly pesos: number
}

/**
 * El piso del impuesto, tal como lo publica la DGI para cada ejercicio.
 *
 * Vale la pena la serie entera y no sólo el número de hoy: es la respuesta a la pregunta que
 * llega cuando a alguien le empieza a venir la factura sin haber comprado nada nuevo. El
 * exonerado se ajusta todos los años, pero el valor imponible del padrón también, y el catastral
 * se mueve más rápido en algunos barrios que el ajuste general — un padrón puede cruzar el piso
 * sin que su dueño haya hecho nada.
 */
export const MONTOS_EXONERADOS: readonly MontoExonerado[] = Object.freeze([
  { ejercicio: 2015, pesos: 130_155 },
  { ejercicio: 2016, pesos: 142_050 },
  { ejercicio: 2017, pesos: 154_692 },
  { ejercicio: 2018, pesos: 163_587 },
  { ejercicio: 2019, pesos: 177_099 },
  { ejercicio: 2020, pesos: 190_878 },
  { ejercicio: 2021, pesos: 209_813 },
  { ejercicio: 2022, pesos: 225_360 },
  { ejercicio: 2023, pesos: 247_783 },
  { ejercicio: 2024, pesos: 257_396 },
  { ejercicio: 2025, pesos: 271_091 },
  { ejercicio: 2026, pesos: 282_612 },
])

/** El monto exonerado del ejercicio en curso, en pesos. */
export const MONTO_EXONERADO_VIGENTE: number =
  MONTOS_EXONERADOS.find(m => m.ejercicio === IEP_EJERCICIO_VIGENTE)?.pesos ?? 0

// ---------------------------------------------------------------------------
// La escala
// ---------------------------------------------------------------------------

export interface TramoIep {
  /** Valor imponible desde el cual rige el tramo, en pesos, inclusive. */
  readonly desde: number
  /** Valor imponible hasta el cual rige, inclusive. `null` en el último tramo, que es abierto. */
  readonly hasta: number | null
  /** Alícuota del tramo, como proporción (0.0015 = 0,15 %). */
  readonly alicuota: number
}

/**
 * La escala del Decreto 140/025, art. 4, a valores del 1.º de enero de 2025.
 *
 * El primer `desde` coincide exactamente con el monto exonerado de ese mismo decreto: por debajo
 * de esa cifra no hay tramo porque no hay impuesto. El Texto Ordenado, Título 13, art. 4, expresa
 * las mismas cuatro alícuotas en "por mil" (1,5 · 2 · 2,5 · 3) sobre valores de 1991; el decreto
 * anual es el que las reexpresa en pesos de hoy.
 */
export const ESCALA: readonly TramoIep[] = Object.freeze([
  { desde: 271_091, hasta: 474_406, alicuota: 0.0015 },
  { desde: 474_407, hasta: 2_033_154, alicuota: 0.002 },
  { desde: 2_033_155, hasta: 4_744_017, alicuota: 0.0025 },
  { desde: 4_744_018, hasta: null, alicuota: 0.003 },
])

/**
 * El tramo de la escala publicada que le corresponde a un valor imponible.
 *
 * Devuelve `null` cuando el valor queda por debajo del primer tramo —o sea, exonerado bajo ese
 * mismo decreto— y también para valores no numéricos o negativos.
 *
 * Devuelve el TRAMO, no el impuesto: ver la nota de arriba sobre por qué acá no se liquida nada.
 *
 * @param valorImponible valor imponible del padrón, en pesos.
 */
export function tramoParaValor(valorImponible: number): TramoIep | null {
  if (!Number.isFinite(valorImponible) || valorImponible <= 0) return null
  return (
    ESCALA.find(
      tramo =>
        valorImponible >= tramo.desde && (tramo.hasta === null || valorImponible <= tramo.hasta)
    ) ?? null
  )
}

// ---------------------------------------------------------------------------
// Quiénes pagan y quiénes no
// ---------------------------------------------------------------------------

/** Los contribuyentes, en las palabras del Texto Ordenado, Título 13, art. 2. */
export const CONTRIBUYENTES: readonly string[] = Object.freeze([
  'Los propietarios de los inmuebles.',
  'Los poseedores.',
  'Los promitentes compradores, con o sin promesa inscripta.',
  'Los usufructuarios.',
])

export interface ExoneracionIep {
  readonly literal: string
  readonly texto: string
}

/**
 * Las exoneraciones del Texto Ordenado, Título 13, art. 5.
 *
 * La que llega por búsqueda es la del literal f: el productor rural cuyos padrones no superan en
 * conjunto las 300 hectáreas índice CONEAT 100. Es la única que exige un trámite propio —una
 * declaración jurada ante la DGI— en vez de aplicarse sola.
 */
export const EXONERACIONES: readonly ExoneracionIep[] = Object.freeze([
  {
    literal: 'a',
    texto:
      'Inmuebles de gobiernos extranjeros destinados a sedes de delegaciones diplomáticas, organismos internacionales o consulares.',
  },
  { literal: 'b', texto: 'Propiedades del Estado y de los Gobiernos Departamentales.' },
  {
    literal: 'c',
    texto:
      'Propiedades de las entidades comprendidas en el artículo 1.º del Título 3 del Texto Ordenado y en el Decreto-Ley 15.181.',
  },
  { literal: 'd', texto: 'Las cooperativas de vivienda.' },
  {
    literal: 'e',
    texto:
      'Inmuebles dados en comodato al Estado, a los Gobiernos Departamentales y a las personas jurídicas de los artículos 5.º y 69 de la Constitución.',
  },
  {
    literal: 'f',
    texto:
      'Padrones rurales explotados por su propietario cuando en conjunto no superan las 300 hectáreas índice CONEAT 100. Se pide con declaración jurada ante la DGI.',
  },
  { literal: 'g', texto: 'Todos los inmuebles de MEVIR – Dr. Alberto Gallinal Heber.' },
])

/** Cuotas anuales en las que la DGI cobra el impuesto. */
export const CUOTAS_ANUALES = 3

/** Dónde se paga, según la propia DGI. */
export const CANALES_DE_PAGO: readonly string[] = Object.freeze([
  'Redes de cobranza: Abitab, Redpagos y El Correo Uruguayo.',
  'Pagos en línea desde el sitio de la DGI.',
  'Débito automático en tarjetas (Oca, Visa, Cabal, Créditos Directos, Club del Este).',
  'Débito automático en bancos (BBVA, Santander, Itaú, Scotiabank, HSBC).',
])

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface IepFaq {
  readonly id: string
  readonly question: string
  readonly answer: string
}

export const IEP_FAQ: readonly IepFaq[] = Object.freeze([
  {
    id: 'quien-paga',
    question: '¿Quién paga el Impuesto de Primaria?',
    answer:
      'El Texto Ordenado de la DGI, Título 13, artículo 2, nombra cuatro figuras: los propietarios del inmueble, los poseedores, los promitentes compradores —con o sin promesa inscripta— y los usufructuarios. No es un impuesto del que vive en la casa: es del que tiene el derecho sobre el padrón.',
  },
  {
    id: 'inquilino',
    question: 'Alquilo. ¿Me lo pueden cobrar a mí?',
    answer:
      'El contribuyente es el propietario, no el inquilino: Primaria no es un tributo domiciliario como UTE u OSE, que se pagan por lo que consumís. Si el contrato pretende trasladártelo, es una cláusula para discutir antes de firmar. Del otro lado, para el propietario el impuesto es un gasto deducible al liquidar el IRPF por el alquiler.',
  },
  {
    id: 'desde-cuando',
    question: 'Compré una casa este año. ¿Desde cuándo lo pago?',
    answer:
      'Desde el año civil siguiente al de la adquisición, según la propia DGI: quien compra en febrero de un año pasa a ser contribuyente el 1.º de enero del siguiente. Además, no se puede escriturar una transmisión sin acreditar que el impuesto está pago o que el padrón está exonerado.',
  },
  {
    id: 'exonerado',
    question: '¿Cuál es el valor a partir del cual se paga?',
    answer:
      'En el ejercicio 2026 quedan exonerados los padrones urbanos y rurales cuyo valor imponible de la cédula catastral sea inferior a $ 282.612. En 2025 el piso era $ 271.091 y en 2015 era $ 130.155. El valor que manda es el que fija la Dirección Nacional de Catastro, y figura como «VALOR IMPONIBLE» arriba a la derecha de la factura del impuesto.',
  },
  {
    id: 'cuanto-es',
    question: '¿Cuánto se paga?',
    answer:
      'El último decreto publicado, el 140/025, fija cuatro alícuotas sobre el valor imponible, a valores del 1.º de enero de 2025: 0,15 % entre $ 271.091 y $ 474.406, 0,20 % entre $ 474.407 y $ 2.033.154, 0,25 % entre $ 2.033.155 y $ 4.744.017 y 0,30 % de $ 4.744.018 en adelante. El importe exacto lo liquida la DGI y se consulta por padrón en su servicio en línea.',
  },
  {
    id: 'cuotas',
    question: '¿En cuántas cuotas se paga y dónde?',
    answer:
      'En tres cuotas al año. Se paga en cualquier local de Abitab, Redpagos o El Correo Uruguayo, por pagos en línea del sitio de la DGI, o por débito automático con tarjeta (Oca, Visa, Cabal, Créditos Directos, Club del Este) o con banco (BBVA, Santander, Itaú, Scotiabank, HSBC). La DGI expone la factura en su web durante los 20 días previos a cada vencimiento.',
  },
  {
    id: 'campo',
    question: 'Tengo un campo chico. ¿Estoy exonerado?',
    answer:
      'El artículo 5, literal f, exonera al productor rural que explota padrones que en conjunto no superan las 300 hectáreas índice CONEAT 100. No se aplica sola: hay que presentar una declaración jurada ante la DGI dentro del plazo del ejercicio. Si todos los padrones ya están por debajo del monto exonerado, la DGI aclara que no corresponde presentarla.',
  },
  {
    id: 'para-que',
    question: '¿A dónde va lo que se recauda?',
    answer:
      'El artículo 11 del Título 13 lo destina al Inciso 25 «Administración Nacional de Educación Pública», unidad ejecutora 002 «Consejo de Educación Inicial y Primaria»: construcción y reparación de escuelas, equipamiento, material educativo y alimentación escolar.',
  },
])
