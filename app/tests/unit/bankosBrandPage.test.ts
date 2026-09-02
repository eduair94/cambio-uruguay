// El corte decide cuántas URLs existen, así que es el producto.
//
// Todos los números y nombres de acá salen del catálogo vivo medido el 2026-09-02 (2.068 marcas,
// 4.304 locales) y de la demanda medida en el archivo propio de Search Console.
import { describe, expect, it } from 'vitest'
import {
  BRAND_PAGE_MIN_ISSUERS,
  BRAND_PAGE_MIN_LOCATIONS,
  brandPageRationale,
  buildBrandPageIndex,
  findBrandBySlug,
  qualifiesForBrandPage,
} from '../../utils/bankosBrandPage'
import type { BrandRow } from '../../utils/bankosBrands'

const brand = (
  name: string,
  locations: number,
  issuers: number,
  categories: string[] = ['Mercados']
): BrandRow => ({
  brandId: name.toLowerCase().replace(/\s+/g, '_'),
  name,
  categories,
  locations,
  offers: Array.from({ length: issuers }, (_, i) => ({
    bankId: `banco${i}`,
    credit: 0,
    debit: -1,
    days: null,
  })),
})

describe('qualifiesForBrandPage', () => {
  it('acepta la cadena: la página contesta DÓNDE', () => {
    // Farmashop: 96 locales, 2 emisores. Nadie sabe de memoria en cuáles aplica.
    expect(qualifiesForBrandPage(brand('Farmashop', 96, 2))).toBe(true)
    // Heladería Las Delicias: 4 locales, 1 emisor — y ya está en posición 1 para "las delicias 2x1"
    // sin tener página. El umbral es 4 justamente para que entre: con 5 se perdía.
    expect(qualifiesForBrandPage(brand('Heladería Las Delicias', 4, 1))).toBe(true)
    // Con tres no alcanza: es el tramo más delgado y ninguna de esas marcas tiene demanda medida.
    expect(qualifiesForBrandPage(brand('Tres locales sueltos', 3, 1))).toBe(false)
  })

  it('acepta la comparación: la página contesta CON CUÁL', () => {
    // LIFE Cinemas: 4 locales pero CUATRO emisores. Ninguna otra página del sitio contesta
    // "cuál de mis tarjetas conviene acá".
    expect(qualifiesForBrandPage(brand('LIFE Cinemas', 4, 4, ['Cines']))).toBe(true)
    // Dos emisores alcanzan aunque haya un solo local: ya hay algo que comparar.
    expect(qualifiesForBrandPage(brand('Farmacia Vanthoff', 1, 3, ['Farmacias']))).toBe(true)
  })

  it('rechaza la marca de un local y un emisor, que es el 82 % del catálogo', () => {
    // 1.698 de 2.068 marcas están acá. Una página por cada una diría siempre lo mismo: es el caso
    // de manual de la política de contenido generado a escala.
    expect(qualifiesForBrandPage(brand('Kiosco de la esquina', 1, 1))).toBe(false)
    expect(qualifiesForBrandPage(brand('Peluquería', 2, 1))).toBe(false)
  })

  it('los umbrales son los medidos, no números redondos al azar', () => {
    expect(BRAND_PAGE_MIN_LOCATIONS).toBe(4)
    expect(BRAND_PAGE_MIN_ISSUERS).toBe(2)
  })
})

describe('buildBrandPageIndex', () => {
  it('deja afuera lo que no califica', () => {
    const index = buildBrandPageIndex([
      brand('Farmashop', 96, 2, ['Farmacias']),
      brand('Kiosco', 1, 1),
      brand('LIFE Cinemas', 4, 4, ['Cines']),
    ])
    expect(index.map(e => e.name)).toEqual(['Farmashop', 'LIFE Cinemas'])
  })

  it('hace el slug sin tildes ni mayúsculas', () => {
    const index = buildBrandPageIndex([brand('Óptica Florida', 39, 1, ['Ópticas'])])
    expect(index[0].slug).toBe('optica-florida')
  })

  it('resuelve una colisión sin robarle la URL a la marca que la gente busca', () => {
    const big = { ...brand('Delicias', 40, 1), brandId: 'zzz_grande' }
    const small = { ...brand('Delicias', 4, 1), brandId: 'aaa_chica' }
    // La chica llega primero en el array, y aun así la grande se queda el slug limpio.
    const index = buildBrandPageIndex([small, big])
    expect(index.find(e => e.brandId === 'zzz_grande')!.slug).toBe('delicias')
    expect(index.find(e => e.brandId === 'aaa_chica')!.slug).toBe('delicias-aaa-chica')
  })

  it('el slug no depende del orden de llegada — una URL que cambia de dueño es un 404', () => {
    const a = { ...brand('Igual', 5, 1), brandId: 'b_uno' }
    const b = { ...brand('Igual', 5, 1), brandId: 'a_dos' }
    const first = buildBrandPageIndex([a, b])
    const second = buildBrandPageIndex([b, a])
    expect(first.map(e => `${e.brandId}:${e.slug}`).sort()).toEqual(
      second.map(e => `${e.brandId}:${e.slug}`).sort()
    )
  })

  it('nunca produce un slug vacío, ni con un nombre de puros símbolos', () => {
    const weird = { ...brand('***', 5, 1), brandId: 'raro_1' }
    const index = buildBrandPageIndex([weird])
    expect(index[0].slug).toBe('raro-1')
    expect(index[0].slug.length).toBeGreaterThan(0)
  })

  it('todos los slugs son únicos', () => {
    const rows = [
      brand('Tienda Inglesa', 20, 1),
      brand('Tata', 81, 4),
      brand('Ancap', 152, 2, ['Vehículos']),
      { ...brand('Tata', 4, 1), brandId: 'tata_otro' },
    ]
    const slugs = buildBrandPageIndex(rows).map(e => e.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('ordena por locales, que es el orden en que se listan', () => {
    const index = buildBrandPageIndex([
      brand('Chica', 4, 1),
      brand('Ancap', 152, 2),
      brand('Media', 20, 1),
    ])
    expect(index.map(e => e.name)).toEqual(['Ancap', 'Media', 'Chica'])
  })
})

describe('findBrandBySlug', () => {
  const index = buildBrandPageIndex([brand('Farmashop', 96, 2, ['Farmacias'])])

  it('encuentra sin importar mayúsculas', () => {
    expect(findBrandBySlug(index, 'FARMASHOP')!.name).toBe('Farmashop')
  })

  it('devuelve null en vez de lanzar: la ruta contesta 404, no 500', () => {
    expect(findBrandBySlug(index, 'no-existe')).toBeNull()
    expect(findBrandBySlug(index, '')).toBeNull()
  })
})

describe('brandPageRationale', () => {
  it('dice por qué existe cada página', () => {
    const index = buildBrandPageIndex([
      brand('Tata', 81, 4),
      brand('LIFE Cinemas', 1, 4, ['Cines']),
      brand('Las Delicias', 4, 1, ['Heladerías']),
    ])
    const by = (name: string) => brandPageRationale(index.find(e => e.name === name)!)
    expect(by('Tata')).toMatch(/varios emisores/)
    expect(by('LIFE Cinemas')).toMatch(/varios emisores/)
    expect(by('Las Delicias')).toMatch(/varios locales/)
  })
})
