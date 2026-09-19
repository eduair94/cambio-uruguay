import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  analisisDeFamilia,
  directorioAnalisisParaRuta,
  directoriosDeAnalisis,
  navEntryForPath,
} from '../../utils/directorioAnalisis'
import { DIRECTORIOS, directoriosPorFamilia } from '../../utils/directorios'
import { relatedFor } from '../../utils/relatedPages'

const APP = join(__dirname, '..', '..')
const PAGES_DIR = join(APP, 'pages')
const LOCALES = ['es', 'en', 'pt'] as const

function pageExists(route: string): boolean {
  const base = join(PAGES_DIR, ...route.split('/').filter(Boolean))
  return existsSync(`${base}.vue`) || existsSync(join(base, 'index.vue'))
}

function messages(locale: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(APP, 'i18n', 'locales', 'json', `${locale}.json`), 'utf8'))
}

function lookup(tree: Record<string, unknown>, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      tree
    )
}

const allAnalyses = [...new Set(DIRECTORIOS.flatMap(entry => entry.analisis ?? []))]

describe('los análisis del registro de directorios', () => {
  it('cada análisis es una página que existe', () => {
    for (const route of allAnalyses) expect(pageExists(route), route).toBe(true)
  })

  // La etiqueta sale del menú: sin entrada no hay etiqueta en inglés ni en portugués, y la página
  // tampoco estaría en el sitemap.
  it('cada análisis y cada directorio con análisis está en el menú, con etiqueta en los tres idiomas', () => {
    const routes = [
      ...allAnalyses,
      ...DIRECTORIOS.filter(entry => entry.analisis?.length).map(entry => entry.to),
    ]
    for (const route of routes) {
      const nav = navEntryForPath(route)
      expect(nav, route).toBeDefined()
      for (const locale of LOCALES)
        expect(typeof lookup(messages(locale), nav!.labelKey), `${route} ${locale}`).toBe('string')
    }
  })

  it('una ruta es página del directorio o análisis, nunca las dos cosas', () => {
    const own = new Set(
      DIRECTORIOS.flatMap(entry => [entry.to, ...(entry.tambien ?? []).map(link => link.to)])
    )
    for (const route of allAnalyses) expect(own.has(route), route).toBe(false)
  })

  it('ningún directorio repite un análisis', () => {
    for (const entry of DIRECTORIOS) {
      const list = entry.analisis ?? []
      expect(new Set(list).size, entry.id).toBe(list.length)
    }
  })

  it('los textos del bloque existen en los tres idiomas', () => {
    for (const locale of LOCALES)
      for (const key of [
        'tituloDirectorio',
        'leadDirectorio',
        'tituloAnalisis',
        'leadAnalisis',
        'leadAnalisisVarios',
        'directorio',
        'analisis',
        'todos',
      ])
        expect(
          typeof lookup(messages(locale), `directorioAnalisis.${key}`),
          `${locale} ${key}`
        ).toBe('string')
  })
})

describe('el bloque de cada ruta', () => {
  it('en un directorio lista sus análisis, en el orden del registro', () => {
    const bloque = directorioAnalisisParaRuta('/autos-usados-uruguay')!
    expect(bloque.rol).toBe('directorio')
    expect(bloque.links.map(link => link.to)).toEqual(
      DIRECTORIOS.find(entry => entry.id === 'autos')!.analisis
    )
    expect(bloque.links.every(link => link.kind === 'analisis')).toBe(true)
  })

  it('en una página propia del directorio (tambien) también lista sus análisis', () => {
    const bloque = directorioAnalisisParaRuta('/oportunidades-autos-usados-uruguay')!
    expect(bloque.rol).toBe('directorio')
    expect(bloque.links.map(link => link.to)).toContain('/evolucion-precio-autos-usados-uruguay')
  })

  it('en un análisis lleva primero al directorio y después a los análisis hermanos, sin sí mismo', () => {
    const bloque = directorioAnalisisParaRuta('/evolucion-precio-autos-usados-uruguay')!
    expect(bloque.rol).toBe('analisis')
    expect(bloque.directorios).toBe(1)
    expect(bloque.links[0]).toMatchObject({ to: '/autos-usados-uruguay', kind: 'directorio' })
    const rest = bloque.links.slice(1).map(link => link.to)
    expect(rest).toContain('/mercado-de-autos-usados-uruguay')
    expect(rest).not.toContain('/evolucion-precio-autos-usados-uruguay')
  })

  it('vincula en los dos sentidos: todo análisis vuelve a cada directorio que lo lista', () => {
    for (const entry of DIRECTORIOS)
      for (const route of entry.analisis ?? []) {
        expect(
          directorioAnalisisParaRuta(entry.to)?.links.map(link => link.to),
          `${entry.to} → ${route}`
        ).toContain(route)
        expect(
          directorioAnalisisParaRuta(route)?.links.map(link => link.to),
          `${route} → ${entry.to}`
        ).toContain(entry.to)
      }
  })

  it('un análisis de varios directorios los nombra a todos', () => {
    const route = '/ciberlunes-y-black-friday-uruguay'
    const bloque = directorioAnalisisParaRuta(route)!
    const sources = directoriosDeAnalisis(route).map(entry => entry.to)
    expect(sources.length).toBeGreaterThan(1)
    expect(bloque.directorios).toBe(sources.length)
    expect(bloque.links.filter(link => link.kind === 'directorio').map(link => link.to)).toEqual(
      sources
    )
  })

  it('ignora el prefijo de idioma y la barra final', () => {
    expect(directorioAnalisisParaRuta('/en/historico')).toEqual(
      directorioAnalisisParaRuta('/historico')
    )
    expect(directorioAnalisisParaRuta('/pt/casas-de-cambio/')).toEqual(
      directorioAnalisisParaRuta('/casas-de-cambio')
    )
  })

  it('las fichas y las páginas fuera del registro no dibujan nada', () => {
    expect(directorioAnalisisParaRuta('/autos-usados-uruguay/algun-auto-123')).toBeNull()
    expect(directorioAnalisisParaRuta('/')).toBeNull()
    expect(directorioAnalisisParaRuta('/directorios-uruguay')).toBeNull()
    expect(directorioAnalisisParaRuta('/glosario')).toBeNull()
  })

  it('un directorio sin análisis no dibuja un bloque vacío', () => {
    const sin = DIRECTORIOS.find(entry => !entry.analisis?.length)
    if (sin) expect(directorioAnalisisParaRuta(sin.to)).toBeNull()
  })

  it('"Seguí leyendo" no repite lo que el bloque ya muestra', () => {
    for (const path of [
      '/autos-usados-uruguay',
      '/mercado-de-autos-usados-uruguay',
      '/historico',
    ]) {
      const shown = directorioAnalisisParaRuta(path)!.links.map(link => link.to)
      const related = relatedFor(path, 6, { exclude: shown }).map(page => page.to)
      for (const to of shown) expect(related, `${path} ${to}`).not.toContain(to)
    }
  })
})

describe('los análisis en el hub', () => {
  it('uno compartido por dos o más tarjetas de una familia se dice una vez, sobre la familia', () => {
    const compras = directoriosPorFamilia().find(group => group.familia === 'compras')!
    const { compartidos, propios } = analisisDeFamilia(compras.entries)
    expect(compartidos).toContain('/ciberlunes-y-black-friday-uruguay')
    for (const list of Object.values(propios))
      expect(list).not.toContain('/ciberlunes-y-black-friday-uruguay')
  })

  it('uno de una sola tarjeta se queda en la tarjeta', () => {
    const vivienda = directoriosPorFamilia().find(group => group.familia === 'vivienda')!
    const { compartidos, propios } = analisisDeFamilia(vivienda.entries)
    expect(compartidos).toEqual([])
    expect(propios.alquileres).toContain('/evolucion-precio-alquileres-uruguay')
    expect(propios.ventas).toEqual(['/evolucion-precio-viviendas-uruguay'])
  })
})
