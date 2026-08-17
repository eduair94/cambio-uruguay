// The "Seguí leyendo" block renders on every content route on the site, so its
// failure modes are all site-wide: a link to a page that no longer exists, a
// card pointing at the page you are already on, or an empty block under a
// thousand programmatic URLs. Each of those gets a test here.
import { describe, expect, it } from 'vitest'

import {
  CURATED,
  normalizeRelatedPath,
  relatedEnabledForPath,
  relatedFor,
} from '../../utils/relatedPages'
import { NAV_SECTIONS } from '../../utils/siteNav'

/** Every internal route the navigation model knows about. */
const NAV_ROUTES = new Set(
  NAV_SECTIONS.flatMap(
    section => section.entries.map(entry => entry.to).filter(Boolean) as string[]
  )
)

/** A spread of real routes: hubs, tools, guides and one leaf per programmatic family. */
const SAMPLE = [
  '/tarjetas-de-credito-uruguay',
  '/mejores-bancos-uruguay',
  '/alquilar-estando-en-clearing',
  '/inversiones-uruguay',
  '/herramientas/calculadora-plazo-fijo',
  '/herramientas/conversor-unidad-indexada',
  '/guias/dolares-deteriorados-billetes-rechazados-uruguay',
  '/importar/celulares',
  '/casa/brou/comprar-dolares',
  '/sucursal/brou-centro-montevideo',
  '/comparativas/brou-vs-itau',
  '/historico/brou/usd',
  '/newsletter/2026-08-16',
  '/cotizacion/dolar',
  '/sillas-escritorio-uruguay',
]

describe('normalizeRelatedPath', () => {
  it('strips the locale prefix, the query, the hash and a trailing slash', () => {
    expect(normalizeRelatedPath('/en/mapa')).toBe('/mapa')
    expect(normalizeRelatedPath('/pt/importar/celulares/')).toBe('/importar/celulares')
    expect(normalizeRelatedPath('/buscar?q=dolar')).toBe('/buscar')
    expect(normalizeRelatedPath('/glosario#spread')).toBe('/glosario')
  })

  it('folds every locale root to the home path', () => {
    expect(normalizeRelatedPath('/en')).toBe('/')
    expect(normalizeRelatedPath('/pt/')).toBe('/')
    expect(normalizeRelatedPath('/')).toBe('/')
  })

  it('does not mistake a page whose name starts with a locale code for a prefix', () => {
    expect(normalizeRelatedPath('/entregas')).toBe('/entregas')
  })
})

describe('where the block renders', () => {
  it('stays off the home page, the search surfaces and the chrome-free routes', () => {
    for (const path of [
      '/',
      '/en',
      '/pt/',
      '/pizarra',
      '/en/pizarra',
      '/widget',
      '/buscar',
      '/mapa-del-sitio',
      '/contacto',
      '/conectar',
      '/cuenta',
      '/cuenta/alertas',
      '/privacidad',
      '/terminos',
    ]) {
      expect(relatedEnabledForPath(path), path).toBe(false)
    }
  })

  it('renders on content routes, in every locale', () => {
    for (const path of SAMPLE) {
      expect(relatedEnabledForPath(path), path).toBe(true)
      expect(relatedEnabledForPath(`/en${path}`), `/en${path}`).toBe(true)
    }
  })

  it('protects the newsletter signup but not its archived issues', () => {
    expect(relatedEnabledForPath('/newsletter')).toBe(false)
    expect(relatedEnabledForPath('/newsletter/archivo')).toBe(true)
    expect(relatedEnabledForPath('/newsletter/2026-08-16')).toBe(true)
  })
})

describe('the curated lists stay honest', () => {
  // A curated entry is a hand-written route string, so it rots silently the day
  // a page is renamed: the card just disappears from the block and nobody
  // notices. This is the tripwire.
  it('only names routes the navigation model still declares', () => {
    for (const [source, targets] of Object.entries(CURATED)) {
      for (const target of targets) {
        expect(NAV_ROUTES, `${source} -> ${target}`).toContain(target)
      }
    }
  })

  it('never curates a page into itself', () => {
    for (const [source, targets] of Object.entries(CURATED)) {
      expect(targets, source).not.toContain(source)
      expect(new Set(targets).size, source).toBe(targets.length)
    }
  })

  it('renders the block on every route it curates', () => {
    for (const source of Object.keys(CURATED)) {
      expect(relatedEnabledForPath(source), source).toBe(true)
    }
  })

  it('leads every curated route with its curated neighbours', () => {
    for (const [source, targets] of Object.entries(CURATED)) {
      const got = relatedFor(source).map(i => i.to)
      expect(got.slice(0, Math.min(targets.length, 6)), source).toEqual(targets.slice(0, 6))
    }
  })
})

describe('what the block suggests', () => {
  it('always fills at least three cards and never more than the limit', () => {
    for (const path of SAMPLE) {
      const items = relatedFor(path)
      expect(items.length, path).toBeGreaterThanOrEqual(3)
      expect(items.length, path).toBeLessThanOrEqual(6)
      expect(relatedFor(path, 4).length, path).toBeLessThanOrEqual(4)
    }
  })

  it('only ever points at routes the navigation model declares', () => {
    for (const path of SAMPLE) {
      for (const item of relatedFor(path)) {
        expect(NAV_ROUTES, `${path} -> ${item.to}`).toContain(item.to)
      }
    }
  })

  it('never suggests the page you are on, or the hub you are inside', () => {
    for (const path of SAMPLE) {
      const targets = relatedFor(path).map(i => i.to)
      expect(targets, path).not.toContain(path)
      for (const target of targets) {
        expect(path.startsWith(`${target}/`), `${path} -> ${target}`).toBe(false)
      }
    }
  })

  it('never suggests the home page or a dead end like /contacto', () => {
    for (const path of SAMPLE) {
      const targets = relatedFor(path).map(i => i.to)
      for (const denied of [
        '/',
        '/contacto',
        '/conectar',
        '/privacidad',
        '/terminos',
        '/pizarra',
      ]) {
        expect(targets, `${path} -> ${denied}`).not.toContain(denied)
      }
    }
  })

  it('returns no duplicates', () => {
    for (const path of SAMPLE) {
      const targets = relatedFor(path).map(i => i.to)
      expect(new Set(targets).size, path).toBe(targets.length)
    }
  })

  it('ignores the locale prefix, the query and the trailing slash', () => {
    for (const path of SAMPLE) {
      const base = relatedFor(path).map(i => i.to)
      expect(
        relatedFor(`/en${path}`).map(i => i.to),
        path
      ).toEqual(base)
      expect(
        relatedFor(`${path}/?utm_source=x`).map(i => i.to),
        path
      ).toEqual(base)
    }
  })

  it('leads with the curated neighbours on the pages that carry the traffic', () => {
    // The one GA4 shows a tweet dropping 471 sessions onto in a single morning.
    expect(relatedFor('/tarjetas-de-credito-uruguay').map(i => i.to)).toEqual([
      '/conviene-comprar-en-cuotas',
      '/pagar-cuentas-con-tarjeta',
      '/tarjetas-de-debito-uruguay',
      '/mejores-bancos-uruguay',
      '/prestamos-uruguay',
      '/salud-financiera',
    ])
  })

  it('lets a programmatic leaf inherit its family curation', () => {
    // `/historico/<casa>/<currency>` has no nav entry of its own.
    expect(
      relatedFor('/historico/brou/usd')
        .slice(0, 4)
        .map(i => i.to)
    ).toEqual(['/dolar-hoy', '/por-que-sube-el-dolar', '/comparar', '/dolar/records'])
  })

  it('finds the customs cluster from a category page it has never seen', () => {
    const targets = relatedFor('/importar/celulares').map(i => i.to)
    expect(targets).toContain('/preguntas-frecuentes-aduana-uruguay')
    expect(targets).toContain('/franquicia-aduana-uruguay')
  })

  it('is pure: the same path always ranks the same way', () => {
    for (const path of SAMPLE) {
      expect(relatedFor(path)).toEqual(relatedFor(path))
    }
  })

  it('carries an i18n key rather than a literal for every label', () => {
    for (const item of relatedFor('/inversiones-uruguay')) {
      expect(item.labelKey).toMatch(/^[a-z][\w.]+$/i)
      expect(item.sectionKey).toMatch(/^search\.section\./)
      expect(item.icon).toMatch(/^mdi-/)
    }
  })
})
