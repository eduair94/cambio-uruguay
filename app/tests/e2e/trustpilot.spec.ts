import { expect, test } from '@playwright/test'

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

  // hideTopBanner + hideGlobalReviews exist specifically to suppress Trustpilot's
  // age-decayed 3.8 TrustScore (see utils/trustpilot.ts) in favour of the actual
  // 4.8 review average. Guard against a regression re-introducing that number
  // anywhere in our own (non-iframe) markup.
  await expect(page.locator('body')).not.toContainText('3.8')
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
  await expect(links).toHaveCount(6)

  // Never link the robots-disallowed Scalar reference.
  await expect(strip.locator('a[href*="/api-reference"]')).toHaveCount(0)

  const external = strip.locator('a.ecosystem-link[target="_blank"]')
  const count = await external.count()
  expect(count).toBe(5) // 5 external + 1 internal /desarrolladores

  for (let i = 0; i < count; i++) {
    await expect(external.nth(i)).toHaveAttribute('rel', /noopener/)
  }
})
