import { test, expect } from '@playwright/test'

// Developer portal: dev-hub header (SSR) + embedded Scalar API reference.
test.describe('/desarrolladores', () => {
  test('renders the dev hub header and serves the OpenAPI spec', async ({ page, request }) => {
    await page.goto('/desarrolladores')

    // Server-rendered hub header is reliable immediately.
    await expect(page.getByRole('heading', { level: 1, name: /Desarrolladores/i })).toBeVisible()
    await expect(page.getByText('https://api.cambio-uruguay.com').first()).toBeVisible()

    // The spec the page (and external tools) consume must be reachable + valid.
    const res = await request.get('/openapi.json')
    expect(res.ok()).toBeTruthy()
    const spec = await res.json()
    expect(spec.openapi).toBe('3.1.0')
  })

  test('mounts the Scalar API reference', async ({ page }) => {
    await page.goto('/desarrolladores')
    // Scalar fetches the spec client-side and renders endpoint summaries. Gate on
    // hydration: retry until a known operation summary from the spec appears.
    await expect(async () => {
      const visible = await page
        .getByText('All current quotes', { exact: false })
        .first()
        .isVisible()
        .catch(() => false)
      expect(visible).toBe(true)
    }).toPass({ timeout: 30_000 })
  })

  test('/developers alias resolves to the same page', async ({ page }) => {
    const res = await page.goto('/developers')
    expect(res?.status()).toBeLessThan(400)
    await expect(
      page.getByRole('heading', { level: 1, name: /Developers|Desarrolladores/i })
    ).toBeVisible()
  })
})
