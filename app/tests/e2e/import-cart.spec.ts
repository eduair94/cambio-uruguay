import { expect, test } from '@playwright/test'

// e2e for the import-cart tool. Adds a product manually, asserts the landed-cost
// summary computes, then removes it. Uses the dev server via `baseURL`.
test.describe('import cart', () => {
  test.setTimeout(120_000)

  test('adds a product manually, computes the landed cost, and removes it', async ({ page }) => {
    await page.goto('/herramientas/carrito-importacion')

    // Empty state first.
    await expect(page.getByTestId('cart-empty')).toBeVisible({ timeout: 90_000 })

    // Open the add dialog. Retry the click until hydration has attached the
    // handler (a click before hydration is a no-op on this heavy SSR app).
    await expect(async () => {
      await page.getByTestId('cart-add-cta').click()
      await expect(page.locator('#add-name')).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 60_000 })

    // Fill the manual fields and confirm.
    await page.locator('#add-name').fill('Echo Dot')
    await page.locator('#add-price').fill('100')
    await page.getByTestId('cart-add-confirm').click()

    // The item appears and the summary shows a non-zero landed cost.
    const line = page.getByTestId('cart-line')
    await expect(line).toHaveCount(1)
    await expect(line).toContainText('Echo Dot')

    const landed = page.getByTestId('cart-landed-usd')
    await expect(landed).toBeVisible()
    await expect(landed).toContainText('$')
    await expect(landed).not.toHaveText(/^\s*US\$\s*0,00\s*$/)

    // Remove it -> back to the empty state.
    await page.getByRole('button', { name: 'Quitar del carrito' }).click()
    await expect(page.getByTestId('cart-line')).toHaveCount(0)
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })
})
