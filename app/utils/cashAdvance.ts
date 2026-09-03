// app/utils/cashAdvance.ts
// Data + pure helpers for /adelanto-de-efectivo-tarjeta-de-credito — what it
// REALLY costs to pull cash out of a Uruguayan credit card, and whether the
// "compro cripto con la tarjeta y lo vendo en Binance" detour beats it.
//
// The page exists because the tariff sheets hide the answer in three different
// places, and two of the biggest issuers publish no number at all:
//
//   1. The COMMISSION for the advance (often $0 in Uruguay — the misleading part).
//   2. The INTEREST RATE, which is a DIFFERENT, higher rate than the one for
//      ordinary financed purchases (OCA: 80 % vs 63 % TEA) and which runs from
//      the transaction date, so there is NO interest-free period.
//   3. IVA. Uruguayan credit-card interest is ALWAYS taxed at the basic rate —
//      Título 10 T.O. 2023, art. 38, num. 2 lit. E) is explicit: "Los intereses
//      de créditos y financiaciones otorgados mediante tarjetas de créditos y
//      similares, estarán gravados en todos los casos." Every issuer publishes
//      its TEA net of IVA, so the number you actually pay is TEA × 1,22.
//
// Itaú and Scotiabank publish "tasa máxima permitida" instead of a figure, which
// is why people conclude the fee "is not in the tarifario". It IS — it just
// points at the BCU cap, which this module resolves to a real number.
//
// PURE module (no Vue/Nuxt, relative-free imports only) so the page and its unit
// test share one source of truth. Every figure carries its official URL and the
// document's own effective date. Informational, not financial advice.

/** Date (YYYY-MM-DD) every figure below was last checked against its source. */
export const CASH_ADVANCE_LAST_REVIEWED = '2026-08-18'

/** IVA basic rate. Applies to credit-card interest in ALL cases (T.O. 2023, T10 art. 38.2.E). */
export const ADVANCE_IVA_RATE = 0.22

/** Day-count convention used to prorate an annual effective rate. */
export const DAYS_IN_YEAR = 365

// ─────────────────────────────────────────────────────────────────────────────
// BCU: legal caps (Ley 18.212)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Value of the Unidad Indexada, from the INE table for the current month.
 * It matters because the BCU cap SPLITS at 10.000 UI: the very same advance is
 * capped at ~131 % or at ~64 % TEA depending on which side of that line it falls.
 */
export const ADVANCE_UI_VALUE = 6.6351
export const ADVANCE_UI_VALUE_DATE = '2026-08-18'
export const UI_SOURCE =
  'https://www5.ine.gub.uy/documents/Estad%C3%ADsticasecon%C3%B3micas/PDF/UI/2026/UI%20Agosto%202026.pdf'

/** The 10.000 UI bracket boundary, in pesos, at {@link ADVANCE_UI_VALUE}. */
export const BRACKET_UI = 10_000
export const BRACKET_PESOS = Math.round(BRACKET_UI * ADVANCE_UI_VALUE)

/** Which side of the 10.000 UI line an operation falls on. */
export type Bracket = 'menor10kUI' | 'mayor10kUI'

/** One row of the BCU quarterly publication, for consumer credit to households. */
export interface BcuCapRow {
  bracket: Bracket
  /** `true` for the "hasta 366 días" row, `false` for "367 días o más". */
  cortoPlazo: boolean
  currency: 'UYU' | 'USD'
  /** Tasa media publicada por el BCU, as a fraction (0.8447 = 84,47 %). */
  media: number
  /** Cap for the ordinary rate: media × 1,55 for capital under 2.000.000 UI. */
  tope: number
  /** Cap for the default rate: media × 1,80. */
  topeMora: number
}

/**
 * BCU "Tasas medias de interés", período ABRIL–JUNIO de 2026, **vigentes a
 * partir del 1º de agosto de 2026** — the table in force today.
 *
 * Column used: Familias › Consumo › **sin autorización de descuento** — a credit
 * card is consumer credit that is not deducted from your salary. The caps are
 * arithmetically consistent with Ley 18.212 (media × 1,55 and × 1,80 for capital
 * under 2.000.000 UI), which is a useful self-check: 84,47 × 1,55 = 130,9285.
 */
export const BCU_CAPS: readonly BcuCapRow[] = Object.freeze([
  {
    bracket: 'menor10kUI',
    cortoPlazo: true,
    currency: 'UYU',
    media: 0.8447,
    tope: 1.309285,
    topeMora: 1.52046,
  },
  {
    bracket: 'menor10kUI',
    cortoPlazo: false,
    currency: 'UYU',
    media: 0.8236,
    tope: 1.27658,
    topeMora: 1.48248,
  },
  {
    bracket: 'mayor10kUI',
    cortoPlazo: true,
    currency: 'UYU',
    media: 0.4102,
    tope: 0.63581,
    topeMora: 0.73836,
  },
  {
    bracket: 'mayor10kUI',
    cortoPlazo: false,
    currency: 'UYU',
    media: 0.5732,
    tope: 0.88846,
    topeMora: 1.03176,
  },
  {
    bracket: 'menor10kUI',
    cortoPlazo: true,
    currency: 'USD',
    media: 0.0826,
    tope: 0.12803,
    topeMora: 0.14868,
  },
  {
    bracket: 'menor10kUI',
    cortoPlazo: false,
    currency: 'USD',
    media: 0.1226,
    tope: 0.19003,
    topeMora: 0.22068,
  },
])

export const BCU_PERIOD = 'abril–junio de 2026'
export const BCU_IN_FORCE_SINCE = '2026-08-01'
export const BCU_SOURCE =
  'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Tasas-Medias/tasas-medias-interes.pdf'

/** Multipliers Ley 18.212 applies over the BCU average, by capital size. */
export const USURY_MARKUP = Object.freeze({
  /** Capital under 2.000.000 UI — the bracket every consumer card sits in. */
  menor2M: 0.55,
  menor2MMora: 0.8,
  mayor2M: 0.9,
  mayor2MMora: 1.2,
})

/** The cap in force for an operation of `montoPesos` repaid within a year. */
export function capFor(
  montoPesos: number,
  currency: 'UYU' | 'USD' = 'UYU',
  cortoPlazo = true
): BcuCapRow {
  const bracket: Bracket =
    currency === 'USD' || montoPesos < BRACKET_PESOS ? 'menor10kUI' : 'mayor10kUI'
  const row = BCU_CAPS.find(
    r => r.bracket === bracket && r.cortoPlazo === cortoPlazo && r.currency === currency
  )
  return row ?? (BCU_CAPS[0] as BcuCapRow)
}

// ─────────────────────────────────────────────────────────────────────────────
// Issuers
// ─────────────────────────────────────────────────────────────────────────────

export interface AdvanceSource {
  label: string
  url: string
  /** Effective date the document itself declares, or its publication date. */
  date: string
}

export interface Issuer {
  id: string
  name: string
  kind: 'banco' | 'emisora'
  /** Fixed commission per advance taken in Uruguay, in pesos. `null` = not published. */
  comisionUyuFija: number | null
  /** Percentage commission over the advanced amount, taken in Uruguay. */
  comisionUyuPct: number
  /** Human description of what the issuer charges for a local advance. */
  comisionUyuNota: string
  /** What it charges for an advance taken abroad. */
  comisionExteriorNota: string
  /**
   * TEA the issuer applies to the advance, net of IVA, as a fraction.
   * `null` means the issuer publishes "tasa máxima permitida" instead of a number
   * — resolve it with {@link resolveTea}.
   */
  teaAdelanto: number | null
  /** TEA for ordinary financed purchases, for contrast. `null` = not published. */
  teaSaldos: number | null
  /**
   * How this issuer expresses the advance's rate. Drives the UI directly, so the
   * page never has to infer "remite al tope legal" from a null and get it wrong
   * for issuers that DO publish a number, just not a per-advance one.
   */
  teaKind: 'tea-adelanto' | 'tna-adelanto' | 'tea-tarjeta' | 'tope-legal' | 'no-publica'
  /** One line naming exactly what the issuer publishes, verbatim in spirit. */
  teaNota: string
  /** TEA in USD for the advance, net of IVA. */
  teaAdelantoUsd: number | null
  /** Does the advance get the statement's interest-free window? Always false so far. */
  graciaSinInteres: boolean
  /** Surcharge on purchases made abroad (fraction, before IVA). */
  recargoExterior: number | null
  recargoExteriorNota: string
  /** Extra spread applied when the transaction is in a currency other than USD/UYU. */
  adicionalTipoCambio: number | null
  adicionalTipoCambioNota: string
  /** Anything else that rides on the balance (credit-life insurance, etc.). */
  extras: readonly string[]
  sources: readonly AdvanceSource[]
  /** Editorial note: what the tariff sheet does and does not actually say. */
  lectura: string
}

/**
 * Six issuers, ordered by how legible their tariff is. Only figures found in the
 * issuer's own published document are here; anything the issuer does not publish
 * is `null` and says so, because guessing a number on this page would be worse
 * than leaving a gap.
 */
export const ISSUERS: readonly Issuer[] = Object.freeze([
  {
    id: 'oca',
    name: 'OCA',
    kind: 'emisora',
    comisionUyuFija: 0,
    comisionUyuPct: 0,
    comisionUyuNota:
      'Comisión de Retiro en Efectivo en Sucursales OCA: 0. Comisión Cajeros (por utilización de tarjetas en cajeros automáticos): 0.',
    comisionExteriorNota:
      'Comisión de Retiro en Efectivo en el exterior: U$S 2,459 + IVA por transacción. Además, Comisión por utilización de la Tarjeta en el exterior: 2,44 % (IVA incluido).',
    teaAdelanto: 0.8,
    teaSaldos: 0.63,
    teaKind: 'tea-adelanto',
    teaNota:
      'Publica una TEA propia para el adelanto: “Financiación de adelantos en Efectivo — 80 %” en pesos y 12 % en dólares, contra 63 % / 12 % para financiación de saldos.',
    teaAdelantoUsd: 0.12,
    graciaSinInteres: false,
    recargoExterior: null,
    recargoExteriorNota:
      'La cartilla cobra 2,44 % (IVA incl.) por utilización de la tarjeta en el exterior.',
    adicionalTipoCambio: null,
    adicionalTipoCambioNota: 'No publicado como línea separada en la cartilla.',
    extras: [
      'Prima de seguro sobre saldos: 0,4 % mensual (máx. 50 UI), IVA incluido.',
      'Mora: 72 % TEA en pesos / 13 % en dólares, + IVA.',
      'Transferir plata desde la tarjeta o pagar una factura con ella es, por contrato, un adelanto de dinero: se financia al 55 % TEA + 1 % de comisión.',
    ],
    sources: [
      {
        label: 'OCA — Tasas efectivas anuales tarjetas de crédito',
        url: 'https://www.oca.com.uy/download/TasasVigentes.pdf',
        date: 'vigente desde el 04/08/2026',
      },
      {
        label: 'OCA — Cartilla contrato de tarjeta de crédito Mastercard',
        url: 'https://www.oca.com.uy/download/cartillaOCA.pdf',
        date: 'vigente desde el 04/08/2026',
      },
      {
        label: 'OCA — Condiciones generales para el uso de tarjeta de crédito',
        url: 'https://www.oca.com.uy/download/contratoOCA.pdf',
        date: 'contrato vigente',
      },
    ],
    lectura:
      'El más transparente del set, y el que deja ver el truco: sacar plata no tiene comisión, pero tiene su propia tasa. OCA publica "Financiación de adelantos en Efectivo: 80 %" al lado de "Financiación de saldos: 63 %". Son 17 puntos de castigo por el solo hecho de que la plata haya salido en efectivo.',
  },
  {
    id: 'itau',
    name: 'Itaú',
    kind: 'banco',
    comisionUyuFija: 0,
    comisionUyuPct: 0,
    comisionUyuNota:
      '"Comisión por adelantos de efectivo realizados en el Uruguay — Con cada adelanto realizado — $0 — Obligatoriedad: Sí".',
    comisionExteriorNota: '"Comisión por adelantos de efectivo realizados en el exterior — $0".',
    teaAdelanto: null,
    teaSaldos: null,
    teaKind: 'tope-legal',
    teaNota:
      'La cartilla lista una “Tasa de interés por adelantos de efectivo” y le pone “Tasa máxima permitida”: remite al tope de la Ley 18.212, sin número propio.',
    teaAdelantoUsd: null,
    graciaSinInteres: false,
    recargoExterior: 0.03,
    recargoExteriorNota:
      'Los consumos sobre compras realizadas en el exterior tienen un recargo del 3 % más IVA.',
    adicionalTipoCambio: 0.03,
    adicionalTipoCambioNota:
      'Las transacciones realizadas en una moneda diferente a pesos o dólares tienen un adicional de 3 % en el tipo de cambio.',
    extras: [
      'La cartilla enumera una "Tasa de interés por adelantos de efectivo" separada de la tasa compensatoria común.',
      'Multa por mora (Ley 18.212 art. 19): el menor entre el 50 % del saldo financiado y 50 UI.',
      'Tributos: "Las comisiones y cargos por servicios prestados en Uruguay y los intereses moratorios y compensatorios están gravados por el Impuesto al Valor Agregado a la tasa básica".',
    ],
    sources: [
      {
        label: 'Itaú — Cartilla · Contrato de tarjeta de crédito',
        url: 'https://www.itau.com.uy/inst/aci/docs/Cartilla_tarjetas_de_credito.pdf',
        date: 'documento fechado 19/03/2026',
      },
      {
        label: 'Itaú — Manual de tarifas, tasas y precios',
        url: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
        date: 'versión agosto 2026',
      },
    ],
    lectura:
      'Sí está publicado, pero no donde lo buscaste. El Manual de tarifas no lo trae: está en la Cartilla-Contrato de tarjeta de crédito. Y lo que dice es lo importante — la comisión es $0, pero la "Tasa de interés por adelantos de efectivo" es "Tasa máxima permitida" y se devenga "con cada adelanto realizado, entre la fecha de la transacción y el vencimiento del E/C". O sea: el tope legal del BCU, contando desde el día que sacaste la plata.',
  },
  {
    id: 'bbva',
    name: 'BBVA',
    kind: 'banco',
    comisionUyuFija: 55,
    comisionUyuPct: 0,
    comisionUyuNota:
      'Retiro de efectivo en UYU: $ 55. Retiros en efectivo en USD: US$ 3. (Visa y Mastercard.)',
    comisionExteriorNota:
      'El manual no publica una comisión distinta por retiro en el exterior; sí un recargo por consumos en el exterior.',
    teaAdelanto: null,
    teaSaldos: null,
    teaKind: 'tna-adelanto',
    teaNota:
      'Es el único que le pone número propio al adelanto, pero en TNA y no en TEA: “Adelantos en Pesos Uruguayos — Tasa Nominal Anual 54,32 %” y 7,73 % en dólares.',
    teaAdelantoUsd: null,
    graciaSinInteres: false,
    recargoExterior: 0.03,
    recargoExteriorNota:
      'Compras en el exterior: 3 % + IVA (Internacional), 1,5 % + IVA (Oro/Platinum), sin costo (Infinite/Black).',
    adicionalTipoCambio: null,
    adicionalTipoCambioNota: 'No publicado como línea separada.',
    extras: [
      'Anticipos por caja: 0,66 %, mínimo US$ 10 (sólo para clientes).',
      'Seguro sobre saldo deudor: 4 por mil sobre el monto asegurado.',
      'Multa por mora: UI 50 cuando el interés por atraso queda por debajo de ese monto (Ley 18.212 art. 19).',
    ],
    sources: [
      {
        label: 'BBVA Uruguay — Manual de tarifas y comisiones',
        url: 'https://www.bbva.com.uy/content/dam/public-web/uruguay/documents/NuevoTarifario2024.pdf',
        date: 'última actualización 20 de julio de 2026',
      },
    ],
    lectura:
      'El único que publica la tasa del adelanto como número propio, pero en TNA y no en TEA: "Adelantos en Pesos Uruguayos — Tasa Nominal Anual 54,32 %" y "Adelantos en Dólares estadounidenses — Tasa Nominal Anual 7,73 %". Una TNA no se compara de frente contra una TEA: hay que capitalizarla primero.',
  },
  {
    id: 'brou',
    name: 'BROU',
    kind: 'banco',
    comisionUyuFija: 0,
    comisionUyuPct: 0,
    comisionUyuNota:
      'En sucursales BROU y RedBROU: "Se cobrarán intereses más IVA según la tasa vigente" (sin comisión aparte).',
    comisionExteriorNota:
      'Local fuera del Banco u otra red de ATM, y en el exterior: U$S 1,75 más IVA + 0,33 % del adelanto.',
    teaAdelanto: null,
    teaSaldos: 0.8,
    teaKind: 'tea-tarjeta',
    teaNota:
      'No separa una tasa para el adelanto: publica una sola tasa de tarjeta de crédito, 80,00 % fija en pesos y 7,50 % en dólares, aclarando que “las tasas informadas no incluyen IVA”.',
    teaAdelantoUsd: null,
    graciaSinInteres: false,
    recargoExterior: 0.03,
    recargoExteriorNota:
      'Las tarjetas Oro, Platinum y Black exoneran la comisión del 3 % en compras y créditos en el exterior.',
    adicionalTipoCambio: null,
    adicionalTipoCambioNota: 'No publicado como línea separada.',
    extras: [
      'Para adelantos en pesos fuera de RedBROU se cobra en pesos convertidos al tipo de cambio del día.',
      'La página de tasas activas aclara que "las tasas informadas no incluyen IVA".',
    ],
    sources: [
      {
        label: 'BROU — Costos y exoneraciones, tarjetas de crédito',
        url: 'https://www.brou.com.uy/personas/tarjetas/costos-y-exoneraciones-visa-y-master/credito',
        date: 'tarifario vigente desde el 1 de febrero de 2025',
      },
      {
        label: 'BROU — Tasas activas · Tarjetas de crédito',
        url: 'https://www.brou.com.uy/personas/tarjetas/tasas-activas-tarjetas-de-credito',
        date: 'tasa fija publicada',
      },
    ],
    lectura:
      'BROU no publica una tasa separada para el adelanto: publica una sola tasa de tarjeta de crédito, 80,00 % en pesos, sin IVA. Lo que sí separa es la comisión: gratis en su propia red, U$S 1,75 + IVA + 0,33 % si sacás en un cajero ajeno o afuera.',
  },
  {
    id: 'scotiabank',
    name: 'Scotiabank',
    kind: 'banco',
    comisionUyuFija: null,
    comisionUyuPct: 0,
    comisionUyuNota:
      'La cartilla de tarjetas de crédito para personas físicas no publica una comisión específica por adelanto de efectivo.',
    comisionExteriorNota: 'No publicada como línea separada en esa cartilla.',
    teaAdelanto: null,
    teaSaldos: null,
    teaKind: 'tope-legal',
    teaNota:
      'La cartilla pone “Tasa máxima permitida” en la tasa efectiva anual, en la de mora y en la de préstamo en tarjeta, y linkea a la página de tasas medias del BCU.',
    teaAdelantoUsd: null,
    graciaSinInteres: false,
    recargoExterior: 0.03,
    recargoExteriorNota:
      'Compras en el exterior: 3 % (Internacionales y Mastercard Oro), 1,5 % (Amex Oro y Visa Platinum), 0 % (Amex Platinum y Visa Infinite), + IVA.',
    adicionalTipoCambio: 0.06,
    adicionalTipoCambioNota:
      'Adicional tipo de cambio para transacciones en moneda distinta a dólares: Visa Internacional 6 %, Visa Platinum 4,5 %, Visa Infinite 3 %, Mastercard 3 %.',
    extras: [
      'Las tasas publicadas "incluyen la Tasa de Control Regulatorio del Sistema Financiero (0,10 %)".',
      'Seguro de vida: 0,4 % sobre saldo contado y financiado.',
      'Comisión por créditos recibidos desde el exterior de empresas de servicios de pago y cobranzas: 3 % del monto.',
    ],
    sources: [
      {
        label: 'Scotiabank Uruguay — Cartilla, tarjetas de crédito personas físicas (F2540)',
        url: 'https://cdn.aglty.io/scotiabank-uruguay/cartillas-condiciones-de-productos/bp/2026/04-abril/24-actualizacion-cartillas/F2540_20260320_TARJETAS_DE_CREDITO_PERSONAS_FISICAS.pdf',
        date: 'documento fechado 20/03/2026',
      },
    ],
    lectura:
      'Como Itaú, remite al tope: la cartilla dice "Tasa máxima permitida" en la tasa efectiva anual, en la de mora y en la de préstamo en tarjeta, y linkea directo a la página de tasas medias del BCU. El dato caro y propio de Scotia es otro: el adicional por tipo de cambio de hasta 6 % en toda transacción que no sea en dólares.',
  },
  {
    id: 'santander',
    name: 'Santander',
    kind: 'banco',
    comisionUyuFija: null,
    comisionUyuPct: 0,
    comisionUyuNota:
      'El centro de ayuda dice que el retiro de efectivo en cajeros Santander no lleva comisión. No figura en el Manual de tarifas, que cubre cuentas y no adelantos de tarjeta.',
    comisionExteriorNota:
      'En otros cajeros, US$ 5 por extracción más la comisión de la red que se esté usando (varía por país).',
    teaAdelanto: null,
    teaSaldos: null,
    teaKind: 'no-publica',
    teaNota:
      'No publica una TEA fija: las tasas de interés compensatorio y moratorio “serán informadas en cada Estado de Cuenta”.',
    teaAdelantoUsd: null,
    graciaSinInteres: false,
    recargoExterior: null,
    recargoExteriorNota: 'No relevado en la fuente consultada.',
    adicionalTipoCambio: null,
    adicionalTipoCambioNota: 'No relevado en la fuente consultada.',
    extras: [
      'Las tasas de interés compensatorio y moratorio se informan en cada estado de cuenta, no en un tarifario fijo.',
    ],
    sources: [
      {
        label: 'Santander Uruguay — Centro de ayuda · Tarjetas · Viajes',
        url: 'https://www.santander.com.uy/centro-de-ayuda/tarjetas/viajes',
        date: 'consultado el 18/08/2026',
      },
      {
        label: 'Santander Uruguay — Manual de tarifas',
        url: 'https://www.santander.com.uy/manual-de-tarifas',
        date: 'versión 14/03/2026',
      },
    ],
    lectura:
      'La fuente disponible es el centro de ayuda y está escrita para el contexto de viajes, así que la tomamos con pinzas: sirve para el orden de magnitud de la comisión, no para fijar la tasa. Santander no publica una TEA fija de tarjeta: la informa en cada estado de cuenta.',
  },
])

export function getIssuer(id: string): Issuer | undefined {
  return ISSUERS.find(i => i.id === id)
}

/**
 * The TEA to apply, resolving "tasa máxima permitida" against the BCU cap.
 * Returns the rate NET of IVA plus how it was obtained, so the UI can say so.
 */
export function resolveTea(
  issuer: Pick<Issuer, 'teaAdelanto'>,
  montoPesos: number
): { tea: number; fuente: 'publicada' | 'tope-bcu' } {
  if (issuer.teaAdelanto !== null) return { tea: issuer.teaAdelanto, fuente: 'publicada' }
  return { tea: capFor(montoPesos).tope, fuente: 'tope-bcu' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate maths
// ─────────────────────────────────────────────────────────────────────────────

/** TNA with `m` capitalisations per year → TEA. BBVA publishes TNA, everyone else TEA. */
export function tnaToTea(tna: number, capitalizacionesPorAno = 12): number {
  if (capitalizacionesPorAno <= 0) return tna
  return (1 + tna / capitalizacionesPorAno) ** capitalizacionesPorAno - 1
}

/** BBVA's published TNA for peso cash advances (Manual de tarifas, 20/07/2026). */
export const BBVA_TNA_ADELANTO_UYU = 0.5432
export const BBVA_TNA_ADELANTO_USD = 0.0773

/** Fraction of an annual effective rate accrued over `dias` days. */
export function prorateTea(tea: number, dias: number): number {
  if (dias <= 0) return 0
  return (1 + tea) ** (dias / DAYS_IN_YEAR) - 1
}

/**
 * The rate you actually pay once IVA rides on the interest. Uruguayan issuers
 * publish the TEA net of IVA, so this is the honest headline number.
 */
export function teaConIva(tea: number): number {
  return tea * (1 + ADVANCE_IVA_RATE)
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation: taking the cash straight out of the card
// ─────────────────────────────────────────────────────────────────────────────

export interface AdvanceInput {
  /** Cash you want in your hand, in pesos. */
  montoPesos: number
  /** Days until you actually pay the statement. No grace period applies. */
  dias: number
  /** Fixed commission per advance, in pesos, before IVA. */
  comisionFija: number
  /** Percentage commission over the advanced amount, before IVA. */
  comisionPct: number
  /** TEA applied to the advance, NET of IVA. */
  tea: number
  /** Extra per-month charge on the balance (credit-life insurance and friends). */
  seguroMensualPct?: number
}

export interface AdvanceResult {
  montoPesos: number
  dias: number
  comisionSinIva: number
  ivaComision: number
  interesSinIva: number
  ivaInteres: number
  seguro: number
  /** Everything you end up owing on top of the cash you took. */
  costoTotal: number
  /** Cash + cost. */
  totalAPagar: number
  /** Cost as a share of the cash taken. */
  costoPct: number
  /**
   * The whole thing annualised, so it can sit next to a loan's TEA:
   * `(1 + costoPct) ^ (365 / días) − 1`.
   */
  costoAnualizado: number
}

/** What a cash advance really costs, layer by layer. */
export function simulateAdvance(input: AdvanceInput): AdvanceResult {
  const monto = Math.max(0, input.montoPesos || 0)
  const dias = Math.max(0, input.dias || 0)

  const comisionSinIva = (input.comisionFija || 0) + monto * (input.comisionPct || 0)
  const ivaComision = comisionSinIva * ADVANCE_IVA_RATE

  const interesSinIva = monto * prorateTea(input.tea || 0, dias)
  const ivaInteres = interesSinIva * ADVANCE_IVA_RATE

  const meses = dias / 30
  const seguro = monto * (input.seguroMensualPct || 0) * meses

  const costoTotal = comisionSinIva + ivaComision + interesSinIva + ivaInteres + seguro
  const costoPct = monto > 0 ? costoTotal / monto : 0

  return {
    montoPesos: monto,
    dias,
    comisionSinIva,
    ivaComision,
    interesSinIva,
    ivaInteres,
    seguro,
    costoTotal,
    totalAPagar: monto + costoTotal,
    costoPct,
    costoAnualizado: dias > 0 ? (1 + costoPct) ** (DAYS_IN_YEAR / dias) - 1 : 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation: the crypto detour
// ─────────────────────────────────────────────────────────────────────────────

/** Binance's own published card-purchase fee ceiling, and the P2P maker band. */
export const BINANCE_CARD_FEE = 0.02
export const BINANCE_P2P_TAKER_FEE = 0
export const BINANCE_P2P_MAKER_FEE_MIN = 0.0015
export const BINANCE_P2P_MAKER_FEE_MAX = 0.0035

export interface CryptoInput {
  /** Cash you want in your hand at the end, in pesos — same goal as the advance. */
  montoPesos: number
  /** Days until you pay the statement. */
  dias: number
  /** Issuer surcharge on purchases made abroad, before IVA. */
  recargoExterior: number
  /** Extra spread when the transaction is not in USD (Scotia's 6 %, Itaú's 3 %…). */
  adicionalTipoCambio: number
  /** Platform fee for buying crypto with the card. */
  comisionCompraCripto: number
  /** Fee paid when selling the stablecoin back for pesos (P2P maker fee). */
  comisionVentaP2p: number
  /** Round-trip spread between the buy price and the sell price of the stablecoin. */
  spreadCompraVenta: number
  /**
   * `true` when the issuer flags the purchase as quasi-cash (MCC 6051) and
   * therefore applies the cash-advance treatment ON TOP of the surcharges.
   */
  tratadoComoAdelanto: boolean
  /** TEA of the advance, net of IVA — only used when `tratadoComoAdelanto`. */
  tea: number
  /** Fixed commission the issuer would charge for an advance, before IVA. */
  comisionFija: number
}

export interface CryptoResult {
  /** Pesos that end up in your hand. */
  pesosEnMano: number
  /** Pesos the statement will ask you for. */
  deudaTarjeta: number
  costoTotal: number
  costoPct: number
  costoAnualizado: number
  /** Each layer, in pesos, for the breakdown table. */
  capas: readonly { id: string; label: string; pesos: number }[]
  tratadoComoAdelanto: boolean
}

/**
 * The "compro cripto con la tarjeta y la vendo en Binance" route, priced honestly.
 *
 * The model charges the card for whatever it takes to end up with `montoPesos`
 * in hand, so it is directly comparable with {@link simulateAdvance}: same cash
 * out, different amount owed.
 *
 * The `tratadoComoAdelanto` switch is the crux. Mastercard requires crypto
 * purchases to be coded MCC 6051 (quasi-cash), and Binance's own support page
 * warns that "some banks may classify crypto transactions as quasi-cash
 * payments, resulting in additional fees". When that happens you pay the
 * foreign-purchase surcharge AND the cash-advance interest from day one — the
 * detour is then strictly worse than walking to the ATM.
 */
export function simulateCrypto(input: CryptoInput): CryptoResult {
  const objetivo = Math.max(0, input.montoPesos || 0)
  const dias = Math.max(0, input.dias || 0)

  // Work backwards from the cash you want, through every leak, to the card charge.
  const retencionVenta = (1 - input.spreadCompraVenta) * (1 - input.comisionVentaP2p)
  const retencionCompra = 1 - input.comisionCompraCripto
  const rendimiento = retencionCompra * retencionVenta

  // Pesos charged to the card before the issuer's own surcharges.
  const cargoBase = rendimiento > 0 ? objetivo / rendimiento : 0

  const perdidaCompra = cargoBase * input.comisionCompraCripto
  const trasCompra = cargoBase - perdidaCompra
  const perdidaSpread = trasCompra * input.spreadCompraVenta
  const perdidaVenta = (trasCompra - perdidaSpread) * input.comisionVentaP2p

  const recargo = cargoBase * input.recargoExterior
  const ivaRecargo = recargo * ADVANCE_IVA_RATE
  const adicionalFx = cargoBase * input.adicionalTipoCambio

  const cargoTarjeta = cargoBase + recargo + ivaRecargo + adicionalFx

  const comisionAdelanto = input.tratadoComoAdelanto ? input.comisionFija || 0 : 0
  const ivaComisionAdelanto = comisionAdelanto * ADVANCE_IVA_RATE
  const interes = input.tratadoComoAdelanto ? cargoTarjeta * prorateTea(input.tea || 0, dias) : 0
  const ivaInteres = interes * ADVANCE_IVA_RATE

  const deudaTarjeta = cargoTarjeta + comisionAdelanto + ivaComisionAdelanto + interes + ivaInteres
  const costoTotal = deudaTarjeta - objetivo
  const costoPct = objetivo > 0 ? costoTotal / objetivo : 0

  return {
    pesosEnMano: objetivo,
    deudaTarjeta,
    costoTotal,
    costoPct,
    costoAnualizado: dias > 0 ? (1 + costoPct) ** (DAYS_IN_YEAR / dias) - 1 : 0,
    capas: [
      { id: 'compra', label: 'Comisión de compra de cripto con tarjeta', pesos: perdidaCompra },
      {
        id: 'spread',
        label: 'Spread entre el precio de compra y el de venta',
        pesos: perdidaSpread,
      },
      { id: 'venta', label: 'Comisión al vender en P2P', pesos: perdidaVenta },
      { id: 'recargo', label: 'Recargo por compra en el exterior', pesos: recargo },
      { id: 'ivaRecargo', label: 'IVA sobre el recargo', pesos: ivaRecargo },
      {
        id: 'fx',
        label: 'Adicional por tipo de cambio (moneda distinta a dólares)',
        pesos: adicionalFx,
      },
      {
        id: 'comision',
        label: 'Comisión por adelanto (si lo marcan quasi-cash)',
        pesos: comisionAdelanto + ivaComisionAdelanto,
      },
      {
        id: 'interes',
        label: 'Interés desde el día 1 (si lo marcan quasi-cash)',
        pesos: interes + ivaInteres,
      },
    ].filter(c => c.pesos > 0.005),
    tratadoComoAdelanto: input.tratadoComoAdelanto,
  }
}

/** Sensible starting point for the crypto simulator: a Visa Internacional, in USD. */
export const CRYPTO_DEFAULTS = Object.freeze({
  recargoExterior: 0.03,
  adicionalTipoCambio: 0,
  comisionCompraCripto: BINANCE_CARD_FEE,
  comisionVentaP2p: 0.0025,
  spreadCompraVenta: 0.01,
})

// ─────────────────────────────────────────────────────────────────────────────
// Alternatives
// ─────────────────────────────────────────────────────────────────────────────

export interface Alternative {
  id: string
  label: string
  /** Annual effective cost, net of IVA, as a fraction. `null` when it varies. */
  tea: number | null
  /** Short reason this is better or worse than pulling cash from the card. */
  cuando: string
  tono: 'mejor' | 'parecido' | 'peor'
  fuente?: AdvanceSource
}

/**
 * What else you can do when you need pesos, priced with the same yardstick.
 * Every rate here is net of IVA, like the issuers publish them, so they compare.
 */
export const ALTERNATIVES: readonly Alternative[] = Object.freeze([
  {
    id: 'financiar-saldo',
    label: 'Financiar el estado de cuenta en vez de sacar efectivo',
    tea: 0.55,
    tono: 'mejor',
    cuando:
      'Si lo que necesitás es no pagar todo este mes, financiar el estado de cuenta sale bastante menos que un adelanto: OCA cobra 55 % TEA por financiar el estado de cuenta contra 80 % por el adelanto.',
    fuente: {
      label: 'OCA — Tasas efectivas anuales tarjetas de crédito',
      url: 'https://www.oca.com.uy/download/TasasVigentes.pdf',
      date: 'vigente desde el 04/08/2026',
    },
  },
  {
    id: 'reestructura',
    label: 'Reestructurar el saldo en cuotas (2 a 36 meses)',
    tea: 0.62,
    tono: 'mejor',
    cuando:
      'Si ya te pasaste y el saldo no baja, reestructurarlo sale 62 % TEA en OCA: menos que el adelanto y bastante menos que la mora (72 %).',
    fuente: {
      label: 'OCA — Tasas efectivas anuales tarjetas de crédito',
      url: 'https://www.oca.com.uy/download/TasasVigentes.pdf',
      date: 'vigente desde el 04/08/2026',
    },
  },
  {
    id: 'prestamo-corto',
    label: 'Préstamo amortizable corto (7 a 11 cuotas)',
    tea: 0.62,
    tono: 'mejor',
    cuando:
      'Para montos menores a 10.000 UI, un préstamo común de corto plazo en OCA está publicado en 62 % TEA. Cuota fija, plazo cerrado y sin la trampa de que el interés corra desde el día 1.',
    fuente: {
      label: 'OCA — Tasas efectivas anuales préstamos amortizables',
      url: 'https://www.oca.com.uy/download/TasasVigentes.pdf',
      date: 'vigente desde el 04/08/2026',
    },
  },
  {
    id: 'transferencia-tarjeta',
    label: 'Transferir desde la tarjeta a una cuenta',
    tea: 0.55,
    tono: 'parecido',
    cuando:
      'OCA lo financia al 55 % TEA más 1 % de comisión. Ojo: por contrato "constituirá un adelanto de dinero", así que legalmente es lo mismo que sacar efectivo — pero la tasa publicada es menor.',
    fuente: {
      label: 'OCA — Tasas efectivas anuales tarjetas de crédito',
      url: 'https://www.oca.com.uy/download/TasasVigentes.pdf',
      date: 'vigente desde el 04/08/2026',
    },
  },
  {
    id: 'vender-dolares',
    label: 'Vender dólares que ya tenés en una casa de cambio',
    tea: null,
    tono: 'mejor',
    cuando:
      'Si el problema es liquidez en pesos y tenés dólares guardados, el costo es el spread de una sola operación, no una tasa anual. Es casi siempre la salida más barata.',
  },
  {
    id: 'mora',
    label: 'No pagar y caer en mora',
    tea: 0.72,
    tono: 'peor',
    cuando:
      'La peor idea de la lista: además de la tasa de mora se suma la multa de la Ley 18.212 art. 19 y el registro en la central de riesgos del BCU. Un adelanto caro es mejor que un impago.',
    fuente: {
      label: 'OCA — Tasas efectivas anuales tarjetas de crédito',
      url: 'https://www.oca.com.uy/download/TasasVigentes.pdf',
      date: 'vigente desde el 04/08/2026',
    },
  },
])

// ─────────────────────────────────────────────────────────────────────────────
// Editorial content
// ─────────────────────────────────────────────────────────────────────────────

export interface ProCon {
  text: string
  detail: string
}

export const PROS: readonly ProCon[] = Object.freeze([
  {
    text: 'Es inmediato y no se pide',
    detail:
      'No hay solicitud, ni análisis, ni firma: el cupo ya está aprobado. Contra una urgencia de hoy, un préstamo que se aprueba en tres días no compite.',
  },
  {
    text: 'No deja un producto nuevo abierto',
    detail:
      'No abrís una línea nueva ni sumás un préstamo a tu historial: usás el cupo que ya tenías. Si lo cancelás al primer vencimiento, desaparece.',
  },
  {
    text: 'En Uruguay la comisión suele ser cero',
    detail:
      'Itaú publica $0 por adelanto en el país y OCA cobra 0 en sucursales y cajeros. En muchos países la comisión sola es 3–5 %; acá el costo está casi todo en la tasa.',
  },
  {
    text: 'Sale muchísimo menos que caer en mora',
    detail:
      'Si la alternativa real es no pagar, el adelanto gana por goleada: evitás la multa del art. 19 y el registro de atraso.',
  },
])

/**
 * Los contras, con el tope legal del día adentro.
 *
 * Función y no constante porque uno de estos renglones publicaba "130,93 %" como el tope de hoy
 * cuando el BCU ya marcaba 133,49 %: la tabla se republica todos los meses y una frase escrita a
 * mano no se entera.
 */
export function buildCons(caps: AdvanceCapLabels): readonly ProCon[] {
  return Object.freeze([
    {
      text: 'No hay período sin intereses',
      detail:
        'Es la diferencia que más plata cuesta. Una compra no paga interés hasta el vencimiento; el adelanto empieza a devengar el día que sacaste la plata. Itaú lo dice textual: "entre la fecha de la transacción y el vencimiento del E/C".',
    },
    {
      text: 'La tasa es más alta que la de una compra financiada',
      detail:
        'No es la misma tasa con otro nombre: es otra tasa. OCA publica 80 % TEA para adelantos contra 63 % para financiación de saldos.',
    },
    {
      text: 'La tasa publicada no incluye IVA',
      detail:
        'Todos los emisores publican la TEA "+ IVA". Y el IVA sobre intereses de tarjeta no tiene exoneración posible: el 80 % de OCA se paga como 97,6 %.',
    },
    {
      text: 'Los que no publican número te mandan al tope legal',
      detail: `Itaú y Scotiabank dicen "tasa máxima permitida". Hoy, para un adelanto de menos de 10.000 UI a devolver dentro del año, ese tope es ${caps.topeChico} TEA — y con IVA, ${caps.topeChicoConIva}.`,
    },
    {
      text: 'No suma puntos ni millas',
      detail:
        'Prácticamente todos los programas excluyen los adelantos de efectivo de la acumulación. Pagás la tasa más cara y encima no acumulás.',
    },
    {
      text: 'El cupo de adelanto es menor que el de compra',
      detail:
        'El contrato de OCA lo dice: el adelanto llega "hasta el porcentaje máximo del Límite de Crédito que se indica en la Cartilla". No dispongas del límite entero.',
    },
  ])
}

export interface AdvanceFaq {
  q: string
  a: string
}

/**
 * Las etiquetas ya formateadas de la grilla del BCU del día.
 *
 * Llegan como texto y no como número para que la página, el JSON-LD y los tests publiquen
 * exactamente el mismo string: dos formateos distintos del mismo dato son dos cifras distintas en
 * pantalla, que es la clase de contradicción que este archivo dejó de publicar el 2026-09-03.
 */
export interface AdvanceCapLabels {
  mediaChico: string
  topeChico: string
  topeChicoConIva: string
  mediaGrande: string
  topeGrande: string
  vigenteDesde: string
}

export function buildFaqs(caps: AdvanceCapLabels): readonly AdvanceFaq[] {
  return Object.freeze([
    {
      q: '¿Por qué Itaú no lo tiene en el tarifario?',
      a: 'Sí lo tiene, pero no en el Manual de tarifas: está en la <strong>Cartilla · Contrato de tarjeta de crédito</strong> (documento fechado 19/03/2026). Ahí figuran tres líneas: "Comisión por adelantos de efectivo realizados en el Uruguay — $0", la misma para el exterior, y "Tasa de interés por adelantos de efectivo — Tasa máxima permitida", devengada "con cada adelanto realizado, entre la fecha de la transacción y el vencimiento del E/C". El Manual de tarifas cubre cuentas, transferencias y servicios; las condiciones de la tarjeta viven en la cartilla.',
    },
    {
      q: '¿Qué es exactamente la "tasa máxima permitida"?',
      a: `Es el tope de la <strong>Ley 18.212</strong>: la tasa media que publica el BCU cada trimestre, más 55 % si el capital es menor a 2.000.000 UI. Para crédito al consumo a familias sin descuento de sueldo, con la tabla vigente desde el ${caps.vigenteDesde}, la media es ${caps.mediaChico} y el tope <strong>${caps.topeChico} TEA</strong> para operaciones menores a 10.000 UI. Por encima de 10.000 UI la media baja a ${caps.mediaGrande} y el tope a ${caps.topeGrande}.`,
    },
    {
      q: '¿De verdad cambia tanto según el monto?',
      a: `Sí, y es la asimetría más rara del sistema. La ley parte las tasas medias en dos por el tamaño del crédito, con el corte en 10.000 UI —hoy unos $${BRACKET_PESOS.toLocaleString('es-UY')}—. Debajo de esa línea el tope es ${caps.topeChico}; arriba, ${caps.topeGrande}. El mismo emisor, la misma tarjeta, el mismo día: el adelanto chico puede costar el doble de tasa que el grande.`,
    },
    {
      q: '¿El IVA se suma a la tasa o ya está adentro?',
      a: `Se suma. Los tarifarios dicen "+ IVA" o "las tasas informadas no incluyen IVA". Y no hay margen de interpretación: el <strong>Título 10 del T.O. 2023, art. 38, num. 2 lit. E)</strong> establece que "los intereses de créditos y financiaciones otorgados mediante tarjetas de créditos y similares, estarán gravados en todos los casos". El IVA sobre intereses, eso sí, <strong>no se computa</strong> para medir la usura (Ley 18.212, art. 14), así que el tope de ${caps.topeChico} se mide sin IVA aunque vos lo pagues.`,
    },
    {
      q: '¿Conviene comprar cripto con la tarjeta y venderla en Binance?',
      a: 'Casi nunca, y el motivo no es el precio de la cripto. Mastercard exige que las compras de criptomonedas se identifiquen con el <strong>MCC 6051 (quasi-cash)</strong>, y el propio soporte de Binance avisa que "algunos bancos pueden clasificar las transacciones de cripto como pagos quasi-cash, lo que genera comisiones adicionales". Si tu emisor lo marca así, pagás las dos cosas: el recargo por compra en el exterior <em>y</em> el interés de adelanto desde el día 1. Si no lo marca, tenés una chance de que salga parecido —pero le sumás spread, comisión de plataforma, riesgo de contraparte en el P2P y cero derecho a contracargo.',
    },
    {
      q: '¿Es legal operar con Binance desde Uruguay?',
      a: 'Operar con activos virtuales no está prohibido. Lo que cambió es el marco: la <strong>Ley 20.345</strong> (10/09/2024) facultó al BCU a regular a los proveedores de servicios de activos virtuales, y la <strong>Circular 2507</strong> (16/07/2026) incorporó el régimen a la Recopilación de Normas del Mercado de Valores, con autorización previa obligatoria de la Superintendencia de Servicios Financieros. Antes de operar conviene verificar si la plataforma que usás está autorizada: si no lo está, no tenés detrás ninguna de las protecciones del sistema regulado.',
    },
    {
      q: '¿El banco me puede preguntar de dónde salió la plata?',
      a: 'Sí, y es lo normal. Cuando entra dinero desde un exchange, el banco aplica su régimen de prevención de lavado y puede pedirte justificación de origen de fondos. Scotiabank además publica una <strong>comisión de 3 % por créditos recibidos desde el exterior de empresas de servicios de pago y cobranzas</strong>: una capa más de costo en la pata de vuelta que casi nadie cuenta.',
    },
    {
      q: '¿Sacar efectivo me deja marcado en el clearing?',
      a: 'No por sí mismo. Un adelanto es uso normal del cupo y no genera ninguna anotación: lo que se informa a la central de riesgos del BCU es tu calificación como deudor, que empeora si te atrasás. El riesgo real es indirecto: como el interés corre desde el día 1 y no acumula puntos, es la forma más rápida de que el saldo crezca más rápido de lo que podés pagar.',
    },
    {
      q: '¿Y si saco en un cajero que no es de mi banco?',
      a: 'Ahí aparece la comisión que en Uruguay suele ser cero. BROU cobra <strong>U$S 1,75 + IVA + 0,33 %</strong> del adelanto si sacás fuera de su red o en el exterior, y OCA cobra <strong>U$S 2,459 + IVA</strong> por retiro en el exterior. Santander informa US$ 5 por extracción en cajeros ajenos, más la comisión de la red local del país donde estés.',
    },
    {
      q: '¿Cuál es la salida más barata si necesito pesos ya?',
      a: 'Si tenés dólares guardados, venderlos: pagás un spread de una sola operación en vez de una tasa anual. Si no, financiar el estado de cuenta (55 % TEA en OCA) o reestructurar el saldo (62 %) sale menos que el adelanto (80 %). El adelanto gana sólo contra una cosa: no pagar.',
    },
  ])
}

/** Everything cited on the page, in one list so the UI never invents a link. */
export const ADVANCE_SOURCES: readonly AdvanceSource[] = Object.freeze([
  {
    label:
      'BCU — Tasas medias de interés (abril–junio 2026, vigentes desde el 1º de agosto de 2026)',
    url: BCU_SOURCE,
    date: '2026-08-01',
  },
  {
    label: 'BCU — Topes de tasas de interés y usura (Usuario Financiero)',
    url: 'https://usuariofinanciero.bcu.gub.uy/tasas/topes-de-tasas-de-interes-y-usura/',
    date: 'consultado 18/08/2026',
  },
  {
    label: 'Ley N° 18.212 — Tasas de interés y usura (texto vigente)',
    url: 'https://www.impo.com.uy/bases/leyes/18212-2007',
    date: '2007-12-19',
  },
  {
    label:
      'DGI — Título 10 T.O. 2023, art. 38 (IVA: intereses de tarjetas de crédito gravados en todos los casos)',
    url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
    date: 'T.O. 2023',
  },
  { label: 'INE — Unidad Indexada, agosto 2026', url: UI_SOURCE, date: '2026-08-05' },
  {
    label: 'OCA — Tasas efectivas anuales de tarjetas de crédito',
    url: 'https://www.oca.com.uy/download/TasasVigentes.pdf',
    date: 'vigente 04/08/2026',
  },
  {
    label: 'OCA — Cartilla contrato de tarjeta de crédito Mastercard',
    url: 'https://www.oca.com.uy/download/cartillaOCA.pdf',
    date: 'vigente 04/08/2026',
  },
  {
    label: 'OCA — Condiciones generales de uso de tarjeta de crédito',
    url: 'https://www.oca.com.uy/download/contratoOCA.pdf',
    date: 'contrato vigente',
  },
  {
    label: 'Itaú — Cartilla · Contrato de tarjeta de crédito',
    url: 'https://www.itau.com.uy/inst/aci/docs/Cartilla_tarjetas_de_credito.pdf',
    date: '19/03/2026',
  },
  {
    label: 'Itaú — Manual de tarifas, tasas y precios',
    url: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
    date: 'agosto 2026',
  },
  {
    label: 'BBVA Uruguay — Manual de tarifas y comisiones',
    url: 'https://www.bbva.com.uy/content/dam/public-web/uruguay/documents/NuevoTarifario2024.pdf',
    date: '20/07/2026',
  },
  {
    label: 'BROU — Costos y exoneraciones · Tarjetas de crédito',
    url: 'https://www.brou.com.uy/personas/tarjetas/costos-y-exoneraciones-visa-y-master/credito',
    date: 'vigente 01/02/2025',
  },
  {
    label: 'BROU — Tasas activas · Tarjetas de crédito',
    url: 'https://www.brou.com.uy/personas/tarjetas/tasas-activas-tarjetas-de-credito',
    date: 'consultado 18/08/2026',
  },
  {
    label: 'Scotiabank Uruguay — Cartilla de tarjetas de crédito, personas físicas (F2540)',
    url: 'https://cdn.aglty.io/scotiabank-uruguay/cartillas-condiciones-de-productos/bp/2026/04-abril/24-actualizacion-cartillas/F2540_20260320_TARJETAS_DE_CREDITO_PERSONAS_FISICAS.pdf',
    date: '20/03/2026',
  },
  {
    label: 'Santander Uruguay — Centro de ayuda · Tarjetas · Viajes',
    url: 'https://www.santander.com.uy/centro-de-ayuda/tarjetas/viajes',
    date: 'consultado 18/08/2026',
  },
  {
    label: 'Santander Uruguay — Manual de tarifas',
    url: 'https://www.santander.com.uy/manual-de-tarifas',
    date: 'versión 14/03/2026',
  },
  {
    label:
      'Binance — Cómo comprar criptomonedas con tarjeta de crédito o débito (aviso sobre quasi-cash)',
    url: 'https://www.binance.com/es-MX/support/faq/c%C3%B3mo-comprar-criptomonedas-con-tarjeta-de-cr%C3%A9dito-o-d%C3%A9bito-8df758a570ba4d18941f38423f63aae5',
    date: 'consultado 18/08/2026',
  },
])

/** What we could NOT confirm, published as such instead of estimated. */
export const GAPS: readonly string[] = Object.freeze([
  'Scotiabank y Santander no publican una comisión específica por adelanto de efectivo en la cartilla de tarjetas de crédito de personas físicas. El dato de Santander (sin comisión en cajeros propios, US$ 5 en ajenos) sale del centro de ayuda, escrito para el contexto de viajes.',
  'Itaú y Scotiabank no publican una TEA numérica: remiten a la "tasa máxima permitida". Lo que mostramos es el tope del BCU, que es el techo legal, no necesariamente lo que efectivamente te cobran.',
  'BBVA publica el adelanto en TNA (54,32 % en pesos) y no aclara la frecuencia de capitalización. La conversión a TEA que mostramos asume capitalización mensual y va rotulada como cálculo nuestro.',
  'BROU publica una sola tasa de tarjeta de crédito (80,00 % en pesos, sin IVA) y no separa una tasa específica para adelantos.',
  'La Ley 18.212 parte los topes según el capital de la operación. Que el tramo aplicable a un adelanto se mida por el monto retirado o por la línea de crédito de la tarjeta no está resuelto de forma explícita en la norma; el simulador usa el monto retirado y lo dice.',
  'Las comisiones de Binance (hasta 2 % por compra con tarjeta; P2P con taker 0 % y maker 0,15–0,35 %) provienen de la documentación pública de la plataforma y de comparadores, no de un tarifario con fecha de vigencia como los uruguayos. Tomalas como orden de magnitud.',
  'No relevamos el precio del USDT en el P2P uruguayo: cambia hora a hora y depende de la contraparte. El simulador te deja poner el spread que veas vos.',
])
