// Las tres páginas del directorio de avisos de equipar: el hub de todas las categorías, la página
// por categoría y la lista del lector. Como los demás tests de página del repo, leen el TEXTO del
// archivo: lo que hay que garantizar es el contrato (un H1, canonical absoluto sin idioma, 404 real,
// noindex cuando hay filtros, JSON-LD sin calificaciones), no reproducir un render.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES = join(__dirname, '..', '..', 'pages', 'equipar-casa-uruguay')
const INDEX_FILE = join(PAGES, 'productos', 'index.vue')
const CATEGORY_FILE = join(PAGES, 'productos', '[categoria].vue')
const LISTA_FILE = join(PAGES, 'mi-lista.vue')
const COMPONENTS = join(__dirname, '..', '..', 'components', 'equipar')

const read = (file: string): string => (existsSync(file) ? readFileSync(file, 'utf8') : '')

function pageMeta(src: string): string {
  const at = src.indexOf('definePageMeta(')
  if (at < 0) return ''
  return src.slice(at, src.indexOf('\n})', at))
}

function template(src: string): string {
  const start = src.indexOf('<template>')
  const end = src.indexOf('\n</template>', start)
  if (start < 0 || end < 0) return ''
  return src.slice(start + '<template>'.length, end).replace(/<!--[\s\S]*?-->/g, '')
}

describe('los archivos existen donde Nuxt los enruta', () => {
  it('productos/index.vue, productos/[categoria].vue y mi-lista.vue', () => {
    expect(existsSync(INDEX_FILE)).toBe(true)
    expect(existsSync(CATEGORY_FILE)).toBe(true)
    expect(existsSync(LISTA_FILE)).toBe(true)
    // La página por categoría de precios sigue siendo un archivo, no un directorio: si se moviera
    // a [categoria]/index.vue el índice de productos quedaría anidado bajo ella.
    expect(existsSync(join(PAGES, '[categoria].vue'))).toBe(true)
  })

  it('los componentes que las páginas montan existen (Nuxt no falla por uno que no resuelve)', () => {
    for (const name of [
      'Directorio',
      'ListingCard',
      'ProductosFilters',
      'ActiveFilters',
      'ListaBar',
    ]) {
      expect(existsSync(join(COMPONENTS, `${name}.vue`))).toBe(true)
    }
  })
})

describe.each([
  ['productos/index.vue', INDEX_FILE, 'https://cambio-uruguay.com${EQUIPAR_PRODUCTOS_PATH}'],
  ['productos/[categoria].vue', CATEGORY_FILE, 'https://cambio-uruguay.com${equiparProductoPath('],
])('%s', (_name, file, canonicalFragment) => {
  const src = read(file)

  it('tiene exactamente un H1 y la raíz es un VContainer', () => {
    expect(template(src).match(/<h1[\s>]/g) ?? []).toHaveLength(1)
    expect(template(src).trimStart().startsWith('<VContainer')).toBe(true)
  })

  it('declara SEO propio con canonical absoluto sin prefijo de idioma', () => {
    expect(src).toMatch(/useSeoMeta\s*\(/)
    expect(src).toMatch(/rel:\s*'canonical'/)
    expect(src).toContain(canonicalFragment)
    expect(src).toContain("defineOgImageComponent('Cambio'")
  })

  it('noindex cuando hay filtros: cada combinación es una copia fina', () => {
    expect(src).toMatch(
      /robots:\s*\(\)\s*=>\s*\(filtered\.value \? 'noindex, follow' : 'index, follow'\)/
    )
  })

  it('monta el directorio compartido y la barra de la lista', () => {
    expect(template(src)).toContain('<EquiparDirectorio')
    expect(template(src)).toContain('<EquiparListaBar')
  })

  it('emite CollectionPage y BreadcrumbList, nunca AggregateRating', () => {
    expect(src).toContain('application/ld+json')
    expect(src).toContain("'@type': 'CollectionPage'")
    expect(src).toContain("'@type': 'BreadcrumbList'")
    expect(src).not.toContain('AggregateRating')
  })
})

describe('productos/[categoria].vue', () => {
  const src = read(CATEGORY_FILE)
  const script = src.slice(src.indexOf('<script setup'))

  it('valida el slug en definePageMeta con la función importada', () => {
    const meta = pageMeta(src)
    expect(meta).toContain('validate')
    expect(meta).toContain('isEquiparCategorySlug')
    expect(script).toMatch(/import\s*\{[^}]*\bisEquiparCategorySlug\b[^}]*\}\s*from/)
  })

  it('fija la categoría por la ruta, no por la query', () => {
    expect(src).toContain('useEquiparProductosDirectorio(slug.value)')
    expect(template(src)).toContain(':fixed-categoria="slug"')
  })

  it('publica hasta 10 Product/Offer con la condición y sin calificaciones', () => {
    expect(src).toContain("'@type': 'ItemList'")
    expect(src).toContain("'@type': 'Product'")
    expect(src).toContain("'@type': 'Offer'")
    expect(src).toContain("priceCurrency: 'UYU'")
    expect(src).toContain('https://schema.org/UsedCondition')
    expect(src).toContain('.slice(0, 10)')
  })

  it('enlaza a la comparativa de precios de la misma categoría', () => {
    expect(template(src)).toContain('`/equipar-casa-uruguay/${slug}`')
  })
})

describe('productos/index.vue', () => {
  const src = read(INDEX_FILE)

  it('enlaza cada categoría a su propio buscador', () => {
    expect(template(src)).toContain('equiparProductoPath(categoria.key)')
    expect(src).toContain('EQUIPAR_CATEGORY_PAGES')
  })
})

describe('mi-lista.vue', () => {
  const src = read(LISTA_FILE)

  it('es del lector: noindex, nofollow, un H1, y nunca manda la lista a ninguna parte', () => {
    expect(template(src).match(/<h1[\s>]/g) ?? []).toHaveLength(1)
    expect(src).toMatch(/robots:\s*'noindex, nofollow'/)
    expect(src).toContain('useEquiparLista()')
    // El único fetch es la verificación de precios por ids: nunca un POST con la lista.
    expect(src).not.toMatch(/method:\s*'POST'/i)
    expect(src).toContain('query: { ids }')
  })

  it('ordena por necesidad, suma y nombra los faltantes del tier S', () => {
    expect(src).toContain('equiparListaOrdenar(')
    expect(src).toContain('equiparListaTotal(')
    expect(src).toContain('equiparListaFaltantes(')
    expect(template(src)).toContain('data-testid="equipar-lista-faltantes"')
  })

  it('la lista se lee sólo en el cliente (sin desajuste de hidratación)', () => {
    expect(template(src)).toContain('<ClientOnly>')
  })
})
