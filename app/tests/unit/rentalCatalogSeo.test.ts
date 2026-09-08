import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { useHead } from '@unhead/vue'
import { createHead, renderSSRHead } from '@unhead/vue/server'
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/vue'
import {
  rentalCatalogCanonical,
  rentalCatalogIndexPage,
  rentalCatalogItemList,
  rentalCatalogMetadata,
} from '../../utils/rentalCatalogSeo'

const base = 'https://cambio-uruguay.com/alquileres-uruguay'

describe('rental catalogue crawl boundaries', () => {
  it('gives each real catalogue page its own canonical', () => {
    expect(rentalCatalogIndexPage({}, 20)).toBe(1)
    expect(rentalCatalogCanonical(base, rentalCatalogIndexPage({ page: '1' }, 20))).toBe(base)
    expect(rentalCatalogCanonical(base, rentalCatalogIndexPage({ page: '2' }, 20))).toBe(
      `${base}?page=2`
    )
    expect(rentalCatalogIndexPage({ page: '20' }, 20)).toBe(20)
    expect(rentalCatalogIndexPage({ page: '21' }, 20)).toBeNull()
    expect(rentalCatalogIndexPage({ page: '10000' }, 20000)).toBe(10000)
  })

  it.each([
    { page: ['1', '2'] },
    { page: '02' },
    { page: '-1' },
    { page: '1.5' },
    { page: '10001' },
    { page: 'abc' },
    { page: null },
    { page: '2', department: 'Montevideo' },
    { type: 'casa' },
    { sort: 'precio' },
    { sort: 'recientes' },
    { perPage: '48' },
    { view: 'mapa' },
    { q: 'Cordón' },
    { refLat: '-34.9', refLng: '-56.2' },
    { agency: 'infocasas-1' },
    { unknown: 'arbitrary' },
  ])('does not index a facet, duplicate or malformed URL: %j', query => {
    expect(rentalCatalogIndexPage(query, 50)).toBeNull()
  })

  it('keeps the localized path when adding page numbers', () => {
    expect(rentalCatalogCanonical(`https://cambio-uruguay.com/en/alquileres-uruguay`, 3)).toBe(
      'https://cambio-uruguay.com/en/alquileres-uruguay?page=3'
    )
  })
})

describe('rental catalogue result markup', () => {
  it('only describes the visible cards with accurate positions and their photos', () => {
    const list = rentalCatalogItemList(
      [
        {
          name: 'Apartamento en Cordón',
          url: `${base}/one`,
          image: 'https://photos.example/one.jpg',
        },
        { name: 'Casa en Salto', url: `${base}/two`, image: null },
      ],
      `${base}?page=2`,
      2,
      24
    )
    expect(list.numberOfItems).toBe(2)
    expect(list.itemListElement.map(item => item.position)).toEqual([25, 26])
    expect(list.itemListElement[0]?.item).toEqual({
      '@type': 'RealEstateListing',
      name: 'Apartamento en Cordón',
      url: `${base}/one`,
      image: 'https://photos.example/one.jpg',
    })
    expect(list.itemListElement[1]?.item).not.toHaveProperty('image')
    expect(list).not.toHaveProperty('offers')
    expect(list).not.toHaveProperty('dateModified')
  })

  it.each([
    'javascript:alert(1)',
    'data:image/png;base64,abc',
    'https://user:pass@example.com/a.jpg',
  ])('never publishes unsafe or credential-bearing image URLs: %s', image => {
    const list = rentalCatalogItemList([{ name: 'Casa', url: `${base}/one`, image }], base, 1, 24)
    expect(list.itemListElement[0]?.item).not.toHaveProperty('image')
  })

  it.each(['es', 'en', 'pt'])('has concise, localized metadata for %s', locale => {
    for (const page of [1, 2, 9999]) {
      const metadata = rentalCatalogMetadata(locale, page)
      expect(`${metadata.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
      expect(metadata.description.length).toBeLessThanOrEqual(175)
    }
    expect(rentalCatalogMetadata(locale, 2).title).not.toBe(rentalCatalogMetadata(locale, 1).title)
  })

  it.each([base, `${base}?page=2`])(
    'merges CollectionPage into the module WebPage and escapes titles in SSR: %s',
    async canonical => {
      const head = createHead()
      const maliciousTitle = '</script><img src=x onerror=alert(1)>'
      const list = rentalCatalogItemList(
        [{ name: maliciousTitle, url: 'https://cambio-uruguay.com/alquileres/one', image: null }],
        canonical,
        1,
        24
      )
      const app = createSSRApp({
        setup() {
          useHead({
            link: [{ rel: 'canonical', href: canonical }],
            templateParams: {
              schemaOrg: { path: canonical.replace('https://cambio-uruguay.com', '') },
            },
          })
          useSchemaOrg([defineWebPage()])
          useSchemaOrg([
            defineWebPage({ '@type': 'CollectionPage', url: canonical, mainEntity: () => list }),
          ])
          return () => null
        },
      })
      app.use(head)
      await renderToString(app)
      const rendered = await renderSSRHead(head)
      const html = rendered.headTags + rendered.bodyTags + rendered.bodyTagsOpen
      expect(html).not.toContain('<img src=x')
      const scripts = [
        ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
      ]
      expect(scripts).toHaveLength(1)
      const graph = JSON.parse(scripts[0]![1]!)['@graph']
      const pages = graph.filter(
        (node: { '@id': string }) => node['@id'] === `${canonical}#webpage`
      )
      expect(pages, JSON.stringify(graph)).toHaveLength(1)
      expect(pages[0]['@type']).toContain('CollectionPage')
      expect(pages[0].mainEntity.itemListElement[0].item.name).toBe(maliciousTitle)
    }
  )
})
