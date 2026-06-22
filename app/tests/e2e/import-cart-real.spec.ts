import { expect, test } from '@playwright/test'

// Network-dependent e2e: hits REAL marketplace URLs through the live scrape
// endpoint. Marketplaces bot-block aggressively, so the contract under test is
// graceful behaviour (200 + best-effort object, never a 5xx/throw), the SSRF/DNS
// guard allowing real public hosts, and the end-to-end "paste → fetch → manual
// → compute" round trip — NOT that a specific price is scraped.
const REAL_AMAZON = 'https://www.amazon.com/dp/B09B8V1LZ3' // Echo Dot (stable ASIN)

test.describe('import cart — real links (network)', () => {
  test.slow() // real outbound fetches

  test('scrape endpoint returns a best-effort object for a real Amazon URL', async ({
    request,
  }) => {
    const res = await request.get('/api/import-preview', { params: { url: REAL_AMAZON } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(typeof body).toBe('object')
    expect(Array.isArray(body)).toBe(false)
    // Whatever came back, the optional fields must be well-typed.
    if ('title' in body) expect(typeof body.title).toBe('string')
    if ('price' in body) expect(typeof body.price).toBe('number')
    console.log('amazon preview =', JSON.stringify(body))
  })

  test('scrape endpoint rejects a non-marketplace host (SSRF allowlist)', async ({ request }) => {
    const res = await request.get('/api/import-preview', {
      params: { url: 'https://www.google.com/search?q=x' },
    })
    expect(res.status()).toBe(400)
  })

  test('paste a real URL → fetch → finish manually → cart computes', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/herramientas/carrito-importacion')
    await expect(page.getByTestId('cart-empty')).toBeVisible({ timeout: 90_000 })

    // Open the dialog (retry through hydration).
    await expect(async () => {
      await page.getByTestId('cart-add-cta').click()
      await expect(page.locator('#add-url')).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 60_000 })

    // Paste a real Amazon URL and fetch its metadata.
    await page.locator('#add-url').fill(REAL_AMAZON)
    await page.getByTestId('cart-fetch').click()

    // Best-effort: Amazon returns at least an og:title to bots, so the name
    // field should auto-fill. If a marketplace fully blocks, the field stays
    // empty and the user types it — either way the flow must stay usable.
    const name = page.locator('#add-name')
    await expect(async () => {
      const value = await name.inputValue()
      if (!value) await name.fill('Echo Dot (manual)') // fallback if scrape blocked
      expect((await name.inputValue()).length).toBeGreaterThan(0)
    }).toPass({ timeout: 30_000 })

    // Price is rarely scrapeable behind a bot wall — enter it manually.
    await page.locator('#add-price').fill('49.99')
    await page.getByTestId('cart-add-confirm').click()

    await expect(page.getByTestId('cart-line')).toHaveCount(1)
    const landed = page.getByTestId('cart-landed-usd')
    await expect(landed).toBeVisible()
    await expect(landed).not.toHaveText(/^\s*US\$\s*0,00\s*$/)
  })
})
