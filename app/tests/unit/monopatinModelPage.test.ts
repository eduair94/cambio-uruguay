// La página de cada modelo de monopatín (/monopatines-electricos-uruguay/<modelo>): lo que el HTML
// tiene que traer para el buscador y lo que nunca puede publicar.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(
  join(__dirname, '..', '..', 'pages', 'monopatines-electricos-uruguay', '[modelo].vue'),
  'utf8'
)
const template = page.split('<script setup')[0] ?? ''

describe('/monopatines-electricos-uruguay/<modelo>', () => {
  it('un slug inventado es 404 antes de renderizar', () => {
    expect(page).toContain('MONOPATIN_MODEL_SLUG_RE.test(slug)')
    expect(page).toMatch(/definePageMeta\(\{\s*validate:/)
  })

  it('se lee del servidor, con la clave por slug', () => {
    expect(page).toContain('`/api/movilidad/modelos/${slug.value}`')
    expect(page).toContain('key: () => `monopatin-modelo-${slug.value}`')
  })

  it('un modelo sin dos vendedores y ficha se sirve con noindex', () => {
    expect(page).toContain(
      "robots: () => (model.value.indexable ? 'index, follow' : 'noindex, follow')"
    )
  })

  it('canonical absoluto, título con el precio y la marca del sitio', () => {
    expect(page).toContain(
      '`https://cambio-uruguay.com/monopatines-electricos-uruguay/${slug.value}`'
    )
    expect(page).toContain('monopatinModelTitle(model.value)')
    expect(page).toContain('title: () => `${seoTitle.value} | Cambio Uruguay`')
    expect(page).toContain('monopatinModelDescription(model.value)')
  })

  it('un solo H1 y las secciones de la ficha', () => {
    expect(template.match(/<h1[\s>]/g) ?? []).toHaveLength(1)
    for (const id of ['ofertas-title', 'ficha-title', 'rinde-title', 'comparar-title']) {
      expect(template).toContain(`id="${id}"`)
    }
  })

  it('el Product sólo con ofertas nuevas y nunca con calificación', () => {
    expect(page).toContain('BreadcrumbList')
    expect(page).toContain("'@type': 'AggregateOffer'")
    expect(page).toMatch(/offers\.filter\(offer => offer\.condition === 'new'\)/)
    expect(page).not.toContain('aggregateRating')
  })

  it('los avisos salen con nofollow y en pestaña nueva', () => {
    expect(template).toContain('rel="nofollow noopener"')
    expect(template).toContain('target="_blank"')
  })

  it('compara con los hermanos y nunca dice "ilegal"', () => {
    expect(page).toContain("path: '/monopatines-electricos-uruguay/comparar'")
    expect(page.toLowerCase()).not.toContain('ilegal')
  })
})
