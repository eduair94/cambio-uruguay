import { describe, expect, it } from 'vitest'
import {
  FAQ_CATEGORIES,
  FAQ_CATEGORY_ICONS,
  PERSONAL_FAQS,
  PERSONAL_FAQ_SOURCES,
  faqHaystack,
  faqsByCategory,
  getFaq,
} from '../../utils/personalFinanceFaq'
import { TOPIC_DEFS } from '../../utils/redditTopics'

describe('personal-economy FAQ catalogue', () => {
  it('covers every non-customs Reddit topic exactly once, plus fundamentals', () => {
    const categoryIds = FAQ_CATEGORIES.map(category => category.id)
    const expected = [
      'fundamentos',
      ...TOPIC_DEFS.filter(topic => topic.id !== 'compras-import').map(topic => topic.id),
    ]

    expect(new Set(categoryIds).size).toBe(categoryIds.length)
    expect([...categoryIds].sort()).toEqual([...expected].sort())

    for (const category of FAQ_CATEGORIES) {
      expect(FAQ_CATEGORY_ICONS[category.id].startsWith('mdi-')).toBe(true)
      expect(category.label.trim().length).toBeGreaterThan(2)
      expect(category.description.trim().length).toBeGreaterThan(20)
    }
  })

  it('has unique, sourced and substantive answers', () => {
    const ids = PERSONAL_FAQS.map(faq => faq.id)
    const categoryIds = new Set(FAQ_CATEGORIES.map(category => category.id))

    expect(PERSONAL_FAQS.length).toBeGreaterThanOrEqual(90)
    expect(new Set(ids).size).toBe(ids.length)
    for (const faq of PERSONAL_FAQS) {
      expect(faq.question.trim().length).toBeGreaterThan(8)
      expect(faq.shortAnswer.trim().length).toBeGreaterThan(8)
      expect(faq.answer.trim().length).toBeGreaterThan(40)
      expect(categoryIds.has(faq.category)).toBe(true)
      expect(faq.sourceIds.length).toBeGreaterThan(0)
      expect(faq.tags.length).toBeGreaterThan(0)
      for (const sourceId of faq.sourceIds) {
        expect(PERSONAL_FAQ_SOURCES[sourceId], `${faq.id}: ${sourceId}`).toBeDefined()
      }
      for (const related of faq.related ?? []) {
        expect(related.to.startsWith('/')).toBe(true)
      }
    }
  })

  it('groups every FAQ into a populated category', () => {
    const grouped = faqsByCategory()
    const count = grouped.reduce((total, group) => total + group.items.length, 0)

    expect(count).toBe(PERSONAL_FAQS.length)
    expect(grouped).toHaveLength(FAQ_CATEGORIES.length)
    for (const group of grouped) expect(group.items.length).toBeGreaterThanOrEqual(4)
  })

  it('only cites named HTTPS primary or official sources', () => {
    expect(Object.keys(PERSONAL_FAQ_SOURCES).length).toBeGreaterThanOrEqual(50)
    for (const source of Object.values(PERSONAL_FAQ_SOURCES)) {
      expect(source.label.trim().length).toBeGreaterThan(5)
      expect(source.authority.trim().length).toBeGreaterThan(2)
      expect(source.url.startsWith('https://')).toBe(true)
      expect(['norma', 'fuente-oficial', 'estadistica']).toContain(source.kind)
    }
  })

  it('resolves by id and builds an accent-insensitive haystack', () => {
    const faq = PERSONAL_FAQS[0]!
    expect(getFaq(faq.id)).toBeDefined()
    expect(faqHaystack(faq)).toBe(faqHaystack(faq).toLowerCase())
    expect(getFaq('definitely-not-real')).toBeUndefined()
    expect(
      faqHaystack({
        id: 'x',
        question: '¿Cómo ahorrar en dólares?',
        shortAnswer: 'a',
        answer: 'b',
        category: 'ahorro-inversion',
        sourceIds: ['bcu-presupuesto'],
        basis: 'criterio',
        tags: [],
      })
    ).toContain('como ahorrar en dolares')
  })

  it('pins the high-risk facts that replaced common outdated answers', () => {
    expect(getFaq('salario-minimo-2026')?.shortAnswer).toMatch(/1\.º de julio de 2026.+25\.383/)
    expect(getFaq('clearing-despues-pagar')?.shortAnswer).toMatch(
      /cinco días hábiles.+tres días hábiles/
    )
    expect(getFaq('central-riesgos-despues-pagar')?.answer).toMatch(
      /actualiza mensualmente.+historial crediticio/
    )
    expect(getFaq('cripto-regulada-uruguay-2026')?.answer).toMatch(
      /22 de julio de 2026.+ninguna licencia promete rentabilidad/
    )
    expect(getFaq('impuestos-cripto-uruguay')?.basis).toBe('zona-gris')
    expect(getFaq('reclamo-o-denuncia-consumidor')?.shortAnswer).toMatch(
      /reclamo.+mediación.+denuncia.+sanción.+no una compensación/
    )
    expect(getFaq('bancarrota-personal-uruguay')?.answer).toMatch(
      /persona física que realiza actividad empresaria.+concurso civil/
    )
    expect(getFaq('consulta-laboral-gratuita-mtss')?.answer).toMatch(
      /no tiene costo.+no es vinculante/
    )
  })
})
