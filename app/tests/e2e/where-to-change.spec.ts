import { expect, test } from '@playwright/test'

// e2e for the "¿Dónde cambiar?" (WhereToChange) section on the home page.
// The deterministic ranking renders once the live rate data resolves; the AI
// prose is optional and not asserted here (it may legitimately be null).
test.describe('where to change', () => {
  // Cold Nuxt dev start compiles the route on first hit and the section waits on
  // a live API call, so allow generous time for the initial load.
  test.setTimeout(120_000)

  test('ranks exchange houses for buying USD and reacts to the operation', async ({ page }) => {
    await page.goto('/')

    // Scroll the section into view so its onMounted data fetch is unblocked and
    // lazy rendering kicks in.
    const section = page.getByTestId('where-to-change')
    await section.scrollIntoViewIfNeeded()
    await expect(section).toBeVisible({ timeout: 90_000 })

    // Set the amount.
    const amountInput = page.getByTestId('wtc-amount').locator('input')
    await expect(amountInput).toBeVisible({ timeout: 90_000 })
    await amountInput.fill('1000')

    // Wait for the deterministic ranking list (gated on the live rates resolving).
    const ranking = page.getByTestId('wtc-ranking')
    await expect(ranking).toBeVisible({ timeout: 90_000 })

    // A ranked list of houses should render, each with a name and a total.
    const houses = page.getByTestId('wtc-house')
    await expect(houses.first()).toBeVisible({ timeout: 90_000 })
    const count = await houses.count()
    expect(count).toBeGreaterThanOrEqual(2)
    expect(count).toBeLessThanOrEqual(5)

    await expect(page.getByTestId('wtc-house-name').first()).not.toHaveText('')
    await expect(page.getByTestId('wtc-house-total').first()).toContainText(/\$/)

    // Switch the operation to "sell" and assert the ranking still renders.
    //
    // The click is RETRIED, and that is the whole fix. A single click followed by
    // a long wait for the options is what failed here: on this dev server the
    // first click frequently lands while the section is still settling and the
    // menu never opens, so the wait then burns its full budget against a page
    // that has no menu on it. Waiting longer cannot help — nothing is coming.
    //
    // Verified against production with a real browser: once the menu IS open the
    // overlay holds a `role="listbox"` with one `role="option"` per item, so
    // neither the selector nor the click target was ever wrong. `.v-overlay-container`
    // still exists in Vuetify 4 (composables/teleport.js) — an earlier guess that
    // it had been renamed was simply false, and the two specs that drive a VSelect
    // and pass (casas-directory, home-market-filters) had the answer all along:
    // both wrap open-and-read in `toPass`. This one was the odd one out.
    const options = page.locator('.v-overlay-container .v-list-item')
    await expect(async () => {
      await page.getByTestId('wtc-operation').locator('.v-field').click()
      await expect(options.first()).toBeVisible({ timeout: 5_000 })
    }).toPass({ timeout: 60_000 })

    await options.nth(1).click()

    await expect(page.getByTestId('wtc-house').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('wtc-house-total').first()).toContainText(/\$/)
  })
})
