import { describe, expect, it } from 'vitest'
import {
  EQUIPAR_LISTA_MAX,
  EQUIPAR_PRODUCTOS_PATH,
  equiparListaFaltantes,
  equiparListaFromProducto,
  equiparListaOrdenar,
  equiparListaTexto,
  equiparListaTotal,
  equiparListaValida,
  equiparProductoPath,
  equiparProductoPrecio,
  equiparProductosChips,
  equiparProductosFiltered,
  equiparProductosNormalize,
  equiparProductosParams,
  equiparProductosWithout,
  type EquiparListaLine,
  type EquiparProductoPublic,
} from '../../utils/equiparProductos'

const producto = (overrides: Partial<EquiparProductoPublic> = {}): EquiparProductoPublic => ({
  listingId: 'ml:MLU1',
  category: 'heladera',
  categoryLabel: 'Heladera',
  variant: 'media',
  variantLabel: 'Media (250–350 L)',
  tier: 'S',
  rank: 0,
  condition: 'new',
  source: 'mercadolibre',
  sellerKey: 'mercadolibre',
  sellerName: 'Tienda X',
  brand: 'Samsung',
  title: 'Heladera Samsung 300 L',
  url: 'https://articulo.mercadolibre.com.uy/MLU-1',
  image: null,
  price: 30_000,
  currency: 'UYU',
  priceUyu: 30_000,
  listPrice: null,
  location: 'Montevideo',
  freeShipping: true,
  lastSeen: '2026-09-21',
  ...overrides,
})

describe('equiparProductosNormalize', () => {
  it('defaults to page 1, cheapest first, no filters', () => {
    const query = equiparProductosNormalize({})
    expect(query).toEqual({
      categoria: '',
      variante: '',
      condicion: '',
      fuente: '',
      vendedor: '',
      marca: '',
      precioMin: null,
      precioMax: null,
      q: '',
      orden: 'precio_asc',
      page: 1,
    })
  })

  it('rejects what it does not know and clamps the page', () => {
    const query = equiparProductosNormalize({
      categoria: 'heladera',
      variante: 'media',
      condicion: 'x',
      fuente: 'tienda',
      orden: 'foo',
      page: '0',
      precioMin: 'abc',
      precioMax: '  45000 ',
      q: ['a', 'b'],
    })
    expect(query.categoria).toBe('heladera')
    expect(query.variante).toBe('media')
    expect(query.condicion).toBe('')
    expect(query.fuente).toBe('tienda')
    expect(query.orden).toBe('precio_asc')
    expect(query.page).toBe(1)
    expect(query.precioMin).toBeNull()
    expect(query.precioMax).toBe(45_000)
    expect(query.q).toBe('a')
  })

  it('an unknown category slug is dropped, and a variant without a category too', () => {
    expect(equiparProductosNormalize({ categoria: 'yate' }).categoria).toBe('')
    expect(equiparProductosNormalize({ variante: 'media' }).variante).toBe('')
  })

  it('caps the free text', () => {
    expect(equiparProductosNormalize({ q: 'x'.repeat(200) }).q).toHaveLength(80)
  })
})

describe('equiparProductosParams / Filtered / Without', () => {
  it('serialises only what is set', () => {
    const query = equiparProductosNormalize({ categoria: 'heladera', precioMax: '40000', page: '3' })
    expect(equiparProductosParams(query)).toEqual({
      categoria: 'heladera',
      precioMax: '40000',
      page: '3',
    })
    expect(equiparProductosParams(equiparProductosNormalize({}))).toEqual({})
  })

  it('page and order are not filters; anything else is', () => {
    expect(equiparProductosFiltered(equiparProductosNormalize({ page: '2', orden: 'reciente' }))).toBe(
      false
    )
    expect(equiparProductosFiltered(equiparProductosNormalize({ marca: 'samsung' }))).toBe(true)
  })

  it('without() clears the keys and goes back to page 1', () => {
    const query = equiparProductosNormalize({ marca: 'samsung', precioMin: '1000', page: '4' })
    const next = equiparProductosWithout(query, ['marca'])
    expect(next.marca).toBe('')
    expect(next.precioMin).toBe(1000)
    expect(next.page).toBe(1)
  })

  it('removing the category also removes its variant', () => {
    const query = equiparProductosNormalize({ categoria: 'heladera', variante: 'media' })
    expect(equiparProductosWithout(query, ['categoria']).variante).toBe('')
  })
})

describe('equiparProductosChips', () => {
  it('one chip per filter, names from the facets, each range end on its own', () => {
    const query = equiparProductosNormalize({
      categoria: 'heladera',
      condicion: 'usado',
      fuente: 'facebook',
      marca: 'samsung',
      precioMin: '1000',
      precioMax: '50000',
      q: 'inverter',
    })
    const chips = equiparProductosChips(query, {
      categorias: [{ slug: 'heladera', name: 'Heladera', count: 3 }],
      variantes: [],
      marcas: [{ slug: 'samsung', name: 'Samsung', count: 2 }],
      vendedores: [],
      fuentes: [],
      condiciones: [],
    })
    const labels = chips.map(chip => chip.label)
    expect(labels).toContain('Heladera')
    expect(labels).toContain('Usado')
    expect(labels).toContain('Facebook Marketplace')
    expect(labels).toContain('Samsung')
    expect(labels).toContain('Desde $ 1.000')
    expect(labels).toContain('Hasta $ 50.000')
    expect(labels).toContain('“inverter”')
    expect(chips.find(chip => chip.label === 'Desde $ 1.000')?.keys).toEqual(['precioMin'])
  })

  it('a category fixed by the route is not a chip', () => {
    const query = equiparProductosNormalize({ categoria: 'heladera', condicion: 'nuevo' })
    const chips = equiparProductosChips(query, undefined, 'heladera')
    expect(chips.map(chip => chip.label)).toEqual(['Nuevo'])
  })
})

describe('paths and money', () => {
  it('builds the per-category path', () => {
    expect(equiparProductoPath('heladera')).toBe(`${EQUIPAR_PRODUCTOS_PATH}/heladera`)
  })

  it('prints the price in its own currency', () => {
    expect(equiparProductoPrecio(producto())).toBe('$ 30.000')
    expect(equiparProductoPrecio(producto({ currency: 'USD', price: 750 }))).toBe('US$ 750')
  })
})

describe('la lista', () => {
  const lines: EquiparListaLine[] = [
    equiparListaFromProducto(
      producto({ listingId: 'b', category: 'olla', categoryLabel: 'Olla', tier: 'S', rank: 11, priceUyu: 2_000 })
    ),
    equiparListaFromProducto(
      producto({ listingId: 'c', category: 'tv', categoryLabel: 'Televisor', tier: 'B', rank: 6, priceUyu: 15_000 })
    ),
    equiparListaFromProducto(producto({ listingId: 'a', priceUyu: 30_000 })),
  ]

  it('a line is a snapshot of the listing, with the day it was added', () => {
    const line = lines[2]!
    expect(line.listingId).toBe('a')
    expect(line.title).toBe('Heladera Samsung 300 L')
    expect(line.priceUyu).toBe(30_000)
    expect(line.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(equiparListaValida(line)).toBe(true)
    expect(equiparListaValida({ listingId: 'x' })).toBe(false)
    expect(equiparListaValida(null)).toBe(false)
  })

  it('sorts by tier then registry rank — the necessity order, never price', () => {
    expect(equiparListaOrdenar(lines).map(line => line.listingId)).toEqual(['a', 'b', 'c'])
  })

  it('totals in pesos', () => {
    expect(equiparListaTotal(lines)).toBe(47_000)
    expect(equiparListaTotal([])).toBe(0)
  })

  it('names the tier-S categories the list still lacks', () => {
    const faltantes = equiparListaFaltantes(lines, [
      { key: 'heladera', label: 'Heladera', tier: 'S' },
      { key: 'colchon', label: 'Colchón', tier: 'S' },
      { key: 'olla', label: 'Olla', tier: 'S' },
      { key: 'tv', label: 'Televisor', tier: 'B' },
      { key: 'sofa', label: 'Sofá', tier: 'B' },
    ])
    expect(faltantes).toEqual([{ key: 'colchon', label: 'Colchón' }])
  })

  it('writes the list as plain text, one line per item, with the total', () => {
    const text = equiparListaTexto(lines, 40)
    expect(text).toContain(
      'Heladera — Heladera Samsung 300 L — $ 30.000 — https://articulo.mercadolibre.com.uy/MLU-1'
    )
    expect(text).toContain('Total: $ 47.000 (≈ US$ 1.175)')
    expect(text.split('\n')[0]).toMatch(/^Mi lista para equipar la casa/)
  })

  it('has a ceiling', () => {
    expect(EQUIPAR_LISTA_MAX).toBe(60)
  })
})
