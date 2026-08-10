import { describe, expect, it } from 'vitest'

import {
  MEANS_OF_LIVING_RULE,
  MERCOSUR_COUNTRIES,
  RESIDENCY_FAQ,
  RESIDENCY_FEE_EXEMPT,
  RESIDENCY_FEE_UI,
  RESIDENCY_KINDS,
  RESIDENCY_NOT_THE_SAME,
  RESIDENCY_PATHS,
  RESIDENCY_SOURCES,
  RESIDENCY_WHERE,
} from '../../utils/residency'

const path = (id: string) => RESIDENCY_PATHS.find(p => p.id === id)!

describe('las dos residencias que no son la misma', () => {
  it('separa la legal de la fiscal, con su organismo', () => {
    expect(RESIDENCY_KINDS).toHaveLength(2)
    const legal = RESIDENCY_KINDS.find(k => k.id === 'legal')!
    const fiscal = RESIDENCY_KINDS.find(k => k.id === 'fiscal')!
    expect(legal.organism).toMatch(/Migraci[oó]n/i)
    expect(fiscal.organism).toMatch(/DGI/)
  })

  it('manda la parte fiscal a la página que ya la desarrolla', () => {
    const fiscal = RESIDENCY_KINDS.find(k => k.id === 'fiscal')!
    expect(fiscal.to).toBe('/impuestos-inversiones-uruguay')
  })

  it('lo dice explícito y citable', () => {
    expect(RESIDENCY_NOT_THE_SAME).toMatch(/dos cosas distintas/i)
    expect(RESIDENCY_NOT_THE_SAME).toMatch(/sin tener residencia legal/i)
  })
})

describe('el dato que corrige la creencia más extendida', () => {
  // Publicar un umbral inventado sería exactamente lo que la gente ya hace en los hilos.
  it('dice que NO hay monto mínimo publicado', () => {
    expect(MEANS_OF_LIVING_RULE).toMatch(/no hay un monto m[ií]nimo/i)
    expect(MEANS_OF_LIVING_RULE).toMatch(/medios de vida/i)
  })

  it('no publica ninguna cifra de ingreso exigido', () => {
    const faq = RESIDENCY_FAQ.find(f => /ingreso tengo que demostrar/i.test(f.question))!
    expect(faq.answer).toMatch(/no publica un umbral|no hay un monto/i)
    // Ni un importe en dólares o pesos disfrazado de requisito.
    expect(faq.answer).not.toMatch(/US\$\s?\d|\$\s?\d{3,}/)
  })
})

describe('vías de residencia', () => {
  it('cubre las tres vías', () => {
    expect(RESIDENCY_PATHS).toHaveLength(3)
    expect(RESIDENCY_PATHS.map(p => p.id)).toContain('mercosur-temporaria')
    expect(RESIDENCY_PATHS.map(p => p.id)).toContain('no-mercosur-permanente')
  })

  it('la temporaria MERCOSUR declara su duración y la permanente no', () => {
    expect(path('mercosur-temporaria').duration).toMatch(/2 años/)
    expect(path('mercosur-permanente').duration).toBeNull()
  })

  // La diferencia práctica entre las vías: medios de vida y carné de salud sólo en no-MERCOSUR.
  it('sólo la vía no MERCOSUR exige medios de vida y carné de salud', () => {
    const noMerco = path('no-mercosur-permanente').requirements.join(' ')
    const merco = path('mercosur-temporaria').requirements.join(' ')
    expect(noMerco).toMatch(/medios de vida/i)
    expect(noMerco).toMatch(/carn[eé] de salud/i)
    expect(merco).not.toMatch(/medios de vida/i)
  })

  it('todas piden antecedentes penales apostillados', () => {
    for (const p of RESIDENCY_PATHS) {
      const all = p.requirements.join(' ')
      if (p.id === 'mercosur-permanente') continue // se apoya en la base de la temporaria
      expect(all).toMatch(/antecedentes penales/i)
      expect(all).toMatch(/apostillad/i)
    }
  })

  it('los once países MERCOSUR y asociados están listados', () => {
    expect(MERCOSUR_COUNTRIES).toHaveLength(11)
    for (const c of ['Argentina', 'Brasil', 'Venezuela', 'Guyana']) {
      expect(MERCOSUR_COUNTRIES).toContain(c)
    }
  })
})

describe('costo y lugar', () => {
  it('el costo está en UI, no en pesos', () => {
    expect(RESIDENCY_FEE_UI).toBeCloseTo(557.3, 1)
    const faq = RESIDENCY_FAQ.find(f => /cu[aá]nto sale/i.test(f.question))!
    expect(faq.answer).toMatch(/Unidades Indexadas/i)
    expect(faq.answer).toMatch(/cambia con el valor/i)
  })

  it('declara las exenciones', () => {
    expect(RESIDENCY_FEE_EXEMPT).toContain('Brasil')
    expect(RESIDENCY_FEE_EXEMPT).toContain('Paraguay')
  })

  // Mucha gente lo intenta desde afuera y pierde el viaje.
  it('aclara que el trámite se completa en Uruguay', () => {
    expect(RESIDENCY_WHERE).toMatch(/se hace en Uruguay/i)
    expect(RESIDENCY_WHERE).toMatch(/presencial/i)
  })
})

describe('integridad', () => {
  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(RESIDENCY_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of RESIDENCY_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })

  it('toda fuente es oficial', () => {
    expect(RESIDENCY_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of RESIDENCY_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/([\w.]+\.)?(gub\.uy|minterior\.gub\.uy)/)
    }
  })
})
