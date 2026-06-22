import { test, expect } from '@playwright/test'

test.setTimeout(120_000)

test('offline banner shows the saved-data time when a snapshot exists', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))

  await page.goto('/')
  // Wait for the page to be interactive (heading visible) rather than networkidle,
  // because the home page polls live exchange-rate APIs continuously.
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 90_000 })

  // Seed a rates snapshot before the offline event.
  await page.evaluate(() => {
    localStorage.setItem(
      'cu:rates-snapshot:v1',
      JSON.stringify({
        v: 1,
        ts: Date.now(),
        exchangeData: [{ a: 1 }],
        localData: {},
        locations: [],
      })
    )
  })

  // PWANetworkStatus is wrapped in <ClientOnly> and takes a few seconds to
  // hydrate and register its window.addEventListener('offline') handler.
  // Wait for the component's root element (always present once mounted) before dispatching offline.
  await expect(page.locator('[data-testid="pwa-network-status"]')).toBeAttached({ timeout: 30_000 })

  // Now dispatch the offline event — the listener is registered.
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))

  // The offline banner shows the saved-data line (es/en/pt copy all match this regex).
  await expect(
    page
      .getByText(
        /datos guardados|saved at|dados salvos|mostrando datos guardados|showing saved data|mostrando dados salvos/i
      )
      .first()
  ).toBeVisible()

  expect(errors).toEqual([])
})
