import { describe, expect, it } from 'vitest'
// Vive en la suite del APP a propósito (ver usefulAppsCatalogParity.test.ts): la raíz no puede cargar
// app/, y el app sí puede importar la raíz. El job `currency-productos-vida` cosecha lo que dice
// classes/productosvida/registry.ts y la página dibuja lo que dice app/utils/productosVidaCatalog.ts:
// una clave renombrada, otro orden u otra primera búsqueda de un solo lado deja a la sección sin
// precio, con el test de cada lado en verde. `classes/productosvida/registry.ts` está en
// `appContracts` de deploy.yml para que un cambio sólo del backend corra este test.
import {
  PRODUCTOS_VIDA_CATEGORIES,
  PRODUCTOS_VIDA_META_KEY as ROOT_META_KEY,
} from '../../../classes/productosvida/registry'
import { PRODUCTOS_VIDA_META_KEY } from '../../utils/productosVida'
import { PRODUCTOS_VIDA_PRODUCTS, PRODUCTOS_VIDA_SLUGS } from '../../utils/productosVidaCatalog'

describe('el registro del job y el catálogo de la página son la misma lista', () => {
  it('mismas claves, en el mismo orden', () => {
    expect(PRODUCTOS_VIDA_CATEGORIES.map(c => c.key)).toEqual([...PRODUCTOS_VIDA_SLUGS])
  })

  it('el label del registro es el nombre de la página', () => {
    const byKey = new Map(PRODUCTOS_VIDA_CATEGORIES.map(c => [c.key, c]))
    for (const product of PRODUCTOS_VIDA_PRODUCTS) {
      expect(byKey.get(product.slug)?.label, product.slug).toBe(product.name)
    }
  })

  it('la búsqueda de Mercado Libre de la página es la primera del registro', () => {
    const byKey = new Map(PRODUCTOS_VIDA_CATEGORIES.map(c => [c.key, c]))
    for (const product of PRODUCTOS_VIDA_PRODUCTS) {
      expect(byKey.get(product.slug)?.mlQueries?.[0], product.slug).toBe(product.searchQuery)
    }
  })

  it('las dos puntas leen el mismo documento de meta', () => {
    expect(ROOT_META_KEY).toBe(PRODUCTOS_VIDA_META_KEY)
  })
})
