import { describe, expect, it } from 'vitest'
import { starParts } from '../../utils/reviews'
import { LENDERS, lendersByType, getLender, teaLabel, LENDER_TYPES } from '../../utils/loans'

describe('starParts', () => {
  it('splits a whole rating into full + empty (5 slots)', () => {
    expect(starParts(4)).toEqual({ full: 4, half: false, empty: 1 })
  })
  it('rounds .5+ to a half star', () => {
    expect(starParts(3.6)).toEqual({ full: 3, half: true, empty: 1 })
  })
  it('treats null as no stars', () => {
    expect(starParts(null)).toEqual({ full: 0, half: false, empty: 5 })
  })
  it('clamps out-of-range to 0..5', () => {
    expect(starParts(7)).toEqual({ full: 5, half: false, empty: 0 })
    expect(starParts(-1)).toEqual({ full: 0, half: false, empty: 5 })
  })
})

describe('loans catalog', () => {
  it('has unique ids', () => {
    const ids = LENDERS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('every lender has an official source URL', () => {
    for (const l of LENDERS) expect(l.source).toMatch(/^https?:\/\//)
  })
  it('rating is null or within 0..5', () => {
    for (const l of LENDERS) {
      if (l.rating != null) {
        expect(l.rating).toBeGreaterThanOrEqual(0)
        expect(l.rating).toBeLessThanOrEqual(5)
      }
    }
  })
  it('every rated lender cites at least one review source', () => {
    for (const l of LENDERS) {
      if (l.rating != null) expect(l.reviewSources.length).toBeGreaterThan(0)
    }
  })
  it('covers all four lender categories', () => {
    const types = new Set(LENDERS.map(l => l.type))
    expect([...types].sort()).toEqual(['banco', 'cooperativa', 'financiera', 'fintech'])
  })
})

describe('loans helpers', () => {
  it('teaLabel formats a percent and falls back to Consultar', () => {
    expect(teaLabel(45)).toMatch(/45/)
    expect(teaLabel(null)).toBe('Consultar')
  })
  it('lendersByType groups in LENDER_TYPES order with all lenders', () => {
    const groups = lendersByType()
    expect(groups.map(g => g.type)).toEqual(Object.keys(LENDER_TYPES))
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(LENDERS.length)
  })
  it('getLender finds by id', () => {
    expect(getLender(LENDERS[0]!.id)?.id).toBe(LENDERS[0]!.id)
    expect(getLender('nope')).toBeUndefined()
  })
})
