// El costo REAL de invertir afuera desde Uruguay: la cadena completa de ida y vuelta.
//
// La pregunta que este módulo contesta es la de un post de Reddit: «pongo USD 20.000 en un ETF,
// rinde 10%, al año lo traigo de vuelta — ¿cuánto me llega al banco y cuál es el rendimiento
// real?». La queja de fondo («te dicen que rindió X% y no incluyen los costos») es correcta como
// intuición y está MAL ATRIBUIDA: repatriar es un costo de UNA VEZ. Los que se repiten todos los
// años son otros dos —la retención sobre los dividendos, que cae aunque tu plataforma no te cobre
// nada, y la comisión anual sobre el saldo, que con 1,5% de AuM pesa varias veces más—. Por eso el
// desglose sale línea por línea: el punto es ver DÓNDE se va la plata, no un único número.
//
// PURO (sin Vue/Nuxt, sin red) para que la página, la calculadora y los tests compartan una sola
// fuente de verdad.
//
// ── DOS CLASES DE NÚMERO, Y NO SE MEZCLAN ───────────────────────────────────────────────────
// 1. ALÍCUOTAS LEGALES (30% de retención de EE.UU., 12% de IRPF, 24% de backup withholding,
//    USD 60.000 de estate tax). Salen de la ley, llevan cita y no las reescribe nadie.
// 2. PRECIOS COMERCIALES (comisiones de bróker, aranceles de banco). CAMBIAN SIN AVISO. Van
//    únicamente como VALOR POR DEFECTO EDITABLE de la calculadora, con la fecha en que se LEYÓ
//    el tarifario y el link. Nunca como tabla comparativa congelada, y nunca ordenados por
//    precio: este módulo no corona un banco ni un bróker ganador — el cruce depende del monto y
//    de cuántas veces movés la plata, y eso es exactamente lo que la calculadora deja variar.
//
// Verificado en fuente primaria (IRS, IMPO/DGI, Revenue irlandesa, tarifarios publicados).
// El lado uruguayo del impuesto NO se reimplementa acá: se reusa `utils/capitalTax.ts`.

import {
  capitalGainTax,
  FICTO_BASE_PCT,
  FOREIGN_CUSTODIAN_WITHHOLDING_PCT,
  FOREIGN_GENERAL_PCT,
  foreignIncomeTax,
  type WithholdingAgent,
} from './capitalTax'

/** Fecha en que se leyeron los tarifarios comerciales y se re-chequearon las normas. */
export const FOREIGN_INVESTING_VERIFIED_ON = '2026-08-11'

/** Clampea a 0 y mata NaN/Infinity. Todo importe pasa por acá antes de sumarse. */
const nonNegative = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.max(n, 0) : 0

/** Igual que arriba pero admite negativos (rendimientos). Sólo mata NaN/Infinity. */
const finite = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0)

export type FactConfidence = 'confirmado' | 'no-resuelto'

/** Un hecho legal publicable: alícuota (o `null`), norma, cita textual y fuente primaria. */
export interface ForeignInvestingFact {
  id: string
  /** Puntos porcentuales, o `null` cuando el hecho no es una alícuota (o no está resuelto). */
  pct: number | null
  title: string
  law: string
  sourceUrl: string
  confidence: FactConfidence
  verifiedOn: string
}

const fact = (
  id: string,
  pct: number | null,
  title: string,
  law: string,
  sourceUrl: string,
  confidence: FactConfidence = 'confirmado'
): ForeignInvestingFact =>
  Object.freeze({
    id,
    pct,
    title,
    law,
    sourceUrl,
    confidence,
    verifiedOn: FOREIGN_INVESTING_VERIFIED_ON,
  })

const P519 = 'https://www.irs.gov/pub/irs-pdf/p519.pdf'
const IW8BEN = 'https://www.irs.gov/pub/irs-pdf/iw8ben.pdf'
const IRC = (section: string) => `https://www.law.cornell.edu/uscode/text/26/${section}`

// ── Lo que EE.UU. NO cobra, y lo que SÍ ─────────────────────────────────────────────────────

/**
 * Retención estadounidense sobre dividendos a un no residente (NRA): 30% del BRUTO, en la fuente.
 * Es DEFINITIVA: no se descuentan gastos ni costo, no hay mínimo no imponible y no se recupera
 * declarando. A diferencia de la ganancia de capital, esto pega TODOS LOS AÑOS.
 */
export const US_DIVIDEND_WITHHOLDING_PCT = 30

/**
 * Lo que soporta un UCITS irlandés sobre los dividendos que cobra de acciones estadounidenses.
 * OJO AL NIVEL: la sufre EL FONDO, no el inversor — al uruguayo le llega ya neteada dentro del
 * valor cuota, sin llenar nada. Por eso un uruguayo SIN tratado propio igual accede al 15%: usa
 * el tratado de Irlanda (art. 4(1)(d) + art. 10(2)(b)), no el suyo.
 *
 * Se publica como el resultado HABITUAL documentado por el emisor y por el texto del tratado, no
 * como garantía: el art. 23 (Limitation on Benefits) condiciona los beneficios a ser «qualified
 * person» y no verificamos qué test satisface cada UCITS concreto.
 */
export const IRISH_UCITS_US_WITHHOLDING_PCT = 15

/** Umbral de PRESENCIA FÍSICA que activa el impuesto estadounidense a la ganancia de capital. */
export const US_PRESENCE_DAYS_THRESHOLD = 183
/** Alícuota sobre la ganancia NETA si el inversor estuvo 183 días o más en EE.UU. */
export const US_CAPITAL_GAIN_PCT_IF_PRESENT = 30
/** Backup withholding: alícuota fija, y muerde el PRODUCIDO BRUTO de la venta, no la ganancia. */
export const US_BACKUP_WITHHOLDING_PCT = 24
/** Mínimo no imponible del estate tax de un NRA. No se indexa: sale de un crédito fijo de ley. */
export const US_ESTATE_TAX_THRESHOLD_USD = 60_000
/** El crédito unificado del NRA (IRC 2102): el impuesto que la escala genera sobre USD 60.000. */
export const US_NRA_UNIFIED_CREDIT_USD = 13_000
/** Tope de la escala unificada del IRC 2001(c), sobre el excedente de USD 1.000.000. */
export const US_ESTATE_TAX_TOP_RATE_PCT = 40
/** Impuesto federal a los «remittance transfers» del IRC 4475, vigente desde el 1/1/2026. */
export const US_REMITTANCE_TAX_PCT = 1

export const US_FACTS: readonly ForeignInvestingFact[] = Object.freeze([
  fact(
    'ganancia-capital-exenta',
    0,
    'EE.UU. NO te grava la ganancia por vender el ETF si estuviste menos de 183 días en el país, salvo que esté efectivamente conectada con un negocio en EE.UU.',
    'IRC 871(a)(2) — IRS Pub. 519: «capital gains (other than gains listed earlier) are tax exempt unless they are effectively connected with a trade or business in the United States»',
    P519
  ),
  fact(
    'ganancia-capital-excepciones',
    null,
    'La Pub. 519 lista cuatro clases de ganancia que pagan SIN importar los 183 días: madera/carbón/mineral de hierro con interés económico retenido, pagos contingentes por patentes y derechos de autor, ciertas transferencias de patentes, y las obligaciones con descuento de emisión (OID). Para un ETF de acciones no cambia nada; para uno de bonos OID puede cambiar',
    'IRS Pub. 519, cap. 4, «Sales or Exchanges of Capital Assets»',
    P519
  ),
  fact(
    'ganancia-capital-183-dias',
    US_CAPITAL_GAIN_PCT_IF_PRESENT,
    'La regla se da vuelta con 183 días o más de presencia física: la ganancia NETA paga 30%',
    'IRC 871(a)(2) — Schedule NEC del Form 1040-NR',
    P519
  ),
  fact(
    'dividendos-retencion',
    US_DIVIDEND_WITHHOLDING_PCT,
    'Dividendos de fuente estadounidense a un no residente: 30% sobre el BRUTO, retenido en la fuente',
    'IRC 871(a)(1) — renta FDAP',
    IRC('871')
  ),
  fact(
    'sin-tratado',
    null,
    'Uruguay NO tiene tratado de doble imposición en renta con EE.UU.: la Parte II del W-8BEN queda VACÍA',
    'IRS, Table 3 «List of Tax Treaties» (salta de United Kingdom a Venezuela)',
    'https://www.irs.gov/pub/irs-lbi/table-3-list-of-tax-treaties.pdf'
  ),
  fact(
    'sin-tratado-sucesorio',
    null,
    'Tampoco hay tratado de estate/gift tax: el mínimo no imponible de USD 60.000 no se puede ampliar',
    'IRS, Estate & Gift Tax Treaties (15 países, sin Uruguay); instrucciones del Form 706-NA',
    'https://www.irs.gov/businesses/small-businesses-self-employed/estate-gift-tax-treaties-international'
  ),
  fact(
    'estate-tax-umbral',
    null,
    'Estate tax del no residente: se declara desde USD 60.000 de activos con situs estadounidense',
    'Instrucciones del Form 706-NA; crédito unificado de USD 13.000 (IRC 2102)',
    'https://www.irs.gov/pub/irs-pdf/i706na.pdf'
  ),
  fact(
    'estate-tax-tope',
    US_ESTATE_TAX_TOP_RATE_PCT,
    'La escala del estate tax trepa hasta 40% sobre el excedente de USD 1.000.000',
    'IRC 2001(c), Table A — Unified Rate Schedule',
    IRC('2001')
  ),
  fact(
    'situs',
    null,
    'Las acciones son bien situado en EE.UU. ÚNICAMENTE si las emitió una sociedad doméstica: no hay mirada a través al activo subyacente',
    'IRC 2104(a), literal: «shares of stock owned and held by a nonresident not a citizen of the United States shall be deemed property within the United States only if issued by a domestic corporation»',
    IRC('2104')
  ),
  fact(
    'situs-spy',
    null,
    'El encaje técnico exacto para el SPY no lo pudimos confirmar: el SPY no es una sociedad anónima sino un unit investment trust, y el art. 2104(a) habla de «shares of stock issued by a domestic corporation»',
    'IRC 2104(a) vs. ficha del emisor (State Street)',
    'https://www.ssga.com/us/en/intermediary/etfs/spdr-sp-500-etf-trust-spy',
    'no-resuelto'
  ),
  fact(
    'efectivo-en-broker',
    null,
    'El saldo en efectivo ocioso dentro de una cuenta de BRÓKER estadounidense: no encontramos fuente primaria que lo resuelva',
    'IRC 2105(b) (excluye depósitos bancarios, que es otra cosa)',
    IRC('2105'),
    'no-resuelto'
  ),
  fact(
    'w8ben-vigencia',
    null,
    'El W-8BEN vale hasta el último día del TERCER año calendario siguiente al de la firma; vencido, el bróker te retiene por defecto',
    'Instrucciones del Form W-8BEN',
    IW8BEN
  ),
  fact(
    'backup-withholding',
    US_BACKUP_WITHHOLDING_PCT,
    'Sin W-8BEN vigente te pueden retener sobre el PRODUCIDO BRUTO de la venta, no sobre la ganancia',
    'IRC 3406 — instrucciones del Form W-8BEN, «broker proceeds»',
    'https://www.irs.gov/taxtopics/tc307'
  ),
  fact(
    'remittance-tax',
    US_REMITTANCE_TAX_PCT,
    'El impuesto del 1% a las remesas (vigente 1/1/2026) NO aplica a un giro debitado de una cuenta: sólo grava al que entrega EFECTIVO, giro postal o cheque de caja',
    'IRC 4475(c) — «Tax limited to cash and similar instruments»',
    IRC('4475')
  ),
  fact(
    'irlanda-15',
    IRISH_UCITS_US_WITHHOLDING_PCT,
    'Un UCITS irlandés habitualmente soporta 15% (no 30%) de retención estadounidense sobre los dividendos de sus activos de EE.UU.',
    'Tratado EE.UU.–Irlanda, arts. 4(1)(d) y 10(2)(b)',
    'https://www.irs.gov/pub/irs-trty/ireland.pdf'
  ),
  fact(
    'irlanda-sin-exit-tax',
    0,
    'Irlanda no le retiene nada al inversor no residente: ni al cobrar ni al vender. El camino que aplica a un ETF cotizado es el de las cuotapartes en un sistema de compensación reconocido (párr. 4.2.3), que no lleva condición; la exención por no residencia (párr. 4.2.8) sí exige que el fondo tenga la declaración de no residencia ANTES del hecho imponible',
    'Revenue TDM Part 27-01a-02, párrs. 4.2.3 y 4.2.8 (sec. 739B(1))',
    'https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/27-01a-02.pdf'
  ),
  fact(
    'irlanda-sin-sucesorio',
    0,
    'Irlanda tampoco cobra impuesto a la herencia sobre esas cuotapartes si ni el causante ni el beneficiario son residentes irlandeses',
    'Capital Acquisitions Tax Consolidation Act 2003, sec. 75',
    'https://www.revenue.ie/en/tax-professionals/documents/notes-for-guidance/cat/2024/part09.pdf'
  ),
  fact(
    'limitation-on-benefits',
    null,
    'No verificamos qué test del art. 23 (Limitation on Benefits) satisface cada UCITS concreto: el 15% es lo habitual documentado, no una garantía exigible a cualquier fondo',
    'Tratado EE.UU.–Irlanda, art. 23',
    'https://www.irs.gov/pub/irs-trty/ireland.pdf',
    'no-resuelto'
  ),
])

export const factById = (id: string): ForeignInvestingFact | undefined =>
  US_FACTS.find(f => f.id === id)

// ── Domicilio del fondo ─────────────────────────────────────────────────────────────────────

/** Dónde está domiciliado el fondo. NO es dónde invierte: un UCITS irlandés puede ser 100% S&P 500. */
export type FundDomicile = 'eeuu' | 'irlanda'

/** La retención que sufren los dividendos estadounidenses según el domicilio del fondo. */
export function dividendWithholdingPct(domicile: FundDomicile): number {
  return domicile === 'irlanda' ? IRISH_UCITS_US_WITHHOLDING_PCT : US_DIVIDEND_WITHHOLDING_PCT
}

export interface EstateTaxExposure {
  /** `false` para un fondo irlandés: sus cuotapartes no son bien situado en EE.UU. (IRC 2104(a)). */
  inScope: boolean
  thresholdUsd: number
  /** Excedente sobre el mínimo no imponible. 0 si no cruza (o si el fondo no es estadounidense). */
  excessUsd: number
  crossesThreshold: boolean
  topRatePct: number
  /**
   * Cuántas carteras iguales a ésta hacen falta para cruzar el umbral. `null` con un fondo
   * irlandés (no hay umbral que cruzar) o con valor 0. Se calcula, no se afirma de memoria.
   */
  contributionsToCrossThreshold: number | null
  note: string
}

/**
 * Exposición al estate tax estadounidense.
 *
 * Devolvemos el EXCEDENTE, no el impuesto: la escala del IRC 2001(c) es progresiva y sólo
 * verificamos su tramo superior (40% sobre lo que pasa de USD 1.000.000). Publicar un impuesto
 * calculado con una escala que no leímos entera sería inventar una cifra.
 *
 * El umbral se mide sobre el VALOR A LA FECHA DE FALLECIMIENTO, no sobre lo aportado: la sola
 * revalorización puede cruzarlo.
 */
export function estateTaxExposure(input: {
  portfolioValueUsd: number
  domicile: FundDomicile
}): EstateTaxExposure {
  const value = nonNegative(input.portfolioValueUsd)
  if (input.domicile === 'irlanda') {
    return {
      inScope: false,
      thresholdUsd: US_ESTATE_TAX_THRESHOLD_USD,
      excessUsd: 0,
      crossesThreshold: false,
      topRatePct: US_ESTATE_TAX_TOP_RATE_PCT,
      contributionsToCrossThreshold: null,
      note: 'Un UCITS irlandés no es una sociedad doméstica estadounidense, así que sus cuotapartes quedan fuera del hecho imponible (IRC 2104(a)) y la ley no habilita mirar a través hacia las acciones que el fondo tiene adentro. El mismo S&P 500 comprado vía Dublín no cuenta contra el mínimo no imponible de USD 60.000.',
    }
  }
  const excess = Math.max(value - US_ESTATE_TAX_THRESHOLD_USD, 0)
  // Cuántas carteras como ésta hacen falta para cruzar el umbral. Se CALCULA: la frase fija
  // «con tres aportes iguales a éste ya estarías arriba» sólo era cierta por encima de
  // USD 20.000, y se publicaba igual con una cartera de USD 1.000.
  const contributionsToCross = value > 0 ? Math.ceil(US_ESTATE_TAX_THRESHOLD_USD / value) : null
  const repeatSentence =
    contributionsToCross === null
      ? ''
      : contributionsToCross <= 1
        ? ''
        : ` Con ${contributionsToCross} carteras iguales a ésta ya estarías arriba.`
  return {
    inScope: true,
    thresholdUsd: US_ESTATE_TAX_THRESHOLD_USD,
    excessUsd: excess,
    crossesThreshold: excess > 0,
    topRatePct: US_ESTATE_TAX_TOP_RATE_PCT,
    contributionsToCrossThreshold: contributionsToCross,
    note:
      excess > 0
        ? 'Con este valor ya se supera el mínimo no imponible de USD 60.000: el albacea debe presentar el Form 706-NA y el bróker congela la cuenta hasta el transfer certificate. Uruguay no tiene tratado sucesorio con EE.UU., así que el umbral no se puede ampliar.'
        : `Todavía por debajo del mínimo no imponible de USD 60.000, pero el umbral se mide sobre el valor a la fecha de fallecimiento: la sola revalorización puede cruzarlo.${repeatSentence}`,
  }
}

// ── Precios comerciales: esquemas de arancel ────────────────────────────────────────────────

/**
 * Un tramo de arancel. La estructura es por tramos porque los tarifarios uruguayos lo son:
 * BBVA cobra 20% del importe hasta USD 150 y USD 30 fijos por encima, y los gastos de
 * corresponsalía de Itaú van por escalón de monto. Un solo «porcentaje con mínimo y máximo» no
 * alcanza para representarlos sin falsear alguno.
 */
export interface FeeBracket {
  /** Límite superior INCLUSIVE del tramo. `null` = sin tope. */
  upToUsd: number | null
  pctOfAmount: number
  /** Piso de la parte porcentual. */
  minUsd: number | null
  /** Techo de la parte porcentual. */
  maxUsd: number | null
  /** Cargos fijos que se SUMAN siempre (mensaje SWIFT, gastos de administración). */
  flatUsd: number
  /**
   * El tarifario NO publica precio para este rango. Los dos casos reales:
   * - las tablas de corresponsal de Itaú arrancan en USD 101 (no hay tramo por debajo);
   * - la tabla del canal Itaú/Link termina en USD 100.000, que es además el tope del canal.
   * `feeFor` devuelve `null` y la cuenta queda marcada como incompleta. Sin este marcador el
   * tramo faltante se sumaría como 0 y la calculadora diría «gratis» donde dice «no sé».
   *
   * OJO: «no publicado» es una afirmación fuerte y hay que buscar en serio antes de escribirla.
   * Santander llegó a tener acá dos tramos marcados así (≤ USD 10.000 y > USD 100.000) que el
   * Manual de Tarifas SÍ publica, en los ítems 2.4 y 2.6.
   */
  unpublished?: boolean
  /**
   * El tarifario publica un MÍNIMO para este tramo, no el precio exacto (Santander 2.4: «Hasta
   * USD 10.000 → Mínimo USD 33»). El importe es un piso documentado y se marca como tal.
   */
  isFloor?: boolean
}

export interface FeeSchedule {
  label: string
  brackets: readonly FeeBracket[]
  sourceUrl: string
  /**
   * Fecha en que LEÍMOS el tarifario. No es «fecha de vigencia»: BROU no publica ninguna, y
   * inventarle una sería peor que no tenerla.
   */
  readOn: string
  /** La versión que el propio tarifario declara, cuando la declara. */
  publishedVersion?: string
  note?: string
}

/**
 * Costo de un tramo. `null` cuando NINGÚN tramo cubre el monto: eso significa que el proveedor
 * no publica el precio para ese rango, y un `null` que se propaga como «cuenta incompleta» es
 * infinitamente más honesto que un 0 que se suma como si fuera gratis.
 */
export function feeLookup(
  amountUsd: number,
  schedule: FeeSchedule | null
): { amountUsd: number | null; isFloor: boolean } {
  if (!schedule) return { amountUsd: null, isFloor: false }
  const amount = nonNegative(amountUsd)
  const bracket = schedule.brackets.find(b => b.upToUsd === null || amount <= b.upToUsd)
  if (!bracket || bracket.unpublished) return { amountUsd: null, isFloor: false }
  const variable = amount * (nonNegative(bracket.pctOfAmount) / 100)
  const floored = bracket.minUsd !== null ? Math.max(variable, bracket.minUsd) : variable
  const capped = bracket.maxUsd !== null ? Math.min(floored, bracket.maxUsd) : floored
  return {
    amountUsd: nonNegative(capped + nonNegative(bracket.flatUsd)),
    isFloor: Boolean(bracket.isFloor),
  }
}

export function feeFor(amountUsd: number, schedule: FeeSchedule | null): number | null {
  return feeLookup(amountUsd, schedule).amountUsd
}

const sched = (
  label: string,
  brackets: FeeBracket[],
  sourceUrl: string,
  extra: { publishedVersion?: string; note?: string } = {}
): FeeSchedule =>
  Object.freeze({
    label,
    brackets: Object.freeze(brackets),
    sourceUrl,
    readOn: FOREIGN_INVESTING_VERIFIED_ON,
    ...extra,
  })

/** Atajo para el caso «un porcentaje con mínimo y máximo, más cargos fijos». */
const oneBracket = (
  pctOfAmount: number,
  minUsd: number | null,
  maxUsd: number | null,
  flatUsd = 0
): FeeBracket => ({ upToUsd: null, pctOfAmount, minUsd, maxUsd, flatUsd })

// ── Bancos: valores por defecto EDITABLES ───────────────────────────────────────────────────
//
// El orden de esta lista es alfabético por banco y NO significa nada. No hay ranking, no hay
// «el más barato»: el ganador cambia con el monto y con cuántas veces movés la plata, y por eso
// la calculadora deja editar todo. Las cifras son las leídas el 2026-08-11 en el tarifario
// publicado de cada banco; el usuario tiene que confirmarlas antes de ordenar el giro.

export interface BankWirePreset {
  id: string
  bank: string
  /** Canal, porque el precio depende de él: Itaú digital cobra fijo y por mostrador cobra %. */
  channel: string
  outbound: FeeSchedule
  inbound: FeeSchedule
  /**
   * Costo de la cadena de corresponsales. `null` = EL BANCO NO LO PUBLICA (caso BROU): con eso
   * el usuario no puede computar el total antes de ordenar el giro, y la calculadora lo dice.
   */
  correspondentOut: FeeSchedule | null
  correspondentIn: FeeSchedule | null
  /**
   * Tope de monto que el CANAL impone (Itaú/Link: USD 100.000). `null` = sin tope publicado.
   * Por encima de él el giro no se puede ordenar por ese canal, y la tabla de corresponsal que
   * el tarifario publica para el canal también termina ahí.
   */
  maxAmountUsd: number | null
  note?: string
}

/**
 * Gastos de corresponsalía de Santander, ítems 2.4 / 2.5 / 2.6 del Manual de Tarifas. Los tres
 * tramos SÍ están publicados; el primero como MÍNIMO, no como fijo. Es la misma tabla para los
 * dos canales, así que se construye una vez.
 */
/**
 * Costos de corresponsal de la ENTRADA, sección 8.1 del tarifario de Itaú («Órdenes de pago
 * recibidas del exterior»). La tabla es una sola para los dos canales.
 *
 * Los cuatro escalones están publicados: sólo por debajo de USD 101 falta el precio. El módulo
 * llegó a marcar como «no publicado» todo lo que iba hasta USD 2.000, perdiendo los tramos de
 * USD 10 y USD 15 que el tarifario sí trae.
 */
const ITAU_CORRESPONDENT_IN = (): FeeSchedule =>
  sched(
    'Costo de corresponsal, recepción',
    [
      { upToUsd: 100, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 0, unpublished: true },
      { upToUsd: 500, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 10 },
      { upToUsd: 2_000, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 15 },
      { upToUsd: 20_000, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 25 },
      { upToUsd: null, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 35 },
    ],
    'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
    { publishedVersion: 'Versión agosto 01, 2026' }
  )

const SANTANDER_CORRESPONDENT_OUT = (): FeeSchedule =>
  sched(
    'Gastos de corresponsalía para pagos en USD (campo SWIFT 71A «OUR»)',
    [
      // 2.4 «Hasta USD 10.000 → Mínimo USD 33». El tarifario publica un piso, no un precio
      // cerrado: por eso `isFloor` y no un `flatUsd`.
      { upToUsd: 10_000, pctOfAmount: 0, minUsd: 33, maxUsd: null, flatUsd: 0, isFloor: true },
      // 2.5 «Mayor a USD 10.000 hasta USD 100.000 → USD 44».
      { upToUsd: 100_000, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 44 },
      // 2.6 «Mayor a USD 100.000 → USD 55».
      { upToUsd: null, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 55 },
    ],
    'https://www.santander.com.uy/sites/default/files/manual-de-tarifas/Manual_de_Tarifas_20260811.pdf',
    {
      publishedVersion: 'Versión 11/08/2026',
      note: 'Es el único tarifario uruguayo que nombra el campo SWIFT 71A. «OUR» significa que los gastos los asume el ordenante. El tramo de hasta USD 10.000 se publica como MÍNIMO USD 33: es un piso, no el importe exacto.',
    }
  )

export const BANK_WIRE_PRESETS: readonly BankWirePreset[] = Object.freeze([
  {
    id: 'bbva-net',
    bank: 'BBVA',
    channel: 'BBVA net',
    outbound: sched(
      'Transferencia en ME emitida a un banco del exterior (BBVA net)',
      [oneBracket(0.15, 50, 280)],
      'https://www.bbva.com.uy/content/dam/public-web/uruguay/documents/cartilla-contractual-de-producto/Cartilla-Giros-y-Transferencias.pdf',
      { publishedVersion: 'Cartilla del 1 de abril de 2026' }
    ),
    inbound: sched(
      'Transferencias recibidas desde el exterior',
      [
        { upToUsd: 150, pctOfAmount: 20, minUsd: null, maxUsd: null, flatUsd: 0 },
        { upToUsd: null, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 30 },
      ],
      'https://www.bbva.com.uy/content/dam/public-web/uruguay/documents/cartilla-contractual-de-producto/Cartilla-Giros-y-Transferencias.pdf',
      { publishedVersion: 'Cartilla del 1 de abril de 2026' }
    ),
    correspondentOut: sched(
      'Gastos del exterior (tabla escalonada)',
      [
        { upToUsd: 100, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 10 },
        { upToUsd: 1_000, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 35 },
        { upToUsd: 5_000, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 45 },
        { upToUsd: 25_000, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 65 },
        { upToUsd: 50_000, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 75 },
        { upToUsd: null, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 80 },
      ],
      'https://www.bbva.com.uy/content/dam/public-web/uruguay/documents/cartilla-contractual-de-producto/Cartilla-Giros-y-Transferencias.pdf',
      {
        publishedVersion: 'Cartilla del 1 de abril de 2026',
        note: 'La cartilla no aclara si este bloque aplica sólo al giro de salida o también al de entrada. Lo aplicamos únicamente a la salida y lo decimos.',
      }
    ),
    // No lo damos por 0: la cartilla simplemente no lo resuelve para la entrada.
    correspondentIn: null,
    maxAmountUsd: null,
  },
  {
    id: 'brou-sucursal',
    bank: 'BROU',
    channel: 'Sucursal (el giro de salida NO se puede ordenar por eBROU)',
    outbound: sched(
      'Transferencias enviadas generales + mensaje SWIFT',
      [oneBracket(0.3, 40, 300, 10)],
      'https://www.brou.com.uy/personas/servicios/giros-transferencias/exterior',
      {
        note: 'La página no publica fecha de vigencia ni número de versión: la fecha es la de lectura.',
      }
    ),
    inbound: sched(
      'Transferencias recibidas para acreditar en cuentas del BROU',
      [oneBracket(0.4, 35, 100)],
      'https://www.brou.com.uy/personas/servicios/giros-transferencias/recibir-exterior',
      { note: 'Las transferencias recibidas por menos de USD 100 se devuelven al emisor.' }
    ),
    // EL HALLAZGO POR AUSENCIA: BROU es el único de los cuatro que no publica la tabla de
    // corresponsales de la IDA; sólo advierte que su comisión no los incluye. Con BROU el
    // usuario NO puede computar el costo total antes de ordenar el giro.
    // En la VUELTA la ausencia es más común: BBVA y Santander tampoco la publican (sólo Itaú
    // trae la tabla de la sección 8.1), así que la frase tiene que decir de qué tramo habla.
    correspondentOut: null,
    correspondentIn: null,
    maxAmountUsd: null,
    note: 'BROU no publica cuánto cobra la cadena de corresponsales: sólo avisa que su comisión no los incluye. Es el único de los cuatro que no publica la tabla de la IDA; en la VUELTA tampoco la publican BBVA ni Santander, así que ahí sólo Itaú te deja calcular el total.',
  },
  {
    id: 'itau-link',
    bank: 'Itaú',
    channel: 'Itaú Link / digital (tope USD 100.000)',
    outbound: sched(
      'Transferencias instruidas por Itaú/Link — persona física',
      [oneBracket(0, null, null, 20)],
      'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
      {
        publishedVersion: 'Versión agosto 01, 2026',
        note: 'Es un cargo FIJO: en el canal digital de Itaú el costo del giro no escala con el monto.',
      }
    ),
    inbound: sched(
      'Órdenes de pago recibidas del exterior — persona física',
      [oneBracket(0, null, null, 10)],
      'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
      { publishedVersion: 'Versión agosto 01, 2026' }
    ),
    correspondentOut: sched(
      'Costo de corresponsal, envío (canal Itaú/Link)',
      [
        // El tarifario arranca en USD 101: por debajo de eso no publica tramo, y `feeFor`
        // devuelve `null` en vez de inventar un 0.
        { upToUsd: 100, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 0, unpublished: true },
        { upToUsd: 500, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 15 },
        { upToUsd: 2_000, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 20 },
        { upToUsd: 20_000, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 30 },
        // 8.2.1: la tabla de este canal termina en «U$S 20.001 – 100.000 → U$S 40», que es
        // además el tope del canal. Por encima no hay tramo publicado: no lo extrapolamos.
        { upToUsd: 100_000, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 40 },
        {
          upToUsd: null,
          pctOfAmount: 0,
          minUsd: null,
          maxUsd: null,
          flatUsd: 0,
          unpublished: true,
        },
      ],
      'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
      { publishedVersion: 'Versión agosto 01, 2026' }
    ),
    correspondentIn: ITAU_CORRESPONDENT_IN(),
    maxAmountUsd: 100_000,
  },
  {
    id: 'itau-mostrador',
    bank: 'Itaú',
    channel: 'Mostrador u otros medios',
    outbound: sched(
      'Transferencias instruidas por otros medios — persona física + SWIFT',
      [oneBracket(0.15, 25, 250, 30)],
      'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
      { publishedVersion: 'Versión agosto 01, 2026' }
    ),
    inbound: sched(
      'Órdenes de pago recibidas del exterior — persona física',
      [oneBracket(0, null, null, 10)],
      'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
      { publishedVersion: 'Versión agosto 01, 2026' }
    ),
    correspondentOut: sched(
      'Costo de corresponsal, envío (instruidas por otros medios)',
      [
        { upToUsd: 100, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 0, unpublished: true },
        { upToUsd: 500, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 15 },
        { upToUsd: 2_000, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 20 },
        { upToUsd: 20_000, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 30 },
        // 8.2.2 cierra con «Más de U$S 20.000 → U$S 40», sin tope: acá sí corresponde el
        // tramo abierto (a diferencia del canal Link, cuya tabla termina en USD 100.000).
        { upToUsd: null, pctOfAmount: 0, minUsd: null, maxUsd: null, flatUsd: 40 },
      ],
      'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
      { publishedVersion: 'Versión agosto 01, 2026' }
    ),
    correspondentIn: ITAU_CORRESPONDENT_IN(),
    maxAmountUsd: null,
  },
  {
    id: 'santander-supernet',
    bank: 'Santander',
    channel: 'Supernet (los gastos de administración quedan exonerados)',
    outbound: sched(
      'Giro internacional SWIFT MT103 + gastos de SWIFT',
      [oneBracket(0.22, 88, 440, 20)],
      'https://www.santander.com.uy/sites/default/files/manual-de-tarifas/Manual_de_Tarifas_20260811.pdf',
      {
        publishedVersion: 'Versión 11/08/2026',
        note: 'El mínimo de USD 88 manda hasta los USD 40.000: por debajo de ese monto un giro de USD 20.000 paga lo mismo que uno de USD 40.000.',
      }
    ),
    inbound: sched(
      'Giros recibidos internacionales (SWIFT MT103)',
      [oneBracket(0.165, 28, 145)],
      'https://www.santander.com.uy/sites/default/files/manual-de-tarifas/Manual_de_Tarifas_20260811.pdf',
      { publishedVersion: 'Versión 11/08/2026' }
    ),
    correspondentOut: SANTANDER_CORRESPONDENT_OUT(),
    // El Manual publica corresponsalía dentro de «2 Transferencias emitidas al exterior». En «3
    // Órdenes de pago recibidas del exterior» sólo está la comisión propia (1,65 por mil): la
    // corresponsalía de la vuelta no aparece.
    correspondentIn: null,
    maxAmountUsd: null,
  },
  {
    id: 'santander-mostrador',
    bank: 'Santander',
    channel: 'Mostrador (suma los gastos de administración)',
    outbound: sched(
      'Giro internacional SWIFT MT103 + SWIFT + administración',
      [oneBracket(0.22, 88, 440, 45)],
      'https://www.santander.com.uy/sites/default/files/manual-de-tarifas/Manual_de_Tarifas_20260811.pdf',
      { publishedVersion: 'Versión 11/08/2026' }
    ),
    inbound: sched(
      'Giros recibidos internacionales (SWIFT MT103)',
      [oneBracket(0.165, 28, 145)],
      'https://www.santander.com.uy/sites/default/files/manual-de-tarifas/Manual_de_Tarifas_20260811.pdf',
      { publishedVersion: 'Versión 11/08/2026' }
    ),
    correspondentOut: SANTANDER_CORRESPONDENT_OUT(),
    correspondentIn: null,
    maxAmountUsd: null,
  },
])

export const bankPresetById = (id: string): BankWirePreset | undefined =>
  BANK_WIRE_PRESETS.find(p => p.id === id)

// ── Brókers: la pregunta textual del post («¿por el monto o por la transacción?») ────────────

/**
 * Las dos estructuras que existen, y son opuestas:
 * - `por-accion`: IBKR cobra por ACCIÓN con un MÍNIMO por orden y un tope del 1% del valor
 *   operado. No cobra un porcentaje del monto: comprar USD 20.000 o USD 200.000 de SPY puede
 *   costar lo mismo.
 * - `porcentaje`: Gletir y Prex cobran un % del monto operado (con mínimo). Ahí sí el costo
 *   escala con la plata.
 */
export type BrokerCommission =
  | {
      kind: 'por-accion'
      perShareUsd: number
      minPerOrderUsd: number
      /** Tope como % del valor operado (IBKR: 1%). */
      maxPctOfTrade: number | null
    }
  | {
      kind: 'porcentaje'
      pctOfAmount: number
      minPerOrderUsd: number | null
      maxPerOrderUsd: number | null
      /** Cargo fijo que se suma (Prex: USD 0,99). */
      flatUsd: number
    }

export interface BrokerPreset {
  id: string
  name: string
  plan: string
  buy: BrokerCommission
  sell: BrokerCommission
  /** Cargo del bróker por retirar por wire. IBKR: 2 retiros gratis por mes calendario. */
  withdrawalUsd: number
  /** Comisión ANUAL sobre el saldo (AuM). La que de verdad come un buy-and-hold. */
  annualAumFeePct: number
  /** Tope de compra que la plataforma impone (Prex). `null` = sin tope publicado. */
  maxMonthlyPurchaseUsd: number | null
  /**
   * Ruta sugerida para fondear. El usuario la puede cambiar: no la damos por verificada, pero
   * si elige otra la calculadora lo AVISA, porque con la ruta equivocada modela una cadena de
   * giro SWIFT y corresponsales que en ese caso no existe (o al revés, se la saltea).
   */
  suggestedRoute: TransferRoute
  sourceUrl: string
  /**
   * Links adicionales cuando una afirmación del preset NO está en `sourceUrl`. Caso concreto:
   * los retiros gratis de IBKR están en other-fees.php, no en la página de comisiones de
   * acciones; mandar al usuario a comprobarlo donde no está es peor que no linkear.
   */
  extraSources?: readonly { label: string; url: string }[]
  readOn: string
  publishedVersion?: string
  note?: string
}

export type TransferRoute = 'internacional' | 'local'

/** Los retiros de IBKR se publican acá, no en la página de comisiones de acciones. */
const IBKR_WITHDRAWALS_SOURCE = Object.freeze({
  label: 'los dos retiros gratis por mes y el cargo por wire, en «Other Fees»',
  url: 'https://www.interactivebrokers.com/en/pricing/other-fees.php',
})

export const BROKER_PRESETS: readonly BrokerPreset[] = Object.freeze([
  {
    id: 'gletir',
    name: 'Gletir (corredor uruguayo)',
    plan: 'Gletir Global Autogestión',
    buy: {
      kind: 'porcentaje',
      pctOfAmount: 0.75,
      minPerOrderUsd: 10,
      maxPerOrderUsd: null,
      flatUsd: 0,
    },
    sell: {
      kind: 'porcentaje',
      pctOfAmount: 0.75,
      minPerOrderUsd: 10,
      maxPerOrderUsd: null,
      flatUsd: 0,
    },
    withdrawalUsd: 0,
    annualAumFeePct: 0,
    maxMonthlyPurchaseUsd: null,
    // Se fondea por transferencia LOCAL: te ahorrás el giro internacional entero.
    suggestedRoute: 'local',
    sourceUrl: 'https://api.gletir.com/Content/Attach/3590.pdf',
    readOn: FOREIGN_INVESTING_VERIFIED_ON,
    publishedVersion: 'Cartilla vigente desde el 22 de enero de 2026',
    note: 'Acciones y ETFs de EE.UU. con precio mayor a USD 5, IVA incluido. Mantenimiento de cuenta y transferencias recibidas sin costo; transferencia local emitida USD 5 si supera USD 3.000.',
  },
  {
    id: 'ibkr-pro-fixed',
    name: 'Interactive Brokers',
    plan: 'IBKR Pro — Fixed',
    buy: { kind: 'por-accion', perShareUsd: 0.005, minPerOrderUsd: 1, maxPctOfTrade: 1 },
    sell: { kind: 'por-accion', perShareUsd: 0.005, minPerOrderUsd: 1, maxPctOfTrade: 1 },
    withdrawalUsd: 0,
    annualAumFeePct: 0,
    maxMonthlyPurchaseUsd: null,
    suggestedRoute: 'internacional',
    sourceUrl: 'https://www.interactivebrokers.com/en/pricing/commissions-stocks.php',
    extraSources: [IBKR_WITHDRAWALS_SOURCE],
    readOn: FOREIGN_INVESTING_VERIFIED_ON,
    note: 'IBKR Lite (USD 0) es «US Residents Only»: un uruguayo va a Pro. Dos retiros gratis por mes calendario; del tercero en adelante, USD 10 por wire en dólares (eso está en «Other Fees», no en la página de comisiones de acciones).',
  },
  {
    id: 'ibkr-pro-tiered',
    name: 'Interactive Brokers',
    plan: 'IBKR Pro — Tiered',
    buy: { kind: 'por-accion', perShareUsd: 0.0035, minPerOrderUsd: 0.35, maxPctOfTrade: 1 },
    sell: { kind: 'por-accion', perShareUsd: 0.0035, minPerOrderUsd: 0.35, maxPctOfTrade: 1 },
    withdrawalUsd: 0,
    annualAumFeePct: 0,
    maxMonthlyPurchaseUsd: null,
    suggestedRoute: 'internacional',
    sourceUrl: 'https://www.interactivebrokers.com/en/pricing/commissions-stocks.php',
    extraSources: [IBKR_WITHDRAWALS_SOURCE],
    readOn: FOREIGN_INVESTING_VERIFIED_ON,
    note: 'La tarifa Tiered no incluye las tasas regulatorias y de bolsa que se cobran aparte; el mínimo por orden manda igual en una compra chica.',
  },
  {
    id: 'inviu-ibkr',
    name: 'Inviu Uruguay (ruta a Interactive Brokers)',
    plan: 'Inversor Silver (AuM menor a USD 50.000)',
    // La comisión POR OPERACIÓN de esta ruta es la de IBKR, no una de Inviu: el propio tarifario
    // dice que el cliente paga la comisión sobre AuM «que se suma a los costos por operación de
    // Interactive Brokers», y su nota (4) manda al esquema IBKR PRO. Modelar acá un 1,50% por
    // punta cobraba USD 300 sobre USD 20.000 donde la fuente dice USD 1.
    buy: { kind: 'por-accion', perShareUsd: 0.005, minPerOrderUsd: 1, maxPctOfTrade: 1 },
    sell: { kind: 'por-accion', perShareUsd: 0.005, minPerOrderUsd: 1, maxPctOfTrade: 1 },
    withdrawalUsd: 0,
    // LA RESPUESTA A «¿costo mensual/trimestral/anual?»: existe, y en un buy-and-hold es la que
    // más pesa. Es lo único inequívoco y propio de Inviu en esta ruta: se cobra mensualmente
    // sobre el AuM promedio del mes (año de 252 días) y se SUMA a los costos por operación.
    annualAumFeePct: 1.5,
    maxMonthlyPurchaseUsd: null,
    suggestedRoute: 'local',
    sourceUrl: 'https://files.inviu.com.uy/uy/ARANCELES_UY.pdf',
    extraSources: [
      {
        label: 'los costos por operación de IBKR Pro, que es a lo que remite la nota (4)',
        url: 'https://www.interactivebrokers.com/es/pricing/commissions-home.php',
      },
    ],
    readOn: FOREIGN_INVESTING_VERIFIED_ON,
    note: 'Agente de Valores inscripto en el BCU (nroinst 4213). En esta ruta la comisión por operación es la de IBKR Pro: el tarifario dice que la comisión sobre AuM «se suma a los costos por operación de Interactive Brokers». El bloque «Cuenta custodia» del mismo PDF es OTRA ruta y publica TECHOS, no precios: para «Acciones, ETFs» dice «Hasta 1,50% por transacción; mínimo USD 15», y un «hasta» no se puede cobrar como si fuera la tarifa. Si vas por esa vía, cargá a mano lo que te cobren.',
  },
  {
    id: 'prex',
    name: 'Prex',
    plan: 'Módulo de Inversiones',
    buy: {
      kind: 'porcentaje',
      pctOfAmount: 2,
      minPerOrderUsd: null,
      maxPerOrderUsd: null,
      flatUsd: 0.99,
    },
    sell: {
      kind: 'porcentaje',
      pctOfAmount: 1,
      minPerOrderUsd: null,
      maxPerOrderUsd: null,
      flatUsd: 0,
    },
    withdrawalUsd: 0,
    annualAumFeePct: 0,
    // Tope DURO: USD 1.000 por día y USD 3.000 por mes. Los USD 20.000 del caso no entran.
    maxMonthlyPurchaseUsd: 3_000,
    suggestedRoute: 'local',
    sourceUrl: 'https://www.prexcard.com/ayuda/11',
    readOn: FOREIGN_INVESTING_VERIFIED_ON,
    note: 'IVA incluido. En la VENTA hay además una comisión mínima que cobra el Exchange (la bolsa), del orden de USD 0,20, que Prex informa como «Otros cargos» en la confirmación y que no modelamos por separado. Mínimos: USD 10 para comprar, USD 2 para vender.',
  },
])

export const brokerPresetById = (id: string): BrokerPreset | undefined =>
  BROKER_PRESETS.find(p => p.id === id)

/**
 * Costo de una operación del bróker.
 *
 * `isFloor` marca el caso en que devolvemos el MÍNIMO POR ORDEN porque no sabemos el precio de
 * la acción: el número es un piso documentado, no la comisión exacta. Presentarlo como exacto
 * sería inventar; presentarlo como 0 sería peor.
 */
export function brokerCommission(
  tradeValueUsd: number,
  commission: BrokerCommission,
  sharePriceUsd?: number | null
): { amountUsd: number; isFloor: boolean } {
  const trade = nonNegative(tradeValueUsd)
  if (commission.kind === 'porcentaje') {
    const raw =
      trade * (nonNegative(commission.pctOfAmount) / 100) + nonNegative(commission.flatUsd)
    const floored =
      commission.minPerOrderUsd !== null ? Math.max(raw, commission.minPerOrderUsd) : raw
    const capped =
      commission.maxPerOrderUsd !== null ? Math.min(floored, commission.maxPerOrderUsd) : floored
    return { amountUsd: nonNegative(capped), isFloor: false }
  }
  const min = nonNegative(commission.minPerOrderUsd)
  const price = typeof sharePriceUsd === 'number' && sharePriceUsd > 0 ? sharePriceUsd : null
  if (!price) return { amountUsd: min, isFloor: true }
  const shares = trade / price
  const raw = shares * nonNegative(commission.perShareUsd)
  const capped =
    commission.maxPctOfTrade !== null
      ? Math.min(raw, trade * (commission.maxPctOfTrade / 100))
      : raw
  return { amountUsd: nonNegative(Math.max(capped, min)), isFloor: false }
}

// ── El viaje de ida y vuelta ────────────────────────────────────────────────────────────────

/**
 * Quién paga la cadena de corresponsales. El DEFAULT documentado (tarifario de Itaú) es
 * `beneficiario`: el costo se DESCUENTA DEL MONTO GIRADO y el que recibe cobra neto, salvo que
 * el ordenante pida expresamente asumirlo. Ésa es, en fuente primaria, la respuesta a «¿por qué
 * llega menos de lo que mandé?»: no es una comisión oculta, es una opción que nadie eligió.
 */
export type CorrespondentBearer = 'ordenante' | 'beneficiario'

export type CostStage =
  | 'salida'
  | 'compra'
  | 'tenencia'
  | 'venta'
  | 'retiro'
  | 'entrada'
  | 'impuesto-exterior'
  | 'impuesto-uy'

export interface CostLine {
  id: string
  label: string
  stage: CostStage
  amountUsd: number
  /** Distingue lo que cambia sin aviso de lo que sale de la ley. */
  nature: 'precio-comercial' | 'alicuota-legal'
  /** El importe es un PISO documentado, no la cifra exacta. */
  isFloor?: boolean
  /** El proveedor no publica este costo: el importe va en 0 y el total queda INCOMPLETO. */
  unpublished?: boolean
  /** El usuario reemplazó el valor por defecto por el que le cobraron de verdad. */
  overridden?: boolean
  sourceUrl?: string
  readOn?: string
  detail?: string
}

export interface TaxRow {
  label: string
  /** Base imponible uruguaya de ESTA renta. */
  baseUsd: number
  ratePct: number
  taxUsd: number
  /** Impuesto pagado afuera sobre esta misma renta. */
  foreignTaxUsd: number
  creditAppliedUsd: number
  /**
   * Crédito que se PIERDE. El Título 7 art. 25 lo acredita contra el IRPF «que se genere
   * respecto de las mismas rentas» y topea en el IRPF de esa renta: si EE.UU. te retiene 30%
   * sobre el dividendo y Uruguay cobra 12%, el IRPF del
   * dividendo queda en 0 pero los 18 puntos de exceso NO bajan el 12% de la ganancia de capital
   * ni se arrastran al año siguiente. Por eso las dos rentas se liquidan en FILAS SEPARADAS.
   */
  creditLostUsd: number
  dueUsd: number
}

export interface RoundTripInput {
  /** Lo que se ordena girar (o transferir) desde Uruguay. */
  amountSentUsd: number
  holdingYears: number
  /** Rendimiento de PRECIO acumulado en todo el período (el 10% del post). */
  totalReturnPct: number
  /**
   * Rendimiento por dividendos anual BRUTO EN LA FUENTE, antes de cualquier retención.
   * Es un INPUT a propósito: cambia todos los años y no lo verificamos en la ficha del emisor.
   * Con 0, la retención sobre dividendos no aparece en la cuenta — y es la única fuga anual real.
   */
  grossDividendYieldPct: number
  domicile: FundDomicile
  route: TransferRoute
  /** Aranceles del banco uruguayo. `null` con ruta local. */
  bank: BankWirePreset | null
  correspondentBearer: CorrespondentBearer
  /** Ruta local: costo de la transferencia local de ida y de vuelta. `null` = no publicado. */
  localTransferOutUsd?: number | null
  localTransferInUsd?: number | null
  broker: BrokerPreset
  /**
   * Overrides del arancel bancario. Los tarifarios son PRECIO COMERCIAL y cambian sin aviso:
   * el preset es apenas un valor por defecto fechado, y esto es lo que lo hace editable. Además
   * es la única salida para BROU, que no publica su cadena de corresponsales: el usuario carga
   * lo que le cobraron de verdad y la cuenta deja de estar incompleta.
   */
  outboundBankFeeOverrideUsd?: number | null
  correspondentOutOverrideUsd?: number | null
  correspondentInOverrideUsd?: number | null
  inboundBankFeeOverrideUsd?: number | null
  /** Precio de la acción/cuotaparte, para las comisiones por acción. Sin él usamos el mínimo. */
  sharePriceUsd?: number | null
  /** Sobrescribe el AuM del preset (es precio comercial: editable). */
  annualAumFeePctOverride?: number | null
  gainMethod: 'real' | 'ficto20'
  withholdingAgent: WithholdingAgent
  /** Sólo con custodio local: optar por dar carácter definitivo a la retención del 8%. */
  definitiveWithholding?: boolean
}

export interface RoundTripTotals {
  amountSentUsd: number
  /** Lo que sale de tu cuenta: el giro más lo que el banco te debita aparte. */
  totalDebitedUsd: number
  arrivedAtBrokerUsd: number
  investedUsd: number
  finalPortfolioValueUsd: number
  grossDividendsUsd: number
  foreignWithholdingUsd: number
  netDividendsUsd: number
  aumFeesUsd: number
  brokerCommissionsUsd: number
  saleProceedsUsd: number
  /** Efectivo en el bróker justo antes de retirar. */
  brokerCashUsd: number
  wiredHomeUsd: number
  /** LA RESPUESTA A LA PREGUNTA 2: cuánto se acredita en la cuenta del banco uruguayo. */
  creditedToLocalAccountUsd: number
  uruguayanTaxUsd: number
  /** Lo que te queda de verdad, después de pagar el IRPF (que se paga aparte, no se descuenta). */
  netToYouUsd: number
  totalCostsUsd: number
  totalTaxesUsd: number
}

export interface RoundTripYields {
  /** El mundo sin fricción: todo lo que mandaste invertido, sin comisiones ni impuestos. */
  frictionlessFinalUsd: number
  nominalReturnPct: number
  nominalAnnualReturnPct: number
  effectiveReturnPct: number
  effectiveAnnualReturnPct: number
  /** Cuánto de la ganancia bruta se llevan los costos y los impuestos. La cifra del post. */
  costShareOfGrossGainPct: number | null
}

export interface RoundTripResult {
  lines: CostLine[]
  totals: RoundTripTotals
  taxRows: TaxRow[]
  yields: RoundTripYields
  estateTax: EstateTaxExposure
  warnings: string[]
  /** Algún costo de la cadena no está publicado: el total es un PISO, no el costo real. */
  incomplete: boolean
}

/** Tope de iteraciones del bucle de tenencia: 100 años alcanzan y evitan colgar el hilo. */
const MAX_YEARS = 100

/**
 * Recorre la tenencia año por año (con fracción final) devolviendo dividendos brutos y
 * comisión de AuM acumulada. Se llama DOS veces: una con lo realmente invertido y otra con lo
 * que mandaste, para construir el benchmark sin fricción con el mismo calendario de dividendos.
 */
function holdingAccrual(input: {
  baseUsd: number
  annualGrowthFactor: number
  grossDividendYieldPct: number
  annualAumFeePct: number
  years: number
}): { grossDividendsUsd: number; aumFeesUsd: number } {
  const years = Math.min(nonNegative(input.years), MAX_YEARS)
  const yieldPct = nonNegative(input.grossDividendYieldPct)
  const aumPct = nonNegative(input.annualAumFeePct)
  let value = nonNegative(input.baseUsd)
  let remaining = years
  let grossDividendsUsd = 0
  let aumFeesUsd = 0
  while (remaining > 1e-9) {
    const slice = Math.min(1, remaining)
    grossDividendsUsd += value * (yieldPct / 100) * slice
    aumFeesUsd += value * (aumPct / 100) * slice
    value *= Math.pow(input.annualGrowthFactor, slice)
    remaining -= slice
  }
  return { grossDividendsUsd: nonNegative(grossDividendsUsd), aumFeesUsd: nonNegative(aumFeesUsd) }
}

/**
 * El IRPF de UNA renta, con crédito por impuesto extranjero.
 *
 * Reusa `foreignIncomeTax` de capitalTax.ts (12% + tope del crédito) en vez de reimplementar la
 * alícuota. El único caso que agrega este wrapper es la RETENCIÓN DEFINITIVA del custodio local:
 * ahí la carga efectiva es el 8% del art. 52 lit. A, no el 12%, y sólo si el contribuyente OPTA
 * (y comunica la opción antes del 31 de enero del año siguiente).
 */
function taxRow(input: {
  label: string
  baseUsd: number
  foreignTaxUsd: number
  agent: WithholdingAgent
  definitive: boolean
}): TaxRow {
  const baseUsd = nonNegative(input.baseUsd)
  const foreignTaxUsd = nonNegative(input.foreignTaxUsd)
  const definitive = input.definitive && input.agent === 'custodio-local'
  const ratePct = definitive ? FOREIGN_CUSTODIAN_WITHHOLDING_PCT : FOREIGN_GENERAL_PCT

  if (definitive) {
    const taxUsd = baseUsd * (ratePct / 100)
    const creditAppliedUsd = Math.min(foreignTaxUsd, taxUsd)
    return {
      label: input.label,
      baseUsd,
      ratePct,
      taxUsd,
      foreignTaxUsd,
      creditAppliedUsd,
      creditLostUsd: foreignTaxUsd - creditAppliedUsd,
      dueUsd: taxUsd - creditAppliedUsd,
    }
  }

  const r = foreignIncomeTax({
    amount: baseUsd,
    withholdingAgent: input.agent,
    foreignTaxPaid: foreignTaxUsd,
  })
  return {
    label: input.label,
    baseUsd,
    ratePct: r.taxRatePct,
    taxUsd: r.tax,
    foreignTaxUsd,
    creditAppliedUsd: r.foreignCreditApplied,
    creditLostUsd: foreignTaxUsd - r.foreignCreditApplied,
    dueUsd: r.taxDue,
  }
}

/**
 * La cadena completa: giro de salida → compra → tenencia → venta → retiro → giro de entrada →
 * IRPF uruguayo, y el número que el post pide.
 *
 * TODO EL CÁLCULO VA EN DÓLARES, y no es una simplificación: es LA LEY, no el decreto. El
 * Título 7 art. 32 dice, en el inciso agregado por la Ley 20.446 (art. 651 num. 2), que «para
 * los bienes situados en el exterior, el costo fiscal se determinará considerando el valor en
 * la moneda en que se realizó la referida inversión, valuada a la cotización del día anterior
 * al de la enajenación». Costo y precio se convierten a pesos con el MISMO tipo de cambio, así
 * que la devaluación del peso entre compra y venta no genera renta gravada, y el 12% cae sobre
 * la ganancia en dólares. El Decreto 148/007 reglamenta otra cosa (las retenciones).
 */
export function foreignInvestingRoundTrip(input: RoundTripInput): RoundTripResult {
  const lines: CostLine[] = []
  const warnings: string[] = []
  let incomplete = false

  const amountSentUsd = nonNegative(input.amountSentUsd)
  const years = Math.min(Math.max(nonNegative(input.holdingYears), 0), MAX_YEARS)
  const totalReturnPct = Math.max(finite(input.totalReturnPct), -100)
  const aumPct = nonNegative(input.annualAumFeePctOverride ?? input.broker.annualAumFeePct)

  const addLine = (line: CostLine) => {
    if (line.unpublished) incomplete = true
    lines.push({ ...line, amountUsd: nonNegative(line.amountUsd) })
  }

  /**
   * Un cargo del banco: el valor por defecto del tarifario, o el que el usuario cargó a mano.
   * Un override válido apaga el flag de «no publicado»: si el usuario sabe lo que le cobraron,
   * la cuenta ya no está incompleta.
   */
  const resolveFee = (
    lookup: { amountUsd: number | null; isFloor: boolean },
    override: number | null | undefined
  ): { amount: number; unpublished: boolean; overridden: boolean; isFloor: boolean } =>
    typeof override === 'number' && Number.isFinite(override)
      ? { amount: nonNegative(override), unpublished: false, overridden: true, isFloor: false }
      : {
          amount: nonNegative(lookup.amountUsd),
          unpublished: lookup.amountUsd === null,
          overridden: false,
          // Un tramo publicado como MÍNIMO (Santander hasta USD 10.000) es un piso: la línea
          // lo dice en vez de hacer pasar el mínimo por el precio exacto.
          isFloor: lookup.amountUsd !== null && lookup.isFloor,
        }

  const noSchedule = { amountUsd: null, isFloor: false }

  // ── 1. Salida ────────────────────────────────────────────────────────────────────────────
  let outboundBankFee = 0
  let correspondentOut = 0

  if (input.route === 'local') {
    const local = input.localTransferOutUsd
    const unpublished = local === null || local === undefined
    outboundBankFee = nonNegative(local)
    addLine({
      id: 'salida-local',
      label: 'Transferencia local a la plataforma',
      stage: 'salida',
      amountUsd: outboundBankFee,
      nature: 'precio-comercial',
      unpublished,
      sourceUrl: input.broker.sourceUrl,
      readOn: input.broker.readOn,
      detail: unpublished
        ? 'No cargaste el costo de la transferencia local: la cuenta queda incompleta.'
        : 'Ruta local: no hay giro internacional, así que tampoco hay cadena de corresponsales.',
    })
  } else {
    const bank = input.bank
    const outFee = resolveFee(
      bank ? feeLookup(amountSentUsd, bank.outbound) : noSchedule,
      input.outboundBankFeeOverrideUsd
    )
    outboundBankFee = outFee.amount
    addLine({
      id: 'salida-banco',
      label: bank
        ? `${bank.bank} — ${bank.outbound.label}`
        : 'Comisión del banco uruguayo (salida)',
      stage: 'salida',
      amountUsd: outboundBankFee,
      nature: 'precio-comercial',
      unpublished: outFee.unpublished,
      overridden: outFee.overridden,
      isFloor: outFee.isFloor,
      sourceUrl: bank?.outbound.sourceUrl,
      readOn: bank?.outbound.readOn,
      detail: bank?.outbound.note,
    })

    const corr = resolveFee(
      bank ? feeLookup(amountSentUsd, bank.correspondentOut) : noSchedule,
      input.correspondentOutOverrideUsd
    )
    correspondentOut = corr.amount
    addLine({
      id: 'salida-corresponsal',
      label: 'Cadena de bancos corresponsales (ida)',
      stage: 'salida',
      amountUsd: correspondentOut,
      nature: 'precio-comercial',
      unpublished: corr.unpublished,
      overridden: corr.overridden,
      isFloor: corr.isFloor,
      sourceUrl: bank?.correspondentOut?.sourceUrl ?? bank?.outbound.sourceUrl,
      readOn: bank?.correspondentOut?.readOn ?? bank?.outbound.readOn,
      detail: corr.unpublished
        ? 'Tu banco no publica este costo: el total de abajo es un PISO, no el costo real.'
        : input.correspondentBearer === 'beneficiario'
          ? 'Por defecto se descuenta del monto girado: al bróker le llega menos de lo que mandaste.'
          : 'Elegiste asumirlo vos (modalidad «OUR»): se suma a lo que te debitan.',
    })
    if (corr.unpublished && bank) {
      warnings.push(
        `${bank.bank} no publica cuánto cobra la cadena de corresponsales, así que el costo total de esta cuenta está incompleto: te va a llegar menos de lo que dice el resultado.`
      )
    }

    // El tope del canal se verifica igual que el de Prex. Itaú/Link lo publica en el título de
    // la sección 8.2.1 («Monto máximo U$S 100.000») y su tabla de corresponsal termina ahí.
    if (bank && bank.maxAmountUsd !== null && amountSentUsd > bank.maxAmountUsd) {
      warnings.push(
        `${bank.bank} — ${bank.channel}: el canal tiene un tope de USD ${bank.maxAmountUsd.toLocaleString('es-UY')} por giro, así que este monto no se puede ordenar por acá. El tarifario tampoco publica el costo de corresponsal por encima de ese tope.`
      )
    }
  }

  const correspondentOutFromSender =
    input.correspondentBearer === 'ordenante' ? correspondentOut : 0
  const correspondentOutInTransit = input.correspondentBearer === 'ordenante' ? 0 : correspondentOut

  const totalDebitedUsd = amountSentUsd + outboundBankFee + correspondentOutFromSender
  const arrivedAtBrokerUsd = Math.max(amountSentUsd - correspondentOutInTransit, 0)

  // ── 2. Compra ────────────────────────────────────────────────────────────────────────────
  const buy = brokerCommission(arrivedAtBrokerUsd, input.broker.buy, input.sharePriceUsd)
  addLine({
    id: 'compra-comision',
    label: `${input.broker.name} — comisión de compra`,
    stage: 'compra',
    amountUsd: buy.amountUsd,
    nature: 'precio-comercial',
    isFloor: buy.isFloor,
    sourceUrl: input.broker.sourceUrl,
    readOn: input.broker.readOn,
    detail: buy.isFloor
      ? 'Cobra POR ACCIÓN con un mínimo por orden. Sin el precio de la acción mostramos el mínimo: es un piso, no la comisión exacta.'
      : undefined,
  })
  const investedUsd = Math.max(arrivedAtBrokerUsd - buy.amountUsd, 0)

  if (
    input.broker.maxMonthlyPurchaseUsd !== null &&
    amountSentUsd > input.broker.maxMonthlyPurchaseUsd
  ) {
    warnings.push(
      `${input.broker.name} tiene un tope de compra de USD ${input.broker.maxMonthlyPurchaseUsd.toLocaleString('es-UY')} por mes: este monto NO entra de una sola vez.`
    )
  }

  // La ruta sugerida por el preset SIRVE PARA ALGO: si elegís otra, la cuenta modela una cadena
  // que en tu caso no existe (Gletir y Prex se fondean por transferencia local, IBKR no).
  if (input.route !== input.broker.suggestedRoute) {
    warnings.push(
      input.broker.suggestedRoute === 'local'
        ? `${input.broker.name} se fondea por transferencia LOCAL, pero elegiste giro internacional: esta cuenta te está cobrando un giro SWIFT y una cadena de corresponsales que en ese caso no existirían. Cambiá la ruta o confirmá con la plataforma cómo entra la plata.`
        : `${input.broker.name} se fondea por giro INTERNACIONAL, pero elegiste transferencia local: esta cuenta se saltea el giro y los corresponsales, así que el costo de mover la plata te va a quedar corto.`
    )
  }

  // ── 3. Tenencia ──────────────────────────────────────────────────────────────────────────
  const annualGrowthFactor = years > 0 ? Math.pow(1 + totalReturnPct / 100, 1 / years) : 1
  const accrual = holdingAccrual({
    baseUsd: investedUsd,
    annualGrowthFactor,
    grossDividendYieldPct: input.grossDividendYieldPct,
    annualAumFeePct: aumPct,
    years,
  })
  const grossDividendsUsd = accrual.grossDividendsUsd
  const withholdingPct = dividendWithholdingPct(input.domicile)
  const foreignWithholdingUsd = grossDividendsUsd * (withholdingPct / 100)
  const netDividendsUsd = grossDividendsUsd - foreignWithholdingUsd

  addLine({
    id: 'tenencia-retencion',
    label:
      input.domicile === 'eeuu'
        ? `Retención de EE.UU. sobre los dividendos (${withholdingPct}%)`
        : `Retención de EE.UU. que soporta el fondo irlandés (${withholdingPct}%)`,
    stage: 'impuesto-exterior',
    amountUsd: foreignWithholdingUsd,
    nature: 'alicuota-legal',
    sourceUrl:
      input.domicile === 'eeuu' ? IRC('871') : 'https://www.irs.gov/pub/irs-trty/ireland.pdf',
    readOn: FOREIGN_INVESTING_VERIFIED_ON,
    detail:
      input.domicile === 'eeuu'
        ? 'Sobre el BRUTO, todos los años, y no se recupera declarando: Uruguay no tiene tratado con EE.UU., así que la Parte II del W-8BEN te queda vacía.'
        : 'La sufre EL FONDO antes de distribuir: al inversor le llega ya neteada dentro del valor cuota, sin llenar ningún formulario.',
  })
  if (aumPct > 0) {
    addLine({
      id: 'tenencia-aum',
      label: `Comisión anual sobre el saldo (${aumPct}% de AuM)`,
      stage: 'tenencia',
      amountUsd: accrual.aumFeesUsd,
      nature: 'precio-comercial',
      sourceUrl: input.broker.sourceUrl,
      readOn: input.broker.readOn,
      detail:
        'Se cobra mensualmente sobre el saldo, además de las comisiones por operación. En un buy-and-hold es la que más pesa.',
    })
  }

  // ── 4. Venta ─────────────────────────────────────────────────────────────────────────────
  const finalPortfolioValueUsd = nonNegative(investedUsd * (1 + totalReturnPct / 100))
  const sell = brokerCommission(finalPortfolioValueUsd, input.broker.sell, input.sharePriceUsd)
  addLine({
    id: 'venta-comision',
    label: `${input.broker.name} — comisión de venta`,
    stage: 'venta',
    amountUsd: sell.amountUsd,
    nature: 'precio-comercial',
    isFloor: sell.isFloor,
    sourceUrl: input.broker.sourceUrl,
    readOn: input.broker.readOn,
  })

  // EE.UU. no grava la ganancia de un no residente que estuvo menos de 183 días en el país
  // (IRC 871(a)(2)). No es un beneficio de tratado: sale del propio estatuto, así que el
  // uruguayo lo tiene igual pese a no tener convenio. Por eso NO hay línea de impuesto acá.

  // ── 5. Retiro y entrada ──────────────────────────────────────────────────────────────────
  const brokerCashUsd = Math.max(
    finalPortfolioValueUsd - sell.amountUsd + netDividendsUsd - accrual.aumFeesUsd,
    0
  )
  const withdrawalUsd = nonNegative(input.broker.withdrawalUsd)
  addLine({
    id: 'retiro-broker',
    label: `${input.broker.name} — cargo por retirar`,
    stage: 'retiro',
    amountUsd: withdrawalUsd,
    nature: 'precio-comercial',
    sourceUrl: input.broker.sourceUrl,
    readOn: input.broker.readOn,
    detail:
      withdrawalUsd === 0
        ? 'Sin cargo con la configuración elegida. En IBKR son dos retiros gratis por mes calendario; del tercero en adelante se cobra.'
        : undefined,
  })
  const wiredHomeUsd = Math.max(brokerCashUsd - withdrawalUsd, 0)

  let inboundBankFee = 0
  let correspondentIn = 0
  if (input.route === 'local') {
    const local = input.localTransferInUsd
    const unpublished = local === null || local === undefined
    inboundBankFee = nonNegative(local)
    addLine({
      id: 'entrada-local',
      label: 'Transferencia local de vuelta a tu banco',
      stage: 'entrada',
      amountUsd: inboundBankFee,
      nature: 'precio-comercial',
      unpublished,
      sourceUrl: input.broker.sourceUrl,
      readOn: input.broker.readOn,
    })
  } else {
    const bank = input.bank
    const corr = resolveFee(
      bank ? feeLookup(wiredHomeUsd, bank.correspondentIn) : noSchedule,
      input.correspondentInOverrideUsd
    )
    correspondentIn = corr.amount
    addLine({
      id: 'entrada-corresponsal',
      label: 'Cadena de bancos corresponsales (vuelta)',
      stage: 'entrada',
      amountUsd: correspondentIn,
      nature: 'precio-comercial',
      unpublished: corr.unpublished,
      overridden: corr.overridden,
      isFloor: corr.isFloor,
      sourceUrl: bank?.correspondentIn?.sourceUrl ?? bank?.inbound.sourceUrl,
      readOn: bank?.correspondentIn?.readOn ?? bank?.inbound.readOn,
      detail: corr.unpublished
        ? 'Tu banco no publica el costo de corresponsalía de la vuelta: lo que se acredite va a ser menor que este resultado.'
        : 'Se descuenta en tránsito: el banco uruguayo acredita el neto.',
    })

    const arrivedHome = Math.max(wiredHomeUsd - correspondentIn, 0)
    const inFee = resolveFee(
      bank ? feeLookup(arrivedHome, bank.inbound) : noSchedule,
      input.inboundBankFeeOverrideUsd
    )
    inboundBankFee = inFee.amount
    addLine({
      id: 'entrada-banco',
      label: bank
        ? `${bank.bank} — ${bank.inbound.label}`
        : 'Comisión del banco uruguayo (entrada)',
      stage: 'entrada',
      amountUsd: inboundBankFee,
      nature: 'precio-comercial',
      unpublished: inFee.unpublished,
      overridden: inFee.overridden,
      isFloor: inFee.isFloor,
      sourceUrl: bank?.inbound.sourceUrl,
      readOn: bank?.inbound.readOn,
      detail: bank?.inbound.note,
    })
  }

  const creditedToLocalAccountUsd = Math.max(wiredHomeUsd - correspondentIn - inboundBankFee, 0)

  // ── 6. IRPF uruguayo, EN FILAS SEPARADAS ─────────────────────────────────────────────────
  //
  // Dividendos y ganancia de venta son DOS rentas distintas: los primeros son rendimientos de
  // capital mobiliario (T7 art. 6 num. 2 apartado I, devengados aunque no los traigas), la
  // segunda es un incremento patrimonial (apartado II, imputado a la enajenación). El crédito
  // por impuesto extranjero se acredita contra el IRPF «que se genere respecto de las mismas
  // rentas» (T7 art. 25, literal) y topea en el IRPF de esa renta: sumarlas en una sola fila
  // haría que los 18 puntos de exceso del dividendo taparan indebidamente el 12% de la ganancia.
  const definitive = Boolean(input.definitiveWithholding)

  // Base del dividendo: el BRUTO cuando la retención la sufre el inversor (fondo de EE.UU.),
  // porque el mecanismo del crédito del art. 25 sólo cierra sobre una base bruta. Con un fondo
  // irlandés el inversor cobra una distribución ya neta y la retención la pagó el FONDO, no él:
  // la base es lo que recibió y el crédito es 0. Ese punto —si el tenedor puede acreditar una
  // retención sufrida a nivel del fondo— no lo verificamos en un pronunciamiento de DGI, así
  // que tomamos el camino conservador y lo decimos.
  const dividendBaseUsd = input.domicile === 'eeuu' ? grossDividendsUsd : netDividendsUsd
  const dividendForeignTaxUsd = input.domicile === 'eeuu' ? foreignWithholdingUsd : 0

  const dividendRow = taxRow({
    label: 'Dividendos (rendimiento de capital mobiliario del exterior)',
    baseUsd: dividendBaseUsd,
    foreignTaxUsd: dividendForeignTaxUsd,
    agent: input.withholdingAgent,
    definitive,
  })

  // Costo fiscal: lo efectivamente colocado en las cuotapartes. La comisión de compra fue un
  // gasto, no parte del costo — y no encontramos norma que la incorpore, así que no la sumamos.
  const gainBaseUsd =
    input.gainMethod === 'ficto20'
      ? finalPortfolioValueUsd * (FICTO_BASE_PCT.ficto20 / 100)
      : capitalGainTax({ salePrice: finalPortfolioValueUsd, cost: investedUsd, method: 'real' })
          .taxableBase

  const gainRow = taxRow({
    label:
      input.gainMethod === 'ficto20'
        ? 'Ganancia por la venta (base ficta: 20% del precio)'
        : 'Ganancia por la venta (incremento patrimonial, base real)',
    baseUsd: gainBaseUsd,
    // EE.UU. no gravó la ganancia (regla de los 183 días): no hay nada que acreditar acá, y el
    // exceso de crédito del dividendo NO puede bajar este impuesto.
    foreignTaxUsd: 0,
    agent: input.withholdingAgent,
    definitive,
  })

  const taxRows = [dividendRow, gainRow]
  const uruguayanTaxUsd = taxRows.reduce((sum, r) => sum + r.dueUsd, 0)

  for (const row of taxRows) {
    addLine({
      id: `impuesto-uy-${row.label.startsWith('Dividendos') ? 'dividendos' : 'ganancia'}`,
      label: `IRPF uruguayo — ${row.label}`,
      stage: 'impuesto-uy',
      amountUsd: row.dueUsd,
      nature: 'alicuota-legal',
      sourceUrl: 'https://www.impo.com.uy/bases/todgi-2023/7-2024',
      readOn: FOREIGN_INVESTING_VERIFIED_ON,
      detail:
        row.creditLostUsd > 0
          ? `Se acreditaron USD ${row.creditAppliedUsd.toFixed(2)} de lo retenido afuera y se PERDIERON USD ${row.creditLostUsd.toFixed(2)}: el crédito topea en el IRPF de esta misma renta y no se arrastra.`
          : undefined,
    })
  }

  const totalCostsUsd = lines
    .filter(l => l.nature === 'precio-comercial')
    .reduce((sum, l) => sum + l.amountUsd, 0)
  const totalTaxesUsd = lines
    .filter(l => l.nature === 'alicuota-legal')
    .reduce((sum, l) => sum + l.amountUsd, 0)

  const netToYouUsd = creditedToLocalAccountUsd - uruguayanTaxUsd

  // ── 7. Nominal vs efectivo ───────────────────────────────────────────────────────────────
  //
  // El benchmark es el mundo SIN FRICCIÓN: todo lo que mandaste invertido, con el mismo
  // calendario de dividendos, sin comisiones, sin retención y sin IRPF. Medido así, el
  // rendimiento efectivo nunca puede superar al nominal: cada costo sólo resta.
  const frictionlessAccrual = holdingAccrual({
    baseUsd: amountSentUsd,
    annualGrowthFactor,
    grossDividendYieldPct: input.grossDividendYieldPct,
    annualAumFeePct: 0,
    years,
  })
  const frictionlessFinalUsd =
    nonNegative(amountSentUsd * (1 + totalReturnPct / 100)) + frictionlessAccrual.grossDividendsUsd

  const nominalReturnPct =
    amountSentUsd > 0 ? ((frictionlessFinalUsd - amountSentUsd) / amountSentUsd) * 100 : 0
  const effectiveReturnPct =
    totalDebitedUsd > 0 ? ((netToYouUsd - totalDebitedUsd) / totalDebitedUsd) * 100 : 0

  const annualise = (totalPct: number): number => {
    if (years <= 0) return totalPct
    const growth = 1 + totalPct / 100
    // Con una pérdida total (o peor) la anualización no está definida: devolvemos -100%
    // en vez de un NaN que se filtraría a la pantalla.
    if (growth <= 0) return -100
    return (Math.pow(growth, 1 / years) - 1) * 100
  }

  const grossGainUsd = frictionlessFinalUsd - amountSentUsd
  const costShareOfGrossGainPct =
    grossGainUsd > 0 ? ((totalCostsUsd + totalTaxesUsd) / grossGainUsd) * 100 : null

  if (nonNegative(input.grossDividendYieldPct) === 0) {
    // «La única fuga que se repite» era falso y este mismo módulo lo desmentía: la comisión
    // anual sobre el saldo también se repite, y con 1,5% de AuM pesa varias veces más. Lo que
    // la retención tiene de único es que se repite AUNQUE tu plataforma no te cobre nada.
    warnings.push(
      'No cargaste rendimiento por dividendos, así que la retención anual del exterior no aparece en esta cuenta — y es la fuga fiscal que se repite todos los años, aunque tu plataforma no te cobre nada por tener el fondo. El dato lo publica el emisor del fondo; nosotros no lo inventamos.'
    )
  }
  if (input.domicile === 'irlanda') {
    warnings.push(
      'Con un fondo irlandés la retención del 15% la paga el FONDO, no vos. No verificamos en un pronunciamiento de DGI si el tenedor puede acreditarla contra su IRPF, así que la cuenta va por el camino conservador: crédito 0.'
    )
  }

  return {
    lines,
    totals: {
      amountSentUsd,
      totalDebitedUsd,
      arrivedAtBrokerUsd,
      investedUsd,
      finalPortfolioValueUsd,
      grossDividendsUsd,
      foreignWithholdingUsd,
      netDividendsUsd,
      aumFeesUsd: accrual.aumFeesUsd,
      brokerCommissionsUsd: buy.amountUsd + sell.amountUsd,
      saleProceedsUsd: finalPortfolioValueUsd,
      brokerCashUsd,
      wiredHomeUsd,
      creditedToLocalAccountUsd,
      uruguayanTaxUsd,
      netToYouUsd,
      totalCostsUsd,
      totalTaxesUsd,
    },
    taxRows,
    yields: {
      frictionlessFinalUsd,
      nominalReturnPct,
      nominalAnnualReturnPct: annualise(nominalReturnPct),
      effectiveReturnPct,
      effectiveAnnualReturnPct: annualise(effectiveReturnPct),
      costShareOfGrossGainPct,
    },
    estateTax: estateTaxExposure({
      portfolioValueUsd: finalPortfolioValueUsd,
      domicile: input.domicile,
    }),
    warnings,
    incomplete,
  }
}

/** Etiquetas de etapa, en el orden en que ocurren. Para el desglose de la página. */
export const STAGE_LABELS: Readonly<Record<CostStage, string>> = Object.freeze({
  salida: 'Giro de salida',
  compra: 'Compra',
  tenencia: 'Tenencia',
  'impuesto-exterior': 'Impuesto en el exterior',
  venta: 'Venta',
  retiro: 'Retiro del bróker',
  entrada: 'Giro de entrada',
  'impuesto-uy': 'Impuesto uruguayo',
})
