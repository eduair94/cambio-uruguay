import { describe, expect, it } from 'vitest'

import {
  HEALTH_CARD_ASSE_COST_UR,
  HEALTH_CARD_CONSULTATION_WINDOW_MONTHS,
  HEALTH_CARD_FAQS,
  HEALTH_CARD_MAX_VALIDITY_MONTHS,
  HEALTH_CARD_PROVISIONAL_VALIDITY_MONTHS,
  HEALTH_CARD_RELATED,
  HEALTH_CARD_REQUIREMENTS,
  HEALTH_CARD_RULES,
  HEALTH_CARD_SOURCES,
  HEALTH_CARD_VERIFIED_AT,
  healthCardCostInPesos,
} from '../../utils/healthCard'

describe('fuentes', () => {
  it('apunta cada fuente a un publicador oficial uruguayo', () => {
    expect(HEALTH_CARD_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const source of HEALTH_CARD_SOURCES) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.url).toMatch(/impo\.com\.uy|gub\.uy/)
      expect(source.label.trim().length).toBeGreaterThan(20)
      expect(source.publisher.trim()).not.toBe('')
    }
  })

  it('tiene fecha de contraste en forma ISO', () => {
    expect(HEALTH_CARD_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(HEALTH_CARD_VERIFIED_AT))).toBe(false)
  })

  // Toda la página es una afirmación sobre una obligación legal. Una regla cuyo
  // índice de fuente no existe es una afirmación que nadie puede comprobar.
  it('respalda cada regla con una fuente que existe y con su artículo', () => {
    expect(HEALTH_CARD_RULES.length).toBeGreaterThanOrEqual(4)
    for (const rule of HEALTH_CARD_RULES) {
      expect(HEALTH_CARD_SOURCES[rule.sourceIndex]).toBeDefined()
      expect(rule.article.trim()).not.toBe('')
      expect(rule.quote.trim().length).toBeGreaterThan(20)
    }
  })

  it('cita el decreto y la cartilla por su nombre en los artículos', () => {
    const articles = HEALTH_CARD_RULES.map(rule => rule.article).join(' | ')
    expect(articles).toMatch(/Decreto 274\/017/)
    expect(articles).toMatch(/Cartilla de Derechos/)
  })
})

describe('las cifras del régimen', () => {
  it('mantiene los plazos que fija el decreto', () => {
    expect(HEALTH_CARD_MAX_VALIDITY_MONTHS).toBe(24)
    expect(HEALTH_CARD_PROVISIONAL_VALIDITY_MONTHS).toBe(6)
    expect(HEALTH_CARD_CONSULTATION_WINDOW_MONTHS).toBe(12)
  })

  it('guarda el costo de ASSE en UR y no en pesos', () => {
    // En pesos sería un número vencido el mes que viene: el INE actualiza la UR
    // todos los meses y la fuente publica la tasa en unidades, no en moneda.
    expect(HEALTH_CARD_ASSE_COST_UR).toBe(0.4)
  })
})

describe('healthCardCostInPesos', () => {
  it('convierte con el valor de la UR del día', () => {
    expect(healthCardCostInPesos(1921.36)).toBeCloseTo(768.544, 3)
    expect(healthCardCostInPesos(2000)).toBe(800)
  })

  // Devolver null y no un aproximado es lo que impide que la página publique un
  // importe inventado cuando la API de indicadores no contesta.
  it('devuelve null en vez de un importe inventado cuando la UR no sirve', () => {
    expect(healthCardCostInPesos(null)).toBeNull()
    expect(healthCardCostInPesos(undefined)).toBeNull()
    expect(healthCardCostInPesos(0)).toBeNull()
    expect(healthCardCostInPesos(-5)).toBeNull()
    expect(healthCardCostInPesos(Number.NaN)).toBeNull()
    expect(healthCardCostInPesos(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('requisitos y preguntas', () => {
  it('lista los requisitos de ASSE sin entradas vacías', () => {
    expect(HEALTH_CARD_REQUIREMENTS.length).toBeGreaterThanOrEqual(5)
    for (const req of HEALTH_CARD_REQUIREMENTS) expect(req.item.trim()).not.toBe('')
  })

  it('contesta la consulta de costo y la de vigencia, que son las que traen la visita', () => {
    const questions = HEALTH_CARD_FAQS.map(faq => faq.q.toLowerCase()).join(' | ')
    expect(questions).toMatch(/cu[áa]nto sale/)
    expect(questions).toMatch(/cu[áa]nto tiempo dura|vigencia/)
    for (const faq of HEALTH_CARD_FAQS) expect(faq.a.trim().length).toBeGreaterThan(40)
  })

  // La página no puede publicar un precio de consultorio privado: no hay fuente
  // oficial que lo fije. Este test es el que impide que alguien lo agregue.
  it('no publica ningún importe en pesos para el carné', () => {
    const prose = [
      ...HEALTH_CARD_FAQS.flatMap(faq => [faq.q, faq.a]),
      ...HEALTH_CARD_RULES.flatMap(rule => [rule.headline, rule.detail, rule.quote]),
      ...HEALTH_CARD_REQUIREMENTS.flatMap(req => [req.item, req.note]),
    ].join(' ')
    expect(prose).not.toMatch(/\$\s?\d/)
    expect(prose).not.toMatch(/\b\d[\d.]*\s*pesos\b/i)
  })
})

describe('enlaces relacionados', () => {
  it('apunta a rutas internas absolutas del propio sitio', () => {
    expect(HEALTH_CARD_RELATED.length).toBeGreaterThanOrEqual(3)
    for (const link of HEALTH_CARD_RELATED) {
      expect(link.to.startsWith('/')).toBe(true)
      expect(link.to).not.toMatch(/^https?:/)
      expect(link.label.trim()).not.toBe('')
    }
  })
})
