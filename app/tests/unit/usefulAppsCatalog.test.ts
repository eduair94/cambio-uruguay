import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  USEFUL_APP_CATEGORIES,
  USEFUL_APP_DEPARTMENTS,
  usefulAppIsPublic,
} from '../../utils/usefulApps'
import { USEFUL_APPS, USEFUL_APPS_VERIFIED_AT } from '../../utils/usefulAppsCatalog'
import { USEFUL_APPS_GUIDE_LABELS } from '../../utils/usefulAppsContent'

const PAGES = join(__dirname, '..', '..', 'pages')
const pageExists = (route: string) =>
  existsSync(join(PAGES, `${route.slice(1)}.vue`)) ||
  existsSync(join(PAGES, route.slice(1), 'index.vue'))
const TRACKING = /[?&](?:utm_[a-z]+|ref|referral|aff|fbclid|gclid)=/i
const CATEGORY_IDS = USEFUL_APP_CATEGORIES.map(c => c.id) as string[]

describe('catálogo de apps útiles', () => {
  it('tiene una fecha de verificación ISO y más de cien apps', () => {
    expect(USEFUL_APPS_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(USEFUL_APPS.length).toBeGreaterThanOrEqual(100)
  })

  it('usa ids kebab-case únicos (también son anclas)', () => {
    const ids = USEFUL_APPS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('no repite una ficha de tienda en dos apps', () => {
    const stores = USEFUL_APPS.flatMap(a =>
      [a.android && `a:${a.android.id}`, a.ios && `i:${a.ios.id}`].filter(Boolean)
    )
    expect(new Set(stores).size).toBe(stores.length)
  })

  it('cada pestaña tiene por lo menos tres apps', () => {
    for (const id of CATEGORY_IDS) {
      const n = USEFUL_APPS.filter(a => a.category === id || a.also?.includes(id as never)).length
      expect(n, id).toBeGreaterThanOrEqual(3)
    }
  })

  it('cada tarjeta cumple el formato de copy', () => {
    for (const a of USEFUL_APPS) {
      expect(a.name.trim(), a.id).not.toBe('')
      expect(a.name.length, a.id).toBeLessThanOrEqual(40)
      expect(a.organization.trim(), a.id).not.toBe('')
      expect(a.summary.length, a.id).toBeGreaterThanOrEqual(20)
      expect(a.summary.length, a.id).toBeLessThanOrEqual(120)
      expect(a.summary.endsWith('.'), a.id).toBe(true)
      expect(a.uses.length, a.id).toBeGreaterThanOrEqual(2)
      expect(a.uses.length, a.id).toBeLessThanOrEqual(4)
      for (const use of a.uses) {
        expect(use.length, `${a.id}: ${use}`).toBeGreaterThanOrEqual(8)
        expect(use.length, `${a.id}: ${use}`).toBeLessThanOrEqual(100)
        expect(use.endsWith('.'), `${a.id}: ${use}`).toBe(false)
      }
      expect((a.needs ?? []).length, a.id).toBeLessThanOrEqual(3)
      expect(CATEGORY_IDS, a.id).toContain(a.category)
      for (const extra of a.also ?? []) {
        expect(CATEGORY_IDS, a.id).toContain(extra)
        expect(extra, a.id).not.toBe(a.category)
      }
      if (a.note !== undefined) expect(a.note.length, a.id).toBeLessThanOrEqual(240)
    }
  })

  it('cada app tiene al menos una ficha de tienda bien formada, con su desarrollador', () => {
    for (const a of USEFUL_APPS) {
      expect(Boolean(a.android || a.ios), a.id).toBe(true)
      if (a.android) {
        expect(a.android.id, a.id).toMatch(/^[A-Z]\w*(\.\w+)+$/i)
        expect(a.android.developer.trim(), a.id).not.toBe('')
      }
      if (a.ios) {
        expect(a.ios.id, a.id).toMatch(/^\d{6,12}$/)
        expect(a.ios.developer.trim(), a.id).not.toBe('')
      }
    }
  })

  it('las fuentes y webs son https y sin parámetros de seguimiento', () => {
    for (const a of USEFUL_APPS) {
      for (const url of [a.source, a.web].filter(Boolean) as string[]) {
        expect(url, a.id).toMatch(/^https:\/\//)
        expect(TRACKING.test(url), `${a.id}: ${url}`).toBe(false)
      }
    }
  })

  it('una app no oficial lo dice y apunta a la oficial', () => {
    const community = USEFUL_APPS.filter(a => a.kind === 'comunidad')
    expect(community.length).toBeGreaterThan(0)
    for (const a of community) {
      expect(a.note, a.id).toMatch(/no es (de|oficial)/i)
      const official = USEFUL_APPS.find(o => o.id === a.officialAlternative)
      expect(official, a.id).toBeDefined()
      expect(usefulAppIsPublic(official!), a.id).toBe(true)
    }
  })

  it('los departamentos existen y no se repiten', () => {
    for (const a of USEFUL_APPS) {
      const list = a.departments ?? []
      expect(new Set(list).size, a.id).toBe(list.length)
      for (const d of list) expect(USEFUL_APP_DEPARTMENTS as readonly string[], a.id).toContain(d)
    }
  })

  it('las palabras del buscador están en minúsculas y cada app tiene alguna', () => {
    for (const a of USEFUL_APPS) {
      expect((a.keywords ?? []).length, a.id).toBeGreaterThanOrEqual(1)
      expect((a.keywords ?? []).length, a.id).toBeLessThanOrEqual(10)
      for (const k of a.keywords ?? []) expect(k, a.id).toBe(k.toLowerCase())
    }
  })

  it('cada guía enlazada tiene etiqueta y página', () => {
    for (const a of USEFUL_APPS) {
      expect((a.guides ?? []).length, a.id).toBeLessThanOrEqual(2)
      for (const route of a.guides ?? []) {
        expect(USEFUL_APPS_GUIDE_LABELS[route], `${a.id}: ${route}`).toBeTruthy()
        expect(pageExists(route), `${a.id}: ${route}`).toBe(true)
      }
    }
  })
})
