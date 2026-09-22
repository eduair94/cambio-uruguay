// El directorio con filtros de /monopatines-electricos-uruguay y /bicicletas-electricas-uruguay.
//
// Como los demás tests de esta carpeta, lee el TEXTO de los archivos: lo que hay que garantizar es
// que las dos rutas compartan el mismo cuerpo (y por lo tanto no puedan derivar), que la de
// movilidad lea SU colección y no la de equipar, y que las dos páginas monten la grilla sin el
// botón de "mi lista", que es de equipar una casa y no de un monopatín.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { equiparProductosNormalize } from '../../utils/equiparProductos'
import { equiparProductosMatch } from '../../server/utils/equiparProductos'

const APP = join(__dirname, '..', '..')
const read = (...parts: string[]): string => readFileSync(join(APP, ...parts), 'utf8')

const movilidadRoute = read('server', 'api', 'movilidad', 'productos.get.ts')
const equiparRoute = read('server', 'api', 'equipar', 'productos.get.ts')
const shared = read('server', 'utils', 'retailProductos.ts')
const composable = read('composables', 'useEquiparProductosDirectorio.ts')
const listingCard = read('components', 'equipar', 'ListingCard.vue')
const directorio = read('components', 'equipar', 'Directorio.vue')
const monopatinPage = read('pages', 'monopatines-electricos-uruguay.vue')
const bicicletaPage = read('pages', 'bicicletas-electricas-uruguay.vue')

describe('GET /api/movilidad/productos', () => {
  it('lee movilidadlistings, nunca la colección de equipar', () => {
    expect(movilidadRoute).toContain('MovilidadListingModel')
    expect(movilidadRoute).not.toContain('EquiparListingModel')
  })

  it('comparte el cuerpo con la ruta de equipar en vez de copiarlo', () => {
    // Una faceta contada mal, o una página de más, tienen que poder arreglarse UNA vez.
    expect(movilidadRoute).toContain('retailProductosResponse')
    expect(equiparRoute).toContain('retailProductosResponse')
  })

  it('la fecha de la corrida sale del meta de movilidad', () => {
    expect(movilidadRoute).toContain('MovilidadMetaModel')
    expect(movilidadRoute).toContain('MOVILIDAD_META_KEY')
  })
})

describe('el cuerpo compartido de los dos directorios', () => {
  it('nunca sirve una fila que la banda marcó como sospechosa', () => {
    // La regla vive en `equiparProductosMatch` (`suspect: false` incondicional); acá se verifica
    // que este cuerpo la use y no arme su propio `$match`.
    expect(shared).toContain('equiparProductosMatch')
    expect(shared).toContain('EQUIPAR_PRODUCTOS_PROJECTION')
  })

  it('la lista guardada del lector (?ids=) no queda en una caché compartida', () => {
    expect(shared).toContain("'cache-control', 'private, no-store'")
  })

  it('un fallo de base no se cachea', () => {
    expect(shared).toContain("setResponseHeader(event, 'cache-control', 'no-store')")
  })
})

describe('el estado del directorio', () => {
  it('la página elige a qué API le pide, con su propia clave de useAsyncData', () => {
    expect(composable).toContain("options.apiPath ?? '/api/equipar/productos'")
    expect(composable).toContain('options.key ??')
  })

  it('las dos páginas de movilidad piden a su propia API, con claves distintas', () => {
    for (const src of [monopatinPage, bicicletaPage]) {
      expect(src).toContain("apiPath: '/api/movilidad/productos'")
    }
    expect(monopatinPage).toContain("key: 'movilidad-productos-monopatin'")
    expect(bicicletaPage).toContain("key: 'movilidad-productos-bicicleta'")
  })

  it('cada página fija su categoría y esconde el botón de "mi lista"', () => {
    expect(monopatinPage).toContain('fixed-categoria="monopatin-electrico"')
    expect(bicicletaPage).toContain('fixed-categoria="bicicleta-electrica"')
    for (const src of [monopatinPage, bicicletaPage]) {
      expect(src).toMatch(/<EquiparDirectorio[\s\S]*?hide-list[\s\S]*?\/>/)
    }
  })
})

describe('la grilla compartida sin "mi lista"', () => {
  it('la tarjeta esconde el botón y el directorio no toca la lista', () => {
    expect(listingCard).toContain('v-if="!hideList"')
    expect(directorio).toContain('if (props.hideList) return')
  })

  it('un aviso de movilidad sin foto no cae en el ícono de equipar la casa', () => {
    expect(listingCard).toContain('mdi-scooter-electric')
    expect(listingCard).toContain('mdi-bicycle-electric')
  })
})

describe('la categoría se valida contra el vocabulario de quien pregunta', () => {
  // El bug, medido en producción el 22/9/2026 con la primera corrida cargada: el normalizador
  // validaba SIEMPRE contra las categorías de equipar, así que `?categoria=monopatin-electrico` se
  // caía en silencio y el directorio de monopatines devolvía las 614 filas — bicicletas incluidas.
  it('una categoría de movilidad sobrevive al normalizador de su propia vertical', () => {
    expect(
      equiparProductosNormalize({ categoria: 'monopatin-electrico' }, 'movilidad').categoria
    ).toBe('monopatin-electrico')
    expect(
      equiparProductosNormalize({ categoria: 'bicicleta-electrica' }, 'movilidad').categoria
    ).toBe('bicicleta-electrica')
  })

  it('y llega al $match, que es lo que separa un directorio del otro', () => {
    const query = equiparProductosNormalize({ categoria: 'monopatin-electrico' }, 'movilidad')
    expect(equiparProductosMatch(query, '2026-09-18').category).toBe('monopatin-electrico')
  })

  it('sigue descartando una categoría inventada, y la de la otra vertical', () => {
    expect(equiparProductosNormalize({ categoria: 'zapatos' }, 'movilidad').categoria).toBe('')
    expect(equiparProductosNormalize({ categoria: 'heladera' }, 'movilidad').categoria).toBe('')
    expect(equiparProductosNormalize({ categoria: 'monopatin-electrico' }).categoria).toBe('')
  })

  it('una variante sólo viaja con su categoría válida', () => {
    const query = equiparProductosNormalize(
      { categoria: 'monopatin-electrico', variante: 'urbano' },
      'movilidad'
    )
    expect(query.variante).toBe('urbano')
    expect(
      equiparProductosNormalize({ categoria: 'monopatin-electrico', variante: 'urbano' }).variante
    ).toBe('')
  })

  it('la ruta, el panel y las dos páginas declaran la vertical', () => {
    expect(movilidadRoute).toContain("vertical: 'movilidad'")
    expect(read('components', 'equipar', 'ProductosFilters.vue')).toContain('props.vertical')
    for (const src of [monopatinPage, bicicletaPage]) {
      expect(src).toContain("vertical: 'movilidad'")
      expect(src).toContain('vertical="movilidad"')
    }
  })
})
