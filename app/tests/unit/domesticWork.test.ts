import { describe, expect, it } from 'vitest'

import {
  DOMESTIC_CATEGORIES,
  DOMESTIC_CATEGORIES_SINCE,
  DOMESTIC_LOWER_TASKS_QUOTE,
  DOMESTIC_MAIN_TASK_QUOTE,
  DOMESTIC_WAGE_WINDOW,
  DOMESTIC_WORK_DUTIES,
  DOMESTIC_WORK_FAQ,
  DOMESTIC_WORK_RULES,
  DOMESTIC_WORK_SOURCES,
  DOMESTIC_WORK_VERIFIED_AT,
  categoriaPorHoras,
  categoriaPorId,
  pisoSemanalPorHoras,
} from '../../utils/domesticWork'

describe('categoriaPorHoras', () => {
  // La regla de BPS: principal es la tarea que ocupa «el 50 % más una hora de la jornada».
  // Es la que la gente aplica mal, porque supone que cocinar todos los días ya sube de categoría.
  it('deja en general una jornada donde cocinar no llega a la mitad más una hora', () => {
    // 44 horas: el umbral son 23. Cocina 20 no alcanza.
    expect(categoriaPorHoras({ general: 24, cocina: 20, cuidados: 0 })).toBe('general')
  })

  it('pasa a cocina cuando cocinar ocupa la mitad más una hora exacta', () => {
    expect(categoriaPorHoras({ general: 21, cocina: 23, cuidados: 0 })).toBe('cocina')
  })

  it('pasa a cuidados cuando cuidar es la tarea mayoritaria', () => {
    expect(categoriaPorHoras({ general: 10, cocina: 4, cuidados: 30 })).toBe('cuidados')
  })

  it('una jornada repartida sin tarea mayoritaria queda en general', () => {
    // Ninguna llega a 23 de 44: es el caso frecuente, y BPS asigna general por defecto.
    expect(categoriaPorHoras({ general: 15, cocina: 15, cuidados: 14 })).toBe('general')
  })

  it('con cuidado secundario de hasta el 50 % sigue siendo general', () => {
    // El comunicado lo dice explícito: cuidado o cocina «hasta el 50 % del tiempo trabajado»
    // quedan comprendidos en la categoría general.
    expect(categoriaPorHoras({ general: 22, cocina: 0, cuidados: 22 })).toBe('general')
  })

  it('no explota con una jornada vacía', () => {
    expect(categoriaPorHoras({ general: 0, cocina: 0, cuidados: 0 })).toBe('general')
  })
})

describe('pisoSemanalPorHoras', () => {
  it('multiplica el valor hora publicado de la categoría', () => {
    expect(pisoSemanalPorHoras('general', 20)).toBe(169 * 20)
    expect(pisoSemanalPorHoras('cuidados', 10)).toBe(184 * 10)
  })

  it('devuelve cero para horas no válidas en lugar de inventar un piso', () => {
    expect(pisoSemanalPorHoras('general', 0)).toBe(0)
    expect(pisoSemanalPorHoras('general', -5)).toBe(0)
    expect(pisoSemanalPorHoras('general', Number.NaN)).toBe(0)
  })
})

describe('el catálogo de categorías', () => {
  it('tiene las tres categorías creadas en julio de 2026', () => {
    expect(DOMESTIC_CATEGORIES.map(c => c.id)).toEqual(['general', 'cocina', 'cuidados'])
    expect(DOMESTIC_CATEGORIES_SINCE).toBe('2026-07-01')
  })

  it('ordena los mínimos de menor a mayor, como el laudo', () => {
    const mensuales = DOMESTIC_CATEGORIES.map(c => c.minimoMensual)
    expect(mensuales).toEqual([...mensuales].sort((a, b) => a - b))
    const horas = DOMESTIC_CATEGORIES.map(c => c.minimoHora)
    expect(horas).toEqual([...horas].sort((a, b) => a - b))
  })

  it('publica los montos vigentes de julio, no la base del comunicado de creación', () => {
    // La trampa que este test existe para cerrar: el Comunicado 12/2026 trae la tabla «al
    // 30/6/2026» (General $ 31.178), que es la base con la que se crearon las categorías. Lo que
    // se paga en la ventana publicada es el valor de julio.
    expect(categoriaPorId('general').minimoMensual).toBe(32051)
    expect(categoriaPorId('cocina').minimoMensual).toBe(33796)
    expect(categoriaPorId('cuidados').minimoMensual).toBe(34885)
    expect(categoriaPorId('general').minimoMensual).not.toBe(31178)
    expect(categoriaPorId('cocina').minimoMensual).not.toBe(32875)
    expect(categoriaPorId('cuidados').minimoMensual).not.toBe(33935)
  })

  it('cada monto viaja con su ventana de vigencia', () => {
    expect(DOMESTIC_WAGE_WINDOW.desde).toBe('2026-07-01')
    expect(DOMESTIC_WAGE_WINDOW.hasta).toBe('2026-12-31')
  })

  it('cada categoría dice qué comprende', () => {
    for (const c of DOMESTIC_CATEGORIES) {
      expect(c.nombre.length).toBeGreaterThan(0)
      expect(c.comprende.length).toBeGreaterThan(40)
      expect(c.minimoMensual).toBeGreaterThan(0)
      expect(c.minimoHora).toBeGreaterThan(0)
    }
  })

  it('categoriaPorId falla ruidosamente ante una categoría inventada', () => {
    // @ts-expect-error probamos justamente el id que el tipo no permite
    expect(() => categoriaPorId('jardineria')).toThrow()
  })
})

describe('las reglas de la ley propia del sector', () => {
  it('cita el artículo de cada regla', () => {
    expect(DOMESTIC_WORK_RULES.length).toBeGreaterThanOrEqual(10)
    for (const r of DOMESTIC_WORK_RULES) {
      expect(r.source).toMatch(/art\./)
      expect(r.detail.length).toBeGreaterThan(40)
    }
  })

  it('publica los noventa días del despido y no el año de la ley de 1958', () => {
    const despido = DOMESTIC_WORK_RULES.find(r => r.key === 'despido')
    expect(despido).toBeDefined()
    expect(despido!.source).toContain('18.065')
    expect(`${despido!.label} ${despido!.detail}`).toMatch(/noventa días/)
  })

  it('no repite claves de regla', () => {
    const keys = DOMESTIC_WORK_RULES.map(r => r.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('mantiene la jornada de 8 y 44 horas', () => {
    const jornada = DOMESTIC_WORK_RULES.find(r => r.key === 'jornada')
    expect(jornada!.detail).toMatch(/ocho horas/)
    expect(jornada!.detail).toMatch(/cuarenta y cuatro/)
  })
})

describe('obligaciones y FAQ', () => {
  it('lista las obligaciones operativas sin repetir claves', () => {
    const keys = DOMESTIC_WORK_DUTIES.map(d => d.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(DOMESTIC_WORK_DUTIES.length).toBeGreaterThanOrEqual(5)
  })

  it('no repite preguntas en el FAQ', () => {
    const qs = DOMESTIC_WORK_FAQ.map(f => f.question)
    expect(new Set(qs).size).toBe(qs.length)
    expect(DOMESTIC_WORK_FAQ.length).toBeGreaterThanOrEqual(6)
  })

  it('cada respuesta del FAQ dice algo, no sólo remite', () => {
    for (const f of DOMESTIC_WORK_FAQ) {
      expect(f.answer.length).toBeGreaterThan(80)
    }
  })

  it('conserva las dos citas textuales de BPS que evitan el error de categoría', () => {
    expect(DOMESTIC_MAIN_TASK_QUOTE).toMatch(/50 % más una hora/)
    expect(DOMESTIC_LOWER_TASKS_QUOTE).toMatch(/menor remuneración/)
  })
})

describe('fuentes', () => {
  it('sólo enlaza normativa y organismos oficiales uruguayos', () => {
    // La regla del sitio: ninguna cifra legal sin fuente primaria. Y nada de prensa.
    expect(DOMESTIC_WORK_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const s of DOMESTIC_WORK_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/(www\.)?(impo\.com\.uy|gub\.uy|bps\.gub\.uy)\//)
      expect(s.label.length).toBeGreaterThan(20)
    }
  })

  it('incluye la ley del sector y el comunicado que creó las categorías', () => {
    const urls = DOMESTIC_WORK_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('18065-2006')
    expect(urls).toContain('bps.gub.uy')
  })

  it('declara la fecha en que se verificó', () => {
    expect(DOMESTIC_WORK_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('no publica el salario vacacional, que no se pudo verificar sin ambigüedad', () => {
    // Decisión deliberada, como la del laudo en guidesReddit: el MTSS lo enuncia de una forma que
    // no se pudo leer con certeza, así que la página enlaza el régimen general en lugar de
    // inventar un porcentaje.
    const texto = [
      ...DOMESTIC_WORK_DUTIES.map(d => `${d.label} ${d.detail}`),
      ...DOMESTIC_WORK_FAQ.map(f => `${f.question} ${f.answer}`),
      ...DOMESTIC_WORK_RULES.map(r => `${r.label} ${r.detail}`),
    ]
      .join(' ')
      .toLowerCase()
    expect(texto).not.toMatch(/salario vacacional (es|equivale|de un)/)
    expect(texto).not.toMatch(/100 % del jornal/)
  })
})
