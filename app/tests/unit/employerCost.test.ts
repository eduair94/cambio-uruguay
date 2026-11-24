import { describe, expect, it } from 'vitest'
import {
  EMPLOYER_CESS,
  EMPLOYER_CESS_AGUINALDO_DISPLAY,
  EMPLOYER_CESS_AGUINALDO_PCT,
  EMPLOYER_CESS_TOTAL_DISPLAY,
  EMPLOYER_CESS_TOTAL_PCT,
  EMPLOYER_COST_EXAMPLES,
  EMPLOYER_COST_SOURCES,
  EMPLOYER_COST_VERIFIED_AT,
  EMPLOYER_NOT_INCLUDED,
  employerAnnualCost,
  employerMonthlyCost,
} from '../../utils/employerCost'
import { PAYROLL_UY } from '../../utils/payroll'

describe('las tasas patronales', () => {
  it('son las cuatro verificadas, con su tasa exacta', () => {
    expect(EMPLOYER_CESS.map(rate => [rate.id, rate.pct])).toEqual([
      ['jubilatorio', 7.5],
      ['fonasa', 5],
      ['frl', 0.1],
      ['garantia', 0.025],
    ])
  })

  it('suman 12,625 % sobre el nominal', () => {
    expect(EMPLOYER_CESS_TOTAL_PCT).toBe(12.625)
  })

  // La única asimetría de la cuenta: Decreto 2/008, art. 4. Si alguien marcara FONASA como
  // `onAguinaldo`, el aguinaldo pasaría a 12,625 % y este test lo frena.
  it('sobre el aguinaldo dejan FONASA afuera y suman 7,625 %', () => {
    expect(EMPLOYER_CESS_AGUINALDO_PCT).toBe(7.625)
    expect(EMPLOYER_CESS.find(rate => rate.id === 'fonasa')?.onAguinaldo).toBe(false)
  })

  /**
   * El texto que la página imprime tiene que ser el MISMO número que la página calcula. Es el único
   * modo de fallar que deja un `display` escrito a mano: alguien cambia una tasa y se olvida del
   * texto, y la tabla publica «0,10 %» en una fila que multiplica por otra cosa.
   */
  it('el texto de cada tasa dice el mismo número que su pct', () => {
    const parse = (text: string) => Number(text.replace(' %', '').replace(',', '.'))
    for (const rate of EMPLOYER_CESS) expect(parse(rate.display), rate.id).toBe(rate.pct)
    expect(parse(EMPLOYER_CESS_TOTAL_DISPLAY)).toBe(EMPLOYER_CESS_TOTAL_PCT)
    expect(parse(EMPLOYER_CESS_AGUINALDO_DISPLAY)).toBe(EMPLOYER_CESS_AGUINALDO_PCT)
  })

  it('cada tasa dice qué financia y el módulo trae sus fuentes', () => {
    for (const rate of EMPLOYER_CESS) {
      expect(rate.label.length, rate.id).toBeGreaterThan(0)
      expect(rate.what.length, rate.id).toBeGreaterThan(20)
    }
    expect(EMPLOYER_COST_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const source of EMPLOYER_COST_SOURCES) {
      expect(source.url, source.label).toMatch(/^https:\/\/(www\.)?(bps\.gub\.uy|impo\.com\.uy)\//)
    }
    expect(EMPLOYER_COST_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('el costo de un mes', () => {
  it('suma el nominal más las cuatro contribuciones', () => {
    const cost = employerMonthlyCost(100000)
    expect(cost.lines.map(line => line.amount)).toEqual([7500, 5000, 100, 25])
    expect(cost.cess).toBe(12625)
    expect(cost.total).toBe(112625)
    expect(cost.overNominalPct).toBe(12.625)
  })

  it('redondea a centésimos sin arrastrar el error del punto flotante', () => {
    const cost = employerMonthlyCost(37333)
    // 37.333 × 0,025 % = 9,33325 → 9,33, y el total no puede salir con tres decimales.
    expect(cost.lines[3]!.amount).toBe(9.33)
    expect(Number.isInteger(cost.cess * 100)).toBe(true)
    expect(Number.isInteger(cost.total * 100)).toBe(true)
  })

  it('un nominal que no es un número positivo da cero, no un negativo', () => {
    for (const input of [0, -50000, Number.NaN, Number.POSITIVE_INFINITY]) {
      const cost = employerMonthlyCost(input)
      expect(cost.total, String(input)).toBe(0)
      expect(cost.cess, String(input)).toBe(0)
      expect(cost.overNominalPct, String(input)).toBe(0)
    }
  })
})

describe('el costo de un año', () => {
  it('son doce meses más el aguinaldo con sus propios aportes', () => {
    const year = employerAnnualCost(100000)
    expect(year.salaries).toBe(1351500) // 112.625 × 12
    expect(year.aguinaldo).toBe(100000)
    expect(year.aguinaldoCess).toBe(7625) // 7,625 %, sin FONASA patronal
    expect(year.total).toBe(1459125)
  })

  /**
   * La lectura que la página publica: el año cuesta ~14,59 nominales, no 12. Es la cifra que hace
   * la diferencia con el sueldo que el lector tiene en la cabeza, y por eso se mide.
   */
  it('equivale a 14,59 nominales con un sueldo parejo', () => {
    expect(employerAnnualCost(100000).nominalesEquivalentes).toBe(14.59)
    expect(employerAnnualCost(30000).nominalesEquivalentes).toBe(14.59)
  })

  it('escala lineal: el doble de nominal es el doble de costo', () => {
    expect(employerAnnualCost(60000).total).toBe(employerAnnualCost(30000).total * 2)
  })

  it('un nominal no positivo no inventa un año', () => {
    const year = employerAnnualCost(0)
    expect(year.total).toBe(0)
    expect(year.nominalesEquivalentes).toBe(0)
  })
})

describe('lo que la página no afirma', () => {
  /**
   * El módulo no modela el tope de cotización y la página lo dice. Los ejemplos tienen que quedar
   * por debajo del tope que el sitio SÍ tiene verificado (para el aporte personal), porque arriba
   * de él la cuenta pasaría a depender de algo que no verificamos.
   */
  it('los ejemplos quedan por debajo del tope de cotización verificado', () => {
    expect(EMPLOYER_COST_EXAMPLES.length).toBeGreaterThanOrEqual(3)
    for (const nominal of EMPLOYER_COST_EXAMPLES) {
      expect(nominal, String(nominal)).toBeLessThan(PAYROLL_UY.jubilatorioTope)
      expect(nominal, String(nominal)).toBeGreaterThan(0)
    }
  })

  it('cada faltante del total dice por qué no lleva número', () => {
    expect(EMPLOYER_NOT_INCLUDED.length).toBeGreaterThanOrEqual(4)
    for (const item of EMPLOYER_NOT_INCLUDED) {
      expect(item.why.length, item.label).toBeGreaterThan(40)
      if (item.to) expect(item.to, item.label).toMatch(/^\//)
    }
  })

  // El seguro del BSE y el CCM son los dos que NO pueden volverse un porcentaje: si alguien les
  // pone una cifra, este test pide que salgan de la lista de faltantes a propósito.
  it('nombra el seguro del BSE y el Complemento de Cuota Mutual entre los faltantes', () => {
    const labels = EMPLOYER_NOT_INCLUDED.map(item => item.label.toLowerCase()).join(' | ')
    expect(labels).toContain('seguro de accidentes de trabajo')
    expect(labels).toContain('complemento de cuota mutual')
  })
})
