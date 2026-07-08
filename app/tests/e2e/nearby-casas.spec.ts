import { expect, test } from '@playwright/test'

test.setTimeout(120_000)

test('nearby casa finder renders ranked results after picking a city', async ({ page }) => {
  await page.goto('/casa-de-cambio-cerca-de-mi')

  await expect(page.locator('h1')).toContainText(/cerca/i, { timeout: 90_000 })

  const chip = page.locator('[data-testid="nearby-city-chip"]').first()
  await expect(chip).toBeVisible({ timeout: 30_000 })

  // The page's setup is async (top-level `await useLazyAsyncData`), so Nuxt
  // wraps it in <Suspense>: the chip can be visible before Vue finishes
  // attaching its click listener, which silently swallows a too-early click.
  // Re-click on each retry so a lost first click doesn't fail the test; once
  // a click lands, the chip is replaced by the results UI, so later retries
  // (if the row-count read races the DOM patch) tolerate the chip being gone.
  await expect(async () => {
    await chip.click({ timeout: 5_000 }).catch(() => {})
    const rows = await page.locator('[data-testid="nearby-casa-row"]').count()
    expect(rows).toBeGreaterThan(0)
  }).toPass({ timeout: 30_000 })

  const first = page.locator('[data-testid="nearby-casa-row"]').first()
  const mapsHref = await first.locator('[data-testid="nearby-directions-link"]').getAttribute('href')
  expect(mapsHref).toContain('google.com/maps/dir')
  const wazeHref = await first.locator('[data-testid="nearby-waze-link"]').getAttribute('href')
  expect(wazeHref).toContain('waze.com/ul')
})

test('nearby casa finder never lists a banco or fintech as a casa de cambio', async ({ page }) => {
  await page.goto('/casa-de-cambio-cerca-de-mi')

  const chip = page.locator('[data-testid="nearby-city-chip"]').first()
  await expect(chip).toBeVisible({ timeout: 30_000 })

  // The page's setup is async (top-level `await useLazyAsyncData`), so Nuxt
  // wraps it in <Suspense>: the chip can be visible before Vue finishes
  // attaching its click listener, which silently swallows a too-early click.
  // Re-click on each retry so a lost first click doesn't fail the test; once
  // a click lands, the chip is replaced by the results UI, so later retries
  // (if the row-count read races the DOM patch) tolerate the chip being gone.
  await expect(async () => {
    await chip.click({ timeout: 5_000 }).catch(() => {})
    const rows = await page.locator('[data-testid="nearby-casa-row"]').count()
    expect(rows).toBeGreaterThan(0)
  }).toPass({ timeout: 30_000 })

  const names = await page.locator('[data-testid="nearby-casa-row-name"]').allTextContents()
  expect(names.some(n => /BROU|Ita[uú]|Prex/i.test(n))).toBe(false)
})
