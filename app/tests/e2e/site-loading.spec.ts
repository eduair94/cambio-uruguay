import { devices, expect, test } from '@playwright/test'

// Run against a production build: E2E_BASE_URL=https://cambio-uruguay.com
// Development intentionally disables the service worker.
test.use({ ...devices['Pixel 7'], colorScheme: 'dark', serviceWorkers: 'allow' })

test('public HTML revalidates while immutable assets remain cacheable', async ({ request }) => {
  for (const path of ['/', '/widget']) {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    const cacheControl = response.headers()['cache-control'] || ''
    expect(cacheControl).toMatch(/(?:^|[,\s])max-age=0(?:,|$)/)
    expect(cacheControl).not.toContain('immutable')
  }
})

test('mobile navigation and reload work with an activated service worker', async ({ page }) => {
  test.skip(!process.env.E2E_BASE_URL, 'Requires a production build with PWA enabled')
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/primer-alquiler-uruguay', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('h1')).toContainText('Primer alquiler en Uruguay')
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), {
      timeout: 90_000,
    })
    .toBe(true)

  for (const [path, heading] of [
    ['/', 'Cotización del Dólar en Uruguay Hoy'],
    ['/acerca', 'Sobre Cambio Uruguay'],
    ['/primer-alquiler-uruguay', 'Primer alquiler en Uruguay'],
  ]) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
    expect(response?.fromServiceWorker()).toBe(false)
    await expect(page.locator('h1')).toContainText(heading)
    await expect(page.locator('h1')).toBeVisible()
  }
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('h1')).toContainText('Primer alquiler en Uruguay')
  await expect(async () => {
    const rent = page.locator('#budget-rent')
    await rent.fill('30000')
    await expect(page.getByTestId('rental-monthly')).toContainText('30.900')
  }).toPass()
  expect(errors).toEqual([])
})
