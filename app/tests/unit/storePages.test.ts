// Task 9: content assertions for /tiendas-online-uruguay's index + detail pages that the generic
// `seoContract.test.ts` doesn't already cover (title/description/canonical/JSON-LD/single-H1/
// sitemap-emission for both files ARE covered there, via their entries in `PROGRAMMATIC_PAGES`).
//
// This file is the store-specific ruling: never a verdict word as an ANSWER, never Reddit
// authorship, never a rating schema this site did not measure, and never a link to a store profile
// that doesn't exist yet (`hasProfile`). It reads raw source text on purpose — these pages have no
// Nuxt runtime in the `tests/unit` environment (see app/AGENTS.md), so behaviour is asserted the
// same way `seoContract.test.ts` and `courierPages.test.ts` do: by what the file itself contains.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES_DIR = join(__dirname, '..', '..', 'pages', 'tiendas-online-uruguay')
const indexSource = readFileSync(join(PAGES_DIR, 'index.vue'), 'utf8')
const detailSource = readFileSync(join(PAGES_DIR, '[tienda].vue'), 'utf8')

describe('tiendas-online-uruguay/index.vue', () => {
  it('renders one H1 with the exact heading', () => {
    const h1s = indexSource.match(/<h1[\s>]/g) ?? []
    expect(h1s).toHaveLength(1)
    expect(indexSource).toContain(
      'Tiendas online de Uruguay: opiniones, reclamos y datos verificables'
    )
  })

  it('offers a rubro filter and a kind filter built from the shared label maps', () => {
    expect(indexSource).toContain('STORE_RUBRO_LABELS')
    expect(indexSource).toContain('STORE_KIND_LABELS')
    expect(indexSource).toContain('rubroFilter')
    expect(indexSource).toContain('kindFilter')
  })

  it('renders the table with cu-mobile-cards and per-cell data-label', () => {
    expect(indexSource).toMatch(/<VTable[^>]*cu-mobile-cards/)
    expect(indexSource).toContain('data-label')
  })

  it('links a row to its own page only when the hub knows it has a profile', () => {
    expect(indexSource).toMatch(/v-if="store\.hasProfile"/)
    expect(indexSource).toContain('localePath(`/tiendas-online-uruguay/${store.key}`)')
  })

  it('states plainly that this is not a trust ranking', () => {
    expect(indexSource).toContain('No es un ranking de confianza')
  })

  it('emits an ItemList of only the stores that actually have a page', () => {
    expect(indexSource).toContain('filter(store => store.hasProfile)')
  })

  it('ships a FaqSection', () => {
    expect(indexSource).toContain('<FaqSection')
  })

  it('is never noindexed', () => {
    expect(indexSource).not.toMatch(/noindex/i)
  })
})

describe('tiendas-online-uruguay/[tienda].vue', () => {
  it('guards unknown slugs with a real validate, not a runtime check', () => {
    expect(detailSource).toMatch(/definePageMeta\s*\(\s*\{/)
    expect(detailSource).toMatch(/validate\s*:/)
    expect(detailSource).toContain('isStoreDirectoryKey(')
  })

  it("keys its fetch on the store's own slug", () => {
    expect(detailSource).toContain('useFetch<StoreDetailResponse>')
    expect(detailSource).toContain('key: `store-${key.value}`')
  })

  it('renders exactly one H1, the "es confiable" question', () => {
    const h1s = detailSource.match(/<h1[\s>]/g) ?? []
    expect(h1s).toHaveLength(1)
    expect(detailSource).toContain('es confiable? Opiniones, reclamos y datos verificables')
  })

  it('turns a missing or errored fetch into a real fatal 404, never an empty 200', () => {
    expect(detailSource).toMatch(/if\s*\(\s*error\.value\s*\|\|\s*!data\.value\s*\)/)
    expect(detailSource).toMatch(/createError\(\{[^}]*statusCode:\s*404/)
    expect(detailSource).toMatch(/fatal:\s*true/)
  })

  it('declares its own SEO meta', () => {
    expect(detailSource).toMatch(/useSeoMeta\s*\(/)
    expect(detailSource).toMatch(/\btitle[,:]/)
    expect(detailSource).toMatch(/\bdescription[,:]/)
    expect(detailSource).toMatch(/ogTitle:/)
    expect(detailSource).toMatch(/ogDescription:/)
  })

  it('canonicalizes at /tiendas-online-uruguay/<slug>, with no locale prefix', () => {
    expect(detailSource).toContain('https://cambio-uruguay.com/tiendas-online-uruguay/')
  })

  it('ships BreadcrumbList and a FaqSection', () => {
    expect(detailSource).toContain('BreadcrumbList')
    expect(detailSource).toContain('<FaqSection')
  })

  it('never emits a rating schema this site did not measure', () => {
    expect(detailSource).not.toContain('AggregateRating')
    expect(detailSource).not.toMatch(/['"]@type['"]\s*:\s*['"]Review['"]/)
  })

  it('never names a Reddit author or username', () => {
    expect(detailSource).not.toContain('.author')
    expect(detailSource).not.toMatch(/\bu\//)
  })

  it('never asserts a verdict: no scam/fraud/safety words, "confiable" only as a question', () => {
    const lower = detailSource.toLowerCase()
    for (const banned of ['estafa', 'fraude', 'insegura', 'recomendamos', 'evitá']) {
      expect(lower).not.toContain(banned)
    }
    const confiableMatches = [...detailSource.matchAll(/confiable\S{0,2}/gi)]
    expect(confiableMatches.length).toBeGreaterThan(0)
    for (const match of confiableMatches) {
      expect(match[0]).toMatch(/\?/)
    }
  })

  it('links to the contact page for corrections', () => {
    expect(detailSource).toContain("localePath('/contacto')")
  })

  it('links siblings only when the hub says they have a profile', () => {
    expect(detailSource).toContain('withProfile.has(store.key)')
  })

  it('is never noindexed', () => {
    expect(detailSource).not.toMatch(/noindex/i)
  })
})
