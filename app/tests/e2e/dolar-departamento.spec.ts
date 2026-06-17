import { expect, test } from '@playwright/test'

// e2e for the per-department programmatic-SEO page (`pages/dolar/[departamento].vue`).
// Uses the dev server configured via `baseURL` in playwright.config.ts.
test.describe('dolar por departamento', () => {
  // Cold Nuxt dev start compiles the route on first hit and the page is SSR'd
  // from the live localData + today's quotes, so allow generous time.
  test.setTimeout(120_000)

  test('renders the department H1 and lists at least one exchange house', async ({ page }) => {
    await page.goto('/dolar/montevideo')

    // The page is server-rendered; the H1 should mention the department.
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 90_000 })
    await expect(h1).toContainText('Montevideo', { timeout: 90_000 })

    // Montevideo always has exchange houses; at least one row must be listed.
    const houseNames = page.getByTestId('dolar-house-name')
    await expect.poll(async () => houseNames.count(), { timeout: 90_000 }).toBeGreaterThanOrEqual(1)
  })

  test('returns 404 for an unknown department slug', async ({ page }) => {
    const response = await page.goto('/dolar/zzz-invalid')
    expect(response?.status()).toBe(404)
  })
})
