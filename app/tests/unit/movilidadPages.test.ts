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

/** La tarjeta con foto que las dos páginas usan para cada oferta (2026-09-22): parte del contrato
 * que antes vivía entero en la plantilla de cada página. */
const OFFER_CARD = read(
  join(__dirname, '..', '..', 'components', 'movilidad', 'MovilidadOfferCard.vue')
)

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

    it('la URL limpia se indexa; sólo una con filtros del directorio no', () => {
      // El directorio de abajo lleva sus filtros en la query, y cada combinación es una copia
      // delgada de esta misma página (mismo criterio que /equipar-casa-uruguay/productos). Lo que
      // NO puede pasar nunca es que la página se noindexe entera o pida `none`.
      expect(src).toMatch(
        /robots: \(\) => \(dirFiltered\.value \? 'noindex, follow' : 'index, follow'\)/
      )
      expect(src).not.toMatch(/robots:\s*['"]noindex/i)
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

    // Controller correction (2026-09-17): plan A (fichas de tienda) SÍ es ancestro de esta rama —
    // ver movilidadStoreLinks.test.ts para el contrato completo (mismo patrón que
    // sillas-escritorio-uruguay/[slug].vue y equipar-casa-uruguay/[categoria].vue).
    it('resuelve la ficha del vendedor con storeSlugForSeller + useStoreProfileKeys()', () => {
      // Desde el 2026-09-22 la fila de una oferta la dibuja `MovilidadOfferCard`, así que la regla
      // se cumple en la página, en la tarjeta compartida, o en las dos (monopatines la sigue
      // necesitando en su tabla de modelos). Lo que no puede es no cumplirse en ninguna.
      const both = src + OFFER_CARD
      expect(both).toContain('storeSlugForSeller')
      expect(both).toContain('useStoreProfileKeys()')
      expect(both).toContain('/tiendas-online-uruguay/')
    })

    it('rotula al vendedor sin identificar de Mercado Libre vía movilidadSellerLabel', () => {
      expect(src + OFFER_CARD).toContain('movilidadSellerLabel')
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
