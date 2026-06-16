import { expect, test } from '@playwright/test'

// e2e for the "compare exchange houses over time" page. Uses the dev server
// configured via `baseURL` in playwright.config.ts.
test.describe('compare exchange houses', () => {
  // Cold Nuxt dev start compiles the route on first hit and the page waits on
  // live evolution API calls (one per house), so allow generous time.
  test.setTimeout(120_000)

  test('selects a currency + two houses and renders a chart and summary', async ({ page }) => {
    await page.goto('/comparar')

    // The page is server-rendered; the H1 should appear quickly.
    await expect(page.locator('h1')).toBeVisible({ timeout: 90_000 })

    // Currency defaults to USD; the houses autocomplete is populated from the
    // live "today" snapshot.
    const houses = page.getByTestId('compare-houses')
    await expect(houses).toBeVisible({ timeout: 90_000 })
    const housesInput = houses.locator('input')

    // Vuetify renders the menu options in an overlay outside the field. The
    // field is server-rendered but only opens its menu once Vue has hydrated and
    // the live house list has loaded, so retry the open-click until options
    // appear rather than assuming the first click lands.
    const options = page.locator('.v-overlay .v-list-item')
    await expect(async () => {
      await housesInput.click()
      await expect(options.first()).toBeVisible({ timeout: 5_000 })
    }).toPass({ timeout: 90_000 })

    // With a multi-select, picking an option keeps the menu open, so select two
    // by distinct indices.
    await options.nth(0).click()
    await options.nth(1).click()

    // Close the overlay so it doesn't intercept later assertions.
    await page.keyboard.press('Escape')

    // A chart canvas should render once the two evolution series resolve.
    const canvas = page.locator('canvas')
    await expect(canvas.first()).toBeVisible({ timeout: 90_000 })

    // The summary table should list both selected houses.
    const summary = page.getByTestId('compare-summary')
    await expect(summary).toBeVisible({ timeout: 90_000 })
    const houseCells = summary.getByTestId('compare-summary-house')
    await expect.poll(async () => houseCells.count(), { timeout: 90_000 }).toBeGreaterThanOrEqual(2)
  })
})
