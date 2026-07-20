import { expect, test } from '@playwright/test'

// The page's value is a computed verdict, so these assert that the numbers actually MOVE and
// that the verdict flips — not merely that elements exist.
//
// Hydration gate: the page awaits a fetch in setup, so it renders inside Suspense and an input
// filled before hydration is silently a no-op. Every interaction goes through `toPass`.
test.describe('conviene comprar en cuotas', () => {
  test.setTimeout(180_000)

  test('derives the implicit rate and flips the verdict with the plan', async ({ page }) => {
    await page.goto('/conviene-comprar-en-cuotas')

    const tea = page.getByTestId('tea')
    const veredicto = page.getByTestId('veredicto')
    await expect(tea).toBeVisible({ timeout: 120_000 })

    // Default is Antel's real published plan: PCE 46.190 financed as 24 x 2.389 on the bill.
    // The rate it implies — which Antel never prints — is ~24%.
    await expect(tea).toContainText('23,9')
    await expect(veredicto).toContainText('contado')

    // Swap in a genuine 0%: 46.190 / 24 = 1.925/mes. (24 x 1.925 overshoots the cash price by
    // 10 pesos, so the implied rate lands at 0,02% — not exactly zero.)
    const cuota = page.getByTestId('input-cuota').locator('input')
    await expect(async () => {
      await cuota.fill('1925')
      await expect(tea).toContainText('0,0', { timeout: 3_000 })
    }).toPass({ timeout: 90_000 })

    // Put those 0% cuotas on a CREDIT CARD and the seguro sobre saldo deudor appears. Together
    // with the debit-IVA reduction you forfeit by paying on credit, it eats the entire
    // arbitrage — this is the page's central claim, so it is the assertion that matters most.
    await expect(async () => {
      await page.getByRole('button', { name: 'Tarjeta de crédito' }).click()
      await expect(veredicto).toContainText('Empate', { timeout: 3_000 })
    }).toPass({ timeout: 60_000 })

    // Turn the seguro off (not every card charges it) and the arbitrage comes back.
    await expect(async () => {
      await page.getByText('Supuestos (podés cambiarlos)').click()
      await page.getByTestId('input-seguro').locator('input').fill('0')
      await expect(veredicto).toContainText('Conviene financiar', { timeout: 3_000 })
    }).toPass({ timeout: 60_000 })

    // The verdict is a computed figure, not a placeholder.
    await expect(page.getByTestId('veredicto-monto')).not.toHaveText(/^\s*[+−-]?\$\s*0,00\s*$/)
  })

  test('simulates scenarios and renders the distribution', async ({ page }) => {
    await page.goto('/conviene-comprar-en-cuotas')

    const prob = page.getByTestId('mc-prob')
    await expect(prob).toBeVisible({ timeout: 120_000 })
    // Against Antel's ~24%, no simulated path makes financing worthwhile.
    await expect(prob).toHaveText('0,0%')

    await expect(page.locator('canvas')).toBeVisible({ timeout: 60_000 })
  })
})
