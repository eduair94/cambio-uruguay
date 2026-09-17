// /monopatines-electricos-uruguay y /bicicletas-electricas-uruguay.
//
// Como los demás tests de página del repo (equiparCategoryPage.test.ts, storePages.test.ts), lee
// el TEXTO del archivo: lo que hay que garantizar es que la plantilla y el setup declaren el
// contrato (un solo H1, canonical literal, JSON-LD con migas, FAQ, sin ficha de tienda inventada),
// no reproducir un render con el runtime de Nuxt.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES = join(__dirname, '..', '..', 'pages')
const MONOPATIN_FILE = join(PAGES, 'monopatines-electricos-uruguay.vue')
const BICICLETA_FILE = join(PAGES, 'bicicletas-electricas-uruguay.vue')

const read = (file: string): string => readFileSync(file, 'utf8')

/** Lo que va entre el primer `<template>` y su cierre de nivel superior, sin comentarios. */
function template(src: string): string {
  const start = src.indexOf('<template>')
  const end = src.indexOf('\n</template>', start)
  return src.slice(start + '<template>'.length, end).replace(/<!--[\s\S]*?-->/g, '')
}

const PAGES_UNDER_TEST: Array<{
  file: string
  h1: string
  canonical: string
  crumbLabel: string
  hasModelsTable: boolean
  siblingHref: string
}> = [
  {
    file: MONOPATIN_FILE,
    h1: 'Precio de monopatines eléctricos en Uruguay',
    canonical: 'https://cambio-uruguay.com/monopatines-electricos-uruguay',
    crumbLabel: 'Monopatines eléctricos',
    hasModelsTable: true,
    siblingHref: '/bicicletas-electricas-uruguay',
  },
  {
    file: BICICLETA_FILE,
    h1: 'Precio de bicicletas eléctricas en Uruguay',
    canonical: 'https://cambio-uruguay.com/bicicletas-electricas-uruguay',
    crumbLabel: 'Bicicletas eléctricas',
    hasModelsTable: false,
    siblingHref: '/monopatines-electricos-uruguay',
  },
]

describe.each(PAGES_UNDER_TEST)(
  '$file',
  ({ file, h1, canonical, crumbLabel, hasModelsTable, siblingHref }) => {
    const src = read(file)
    const tpl = template(src)

    it('renderiza exactamente un H1 con el texto exacto del brief', () => {
      const h1s = tpl.match(/<h1[^>]*>[\s\S]*?<\/h1>/g) ?? []
      expect(h1s).toHaveLength(1)
      expect(h1s[0]).toContain(h1)
    })

    it('la raíz del template es un VContainer', () => {
      expect(tpl.trim().startsWith('<VContainer')).toBe(true)
    })

    it('declara useSeoMeta con title/description/ogTitle/ogDescription', () => {
      expect(src).toMatch(/useSeoMeta\s*\(/)
      expect(src).toMatch(/\btitle:/)
      expect(src).toMatch(/\bdescription:/)
      expect(src).toMatch(/ogTitle:/)
      expect(src).toMatch(/ogDescription:/)
    })

    it('el canonical es literal y absoluto, nunca construido con localePath', () => {
      expect(src).toContain(`const CANONICAL = '${canonical}'`)
      expect(src).toMatch(/rel:\s*'canonical'/)
      // La constante del canonical nunca se arma llamando a `localePath(`.
      const canonicalLine = src.split('\n').find(line => line.includes('const CANONICAL ='))
      expect(canonicalLine).not.toContain('localePath(')
    })

    it('nunca se noindexa', () => {
      expect(src).not.toMatch(/noindex/i)
      expect(src).not.toMatch(/robots:\s*['"]none/i)
    })

    it('ships BreadcrumbList JSON-LD with the canonical as the leaf', () => {
      expect(src).toContain('application/ld+json')
      expect(src).toContain('https://schema.org')
      expect(src).toContain('BreadcrumbList')
      expect(src).toContain(crumbLabel)
    })

    it(
      hasModelsTable
        ? 'incluye ItemList de modelos cuando hay'
        : 'no arma una tabla de modelos (régimen commodity)',
      () => {
        if (hasModelsTable) {
          expect(src).toContain('ItemList')
          expect(src).toContain('productsLd')
        } else {
          expect(src).not.toContain('productsLd')
          expect(tpl).not.toContain('Modelos y sus mejores ofertas')
        }
      }
    )

    it('usa el bloque de normativa compartido', () => {
      expect(tpl).toContain('<MovilidadNormativaTable')
    })

    it('tiene una sección "cómo elegir" que dice explícitamente que no recomienda marcas', () => {
      expect(tpl).toContain('Cómo elegir')
      expect(src.toLowerCase()).toContain('no recomendamos marcas')
    })

    it('enlaza a la garantía legal y a /derechos-consumidor-compras-online', () => {
      expect(src).toContain('Ley 17.250')
      expect(tpl).toContain("localePath('/derechos-consumidor-compras-online')")
    })

    it('enlaza cruzado a la página hermana, a equipar y a ciberlunes', () => {
      expect(tpl).toContain(`localePath('${siblingHref}')`)
      expect(tpl).toContain("localePath('/equipar-casa-uruguay')")
      expect(tpl).toContain("localePath('/ciberlunes-y-black-friday-uruguay')")
    })

    it('declara la FAQ con las cuatro preguntas del brief (precio, licencia, dónde, usado)', () => {
      expect(src).toContain('<FaqSection')
      expect(src).toContain('movilidadPrecioTipicoAnswer')
      expect(src).toContain('movilidadUsadoAnswer')
      expect(src.toLowerCase()).toMatch(/licencia o registro/)
      expect(src.toLowerCase()).toMatch(/por dónde puedo circular/)
    })

    // Controller ruling (2026-09-17): las fichas de /tiendas-online-uruguay no cubren todavía a las
    // tiendas de movilidad en esta rama; esta página nunca inventa ese enlace. El vendedor se rotula
    // en texto plano vía `movilidadSellerLabel`, nunca como NuxtLink a una ficha.
    it('nunca enlaza a una ficha de /tiendas-online-uruguay/<tienda>', () => {
      expect(src).not.toContain('/tiendas-online-uruguay/')
      expect(src).not.toContain('useStoreProfileKeys')
    })

    it('rotula al vendedor sin identificar de Mercado Libre vía movilidadSellerLabel', () => {
      expect(src).toContain('movilidadSellerLabel')
    })

    it('no arma un veredicto de "es legal"/"está prohibido" en su propio texto', () => {
      expect(src.toLowerCase()).not.toMatch(/es ilegal/)
      expect(src.toLowerCase()).not.toMatch(/está prohibido usar/)
    })
  }
)

describe('las dos páginas piden a su propio endpoint de categoría', () => {
  it('monopatines pide /api/movilidad/monopatin-electrico', () => {
    expect(read(MONOPATIN_FILE)).toContain("useFetch('/api/movilidad/monopatin-electrico'")
  })

  it('bicicletas pide /api/movilidad/bicicleta-electrica', () => {
    expect(read(BICICLETA_FILE)).toContain("useFetch('/api/movilidad/bicicleta-electrica'")
  })
})
