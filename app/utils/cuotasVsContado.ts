// Does it pay to buy in cuotas and invest the cash, or to pay contado?
//
// PURE module (no Vue/Nuxt) so the page, the tests and any future tool share one engine.
//
// The whole decision reduces to one comparison, and the page exists because almost nobody
// makes it correctly:
//
//     VAN(cuotas) = c · [1 − (1+i)^−n] / i        with i = the monthly rate of what you can
//     financiar conviene  ⟺  VAN(cuotas) < P       actually earn, net of fees and IRPF
//
// Equivalently: financing wins iff the plan's own implicit rate is BELOW your net investment
// return. The break-even IS the implicit rate — that is what an IRR means, not a coincidence.
//
// Two consequences that the r/uruguay thread this page answers got wrong:
//
//   1. Inflation is NOT a separate term. "La cuota se licúa por la inflación" and "el fondo
//      crece" are the same effect counted twice: a nominal return already contains inflation.
//      So `rendimientoAnualNeto` is nominal and inflation appears nowhere in the compare.
//
//   2. The declining balance needs no special handling. If you have to draw the cash down to
//      pay each cuota, your average invested balance is about half the principal — and the
//      discounting already says so. Modelling it separately double-counts again.
//
// What DOES decide it, and what the thread never priced, lives in `extras`: the IVA reduction
// you forfeit by paying with a credit card instead of a debit card, and the seguro sobre saldo
// deudor that a 24-month plan keeps alive for two years. On a genuine 0% plan those two are
// the same order of magnitude as the entire arbitrage.

import { round } from './calculators'
import { effectiveRate, monthlyRate } from './debt'

/** How you would pay if you paid contado. Not cosmetic — it changes the price you pay. */
export type ContadoMedio = 'debito' | 'credito' | 'efectivo'

/** Where the cuotas live: a credit card, or the merchant's own bill (Antel PTF). */
export type MedioFinanciacion = 'tarjeta' | 'factura'

export interface CompareInput {
  /** Precio Contado Efectivo (PCE) — the cash price, as advertised. */
  precioContado: number
  /** The monthly installment actually quoted. */
  cuota: number
  cuotas: number
  /**
   * What you can really earn on the cash, ALREADY net of the fund's management fee and of
   * IRPF. Mid-2026 Uruguay: ~4,2–4,5% in a peso money-market fund (IRPF-exempt, holds LRM),
   * ~5,4% in a 24-month BROU e-BROU plazo fijo. Nominal, not real.
   */
  rendimientoAnualNeto: number
  contadoMedio: ContadoMedio
  financiacion: MedioFinanciacion
  /** Points of IVA knocked off for débito / dinero electrónico. Ley 19.210 art. 87: 2. */
  ivaDebitoPuntos: number
  /** Basic IVA rate, so the reduction can be expressed against the gross (IVA-inclusive) price. */
  ivaBasica: number
  /** Seguro sobre saldo deudor, per mil per month on the outstanding balance. Santander/Itaú: 3. */
  seguroSaldoPermil: number
  /** Annual card cost, in UYU. Zero if you already hold the card — the cost is sunk. */
  costoAnualTarjeta: number
  /** Rewards on a credit-card purchase. BROU Recompensa crédito: 1 punto per UYU 100 = 1,00%. */
  puntosCreditoPct: number
  /** Rewards on a debit purchase. BROU Recompensa débito: 1 punto per UYU 300 = 0,33%. */
  puntosDebitoPct: number
}

export interface ExtraItem {
  concepto: string
  /** Signed, in UYU, from the point of view of FINANCING. Negative = financing costs you this. */
  monto: number
  detalle: string
}

export type Ganador = 'cuotas' | 'contado' | 'empate'

export interface CompareResult {
  /** The plan's own rate, recovered from (precioContado, cuota, cuotas). Zero for a true 0%. */
  tasaImplicitaMensual: number
  tasaImplicitaTEA: number
  /** Total handed over, undiscounted — the number the shop shows you. */
  totalCuotas: number
  recargoNominal: number
  /** Present value of the cuota stream, discounted at what you can actually earn. */
  vanCuotas: number
  /** precioContado − vanCuotas. The naive arbitrage, before anything else is counted. */
  ventajaBruta: number
  extras: ExtraItem[]
  /** The verdict, in pesos. */
  ventajaNeta: number
  gana: Ganador
  /** Below this, the difference is noise given the assumptions. 1% of the price. */
  umbralEmpate: number
}

export const DEFAULTS: Omit<CompareInput, 'precioContado' | 'cuota' | 'cuotas'> = {
  rendimientoAnualNeto: 4.5,
  contadoMedio: 'debito',
  financiacion: 'tarjeta',
  ivaDebitoPuntos: 2,
  ivaBasica: 22,
  seguroSaldoPermil: 3,
  costoAnualTarjeta: 0,
  puntosCreditoPct: 1,
  puntosDebitoPct: 0.33,
}

/**
 * The IVA reduction as a fraction of the GROSS (shelf) price, which is how a shopper meets it.
 *
 * Two points off a 22% rate is NOT "2% cheaper": 1,20/1,22 = 0,98361, i.e. 1,64% off the
 * IVA-inclusive price. DGI publishes exactly this as an "alícuota ficta" of 1,64%.
 */
export function ivaReduccionFrac(puntos: number, basica: number): number {
  if (puntos <= 0 || basica <= 0) return 0
  return puntos / (100 + basica)
}

/**
 * The plan's implicit rate. `effectiveRate` returns null when you hand back no more than you
 * got — which is precisely the interesting case (a genuine 0%), so it is mapped to zero here
 * rather than treated as an error.
 */
export function tasaImplicita(
  precioContado: number,
  cuota: number,
  cuotas: number
): { mensual: number; tea: number } {
  const total = cuota * cuotas
  if (precioContado <= 0 || cuota <= 0 || cuotas <= 0) return { mensual: 0, tea: 0 }
  if (total <= precioContado) return { mensual: 0, tea: 0 }
  const r = effectiveRate(precioContado, cuota, cuotas)
  if (!r) return { mensual: 0, tea: 0 }
  return { mensual: r.monthlyPct, tea: r.annualPct }
}

/** Present value of `n` payments of `c`, discounted at an annual net return. */
export function vanCuotas(cuota: number, cuotas: number, rendimientoAnualNeto: number): number {
  const n = Math.floor(cuotas)
  if (cuota <= 0 || n <= 0) return 0
  const i = monthlyRate(rendimientoAnualNeto)
  if (i <= 0) return cuota * n
  return (cuota * (1 - Math.pow(1 + i, -n))) / i
}

/**
 * Present value of the seguro sobre saldo deudor.
 *
 * The premium is charged monthly on the balance still owed, and on a cuotas plan the balance
 * owed is simply the cuotas still to fall due. It is the cost everyone forgets, because a
 * 24-cuota plan keeps a balance alive for two years and the rate looks tiny (3 per mil).
 */
export function pvSeguroSaldo(
  cuota: number,
  cuotas: number,
  permilMensual: number,
  rendimientoAnualNeto: number
): number {
  const n = Math.floor(cuotas)
  if (cuota <= 0 || n <= 0 || permilMensual <= 0) return 0
  const tasa = permilMensual / 1000
  const i = monthlyRate(rendimientoAnualNeto)
  let pv = 0
  for (let k = 0; k < n; k++) {
    const saldo = cuota * (n - k) // cuotas a vencer
    pv += (tasa * saldo) / Math.pow(1 + i, k)
  }
  return pv
}

function puntosPct(input: CompareInput, lado: 'contado' | 'financiado'): number {
  if (lado === 'financiado') {
    // Financing through the merchant's own bill is not a card purchase, so it earns nothing.
    return input.financiacion === 'tarjeta' ? input.puntosCreditoPct : 0
  }
  if (input.contadoMedio === 'credito') return input.puntosCreditoPct
  if (input.contadoMedio === 'debito') return input.puntosDebitoPct
  return 0 // efectivo earns nothing, and gets no IVA reduction either
}

/**
 * The comparison. Every `extra` is signed from FINANCING's point of view, so the verdict is
 * just a sum: `ventajaNeta = ventajaBruta + Σ extras`.
 */
export function compare(input: CompareInput): CompareResult {
  const { precioContado, cuota, cuotas, rendimientoAnualNeto } = input
  const n = Math.floor(cuotas)

  const { mensual, tea } = tasaImplicita(precioContado, cuota, n)
  const totalCuotas = cuota * n
  const van = vanCuotas(cuota, n, rendimientoAnualNeto)
  const ventajaBruta = precioContado - van

  const extras: ExtraItem[] = []

  // The IVA reduction is a property of HOW you pay, and credit never gets it — not in one
  // payment, not in 24. So if contado would be paid by débito, financing forfeits it.
  const ivaFrac = ivaReduccionFrac(input.ivaDebitoPuntos, input.ivaBasica)
  if (input.contadoMedio === 'debito' && ivaFrac > 0) {
    extras.push({
      concepto: 'Rebaja de IVA que perdés al pagar con crédito',
      monto: -(precioContado * ivaFrac),
      detalle: `${input.ivaDebitoPuntos} puntos de IVA (${(ivaFrac * 100).toFixed(2)}% del precio) que solo da el débito`,
    })
  }

  if (input.financiacion === 'tarjeta') {
    const seguro = pvSeguroSaldo(cuota, n, input.seguroSaldoPermil, rendimientoAnualNeto)
    if (seguro > 0) {
      extras.push({
        concepto: 'Seguro sobre saldo deudor',
        monto: -seguro,
        detalle: `${input.seguroSaldoPermil}‰ por mes sobre el saldo, durante ${n} meses`,
      })
    }
    if (input.costoAnualTarjeta > 0) {
      const anios = n / 12
      const i = monthlyRate(rendimientoAnualNeto)
      let pv = 0
      for (let y = 0; y < Math.ceil(anios); y++) {
        const parte = Math.min(1, anios - y)
        pv += (input.costoAnualTarjeta * parte) / Math.pow(1 + i, y * 12)
      }
      extras.push({
        concepto: 'Costo anual de la tarjeta',
        monto: -pv,
        detalle:
          'Solo cuenta si sacás la tarjeta para esta compra; si ya la tenías, es costo hundido',
      })
    }
  }

  // Points are credited on the full purchase value at the first cuota, so they do not depend
  // on the number of cuotas — only on which instrument you use.
  const pctFin = puntosPct(input, 'financiado')
  const pctContado = puntosPct(input, 'contado')
  const deltaPuntos = (precioContado * (pctFin - pctContado)) / 100
  if (Math.abs(deltaPuntos) > 0.5) {
    extras.push({
      concepto: 'Puntos / cashback',
      monto: deltaPuntos,
      detalle: `${pctFin.toFixed(2)}% financiando vs ${pctContado.toFixed(2)}% al contado. En cuotas se acreditan de una sola vez, por el total`,
    })
  }

  const ventajaNeta = ventajaBruta + extras.reduce((s, e) => s + e.monto, 0)
  const umbralEmpate = precioContado * 0.01

  let gana: Ganador = 'empate'
  if (ventajaNeta > umbralEmpate) gana = 'cuotas'
  else if (ventajaNeta < -umbralEmpate) gana = 'contado'

  return {
    tasaImplicitaMensual: mensual,
    tasaImplicitaTEA: tea,
    totalCuotas: round(totalCuotas),
    recargoNominal: round(totalCuotas - precioContado),
    vanCuotas: round(van),
    ventajaBruta: round(ventajaBruta),
    extras: extras.map(e => ({ ...e, monto: round(e.monto) })),
    ventajaNeta: round(ventajaNeta),
    gana,
    umbralEmpate: round(umbralEmpate),
  }
}

// ---------------------------------------------------------------------------
// Monte Carlo
// ---------------------------------------------------------------------------

/** Seeded RNG, so a chart and a test always agree. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function normal(rnd: () => number, mu: number, sigma: number): number {
  // Box–Muller. One draw per call is fine; we are not chasing throughput here.
  const u1 = Math.max(rnd(), 1e-12)
  const u2 = rnd()
  return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

export interface MonteCarloOptions {
  paths: number
  seed: number
  /** Spread of the achievable net return. The market is pricing TPM hikes back to 6,5%. */
  sigmaRendimiento: number
  /** Probability that, at some point in the plan, you miss a payment. */
  probMora: number
  /** Mora rate actually charged on peso cards. Santander: 81% TEA. */
  moraTea: number
  /** How long you stay in mora before catching up. */
  moraMeses: number
  /** Ley 18.212 art. 19 late fee, in UYU. */
  multaMora: number
}

export const MC_DEFAULTS: MonteCarloOptions = {
  paths: 4000,
  seed: 20260712,
  sigmaRendimiento: 0.8,
  probMora: 3,
  moraTea: 81,
  moraMeses: 3,
  multaMora: 404, // 50 UI + IVA, at UI ≈ 6,61
}

export interface MonteCarloResult {
  paths: number
  probGanaCuotas: number
  /** Probability the strategy loses money outright. */
  probPierde: number
  media: number
  p5: number
  p25: number
  mediana: number
  p75: number
  p95: number
  /** Worst case seen. Driven by the mora tail, not by the rate. */
  peor: number
  mejor: number
  histograma: { desde: number; hasta: number; n: number }[]
}

/**
 * Sample the two things you genuinely cannot know in advance — what the fund will pay, and
 * whether you will miss a cuota — and report the distribution of the verdict.
 *
 * The output is the point of the whole page: on a 0% plan the strategy wins most of the time
 * by an amount too small to care about, and loses rarely by an amount that hurts. A mean is a
 * terrible summary of that, which is why the percentiles and the histogram are what get shown.
 */
export function monteCarlo(
  input: CompareInput,
  opts: Partial<MonteCarloOptions> = {}
): MonteCarloResult {
  const o = { ...MC_DEFAULTS, ...opts }
  const rnd = mulberry32(o.seed)
  const n = Math.floor(input.cuotas)
  const mMora = monthlyRate(o.moraTea)
  const results: number[] = []

  for (let p = 0; p < o.paths; p++) {
    // The fund's return over the horizon. Clamped to a band no Uruguayan peso instrument
    // leaves: below zero is not a money-market fund, above 12% is not a peso.
    const r = Math.min(
      12,
      Math.max(0.5, normal(rnd, input.rendimientoAnualNeto, o.sigmaRendimiento))
    )
    const base = compare({ ...input, rendimientoAnualNeto: r })
    let neta = base.ventajaNeta

    if (rnd() * 100 < o.probMora) {
      // You fall behind at a random point; the whole outstanding balance accrues mora until
      // you catch up. The clearing record that follows is NOT priced here — it cannot be.
      const k = Math.floor(rnd() * n)
      const saldo = input.cuota * (n - k)
      const castigo = saldo * (Math.pow(1 + mMora, o.moraMeses) - 1) + o.multaMora
      neta -= castigo / Math.pow(1 + monthlyRate(r), k)
    }
    results.push(neta)
  }

  results.sort((a, b) => a - b)
  const q = (f: number) => results[Math.min(results.length - 1, Math.floor(f * results.length))]!
  const media = results.reduce((s, v) => s + v, 0) / results.length
  const umbral = input.precioContado * 0.01

  const lo = results[0]!
  const hi = results[results.length - 1]!
  const buckets = 24
  const ancho = (hi - lo) / buckets || 1
  const histograma = Array.from({ length: buckets }, (_, b) => ({
    desde: round(lo + b * ancho),
    hasta: round(lo + (b + 1) * ancho),
    n: 0,
  }))
  for (const v of results) {
    const b = Math.min(buckets - 1, Math.max(0, Math.floor((v - lo) / ancho)))
    histograma[b]!.n++
  }

  return {
    paths: o.paths,
    probGanaCuotas: round((results.filter(v => v > umbral).length / results.length) * 100, 1),
    probPierde: round((results.filter(v => v < 0).length / results.length) * 100, 1),
    media: round(media),
    p5: round(q(0.05)),
    p25: round(q(0.25)),
    mediana: round(q(0.5)),
    p75: round(q(0.75)),
    p95: round(q(0.95)),
    peor: round(lo),
    mejor: round(hi),
    histograma,
  }
}
