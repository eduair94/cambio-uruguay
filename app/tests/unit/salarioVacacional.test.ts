import { describe, expect, it } from 'vitest'

import { URUGUAY } from '../../utils/calculators'
import { computePayroll } from '../../utils/payroll'
import {
  JORNAL_DIVISOR_MENSUAL,
  LICENCIA_BASE_DIAS,
  LICENCIA_ESCALONES,
  SALARIO_VACACIONAL_COMPONENTES,
  SALARIO_VACACIONAL_FAQ,
  SALARIO_VACACIONAL_HITOS,
  SALARIO_VACACIONAL_REGIMENES,
  SALARIO_VACACIONAL_SOURCES,
  SALARIO_VACACIONAL_VERIFIED_AT,
  diasDeLicencia,
  jornalLiquidoDeVacaciones,
  salarioVacacionalMinimo,
  simularSalarioVacacional,
} from '../../utils/salarioVacacional'

describe('diasDeLicencia', () => {
  it('da el mínimo legal de 20 días a quien no llegó a los cinco años', () => {
    for (const anios of [0, 1, 3, 4]) expect(diasDeLicencia(anios)).toBe(LICENCIA_BASE_DIAS)
  })

  // La escala que publica el MTSS (Régimen de licencia, leído el 2026-09-22): «al quinto año de
  // trabajo se genera un día… al octavo año, el trabajador generó dos días; a los doce años, tres
  // días». Hasta el 2026-09-22 el sitio publicaba 5/9/13/17: ese error es lo que fija este test.
  it('sigue la escala del MTSS: un día a los 5 años, dos a los 8, tres a los 12', () => {
    expect(diasDeLicencia(5)).toBe(21)
    expect(diasDeLicencia(7)).toBe(21)
    expect(diasDeLicencia(8)).toBe(22)
    expect(diasDeLicencia(9)).toBe(22)
    expect(diasDeLicencia(11)).toBe(22)
    expect(diasDeLicencia(12)).toBe(23)
    expect(diasDeLicencia(16)).toBe(24)
    expect(diasDeLicencia(20)).toBe(25)
  })

  it('ya no publica la escala vieja de 5/9/13/17', () => {
    expect(diasDeLicencia(9)).not.toBe(23)
    expect(diasDeLicencia(13)).not.toBe(24)
  })

  it('no tiene tope: la escala sigue creciendo con la antigüedad', () => {
    expect(diasDeLicencia(40)).toBe(30)
    expect(diasDeLicencia(100)).toBeGreaterThan(diasDeLicencia(40))
  })

  it('nunca devuelve menos que el mínimo legal ante entradas basura', () => {
    for (const anios of [-1, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(diasDeLicencia(anios)).toBeGreaterThanOrEqual(LICENCIA_BASE_DIAS)
    }
  })

  it('trunca los años fraccionarios: el día se gana al cumplir, no antes', () => {
    expect(diasDeLicencia(4.9)).toBe(LICENCIA_BASE_DIAS)
    expect(diasDeLicencia(5.9)).toBe(21)
    expect(diasDeLicencia(7.9)).toBe(21)
  })
})

describe('LICENCIA_ESCALONES', () => {
  it('deriva cada fila de la función, sin números escritos a mano', () => {
    for (const escalon of LICENCIA_ESCALONES) {
      expect(escalon.dias).toBe(diasDeLicencia(escalon.desdeAnios))
    }
  })

  it('publica los escalones del MTSS (0, 5, 8, 12, 16, 20 años)', () => {
    expect(LICENCIA_ESCALONES.map(e => e.desdeAnios)).toEqual([0, 5, 8, 12, 16, 20])
  })

  it('empieza en el mínimo legal y crece de a un día', () => {
    expect(LICENCIA_ESCALONES[0]?.dias).toBe(LICENCIA_BASE_DIAS)
    for (let i = 1; i < LICENCIA_ESCALONES.length; i++) {
      expect(LICENCIA_ESCALONES[i]!.dias).toBe(LICENCIA_ESCALONES[i - 1]!.dias + 1)
      expect(LICENCIA_ESCALONES[i]!.desdeAnios).toBeGreaterThan(
        LICENCIA_ESCALONES[i - 1]!.desdeAnios
      )
    }
  })
})

describe('jornalLiquidoDeVacaciones', () => {
  it('resta los descuentos al jornal nominal (Decreto 615/989, art. 3)', () => {
    expect(jornalLiquidoDeVacaciones(1000, 250)).toBe(750)
  })

  it('no baja de cero aunque los descuentos superen al nominal', () => {
    expect(jornalLiquidoDeVacaciones(1000, 4000)).toBe(0)
  })

  it('trata las entradas no numéricas como cero', () => {
    expect(jornalLiquidoDeVacaciones(Number.NaN, 100)).toBe(0)
    expect(jornalLiquidoDeVacaciones(1000, Number.NaN)).toBe(1000)
  })
})

describe('salarioVacacionalMinimo', () => {
  it('es el 100 % del jornal líquido por cada día gozado (Ley 16.101, arts. 4 y 5)', () => {
    expect(salarioVacacionalMinimo(750, 20)).toBe(15000)
  })

  it('acompaña al fraccionamiento: dos tramos suman lo mismo que la licencia entera', () => {
    const entera = salarioVacacionalMinimo(750, 20)
    expect(salarioVacacionalMinimo(750, 10) + salarioVacacionalMinimo(750, 10)).toBe(entera)
  })

  it('devuelve cero sin días gozados o sin jornal', () => {
    expect(salarioVacacionalMinimo(750, 0)).toBe(0)
    expect(salarioVacacionalMinimo(0, 20)).toBe(0)
    expect(salarioVacacionalMinimo(-750, 20)).toBe(0)
  })
})

describe('simularSalarioVacacional — caso de referencia: $80.000 nominal, sin dependientes, 20 días', () => {
  const r = simularSalarioVacacional({ sueldoNominal: 80000, diasDeLicencia: 20 })

  it('toma los aportes personales del mes de payroll.ts (15 % + 4,5 % + 0,1 % = $15.680)', () => {
    expect(r.jubilatorio).toBe(12000)
    expect(r.fonasaRate).toBe(4.5)
    expect(r.fonasa).toBe(3600)
    expect(r.frl).toBe(80)
    expect(r.aportes).toBe(15680)
  })

  it('aplica la fórmula del MTSS para un mensual: (sueldo − descuentos) ÷ 30 × días', () => {
    expect(r.jornalNominal).toBe(round2(80000 / JORNAL_DIVISOR_MENSUAL))
    expect(r.descuentosAplicados).toBe(15680)
    expect(r.jornalLiquido).toBe(round2((80000 - 15680) / 30))
    expect(r.salarioVacacional).toBe(round2(r.jornalLiquido * 20))
    expect(r.salarioVacacional).toBe(42880)
  })

  it('por defecto NO resta el IRPF del mes al jornal líquido (es una hipótesis, no norma)', () => {
    expect(r.restarIrpf).toBe(false)
    expect(r.irpfRetenidoMes).toBeGreaterThan(0)
    expect(r.descuentosAplicados).toBe(r.aportes)
  })

  it('estima el IRPF sobre la suma a la tasa marginal máxima del sueldo (11,7 BPC → 15 %)', () => {
    expect(80000 / URUGUAY.bpc).toBeGreaterThan(10)
    expect(80000 / URUGUAY.bpc).toBeLessThan(15)
    expect(r.tasaMarginalMaxima).toBe(15)
    expect(r.irpfSobreSalarioVacacional).toBe(round2(42880 * 0.15))
    expect(r.neto).toBe(round2(42880 - r.irpfSobreSalarioVacacional))
  })

  it('el salario vacacional siempre queda por debajo del sueldo nominal de los mismos días', () => {
    expect(r.salarioVacacional).toBeLessThan(r.jornalNominal * 20)
  })
})

describe('simularSalarioVacacional — bordes', () => {
  it('con la hipótesis de restar el IRPF del mes, el jornal líquido baja exactamente en IRPF ÷ 30', () => {
    const base = simularSalarioVacacional({ sueldoNominal: 80000, diasDeLicencia: 20 })
    const hip = simularSalarioVacacional({
      sueldoNominal: 80000,
      diasDeLicencia: 20,
      restarIrpf: true,
    })
    expect(hip.restarIrpf).toBe(true)
    expect(hip.descuentosAplicados).toBe(round2(base.aportes + base.irpfRetenidoMes))
    expect(hip.jornalLiquido).toBeLessThan(base.jornalLiquido)
    expect(hip.jornalLiquido).toBe(round2((80000 - hip.descuentosAplicados) / 30))
  })

  it('un sueldo por debajo de 7 BPC no paga IRPF: la tasa proporcional sobre la suma es cero', () => {
    const r = simularSalarioVacacional({ sueldoNominal: 40000, diasDeLicencia: 20 })
    expect(40000).toBeLessThan(7 * URUGUAY.bpc)
    expect(r.irpfRetenidoMes).toBe(0)
    expect(r.tasaMarginalMaxima).toBe(0)
    expect(r.irpfSobreSalarioVacacional).toBe(0)
    expect(r.neto).toBe(r.salarioVacacional)
  })

  it('es proporcional a los días: dos tramos de 10 suman lo mismo que 20', () => {
    const entera = simularSalarioVacacional({ sueldoNominal: 80000, diasDeLicencia: 20 })
    const tramo = simularSalarioVacacional({ sueldoNominal: 80000, diasDeLicencia: 10 })
    expect(round2(tramo.salarioVacacional * 2)).toBe(entera.salarioVacacional)
  })

  it('la situación familiar mueve la tasa de FONASA igual que en la calculadora de sueldo', () => {
    const solo = simularSalarioVacacional({ sueldoNominal: 80000, diasDeLicencia: 20 })
    const familia = simularSalarioVacacional({
      sueldoNominal: 80000,
      diasDeLicencia: 20,
      hijos: 1,
      conyugeACargo: true,
    })
    expect(familia.fonasaRate).toBe(8)
    expect(familia.fonasa).toBe(
      computePayroll({ nominal: 80000, hijos: 1, conyugeACargo: true }).fonasa.amount
    )
    expect(familia.salarioVacacional).toBeLessThan(solo.salarioVacacional)
  })

  it('entradas basura dan cero, nunca negativo ni NaN', () => {
    for (const sueldo of [-1000, Number.NaN, Number.NEGATIVE_INFINITY]) {
      const r = simularSalarioVacacional({ sueldoNominal: sueldo, diasDeLicencia: 20 })
      expect(r.salarioVacacional).toBe(0)
      expect(r.neto).toBe(0)
    }
    const sinDias = simularSalarioVacacional({ sueldoNominal: 80000, diasDeLicencia: Number.NaN })
    expect(sinDias.salarioVacacional).toBe(0)
  })
})

describe('el contenido citable', () => {
  it('se contrastó en la fecha que la página imprime', () => {
    expect(SALARIO_VACACIONAL_VERIFIED_AT).toBe('2026-09-22')
  })

  it('cada hito dice qué norma lo fija', () => {
    expect(SALARIO_VACACIONAL_HITOS).toHaveLength(3)
    for (const hito of SALARIO_VACACIONAL_HITOS) {
      expect(hito.source.length).toBeGreaterThan(0)
      expect(hito.when.length).toBeGreaterThan(0)
    }
  })

  it('el plazo de pago es el día anterior al inicio de la licencia', () => {
    const suma = SALARIO_VACACIONAL_HITOS.find(h => h.id === 'suma')!
    expect(suma.detail).toMatch(/día anterior al inicio de la licencia/i)
  })

  it('no repite preguntas en el FAQ (Google colapsa duplicados)', () => {
    const questions = SALARIO_VACACIONAL_FAQ.map(f => f.question)
    expect(new Set(questions).size).toBe(questions.length)
    expect(questions.length).toBeGreaterThanOrEqual(3)
  })

  it('el FAQ publica la escala correcta y ya no la vieja', () => {
    const dias = SALARIO_VACACIONAL_FAQ.find(f => /cuántos días de licencia/i.test(f.question))!
    expect(dias.answer).toMatch(/dos al octavo/i)
    expect(dias.answer).toMatch(/tres a los doce/i)
    expect(dias.answer).not.toMatch(/nueve años/i)
  })

  it('el FAQ separa aportes (no) de IRPF (sí) y nombra al IRP derogado', () => {
    const text = SALARIO_VACACIONAL_FAQ.map(f => f.answer).join(' ')
    expect(text).toMatch(/libre de todo gravamen fiscal o social/i)
    expect(text).toMatch(/tasa marginal máxima/i)
    expect(text).toMatch(/Ley 18\.083/)
  })

  it('cada régimen de remuneración y cada componente cita su norma', () => {
    expect(SALARIO_VACACIONAL_REGIMENES.map(r => r.id)).toEqual([
      'mensual',
      'jornalero',
      'variable',
      'mixto',
    ])
    for (const r of SALARIO_VACACIONAL_REGIMENES) expect(r.source.length).toBeGreaterThan(0)
    for (const c of SALARIO_VACACIONAL_COMPONENTES) expect(c.source.length).toBeGreaterThan(0)
    const ids = SALARIO_VACACIONAL_COMPONENTES.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('dice que el salario vacacional no integra el aguinaldo (Decreto 49/000)', () => {
    const c = SALARIO_VACACIONAL_COMPONENTES.find(c => c.id === 'aguinaldo')!
    expect(c.regla).toBe('no-entra')
    expect(c.source).toMatch(/49\/000/)
  })

  it('toda fuente es un organismo oficial uruguayo', () => {
    const allowed = ['impo.com.uy', 'gub.uy']
    expect(SALARIO_VACACIONAL_SOURCES.length).toBeGreaterThanOrEqual(10)
    for (const source of SALARIO_VACACIONAL_SOURCES) {
      expect(source.url.startsWith('https://')).toBe(true)
      expect(allowed.some(host => source.url.includes(host))).toBe(true)
    }
    const urls = SALARIO_VACACIONAL_SOURCES.map(s => s.url)
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos/148-2007')
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/18083-2006')
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos/49-2000')
  })

  it('escribe setiembre, nunca septiembre', () => {
    const text = JSON.stringify({
      SALARIO_VACACIONAL_FAQ,
      SALARIO_VACACIONAL_HITOS,
      SALARIO_VACACIONAL_SOURCES,
      SALARIO_VACACIONAL_COMPONENTES,
      SALARIO_VACACIONAL_REGIMENES,
    })
    expect(text).not.toMatch(/septiembre/i)
  })
})

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
