import { describe, expect, it } from 'vitest'

import {
  BILLS_FAQ,
  UTE_IVA_RATE,
  OSE_BLOCKS,
  OSE_FIXED_CHARGES,
  TARIFF_SOURCES,
  UTE_DISCOUNT_KWH_CAP,
  UTE_DISCOUNT_POTENCIA_CAP,
  UTE_LEVERS,
  UTE_TARIFFS,
  checkUteDiscount,
  compareUteTariffs,
  estimateUteBill,
  simpleEnergyCost,
  splitBands,
  uteTariff,
} from '../../utils/householdBills'

const input = (over: Partial<Parameters<typeof estimateUteBill>[1]> = {}) => ({
  kwh: 300,
  potenciaKw: 3.5,
  puntaPct: 20,
  vallePct: 0,
  ...over,
})

describe('escalones de la Tarifa Residencial Simple', () => {
  // La confusión que la página existe para deshacer: la gente cree que pasar de 600 kWh
  // reprecia TODO el consumo. Es progresivo, como el IRPF.
  it('aplica los escalones de forma progresiva, no reprecia todo el consumo', () => {
    // 100 kWh caen enteros en el primer escalón.
    expect(simpleEnergyCost(100).total).toBeCloseTo(100 * 6.744, 2)
    // 300 kWh = 100 al primero + 200 al segundo.
    expect(simpleEnergyCost(300).total).toBeCloseTo(100 * 6.744 + 200 * 8.452, 2)
    // 700 kWh = 100 + 500 + 100 al tercero.
    expect(simpleEnergyCost(700).total).toBeCloseTo(100 * 6.744 + 500 * 8.452 + 100 * 10.539, 2)
  })

  it('el kWh marginal del último tramo vale más de un 50 % más que el del primero', () => {
    const brackets = uteTariff('simple').brackets!
    const first = brackets[0].pricePerKwh
    const last = brackets[brackets.length - 1].pricePerKwh
    expect(last / first).toBeGreaterThan(1.5)
  })

  it('duplicar el consumo aumenta la factura más del doble en la parte de energía', () => {
    const a = simpleEnergyCost(300).total
    const b = simpleEnergyCost(600).total
    expect(b).toBeGreaterThan(a * 2)
  })

  it('un consumo de 0 kWh no cobra energía', () => {
    expect(simpleEnergyCost(0).total).toBe(0)
    expect(simpleEnergyCost(0).parts).toHaveLength(0)
  })
})

describe('IVA', () => {
  // Si esto se rompe, la página miente en el número que el lector compara contra su factura.
  it('no grava el cargo fijo y sí la energía y la potencia', () => {
    const bill = estimateUteBill('simple', input())
    const fijo = bill.lines.find(l => l.label === 'Cargo fijo')!
    const potencia = bill.lines.find(l => l.label === 'Potencia contratada')!
    expect(fijo.taxed).toBe(false)
    expect(potencia.taxed).toBe(true)
    expect(bill.lines.filter(l => l.label.startsWith('Energía')).every(l => l.taxed)).toBe(true)
    expect(bill.untaxed).toBeCloseTo(uteTariff('simple').cargoFijo, 2)
    expect(bill.iva).toBeCloseTo(bill.taxedBase * UTE_IVA_RATE, 2)
    expect(bill.total).toBeCloseTo(bill.untaxed + bill.taxedBase + bill.iva, 2)
  })

  it('el total NO es el subtotal por 1,22', () => {
    const bill = estimateUteBill('simple', input())
    const naive = (bill.untaxed + bill.taxedBase) * (1 + UTE_IVA_RATE)
    expect(bill.total).toBeLessThan(naive)
  })
})

describe('reparto por franjas', () => {
  it('reparte el consumo y el llano absorbe el resto', () => {
    const s = splitBands(input({ kwh: 500, puntaPct: 20, vallePct: 30 }), true)
    expect(s.punta).toBeCloseTo(100, 2)
    expect(s.valle).toBeCloseTo(150, 2)
    expect(s.llano).toBeCloseTo(250, 2)
    expect(s.punta + s.valle + s.llano).toBeCloseTo(500, 2)
  })

  it('ignora el valle cuando la tarifa no lo tiene', () => {
    const s = splitBands(input({ kwh: 400, puntaPct: 25, vallePct: 50 }), false)
    expect(s.valle).toBe(0)
    expect(s.punta).toBeCloseTo(100, 2)
    expect(s.llano).toBeCloseTo(300, 2)
  })

  // Un campo de porcentaje acepta cualquier cosa; el llano nunca puede quedar negativo.
  it('normaliza porcentajes que se pasan de 100 sin producir un llano negativo', () => {
    const s = splitBands(input({ kwh: 100, puntaPct: 80, vallePct: 80 }), true)
    expect(s.llano).toBeGreaterThanOrEqual(0)
    expect(s.punta + s.valle + s.llano).toBeCloseTo(100, 2)
  })

  it('clampea porcentajes negativos', () => {
    const s = splitBands(input({ kwh: 100, puntaPct: -30, vallePct: 0 }), true)
    expect(s.punta).toBe(0)
    expect(s.llano).toBeCloseTo(100, 2)
  })
})

describe('comparador de tarifas', () => {
  it('con casi todo el consumo en la punta, la Simple gana', () => {
    const c = compareUteTariffs(input({ kwh: 400, puntaPct: 90 }))
    expect(c.best.tariff.id).toBe('simple')
    expect(c.annualSavingVsSimple).toBe(0)
  })

  it('con consumo alto y poca punta, el horario gana y reporta el ahorro anual', () => {
    const c = compareUteTariffs(input({ kwh: 700, puntaPct: 5, vallePct: 30 }))
    expect(c.best.tariff.id).not.toBe('simple')
    expect(c.annualSavingVsSimple).toBeGreaterThan(0)
    expect(c.annualSavingVsSimple).toBeCloseTo((c.simple.total - c.best.total) * 12, 1)
  })

  it('marca como no elegible la tarifa horaria cuando la potencia no llega al mínimo', () => {
    const c = compareUteTariffs(input({ potenciaKw: 2.3 }))
    const doble = c.results.find(r => r.tariff.id === 'doble')!
    expect(doble.ineligibleReason).toMatch(/3.5 kW/)
    expect(c.best.tariff.id).toBe('simple')
  })

  it('nunca elige una tarifa no elegible', () => {
    const c = compareUteTariffs(input({ potenciaKw: 1.4, kwh: 900, puntaPct: 0, vallePct: 60 }))
    expect(c.best.ineligibleReason).toBeNull()
  })

  it('el costo efectivo del kWh incluye cargos fijos e IVA', () => {
    const bill = estimateUteBill('simple', input({ kwh: 100 }))
    const brackets = uteTariff('simple').brackets!
    // Con 100 kWh el cargo fijo pesa mucho: el costo real por kWh supera holgadamente la tarifa.
    expect(bill.effectiveKwhCost).toBeGreaterThan(brackets[0].pricePerKwh)
  })

  it('con 0 kWh el costo efectivo es 0 y no NaN', () => {
    expect(estimateUteBill('simple', input({ kwh: 0 })).effectiveKwhCost).toBe(0)
  })
})

describe('bonificación del 40 %', () => {
  it('rechaza por consumo y por potencia, y lo dice por separado', () => {
    const r = checkUteDiscount({ kwh: 400, potenciaKw: 5.7 })
    expect(r.eligible).toBe(false)
    expect(r.reasons).toHaveLength(2)
  })

  it('acepta cuando se cumplen las dos condiciones medibles', () => {
    const r = checkUteDiscount({
      kwh: UTE_DISCOUNT_KWH_CAP - 1,
      potenciaKw: UTE_DISCOUNT_POTENCIA_CAP,
    })
    expect(r.eligible).toBe(true)
    // No promete el beneficio: la condición personal la sabe el lector.
    expect(r.reasons[0]).toMatch(/jubilado|Fondo de Solidaridad/i)
  })

  it('el tope de consumo es estricto: 230 kWh justos no califica', () => {
    expect(checkUteDiscount({ kwh: UTE_DISCOUNT_KWH_CAP, potenciaKw: 3.5 }).eligible).toBe(false)
  })
})

describe('integridad de los datos publicados', () => {
  it('las tres tarifas tienen cargo fijo, potencia y precios de energía', () => {
    expect(UTE_TARIFFS).toHaveLength(3)
    for (const t of UTE_TARIFFS) {
      expect(t.cargoFijo).toBeGreaterThan(0)
      expect(t.potenciaPerKw).toBeGreaterThan(0)
      expect(t.potenciaRange.min).toBeLessThan(t.potenciaRange.max)
      expect(Boolean(t.brackets) !== Boolean(t.bands)).toBe(true)
    }
  })

  it('la punta es la franja más cara de cada tarifa horaria', () => {
    for (const t of UTE_TARIFFS.filter(t => t.bands)) {
      expect(t.bands!.punta).toBeGreaterThan(t.bands!.llano)
      if (t.bands!.valle !== undefined) expect(t.bands!.llano).toBeGreaterThan(t.bands!.valle)
    }
  })

  it('todas las palancas dicen qué hacer y qué se gana', () => {
    expect(UTE_LEVERS.length).toBeGreaterThanOrEqual(4)
    for (const l of UTE_LEVERS) {
      expect(l.action.length).toBeGreaterThan(20)
      expect(l.effect.length).toBeGreaterThan(20)
    }
  })

  it('cada pregunta del FAQ tiene respuesta corta y desarrollo', () => {
    expect(BILLS_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of BILLS_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.short.length).toBeGreaterThan(10)
      expect(f.answer.length).toBeGreaterThan(80)
    }
  })

  it('los tramos de OSE y los cargos fijos son monótonos crecientes', () => {
    const fixed = OSE_FIXED_CHARGES.map(c => c.amount)
    expect([...fixed].sort((a, b) => a - b)).toEqual(fixed)
    const perM3 = OSE_BLOCKS.filter(b => b.kind === 'perM3').map(b => b.amount)
    expect([...perM3].sort((a, b) => a - b)).toEqual(perM3)
  })

  it('toda cifra publicada tiene fuente citada', () => {
    expect(TARIFF_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const s of TARIFF_SOURCES) expect(s.url).toMatch(/^https:\/\//)
    // Las dos fuentes normativas que sostienen los precios.
    expect(TARIFF_SOURCES.some(s => s.url.includes('339-2025'))).toBe(true)
    expect(TARIFF_SOURCES.some(s => s.url.includes('340-2025'))).toBe(true)
  })
})
