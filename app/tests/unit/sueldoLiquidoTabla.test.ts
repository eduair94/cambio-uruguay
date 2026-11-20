// app/tests/unit/sueldoLiquidoTabla.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { URUGUAY } from '../../utils/calculators'
import { SMN_VIGENTE } from '../../utils/lowWage'
import { LIQUIDO_SMN } from '../../utils/minimumWage'
import { computePayroll, PAYROLL_UY } from '../../utils/payroll'
import {
  fonasaTabla,
  nominalNecesarioRows,
  pesos,
  pctUy,
  SUELDO_TABLA_FAMILIA_NOMINALES,
  SUELDO_TABLA_LIQUIDOS,
  SUELDO_TABLA_NOMINALES,
  SUELDO_TABLA_SMN,
  SUELDO_TABLA_SOURCES,
  SUELDO_TABLA_VERIFIED_AT,
  sueldoFamiliaRows,
  sueldoLiquidoFaqExtra,
  sueldoLiquidoRows,
  sueldoLiquidoTextos,
  sueldoPasoAPaso,
  ultimoNominalSinIrpf,
} from '../../utils/sueldoLiquidoTabla'

const BPC = URUGUAY.bpc // 6.864 (2026)
const STEPS = [2.5 * BPC, 10 * BPC, 15 * BPC]

describe('formato', () => {
  it('coma decimal y espacio antes del %', () => {
    expect(pctUy(4.5)).toBe('4,5 %')
    expect(pctUy(15)).toBe('15 %')
    expect(pctUy(0.1)).toBe('0,1 %')
  })
  it('pesos enteros sin centavos, con centavos si los hay', () => {
    expect(pesos(12000)).toBe(formatUYU0(12000))
    expect(pesos(4483.2)).toContain('4.483,20')
  })
})

function formatUYU0(n: number) {
  return n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

describe('tabla de nominal a líquido', () => {
  const rows = sueldoLiquidoRows()

  it('cada fila es computePayroll del mismo nominal', () => {
    expect(rows.map(r => r.nominal)).toEqual([...SUELDO_TABLA_NOMINALES])
    for (const row of rows) {
      const r = computePayroll({ nominal: row.nominal })
      expect(row.aportes).toBe(r.aportes)
      expect(row.irpf).toBe(r.irpf.tax)
      expect(row.liquido).toBe(r.liquido)
    }
  })

  it('los nominales crecen, no llegan al tope jubilatorio y ninguno cae en un escalón', () => {
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.nominal).toBeGreaterThan(rows[i - 1]!.nominal)
    }
    for (const row of rows) {
      expect(row.nominal).toBeLessThan(PAYROLL_UY.jubilatorioTope)
      expect(STEPS).not.toContain(row.nominal)
    }
  })

  it('fija los valores publicados (BPC 6.864)', () => {
    const pin = (n: number) => rows.find(r => r.nominal === n)!
    expect(pin(25383)).toMatchObject({
      aportes: 4975.06,
      irpf: 0,
      liquido: 20407.94,
      quedaPct: 80.4,
    })
    expect(pin(30000).liquido).toBe(24120)
    expect(pin(35000).liquido).toBe(28140)
    expect(pin(40000).liquido).toBe(32160)
    expect(pin(45000).liquido).toBe(36180)
    expect(pin(50000)).toMatchObject({ aportes: 9800, irpf: 0, liquido: 40200, quedaPct: 80.4 })
    expect(pin(60000)).toMatchObject({ aportes: 11760, irpf: 0, liquido: 48240, quedaPct: 80.4 })
    expect(pin(70000)).toMatchObject({
      aportes: 13720,
      irpf: 972.4,
      liquido: 55307.6,
      quedaPct: 79,
    })
    expect(pin(80000)).toMatchObject({ aportes: 15680, irpf: 2288, liquido: 62032, quedaPct: 77.5 })
    expect(pin(90000)).toMatchObject({ irpf: 3603.6, liquido: 68756.4, quedaPct: 76.4 })
    expect(pin(100000)).toMatchObject({ irpf: 5192.8, liquido: 75207.2, quedaPct: 75.2 })
    expect(pin(120000)).toMatchObject({ irpf: 11143.2, liquido: 85336.8, quedaPct: 71.1 })
    expect(pin(150000)).toMatchObject({ irpf: 18304.8, liquido: 102295.2, quedaPct: 68.2 })
    expect(pin(200000)).toMatchObject({ irpf: 30301.6, liquido: 130498.4, quedaPct: 65.2 })
    expect(pin(250000)).toMatchObject({ irpf: 42767.6, liquido: 158232.4, quedaPct: 63.3 })
  })

  it('la primera fila es el salario mínimo vigente, y su líquido es el que publica el sitio', () => {
    expect(SUELDO_TABLA_SMN).toBe(SMN_VIGENTE)
    expect(rows[0]!.nominal).toBe(SUELDO_TABLA_SMN)
    expect(rows[0]!.esSalarioMinimo).toBe(true)
    expect(rows.filter(r => r.esSalarioMinimo)).toHaveLength(1)
    expect(Math.round(rows[0]!.liquido)).toBe(LIQUIDO_SMN)
  })
})

describe('el tramo sin IRPF', () => {
  it('el último nominal sin retención es $ 66.218 (sin hijos ni otras deducciones)', () => {
    const n = ultimoNominalSinIrpf()
    expect(n).toBe(66218)
    expect(computePayroll({ nominal: n }).irpf.tax).toBe(0)
    expect(computePayroll({ nominal: n + 1 }).irpf.tax).toBeGreaterThan(0)
  })

  it('del salario mínimo a ese nominal queda siempre el mismo porcentaje', () => {
    const tope = ultimoNominalSinIrpf()
    const pct = sueldoLiquidoRows()[0]!.quedaPct
    expect(pct).toBe(
      100 - PAYROLL_UY.jubilatorioRate - 4.5 - PAYROLL_UY.frlRate // 15 + 4,5 + 0,1
    )
    for (const row of sueldoLiquidoRows().filter(r => r.nominal <= tope)) {
      expect(row.irpf).toBe(0)
      expect(row.quedaPct).toBe(pct)
    }
  })
})

describe('tabla de líquido a nominal', () => {
  const rows = nominalNecesarioRows()

  it('cada nominal es el menor en pesos enteros que llega al líquido pedido', () => {
    expect(rows.map(r => r.liquido)).toEqual([...SUELDO_TABLA_LIQUIDOS])
    for (const row of rows) {
      expect(computePayroll({ nominal: row.nominal }).liquido).toBeGreaterThanOrEqual(row.liquido)
      expect(computePayroll({ nominal: row.nominal }).liquido - row.liquido).toBeLessThan(1)
      expect(computePayroll({ nominal: row.nominal - 1 }).liquido).toBeLessThan(row.liquido)
      for (const step of [...STEPS, 15 * BPC - 1]) {
        if (step < row.nominal) {
          expect(computePayroll({ nominal: step }).liquido).toBeLessThan(row.liquido)
        }
      }
    }
  })

  it('ningún nominal propuesto queda por debajo del salario mínimo nacional', () => {
    for (const row of rows) expect(row.nominal).toBeGreaterThanOrEqual(SUELDO_TABLA_SMN)
  })

  it('fija los valores publicados', () => {
    expect(rows.map(r => [r.liquido, r.nominal])).toEqual([
      [25000, 31095],
      [30000, 37314],
      [35000, 43533],
      [40000, 49752],
      [45000, 55971],
      [50000, 62190],
      [60000, 76979],
      [70000, 91850],
      [80000, 110560],
      [100000, 145940],
      [120000, 181321],
      [150000, 235159],
    ])
  })
})

describe('tabla con hijos o cónyuge a cargo', () => {
  const rows = sueldoFamiliaRows()

  it('cada columna es computePayroll con esa situación', () => {
    expect(rows.map(r => r.nominal)).toEqual([...SUELDO_TABLA_FAMILIA_NOMINALES])
    for (const row of rows) {
      expect(row.sinCargas).toBe(computePayroll({ nominal: row.nominal }).liquido)
      expect(row.unHijo).toBe(computePayroll({ nominal: row.nominal, hijos: 1 }).liquido)
      expect(row.dosHijos).toBe(computePayroll({ nominal: row.nominal, hijos: 2 }).liquido)
      expect(row.conyuge).toBe(
        computePayroll({ nominal: row.nominal, conyugeACargo: true }).liquido
      )
    }
  })

  it('fija los valores publicados', () => {
    expect(rows.map(r => [r.nominal, r.sinCargas, r.unHijo, r.dosHijos, r.conyuge])).toEqual([
      [50000, 40200, 39450, 39450, 39200],
      [80000, 62032, 62601.6, 63120, 60656],
      [120000, 85336.8, 84596, 85511.2, 83128.8],
    ])
  })

  it('lo que dice el texto: con un hijo se cobra menos a 50.000 y a 120.000, más a 80.000', () => {
    const at = (n: number) => rows.find(r => r.nominal === n)!
    expect(at(50000).unHijo).toBeLessThan(at(50000).sinCargas)
    expect(computePayroll({ nominal: 50000, hijos: 1 }).irpf.tax).toBe(0)
    expect(at(120000).unHijo).toBeLessThan(at(120000).sinCargas)
    expect(computePayroll({ nominal: 120000, hijos: 1 }).irpf.creditRate).toBe(8)
    expect(at(80000).unHijo).toBeGreaterThan(at(80000).sinCargas)
  })
})

describe('tasas de FONASA', () => {
  it('reproduce la tabla del BPS', () => {
    expect(fonasaTabla().map(r => [r.hasta, r.masDe])).toEqual([
      [3, 4.5],
      [3, 6],
      [5, 6.5],
      [5, 8],
    ])
  })
})

describe('la cuenta paso a paso ($ 80.000)', () => {
  it('cierra con los mismos números que la calculadora', () => {
    const p = sueldoPasoAPaso()
    // La página dice sin condición "como el nominal pasa 10 BPC" y "tus deducciones, que acá son
    // los aportes": las dos cosas tienen que seguir siendo ciertas para el ejemplo.
    expect(p.r.irpf.incrementApplied).toBe(true)
    expect(p.r.irpf.deductionsMonthly).toBe(p.r.aportes)
    expect(p.r.jubilatorio.amount).toBe(12000)
    expect(p.r.fonasa.amount).toBe(3600)
    expect(p.r.frl.amount).toBe(80)
    expect(p.r.irpf.computable).toBe(84800)
    expect(p.r.irpf.grossTax).toBe(4483.2)
    expect(p.r.irpf.credit).toBe(2195.2)
    expect(p.r.irpf.tax).toBe(2288)
    expect(p.r.liquido).toBe(62032)
    expect(p.franjas.map(f => [f.from, f.to, f.rate, f.tax])).toEqual([
      [48048, 68640, 10, 2059.2],
      [68640, 84800, 15, 2424],
    ])
    const sum = p.franjas.reduce((s, f) => s + f.tax, 0)
    expect(sum).toBeCloseTo(p.r.irpf.grossTax, 2)
  })
})

describe('los textos', () => {
  const t = sueldoLiquidoTextos(2026)

  it('el resumen lleva los números de las filas', () => {
    expect(t.intro).toContain(pesos(SUELDO_TABLA_SMN))
    expect(t.intro).toContain(pesos(66218))
    expect(t.intro).toContain('80,4 %')
    expect(t.intro).toContain('4,5 %')
    expect(t.intro).toContain(pesos(62032))
    expect(t.intro).toContain(pesos(75207))
    expect(t.supuestos).toContain('2026')
    expect(t.supuestos).toContain('sin otras deducciones')
  })

  it('el párrafo de hijos dice la deducción mensual del BPS (Comunicado R 5/2026: 11.440)', () => {
    expect(t.familia).toContain(pesos(11440))
    expect(t.familia).toContain('6 %')
    // La suba a 6 % es sólo por encima de 2,5 BPC (BPS, Tasas FONASA): hasta ahí queda en 3 %.
    expect(t.familia).toContain(`más de 2,5 BPC (${pesos(2.5 * BPC)})`)
    expect(t.familiaComparacion).toContain(pesos(50000))
    expect(t.familiaComparacion).toContain(pesos(120000))
    expect(t.familiaComparacion).toContain(pesos(15 * BPC))
  })

  it('el cierre del paso a paso es el de $ 50.000', () => {
    expect(t.pasoCierre).toContain(pesos(9800))
    expect(t.pasoCierre).toContain('195,20')
    expect(t.pasoCierre).toContain(pesos(1372))
    expect(t.pasoCierre).toContain(pesos(40200))
  })
})

describe('preguntas frecuentes nuevas', () => {
  const faq = sueldoLiquidoFaqExtra(2026)

  it('responden con las cifras de las tablas', () => {
    const all = faq.map(f => f.q + ' ' + f.a).join('\n')
    expect(faq).toHaveLength(4)
    expect(all).toContain(pesos(40200))
    expect(all).toContain(pesos(SUELDO_TABLA_SMN))
    expect(all).toContain(pesos(20408))
    expect(all).toContain(pesos(48240))
    expect(all).toContain(pesos(62032))
    expect(all).toContain(pesos(75207))
    expect(all).toContain(pesos(48048))
    expect(all).toContain(pesos(66219))
  })
})

describe('fuentes', () => {
  it('son primarias y tienen fecha de lectura', () => {
    expect(SUELDO_TABLA_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const s of SUELDO_TABLA_SOURCES) {
      expect(new URL(s.url).host).toMatch(/(^|\.)(bps\.gub\.uy|impo\.com\.uy|gub\.uy)$/)
    }
  })
})

describe('la página', () => {
  const page = readFileSync(
    resolve(__dirname, '../../pages/herramientas/calculadora-sueldo-liquido.vue'),
    'utf8'
  )
  const shell = readFileSync(resolve(__dirname, '../../components/ToolShell.vue'), 'utf8')

  it('dibuja las tablas con las funciones del módulo, debajo de la calculadora', () => {
    expect(page).toMatch(/sueldoLiquidoRows\(/)
    expect(page).toMatch(/nominalNecesarioRows\(/)
    expect(page).toMatch(/sueldoFamiliaRows\(/)
    expect(page).toMatch(/content-layout="below"/)
    expect(page).toMatch(/<template #content>/)
    expect(page).toMatch(/<template #disclaimer>/)
  })

  it('no usa slots que ToolShell no dibuja ni agrega anuncios', () => {
    expect(page).not.toMatch(/<template #notes>/)
    expect(page).not.toMatch(/<AdSlot/)
    const declared = new Set(
      [...shell.matchAll(/<slot(?: name="([\w-]+)")?/g)].map(m => m[1] ?? 'default')
    )
    // Los hijos directos de <ToolShell> van indentados cuatro espacios.
    const used = [...page.matchAll(/^ {4}<template #([\w-]+)>/gm)].map(m => m[1])
    expect(used.length).toBeGreaterThan(0)
    for (const name of used) expect(declared, `slot #${name}`).toContain(name)
  })

  it('suma las preguntas nuevas y las fuentes del módulo', () => {
    expect(page).toMatch(/sueldoLiquidoFaqExtra\(/)
    expect(page).toMatch(/SUELDO_TABLA_SOURCES/)
  })
})
