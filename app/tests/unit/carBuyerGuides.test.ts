import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CAR_BUYER_GUIDES } from '../../utils/carBuyerGuides'
import { guideSlugs } from '../../utils/guides'

// El bloque «Qué revisar antes de comprar» de las páginas de autos (utils/carBuyerGuides.ts). Un
// enlace roto no rompe nada visible: manda a un 404 desde cuatro plantillas a la vez. Y una
// plantilla que pierde el componente vuelve a dejar a la página de modelo sin ninguna guía.

const appPath = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url))
const read = (rel: string) => readFileSync(appPath(rel), 'utf8')
const template = (source: string) => source.slice(0, source.search(/<script\b/))

describe('CAR_BUYER_GUIDES', () => {
  it('no repite destinos', () => {
    const paths = CAR_BUYER_GUIDES.map(guide => guide.to)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('cada destino es una guía del catálogo o una página que existe', () => {
    const slugs = new Set(guideSlugs())
    for (const { to } of CAR_BUYER_GUIDES) {
      if (to.startsWith('/guias/')) {
        expect(slugs.has(to.slice('/guias/'.length)), to).toBe(true)
      } else {
        expect(existsSync(appPath(`pages${to}.vue`)), to).toBe(true)
      }
    }
  })

  it('incluye las guías de financiar y mantener el auto, que ninguna plantilla de autos enlazaba', () => {
    const paths = CAR_BUYER_GUIDES.map(guide => guide.to)
    expect(paths).toContain('/guias/credito-prendario-auto-uruguay')
    expect(paths).toContain('/guias/costos-de-tener-auto-uruguay')
    expect(paths).toContain('/guias/titulo-del-auto-uruguay')
  })

  it.each([
    'pages/autos-usados-uruguay/index.vue',
    'pages/autos-usados-uruguay/[key].vue',
    'pages/autos-usados-uruguay/precios/[slug].vue',
    'pages/autos-usados-uruguay/hasta-[monto]-dolares.vue',
  ])('%s dibuja el bloque', page => {
    expect(template(read(page))).toContain('<CarsBuyerGuides')
  })

  it('en la página de modelo va antes de la primera tabla de precios', () => {
    const tpl = template(read('pages/autos-usados-uruguay/precios/[slug].vue'))
    expect(tpl.indexOf('<CarsBuyerGuides')).toBeGreaterThan(-1)
    expect(tpl.indexOf('<CarsBuyerGuides')).toBeLessThan(tpl.indexOf('Precio por año'))
  })
})
