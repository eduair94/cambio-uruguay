import { describe, expect, it } from 'vitest'
import {
  MONEY_APPS,
  APP_CATEGORIES,
  APP_CATEGORY_ICONS,
  PLATFORM_META,
  moneyAppsByCategory,
  getMoneyApp,
  appHaystack,
  platformLabel,
} from '../../utils/moneyApps'

const PLATFORMS = ['ios', 'android', 'web']

describe('money apps directory', () => {
  it('has unique ids and valid required fields', () => {
    const ids = MONEY_APPS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of MONEY_APPS) {
      expect(a.name.trim()).not.toBe('')
      expect(a.developer.trim()).not.toBe('')
      expect(a.description.trim().length).toBeGreaterThan(15)
      expect(Object.keys(APP_CATEGORIES)).toContain(a.category)
      expect(a.platforms.length).toBeGreaterThan(0)
      for (const p of a.platforms) expect(PLATFORMS).toContain(p)
      expect(typeof a.official).toBe('boolean')
      expect(typeof a.verified).toBe('boolean')
      expect(a.website.startsWith('http')).toBe(true)
      if (a.androidUrl) expect(a.androidUrl.startsWith('http')).toBe(true)
      if (a.iosUrl) expect(a.iosUrl.startsWith('http')).toBe(true)
    }
  })

  it('has an icon for every category and platform', () => {
    for (const c of Object.keys(APP_CATEGORIES)) {
      expect(APP_CATEGORY_ICONS[c as keyof typeof APP_CATEGORY_ICONS].startsWith('mdi-')).toBe(true)
    }
    for (const p of PLATFORMS) {
      expect(PLATFORM_META[p as keyof typeof PLATFORM_META].icon.startsWith('mdi-')).toBe(true)
    }
  })

  it('groups every app into a known category and drops empty groups', () => {
    const grouped = moneyAppsByCategory()
    const count = grouped.reduce((n, g) => n + g.items.length, 0)
    expect(count).toBe(MONEY_APPS.length)
    for (const g of grouped) expect(g.items.length).toBeGreaterThan(0)
  })

  it('supports filtered grouping (e.g. a subset)', () => {
    const subset = MONEY_APPS.slice(0, 1)
    const grouped = moneyAppsByCategory(subset)
    const count = grouped.reduce((n, g) => n + g.items.length, 0)
    expect(count).toBe(subset.length)
  })

  it('resolves apps by id and includes the Cambio Uruguay ecosystem entry', () => {
    expect(getMoneyApp('cambio-uruguay')).toBeDefined()
    expect(getMoneyApp('nope')).toBeUndefined()
    expect(platformLabel('android')).toBe('Android')
  })

  it('builds an accent-insensitive lowercase search haystack', () => {
    const app = MONEY_APPS[0]!
    const hay = appHaystack(app)
    expect(hay).toBe(hay.toLowerCase())
    // accents are stripped so "inversion" matches "Inversión"
    expect(appHaystack({ ...app, description: 'Inversión rápida' })).toContain('inversion rapida')
  })
})
