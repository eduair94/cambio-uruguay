// app/utils/loanSimulator.ts
// La cuota y el costo total de un préstamo en pesos con cada prestamista, a partir de la TEA que
// cada uno publica. Lo usa /herramientas/calculadora-prestamo ("tu cuota con cada prestamista").
//
// POR QUÉ EXISTE. La calculadora recibía búsquedas como "simulador de préstamos" o "calculadora de
// préstamos" en posiciones de 40 a 66, y lo único que hacía era la cuota del sistema francés con
// la tasa que tipeara el visitante. Quien busca un simulador quiere saber cuánto le cobraría CADA
// uno por SU monto y SU plazo. El sitio ya tiene esas tasas: este módulo no lee ninguna fuente,
// sólo hace la cuenta.
//
// DE DÓNDE SALE LA TASA: del tablero de /mejores-prestamos-uruguay (`LENDER_TIERLIST` con el
// parche semanal de `/api/loan-tiers` encima, vía `mergeLenderFacts`), y no del `teaPct` único de
// `/api/prestamos`. La razón es la regla de abajo: aquel guarda UN número por prestamista, con
// sentido mezclado —el piso de la banda en unos, el techo en otros—, y con un número así la cuota
// de un prestamista que publica "de 29 % a 87 %" sale inventada. El tablero guarda las dos puntas
// (`teaPct` = desde, `teaMaxPct` = hasta), si el IVA va aparte y la URL donde se leyó.
//
// LA REGLA: UN RANGO SE PUBLICA COMO RANGO. Si el prestamista publica una banda, la fila muestra
// la cuota con la punta baja y con la alta, y se ordena por la ALTA: ordenar por el "desde"
// premiaría a quien escribe la banda más ancha, que es justo lo que `loanTierlist.ts` documenta
// como el truco del aviso (FUCEREP 14,25 % a 99 %). Las mismas lecturas de la TEA que usa
// /mejores-prestamos-uruguay (`teaLabel` de esa página):
//   - `teaPct` y `teaMaxPct` con el máximo por encima → rango.
//   - `teaPct` sin máximo, o con un máximo que no lo supera → tasa única.
//   - sin `teaPct` pero con `teaMaxPct` → sólo el tope: la cuota se dice "hasta".
//   - ninguna de las dos → no publica; va a la lista de los que no se pueden simular.
//
// LA CUENTA. La TEA es efectiva anual, así que la tasa mensual es (1 + TEA)^(1/12) − 1, no TEA/12
// (la misma conversión que `retireeLoans.ts`). Cuando el prestamista cobra el IVA aparte
// (`ivaOnInterest`, casi todos), el IVA básico se aplica sobre el interés de cada cuota: la tasa
// mensual se multiplica por 1,22. Sistema francés, cuota fija. NO entran seguros, comisiones de
// concesión ni gastos, que varios cobran y que la página dice: el número que obliga es el costo
// financiero total del contrato.
//
// MÓDULO PURO (sin Vue/Nuxt): la página y su test comparten la cuenta.

import type { LenderEntity, LenderSegment } from './loanTierlist'
import { IVA_BASIC_RATE } from './retireeLoans'

export type TeaBandKind = 'unica' | 'rango' | 'tope'

export interface TeaBand {
  kind: TeaBandKind
  /** Punta baja publicada. `null` cuando sólo se publica el tope. */
  low: number | null
  /** Punta alta: la tasa única, el techo del rango o el tope. */
  high: number
}

/** La banda que publica el prestamista, o `null` si no publica tasa. Ver la regla del encabezado. */
export function teaBandOf(l: Pick<LenderEntity, 'teaPct' | 'teaMaxPct'>): TeaBand | null {
  const min = l.teaPct != null && Number.isFinite(l.teaPct) ? l.teaPct : null
  const max = l.teaMaxPct != null && Number.isFinite(l.teaMaxPct) ? l.teaMaxPct : null
  if (min != null) {
    if (max != null && max > min) return { kind: 'rango', low: min, high: max }
    return { kind: 'unica', low: min, high: min }
  }
  if (max != null) return { kind: 'tope', low: null, high: max }
  return null
}

/** "28 %", "25–36,5 %", "hasta 31 %"; con " + IVA" cuando el IVA va aparte. */
export function teaBandLabel(band: TeaBand, ivaOnInterest: boolean): string {
  const n = (v: number) => v.toLocaleString('es-UY', { maximumFractionDigits: 2 })
  const base =
    band.kind === 'rango'
      ? `${n(band.low!)}–${n(band.high)} %`
      : band.kind === 'tope'
        ? `hasta ${n(band.high)} %`
        : `${n(band.high)} %`
  return ivaOnInterest ? `${base} + IVA` : base
}

/** Tasa mensual efectiva de una TEA, con el IVA sobre el interés si corresponde. */
export function monthlyRateFromTea(teaPct: number, withIva: boolean): number {
  const monthly = Math.pow(1 + teaPct / 100, 1 / 12) - 1
  return withIva ? monthly * (1 + IVA_BASIC_RATE) : monthly
}

export type AnnualRateKind = 'tea' | 'nominal'

/**
 * La tasa mensual de la calculadora libre: la TEA se convierte como arriba; una tasa nominal anual
 * se divide entre 12, que es lo que "nominal" significa. El IVA, si se pide, va sobre el interés.
 */
export function monthlyRate(annualPct: number, kind: AnnualRateKind, withIva: boolean): number {
  if (kind === 'tea') return monthlyRateFromTea(annualPct, withIva)
  const monthly = annualPct / 100 / 12
  return withIva ? monthly * (1 + IVA_BASIC_RATE) : monthly
}

export interface Installment {
  cuota: number
  total: number
  intereses: number
}

/** Sistema francés con una tasa MENSUAL. Sin redondeo: la página formatea. */
export function frenchInstallment(
  principal: number,
  monthlyRate: number,
  months: number
): Installment {
  const p = Math.max(principal, 0)
  const n = Math.max(Math.floor(months), 0)
  if (n === 0 || p === 0) return { cuota: 0, total: 0, intereses: 0 }
  const cuota = monthlyRate === 0 ? p / n : (p * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n))
  const total = cuota * n
  return { cuota, total, intereses: total - p }
}

export interface LenderQuote {
  id: string
  name: string
  segment: LenderSegment
  sourceUrl: string
  band: TeaBand
  ivaOnInterest: boolean
  /** Con la punta baja de la banda. `null` cuando sólo se publica el tope. */
  low: Installment | null
  /** Con la punta alta: la que ordena la tabla. */
  high: Installment
}

export interface LenderLeftOut {
  id: string
  name: string
  sourceUrl: string
  reason: 'monto' | 'plazo' | 'no-publica' | 'sin-interes' | 'moneda'
  detail: string
}

export interface LoanComparison {
  /** De menor a mayor costo total con la punta alta; empate: la punta baja, después el nombre. */
  quotes: LenderQuote[]
  /** Fuera de sus montos o plazos publicados: se nombran con el límite. */
  outOfLimits: LenderLeftOut[]
  /** No publican una tasa con la que se pueda hacer la cuenta. */
  unpublished: LenderLeftOut[]
}

const pesos = (v: number) => `$ ${Math.round(v).toLocaleString('es-UY')}`

/**
 * La cuota y el total con cada prestamista que presta en pesos, para ese monto y esa cantidad de
 * cuotas. Un prestamista cuyo monto o plazo máximo publicado no alcanza va a `outOfLimits`; uno
 * sin tasa, a `unpublished`. Nadie desaparece sin decir por qué.
 */
export function compareLenders(
  lenders: readonly LenderEntity[],
  principal: number,
  months: number
): LoanComparison {
  const quotes: LenderQuote[] = []
  const outOfLimits: LenderLeftOut[] = []
  const unpublished: LenderLeftOut[] = []
  const amount = Math.max(principal || 0, 0)
  const n = Math.max(Math.floor(months || 0), 0)

  for (const l of lenders) {
    const base = { id: l.id, name: l.name, sourceUrl: l.sourceUrl }
    if (!l.currencies.includes('UYU')) {
      unpublished.push({ ...base, reason: 'moneda', detail: 'no presta en pesos' })
      continue
    }
    const band = teaBandOf(l)
    if (!band) {
      unpublished.push({ ...base, reason: 'no-publica', detail: 'no publica su tasa' })
      continue
    }
    if (band.high <= 0) {
      // Un 0 % no es un préstamo barato, es otra cosa (el adelanto de sueldo de Payflex): ponerlo
      // primero en una tabla ordenada por costo sería mentir con la aritmética.
      unpublished.push({ ...base, reason: 'sin-interes', detail: l.identity })
      continue
    }
    if (l.maxAmountUyu != null && amount > l.maxAmountUyu) {
      outOfLimits.push({
        ...base,
        reason: 'monto',
        detail: `presta hasta ${pesos(l.maxAmountUyu)}`,
      })
      continue
    }
    if (l.maxTermMonths != null && n > l.maxTermMonths) {
      outOfLimits.push({
        ...base,
        reason: 'plazo',
        detail: `presta hasta ${l.maxTermMonths} ${l.maxTermMonths === 1 ? 'cuota' : 'cuotas'}`,
      })
      continue
    }
    const at = (tea: number) =>
      frenchInstallment(amount, monthlyRateFromTea(tea, l.ivaOnInterest), n)
    quotes.push({
      ...base,
      segment: l.segment,
      band,
      ivaOnInterest: l.ivaOnInterest,
      low: band.low == null ? null : at(band.low),
      high: at(band.high),
    })
  }

  quotes.sort(
    (a, b) =>
      a.high.total - b.high.total ||
      (a.low?.total ?? a.high.total) - (b.low?.total ?? b.high.total) ||
      a.name.localeCompare(b.name, 'es')
  )
  return { quotes, outOfLimits, unpublished }
}
