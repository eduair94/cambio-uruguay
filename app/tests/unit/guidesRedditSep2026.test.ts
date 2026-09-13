import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { guideHubs, hubSlugs } from '../../utils/guideHubs'
import { guides, type Guide } from '../../utils/guides'
import { consumoGuides } from '../../utils/guidesConsumo'
import { deudasGuides } from '../../utils/guidesDeudas'
import { pagosGuides } from '../../utils/guidesPagos'
import { tramitesGuides } from '../../utils/guidesTramites'
import { trabajoBpsGuides } from '../../utils/guidesTrabajoBps'
import { viviendaGuides } from '../../utils/guidesVivienda'

// Tanda del 2026-09-13: 30 guías minadas de Reddit y de la cola de demanda del autocompletado.
// Estas reglas son las del brief con el que se redactaron; acá quedan ejecutables para que la
// próxima edición no las rompa sin darse cuenta.
const MODULES: Record<string, readonly Guide[]> = {
  pagos: pagosGuides,
  deudas: deudasGuides,
  trabajoBps: trabajoBpsGuides,
  vivienda: viviendaGuides,
  tramites: tramitesGuides,
  consumo: consumoGuides,
}
const NEW_GUIDES = Object.values(MODULES).flat()

/** Rutas estáticas del app, sacadas de `pages/` (las dinámicas se validan aparte). */
function staticRoutes(): Set<string> {
  const root = join(__dirname, '../../pages')
  const out = new Set<string>()
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (name.endsWith('.vue')) {
        const route = `/${relative(root, full)
          .replace(/\\/g, '/')
          .replace(/\.vue$/, '')}`
          .replace(/\/index$/, '')
          .replace(/^$/, '/')
        if (!route.includes('[')) out.add(route || '/')
      }
    }
  }
  walk(root)
  return out
}

const ROUTES = staticRoutes()
const GUIDE_ROUTES = new Set(guides.map(g => `/guias/${g.slug}`))
const HUB_ROUTES = new Set(hubSlugs().map(s => `/temas/${s}`))
const resolves = (to: string) => ROUTES.has(to) || GUIDE_ROUTES.has(to) || HUB_ROUTES.has(to)

// Palabras sueltas que, al principio de un título, entierran a la página canónica en el buscador
// interno (ver el scorer de siteNav y `searchIndex.test.ts`).
const BURIES_CANONICAL =
  /^(?:cr[eé]dito|pr[eé]stamos?|inversiones|invertir|couriers|preguntas frecuentes)\b/i
const BANNED_TAGS = new Set([
  'CRÉDITO',
  'CREDITO',
  'PRÉSTAMO',
  'PRESTAMO',
  'INVERSIÓN',
  'INVERSIONES',
])

describe('tanda de guías 2026-09-13 › forma', () => {
  it('trae las seis tandas y todas están en el catálogo', () => {
    for (const [name, list] of Object.entries(MODULES)) {
      expect(list.length, `módulo ${name} vacío`).toBeGreaterThan(0)
    }
    const catalogue = new Set(guides.map(g => g.slug))
    for (const g of NEW_GUIDES) expect(catalogue.has(g.slug), g.slug).toBe(true)
  })

  it.each(NEW_GUIDES.map(g => [g.slug, g] as const))('%s respeta el brief', (_slug, g) => {
    expect(g.title.length, g.title).toBeLessThanOrEqual(60)
    expect(BURIES_CANONICAL.test(g.title), g.title).toBe(false)
    expect(BANNED_TAGS.has(g.tag), g.tag).toBe(false)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(190)
    expect(g.updatedAt).toMatch(/^2026-09-\d\d$/)
    expect(g.sections.length).toBeGreaterThanOrEqual(4)
    expect(g.sections.length).toBeLessThanOrEqual(9)
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(g.sources?.length ?? 0).toBeGreaterThanOrEqual(2)
    for (const s of g.sources ?? []) expect(s.url).toMatch(/^https:\/\//)
    for (const s of g.sections) {
      expect(s.body, `${g.slug} › ${s.heading}`).not.toMatch(/\*\*|^#|\n-\s/)
    }
  })

  it('cada enlace interno de la tanda apunta a una ruta que existe', () => {
    const broken: string[] = []
    for (const g of NEW_GUIDES) {
      const links = [...(g.related ?? []), ...g.sections.flatMap(s => s.links ?? [])]
      for (const l of links) if (!resolves(l.to)) broken.push(`${g.slug} → ${l.to}`)
    }
    expect(broken).toEqual([])
  })
})

describe('tanda de guías 2026-09-13 › hubs', () => {
  it('cada guía nueva vive en exactamente un hub', () => {
    for (const g of NEW_GUIDES) {
      const owners = guideHubs.filter(h => h.guideSlugs.includes(g.slug)).map(h => h.slug)
      expect(owners, g.slug).toHaveLength(1)
    }
  })

  it('los dos hubs nuevos existen y reúnen su tanda', () => {
    const pagos = guideHubs.find(h => h.slug === 'bancos-y-pagos-uruguay')
    const tramites = guideHubs.find(h => h.slug === 'tramites-y-documentos-uruguay')
    expect(pagos?.guideSlugs).toEqual(expect.arrayContaining(pagosGuides.map(g => g.slug)))
    expect(tramites?.guideSlugs).toEqual(expect.arrayContaining(tramitesGuides.map(g => g.slug)))
  })
})
