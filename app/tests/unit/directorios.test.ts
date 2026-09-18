import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adDensityForPath } from '../../utils/ads'
import {
  DIRECTORIOS,
  DIRECTORIOS_CON_CIFRA,
  DIRECTORIO_FAMILIAS,
  directorioCifra,
  directorioRoutes,
  directoriosPorFamilia,
} from '../../utils/directorios'
import { navRoutes } from '../../utils/siteNav'

const PAGES_DIR = join(__dirname, '..', '..', 'pages')
const API_ROUTE = join(__dirname, '..', '..', 'server', 'api', 'directorios.get.ts')

/** Una ruta estática del sitio existe si tiene `<ruta>.vue` o `<ruta>/index.vue` en pages/. */
function pageExists(route: string): boolean {
  const base = join(PAGES_DIR, ...route.split('/').filter(Boolean))
  return existsSync(`${base}.vue`) || existsSync(join(base, 'index.vue'))
}

describe('el registro de directorios', () => {
  it('no repite claves ni rutas principales', () => {
    const ids = DIRECTORIOS.map(entry => entry.id)
    const routes = DIRECTORIOS.map(entry => entry.to)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('cada ruta que enlaza, principal o secundaria, es una página que existe', () => {
    for (const route of directorioRoutes()) expect(pageExists(route), route).toBe(true)
  })

  // Un índice de enlaces, como /herramientas y /mapa-del-sitio: una unidad al final, nunca entre
  // las tarjetas. El default (`normal`) metería anuncios adentro de la grilla.
  it('el hub lleva la densidad de anuncios de un índice, no la de una nota', () => {
    expect(adDensityForPath('/directorios-uruguay')).toBe('light')
    expect(adDensityForPath('/en/directorios-uruguay')).toBe('light')
  })

  it('cada directorio está en la navegación, y por eso en el sitemap', () => {
    const nav = navRoutes()
    for (const entry of DIRECTORIOS) expect(nav, entry.to).toContain(entry.to)
    expect(nav).toContain('/directorios-uruguay')
  })

  it('toda familia declarada tiene al menos un directorio, y todo directorio una familia válida', () => {
    for (const familia of DIRECTORIO_FAMILIAS)
      expect(
        DIRECTORIOS.some(entry => entry.familia === familia),
        familia
      ).toBe(true)
    for (const entry of DIRECTORIOS) expect(DIRECTORIO_FAMILIAS).toContain(entry.familia)
  })

  it('agrupa por familia sin perder ni reordenar directorios', () => {
    const grupos = directoriosPorFamilia()
    expect(grupos.map(g => g.familia)).toEqual([...DIRECTORIO_FAMILIAS])
    const flat = grupos.flatMap(g => g.entries.map(e => e.id))
    const expected = DIRECTORIO_FAMILIAS.flatMap(f =>
      DIRECTORIOS.filter(e => e.familia === f).map(e => e.id)
    )
    expect(flat).toEqual(expected)
    expect(flat).toHaveLength(DIRECTORIOS.length)
  })

  it('cada cifra lleva su sustantivo: nunca un "resultados" que esconda qué se contó', () => {
    for (const entry of DIRECTORIOS) {
      expect(entry.unidad.trim().length, entry.id).toBeGreaterThan(0)
      expect(entry.unidad, entry.id).not.toMatch(/resultado|ítems?|items?|registros?/i)
    }
  })

  it('ninguna descripción promete ni rankea', () => {
    for (const entry of DIRECTORIOS) {
      expect(entry.queCompara, entry.id).not.toMatch(
        /\b(mejor(es)?|el más barato|garantizad|imbatible|número uno|top)\b/i
      )
    }
  })

  it('sólo los directorios con cifra se le piden a la API', () => {
    const sinCifra = DIRECTORIOS.filter(e => e.fuente === 'sin-cifra').map(e => e.id)
    for (const id of sinCifra) expect(DIRECTORIOS_CON_CIFRA).not.toContain(id)
    expect(DIRECTORIOS_CON_CIFRA).toHaveLength(DIRECTORIOS.length - sinCifra.length)
  })

  // La ruta no se importa acá (necesitaría los modelos de Mongo): se lee su fuente. El test de la
  // ruta (`directoriosApi.test.ts`) prueba los adaptadores; éste sólo garantiza que ninguno falte.
  it('la API tiene un adaptador para cada directorio que declara cifra', () => {
    const source = readFileSync(API_ROUTE, 'utf8')
    for (const id of DIRECTORIOS_CON_CIFRA)
      expect(source, id).toMatch(new RegExp(`\\b(async ${id}\\(\\)|${id}: cifra\\()`))
  })
})

describe('directorioCifra', () => {
  it('publica una cifra positiva con su fecha', () => {
    expect(directorioCifra({ autos: { count: 12480, asOf: '2026-09-18' } }, 'autos')).toEqual({
      count: 12480,
      asOf: '2026-09-18',
    })
  })

  it('nunca publica un cero: siempre quiere decir que no se pudo leer', () => {
    expect(directorioCifra({ autos: { count: 0, asOf: '2026-09-18' } }, 'autos')).toBeNull()
  })

  it('descarta una cifra ausente, nula, negativa o no finita', () => {
    expect(directorioCifra({}, 'autos')).toBeNull()
    expect(directorioCifra(null, 'autos')).toBeNull()
    expect(directorioCifra(undefined, 'autos')).toBeNull()
    expect(directorioCifra({ autos: { count: null, asOf: null } }, 'autos')).toBeNull()
    expect(directorioCifra({ autos: { count: -3, asOf: null } }, 'autos')).toBeNull()
    expect(directorioCifra({ autos: { count: Number.NaN, asOf: null } }, 'autos')).toBeNull()
    expect(
      directorioCifra({ autos: { count: Number.POSITIVE_INFINITY, asOf: null } }, 'autos')
    ).toBeNull()
  })

  it('publica la cifra aunque la fuente no declare fecha', () => {
    expect(directorioCifra({ tiendas: { count: 80, asOf: null } }, 'tiendas')).toEqual({
      count: 80,
      asOf: null,
    })
  })
})
