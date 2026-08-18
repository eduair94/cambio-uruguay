// Guarda de /comprar-auto-con-deuda-uruguay.
//
// Lo que estos tests protegen NO es la aritmética por la aritmética: es que la página no vuelva a
// decir lo que decía el hilo de Reddit que la originó. Por eso hay asserts sobre el contenido
// (que la patente prescriba a 10 y no a 5, que el corte de las placas sea 5 ejercicios, que el
// mito del peaje quede marcado «a medias» y no «cierto») además de los del cálculo.

import { describe, expect, it } from 'vitest'

import {
  BEFORE_BUYING_STEPS,
  CAR_DEBT_FAQ,
  CAR_DEBT_MYTHS,
  CAR_DEBT_SOURCES,
  CAR_DEBT_STAGES,
  CAR_DEBT_VERDICTS,
  CERTIFICADO_COVERS,
  CERTIFICADO_FACTS,
  CIRCULAR_MULTA_MAX_POR_ANIO,
  CIRCULAR_MULTA_PCT,
  CONVENIO_CADUCIDAD_CUOTAS,
  CONVENIO_MAX_CUOTAS,
  CONVENIO_MONTHLY_PCT,
  LISTING_TRAPS,
  MORA_RECARGO_DAILY_PCT,
  MORA_TIERS,
  PRESCRIPCION_MULTAS_ANIOS,
  PRESCRIPCION_PATENTE_ANIOS,
  RETIRO_PLACAS_EJERCICIOS,
  computeCarDebt,
  computeConvenio,
  moraTierFor,
} from '../../utils/carDebt'

describe('constantes de la norma', () => {
  it('separa los dos relojes de prescripción: la patente NO prescribe a los cinco', () => {
    expect(PRESCRIPCION_PATENTE_ANIOS).toBe(10)
    expect(PRESCRIPCION_MULTAS_ANIOS).toBe(5)
    expect(PRESCRIPCION_PATENTE_ANIOS).not.toBe(PRESCRIPCION_MULTAS_ANIOS)
  })

  it('la multa por circular es el 25% aplicable hasta 4 veces: el 100% de la patente anual', () => {
    expect(CIRCULAR_MULTA_PCT).toBe(25)
    expect(CIRCULAR_MULTA_MAX_POR_ANIO).toBe(4)
    expect(CIRCULAR_MULTA_PCT * CIRCULAR_MULTA_MAX_POR_ANIO).toBe(100)
  })

  it('el corte de retiro de placas son cinco ejercicios y el convenio caduca con tres cuotas', () => {
    expect(RETIRO_PLACAS_EJERCICIOS).toBe(5)
    expect(CONVENIO_MAX_CUOTAS).toBe(36)
    expect(CONVENIO_CADUCIDAD_CUOTAS).toBe(3)
  })

  it('cada escalón de mora aplica la mitad del porcentaje nominal del artículo', () => {
    expect(MORA_TIERS).toHaveLength(3)
    for (const tier of MORA_TIERS) {
      expect(tier.effectivePct).toBeCloseTo(tier.nominalPct / 2, 10)
    }
    expect(MORA_TIERS.map(t => t.nominalPct)).toEqual([5, 10, 20])
  })

  it('los escalones de mora cubren la recta sin huecos ni solapes', () => {
    for (let i = 1; i < MORA_TIERS.length; i++) {
      expect(MORA_TIERS[i]!.fromDays).toBe(MORA_TIERS[i - 1]!.toDays! + 1)
    }
    expect(MORA_TIERS[MORA_TIERS.length - 1]!.toDays).toBeNull()
  })
})

describe('moraTierFor', () => {
  it('ubica los bordes de cada escalón', () => {
    expect(moraTierFor(0).effectivePct).toBe(2.5)
    expect(moraTierFor(5).effectivePct).toBe(2.5)
    expect(moraTierFor(6).effectivePct).toBe(5)
    expect(moraTierFor(90).effectivePct).toBe(5)
    expect(moraTierFor(91).effectivePct).toBe(10)
    expect(moraTierFor(3650).effectivePct).toBe(10)
  })

  it('no explota con entradas basura de un campo de texto', () => {
    expect(moraTierFor(-40).effectivePct).toBe(2.5)
    expect(moraTierFor(Number.NaN).effectivePct).toBe(2.5)
    expect(moraTierFor(Number.POSITIVE_INFINITY).effectivePct).toBe(10)
  })
})

describe('computeCarDebt', () => {
  const base = {
    askingPrice: 200_000,
    patenteAnual: 30_000,
    tributoAdeudado: 90_000,
    diasAtraso: 730,
    multasPendientes: 15_000,
    multasPorCircular: 2,
  }

  it('suma tributo, mora, recargo, multas de tránsito y multas por circular', () => {
    const r = computeCarDebt(base)

    expect(r.tributo).toBe(90_000)
    // Dos años de atraso caen en el tercer escalón: 20% nominal, 10% efectivo.
    expect(r.multaMora).toBe(9_000)
    expect(r.multasTransito).toBe(15_000)
    // 2 multas x 25% de 30.000.
    expect(r.multasCirculacion).toBe(15_000)

    const suma = r.tributo + r.multaMora + r.recargo + r.multasTransito + r.multasCirculacion
    expect(r.deudaTotal).toBeCloseTo(suma, 2)
    expect(r.costoReal).toBeCloseTo(base.askingPrice + r.deudaTotal, 2)
  })

  it('capitaliza el recargo día a día, no lo multiplica linealmente', () => {
    const r = computeCarDebt(base)
    const lineal = 90_000 * (MORA_RECARGO_DAILY_PCT / 100) * 730

    // Componer 730 días al 0,0348236% diario tiene que dar por encima del simple.
    expect(r.recargo).toBeGreaterThan(lineal)
    expect(r.recargo).toBeCloseTo(90_000 * ((1 + MORA_RECARGO_DAILY_PCT / 100) ** 730 - 1), 2)
  })

  it('sin días de atraso no hay recargo, pero sí el primer escalón de mora', () => {
    const r = computeCarDebt({ ...base, diasAtraso: 0 })
    expect(r.recargo).toBe(0)
    expect(r.multaMora).toBe(2_250) // 2,5% de 90.000
  })

  it('topea las multas por circular en cuatro por año, como el artículo 10', () => {
    const r = computeCarDebt({ ...base, multasPorCircular: 9 })
    expect(r.multasCirculacion).toBe(30_000) // 4 x 25% de 30.000, no 9
  })

  it('informa qué porcentaje del costo real es deuda', () => {
    const r = computeCarDebt(base)
    expect(r.deudaShare).toBeCloseTo((r.deudaTotal / r.costoReal) * 100, 2)
    expect(r.deudaShare).toBeGreaterThan(0)
    expect(r.deudaShare).toBeLessThan(100)
  })

  it('con todo en cero devuelve ceros y no NaN', () => {
    const r = computeCarDebt({
      askingPrice: 0,
      patenteAnual: 0,
      tributoAdeudado: 0,
      diasAtraso: 0,
      multasPendientes: 0,
      multasPorCircular: 0,
    })
    expect(r.deudaTotal).toBe(0)
    expect(r.costoReal).toBe(0)
    expect(r.deudaShare).toBe(0)
  })

  it('trata los negativos y los NaN de los campos de texto como cero', () => {
    const r = computeCarDebt({
      askingPrice: -5,
      patenteAnual: Number.NaN,
      tributoAdeudado: -100,
      diasAtraso: -30,
      multasPendientes: Number.NaN,
      multasPorCircular: -2,
    })
    expect(r.deudaTotal).toBe(0)
    expect(r.costoReal).toBe(0)
  })
})

describe('computeConvenio', () => {
  it('calcula la entrega inicial sobre el total dividido las cuotas MÁS UNA', () => {
    const plan = computeConvenio(370_000, 36)
    expect(plan.entregaInicial).toBeCloseTo(10_000, 2) // 370.000 / 37, no / 36
    expect(plan.saldo).toBeCloseTo(360_000, 2)
  })

  it('amortiza el saldo por sistema francés al interés del convenio', () => {
    const plan = computeConvenio(370_000, 36)
    const i = CONVENIO_MONTHLY_PCT / 100
    const esperada = (plan.saldo * i) / (1 - (1 + i) ** -36)
    expect(plan.cuotaMensual).toBeCloseTo(esperada, 2)
    expect(plan.totalPagado).toBeGreaterThan(370_000)
    expect(plan.costoFinanciero).toBeCloseTo(plan.totalPagado - 370_000, 2)
  })

  it('con interés cero reparte el saldo en partes iguales y no cuesta nada de más', () => {
    const plan = computeConvenio(370_000, 36, 0)
    expect(plan.cuotaMensual).toBeCloseTo(plan.saldo / 36, 2)
    expect(plan.costoFinanciero).toBeCloseTo(0, 2)
  })

  it('topea en 36 cuotas y no baja de una', () => {
    expect(computeConvenio(100_000, 99).cuotas).toBe(CONVENIO_MAX_CUOTAS)
    expect(computeConvenio(100_000, 0).cuotas).toBe(1)
    expect(computeConvenio(100_000, -4).cuotas).toBe(1)
  })

  it('a más cuotas, cuota más chica pero costo financiero mayor', () => {
    const corto = computeConvenio(370_000, 6)
    const largo = computeConvenio(370_000, 36)
    expect(largo.cuotaMensual).toBeLessThan(corto.cuotaMensual)
    expect(largo.costoFinanciero).toBeGreaterThan(corto.costoFinanciero)
  })

  it('con deuda cero no devuelve NaN', () => {
    const plan = computeConvenio(0, 12)
    expect(plan.entregaInicial).toBe(0)
    expect(plan.cuotaMensual).toBe(0)
    expect(plan.costoFinanciero).toBe(0)
  })
})

describe('contenido publicado', () => {
  it('cada etapa, veredicto y mito cita la norma o la fuente', () => {
    for (const stage of CAR_DEBT_STAGES) expect(stage.norm.length).toBeGreaterThan(0)
    for (const v of CAR_DEBT_VERDICTS) expect(v.norm.length).toBeGreaterThan(0)
    for (const m of CAR_DEBT_MYTHS) expect(m.norm.length).toBeGreaterThan(0)
  })

  it('marca el mito del peaje como «a medias», porque es deuda de peaje y no de patente', () => {
    const peaje = CAR_DEBT_MYTHS.find(m => /peaje/i.test(m.myth))
    expect(peaje).toBeDefined()
    expect(peaje!.verdict).toBe('a-medias')
    expect(peaje!.answer).toMatch(/Corporación Vial/)
  })

  it('confirma el de las cámaras, que es el que el hilo discutía sin fuente', () => {
    const camaras = CAR_DEBT_MYTHS.find(m => /cámaras/i.test(m.myth))
    expect(camaras).toBeDefined()
    expect(camaras!.verdict).toBe('cierto')
    expect(camaras!.norm).toMatch(/19\.824/)
  })

  it('desmiente que la deuda se caiga sola a los cinco años', () => {
    const presc = CAR_DEBT_MYTHS.find(m => /cinco años/i.test(m.myth))
    expect(presc).toBeDefined()
    expect(presc!.verdict).toBe('falso')
    expect(presc!.answer).toMatch(/acto administrativo/)
  })

  it('no afirma que la deuda de patente vaya al clearing', () => {
    const todo = [
      ...CAR_DEBT_FAQ.map(f => f.answer),
      ...CAR_DEBT_MYTHS.map(m => m.answer),
      ...CAR_DEBT_STAGES.map(s => s.detail),
      ...CAR_DEBT_VERDICTS.map(v => v.answer),
    ].join(' ')
    expect(todo).not.toMatch(/clearing/i)
  })

  it('no publica un importe en pesos del certificado, que no pudo verificarse', () => {
    const costo = CERTIFICADO_FACTS.find(f => /cuesta/i.test(f.label))
    expect(costo).toBeDefined()
    expect(costo!.detail).toMatch(/tres/)
    expect(costo!.detail).not.toMatch(/\$\s?\d/)
  })

  it('el certificado cubre los tres carriles que la consulta rápida no muestra', () => {
    const texto = CERTIFICADO_COVERS.join(' ')
    expect(texto).toMatch(/Policía Nacional de Tránsito/)
    expect(texto).toMatch(/Corporación Vial/)
    expect(texto).toMatch(/TODAS las intendencias/)
  })

  it('tiene contenido suficiente en cada bloque de la página', () => {
    expect(CAR_DEBT_VERDICTS.length).toBeGreaterThanOrEqual(4)
    expect(CAR_DEBT_STAGES.length).toBeGreaterThanOrEqual(5)
    expect(LISTING_TRAPS.length).toBeGreaterThanOrEqual(5)
    expect(BEFORE_BUYING_STEPS.length).toBeGreaterThanOrEqual(5)
    expect(CAR_DEBT_MYTHS.length).toBeGreaterThanOrEqual(5)
    expect(CAR_DEBT_FAQ.length).toBeGreaterThanOrEqual(6)
    expect(CAR_DEBT_SOURCES.length).toBeGreaterThanOrEqual(8)
  })

  it('todas las fuentes son URLs https', () => {
    for (const s of CAR_DEBT_SOURCES) {
      expect(s.url).toMatch(/^https:\/\//)
      expect(s.label.length).toBeGreaterThan(0)
    }
  })
})
