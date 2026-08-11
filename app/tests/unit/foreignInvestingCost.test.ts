// El caso del post de Reddit, sus bordes, y las dos invariantes que la calculadora no puede
// romper: ningún costo puede dar NaN, y el rendimiento efectivo nunca puede superar al nominal
// cuando hay costos.

import { describe, expect, it } from 'vitest'

import {
  BANK_WIRE_PRESETS,
  BROKER_PRESETS,
  bankPresetById,
  brokerCommission,
  brokerPresetById,
  dividendWithholdingPct,
  estateTaxExposure,
  feeFor,
  feeLookup,
  foreignInvestingRoundTrip,
  factById,
  IRISH_UCITS_US_WITHHOLDING_PCT,
  US_DIVIDEND_WITHHOLDING_PCT,
  US_ESTATE_TAX_THRESHOLD_USD,
  US_FACTS,
  type RoundTripInput,
} from '../../utils/foreignInvestingCost'

const itau = bankPresetById('itau-link')!
const brou = bankPresetById('brou-sucursal')!
const santander = bankPresetById('santander-supernet')!
const ibkr = brokerPresetById('ibkr-pro-fixed')!
const gletir = brokerPresetById('gletir')!
const prex = brokerPresetById('prex')!
const inviu = brokerPresetById('inviu-ibkr')!

/** El caso textual del post: USD 20.000 en un ETF de EE.UU., +10%, un año, y traerlo de vuelta. */
const postCase: RoundTripInput = {
  amountSentUsd: 20_000,
  holdingYears: 1,
  totalReturnPct: 10,
  grossDividendYieldPct: 0,
  domicile: 'eeuu',
  route: 'internacional',
  bank: itau,
  correspondentBearer: 'beneficiario',
  broker: ibkr,
  gainMethod: 'real',
  withholdingAgent: 'ninguno',
}

const build = (over: Partial<RoundTripInput> = {}): RoundTripInput => ({ ...postCase, ...over })

/** Todo número que sale del módulo tiene que ser finito. Un NaN acá se publica en pantalla. */
function expectNoNaN(value: unknown, path = 'result'): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), `${path} no es finito: ${value}`).toBe(true)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => expectNoNaN(v, `${path}[${i}]`))
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) expectNoNaN(v, `${path}.${k}`)
  }
}

describe('feeFor — tramos del arancel', () => {
  it('aplica el mínimo cuando el porcentaje queda por debajo', () => {
    // BROU salida: 0,3% de USD 5.000 = 15, pero el mínimo es 40. Más USD 10 de mensaje SWIFT.
    expect(feeFor(5_000, brou.outbound)).toBe(50)
  })

  it('aplica el máximo cuando el porcentaje lo supera', () => {
    // 0,3% de USD 200.000 = 600, topeado en 300, más los USD 10 de SWIFT.
    expect(feeFor(200_000, brou.outbound)).toBe(310)
  })

  it('deja el porcentaje puro entre el mínimo y el máximo', () => {
    // 0,3% de USD 20.000 = 60, entre 40 y 300 → 60 + 10 de SWIFT.
    expect(feeFor(20_000, brou.outbound)).toBe(70)
  })

  it('el mínimo de Santander manda sobre un giro de USD 20.000', () => {
    // 0,22% de 20.000 = 44 → sube al mínimo de 88, más 20 de SWIFT.
    expect(feeFor(20_000, santander.outbound)).toBe(108)
  })

  it('resuelve el tramo condicional de BBVA en la entrada', () => {
    const bbva = bankPresetById('bbva-net')!
    expect(feeFor(100, bbva.inbound)).toBe(20) // 20% del importe hasta USD 150
    expect(feeFor(22_000, bbva.inbound)).toBe(30) // fijo por encima de USD 150
  })

  it('devuelve null —no 0— cuando el tarifario no publica el tramo', () => {
    // Los gastos de corresponsal de Itaú arrancan en USD 101: por debajo no hay precio publicado.
    expect(feeFor(50, itau.correspondentOut)).toBeNull()
    // BROU directamente no publica la tabla de corresponsales.
    expect(feeFor(20_000, brou.correspondentOut)).toBeNull()
    expect(feeFor(20_000, null)).toBeNull()
  })
})

// ── Los tramos que el tarifario SÍ publica ──────────────────────────────────────────────────
//
// «No publicado» es una afirmación fuerte y estos tres bloques la fijan contra la fuente: el
// módulo llegó a marcar como no publicados cinco tramos que los tarifarios traen impresos, y el
// efecto era SUBESTIMAR el costo (un tramo faltante se dibuja como «no publicado» pero suma 0).

describe('Santander publica los TRES tramos de corresponsalía, no sólo el del medio', () => {
  const mostrador = bankPresetById('santander-mostrador')!

  it('ítem 2.4: hasta USD 10.000 el Manual publica un MÍNIMO de USD 33', () => {
    expect(feeFor(5_000, santander.correspondentOut)).toBe(33)
    expect(feeFor(10_000, santander.correspondentOut)).toBe(33)
    // Es un mínimo, no un precio cerrado: la calculadora lo marca como piso.
    expect(feeLookup(5_000, santander.correspondentOut).isFloor).toBe(true)
  })

  it('ítem 2.5: de USD 10.001 a USD 100.000 son USD 44 y NO es un piso', () => {
    expect(feeFor(20_000, santander.correspondentOut)).toBe(44)
    expect(feeFor(100_000, santander.correspondentOut)).toBe(44)
    expect(feeLookup(20_000, santander.correspondentOut).isFloor).toBe(false)
  })

  it('ítem 2.6: por encima de USD 100.000 son USD 55, no «no publicado»', () => {
    expect(feeFor(100_001, santander.correspondentOut)).toBe(55)
    expect(feeFor(1_000_000, santander.correspondentOut)).toBe(55)
  })

  it('la misma tabla rige para los dos canales de Santander', () => {
    for (const amount of [5_000, 20_000, 500_000]) {
      expect(feeFor(amount, mostrador.correspondentOut)).toBe(
        feeFor(amount, santander.correspondentOut)
      )
    }
  })

  it('un giro de USD 5.000 por Santander ya NO deja la cuenta incompleta', () => {
    const r = foreignInvestingRoundTrip(build({ amountSentUsd: 5_000, bank: santander }))
    expect(r.lines.find(l => l.id === 'salida-corresponsal')!.unpublished).toBeFalsy()
    expect(r.lines.find(l => l.id === 'salida-corresponsal')!.amountUsd).toBe(33)
    // La vuelta sigue sin publicarse: el Manual sólo trae corresponsalía en las EMITIDAS.
    expect(r.lines.find(l => l.id === 'entrada-corresponsal')!.unpublished).toBe(true)
  })
})

describe('Itaú publica la tabla ENTERA de corresponsal de entrada (sección 8.1)', () => {
  it('los cuatro escalones salen del tarifario, no sólo los dos de arriba', () => {
    expect(feeFor(101, itau.correspondentIn)).toBe(10)
    expect(feeFor(500, itau.correspondentIn)).toBe(10)
    expect(feeFor(501, itau.correspondentIn)).toBe(15)
    expect(feeFor(2_000, itau.correspondentIn)).toBe(15)
    expect(feeFor(2_001, itau.correspondentIn)).toBe(25)
    expect(feeFor(20_000, itau.correspondentIn)).toBe(25)
    expect(feeFor(20_001, itau.correspondentIn)).toBe(35)
  })

  it('sólo por debajo de USD 101 falta el precio, igual que en la tabla de salida', () => {
    expect(feeFor(100, itau.correspondentIn)).toBeNull()
    expect(feeFor(100, itau.correspondentOut)).toBeNull()
  })

  it('es la misma tabla para el canal digital y para mostrador', () => {
    const mostrador = bankPresetById('itau-mostrador')!
    for (const amount of [150, 1_000, 10_000, 50_000]) {
      expect(feeFor(amount, mostrador.correspondentIn)).toBe(feeFor(amount, itau.correspondentIn))
    }
  })

  it('traer USD 1.500 de vuelta cuesta USD 15, y ya no queda «no publicado»', () => {
    const r = foreignInvestingRoundTrip(
      build({ amountSentUsd: 1_500, totalReturnPct: 0, correspondentBearer: 'ordenante' })
    )
    const vuelta = r.lines.find(l => l.id === 'entrada-corresponsal')!
    expect(vuelta.unpublished).toBeFalsy()
    expect(vuelta.amountUsd).toBe(15)
  })
})

describe('el canal Itaú/Link tiene tope, y su tabla de corresponsal termina ahí', () => {
  it('hasta USD 100.000 el corresponsal de salida son USD 40', () => {
    expect(feeFor(100_000, itau.correspondentOut)).toBe(40)
  })

  it('por encima del tope no extrapola: devuelve null', () => {
    expect(feeFor(100_001, itau.correspondentOut)).toBeNull()
    // Mostrador sí tiene tramo abierto («Más de U$S 20.000 → U$S 40»).
    expect(feeFor(500_000, bankPresetById('itau-mostrador')!.correspondentOut)).toBe(40)
  })

  it('avisa que el monto no entra por el canal, igual que hace con el tope de Prex', () => {
    const r = foreignInvestingRoundTrip(build({ amountSentUsd: 250_000 }))
    expect(r.warnings.some(w => w.includes('tope de USD 100.000'))).toBe(true)
    expect(r.incomplete).toBe(true)
  })

  it('el tope es del canal digital, no del banco: mostrador no avisa', () => {
    const r = foreignInvestingRoundTrip(
      build({ amountSentUsd: 250_000, bank: bankPresetById('itau-mostrador')! })
    )
    expect(r.warnings.some(w => w.includes('tope de USD'))).toBe(false)
  })
})

describe('brokerCommission — «¿cobra por el monto o por la transacción?»', () => {
  it('por acción: sin precio de la acción devuelve el MÍNIMO y lo marca como piso', () => {
    const c = brokerCommission(20_000, ibkr.buy)
    expect(c.amountUsd).toBe(1)
    expect(c.isFloor).toBe(true)
  })

  it('por acción: con USD 20.000 a un precio típico de SPY sigue mandando el mínimo', () => {
    // A USD 600 la acción, 20.000 compran ~33 acciones → 33 × 0,005 = 0,17, por debajo del mínimo.
    const c = brokerCommission(20_000, ibkr.buy, 600)
    expect(c.amountUsd).toBe(1)
    expect(c.isFloor).toBe(false)
  })

  it('por acción: no escala con el monto — el doble de plata cuesta lo mismo', () => {
    expect(brokerCommission(20_000, ibkr.buy, 600).amountUsd).toBe(
      brokerCommission(40_000, ibkr.buy, 600).amountUsd
    )
  })

  it('porcentaje: el corredor local SÍ escala con el monto', () => {
    expect(brokerCommission(20_000, gletir.buy).amountUsd).toBe(150)
    expect(brokerCommission(40_000, gletir.buy).amountUsd).toBe(300)
  })

  it('porcentaje: respeta el mínimo por operación', () => {
    expect(brokerCommission(100, gletir.buy).amountUsd).toBe(10)
  })

  it('porcentaje con cargo fijo: Prex cobra 0,99 + 2% en la compra y 1% en la venta', () => {
    expect(brokerCommission(1_000, prex.buy).amountUsd).toBeCloseTo(20.99, 6)
    expect(brokerCommission(1_000, prex.sell).amountUsd).toBeCloseTo(10, 6)
  })
})

describe('el caso del post: USD 20.000, +10%, un año, y traerlo de vuelta', () => {
  const r = foreignInvestingRoundTrip(postCase)

  it('no produce ni un solo número no finito', () => {
    expectNoNaN(r)
  })

  it('debita el giro más la comisión fija del canal digital', () => {
    // Itaú Link: USD 20 fijos, no un porcentaje del monto.
    expect(r.totals.totalDebitedUsd).toBe(20_020)
  })

  it('al bróker le llega MENOS de lo que se mandó, por los corresponsales', () => {
    // El costo de corresponsal se descuenta en tránsito y por defecto lo paga el beneficiario.
    expect(r.totals.arrivedAtBrokerUsd).toBe(19_970)
    expect(r.totals.arrivedAtBrokerUsd).toBeLessThan(r.totals.amountSentUsd)
  })

  it('EE.UU. no cobra nada por la ganancia de la venta', () => {
    const gainRow = r.taxRows.find(row => row.label.includes('Ganancia'))!
    expect(gainRow.foreignTaxUsd).toBe(0)
    expect(r.lines.filter(l => l.stage === 'impuesto-exterior').every(l => l.amountUsd === 0)).toBe(
      true
    )
  })

  it('el IRPF uruguayo cae sobre la ganancia en dólares, al 12%', () => {
    const gainRow = r.taxRows.find(row => row.label.includes('Ganancia'))!
    expect(gainRow.ratePct).toBe(12)
    expect(gainRow.baseUsd).toBeCloseTo(r.totals.finalPortfolioValueUsd - r.totals.investedUsd, 6)
    expect(gainRow.dueUsd).toBeCloseTo(gainRow.baseUsd * 0.12, 6)
  })

  it('llega a la cuenta menos que el valor de la cartera, y el neto es todavía menor', () => {
    expect(r.totals.creditedToLocalAccountUsd).toBeLessThan(r.totals.finalPortfolioValueUsd)
    expect(r.totals.netToYouUsd).toBeLessThan(r.totals.creditedToLocalAccountUsd)
  })

  it('el rendimiento efectivo queda por debajo del 10% nominal', () => {
    expect(r.yields.nominalReturnPct).toBeCloseTo(10, 6)
    expect(r.yields.effectiveReturnPct).toBeLessThan(10)
    expect(r.yields.effectiveReturnPct).toBeGreaterThan(0)
  })

  it('los costos se llevan bastante menos del 30% de la ganancia que teme el post', () => {
    expect(r.yields.costShareOfGrossGainPct).not.toBeNull()
    expect(r.yields.costShareOfGrossGainPct!).toBeLessThan(30)
    expect(r.yields.costShareOfGrossGainPct!).toBeGreaterThan(0)
  })

  it('avisa que sin dividendos cargados falta la única fuga anual real', () => {
    expect(r.warnings.some(w => w.includes('dividendos'))).toBe(true)
  })

  it('mover la plata cuesta mucho más que comprar el ETF', () => {
    const giros = r.lines
      .filter(l => l.stage === 'salida' || l.stage === 'entrada')
      .reduce((s, l) => s + l.amountUsd, 0)
    const comisiones = r.totals.brokerCommissionsUsd
    expect(giros).toBeGreaterThan(comisiones * 10)
  })
})

describe('dividendos: la fuga que se repite todos los años', () => {
  it('EE.UU. retiene 30% del bruto y el fondo irlandés soporta 15%', () => {
    expect(dividendWithholdingPct('eeuu')).toBe(US_DIVIDEND_WITHHOLDING_PCT)
    expect(dividendWithholdingPct('irlanda')).toBe(IRISH_UCITS_US_WITHHOLDING_PCT)
  })

  it('con un fondo de EE.UU. la retención es el doble que con uno irlandés', () => {
    const us = foreignInvestingRoundTrip(build({ grossDividendYieldPct: 1.5 }))
    const ie = foreignInvestingRoundTrip(build({ grossDividendYieldPct: 1.5, domicile: 'irlanda' }))
    expect(us.totals.foreignWithholdingUsd).toBeCloseTo(ie.totals.foreignWithholdingUsd * 2, 6)
    expect(ie.totals.netToYouUsd).toBeGreaterThan(us.totals.netToYouUsd)
  })

  it('EL PUNTO: el exceso de crédito del dividendo NO baja el impuesto de la ganancia', () => {
    const r = foreignInvestingRoundTrip(build({ grossDividendYieldPct: 1.5 }))
    const dividendo = r.taxRows.find(row => row.label.startsWith('Dividendos'))!
    const ganancia = r.taxRows.find(row => row.label.includes('Ganancia'))!

    // 30% retenido afuera contra 12% de IRPF: el impuesto del dividendo queda en 0...
    expect(dividendo.dueUsd).toBe(0)
    // ...y los 18 puntos de exceso se PIERDEN, no se arrastran ni compensan.
    expect(dividendo.creditLostUsd).toBeGreaterThan(0)
    // La ganancia sigue pagando su 12% entero.
    expect(ganancia.creditAppliedUsd).toBe(0)
    expect(ganancia.dueUsd).toBeCloseTo(ganancia.baseUsd * 0.12, 6)
  })

  it('un fondo irlandés no genera crédito para el tenedor: la retención la pagó el fondo', () => {
    const r = foreignInvestingRoundTrip(build({ grossDividendYieldPct: 1.5, domicile: 'irlanda' }))
    const dividendo = r.taxRows.find(row => row.label.startsWith('Dividendos'))!
    expect(dividendo.foreignTaxUsd).toBe(0)
    expect(dividendo.dueUsd).toBeGreaterThan(0)
    expect(r.warnings.some(w => w.includes('conservador'))).toBe(true)
  })
})

describe('bordes del giro', () => {
  it('un monto chico paga el MÍNIMO del banco: el costo se vuelve enorme en proporción', () => {
    const chico = foreignInvestingRoundTrip(
      build({ amountSentUsd: 500, bank: brou, correspondentBearer: 'ordenante' })
    )
    const salida = chico.lines.find(l => l.id === 'salida-banco')!
    expect(salida.amountUsd).toBe(50) // mínimo 40 + 10 de SWIFT, no el 0,3% (=1,50)
    expect(salida.amountUsd / chico.totals.amountSentUsd).toBeGreaterThan(0.09)
    expectNoNaN(chico)
  })

  it('un monto grande queda topeado por el MÁXIMO del banco', () => {
    const grande = foreignInvestingRoundTrip(build({ amountSentUsd: 500_000, bank: brou }))
    const salida = grande.lines.find(l => l.id === 'salida-banco')!
    expect(salida.amountUsd).toBe(310) // 300 de tope + 10 de SWIFT
    // El costo del giro deja de escalar: sobre USD 500.000 es ruido.
    expect(salida.amountUsd / grande.totals.amountSentUsd).toBeLessThan(0.001)
    expectNoNaN(grande)
  })

  it('marca la cuenta como INCOMPLETA cuando el banco no publica los corresponsales', () => {
    const r = foreignInvestingRoundTrip(build({ bank: brou }))
    expect(r.incomplete).toBe(true)
    expect(r.lines.filter(l => l.unpublished).length).toBeGreaterThan(0)
    expect(r.warnings.some(w => w.includes('corresponsales'))).toBe(true)
  })

  it('cargar a mano lo que te cobró el banco reemplaza el default y completa la cuenta', () => {
    // Es la única salida para BROU, que no publica su cadena de corresponsales.
    const r = foreignInvestingRoundTrip(
      build({ bank: brou, correspondentOutOverrideUsd: 25, correspondentInOverrideUsd: 25 })
    )
    expect(r.incomplete).toBe(false)
    const ida = r.lines.find(l => l.id === 'salida-corresponsal')!
    expect(ida.amountUsd).toBe(25)
    expect(ida.overridden).toBe(true)
    expect(ida.unpublished).toBe(false)
  })

  it('el override del arancel pisa el tarifario por defecto', () => {
    const r = foreignInvestingRoundTrip(build({ outboundBankFeeOverrideUsd: 55 }))
    expect(r.lines.find(l => l.id === 'salida-banco')!.amountUsd).toBe(55)
    expect(r.totals.totalDebitedUsd).toBe(20_055)
  })

  it('si el ordenante asume el corresponsal, al bróker le llega el monto entero', () => {
    const r = foreignInvestingRoundTrip(build({ correspondentBearer: 'ordenante' }))
    expect(r.totals.arrivedAtBrokerUsd).toBe(20_000)
    expect(r.totals.totalDebitedUsd).toBe(20_050) // 20 del banco + 30 de corresponsal
  })
})

describe('bordes del rendimiento', () => {
  it('con rendimiento cero no hay impuesto a la ganancia, pero sí costos', () => {
    const r = foreignInvestingRoundTrip(build({ totalReturnPct: 0 }))
    const ganancia = r.taxRows.find(row => row.label.includes('Ganancia'))!
    expect(ganancia.baseUsd).toBe(0)
    expect(ganancia.dueUsd).toBe(0)
    expect(r.totals.totalCostsUsd).toBeGreaterThan(0)
    expect(r.totals.netToYouUsd).toBeLessThan(r.totals.totalDebitedUsd)
    expect(r.yields.effectiveReturnPct).toBeLessThan(0)
    expect(r.yields.costShareOfGrossGainPct).toBeNull() // sin ganancia bruta no hay porcentaje
    expectNoNaN(r)
  })

  it('con rendimiento negativo la base de la ganancia es 0, no negativa', () => {
    const r = foreignInvestingRoundTrip(build({ totalReturnPct: -25 }))
    const ganancia = r.taxRows.find(row => row.label.includes('Ganancia'))!
    expect(ganancia.baseUsd).toBe(0)
    expect(r.totals.uruguayanTaxUsd).toBe(0)
    expect(r.yields.effectiveReturnPct).toBeLessThan(-25)
    expectNoNaN(r)
  })

  it('la base ficta del 20% grava aunque hayas perdido plata', () => {
    const r = foreignInvestingRoundTrip(build({ totalReturnPct: -25, gainMethod: 'ficto20' }))
    const ganancia = r.taxRows.find(row => row.label.includes('Ganancia'))!
    expect(ganancia.baseUsd).toBeCloseTo(r.totals.finalPortfolioValueUsd * 0.2, 6)
    expect(ganancia.dueUsd).toBeGreaterThan(0)
    expectNoNaN(r)
  })

  it('sobrevive a una pérdida total sin producir NaN', () => {
    const r = foreignInvestingRoundTrip(build({ totalReturnPct: -100 }))
    expect(r.totals.finalPortfolioValueUsd).toBe(0)
    expect(r.yields.effectiveReturnPct).toBeLessThanOrEqual(-100)
    expect(r.yields.effectiveAnnualReturnPct).toBe(-100)
    expectNoNaN(r)
  })

  it('sobrevive a entradas basura (NaN, Infinity, negativos, plazo cero)', () => {
    const basura = foreignInvestingRoundTrip(
      build({
        amountSentUsd: Number.NaN,
        holdingYears: Number.POSITIVE_INFINITY,
        totalReturnPct: Number.NaN,
        grossDividendYieldPct: -5,
      })
    )
    expectNoNaN(basura)

    // Monto 0 con un banco que cobra cargo FIJO: te debitan la comisión igual, así que el
    // rendimiento efectivo es -100%. No es un borde roto, es el cargo fijo haciendo su trabajo.
    const cero = foreignInvestingRoundTrip(
      build({ amountSentUsd: 0, holdingYears: 0, totalReturnPct: 0 })
    )
    expectNoNaN(cero)
    expect(cero.totals.totalDebitedUsd).toBe(20)
    expect(cero.yields.effectiveReturnPct).toBe(-100)
    expect(cero.yields.nominalReturnPct).toBe(0)
  })

  it('un plazo fraccionario devenga dividendos proporcionales', () => {
    const medio = foreignInvestingRoundTrip(build({ holdingYears: 0.5, grossDividendYieldPct: 2 }))
    const entero = foreignInvestingRoundTrip(build({ holdingYears: 1, grossDividendYieldPct: 2 }))
    expect(medio.totals.grossDividendsUsd).toBeCloseTo(entero.totals.grossDividendsUsd / 2, 6)
    expectNoNaN(medio)
  })
})

describe('la invariante: el rendimiento efectivo nunca supera al nominal', () => {
  const bancos = [...BANK_WIRE_PRESETS]
  const brokers = [...BROKER_PRESETS]
  const rendimientos = [-100, -30, 0, 0.5, 10, 45, 300]
  const montos = [50, 500, 20_000, 250_000]
  const plazos = [0.25, 1, 5]

  it('se cumple en toda la matriz de bancos, brókers, montos, plazos y rendimientos', () => {
    for (const bank of bancos) {
      for (const broker of brokers) {
        for (const totalReturnPct of rendimientos) {
          for (const amountSentUsd of montos) {
            for (const holdingYears of plazos) {
              for (const domicile of ['eeuu', 'irlanda'] as const) {
                const r = foreignInvestingRoundTrip(
                  build({
                    bank,
                    broker,
                    totalReturnPct,
                    amountSentUsd,
                    holdingYears,
                    domicile,
                    grossDividendYieldPct: 1.5,
                    annualAumFeePctOverride: broker.annualAumFeePct,
                  })
                )
                const ctx = `${bank.id}/${broker.id}/${amountSentUsd}/${holdingYears}a/${totalReturnPct}%/${domicile}`
                expectNoNaN(r, ctx)
                expect(
                  r.yields.effectiveReturnPct,
                  `${ctx}: efectivo ${r.yields.effectiveReturnPct} > nominal ${r.yields.nominalReturnPct}`
                ).toBeLessThanOrEqual(r.yields.nominalReturnPct + 1e-9)
                expect(r.totals.netToYouUsd).toBeLessThanOrEqual(
                  r.yields.frictionlessFinalUsd + 1e-9
                )
                for (const line of r.lines) {
                  expect(Number.isFinite(line.amountUsd), `${ctx}: ${line.id}`).toBe(true)
                  expect(line.amountUsd).toBeGreaterThanOrEqual(0)
                }
              }
            }
          }
        }
      }
    }
  })
})

describe('Inviu por la ruta a IBKR: la comisión por operación es la de IBKR', () => {
  // El tarifario dice que la comisión sobre AuM «se suma a los costos por operación de
  // Interactive Brokers», y su nota (4) manda al esquema IBKR PRO. Cobrar acá un 1,50% por punta
  // daba USD 300 sobre USD 20.000 donde la fuente dice USD 1.
  it('cobra POR ACCIÓN, no un porcentaje del monto', () => {
    expect(inviu.buy.kind).toBe('por-accion')
    expect(inviu.sell.kind).toBe('por-accion')
  })

  it('sobre USD 20.000 la punta cuesta lo mismo que en IBKR Pro, no USD 300', () => {
    expect(brokerCommission(20_000, inviu.buy, 600).amountUsd).toBe(
      brokerCommission(20_000, ibkr.buy, 600).amountUsd
    )
    expect(brokerCommission(20_000, inviu.buy, 600).amountUsd).toBe(1)
  })

  it('lo único propio de Inviu en esta ruta es el 1,50% anual sobre el AuM (Silver)', () => {
    expect(inviu.annualAumFeePct).toBe(1.5)
  })

  it('no publica como precio los «Hasta X%» del bloque de cuenta custodia', () => {
    const r = foreignInvestingRoundTrip(build({ broker: inviu, route: 'local' }))
    // 1,50% de USD 20.000 serían USD 300 por punta: ese número no puede aparecer.
    expect(r.totals.brokerCommissionsUsd).toBeLessThan(10)
    expect(inviu.note).toMatch(/Hasta 1,50%/)
    expect(inviu.note).toMatch(/TECHOS|techos/)
  })

  it('linkea también el tarifario de IBKR, que es donde está la comisión por operación', () => {
    expect(inviu.extraSources?.some(s => s.url.includes('interactivebrokers.com'))).toBe(true)
  })
})

describe('cada afirmación linkea donde realmente está', () => {
  it('IBKR: los retiros gratis se publican en «Other Fees», no en la página de acciones', () => {
    for (const id of ['ibkr-pro-fixed', 'ibkr-pro-tiered']) {
      const b = brokerPresetById(id)!
      expect(b.extraSources?.some(s => s.url.includes('other-fees.php'))).toBe(true)
    }
  })

  it('Prex: el cargo de USD 0,20 es del Exchange y sólo en la VENTA, no un cargo cambiario', () => {
    expect(prex.note).toMatch(/VENTA/)
    expect(prex.note).toMatch(/Exchange/)
    expect(prex.note).not.toMatch(/cambiario/)
  })

  it('BROU: la ausencia que es única es la de la IDA, no la de toda la cadena', () => {
    expect(brou.note).toMatch(/IDA/)
    // Contradecía a los datos del propio módulo: en la vuelta tampoco publican estos dos.
    expect(bankPresetById('bbva-net')!.correspondentIn).toBeNull()
    expect(santander.correspondentIn).toBeNull()
  })

  it('el costo fiscal en moneda extranjera es del Título 7 art. 32, no del Decreto 148/007', () => {
    const irpf = foreignInvestingRoundTrip(postCase).lines.find(l => l.stage === 'impuesto-uy')!
    expect(irpf.sourceUrl).toContain('todgi-2023/7-2024')
  })
})

describe('la ruta sugerida por el preset se usa, no queda de adorno', () => {
  it('avisa si mandás un giro internacional a una plataforma que se fondea local', () => {
    const r = foreignInvestingRoundTrip(build({ broker: gletir, route: 'internacional' }))
    expect(r.warnings.some(w => w.includes('transferencia LOCAL'))).toBe(true)
  })

  it('avisa al revés: ruta local con un bróker que se fondea por giro', () => {
    const r = foreignInvestingRoundTrip(
      build({ broker: ibkr, route: 'local', bank: null, localTransferOutUsd: 5 })
    )
    expect(r.warnings.some(w => w.includes('giro INTERNACIONAL'))).toBe(true)
  })

  it('con la ruta que el preset sugiere no molesta', () => {
    const r = foreignInvestingRoundTrip(postCase)
    expect(r.warnings.some(w => w.includes('se fondea'))).toBe(false)
  })
})

describe('la comisión anual sobre el saldo (AuM)', () => {
  it('en un buy-and-hold pesa más que todo el round trip de giros', () => {
    const conAum = foreignInvestingRoundTrip(build({ broker: inviu, holdingYears: 5 }))
    const giros = conAum.lines
      .filter(l => l.stage === 'salida' || l.stage === 'entrada')
      .reduce((s, l) => s + l.amountUsd, 0)
    expect(conAum.totals.aumFeesUsd).toBeGreaterThan(giros)
  })

  it('escala con los años: cinco años cuestan más que uno', () => {
    const uno = foreignInvestingRoundTrip(build({ broker: inviu, holdingYears: 1 }))
    const cinco = foreignInvestingRoundTrip(build({ broker: inviu, holdingYears: 5 }))
    expect(cinco.totals.aumFeesUsd).toBeGreaterThan(uno.totals.aumFeesUsd * 4)
  })
})

describe('ruta local vs. giro internacional', () => {
  it('la ruta local no tiene corresponsales, pero el corredor cobra porcentaje', () => {
    const local = foreignInvestingRoundTrip(
      build({
        route: 'local',
        bank: null,
        broker: gletir,
        localTransferOutUsd: 5,
        localTransferInUsd: 0,
      })
    )
    expect(local.lines.some(l => l.id.includes('corresponsal'))).toBe(false)
    expect(local.totals.totalDebitedUsd).toBe(20_005)
    // 0,75% de compra + 0,75% de venta: la estructura opuesta a la de IBKR.
    expect(local.totals.brokerCommissionsUsd).toBeGreaterThan(250)
    expectNoNaN(local)
  })

  it('sin costo de transferencia local cargado, la cuenta queda incompleta', () => {
    const r = foreignInvestingRoundTrip(
      build({ route: 'local', bank: null, broker: gletir, localTransferOutUsd: null })
    )
    expect(r.incomplete).toBe(true)
  })

  it('Prex avisa que USD 20.000 no entran por su tope mensual', () => {
    const r = foreignInvestingRoundTrip(
      build({
        route: 'local',
        bank: null,
        broker: prex,
        localTransferOutUsd: 0,
        localTransferInUsd: 0,
      })
    )
    expect(r.warnings.some(w => w.includes('tope de compra'))).toBe(true)
  })
})

describe('retención definitiva del custodio local (8%)', () => {
  it('baja la carga del 12% al 8% sólo si hay custodio local Y se opta', () => {
    const doce = foreignInvestingRoundTrip(build({ withholdingAgent: 'custodio-local' }))
    const ocho = foreignInvestingRoundTrip(
      build({ withholdingAgent: 'custodio-local', definitiveWithholding: true })
    )
    expect(doce.taxRows.every(r => r.ratePct === 12)).toBe(true)
    expect(ocho.taxRows.every(r => r.ratePct === 8)).toBe(true)
    expect(ocho.totals.uruguayanTaxUsd).toBeLessThan(doce.totals.uruguayanTaxUsd)
  })

  it('sin custodio local, optar por la definitiva no cambia nada: sigue siendo 12%', () => {
    const r = foreignInvestingRoundTrip(
      build({ withholdingAgent: 'ninguno', definitiveWithholding: true })
    )
    expect(r.taxRows.every(row => row.ratePct === 12)).toBe(true)
  })
})

describe('estate tax: el techo que aparece al repetir el aporte', () => {
  it('USD 20.000 en un fondo de EE.UU. todavía no cruza el umbral', () => {
    const e = estateTaxExposure({ portfolioValueUsd: 20_000, domicile: 'eeuu' })
    expect(e.inScope).toBe(true)
    expect(e.crossesThreshold).toBe(false)
    expect(e.excessUsd).toBe(0)
    expect(e.thresholdUsd).toBe(US_ESTATE_TAX_THRESHOLD_USD)
  })

  it('a las tres veces que repita el aporte, sí lo cruza', () => {
    const e = estateTaxExposure({ portfolioValueUsd: 80_000, domicile: 'eeuu' })
    expect(e.crossesThreshold).toBe(true)
    expect(e.excessUsd).toBe(20_000)
    expect(e.topRatePct).toBe(40)
  })

  it('cuántos aportes faltan se CALCULA: no es «tres» para cualquier monto', () => {
    // Con USD 1.000 la nota afirmaba igual que con tres aportes ya estabas arriba (3.000).
    const chico = estateTaxExposure({ portfolioValueUsd: 1_000, domicile: 'eeuu' })
    expect(chico.contributionsToCrossThreshold).toBe(60)
    expect(chico.note).toContain('60 carteras')
    expect(chico.note).not.toContain('tres aportes')

    const veinte = estateTaxExposure({ portfolioValueUsd: 20_000, domicile: 'eeuu' })
    expect(veinte.contributionsToCrossThreshold).toBe(3)
    expect(veinte.note).toContain('3 carteras')
  })

  it('con la cartera ya por encima del umbral no promete ninguna cuenta de aportes', () => {
    const e = estateTaxExposure({ portfolioValueUsd: 200_000, domicile: 'eeuu' })
    expect(e.note).not.toMatch(/carteras iguales/)
  })

  it('un fondo irlandés queda fuera del hecho imponible, cualquiera sea el monto', () => {
    const e = estateTaxExposure({ portfolioValueUsd: 5_000_000, domicile: 'irlanda' })
    expect(e.inScope).toBe(false)
    expect(e.crossesThreshold).toBe(false)
    expect(e.excessUsd).toBe(0)
  })

  it('no publicamos un impuesto calculado con una escala que no leímos entera', () => {
    const e = estateTaxExposure({ portfolioValueUsd: 5_000_000, domicile: 'eeuu' })
    expect(e).not.toHaveProperty('taxUsd')
  })
})

describe('los hechos publicados llevan norma, fuente y fecha', () => {
  it('cada hecho cita su artículo y una URL', () => {
    for (const f of US_FACTS) {
      expect(f.law).toBeTruthy()
      expect(f.sourceUrl).toMatch(/^https:\/\//)
      expect(f.verifiedOn).toBe('2026-08-11')
    }
  })

  it('lo que no se pudo verificar queda marcado como no resuelto, no como cifra', () => {
    for (const id of ['situs-spy', 'efectivo-en-broker', 'limitation-on-benefits']) {
      expect(factById(id)?.confidence).toBe('no-resuelto')
    }
  })

  it('las citas textuales coinciden con la norma a la que se atribuyen', () => {
    // T7 art. 25 dice «las mismas rentas», en plural, y es el eje de toda la corrección central.
    const irpf = foreignInvestingRoundTrip(build({ grossDividendYieldPct: 1.5 })).taxRows
    expect(irpf.some(r => r.creditLostUsd > 0)).toBe(true)
    // IRC 2104(a) sí dice «only if issued by a domestic corporation»: la exclusividad está ahí.
    expect(factById('situs')!.law).toContain('only if issued by a domestic corporation')
    // La exención de los 183 días tiene la salvedad de la Pub. 519.
    expect(factById('ganancia-capital-exenta')!.title).toMatch(/efectivamente conectada/)
    expect(factById('ganancia-capital-excepciones')!.title).toMatch(/OID/)
    // El exit tax irlandés: el camino incondicional es el del sistema de compensación.
    expect(factById('irlanda-sin-exit-tax')!.title).toMatch(/declaración de no residencia/)
  })

  it('publica explícitamente que Uruguay NO tiene tratado con EE.UU.', () => {
    const t = factById('sin-tratado')!
    expect(t.confidence).toBe('confirmado')
    expect(t.pct).toBeNull()
    expect(t.title).toMatch(/W-8BEN/)
  })

  it('cada tarifario comercial lleva su fecha de lectura y su link', () => {
    for (const bank of BANK_WIRE_PRESETS) {
      for (const s of [bank.outbound, bank.inbound]) {
        expect(s.sourceUrl).toMatch(/^https:\/\//)
        expect(s.readOn).toBe('2026-08-11')
      }
    }
    for (const broker of BROKER_PRESETS) {
      expect(broker.sourceUrl).toMatch(/^https:\/\//)
      expect(broker.readOn).toBe('2026-08-11')
    }
  })
})
