// Accidente de trabajo: el artículo 9 y todo lo que cuelga de él.
//
// La página salió de un hilo de r/LegalUruguay donde a un pistero una baranda sin amortiguación le
// amputó parcialmente un dedo, y la empresa mandó a decir que "lo vieron nervioso arriba del
// camión". La respuesta entera está en un artículo que casi nadie conoce, y estos tests existen para
// que la cita no se degrade a una paráfrasis: es lo único que hace verificable la afirmación.
import { describe, expect, it } from 'vitest'
import {
  ACCIDENT_FACTS,
  ACCIDENT_MYTHS,
  ACCIDENT_STEPS,
  WORK_ACCIDENT_REVIEWED,
  keepsCompensation,
} from '../../utils/workAccident'

describe('workAccident - la culpa no decide', () => {
  it('la regla del artículo 9, como función', () => {
    // Sólo el dolo cierra la puerta. Todo lo demás —incluida la culpa grave— la deja abierta.
    expect(keepsCompensation('culpa_leve')).toBe(true)
    expect(keepsCompensation('culpa_grave')).toBe(true)
    expect(keepsCompensation('caso_fortuito')).toBe(true)
    expect(keepsCompensation('fuerza_mayor')).toBe(true)
    expect(keepsCompensation('dolo')).toBe(false)
  })

  it('el hecho central cita el texto de la ley, no lo parafrasea', () => {
    const culpa = ACCIDENT_FACTS.find(f => f.id === 'culpa')
    expect(culpa, 'falta el hecho que sostiene toda la página').toBeDefined()
    expect(culpa!.norm).toContain('artículo 9')
    expect(culpa!.quote).toContain('culpa leve o grave')
    expect(culpa!.quote).toContain('dolosamente')
  })

  it('explica qué significa "dolosamente", que es donde se pierde todo el mundo', () => {
    const culpa = ACCIDENT_FACTS.find(f => f.id === 'culpa')!
    expect(culpa.meaning.toLowerCase()).toContain('a propósito')
  })
})

describe('workAccident - los plazos y los montos', () => {
  it('la denuncia patronal trae sus dos plazos', () => {
    const d = ACCIDENT_FACTS.find(f => f.id === 'denuncia')!
    expect(d.meaning).toContain('72 horas')
    expect(d.meaning).toContain('5 días hábiles')
    // Y que la cobertura no depende de que la empresa haga el trámite: es lo accionable.
    expect(d.meaning.toLowerCase()).toContain('no depende')
  })

  it('la indemnización temporaria dice fracción y desde cuándo', () => {
    const t = ACCIDENT_FACTS.find(f => f.id === 'temporaria')!
    expect(t.meaning).toContain('2/3')
    expect(t.meaning.toLowerCase()).toContain('cuarto día')
  })

  it('estar en negro no deja sin cobertura, pero cambia la base de cálculo', () => {
    // Las dos mitades son del mismo artículo, y publicar sólo la buena sería un error caro.
    const n = ACCIDENT_FACTS.find(f => f.id === 'sin-seguro')!
    expect(n.meaning.toLowerCase()).toContain('no te deja sin cobertura')
    expect(n.meaning.toLowerCase()).toContain('salario mínimo nacional')
  })

  it('cada hecho nombra su artículo y su fuente', () => {
    for (const f of ACCIDENT_FACTS) {
      expect(f.norm, f.id).toContain('16.074')
      expect(f.source.url, f.id).toMatch(/^https:\/\//)
      expect(f.meaning.length, f.id).toBeGreaterThan(60)
    }
  })
})

describe('workAccident - qué hacer', () => {
  it('empieza por atenderse en el BSE, que es lo que deja el accidente registrado', () => {
    expect(ACCIDENT_STEPS[0]!.step.toLowerCase()).toContain('bse')
  })

  it('termina derivando a un abogado cuando la secuela es permanente', () => {
    // El límite de lo que una página puede contestar. No decirlo sería el error contrario al de
    // mandar a "consultar un profesional" para todo.
    const last = ACCIDENT_STEPS.at(-1)!
    expect(`${last.step} ${last.detail}`.toLowerCase()).toContain('abogado')
  })

  it('no le pide al accidentado que pelee: le pide que registre', () => {
    const all = ACCIDENT_STEPS.map(s => s.detail)
      .join(' ')
      .toLowerCase()
    expect(all).toContain('fotos')
    expect(all).toContain('testigos')
  })
})

describe('workAccident - los mitos', () => {
  it('desarma el que originó la página', () => {
    const m = ACCIDENT_MYTHS.find(x => x.myth.toLowerCase().includes('descuido'))
    expect(m).toBeDefined()
    expect(m!.norm).toContain('art. 9')
  })

  it('cada mito trae la realidad y, cuando aplica, el artículo', () => {
    for (const m of ACCIDENT_MYTHS) {
      expect(m.reality.length, m.myth).toBeGreaterThan(40)
    }
    expect(ACCIDENT_MYTHS.filter(m => m.norm).length).toBe(ACCIDENT_MYTHS.length)
  })

  it('lleva fecha de verificación', () => {
    expect(WORK_ACCIDENT_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
