// Task 10: a seller name on /sillas-escritorio-uruguay/[slug].vue and
// /equipar-casa-uruguay/[categoria].vue links to its own ficha (/tiendas-online-uruguay/<key>) only
// when that store actually has a profile document (the detail route 404s otherwise — see
// storePages.test.ts's ruling on the hub/detail pages themselves). Both pages have no Nuxt runtime
// in the `tests/unit` environment, so behaviour is asserted the same way storePages.test.ts and
// courierPages.test.ts do: by what the file itself contains. The shared "does this key have a
// ficha" list is `useStoreProfileKeys()`, fetched under its OWN `useFetch` key so it never collides
// with the hub's `tiendas-online-index` or a detail page's `store-<key>` cache entry.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { storeProfileKeysFromResponse } from '../../composables/useStoreProfileKeys'
import type { StoresIndexResponse } from '../../server/api/stores/index.get'

const sillasSource = readFileSync(
  join(__dirname, '..', '..', 'pages', 'sillas-escritorio-uruguay', '[slug].vue'),
  'utf8'
)
const equiparSource = readFileSync(
  join(__dirname, '..', '..', 'pages', 'equipar-casa-uruguay', '[categoria].vue'),
  'utf8'
)

function card(overrides: Partial<StoresIndexResponse['stores'][number]> = {}) {
  return {
    key: 'tushop',
    name: 'Tushop',
    domain: 'tushop.uy',
    kind: 'tienda-uy',
    rubros: ['general'],
    since: null,
    trustpilot: null,
    google: null,
    redditMentions: null,
    catalogOffers: null,
    signals: 0,
    indexable: false,
    hasProfile: true,
    ...overrides,
  }
}

describe('storeProfileKeysFromResponse (useStoreProfileKeys.ts)', () => {
  it('keeps only the keys of stores that have a written profile', () => {
    const response: StoresIndexResponse = {
      stores: [
        card({ key: 'tushop', hasProfile: true }),
        card({ key: 'sinficha', hasProfile: false }),
      ],
      reviewedAt: null,
    }
    expect(storeProfileKeysFromResponse(response)).toEqual(['tushop'])
  })

  it('returns an empty array when nothing has a profile', () => {
    const response: StoresIndexResponse = {
      stores: [card({ key: 'a', hasProfile: false }), card({ key: 'b', hasProfile: false })],
      reviewedAt: null,
    }
    expect(storeProfileKeysFromResponse(response)).toEqual([])
  })

  it('degrades to an empty array for null/undefined input (a failed fetch)', () => {
    expect(storeProfileKeysFromResponse(null)).toEqual([])
    expect(storeProfileKeysFromResponse(undefined)).toEqual([])
  })
})

describe('sillas-escritorio-uruguay/[slug].vue seller links', () => {
  it('resolves the seller through storeSlugForSeller and the shared profile-keys composable', () => {
    expect(sillasSource).toContain('storeSlugForSeller')
    expect(sillasSource).toContain('useStoreProfileKeys()')
  })

  it('links the seller name to its ficha only when it resolves to a key', () => {
    expect(sillasSource).toMatch(/<NuxtLink[^>]*v-if="storeKeyFor\(offer\.seller\)"/)
    expect(sillasSource).toContain(
      'localePath(`/tiendas-online-uruguay/${storeKeyFor(offer.seller)}`)'
    )
  })

  it('does not nest the store link inside the external listing anchor', () => {
    const sellerCellMatch = sillasSource.match(
      /<td :data-label="t\('chairDetail\.seller'\)">([\s\S]*?)<\/td>/
    )
    expect(sellerCellMatch).not.toBeNull()
    // The seller cell owns its own NuxtLink and contains no <a ...> of its own.
    expect(sellerCellMatch![1]).toContain('<NuxtLink')
    expect(sellerCellMatch![1]).not.toMatch(/<a\s/)
  })
})

describe('equipar-casa-uruguay/[categoria].vue seller links', () => {
  it('resolves the seller through storeSlugForSeller and the shared profile-keys composable', () => {
    expect(equiparSource).toContain('storeSlugForSeller')
    expect(equiparSource).toContain('useStoreProfileKeys()')
  })

  it('links the seller in the "los más baratos" lists to its ficha when it resolves', () => {
    const matches = [
      ...equiparSource.matchAll(/<NuxtLink[^>]*v-if="storeKeyFor\(row\.offer\.seller\)"[^>]*>/g),
    ]
    // Once for "Nuevos", once for "Usados".
    expect(matches.length).toBe(2)
    expect(equiparSource).toContain(
      'localePath(`/tiendas-online-uruguay/${storeKeyFor(row.offer.seller)}`)'
    )
  })

  it('links the seller in the products table next to its external offer link, never inside it', () => {
    const liMatch = equiparSource.match(
      /<li v-for="\(offer, index\) in row\.product\.offers"[\s\S]*?<\/li>/
    )
    expect(liMatch).not.toBeNull()
    const li = liMatch![0]
    // The external offer anchor closes before the store NuxtLink opens: they are siblings.
    const externalAnchorEnd = li.indexOf('</a>')
    const storeLinkStart = li.indexOf('<NuxtLink')
    expect(externalAnchorEnd).toBeGreaterThan(-1)
    expect(storeLinkStart).toBeGreaterThan(externalAnchorEnd)
    expect(li).toContain('v-if="storeKeyFor(offer.seller)"')
    expect(li).toContain('localePath(`/tiendas-online-uruguay/${storeKeyFor(offer.seller)}`)')
  })
})
