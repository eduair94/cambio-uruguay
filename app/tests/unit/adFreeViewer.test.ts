import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { viewerLoadsAdsense, viewerShowsAds } from '../../utils/adFree'

const source = (path: string) => readFileSync(resolve(__dirname, '../..', path), 'utf8')

describe('who sees ads', () => {
  it('loads the AdSense script only once the viewer is known to see ads', () => {
    expect(viewerLoadsAdsense('ads')).toBe(true)
    // Unknown is the SSR / hydration state and the few seconds a signed-in visitor waits for the
    // server: the loader waits too, so a donor never gets an auto ad placed before the answer.
    expect(viewerLoadsAdsense('unknown')).toBe(false)
    expect(viewerLoadsAdsense('free')).toBe(false)
  })

  it('keeps manual units and the sponsored row for everyone but a confirmed donor', () => {
    // Unknown keeps them: removing them while the server answers would shift every page for every
    // visitor; only the donor pays that one shift.
    expect(viewerShowsAds('unknown')).toBe(true)
    expect(viewerShowsAds('ads')).toBe(true)
    expect(viewerShowsAds('free')).toBe(false)
  })

  it('is wired into the loader, the manual units and the sponsored row', () => {
    expect(source('app.vue')).toMatch(/viewerLoadsAdsense\(/)
    expect(source('composables/useAds.ts')).toMatch(/viewerShowsAds\(/)
    expect(source('composables/useSponsorships.ts')).toMatch(/viewerShowsAds\(/)
  })

  it('also hides the sponsored row and the home banner labelled as advertising', () => {
    expect(source('components/SponsoredCasaRow.vue')).toMatch(/canRender\('home-after-rates'\)/)
    expect(source('pages/index.vue')).toMatch(
      /<ConLaTuyaBanner v-if="viewerShowsAds\(adFreeViewer\)"/
    )
  })

  it('puts the offer AFTER the closing ad, so closing it never moves the ad under the pointer', () => {
    const layout = source('layouts/default.vue')
    const ad = layout.indexOf('placement="content-end"')
    const nudge = layout.indexOf('<LazyAdFreeNudge')
    expect(ad).toBeGreaterThan(-1)
    expect(nudge).toBeGreaterThan(ad)
  })
})
