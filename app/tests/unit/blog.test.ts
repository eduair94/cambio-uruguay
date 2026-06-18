import { describe, expect, it } from 'vitest'
import {
  BLOG_CATEGORY_META,
  blogCategories,
  blogSlug,
  isBlogCategory,
  montevideoToday,
  parseBlogSlug,
} from '../../utils/blog'

describe('blog categories', () => {
  it('exposes both daily streams with required metadata', () => {
    const cats = blogCategories()
    expect(cats).toEqual(['dolar-global', 'dolar-uruguay'])
    for (const c of cats) {
      const meta = BLOG_CATEGORY_META[c]
      expect(meta.tag.trim()).not.toBe('')
      expect(meta.label.trim()).not.toBe('')
      expect(meta.description.trim().length).toBeGreaterThan(20)
      expect(meta.icon.startsWith('mdi-')).toBe(true)
    }
  })

  it('validates category strings', () => {
    expect(isBlogCategory('dolar-global')).toBe(true)
    expect(isBlogCategory('dolar-uruguay')).toBe(true)
    expect(isBlogCategory('nope')).toBe(false)
  })
})

describe('blogSlug / parseBlogSlug', () => {
  it('round-trips a date + category', () => {
    const slug = blogSlug('2026-06-17', 'dolar-global')
    expect(slug).toBe('2026-06-17-dolar-global')
    expect(parseBlogSlug(slug)).toEqual({ date: '2026-06-17', category: 'dolar-global' })
  })

  it('parses the uruguay category', () => {
    expect(parseBlogSlug('2026-01-02-dolar-uruguay')).toEqual({
      date: '2026-01-02',
      category: 'dolar-uruguay',
    })
  })

  it('rejects malformed or unknown slugs', () => {
    expect(parseBlogSlug('')).toBeNull()
    expect(parseBlogSlug('not-a-date-dolar-global')).toBeNull()
    expect(parseBlogSlug('2026-06-17-unknown')).toBeNull()
    expect(parseBlogSlug('2026-13-40-dolar-global')).toBeNull() // invalid calendar date
    expect(parseBlogSlug('2026-06-17')).toBeNull() // missing category
  })
})

describe('montevideoToday', () => {
  it('returns a YYYY-MM-DD string in UTC-3', () => {
    // 2026-06-17T01:00:00Z is still 2026-06-16 in Montevideo (UTC-3).
    expect(montevideoToday(new Date('2026-06-17T01:00:00Z'))).toBe('2026-06-16')
    // Midday UTC is the same calendar day.
    expect(montevideoToday(new Date('2026-06-17T12:00:00Z'))).toBe('2026-06-17')
    expect(montevideoToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
