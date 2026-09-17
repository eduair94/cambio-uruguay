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

  it('shows "500 o más" for a capped Reddit count in its own column, never a raw 500 (item 2)', () => {
    expect(indexSource).toContain('redditCell(store)')
    expect(indexSource).toContain('store.redditMentionsCapped')
    expect(indexSource).toContain('STORE_REDDIT_MAX_MENTIONS')
  })

  it('builds its ItemList through the shared, testable helper (fix round 1, item 4)', () => {
    // The actual "only hasProfile, omit the node entirely when empty" behaviour is unit-tested
    // directly against `storeHubItemList` in storeProfiles.test.ts — this only checks the page
    // wires that helper into its `@graph` instead of re-deriving the filter inline.
    expect(indexSource).toContain('storeHubItemList')
    expect(indexSource).toMatch(/\.\.\.storeHubItemList\(stores\.value\)/)
  })

  it('ships a FaqSection', () => {
    expect(indexSource).toContain('<FaqSection')
  })

  it('is never noindexed', () => {
    expect(indexSource).not.toMatch(/noindex/i)
  })

  it('never builds an absolute URL from localePath (fix round 1, item 1)', () => {
    // A `localePath`-built absolute url reads correctly in Spanish (the default, unprefixed
    // locale) but carries the locale prefix on /en/ and /pt/ — real routes under
    // `prefix_except_default` — turning the canonical/JSON-LD urls into three self-canonical
    // URLs instead of one. `localePath` alone (for on-page NuxtLink navigation) is fine; only the
    // combination with the absolute host literal is banned.
    expect(indexSource).not.toMatch(/https:\/\/cambio-uruguay\.com\$\{localePath/)
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

  it('turns a real 404 from the API into a fatal 404, never an empty 200 (fix round F1, item 12)', () => {
    expect(detailSource).toMatch(/if\s*\(\s*error\.value\s*\)\s*\{/)
    expect(detailSource).toMatch(/statusCode\s*===\s*404/)
    expect(detailSource).toMatch(/createError\(\{[^}]*statusCode:\s*404/)
    expect(detailSource).toMatch(/fatal:\s*true/)
  })

  it('turns any OTHER fetch failure into a 503, never a false 404 (fix round F1, item 12)', () => {
    expect(detailSource).toMatch(
      /createError\(\{\s*statusCode:\s*503,\s*statusMessage:\s*'Servicio no disponible',\s*fatal:\s*true\s*\}\)/
    )
    // Both the "not found" branch and the missing-data branch reach a fatal error, not a silent
    // empty render — count every createError( call inside the fetch-error handling.
    const errorHandling = detailSource.slice(
      detailSource.indexOf('const { data, error } = await useFetch'),
      detailSource.indexOf('const profile = computed')
    )
    expect([...errorHandling.matchAll(/createError\(/g)]).toHaveLength(3)
  })

  it('never shows a negative contact claim — the row is omitted, not "No publica..." (item 3)', () => {
    expect(detailSource).not.toMatch(/no publica/i)
    expect(detailSource).toMatch(/v-if="contactSummary"/)
  })

  it('shows "500 o más" for a capped Reddit count and hides the by-year list when capped (item 2)', () => {
    expect(detailSource).toContain('storeMentionsCount(profile.reddit!)')
    expect(detailSource).toMatch(/redditYears\.length\s*&&\s*!profile\.reddit!\.capped/)
    expect(detailSource).toContain('profile.reddit!.capped')
    expect(detailSource.toLowerCase()).toContain('sólo guardamos las')
  })

  it('maps the raw platform key to a human label and omits the row for "otra" (item 15)', () => {
    expect(detailSource).toContain('storePlatformLabel(')
    expect(detailSource).toMatch(/v-if="platformLabel"/)
    expect(detailSource).not.toMatch(/\{\{\s*profile\.site!\.platform\s*\}\}/)
  })

  it("fetches the sibling list under its own useFetch key, not the hub's or a detail page's (item 10)", () => {
    expect(detailSource).toContain("key: 'store-siblings'")
    expect(detailSource).not.toContain("key: 'tiendas-online-index'")
    expect(detailSource).toMatch(/transform:\s*response\s*=>/)
  })

  it('uses the server-provided servedAt for every freshness decision, never a client new Date() (item 11)', () => {
    expect(detailSource).toContain('new Date(data.value!.servedAt)')
    expect(detailSource).not.toMatch(/const now = new Date\(\)/)
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

  it('never builds an absolute URL from localePath (fix round 1, item 1)', () => {
    expect(detailSource).not.toMatch(/https:\/\/cambio-uruguay\.com\$\{localePath/)
  })

  it('shows the address dated and sourced through storeAddress, never raw (fix round 1, item 2)', () => {
    expect(detailSource).toContain('storeAddress(profile.value, now)')
    expect(detailSource).toMatch(/address\.source === 'google'/)
    expect(detailSource).toContain('storeFormatDate(address.checkedAt)')
  })
})
