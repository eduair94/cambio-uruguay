import { expect, test } from '@playwright/test'

import { ECOSYSTEM_LINKS } from '../../utils/ecosystem'

// Derive the counts from the single source of truth rather than hardcoding them,
// so adding an ecosystem link never fails this test for a non-regression reason.
const EXTERNAL_COUNT = ECOSYSTEM_LINKS.filter(l => !l.internal).length

test.setTimeout(180_000)

// Default Accept-Language is `en`, which makes @nuxtjs/i18n redirect `/` to
// `/en`. Pin Spanish: it is the default, unprefixed locale.
test.use({ locale: 'es-UY' })

test('the review carousel mounts with the TrustScore banner suppressed', async ({ page }) => {
  await page.goto('/')

  const section = page.locator('.reviews-section')
  await section.scrollIntoViewIfNeeded()

  // The widget only mounts after hydration AND after the section intersects, and
  // the dev server hydrates slowly. Retry rather than asserting once.
  const frame = page.locator('.reviews-widget iframe')
  await expect(async () => {
    await section.scrollIntoViewIfNeeded()
    await expect(frame).toHaveCount(1, { timeout: 2_000 })
  }).toPass({ timeout: 90_000 })

  const src = (await frame.getAttribute('src')) ?? ''
  expect(src).toContain('domain=cambio-uruguay.com')
  expect(src).toContain('hideTopBanner=true')
  expect(src).toContain('hideGlobalReviews=true')

  // `rating` is a no-op upstream; setting it would be a lie. We never set it, so
  // the library never puts it in the URL.
  expect(src).not.toContain('rating=')

  // NOTE: `sort=latest` DOES appear here, along with `page=1&limit=20`. Those are
  // the library's own defaults, injected by its buildIframeUrl — we do not set
  // them. The constraint is that our config never *sets* `sort`, which
  // tests/unit/trustpilot.test.ts asserts directly. Do not assert its absence
  // from the URL; verified against the live dev server, it is always present.
  expect(src).toContain('sort=latest')

  // The TrustScore banner (a stale, age-decayed "3.8") lives INSIDE the widget's
  // cross-origin iframe, so only a frameLocator can see it. hideTopBanner +
  // hideGlobalReviews are what suppress it; this asserts the user-visible result,
  // not just the config that is supposed to produce it. not.toBeEmpty() proves we
  // are inspecting loaded iframe content, not passing vacuously on a blank doc.
  const widgetBody = page.frameLocator('.reviews-widget iframe').locator('body')
  await expect(async () => {
    await expect(widgetBody).not.toBeEmpty()
    await expect(widgetBody).not.toContainText('3.8')
  }).toPass({ timeout: 60_000 })
})

test('both review CTAs point at Trustpilot and open in a new tab', async ({ page }) => {
  await page.goto('/')
  await page.locator('.reviews-section').scrollIntoViewIfNeeded()

  const write = page.locator('[data-cta="trustpilot-write"]')
  const seeAll = page.locator('[data-cta="trustpilot-all"]')

  await expect(write).toHaveAttribute(
    'href',
    'https://www.trustpilot.com/evaluate/cambio-uruguay.com'
  )
  await expect(seeAll).toHaveAttribute(
    'href',
    'https://www.trustpilot.com/review/cambio-uruguay.com'
  )
  await expect(write).toHaveAttribute('target', '_blank')
  await expect(seeAll).toHaveAttribute('rel', /noopener/)
})

test('the ecosystem strip renders safe external links', async ({ page }) => {
  await page.goto('/')

  const strip = page.locator('.ecosystem-section')
  await strip.scrollIntoViewIfNeeded()
  await expect(strip).toBeVisible()

  const links = strip.locator('.ecosystem-link')
  await expect(links).toHaveCount(ECOSYSTEM_LINKS.length)

  // Never link the robots-disallowed Scalar reference.
  await expect(strip.locator('a[href*="/api-reference"]')).toHaveCount(0)

  const external = strip.locator('a.ecosystem-link[target="_blank"]')
  await expect(external).toHaveCount(EXTERNAL_COUNT) // external links + internal /desarrolladores

  for (let i = 0; i < EXTERNAL_COUNT; i++) {
    await expect(external.nth(i)).toHaveAttribute('rel', /noopener/)
  }
})
