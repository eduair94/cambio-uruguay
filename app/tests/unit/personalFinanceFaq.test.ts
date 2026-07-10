import { describe, expect, it } from 'vitest'
import {
  PERSONAL_FAQS,
  FAQ_CATEGORIES,
  FAQ_CATEGORY_ICONS,
  faqsByCategory,
  getFaq,
  faqHaystack,
} from '../../utils/personalFinanceFaq'

describe('personal-economy FAQ catalogue', () => {
  it('has an icon for every category', () => {
    for (const c of Object.keys(FAQ_CATEGORIES)) {
      expect(FAQ_CATEGORY_ICONS[c as keyof typeof FAQ_CATEGORY_ICONS].startsWith('mdi-')).toBe(true)
    }
  })

  it('has unique ids and substantive answers', () => {
    const ids = PERSONAL_FAQS.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const f of PERSONAL_FAQS) {
      expect(f.question.trim().length).toBeGreaterThan(8)
      expect(f.shortAnswer.trim().length).toBeGreaterThan(8)
      expect(f.answer.trim().length).toBeGreaterThan(40)
      expect(Object.keys(FAQ_CATEGORIES)).toContain(f.category)
    }
  })

  it('groups every FAQ into a known category', () => {
    const grouped = faqsByCategory()
    const count = grouped.reduce((n, g) => n + g.items.length, 0)
    expect(count).toBe(PERSONAL_FAQS.length)
    for (const g of grouped) expect(g.items.length).toBeGreaterThan(0)
  })

  it('resolves by id and builds an accent-insensitive haystack', () => {
    if (PERSONAL_FAQS.length) {
      const f = PERSONAL_FAQS[0]!
      expect(getFaq(f.id)).toBeDefined()
      const hay = faqHaystack(f)
      expect(hay).toBe(hay.toLowerCase())
    }
    expect(getFaq('definitely-not-real')).toBeUndefined()
    expect(
      faqHaystack({
        id: 'x',
        question: '¿Cómo ahorrar en dólares?',
        shortAnswer: 'a',
        answer: 'b',
        category: 'ahorro_inversion',
      })
    ).toContain('como ahorrar en dolares')
  })
})
