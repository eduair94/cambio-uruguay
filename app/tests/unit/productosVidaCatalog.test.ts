import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { isEquiparCategorySlug } from '../../utils/equiparCategoryPages'
import {
  PRODUCTOS_VIDA_GROUPS,
  PRODUCTOS_VIDA_LEFT_OUT,
  PRODUCTOS_VIDA_NO_PRICE,
  PRODUCTOS_VIDA_PRODUCTS,
  PRODUCTOS_VIDA_SLUGS,
  PRODUCTOS_VIDA_THREAD,
} from '../../utils/productosVidaCatalog'

const PAGES = resolve(__dirname, '../../pages')

/** Una ruta del sitio existe si hay una página para ella, o es una categoría de equipar. */
function routeExists(to: string): boolean {
  const path = to.replace(/^\//, '')
  if (existsSync(resolve(PAGES, `${path}.vue`))) return true
  if (existsSync(resolve(PAGES, path, 'index.vue'))) return true
  const equipar = /^equipar-casa-uruguay\/([a-z-]+)$/.exec(path)
  return Boolean(equipar && isEquiparCategorySlug(equipar[1]!))
}

const allTexts = (): string[] => [
  ...PRODUCTOS_VIDA_PRODUCTS.flatMap(p => [
    p.name,
    p.phrase,
    p.why,
    p.lookFor,
    p.threadNote ?? '',
    p.related?.label ?? '',
  ]),
  ...PRODUCTOS_VIDA_NO_PRICE.flatMap(n => [n.label, n.why, n.related?.label ?? '']),
  ...PRODUCTOS_VIDA_GROUPS.map(g => g.label),
  PRODUCTOS_VIDA_LEFT_OUT,
]

describe('el catálogo editorial del hilo', () => {
  it('va en el orden del hilo: más personas primero y, a igual cantidad, por nombre', () => {
    const sorted = [...PRODUCTOS_VIDA_PRODUCTS].sort(
      (a, b) =>
        b.mentions - a.mentions || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    )
    expect(PRODUCTOS_VIDA_PRODUCTS.map(p => p.slug)).toEqual(sorted.map(p => p.slug))
  })

  it('26 productos con slugs únicos, en kebab-case y sin dígitos', () => {
    expect(PRODUCTOS_VIDA_PRODUCTS).toHaveLength(26)
    expect(new Set(PRODUCTOS_VIDA_SLUGS).size).toBe(26)
    for (const slug of PRODUCTOS_VIDA_SLUGS) expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/)
    expect(PRODUCTOS_VIDA_SLUGS).not.toContain('enchufe-inteligente')
    expect(PRODUCTOS_VIDA_SLUGS).not.toContain('smartwatch')
  })

  it('cada grupo se usa y cada producto cae en un grupo que existe', () => {
    const ids = new Set(PRODUCTOS_VIDA_GROUPS.map(g => g.id))
    for (const product of PRODUCTOS_VIDA_PRODUCTS) expect(ids.has(product.group)).toBe(true)
    for (const group of PRODUCTOS_VIDA_GROUPS) {
      expect(
        PRODUCTOS_VIDA_PRODUCTS.some(p => p.group === group.id),
        group.id
      ).toBe(true)
    }
  })

  it('las menciones son enteros de 1 para arriba', () => {
    for (const product of PRODUCTOS_VIDA_PRODUCTS) {
      expect(Number.isInteger(product.mentions)).toBe(true)
      expect(product.mentions).toBeGreaterThanOrEqual(1)
    }
  })

  it('los íconos son nombres literales de mdi', () => {
    for (const icon of [
      ...PRODUCTOS_VIDA_PRODUCTS.map(p => p.icon),
      ...PRODUCTOS_VIDA_GROUPS.map(g => g.icon),
    ]) {
      expect(icon).toMatch(/^mdi-[a-z0-9-]+$/)
    }
  })

  it('ningún texto nombra a un usuario, cita entre comillas ni vende', () => {
    const banned = ['u/', '@', '"', '«', '»', '“', '”', '¡']
    const words = ['imprescindible', 'increíble', 'los mejores', 'ofertón']
    for (const text of allTexts()) {
      for (const token of banned) expect(text, text).not.toContain(token)
      for (const word of words) expect(text.toLowerCase(), text).not.toContain(word)
    }
  })

  it('ningún porqué ni nota del hilo trae un monto en pesos o un porcentaje', () => {
    for (const product of PRODUCTOS_VIDA_PRODUCTS) {
      for (const text of [product.why, product.threadNote ?? '']) {
        expect(text, product.slug).not.toMatch(/\$\s?\d/)
        expect(text, product.slug).not.toContain('%')
      }
    }
  })

  it('cada frase empieza con su artículo: de ahí salen el conteo, la bajada y la búsqueda', () => {
    for (const product of PRODUCTOS_VIDA_PRODUCTS) {
      expect(product.phrase, product.slug).toMatch(/^(el|la|los|las) /)
    }
  })

  it('la búsqueda de Mercado Libre no lleva tildes ni mayúsculas (nunca se imprime)', () => {
    for (const product of PRODUCTOS_VIDA_PRODUCTS) {
      expect(product.searchQuery, product.slug).toMatch(/^[a-z0-9 ]+$/)
    }
  })

  it('cada enlace interno va a una página que existe', () => {
    const targets = [
      ...PRODUCTOS_VIDA_PRODUCTS.map(p => p.related?.to),
      ...PRODUCTOS_VIDA_NO_PRICE.map(n => n.related?.to),
    ].filter((to): to is string => Boolean(to))
    expect(targets.length).toBeGreaterThan(10)
    for (const to of targets) expect(routeExists(to), to).toBe(true)
  })

  it('el hilo: su URL, y que se leyó después de publicarse', () => {
    expect(PRODUCTOS_VIDA_THREAD.url).toBe(
      'https://www.reddit.com/r/uruguay/comments/1y09jec/que_producto_les_cambio_la_vida/'
    )
    expect(PRODUCTOS_VIDA_THREAD.readOn >= PRODUCTOS_VIDA_THREAD.postedOn).toBe(true)
    expect(PRODUCTOS_VIDA_THREAD.comments).toBe(81)
  })

  it('la lista sin precio: ids únicos, con el reloj y la casa automatizada', () => {
    const ids = PRODUCTOS_VIDA_NO_PRICE.map(n => n.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('automatizar-la-casa')
    expect(ids).toContain('reloj-inteligente')
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)
  })
})
