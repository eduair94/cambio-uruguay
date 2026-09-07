import { describe, expect, it } from 'vitest'
import {
  PRECIOS_MIN_OBSERVATIONS,
  preciosArticleFromSlug,
  preciosFreshnessLabel,
  preciosIndexable,
  preciosPerUnit,
  preciosSlug,
  preciosSpread,
} from '../../utils/preciosCatalog'

describe('preciosSlug', () => {
  it('hace una URL estable del nombre del articulo', () => {
    expect(preciosSlug('Aceite de girasol - Óptimo')).toBe('aceite-de-girasol-optimo')
    expect(preciosSlug('Papel higiénico hoja simple Higienol Sin Fin')).toBe(
      'papel-higienico-hoja-simple-higienol-sin-fin'
    )
    expect(preciosSlug('Té negro en saquitos La Virginia')).toBe('te-negro-en-saquitos-la-virginia')
  })

  it('no deja separadores colgando', () => {
    expect(preciosSlug('  Gaseosa Coca Cola.  ')).toBe('gaseosa-coca-cola')
    // El catalogo real trae nombres con doble espacio interno.
    expect(preciosSlug('Paleta  vacuna con  hueso   ')).toBe('paleta-vacuna-con-hueso')
  })
})

describe('preciosArticleFromSlug', () => {
  const articles = [
    { articleId: 1, name: 'Aceite de girasol - Óptimo', n: 670 },
    { articleId: 114, name: 'Nalga vacuna con  hueso', n: 28 },
  ]

  it('resuelve el slug al articulo', () => {
    expect(preciosArticleFromSlug('aceite-de-girasol-optimo', articles as any)?.articleId).toBe(1)
  })

  it('devuelve null para un slug que no existe', () => {
    expect(preciosArticleFromSlug('no-existe', articles as any)).toBeNull()
    expect(preciosArticleFromSlug('', articles as any)).toBeNull()
  })
})

describe('preciosIndexable', () => {
  it('un articulo con muestra chica no entra al indice', () => {
    // Medido: "Nalga vacuna con hueso" tiene 28 observaciones en todo el pais,
    // contra las 670 del aceite de girasol.
    expect(PRECIOS_MIN_OBSERVATIONS).toBe(30)
    expect(preciosIndexable({ n: 28 })).toBe(false)
    expect(preciosIndexable({ n: 0 })).toBe(false)
    expect(preciosIndexable(null)).toBe(false)
  })

  it('un articulo con muestra amplia si', () => {
    expect(preciosIndexable({ n: 670 })).toBe(true)
    expect(preciosIndexable({ n: 30 })).toBe(true)
  })
})

describe('preciosSpread', () => {
  it('dice cuantas veces se abre el precio del mismo articulo', () => {
    // Medido: el aceite se abre 1,58x y la cinta leuco 4,86x.
    expect(preciosSpread({ min: 92, max: 145 })).toBeCloseTo(1.58, 2)
    expect(preciosSpread({ min: 18.5, max: 90 })).toBeCloseTo(4.86, 2)
  })

  it('no divide por cero', () => {
    expect(preciosSpread({ min: 0, max: 90 })).toBeNull()
    expect(preciosSpread(null)).toBeNull()
  })
})

describe('preciosPerUnit', () => {
  it('normaliza a la unidad de referencia para poder comparar envases', () => {
    // 900 ml a $109 -> $121,11 el litro.
    expect(preciosPerUnit(109, { qty: 900, unit: 'ml' })?.value).toBeCloseTo(121.11, 2)
    expect(preciosPerUnit(109, { qty: 900, unit: 'ml' })?.label).toBe('litro')
    expect(preciosPerUnit(48, { qty: 1, unit: 'kg' })?.value).toBeCloseTo(48, 2)
  })

  it('no inventa un precio por unidad cuando el envase no se pudo leer', () => {
    // Medido: 4 de 215 articulos vienen en "Centimetros" o "Centimetros Cubicos".
    expect(preciosPerUnit(64, { qty: 1, unit: null })).toBeNull()
    expect(preciosPerUnit(64, { qty: null, unit: 'ml' })).toBeNull()
    expect(preciosPerUnit(64, null)).toBeNull()
  })
})

describe('preciosFreshnessLabel', () => {
  it('traduce la frescura que declara el origen', () => {
    expect(preciosFreshnessLabel('fresh')).toMatch(/al d.a/i)
    expect(preciosFreshnessLabel('aging')).toMatch(/d.as/i)
    expect(preciosFreshnessLabel('stale')).toMatch(/dos semanas|quieta/i)
  })
})
