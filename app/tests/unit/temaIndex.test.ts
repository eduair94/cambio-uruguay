import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DIRECTORIOS } from '../../utils/directorios'
import { getTerm, glossary } from '../../utils/glossary'
import { getGuide } from '../../utils/guides'
import { guideHubs } from '../../utils/guideHubs'
import { NAV_SECTIONS } from '../../utils/siteNav'

const PAGES_DIR = join(__dirname, '..', '..', 'pages')

/** Una ruta existe si tiene `<ruta>.vue` o `<ruta>/index.vue`, o si es una guía del catálogo. */
function pageExists(route: string): boolean {
  if (route.startsWith('/guias/')) return Boolean(getGuide(route.slice('/guias/'.length)))
  const base = join(PAGES_DIR, ...route.split('/').filter(Boolean))
  return existsSync(`${base}.vue`) || existsSync(join(base, 'index.vue'))
}

/** Lo mínimo que el bloque "Más sobre este tema" necesita, sin guías ni definiciones completas. */
function buildTemaIndex() {
  return {
    hubs: guideHubs.map(hub => ({
      slug: hub.slug,
      title: hub.title,
      icon: hub.icon,
      resources: (hub.resources ?? []).map(resource => ({
        to: resource.to,
        label: resource.label,
      })),
      guides: [...hub.guideSlugs],
      terms: (hub.terms ?? []).map(slug => ({ slug, term: getTerm(slug)?.term ?? slug })),
    })),
  }
}

describe('el índice de temas del layout', () => {
  // El bloque vive en el layout y no puede importar guideHubs.ts (arrastra las 145 guías) ni el
  // glosario completo. Este test ES el generador: si falla después de editar un tema o el glosario,
  // regenerar con `npx vitest run tests/unit/temaIndex.test.ts -u`.
  it('coincide con utils/guideHubs.ts y el glosario', async () => {
    await expect(`${JSON.stringify(buildTemaIndex(), null, 2)}\n`).toMatchFileSnapshot(
      '../../utils/temaIndex.json'
    )
  })

  it('se mantiene chico: viaja en el JavaScript de cada página', () => {
    expect(JSON.stringify(buildTemaIndex()).length).toBeLessThan(40_000)
  })
})

describe('los temas como fuente de las interconexiones', () => {
  it('cada recurso es una página que existe, sin repetidos dentro de un tema', () => {
    for (const hub of guideHubs) {
      const routes = (hub.resources ?? []).map(resource => resource.to)
      expect(new Set(routes).size, hub.slug).toBe(routes.length)
      for (const route of routes) expect(pageExists(route), `${hub.slug} → ${route}`).toBe(true)
    }
  })

  it('cada término de un tema existe en el glosario', () => {
    for (const hub of guideHubs)
      for (const slug of hub.terms ?? [])
        expect(getTerm(slug), `${hub.slug} → ${slug}`).toBeTruthy()
  })

  it('todo término del glosario pertenece al menos a un tema', () => {
    const inHub = new Set(guideHubs.flatMap(hub => [...(hub.terms ?? [])]))
    const orphans = glossary.map(term => term.slug).filter(slug => !inHub.has(slug))
    expect(orphans).toEqual([])
  })

  // Un directorio o un análisis nuevo sin tema quedaría fuera del bloque: la regla lo obliga a
  // declararlo en utils/guideHubs.ts. Las rutas fuera del sitemap (el tablero de /estado) no se
  // promocionan en un bloque de lectura.
  it('toda página de datos (directorios y sus análisis) pertenece al menos a un tema', () => {
    const inHub = new Set(guideHubs.flatMap(hub => (hub.resources ?? []).map(r => r.to)))
    const internal = new Set(
      NAV_SECTIONS.flatMap(section => section.entries)
        .filter(entry => entry.sitemapExclude && entry.to)
        .map(entry => entry.to as string)
    )
    const dataRoutes = DIRECTORIOS.flatMap(entry => [
      entry.to,
      ...(entry.tambien ?? []).map(link => link.to),
      ...(entry.analisis ?? []),
    ])
    const missing = [...new Set(dataRoutes)].filter(
      route => !inHub.has(route) && !internal.has(route)
    )
    expect(missing).toEqual([])
  })

  it('las evoluciones de precio y los históricos están juntos en "economía y mercado"', () => {
    const economia = guideHubs.find(hub => hub.slug === 'economia-y-mercado-uruguay')!
    const routes = (economia.resources ?? []).map(resource => resource.to)
    for (const route of [
      '/evolucion-precio-alquileres-uruguay',
      '/evolucion-precio-viviendas-uruguay',
      '/evolucion-precio-autos-usados-uruguay',
      '/historico',
      '/precio-de-la-nafta-uruguay',
      '/precios-de-supermercado-uruguay',
      '/indicadores',
    ])
      expect(routes, route).toContain(route)
  })
})
