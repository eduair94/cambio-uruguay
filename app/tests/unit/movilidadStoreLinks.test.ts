// Controller correction (2026-09-17): plan A (store-profile fichas) IS an ancestor of this branch
// (e3dede2b) — the earlier ruling that assumed otherwise was wrong. This file mirrors
// tests/unit/storeLinks.test.ts for the two movilidad pages: a seller name on
// /monopatines-electricos-uruguay and /bicicletas-electricas-uruguay links to its own ficha
// (/tiendas-online-uruguay/<key>) only when that store actually has a profile document, exactly
// like sillas-escritorio-uruguay/[slug].vue and equipar-casa-uruguay/[categoria].vue already do.
//
// Neither page has a Nuxt runtime in the `tests/unit` environment, so behaviour is asserted the
// same way storeLinks.test.ts does: by what the file itself contains.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES = join(__dirname, '..', '..', 'pages')
const monopatinSource = readFileSync(join(PAGES, 'monopatines-electricos-uruguay.vue'), 'utf8')
const bicicletaSource = readFileSync(join(PAGES, 'bicicletas-electricas-uruguay.vue'), 'utf8')

describe.each([
  ['monopatines-electricos-uruguay.vue', monopatinSource],
  ['bicicletas-electricas-uruguay.vue', bicicletaSource],
])('%s seller links', (_file, src) => {
  it('resolves the seller through storeSlugForSeller and the shared profile-keys composable', () => {
    expect(src).toContain("import { storeSlugForSeller } from '~/utils/storeDirectory'")
    expect(src).toContain('useStoreProfileKeys()')
  })

  it('never links a facebook-sourced offer, even when the seller name resolves to a store', () => {
    expect(src).toContain("if (source === 'facebook') return null")
  })

  it('links the seller in the "los más baratos" lists to its ficha when it resolves, both Nuevos/Nuevas and Usados/Usadas', () => {
    const matches = [
      ...src.matchAll(
        /<NuxtLink[^>]*v-if="storeKeyFor\(row\.offer\.seller, row\.offer\.source\)"[^>]*>/g
      ),
    ]
    expect(matches.length).toBe(2)
    // Whitespace-tolerant: prettier is free to wrap this call onto its own lines.
    expect(src).toMatch(
      /localePath\(\s*`\/tiendas-online-uruguay\/\$\{storeKeyFor\(row\.offer\.seller, row\.offer\.source\)\}`\s*\)/
    )
  })

  it('shows the rotulado label (movilidadSellerLabel), never the raw seller string, as the link text', () => {
    // The visible/linked text is the ML-unknown-aware label, not `row.offer.seller` directly — an
    // unidentified ML "seller" never resolves to a key anyway, but the TEXT still has to say so.
    expect(src).toMatch(/>\{\{ sellerLabel\(row\.offer\) \}\}<\/NuxtLink/)
    expect(src).toMatch(/<template v-else>\{\{ sellerLabel\(row\.offer\) \}\}<\/template>/)
  })

  it('does not nest the store link inside the external listing anchor', () => {
    const items = [
      ...src.matchAll(/<li v-for="row in cheapest(?:New|Used)" :key="row\.key">[\s\S]*?<\/li>/g),
    ]
    expect(items.length).toBeGreaterThan(0)
    for (const [li] of items) {
      // The external `<a>` (the offer title/url) closes before the store NuxtLink opens: siblings,
      // not nested — same shape storeLinks.test.ts checks for the sillas table cell.
      const externalAnchorEnd = li.indexOf('</a>')
      const storeLinkStart = li.indexOf('<NuxtLink')
      expect(externalAnchorEnd).toBeGreaterThan(-1)
      expect(storeLinkStart).toBeGreaterThan(externalAnchorEnd)
    }
  })
})

describe('monopatines-electricos-uruguay.vue — modelos table (régimen `modelo`)', () => {
  const src = monopatinSource

  it('links the seller in the products table next to its external offer link, never inside it, with a per-seller aria-label', () => {
    const liMatch = src.match(/<li v-for="\(offer, index\) in row\.product\.offers"[\s\S]*?<\/li>/)
    expect(liMatch).not.toBeNull()
    const li = liMatch![0]
    const externalAnchorEnd = li.indexOf('</a>')
    const storeLinkStart = li.indexOf('<NuxtLink')
    expect(externalAnchorEnd).toBeGreaterThan(-1)
    expect(storeLinkStart).toBeGreaterThan(externalAnchorEnd)
    expect(li).toContain('v-if="storeKeyFor(offer.seller, offer.source)"')
    expect(li).toMatch(
      /localePath\(\s*`\/tiendas-online-uruguay\/\$\{storeKeyFor\(offer\.seller, offer\.source\)\}`\s*\)/
    )
    // The "(ficha)" text repeats on every row; the accessible name must carry the seller so a
    // screen reader can tell the rows apart (same guard as equiparCategoryPage's storeLinks case).
    expect(li).toContain(':aria-label="`Ficha de ${offer.seller}`"')
  })
})

describe('bicicletas-electricas-uruguay.vue — sin tabla de modelos (régimen `commodity`)', () => {
  it('never renders a products table (no named models for a commodity-regime category)', () => {
    expect(bicicletaSource).not.toContain('row.product.offers')
    expect(bicicletaSource).not.toMatch(/<h2[^>]*>Modelos y sus mejores ofertas<\/h2>/)
  })
})
