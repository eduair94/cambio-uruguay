import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { usefulAppIsPublic } from '../../utils/usefulApps'
import { USEFUL_APPS } from '../../utils/usefulAppsCatalog'
import {
  USEFUL_APPS_CRITERIA,
  USEFUL_APPS_ESSENTIAL_IDS,
  USEFUL_APPS_FAQ,
  USEFUL_APPS_GUIDE_LABELS,
  USEFUL_APPS_KIT,
  USEFUL_APPS_KIT_MAX,
  USEFUL_APPS_NOT_APPS,
  USEFUL_APPS_SAFETY,
  usefulAppsKitSanitize,
} from '../../utils/usefulAppsContent'

const byId = new Map(USEFUL_APPS.map(a => [a.id, a]))
const PAGES = join(__dirname, '..', '..', 'pages')

describe('kit de imprescindibles', () => {
  it('tiene ids únicos, seis para todos y el resto según el caso', () => {
    const ids = USEFUL_APPS_KIT.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(USEFUL_APPS_KIT.filter(i => i.group === 'todos')).toHaveLength(6)
    for (const item of USEFUL_APPS_KIT.filter(i => i.group === 'caso')) {
      expect(item.when, item.id).toMatch(/^Si /)
    }
  })

  it('cada ítem apunta a apps del catálogo y la primera es del Estado', () => {
    for (const item of USEFUL_APPS_KIT) {
      expect(item.appIds.length, item.id).toBeGreaterThanOrEqual(1)
      for (const id of item.appIds) expect(byId.has(id), `${item.id}: ${id}`).toBe(true)
      expect(usefulAppIsPublic(byId.get(item.appIds[0]!)!), item.id).toBe(true)
      expect(item.why.endsWith('.'), item.id).toBe(true)
    }
  })

  it('la pestaña Imprescindibles son las apps del kit, sin repetir y en su orden', () => {
    expect(USEFUL_APPS_ESSENTIAL_IDS).toEqual([
      ...new Set(USEFUL_APPS_KIT.flatMap(i => [...i.appIds])),
    ])
  })

  it('INUMET no está en el kit: en iPhone no se actualiza desde 2019', () => {
    expect(USEFUL_APPS_ESSENTIAL_IDS).not.toContain('inumet')
  })
})

describe('lo guardado del kit', () => {
  it('se queda sólo con ítems "para todos" que existen, sin repetir', () => {
    const todos = USEFUL_APPS_KIT.filter(i => i.group === 'todos').map(i => i.id)
    const caso = USEFUL_APPS_KIT.find(i => i.group === 'caso')!.id
    expect(usefulAppsKitSanitize([todos[0], todos[0], 'inventado', 42, null, caso])).toEqual([
      todos[0],
    ])
  })

  it('cualquier cosa que no sea un arreglo es un kit vacío', () => {
    expect(usefulAppsKitSanitize('{"a":1}')).toEqual([])
    expect(usefulAppsKitSanitize(null)).toEqual([])
    expect(usefulAppsKitSanitize({ length: 3 })).toEqual([])
  })

  it('tiene un tope', () => {
    const many = Array.from({ length: 100 }, () => USEFUL_APPS_KIT[0]!.id)
    expect(usefulAppsKitSanitize(many).length).toBeLessThanOrEqual(USEFUL_APPS_KIT_MAX)
  })
})

describe('lo que no es una app', () => {
  it('cada servicio dice qué se busca, qué hacer en cambio y por dónde', () => {
    expect(USEFUL_APPS_NOT_APPS.length).toBeGreaterThanOrEqual(4)
    for (const s of USEFUL_APPS_NOT_APPS) {
      expect(s.name.trim(), s.id).not.toBe('')
      expect(s.lookingFor.trim(), s.id).not.toBe('')
      expect(s.instead.length, s.id).toBeLessThanOrEqual(170)
      expect(s.instead.endsWith('.'), s.id).toBe(true)
      expect(s.channels.length, s.id).toBeGreaterThanOrEqual(1)
      for (const c of s.channels) {
        expect(c.url, s.id).toMatch(/^(?:https:\/\/|tel:)/)
        expect(c.label.trim(), s.id).not.toBe('')
      }
      expect(s.source, s.id).toMatch(/^https:\/\//)
    }
  })
})

describe('textos de la página', () => {
  it('criterios y consejos son oraciones completas', () => {
    expect(USEFUL_APPS_CRITERIA.length).toBeGreaterThanOrEqual(4)
    expect(USEFUL_APPS_SAFETY.length).toBeGreaterThanOrEqual(4)
    for (const line of [...USEFUL_APPS_CRITERIA, ...USEFUL_APPS_SAFETY]) {
      expect(line.endsWith('.'), line).toBe(true)
    }
  })

  it('la FAQ tiene preguntas únicas que terminan en "?" y respuestas con contenido', () => {
    expect(USEFUL_APPS_FAQ.length).toBeGreaterThanOrEqual(5)
    const ids = USEFUL_APPS_FAQ.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    const questions = USEFUL_APPS_FAQ.map(f => f.question)
    expect(new Set(questions).size).toBe(questions.length)
    for (const f of USEFUL_APPS_FAQ) {
      expect(f.question.endsWith('?'), f.id).toBe(true)
      expect(f.answer.length, f.id).toBeGreaterThan(40)
      if (f.link) expect(existsSync(join(PAGES, `${f.link.to.slice(1)}.vue`)), f.id).toBe(true)
    }
  })

  it('cada guía con etiqueta es una página que existe', () => {
    for (const route of Object.keys(USEFUL_APPS_GUIDE_LABELS)) {
      expect(
        existsSync(join(PAGES, `${route.slice(1)}.vue`)) ||
          existsSync(join(PAGES, route.slice(1), 'index.vue')),
        route
      ).toBe(true)
    }
  })
})
