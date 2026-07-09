import { expect, test } from '@playwright/test'

// e2e for the "Cambio Rápido" converter on the home page. Uses the dev server
// configured via `baseURL` in playwright.config.ts.
test.describe('currency converter', () => {
  // Cold Nuxt dev start compiles the route on first hit and the converter waits
  // on a live API call, so allow generous time for the initial load.
  test.setTimeout(120_000)

  test('converts an amount, applies a preset, and swaps currencies', async ({ page }) => {
    await page.goto('/')

    // The converter is gated behind an initial-loading spinner that clears once
    // the live rate data resolves. Wait for the amount input to render.
    const amountInput = page.getByTestId('amount-input').locator('input')
    await expect(amountInput).toBeVisible({ timeout: 90_000 })

    // Enter an amount.
    await amountInput.fill('250')
    await expect(amountInput).toHaveValue(/250/)

    // Run the conversion and assert a result is shown.
    await page.getByTestId('convert-btn').click()
    const result = page.getByTestId('conversion-result')
    await expect(result).toBeVisible()
    const resultAmount = page.getByTestId('result-amount')
    await expect(resultAmount).toBeVisible()
    // The headline figure should contain a currency-formatted number.
    await expect(resultAmount).toContainText(/\$/)
    await expect(resultAmount).not.toHaveText(/^\s*\$\s*0,00\s*$/)

    // Click a preset chip and assert the amount field updates.
    await page.getByTestId('preset-1000').click()
    await expect(amountInput).toHaveValue('1.000')

    // Capture the current from/to currency, then swap and assert they switch.
    const fromBefore = (await page.getByTestId('from-currency').textContent())?.trim()
    const toBefore = (await page.getByTestId('to-currency').textContent())?.trim()
    expect(fromBefore).toBeTruthy()
    expect(toBefore).toBeTruthy()
    expect(fromBefore).not.toEqual(toBefore)

    await page.getByTestId('swap-btn').click()
    // Swap mutates the input refs; commit them via convert so the displayed
    // result reflects the new direction.
    await page.getByTestId('convert-btn').click()

    await expect(page.getByTestId('from-currency')).toHaveText(toBefore as string)
    await expect(page.getByTestId('to-currency')).toHaveText(fromBefore as string)
  })

  // Regression: typing a 5-digit amount keystroke-by-keystroke used to get
  // mangled once the live es-UY thousands separator ("2.500" while typing
  // "25000") was reinterpreted as a decimal point on the next keystroke,
  // silently truncating the value to "2,5". `.fill()` sets the value in one
  // shot and can't reproduce this, so this test types character by character.
  test('typing a multi-digit amount keystroke-by-keystroke does not get mangled', async ({
    page,
  }) => {
    await page.goto('/')

    const amountInput = page.getByTestId('amount-input').locator('input')
    await expect(amountInput).toBeVisible({ timeout: 90_000 })

    await amountInput.click()
    await amountInput.press('Control+A')
    await amountInput.pressSequentially('25000', { delay: 50 })
    await expect(amountInput).toHaveValue('25000')

    // Blurring reformats with the es-UY thousands separator, confirming the
    // underlying numeric value is still the full 25000, not a truncated 2.5.
    await amountInput.blur()
    await expect(amountInput).toHaveValue('25.000')
  })
})
