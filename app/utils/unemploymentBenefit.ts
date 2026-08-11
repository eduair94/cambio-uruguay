// app/utils/unemploymentBenefit.ts
// Motor + datos del seguro de paro para /seguro-de-paro-uruguay.
//
// POR QUÉ EXISTE: al auditar 13.196 hilos de r/uruguay, r/AskUruguayan, r/Burises,
// r/UruguayFinanzas y r/LegalUruguay, «me mandaron al seguro de paro, ¿cuánto cobro, cuántos
// meses y por qué me pagan menos cada mes?» apareció como hueco en CINCO análisis temáticos
// independientes (trabajo, salud, educación/carrera, banca y costo de vida). El sitio no tenía
// una sola mención del seguro de paro.
//
// MÓDULO PURO (sin Vue/Nuxt), compartido por la página y `app/tests/unit/unemploymentBenefit.test.ts`.
//
// EL PUNTO QUE LA GENTE NO SABE: el subsidio POR DESPIDO baja mes a mes por diseño (66 % → 40 %)
// Y ADEMÁS tiene un tope distinto para cada mes. Un sueldo alto puede cobrar el tope los seis
// meses y ver que el importe baja igual, sin que nadie le haya descontado nada.
//
// LO QUE NO ES ASÍ, y es el error que este módulo tuvo hasta el 2026-08-10: esa escala decreciente
// es SÓLO del despido. La suspensión total y el trabajo reducido se calculan con el 50 % fijo del
// artículo 7.2 y con un tope único (artículo 7.8, numeral 2), y la extensión por tener 50 años o
// más es SÓLO de la causal despido (artículo 6.3). Ver los comentarios de cada constante: cada
// número de acá tiene su artículo y su página de BPS, y no se generaliza de una causal a otra.
//
// EL ERROR QUE SOBREVIVIÓ AL PRIMER ARREGLO, corregido el 2026-08-10 en una segunda pasada: el
// mínimo del artículo 7.7 se leyó como «1 × la BPC del año» y el módulo publicó un piso de $ 6.864
// que ninguna fuente publica, un 19 % por debajo del que corresponde. La Ley 19.003 pasó los
// mínimos y máximos de las prestaciones a U.R. en 2012: los importes de los artículos 7.7 y 7.8
// están ESCRITOS en BPC pero no se liquidan con la BPC. Ver `BENEFIT_FLOOR`. Moraleja para la
// próxima: cuando un módulo publica DOS importes distintos para UNA regla legal, lo que hay no es
// un matiz para explicar en un comentario, es un error.
//
// LA OTRA MITAD, agregada el 2026-08-10: la palabra «renuncia» no aparecía una sola vez, y el
// hueco más votado en Reddit no era el cálculo sino «¿si renuncio lo pierdo?», «¿arreglo con la
// empresa para que me despidan?», «¿me ampara si soy contratado del Estado?» y «¿me lo cortan si
// abro una unipersonal aunque no facture?». Las tres primeras tienen respuesta publicada por BPS
// y MTSS. La cuarta NO la tiene, y por eso acá se publica la ausencia en vez de una tranquilidad
// inventada: ver `UNIPERSONAL_WHILE_ON_BENEFIT`.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-10 (el texto de IMPO se leyó en la versión
// «Documento actualizado», o sea el VIGENTE, no en `/bases/decretos-ley-originales/`):
//   - Decreto-Ley 15.180 y Ley 18.399 — régimen del subsidio por desempleo. Resumen oficial:
//     MTSS, «Seguro de paro»
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/seguro-paro
//   - IMPO, texto VIGENTE del Decreto-Ley 15.180 (arts. 1, 2, 4, 5, 6.1 a 6.4, 7.1 a 7.10 y 8,
//     casi todos con la redacción que les dio la Ley 18.399 de 24/10/2008)
//     https://www.impo.com.uy/bases/decretos-ley/15180-1981
//   - BPS, «Subsidio por desempleo por despido» (beneficiarios, requisitos, restricciones,
//     porcentajes, duración, topes 2026, multiempleo, plazos y forma de pago).
//     https://www.bps.gub.uy/4802/subsidio-por-desempleo-por-despido.html
//   - BPS, «Subsidio por desempleo por suspensión», que cubre TAMBIÉN el trabajo reducido
//     (50 %, topes máximo y mínimo de enero 2026, plazo de la empresa)
//     https://www.bps.gub.uy/18239/subsidio-por-desempleo-por-suspension.html
//   - BPS, R.D. 18-16/2005, «Renuncia incentivada y subsidio por desempleo»
//     https://www.bps.gub.uy/3904/18-16-2005-subsidio-por-desemepleo---retiro-incentivado-en-el-sector-privado-no-es-despido.html
//   - BPS, «Reclamos de subsidio por desempleo» (qué prueba se exige para discutir la causal)
//     https://www.bps.gub.uy/18258/reclamos-de-subsidio-por-desempleo.html
//
// LA BPC NO SE DUPLICA ACÁ: sale de `URUGUAY.bpc` en `calculators.ts`, que ya está auditada. PERO
// NO TODA «BPC» DE ESTE RÉGIMEN ES LA BPC: los topes del artículo 7.8 y el mínimo del 7.7 están
// escritos en BPC y sin embargo NO se liquidan con la BPC del año, porque la Ley 19.003 los pasó a
// U.R. en 2012. Ver `BENEFIT_FLOOR`, que es donde está la demostración con los números de BPS.

import { URUGUAY } from './calculators'

/** Fecha en que cada cifra de este módulo se contrastó con las fuentes de arriba. */
export const UNEMPLOYMENT_VERIFIED_AT = '2026-08-10'

/** Los topes que publica BPS corresponden a este año. BPS los actualiza. */
export const UNEMPLOYMENT_CAPS_YEAR = 2026

export interface BenefitSource {
  label: string
  url: string
}

export const UNEMPLOYMENT_SOURCES: readonly BenefitSource[] = Object.freeze([
  {
    label: 'MTSS — Seguro de paro (Decreto-Ley 15.180 y Ley 18.399)',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/seguro-paro',
  },
  {
    label: 'BPS — Subsidio por desempleo por despido (requisitos, topes 2026, multiempleo)',
    url: 'https://www.bps.gub.uy/4802/subsidio-por-desempleo-por-despido.html',
  },
  {
    label: 'BPS — Subsidio por desempleo por suspensión y por reducción laboral',
    url: 'https://www.bps.gub.uy/18239/subsidio-por-desempleo-por-suspension.html',
  },
  {
    label: 'IMPO — Decreto-Ley 15.180, texto vigente (arts. 5, 6.1 a 6.4, 7.1 a 7.10 y 8)',
    url: 'https://www.impo.com.uy/bases/decretos-ley/15180-1981',
  },
  {
    label: 'BPS — R.D. 18-16/2005: la renuncia incentivada no es despido',
    url: 'https://www.bps.gub.uy/3904/18-16-2005-subsidio-por-desemepleo---retiro-incentivado-en-el-sector-privado-no-es-despido.html',
  },
  {
    label: 'BPS — Reclamos de subsidio por desempleo (discrepancia con la causal)',
    url: 'https://www.bps.gub.uy/18258/reclamos-de-subsidio-por-desempleo.html',
  },
])

// ---------------------------------------------------------------------------
// Régimen
// ---------------------------------------------------------------------------

export type Causal = 'despido' | 'suspension' | 'reduccion'

export interface CausalDef {
  id: Causal
  label: string
  /** Qué situación es, en las palabras del trabajador. */
  what: string
  /** Meses de subsidio en el régimen general (art. 6.1 literal A). */
  months: number
  /** Equivalente en jornales, para quien cobra por día (art. 6.1 literal B). */
  jornales: number
}

export const CAUSALES: readonly CausalDef[] = Object.freeze([
  {
    id: 'despido',
    label: 'Despido',
    what: 'Te desvincularon. Es la única causal con porcentaje decreciente, la única con un tope distinto cada mes y la única que se extiende a los 50 años.',
    months: 6,
    jornales: 72,
  },
  {
    id: 'suspension',
    label: 'Suspensión total',
    what: 'La empresa te suspendió: no trabajás ni cobrás sueldo, pero seguís siendo empleado. Se paga el 50 % fijo del promedio.',
    months: 4,
    jornales: 48,
  },
  {
    id: 'reduccion',
    label: 'Trabajo reducido',
    what: 'Te bajaron las jornadas del mes o las horas del día al menos un 25 %. Se cobra la diferencia entre el 50 % del promedio y lo que seguís cobrando.',
    months: 6,
    jornales: 72,
  },
])

/**
 * Meses extra para quien tiene 50 años o más al configurarse la causal.
 *
 * SÓLO EN LA CAUSAL DESPIDO. El artículo 6.3 lo dice con esas palabras: «En los casos de despido
 * de trabajadores que contaren con cincuenta o más años de edad al momento de producirse aquél,
 * los máximos totales resultantes de la aplicación de los artículos 6.1 y 6.2, se extenderán por
 * otros seis meses o setenta y dos jornales». BPS publica la extensión únicamente en la página de
 * despido; la página de suspensión y reducción no la menciona en ningún lado.
 */
export const EXTENSION_MONTHS_50_PLUS = 6

/**
 * Jornales de la extensión, según BPS: «tienen derecho a una extensión de seis meses o 54 jornales
 * más». OJO: el artículo 6.3 dice «seis meses o setenta y dos jornales». Las dos fuentes se
 * contradicen y acá se publica la de BPS porque BPS es quien liquida, pero queda anotado para que
 * nadie lo «corrija» al revés sin leer las dos.
 */
export const EXTENSION_JORNALES_50_PLUS_BPS = 54
export const EXTENSION_JORNALES_50_PLUS_LEY = 72

/** Porcentaje del promedio de los últimos 6 meses, por mes de subsidio (causal despido, art. 7.1). */
export const DESPIDO_PERCENTAGES: readonly number[] = Object.freeze([66, 57, 50, 45, 42, 40])

/**
 * Topes 2026 publicados por BPS, uno por cada mes de subsidio por despido.
 *
 * EL ARTÍCULO 7.8 NUMERAL 1 LOS ESCRIBE EN BPC —11, 9,5, 8, 7, 6,5 y 6 BPC—, PERO ESOS PESOS NO
 * SON MÚLTIPLOS DE LA BPC VIGENTE, y confundirlo es el error del que salió el piso inventado que
 * este módulo publicó hasta el 2026-08-10. Al pie de los artículos 7.x, IMPO anota la Ley 19.003
 * de 16/11/2012: «a partir del 01/01/2012 los montos mínimos y máximos de las prestaciones de
 * seguridad social, se convertirán a U.R.». Desde entonces la unidad de estos topes dejó de seguir
 * a la BPC. Se comprueba con la propia tabla de BPS: 93.155/11 = 80.445/9,5 = 67.754/8 =
 * 59.287/7 = 55.044/6,5 = 50.802/6 ≈ $ 8.468, mientras que la BPC 2026 es $ 6.864. Con la BPC el
 * primer tope daría $ 75.504, que no es lo que BPS paga. Ver {@link BENEFIT_FLOOR}.
 *
 * NO SON UN PORCENTAJE DE UN TOPE ÚNICO NI SE RECALCULAN ACÁ: es la tabla que BPS publica mes a
 * mes y que no se deriva de una sola base salarial (93.155/0,66 = 141.144 pero 67.754/0,50 =
 * 135.508). Se guarda como tabla y no como fórmula: cualquier "simplificación" acá inventa plata.
 * Que todos los importes compartan unidad sirve para saber cuánto vale el mínimo del art. 7.7, no
 * para reconstruir los topes con una multiplicación.
 */
export const DESPIDO_MONTHLY_CAPS: readonly number[] = Object.freeze([
  93155, 80445, 67754, 59287, 55044, 50802,
])

/**
 * Suspensión total Y trabajo reducido: porcentaje fijo del promedio, sin escalonamiento.
 *
 * Art. 7.2: el subsidio por suspensión total «será el equivalente al 50 % del promedio mensual».
 * Art. 7.3: el del trabajo reducido «será la diferencia que existiera entre el monto del subsidio
 * calculado conforme al artículo 7.2 y lo efectivamente percibido». O sea que la reducción parte
 * del MISMO 50 %, no de la escala del despido. BPS lo trata en la misma página que la suspensión.
 */
export const SUSPENSION_PERCENTAGE = 50

/**
 * Tope máximo de la causal suspensión (enero 2026, publicado por BPS).
 *
 * SE USA TAMBIÉN EN TRABAJO REDUCIDO porque el artículo 7.8 los pone en el mismo numeral con el
 * mismo máximo: «2) Para los empleados en situación de suspensión total de la actividad o trabajo
 * reducido, el equivalente a 8 BPC por cada mes de subsidio». BPS publica un solo importe para esa
 * regla y lo rotula «Tope máximo por suspensión»; no publica uno distinto para la reducción.
 */
export const SUSPENSION_CAP = 67754

/**
 * EL PISO. UNO SOLO, Y ES ESTE.
 *
 * Importe publicado por BPS (enero 2026) en la página de suspensión: «Tope mínimo por suspensión:
 * $ 8.467». Es el único piso que alguna fuente publica con un importe concreto.
 *
 * QUÉ CAUSALES ALCANZA: el artículo 7.7 fija UN mínimo con UNA redacción para TRES artículos —«El
 * monto del subsidio, resultante de la aplicación de los artículos 7.1, 7.2 y 7.5, no podrá ser
 * inferior a 1 BPC, para relaciones de trabajo de veinticinco jornadas mensuales y ocho horas
 * diarias de labor, debiendo adecuarse proporcionalmente en los casos de menos o menores
 * jornadas»—. El 7.1 es el despido, el 7.2 la suspensión total y el 7.5 los períodos
 * suplementarios: los tres tienen el mismo mínimo, no uno cada uno. NO nombra al 7.3, que es el
 * trabajo reducido: por eso la reducción no lleva piso acá, la norma no se lo pone y no se lo
 * vamos a poner nosotros.
 *
 * POR QUÉ NO ES `1 × URUGUAY.bpc` ($ 6.864), que es lo que este módulo publicó hasta el
 * 2026-08-10 y que ninguna fuente publica: porque la Ley 19.003 de 16/11/2012, anotada al pie de
 * los artículos 7.x en IMPO, dispuso que «a partir del 01/01/2012 los montos mínimos y máximos de
 * las prestaciones de seguridad social, se convertirán a U.R.». Desde entonces la «BPC» de los
 * artículos 7.7 y 7.8 es una unidad de cuenta congelada, no la BPC del año. La prueba está en la
 * tabla de topes que BPS publica EN LA PROPIA PÁGINA DE DESPIDO: los seis topes son los 11, 9,5,
 * 8, 7, 6,5 y 6 «BPC» del artículo 7.8 a razón de ≈ $ 8.468 cada uno (93.155/11, 80.445/9,5,
 * 67.754/8, 59.287/7, 55.044/6,5, 50.802/6), y $ 8.467 es exactamente una de esas unidades: el
 * «1 BPC» del artículo 7.7. Publicar $ 6.864 dejaba el piso de despido un 19 % por debajo del
 * legal — con un promedio de $ 20.000, el sexto mes salía $ 8.000 cuando no puede bajar de
 * $ 8.467.
 *
 * LO QUE NO SE PUBLICA, porque no se pudo verificar: a cuántas U.R. equivale. Al valor de la U.R.
 * de enero 2026 que publica DGI ($ 1.851,83) el importe no da un número redondo, así que el
 * mecanismo exacto de la conversión queda sin afirmar. Lo verificado es la unidad en pesos.
 *
 * OJO CON LA OTRA BPC: los aportes previos de {@link REQUIREMENTS} (6 BPC = $ 41.184, 9 BPC =
 * $ 61.776, 12 BPC = $ 82.368) SÍ van con la BPC vigente de `URUGUAY.bpc` — BPS los publica con
 * esos pesos. Son cosas distintas: una es un requisito de aportación, la otra un tope de
 * prestación alcanzado por la Ley 19.003.
 */
export const BENEFIT_FLOOR = 8467

/**
 * Alias histórico del mismo importe. Se mantiene porque BPS lo rotula «tope mínimo por
 * suspensión», pero NO es un piso exclusivo de esa causal: ver {@link BENEFIT_FLOOR}.
 */
export const SUSPENSION_FLOOR = BENEFIT_FLOOR

/** El «1 BPC» con el que está ESCRITO el artículo 7.7. Es la cifra del texto, no un importe. */
export const LEGAL_FLOOR_ARTICLE_BPC = 1

/**
 * El piso del art. 7.7 en pesos, para jornada completa.
 *
 * NO MULTIPLIQUES `LEGAL_FLOOR_ARTICLE_BPC` POR `URUGUAY.bpc` PARA "ARREGLARLO": eso es el bug.
 * Hay un test que lo impide.
 */
export const legalFloor = (): number => BENEFIT_FLOOR

/** Complemento por cargas familiares (art. 7.10). */
export const FAMILY_COMPLEMENT_PCT = 20

/**
 * El ingreso de la persona a cargo no puede superar 1 BPC para habilitar el complemento.
 * Se toma de `URUGUAY.bpc` para no duplicar el valor.
 *
 * ESTE SÍ ES BPC, a diferencia del piso del artículo 7.7: lo que la Ley 19.003 pasó a U.R. son
 * «los montos mínimos y máximos de las prestaciones», y esto no es un mínimo ni un máximo de la
 * prestación sino un requisito de ingreso del familiar. Ninguna fuente lo publica en otra unidad.
 */
export const dependantIncomeCap = (): number => URUGUAY.bpc

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

export interface BenefitInput {
  /** Promedio mensual de las remuneraciones NOMINALES computables de los últimos 6 meses. */
  averageNominal: number
  causal: Causal
  /** Edad al configurarse la causal. 50 o más extiende la prestación, pero sólo en despido. */
  age: number
  /** ¿Tiene cónyuge, concubino, hijos menores o personas a cargo con ingresos de hasta 1 BPC? */
  hasDependants: boolean
  /**
   * Sólo en trabajo reducido: lo que sigue cobrando de la empresa por mes. El subsidio cubre la
   * diferencia contra el 50 % del promedio, no el sueldo entero.
   */
  reducedIncome?: number
}

export interface BenefitMonth {
  month: number
  /** Porcentaje aplicado al promedio. */
  percentage: number
  /** Lo que da la cuenta antes del tope, antes del piso y antes del complemento. */
  gross: number
  /** Tope aplicable a ese mes. `null` cuando la causal no lo tiene por mes. */
  cap: number | null
  /** Piso aplicable a ese mes. `null` cuando la causal no tiene mínimo publicado ni legal. */
  floor: number | null
  /** `true` cuando el tope, y no el porcentaje, es lo que define el importe. */
  cappedByLimit: boolean
  /** `true` cuando el piso, y no el porcentaje, es lo que define el importe. */
  raisedToFloor: boolean
  /** Complemento por cargas familiares efectivamente sumado. */
  complement: number
  /** Lo que se cobra ese mes. */
  amount: number
  /** `true` cuando este mes viene de la extensión por tener 50 años o más. */
  isExtension: boolean
}

export interface BenefitResult {
  causal: CausalDef
  months: BenefitMonth[]
  /** Total de todo el período. */
  total: number
  /** Cuántos meses dura en total, ya con la extensión si corresponde. */
  totalMonths: number
  /** Notas que la página muestra: qué regla se activó en este caso concreto. */
  notes: string[]
}

const round0 = (n: number): number => Math.round(n)

const causalDef = (id: Causal): CausalDef => CAUSALES.find(c => c.id === id) as CausalDef

/**
 * Calcula el subsidio mes a mes.
 *
 * ORDEN DE LAS OPERACIONES, que es donde se equivocan las calculadoras que circulan:
 *   1. porcentaje sobre el promedio (art. 7.1 en despido, 7.2 en suspensión y reducción);
 *   2. en reducción, restar lo que se sigue percibiendo (art. 7.3);
 *   3. tope del mes (art. 7.8);
 *   4. piso, si la causal tiene (art. 7.7 / tope mínimo de BPS);
 *   5. RECIÉN AHÍ el complemento del 20 %.
 *
 * El paso 5 va último por el artículo 7.9: «A los mínimos y máximos previstos por dichos
 * artículos, se adicionará el suplemento establecido en el artículo 7.10, si correspondiere». El
 * 20 % se SUMA al mínimo y al máximo, no se absorbe dentro de ellos.
 */
export function estimateUnemploymentBenefit(input: BenefitInput): BenefitResult {
  const causal = causalDef(input.causal)
  const avg = Math.max(0, input.averageNominal || 0)
  const notes: string[] = []

  // Art. 6.3: la extensión es de la causal despido. Un suspendido de 55 años sigue teniendo
  // cuatro meses, y un trabajo reducido, seis.
  const isFifty = input.age >= 50
  const extend = isFifty && causal.id === 'despido'
  if (extend) {
    notes.push(
      `Con 50 años o más la prestación por despido se extiende ${EXTENSION_MONTHS_50_PLUS} meses más. En jornales BPS publica ${EXTENSION_JORNALES_50_PLUS_BPS} y el artículo 6.3 dice ${EXTENSION_JORNALES_50_PLUS_LEY}: acá va el de BPS, que es quien liquida.`
    )
  } else if (isFifty) {
    notes.push(
      'La extensión de seis meses por tener 50 años o más es sólo de la causal despido: el artículo 6.3 la limita a ese caso y BPS no la publica en la página de suspensión y reducción.'
    )
  }

  const baseMonths = causal.months
  const totalMonths = baseMonths + (extend ? EXTENSION_MONTHS_50_PLUS : 0)
  const months: BenefitMonth[] = []

  // Con promedio 0 no hay subsidio que tenga mínimo: el piso es el mínimo de una prestación que
  // existe, no un pago a quien no declaró remuneración computable.
  const applyFloor = avg > 0

  for (let i = 0; i < totalMonths; i++) {
    const isExtension = i >= baseMonths
    // En la extensión se mantiene el último porcentaje y el último tope del régimen general
    // (art. 7.5, que remite al literal F del art. 7.1): no vuelve a empezar en 66 %.
    const idx = Math.min(i, DESPIDO_PERCENTAGES.length - 1)

    let percentage: number
    let cap: number | null
    let floor: number | null
    if (causal.id === 'despido') {
      percentage = DESPIDO_PERCENTAGES[idx]
      cap = DESPIDO_MONTHLY_CAPS[idx]
      // Mismo piso que la suspensión: el art. 7.7 fija UN mínimo para el 7.1, el 7.2 y el 7.5.
      floor = applyFloor ? legalFloor() : null
    } else if (causal.id === 'suspension') {
      percentage = SUSPENSION_PERCENTAGE
      cap = SUSPENSION_CAP
      floor = applyFloor ? BENEFIT_FLOOR : null
    } else {
      // Trabajo reducido: art. 7.3 calcula sobre el 7.2 (50 %) y art. 7.8 numeral 2 le pone el
      // mismo máximo que a la suspensión total. El art. 7.7 no lo nombra, así que no lleva piso.
      percentage = SUSPENSION_PERCENTAGE
      cap = SUSPENSION_CAP
      floor = null
    }

    let gross = (avg * percentage) / 100

    // Trabajo reducido: se cobra la diferencia contra lo que se sigue percibiendo (art. 7.3).
    if (causal.id === 'reduccion') {
      gross = Math.max(0, gross - Math.max(0, input.reducedIncome || 0))
    }

    const capped = cap !== null ? Math.min(gross, cap) : gross
    const cappedByLimit = cap !== null && gross > cap

    // Art. 7.9: primero el piso, y el suplemento del 20 % se adiciona después.
    const base = floor !== null ? Math.max(capped, floor) : capped
    const raisedToFloor = floor !== null && capped < floor

    const complement = input.hasDependants ? (base * FAMILY_COMPLEMENT_PCT) / 100 : 0
    const amount = base + complement

    months.push({
      month: i + 1,
      percentage,
      gross: round0(gross),
      cap,
      floor,
      cappedByLimit,
      raisedToFloor,
      complement: round0(complement),
      amount: round0(amount),
      isExtension,
    })
  }

  if (months.some(m => m.cappedByLimit)) {
    notes.push(
      `Tu sueldo supera el tope de BPS en al menos un mes: ahí no cobrás el porcentaje sino el tope de ${UNEMPLOYMENT_CAPS_YEAR}.`
    )
  }
  if (input.hasDependants) {
    notes.push(
      `Se sumó el complemento del ${FAMILY_COMPLEMENT_PCT} % por cargas familiares, sobre el importe ya topeado. Hay que pedirlo en BPS: no sale solo.`
    )
  }
  if (causal.id === 'despido') {
    notes.push(
      'El importe baja todos los meses por diseño del régimen, del 66 % al 40 % del promedio. No es un error de liquidación.'
    )
  }
  if (causal.id === 'reduccion') {
    notes.push(
      'En trabajo reducido la base es el 50 % del promedio (artículo 7.2, al que remite el 7.3), no la escala decreciente del despido: se cobra la diferencia entre ese 50 % y lo que seguís cobrando de la empresa.'
    )
  }
  if (months.some(m => m.raisedToFloor)) {
    notes.push(
      `El porcentaje da por debajo del mínimo del artículo 7.7, así que la cuenta lo levanta hasta ahí. Ese mínimo es uno solo para despido, suspensión total y períodos suplementarios —el artículo nombra a los tres—, y en pesos es el mismo importe de $ 8.467 que BPS publica como tope mínimo. Ojo con una confusión cara: el artículo lo escribe como «${LEGAL_FLOOR_ARTICLE_BPC} BPC», pero no se liquida con la BPC del año, porque la Ley 19.003 pasó los mínimos y máximos de las prestaciones a U.R. en 2012. Es para jornada completa (25 jornadas de 8 horas) y «debe adecuarse proporcionalmente» si trabajabas menos.`
    )
  }

  return {
    causal,
    months,
    total: round0(months.reduce((n, m) => n + m.amount, 0)),
    totalMonths,
    notes,
  }
}

// ---------------------------------------------------------------------------
// Requisitos y cortes
// ---------------------------------------------------------------------------

export interface Requirement {
  label: string
  detail: string
}

/**
 * Aportes previos exigidos.
 *
 * SON ACUMULATIVOS, NO ALTERNATIVOS: BPS escribe «haber computado en los 180 días en planilla y
 * 150 jornales trabajados» y «haber computado 180 días en planilla y un mínimo de 6 BPC». Un
 * jornalero con los 150 jornales pero sin los 180 días no cumple. Publicarlos como opciones —el
 * error que este módulo tuvo— le dice a alguien que tiene derecho cuando no lo tiene.
 *
 * Y NO SON TRASLADABLES: los tres primeros son los de industria y comercio. En el rural cambia el
 * período (30 meses) Y CAMBIAN LAS CANTIDADES (270 días, 225 jornales, 9 BPC), y el mensual rural
 * que se guiara por los 180 días de acá se creería con derecho teniendo 90 días menos de los que
 * BPS le pide. Publicar sólo el cambio de período —el error que este módulo tuvo hasta el
 * 2026-08-10— es el mismo modo de falla que publicar los requisitos como alternativas.
 *
 * OJO TAMBIÉN CON EL CARTEL DE «ACUMULATIVOS»: en el rural, el que cobra por día o por hora tiene
 * un solo requisito, 225 jornales, sin exigencia de días en planilla. La acumulación es de
 * industria y comercio y del doméstico, no de todo el régimen.
 *
 * LAS BPC DE ACÁ SÍ SON BPC: 6 BPC = $ 41.184, 9 BPC = $ 61.776 y 12 BPC = $ 82.368 son los pesos
 * que publica BPS con la BPC 2026 de `URUGUAY.bpc`. No confundir con la «BPC» de los topes y del
 * mínimo de los artículos 7.7 y 7.8, que la Ley 19.003 pasó a U.R. (ver {@link BENEFIT_FLOOR}).
 */
export const REQUIREMENTS: readonly Requirement[] = Object.freeze([
  {
    label: 'Industria y comercio, si cobrás por mes',
    detail:
      '180 días en planilla (seis meses de trabajo registrado) en los 12 meses previos a configurarse la causal.',
  },
  {
    label: 'Industria y comercio, si cobrás por jornal',
    detail:
      'Los dos requisitos juntos: 180 días en planilla Y 150 jornales trabajados en esos 12 meses. Tener los jornales sin los días no alcanza.',
  },
  {
    label: 'Industria y comercio, si cobrás a destajo o por comisión',
    detail:
      'También los dos juntos: 180 días en planilla Y haber percibido un mínimo de 6 BPC ($ 41.184 según la propia página de BPS) en esos 12 meses.',
  },
  {
    label: 'Si sos rural',
    detail:
      'Otro período y otras cantidades: en los 30 meses previos, 270 días en planilla si cobrás por mes; 225 jornales trabajados si cobrás por día o por hora; 9 BPC ($ 61.776) percibidos si sos destajista. No te sirven los 180 días de industria y comercio: BPS te pide 270. Y el jornalero rural tiene ese único requisito de 225 jornales, sin exigencia de días en planilla.',
  },
  {
    label: 'Si trabajás en casa de familia (servicio doméstico)',
    detail:
      'En los últimos 12 meses: 180 días registrada en BPS si cobrás por mes; 180 días Y 150 jornales efectivamente trabajados si cobrás por día o por hora; 180 días Y haber percibido al menos 6 BPC ($ 41.184) si sos destajista. En su defecto, mirando 24 meses: 360 días; 360 días Y 250 jornales; 360 días Y 12 BPC ($ 82.368), respectivamente.',
  },
])

export interface CoverageRule {
  label: string
  /** `true` cuando BPS lo lista como beneficiario; `false` cuando lo lista como restricción. */
  covered: boolean
  detail: string
}

/**
 * A quién ampara el régimen.
 *
 * CÓMO LEER ESTA LISTA: el artículo 1 del Decreto-Ley 15.180 comprende a «todos los empleados de
 * la actividad privada que prestan servicios remunerados a terceros», y cada colectivo que no sea
 * ese entra porque una norma lo incorporó y BPS lo enumera por su nombre o por su vínculo
 * funcional. Lo de abajo reproduce la enumeración de BPS a la fecha de verificación, con sus
 * vínculos: es un mapa para buscar tu caso, no una lista clausurada. Si no encontrás el tuyo, lo
 * que corresponde es preguntarlo por escrito en BPS, no deducir que estás afuera.
 */
export const COVERAGE_RULES: readonly CoverageRule[] = Object.freeze([
  {
    label: 'Dependiente de la actividad privada',
    covered: true,
    detail:
      'Es el caso base del artículo 1: el régimen comprende obligatoriamente a los empleados de la actividad privada que prestan servicios remunerados a terceros.',
  },
  {
    label: 'Rural y servicio doméstico',
    covered: true,
    detail:
      'BPS los lista como beneficiarios, pero con requisitos propios que no son los de industria y comercio: en el rural, 30 meses de referencia y 270 días en planilla si cobrás por mes, 225 jornales si cobrás por día o por hora, o 9 BPC ($ 61.776) si sos destajista; en el doméstico, 180 días registrada en los últimos 12 meses (o 360 en los últimos 24), más 150 jornales si cobrás por día u hora (250 en la variante de 24 meses) o 6 BPC si sos destajista (12 BPC en la de 24 meses). Lo que cambia no es sólo el período: también las cantidades.',
  },
  {
    label: 'Contrato a término del Estado',
    covered: true,
    detail:
      'BPS ampara a trabajadores con contrato a término del Poder Ejecutivo y otros organismos con aporte civil: vínculo funcional 61 (contratos a término de la Ley 17.556) contratados por un plazo mínimo de 24 meses, y vínculo funcional 94 (contrato laboral de la Administración Central), este sin exigencia de tiempo de contratación.',
  },
  {
    label: 'Programas de empleo juvenil (Ley 19.133)',
    covered: true,
    detail:
      'BPS los nombra entre los beneficiarios por su vínculo funcional: 105 (primera experiencia laboral), 106 (práctica laboral para egresados) y 107 (trabajo protegido joven). Es un colectivo que suele darse por excluido y que está adentro.',
  },
  {
    label: 'Colectivos incorporados de a uno',
    covered: true,
    detail:
      'Construcción, packing de frutas y verduras, personal de INAC, la Corporación Nacional para el Desarrollo y el LATU, docentes o maestros de instituciones privadas, docentes de la Escuela y Liceo Elbio Fernández, educandos del Movimiento Tacurú con dos años ininterrumpidos en planilla, socios cooperativistas, trabajadores profesionales del deporte y asistentes personales. Son nombres propios que BPS agrega a su lista: si el tuyo no aparece, preguntalo en BPS antes de descartarlo.',
  },
  {
    label: 'Titulares de empresa, salvo el vínculo 60 o 166',
    covered: false,
    detail:
      'BPS lo pone entre las restricciones: no tienen derecho «los titulares de empresa por su calidad de tales». Pero la misma página tiene una excepción nombrada entre los beneficiarios: los titulares de empresas unipersonales con vínculo funcional 60 o 166 (personal de embajada). O sea que ser titular de una unipersonal no te deja afuera de plano: te deja afuera salvo que tu vínculo sea uno de esos dos.',
  },
  {
    label: 'Funcionario público fuera de esas modalidades',
    covered: false,
    detail:
      'No figura en la lista de beneficiarios que publica BPS. El régimen es de la actividad privada y del Estado BPS nombra los vínculos 61 y 94; el resto no aparece enumerado. Que no aparezca no es lo mismo que una norma que te excluya: si tu vínculo no es el 61 ni el 94, pedí la respuesta por escrito en BPS antes de contar con el subsidio.',
  },
])

export interface ExitRule {
  /** Cómo terminó el vínculo, en las palabras del trabajador. */
  situation: string
  /** `true` cuando esa forma de terminar habilita el subsidio. */
  gives: boolean
  detail: string
}

/**
 * Cómo terminaste el vínculo decide todo, y es lo que no se pregunta a tiempo.
 *
 * EL ERROR QUE SE PAGA CARO: creer que si la empresa paga la indemnización por despido, entonces
 * «fue un despido» a los efectos del subsidio. No: lo que mira BPS es si la desocupación fue
 * forzosa e inimputable a tu voluntad (art. 2 del Decreto-Ley 15.180), y un acuerdo de salida no
 * lo es aunque venga con la indemnización adentro.
 *
 * DE DÓNDE SALE CADA COSA: la regla general es el artículo 2. La R.D. 18-16/2005 no es una norma
 * de alcance nacional y acá no se la presenta como tal: es el precedente que muestra cómo el
 * Directorio de BPS aplicó ese artículo a un retiro incentivado concreto. Su parte resolutiva
 * proyecta los criterios «a todas las situaciones semejantes que se produzcan en la empresa» de
 * ese expediente, y el Considerando VI habla de «la empresa involucrada». Sirve para anticipar el
 * criterio de BPS, no para afirmar que ya está resuelto para todo el mundo.
 */
export const EXIT_RULES: readonly ExitRule[] = Object.freeze([
  {
    situation: 'Te despidieron',
    gives: true,
    detail:
      'Es la causal del artículo 5 literal A). BPS describe el subsidio como el de «aquellos trabajadores que quedan sin empleo contra su voluntad por despido o término de contrato».',
  },
  {
    situation: 'Se te terminó el contrato a término',
    gives: true,
    detail:
      'BPS lo nombra junto al despido, y es una de las dos causales por las que te habilita a pedir el subsidio vos mismo por los servicios en línea.',
  },
  {
    situation: 'Renunciaste',
    gives: false,
    detail:
      'El artículo 2 del Decreto-Ley 15.180 exige estar «en situación de desocupación forzosa no imputable a su voluntad o capacidad laboral», y el MTSS lista entre quienes no tienen derecho a «los que hacen abandono voluntario del trabajo». La renuncia no es causal: no hay una forma de renunciar que habilite el subsidio.',
  },
  {
    situation: 'Arreglaste la salida con la empresa (retiro o renuncia incentivada)',
    gives: false,
    detail:
      'Acá es donde la gente se quema, y la regla que lo decide es la misma de siempre: el artículo 2 pide desocupación forzosa e inimputable a tu voluntad, y un acuerdo de salida no lo es aunque te paguen la indemnización por despido. Cómo lo aplica BPS se ve en un precedente concreto: en 2005 el Directorio negó el subsidio a ex trabajadores que salieron por un retiro incentivado en el que la empresa pagó todos los créditos laborales, la indemnización por despido incluida, más un monto adicional por la renuncia. Razonó que el despido «es un acto unilateral del empleador por el que se pone fin al contrato de trabajo, que no requiere el consentimiento de la otra parte», que ahí en cambio hubo «un acuerdo de voluntades», y que por lo tanto la desocupación «no reviste las características de forzosa e inimputable a sus voluntades» (R.D. 18-16/2005). Esa resolución no rige para todo el país —su numeral 2º manda aplicar los criterios «a todas las situaciones semejantes que se produzcan en la empresa» del caso—, pero muestra con qué vara mira BPS estos acuerdos.',
  },
  {
    situation: 'Te despidieron por razones disciplinarias',
    gives: false,
    detail:
      'BPS lo lista entre quienes no tienen derecho. El MTSS lo redacta como «los despedidos por notoria mala conducta o suspendidos por razones disciplinarias, lo que se probará en el expediente administrativo que realice el Seguro de Paro»: que la empresa lo afirme no lo da por probado.',
  },
])

/**
 * Qué prueba pide BPS cuando la causal que declaró la empresa no es la real.
 *
 * ES UNA LISTA CORTA A PROPÓSITO: BPS no revisa el fondo en la ventanilla. Sin uno de estos dos
 * papeles no hay reclamo que avance, y conseguirlos lleva tiempo — por eso el plazo de la reserva
 * de derecho se pide igual mientras se pelea la causal.
 */
export const CAUSAL_DISPUTE_PROOF: readonly string[] = Object.freeze([
  'Sentencia favorable de juicio laboral.',
  'Acta de conciliación con acuerdo ante el Ministerio de Trabajo y Seguridad Social o ante sede judicial.',
])

/**
 * Situaciones que cortan el subsidio (art. 8) más las restricciones que publica BPS.
 *
 * LAS DOS EXCEPCIONES QUE NO SE PUEDEN OMITIR: el literal A) excluye expresamente de la hipótesis
 * de «reintegro» a la continuación del trabajo en régimen reducido, y el literal D) sólo funciona
 * en la causal despido y pasada la mitad del período. Publicarlos sin sus condiciones —el error
 * que este módulo tuvo— asusta a gente que no está en esa situación.
 */
export const TERMINATION_CAUSES: readonly string[] = Object.freeze([
  'Volvés a una actividad remunerada, aunque sea changa o por poco tiempo. Con dos salvedades escritas: el literal A) del artículo 8 deja afuera de esa hipótesis «la continuación del desarrollo de actividad en régimen reducido» (la causal del literal C) del artículo 5), y BPS, en su sección de multiempleo, mantiene el subsidio a quien tiene otra actividad como dependiente con aportación industria y comercio, rural, doméstica o construcción, amparándolo por la empresa que lo mandó al seguro.',
  'Rechazás sin causa legítima un empleo conveniente: es el literal B), con esas palabras.',
  'Te jubilás: el literal C) corta el subsidio «cuando se acoja a la jubilación», y BPS lista entre las restricciones a quienes perciban jubilación o adelanto prejubilatorio.',
  'Faltás a la capacitación laboral, pero sólo con las tres condiciones del literal D) que la Ley 18.399 le agregó al artículo 8: tiene que ser «en las hipótesis de despido», tiene que haber transcurrido «la mitad de los períodos» del artículo 6.1, y tienen que ser cursos «que se implementen en el ámbito del Ministerio de Trabajo y Seguridad Social», faltando «en forma injustificada». En suspensión, en trabajo reducido o en el primer tramo del despido, no aplica.',
  'Cobrás otros ingresos por una actividad no amparada por el Decreto-Ley 15.180, o estás amparado por el mismo período al subsidio por enfermedad, seguro convencional, Banco de Seguros del Estado o licencia maternal: son restricciones que BPS publica.',
  'Te vas del país: BPS no ampara a quienes se encuentren fuera del país en el período del subsidio.',
])

/**
 * «Estoy en el paro y quiero abrir una unipersonal: ¿me lo cortan aunque no facture?»
 *
 * ACÁ NO SE PUBLICA LA RESPUESTA QUE LA GENTE QUIERE ESCUCHAR. No existe fuente oficial que diga
 * «mientras no factures no pasa nada», así que decirlo sería inventar; y el reclamo de devolución
 * de lo cobrado —la consecuencia más común de este tema— cae sobre el trabajador, no sobre quien
 * se lo dijo. Lo publicable es la tensión real: la ley habla de actividad e ingresos, la
 * restricción operativa de BPS habla de la CALIDAD de titular de empresa, y las actividades no
 * dependientes que BPS acepta son una enumeración donde la unipersonal común no está.
 */
export const UNIPERSONAL_WHILE_ON_BENEFIT: readonly string[] = Object.freeze([
  'La norma habla de actividad y de ingresos, no de inscripción: el artículo 8 corta el subsidio «cuando el trabajador se reintegre a cualquier actividad remunerada», y el artículo 4 excluye a «los que perciban otros ingresos, en la cuantía y condiciones que establezca el Poder Ejecutivo».',
  'BPS, en cambio, redacta su restricción por condición y no por facturación: no tienen derecho «los titulares de empresa por su calidad de tales». La única unipersonal que BPS nombra del lado de los beneficiarios es la del vínculo funcional 60 o 166 (personal de embajada).',
  'Las actividades no dependientes que BPS acepta en su sección de multiempleo sin perder el subsidio están enumeradas una por una —director o socio sin actividad de SRL o SA, director sin remuneración de SAS (vínculos 122 y 131), escribano o profesional con vínculo 88 u 89 y seguro de salud 9, titular de servicios personales no profesionales con vínculo 92 y seguro de salud 9— y todas exigen acreditar que no se perciben remuneraciones, utilidades ni dividendos. La unipersonal común no está en esa enumeración.',
  'BPS no publica un umbral de facturación por debajo del cual abrir la empresa sea inocuo. Mientras no lo publique, la respuesta honesta es que no consta: preguntá por escrito en BPS antes de inscribirte, no después.',
])

// ---------------------------------------------------------------------------
// El trámite
// ---------------------------------------------------------------------------

export interface ProcedureStep {
  n: number
  title: string
  detail: string
}

/**
 * Quién lo inicia, dónde y cuándo se cobra.
 *
 * LO QUE NADIE TE AVISA: el trámite lo arranca la empresa, así que el trabajador se entera de que
 * no se ingresó cuando ya pasó el plazo. Por eso el paso que importa no es «solicitar» sino
 * «reservar el derecho»: es lo único que se puede hacer sin que la empresa colabore.
 */
export const PROCEDURE_STEPS: readonly ProcedureStep[] = Object.freeze([
  {
    n: 1,
    title: 'La empresa ingresa la solicitud',
    detail:
      'BPS lo dice así: «La empresa podrá ingresar la solicitud de subsidio por desempleo de sus trabajadores a través del portal de servicios. Una vez ingresada, deberá notificarlos del resultado del proceso.» En la causal suspensión BPS le pone plazo expreso: dentro de los 10 días hábiles desde la configuración de la causal.',
  },
  {
    n: 2,
    title: 'Si no la ingresa, por despido o fin de contrato la pedís vos',
    detail:
      'Se hace por los servicios en línea de BPS y necesitás usuario personal. BPS aclara que esta opción «es válida solo para causal despido o fin de contrato»: en suspensión y trabajo reducido depende de la empresa.',
  },
  {
    n: 3,
    title: 'Si no podés en línea, reservá el derecho en la oficina',
    detail:
      'Corresponde cuando la empresa no hace el trámite o no comunica el egreso, cuando no tenés usuario personal, o cuando no estás de acuerdo con la causal que ingresaron. Si no podés ir, la reserva la puede hacer un familiar hasta el segundo grado de consanguinidad o afinidad (procuración oficiosa) o un apoderado, y tener la cédula vencida no es impedimento para reservar: la documentación vigente te la piden recién al ingresar el trámite definitivo.',
  },
  {
    n: 4,
    title: 'El plazo, con las palabras de BPS',
    detail:
      '«El titular podrá solicitar el subsidio a través de los servicios en línea, dentro de los 30 días corridos desde la fecha de egreso para evitar la pérdida del subsidio por el o los meses transcurridos.» Para la reserva de derecho en oficina el plazo es el mismo, contado «desde la configuración de la causal». Pasarse no te borra del régimen, te come meses: «La falta de presentación en plazo determinará la pérdida del subsidio por el o los meses transcurridos.»',
  },
  {
    n: 5,
    title: 'Desde cuándo se devenga y cuándo cobrás',
    detail:
      'BPS: «En todos los casos se liquida a partir del día siguiente a la fecha de egreso. El pago se realiza a mes vencido.» O sea: corre desde el día siguiente al egreso, pero se cobra vencido el mes, no por adelantado ni el día que te fuiste.',
  },
])

/**
 * Meses que tienen que pasar desde la última prestación para volver a cobrar el subsidio.
 *
 * Y NO ALCANZA CON ESPERAR: el artículo 6.4 exige «al menos doce meses, seis de ellos de
 * aportación efectiva, desde que percibieron la última prestación», más volver a reunir «las
 * restantes condiciones requeridas». Ver `REPEAT_CONTRIBUTION_MONTHS`.
 */
export const REPEAT_AFTER_MONTHS = 12

/** De esos 12 meses, cuántos tienen que ser de aportación efectiva (art. 6.4). */
export const REPEAT_CONTRIBUTION_MONTHS = 6

export interface UnemploymentFaq {
  question: string
  short: string
  answer: string
}

export const UNEMPLOYMENT_FAQ: readonly UnemploymentFaq[] = Object.freeze([
  {
    question: '¿Por qué cada mes me pagan menos?',
    short: 'Porque el despido es decreciente por diseño: 66 %, 57 %, 50 %, 45 %, 42 % y 40 %.',
    answer:
      'En la causal despido el subsidio es un porcentaje del promedio mensual de tus remuneraciones nominales de los seis meses anteriores, y ese porcentaje baja mes a mes. Además cada mes tiene su propio tope, que también baja. Si tu sueldo era alto podés estar cobrando el tope los seis meses y ver que el importe igual se reduce: no te descontaron nada, es el régimen. Ojo con generalizarlo: esa escala es sólo del despido. En suspensión total y en trabajo reducido el porcentaje es 50 % fijo y no baja.',
  },
  {
    question: '¿Sobre qué sueldo se calcula?',
    short: 'Sobre el promedio nominal de los últimos 6 meses, no sobre el líquido.',
    answer:
      'Se toma el promedio mensual de las remuneraciones nominales computables percibidas en los seis meses inmediatamente anteriores a configurarse la causal. Es el nominal, no lo que te caía en la cuenta.',
  },
  {
    question: '¿Cuánto se cobra por trabajo reducido?',
    short:
      'La diferencia entre el 50 % del promedio y lo que seguís cobrando. No es la escala del despido.',
    answer:
      'El artículo 7.3 lo define así: el monto «será la diferencia que existiera entre el monto del subsidio calculado conforme al artículo 7.2 y lo efectivamente percibido en el período durante el cual se sirve el subsidio». Y el artículo 7.2 es el 50 % del promedio, el mismo de la suspensión total: BPS trata las dos causales en la misma página. El tope también es el mismo, porque el artículo 7.8 las mete en un solo numeral con el equivalente a 8 BPC por mes. Con un promedio de $ 50.000 y $ 20.000 de ingreso reducido, entonces, la cuenta da $ 5.000 por mes, no $ 13.000. La causal se configura con una reducción de las jornadas del mes o de las horas del día de al menos un 25 %.',
  },
  {
    question: '¿Cuántos meses me corresponden?',
    short: 'Seis por despido o trabajo reducido, cuatro por suspensión total.',
    answer:
      'En jornales son 72 y 48 respectivamente, según el artículo 6.1. La extensión por edad es aparte y no alcanza a las tres causales: si tenés 50 años o más al momento del despido, la prestación por DESPIDO se extiende seis meses más, y el artículo 6.3 la limita expresamente a «los casos de despido». BPS la publica sólo en la página de despido; la de suspensión y reducción no la menciona. Un dato para no confundirse: BPS dice que la extensión es de «seis meses o 54 jornales más», mientras que el artículo 6.3 dice «seis meses o setenta y dos jornales». Acá va el 54 porque BPS es quien liquida, pero el número de la ley es otro. El MTSS puede autorizar extensiones especiales en algunos sectores.',
  },
  {
    question: '¿Puedo trabajar mientras estoy en el seguro de paro?',
    short:
      'Como regla no, pero hay dos excepciones escritas: el régimen reducido y el multiempleo.',
    answer:
      'El artículo 8 corta el subsidio cuando el trabajador «se reintegre a cualquier actividad remunerada», cuando rechaza sin causa legítima un empleo conveniente o cuando se jubila. Pero el mismo literal A) excluye de esa hipótesis a «la continuación del desarrollo de actividad en régimen reducido», que es justamente la causal de trabajo reducido del literal C) del artículo 5: seguir trabajando menos horas no es «reintegrarse». Y BPS publica una sección de multiempleo donde el trabajador mantiene el subsidio si tiene otra actividad como dependiente con aportación industria y comercio, rural, doméstica o construcción, amparándolo por la empresa que lo mandó al seguro. Fuera de esos dos casos, ponerte a trabajar es la causa más común de que después te reclamen devolver lo cobrado.',
  },
  {
    question: '¿Qué es el complemento del 20 %?',
    short: 'Un adicional si tenés cónyuge, concubino, hijos menores o personas a cargo.',
    answer:
      'El artículo 7.10 suma un 20 % al subsidio cuando hay cargas familiares cuyos ingresos no superen 1 BPC. Va último en la cuenta y por fuera de los límites: el artículo 7.9 dice que «a los mínimos y máximos previstos por dichos artículos, se adicionará el suplemento establecido en el artículo 7.10, si correspondiere». O sea que se suma sobre el tope, y también sobre el mínimo. Hay que solicitarlo en BPS: no se aplica automáticamente.',
  },
  {
    question: '¿Hay un mínimo que no me pueden pagar por debajo?',
    short:
      'Sí: $ 8.467. Es el mismo para despido y para suspensión, aunque BPS sólo lo rotule en una.',
    answer:
      'El artículo 7.7 fija un solo mínimo y lo fija para tres artículos a la vez: el monto «resultante de la aplicación de los artículos 7.1, 7.2 y 7.5, no podrá ser inferior a 1 BPC, para relaciones de trabajo de veinticinco jornadas mensuales y ocho horas diarias de labor, debiendo adecuarse proporcionalmente en los casos de menos o menores jornadas». El 7.1 es el despido, el 7.2 la suspensión total y el 7.5 los períodos suplementarios: no son tres mínimos distintos, es uno. En pesos, BPS lo publica como «tope mínimo por suspensión: $ 8.467» (enero 2026), y ese mismo importe es el piso del despido. Cuidado con la cuenta que parece obvia y da mal: ese «1 BPC» del artículo NO se liquida con la BPC del año ($ 6.864). La Ley 19.003, anotada al pie del artículo, dispuso que desde el 01/01/2012 «los montos mínimos y máximos de las prestaciones de seguridad social, se convertirán a U.R.», y la propia tabla de topes de BPS lo confirma: los seis topes por despido son los 11, 9,5, 8, 7, 6,5 y 6 BPC del artículo 7.8 a razón de unos $ 8.468 cada uno, no de $ 6.864. Por eso, si tu promedio es bajo, la calculadora levanta el importe hasta $ 8.467 en vez de mostrarte una cifra por debajo. La excepción: el artículo 7.7 no nombra al 7.3, que es el trabajo reducido — ahí no hay mínimo previsto y acá no se le inventa uno.',
  },
  {
    question: '¿Sigo teniendo mutualista mientras estoy en el seguro de paro?',
    short: 'Sí, se mantiene la cobertura del SNIS — y por eso te descuentan FONASA del subsidio.',
    answer:
      'Durante el período de amparo al subsidio por desempleo se mantiene el derecho a la cobertura asistencial del Sistema Nacional Integrado de Salud, realizando los aportes correspondientes al FONASA. Esos aportes salen del propio subsidio: es la razón de que el importe que te llega sea menor que el que da la cuenta del porcentaje. Los montos de esta página son nominales, antes de ese descuento.',
  },
  {
    question: 'Si renuncio, ¿pierdo el seguro de paro?',
    short: 'Sí. La ley exige desocupación forzosa, y renunciar no es causal.',
    answer:
      'El artículo 2 del Decreto-Ley 15.180 paga el subsidio a quien esté «en situación de desocupación forzosa no imputable a su voluntad o capacidad laboral», y el MTSS lista entre quienes no tienen derecho a «los que hacen abandono voluntario del trabajo». BPS, del otro lado, describe la prestación como la de «aquellos trabajadores que quedan sin empleo contra su voluntad por despido o término de contrato». No hay una forma de renunciar que habilite el subsidio, ni un preaviso ni una carta que lo arregle.',
  },
  {
    question: '¿Puedo arreglar con la empresa que me despidan para cobrarlo?',
    short: 'La regla es el artículo 2: si hubo acuerdo, la salida no es forzosa.',
    answer:
      'Lo que decide es el artículo 2 del Decreto-Ley 15.180, que exige desocupación «forzosa no imputable a su voluntad»: un acuerdo de salida no lo es, aunque incluya el pago de la indemnización por despido. Cómo lo aplica BPS se ve en un precedente: en 2005 el Directorio negó el subsidio a ex trabajadores que salieron por un retiro incentivado en el que la empresa pagó todos los créditos laborales, la indemnización por despido incluida, más un monto adicional por la renuncia. El razonamiento fue que el despido «es un acto unilateral del empleador por el que se pone fin al contrato de trabajo, que no requiere el consentimiento de la otra parte», mientras que ahí hubo «un acuerdo de voluntades» y por lo tanto la desocupación «no reviste las características de forzosa e inimputable a sus voluntades» (R.D. 18-16/2005). Hay que leer esa resolución por lo que es: su numeral 2º manda aplicar los criterios «a todas las situaciones semejantes que se produzcan en la empresa» del expediente, no a todo el país. Sirve como anticipo del criterio de BPS, y el fundamento general sigue siendo el artículo 2.',
  },
  {
    question: '¿Y si me despiden por mala conducta?',
    short: 'Queda fuera, pero se prueba en el expediente: no lo decide la empresa sola.',
    answer:
      'BPS lista entre quienes no tienen derecho a «los despedidos por razones disciplinarias». El MTSS lo redacta con el detalle que importa: «los despedidos por notoria mala conducta o suspendidos por razones disciplinarias, lo que se probará en el expediente administrativo que realice el Seguro de Paro». Es decir que la afirmación de la empresa no cierra el tema. Si la causal que declararon no es la real, BPS recibe el reclamo con sentencia favorable de juicio laboral o con acta de conciliación con acuerdo ante el MTSS o ante sede judicial, y conviene reservar el derecho en plazo mientras eso se pelea.',
  },
  {
    question: '¿Quién inicia el trámite, dónde y cuándo cobro?',
    short: 'Lo ingresa la empresa; si no lo hace, lo pedís vos. Se paga a mes vencido.',
    answer:
      'La empresa ingresa la solicitud por el portal de servicios de BPS y después tiene que notificarte el resultado; en la causal suspensión tiene 10 días hábiles desde que se configura la causal. Si es despido o fin de contrato, el propio trabajador puede pedirlo por los servicios en línea. Si la empresa no hizo el trámite, no tenés usuario personal o no estás de acuerdo con la causal, hay que ir a una oficina de BPS a reservar el derecho. Sobre el cobro, BPS es textual: «En todos los casos se liquida a partir del día siguiente a la fecha de egreso. El pago se realiza a mes vencido.»',
  },
  {
    question: '¿Cuánto tiempo tengo para pedirlo?',
    short: '30 días corridos, y perder el plazo te come meses de subsidio.',
    answer:
      'BPS lo dice así: «El titular podrá solicitar el subsidio a través de los servicios en línea, dentro de los 30 días corridos desde la fecha de egreso para evitar la pérdida del subsidio por el o los meses transcurridos.» Para la reserva de derecho en oficina el mismo plazo se cuenta «desde la configuración de la causal». La consecuencia también es textual: «La falta de presentación en plazo determinará la pérdida del subsidio por el o los meses transcurridos.» No perdés el derecho entero, perdés los meses que dejaste correr.',
  },
  {
    question: 'Soy suplente o eventual del Estado, ¿me ampara?',
    short: 'Del Estado, BPS nombra sólo dos vínculos: el 61 y el 94.',
    answer:
      'El artículo 1 del Decreto-Ley 15.180 comprende a los empleados de la actividad privada que prestan servicios remunerados a terceros, y del Estado BPS enumera entre los beneficiarios a los trabajadores con contrato a término del Poder Ejecutivo y otros organismos con aporte civil: vínculo funcional 61 (contratos a término de la Ley 17.556) con un plazo mínimo de 24 meses de contratación, y vínculo funcional 94 (contrato laboral de la Administración Central), este sin exigencia de tiempo. El resto del funcionariado no aparece en esa lista. No aparecer no es lo mismo que estar excluido por una norma, así que si tu vínculo no es uno de esos dos, pedí la respuesta por escrito en BPS antes de contar con el subsidio.',
  },
  {
    question: '¿Puedo abrir una unipersonal mientras cobro el subsidio?',
    short: 'No hay fuente que diga que sin facturar no pasa nada, y no la vamos a inventar.',
    answer:
      'La norma habla de actividad y de ingresos: el artículo 8 corta el subsidio «cuando el trabajador se reintegre a cualquier actividad remunerada» y el artículo 4 excluye a «los que perciban otros ingresos». BPS, en cambio, escribe su restricción por condición y no por facturación: no tienen derecho «los titulares de empresa por su calidad de tales». La única unipersonal que aparece del lado de los beneficiarios es la del vínculo funcional 60 o 166 (personal de embajada). Las actividades no dependientes que BPS acepta en su sección de multiempleo están enumeradas una por una —director o socio sin actividad de SRL o SA, director sin remuneración de SAS, escribano o profesional con seguro de salud 9, titular de servicios personales no profesionales con seguro de salud 9— y todas exigen acreditar que no se perciben remuneraciones, utilidades ni dividendos. La unipersonal común no está ahí, y BPS no publica ningún umbral de facturación que la vuelva inocua. Preguntá por escrito antes de inscribirte: el reclamo de devolución de lo cobrado cae sobre vos.',
  },
  {
    question: '¿Cuándo puedo volver a cobrarlo después de agotarlo?',
    short: '12 meses, seis de ellos de aportación efectiva, y volviendo a cumplir requisitos.',
    answer:
      'El artículo 6.4 es preciso y la parte que se suele omitir es la del medio: quienes agotaron el término máximo «podrán comenzar a recibirla de nuevo cuando hayan transcurrido al menos doce meses, seis de ellos de aportación efectiva, desde que percibieron la última prestación, y reúnan las restantes condiciones requeridas para el reconocimiento de tal derecho». O sea que no alcanza con dejar pasar el año: hay que haber vuelto a aportar seis meses. Y las «restantes condiciones» son los aportes previos, que en industria y comercio se piden acumulados: 180 días en planilla si cobrás por mes; 180 días en planilla Y 150 jornales si cobrás por jornal; 180 días en planilla Y 6 BPC si cobrás a destajo o por comisión. Si sos rural o del servicio doméstico las cantidades son otras —en el rural, 270 días o 225 jornales o 9 BPC en 30 meses—: fijate en el bloque de aportes previos, no traslades los números de industria y comercio.',
  },
])
