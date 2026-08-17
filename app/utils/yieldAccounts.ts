// app/utils/yieldAccounts.ts
// Data + math for /cuenta-remunerada-uruguay — "la plata que rinde sola":
// the products that pay a daily yield on the money you already keep in a wallet
// or account in Uruguay, without a fixed term and without locking the funds.
//
// The whole page hangs off one legal fact that almost every headline gets wrong:
// in Uruguay an electronic-money balance CANNOT pay interest. Ley 19.210,
// artículo 2, literal E) says it in four words — "No genera intereses." So when
// Prex or Mercado Pago say "tu saldo genera rendimientos", the yield is NOT
// interest on the balance: the money is subscribed into an INVESTMENT FUND
// (fondo de inversión) supervised by the BCU. That is a different product with a
// different risk: it is not a bank deposit, it has no capital guarantee, and the
// COPAB deposit insurance does not reach it.
//
// PURE module (no Vue/Nuxt) so the page and its unit test share one source of
// truth. Every number below carries the source it came from and the date it was
// checked. Where an issuer publishes NO number we say so instead of estimating —
// in particular, neither Uruguayan product publishes a TNA, and the "20,81 % TNA"
// figure that circulates belongs to Prex ARGENTINA, a different product in a
// different currency and a different rate regime.
//
// Informational, not financial advice.

/** Date (YYYY-MM-DD) every figure below was last verified against its source. */
export const YIELD_LAST_REVIEWED = '2026-08-17'

/** BCU monetary policy rate, in % per year — the anchor these funds track. */
export const TPM_PCT = 5.75
/**
 * Date of a COPOM communiqué we actually read confirming that level — NOT the
 * date the rate was first set there. The 21/4/2026 statement says the TPM
 * "continúe en 5,75%", so it was already there beforehand and we have no sourced
 * start date. Saying "desde" would be inventing one.
 */
export const TPM_CONFIRMED = '2026-04-21'

/** INE headline inflation, last 12 months, in %. The bar a yield must clear. */
export const IPC_INTERANUAL_PCT = 4.27
/** Reference month of `IPC_INTERANUAL_PCT`. */
export const IPC_PERIOD = 'julio 2026'

/** Uruguayan VAT rate, applied on fund administration commissions. */
export const IVA_RATE = 0.22

export interface SourceLink {
  label: string
  url: string
  publisher: string
}

// ─────────────────────────────────────────────────────────────────────────────
// The legal frame — why "interés" is the wrong word
// ─────────────────────────────────────────────────────────────────────────────

export interface LegalFact {
  id: string
  claim: string
  norm: string
  quote: string | null
  meaning: string
  source: SourceLink
}

export const LEGAL_FACTS: readonly LegalFact[] = Object.freeze([
  {
    id: 'no-intereses',
    claim: 'El saldo de una billetera no puede pagar intereses.',
    norm: 'Ley 19.210, artículo 2, literal E)',
    quote: 'No genera intereses.',
    meaning:
      'Es una característica que la ley le impone al dinero electrónico. Por eso ningún emisor (Prex, Mercado Pago, MiDinero, OCA Blue) puede remunerar el saldo como lo haría un banco con un depósito: lo que rinde no es el saldo, es un fondo de inversión aparte al que ese dinero se suscribe.',
    source: {
      label: 'Ley 19.210 — Ley de Inclusión Financiera (texto actualizado)',
      url: 'https://www.impo.com.uy/bases/leyes/19210-2014',
      publisher: 'IMPO',
    },
  },
  {
    id: 'patrimonio-separado',
    claim: 'El saldo de la billetera sí está separado del patrimonio del emisor.',
    norm: 'Ley 19.210, artículo 5',
    quote:
      'Dichas cuentas constituirán patrimonios de afectación independientes del patrimonio de la institución emisora',
    meaning:
      'Los fondos que respaldan el dinero electrónico se radican en cuentas en bancos afectadas únicamente a eso. Protege tu saldo si quiebra el emisor, pero no lo convierte en un depósito bancario ni le agrega rendimiento.',
    source: {
      label: 'Ley 19.210 — Ley de Inclusión Financiera (texto actualizado)',
      url: 'https://www.impo.com.uy/bases/leyes/19210-2014',
      publisher: 'IMPO',
    },
  },
  {
    id: 'sin-copab',
    claim: 'El seguro de depósitos no cubre ni el saldo de la billetera ni el fondo.',
    norm: 'Fondo de Garantía de Depósitos Bancarios (COPAB)',
    quote: null,
    meaning:
      'El seguro cubre depósitos en bancos, hasta UI 250.000 en moneda nacional y US$ 10.000 en moneda extranjera por persona e institución. No alcanza a los instrumentos de inversión contratados con bancos, ni a los saldos en billeteras o tarjetas prepagas: los emisores de dinero electrónico no integran el esquema.',
    source: {
      label: 'Nuevas condiciones de la garantía de depósitos (COPAB)',
      url: 'https://www.santander.com.uy/sites/default/files/2023-10/NUEVAS%20CONDICIONES%20DE%20LA%20GARANTIA%20DE%20DEPOSITOS%20COPAB_2.pdf',
      publisher: 'COPAB / Santander Uruguay',
    },
  },
])

// ─────────────────────────────────────────────────────────────────────────────
// The products
// ─────────────────────────────────────────────────────────────────────────────

/** Currency the yield product actually works in. */
export type YieldCurrency = 'UYU' | 'USD' | 'ambas'

export interface YieldProduct {
  id: string
  /** Commercial name of the yield feature, as the app shows it. */
  name: string
  /** Who you open it with. */
  provider: string
  /** ISO date the product launched in Uruguay. */
  launched: string
  /** Legal name of the fund the money is subscribed into. */
  fundName: string
  /** The BCU-authorised fund administrator (AFISA). */
  fundAdmin: string
  /** The broker/distributor in the middle, when there is one. */
  fundBroker: string | null
  /** What the fund is allowed to buy. */
  investsIn: string
  currency: YieldCurrency
  /** Minimum for the FIRST subscription, in pesos. null = none published. */
  minFirstUyu: number | null
  /** Minimum for later subscriptions, in pesos. null = none. */
  minAfterUyu: number | null
  /** What the USER is charged directly. */
  userFees: string
  /**
   * Ceiling on the fund's administration commission per the fund's own rules, in
   * % per year BEFORE IVA. null = not published / not found. This is a MAXIMUM,
   * not what is actually charged, and it is deducted inside the fund — the yield
   * you see in the app is already net of it.
   */
  fundFeeMaxPct: number | null
  fundFeeNote: string
  /**
   * Rate the provider publishes, in % per year. `null` for every Uruguayan
   * product here, on purpose: none of them publishes one.
   */
  publishedRatePct: number | null
  rateNote: string
  liquidity: string
  taxNote: string
  howItWorks: string
  pros: readonly string[]
  cons: readonly string[]
  sources: readonly SourceLink[]
}

export const YIELD_PRODUCTS: readonly YieldProduct[] = Object.freeze([
  {
    id: 'prex-inversion-violeta',
    name: 'Inversión Violeta',
    provider: 'Prex Uruguay',
    launched: '2026-03-30',
    fundName: 'Fondo de Liquidez Inmediata (FLI)',
    fundAdmin: 'VALO (AFISA)',
    fundBroker: 'Gletir Corredor de Bolsa',
    investsIn:
      'Depósitos a la vista en el BCU, Letras de Regulación Monetaria y otros valores públicos uruguayos. Es un fondo abierto autorizado y supervisado por el BCU.',
    currency: 'UYU',
    minFirstUyu: 4000,
    minAfterUyu: null,
    userFees:
      'Sin comisión por abrir la cuenta de inversión, por suscribir al fondo ni por retirar.',
    fundFeeMaxPct: null,
    fundFeeNote:
      'Prex y VALO comunican que el producto no tiene costo de apertura ni de mantenimiento para el usuario. El tope de comisión de administración del fondo no está publicado en la ficha web: figura en el reglamento de gestión. Como se descuenta dentro del fondo, el rendimiento que ves en la app ya viene neto de ese costo.',
    publishedRatePct: null,
    rateNote:
      'No hay una tasa fija ni garantizada. La app muestra una tasa indicativa de referencia calculada sobre el desempeño del fondo en los últimos 30 días, y cambia todos los días.',
    liquidity:
      'Suscripciones y rescates diarios en días hábiles. Los rendimientos se calculan y acreditan en días hábiles y pueden demorar hasta 48 horas hábiles.',
    taxNote:
      'Los rendimientos de fondos de inversión que provienen de valores públicos están exonerados de IRPF; el fondo no actúa como agente de retención por ese concepto.',
    howItWorks:
      'Desde la app de Prex abrís una cuenta de inversión en Gletir y autorizás que tu saldo se invierta automáticamente en el fondo. La billetera sigue funcionando igual: podés pagar, transferir o retirar en cualquier momento.',
    pros: [
      'Rendimiento diario sin plazo fijo y sin inmovilizar la plata',
      'Sin comisiones al usuario por abrir, suscribir ni rescatar',
      'El fondo solo compra papel del BCU y del Estado uruguayo',
    ],
    cons: [
      'Pide $4.000 la primera vez para activarlo',
      'Solo en pesos: tus dólares en Prex no rinden',
      'No es un depósito bancario ni tiene garantía de capital',
    ],
    sources: [
      {
        label: 'Prex integra inversión a su billetera: rendimientos con disponibilidad inmediata',
        url: 'https://www.elobservador.com.uy/economia-y-empresas/prex-integra-inversion-su-billetera-el-dinero-genera-rendimientos-pero-se-puede-usar-cualquier-momento-n6038995',
        publisher: 'El Observador',
      },
      {
        label: 'Prex lanza Inversión Violeta (mínimo $4.000, FLI, VALO AFISA, Gletir)',
        url: 'https://www.forbesuruguay.com/money/prex-lanza-inversion-violeta-herramienta-permite-invertir-dinero-cuenta-tenerlo-disponible-vez-n88459',
        publisher: 'Forbes Uruguay',
      },
      {
        label: 'VALO — solución de inversión en pesos con liquidez inmediata junto a Prex',
        url: 'https://valo.uy/noticias/juno-a-prex-lanzamos-una-solucion-de-inversion-en-pesos-con-liquidez-inmediata/',
        publisher: 'VALO',
      },
    ],
  },
  {
    id: 'mercadopago-rendimientos',
    name: 'Rendimientos de la cuenta',
    provider: 'Mercado Pago Uruguay',
    launched: '2026-06-02',
    fundName: 'BIND Ahorro Pesos, Fondo de Inversión',
    fundAdmin: 'BIND UY Administradora de Fondos de Inversión S.A. (BIND AFISA)',
    fundBroker: null,
    investsIn:
      'Instrumentos de regulación monetaria y valores de renta fija del Tesoro (hasta el 100 % del fondo) y efectivo en cuentas en el BCU (hasta el 60 %). Duración promedio de la cartera menor o igual a 90 días.',
    currency: 'UYU',
    minFirstUyu: null,
    minAfterUyu: null,
    userFees: 'Sin monto mínimo y sin costo directo para el usuario por activarlo.',
    fundFeeMaxPct: 3,
    fundFeeNote:
      'Según la prensa especializada que reportó la autorización del fondo, el reglamento habilita una comisión de cobro diario de hasta 3 % anual más IVA (3,66 % con IVA). Es un TOPE, no necesariamente lo que se cobra, y se descuenta dentro del fondo: el rendimiento que ves ya está neto. Importa igual, porque sobre un rendimiento bruto cercano a la TPM el costo se lleva una parte grande.',
    publishedRatePct: null,
    rateNote:
      'Mercado Pago no publica una tasa. Comunicó que la referencia es la Tasa de Política Monetaria del BCU, en 5,75 % anual al momento del lanzamiento. Es una referencia del papel que compra el fondo, no una tasa prometida.',
    liquidity:
      'Los rendimientos se acreditan todos los días hábiles según la valuación diaria del fondo. El capital sigue disponible para pagar, transferir o comprar en cualquier momento.',
    taxNote:
      'Los rendimientos de fondos de inversión que provienen de valores públicos están exonerados de IRPF; el fondo no actúa como agente de retención por ese concepto.',
    howItWorks:
      'Aceptás los términos y condiciones una sola vez desde la app. A partir de ahí el saldo disponible genera rendimientos todos los días hábiles, sin separar fondos ni armar un plazo.',
    pros: [
      'Sin monto mínimo: rinde desde el primer peso',
      'Se activa una vez y queda andando sobre el saldo que ya tenías',
      'El fondo compra papel del BCU y del Tesoro, con duración ≤ 90 días',
    ],
    cons: [
      'El reglamento del fondo habilita hasta 3 % anual + IVA de comisión',
      'Solo en pesos: no hay saldo en dólares en Mercado Pago Uruguay',
      'No es un depósito bancario ni tiene garantía de capital',
    ],
    sources: [
      {
        label:
          'Mercado Pago entra al negocio de las inversiones en Uruguay (referencia TPM 5,75 %)',
        url: 'https://www.elobservador.com.uy/cafe-y-negocios/mercado-pago-acelera-su-presencia-financiera-uruguay-entra-al-negocio-las-inversiones-y-lanza-tarjeta-prepaga-internacional-n6045297',
        publisher: 'El Observador',
      },
      {
        label: 'Mercado Pago amplía su apuesta en Uruguay con rendimientos diarios (BIND AFISA)',
        url: 'https://www.montevideo.com.uy/Negocios-y-Tendencias/Mercado-Pago-amplia-su-apuesta-en-Uruguay-con-rendimientos-diarios-uc963377',
        publisher: 'Montevideo Portal',
      },
      {
        label:
          'BCU autorizó el 27/4/2026 el fondo Bind Ahorro Pesos: política de inversión y comisión de hasta 3 % anual + IVA',
        url: 'https://rankiapro.com/latam/noticias/el-argentino-grupo-bind-amplia-su-presencia-en-uruguay-con-una-gestora-y-lanza-su-primer-fondo-de-inversion-en-el-pais/',
        publisher: 'RankiaPro (prensa especializada)',
      },
      {
        label: 'BIND Inversiones — AFISA (ficha del fondo y reglamento)',
        url: 'https://bindinversiones.com.uy/afisa/',
        publisher: 'BIND UY AFISA',
      },
    ],
  },
])

// ─────────────────────────────────────────────────────────────────────────────
// Benchmarks — what the same peso earns parked somewhere else
// ─────────────────────────────────────────────────────────────────────────────

export interface Benchmark {
  id: string
  name: string
  provider: string
  /** Published nominal rate in % per year. null = pays nothing / not published. */
  ratePct: number | null
  /** Can you spend it the same day? */
  liquid: boolean
  minUyu: number | null
  note: string
  source: SourceLink
}

export const BENCHMARKS: readonly Benchmark[] = Object.freeze([
  {
    id: 'caja-ahorro',
    name: 'Caja de ahorro en pesos',
    provider: 'Bancos en general',
    ratePct: 0,
    liquid: true,
    minUyu: null,
    note: 'La caja de ahorro común en pesos no paga interés. Es el punto de partida contra el que se mide todo lo demás: plata quieta perdiendo contra la inflación.',
    source: {
      label: 'BROU — Caja de Ahorros Común (condiciones)',
      url: 'https://www.brou.com.uy/documents/20182/52262/condiciones-caja-ahorros-comun.pdf/bc8d7d84-26dc-4886-849f-f246a9de1ccb',
      publisher: 'BROU',
    },
  },
  {
    id: 'plazo-fijo-ebrou',
    name: 'Plazo fijo en pesos, 181–366 días (e-BROU)',
    provider: 'BROU',
    ratePct: 5.4,
    liquid: false,
    minUyu: null,
    note: 'Paga más que la caja de ahorro, pero inmoviliza la plata hasta el vencimiento. Por web (e-BROU) la tasa es mayor que por sucursal. Vigente desde el 1/7/2026.',
    source: {
      label: 'BROU — pizarra de tasas de plazo fijo (personas)',
      url: 'https://www.brou.com.uy/documents/20182/112235/tasas-pf-personas.pdf',
      publisher: 'BROU',
    },
  },
  {
    id: 'ahorro-en-sueldo',
    name: 'Ahorro en sueldo, primer año',
    provider: 'BROU',
    ratePct: 5.5,
    liquid: false,
    minUyu: null,
    note: 'Ahorro programado con descuento del sueldo. Sube en el segundo y tercer año, pero exige constancia y no es plata disponible.',
    source: {
      label: 'BROU — Ahorro en sueldo',
      url: 'https://www.brou.com.uy/personas/inversiones/ahorro-en-sueldo',
      publisher: 'BROU',
    },
  },
  {
    id: 'fondo-directo',
    name: 'Fondo de liquidez en pesos contratado directo',
    provider: 'Balanz, Itaú, Nobilis y otros',
    ratePct: null,
    liquid: true,
    minUyu: 5000,
    note: 'Es exactamente el mismo tipo de vehículo que hay detrás de Prex y Mercado Pago, pero contratado por tu cuenta. Pide mínimo y no vive dentro de la billetera; a cambio, la comisión suele estar publicada. BLZ Liquidez Pesos de Balanz: mínimo $5.000, comisión 1,4% IVA incluido, rescate diario T+0 si pedís antes de las 11:30.',
    source: {
      label: 'BLZ Liquidez Pesos — mínimo $5.000, comisión 1,4% (IVA incluido), rescate T+0',
      url: 'https://www.balanz.com.uy/fondo-liquidez-pesos',
      publisher: 'Balanz Uruguay',
    },
  },
])

/** Rates that circulate for these products but belong to another country. */
export interface RateMyth {
  figure: string
  belongsTo: string
  why: string
  source: SourceLink
}

export const RATE_MYTHS: readonly RateMyth[] = Object.freeze([
  {
    figure: '20,81 % TNA',
    belongsTo: 'la cuenta remunerada de Prex ARGENTINA, en pesos argentinos',
    why: 'Circula en notas que mezclan los dos países. Es imposible en Uruguay: la Tasa de Política Monetaria del BCU está en 5,75 % anual y estos fondos compran papel del BCU y del Estado uruguayo, así que su rendimiento se mueve cerca de esa tasa, no cuatro veces por encima.',
    source: {
      label: 'BCU — el COPOM mantiene la Tasa de Política Monetaria en 5,75 %',
      url: 'https://www.bcu.gub.uy/Comunicaciones/Paginas/Detalle-Noticia.aspx?noticia=504&title=El-BCU-mantiene-la-Tasa-de-Pol%C3%ADtica-Monetaria-en-5,75%25',
      publisher: 'Banco Central del Uruguay',
    },
  },
])

export const YIELD_SOURCES: readonly SourceLink[] = Object.freeze([
  {
    label: 'Ley 19.210 — dinero electrónico: "No genera intereses" (art. 2 lit. E)',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014',
    publisher: 'IMPO',
  },
  {
    label: 'BCU — Tasa de Política Monetaria en 5,75 % anual',
    url: 'https://www.bcu.gub.uy/Comunicaciones/Paginas/Detalle-Noticia.aspx?noticia=504&title=El-BCU-mantiene-la-Tasa-de-Pol%C3%ADtica-Monetaria-en-5,75%25',
    publisher: 'Banco Central del Uruguay',
  },
  {
    label: 'INE — Índice de Precios del Consumo (inflación interanual)',
    url: 'https://www.gub.uy/instituto-nacional-estadistica/indice-precios-consumo',
    publisher: 'INE',
  },
  {
    label: 'BCU — registro de Administradoras de Fondos de Inversión',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/admin_Fondos_Inv.aspx',
    publisher: 'Banco Central del Uruguay',
  },
  {
    label: 'RSM Uruguay — qué impuestos pago por invertir (deuda pública exonerada de IRPF)',
    url: 'https://www.rsm.global/uruguay/es/news/que-impuestos-pago-por-invertir',
    publisher: 'RSM Uruguay',
  },
  {
    label: 'COPAB — alcance y límites de la garantía de depósitos',
    url: 'https://www.copab.org.uy/innovaportal/v/1197/1/web/acceso-a-preguntas-frecuentes.html',
    publisher: 'COPAB',
  },
])

// ─────────────────────────────────────────────────────────────────────────────
// Math — what a parked balance actually earns
// ─────────────────────────────────────────────────────────────────────────────

export interface YieldInput {
  /** Money sitting in the account, in pesos. */
  amountUyu: number
  /** GROSS annual rate of the underlying paper, in % per year. */
  annualRatePct: number
  /** How long the money stays put, in days. */
  days: number
  /** Fund administration commission, in % per year INCLUDING IVA. */
  feeAnnualPct?: number
  /** Annual inflation to measure the result against, in %. */
  inflationPct?: number
}

export interface YieldResult {
  /** Annual rate left after the fund's commission, in %. Can go negative. */
  netRatePct: number
  /** Pesos earned before the commission. */
  grossUyu: number
  /** Pesos the commission takes. */
  feeUyu: number
  /** Pesos actually credited: gross − fee. */
  netUyu: number
  /** What the same money needed to earn just to keep its purchasing power. */
  breakEvenUyu: number
  /** Purchasing power gained (or lost) over the period, in pesos of today. */
  realUyu: number
  /** Net rate discounted by inflation, in % per year (exact Fisher, not a subtraction). */
  realRatePct: number
}

/**
 * Compounded return of an idle balance, net of the fund's expense ratio and then
 * measured against inflation.
 *
 * The commission is subtracted from the ANNUAL RATE (that is how an expense
 * ratio charged on assets works: it eats a slice of the yield, not of the
 * capital), and the real rate uses the exact Fisher relation
 * `(1 + net) / (1 + inflation) − 1` rather than `net − inflation`, which
 * overstates the result. Negative and absurd inputs are clamped so the page can
 * never show a number built from a typo.
 */
export function estimateYield(input: YieldInput): YieldResult {
  const amount = Math.max(0, input.amountUyu || 0)
  const days = Math.max(0, input.days || 0)
  const grossRate = clampRate(input.annualRatePct)
  const fee = Math.max(0, input.feeAnnualPct ?? 0)
  const inflation = clampRate(input.inflationPct ?? IPC_INTERANUAL_PCT)

  // An expense ratio bites the yield, and it can bite past zero.
  const netRatePct = grossRate - fee
  const years = days / 365

  // Rounded first, then differenced: the page prints gross, fee and net as three
  // rows of one table, and a table that does not add up reads as a bug even when
  // the cent came from floating point.
  const grossUyu = round2(amount * (Math.pow(1 + grossRate / 100, years) - 1))
  const netUyu = round2(amount * (signedPow(1 + netRatePct / 100, years) - 1))
  const breakEvenUyu = round2(amount * (Math.pow(1 + inflation / 100, years) - 1))

  return {
    netRatePct: round2(netRatePct),
    grossUyu,
    feeUyu: round2(grossUyu - netUyu),
    netUyu,
    breakEvenUyu,
    realUyu: round2(netUyu - breakEvenUyu),
    realRatePct: round2(realRate(netRatePct, inflation)),
  }
}

/**
 * Exact real rate: how much purchasing power a nominal rate actually buys once
 * inflation is taken out. `nominal − inflation` is the shortcut everyone uses
 * and it always flatters the result.
 */
export function realRate(nominalPct: number, inflationPct: number): number {
  const n = clampRate(nominalPct) / 100
  const i = clampRate(inflationPct) / 100
  if (1 + i === 0) return 0
  return ((1 + n) / (1 + i) - 1) * 100
}

/** Commission with IVA on top, in % per year. */
export function feeWithIva(feePct: number): number {
  return round2(Math.max(0, feePct || 0) * (1 + IVA_RATE))
}

/** The products that actually pay something today, newest first. */
export function liveProducts(): YieldProduct[] {
  return [...YIELD_PRODUCTS].sort((a, b) => b.launched.localeCompare(a.launched))
}

export function getYieldProduct(id: string): YieldProduct | undefined {
  return YIELD_PRODUCTS.find(p => p.id === id)
}

/** Rates outside [-99, 1000] are a typo, not a scenario. */
function clampRate(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1000, Math.max(-99, n))
}

/** `Math.pow` with a base that may dip below zero after a heavy commission. */
function signedPow(base: number, exp: number): number {
  return base <= 0 ? 0 : Math.pow(base, exp)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
