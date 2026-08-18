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
    // Click `.v-field`, not the VSelect root. `data-testid` lands on the root
    // `.v-input`, and in Vuetify 4 a click there does not open the menu — the
    // activator is the inner field. The menu therefore never opened and the
    // options assertion below burned its 15s timeout on an empty page. The two
    // specs that exercise a VSelect and pass (casas-directory, home-market-filters)
    // both click `.v-field`; this one was the odd one out.
    await page.getByTestId('wtc-operation').locator('.v-field').click()

    // Addressed by role rather than by internal class: an open select menu is a
    // listbox and its entries are options, which is the part of a component
    // library that stays contractually stable across majors.
    const options = page.locator('[role="listbox"] [role="option"]')
    await expect(options.first()).toBeVisible({ timeout: 15_000 })
    await options.nth(1).click()

    await expect(page.getByTestId('wtc-house').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('wtc-house-total').first()).toContainText(/\$/)
  })
})
