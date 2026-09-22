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
const offerCardSource = readFileSync(
  join(__dirname, '..', '..', 'components', 'movilidad', 'MovilidadOfferCard.vue'),
  'utf8'
)

// Desde el 2026-09-22 la fila de una oferta de "las más baratas" la dibuja la tarjeta compartida
// `MovilidadOfferCard.vue` (con foto), así que el contrato del enlace al vendedor se verifica ahí:
// es el mismo contrato, en un solo lugar en vez de copiado en las dos plantillas.
describe('MovilidadOfferCard.vue — el enlace al vendedor de cada oferta', () => {
  const src = offerCardSource

  it('resolves the seller through storeSlugForSeller and the shared profile-keys composable', () => {
    expect(src).toContain("import { storeSlugForSeller } from '~/utils/storeDirectory'")
    expect(src).toContain('useStoreProfileKeys()')
  })

  it('never links a facebook-sourced offer, even when the seller name resolves to a store', () => {
    expect(src).toContain("if (props.offer.source === 'facebook') return null")
  })

  it('links the seller to its ficha only when the store has a profile document', () => {
    expect(src).toContain('storeProfileKeys.value.includes(key)')
    expect(src).toMatch(/localePath\(\s*`\/tiendas-online-uruguay\/\$\{storeKey\}`\s*\)/)
    expect(src).toContain('v-if="storeKey"')
  })

  it('shows the rotulado label (movilidadSellerLabel), never the raw seller string, as the link text', () => {
    // El texto visible es el rótulo consciente del vendedor sin identificar de ML, no
    // `offer.seller` crudo — ese nunca resuelve a una ficha, pero el TEXTO igual tiene que decirlo.
    expect(src).toContain('movilidadSellerLabel(props.offer.seller, props.offer.source)')
    expect(src).toMatch(/\{\{\s*sellerLabel\s*\}\}/)
    expect(src).not.toMatch(/\{\{\s*offer\.seller\s*\}\}/)
  })

  it('does not nest the store link inside the external listing anchor', () => {
    // Los `<a>` externos (foto y título) cierran antes de que abra el NuxtLink de la ficha:
    // hermanos, nunca anidados — la misma forma que verifica storeLinks.test.ts.
    const storeLinkStart = src.indexOf('<NuxtLink')
    expect(storeLinkStart).toBeGreaterThan(-1)
    const anchorsBefore = src.slice(0, storeLinkStart)
    expect((anchorsBefore.match(/<a\s/g) ?? []).length).toBe(
      (anchorsBefore.match(/<\/a>/g) ?? []).length
    )
  })
})

// Las dos páginas siguen siendo dueñas de USAR esa tarjeta para las dos listas (nuevos y usados).
describe.each([
  ['monopatines-electricos-uruguay.vue', monopatinSource],
  ['bicicletas-electricas-uruguay.vue', bicicletaSource],
])('%s — las dos listas de "las más baratas" usan la tarjeta compartida', (_file, src) => {
  it('renders MovilidadOfferCard for both cheapestNew and cheapestUsed', () => {
    expect(src).toMatch(/v-for="row in cheapestNew"/)
    expect(src).toMatch(/v-for="row in cheapestUsed"/)
    expect([...src.matchAll(/<MovilidadOfferCard/g)].length).toBe(2)
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
