import { expect, test } from '@playwright/test'

// e2e for the editorial guides hub/detail pages and the methodology page.
// Cold Nuxt dev start compiles each route on first hit, so allow generous time.
test.describe('guías y acerca', () => {
  test.setTimeout(120_000)

  test('the guides hub lists at least four guides', async ({ page }) => {
    await page.goto('/guias')

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 90_000 })

    const cards = page.getByTestId('guide-card')
    await expect.poll(async () => cards.count(), { timeout: 90_000 }).toBeGreaterThanOrEqual(4)
  })

  test('a guide page shows its H1', async ({ page }) => {
    await page.goto('/guias/billete-cable-transferencia')

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 90_000 })
    await expect(h1).toContainText('BILLETE', { timeout: 90_000 })
  })

  test('the about page shows the methodology H1', async ({ page }) => {
    await page.goto('/acerca')

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 90_000 })
    await expect(h1).toContainText(/Cambio Uruguay/i, { timeout: 90_000 })
  })

  test('an unknown guide slug returns 404', async ({ page }) => {
    const response = await page.goto('/guias/zzz')
    expect(response?.status()).toBe(404)
  })
})
