// app/utils/cashLimit.ts
// Datos de /limite-de-efectivo-uruguay: hasta cuánto se puede pagar en efectivo en Uruguay, qué
// pasa con el excedente, quién queda exceptuado y cuánto es la multa.
//
// POR QUÉ EXISTE: es la pregunta más cara del sitio que nadie contestaba. El sitio ya explica dónde
// cambiar dólares, cuánto retirar de un cajero y cómo pagar con tarjeta, pero no decía en ningún
// lado que la Ley de Inclusión Financiera le pone un techo al efectivo en CUALQUIER operación —
// comprar un auto, una moto, un terreno, pagarle a un albañil, aportar capital a una SRL—. Y el
// techo se movió: el artículo 35 tiene redacción nueva desde la Ley 20.469, promulgada el
// 19/03/2026 y publicada el 10/04/2026. Casi todo lo que se lee en internet sobre este tema cita
// los artículos 36, 39 y 40, que están DEROGADOS desde la LUC (Ley 19.889, art. 224, 09/07/2020).
//
// LOS DOS ERRORES QUE ESTA PÁGINA EXISTE PARA CORREGIR:
//   1. Creer que el tope se calcula con la UI del día de la operación. El propio art. 35 dice que
//      los valores en unidades indexadas «se convertirán considerando la cotización al primer día
//      de cada mes»: durante todo el mes el techo en pesos es UNO SOLO y ya está fijado.
//   2. Creer que el límite sólo aplica a pesos uruguayos. El art. 35 define efectivo como «el papel
//      moneda y la moneda metálica sean nacionales o extranjeros»: los dólares billete cuentan.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: ningún monto en pesos fijo. Los topes son en UI y la UI se
// mueve todos los días; la página los convierte en vivo con el valor que ya sirve /indicadores, y
// aclara que la conversión legal usa la UI del primer día del mes. Tampoco se publica cuál era el
// tope anterior a la Ley 20.469: IMPO muestra que la redacción previa la dio el art. 221 de la LUC
// pero no despliega su texto en la ficha del artículo, así que el número viejo no se pudo verificar
// contra la fuente y no se afirma.
//
// FUENTES PRIMARIAS, verificadas el 2026-09-02 contra impo.com.uy (ver CASH_LIMIT_SOURCES):
//   - Ley 19.210, art. 35 (redacción dada por Ley 20.469 de 19/03/2026, art. 3) — los dos topes,
//     la regla del saldo, la definición de efectivo, las sociedades comerciales y la UI del primer
//     día del mes.
//   - Ley 19.210, art. 37 (redacción Ley 19.478, art. 10) — fraccionamiento: se suman los pagos.
//   - Ley 19.210, art. 38 (inciso 2º, redacción Ley 19.732, art. 13) — las excepciones.
//   - Ley 19.210, art. 46 (redacción Ley 19.889, art. 223) — la multa y la solidaridad.
//   - Ley 19.210, arts. 36, 39 y 40 — derogados por Ley 19.889, art. 224.

export interface CashLimitSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra impo.com.uy. */
export const CASH_LIMIT_VERIFIED_AT = '2026-09-02'

/** Tope fijo en UI que siempre se puede pagar en efectivo (Ley 19.210, art. 35, lit. a). */
export const TOPE_FIJO_UI = 200_000

/** Porcentaje del valor total de la operación del literal b (Ley 19.210, art. 35, lit. b). */
export const TOPE_PORCENTAJE = 0.05

/** Techo absoluto del literal b: el 5 % nunca puede superar esta cifra (Ley 19.210, art. 35, lit. b). */
export const TOPE_PORCENTAJE_MAXIMO_UI = 450_000

/** Piso de la multa del art. 46, en UI, cuando el 25 % del monto mal pagado queda por debajo. */
export const MULTA_PISO_UI = 10_000

/** Proporción del monto abonado por medios no permitidos que puede alcanzar la multa (art. 46). */
export const MULTA_PROPORCION = 0.25

/** Años en los que prescriben las infracciones del capítulo (Ley 19.210, art. 46, inciso final). */
export const PRESCRIPCION_ANIOS = 5

// ---------------------------------------------------------------------------
// El cálculo del tope
// ---------------------------------------------------------------------------

/** Cuál de los dos literales del art. 35 termina fijando el techo de una operación. */
export type LiteralAplicable = 'fijo' | 'porcentaje' | 'porcentaje-topeado'

export interface TopeEfectivo {
  /** Máximo pagable en efectivo, en UI. */
  readonly efectivoUi: number
  /** Parte que obligatoriamente va por medios distintos del efectivo, en UI. */
  readonly saldoUi: number
  /** Qué literal del art. 35 manda en este caso. */
  readonly literal: LiteralAplicable
}

/**
 * Máximo pagable en efectivo en una operación, en UI.
 *
 * El art. 35 ofrece DOS condiciones y aclara que «el uso de efectivo será válido cuando se cumpla
 * alguna de las dos condiciones anteriores», así que se toma la más favorable: el mayor entre las
 * 200.000 UI del literal a y el 5 % del valor total de la operación del literal b, con el 5 %
 * limitado a 450.000 UI. «El saldo de la operación, en caso de existir, deberá realizarse por los
 * demás medios de pago distintos del efectivo».
 *
 * De ahí salen los dos quiebres que casi nadie ve: el 5 % recién le gana al tope fijo por encima de
 * las 4.000.000 UI de operación, y a partir de las 9.000.000 UI el techo se congela en 450.000 UI
 * por más que la operación siga creciendo.
 *
 * Operaciones negativas o no numéricas se leen como cero.
 *
 * @param operacionUi valor total de la operación, en UI.
 */
export function topeEfectivo(operacionUi: number): TopeEfectivo {
  const operacion = Number.isFinite(operacionUi) && operacionUi > 0 ? operacionUi : 0

  const porcentajeCrudo = operacion * TOPE_PORCENTAJE
  const porcentaje = Math.min(porcentajeCrudo, TOPE_PORCENTAJE_MAXIMO_UI)

  let literal: LiteralAplicable = 'fijo'
  if (porcentaje > TOPE_FIJO_UI) {
    literal = porcentajeCrudo > TOPE_PORCENTAJE_MAXIMO_UI ? 'porcentaje-topeado' : 'porcentaje'
  }

  // El techo nunca puede exceder la operación misma: en una compra de 50.000 UI se paga todo en
  // efectivo, no «hasta 200.000».
  const efectivoUi = Math.min(Math.max(TOPE_FIJO_UI, porcentaje), operacion)

  return { efectivoUi, saldoUi: operacion - efectivoUi, literal }
}

/** Valor de operación, en UI, a partir del cual el literal b le gana al tope fijo (4.000.000 UI). */
export const QUIEBRE_PORCENTAJE_UI = TOPE_FIJO_UI / TOPE_PORCENTAJE

/** Valor de operación, en UI, a partir del cual el techo queda congelado en 450.000 UI (9.000.000 UI). */
export const QUIEBRE_TECHO_UI = TOPE_PORCENTAJE_MAXIMO_UI / TOPE_PORCENTAJE

/**
 * Multa máxima del art. 46, en UI.
 *
 * «una multa máxima que podrá alcanzar al mayor de los siguientes valores: el 25 % del monto abonado
 * o percibido por medios de pago distintos a los permitidos o 10.000 UI». Es un MÁXIMO: lo que se
 * aplique en cada caso lo fija la reglamentación, no esta cuenta.
 *
 * @param montoIndebidoUi monto pagado en efectivo por encima del tope, en UI.
 */
export function multaMaximaUi(montoIndebidoUi: number): number {
  const monto = Number.isFinite(montoIndebidoUi) && montoIndebidoUi > 0 ? montoIndebidoUi : 0
  return Math.max(monto * MULTA_PROPORCION, MULTA_PISO_UI)
}

/** Convierte un monto en UI a pesos con un valor de UI dado. Valores inválidos devuelven 0. */
export function uiAPesos(montoUi: number, valorUi: number): number {
  if (!Number.isFinite(montoUi) || !Number.isFinite(valorUi)) return 0
  if (montoUi <= 0 || valorUi <= 0) return 0
  return montoUi * valorUi
}

// ---------------------------------------------------------------------------
// Los artículos derogados (el error más repetido sobre este tema)
// ---------------------------------------------------------------------------

export interface ArticuloDerogado {
  readonly articulo: string
  /** De qué trataba, para que el lector reconozca la regla que anda buscando. */
  readonly trataba: string
  readonly derogadoPor: string
  readonly url: string
}

/**
 * Los tres artículos del capítulo que ya no rigen.
 *
 * Importan porque son los que sigue citando media internet: cualquier texto que hoy hable de un
 * régimen especial para vender un auto o escriturar una casa está leyendo una ley que en esa parte
 * murió en 2020. Lo que rige para todas esas operaciones es el art. 35, uno solo y general.
 */
export const ARTICULOS_DEROGADOS: readonly ArticuloDerogado[] = Object.freeze([
  {
    articulo: 'Artículo 36',
    trataba: 'el régimen propio de la enajenación de bienes y prestación de servicios',
    derogadoPor: 'Ley 19.889 (LUC), art. 224, del 09/07/2020',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/36',
  },
  {
    articulo: 'Artículo 39',
    trataba: 'el régimen propio de la enajenación de bienes muebles registrables, como los autos',
    derogadoPor: 'Ley 19.889 (LUC), art. 224, del 09/07/2020',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/39',
  },
  {
    articulo: 'Artículo 40',
    trataba: 'el régimen propio de la enajenación de inmuebles',
    derogadoPor: 'Ley 19.889 (LUC), art. 224, del 09/07/2020',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/40',
  },
])

// ---------------------------------------------------------------------------
// Excepciones (art. 38)
// ---------------------------------------------------------------------------

/**
 * Quiénes quedan fuera del tope, en las palabras del art. 38.
 *
 * La primera entrada es la que le importa a este sitio: cambiar dólares en una casa de cambio
 * regulada por el BCU no tiene el techo del art. 35, porque una de las partes es «una entidad que
 * preste servicios financieros de cambio».
 */
export const EXCEPCIONES: readonly string[] = Object.freeze([
  'Una entidad que preste servicios financieros de cambio, crédito o transferencias domésticas y al exterior regulada por el Banco Central del Uruguay — las casas de cambio entran acá.',
  'Una institución de intermediación financiera, es decir un banco.',
  'Una institución emisora de dinero electrónico.',
  'Las operaciones que la propia Ley 19.210 regula aparte con una regulación específica y diversa.',
])

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface CashLimitFaq {
  readonly question: string
  readonly answer: string
}

export const CASH_LIMIT_FAQ: readonly CashLimitFaq[] = Object.freeze([
  {
    question: '¿Hasta cuánto puedo pagar en efectivo en Uruguay?',
    answer:
      'Hasta 200.000 UI, o hasta el 5 % del valor total de la operación si ese 5 % da más, con un techo de 450.000 UI. Vale la condición que más te convenga de las dos: el artículo 35 de la Ley 19.210 dice que «el uso de efectivo será válido cuando se cumpla alguna de las dos condiciones anteriores». El resto de la operación, si queda saldo, va sí o sí por medios distintos del efectivo.',
  },
  {
    question: '¿Los dólares en efectivo cuentan para el tope?',
    answer:
      'Sí. El artículo 35 define el medio de pago en efectivo como «el papel moneda y la moneda metálica sean nacionales o extranjeros». Pagar en dólares billete no esquiva el límite: los dólares son efectivo a estos efectos igual que los pesos.',
  },
  {
    question: '¿Con qué valor de la UI se calcula el tope?',
    answer:
      'Con el del primer día del mes, no con el del día en que firmás. El artículo 35 cierra diciendo que los valores expresados en unidades indexadas «se convertirán considerando la cotización al primer día de cada mes». O sea que durante todo el mes el techo en pesos es uno solo y ya quedó fijado el día 1.',
  },
  {
    question: '¿Puedo dividir el pago en varias entregas para no pasarme?',
    answer:
      'No. El artículo 37 es específico: para determinar los montos «se sumarán los importes de todos los pagos en que se haya fraccionado la operación o negocio jurídico». Lo que manda es la operación entera, no cada entrega por separado.',
  },
  {
    question: '¿Y si compro o vendo un auto o una casa?',
    answer:
      'Rige el mismo artículo 35 y nada más. Los artículos 39 (bienes muebles registrables) y 40 (inmuebles), que fijaban regímenes propios para esas operaciones, están derogados desde la LUC (Ley 19.889, artículo 224, del 09/07/2020), igual que el artículo 36. Si un texto te manda a esos artículos, está desactualizado.',
  },
  {
    question: '¿El tope aplica cuando cambio dólares en una casa de cambio?',
    answer:
      'No. El artículo 38 excluye las operaciones en las que una de las partes sea «una entidad que preste servicios financieros de cambio, crédito o transferencias domésticas y al exterior regulada por el Banco Central del Uruguay», y también los bancos y las emisoras de dinero electrónico. Cambiar efectivo en una casa de cambio regulada no queda alcanzado por el tope del artículo 35.',
  },
  {
    question: '¿Quién paga la multa si se incumple, el que da o el que recibe?',
    answer:
      'Los dos. El artículo 46 los hace responsables «en forma solidaria tanto quienes paguen como quienes reciban dichos pagos». La única excepción son los honorarios profesionales y los pagos a trabajadores que prestan servicios fuera de la relación de dependencia: ahí responde únicamente quien cobra. La multa máxima es el mayor entre el 25 % del monto mal pagado y 10.000 UI, la controla la Administración Tributaria y prescribe a los cinco años.',
  },
  {
    question: '¿Un comercio puede negarse a recibirme efectivo?',
    answer:
      'Sólo si está habilitado. El artículo 35 faculta al Poder Ejecutivo a habilitar, «a solicitud de parte», que los establecimientos que venden bienes o prestan servicios restrinjan la aceptación de efectivo, con la finalidad de tutelar la integridad física de quienes trabajan ahí y de los usuarios, y con las condiciones generales que fije la reglamentación. No es una decisión que el local tome por su cuenta.',
  },
])

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

export const CASH_LIMIT_SOURCES: readonly CashLimitSource[] = Object.freeze([
  {
    label:
      'Ley 19.210, art. 35 (Restricción al uso del efectivo para ciertos pagos) — texto vigente, redacción dada por la Ley 20.469 de 19/03/2026, art. 3: efectivo «hasta: a) La suma de 200.000 Unidades Indexadas […] o b) El cinco por ciento (5%) del valor total de la operación, siempre que dicho monto no supere las 450.000 Unidades Indexadas»; «El saldo de la operación, en caso de existir, deberá realizarse por los demás medios de pago distintos del efectivo»; «Se entiende por medio de pago en efectivo el papel moneda y la moneda metálica sean nacionales o extranjeros»; «se convertirán considerando la cotización al primer día de cada mes»',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/35',
  },
  {
    label:
      'Ley 19.210, art. 37 (Fraccionamiento de operaciones o pagos) — «se sumarán los importes de todos los pagos en que se haya fraccionado la operación o negocio jurídico»',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/37',
  },
  {
    label:
      'Ley 19.210, art. 38 (Excepciones) — no aplica cuando una de las partes es una institución de intermediación financiera, una emisora de dinero electrónico o «una entidad que preste servicios financieros de cambio, crédito o transferencias domésticas y al exterior regulada por el Banco Central del Uruguay»',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/38',
  },
  {
    label:
      'Ley 19.210, art. 46 (Incumplimientos y sanciones) — multa máxima «al mayor de los siguientes valores: el 25% […] del monto abonado o percibido por medios de pago distintos a los permitidos o 10.000 UI»; responsabilidad solidaria de quien paga y quien cobra; la Administración Tributaria es la autoridad competente; las infracciones «prescribirán a los cinco años de su consumación»',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/46',
  },
  {
    label:
      'Ley 20.469 de 19/03/2026 (publicada el 10/04/2026), art. 3 — «dio nueva redacción a: Ley N° 19.210 de 29/04/2014 artículo 35»',
    url: 'https://www.impo.com.uy/bases/leyes/20469-2026/3',
  },
  {
    label:
      'Ley 19.210, arts. 36, 39 y 40 — «Derogado/s por: Ley N° 19.889 de 09/07/2020 artículo 224»',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/36',
  },
])
