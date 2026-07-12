import { describe, expect, it } from 'vitest'

import {
  GUARANTEE_OPTIONS,
  RENTAL_PORTALS,
  RENT_GUIDE_LAST_REVIEWED,
  RENT_GUIDE_SOURCES,
  URGENT_HOUSING_RESOURCES,
  buildRentalSearchPost,
  guaranteeById,
} from '../../utils/rentGuide'

describe('rental guide research data', () => {
  it('keeps every action linked to a secure source', () => {
    const urls = [
      ...RENTAL_PORTALS.map(item => item.url),
      ...GUARANTEE_OPTIONS.map(item => item.officialUrl),
      ...URGENT_HOUSING_RESOURCES.map(item => item.url),
      ...RENT_GUIDE_SOURCES.map(item => item.url),
    ]

    expect(urls.length).toBeGreaterThan(15)
    expect(urls.every(url => url.startsWith('https://'))).toBe(true)
  })

  it('covers the main paths for people without a traditional guarantee', () => {
    expect(guaranteeById('seguro')).toBeDefined()
    expect(guaranteeById('bhu')).toBeDefined()
    expect(guaranteeById('sin-garantia')).toBeDefined()
  })

  it('publishes a machine-readable review date', () => {
    expect(RENT_GUIDE_LAST_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(RENT_GUIDE_LAST_REVIEWED))).toBe(false)
  })
})

describe('rental search post builder', () => {
  it('turns the vague urgent request into an actionable brief', () => {
    const post = buildRentalSearchPost({
      budget: 18_000,
      zones: 'La Paz, Colón o Las Piedras',
      accommodation: 'Habitación o pensión',
      moveDate: 'esta semana',
      guarantee: 'trabajo formal',
      household: '1 persona',
    })

    expect(post).toContain('$18.000 por mes')
    expect(post).toContain('La Paz, Colón o Las Piedras')
    expect(post).toContain('Habitación o pensión')
    expect(post).toContain('esta semana')
    expect(post).toContain('trabajo formal')
    expect(post).toContain('no envío seña')
  })

  it('uses safe, useful defaults instead of exposing personal data', () => {
    const post = buildRentalSearchPost({})

    expect(post).toContain('a conversar')
    expect(post).toContain('lo antes posible')
    expect(post).not.toMatch(/cédula|documento|recibo de sueldo/i)
  })
})
