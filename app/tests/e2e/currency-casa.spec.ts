import { expect, test } from '@playwright/test'

// e2e for the per-currency (`pages/cotizacion/[moneda].vue`) and per-casa
// (`pages/casa/[origin].vue`) programmatic-SEO pages. Uses the dev server
// configured via `baseURL` in playwright.config.ts.
test.describe('cotizacion + casa', () => {
  // Cold Nuxt dev start compiles the route on first hit and the page is SSR'd
  // from the live localData + today's quotes, so allow generous time.
  test.setTimeout(120_000)

  test('cotizacion page shows the currency H1 and a casas table', async ({ page }) => {
    await page.goto('/cotizacion/euro')

    // The page is server-rendered; the H1 should mention the currency.
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 90_000 })
    await expect(h1).toContainText('Euro', { timeout: 90_000 })

    // The EUR market always has multiple houses; at least one row must be listed.
    const houseNames = page.getByTestId('cotizacion-house-name')
    await expect.poll(async () => houseNames.count(), { timeout: 90_000 }).toBeGreaterThanOrEqual(1)
  })

  test('casa page shows the casa H1 and its rates', async ({ page }) => {
    await page.goto('/casa/brou')

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 90_000 })
    await expect(h1).toContainText('BROU', { timeout: 90_000 })

    // BROU quotes several currencies; at least one rate row must be listed.
    const rateCodes = page.getByTestId('casa-rate-code')
    await expect.poll(async () => rateCodes.count(), { timeout: 90_000 }).toBeGreaterThanOrEqual(1)
  })

  test('returns 404 for an unknown currency slug', async ({ page }) => {
    const response = await page.goto('/cotizacion/zzz')
    expect(response?.status()).toBe(404)
  })

  test('returns 404 for an unknown casa origin', async ({ page }) => {
    const response = await page.goto('/casa/zzz')
    expect(response?.status()).toBe(404)
  })
})
