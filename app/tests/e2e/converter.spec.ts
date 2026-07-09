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

    // Click a preset chip and assert the amount field updates. The field is
    // intentionally left unformatted (no thousands separator) - see the
    // regression tests below for why.
    await page.getByTestId('preset-1000').click()
    await expect(amountInput).toHaveValue('1000')

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
  // The field is intentionally left unformatted (no "." inserted, ever), so
  // it should read back exactly what was typed - before and after blur.
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

    await amountInput.blur()
    await expect(amountInput).toHaveValue('25000')
  })

  // Regression: a first fix reformatted the field on blur (adding "." as a
  // thousands separator) and re-synced it via a `watch` on the display ref.
  // That watch fired even for the fix's own programmatic writes, so toggling
  // direction after blurring "25000" (now displayed as "25.000") reparsed
  // that formatted text and silently collapsed it to 25. The field must
  // never gain a grouping "." separator, and toggling direction must not
  // shrink the entered amount by orders of magnitude (a genuine decimal
  // point from the recomputed reverse amount, e.g. "25410.87", is fine and
  // unambiguous - only a *grouping* dot mixed with decimal parsing is not).
  test('toggling direction after blur does not corrupt a multi-digit amount', async ({
    page,
  }) => {
    await page.goto('/')

    const amountInput = page.getByTestId('amount-input').locator('input')
    await expect(amountInput).toBeVisible({ timeout: 90_000 })

    await amountInput.click()
    await amountInput.press('Control+A')
    await amountInput.pressSequentially('25000', { delay: 50 })
    await amountInput.blur()
    await expect(amountInput).toHaveValue('25000')

    await page.getByTestId('convert-btn').click()
    await page.locator('.direction-toggle').click()

    const value = await amountInput.inputValue()
    expect(value).not.toBe('')
    expect(Number(value.replace(',', '.'))).toBeGreaterThan(1000)
  })
})
