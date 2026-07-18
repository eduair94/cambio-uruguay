import { describe, expect, it } from 'vitest'
import {
  RENT_FAQ,
  RENT_FAQ_CATEGORIES,
  rentFaqByCategory,
  type RentFaqCategoryId,
} from '../../utils/rentFaq'

const CAT_IDS = new Set<RentFaqCategoryId>(RENT_FAQ_CATEGORIES.map(c => c.id))

describe('rentFaq - data integrity', () => {
  it('has a solid, comprehensive set of entries', () => {
    expect(RENT_FAQ.length).toBeGreaterThanOrEqual(35)
  })

  it('every entry has a non-empty question and answer', () => {
    for (const e of RENT_FAQ) {
      expect(e.q.trim().length).toBeGreaterThan(8)
      expect(e.a.trim().length).toBeGreaterThan(40)
    }
  })

  it('every entry belongs to a declared category', () => {
    for (const e of RENT_FAQ) expect(CAT_IDS.has(e.cat)).toBe(true)
  })

  it('every source URL is an https link', () => {
    for (const e of RENT_FAQ) {
      if (e.sourceUrl) expect(e.sourceUrl).toMatch(/^https:\/\/\S+$/)
    }
  })

  it('has no duplicate questions', () => {
    const qs = RENT_FAQ.map(e => e.q.trim().toLowerCase())
    expect(new Set(qs).size).toBe(qs.length)
  })
})

describe('rentFaq - grouping', () => {
  it('groups every entry exactly once, dropping empty categories', () => {
    const groups = rentFaqByCategory()
    const grouped = groups.reduce((n, g) => n + g.entries.length, 0)
    expect(grouped).toBe(RENT_FAQ.length)
    for (const g of groups) expect(g.entries.length).toBeGreaterThan(0)
  })

  it('preserves the declared category order', () => {
    const groups = rentFaqByCategory()
    const order = RENT_FAQ_CATEGORIES.map(c => c.id)
    const groupedOrder = groups.map(g => g.category.id)
    // groupedOrder must be a subsequence of the declared order
    let i = 0
    for (const id of groupedOrder) {
      i = order.indexOf(id, i)
      expect(i).toBeGreaterThanOrEqual(0)
      i++
    }
  })

  it('covers the core high-demand topics', () => {
    const present = new Set(rentFaqByCategory().map(g => g.category.id))
    for (const id of [
      'garantias',
      'deposito',
      'costos',
      'precio',
      'impuestos',
      'derechos',
      'situaciones',
    ] as const) {
      expect(present.has(id)).toBe(true)
    }
  })
})
