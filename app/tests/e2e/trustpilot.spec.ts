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
  const frame = page.locator('iframe.reviews-widget')
  await expect(async () => {
    await section.scrollIntoViewIfNeeded()
    await expect(frame).toHaveCount(1, { timeout: 2_000 })
  }).toPass({ timeout: 90_000 })

  const src = (await frame.getAttribute('src')) ?? ''
  expect(src).toContain('domain=cambio-uruguay.com')
  expect(src).toContain('hideTopBanner=true')
  expect(src).toContain('hideGlobalReviews=true')

  await expect(frame).toBeVisible()

  // These filters are no-ops upstream. The native iframe sends only our config,
  // with none of the old SDK's implicit pagination or sorting defaults.
  expect(src).not.toContain('rating=')
  expect(src).not.toContain('sort=')
  expect(src).not.toContain('page=')
  expect(src).not.toContain('limit=')

  // The TrustScore banner (a stale, age-decayed "3.8") lives INSIDE the widget's
  // cross-origin iframe, so only a frameLocator can see it. hideTopBanner +
  // hideGlobalReviews are what suppress it; this asserts the user-visible result,
  // not just the config that is supposed to produce it. not.toBeEmpty() proves we
  // are inspecting loaded iframe content, not passing vacuously on a blank doc.
  const widgetBody = page.frameLocator('iframe.reviews-widget').locator('body')
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

test('reviews stay visible while a slow iframe asset delays load beyond eight seconds', async ({
  page,
}) => {
  let releaseAvatar = () => {}
  const avatarReleased = new Promise<void>(resolve => {
    releaseAvatar = resolve
  })
  let avatarRequested = false

  await page.route('https://trustpilot.checkleaked.com/**', async route => {
    if (new URL(route.request().url()).pathname === '/slow-avatar.svg') {
      avatarRequested = true
      await avatarReleased
      await route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"/>',
      })
      return
    }

    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html lang="es"><body>
        <p data-testid="review">Excelente servicio de cambio</p>
        <img src="/slow-avatar.svg" width="24" height="24" alt="">
        <script>
          window.addEventListener('load', () => { document.body.dataset.loaded = 'true' })
        </script>
      </body></html>`,
    })
  })

  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const section = page.locator('.reviews-section')
    const frame = page.locator('iframe.reviews-widget')
    await expect(async () => {
      await section.scrollIntoViewIfNeeded()
      await expect(frame).toHaveCount(1, { timeout: 2_000 })
    }).toPass({ timeout: 90_000 })

    await expect.poll(() => avatarRequested).toBe(true)
    const widget = page.frameLocator('iframe.reviews-widget')
    await expect(widget.getByTestId('review')).toBeVisible()
    await expect(widget.locator('body')).not.toHaveAttribute('data-loaded', 'true')

    // This duration is the regression: the former readiness deadline destroyed
    // the entire section at 8s even though the review document was usable.
    await new Promise(resolve => setTimeout(resolve, 9_000))
    await expect(frame).toBeVisible()
    await expect(widget.getByTestId('review')).toBeVisible()
    await expect(widget.locator('body')).not.toHaveAttribute('data-loaded', 'true')
    await expect(section.locator('[data-cta="trustpilot-write"]')).toBeVisible()
    await expect(section.locator('[data-cta="trustpilot-all"]')).toBeVisible()

    releaseAvatar()
    await expect(widget.locator('body')).toHaveAttribute('data-loaded', 'true')
  } finally {
    releaseAvatar()
  }
})

test('review links remain available when the iframe host is unreachable', async ({ page }) => {
  let requested = false
  await page.route('**trustpilot.checkleaked.com**', async route => {
    requested = true
    await route.abort()
  })
  await page.goto('/')

  const section = page.locator('.reviews-section')
  const frame = section.locator('iframe')
  await expect(async () => {
    await section.scrollIntoViewIfNeeded()
    await expect(frame).toHaveCount(1, { timeout: 2_000 })
  }).toPass({ timeout: 90_000 })
  await expect.poll(() => requested).toBe(true)

  await expect(section).toBeVisible()
  await expect(section.locator('[data-cta="trustpilot-write"]')).toBeVisible()
  await expect(section.locator('[data-cta="trustpilot-all"]')).toBeVisible()

  await page.locator('.ecosystem-section').scrollIntoViewIfNeeded()
  await expect(page.locator('.ecosystem-section')).toBeVisible()
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
  await expect(external).toHaveCount(EXTERNAL_COUNT) // only the external ones; the internal /desarrolladores link has no target

  for (let i = 0; i < EXTERNAL_COUNT; i++) {
    await expect(external.nth(i)).toHaveAttribute('rel', /noopener/)
  }
})
