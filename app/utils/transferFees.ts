// app/utils/transferFees.ts
// Data + pure helpers for /comisiones-de-transferencia-uruguay — lo que cuesta
// MOVER la plata entre instituciones uruguayas, que es la mitad que falta cada
// vez que alguien compara pizarras.
//
// El sitio ya publica a cuánto compra dólares cada banco. Lo que nunca publicó
// es que aprovechar la diferencia exige DOS transferencias, y que esas dos
// transferencias tienen un precio que cambia por institución, por moneda y por
// monto — hasta el punto de que en algunos tramos se come la ganancia entera.
//
// El caso que originó el módulo es un pro-tip de r/uruguay (2026-09-10): mandar
// los dólares de Itaú a Prex, cambiarlos ahí y volver los pesos. El autor decía
// "no hay costo de transferencia entre Prex <-> Itaú" y tenía razón, pero por un
// motivo más angosto de lo que parece: las DOS patas están exoneradas NOMINALMENTE
// en los dos tarifarios, una por cada lado.
//
//   Itaú, §8.5: "Giros a IEDEs por canales digitales OCA Blue y PREX: Sin costo
//   de forma ilimitada en cantidad y monto, para persona física y jurídica.
//   Otras IEDE: 0,85% por transacción".
//
//   Prex, cartilla: "Transferencias a bancos de plaza: $45 IVA inc o USD 1,90
//   IVA inc […] Las transferencias a Banco Itaú son GRATIS."
//
// O sea: la ruta es gratis en ese par y SÓLO en ese par. Desde cualquier otro
// banco la ida cuesta lo que cobre ese banco y la vuelta cuesta $45 / USD 1,90.
// Por eso la página no publica "hacé esto": publica la cuenta, con la tarifa de
// cada institución y su documento fuente fechado.
//
// MÓDULO PURO (sin Vue/Nuxt) para que la página y su test unitario compartan una
// sola fuente de verdad. Cada cifra lleva la URL oficial y la fecha de vigencia
// del propio documento. Informativo, no es asesoramiento financiero.

/** Fecha (YYYY-MM-DD) en que se contrastó cada cifra contra su fuente. */
export const TRANSFER_FEES_LAST_REVIEWED = '2026-09-10'

/**
 * Valor de la Unidad Indexada. Importa porque BROU y Scotiabank publican sus
 * comisiones EN UI, no en pesos: sin este número sus filas no son comparables
 * con las de Itaú o BBVA.
 */
export const TRANSFER_UI_VALUE = 6.635
export const TRANSFER_UI_VALUE_DATE = '2026-08-18'

/** Moneda en la que viaja la transferencia. */
export type TransferCurrency = 'UYU' | 'USD'

/** Importe expresado en las dos monedas de la plaza. `null` = sin tope. */
export interface CurrencyPair {
  UYU: number | null
  USD: number | null
}

/** Cómo se cobra una banda de la tarifa. */
export type FeeRule =
  | { kind: 'free' }
  /** Importe fijo, distinto según la moneda de la transferencia. */
  | { kind: 'flat'; UYU: number; USD: number }
  /** Porcentaje del importe, con piso y techo por moneda. */
  | { kind: 'percent'; pct: number; min: CurrencyPair; max: CurrencyPair }

/** Un tramo del tarifario: se aplica a los importes hasta `upTo` inclusive. */
export interface FeeBand {
  upTo: CurrencyPair
  rule: FeeRule
  /** Texto tal como lo publica el tarifario, para poder citarlo sin reescribir. */
  quote: string
}

/**
 * Contra qué se comparan los topes de las bandas.
 *
 * - `currency`: el tarifario publica un tope por moneda ("$ 4.000 o U$S 100").
 * - `uyuEquivalent`: el tarifario está en pesos o en UI y convierte la moneda
 *   extranjera al equivalente del día. Es literal en BBVA ("Todos los valores
 *   están expresados en pesos uruguayos […] se aplicará su equivalente") y es
 *   la única lectura posible en BROU, cuya escala entera está en UI.
 */
export type BandBasis = 'currency' | 'uyuEquivalent'

/** Cuántas operaciones sin costo trae la cuenta antes de que empiece la tarifa. */
export interface FreeAllowance {
  count: number
  label: string
}

export interface TransferLimit {
  label: string
  detail: string
}

/** El tarifario de salida de una institución, más lo que condiciona usarlo. */
export interface TransferSchedule {
  /** Clave de origen del sitio (la misma de `ORIGIN_CATEGORY`). */
  origin: string
  label: string
  kind: 'banco' | 'fintech'
  /** Canal al que corresponden estas tarifas. */
  channel: string
  bands: FeeBand[]
  basis: BandBasis
  /**
   * Destinos exonerados por nombre propio en el tarifario. No es una regla
   * general: es una lista corta y cada institución escribió la suya.
   */
  freeTo?: { origins: string[]; quote: string }
  allowances?: FreeAllowance[]
  limits?: TransferLimit[]
  /** Costo de RECIBIR, cuando la institución lo cobra (casi todas no). */
  inbound?: { note: string }
  source: { url: string; label: string; effective: string }
}

// ─────────────────────────────────────────────────────────────────────────────
// Los tarifarios
// ─────────────────────────────────────────────────────────────────────────────

const UI = (n: number) => Math.round(n * TRANSFER_UI_VALUE)

export const TRANSFER_SCHEDULES: readonly TransferSchedule[] = [
  {
    origin: 'itau',
    label: 'Itaú',
    kind: 'banco',
    channel: 'Itaú Link / app, a otros bancos e IEDEs',
    basis: 'currency',
    bands: [
      {
        upTo: { UYU: 4_000, USD: 100 },
        rule: { kind: 'free' },
        quote:
          'Las transferencias a otros bancos de plaza e instituciones emisoras de dinero electrónico […] por montos menores o iguales a $ 4.000 o U$S 100, no tienen costo.',
      },
      {
        upTo: { UYU: null, USD: null },
        rule: {
          kind: 'percent',
          pct: 0.0085,
          min: { UYU: 10, USD: 0.25 },
          max: { UYU: 45, USD: 1 },
        },
        quote:
          '0,85% del importe de la transacción. Mínimo: $10,00 (pesos) o U$S 0,25 (dólares). Máximo: $ 45,00 (pesos) o U$S 1,00 (dólares).',
      },
    ],
    freeTo: {
      origins: ['prex', 'oca'],
      quote:
        'Giros a IEDEs por canales digitales OCA Blue y PREX: Sin costo de forma ilimitada en cantidad y monto, para persona física y jurídica. Otras IEDE: 0,85% por transacción.',
    },
    allowances: [
      { count: 2, label: 'primeras 2 del mes sin costo (persona física y jurídica)' },
      { count: 8, label: '8 por mes en cuentas de Inclusión Financiera (Ley 19.210)' },
    ],
    limits: [
      {
        label: 'Hasta U$S 100.000 por canal digital',
        detail:
          'Por encima de ese monto, o instruida por otros medios, la persona física paga 1,5 por mil (mínimo U$S 25, máximo U$S 250).',
      },
    ],
    source: {
      url: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
      label: 'Manual de tarifas Itaú, §8.4 y §8.5',
      effective: '2026-09-01',
    },
  },
  {
    origin: 'prex',
    label: 'Prex',
    kind: 'fintech',
    channel: 'App Prex, a bancos de plaza',
    basis: 'currency',
    bands: [
      {
        upTo: { UYU: null, USD: null },
        rule: { kind: 'flat', UYU: 45, USD: 1.9 },
        quote:
          'Transferencias a bancos de plaza: $ 45 IVA inc o USD 1,90 IVA inc. La comisión es en pesos para transferencias en dicha moneda y en USD para transferencias en dólares.',
      },
    ],
    freeTo: {
      origins: ['itau'],
      quote: 'Las transferencias a Banco Itaú son GRATIS.',
    },
    limits: [
      {
        label: 'Carga desde banco: U$S 10.000 por día',
        detail:
          'Cada carga individual no puede superar los USD 10.000 diarios y el acumulado no puede superar los USD 15.000 sin presentar información adicional.',
      },
      {
        label: 'Cargar de a poco se cobra',
        detail:
          'Una carga desde cuenta bancaria menor a U$S 50 o $ 1.500 cuesta USD 1,97 + IVA o $ 56,56 + IVA. Por encima de ese importe la carga es gratis.',
      },
      {
        label: 'Sacarlo en efectivo cuesta más que transferirlo',
        detail:
          'Retiro en cajero U$S 3 + IVA o $ 45 + IVA; en red de cobranza U$S 1,9 + IVA o $ 35 + IVA.',
      },
    ],
    source: {
      url: 'https://www.prexcard.com/html/cartillaUso',
      label: 'Cartilla de uso Prex (Econstar S.A.)',
      effective: '2026-09-10',
    },
  },
  {
    origin: 'oca',
    label: 'OCA Blue',
    kind: 'fintech',
    channel: 'App OCA Blue, a bancos de plaza y otras IEDEs',
    basis: 'currency',
    bands: [
      {
        upTo: { UYU: null, USD: null },
        rule: { kind: 'free' },
        quote: 'Transferencias enviadas a bancos de plaza local y/u otras IEDEs: $ 0 + IVA.',
      },
    ],
    limits: [
      {
        label: 'Tope diario de transferencia: U$S 3.000',
        detail:
          'El tope diario de transferencia es de U$S 3.000, pudiéndose iniciar el trámite en sucursales (sujeto a aprobación).',
      },
      {
        label: 'La instantánea corta en U$S 500',
        detail:
          'Las transferencias instantáneas tienen un tope por transferencia de $ 22.000 y U$S 500.',
      },
    ],
    source: {
      url: 'https://www.oca.com.uy/download/Cartilla_OCABlue.pdf',
      label: 'Cartilla OCA Blue (OCA Dinero Electrónico S.A.)',
      effective: '2025-10-01',
    },
  },
  {
    origin: 'brou',
    label: 'BROU',
    kind: 'banco',
    channel: 'eBROU, transferencias SPI',
    basis: 'uyuEquivalent',
    bands: [
      {
        upTo: { UYU: UI(350), USD: null },
        rule: { kind: 'free' },
        quote: 'Menores a 350 UI: Sin Costo.',
      },
      {
        upTo: { UYU: UI(340_000), USD: null },
        rule: {
          kind: 'percent',
          pct: 0.0085,
          min: { UYU: 0, USD: 0 },
          max: { UYU: UI(10), USD: null },
        },
        quote: 'Entre 350 UI y 340.000 UI: 0,85% del importe de la transacción (Máximo: 10 UI).',
      },
      {
        upTo: { UYU: null, USD: null },
        rule: { kind: 'flat', UYU: UI(70), USD: UI(70) },
        quote: 'Mayores a 340.000 UI: Comisión fija 70 UI.',
      },
    ],
    inbound: {
      note: 'BROU cobra por RECIBIR transferencias mayores a U$S 10.000, € 10.000 o $ 300.000 (0,04 % en dólares, 0,015 % en pesos, tope U$S 50), y los demás bancos trasladan ese costo a quien envía. Quedan exoneradas las que se reciben por sueldos, pasividades y honorarios (Ley 19.210).',
    },
    limits: [
      {
        label: 'Presencial cuesta otro orden de magnitud',
        detail:
          'La misma transferencia por mostrador (SEDEC) sale 200 UI fijas más 0,15 % del valor (máximo variable 400 UI).',
      },
    ],
    source: {
      url: 'https://www.brou.com.uy/in/empresas/transferencias-interbancarias',
      label: 'BROU — Transferencias interbancarias, tarifas vigentes',
      effective: '2026-09-10',
    },
  },
  {
    origin: 'bbva',
    label: 'BBVA',
    kind: 'banco',
    channel: 'BBVA net / app, persona física',
    basis: 'uyuEquivalent',
    bands: [
      {
        upTo: { UYU: 10_000, USD: null },
        rule: { kind: 'free' },
        quote: 'Hasta $ 10.000: Sin costo.',
      },
      {
        upTo: { UYU: 300_000, USD: null },
        rule: {
          kind: 'percent',
          pct: 0.003,
          min: { UYU: 30, USD: null },
          max: { UYU: 320, USD: null },
        },
        quote:
          'Más de $ 10.000 y hasta $ 300.000: 0,3% del importe transferido. Mín. $ 30, máx. $ 320.',
      },
      {
        upTo: { UYU: null, USD: null },
        rule: { kind: 'flat', UYU: 1_000, USD: 1_000 },
        quote: 'Más de $ 300.000: $ 1.000.',
      },
    ],
    allowances: [
      {
        count: 8,
        label:
          '8 por mes hasta UI 2.000 cada una, si la cuenta recibe sueldos, jubilaciones u honorarios',
      },
    ],
    source: {
      url: 'https://www.bbva.com.uy/content/dam/public-web/uruguay/documents/NuevoTarifario2024.pdf',
      label: 'Manual de tarifas y comisiones BBVA, §20.1',
      effective: '2026-09-03',
    },
  },
  {
    origin: 'santander',
    label: 'Santander',
    kind: 'banco',
    channel: 'Supernet, a otros bancos de plaza',
    basis: 'currency',
    bands: [
      {
        upTo: { UYU: 1_000, USD: 25 },
        rule: { kind: 'free' },
        quote: 'Montos de hasta $ 1.000, USD 25 o 25 Euros: sin costo.',
      },
      {
        upTo: { UYU: 430_070, USD: 10_000 },
        rule: { kind: 'flat', UYU: 1.9, USD: 1.9 },
        quote:
          'Montos entre $1.000 y $430.070, entre USD 25 y USD 10.000: USD 1,9. (La comisión se expresa en dólares).',
      },
      {
        upTo: { UYU: null, USD: null },
        rule: { kind: 'flat', UYU: 10, USD: 10 },
        quote: 'Montos mayores a $430.070, USD 10.000 o 10.000 Euros: USD 10.',
      },
    ],
    limits: [
      {
        label: 'La instantánea cuesta lo mismo que la común',
        detail:
          'Las transferencias instantáneas por Supernet tienen la misma tarifa que las comunes: sin costo hasta $ 1.000 o U$S 25, U$S 1,9 por encima.',
      },
    ],
    source: {
      url: 'https://www.santander.com.uy/sites/default/files/manual-de-tarifas/Manual_de_Tarifas_20260622.pdf',
      label: 'Manual de tarifas Santander, §4 Transferencias a otros Bancos de Plaza',
      effective: '2026-06-22',
    },
  },
  {
    origin: 'scotiabank',
    label: 'Scotiabank',
    kind: 'banco',
    channel: 'Scotia en Línea, paquete sueldo',
    basis: 'currency',
    bands: [
      {
        upTo: { UYU: 300_000, USD: 10_000 },
        rule: { kind: 'flat', UYU: 1.9, USD: 1.9 },
        quote:
          'Importes MENORES a U$S 10.000 / $ 300.000: sin cargo las primeras 8; costo excedidas U$S 1,90 cada una.',
      },
      {
        upTo: { UYU: null, USD: null },
        rule: { kind: 'flat', UYU: 15, USD: 15 },
        quote:
          'Importes IGUALES o MAYORES a U$S 10.000 / $ 300.000: sin cargo 0. Todas U$S 15 cada una.',
      },
    ],
    allowances: [{ count: 8, label: '8 por mes sin cargo por debajo de U$S 10.000 / $ 300.000' }],
    limits: [
      {
        label: 'La instantánea no existe arriba de U$S 500',
        detail:
          'Giros instantáneos a bancos de plaza por Scotia en Línea: importes mayores a USD 500 o $ 22.000, "No habilitado". Por debajo, sin costo con paquete de pago de sueldos y UI 15 sin él.',
      },
    ],
    source: {
      url: 'https://cdn.aglty.io/scotiabank-uruguay/cartillas-condiciones-de-productos/bp/2026/07-julio/01/F2461_20260701_BP-PAQUETE_CUENTA_SUELDO-CONVENIO.pdf',
      label: 'Scotiabank — Condiciones de productos, paquete sueldo',
      effective: '2026-07-01',
    },
  },
] as const

/** Índice por clave de origen. */
export const SCHEDULE_BY_ORIGIN: Readonly<Record<string, TransferSchedule>> = Object.fromEntries(
  TRANSFER_SCHEDULES.map(s => [s.origin, s])
)

// ─────────────────────────────────────────────────────────────────────────────
// El cálculo
// ─────────────────────────────────────────────────────────────────────────────

/** Qué se le pide a `transferFee` para poder resolver una banda. */
export interface FeeQuery {
  from: string
  to: string
  currency: TransferCurrency
  amount: number
  /**
   * Pesos por dólar, para poder comparar un importe en dólares contra un
   * tarifario escrito en pesos o en UI (BROU, BBVA) y para expresar en pesos una
   * comisión cobrada en dólares.
   */
  usdRate: number
}

export interface FeeResult {
  /** Comisión en la moneda de la transferencia. */
  amount: number
  currency: TransferCurrency
  /** La misma comisión llevada a pesos, para poder sumarla con las otras patas. */
  uyu: number
  /** Fila del tarifario que se aplicó, citada textual. */
  quote: string
  /** `true` si el tarifario exonera este destino por nombre propio. */
  namedFree: boolean
  schedule: TransferSchedule | null
}

function pick(pair: CurrencyPair, currency: TransferCurrency): number | null {
  return pair[currency]
}

/**
 * Comisión de UNA transferencia.
 *
 * Devuelve también la fila que se aplicó: una comisión sin su renglón del
 * tarifario no se puede auditar, y este módulo se apoya en documentos que las
 * instituciones reeditan varias veces por año.
 */
export function transferFee(q: FeeQuery): FeeResult {
  const schedule = SCHEDULE_BY_ORIGIN[q.from] ?? null
  const base: Omit<FeeResult, 'amount' | 'uyu' | 'quote' | 'namedFree'> = {
    currency: q.currency,
    schedule,
  }

  if (!schedule) {
    return { ...base, amount: 0, uyu: 0, quote: '', namedFree: false }
  }

  if (schedule.freeTo?.origins.includes(q.to)) {
    return { ...base, amount: 0, uyu: 0, quote: schedule.freeTo.quote, namedFree: true }
  }

  // Contra qué número se comparan los topes del tarifario.
  const measured =
    schedule.basis === 'uyuEquivalent' && q.currency === 'USD' ? q.amount * q.usdRate : q.amount
  const measuredCurrency: TransferCurrency = schedule.basis === 'uyuEquivalent' ? 'UYU' : q.currency

  const band =
    schedule.bands.find(b => {
      const cap = pick(b.upTo, measuredCurrency) ?? pick(b.upTo, 'UYU')
      return cap === null || measured <= cap
    }) ?? schedule.bands[schedule.bands.length - 1]

  const toUyu = (n: number, c: TransferCurrency) => (c === 'USD' ? n * q.usdRate : n)

  if (band.rule.kind === 'free') {
    return { ...base, amount: 0, uyu: 0, quote: band.quote, namedFree: false }
  }

  if (band.rule.kind === 'flat') {
    // Santander, Scotiabank y BROU cobran un fijo que NO cambia con la moneda de
    // la transferencia: Santander/Scotiabank lo publican en dólares para las dos,
    // BROU en UI. Por eso el fijo se lee de la moneda de la transferencia sólo
    // cuando el tarifario realmente publica dos números (Prex, Itaú).
    const flatCurrency: TransferCurrency = schedule.basis === 'uyuEquivalent' ? 'UYU' : q.currency
    const flat = band.rule[flatCurrency]
    const nominalCurrency =
      schedule.origin === 'santander' || schedule.origin === 'scotiabank' ? 'USD' : flatCurrency
    return {
      ...base,
      currency: nominalCurrency,
      amount: flat,
      uyu: toUyu(flat, nominalCurrency),
      quote: band.quote,
      namedFree: false,
    }
  }

  const pctCurrency: TransferCurrency = schedule.basis === 'uyuEquivalent' ? 'UYU' : q.currency
  const raw = measured * band.rule.pct
  const min = pick(band.rule.min, pctCurrency) ?? 0
  const max = pick(band.rule.max, pctCurrency)
  const capped = max === null ? Math.max(raw, min) : Math.min(Math.max(raw, min), max)
  return {
    ...base,
    currency: pctCurrency,
    amount: capped,
    uyu: toUyu(capped, pctCurrency),
    quote: band.quote,
    namedFree: false,
  }
}

/** Lo que se le pide al comparador de rutas. */
export interface RouteQuery {
  amountUsd: number
  /** Origen: donde está la plata (y donde vuelve). */
  home: string
  /** Destino: donde se cambia. */
  via: string
  /** Pesos por dólar que paga el origen (su compra). `null` si no publica. */
  homeBuy: number | null
  /** Pesos por dólar que paga el destino. */
  viaBuy: number
  /** `false` si los pesos se gastan desde el destino y no vuelven. */
  returnLeg: boolean
}

export interface RouteResult {
  /** Diferencia bruta de pizarra, en pesos. */
  gainUyu: number
  outbound: FeeResult
  ret: FeeResult | null
  feesUyu: number
  /** Ganancia menos las dos comisiones. Es el número de la página. */
  netUyu: number
  /** Dólares a partir de los cuales la ruta deja de dar pérdida. `null` si nunca. */
  breakevenUsd: number | null
  /** Restricción publicada que la ruta pisa con este monto, si hay alguna. */
  warnings: string[]
}

/**
 * Ganancia neta de mover N dólares al destino, cambiarlos ahí y (opcionalmente)
 * volver los pesos.
 *
 * La ida viaja EN DÓLARES y la vuelta EN PESOS: son dos tarifas distintas del
 * mismo par, y ese detalle es justamente el que hace que la ruta sea gratis
 * entre Itaú y Prex y no lo sea en ningún otro par.
 */
export function evaluateRoute(q: RouteQuery): RouteResult {
  const gainUyu = q.homeBuy === null ? 0 : q.amountUsd * (q.viaBuy - q.homeBuy)

  const outbound = transferFee({
    from: q.home,
    to: q.via,
    currency: 'USD',
    amount: q.amountUsd,
    usdRate: q.viaBuy,
  })

  const pesos = q.amountUsd * q.viaBuy
  const ret = q.returnLeg
    ? transferFee({ from: q.via, to: q.home, currency: 'UYU', amount: pesos, usdRate: q.viaBuy })
    : null

  const feesUyu = outbound.uyu + (ret?.uyu ?? 0)

  return {
    gainUyu,
    outbound,
    ret,
    feesUyu,
    netUyu: gainUyu - feesUyu,
    breakevenUsd: breakeven(q),
    warnings: routeWarnings(q),
  }
}

/**
 * Menor cantidad de dólares con la que la ruta deja de dar pérdida.
 *
 * Se busca por barrido y no por despeje porque la función NO es lineal: las
 * bandas la cortan en escalones y en algunos tramos el costo BAJA al subir el
 * monto (en Itaú y BROU el porcentaje topea). Un despeje daría un número que no
 * existe en ninguna de las bandas.
 */
function breakeven(q: RouteQuery): number | null {
  if (q.homeBuy === null) return null
  const gap = q.viaBuy - q.homeBuy
  if (gap <= 0) return null
  for (let usd = 1; usd <= 20_000; usd += 1) {
    const probe = evaluateFeesOnly({ ...q, amountUsd: usd })
    if (usd * gap - probe > 0) return usd
  }
  return null
}

function evaluateFeesOnly(q: RouteQuery): number {
  const out = transferFee({
    from: q.home,
    to: q.via,
    currency: 'USD',
    amount: q.amountUsd,
    usdRate: q.viaBuy,
  })
  const back = q.returnLeg
    ? transferFee({
        from: q.via,
        to: q.home,
        currency: 'UYU',
        amount: q.amountUsd * q.viaBuy,
        usdRate: q.viaBuy,
      })
    : null
  return out.uyu + (back?.uyu ?? 0)
}

/**
 * Restricciones publicadas que este monto concreto pisa.
 *
 * No son avisos decorativos: el tope diario de carga de Prex y el "No habilitado"
 * de Scotiabank arriba de U$S 500 invalidan la ruta en una sola operación, y
 * ninguna de las dos cosas se ve en la tarifa.
 */
function routeWarnings(q: RouteQuery): string[] {
  const out: string[] = []
  const pesos = q.amountUsd * q.viaBuy

  if (q.via === 'prex' && q.amountUsd > 10_000) {
    out.push(
      'Prex no admite una carga desde banco mayor a U$S 10.000 por día (acumulado U$S 15.000 sin presentar información adicional).'
    )
  }
  if (q.via === 'oca' && q.amountUsd > 3_000) {
    out.push('OCA Blue tiene un tope diario de transferencia de U$S 3.000.')
  }
  if (q.via === 'oca' && q.amountUsd > 500) {
    out.push(
      'Por encima de U$S 500 la transferencia con OCA Blue ya no puede ser instantánea (tope por transferencia: $ 22.000 y U$S 500).'
    )
  }
  if (q.home === 'scotiabank' && q.amountUsd > 500) {
    out.push(
      'Scotiabank no habilita giros instantáneos a bancos de plaza por encima de U$S 500 o $ 22.000: la ida tiene que ir por transferencia común.'
    )
  }
  if (q.home === 'brou' && q.amountUsd > 10_000) {
    out.push(
      'BROU cobra por recibir transferencias mayores a U$S 10.000 y los demás bancos trasladan ese costo a quien envía; la vuelta puede salir hasta U$S 50 más.'
    )
  }
  if (q.returnLeg && q.via === 'prex' && pesos < 1_500) {
    out.push(
      'Volver menos de $ 1.500 a la cuenta bancaria y recargar de nuevo dispara el costo de carga de Prex (U$S 1,97 + IVA para cargas menores a U$S 50 o $ 1.500).'
    )
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Los escalones
// ─────────────────────────────────────────────────────────────────────────────

/** Un salto de precio en el borde de una banda. */
export interface FeeCliff {
  origin: string
  label: string
  currency: TransferCurrency
  /** Importe justo por debajo del corte. */
  below: number
  /** Comisión justo por debajo y justo por encima, en la moneda del tarifario. */
  feeBelow: FeeResult
  feeAbove: FeeResult
  source: TransferSchedule['source']
}

/**
 * Los cortes donde un peso más de transferencia cuesta un salto de comisión.
 *
 * Se calculan DESDE el tarifario en vez de escribirse a mano: si mañana BBVA
 * mueve el corte de $ 300.000, el escalón que publica la página se mueve con él.
 * Sólo se listan los saltos hacia arriba de al menos 1,5×, que son los únicos
 * donde partir la transferencia en dos cambia algo.
 */
export function feeCliffs(usdRate: number, minRatio = 1.5): FeeCliff[] {
  const out: FeeCliff[] = []
  for (const schedule of TRANSFER_SCHEDULES) {
    const currency: TransferCurrency = schedule.basis === 'uyuEquivalent' ? 'UYU' : 'UYU'
    for (const band of schedule.bands) {
      const cap = band.upTo[currency]
      if (cap === null) continue
      const below = transferFee({
        from: schedule.origin,
        to: '__otro__',
        currency,
        amount: cap,
        usdRate,
      })
      const above = transferFee({
        from: schedule.origin,
        to: '__otro__',
        currency,
        amount: cap + 1,
        usdRate,
      })
      if (above.uyu > below.uyu * minRatio && above.uyu - below.uyu > 1) {
        out.push({
          origin: schedule.origin,
          label: schedule.label,
          currency,
          below: cap,
          feeBelow: below,
          feeAbove: above,
          source: schedule.source,
        })
      }
    }
  }
  return out.sort((a, b) => b.feeAbove.uyu - b.feeBelow.uyu - (a.feeAbove.uyu - a.feeBelow.uyu))
}

// ─────────────────────────────────────────────────────────────────────────────
// Lo que el tarifario regala y nadie usa
// ─────────────────────────────────────────────────────────────────────────────

export interface TransferTip {
  id: string
  title: string
  body: string
  source: { url: string; label: string }
}

/**
 * Las otras exoneraciones que están escritas en los mismos documentos.
 *
 * Cada una es una fila de tarifario, no una recomendación: la página las publica
 * para que la cuenta se pueda rehacer, y la que rinde depende del banco de cada
 * quien.
 */
export const TRANSFER_TIPS: readonly TransferTip[] = [
  {
    id: 'itau-iede',
    title: 'Itaú no cobra por mandar plata a Prex ni a OCA Blue, sin tope',
    body: 'El tarifario lo dice con nombre propio y sin límite de cantidad ni de monto. A cualquier OTRA emisora de dinero electrónico, la misma operación paga 0,85 % (mínimo $ 10 o U$S 0,25, máximo $ 45 o U$S 1). Es la pata de ida del pro-tip, y es la que no se generaliza.',
    source: { url: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf', label: 'Itaú, §8.5' },
  },
  {
    id: 'prex-itau',
    title: 'Prex tampoco cobra la vuelta, pero sólo hacia Itaú',
    body: 'La cartilla de Prex fija $ 45 o U$S 1,90 por transferencia a bancos de plaza y después exonera un banco por su nombre: Itaú. Hacia BROU, Santander, BBVA o Scotiabank la vuelta se paga entera.',
    source: { url: 'https://www.prexcard.com/html/cartillaUso', label: 'Cartilla Prex' },
  },
  {
    id: 'no-volver',
    title: 'La vuelta se puede saltear: la tarjeta se paga desde la app',
    body: 'Si los pesos van a terminar pagando la tarjeta o una factura, el paso de volverlos al banco es opcional, y saltearlo elimina una de las dos comisiones. Es lo que señaló un comentarista del hilo original, y es cierto en cualquier par, no sólo en Itaú-Prex.',
    source: {
      url: 'https://www.reddit.com/r/uruguay/comments/1wcl8hv/',
      label: 'r/uruguay, hilo original',
    },
  },
  {
    id: 'inclusion-financiera',
    title: 'La cuenta donde cobrás el sueldo trae 8 transferencias sin costo por mes',
    body: 'Es la Ley 19.210: las cuentas de Inclusión Financiera tienen 8 transferencias interbancarias gratis por mes. Itaú lo dice así; BBVA da las 8 pero con tope de UI 2.000 cada una; Scotiabank da 8 por debajo de U$S 10.000. Fuera de esas cuentas, Itaú da 2 por mes.',
    source: {
      url: 'https://www.bcu.gub.uy/Sistema-de-Pagos/Leyes_y_Decretos/Ley%2019210.pdf',
      label: 'Ley 19.210',
    },
  },
  {
    id: 'brou-recepcion',
    title: 'Mandar a BROU más de U$S 10.000 tiene un costo que no cobra tu banco',
    body: 'BROU cobra por RECIBIR transferencias interbancarias mayores a U$S 10.000, € 10.000 o $ 300.000 —0,04 % en dólares, 0,015 % en pesos, con tope U$S 50— y los otros bancos trasladan ese costo a quien envía. No aparece en el tarifario del banco emisor. Quedan exoneradas las que se reciben por sueldos, pasividades y honorarios.',
    source: {
      url: 'https://www.scotiabank.com.uy/Acerca-de/novedades/BROU-modifica-los-costos-de-la-recepci%C3%B3n-de-transferencias-electr%C3%B3nicas-interbancarias-locales',
      label: 'Aviso de Scotiabank sobre el cambio del BROU',
    },
  },
  {
    id: 'prex-carga-chica',
    title: 'Cargar Prex de a poco cuesta; cargar de una vez es gratis',
    body: 'Una carga desde cuenta bancaria menor a U$S 50 o $ 1.500 paga U$S 1,97 + IVA o $ 56,56 + IVA. Por encima de ese importe la carga no cuesta nada. Partir un envío en pedazos chicos es la forma más fácil de pagar una comisión que no existía.',
    source: { url: 'https://www.prexcard.com/html/cartillaUso', label: 'Cartilla Prex' },
  },
  {
    id: 'prex-efectivo',
    title: 'Sacar de Prex en efectivo cuesta varias veces más que transferirlo',
    body: 'Retiro por cajero: U$S 3 + IVA o $ 45 + IVA. Por red de cobranza: U$S 1,9 + IVA o $ 35 + IVA. Transferir esos mismos pesos a un banco de plaza sale $ 45, y a Itaú sale cero.',
    source: { url: 'https://www.prexcard.com/html/cartillaUso', label: 'Cartilla Prex' },
  },
  {
    id: 'brou-mostrador',
    title: 'La misma transferencia por ventanilla cuesta 20 veces más',
    body: 'En BROU una transferencia por eBROU topea en 10 UI. La misma operación por mostrador (SEDEC) arranca en 200 UI fijas más 0,15 % del importe. El canal es la variable más cara de todo el tarifario.',
    source: {
      url: 'https://www.brou.com.uy/in/empresas/transferencias-interbancarias',
      label: 'BROU, tarifas vigentes',
    },
  },
  {
    id: 'scotia-instantanea',
    title: 'En Scotiabank la transferencia instantánea corta en U$S 500',
    body: 'Por encima de U$S 500 o $ 22.000 el giro instantáneo figura como "No habilitado": hay que usar la transferencia común, que liquida por cámara del SPI en horario hábil. Es una restricción de tiempo, no de precio, y es la que arruina la ruta si se pretende hacer todo en el día.',
    source: {
      url: 'https://cdn.aglty.io/scotiabank-uruguay/cartillas-condiciones-de-productos/bp/2026/07-julio/01/F2461_20260701_BP-PAQUETE_CUENTA_SUELDO-CONVENIO.pdf',
      label: 'Scotiabank, condiciones de productos',
    },
  },
] as const
