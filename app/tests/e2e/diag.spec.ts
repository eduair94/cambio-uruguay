import { test, expect } from '@playwright/test'
test.setTimeout(120_000)
test('diag - component mount time', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 90_000 })
  const start = Date.now()

  // Seed snapshot
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

  // Wait for component to appear
  await expect(page.locator('[data-testid="pwa-network-status"]')).toBeAttached({ timeout: 90_000 })
  const elapsed = Date.now() - start
  console.log(`Component mounted after ${elapsed}ms`)
})
