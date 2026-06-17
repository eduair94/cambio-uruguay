import { expect, test } from '@playwright/test'

// e2e for the embeddable /widget page (bare layout, no site chrome) and a
// regression check that the SSR home page now emits hreflang alternate links.
// Cold Nuxt dev start compiles each route on first hit, so allow generous time.
test.describe('widget embebible', () => {
  test.setTimeout(120_000)

  test('/widget shows a USD value and the cambio-uruguay.com backlink', async ({ page }) => {
    await page.goto('/widget')

    const widget = page.getByTestId('widget')
    await expect(widget).toBeVisible({ timeout: 90_000 })

    // At least one of buy/sell renders a numeric value (live cached rate).
    const buy = page.getByTestId('widget-buy')
    const sell = page.getByTestId('widget-sell')
    await expect(buy).toBeVisible({ timeout: 90_000 })
    await expect
      .poll(
        async () => {
          const b = (await buy.textContent()) ?? ''
          const s = (await sell.textContent()) ?? ''
          return /\d/.test(b) || /\d/.test(s)
        },
        { timeout: 90_000 }
      )
      .toBe(true)

    // The backlink to the main site (the whole point of the widget).
    const backlink = page.getByTestId('widget-backlink')
    await expect(backlink).toHaveAttribute('href', 'https://cambio-uruguay.com')
    await expect(backlink).toHaveAttribute('target', '_blank')
    await expect(backlink).toContainText(/cambio-uruguay\.com/i)
  })

  test('/widget uses the bare layout (no site nav / app bar)', async ({ page }) => {
    await page.goto('/widget')
    await expect(page.getByTestId('widget')).toBeVisible({ timeout: 90_000 })

    // The default layout's VAppBar and desktop nav buttons must be absent.
    await expect(page.locator('.v-app-bar')).toHaveCount(0)
    await expect(page.locator('header.v-toolbar')).toHaveCount(0)
    await expect(page.locator('img.logo_image')).toHaveCount(0)
  })
})

test.describe('hreflang alternates', () => {
  test.setTimeout(120_000)

  test('/ SSR response includes hreflang alternate links (es/en/pt/x-default)', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 90_000 })

    const alternates = page.locator('link[rel="alternate"][hreflang]')
    await expect.poll(async () => alternates.count(), { timeout: 90_000 }).toBeGreaterThanOrEqual(4)

    // es/en/pt + x-default must all be present (>=1 each; the i18n module also
    // emits the iso variants es-ES/en-US/pt-PT alongside the bare codes).
    await expect
      .poll(async () => page.locator('link[rel="alternate"][hreflang="es"]').count())
      .toBeGreaterThanOrEqual(1)
    await expect
      .poll(async () => page.locator('link[rel="alternate"][hreflang="en"]').count())
      .toBeGreaterThanOrEqual(1)
    await expect
      .poll(async () => page.locator('link[rel="alternate"][hreflang="pt"]').count())
      .toBeGreaterThanOrEqual(1)
    await expect
      .poll(async () => page.locator('link[rel="alternate"][hreflang="x-default"]').count())
      .toBeGreaterThanOrEqual(1)
  })
})
