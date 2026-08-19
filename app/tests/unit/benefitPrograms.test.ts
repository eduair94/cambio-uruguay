import { describe, expect, it } from 'vitest'
import {
  BENEFIT_CATEGORIES,
  BENEFIT_CATEGORY_ICONS,
  BENEFIT_PROGRAMS,
  BENEFIT_PROGRAMS_LAST_REVIEWED,
  BENEFIT_SOURCES,
  activeCategories,
  freePrograms,
  getBenefitProgram,
  measurablePrograms,
  opaquePrograms,
  programsByCategory,
  yearlyReturn,
} from '../../utils/benefitPrograms'

describe('catálogo de programas de beneficios', () => {
  it('tiene ids únicos y la copy mínima en cada ficha', () => {
    const ids = BENEFIT_PROGRAMS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(BENEFIT_PROGRAMS.length).toBeGreaterThan(5)

    for (const p of BENEFIT_PROGRAMS) {
      expect(p.id, `${p.name} con id no kebab-case`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(p.name.trim()).not.toBe('')
      expect(p.operator.trim()).not.toBe('')
      expect(p.tagline.trim().length).toBeGreaterThan(30)
      expect(p.how.trim().length).toBeGreaterThan(40)
      expect(p.join.trim().length).toBeGreaterThan(20)
      expect(p.worksAt.length).toBeGreaterThan(0)
      expect(p.channels.length).toBeGreaterThan(0)
      expect(p.facts.length).toBeGreaterThan(1)
      expect(BENEFIT_CATEGORIES[p.category]).toBeTruthy()
    }
  })

  it('nunca recomienda un programa sin decir la contra', () => {
    // Un club con cuota y permanencia listado solo por sus ventajas es un aviso,
    // no una comparativa. Las contras son parte del dato, no un agregado.
    for (const p of BENEFIT_PROGRAMS) {
      expect(p.caveats.length, `${p.id} sin caveats`).toBeGreaterThan(0)
      for (const c of p.caveats) expect(c.trim().length).toBeGreaterThan(30)
    }
  })

  it('etiqueta cada dato duro con su origen', () => {
    const allowed = ['oficial', 'prensa', 'tienda', 'autodeclarado', 'calculado']
    for (const p of BENEFIT_PROGRAMS) {
      for (const fact of p.facts) {
        expect(allowed, `${p.id}: origen desconocido`).toContain(fact.source)
        expect(fact.label.trim()).not.toBe('')
        expect(fact.value.trim().length).toBeGreaterThan(3)
      }
    }
  })

  it('solo publica un retorno cuando explica de dónde sale', () => {
    // El riesgo real de esta página: un porcentaje inventado que alguien use para
    // decidir dónde hace el súper. Un retorno sin cuenta a la vista no se publica.
    for (const p of BENEFIT_PROGRAMS) {
      expect(p.returnNote.trim().length, `${p.id} sin returnNote`).toBeGreaterThan(60)
      if (typeof p.returnPct === 'number') {
        expect(p.returnPct).toBeGreaterThan(0)
        expect(p.returnPct).toBeLessThan(20)
        // La nota tiene que mostrar la aritmética, no solo afirmar el número.
        expect(p.returnNote.toLowerCase()).toContain('calculado')
        const calculated = p.facts.filter(f => f.source === 'calculado')
        expect(
          calculated.length,
          `${p.id} publica retorno sin marcarlo como cuenta propia`
        ).toBeGreaterThan(0)
      } else {
        expect(p.returnNote.toLowerCase()).toMatch(/no calculable|no es un programa de puntos/)
      }
    }
  })

  it('el retorno declarado cierra con la tasa y el valor del punto de las bases', () => {
    // Tienda Inglesa es el único caso medible hoy: 15 puntos cada $ 900 y 1 punto = $ 1.
    const ti = getBenefitProgram('tienda-inglesa-puntos')
    expect(ti).toBeDefined()
    expect(ti!.returnPct).toBeCloseTo((15 / 900) * 100, 2)
  })

  it('marca como no verificado lo que no se pudo leer en fuente primaria', () => {
    const unverified = BENEFIT_PROGRAMS.filter(p => !p.verified).map(p => p.id)
    // No es una lista blanca de excusas: si un programa pasa a estar verificado,
    // este test obliga a actualizarla en el mismo commit.
    expect(unverified.sort()).toEqual(['farmacard', 'pedidosya-plus', 'tarjeta-mas'])
    for (const id of unverified) {
      const program = getBenefitProgram(id)!
      const admits = program.caveats.some(c =>
        /no (?:pudimos|encontramos)|no publica|cambian/i.test(c)
      )
      expect(admits, `${id} no verificado pero no lo dice en ningún caveat`).toBe(true)
    }
  })

  it('distingue gratis de gratis-si-pagás-otra-cosa', () => {
    for (const p of BENEFIT_PROGRAMS) {
      if (p.cost.kind === 'gratis') continue
      expect(p.cost.detail.trim().length, `${p.id} sin detalle de costo`).toBeGreaterThan(10)
    }
    // Club El País regala la tarjeta pero exige suscripción: no puede figurar como gratis.
    expect(getBenefitProgram('club-el-pais')!.cost.kind).toBe('atado')
    expect(freePrograms().map(p => p.id)).not.toContain('club-el-pais')
  })

  it('usa https en todos los enlaces', () => {
    const urls = BENEFIT_PROGRAMS.flatMap(p =>
      [p.siteUrl, p.rulesUrl, p.androidUrl, p.iosUrl].filter(Boolean)
    ).concat(BENEFIT_SOURCES.map(s => s.url))
    for (const url of urls) expect(url).toMatch(/^https:\/\//)
  })

  it('lleva fecha de revisión y fuentes con editor', () => {
    expect(BENEFIT_PROGRAMS_LAST_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(BENEFIT_SOURCES.length).toBeGreaterThan(5)
    for (const s of BENEFIT_SOURCES) {
      expect(s.label.trim()).not.toBe('')
      expect(s.publisher.trim()).not.toBe('')
    }
  })

  it('tiene icono para cada categoría usada', () => {
    for (const category of activeCategories()) {
      expect(BENEFIT_CATEGORY_ICONS[category]).toMatch(/^mdi-/)
      expect(programsByCategory(category).length).toBeGreaterThan(0)
    }
  })
})

describe('helpers', () => {
  it('separa medibles de opacos sin perder ni duplicar programas', () => {
    const measurable = measurablePrograms()
    const opaque = opaquePrograms()
    expect(measurable.length + opaque.length).toBe(BENEFIT_PROGRAMS.length)
    expect(measurable.every(p => typeof p.returnPct === 'number')).toBe(true)
    expect(opaque.every(p => typeof p.returnPct !== 'number')).toBe(true)
  })

  it('ordena los medibles de mayor a menor retorno', () => {
    const pcts = measurablePrograms().map(p => p.returnPct as number)
    expect([...pcts].sort((a, b) => b - a)).toEqual(pcts)
  })

  it('calcula el retorno anual y devuelve null cuando no hay con qué', () => {
    const ti = getBenefitProgram('tienda-inglesa-puntos')!
    // $ 10.000 por mes al 1,67 % = $ 2.004 al año.
    expect(yearlyReturn(ti, 10000)).toBeCloseTo(2004, 0)
    expect(yearlyReturn(ti, 0)).toBe(0)
    expect(yearlyReturn(ti, Number.NaN)).toBe(0)
    expect(yearlyReturn(getBenefitProgram('tata-plus')!, 10000)).toBeNull()
  })

  it('no inventa un programa que no existe', () => {
    expect(getBenefitProgram('no-existe')).toBeUndefined()
  })
})
