import { describe, expect, it } from 'vitest'
import { getGuide } from '../../utils/guides'
import {
  HILA_CHECKS,
  HILA_DECISION,
  HILA_DISCLOSURE_EVERY_YEARS,
  HILA_FAQ,
  HILA_FIRST_DISCLOSURE,
  HILA_OBSERVATION_YEARS,
  HILA_RECOGNITION_BIRTH_CUTOFF,
  HILA_RETIREMENT_AGE,
  HILA_RETIREMENT_MONTHS_AHEAD,
  HILA_SOURCES,
  HILA_START,
  HILA_VIAS,
  type HilaVia,
} from '../../utils/historiaLaboral'

const SLUG = 'historia-laboral-bps-uruguay'

describe('las constantes salen de la fuente y no de una cuenta', () => {
  it('fija la frontera de abril de 1996', () => {
    expect(HILA_START).toBe('1996-04-01')
  })

  it('fija la primera puesta de manifiesto del Decreto 228/023', () => {
    expect(HILA_FIRST_DISCLOSURE).toBe('2027-12-31')
    expect(HILA_DISCLOSURE_EVERY_YEARS).toBe(3)
  })

  it('fija el plazo de un año del artículo 90', () => {
    expect(HILA_OBSERVATION_YEARS).toBe(1)
  })

  it('fija el corte de nacimiento y la edad de la excepción jubilatoria', () => {
    expect(HILA_RECOGNITION_BIRTH_CUTOFF).toBe('1968-06-01')
    expect(HILA_RETIREMENT_AGE).toBe(60)
    expect(HILA_RETIREMENT_MONTHS_AHEAD).toBe(6)
  })

  it('la primera puesta de manifiesto todavía no pasó', () => {
    // Si esto se pone rojo es porque el 31/12/2027 quedó atrás: la guía tiene que dejar de decir
    // «el reloj todavía no arrancó» y empezar a contar el año del artículo 90.
    expect(HILA_FIRST_DISCLOSURE > new Date().toISOString().slice(0, 10)).toBe(true)
  })
})

describe('la tabla de por dónde se reclama', () => {
  it('cubre las cuatro vías y ninguna fila apunta a una que no existe', () => {
    const vias = new Set<HilaVia>(HILA_DECISION.map(row => row.via))
    expect([...vias].sort()).toEqual(['consultenos', 'denuncia', 'jubilacion', 'reconocimiento'])
    for (const row of HILA_DECISION) {
      expect(HILA_VIAS[row.via]?.via).toBe(row.via)
      expect(row.periodo.trim().length).toBeGreaterThan(0)
      expect(row.condicion.trim().length).toBeGreaterThan(0)
    }
  })

  it('parte las filas por la frontera de abril de 1996 y cierra con el caso general', () => {
    expect(HILA_DECISION[0]?.via).toBe('reconocimiento')
    expect(HILA_DECISION[0]?.periodo).toContain('1996')
    expect(HILA_DECISION.at(-1)?.via).toBe('denuncia')
    expect(HILA_DECISION.at(-1)?.condicion).toMatch(/cualquier otro/i)
  })

  it('las dos excepciones que pueden darse juntas están las dos declaradas', () => {
    // Es el motivo por el que esto es una tabla y no una función: el corte de nacimiento y la
    // cercanía a los 60 se superponen en el tiempo y el BPS no publica cuál manda.
    const posteriores = HILA_DECISION.filter(row => row.periodo.includes('Desde'))
    expect(posteriores.some(row => row.via === 'reconocimiento')).toBe(true)
    expect(posteriores.some(row => row.via === 'jubilacion')).toBe(true)
  })

  it('cada vía cita una página oficial del BPS', () => {
    for (const info of Object.values(HILA_VIAS)) {
      expect(info.url).toMatch(/^https:\/\/www\.bps\.gub\.uy\//)
      expect(info.tramite.trim().length).toBeGreaterThan(0)
      expect(info.que.trim().length).toBeGreaterThan(0)
      expect(info.porque.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('el contenido que la guía publica', () => {
  it('las fuentes son todas oficiales y no se repiten', () => {
    expect(HILA_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const source of HILA_SOURCES) {
      expect(source.label.trim().length).toBeGreaterThan(0)
      expect(source.url).toMatch(/^https:\/\/(www\.bps\.gub\.uy|www\.impo\.com\.uy)\//)
    }
    const urls = HILA_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('cita los tres artículos de la ley y el decreto que sostienen el plazo', () => {
    const urls = HILA_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('/leyes/16713-1995/87')
    expect(urls).toContain('/leyes/16713-1995/89')
    expect(urls).toContain('/leyes/16713-1995/90')
    expect(urls).toContain('/decretos/228-2023')
  })

  it('las preguntas no se repiten y todas tienen respuesta', () => {
    expect(HILA_FAQ.length).toBeGreaterThanOrEqual(6)
    const questions = HILA_FAQ.map(f => f.question)
    expect(new Set(questions).size).toBe(questions.length)
    for (const item of HILA_FAQ) {
      expect(item.question.trim().endsWith('?')).toBe(true)
      expect(item.answer.trim().length).toBeGreaterThan(40)
    }
  })

  it('no publica ningún importe: el BPS no publica el costo de estos trámites', () => {
    const texto = [
      ...HILA_FAQ.flatMap(f => [f.question, f.answer]),
      ...HILA_CHECKS.flatMap(c => [c.title, c.body]),
      ...Object.values(HILA_VIAS).flatMap(v => [v.que, v.porque]),
    ].join(' ')
    // Ni pesos ni dólares ni unidades indexadas: la única cifra que esta guía puede afirmar es una
    // fecha o un plazo, y eso ya lo fijan las constantes con su test.
    expect(texto).not.toMatch(/\$|USD|U\$S|unidades? indexadas?|UI\b|UR\b/)
  })

  it('lo que hay que revisar es más que «si el período figura»', () => {
    expect(HILA_CHECKS.length).toBeGreaterThanOrEqual(3)
    for (const check of HILA_CHECKS) {
      expect(check.title.trim().length).toBeGreaterThan(0)
      expect(check.body.trim().length).toBeGreaterThan(20)
    }
  })
})

describe('la guía que compone este catálogo', () => {
  const guide = getGuide(SLUG)

  it('existe y usa el catálogo en vez de repetir sus cifras', () => {
    expect(guide).toBeDefined()
    const cuerpo = (guide?.sections ?? []).map(s => s.body).join(' ')
    // Las dos fechas que sostienen la guía tienen que aparecer formateadas desde las constantes.
    expect(cuerpo).toContain('31 de diciembre de 2027')
    expect(cuerpo).toContain('1.º de abril de 1996')
  })

  it('publica la tabla de decisión con una fila por caso declarado', () => {
    const tabla = (guide?.sections ?? []).map(s => s.table).find(Boolean)
    expect(tabla?.rows.length).toBe(HILA_DECISION.length)
    for (const row of HILA_DECISION) {
      expect(tabla?.rows.some(cells => cells.includes(HILA_VIAS[row.via].tramite))).toBe(true)
    }
  })

  it('arrastra las fuentes del catálogo tal cual', () => {
    expect((guide?.sources ?? []).map(s => s.url)).toEqual(HILA_SOURCES.map(s => s.url))
  })

  it('arrastra las preguntas del catálogo tal cual', () => {
    expect((guide?.faqs ?? []).map(f => f.q)).toEqual(HILA_FAQ.map(f => f.question))
  })
})
